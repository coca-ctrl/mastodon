import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchNpcs,
  createNpc,
  deleteNpc,
  uploadNpcImage,
  deleteNpcImage,
} from '../api';
import type { Npc } from '../api';

export const NpcPanel: React.FC = () => {
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [newName, setNewName] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [newEmotionInputs, setNewEmotionInputs] = useState<Record<number, string>>({});

  const load = useCallback(() => {
    fetchNpcs()
      .then((data) => {
        setNpcs(data);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = useCallback(() => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createNpc(trimmed)
      .then(() => {
        setNewName('');
        load();
      })
      .catch(() => undefined);
  }, [newName, load]);

  const handleDelete = useCallback(
    (id: number) => {
      if (!window.confirm('이 NPC를 삭제하시겠습니까?')) return;
      deleteNpc(id)
        .then(() => {
          load();
        })
        .catch(() => undefined);
    },
    [load],
  );

  const handleImageUpload = useCallback(
    (npcId: number, emotion: string, file: File) => {
      uploadNpcImage(npcId, emotion, file)
        .then(() => {
          load();
        })
        .catch(() => undefined);
    },
    [load],
  );

  const handleImageDelete = useCallback(
    (npcId: number, imageId: number) => {
      deleteNpcImage(npcId, imageId)
        .then(() => {
          load();
        })
        .catch(() => undefined);
    },
    [load],
  );

  return (
      <div className='npc-manager'>
        <div className='npc-manager__create'>
          <input
            type='text'
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
            }}
            placeholder='새 NPC 이름'
          />
          <button type='button' onClick={handleCreate}>
            추가
          </button>
        </div>

        <div className='npc-manager__list'>
          {npcs.map((npc) => (
            <div key={npc.id} className='npc-manager__item'>
              <div
                className='npc-manager__item-header'
                onClick={() => {
                  setExpandedId((prev) => (prev === npc.id ? null : npc.id));
                }}
              >
                <span>{npc.name}</span>
                <button
                  type='button'
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(npc.id);
                  }}
                >
                  삭제
                </button>
              </div>

              {expandedId === npc.id && (
  <div className='npc-manager__images'>
    {(() => {
      const defaultImage = npc.images.find((img) => img.emotion === 'default');
      const defaultInputKey = `${npc.id}-default`;

      return (
        <div className='npc-manager__emotion npc-manager__emotion--required'>
          <span className='npc-manager__emotion-label'>
            기본 <span className='npc-manager__required-badge'>필수</span>
          </span>

          {defaultImage ? (
            <div className='npc-manager__emotion-preview'>
              <img src={defaultImage.thumb_url} alt='' />
                <button
                    type='button'
                    onClick={() => {
                    handleImageDelete(npc.id, defaultImage.id);
                    }}
                >
                    제거
                </button>
                <button
                    type='button'
                    onClick={() =>
                    fileInputRefs.current[defaultInputKey]?.click()
                    }
                >
                    교체
                </button>
                </div>
            ) : (
                <button
                type='button'
                onClick={() =>
                    fileInputRefs.current[defaultInputKey]?.click()
                }
                >
                업로드
                </button>
            )}

            <input
                ref={(el) => {
                fileInputRefs.current[defaultInputKey] = el;
                }}
                type='file'
                accept='image/*'
                style={{ display: 'none' }}
                onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                    handleImageUpload(npc.id, 'default', file);
                }
                e.target.value = '';
                }}
            />
            </div>
        );
        })()}

        {npc.images
        .filter((img) => img.emotion !== 'default')
        .map((existing) => {
                    const inputKey = `${npc.id}-${existing.emotion}`;

                    return (
                        <div key={existing.emotion} className='npc-manager__emotion'>
                        <span className='npc-manager__emotion-label'>
                            {existing.emotion}
                        </span>

                        <div className='npc-manager__emotion-preview'>
                            <img src={existing.thumb_url} alt='' />
                            <button
                            type='button'
                            onClick={() => {
                                handleImageDelete(npc.id, existing.id);
                            }}
                            >
                            제거
                            </button>
                            <button
                            type='button'
                            onClick={() => fileInputRefs.current[inputKey]?.click()}
                            >
                            교체
                            </button>
                        </div>

                        <input
                            ref={(el) => {
                            fileInputRefs.current[inputKey] = el;
                            }}
                            type='file'
                            accept='image/*'
                            style={{ display: 'none' }}
                            onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                handleImageUpload(npc.id, existing.emotion, file);
                            }
                            e.target.value = '';
                            }}
                        />
                        </div>
                    );
                    })}

                    <div className='npc-manager__add-emotion'>
                    <input
                        type='text'
                        value={newEmotionInputs[npc.id] ?? ''}
                        onChange={(e) => {
                        setNewEmotionInputs((prev) => ({
                            ...prev,
                            [npc.id]: e.target.value,
                        }));
                        }}
                        placeholder='새 감정 이름 (예: 기쁨)'
                    />
                    <button
                        type='button'
                        onClick={() => {
                        const emotion = (newEmotionInputs[npc.id] ?? '').trim();
                        if (!emotion) return;
                        fileInputRefs.current[`${npc.id}-new`]?.click();
                        }}
                    >
                        이미지 선택
                    </button>
                    <input
                        ref={(el) => {
                        fileInputRefs.current[`${npc.id}-new`] = el;
                        }}
                        type='file'
                        accept='image/*'
                        style={{ display: 'none' }}
                        onChange={(e) => {
                        const file = e.target.files?.[0];
                        const emotion = (newEmotionInputs[npc.id] ?? '').trim();
                        if (file && emotion) {
                            handleImageUpload(npc.id, emotion, file);
                            setNewEmotionInputs((prev) => ({ ...prev, [npc.id]: '' }));
                        }
                        e.target.value = '';
                        }}
                    />
                    </div>
                </div>
                )}
            </div>
          ))}
        </div>
      </div>
  );
};