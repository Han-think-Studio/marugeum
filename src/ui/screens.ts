import { ENDING_INFO, type Journal } from '../core/types';
import { clearJournal, eventTitle, lessons, regionName } from '../game/journal';
import { clearSave } from '../game/save';
import { REGIONS } from '../map/generate';
import { audio } from '../audio/engine';
import { TEXT_SIZE_LABEL, resetSettings, saveSettings, settings, type TextSize } from '../game/settings';
import { isFullscreen, toggleFullscreen } from './fullscreen';

// 제목 화면, 기록 수첩, 메뉴. 전부 게임 위에 얹는 덮개다

export interface TitleOpts {
  journal: Journal;
  resume: { day: number; place: string } | null;
  onResume: () => void;
  onNew: () => void;
  onJournal: () => void;
  onSettings: () => void;
}

export function showTitle(root: HTMLElement, o: TitleOpts): HTMLElement {
  const won = o.journal.runs.filter((r) => r.over === 'won').length;
  const el = document.createElement('div');
  el.className = 'overlay title';
  // public/art/title.png 가 있으면 제목 화면 배경이 된다
  const tryBg = (ext: 'webp' | 'png') => {
    const bg = new Image();
    bg.onload = () => {
      el.style.backgroundImage = `linear-gradient(rgba(6,9,13,0.45), rgba(6,9,13,0.8)), url(./art/title.${ext})`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
    };
    bg.onerror = () => { if (ext === 'webp') tryBg('png'); };
    bg.src = `./art/title.${ext}`;
  };
  tryBg('webp');
  el.innerHTML = `
    <div class="card">
      <h1>마루금</h1>
      <p class="sub">백두대간 생존기</p>
      <p class="intro">바다는 죽었고 낮은 땅은 비에 젖으면 위험하다.<br>지리산에서 향로봉까지, 능선을 따라 북쪽으로.</p>
      <div class="menu">
        ${o.resume ? `<button class="primary resume"><span class="num">1</span> 이어하기 <span class="meta">${o.resume.day}일째 · ${o.resume.place}</span></button>` : ''}
        <button class="${o.resume ? '' : 'primary '}new"><span class="num">${o.resume ? 2 : 1}</span> 새 여정</button>
        <button class="journal"><span class="num">${o.resume ? 3 : 2}</span> 기록 수첩</button>
        <button class="settings"><span class="num">${o.resume ? 4 : 3}</span> 설정</button>
      </div>
      <p class="foot">${o.journal.runs.length === 0 ? '첫 여정' : `여정 ${o.journal.runs.length}번 · 도착 ${won}번`}</p>
    </div>`;
  el.querySelector('.resume')?.addEventListener('click', o.onResume);
  el.querySelector('.new')!.addEventListener('click', o.onNew);
  el.querySelector('.journal')!.addEventListener('click', o.onJournal);
  el.querySelector('.settings')!.addEventListener('click', o.onSettings);
  const key = (e: KeyboardEvent) => {
    if (!el.isConnected) {
      window.removeEventListener('keydown', key);
      return;
    }
    if (document.querySelector('.overlay.book, .overlay.settings-overlay')) return;
    const items = [...(o.resume ? [o.onResume] : []), o.onNew, o.onJournal, o.onSettings];
    if (e.key === 'Enter') items[0]();
    else if (/^[1-4]$/.test(e.key)) items[Number(e.key) - 1]?.();
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
    const where = r.place ?? regionName(r.farthest);
    const what = r.over === 'won' ? (r.ending ? `${ENDING_INFO[r.ending].title} · ${ENDING_INFO[r.ending].short}` : '향로봉 도착') : `${where}에서 ${r.cause.replace(/^\d+일째, /, '')}`;
    const left = r.departedDay ? ` · ${r.departedDay}일째 출발` : ' · 야영장에서';
    return `<li><b>${r.runNo}번째</b> · ${r.days}일${left} · 피폭 ${r.rad}${r.clues !== undefined ? ` · 단서 ${r.clues}` : ''}${r.buried && r.buried.length ? ` · 묻어 준 ${r.buried.length}명` : ''} · ${what}</li>`;
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
  onSettings: () => void;
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
        <button class="settings"><span class="num">3</span> 설정</button>
        <button class="title-btn"><span class="num">4</span> 저장하고 제목으로</button>
      </div>
      <p class="foot">진행은 행동할 때마다 자동으로 저장된다.</p>
    </div>`;
  const close = () => {
    el.remove();
    window.removeEventListener('keydown', key, true);
  };
  const key = (e: KeyboardEvent) => {
    if (document.querySelector('.overlay.book, .overlay.settings-overlay')) return;
    e.stopPropagation();
    if (e.key === 'Escape' || e.key === '1') { close(); o.onContinue(); }
    else if (e.key === '2') o.onJournal();
    else if (e.key === '3') o.onSettings();
    else if (e.key === '4') { close(); o.onTitle(); }
  };
  el.querySelector('.cont')!.addEventListener('click', () => { close(); o.onContinue(); });
  el.querySelector('.journal')!.addEventListener('click', o.onJournal);
  el.querySelector('.settings')!.addEventListener('click', o.onSettings);
  el.querySelector('.title-btn')!.addEventListener('click', () => { close(); o.onTitle(); });
  window.addEventListener('keydown', key, true);
  el.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('button')) audio.sfx('click'); });
  root.appendChild(el);
  return el;
}

// 설정 화면. 소리, 글자 크기, 처음 화면, 장면 움직임, 전체화면, 기록 지우기, 그리고 키 안내
const KEYS: [string, string][] = [
  ['1 ~ 4', '길 고르기 · 사건의 선택'], ['⇧ 1 ~ 6', '정찰 (그 길을 보고 돌아온다)'], ['V', '장면과 지도 전환'], ['C', '거점 화면 · 짐 정리'], ['F', '둘러보기'],
  ['S / R', '자기 / 쉬기'], ['W / Q', '마시기 / 물 담기'], ['E', '먹기'], ['N / H / P', '땔감 / 불 / 물 끓이기'],
  ['B', '거점 세우기'], ['K', '바람막이'], ['G / T', '맡기기 / 챙기기'], ['O', '사진 보기'],
  ['I / U / Y', '요오드 / 응급처치 / 정수 알약'], ['L', '지나온 기록'], ['M', '소리 끄기'], ['F11', '전체화면'], ['Esc', '메뉴'],
];

export function showSettings(root: HTMLElement, onClose: () => void): HTMLElement {
  const old = root.querySelector('.overlay.settings-overlay');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'overlay settings-overlay';
  let armed = false;
  let wiped = false;
  const draw = () => {
    const vol = Math.round(audio.volume * 100);
    const seg = (name: string, options: [string, string][], cur: string) => `<div class="seg" data-seg="${name}">${options.map(([v, label]) => `<button data-v="${v}" class="${v === cur ? 'on' : ''}">${label}</button>`).join('')}</div>`;
    el.innerHTML = `
      <div class="card wide">
        <div class="head"><h2>설정</h2><button class="close"><span class="num">Esc</span> 닫기</button></div>
        <div class="cols">
          <section>
            <h3>소리</h3>
            <div class="row"><span class="label">소리</span>${seg('mute', [['on', '켬'], ['off', '끔']], audio.muted ? 'off' : 'on')}</div>
            <div class="row"><span class="label">음량 <span class="muted">${vol}</span></span><input type="range" class="vol" min="0" max="100" value="${vol}"></div>
            <h3>화면</h3>
            <div class="row"><span class="label">글자와 칸 크기</span>${seg('text', (['small', 'normal', 'large'] as TextSize[]).map((t) => [t, TEXT_SIZE_LABEL[t]]), settings.textSize)}</div>
            <div class="row"><span class="label">여정을 열 때</span>${seg('view', [['scene', '장면'], ['map', '지도']], settings.defaultView)}</div>
            <div class="row"><span class="label">장면 움직임 <span class="muted">비 · 불 · 별</span></span>${seg('anim', [['on', '켬'], ['off', '끔']], settings.animation ? 'on' : 'off')}</div>
            <div class="row"><span class="label">버튼 설명 <span class="muted">시간 · 재료</span></span>${seg('hints', [['on', '보임'], ['off', '숨김']], settings.hints ? 'on' : 'off')}</div>
            <div class="row"><span class="label">전체화면</span><button class="fs">${isFullscreen() ? '창으로' : '전체화면으로'} <span class="muted">F11</span></button></div>
            <h3>기록</h3>
            <p class="muted">여정 기록 수첩과 이어하기 저장을 지운다. 되돌릴 수 없다.</p>
            <button class="wipe ${armed ? 'armed' : ''}" ${wiped ? 'disabled' : ''}>${wiped ? '지웠다' : armed ? '정말 지운다' : '기록 지우기'}</button>
            <button class="reset">설정 되돌리기</button>
          </section>
          <section>
            <h3>키</h3>
            <table class="keys">${KEYS.map(([k, d]) => `<tr><td><span class="num">${k}</span></td><td>${d}</td></tr>`).join('')}</table>
            <p class="muted">마우스로도 전부 된다. 장면의 사물은 눌러서 살핀다.</p>
          </section>
        </div>
      </div>`;
  };
  const close = () => {
    el.remove();
    window.removeEventListener('keydown', key, true);
    onClose();
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };
  el.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.classList.contains('vol')) {
      audio.setVolume(Number(t.value) / 100);
      const lab = el.querySelector('.label .muted');
      if (lab) lab.textContent = t.value;
    }
  });
  el.addEventListener('change', (e) => {
    if ((e.target as HTMLElement).classList.contains('vol')) audio.sfx('click');
  });
  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
    if (!b) return;
    if (b.classList.contains('close')) { close(); return; }
    const seg = b.closest('.seg') as HTMLElement | null;
    if (seg) {
      const v = b.dataset.v!;
      switch (seg.dataset.seg) {
        case 'mute': audio.setMuted(v === 'off'); break;
        case 'text': settings.textSize = v as TextSize; break;
        case 'view': settings.defaultView = v as 'scene' | 'map'; break;
        case 'anim': settings.animation = v === 'on'; break;
        case 'hints': settings.hints = v === 'on'; break;
      }
      saveSettings();
      audio.sfx('click');
      draw();
      return;
    }
    if (b.classList.contains('fs')) { toggleFullscreen(); window.setTimeout(draw, 300); return; }
    if (b.classList.contains('reset')) { resetSettings(); armed = false; draw(); return; }
    if (b.classList.contains('wipe')) {
      if (!armed) { armed = true; draw(); return; }
      clearJournal();
      clearSave();
      wiped = true;
      armed = false;
      draw();
    }
  });
  window.addEventListener('keydown', key, true);
  draw();
  root.appendChild(el);
  return el;
}

// 전체 로그. 아래 패널에는 몇 줄만 보이니 따로 연다
export function showLog(root: HTMLElement, lines: string[], onClose: () => void): HTMLElement {
  const el = document.createElement('div');
  el.className = 'overlay book';
  el.innerHTML = `
    <div class="card wide">
      <div class="head"><h2>지나온 기록</h2><button class="close"><span class="num">Esc</span> 닫기</button></div>
      <div class="loglist">${lines.map((l) => `<p>${l}</p>`).join('')}</div>
    </div>`;
  const close = () => {
    el.remove();
    window.removeEventListener('keydown', key, true);
    onClose();
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key.toLowerCase() === 'l') {
      e.stopPropagation();
      close();
    }
  };
  el.querySelector('.close')!.addEventListener('click', close);
  window.addEventListener('keydown', key, true);
  root.appendChild(el);
  const list = el.querySelector('.loglist') as HTMLElement;
  list.scrollTop = list.scrollHeight;
  return el;
}
