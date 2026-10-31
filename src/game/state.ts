import { Rng } from '../core/rng';
import { INDOOR, type GameState, type MapNode, type Stats } from '../core/types';
import { generateMap } from '../map/generate';
import { addLog } from './log';
import { passHours, warnings } from './survival';
import { isNight, rollWeather } from './weather';

export { addLog } from './log';

export function createGame(seed: number): GameState {
  const mapRng = new Rng(seed);
  const nodes = generateMap(mapRng);
  const stats: Stats = { hp: 100, hunger: 90, thirst: 90, temp: 100, fatigue: 100, rad: 0, mind: 100 };
  const state: GameState = {
    seed,
    nodes,
    nodeId: 0,
    day: 1,
    hour: 7,
    stats,
    weather: 'clear',
    wind: 'calm',
    weatherLeft: 6,
    log: [],
    over: 'none',
    overText: '',
    rngState: (seed ^ 0x9e3779b9) >>> 0,
  };
  const rng = takeRng(state);
  rollWeather(state, rng, true);
  giveRng(state, rng);
  addLog(state, '지리산 천왕봉. 바다는 죽었고 낮은 땅은 비에 젖으면 위험하다. 능선을 따라 북쪽으로 간다.');
  return state;
}

// 진행용 난수는 상태에 숫자로만 저장한다. 저장과 불러오기를 위해서다
function takeRng(state: GameState): Rng {
  const rng = new Rng(1);
  rng.state = state.rngState;
  return rng;
}
function giveRng(state: GameState, rng: Rng): void {
  state.rngState = rng.state;
}

export function currentNode(state: GameState): MapNode {
  return state.nodes[state.nodeId];
}

export function reachable(state: GameState): MapNode[] {
  return currentNode(state).links.map((id) => state.nodes[id]);
}

// 이동 시간. 기본 3시간에 고도 차이, 안개, 밤, 피로가 더해진다
export function travelHours(state: GameState, from: MapNode, to: MapNode): number {
  const diff = Math.abs(from.alt - to.alt);
  let h = 5 + diff * 8;
  if (state.weather === 'fog') h += 1;
  if (state.weather === 'rain') h += 1;
  if (isNight(state.hour)) h += 2;
  if (state.stats.fatigue < 30) h += 2;
  return Math.max(3, Math.round(h));
}

export function timeLabel(state: GameState): string {
  const h = state.hour;
  const part = h < 5 ? '깊은 밤' : h < 8 ? '새벽' : h < 12 ? '아침' : h < 17 ? '낮' : h < 20 ? '저녁' : '밤';
  return `${state.day}일째 ${String(h).padStart(2, '0')}시 ${part}`;
}

function afterAction(state: GameState): void {
  if (state.over !== 'none') return;
  for (const w of warnings(state)) {
    if (state.log[state.log.length - 1] !== w) addLog(state, w);
  }
}

export function travelTo(state: GameState, id: number): boolean {
  if (state.over !== 'none') return false;
  const from = currentNode(state);
  if (!from.links.includes(id)) return false;
  const to = state.nodes[id];
  const hours = travelHours(state, from, to);
  const rng = takeRng(state);
  // 이동 중에는 출발지와 도착지의 중간 고도에 노출된다고 본다
  const midway: MapNode = { ...to, alt: (from.alt + to.alt) / 2, side: to.side };
  const res = passHours(state, rng, midway, hours, 'travel', to.alt > from.alt + 0.1);
  giveRng(state, rng);
  if (res.died) {
    addLog(state, `${to.name}으로 가는 길이었다.`);
    return true;
  }
  state.nodeId = id;
  to.visited = true;
  const dir = to.alt > from.alt + 0.1 ? '올라' : to.alt < from.alt - 0.1 ? '내려' : '걸어';
  addLog(state, `${hours}시간을 ${dir}가 ${to.name}에 닿았다.`);
  if (to.kind === 'goal') {
    state.over = 'won';
    state.overText = `${state.day}일 만에 향로봉 안전지대에 닿았다. 누적 피폭 ${Math.round(state.stats.rad)}.`;
    addLog(state, '안전지대의 불빛이 보인다. 살아서 도착했다.');
    return true;
  }
  afterAction(state);
  return true;
}

export function rest(state: GameState): boolean {
  if (state.over !== 'none') return false;
  const node = currentNode(state);
  const rng = takeRng(state);
  const res = passHours(state, rng, node, 2, 'rest');
  giveRng(state, rng);
  if (!res.died) addLog(state, INDOOR.has(node.kind) ? '지붕 아래서 두 시간을 쉬었다.' : '바위에 기대 두 시간을 쉬었다.');
  afterAction(state);
  return true;
}

export function sleep(state: GameState): boolean {
  if (state.over !== 'none') return false;
  const node = currentNode(state);
  const rng = takeRng(state);
  const res = passHours(state, rng, node, 8, 'sleep');
  giveRng(state, rng);
  if (!res.died) {
    const where = node.kind === 'temple' ? '법당 구석에서' : INDOOR.has(node.kind) ? '벽 안쪽에서' : '바람을 등지고';
    addLog(state, `${where} 여덟 시간을 잤다.`);
  }
  afterAction(state);
  return true;
}

export type WaterKind = 'spring' | 'well' | 'stream' | 'stored' | 'rain' | 'none';

// 이 자리에서 마실 수 있는 물의 종류
export function waterKind(state: GameState): WaterKind {
  const n = currentNode(state);
  if (n.kind === 'spring' || n.kind === 'temple') return 'spring';
  if (n.kind === 'valley') return 'stream';
  if (n.kind === 'village') return 'well';
  if (n.waterLeft > 0) return 'stored';
  if (state.weather === 'rain') return 'rain';
  return 'none';
}

export function canDrink(state: GameState): boolean {
  return waterKind(state) !== 'none';
}

export function drink(state: GameState): boolean {
  if (state.over !== 'none') return false;
  const kind = waterKind(state);
  if (kind === 'none') return false;
  const node = currentNode(state);
  const rng = takeRng(state);
  const s = state.stats;
  switch (kind) {
    case 'spring':
      s.thirst = 100;
      addLog(state, node.kind === 'temple' ? '절 뒤 석간수가 아직 흐른다. 차고 깨끗하다.' : '바위틈에서 나오는 물이다. 차고 깨끗하다. 실컷 마셨다.');
      break;
    case 'stream': {
      s.thirst = Math.min(100, s.thirst + 60);
      const dose = state.weather === 'rain' ? rng.range(4, 8) : rng.range(1, 3);
      s.rad = Math.min(100, s.rad + dose);
      addLog(state, dose > 3 ? '계곡물을 마셨다. 빗물이 섞여 있다. 입안이 쓰다.' : '계곡물을 마셨다. 낮은 땅의 물이라 찜찜하다.');
      break;
    }
    case 'well': {
      s.thirst = Math.min(100, s.thirst + 60);
      const dose = rng.range(2, 4);
      s.rad = Math.min(100, s.rad + dose);
      addLog(state, '마을 우물물을 길어 마셨다. 쇠맛이 난다.');
      break;
    }
    case 'stored':
      node.waterLeft -= 1;
      s.thirst = Math.min(100, s.thirst + 50);
      addLog(state, node.kind === 'military' ? '물탱크에 정수된 물이 남아 있었다.' : '선반 뒤 생수 한 병. 아껴 마셨다.');
      break;
    case 'rain': {
      s.thirst = Math.min(100, s.thirst + 40);
      const dose = rng.range(3, 6);
      s.rad = Math.min(100, s.rad + dose);
      addLog(state, '빗물을 받아 마셨다. 바다를 지나온 비라는 걸 알면서도.');
      break;
    }
  }
  giveRng(state, rng);
  afterAction(state);
  return true;
}

export function canForage(state: GameState): boolean {
  return currentNode(state).forageLeft > 0;
}

const FORAGE_CHANCE: Record<string, number> = {
  peak: 0.35, pass: 0.4, shelter: 0.6, spring: 0.5, temple: 0.65, military: 0.7, valley: 0.6, village: 0.75,
};

export function forage(state: GameState): boolean {
  if (state.over !== 'none' || !canForage(state)) return false;
  const node = currentNode(state);
  node.forageLeft -= 1;
  const rng = takeRng(state);
  const res = passHours(state, rng, node, 2, 'forage');
  if (!res.died) {
    if (rng.chance(FORAGE_CHANCE[node.kind] ?? 0.4)) {
      const found = rng.pick(FINDS[node.kind] ?? FINDS.peak);
      state.stats.hunger = Math.min(100, state.stats.hunger + found.food);
      if (found.rad) state.stats.rad = Math.min(100, state.stats.rad + found.rad);
      addLog(state, found.text);
    } else {
      addLog(state, rng.pick(['두 시간을 뒤졌지만 먹을 만한 게 없다.', '빈손이다. 누군가 먼저 다녀갔다.', '버섯이 있었지만 독버섯 같아 두고 왔다.']));
    }
  }
  giveRng(state, rng);
  afterAction(state);
  return true;
}

interface Find {
  text: string;
  food: number;
  rad?: number;
}

const FINDS: Record<string, Find[]> = {
  peak: [
    { text: '바위 틈에서 마른 산딸기를 찾았다.', food: 15 },
    { text: '등산객이 두고 간 에너지바 하나.', food: 25 },
  ],
  pass: [
    { text: '고갯마루 매점 잔해에서 캔 하나를 찾았다.', food: 30 },
    { text: '도토리를 한 줌 주웠다. 떫지만 먹을 수 있다.', food: 15 },
  ],
  shelter: [
    { text: '대피소 선반에 라면 두 봉지가 남아 있었다.', food: 40 },
    { text: '찬장 구석의 통조림. 유통기한은 보지 않기로 했다.', food: 35 },
  ],
  spring: [
    { text: '약수터 옆 밭에서 무를 뽑았다.', food: 20, rad: 1 },
    { text: '물가에 자란 미나리를 뜯었다.', food: 12 },
  ],
  temple: [
    { text: '공양간에 쌀 한 포대가 남아 있다. 조금 덜어 담았다.', food: 45 },
    { text: '장독대의 된장. 손가락으로 찍어 먹어도 힘이 난다.', food: 25 },
  ],
  military: [
    { text: '전투식량 한 상자. 오래 버틸 수 있다.', food: 50 },
    { text: '건빵과 별사탕. 웃음이 났다.', food: 25 },
  ],
  valley: [
    { text: '계곡에서 물고기를 잡았다. 날로 먹었다.', food: 35, rad: 3 },
    { text: '물가 바위에서 다슬기를 주웠다.', food: 15, rad: 2 },
  ],
  village: [
    { text: '빈집 부엌에서 쌀과 김을 찾았다.', food: 40, rad: 2 },
    { text: '마당의 감나무. 떨어진 감이 익어 있다.', food: 25, rad: 2 },
    { text: '지하 저장고의 김치. 시큼하지만 먹을 만하다.', food: 30, rad: 1 },
  ],
};
