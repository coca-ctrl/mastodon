import { useState, useRef, useEffect, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { Icon } from 'mastodon/components/icon';
import { useAppSelector, useAppDispatch } from 'mastodon/store';
import { changeComposeVisibility } from 'mastodon/actions/compose_typed';
import type { StatusVisibility } from 'mastodon/api_types/statuses';
import PublicIcon from '@/tabler-icons/flare.svg?react';
import LockIcon from '@/tabler-icons/lock.svg?react';
import QuietTimeIcon from '@/tabler-icons/moon.svg?react';
import { messages as privacyMessages } from './privacy_dropdown';

const OPTIONS: {
  value: StatusVisibility;
  icon: string;
  iconComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  labelKey: keyof typeof privacyMessages;
}[] = [
  { value: 'public', icon: 'flare', iconComponent: PublicIcon, labelKey: 'public_short' },
  { value: 'unlisted', icon: 'moon', iconComponent: QuietTimeIcon, labelKey: 'unlisted_short' },
  { value: 'private', icon: 'lock2', iconComponent: LockIcon, labelKey: 'private_short' },
];

export const VisibilityDropdown: React.FC = () => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const visibility = useAppSelector(
    (state) => state.compose.get('privacy') as StatusVisibility,
  );
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = OPTIONS.find((o) => o.value === visibility) ?? OPTIONS[0]!;

  const handleSelect = useCallback(
    (value: StatusVisibility) => {
      dispatch(changeComposeVisibility(value));
      setOpen(false);
    },
    [dispatch],
  );

  return (
    <div className='visibility-mini-dropdown' ref={ref}>
      <button
        type='button'
        className='dropdown-button'
        onClick={() => {
          setOpen((v) => !v);
        }}
      >
        <Icon id={current.icon} icon={current.iconComponent} className='icon--no-fill' />
        <span className='dropdown-button__label'>
          {intl.formatMessage(privacyMessages[current.labelKey])}
        </span>
      </button>
      {open && (
        <div className='visibility-mini-dropdown__menu'>
          {OPTIONS.map((o) => (
            <div
              key={o.value}
              className={`visibility-mini-dropdown__item ${o.value === visibility ? 'visibility-mini-dropdown__item--active' : ''}`}
              onClick={() => {
                handleSelect(o.value);
              }}
            >
              <Icon id={o.icon} icon={o.iconComponent} className='icon--no-fill' />
              <span>{intl.formatMessage(privacyMessages[o.labelKey])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
