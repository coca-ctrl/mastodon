import { useSyncExternalStore } from 'react';

export const SFX_SEEN_EVENT = 'story-sfx-seen';

const ON_KEY = 'story_sfx_on';
const VOLUME_KEY = 'story_sfx_volume';
const PLAYED_KEY = 'story_sfx_played';
const PLAYED_LIMIT = 300;

const readOn = (): boolean => {
  try {
    return localStorage.getItem(ON_KEY) !== '0';
  } catch {
    return true;
  }
};

const readVolume = (): number => {
  try {
    const saved = localStorage.getItem(VOLUME_KEY);
    if (saved === null) return 70;
    const value = Number(saved);
    return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 70;
  } catch {
    return 70;
  }
};

const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장소를 쓸 수 없어도 재생에는 영향이 없다.
  }
};

let sfxOn = readOn();
let sfxVolume = readVolume();
let seen = false;
let current: HTMLAudioElement | null = null;

const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const emit = () => {
  listeners.forEach((listener) => {
    listener();
  });
};

export const stopStorySound = () => {
  if (current) {
    current.pause();
    current = null;
  }
};

export const setSfxOn = (value: boolean) => {
  sfxOn = value;
  save(ON_KEY, value ? '1' : '0');
  if (!value) stopStorySound();
  emit();
};

export const setSfxVolume = (value: number) => {
  sfxVolume = Math.min(100, Math.max(0, value));
  save(VOLUME_KEY, String(sfxVolume));
  if (current) current.volume = sfxVolume / 100;
  emit();
};

export const useStorySfxSettings = () => {
  const on = useSyncExternalStore(subscribe, () => sfxOn);
  const volume = useSyncExternalStore(subscribe, () => sfxVolume);

  return { on, volume, setOn: setSfxOn, setVolume: setSfxVolume };
};

/** 효과음이 있는 게시물을 처음 본 순간 알려, 설정 버튼을 보이게 한다. */
export const isSfxSeen = () => seen;

export const notifySfxSeen = () => {
  if (seen) return;
  seen = true;
  window.dispatchEvent(new Event(SFX_SEEN_EVENT));
};

/**
 * 효과음을 재생한다. 재생에 성공했거나 효과음이 꺼져 있으면 true.
 * 브라우저가 자동재생을 막은 경우 false (아직 화면을 누른 적이 없을 때).
 * force 는 사용자가 ▶ 를 직접 눌렀을 때 켜짐/꺼짐 설정과 상관없이 재생한다.
 */
export const playStorySound = async (
  url: string,
  force = false,
): Promise<boolean> => {
  if (!force && !sfxOn) return true;

  stopStorySound();

  const audio = new Audio(url);
  audio.volume = sfxVolume / 100;
  current = audio;

  try {
    await audio.play();
    return true;
  } catch {
    if (current === audio) current = null;
    return false;
  }
};

const sessionPlayed = new Set<string>();

const readPlayed = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(PLAYED_KEY) ?? '[]') as unknown;

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
};

export const hasPlayedSfx = (id: string): boolean =>
  sessionPlayed.has(id) || readPlayed().includes(id);

export const markPlayedSfx = (id: string) => {
  sessionPlayed.add(id);

  const list = readPlayed();

  if (!list.includes(id)) {
    list.push(id);
    save(PLAYED_KEY, JSON.stringify(list.slice(-PLAYED_LIMIT)));
  }
};
