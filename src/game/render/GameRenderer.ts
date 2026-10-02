import Matter from 'matter-js';
import type { GameEngine } from '../GameEngine';
import { BALL_CONFIG } from '../config/ballConfig';
import { DANGER_LINE_Y } from '../config/balanceConfig';
import { PHYSICS_CONFIG } from '../config/physicsConfig';
import type { Viewport } from './Viewport';
import { drawCreature } from './CreatureSprite';
import type { EffectsRenderer } from './EffectsRenderer';

/** RenderSystem: единственный rAF-рендер поверх Matter-мира. */
export class GameRenderer {
  private engine: GameEngine;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private viewport: Viewport;
  private effects: EffectsRenderer;
  private reducedMotion = false;

  constructor(engine: GameEngine, canvas: HTMLCanvasElement, viewport: Viewport, effects: EffectsRenderer) {
    this.engine = engine;
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.viewport = viewport;
    this.effects = effects;
  }

  setReducedMotion(v: boolean): void {
    this.reducedMotion = v;
  }

  frame(dtMs: number): void {
    const ctx = this.ctx;
    const lw = PHYSICS_CONFIG.logicalWidth;
    const lh = PHYSICS_CONFIG.logicalHeight;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.viewport.applyTransform(ctx);

    // фон поля
    const grad = ctx.createLinearGradient(0, 0, 0, lh);
    grad.addColorStop(0, '#fdf8ee');
    grad.addColorStop(1, '#f3ead8');
    ctx.fillStyle = grad;
    this.roundRect(ctx, 0, 0, lw, lh, 18);
    ctx.fill();

    const st = this.engine.snapshot();
    const countdownActive = st.phase === 'GAME_OVER_COUNTDOWN';
    const countdownLeft = this.engine.countdownSecondsLeft();
    const dangerPulse = countdownActive || this.dangerTimerNear(st);

    // danger line (пульсирует при угрозе)
    if (st.phase !== 'MENU') {
      ctx.save();
      ctx.strokeStyle = dangerPulse
        ? `rgba(255, 70, 70, ${0.55 + 0.35 * Math.sin(this.engine.getSimTime() * 0.012)})`
        : 'rgba(255, 90, 90, 0.35)';
      ctx.lineWidth = dangerPulse ? 3.5 : 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(4, DANGER_LINE_Y);
      ctx.lineTo(lw - 4, DANGER_LINE_Y);
      ctx.stroke();
      ctx.restore();
    }

    // стены (визуальные)
    ctx.strokeStyle = countdownActive ? 'rgba(255, 90, 90, 0.8)' : '#d9c9a8';
    ctx.lineWidth = 5;
    this.roundRect(ctx, 2.5, 2.5, lw - 5, lh - 5, 16);
    ctx.stroke();

    // зверьки
    for (const e of this.engine.allBalls()) {
      const body = this.engine.getBallBody(e);
      if (!body) continue;
      const glow = e.level === 11 && st.phase === 'VICTORY';
      const scale = glow ? 1 + this.engine.victoryScaleBoost() : 1;
      drawCreature(ctx, e.level, body.position.x, body.position.y, body.angle, { glow, scale });
    }

    // current (фантом, без тела) + ghost line
    if (
      st.phase === 'PLAYING' ||
      st.phase === 'AIMING' ||
      st.phase === 'MERGING' ||
      st.phase === 'GAME_OVER_COUNTDOWN'
    ) {
      const cx = this.engine.getCurrentX();
      const r = BALL_CONFIG[st.currentLevel].radius;

      ctx.save();
      ctx.strokeStyle = 'rgba(120, 100, 70, 0.18)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(cx, 70 + r);
      ctx.lineTo(cx, lh - 4);
      ctx.stroke();
      ctx.restore();

      const bob = Math.sin(this.engine.getSimTime() * 0.004) * 3;
      ctx.save();
      ctx.globalAlpha = 0.96;
      drawCreature(ctx, st.currentLevel, cx, 70 + bob, 0, {});
      ctx.restore();
    }

    // levitation-индикатор
    if (st.levitationUntil > this.engine.getSimTime()) {
      ctx.save();
      ctx.strokeStyle = 'rgba(120, 200, 255, 0.7)';
      ctx.lineWidth = 6;
      this.roundRect(ctx, 3, 3, lw - 6, lh - 6, 16);
      ctx.stroke();
      ctx.restore();
    }

    // подсветка валидных целей discard
    if (st.phase === 'ABILITY_TARGETING' && st.activeAbility === 'discard') {
      for (const e of this.engine.allBalls()) {
        const body = this.engine.getBallBody(e);
        if (!body) continue;
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 120, 120, 0.85)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(body.position.x, body.position.y, BALL_CONFIG[e.level].radius * 1.12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // подсветка выбранного для swap
    if (st.phase === 'ABILITY_TARGETING' && st.activeAbility === 'swap' && st.swapFirstBallId) {
      const first = this.engine.getBallById(st.swapFirstBallId);
      if (first) {
        const body = this.engine.getBallBody(first);
        if (body) {
          ctx.save();
          ctx.strokeStyle = '#8fd8ff';
          ctx.lineWidth = 4;
          ctx.setLineDash([6, 5]);
          ctx.beginPath();
          ctx.arc(body.position.x, body.position.y, BALL_CONFIG[first.level].radius * 1.16, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // частицы поверх
    this.effects.updateAndDraw(dtMs);

    // VICTORY-вуаль
    if (st.phase === 'VICTORY') {
      const p = this.engine.victoryProgress();
      ctx.fillStyle = `rgba(255, 236, 170, ${0.25 * Math.sin(Math.PI * p)})`;
      ctx.fillRect(0, 0, lw, lh);
    }

    // Затемнение + отсчёт 3-2-1 при угрозе поражения
    if (countdownActive && countdownLeft > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(this.engine.getSimTime() * 0.01);
      ctx.fillStyle = `rgba(70, 20, 20, ${0.16 + 0.1 * pulse})`;
      ctx.fillRect(0, 0, lw, lh);
      ctx.save();
      ctx.translate(lw / 2, lh * 0.42);
      const scalePulse = 1 + 0.06 * pulse;
      ctx.scale(scalePulse, scalePulse);
      ctx.fillStyle = '#c62828';
      ctx.font = '800 92px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.85)';
      ctx.shadowBlur = 18;
      ctx.fillText(String(countdownLeft), 0, 0);
      ctx.shadowBlur = 0;
      ctx.font = '600 17px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = '#5d1a1a';
      ctx.fillText('Убирай зверьков с черты!', 0, 72);
      ctx.restore();
    }
  }

  /** Близко ли хотя бы одно «лежачее» тело к запуску отсчёта (для пульса линии). */
  private dangerTimerNear(st: ReturnType<GameEngine['snapshot']>): boolean {
    if (st.phase !== 'PLAYING' && st.phase !== 'MERGING') return false;
    return false; // пульс включается только в отсчёте; grace остаётся тихим
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
