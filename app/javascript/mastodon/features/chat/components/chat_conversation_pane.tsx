import { Fragment, useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from 'mastodon/components/icon';
import { me } from 'mastodon/initial_state';
import ArrowBackIcon from '@/tabler-icons/arrow-left.svg?react';
import AddPhotoIcon from '@/tabler-icons/photo-plus.svg?react';
import CloseIcon from '@/tabler-icons/photo-x.svg?react';
import SendIcon from '@/tabler-icons/message-forward.svg?react';
import EditDoneIcon from '@/tabler-icons/message-cog.svg?react';
import ArrowDownwardIcon from '@/tabler-icons/arrow-down.svg?react';
import DotsIcon from '@/tabler-icons/dots.svg?react';
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
import { leaveConversation } from '../api';
import { updateConversationName } from '../api';
import { GroupAvatar } from './group_avatar';
import type { ChatConversation, ChatMessage, ParticipantReadState } from '../api';
import { useChatSocket } from '../use_chat_socket';
import { getDraft, setDraft, clearDraft } from '../draft_store';
import { playChatNotificationSound } from '../play_notification_sound';

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const lastSeenCountRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isInitialLoadRef = useRef(true);

  const load = useCallback(() => {
    if (!conversationId) return;

    // 대화방 전환 시 이전 상태 완전 초기화
    isInitialLoadRef.current = true;
    lastSeenCountRef.current = 0;
    setMessages([]);
    setNewMessageCount(0);
    setHasMore(true);
    setContent(getDraft(conversationId));

    const requestedId = conversationId;

    fetchConversation(requestedId)
      .then((data) => {
        if (requestedId !== conversationId) return;
        setConversation(data);
      })
      .catch(() => undefined);

    fetchMessages(requestedId)
      .then((data) => {
        if (requestedId !== conversationId) return;
        setMessages(data);
        setHasMore(data.length >= 50);
        return markConversationRead(requestedId);
      })
      .catch(() => {
        if (requestedId === conversationId) setMessages([]);
      });
  }, [conversationId]);

  useChatSocket(conversationId, (event: string, payload: unknown) => {
    if (event === 'chat.message' || event === 'chat.message.update') {
      const message = payload as ChatMessage;
      setMessages((prev) => {
        if (event === 'chat.message') {
          return prev.some((m) => m.id === message.id)
            ? prev
            : [...prev, message];
        }
        return prev.map((m) => (m.id === message.id ? message : m));
      });

      if (
        event === 'chat.message' &&
        message.sender_account_id !== me &&
        conversationId
      ) {
        playChatNotificationSound();
        if (document.hasFocus()) {
          markConversationRead(conversationId).catch(() => undefined);
        }
      }
    } else if (event === 'chat.read') {
      const readState = payload as { account_id: string; last_read_at: string };
      setConversation((prev) => {
        if (!prev) return prev;
        const updated = prev.participant_read_states.map((s) =>
          s.account_id === readState.account_id
            ? { ...s, last_read_at: readState.last_read_at }
            : s,
        );
        return { ...prev, participant_read_states: updated };
      });
    }
  });

  useEffect(() => {
    const handleFocus = () => {
      if (conversationId) {
        markConversationRead(conversationId).catch(() => undefined);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (messages.length === 0) return;

    if (isInitialLoadRef.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ block: 'end' });
        isInitialLoadRef.current = false;
      });
      lastSeenCountRef.current = messages.length;
      setNewMessageCount(0);
      return;
    }

    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    const wasNearBottom = distanceFromBottom < 200;

    if (wasNearBottom) {
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
      const value = e.target.value;
      setContent(value);
      if (conversationId) setDraft(conversationId, value);
      const el = textareaRef.current;
      if (el) {
        el.style.height = 'auto';
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
      }
    },
    [conversationId],
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
          if (conversationId) clearDraft(conversationId);
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
          setMessages((prev) =>
            prev.some((m) => m.id === message.id) ? prev : [...prev, message],
          );
          setContent('');
          if (conversationId) clearDraft(conversationId);
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
        setMessages((prev) =>
          prev.some((m) => m.id === message.id) ? prev : [...prev, message],
        );
        setContent('');
        if (conversationId) clearDraft(conversationId);
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

  const handleLoadMore = useCallback(() => {
  if (!conversationId || loadingMore || !hasMore || messages.length === 0) return;

  const el = messagesContainerRef.current;
  const prevScrollHeight = el?.scrollHeight ?? 0;

  setLoadingMore(true);
  const oldestId = messages[0]?.id;

  fetchMessages(conversationId, oldestId)
  .then((older) => {
    if (older.length === 0) {
      setHasMore(false);
      return;
    }
    setMessages((prev) => [...older, ...prev]);
    lastSeenCountRef.current += older.length;

    requestAnimationFrame(() => {
      if (el) {
        const newScrollHeight = el.scrollHeight;
        el.scrollTop = newScrollHeight - prevScrollHeight;
      }
    });
  })
    .catch(() => undefined)
    .finally(() => {
      setLoadingMore(false);
    });
}, [conversationId, loadingMore, hasMore, messages]);

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

  if (el.scrollTop < 100 && !isInitialLoadRef.current) {
    handleLoadMore();
  }
}, [messages.length, handleLoadMore]);

  const formatDateDivider = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    if (isSameDay(date, today)) return '오늘';
    if (isSameDay(date, yesterday)) return '어제';

    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const other = conversation?.participants.find((p) => String(p.id) !== me);
  const headerTitle = conversation?.group
    ? (conversation.name ?? '그룹 채팅')
    : (other?.display_name ?? '');

  return (
    <div className='chat-conversation'>
      <div className='chat-conversation__header'>
        {showBack && (
            <Link to='/chat' className='chat-conversation__back'>
            <Icon id='arrow-left' icon={ArrowBackIcon} className='icon--no-fill' />
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
        <div className='chat-conversation__menu' ref={menuRef}>
          <button
            type='button'
            className='chat-conversation__menu-trigger'
            onClick={() => {
              setShowMenu((prev) => !prev);
            }}
            aria-label='더보기'
          >
            <Icon id='dots' icon={DotsIcon} className='icon--no-fill' />
          </button>

          {showMenu && (
            <div className='chat-conversation__menu-dropdown'>
              <div className='chat-conversation__menu-participants'>
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
              <button
                type='button'
                className='chat-conversation__menu-dropdown-danger'
                onClick={() => {
                  setShowMenu(false);
                  handleLeave();
                }}
              >
                나가기
              </button>
            </div>
          )}
        </div>
      )}
    </div>

      <div
        className='chat-conversation__messages'
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {loadingMore && (
          <div className='chat-conversation__loading-more'>불러오는 중...</div>
        )}
        {messages.map((message, index) => {
          const prevMessage = messages[index - 1];
          const showDateDivider =
            !prevMessage ||
            new Date(message.created_at).toDateString() !==
              new Date(prevMessage.created_at).toDateString();

          const dateDivider = showDateDivider && (
            <div key={`date-${message.id}`} className='chat-date-divider'>
              <span>{formatDateDivider(message.created_at)}</span>
            </div>
          );

          const countUnread = (
            message: ChatMessage,
            states: ParticipantReadState[],
          ): number => {
            const messageTime = new Date(message.created_at).getTime();

            return states.filter((state) => {
              if (state.account_id === message.sender_account_id) return false;
              if (!state.last_read_at) return true;
              return new Date(state.last_read_at).getTime() < messageTime;
            }).length;
          };

          if (message.message_type === 'system') {
            return (
              <Fragment key={message.id}>
                {dateDivider}
                <div className='chat-message__system'>
                  {message.content}
                </div>
              </Fragment>
            );
          }

            const isOwn = message.sender_account_id === me;

            return (
              <Fragment key={message.id}>
                {dateDivider}
                <div
                  className={`chat-message ${isOwn ? 'chat-message--own' : ''}`}
                >
                  {conversation?.group && !isOwn && !message.deleted && (
                    <span className='chat-message__sender'>
                      {message.sender_avatar && <img src={message.sender_avatar} alt='' />}
                      {message.sender_display_name}
                    </span>
                  )}
                <div className='chat-message__row'>
                  {isOwn &&
                    !message.deleted &&
                    conversation &&
                    (() => {
                      const unread = countUnread(
                        message,
                        conversation.participant_read_states,
                      );
                      return unread > 0 ? (
                        <span className='chat-message__unread-count'>{unread}</span>
                      ) : null;
                    })()}
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
              
              {!isOwn &&
                !message.deleted &&
                conversation &&
                (() => {
                  const unread = countUnread(
                    message,
                    conversation.participant_read_states,
                  );
                  return unread > 0 ? (
                    <span className='chat-message__unread-count'>{unread}</span>
                  ) : null;
                })()}
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
            </Fragment>
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
            <Icon id='arrow-down' icon={ArrowDownwardIcon} className='icon--no-fill' />
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
            <button type='button' onClick={handleRemovePending} aria-label='이미지 제거'>
              <Icon id='close' icon={CloseIcon} className='icon--no-fill' />
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
            <Icon id='image' icon={AddPhotoIcon} className='icon--no-fill' />
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
            className='chat-conversation__send-button'
            onClick={handleSend}
            disabled={uploading}
            aria-label={editingId ? '수정 완료' : '전송'}
          >
            {uploading ? (
              '...'
            ) : (
              <Icon id='send' icon={editingId ? EditDoneIcon : SendIcon} className='icon--no-fill' />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};