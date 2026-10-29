// Renders public/og.png (1200×630) and public/apple-touch-icon.png (180×180) from the templates here.
// Usage: npm run og (needs Playwright's Chromium).
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const fonts = path.join(root, 'node_modules/@fontsource-variable');

// Inline fonts as data URLs: setContent pages can't load file:// URLs.
const font = (file) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(fonts, file)).toString('base64')}) format('woff2')`;
const fontCss = `
  @font-face { font-family: 'Space Grotesk'; font-weight: 300 700; src: ${font('space-grotesk/files/space-grotesk-latin-wght-normal.woff2')}; }
  @font-face { font-family: 'JetBrains Mono'; font-weight: 100 800; src: ${font('jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2')}; }
`;

const jobs = [
  { template: 'og.html', out: 'public/og.png', width: 1200, height: 630 },
  { template: 'touch-icon.html', out: 'public/apple-touch-icon.png', width: 180, height: 180 },
];

const browser = await chromium.launch();
try {
  for (const job of jobs) {
    const page = await browser.newPage({ viewport: { width: job.width, height: job.height } });
    const html = fs.readFileSync(path.join(here, job.template), 'utf8').replace('/* FONTS */', fontCss);
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(root, job.out) });
    await page.close();
    console.log(`[og] wrote ${job.out}`);
  }
} finally {
  await browser.close();
}
