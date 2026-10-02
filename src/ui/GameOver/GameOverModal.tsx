import { UI_TEXT } from '../../data/localization';

interface Props {
  score: number;
  best: number;
  merges: number;
  maxLevel: number;
  onRestart: () => void;
  onMenu: () => void;
}

export function GameOverModal({ score, best, merges, maxLevel, onRestart, onMenu }: Props) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={UI_TEXT.gameOver}>
      <div className="modal">
        <h2>{UI_TEXT.gameOver}</h2>
        <div className="go-stats">
          <div className="go-stat">
            <div className="v">{score}</div>
            <div className="k">{UI_TEXT.score}</div>
          </div>
          <div className="go-stat">
            <div className="v">{best}</div>
            <div className="k">{UI_TEXT.best}</div>
          </div>
          <div className="go-stat">
            <div className="v">{merges}</div>
            <div className="k">{UI_TEXT.merges}</div>
          </div>
          <div className="go-stat">
            <div className="v">{maxLevel}</div>
            <div className="k">Макс. ур.</div>
          </div>
        </div>
        <div className="menu-list">
          <button className="menu-btn primary" onClick={onRestart}>
            {UI_TEXT.restart}
          </button>
          <button className="menu-btn" onClick={onMenu}>
            {UI_TEXT.mainMenu}
          </button>
        </div>
      </div>
    </div>
  );
}
