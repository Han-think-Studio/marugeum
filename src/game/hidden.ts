import { clueCount } from './events';
import type { GameState, Journal } from '../core/types';
import { settings } from './settings';

// 숨은 것. 길에서 한 작은 선택(일지를 끝까지 읽었다, 범종을 쳤다, 손님을 재워 줬다 …)이 재료가 되어
// 나중의 자리에서 숨은 물건과 숨은 장면을 연다. 어떤 것은 보통이나 어려움에서만 열린다. 수첩에 찾은 난이도와 함께 남는다
export interface HiddenDef {
  id: string;
  name: string;
  hint: string; // 아직 못 찾았을 때 수첩에 뜨는 귀띔
  minDifficulty?: 'normal' | 'hard';
}

export const HIDDEN: HiddenDef[] = [
  { id: 'compass', name: '산장지기의 나침반', hint: '대피소 일지를 끝까지 읽은 사람이 오대산의 산장에서' },
  { id: 'codebook', name: '주파수 수첩', hint: '벙커의 작전 일지를 챙긴 사람이 함백산 꼭대기에서', minDifficulty: 'normal' },
  { id: 'beads', name: '노스님의 염주', hint: '범종을 친 사람이 사리를 모신 절에서', minDifficulty: 'hard' },
  { id: 'numbers', name: '숫자 방송의 정체', hint: '밤새 숫자를 받아 적고, 그 숫자를 읽을 줄 아는 사람이 진부령에서' },
  { id: 'people', name: '길 위의 사람들', hint: '길에서 넷 이상을 도운 사람이 향로봉에서' },
  { id: 'afterword', name: '숨은 그 뒤', hint: '어려움에서 흔적 아홉을 모아 가족을 만난 사람만', minDifficulty: 'hard' },
];

// 도운 사람들. 표시 하나가 한 사람(또는 한 무리)
const KIND: [string, string][] = [
  ['base_visitors_kept', '야영장에서 재워 준 두 남자 중 다리를 절던 사람이 먼저 알아보고 손을 들었다. 발목은 다 나았다고 했다.'],
  ['teen_met', '대피소 난로 앞에 같이 앉았던 열여섯 살 아이가 배급 줄에 있었다. 아이는 이번에도 먼저 고개를 끄덕였다.'],
  ['family_fed', '헛간의 가족은 천막 하나를 얻었다. 아이가 내 손에 그림 한 장을 쥐여 주었다. 산 셋과 사람 넷.'],
  ['grandma_kimchi', '할머니의 김치 통을 씻어 명단 천막에 맡겼다. 누가 마을 쪽으로 내려가면 돌려줄 것이다.'],
  ['elder_path', '약수터 노인이 가르쳐 준 왼쪽 길 이야기를 했더니, 검문소 군인이 그 노인을 안다고 했다. 아직 물을 긷는다고.'],
  ['guestbook', '"수연, 하율, 기다려." 대피소 방명록의 그 줄을 읽었다는 사람이 있었다. 덕분에 자기도 한 줄 적었다고 했다.'],
  ['note_left', '쪽지 밑에 남긴 내 이름을 보고 따라왔다는 사람이 둘. 이름은 누군가 읽는다.'],
  ['branch:seat_gave', '헬기 자리를 내준 남자의 아이가 창에 대던 손바닥으로 이번에는 내 손을 잡았다.'],
  ['branch:child_med', '철암의 아이 엄마가 해열제 빈 봉지를 아직 지니고 있었다. 버리지 못하겠다고 했다.'],
  ['duta_people', '두타산 아래 마을에서 올라온 아이 하나가 의무대에 있었다. 머리카락이 다시 나고 있었다.'],
];

export function kindness(state: GameState): string[] {
  return KIND.filter(([f]) => state.flags[f]).map(([, line]) => line);
}

// 이번 여정에서 찾은 숨은 것들. 물건과 사건은 표시로, 끝의 두 장면은 끝난 모습으로 가린다
export function hiddenFound(state: GameState): string[] {
  const out = HIDDEN.filter((h) => state.flags[`hidden:${h.id}`]).map((h) => h.id);
  const reached = state.over === 'won' && state.ending !== null && state.ending !== 'stay';
  if (reached && kindness(state).length >= 4 && !out.includes('people')) out.push('people');
  if (reached && afterwordEarned(state) && !out.includes('afterword')) out.push('afterword');
  return out;
}

export function afterwordEarned(state: GameState): boolean {
  return state.ending === 'reunion' && clueCount(state) >= 9 && settings.difficulty === 'hard';
}

export const AFTERWORD = '숨은 그 뒤. 봄에 철책 문이 열리던 날, 줄 맨 앞에 선 군인이 수첩을 펼쳐 이름을 읽었다. 길에서 지나온 사람들의 이름이었다. 묻어 준 사람, 재워 준 사람, 쪽지를 남긴 사람. 하율이 그 이름을 하나씩 따라 읽었다. 우리는 맨 마지막에 들어갔다. 아무도 남겨 두지 않았는지 돌아본 다음에.';

const RANK = { easy: 0, normal: 1, hard: 2 } as const;

// 여정이 끝나면 찾은 숨은 것을 수첩에 적는다. 같은 것을 더 어려운 난이도에서 찾으면 그 난이도로 바꾼다
export function recordHidden(j: Journal, state: GameState): void {
  const book = j.hidden ?? (j.hidden = {});
  for (const id of hiddenFound(state)) {
    const prev = book[id];
    if (!prev || RANK[settings.difficulty] > RANK[prev]) book[id] = settings.difficulty;
  }
}
