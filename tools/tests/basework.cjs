const { chromium } = require('playwright');
// 거점의 손일: 올무(놓고 열 시간 뒤 보기), 훈연(신선식 → 보존식), 숯·모래 정수기(보강, 불 없이 거르기)
const PORT = Number(process.env.TEST_PORT || 4174);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const log = []; const fail = [];
  const check = (name, cond) => { log.push(`${cond ? 'ok ' : 'FAIL'} ${name}`); if (!cond) fail.push(name); };
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('marugeum.settings.v1', JSON.stringify({ difficulty: 'normal', handwork: false, slides: false })); });
  await page.goto(`http://localhost:${PORT}/?seed=42`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { const g = window.marugeum; const s = g.state; while (s.event) { if (s.event.result === null) g.pickChoice(s, 0); g.dismissEvent(s); } g.render(); });
  const fresh = () => page.evaluate(() => { const s = window.marugeum.state; s.stats = { hp: 100, hunger: 90, thirst: 90, temp: 100, fatigue: 100, rad: 0, mind: 80 }; s.crisis = null; s.weather = 'clear'; s.event = null; s.standoff = null; });

  // 1) 올무: 밧줄로 놓고, 열 시간 전에는 못 보고, 열 시간 뒤에 본다. 여러 번 보면 한 번은 잡힌다
  await fresh();
  const snare = await page.evaluate(() => {
    const g = window.marugeum; const s = g.state; const n = g.currentNode(s);
    s.equip = s.equip.filter((e) => e.kind !== 'rope'); s.equip.push({ kind: 'rope', broken: false });
    const can = g.canSetSnare(s); g.setSnare(s); const set = n.snare !== null;
    const early = g.snareReady(s);
    const results = [];
    for (let i = 0; i < 12; i++) {
      s.stats = { hp: 100, hunger: 90, thirst: 90, temp: 100, fatigue: 100, rad: 0, mind: 80 }; s.event = null;
      if (n.snare === null) g.setSnare(s);
      n.snare -= 10; s.pack.food = 0; s.pack.fresh = 0;
      g.checkSnare(s); results.push(s.pack.fresh);
    }
    return { can, set, early, results };
  });
  check(`snare set with rope (${snare.can}, ${snare.set})`, snare.can && snare.set);
  check('snare not ready before ten hours', !snare.early);
  check(`snare catches something sometimes (${snare.results.join(',')})`, snare.results.some((x) => x >= 2) && snare.results.some((x) => x === 0));
  const wire = await page.evaluate(() => { const g = window.marugeum; const s = g.state; const n = g.currentNode(s); n.snare = null; s.equip = s.equip.filter((e) => e.kind !== 'rope'); s.pack.parts = 1; g.setSnare(s); return { parts: s.pack.parts, set: n.snare !== null }; });
  check(`no rope → one part becomes wire (${JSON.stringify(wire)})`, wire.set && wire.parts === 0);

  // 2) 훈연: 불 위에서 세 시간, 땔감 하나, 신선식 셋까지 보존식으로
  await fresh();
  const sm = await page.evaluate(() => {
    const g = window.marugeum; const s = g.state;
    s.fire = { nodeId: s.nodeId, hours: 8 }; s.pack.fresh = 3; s.pack.food = 0; s.pack.wood = 2;
    const t0 = (s.day - 1) * 24 + s.hour; const ok = g.smoke(s);
    return { ok, fresh: s.pack.fresh, food: s.pack.food, wood: s.pack.wood, hours: (s.day - 1) * 24 + s.hour - t0 };
  });
  check(`smoking turns fresh into food (${JSON.stringify(sm)})`, sm.ok && sm.fresh === 0 && sm.food === 3 && sm.wood === 1 && sm.hours === 3);

  // 3) 정수기: 텐트 거점에서도 짓는다. 불 없이 한 시간에 세 통
  await fresh();
  const fl = await page.evaluate(() => {
    const g = window.marugeum; const s = g.state; const n = g.currentNode(s);
    s.fire = null; s.pack.wood = 3;
    const before = g.canFilter(s);
    const can = g.canBuild(s, 'filter'); g.build(s, 'filter');
    s.pack.dirty = 3; s.pack.water = 0;
    const ok = g.filterWater(s);
    return { before, can, built: n.upgrades.includes('filter'), ok, water: s.pack.water, dirty: s.pack.dirty, tier: n.campTier };
  });
  check(`filter is a camp upgrade and filters three without fire (${JSON.stringify(fl)})`, !fl.before && fl.can && fl.built && fl.ok && fl.water === 3 && fl.dirty === 0);

  // 4) 화면: 행동 탭에 세 가지가 보인다
  await page.evaluate(() => { const g = window.marugeum; const s = g.state; s.fire = { nodeId: s.nodeId, hours: 8 }; s.pack.fresh = 1; s.pack.wood = 1; s.pack.dirty = 1; g.render(); });
  await page.click('.tabs button[data-tab="act"]');
  await page.waitForTimeout(200);
  const acts = await page.$$eval('.actions .act', (els) => els.map((e) => e.querySelector('b')?.textContent));
  check(`act tab shows smoke, filter, snare (${acts.join(',')})`, acts.includes('훈연하기') && acts.includes('정수기로 거르기') && acts.some((t) => t && t.startsWith('올무')));
  await page.screenshot({ path: process.argv[2] + '/basework.png' });
  await page.evaluate(() => localStorage.clear());

  console.log(log.join('\n'));
  console.log('FAILS:', fail.length, fail);
  console.log('page errors:', errors);
  await browser.close();
})();
