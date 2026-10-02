import type { Settings } from '../../shared/types';

/**
 * AudioManager: лёгкий синтез через WebAudio — игра работает без аудиофайлов
 * и без console errors. Архитектура позволяет подменить на сэмплы.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
  }

  updateSettings(s: Settings): void {
    this.settings = s;
  }

  private ensureCtx(): AudioContext | null {
    if (!this.settings.sound) return null;
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private blip(freq: number, durationMs: number, type: OscillatorType, gainValue: number, slideTo?: number): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + durationMs / 1000);
      gain.gain.setValueAtTime(gainValue, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      /* звук не критичен */
    }
  }

  merge(level: number): void {
    const base = 320 + Math.min(level, 11) * 42;
    this.blip(base, 120, 'sine', 0.12, base * 1.5);
    if (level >= 8) this.blip(base * 1.5, 200, 'triangle', 0.1, base * 2);
  }

  drop(): void {
    this.blip(220, 90, 'sine', 0.06, 140);
  }

  ability(): void {
    this.blip(520, 140, 'triangle', 0.09, 760);
  }

  abilityDenied(): void {
    this.blip(180, 140, 'square', 0.05, 120);
  }

  victory(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => {
      window.setTimeout(() => this.blip(n, 260, 'sine', 0.12), i * 140);
    });
  }

  gameOverSound(): void {
    const notes = [392, 330, 262];
    notes.forEach((n, i) => {
      window.setTimeout(() => this.blip(n, 300, 'triangle', 0.09), i * 180);
    });
  }

  vibrate(pattern: number | number[]): void {
    if (!this.settings.vibration) return;
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* ignore */
    }
  }
}
