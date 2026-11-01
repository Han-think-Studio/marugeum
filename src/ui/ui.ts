import { CAMP_HOUSE_LABEL, CAMP_TIERS, ENDING_INFO, INDOOR, KIND_LABEL, SIDE_LABEL, STANDOFF_ACTION_LABEL, STANDOFF_INFO, UPGRADES, WOOD_NODES, type GameState, type MapNode, type SceneObject, type StandoffAction } from '../core/types';
import { drawMap, hitTest, makeView, type View } from '../map/render';
import { REGIONS } from '../map/generate';
const REGION_OF = (n: MapNode): string => REGIONS[n.stage] ?? '';
import {
  WATER_LABEL, atCamp, boil, buildWindbreak, campLabel, campTierHere, canBoil, canCamp, canDrink, canEat, canFill, canGatherWood, canLightFire, canLook, canLookPhoto, canWindbreak, clueCount, lookPhoto,
  currentNode, deposit, dismissEvent, drink, eat, fill, gatherWood, gearList, hasEquip, hasFire, hiddenCount, inspectObject,
  isKnown, lightFire, lookAround, makeCamp, isPowered, neighbors, packCap, packWeight, pickChoice, rainBlocksFire, rest, sleep, timeLabel,
  canThrow, routeRisk, standoffClose, standoffMove, standoffOdds, weightPenalty,
  canScout, scout, scoutBlock, scoutHours, securingStatus, travelBlock, endingNotes, hoursTo, equipLabel,
  canFirstAid, canPurify, canTakeIodine, firstAid, purify, takeIodine, weightLimit,
  travelHours, travelTo, visibleObjects, waterKind, withdraw,
} from '../game/state';
import { showBase } from './base';
import { drawBuilt, drawObjects, drawScene, hitObject } from './scene';
import { storeText } from '../game/state';
import { eventById, fillName, meetsReq } from '../game/events';
import { loadJournal, recordRun } from '../game/journal';
import { clearSave, saveGame } from '../game/save';
import { showJournal, showLog, showMenu, showSettings } from './screens';
import { toggleFullscreen } from './fullscreen';
import { settings } from '../game/settings';
import { audio } from '../audio/engine';
import { sceneTargets } from '../audio/scene';
import { radPerHour } from '../game/survival';
import { daylightLeft, envTemp, forecastText, weatherText } from '../game/weather';

interface Refs {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  hud: HTMLElement;
  place: HTMLElement;
  log: HTMLElement;
  choices: HTMLElement;
  actions: HTMLElement;
  mapSide: HTMLElement;
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
    mapSide: root.querySelector('.map-side')!,
  };

  let view: View = makeView(1, 1);
  let hover: MapNode | null = null;
  let hoverObj: SceneObject | null = null;

  // 위쪽 큰 화면. 장면이 기본이고 지도는 전환해서 본다. 비·불·별·사물 표식이 있을 때는 느리게 움직인다
  let animating = false;
  const paintTop = () => {
    refs.mapSide.style.display = state.view === 'map' ? '' : 'none';
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
      if (n && travelTo(state, n.id)) render();
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
      if (target && travelTo(state, target.id)) render();
      return;
    }
    const map: Record<string, () => boolean> = {
      r: () => rest(state), s: () => sleep(state), w: () => drink(state), q: () => fill(state),
      e: () => eat(state), f: () => lookAround(state), b: () => makeCamp(state), g: () => deposit(state), t: () => withdraw(state),
      n: () => gatherWood(state), h: () => lightFire(state), p: () => boil(state),
      c: () => { showBase(root, state, render); return false; },
      k: () => buildWindbreak(state),
      o: () => lookPhoto(state),
      i: () => takeIodine(state),
      u: () => firstAid(state),
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

function renderHud(refs: Refs, state: GameState): void {
  const chips = Object.entries(state.stats)
    .map(([k, v]) => {
      const warn = k === 'rad' ? v >= 40 : v <= 35;
      const bad = k === 'rad' ? v >= 60 : v <= 15;
      const fill = k === 'rad' ? v : v;
      return `<span class="stat${bad ? ' bad' : warn ? ' warn' : ''}${k === 'rad' ? ' rad' : ''}" title="${STAT_LABEL[k]} ${Math.round(v)}"><b>${STAT_LABEL[k]}</b><i><i style="width:${Math.round(fill)}%"></i></i><small>${Math.round(v)}</small></span>`;
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
    `<span class="weather">${weatherText(state)} · 체감 ${t}°${geiger}</span>` +
    `<span class="forecast" title="하늘을 읽은 예보">${daylightLeft(state.hour) > 0 ? `해 ${daylightLeft(state.hour)}시간` : '밤'} · ${forecastText(state)}</span>${chips}`;
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
    const art = ending ? `<img class="ending-art" src="./art/ending-${state.ending}.webp" alt="" onerror="this.remove()">` : '';
    refs.choices.innerHTML =
      `<div class="end ${won ? 'won' : 'dead'}">${art}${ending ? `<h3>${ending.title}</h3>` : ''}<p>${state.overText}</p>` +
      `<p class="epilogue">${endingNotes(state).join('<br>')}</p>` +
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
  act('사진 보기', 'O', canLookPhoto(state) ? `단서 ${clueCount(state)}개` : '오늘은 봤다', () => lookPhoto(state), canLookPhoto(state));
  act('쉬기', 'R', '2시간', () => rest(state));
  act(cur.camp ? (cur.campTier === 1 ? '텐트에서 자기' : cur.campTier === 2 ? '굴에서 자기' : '거점에서 자기') : INDOOR.has(cur.kind) ? '실내에서 자기' : cur.cave ? '굴에서 자기' : hasEquip(state, 'tent') ? '텐트에서 자기' : '노숙', 'S', '8시간', () => sleep(state));
  act('마시기', 'W', wk !== 'none' ? WATER_LABEL[wk] + (wk === 'stored' ? ` ${cur.waterLeft}회` : '') : p.water + p.dirty > 0 ? '배낭에서' : '물이 없다', () => drink(state), canDrink(state));
  act('물 담기', 'Q', wk === 'none' ? '물이 없다' : p.water + p.dirty >= cap.water ? '배낭이 가득' : WATER_LABEL[wk], () => fill(state), canFill(state));
  act('먹기', 'E', p.food + p.fresh > 0 ? `${p.food + p.fresh}개 있음` : '먹을 것 없음', () => eat(state), canEat(state));
  const hid = hiddenCount(cur);
  act('둘러보기', 'F', cur.looked ? `다 봤다 · 사물 ${visibleObjects(cur).filter((o) => !o.used).length}` : `1시간${hid ? ' · 뭔가 더 있을지도' : ''}`, () => lookAround(state), canLook(state));
  act('땔감 모으기', 'N', !WOOD_HERE(cur.kind) ? '나무가 없다' : p.wood >= cap.wood ? '배낭이 가득' : '1시간', () => gatherWood(state), canGatherWood(state));
  act(hasFire(state) ? '불 타는 중' : '불 피우기', 'H', hasFire(state) ? `${state.fire!.hours}시간 남음` : p.wood <= 0 ? '땔감이 없다' : rainBlocksFire(state) ? '비 · 지붕이 필요하다' : '땔감 1개 · 10시간', () => lightFire(state), canLightFire(state));
  act('물 끓이기', 'P', !hasFire(state) ? '불이 필요하다' : p.dirty > 0 ? `오염수 ${Math.min(2, p.dirty)}통 · 1시간` : '오염수가 없다', () => boil(state), canBoil(state));
  if (state.equip.some((e) => e.kind === 'iodine')) act('요오드 먹기', 'I', canTakeIodine(state) ? '피폭 -15 · 하루 한 번' : '오늘은 먹었다', () => takeIodine(state), canTakeIodine(state));
  if (state.equip.some((e) => e.kind === 'medkit')) act('응급처치', 'U', canFirstAid(state) ? '체력 +25 · 1시간' : '다친 데가 없다', () => firstAid(state), canFirstAid(state));
  if (state.equip.some((e) => e.kind === 'purifier')) act('정수 알약', 'Y', canPurify(state) ? `오염수 ${Math.min(2, p.dirty)}통 정수` : '오염수가 없다', () => purify(state), canPurify(state));
  if (!cur.camp) {
    const tier = campTierHere(state, cur);
    if (tier !== 0) {
      const info = CAMP_TIERS[tier];
      act(`거점 세우기 · ${tier === 3 ? (CAMP_HOUSE_LABEL[cur.kind] ?? info.label) : info.label}`, 'B', `${info.hours}시간 · 저장고 ${info.storeCap}`, () => makeCamp(state), canCamp(state));
    } else act('거점 세우기', 'B', '텐트나 바위굴, 지붕이 필요하다', () => false, false);
  }
  if (!INDOOR.has(cur.kind) && !cur.windbreak) act('바람막이 쌓기', 'K', p.wood >= 1 ? '땔감 1 · 1시간' : '땔감이 없다', () => buildWindbreak(state), canWindbreak(state));
  act(atCamp(state) ? '거점 화면' : '짐 정리', 'C', atCamp(state) ? '저장고 · 시설 · 장비 · 수리' : `장비 두고 가져가기 · 수리${cur.equip.length ? ` · 여기 둔 장비 ${cur.equip.length}` : ''}`, () => { showBase(refs.hud.closest('#app') as HTMLElement, state, rerender); return false; });
  if (atCamp(state)) {
    act('맡기기', 'G', '배낭을 저장고에', () => deposit(state), Object.values(p).some((v) => v > 0));
    act('챙기기', 'T', '저장고에서 배낭에', () => withdraw(state), !!cur.store && Object.values(cur.store).some((v) => v > 0));
  }

  neighbors(state).forEach((n, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'route';
    const btn = document.createElement('button');
    const hours = travelHours(state, cur, n);
    const dir = n.stage < cur.stage ? '남쪽으로' : n.alt > cur.alt + 0.1 ? '오르막' : n.alt < cur.alt - 0.1 ? '내리막' : '능선길';
    const risk = state.wind !== 'calm' && n.side === state.wind ? ' · 바람받이' : '';
    const known = isKnown(state, cur, n) ? ' · 아는 길' : '';
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
    refs.choices.appendChild(wrap);
  });
}

// 이벤트 화면. 본문과 선택지, 선택 뒤에는 결과와 확인 버튼
function renderEvent(refs: Refs, state: GameState, rerender: () => void): void {
  const ev = state.event && eventById(state.event.id);
  if (!ev || !state.event) return;
  const box = document.createElement('div');
  box.className = 'event appear';
  // public/art/event-<id>.png 가 있으면 본문 위에 삽화가 뜬다. 없으면 조용히 사라진다
  const art = `<img class="event-art" src="./art/event-${ev.id}.webp" alt="" data-fallback="./art/event-${ev.id}.png" onerror="if(this.dataset.fallback){this.src=this.dataset.fallback;delete this.dataset.fallback}else{this.remove()}">`;
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
    refs.mapSide.querySelector('.side-toggle')!.addEventListener('click', () => { sideCollapsed = false; renderMapSide(refs, state); });
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
  refs.mapSide.querySelector('.side-toggle')!.addEventListener('click', () => { sideCollapsed = true; renderMapSide(refs, state); });
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
