import type { Journal } from '../core/types';
import { eventTitle, lessons, regionName } from '../game/journal';
import { REGIONS } from '../map/generate';
import { audio } from '../audio/engine';

// 제목 화면, 기록 수첩, 메뉴. 전부 게임 위에 얹는 덮개다

export interface TitleOpts {
  journal: Journal;
  resume: { day: number; place: string } | null;
  onResume: () => void;
  onNew: () => void;
  onJournal: () => void;
}

export function showTitle(root: HTMLElement, o: TitleOpts): HTMLElement {
  const won = o.journal.runs.filter((r) => r.over === 'won').length;
  const el = document.createElement('div');
  el.className = 'overlay title';
  // public/art/title.png 가 있으면 제목 화면 배경이 된다
  const bg = new Image();
  bg.onload = () => {
    el.style.backgroundImage = `linear-gradient(rgba(6,9,13,0.55), rgba(6,9,13,0.85)), url(./art/title.png)`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
  };
  bg.src = './art/title.png';
  el.innerHTML = `
    <div class="card">
      <h1>마루금</h1>
      <p class="sub">백두대간 생존기</p>
      <p class="intro">바다는 죽었고 낮은 땅은 비에 젖으면 위험하다.<br>지리산에서 향로봉까지, 능선을 따라 북쪽으로.</p>
      <div class="menu">
        ${o.resume ? `<button class="primary resume"><span class="num">1</span> 이어하기 <span class="meta">${o.resume.day}일째 · ${o.resume.place}</span></button>` : ''}
        <button class="${o.resume ? '' : 'primary '}new"><span class="num">${o.resume ? 2 : 1}</span> 새 여정</button>
        <button class="journal"><span class="num">${o.resume ? 3 : 2}</span> 기록 수첩</button>
      </div>
      <p class="foot">${o.journal.runs.length === 0 ? '첫 여정' : `여정 ${o.journal.runs.length}번 · 도착 ${won}번`}</p>
    </div>`;
  el.querySelector('.resume')?.addEventListener('click', o.onResume);
  el.querySelector('.new')!.addEventListener('click', o.onNew);
  el.querySelector('.journal')!.addEventListener('click', o.onJournal);
  const key = (e: KeyboardEvent) => {
    if (!el.isConnected) {
      window.removeEventListener('keydown', key);
      return;
    }
    if (document.querySelector('.overlay.book')) return;
    if (e.key === 'Enter' || e.key === '1') (o.resume ? o.onResume : o.onNew)();
    else if (e.key === '2') (o.resume ? o.onNew : o.onJournal)();
    else if (e.key === '3' && o.resume) o.onJournal();
  };
  window.addEventListener('keydown', key);
  el.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('button')) audio.sfx('click'); });
  root.appendChild(el);
  return el;
}

// 기록 수첩. 여정 목록, 아는 지역, 만난 이야기, 배운 것
export function showJournal(root: HTMLElement, j: Journal, onClose: () => void): HTMLElement {
  const el = document.createElement('div');
  el.className = 'overlay book';
  const runs = [...j.runs].reverse().slice(0, 20).map((r) => {
    const where = regionName(r.farthest);
    const what = r.over === 'won' ? '향로봉 도착' : `${where}에서 ${r.cause.replace(/^\d+일째, /, '')}`;
    const left = r.departedDay ? ` · ${r.departedDay}일째 출발` : ' · 야영장에서';
    return `<li><b>${r.runNo}번째</b> · ${r.days}일${left} · 피폭 ${r.rad} · ${what}</li>`;
  });
  const regions = REGIONS.map((name, i) => `<span class="region${j.knownStages.includes(i) ? ' known' : ''}">${name}</span>`).join('');
  const seen = Object.entries(j.eventsSeen)
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => `<span class="tale">${eventTitle(id)}${n > 1 ? ` ×${n}` : ''}</span>`);
  const deaths = Object.entries(j.deaths).map(([k, n]) => `${k} ${n}`).join(' · ');
  el.innerHTML = `
    <div class="card wide">
      <div class="head"><h2>기록 수첩</h2><button class="close"><span class="num">Esc</span> 닫기</button></div>
      <div class="cols">
        <section>
          <h3>여정</h3>
          ${runs.length ? `<ul>${runs.join('')}</ul>` : '<p class="muted">아직 적힌 것이 없다.</p>'}
          ${deaths ? `<p class="muted">죽은 이유: ${deaths}</p>` : ''}
        </section>
        <section>
          <h3>아는 지역</h3>
          <p class="muted">가 본 지역은 다음 여정에서도 길과 이름이 기억난다.</p>
          <div class="regions">${regions}</div>
          <h3>만난 이야기 <span class="muted">${seen.length}편</span></h3>
          ${seen.length ? `<div class="tales">${seen.join('')}</div>` : '<p class="muted">아직 아무도 만나지 않았다.</p>'}
          <h3>배운 것</h3>
          <ul class="lessons">${lessons(j).map((l) => `<li>${l}</li>`).join('')}</ul>
        </section>
      </div>
    </div>`;
  const close = () => {
    el.remove();
    window.removeEventListener('keydown', key);
    onClose();
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key.toLowerCase() === 'j') {
      e.stopPropagation();
      close();
    }
  };
  el.querySelector('.close')!.addEventListener('click', close);
  window.addEventListener('keydown', key, true);
  el.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('button')) audio.sfx('click'); });
  root.appendChild(el);
  return el;
}

export interface MenuOpts {
  onContinue: () => void;
  onJournal: () => void;
  onTitle: () => void;
}

// 게임 중 메뉴. Esc 로 열고 닫는다
export function showMenu(root: HTMLElement, o: MenuOpts): HTMLElement {
  const el = document.createElement('div');
  el.className = 'overlay menu-overlay';
  el.innerHTML = `
    <div class="card">
      <h2>마루금</h2>
      <div class="menu">
        <button class="primary cont"><span class="num">1</span> 계속</button>
        <button class="journal"><span class="num">2</span> 기록 수첩</button>
        <button class="title-btn"><span class="num">3</span> 저장하고 제목으로</button>
      </div>
      <p class="foot">진행은 행동할 때마다 자동으로 저장된다.</p>
    </div>`;
  const close = () => {
    el.remove();
    window.removeEventListener('keydown', key, true);
  };
  const key = (e: KeyboardEvent) => {
    if (document.querySelector('.overlay.book')) return;
    e.stopPropagation();
    if (e.key === 'Escape' || e.key === '1') { close(); o.onContinue(); }
    else if (e.key === '2') o.onJournal();
    else if (e.key === '3') { close(); o.onTitle(); }
  };
  el.querySelector('.cont')!.addEventListener('click', () => { close(); o.onContinue(); });
  el.querySelector('.journal')!.addEventListener('click', o.onJournal);
  el.querySelector('.title-btn')!.addEventListener('click', () => { close(); o.onTitle(); });
  window.addEventListener('keydown', key, true);
  el.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('button')) audio.sfx('click'); });
  root.appendChild(el);
  return el;
}
