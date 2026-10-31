import { Rng } from '../core/rng';
import {
  DIESEL_GEN_BREAK_CHANCE, EQUIP_INFO, FRESH_DAYS, GEN_BREAK_CHANCE, GEN_HOURS_PER_UNIT, HEATER_HOURS_PER_UNIT,
  type EquipKind, type GameState, type MapNode,
} from '../core/types';
import { addLog } from './log';

// 거점 시설. 발전기가 돌면 전기가 있고, 전기가 있으면 냉장고·전등·라디오가 일한다. 난로는 경유로 따로 돈다

export function facilityOk(node: MapNode, kind: EquipKind): boolean {
  return node.camp && node.equip.some((e) => e.kind === kind && !e.broken);
}

// 어떤 발전기를 돌릴 수 있나. 경유 발전기가 있고 경유가 있으면 그것, 아니면 휘발유 발전기
export function generatorSource(node: MapNode): 'dieselGenerator' | 'generator' | null {
  if (!node.store) return null;
  if (facilityOk(node, 'dieselGenerator') && node.store.diesel > 0) return 'dieselGenerator';
  if (facilityOk(node, 'generator') && node.store.gasoline > 0) return 'generator';
  if (facilityOk(node, 'dieselGenerator') && node.fuelClock > 0) return 'dieselGenerator';
  if (facilityOk(node, 'generator') && node.fuelClock > 0) return 'generator';
  return null;
}

export function hasGenerator(node: MapNode): boolean {
  return facilityOk(node, 'generator') || facilityOk(node, 'dieselGenerator');
}

export function isPowered(node: MapNode): boolean {
  return node.camp && node.genOn && generatorSource(node) !== null;
}

export function facilityRunning(node: MapNode, kind: EquipKind): boolean {
  if (kind === 'generator' || kind === 'dieselGenerator') return isPowered(node);
  if (kind === 'heater') return node.camp && node.heaterOn && facilityOk(node, 'heater') && !!node.store && (node.store.diesel > 0 || node.heaterClock > 0);
  return isPowered(node) && facilityOk(node, kind);
}

// 남은 연료로 몇 시간 더 도나
export function generatorHoursLeft(node: MapNode): number {
  const src = generatorSource(node);
  if (!src || !node.store) return 0;
  const fuel = src === 'dieselGenerator' ? node.store.diesel : node.store.gasoline;
  return fuel * GEN_HOURS_PER_UNIT - node.fuelClock;
}

export function heaterHoursLeft(node: MapNode): number {
  if (!node.store) return 0;
  return node.store.diesel * HEATER_HOURS_PER_UNIT - node.heaterClock;
}

export function toggleGenerator(state: GameState, node: MapNode): boolean {
  if (!node.camp || !hasGenerator(node)) return false;
  if (!node.genOn && generatorSource(node) === null) {
    addLog(state, '연료가 없어 발전기를 켤 수 없다.');
    return false;
  }
  node.genOn = !node.genOn;
  addLog(state, node.genOn ? '발전기를 켰다. 엔진 소리가 골짜기에 퍼진다. 냉장고 모터가 돌기 시작한다.' : '발전기를 껐다. 갑자기 조용해져서 귀가 먹먹하다.');
  return true;
}

export function toggleHeater(state: GameState, node: MapNode): boolean {
  if (!node.camp || !facilityOk(node, 'heater') || !node.store) return false;
  if (!node.heaterOn && node.store.diesel <= 0 && node.heaterClock <= 0) {
    addLog(state, '경유가 없어 난로를 켤 수 없다.');
    return false;
  }
  node.heaterOn = !node.heaterOn;
  addLog(state, node.heaterOn ? '난로에 불을 붙였다. 경유 냄새와 함께 온기가 퍼진다.' : '난로를 껐다.');
  return true;
}

// 한 시간. 모든 거점의 시설이 연료를 먹고 가끔 고장 난다. 플레이어가 없어도 돈다
export function tickFacilities(state: GameState, rng: Rng): void {
  for (const node of state.nodes) {
    if (!node.camp || !node.store) continue;
    const here = node.id === state.nodeId;
    if (node.genOn) {
      const src = generatorSource(node);
      if (!src) {
        node.genOn = false;
        node.fuelClock = 0;
        addLog(state, here ? '발전기가 털털거리다 멈췄다. 연료가 떨어졌다.' : `${node.name}의 발전기 연료가 떨어졌을 것이다.`);
      } else {
        node.fuelClock += 1;
        if (node.fuelClock >= GEN_HOURS_PER_UNIT) {
          node.fuelClock = 0;
          if (src === 'dieselGenerator') node.store.diesel -= 1;
          else node.store.gasoline -= 1;
        }
        if (rng.chance(src === 'dieselGenerator' ? DIESEL_GEN_BREAK_CHANCE : GEN_BREAK_CHANCE)) {
          const g = node.equip.find((e) => e.kind === src && !e.broken);
          if (g) {
            g.broken = true;
            node.genOn = false;
            node.fuelClock = 0;
            addLog(state, here ? `${EQUIP_INFO[src].label}가 이상한 소리를 내더니 멈췄다. 고장이다.` : `${node.name}의 발전기가 멈췄을 것이다.`);
          }
        }
      }
    }
    if (node.heaterOn) {
      if (node.store.diesel <= 0 && node.heaterClock <= 0) {
        node.heaterOn = false;
        if (here) addLog(state, '난로가 꺼졌다. 경유가 떨어졌다.');
      } else {
        node.heaterClock += 1;
        if (node.heaterClock >= HEATER_HOURS_PER_UNIT) {
          node.heaterClock = 0;
          node.store.diesel -= 1;
        }
      }
    }
  }
}

// 자정. 신선식이 상한다. 전기 든 냉장고가 있는 저장고는 예외
export function spoilFresh(state: GameState): void {
  if (state.pack.fresh > 0 && state.day - state.freshDay >= FRESH_DAYS) {
    addLog(state, `배낭의 신선식 ${state.pack.fresh}개가 상했다. 버렸다.`);
    state.pack.fresh = 0;
  }
  for (const node of state.nodes) {
    if (!node.camp || !node.store || node.store.fresh <= 0) continue;
    if (facilityRunning(node, 'fridge')) {
      node.freshDay = state.day;
      continue;
    }
    if (state.day - node.freshDay >= FRESH_DAYS) {
      addLog(state, node.id === state.nodeId ? `저장고의 신선식 ${node.store.fresh}개가 상했다.` : `${node.name} 저장고의 신선식은 상했을 것이다.`);
      node.store.fresh = 0;
    }
  }
}

// 신선식 기준일 맞추기. 새로 생겼으면 오늘, 다 없어졌으면 0. 보급품이 바뀔 때마다 부른다
export function syncFresh(state: GameState): void {
  if (state.pack.fresh <= 0) state.freshDay = 0;
  else if (state.freshDay === 0) state.freshDay = state.day;
  for (const node of state.nodes) {
    if (!node.store) continue;
    if (node.store.fresh <= 0) node.freshDay = 0;
    else if (node.freshDay === 0) node.freshDay = state.day;
  }
}

// 하루 소비 요약. 거점 화면에 보여 준다
export function dailyUse(node: MapNode): string[] {
  const out: string[] = [];
  const src = generatorSource(node);
  if (node.genOn && src) out.push(`${EQUIP_INFO[src].label}: ${src === 'dieselGenerator' ? '경유' : '휘발유'} 하루 ${(24 / GEN_HOURS_PER_UNIT).toFixed(0)}통, ${generatorHoursLeft(node)}시간 남음`);
  if (node.heaterOn) out.push(`난로: 경유 하루 ${(24 / HEATER_HOURS_PER_UNIT).toFixed(1)}통, ${heaterHoursLeft(node)}시간 남음`);
  return out;
}
