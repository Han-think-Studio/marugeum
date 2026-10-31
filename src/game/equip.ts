import { EQUIP_INFO, HEAVY_LIMIT, type Equip, type EquipKind, type GameState } from '../core/types';

// 지닌 장비 중 멀쩡한 것이 있는가
export function hasEquip(state: GameState, kind: EquipKind): boolean {
  return state.equip.some((e) => e.kind === kind && !e.broken);
}

export function heavyCount(list: Equip[]): number {
  return list.filter((e) => EQUIP_INFO[e.kind].heavy).length;
}

// 더 질 수 있는가. 무거운 장비는 두 개까지
export function canCarry(state: GameState, kind: EquipKind): boolean {
  return !EQUIP_INFO[kind].heavy || heavyCount(state.equip) < HEAVY_LIMIT;
}

export function equipLabel(e: Equip): string {
  return EQUIP_INFO[e.kind].label + (e.broken ? ' (고장)' : '');
}
