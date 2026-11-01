import { INDOOR, type GameState } from '../core/types';

// 저장. 브라우저 저장소에 상태를 통째로 넣는다. 함수가 없는 평범한 객체라 그대로 된다
const KEY = 'marugeum.save.v3';

export function saveGame(state: GameState): boolean {
  if (state.over !== 'none') return false;
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 3, state }));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { v: number; state: GameState };
    if (!data || data.v !== 3 || !data.state || !Array.isArray(data.state.nodes)) return null;
    // 땅이 손으로 짜이기 전의 저장은 이어갈 수 없다
    if (data.state.nodes.some((n) => n.place === undefined)) return null;
    return upgrade(data.state);
  } catch {
    return null;
  }
}

// 예전 저장에 없던 칸을 채운다. 거점 단계는 자리에서 되짚는다
function upgrade(state: GameState): GameState {
  if (!Array.isArray(state.knownPlaces)) state.knownPlaces = [];
  if (!Array.isArray(state.deadAt)) state.deadAt = [];
  if (!Array.isArray(state.marked)) state.marked = [];
  if (state.crisis === undefined) state.crisis = null;
  if (state.radioHour === undefined) state.radioHour = -99;
  if (state.radioCount === undefined) state.radioCount = 0;
  for (const n of state.nodes) {
    if (n.campTier === undefined) n.campTier = n.camp ? (INDOOR.has(n.kind) ? 3 : n.cave ? 2 : 1) : 0;
    if (n.rested === undefined) n.rested = n.camp;
    if (n.secured === undefined) n.secured = n.camp && n.looked;
    if (n.scouted === undefined) n.scouted = false;
  }
  return state;
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 저장소가 막혀 있으면 조용히 넘어간다
  }
}

export function hasSave(): boolean {
  return loadGame() !== null;
}
