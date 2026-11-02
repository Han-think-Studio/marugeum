import { resolveArt } from './art';

// 전환 그림. 이동, 밤, 고비 사이에 한 장씩 넘긴다. 누르거나 키를 누르면, 아니면 잠시 뒤 사라진다
export interface Slide {
  key: string; // 그림 찾기 기억용
  art: string[]; // 후보 그림 경로
  title: string;
  text: string;
  deltas: [string, number, boolean][]; // 이름, 바뀐 양, 나쁜 쪽인가
  tone: 'travel' | 'night' | 'crisis';
}

const queue: Slide[] = [];
let showing: HTMLElement | null = null;

export function pushSlide(host: HTMLElement, s: Slide): void {
  queue.push(s);
  if (!showing) next(host);
}

export function slideOpen(): boolean {
  return showing !== null;
}

function next(host: HTMLElement): void {
  const s = queue.shift();
  if (!s) { showing = null; return; }
  const el = document.createElement('div');
  el.className = `slide ${s.tone}`;
  const setBg = () => {
    const src = resolveArt(s.key, s.art);
    if (src) el.style.backgroundImage = `url(${src})`;
  };
  setBg();
  if (!el.style.backgroundImage) resolveArt(s.key, s.art, setBg);
  const chips = s.deltas
    .filter(([, v]) => Math.abs(v) >= 1)
    .map(([k, v, bad]) => `<span class="d ${bad ? 'bad' : 'good'}">${k} ${v > 0 ? '+' : ''}${Math.round(v)}</span>`)
    .join('');
  el.innerHTML = `<div class="cap"><h3>${s.title}</h3><p>${s.text}</p>${chips ? `<div class="deltas">${chips}</div>` : ''}<span class="hint">누르면 넘어간다</span></div>`;
  host.appendChild(el);
  showing = el;
  requestAnimationFrame(() => el.classList.add('in'));
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    window.removeEventListener('keydown', key, true);
    el.classList.remove('in');
    window.setTimeout(() => { el.remove(); showing = null; next(host); }, 250);
  };
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); }
    close();
  };
  el.addEventListener('click', close);
  window.addEventListener('keydown', key, true);
  window.setTimeout(close, s.tone === 'crisis' ? 4200 : 2800);
}
