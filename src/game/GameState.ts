import type { BallLevel } from '../shared/types';
import type { GamePhase } from './GamePhase';

/** Мягкий clamp X с учётом визуального габарита силуэта (+6%). */
export function clampBallX(x: number, r: number, logicalWidth: number): number {
  return Math.max(r * 1.06 + 6, Math.min(logicalWidth - r * 1.06 - 6, x));
}

export interface GameState {
  phase: GamePhase;
  score: number;
  bestScore: number;
  mergesTotal: number;
  maxLevelReached: number;
  currentLevel: BallLevel;
  nextLevel: BallLevel;
  skillPoints: number;
  maxSkillPoints: number;
  /** Внутренний заряд текущего (неполного) деления шкалы, 0..pipSize. */
  skillCharge: number;
  skillsSpentTotal: number;
  /** Флаг «только что получено новое деление» — для анимации SkillBar. */
  skillJustGained?: boolean;
  /** откртые уровни зверьков */
  discovered: Record<number, boolean>;
  victoriesTotal: number;
  roundIndex: number;
  /** активная способность в режиме выбора цели */
  activeAbility: 'discard' | 'swap' | null;
  /** уже выбранный шар для swap */
  swapFirstBallId: string | null;
  /** levitation активна до этого simulation time */
  levitationUntil: number;
  /** shake активен до этого simulation time */
  shakeUntil: number;
  /** фаза до паузы */
  phaseBeforePause?: GamePhase;
  /** сколько зарядов Обмена накоплено (макс 1, не стакается) */
  swapCharges: number;
  /** сколько зарядов Обмена уже выдано за всю игру */
  swapChargesEarned: number;
}

export function createInitialGameState(
  bestScore: number,
  victoriesTotal: number,
  discovered: Record<number, boolean>,
): GameState {
  return {
    phase: 'MENU',
    score: 0,
    bestScore,
    mergesTotal: 0,
    maxLevelReached: 0,
    currentLevel: 1,
    nextLevel: 2,
    skillPoints: 1,
    maxSkillPoints: 3,
    skillCharge: 0,
    skillsSpentTotal: 0,
    discovered: { ...discovered },
    victoriesTotal,
    roundIndex: 0,
    activeAbility: null,
    swapFirstBallId: null,
    levitationUntil: 0,
    shakeUntil: 0,
    swapCharges: 0,
    swapChargesEarned: 0,
  };
}
