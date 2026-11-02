const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 780 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:4174/?seed=42', { waitUntil: 'networkidle' });

  // 1) 모든 이벤트의 모든 선택지를 강제로 열고 고르기. 조건 미달 선택지는 자원을 채워서 통과시킨다
  const r = await page.evaluate(() => {
    const g = window.marugeum; const s = g.state; const problems = []; let count = 0; let choices = 0;
    const ids = JSON.parse(JSON.stringify(s.log)); void ids;
    const EV = window.__events; void EV;
    return { problems, count, choices };
  });
  void r;
  // 이벤트 목록은 모듈 내부라 창에 없으므로 state.event 를 직접 세팅해 테스트한다
  const ids = [...require('fs').readFileSync('/home/user/marugeum/src/data/events.ts', 'utf8').match(/id: '([a-z_]+)'/g), ...require('fs').readFileSync('/home/user/marugeum/src/data/events-more.ts', 'utf8').match(/id: '([a-z_]+)'/g), ...require('fs').readFileSync('/home/user/marugeum/src/data/objects.ts', 'utf8').match(/id: 'obj_[a-z_]+'/g)].map((m) => m.slice(5, -1));
  console.log('events:', ids.length);
  const res = await page.evaluate((ids) => {
    const g = window.marugeum; const s = g.state; const problems = []; let picked = 0;
    for (const id of ids) {
      for (let ci = 0; ci < 4; ci++) {
        // 상태 초기화
        s.over = 'none'; s.standoff = null; s.stats.hp = 100; s.stats.mind = 60; s.stats.rad = 20; s.stats.temp = 80;
        s.pack = { water: 2, dirty: 1, food: 2, fresh: 0, wood: 2, gasoline: 0, diesel: 0, parts: 1 }; s.equip = [{ kind: "knife", broken: false }, { kind: "rope", broken: false }];
        s.fire = { nodeId: s.nodeId, hours: 5 };
        const cur = g.currentNode(s); if (!cur.objects.length) cur.objects.push({ id: 7777, kind: 'body', x: 0.5, y: 0.7, hidden: false, used: false, usedDay: 0, name: '검사' }); cur.objects.forEach((o) => { o.used = false; o.hidden = false; }); s.event = { id, result: null, objectId: id.startsWith('obj_') ? cur.objects[0].id : undefined };
        const ok = g.pickChoice(s, ci);
        if (!ok) { if (ci === 0) problems.push(id + ': choice 0 failed'); s.event = null; break; }
        if (!s.event || s.event.result === null) { problems.push(id + ' choice ' + ci + ': no result'); s.event = null; continue; }
        picked++;
        if (!g.dismissEvent(s)) problems.push(id + ': dismiss failed');
        if (s.event !== null) problems.push(id + ': event not closed');
      }
    }
    return { problems, picked, day: s.day };
  }, ids);
  console.log('picked outcomes:', res.picked, 'problems:', res.problems, 'day now', res.day);

  // 2) 실제 흐름: 처음 도착할 때 이벤트가 뜨고, 이벤트 중에는 이동이 막히는지
  await page.goto('http://localhost:4174/?seed=7', { waitUntil: 'networkidle' });
  const flow = await page.evaluate(() => {
    const g = window.marugeum; const s = g.state; let got = null; let blocked = null; let steps = 0;
    while (!s.event && steps < 12 && s.over === 'none') { steps++; const nb = g.neighbors(s).filter((n) => n.stage > g.currentNode(s).stage); g.travelTo(s, nb[0].id); if (s.stats.fatigue < 30) { if (s.event) break; g.sleep(s); } }
    if (s.event) { got = s.event.id; blocked = !g.travelTo(s, g.neighbors(s)[0].id) && !g.rest(s); }
    return { got, blocked, steps, log: s.log.slice(-2) };
  });
  console.log('flow:', JSON.stringify(flow));
  await page.screenshot({ path: out + '/s5-event.png' });
  if (flow.got) {
    await page.keyboard.press('1');
    await page.screenshot({ path: out + '/s5-result.png' });
    await page.keyboard.press('Enter');
    console.log('after enter, event =', await page.evaluate(() => window.marugeum.state.event));
  }

  // 3) 봇: 이벤트는 가능한 선택지 중 무작위
  const common = `
      if (s.event) { if (s.event.result !== null) { g.dismissEvent(s); return; } for (let i = 0; i < 4; i++) { if (g.pickChoice(s, (i + (s.day * 7 + s.hour) % 3) % 4)) return; } g.pickChoice(s, 0); return; }
      const st = s.stats; const p = s.pack; const cur = g.currentNode(s); const wk = g.waterKind(s);
      if (st.thirst < 55 && g.canDrink(s) && (wk === 'spring' || wk === 'stored' || p.water > 0)) { g.drink(s); return; }
      if (st.thirst < 25 && g.canDrink(s)) { g.drink(s); return; }
      if (st.hunger < 55 && g.canEat(s)) { g.eat(s); return; }
      if (g.canFill(s) && wk !== 'rain' && (wk === 'spring' || p.water + p.dirty === 0)) { g.fill(s); return; }`;
  const bots = {
    survivor: `(g, s) => {${common}
      if (p.dirty > 0 && g.hasFire(s) && g.canBoil(s)) { g.boil(s); return; }
      if (p.wood < 2 && g.canGatherWood(s) && s.hour < 18) { g.gatherWood(s); return; }
      if (p.food < 3 && g.canLook(s)) { g.lookAround(s); return; }
      if (st.fatigue < 40 || (s.hour >= 19 || s.hour < 5)) {
        if (!g.hasFire(s) && g.canLightFire(s) && (p.dirty > 0 || !['temple','shelter','village','military'].includes(cur.kind))) { g.lightFire(s); return; }
        g.sleep(s); return; }
      if (st.temp < 50) { if (!g.hasFire(s) && g.canLightFire(s)) { g.lightFire(s); return; } g.rest(s); return; }
      const nb = g.neighbors(s).filter((n) => n.stage > cur.stage); let pick = nb[0];
      if (st.thirst < 65 || p.water === 0) pick = nb.find((n) => n.kind === 'spring' || n.kind === 'temple') || nb.find((n) => n.waterLeft !== 0) || pick;
      if (s.wind !== 'calm' && pick.side === s.wind) pick = nb.find((n) => n.side !== s.wind) || pick;
      g.travelTo(s, pick.id); }`,
    careful: `(g, s) => {${common}
      if (p.food < 2 && g.canLook(s)) { g.lookAround(s); return; }
      if (st.fatigue < 40 || (s.hour >= 19 || s.hour < 5)) { g.sleep(s); return; }
      if (st.temp < 50) { g.rest(s); return; }
      const nb = g.neighbors(s).filter((n) => n.stage > cur.stage); let pick = nb[0];
      if (st.thirst < 65 || p.water === 0) pick = nb.find((n) => n.kind === 'spring' || n.kind === 'temple') || nb.find((n) => n.waterLeft !== 0) || pick;
      if (s.wind !== 'calm' && pick.side === s.wind) pick = nb.find((n) => n.side !== s.wind) || pick;
      g.travelTo(s, pick.id); }`,
  };
  for (const [name, code] of Object.entries(bots)) {
    const rows = [];
    for (let seed = 1; seed <= 24; seed++) {
      await page.goto('http://localhost:4174/?seed=' + seed, { waitUntil: 'networkidle' });
      const r = await page.evaluate((code) => {
        const bot = eval(code); const g = window.marugeum; const s = g.state; let steps = 0; let events = 0; let last = '';
        while (s.over === 'none' && steps < 900) { steps++; if (s.event && s.event.result === null) events++; bot(g, s); }
        const st = s.stats;
        return { over: s.over, day: s.day, rad: Math.round(st.rad), events, cause: s.over === 'dead' ? s.overText.split(', ')[1] : (s.over === 'none' ? 'stuck' : '') };
      }, code);
      rows.push({ seed, ...r });
    }
    const won = rows.filter((r) => r.over === 'won').length;
    console.log(`\n== ${name}: ${won}/24 생존, 평균 ${(rows.reduce((a, r) => a + r.day, 0) / 24).toFixed(1)}일, 평균 피폭 ${(rows.reduce((a, r) => a + r.rad, 0) / 24).toFixed(0)}, 판당 이벤트 ${(rows.reduce((a, r) => a + r.events, 0) / 24).toFixed(1)}`);
    const causes = {}; rows.forEach((r) => { if (r.cause) causes[r.cause] = (causes[r.cause] || 0) + 1; });
    console.log('사망 원인:', causes);
  }
  console.log('errors:', errors);
  await browser.close();
})();
