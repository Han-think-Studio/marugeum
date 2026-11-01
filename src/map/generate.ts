import { Rng } from '../core/rng';
import type { MapNode, NodeKind } from '../core/types';
import { spawnObjects } from '../game/objects';

export const STAGES = 13; // 0 중산리 야영장, 12 향로봉

// 남쪽에서 북쪽으로 백두대간을 따라 올라간다
export const REGIONS = ['중산리', '지리', '덕유', '민주지', '황악', '속리', '소백', '태백', '함백', '두타', '오대', '설악', '향로'];

const KIND_POOL: readonly NodeKind[] = [
  'peak', 'peak', 'peak', 'peak', 'peak',
  'pass', 'pass', 'pass',
  'valley', 'valley', 'valley',
  'temple', 'temple',
  'shelter', 'shelter',
  'village', 'village',
  'spring', 'spring',
  'military',
];

const ALT_RANGE: Record<NodeKind, [number, number]> = {
  start: [0.22, 0.26],
  peak: [0.82, 1.0],
  pass: [0.58, 0.74],
  shelter: [0.64, 0.8],
  spring: [0.48, 0.66],
  temple: [0.38, 0.56],
  military: [0.5, 0.9],
  valley: [0.18, 0.38],
  village: [0.12, 0.3],
  goal: [0.9, 0.98],
};

// 노드 종류별로 먹을 것을 찾아볼 수 있는 횟수
const FORAGE_TRIES: Record<NodeKind, number> = {
  start: 0, peak: 1, pass: 1, shelter: 2, spring: 1, temple: 2, military: 2, valley: 2, village: 3, goal: 0,
};

// 노드 종류별 물. -1 무제한, 0 없음
const WATER: Record<NodeKind, number> = {
  start: 0, peak: 0, pass: 0, shelter: 1, spring: -1, temple: -1, military: 2, valley: -1, village: -1, goal: 0,
};

function nameFor(rng: Rng, kind: NodeKind, region: string): string {
  switch (kind) {
    case 'start':
      return '중산리 야영장';
    case 'goal':
      return '향로봉 안전지대';
    case 'peak':
      return `${region}산 ${rng.pick(['주봉', '상봉', '북봉', '서봉', '능선'])}`;
    case 'pass':
      return `${region}${rng.pick(['재', '령', ' 고개'])}`;
    case 'temple':
      return `${region}산 ${rng.pick(['암자', '옛 절', '산사'])}`;
    case 'shelter':
      return `${region} ${rng.pick(['대피소', '산장', '초소'])}`;
    case 'village':
      return `${region} ${rng.pick(['폐마을', '빈 마을', '옛 마을'])}`;
    case 'valley':
      return `${region} 계곡`;
    case 'spring':
      return `${region} 약수터`;
    case 'military':
      return `${region} ${rng.pick(['군 벙커', '감시초소', '통신기지'])}`;
  }
}

export function generateMap(rng: Rng): MapNode[] {
  const nodes: MapNode[] = [];
  const byStage: MapNode[][] = [];

  const make = (stage: number, kind: NodeKind, slot: number, slots: number): MapNode => {
    const [lo, hi] = ALT_RANGE[kind];
    const alt = rng.range(lo, hi);
    const x = (stage + 0.5) / STAGES + rng.range(-0.018, 0.018);
    // 고도가 높을수록 위쪽. 같은 단계 안에서는 slot으로 살짝 벌린다
    const spread = slots > 1 ? (slot / (slots - 1) - 0.5) * 0.08 : 0;
    const y = 0.1 + (1 - alt) * 0.72 + spread;
    const onRidge = kind === 'goal' || kind === 'peak' || kind === 'pass';
    const node: MapNode = {
      id: nodes.length,
      stage,
      kind,
      name: nameFor(rng, kind, REGIONS[stage]),
      alt,
      side: onRidge ? 'ridge' : kind === 'start' ? 'W' : rng.chance(0.5) ? 'E' : 'W',
      x,
      y: Math.min(0.9, Math.max(0.08, y)),
      links: [],
      visited: false,
      forageLeft: FORAGE_TRIES[kind],
      forageMax: FORAGE_TRIES[kind],
      lastForageDay: 0,
      waterLeft: WATER[kind],
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
    return node;
  };

  byStage[0] = [make(0, 'start', 0, 1)];
  for (let s = 1; s < STAGES - 1; s++) {
    const count = s <= 2 ? 3 : rng.int(2, 3);
    const used = new Set<NodeKind>();
    const list: MapNode[] = [];
    for (let i = 0; i < count; i++) {
      let kind = rng.pick(KIND_POOL);
      let guard = 0;
      while (used.has(kind) && guard++ < 10) kind = rng.pick(KIND_POOL);
      used.add(kind);
      list.push(make(s, kind, i, count));
    }
    // 단계마다 능선 노드가 하나는 있어야 한다
    if (!list.some((n) => n.alt >= 0.75)) {
      const n = list[0];
      n.kind = 'peak';
      n.side = 'ridge';
      n.forageLeft = FORAGE_TRIES.peak;
      n.forageMax = FORAGE_TRIES.peak;
      n.waterLeft = 0;
      n.alt = rng.range(0.82, 1.0);
      n.y = 0.1 + (1 - n.alt) * 0.72;
      n.name = nameFor(rng, 'peak', REGIONS[s]);
    }
    list.sort((a, b) => a.y - b.y);
    // 같은 단계 안에서 세로로 너무 붙으면 벌리고, 가로도 번갈아 비킨다
    for (let i = 1; i < list.length; i++) {
      if (list[i].y - list[i - 1].y < 0.12) list[i].y = Math.min(0.9, list[i - 1].y + 0.12);
    }
    list.forEach((n, i) => {
      n.x += (i % 2 === 0 ? -1 : 1) * 0.012;
    });
    byStage[s] = list;
  }
  byStage[STAGES - 1] = [make(STAGES - 1, 'goal', 0, 1)];
  // 사물 놓기
  let objId = 1;
  for (const n of nodes) spawnObjects(rng, n, () => objId++);

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
  ];

  // 연결. 가까운 고도끼리 잇고, 고아 노드는 가장 가까운 노드에서 이어준다
  for (let s = 0; s < STAGES - 1; s++) {
    const cur = byStage[s];
    const next = byStage[s + 1];
    for (const n of cur) {
      const sorted = [...next].sort((a, b) => Math.abs(a.y - n.y) - Math.abs(b.y - n.y));
      const want = s === 0 ? next.length : next.length === 1 ? 1 : rng.chance(0.55) ? 2 : 1;
      for (let i = 0; i < want && i < sorted.length; i++) n.links.push(sorted[i].id);
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
