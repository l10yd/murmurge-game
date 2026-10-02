import type { Rng } from './random';

export function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function randRange(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}
