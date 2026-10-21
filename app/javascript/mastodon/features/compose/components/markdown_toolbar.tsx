import type { FC, MouseEvent, ReactNode } from 'react';

import { useIdentity } from '@/mastodon/identity_context';
import { canManageNpcs, isAdministrator } from 'mastodon/permissions';

import type { MarkdownAction } from '../util/markdown_edit';

import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  HeadingIcon,
  HighlightIcon,
  ItalicIcon,
  QuoteIcon,
  SeparatorIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from './markdown_icons';

interface ToolbarItem {
  action: MarkdownAction;
  title: string;
  label: ReactNode;
}

const BASIC_ITEMS: ToolbarItem[] = [
  { action: 'bold', title: '굵게 **글**', label: <BoldIcon /> },
  { action: 'italic', title: '기울임 *글*', label: <ItalicIcon /> },
];

const PRIVILEGED_ITEMS: ToolbarItem[] = [
  { action: 'strike', title: '취소선 ~~글~~', label: <StrikethroughIcon /> },
  { action: 'underline', title: '밑줄 ++글++', label: <UnderlineIcon /> },
  { action: 'highlight', title: '형광펜 ==글==', label: <HighlightIcon /> },
  { action: 'heading', title: '제목 # 글 (누를 때마다 단계 변경)', label: <HeadingIcon /> },
  { action: 'quote', title: '인용 > 글', label: <QuoteIcon /> },
  { action: 'hr', title: '가로선 ---', label: <SeparatorIcon /> },
  { action: 'alignLeft', title: '왼쪽 정렬 |<글<|', label: <AlignLeftIcon /> },
  { action: 'alignCenter', title: '가운데 정렬 |>글<|', label: <AlignCenterIcon /> },
  { action: 'alignRight', title: '오른쪽 정렬 |>글>|', label: <AlignRightIcon /> },
];

interface Props {
  disabled?: boolean;
  onApply: (action: MarkdownAction) => void;
}

export const MarkdownToolbar: FC<Props> = ({ disabled, onApply }) => {
  const { permissions } = useIdentity();
  const privileged =
    isAdministrator(permissions) || canManageNpcs(permissions);

  const items = privileged
    ? [...BASIC_ITEMS, ...PRIVILEGED_ITEMS]
    : BASIC_ITEMS;

  // 버튼을 눌러도 글상자의 선택 영역이 풀리지 않게 한다
  const keepFocus = (e: MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div className='markdown-toolbar' role='toolbar'>
      {items.map((item) => (
        <button
          key={item.action}
          type='button'
          className='markdown-toolbar__button'
          title={item.title}
          aria-label={item.title}
          disabled={disabled}
          onMouseDown={keepFocus}
          onClick={() => {
            onApply(item.action);
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};
