import { Rng } from '../core/rng';
import type { GameState, MapNode, Stats } from '../core/types';
import { generateMap } from '../map/generate';

export function createGame(seed: number): GameState {
  const rng = new Rng(seed);
  const nodes = generateMap(rng);
  const stats: Stats = { hp: 100, hunger: 100, thirst: 100, temp: 100, fatigue: 100, rad: 0, mind: 100 };
  const state: GameState = {
    seed,
    nodes,
    nodeId: 0,
    day: 1,
    hour: 7,
    stats,
    log: [],
    over: 'none',
  };
  addLog(state, '지리산 천왕봉. 바다는 죽었고 낮은 땅은 비에 젖으면 위험하다. 능선을 따라 북쪽으로 간다.');
  return state;
}

export function currentNode(state: GameState): MapNode {
  return state.nodes[state.nodeId];
}

export function reachable(state: GameState): MapNode[] {
  return currentNode(state).links.map((id) => state.nodes[id]);
}

// 이동 시간. 기본 3시간에 고도 차이만큼 더 걸린다
export function travelHours(from: MapNode, to: MapNode): number {
  const diff = Math.abs(from.alt - to.alt);
  return Math.max(2, Math.round(3 + diff * 6));
}

export function addLog(state: GameState, text: string): void {
  state.log.push(text);
  if (state.log.length > 60) state.log.shift();
}

export function advanceTime(state: GameState, hours: number): void {
  state.hour += hours;
  while (state.hour >= 24) {
    state.hour -= 24;
    state.day += 1;
  }
}

export function timeLabel(state: GameState): string {
  const h = state.hour;
  const part = h < 5 ? '깊은 밤' : h < 8 ? '새벽' : h < 12 ? '아침' : h < 17 ? '낮' : h < 20 ? '저녁' : '밤';
  return `${state.day}일째 ${String(h).padStart(2, '0')}시 ${part}`;
}

export function travelTo(state: GameState, id: number): boolean {
  if (state.over !== 'none') return false;
  const from = currentNode(state);
  if (!from.links.includes(id)) return false;
  const to = state.nodes[id];
  const hours = travelHours(from, to);
  advanceTime(state, hours);
  state.nodeId = id;
  to.visited = true;
  const dir = to.alt > from.alt + 0.1 ? '올라' : to.alt < from.alt - 0.1 ? '내려' : '걸어';
  addLog(state, `${hours}시간을 ${dir}가 ${to.name}에 닿았다.`);
  if (to.kind === 'goal') {
    state.over = 'won';
    addLog(state, '안전지대의 불빛이 보인다. 살아서 도착했다.');
  }
  return true;
}