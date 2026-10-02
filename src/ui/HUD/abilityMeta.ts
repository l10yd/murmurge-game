export type AbilityId = 'discard' | 'levitation' | 'shake' | 'swap';

export const ABILITY_META: Record<AbilityId, { icon: string; cost: number }> = {
  discard: { icon: '✖', cost: 1 },
  levitation: { icon: '⬆', cost: 2 },
  shake: { icon: '〜', cost: 3 },
  swap: { icon: '⇄', cost: 3 },
};

export const MENU_ABILITY_IDS: AbilityId[] = ['discard', 'levitation', 'shake', 'swap'];
