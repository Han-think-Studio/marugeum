import { INDOOR, KIND_LABEL, SIDE_LABEL, WOOD_NODES, type GameState, type MapNode } from '../core/types';
import { drawMap, hitTest, makeView, type View } from '../map/render';
import {
  WATER_LABEL, atCamp, boil, canBoil, canCamp, canDrink, canEat, canFill, canForage, canGatherWood, canLightFire,
  currentNode, deposit, dismissEvent, drink, eat, fill, forage, gatherWood, gearList, hasFire, isKnown, lightFire, makeCamp,
  neighbors, packCap, pickChoice, rainBlocksFire, rest, sleep, timeLabel, travelHours, travelTo, waterKind, withdraw,
} from '../game/state';
import { eventById, meetsReq } from '../game/events';
import { loadJournal, recordRun } from '../game/journal';
import { clearSave, saveGame } from '../game/save';
import { showJournal, showMenu } from './screens';
import { audio } from '../audio/engine';
import { sceneTargets } from '../audio/scene';
import { radPerHour } from '../game/survival';
import { envTemp, weatherText } from '../game/weather';

interface Refs {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  hud: HTMLElement;
  place: HTMLElement;
  log: HTMLElement;
  choices: HTMLElement;
  actions: HTMLElement;
}

const WOOD_HERE = (k: string) => WOOD_NODES.has(k as never);

const STAT_LABEL: Record<string, string> = {
  hp: '체력',
  hunger: '허기',
  thirst: '갈증',
  temp: '체온',
  fatigue: '피로',
  rad: '피폭',
  mind: '정신',
};

// 화면을 붙이고, 다시 그리는 함수를 돌려준다
export function mountUI(root: HTMLElement, state: GameState): () => void {
  root.innerHTML = `
    <div class="game">
      <header class="hud"></header>
      <canvas class="map"></canvas>
      <section class="panel">
        <div class="place"></div>
        <div class="log"></div>
        <div class="actions"></div>
        <div class="choices"></div>
      </section>
    </div>`;

  const canvas = root.querySelector<HTMLCanvasElement>('.map')!;
  const refs: Refs = {
    canvas,
    ctx: canvas.getContext('2d')!,
    hud: root.querySelector('.hud')!,
    place: root.querySelector('.place')!,
    log: root.querySelector('.log')!,
    choices: root.querySelector('.choices')!,
    actions: root.querySelector('.actions')!,
  };

  let view: View = makeView(1, 1);
  let hover: MapNode | null = null;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    refs.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    view = makeView(rect.width, rect.height);
    drawMap(refs.ctx, state, view, hover);
  };

  // 행동 전후를 비교해 효과음을 고른다
  let lastNode = state.nodeId;
  let lastEvent: string | null = state.event ? state.event.id : null;
  let lastFire = state.fire !== null;
  const cue = () => {
    if (state.over === 'dead') audio.sfx('death');
    else if (state.over === 'won') audio.sfx('arrive');
    else if (state.nodeId !== lastNode) audio.sfx('step');
    else if (state.fire !== null && !lastFire) audio.sfx('fire');
    else audio.sfx('click');
    if (state.event && state.event.id !== lastEvent && state.event.result === null) audio.sfx('event');
    lastNode = state.nodeId;
    lastEvent = state.event ? state.event.id : null;
    lastFire = state.fire !== null;
  };

  const render = () => {
    if (state.over !== 'none' && !state.recorded) {
      state.recorded = true;
      recordRun(state);
      clearSave();
    } else if (state.over === 'none') {
      saveGame(state);
    }
    if (firstRender) firstRender = false;
    else cue();
    audio.apply(sceneTargets(state, state.over !== 'none'));
    drawMap(refs.ctx, state, view, hover);
    renderHud(refs, state);
    renderPanel(refs, state, () => render());
  };

  let menuOpen = false;
  const openMenu = () => {
    if (menuOpen) return;
    menuOpen = true;
    showMenu(root, {
      onContinue: () => { menuOpen = false; },
      onJournal: () => { showJournal(root, loadJournal(), () => undefined); },
      onTitle: () => { saveGame(state); location.href = location.pathname; },
    });
  };

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const n = hitTest(state, view, e.clientX - rect.left, e.clientY - rect.top);
    const next = n && neighbors(state).includes(n) ? n : null;
    if (next !== hover) {
      hover = next;
      canvas.style.cursor = hover ? 'pointer' : 'default';
      drawMap(refs.ctx, state, view, hover);
    }
  });
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const n = hitTest(state, view, e.clientX - rect.left, e.clientY - rect.top);
    if (n && travelTo(state, n.id)) render();
  });
  window.addEventListener('keydown', (e) => {
    audio.unlock();
    if (e.key.toLowerCase() === 'm') { audio.toggleMuted(); renderHud(refs, state); return; }
    if (root.querySelector('.overlay')) return;
    if (e.key === 'Escape') { openMenu(); return; }
    if (e.key.toLowerCase() === 'j') { showJournal(root, loadJournal(), () => undefined); return; }
    if (state.over !== 'none') {
      if (e.key === '1' || e.key === 'Enter') location.href = location.pathname + '?new=1';
      return;
    }
    const k = Number(e.key);
    if (state.event) {
      if (state.event.result !== null) {
        if (e.key === 'Enter' || e.key === ' ' || k === 1) { if (dismissEvent(state)) render(); }
      } else if (k >= 1 && k <= 4 && pickChoice(state, k - 1)) render();
      return;
    }
    if (k >= 1 && k <= 6) {
      const target = neighbors(state)[k - 1];
      if (target && travelTo(state, target.id)) render();
      return;
    }
    const map: Record<string, () => boolean> = {
      r: () => rest(state), s: () => sleep(state), w: () => drink(state), q: () => fill(state),
      e: () => eat(state), f: () => forage(state), b: () => makeCamp(state), g: () => deposit(state), t: () => withdraw(state),
      n: () => gatherWood(state), h: () => lightFire(state), p: () => boil(state),
    };
    const fn = map[e.key.toLowerCase()];
    if (fn && fn()) render();
  });
  window.addEventListener('resize', resize);
  refs.hud.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    if (el.classList.contains('menu-btn')) openMenu();
    if (el.classList.contains('sound-btn')) { audio.toggleMuted(); renderHud(refs, state); }
  });
  root.addEventListener('pointerdown', () => audio.unlock(), { capture: true });

  resize();
  firstRender = true;
  render();
  return render;
}

let firstRender = false;

function renderHud(refs: Refs, state: GameState): void {
  const chips = Object.entries(state.stats)
    .map(([k, v]) => {
      const warn = k === 'rad' ? v >= 40 : v <= 35;
      const bad = k === 'rad' ? v >= 60 : v <= 15;
      return `<span class="chip${bad ? ' bad' : warn ? ' warn' : ''}"><b>${STAT_LABEL[k]}</b> ${Math.round(v)}</span>`;
    })
    .join('');
  const cur = currentNode(state);
  const t = Math.round(envTemp(state, cur));
  const p = state.pack;
  const cap = packCap(state);
  const dirty = p.dirty ? `<span class="dirty">+${p.dirty}오염</span>` : '';
  const gear = gearList(state);
  const geiger = state.gear.geiger ? ` · <span class="geiger">☢ ${radPerHour(state, cur, INDOOR.has(cur.kind)).toFixed(1)}/시</span>` : '';
  refs.hud.innerHTML =
    `<button class="menu-btn" title="메뉴 (Esc)">≡</button><button class="sound-btn${audio.muted ? ' off' : ''}" title="소리 (M)">♪</button><span class="title">마루금</span><span class="time">${timeLabel(state)}</span>` +
    `<span class="weather">${weatherText(state)} · 체감 ${t}°${geiger}</span>` +
    `<span class="pack">물 ${p.water}${dirty}/${cap.water} · 먹을 것 ${p.food}/${cap.food} · 땔감 ${p.wood}/${cap.wood}${gear.length ? ' · ' + gear.join(', ') : ''}${hasFire(state) ? ' · <span class="fire">불 ' + state.fire!.hours + '시간</span>' : ''}</span>${chips}`;
}

function renderPanel(refs: Refs, state: GameState, rerender: () => void): void {
  const cur = currentNode(state);
  const store = cur.camp && cur.store ? ` · 저장고 물 ${cur.store.water}${cur.store.dirty ? `+${cur.store.dirty}오염` : ''} 먹을 것 ${cur.store.food} 땔감 ${cur.store.wood}` : '';
  refs.place.innerHTML =
    `<span class="kind">${KIND_LABEL[cur.kind]}</span> <span class="name">${cur.name}</span>` +
    ` <span class="alt">해발 ${Math.round(600 + cur.alt * 1300)}m · ${SIDE_LABEL[cur.side]}${INDOOR.has(cur.kind) ? ' · 지붕 있음' : ''}${cur.camp ? ' · <b>거점</b>' : ''}${store}</span>`;

  refs.log.innerHTML = state.log
    .slice(-8)
    .map((t, i, arr) => `<p class="${i === arr.length - 1 ? 'latest' : ''}">${t}</p>`)
    .join('');
  refs.log.scrollTop = refs.log.scrollHeight;

  refs.actions.innerHTML = '';
  refs.choices.innerHTML = '';

  if (state.event) {
    renderEvent(refs, state, rerender);
    return;
  }

  if (state.over !== 'none') {
    const won = state.over === 'won';
    refs.choices.innerHTML =
      `<div class="end ${won ? 'won' : 'dead'}"><p>${state.overText}</p><p class="muted">기록 수첩에 적혔다. ${state.runNo}번째 여정.</p>` +
      `<button class="restart"><span class="num">1</span> 새 여정</button> <button class="book-btn"><span class="num">J</span> 기록 수첩</button></div>`;
    refs.choices.querySelector('.restart')!.addEventListener('click', () => {
      location.href = location.pathname + '?new=1';
    });
    refs.choices.querySelector('.book-btn')!.addEventListener('click', () => {
      showJournal(refs.choices.closest('.game')!.parentElement as HTMLElement, loadJournal(), () => undefined);
    });
    return;
  }

  const act = (label: string, key: string, meta: string, fn: () => boolean, enabled = true) => {
    const b = document.createElement('button');
    b.className = 'act';
    b.disabled = !enabled;
    b.innerHTML = `<span class="key">${key}</span> ${label} <span class="meta">${meta}</span>`;
    b.addEventListener('click', () => {
      if (fn()) rerender();
    });
    refs.actions.appendChild(b);
  };
  const wk = waterKind(state);
  const p = state.pack;
  const cap = packCap(state);
  act('쉬기', 'R', '2시간', () => rest(state));
  act(cur.camp ? '거점에서 자기' : INDOOR.has(cur.kind) ? '실내에서 자기' : '노숙', 'S', '8시간', () => sleep(state));
  act('마시기', 'W', wk !== 'none' ? WATER_LABEL[wk] + (wk === 'stored' ? ` ${cur.waterLeft}회` : '') : p.water + p.dirty > 0 ? '배낭에서' : '물이 없다', () => drink(state), canDrink(state));
  act('물 담기', 'Q', wk === 'none' ? '물이 없다' : p.water + p.dirty >= cap.water ? '배낭이 가득' : WATER_LABEL[wk], () => fill(state), canFill(state));
  act('먹기', 'E', p.food > 0 ? `${p.food}개 있음` : '먹을 것 없음', () => eat(state), canEat(state));
  act('먹을 것 찾기', 'F', p.food >= cap.food ? '배낭이 가득' : cur.forageLeft > 0 ? `2시간 · ${cur.forageLeft}회 남음` : '더 찾을 곳이 없다', () => forage(state), canForage(state));
  act('땔감 모으기', 'N', !WOOD_HERE(cur.kind) ? '나무가 없다' : p.wood >= cap.wood ? '배낭이 가득' : '1시간', () => gatherWood(state), canGatherWood(state));
  act(hasFire(state) ? '불 타는 중' : '불 피우기', 'H', hasFire(state) ? `${state.fire!.hours}시간 남음` : p.wood <= 0 ? '땔감이 없다' : rainBlocksFire(state) ? '비 · 지붕이 필요하다' : '땔감 1개 · 10시간', () => lightFire(state), canLightFire(state));
  act('물 끓이기', 'P', !hasFire(state) ? '불이 필요하다' : p.dirty > 0 ? `오염수 ${Math.min(2, p.dirty)}통 · 1시간` : '오염수가 없다', () => boil(state), canBoil(state));
  if (canCamp(state)) act('거점 세우기', 'B', '3시간', () => makeCamp(state));
  if (atCamp(state)) {
    act('맡기기', 'G', '배낭을 저장고에', () => deposit(state), p.water + p.dirty + p.food + p.wood > 0);
    act('챙기기', 'T', '저장고에서 배낭에', () => withdraw(state), !!cur.store && cur.store.water + cur.store.dirty + cur.store.food + cur.store.wood > 0);
  }

  neighbors(state).forEach((n, i) => {
    const btn = document.createElement('button');
    const hours = travelHours(state, cur, n);
    const dir = n.stage < cur.stage ? '남쪽으로' : n.alt > cur.alt + 0.1 ? '오르막' : n.alt < cur.alt - 0.1 ? '내리막' : '능선길';
    const risk = state.wind !== 'calm' && n.side === state.wind ? ' · 바람받이' : '';
    const known = isKnown(state, cur, n) ? ' · 아는 길' : '';
    const info = n.visited
      ? ` · 먹을 것 ${n.forageLeft}회${n.waterLeft !== 0 || n.kind === 'spring' || n.kind === 'valley' || n.kind === 'temple' || n.kind === 'village' ? ' · 물' : ''}${n.camp ? ' · 거점' : ''}`
      : state.knownStages.includes(n.stage) ? ' · 기억나는 곳' : ' · 미탐사';
    btn.className = n.stage < cur.stage ? 'back' : '';
    btn.innerHTML = `<span class="num">${i + 1}</span> <span class="to">${n.name}</span> <span class="meta">${KIND_LABEL[n.kind]} · ${dir} · 약 ${hours}시간${known}${risk}${info}</span>`;
    btn.addEventListener('click', () => {
      if (travelTo(state, n.id)) rerender();
    });
    refs.choices.appendChild(btn);
  });
}

// 이벤트 화면. 본문과 선택지, 선택 뒤에는 결과와 확인 버튼
function renderEvent(refs: Refs, state: GameState, rerender: () => void): void {
  const ev = state.event && eventById(state.event.id);
  if (!ev || !state.event) return;
  const box = document.createElement('div');
  box.className = 'event';
  if (state.event.result === null) {
    box.innerHTML = `<h3>${ev.title}</h3><p>${ev.text}</p>`;
    const list = document.createElement('div');
    list.className = 'event-choices';
    ev.choices.forEach((c, i) => {
      const b = document.createElement('button');
      const ok = meetsReq(state, c.req, currentNode(state));
      b.disabled = !ok;
      b.innerHTML = `<span class="num">${i + 1}</span> <span class="to">${c.text}</span>${c.hint ? `<span class="meta">${c.hint}</span>` : ''}`;
      b.addEventListener('click', () => {
        if (pickChoice(state, i)) rerender();
      });
      list.appendChild(b);
    });
    box.appendChild(list);
  } else {
    box.innerHTML = `<h3>${ev.title}</h3><p class="result">${state.event.result}</p>`;
    const b = document.createElement('button');
    b.className = 'ok';
    b.innerHTML = `<span class="num">1</span> 계속`;
    b.addEventListener('click', () => {
      if (dismissEvent(state)) rerender();
    });
    box.appendChild(b);
  }
  refs.choices.appendChild(box);
}
