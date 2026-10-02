export interface PhysicsConfig {
  gravityY: number;
  gravityX: number;
  restitution: number;
  friction: number;
  frictionAir: number;
  density: number;
  positionIterations: number;
  velocityIterations: number;
  constraintIterations: number;
  enableSleeping: boolean;
  wallThickness: number;
  /** логическая ширина поля между внутренними гранями стен */
  logicalWidth: number;
  /** логическая высота поля */
  logicalHeight: number;
  /** предел линейной скорости, защита от «выстрелов» */
  maxSpeed: number;
}

/** Стартовые значения из ТЗ, всё конфигурируемо. */
export const PHYSICS_CONFIG: PhysicsConfig = {
  gravityY: 1.0,
  gravityX: 0,
  restitution: 0.08,
  friction: 0.45,
  frictionAir: 0.01,
  density: 0.0015,
  positionIterations: 6,
  velocityIterations: 4,
  constraintIterations: 2,
  enableSleeping: true,
  wallThickness: 28,
  logicalWidth: 500,
  logicalHeight: 660,
  maxSpeed: 28,
};
