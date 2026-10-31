import { KIND_LABEL, type GameState, type MapNode } from '../core/types';
import { drawMap, hitTest, makeView, type View } from '../map/render';
import { currentNode, reachable, timeLabel, travelHours, travelTo } from '../game/state';

interface Refs {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  hud: HTMLElement;
  place: HTMLElement;
  log: HTMLElement;
  choices: HTMLElement;
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
    renderPanel(refs, state, (id) => {
      if (travelTo(state, id)) render();
    });
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
    const k = Number(e.key);
    if (k >= 1 && k <= 3) {
      const target = reachable(state)[k - 1];
      if (target && travelTo(state, target.id)) render();
    }
  });
  window.addEventListener('resize', resize);

  resize();
  render();
}

function renderHud(refs: Refs, state: GameState): void {
  const chips = Object.entries(state.stats)
    .map(([k, v]) => {
      const warn = k === 'rad' ? v >= 40 : v <= 35;
      return `<span class="chip${warn ? ' warn' : ''}"><b>${STAT_LABEL[k]}</b> ${Math.round(v)}</span>`;
    })
    .join('');
  refs.hud.innerHTML = `<span class="title">마루금</span><span class="time">${timeLabel(state)}</span>${chips}`;
}

function renderPanel(refs: Refs, state: GameState, onPick: (id: number) => void): void {
  const cur = currentNode(state);
  refs.place.innerHTML = `<span class="kind">${KIND_LABEL[cur.kind]}</span> <span class="name">${cur.name}</span> <span class="alt">해발 ${Math.round(600 + cur.alt * 1300)}m</span>`;

  refs.log.innerHTML = state.log
    .slice(-8)
    .map((t, i, arr) => `<p class="${i === arr.length - 1 ? 'latest' : ''}">${t}</p>`)
    .join('');
  refs.log.scrollTop = refs.log.scrollHeight;

  refs.choices.innerHTML = '';
  if (state.over === 'won') {
    refs.choices.innerHTML = `<p class="end">도착했다. 새 여정을 시작하려면 새로고침하세요.</p>`;
    return;
  }
  reachable(state).forEach((n, i) => {
    const btn = document.createElement('button');
    const hours = travelHours(cur, n);
    const dir = n.alt > cur.alt + 0.1 ? '오르막' : n.alt < cur.alt - 0.1 ? '내리막' : '능선길';
    btn.innerHTML = `<span class="num">${i + 1}</span> <span class="to">${n.name}</span> <span class="meta">${KIND_LABEL[n.kind]} · ${dir} · 약 ${hours}시간</span>`;
    btn.addEventListener('click', () => onPick(n.id));
    refs.choices.appendChild(btn);
  });
}