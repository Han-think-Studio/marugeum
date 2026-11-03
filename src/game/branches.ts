import type { GameState, Journal } from '../core/types';

// 갈림길. 어려운 선택 셋이 이야기를 가른다. 사건은 src/data 에, 고른 것은 'branch:*' 표시로 남는다
// 향로봉에 닿으면 고른 것마다 끝 문장이 하나씩 붙고, 수첩에는 지금까지 고른 것들이 쌓인다
export interface Junction {
  id: string;
  name: string;
  hint: string; // 아직 못 만났을 때 수첩에 뜨는 귀띔
  choices: [string, string][]; // 표시, 수첩에 적힐 말
}

export const JUNCTIONS: Junction[] = [
  { id: 'highway', name: '댓재의 고속도로', hint: '두타산을 지나 댓재에서', choices: [
    ['branch:highway', '고속도로로 내려갔다'], ['branch:highway_no', '능선을 지켰다'],
  ] },
  { id: 'child', name: '철암의 아픈 아이', hint: '폐광 사람들 곁에 머문 사람이', choices: [
    ['branch:child_med', '하율의 해열제를 주었다'], ['branch:child_kit', '구급낭을 열었다'],
    ['branch:child_watch', '밤새 곁을 지켰다'], ['branch:child_watch_lost', '밤새 지켰지만 열이 내리지 않았다'], ['branch:child_left', '모른 척했다'],
  ] },
  { id: 'seat', name: '한계령의 헬기 한 자리', hint: '한계령 검문소를 지난 사람이', choices: [
    ['branch:seat_took', '헬기에 올랐다'], ['branch:seat_gave', '자리를 내주었다'],
    ['branch:seat_both', '둘 다 태웠다'], ['branch:seat_lost', '둘 다 태워 달라다 자리를 잃었다'], ['branch:seat_mirror', '거울로 헬기를 하나 더 불렀다'],
  ] },
];

export const BRANCH_FLAGS = JUNCTIONS.flatMap((j) => j.choices.map(([f]) => f));

// 철암의 아이가 나았나
export function childSaved(state: GameState): boolean {
  return !!(state.flags['branch:child_med'] || state.flags['branch:child_kit'] || state.flags['branch:child_watch']);
}

// 향로봉에서 갈림길마다 붙는 끝 문장
export function branchNotes(state: GameState): string[] {
  const f = state.flags;
  const out: string[] = [];
  if (f['branch:highway']) out.push('고속도로로 온 사람은 계수기 앞에 오래 서 있어야 했다. 오대산의 전나무 숲도, 진고개의 흔적도 끝내 보지 못했다.');
  if (childSaved(state)) out.push('봄에 철암 갱도 사람들이 트럭을 타고 왔다. 맨 먼저 뛰어내린 것은 그 아이였다. 열은 다시 오르지 않았다고 했다.');
  else if (f['branch:child_watch_lost']) out.push('철암의 아이 소식은 듣지 못했다. 그 밤의 물수건 감촉은 손에 남아 있다.');
  else if (f['branch:child_left']) out.push('철암의 갱도 사람들은 오지 않았다. 기침 소리가 가끔 꿈에 나온다.');
  if (f['branch:seat_gave']) out.push('의무대 앞에서 그 남자가 나를 알아보았다. 아이는 열이 내렸다. 그는 내 손을 오래 놓지 않았다.');
  else if (f['branch:seat_took']) out.push('헬기에서 내리고 이틀 뒤, 아이를 업은 남자가 걸어서 철책 문을 들어왔다. 나는 그가 나를 보기 전에 천막 뒤로 갔다.');
  else if (f['branch:seat_both']) out.push('헬기에서 내 소매를 잡고 잠들었던 아이는 아직도 나를 보면 소매부터 잡는다.');
  else if (f['branch:seat_mirror']) out.push('의무대 앞에서 그 남자와 아이를 다시 만났다. 아이가 거울을 빌려 달라더니 해를 향해 들고 한참 놀았다.');
  else if (f['branch:seat_lost']) out.push('한계령에서 같이 걷기 시작한 남자와 아이도 같은 날 문을 들어왔다. 걸어서 온 것이 이상하게 자랑스러웠다.');
  return out;
}

// 여정이 끝나면 고른 갈림길을 수첩에 쌓는다
export function recordBranches(j: Journal, state: GameState): void {
  const book = j.branches ?? (j.branches = []);
  for (const f of BRANCH_FLAGS) if (state.flags[f] && !book.includes(f)) book.push(f);
}
