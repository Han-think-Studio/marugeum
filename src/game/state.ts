import { Rng } from '../core/rng';
import {
  EQUIP_INFO, FIRE_HOURS, FOOD_UNIT, INDOOR, PACK_BIG, PACK_SMALL, REPAIR_BASE, REPAIR_HOURS, REPAIR_WITH_TOOLS,
  SUPPLY_KEYS, WATER_UNIT, WOOD_NODES, edgeKey, emptySupplies,
  CARRIER_EXTRA, FAMILY, STANDOFF_INFO, SUPPLY_LABEL, UPGRADES, WINDBREAK, type Equip, type GameState, type MapNode, type PackCap, type Stats, type Supplies, type SupplyKey, type UpgradeId, type StandoffAction,
} from '../core/types';
import { generateMap } from '../map/generate';
import { addLog } from './log';
import { passHours, radPerHour, warnings } from './survival';
import { choose, clueCount, closeEvent, maybeArrive, maybeNight, openGoal, openObject, startEvent } from './events';

export { clueCount } from './events';
import { visibleObjects } from './objects';

export { visibleObjects, hiddenCount } from './objects';
import { canCarry, equipLabel, hasEquip, heavyCount, useCharge } from './equip';
import { isNight, rollWeather } from './weather';
import { syncFresh } from './facilities';
import { endStandoff, standoffAct } from './standoff';

export { hasEquip, canCarry, equipLabel, heavyLimit } from './equip';
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
    nextWeather: 'clear',
    nextWind: 'calm',
    pack: { ...emptySupplies(), water: 1, food: 1 },
    freshDay: 0,
    equip: [],
    fire: null,
    known: {},
    flags: {},
    event: null,
    seen: [],
    buried: [],
    view: 'scene',
    knownStages: opts.knownStages ?? [],
    runNo: opts.runNo ?? 1,
    started: Date.now(),
    recorded: false,
    phase: 'base',
    departedDay: 0,
    baseId: 0,
    ending: null,
    photoDay: 0,
    standoff: null,
    log: [],
    over: 'none',
    overText: '',
    rngState: (seed ^ 0x9e3779b9) >>> 0,
  };
  const rng = takeRng(state);
  rollWeather(state, rng, true);
  addLog(state, '중산리 야영장, 대피령 엿새째. 바다는 죽었고 낮은 땅은 비에 젖으면 위험하다. 사람들은 떠났고 두고 간 것들이 남았다.');
  startEvent(state, rng, nodes[0]);
  giveRng(state, rng);
  return state;
}

// 북쪽으로 떠난다. 배낭에 든 것만 가지고. 거점 시설은 끄고 간다
export function canDepart(state: GameState): boolean {
  return state.phase === 'base' && state.nodeId === state.baseId && !busy(state);
}

export function depart(state: GameState): boolean {
  if (!canDepart(state)) return false;
  const base = currentNode(state);
  base.genOn = false;
  base.heaterOn = false;
  state.phase = 'trek';
  state.departedDay = state.day;
  addLog(state, `${state.day}일째. 야영장을 떠난다. 배낭에 ${storeText(state.pack)}. 능선을 따라 북쪽으로.`);
  afterAction(state);
  return true;
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
  const base = hasEquip(state, 'bigPack') ? PACK_BIG : PACK_SMALL;
  if (!hasEquip(state, 'carrier')) return base;
  return {
    water: base.water + CARRIER_EXTRA.water, food: base.food + CARRIER_EXTRA.food, wood: base.wood + CARRIER_EXTRA.wood,
    fuel: base.fuel + CARRIER_EXTRA.fuel, parts: base.parts + CARRIER_EXTRA.parts,
  };
}

export function foodTotal(s: Supplies): number {
  return s.food + s.fresh;
}

// 이벤트 선택을 기다리는 동안에는 다른 행동을 못 한다
export function busy(state: GameState): boolean {
  return state.over !== 'none' || state.event !== null || state.standoff !== null;
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
  if (isNight(state.hour)) h += 2 * pen * (hasEquip(state, 'flashlight') ? 0.5 : 1);
  if (state.stats.fatigue < 30) h += 2;
  if (hasEquip(state, 'carrier')) h += 1; // 지게는 부피가 크다
  h += weightPenalty(state);
  return Math.max(2, Math.round(h));
}

// 짐 무게. 물 1, 먹을 것 0.5, 땔감 1, 기름 1.5, 부품 0.3. 가벼운 장비 1, 무거운 장비 6
export function packWeight(state: GameState): number {
  const p = state.pack;
  let w = p.water + p.dirty + (p.food + p.fresh) * 0.5 + p.wood + (p.gasoline + p.diesel) * 1.5 + p.parts * 0.3;
  for (const e of state.equip) w += EQUIP_INFO[e.kind].heavy ? 6 : 1;
  return Math.round(w * 10) / 10;
}

// 12 까지는 제값(지게가 있으면 18), 그 위로 6 마다 한 시간씩 더 걸린다
export function weightLimit(state: GameState): number {
  return hasEquip(state, 'carrier') ? 18 : 12;
}

export function weightPenalty(state: GameState): number {
  return Math.max(0, Math.ceil((packWeight(state) - weightLimit(state)) / 6));
}

export function timeLabel(state: GameState): string {
  const h = state.hour;
  const part = h < 5 ? '깊은 밤' : h < 8 ? '새벽' : h < 12 ? '아침' : h < 17 ? '낮' : h < 20 ? '저녁' : '밤';
  return `${state.day}일째 ${String(h).padStart(2, '0')}시 ${part}`;
}

function afterAction(state: GameState): void {
  syncFresh(state);
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
  const res = passHours(state, rng, midway, hours, 'travel', { uphill: to.alt > from.alt + 0.1, known, heavy: weightPenalty(state) > 0 });
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
  state.view = 'scene';
  const first = !to.visited;
  to.visited = true;
  const dir = to.alt > from.alt + 0.1 ? '올라' : to.alt < from.alt - 0.1 ? '내려' : '걸어';
  const back = to.stage < from.stage ? '되돌아' : '';
  addLog(state, `${hours}시간을 ${back}${dir}가 ${to.name}에 ${first ? '처음 ' : '다시 '}닿았다.${known ? ' 아는 길이라 수월했다.' : ''}`);
  if (to.kind === 'goal') {
    addLog(state, '안전지대의 불빛이 보인다. 살아서 도착했다.');
    const rng3 = takeRng(state);
    const opened = openGoal(state, rng3, to);
    giveRng(state, rng3);
    if (!opened) {
      state.over = 'won';
      state.ending = 'names';
      state.overText = `${state.day}일 만에 향로봉 안전지대에 닿았다. 누적 피폭 ${Math.round(state.stats.rad)}.`;
    }
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

// ---------- 둘러보기와 사물 ----------

export function canLook(state: GameState): boolean {
  return !busy(state) && !currentNode(state).looked;
}

// 둘러보기. 한 시간. 숨은 사물이 드러난다
export function lookAround(state: GameState): boolean {
  if (!canLook(state)) return false;
  const node = currentNode(state);
  const rng = takeRng(state);
  const res = passHours(state, rng, node, 1, 'work');
  giveRng(state, rng);
  if (!res.died) {
    const before = visibleObjects(node).length;
    node.looked = true;
    const found = visibleObjects(node).length - before;
    addLog(state, found > 0 ? `한 시간을 돌아봤다. 눈에 안 띄던 것이 ${found}개 보인다.` : '한 시간을 돌아봤다. 더 있는 건 없다.');
  }
  afterAction(state);
  return true;
}

// 사물을 만진다. 사물 이벤트가 열린다
export function inspectObject(state: GameState, objectId: number): boolean {
  if (busy(state)) return false;
  const node = currentNode(state);
  if (!openObject(state, node, objectId)) return false;
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
  return state.equip.some((e) => e.broken) || node.equip.some((e) => e.broken);
}

// 수리. 두 시간과 부품 하나. where 가 'pack' 이면 지닌 장비, 'base' 면 거점 장비
export function repair(state: GameState, where: 'pack' | 'base', idx: number): boolean {
  if (busy(state)) return false;
  const node = currentNode(state);
  const list = where === 'pack' ? state.equip : node.equip;
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

// 비 오는 바깥에서는 불이 붙지 않는다. 라이터가 있으면 붙는다
export function rainBlocksFire(state: GameState): boolean {
  return state.weather === 'rain' && !INDOOR.has(currentNode(state).kind) && !hasEquip(state, 'matches');
}

export function canLightFire(state: GameState): boolean {
  return !hasFire(state) && state.pack.wood > 0 && !rainBlocksFire(state);
}

// 불 피우기. 땔감 하나로 열 시간
export function lightFire(state: GameState): boolean {
  if (busy(state) || !canLightFire(state)) return false;
  const node = currentNode(state);
  state.pack.wood -= 1;
  const hearth = node.camp && node.upgrades.includes('hearth');
  state.fire = { nodeId: node.id, hours: FIRE_HOURS * (hearth ? 2 : 1) };
  addLog(state, hearth ? '화덕에 불을 넣었다. 연통으로 연기가 빠지고 돌이 천천히 달아오른다.' : '불을 피웠다. 손끝이 녹고 어둠이 조금 물러난다.');
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

// ---------- 대치 ----------

export function standoffMove(state: GameState, action: StandoffAction): boolean {
  if (!state.standoff || state.standoff.done || state.over !== 'none') return false;
  const rng = takeRng(state);
  const ok = standoffAct(state, rng, action);
  giveRng(state, rng);
  if (ok && state.stats.hp <= 0) {
    state.over = 'dead';
    state.overText = `${state.day}일째, ${STANDOFF_INFO[state.standoff.kind].name}에게 당했다.`;
    addLog(state, state.overText);
    state.standoff = null;
  }
  return ok;
}

export function standoffClose(state: GameState): boolean {
  if (!state.standoff || !state.standoff.done) return false;
  const node = currentNode(state);
  endStandoff(state);
  const rng = takeRng(state);
  passHours(state, rng, node, 1, 'work');
  giveRng(state, rng);
  afterAction(state);
  return true;
}

export { standoffOdds, canThrow } from './standoff';

// ---------- 쓰는 물건 ----------

export function canTakeIodine(state: GameState): boolean {
  return !busy(state) && state.equip.some((e) => e.kind === 'iodine' && (e.charges ?? 0) > 0) && state.flags[`iodine:${state.day}`] !== true;
}

export function takeIodine(state: GameState): boolean {
  if (!canTakeIodine(state)) return false;
  useCharge(state, 'iodine');
  state.flags[`iodine:${state.day}`] = true;
  state.stats.rad = Math.max(0, state.stats.rad - 15);
  addLog(state, '요오드 알약을 삼켰다. 입안이 쓰다. 효과가 있는지는 모르지만 무언가를 했다.');
  afterAction(state);
  return true;
}

export function canFirstAid(state: GameState): boolean {
  return !busy(state) && state.equip.some((e) => e.kind === 'medkit' && (e.charges ?? 0) > 0) && state.stats.hp < 100;
}

export function firstAid(state: GameState): boolean {
  if (!canFirstAid(state)) return false;
  const node = currentNode(state);
  const rng = takeRng(state);
  const res = passHours(state, rng, node, 1, 'rest');
  giveRng(state, rng);
  if (!res.died) {
    useCharge(state, 'medkit');
    state.stats.hp = Math.min(100, state.stats.hp + 25);
    addLog(state, '상처를 씻고 소독하고 붕대를 감았다. 한 시간. 제대로 손본 건 오랜만이다.');
  }
  afterAction(state);
  return true;
}

export function canPurify(state: GameState): boolean {
  return !busy(state) && state.pack.dirty > 0 && state.equip.some((e) => e.kind === 'purifier' && (e.charges ?? 0) > 0);
}

export function purify(state: GameState): boolean {
  if (!canPurify(state)) return false;
  useCharge(state, 'purifier');
  const n = Math.min(2, state.pack.dirty);
  state.pack.dirty -= n;
  state.pack.water += n;
  addLog(state, `정수 알약을 넣고 삼십 분을 기다렸다. 깨끗한 물 ${n}통.`);
  afterAction(state);
  return true;
}

// ---------- 경로 위험 ----------

export type Risk = 'low' | 'mid' | 'high';

// 이 길로 가면 얼마나 위험한가. 피폭과 추위와 밤을 합쳐 본다
export function routeRisk(state: GameState, to: MapNode): { level: Risk; why: string[] } {
  const why: string[] = [];
  let score = 0;
  const hours = travelHours(state, currentNode(state), to);
  const midway: MapNode = { ...to, alt: (currentNode(state).alt + to.alt) / 2 };
  const rad = radPerHour(state, midway, false) * hours;
  if (rad >= 12) { score += 2; why.push('피폭 큼'); } else if (rad >= 5) { score += 1; why.push('피폭'); }
  if (state.weather === 'rain') { score += 1; why.push('비'); }
  if (state.wind !== 'calm' && to.side === state.wind) { score += 1; why.push('바람받이'); }
  const endHour = (state.hour + hours) % 24;
  if (isNight(state.hour) || endHour >= 20 || endHour < 5) { score += 1; why.push('밤에 닿음'); }
  if (state.stats.fatigue < 30 || state.stats.thirst < 25) { score += 1; why.push('몸이 안 됨'); }
  if (to.alt < 0.35) { score += 1; why.push('낮은 땅'); }
  const level: Risk = score >= 3 ? 'high' : score >= 1 ? 'mid' : 'low';
  return { level, why };
}

// ---------- 사진 ----------

// 배낭 속 가족사진. 하루에 한 번 꺼내 본다. 단서가 쌓일수록 다른 말이 떠오른다
export function canLookPhoto(state: GameState): boolean {
  return !busy(state) && state.photoDay !== state.day;
}

export function lookPhoto(state: GameState): boolean {
  if (!canLookPhoto(state)) return false;
  state.photoDay = state.day;
  const n = clueCount(state);
  const lines = [
    `사진을 꺼냈다. ${FAMILY.spouse}과 ${FAMILY.child}이, 그리고 나. 중산리 첫날. 모서리가 닳았다.`,
    `${FAMILY.child}이 웃고 있다. 버스를 탈 때도 웃었을까. 사진을 도로 넣었다.`,
    `${FAMILY.spouse}의 글씨가 생각난다. "꼭 와." 사진 뒤에 내가 적어 둔 날짜가 벌써 오래됐다.`,
    `이 길 어딘가를 두 사람이 먼저 걸었다. 사진 속 ${FAMILY.child}의 신발이 지금도 그 신발일까.`,
    `흔적이 북쪽으로 이어진다. 사진을 보는 시간이 짧아졌다. 걷는 시간이 길어졌다.`,
    `${FAMILY.child}이 열이 있었다고 했다. 사진 속 아이는 멀쩡하다. 멀쩡한 쪽을 믿기로 했다.`,
    `헬기가 데려갔다면 지금쯤 거기 있다. 사진을 보며 처음으로 숨을 길게 쉬었다.`,
  ];
  addLog(state, lines[Math.min(n, lines.length - 1)]);
  state.stats.mind = Math.min(100, state.stats.mind + (n >= 4 ? 6 : 3));
  afterAction(state);
  return true;
}

// ---------- 안식처 ----------

// 바람막이. 지붕 없는 곳에서 땔감 하나와 한 시간
export function canWindbreak(state: GameState): boolean {
  const n = currentNode(state);
  return !busy(state) && !INDOOR.has(n.kind) && !n.windbreak && state.pack.wood >= WINDBREAK.wood;
}

export function buildWindbreak(state: GameState): boolean {
  if (!canWindbreak(state)) return false;
  const node = currentNode(state);
  const rng = takeRng(state);
  const res = passHours(state, rng, node, WINDBREAK.hours, 'work');
  giveRng(state, rng);
  if (!res.died) {
    state.pack.wood -= WINDBREAK.wood;
    node.windbreak = true;
    addLog(state, WINDBREAK.story);
  }
  afterAction(state);
  return true;
}

// 거점 보강. 재료는 배낭이나 저장고에서
function takeMaterial(state: GameState, node: MapNode, key: 'wood' | 'parts', n: number): boolean {
  if (n <= 0) return true;
  const fromPack = Math.min(n, state.pack[key]);
  const fromStore = node.store ? Math.min(n - fromPack, node.store[key]) : 0;
  if (fromPack + fromStore < n) return false;
  state.pack[key] -= fromPack;
  if (node.store) node.store[key] -= fromStore;
  return true;
}

function hasMaterial(state: GameState, node: MapNode, key: 'wood' | 'parts', n: number): boolean {
  return state.pack[key] + (node.store ? node.store[key] : 0) >= n;
}

export function canBuild(state: GameState, id: UpgradeId): boolean {
  const n = currentNode(state);
  if (busy(state) || !n.camp || n.upgrades.includes(id)) return false;
  const u = UPGRADES[id];
  return hasMaterial(state, n, 'wood', u.wood) && hasMaterial(state, n, 'parts', u.parts);
}

export function build(state: GameState, id: UpgradeId): boolean {
  if (!canBuild(state, id)) return false;
  const node = currentNode(state);
  const u = UPGRADES[id];
  const rng = takeRng(state);
  const res = passHours(state, rng, node, u.hours, 'work');
  giveRng(state, rng);
  if (!res.died) {
    takeMaterial(state, node, 'wood', u.wood);
    takeMaterial(state, node, 'parts', u.parts);
    node.upgrades.push(id);
    addLog(state, u.story);
  }
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
    node.genOn = false;
    node.heaterOn = false;
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
  syncFresh(state);
  return true;
}

// 장비 하나를 배낭과 이 자리 사이로 옮긴다. 거점이면 시설이 되고, 아니면 두고 간 짐이 된다
export function moveEquip(state: GameState, dir: 'toBase' | 'toPack', idx: number): boolean {
  const node = currentNode(state);
  if (busy(state)) return false;
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
  syncFresh(state);
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
  return SUPPLY_KEYS.filter((k) => s[k] > 0).map((k) => `${SUPPLY_LABEL[k]} ${s[k]}`).join(', ') || '비었다';
}

export function heavyCarried(state: GameState): number {
  return heavyCount(state.equip);
}

export { toggleGenerator, toggleHeater, isPowered, facilityRunning, generatorHoursLeft, heaterHoursLeft, dailyUse, hasGenerator, facilityOk } from './facilities';

export type { Equip };
