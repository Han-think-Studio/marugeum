import { EQUIP_INFO, SUPPLY_LABEL, type GameState, type SupplyKey } from '../core/types';
import { condOf, equipLabel, packCap, packWeight, weightLimit, weightPenalty } from '../game/state';

// 아래 패널 오른쪽 탭들. 길, 행동, 짐, 몸. 글 대신 칸과 색과 선으로 보여 준다
export type Tab = 'go' | 'act' | 'pack' | 'body';
export const TABS: [Tab, string][] = [['go', '길'], ['act', '행동'], ['pack', '짐'], ['body', '몸']];

const STATS: [keyof GameState['stats'], string][] = [
  ['hp', '체력'], ['hunger', '허기'], ['thirst', '갈증'], ['temp', '체온'], ['fatigue', '피로'], ['rad', '피폭'], ['mind', '정신'],
];

// 수치의 색. 초록은 괜찮음, 노랑은 조심, 빨강은 위험. 피폭은 거꾸로
export function statColor(k: string, v: number): string {
  const bad = k === 'rad' ? v >= 60 : v <= 15;
  const warn = k === 'rad' ? v >= 40 : v <= 35;
  return bad ? '#e07a5f' : warn ? '#d9a44a' : '#7fae8a';
}

export function bodyAlert(state: GameState): boolean {
  return STATS.some(([k]) => statColor(k, state.stats[k]) === '#e07a5f');
}

// 짐: 칸 그림. 찬 칸은 보급품 그림, 빈 칸은 테두리만
export function packHtml(state: GameState): string {
  const p = state.pack;
  const cap = packCap(state);
  const row = (label: string, total: number, parts: [SupplyKey, number][]) => {
    const cells: string[] = [];
    for (const [k, n] of parts) for (let i = 0; i < n; i++) cells.push(`<i class="cell full" title="${SUPPLY_LABEL[k]}"><img src="./art/supply-${k}.webp" alt=""></i>`);
    const used = parts.reduce((a, [, n]) => a + n, 0);
    for (let i = used; i < total; i++) cells.push('<i class="cell"></i>');
    return `<div class="prow"><span class="pl">${label} <small>${used}/${total}</small></span><span class="cells">${cells.join('')}</span></div>`;
  };
  const wt = packWeight(state);
  const lim = weightLimit(state);
  const pen = weightPenalty(state);
  const wpct = Math.min(100, Math.round((wt / (lim * 1.5)) * 100));
  const limPct = Math.round((lim / (lim * 1.5)) * 100);
  const gear = state.equip.map((e) => {
    const c = condOf(e);
    const ring = c === null ? '' : ` style="--c:${Math.round(c)}"`;
    return `<div class="gtile${e.broken ? ' broken' : ''}${c !== null ? ' worn' : ''}"${ring} title="${equipLabel(e)} · ${EQUIP_INFO[e.kind].desc}">` +
      `<img src="./art/equip-${e.kind}.webp" alt="" onerror="this.remove()">` +
      `${e.charges !== undefined ? `<b class="ch">×${e.charges}</b>` : ''}${c !== null && !e.broken ? `<b class="cd">${Math.round(c)}%</b>` : ''}${e.broken ? '<b class="bk">고장</b>' : ''}` +
      `<span>${EQUIP_INFO[e.kind].label}</span></div>`;
  }).join('');
  return `<div class="packgrid"><div class="pcol">` +
    row('물', cap.water, [['water', p.water], ['dirty', p.dirty]]) +
    row('먹을 것', cap.food, [['food', p.food], ['fresh', p.fresh]]) +
    row('땔감', cap.wood, [['wood', p.wood]]) +
    row('기름', cap.fuel, [['gasoline', p.gasoline], ['diesel', p.diesel]]) +
    row('부품', cap.parts, [['parts', p.parts]]) +
    `<div class="prow"><span class="pl">무게 <small>${wt}/${lim}${pen ? ` · 이동 +${pen}시간` : ''}</small></span><span class="wbar"><i style="width:${wpct}%" class="${pen ? 'over' : ''}"></i><b style="left:${limPct}%"></b></span></div>` +
    `</div><div class="gcol">${gear || '<p class="muted">지닌 장비가 없다.</p>'}</div></div>` +
    `<p class="muted packfoot">C 짐 정리 · 거점 화면. 고리는 장비 상태, ×는 남은 횟수.</p>`;
}

// 몸: 사람 그림의 색과 지난 이틀의 선
export function bodyHtml(state: GameState): string {
  const s = state.stats;
  const col = (k: keyof GameState['stats']) => statColor(k, s[k]);
  const cold = Math.max(0, Math.min(1, (70 - s.temp) / 50));
  const outline = `rgb(${Math.round(232 - cold * 126)}, ${Math.round(228 - cold * 60)}, ${Math.round(218 + cold * 37)})`;
  const radA = Math.min(0.75, s.rad / 110);
  const figure = `<svg class="figure" viewBox="0 0 120 220" aria-label="몸 상태">
    <defs><radialGradient id="aura"><stop offset="0" stop-color="rgba(170,200,60,${radA})"/><stop offset="1" stop-color="rgba(170,200,60,0)"/></radialGradient></defs>
    <ellipse cx="60" cy="110" rx="58" ry="105" fill="url(#aura)"/>
    <g stroke="${outline}" stroke-width="${3 + cold * 3}" stroke-linejoin="round">
      <circle cx="60" cy="30" r="18" fill="${col('mind')}"/>
      <path d="M48 52 L72 52 L76 58 L60 66 L44 58 Z" fill="${col('thirst')}"/>
      <rect x="36" y="62" width="48" height="66" rx="10" fill="${col('hp')}"/>
      <circle cx="60" cy="108" r="11" fill="${col('hunger')}" stroke-width="2"/>
      <rect x="22" y="66" width="12" height="56" rx="6" fill="${col('fatigue')}"/>
      <rect x="86" y="66" width="12" height="56" rx="6" fill="${col('fatigue')}"/>
      <rect x="40" y="130" width="17" height="70" rx="7" fill="${col('fatigue')}"/>
      <rect x="63" y="130" width="17" height="70" rx="7" fill="${col('fatigue')}"/>
    </g></svg>`;
  const hist = state.history ?? [];
  const lines = STATS.map(([k, label], i) => {
    const pts = hist.slice(-48).map((h, j, a) => `${(j / Math.max(1, a.length - 1)) * 150},${24 - (h[i + 1] / 100) * 22}`).join(' ');
    const day = hist.length > 24 ? hist[hist.length - 25][i + 1] : hist.length ? hist[0][i + 1] : s[k];
    const d = Math.round(s[k] - day);
    const worse = k === 'rad' ? d > 0 : d < 0;
    const band = k === 'rad' ? '<rect x="0" y="0" width="150" height="10" fill="rgba(224,122,95,0.12)"/>' : '<rect x="0" y="18" width="150" height="8" fill="rgba(224,122,95,0.12)"/>';
    return `<div class="sline"><span class="sl">${label}</span><svg viewBox="0 0 150 26" preserveAspectRatio="none">${band}${pts ? `<polyline points="${pts}" fill="none" stroke="${col(k)}" stroke-width="1.8"/>` : ''}</svg>` +
      `<b style="color:${col(k)}">${Math.round(s[k])}</b><small class="${d === 0 ? '' : worse ? 'bad' : 'good'}">${d > 0 ? '▲' : d < 0 ? '▼' : '·'}${d !== 0 ? Math.abs(d) : ''}</small></div>`;
  }).join('');
  return `<div class="bodygrid">${figure}<div class="slines"><p class="muted">지난 이틀 · 오른쪽 숫자는 하루 전보다</p>${lines}</div></div>` +
    `<p class="muted bodyfoot">머리 정신 · 목 갈증 · 몸통 체력 · 배 허기 · 팔다리 피로 · 테두리가 파래지면 추위 · 둘레의 누런 빛은 피폭</p>`;
}
