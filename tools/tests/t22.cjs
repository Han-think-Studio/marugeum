const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:4174/?seed=42', { waitUntil: 'networkidle' });
  const r = await page.evaluate(() => {
    const g = window.marugeum; const s = g.state; const log = [];
    const clear = () => { while (s.event) { if (s.event.result === null) { let ok = false; for (let i = 0; i < 4 && !ok; i++) ok = g.pickChoice(s, i); if (!ok) { s.event = null; break; } } g.dismissEvent(s); } };
    clear();
    const nb = g.neighbors(s)[0]; const cur = g.currentNode(s);
    // 지게
    s.equip = []; const cap0 = g.packCap(s); const lim0 = g.heavyLimit(s); const h0 = g.travelHours(s, cur, nb); const wl0 = g.weightLimit(s);
    s.equip = [{ kind: 'carrier', broken: false }]; const cap1 = g.packCap(s); const lim1 = g.heavyLimit(s); const h1 = g.travelHours(s, cur, nb); const wl1 = g.weightLimit(s);
    log.push(`carrier: cap ${JSON.stringify(cap0)} -> ${JSON.stringify(cap1)}, heavy ${lim0}->${lim1}, travel ${h0}->${h1}, weightLimit ${wl0}->${wl1}`);
    log.push('canCarry 3rd heavy with carrier: ' + (s.equip.push({ kind: 'generator', broken: false }, { kind: 'fridge', broken: false }), g.canCarry(s, 'heater')));
    // 손전등: 밤 이동
    s.equip = []; s.hour = 22; const n0 = g.travelHours(s, cur, nb); s.equip = [{ kind: 'flashlight', broken: false }]; const n1 = g.travelHours(s, cur, nb); s.hour = 10;
    log.push(`night travel: no light ${n0}, flashlight ${n1}`);
    // 라이터: 비 오는 바깥 불
    const peak = s.nodes.find((n) => n.kind === 'peak'); peak.visited = true; s.nodeId = peak.id; s.weather = 'rain'; s.pack.wood = 2; s.equip = [];
    const f0 = g.canLightFire(s); s.equip = [{ kind: 'matches', broken: false }]; const f1 = g.canLightFire(s);
    log.push(`fire in rain outdoors: no matches ${f0}, matches ${f1}`);
    s.weather = 'clear';
    // 방독면·우비: 비 오는 날 이동
    const trip = (equip) => { s.nodeId = cur.id; s.equip = equip; s.weather = 'rain'; s.wind = 'calm'; s.hour = 10; s.stats.rad = 0; s.stats.temp = 100; s.stats.hp = 100; s.stats.thirst = 90; s.stats.hunger = 90; s.stats.fatigue = 100; g.travelTo(s, nb.id); clear(); const out = { rad: s.stats.rad.toFixed(1), temp: Math.round(s.stats.temp) }; s.nodeId = cur.id; return out; };
    const base = trip([]); const mask = trip([{ kind: 'mask', broken: false }]); const coat = trip([{ kind: 'raincoat', broken: false }]);
    log.push(`rainy trip: plain ${JSON.stringify(base)}, mask ${JSON.stringify(mask)}, raincoat ${JSON.stringify(coat)}`);
    s.weather = 'clear';
    // 칼: 대치 확률
    s.equip = []; s.event = { id: 'valley_boar', result: null }; g.pickChoice(s, 2); g.dismissEvent(s); const o0 = g.standoffOdds(s, 'fight'); s.equip = [{ kind: 'knife', broken: false }]; const o1 = g.standoffOdds(s, 'fight'); s.standoff = null;
    log.push(`fight odds: no knife ${o0.toFixed(2)}, knife ${o1.toFixed(2)}`);
    // 소모품
    s.equip = []; s.event = { id: 'military_medkit', result: null }; g.pickChoice(s, 0); g.dismissEvent(s);
    log.push('after medkit event: equip=' + JSON.stringify(s.equip));
    s.event = { id: 'supply_drop', result: null }; g.pickChoice(s, 0); g.dismissEvent(s);
    log.push('after supply drop: equip=' + JSON.stringify(s.equip) + ' (iodine charges merged?)');
    s.stats.rad = 50; log.push('iodine: can=' + g.canTakeIodine(s) + ' take=' + g.takeIodine(s) + ' rad=' + s.stats.rad + ' again today=' + g.canTakeIodine(s) + ' equip=' + JSON.stringify(s.equip.filter((e) => e.kind === 'iodine')));
    s.stats.hp = 50; const hh = s.hour; log.push('firstAid: can=' + g.canFirstAid(s) + ' do=' + g.firstAid(s) + ' hp=' + Math.round(s.stats.hp) + ' hours=' + ((s.hour - hh + 24) % 24) + ' medkit=' + JSON.stringify(s.equip.filter((e) => e.kind === 'medkit')));
    s.equip.push({ kind: 'purifier', broken: false, charges: 1 }); s.pack.dirty = 2; s.pack.water = 0;
    log.push('purify: can=' + g.canPurify(s) + ' do=' + g.purify(s) + ' pack water=' + s.pack.water + ' dirty=' + s.pack.dirty + ' purifier left=' + s.equip.filter((e) => e.kind === 'purifier').length);
    // 농기구 창고 이벤트
    s.equip = []; cur.objects.push({ id: 5001, kind: 'toolshed', x: 0.5, y: 0.7, hidden: false, used: false, usedDay: 0, name: '농기구 창고' });
    s.nodeId = cur.id; g.inspectObject(s, 5001); g.pickChoice(s, 0); g.dismissEvent(s); log.push('toolshed: equip=' + JSON.stringify(s.equip));
    // 로프 선택지 조건
    s.equip = []; s.event = { id: 'valley_bridge', result: null }; const noRope = g.pickChoice(s, 0); s.event = { id: 'valley_bridge', result: null }; s.equip = [{ kind: 'rope', broken: false }]; const withRope = g.pickChoice(s, 0); const res = s.event && s.event.result; g.dismissEvent(s);
    log.push(`bridge rope choice: without ${noRope}, with ${withRope} -> ${res && res.slice(0, 20)}`);
    return log;
  });
  console.log(r.join('\n'));
  console.log('errors:', errors);
  await browser.close();
})();
