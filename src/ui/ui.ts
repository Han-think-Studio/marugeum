import { CAMP_HOUSE_LABEL, CAMP_TIERS, CRISIS_INFO, ENDING_INFO, FAMILY, INDOOR, KIND_LABEL, SIDE_LABEL, STANDOFF_ACTION_LABEL, STANDOFF_INFO, UPGRADES, WOOD_NODES, edgeKey, type GameState, type MapNode, type SceneObject, type StandoffAction } from '../core/types';
import { drawMap, hitTest, makeView, type View } from '../map/render';
import { REGIONS } from '../map/generate';
const REGION_OF = (n: MapNode): string => REGIONS[n.stage] ?? '';
import {
  WATER_LABEL, atCamp, boil, buildWindbreak, campLabel, campTierHere, canBoil, canCamp, canDrink, canEat, canFill, canGatherWood, canLightFire, canLook, canLookPhoto, canWindbreak, clueCount, lookPhoto,
  currentNode, deposit, dismissEvent, drink, eat, fill, gatherWood, gearList, hasEquip, hasFire, hiddenCount, inspectObject,
  canCook, cook, lightFire, lookAround, makeCamp, isPowered, neighbors, packCap, packWeight, pickChoice, rainBlocksFire, rest, sleep, timeLabel,
  canThrow, routeRisk, standoffClose, standoffMove, standoffOdds, weightPenalty,
  canScout, scout, scoutBlock, scoutHours, securingStatus, travelBlock, endingNotes, hoursTo, equipLabel,
  canMaintain, maintain, maintainNeed, condOf, canListenRadio, listenRadio, radioSource, batteryCount, crisisText, crisisActive,
  canFirstAid, canPurify, canTakeIodine, firstAid, purify, takeIodine, weightLimit,
  travelHours, travelTo, visibleObjects, waterKind, withdraw,
} from '../game/state';
import { showBase } from './base';
import { drawBuilt, drawObjects, drawScene, hitObject } from './scene';
import { storeText } from '../game/state';
import { eventById, fillName, latestTrace, meetsReq } from '../game/events';
import { myRibbon, ridgeRibbon } from '../game/ribbons';
import { loadJournal, recordRun } from '../game/journal';
import { clearSave, saveGame } from '../game/save';
import { showJournal, showLog, showMenu, showSettings } from './screens';
import { toggleFullscreen } from './fullscreen';
import { TABS, bodyAlert, bodyHtml, packHtml, type Tab } from './dock';
import { pushSlide } from './slides';
import { iconHtml, uiIcon } from './art';
import { playHand, type HandKind } from './handwork';
import { AFTERWORD, afterwordEarned, hiddenFound } from '../game/hidden';
import { settings } from '../game/settings';
import { audio } from '../audio/engine';
import { sceneTargets } from '../audio/scene';
import { radPerHour } from '../game/survival';
import { absHour, daylightLeft, envTemp, forecastText, isNight, weatherText } from '../game/weather';

interface Refs {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  hud: HTMLElement;
  place: HTMLElement;
  log: HTMLElement;
  choices: HTMLElement;
  actions: HTMLElement;
  mapSide: HTMLElement;
  routes: HTMLElement;
  packView: HTMLElement;
  bodyView: HTMLElement;
  tabs: HTMLElement;
  steps: HTMLElement;
  top: HTMLElement;
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
      <div class="top"><canvas class="map"></canvas><aside class="map-side"></aside></div>
      <section class="panel">
        <div class="feed"><div class="place"></div><div class="steps"></div><div class="log"></div></div>
        <div class="dock">
          <nav class="tabs"></nav>
          <div class="tabbody">
            <div class="routes tab-go"></div>
            <div class="actions tab-act"></div>
            <div class="packview tab-pack"></div>
            <div class="bodyview tab-body"></div>
          </div>
        </div>
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
    mapSide: root.querySelector('.map-side')!,
    routes: root.querySelector('.routes')!,
    packView: root.querySelector('.packview')!,
    bodyView: root.querySelector('.bodyview')!,
    tabs: root.querySelector('.tabs')!,
    steps: root.querySelector('.steps')!,
    top: root.querySelector('.top')!,
  };
  lastCrisis = state.crisis && state.crisis.started ? state.crisis.start : -1;

  let view: View = makeView(1, 1);
  let hover: MapNode | null = null;
  let hoverObj: SceneObject | null = null;

  // 위쪽 큰 화면. 장면이 기본이고 지도는 전환해서 본다. 비·불·별·사물 표식이 있을 때는 느리게 움직인다
  let animating = false;
  const paintTop = () => {
    refs.mapSide.style.display = state.view === 'map' ? '' : 'none';
    view.padRight = state.view === 'map' && !sideCollapsed ? Math.min(290, view.w * 0.3) : 36;
    if (state.view === 'map') {
      drawMap(refs.ctx, state, view, hover);
      renderMapSide(refs, state);
    } else {
      drawScene(refs.ctx, state, view.w, view.h, performance.now(), paintTop);
      drawObjects(refs.ctx, currentNode(state), view.w, view.h, performance.now(), hoverObj, paintTop);
      drawBuilt(refs.ctx, currentNode(state), paintTop);
    }
  };
  const animate = () => {
    const live = state.view === 'scene' && state.over === 'none' && settings.animation;
    if (!live) {
      animating = false;
      return;
    }
    paintTop();
    window.setTimeout(() => requestAnimationFrame(animate), 120);
  };
  const kickScene = () => {
    paintTop();
    if (!animating) {
      animating = true;
      animate();
    }
  };
  const toggleView = () => {
    state.view = state.view === 'map' ? 'scene' : 'map';
    hover = null;
    hoverObj = null;
    render();
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    refs.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    view = makeView(rect.width, rect.height);
    paintTop();
  };
  // 지도 옆 목록이 열렸다 닫히면 지도를 다시 맞춘다
  window.addEventListener('marugeum:side', () => { view.padRight = sideCollapsed ? 36 : Math.min(290, view.w * 0.3); paintTop(); });

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
    kickScene();
    renderHud(refs, state);
    renderPanel(refs, state, () => render());
    slidesAfter(refs, state);
  };

  let menuOpen = false;
  const openMenu = () => {
    if (menuOpen) return;
    menuOpen = true;
    showMenu(root, {
      onContinue: () => { menuOpen = false; },
      onJournal: () => { showJournal(root, loadJournal(), () => undefined); },
      onSettings: () => { showSettings(root, () => render()); },
      onTitle: () => { saveGame(state); location.href = location.pathname; },
    });
  };

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (state.view === 'map') {
      const n = hitTest(state, view, px, py);
      if (n !== hover) {
        hover = n;
        canvas.style.cursor = n && neighbors(state).includes(n) ? 'pointer' : 'default';
        paintTop();
      }
    } else {
      const o = state.event ? null : hitObject(currentNode(state), view.w, view.h, px, py);
      if (o !== hoverObj) {
        hoverObj = o;
        canvas.style.cursor = o && !o.used ? 'pointer' : 'default';
      }
    }
  });
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (state.view === 'map') {
      const n = hitTest(state, view, px, py);
      if (n) { markAction(state, 'travel'); if (travelTo(state, n.id)) render(); }
    } else {
      const o = hitObject(currentNode(state), view.w, view.h, px, py);
      if (o && !o.used && inspectObject(state, o.id)) render();
    }
  });
  window.addEventListener('keydown', (e) => {
    audio.unlock();
    if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); return; }
    if (e.key.toLowerCase() === 'm') { audio.toggleMuted(); renderHud(refs, state); return; }
    if (e.key.toLowerCase() === 'v' && !root.querySelector('.overlay')) { toggleView(); return; }
    if (root.querySelector('.overlay')) return;
    if (e.key === 'Tab') { e.preventDefault(); const i = TABS.findIndex(([t]) => t === tab); tab = TABS[(i + (e.shiftKey ? TABS.length - 1 : 1)) % TABS.length][0]; render(); return; }
    if (e.key === 'Escape') { openMenu(); return; }
    if (e.key.toLowerCase() === 'j') { showJournal(root, loadJournal(), () => undefined); return; }
    if (e.key.toLowerCase() === 'l') { showLog(root, state.log, () => undefined); return; }
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
    if (state.standoff) {
      if (state.standoff.done) {
        if (e.key === 'Enter' || e.key === ' ' || k === 1) { if (standoffClose(state)) render(); }
      } else {
        const acts: StandoffAction[] = ['threaten', 'retreat', 'throw', 'fight'];
        if (k >= 1 && k <= 4 && standoffMove(state, acts[k - 1])) render();
      }
      return;
    }
    if (e.shiftKey && /^Digit[1-6]$/.test(e.code)) {
      const target = neighbors(state)[Number(e.code.slice(5)) - 1];
      if (target && scout(state, target.id)) render();
      return;
    }
    if (k >= 1 && k <= 6) {
      const target = neighbors(state)[k - 1];
      if (target) { markAction(state, 'travel'); if (travelTo(state, target.id)) render(); }
      return;
    }
    const map: Record<string, () => boolean> = {
      r: () => rest(state), s: () => { markAction(state, 'sleep'); return sleep(state); }, w: () => drink(state), q: () => fill(state),
      e: () => eat(state), f: () => lookAround(state), b: () => makeCamp(state), g: () => deposit(state), t: () => withdraw(state),
      n: () => gatherWood(state), p: () => boil(state),
      h: () => canLightFire(state) && handThen('match', (sk) => lightFire(state, sk), render),
      a: () => canCook(state) && handThen('cook', (sk) => cook(state, sk), render),
      c: () => { showBase(root, state, render); return false; },
      k: () => buildWindbreak(state),
      o: () => lookPhoto(state),
      i: () => takeIodine(state),
      u: () => firstAid(state),
      x: () => maintain(state),
      z: () => listenRadio(state),
      y: () => purify(state),
    };
    const fn = map[e.key.toLowerCase()];
    if (fn && fn()) render();
  });
  window.addEventListener('resize', resize);
  refs.hud.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    if (el.classList.contains('menu-btn')) openMenu();
    if (el.classList.contains('sound-btn')) { audio.toggleMuted(); renderHud(refs, state); }
    if (el.classList.contains('view-btn')) toggleView();
  });
  root.addEventListener('pointerdown', () => audio.unlock(), { capture: true });

  resize();
  firstRender = true;
  render();
  return render;
}

let firstRender = false;

// 손 놀이를 띄우고, 솜씨가 나오면 행동을 한다. 그만두면(null) 아무것도 안 한다. 손 놀이 동안은 false 를 돌려 바로 다시 그리지 않는다
function handThen(kind: HandKind, run: (skill: number | undefined) => boolean, after: () => void): boolean {
  void playHand(document.getElementById('app') ?? document.body, kind).then((sk) => { if (sk !== null && run(sk)) after(); });
  return false;
}

// 죽음 그림. 대치에서 죽었으면 상대로, 아니면 바닥난 수치로 고른다. 사건으로 죽었으면 가장 나빴던 수치
function deathArt(state: GameState): string {
  const t = state.overText;
  if (t.includes(STANDOFF_INFO.deserter.name)) return 'gun';
  if (t.includes(STANDOFF_INFO.boar.name) || t.includes(STANDOFF_INFO.dogs.name)) return 'beast';
  const s = state.stats;
  if (s.thirst <= 0) return 'thirst';
  if (s.temp < 20) return 'cold';
  if (s.rad >= 60) return 'rad';
  if (s.hunger <= 0) return 'hunger';
  const worst: [string, number][] = [['thirst', s.thirst], ['cold', s.temp], ['hunger', s.hunger], ['rad', 100 - s.rad]];
  return worst.sort((a, b) => a[1] - b[1])[0][0];
}

// 두 사람의 가장 새로운 소식. 오래될수록 색이 바랜다
function familyChip(state: GameState): string {
  const t = latestTrace(state);
  if (!t || state.over !== 'none') return '';
  const age = t.days <= 3 ? 'near' : t.days >= 8 ? 'far' : '';
  return `<span class="family ${age}" title="${FAMILY.spouse}과 ${FAMILY.child}의 가장 새로운 흔적. 흔적을 찾을수록 소식이 가까워진다">${uiIcon('family')}<span class="who">${FAMILY.spouse}·${FAMILY.child} · </span>${t.place} ${t.ago}</span>`;
}

function renderHud(refs: Refs, state: GameState): void {
  const chips = Object.entries(state.stats)
    .map(([k, v]) => {
      const warn = k === 'rad' ? v >= 40 : v <= 35;
      const bad = k === 'rad' ? v >= 60 : v <= 15;
      const fill = k === 'rad' ? v : v;
      return `<span class="stat${bad ? ' bad' : warn ? ' warn' : ''}${k === 'rad' ? ' rad' : ''}" title="${STAT_LABEL[k]} ${Math.round(v)}"><img class="uic" src="./art/ui-stat-${k}.webp" alt="" onerror="this.nextElementSibling.hidden=false;this.remove()"><b hidden>${STAT_LABEL[k]}</b><i><i style="width:${Math.round(fill)}%"></i></i><small>${Math.round(v)}</small></span>`;
    })
    .join('');
  const cur = currentNode(state);
  const t = Math.round(envTemp(state, cur));
  const p = state.pack;
  const cap = packCap(state);
  const dirty = p.dirty ? `<span class="dirty">+${p.dirty}오염</span>` : '';
  const gear = gearList(state);
  const geiger = hasEquip(state, 'geiger') ? ` · <span class="geiger">☢ ${radPerHour(state, cur, INDOOR.has(cur.kind)).toFixed(1)}/시</span>` : '';
  refs.hud.innerHTML =
    `<button class="menu-btn" title="메뉴 (Esc)">≡</button><button class="sound-btn${audio.muted ? ' off' : ''}" title="소리 (M)">♪</button><button class="view-btn" title="장면/지도 (V)">${state.view === 'map' ? '장면' : '지도'}</button><span class="title">마루금</span><span class="time">${timeLabel(state)}</span>` +
    `<span class="phase">${state.phase === 'base' ? '거점기' : `종주 ${state.day - state.departedDay + 1}일째`}</span>` +
    familyChip(state) +
    `<span class="weather" title="${weatherText(state)}">${uiIcon(`weather-${state.weather}`)}${state.wind !== 'calm' ? uiIcon('wind') : ''}<span class="wtxt">${weatherText(state)} · </span>체감 ${t}°${geiger}</span>` +
    `<span class="forecast" title="하늘을 읽은 예보">${daylightLeft(state.hour) > 0 ? `해 ${daylightLeft(state.hour)}시간` : '밤'} · ${forecastText(state)}</span>` +
    (crisisText(state) ? `<span class="crisis${crisisActive(state) ? ' on' : ''}" title="고비. 지붕과 불과 땔감과 물을 챙겨 버틴다">${state.crisis ? uiIcon(`crisis-${state.crisis.kind}`) : ''}${crisisText(state)}</span>` : '') +
    chips;
  // 배낭은 장소 줄 아래에
  const packLine = refs.place.parentElement!.querySelector<HTMLElement>('.packline') ?? (() => {
    const el = document.createElement('div');
    el.className = 'packline';
    refs.place.after(el);
    return el;
  })();
  const wt = packWeight(state);
  const wpen = weightPenalty(state);
  packLine.innerHTML =
    `<span>배낭</span> <span class="${wpen ? 'heavy' : ''}" title="${weightLimit(state)}까지는 제값, 그 위로 6마다 이동 한 시간씩">무게 ${wt}/${weightLimit(state)}${wpen ? ` (+${wpen}시간)` : ''}</span> · 물 ${p.water}${dirty}/${cap.water} · 먹을 것 ${p.food + p.fresh}/${cap.food}${p.fresh ? `<span class="muted"> (신선 ${p.fresh})</span>` : ''} · 땔감 ${p.wood}/${cap.wood}` +
    `${p.gasoline ? ` · 휘발유 ${p.gasoline}` : ''}${p.diesel ? ` · 경유 ${p.diesel}` : ''}${p.parts ? ` · 부품 ${p.parts}` : ''}` +
    `${gear.length ? ' · ' + gear.join(', ') : ''}${hasFire(state) ? ' · <span class="fire">불 ' + state.fire!.hours + '시간</span>' : ''}`;
}

// 탭과 전환 그림. 행동 전의 몸 상태를 기억해 두었다가 이동과 잠 뒤에 한 장 넘긴다
let tab: Tab = 'act';
let lastCrisis = -1;
let iconRedraw = false;
let pending: { kind: 'travel' | 'sleep'; stats: GameState['stats']; node: number; day: number; abs: number; logLen: number } | null = null;

function markAction(state: GameState, kind: 'travel' | 'sleep'): void {
  pending = { kind, stats: { ...state.stats }, node: state.nodeId, day: state.day, abs: absHour(state), logLen: state.log.length };
}

const TRAVEL_TEXT: Record<string, string> = {
  day: '능선이 길게 이어졌다.', night: '어둠 속에서 발밑만 보고 걸었다.', rain: '비를 맞으며 걸었다. 바다를 지나온 비다.',
  fog: '안개 속에서 앞사람도 없는 길을 더듬었다.', snow: '무릎까지 빠지는 눈을 헤치고 왔다.',
};
const DELTA_LABEL: [keyof GameState['stats'], string][] = [['hp', '체력'], ['temp', '체온'], ['rad', '피폭'], ['hunger', '허기'], ['thirst', '갈증'], ['fatigue', '피로'], ['mind', '정신']];

function slidesAfter(refs: Refs, state: GameState): void {
  const p = pending;
  pending = null;
  if (!settings.slides || state.over !== 'none') return;
  const now = absHour(state);
  if (p) {
    const deltas = DELTA_LABEL.map(([k, label]) => {
      const d = state.stats[k] - p.stats[k];
      return [label, d, k === 'rad' ? d > 0 : d < 0] as [string, number, boolean];
    });
    const to = currentNode(state);
    if (p.kind === 'travel' && state.nodeId !== p.node) {
      const from = state.nodes[p.node];
      const hours = now - p.abs;
      const startHour = (state.hour - hours + 48) % 24;
      const cond = state.crisis && crisisActive(state) && state.crisis.kind === 'snow' ? 'snow' : state.weather === 'rain' ? 'rain' : state.weather === 'fog' ? 'fog' : isNight(state.hour) || isNight(startHour) ? 'night' : 'day';
      pushSlide(refs.top.parentElement as HTMLElement, {
        key: `travel:${cond}:${to.place}`,
        art: [`./art/travel-${cond}.webp`, './art/travel-day.webp', `./art/scene-place-${to.place}-wide.webp`, `./art/scene-${to.kind}-wide.webp`],
        title: `${from.name} → ${to.name}`,
        text: `${hours}시간. ${TRAVEL_TEXT[cond]}`,
        deltas, tone: 'travel',
      });
    } else if (p.kind === 'sleep' && now > p.abs) {
      const fire = state.fire !== null && state.fire.nodeId === to.id;
      const where = to.camp && to.campTier === 3 ? 'house' : to.camp || to.cave || hasEquip(state, 'tent') ? 'camp' : INDOOR.has(to.kind) ? 'house' : fire ? 'fire' : 'open';
      const WHERE_TEXT: Record<string, string> = { house: '벽 안쪽에서 잤다.', camp: '천막과 바위가 바람을 막았다.', fire: '불을 지키며 선잠을 잤다.', open: '바람을 등지고 웅크려 잤다.' };
      const note = state.log.slice(p.logLen).find((l) => /첫서리|첫눈|겨울이다|쇠맛|누렇|더러워진다|비를 한 번만/.test(l));
      pushSlide(refs.top.parentElement as HTMLElement, {
        key: `night:${where}`,
        art: [`./art/night-${where}.webp`, where === 'house' ? './art/camp-house.webp' : where === 'camp' ? './art/camp-tent.webp' : './art/mark-secured.webp', `./art/scene-${to.kind}-wide.webp`],
        title: state.day !== p.day ? `${state.day}일째 아침` : '잠에서 깼다',
        text: `${WHERE_TEXT[where]}${note ? ' ' + note : ''}`,
        deltas, tone: 'night',
      });
    }
  }
  const c = state.crisis;
  if (c && c.started && c.start !== lastCrisis && crisisActive(state)) {
    lastCrisis = c.start;
    const info = CRISIS_INFO[c.kind];
    pushSlide(refs.top.parentElement as HTMLElement, {
      key: `crisis:${c.kind}`,
      art: [`./art/event-crisis_${c.kind}.webp`, `./art/scene-${currentNode(state).kind}-wide.webp`],
      title: `고비 · ${info.label}`,
      text: `${info.start} ${c.end - now}시간쯤 간다. ${info.effect}.`,
      deltas: [], tone: 'crisis',
    });
  }
}

function renderPanel(refs: Refs, state: GameState, rerender: () => void): void {
  const cur = currentNode(state);
  const store = cur.camp && cur.store ? ` · 저장고: ${storeText(cur.store)}` : '';
  const sec = securingStatus(state, cur);
  const securedTxt = sec.secured ? ' · <b class="secured">안정</b>' : ` · <span class="securing">안정까지 — 둘러보기 ${sec.looked ? '✓' : '–'} · 불이나 지붕 ${sec.shelter ? '✓' : '–'} · 하룻밤 ${sec.rested ? '✓' : '–'}</span>`;
  refs.place.innerHTML =
    `<span class="kind">${KIND_LABEL[cur.kind]}</span> <span class="name">${cur.name}</span>` +
    ` <span class="alt">해발 ${Math.round(600 + cur.alt * 1300)}m · ${SIDE_LABEL[cur.side]}${INDOOR.has(cur.kind) ? ' · 지붕 있음' : cur.cave ? ' · 바위굴' : ''}${cur.windbreak ? ' · 바람막이' : ''}${cur.camp ? ` · <b>${campLabel(cur)}</b>` : ''}${cur.upgrades.length ? ' · ' + cur.upgrades.map((u) => UPGRADES[u].label).join(', ') : ''}${cur.camp && isPowered(cur) ? ' · <span class="power">⚡ 전기</span>' : ''}${store}${securedTxt}</span>`;

  refs.log.innerHTML = state.log
    .slice(-8)
    .map((t, i, arr) => `<p class="${i === arr.length - 1 ? 'latest' : ''}">${t}</p>`)
    .join('');
  refs.log.scrollTop = refs.log.scrollHeight;
  refs.log.title = '클릭하거나 L 키로 전체 기록';
  refs.log.onclick = () => showLog(refs.hud.closest('#app') as HTMLElement, state.log, () => undefined);

  refs.actions.innerHTML = '';
  refs.choices.innerHTML = '';
  refs.routes.innerHTML = '';
  // 안정까지 세 걸음
  refs.steps.innerHTML = sec.secured ? '<span class="step done">안정된 자리</span>' :
    `<span class="step${sec.looked ? ' done' : ''}">둘러보기</span><span class="step${sec.shelter ? ' done' : ''}">불이나 지붕</span><span class="step${sec.rested ? ' done' : ''}">하룻밤</span><span class="muted">→ 안정</span>`;
  // 탭
  const nbCount = neighbors(state).length;
  refs.tabs.innerHTML = TABS.map(([t, label]) => `<button data-tab="${t}" class="${t === tab ? 'on' : ''}">${uiIcon(`tab-${t}`)}${label}${t === 'go' ? ` <small>${nbCount}</small>` : t === 'body' && bodyAlert(state) ? ' <i class="dot"></i>' : t === 'pack' && state.equip.some((e) => e.broken || (condOf(e) ?? 100) <= 30) ? ' <i class="dot"></i>' : ''}</button>`).join('') + '<span class="tabhint">Tab</span>';
  refs.tabs.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab as Tab; rerender(); }));
  const dock = refs.tabs.parentElement!;
  for (const [t] of TABS) dock.classList.toggle(`show-${t}`, t === tab);
  refs.packView.innerHTML = packHtml(state);
  refs.bodyView.innerHTML = bodyHtml(state);

  // 이벤트 중에는 아래 패널을 키워 삽화가 다 보이게 한다
  refs.hud.parentElement!.classList.toggle('has-event', state.event !== null);

  if (state.event) {
    renderEvent(refs, state, rerender);
    return;
  }

  if (state.standoff) {
    refs.hud.parentElement!.classList.add('has-event');
    renderStandoff(refs, state, rerender);
    return;
  }

  if (state.over !== 'none') {
    const won = state.over === 'won';
    const ending = won && state.ending ? ENDING_INFO[state.ending] : null;
    const art = `<img class="ending-art" src="./art/ending-${ending ? state.ending : `dead-${deathArt(state)}`}.webp" alt="" onerror="this.remove()">`;
    const extra = (id: string) => `<img class="ending-art extra" src="./art/ending-${id}.webp" alt="" onerror="this.remove()">`;
    const people = won && hiddenFound(state).includes('people');
    refs.choices.innerHTML =
      `<div class="end ${won ? 'won' : 'dead'}">${art}${ending ? `<h3>${ending.title}</h3>` : ''}<p>${state.overText}</p>` +
      (people ? extra('people') : '') +
      `<p class="epilogue">${endingNotes(state).join('<br>')}</p>` +
      (ending ? `<p class="after">${ending.after}</p>` : '') +
      (afterwordEarned(state) ? `${extra('afterword')}<p class="after secret">${AFTERWORD}</p>` : '') +
      `<p class="muted">${ending ? ending.short + ' · ' : ''}기록 수첩에 적혔다. ${state.runNo}번째 여정.</p>` +
      `<button class="restart"><span class="num">1</span> 새 여정</button> <button class="book-btn"><span class="num">J</span> 기록 수첩</button></div>`;
    refs.hud.parentElement!.classList.add('has-event');
    refs.choices.querySelector('.restart')!.addEventListener('click', () => {
      location.href = location.pathname + '?new=1';
    });
    refs.choices.querySelector('.book-btn')!.addEventListener('click', () => {
      showJournal(refs.choices.closest('.game')!.parentElement as HTMLElement, loadJournal(), () => undefined);
    });
    return;
  }

  type Group = 'body' | 'fw' | 'place' | 'items';
  const cols: Record<Group, HTMLElement> = {} as Record<Group, HTMLElement>;
  for (const [g, title] of [['body', '몸'], ['fw', '불과 물'], ['place', '자리'], ['items', '물건']] as [Group, string][]) {
    const col = document.createElement('div');
    col.className = `agroup g-${g}`;
    col.innerHTML = `<h4>${title}</h4>`;
    cols[g] = col;
    refs.actions.appendChild(col);
  }
  // 아이콘 그림이 처음 열리면 한 번만 다시 그린다. 그 전에는 글자 하나로 보인다
  const iconReady = () => {
    if (iconRedraw) return;
    iconRedraw = true;
    requestAnimationFrame(() => { iconRedraw = false; rerender(); });
  };
  const act = (group: Group, icon: string, glyph: string, label: string, key: string, meta: string, fn: () => boolean, enabled = true) => {
    const b = document.createElement('button');
    b.className = 'act';
    b.disabled = !enabled;
    b.title = `${label} (${key}) · ${meta}`;
    b.innerHTML = `${iconHtml(icon, glyph, iconReady)}<span class="al"><b>${label}</b><span class="meta">${meta}</span></span><span class="key">${key}</span>`;
    b.addEventListener('click', () => {
      if (fn()) rerender();
    });
    cols[group].appendChild(b);
  };
  const wk = waterKind(state);
  const p = state.pack;
  const cap = packCap(state);
  const sleepLabel = cur.camp ? (cur.campTier === 1 ? '텐트에서 자기' : cur.campTier === 2 ? '굴에서 자기' : '거점에서 자기') : INDOOR.has(cur.kind) ? '실내에서 자기' : cur.cave ? '굴에서 자기' : hasEquip(state, 'tent') ? '텐트에서 자기' : '노숙';
  act('body', 'eat', '食', '먹기', 'E', p.food + p.fresh > 0 ? `${p.food + p.fresh}개 있음` : '먹을 것 없음', () => eat(state), canEat(state));
  act('body', 'drink', '水', '마시기', 'W', wk !== 'none' ? WATER_LABEL[wk] + (wk === 'stored' ? ` ${cur.waterLeft}회` : '') : p.water + p.dirty > 0 ? '배낭에서' : '물이 없다', () => drink(state), canDrink(state));
  act('body', 'rest', '休', '쉬기', 'R', '2시간', () => rest(state));
  act('body', 'sleep', '眠', sleepLabel, 'S', '8시간', () => { markAction(state, 'sleep'); return sleep(state); });
  act('body', 'photo', '影', '사진 보기', 'O', canLookPhoto(state) ? `단서 ${clueCount(state)}개` : '오늘은 봤다', () => lookPhoto(state), canLookPhoto(state));
  act('fw', 'fill', '汲', '물 담기', 'Q', wk === 'none' ? '물이 없다' : p.water + p.dirty >= cap.water ? '배낭이 가득' : WATER_LABEL[wk], () => fill(state), canFill(state));
  act('fw', 'wood', '木', '땔감 모으기', 'N', !WOOD_HERE(cur.kind) ? '나무가 없다' : p.wood >= cap.wood ? '배낭이 가득' : '1시간', () => gatherWood(state), canGatherWood(state));
  act('fw', 'fire', '火', hasFire(state) ? '불 타는 중' : '불 피우기', 'H', hasFire(state) ? `${state.fire!.hours}시간 남음` : p.wood <= 0 ? '땔감이 없다' : rainBlocksFire(state) ? '비 · 지붕이 필요하다' : '땔감 1 · 10시간', () => handThen('match', (sk) => lightFire(state, sk), rerender), canLightFire(state));
  act('fw', 'cook', '煮', '국 끓이기', 'A', !hasFire(state) ? '불이 필요하다' : p.water < 1 ? '깨끗한 물이 없다' : p.food + p.fresh < 1 ? '먹을 것이 없다' : '물 1 · 먹을 것 1 · 1시간', () => handThen('cook', (sk) => cook(state, sk), rerender), canCook(state));
  act('fw', 'boil', '沸', '물 끓이기', 'P', !hasFire(state) ? '불이 필요하다' : p.dirty > 0 ? `오염수 ${Math.min(2, p.dirty)}통 · 1시간` : '오염수가 없다', () => boil(state), canBoil(state));
  if (state.equip.some((e) => e.kind === 'purifier')) act('fw', 'purifier', '淨', '정수 알약', 'Y', canPurify(state) ? `오염수 ${Math.min(2, p.dirty)}통 정수` : '오염수가 없다', () => purify(state), canPurify(state));
  const hid = hiddenCount(cur);
  act('place', 'look', '見', '둘러보기', 'F', cur.looked ? `다 봤다 · 사물 ${visibleObjects(cur).filter((o) => !o.used).length}` : `1시간${hid ? ' · 뭔가 더 있을지도' : ''}`, () => lookAround(state), canLook(state));
  if (!cur.camp) {
    const tier = campTierHere(state, cur);
    if (tier !== 0) {
      const info = CAMP_TIERS[tier];
      act('place', 'camp', '營', `거점 세우기`, 'B', `${tier === 3 ? (CAMP_HOUSE_LABEL[cur.kind] ?? info.label) : info.label} · ${info.hours}시간`, () => makeCamp(state), canCamp(state));
    } else act('place', 'camp', '營', '거점 세우기', 'B', '텐트·바위굴·지붕이 필요하다', () => false, false);
  }
  if (!INDOOR.has(cur.kind) && !cur.windbreak) act('place', 'windbreak', '壁', '바람막이', 'K', p.wood >= 1 ? '땔감 1 · 1시간' : '땔감이 없다', () => buildWindbreak(state), canWindbreak(state));
  act('place', 'base', '庫', atCamp(state) ? '거점 화면' : '짐 정리', 'C', atCamp(state) ? '저장고 · 시설 · 수리' : `두고 가져가기${cur.equip.length ? ` · 둔 장비 ${cur.equip.length}` : ''}`, () => { showBase(refs.hud.closest('#app') as HTMLElement, state, rerender); return false; });
  if (state.equip.some((e) => condOf(e) !== null)) {
    const need = maintainNeed(state);
    act('place', 'maintain', '整', '정비', 'X', !cur.camp ? `거점에서만 · 최저 ${need}%` : canMaintain(state) ? `2시간 · 최저 ${need}%` : '손볼 것이 없다', () => maintain(state), canMaintain(state));
  }
  if (atCamp(state)) {
    act('place', 'deposit', '入', '맡기기', 'G', '배낭을 저장고에', () => deposit(state), Object.values(p).some((v) => v > 0));
    act('place', 'withdraw', '出', '챙기기', 'T', '저장고에서 배낭에', () => withdraw(state), !!cur.store && Object.values(cur.store).some((v) => v > 0));
  }
  if (state.equip.some((e) => e.kind === 'iodine')) act('items', 'iodine', '碘', '요오드', 'I', canTakeIodine(state) ? '피폭 -15 · 하루 한 번' : '오늘은 먹었다', () => takeIodine(state), canTakeIodine(state));
  if (state.equip.some((e) => e.kind === 'medkit')) act('items', 'medkit', '救', '응급처치', 'U', canFirstAid(state) ? '체력 +25 · 1시간' : '다친 데가 없다', () => firstAid(state), canFirstAid(state));
  if (state.equip.some((e) => e.kind === 'radio') || radioSource(state) === 'power') {
    const src = radioSource(state);
    act('items', 'radio', '波', '라디오', 'Z', src === null ? (state.equip.some((e) => e.kind === 'radio' && !e.broken) ? '건전지가 없다' : '라디오가 고장') : !canListenRadio(state) ? '방금 들었다' : src === 'power' ? '1시간 · 거점 전기' : `1시간 · 건전지 ${batteryCount(state)}`, () => listenRadio(state), canListenRadio(state));
  }
  if (cols.items.children.length === 1) cols.items.insertAdjacentHTML('beforeend', '<p class="muted">쓸 물건이 없다. 요오드·구급낭·라디오를 찾으면 여기 생긴다.</p>');

  neighbors(state).forEach((n, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'route';
    const btn = document.createElement('button');
    const hours = travelHours(state, cur, n);
    const dir = n.stage < cur.stage ? '남쪽으로' : n.alt > cur.alt + 0.1 ? '오르막' : n.alt < cur.alt - 0.1 ? '내리막' : '능선길';
    const risk = state.wind !== 'calm' && n.side === state.wind ? ' · 바람받이' : '';
    const walked = !!state.known[edgeKey(cur.id, n.id)];
    const mine = myRibbon(state, cur, n);
    const known = walked ? ' · 아는 길' : mine ? ` · <b class="ribbon mine" title="지난 여정에 내가 묶은 리본. 아는 길처럼 걷는다">${uiIcon('ribbon-mine')}내 리본</b>` : ridgeRibbon(cur, n) ? ` · <span class="ribbon" title="마루금의 옛 산악회 리본. 길을 잃지 않는다">${uiIcon('ribbon-ridge')}마루금 리본</span>` : '';
    const rk = routeRisk(state, n);
    const block = travelBlock(state, n);
    const riskTxt = `<span class="risk ${rk.level}">${rk.level === 'high' ? '위험 높음' : rk.level === 'mid' ? '위험 보통' : '위험 낮음'}${rk.why.length ? ' · ' + rk.why.join(', ') : ''}</span>${block ? `<span class="block">${block.replace('위험 높음 · ', '')}</span>` : ''}`;
    const objs = visibleObjects(n).filter((o) => !o.used).length;
    const water = n.waterLeft !== 0 || n.kind === 'spring' || n.kind === 'valley' || n.kind === 'temple' || n.kind === 'village';
    const info = n.visited
      ? ` · 사물 ${objs}${water ? ' · 물' : ''}${n.camp ? ` · ${campLabel(n)}` : ''}${n.cave && !n.camp ? ' · 바위굴' : ''}${n.equip.length ? ` · 둔 장비 ${n.equip.length}` : ''}${n.secured ? ' · 안정' : ''}`
      : n.scouted ? ` · 정찰함 · 사물 ${objs}${water ? ' · 물' : ''}`
      : state.knownStages.includes(n.stage) ? ' · 기억나는 곳' : ' · 미탐사';
    const mark = state.marked.includes(n.place) && !n.visited ? ' · <b class="mark">흔적 ?</b>' : '';
    btn.className = `go${n.stage < cur.stage ? ' back' : ''}`;
    btn.disabled = !!block;
    btn.innerHTML = `<span class="num">${i + 1}</span> <span class="to">${n.name}</span> <span class="meta">${KIND_LABEL[n.kind]} · ${dir} · 약 ${hours}시간${known}${risk}${info}${mark}</span><span class="meta">${riskTxt}</span>`;
    btn.addEventListener('click', () => {
      markAction(state, 'travel');
      if (travelTo(state, n.id)) rerender();
    });
    wrap.appendChild(btn);
    if (!n.visited && !n.scouted) {
      const sc = document.createElement('button');
      sc.className = 'scout';
      const why = scoutBlock(state, n);
      const ok = canScout(state, n.id);
      sc.disabled = !ok;
      sc.innerHTML = `<span class="num">⇧${i + 1}</span> 정찰<span class="meta">${scoutHours(state, n)}시간 · ${ok ? '보고 돌아온다' : (why ?? '지금은 안 된다')}</span>`;
      sc.addEventListener('click', () => {
        if (scout(state, n.id)) rerender();
      });
      wrap.appendChild(sc);
    }
    refs.routes.appendChild(wrap);
  });
}

// 이벤트 화면. 본문과 선택지, 선택 뒤에는 결과와 확인 버튼
function renderEvent(refs: Refs, state: GameState, rerender: () => void): void {
  const ev = state.event && eventById(state.event.id);
  if (!ev || !state.event) return;
  const box = document.createElement('div');
  box.className = 'event appear';
  // public/art/event-<id>.png 가 있으면 본문 위에 삽화가 뜬다. 없으면 조용히 사라진다
  // 사물 이벤트는 띠 그림 대신 그 사물의 그림(obj-<종류>)을 본문 옆에 작게 둔다
  const art = ev.trigger === 'object'
    ? `<img class="event-obj" src="./art/obj-${ev.id.slice(4)}.webp" alt="" onerror="this.remove()">`
    : `<img class="event-art" src="./art/event-${ev.art ?? ev.id}.webp" alt="" data-fallback="./art/event-${ev.art ?? ev.id}.png" onerror="if(this.dataset.fallback){this.src=this.dataset.fallback;delete this.dataset.fallback}else{this.remove()}">`;
  if (state.event.result === null) {
    box.innerHTML = `${art}<h3>${ev.title}</h3><p>${fillName(ev.text, state, currentNode(state))}</p>`;
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
    box.innerHTML = `${art}<h3>${ev.title}</h3><p class="result">${state.event.result}</p>`;
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

// 지도 옆 목록. 거점과 저장고, 흔적이 있을 법한 곳, 둔 물건, 지난 여정이 끝난 자리. 여기서 몇 시간인지도
let sideCollapsed = false;
function renderMapSide(refs: Refs, state: GameState): void {
  refs.mapSide.classList.toggle('collapsed', sideCollapsed);
  if (sideCollapsed) {
    refs.mapSide.innerHTML = '<button class="side-toggle">목록 ◂</button>';
    refs.mapSide.querySelector('.side-toggle')!.addEventListener('click', () => { sideCollapsed = false; window.dispatchEvent(new Event('marugeum:side')); });
    return;
  }
  const far = (n: MapNode): string => { const h = hoursTo(state, n.id); return h === null ? '' : h === 0 ? '여기' : `약 ${h}시간`; };
  const camps = state.nodes.filter((n) => n.camp);
  const marks = state.marked.map((id) => state.nodes.find((n) => n.place === id)).filter((n): n is MapNode => !!n && !n.visited);
  const stash = state.nodes.filter((n) => !n.camp && n.equip.length > 0);
  const dead = state.deadAt.map((id) => state.nodes.find((n) => n.place === id)).filter((n): n is MapNode => !!n);
  const row = (n: MapNode, body: string) => `<li><b>${n.name}</b> <span class="muted">${far(n)}</span><br><span class="muted">${body}</span></li>`;
  refs.mapSide.innerHTML =
    `<button class="side-toggle">접기 ▸</button><h4>거점 <span class="muted">${camps.length}</span></h4><ul>${camps.map((n) => row(n, `${campLabel(n)} · ${n.store ? storeText(n.store) : ''}${n.equip.length ? ` · 장비 ${n.equip.length}` : ''}`)).join('')}</ul>` +
    (marks.length ? `<h4>흔적이 있을 법한 곳</h4><ul>${marks.map((n) => row(n, `${REGION_OF(n)} · ${KIND_LABEL[n.kind]}`)).join('')}</ul>` : '') +
    (stash.length ? `<h4>둔 물건</h4><ul>${stash.map((n) => row(n, n.equip.map((e) => equipLabel(e)).join(', '))).join('')}</ul>` : '') +
    (dead.length ? `<h4>지난 여정이 끝난 자리</h4><ul>${dead.map((n) => row(n, REGION_OF(n))).join('')}</ul>` : '') +
    `<p class="muted">자리를 가리키면 아는 만큼 보인다. 노란 테두리는 지금 갈 수 있는 곳.</p>`;
  refs.mapSide.querySelector('.side-toggle')!.addEventListener('click', () => { sideCollapsed = true; window.dispatchEvent(new Event('marugeum:side')); });
}

// 대치 화면. 상대의 기세와 거리, 수마다 확률
function renderStandoff(refs: Refs, state: GameState, rerender: () => void): void {
  const s = state.standoff!;
  const info = STANDOFF_INFO[s.kind];
  const box = document.createElement('div');
  box.className = 'event standoff appear';
  const dist = ['코앞', '가까움', '멀다'][s.distance];
  const threatPct = Math.max(0, Math.min(100, s.threat));
  box.innerHTML =
    `<h3>대치 · ${info.name}</h3>` +
    `<div class="so-status"><span>기세</span><i class="so-bar"><i style="width:${threatPct}%"></i></i><span class="muted">${Math.round(threatPct)}</span><span class="so-dist">거리 ${dist}</span><span class="so-round">${s.round}수</span></div>` +
    `<div class="so-log">${s.log.slice(-4).map((l, i, a) => `<p class="${i === a.length - 1 ? 'latest' : ''}">${l}</p>`).join('')}</div>`;
  if (s.done) {
    const b = document.createElement('button');
    b.className = 'ok';
    b.innerHTML = `<span class="num">1</span> 계속`;
    b.addEventListener('click', () => { if (standoffClose(state)) rerender(); });
    box.appendChild(b);
  } else {
    const list = document.createElement('div');
    list.className = 'event-choices';
    const acts: StandoffAction[] = ['threaten', 'retreat', 'throw', 'fight'];
    const hints: Record<StandoffAction, string> = {
      threaten: s.kind === 'deserter' ? '말로 밀어붙인다' : '소리치고 팔을 휘두른다',
      retreat: '눈을 떼지 않고 물러선다. 멀어지면 끝',
      throw: info.throwItem === 'food' ? (s.kind === 'deserter' ? '먹을 것 1을 주고 끝낸다' : '먹을 것 1을 던진다') : '땔감 1을 던진다. 불붙은 가지면 더 세다',
      fight: s.kind === 'boar' ? '두 번 맞히면 고기' : s.kind === 'dogs' ? '앞장선 놈을 친다' : '총을 쳐 낸다',
    };
    acts.forEach((a, i) => {
      const b = document.createElement('button');
      const enabled = a !== 'throw' || canThrow(state);
      b.disabled = !enabled;
      const odds = Math.round(standoffOdds(state, a) * 100);
      b.innerHTML = `<span class="num">${i + 1}</span> <span class="to">${STANDOFF_ACTION_LABEL[a]}</span><span class="meta">${enabled ? `${odds}% · ` : '던질 것이 없다 · '}${hints[a]}</span>`;
      b.addEventListener('click', () => { if (standoffMove(state, a)) rerender(); });
      list.appendChild(b);
    });
    box.appendChild(list);
  }
  refs.choices.appendChild(box);
}
