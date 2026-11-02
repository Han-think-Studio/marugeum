const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:4174/?seed=77', { waitUntil: 'networkidle' });
  const r = await page.evaluate(() => {
    const g = window.marugeum; const s = g.state; const log = []; const fail = [];
    const check = (name, cond) => { log.push(`${cond ? 'ok ' : 'FAIL'} ${name}`); if (!cond) fail.push(name); };
    const clear = () => { let k = 0; while (s.event && k++ < 20) { if (s.event.result === null) { let ok = false; for (let i = 0; i < 4 && !ok; i++) ok = g.pickChoice(s, i); if (!ok) { s.event = null; break; } } g.dismissEvent(s); } };
    const fresh = () => { Object.assign(s.stats, { hp: 100, hunger: 90, thirst: 90, fatigue: 100, temp: 100, rad: 0, mind: 60 }); s.weather = 'clear'; s.wind = 'calm'; };
    clear();
    const base = g.currentNode(s);
    check('base has radio + battery', base.equip.some((e) => e.kind === 'radio') && base.equip.some((e) => e.kind === 'battery' && e.charges === 4));
    // 마모: 거점기 야영장에서는 안 닳는다
    s.equip = [{ kind: 'tent', broken: false, cond: 100 }];
    fresh(); s.hour = 22; g.sleep(s); clear();
    check('no wear resting at base in base phase: ' + s.equip[0].cond, s.equip[0].cond === 100);
    // 종주: 하룻밤에 11
    const peak = s.nodes.find((n) => n.place === 'cheonwang'); peak.visited = true; s.nodeId = peak.id; s.phase = 'trek';
    fresh(); s.hour = 22; s.crisis = { kind: 'cold', start: 99999, end: 99999 + 24, warned: false, signed: false, started: false, sheltered: 0, exposed: 0 };
    g.sleep(s); clear();
    check('trek wear 11/day: ' + s.equip[0].cond, Math.abs(s.equip[0].cond - 89) < 0.01);
    s.equip[0].cond = 5; fresh(); s.hour = 22; g.sleep(s); clear();
    check('breaks at 0', s.equip[0].broken === true && s.equip[0].cond === 0);
    // 정비: 거점에서만
    s.equip = [{ kind: 'tent', broken: false, cond: 40 }, { kind: 'raincoat', broken: false, cond: 70 }];
    check('cannot maintain off-camp', !g.canMaintain(s));
    fresh(); s.hour = 9; g.makeCamp(s); clear();
    check('tent camp made (tent moved to node)', peak.camp && peak.campTier === 1);
    // 텐트가 거점으로 옮겨졌으니 우비만 남는다
    check('can maintain at camp', g.canMaintain(s));
    const h0 = s.hour; const m0 = s.stats.mind; g.maintain(s); clear();
    const rc = s.equip.find((e) => e.kind === 'raincoat');
    check(`maintain +40, 2h, mind+ (raincoat ${rc.cond})`, rc.cond === 100 && ((s.hour - h0 + 24) % 24) === 2 && s.stats.mind >= m0 + 4 - 1);
    rc.cond = 30; s.equip.push({ kind: 'tools', broken: false, cond: 100 }); g.maintain(s); clear();
    check('tools add +20: ' + rc.cond, rc.cond === 90);
    // 라디오와 건전지
    s.equip = [{ kind: 'radio', broken: false, cond: 90 }];
    check('no battery: cannot listen', !g.canListenRadio(s) && g.radioSource(s) === null);
    s.equip.push({ kind: 'battery', broken: false, charges: 2 });
    const now = g.absHour(s);
    s.crisis = { kind: 'fallout', start: now + 30, end: now + 54, warned: false, signed: false, started: false, sheltered: 0, exposed: 0 };
    s.radioHour = -99; fresh();
    check('can listen with battery', g.canListenRadio(s));
    g.listenRadio(s);
    check('radio warns crisis + uses battery', s.crisis.warned && g.batteryCount(s) === 1 && s.event && s.event.id === 'radio' && s.event.result.includes('시간 뒤'));
    clear();
    check('radio cooldown', !g.canListenRadio(s));
    check('crisisText shows warned', g.crisisText(s).includes('낙진비') && g.crisisText(s).includes('시간 뒤'));
    // 손전등: 건전지가 있어야 켜진다, 밤길에 하나 쓴다
    s.equip.push({ kind: 'flashlight', broken: false, cond: 80 });
    check('flashlight lit with battery', g.flashlightLit(s));
    const nb = g.neighbors(s).find((n) => n.stage > peak.stage); s.hour = 21; fresh(); s.hour = 21;
    const b0 = g.batteryCount(s); g.travelTo(s, nb.id); clear();
    check(`night travel uses battery ${b0} -> ${g.batteryCount(s)}`, g.batteryCount(s) === b0 - 1);
    check('no battery -> flashlight not lit', !g.flashlightLit(s));
    // 고비: 징조 → 시작 → 끝
    fresh(); s.hour = 8;
    const t0 = g.absHour(s);
    s.crisis = { kind: 'cold', start: t0 + 6, end: t0 + 14, warned: false, signed: false, started: false, sheltered: 0, exposed: 0 };
    const tempBefore = (() => { const w = window; return null; })();
    s.nodeId = nb.id; s.pack.wood = 3; g.rest(s); clear();
    check('sky sign seen within 12h', s.crisis.signed && s.log.some((l) => l.includes('반나절 안에 한파')));
    g.rest(s); g.rest(s); clear();
    check('crisis started + active', s.crisis.started && g.crisisActive(s) && s.log.some((l) => l.startsWith('[고비]')));
    const risk = g.routeRisk(s, g.neighbors(s)[0]);
    check('routeRisk includes 한파: ' + risk.why.join(','), risk.why.includes('한파'));
    const ph = s.stats.mind; s.photoDay = 0; g.lookPhoto(s);
    check('photo in crisis gives extra mind', s.stats.mind - ph >= 9);
    if (!g.hasFire(s) && g.canLightFire(s)) g.lightFire(s);
    let guard = 0; while (s.crisis.kind === 'cold' && s.crisis.start === t0 + 6 && guard++ < 10) { g.rest(s); if (s.event && s.event.id.startsWith('crisis_')) break; clear(); }
    check('crisis end event + next planned', s.event && s.event.id === 'crisis_cold' && s.crisis.start > t0 + 14 + 40);
    clear();
    // 폭설: 이동 1.5배
    fresh(); s.hour = 9; const t1 = g.absHour(s); const cur = g.currentNode(s); const nb2 = g.neighbors(s)[0];
    s.crisis = null; const hNormal = g.travelHours(s, cur, nb2);
    s.crisis = { kind: 'snow', start: t1 - 1, end: t1 + 20, warned: true, signed: true, started: true, sheltered: 0, exposed: 0 };
    const hSnow = g.travelHours(s, cur, nb2);
    check(`snow travel ${hNormal} -> ${hSnow}`, hSnow >= Math.round(hNormal * 1.4));
    return { log, fail };
  });
  console.log(r.log.join('\n'));
  console.log('FAILS:', r.fail.length, r.fail);
  // 화면: 고비 중 장면과 상단
  await page.evaluate(() => { const g = window.marugeum; const s = g.state; s.event = null; s.view = 'scene'; g.render(); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: process.argv[2] + '/wear-crisis-snow.png' });
  console.log('page errors:', errors);
  await browser.close();
})();
