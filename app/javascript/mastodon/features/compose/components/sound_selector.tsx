import { useEffect, useState } from 'react';

import type { Map as ImmutableMap } from 'immutable';

import { changeComposeStorySound } from 'mastodon/actions/compose';
import { useAppDispatch, useAppSelector } from 'mastodon/store';
import { PlayIcon } from 'mastodon/components/sound_icons';
import { playStorySound } from 'mastodon/utils/story_sound';

import type { StorySound } from '../../npcs/sound_api';
import { fetchStorySounds } from '../../npcs/sound_api';

/** 카드/NPC 를 고른 경우에만 보이는 효과음 선택 */
export const StorySoundSelector: React.FC<{ disabled?: boolean }> = ({
  disabled,
}) => {
  const dispatch = useAppDispatch();

  const compose = useAppSelector(
    (state) => state.compose as ImmutableMap<string, unknown>,
  );
  const active = !!(
    compose.get('npc_id') ||
    compose.get('card_preset_id') ||
    compose.get('preset_id')
  );
  const selected = (compose.get('story_sound_id') as string | null) ?? '';

  const [sounds, setSounds] = useState<StorySound[]>([]);

  useEffect(() => {
    if (!active) return undefined;

    let stopped = false;

    fetchStorySounds()
      .then((data) => {
        if (!stopped) setSounds(data.sounds);
      })
      .catch(() => {
        // 권한이 없거나 목록을 못 불러오면 선택지 없이 둔다.
      });

    return () => {
      stopped = true;
    };
  }, [active]);

  if (!active || sounds.length === 0) return null;

  const current = sounds.find((sound) => sound.id === selected);

  return (
    <div className='entrance-selector'>
      <div className='entrance-selector__title'>효과음</div>

      <label className='entrance-selector__row'>
        <span>효과음</span>
        <select
          value={current ? current.id : ''}
          disabled={disabled}
          onChange={(e) => {
            dispatch(changeComposeStorySound(e.target.value || null));
          }}
        >
          <option value=''>없음</option>
          {sounds.map((sound) => (
            <option key={sound.id} value={sound.id}>
              {sound.name}
            </option>
          ))}
        </select>
        {current && (
          <button
            type='button'
            className='entrance-selector__preview'
            aria-label='미리 듣기'
            onClick={() => {
              void playStorySound(current.url, true);
            }}
          >
            <PlayIcon />
          </button>
        )}
      </label>
    </div>
  );
};
