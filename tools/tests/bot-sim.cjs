// 계측 시뮬레이션. node bot-sim.cjs <scratch> <mode: trail|ridge|naive> [runs]
const { chromium } = require('playwright');
const fs = require('fs');
const S = process.argv[2]; const MODE = process.argv[3] || 'trail'; const RUNS = Number(process.argv[4] || 30);
const src = fs.readFileSync(__dirname + '/bot-trail.cjs', 'utf8').replace(/\r\n/g, '\n');
const trailBot = src.match(/const bot = `([\s\S]*?)`;\n/)[1];
const ridgeBot = trailBot.replace(/let pick = nb\.find\(\(n\) => marks\.includes\(n\)\)[^\n]*\n/, 'let pick = nb[0]; void marks;\n');
const naiveBot = `(g, s) => {
  if (s.standoff) { if (s.standoff.done) { g.standoffClose(s); return; } g.standoffMove(s, ['threaten','retreat','fight'][s.standoff.round % 3]); return; }
  if (g.canDepart(s) && s.day >= 2) { g.depart(s); return; }
  if (s.event) { if (s.event.result !== null) { g.dismissEvent(s); return; } for (let i = 0; i < 4; i++) { if (g.pickChoice(s, (i + s.day + s.hour) % 3)) return; } g.pickChoice(s, 0); return; }
  const st = s.stats; const p = s.pack; const cur = g.currentNode(s);
  if (st.thirst < 40 && g.canDrink(s)) { g.drink(s); return; }
  if (st.hunger < 40 && g.canEat(s)) { g.eat(s); return; }
  if (g.canFill(s) && p.water + p.dirty === 0) { g.fill(s); return; }
  if (g.canLook(s) && s.hour < 18) { g.lookAround(s); return; }
  window.__tried = window.__tried || new Set(); const objs = g.visibleObjects(cur).filter((o) => !o.used && !window.__tried.has(o.id)); if (objs.length && s.hour < 18 && objs.length) { window.__tried.add(objs[0].id); g.inspectObject(s, objs[0].id); return; }
  if (s.hour >= 20 || s.hour < 5 || st.fatigue < 25) { if (!g.hasFire(s) && st.temp < 70 && g.canLightFire(s)) { g.lightFire(s); return; } g.sleep(s); return; }
  if (p.wood < 1 && g.canGatherWood(s)) { g.gatherWood(s); return; }
  const nb = g.neighbors(s).filter((n) => n.stage > cur.stage); const pick = nb[(s.day + cur.id) % nb.length];
  const before = s.nodeId; g.travelTo(s, pick.id); if (s.nodeId === before && s.over === 'none' && !s.event) { g.rest(s); }
}`;
const bot = MODE === 'ridge' ? ridgeBot : MODE === 'naive' ? naiveBot : trailBot;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const runs = [];
  for (let seed = 1; seed <= RUNS; seed++) {
    await page.goto('http://localhost:4174/?seed=' + (1000 + seed), { waitUntil: 'networkidle' });
    const r = await page.evaluate((code) => {
      const g = window.marugeum; const s = g.state; const b = eval(code);
      const m = { actions: 0, travels: 0, blocked: 0, scouts: 0, looks: 0, inspects: 0, sleeps: 0, rests: 0, fires: 0, camps: 0, builds: 0, standoffs: 0, eventChoices: 0, repairs: 0, maintains: 0, radios: 0, crises: 0, crisisGood: 0, broken: 0 };
      const wrap = (name, key, after) => { const f = g[name]; g[name] = (...a) => { const before = s.nodeId; const ok = f(...a); if (ok) m[key]++; if (after) after(before, ok); return ok; }; };
      wrap('travelTo', 'travels', (before, ok) => { if (ok && s.nodeId === before && s.over === 'none') { m.travels--; m.blocked++; } });
      wrap('scout', 'scouts'); wrap('lookAround', 'looks'); wrap('inspectObject', 'inspects'); wrap('sleep', 'sleeps'); wrap('rest', 'rests'); wrap('lightFire', 'fires'); wrap('makeCamp', 'camps'); wrap('build', 'builds'); wrap('pickChoice', 'eventChoices'); wrap('repair', 'repairs'); wrap('maintain', 'maintains'); wrap('listenRadio', 'radios');
      let steps = 0; let hadStandoff = false; const low = { temp: 100, hunger: 100, thirst: 100, hp: 100 };
      while (s.over === 'none' && steps < 1200) {
        steps++; b(g, s);
        if (s.standoff && !hadStandoff) { m.standoffs++; hadStandoff = true; } if (!s.standoff) hadStandoff = false;
        for (const k of Object.keys(low)) low[k] = Math.min(low[k], s.stats[k]);
        if (s.event && s.event.id.startsWith('crisis_') && s.event.result !== null && !s.event.__counted) { m.crises++; if (/(넘을 수 있다|내가 아니다|마음이 맑다)/.test(s.event.result)) m.crisisGood++; s.event.__counted = true; }
      }
      m.actions = steps; m.broken = s.equip.filter((e) => e.broken).length;
      const secured = s.nodes.filter((n) => n.secured && n.kind !== 'start').length;
      const visited = s.nodes.filter((n) => n.visited).map((n) => n.place);
      const inspectedKinds = []; for (const n of s.nodes) for (const o of n.objects) if (o.used) inspectedKinds.push(o.kind);
      return { over: s.over, ending: s.ending, day: s.day, departed: s.departedDay, clues: g.clueCount(s), rad: Math.round(s.stats.rad), cause: s.over === 'dead' ? s.overText.replace(/^\d+일째[,.] ?/, '').slice(0, 14) : '', secured, buried: s.buried.length, seen: s.seen, visited, inspectedKinds, m, low, stuck: s.over === 'none' };
    }, bot);
    runs.push(r);
  }
  await browser.close();
  const n = runs.length; const avg = (f) => (runs.reduce((a, r) => a + f(r), 0) / n).toFixed(1);
  const count = (f) => { const o = {}; for (const r of runs) { const k = f(r); o[k] = (o[k] || 0) + 1; } return o; };
  console.log(`== ${MODE} bot · ${n} runs`);
  console.log(`won ${runs.filter((r) => r.over === 'won').length} · dead ${runs.filter((r) => r.over === 'dead').length} · stuck ${runs.filter((r) => r.stuck).length}`);
  console.log('endings', JSON.stringify(count((r) => r.ending || (r.over === 'dead' ? 'dead:' + r.cause : 'stuck'))));
  console.log(`avg day ${avg((r) => r.day)} · departed day ${avg((r) => r.departed)} · clues ${avg((r) => r.clues)} · rad ${avg((r) => r.rad)} · secured ${avg((r) => r.secured)} · buried ${avg((r) => r.buried)}`);
  const keys = Object.keys(runs[0].m);
  console.log('per run: ' + keys.map((k) => `${k} ${avg((r) => r.m[k])}`).join(' · '));
  console.log('lowest (avg of per-run minimum): ' + ['temp', 'hunger', 'thirst', 'hp'].map((k) => `${k} ${avg((r) => r.low[k])}`).join(' · '));
  console.log(`decisions per day (choices+travels+scouts+inspects) ${avg((r) => (r.m.eventChoices + r.m.travels + r.m.scouts + r.m.inspects) / Math.max(1, r.day))}`);
  fs.writeFileSync(`${S}/bot-sim-${MODE}.json`, JSON.stringify(runs));
})();
