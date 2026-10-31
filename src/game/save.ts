import type { GameState } from '../core/types';

// 저장. 브라우저 저장소에 상태를 통째로 넣는다. 함수가 없는 평범한 객체라 그대로 된다
const KEY = 'marugeum.save.v2';

export function saveGame(state: GameState): boolean {
  if (state.over !== 'none') return false;
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 2, state }));
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
    if (!data || data.v !== 2 || !data.state || !Array.isArray(data.state.nodes)) return null;
    return data.state;
  } catch {
    return null;
  }
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
