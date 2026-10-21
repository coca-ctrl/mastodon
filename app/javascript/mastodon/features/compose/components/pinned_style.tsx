import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { FC } from 'react';

import { useDispatch } from 'react-redux';

import {
  changeComposeCardPreset,
  changeComposeNpc,
  changeComposePreset,
} from 'mastodon/actions/compose';
import { fetchCardPresets } from 'mastodon/features/npcs/card_preset_api';
import { fetchNpcs } from 'mastodon/features/npcs/api';
import { fetchPresets } from 'mastodon/features/npcs/preset_api';
import { useAppSelector } from 'mastodon/store';

import {
  choiceKey,
  getSnapshot,
  setOverride,
  setPinned,
  subscribe,
} from '../util/pinned_style';
import type { PinnedSnapshot, StyleChoice } from '../util/pinned_style';

export const PinIcon: FC = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width={16}
    height={16}
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth={1.75}
    strokeLinecap='round'
    strokeLinejoin='round'
    aria-hidden='true'
  >
    <path d='M15 4.5l-4 4l-4 1.5l-1.5 1.5l7 7l1.5 -1.5l1.5 -4l4 -4' />
    <path d='M9 15l-4.5 4.5' />
    <path d='M14.5 4l5.5 5.5' />
  </svg>
);

export function usePinnedStyle(): PinnedSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** 작성창에서 현재 선택된 스타일. 아무것도 없으면 null */
export function useCurrentChoice(): StyleChoice | null {
  const npcId = useAppSelector(
    (state) => state.compose.get('npc_id') as number | null,
  );
  const emotion = useAppSelector(
    (state) => state.compose.get('npc_emotion') as string | null,
  );
  const presetId = useAppSelector(
    (state) => state.compose.get('preset_id') as number | null,
  );
  const cardId = useAppSelector(
    (state) => state.compose.get('card_preset_id') as number | null,
  );

  return useMemo<StyleChoice | null>(() => {
    if (cardId) return { kind: 'card', id: cardId };
    if (presetId) return { kind: 'preset', id: presetId };
    if (npcId) return { kind: 'npc', id: npcId, emotion: emotion ?? 'default' };

    return null;
  }, [npcId, emotion, presetId, cardId]);
}

type Dispatch = ReturnType<typeof useDispatch>;

function applyChoice(dispatch: Dispatch, choice: StyleChoice) {
  switch (choice.kind) {
    case 'card':
      dispatch(changeComposeCardPreset(choice.id));
      break;
    case 'preset':
      dispatch(changeComposePreset(choice.id));
      break;
    case 'npc':
      dispatch(changeComposeNpc(choice.id, choice.emotion, null));
      break;
    case 'none':
      break;
  }
}

// 삭제된 스타일이 고정값으로 남아 있지 않은지 확인한다. 조회에 실패하면 그대로 둔다.
async function choiceExists(choice: StyleChoice | null): Promise<boolean> {
  if (!choice || choice.kind === 'none') return true;

  try {
    if (choice.kind === 'card') {
      const list = await fetchCardPresets();
      return list.some((item) => item.id === choice.id);
    }

    if (choice.kind === 'preset') {
      const list = await fetchPresets();
      return list.some((item) => item.id === choice.id);
    }

    const list = await fetchNpcs();
    const npc = list.find((item) => item.id === choice.id);

    return !!npc && npc.images.some((img) => img.emotion === choice.emotion);
  } catch {
    return true;
  }
}

/** 메뉴 하단: 현재 선택을 고정 / 고정 해제 */
export const PinFooter: FC<{
  kinds: StyleChoice['kind'][];
  onDone: () => void;
}> = ({ kinds, onDone }) => {
  const { pinned } = usePinnedStyle();
  const current = useCurrentChoice();

  const canPin =
    !!current &&
    kinds.includes(current.kind) &&
    choiceKey(current) !== choiceKey(pinned);
  const canUnpin = !!pinned && kinds.includes(pinned.kind);

  if (!canPin && !canUnpin) return null;

  return (
    <div className='npc-selector__pin-footer'>
      {canPin && (
        <div
          className='npc-selector__menu-item npc-selector__pin-item'
          onClick={() => {
            setPinned(current);
            onDone();
          }}
        >
          <PinIcon /> 현재 선택을 기본으로 고정
        </div>
      )}
      {canUnpin && (
        <div
          className='npc-selector__menu-item npc-selector__pin-item'
          onClick={() => {
            setPinned(null);
            onDone();
          }}
        >
          <PinIcon /> 고정 해제
        </div>
      )}
    </div>
  );
};

/** 고정값 자동 적용 + "고정으로 복귀" 버튼 */
export const PinnedStyleController: FC<{ disabled?: boolean }> = ({
  disabled,
}) => {
  const dispatch = useDispatch();
  const { pinned, override } = usePinnedStyle();
  const current = useCurrentChoice();
  const [ready, setReady] = useState(false);

  const nothingSelected = current === null;
  const effective = override ?? pinned;
  const effectiveKey = choiceKey(effective);

  useEffect(() => {
    let cancelled = false;
    const start = getSnapshot();

    void Promise.all([
      choiceExists(start.pinned),
      choiceExists(start.override),
    ]).then(([pinnedOk, overrideOk]) => {
      if (cancelled) return;

      if (!pinnedOk) {
        setPinned(null);
      } else if (!overrideOk) {
        setOverride(null);
      }

      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (disabled || !ready || !nothingSelected) return;
    if (!effective || effective.kind === 'none') return;

    applyChoice(dispatch, effective);
    // effective 객체 대신 키로 비교한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, ready, nothingSelected, effectiveKey, dispatch]);

  if (disabled || !pinned || choiceKey(current) === choiceKey(pinned)) {
    return null;
  }

  return (
    <button
      type='button'
      className='npc-selector__trigger pinned-style__revert'
      title='일시적으로 바꾼 스타일을 해제하고 기본 고정 스타일로 되돌립니다'
      onClick={() => {
        setOverride(null);
        applyChoice(dispatch, pinned);
      }}
    >
      <PinIcon /> 고정으로 복귀
    </button>
  );
};
