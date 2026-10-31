import { Rng } from '../core/rng';
import { WEATHER_LABEL, WIND_LABEL, type GameState, type Weather, type Wind } from '../core/types';
import { addLog } from './log';

const NEXT: Record<Weather, [Weather, number][]> = {
  clear: [['clear', 0.5], ['cloud', 0.35], ['fog', 0.15]],
  cloud: [['clear', 0.3], ['cloud', 0.3], ['rain', 0.3], ['fog', 0.1]],
  rain: [['rain', 0.4], ['cloud', 0.45], ['clear', 0.15]],
  fog: [['clear', 0.4], ['cloud', 0.4], ['fog', 0.2]],
};

function pickWeighted<T>(rng: Rng, table: [T, number][]): T {
  let r = rng.next();
  for (const [v, w] of table) {
    r -= w;
    if (r <= 0) return v;
  }
  return table[table.length - 1][0];
}

export function rollWeather(state: GameState, rng: Rng, silent = false): void {
  const before = state.weather;
  const windBefore = state.wind;
  state.weather = pickWeighted(rng, NEXT[state.weather]);
  state.wind = pickWeighted<Wind>(rng, [['calm', 0.3], ['E', 0.35], ['W', 0.35]]);
  state.weatherLeft = rng.int(4, 10);
  if (silent) return;
  if (state.weather !== before) {
    const msg: Record<Weather, string> = {
      clear: '하늘이 갠다.',
      cloud: '구름이 낮게 깔린다.',
      rain: '비가 온다. 바다를 지나온 비다. 맞지 않는 게 좋다.',
      fog: '안개가 능선을 삼킨다. 길이 잘 보이지 않는다.',
    };
    addLog(state, msg[state.weather]);
  }
  if (state.wind !== windBefore) {
    const msg: Record<Wind, string> = {
      calm: '바람이 잦아든다.',
      E: '동쪽 바다에서 바람이 분다. 동쪽 사면이 위험하다.',
      W: '서쪽 바다에서 바람이 분다. 서쪽 사면이 위험하다.',
    };
    addLog(state, msg[state.wind]);
  }
}

// 시간이 흐르면 날씨 카운터를 줄이고, 다 되면 새 날씨를 뽑는다
export function tickWeather(state: GameState, rng: Rng, hours: number): void {
  state.weatherLeft -= hours;
  while (state.weatherLeft <= 0) {
    const left = state.weatherLeft;
    rollWeather(state, rng);
    state.weatherLeft += left;
    if (state.weatherLeft <= 0) state.weatherLeft = 1;
  }
}

export function isNight(hour: number): boolean {
  return hour >= 20 || hour < 5;
}

// 체감 기온. 고도, 밤, 비, 바람으로 낮아지고 북쪽으로 갈수록 춥다
export function envTemp(state: GameState, node: { alt: number; stage: number }): number {
  let t = 26 - node.alt * 12 - node.stage * 0.5;
  if (isNight(state.hour)) t -= 8;
  else if (state.hour < 8 || state.hour >= 18) t -= 4;
  if (state.weather === 'rain') t -= 5;
  if (state.weather === 'fog') t -= 2;
  if (state.wind !== 'calm') t -= 4;
  return t;
}

export function weatherText(state: GameState): string {
  return `${WEATHER_LABEL[state.weather]} · ${WIND_LABEL[state.wind]}`;
}
