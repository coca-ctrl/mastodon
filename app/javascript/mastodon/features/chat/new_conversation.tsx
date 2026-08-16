import { useState, useCallback, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { searchAccounts, createConversation } from './api';
import type { SearchAccount } from './api';

export const NewConversation: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchAccount[]>([]);
  const [selected, setSelected] = useState<SearchAccount[]>([]);
  const [groupName, setGroupName] = useState('');
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
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

  const toggleSelect = useCallback((account: SearchAccount) => {
    setSelected((prev) => {
      const exists = prev.some((a) => a.id === account.id);
      if (exists) return prev.filter((a) => a.id !== account.id);
      return [...prev, account];
    });
    setQuery('');
  }, []);

  const handleStart = useCallback(() => {
    if (selected.length === 0) return;

    setCreating(true);
    const isGroup = selected.length > 1;

    createConversation(
      selected.map((a) => a.id),
      isGroup,
      isGroup ? groupName.trim() || undefined : undefined,
    )
      .then((conversation) => {
        onClose();
        history.push(`/chat/${conversation.id}`);
      })
      .catch(() => undefined)
      .finally(() => {
        setCreating(false);
      });
  }, [selected, groupName, history, onClose]);

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

      {selected.length > 0 && (
        <div className='chat-new-conversation__selected'>
          {selected.map((a) => (
            <span key={a.id} className='chat-new-conversation__chip'>
              @{a.username}
              <button
                type='button'
                onClick={() => {
                  toggleSelect(a);
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {selected.length > 1 && (
        <input
          type='text'
          value={groupName}
          onChange={(e) => {
            setGroupName(e.target.value);
          }}
          placeholder='그룹 이름 (선택)'
          className='chat-new-conversation__group-name'
        />
      )}

      <div className='chat-new-conversation__results'>
        {searching && <div>검색 중...</div>}

        {!searching &&
          results.map((account) => {
            const isSelected = selected.some((a) => a.id === account.id);
            return (
              <div
                key={account.id}
                className='chat-new-conversation__result'
                onClick={() => {
                  toggleSelect(account);
                }}
              >
                <input type='checkbox' checked={isSelected} readOnly />
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
            );
          })}

        {!searching && query.trim() && results.length === 0 && (
          <div>검색 결과가 없습니다.</div>
        )}
      </div>

      {selected.length > 0 && (
        <button
          type='button'
          className='chat-new-conversation__start'
          onClick={handleStart}
          disabled={creating}
        >
          {creating
            ? '생성 중...'
            : selected.length > 1
              ? `그룹 채팅 시작 (${selected.length}명)`
              : '대화 시작'}
        </button>
      )}
    </div>
  );
};