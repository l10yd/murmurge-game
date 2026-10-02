import { useEffect, useRef } from 'react';
import { drawCreatureIcon } from '../../game/render/CreatureSprite';
import { UI_TEXT } from '../../data/localization';

interface Props {
  level: number;
  discovered: boolean;
}

export function NextPreview({ level, discovered }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (ref.current) drawCreatureIcon(ref.current, level as 1, discovered);
  }, [level, discovered]);
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
