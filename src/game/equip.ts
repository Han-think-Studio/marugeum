import { DEFAULT_CHARGES, EQUIP_INFO, HEAVY_LIMIT, HEAVY_LIMIT_CARRIER, type Equip, type EquipKind, type GameState, type MapNode } from '../core/types';

// 지닌 장비 중 멀쩡한 것이 있는가
export function hasEquip(state: GameState, kind: EquipKind): boolean {
  return state.equip.some((e) => e.kind === kind && !e.broken);
}

// 이 자리에 쓸 수 있는 텐트가 있는가. 배낭에 들었거나 여기 쳐 두었거나
export function tentAt(state: GameState, node: MapNode): boolean {
  return hasEquip(state, 'tent') || node.equip.some((e) => e.kind === 'tent' && !e.broken);
}

export function heavyCount(list: Equip[]): number {
  return list.filter((e) => EQUIP_INFO[e.kind].heavy).length;
}

export function heavyLimit(state: GameState): number {
  return hasEquip(state, 'carrier') ? HEAVY_LIMIT_CARRIER : HEAVY_LIMIT;
}

// 더 질 수 있는가. 무거운 장비는 두 개, 지게가 있으면 네 개까지
export function canCarry(state: GameState, kind: EquipKind): boolean {
  return !EQUIP_INFO[kind].heavy || heavyCount(state.equip) < heavyLimit(state);
}

export function equipLabel(e: Equip): string {
  return EQUIP_INFO[e.kind].label + (e.charges !== undefined ? ` ×${e.charges}` : '') + (e.broken ? ' (고장)' : '');
}

// 장비를 얻는다. 쓰는 물건은 이미 있으면 횟수를 더한다. 못 지면 false
export function gainEquip(state: GameState, kind: EquipKind, broken = false): boolean {
  const charges = DEFAULT_CHARGES[kind];
  if (charges !== undefined) {
    const have = state.equip.find((e) => e.kind === kind);
    if (have) {
      have.charges = (have.charges ?? 0) + charges;
      return true;
    }
    state.equip.push({ kind, broken: false, charges });
    return true;
  }
  if (!canCarry(state, kind)) return false;
  state.equip.push({ kind, broken });
  return true;
}

// 횟수를 하나 쓴다. 0이 되면 사라진다
export function useCharge(state: GameState, kind: EquipKind): boolean {
  const i = state.equip.findIndex((e) => e.kind === kind && (e.charges ?? 0) > 0);
  if (i < 0) return false;
  const e = state.equip[i];
  e.charges = (e.charges ?? 1) - 1;
  if (e.charges <= 0) state.equip.splice(i, 1);
  return true;
}
