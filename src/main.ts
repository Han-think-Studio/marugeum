import './style.css';
import { createGame } from './game/state';
import * as api from './game/state';
import { loadJournal, nextRunNo } from './game/journal';
import { clearSave, loadGame } from './game/save';
import { mountUI } from './ui/ui';
import { showJournal, showSettings, showTitle } from './ui/screens';
import { loadSettings, settings } from './game/settings';
import type { GameState } from './core/types';
import { audio } from './audio/engine';
import { TITLE_TARGETS } from './audio/scene';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app 요소가 없습니다');

const params = new URLSearchParams(location.search);
const journal = loadJournal();
loadSettings();

function newSeed(): number {
  const param = params.get('seed');
  return param ? Number(param) >>> 0 : (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}

function start(state: GameState): void {
  app!.querySelectorAll('.overlay').forEach((o) => o.remove());
  state.view = settings.defaultView;
  const render = mountUI(app!, state);
  console.log('마루금 seed =', state.seed, 'run =', state.runNo);
  // 개발 중에는 콘솔에서 상태와 행동을 직접 다룰 수 있게 열어둔다
  if (import.meta.env.DEV) {
    (window as unknown as { marugeum: unknown }).marugeum = { state, render, audio, ...api };
  }
}

function startNew(): void {
  clearSave();
  start(createGame(newSeed(), { knownStages: journal.knownStages, runNo: nextRunNo(journal) }));
}

const saved = loadGame();

// 첫 입력에서 소리를 연다. 제목 화면에서는 테마가 난다
const unlockOnce = () => {
  audio.unlock();
  if (!app!.querySelector('.game')) audio.apply(TITLE_TARGETS);
};
window.addEventListener('pointerdown', unlockOnce, { capture: true });
window.addEventListener('keydown', unlockOnce, { capture: true });

// ?seed= 나 ?new=1 이 붙어 있으면 제목 화면 없이 바로 새 여정 (개발과 다시 시작용)
if (params.get('seed') || params.get('new')) {
  startNew();
} else {
  showTitle(app, {
    journal,
    resume: saved ? { day: saved.day, place: saved.nodes[saved.nodeId].name } : null,
    onResume: () => { if (saved) start(saved); },
    onNew: startNew,
    onJournal: () => { showJournal(app!, loadJournal(), () => undefined); },
    onSettings: () => { showSettings(app!, () => undefined); },
  });
}
