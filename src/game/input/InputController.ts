import type { GameEngine } from '../GameEngine';

/**
 * InputSystem: pointer (mouse/touch) + keyboard.
 * Работает в координатах канваса, переводит их в логические координаты поля.
 */
export class InputController {
  private engine: GameEngine;
  private toLogicalX: (clientX: number) => number;
  private detachFns: Array<() => void> = [];

  constructor(engine: GameEngine, canvas: HTMLCanvasElement, toLogicalX: (clientX: number) => number) {
    this.engine = engine;
    this.toLogicalX = toLogicalX;

    const onPointerMove = (e: PointerEvent) => {
      engine.moveCurrentTo(this.toLogicalX(e.clientX));
    };
    const onPointerDown = (e: PointerEvent) => {
      const x = this.toLogicalX(e.clientX);
      engine.moveCurrentTo(x);
    };
    const onPointerUp = (e: PointerEvent) => {
      const x = this.toLogicalX(e.clientX);
      engine.moveCurrentTo(x);
      engine.drop();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
        case 'ф':
        case 'Ф':
          engine.nudgeCurrent(-24);
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
        case 'в':
        case 'В':
          engine.nudgeCurrent(24);
          e.preventDefault();
          break;
        case ' ':
        case 'Enter':
          engine.drop();
          e.preventDefault();
          break;
        default:
          break;
      }
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);

    this.detachFns = [
      () => canvas.removeEventListener('pointermove', onPointerMove),
      () => canvas.removeEventListener('pointerdown', onPointerDown),
      () => canvas.removeEventListener('pointerup', onPointerUp),
      () => window.removeEventListener('keydown', onKeyDown),
    ];
  }

  dispose(): void {
    for (const fn of this.detachFns) fn();
    this.detachFns = [];
  }
}
