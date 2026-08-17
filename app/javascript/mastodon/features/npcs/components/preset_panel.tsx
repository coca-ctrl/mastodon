import { useState, useEffect, useCallback } from 'react';
import { fetchNpcs } from '../api';
import type { Npc } from '../api';
import { fetchBackgrounds } from '../background_api';
import type { Background } from '../background_api';
import { fetchPresets, createPreset, deletePreset } from '../preset_api';
import type { Preset } from '../preset_api';

export const PresetPanel: React.FC = () => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);

  const [name, setName] = useState('');
  const [selectedNpcId, setSelectedNpcId] = useState<number | ''>('');
  const [selectedEmotion, setSelectedEmotion] = useState('');
  const [selectedBackgroundId, setSelectedBackgroundId] = useState <
    number | ''
  >('');

  const load = useCallback(() => {
    fetchPresets()
      .then((data) => {
        setPresets(data);
      })
      .catch(() => undefined);
    fetchNpcs()
      .then((data) => {
        setNpcs(data);
      })
      .catch(() => undefined);
    fetchBackgrounds()
      .then((data) => {
        setBackgrounds(data);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedNpc = npcs.find((n) => n.id === selectedNpcId);

  const handleCreate = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed || !selectedNpcId || !selectedEmotion) return;

    createPreset(
      trimmed,
      selectedNpcId,
      selectedEmotion,
      selectedBackgroundId || null,
    )
      .then(() => {
        setName('');
        setSelectedNpcId('');
        setSelectedEmotion('');
        setSelectedBackgroundId('');
        load();
      })
      .catch(() => undefined);
  }, [name, selectedNpcId, selectedEmotion, selectedBackgroundId, load]);

  const handleDelete = useCallback(
    (id: number) => {
      if (!window.confirm('이 프리셋을 삭제하시겠습니까?')) return;
      deletePreset(id)
        .then(() => {
          load();
        })
        .catch(() => undefined);
    },
    [load],
  );

  return (
    <div className='npc-manager'>
      <div className='npc-manager__preset-form'>
        <input
          type='text'
          value={name}
          onChange={(e) => {
            setName(e.target.value);
          }}
          placeholder='프리셋 이름'
        />

        <select
          value={selectedNpcId}
          onChange={(e) => {
            setSelectedNpcId(e.target.value ? Number(e.target.value) : '');
            setSelectedEmotion('');
          }}
        >
          <option value=''>NPC 선택</option>
          {npcs.map((npc) => (
            <option key={npc.id} value={npc.id}>
              {npc.name}
            </option>
          ))}
        </select>

        <select
          value={selectedEmotion}
          onChange={(e) => {
            setSelectedEmotion(e.target.value);
          }}
          disabled={!selectedNpc}
        >
          <option value=''>감정 선택</option>
          {selectedNpc?.images.map((img) => (
            <option key={img.emotion} value={img.emotion}>
              {img.emotion}
            </option>
          ))}
        </select>

        <select
          value={selectedBackgroundId}
          onChange={(e) => {
            setSelectedBackgroundId(
              e.target.value ? Number(e.target.value) : '',
            );
          }}
        >
          <option value=''>배경 없음</option>
          {backgrounds.map((bg) => (
            <option key={bg.id} value={bg.id}>
              {bg.name}
            </option>
          ))}
        </select>

        <button type='button' onClick={handleCreate}>
          프리셋 추가
        </button>
      </div>

      <div className='npc-manager__list'>
        {presets.map((preset) => (
          <div key={preset.id} className='npc-manager__item'>
            <div className='npc-manager__item-header'>
              <span>
                {preset.name} ({preset.npc_name} · {preset.npc_emotion}
                {preset.background_name ? ` · ${preset.background_name}` : ''}
                )
              </span>
              <button
                type='button'
                onClick={() => {
                  handleDelete(preset.id);
                }}
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
