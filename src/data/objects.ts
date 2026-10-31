import type { EventDef, NodeKind, ObjectKind } from '../core/types';

// 장소마다 놓일 수 있는 사물과 자리. 자리는 장면 그림 위의 0..1 좌표다
export interface ObjectSpawn {
  kind: ObjectKind;
  weight: number;
  hidden?: boolean; // 둘러보기 전에는 안 보인다
  reusableDays?: number; // 며칠 지나면 다시 쓸 수 있다
}

export interface PlaceObjects {
  anchors: [number, number][]; // 사물이 놓일 자리들
  count: [number, number];
  pool: ObjectSpawn[];
}

export const PLACE_OBJECTS: Record<NodeKind, PlaceObjects> = {
  start: {
    anchors: [[0.15, 0.72], [0.4, 0.78], [0.62, 0.7], [0.85, 0.74]],
    count: [2, 3],
    pool: [{ kind: 'crate', weight: 2 }, { kind: 'woodpile', weight: 2 }, { kind: 'note', weight: 1, hidden: true }],
  },
  peak: {
    anchors: [[0.2, 0.62], [0.5, 0.55], [0.8, 0.66], [0.35, 0.8]],
    count: [2, 3],
    pool: [{ kind: 'cave', weight: 2, hidden: true }, { kind: 'herbs', weight: 3, reusableDays: 3 }, { kind: 'body', weight: 1, hidden: true }, { kind: 'pack', weight: 2 }, { kind: 'note', weight: 1 }],
  },
  pass: {
    anchors: [[0.2, 0.7], [0.45, 0.74], [0.7, 0.72], [0.9, 0.6]],
    count: [2, 3],
    pool: [{ kind: 'car', weight: 3 }, { kind: 'truck', weight: 1 }, { kind: 'body', weight: 1, hidden: true }, { kind: 'shrine', weight: 1 }, { kind: 'pack', weight: 1, hidden: true }],
  },
  temple: {
    anchors: [[0.18, 0.7], [0.45, 0.76], [0.72, 0.68], [0.9, 0.78]],
    count: [3, 4],
    pool: [{ kind: 'well', weight: 2 }, { kind: 'closet', weight: 3, hidden: true }, { kind: 'crate', weight: 2 }, { kind: 'note', weight: 1 }, { kind: 'woodpile', weight: 2 }, { kind: 'grave', weight: 1 }],
  },
  shelter: {
    anchors: [[0.2, 0.74], [0.5, 0.8], [0.75, 0.7], [0.9, 0.78]],
    count: [3, 4],
    pool: [{ kind: 'woodpile', weight: 2 }, { kind: 'closet', weight: 3, hidden: true }, { kind: 'crate', weight: 2 }, { kind: 'body', weight: 1, hidden: true }, { kind: 'pack', weight: 2 }, { kind: 'radio', weight: 1, hidden: true }, { kind: 'toolshed', weight: 1, hidden: true }],
  },
  village: {
    anchors: [[0.12, 0.72], [0.35, 0.78], [0.55, 0.82], [0.75, 0.7], [0.92, 0.6], [0.25, 0.62]],
    count: [4, 5],
    pool: [{ kind: 'well', weight: 2 }, { kind: 'closet', weight: 3, hidden: true }, { kind: 'garden', weight: 2, reusableDays: 4 }, { kind: 'toolshed', weight: 2, hidden: true }, { kind: 'body', weight: 2, hidden: true }, { kind: 'clothesline', weight: 1 }, { kind: 'crate', weight: 2, hidden: true }, { kind: 'photo', weight: 1, hidden: true }, { kind: 'grave', weight: 1 }],
  },
  valley: {
    anchors: [[0.2, 0.8], [0.5, 0.84], [0.1, 0.6], [0.8, 0.74]],
    count: [2, 3],
    pool: [{ kind: 'fishing', weight: 4, reusableDays: 3 }, { kind: 'herbs', weight: 2, reusableDays: 3 }, { kind: 'cave', weight: 1, hidden: true }, { kind: 'body', weight: 1, hidden: true }, { kind: 'pack', weight: 1, hidden: true }],
  },
  spring: {
    anchors: [[0.5, 0.78], [0.2, 0.7], [0.8, 0.72], [0.65, 0.6]],
    count: [2, 3],
    pool: [{ kind: 'herbs', weight: 3, reusableDays: 3 }, { kind: 'shrine', weight: 2 }, { kind: 'note', weight: 1 }, { kind: 'pack', weight: 1 }, { kind: 'cave', weight: 1, hidden: true }],
  },
  military: {
    anchors: [[0.25, 0.72], [0.5, 0.76], [0.78, 0.7], [0.9, 0.8]],
    count: [3, 4],
    pool: [{ kind: 'crate', weight: 3, hidden: true }, { kind: 'truck', weight: 2 }, { kind: 'body', weight: 1, hidden: true }, { kind: 'radio', weight: 1, hidden: true }],
  },
  goal: { anchors: [[0.5, 0.8]], count: [0, 0], pool: [] },
};

export const BODY_NAMES = ['김영수', '박정희', '이순자', '최민호', '정하늘', '강도윤', '윤서연', '한지우', '오세훈', '임태희', '서준혁', '문가영', '배성민', '신예린'];

// 사물 상호작용. 본문과 결과의 {name} 은 사물의 이름으로 바뀐다
export const OBJECT_EVENTS: EventDef[] = [
  {
    id: 'obj_body',
    trigger: 'object',
    title: '쓰러진 사람',
    text: '{name}. 주머니의 신분증이 그렇게 말한다. 등산복 차림이고 배낭은 반쯤 열려 있다. 얼굴은 보지 않기로 한다.',
    choices: [
      { text: '묻어 준다', hint: '2시간 · 정신', outcomes: [{ text: '돌을 치우고 흙을 긁었다. 두 시간. 신분증은 가슴에 올려 두었다. 이름을 수첩에 적었다. 누군가는 적어야 한다.', effects: { bury: true, mind: 8, objUsed: true } }] },
      { text: '소지품을 살핀다', hint: '물건 · 정신', outcomes: [
        { chance: 0.7, text: '배낭에 물 한 통과 먹을 것 둘. 미안하다고 말하고 챙겼다. 그 사람은 대답하지 않았다.', effects: { water: 1, food: 2, mind: -6, objUsed: true } },
        { text: '배낭은 비어 있었다. 이미 누군가 다녀간 것이다. 그래도 손이 떨렸다.', effects: { mind: -5, objUsed: true } },
      ] },
      { text: '묻고 소지품도 챙긴다', hint: '2시간', outcomes: [{ text: '먼저 배낭을 비우고 그다음 묻었다. 순서가 반대였어야 했다는 생각이 흙을 덮는 내내 들었다.', effects: { bury: true, water: 1, food: 2, mind: 2, objUsed: true } }] },
      { text: '그냥 둔다', outcomes: [{ text: '돌아섰다. 바람이 등을 밀었다.', effects: { mind: -3 } }] },
    ],
  },
  {
    id: 'obj_pack',
    trigger: 'object',
    title: '배낭',
    text: '버려진 배낭 하나. 주인은 없다. 지퍼가 열려 있고 비에 젖은 자국이 있다.',
    choices: [
      { text: '뒤진다', outcomes: [
        { chance: 0.35, text: '통조림 둘과 담요. 밑바닥에 아이 그림이 한 장 있었다. 그림은 두고 왔다.', effects: { food: 2, gear: 'blanket', mind: -2, objUsed: true } },
        { chance: 0.35, text: '등산용 로프와 접이식 칼. 주인은 산을 아는 사람이었다.', effects: { gear: 'rope', brokenGear: 'knife', objUsed: true } },
        { chance: 0.6, text: '먹을 것 둘과 물 한 통. 주인이 급히 떠난 모양이다.', effects: { food: 2, water: 1, objUsed: true } },
        { text: '젖은 옷가지뿐이었다.', effects: { objUsed: true } },
      ] },
      { text: '그냥 둔다', outcomes: [{ text: '주인이 돌아올지도 모른다. 그럴 리 없다는 걸 알면서도.', effects: {} }] },
    ],
  },
  {
    id: 'obj_crate',
    trigger: 'object',
    title: '상자',
    text: '나무 상자. 못이 박혀 있다. 흔들면 안에서 소리가 난다.',
    choices: [
      { text: '뜯는다', hint: '30분', outcomes: [
        { chance: 0.35, text: '통조림과 부품 상자. 누군가 챙기려다 못 챙긴 것이다.', effects: { food: 3, parts: 1, objUsed: true } },
        { chance: 0.3, text: '구급상자. 붕대와 소독약, 요오드 알약 한 통, 정수 알약.', effects: { gear: 'medkit', objUsed: true, flag: 'crate_med' } },
        { chance: 0.3, text: '정수 알약 한 통과 요오드. 누군가 대피 물품을 챙겼다가 두고 갔다.', effects: { gear: 'purifier', objUsed: true } },
        { chance: 0.6, text: '생수 묶음과 라면. 아직 봉인이 그대로다.', effects: { water: 2, food: 2, objUsed: true } },
        { text: '빈 병과 쓰레기. 소리는 깨진 유리였다.', effects: { objUsed: true } },
      ] },
      { text: '두고 간다', outcomes: [{ text: '못을 뽑을 시간이 아깝다. 아닐지도 모르지만.', effects: {} }] },
    ],
  },
  {
    id: 'obj_car',
    trigger: 'object',
    title: '멈춘 차',
    text: '승용차. 문이 열려 있고 열쇠가 꽂혀 있다. 기름은 모르겠다. 뒷좌석에 아이 의자가 있다.',
    choices: [
      { text: '연료를 뽑는다', hint: '1시간 · 휘발유', outcomes: [
        { chance: 0.6, text: '호스를 넣고 입으로 빨았다. 한 모금 삼키고 토했지만 통을 채웠다.', effects: { gasoline: 2, hours: 1, hp: -3, objUsed: true } },
        { text: '연료통은 거의 비어 있었다. 한 통도 안 됐다.', effects: { gasoline: 1, hours: 1, objUsed: true } },
      ] },
      { text: '차 안을 뒤진다', hint: '30분', outcomes: [
        { chance: 0.4, text: '글로브박스에서 사탕과 라이터. 트렁크의 담요도 챙겼다.', effects: { food: 1, gear: 'matches', objUsed: true } },
        { chance: 0.4, text: '글로브박스에 손전등. 켜 보니 밝다.', effects: { gear: 'flashlight', objUsed: true } },
        { text: '아이 의자 밑에 장난감 하나. 그것뿐이었다.', effects: { mind: -3, objUsed: true } },
      ] },
      { text: '지나간다', outcomes: [{ text: '차는 쓸모없다. 길도 끊겼고 기름도 없다.', effects: {} }] },
    ],
  },
  {
    id: 'obj_truck',
    trigger: 'object',
    title: '군용 트럭',
    text: '위장막 아래 군용 트럭. 디젤 냄새. 짐칸의 천막이 바람에 펄럭인다.',
    choices: [
      { text: '경유를 뽑는다', hint: '1시간 · 경유', outcomes: [
        { chance: 0.7, text: '탱크에서 경유를 뽑았다. 휘발유보다 냄새가 덜하다.', effects: { diesel: 2, hours: 1, objUsed: true } },
        { text: '탱크는 비어 있었다. 짐칸에서 반 통을 찾았다.', effects: { diesel: 1, hours: 1, objUsed: true } },
      ] },
      { text: '짐칸을 뒤진다', hint: '30분', outcomes: [
        { chance: 0.4, text: '전투식량과 부품 상자.', effects: { food: 2, parts: 1, objUsed: true } },
        { chance: 0.4, text: '방독면 하나와 구급낭. 군인 것이다. 군인은 없다.', effects: { gear: 'mask', gear2: 'medkit', objUsed: true } },
        { text: '빈 탄약 상자와 군화 한 짝. 바닥에 피 자국이 말라 있었다.', effects: { mind: -4, objUsed: true } },
      ] },
      { text: '지나간다', outcomes: [{ text: '트럭은 두고 왔다.', effects: {} }] },
    ],
  },
  {
    id: 'obj_well',
    trigger: 'object',
    title: '우물',
    text: '돌우물. 두레박이 걸려 있다. 뚜껑을 열자 서늘한 공기가 올라온다.',
    choices: [
      { text: '물을 긷는다', hint: '물 2 · 오염', outcomes: [
        { chance: 0.8, text: '두레박을 내렸다. 물은 맑아 보이지만 낮은 땅의 물이다. 끓여야 한다.', effects: { dirty: 2 } },
        { text: '냄새가 올라온다. 안에 뭔가 있다. 두레박을 내리지 못했다.', effects: { mind: -5, poisonWell: true, objUsed: true } },
      ] },
      { text: '두고 간다', outcomes: [{ text: '뚜껑을 닫았다.', effects: {} }] },
    ],
  },
  {
    id: 'obj_woodpile',
    trigger: 'object',
    title: '장작더미',
    text: '누군가 쌓아 둔 장작. 위쪽은 젖었지만 아래는 말라 있다.',
    choices: [
      { text: '챙긴다', hint: '땔감', outcomes: [{ text: '마른 것만 골라 배낭에 넣었다. 땔감 두 개.', effects: { wood: 2, objUsed: true } }] },
      { text: '두고 간다', outcomes: [{ text: '다음 사람 몫으로.', effects: { mind: 1 } }] },
    ],
  },
  {
    id: 'obj_cave',
    trigger: 'object',
    title: '바위굴',
    text: '바위 사이에 사람 하나 들어갈 틈이 있다. 안은 마르고 바람이 닿지 않는다. 누군가 먼저 쓴 흔적, 재와 돌로 만든 자리.',
    choices: [
      { text: '쉴 자리로 삼는다', outcomes: [{ text: '배낭을 안쪽에 밀어 넣었다. 여기서는 비도 바람도 반밖에 못 들어온다.', effects: { cave: true, mind: 4, objUsed: true } }] },
    ],
  },
  {
    id: 'obj_note',
    trigger: 'object',
    title: '쪽지',
    text: '비닐로 싼 쪽지가 돌에 눌려 있다. 글씨가 번졌다.',
    choices: [
      { text: '읽는다', outcomes: [
        { chance: 0.35, text: '"북쪽 고개는 군인이 막았다. 밤에 돌아가라." 날짜는 보름 전이다.', effects: { mind: 2, objUsed: true } },
        { chance: 0.5, text: '"먼저 간다. 향로봉에서 기다릴게." 이름은 없다. 누구에게 쓴 것인지도.', effects: { mind: 4, objUsed: true } },
        { text: '"여기 물은 괜찮다." 그 아래 다른 글씨로 "아니다"라고 적혀 있다.', effects: { mind: -2, objUsed: true } },
      ] },
      { text: '그대로 둔다', outcomes: [{ text: '남의 편지다.', effects: {} }] },
    ],
  },
  {
    id: 'obj_photo',
    trigger: 'object',
    title: '사진',
    text: '마루에 사진 액자가 엎어져 있다. 유리가 깨졌다. 가족사진이다. 네 사람이 바다 앞에서 웃고 있다.',
    choices: [
      { text: '바로 세운다', outcomes: [{ text: '액자를 세워 두고 유리 조각을 치웠다. 바다 앞에서 웃는 사람들. 이 집 사람들이 어디 있든.', effects: { mind: 5, objUsed: true } }] },
      { text: '보지 않는다', outcomes: [{ text: '엎어 둔 채 나왔다. 내 사진이 생각나서였다.', effects: { mind: -3, objUsed: true } }] },
    ],
  },
  {
    id: 'obj_clothesline',
    trigger: 'object',
    title: '빨랫줄',
    text: '마당 빨랫줄에 이불과 옷이 널려 있다. 비를 몇 번 맞았지만 햇볕에 다시 말랐다.',
    choices: [
      { text: '이불을 걷는다', hint: '담요', outcomes: [{ text: '두꺼운 솜이불을 둘둘 말아 배낭에 묶었다. 밤이 덜 무서워졌다.', effects: { gear: 'blanket', objUsed: true } }] },
      { text: '두고 간다', outcomes: [{ text: '집주인이 걷으러 올지도 모른다.', effects: {} }] },
    ],
  },
  {
    id: 'obj_radio',
    trigger: 'object',
    title: '라디오',
    text: '선반 위 건전지 라디오. 다이얼을 돌리자 지직거린다.',
    choices: [
      { text: '챙긴다', outcomes: [
        { chance: 0.5, text: '건전지는 다 됐지만 발전기에 꽂으면 된다. 배낭에 넣었다.', effects: { gear: 'radio', objUsed: true } },
        { text: '스피커가 찢어졌다. 고치면 될지도 모른다.', effects: { brokenGear: 'radio', objUsed: true } },
      ] },
      { text: '두고 간다', outcomes: [{ text: '무겁지는 않지만 쓸 데가 없다. 아직은.', effects: {} }] },
    ],
  },
  {
    id: 'obj_closet',
    trigger: 'object',
    title: '벽장',
    text: '벽장 문이 비뚤게 닫혀 있다. 안에서 쌀 냄새와 곰팡이 냄새가 같이 난다.',
    choices: [
      { text: '뒤진다', hint: '30분', outcomes: [
        { chance: 0.35, text: '쌀 한 봉지와 라면. 그리고 겨울 외투. 외투는 입었다.', effects: { food: 3, gear: 'blanket', objUsed: true } },
        { chance: 0.35, text: '우비와 손전등. 손전등은 건전지가 반쯤 남았다.', effects: { gear: 'raincoat', brokenGear: 'flashlight', objUsed: true } },
        { chance: 0.6, text: '통조림 몇 개와 양초. 양초는 땔감 대신 쓸 수 있다.', effects: { food: 3, wood: 1, objUsed: true } },
        { text: '곰팡이 핀 옷가지뿐이었다.', effects: { objUsed: true } },
      ] },
      { text: '닫아 둔다', outcomes: [{ text: '남의 집 벽장이다.', effects: {} }] },
    ],
  },
  {
    id: 'obj_fishing',
    trigger: 'object',
    title: '물가',
    text: '물살이 느려지는 웅덩이. 그림자가 움직인다. 물고기다.',
    choices: [
      { text: '칼로 작살을 만들어 잡는다', hint: '칼 · 2시간 · 신선식', req: { gear: 'knife' }, outcomes: [{ text: '가지 끝을 칼로 깎아 작살을 만들었다. 두 시간에 네 마리. 칼이 있으니 손질도 빨랐다.', effects: { fresh: 4, hours: 2, rad: 2, objUsed: true } }] },
      { text: '잡아 본다', hint: '2시간 · 신선식', outcomes: [
        { chance: 0.7, text: '두 시간 만에 세 마리. 손이 얼었지만 오늘은 먹는다. 낮은 땅의 물고기라는 건 잊기로 했다.', effects: { fresh: 3, hours: 2, rad: 2, objUsed: true } },
        { text: '두 시간 동안 한 마리도 못 잡았다. 그림자만 봤다.', effects: { hours: 2, objUsed: true } },
      ] },
      { text: '그만둔다', outcomes: [{ text: '시간이 아깝다.', effects: {} }] },
    ],
  },
  {
    id: 'obj_herbs',
    trigger: 'object',
    title: '풀밭',
    text: '바위 사이 풀밭. 산나물과 산딸기, 그리고 모르는 버섯.',
    choices: [
      { text: '칼로 뿌리째 캔다', hint: '칼 · 1시간 · 신선식', req: { gear: 'knife' }, outcomes: [{ text: '칼로 더덕과 도라지 뿌리까지 캤다. 흙냄새가 났다. 신선식 셋.', effects: { fresh: 3, hours: 1, objUsed: true } }] },
      { text: '아는 것만 뜯는다', hint: '1시간 · 신선식', outcomes: [{ text: '미나리와 산딸기 두 줌. 버섯은 두고 왔다.', effects: { fresh: 2, hours: 1, objUsed: true } }] },
      { text: '버섯도 뜯는다', hint: '위험', outcomes: [
        { chance: 0.6, text: '다행히 먹는 버섯이었다. 배낭이 조금 무거워졌다.', effects: { fresh: 2, hours: 1, objUsed: true } },
        { text: '밤새 토했다. 독버섯이었다.', effects: { hp: -15, hours: 1, mind: -5, objUsed: true } },
      ] },
      { text: '지나간다', outcomes: [{ text: '배는 고프지 않다. 아직은.', effects: {} }] },
    ],
  },
  {
    id: 'obj_garden',
    trigger: 'object',
    title: '텃밭',
    text: '집 뒤 텃밭. 배추와 무가 뽑히지 않은 채 서 있다. 주인은 거둘 날을 보지 못했다.',
    choices: [
      { text: '거둔다', hint: '1시간 · 신선식', outcomes: [{ text: '배추 두 포기와 무 몇 개. 흙을 털어 배낭에 넣었다. 며칠은 간다.', effects: { fresh: 3, hours: 1, rad: 1, objUsed: true } }] },
      { text: '두고 간다', outcomes: [{ text: '다음에 지나가는 사람 몫.', effects: { mind: 1 } }] },
    ],
  },
  {
    id: 'obj_toolshed',
    trigger: 'object',
    title: '농기구 창고',
    text: '헛간 옆 창고. 괭이와 낫, 지게, 밧줄 뭉치. 농사짓던 사람의 손때가 묻은 것들이다.',
    choices: [
      { text: '지게를 멘다', hint: '지게', outcomes: [{ text: '지게를 등에 졌다. 어깨끈이 낡았지만 틀은 단단하다. 더 질 수 있다. 대신 걸음이 느려질 것이다.', effects: { gear: 'carrier', objUsed: true } }] },
      { text: '낫과 밧줄을 챙긴다', hint: '칼 · 로프', outcomes: [{ text: '낫을 숫돌에 갈아 칼 대신 쓰기로 했다. 밧줄은 둘둘 말아 배낭에 묶었다.', effects: { gear: 'knife', gear2: 'rope', objUsed: true } }] },
      { text: '두고 간다', outcomes: [{ text: '남의 연장이다. 아직은 그런 생각이 남아 있다.', effects: { mind: 1 } }] },
    ],
  },
  {
    id: 'obj_shrine',
    trigger: 'object',
    title: '서낭당',
    text: '돌무더기와 색 바랜 천 조각. 길손들이 돌을 하나씩 올린 자리다.',
    choices: [
      { text: '돌을 하나 올린다', outcomes: [{ text: '손에 맞는 돌을 골라 올렸다. 무사히 가게 해 달라고. 믿지는 않지만.', effects: { mind: 5, objUsed: true } }] },
      { text: '지나간다', outcomes: [{ text: '돌은 충분히 많다.', effects: {} }] },
    ],
  },
  {
    id: 'obj_grave',
    trigger: 'object',
    title: '무덤',
    text: '새로 쌓은 무덤. 나무 팻말에 이름이 적혀 있다. 누군가 묻어 준 것이다. 묻어 준 사람은 어디로 갔을까.',
    choices: [
      { text: '잠시 선다', outcomes: [{ text: '이름을 읽었다. 모르는 사람이다. 그래도 읽었다.', effects: { mind: 3, objUsed: true } }] },
      { text: '지나간다', outcomes: [{ text: '돌아보지 않았다.', effects: {} }] },
    ],
  },
];
