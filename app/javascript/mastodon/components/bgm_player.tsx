import { useCallback, useEffect, useRef, useState } from 'react';

import { getAccessToken, me } from 'mastodon/initial_state';

import {
  MusicIcon,
  MusicOffIcon,
  VolumeIcon,
  VolumeOffIcon,
} from './sound_icons';
import {
  SFX_SEEN_EVENT,
  isSfxSeen,
  useStorySfxSettings,
} from 'mastodon/utils/story_sound';

interface BgmState {
  enabled: boolean;
  video_id: string;
  offset: number;
  started_at: number;
  server_time: number;
}

interface YouTubePlayer {
  loadVideoById: (args: { videoId: string; startSeconds?: number }) => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

interface YouTubeNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      width: number;
      height: number;
      playerVars: Record<string, number>;
      events: {
        onReady: () => void;
        onStateChange: (event: { data: number }) => void;
      };
    },
  ) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const STATE_ENDED = 0;
const STATE_PLAYING = 1;
const STATE_BUFFERING = 3;

const POLL_MS = 15000;
const SYNC_MS = 10000;
const MAX_DRIFT_SECONDS = 2.5;

const ON_KEY = 'bgm_on';
const VOLUME_KEY = 'bgm_volume';

let apiPromise: Promise<void> | null = null;

const loadYouTubeApi = (): Promise<void> => {
  apiPromise ??= new Promise<void>((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }

    const previous = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });

  return apiPromise;
};

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
    if (saved === null) return 50;
    const value = Number(saved);
    return Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 50;
  } catch {
    return 50;
  }
};

const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장소를 쓸 수 없어도 재생에는 영향이 없다.
  }
};

const stateKey = (bgm: BgmState) =>
  `${bgm.video_id}|${bgm.started_at}|${bgm.offset}`;

export const BgmPlayer: React.FC = () => {
  const [bgm, setBgm] = useState<BgmState | null>(null);
  const [userOn, setUserOn] = useState(readOn);
  const [volume, setVolume] = useState(readVolume);
  const [unlocked, setUnlocked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [sfxSeen, setSfxSeen] = useState(isSfxSeen);
  const sfx = useStorySfxSettings();

  const frameRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const creatingRef = useRef(false);
  const readyRef = useRef(false);
  const skewRef = useRef(0);
  const bgmRef = useRef<BgmState | null>(null);
  const userOnRef = useRef(userOn);
  const volumeRef = useRef(volume);
  const unlockedRef = useRef(false);
  const loadedKeyRef = useRef('');

  // 서버 시각 기준으로 지금 재생해야 할 위치(초)를 계산한다.
  const targetPosition = useCallback((): number => {
    const current = bgmRef.current;
    if (!current) return 0;

    const now = Date.now() + skewRef.current;
    let position = current.offset + Math.max(0, now - current.started_at) / 1000;
    const duration = playerRef.current?.getDuration() ?? 0;

    if (duration > 1) position %= duration;

    return position;
  }, []);

  const apply = useCallback(() => {
    const player = playerRef.current;
    const current = bgmRef.current;

    if (!player || !readyRef.current) return;

    const active =
      !!current?.enabled &&
      !!current.video_id &&
      userOnRef.current &&
      unlockedRef.current;

    if (!active || !current) {
      if (loadedKeyRef.current) player.pauseVideo();
      return;
    }

    player.setVolume(volumeRef.current);

    const key = stateKey(current);

    if (loadedKeyRef.current !== key) {
      loadedKeyRef.current = key;
      player.loadVideoById({
        videoId: current.video_id,
        startSeconds: targetPosition(),
      });
    } else {
      const state = player.getPlayerState();

      if (state !== STATE_PLAYING && state !== STATE_BUFFERING) {
        player.seekTo(targetPosition(), true);
        player.playVideo();
      }
    }
  }, [targetPosition]);

  const syncCheck = useCallback(() => {
    const player = playerRef.current;

    if (!player || !readyRef.current) return;
    if (player.getPlayerState() !== STATE_PLAYING) return;

    const duration = player.getDuration();
    const target = targetPosition();
    let drift = Math.abs(player.getCurrentTime() - target);

    if (duration > 1) drift = Math.min(drift, duration - drift);
    if (drift > MAX_DRIFT_SECONDS) player.seekTo(target, true);
  }, [targetPosition]);

  // 서버의 BGM 상태를 주기적으로 가져온다.
  useEffect(() => {
    if (!me) return undefined;

    let stopped = false;

    const poll = async () => {
      try {
        const sentAt = Date.now();
        const response = await fetch('/api/v1/bgm', {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
          cache: 'no-store',
        });

        if (!response.ok || stopped) return;

        const data = (await response.json()) as BgmState;
        const receivedAt = Date.now();

        skewRef.current = data.server_time - (sentAt + receivedAt) / 2;
        bgmRef.current = data;
        setBgm((previous) =>
          previous &&
          previous.enabled === data.enabled &&
          stateKey(previous) === stateKey(data)
            ? previous
            : data,
        );
        apply();
      } catch {
        // 네트워크 오류는 다음 주기에 다시 시도한다.
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll();
    };

    void poll();

    const pollTimer = window.setInterval(() => {
      void poll();
    }, POLL_MS);
    const syncTimer = window.setInterval(syncCheck, SYNC_MS);

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      stopped = true;
      window.clearInterval(pollTimer);
      window.clearInterval(syncTimer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [apply, syncCheck]);

  // 브라우저는 사용자가 한 번 화면을 누르기 전에는 소리를 막는다.
  useEffect(() => {
    if (!me) return undefined;

    const unlock = (event: Event) => {
      // BGM 버튼 자체의 클릭은 버튼 핸들러가 처리한다.
      if ((event.target as Element | null)?.closest?.('.bgm-player')) return;

      unlockedRef.current = true;
      setUnlocked(true);
      apply();
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };

    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);

    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [apply]);

  // BGM이 켜져 있을 때 플레이어를 한 번만 만든다.
  const enabled = !!bgm?.enabled;

  useEffect(() => {
    if (!me || !enabled || playerRef.current || creatingRef.current) {
      return undefined;
    }

    creatingRef.current = true;
    let cancelled = false;

    void loadYouTubeApi().then(() => {
      const frame = frameRef.current;

      if (cancelled || !frame || !window.YT) {
        creatingRef.current = false;
        return;
      }

      const host = document.createElement('div');
      frame.appendChild(host);

      playerRef.current = new window.YT.Player(host, {
        width: 200,
        height: 200,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          playsinline: 1,
          rel: 0,
          fs: 0,
        },
        events: {
          onReady: () => {
            readyRef.current = true;
            apply();
          },
          onStateChange: (event) => {
            if (event.data === STATE_ENDED) {
              const player = playerRef.current;
              player?.seekTo(targetPosition(), true);
              player?.playVideo();
            }

            if (event.data === STATE_PLAYING) {
              setPlaying(true);
              syncCheck();
            } else if (event.data !== STATE_BUFFERING) {
              setPlaying(false);
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, apply, syncCheck, targetPosition]);

  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
      readyRef.current = false;
    };
  }, []);

  useEffect(() => {
    apply();
  }, [bgm, userOn, unlocked, apply]);

  const handleToggle = useCallback(() => {
    // 아직 소리가 시작되지 않았다면 끄지 않고 재생만 시작한다.
    if (userOnRef.current && !unlockedRef.current) {
      unlockedRef.current = true;
      setUnlocked(true);
      apply();
      return;
    }

    const next = !userOnRef.current;

    userOnRef.current = next;
    unlockedRef.current = true;
    setUserOn(next);
    setUnlocked(true);
    save(ON_KEY, next ? '1' : '0');
    apply();
  }, [apply]);

  const handleVolume = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);

      volumeRef.current = value;
      setVolume(value);
      save(VOLUME_KEY, String(value));
      playerRef.current?.setVolume(value);
    },
    [],
  );

  // 효과음이 있는 게시물을 처음 보면 효과음 설정을 보이게 한다.
  useEffect(() => {
    const onSeen = () => {
      setSfxSeen(true);
    };

    window.addEventListener(SFX_SEEN_EVENT, onSeen);

    return () => {
      window.removeEventListener(SFX_SEEN_EVENT, onSeen);
    };
  }, []);

  if (!me) return null;

  let label = 'BGM 꺼짐';

  if (userOn) {
    if (playing) label = 'BGM 켜짐';
    else if (unlocked) label = 'BGM 불러오는 중';
    else label = 'BGM 시작하기';
  }

  return (
    <>
      <div className='bgm-player__frame' ref={frameRef} aria-hidden='true' />
      {(enabled || sfxSeen) && (
        <div className='bgm-player' role='group' aria-label='사운드'>
          {enabled && (
            <div className='bgm-player__row'>
              <button
                type='button'
                className='bgm-player__toggle'
                onClick={handleToggle}
                aria-pressed={userOn}
              >
                {userOn ? <MusicIcon /> : <MusicOffIcon />}
                {label}
              </button>
              {userOn && (
                <input
                  type='range'
                  className='bgm-player__volume'
                  min={0}
                  max={100}
                  value={volume}
                  onChange={handleVolume}
                  aria-label='BGM 음량'
                />
              )}
            </div>
          )}
          {sfxSeen && (
            <div className='bgm-player__row'>
              <button
                type='button'
                className='bgm-player__toggle'
                onClick={() => {
                  sfx.setOn(!sfx.on);
                }}
                aria-pressed={sfx.on}
              >
                {sfx.on ? <VolumeIcon /> : <VolumeOffIcon />}
                {sfx.on ? '효과음 켜짐' : '효과음 꺼짐'}
              </button>
              {sfx.on && (
                <input
                  type='range'
                  className='bgm-player__volume'
                  min={0}
                  max={100}
                  value={sfx.volume}
                  onChange={(event) => {
                    sfx.setVolume(Number(event.target.value));
                  }}
                  aria-label='효과음 음량'
                />
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};
