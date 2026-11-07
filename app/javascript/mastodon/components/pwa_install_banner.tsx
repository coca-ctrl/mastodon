import { useCallback, useEffect, useState } from 'react';

import { me } from 'mastodon/initial_state';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_install_dismissed_at';
const DISMISS_DAYS = 7;
const MOBILE_QUERY = '(max-width: 759px)';

// 브라우저가 보내는 설치 신호는 컴포넌트가 만들어지기 전에 올 수 있어서
// 모듈 로드 시점에 받아 두고, 컴포넌트가 구독한다.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => {
  listeners.forEach((listener) => {
    listener();
  });
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const recentlyDismissed = (): boolean => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at > 0 && Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

export const PwaInstallBanner: React.FC = () => {
  const [, setTick] = useState(0);
  const [dismissed, setDismissed] = useState(recentlyDismissed);
  const [showGuide, setShowGuide] = useState(false);
  const [mobile, setMobile] = useState(
    () => window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const onMedia = () => {
      setMobile(media.matches);
    };
    const onPrompt = () => {
      setTick((n) => n + 1);
    };

    media.addEventListener('change', onMedia);
    listeners.add(onPrompt);

    return () => {
      media.removeEventListener('change', onMedia);
      listeners.delete(onPrompt);
    };
  }, []);

  const handleInstall = useCallback(() => {
    const promptEvent = deferredPrompt;

    if (promptEvent) {
      // 설치 신호는 한 번만 쓸 수 있다.
      deferredPrompt = null;
      void promptEvent
        .prompt()
        .then(() => promptEvent.userChoice)
        .catch(() => {
          setShowGuide(true);
        })
        .finally(() => {
          setTick((n) => n + 1);
        });
    } else {
      setShowGuide((value) => !value);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // 저장소를 쓸 수 없으면 이번 화면에서만 숨긴다.
    }
    setDismissed(true);
  }, []);

  const ios = isIos();

  if (!me || !mobile || dismissed || isStandalone()) {
    return null;
  }

  return (
    <div className='pwa-install-banner' role='region' aria-label='앱 설치 안내'>
      <div className='pwa-install-banner__main'>
        <p className='pwa-install-banner__text'>
          앱으로 설치하면 알림을 받을 수 있어요. 설치 후 알림 설정을 켜주세요.
        </p>
        <div className='pwa-install-banner__actions'>
          <button
            type='button'
            className='button button--small'
            onClick={handleInstall}
          >
            앱으로 설치하기
          </button>
          <button
            type='button'
            className='pwa-install-banner__close'
            onClick={handleDismiss}
            aria-label='닫기'
          >
            ×
          </button>
        </div>
      </div>

      {showGuide && (
        <ol className='pwa-install-banner__guide'>
          {ios ? (
            <>
              <li>브라우저의 공유 버튼(네모에서 위로 향한 화살표)을 누르세요.</li>
              <li>목록에서 &quot;홈 화면에 추가&quot;를 선택하세요.</li>
            </>
          ) : (
            <>
              <li>브라우저 오른쪽 위의 메뉴(점 세 개)를 누르세요.</li>
              <li>
                &quot;홈 화면에 추가&quot;를 누른 뒤, 나오는 창에서 &quot;설치&quot;를
                선택하세요.
              </li>
            </>
          )}
          <li>
            홈 화면에 생긴 아이콘으로 앱을 열고, 설정의 알림에서 푸시 알림을
            켜주세요.
          </li>
        </ol>
      )}
    </div>
  );
};
