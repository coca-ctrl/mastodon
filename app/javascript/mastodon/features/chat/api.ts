import {
  apiRequestGet,
  apiRequestPost,
  apiRequestPut,
  apiRequestDelete,
} from 'mastodon/api';

export interface ChatUser {
  id: number;
  username: string;
  display_name: string;
  avatar: string;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  message_type: 'user' | 'system';
  sender_id: number | null;
  sender_account_id: string | null;
  sender_username: string | null;
  sender_avatar: string | null;
  content: string | null;
  media_url: string | null;
  deleted: boolean;
  edited: boolean;
  created_at: string;
  sender_display_name: string | null;
}

export interface ParticipantReadState {
  account_id: string | null;
  last_read_at: string | null;
}

export interface ChatConversation {
  id: number;
  group: boolean;
  name: string | null;
  owner_id: string | null;
  participants: ChatUser[];
  participant_read_states: ParticipantReadState[];
  last_message: ChatMessage | null;
  unread_count: number;
  updated_at: string;
}

export const fetchConversations = () =>
  apiRequestGet<ChatConversation[]>('v1/chat/conversations');

export const createConversation = (accountIds: string[], group = false, name?: string) =>
  apiRequestPost<ChatConversation>('v1/chat/conversations', {
    account_ids: accountIds,
    group,
    name,
  });

export const markConversationRead = (conversationId: number) =>
  apiRequestPost<{ success: boolean }>(
    `v1/chat/conversations/${conversationId}/read`,
  ).then((result) => {
    window.dispatchEvent(new Event('chat-unread-refresh'));
    return result;
  });

export const fetchMessages = (conversationId: number, maxId?: number) =>
  apiRequestGet<ChatMessage[]>(
    `v1/chat/conversations/${conversationId}/messages`,
    maxId ? { max_id: maxId } : undefined,
  );

export const sendMessage = (conversationId: number, content: string) =>
  apiRequestPost<ChatMessage>(
    `v1/chat/conversations/${conversationId}/messages`,
    { content },
  );

export const editMessage = (messageId: number, content: string) =>
  apiRequestPut<ChatMessage>(`v1/chat/messages/${messageId}`, { content });

export const deleteMessage = (messageId: number) =>
  apiRequestDelete<{ success: boolean }>(`v1/chat/messages/${messageId}`);

export interface SearchAccount {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
}

export const searchAccounts = (q: string) =>
  apiRequestGet<SearchAccount[]>('v1/accounts/search', {
    q,
    limit: 5,
  });

export const fetchConversation = (conversationId: number) =>
  apiRequestGet<ChatConversation>(`v1/chat/conversations/${conversationId}`);

export interface UploadedMedia {
  id: string;
  url: string;
}

export const uploadChatMedia = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequestPost<UploadedMedia>('v1/media', formData);
};

export const sendMessageWithMedia = (
  conversationId: number,
  content: string,
  mediaId?: string,
) =>
  apiRequestPost<ChatMessage>(
    `v1/chat/conversations/${conversationId}/messages`,
    { content, media_id: mediaId },
  );

export const leaveConversation = (conversationId: number) =>
  apiRequestPost<{ success: boolean }>(
    `v1/chat/conversations/${conversationId}/leave`,
  );

export const updateConversationName = (conversationId: number, name: string) =>
  apiRequestPut<ChatConversation>(`v1/chat/conversations/${conversationId}`, {
    name,
  });

export const fetchUnreadChatCount = () =>
  apiRequestGet<{ count: number }>('v1/chat/conversations/unread_count');