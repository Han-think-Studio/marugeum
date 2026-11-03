const { chromium } = require('playwright');
// 갈림길: 댓재의 고속도로(건너뛰기와 피폭), 철암의 아픈 아이(해열제·구급낭), 한계령의 헬기 한 자리. 엔딩 글과 수첩에 남는다
const PORT = Number(process.env.TEST_PORT || 4174);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const log = []; const fail = [];
  const check = (name, cond) => { log.push(`${cond ? 'ok ' : 'FAIL'} ${name}`); if (!cond) fail.push(name); };
  const start = async () => {
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('marugeum.settings.v1', JSON.stringify({ difficulty: 'normal', handwork: false })); });
    await page.goto(`http://localhost:${PORT}/?seed=42`, { waitUntil: 'networkidle' });
    await page.evaluate(() => { const g = window.marugeum; const s = g.state; while (s.event) { if (s.event.result === null) g.pickChoice(s, 0); g.dismissEvent(s); } });
  };
  // 그 자리에 처음 닿게 하고, 뜨는 사건마다 picks[id] 번째(없으면 0) 선택지를 고른다
  const arrive = (place, flags, picks = {}, setup = '') => page.evaluate(({ place, flags, picks, setup }) => {
    const g = window.marugeum; const s = g.state;
    Object.assign(s.flags, flags);
    if (setup) new Function('s', setup)(s);
    const to = s.nodes.find((n) => n.place === place);
    const cur = g.currentNode(s);
    cur.links.push(to.id); to.visited = false; s.hour = 8; s.weather = 'clear'; s.nextWeather = 'clear'; s.weatherLeft = 30; s.wind = 'calm'; s.crisis = null;
    s.stats = { hp: 100, hunger: 90, thirst: 90, temp: 100, fatigue: 100, rad: 0, mind: 80 };
    to.secured = true; cur.secured = true;
    const t0 = (s.day - 1) * 24 + s.hour;
    g.travelTo(s, to.id);
    const ids = []; const texts = [];
    let guard = 0;
    while (s.event && guard++ < 10) {
      const id = s.event.id; ids.push(id);
      if (s.event.result === null) g.pickChoice(s, picks[id] ?? 0);
      texts.push(s.event.result);
      g.dismissEvent(s);
    }
    return { ids, texts, at: g.currentNode(s).place, rad: s.stats.rad, hours: (s.day - 1) * 24 + s.hour - t0, flags: Object.keys(s.flags).filter((k) => k.startsWith('branch:')), over: s.over, ending: s.ending, medkit: s.equip.filter((e) => e.kind === 'medkit').map((e) => e.charges), noinbong: s.nodes.find((n) => n.place === 'noinbong').visited, notes: g.endingNotes(s).join(' ') };
  }, { place, flags, picks, setup });

  // 1) 고속도로: 한계령으로 건너뛰고, 피폭과 시간을 치르고, 검문소가 이어서 열린다. 오대산은 안 가 본 채로
  await start();
  let r = await arrive('daetjae', {}, { branch_highway: 0, seorak_checkpoint: 0, branch_heli_seat: 1 });
  check(`highway jumps to Hangyeryeong (${r.ids.join(',')} → ${r.at})`, r.ids.includes('branch_highway') && r.at === 'hangyeryeong' && r.flags.includes('branch:highway'));
  check(`highway costs radiation and time (rad ${Math.round(r.rad)}, ${r.hours}h)`, r.rad >= 15 && r.hours >= 14);
  const plainRad = r.rad;
  check(`checkpoint opens after the jump, Odae skipped (${r.ids.join(',')})`, r.ids.includes('seorak_checkpoint') && !r.noinbong);
  await start();
  r = await arrive('daetjae', {}, { branch_highway: 2 });
  check(`keeping the ridge stays at Daetjae (${r.at})`, r.at === 'daetjae' && r.flags.includes('branch:highway_no'));
  await start();
  r = await arrive('daetjae', {}, { branch_highway: 1, branch_heli_seat: 1 }, "s.equip.push({ kind: 'geiger', broken: false, cond: 100 })");
  check(`geiger route is gentler (rad ${Math.round(r.rad)} < ${Math.round(plainRad)})`, r.at === 'hangyeryeong' && r.rad < plainRad - 5);

  // 2) 철암의 아이: 폐광 사람들을 만났으면 이어서 뜬다. 해열제를 주면 재회 장면이 바뀐다. 구급낭은 한 번 쓴다
  await start();
  r = await arrive('cheoram', { mine_people: true }, { taebaek_mine: 2, branch_mine_child: 0 });
  check(`sick child follows the mine (${r.ids.join(',')})`, r.ids.includes('branch_mine_child') && r.flags.includes('branch:child_med'));
  await start();
  r = await arrive('cheoram', { mine_people: true }, { taebaek_mine: 2, branch_mine_child: 1 }, "s.equip.push({ kind: 'medkit', charges: 2, broken: false })");
  check(`medkit choice uses one charge (${JSON.stringify(r.medkit)})`, r.flags.includes('branch:child_kit') && r.medkit[0] === 1);
  await start();
  r = await arrive('cheoram', {}, { taebaek_mine: 2 });
  check(`no child without meeting the mine people (${r.ids.join(',')})`, !r.ids.includes('branch_mine_child'));

  // 3) 헬기: 오르면 바로 향로봉. 해열제를 줬다면 재회 장면이 그 이야기로. 엔딩 글에 갈림길이 남는다
  const clues = { 'clue:note': true, 'clue:jiri': true, 'clue:deogyu': true, 'clue:minjuji': true, 'clue:songni': true, 'branch:child_med': true };
  await start();
  r = await arrive('hangyeryeong', clues, { seorak_checkpoint: 0, branch_heli_seat: 0 });
  check(`seat taken → straight to Hyangno, medicine reunion (${r.ids.join(',')})`, r.ids.includes('branch_heli_seat') && r.over === 'won' && r.ending === 'reunion' && r.ids.includes('goal_reunion_med') && !r.ids.includes('goal_reunion'));
  check('reunion text tells of the medicine given away', r.texts.some((t) => t && t.includes('철암의 아이에게 주고 왔다')));
  check('ending notes carry the branches', r.notes.includes('철암 갱도 사람들') && r.notes.includes('아이를 업은 남자'));
  await page.evaluate(() => window.marugeum.render());
  await page.click('.book-btn');
  await page.waitForTimeout(200);
  const book = await page.$$eval('.branches li', (els) => els.map((e) => e.textContent));
  check(`journal lists junctions (${book.join(' | ')})`, book.length === 3 && book.some((t) => t.includes('헬기에 올랐다')) && book.some((t) => t.includes('해열제')) && book.some((t) => t.startsWith('???')));
  await page.screenshot({ path: process.argv[2] + '/branches-journal.png' });
  await start();
  r = await arrive('hangyeryeong', {}, { seorak_checkpoint: 0, branch_heli_seat: 1 });
  check(`seat given → walk on from Hangyeryeong (${r.at})`, r.at === 'hangyeryeong' && r.over === 'none' && r.flags.includes('branch:seat_gave'));
  await page.evaluate(() => localStorage.clear());

  console.log(log.join('\n'));
  console.log('FAILS:', fail.length, fail);
  console.log('page errors:', errors);
  await browser.close();
})();
