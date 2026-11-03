const { chromium } = require('playwright');
const path = require('path');
// 스토어(itch·스팀) 스크린샷 1280x720. 개발 서버(5173)에서 찍는다
// 사용: npm run dev 를 켠 채로 node tools/store-shots.cjs  →  store/screenshots/*.png
const out = path.join(__dirname, '..', 'store', 'screenshots');
const URL = process.env.SHOT_URL || 'http://localhost:5173';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const go = async (q = '') => {
    await p.goto(`${URL}/${q}`, { waitUntil: 'networkidle' });
  };
  await go();
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('marugeum.settings.v1', JSON.stringify({ difficulty: 'normal', handwork: true, slides: false })); });
  await go();
  await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(out, '1-title.png') });
  await go('?seed=7');
  const clear = () => p.evaluate(() => { const g = window.marugeum; const s = g.state; while (s.event) { if (s.event.result === null) g.pickChoice(s, 0); g.dismissEvent(s); } g.render(); });
  await clear();
  // 사건: 철암 폐광. 삽화와 선택지
  await p.evaluate(() => { const g = window.marugeum; const s = g.state; const n = s.nodes.find((x) => x.place === 'cheoram'); s.nodeId = n.id; n.visited = true; s.day = 6; s.hour = 17; s.event = { id: 'taebaek_mine', result: null }; s.stats = { hp: 74, hunger: 52, thirst: 61, temp: 70, fatigue: 48, rad: 23, mind: 58 }; g.render(); });
  await p.waitForTimeout(900);
  await p.screenshot({ path: path.join(out, '2-event.png') });
  // 장면: 오대산 월정사, 거점과 행동
  await p.evaluate(() => { const g = window.marugeum; const s = g.state; s.event = null; const n = s.nodes.find((x) => x.place === 'woljeongsa'); s.nodeId = n.id; n.visited = true; n.looked = true; s.day = 9; s.hour = 15; s.weather = 'cloud'; s.fire = { nodeId: n.id, hours: 6 }; s.pack.wood = 2; s.pack.fresh = 2; s.view = 'scene'; g.render(); });
  await p.waitForTimeout(900);
  await p.screenshot({ path: path.join(out, '3-scene.png') });
  // 지도: 걸어온 길과 리본
  await p.evaluate(() => { const g = window.marugeum; const s = g.state; for (const n of s.nodes) if (n.stage <= 9 && n.stage % 1 === 0 && Math.random() < 0.6) n.visited = true; s.view = 'map'; g.render(); });
  await p.waitForTimeout(900);
  await p.screenshot({ path: path.join(out, '4-map.png') });
  // 손 놀이: 망치질
  await p.evaluate(() => { const g = window.marugeum; g.state.view = 'scene'; g.render(); return import('/src/ui/handwork.ts').then((m) => { m.playHand(document.getElementById('app'), 'hammer', { tools: true }); }); });
  await p.waitForTimeout(900);
  await p.keyboard.press('Space');
  await p.waitForTimeout(120);
  await p.screenshot({ path: path.join(out, '5-handwork.png') });
  await p.keyboard.press('Escape');
  // 엔딩: 향로봉, 재회
  await p.evaluate(() => { const g = window.marugeum; const s = g.state; const n = s.nodes.find((x) => x.place === 'hyangno'); s.nodeId = n.id; for (const c of ['note', 'jiri', 'deogyu', 'minjuji', 'songni', 'sobaek', 'taebaek']) s.flags['clue:' + c] = true; s.flags['suyeon:noinbong'] = true; s.flags.suyeon_drawing = true; s.over = 'won'; s.ending = 'reunion'; s.overText = '12일째. 향로봉에 닿았다. 누적 피폭 31. 단서 7개.'; g.render(); });
  await p.waitForTimeout(900);
  await p.screenshot({ path: path.join(out, '6-ending.png') });
  await p.evaluate(() => localStorage.clear());
  await b.close();
  console.log('store/screenshots 에 6장');
})();
