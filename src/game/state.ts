import { Rng } from '../core/rng';
import {
  FIRE_HOURS, FOOD_UNIT, GEAR_LABEL, INDOOR, PACK_BIG, PACK_SMALL, WATER_UNIT, WOOD_NODES, edgeKey,
  type GameState, type GearKey, type MapNode, type PackCap, type Stats, type Store,
} from '../core/types';
import { generateMap } from '../map/generate';
import { addLog } from './log';
import { passHours, warnings } from './survival';
import { choose, closeEvent, maybeArrive, maybeNight } from './events';
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
    pack: { water: 1, dirty: 0, food: 1, wood: 0 },
    gear: { blanket: false, bigPack: false, geiger: false },
    fire: null,
    known: {},
    flags: {},
    event: null,
    log: [],
    over: 'none',
    overText: '',
    rngState: (seed ^ 0x9e3779b9) >>> 0,
  };
  const rng = takeRng(state);
  rollWeather(state, rng, true);
  giveRng(state, rng);
  addLog(state, '지리산 천왕봉. 바다는 죽었고 낮은 땅은 비에 젖으면 위험하다. 배낭에는 물 한 통과 먹을 것 하나. 능선을 따라 북쪽으로 간다.');
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

export function packCap(state: GameState): PackCap {
  return state.gear.bigPack ? PACK_BIG : PACK_SMALL;
}

// 이벤트 선택을 기다리는 동안에는 다른 행동을 못 한다
export function busy(state: GameState): boolean {
  return state.over !== 'none' || state.event !== null;
}

export function currentNode(state: GameState): MapNode {
  return state.nodes[state.nodeId];
}

// 길은 양방향이다. 앞으로 이어지는 노드와 나를 가리키는 노드 모두
export function neighbors(state: GameState, node: MapNode = currentNode(state)): MapNode[] {
  const out: MapNode[] = node.links.map((id) => state.nodes[id]);
  for (const n of state.nodes) if (n.links.includes(node.id) && !out.includes(n)) out.push(n);
  return out.sort((a, b) => (a.stage - b.stage) || (a.y - b.y));
}

// 북쪽 이웃만. 숫자 키와 지도 하이라이트에 쓴다
export function reachable(state: GameState): MapNode[] {
  return neighbors(state);
}

export function isKnown(state: GameState, a: MapNode, b: MapNode): boolean {
  return !!state.known[edgeKey(a.id, b.id)];
}

// 이동 시간. 기본 5시간에 고도 차이, 안개, 비, 밤, 피로가 더해진다. 아는 길은 30% 빠르고 밤·안개 페널티가 절반
export function travelHours(state: GameState, from: MapNode, to: MapNode): number {
  const known = isKnown(state, from, to);
  const diff = Math.abs(from.alt - to.alt);
  let h = (5 + diff * 8) * (known ? 0.7 : 1);
  const pen = known ? 0.5 : 1;
  if (state.weather === 'fog') h += 1 * pen;
  if (state.weather === 'rain') h += 1;
  if (isNight(state.hour)) h += 2 * pen;
  if (state.stats.fatigue < 30) h += 2;
  return Math.max(2, Math.round(h));
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
  if (busy(state)) return false;
  const from = currentNode(state);
  const to = state.nodes[id];
  if (!to || !neighbors(state).includes(to)) return false;
  const known = isKnown(state, from, to);
  const hours = travelHours(state, from, to);
  const rng = takeRng(state);
  // 이동 중에는 출발지와 도착지의 중간 고도에 노출된다고 본다
  const midway: MapNode = { ...to, alt: (from.alt + to.alt) / 2, side: to.side, camp: false };
  const res = passHours(state, rng, midway, hours, 'travel', { uphill: to.alt > from.alt + 0.1, known });
  giveRng(state, rng);
  if (res.died) {
    addLog(state, `${to.name}으로 가는 길이었다.`);
    return true;
  }
  state.known[edgeKey(from.id, to.id)] = true;
  if (state.fire) {
    state.fire = null;
    addLog(state, '불을 밟아 끄고 떠났다.');
  }
  state.nodeId = id;
  const first = !to.visited;
  to.visited = true;
  const dir = to.alt > from.alt + 0.1 ? '올라' : to.alt < from.alt - 0.1 ? '내려' : '걸어';
  const back = to.stage < from.stage ? '되돌아' : '';
  addLog(state, `${hours}시간을 ${back}${dir}가 ${to.name}에 ${first ? '처음 ' : '다시 '}닿았다.${known ? ' 아는 길이라 수월했다.' : ''}`);
  if (to.kind === 'goal') {
    state.over = 'won';
    state.overText = `${state.day}일 만에 향로봉 안전지대에 닿았다. 누적 피폭 ${Math.round(state.stats.rad)}.`;
    addLog(state, '안전지대의 불빛이 보인다. 살아서 도착했다.');
    return true;
  }
  afterAction(state);
  const rng2 = takeRng(state);
  maybeArrive(state, rng2, to, first);
  giveRng(state, rng2);
  return true;
}

// 이벤트 선택지 고르기. 결과가 나오면 확인(dismissEvent)으로 닫는다
export function pickChoice(state: GameState, idx: number): boolean {
  if (state.over !== 'none' || !state.event) return false;
  const rng = takeRng(state);
  const ok = choose(state, rng, currentNode(state), idx, packCap(state));
  giveRng(state, rng);
  if (ok) afterAction(state);
  return ok;
}

export function dismissEvent(state: GameState): boolean {
  return closeEvent(state);
}

export function rest(state: GameState): boolean {
  if (busy(state)) return false;
  const node = currentNode(state);
  const rng = takeRng(state);
  const res = passHours(state, rng, node, 2, 'rest');
  giveRng(state, rng);
  if (!res.died) addLog(state, INDOOR.has(node.kind) ? '지붕 아래서 두 시간을 쉬었다.' : '바위에 기대 두 시간을 쉬었다.');
  afterAction(state);
  return true;
}

export function sleep(state: GameState): boolean {
  if (busy(state)) return false;
  const node = currentNode(state);
  const rng = takeRng(state);
  const res = passHours(state, rng, node, 8, 'sleep');
  giveRng(state, rng);
  if (!res.died) {
    const where = node.camp ? '거점의 잠자리에서' : node.kind === 'temple' ? '법당 구석에서' : INDOOR.has(node.kind) ? '벽 안쪽에서' : '바람을 등지고';
    addLog(state, `${where} 여덟 시간을 잤다.`);
  }
  afterAction(state);
  if (!res.died) {
    const rng2 = takeRng(state);
    maybeNight(state, rng2, node);
    giveRng(state, rng2);
  }
  return true;
}

// ---------- 물 ----------

export type WaterKind = 'spring' | 'well' | 'stream' | 'stored' | 'rain' | 'none';

// 이 자리에서 구할 수 있는 물의 종류
export function waterKind(state: GameState): WaterKind {
  const n = currentNode(state);
  if (n.kind === 'spring' || n.kind === 'temple') return 'spring';
  if (n.kind === 'valley') return 'stream';
  if (n.kind === 'village' && n.waterLeft !== 0) return 'well';
  if (n.waterLeft > 0) return 'stored';
  if (state.weather === 'rain') return 'rain';
  return 'none';
}

export const WATER_LABEL: Record<WaterKind, string> = {
  spring: '깨끗한 물', stream: '계곡물 · 오염', well: '우물 · 오염', stored: '저장된 물', rain: '빗물 · 오염', none: '물이 없다',
};

function isDirty(kind: WaterKind): boolean {
  return kind === 'stream' || kind === 'well' || kind === 'rain';
}

export function canDrink(state: GameState): boolean {
  return waterKind(state) !== 'none' || state.pack.water > 0 || state.pack.dirty > 0;
}

function applyDirty(state: GameState, rng: Rng, kind: WaterKind | 'pack'): number {
  const dose = kind === 'rain' ? rng.range(3, 6) : kind === 'stream' && state.weather === 'rain' ? rng.range(4, 8) : rng.range(1.5, 3.5);
  state.stats.rad = Math.min(100, state.stats.rad + dose);
  return dose;
}

// 마시기. 자리에 물이 있으면 거기서, 없으면 배낭에서
export function drink(state: GameState): boolean {
  if (busy(state)) return false;
  const kind = waterKind(state);
  const node = currentNode(state);
  const rng = takeRng(state);
  const s = state.stats;
  if (kind !== 'none') {
    if (kind === 'stored') {
      node.waterLeft -= 1;
      s.thirst = Math.min(100, s.thirst + 50);
      addLog(state, node.kind === 'military' ? '물탱크의 정수된 물을 마셨다.' : '선반 뒤 생수 한 병. 아껴 마셨다.');
    } else if (isDirty(kind)) {
      s.thirst = Math.min(100, s.thirst + (kind === 'rain' ? 40 : 60));
      const dose = applyDirty(state, rng, kind);
      const text: Record<string, string> = {
        stream: dose > 3 ? '계곡물을 마셨다. 빗물이 섞여 있다. 입안이 쓰다.' : '계곡물을 마셨다. 낮은 땅의 물이라 찜찜하다.',
        well: '마을 우물물을 길어 마셨다. 쇠맛이 난다.',
        rain: '빗물을 받아 마셨다. 바다를 지나온 비라는 걸 알면서도.',
      };
      addLog(state, text[kind]);
    } else {
      s.thirst = 100;
      addLog(state, node.kind === 'temple' ? '절 뒤 석간수가 아직 흐른다. 차고 깨끗하다.' : '바위틈에서 나오는 물이다. 차고 깨끗하다. 실컷 마셨다.');
    }
  } else if (state.pack.water > 0) {
    state.pack.water -= 1;
    s.thirst = Math.min(100, s.thirst + WATER_UNIT);
    addLog(state, '배낭의 물을 한 통 마셨다.');
  } else if (state.pack.dirty > 0) {
    state.pack.dirty -= 1;
    s.thirst = Math.min(100, s.thirst + WATER_UNIT);
    applyDirty(state, rng, 'pack');
    addLog(state, '배낭의 오염된 물을 마셨다. 다른 수가 없었다.');
  } else {
    giveRng(state, rng);
    return false;
  }
  giveRng(state, rng);
  afterAction(state);
  return true;
}

export function canFill(state: GameState): boolean {
  const kind = waterKind(state);
  if (kind === 'none') return false;
  return state.pack.water + state.pack.dirty < packCap(state).water;
}

// 물 담기. 배낭이 찰 때까지. 저장된 물은 남은 횟수만큼만
export function fill(state: GameState): boolean {
  if (busy(state) || !canFill(state)) return false;
  const kind = waterKind(state);
  const node = currentNode(state);
  let n = 0;
  const cap = packCap(state);
  while (state.pack.water + state.pack.dirty < cap.water) {
    if (kind === 'stored') {
      if (node.waterLeft <= 0) break;
      node.waterLeft -= 1;
    }
    if (isDirty(kind)) state.pack.dirty += 1;
    else state.pack.water += 1;
    n += 1;
  }
  if (n === 0) return false;
  addLog(state, isDirty(kind) ? `오염된 물을 ${n}통 담았다. 급할 때만 마셔야 한다.` : `물을 ${n}통 담았다.`);
  afterAction(state);
  return true;
}

// ---------- 음식 ----------

export function canEat(state: GameState): boolean {
  return state.pack.food > 0;
}

export function eat(state: GameState): boolean {
  if (busy(state) || !canEat(state)) return false;
  state.pack.food -= 1;
  state.stats.hunger = Math.min(100, state.stats.hunger + FOOD_UNIT);
  addLog(state, '배낭의 먹을 것을 하나 꺼내 먹었다.');
  afterAction(state);
  return true;
}

export function canForage(state: GameState): boolean {
  return currentNode(state).forageLeft > 0 && state.pack.food < packCap(state).food;
}

const FORAGE_CHANCE: Record<string, number> = {
  peak: 0.35, pass: 0.4, shelter: 0.6, spring: 0.5, temple: 0.65, military: 0.7, valley: 0.6, village: 0.75,
};

export function forage(state: GameState): boolean {
  if (busy(state) || !canForage(state)) return false;
  const node = currentNode(state);
  node.forageLeft -= 1;
  node.lastForageDay = state.day;
  const rng = takeRng(state);
  const res = passHours(state, rng, node, 2, 'forage');
  if (!res.died) {
    const gearHere = (GEAR_FINDS[node.kind] ?? []).filter((g) => !state.gear[g.gear]);
    if (gearHere.length > 0 && rng.chance(0.3)) {
      const g = rng.pick(gearHere);
      state.gear[g.gear] = true;
      addLog(state, g.text);
    } else if (rng.chance(FORAGE_CHANCE[node.kind] ?? 0.4)) {
      const found = rng.pick(FINDS[node.kind] ?? FINDS.peak);
      const units = Math.min(found.units, packCap(state).food - state.pack.food);
      state.pack.food += units;
      if (found.rad) state.stats.rad = Math.min(100, state.stats.rad + found.rad);
      addLog(state, `${found.text} 먹을 것 ${units}개를 배낭에 넣었다.`);
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
  units: number;
  rad?: number;
}

const FINDS: Record<string, Find[]> = {
  peak: [
    { text: '바위 틈에서 마른 산딸기를 찾았다.', units: 1 },
    { text: '등산객이 두고 간 에너지바.', units: 1 },
  ],
  pass: [
    { text: '고갯마루 매점 잔해에서 캔을 찾았다.', units: 1 },
    { text: '도토리를 한 줌 주웠다. 떫지만 먹을 수 있다.', units: 1 },
  ],
  shelter: [
    { text: '대피소 선반에 라면이 남아 있었다.', units: 2 },
    { text: '찬장 구석의 통조림. 유통기한은 보지 않기로 했다.', units: 2 },
  ],
  spring: [
    { text: '약수터 옆 밭에서 무를 뽑았다.', units: 1, rad: 1 },
    { text: '물가에 자란 미나리를 뜯었다.', units: 1 },
  ],
  temple: [
    { text: '공양간에 쌀 한 포대가 남아 있다. 조금 덜어 담았다.', units: 2 },
    { text: '장독대의 된장. 손가락으로 찍어 먹어도 힘이 난다.', units: 1 },
  ],
  military: [
    { text: '전투식량 한 상자. 오래 버틸 수 있다.', units: 2 },
    { text: '건빵과 별사탕. 웃음이 났다.', units: 1 },
  ],
  valley: [
    { text: '계곡에서 물고기를 잡았다.', units: 2, rad: 3 },
    { text: '물가 바위에서 다슬기를 주웠다.', units: 1, rad: 2 },
  ],
  village: [
    { text: '빈집 부엌에서 쌀과 김을 찾았다.', units: 2, rad: 2 },
    { text: '마당의 감나무. 떨어진 감이 익어 있다.', units: 1, rad: 2 },
    { text: '지하 저장고의 김치. 시큼하지만 먹을 만하다.', units: 1, rad: 1 },
  ],
};

interface GearFind {
  gear: GearKey;
  text: string;
}

// 주워 쓰는 도구. 한 번 찾으면 끝까지 지닌다
const GEAR_FINDS: Record<string, GearFind[]> = {
  village: [
    { gear: 'blanket', text: '안방 장롱에서 두꺼운 담요를 꺼냈다. 밤이 덜 무서워졌다.' },
    { gear: 'bigPack', text: '창고에 등산용 큰 배낭이 걸려 있었다. 짐을 옮겨 담았다.' },
  ],
  shelter: [
    { gear: 'blanket', text: '대피소 침상의 담요를 챙겼다. 밤이 덜 무서워졌다.' },
    { gear: 'bigPack', text: '누군가 두고 간 큰 배낭. 주인은 돌아오지 않을 것이다.' },
  ],
  military: [
    { gear: 'geiger', text: '벙커 선반에서 가이거 계수기를 찾았다. 켜자마자 딸깍거린다.' },
    { gear: 'bigPack', text: '군용 배낭 하나. 크고 튼튼하다.' },
  ],
  temple: [{ gear: 'blanket', text: '요사채에 승려가 덮던 이불이 남아 있었다. 담요로 쓴다.' }],
};

export function gearList(state: GameState): string[] {
  return (Object.keys(state.gear) as GearKey[]).filter((k) => state.gear[k]).map((k) => GEAR_LABEL[k]);
}

// ---------- 땔감과 불 ----------

export function canGatherWood(state: GameState): boolean {
  return WOOD_NODES.has(currentNode(state).kind) && state.pack.wood < packCap(state).wood;
}

// 땔감 모으기. 한 시간. 마을과 절은 널빤지와 장작이 있어 넉넉하다
export function gatherWood(state: GameState): boolean {
  if (busy(state) || !canGatherWood(state)) return false;
  const node = currentNode(state);
  const rng = takeRng(state);
  const res = passHours(state, rng, node, 1, 'work');
  if (!res.died) {
    const rich = node.kind === 'village' || node.kind === 'temple' || node.kind === 'shelter';
    const got = Math.min(rich ? rng.int(2, 3) : node.kind === 'peak' ? 1 : rng.int(1, 2), packCap(state).wood - state.pack.wood);
    state.pack.wood += got;
    addLog(state, rich ? `부서진 문짝과 장작을 쪼개 땔감 ${got}개를 챙겼다.` : `마른 가지를 주워 땔감 ${got}개를 챙겼다.`);
  }
  giveRng(state, rng);
  afterAction(state);
  return true;
}

export function hasFire(state: GameState): boolean {
  return state.fire !== null && state.fire.nodeId === state.nodeId;
}

// 비 오는 바깥에서는 불이 붙지 않는다
export function rainBlocksFire(state: GameState): boolean {
  return state.weather === 'rain' && !INDOOR.has(currentNode(state).kind);
}

export function canLightFire(state: GameState): boolean {
  return !hasFire(state) && state.pack.wood > 0 && !rainBlocksFire(state);
}

// 불 피우기. 땔감 하나로 열 시간
export function lightFire(state: GameState): boolean {
  if (busy(state) || !canLightFire(state)) return false;
  const node = currentNode(state);
  state.pack.wood -= 1;
  state.fire = { nodeId: node.id, hours: FIRE_HOURS };
  addLog(state, '불을 피웠다. 손끝이 녹고 어둠이 조금 물러난다.');
  afterAction(state);
  return true;
}

export function canBoil(state: GameState): boolean {
  return hasFire(state) && state.pack.dirty > 0;
}

// 끓여서 거르기. 불 위에서 한 시간. 오염된 물 두 통까지 깨끗해진다
export function boil(state: GameState): boolean {
  if (busy(state) || !canBoil(state)) return false;
  const node = currentNode(state);
  const rng = takeRng(state);
  const res = passHours(state, rng, node, 1, 'work');
  if (!res.died) {
    const n = Math.min(2, state.pack.dirty);
    state.pack.dirty -= n;
    state.pack.water += n;
    addLog(state, `물을 끓이고 천에 걸렀다. 깨끗한 물 ${n}통이 됐다.`);
  }
  giveRng(state, rng);
  afterAction(state);
  return true;
}

// ---------- 거점 ----------

export function canCamp(state: GameState): boolean {
  const n = currentNode(state);
  return INDOOR.has(n.kind) && !n.camp;
}

// 거점 세우기. 세 시간 일한다. 저장고가 생기고 여기서 자면 훨씬 낫다
export function makeCamp(state: GameState): boolean {
  if (busy(state) || !canCamp(state)) return false;
  const node = currentNode(state);
  const rng = takeRng(state);
  const res = passHours(state, rng, node, 3, 'work');
  giveRng(state, rng);
  if (!res.died) {
    node.camp = true;
    node.store = { water: 0, dirty: 0, food: 0, wood: 0 };
    addLog(state, `${node.name}에 거점을 세웠다. 창을 막고 잠자리를 만들고 저장고를 비웠다.`);
  }
  afterAction(state);
  return true;
}

export function atCamp(state: GameState): boolean {
  return currentNode(state).camp;
}

function storeTotal(s: Store): number {
  return s.water + s.dirty + s.food + s.wood;
}

// 맡기기. 배낭을 모두 저장고로
export function deposit(state: GameState): boolean {
  const node = currentNode(state);
  if (busy(state) || !node.camp || !node.store) return false;
  if (storeTotal(state.pack) === 0) return false;
  node.store.water += state.pack.water;
  node.store.dirty += state.pack.dirty;
  node.store.food += state.pack.food;
  node.store.wood += state.pack.wood;
  state.pack = { water: 0, dirty: 0, food: 0, wood: 0 };
  addLog(state, `저장고에 맡겼다. 물 ${node.store.water}, 오염수 ${node.store.dirty}, 먹을 것 ${node.store.food}, 땔감 ${node.store.wood}.`);
  return true;
}

// 챙기기. 저장고에서 배낭이 찰 때까지. 깨끗한 물부터
export function withdraw(state: GameState): boolean {
  const node = currentNode(state);
  if (busy(state) || !node.camp || !node.store) return false;
  const st = node.store;
  const p = state.pack;
  const cap = packCap(state);
  let moved = 0;
  while (p.water + p.dirty < cap.water && st.water > 0) { st.water--; p.water++; moved++; }
  while (p.water + p.dirty < cap.water && st.dirty > 0) { st.dirty--; p.dirty++; moved++; }
  while (p.food < cap.food && st.food > 0) { st.food--; p.food++; moved++; }
  while (p.wood < cap.wood && st.wood > 0) { st.wood--; p.wood++; moved++; }
  if (moved === 0) return false;
  addLog(state, `저장고에서 챙겼다. 배낭: 물 ${p.water}, 오염수 ${p.dirty}, 먹을 것 ${p.food}, 땔감 ${p.wood}.`);
  return true;
}
