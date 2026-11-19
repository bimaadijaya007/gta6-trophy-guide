// GTA 6 trophy guide — entry program (Node 22, standard library only).
//
// The guide itself is plain static files in app/ (index.html, style.css,
// app.js and data/trophies.json), plus 3-4 screenshots in screenshots/.
// This program hands the guide in: it copies app/ and screenshots/ from
// beside this file into the output directory and writes dossier.json there
// with the vendored make.fun library (vendor/makefun-frontend.ts, which
// must stay exactly as the kit ships it — the scorer rebuilds the dossier
// with its own copy and compares the two byte for byte).
//
// Run locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader, MAKEFUN_OUTPUT_DIR is unset and the output is /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function copyTree(source, target) {
  if (!existsSync(source)) return;
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyTree(join(repoRoot, 'app'), join(outputDir, 'app'));
copyTree(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));

// The dossier caps mirror the scorer's: at most 4 screenshots of 256 KiB,
// at most 993 app files / 48 MiB of app files, and a 160 KiB text budget.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log('Wrote ' + join(outputDir, 'dossier.json') + ' (' + dossier.length + ' bytes).');
