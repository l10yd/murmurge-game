import type { BallLevel } from '../../shared/types';
import { BALL_CONFIG } from '../config/ballConfig';

interface DrawOpts {
  /** режим силуэта для неоткрытых (коллекция рисует свой canvas) */
  silhouette?: boolean;
  /** свечение (Victory L11 / подсветка) */
  glow?: boolean;
  /** множитель размера (Victory growth) */
  scale?: number;
}

/** Детерминированная «неровность» силуэта на уровень. */
function wobble(level: BallLevel, theta: number): number {
  const p1 = (level * 1.7) % (Math.PI * 2);
  const p2 = (level * 2.9) % (Math.PI * 2);
  return 1 + 0.045 * Math.sin(3 * theta + p1) + 0.03 * Math.cos(5 * theta + p2);
}

function drawEars(ctx: CanvasRenderingContext2D, r: number, v: (typeof BALL_CONFIG)[BallLevel], silhouette: boolean): void {
  const main = silhouette ? '#5b5248' : v.color;
  const inner = silhouette ? '#6b6257' : v.inner;
  const dark = silhouette ? '#4a4238' : v.dark;
  ctx.fillStyle = main;
  ctx.strokeStyle = dark;
  ctx.lineWidth = r * 0.06;
  const drawPair = (fn: (sx: number) => void) => {
    fn(-1);
    fn(1);
  };

  switch (v.ears) {
    case 'round':
      drawPair((sx) => {
        ctx.beginPath();
        ctx.ellipse(sx * r * 0.58, -r * 0.82, r * 0.26, r * 0.3, sx * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = inner;
        ctx.beginPath();
        ctx.ellipse(sx * r * 0.58, -r * 0.8, r * 0.13, r * 0.16, sx * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = main;
      });
      break;
    case 'pointy':
      drawPair((sx) => {
        ctx.beginPath();
        ctx.moveTo(sx * r * 0.32, -r * 0.78);
        ctx.lineTo(sx * r * 0.72, -r * 1.3);
        ctx.lineTo(sx * r * 0.82, -r * 0.62);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = inner;
        ctx.beginPath();
        ctx.moveTo(sx * r * 0.48, -r * 0.82);
        ctx.lineTo(sx * r * 0.68, -r * 1.12);
        ctx.lineTo(sx * r * 0.74, -r * 0.72);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = main;
      });
      break;
    case 'long':
      drawPair((sx) => {
        ctx.beginPath();
        ctx.ellipse(sx * r * 0.5, -r * 1.05, r * 0.16, r * 0.48, sx * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = inner;
        ctx.beginPath();
        ctx.ellipse(sx * r * 0.51, -r * 1.02, r * 0.07, r * 0.3, sx * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = main;
      });
      break;
    case 'tiny':
      drawPair((sx) => {
        ctx.beginPath();
        ctx.ellipse(sx * r * 0.55, -r * 0.88, r * 0.16, r * 0.18, sx * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      break;
    case 'droopy':
      drawPair((sx) => {
        ctx.beginPath();
        ctx.ellipse(sx * r * 0.88, -r * 0.35, r * 0.2, r * 0.42, sx * 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = inner;
        ctx.beginPath();
        ctx.ellipse(sx * r * 0.9, -r * 0.33, r * 0.1, r * 0.26, sx * 1.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = main;
      });
      break;
  }
}

function drawCrest(ctx: CanvasRenderingContext2D, r: number, v: (typeof BALL_CONFIG)[BallLevel], silhouette: boolean): void {
  if (v.crest === 'none') return;
  const dark = silhouette ? '#4a4238' : v.dark;
  const gold = silhouette ? '#6b6257' : '#ffd700';
  ctx.fillStyle = silhouette ? '#5b5248' : v.color;
  ctx.strokeStyle = dark;
  ctx.lineWidth = r * 0.05;
  switch (v.crest) {
    case 'tuft': {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.95);
      ctx.quadraticCurveTo(r * 0.08, -r * 1.28, r * 0.2, -r * 1.18);
      ctx.quadraticCurveTo(r * 0.02, -r * 1.14, 0, -r * 0.98);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'horn': {
      ctx.beginPath();
      ctx.moveTo(-r * 0.12, -r * 0.92);
      ctx.lineTo(0, -r * 1.32);
      ctx.lineTo(r * 0.12, -r * 0.92);
      ctx.closePath();
      ctx.fillStyle = silhouette ? '#6b6257' : '#ffe9b8';
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'crown': {
      const cw = r * 0.62;
      const ch = r * 0.34;
      const cy = -r * (v.crest === 'crown' && v.name.includes('Король') ? 1.12 : 1.02);
      ctx.fillStyle = gold;
      ctx.strokeStyle = silhouette ? '#4a4238' : '#b8860b';
      ctx.lineWidth = r * 0.05;
      ctx.beginPath();
      ctx.moveTo(-cw / 2, cy);
      ctx.lineTo(-cw / 2, cy - ch * 0.5);
      ctx.lineTo(-cw / 4, cy - ch * 0.15);
      ctx.lineTo(0, cy - ch);
      ctx.lineTo(cw / 4, cy - ch * 0.15);
      ctx.lineTo(cw / 2, cy - ch * 0.5);
      ctx.lineTo(cw / 2, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (!silhouette) {
        ctx.fillStyle = v.crest === 'crown' ? '#ff5f8f' : '#5bc8ff';
        ctx.beginPath();
        ctx.arc(0, cy - ch * 0.32, r * 0.055, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }
}

/**
 * CreatureSprite: процедурный мультяшный зверёк — пухлое неровное тело,
 * два уха, хохолок/рожки/корона, животик, лапки, мордочка.
 * Рисуется в логических координатах (x, y — центр коллизии).
 */
export function drawCreature(
  ctx: CanvasRenderingContext2D,
  level: BallLevel,
  x: number,
  y: number,
  angle: number,
  opts: DrawOpts = {},
): void {
  const v = BALL_CONFIG[level];
  const visualR = (v.radius / 0.94) * (opts.scale ?? 1);
  const silhouette = opts.silhouette ?? false;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (opts.glow) {
    ctx.shadowColor = silhouette ? 'transparent' : v.color;
    ctx.shadowBlur = visualR * 0.45;
  }

  drawEars(ctx, visualR, v, silhouette);
  drawCrest(ctx, visualR, v, silhouette);

  // тело — неровный круг
  ctx.beginPath();
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const rr = visualR * wobble(level, theta);
    const px = Math.cos(theta) * rr;
    const py = Math.sin(theta) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = silhouette ? '#7a7062' : v.color;
  ctx.strokeStyle = silhouette ? '#5b5248' : v.dark;
  ctx.lineWidth = visualR * 0.07;
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (silhouette) {
    ctx.restore();
    return;
  }

  // лапки
  ctx.fillStyle = v.color;
  ctx.strokeStyle = v.dark;
  ctx.lineWidth = visualR * 0.06;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx * visualR * 0.42, visualR * 0.82, visualR * 0.17, visualR * 0.12, sx * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // животик
  ctx.beginPath();
  ctx.ellipse(0, visualR * 0.38, visualR * 0.52, visualR * 0.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = v.belly;
  ctx.fill();

  // мордочка; у Нефрита (L7) — сонная, с закрытыми глазами
  const eyeY = -visualR * 0.12;
  const eyeDX = visualR * 0.24;
  const eyeR = Math.max(1.6, visualR * 0.085);
  if (level === 7) {
    // спит: две дуги вместо глаз
    ctx.strokeStyle = '#2d2418';
    ctx.lineWidth = Math.max(1.4, visualR * 0.05);
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * eyeDX, eyeY + eyeR * 0.4, eyeR * 1.25, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    // z-z-z
    ctx.fillStyle = '#0e7e8c';
    ctx.font = `600 ${Math.max(8, visualR * 0.22)}px "Segoe UI", sans-serif`;
    ctx.fillText('z', visualR * 0.5, -visualR * 0.72);
  } else {
    ctx.fillStyle = '#2d2418';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * eyeDX, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffffff';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * eyeDX + eyeR * 0.32, eyeY - eyeR * 0.32, eyeR * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // румянец
  ctx.fillStyle = 'rgba(255,120,140,0.45)';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx * visualR * 0.42, visualR * 0.06, visualR * 0.11, visualR * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // улыбка (у L7 — спокойная прямая с лёгкой улыбкой)
  ctx.strokeStyle = '#2d2418';
  ctx.lineWidth = Math.max(1.2, visualR * 0.045);
  ctx.beginPath();
  if (level === 7) {
    ctx.moveTo(-visualR * 0.1, visualR * 0.14);
    ctx.quadraticCurveTo(0, visualR * 0.2, visualR * 0.1, visualR * 0.14);
  } else {
    ctx.arc(0, visualR * 0.08, visualR * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
  }
  ctx.stroke();

  // носик
  ctx.fillStyle = '#2d2418';
  ctx.beginPath();
  ctx.ellipse(0, visualR * 0.015, visualR * 0.045, visualR * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();

  // королевский блеск в глазах для L11
  if (level === 11) {
    ctx.strokeStyle = '#fff8dc';
    ctx.lineWidth = visualR * 0.03;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * eyeDX - eyeR * 1.4, eyeY - eyeR * 1.2);
      ctx.lineTo(sx * eyeDX - eyeR * 0.6, eyeY - eyeR * 2);
      ctx.moveTo(sx * eyeDX - eyeR * 0.6, eyeY - eyeR * 1.2);
      ctx.lineTo(sx * eyeDX - eyeR * 1.4, eyeY - eyeR * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

/** Размер мини-арта для коллекции. */
export function drawCreatureIcon(canvas: HTMLCanvasElement, level: BallLevel, discovered: boolean): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = canvas.clientWidth || 72;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const v = BALL_CONFIG[level];
  const scale = (size * 0.34) / v.radius;
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.scale(scale, scale);
  drawCreature(ctx, level, 0, 0, 0, { silhouette: !discovered });
  ctx.restore();
}
