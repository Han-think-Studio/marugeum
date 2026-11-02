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
    const clear = () => { while (s.event) { if (s.event.result === null) g.pickChoice(s, 0); g.dismissEvent(s); } };
    clear();
    const by = (id) => s.nodes.find((n) => n.place === id);
    // 여정을 좀 진행한 상태를 만든다: 성삼재 흔적, 장터목 거점, 둔 물건, 지난 여정 자리
    s.hour = 8; s.weather = 'clear'; s.phase = 'trek'; s.stats.fatigue = 100;
    g.travelTo(s, by('seongsamjae').id); clear();
    check('clue found at 성삼재', g.clueFoundPlaces(s).includes('seongsamjae'));
    const jt = by('jangteomok'); jt.visited = true; jt.camp = true; jt.campTier = 3; jt.store = { water: 2, dirty: 0, food: 3, fresh: 0, wood: 1, gasoline: 0, diesel: 0, parts: 0 }; jt.equip = [{ kind: 'lamp', broken: false }];
    const cw = by('cheonwang'); cw.visited = true; cw.equip = [{ kind: 'tent', broken: false }];
    s.deadAt = ['samdobong'];
    const h = g.hoursTo(s, jt.id);
    check('hoursTo 장터목 from 성삼재 is a number > 0: ' + h, typeof h === 'number' && h > 0);
    check('hoursTo here is 0', g.hoursTo(s, s.nodeId) === 0);
    s.view = 'map'; g.render();
    return { log, fail };
  });
  console.log(r.log.join('\n')); console.log('FAILS:', r.fail.length, r.fail);
  await page.waitForTimeout(500);
  // 장터목 노드 위로 마우스를 올려 말풍선
  const pos = await page.evaluate(() => { const g = window.marugeum; const s = g.state; const n = s.nodes.find((x) => x.place === 'jangteomok'); const c = document.querySelector('canvas.map'); const rect = c.getBoundingClientRect(); return { x: rect.left + 36 + n.x * (rect.width - 72), y: rect.top + 28 + n.y * (rect.height - 28 - 24) }; });
  await page.mouse.move(pos.x, pos.y);
  await page.waitForTimeout(300);
  await page.screenshot({ path: process.argv[2] + '/s29-map.png' });
  console.log('page errors:', errors);
  await browser.close();
})();
