import Matter from 'matter-js';
import type { BallEntity, BallLevel } from '../shared/types';
import { BALL_CONFIG } from './config/ballConfig';
import { DANGER_LINE_Y, GAME_CONFIG, LEVIT_HOVER_BAND, LEVIT_LIFT_SCALE, LEVIT_MAX_VY } from './config/balanceConfig';
import { PHYSICS_CONFIG } from './config/physicsConfig';
import { createInitialGameState, clampBallX, type GameState } from './GameState';
import { mulberry32, weightedBallLevel, type Rng } from '../shared/random';
import { clamp } from '../shared/math';
import { applySkillCharge, grantSwapCharges } from './skillCharge';
import { loadSaveSafe, saveBestScore, saveDiscovered, saveVictories } from '../storage/saveData';

export interface GameCallbacks {
  onStateChanged: (state: GameState) => void;
  onMergeEffect: (x: number, y: number, level: BallLevel) => void;
  onSpawnDropped: (x: number, y: number, level: BallLevel) => void;
  onGameOver: () => void;
  /** Отсчёт 3-2-1 перед поражением запущен. */
  onCountdownStarted: () => void;
  onVictory: () => void;
  onBestScoreChanged: (best: number) => void;
}

let ballIdCounter = 0;
function nextBallId(): string {
  ballIdCounter += 1;
  return `b${ballIdCounter}`;
}

/** Body.gravityScale существует в рантайме Matter 0.20, но не в @types. */
type GravityBody = Matter.Body & { gravityScale: number };

const ALL_STEPS = new Set<number>();
for (let i = 1; i <= 11; i++) ALL_STEPS.add(i);

/**
 * GameCore: правила, state machine, владение Matter-миром.
 *
 * Ключевое решение: current до сброса НЕ имеет физического тела (фантом).
 * Matter.js 0.20 не восстанавливает массу телу, созданному с isStatic: true,
 * после Body.setStatic(false) (mass=Infinity, invMass=0 — воспроизведено
 * изолированным тестом), поэтому сброс создаёт тело сразу динамическим.
 * Физическое время — фиксированный шаг, независимый от React и Date.now().
 */
export class GameEngine {
  readonly engine: Matter.Engine;
  private state: GameState;
  private balls = new Map<string, BallEntity>();
  private bodiesToBall = new Map<number, string>();
  private walls: Matter.Body[] = [];
  private rng: Rng;
  private simTime = 0;
  private accumulator = 0;
  private readonly fixedStepMs = 1000 / 60;
  private pendingPairs: Array<[Matter.Body, Matter.Body]> = [];
  private processedPairKeys = new Set<string>();
  private dangerTimers = new Map<number, number>();
  private currentX = PHYSICS_CONFIG.logicalWidth / 2;
  private victoryTriggered = false;
  private victoryStart = 0;
  private dropCooldownUntil = 0;
  private shakeNextTick = 0;
  private cb: GameCallbacks;

  /** Отсчёт поражения: момент старта (simTime), 0 = не идёт. */
  private countdownStart = 0;
  /** Число дропов, разрешённых за время ОДНОГО отсчёта (анти-эксплойт). */
  private countdownDropsUsed = 0;
  /** Жёсткий лимит дропов за один отсчёт: сверх — немедленный Game Over. */
  private static readonly COUNTDOWN_MAX_DROPS = 2;

  constructor(cb: GameCallbacks, seed?: number) {
    this.cb = cb;
    this.rng = mulberry32(seed ?? (Date.now() ^ (Math.random() * 0xffffffff)));
    this.engine = Matter.Engine.create({
      enableSleeping: PHYSICS_CONFIG.enableSleeping,
    });
    this.engine.gravity.x = PHYSICS_CONFIG.gravityX;
    this.engine.gravity.y = PHYSICS_CONFIG.gravityY;
    this.engine.positionIterations = PHYSICS_CONFIG.positionIterations;
    this.engine.velocityIterations = PHYSICS_CONFIG.velocityIterations;
    this.engine.constraintIterations = PHYSICS_CONFIG.constraintIterations;

    const save = loadSaveSafe();
    this.state = createInitialGameState(save.bestScore, save.victoriesTotal, save.discovered);
    this.state.currentLevel = this.rollLevel();
    this.state.nextLevel = this.rollLevel();

    this.createWalls();
  }

  // ---------- инициализация ----------

  private createWalls(): void {
    const w = PHYSICS_CONFIG.logicalWidth;
    const h = PHYSICS_CONFIG.logicalHeight;
    const t = PHYSICS_CONFIG.wallThickness;
    const left = Matter.Bodies.rectangle(-t / 2 + 2, h / 2, t, h * 2, { isStatic: true, label: 'wall' });
    const right = Matter.Bodies.rectangle(w + t / 2 - 2, h / 2, t, h * 2, { isStatic: true, label: 'wall' });
    const floor = Matter.Bodies.rectangle(w / 2, h + t / 2 - 2, w + t * 2, t, { isStatic: true, label: 'wall' });
    this.walls = [left, right, floor];
    Matter.Composite.add(this.engine.world, this.walls);
  }

  // ---------- state / React-мост ----------

  private push(): void {
    this.cb.onStateChanged(this.snapshot());
  }

  snapshot(): GameState {
    return { ...this.state };
  }

  getSimTime(): number {
    return this.simTime;
  }

  /** X фантомного current в логических координатах. */
  getCurrentX(): number {
    return this.currentX;
  }

  /** Остаток отсчёта поражения в секундах (ceil), 0 если не идёт. */
  countdownSecondsLeft(): number {
    if (this.countdownStart === 0) return 0;
    const elapsed = this.simTime - this.countdownStart;
    const left = Math.ceil((GAME_CONFIG.effects.gameOverCountdownMs - elapsed) / 1000);
    return Math.max(0, left);
  }

  // ---------- spawn / queue ----------

  private rollLevel(): BallLevel {
    return weightedBallLevel(GAME_CONFIG.spawnWeights, this.rng);
  }

  private spawnQueueAdvance(): void {
    this.state.currentLevel = this.state.nextLevel;
    this.state.nextLevel = this.rollLevel();
  }

  private registerBall(level: BallLevel, body: Matter.Body): BallEntity {
    const ent: BallEntity = {
      ballId: nextBallId(),
      level,
      bodyId: body.id,
      canMergeAfter: this.simTime + GAME_CONFIG.effects.mergeCooldownMs,
      createdAtTick: this.simTime,
    };
    this.balls.set(ent.ballId, ent);
    this.bodiesToBall.set(body.id, ent.ballId);
    (body as Matter.Body & { plugin: Record<string, unknown> }).plugin = { ballId: ent.ballId, level };
    Matter.Composite.add(this.engine.world, body);
    this.discover(level);
    return ent;
  }

  private discover(level: BallLevel): void {
    if (!this.state.discovered[level]) {
      this.state.discovered[level] = true;
      saveDiscovered(this.state.discovered);
    }
    if (level > this.state.maxLevelReached) {
      this.state.maxLevelReached = level;
    }
  }

  // ---------- input ----------

  moveCurrentTo(x: number): void {
    if (!this.isAimingLike()) return;
    const r = BALL_CONFIG[this.state.currentLevel].radius;
    this.currentX = clampBallX(x, r, PHYSICS_CONFIG.logicalWidth);
  }

  nudgeCurrent(dx: number): void {
    if (!this.isAimingLike()) return;
    this.moveCurrentTo(this.currentX + dx);
  }

  private isAimingLike(): boolean {
    return (
      this.state.phase === 'PLAYING' ||
      this.state.phase === 'AIMING' ||
      this.state.phase === 'MERGING' ||
      this.state.phase === 'GAME_OVER_COUNTDOWN'
    );
  }

  canDrop(): boolean {
    return (
      (this.state.phase === 'PLAYING' ||
        this.state.phase === 'AIMING' ||
        this.state.phase === 'MERGING' ||
        this.state.phase === 'GAME_OVER_COUNTDOWN') &&
      this.simTime >= this.dropCooldownUntil &&
      this.countdownDropsUsed < GameEngine.COUNTDOWN_MAX_DROPS
    );
  }

  /** Сброс: создаём СРАЗУ динамическое тело в X фантома. */
  drop(): void {
    if (!this.canDrop()) return;
    const level = this.state.currentLevel;
    const r = BALL_CONFIG[level].radius;
    const x = clampBallX(this.currentX, r, PHYSICS_CONFIG.logicalWidth);
    const body = Matter.Bodies.circle(x, 70, r, {
      restitution: PHYSICS_CONFIG.restitution,
      friction: PHYSICS_CONFIG.friction,
      frictionAir: PHYSICS_CONFIG.frictionAir,
      density: PHYSICS_CONFIG.density,
      label: 'ball',
    });
    Matter.Body.setVelocity(body, { x: 0, y: 2 });
    this.registerBall(level, body);
    this.cb.onSpawnDropped(x, 70, level);
    this.dropCooldownUntil = this.simTime + GAME_CONFIG.effects.dropDelayMs;
    // во время отсчёта фазу не меняем — окно спасения продолжается
    if (this.countdownStart === 0) {
      this.state.phase = 'MERGING';
    }
    this.spawnQueueAdvance();
    // анти-эксплойт: за один отсчёт — не больше 2 спас-дропов
    if (this.countdownStart > 0) {
      this.countdownDropsUsed += 1;
      if (this.countdownDropsUsed >= GameEngine.COUNTDOWN_MAX_DROPS) {
        // лимит: окно схлопывается, Game Over при следующей проверке черты
        this.countdownStart = this.simTime - GAME_CONFIG.effects.gameOverCountdownMs;
      }
    }
    this.push();
  }

  // ---------- merge ----------

  private pairKey(a: Matter.Body, b: Matter.Body): string {
    return a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
  }

  /**
   * Сбор кандидатов на слияние из двух источников:
   * 1) активные пары контакта Matter (быстрый путь);
   * 2) близость центров одинаковых уровней — страховка от спящих/застрявших
   * перекрытий, которые детектор Matter 0.20 пропускает (isSleeping-пары
   * исключаются из collision-детекции: подтверждено чтением исходника).
   */
  private collectPairs(): void {
    if (this.state.phase === 'VICTORY' || this.state.phase === 'GAME_OVER') return;
    const pairs = (
      this.engine as unknown as {
        pairs: { list: Array<{ bodyA: Matter.Body; bodyB: Matter.Body; isActive: boolean }> };
      }
    ).pairs.list;
    for (const pair of pairs) {
      if (!pair.isActive) continue;
      const a = pair.bodyA;
      const b = pair.bodyB;
      if (a.label !== 'ball' || b.label !== 'ball') continue;
      const key = this.pairKey(a, b);
      if (this.processedPairKeys.has(key)) continue;
      this.processedPairKeys.add(key);
      this.pendingPairs.push([a, b]);
    }

    // близость: спящие/застрявшие одинаковые тела, которых нет в активных парах
    const factor = GAME_CONFIG.effects.mergeProximityFactor;
    const balls = this.allBalls();
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const ea = balls[i];
        const eb = balls[j];
        if (ea.level !== eb.level || ea.level === 11) continue;
        const ba = this.getBallBody(ea);
        const bb = this.getBallBody(eb);
        if (!ba || !bb) continue;
        const key = this.pairKey(ba, bb);
        if (this.processedPairKeys.has(key)) continue;
        const dx = ba.position.x - bb.position.x;
        const dy = ba.position.y - bb.position.y;
        const dist = Math.hypot(dx, dy);
        const rSum = BALL_CONFIG[ea.level].radius + BALL_CONFIG[eb.level].radius;
        if (dist < rSum * factor) {
          this.processedPairKeys.add(key);
          this.pendingPairs.push([ba, bb]);
        }
      }
    }
  }

  private processMerges(): void {
    if (this.pendingPairs.length === 0) return;
    const pairs = this.pendingPairs
      .slice()
      .sort((p1, p2) => Math.min(p1[0].id, p1[1].id) - Math.min(p2[0].id, p2[1].id));
    this.pendingPairs = [];

    for (const [a, b] of pairs) {
      const ea = this.balls.get(this.bodiesToBall.get(a.id) ?? '');
      const eb = this.balls.get(this.bodiesToBall.get(b.id) ?? '');
      if (!ea || !eb) continue;
      if (ea.level !== eb.level) continue;
      if (ea.level === 11) continue;
      if (this.simTime < ea.canMergeAfter || this.simTime < eb.canMergeAfter) continue;
      if (!this.balls.has(ea.ballId) || !this.balls.has(eb.ballId)) continue;

      this.mergeBodies(ea, eb, a, b);
    }
  }

  private mergeBodies(ea: BallEntity, eb: BallEntity, bodyA: Matter.Body, bodyB: Matter.Body): void {
    const newLevel = (ea.level + 1) as BallLevel;
    const totalMass = bodyA.mass + bodyB.mass;
    const mx = (bodyA.position.x * bodyA.mass + bodyB.position.x * bodyB.mass) / totalMass;
    const my = (bodyA.position.y * bodyA.mass + bodyB.position.y * bodyB.mass) / totalMass;
    const vx = (bodyA.velocity.x * bodyA.mass + bodyB.velocity.x * bodyB.mass) / totalMass;
    const vy = (bodyA.velocity.y * bodyA.mass + bodyB.velocity.y * bodyB.mass) / totalMass;
    const av = (bodyA.angularVelocity + bodyB.angularVelocity) / 2;

    this.removeBall(ea);
    this.removeBall(eb);

    const r = BALL_CONFIG[newLevel].radius;
    const x = clamp(mx, r + 4, PHYSICS_CONFIG.logicalWidth - r - 4);
    const y = Math.min(my, PHYSICS_CONFIG.logicalHeight - r);

    const body = Matter.Bodies.circle(x, y, r, {
      restitution: PHYSICS_CONFIG.restitution,
      friction: PHYSICS_CONFIG.friction,
      frictionAir: PHYSICS_CONFIG.frictionAir,
      density: PHYSICS_CONFIG.density,
      label: 'ball',
    });
    Matter.Body.setVelocity(body, { x: vx, y: vy });
    Matter.Body.setAngularVelocity(body, av);
    this.registerBall(newLevel, body);

    // опоры исчезли — будим всех, чтобы «висячие» соседи упали
    this.wakeAllBalls();

    // score
    const gained = GAME_CONFIG.scoreByResultLevel[newLevel] ?? 0;
    this.state.score += gained;
    this.state.mergesTotal += 1;
    if (this.state.score > this.state.bestScore) {
      this.state.bestScore = this.state.score;
      saveBestScore(this.state.bestScore);
      this.cb.onBestScoreChanged(this.state.bestScore);
    }

    // charge навыков: чем крупнее результат, тем больше внутренних очков
    const charge = GAME_CONFIG.skill.mergeChargeByLevel[newLevel] ?? 0;
    if (charge > 0) {
      const before = this.state.skillPoints;
      const next = applySkillCharge(
        { skillPoints: this.state.skillPoints, skillCharge: this.state.skillCharge },
        charge,
        this.state.maxSkillPoints,
        GAME_CONFIG.skill.pipSize,
      );
      this.state.skillPoints = next.skillPoints;
      this.state.skillCharge = next.skillCharge;
      if (next.skillPoints > before) {
        this.state.skillJustGained = true;
      }
    }

    // бесплатные заряды Обмена: за каждые 6 потраченных очков, не стакаются
    const sc = grantSwapCharges(
      this.state.skillsSpentTotal,
      this.state.swapChargesEarned,
      this.state.swapCharges,
      GAME_CONFIG.skill.swapUnlockAtSpent,
      GAME_CONFIG.skill.swapChargeMax,
    );
    this.state.swapChargesEarned = sc.earnedCount;
    this.state.swapCharges = sc.charges;

    this.cb.onMergeEffect(x, y, newLevel);

    if (newLevel === 11 && !this.victoryTriggered) {
      this.triggerVictory();
    }
    this.push();
  }

  private removeBall(e: BallEntity): void {
    const body = Matter.Composite.allBodies(this.engine.world).find((b) => b.id === e.bodyId);
    if (body) {
      Matter.Composite.remove(this.engine.world, body);
      this.bodiesToBall.delete(body.id);
      this.dangerTimers.delete(body.id);
    }
    this.balls.delete(e.ballId);
  }

  /**
   * Будим все шары: структурные изменения (merge/discard/swap) убирают опоры —
   * спящие «висячие» соседи должны упасть. Без этого Detektor пропускает их
   * пары (isSleeping-тела исключены из collision-детекции Matter 0.20).
   */
  private wakeAllBalls(): void {
    for (const body of Matter.Composite.allBodies(this.engine.world)) {
      if (body.label === 'ball' && !body.isStatic) Matter.Sleeping.set(body, false);
    }
  }

  getBallByBodyId(bodyId: number): BallEntity | undefined {
    const id = this.bodiesToBall.get(bodyId);
    return id ? this.balls.get(id) : undefined;
  }

  getBallById(ballId: string): BallEntity | undefined {
    return this.balls.get(ballId);
  }

  allBalls(): BallEntity[] {
    return Array.from(this.balls.values());
  }

  getBallBody(e: BallEntity): Matter.Body | undefined {
    return Matter.Composite.allBodies(this.engine.world).find((b) => b.id === e.bodyId);
  }

  // ---------- danger line / countdown / game over ----------

  /**
   * Логика черты. Обычная игра: накопительный grace 750 мс, копится только
   * для тел, реально лежащих выше черты (скорость < 0.35); пролетаемые тела
   * и левитация не штрафуются.
   * Отсчёт (3-2-1): запускается, когда тело залипло выше черты; в течение
   * окна физика и мерджи живут — игрок может спасти положение. Окно
   * отменяется, если ВСЕ тела ушли ниже черты. По истечении окна поражение
   * только если какое-то тело всё ещё реально лежит выше черты.
   */
  private checkDanger(dtMs: number): void {
    const phase = this.state.phase;
    if (phase === 'GAME_OVER' || phase === 'VICTORY') return;
    const levitating = this.state.levitationUntil > this.simTime;

    let anyAbove = false;
    const settledIds = new Set<number>();
    for (const e of this.balls.values()) {
      const body = this.getBallBody(e);
      if (!body) continue;
      const r = BALL_CONFIG[e.level].radius;
      if (body.position.y - r < DANGER_LINE_Y) {
        anyAbove = true;
        if (!levitating && body.speed < 0.35) {
          settledIds.add(body.id);
        }
      }
    }

    if (phase === 'GAME_OVER_COUNTDOWN') {
      const elapsed = this.simTime - this.countdownStart;
      if (!anyAbove) {
        // все упали ниже черты — отсчёт отменяется
        this.countdownStart = 0;
        this.countdownDropsUsed = 0;
        this.dangerTimers.clear();
        this.state.phase = 'PLAYING';
        this.push();
        return;
      }
      if (elapsed >= GAME_CONFIG.effects.gameOverCountdownMs) {
        if (settledIds.size > 0) {
          this.gameOver();
        } else {
          // выше черты только пролетающие тела — вернуть обычный grace
          this.countdownStart = 0;
          this.countdownDropsUsed = 0;
          this.state.phase = 'PLAYING';
          this.push();
        }
      }
      return;
    }

    if (anyAbove && !levitating) {
      for (const id of settledIds) {
        const prev = this.dangerTimers.get(id) ?? 0;
        const total = prev + dtMs;
        this.dangerTimers.set(id, total);
        if (total >= GAME_CONFIG.effects.gameOverGraceMs) {
          this.startCountdown();
          return;
        }
      }
      for (const id of Array.from(this.dangerTimers.keys())) {
        if (!settledIds.has(id)) this.dangerTimers.delete(id);
      }
    } else {
      this.dangerTimers.clear();
    }
  }

  private startCountdown(): void {
    this.countdownStart = this.simTime;
    this.countdownDropsUsed = 0;
    this.state.phase = 'GAME_OVER_COUNTDOWN';
    this.state.activeAbility = null;
    this.state.swapFirstBallId = null;
    this.cb.onCountdownStarted();
    this.push();
  }

  private cancelCountdownState(): void {
    this.countdownStart = 0;
    this.countdownDropsUsed = 0;
    this.dangerTimers.clear();
  }

  private gameOver(): void {
    if (this.state.phase === 'GAME_OVER') return;
    this.state.phase = 'GAME_OVER';
    this.cancelCountdownState();
    if (this.state.score > this.state.bestScore) {
      this.state.bestScore = this.state.score;
      saveBestScore(this.state.bestScore);
      this.cb.onBestScoreChanged(this.state.bestScore);
    }
    saveVictories(this.state.victoriesTotal);
    this.cb.onGameOver();
    this.push();
  }

  // ---------- victory ----------

  private triggerVictory(): void {
    this.victoryTriggered = true;
    this.victoryStart = this.simTime;
    this.state.phase = 'VICTORY';
    this.state.score += GAME_CONFIG.victoryBonus;
    this.state.victoriesTotal += 1;
    this.state.maxLevelReached = 11;
    this.state.discovered[11] = true;
    saveDiscovered(this.state.discovered);
    if (this.state.score > this.state.bestScore) {
      this.state.bestScore = this.state.score;
      saveBestScore(this.state.bestScore);
      this.cb.onBestScoreChanged(this.state.bestScore);
    }
    saveVictories(this.state.victoriesTotal);
    this.cb.onVictory();
    this.push();
  }

  private victoryMs(): number {
    return this.simTime - this.victoryStart;
  }

  victoryProgress(): number {
    if (this.state.phase !== 'VICTORY') return 0;
    return clamp(this.victoryMs() / GAME_CONFIG.effects.victoryDurationMs, 0, 1);
  }

  victoryScaleBoost(): number {
    const t = this.victoryMs();
    if (t < 200) return 0;
    if (t > 700) return 0.1;
    return 0.1 * clamp((t - 200) / 500, 0, 1);
  }

  private cleanupField(): void {
    for (const e of Array.from(this.balls.values())) {
      this.removeBall(e);
    }
    this.pendingPairs = [];
    this.processedPairKeys.clear();
    this.dangerTimers.clear();
    this.cancelCountdownState();
    this.levitationWasActive = false;
    this.clearLevitationScales();
  }

  // ---------- abilities ----------

  private spend(cost: number): boolean {
    if (cost <= 0) return true; // бесплатная способность (Обмен)
    if (this.state.skillPoints < cost) return false;
    this.state.skillPoints -= cost;
    this.state.skillsSpentTotal += cost;
    // выдача зарядов Обмена после списания
    const sc = grantSwapCharges(
      this.state.skillsSpentTotal,
      this.state.swapChargesEarned,
      this.state.swapCharges,
      GAME_CONFIG.skill.swapUnlockAtSpent,
      GAME_CONFIG.skill.swapChargeMax,
    );
    this.state.swapChargesEarned = sc.earnedCount;
    this.state.swapCharges = sc.charges;
    return true;
  }

  abilityCost(id: 'discard' | 'levitation' | 'shake' | 'swap'): number {
    return GAME_CONFIG.skill.costs[id];
  }

  canStartAbility(id: 'discard' | 'levitation' | 'shake' | 'swap'): boolean {
    const p = this.state.phase;
    if (p !== 'PLAYING' && p !== 'AIMING' && p !== 'MERGING' && p !== 'GAME_OVER_COUNTDOWN') return false;
    if (this.state.activeAbility) return false;
    if (id === 'swap') {
      return this.state.swapCharges > 0;
    }
    return this.state.skillPoints >= this.abilityCost(id);
  }

  startAbility(id: 'discard' | 'levitation' | 'shake' | 'swap'): boolean {
    if (!this.canStartAbility(id)) return false;
    if (id === 'levitation') {
      if (!this.spend(this.abilityCost(id))) return false;
      this.state.levitationUntil = this.simTime + GAME_CONFIG.effects.levitationDurationMs;
      this.state.phase = 'ABILITY_ACTIVE';
      // гравитация остаётся вниз: подъём делается пер-тельно через gravityScale
      this.push();
      return true;
    }
    if (id === 'shake') {
      if (!this.spend(this.abilityCost(id))) return false;
      this.state.shakeUntil = this.simTime + GAME_CONFIG.effects.shakeDurationMs;
      this.shakeNextTick = this.simTime;
      this.state.phase = 'ABILITY_ACTIVE';
      this.push();
      return true;
    }
    this.state.activeAbility = id;
    this.state.swapFirstBallId = null;
    this.state.phase = 'ABILITY_TARGETING';
    this.push();
    return true;
  }

  cancelAbilityTargeting(): void {
    if (this.state.phase !== 'ABILITY_TARGETING') return;
    this.state.activeAbility = null;
    this.state.swapFirstBallId = null;
    this.state.phase = 'PLAYING';
    this.push();
  }

  /** Списать заряд Обмена (при реально выполненном обмене). */
  private consumeSwapCharge(): void {
    if (this.state.swapCharges > 0) {
      this.state.swapCharges -= 1;
    }
  }

  tapBall(ballId: string): boolean {
    if (this.state.phase !== 'ABILITY_TARGETING' || !this.state.activeAbility) return false;
    const ability = this.state.activeAbility;
    const e = this.balls.get(ballId);
    if (!e) return false;

    if (ability === 'discard') {
      if (!this.spend(this.abilityCost('discard'))) return false;
      const body = this.getBallBody(e);
      if (body) this.cb.onMergeEffect(body.position.x, body.position.y, e.level);
      this.removeBall(e);
      this.wakeAllBalls();
      this.state.activeAbility = null;
      this.state.phase = 'PLAYING';
      this.push();
      return true;
    }

    if (ability === 'swap') {
      if (!this.state.swapFirstBallId) {
        this.state.swapFirstBallId = ballId;
        this.push();
        return true;
      }
      if (this.state.swapFirstBallId === ballId) {
        this.state.swapFirstBallId = null;
        this.push();
        return true;
      }
      const first = this.balls.get(this.state.swapFirstBallId);
      if (!first) {
        this.state.swapFirstBallId = null;
        this.push();
        return true;
      }
      if (!this.spend(this.abilityCost('swap'))) return false;
      this.swapBodies(first, e);
      this.consumeSwapCharge();
      this.state.activeAbility = null;
      this.state.swapFirstBallId = null;
      this.state.phase = 'PLAYING';
      this.push();
      return true;
    }
    return false;
  }

  private swapBodies(ea: BallEntity, eb: BallEntity): void {
    const ba = this.getBallBody(ea);
    const bb = this.getBallBody(eb);
    if (!ba || !bb) return;
    const pa = { ...ba.position };
    const pb = { ...bb.position };
    const angleA = ba.angle;
    const angleB = bb.angle;
    const va = { ...ba.velocity };
    const vb = { ...bb.velocity };
    const avA = ba.angularVelocity;
    const avB = bb.angularVelocity;

    Matter.Body.setPosition(ba, pb);
    Matter.Body.setAngle(ba, angleB);
    Matter.Body.setVelocity(ba, vb);
    Matter.Body.setAngularVelocity(ba, avB);

    Matter.Body.setPosition(bb, pa);
    Matter.Body.setAngle(bb, angleA);
    Matter.Body.setVelocity(bb, va);
    Matter.Body.setAngularVelocity(bb, avA);

    // будим всех: спящая пара не детектится Matter (застревание без слияния),
    // а соседи убранной опоры должны упасть
    this.wakeAllBalls();
    // слияние сразу после обмена: без ожидания mergeCooldown
    ea.canMergeAfter = this.simTime;
    eb.canMergeAfter = this.simTime;
    // мягкий развод при полном перекрытии: раздвигаем по линии центров,
    // Matter сам разрешит остаток пересечения
    const overlap = BALL_CONFIG[ea.level].radius + BALL_CONFIG[eb.level].radius;
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    const dist = Math.hypot(dx, dy);
    if (dist < overlap) {
      const push = (overlap - dist) / 2 + 1;
      const nx = dist > 0.001 ? dx / dist : 1;
      const ny = dist > 0.001 ? dy / dist : 0;
      Matter.Body.translate(ba, { x: nx * push, y: ny * push });
      Matter.Body.translate(bb, { x: -nx * push, y: -ny * push });
    }
  }

  // ---------- lifecycle ----------

  startNewGame(): void {
    this.cleanupField();
    this.state.score = 0;
    this.state.mergesTotal = 0;
    this.state.maxLevelReached = 0;
    this.state.skillPoints = GAME_CONFIG.skill.startPoints;
    this.state.skillCharge = 0;
    this.state.skillsSpentTotal = 0;
    this.state.roundIndex += 1;
    this.state.activeAbility = null;
    this.state.swapFirstBallId = null;
    this.state.levitationUntil = 0;
    this.state.shakeUntil = 0;
    this.state.skillJustGained = false;
    this.state.swapCharges = 0;
    this.state.swapChargesEarned = 0;
    this.levitationWasActive = false;
    this.clearLevitationScales();
    this.victoryTriggered = false;
    this.simTime = 0;
    this.accumulator = 0;
    this.dropCooldownUntil = 0;
    this.state.currentLevel = this.rollLevel();
    this.state.nextLevel = this.rollLevel();
    this.state.phase = 'PLAYING';
    this.currentX = PHYSICS_CONFIG.logicalWidth / 2;
    this.push();
  }

  pause(): void {
    const p = this.state.phase;
    if (
      p === 'PLAYING' || p === 'AIMING' || p === 'ABILITY_TARGETING' ||
      p === 'ABILITY_ACTIVE' || p === 'MERGING' || p === 'GAME_OVER_COUNTDOWN'
    ) {
      this.state.phaseBeforePause = p;
      this.state.phase = 'PAUSED';
      this.push();
    }
  }

  resume(): void {
    if (this.state.phase !== 'PAUSED') return;
    this.state.phase = this.state.phaseBeforePause ?? 'PLAYING';
    this.state.phaseBeforePause = undefined;
    this.accumulator = 0;
    this.push();
  }

  toMenu(): void {
    this.cleanupField();
    this.state.phase = 'MENU';
    this.state.activeAbility = null;
    this.push();
  }

  isRunning(): boolean {
    return true;
  }

  /**
   * Фиксированный шаг симуляции. В PAUSED/MENU/GAME_OVER физика стоит,
   * но отсчёт таймеров рендера (victory/countdown) идёт только в живых фазах.
   */
  update(dtMs: number): void {
    if (
      this.state.phase === 'PAUSED' ||
      this.state.phase === 'MENU' ||
      this.state.phase === 'GAME_OVER'
    ) {
      return;
    }

    if (this.state.phase === 'VICTORY') {
      this.simTime += dtMs;
      const elapsed = this.simTime - this.victoryStart;
      if (elapsed >= 1450 && this.balls.size > 0) {
        // 1450–1700 мс: очистить все dynamic bodies, стены сохранить
        for (const e of Array.from(this.balls.values())) this.removeBall(e);
        this.pendingPairs = [];
      }
      if (elapsed >= GAME_CONFIG.effects.victoryDurationMs) {
        this.state.phase = 'PLAYING';
        this.state.currentLevel = this.rollLevel();
        this.state.nextLevel = this.rollLevel();
        this.victoryTriggered = false;
        this.dropCooldownUntil = this.simTime + GAME_CONFIG.effects.dropDelayMs;
        this.currentX = PHYSICS_CONFIG.logicalWidth / 2;
        this.push();
      }
      return;
    }

    this.accumulator += Math.min(dtMs, 100);
    this.processedPairKeys.clear(); // Set «на кадр»
    while (this.accumulator >= this.fixedStepMs) {
      this.accumulator -= this.fixedStepMs;
      this.simTime += this.fixedStepMs;
      this.simulateStep(this.fixedStepMs);
    }

    this.collectPairs();
    this.processMerges();
    this.checkDanger(dtMs);
    this.checkMergingPhase();
  }

  /** MERGING — краткая фаза кулдауна после дропа; возвращаем PLAYING по истечении. */
  private checkMergingPhase(): void {
    if (this.state.phase === 'MERGING' && this.simTime >= this.dropCooldownUntil) {
      this.state.phase = 'PLAYING';
      this.push();
    }
  }

  private simulateStep(stepMs: number): void {
    const levitationNow = this.state.levitationUntil > this.simTime;

    // levitation: старт/конец, будим тела, чтобы смена гравитации их взяла
    if (levitationNow && !this.levitationWasActive) {
      this.levitationWasActive = true;
      for (const body of Matter.Composite.allBodies(this.engine.world)) {
        if (body.label === 'ball' && !body.isStatic) {
          Matter.Sleeping.set(body, false);
        }
      }
    }
    if (!levitationNow && this.levitationWasActive) {
      this.levitationWasActive = false;
      this.state.levitationUntil = 0;
      this.clearLevitationScales();
      if (this.state.phase === 'ABILITY_ACTIVE' && this.state.shakeUntil === 0) {
        this.state.phase = 'PLAYING';
        this.push();
      }
    }

    // пер-тельный подъём: только тела НИЖЕ черты тянет вверх к ней (не пересекая)
    if (levitationNow) {
      this.applyLevitationScales();
    }

    // shake
    if (this.state.shakeUntil > this.simTime) {
      if (this.simTime >= this.shakeNextTick) {
        this.shakeNextTick = this.simTime + GAME_CONFIG.effects.shakeTickMs;
        this.applyShakeImpulse();
      }
    } else if (this.state.shakeUntil > 0 && this.simTime >= this.state.shakeUntil) {
      this.state.shakeUntil = 0;
      if (this.state.phase === 'ABILITY_ACTIVE' && this.state.levitationUntil === 0) {
        this.state.phase = 'PLAYING';
      }
      this.push();
    }

    Matter.Engine.update(this.engine, stepMs);

    for (const e of this.balls.values()) {
      const body = this.getBallBody(e);
      if (!body || body.isStatic) continue;
      // лимит скорости
      const v = body.velocity;
      const sp = Math.hypot(v.x, v.y);
      if (sp > PHYSICS_CONFIG.maxSpeed) {
        const k = PHYSICS_CONFIG.maxSpeed / sp;
        Matter.Body.setVelocity(body, { x: v.x * k, y: v.y * k });
      }
      // страховка границ: тело не должно жить за стенками (туннелирование
      // при встряске/слияниях) — возвращаем внутрь и гасим нормальную скорость
      const r = BALL_CONFIG[e.level].radius;
      const minX = r + 2;
      const maxX = PHYSICS_CONFIG.logicalWidth - r - 2;
      const minY = r + 1;
      const maxY = PHYSICS_CONFIG.logicalHeight - r - 2;
      let px = body.position.x;
      let py = body.position.y;
      let vx = body.velocity.x;
      let vy = body.velocity.y;
      let clamped = false;
      if (px < minX) { px = minX; vx = Math.abs(vx) * 0.3; clamped = true; }
      else if (px > maxX) { px = maxX; vx = -Math.abs(vx) * 0.3; clamped = true; }
      if (py < minY) { py = minY; vy = Math.abs(vy) * 0.3; clamped = true; }
      else if (py > maxY) { py = maxY; vy = -Math.abs(vy) * 0.3; clamped = true; }
      if (clamped) {
        Matter.Body.setPosition(body, { x: px, y: py });
        Matter.Body.setVelocity(body, { x: vx, y: vy });
      }
    }
  }

  /** Была ли левитация активна на прошлом шаге (для будки/очистки). */
  private levitationWasActive = false;

  /**
   * Подъём к черте (силовой, Matter 0.20 игнорирует body.gravityScale —
   * проверено чтением Engine._bodiesApplyGravity):
   * — тело уже выше черты: не помогаем, гасим взлёт;
   * — тело в полосе зависания под чертой: гасим вертикальную скорость;
   * — тело ниже: прикладываем восстанавливающую силу вверх (масс-зависимую).
   */
  private applyLevitationScales(): void {
    for (const e of this.balls.values()) {
      const body = this.getBallBody(e);
      if (!body || body.isStatic) continue;
      const r = BALL_CONFIG[e.level].radius;
      const top = body.position.y - r;
      if (top <= DANGER_LINE_Y) {
        if (body.velocity.y < 0) {
          Matter.Body.setVelocity(body, { x: body.velocity.x, y: 0 });
        }
      } else if (top <= DANGER_LINE_Y + LEVIT_HOVER_BAND) {
        if (body.velocity.y < 0) {
          Matter.Body.setVelocity(body, { x: body.velocity.x * 0.9, y: 0 });
        }
      } else {
        // сила вверх ПОВЕРХ гравитации (гравитация добавится внутри Engine.update):
        // F = m*g*(1+k) → чистое ускорение вверх k*g
        const gForce = body.mass * PHYSICS_CONFIG.gravityY * 0.001;
        Matter.Body.applyForce(body, body.position, { x: 0, y: -gForce * (1 + LEVIT_LIFT_SCALE) });
        if (body.velocity.y < -LEVIT_MAX_VY) {
          Matter.Body.setVelocity(body, { x: body.velocity.x, y: -LEVIT_MAX_VY });
        }
      }
    }
  }

  private clearLevitationScales(): void {
    // силовой подход не оставляет постоянных модификаторов — сбрасывать нечего,
    // но будим тела, чтобы они сразу отреагировали на возврат гравитации вниз
    for (const body of Matter.Composite.allBodies(this.engine.world)) {
      if (body.label === 'ball' && !body.isStatic) {
        Matter.Sleeping.set(body, false);
      }
    }
  }

  private applyShakeImpulse(): void {
    for (const e of this.balls.values()) {
      const body = this.getBallBody(e);
      if (!body || body.isStatic) continue;
      // будим тела: спящие не получают сил и не попадают в пары
      Matter.Sleeping.set(body, false);
      const dir = this.rng() > 0.5 ? 1 : -1;
      const fx = dir * GAME_CONFIG.effects.shakeImpulseX * body.mass;
      const fy = -GAME_CONFIG.effects.shakeImpulseY * body.mass;
      Matter.Body.applyForce(body, body.position, { x: fx, y: fy });
    }
  }
}
