import { defineMessages, useIntl } from 'react-intl';

import AlternateEmailIcon from '@/tabler-icons/at.svg?react';
import LockIcon from '@/tabler-icons/lock.svg?react';
import PublicIcon from '@/tabler-icons/flare.svg?react';
import QuietTimeIcon from '@/tabler-icons/moon.svg?react';
import type { StatusVisibility } from 'mastodon/models/status';

import { Icon } from './icon';

const messages = defineMessages({
  public_short: { id: 'privacy.public.short', defaultMessage: 'Public' },
  unlisted_short: {
    id: 'privacy.unlisted.short',
    defaultMessage: 'Quiet public',
  },
  private_short: {
    id: 'privacy.private.short',
    defaultMessage: 'Followers',
  },
  direct_short: {
    id: 'privacy.direct.short',
    defaultMessage: 'Specific people',
  },
});

export const VisibilityIcon: React.FC<{ visibility: StatusVisibility }> = ({
  visibility,
}) => {
  const intl = useIntl();

  const visibilityIconInfo = {
    public: {
      icon: 'flare',
      iconComponent: PublicIcon,
      text: intl.formatMessage(messages.public_short),
    },
    unlisted: {
      icon: 'moon',
      iconComponent: QuietTimeIcon,
      text: intl.formatMessage(messages.unlisted_short),
    },
    private: {
      icon: 'lock2',
      iconComponent: LockIcon,
      text: intl.formatMessage(messages.private_short),
    },
    direct: {
      icon: 'at',
      iconComponent: AlternateEmailIcon,
      text: intl.formatMessage(messages.direct_short),
    },
  };

  const visibilityIcon = visibilityIconInfo[visibility];

  return (
    <Icon
      id={visibilityIcon.icon}
      icon={visibilityIcon.iconComponent}
      aria-label={visibilityIcon.text}
    />
  );
};
