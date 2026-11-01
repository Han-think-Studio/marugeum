// 이벤트 데이터 검사. 막다른 선택지, 중복 id, 단계 범위, 확률 결과 꼴을 잡는다
// 사용: npm run check:events
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const outDir = path.join(__dirname, '..', '.tmp-events');
fs.rmSync(outDir, { recursive: true, force: true });
execSync(`npx tsc src/data/events.ts src/data/events-more.ts src/data/objects.ts src/data/places.ts --outDir ${outDir} --module commonjs --target es2020 --moduleResolution node --skipLibCheck --esModuleInterop`, { stdio: 'inherit' });
fs.writeFileSync(path.join(outDir, 'package.json'), '{"type":"commonjs"}');
const dataDir = fs.existsSync(path.join(outDir, 'data')) ? path.join(outDir, 'data') : outDir;
const { EVENTS } = require(path.join(dataDir, 'events.js'));
const { MORE_EVENTS } = require(path.join(dataDir, 'events-more.js'));
const { OBJECT_EVENTS, PLACE_OBJECTS } = require(path.join(dataDir, 'objects.js'));
const { PLACES, STAGES } = require(path.join(dataDir, 'places.js'));
const placeIds = new Set(PLACES.map((p) => p.id));
const all = [...EVENTS, ...MORE_EVENTS, ...OBJECT_EVENTS];
const problems = [];
const ids = new Set();
for (const e of all) {
  if (ids.has(e.id)) problems.push(`${e.id}: 중복 id`);
  ids.add(e.id);
  if (!e.choices || e.choices.length === 0) problems.push(`${e.id}: 선택지 없음`);
  if (e.choices && !e.choices.some((c) => !c.req)) problems.push(`${e.id}: 모든 선택지에 조건이 있어 막힐 수 있다`);
  for (const c of e.choices || []) {
    if (!c.outcomes || c.outcomes.length === 0) problems.push(`${e.id}/${c.text}: 결과 없음`);
    const last = c.outcomes[c.outcomes.length - 1];
    if (last && last.chance !== undefined) problems.push(`${e.id}/${c.text}: 마지막 결과에 chance 가 있다 (기본 결과가 없다)`);
    for (const o of c.outcomes || []) {
      if (o.chance !== undefined && (o.chance <= 0 || o.chance > 1)) problems.push(`${e.id}/${c.text}: chance ${o.chance}`);
      if (!o.text) problems.push(`${e.id}/${c.text}: 결과 문장 없음`);
    }
  }
  const w = e.when || {};
  if (w.stages && w.stages.some((s) => s < 0 || s >= STAGES)) problems.push(`${e.id}: 단계 범위 밖 ${w.stages}`);
  if (w.places) for (const p of w.places) if (!placeIds.has(p)) problems.push(`${e.id}: 없는 자리 ${p}`);
  if (e.trigger === 'arrive' && (w.stages || w.kinds || w.places) && !PLACES.some((p) => (!w.stages || w.stages.includes(p.stage)) && (!w.kinds || w.kinds.includes(p.kind)) && (!w.places || w.places.includes(p.id)))) problems.push(`${e.id}: 조건에 맞는 자리가 지도에 없다`);
  if (e.trigger === 'object' && !e.id.startsWith('obj_')) problems.push(`${e.id}: object 이벤트 id 는 obj_ 로 시작`);
  if (w.minClues !== undefined && w.maxClues !== undefined && w.minClues > w.maxClues) problems.push(`${e.id}: 단서 조건 모순`);
}
// 사물 종류마다 이벤트가 있는지
for (const kind of Object.keys(PLACE_OBJECTS)) {
  for (const o of PLACE_OBJECTS[kind].pool) {
    if (!ids.has(`obj_${o.kind}`)) problems.push(`사물 ${o.kind}: obj_${o.kind} 이벤트가 없다`);
  }
}
// 향로봉 엔딩이 모든 경우를 덮는지 (단서 0..11 × 피폭 0..100)
const goals = all.filter((e) => e.when && e.when.kinds && e.when.kinds.includes('goal'));
for (let clues = 0; clues <= 11; clues++) {
  for (const rad of [0, 30, 59, 60, 80, 100]) {
    const ok = goals.some((g) => {
      const w = g.when;
      if (w.minClues !== undefined && clues < w.minClues) return false;
      if (w.maxClues !== undefined && clues > w.maxClues) return false;
      if (w.minRad !== undefined && rad < w.minRad) return false;
      if (w.maxRad !== undefined && rad > w.maxRad) return false;
      return true;
    });
    if (!ok) problems.push(`향로봉: 단서 ${clues} 피폭 ${rad} 에 맞는 엔딩이 없다`);
  }
}
fs.rmSync(outDir, { recursive: true, force: true });
console.log(`이벤트 ${all.length}편 (이야기 ${EVENTS.length + MORE_EVENTS.length}, 사물 ${OBJECT_EVENTS.length}) · 자리 ${PLACES.length}곳 · 자리에 묶인 사건 ${all.filter((e) => e.when && e.when.places).length}편`);
if (problems.length) {
  console.log('문제:');
  for (const p of problems) console.log(' -', p);
  process.exit(1);
}
console.log('문제 없음');
