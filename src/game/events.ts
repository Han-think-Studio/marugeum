import { Rng } from '../core/rng';
import {
  INDOOR, type Choice, type Effect, type EventDef, type GameState, type MapNode, type PackCap, type Req, type Trigger, type When,
} from '../core/types';
import { canCarry, hasEquip } from './equip';
import { EVENTS } from '../data/events';
import { addLog } from './log';
import { passHours } from './survival';
import { isNight } from './weather';

// 도착했을 때 이벤트가 날 확률. 처음 온 곳이 훨씬 높다
const ARRIVE_FIRST = 0.6;
const ARRIVE_AGAIN = 0.12;
const NIGHT_OUTDOOR = 0.35;
const NIGHT_INDOOR = 0.12;

export function eventById(id: string): EventDef | undefined {
  return EVENTS.find((e) => e.id === id);
}

function matches(when: When | undefined, state: GameState, node: MapNode, trigger: Trigger): boolean {
  if (!when) return true;
  if (when.kinds && !when.kinds.includes(node.kind)) return false;
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

function open(state: GameState, ev: EventDef): void {
  state.event = { id: ev.id, result: null };
  state.flags[`ev:${ev.id}`] = true;
  state.seen.push(ev.id);
  addLog(state, `[${ev.title}]`);
}

// 도착 이벤트. 처음 온 곳이면 자주, 다시 온 곳이면 가끔
export function maybeArrive(state: GameState, rng: Rng, node: MapNode, first: boolean): boolean {
  if (state.over !== 'none' || state.event) return false;
  if (!rng.chance(first ? ARRIVE_FIRST : ARRIVE_AGAIN)) return false;
  const ev = pickWeighted(rng, pool(state, node, 'arrive'));
  if (!ev) return false;
  open(state, ev);
  return true;
}

// 밤 이벤트. 잠에서 깬 뒤에 닥친다
export function maybeNight(state: GameState, rng: Rng, node: MapNode): boolean {
  if (state.over !== 'none' || state.event) return false;
  if (!rng.chance(INDOOR.has(node.kind) ? NIGHT_INDOOR : NIGHT_OUTDOOR)) return false;
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
  if (e.gear && canCarry(state, e.gear)) state.equip.push({ kind: e.gear, broken: false });
  if (e.brokenGear && canCarry(state, e.brokenGear)) state.equip.push({ kind: e.brokenGear, broken: true });
  if (e.flag) state.flags[e.flag] = true;
  if (e.fireOut) state.fire = null;
  if (e.poisonWell) node.waterLeft = 0;
  if (e.hours) passHours(state, rng, node, e.hours, 'work');
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
  state.event.result = outcome.text;
  addLog(state, outcome.text);
  return true;
}

export function closeEvent(state: GameState): boolean {
  if (!state.event || state.event.result === null) return false;
  state.event = null;
  return true;
}
