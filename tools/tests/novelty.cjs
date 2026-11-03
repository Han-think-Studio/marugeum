const { chromium } = require('playwright');
// 처음 보는 이야기 우선: 지난 여정들에서 못 본 사건은 두 배로 잘 나온다. 첫 여정에는 차이가 없다
const PORT = Number(process.env.TEST_PORT || 4174);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const log = []; const fail = [];
  const check = (name, cond) => { log.push(`${cond ? 'ok ' : 'FAIL'} ${name}`); if (!cond) fail.push(name); };
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('marugeum.settings.v1', JSON.stringify({ difficulty: 'normal', handwork: false, slides: false })); });
  await page.goto(`http://localhost:${PORT}/?seed=42`, { waitUntil: 'networkidle' });
  const r = await page.evaluate(async () => {
    const ev = await import('/src/game/events.ts');
    const { Rng } = await import('/src/core/rng.ts');
    const g = window.marugeum; const s = g.state;
    const node = s.nodes.find((n) => n.place === 'cheonwangsaem');
    s.nodeId = node.id; s.hour = 10; s.day = 3; s.weather = 'clear'; s.over = 'none'; s.standoff = null;
    const flags = { ...s.flags };
    // 천왕샘에서 둘러볼 때 무엇이 뜨나. 800번 (처음 닿을 때는 반드시 뜨는 이야기가 먼저라 둘러보기로 잰다)
    const count = (seenBefore) => {
      s.seenBefore = seenBefore; let snake = 0; let any = 0; const ids = new Set();
      for (let i = 1; i <= 800; i++) {
        s.flags = { ...flags }; s.event = null;
        for (const k of Object.keys(s.flags)) if (k.startsWith('ev:')) delete s.flags[k];
        ev.maybeLook(s, new Rng(i * 7919), node);
        if (s.event) { any++; ids.add(s.event.id); if (s.event.id === 'spring_snake') snake++; }
      }
      s.event = null;
      return { snake, any, ids: [...ids] };
    };
    const first = count([]);
    // 여기서 뜰 수 있는 사건을 다 본 적이 있다고 하면 첫 여정과 똑같아야 한다
    const all = [...first.ids, 'spring_snake'];
    const seenAll = count(all);
    const novel = count(all.filter((x) => x !== 'spring_snake'));
    s.flags = flags;
    return { first, seenAll, novel };
  });
  check(`same odds when everything was seen before (${r.first.snake} vs ${r.seenAll.snake})`, r.first.snake === r.seenAll.snake && r.first.snake > 0);
  check(`an unseen story comes up about twice as often (${r.seenAll.snake} → ${r.novel.snake})`, r.novel.snake >= r.seenAll.snake * 1.5 && r.novel.snake > 20);
  await page.evaluate(() => localStorage.clear());
  console.log(log.join('\n'));
  console.log('FAILS:', fail.length, fail);
  console.log('page errors:', errors);
  await browser.close();
})();
