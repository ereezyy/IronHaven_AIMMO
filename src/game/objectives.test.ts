import { describe, it, expect } from 'vitest';
import {
  buildStreetObjectives,
  streetLevel,
  streetExperience,
  scaleDamage,
  attackCooldownMs,
  type ObjectiveSnapshot,
} from './objectives';

const snap = (over: Partial<ObjectiveSnapshot> = {}): ObjectiveSnapshot => ({
  talked: false,
  kills: 0,
  money: 1000,
  reputation: 0,
  hasWeapon: false,
  combatSkill: 10,
  ...over,
});

describe('buildStreetObjectives', () => {
  it('starts with tutorial steps incomplete', () => {
    const list = buildStreetObjectives(snap());
    expect(list.every((o) => !o.done)).toBe(true);
    expect(list[0].id).toBe('talk');
  });

  it('marks talk, kill, and arm when conditions met', () => {
    const list = buildStreetObjectives(
      snap({ talked: true, kills: 2, hasWeapon: true })
    );
    expect(list.find((o) => o.id === 'talk')?.done).toBe(true);
    expect(list.find((o) => o.id === 'kill')?.done).toBe(true);
    expect(list.find((o) => o.id === 'arm')?.done).toBe(true);
    expect(list.find((o) => o.id === 'cash')?.done).toBe(false);
  });

  it('caps progress counters in labels', () => {
    const list = buildStreetObjectives(snap({ kills: 99, money: 99999 }));
    expect(list.find((o) => o.id === 'kill')?.label).toContain('1/1');
    expect(list.find((o) => o.id === 'cash')?.label).toContain('2500/2500');
  });
});

describe('streetLevel / experience (XP-backed)', () => {
  it('starts at level 1 with empty xp bar', () => {
    expect(streetLevel(0)).toBe(1);
    const xp0 = streetExperience(0);
    expect(xp0.experience).toBe(0);
    expect(xp0.maxExperience).toBeGreaterThan(0);
  });

  it('levels up after enough total XP', () => {
    // 100 XP completes level 1 → level 2
    expect(streetLevel(100)).toBe(2);
    const mid = streetExperience(50);
    expect(mid.experience).toBe(50);
    expect(mid.maxExperience).toBe(100);
  });
});

describe('scaleDamage', () => {
  it('scales with combat skill above baseline', () => {
    const base = 14;
    const at10 = scaleDamage(base, 10);
    const at50 = scaleDamage(base, 50);
    expect(at10).toBe(Math.round(base * (0.8 + 10 / 50)));
    expect(at50).toBeGreaterThan(at10);
  });

  it('never returns zero', () => {
    expect(scaleDamage(1, 10)).toBeGreaterThanOrEqual(1);
  });
});

describe('attackCooldownMs', () => {
  it('inverts fire rate into milliseconds', () => {
    expect(attackCooldownMs(2)).toBe(500);
    expect(attackCooldownMs(4)).toBe(250);
  });

  it('clamps very low fire rates', () => {
    expect(attackCooldownMs(0)).toBe(Math.round(1000 / 0.4));
  });
});
