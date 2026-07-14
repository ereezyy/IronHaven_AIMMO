import { describe, it, expect } from 'vitest';
import {
  emptyRanks,
  canRankUp,
  computeModifiers,
  unlockedActives,
  skillPointsOnLevel,
  applyCrit,
  SKILL_NODES,
} from './skills';

describe('skills', () => {
  it('has nodes across four trees', () => {
    const trees = new Set(SKILL_NODES.map((n) => n.tree));
    expect(trees.size).toBe(4);
  });

  it('blocks ranking without points or prereqs', () => {
    const ranks = emptyRanks();
    expect(canRankUp(ranks, 'c_precision', 5, 10).ok).toBe(false);
    ranks.c_brutality = 1;
    expect(canRankUp(ranks, 'c_precision', 0, 10).ok).toBe(false);
    expect(canRankUp(ranks, 'c_precision', 1, 10).ok).toBe(true);
  });

  it('stacks passives from ranks', () => {
    const ranks = emptyRanks();
    ranks.c_brutality = 3;
    ranks.f_scholar = 2;
    const m = computeModifiers(ranks);
    expect(m.damage).toBeCloseTo(1 + 0.04 * 3);
    expect(m.xpBonus).toBeCloseTo(1 + 0.05 * 2);
  });

  it('unlocks actives at rank 1', () => {
    const ranks = emptyRanks();
    ranks.c_brutality = 1;
    ranks.c_adrenaline = 1;
    expect(unlockedActives(ranks)).toContain('adrenaline');
  });

  it('grants bonus SP every 5 levels', () => {
    expect(skillPointsOnLevel(4, 5)).toBe(2); // level 5: 1 + bonus
    expect(skillPointsOnLevel(1, 2)).toBe(1);
  });

  it('can crit', () => {
    const m = computeModifiers(emptyRanks());
    m.critChance = 1;
    m.critMult = 2;
    const r = applyCrit(100, m, () => 0);
    expect(r.crit).toBe(true);
    expect(r.damage).toBe(200);
  });
});
