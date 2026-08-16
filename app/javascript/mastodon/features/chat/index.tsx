import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Column } from 'mastodon/components/column';
import { fetchConversations } from './api';
import { NewConversation } from './new_conversation';
import type { ChatConversation } from './api';

const ChatList: React.FC = () => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchConversations()
      .then((data) => {
        setConversations(data);
      })
      .catch(() => {
        setConversations([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Column bindToDocument label='채팅'>
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
            const other = conversation.participants[0];
            const title = conversation.group
              ? (conversation.name ?? '그룹 채팅')
              : `@${other?.username ?? '알 수 없음'}`;

            return (
              <Link
                key={conversation.id}
                to={`/chat/${conversation.id}`}
                className='chat-list__item'
              >
                {!conversation.group && other?.avatar && (
                  <img
                    src={other.avatar}
                    alt=''
                    className='chat-list__avatar'
                  />
                )}
                <div className='chat-list__meta'>
                  <span className='chat-list__title'>{title}</span>
                  <span className='chat-list__preview'>
                    {conversation.last_message?.deleted
                      ? '(삭제된 메시지)'
                      : (conversation.last_message?.content ?? '')}
                  </span>
                </div>
                {conversation.unread_count > 0 && (
                  <span className='chat-list__unread'>
                    {conversation.unread_count}
                  </span>
                )}
              </Link>
            );
          })}
      </div>
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default ChatList;