export type MarkdownAction =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'underline'
  | 'highlight'
  | 'heading'
  | 'quote'
  | 'hr'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight';

export interface MarkdownEdit {
  text: string;
  start: number;
  end: number;
}

const WRAPS: Partial<Record<MarkdownAction, [string, string]>> = {
  bold: ['**', '**'],
  italic: ['*', '*'],
  strike: ['~~', '~~'],
  underline: ['++', '++'],
  highlight: ['==', '=='],
  alignLeft: ['|<', '<|'],
  alignCenter: ['|>', '<|'],
  alignRight: ['|>', '>|'],
};

function wrapSelection(
  text: string,
  start: number,
  end: number,
  open: string,
  close: string,
): MarkdownEdit {
  const next =
    text.slice(0, start) +
    open +
    text.slice(start, end) +
    close +
    text.slice(end);

  // 선택이 있으면 안쪽 글자를 선택 상태로 두고, 없으면 기호 사이에 커서를 둔다
  return {
    text: next,
    start: start + open.length,
    end: end + open.length,
  };
}

function transformLines(
  text: string,
  start: number,
  end: number,
  transform: (lines: string[]) => string[],
): MarkdownEdit {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const newlineAfter = text.indexOf('\n', end);
  const lineEnd = newlineAfter === -1 ? text.length : newlineAfter;

  const lines = transform(text.slice(lineStart, lineEnd).split('\n'));
  const joined = lines.join('\n');

  return {
    text: text.slice(0, lineStart) + joined + text.slice(lineEnd),
    start: lineStart,
    end: lineStart + joined.length,
  };
}

export function applyMarkdown(
  action: MarkdownAction,
  text: string,
  start: number,
  end: number,
): MarkdownEdit {
  const wrap = WRAPS[action];

  if (wrap) {
    return wrapSelection(text, start, end, wrap[0], wrap[1]);
  }

  if (action === 'quote') {
    return transformLines(text, start, end, (lines) => {
      const allQuoted = lines.every((line) => line.startsWith('> '));
      return lines.map((line) =>
        allQuoted ? line.slice(2) : line.startsWith('> ') ? line : `> ${line}`,
      );
    });
  }

  if (action === 'heading') {
    // # → ## → ### → 해제 순서로 순환
    return transformLines(text, start, end, (lines) =>
      lines.map((line) => {
        const match = /^(#{1,3}) (.*)$/.exec(line);

        if (!match) return `# ${line}`;

        const level = match[1]?.length ?? 1;
        const rest = match[2] ?? '';

        return level >= 3 ? rest : `${'#'.repeat(level + 1)} ${rest}`;
      }),
    );
  }

  // hr: 커서(선택 끝) 위치에 가로선을 별도 줄로 넣는다
  const before = end > 0 && text[end - 1] !== '\n' ? '\n' : '';
  const insert = `${before}---\n`;
  const next = text.slice(0, end) + insert + text.slice(end);
  const caret = end + insert.length;

  return { text: next, start: caret, end: caret };
}