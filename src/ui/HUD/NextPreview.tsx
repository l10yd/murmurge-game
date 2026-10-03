import { useEffect, useRef } from 'react';
import { drawCreatureIcon } from '../../game/render/CreatureSprite';
import { UI_TEXT } from '../../data/localization';

interface Props {
  level: number;
  discovered: boolean;
  /** компактный режим: маленькая плашка с иконкой, без текста */
  compact?: boolean;
}

export function NextPreview({ level, discovered, compact }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (ref.current) drawCreatureIcon(ref.current, level as 1, discovered);
  }, [level, discovered]);
  if (compact) {
    return (
      <div className="next-compact" aria-label={`${UI_TEXT.next}: уровень ${level}`}>
        <svg className="next-compact-icon" viewBox="0 0 24 24" width="14" height="14" aria-hidden>
          <path
            d="M4 5h12M12 5l-3-3M12 5l-3 3"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 19H8M12 19l3-3M12 19l3 3"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <canvas ref={ref} className="next-compact-canvas" />
      </div>
    );
  }
  return (
    <div className="panel next-panel" aria-label={UI_TEXT.next}>
      <canvas ref={ref} className="next-canvas" />
      <div>
        <div className="label">{UI_TEXT.next}</div>
        <div className="value" style={{ fontSize: 16 }}>
          {discovered ? `Ур. ${level}` : '???'}
        </div>
      </div>
    </div>
  );
}
