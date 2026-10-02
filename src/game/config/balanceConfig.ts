import type { AbilityId } from '../../shared/types';

export const GAME_CONFIG = {
  /** Веса спавна current/next — только L1–L5, сумма ровно 1. */
  spawnWeights: {
    1: 0.4,
    2: 0.27,
    3: 0.17,
    4: 0.1,
    5: 0.06,
  } as Readonly<Record<number, number>>,

  skill: {
    maxPoints: 3,
    startPoints: 1,
    /** Внутренний размер одного деления шкалы (не показывается игроку как число). */
    pipSize: 100,
    costs: {
      discard: 1,
      levitation: 2,
      shake: 3,
      /** Обмен бесплатен: тратится заряд, даваемый за каждые swapUnlockAtSpent очков. */
      swap: 0,
    } as Readonly<Record<AbilityId, number>>,
    /** Каждые N потраченных очков навыков = 1 бесплатный заряд Обмена. */
    swapUnlockAtSpent: 6,
    /** Заряды Обмена не стакаются. */
    swapChargeMax: 1,
    /**
     * Внутренние очки заряда за слияние с результатом уровня N (шкала 3×100).
     * Замедлено относительно первой версии: деление теперь ~15–25 ранних
     * мерджей или 2–3 очень крупных.
     */
    mergeChargeByLevel: {
      2: 4,
      3: 7,
      4: 10,
      5: 15,
      6: 21,
      7: 28,
      8: 36,
      9: 45,
      10: 55,
      11: 66,
    } as Readonly<Record<number, number>>,
  },

  effects: {
    levitationDurationMs: 2000,
    shakeDurationMs: 1100,
    shakeTickMs: 90,
    shakeImpulseX: 0.017,
    shakeImpulseY: 0.009,
    mergeCooldownMs: 80,
    /**
     * Слияние по близости: пара одинаковых уровней сливается, если центры
     * ближе (rA+rB)*factor — страховка от спящих/застрявших перекрытий
     * (Matter 0.20 пропускает пары спящих тел в детекторе).
     */
    mergeProximityFactor: 0.97,
    /** grace в обычном режиме до запуска отсчёта. */
    gameOverGraceMs: 750,
    /** Отсчёт 3-2-1 перед поражением: 3 секунды рэгдолла и возможных мерджей. */
    gameOverCountdownMs: 3000,
    victoryDurationMs: 2000,
    dropDelayMs: 450,
  },

  scoreByResultLevel: {
    2: 5,
    3: 12,
    4: 22,
    5: 36,
    6: 55,
    7: 80,
    8: 110,
    9: 145,
    10: 185,
    11: 250,
  } as Readonly<Record<number, number>>,

  victoryBonus: 1000,
} as const;

/** Y-координата danger line в логических координатах поля. */
export const DANGER_LINE_Y = 150;

/** Левитация: полоса зависания под чертой (тела останавливаются в ней). */
export const LEVIT_HOVER_BAND = 26;
/** Левитация: сила подъёма как доля обычной гравитации. */
export const LEVIT_LIFT_SCALE = 0.9;
/** Левитация: предел вертикальной скорости вверх. */
export const LEVIT_MAX_VY = 3.2;
