import { INDOOR, type GameState, type MapNode, type NodeKind, type SceneObject } from '../core/types';
import { objectLabel, visibleObjects, hiddenCount } from '../game/objects';
import { hasEquip } from '../game/equip';
import { isPowered } from '../game/facilities';
import { hasFire } from '../game/state';
import { isNight } from '../game/weather';
import { darkness, mix } from '../map/render';

// 장면 그림판. 지금 선 자리를 선과 면으로 그린다. 시간·날씨·불·전등이 반영된다.
// public/art/scene-<kind>.png 가 있으면 그 그림을 바탕으로 쓰고 위에 날씨와 빛만 얹는다

interface Art {
  img: HTMLImageElement;
  wide: boolean;
}
const images: Partial<Record<NodeKind, Art | null>> = {};

// 16:9 그림을 먼저 찾고, 없으면 정사각형, 그것도 없으면 코드가 그린다
function artFor(kind: NodeKind, onload: () => void): Art | null {
  if (images[kind] !== undefined) return images[kind] ?? null;
  images[kind] = null;
  const candidates: [string, boolean][] = [
    [`./art/scene-${kind}-wide.webp`, true], [`./art/scene-${kind}-wide.png`, true],
    [`./art/scene-${kind}.webp`, false], [`./art/scene-${kind}.png`, false],
  ];
  const tryLoad = (i: number) => {
    if (i >= candidates.length) return;
    const [src, wide] = candidates[i];
    const img = new Image();
    img.onload = () => {
      images[kind] = { img, wide };
      onload();
    };
    img.onerror = () => tryLoad(i + 1);
    img.src = src;
  };
  tryLoad(0);
  return null;
}

// 노드 id 로 정해지는 의사 난수. 같은 자리면 같은 그림
function seeded(n: number): () => number {
  let s = (n * 2654435761 + 12345) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function drawScene(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, t: number, onArt: () => void): void {
  const node = state.nodes[state.nodeId];
  const night = isNight(state.hour);
  const dark = darkness(state.hour);
  const rnd = seeded(node.id + 1);
  ctx.clearRect(0, 0, w, h);

  // 하늘
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, mix('#0b111c', '#4a6a9a', 1 - dark));
  sky.addColorStop(0.7, mix('#182236', '#8aa4c4', 1 - dark));
  sky.addColorStop(1, mix('#262c33', '#c8b998', 1 - dark));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  if (state.weather === 'cloud' || state.weather === 'rain') {
    ctx.fillStyle = `rgba(40, 45, 55, ${state.weather === 'rain' ? 0.5 : 0.3})`;
    ctx.fillRect(0, 0, w, h);
  }

  // 별과 달, 해
  if (night && state.weather !== 'rain' && state.weather !== 'fog') {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 40; i++) {
      const sx = rnd() * w;
      const sy = rnd() * h * 0.5;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.002 + i));
      ctx.globalAlpha = tw * (state.weather === 'cloud' ? 0.3 : 0.9);
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;
    if (state.weather === 'clear') {
      ctx.fillStyle = '#e8e4d0';
      ctx.beginPath();
      ctx.arc(w * 0.78, h * 0.18, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = mix('#0b111c', '#4a6a9a', 1 - dark);
      ctx.beginPath();
      ctx.arc(w * 0.78 + 7, h * 0.18 - 4, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (!night && state.weather === 'clear') {
    const g = ctx.createRadialGradient(w * 0.75, h * 0.2, 4, w * 0.75, h * 0.2, 60);
    g.addColorStop(0, 'rgba(255, 240, 200, 0.9)');
    g.addColorStop(1, 'rgba(255, 240, 200, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // 먼 산 두 겹
  const ridge = (yBase: number, amp: number, color: string) => {
    ctx.beginPath();
    ctx.moveTo(0, h);
    let x = 0;
    ctx.lineTo(0, yBase);
    while (x < w) {
      x += 18 + rnd() * 30;
      ctx.lineTo(Math.min(x, w), yBase - rnd() * amp);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  ridge(h * 0.5, h * 0.22, mix('#1a2434', '#5e7390', (1 - dark) * 0.6));
  ridge(h * 0.62, h * 0.14, mix('#131a24', '#3f4f63', (1 - dark) * 0.5));

  // 땅
  const groundColor: Record<string, string> = {
    peak: '#2d3036', pass: '#3a3a38', temple: '#2b3326', shelter: '#2a3327', village: '#3a3428', valley: '#263a2e',
    spring: '#28352e', military: '#33352f', start: '#2e3a2c', goal: '#2f3532',
  };
  ctx.fillStyle = mix(groundColor[node.kind] ?? '#2a2f2a', '#8a8f6a', (1 - dark) * 0.35);
  ctx.fillRect(0, h * 0.72, w, h * 0.28);

  // 그림 파일이 있으면 그것을 깐다
  const art = artFor(node.kind, onArt);
  if (art) {
    if (art.wide || w / h < 1.3) {
      // 화면을 덮도록 가운데를 잘라 그린다
      const iw = art.img.naturalWidth;
      const ih = art.img.naturalHeight;
      const s = Math.max(w / iw, h / ih);
      const dw = iw * s;
      const dh = ih * s;
      ctx.drawImage(art.img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    } else {
      // 정사각형 그림은 가운데 두고 양옆은 코드가 그린 배경으로 잇는다
      foreground(ctx, node.kind, w, h, rnd, dark);
      const dw = h;
      const x0 = (w - dw) / 2;
      ctx.drawImage(art.img, x0, 0, dw, h);
      const fadeW = Math.min(80, dw * 0.12);
      const bgL = ctx.createLinearGradient(x0, 0, x0 + fadeW, 0);
      bgL.addColorStop(0, 'rgba(12, 19, 32, 0.9)');
      bgL.addColorStop(1, 'rgba(12, 19, 32, 0)');
      ctx.fillStyle = bgL;
      ctx.fillRect(x0, 0, fadeW, h);
      const bgR = ctx.createLinearGradient(x0 + dw - fadeW, 0, x0 + dw, 0);
      bgR.addColorStop(0, 'rgba(12, 19, 32, 0)');
      bgR.addColorStop(1, 'rgba(12, 19, 32, 0.9)');
      ctx.fillStyle = bgR;
      ctx.fillRect(x0 + dw - fadeW, 0, fadeW, h);
    }
    // 그림은 낮 기준이라 시간과 날씨만큼 어둡게 물들인다
    const tint = dark * 0.62 + (state.weather === 'rain' ? 0.18 : state.weather === 'cloud' ? 0.1 : 0);
    if (tint > 0) {
      ctx.fillStyle = `rgba(8, 12, 24, ${Math.min(0.85, tint)})`;
      ctx.fillRect(0, 0, w, h);
    }
  } else foreground(ctx, node.kind, w, h, rnd, dark);

  // 텐트 (지붕 없는 곳에서 텐트를 지녔을 때)
  if (!INDOOR.has(node.kind) && hasEquip(state, 'tent')) {
    ctx.fillStyle = mix('#5a4a30', '#c8a860', (1 - dark) * 0.5);
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.82); ctx.lineTo(w * 0.2, h * 0.68); ctx.lineTo(w * 0.3, h * 0.82); ctx.closePath();
    ctx.fill();
  }

  // 불
  if (hasFire(state)) {
    const fx = w * 0.5;
    const fy = h * 0.8;
    const flick = 0.85 + 0.15 * Math.sin(t * 0.02) * Math.cos(t * 0.013);
    const g = ctx.createRadialGradient(fx, fy, 2, fx, fy, 90 * flick);
    g.addColorStop(0, 'rgba(255, 170, 60, 0.75)');
    g.addColorStop(0.4, 'rgba(255, 120, 30, 0.25)');
    g.addColorStop(1, 'rgba(255, 100, 20, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.moveTo(fx - 6, fy); ctx.quadraticCurveTo(fx - 8, fy - 14 * flick, fx, fy - 22 * flick); ctx.quadraticCurveTo(fx + 8, fy - 14 * flick, fx + 6, fy); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(fx - 12, fy - 2, 24, 4);
  }

  // 전등 (전기 든 거점)
  if (node.camp && isPowered(node)) {
    const g = ctx.createRadialGradient(w * 0.62, h * 0.66, 2, w * 0.62, h * 0.66, 70);
    g.addColorStop(0, 'rgba(255, 230, 160, 0.7)');
    g.addColorStop(1, 'rgba(255, 230, 160, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // 비와 안개
  if (state.weather === 'rain') {
    ctx.strokeStyle = 'rgba(200, 220, 255, 0.4)';
    ctx.lineWidth = 1;
    const slant = state.wind === 'E' ? -5 : state.wind === 'W' ? 5 : 1;
    const off = (t * 0.4) % h;
    for (let i = 0; i < 70; i++) {
      const rx = (i * 53) % w;
      const ry = ((i * 37 + off) % h);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + slant, ry + 12);
      ctx.stroke();
    }
  } else if (state.weather === 'fog') {
    ctx.fillStyle = 'rgba(200, 205, 210, 0.35)';
    ctx.fillRect(0, 0, w, h);
  }

  // 밤의 비네트
  const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(0,0,0,${0.25 + dark * 0.35})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

// 자리 종류별 앞 그림
function foreground(ctx: CanvasRenderingContext2D, kind: NodeKind, w: number, h: number, rnd: () => number, dark: number): void {
  const ink = mix('#0e1218', '#2c3340', (1 - dark) * 0.6);
  const warm = mix('#2a2218', '#8a6a3a', (1 - dark) * 0.5);
  const gy = h * 0.72;
  ctx.fillStyle = ink;
  const tree = (x: number, y: number, s: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y - s * 2.2); ctx.lineTo(x + s * 0.8, y - s * 0.9); ctx.lineTo(x + s * 0.4, y - s * 0.9);
    ctx.lineTo(x + s, y); ctx.lineTo(x - s, y); ctx.lineTo(x - s * 0.4, y - s * 0.9); ctx.lineTo(x - s * 0.8, y - s * 0.9); ctx.closePath();
    ctx.fill();
  };
  switch (kind) {
    case 'start': {
      // 텐트 몇 동과 관리동
      ctx.fillStyle = warm;
      for (const [x, s] of [[0.18, 1], [0.38, 0.8], [0.78, 0.9]] as [number, number][]) {
        ctx.beginPath(); ctx.moveTo(w * x - 26 * s, gy + 8); ctx.lineTo(w * x, gy - 30 * s); ctx.lineTo(w * x + 26 * s, gy + 8); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = ink;
      ctx.fillRect(w * 0.52, gy - 34, 60, 42);
      ctx.beginPath(); ctx.moveTo(w * 0.52 - 6, gy - 34); ctx.lineTo(w * 0.52 + 30, gy - 52); ctx.lineTo(w * 0.52 + 66, gy - 34); ctx.closePath(); ctx.fill();
      ctx.fillRect(w * 0.92, gy - 70, 2, 78);
      tree(w * 0.06, gy + 4, 9);
      break;
    }
    case 'peak': {
      ctx.beginPath();
      ctx.moveTo(0, h); ctx.lineTo(w * 0.2, gy - 20); ctx.lineTo(w * 0.42, gy - 90); ctx.lineTo(w * 0.55, gy - 60); ctx.lineTo(w * 0.7, gy - 100); ctx.lineTo(w, gy - 10); ctx.lineTo(w, h); ctx.closePath();
      ctx.fill();
      // 돌탑과 표지목
      ctx.fillStyle = warm;
      for (let i = 0; i < 5; i++) ctx.fillRect(w * 0.7 - 6 + i, gy - 100 - i * 5, 12 - i * 2, 5);
      ctx.fillRect(w * 0.42 - 1, gy - 120, 3, 32);
      ctx.fillRect(w * 0.42 - 8, gy - 116, 17, 5);
      break;
    }
    case 'pass': {
      // 비탈 사이의 길과 멈춘 차들
      ctx.beginPath(); ctx.moveTo(0, gy - 70); ctx.lineTo(w * 0.3, gy + 2); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(w, gy - 60); ctx.lineTo(w * 0.7, gy + 2); ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = mix('#3b3b38', '#9a9a90', (1 - dark) * 0.4);
      ctx.beginPath(); ctx.moveTo(w * 0.42, gy + 2); ctx.lineTo(w * 0.58, gy + 2); ctx.lineTo(w * 0.9, h); ctx.lineTo(w * 0.1, h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = ink;
      for (const [x, y, s] of [[0.47, 0.84, 1], [0.55, 0.9, 1.3]] as [number, number, number][]) {
        ctx.fillRect(w * x - 14 * s, h * y - 8 * s, 28 * s, 10 * s);
        ctx.fillRect(w * x - 8 * s, h * y - 15 * s, 16 * s, 8 * s);
      }
      break;
    }
    case 'temple': {
      // 기와지붕과 석등
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.moveTo(w * 0.2, gy - 36); ctx.quadraticCurveTo(w * 0.5, gy - 78, w * 0.8, gy - 36); ctx.lineTo(w * 0.74, gy - 32); ctx.quadraticCurveTo(w * 0.5, gy - 64, w * 0.26, gy - 32); ctx.closePath();
      ctx.fill();
      ctx.fillRect(w * 0.27, gy - 32, w * 0.46, 40);
      ctx.fillStyle = warm;
      for (let i = 0; i < 5; i++) ctx.fillRect(w * 0.3 + i * (w * 0.4) / 4, gy - 30, 4, 38);
      ctx.fillRect(w * 0.88 - 3, gy - 30, 6, 38);
      ctx.fillRect(w * 0.88 - 8, gy - 36, 16, 6);
      tree(w * 0.08, gy + 4, 12);
      break;
    }
    case 'shelter': {
      ctx.fillStyle = ink;
      ctx.fillRect(w * 0.35, gy - 36, w * 0.3, 44);
      ctx.beginPath(); ctx.moveTo(w * 0.32, gy - 36); ctx.lineTo(w * 0.5, gy - 66); ctx.lineTo(w * 0.68, gy - 36); ctx.closePath(); ctx.fill();
      ctx.fillRect(w * 0.58, gy - 60, 8, 16);
      ctx.fillStyle = warm;
      ctx.fillRect(w * 0.47, gy - 20, 14, 28);
      tree(w * 0.12, gy + 4, 12); tree(w * 0.2, gy + 6, 9); tree(w * 0.86, gy + 4, 11);
      break;
    }
    case 'village': {
      ctx.fillStyle = ink;
      for (const [x, s] of [[0.15, 1], [0.42, 1.2], [0.7, 0.9]] as [number, number][]) {
        ctx.fillRect(w * x - 28 * s, gy - 24 * s, 56 * s, 30 * s);
        ctx.beginPath(); ctx.moveTo(w * x - 34 * s, gy - 24 * s); ctx.quadraticCurveTo(w * x, gy - 48 * s, w * x + 34 * s, gy - 24 * s); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = warm;
      ctx.fillRect(w * 0.9, gy - 50, 3, 58);
      ctx.beginPath(); ctx.arc(w * 0.9 + 2, gy - 52, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(0, gy + 2, w, 3);
      break;
    }
    case 'valley': {
      ctx.fillStyle = mix('#1c3a44', '#5a8aa0', (1 - dark) * 0.5);
      ctx.beginPath(); ctx.moveTo(w * 0.3, gy); ctx.quadraticCurveTo(w * 0.55, gy + 30, w * 0.45, h); ctx.lineTo(w * 0.75, h); ctx.quadraticCurveTo(w * 0.7, gy + 30, w * 0.6, gy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = ink;
      for (let i = 0; i < 6; i++) { const rx = rnd() * w; const ry = gy + 6 + rnd() * (h - gy - 10); ctx.beginPath(); ctx.ellipse(rx, ry, 8 + rnd() * 10, 5 + rnd() * 5, 0, 0, Math.PI * 2); ctx.fill(); }
      tree(w * 0.1, gy + 2, 12); tree(w * 0.88, gy + 2, 13); tree(w * 0.2, gy - 2, 8);
      break;
    }
    case 'spring': {
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.ellipse(w * 0.5, gy + 14, 50, 16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = mix('#1c3a44', '#5a8aa0', (1 - dark) * 0.5);
      ctx.beginPath(); ctx.ellipse(w * 0.5, gy + 14, 40, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = ink;
      ctx.fillRect(w * 0.5 - 60, gy - 30, 10, 44);
      ctx.fillRect(w * 0.5 - 60, gy - 30, 40, 6);
      tree(w * 0.12, gy + 2, 11); tree(w * 0.85, gy + 2, 12);
      break;
    }
    case 'military': {
      ctx.fillStyle = ink;
      ctx.fillRect(w * 0.3, gy - 30, w * 0.4, 38);
      ctx.beginPath(); ctx.moveTo(w * 0.3, gy - 30); ctx.quadraticCurveTo(w * 0.5, gy - 50, w * 0.7, gy - 30); ctx.closePath(); ctx.fill();
      ctx.fillRect(w * 0.8 - 1, gy - 110, 3, 118);
      for (let i = 0; i < 4; i++) ctx.fillRect(w * 0.8 - 10 + i * 2, gy - 100 + i * 12, 20 - i * 4, 2);
      ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, gy - 10); ctx.lineTo(w, gy - 10); ctx.stroke();
      for (let x = 10; x < w; x += 26) { ctx.beginPath(); ctx.moveTo(x, gy - 10); ctx.lineTo(x, gy + 6); ctx.stroke(); }
      ctx.fillStyle = warm;
      ctx.fillRect(w * 0.47, gy - 14, 16, 22);
      break;
    }
    case 'goal': {
      ctx.fillStyle = ink;
      for (const x of [0.15, 0.35, 0.6, 0.82]) { ctx.beginPath(); ctx.moveTo(w * x - 24, gy + 6); ctx.lineTo(w * x, gy - 26); ctx.lineTo(w * x + 24, gy + 6); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#ffe3a3';
      for (let i = 0; i < 12; i++) ctx.fillRect(20 + i * (w - 40) / 11, gy - 40 - (i % 3) * 6, 3, 3);
      break;
    }
  }
}

// ---------- 사물 표식 ----------

function objectPos(o: SceneObject, w: number, h: number): [number, number] {
  return [o.x * w, o.y * h];
}

export function hitObject(node: MapNode, w: number, h: number, px: number, py: number): SceneObject | null {
  let best: SceneObject | null = null;
  let bestD = 22 * 22;
  for (const o of visibleObjects(node)) {
    const [x, y] = objectPos(o, w, h);
    const d = (x - px) ** 2 + (y - py) ** 2;
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return best;
}

// 사물 표식. 안 쓴 것은 숨 쉬듯 커졌다 작아지고, 다 쓴 것은 흐리다
export function drawObjects(ctx: CanvasRenderingContext2D, node: MapNode, w: number, h: number, t: number, hover: SceneObject | null): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const o of visibleObjects(node)) {
    const [x, y] = objectPos(o, w, h);
    const pulse = o.used ? 0 : 0.5 + 0.5 * Math.sin(t * 0.004 + o.id);
    const r = o.used ? 6 : 8 + pulse * 2;
    const isHover = hover !== null && hover.id === o.id;
    if (!o.used) {
      ctx.beginPath();
      ctx.arc(x, y, r + 8 + pulse * 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(242, 199, 106, ${0.25 + pulse * 0.25})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = o.used ? 'rgba(160, 160, 160, 0.45)' : isHover ? '#ffe3a3' : '#f2c76a';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.stroke();
    if (isHover || !o.used) {
      const label = objectLabel(o) + (o.used ? ' · 다 봤다' : '');
      ctx.font = `${isHover ? 13 : 12}px "Noto Sans KR", "Malgun Gothic", sans-serif`;
      const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = 'rgba(8, 12, 20, 0.75)';
      ctx.fillRect(x - tw / 2, y - r - 26, tw, 20);
      ctx.fillStyle = isHover ? '#ffe3a3' : '#e8e4da';
      ctx.fillText(label, x, y - r - 16);
    }
  }
  const hidden = hiddenCount(node);
  if (hidden > 0) {
    ctx.font = '12px "Noto Sans KR", "Malgun Gothic", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(232, 228, 218, 0.7)';
    ctx.fillText('둘러보면 더 보일지도 모른다', w - 14, h - 14);
  }
}
