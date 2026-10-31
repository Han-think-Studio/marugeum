import { Rng } from '../core/rng';
import { STANDOFF_INFO, type GameState, type StandoffAction, type StandoffKind } from '../core/types';
import { addLog } from './log';

// 받침에 따라 조사를 고른다. 멧돼지가, 탈영병이
function josa(word: string, pair: '이/가' | '은/는' | '을/를'): string {
  const code = word.charCodeAt(word.length - 1);
  const hasFinal = code >= 0xac00 && code <= 0xd7a3 ? (code - 0xac00) % 28 !== 0 : false;
  const [a, b] = pair.split('/');
  return word + (hasFinal ? a : b);
}

// 대치 시작
export function startStandoff(state: GameState, kind: StandoffKind): void {
  const info = STANDOFF_INFO[kind];
  state.standoff = { kind, round: 1, threat: info.threat, distance: 1, hits: 0, cool: 0, log: [info.intro], done: null };
  addLog(state, `[대치 · ${info.name}]`);
}

function hasFireHere(state: GameState): boolean {
  return state.fire !== null && state.fire.nodeId === state.nodeId;
}

// 각 수의 성공 확률. 화면에 그대로 보여 준다
export function standoffOdds(state: GameState, action: StandoffAction): number {
  const s = state.standoff;
  if (!s) return 0;
  const fire = hasFireHere(state);
  switch (action) {
    case 'threaten': {
      let p = 0.55;
      if (fire) p += 0.2;
      if (s.kind === 'dogs') p += 0.1;
      if (s.kind === 'deserter') p -= 0.15;
      if (s.distance === 0) p -= 0.15;
      return Math.max(0.1, Math.min(0.9, p));
    }
    case 'retreat': {
      let p = s.kind === 'boar' ? 0.55 : s.kind === 'dogs' ? 0.65 : 0.5;
      if (s.threat < 40) p += 0.25;
      if (s.distance === 2) p += 0.15;
      return Math.max(0.1, Math.min(0.95, p));
    }
    case 'throw':
      return s.kind === 'deserter' ? 0.95 : 0.85;
    case 'fight': {
      let p = s.kind === 'boar' ? 0.4 : s.kind === 'dogs' ? 0.5 : 0.35;
      if (fire && s.kind !== 'deserter') p += 0.15;
      if (s.distance === 2) p -= 0.1;
      return Math.max(0.1, Math.min(0.9, p));
    }
  }
}

export function canThrow(state: GameState): boolean {
  const s = state.standoff;
  if (!s) return false;
  const item = STANDOFF_INFO[s.kind].throwItem;
  return item === 'food' ? state.pack.food + state.pack.fresh > 0 : state.pack.wood > 0;
}

function takeFood(state: GameState, n: number): number {
  let left = n;
  const a = Math.min(left, state.pack.food);
  state.pack.food -= a;
  left -= a;
  const b = Math.min(left, state.pack.fresh);
  state.pack.fresh -= b;
  left -= b;
  return n - left;
}

// 한 수. 내 행동 → 상대 반응. 끝나면 done 이 채워진다
export function standoffAct(state: GameState, rng: Rng, action: StandoffAction): boolean {
  const s = state.standoff;
  if (!s || s.done) return false;
  const info = STANDOFF_INFO[s.kind];
  const name = info.name;
  const nameGa = josa(name, '이/가');
  const nameEun = josa(name, '은/는');
  const p = standoffOdds(state, action);
  const ok = rng.chance(p);
  const say = (text: string) => s.log.push(text);

  if (action === 'threaten') {
    if (ok) {
      s.threat -= 30;
      say(s.kind === 'deserter' ? '"쏘면 둘 다 죽어. 소리 들리면 다 몰려와." 그의 총구가 조금 내려갔다.' : `소리치며 팔을 크게 휘둘렀다. ${name}의 기세가 꺾인다.`);
    } else {
      s.threat += 10;
      s.distance = Math.max(0, s.distance - 1) as 0 | 1 | 2;
      say(s.kind === 'deserter' ? '"닥쳐." 총구가 이마로 올라왔다.' : `${nameEun} 물러서지 않았다. 오히려 다가온다.`);
    }
  } else if (action === 'retreat') {
    if (ok) {
      s.distance = Math.min(2, s.distance + 1) as 0 | 1 | 2;
      s.threat -= 8;
      say('눈을 떼지 않고 천천히 뒤로 물러섰다.');
      if (s.distance === 2 && s.threat < 45) {
        s.done = 'escaped';
        say(`거리가 벌어졌다. ${nameEun} 쫓아오지 않았다.`);
      }
    } else {
      s.threat += 5;
      say(s.kind === 'deserter' ? '"움직이지 마." 발을 떼자 그가 따라왔다.' : `등을 보이자 ${nameGa} 따라붙었다.`);
      s.distance = Math.max(0, s.distance - 1) as 0 | 1 | 2;
    }
  } else if (action === 'throw') {
    if (!canThrow(state)) return false;
    if (info.throwItem === 'food') {
      takeFood(state, 1);
      if (s.kind === 'deserter') {
        s.done = 'lost';
        say('봉지를 던졌다. 그는 받자마자 뜯어 입에 넣었다. 총구는 끝까지 내려가지 않았다. "꺼져."');
      } else {
        s.threat -= 45;
        say('먹을 것을 멀리 던졌다. 놈들이 그쪽으로 몰려가 서로 물어뜯는다.');
      }
    } else {
      state.pack.wood -= 1;
      const burning = hasFireHere(state);
      s.threat -= burning ? 45 : 25;
      say(burning ? '불붙은 가지를 던졌다. 멧돼지가 비명 같은 소리를 내며 물러선다.' : '가지를 던졌다. 멧돼지가 멈칫했다.');
    }
  } else if (action === 'fight') {
    if (ok) {
      s.hits += 1;
      s.threat -= 40;
      say(s.kind === 'deserter' ? '총신을 쳐 올리고 몸을 부딪쳤다. 그가 넘어지며 총을 놓쳤다.' : s.kind === 'boar' ? '돌로 머리를 쳤다. 둔탁한 소리. 멧돼지가 비틀거린다.' : '막대로 앞장선 놈의 코를 쳤다. 놈이 깨갱거리며 물러난다.');
    } else {
      const dmg = s.kind === 'boar' ? 14 : s.kind === 'dogs' ? 9 : 12;
      state.stats.hp = Math.max(0, state.stats.hp - dmg);
      s.threat += 10;
      s.distance = 0;
      if (s.kind === 'dogs') {
        const lost = takeFood(state, 1);
        say(`한 놈이 종아리를 물었다. 배낭을 끌어가려는 걸 뺏었지만 먹을 것${lost ? ' 하나는 놈 입에 있었다' : '은 없었다'}.`);
      } else if (s.kind === 'deserter') {
        say('개머리판이 날아왔다. 입안에서 피 맛이 난다.');
      } else {
        say('엄니가 허벅지를 스쳤다. 뜨겁다.');
      }
    }
  }

  // 상대 반응
  if (!s.done) {
    if (s.threat <= 0) {
      s.done = s.hits >= 2 && s.kind === 'boar' ? 'killed' : 'driven';
      say(s.done === 'killed' ? '멧돼지가 쓰러졌다. 한참 뒤에야 다가갔다. 오늘은 먹는다.' : s.kind === 'deserter' ? '그는 총을 주워 들고 뒷걸음질로 어둠 속에 사라졌다.' : `${nameGa} 돌아서 사라졌다.`);
    } else if (s.round >= 5) {
      if (s.kind === 'dogs') {
        s.done = 'fled';
        say('놈들이 흥미를 잃고 흩어졌다. 날이 샐 때까지 잠들지 못했다.');
      } else if (s.kind === 'deserter') {
        s.done = 'lost';
        takeFood(state, 2);
        say('그가 배낭을 낚아채 뒤집었다. 먹을 것을 쓸어 담고 돌아섰다. 총을 쏘지는 않았다.');
      } else {
        state.stats.hp = Math.max(0, state.stats.hp - info.charge);
        s.done = 'fled';
        say('멧돼지가 돌진해 어깨를 들이받고 덤불로 사라졌다.');
      }
    } else if (s.threat >= 60 && s.distance <= 1 && s.cool === 0) {
      state.stats.hp = Math.max(0, state.stats.hp - info.charge);
      s.distance = 0;
      s.cool = 2;
      say(s.kind === 'deserter' ? '그가 다가와 총구로 가슴을 밀었다.' : `${nameGa} 달려들었다. 넘어지며 겨우 피했지만 다쳤다.`);
    } else if (s.threat >= 40) {
      s.distance = Math.max(0, s.distance - 1) as 0 | 1 | 2;
      say(s.kind === 'deserter' ? '그가 한 걸음 다가왔다.' : `${nameGa} 한 걸음 다가온다.`);
    } else {
      s.distance = Math.min(2, s.distance + 1) as 0 | 1 | 2;
      say(s.kind === 'deserter' ? '그가 한 걸음 물러섰다.' : `${nameGa} 한 걸음 물러난다.`);
    }
  }
  if (state.stats.hp <= 0 && !s.done) {
    s.done = 'lost';
  }
  if (s.cool > 0) s.cool -= 1;
  s.round += 1;
  return true;
}

// 끝난 대치를 닫는다. 결과를 로그에 적고 보상이나 손실을 정리한다
export function endStandoff(state: GameState): string {
  const s = state.standoff;
  if (!s || !s.done) return '';
  let text = '';
  if (s.done === 'killed') {
    state.pack.fresh = Math.min(state.pack.fresh + 3, 99);
    state.stats.mind = Math.min(100, state.stats.mind + 4);
    text = '피비린내 속에서 고기를 발랐다. 신선식 3.';
  } else if (s.done === 'driven') {
    state.stats.mind = Math.min(100, state.stats.mind + 3);
    text = '심장이 한참을 뛰었다.';
  } else if (s.done === 'escaped') {
    text = '뒤돌아 뛰지 않았다. 그게 요령이다.';
  } else if (s.done === 'fled') {
    state.stats.mind = Math.max(0, state.stats.mind - 5);
    text = '손이 떨린다.';
  } else {
    state.stats.mind = Math.max(0, state.stats.mind - 8);
    text = '잃은 것을 세어 보지 않기로 했다.';
  }
  addLog(state, text);
  state.standoff = null;
  return text;
}
