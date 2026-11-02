import type { GameState, Journal, MapNode } from '../core/types';

// 리본. 백두대간을 걷는 사람들은 갈림길 나뭇가지에 산악회 리본을 묶어 길을 남긴다
// 마루금(능선과 능선을 잇는 길)에는 옛 리본이 남아 있어 길을 잃지 않는다. 대신 높고 춥다
// 내가 걸은 길에는 내가 리본을 묶는다. 다음 여정의 나는 그 길을 아는 길처럼 걷는다. 리본은 세 여정이 지나면 바랜다
export const RIBBON_RUNS = 3;

// 지도는 매번 같으니 자리 id 로 길을 부른다
export function ribbonKey(a: MapNode, b: MapNode): string {
  return a.place < b.place ? `${a.place}~${b.place}` : `${b.place}~${a.place}`;
}

// 능선끼리 잇는 길. 옛 산악회 리본이 남은 마루금
export function ridgeRibbon(a: MapNode, b: MapNode): boolean {
  return a.side === 'ridge' && b.side === 'ridge';
}

// 지난 여정의 내가 묶은 리본이 남은 길
export function myRibbon(state: GameState, a: MapNode, b: MapNode): boolean {
  return state.ribbons.includes(ribbonKey(a, b));
}

// 길을 다 걸었을 때 리본을 묶는다. 처음 묶은 것이면 true
export function tieRibbon(state: GameState, a: MapNode, b: MapNode): boolean {
  const key = ribbonKey(a, b);
  if (state.tied.includes(key)) return false;
  state.tied.push(key);
  return true;
}

// 이번 여정에 쓸 리본. 바래지 않은 것만
export function activeRibbons(j: Journal, runNo: number): string[] {
  return (j.ribbons ?? []).filter((r) => runNo - r.run <= RIBBON_RUNS).map((r) => r.key);
}

// 여정이 끝나면 묶은 리본을 수첩에 적는다. 같은 길이면 새 리본으로 바꾼다
export function recordRibbons(j: Journal, state: GameState): void {
  const list = (j.ribbons ?? []).filter((r) => !state.tied.includes(r.key) && state.runNo - r.run <= RIBBON_RUNS);
  for (const key of state.tied) list.push({ key, run: state.runNo });
  j.ribbons = list;
}
