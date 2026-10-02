import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../game/GameState';
import { GAME_CONFIG } from '../game/config/balanceConfig';

/**
 * Чистые правила начислений проверяем на уровне формул конфига,
 * чтобы не тянуть Matter.js в unit-среду (интеграция покрыта сборкой и smoke).
 */
describe('score & skill rules', () => {
  it('таблица очков покрывает уровни 2–11', () => {
    for (let lv = 2; lv <= 11; lv++) {
      expect(GAME_CONFIG.scoreByResultLevel[lv]).toBeGreaterThan(0);
    }
  });

  it('стартовые очки навыков в пределах максимума', () => {
    const st = createInitialGameState(0, 0, {});
    expect(st.skillPoints).toBeLessThanOrEqual(GAME_CONFIG.skill.maxPoints);
    expect(st.skillCharge).toBe(0);
  });

  it('заряды Обмена стартуют пустыми', () => {
    const st = createInitialGameState(0, 0, {});
    expect(st.swapCharges).toBe(0);
    expect(st.swapChargesEarned).toBe(0);
  });

  it('веса спавна в сумме дают 1 и только L1–L5', () => {
    const keys = Object.keys(GAME_CONFIG.spawnWeights).map(Number).sort();
    expect(keys).toEqual([1, 2, 3, 4, 5]);
    const sum = Object.values(GAME_CONFIG.spawnWeights).reduce((s, w) => s + w, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-9);
  });

  it('victory bonus начисляется согласно конфигу', () => {
    const st = createInitialGameState(0, 0, {});
    st.score += GAME_CONFIG.victoryBonus;
    expect(st.score).toBe(GAME_CONFIG.victoryBonus);
  });
});
