const { chromium } = require('playwright');
// 숨은 것: 재료 표시가 있어야 열리고, 난이도에 따라 닫히고, 물건이 효과를 내고, 엔딩과 수첩에 남는다
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const log = []; const fail = [];
  const check = (name, cond) => { log.push(`${cond ? 'ok ' : 'FAIL'} ${name}`); if (!cond) fail.push(name); };
  const start = async (difficulty) => {
    await page.goto('http://localhost:4174/', { waitUntil: 'networkidle' });
    await page.evaluate((d) => { localStorage.clear(); localStorage.setItem('marugeum.settings.v1', JSON.stringify({ difficulty: d, handwork: false })); }, difficulty);
    await page.goto('http://localhost:4174/?seed=42', { waitUntil: 'networkidle' });
    await page.evaluate(() => { const g = window.marugeum; const s = g.state; while (s.event) { if (s.event.result === null) g.pickChoice(s, 0); g.dismissEvent(s); } });
  };
  // 어떤 자리에 처음 닿았을 때 뜨는 사건 id 들. 반드시 뜨는 것들을 차례로 연다
  const arrive = (place, flags) => page.evaluate(({ place, flags }) => {
    const g = window.marugeum; const s = g.state;
    Object.assign(s.flags, flags);
    const to = s.nodes.find((n) => n.place === place);
    const cur = g.currentNode(s);
    // 가까운 자리처럼 잇고 맑은 아침에 걷는다
    cur.links.push(to.id); to.visited = false; s.hour = 8; s.weather = 'clear'; s.nextWeather = 'clear'; s.weatherLeft = 30; s.wind = 'calm'; s.crisis = null;
    s.stats = { hp: 100, hunger: 90, thirst: 90, temp: 100, fatigue: 100, rad: 0, mind: 80 };
    to.secured = true; cur.secured = true;
    g.travelTo(s, to.id);
    const ids = [];
    let guard = 0;
    while (s.event && guard++ < 10) { ids.push(s.event.id); if (s.event.result === null) g.pickChoice(s, 0); g.dismissEvent(s); }
    return { ids, at: g.currentNode(s).place, equip: s.equip.map((e) => e.kind), flags: Object.keys(s.flags).filter((k) => k.startsWith('hidden:') || k.startsWith('clue:')) };
  }, { place, flags });

  // 보통: 나침반(재료 있음), 염주(어려움 전용이라 닫힘), 주파수 수첩(보통 이상)
  await start('normal');
  let r = await arrive('noinbong', {});
  check(`no material, no compass (${r.ids.join(',')})`, !r.ids.includes('hidden_compass'));
  await start('normal');
  r = await arrive('noinbong', { journal_read: true });
  check(`journal read → compass at Noinbong (${r.ids.join(',')})`, r.ids.includes('hidden_compass') && r.equip.includes('compass'));
  const fog = await page.evaluate(() => { const g = window.marugeum; const s = g.state; s.weather = 'fog'; const n = g.neighbors(s).find((x) => !g.isKnown(s, g.currentNode(s), x)) || g.neighbors(s)[0]; const withC = g.travelHours(s, g.currentNode(s), n); s.equip = s.equip.filter((e) => e.kind !== 'compass'); const without = g.travelHours(s, g.currentNode(s), n); return { withC, without }; });
  check(`compass removes the fog delay (${fog.without}h → ${fog.withC}h)`, fog.withC < fog.without);
  await start('normal');
  r = await arrive('jeongamsa', { bell_rung: true });
  check(`beads closed on normal (${r.ids.join(',')})`, !r.ids.includes('hidden_beads'));
  await start('normal');
  r = await arrive('hambaek', { war_log: true });
  check(`war log → codebook on normal (${r.ids.join(',')})`, r.ids.includes('hidden_codebook') && r.equip.includes('codebook'));
  const crisis = await page.evaluate(() => { const g = window.marugeum; const s = g.state; const now = (s.day - 1) * 24 + s.hour; s.crisis = { kind: 'cold', start: now + 20, end: now + 40, warned: false, signed: false, started: false, sheltered: 0, exposed: 0 }; return g.crisisKnownIn(s); });
  check(`codebook knows the crisis ahead (${crisis}h)`, crisis === 20);
  r = await arrive('jinbu', { numbers: true });
  check(`numbers + codebook → decoded at Jinbu, adds a clue (${r.ids.join(',')})`, r.ids.includes('hidden_numbers') && r.flags.includes('clue:numbers'));

  // 어려움: 염주가 열린다. 쉬움: 주파수 수첩이 닫힌다
  await start('hard');
  r = await arrive('jeongamsa', { bell_rung: true });
  check(`bell rung on hard → beads (${r.ids.join(',')})`, r.ids.includes('hidden_beads') && r.equip.includes('beads'));
  await start('easy');
  r = await arrive('hambaek', { war_log: true });
  check(`codebook closed on easy (${r.ids.join(',')})`, !r.ids.includes('hidden_codebook'));

  // 능선 명부: 벽 셋 가운데 둘에 이름. 하나면 안 열리고, 쉬움에서는 닫힌다
  await start('normal');
  r = await arrive('jinbu', { name_on_wall: true });
  check(`one wall is not enough (${r.ids.join(',')})`, !r.ids.includes('hidden_names'));
  await start('normal');
  r = await arrive('jinbu', { name_on_wall: true, cave_names: true });
  check(`two walls → ridge register at Jinbu (${r.ids.join(',')})`, r.ids.includes('hidden_names') && r.flags.includes('hidden:names'));
  await start('easy');
  r = await arrive('jinbu', { name_on_wall: true, cave_names: true });
  check(`register closed on easy (${r.ids.join(',')})`, !r.ids.includes('hidden_names'));
  // 신호 거울: 헬기를 둘 넘게 봤으면 어려움에서 오대산 비로봉
  await start('normal');
  r = await arrive('odae_biro', { heli_seen: true, heli_far: true });
  check(`mirror closed on normal (${r.ids.join(',')})`, !r.ids.includes('hidden_mirror'));
  await start('hard');
  r = await arrive('odae_biro', { heli_seen: true, heli_far: true });
  check(`two helicopters watched → mirror on hard (${r.ids.join(',')})`, r.ids.includes('hidden_mirror') && r.equip.includes('mirror'));

  // 향로봉: 넷 이상 도왔으면 길 위의 사람들, 어려움 재회 + 흔적 아홉이면 숨은 그 뒤. 수첩에 ★
  await start('hard');
  const end = await page.evaluate(() => {
    const g = window.marugeum; const s = g.state;
    for (const f of ['base_visitors_kept', 'teen_met', 'guestbook', 'elder_path', 'family_fed']) s.flags[f] = true;
    s.flags.saw_lights = true; s.flags.saw_haero = true;
    for (const c of ['note', 'jiri', 'deogyu', 'minjuji', 'songni', 'sobaek', 'taebaek', 'hambaek', 'odae']) s.flags['clue:' + c] = true;
    s.flags['hidden:compass'] = true;
    s.over = 'won'; s.ending = 'reunion'; s.overText = '12일째. 향로봉에 닿았다.';
    g.render();
    return { notes: g.endingNotes(s).join(' '), secret: document.querySelector('.end .after.secret')?.textContent ?? '', journal: JSON.parse(localStorage.getItem('marugeum.journal.v1')) };
  });
  check('people line in ending notes', end.notes.includes('길 위의 사람들') && end.notes.includes('열여섯 살 아이'));
  check('counted lights get their line at the reunion', end.notes.includes('손전등을 남쪽으로'));
  check('hidden afterword shows on hard reunion with nine traces', end.secret.startsWith('숨은 그 뒤'));
  const hid = end.journal && end.journal.hidden;
  check(`journal records hidden finds at hard (${JSON.stringify(hid)})`, hid && hid.compass === 'hard' && hid.people === 'hard' && hid.afterword === 'hard' && hid.lights === 'hard');
  check('run records its difficulty', end.journal.runs.slice(-1)[0].difficulty === 'hard');
  await page.click('.book-btn');
  await page.waitForTimeout(200);
  const book = await page.$$eval('.hiddens li', (els) => els.map((e) => ({ text: e.textContent, hard: !!e.querySelector('.diff.hard') })));
  check(`journal lists 4/9 found with ★ and hints for the rest (${book.length})`, book.length === 9 && book.filter((b) => b.hard).length === 4 && book.filter((b) => b.text.startsWith('???')).length === 5);
  await page.screenshot({ path: process.argv[2] + '/hidden-journal.png' });
  await page.evaluate(() => localStorage.clear());

  console.log(log.join('\n'));
  console.log('FAILS:', fail.length, fail);
  console.log('page errors:', errors);
  await browser.close();
})();
