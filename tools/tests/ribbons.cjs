const { chromium } = require('playwright');
// 리본(내 리본·마루금 리본, 수첩에 남고 바래는 것)과 두 사람의 가장 새로운 소식
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const log = []; const fail = [];
  const check = (name, cond) => { log.push(`${cond ? 'ok ' : 'FAIL'} ${name}`); if (!cond) fail.push(name); };

  // 수첩: 다섯 번째 여정 앞. 1번째 여정의 리본은 바랬고 3번째 것은 남았다
  const journal = {
    v: 1, knownStages: [], knownPlaces: [], eventsSeen: {}, deaths: {},
    runs: [1, 2, 3, 4].map((runNo) => ({ runNo, seed: runNo, days: 3, over: 'dead', cause: '', rad: 10, farthest: 1, events: [], gear: [], endedAt: 0 })),
    ribbons: [{ key: 'jungsanri~seongsamjae', run: 3 }, { key: 'cheonwang~jungsanri', run: 1 }],
  };
  await page.goto('http://localhost:4174/', { waitUntil: 'networkidle' });
  await page.evaluate((j) => { localStorage.removeItem('marugeum.save.v3'); localStorage.setItem('marugeum.journal.v1', JSON.stringify(j)); }, journal);
  await page.goto('http://localhost:4174/?new=1', { waitUntil: 'networkidle' });

  const r = await page.evaluate(() => {
    const g = window.marugeum; const s = g.state; const out = {};
    while (s.event) { if (s.event.result === null) g.pickChoice(s, 0); g.dismissEvent(s); }
    out.run = s.runNo; out.ribbons = [...s.ribbons];
    s.hour = 8; s.weather = 'clear'; s.wind = 'calm'; s.nextWeather = 'clear'; s.weatherLeft = 30; s.crisis = null;
    const cur = g.currentNode(s);
    const sam = g.neighbors(s).find((n) => n.place === 'seongsamjae');
    const cheon = g.neighbors(s).find((n) => n.place === 'cheonwang');
    out.samKnown = g.isKnown(s, cur, sam);
    out.cheonKnown = g.isKnown(s, cur, cheon);
    const before = g.travelHours(s, cur, sam);
    s.ribbons = []; out.samPlain = g.travelHours(s, cur, sam); s.ribbons = out.ribbons;
    out.samHours = before;
    out.samRisk = g.routeRisk(s, sam).why;
    // 소식: 쪽지 하나면 중산리, 법주사 흔적을 찾으면 더 가까운 소식
    g.render();
    out.chip1 = document.querySelector('.hud .family')?.textContent ?? '';
    s.flags['clue:songni'] = true; s.day = 3; g.render();
    out.chip2 = document.querySelector('.hud .family')?.textContent ?? '';
    s.day = 1; delete s.flags['clue:songni'];
    // 걸으면 리본을 묶는다
    g.travelTo(s, sam.id);
    while (s.event) { if (s.event.result === null) g.pickChoice(s, 0); g.dismissEvent(s); }
    out.tied = [...s.tied];
    out.tieLog = s.log.some((l) => l.includes('리본을 묶는다'));
    // 마루금(능선끼리)은 처음 가는 길이어도 '모르는 길'이 아니다
    const ridgeNext = g.neighbors(s).find((n) => n.side === 'ridge' && !n.visited && !g.isKnown(s, g.currentNode(s), n));
    out.ridgeNext = ridgeNext ? ridgeNext.place : null;
    out.ridgeRisk = ridgeNext ? g.routeRisk(s, ridgeNext).why : [];
    // 여정이 끝나면 수첩에 리본이 남는다
    s.over = 'dead'; s.overText = '1일째, 산에서 죽었다.'; g.render();
    out.saved = JSON.parse(localStorage.getItem('marugeum.journal.v1')).ribbons;
    return out;
  });

  check(`run 5 keeps the run-3 ribbon, drops the faded run-1 one (${JSON.stringify(r.ribbons)})`, r.run === 5 && r.ribbons.length === 1 && r.ribbons[0] === 'jungsanri~seongsamjae');
  check(`my ribbon makes the route known and faster (${r.samPlain}h → ${r.samHours}h)`, r.samKnown && r.samHours < r.samPlain && !r.cheonKnown);
  check(`my ribbon route is not '모르는 길' (${r.samRisk.join(',')})`, !r.samRisk.includes('모르는 길'));
  check(`family chip shows the newest trace (${r.chip1} → ${r.chip2})`, r.chip1.includes('중산리') && r.chip2.includes('법주사'));
  check('walking a route ties a ribbon and says so', r.tied.includes('jungsanri~seongsamjae') && r.tieLog);
  check(`ridge-to-ridge route has 마루금 ribbons, no '모르는 길' (${r.ridgeNext}: ${r.ridgeRisk.join(',')})`, r.ridgeNext === null || !r.ridgeRisk.includes('모르는 길'));
  const savedKeys = (r.saved || []).map((x) => `${x.key}@${x.run}`);
  check(`journal keeps the new ribbon with this run (${savedKeys.join(' ')})`, savedKeys.includes('jungsanri~seongsamjae@5') && !savedKeys.some((k) => k.startsWith('cheonwang~jungsanri')));

  await page.evaluate(() => { localStorage.removeItem('marugeum.journal.v1'); localStorage.removeItem('marugeum.save.v3'); });
  console.log(log.join('\n'));
  console.log('FAILS:', fail.length, fail);
  console.log('page errors:', errors);
  await browser.close();
})();
