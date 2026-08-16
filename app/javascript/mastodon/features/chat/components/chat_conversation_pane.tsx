import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from 'mastodon/components/icon';
import { me } from 'mastodon/initial_state';
import ArrowBackIcon from '@/material-icons/400-24px/arrow_back.svg?react';
import AddPhotoIcon from '@/material-icons/400-24px/add_photo_alternate.svg?react';
import CloseIcon from '@/material-icons/400-24px/close.svg?react';
import EmojiPickerDropdown from 'mastodon/features/compose/containers/emoji_picker_dropdown_container';
import {
  fetchConversation,
  fetchMessages,
  sendMessage,
  sendMessageWithMedia,
  uploadChatMedia,
  editMessage,
  deleteMessage,
  markConversationRead,
} from '../api';
import type { ChatConversation, ChatMessage } from '../api';
import { leaveConversation } from '../api';
import { updateConversationName } from '../api';
import { GroupAvatar } from './group_avatar';
import ArrowDownwardIcon from '@/material-icons/400-24px/arrow_downward.svg?react';

export const ChatConversationPane: React.FC<{
  conversationId: number;
  showBack: boolean;
}> = ({ conversationId, showBack }) => {
  const [conversation, setConversation] = useState<ChatConversation | null>(
    null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const lastSeenCountRef = useRef(0);
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
    const el = messagesContainerRef.current;
    if (!el) return;

    const distanceFromBottom =
    el.scrollHeight - el.scrollTop - el.clientHeight;
    const wasNearBottom = distanceFromBottom < 200;

    if (wasNearBottom || lastSeenCountRef.current === 0) {
    bottomRef.current?.scrollIntoView({ block: 'end' });
    lastSeenCountRef.current = messages.length;
    setNewMessageCount(0);
    } else {
    setNewMessageCount(messages.length - lastSeenCountRef.current);
    }
  }, [messages]);

  const handleScrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    lastSeenCountRef.current = messages.length;
    setNewMessageCount(0);
    setShowScrollButton(false);
  }, [messages.length]);

  const resetTextareaHeight = useCallback(() => {
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, []);

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

  const handlePickEmoji = useCallback((emoji: { native: string }) => {
    setContent((prev) => prev + emoji.native);
  }, []);

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
          resetTextareaHeight();
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
          resetTextareaHeight();
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
        resetTextareaHeight();
      })
      .catch(() => undefined);
  }, [
    content,
    conversationId,
    editingId,
    pendingFile,
    handleRemovePending,
    resetTextareaHeight,
  ]);

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

  const handleLeave = useCallback(() => {
    if (!window.confirm('대화방을 나가시겠습니까?')) return;
    leaveConversation(conversationId)
        .then(() => {
        window.location.href = '/chat';
        })
        .catch(() => undefined);
  }, [conversationId]);

  const handleNameSave = useCallback(() => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === conversation?.name) {
        setEditingName(false);
        return;
    }
    updateConversationName(conversationId, trimmed)
        .then((updated) => {
        setConversation(updated);
        })
        .catch(() => undefined)
        .finally(() => {
        setEditingName(false);
        });
  }, [nameInput, conversation, conversationId]);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 200;

    setShowScrollButton(!nearBottom);

    if (nearBottom) {
        lastSeenCountRef.current = messages.length;
        setNewMessageCount(0);
    }
  }, [messages.length]);

  const other = conversation?.participants.find((p) => String(p.id) !== me);
  const headerTitle = conversation?.group
    ? (conversation.name ?? '그룹 채팅')
    : (other?.display_name ?? '');

  return (
    <div className='chat-conversation'>
      <div className='chat-conversation__header'>
        {showBack && (
            <Link to='/chat' className='chat-conversation__back'>
            <Icon id='arrow-left' icon={ArrowBackIcon} />
            </Link>
        )}

        {conversation?.group ? (
            <GroupAvatar participants={conversation.participants} size='header' />
        ) : (
        other?.avatar && (
            <img
                src={other.avatar}
                alt=''
                className='chat-conversation__header-avatar'
                />
            )
        )}

        {editingName ? (
            <input
                type='text'
                value={nameInput}
                autoFocus
                onChange={(e) => {
                    setNameInput(e.target.value);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave();
                    if (e.key === 'Escape') setEditingName(false);
                }}
                onBlur={handleNameSave}
                className='chat-conversation__header-name-input'
            />
        ) : (
            <span
            className='chat-conversation__header-title'
            onClick={() => {
                if (conversation?.group && String(conversation.owner_id) === me) {
                setNameInput(conversation.name ?? '');
                setEditingName(true);
                }
            }}
            >
            {headerTitle}
            {conversation?.group && ` (${conversation.participants.length}명)`}
            </span>
        )}

        {conversation?.group && (
            <button
            type='button'
            className='chat-conversation__members-button'
            onClick={() => {
                setShowParticipants((prev) => !prev);
            }}
            >
            참여자
            </button>
        )}

        {conversation?.group && (
            <button
            type='button'
            className='chat-conversation__leave'
            onClick={handleLeave}
            >
            나가기
            </button>
        )}
        </div>

        {showParticipants && conversation?.group && (
        <div className='chat-conversation__participants'>
            {conversation.participants.map((p) => (
            <div key={p.id} className='chat-conversation__participant'>
                <img src={p.avatar} alt='' />
                <span>{p.display_name}</span>
                {String(p.id) === String(conversation.owner_id) && (
                <span className='chat-conversation__owner-badge'>방장</span>
                )}
            </div>
            ))}
        </div>
        )}

      <div
        className='chat-conversation__messages'
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {messages.map((message) => {
            if (message.message_type === 'system') {
                return (
                <div key={message.id} className='chat-message__system'>
                    {message.content}
                </div>
                );
            }

            const isOwn = message.sender_account_id === me;

            return (
                <div
                key={message.id}
                className={`chat-message ${isOwn ? 'chat-message--own' : ''}`}
                >
                {conversation?.group && !isOwn && !message.deleted && (
                    <span className='chat-message__sender'>
                    {message.sender_avatar && <img src={message.sender_avatar} alt='' />}
                    {message.sender_display_name}
                    </span>
                )}
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
                      <span className='chat-message__edited'> (수정됨)</span>
                    )}
                    <span className='chat-message__time'>
                        {new Date(message.created_at).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        })}
                    </span>
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

      {showScrollButton && (
        <button
            type='button'
            className='chat-conversation__scroll-bottom'
            onClick={handleScrollToBottom}
        >
            <Icon id='arrow-down' icon={ArrowDownwardIcon} />
            {newMessageCount > 0 && (
            <span className='chat-conversation__scroll-bottom-badge'>
                {newMessageCount}
            </span>
            )}
        </button>
      )}

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
            <Icon id='image' icon={AddPhotoIcon} />
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
          <button type='button' onClick={handleSend} disabled={uploading}>
            {uploading ? '업로드 중...' : editingId ? '수정 완료' : '전송'}
          </button>
        </div>
      </div>
    </div>
  );
};