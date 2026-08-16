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
  sender_id: number;
  sender_account_id: string | null;
  content: string | null;
  deleted: boolean;
  edited: boolean;
  created_at: string;
}

export interface ChatConversation {
  id: number;
  group: boolean;
  name: string | null;
  participants: ChatUser[];
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
  );

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