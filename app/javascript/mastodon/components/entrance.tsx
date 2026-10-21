import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import classNames from 'classnames';

import {
  canAnimate,
  hasPlayed,
  markPlayed,
  parseEffects,
  prepareLines,
  prepareTypewriter,
  totalDuration,
} from 'mastodon/utils/entrance';

type Phase = 'pending' | 'playing' | 'done';

interface Props {
  /** 재생 기록에 쓸 게시물 ID */
  id: string;
  /** 서버에서 온 연출 값 (예: "shake,lines,glow") */
  effect?: string | null;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * 카드/NPC 블록을 감싸 처음 화면에 보일 때 한 번만 연출을 재생한다.
 * 연출이 없거나, 이미 재생했거나, 모션 줄이기 설정이면 일반 div 로 동작한다.
 */
export const Entrance: React.FC<Props> = ({ id, effect, className, style, children }) => {
  const effects = useMemo(() => parseEffects(effect), [effect]);
  const ref = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>(() =>
    effects && canAnimate() && !hasPlayed(id) ? 'pending' : 'done',
  );

  const textOnly = !!effects && !effects.appear && !effects.glow;

  const textTarget = (): HTMLElement | null => {
    const root = ref.current;
    if (!root) return null;
    return root.querySelector<HTMLElement>('.status__content__text') ?? root;
  };

  // 글자 연출만 있을 때는 카드 바탕은 보이고 글자만 숨긴다
  useLayoutEffect(() => {
    if (phase !== 'pending' || !textOnly) return;
    const target = textTarget();
    if (target) target.style.visibility = 'hidden';
  }, [phase, textOnly]);

  // 재생 중인 타이핑/타이머는 phase 가 바뀌어도 끊기지 않도록 ref 에 보관한다
  const cancelTypingRef = useRef<(() => void) | undefined>(undefined);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (phase !== 'pending' || !effects || !ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;

        observer.disconnect();
        markPlayed(id);

        const target = textTarget();
        let lineCount = 0;
        let typeMs = 0;
        let startTyping: (() => void) | undefined;

        if (target) {
          if (effects.text === 'lines') {
            lineCount = prepareLines(target);
          } else if (effects.text === 'typewriter') {
            const typing = prepareTypewriter(target);
            typeMs = typing.duration;
            cancelTypingRef.current = typing.cancel;
            startTyping = typing.start;
          }
          target.style.visibility = '';
        }

        setPhase('playing');
        startTyping?.();

        timeoutRef.current = window.setTimeout(
          () => {
            cancelTypingRef.current?.();
            cancelTypingRef.current = undefined;
            setPhase('done');
          },
          totalDuration(effects, lineCount, typeMs),
        );
      },
      { threshold: 0.35 },
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [phase, effects, id]);

  // 화면에서 사라질 때(언마운트)만 정리: 타이핑 중이면 전체 글을 복원
  useEffect(
    () => () => {
      if (timeoutRef.current !== undefined) window.clearTimeout(timeoutRef.current);
      cancelTypingRef.current?.();
    },
    [],
  );

  const classes = classNames(className, {
    entrance: phase !== 'done',
    'entrance--pending': phase === 'pending' && !textOnly,
    'entrance--playing': phase === 'playing',
    [`entrance--${effects?.appear ?? ''}`]: phase === 'playing' && !!effects?.appear,
    'entrance--glow': phase === 'playing' && !!effects?.glow,
  });

  return (
    <div ref={ref} className={classes || undefined} style={style}>
      {children}
    </div>
  );
};
