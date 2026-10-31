import { Rng } from '../core/rng';
import { INDOOR, type GameState, type MapNode, type StatKey } from '../core/types';
import { envTemp, isNight, tickWeather } from './weather';
import { addLog } from './log';

export type Activity = 'travel' | 'rest' | 'sleep' | 'forage';

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

function add(state: GameState, key: StatKey, delta: number): void {
  state.stats[key] = clamp(state.stats[key] + delta);
}

// 시간당 피폭량. 낮은 땅, 비, 바다 쪽 바람이 겹치면 급격히 오른다
export function radPerHour(state: GameState, node: MapNode, indoor: boolean): number {
  let r = node.alt < 0.35 ? 1.2 : node.alt < 0.6 ? 0.5 : 0.1;
  r *= 1 + node.stage * 0.08; // 북쪽으로 갈수록 짙어진다
  if (state.weather === 'rain') r *= 3;
  if (state.wind !== 'calm' && state.wind === node.side) r *= 1.8;
  if (indoor) r *= 0.35;
  return r;
}

// 한 시간이 흐를 때 몸에 일어나는 일
function tickOneHour(state: GameState, node: MapNode, act: Activity, uphill: boolean): void {
  const night = isNight(state.hour);
  const indoor = act !== 'travel' && INDOOR.has(node.kind);

  // 허기, 갈증
  add(state, 'hunger', act === 'sleep' ? -0.8 : act === 'travel' ? -1.6 : -1.0);
  add(state, 'thirst', act === 'sleep' ? -0.8 : act === 'travel' ? -2.0 : -1.2);

  // 피로
  if (act === 'travel') add(state, 'fatigue', (uphill ? -4.2 : -3.0) * (night ? 1.4 : 1));
  else if (act === 'rest') add(state, 'fatigue', 5);
  else if (act === 'sleep') add(state, 'fatigue', indoor ? 11 : 8);
  else add(state, 'fatigue', -1.5);

  // 체온. 체감 6도 아래부터 식는다. 지붕 아래면 훨씬 덜하고, 웅크리고 자면 조금 덜하다
  const env = envTemp(state, node);
  const chill = Math.max(0, 6 - env);
  const cold = chill * (indoor ? 0.1 : act === 'sleep' ? 0.2 : 0.35);
  if (cold > 0) add(state, 'temp', -cold);
  else if (env >= 10) add(state, 'temp', act === 'travel' ? 3 : 2);

  // 피폭
  add(state, 'rad', radPerHour(state, node, indoor));

  // 정신
  if (act === 'sleep') add(state, 'mind', node.kind === 'temple' ? 4 : 2.5);
  else if (act === 'rest') add(state, 'mind', 1);
  else if (night) add(state, 'mind', -1);
  const s = state.stats;
  if (s.hunger < 20 || s.thirst < 20 || s.temp < 30) add(state, 'mind', -1);
  if (s.rad >= 60) add(state, 'mind', -0.8);

  // 체력
  let dmg = 0;
  if (s.hunger <= 0) dmg += 2;
  if (s.thirst <= 0) dmg += 4;
  if (s.temp < 20) dmg += 3;
  if (s.fatigue <= 0) dmg += 1;
  if (s.rad >= 60) dmg += (s.rad - 60) / 15;
  if (s.mind <= 0) dmg += 1;
  if (dmg > 0) add(state, 'hp', -dmg);
  else if (act === 'sleep' && s.hunger > 40 && s.thirst > 40) add(state, 'hp', 1.5);

  // 시계
  state.hour += 1;
  if (state.hour >= 24) {
    state.hour = 0;
    state.day += 1;
  }
}

export interface TickResult {
  died: boolean;
}

// hours 만큼 시간을 흘린다. 날씨도 함께 흐른다
export function passHours(state: GameState, rng: Rng, node: MapNode, hours: number, act: Activity, uphill = false): TickResult {
  for (let i = 0; i < hours; i++) {
    tickOneHour(state, node, act, uphill);
    tickWeather(state, rng, 1);
    if (state.stats.hp <= 0) {
      state.over = 'dead';
      state.overText = deathCause(state);
      addLog(state, state.overText);
      return { died: true };
    }
  }
  return { died: false };
}

function deathCause(state: GameState): string {
  const s = state.stats;
  if (s.thirst <= 0) return `${state.day}일째, 물을 찾지 못한 채 쓰러졌다.`;
  if (s.temp < 20) return `${state.day}일째, 능선의 추위 속에서 잠들었다.`;
  if (s.rad >= 60) return `${state.day}일째, 피폭이 몸을 무너뜨렸다.`;
  if (s.hunger <= 0) return `${state.day}일째, 굶주림 끝에 걸음을 멈췄다.`;
  return `${state.day}일째, 산에서 죽었다.`;
}

// 수치 경고 문구. 로그에 한 번씩 찍어준다
export function warnings(state: GameState): string[] {
  const s = state.stats;
  const out: string[] = [];
  if (s.thirst < 25) out.push('목이 타들어간다.');
  if (s.hunger < 25) out.push('배가 고파 손이 떨린다.');
  if (s.temp < 35) out.push('몸이 떨리고 손끝이 굳는다.');
  if (s.fatigue < 25) out.push('다리가 풀린다. 쉬어야 한다.');
  if (s.rad >= 50) out.push('속이 메스껍고 입안에서 쇠맛이 난다.');
  if (s.mind < 25) out.push('생각이 흐려진다.');
  return out;
}
