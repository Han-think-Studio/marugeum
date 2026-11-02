const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const bot = `(g, s) => {
      if (s.standoff) { if (s.standoff.done) { g.standoffClose(s); return; } const a = g.canThrow(s) && s.standoff.kind !== 'deserter' ? 'throw' : (s.standoff.distance === 0 ? 'fight' : 'threaten'); g.standoffMove(s, a); return; }
      if (g.canDepart(s) && s.day >= 2) { g.withdraw(s); const bn = g.currentNode(s); for (const k of ['radio', 'battery']) { const i = bn.equip.findIndex((e) => e.kind === k); if (i >= 0) g.moveEquip(s, 'toPack', i); } g.depart(s); return; }
      if (s.event) { if (s.event.result !== null) { g.dismissEvent(s); return; } const def = g.eventById(s.event.id); if (def) { const ci = def.choices.findIndex((c) => c.outcomes.some((o) => o.effects && o.effects.clue) && g.meetsReq(s, c.req, g.currentNode(s))); if (ci >= 0 && g.pickChoice(s, ci)) return; } if (s.event.id.startsWith('obj_')) { if (g.pickChoice(s, 0)) return; } for (let i = 0; i < 4; i++) { if (g.pickChoice(s, (i + s.hour) % 3)) return; } g.pickChoice(s, 0); return; }
      const st = s.stats; const p = s.pack; const cur = g.currentNode(s); const wk = g.waterKind(s);
      if (st.thirst < 55 && g.canDrink(s) && (wk === 'spring' || wk === 'stored' || p.water > 0)) { g.drink(s); return; }
      if (st.thirst < 25 && g.canDrink(s)) { g.drink(s); return; }
      if (st.hunger < 55 && g.canEat(s)) { g.eat(s); return; }
      if (g.canFill(s) && wk !== 'rain' && (wk === 'spring' || p.water + p.dirty === 0)) { g.fill(s); return; }
      if (p.dirty > 0 && g.hasFire(s) && g.canBoil(s)) { g.boil(s); return; }
      if (g.canListenRadio(s)) { g.listenRadio(s); return; }
      const worn = s.equip.some((e) => { const c = g.condOf(e); return c !== null && c > 0 && c < 45; });
      if (worn && g.canMaintain(s)) { g.maintain(s); return; }
      if (worn && !cur.camp && g.canCamp(s) && s.hour < 18) { g.makeCamp(s); return; }
      const soon = g.crisisKnownIn(s);
      if (g.crisisActive(s) || (soon !== null && soon <= 3)) {
        if (!cur.camp && g.canCamp(s)) { g.makeCamp(s); return; }
        if (!g.hasFire(s) && g.canLightFire(s)) { g.lightFire(s); return; }
        if (p.wood < 2 && g.canGatherWood(s)) { g.gatherWood(s); return; }
        if (st.fatigue < 70 || s.hour >= 19 || s.hour < 6) { g.sleep(s); return; }
        g.rest(s); return;
      }
      if (p.wood < 2 && g.canGatherWood(s) && s.hour < 18) { g.gatherWood(s); return; }
      if (g.canLook(s) && s.hour < 18) { g.lookAround(s); return; }
      const useful = ['pack','crate','closet','fishing','herbs','garden','woodpile','body','car','truck','clothesline','cave','radio']; window.__tried = window.__tried || new Set(); const objs = g.visibleObjects(cur).filter((o) => !o.used && useful.includes(o.kind) && !window.__tried.has(o.id)); if (objs.length && s.hour < 19 && (p.food + p.fresh < 5 || p.wood < 2 || objs[0].kind === 'cave')) { window.__tried.add(objs[0].id); g.inspectObject(s, objs[0].id); return; }
      if (st.fatigue < 40 || (s.hour >= 19 || s.hour < 5)) { if (!cur.camp && g.canCamp(s)) { g.makeCamp(s); return; } if (!g.hasFire(s) && g.canLightFire(s)) { g.lightFire(s); return; } g.sleep(s); return; }
      if (st.temp < 50) { g.rest(s); return; }
      const nb = g.neighbors(s).filter((n) => n.stage > cur.stage);
      const marks = s.marked.map((id) => s.nodes.find((n) => n.place === id)).filter((n) => n && !n.visited && n.stage > cur.stage).sort((a, b) => a.stage - b.stage);
      let pick = nb.find((n) => marks.includes(n)) || (marks.length && marks[0].stage === cur.stage + 2 ? [...nb].sort((a, b) => Math.abs(a.y - marks[0].y) - Math.abs(b.y - marks[0].y))[0] : nb[0]);
      if (st.thirst < 65 || p.water === 0) pick = nb.find((n) => n.kind === 'spring' || n.kind === 'temple') || nb.find((n) => n.waterLeft !== 0) || pick;
      if (g.travelBlock(s, pick)) {
        if (!pick.scouted && g.canScout(s, pick.id)) { g.scout(s, pick.id); return; }
        const alt = nb.find((n) => !g.travelBlock(s, n)); if (alt && s.hour < 16) { g.travelTo(s, alt.id); return; }
        if (g.canLook(s)) { g.lookAround(s); return; }
        if (!g.hasFire(s) && g.canLightFire(s)) { g.lightFire(s); return; }
        if (!g.hasFire(s) && p.wood < 1 && g.canGatherWood(s)) { g.gatherWood(s); return; }
        if (s.hour >= 16 || s.hour < 5) { g.sleep(s); return; }
        g.rest(s); return;
      }
      g.travelTo(s, pick.id); }`;
  const seenAt = {}; let runs = 0, won = 0, totalEvents = 0, days = 0, cluesSum = 0; const bad = []; const causes = {}; const endings = {};
  for (let seed = 1; seed <= 30; seed++) {
    await page.goto('http://localhost:4174/?seed=' + seed, { waitUntil: 'networkidle' });
    const r = await page.evaluate((code) => {
      const b = eval(code); const g = window.marugeum; const s = g.state; let steps = 0; const at = [];
      let lastSeen = 0;
      while (s.over === 'none' && steps < 900) { steps++; if (s.seen.length > lastSeen) { at.push([s.seen[s.seen.length - 1], g.currentNode(s).stage]); lastSeen = s.seen.length; } b(g, s); }
      return { over: s.over, at, day: s.day, clues: g.clueCount(s), ending: s.ending, cause: s.over === 'dead' ? s.overText.split(', ')[1] : '' };
    }, bot);
    runs++; if (r.over === 'won') won++; cluesSum += r.clues; endings[r.ending || '-'] = (endings[r.ending || '-'] || 0) + 1; causes[r.cause || (r.over === 'won' ? 'won' : 'stuck')] = (causes[r.cause || (r.over === 'won' ? 'won' : 'stuck')] || 0) + 1; days += r.day;
    for (const [id, stage] of r.at) { totalEvents++; (seenAt[id] = seenAt[id] || new Set()).add(stage); }
  }
  const stageBound = { deogyu_gondola: 2, minjuji_samdobong: 3, hwangak_jikji: 4, songni_buddha: 5, sobaek_tunnel: 6, taebaek_mine: 7, hambaek_manhangjae: 8, duta_smoke: 9, odae_forest: 10, seorak_checkpoint: 11 };
  for (const [id, st] of Object.entries(stageBound)) { const got = seenAt[id] ? [...seenAt[id]] : []; if (got.some((x) => x !== st)) bad.push(id + ' at ' + got); }
  console.log('runs', runs, 'won', won, 'events', totalEvents, 'avg days', (days / runs).toFixed(1), JSON.stringify(causes), 'avg clues', (cluesSum / runs).toFixed(1), 'endings', JSON.stringify(endings));
  console.log('region events seen:', Object.keys(stageBound).map((id) => id + ':' + (seenAt[id] ? [...seenAt[id]].join('/') : '-')).join('  '));
  console.log('recurring:', ['survivor_return', 'survivor_revenge'].map((id) => id + ':' + (seenAt[id] ? 'yes' : 'no')).join('  '));
  console.log('stage violations:', bad);
  await browser.close();
})();
