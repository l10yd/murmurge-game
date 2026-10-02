export type BallLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const ALL_LEVELS: BallLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export interface BallEntity {
  ballId: string;
  level: BallLevel;
  bodyId: number;
  /** simulation ms, раньше этого времени слияние запрещено */
  canMergeAfter: number;
  /** simulation ms момента создания */
  createdAtTick: number;
}

export type AbilityId = 'discard' | 'levitation' | 'shake' | 'swap';

export interface Settings {
  sound: boolean;
  music: boolean;
  vibration: boolean;
  reducedMotion: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  music: false,
  vibration: true,
  reducedMotion: false,
};
