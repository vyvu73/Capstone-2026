import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, "temporary screenshots");
fs.mkdirSync(outDir, { recursive: true });

const url = process.argv[2] || "http://localhost:3000";
const label = process.argv[3] || "";

let n = 1;
while (fs.existsSync(path.join(outDir, `screenshot-${n}${label ? "-" + label : ""}.png`))) {
  n++;
}
const fileName = `screenshot-${n}${label ? "-" + label : ""}.png`;
const outPath = path.join(outDir, fileName);

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: "networkidle0" });
// Resize viewport to the full document height before shooting so
// position:fixed elements don't ghost from Puppeteer's tile-stitching.
const fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
await page.setViewport({ width: 1440, height: fullHeight });
await page.screenshot({ path: outPath, fullPage: false });
await browser.close();

console.log(`Saved ${outPath}`);
