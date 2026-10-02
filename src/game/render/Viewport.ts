import { PHYSICS_CONFIG } from '../config/physicsConfig';

/**
 * Viewport: единый сервис масштабирования логических координат поля
 * в пиксели канваса (DPR-aware) и обратно.
 */
export class Viewport {
  scale = 1;
  offsetX = 0;
  offsetY = 0;
  width = 0;
  height = 0;
  private dpr = 1;

  resize(canvas: HTMLCanvasElement, container: HTMLElement): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = w;
    this.height = h;
    canvas.width = Math.max(1, Math.round(w * this.dpr));
    canvas.height = Math.max(1, Math.round(h * this.dpr));
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const lw = PHYSICS_CONFIG.logicalWidth;
    const lh = PHYSICS_CONFIG.logicalHeight;
    this.scale = Math.min(w / lw, h / lh);
    this.offsetX = (w - lw * this.scale) / 2;
    this.offsetY = (h - lh * this.scale) / 2;
  }

  /** Применить трансформ к контексту: дальше рисуем в логических координатах. */
  applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(this.dpr * this.scale, 0, 0, this.dpr * this.scale, this.dpr * this.offsetX, this.dpr * this.offsetY);
  }

  clientToLogicalX(clientX: number, canvas: HTMLCanvasElement): number {
    const rect = canvas.getBoundingClientRect();
    const cssX = clientX - rect.left;
    return (cssX - this.offsetX) / this.scale;
  }
}
