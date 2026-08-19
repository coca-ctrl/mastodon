import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { fetchConversations } from '../api';
import { NewConversation } from '../new_conversation';
import type { ChatConversation } from '../api';
import { GroupAvatar } from './group_avatar';
import { me } from 'mastodon/initial_state';

const formatRelativeTime = (dateString: string): string => {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일`;

  const diffWeek = Math.floor(diffDay / 7);
  return `${diffWeek}주`;
};

export const ChatListPane: React.FC<{ activeId?: number }> = ({
  activeId,
}) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback((isBackground = false) => {
    if (!isBackground) setLoading(true);
    fetchConversations()
      .then((data) => {
        setConversations(data);
      })
      .catch(() => {
        if (!isBackground) setConversations([]);
      })
      .finally(() => {
        if (!isBackground) setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      load(true);
    }, 5000);
    return () => {
      clearInterval(interval);
    };
  }, [load]);

  return (
    <div className='chat-list'>
      <div className='chat-list__header'>
        <button
          type='button'
          onClick={() => {
            setShowNew(true);
          }}
        >
          + 새 채팅
        </button>
      </div>

      {showNew && (
        <NewConversation
          onClose={() => {
            setShowNew(false);
          }}
        />
      )}

      {loading && <div className='chat-list__loading'>불러오는 중...</div>}

      {!loading && conversations.length === 0 && (
        <div className='chat-list__empty'>대화가 없습니다.</div>
      )}

      {!loading &&
        conversations.map((conversation) => {
          const other = conversation.participants.find((p) => p.account_id !== me);
          const title = conversation.group
            ? (conversation.name ?? '그룹 채팅')
            : (other?.display_name ?? '알 수 없음');

          return (
            <Link
              key={conversation.id}
              to={`/chat/${conversation.id}`}
              className={classNames('chat-list__item', {
                'chat-list__item--active': conversation.id === activeId,
              })}
            >
              {conversation.group ? (
                <GroupAvatar participants={conversation.participants} size='list' />
                ) : (
                other?.avatar && (
                    <img src={other.avatar} alt='' className='chat-list__avatar' />
                )
              )}
              <div className='chat-list__meta'>
                <span className='chat-list__title'>{title}</span>
                <span className='chat-list__preview'>
                  {(() => {
                    const last = conversation.last_message;
                    if (!last) return '';
                    if (last.deleted) return '(삭제된 메시지)';
                    if (last.media_url && last.content)
                      return `(이미지) ${last.content}`;
                    if (last.media_url) return '(이미지)';
                    return last.content ?? '';
                  })()}
                </span>
              </div>
              <div className='chat-list__side'>
                {conversation.last_message && (
                <span className='chat-list__time'>
                    {formatRelativeTime(conversation.last_message.created_at)}
                </span>
                )}
                {conversation.unread_count > 0 && (
                <span className='chat-list__unread'>{conversation.unread_count}</span>
                )}
            </div>
            </Link>
          );
        })}
    </div>
  );
};