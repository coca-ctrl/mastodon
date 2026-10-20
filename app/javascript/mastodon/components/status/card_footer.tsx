import { Link } from 'react-router-dom';

import type { Account } from '@/mastodon/models/account';
import type { Status } from '@/mastodon/models/status';

import { RelativeTimestamp } from '../relative_timestamp';

import { StatusEditedAt, StatusVisibility } from './header';

export const CardStatusFooter: React.FC<{ status: Status }> = ({ status }) => {
  const account = status.get('account') as Account | undefined;
  const editedAt = status.get('edited_at') as string;

  return (
    <div className='status-card-style__footer'>
      <Link
        to={`/@${account?.acct}/${status.get('id') as string}`}
        className='status__relative-time'
      >
        <StatusVisibility visibility={status.get('visibility')} />
        <RelativeTimestamp timestamp={status.get('created_at') as string} />
        {editedAt && <StatusEditedAt editedAt={editedAt} />}
      </Link>
    </div>
  );
};