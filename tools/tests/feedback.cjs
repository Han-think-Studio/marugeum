const { chromium } = require('playwright');
// 누른 결과: 사건 결과 아래 변화 칩, 짐 탭의 장비 칸을 눌러 쓰기
const PORT = Number(process.env.TEST_PORT || 4174);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const log = []; const fail = [];
  const check = (name, cond) => { log.push(`${cond ? 'ok ' : 'FAIL'} ${name}`); if (!cond) fail.push(name); };
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('marugeum.settings.v1', JSON.stringify({ difficulty: 'normal', handwork: false, slides: false })); });
  await page.goto(`http://localhost:${PORT}/?seed=42`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { const g = window.marugeum; const s = g.state; while (s.event) { if (s.event.result === null) g.pickChoice(s, 0); g.dismissEvent(s); } g.render(); });

  // 1) 사건을 화면에서 고르면 결과 아래 칩이 뜬다. 만항재 짐칸: 시간, 먹을 것, 담요
  await page.evaluate(() => { const g = window.marugeum; const s = g.state; s.pack.food = 0; s.event = { id: 'monk_letter', result: null }; g.render(); });
  await page.evaluate(() => { const g = window.marugeum; const s = g.state; s.event = { id: 'hambaek_manhangjae', result: null }; s.rngState = 1; g.render(); });
  await page.click('.event-choices button:nth-child(1)');
  await page.waitForTimeout(200);
  const chips = await page.$$eval('.event .deltas .d', (els) => els.map((e) => e.textContent));
  check(`result shows change chips (${chips.join(' | ')})`, chips.some((t) => t.includes('시간')) && chips.length >= 2);
  await page.screenshot({ path: process.argv[2] + '/feedback-event.png' });
  await page.click('.event button.ok');
  await page.waitForTimeout(150);
  // 키보드로 골라도 칩이 뜬다
  await page.evaluate(() => { const g = window.marugeum; const s = g.state; s.event = { id: 'odae_forest', result: null }; g.render(); });
  await page.keyboard.press('2');
  await page.waitForTimeout(150);
  const keyChips = await page.$$eval('.event .deltas .d', (els) => els.map((e) => e.textContent));
  check(`keyboard pick shows chips too (${keyChips.join(' | ')})`, keyChips.some((t) => t.includes('땔감 +')));
  await page.keyboard.press('Enter');

  // 2) 짐 탭: 요오드 칸을 누르면 먹는다. 응급처치는 다친 데가 없으면 흐리다
  await page.evaluate(() => { const g = window.marugeum; const s = g.state; s.event = null; s.stats.rad = 40; s.stats.hp = 100; s.equip.push({ kind: 'iodine', charges: 3, broken: false }, { kind: 'medkit', charges: 2, broken: false }); g.render(); });
  await page.click('.tabs button[data-tab="pack"]');
  await page.waitForTimeout(150);
  const tiles = await page.$$eval('.gtile', (els) => els.map((e) => ({ name: e.querySelector('span')?.textContent, use: e.classList.contains('use'), off: e.classList.contains('off') })));
  const iod = tiles.find((t) => t.name && t.name.includes('요오드')); const med = tiles.find((t) => t.name && t.name.includes('구급'));
  check(`iodine tile usable, medkit dimmed when unhurt (${JSON.stringify([iod, med])})`, iod && iod.use && !iod.off && med && med.use && med.off);
  const knife = tiles.find((t) => t.name === '칼');
  check('plain gear is not clickable', !knife || !knife.use);
  await page.screenshot({ path: process.argv[2] + '/feedback-pack.png' });
  await page.click('.gtile.use:not(.off)');
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => { const s = window.marugeum.state; return { rad: s.stats.rad, charges: s.equip.find((e) => e.kind === 'iodine')?.charges }; });
  check(`clicking iodine takes it (rad ${after.rad}, left ${after.charges})`, after.rad < 40 && after.charges === 2);
  await page.evaluate(() => localStorage.clear());

  console.log(log.join('\n'));
  console.log('FAILS:', fail.length, fail);
  console.log('page errors:', errors);
  await browser.close();
})();
