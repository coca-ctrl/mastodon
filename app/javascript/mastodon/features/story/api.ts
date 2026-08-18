import { apiRequestGet } from 'mastodon/api';

export interface StorySessionSummary {
  id: number;
  title: string | null;
  thumbnail_url: string;
  started_at: string;
  ended_at: string | null;
  open: boolean;
  post_count: number | null;
}

export const fetchStorySessions = () =>
  apiRequestGet<StorySessionSummary[]>('v1/story_sessions');

export const fetchStorySession = (id: number) =>
  apiRequestGet<{ session: StorySessionSummary; statuses: unknown[] }>(
    `v1/story_sessions/${id}`,
  );