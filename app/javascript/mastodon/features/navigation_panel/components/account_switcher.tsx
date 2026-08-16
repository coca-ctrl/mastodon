import { useState, useCallback, useEffect, useRef } from 'react';
import { defineMessages, useIntl } from 'react-intl';

import ExpandMoreIcon from '@/material-icons/400-24px/expand_more.svg?react';
import AddIcon from '@/material-icons/400-24px/add.svg?react';
import CloseIcon from '@/material-icons/400-24px/close.svg?react';
import CheckIcon from '@/material-icons/400-24px/check.svg?react';
import { Icon } from 'mastodon/components/icon';

interface SwitchAccount {
  session_id: string;
  user_id: number;
  username: string;
  avatar: string;
}

interface CurrentAccount {
  acct?: string;
  avatar?: string;
}

const messages = defineMessages({
  switchAccount: {
    id: 'navigation_bar.switch_account',
    defaultMessage: '계정 전환',
  },
  addAccount: {
    id: 'navigation_bar.add_account',
    defaultMessage: '계정 추가',
  },
  removeFromList: {
    id: 'navigation_bar.remove_from_list',
    defaultMessage: '목록에서 제거',
  },
});

// CSRF 토큰은 세션이 유지되는 동안 재사용해도 되므로 모듈 스코프에 캐시
let cachedToken: string | null = null;

async function getCsrfToken() {
  if (cachedToken) return cachedToken;
  const res = await fetch('/accounts/switch/token');
  const data = (await res.json()) as { token: string };
  cachedToken = data.token;
  return cachedToken;
}

export const AccountSwitcher: React.FC<{ currentAccount?: CurrentAccount }> = ({
  currentAccount,
}) => {
  const intl = useIntl();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<SwitchAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const loadAccounts = useCallback(() => {
    setLoading(true);
    fetch('/accounts/switch')
      .then((res) => res.json())
      .then((data: { accounts: SwitchAccount[] }) => {
        setAccounts(data.accounts);
      })
      .catch(() => {
        setAccounts([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleToggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next) loadAccounts();
      return next;
    });
  }, [loadAccounts]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSwitch = useCallback(
    async (sessionId: string) => {
      const token = await getCsrfToken();
      const res = await fetch(`/accounts/switch/${sessionId}`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': token, Accept: 'application/json' },
      });

      const data = (await res.json()) as {
        success?: boolean;
        redirect_to?: string;
        error?: string;
      };

      if (data.success) {
        window.location.href = data.redirect_to ?? '/home';
      } else {
        // 만료된 세션 등 실패 시 목록만 갱신
        loadAccounts();
      }
    },
    [loadAccounts],
  );

  const handleRemove = useCallback(
    async (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      const token = await getCsrfToken();
      await fetch(`/accounts/switch/${sessionId}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': token, Accept: 'application/json' },
      });
      setAccounts((prev) => prev.filter((a) => a.session_id !== sessionId));
    },
    [],
  );

  const handleAddAccount = useCallback(async () => {
    const token = await getCsrfToken();
    const res = await fetch('/auth/prepare_account_add', {
        method: 'POST',
        headers: { 'X-CSRF-Token': token, Accept: 'application/json' },
    });
    const data = (await res.json()) as { redirect_to: string };
    window.location.href = data.redirect_to;
  }, []);

  return (
    <div className='navigation-panel__account-switcher' ref={containerRef}>
      <button
        type='button'
        className='account-switcher__trigger'
        onClick={handleToggle}
        aria-expanded={open}
        >
        {currentAccount?.avatar && (
            <img
            src={currentAccount.avatar}
            alt=''
            className='account-switcher__trigger-avatar'
            />
        )}
        <div className='account-switcher__trigger-meta'>
            <span className='account-switcher__trigger-name'>
            {currentAccount?.acct}
            </span>
            <span className='account-switcher__trigger-handle'>
            @{currentAccount?.acct}
            </span>
        </div>
        <Icon
            id='chevron-down'
            icon={ExpandMoreIcon}
            className='account-switcher__trigger-chevron'
        />
        </button>

      {open && (
        <div className='account-switcher__dropdown'>
            <div className='account-switcher__list'>
            {currentAccount && (
                <div className='account-switcher__item account-switcher__item--current'>
                {currentAccount.avatar && (
                    <img
                    src={currentAccount.avatar}
                    alt=''
                    className='account-switcher__avatar'
                    />
                )}
                <div className='account-switcher__meta'>
                    <span className='account-switcher__display-name'>
                    {currentAccount.acct}
                    </span>
                    <span className='account-switcher__handle'>
                    @{currentAccount.acct}
                    </span>
                </div>
                <Icon
                    id='check'
                    icon={CheckIcon}
                    className='account-switcher__check'
                />
                </div>
            )}

            {!loading &&
                accounts.map((account) => (
                <div
                    key={account.session_id}
                    className='account-switcher__item'
                    onClick={() => handleSwitch(account.session_id)}
                >
                    <img
                    src={account.avatar}
                    alt=''
                    className='account-switcher__avatar'
                    />
                    <div className='account-switcher__meta'>
                    <span className='account-switcher__display-name'>
                        {account.username}
                    </span>
                    <span className='account-switcher__handle'>
                        @{account.username}
                    </span>
                    </div>
                    <button
                    type='button'
                    className='account-switcher__remove'
                    onClick={(e) => handleRemove(e, account.session_id)}
                    aria-label={intl.formatMessage(messages.removeFromList)}
                    >
                    <Icon id='close' icon={CloseIcon} />
                    </button>
                </div>
                ))}
            </div>

            <div className='account-switcher__footer'>
            <div
                className='account-switcher__footer-item'
                onClick={handleAddAccount}
            >
                <Icon id='plus' icon={AddIcon} />
                <span>{intl.formatMessage(messages.addAccount)}</span>
            </div>
            </div>
        </div>
        )}
    </div>
  );
};