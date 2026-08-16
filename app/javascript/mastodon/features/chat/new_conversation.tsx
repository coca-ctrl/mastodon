import { useState, useCallback, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { searchAccounts, createConversation } from './api';
import type { SearchAccount } from './api';

export const NewConversation: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchAccount[]>([]);
  const [searching, setSearching] = useState(false);
  const history = useHistory();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      setSearching(true);
      searchAccounts(value)
        .then((accounts) => {
          setResults(accounts);
        })
        .catch(() => {
          setResults([]);
        })
        .finally(() => {
          setSearching(false);
        });
    }, 300);
  }, []);

  const handleSelect = useCallback(
    (account: SearchAccount) => {
      createConversation([account.id])
        .then((conversation) => {
          onClose();
          history.push(`/chat/${conversation.id}`);
        })
        .catch(() => undefined);
    },
    [history, onClose],
  );

  return (
    <div className='chat-new-conversation'>
      <div className='chat-new-conversation__header'>
        <input
          type='text'
          value={query}
          onChange={handleChange}
          placeholder='사용자 검색 (아이디)'
          autoFocus
        />
        <button type='button' onClick={onClose}>
          취소
        </button>
      </div>

      <div className='chat-new-conversation__results'>
        {searching && <div>검색 중...</div>}

        {!searching &&
          results.map((account) => (
            <div
              key={account.id}
              className='chat-new-conversation__result'
              onClick={() => {
                handleSelect(account);
              }}
            >
              <img src={account.avatar} alt='' />
              <div>
                <div className='chat-new-conversation__name'>
                  {account.display_name || account.username}
                </div>
                <div className='chat-new-conversation__handle'>
                  @{account.username}
                </div>
              </div>
            </div>
          ))}

        {!searching && query.trim() && results.length === 0 && (
          <div>검색 결과가 없습니다.</div>
        )}
      </div>
    </div>
  );
};