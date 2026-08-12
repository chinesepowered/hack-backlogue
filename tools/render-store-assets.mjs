/**
 * Renders the raster store assets from docs/store/icon-source.html.
 *
 * The stores want fixed pixel sizes and no alpha, which is fiddly to get right
 * by hand and easy to get wrong silently — an icon with a transparent corner is
 * rejected by App Store Connect only after upload. Rendering them from one HTML
 * source keeps the icon, the adaptive icon, and the feature graphic in step.
 *
 *   npm install playwright        (once, in tools/)
 *   node tools/render-store-assets.mjs
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs/store');
fs.mkdirSync(out, { recursive: true });

// Playwright's bundled Chromium may not match what is installed; prefer an
// explicit path when one is provided.
const executablePath = process.env.CHROMIUM_PATH || undefined;

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ deviceScaleFactor: 1 });
await page.goto(`file://${path.join(out, 'icon-source.html')}`);
await page.waitForTimeout(400);

const targets = [
  { selector: '#icon', file: 'icon-1024.png', note: '1024x1024 — App Store + Play' },
  { selector: '#feature', file: 'feature-1024x500.png', note: '1024x500 — Play feature graphic' },
];

for (const { selector, file, note } of targets) {
  // omitBackground:false keeps the PNG fully opaque, which both stores require.
  await page.locator(selector).screenshot({
    path: path.join(out, file),
    omitBackground: false,
  });
  console.log(`  ${file}  ${note}`);
}

await browser.close();
console.log(`Wrote store assets to ${out}`);
