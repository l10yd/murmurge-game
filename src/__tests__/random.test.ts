import { describe, it, expect } from 'vitest';
import { mulberry32, weightedBallLevel } from '../shared/random';
import { GAME_CONFIG } from '../game/config/balanceConfig';

describe('weighted random', () => {
  it('всегда возвращает уровень 1–5', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 2000; i++) {
      const lv = weightedBallLevel(GAME_CONFIG.spawnWeights, rng);
      expect(lv).toBeGreaterThanOrEqual(1);
      expect(lv).toBeLessThanOrEqual(5);
      expect(Number.isInteger(lv)).toBe(true);
    }
  });

  it('seed делает последовательность воспроизводимой', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    const seqA = Array.from({ length: 50 }, () => weightedBallLevel(GAME_CONFIG.spawnWeights, a));
    const seqB = Array.from({ length: 50 }, () => weightedBallLevel(GAME_CONFIG.spawnWeights, b));
    expect(seqA).toEqual(seqB);
  });

  it('частоты соответствуют весам в пределах допуска', () => {
    const rng = mulberry32(7);
    const counts = new Map<number, number>();
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const lv = weightedBallLevel(GAME_CONFIG.spawnWeights, rng);
      counts.set(lv, (counts.get(lv) ?? 0) + 1);
    }
    for (const [lv, w] of Object.entries(GAME_CONFIG.spawnWeights)) {
      const expected = w * n;
      const actual = counts.get(Number(lv)) ?? 0;
      expect(Math.abs(actual - expected)).toBeLessThan(expected * 0.12);
    }
  });
});
