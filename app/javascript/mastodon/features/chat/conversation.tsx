import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Column } from 'mastodon/components/column';
import { me } from 'mastodon/initial_state';
import {
  fetchMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markConversationRead,
} from './api';
import type { ChatMessage } from './api';

const ChatConversationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const conversationId = Number(id);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(() => {
    if (!conversationId) return;
    fetchMessages(conversationId)
      .then((data) => {
        setMessages(data);
        return markConversationRead(conversationId);
      })
      .catch(() => {
        setMessages([]);
      });
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;

    if (editingId) {
      editMessage(editingId, trimmed)
        .then((updated) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m)),
          );
          setEditingId(null);
          setContent('');
        })
        .catch(() => undefined);
      return;
    }

    sendMessage(conversationId, trimmed)
      .then((message) => {
        setMessages((prev) => [...prev, message]);
        setContent('');
      })
      .catch(() => undefined);
  }, [content, conversationId, editingId]);

  const handleDelete = useCallback((messageId: number) => {
    deleteMessage(messageId)
      .then(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, deleted: true, content: null } : m,
          ),
        );
      })
      .catch(() => undefined);
  }, []);

  const handleEditStart = useCallback((message: ChatMessage) => {
    setEditingId(message.id);
    setContent(message.content ?? '');
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <Column bindToDocument label='대화'>
      <div className='chat-conversation'>
        <div className='chat-conversation__messages'>
          {messages.map((message) => {
            const isOwn = message.sender_account_id === me;

            return (
              <div
                key={message.id}
                className={`chat-message ${isOwn ? 'chat-message--own' : ''}`}
              >
                <div className='chat-message__bubble'>
                  {message.deleted ? (
                    <em>삭제된 메시지입니다</em>
                  ) : (
                    <>
                      {message.content}
                      {message.edited && (
                        <span className='chat-message__edited'>
                          {' '}
                          (수정됨)
                        </span>
                      )}
                    </>
                  )}
                </div>

                {isOwn && !message.deleted && (
                  <div className='chat-message__actions'>
                    <button
                      type='button'
                      onClick={() => {
                        handleEditStart(message);
                      }}
                    >
                      수정
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        handleDelete(message.id);
                      }}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className='chat-conversation__input'>
          {editingId && (
            <div className='chat-conversation__editing-banner'>
              메시지 수정 중...{' '}
              <button
                type='button'
                onClick={() => {
                  setEditingId(null);
                  setContent('');
                }}
              >
                취소
              </button>
            </div>
          )}
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder='메시지 입력...'
          />
          <button type='button' onClick={handleSend}>
            {editingId ? '수정 완료' : '전송'}
          </button>
        </div>
      </div>
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default ChatConversationPage;