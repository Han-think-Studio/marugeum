import { INDOOR, type GameState } from '../core/types';
import { hasFire } from '../game/state';
import { isNight } from '../game/weather';
import type { Targets } from './engine';

// 게임 상태를 소리 채널 음량으로 바꾼다
export function sceneTargets(state: GameState, themeOn: boolean): Targets {
  const node = state.nodes[state.nodeId];
  const indoor = INDOOR.has(node.kind);
  const night = isNight(state.hour);
  const roof = indoor ? 0.45 : 1;
  const rain = state.weather === 'rain';

  let wind = state.wind === 'calm' ? 0.1 : 0.3;
  wind += node.alt * 0.15;
  if (night) wind += 0.05;
  if (state.weather === 'fog') wind *= 0.6;
  wind *= roof;

  const rainLevel = rain ? 0.35 * roof : 0;
  const fire = hasFire(state) ? 0.5 : 0;
  const day = state.hour >= 6 && state.hour < 19;
  const birds = day && !rain && state.weather !== 'fog' ? 0.5 * (indoor ? 0.4 : 1) * (node.alt > 0.9 ? 0.5 : 1) : 0;
  const crickets = night && !rain ? 0.6 * (indoor ? 0.4 : 1) : 0;

  return { wind, rain: rainLevel, fire, birds, crickets, theme: themeOn ? 0.6 : 0 };
}

export const TITLE_TARGETS: Targets = { wind: 0.12, rain: 0, fire: 0, birds: 0, crickets: 0, theme: 0.7 };
export const SILENCE: Targets = { wind: 0, rain: 0, fire: 0, birds: 0, crickets: 0, theme: 0 };
