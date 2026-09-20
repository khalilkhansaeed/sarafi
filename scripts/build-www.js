const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const sourceFile = path.join(root, 'sarafi.html');
const outDir = path.join(root, 'www');
const outFile = path.join(outDir, 'index.html');

let html = fs.readFileSync(sourceFile, 'utf8');

let buildId = '';
try {
  buildId = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
} catch (e) {
  buildId = String(Date.now());
}
if (process.env.GITHUB_SHA) buildId = process.env.GITHUB_SHA.slice(0, 7);
if (html.includes('__BUILD_ID__')) {
  html = html.split('__BUILD_ID__').join(buildId);
} else {
  console.warn('WARN: __BUILD_ID__ placeholder not found');
}

const V = 'v=' + encodeURIComponent(buildId);

const replacements = [
  ['<link rel="preconnect" href="https://fonts.googleapis.com">', ''],
  ['<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>', ''],
  [
    '<link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">',
    '<link rel="stylesheet" href="fonts.css?' + V + '">',
  ],
  ['https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.2/anime.min.js', 'vendor/anime.min.js?' + V],
  ['https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js', 'vendor/pdf-lib.min.js?' + V],
  ['https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js', 'vendor/fontkit.umd.min.js?' + V],
  ['https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', 'vendor/firebase-app-compat.js?' + V],
  ['https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js', 'vendor/firebase-auth-compat.js?' + V],
  ['https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js', 'vendor/firebase-firestore-compat.js?' + V],
];

let missing = 0;
for (const [from, to] of replacements) {
  if (!html.includes(from)) {
    console.warn('WARN: pattern not found -> ' + from.slice(0, 70));
    missing++;
    continue;
  }
  html = html.split(from).join(to);
}

if (missing) {
  console.warn('WARN: ' + missing + ' pattern(s) missing; www/index.html may still reference remote files.');
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, html);
console.log('Built ' + path.relative(root, outFile) + ' (' + html.length + ' bytes)');
