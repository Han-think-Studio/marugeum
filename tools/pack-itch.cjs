// itch.io 에 올릴 웹 판 zip. dist 를 그대로 묶고 index.html 이 zip 맨 위에 오게 한다. 문서(.md)는 뺀다
// 사용: npm run pack:itch  →  release/marugeum-web-<버전>.zip
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const { version } = require(path.join(root, 'package.json'));
if (!fs.existsSync(path.join(dist, 'index.html'))) { console.error('dist/index.html 이 없다. npm run build 먼저'); process.exit(1); }

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
for (const f of walk(dist)) if (f.endsWith('.md')) fs.rmSync(f);
const files = walk(dist);
const bytes = files.reduce((a, f) => a + fs.statSync(f).size, 0);

const out = path.join(root, 'release', `marugeum-web-${version}.zip`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.rmSync(out, { force: true });
// 윈도우는 기본으로 든 bsdtar 로 묶는다(경로가 / 로 들어간다. Compress-Archive 는 \ 로 넣어 itch 에서 깨진다)
if (process.platform === 'win32') {
  const tar = path.join(process.env.SystemRoot || 'C:/Windows', 'System32', 'tar.exe');
  execFileSync(tar, ['-a', '-c', '-f', out, ...fs.readdirSync(dist)], { cwd: dist, stdio: 'inherit' });
} else {
  execFileSync('zip', ['-qr', out, '.'], { cwd: dist, stdio: 'inherit' });
}
const mb = (n) => (n / 1048576).toFixed(1);
console.log(`${path.relative(root, out)} · 파일 ${files.length}개 · 풀면 ${mb(bytes)}MB · zip ${mb(fs.statSync(out).size)}MB`);
// itch.io HTML5 한도: zip 1GB, 파일 1000개, 파일 하나 200MB
if (files.length > 1000 || bytes > 1024 * 1048576) console.error('itch.io 한도를 넘는다');
