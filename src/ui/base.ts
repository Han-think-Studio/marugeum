import { EQUIP_INFO, SUPPLY_KEYS, SUPPLY_LABEL, UPGRADES, UPGRADE_IDS, WINDBREAK, type GameState } from '../core/types';
import {
  build, buildWindbreak, canBuild, canWindbreak,
  canCarry, canDepart, currentNode, dailyUse, depart, equipLabel, facilityOk, facilityRunning, generatorHoursLeft, hasGenerator,
  heaterHoursLeft, heavyCarried, isPowered, moveEquip, moveSupply, packCap, repair, repairChance, storeText, timeLabel,
  toggleGenerator, toggleHeater,
} from '../game/state';
import { audio } from '../audio/engine';

// 거점 화면. 거점이면 저장고와 시설까지, 아니면 짐 정리(두고 가기·가져가기·수리)만
export function showBase(root: HTMLElement, state: GameState, rerender: () => void): HTMLElement {
  const old = root.querySelector('.overlay.base');
  if (old) old.remove();
  const node = currentNode(state);
  const el = document.createElement('div');
  el.className = 'overlay base';
  let armed = false;
  const draw = () => {
    const camp = node.camp && node.store !== null;
    const st = node.store ?? { water: 0, dirty: 0, food: 0, fresh: 0, wood: 0, gasoline: 0, diesel: 0, parts: 0 };
    const p = state.pack;
    const cap = packCap(state);
    const capOf = (k: string): string => {
      if (k === 'water' || k === 'dirty') return `${p.water + p.dirty}/${cap.water}`;
      if (k === 'food' || k === 'fresh') return `${p.food + p.fresh}/${cap.food}`;
      if (k === 'wood') return `${p.wood}/${cap.wood}`;
      if (k === 'gasoline' || k === 'diesel') return `${p.gasoline + p.diesel}/${cap.fuel}`;
      return `${p.parts}/${cap.parts}`;
    };
    const rows = SUPPLY_KEYS.map((k) => `
      <tr>
        <td class="k"><img class="sicon" src="./art/supply-${k}.webp" alt="" onerror="this.remove()">${SUPPLY_LABEL[k]}</td>
        <td class="n">${st[k]}</td>
        <td class="btns"><button data-mv="toPack" data-k="${k}" ${st[k] <= 0 ? 'disabled' : ''}>◀ 챙기기</button><button data-mv="toBase" data-k="${k}" ${p[k] <= 0 ? 'disabled' : ''}>맡기기 ▶</button></td>
        <td class="n">${p[k]} <span class="muted">${capOf(k)}</span></td>
      </tr>`).join('');
    const chance = Math.round(repairChance(state) * 100);
    const card = (img: string, label: string, desc: string, cost: string, built: boolean, btn: string) => `
      <div class="ucard ${built ? 'built' : ''}">
        <img src="./art/upgrade-${img}.webp" alt="" onerror="this.remove()">
        <div class="ubody"><b>${label}</b><span class="muted">${desc}</span><span class="cost">${built ? '지었다' : cost}</span>${btn}</div>
      </div>`;
    const upgrades = (): string => `<div class="ucards">${UPGRADE_IDS.map((id) => {
      const u = UPGRADES[id];
      const built = node.upgrades.includes(id);
      const cost = [u.wood ? `땔감 ${u.wood}` : '', u.parts ? `부품 ${u.parts}` : '', `${u.hours}시간`].filter(Boolean).join(' · ');
      return card(id, u.label, u.desc, cost, built, built ? '' : `<button data-build="${id}" ${canBuild(state, id) ? '' : 'disabled'}>짓기</button>`);
    }).join('')}</div>`;
    const windbreakCard = (): string => {
      if (node.kind === 'start' || ['temple', 'shelter', 'village', 'military'].includes(node.kind)) return '<p class="muted">지붕이 있는 곳이라 바람막이는 필요 없다.</p>';
      return `<div class="ucards">${card('windbreak', WINDBREAK.label, WINDBREAK.desc, `땔감 ${WINDBREAK.wood} · ${WINDBREAK.hours}시간`, node.windbreak, node.windbreak ? '' : `<button data-windbreak="1" ${canWindbreak(state) ? '' : 'disabled'}>쌓기</button>`)}</div>`;
    };
    const facilities = (): string => {
      const powered = isPowered(node);
      const lines: string[] = [];
      if (hasGenerator(node)) {
        const left = generatorHoursLeft(node);
        lines.push(`<li><span class="name">발전기</span><span class="desc muted">${node.genOn ? (powered ? `돌아가는 중 · 연료 ${left}시간분` : '연료 없음') : (left > 0 ? `꺼짐 · 연료 ${left}시간분` : '꺼짐 · 연료 없음')}</span><span class="ops"><button data-fac="gen">${node.genOn ? '끄기' : '켜기'}</button></span></li>`);
      } else lines.push('<li><span class="name muted">발전기 없음</span><span class="desc muted">휘발유 발전기나 경유 발전기를 거점에 두면 전기가 생긴다</span></li>');
      const dep = (kind: 'fridge' | 'lamp' | 'radio', what: string) => {
        if (!facilityOk(node, kind)) return '';
        const on = facilityRunning(node, kind);
        return `<li><span class="name">${EQUIP_INFO[kind].label}</span><span class="desc ${on ? '' : 'muted'}">${on ? what : '전기가 없다'}</span></li>`;
      };
      lines.push(dep('fridge', '냉장 중. 신선식이 상하지 않는다'));
      lines.push(dep('lamp', '불이 켜져 있다. 밤이 덜 위험하다'));
      lines.push(dep('radio', '켜져 있다. 밤에 소식이 들릴 수 있다'));
      if (facilityOk(node, 'heater')) {
        const left = heaterHoursLeft(node);
        lines.push(`<li><span class="name">경유 난로</span><span class="desc muted">${node.heaterOn ? `타는 중 · 경유 ${left}시간분` : (left > 0 ? `꺼짐 · 경유 ${left}시간분` : '꺼짐 · 경유 없음')}</span><span class="ops"><button data-fac="heater">${node.heaterOn ? '끄기' : '켜기'}</button></span></li>`);
      }
      const use = dailyUse(node);
      return `<ul class="equip">${lines.join('')}</ul>${use.length ? `<p class="muted">${use.join(' · ')}</p>` : ''}`;
    };
    const partsHere = p.parts + st.parts;
    const equipRow = (e: { kind: string; broken: boolean }, i: number, where: 'pack' | 'base') => {
      const info = EQUIP_INFO[e.kind as keyof typeof EQUIP_INFO];
      const canTake = where === 'base' ? canCarry(state, e.kind as never) : true;
      return `<li class="${e.broken ? 'broken' : ''}">
        <span class="icon"><img src="./art/equip-${e.kind}.webp" alt="" onerror="this.parentElement.remove()">${e.broken ? '<b class="badge">고장</b>' : ''}</span>
        <span class="name">${equipLabel(e as never)}${info.heavy ? ' <span class="muted">무거움</span>' : ''}</span>
        <span class="desc muted">${info.desc}</span>
        <span class="ops">
          ${e.broken ? `<button data-rep="${where}" data-i="${i}" ${partsHere <= 0 ? 'disabled' : ''}>수리 ${chance}% · 부품 1 · 2시간</button>` : ''}
          ${where === 'pack' ? `<button data-eq="toBase" data-i="${i}">${node.camp ? '거점에 두기' : '여기 두기'}</button>` : `<button data-eq="toPack" data-i="${i}" ${canTake ? '' : 'disabled'}>가져가기${canTake ? '' : ' (무거운 장비 한도)'}</button>`}
        </span></li>`;
    };
    el.innerHTML = `
      <div class="card wide">
        <div class="head"><h2>${camp ? '거점' : '짐 정리'} · ${node.name}</h2><span class="muted">${timeLabel(state)}</span><button class="close"><span class="num">Esc</span> ${camp ? '조사 나가기' : '닫기'}</button></div>
        <div class="cols">
          <section>
            ${camp ? `<h3>저장고 ↔ 배낭</h3>
            <table class="store"><thead><tr><th></th><th>저장고</th><th></th><th>배낭</th></tr></thead><tbody>${rows}</tbody></table>` : `<h3>배낭</h3><p>${SUPPLY_KEYS.filter((k) => p[k] > 0).map((k) => `${SUPPLY_LABEL[k]} ${p[k]}`).join(' · ') || '비었다'}</p>`}
            <p class="muted">무거운 장비 ${heavyCarried(state)}/2 지고 있음. 수리 성공 ${chance}% · 부품 ${partsHere}개.</p>
            ${camp ? `<h3>시설</h3>${facilities()}<h3>보강</h3>${upgrades()}` : `<p class="muted">거점이 아니라 저장고와 시설은 없다. 장비를 여기 두면 나중에 가지러 올 수 있다.</p><h3>안식처</h3>${windbreakCard()}`}
            ${canDepart(state) ? `<h3>떠나기</h3>
            <p class="muted">배낭에 든 것만 가져간다: ${storeText(p)}. 무거운 장비 ${heavyCarried(state)}/2. 발전기와 냉장고는 두고 간다. 돌아올 수는 있다.</p>
            <button class="depart ${armed ? 'armed' : ''}" data-depart="1">${armed ? '정말 떠난다. 능선을 따라 북쪽으로' : '북쪽으로 떠난다'}</button>` : ''}
          </section>
          <section>
            <h3>${camp ? '거점 장비' : '여기 둔 장비'} <span class="muted">${node.equip.length}</span></h3>
            ${node.equip.length ? `<ul class="equip">${node.equip.map((e, i) => equipRow(e, i, 'base')).join('')}</ul>` : '<p class="muted">둔 장비가 없다.</p>'}
            <h3>지닌 장비 <span class="muted">${state.equip.length}</span></h3>
            ${state.equip.length ? `<ul class="equip">${state.equip.map((e, i) => equipRow(e, i, 'pack')).join('')}</ul>` : '<p class="muted">지닌 장비가 없다.</p>'}
          </section>
        </div>
      </div>`;
  };
  const close = () => {
    el.remove();
    window.removeEventListener('keydown', key, true);
    rerender();
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key.toLowerCase() === 'c') {
      e.stopPropagation();
      close();
    }
  };
  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
    if (!b) return;
    if (b.classList.contains('close')) { close(); return; }
    let changed = false;
    if (b.dataset.mv) changed = moveSupply(state, b.dataset.k as never, b.dataset.mv as 'toBase' | 'toPack', e.shiftKey ? 0 : 1);
    else if (b.dataset.eq) changed = moveEquip(state, b.dataset.eq as 'toBase' | 'toPack', Number(b.dataset.i));
    else if (b.dataset.rep) changed = repair(state, b.dataset.rep as 'pack' | 'base', Number(b.dataset.i));
    else if (b.dataset.build) changed = build(state, b.dataset.build as never);
    else if (b.dataset.windbreak) changed = buildWindbreak(state);
    else if (b.dataset.fac === 'gen') changed = toggleGenerator(state, node);
    else if (b.dataset.fac === 'heater') changed = toggleHeater(state, node);
    else if (b.dataset.depart) {
      if (!armed) { armed = true; draw(); return; }
      if (depart(state)) { audio.sfx('step'); close(); }
      return;
    }
    if (changed) {
      audio.sfx('click');
      if (state.over !== 'none') { close(); return; }
      draw();
    }
  });
  window.addEventListener('keydown', key, true);
  draw();
  root.appendChild(el);
  return el;
}
