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
  wood: number; // 땔감
}

export interface PackCap {
  water: number;
  food: number;
  wood: number;
}
export const PACK_SMALL: PackCap = { water: 3, food: 4, wood: 3 };
export const PACK_BIG: PackCap = { water: 5, food: 6, wood: 5 };
export const WATER_UNIT = 40; // 물 한 단위가 채우는 갈증
export const FOOD_UNIT = 30; // 음식 한 단위가 채우는 허기
export const FIRE_HOURS = 10; // 땔감 하나로 불이 타는 시간

// 주워서 몸에 지니는 생존 도구. 생산 시설은 없다
export type GearKey = 'blanket' | 'bigPack' | 'geiger';
export type Gear = Record<GearKey, boolean>;
export const GEAR_LABEL: Record<GearKey, string> = { blanket: '담요', bigPack: '큰 배낭', geiger: '가이거 계수기' };

// 땔감을 모을 수 있는 곳. 군 시설과 출발·도착지는 제외
export const WOOD_NODES: ReadonlySet<NodeKind> = new Set(['peak', 'pass', 'temple', 'shelter', 'village', 'valley', 'spring']);

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
  gear: Gear; // 지닌 도구
  fire: { nodeId: number; hours: number } | null; // 피워 둔 불. 자리를 뜨면 꺼진다
  known: Record<string, boolean>; // 걸어 본 길. "작은id-큰id"
  flags: Record<string, boolean>; // 한 번뿐인 이벤트와 이야기 분기 표시
  event: ActiveEvent | null; // 지금 선택을 기다리는 이벤트
  seen: string[]; // 이번 여정에서 만난 이벤트 id
  knownStages: number[]; // 수첩 덕에 이미 아는 지역. 노드 이름이 처음부터 보인다
  runNo: number; // 몇 번째 여정인지
  started: number; // 시작 시각(ms)
  recorded: boolean; // 수첩에 적혔는지
  log: string[];
  over: 'none' | 'dead' | 'won';
  overText: string;
  rngState: number; // 게임 진행용 난수 상태
}

export function edgeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

// ---------- 이벤트 ----------
// 이벤트는 src/data/events.ts 에 데이터로만 적는다. 코드 없이 이야기를 더할 수 있다

export type Trigger = 'arrive' | 'night';

export interface When {
  kinds?: NodeKind[]; // 이런 곳에서만
  stages?: number[]; // 이 지역(단계)에서만. 0 지리 … 11 향로
  weather?: Weather[];
  night?: boolean; // 밤에만 (arrive)
  outdoor?: boolean; // 지붕 없는 곳에서만 (night)
  minDay?: number;
  maxDay?: number;
  flag?: string; // 이 표시가 있어야
  noFlag?: string; // 이 표시가 없어야
  gear?: GearKey;
  noGear?: GearKey;
}

export interface Effect {
  hp?: number; hunger?: number; thirst?: number; temp?: number; fatigue?: number; rad?: number; mind?: number;
  water?: number; dirty?: number; food?: number; wood?: number; // 배낭 증감. 용량과 0에서 잘린다
  foodAll?: boolean; // 먹을 것을 전부 잃는다
  gear?: GearKey;
  hours?: number; // 시간이 흐른다
  flag?: string;
  fireOut?: boolean;
  poisonWell?: boolean; // 이 자리의 물을 못 쓰게 된다
}

export interface Outcome {
  chance?: number; // 없으면 마지막 보루
  text: string;
  effects?: Effect;
}

export interface Req {
  food?: number; water?: number; wood?: number; gear?: GearKey; fire?: boolean;
}

export interface Choice {
  text: string;
  hint?: string; // 버튼 아래 작은 글씨
  req?: Req; // 조건이 안 되면 흐리게
  outcomes: Outcome[];
}

export interface EventDef {
  id: string;
  trigger: Trigger;
  title: string;
  text: string;
  weight?: number; // 기본 1
  once?: boolean;
  when?: When;
  choices: Choice[];
}

export interface ActiveEvent {
  id: string;
  result: string | null; // 선택 뒤 결과 문장. 확인을 누르면 닫힌다
}

// ---------- 기록 수첩 ----------
// 여정이 끝나면 남는 것. 브라우저 저장소에 쌓인다

export interface RunRecord {
  runNo: number;
  seed: number;
  days: number;
  over: 'dead' | 'won';
  cause: string; // 사망 문장 또는 도착 문장
  rad: number;
  farthest: number; // 가장 멀리 간 단계
  events: string[]; // 만난 이벤트 id
  gear: GearKey[];
  endedAt: number;
}

export interface Journal {
  v: number;
  runs: RunRecord[];
  knownStages: number[]; // 가 본 지역
  eventsSeen: Record<string, number>; // 이벤트별 만난 횟수
  deaths: Record<string, number>; // 사망 원인별 횟수
}
