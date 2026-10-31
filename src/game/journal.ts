import type { GameState, Journal, RunRecord } from '../core/types';
import { REGIONS } from '../map/generate';
import { clueCount, eventById } from './events';

// 기록 수첩. 여정이 끝날 때마다 한 줄 적힌다. 죽어도 남는 유일한 것
const KEY = 'marugeum.journal.v1';

function empty(): Journal {
  return { v: 1, runs: [], knownStages: [], eventsSeen: {}, deaths: {} };
}

export function loadJournal(): Journal {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const j = JSON.parse(raw) as Journal;
    if (!j || j.v !== 1 || !Array.isArray(j.runs)) return empty();
    return j;
  } catch {
    return empty();
  }
}

export function saveJournal(j: Journal): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(j));
  } catch {
    // 저장소가 막혀 있으면 조용히 넘어간다
  }
}

export function nextRunNo(j: Journal): number {
  return j.runs.length + 1;
}

// 여정이 끝났을 때. 지나온 지역과 만난 이야기, 죽은 이유를 적는다
export function recordRun(state: GameState): Journal {
  const j = loadJournal();
  if (state.over === 'none') return j;
  const farthest = Math.max(...state.nodes.filter((n) => n.visited).map((n) => n.stage));
  const rec: RunRecord = {
    runNo: state.runNo,
    seed: state.seed,
    days: state.day,
    over: state.over,
    cause: state.overText,
    rad: Math.round(state.stats.rad),
    farthest,
    events: [...state.seen],
    gear: state.equip.filter((e) => !e.broken).map((e) => e.kind),
    departedDay: state.departedDay,
    buried: [...state.buried],
    ending: state.ending,
    clues: clueCount(state),
    endedAt: Date.now(),
  };
  j.runs.push(rec);
  if (j.runs.length > 50) j.runs.shift();
  for (const n of state.nodes) {
    if (n.visited && !j.knownStages.includes(n.stage)) j.knownStages.push(n.stage);
  }
  j.knownStages.sort((a, b) => a - b);
  for (const id of state.seen) j.eventsSeen[id] = (j.eventsSeen[id] ?? 0) + 1;
  if (state.over === 'dead') {
    const key = deathKey(state.overText);
    j.deaths[key] = (j.deaths[key] ?? 0) + 1;
  }
  saveJournal(j);
  return j;
}

function deathKey(text: string): string {
  if (text.includes('물')) return '갈증';
  if (text.includes('추위')) return '추위';
  if (text.includes('피폭')) return '피폭';
  if (text.includes('굶주림')) return '굶주림';
  return '기타';
}

export function regionName(stage: number): string {
  return REGIONS[stage] ?? '?';
}

export function eventTitle(id: string): string {
  return eventById(id)?.title ?? id;
}

// 죽은 이유에서 배운 것. 수첩 맨 뒤에 적힌다
export function lessons(j: Journal): string[] {
  const out: string[] = [];
  const d = j.deaths;
  if ((d['갈증'] ?? 0) >= 1) out.push('물은 보이는 곳마다 담아 둔다. 약수터와 절은 깨끗하고, 계곡과 우물은 끓여야 한다.');
  if ((d['추위'] ?? 0) >= 1) out.push('능선에서 노숙하지 않는다. 지붕이 없으면 불이라도 피운다. 담요는 밤을 반으로 줄인다.');
  if ((d['피폭'] ?? 0) >= 1) out.push('비 오는 날은 걷지 않는다. 바람이 오는 쪽 사면은 피하고, 낮은 땅에 오래 있지 않는다.');
  if ((d['굶주림'] ?? 0) >= 1) out.push('마을과 절과 군 시설에 먹을 것이 많다. 계곡의 물고기는 사흘마다 돌아온다.');
  if (j.runs.some((r) => r.over === 'won')) out.push('향로봉까지 갈 수 있다. 한 번 갔으니 또 갈 수 있다.');
  if (out.length === 0) out.push('아직 배운 것이 없다. 산이 가르칠 것이다.');
  return out;
}
