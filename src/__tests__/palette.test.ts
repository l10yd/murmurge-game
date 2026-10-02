import { describe, it, expect } from 'vitest';
import { BALL_CONFIG } from '../game/config/ballConfig';

function hue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = 60 * (((g - b) / d) % 6);
  else if (max === g) h = 60 * ((b - r) / d + 2);
  else h = 60 * ((r - g) / d + 4);
  return h < 0 ? h + 360 : h;
}

describe('creature palette distinctness', () => {
  it('L3 (Мята) и L7 (Нефрит) различаются тоном минимум на 20°', () => {
    const diff = Math.abs(hue(BALL_CONFIG[3].color) - hue(BALL_CONFIG[7].color));
    expect(diff).toBeGreaterThan(20);
  });

  it('L3 и L7 различаются формой ушей и мордой', () => {
    expect(BALL_CONFIG[3].ears).not.toBe(BALL_CONFIG[7].ears);
    expect(BALL_CONFIG[3].crest).not.toBe(BALL_CONFIG[7].crest);
  });

  it('все 11 уровней имеют различимые основные цвета (тон ≥ 12° или RGB-дистанция ≥ 60)', () => {
    const rgb = (hex: string) => [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ] as const;
    const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
    for (let i = 0; i < levels.length; i++) {
      for (let j = i + 1; j < levels.length; j++) {
        const a = BALL_CONFIG[levels[i]];
        const b = BALL_CONFIG[levels[j]];
        const hueDiff = Math.min(
          Math.abs(hue(a.color) - hue(b.color)),
          360 - Math.abs(hue(a.color) - hue(b.color)),
        );
        const [r1, g1, b1] = rgb(a.color);
        const [r2, g2, b2] = rgb(b.color);
        const rgbDist = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
        const ok = hueDiff >= 12 || rgbDist >= 60;
        expect(ok, `Уровни ${levels[i]} и ${levels[j]} слишком похожи (hue ${hueDiff.toFixed(0)}°, RGB ${rgbDist.toFixed(0)})`).toBe(true);
      }
    }
  });
});
