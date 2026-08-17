import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchBackgrounds,
  createBackground,
  deleteBackground,
} from '../background_api';
import type { Background } from '../background_api';

export const BackgroundPanel: React.FC = () => {
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [newName, setNewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(() => {
    fetchBackgrounds()
      .then((data) => {
        setBackgrounds(data);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const name = newName.trim();
      if (file && name) {
        createBackground(name, file)
          .then(() => {
            setNewName('');
            load();
          })
          .catch(() => undefined);
      }
      e.target.value = '';
    },
    [newName, load],
  );

  const handleDelete = useCallback(
    (id: number) => {
      if (!window.confirm('이 배경을 삭제하시겠습니까?')) return;
      deleteBackground(id)
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
          placeholder='새 배경 이름'
        />
        <button
          type='button'
          onClick={() => fileInputRef.current?.click()}
        >
          이미지 선택
        </button>
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>

      <div className='npc-manager__list'>
        {backgrounds.map((bg) => (
          <div key={bg.id} className='npc-manager__item'>
            <div className='npc-manager__item-header'>
              <span className='npc-background__preview'>
                <img src={bg.thumb_url} alt='' />
                {bg.name}
              </span>
              <button
                type='button'
                onClick={() => {
                  handleDelete(bg.id);
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
