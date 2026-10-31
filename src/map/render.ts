import { KIND_GLYPH, type GameState, type MapNode } from '../core/types';
import { STAGES } from './generate';

export interface View {
  w: number;
  h: number;
  padX: number;
  padTop: number;
  padBottom: number;
}

export function makeView(w: number, h: number): View {
  return { w, h, padX: 36, padTop: 28, padBottom: 24 };
}

export function toPx(v: View, n: MapNode): [number, number] {
  const x = v.padX + n.x * (v.w - v.padX * 2);
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

  // 하늘
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#0c1320');
  sky.addColorStop(0.6, '#1a2538');
  sky.addColorStop(1, '#2a2f33');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

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
  const nextIds = new Set(cur.links);

  // 연결선
  for (const n of state.nodes) {
    const [x1, y1] = toPx(v, n);
    for (const id of n.links) {
      const m = state.nodes[id];
      const [x2, y2] = toPx(v, m);
      const walked = n.visited && m.visited;
      const open = n.id === cur.id;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = open ? 2.2 : walked ? 2 : 1;
      ctx.strokeStyle = open ? 'rgba(255, 214, 120, 0.9)' : walked ? 'rgba(220, 220, 220, 0.75)' : 'rgba(255,255,255,0.18)';
      ctx.setLineDash(open ? [6, 4] : []);
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

    ctx.fillStyle = isCur || isNext ? '#111' : '#cfd3d9';
    ctx.font = `${isCur ? 13 : 11}px "Noto Sans KR", "Malgun Gothic", sans-serif`;
    ctx.fillText(KIND_GLYPH[n.kind], x, y + 1);

    if (isCur || isNext || n.kind === 'goal') {
      ctx.font = '12px "Noto Sans KR", "Malgun Gothic", sans-serif';
      ctx.fillStyle = isCur ? '#ffe3a3' : '#e8e8e8';
      ctx.fillText(n.name, x, y - r - 10);
    }
  }

  // 방향 표시
  ctx.font = '11px "Noto Sans KR", "Malgun Gothic", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.textAlign = 'left';
  ctx.fillText('남 · 지리산', 10, h - 10);
  ctx.textAlign = 'right';
  ctx.fillText('북 · 향로봉', w - 10, h - 10);
}