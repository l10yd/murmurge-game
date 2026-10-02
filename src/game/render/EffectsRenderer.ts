import type { BallLevel } from '../../shared/types';

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  lifeMax: number;
  size: number;
  color: string;
  shape: 'circle' | 'spark' | 'star';
  gravity: number;
}

const MAX_PARTICLES = 160;

/** Object pooling для частиц (merge pop, discard, конфетти Victory). */
export class EffectsRenderer {
  private pool: Particle[] = [];
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push({
        active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, lifeMax: 1,
        size: 3, color: '#fff', shape: 'circle', gravity: 0.0004,
      });
    }
  }

  private spawn(
    x: number, y: number, vx: number, vy: number, life: number,
    size: number, color: string, shape: Particle['shape'], gravity: number,
  ): void {
    const p = this.pool.find((q) => !q.active);
    if (!p) return;
    p.active = true;
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.life = life; p.lifeMax = life;
    p.size = size; p.color = color; p.shape = shape; p.gravity = gravity;
  }

  /** pop при слиянии; big = уровень 8+. */
  mergePop(x: number, y: number, level: BallLevel, color: string): void {
    const big = level >= 8;
    const n = big ? 18 : 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const sp = (big ? 0.22 : 0.14) * (0.7 + Math.random() * 0.6);
      this.spawn(
        x, y, Math.cos(a) * sp, Math.sin(a) * sp,
        big ? 520 : 380, (big ? 5.5 : 4) * (0.7 + Math.random() * 0.7),
        color, 'circle', 0.0004,
      );
    }
    // кольцо-вспышка
    this.spawn(x, y, 0, 0, 240, big ? 16 : 10, color, 'spark', 0);
  }

  discardBurst(x: number, y: number, color: string): void {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.1 + Math.random() * 0.16;
      this.spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 0.05, 420, 3.5 * (0.8 + Math.random() * 0.6), color, 'circle', 0.0005);
    }
  }

  /** Конфетти Victory. reducedMotion — сильно меньше частиц. */
  victoryConfetti(cx: number, cy: number, reducedMotion: boolean): void {
    const colors = ['#ffd43b', '#ff9f43', '#f368a0', '#54a0ff', '#1dd1a1', '#a55eea'];
    const n = reducedMotion ? 14 : 60;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.12 + Math.random() * 0.3;
      this.spawn(
        cx + (Math.random() - 0.5) * 120, cy + (Math.random() - 0.5) * 40,
        Math.cos(a) * sp, Math.sin(a) * sp - 0.18,
        900 + Math.random() * 500, 4 + Math.random() * 4,
        colors[i % colors.length], Math.random() > 0.5 ? 'star' : 'circle',
        0.00045,
      );
    }
  }

  /** Левитация — стрелки/искры вверх у стен. */
  levitationGlow(walls: { left: number; right: number }, height: number): void {
    for (const wx of [walls.left, walls.right]) {
      for (let i = 0; i < 3; i++) {
        this.spawn(
          wx + (Math.random() - 0.5) * 10, height * (0.35 + Math.random() * 0.6),
          (Math.random() - 0.5) * 0.02, -0.12 - Math.random() * 0.08,
          500, 3, '#8fd8ff', 'spark', 0,
        );
      }
    }
  }

  updateAndDraw(dtMs: number): void {
    const ctx = this.ctx;
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dtMs;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dtMs;
      p.y += p.vy * dtMs;
      p.vy += p.gravity * dtMs;
      const t = p.life / p.lifeMax;
      ctx.globalAlpha = Math.min(1, t * 1.4);
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * t), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'spark') {
        ctx.globalAlpha = Math.min(1, t) * 0.85;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.8 - t) * 1.6, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else {
        // star
        const s = p.size * (0.5 + 0.5 * t);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * 0.01);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const a2 = a + Math.PI / 5;
          ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
          ctx.lineTo(Math.cos(a2) * s * 0.45, Math.sin(a2) * s * 0.45);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    for (const p of this.pool) p.active = false;
  }
}
