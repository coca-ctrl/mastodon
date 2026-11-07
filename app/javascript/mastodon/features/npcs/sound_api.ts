import {
  apiRequestGet,
  apiRequestPost,
  apiRequestPut,
  apiRequestDelete,
} from 'mastodon/api';

export interface StorySound {
  id: string;
  name: string;
  url: string;
  duration_ms: number;
  file_size: number;
  used_count: number;
}

export interface StorySoundList {
  sounds: StorySound[];
  limits: {
    max_sounds: number;
    max_size_mb: number;
    max_seconds: number;
  };
}

export const fetchStorySounds = () =>
  apiRequestGet<StorySoundList>('v1/story_sounds');

export const createStorySound = (formData: FormData) =>
  apiRequestPost<StorySound>('v1/story_sounds', formData);

export const renameStorySound = (id: string, name: string) => {
  const formData = new FormData();
  formData.append('name', name);

  return apiRequestPut<StorySound>(`v1/story_sounds/${id}`, formData);
};

export const deleteStorySound = (id: string) =>
  apiRequestDelete<{ success: boolean }>(`v1/story_sounds/${id}`);

export const errorMessage = (error: unknown): string => {
  const message = (
    error as { response?: { data?: { error?: string } } } | undefined
  )?.response?.data?.error;

  return message ?? '요청에 실패했습니다. 잠시 후 다시 시도해 주세요.';
};
