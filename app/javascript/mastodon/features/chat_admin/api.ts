import { apiRequestGet } from 'mastodon/api';

export interface AdminParticipant {
  user_id: number;
  account_id: string | null;
  username: string | null;
  display_name: string | null;
  avatar: string | null;
  left: boolean;
}

export interface AdminMessage {
  id: number;
  message_type: 'user' | 'system';
  sender_account_id: string | null;
  sender_username: string | null;
  sender_display_name: string | null;
  sender_avatar: string | null;
  content: string | null;
  media_url: string | null;
  deleted: boolean;
  deleted_at: string | null;
  edited: boolean;
  created_at: string;
}

export interface AdminConversation {
  id: number;
  group: boolean;
  name: string | null;
  participants: AdminParticipant[];
  message_count: number;
  last_message: AdminMessage | null;
  updated_at: string;
}

export const fetchAdminConversations = (query: string, page: number) =>
  apiRequestGet<{ conversations: AdminConversation[]; has_more: boolean }>(
    'v1/chat/admin/conversations',
    { q: query || undefined, page },
  );

export const fetchAdminMessages = (conversationId: number, maxId?: number) =>
  apiRequestGet<{
    conversation: AdminConversation;
    messages: AdminMessage[];
    has_more: boolean;
  }>(`v1/chat/admin/conversations/${conversationId}/messages`, {
    max_id: maxId,
  });