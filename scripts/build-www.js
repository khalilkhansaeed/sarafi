const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const sourceFile = path.join(root, 'sarafi.html');
const outDir = path.join(root, 'www');
const outFile = path.join(outDir, 'index.html');

let html = fs.readFileSync(sourceFile, 'utf8');

const replacements = [
  ['<link rel="preconnect" href="https://fonts.googleapis.com">', ''],
  ['<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>', ''],
  [
    '<link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">',
    '<link rel="stylesheet" href="fonts.css">',
  ],
  ['https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.2/anime.min.js', 'vendor/anime.min.js'],
  ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'vendor/jspdf.umd.min.js'],
  ['https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', 'vendor/firebase-app-compat.js'],
  ['https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js', 'vendor/firebase-auth-compat.js'],
  ['https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js', 'vendor/firebase-firestore-compat.js'],
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
