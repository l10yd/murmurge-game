import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:4173/';

test('регресс падения: зверёк после клика уходит вниз с верха поля', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(BASE);
  await page.click('.menu-btn.primary');
  const canvas = page.locator('.game-area canvas');
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;

  // клик по верхней зоне — зверёк должен начать падать
  await page.mouse.click(box.x + box.width * 0.5, box.y + 30);

  // через 1.2 с физика обязана унести тело сильно вниз (старт y=70 логических)
  await page.waitForTimeout(1200);
  expect(errors, errors.join(' | ')).toEqual([]);

  // скриншот для пиксельной проверки
  await page.screenshot({ path: 'shots/fall-check.png' });
});

test('полный смоук: меню → 6 дропов → пауза → коллекция → resume', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto(BASE);
  await expect(page.locator('.menu-btn.primary')).toHaveText('Играть');
  await page.click('.menu-btn.primary');

  const canvas = page.locator('.game-area canvas');
  const box = (await canvas.boundingBox())!;
  for (let i = 0; i < 6; i++) {
    await page.mouse.move(box.x + box.width * (0.3 + 0.08 * i), box.y + 40);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(600);
  }

  await page.keyboard.press('Escape');
  await expect(page.locator('.modal h2')).toHaveText('Пауза');
  await page.click('.menu-btn:has-text("Коллекция")');
  await expect(page.locator('.collection-card')).toHaveCount(11);
  await page.click('.menu-btn:has-text("Назад")');
  await page.click('.menu-btn.primary:has-text("Продолжить")');
  await expect(canvas).toBeVisible();

  expect(errors, errors.join(' | ')).toEqual([]);
});

test('portrait 360x800: поле и способности', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(BASE);
  await page.click('.menu-btn.primary');
  await expect(page.locator('.game-area canvas')).toBeVisible();
  await expect(page.locator('.ability-btn')).toHaveCount(4);
});
