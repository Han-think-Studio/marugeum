const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
// itch.io 처럼 dist 를 남의 페이지 안 iframe(1280x800)에 넣고 돌린다. 하위 경로에서 열리고, 키보드가 먹고, 저장이 남는지
// 사용: npm run build 뒤에 node tools/tests/itch-frame.cjs <출력 폴더>
const dist = path.join(__dirname, '../../dist');
const PORT = Number(process.env.TEST_PORT || 4181);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/' || url === '/page.html') {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<!doctype html><body style="margin:0;background:#222"><h1 style="color:#fff;font:16px sans-serif">itch page</h1><iframe id="game" src="/html/123456/index.html" width="1280" height="800" allow="autoplay; fullscreen" allowfullscreen style="border:0"></iframe></body>');
    return;
  }
  const m = url.match(/^\/html\/123456\/(.*)$/);
  const file = m && path.join(dist, m[1] || 'index.html');
  if (!file || !file.startsWith(dist) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1320, height: 900 } });
  const errors = []; const missing = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() === 404 && !/\.(webp|png)$/.test(r.url())) missing.push(r.url()); });
  const log = []; const fail = [];
  const check = (name, cond) => { log.push(`${cond ? 'ok ' : 'FAIL'} ${name}`); if (!cond) fail.push(name); };
  await page.goto(`http://localhost:${PORT}/page.html`, { waitUntil: 'networkidle' });
  const frame = page.frame({ url: /index\.html/ });
  check('game loads inside the frame under a sub path', !!frame && await frame.$('.overlay.title') !== null);
  // 처음엔 틀에 포커스가 없다. 한 번 누르면 키보드가 먹는다
  await page.click('#game', { position: { x: 640, y: 700 } });
  await frame.click('.overlay .new');
  await page.waitForTimeout(400);
  check('new journey starts by click', await frame.$('.hud') !== null);
  // 첫 장면들은 숫자 키와 Enter 로 넘긴다
  for (let i = 0; i < 12 && await frame.$('.event'); i++) { await page.keyboard.press('1'); await page.waitForTimeout(120); }
  check('opening events close with the keyboard', await frame.$('.event') === null);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(150);
  const tab = await frame.$eval('.tabs button.on', (b) => b.dataset.tab);
  check(`keyboard reaches the game inside the frame (tab → ${tab})`, tab !== 'act');
  const t0 = await frame.$eval('.hud .time', (e) => e.textContent);
  await page.keyboard.press('r');
  await page.waitForTimeout(250);
  const t1 = await frame.$eval('.hud .time', (e) => e.textContent);
  check(`shortcut key acts (${t0} → ${t1})`, t0 !== t1);
  // 저장은 틀 안의 저장소에 남는다. 다시 열면 이어하기
  await page.reload({ waitUntil: 'networkidle' });
  const frame2 = page.frame({ url: /index\.html/ });
  check('save survives a reload (resume offered)', await frame2.$('.overlay .resume') !== null);
  await page.screenshot({ path: path.join(process.argv[2] || '.', 'itch-frame.png') });
  check(`no missing scripts or styles (${missing.join(', ')})`, missing.length === 0);
  await frame2.evaluate(() => localStorage.clear());
  console.log(log.join('\n'));
  console.log('FAILS:', fail.length, fail);
  console.log('page errors:', errors);
  await browser.close(); server.close();
})();
