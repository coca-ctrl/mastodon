// Tabler 아이콘 (https://tabler.io/icons) — 효과음/BGM 위젯과 버튼에 쓴다.
const common = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  className: 'sound-icon',
  'aria-hidden': true,
} as const;

const outline = {
  ...common,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export const PlayIcon: React.FC = () => (
  <svg {...common} fill='currentColor'>
    <path d='M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z' />
  </svg>
);

export const MusicIcon: React.FC = () => (
  <svg {...outline}>
    <path d='M3 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0' />
    <path d='M13 17a3 3 0 1 0 6 0a3 3 0 0 0 -6 0' />
    <path d='M9 17v-13h10v13' />
    <path d='M9 8h10' />
  </svg>
);

export const MusicOffIcon: React.FC = () => (
  <svg {...outline}>
    <path d='M3 17a3 3 0 1 0 6 0a3 3 0 1 0 -6 0' />
    <path d='M14.42 14.45a3 3 0 1 0 4.138 4.119' />
    <path d='M9 17v-8m0 -4v-1h10v11' />
    <path d='M12 8h7' />
    <path d='M3 3l18 18' />
  </svg>
);

export const VolumeIcon: React.FC = () => (
  <svg {...outline}>
    <path d='M15 8a5 5 0 0 1 0 8' />
    <path d='M17.7 5a9 9 0 0 1 0 14' />
    <path d='M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5' />
  </svg>
);

export const VolumeOffIcon: React.FC = () => (
  <svg {...outline}>
    <path d='M15 8a5 5 0 0 1 1.912 4.934m-1.377 2.602a5 5 0 0 1 -.535 .464' />
    <path d='M17.7 5a9 9 0 0 1 2.362 11.086m-1.676 2.299a9 9 0 0 1 -.686 .615' />
    <path d='M9.069 5.054l.431 -.554a.8 .8 0 0 1 1.5 .5v2m0 4v8a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l1.294 -1.664' />
    <path d='M3 3l18 18' />
  </svg>
);
