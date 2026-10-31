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
  equip: Equip[]; // 거점에 둔 장비
  objects: SceneObject[]; // 이 자리에 놓인 사물
  looked: boolean; // 둘러보기를 했나. 숨은 사물이 드러난다
  cave: boolean; // 바위굴을 찾았다. 지붕 없는 곳에서도 바람과 비를 피한다
  windbreak: boolean; // 바람막이를 쌓았다. 지붕 없는 곳의 추위를 줄인다
  upgrades: UpgradeId[]; // 거점 보강
  genOn: boolean; // 발전기를 켜 두었나
  heaterOn: boolean; // 난로를 켜 두었나
  fuelClock: number; // 발전기가 돈 시간. 8시간마다 연료 1
  heaterClock: number; // 난로가 돈 시간. 10시간마다 경유 1
  freshDay: number; // 저장고 신선식 중 가장 오래된 것을 넣은 날
}

// 보급품. 수량으로 센다
export interface Supplies {
  water: number; // 깨끗한 물
  dirty: number; // 오염된 물
  food: number; // 보존식. 통조림, 전투식량, 라면
  fresh: number; // 신선식. 물고기, 고기, 나물. 냉장 없이는 이틀이면 상한다
  wood: number; // 땔감
  gasoline: number; // 휘발유. 승용차에서
  diesel: number; // 경유. 트럭·버스·군용·트랙터에서
  parts: number; // 부품
}
export type Store = Supplies;
export type SupplyKey = keyof Supplies;

export const SUPPLY_LABEL: Record<SupplyKey, string> = {
  water: '물', dirty: '오염수', food: '보존식', fresh: '신선식', wood: '땔감', gasoline: '휘발유', diesel: '경유', parts: '부품',
};
export const SUPPLY_KEYS: SupplyKey[] = ['water', 'dirty', 'food', 'fresh', 'wood', 'gasoline', 'diesel', 'parts'];

export function emptySupplies(): Supplies {
  return { water: 0, dirty: 0, food: 0, fresh: 0, wood: 0, gasoline: 0, diesel: 0, parts: 0 };
}

// 배낭 용량. 물은 깨끗한 물과 오염수를 합쳐서, 먹을 것은 보존식과 신선식을 합쳐서 센다
export interface PackCap {
  water: number;
  food: number;
  wood: number;
  fuel: number; // 휘발유와 경유를 합쳐서
  parts: number;
}
export const PACK_SMALL: PackCap = { water: 3, food: 4, wood: 3, fuel: 2, parts: 4 };
export const PACK_BIG: PackCap = { water: 5, food: 6, wood: 5, fuel: 3, parts: 6 };
export const HEAVY_LIMIT = 2; // 무거운 장비는 이만큼만 지고 다닌다
export const WATER_UNIT = 40; // 물 한 단위가 채우는 갈증
export const FOOD_UNIT = 30; // 음식 한 단위가 채우는 허기
export const FIRE_HOURS = 10; // 땔감 하나로 불이 타는 시간

// 장비. 하나하나가 개체이고 정상이거나 고장이다
export type EquipKind =
  | 'generator' | 'dieselGenerator' | 'fridge' | 'lamp' | 'radio' | 'heater'
  | 'tools' | 'geiger' | 'blanket' | 'bigPack' | 'tent';
export type GearKey = EquipKind;

export interface Equip {
  kind: EquipKind;
  broken: boolean;
}

export interface EquipInfo {
  label: string;
  heavy: boolean; // 무거운 장비
  desc: string;
}

export const EQUIP_INFO: Record<EquipKind, EquipInfo> = {
  generator: { label: '휘발유 발전기', heavy: true, desc: '휘발유로 돈다. 냉장고와 전등과 라디오에 전기를 준다' },
  dieselGenerator: { label: '경유 발전기', heavy: true, desc: '군용. 경유로 돈다. 더 튼튼하다' },
  fridge: { label: '캠핑 냉장고', heavy: true, desc: '전기가 있으면 신선식이 상하지 않는다' },
  lamp: { label: '전등', heavy: false, desc: '전기가 있으면 밤이 덜 위험하다' },
  radio: { label: '라디오', heavy: false, desc: '전기가 있으면 바깥 소식이 들린다' },
  heater: { label: '경유 난로', heavy: true, desc: '경유로 돈다. 거점이 따뜻해진다' },
  tools: { label: '공구', heavy: false, desc: '수리 성공률이 오른다' },
  geiger: { label: '가이거 계수기', heavy: false, desc: '시간당 피폭을 보여 준다' },
  blanket: { label: '담요', heavy: false, desc: '잘 때 추위가 절반이 된다' },
  bigPack: { label: '큰 배낭', heavy: false, desc: '더 많이 진다' },
  tent: { label: '텐트', heavy: true, desc: '지붕 없는 곳에서도 비와 바람을 막는다' },
};
export const GEAR_LABEL: Record<EquipKind, string> = Object.fromEntries(
  (Object.keys(EQUIP_INFO) as EquipKind[]).map((k) => [k, EQUIP_INFO[k].label]),
) as Record<EquipKind, string>;

// 땔감을 모을 수 있는 곳. 군 시설과 출발·도착지는 제외
export const WOOD_NODES: ReadonlySet<NodeKind> = new Set(['start', 'peak', 'pass', 'temple', 'shelter', 'village', 'valley', 'spring']);

export const GEN_HOURS_PER_UNIT = 8; // 발전기 연료 1통으로 도는 시간
export const HEATER_HOURS_PER_UNIT = 10; // 난로 경유 1통으로 도는 시간
export const FRESH_DAYS = 2; // 신선식이 냉장 없이 버티는 날
export const GEN_BREAK_CHANCE = 0.01; // 발전기가 한 시간 돌 때 고장 날 확률
export const DIESEL_GEN_BREAK_CHANCE = 0.004;

// 지니고 다니는 장비가 하루 사이 고장 날 확률. 험한 길에서 흔들리고 젖는다
export const WEAR_CHANCE: Partial<Record<EquipKind, number>> = {
  lamp: 0.03, radio: 0.03, geiger: 0.02, tools: 0.01, fridge: 0.01, heater: 0.01, generator: 0.01, dieselGenerator: 0.005, tent: 0.02,
};

export const REPAIR_HOURS = 2;
export const REPAIR_BASE = 0.55;
export const REPAIR_WITH_TOOLS = 0.8;

// 자연에서 다시 나는 자원이 있는 곳
export const REGROWS: ReadonlySet<NodeKind> = new Set(['valley', 'spring', 'peak', 'pass']);
export const REGROW_DAYS = 3;

export const KIND_LABEL: Record<NodeKind, string> = {
  start: '야영장',
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
  start: '營',
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
export const INDOOR: ReadonlySet<NodeKind> = new Set(['start', 'temple', 'shelter', 'village', 'military']);

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
  nextWeather: Weather; // 다음 날씨. 미리 정해 두어 예보가 가능하다
  nextWind: Wind;
  pack: Supplies; // 배낭
  freshDay: number; // 배낭 신선식 중 가장 오래된 것을 넣은 날
  equip: Equip[]; // 지닌 장비
  fire: { nodeId: number; hours: number } | null; // 피워 둔 불. 자리를 뜨면 꺼진다
  known: Record<string, boolean>; // 걸어 본 길. "작은id-큰id"
  flags: Record<string, boolean>; // 한 번뿐인 이벤트와 이야기 분기 표시
  event: ActiveEvent | null; // 지금 선택을 기다리는 이벤트
  seen: string[]; // 이번 여정에서 만난 이벤트 id
  buried: string[]; // 묻어 준 사람들
  view: 'scene' | 'map'; // 위쪽 큰 화면에 무엇을 보여 주나
  knownStages: number[]; // 수첩 덕에 이미 아는 지역. 노드 이름이 처음부터 보인다
  runNo: number; // 몇 번째 여정인지
  started: number; // 시작 시각(ms)
  recorded: boolean; // 수첩에 적혔는지
  phase: 'base' | 'trek'; // 거점기 / 종주기
  departedDay: number; // 북쪽으로 떠난 날. 0 이면 아직
  baseId: number; // 시작 거점 노드
  ending: EndingId | null; // 어떻게 끝났나
  photoDay: number; // 마지막으로 사진을 본 날
  standoff: Standoff | null; // 지금 벌어지는 대치
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

export type Trigger = 'arrive' | 'night' | 'start' | 'object';

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
  facility?: EquipKind; // 지금 자리 거점에서 이 시설이 돌아가고 있어야 (전기 포함)
  noFacility?: EquipKind; // 이 시설이 돌아가고 있지 않아야
  noUpgrade?: UpgradeId; // 이 보강이 없어야
  phase?: 'base' | 'trek'; // 거점기에만 / 종주기에만
  firstRun?: boolean; // 첫 여정에만 (안내용)
  minClues?: number; // 가족 단서를 이만큼 모았어야
  maxClues?: number;
  minRad?: number; // 피폭이 이 이상이어야
  maxRad?: number;
}

export interface Effect {
  hp?: number; hunger?: number; thirst?: number; temp?: number; fatigue?: number; rad?: number; mind?: number;
  water?: number; dirty?: number; food?: number; fresh?: number; wood?: number; // 배낭 증감. 용량과 0에서 잘린다
  gasoline?: number; diesel?: number; parts?: number;
  foodAll?: boolean; // 먹을 것을 전부 잃는다
  gear?: GearKey; // 장비를 얻는다
  brokenGear?: GearKey; // 고장 난 장비를 얻는다
  hours?: number; // 시간이 흐른다
  flag?: string;
  fireOut?: boolean;
  poisonWell?: boolean; // 이 자리의 물을 못 쓰게 된다
  clue?: string; // 가족 단서를 얻는다
  ending?: EndingId; // 여정이 이렇게 끝난다
  standoff?: StandoffKind; // 대치가 시작된다
  objUsed?: boolean; // 이 사물을 다 썼다 (object 이벤트에서)
  objRemove?: boolean; // 이 사물이 사라진다
  bury?: boolean; // 묻어 준다. 두 시간, 수첩에 이름
  cave?: boolean; // 이 자리에 바위굴이 생긴다
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
  priority?: boolean; // 처음 온 곳에서 조건이 맞으면 확률 없이 반드시 나온다. 가족의 흔적처럼 놓치면 안 되는 것
  when?: When;
  choices: Choice[];
}

export interface ActiveEvent {
  id: string;
  result: string | null; // 선택 뒤 결과 문장. 확인을 누르면 닫힌다
  objectId?: number; // 사물 이벤트면 그 사물
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
  gear: EquipKind[];
  departedDay?: number; // 거점을 떠난 날
  buried?: string[]; // 묻어 준 사람들
  ending?: EndingId | null;
  clues?: number;
  endedAt: number;
}

export interface Journal {
  v: number;
  runs: RunRecord[];
  knownStages: number[]; // 가 본 지역
  eventsSeen: Record<string, number>; // 이벤트별 만난 횟수
  deaths: Record<string, number>; // 사망 원인별 횟수
}

// ---------- 사물 ----------
// 장면 그림 위에 놓여 손으로 만지는 것들. 상호작용은 src/data/objects.ts 의 이벤트로 적는다

export type ObjectKind =
  | 'body' | 'pack' | 'crate' | 'car' | 'truck' | 'well' | 'woodpile' | 'cave' | 'note' | 'photo'
  | 'clothesline' | 'radio' | 'closet' | 'fishing' | 'herbs' | 'shrine' | 'grave' | 'garden';

export interface SceneObject {
  id: number;
  kind: ObjectKind;
  x: number; // 0..1 장면 위 자리
  y: number;
  hidden: boolean; // 둘러보기 전에는 안 보인다
  used: boolean; // 다 쓴 것
  usedDay: number; // 다시 쓸 수 있는 것은 이 날 이후 되돌아온다
  name: string; // 시신의 이름처럼 글에 끼워 넣는 것
}

export const OBJECT_LABEL: Record<ObjectKind, string> = {
  body: '쓰러진 사람', pack: '배낭', crate: '상자', car: '멈춘 차', truck: '군용 트럭', well: '우물', woodpile: '장작더미',
  cave: '바위굴', note: '쪽지', photo: '사진', clothesline: '빨랫줄', radio: '라디오', closet: '벽장', fishing: '물가',
  herbs: '풀밭', shrine: '서낭당', grave: '무덤', garden: '텃밭',
};

// ---------- 안식처 ----------
// 거점 보강. 생산 시설이 아니라 몸을 지키는 손질이다. 재료는 땔감과 부품과 시간뿐

export type UpgradeId = 'window' | 'earth' | 'roof' | 'hearth';

export interface UpgradeInfo {
  label: string;
  desc: string; // 효과
  story: string; // 짓는 장면
  hours: number;
  wood: number;
  parts: number;
}

export const UPGRADES: Record<UpgradeId, UpgradeInfo> = {
  window: { label: '창 막기', desc: '추위가 절반이 된다', story: '널빤지를 뜯어 창을 안쪽에서 못질했다. 바람 소리가 멀어졌다.', hours: 1, wood: 2, parts: 0 },
  earth: { label: '흙 덮기', desc: '피폭이 절반이 된다', story: '세 시간 동안 흙을 퍼 날라 벽 바깥에 쌓았다. 흙은 낙진을 막는다. 옛날 교본에 그렇게 적혀 있었다.', hours: 3, wood: 0, parts: 0 },
  roof: { label: '지붕 수리', desc: '비가 새지 않는다. 비 오는 날의 추위와 피폭이 줄어든다', story: '구멍 난 지붕에 천막을 대고 철사로 묶었다. 빗물이 더는 안으로 들어오지 않는다.', hours: 2, wood: 0, parts: 1 },
  hearth: { label: '화덕', desc: '불이 두 배 오래 타고 안이 더 따뜻하다', story: '돌을 쌓아 화덕을 만들고 연통을 냈다. 연기가 밖으로 빠지니 불을 밤새 둘 수 있다.', hours: 2, wood: 1, parts: 0 },
};
export const UPGRADE_IDS: UpgradeId[] = ['window', 'earth', 'roof', 'hearth'];
export const WINDBREAK = { label: '바람막이', desc: '이 자리의 추위가 줄어든다', story: '돌과 가지를 허리 높이로 쌓아 바람을 막았다. 등 뒤가 조용해졌다.', hours: 1, wood: 1 };

// ---------- 이야기 ----------
// 주인공은 중산리에 가족과 왔다가 대피 때 헤어졌다. 아내 수연과 일곱 살 하율은 버스로 북쪽 수용소로 갔다.
// 단서는 flags 의 'clue:<이름>' 으로 쌓인다. 엔딩은 도착할 때의 단서 수와 피폭, 그리고 선택으로 갈린다

export type EndingId = 'reunion' | 'quarantine' | 'names' | 'stay';

export const ENDING_INFO: Record<EndingId, { title: string; short: string }> = {
  reunion: { title: '재회', short: '향로봉에서 가족을 만났다' },
  quarantine: { title: '유리창', short: '격리동 유리창 너머로 가족을 봤다' },
  names: { title: '이름', short: '향로봉에 닿았지만 가족은 없었다. 이름을 적었다' },
  stay: { title: '남기', short: '북쪽을 포기하고 폐광 사람들과 남았다' },
};

export const FAMILY = { spouse: '수연', child: '하율' };

// ---------- 대치 ----------
// 위험한 조우는 주사위 한 번이 아니라 서너 수의 공방이다. 상대의 기세와 거리가 보이고 수마다 확률이 보인다

export type StandoffKind = 'boar' | 'dogs' | 'deserter';
export type StandoffAction = 'threaten' | 'retreat' | 'throw' | 'fight';

export interface Standoff {
  kind: StandoffKind;
  round: number;
  threat: number; // 0..100 상대의 기세. 0이면 물러난다
  distance: 0 | 1 | 2; // 0 코앞, 1 가까움, 2 멂
  hits: number; // 내가 맞힌 횟수
  cool: number; // 상대가 다시 달려들기까지 남은 수
  log: string[];
  done: null | 'fled' | 'driven' | 'killed' | 'escaped' | 'lost'; // 끝난 방식
}

export const STANDOFF_INFO: Record<StandoffKind, { name: string; threat: number; charge: number; throwItem: 'food' | 'wood'; intro: string }> = {
  boar: { name: '멧돼지', threat: 70, charge: 12, throwItem: 'wood', intro: '멧돼지가 콧김을 뿜으며 앞발로 땅을 긁는다. 어깨가 허리까지 온다.' },
  dogs: { name: '들개 떼', threat: 60, charge: 7, throwItem: 'food', intro: '들개 넷이 반원으로 다가온다. 앞장선 놈의 목에 목줄 자국이 있다.' },
  deserter: { name: '탈영병', threat: 55, charge: 10, throwItem: 'food', intro: '총구가 가슴을 겨눈다. 손이 떨리는 건 그도 마찬가지다.' },
};

export const STANDOFF_ACTION_LABEL: Record<StandoffAction, string> = {
  threaten: '위협한다', retreat: '물러선다', throw: '던진다', fight: '맞선다',
};
