# Проект: murmurge — уютный физический merge-аркад (Suika-лайк) на Matter.js

## Стек
- Vite 5 + TypeScript + React 18 (обвязка UI) + свои модули физики/геймплея
- Matter.js — вся физика; Canvas 2D рендер с процедурными спрайтами (DPR-aware)
- Vitest (unit+интеграция) + Playwright (e2e); npm, НЕ pnpm
- Интерфейс RU-only (level names, UI_TEXT)

## Архитектура
- src/game/ — чистый core: GameEngine/GameState/GamePhase + config (ballConfig: 11 уровней
  зверьков, Pух…Мурмур-Король; balanceConfig; physicsConfig), render/ (Viewport letterbox
  500×660, GameRenderer, CreatureSprite, EffectsRenderer), input/InputController, audio/.
- skillCharge.ts — экономика способностей (шкала 3×100; Обмен окупается через 6 потраченных).
- saveData (localStorage schema v1: bestScore/victoriesTotal/discovered).
- UI — React-оверлеи поверх канваса: HUD (ScorePanel/SkillBar/ButtonPause), PauseMenu,
  GameOverModal, VictoryOverlay.

## Ключевые файлы
- DECISIONS.md — 23 задокументированных решения реализации (очень подробно: физика-патчи
  Matter 0.20, левитация через applyForce, анти-застревание мерджей по близости, баланс)
- src/__tests__/ — 38 юнит/интеграционных тестов (countdown/rules/skillCharge/levitation/...)
- e2e/ Chromium Playwright smoke, shots/*.png скриншоты геймплея
- src/data/localization.ts — RU тексты (LEVEL_NAMES — имена зверьков)

## Прогресс
- ✅ Игра готова: сборка зелёная (v0.1.4), тесты 38/38 (в прогоне 7 файлов/38 кейсов),
  build dist/index.html 0.55 kB + JS 280 kB.
- ✅ Публикация 2026-10-02: github.com/l10yd/murmurge-game (public, main) + Vercel
  warl10yd/murmurge-game → https://murmurge-game.vercel.app (git connect, пуш main → авто-деплой).
  На gosugames.online: slug murmurge, status live, new_drop[0]+fleet[0], accent #f5b400,
  постер gosu/public/games/murmurge.svg, жанры casual+puzzle, муды relax+think,
  mobileSupport full, RU-only UI указан в описании. Пайплайн выпуска — gosu/docs/deploy-game.md.
- ⚠ На день выпуска *.vercel.app не резолвился с машины (TLS-хендшейк-таймаут, и к старым
  доменам тоже) — прод проверен Vercel API READY; прямую curl-проверку повторить при возврате сети.

## TODO / что осталось сделать
- Повторить curl-проверку https://murmurge-game.vercel.app когда вернётся сеть до vercel.app.
- e2e (playwright) в CI/локально — не запускался в этой сессии.
- постMessage score-мост в gosu-кабинет (gosu/docs/score-protocol.md) — не делался.
