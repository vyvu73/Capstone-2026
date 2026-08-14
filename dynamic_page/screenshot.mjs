/**
 * Usage: node screenshot.mjs http://localhost:3000 [label]
 *
 * Saves to ./temporary screenshots/screenshot-N[-label].png, auto-incrementing
 * so an earlier shot is never overwritten.
 */
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

const url = process.argv[2] ?? 'http://localhost:3000';
const label = process.argv[3] ?? '';
const outDir = path.join(process.cwd(), 'temporary screenshots');

async function nextIndex() {
  try {
    const files = await readdir(outDir);
    const used = files
      .map((name) => /^screenshot-(\d+)/.exec(name))
      .filter(Boolean)
      .map((match) => Number(match[1]));
    return used.length === 0 ? 1 : Math.max(...used) + 1;
  } catch {
    return 1;
  }
}

await mkdir(outDir, { recursive: true });
const index = await nextIndex();
const filename = label ? `screenshot-${index}-${label}.png` : `screenshot-${index}.png`;
const outPath = path.join(outDir, filename);

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 2 });

await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
// Let webfonts settle so text is not measured mid-swap.
await page.evaluate(() => document.fonts.ready);
await new Promise((resolve) => setTimeout(resolve, 400));

await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(`Saved ${outPath}`);
