import { describe, it, expect } from 'vitest';
import { GAME_CONFIG, DANGER_LINE_Y } from '../game/config/balanceConfig';

/**
 * Чистые проверки таймингов отсчёта поражения (без Matter):
 * интеграция отсчёта покрыта e2e и ручным прогоном.
 */
describe('game over countdown timings', () => {
  it('отсчёт длится ровно 3 секунды', () => {
    expect(GAME_CONFIG.effects.gameOverCountdownMs).toBe(3000);
  });

  it('grace до отсчёта меньше самого отсчёта', () => {
    expect(GAME_CONFIG.effects.gameOverGraceMs).toBeLessThan(GAME_CONFIG.effects.gameOverCountdownMs);
  });

  it('черта лежит в верхней трети поля', () => {
    // поле 660 логических px; черта на 150
    expect(DANGER_LINE_Y).toBeGreaterThan(0);
    expect(DANGER_LINE_Y).toBeLessThan(220);
  });

  it('отсчёт даёт окно спасения: dropDelay позволяет успеть сбросить', () => {
    expect(GAME_CONFIG.effects.dropDelayMs).toBeLessThan(GAME_CONFIG.effects.gameOverCountdownMs);
  });
});
