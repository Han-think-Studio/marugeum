import { Rng } from '../core/rng';
import {
  INDOOR, type Choice, type Effect, type EventDef, type GameState, type MapNode, type PackCap, type Req, type Trigger, type When,
} from '../core/types';
import { gainEquip, hasEquip } from './equip';
import { facilityRunning, syncFresh } from './facilities';
import { startStandoff } from './standoff';
import { EVENTS as EVENTS1 } from '../data/events';
import { MORE_EVENTS } from '../data/events-more';
import { OBJECT_EVENTS } from '../data/objects';

const EVENTS: EventDef[] = [...EVENTS1, ...MORE_EVENTS];
import { addLog } from './log';
import { passHours } from './survival';
import { isNight } from './weather';

// 도착했을 때 이벤트가 날 확률. 처음 온 곳이 훨씬 높다
const ARRIVE_FIRST = 0.6;
const ARRIVE_AGAIN = 0.12;
const NIGHT_OUTDOOR = 0.35;
const NIGHT_INDOOR = 0.12;

// 모은 가족 단서 수
export function clueCount(state: GameState): number {
  return Object.keys(state.flags).filter((k) => k.startsWith('clue:') && state.flags[k]).length;
}

// 정찰 결과. 데이터가 아니라 코드가 결과 문장을 만든다. 띠 그림 event-scout 가 뜬다
export const SCOUT_EVENT: EventDef = { id: 'scout', trigger: 'scout', title: '정찰', text: '', choices: [] };

export function eventById(id: string): EventDef | undefined {
  if (id === 'scout') return SCOUT_EVENT;
  return EVENTS.find((e) => e.id === id) ?? OBJECT_EVENTS.find((e) => e.id === id);
}

function matches(when: When | undefined, state: GameState, node: MapNode, trigger: Trigger): boolean {
  if (!when) return true;
  if (when.kinds && !when.kinds.includes(node.kind)) return false;
  if (when.places && !when.places.includes(node.place)) return false;
  if (when.stages && !when.stages.includes(node.stage)) return false;
  if (when.weather && !when.weather.includes(state.weather)) return false;
  if (when.night !== undefined && isNight(state.hour) !== when.night) return false;
  if (when.outdoor !== undefined && trigger === 'night' && INDOOR.has(node.kind) === when.outdoor) return false;
  if (when.minDay !== undefined && state.day < when.minDay) return false;
  if (when.maxDay !== undefined && state.day > when.maxDay) return false;
  if (when.flag && !state.flags[when.flag]) return false;
  if (when.noFlag && state.flags[when.noFlag]) return false;
  if (when.gear && !hasEquip(state, when.gear)) return false;
  if (when.noGear && hasEquip(state, when.noGear)) return false;
  if (when.facility && !facilityRunning(node, when.facility)) return false;
  if (when.noFacility && facilityRunning(node, when.noFacility)) return false;
  if (when.noUpgrade && node.upgrades.includes(when.noUpgrade)) return false;
  if (when.campTier !== undefined && !(node.camp && node.campTier === when.campTier)) return false;
  if (when.secured !== undefined && node.secured !== when.secured) return false;
  if (when.phase && state.phase !== when.phase) return false;
  const clues = clueCount(state);
  if (when.minClues !== undefined && clues < when.minClues) return false;
  if (when.maxClues !== undefined && clues > when.maxClues) return false;
  if (when.minRad !== undefined && state.stats.rad < when.minRad) return false;
  if (when.maxRad !== undefined && state.stats.rad > when.maxRad) return false;
  if (when.firstRun !== undefined && (state.runNo === 1) !== when.firstRun) return false;
  return true;
}

function pool(state: GameState, node: MapNode, trigger: Trigger): EventDef[] {
  return EVENTS.filter((e) => e.trigger === trigger && !(e.once && state.flags[`ev:${e.id}`]) && matches(e.when, state, node, trigger));
}

function pickWeighted(rng: Rng, list: EventDef[]): EventDef | null {
  const total = list.reduce((a, e) => a + (e.weight ?? 1), 0);
  if (total <= 0) return null;
  let r = rng.next() * total;
  for (const e of list) {
    r -= e.weight ?? 1;
    if (r <= 0) return e;
  }
  return list[list.length - 1];
}

function open(state: GameState, ev: EventDef, objectId?: number): void {
  state.event = { id: ev.id, result: null, objectId };
  if (ev.trigger !== 'object') {
    state.flags[`ev:${ev.id}`] = true;
    state.seen.push(ev.id);
  }
  addLog(state, `[${ev.title}]`);
  if (ev.marks) {
    const fresh = ev.marks.filter((m) => !state.marked.includes(m));
    if (fresh.length > 0) {
      state.marked.push(...fresh);
      const names = fresh.map((m) => state.nodes.find((n) => n.place === m)?.name ?? m).join(', ');
      addLog(state, `지도에 표시해 두었다: ${names}.`);
    }
  }
}

// 사물 이벤트 열기. 본문의 {name} 은 사물 이름으로 바뀐다
export function openObject(state: GameState, node: MapNode, objectId: number): boolean {
  if (state.over !== 'none' || state.event) return false;
  const o = node.objects.find((x) => x.id === objectId);
  if (!o || o.used || (o.hidden && !node.looked)) return false;
  const ev = eventById(`obj_${o.kind}`);
  if (!ev) return false;
  open(state, ev, objectId);
  return true;
}

export function fillName(text: string, state: GameState, node: MapNode): string {
  const id = state.event?.objectId;
  const o = id !== undefined ? node.objects.find((x) => x.id === id) : undefined;
  return text.replace(/\{name\}/g, o ? o.name : '');
}

// 도착 이벤트. 처음 온 곳이면 자주, 다시 온 곳이면 가끔
export function maybeArrive(state: GameState, rng: Rng, node: MapNode, first: boolean): boolean {
  if (state.over !== 'none' || state.event) return false;
  const list = pool(state, node, 'arrive');
  // 놓치면 안 되는 이야기는 처음 온 곳이면 반드시
  if (first) {
    const must = list.filter((e) => e.priority);
    if (must.length > 0) {
      open(state, must[0]);
      return true;
    }
  }
  if (!rng.chance(first ? ARRIVE_FIRST : ARRIVE_AGAIN)) return false;
  const ev = pickWeighted(rng, list);
  if (!ev) return false;
  open(state, ev);
  return true;
}

// 밤 이벤트. 잠에서 깬 뒤에 닥친다
// 시작 장면. 첫 아침
export function startEvent(state: GameState, rng: Rng, node: MapNode): boolean {
  const ev = pickWeighted(rng, pool(state, node, 'start'));
  if (!ev) return false;
  open(state, ev);
  return true;
}

// 향로봉에 닿았을 때. 조건에 맞는 엔딩 장면 하나가 열린다
export function openGoal(state: GameState, rng: Rng, node: MapNode): boolean {
  const list = pool(state, node, 'arrive').filter((e) => e.when?.kinds?.includes('goal'));
  const ev = pickWeighted(rng, list);
  if (!ev) return false;
  open(state, ev);
  return true;
}

export function maybeNight(state: GameState, rng: Rng, node: MapNode): boolean {
  if (state.over !== 'none' || state.event) return false;
  // 전등이 켜진 거점은 밤이 덜 위험하다. 대신 라디오 소식은 전등과 상관없이 온다
  const lit = facilityRunning(node, 'lamp');
  const radio = facilityRunning(node, 'radio');
  let chance = INDOOR.has(node.kind) ? NIGHT_INDOOR : NIGHT_OUTDOOR;
  if (node.kind === 'start' && state.phase === 'base') chance = 0.4; // 거점기의 밤은 일이 많다
  if (lit) chance *= 0.3;
  if (!INDOOR.has(node.kind) && hasEquip(state, 'flashlight')) chance *= 0.7;
  if (radio) chance = Math.max(chance, 0.5);
  if (!rng.chance(chance)) return false;
  const ev = pickWeighted(rng, pool(state, node, 'night'));
  if (!ev) return false;
  open(state, ev);
  return true;
}

export function meetsReq(state: GameState, req: Req | undefined, node: MapNode): boolean {
  if (!req) return true;
  if (req.food !== undefined && state.pack.food < req.food) return false;
  if (req.water !== undefined && state.pack.water < req.water) return false;
  if (req.wood !== undefined && state.pack.wood < req.wood) return false;
  if (req.gear && !hasEquip(state, req.gear)) return false;
  if (req.fire && !(state.fire && state.fire.nodeId === node.id)) return false;
  return true;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function applyEffect(state: GameState, rng: Rng, node: MapNode, e: Effect, cap: PackCap): void {
  const s = state.stats;
  if (e.hp) s.hp = clamp(s.hp + e.hp);
  if (e.hunger) s.hunger = clamp(s.hunger + e.hunger);
  if (e.thirst) s.thirst = clamp(s.thirst + e.thirst);
  if (e.temp) s.temp = clamp(s.temp + e.temp);
  if (e.fatigue) s.fatigue = clamp(s.fatigue + e.fatigue);
  if (e.rad) s.rad = clamp(s.rad + e.rad);
  if (e.mind) s.mind = clamp(s.mind + e.mind);
  const p = state.pack;
  if (e.water) p.water = Math.max(0, Math.min(cap.water - p.dirty, p.water + e.water));
  if (e.dirty) p.dirty = Math.max(0, Math.min(cap.water - p.water, p.dirty + e.dirty));
  if (e.food) p.food = Math.max(0, Math.min(cap.food - p.fresh, p.food + e.food));
  if (e.fresh) p.fresh = Math.max(0, Math.min(cap.food - p.food, p.fresh + e.fresh));
  if (e.wood) p.wood = Math.max(0, Math.min(cap.wood, p.wood + e.wood));
  if (e.gasoline) p.gasoline = Math.max(0, Math.min(cap.fuel - p.diesel, p.gasoline + e.gasoline));
  if (e.diesel) p.diesel = Math.max(0, Math.min(cap.fuel - p.gasoline, p.diesel + e.diesel));
  if (e.parts) p.parts = Math.max(0, Math.min(cap.parts, p.parts + e.parts));
  if (e.foodAll) { p.food = 0; p.fresh = 0; }
  if (e.gear) gainEquip(state, e.gear, false);
  if (e.gear2) gainEquip(state, e.gear2, false);
  if (e.brokenGear) gainEquip(state, e.brokenGear, true);
  if (e.flag) state.flags[e.flag] = true;
  if (e.clue && !state.flags[`clue:${e.clue}`]) {
    state.flags[`clue:${e.clue}`] = true;
    addLog(state, `가족의 흔적. 단서 ${clueCount(state)}개.`);
  }
  if (e.ending) {
    state.ending = e.ending;
    state.over = 'won';
    state.overText = `${state.day}일째. ${e.ending === 'stay' ? '북쪽을 포기했다.' : '향로봉에 닿았다.'} 누적 피폭 ${Math.round(state.stats.rad)}. 단서 ${clueCount(state)}개.`;
  }
  if (e.fireOut) state.fire = null;
  if (e.poisonWell) node.waterLeft = 0;
  if (e.cave) node.cave = true;
  if (e.standoff) startStandoff(state, e.standoff);
  const obj = state.event?.objectId !== undefined ? node.objects.find((x) => x.id === state.event!.objectId) : undefined;
  if (e.bury && obj) {
    state.buried.push(obj.name);
    passHours(state, rng, node, 2, 'work');
  }
  if (e.objUsed && obj) {
    obj.used = true;
    obj.usedDay = state.day;
  }
  if (e.objRemove && obj) node.objects = node.objects.filter((x) => x.id !== obj.id);
  if (e.hours) passHours(state, rng, node, e.hours, 'work');
  syncFresh(state);
  if (s.hp <= 0 && state.over === 'none') {
    state.over = 'dead';
    state.overText = `${state.day}일째, 산에서 죽었다.`;
    addLog(state, state.overText);
  }
}

// 선택. 결과 문장을 이벤트에 남기고, 확인을 누르면 닫힌다
export function choose(state: GameState, rng: Rng, node: MapNode, idx: number, cap: PackCap): boolean {
  if (!state.event || state.event.result !== null) return false;
  const ev = eventById(state.event.id);
  if (!ev) {
    state.event = null;
    return false;
  }
  const choice: Choice | undefined = ev.choices[idx];
  if (!choice || !meetsReq(state, choice.req, node)) return false;
  let outcome = choice.outcomes[choice.outcomes.length - 1];
  for (const o of choice.outcomes) {
    if (o.chance === undefined) { outcome = o; break; }
    if (rng.chance(o.chance)) { outcome = o; break; }
  }
  if (outcome.effects) applyEffect(state, rng, node, outcome.effects, cap);
  const text = fillName(outcome.text, state, node);
  state.event.result = text;
  addLog(state, text);
  return true;
}

export function closeEvent(state: GameState): boolean {
  if (!state.event || state.event.result === null) return false;
  state.event = null;
  // 같은 자리에 놓치면 안 되는 이야기가 더 남아 있으면 이어서 연다 (죽령의 터널과 버스처럼)
  if (state.over === 'none' && !state.standoff) {
    const node = state.nodes[state.nodeId];
    const must = pool(state, node, 'arrive').filter((e) => e.priority && e.once);
    if (must.length > 0) open(state, must[0]);
  }
  return true;
}
