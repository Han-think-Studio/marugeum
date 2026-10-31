export type NodeKind =
  | 'start'
  | 'peak'
  | 'pass'
  | 'temple'
  | 'shelter'
  | 'village'
  | 'valley'
  | 'spring'
  | 'military'
  | 'goal';

export interface MapNode {
  id: number;
  stage: number;
  kind: NodeKind;
  name: string;
  alt: number; // 0..1 고도. 높을수록 깨끗하지만 춥다
  x: number; // 0..1 정규화 좌표
  y: number;
  links: number[]; // 다음 단계로 이어지는 노드 id
  visited: boolean;
}

export const KIND_LABEL: Record<NodeKind, string> = {
  start: '출발지',
  peak: '봉우리',
  pass: '고개',
  temple: '산사',
  shelter: '대피소',
  village: '폐마을',
  valley: '계곡',
  spring: '약수터',
  military: '군 시설',
  goal: '안전지대',
};

export const KIND_GLYPH: Record<NodeKind, string> = {
  start: '기',
  peak: '봉',
  pass: '고',
  temple: '사',
  shelter: '막',
  village: '촌',
  valley: '곡',
  spring: '샘',
  military: '군',
  goal: '終',
};

export interface Stats {
  hp: number;
  hunger: number;
  thirst: number;
  temp: number;
  fatigue: number;
  rad: number;
  mind: number;
}

export interface GameState {
  seed: number;
  nodes: MapNode[];
  nodeId: number;
  day: number;
  hour: number; // 0..23
  stats: Stats;
  log: string[];
  over: 'none' | 'dead' | 'won';
}