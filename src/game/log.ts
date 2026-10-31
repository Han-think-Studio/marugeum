import type { GameState } from '../core/types';

export function addLog(state: GameState, text: string): void {
  state.log.push(text);
  if (state.log.length > 60) state.log.shift();
}
