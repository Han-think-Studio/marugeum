// 기능 테스트를 한 번에 돌린다. node tools/tests/run.cjs [결과 폴더] [테스트 이름...]
// 봇 계측은 node tools/tests/run.cjs --bots [판 수] (흔적·능선·초보 봇을 차례로)
// 개발 서버를 4174 포트로 띄우고(이미 떠 있으면 그대로 쓴다) 테스트마다 결과를 판정한다.
// 통과: 끝까지 돌고, 'FAILS: 0' 이 아닌 FAILS 가 없고, errors 줄이 모두 [] 일 때
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const PORT = Number(process.env.TEST_PORT || 4174); // 두 판을 나란히 돌릴 때는 TEST_PORT 로 바꾼다
const SUITE = ['equip', 'camp', 'settings', 'secure-scout', 'places', 'trail-marks', 'map-view', 'wear-crisis', 'story-fill', 'ribbons', 'handwork', 'hidden', 'branches', 'feedback', 'basework', 'all-events'];

const BOTS = process.argv[2] === '--bots';
const BOT_RUNS = (BOTS && process.argv[3]) || '30';
const out = path.resolve((!BOTS && process.argv[2]) || path.join(__dirname, 'out'));
const picked = BOTS ? [] : process.argv.slice(3);
const tests = picked.length ? picked : SUITE;
fs.mkdirSync(out, { recursive: true });

async function serverUp() {
  try {
    const res = await fetch(`http://localhost:${PORT}/`);
    return res.ok;
  } catch {
    return false;
  }
}

function runOne(name) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, [path.join(__dirname, name + '.cjs'), out], { cwd: ROOT });
    let text = '';
    child.stdout.on('data', (d) => { text += d; });
    child.stderr.on('data', (d) => { text += d; });
    child.on('close', (code) => {
      const lines = text.split(/\r?\n/);
      const problems = [];
      if (code !== 0) problems.push(`종료 코드 ${code}`);
      for (const l of lines) {
        const f = l.match(/^FAILS: (\d+)/);
        if (f && f[1] !== '0') problems.push(l);
        if (/^(page )?errors:/.test(l) && !/:\s*\[\]\s*$/.test(l)) problems.push(l);
        if (/problems: \[(?!\])/.test(l)) problems.push(l);
      }
      if (!lines.some((l) => /^(page )?errors:/.test(l))) problems.push('errors 줄이 없다 (끝까지 못 돌았다)');
      fs.writeFileSync(path.join(out, name + '.log'), text);
      resolve({ name, ok: problems.length === 0, problems, secs: ((Date.now() - started) / 1000).toFixed(1) });
    });
  });
}

(async () => {
  let server = null;
  if (!(await serverUp())) {
    const { createServer } = await import('vite');
    server = await createServer({ root: ROOT, logLevel: 'error', server: { port: PORT, strictPort: true, open: false } });
    await server.listen();
  }
  if (BOTS) {
    for (const mode of ['trail', 'ridge', 'naive']) {
      console.log(`\n== ${mode} 봇 ${BOT_RUNS}판`);
      await new Promise((resolve) => {
        spawn(process.execPath, [path.join(__dirname, 'bot-sim.cjs'), out, mode, BOT_RUNS], { cwd: ROOT, stdio: 'inherit' }).on('close', resolve);
      });
    }
    if (server) await server.close();
    return;
  }
  const results = [];
  for (const name of tests) {
    const r = await runOne(name);
    results.push(r);
    console.log(`${r.ok ? '통과' : '실패'}  ${r.name.padEnd(14)} ${r.secs}s`);
    for (const p of r.problems) console.log('      ' + p.slice(0, 300));
  }
  if (server) await server.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} 통과 · 로그와 스크린샷: ${out}`);
  process.exit(failed ? 1 : 0);
})();
