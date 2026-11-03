import { audio } from '../audio/engine';

export type Difficulty = 'easy' | 'normal' | 'hard';

// 난이도. 낙진이 날마다 짙어지는 속도, 배고픔·목마름의 속도, 시간당 피폭, 추위
// 낙진 속도만으로는 봇 30판에서 차이가 거의 안 났다(쉬움·보통·어려움 모두 생존 60~70%). 그래서 피폭과 추위도 함께 움직인다
export const DIFFICULTY: Record<Difficulty, { label: string; fallout: number; need: number; rad: number; cold: number }> = {
  easy: { label: '쉬움', fallout: 0.02, need: 0.8, rad: 0.8, cold: 0.8 },
  normal: { label: '보통', fallout: 0.033, need: 1, rad: 1, cold: 1 },
  hard: { label: '어려움', fallout: 0.05, need: 1.2, rad: 1.1, cold: 1.15 },
};

// 설정. 소리는 소리 엔진이 따로 저장하고, 나머지는 여기서 저장한다. 함수 없는 평범한 객체다

export type TextSize = 'small' | 'normal' | 'large';

export interface Settings {
  textSize: TextSize; // 화면 글자와 칸의 크기
  defaultView: 'scene' | 'map'; // 여정을 열 때 위쪽 큰 화면
  animation: boolean; // 장면의 비·불·별 움직임. 끄면 멈춘 그림
  hints: boolean; // 행동 버튼의 설명 글(시간·재료·결과)
  difficulty: Difficulty;
  slides: boolean; // 이동·밤·고비 사이의 전환 그림
  handwork: boolean; // 수리·불·요리를 손 놀이로 직접 한다. 끄면 예전처럼 확률과 보통 솜씨로
}

const KEY = 'marugeum.settings.v1';

export const DEFAULT_SETTINGS: Settings = { textSize: 'normal', defaultView: 'scene', animation: true, hints: true, difficulty: 'normal', slides: true, handwork: true };

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
      if (s.difficulty === 'easy' || s.difficulty === 'normal' || s.difficulty === 'hard') settings.difficulty = s.difficulty;
      if (typeof s.slides === 'boolean') settings.slides = s.slides;
      if (typeof s.handwork === 'boolean') settings.handwork = s.handwork;
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
