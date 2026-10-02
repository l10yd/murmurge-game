import { useEffect } from 'react';
import type { Settings } from '../../shared/types';
import { UI_TEXT } from '../../data/localization';
import { ALL_LEVELS } from '../../shared/types';
import { LEVEL_NAMES } from '../../data/localization';
import { drawCreatureIcon } from '../../game/render/CreatureSprite';
import { useRef } from 'react';

export type PauseView = 'menu' | 'collection' | 'howto' | 'settings';

interface Props {
  view: PauseView;
  discovered: Record<number, boolean>;
  settings: Settings;
  onSettings: (patch: Partial<Settings>) => void;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
  onOpenView: (v: PauseView) => void;
  /** Назад: в паузе — в меню паузы, из главного меню — закрыть оверлей */
  onBack: () => void;
  onResetProgress: () => void;
  /** true — рендер из главного меню: без кнопок «Продолжить/Заново/В меню» */
  menuMode?: boolean;
}

export function PauseMenu(props: Props) {
  const { view } = props;

  useEffect(() => {
    // фокус на модалке для клавиатурной навигации
    const el = document.querySelector<HTMLElement>('.modal');
    el?.focus();
  }, [view]);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={view === 'menu' ? UI_TEXT.paused : UI_TEXT[view === 'collection' ? 'collection' : view === 'howto' ? 'howToPlay' : 'settings']}>
      <div className="modal" tabIndex={-1}>
        {view === 'menu' && (
          <>
            <h2>{UI_TEXT.paused}</h2>
            <div className="menu-list">
              {!props.menuMode && (
                <button className="menu-btn primary" onClick={props.onResume}>
                  {UI_TEXT.resume}
                </button>
              )}
              <button className="menu-btn" onClick={() => props.onOpenView('collection')}>
                {UI_TEXT.collection}
              </button>
              <button className="menu-btn" onClick={() => props.onOpenView('howto')}>
                {UI_TEXT.howToPlay}
              </button>
              <button className="menu-btn" onClick={() => props.onOpenView('settings')}>
                {UI_TEXT.settings}
              </button>
              {!props.menuMode && (
                <>
                  <button className="menu-btn" onClick={props.onRestart}>
                    {UI_TEXT.restart}
                  </button>
                  <button className="menu-btn" onClick={props.onMenu}>
                    {UI_TEXT.mainMenu}
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {view === 'collection' && (
          <>
            <h2>{UI_TEXT.collection}</h2>
            <div className="collection-grid">
              {ALL_LEVELS.map((lv) => {
                const found = !!props.discovered[lv];
                return (
                  <CollectionCard key={lv} level={lv} discovered={found} />
                );
              })}
            </div>
            <div className="menu-list" style={{ marginTop: 16 }}>
              <button className="menu-btn" onClick={props.onBack}>
                {UI_TEXT.back}
              </button>
            </div>
          </>
        )}

        {view === 'howto' && (
          <>
            <h2>{UI_TEXT.howToPlay}</h2>
            <ol className="howto-list">
              {UI_TEXT.howToPlayText.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
            <div className="menu-list" style={{ marginTop: 16 }}>
              <button className="menu-btn" onClick={props.onBack}>
                {UI_TEXT.back}
              </button>
            </div>
          </>
        )}

        {view === 'settings' && (
          <>
            <h2>{UI_TEXT.settings}</h2>
            <SettingsRows settings={props.settings} onSettings={props.onSettings} />
            <div className="menu-list" style={{ marginTop: 16 }}>
              <button className="menu-btn" onClick={props.onBack}>
                {UI_TEXT.back}
              </button>
              <button className="menu-btn" style={{ color: 'var(--danger)' }} onClick={props.onResetProgress}>
                Сбросить прогресс
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CollectionCard({ level, discovered }: { level: number; discovered: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (ref.current) drawCreatureIcon(ref.current, level as 1, discovered);
  }, [level, discovered]);
  return (
    <div className="collection-card">
      <canvas ref={ref} width={72} height={72} style={{ width: 72, height: 72 }} aria-hidden />
      <div className="lv">
        {UI_TEXT.level} {level}
      </div>
      <div className={`nm${discovered ? '' : ' unknown'}`}>{discovered ? LEVEL_NAMES[level] : UI_TEXT.undiscovered}</div>
    </div>
  );
}

function SettingsRows({ settings, onSettings }: { settings: Settings; onSettings: (p: Partial<Settings>) => void }) {
  const rows: Array<{ key: keyof Settings; name: string }> = [
    { key: 'sound', name: 'Звук' },
    { key: 'music', name: 'Музыка' },
    { key: 'vibration', name: 'Вибрация' },
    { key: 'reducedMotion', name: 'Уменьшить движение' },
  ];
  return (
    <div>
      {rows.map(({ key, name }) => (
        <div className="settings-row" key={key}>
          <span className="name">{name}</span>
          <button
            className={`toggle${settings[key] ? ' on' : ''}`}
            role="switch"
            aria-checked={settings[key]}
            aria-label={name}
            onClick={() => onSettings({ [key]: !settings[key] } as Partial<Settings>)}
          />
        </div>
      ))}
    </div>
  );
}
