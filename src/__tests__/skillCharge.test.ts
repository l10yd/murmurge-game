import { describe, it, expect } from 'vitest';
import {
  applySkillCharge,
  chargeToNextPip,
  grantSwapCharges,
  pipFillFraction,
  type ChargeState,
} from '../game/skillCharge';
import { GAME_CONFIG } from '../game/config/balanceConfig';

describe('skill charge economy (3 pips × 100, замедленная)', () => {
  const MAX = GAME_CONFIG.skill.maxPoints; // 3
  const PIP = GAME_CONFIG.skill.pipSize; // 100

  it('маленький заряд не даёт деление', () => {
    const r = applySkillCharge({ skillPoints: 0, skillCharge: 0 }, 4, MAX, PIP);
    expect(r.skillPoints).toBe(0);
    expect(r.skillCharge).toBe(4);
  });

  it('100 очков = ровно одно деление', () => {
    const r = applySkillCharge({ skillPoints: 0, skillCharge: 0 }, 100, MAX, PIP);
    expect(r.skillPoints).toBe(1);
    expect(r.skillCharge).toBe(0);
  });

  it('накопление через границу деления сохраняет излишек', () => {
    let s: ChargeState = { skillPoints: 0, skillCharge: 0 };
    s = applySkillCharge(s, 60, MAX, PIP);
    s = applySkillCharge(s, 60, MAX, PIP);
    expect(s.skillPoints).toBe(1);
    expect(s.skillCharge).toBe(20);
  });

  it('бар не переполняется выше max: излишек остаётся в текущем делении', () => {
    let s: ChargeState = { skillPoints: 2, skillCharge: 90 };
    s = applySkillCharge(s, 66, MAX, PIP); // L11-мердж при почти полном баре: 156 → 1 деление + 56
    expect(s.skillPoints).toBe(3);
    expect(s.skillCharge).toBe(56);
  });

  it('при полном баре мердж не теряется, но и не переполняет', () => {
    let s: ChargeState = { skillPoints: MAX, skillCharge: 30 };
    s = applySkillCharge(s, 10, MAX, PIP);
    expect(s.skillPoints).toBe(MAX);
    expect(s.skillCharge).toBe(40);
  });

  it('таблица заряда монотонна и покрывает 2–11', () => {
    const t = GAME_CONFIG.skill.mergeChargeByLevel;
    for (let lv = 2; lv <= 11; lv++) {
      expect(t[lv]).toBeGreaterThan(0);
      if (lv > 2) expect(t[lv]).toBeGreaterThan(t[lv - 1]);
    }
  });

  it('первое деление теперь требует ~15 ранних мерджей (L3=7)', () => {
    let s: ChargeState = { skillPoints: 0, skillCharge: 0 };
    let merges = 0;
    while (s.skillPoints < 1) {
      s = applySkillCharge(s, GAME_CONFIG.skill.mergeChargeByLevel[3], MAX, PIP);
      merges++;
      expect(merges).toBeLessThan(30);
    }
    expect(merges).toBe(15); // ceil(100/7)
  });

  it('крупный мердж L11 (66) не даёт даже одного деления — шкала медленная', () => {
    const r = applySkillCharge({ skillPoints: 0, skillCharge: 0 }, GAME_CONFIG.skill.mergeChargeByLevel[11], MAX, PIP);
    expect(r.skillPoints).toBe(0);
    expect(r.skillCharge).toBe(66);
  });

  it('chargeToNextPip считает остаток до деления', () => {
    expect(chargeToNextPip(0, PIP)).toBe(PIP);
    expect(chargeToNextPip(37, PIP)).toBe(63);
    expect(chargeToNextPip(120, PIP)).toBe(0);
  });

  it('pipFillFraction: целые деления полные, текущее — по заряду, хвост пустой', () => {
    expect(pipFillFraction(0, 1, 40, 100)).toBe(1);
    expect(pipFillFraction(1, 1, 40, 100)).toBeCloseTo(0.4);
    expect(pipFillFraction(2, 1, 40, 100)).toBe(0);
    expect(pipFillFraction(0, 0, 7, 100)).toBeCloseTo(0.07);
    expect(pipFillFraction(0, 3, 100, 100)).toBe(1);
    // нулевой заряд не должен подсвечивать пустое деление
    expect(pipFillFraction(1, 1, 0, 100)).toBe(0);
  });
});

describe('swap charges (бесплатный Обмен за каждые 6 потраченных)', () => {
  const TH = GAME_CONFIG.skill.swapUnlockAtSpent; // 6
  const CAP = GAME_CONFIG.skill.swapChargeMax; // 1

  it('первый заряд ровно на 6 потраченных', () => {
    const r = grantSwapCharges(6, 0, 0, TH, CAP);
    expect(r.charges).toBe(1);
    expect(r.earnedCount).toBe(1);
  });

  it('до 6 потраченных заряда нет', () => {
    const r = grantSwapCharges(5, 0, 0, TH, CAP);
    expect(r.charges).toBe(0);
  });

  it('заряды не стакаются: второй порог при неиспользованном заряде = всё ещё 1', () => {
    const first = grantSwapCharges(6, 0, 0, TH, CAP);
    const second = grantSwapCharges(12, first.earnedCount, first.charges, TH, CAP);
    expect(second.charges).toBe(1); // кап
    expect(second.earnedCount).toBe(2);
  });

  it('после использования заряда следующий порог снова даёт 1', () => {
    // потратили 6 → заряд 1 → использовали (0) → потратили ещё 6 (итого 12)
    const first = grantSwapCharges(6, 0, 0, TH, CAP);
    const afterUse = grantSwapCharges(6, first.earnedCount, 0, TH, CAP); // заряд потрачен
    expect(afterUse.charges).toBe(0);
    const next = grantSwapCharges(12, afterUse.earnedCount, afterUse.charges, TH, CAP);
    expect(next.charges).toBe(1);
  });

  it('Обмен бесплатен по стоимости', () => {
    expect(GAME_CONFIG.skill.costs.swap).toBe(0);
  });
});
