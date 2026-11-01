import { Rng } from '../core/rng';
import { WEATHER_LABEL, WIND_LABEL, type GameState, type Weather, type Wind, CRISIS_INFO } from '../core/types';
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
  // 미리 정해 둔 다음 날씨가 지금이 되고, 그다음을 새로 정한다. 그래서 예보가 가능하다
  state.weather = state.nextWeather ?? pickWeighted(rng, NEXT[state.weather]);
  state.wind = state.nextWind ?? pickWeighted<Wind>(rng, [['calm', 0.3], ['E', 0.35], ['W', 0.35]]);
  state.nextWeather = pickWeighted(rng, NEXT[state.weather]);
  state.nextWind = pickWeighted<Wind>(rng, [['calm', 0.3], ['E', 0.35], ['W', 0.35]]);
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

// 첫날 0시부터 센 시간. 고비와 라디오가 쓴다
export function absHour(state: GameState): number {
  return (state.day - 1) * 24 + state.hour;
}

export function crisisActive(state: GameState): boolean {
  const c = state.crisis;
  if (!c) return false;
  const now = absHour(state);
  return now >= c.start && now < c.end;
}

// 아는 고비까지 남은 시간. 징조를 봤거나 라디오로 들었을 때만. 모르면 null
export function crisisKnownIn(state: GameState): number | null {
  const c = state.crisis;
  if (!c || crisisActive(state)) return null;
  const left = c.start - absHour(state);
  if (left <= 0) return null;
  if (c.warned || c.signed) return left;
  return null;
}

// 상단에 띄울 고비 글
export function crisisText(state: GameState): string {
  const c = state.crisis;
  if (!c) return '';
  const label = CRISIS_INFO[c.kind].label;
  if (crisisActive(state)) return `${label} · ${c.end - absHour(state)}시간 남음`;
  const left = crisisKnownIn(state);
  if (left === null) return '';
  return c.warned ? `${label} · 약 ${left}시간 뒤` : `${label}의 징조 · 반나절 안`;
}

export function isNight(hour: number): boolean {
  return hour >= 20 || hour < 5;
}

// 체감 기온. 고도, 밤, 비, 바람으로 낮아지고 북쪽으로 갈수록 춥다
export function envTemp(state: GameState, node: { alt: number; stage: number }): number {
  let t = 25 - node.alt * 12 - node.stage * 0.5;
  t -= (state.day - 1) * 0.4; // 늦가을. 날마다 조금씩 추워진다
  if (crisisActive(state) && state.crisis) t -= state.crisis.kind === 'cold' ? 12 : state.crisis.kind === 'snow' ? 7 : 0;
  if (isNight(state.hour)) t -= 11;
  else if (state.hour < 8 || state.hour >= 18) t -= 5;
  if (state.weather === 'rain') t -= 5;
  if (state.weather === 'fog') t -= 2;
  if (state.wind !== 'calm') t -= 5;
  return t;
}

export function weatherText(state: GameState): string {
  return `${WEATHER_LABEL[state.weather]} · ${WIND_LABEL[state.wind]}`;
}

// 예보 문장. 하늘을 읽는 것이라 대략적이다
export function forecastText(state: GameState): string {
  const h = state.weatherLeft;
  const when = h <= 2 ? '곧' : `${h}시간쯤 뒤`;
  if (state.nextWeather === state.weather && state.nextWind === state.wind) return `${when}까지 그대로`;
  const w = state.nextWeather !== state.weather ? WEATHER_LABEL[state.nextWeather] : '';
  const wd = state.nextWind !== state.wind ? WIND_LABEL[state.nextWind] : '';
  return `${when} ${[w, wd].filter(Boolean).join(' · ')}`;
}

// 해가 떠 있는 시간. 6시부터 19시까지
export function daylightLeft(hour: number): number {
  if (hour < 6) return 0;
  if (hour >= 19) return 0;
  return 19 - hour;
}
