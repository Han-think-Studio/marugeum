import { Rng } from '../core/rng';
import { DIFFICULTY, settings } from './settings';
import { CRISIS_INFO, EQUIP_INFO, INDOOR, REGROWS, REGROW_DAYS, WEAR_CHANCE, WEAR_RATE, type CrisisKind, type GameState, type MapNode, type StatKey } from '../core/types';
import { envTemp, isNight, tickWeather, absHour, crisisActive } from './weather';
import { hasEquip, tentAt } from './equip';
import { facilityRunning, spoilFresh, tickFacilities } from './facilities';
import { refreshObjects } from './objects';
import { addLog } from './log';

export type Activity = 'travel' | 'rest' | 'sleep' | 'forage' | 'work';

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

function add(state: GameState, key: StatKey, delta: number): void {
  state.stats[key] = clamp(state.stats[key] + delta);
}

// 날이 갈수록 바다에서 오는 비가 더러워진다. 오래 머물 수 없게 만드는 시계
export function falloutFactor(state: GameState): number {
  return 1 + (state.day - 1) * DIFFICULTY[settings.difficulty].fallout;
}

// 시간당 피폭량. 낮은 땅, 비, 바다 쪽 바람이 겹치면 급격히 오른다
export function radPerHour(state: GameState, node: MapNode, indoor: boolean): number {
  let r = node.alt < 0.3 ? 0.7 : node.alt < 0.5 ? 0.35 : node.alt < 0.7 ? 0.15 : 0.08;
  r *= 1 + node.stage * 0.06; // 북쪽으로 갈수록 짙어진다
  r *= falloutFactor(state);
  const roof = indoor && node.camp && node.upgrades.includes('roof');
  if (state.weather === 'rain') r *= roof ? 1.5 : 3;
  if (state.wind !== 'calm' && state.wind === node.side) r *= 1.8;
  if (!indoor && state.crisis && state.crisis.kind === 'fallout' && crisisActive(state)) r *= 1.8; // 낙진비. 지붕 아래는 여느 비와 같다
  if (indoor) r *= node.camp && node.campTier >= 3 ? 0.15 : node.camp && node.campTier === 2 ? 0.25 : 0.35;
  if (indoor && node.camp && node.upgrades.includes('earth')) r *= 0.5;
  return r;
}

export interface TickOpts {
  uphill?: boolean;
  known?: boolean; // 아는 길이면 덜 지친다
  heavy?: boolean; // 짐이 무거우면 더 지친다
}

// 한 시간이 흐를 때 몸에 일어나는 일
function tickOneHour(state: GameState, rng: Rng, node: MapNode, act: Activity, opts: TickOpts): void {
  const night = isNight(state.hour);
  // 텐트가 있으면 지붕 없는 곳에서도 비와 바람을 반쯤 막는다. 바위굴은 그보다 낫고, 지붕 있는 거점이 가장 낫다
  const house = INDOOR.has(node.kind);
  const caveHere = act !== 'travel' && !house && node.cave;
  const tentHere = act !== 'travel' && !house && !caveHere && tentAt(state, node);
  const tent = tentHere || caveHere;
  const indoor = act !== 'travel' && (house || tent);
  const camp = indoor && node.camp;
  const tier = camp ? node.campTier : 0;
  const heater = camp && facilityRunning(node, 'heater');
  const lamp = camp && facilityRunning(node, 'lamp');

  // 허기, 갈증
  const need = DIFFICULTY[settings.difficulty].need;
  add(state, 'hunger', (act === 'sleep' ? -0.9 : act === 'travel' ? -1.85 : -1.15) * need);
  add(state, 'thirst', (act === 'sleep' ? -0.9 : act === 'travel' ? -2.3 : -1.4) * need);

  // 피로
  if (act === 'travel') {
    const base = opts.uphill ? -4.2 : -3.0;
    add(state, 'fatigue', base * (night ? 1.4 : 1) * (opts.known ? 0.8 : 1) * (opts.heavy ? 1.3 : 1));
  } else if (act === 'rest') add(state, 'fatigue', 5);
  else if (act === 'sleep') add(state, 'fatigue', camp ? (tier >= 3 ? 12 : 11.5) : house ? 11 : indoor ? 10 : 8);
  else if (act === 'work') add(state, 'fatigue', -2.5);
  else add(state, 'fatigue', -1.5);

  // 체온. 체감 6도 아래부터 식는다. 지붕 아래면 훨씬 덜하고, 웅크리고 자면 조금 덜하다
  // 불 옆이면 거의 식지 않고 오히려 덥혀지고, 담요는 잘 때 추위를 절반으로 줄인다
  const fire = act !== 'travel' && state.fire !== null && state.fire.nodeId === node.id;
  let env = envTemp(state, node);
  if (act === 'travel' || act === 'work') env += 3; // 몸을 쓰면 데워진다
  if (camp && node.upgrades.includes('roof') && state.weather === 'rain') env += 5; // 비가 새지 않는다
  if (!indoor && state.weather === 'rain' && hasEquip(state, 'raincoat')) env += 5; // 우비
  const chill = Math.max(0, 6 - env);
  let coldMul = camp ? (tier >= 3 ? 0.05 : tier === 2 ? 0.08 : 0.12) : house ? 0.1 : caveHere ? 0.12 : tentHere ? 0.15 : act === 'sleep' ? 0.2 : 0.35;
  if (!indoor && node.windbreak) coldMul *= 0.5;
  if (camp && node.upgrades.includes('window')) coldMul *= 0.5;
  if (act === 'sleep' && hasEquip(state, 'blanket')) coldMul *= 0.5;
  if (fire) coldMul *= 0.2;
  const cold = chill * coldMul;
  if (cold > 0) add(state, 'temp', -cold);
  else if (env >= 10) add(state, 'temp', act === 'travel' ? 3 : 2);
  if (camp && act === 'sleep') add(state, 'temp', tier >= 3 ? 2 : 1);
  if (fire) add(state, 'temp', 3);
  if (fire && camp && node.upgrades.includes('hearth')) add(state, 'temp', 2);
  if (heater) add(state, 'temp', 3);
  if (fire && state.fire) {
    state.fire.hours -= 1;
    if (state.fire.hours <= 0) {
      state.fire = null;
      addLog(state, '불이 꺼졌다.');
    }
  }

  // 피폭
  let radNow = radPerHour(state, node, indoor) * (tentHere ? 1.5 : 1); // 천막은 낙진을 반밖에 못 막는다. 바위는 막는다
  if (!indoor && state.weather === 'rain' && hasEquip(state, 'mask')) radNow *= 0.5; // 방독면
  add(state, 'rad', radNow);
  // 거점에서 배부르고 목마르지 않게 쉬면 몸이 조금씩 피폭을 덜어낸다. 집 거점이 가장 잘
  if (camp && state.stats.hunger > 40 && state.stats.thirst > 40) {
    if (act === 'sleep') add(state, 'rad', tier >= 3 ? -0.6 : -0.35);
    else if (act === 'rest') add(state, 'rad', -0.15);
  }

  // 정신
  if (act === 'sleep') add(state, 'mind', (camp ? (tier >= 3 ? 3.5 : 3) : node.kind === 'temple' ? 4 : 2.5) + (fire ? 1 : 0) + (lamp ? 0.5 : 0));
  else if (act === 'rest') add(state, 'mind', 1);
  else if (night) add(state, 'mind', lamp ? 0 : -1);
  const s = state.stats;
  if (s.hunger < 20 || s.thirst < 20 || s.temp < 30) add(state, 'mind', -1);
  if (s.rad >= 60) add(state, 'mind', -0.8);

  // 체력
  let dmg = 0;
  if (s.hunger <= 0) dmg += 2;
  if (s.thirst <= 0) dmg += 4;
  if (s.temp < 20) dmg += 3;
  if (s.fatigue <= 0) dmg += 1;
  if (s.rad >= 70) dmg += (s.rad - 70) / 12; // 60 이 넘으면 격리동, 70 이 넘으면 몸이 무너지기 시작한다
  if (s.mind <= 0) dmg += 1;
  if (dmg > 0) add(state, 'hp', -dmg);
  else if (act === 'sleep' && s.hunger > 40 && s.thirst > 40) add(state, 'hp', camp ? (tier >= 3 ? 2.5 : 2) : 1.5);

  // 거점 시설은 내가 어디 있든 돈다
  tickFacilities(state, rng);

  // 시계
  state.hour += 1;
  if (state.hour >= 24) {
    state.hour = 0;
    state.day += 1;
    onNewDay(state, rng);
  }
}

// 자정마다. 자연 자원이 조금 돌아오고, 낙진 소식이 온다
function onNewDay(state: GameState, rng: Rng): void {
  // 지닌 장비가 닳는다. 닳는 장비는 상태가 줄고, 나머지는 가끔 고장 난다. 거점기에 야영장에 있으면 쉬는 날이다
  const resting = state.phase === 'base' && state.nodeId === state.baseId;
  const harsh = (state.weather === 'rain' ? 1.5 : 1) * (crisisActive(state) ? 1.5 : 1);
  for (const e of state.equip) {
    if (e.broken) continue;
    const rate = WEAR_RATE[e.kind];
    if (rate !== undefined) {
      if (resting) continue;
      const before = e.cond ?? 100;
      e.cond = Math.max(0, before - rate * harsh);
      const name = EQUIP_INFO[e.kind].label;
      if (e.cond <= 0) {
        e.broken = true;
        addLog(state, `${name}가 끝내 망가졌다. 정비를 미룬 값이다. 부품이 있으면 고칠 수 있다.`);
      } else if (before > 30 && e.cond <= 30) {
        addLog(state, `${name}가 많이 닳았다(${Math.round(e.cond)}%). 거점에서 정비해야 한다.`);
      }
      continue;
    }
    const c = WEAR_CHANCE[e.kind] ?? 0;
    if (c > 0 && rng.chance(c)) {
      e.broken = true;
      addLog(state, `${EQUIP_INFO[e.kind].label}가 고장 났다. 험한 길에 부딪히고 젖은 탓이다.`);
    }
  }
  for (const n of state.nodes) {
    if (!REGROWS.has(n.kind) || n.forageLeft >= n.forageMax) continue;
    if (state.day - n.lastForageDay >= REGROW_DAYS) {
      n.forageLeft += 1;
      n.lastForageDay = state.day;
    }
  }
  const notes: Record<number, string> = {
    4: '비가 점점 더 더러워진다. 한곳에 오래 머물 수 없다.',
    6: '아침에 첫서리가 내렸다. 풀잎이 하얗다. 겨울이 오고 있다.',
    8: '능선 위에서도 입안에 쇠맛이 돈다. 서둘러야 한다.',
    9: '첫눈이 날렸다. 쌓이지는 않았다. 아직은.',
    12: '하늘이 누렇다. 남쪽은 이미 끝났을 것이다.',
    13: '겨울이다. 능선의 밤은 이제 지붕과 불 없이는 넘을 수 없다.',
    16: '이제는 비를 한 번만 맞아도 위험하다.',
  };
  if (notes[state.day]) addLog(state, notes[state.day]);
  spoilFresh(state);
  refreshObjects(state);
}

export interface TickResult {
  died: boolean;
}

// hours 만큼 시간을 흘린다. 날씨도 함께 흐른다
// 고비. 징조, 시작, 버틴 시간 세기, 끝. 끝나면 다음 고비를 정한다
function tickCrisis(state: GameState, rng: Rng, node: MapNode, act: Activity, count = true): void {
  const now = absHour(state);
  if (!state.crisis) state.crisis = planCrisis(rng, now + rng.int(66, 90));
  const c = state.crisis;
  const info = CRISIS_INFO[c.kind];
  if (!c.signed && now >= c.start - 12 && now < c.start) {
    c.signed = true;
    addLog(state, info.sign);
  }
  if (now >= c.start && now < c.end) {
    if (!c.started) {
      c.started = true;
      c.signed = true;
      addLog(state, `[고비] ${info.start}`);
    }
    if (c.kind === 'fallout') state.weather = 'rain';
    if (!count) return;
    const fire = state.fire !== null && state.fire.nodeId === node.id;
    const sheltered = act !== 'travel' && (INDOOR.has(node.kind) || node.cave || node.camp || fire || hasEquip(state, 'tent'));
    if (sheltered) c.sheltered += 1;
    else c.exposed += 1;
  } else if (now >= c.end && c.started) {
    const good = c.sheltered >= (c.sheltered + c.exposed) * 0.7;
    add(state, 'mind', good ? 12 : -10);
    const text = `${good ? info.good : info.bad} (지붕·불 아래 ${c.sheltered}시간, 밖에서 ${c.exposed}시간)`;
    addLog(state, `[고비를 넘겼다] ${text}`);
    if (!state.event && state.over === 'none') state.event = { id: `crisis_${c.kind}`, result: text };
    state.crisis = planCrisis(rng, c.end + rng.int(72, 100));
  }
}

function planCrisis(rng: Rng, start: number): import('../core/types').Crisis {
  const day = Math.floor(start / 24) + 1;
  const kinds: CrisisKind[] = day >= 9 ? ['cold', 'snow', 'snow', 'fallout'] : day >= 7 ? ['cold', 'snow', 'fallout'] : ['cold', 'fallout'];
  const kind = kinds[rng.int(0, kinds.length - 1)];
  const len = Math.min(26, 14 + day);
  return { kind, start, end: start + len, warned: false, signed: false, started: false, sheltered: 0, exposed: 0 };
}

export function passHours(state: GameState, rng: Rng, node: MapNode, hours: number, act: Activity, opts: TickOpts = {}): TickResult {
  for (let i = 0; i < hours; i++) {
    tickCrisis(state, rng, node, act);
    tickOneHour(state, rng, node, act, opts);
    tickWeather(state, rng, 1);
    if (state.stats.hp <= 0) {
      state.over = 'dead';
      state.overText = deathCause(state);
      addLog(state, state.overText);
      return { died: true };
    }
  }
  tickCrisis(state, rng, node, act, false); // 행동이 끝난 그 시각의 징조·시작·끝
  return { died: false };
}

function deathCause(state: GameState): string {
  const s = state.stats;
  if (s.thirst <= 0) return `${state.day}일째, 물을 찾지 못한 채 쓰러졌다. 사진은 주머니에 있었다.`;
  if (s.temp < 20) return `${state.day}일째, 능선의 추위 속에서 잠들었다. 사진은 가슴에 있었다.`;
  if (s.rad >= 60) return `${state.day}일째, 피폭이 몸을 무너뜨렸다. 사진은 끝까지 쥐고 있었다.`;
  if (s.hunger <= 0) return `${state.day}일째, 굶주림 끝에 걸음을 멈췄다. 사진은 배낭 맨 위에 있었다.`;
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
