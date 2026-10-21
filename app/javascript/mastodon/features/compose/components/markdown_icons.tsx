import type { FC, ReactNode } from 'react';

// Tabler Icons (outline) 경로를 그대로 사용한 작성창 툴바용 아이콘
const TablerSvg: FC<{ children: ReactNode }> = ({ children }) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width={18}
    height={18}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={1.75}
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
  >
    {children}
  </svg>
);

export const BoldIcon: FC = () => (
  <TablerSvg>
    <path d='M7 5h6a3.5 3.5 0 0 1 0 7h-6l0 -7' />
    <path d='M13 12h1a3.5 3.5 0 0 1 0 7h-7v-7' />
  </TablerSvg>
);

export const ItalicIcon: FC = () => (
  <TablerSvg>
    <path d='M11 5l6 0' />
    <path d='M7 19l6 0' />
    <path d='M14 5l-4 14' />
  </TablerSvg>
);

export const StrikethroughIcon: FC = () => (
  <TablerSvg>
    <path d='M5 12l14 0' />
    <path d='M16 6.5a4 2 0 0 0 -4 -1.5h-1a3.5 3.5 0 0 0 0 7h2a3.5 3.5 0 0 1 0 7h-1.5a4 2 0 0 1 -4 -1.5' />
  </TablerSvg>
);

export const UnderlineIcon: FC = () => (
  <TablerSvg>
    <path d='M7 5v5a5 5 0 0 0 10 0v-5' />
    <path d='M5 19h14' />
  </TablerSvg>
);

export const HighlightIcon: FC = () => (
  <TablerSvg>
    <path d='M3 19h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4' />
    <path d='M12.5 5.5l4 4' />
    <path d='M4.5 13.5l4 4' />
    <path d='M21 15v4h-8l4 -4l4 0' />
  </TablerSvg>
);

export const HeadingIcon: FC = () => (
  <TablerSvg>
    <path d='M7 12h10' />
    <path d='M7 5v14' />
    <path d='M17 5v14' />
    <path d='M15 19h4' />
    <path d='M15 5h4' />
    <path d='M5 19h4' />
    <path d='M5 5h4' />
  </TablerSvg>
);

export const QuoteIcon: FC = () => (
  <TablerSvg>
    <path d='M14 13h4a1 1 0 0 1 1 1v3a1 1 0 0 1 -1 1h-3a1 1 0 0 1 -1 -1v-6q 0 -4 4 -5' />
    <path d='M5 13h4a1 1 0 0 1 1 1v3a1 1 0 0 1 -1 1h-3a1 1 0 0 1 -1 -1v-6q 0 -4 4 -5' />
  </TablerSvg>
);

export const SeparatorIcon: FC = () => (
  <TablerSvg>
    <path d='M3 12l0 .01' />
    <path d='M7 12l10 0' />
    <path d='M21 12l0 .01' />
  </TablerSvg>
);

export const AlignLeftIcon: FC = () => (
  <TablerSvg>
    <path d='M4 6l16 0' />
    <path d='M4 12l10 0' />
    <path d='M4 18l14 0' />
  </TablerSvg>
);

export const AlignCenterIcon: FC = () => (
  <TablerSvg>
    <path d='M4 6l16 0' />
    <path d='M8 12l8 0' />
    <path d='M6 18l12 0' />
  </TablerSvg>
);

export const AlignRightIcon: FC = () => (
  <TablerSvg>
    <path d='M4 6l16 0' />
    <path d='M10 12l10 0' />
    <path d='M6 18l14 0' />
  </TablerSvg>
);
