import { useCallback, useEffect, useRef, useState } from 'react';

import { PlayIcon } from 'mastodon/components/sound_icons';
import { playStorySound } from 'mastodon/utils/story_sound';

import type { StorySoundList } from '../sound_api';
import {
  createStorySound,
  deleteStorySound,
  errorMessage,
  fetchStorySounds,
  renameStorySound,
} from '../sound_api';

const formatSeconds = (ms: number) => `${(ms / 1000).toFixed(1)}초`;

export const SoundPanel: React.FC = () => {
  const [data, setData] = useState<StorySoundList | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setData(await fetchStorySounds());
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = useCallback(async () => {
    setError('');

    if (!file) {
      setError('파일을 선택해 주세요.');
      return;
    }

    if (!name.trim()) {
      setError('이름을 입력해 주세요.');
      return;
    }

    const maxMb = data?.limits.max_size_mb ?? 2;

    if (file.size > maxMb * 1024 * 1024) {
      setError(`파일은 ${maxMb}MB 이하만 올릴 수 있습니다.`);
      return;
    }

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('file', file);

    setBusy(true);

    try {
      await createStorySound(formData);
      setName('');
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [file, name, data, load]);

  const handleRename = useCallback(
    async (id: string, current: string) => {
      const next = window.prompt('새 이름', current)?.trim();

      if (!next || next === current) return;

      try {
        await renameStorySound(id, next);
        await load();
      } catch (e) {
        setError(errorMessage(e));
      }
    },
    [load],
  );

  const handleDelete = useCallback(
    async (id: string, label: string, used: number) => {
      const message =
        used > 0
          ? `"${label}"을(를) 삭제할까요? 사용 중인 게시물 ${used}개는 효과음 없이 표시됩니다.`
          : `"${label}"을(를) 삭제할까요?`;

      if (!window.confirm(message)) return;

      try {
        await deleteStorySound(id);
        await load();
      } catch (e) {
        setError(errorMessage(e));
      }
    },
    [load],
  );

  const limits = data?.limits;

  return (
    <div className='sound-panel'>
      <p className='sound-panel__hint'>
        카드/NPC 게시물에 연결하는 짧은 효과음입니다.
        {limits &&
          ` mp3·ogg·m4a·wav, ${limits.max_size_mb}MB 이하, ${limits.max_seconds}초 이하, 최대 ${limits.max_sounds}개.`}
      </p>

      <div className='sound-panel__form'>
        <input
          type='text'
          value={name}
          maxLength={30}
          placeholder='효과음 이름'
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
        <input
          ref={fileInput}
          type='file'
          accept='.mp3,.ogg,.m4a,.wav,audio/mpeg,audio/ogg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav'
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
          }}
        />
        <button
          type='button'
          className='button button--small'
          disabled={busy}
          onClick={() => {
            void handleUpload();
          }}
        >
          {busy ? '올리는 중…' : '올리기'}
        </button>
      </div>

      {error && <div className='sound-panel__error'>{error}</div>}

      <div className='sound-panel__list'>
        {data && data.sounds.length === 0 && (
          <div className='sound-panel__empty'>등록된 효과음이 없습니다.</div>
        )}

        {data?.sounds.map((sound) => (
          <div key={sound.id} className='sound-panel__item'>
            <button
              type='button'
              className='sound-panel__play'
              aria-label={`${sound.name} 미리 듣기`}
              onClick={() => {
                void playStorySound(sound.url, true);
              }}
            >
              <PlayIcon />
            </button>
            <div className='sound-panel__name'>
              {sound.name}
              <span className='sound-panel__meta'>
                {' '}
                {formatSeconds(sound.duration_ms)} · 사용 {sound.used_count}개
              </span>
            </div>
            <button
              type='button'
              className='sound-panel__action'
              onClick={() => {
                void handleRename(sound.id, sound.name);
              }}
            >
              이름 변경
            </button>
            <button
              type='button'
              className='sound-panel__action'
              onClick={() => {
                void handleDelete(sound.id, sound.name, sound.used_count);
              }}
            >
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
