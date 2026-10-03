import { describe, it, expect } from 'vitest';
import { GameEngine } from '../game/GameEngine';
import { BALL_CONFIG } from '../game/config/ballConfig';
import { PHYSICS_CONFIG } from '../game/config/physicsConfig';

const STEP = 1000 / 60;

function makeEngine(seed: number): GameEngine {
  return new GameEngine(
    {
      onStateChanged: () => undefined,
      onMergeEffect: () => undefined,
      onSpawnDropped: () => undefined,
      onGameOver: () => undefined,
      onCountdownStarted: () => undefined,
      onVictory: () => undefined,
      onBestScoreChanged: () => undefined,
    },
    seed,
  );
}

function run(engine: GameEngine, ms: number): void {
  const ticks = Math.round(ms / (1000 / 60));
  for (let i = 0; i < ticks; i++) engine.update(STEP);
}

describe('wake-on-structural-change', () => {
  it('после discard (структурное удаление) ни одно тело не остаётся спящим', () => {
    const engine = makeEngine(31);
    engine.startNewGame();
    for (let i = 0; i < 12; i++) {
      engine.moveCurrentTo(250);
      engine.drop();
      run(engine, 560);
    }
    run(engine, 2600); // осадка и сон
    const mergesBefore = engine.snapshot().mergesTotal;

    if (engine.snapshot().skillPoints >= 1 && engine.allBalls().length > 0) {
      const target = engine.allBalls()[0];
      if (engine.startAbility('discard')) {
        engine.tapBall(target.ballId);
        run(engine, 100);
        const awake = engine.allBalls().every((b) => !engine.getBallBody(b)!.isSleeping);
        expect(awake).toBe(true);
      }
    }
    expect(engine.snapshot().mergesTotal).toBeGreaterThanOrEqual(mergesBefore);
  }, 45000);

  it('границы: ни одно тело не выходит за стенки даже при встряске', () => {
    const engine = makeEngine(77);
    engine.startNewGame();
    let drops = 0;
    while (engine.snapshot().skillPoints < 3 && drops < 70) {
      engine.moveCurrentTo(250);
      engine.drop();
      drops++;
      run(engine, 620);
    }
    for (let i = 0; i < 6; i++) {
      engine.moveCurrentTo(100 + i * 60);
      engine.drop();
      run(engine, 500);
    }
    if (engine.canStartAbility('shake')) {
      expect(engine.startAbility('shake')).toBe(true);
    }
    let outOfBounds = 0;
    for (let t = 0; t < 80; t++) {
      engine.update(STEP);
      for (const e of engine.allBalls()) {
        const body = engine.getBallBody(e)!;
        const r = BALL_CONFIG[e.level].radius;
        if (
          body.position.x < r - 8 ||
          body.position.x > PHYSICS_CONFIG.logicalWidth - r + 8 ||
          body.position.y < r - 8 ||
          body.position.y > PHYSICS_CONFIG.logicalHeight - r + 8
        ) {
          outOfBounds++;
        }
      }
    }
    expect(outOfBounds).toBe(0);
  }, 45000);
});
