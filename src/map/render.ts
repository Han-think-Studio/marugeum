import { SUPPLY_KEYS, SUPPLY_LABEL, edgeKey, type GameState, type MapNode } from '../core/types';
import { drawIcon } from './icons';
import { campLabel, clueFoundPlaces, neighbors } from '../game/state';
import { isNight } from '../game/weather';
import { REGIONS, STAGES } from './generate';
import { placeById } from '../data/places';

export interface View {
  w: number;
  h: number;
  padX: number;
  padRight: number; // 오른쪽 여백. 지도 옆 목록이 열려 있으면 넓다
  padTop: number;
  padBottom: number;
}

export function makeView(w: number, h: number): View {
  return { w, h, padX: 36, padRight: 36, padTop: 28, padBottom: 24 };
}

export function toPx(v: View, n: MapNode): [number, number] {
  const x = v.padX + n.x * (v.w - v.padX - v.padRight);
  const y = v.padTop + n.y * (v.h - v.padTop - v.padBottom);
  return [x, y];
}

export function hitTest(state: GameState, v: View, px: number, py: number): MapNode | null {
  let best: MapNode | null = null;
  let bestD = 18 * 18;
  for (const n of state.nodes) {
    const [x, y] = toPx(v, n);
    const d = (x - px) ** 2 + (y - py) ** 2;
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

function ridgeLine(state: GameState, v: View): [number, number][] {
  // 단계마다 가장 높은 노드를 이어 능선 실루엣을 만든다
  const pts: [number, number][] = [];
  const perStage: MapNode[] = [];
  for (const n of state.nodes) {
    const cur = perStage[n.stage];
    if (!cur || n.alt > cur.alt) perStage[n.stage] = n;
  }
  pts.push([0, v.h * 0.62]);
  for (let s = 0; s < STAGES; s++) {
    const n = perStage[s];
    const [x, y] = toPx(v, n);
    if (s > 0) {
      const [px, py] = pts[pts.length - 1];
      // 봉우리 사이에 안장을 하나 넣어 들쭉날쭉하게
      const saddleY = Math.max(py, y) + (v.h * 0.05 + ((s * 7919) % 13) * 1.5);
      pts.push([(px + x) / 2, saddleY]);
    }
    pts.push([x, y + 10]);
  }
  pts.push([v.w, v.h * 0.62]);
  return pts;
}

export function drawMap(ctx: CanvasRenderingContext2D, state: GameState, v: View, hover: MapNode | null): void {
  const { w, h } = v;
  ctx.clearRect(0, 0, w, h);

  // 하늘. 시간에 따라 밝기가 바뀐다
  const dark = darkness(state.hour);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, mix('#0c1320', '#3a5a8a', 1 - dark));
  sky.addColorStop(0.6, mix('#1a2538', '#6d8fb8', 1 - dark));
  sky.addColorStop(1, mix('#2a2f33', '#9fb3c8', 1 - dark));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  if (state.weather === 'cloud' || state.weather === 'rain') {
    ctx.fillStyle = `rgba(40, 45, 55, ${state.weather === 'rain' ? 0.45 : 0.3})`;
    ctx.fillRect(0, 0, w, h);
  }

  // 먼 산 (한 겹 뒤)
  const ridge = ridgeLine(state, v);
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (const [x, y] of ridge) ctx.lineTo(x, y - 26);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = '#1f2b3d';
  ctx.fill();

  // 능선 본체
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (const [x, y] of ridge) ctx.lineTo(x, y);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = '#131a24';
  ctx.fill();

  // 저지대 오염 안개
  const haze = ctx.createLinearGradient(0, h * 0.55, 0, h);
  haze.addColorStop(0, 'rgba(150, 170, 60, 0)');
  haze.addColorStop(1, 'rgba(160, 180, 50, 0.32)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);

  const cur = state.nodes[state.nodeId];
  const nextIds = new Set(neighbors(state).map((n) => n.id));
  const found = new Set(clueFoundPlaces(state));

  // 지역 띠. 단계마다 번갈아 밝고, 위에 지역 이름
  ctx.font = '11px "Noto Sans KR", "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let s = 0; s < STAGES; s++) {
    const x0 = v.padX + (s / STAGES) * (w - v.padX - v.padRight);
    const x1 = v.padX + ((s + 1) / STAGES) * (w - v.padX - v.padRight);
    if (s % 2 === 1) { ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(x0, 0, x1 - x0, h); }
    ctx.fillStyle = state.knownStages.includes(s) || state.nodes.some((n) => n.stage === s && n.visited) ? 'rgba(255, 227, 163, 0.8)' : 'rgba(255,255,255,0.3)';
    ctx.fillText(REGIONS[s], (x0 + x1) / 2, 12);
  }

  // 연결선. 아는 길은 실선, 모르는 길은 희미한 점선, 지금 갈 수 있는 길은 노란색
  for (const n of state.nodes) {
    const [x1, y1] = toPx(v, n);
    for (const id of n.links) {
      const m = state.nodes[id];
      const [x2, y2] = toPx(v, m);
      const known = !!state.known[edgeKey(n.id, m.id)];
      const open = n.id === cur.id || m.id === cur.id;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = open ? 2.2 : known ? 2 : 1;
      ctx.strokeStyle = open ? 'rgba(255, 214, 120, 0.9)' : known ? 'rgba(220, 220, 220, 0.7)' : 'rgba(255,255,255,0.16)';
      ctx.setLineDash(open && !known ? [6, 4] : known ? [] : [3, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // 노드
  ctx.font = '12px "Noto Sans KR", "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const n of state.nodes) {
    const [x, y] = toPx(v, n);
    const isCur = n.id === cur.id;
    const isNext = nextIds.has(n.id);
    const r = isCur ? 14 : isNext ? 12 : 9;

    if (isCur) {
      ctx.beginPath();
      ctx.arc(x, y, r + 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 214, 120, 0.18)';
      ctx.fill();
    }
    if (hover && hover.id === n.id && isNext) {
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = isCur ? '#f2c76a' : n.visited ? '#8d8f94' : isNext ? '#e6e1d6' : '#3b4452';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = isCur || isNext ? '#111' : 'rgba(255,255,255,0.25)';
    ctx.stroke();

    drawIcon(ctx, placeById(n.place).icon ?? n.kind, x, y, r * 0.55, isCur || isNext ? '#111' : '#cfd3d9');

    // 찾은 흔적. 사진 모양
    if (found.has(n.place)) {
      ctx.fillStyle = '#ffe3a3';
      ctx.fillRect(x + r - 3, y + r - 4, 11, 9);
      ctx.fillStyle = '#111';
      ctx.fillRect(x + r - 1, y + r - 2, 7, 5);
      ctx.fillStyle = '#ffe3a3';
      ctx.fillRect(x + r + 1, y + r - 1, 3, 3);
    }

    // 불 표시
    if (state.fire && state.fire.nodeId === n.id) {
      ctx.beginPath();
      ctx.arc(x - r - 6, y - r - 4, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#f0a050';
      ctx.fill();
    }

    // 두고 간 장비 표시
    if (!n.camp && n.equip.length > 0) {
      ctx.fillStyle = 'rgba(232, 228, 218, 0.8)';
      ctx.fillRect(x + r + 3, y - 3, 6, 6);
    }

    // 흔적이 있을 법한 자리. 가족의 쪽지와 사람들의 말이 가리킨 곳
    if (state.marked.includes(n.place) && !n.visited) {
      ctx.beginPath();
      ctx.moveTo(x, y - r - 16);
      ctx.lineTo(x + 6, y - r - 9);
      ctx.lineTo(x, y - r - 2);
      ctx.lineTo(x - 6, y - r - 9);
      ctx.closePath();
      ctx.fillStyle = '#f2c76a';
      ctx.fill();
    }

    // 안정된 자리 표시. 작은 점
    if (n.secured && !n.camp) {
      ctx.beginPath();
      ctx.arc(x + r + 6, y - r - 4, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#7fae8a';
      ctx.fill();
    }

    // 거점 표시. 텐트는 삼각, 바위굴은 반원, 집은 깃발
    if (n.camp) {
      ctx.fillStyle = '#f2c76a';
      ctx.beginPath();
      if (n.campTier === 1) { ctx.moveTo(x + r + 1, y - r - 2); ctx.lineTo(x + r + 7, y - r - 13); ctx.lineTo(x + r + 13, y - r - 2); }
      else if (n.campTier === 2) { ctx.arc(x + r + 7, y - r - 2, 6, Math.PI, 0); }
      else { ctx.moveTo(x + r + 2, y - r - 2); ctx.lineTo(x + r + 2, y - r - 14); ctx.lineTo(x + r + 12, y - r - 10); }
      ctx.closePath();
      ctx.fill();
    }

    const marked = state.marked.includes(n.place);
    if (isCur || isNext || n.kind === 'goal' || n.camp || n.scouted || marked || n.visited) {
      const remembered = state.knownStages.includes(n.stage) || n.scouted || marked;
      ctx.font = '12px "Noto Sans KR", "Malgun Gothic", sans-serif';
      ctx.fillStyle = isCur ? '#ffe3a3' : n.visited || remembered ? '#e8e8e8' : 'rgba(232,232,232,0.75)';
      ctx.fillText(n.visited || isCur || remembered ? n.name : `${n.name.split(' ')[0]} ?`, x, y - r - 10);
    }
  }

  // 비와 안개
  if (state.weather === 'rain') {
    ctx.strokeStyle = 'rgba(200, 220, 255, 0.35)';
    ctx.lineWidth = 1;
    const slant = state.wind === 'E' ? -6 : state.wind === 'W' ? 6 : 2;
    for (let i = 0; i < 140; i++) {
      const rx = ((i * 97) % w) + ((state.hour * 13) % 17);
      const ry = ((i * 61 + state.day * 7) % h);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + slant, ry + 14);
      ctx.stroke();
    }
  } else if (state.weather === 'fog') {
    ctx.fillStyle = 'rgba(200, 205, 210, 0.28)';
    ctx.fillRect(0, 0, w, h);
  }

  // 방향과 바람, 범례
  ctx.font = '11px "Noto Sans KR", "Malgun Gothic", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.textAlign = 'left';
  ctx.fillText(`남 · 지리산${state.wind !== 'calm' ? (state.wind === 'E' ? '   동풍 ◀' : '   ▶ 서풍') : ''}`, 10, h - 10);
  ctx.textAlign = 'right';
  ctx.fillText('북 · 향로봉', w - 10, h - 10);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('◆ 흔적 ?   ▣ 찾은 흔적   ● 안정   ⚑ 거점   ▪ 둔 물건   ― 아는 길   ┄ 모르는 길', w / 2, h - 10);

  // 가리킨 자리의 말풍선. 가 봤거나 정찰했거나 표시된 자리면 아는 만큼 보여 준다
  if (hover) drawTip(ctx, state, v, hover, found);
}

function drawTip(ctx: CanvasRenderingContext2D, state: GameState, v: View, n: MapNode, found: Set<string>): void {
  const known = n.visited || n.scouted || state.marked.includes(n.place) || state.knownStages.includes(n.stage) || n.kind === 'goal' || n.kind === 'start';
  const lines: string[] = [];
  const kindName = placeById(n.place).name;
  lines.push(known ? kindName : `${n.name.split(' ')[0]} ? · ${REGIONS[n.stage]}`);
  if (n.visited || n.scouted) {
    const water = n.waterLeft !== 0 || ['spring', 'valley', 'temple', 'village'].includes(n.kind);
    const objs = n.objects.filter((o) => !o.hidden && !o.used).length;
    lines.push(`${water ? '물 있음' : '물 없음'} · 사물 ${objs}${n.cave ? ' · 바위굴' : ''}${n.secured ? ' · 안정' : ''}`);
  } else if (known) lines.push(state.marked.includes(n.place) ? '가족의 흔적이 있을지도' : '가 본 적 없음');
  if (n.camp && n.store) lines.push(`${campLabel(n)} · ${SUPPLY_KEYS.filter((k) => n.store![k] > 0).map((k) => `${SUPPLY_LABEL[k]} ${n.store![k]}`).join(' ') || '저장고 비었다'}`);
  if (n.equip.length) lines.push(`${n.camp ? '거점 장비' : '둔 장비'} ${n.equip.length}: ${n.equip.map((e) => e.kind).slice(0, 4).join(', ')}`);
  if (found.has(n.place)) lines.push('찾은 흔적');
  if (state.deadAt.includes(n.place)) lines.push('지난 여정이 여기서 끝났다');
  const [x, y] = toPx(v, n);
  ctx.font = '12px "Noto Sans KR", "Malgun Gothic", sans-serif';
  const wd = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
  const ht = lines.length * 17 + 10;
  let bx = x + 16;
  let by = y - ht / 2;
  if (bx + wd > v.w - 4) bx = x - 16 - wd;
  by = Math.max(4, Math.min(v.h - ht - 4, by));
  ctx.fillStyle = 'rgba(10, 14, 20, 0.92)';
  ctx.fillRect(bx, by, wd, ht);
  ctx.strokeStyle = 'rgba(242, 199, 106, 0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, wd - 1, ht - 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => {
    ctx.fillStyle = i === 0 ? '#ffe3a3' : '#e8e4da';
    ctx.fillText(l, bx + 8, by + 13 + i * 17);
  });
}

// 0 낮 .. 1 깊은 밤
export function darkness(hour: number): number {
  if (isNight(hour)) return hour >= 22 || hour < 4 ? 1 : 0.8;
  if (hour < 7) return 0.55;
  if (hour < 9) return 0.25;
  if (hour < 17) return 0.1;
  if (hour < 19) return 0.35;
  return 0.6;
}

export function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
