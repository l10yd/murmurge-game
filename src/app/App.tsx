import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameEngine } from '../game/GameEngine';
import type { GameState } from '../game/GameState';
import { Viewport } from '../game/render/Viewport';
import { GameRenderer } from '../game/render/GameRenderer';
import { EffectsRenderer } from '../game/render/EffectsRenderer';
import { PhysicsLoop } from '../game/render/PhysicsLoop';
import { InputController } from '../game/input/InputController';
import { AudioManager } from '../game/audio/AudioManager';
import { loadSettingsSafe, persistSettings, resetStorage } from '../storage/saveData';
import type { Settings } from '../shared/types';
import { ScorePanel } from '../ui/HUD/ScorePanel';
import { SkillBar } from '../ui/HUD/SkillBar';
import { AbilityButton } from '../ui/HUD/AbilityButton';
import { NextPreview } from '../ui/HUD/NextPreview';
import { PauseMenu } from '../ui/Pause/PauseMenu';
import { GameOverModal } from '../ui/GameOver/GameOverModal';
import { VictoryOverlay } from '../ui/Victory/VictoryOverlay';
import { MENU_ABILITY_IDS, ABILITY_META } from '../ui/HUD/abilityMeta';
import { GAME_TITLE, UI_TEXT } from '../data/localization';
import { BALL_CONFIG } from '../game/config/ballConfig';
import { PHYSICS_CONFIG } from '../game/config/physicsConfig';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const viewportRef = useRef<Viewport | null>(null);
  const effectsRef = useRef<EffectsRenderer | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const loopRef = useRef<PhysicsLoop | null>(null);
  const inputRef = useRef<InputController | null>(null);
  const audioRef = useRef<AudioManager | null>(null);
  const levitFxAtRef = useRef(0);

  const [state, setState] = useState<GameState | null>(null);
  const [settings, setSettings] = useState<Settings>(() => loadSettingsSafe());
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseView, setPauseView] = useState<'menu' | 'collection' | 'howto' | 'settings'>('menu');
  const [victoryVisible, setVictoryVisible] = useState(false);
  const [countdownKey, setCountdownKey] = useState(0);

  if (!audioRef.current) audioRef.current = new AudioManager(loadSettingsSafe());

  // --- инициализация движка (один раз) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const area = areaRef.current;
    if (!canvas || !area) return;

    const engine = new GameEngine(
      {
        onStateChanged: (s) => setState(s),
        onMergeEffect: (x, y, level) => {
          effectsRef.current?.mergePop(x, y, level, BALL_CONFIG[level].color);
          audioRef.current?.merge(level);
          audioRef.current?.vibrate(level >= 8 ? [18, 30, 18] : 12);
        },
        onSpawnDropped: () => {
          audioRef.current?.drop();
        },
        onGameOver: () => {
          audioRef.current?.gameOverSound();
          audioRef.current?.vibrate([40, 60, 40]);
        },
        onCountdownStarted: () => {
          audioRef.current?.abilityDenied();
          audioRef.current?.vibrate([30, 50, 30]);
          setCountdownKey((k) => k + 1);
        },
        onVictory: () => {
          setVictoryVisible(true);
          audioRef.current?.victory();
          audioRef.current?.vibrate([30, 40, 30, 40, 60]);
          const st = engine.snapshot();
          effectsRef.current?.victoryConfetti(PHYSICS_CONFIG.logicalWidth / 2, 220, loadSettingsSafe().reducedMotion);
          window.setTimeout(() => setVictoryVisible(false), GAME_VICTORY_MS);
          void st;
        },
        onBestScoreChanged: () => undefined,
      },
      undefined,
    );
    engineRef.current = engine;

    const viewport = new Viewport();
    viewportRef.current = viewport;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const effects = new EffectsRenderer(ctx);
    effectsRef.current = effects;
    const renderer = new GameRenderer(engine, canvas, viewport, effects);
    rendererRef.current = renderer;
    renderer.setReducedMotion(settings.reducedMotion);

    const resize = () => viewport.resize(canvas, area);
    resize();
    window.addEventListener('resize', resize);

    const input = new InputController(engine, canvas, (clientX) =>
      viewport.clientToLogicalX(clientX, canvas),
    );
    inputRef.current = input;

    const loop = new PhysicsLoop(engine, renderer);
    loopRef.current = loop;
    loop.start();

    // клик по канвасу в режиме выбора цели — передаём движку
    const onCanvasClick = (e: MouseEvent) => {
      const st = engine.snapshot();
      if (st.phase !== 'ABILITY_TARGETING' || !st.activeAbility) return;
      const lx = viewport.clientToLogicalX(e.clientX, canvas);
      // ищем шар под точкой
      const rect = canvas.getBoundingClientRect();
      const ly = (e.clientY - rect.top - viewport.offsetY) / viewport.scale;
      let hit: string | null = null;
      for (const ball of engine.allBalls()) {
        const body = engine.getBallBody(ball);
        if (!body) continue;
        const r = BALL_CONFIG[ball.level].radius * 1.15;
        if (Math.hypot(body.position.x - lx, body.position.y - ly) <= r) {
          hit = ball.ballId;
          break;
        }
      }
      if (hit) engine.tapBall(hit);
      else engine.cancelAbilityTargeting();
    };
    canvas.addEventListener('click', onCanvasClick);

    setState(engine.snapshot());

    return () => {
      loop.stop();
      input.dispose();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('click', onCanvasClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Esc: пауза / отмена выбора ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const engine = engineRef.current;
      if (!engine) return;
      const st = engine.snapshot();
      if (st.phase === 'ABILITY_TARGETING') {
        engine.cancelAbilityTargeting();
      } else if (st.phase === 'PAUSED') {
        if (pauseView !== 'menu') setPauseView('menu');
        else {
          engine.resume();
          setPauseOpen(false);
        }
      } else if (st.phase === 'MENU') {
        // закрыть подэкран главного меню
        setPauseOpen(false);
        setPauseView('menu');
      } else if (isGameplay(st.phase)) {
        engine.pause();
        setPauseView('menu');
        setPauseOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pauseView]);

  function isGameplay(p: GameState['phase']): boolean {
    return (
      p === 'PLAYING' || p === 'AIMING' || p === 'ABILITY_TARGETING' || p === 'ABILITY_ACTIVE' ||
      p === 'MERGING' || p === 'GAME_OVER_COUNTDOWN'
    );
  }

  // --- reduced motion ---
  useEffect(() => {
    rendererRef.current?.setReducedMotion(settings.reducedMotion);
    audioRef.current?.updateSettings(settings);
    persistSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const engine = engineRef.current;

  const onStart = useCallback(() => {
    engineRef.current?.startNewGame();
    setPauseOpen(false);
  }, []);

  const onResume = useCallback(() => {
    engineRef.current?.resume();
    setPauseOpen(false);
  }, []);

  const onMenu = useCallback(() => {
    engineRef.current?.toMenu();
    setPauseOpen(false);
  }, []);

  const onResetProgress = useCallback(() => {
    resetStorage();
    window.location.reload();
  }, []);

  const onAbility = useCallback(
    (id: 'discard' | 'levitation' | 'shake' | 'swap') => {
      const eng = engineRef.current;
      if (!eng) return;
      const st = eng.snapshot();
      if (st.phase === 'ABILITY_TARGETING') {
        eng.cancelAbilityTargeting();
        if (st.activeAbility === id) return;
      }
      const ok = eng.startAbility(id);
      if (ok) audioRef.current?.ability();
      else audioRef.current?.abilityDenied();
    },
    [],
  );

  // левитация — частицы вдоль стен
  useEffect(() => {
    if (state?.phase !== 'ABILITY_ACTIVE' || state.levitationUntil === 0) return;
    const iv = window.setInterval(() => {
      effectsRef.current?.levitationGlow(
        { left: 14, right: PHYSICS_CONFIG.logicalWidth - 14 },
        PHYSICS_CONFIG.logicalHeight,
      );
    }, 120);
    return () => window.clearInterval(iv);
  }, [state?.phase, state?.levitationUntil]);

  const phase = state?.phase ?? 'BOOT';
  const gameplayActive = isGameplay(phase);
  const showPause = pauseOpen && phase === 'PAUSED';
  // подэкраны (коллекция/как играть/настройки) доступны и из главного меню
  const showMenuSubscreen =
    pauseOpen && phase === 'MENU' && (pauseView === 'collection' || pauseView === 'howto' || pauseView === 'settings');

  const abilityStates = useMemo(() => {
    const st = state;
    return MENU_ABILITY_IDS.map((id) => {
      const cost = ABILITY_META[id].cost;
      const isSwap = id === 'swap';
      const charges = st?.swapCharges ?? 0;
      const unlocked = isSwap ? charges > 0 : true;
      const poor = !isSwap && (st?.skillPoints ?? 0) < cost;
      const targeting = st?.phase === 'ABILITY_TARGETING' && st.activeAbility === id;
      return { id, cost, locked: !unlocked, poor, targeting, charges };
    });
  }, [state]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="icon-btn"
          aria-label={UI_TEXT.paused}
          onPointerDown={(e) => {
            // на тач-устройствах pointerdown+touch-action:none на канвасе
            // может съесть click: реагируем на pointerdown, не дожидаясь click
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            const eng = engineRef.current;
            if (!eng) return;
            const st = eng.snapshot();
            if (isGameplay(st.phase)) {
              eng.pause();
              setPauseView('menu');
              setPauseOpen(true);
            }
          }}
          disabled={!gameplayActive}
        >
          ⏸
        </button>
        <div className="title">{GAME_TITLE}</div>
        <div style={{ flex: 1 }} />
        <div className="chip" aria-live="polite">
          <span className="label">{UI_TEXT.score}</span>
          <span className="value">{state?.score ?? 0}</span>
        </div>
        <div className="chip chip-best">
          <span className="label">{UI_TEXT.best}</span>
          <span className="value">{state?.bestScore ?? 0}</span>
        </div>
      </header>

      <div className="main-row">
        <aside className="side-col">
          <ScorePanel score={state?.score ?? 0} best={state?.bestScore ?? 0} merges={state?.mergesTotal ?? 0} />
          <SkillBar
            points={state?.skillPoints ?? 0}
            max={state?.maxSkillPoints ?? 3}
            charge={state?.skillCharge ?? 0}
            justGained={state?.skillJustGained}
          />
          <div className="abilities" role="group" aria-label="Способности">
            {abilityStates.map(({ id, cost, locked, targeting, charges }) => (
              <AbilityButton
                key={id}
                id={id}
                cost={cost}
                locked={locked}
                disabled={!gameplayActive || locked}
                selected={targeting}
                swapCharges={id === 'swap' ? charges : undefined}
                onClick={() => onAbility(id)}
              />
            ))}
          </div>
        </aside>

        <div className="game-area" ref={areaRef}>
          <canvas ref={canvasRef} aria-label={GAME_TITLE} />
          {state?.phase === 'ABILITY_TARGETING' && state.activeAbility && (
            <div className="targeting-hint">
              {state.activeAbility === 'discard'
                ? 'Выбери зверька, которого убрать · ESC — отмена'
                : state.swapFirstBallId
                  ? 'Выбери второго зверька для обмена · ESC — отмена'
                  : 'Выбери первого зверька для обмена · ESC — отмена'}
            </div>
          )}
        </div>

        <aside className="side-col side-col-right">
          <NextPreview level={state?.nextLevel ?? 1} discovered={!!state?.discovered[state?.nextLevel ?? 1]} />
          <div className="panel hint">
            Сливай одинаковых зверьков и доберись до Мурмур-Короля!
          </div>
        </aside>
      </div>

      {/* Мобильный compact-превью следующей фигуры (внизу поля) */}
      <div className="next-mobile">
        <NextPreview level={state?.nextLevel ?? 1} discovered={!!state?.discovered[state?.nextLevel ?? 1]} compact />
      </div>

      {/* Отсчёт 3-2-1 — тонкий статус сверху поля; крупный циферблат рисует канвас */}
      {state?.phase === 'GAME_OVER_COUNTDOWN' && (
        <div className="countdown-banner" role="alert" key={countdownKey}>
          {UI_TEXT.countdownHint}
        </div>
      )}

      {/* Главное меню (скрывается, когда поверх открыт подэкран) */}
      {phase === 'MENU' && !pauseOpen && (
        <div className="overlay">
          <div className="modal modal-menu">
            <h2 className="modal-title">{GAME_TITLE}</h2>
            <div className="menu-list">
              <button className="menu-btn primary" onClick={onStart}>
                {UI_TEXT.play}
              </button>
              <button
                className="menu-btn"
                onClick={() => {
                  setPauseView('howto');
                  setPauseOpen(true);
                }}
              >
                {UI_TEXT.howToPlay}
              </button>
              <button
                className="menu-btn"
                onClick={() => {
                  setPauseView('collection');
                  setPauseOpen(true);
                }}
              >
                {UI_TEXT.collection}
              </button>
              <button
                className="menu-btn"
                onClick={() => {
                  setPauseView('settings');
                  setPauseOpen(true);
                }}
              >
                {UI_TEXT.settings}
              </button>
            </div>
            {state && state.victoriesTotal > 0 && (
              <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
                Побед: {state.victoriesTotal}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Пауза / вложенные экраны */}
      {showPause && (
        <PauseMenu
          view={pauseView}
          discovered={state?.discovered ?? {}}
          settings={settings}
          onSettings={updateSettings}
          onResume={onResume}
          onRestart={onStart}
          onMenu={onMenu}
          onOpenView={(v) => setPauseView(v)}
          onBack={() => setPauseView('menu')}
          onResetProgress={onResetProgress}
        />
      )}

      {/* Подэкраны главного меню */}
      {showMenuSubscreen && (
        <PauseMenu
          view={pauseView}
          discovered={state?.discovered ?? {}}
          settings={settings}
          onSettings={updateSettings}
          onResume={onResume}
          onRestart={onStart}
          onMenu={onMenu}
          onOpenView={(v) => setPauseView(v)}
          onBack={() => {
            setPauseOpen(false);
            setPauseView('menu');
          }}
          onResetProgress={onResetProgress}
          menuMode
        />
      )}

      {/* Game Over */}
      {phase === 'GAME_OVER' && state && (
        <GameOverModal
          score={state.score}
          best={state.bestScore}
          merges={state.mergesTotal}
          maxLevel={state.maxLevelReached}
          onRestart={onStart}
          onMenu={onMenu}
        />
      )}

      {/* Victory */}
      {victoryVisible && <VictoryOverlay />}
    </div>
  );
}



const GAME_VICTORY_MS = 2000;
