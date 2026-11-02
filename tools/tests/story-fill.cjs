const { chromium } = require('playwright');
// 글과 수치 잇기(저장고 손실, 텐트 상함), 지난 여정의 돌무더기, 수첩의 '그 뒤'
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
    clear();
    const base = g.currentNode(s);

    // 저장고 손실: 멧돼지에 저장고 문이 부서지면 보존식 둘이 실제로 준다
    base.store.food = 3; base.store.fresh = 2;
    s.event = { id: 'base_thief', result: null }; g.pickChoice(s, 1); g.dismissEvent(s);
    check(`base_thief: store food 3 → 1 (now ${base.store.food})`, base.store.food === 1 && base.store.fresh === 2);
    base.store.food = 1; base.store.fresh = 2;
    s.event = { id: 'base_thief', result: null }; g.pickChoice(s, 1); g.dismissEvent(s);
    check(`storeLoss takes fresh after food runs out (food ${base.store.food}, fresh ${base.store.fresh})`, base.store.food === 0 && base.store.fresh === 1);

    // 텐트 상함: 지닌 텐트든 쳐 둔 텐트든 상태가 35 내려가고 고장은 안 난다
    let tentCase = null;
    for (let i = 0; i < 40 && !tentCase; i++) {
      s.equip = [{ kind: 'tent', broken: false, cond: 80 }];
      s.event = { id: 'tentcamp_smell', result: null }; g.pickChoice(s, 0);
      if (s.event.result.includes('찢어졌다')) tentCase = { ...s.equip[0] };
      g.dismissEvent(s);
    }
    check(`tent torn: cond 80 → 45, not broken (${JSON.stringify(tentCase)})`, tentCase && tentCase.cond === 45 && !tentCase.broken);
    s.equip = []; base.equip.push({ kind: 'tent', broken: false, cond: 20 });
    let pitched = null;
    for (let i = 0; i < 40 && pitched === null; i++) {
      s.event = { id: 'tentcamp_smell', result: null }; g.pickChoice(s, 0);
      if (s.event.result.includes('찢어졌다')) pitched = base.equip.find((e) => e.kind === 'tent').cond;
      g.dismissEvent(s);
    }
    check(`pitched tent wears too and stops at 1 (${pitched})`, pitched === 1);

    // 지난 여정의 돌무더기: 두 번째 여정, 지난번에 죽은 자리에 처음 닿으면 반드시 열린다
    s.equip = []; s.runNo = 2; s.hour = 8; s.weather = 'clear'; s.nextWeather = 'clear'; s.weatherLeft = 30; s.crisis = null;
    const to = g.neighbors(s).find((n) => !['cheonwang', 'seongsamjae'].includes(n.place) && !g.travelBlock(s, n));
    s.deadAt = [to.place];
    g.travelTo(s, to.id);
    check(`past_cairn opens at ${to.place} (event ${s.event && s.event.id})`, s.event && s.event.id === 'past_cairn');
    clear();

    // 수연의 흔적은 단서가 아니다
    const clues = Object.keys(s.flags).filter((k) => k.startsWith('clue:')).length;
    s.event = { id: 'suyeon_hwabang', result: null }; g.pickChoice(s, 0); g.dismissEvent(s);
    check('suyeon trace sets its flag, adds no clue', s.flags['suyeon:hwabang'] && Object.keys(s.flags).filter((k) => k.startsWith('clue:')).length === clues);
    return { log, fail };
  });

  // 수첩의 '그 뒤': 닿은 엔딩은 글이, 아직인 것은 빈 줄이
  const journal = { v: 1, runs: [{ runNo: 1, seed: 1, days: 9, over: 'won', cause: '', rad: 30, farthest: 13, events: [], gear: [], ending: 'stay', clues: 3, endedAt: 0 }], knownStages: [], knownPlaces: [], eventsSeen: {}, deaths: {} };
  await page.evaluate((j) => { localStorage.removeItem('marugeum.save.v3'); localStorage.setItem('marugeum.journal.v1', JSON.stringify(j)); }, journal);
  await page.goto('http://localhost:4174/', { waitUntil: 'networkidle' });
  await page.click('.overlay .journal');
  await page.waitForTimeout(200);
  const afters = await page.$$eval('.afters li', (els) => els.map((e) => e.textContent));
  const ok = afters.length === 4 && afters.filter((t) => t.includes('아직 닿지 않은 끝')).length === 3 && afters.some((t) => t.includes('남기') && t.includes('1번째 여정') && t.includes('폐광의 겨울'));
  r.log.push(`${ok ? 'ok ' : 'FAIL'} journal shows one epilogue and three blanks`);
  if (!ok) r.fail.push('journal afters: ' + JSON.stringify(afters));
  await page.screenshot({ path: process.argv[2] + '/story-fill-journal.png' });
  await page.evaluate(() => localStorage.removeItem('marugeum.journal.v1'));

  console.log(r.log.join('\n'));
  console.log('FAILS:', r.fail.length, r.fail);
  console.log('page errors:', errors);
  await browser.close();
})();
