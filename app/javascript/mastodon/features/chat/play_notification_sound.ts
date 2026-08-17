import { assetHost } from 'mastodon/utils/config';

let audio: HTMLAudioElement | null = null;

const getAudio = () => {
  if (!audio) {
    audio = new Audio();
    const oggSource = document.createElement('source');
    oggSource.type = 'audio/ogg';
    oggSource.src = `${assetHost}/sounds/boop.ogg`;
    audio.appendChild(oggSource);

    const mp3Source = document.createElement('source');
    mp3Source.type = 'audio/mpeg';
    mp3Source.src = `${assetHost}/sounds/boop.mp3`;
    audio.appendChild(mp3Source);
  }
  return audio;
};

export const playChatNotificationSound = () => {
  const el = getAudio();
  if (!el.paused) {
    el.pause();
    if (typeof el.fastSeek === 'function') {
      el.fastSeek(0);
    } else {
      el.currentTime = 0;
    }
  }
  void el.play();
};
