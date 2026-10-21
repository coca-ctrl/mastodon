import { useCallback, useEffect, useState } from 'react';
import type { FC } from 'react';

import AtIcon from '@/tabler-icons/at.svg?react';
import api from 'mastodon/api';
import { IconWithBadge } from 'mastodon/components/icon_with_badge';

const REFRESH_MS = 60_000;

// 왼쪽 메뉴의 "답장할 멘션" 아이콘 + 남은 개수 배지
export const UnansweredMentionsNavIcon: FC = () => {
  const [count, setCount] = useState(0);

  const load = useCallback(() => {
    api()
      .get<{ count: number }>('/api/v1/unanswered_mentions/count')
      .then((response) => {
        setCount(response.data.count);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    window.addEventListener('unanswered-refresh', load);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('unanswered-refresh', load);
    };
  }, [load]);

  return (
    <IconWithBadge
      id='at'
      icon={AtIcon}
      count={count}
      className='column-link__icon icon--no-fill'
    />
  );
};
