import { audio } from '../audio/engine';
import { settings } from '../game/settings';

// 손 놀이. 수리·불·요리를 버튼 한 번이 아니라 손으로 한다. 5~10초짜리
// 결과는 솜씨 0..1. 설정에서 '자동'이면 놀이 없이 undefined(예전처럼 확률과 보통 솜씨), Esc 로 그만두면 null
// 조작은 하나뿐이다. Space 를 누르거나 화면을 누른다(누르고 있기·떼기)
// 바탕과 도구는 public/art/hand-*.webp. 그림이 아직 안 왔으면 도형으로 그린다

export type HandKind = 'hammer' | 'screw' | 'match' | 'cook';

interface Game {
  title: string;
  how: string;
  bg: string; // hand-bg-<bg>.webp
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

// 그림 조각. 처음 부를 때 불러 두고, 다 온 뒤부터 돌려준다
const images = new Map<string, HTMLImageElement>();
function sprite(name: string): HTMLImageElement | null {
  let im = images.get(name);
  if (!im) { im = new Image(); im.src = `./art/hand-${name}.webp`; images.set(name, im); }
  return im.complete && im.naturalWidth > 0 ? im : null;
}

// 조각 하나를 (x, y) 가운데에 size 크기로. 돌림은 가운데를 축으로. 그림이 없으면 false
function put(g: CanvasRenderingContext2D, name: string, x: number, y: number, size: number, rot = 0): boolean {
  const im = sprite(name);
  if (!im) return false;
  g.save(); g.translate(x, y); g.rotate(rot);
  g.drawImage(im, -size / 2, -size / 2, size, size);
  g.restore();
  return true;
}

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

// 막대 위 줄의 작은 글씨. 아래 띠가 어두워서 밝은 글씨로
function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign, c: Palette): void {
  g.fillStyle = c.ink; g.font = '12px sans-serif'; g.textAlign = align;
  g.fillText(text, x, y);
}

// 망치질. 눈금이 초록 칸에 올 때 내리친다. 못 셋
function hammer(wide: boolean): Game {
  const zone = wide ? 0.3 : 0.2;
  const center = 0.5;
  const hits: number[] = [];
  let t = 0; let x = 0; let flash = 0;
  return {
    title: '망치질', bg: 'hammer', how: `눈금이 초록 칸에 올 때 Space 또는 클릭. 못 세 개${wide ? ' · 공구가 있어 칸이 넓다' : ''}`,
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
      // 널빤지와 못. 못은 널빤지 위로 나온 만큼만 보인다
      const top = 84;
      g.fillStyle = '#6b5a3e'; g.fillRect(40, top, w - 80, 22);
      g.strokeStyle = '#3d3222'; g.strokeRect(40.5, top + 0.5, w - 81, 21);
      for (let i = 0; i < 3; i++) {
        const nx = 40 + ((w - 80) * (i + 1)) / 4;
        const sunk = hits[i] ?? -1;
        const up = sunk < 0 ? 34 : 34 - 30 * sunk;
        g.save(); g.beginPath(); g.rect(0, 0, w, top + 1); g.clip();
        if (!put(g, 'nail', nx, top - up + 24, 52)) {
          g.fillStyle = i === hits.length ? c.accent : c.muted;
          g.fillRect(nx - 2, top - up, 4, up);
          g.fillRect(nx - 7, top - up - 4, 14, 4);
        }
        g.restore();
        if (i === hits.length) { g.fillStyle = c.accent; g.beginPath(); g.arc(nx, top + 11, 3, 0, Math.PI * 2); g.fill(); }
        if (sunk === 0) { g.strokeStyle = c.warn; g.lineWidth = 2; g.beginPath(); g.moveTo(nx - 8, top - up + 6); g.lineTo(nx + 8, top - up - 2); g.stroke(); }
      }
      // 망치는 다음 못 위에서 들려 있다가 친 순간 내려온다
      const next = Math.min(hits.length, 2);
      const hx = 40 + ((w - 80) * (next + 1)) / 4;
      const swing = hits.length >= 3 ? 0 : flash;
      put(g, 'hammer', hx + 26, top - 44 + swing * 14, 64, -0.5 + swing * 0.9);
      if (flash > 0) { g.fillStyle = `rgba(255,240,200,${flash * 0.25})`; g.fillRect(0, 0, w, h); }
      bar(g, 40, h - 30, w - 80, 16, c, [center - zone / 2, center + zone / 2], null, x);
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
    title: '드라이버', bg: 'screw', how: `누르고 있으면 조인다. 초록 칸에서 뗀다. 끝까지 가면 나사산이 나간다. 나사 세 개${wide ? ' · 공구가 있어 칸이 넓다' : ''}`,
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
        const cx = w / 2 + (i - 1) * 120; const cy = 78;
        const a = i === marks.length ? angle : i * 0.7;
        // 테두리 색이 나사의 결과. 금빛은 지금 조이는 나사, 초록은 잘 조임, 붉은빛은 나사산이 나감
        g.strokeStyle = i === marks.length ? c.accent : marks[i] === 0 ? c.warn : marks[i] !== undefined ? c.good : 'rgba(0,0,0,0.25)';
        g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, 30, 0, Math.PI * 2); g.stroke();
        if (!put(g, 'screw', cx, cy, 54, a)) {
          g.fillStyle = c.panel; g.beginPath(); g.arc(cx, cy, 26, 0, Math.PI * 2); g.fill();
          g.lineWidth = 3;
          g.beginPath(); g.moveTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16); g.lineTo(cx - Math.cos(a) * 16, cy - Math.sin(a) * 16); g.stroke();
          g.beginPath(); g.moveTo(cx + Math.cos(a + Math.PI / 2) * 16, cy + Math.sin(a + Math.PI / 2) * 16); g.lineTo(cx - Math.cos(a + Math.PI / 2) * 16, cy - Math.sin(a + Math.PI / 2) * 16); g.stroke();
        }
      }
      // 드라이버는 지금 나사에 비스듬히 꽂혀 조일 때 떨린다
      if (marks.length < 3) {
        const cx = w / 2 + (marks.length - 1) * 120;
        const shake = holding ? Math.sin(angle * 3) * 0.04 : 0;
        put(g, 'screwdriver', cx + 22, 44, 80, 0.55 + shake);
      }
      bar(g, 40, h - 30, w - 80, 16, c, band, torque, null);
    },
    done() { return marks.length >= 3 ? marks.reduce((a, b) => a + b, 0) / 3 : null; },
  };
}

// 성냥 긋기. 바람이 잦아드는 틈에 긋는다. 세 개비까지
function match(): Game {
  const calm = 0.35;
  let t = Math.random() * 10; let wind = 0.5; let tries = 0; let lit = -1; let spark = 0;
  return {
    title: '성냥 긋기', bg: 'match', how: '바람 막대가 초록 칸으로 내려왔을 때 Space 또는 클릭. 세 개비까지',
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
      // 성냥갑, 그 위에서 긋는 성냥 한 개비, 붙으면 불꽃
      const bx = w / 2 - 70; const by = 86;
      if (!put(g, 'matchbox', bx, by, 78)) {
        g.fillStyle = '#7a3b2e'; g.fillRect(bx - 50, by - 12, 100, 30);
        g.fillStyle = '#3d2a20'; g.fillRect(bx - 50, by - 12, 100, 6);
      }
      // 긋는 순간 성냥이 갑 옆면을 스치며 미끄러진다
      const mx = w / 2 + 40 - spark * 30; const my = 80;
      const tipX = mx - 22; const tipY = my - 34;
      const hasMatch = lit >= 0 || tries < 3;
      if (hasMatch && !put(g, 'match', mx, my, 84, -0.45)) {
        g.strokeStyle = '#d8b878'; g.lineWidth = 3; g.beginPath(); g.moveTo(mx + 14, my + 32); g.lineTo(tipX, tipY); g.stroke();
      }
      if (lit >= 0) {
        const f = 1 + Math.sin(t * 12) * 0.08;
        if (!put(g, 'flame', tipX, tipY - 14, 40 * f)) {
          g.fillStyle = c.accent; g.beginPath(); g.ellipse(tipX, tipY - 8, 7, 14 * f, 0, 0, Math.PI * 2); g.fill();
        }
      } else if (spark > 0) {
        g.fillStyle = `rgba(255,200,110,${spark})`;
        for (let i = 0; i < 7; i++) g.fillRect(tipX + Math.cos(i) * 20 * (1 - spark), tipY + Math.sin(i * 2) * 12 * (1 - spark), 3, 3);
      }
      // 바람이 셀수록 풀잎 줄이 길게 흩날린다
      g.strokeStyle = `rgba(40,30,20,${0.15 + wind * 0.4})`; g.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        const y = 20 + i * 12; const x0 = ((t * 200 * (0.4 + wind) + i * 97) % (w + 120)) - 60;
        g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + 20 + wind * 50, y + 2); g.stroke();
      }
      label(g, `남은 성냥 ${3 - tries}`, 40, h - 38, 'left', c);
      label(g, '바람', w - 40, h - 38, 'right', c);
      bar(g, 40, h - 30, w - 80, 16, c, [0, calm], wind, null);
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
    title: '국 끓이기', bg: 'cook', how: '누르고 있으면 불이 세지고, 떼면 약해진다. 여덟 초 동안 초록 칸에 둔다',
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
      // 불. 그림이 있으면 세기만큼 키우고, 너무 세면 붉게 덮는다
      // 불은 냄비 아래에 바닥을 맞춰 위로 자란다
      const fs = 34 + heat * 46;
      if (put(g, 'fire', cx, 122 - fs / 2, fs)) {
        if (heat > 0.9) { g.fillStyle = 'rgba(224,122,95,0.35)'; g.beginPath(); g.arc(cx, 122 - fs / 2, fs / 2, 0, Math.PI * 2); g.fill(); }
      } else {
        const fh = 6 + heat * 26;
        for (let i = -2; i <= 2; i++) {
          g.fillStyle = heat > 0.9 ? c.warn : c.accent;
          g.beginPath(); g.ellipse(cx + i * 14, 112 - fh / 2, 5, fh / 2 + Math.sin(bubble + i) * 2, 0, 0, Math.PI * 2); g.fill();
        }
      }
      // 냄비와 김. 끓으면 냄비가 살짝 들썩인다
      const jig = heat >= band[0] ? Math.sin(bubble * 3) * 1.2 : 0;
      if (!put(g, 'pot', cx, 50 + jig, 72)) {
        g.fillStyle = '#4a4f57'; g.fillRect(cx - 50, 56, 100, 40);
        g.fillStyle = '#2d3036'; g.fillRect(cx - 56, 52, 112, 6);
      }
      if (heat >= band[0]) {
        g.strokeStyle = 'rgba(250,245,230,0.7)'; g.lineWidth = 2;
        for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(cx + i * 16, 18); g.quadraticCurveTo(cx + i * 16 + Math.sin(bubble + i) * 8, 9, cx + i * 16, 0); g.stroke(); }
      }
      label(g, `${Math.max(0, Math.ceil(total - t))}초`, 40, h - 38, 'left', c);
      label(g, burn > 0.6 ? '바닥이 탄다' : '불 세기', w - 40, h - 38, 'right', c);
      bar(g, 40, h - 30, w - 80, 16, c, band, heat, null);
    },
    done() { return t >= total ? clamp(inBand / total - Math.min(0.5, burn * 0.25)) : null; },
  };
}

function words(s: number): string {
  return s >= 0.85 ? '솜씨 좋음' : s >= 0.5 ? '그럭저럭' : s > 0 ? '서툴렀다' : '실패';
}

// 바탕 그림을 가득 깔고, 막대가 놓이는 아래 띠는 어둡게
function backdrop(g: CanvasRenderingContext2D, name: string, w: number, h: number): void {
  const im = sprite(`bg-${name}`);
  if (im) {
    const s = Math.max(w / im.naturalWidth, h / im.naturalHeight);
    const dw = im.naturalWidth * s; const dh = im.naturalHeight * s;
    g.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }
  const fade = g.createLinearGradient(0, h - 66, 0, h - 46);
  fade.addColorStop(0, 'rgba(14,17,22,0)'); fade.addColorStop(1, 'rgba(14,17,22,0.82)');
  g.fillStyle = fade; g.fillRect(0, h - 66, w, 20);
  g.fillStyle = 'rgba(14,17,22,0.82)'; g.fillRect(0, h - 46, w, 46);
}

const W = 520;
const H = 170;
const DPR = 2;

// 놀이 하나를 띄우고 솜씨를 돌려준다
export function playHand(root: HTMLElement, kind: HandKind, opts: { tools?: boolean } = {}): Promise<number | null | undefined> {
  if (!settings.handwork) return Promise.resolve(undefined);
  const game = kind === 'hammer' ? hammer(!!opts.tools) : kind === 'screw' ? screw(!!opts.tools) : kind === 'match' ? match() : cookGame();
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'overlay hand';
    el.innerHTML = `<div class="card"><div class="head"><h2>${game.title}</h2><button class="close"><span class="num">Esc</span> 그만두기</button></div><p class="muted how">${game.how}</p><canvas width="${W * DPR}" height="${H * DPR}"></canvas><p class="verdict"></p></div>`;
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
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.clearRect(0, 0, W, H);
      backdrop(g, game.bg, W, H);
      game.draw(g, W, H, c);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  });
}
