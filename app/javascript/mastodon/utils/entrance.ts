// 등장 연출 유틸 (순수 로직 + DOM 준비). 서버 값 형식: "shake,lines,glow"

export interface Effects {
  appear: 'shake' | 'fade' | null;
  text: 'lines' | 'typewriter' | null;
  glow: boolean;
}

export const LINE_GAP_MS = 350;
export const LINE_DURATION_MS = 450;
export const TYPEWRITER_MAX_MS = 3000;
export const TYPEWRITER_CHAR_MS = 45;
export const APPEAR_MS = 1100;

export function parseEffects(raw?: string | null): Effects | null {
  if (!raw) return null;

  const parts = raw.split(',').map((s) => s.trim());
  const appear = parts.includes('shake')
    ? 'shake'
    : parts.includes('fade')
      ? 'fade'
      : null;
  const text = parts.includes('lines')
    ? 'lines'
    : parts.includes('typewriter')
      ? 'typewriter'
      : null;
  const glow = parts.includes('glow');

  return appear || text || glow ? { appear, text, glow } : null;
}

// ---- 재생 기록 (브라우저별, 최근 300개) ----

const KEY = 'entrance_played_v1';
const MAX = 300;

function readPlayed(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

const memory = new Set<string>();

export function hasPlayed(id: string): boolean {
  return memory.has(id) || readPlayed().includes(id);
}

export function markPlayed(id: string): void {
  memory.add(id);
  try {
    const list = readPlayed().filter((x) => x !== id);
    list.push(id);
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch {
    // 저장소를 쓸 수 없으면 메모리 기록만 사용
  }
}

export function canAnimate(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('IntersectionObserver' in window)) return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---- 글자 연출 ----

/** 각 줄(<br>로 나뉜 조각)을 span.entrance-line 으로 감싼다. 감싼 줄 수를 돌려준다. */
export function prepareLines(root: HTMLElement): number {
  const blocks = Array.from(root.querySelectorAll('p'));
  const targets: Element[] = blocks.length > 0 ? blocks : [root];
  let index = 0;

  targets.forEach((el) => {
    const segments: Node[][] = [];
    let current: Node[] = [];

    Array.from(el.childNodes).forEach((node) => {
      if (node.nodeName === 'BR') {
        if (current.length > 0) segments.push(current);
        current = [];
      } else {
        current.push(node);
      }
    });
    if (current.length > 0) segments.push(current);

    segments.forEach((nodes) => {
      const hasContent = nodes.some(
        (n) => n.nodeType !== Node.TEXT_NODE || (n.textContent ?? '').trim() !== '',
      );
      if (!hasContent) return;

      const span = document.createElement('span');
      span.className = 'entrance-line';
      span.style.setProperty('--entrance-delay', `${index * LINE_GAP_MS}ms`);
      el.insertBefore(span, nodes[0] ?? null);
      nodes.forEach((n) => span.appendChild(n));
      index += 1;
    });
  });

  return index;
}

/** 텍스트 노드를 비우고 한 글자씩 채운다. 취소하면 즉시 전체를 복원한다. */
export function prepareTypewriter(root: HTMLElement): {
  duration: number;
  start: () => void;
  cancel: () => void;
} {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const items: { node: Text; full: string }[] = [];

  let current = walker.nextNode();
  while (current) {
    const text = current as Text;
    if ((text.data ?? '').trim() !== '') {
      items.push({ node: text, full: text.data });
    }
    current = walker.nextNode();
  }

  const total = items.reduce((sum, i) => sum + i.full.length, 0);
  const duration = Math.min(TYPEWRITER_MAX_MS, Math.max(400, total * TYPEWRITER_CHAR_MS));

  // 글자가 채워지는 동안 높이가 흔들리지 않도록 미리 고정
  const height = root.offsetHeight;
  if (height > 0) root.style.minHeight = `${height}px`;
  items.forEach((i) => {
    i.node.data = '';
  });

  let timer: number | undefined;

  const render = (shown: number) => {
    let left = shown;
    items.forEach((i) => {
      const take = Math.max(0, Math.min(i.full.length, left));
      i.node.data = i.full.slice(0, take);
      left -= take;
    });
  };

  const finish = () => {
    if (timer !== undefined) window.clearInterval(timer);
    timer = undefined;
    render(total);
    root.style.minHeight = '';
  };

  return {
    duration,
    start: () => {
      const began = performance.now();
      timer = window.setInterval(() => {
        const ratio = Math.min(1, (performance.now() - began) / duration);
        render(Math.floor(total * ratio));
        if (ratio >= 1) finish();
      }, 30);
    },
    cancel: finish,
  };
}

export function totalDuration(effects: Effects, lineCount: number, typeMs: number): number {
  let ms = effects.appear || effects.glow ? APPEAR_MS : 0;
  if (effects.text === 'lines') ms = Math.max(ms, lineCount * LINE_GAP_MS + LINE_DURATION_MS);
  if (effects.text === 'typewriter') ms = Math.max(ms, typeMs);
  return ms + 100;
}