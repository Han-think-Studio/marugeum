import { audio } from '../audio/engine';
import { settings } from '../game/settings';

// 손 놀이. 수리·불·요리를 버튼 한 번이 아니라 손으로 한다. 5~10초짜리
// 결과는 솜씨 0..1. 설정에서 '자동'이면 놀이 없이 undefined(예전처럼 확률과 보통 솜씨), Esc 로 그만두면 null
// 조작은 하나뿐이다. Space 를 누르거나 화면을 누른다(누르고 있기·떼기)

export type HandKind = 'hammer' | 'screw' | 'match' | 'cook';

interface Game {
  title: string;
  how: string;
  step(dt: number, held: boolean): void; // 매 프레임
  press(): void; // 누른 순간
  release(): void; // 뗀 순간
  draw(g: CanvasRenderingContext2D, w: number, h: number, c: Palette): void;
  done(): number | null; // 끝났으면 솜씨
}

interface Palette { ink: string; muted: string; accent: string; line: string; panel: string; warn: string; good: string }

function palette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const v = (k: string, d: string) => cs.getPropertyValue(k).trim() || d;
  return { ink: v('--ink', '#e8e0cc'), muted: v('--muted', '#8a8576'), accent: v('--accent', '#f0c85a'), line: v('--line', '#2c3440'), panel: v('--panel-2', '#1b222c'), warn: v('--warn', '#e07a5f'), good: '#7fae8a' };
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));

// 띠 하나와 그 위의 칸. 놀이마다 쓰는 막대
function bar(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: Palette, zone: [number, number] | null, fill: number | null, marker: number | null): void {
  g.fillStyle = c.panel; g.fillRect(x, y, w, h);
  g.strokeStyle = c.line; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  if (fill !== null) { g.fillStyle = fill > 1 ? c.warn : c.accent; g.fillRect(x, y, w * Math.min(1, fill), h); }
  // 초록 칸은 채움 위에 겹쳐 그려야 채움이 칸을 덮어도 보인다
  if (zone) {
    g.fillStyle = 'rgba(127, 174, 138, 0.45)'; g.fillRect(x + w * zone[0], y, w * (zone[1] - zone[0]), h);
    g.strokeStyle = c.good; g.lineWidth = 2; g.strokeRect(x + w * zone[0] + 1, y + 1, w * (zone[1] - zone[0]) - 2, h - 2);
  }
  if (marker !== null) { g.fillStyle = c.ink; g.fillRect(x + w * marker - 2, y - 4, 4, h + 8); }
}

// 망치질. 눈금이 초록 칸에 올 때 내리친다. 못 셋
function hammer(wide: boolean): Game {
  const zone = wide ? 0.3 : 0.2;
  const center = 0.5;
  const hits: number[] = [];
  let t = 0; let x = 0; let flash = 0;
  return {
    title: '망치질', how: `눈금이 초록 칸에 올 때 Space 또는 클릭. 못 세 개${wide ? ' · 공구가 있어 칸이 넓다' : ''}`,
    step(dt) { t += dt * (1.6 + hits.length * 0.45); x = (Math.sin(t * 2.4) + 1) / 2; flash = Math.max(0, flash - dt * 3); },
    press() {
      if (hits.length >= 3) return;
      const d = Math.abs(x - center);
      hits.push(d <= zone / 2 ? 1 : d <= zone ? 0.5 : 0);
      flash = 1;
      audio.sfx('click');
    },
    release() {},
    draw(g, w, h, c) {
      // 널빤지와 못
      g.fillStyle = '#6b5a3e'; g.fillRect(40, 70, w - 80, 34);
      g.strokeStyle = '#3d3222'; g.strokeRect(40.5, 70.5, w - 81, 33);
      for (let i = 0; i < 3; i++) {
        const nx = 40 + ((w - 80) * (i + 1)) / 4;
        const sunk = hits[i] ?? -1;
        const up = sunk < 0 ? 30 : 30 - 26 * sunk;
        g.fillStyle = i === hits.length ? c.accent : c.muted;
        g.fillRect(nx - 2, 70 - up, 4, up);
        g.fillRect(nx - 7, 70 - up - 4, 14, 4);
        if (sunk === 0) { g.strokeStyle = c.warn; g.beginPath(); g.moveTo(nx - 8, 70 - up + 6); g.lineTo(nx + 8, 70 - up - 2); g.stroke(); }
      }
      if (flash > 0) { g.fillStyle = `rgba(255,240,200,${flash * 0.25})`; g.fillRect(0, 0, w, h); }
      bar(g, 40, h - 44, w - 80, 16, c, [center - zone / 2, center + zone / 2], null, x);
    },
    done() { return hits.length >= 3 ? hits.reduce((a, b) => a + b, 0) / 3 : null; },
  };
}

// 드라이버. 누르고 있으면 조여지고, 초록 칸에서 뗀다. 너무 조이면 나사산이 나간다. 나사 셋
function screw(wide: boolean): Game {
  const band: [number, number] = wide ? [0.55, 0.85] : [0.62, 0.8];
  const marks: number[] = [];
  let torque = 0; let angle = 0; let holding = false;
  return {
    title: '드라이버', how: `누르고 있으면 조인다. 초록 칸에서 뗀다. 끝까지 가면 나사산이 나간다. 나사 세 개${wide ? ' · 공구가 있어 칸이 넓다' : ''}`,
    step(dt, held) {
      holding = held && marks.length < 3;
      if (holding) { torque += dt * (0.55 + marks.length * 0.12); angle += dt * 9; }
      if (torque > 1.05) { marks.push(0); torque = 0; audio.sfx('click'); }
    },
    press() {},
    release() {
      if (marks.length >= 3 || torque < 0.05) return;
      const s = torque >= band[0] && torque <= band[1] ? 1 : Math.abs(torque - (band[0] + band[1]) / 2) < 0.25 ? 0.5 : 0;
      marks.push(s); torque = 0; audio.sfx('click');
    },
    draw(g, w, h, c) {
      for (let i = 0; i < 3; i++) {
        const cx = w / 2 + (i - 1) * 110; const cy = 78;
        g.fillStyle = c.panel; g.beginPath(); g.arc(cx, cy, 26, 0, Math.PI * 2); g.fill();
        g.strokeStyle = i === marks.length ? c.accent : marks[i] === 0 ? c.warn : marks[i] !== undefined ? c.good : c.muted;
        g.lineWidth = 3; g.stroke();
        const a = i === marks.length ? angle : i * 0.7;
        g.beginPath(); g.moveTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16); g.lineTo(cx - Math.cos(a) * 16, cy - Math.sin(a) * 16); g.stroke();
        g.beginPath(); g.moveTo(cx + Math.cos(a + Math.PI / 2) * 16, cy + Math.sin(a + Math.PI / 2) * 16); g.lineTo(cx - Math.cos(a + Math.PI / 2) * 16, cy - Math.sin(a + Math.PI / 2) * 16); g.stroke();
      }
      bar(g, 40, h - 44, w - 80, 16, c, band, torque, null);
    },
    done() { return marks.length >= 3 ? marks.reduce((a, b) => a + b, 0) / 3 : null; },
  };
}

// 성냥 긋기. 바람이 잦아드는 틈에 긋는다. 세 개비까지
function match(): Game {
  const calm = 0.35;
  let t = Math.random() * 10; let wind = 0.5; let tries = 0; let lit = -1; let spark = 0;
  return {
    title: '성냥 긋기', how: '바람 막대가 초록 칸으로 내려왔을 때 Space 또는 클릭. 세 개비까지',
    step(dt) {
      t += dt;
      wind = clamp(0.5 + 0.32 * Math.sin(t * 1.3) + 0.18 * Math.sin(t * 3.7 + 1) + 0.1 * Math.sin(t * 7.1));
      spark = Math.max(0, spark - dt * 2);
    },
    press() {
      if (lit >= 0 || tries >= 3) return;
      tries++; spark = 1;
      if (wind <= calm) { lit = tries; audio.sfx('fire'); } else audio.sfx('click');
    },
    release() {},
    draw(g, w, h, c) {
      // 성냥갑과 불꽃
      g.fillStyle = '#7a3b2e'; g.fillRect(w / 2 - 60, 74, 120, 30);
      g.fillStyle = '#3d2a20'; g.fillRect(w / 2 - 60, 74, 120, 6);
      const fx = w / 2; const fy = 62;
      if (lit >= 0) {
        const f = 14 + Math.sin(t * 12) * 3;
        g.fillStyle = c.accent; g.beginPath(); g.ellipse(fx, fy - f / 2, 7, f, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff3c4'; g.beginPath(); g.ellipse(fx, fy - f / 3, 3, f / 2, 0, 0, Math.PI * 2); g.fill();
      } else if (spark > 0) {
        g.fillStyle = `rgba(255,220,150,${spark})`;
        for (let i = 0; i < 6; i++) g.fillRect(fx + Math.cos(i) * 18 * (1 - spark), fy + Math.sin(i * 2) * 10 * (1 - spark), 2, 2);
      }
      g.fillStyle = c.muted; g.font = '12px sans-serif'; g.textAlign = 'left';
      g.fillText(`남은 성냥 ${3 - tries}`, 40, 30);
      g.textAlign = 'right'; g.fillText('바람', w - 40, h - 52);
      bar(g, 40, h - 44, w - 80, 16, c, [0, calm], wind, null);
    },
    done() { return lit >= 0 ? [1, 0.66, 0.33][lit - 1] : tries >= 3 ? 0 : null; },
  };
}

// 국 끓이기. 누르면 불이 세지고 떼면 약해진다. 여덟 초 동안 초록 칸에 둔다. 너무 세면 바닥이 탄다
function cookGame(): Game {
  const band: [number, number] = [0.45, 0.7];
  const total = 8;
  let t = 0; let heat = 0.2; let inBand = 0; let burn = 0; let bubble = 0;
  return {
    title: '국 끓이기', how: '누르고 있으면 불이 세지고, 떼면 약해진다. 여덟 초 동안 초록 칸에 둔다',
    step(dt, held) {
      if (t >= total) return;
      t += dt;
      heat = clamp(heat + (held ? 0.55 : -0.38) * dt + Math.sin(t * 2.3) * 0.04 * dt);
      if (heat >= band[0] && heat <= band[1]) inBand += dt;
      if (heat > 0.9) burn += dt;
      bubble += dt * (1 + heat * 6);
    },
    press() {}, release() {},
    draw(g, w, h, c) {
      const cx = w / 2;
      // 불
      const fh = 6 + heat * 26;
      for (let i = -2; i <= 2; i++) {
        g.fillStyle = heat > 0.9 ? c.warn : c.accent;
        g.beginPath(); g.ellipse(cx + i * 14, 112 - fh / 2, 5, fh / 2 + Math.sin(bubble + i) * 2, 0, 0, Math.PI * 2); g.fill();
      }
      // 냄비와 김
      g.fillStyle = '#4a4f57'; g.fillRect(cx - 50, 56, 100, 40);
      g.fillStyle = '#2d3036'; g.fillRect(cx - 56, 52, 112, 6);
      if (heat >= band[0]) {
        g.strokeStyle = 'rgba(232,224,204,0.35)'; g.lineWidth = 2;
        for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(cx + i * 20, 48); g.quadraticCurveTo(cx + i * 20 + Math.sin(bubble + i) * 8, 34, cx + i * 20, 20); g.stroke(); }
      }
      g.fillStyle = c.muted; g.font = '12px sans-serif'; g.textAlign = 'left';
      g.fillText(`${Math.max(0, Math.ceil(total - t))}초`, 40, 30);
      g.textAlign = 'right'; g.fillText(burn > 0.6 ? '바닥이 탄다' : '불 세기', w - 40, h - 52);
      bar(g, 40, h - 44, w - 80, 16, c, band, heat, null);
    },
    done() { return t >= total ? clamp(inBand / total - Math.min(0.5, burn * 0.25)) : null; },
  };
}

function words(s: number): string {
  return s >= 0.85 ? '솜씨 좋음' : s >= 0.5 ? '그럭저럭' : s > 0 ? '서툴렀다' : '실패';
}

// 놀이 하나를 띄우고 솜씨를 돌려준다
export function playHand(root: HTMLElement, kind: HandKind, opts: { tools?: boolean } = {}): Promise<number | null | undefined> {
  if (!settings.handwork) return Promise.resolve(undefined);
  const game = kind === 'hammer' ? hammer(!!opts.tools) : kind === 'screw' ? screw(!!opts.tools) : kind === 'match' ? match() : cookGame();
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'overlay hand';
    el.innerHTML = `<div class="card"><div class="head"><h2>${game.title}</h2><button class="close"><span class="num">Esc</span> 그만두기</button></div><p class="muted how">${game.how}</p><canvas width="520" height="170"></canvas><p class="verdict"></p></div>`;
    root.appendChild(el);
    const canvas = el.querySelector('canvas')!;
    const g = canvas.getContext('2d')!;
    const c = palette();
    let held = false; let last = performance.now(); let finished: number | null = null; let raf = 0;
    const down = () => { if (finished !== null || held) return; held = true; game.press(); };
    const up = () => { if (!held) return; held = false; if (finished === null) game.release(); };
    const end = (v: number | null) => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('keyup', keyUp, true);
      window.removeEventListener('pointerup', up);
      el.remove();
      resolve(v);
    };
    const key = (e: KeyboardEvent) => {
      e.stopImmediatePropagation();
      if (e.key === 'Escape') { end(null); return; }
      if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) down(); }
    };
    const keyUp = (e: KeyboardEvent) => { e.stopImmediatePropagation(); if (e.code === 'Space' || e.key === 'Enter') up(); };
    window.addEventListener('keydown', key, true);
    window.addEventListener('keyup', keyUp, true);
    canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); down(); });
    window.addEventListener('pointerup', up);
    el.querySelector('.close')!.addEventListener('click', () => end(null));
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (finished === null) {
        game.step(dt, held);
        const r = game.done();
        if (r !== null) {
          finished = r;
          el.querySelector('.verdict')!.textContent = words(r);
          setTimeout(() => end(finished), 750);
        }
      }
      g.clearRect(0, 0, canvas.width, canvas.height);
      game.draw(g, canvas.width, canvas.height, c);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  });
}
