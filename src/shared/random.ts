import type { BallLevel } from './types';

export type Rng = () => number;

/** Детерминированный PRNG (mulberry32) — seedable режим для тестов и отладки. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Взвешенный выбор уровня зверька. Веса заданы объектом { "1": 0.4, ... }. */
export function weightedBallLevel(
  weights: Readonly<Record<number, number>>,
  rng: Rng,
): BallLevel {
  const entries = Object.entries(weights).map(([k, w]) => ({
    level: Number(k) as BallLevel,
    w: Number(w),
  }));
  if (entries.length === 0) return 1;
  const total = entries.reduce((s, e) => s + e.w, 0);
  let r = rng() * total;
  for (const e of entries) {
    r -= e.w;
    if (r <= 0) return e.level;
  }
  return entries[entries.length - 1].level;
}
