// 그림 찾기. 후보 경로를 차례로 시험해 처음 열리는 것을 기억한다. 없는 그림을 매번 다시 찾지 않는다
const found = new Map<string, string | null>();
const waiting = new Map<string, (() => void)[]>();

export function resolveArt(key: string, candidates: string[], onReady?: () => void): string | null {
  if (found.has(key)) return found.get(key) ?? null;
  const list = waiting.get(key);
  if (list) {
    if (onReady) list.push(onReady);
    return null;
  }
  waiting.set(key, onReady ? [onReady] : []);
  const tryAt = (i: number) => {
    if (i >= candidates.length) return done(null);
    const img = new Image();
    img.onload = () => done(candidates[i]);
    img.onerror = () => tryAt(i + 1);
    img.src = candidates[i];
  };
  const done = (src: string | null) => {
    found.set(key, src);
    const cbs = waiting.get(key) ?? [];
    waiting.delete(key);
    for (const cb of cbs) cb();
  };
  tryAt(0);
  return null;
}

// 행동 아이콘. 전용 아이콘(icon-*.webp)이 없으면 비슷한 그림을, 그것도 없으면 글자 하나
const ICON_FALLBACK: Record<string, string> = {
  eat: 'supply-food', drink: 'supply-water', fill: 'supply-water', rest: 'upgrade-hearth', sleep: 'camp-tent', photo: 'photo-family',
  wood: 'supply-wood', fire: 'equip-matches', boil: 'supply-dirty', look: 'mark-secured', camp: 'camp-tent', windbreak: 'upgrade-windbreak',
  base: 'camp-house', maintain: 'equip-tools', deposit: 'camp-house', withdraw: 'camp-house', iodine: 'equip-iodine', medkit: 'equip-medkit',
  purifier: 'equip-purifier', radio: 'equip-radio', cook: 'supply-fresh',
};

export function iconHtml(id: string, glyph: string, onReady?: () => void): string {
  const fb = ICON_FALLBACK[id];
  const src = resolveArt(`icon:${id}`, [`./art/icon-${id}.webp`, ...(fb ? [`./art/${fb}.webp`] : [])], onReady);
  return `<span class="ico">${src ? `<img src="${src}" alt="">` : `<b class="glyph">${glyph}</b>`}</span>`;
}
