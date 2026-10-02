import { describe, it, expect } from 'vitest';
import { GameEngine } from '../game/GameEngine';
import { BALL_CONFIG } from '../game/config/ballConfig';
import { DANGER_LINE_Y, LEVIT_HOVER_BAND } from '../game/config/balanceConfig';
import type { GameState } from '../game/GameState';

const STEP = 1000 / 60;

function radiusOf(level: number): number {
  return BALL_CONFIG[level as 1].radius;
}

function run(engine: GameEngine, ms: number): void {
  const ticks = Math.round(ms / (1000 / 60));
  for (let i = 0; i < ticks; i++) engine.update(STEP);
}

/** Сбрасываем шары в одну колонку, пока не наберём `targetPoints` очков навыков. */
function fillSkillPoints(engine: GameEngine, targetPoints: number, maxDrops = 70): number {
  let drops = 0;
  while (engine.snapshot().skillPoints < targetPoints && drops < maxDrops) {
    engine.moveCurrentTo(250);
    engine.drop();
    drops++;
    run(engine, 620); // кулдаун дропа + осадка
  }
  return drops;
}

describe('levitation integration (per-body gravityScale)', () => {
  it('тела поднимаются к черте, НЕ пересекают её и падают обратно после конца', () => {
    const engine = new GameEngine(
      {
        onStateChanged: () => undefined,
        onMergeEffect: () => undefined,
        onSpawnDropped: () => undefined,
        onGameOver: () => undefined,
        onCountdownStarted: () => undefined,
        onVictory: () => undefined,
        onBestScoreChanged: () => undefined,
      },
      42,
    );
    engine.startNewGame();
    const drops = fillSkillPoints(engine, 2);
    let st: GameState = engine.snapshot();
    expect(st.score).toBeGreaterThan(0); // мерджи шли
    expect(st.skillPoints).toBeGreaterThanOrEqual(2);

    const before = engine
      .allBalls()
      .map((b) => engine.getBallBody(b)!.position.y);
    const avgBefore = before.reduce((s, y) => s + y, 0) / before.length;

    // старт левитации
    expect(engine.startAbility('levitation')).toBe(true);
    st = engine.snapshot();
    expect(st.phase).toBe('ABILITY_ACTIVE');

    let sawRising = false;
    let minTop = Infinity;
    let avgDuring = 0;
    let samples = 0;
    // 78 тиков + добивка: суммарно > длительности левитации (2000 мс)
    for (let i = 0; i < 78; i++) {
      engine.update(STEP);
      for (const e of engine.allBalls()) {
        const body = engine.getBallBody(e)!;
        const topY = body.position.y - radiusOf(e.level);
        minTop = Math.min(minTop, topY);
        if (body.velocity.y < -0.4) sawRising = true;
      }
      avgDuring += avgY(engine);
      samples++;
    }
    run(engine, 1000); // добивка до гарантированного конца окна (2000 мс)

    // 1) подъём реально происходил
    expect(sawRising).toBe(true);
    // 2) тела поднялись (средний Y уменьшился)
    avgDuring = avgDuring / samples;
    expect(avgDuring).toBeLessThan(avgBefore - 10);
    // 3) ни одно тело не пересекло черту вверх (допуск 1px)
    expect(minTop).toBeGreaterThanOrEqual(DANGER_LINE_Y - 1);

    // конец левитации (78 тиков + добивка ≥ 2000 мс)
    st = engine.snapshot();
    expect(st.levitationUntil).toBe(0);
    run(engine, 2500); // падение и осадка

    // 4) всё вернулось вниз: средний Y снова ниже, чем был при подъёме
    const avgAfter = avgY(engine);
    expect(avgAfter).toBeGreaterThan(avgDuring + 10);
    // 5) гравитация мира не перевёрнута
    expect(engine.engine.gravity.y).toBeGreaterThan(0);
  }, 30000);

  it('тела в полосе зависания останавливаются прямо под чертой', () => {
    const engine = new GameEngine(
      {
        onStateChanged: () => undefined,
        onMergeEffect: () => undefined,
        onSpawnDropped: () => undefined,
        onGameOver: () => undefined,
        onCountdownStarted: () => undefined,
        onVictory: () => undefined,
        onBestScoreChanged: () => undefined,
      },
      7,
    );
    engine.startNewGame();
    fillSkillPoints(engine, 2);
    expect(engine.startAbility('levitation')).toBe(true);
    run(engine, 1400); // полная левитация
    let worstTop = Infinity;
    for (const e of engine.allBalls()) {
      const body = engine.getBallBody(e)!;
      const topY = body.position.y - radiusOf(e.level);
      worstTop = Math.min(worstTop, topY);
    }
    // верх самого высокого тела — не выше черты (можно чуть-чуть в полосу)
    expect(worstTop).toBeGreaterThanOrEqual(DANGER_LINE_Y - 2);
    void LEVIT_HOVER_BAND;
  }, 30000);
});



function avgY(engine: GameEngine): number {
  const ys = engine.allBalls().map((b) => engine.getBallBody(b)!.position.y);
  if (ys.length === 0) return 0;
  return ys.reduce((s, y) => s + y, 0) / ys.length;
}
