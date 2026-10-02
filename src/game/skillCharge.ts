/**
 * Чистая экономика заряда навыков: шкала из maxPoints делений,
 * каждое деление — pipSize внутренних очков.
 * Излишек сверх полного бара не копится бесконечно (банк до pipSize).
 */
export interface ChargeState {
  skillPoints: number;
  skillCharge: number;
}

export function applySkillCharge(
  s: ChargeState,
  points: number,
  maxPoints: number,
  pipSize: number,
): ChargeState {
  let { skillPoints, skillCharge } = s;
  if (skillPoints >= maxPoints) {
    // бар полон: банк не выше одного деления, чтобы не дарить мгновенный рефилл
    skillCharge = Math.min(skillCharge + points, pipSize);
    return { skillPoints, skillCharge };
  }
  skillCharge += points;
  while (skillCharge >= pipSize && skillPoints < maxPoints) {
    skillCharge -= pipSize;
    skillPoints += 1;
  }
  if (skillPoints >= maxPoints) {
    skillCharge = Math.min(skillCharge, pipSize);
  }
  return { skillPoints, skillCharge };
}

/** Сколько внутреннего заряда нужно до следующего деления. */
export function chargeToNextPip(skillCharge: number, pipSize: number): number {
  return Math.max(0, pipSize - skillCharge);
}

/**
 * Заполнение одного деления шкалы (0..1): целые очки — полные,
 * текущее деление — по внутреннему заряду, остальные — пустые.
 */
export function pipFillFraction(
  index: number,
  skillPoints: number,
  charge: number,
  pipSize: number,
): number {
  if (index < skillPoints) return 1;
  if (index === skillPoints) return Math.max(0, Math.min(1, charge / pipSize));
  return 0;
}

/**
 * Бесплатные заряды Обмена: за каждые `threshold` потраченных очков навыков
 * даётся заряд, но НЕ БОЛЬШЕ `cap` одновременно (не стакается).
 */
export function grantSwapCharges(
  skillsSpentTotal: number,
  earnedCount: number,
  charges: number,
  threshold: number,
  cap: number,
): { earnedCount: number; charges: number } {
  const earned = Math.floor(skillsSpentTotal / threshold);
  if (earned > earnedCount) {
    return {
      earnedCount: earned,
      charges: Math.min(cap, charges + (earned - earnedCount)),
    };
  }
  return { earnedCount, charges };
}
