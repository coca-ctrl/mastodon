import { useState, useRef, useEffect, useCallback } from 'react';
import { useIntl, defineMessages } from 'react-intl';
import { useAppSelector, useAppDispatch } from 'mastodon/store';
import { setComposeQuotePolicy } from 'mastodon/actions/compose_typed';
import type { ApiQuotePolicy } from 'mastodon/api_types/quotes';
import type { StatusVisibility } from 'mastodon/api_types/statuses';

const messages = defineMessages({
  quotePublic: { id: 'visibility_modal.quote_public', defaultMessage: 'Anyone can quote' },
  quoteFollowers: { id: 'visibility_modal.quote_followers', defaultMessage: 'Only followers' },
  quoteNobody: { id: 'visibility_modal.quote_nobody', defaultMessage: 'No one' },
});

const OPTIONS: { value: ApiQuotePolicy; labelKey: keyof typeof messages }[] = [
  { value: 'public', labelKey: 'quotePublic' },
  { value: 'followers', labelKey: 'quoteFollowers' },
  { value: 'nobody', labelKey: 'quoteNobody' },
];

export const QuotePolicyDropdown: React.FC = () => {
  const intl = useIntl();
  const dispatch = useAppDispatch();
  const quotePolicy = useAppSelector(
    (state) => state.compose.get('quote_policy') as ApiQuotePolicy,
  );
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

  const current = OPTIONS.find((o) => o.value === quotePolicy) ?? OPTIONS[0]!;

  const handleSelect = useCallback(
    (value: ApiQuotePolicy) => {
      dispatch(setComposeQuotePolicy(value));
      setOpen(false);
    },
    [dispatch],
  );

  if (visibility === 'private' || visibility === 'direct') return null;

  return (
    <div className='visibility-mini-dropdown' ref={ref}>
      <button
        type='button'
        className='dropdown-button'
        onClick={() => {
          setOpen((v) => !v);
        }}
      >
        <span className='dropdown-button__label'>
          인용: {intl.formatMessage(messages[current.labelKey])}
        </span>
      </button>
      {open && (
        <div className='visibility-mini-dropdown__menu'>
          {OPTIONS.map((o) => (
            <div
              key={o.value}
              className={`visibility-mini-dropdown__item ${o.value === quotePolicy ? 'visibility-mini-dropdown__item--active' : ''}`}
              onClick={() => {
                handleSelect(o.value);
              }}
            >
              <span>{intl.formatMessage(messages[o.labelKey])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
