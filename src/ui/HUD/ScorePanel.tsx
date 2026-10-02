import { UI_TEXT } from '../../data/localization';

interface Props {
  score: number;
  best: number;
  merges: number;
}

export function ScorePanel({ score, best, merges }: Props) {
  return (
    <div className="panel" aria-label={UI_TEXT.score}>
      <div className="label">{UI_TEXT.score}</div>
      <div className="value">{score}</div>
      <div className="label" style={{ marginTop: 6 }}>
        {UI_TEXT.best}: {best}
      </div>
      <div className="label">
        {UI_TEXT.merges}: {merges}
      </div>
    </div>
  );
}
