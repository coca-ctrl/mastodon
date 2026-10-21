import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { changeComposeNpc, changeComposePreset } from 'mastodon/actions/compose';
import { fetchNpcs } from 'mastodon/features/npcs/api';
import type { Npc } from 'mastodon/features/npcs/api';
import { fetchPresets } from 'mastodon/features/npcs/preset_api';
import type { Preset } from 'mastodon/features/npcs/preset_api';
import { useAppSelector } from 'mastodon/store';

import { PinFooter, PinIcon, useCurrentChoice, usePinnedStyle } from './pinned_style';
import { choiceKey, recordChoice } from '../util/pinned_style';

export const NpcSelector: React.FC = () => {
  const dispatch = useDispatch();
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const npcId = useAppSelector(
    (state) => state.compose.get('npc_id') as number | null,
  );
  const npcEmotion = useAppSelector(
    (state) => state.compose.get('npc_emotion') as string | null,
  );
  const presetId = useAppSelector(
    (state) => state.compose.get('preset_id') as number | null,
  );
  const current = useCurrentChoice();
  const { pinned } = usePinnedStyle();

  useEffect(() => {
    fetchNpcs()
      .then((data) => {
        setNpcs(data);
      })
      .catch(() => undefined);
    fetchPresets()
      .then((data) => {
        setPresets(data);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleSelectPreset = useCallback(
    (preset: Preset) => {
      recordChoice({ kind: 'preset', id: preset.id });
      dispatch(changeComposePreset(preset.id));
      setShowMenu(false);
    },
    [dispatch],
  );

  const handleSelectCustom = useCallback(
    (npc: Npc, emotion: string) => {
      recordChoice({ kind: 'npc', id: npc.id, emotion });
      dispatch(changeComposeNpc(npc.id, emotion, null));
      setShowMenu(false);
    },
    [dispatch],
  );

  const handleClear = useCallback(() => {
    // 카드 스타일이 선택되어 있으면 그대로 남으므로, 남는 선택을 기준으로 기억한다
    recordChoice(current?.kind === 'card' ? current : { kind: 'none' });
    dispatch(changeComposePreset(null));
    setShowMenu(false);
  }, [dispatch, current]);

  if (npcs.length === 0) return null;

  const selectedPreset = presetId
    ? presets.find((preset) => preset.id === presetId)
    : undefined;
  const selectedNpc = npcId ? npcs.find((npc) => npc.id === npcId) : undefined;
  const selectedLabel = selectedPreset
    ? selectedPreset.name
    : selectedNpc
      ? `${selectedNpc.name} (${npcEmotion ?? 'default'})`
      : null;
  const isPinned =
    !!current &&
    current.kind !== 'card' &&
    choiceKey(current) === choiceKey(pinned);

  return (
    <div className='npc-selector' ref={menuRef}>
      <button
        type='button'
        className='npc-selector__trigger'
        onClick={() => {
          setShowMenu((prev) => !prev);
        }}
      >
        {isPinned && <PinIcon />}
        {selectedLabel ? ` NPC: ${selectedLabel}` : 'NPC 선택'}
      </button>

      {showMenu && (
        <div className='npc-selector__menu'>
          <div className='npc-selector__menu-item' onClick={handleClear}>
            사용 안 함
          </div>

          {presets.length > 0 && (
            <div className='npc-selector__section-label'>프리셋</div>
          )}
          {presets.map((preset) => (
            <div
              key={preset.id}
              className='npc-selector__preset-item'
              onClick={() => {
                handleSelectPreset(preset);
              }}
            >
              {preset.npc_image_url && (
                <img src={preset.npc_image_url} alt='' />
              )}
              <div>
                <div className='npc-selector__preset-name'>{preset.name}</div>
                <div className='npc-selector__preset-meta'>
                  {preset.npc_name} · {preset.npc_emotion}
                  {preset.background_name ? ` · ${preset.background_name}` : ''}
                </div>
              </div>
            </div>
          ))}

          <div
            className='npc-selector__custom-toggle'
            onClick={() => {
              setShowCustom((prev) => !prev);
            }}
          >
            커스텀 선택 {showCustom ? '▲' : '▼'}
          </div>

          {showCustom &&
            npcs.map((npc) => (
              <div key={npc.id} className='npc-selector__npc-group'>
                <div className='npc-selector__npc-name'>{npc.name}</div>
                <div className='npc-selector__emotions'>
                  {npc.images.map((img) => (
                    <div
                      key={img.emotion}
                      className='npc-selector__emotion-item'
                      onClick={() => {
                        handleSelectCustom(npc, img.emotion);
                      }}
                    >
                      <img src={img.thumb_url} alt='' />
                      <span>{img.emotion}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          <PinFooter
            kinds={['preset', 'npc']}
            onDone={() => {
              setShowMenu(false);
            }}
          />
        </div>
      )}
    </div>
  );
};
