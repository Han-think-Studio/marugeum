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
    const fresh = () => { s.stats.hp = 100; s.stats.hunger = 90; s.stats.thirst = 90; s.stats.fatigue = 100; s.stats.temp = 100; s.stats.rad = 0; s.stats.mind = 80; s.weather = 'clear'; s.wind = 'calm'; };
    clear();
    const base = g.currentNode(s);
    check('base secured by default', base.secured && g.securingStatus(s).secured);
    // 안정 절차
    const peak = s.nodes.find((n) => n.kind === 'peak' && !n.cave); peak.visited = true; s.nodeId = peak.id; s.phase = 'trek'; s.equip = []; s.fire = null; fresh(); s.hour = 10;
    let st = g.securingStatus(s);
    check('fresh peak: nothing done', !st.looked && !st.shelter && !st.rested && !st.secured);
    g.lookAround(s); clear(); st = g.securingStatus(s);
    check('after look: looked, not secured', st.looked && !st.secured);
    s.hour = 11; g.sleep(s); clear(); st = g.securingStatus(s);
    check('day sleep without shelter: not rested', !st.rested && !st.secured);
    s.pack.wood = 2; fresh(); s.hour = 19; g.lightFire(s); st = g.securingStatus(s);
    check('fire gives shelter', st.shelter);
    const logLen = s.log.length; g.sleep(s); clear(); st = g.securingStatus(s);
    check('night sleep by fire: rested + secured', st.rested && st.secured && peak.secured);
    check('secured log line', s.log.slice(logLen).some((l) => l.includes('안정됐다')));
    // 위험한 길 막기
    const nb = g.neighbors(s).find((n) => n.stage > peak.stage); const altSave = nb.alt; nb.alt = 0.2; nb.visited = false; nb.scouted = false;
    s.weather = 'rain'; s.wind = nb.side === 'ridge' ? 'E' : nb.side; s.hour = 10; fresh(); s.weather = 'rain'; s.wind = nb.side === 'ridge' ? 'E' : nb.side;
    const rk = g.routeRisk(s, nb);
    check(`route is high (${rk.level}: ${rk.why.join(',')})`, rk.level === 'high' && rk.why.includes('모르는 길'));
    peak.secured = false;
    const b1 = g.travelBlock(s, nb);
    check('unsecured: blocked (' + b1 + ')', !!b1 && b1.includes('안정'));
    const before = s.nodeId; const ll = s.log.length; const moved = g.travelTo(s, nb.id);
    check('travelTo refused: stays, logs reason + guide', moved === true && s.nodeId === before && s.log.slice(ll).some((l) => l.includes('함부로')) && s.flags['guide:secure']);
    peak.secured = true; s.hour = 14;
    const b2 = g.travelBlock(s, nb);
    check('secured but afternoon: blocked (' + b2 + ')', !!b2 && b2.includes('아침'));
    s.hour = 8;
    check('secured morning: allowed', g.travelBlock(s, nb) === null);
    s.weather = 'clear'; s.wind = 'calm';
    check('clear weather: risk drops, allowed', g.travelBlock(s, nb) === null);
    nb.alt = altSave;
    // 정찰
    const target = g.neighbors(s).find((n) => !n.visited && n.stage > peak.stage); fresh(); s.hour = 9; s.weather = 'clear';
    check('scoutBlock null in good morning', g.scoutBlock(s, target) === null && g.canScout(s, target.id));
    s.weather = 'rain'; check('scout blocked by rain', g.scoutBlock(s, target) === '비가 온다'); s.weather = 'clear';
    s.hour = 22; check('scout blocked at night', g.scoutBlock(s, target) === '밤이다'); s.hour = 9;
    const hBefore = g.travelHours(s, peak, target); const sh = g.scoutHours(s, target); const h0 = s.hour; const riskBefore = g.routeRisk(s, target).why.includes('모르는 길');
    const did = g.scout(s, target.id);
    check(`scout ran: ${sh}h, event scout with result`, did && ((s.hour - h0 + 24) % 24) === sh && s.event && s.event.id === 'scout' && typeof s.event.result === 'string' && s.event.result.includes(target.name));
    check('target scouted + edge known', target.scouted && g.isKnown(s, peak, target));
    const hAfter = g.travelHours(s, peak, target);
    check(`travel hours drop ${hBefore} -> ${hAfter}`, hAfter < hBefore);
    check('risk no longer 모르는 길', riskBefore && !g.routeRisk(s, target).why.includes('모르는 길'));
    check('busy while scout result open', g.busy(s) && !g.canScout(s, target.id));
    g.dismissEvent(s);
    check('cannot scout twice', g.scoutBlock(s, target) === '이미 안다');
    return { log, fail };
  });
  console.log(r.log.join('\n'));
  console.log('FAILS:', r.fail.length, r.fail);
  // 스크린샷: 막힌 길과 정찰 버튼, 정찰 결과
  await page.evaluate(() => {
    const g = window.marugeum; const s = g.state; const cur = g.currentNode(s); cur.secured = false; s.weather = 'rain'; s.wind = 'E'; s.hour = 10;
    for (const n of g.neighbors(s)) { if (n.stage > cur.stage) { n.scouted = false; n.visited = false; } }
    g.render();
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: process.argv[2] + '/s26-routes.png' });
  await page.evaluate(() => {
    const g = window.marugeum; const s = g.state; s.weather = 'clear'; s.wind = 'calm'; s.hour = 9; s.stats.fatigue = 100;
    const t = g.neighbors(s).find((n) => !n.visited && !n.scouted); g.scout(s, t.id); g.render();
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: process.argv[2] + '/s26-scout.png' });
  console.log('page errors:', errors);
  await browser.close();
})();
