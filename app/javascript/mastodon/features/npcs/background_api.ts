import { apiRequestGet, apiRequestPost, apiRequestDelete } from 'mastodon/api';

export interface Background {
  id: number;
  name: string;
  url: string;
  thumb_url: string;
}

export const fetchBackgrounds = () => apiRequestGet<Background[]>('v1/backgrounds');

export const createBackground = (name: string, file: File) => {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('image', file);
  return apiRequestPost<Background>('v1/backgrounds', formData);
};

export const deleteBackground = (id: number) =>
  apiRequestDelete<{ success: boolean }>(`v1/backgrounds/${id}`);