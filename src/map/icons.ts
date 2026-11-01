import type { NodeKind } from '../core/types';

// 자리 고유 그림. 종류 그림 대신 쓴다. 성삼재의 버스 정류장, 죽령의 터널, 천제단의 제단처럼
export type PlaceIcon = 'bus' | 'shop' | 'gondola' | 'buddha' | 'cairn' | 'barrier' | 'rail' | 'tunnel' | 'altar' | 'mine' | 'antenna' | 'truck' | 'checkpoint' | 'hotel' | 'stele';

// 지도 노드 아이콘. 글자 대신 작은 그림. 전부 선과 면으로 그린다
export function drawIcon(ctx: CanvasRenderingContext2D, kind: NodeKind | PlaceIcon, x: number, y: number, s: number, color: string): void {
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
    case 'bus': // 버스 정류장 표지. 기둥과 둥근 표지판
      ctx.beginPath(); ctx.moveTo(0, u * 0.9); ctx.lineTo(0, -u * 0.3); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -u * 0.5, u * 0.45, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-u * 0.25, -u * 0.62, u * 0.5, u * 0.22);
      break;
    case 'shop': // 휴게소. 지붕과 잔
      ctx.beginPath(); ctx.moveTo(-u, -u * 0.2); ctx.lineTo(0, -u * 0.9); ctx.lineTo(u, -u * 0.2); ctx.closePath(); ctx.fill();
      ctx.fillRect(-u * 0.8, -u * 0.2, u * 1.6, u * 0.25);
      ctx.fillRect(-u * 0.3, u * 0.15, u * 0.6, u * 0.6);
      ctx.beginPath(); ctx.moveTo(u * 0.3, u * 0.3); ctx.quadraticCurveTo(u * 0.75, u * 0.45, u * 0.3, u * 0.6); ctx.stroke();
      break;
    case 'gondola': // 케이블에 매달린 곤돌라
      ctx.beginPath(); ctx.moveTo(-u, -u * 0.8); ctx.lineTo(u, -u * 0.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -u * 0.65); ctx.lineTo(0, -u * 0.2); ctx.stroke();
      ctx.fillRect(-u * 0.45, -u * 0.2, u * 0.9, u * 0.8);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-u * 0.3, -u * 0.05, u * 0.6, u * 0.3);
      break;
    case 'buddha': // 서 있는 큰 불상의 실루엣
      ctx.beginPath(); ctx.arc(0, -u * 0.55, u * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-u * 0.5, u * 0.9); ctx.lineTo(-u * 0.35, -u * 0.2); ctx.lineTo(u * 0.35, -u * 0.2); ctx.lineTo(u * 0.5, u * 0.9); ctx.closePath(); ctx.fill();
      ctx.fillRect(-u * 0.75, u * 0.75, u * 1.5, u * 0.2);
      break;
    case 'cairn': // 돌탑
      for (let i = 0; i < 4; i++) {
        const wdt = u * (1.6 - i * 0.35);
        ctx.fillRect(-wdt / 2, u * 0.7 - i * u * 0.4, wdt, u * 0.32);
      }
      break;
    case 'barrier': // 길 막은 바리케이드
      ctx.beginPath(); ctx.moveTo(-u * 0.8, u * 0.7); ctx.lineTo(-u * 0.8, -u * 0.3); ctx.moveTo(u * 0.8, u * 0.7); ctx.lineTo(u * 0.8, -u * 0.3); ctx.stroke();
      ctx.fillRect(-u, -u * 0.5, u * 2, u * 0.3);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(-u * 0.6, -u * 0.5, u * 0.3, u * 0.3); ctx.fillRect(u * 0.1, -u * 0.5, u * 0.3, u * 0.3);
      break;
    case 'rail': // 철길 건널목
      ctx.beginPath(); ctx.moveTo(-u, u * 0.5); ctx.lineTo(u, u * 0.5); ctx.moveTo(-u, u * 0.85); ctx.lineTo(u, u * 0.85); ctx.stroke();
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * u * 0.4, u * 0.4); ctx.lineTo(i * u * 0.4, u * 0.95); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-u * 0.6, -u * 0.8); ctx.lineTo(u * 0.6, u * 0.1); ctx.moveTo(u * 0.6, -u * 0.8); ctx.lineTo(-u * 0.6, u * 0.1); ctx.stroke();
      break;
    case 'tunnel': // 터널 입구
      ctx.beginPath(); ctx.moveTo(-u, u * 0.8); ctx.lineTo(-u, 0); ctx.arc(0, 0, u, Math.PI, 0); ctx.lineTo(u, u * 0.8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.moveTo(-u * 0.6, u * 0.8); ctx.lineTo(-u * 0.6, u * 0.05); ctx.arc(0, u * 0.05, u * 0.6, Math.PI, 0); ctx.lineTo(u * 0.6, u * 0.8); ctx.closePath(); ctx.fill();
      break;
    case 'altar': // 돌 제단. 단과 그 위의 돌
      ctx.fillRect(-u, u * 0.4, u * 2, u * 0.35);
      ctx.fillRect(-u * 0.7, u * 0.05, u * 1.4, u * 0.35);
      ctx.fillRect(-u * 0.3, -u * 0.5, u * 0.6, u * 0.55);
      break;
    case 'mine': // 갱도 입구. 기둥 두 개와 들보
      ctx.fillRect(-u, -u * 0.6, u * 2, u * 0.25);
      ctx.fillRect(-u * 0.85, -u * 0.35, u * 0.3, u * 1.2);
      ctx.fillRect(u * 0.55, -u * 0.35, u * 0.3, u * 1.2);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-u * 0.55, -u * 0.35, u * 1.1, u * 1.2);
      break;
    case 'antenna': // 철탑
      ctx.beginPath(); ctx.moveTo(-u * 0.6, u * 0.9); ctx.lineTo(0, -u * 0.9); ctx.lineTo(u * 0.6, u * 0.9); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-u * 0.35, u * 0.2); ctx.lineTo(u * 0.35, u * 0.2); ctx.moveTo(-u * 0.2, -u * 0.3); ctx.lineTo(u * 0.2, -u * 0.3); ctx.stroke();
      break;
    case 'truck': // 군용 트럭 옆모습
      ctx.fillRect(-u, -u * 0.5, u * 1.3, u * 0.9);
      ctx.fillRect(u * 0.35, -u * 0.15, u * 0.65, u * 0.55);
      ctx.beginPath(); ctx.arc(-u * 0.55, u * 0.6, u * 0.28, 0, Math.PI * 2); ctx.arc(u * 0.55, u * 0.6, u * 0.28, 0, Math.PI * 2); ctx.fill();
      break;
    case 'checkpoint': // 차단기와 모래주머니
      ctx.fillRect(-u, u * 0.35, u * 0.9, u * 0.5);
      ctx.beginPath(); ctx.moveTo(u * 0.1, u * 0.85); ctx.lineTo(u * 0.1, -u * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(u * 0.1, -u * 0.2); ctx.lineTo(-u * 0.9, -u * 0.75); ctx.stroke();
      break;
    case 'hotel': // 큰 건물. 창 여러 개
      ctx.fillRect(-u, -u * 0.8, u * 2, u * 1.7);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ctx.fillRect(-u * 0.75 + c * u * 0.6, -u * 0.6 + r * u * 0.5, u * 0.3, u * 0.28);
      break;
    case 'stele': // 봉우리와 비석
      ctx.beginPath(); ctx.moveTo(-u, u * 0.8); ctx.lineTo(-u * 0.1, -u * 0.5); ctx.lineTo(u, u * 0.8); ctx.closePath(); ctx.fill();
      ctx.fillRect(u * 0.25, -u * 0.95, u * 0.3, u * 0.9);
      break;
  }
  ctx.restore();
}
