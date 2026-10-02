import type { GameEngine } from '../GameEngine';
import type { GameRenderer } from './GameRenderer';

/**
 * PhysicsLoop: единственный requestAnimationFrame-цикл.
 * Физика — фиксированный шаг внутри GameEngine.update, рендер — каждый кадр.
 * Цикл полностью отвязан от React.
 */
export class PhysicsLoop {
  private engine: GameEngine;
  private renderer: GameRenderer;
  private rafId = 0;
  private last = 0;
  private running = false;
  private onFrameExtra?: (dtMs: number) => void;

  constructor(engine: GameEngine, renderer: GameRenderer) {
    this.engine = engine;
    this.renderer = renderer;
  }

  setOnFrameExtra(fn: (dtMs: number) => void): void {
    this.onFrameExtra = fn;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(now - this.last, 100);
      this.last = now;
      this.engine.update(dt);
      this.renderer.frame(dt);
      this.onFrameExtra?.(dt);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }
}
