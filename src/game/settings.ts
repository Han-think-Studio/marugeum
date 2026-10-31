import { audio } from '../audio/engine';

// 설정. 소리는 소리 엔진이 따로 저장하고, 나머지는 여기서 저장한다. 함수 없는 평범한 객체다

export type TextSize = 'small' | 'normal' | 'large';

export interface Settings {
  textSize: TextSize; // 화면 글자와 칸의 크기
  defaultView: 'scene' | 'map'; // 여정을 열 때 위쪽 큰 화면
  animation: boolean; // 장면의 비·불·별 움직임. 끄면 멈춘 그림
  hints: boolean; // 행동 버튼의 설명 글(시간·재료·결과)
}

const KEY = 'marugeum.settings.v1';

export const DEFAULT_SETTINGS: Settings = { textSize: 'normal', defaultView: 'scene', animation: true, hints: true };

export const settings: Settings = { ...DEFAULT_SETTINGS };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<Settings>;
      if (s.textSize === 'small' || s.textSize === 'normal' || s.textSize === 'large') settings.textSize = s.textSize;
      if (s.defaultView === 'scene' || s.defaultView === 'map') settings.defaultView = s.defaultView;
      if (typeof s.animation === 'boolean') settings.animation = s.animation;
      if (typeof s.hints === 'boolean') settings.hints = s.hints;
    }
  } catch {
    // 저장소가 막혀 있으면 기본값
  }
  applySettings();
  return settings;
}

export function saveSettings(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // 무시
  }
  applySettings();
}

// 문서에 반영한다. 글자 크기는 html 의 data-text 로 CSS 가 읽는다
export function applySettings(): void {
  document.documentElement.dataset.text = settings.textSize;
  document.documentElement.dataset.hints = settings.hints ? 'on' : 'off';
}

export function resetSettings(): void {
  Object.assign(settings, DEFAULT_SETTINGS);
  audio.setVolume(0.7);
  audio.setMuted(false);
  saveSettings();
}

export const TEXT_SIZE_LABEL: Record<TextSize, string> = { small: '작게', normal: '보통', large: '크게' };
