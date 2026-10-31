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

// 능선 위인지, 동쪽 사면인지, 서쪽 사면인지. 바다 쪽 바람이 불면 그쪽 사면이 위험하다
export type Side = 'ridge' | 'E' | 'W';

export interface MapNode {
  id: number;
  stage: number;
  kind: NodeKind;
  name: string;
  alt: number; // 0..1 고도. 높을수록 깨끗하지만 춥다
  side: Side;
  x: number; // 0..1 정규화 좌표
  y: number;
  links: number[]; // 다음 단계로 이어지는 노드 id
  visited: boolean;
  forageLeft: number; // 이 노드에서 먹을 것을 더 찾을 수 있는 횟수
  forageMax: number; // 자연 자원은 며칠마다 이 값까지 회복한다
  lastForageDay: number; // 마지막으로 뒤진 날
  waterLeft: number; // 물. -1 무제한, 0 없음, n 남은 횟수
  camp: boolean; // 거점을 세운 곳
  store: Store | null; // 거점 저장고
}

// 배낭과 저장고에 들어가는 것. 단위 수량
export interface Store {
  water: number; // 깨끗한 물
  dirty: number; // 오염된 물
  food: number;
}

export const PACK_CAP = { water: 3, food: 4 } as const;
export const WATER_UNIT = 40; // 물 한 단위가 채우는 갈증
export const FOOD_UNIT = 30; // 음식 한 단위가 채우는 허기

// 자연에서 다시 나는 자원이 있는 곳
export const REGROWS: ReadonlySet<NodeKind> = new Set(['valley', 'spring', 'peak', 'pass']);
export const REGROW_DAYS = 3;

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

// 지붕이 있어 비와 바람을 피할 수 있는 곳
export const INDOOR: ReadonlySet<NodeKind> = new Set(['temple', 'shelter', 'village', 'military']);

export const SIDE_LABEL: Record<Side, string> = { ridge: '능선', E: '동쪽 사면', W: '서쪽 사면' };

export type Weather = 'clear' | 'cloud' | 'rain' | 'fog';
export type Wind = 'calm' | 'E' | 'W';

export const WEATHER_LABEL: Record<Weather, string> = { clear: '맑음', cloud: '흐림', rain: '비', fog: '안개' };
export const WIND_LABEL: Record<Wind, string> = { calm: '바람 없음', E: '동풍', W: '서풍' };

export interface Stats {
  hp: number;
  hunger: number;
  thirst: number;
  temp: number;
  fatigue: number;
  rad: number;
  mind: number;
}

export type StatKey = keyof Stats;

export interface GameState {
  seed: number;
  nodes: MapNode[];
  nodeId: number;
  day: number;
  hour: number; // 0..23
  stats: Stats;
  weather: Weather;
  wind: Wind;
  weatherLeft: number; // 날씨가 바뀌기까지 남은 시간
  pack: Store; // 배낭
  known: Record<string, boolean>; // 걸어 본 길. "작은id-큰id"
  log: string[];
  over: 'none' | 'dead' | 'won';
  overText: string;
  rngState: number; // 게임 진행용 난수 상태
}

export function edgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}
