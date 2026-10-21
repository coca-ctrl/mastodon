import { useCallback } from 'react';

import type { Map as ImmutableMap } from 'immutable';

import { changeComposeEntrance } from 'mastodon/actions/compose';
import { useAppDispatch, useAppSelector } from 'mastodon/store';

const APPEAR = [
  { value: '', label: '없음' },
  { value: 'shake', label: '흔들리며 나타나기' },
  { value: 'fade', label: '페이드·슬라이드' },
];

const TEXT = [
  { value: '', label: '없음' },
  { value: 'lines', label: '한 줄씩' },
  { value: 'typewriter', label: '한 글자씩 (타자기)' },
];

const pick = (list: string[], options: { value: string }[]) =>
  list.find((p) => options.some((o) => o.value && o.value === p)) ?? '';

/** 카드/NPC 를 고른 경우에만 보이는 등장 연출 선택 */
export const EntranceSelector: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  const dispatch = useAppDispatch();

  const compose = useAppSelector((state) => state.compose as ImmutableMap<string, unknown>);
  const active = !!(
    compose.get('npc_id') ||
    compose.get('card_preset_id') ||
    compose.get('preset_id')
  );
  const current = (compose.get('entrance_effect') as string | undefined) ?? '';
  const parts = current.split(',').filter(Boolean);

  const appear = pick(parts, APPEAR);
  const text = pick(parts, TEXT);
  const glow = parts.includes('glow');

  const update = useCallback(
    (next: { appear?: string; text?: string; glow?: boolean }) => {
      const a = next.appear ?? appear;
      const t = next.text ?? text;
      const g = next.glow ?? glow;
      dispatch(changeComposeEntrance([a, t, g ? 'glow' : ''].filter(Boolean).join(',')));
    },
    [dispatch, appear, text, glow],
  );

  if (!active) return null;

  return (
    <div className='entrance-selector'>
      <div className='entrance-selector__title'>등장 연출</div>

      <label className='entrance-selector__row'>
        <span>등장</span>
        <select
          value={appear}
          disabled={disabled}
          onChange={(e) => {
            update({ appear: e.target.value });
          }}
        >
          {APPEAR.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className='entrance-selector__row'>
        <span>글자</span>
        <select
          value={text}
          disabled={disabled}
          onChange={(e) => {
            update({ text: e.target.value });
          }}
        >
          {TEXT.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className='entrance-selector__row entrance-selector__row--check'>
        <input
          type='checkbox'
          checked={glow}
          disabled={disabled}
          onChange={(e) => {
            update({ glow: e.target.checked });
          }}
        />
        <span>빛나며 등장</span>
      </label>
    </div>
  );
};
