import { useCallback, useEffect, useRef, useState } from 'react';

import classNames from 'classnames';

import { Column } from 'mastodon/components/column';

import { fetchAdminConversations, fetchAdminMessages } from './api';
import type { AdminConversation, AdminMessage } from './api';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const participantName = (p: AdminConversation['participants'][number]) =>
  p.display_name ?? p.username ?? '알 수 없음';

const conversationTitle = (conversation: AdminConversation) =>
  conversation.group
    ? (conversation.name ?? '그룹 채팅')
    : conversation.participants.map(participantName).join(' ↔ ');

const previewText = (message: AdminMessage | null) => {
  if (!message) {
    return '';
  }
  if (message.message_type === 'system') {
    return message.content ?? '';
  }
  const text = message.content ?? (message.media_url ? '[이미지]' : '');
  return `${message.sender_display_name ?? ''}: ${text}`;
};

const ConversationList: React.FC<{
  onSelect: (conversation: AdminConversation) => void;
}> = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<AdminConversation[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback((q: string, nextPage: number) => {
    requestId.current += 1;
    const id = requestId.current;
    setLoading(true);
    setError(null);

    fetchAdminConversations(q, nextPage)
      .then((data) => {
        if (id !== requestId.current) {
          return;
        }
        setItems((prev) =>
          nextPage === 1 ? data.conversations : [...prev, ...data.conversations],
        );
        setHasMore(data.has_more);
        setPage(nextPage);
        setLoading(false);
      })
      .catch(() => {
        if (id !== requestId.current) {
          return;
        }
        setError('목록을 불러오지 못했습니다. 관리자 권한이 필요합니다.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      load(query.trim(), 1);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [query, load]);

  return (
    <div className='chat-admin'>
      <input
        className='chat-admin__search'
        type='search'
        placeholder='참여자 이름 또는 그룹 이름으로 검색'
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
        }}
      />

      {error && <div className='chat-admin__error'>{error}</div>}

      <div className='chat-admin__list'>
        {items.map((conversation) => (
          <button
            type='button'
            key={conversation.id}
            className='chat-admin__item'
            onClick={() => {
              onSelect(conversation);
            }}
          >
            <span className='chat-admin__item-title'>
              {conversationTitle(conversation)}
            </span>
            <span className='chat-admin__item-meta'>
              {conversation.group ? '그룹' : '1:1'} · 메시지{' '}
              {conversation.message_count}개 ·{' '}
              {formatTime(conversation.updated_at)}
            </span>
            {conversation.last_message && (
              <span className='chat-admin__item-preview'>
                {previewText(conversation.last_message)}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && <div className='chat-admin__empty'>불러오는 중…</div>}
      {!loading && !error && items.length === 0 && (
        <div className='chat-admin__empty'>대화방이 없습니다.</div>
      )}
      {hasMore && !loading && (
        <button
          type='button'
          className='chat-admin__more'
          onClick={() => {
            load(query.trim(), page + 1);
          }}
        >
          더 보기
        </button>
      )}
    </div>
  );
};

const MessageView: React.FC<{
  conversation: AdminConversation;
  onBack: () => void;
}> = ({ conversation, onBack }) => {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAdminMessages(conversation.id)
      .then((data) => {
        if (cancelled) {
          return;
        }
        setMessages(data.messages);
        setHasMore(data.has_more);
        setLoading(false);
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ block: 'end' });
        }, 0);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setError('메시지를 불러오지 못했습니다.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [conversation.id]);

  const loadOlder = useCallback(() => {
    const oldest = messages[0];
    if (!oldest) {
      return;
    }
    setLoading(true);

    fetchAdminMessages(conversation.id, oldest.id)
      .then((data) => {
        setMessages((prev) => [...data.messages, ...prev]);
        setHasMore(data.has_more);
        setLoading(false);
      })
      .catch(() => {
        setError('이전 메시지를 불러오지 못했습니다.');
        setLoading(false);
      });
  }, [conversation.id, messages]);

  return (
    <div className='chat-admin'>
      <div className='chat-admin__header'>
        <button type='button' className='chat-admin__back' onClick={onBack}>
          ← 목록
        </button>
        <div className='chat-admin__header-info'>
          <span className='chat-admin__item-title'>
            {conversationTitle(conversation)}
          </span>
          <span className='chat-admin__item-meta'>
            {conversation.participants
              .map((p) => `${participantName(p)}${p.left ? '(나감)' : ''}`)
              .join(', ')}
          </span>
        </div>
      </div>

      {error && <div className='chat-admin__error'>{error}</div>}

      {hasMore && !loading && (
        <button type='button' className='chat-admin__more' onClick={loadOlder}>
          이전 메시지 더 보기
        </button>
      )}
      {loading && <div className='chat-admin__empty'>불러오는 중…</div>}

      <div className='chat-admin__messages'>
        {messages.map((message) =>
          message.message_type === 'system' ? (
            <div
              key={message.id}
              className='chat-admin__message chat-admin__message--system'
            >
              {message.content}
            </div>
          ) : (
            <div
              key={message.id}
              className={classNames('chat-admin__message', {
                'chat-admin__message--deleted': message.deleted,
              })}
            >
              <div className='chat-admin__message-head'>
                <span className='chat-admin__sender'>
                  {message.sender_display_name ?? '알 수 없음'}
                </span>
                <span className='chat-admin__time'>
                  {formatTime(message.created_at)}
                </span>
                {message.edited && (
                  <span className='chat-admin__badge'>수정됨</span>
                )}
                {message.deleted && (
                  <span className='chat-admin__badge chat-admin__badge--deleted'>
                    삭제됨
                    {message.deleted_at
                      ? ` · ${formatTime(message.deleted_at)}`
                      : ''}
                  </span>
                )}
              </div>
              {message.content && (
                <div className='chat-admin__content'>{message.content}</div>
              )}
              {message.media_url && (
                <img
                  className='chat-admin__media'
                  src={message.media_url}
                  alt=''
                />
              )}
            </div>
          ),
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  );
};

const ChatAdmin: React.FC = () => {
  const [selected, setSelected] = useState<AdminConversation | null>(null);

  return (
    <Column bindToDocument label='채팅 열람'>
      <div style={{ display: selected ? 'none' : 'block' }}>
        <ConversationList onSelect={setSelected} />
      </div>
      {selected && (
        <MessageView
          conversation={selected}
          onBack={() => {
            setSelected(null);
          }}
        />
      )}
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default ChatAdmin;