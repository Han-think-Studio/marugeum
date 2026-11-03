// 빠진 그림 세기. 코드가 찾는데 없는 그림과, docs/art-list-3.md 에 적었는데 아직 없는 그림
// 사용: node tools/art-missing.cjs
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const names = (dir) => new Set(fs.readdirSync(path.join(root, dir)).map((f) => f.replace(/\.(webp|png)$/, '')));
const art = names('public/art');
const store = names('store');

// 1) 코드가 찾는 그림
const want = new Map(); // 이름 → 설명
const add = (name, note) => { if (!want.has(name)) want.set(name, note); };
const src = rd('src/data/events.ts') + '\n' + rd('src/data/events-more.ts');
for (const b of src.split(/\n  \{\r?\n    id: /).slice(1)) {
  const id = b.match(/^'([a-z0-9_]+)'/)[1];
  const a = (b.match(/\n    art: '([a-z0-9_]+)'/) || [])[1];
  add(`event-${a || id}`, `사건 · ${(b.match(/title: '([^']+)'/) || [])[1]}`);
}
const types = rd('src/core/types.ts');
const union = (name) => types.slice(types.indexOf(`export type ${name} =`)).split(';')[0].match(/'([a-zA-Z]+)'/g).map((s) => s.slice(1, -1));
for (const k of union('EquipKind')) add(`equip-${k}`, '장비');
for (const k of union('ObjectKind')) add(`obj-${k}`, '사물');
for (const k of union('NodeKind')) add(`scene-${k}-wide`, '자리 종류 장면');
for (const m of rd('src/data/places.ts').matchAll(/\{ id: '([a-z_]+)'.*?name: '([^']+)'/g)) add(`scene-place-${m[1]}-wide`, `자리 장면 · ${m[2]}`);
for (const m of rd('src/ui/ui.ts').matchAll(/act\('[a-z]+', '([a-z]+)'/g)) add(`icon-${m[1]}`, '행동 아이콘');
for (const s of ['water', 'dirty', 'food', 'fresh', 'wood', 'gasoline', 'diesel', 'parts']) add(`supply-${s}`, '보급품');
for (const e of ['reunion', 'quarantine', 'names', 'stay']) add(`ending-${e}`, '엔딩');
for (const t of ['day', 'night', 'rain', 'fog', 'snow']) add(`travel-${t}`, '이동 전환');
for (const t of ['house', 'camp', 'fire', 'open']) add(`night-${t}`, '밤 전환');
for (const t of ['tent', 'cave', 'house']) add(`camp-${t}`, '거점 단계');
for (const t of ['window', 'earth', 'roof', 'hearth', 'windbreak']) add(`upgrade-${t}`, '보강');
const codeMissing = [...want].filter(([n]) => !art.has(n));

// 2) 3차 목록에 적은 그림
const listed = [...rd('docs/art-list-3.md').matchAll(/[\\/](public[\\/]art|store)[\\/]([a-z0-9_-]+)\.png/g)].map((m) => [m[1] === 'store' ? 'store' : 'art', m[2]]);
const listMissing = [...new Map(listed.map(([d, n]) => [d + '/' + n, [d, n]])).values()].filter(([d, n]) => !(d === 'store' ? store : art).has(n) && !want.has(n));

console.log(`코드가 찾는데 없는 그림 ${codeMissing.length}장`);
for (const [n, note] of codeMissing) console.log(`  ${n}.png  (${note})`);
console.log(`\n3차 목록에 적었는데 아직 없는 그림 ${listMissing.length}장 (넣으면 코드에 잇는다)`);
for (const [d, n] of listMissing) console.log(`  ${d === 'store' ? 'store/' : ''}${n}.png`);
