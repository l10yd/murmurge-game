import { UI_TEXT } from '../../data/localization';

/** Баннер Victory — визуал поверх поля; сама sequence живёт в GameEngine. */
export function VictoryOverlay() {
  return (
    <div className="victory-banner" role="status" aria-live="polite">
      <div className="inner">
        <h1>{UI_TEXT.victory}</h1>
        <p>{UI_TEXT.victorySub}</p>
      </div>
    </div>
  );
}
