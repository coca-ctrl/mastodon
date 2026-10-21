// 작성창 스타일(카드 스타일 / NPC / 프리셋)의 "기본 고정값"과 "일시 선택"을 브라우저에 보관한다.

export type StyleChoice =
  | { kind: 'none' }
  | { kind: 'card'; id: number }
  | { kind: 'preset'; id: number }
  | { kind: 'npc'; id: number; emotion: string };

export interface PinnedSnapshot {
  pinned: StyleChoice | null;
  override: StyleChoice | null;
}

const PINNED_KEY = 'compose_pinned_style';
const OVERRIDE_KEY = 'compose_override_style';

function isValid(value: unknown): value is StyleChoice {
  if (typeof value !== 'object' || value === null) return false;

  const v = value as Record<string, unknown>;

  if (v.kind === 'none') return true;
  if (v.kind === 'card' || v.kind === 'preset') return typeof v.id === 'number';
  if (v.kind === 'npc') {
    return typeof v.id === 'number' && typeof v.emotion === 'string';
  }

  return false;
}

function read(key: string): StyleChoice | null {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);

    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function write(key: string, value: StyleChoice | null) {
  try {
    if (value) {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // 저장소를 쓸 수 없는 환경에서는 이번 접속 동안만 유지된다
  }
}

let snapshot: PinnedSnapshot = {
  pinned: read(PINNED_KEY),
  override: read(OVERRIDE_KEY),
};

const listeners = new Set<() => void>();

function update(next: PinnedSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => {
    listener();
  });
}

export function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): PinnedSnapshot {
  return snapshot;
}

export function choiceKey(choice: StyleChoice | null | undefined): string {
  if (!choice) return 'none';

  switch (choice.kind) {
    case 'none':
      return 'none';
    case 'card':
      return `card:${choice.id}`;
    case 'preset':
      return `preset:${choice.id}`;
    case 'npc':
      return `npc:${choice.id}:${choice.emotion}`;
  }
}

/** 기본값으로 고정한다. 일시 선택은 함께 해제된다. */
export function setPinned(choice: StyleChoice | null) {
  const pinned = choice && choice.kind !== 'none' ? choice : null;

  write(PINNED_KEY, pinned);
  write(OVERRIDE_KEY, null);
  update({ pinned, override: null });
}

export function setOverride(choice: StyleChoice | null) {
  write(OVERRIDE_KEY, choice);
  update({ ...snapshot, override: choice });
}

/** 사용자가 선택을 바꿀 때 호출한다. 고정값이 있을 때만 일시 선택으로 기억한다. */
export function recordChoice(choice: StyleChoice) {
  if (!snapshot.pinned) return;

  setOverride(choiceKey(choice) === choiceKey(snapshot.pinned) ? null : choice);
}