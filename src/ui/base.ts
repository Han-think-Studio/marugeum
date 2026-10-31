import { EQUIP_INFO, SUPPLY_KEYS, SUPPLY_LABEL, type GameState } from '../core/types';
import {
  canCarry, currentNode, equipLabel, heavyCarried, moveEquip, moveSupply, packCap, repair, repairChance, timeLabel,
} from '../game/state';
import { audio } from '../audio/engine';

// 거점 화면. 저장고와 배낭 사이 옮기기, 장비 상태와 수리. 시설 작동은 다음 단계
export function showBase(root: HTMLElement, state: GameState, rerender: () => void): HTMLElement {
  const old = root.querySelector('.overlay.base');
  if (old) old.remove();
  const node = currentNode(state);
  const el = document.createElement('div');
  el.className = 'overlay base';
  const draw = () => {
    const st = node.store!;
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
        <td class="k">${SUPPLY_LABEL[k]}</td>
        <td class="n">${st[k]}</td>
        <td class="btns"><button data-mv="toPack" data-k="${k}" ${st[k] <= 0 ? 'disabled' : ''}>◀ 챙기기</button><button data-mv="toBase" data-k="${k}" ${p[k] <= 0 ? 'disabled' : ''}>맡기기 ▶</button></td>
        <td class="n">${p[k]} <span class="muted">${capOf(k)}</span></td>
      </tr>`).join('');
    const chance = Math.round(repairChance(state) * 100);
    const partsHere = p.parts + st.parts;
    const equipRow = (e: { kind: string; broken: boolean }, i: number, where: 'pack' | 'base') => {
      const info = EQUIP_INFO[e.kind as keyof typeof EQUIP_INFO];
      const canTake = where === 'base' ? canCarry(state, e.kind as never) : true;
      return `<li class="${e.broken ? 'broken' : ''}">
        <span class="name">${equipLabel(e as never)}${info.heavy ? ' <span class="muted">무거움</span>' : ''}</span>
        <span class="desc muted">${info.desc}</span>
        <span class="ops">
          ${e.broken ? `<button data-rep="${where}" data-i="${i}" ${partsHere <= 0 ? 'disabled' : ''}>수리 ${chance}% · 부품 1 · 2시간</button>` : ''}
          ${where === 'pack' ? `<button data-eq="toBase" data-i="${i}">거점에 두기</button>` : `<button data-eq="toPack" data-i="${i}" ${canTake ? '' : 'disabled'}>가져가기${canTake ? '' : ' (무거운 장비 한도)'}</button>`}
        </span></li>`;
    };
    el.innerHTML = `
      <div class="card wide">
        <div class="head"><h2>거점 · ${node.name}</h2><span class="muted">${timeLabel(state)}</span><button class="close"><span class="num">Esc</span> 조사 나가기</button></div>
        <div class="cols">
          <section>
            <h3>저장고 ↔ 배낭</h3>
            <table class="store"><thead><tr><th></th><th>저장고</th><th></th><th>배낭</th></tr></thead><tbody>${rows}</tbody></table>
            <p class="muted">무거운 장비 ${heavyCarried(state)}/2 지고 있음. 시설 작동(발전기, 냉장고, 난로, 라디오)은 다음 단계에서 열린다.</p>
          </section>
          <section>
            <h3>거점 장비 <span class="muted">${node.equip.length}</span></h3>
            ${node.equip.length ? `<ul class="equip">${node.equip.map((e, i) => equipRow(e, i, 'base')).join('')}</ul>` : '<p class="muted">아직 둔 장비가 없다.</p>'}
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
