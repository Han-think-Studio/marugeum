import type { NodeKind } from '../core/types';

// 지도 노드 아이콘. 글자 대신 작은 그림. 전부 선과 면으로 그린다
export function drawIcon(ctx: CanvasRenderingContext2D, kind: NodeKind, x: number, y: number, s: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, s * 0.18);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const u = s; // 반지름 정도의 크기
  switch (kind) {
    case 'start': // 텐트
      ctx.beginPath();
      ctx.moveTo(-u, u * 0.6); ctx.lineTo(0, -u * 0.7); ctx.lineTo(u, u * 0.6); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.moveTo(-u * 0.3, u * 0.6); ctx.lineTo(0, -u * 0.1); ctx.lineTo(u * 0.3, u * 0.6); ctx.closePath(); ctx.fill();
      break;
    case 'peak': // 봉우리
      ctx.beginPath();
      ctx.moveTo(-u, u * 0.7); ctx.lineTo(-u * 0.2, -u * 0.8); ctx.lineTo(u * 0.2, -u * 0.2); ctx.lineTo(u * 0.5, -u * 0.5); ctx.lineTo(u, u * 0.7); ctx.closePath();
      ctx.fill();
      break;
    case 'pass': // 고개. 양쪽 비탈과 가운데 길
      ctx.beginPath();
      ctx.moveTo(-u, -u * 0.6); ctx.lineTo(-u * 0.2, u * 0.3); ctx.lineTo(u * 0.2, u * 0.3); ctx.lineTo(u, -u * 0.6);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-u * 0.5, u * 0.7); ctx.lineTo(u * 0.5, u * 0.7); ctx.stroke();
      break;
    case 'temple': // 기와지붕
      ctx.beginPath();
      ctx.moveTo(-u, -u * 0.1); ctx.quadraticCurveTo(0, -u * 0.9, u, -u * 0.1); ctx.lineTo(u * 0.7, -u * 0.05); ctx.lineTo(0, -u * 0.5); ctx.lineTo(-u * 0.7, -u * 0.05); ctx.closePath();
      ctx.fill();
      ctx.fillRect(-u * 0.55, -u * 0.05, u * 1.1, u * 0.7);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-u * 0.15, u * 0.15, u * 0.3, u * 0.5);
      break;
    case 'shelter': // 오두막
      ctx.beginPath();
      ctx.moveTo(-u, 0); ctx.lineTo(0, -u * 0.85); ctx.lineTo(u, 0); ctx.closePath(); ctx.fill();
      ctx.fillRect(-u * 0.7, 0, u * 1.4, u * 0.7);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-u * 0.15, u * 0.15, u * 0.3, u * 0.55);
      break;
    case 'village': // 집 두 채
      ctx.beginPath(); ctx.moveTo(-u, -u * 0.1); ctx.lineTo(-u * 0.55, -u * 0.6); ctx.lineTo(-u * 0.1, -u * 0.1); ctx.closePath(); ctx.fill();
      ctx.fillRect(-u * 0.9, -u * 0.1, u * 0.7, u * 0.7);
      ctx.beginPath(); ctx.moveTo(u * 0.05, u * 0.1); ctx.lineTo(u * 0.5, -u * 0.45); ctx.lineTo(u, u * 0.1); ctx.closePath(); ctx.fill();
      ctx.fillRect(u * 0.15, u * 0.1, u * 0.7, u * 0.6);
      break;
    case 'valley': // 물결
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-u, i * u * 0.45);
        ctx.quadraticCurveTo(-u * 0.5, i * u * 0.45 - u * 0.3, 0, i * u * 0.45);
        ctx.quadraticCurveTo(u * 0.5, i * u * 0.45 + u * 0.3, u, i * u * 0.45);
        ctx.stroke();
      }
      break;
    case 'spring': // 물방울
      ctx.beginPath();
      ctx.moveTo(0, -u * 0.9);
      ctx.quadraticCurveTo(u * 0.9, u * 0.1, 0, u * 0.8);
      ctx.quadraticCurveTo(-u * 0.9, u * 0.1, 0, -u * 0.9);
      ctx.fill();
      break;
    case 'military': // 벙커와 안테나
      ctx.fillRect(-u * 0.9, -u * 0.1, u * 1.8, u * 0.8);
      ctx.beginPath(); ctx.moveTo(u * 0.3, -u * 0.1); ctx.lineTo(u * 0.3, -u * 0.9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(u * 0.05, -u * 0.75); ctx.lineTo(u * 0.55, -u * 0.75); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-u * 0.5, u * 0.15, u * 0.5, u * 0.3);
      break;
    case 'goal': // 별
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? u : u * 0.45;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      break;
  }
  ctx.restore();
}
