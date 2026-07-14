import { describe, it, expect } from 'vitest';
import {
  defaultBuild,
  resolveSkills,
  bonusSpent,
  BONUS_POOL,
  ARCHETYPES,
} from './character';

describe('character build', () => {
  it('resolves enforcer with higher combat', () => {
    const b = defaultBuild('Test');
    b.archetype = 'enforcer';
    const skills = resolveSkills(b);
    const runner = resolveSkills({ ...b, archetype: 'runner' });
    expect(skills.combat).toBeGreaterThan(runner.combat);
  });

  it('tracks bonus pool spend', () => {
    const b = defaultBuild('X');
    b.bonuses.combat = 3;
    b.bonuses.stealth = 2;
    expect(bonusSpent(b)).toBe(5);
    expect(bonusSpent(b)).toBeLessThanOrEqual(BONUS_POOL);
  });

  it('has four archetypes', () => {
    expect(ARCHETYPES).toHaveLength(4);
  });
});
