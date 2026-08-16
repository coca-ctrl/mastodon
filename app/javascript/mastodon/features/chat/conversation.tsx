import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Column } from 'mastodon/components/column';
import { Icon } from 'mastodon/components/icon';
import { me } from 'mastodon/initial_state';
import ArrowBackIcon from '@/material-icons/400-24px/arrow_back.svg?react';
import ImageIcon from '@/material-icons/400-24px/add_photo_alternate.svg?react';
import {
  fetchConversation,
  fetchMessages,
  sendMessage,
  sendMessageWithMedia,
  uploadChatMedia,
  editMessage,
  deleteMessage,
  markConversationRead,
} from './api';
import type { ChatConversation, ChatMessage } from './api';
import CloseIcon from '@/material-icons/400-24px/close.svg?react';
import EmojiPickerDropdown from 'mastodon/features/compose/containers/emoji_picker_dropdown_container';

const ChatConversationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const conversationId = Number(id);

  const [conversation, setConversation] = useState<ChatConversation | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const load = useCallback(() => {
    if (!conversationId) return;

    fetchConversation(conversationId)
      .then((data) => {
        setConversation(data);
      })
      .catch(() => undefined);

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

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setPendingFile(file);
      setPendingPreview(URL.createObjectURL(file));
      e.target.value = '';
    },
    [],
  );

  const handlePickEmoji = useCallback((emoji: { native: string }) => {
    setContent((prev) => prev + emoji.native);
  }, []);

  const handleRemovePending = useCallback(() => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
  }, [pendingPreview]);

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed && !pendingFile) return;

    if (editingId) {
      editMessage(editingId, trimmed)
        .then((updated) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m)),
          );
          setEditingId(null);
          setContent('');
          if (textareaRef.current) textareaRef.current.style.height = 'auto';
        })
        .catch(() => undefined);
      return;
    }

    if (pendingFile) {
      setUploading(true);
      uploadChatMedia(pendingFile)
        .then((media) =>
          sendMessageWithMedia(conversationId, trimmed, media.id),
        )
        .then((message) => {
          setMessages((prev) => [...prev, message]);
          setContent('');
          if (textareaRef.current) textareaRef.current.style.height = 'auto';
          handleRemovePending();
        })
        .catch(() => undefined)
        .finally(() => {
          setUploading(false);
        });
      return;
    }

    sendMessage(conversationId, trimmed)
      .then((message) => {
        setMessages((prev) => [...prev, message]);
        setContent('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      })
      .catch(() => undefined);
  }, [content, conversationId, editingId, pendingFile, handleRemovePending]);

  const handleDelete = useCallback((messageId: number) => {
    deleteMessage(messageId)
      .then(() => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, deleted: true, content: null, media_url: null }
              : m,
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

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        const el = textareaRef.current;
        if (el) {
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
        }
    },
    [],
  );

  const other = conversation?.participants.find(
    (p) => String(p.id) !== me,
  );
  const headerTitle = conversation?.group
    ? (conversation.name ?? '그룹 채팅')
    : `@${other?.username ?? ''}`;

  return (
    <Column bindToDocument label='대화'>
      <div className='chat-conversation'>
        <div className='chat-conversation__header'>
          <Link to='/chat' className='chat-conversation__back'>
            <Icon id='arrow-left' icon={ArrowBackIcon} />
          </Link>

          {!conversation?.group && other?.avatar && (
            <img
              src={other.avatar}
              alt=''
              className='chat-conversation__header-avatar'
            />
          )}
          <span className='chat-conversation__header-title'>
            {headerTitle}
          </span>
        </div>

        <div className='chat-conversation__messages'>
          {messages.map((message) => {
            const isOwn = message.sender_account_id === me;

            return (
              <div
                key={message.id}
                className={`chat-message ${isOwn ? 'chat-message--own' : ''}`}
              >
                <div
                  className={`chat-message__bubble ${message.deleted ? 'chat-message__bubble--deleted' : ''}`}
                >
                  {message.deleted ? (
                    <em>삭제된 메시지입니다</em>
                  ) : (
                    <>
                      {message.media_url && (
                        <img
                          src={message.media_url}
                          alt=''
                          className='chat-message__image'
                        />
                      )}
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

                <span className='chat-message__time'>
                  {new Date(message.created_at).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>

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

          {pendingPreview && (
            <div className='chat-conversation__pending-image'>
              <img src={pendingPreview} alt='' />
              <button type='button' onClick={handleRemovePending}>
                <Icon id='close' icon={CloseIcon} />
                제거
              </button>
            </div>
          )}

          <div className='chat-conversation__input-row'>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/*'
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <button
              type='button'
              className='chat-conversation__attach-button'
              onClick={() => fileInputRef.current?.click()}
              disabled={!!editingId}
            >
              <Icon id='image' icon={ImageIcon} />
            </button>

            <EmojiPickerDropdown onPickEmoji={handlePickEmoji} />

            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder='메시지 입력...'
              rows={1}
            />
            <button
              type='button'
              onClick={handleSend}
              disabled={uploading}
            >
              {uploading ? '업로드 중...' : editingId ? '수정 완료' : '전송'}
            </button>
          </div>
        </div>
      </div>
    </Column>
  );
};

// eslint-disable-next-line import/no-default-export
export default ChatConversationPage;