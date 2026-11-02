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
    const clear = (st) => { while (st.event) { if (st.event.result === null) { let ok = false; for (let i = 0; i < 4 && !ok; i++) ok = g.pickChoice(st, i); if (!ok) { st.event = null; break; } } g.dismissEvent(st); } };
    const fresh = (st) => { st.stats.hp = 100; st.stats.hunger = 90; st.stats.thirst = 90; st.stats.fatigue = 100; st.stats.temp = 100; st.stats.rad = 0; st.stats.mind = 80; st.weather = 'clear'; st.wind = 'calm'; st.hour = 8; };
    clear(s);
    const byPlace = (st, id) => st.nodes.find((n) => n.place === id);
    check('47 places, 14 stages', s.nodes.length === 47 && Math.max(...s.nodes.map((n) => n.stage)) === 13 && s.nodes.filter((n) => n.stage === 1).length === 4);
    check('base links to all 4 stage-1 places', s.nodes[0].links.length === 4);
    const reach = new Set([0]); const q = [0]; while (q.length) { const id = q.shift(); for (const l of s.nodes[id].links) if (!reach.has(l)) { reach.add(l); q.push(l); } }
    check('all places reachable from base', reach.size === 47);
    check('every non-goal place has a link', s.nodes.filter((n) => n.kind !== 'goal').every((n) => n.links.length > 0));
    check('names fixed', byPlace(s, 'jungnyeong').name === '죽령' && byPlace(s, 'hyangno').kind === 'goal' && byPlace(s, 'cheonjedan').name === '태백산 천제단');
    check('fixed objects: 천제단 shrine named, 죽령 car+truck', byPlace(s, 'cheonjedan').objects.some((o) => o.kind === 'shrine' && o.name === '천제단' && !o.hidden) && byPlace(s, 'jungnyeong').objects.some((o) => o.kind === 'car') && byPlace(s, 'jungnyeong').objects.some((o) => o.kind === 'truck'));
    // 첫 도착: 성삼재 → clue_jiri, 이어서 leaflet
    fresh(s); s.phase = 'trek';
    const ss = byPlace(s, 'seongsamjae'); g.travelTo(s, ss.id);
    check('성삼재 first arrival opens clue_jiri', s.event && s.event.id === 'clue_jiri');
    const ll = s.log.length - 6;
    g.pickChoice(s, 0); g.dismissEvent(s);
    check('chained priority: leaflet after clue', s.event && s.event.id === 'leaflet');
    g.pickChoice(s, 0); g.dismissEvent(s);
    check('no more chain', s.event === null);
    check('place desc logged', s.log.slice(ll).some((l) => l.includes('대피 버스가 여기서 사람을 태웠다')));
    // 죽령: 터널 → 버스
    const neul = byPlace(s, 'neuljae'); const jn = byPlace(s, 'jungnyeong'); neul.visited = true; s.nodeId = neul.id; if (!neul.links.includes(jn.id)) neul.links.push(jn.id); fresh(s); jn.scouted = true;
    g.travelTo(s, jn.id);
    check('죽령 first: sobaek_tunnel', s.event && s.event.id === 'sobaek_tunnel');
    g.pickChoice(s, 0); g.dismissEvent(s);
    check('then clue_sobaek', s.event && s.event.id === 'clue_sobaek');
    clear(s);
    check('clue counted', g.clueCount(s) >= 2);
    // 기억: 지난 여정이 끝난 자리
    const s2 = g.createGame(7, { deadAt: ['cheonwang'], knownPlaces: ['jangteomok'], runNo: 3 }); clear(s2); fresh(s2); s2.phase = 'trek';
    g.travelTo(s2, byPlace(s2, 'cheonwang').id); clear(s2);
    check('memory line at death place', s2.log.some((l) => l.includes('지난 여정은 여기서 끝났다')));
    s2.nodeId = 0; fresh(s2); g.travelTo(s2, byPlace(s2, 'jangteomok').id); clear(s2);
    check('memory line at known place', s2.log.some((l) => l.includes('지난 여정에 와 본 자리다')));
    // 엔딩 회상
    s.buried.push('김영호'); s.flags['survivor_friend'] = true; s.flags['mine_people'] = true;
    const notes = g.endingNotes(s);
    check('endingNotes lines: ' + notes.join(' / '), notes.length >= 3 && notes.some((l) => l.includes('김영호')) && notes.some((l) => l.includes('정우') && l.includes('폐광 사람들')) && notes.some((l) => l.includes('흔적')));
    return { log, fail };
  });
  console.log(r.log.join('\n'));
  console.log('FAILS:', r.fail.length, r.fail);
  await page.evaluate(() => { const g = window.marugeum; const s = g.state; s.view = 'map'; for (const n of s.nodes) if (n.stage <= 6) n.visited = true; g.render(); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: process.argv[2] + '/places-map.png' });
  console.log('page errors:', errors);
  await browser.close();
})();
