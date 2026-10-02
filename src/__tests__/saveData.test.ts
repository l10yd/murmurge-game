import { describe, it, expect, beforeEach } from 'vitest';
import { loadSaveSafe, persistSave, saveBestScore } from '../storage/saveData';

describe('saveData', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('отсутствие сохранения даёт дефолт', () => {
    const s = loadSaveSafe();
    expect(s.bestScore).toBe(0);
    expect(s.victoriesTotal).toBe(0);
  });

  it('save/load roundtrip сохраняет bestScore', () => {
    persistSave({ bestScore: 123, victoriesTotal: 2, discovered: { 1: true } });
    saveBestScore(456);
    const s = loadSaveSafe();
    expect(s.bestScore).toBe(456);
    expect(s.victoriesTotal).toBe(2);
    expect(s.discovered[1]).toBe(true);
  });

  it('повреждённый JSON не роняет загрузку', () => {
    localStorage.setItem('murmurge.save.v1', '{broken json');
    expect(() => loadSaveSafe()).not.toThrow();
    expect(loadSaveSafe().bestScore).toBe(0);
  });

  it('неизвестная версия сохранения сбрасывается безопасно', () => {
    localStorage.setItem('murmurge.save.v1', JSON.stringify({ saveVersion: 99, bestScore: 500 }));
    expect(loadSaveSafe().bestScore).toBe(0);
  });
});
