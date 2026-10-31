import { Rng } from '../core/rng';
import {
  EQUIP_INFO, FIRE_HOURS, FOOD_UNIT, INDOOR, PACK_BIG, PACK_SMALL, REPAIR_BASE, REPAIR_HOURS, REPAIR_WITH_TOOLS,
  SUPPLY_KEYS, WATER_UNIT, WOOD_NODES, edgeKey, emptySupplies,
  type Equip, type EquipKind, type GameState, type MapNode, type PackCap, type Stats, type Supplies, type SupplyKey,
} from '../core/types';
import { generateMap } from '../map/generate';
import { addLog } from './log';
import { passHours, warnings } from './survival';
import { choose, closeEvent, maybeArrive, maybeNight } from './events';
import { canCarry, equipLabel, hasEquip, heavyCount } from './equip';
import { isNight, rollWeather } from './weather';

export { hasEquip, canCarry, equipLabel } from './equip';
export { addLog } from './log';

export function createGame(seed: number, opts: { knownStages?: number[]; runNo?: number } = {}): GameState {
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
    pack: { ...emptySupplies(), water: 1, food: 1 },
    equip: [],
    fire: null,
    known: {},
    flags: {},
    event: null,
    seen: [],
    knownStages: opts.knownStages ?? [],
    runNo: opts.runNo ?? 1,
    started: Date.now(),
    recorded: false,
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
  return hasEquip(state, 'bigPack') ? PACK_BIG : PACK_SMALL;
}

export function foodTotal(s: Supplies): number {
  return s.food + s.fresh;
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
  return foodTotal(state.pack) > 0;
}

// 먹기. 상하기 쉬운 신선식부터
export function eat(state: GameState): boolean {
  if (busy(state) || !canEat(state)) return false;
  if (state.pack.fresh > 0) {
    state.pack.fresh -= 1;
    addLog(state, '신선한 것부터 먹었다. 오래 두면 상한다.');
  } else {
    state.pack.food -= 1;
    addLog(state, '배낭의 먹을 것을 하나 꺼내 먹었다.');
  }
  state.stats.hunger = Math.min(100, state.stats.hunger + FOOD_UNIT);
  afterAction(state);
  return true;
}

export function canForage(state: GameState): boolean {
  return currentNode(state).forageLeft > 0;
}

const FORAGE_CHANCE: Record<string, number> = {
  peak: 0.4, pass: 0.5, shelter: 0.65, spring: 0.55, temple: 0.7, military: 0.75, valley: 0.65, village: 0.8,
};

// 뒤져서 나오는 것. 보급품이나 장비. 장비는 brokenChance 확률로 고장 난 채 나온다
interface Find {
  text: string;
  add?: Partial<Supplies>;
  rad?: number;
  equip?: EquipKind;
  brokenChance?: number;
}

const FINDS: Record<string, Find[]> = {
  peak: [
    { text: '바위 틈에서 마른 산딸기를 찾았다.', add: { fresh: 1 } },
    { text: '등산객이 두고 간 에너지바.', add: { food: 1 } },
  ],
  pass: [
    { text: '고갯마루 매점 잔해에서 캔을 찾았다.', add: { food: 1 } },
    { text: '도토리를 한 줌 주웠다. 떫지만 먹을 수 있다.', add: { fresh: 1 } },
    { text: '버려진 승용차 연료통에 호스를 꽂았다. 휘발유가 올라온다.', add: { gasoline: 2 }, rad: 1 },
    { text: '트렁크에서 공구 가방을 찾았다.', equip: 'tools', brokenChance: 0 },
    { text: '관광버스 밑에서 경유를 뽑았다. 손에 기름 냄새가 뱄다.', add: { diesel: 2 }, rad: 1 },
  ],
  shelter: [
    { text: '대피소 선반에 라면이 남아 있었다.', add: { food: 2 } },
    { text: '찬장 구석의 통조림. 유통기한은 보지 않기로 했다.', add: { food: 2 } },
    { text: '창고에 캠핑용 전등이 있었다.', equip: 'lamp', brokenChance: 0.5 },
    { text: '구석에 접힌 텐트. 폴대 하나가 부러져 있다.', equip: 'tent', brokenChance: 0.6 },
    { text: '대피소 침상의 담요를 챙겼다.', equip: 'blanket', brokenChance: 0 },
    { text: '누군가 두고 간 큰 배낭. 주인은 돌아오지 않을 것이다.', equip: 'bigPack', brokenChance: 0 },
  ],
  spring: [
    { text: '약수터 옆 밭에서 무를 뽑았다.', add: { fresh: 1 }, rad: 1 },
    { text: '물가에 자란 미나리를 뜯었다.', add: { fresh: 1 } },
  ],
  temple: [
    { text: '공양간에 쌀 한 포대가 남아 있다. 조금 덜어 담았다.', add: { food: 2 } },
    { text: '장독대의 된장. 손가락으로 찍어 먹어도 힘이 난다.', add: { food: 1 } },
    { text: '요사채에 승려가 덮던 이불이 남아 있었다. 담요로 쓴다.', equip: 'blanket', brokenChance: 0 },
    { text: '종무소 서랍에 건전지 라디오가 있었다.', equip: 'radio', brokenChance: 0.5 },
  ],
  military: [
    { text: '전투식량 한 상자. 오래 버틸 수 있다.', add: { food: 2 } },
    { text: '건빵과 별사탕. 웃음이 났다.', add: { food: 1 } },
    { text: '벙커 선반에서 가이거 계수기를 찾았다. 켜자마자 딸깍거린다.', equip: 'geiger', brokenChance: 0.3 },
    { text: '군용 발전기가 구석에 있었다. 무겁다.', equip: 'dieselGenerator', brokenChance: 0.7 },
    { text: '드럼통에서 경유를 뽑았다.', add: { diesel: 2 } },
    { text: '정비 창고에 부품 상자가 있었다. 쓸 만한 것만 골랐다.', add: { parts: 2 } },
    { text: '군용 배낭 하나. 크고 튼튼하다.', equip: 'bigPack', brokenChance: 0 },
  ],
  valley: [
    { text: '계곡에서 물고기를 잡았다.', add: { fresh: 2 }, rad: 3 },
    { text: '물가 바위에서 다슬기를 주웠다.', add: { fresh: 1 }, rad: 2 },
  ],
  village: [
    { text: '빈집 부엌에서 쌀과 김을 찾았다.', add: { food: 2 }, rad: 2 },
    { text: '마당의 감나무. 떨어진 감이 익어 있다.', add: { fresh: 1 }, rad: 2 },
    { text: '지하 저장고의 김치. 시큼하지만 먹을 만하다.', add: { food: 1 }, rad: 1 },
    { text: '안방 장롱에서 두꺼운 담요를 꺼냈다.', equip: 'blanket', brokenChance: 0 },
    { text: '창고에 등산용 큰 배낭이 걸려 있었다.', equip: 'bigPack', brokenChance: 0 },
    { text: '헛간의 트랙터에서 경유를 뽑았다.', add: { diesel: 2 }, rad: 1 },
    { text: '농기구 창고에서 부품과 나사를 챙겼다.', add: { parts: 1 } },
    { text: '마당 창고에 캠핑용 냉장고가 있었다. 문이 안 닫힌다.', equip: 'fridge', brokenChance: 0.7 },
    { text: '창고 구석의 휴대용 발전기. 당겨도 시동이 안 걸린다.', equip: 'generator', brokenChance: 0.8 },
    { text: '마루 밑에서 경유 난로를 찾았다.', equip: 'heater', brokenChance: 0.5 },
  ],
};

// 배낭 용량 안에서 보급품을 더한다. 넘치는 만큼은 버린다
function addSupplies(state: GameState, add: Partial<Supplies>): string {
  const cap = packCap(state);
  const p = state.pack;
  const got: string[] = [];
  for (const k of SUPPLY_KEYS) {
    const n = add[k] ?? 0;
    if (n <= 0) continue;
    let room = 0;
    if (k === 'water' || k === 'dirty') room = cap.water - p.water - p.dirty;
    else if (k === 'food' || k === 'fresh') room = cap.food - p.food - p.fresh;
    else if (k === 'wood') room = cap.wood - p.wood;
    else if (k === 'gasoline' || k === 'diesel') room = cap.fuel - p.gasoline - p.diesel;
    else room = cap.parts - p.parts;
    const take = Math.max(0, Math.min(n, room));
    if (take > 0) {
      p[k] += take;
      got.push(`${LABEL[k]} ${take}`);
    } else if (room <= 0) got.push(`${LABEL[k]}은 배낭이 가득해 두고 왔다`);
  }
  return got.join(', ');
}

const LABEL: Record<SupplyKey, string> = {
  water: '물', dirty: '오염수', food: '보존식', fresh: '신선식', wood: '땔감', gasoline: '휘발유', diesel: '경유', parts: '부품',
};

export function forage(state: GameState): boolean {
  if (busy(state) || !canForage(state)) return false;
  const node = currentNode(state);
  node.forageLeft -= 1;
  node.lastForageDay = state.day;
  const rng = takeRng(state);
  const res = passHours(state, rng, node, 2, 'forage');
  if (!res.died) {
    if (rng.chance(FORAGE_CHANCE[node.kind] ?? 0.4)) {
      const list = (FINDS[node.kind] ?? FINDS.peak).filter((f) => !f.equip || !state.equip.some((e) => e.kind === f.equip) || f.equip === 'tools');
      const found = rng.pick(list.length ? list : FINDS.peak);
      if (found.rad) state.stats.rad = Math.min(100, state.stats.rad + found.rad);
      if (found.equip) {
        const broken = rng.chance(found.brokenChance ?? 0.5);
        if (canCarry(state, found.equip)) {
          state.equip.push({ kind: found.equip, broken });
          addLog(state, `${found.text} ${EQUIP_INFO[found.equip].label}${broken ? '. 고장 나 있다. 수리하면 쓸 수 있을지도' : ''}.`);
        } else {
          addLog(state, `${found.text} 하지만 무거운 장비를 더 질 수 없어 두고 왔다.`);
        }
      } else if (found.add) {
        addLog(state, `${found.text} ${addSupplies(state, found.add)}.`);
      }
    } else {
      addLog(state, rng.pick(['두 시간을 뒤졌지만 쓸 만한 게 없다.', '빈손이다. 누군가 먼저 다녀갔다.', '버섯이 있었지만 독버섯 같아 두고 왔다.']));
    }
  }
  giveRng(state, rng);
  afterAction(state);
  return true;
}

export function gearList(state: GameState): string[] {
  return state.equip.map((e) => equipLabel(e));
}

// ---------- 수리 ----------

export function repairChance(state: GameState): number {
  return hasEquip(state, 'tools') ? REPAIR_WITH_TOOLS : REPAIR_BASE;
}

// 수리할 부품이 어디 있는가. 배낭 먼저, 거점 저장고 다음
function partsSource(state: GameState): Supplies | null {
  if (state.pack.parts > 0) return state.pack;
  const node = currentNode(state);
  if (node.camp && node.store && node.store.parts > 0) return node.store;
  return null;
}

export function canRepair(state: GameState): boolean {
  if (busy(state) || partsSource(state) === null) return false;
  const node = currentNode(state);
  return state.equip.some((e) => e.broken) || (node.camp && node.equip.some((e) => e.broken));
}

// 수리. 두 시간과 부품 하나. where 가 'pack' 이면 지닌 장비, 'base' 면 거점 장비
export function repair(state: GameState, where: 'pack' | 'base', idx: number): boolean {
  if (busy(state)) return false;
  const node = currentNode(state);
  const list = where === 'pack' ? state.equip : node.camp ? node.equip : [];
  const item = list[idx];
  if (!item || !item.broken) return false;
  const src = partsSource(state);
  if (!src) return false;
  const rng = takeRng(state);
  const res = passHours(state, rng, node, REPAIR_HOURS, 'work');
  if (!res.died) {
    src.parts -= 1;
    const chance = repairChance(state);
    if (rng.chance(chance)) {
      item.broken = false;
      addLog(state, `${EQUIP_INFO[item.kind].label}를 고쳤다. 두 시간 만에 돌아가는 소리가 났다.`);
    } else {
      addLog(state, `${EQUIP_INFO[item.kind].label} 수리에 실패했다. 부품만 날렸다.`);
    }
  }
  giveRng(state, rng);
  afterAction(state);
  return true;
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
    node.store = emptySupplies();
    node.equip = [];
    addLog(state, `${node.name}에 거점을 세웠다. 창을 막고 잠자리를 만들고 저장고를 비웠다.`);
  }
  afterAction(state);
  return true;
}

export function atCamp(state: GameState): boolean {
  return currentNode(state).camp;
}

function supplyTotal(s: Supplies): number {
  return SUPPLY_KEYS.reduce((a, k) => a + s[k], 0);
}

// 보급품 한 종류를 배낭과 저장고 사이로 옮긴다. n 은 양수. 0 이면 가능한 만큼 전부
export function moveSupply(state: GameState, key: SupplyKey, dir: 'toBase' | 'toPack', n = 0): boolean {
  const node = currentNode(state);
  if (busy(state) || !node.camp || !node.store) return false;
  const p = state.pack;
  const st = node.store;
  const cap = packCap(state);
  let room = Infinity;
  if (dir === 'toPack') {
    if (key === 'water' || key === 'dirty') room = cap.water - p.water - p.dirty;
    else if (key === 'food' || key === 'fresh') room = cap.food - p.food - p.fresh;
    else if (key === 'wood') room = cap.wood - p.wood;
    else if (key === 'gasoline' || key === 'diesel') room = cap.fuel - p.gasoline - p.diesel;
    else room = cap.parts - p.parts;
  }
  const from = dir === 'toBase' ? p : st;
  const to = dir === 'toBase' ? st : p;
  const amount = Math.max(0, Math.min(n > 0 ? n : from[key], from[key], room));
  if (amount <= 0) return false;
  from[key] -= amount;
  to[key] += amount;
  return true;
}

// 장비 하나를 배낭과 거점 사이로 옮긴다
export function moveEquip(state: GameState, dir: 'toBase' | 'toPack', idx: number): boolean {
  const node = currentNode(state);
  if (busy(state) || !node.camp) return false;
  const from = dir === 'toBase' ? state.equip : node.equip;
  const item = from[idx];
  if (!item) return false;
  if (dir === 'toPack' && !canCarry(state, item.kind)) return false;
  from.splice(idx, 1);
  (dir === 'toBase' ? node.equip : state.equip).push(item);
  return true;
}

// 맡기기. 배낭의 보급품을 모두 저장고로
export function deposit(state: GameState): boolean {
  const node = currentNode(state);
  if (busy(state) || !node.camp || !node.store) return false;
  if (supplyTotal(state.pack) === 0) return false;
  for (const k of SUPPLY_KEYS) {
    node.store[k] += state.pack[k];
    state.pack[k] = 0;
  }
  addLog(state, `저장고에 맡겼다. ${storeText(node.store)}.`);
  return true;
}

// 챙기기. 저장고에서 배낭이 찰 때까지. 깨끗한 물과 신선식부터
export function withdraw(state: GameState): boolean {
  const node = currentNode(state);
  if (busy(state) || !node.camp || !node.store) return false;
  let moved = false;
  for (const k of ['water', 'dirty', 'fresh', 'food', 'wood', 'gasoline', 'diesel', 'parts'] as SupplyKey[]) {
    if (moveSupply(state, k, 'toPack')) moved = true;
  }
  if (!moved) return false;
  addLog(state, `저장고에서 챙겼다. 배낭: ${storeText(state.pack)}.`);
  return true;
}

export function storeText(s: Supplies): string {
  return SUPPLY_KEYS.filter((k) => s[k] > 0).map((k) => `${LABEL[k]} ${s[k]}`).join(', ') || '비었다';
}

export function heavyCarried(state: GameState): number {
  return heavyCount(state.equip);
}

export type { Equip };
