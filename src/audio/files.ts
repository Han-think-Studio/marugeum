import type { LayerName } from './engine';

// 직접 만든 음원을 쓰려면 public/audio/ 에 파일을 넣고 여기에 경로를 적는다.
// 적지 않은 채널은 합성음으로 난다. 반복 재생되므로 앞뒤가 이어지는 소리가 좋다.
// 예: theme: 'audio/theme.ogg', wind: 'audio/wind.ogg'
export const AUDIO_FILES: Partial<Record<LayerName, string>> = {};
