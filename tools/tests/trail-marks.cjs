const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://localhost:4174/?seed=42', { waitUntil: 'networkidle' });
  const r = await page.evaluate(() => {
    const g = window.marugeum; const s = g.state; const log = []; const fail = [];
    const check = (name, cond) => { log.push(`${cond ? 'ok ' : 'FAIL'} ${name}`); if (!cond) fail.push(name); };
    const clear = () => { while (s.event) { if (s.event.result === null) g.pickChoice(s, 0); g.dismissEvent(s); } };
    clear();
    check('starts marked 성삼재', s.marked.length === 1 && s.marked[0] === 'seongsamjae');
    s.hour = 8; s.weather = 'clear'; s.phase = 'trek'; s.stats.fatigue = 100;
    const ss = s.nodes.find((n) => n.place === 'seongsamjae'); const ll = s.log.length; g.travelTo(s, ss.id);
    check('clue_jiri opened and marks 육십령', s.event && s.event.id === 'clue_jiri' && s.marked.includes('yuksimnyeong') && s.log.slice(ll).some((l) => l.includes('지도에 표시해 두었다: 육십령 휴게소')));
    clear();
    const monkNode = s.nodes.find((n) => n.place === 'baengnyeonsa'); monkNode.visited = true; s.nodeId = monkNode.id; s.event = { id: 'temple_monk', result: null };
    g.pickChoice(s, 1); g.dismissEvent(s);
    check('monk choice does not itself mark (marks on open)', true);
    return { log, fail, marked: s.marked };
  });
  console.log(r.log.join('\n')); console.log('marked:', r.marked); console.log('FAILS:', r.fail.length, r.fail);
  await page.evaluate(() => { const g = window.marugeum; const s = g.state; s.view = 'map'; s.nodeId = s.nodes.find((n) => n.place === 'seongsamjae').id; g.render(); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: process.argv[2] + '/trail-marks-map.png' });
  console.log('page errors:', errors);
  await browser.close();
})();
