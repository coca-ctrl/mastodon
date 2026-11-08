import { useEffect, useRef } from 'react';

import { Link } from 'react-router-dom';

import type { Account } from '@/mastodon/models/account';
import type { Status } from '@/mastodon/models/status';
import {
  hasPlayedSfx,
  markPlayedSfx,
  notifySfxSeen,
  playStorySound,
  useStorySfxSettings,
} from 'mastodon/utils/story_sound';

import { PlayIcon } from '../sound_icons';
import { RelativeTimestamp } from '../relative_timestamp';

import { StatusEditedAt, StatusVisibility } from './header';

interface StorySoundInfo {
  id: string;
  name: string;
  url: string;
  duration_ms: number;
}

const readSound = (status: Status): StorySoundInfo | null => {
  const raw = status.get('story_sound') as unknown;

  if (!raw) return null;

  const value =
    typeof (raw as { toJS?: unknown }).toJS === 'function'
      ? (raw as { toJS: () => unknown }).toJS()
      : raw;
  const sound = value as Partial<StorySoundInfo>;

  return sound.url ? (sound as StorySoundInfo) : null;
};

export const CardStatusFooter: React.FC<{ status: Status }> = ({ status }) => {
  const account = status.get('account') as Account | undefined;
  const editedAt = status.get('edited_at') as string;
  const statusId = status.get('id') as string;

  const footerRef = useRef<HTMLDivElement>(null);
  const sfx = useStorySfxSettings();
  const sound = readSound(status);
  const soundUrl = sound?.url;

  // 게시물이 처음 화면에 보일 때 효과음을 한 번 재생한다.
  useEffect(() => {
    if (!soundUrl) return undefined;

    notifySfxSeen();

    if (hasPlayedSfx(statusId)) return undefined;

    const footer = footerRef.current;

    if (!footer) return undefined;

    const target = footer.closest('.status') ?? footer;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;

        observer.disconnect();

        void playStorySound(soundUrl).then((played) => {
          if (played) markPlayedSfx(statusId);
        });
      },
      { threshold: 0.35 },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [soundUrl, statusId]);

  return (
    <div className='status-card-style__footer' ref={footerRef}>
      {sound && (
        <button
          type='button'
          className='status-card-style__sound'
          title={sfx.on ? sound.name : '효과음이 꺼져 있습니다'}
          aria-label={`효과음 다시 듣기: ${sound.name}`}
          disabled={!sfx.on}
          onClick={(event) => {
            event.stopPropagation();
            void playStorySound(sound.url);
          }}
        >
          <PlayIcon />
          효과음
        </button>
      )}
      <Link
        to={`/@${account?.acct}/${statusId}`}
        className='status__relative-time'
      >
        <StatusVisibility visibility={status.get('visibility')} />
        <RelativeTimestamp timestamp={status.get('created_at') as string} />
        {editedAt && <StatusEditedAt editedAt={editedAt} />}
      </Link>
    </div>
  );
};
