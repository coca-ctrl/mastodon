import {
  apiRequestGet,
  apiRequestPost,
  apiRequestPut,
  apiRequestDelete,
} from 'mastodon/api';

import type { CardStyle } from '../card_style/style';

export interface CardPreset extends CardStyle {
  name: string;
  used_count: number;
}

export interface CardFontOption {
  key: string;
  label: string;
  family: string;
  weights: number[];
}

export interface CardPresetOptions {
  fonts: CardFontOption[];
  border_styles: string[];
  background_sizes: string[];
  background_positions: string[];
  background_repeats: string[];
  border_image_repeats: string[];
  gradient_types: string[];
  limits: {
    max_presets: number;
    background_image_mb: number;
    border_image_mb: number;
  };
}

export const fetchCardPresets = () =>
  apiRequestGet<CardPreset[]>('v1/card_presets');

export const fetchCardPresetOptions = () =>
  apiRequestGet<CardPresetOptions>('v1/card_presets/options');

export const saveCardPreset = (id: number | null, formData: FormData) =>
  id === null
    ? apiRequestPost<CardPreset>('v1/card_presets', formData)
    : apiRequestPut<CardPreset>(`v1/card_presets/${id}`, formData);

export const deleteCardPreset = (id: number) =>
  apiRequestDelete<{ success: boolean }>(`v1/card_presets/${id}`);