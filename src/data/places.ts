import type { NodeKind, ObjectKind, Side } from '../core/types';

// 땅. 백두대간의 실제 자리들이다. 지도는 매번 같고, 날씨와 사물과 길만 다르다
// 단계: 0 중산리 … 13 향로봉. 고도 alt 는 0..1, 높을수록 깨끗하지만 춥다

export const STAGES = 14;
export const REGIONS = ['중산리', '지리', '덕유', '민주지', '황악', '속리', '소백', '태백', '함백', '두타', '오대', '설악', '진부', '향로'];

export type FixedObject = ObjectKind | [ObjectKind, string];

export interface PlaceDef {
  id: string;
  name: string;
  kind: NodeKind;
  stage: number;
  alt: number;
  side: Side;
  water?: number; // 기본은 종류별. -1 무제한, 0 없음, n 회
  forage?: number; // 기본은 종류별
  objects?: FixedObject[]; // 반드시 놓이는 사물. [종류, 이름] 이면 이름을 바꾼다
  desc: string; // 처음 닿았을 때 한 줄
}

export const PLACES: PlaceDef[] = [
  { id: 'jungsanri', name: '중산리 야영장', kind: 'start', stage: 0, alt: 0.24, side: 'W', desc: '지리산 남쪽 들머리. 대피령 날 사람들이 두고 간 텐트와 차와 짐이 그대로다.' },

  // 1 지리
  { id: 'cheonwang', name: '천왕봉', kind: 'peak', stage: 1, alt: 1.0, side: 'ridge', desc: '지리산 꼭대기. 남쪽 하늘이 누렇다. 비석의 글자만 또렷하다. "한국인의 기상 여기서 발원되다."' },
  { id: 'jangteomok', name: '장터목 대피소', kind: 'shelter', stage: 1, alt: 0.8, side: 'ridge', desc: '능선 안부의 대피소. 문이 열려 있고 침상에 담요가 흐트러져 있다. 옛날에 장이 서던 자리다.' },
  { id: 'seongsamjae', name: '성삼재', kind: 'pass', stage: 1, alt: 0.58, side: 'ridge', objects: ['car'], desc: '도로가 넘는 고개. 주차장에 차들이 그대로 서 있다. 대피 버스가 여기서 사람을 태웠다.' },
  { id: 'cheonwangsaem', name: '천왕샘', kind: 'spring', stage: 1, alt: 0.88, side: 'E', desc: '천왕봉 아래 바위틈의 샘. 물이 차갑고 맑다. 낙진이 닿기 전의 물이다.' },

  // 2 덕유
  { id: 'yuksimnyeong', name: '육십령 휴게소', kind: 'pass', stage: 2, alt: 0.55, side: 'ridge', objects: ['car', 'crate'], desc: '전라와 경상을 잇는 고개의 휴게소. 버스 행렬이 쉬어 간 자리다. 매점 유리가 깨져 있다.' },
  { id: 'hyangjeok', name: '향적봉', kind: 'peak', stage: 2, alt: 0.95, side: 'ridge', desc: '덕유산 꼭대기. 설천봉 쪽으로 리조트 곤돌라 케이블이 늘어져 있다.' },
  { id: 'satgatjae', name: '삿갓재 대피소', kind: 'shelter', stage: 2, alt: 0.78, side: 'ridge', desc: '남덕유와 향적봉 사이의 대피소. 태양광 판이 아직 지붕에 붙어 있다.' },
  { id: 'baengnyeonsa', name: '백련사', kind: 'temple', stage: 2, alt: 0.45, side: 'E', desc: '구천동 계곡 끝의 절. 계곡물 소리가 법당까지 올라온다. 동쪽 사면이라 바람을 조심해야 한다.' },

  // 3 민주지산
  { id: 'samdobong', name: '삼도봉', kind: 'peak', stage: 3, alt: 0.9, side: 'ridge', desc: '충청, 전라, 경상이 만나는 봉우리. 기념탑이 서 있고 돌무더기에 쪽지들이 눌려 있다.' },
  { id: 'udureong', name: '우두령', kind: 'pass', stage: 3, alt: 0.6, side: 'ridge', objects: ['truck'], desc: '소머리 고개. 도로 위에 바리케이드가 넘어져 있고 군용 트럭이 한 대 비스듬히 서 있다.' },
  { id: 'minjuji_shelter', name: '민주지산 대피소', kind: 'shelter', stage: 3, alt: 0.78, side: 'W', desc: '민주지산 아래 돌로 지은 대피소. 겨울 훈련 중 숨진 군인들을 기리는 비가 옆에 있다.' },
  { id: 'mulhan', name: '물한계곡', kind: 'valley', stage: 3, alt: 0.28, side: 'E', desc: '물이 차다는 계곡. 물소리가 크다. 낮은 땅이라 비가 오면 오래 있을 곳이 아니다.' },

  // 4 황악
  { id: 'hwangak', name: '황악산', kind: 'peak', stage: 4, alt: 0.88, side: 'ridge', desc: '김천의 큰 산. 능선이 넓고 순하다. 남쪽에서 온 바람이 등을 민다.' },
  { id: 'jikjisa', name: '직지사', kind: 'temple', stage: 4, alt: 0.38, side: 'E', objects: ['garden'], desc: '천년 절. 넓은 마당과 텃밭. 사람들이 머물다 간 흔적이 요사채마다 있다.' },
  { id: 'chupungnyeong', name: '추풍령', kind: 'pass', stage: 4, alt: 0.45, side: 'ridge', objects: ['car', 'truck'], desc: '고속도로와 철길이 함께 넘는 낮은 고개. 멈춘 차들이 줄지어 있고 건널목 차단기가 내려와 있다.' },

  // 5 속리
  { id: 'munjangdae', name: '문장대', kind: 'peak', stage: 5, alt: 0.92, side: 'ridge', desc: '속리산의 큰 바위 봉우리. 쇠 계단을 올라서면 사방이 보인다. 구름이 발밑에 있다.' },
  { id: 'beopjusa', name: '법주사', kind: 'temple', stage: 5, alt: 0.35, side: 'W', desc: '서른 미터 금동 미륵불이 흐린 하늘 아래 서 있다. 발치에 비닐 천막들이 남아 있다.' },
  { id: 'neuljae', name: '늘재', kind: 'pass', stage: 5, alt: 0.55, side: 'ridge', desc: '백두대간이 도로와 만나는 고개. 비석 하나와 성황당. 바람이 늘 분다고 늘재다.' },
  { id: 'hwayang', name: '화양구곡', kind: 'valley', stage: 5, alt: 0.25, side: 'W', desc: '아홉 굽이 계곡. 너른 바위와 맑은 물. 낮은 땅이라 비 오는 날은 피해야 한다.' },

  // 6 소백
  { id: 'sobaek_biro', name: '소백산 비로봉', kind: 'peak', stage: 6, alt: 1.0, side: 'ridge', desc: '소백산 꼭대기. 나무가 없는 풀밭 능선. 바람이 사람을 밀어낸다.' },
  { id: 'yeonhwa', name: '제2연화봉 대피소', kind: 'shelter', stage: 6, alt: 0.85, side: 'ridge', objects: ['radio'], desc: '능선의 대피소. 옆 봉우리에 천문대의 흰 돔이 서 있다. 밤하늘이 가장 가까운 곳이다.' },
  { id: 'jungnyeong', name: '죽령', kind: 'pass', stage: 6, alt: 0.6, side: 'ridge', objects: ['car', 'truck'], desc: '천 년 넘은 고갯길. 옛길 아래로 고속도로 터널 입구가 보인다. 차들이 터널 안까지 줄지어 멈춰 있다.' },
  { id: 'jukgye', name: '죽계구곡', kind: 'valley', stage: 6, alt: 0.3, side: 'E', desc: '소백산 동쪽의 계곡. 물이 많고 숲이 짙다. 동쪽 바람이 불면 낙진이 내려앉는 곳이다.' },

  // 7 태백
  { id: 'cheonjedan', name: '태백산 천제단', kind: 'peak', stage: 7, alt: 0.95, side: 'ridge', objects: [['shrine', '천제단']], desc: '하늘에 제사 지내던 돌 제단. 주목 고사목들이 흰 뼈처럼 서 있다. 누가 제단에 새 돌을 올려 두었다.' },
  { id: 'hwabangjae', name: '화방재', kind: 'pass', stage: 7, alt: 0.62, side: 'ridge', desc: '태백산과 함백산 사이의 고개. 주유소와 휴게소가 있었다. 지금은 문이 열린 채 비어 있다.' },
  { id: 'hwangji', name: '황지 연못', kind: 'spring', stage: 7, alt: 0.3, side: 'W', desc: '낙동강이 시작되는 못. 도시 한가운데의 샘이다. 거리는 비어 있고 못은 여전히 솟는다.' },
  { id: 'cheoram', name: '철암 폐광촌', kind: 'village', stage: 7, alt: 0.28, side: 'E', objects: ['woodpile', 'well'], desc: '탄광이 닫힌 뒤 남은 마을. 선탄장의 검은 건물. 산비탈에 막장 입구가 입을 벌리고 있다.' },

  // 8 함백
  { id: 'hambaek', name: '함백산 통신기지', kind: 'military', stage: 8, alt: 0.98, side: 'ridge', desc: '남한에서 여섯째로 높은 산. 꼭대기에 철탑과 군 통신 시설. 철문이 열려 있다.' },
  { id: 'manhangjae', name: '만항재', kind: 'pass', stage: 8, alt: 0.85, side: 'ridge', objects: ['truck'], desc: '포장도로가 넘는 가장 높은 고개. 야생화 밭이었던 곳에 군용 트럭들이 서 있다.' },
  { id: 'jeongamsa', name: '정암사', kind: 'temple', stage: 8, alt: 0.5, side: 'E', desc: '부처의 사리를 모셨다는 절. 수마노탑이 산비탈에 서 있다. 법당 안이 따뜻하다.' },
  { id: 'gohan', name: '고한 탄광 마을', kind: 'village', stage: 8, alt: 0.32, side: 'W', objects: ['woodpile'], desc: '골짜기를 따라 늘어선 탄광 마을. 연탄 공장 굴뚝. 집집마다 연탄이 쌓여 있다.' },

  // 9 두타
  { id: 'duta', name: '두타산', kind: 'peak', stage: 9, alt: 0.92, side: 'ridge', desc: '동해가 보이는 봉우리. 바다는 잿빛이고 수평선이 없다. 계곡 아래 마을에서 연기가 오른다.' },
  { id: 'daetjae', name: '댓재', kind: 'pass', stage: 9, alt: 0.6, side: 'ridge', desc: '삼척으로 넘는 고개. 산신각이 있다. 동쪽으로 내려가는 길에는 가지 말라고 누가 돌을 쌓아 막았다.' },
  { id: 'mureung', name: '무릉계곡', kind: 'valley', stage: 9, alt: 0.22, side: 'E', desc: '너른 반석과 폭포의 계곡. 바다에서 십 킬로미터. 물은 많지만 오래 있을 곳이 못 된다.' },

  // 10 오대
  { id: 'odae_biro', name: '오대산 비로봉', kind: 'peak', stage: 10, alt: 0.95, side: 'ridge', desc: '오대산 꼭대기. 둥글고 넓은 봉우리. 북쪽으로 설악의 능선이 보인다.' },
  { id: 'noinbong', name: '노인봉 산장', kind: 'shelter', stage: 10, alt: 0.8, side: 'ridge', desc: '노인봉 아래 작은 산장. 오래 산장을 지키던 사람의 사진이 벽에 걸려 있다.' },
  { id: 'woljeongsa', name: '월정사', kind: 'temple', stage: 10, alt: 0.35, side: 'E', objects: ['woodpile', 'garden'], desc: '전나무 숲길 끝의 큰 절. 팔각구층석탑. 숲은 아무것도 변하지 않은 것 같다.' },
  { id: 'utongsu', name: '우통수', kind: 'spring', stage: 10, alt: 0.6, side: 'W', desc: '한강이 시작되는 샘. 서대 아래 바위틈에서 물이 솟는다. 맑고 끊이지 않는다.' },

  // 11 설악
  { id: 'daecheong', name: '대청봉', kind: 'peak', stage: 11, alt: 1.0, side: 'ridge', desc: '설악산 꼭대기. 바람이 쉬지 않는다. 동해와 북쪽의 산들이 한눈에 든다.' },
  { id: 'jungcheong', name: '중청 대피소', kind: 'shelter', stage: 11, alt: 0.96, side: 'ridge', objects: ['crate'], desc: '대청봉 아래 대피소. 군이 쓰다 간 흔적. 상자들이 쌓여 있다.' },
  { id: 'hangyeryeong', name: '한계령 검문소', kind: 'military', stage: 11, alt: 0.62, side: 'ridge', desc: '설악을 넘는 고개의 검문소. 모래주머니와 천막. 여기부터는 사람이 지킨다.' },
  { id: 'baekdamsa', name: '백담사', kind: 'temple', stage: 11, alt: 0.3, side: 'W', desc: '백 개의 못을 지나 닿는 절. 개울의 돌탑들이 그대로 서 있다. 서쪽 깊은 골짜기다.' },

  // 12 진부
  { id: 'masan', name: '마산봉', kind: 'peak', stage: 12, alt: 0.88, side: 'ridge', desc: '백두대간 남쪽 구간의 마지막 봉우리. 북쪽으로 향로봉의 안테나가 보인다.' },
  { id: 'jinbu', name: '진부령 초소', kind: 'military', stage: 12, alt: 0.58, side: 'ridge', desc: '고갯마루의 군 초소. 향로봉으로 가는 작전도로가 여기서 시작된다.' },
  { id: 'alps', name: '알프스 리조트', kind: 'village', stage: 12, alt: 0.5, side: 'E', objects: ['closet', 'crate', 'clothesline'], desc: '문 닫은 지 오래된 스키장. 호텔 건물이 비어 있다. 피난민들이 지나며 잠을 잔 자리가 복도마다 있다.' },

  // 13 향로봉
  { id: 'hyangno', name: '향로봉 안전지대', kind: 'goal', stage: 13, alt: 0.95, side: 'ridge', desc: '향로봉. 군이 지키는 수용소. 불빛이 있다.' },
];

const BY_ID = new Map(PLACES.map((p) => [p.id, p]));

export function placeById(id: string): PlaceDef {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`없는 자리: ${id}`);
  return p;
}
