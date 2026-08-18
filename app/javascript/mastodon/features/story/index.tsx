import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Column } from 'mastodon/components/column';
import { fetchStorySessions } from './api';
import type { StorySessionSummary } from './api';

const StoryList: React.FC = () => {
  const [sessions, setSessions] = useState<StorySessionSummary[]>([]);

  useEffect(() => {
    fetchStorySessions()
      .then((data) => {
        setSessions(data);
      })
      .catch(() => undefined);
  }, []);

  return (
    <Column bindToDocument label='스토리 다시보기'>
      <div className='story-list'>
        {sessions.map((session) => (
          <div key={session.id} className='story-list__item'>
            {session.open ? (
              <div className='story-list__card story-list__card--open'>
                <img src={session.thumbnail_url} alt='' />
                <div className='story-list__meta'>
                  <span className='story-list__title'>
                    {session.title ?? '제목 없음'}
                  </span>
                  <span className='story-list__status'>진행 중</span>
                </div>
              </div>
            ) : (
              <Link
                to={`/story/${session.id}`}
                className='story-list__card'
              >
                <img src={session.thumbnail_url} alt='' />
                <div className='story-list__meta'>
                  <span className='story-list__title'>
                    {session.title ?? '제목 없음'}
                  </span>
                  <span className='story-list__status'>
                    {session.post_count}개의 게시물
                  </span>
                </div>
              </Link>
            )}
          </div>
        ))}

        {sessions.length === 0 && (
          <div className='story-list__empty'>등록된 스토리가 없습니다.</div>
        )}
      </div>
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default StoryList;