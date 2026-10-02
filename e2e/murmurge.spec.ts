import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:4173/';

test('smoke: menu → play → drop mouse+keyboard → pause → collection → resume', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  await page.goto(BASE);
  await expect(page.locator('.menu-btn.primary')).toHaveText('Играть');
  await page.click('.menu-btn.primary');

  const canvas = page.locator('.game-area canvas');
  await expect(canvas).toBeVisible();

  // дроп мышью
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 40);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(700);

  // дроп клавиатурой: смещение влево + пробел
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(120);
  await page.keyboard.press('Space');
  await page.waitForTimeout(700);

  // пауза по Escape
  await page.keyboard.press('Escape');
  await expect(page.locator('.modal h2')).toHaveText('Пауза');

  // коллекция из 11 карточек
  await page.click('.menu-btn:has-text("Коллекция")');
  await expect(page.locator('.collection-card')).toHaveCount(11);
  await page.click('.menu-btn:has-text("Назад")');

  // продолжить игру
  await page.click('.menu-btn.primary:has-text("Продолжить")');
  await expect(page.locator('.game-area canvas')).toBeVisible();
  await page.waitForTimeout(400);

  // верхняя панель со счётом видна
  await expect(page.locator('.topbar .chip').first()).toBeVisible();

  expect(consoleErrors, 'console errors: ' + consoleErrors.join(' | ')).toEqual([]);
});

test('portrait 360x800: поле и 4 способности доступны', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(BASE);
  await page.click('.menu-btn.primary');
  await expect(page.locator('.game-area canvas')).toBeVisible();
  await expect(page.locator('.ability-btn')).toHaveCount(4);
  const abox = (await page.locator('.abilities').boundingBox())!;
  expect(abox.width).toBeLessThanOrEqual(360);
  const cbox = (await page.locator('.game-area canvas').boundingBox())!;
  expect(cbox.width).toBeGreaterThan(200);
});

test('повторный быстрый клик не создаёт несколько current', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  await page.goto(BASE);
  await page.click('.menu-btn.primary');
  const canvas = page.locator('.game-area canvas');
  const box = (await canvas.boundingBox())!;
  // серия быстрых кликов с интервалом < cooldown
  for (let i = 0; i < 6; i++) {
    await page.mouse.click(box.x + 80 + i * 20, box.y + 40);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(800);
  expect(consoleErrors).toEqual([]);
});
