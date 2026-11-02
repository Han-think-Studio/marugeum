const { chromium } = require('playwright');
// 손 놀이: 성냥 긋기·국 끓이기·망치질·드라이버가 뜨고, 솜씨가 결과를 바꾸고, Esc 로 그만두면 아무 일도 없고, '자동'이면 놀이 없이 된다
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const log = []; const fail = [];
  const check = (name, cond) => { log.push(`${cond ? 'ok ' : 'FAIL'} ${name}`); if (!cond) fail.push(name); };
  const S = (fn) => page.evaluate(fn);
  const open = () => page.locator('.overlay.hand').count();
  const waitClosed = () => page.waitForSelector('.overlay.hand', { state: 'detached', timeout: 15000 });

  await page.goto('http://localhost:4174/', { waitUntil: 'networkidle' });
  await S(() => { localStorage.removeItem('marugeum.settings.v1'); localStorage.removeItem('marugeum.save.v3'); });
  await page.goto('http://localhost:4174/?seed=42', { waitUntil: 'networkidle' });
  await S(() => { const g = window.marugeum; const s = g.state; while (s.event) { if (s.event.result === null) g.pickChoice(s, 0); g.dismissEvent(s); } s.pack.wood = 3; s.pack.water = 3; s.pack.food = 3; s.stats.hunger = 30; g.render(); });

  // 성냥: Esc 로 그만두면 땔감도 불도 그대로
  await page.keyboard.press('h');
  check('match game opens on H', (await open()) === 1);
  await page.keyboard.press('Escape');
  await waitClosed();
  let st = await S(() => ({ fire: window.marugeum.state.fire, wood: window.marugeum.state.pack.wood }));
  check('Esc cancels: no fire, wood kept', st.fire === null && st.wood === 3);

  // 성냥: 세 번 다 그어 본다. 어떻게든 불은 붙는다
  await page.keyboard.press('h');
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(450); }
  await waitClosed();
  st = await S(() => ({ fire: window.marugeum.state.fire, wood: window.marugeum.state.pack.wood }));
  check(`match: fire lit, hours 6..14 (${st.fire && st.fire.hours})`, st.fire && st.fire.hours >= 6 && st.fire.hours <= 14 && st.wood === 2);

  // 국: 떼고 있으면 불이 약해 솜씨가 낮다. 그래도 끓고 배는 부르다
  const h0 = await S(() => window.marugeum.state.stats.hunger);
  await page.keyboard.press('a');
  check('cook game opens on A', (await open()) === 1);
  await waitClosed();
  st = await S(() => ({ hunger: window.marugeum.state.stats.hunger, water: window.marugeum.state.pack.water, last: window.marugeum.state.log.slice(-1)[0] }));
  check(`cook with no heat: low skill but fed (${h0} → ${st.hunger}, ${st.last})`, st.hunger > h0 && st.water === 2 && st.last.includes('탔다'));

  // 국: 불을 알맞게 맞춰 본다. 누르고 떼기를 번갈아
  await S(() => { window.marugeum.state.stats.hunger = 20; window.marugeum.render(); });
  await page.keyboard.press('a');
  await page.waitForSelector('.overlay.hand');
  const t0 = Date.now();
  while (Date.now() - t0 < 8600 && (await open())) {
    await page.keyboard.down('Space'); await page.waitForTimeout(260);
    await page.keyboard.up('Space'); await page.waitForTimeout(300);
  }
  await waitClosed();
  st = await S(() => ({ hunger: window.marugeum.state.stats.hunger, last: window.marugeum.state.log.slice(-1)[0] }));
  check(`cook with heat control: fed more (${st.hunger}, ${st.last})`, st.hunger >= 20 + 38 && !st.last.includes('탔다'));

  // 수리: 망치(밧줄은 기계가 아니다)와 드라이버(라디오). 거점 화면에서
  await S(() => { const s = window.marugeum.state; s.equip.push({ kind: 'rope', broken: true }, { kind: 'radio', broken: true, cond: 0 }); s.pack.parts = 3; window.marugeum.render(); });
  await page.keyboard.press('c');
  await page.waitForSelector('.overlay.base [data-rep]');
  await page.locator('.overlay.base [data-rep="pack"]').first().click();
  check('hammer game opens from repair', (await page.locator('.overlay.hand h2').textContent()) === '망치질');
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(300); }
  await waitClosed();
  st = await S(() => ({ rope: window.marugeum.state.equip.find((e) => e.kind === 'rope'), parts: window.marugeum.state.pack.parts }));
  check(`hammer repair spends a part (${JSON.stringify(st)})`, st.parts === 2);
  check('base screen still open after hand play', (await page.locator('.overlay.base').count()) === 1);
  await page.locator('.overlay.base [data-rep="pack"]').last().click();
  check('screwdriver game opens for the radio', (await page.locator('.overlay.hand h2').textContent()) === '드라이버');
  // 누르고 있다가 초록 칸 근처에서 뗀다
  for (let i = 0; i < 3; i++) { await page.keyboard.down('Space'); await page.waitForTimeout(1150 + i * 150); await page.keyboard.up('Space'); await page.waitForTimeout(200); }
  await waitClosed();
  st = await S(() => ({ radio: window.marugeum.state.equip.find((e) => e.kind === 'radio'), parts: window.marugeum.state.pack.parts }));
  check(`screwdriver repair spends a part (${JSON.stringify(st.radio)})`, st.parts === 1);
  await page.keyboard.press('Escape');

  // 자동: 놀이 없이 바로 된다
  await S(() => { localStorage.setItem('marugeum.settings.v1', JSON.stringify({ handwork: false })); });
  await page.goto('http://localhost:4174/?seed=42', { waitUntil: 'networkidle' });
  await S(() => { const g = window.marugeum; const s = g.state; while (s.event) { if (s.event.result === null) g.pickChoice(s, 0); g.dismissEvent(s); } s.pack.wood = 2; g.render(); });
  await page.keyboard.press('h');
  await page.waitForTimeout(300);
  st = await S(() => ({ fire: window.marugeum.state.fire, overlay: !!document.querySelector('.overlay.hand') }));
  check(`auto: no game, fire at normal 10h (${st.fire && st.fire.hours})`, !st.overlay && st.fire && st.fire.hours === 10);
  await S(() => { localStorage.removeItem('marugeum.settings.v1'); localStorage.removeItem('marugeum.save.v3'); });

  await page.screenshot({ path: process.argv[2] + '/handwork.png' });
  console.log(log.join('\n'));
  console.log('FAILS:', fail.length, fail);
  console.log('page errors:', errors);
  await browser.close();
})();
