import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { changeComposeNpc, changeComposePreset } from 'mastodon/actions/compose';
import { fetchNpcs } from 'mastodon/features/npcs/api';
import type { Npc } from 'mastodon/features/npcs/api';
import { fetchPresets } from 'mastodon/features/npcs/preset_api';
import type { Preset } from 'mastodon/features/npcs/preset_api';

export const NpcSelector: React.FC = () => {
  const dispatch = useDispatch();
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

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
      dispatch(changeComposePreset(preset.id));
      setSelectedLabel(preset.name);
      setShowMenu(false);
    },
    [dispatch],
  );

  const handleSelectCustom = useCallback(
    (npc: Npc, emotion: string) => {
      dispatch(changeComposeNpc(npc.id, emotion, null));
      setSelectedLabel(`${npc.name} (${emotion})`);
      setShowMenu(false);
    },
    [dispatch],
  );

  const handleClear = useCallback(() => {
    dispatch(changeComposePreset(null));
    setSelectedLabel(null);
    setShowMenu(false);
  }, [dispatch]);

  if (npcs.length === 0) return null;

  return (
    <div className='npc-selector' ref={menuRef}>
      <button
        type='button'
        className='npc-selector__trigger'
        onClick={() => {
          setShowMenu((prev) => !prev);
        }}
      >
        {selectedLabel ? `NPC: ${selectedLabel}` : 'NPC 선택'}
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
        </div>
      )}
    </div>
  );
};