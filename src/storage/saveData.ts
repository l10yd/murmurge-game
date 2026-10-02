import { SAVE_VERSION, STORAGE_KEYS } from './storageKeys';
import { DEFAULT_SETTINGS, type Settings } from '../shared/types';

export interface SaveData {
  bestScore: number;
  victoriesTotal: number;
  discovered: Record<number, boolean>;
}

export function loadSaveSafe(): SaveData {
  const fallback: SaveData = { bestScore: 0, victoriesTotal: 0, discovered: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.save);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { saveVersion?: number; bestScore?: number; victoriesTotal?: number; discovered?: Record<number, boolean> };
    if (parsed.saveVersion !== SAVE_VERSION) return fallback; // неизвестная версия — безопасный сброс
    return {
      bestScore: Number.isFinite(parsed.bestScore) ? Math.max(0, Number(parsed.bestScore)) : 0,
      victoriesTotal: Number.isFinite(parsed.victoriesTotal) ? Math.max(0, Number(parsed.victoriesTotal)) : 0,
      discovered: parsed.discovered && typeof parsed.discovered === 'object' ? parsed.discovered : {},
    };
  } catch {
    return fallback;
  }
}

export function persistSave(data: SaveData): void {
  try {
    localStorage.setItem(
      STORAGE_KEYS.save,
      JSON.stringify({ saveVersion: SAVE_VERSION, ...data }),
    );
  } catch {
    // хранилище недоступно — игра работает без сохранений
  }
}

export function saveBestScore(bestScore: number): void {
  const data = loadSaveSafe();
  data.bestScore = bestScore;
  persistSave(data);
}

export function saveVictories(victoriesTotal: number): void {
  const data = loadSaveSafe();
  data.victoriesTotal = victoriesTotal;
  persistSave(data);
}

export function saveDiscovered(discovered: Record<number, boolean>): void {
  const data = loadSaveSafe();
  data.discovered = discovered;
  persistSave(data);
}

export function loadSettingsSafe(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      sound: typeof parsed.sound === 'boolean' ? parsed.sound : DEFAULT_SETTINGS.sound,
      music: typeof parsed.music === 'boolean' ? parsed.music : DEFAULT_SETTINGS.music,
      vibration: typeof parsed.vibration === 'boolean' ? parsed.vibration : DEFAULT_SETTINGS.vibration,
      reducedMotion: typeof parsed.reducedMotion === 'boolean' ? parsed.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function persistSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}

export function resetStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.save);
    localStorage.removeItem(STORAGE_KEYS.settings);
  } catch {
    /* ignore */
  }
}
