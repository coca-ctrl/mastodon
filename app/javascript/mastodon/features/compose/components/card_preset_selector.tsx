import { useCallback, useEffect, useRef, useState } from 'react';

import { useDispatch } from 'react-redux';

import { changeComposeCardPreset } from 'mastodon/actions/compose';
import { cardStyleToCss } from 'mastodon/features/card_style/style';
import { fetchCardPresets } from 'mastodon/features/npcs/card_preset_api';
import type { CardPreset } from 'mastodon/features/npcs/card_preset_api';
import { useAppSelector } from 'mastodon/store';

import { PinFooter, PinIcon, useCurrentChoice, usePinnedStyle } from './pinned_style';
import { choiceKey, recordChoice } from '../util/pinned_style';

export const CardPresetSelector: React.FC = () => {
  const dispatch = useDispatch();
  const [presets, setPresets] = useState<CardPreset[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const selectedId = useAppSelector(
    (state) => state.compose.get('card_preset_id') as number | null,
  );
  const current = useCurrentChoice();
  const { pinned } = usePinnedStyle();

  useEffect(() => {
    fetchCardPresets()
      .then((data) => {
        setPresets(data);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!showMenu) {
      return undefined;
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleSelect = useCallback(
    (id: number | null) => {
      if (id) {
        recordChoice({ kind: 'card', id });
      } else {
        // NPC·프리셋이 선택되어 있으면 그대로 남으므로, 남는 선택을 기준으로 기억한다
        recordChoice(
          current && current.kind !== 'card' ? current : { kind: 'none' },
        );
      }

      dispatch(changeComposeCardPreset(id));
      setShowMenu(false);
    },
    [dispatch, current],
  );

  if (presets.length === 0) {
    return null;
  }

  const selected = presets.find((preset) => preset.id === selectedId);
  const isPinned =
    !!current &&
    current.kind === 'card' &&
    choiceKey(current) === choiceKey(pinned);

  return (
    <div className='npc-selector card-preset-selector' ref={menuRef}>
      <button
        type='button'
        className='npc-selector__trigger'
        onClick={() => {
          setShowMenu((prev) => !prev);
        }}
      >
        {isPinned && <PinIcon />}
        {selected ? ` 카드: ${selected.name}` : '카드 스타일'}
      </button>

      {showMenu && (
        <div className='npc-selector__menu'>
          <div
            className='npc-selector__menu-item'
            onClick={() => {
              handleSelect(null);
            }}
          >
            사용 안 함
          </div>

          {presets.map((preset) => (
            <div
              key={preset.id}
              className='npc-selector__menu-item'
              onClick={() => {
                handleSelect(preset.id);
              }}
            >
              <div
                className='card-styled card-preset-selector__sample'
                style={{
                  ...cardStyleToCss(preset),
                  padding: 8,
                  fontSize: 13,
                }}
              >
                {preset.name}
              </div>
            </div>
          ))}

          <PinFooter
            kinds={['card']}
            onDone={() => {
              setShowMenu(false);
            }}
          />
        </div>
      )}
    </div>
  );
};
