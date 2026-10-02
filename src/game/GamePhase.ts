export type GamePhase =
  | 'BOOT'
  | 'MENU'
  | 'PLAYING'
  | 'AIMING'
  | 'ABILITY_TARGETING'
  | 'ABILITY_ACTIVE'
  | 'MERGING'
  | 'VICTORY'
  | 'PAUSED'
  /** Нарушение черты подтверждено: идёт отсчёт 3-2-1, физика жива. */
  | 'GAME_OVER_COUNTDOWN'
  | 'GAME_OVER';

export const TARGETING_ABILITIES = new Set(['discard', 'swap']);

export function isGameplayPhase(p: GamePhase): boolean {
  return (
    p === 'PLAYING' ||
    p === 'AIMING' ||
    p === 'ABILITY_TARGETING' ||
    p === 'ABILITY_ACTIVE' ||
    p === 'MERGING' ||
    p === 'GAME_OVER_COUNTDOWN'
  );
}
