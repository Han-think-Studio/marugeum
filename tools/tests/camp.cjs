const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:4174/?seed=42', { waitUntil: 'networkidle' });
  const r = await page.evaluate(() => {
    const g = window.marugeum; const s = g.state; const log = []; const fail = [];
    const check = (name, cond) => { log.push(`${cond ? 'ok ' : 'FAIL'} ${name}`); if (!cond) fail.push(name); };
    const clear = () => { while (s.event) { if (s.event.result === null) { let ok = false; for (let i = 0; i < 4 && !ok; i++) ok = g.pickChoice(s, i); if (!ok) { s.event = null; break; } } g.dismissEvent(s); } };
    const fresh = () => { s.stats.hp = 100; s.stats.hunger = 90; s.stats.thirst = 90; s.stats.fatigue = 100; s.stats.temp = 100; s.stats.rad = 0; s.stats.mind = 80; s.hour = 10; s.weather = 'clear'; s.wind = 'calm'; };
    clear();
    const base = g.currentNode(s);
    check('base node is tier 3 camp', base.camp && base.campTier === 3 && g.campLabel(base) === '관리동 거점' && g.storeCap(base) === 40);
    // 텐트 거점
    const peak = s.nodes.find((n) => n.kind === 'peak' && !n.cave); peak.visited = true; s.nodeId = peak.id; s.phase = 'trek';
    s.equip = []; check('no tent: tier 0, cannot camp', g.campTierHere(s) === 0 && !g.canCamp(s));
    s.equip = [{ kind: 'tent', broken: true }]; check('broken tent: tier 0', g.campTierHere(s) === 0);
    s.equip = [{ kind: 'tent', broken: false }]; check('tent: tier 1, can camp', g.campTierHere(s) === 1 && g.canCamp(s));
    fresh(); const h0 = s.hour; const made = g.makeCamp(s); clear();
    check('makeCamp tent: 1h, tier 1, tent moved to node', made && ((s.hour - h0 + 24) % 24) === 1 && peak.camp && peak.campTier === 1 && peak.equip.some((e) => e.kind === 'tent') && !s.equip.some((e) => e.kind === 'tent') && g.campLabel(peak) === '텐트 거점');
    check('tent store cap 8', g.storeCap(peak) === 8);
    s.pack = { water: 3, dirty: 0, food: 4, fresh: 0, wood: 3, gasoline: 0, diesel: 0, parts: 2 };
    g.deposit(s); const used = g.storeUsed(peak);
    check(`deposit caps at 8 (used ${used}, pack left ${JSON.stringify(s.pack)})`, used === 8 && (s.pack.wood + s.pack.parts + s.pack.food + s.pack.water) === 4);
    check('moveSupply toBase refused when full', g.moveSupply(s, 'wood', 'toBase', 1) === false);
    check('tent camp: no upgrades allowed', ['window', 'earth', 'roof', 'hearth'].every((u) => !g.canBuild(s, u)));
    const ti = peak.equip.findIndex((e) => e.kind === 'tent');
    check('cannot strike tent while store has items', g.canStrikeTent(s) === false && g.moveEquip(s, 'toPack', ti) === false && peak.camp);
    g.withdraw(s); g.withdraw(s); // 배낭 차면 다 못 챙길 수 있음
    for (const k of Object.keys(peak.store)) peak.store[k] = 0;
    check('strike tent when empty: camp gone, tent back in pack', g.canStrikeTent(s) && g.moveEquip(s, 'toPack', peak.equip.findIndex((e) => e.kind === 'tent')) && !peak.camp && peak.campTier === 0 && peak.store === null && s.equip.some((e) => e.kind === 'tent'));
    // 잠 비교: 노숙 vs 텐트 거점 vs 바위굴 거점 (추운 날 체온 손실)
    const altSave = peak.alt; peak.alt = 1.0;
    const sleepTest = (setup) => { fresh(); s.hour = 22; s.weather = 'rain'; s.wind = 'E'; s.stats.temp = 100; s.stats.rad = 0; s.fire = null; setup(); g.sleep(s); clear(); return { temp: Math.round(s.stats.temp), rad: s.stats.rad.toFixed(1), fat: Math.round(s.stats.fatigue) }; };
    s.weather = 'rain';
    const open = sleepTest(() => { s.equip = []; peak.camp = false; peak.campTier = 0; peak.store = null; peak.equip = []; });
    const tentOnly = sleepTest(() => { s.equip = [{ kind: 'tent', broken: false }]; });
    const tentCamp = sleepTest(() => { s.equip = []; peak.camp = true; peak.campTier = 1; peak.store = { water: 0, dirty: 0, food: 0, fresh: 0, wood: 0, gasoline: 0, diesel: 0, parts: 0 }; peak.equip = [{ kind: 'tent', broken: false }]; });
    const caveCamp = sleepTest(() => { s.equip = []; peak.cave = true; peak.camp = true; peak.campTier = 2; peak.equip = []; });
    peak.cave = false; peak.camp = false; peak.campTier = 0; peak.store = null; peak.alt = altSave;
    log.push(`rainy sleep: open ${JSON.stringify(open)} tentOnly ${JSON.stringify(tentOnly)} tentCamp ${JSON.stringify(tentCamp)} caveCamp ${JSON.stringify(caveCamp)}`);
    check('shelter order open < tent < tentCamp <= caveCamp (temp)', open.temp < tentOnly.temp && tentOnly.temp <= tentCamp.temp && tentCamp.temp <= caveCamp.temp);
    check('rad order open > tent > cave', Number(open.rad) > Number(tentOnly.rad) && Number(tentOnly.rad) > Number(caveCamp.rad));
    // 바위굴 거점
    const valley = s.nodes.find((n) => n.kind === 'valley'); valley.visited = true; valley.cave = true; s.nodeId = valley.id; s.equip = []; fresh();
    check('cave: tier 2', g.campTierHere(s) === 2);
    const h1 = s.hour; g.makeCamp(s); clear();
    check('makeCamp cave: 2h, tier 2, cap 16', ((s.hour - h1 + 24) % 24) === 2 && valley.camp && valley.campTier === 2 && g.storeCap(valley) === 16 && g.campLabel(valley) === '바위굴 거점');
    s.pack.wood = 3; s.pack.parts = 2;
    check('cave upgrades: earth+hearth yes, window+roof no', g.canBuild(s, 'earth') && g.canBuild(s, 'hearth') && !g.canBuild(s, 'window') && !g.canBuild(s, 'roof'));
    // 집 거점
    const temple = s.nodes.find((n) => n.kind === 'temple'); temple.visited = true; s.nodeId = temple.id; fresh();
    check('temple: tier 3', g.campTierHere(s) === 3);
    const h2 = s.hour; g.makeCamp(s); clear();
    check('makeCamp temple: 3h, tier 3, cap 40, label 산사 거점', ((s.hour - h2 + 24) % 24) === 3 && temple.campTier === 3 && g.storeCap(temple) === 40 && g.campLabel(temple) === '산사 거점');
    s.pack.wood = 3; s.pack.parts = 2;
    check('house upgrades: all four', ['window', 'earth', 'roof', 'hearth'].every((u) => g.canBuild(s, u)));
    // 거점 단계 사건 조건
    const evs = (tier) => { return g.state; };
    return { log, fail, errors: [] };
  });
  // 거점 화면 스크린샷 (텐트 거점)
  await page.evaluate(() => { const g = window.marugeum; const s = g.state; const peak = s.nodes.find((n) => n.kind === 'peak'); peak.visited = true; s.nodeId = peak.id; s.phase = 'trek'; s.equip = [{ kind: 'tent', broken: false }, { kind: 'carrier', broken: false }]; s.hour = 10; g.makeCamp(s); while (s.event) { if (s.event.result === null) g.pickChoice(s, 0); g.dismissEvent(s); } g.render(); });
  await page.keyboard.press('c');
  await page.waitForTimeout(300);
  await page.screenshot({ path: process.argv[2] + '/camp-tentcamp.png' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.screenshot({ path: process.argv[2] + '/camp-tentscene.png' });
  console.log(r.log.join('\n'));
  console.log('FAILS:', r.fail.length, r.fail);
  console.log('page errors:', errors);
  await browser.close();
})();
