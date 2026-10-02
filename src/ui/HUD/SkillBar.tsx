import { useEffect, useRef } from 'react';
import { GAME_CONFIG } from '../../game/config/balanceConfig';
import { pipFillFraction } from '../../game/skillCharge';
import { UI_TEXT } from '../../data/localization';

interface Props {
  points: number;
  max: number;
  /** внутренний заряд неполного деления, 0..pipSize */
  charge: number;
  justGained?: boolean;
}

/**
 * SkillBar: 3 деления. Каждое деление — 100 внутренних очков заряда,
 * которые игрок не видит числом; заполнение показывается шириной пипса.
 */
export function SkillBar({ points, max, charge, justGained }: Props) {
  const pipSize = GAME_CONFIG.skill.pipSize;
  const prevPoints = useRef(points);
  const flashRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (points > prevPoints.current && flashRef.current) {
      const el = flashRef.current;
      el.animate(
        [
          { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255,159,67,0.0)' },
          { transform: 'scale(1.18)', boxShadow: '0 0 14px 3px rgba(255,159,67,0.65)' },
          { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(255,159,67,0.0)' },
        ],
        { duration: 520, easing: 'ease-out' },
      );
    }
    prevPoints.current = points;
  }, [points]);

  return (
    <div className="panel" aria-label={UI_TEXT.skillPoints}>
      <div className="label">{UI_TEXT.skillPoints}</div>
      <div
        className="skillbar"
        style={{ marginTop: 6 }}
        ref={flashRef}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={points}
        aria-valuetext={`${points} из ${max}`}
      >
        {Array.from({ length: max }, (_, i) => {
          const frac = pipFillFraction(i, points, charge, pipSize);
          return (
            <div key={i} className={`skill-pip${frac > 0.02 ? ' hasfill' : ''}${justGained && i === points - 1 ? ' fresh' : ''}`}>
              <div className="skill-pip-fill" style={{ width: `${Math.round(frac * 100)}%` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
