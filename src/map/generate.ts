import { Rng } from '../core/rng';
import type { MapNode, NodeKind } from '../core/types';
import { spawnObjects } from '../game/objects';
import { PLACES, STAGES, REGIONS, placeById } from '../data/places';

export { STAGES, REGIONS };

// 노드 종류별로 먹을 것을 찾아볼 수 있는 횟수
const FORAGE_TRIES: Record<NodeKind, number> = {
  start: 0, peak: 1, pass: 1, shelter: 2, spring: 1, temple: 2, military: 2, valley: 2, village: 3, goal: 0,
};

// 노드 종류별 물. -1 무제한, 0 없음
const WATER: Record<NodeKind, number> = {
  start: 0, peak: 0, pass: 0, shelter: 1, spring: -1, temple: -1, military: 2, valley: -1, village: -1, goal: 0,
};

// 땅은 src/data/places.ts 에 손으로 적혀 있다. 매번 같다. 무작위인 것은 사물과 길뿐이다
export function generateMap(rng: Rng): MapNode[] {
  const nodes: MapNode[] = [];
  const byStage: MapNode[][] = Array.from({ length: STAGES }, () => []);

  for (const p of PLACES) {
    const node: MapNode = {
      id: nodes.length,
      stage: p.stage,
      kind: p.kind,
      place: p.id,
      name: p.name,
      alt: p.alt,
      side: p.side,
      x: 0,
      y: 0,
      links: [],
      visited: false,
      forageLeft: p.forage ?? FORAGE_TRIES[p.kind],
      forageMax: p.forage ?? FORAGE_TRIES[p.kind],
      lastForageDay: 0,
      waterLeft: p.water ?? WATER[p.kind],
      camp: false,
      campTier: 0,
      store: null,
      equip: [],
      objects: [],
      looked: false,
      rested: false,
      secured: false,
      scouted: false,
      cave: false,
      windbreak: false,
      upgrades: [],
      genOn: false,
      heaterOn: false,
      fuelClock: 0,
      heaterClock: 0,
      freshDay: 0,
    };
    nodes.push(node);
    byStage[p.stage].push(node);
  }

  // 자리 배치. x 는 단계, y 는 고도. 같은 단계 안에서는 세로로 벌리고 가로도 번갈아 비킨다
  for (let s = 0; s < STAGES; s++) {
    const list = byStage[s].sort((a, b) => b.alt - a.alt);
    list.forEach((n, i) => {
      n.x = (s + 0.5) / STAGES + (list.length > 1 ? (i % 2 === 0 ? -1 : 1) * 0.012 : 0);
      n.y = Math.min(0.9, Math.max(0.08, 0.1 + (1 - n.alt) * 0.72));
    });
    for (let i = 1; i < list.length; i++) {
      if (list[i].y - list[i - 1].y < 0.12) list[i].y = Math.min(0.9, list[i - 1].y + 0.12);
    }
  }

  // 사물 놓기. 자리에 정해진 것부터, 나머지는 무작위
  let objId = 1;
  for (const n of nodes) spawnObjects(rng, n, () => objId++, placeById(n.place).objects);

  const base = byStage[0][0];
  base.visited = true;
  base.looked = true;
  base.rested = true;
  base.secured = true;
  base.camp = true;
  base.campTier = 3;
  base.store = { water: 4, dirty: 0, food: 6, fresh: 0, wood: 2, gasoline: 2, diesel: 0, parts: 1 };
  base.equip = [
    { kind: 'generator', broken: true },
    { kind: 'fridge', broken: false },
    { kind: 'lamp', broken: false },
    { kind: 'radio', broken: false, cond: 90 },
    { kind: 'battery', broken: false, charges: 4 },
  ];

  // 연결. 자리마다 적힌 길을 잇고, 여정마다 길 하나가 더 열릴 수 있다. 고아 노드는 가장 가까운 노드에서 이어준다
  const idOf = new Map(nodes.map((n) => [n.place, n.id]));
  for (let s = 0; s < STAGES - 1; s++) {
    const cur = byStage[s];
    const next = byStage[s + 1];
    for (const n of cur) {
      const fixed = s === 0 ? next.map((m) => m.place) : (placeById(n.place).links ?? []);
      for (const pid of fixed) {
        const id = idOf.get(pid);
        if (id === undefined) throw new Error(`없는 길: ${n.place} → ${pid}`);
        if (!n.links.includes(id)) n.links.push(id);
      }
      if (s > 0 && rng.chance(0.25)) {
        const extra = next.filter((m) => !n.links.includes(m.id));
        if (extra.length > 0) n.links.push(rng.pick(extra).id);
      }
    }
    for (const m of next) {
      if (cur.some((n) => n.links.includes(m.id))) continue;
      const from = [...cur].sort((a, b) => Math.abs(a.y - m.y) - Math.abs(b.y - m.y))[0];
      from.links.push(m.id);
    }
    for (const n of cur) n.links.sort((a, b) => nodes[a].y - nodes[b].y);
  }

  return nodes;
}
