import type { CSSProperties } from 'react';

export interface CardGradientStop {
  color: string;
  position: number;
}

export interface CardGradient {
  type: 'linear' | 'radial';
  angle?: number;
  shape?: 'circle' | 'ellipse';
  stops: CardGradientStop[];
}

export interface CardStyle {
  id: number;
  background: {
    color: string | null;
    gradient: CardGradient | null;
    image_url: string | null;
    thumb_url?: string | null;
    size: string;
    position: string;
    repeat: string;
  };
  border: {
    width: number;
    style: string;
    color: string | null;
    radius: number;
    image_url: string | null;
    image_slice: number;
    image_width: number;
    image_repeat: string;
  };
  text: {
    color: string | null;
    font_key: string;
    font_family: string;
    font_weight: number;
    font_size: number;
    line_height: number;
  };
  padding: number;
}

const cssUrl = (url: string) =>
  `url("${url.replace(/["\\\n\r]/g, (char) => encodeURIComponent(char))}")`;

const gradientCss = (gradient: CardGradient) => {
  const stops = gradient.stops
    .map((stop) => `${stop.color} ${stop.position}%`)
    .join(', ');

  return gradient.type === 'linear'
    ? `linear-gradient(${gradient.angle ?? 180}deg, ${stops})`
    : `radial-gradient(${gradient.shape ?? 'circle'}, ${stops})`;
};

// 서버에서 검증된 스타일 값을 화면용 CSS로 바꾼다. 편집기 미리보기와 타임라인 카드가 함께 쓴다.
export const cardStyleToCss = (style: CardStyle): CSSProperties => {
  const { background, border, text } = style;

  const css: CSSProperties = {
    boxSizing: 'border-box',
    padding: style.padding,
    color: text.color ?? undefined,
    fontFamily: text.font_family,
    fontWeight: text.font_weight,
    fontSize: text.font_size,
    lineHeight: text.line_height / 100,
    borderRadius: border.radius,
  };

  if (background.color) {
    css.backgroundColor = background.color;
  }

  // 그라데이션이 이미지 위에 겹친다
  const images: string[] = [];
  const sizes: string[] = [];
  const positions: string[] = [];
  const repeats: string[] = [];

  if (background.gradient) {
    images.push(gradientCss(background.gradient));
    sizes.push('100% 100%');
    positions.push('center');
    repeats.push('no-repeat');
  }

  if (background.image_url) {
    images.push(cssUrl(background.image_url));
    sizes.push(background.size);
    positions.push(background.position);
    repeats.push(background.repeat);
  }

  if (images.length > 0) {
    css.backgroundImage = images.join(', ');
    css.backgroundSize = sizes.join(', ');
    css.backgroundPosition = positions.join(', ');
    css.backgroundRepeat = repeats.join(', ');
  }

  if (border.image_url) {
    css.borderStyle = 'solid';
    css.borderWidth = border.image_width;
    css.borderImageSource = cssUrl(border.image_url);
    css.borderImageSlice = border.image_slice;
    css.borderImageWidth = `${border.image_width}px`;
    css.borderImageRepeat = border.image_repeat;
  } else if (border.width > 0) {
    css.border = `${border.width}px ${border.style} ${border.color ?? 'currentColor'}`;
  }

  return css;
};