import { apiRequestGet, apiRequestPost, apiRequestDelete } from 'mastodon/api';

export interface Preset {
  id: number;
  name: string;
  npc_id: number;
  npc_name: string;
  npc_emotion: string;
  npc_image_url: string | null;
  background_id: number | null;
  background_name: string | null;
  background_thumb_url: string | null;
}

export const fetchPresets = () => apiRequestGet<Preset[]>('v1/presets');

export const createPreset = (
  name: string,
  npcId: number,
  npcEmotion: string,
  backgroundId: number | null,
) =>
  apiRequestPost<Preset>('v1/presets', {
    name,
    npc_id: npcId,
    npc_emotion: npcEmotion,
    background_id: backgroundId,
  });

export const deletePreset = (id: number) =>
  apiRequestDelete<{ success: boolean }>(`v1/presets/${id}`);