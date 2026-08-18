import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch } from 'mastodon/store';
import { Column } from 'mastodon/components/column';
import StatusContainer from 'mastodon/containers/status_container';
import { importFetchedStatuses } from 'mastodon/actions/importer';
import { fetchStorySession } from './api';
import type { StorySessionSummary } from './api';
import { Link } from 'react-router-dom';
import { Icon } from 'mastodon/components/icon';
import ArrowBackIcon from '@/tabler-icons/arrow-left.svg?react';

interface StatusLike {
  id: string;
}

const StorySessionReader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const [session, setSession] = useState<StorySessionSummary | null>(null);
  const [statusIds, setStatusIds] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;

    fetchStorySession(Number(id))
      .then((data) => {
        setSession(data.session);
        const statuses = data.statuses as StatusLike[];
        dispatch(importFetchedStatuses(data.statuses));
        setStatusIds(statuses.map((s) => s.id));
      })
      .catch(() => undefined);
  }, [id, dispatch]);

  return (
    <Column bindToDocument label={session?.title ?? '스토리'}>
      <div className='story-session'>
        <div className='story-session__header'>
          <Link to='/story' className='story-session__back'>
            <Icon id='arrow-left' icon={ArrowBackIcon} className='icon--no-fill' />
          </Link>
          <h1>{session?.title ?? '스토리'}</h1>
        </div>

        <div className='story-session__statuses'>
          {statusIds.map((statusId) => (
            <StatusContainer key={statusId} id={statusId} />
          ))}
        </div>
      </div>
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default StorySessionReader;