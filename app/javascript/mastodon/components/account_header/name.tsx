import type { FC } from 'react';

import { useAccount } from '@/mastodon/hooks/useAccount';
import { useRelationship } from '@/mastodon/hooks/useRelationship';
import { useAppSelector } from '@/mastodon/store';

import { FollowsYouBadge } from '../badge';
import { DisplayName } from '../display_name';
import { NavigationFocusTarget } from '../navigation_focus_target';

import { AccountBadges } from './badges';
import classes from './styles.module.scss';

export const AccountName: FC<{ accountId: string }> = ({ accountId }) => {
  const account = useAccount(accountId);
  const me = useAppSelector((state) => state.meta.get('me') as string);
  const localDomain = useAppSelector(
    (state) => state.meta.get('domain') as string,
  );
  const relationship = useRelationship(accountId);

  if (!account) {
    return null;
  }

  const [username = '', domain = localDomain] = account.acct.split('@');

  return (
    <div className={classes.nameWrapper}>
      <div className={classes.name}>
        <NavigationFocusTarget as='h1'>
          <DisplayName account={account} variant='simple' />
        </NavigationFocusTarget>
        {relationship?.followed_by && <FollowsYouBadge />}
      </div>

      <AccountNameHelp
        username={username}
        domain={domain}
        isSelf={account.id === me}
      />

      <AccountBadges accountId={accountId} />
    </div>
  );
};

const AccountNameHelp: FC<{
  username: string;
  domain: string;
  isSelf: boolean;
}> = ({ username }) => {
  return <span className={classes.handleHelpButton}>@{username}</span>;
};
