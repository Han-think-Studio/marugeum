const { chromium } = require('playwright');
const fs = require('fs');
const S = process.argv[2];
const src = fs.readFileSync(S + '/stage.cjs', 'utf8');
const bot = src.match(/const bot = `([\s\S]*?)`;\n/)[1];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const total = {}; let runs = 0; const perRun = [];
  for (let seed = 1; seed <= 12; seed++) {
    await page.goto('http://localhost:4174/?seed=' + (1000 + seed), { waitUntil: 'networkidle' });
    const r = await page.evaluate((code) => {
      const g = window.marugeum; const s = g.state; const b = eval(code);
      const acc = {}; let steps = 0;
      const names = ['travelTo', 'sleep', 'rest', 'lookAround', 'inspectObject', 'pickChoice', 'dismissEvent', 'lightFire', 'gatherWood', 'maintain', 'listenRadio', 'makeCamp', 'drink', 'eat', 'fill', 'boil', 'scout', 'standoffMove'];
      let label = 'other';
      for (const n of names) { const f = g[n]; g[n] = (...a) => { label = n; return f(...a); }; }
      while (s.over === 'none' && steps < 1200) {
        steps++; const r0 = s.stats.rad; const cur = g.currentNode(s); const wasRain = s.weather === 'rain'; const cr = g.crisisActive(s) ? s.crisis.kind : '';
        const indoor = ['start', 'temple', 'shelter', 'village', 'military'].includes(cur.kind) || cur.camp || cur.cave;
        label = 'other'; b(g, s);
        const d = s.stats.rad - r0; if (d <= 0) continue;
        const alt = cur.alt < 0.3 ? 'low' : cur.alt < 0.5 ? 'mid' : cur.alt < 0.7 ? 'high' : 'ridge';
        const key = `${label === 'travelTo' ? 'travel' : label === 'pickChoice' ? 'event' : indoor ? 'stay-roof' : 'stay-open'}|${wasRain ? 'rain' : 'dry'}${cr ? '|' + cr : ''}|${label === 'travelTo' ? '' : alt}`;
        acc[key] = (acc[key] || 0) + d;
      }
      return { acc, rad: s.stats.rad, over: s.over, day: s.day };
    }, bot);
    runs++; perRun.push(`${r.over} d${r.day} rad ${Math.round(r.rad)}`);
    for (const [k, v] of Object.entries(r.acc)) total[k] = (total[k] || 0) + v;
  }
  await browser.close();
  console.log(perRun.join(' | '));
  const sorted = Object.entries(total).sort((a, b) => b[1] - a[1]);
  const sum = sorted.reduce((a, [, v]) => a + v, 0);
  for (const [k, v] of sorted.slice(0, 16)) console.log(`${k.padEnd(34)} ${(v / runs).toFixed(1)} per run  (${Math.round((v / sum) * 100)}%)`);
})();
