import { apiRequestGet, apiRequestPost, apiRequestPut, apiRequestDelete } from 'mastodon/api';

export interface NpcImage {
  id: number;
  emotion: string;
  url: string;
  thumb_url: string;
}

export interface Npc {
  id: number;
  name: string;
  images: NpcImage[];
}

export const fetchNpcs = () => apiRequestGet<Npc[]>('v1/npcs');

export const createNpc = (name: string) =>
  apiRequestPost<Npc>('v1/npcs', { name });

export const updateNpc = (id: number, name: string) =>
  apiRequestPut<Npc>(`v1/npcs/${id}`, { name });

export const deleteNpc = (id: number) =>
  apiRequestDelete<{ success: boolean }>(`v1/npcs/${id}`);

export const uploadNpcImage = (npcId: number, emotion: string, file: File) => {
  const formData = new FormData();
  formData.append('emotion', emotion);
  formData.append('image', file);
  return apiRequestPost<NpcImage>(`v1/npcs/${npcId}/npc_images`, formData);
};

export const deleteNpcImage = (npcId: number, imageId: number) =>
  apiRequestDelete<{ success: boolean }>(
    `v1/npcs/${npcId}/npc_images/${imageId}`,
  );