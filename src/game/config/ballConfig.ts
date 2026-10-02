import type { BallLevel } from '../../shared/types';

export interface BallVisual {
  /** логический радиус коллизии, px */
  radius: number;
  /** основной цвет тела */
  color: string;
  /** более тёмный оттенок для обводки/тени */
  dark: string;
  /** цвет животика/морды */
  belly: string;
  /** цвет ушек изнутри */
  inner: string;
  /** форма ушей */
  ears: 'round' | 'pointy' | 'long' | 'tiny' | 'droopy';
  /** хвост-вырост сверху: none | tuft | horn | crown */
  crest: 'none' | 'tuft' | 'horn' | 'crown';
  /** имя в коллекции */
  name: string;
}

/**
 * Радиусы — стартовый баланс из ТЗ. Collision-радиус на 6% меньше визуального
 * габарита (визуальный = radius / 0.94), чтобы ушки/лапки не липли к стенам.
 */
export const BALL_CONFIG: Record<BallLevel, BallVisual> = {
  1: { radius: 20, color: '#ffd43b', dark: '#e0a800', belly: '#fff3c4', inner: '#ff9f9f', ears: 'round', crest: 'none', name: 'Пух' },
  2: { radius: 26, color: '#ff9f43', dark: '#d67717', belly: '#ffe3c2', inner: '#ffb3b3', ears: 'pointy', crest: 'none', name: 'Рыжик' },
  3: { radius: 34, color: '#4cd7a5', dark: '#26a97b', belly: '#d8f7e9', inner: '#ffb3c8', ears: 'long', crest: 'tuft', name: 'Мята' },  4: { radius: 43, color: '#54a0ff', dark: '#2f7fd6', belly: '#dbeeff', inner: '#ffc9c9', ears: 'round', crest: 'tuft', name: 'Вихрь' },
  5: { radius: 54, color: '#a55eea', dark: '#8038c9', belly: '#eedcfe', inner: '#ffb3f0', ears: 'pointy', crest: 'horn', name: 'Искра' },
  6: { radius: 67, color: '#f368a0', dark: '#c94077', belly: '#ffdcea', inner: '#ff8fb0', ears: 'droopy', crest: 'tuft', name: 'Зефир' },
  7: { radius: 82, color: '#2fb8c6', dark: '#0e7e8c', belly: '#d5f4f8', inner: '#9fe8f0', ears: 'droopy', crest: 'none', name: 'Нефрит' },
  8: { radius: 99, color: '#576574', dark: '#3a4653', belly: '#d7dee6', inner: '#9fb0c1', ears: 'pointy', crest: 'tuft', name: 'Туман' },
  9: { radius: 118, color: '#ff6b6b', dark: '#d43f3f', belly: '#ffe0e0', inner: '#ffb0b0', ears: 'round', crest: 'horn', name: 'Пламень' },
  10: { radius: 140, color: '#2f5dd8', dark: '#1f3f9e', belly: '#d6e2ff', inner: '#7fa4ff', ears: 'long', crest: 'crown', name: 'Гроза' },
  11: { radius: 165, color: '#f5b400', dark: '#c78c00', belly: '#fff4cf', inner: '#ffe08a', ears: 'pointy', crest: 'crown', name: 'Мурмур-Король' },
};

/** Базовое имя вида. */
export const GAME_TITLE = 'Murmurge';
