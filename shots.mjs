// Screenshot script for the GTA 6 trophy guide.
// Serves app/ with `node serve.ts` (port 8080) first, then run:
//   node shots.mjs
// Takes 4 JPEG screenshots (1280x800, quality 80) into screenshots/:
//   1-cover.jpg   — checklist, live progress bar and filters
//   2-guide.jpg   — a trophy's detail panel with guide and sources open
//   3-roadmap.jpg — the roadmap stages and the missables section
//   4-spoiler.jpg — missable filter active with spoiler-free mode on
// Uses playwright-core with the system Chromium; set CHROMIUM_PATH to
// override the executable path.

import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const shotsDir = join(repoRoot, 'screenshots');
const baseUrl = process.env.GUIDE_URL || 'http://localhost:8080/';
const executablePath =
  process.env.CHROMIUM_PATH ||
  process.env.HOME + '/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';

const EARNED_SEED = [1, 2, 3, 4, 5, 8, 15, 16, 21, 28, 35, 42];

async function newPage(browser, seedEarned) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript((ids) => {
    localStorage.setItem(
      'gta6-trophy-guide-v1',
      JSON.stringify({ earned: ids, spoiler: false, hideEarned: false }),
    );
  }, seedEarned);
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForSelector('.trophy-card');
  return { context, page };
}

async function shoot(page, name) {
  const file = join(shotsDir, name);
  await page.screenshot({ path: file, type: 'jpeg', quality: 80 });
  console.log('wrote', file);
}

mkdirSync(shotsDir, { recursive: true });
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });

try {
  // 1 — cover: checklist with a live progress bar and the filters.
  {
    const { context, page } = await newPage(browser, EARNED_SEED);
    await shoot(page, '1-cover.jpg');
    await context.close();
  }

  // 2 — guide: Catch Me If You Can open in the detail panel, guide,
  // steps and sources all visible in one viewport.
  {
    const { context, page } = await newPage(browser, EARNED_SEED);
    await page.click('[data-trophy-id="37"]');
    await page.waitForTimeout(300);
    await shoot(page, '2-guide.jpg');
    await context.close();
  }

  // 3 — roadmap: scroll to the roadmap and missables sections.
  {
    const { context, page } = await newPage(browser, EARNED_SEED);
    await page.evaluate(() => document.querySelector('.roadmap').scrollIntoView());
    await page.waitForTimeout(300);
    await shoot(page, '3-roadmap.jpg');
    await context.close();
  }

  // 4 — spoiler: missable filter active, spoiler-free mode on.
  // The platinum (a story trophy, not earned) is selected, so the detail
  // panel shows the spoiler-hiding at work.
  {
    const { context, page } = await newPage(browser, [2, 3, 8, 15, 28]);
    await page.click('#spoilerToggle');
    await page.click('[data-kind="missable"]');
    await page.waitForTimeout(300);
    await shoot(page, '4-spoiler.jpg');
    await context.close();
  }
} finally {
  await browser.close();
}
console.log('done');
