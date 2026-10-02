import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:4173/';

test('главное меню: все кнопки открывают свои экраны и возвращаются', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(BASE);
  await expect(page.locator('.modal h2')).toHaveText('Murmurge');

  // Как играть
  await page.click('.menu-btn:has-text("Как играть")');
  await expect(page.locator('.modal h2')).toHaveText('Как играть');
  await expect(page.locator('.howto-list li').first()).toBeVisible();
  await page.click('.menu-btn:has-text("Назад")');
  await expect(page.locator('.modal h2')).toHaveText('Murmurge');

  // Коллекция
  await page.click('.menu-btn:has-text("Коллекция")');
  await expect(page.locator('.collection-card')).toHaveCount(11);
  await page.click('.menu-btn:has-text("Назад")');
  await expect(page.locator('.modal h2')).toHaveText('Murmurge');

  // Настройки
  await page.click('.menu-btn:has-text("Настройки")');
  await expect(page.locator('.modal h2')).toHaveText('Настройки');
  const toggles = page.locator('.toggle');
  await expect(toggles).toHaveCount(4);
  await page.click('.menu-btn:has-text("Назад")');
  await expect(page.locator('.modal h2')).toHaveText('Murmurge');

  // Esc из подэкрана тоже возвращает в меню
  await page.click('.menu-btn:has-text("Настройки")');
  await page.keyboard.press('Escape');
  await expect(page.locator('.modal h2')).toHaveText('Murmurge');

  // Играть запускает игру
  await page.click('.menu-btn.primary');
  await expect(page.locator('.game-area canvas')).toBeVisible();

  expect(errors, errors.join(' | ')).toEqual([]);
});

test('правая панель без дубля «Очки навыков», заголовки по центру', async ({ page }) => {
  await page.goto(BASE);
  // единственный блок «Очки навыков» — слева, в SkillBar
  const skillLabels = await page.locator('.panel', { hasText: 'Очки навыков' }).count();
  expect(skillLabels).toBe(1);
  // заголовок меню отцентрован
  const h2 = page.locator('.modal h2');
  await expect(h2).toHaveText('Murmurge');
  const align = await h2.evaluate((el) => getComputedStyle(el).textAlign);
  expect(align).toBe('center');
});
