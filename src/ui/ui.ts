import { INDOOR, KIND_LABEL, SIDE_LABEL, type GameState, type MapNode } from '../core/types';
import { drawMap, hitTest, makeView, type View } from '../map/render';
import {
  canDrink, canForage, currentNode, drink, forage, reachable, rest, sleep, timeLabel, travelHours, travelTo, waterKind,
} from '../game/state';
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

const STAT_LABEL: Record<string, string> = {
  hp: '체력',
  hunger: '허기',
  thirst: '갈증',
  temp: '체온',
  fatigue: '피로',
  rad: '피폭',
  mind: '정신',
};

export function mountUI(root: HTMLElement, state: GameState): void {
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

  const render = () => {
    drawMap(refs.ctx, state, view, hover);
    renderHud(refs, state);
    renderPanel(refs, state, () => render());
  };

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const n = hitTest(state, view, e.clientX - rect.left, e.clientY - rect.top);
    const next = n && currentNode(state).links.includes(n.id) ? n : null;
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
    if (state.over !== 'none') return;
    const k = Number(e.key);
    if (k >= 1 && k <= 3) {
      const target = reachable(state)[k - 1];
      if (target && travelTo(state, target.id)) render();
      return;
    }
    const map: Record<string, () => boolean> = { r: () => rest(state), s: () => sleep(state), w: () => drink(state), f: () => forage(state) };
    const fn = map[e.key.toLowerCase()];
    if (fn && fn()) render();
  });
  window.addEventListener('resize', resize);

  resize();
  render();
}

function renderHud(refs: Refs, state: GameState): void {
  const chips = Object.entries(state.stats)
    .map(([k, v]) => {
      const warn = k === 'rad' ? v >= 40 : v <= 35;
      const bad = k === 'rad' ? v >= 60 : v <= 15;
      return `<span class="chip${bad ? ' bad' : warn ? ' warn' : ''}"><b>${STAT_LABEL[k]}</b> ${Math.round(v)}</span>`;
    })
    .join('');
  const t = Math.round(envTemp(state, currentNode(state)));
  refs.hud.innerHTML =
    `<span class="title">마루금</span><span class="time">${timeLabel(state)}</span>` +
    `<span class="weather">${weatherText(state)} · 체감 ${t}°</span>${chips}`;
}

function renderPanel(refs: Refs, state: GameState, rerender: () => void): void {
  const cur = currentNode(state);
  refs.place.innerHTML =
    `<span class="kind">${KIND_LABEL[cur.kind]}</span> <span class="name">${cur.name}</span>` +
    ` <span class="alt">해발 ${Math.round(600 + cur.alt * 1300)}m · ${SIDE_LABEL[cur.side]}${INDOOR.has(cur.kind) ? ' · 지붕 있음' : ''}</span>`;

  refs.log.innerHTML = state.log
    .slice(-8)
    .map((t, i, arr) => `<p class="${i === arr.length - 1 ? 'latest' : ''}">${t}</p>`)
    .join('');
  refs.log.scrollTop = refs.log.scrollHeight;

  refs.actions.innerHTML = '';
  refs.choices.innerHTML = '';

  if (state.over !== 'none') {
    const won = state.over === 'won';
    refs.choices.innerHTML =
      `<div class="end ${won ? 'won' : 'dead'}"><p>${state.overText}</p>` +
      `<button class="restart">새 여정 시작</button></div>`;
    refs.choices.querySelector('.restart')!.addEventListener('click', () => {
      location.href = location.pathname;
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
  act('쉬기', 'R', '2시간', () => rest(state));
  act(INDOOR.has(cur.kind) ? '실내에서 자기' : '노숙', 'S', '8시간', () => sleep(state));
  const wk = waterKind(state);
  const waterMeta: Record<string, string> = {
    spring: '깨끗한 물', stream: '계곡물 · 피폭 위험', well: '우물 · 피폭 위험',
    stored: `저장된 물 · ${cur.waterLeft}회`, rain: '빗물 · 피폭 위험', none: '물이 없다',
  };
  act(wk === 'rain' ? '빗물 받기' : '물 마시기', 'W', waterMeta[wk], () => drink(state), canDrink(state));
  act('먹을 것 찾기', 'F', cur.forageLeft > 0 ? `2시간 · ${cur.forageLeft}회 남음` : '더 찾을 곳이 없다', () => forage(state), canForage(state));

  reachable(state).forEach((n, i) => {
    const btn = document.createElement('button');
    const hours = travelHours(state, cur, n);
    const dir = n.alt > cur.alt + 0.1 ? '오르막' : n.alt < cur.alt - 0.1 ? '내리막' : '능선길';
    const risk = state.wind !== 'calm' && n.side === state.wind ? ' · 바람받이' : '';
    btn.innerHTML = `<span class="num">${i + 1}</span> <span class="to">${n.name}</span> <span class="meta">${KIND_LABEL[n.kind]} · ${dir} · 약 ${hours}시간${risk}</span>`;
    btn.addEventListener('click', () => {
      if (travelTo(state, n.id)) rerender();
    });
    refs.choices.appendChild(btn);
  });
}
