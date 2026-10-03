import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:4173/';

test('mobile touch: пауза открывается тапом, чип Рекорд скрыт, компактный Next снизу', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(BASE);
  await page.click('.menu-btn.primary');
  await expect(page.locator('.game-area canvas')).toBeVisible();

  // тап по полю (дроп)
  const canvas = page.locator('.game-area canvas');
  const box = (await canvas.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + 60);
  await page.waitForTimeout(600);

  // Рекорд-чип скрыт на мобиле
  const bestVisible = await page.locator('.chip-best').isVisible().catch(() => false);
  expect(bestVisible).toBe(false);

  // компактный Next виден внизу, десктопная правая колонка скрыта
  await expect(page.locator('.next-compact')).toBeVisible();
  const rightCol = await page.locator('.side-col-right').isVisible().catch(() => false);
  expect(rightCol).toBe(false);

  // ТАП по кнопке паузы — модалка «Пауза» должна открыться
  const pauseBtn = page.locator('.icon-btn');
  await expect(pauseBtn).toBeEnabled();
  const pb = (await pauseBtn.boundingBox())!;
  await page.touchscreen.tap(pb.x + pb.width / 2, pb.y + pb.height / 2);
  await page.waitForTimeout(400);
  await expect(page.locator('.modal h2')).toHaveText('Пауза');

  // Продолжить
  await page.click('.menu-btn.primary:has-text("Продолжить")');
  await expect(page.locator('.game-area canvas')).toBeVisible();

  await context.close();
});
