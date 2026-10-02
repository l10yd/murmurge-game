import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('shots', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:4173/');
await page.waitForTimeout(700);
await page.screenshot({ path: 'shots/menu.png' });
await page.click('.menu-btn.primary');
await page.waitForTimeout(400);
const box = await page.locator('.game-area canvas').boundingBox();
for (let i = 0; i < 6; i++) {
  await page.mouse.move(box.x + box.width * (0.25 + 0.1 * i), box.y + 40);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(620);
}
await page.waitForTimeout(1500);
await page.screenshot({ path: 'shots/gameplay.png' });
await browser.close();
console.log('shots done');
