import { describe, it, expect } from 'vitest';
import {
  xpToNextLevel,
  levelFromXp,
  totalXpForLevel,
  scaledXp,
  maxHealthForLevel,
} from './progression';
import { createPreyHerdSeeded, damagePrey, PREY } from './hunting';

describe('progression', () => {
  it('needs more XP each level', () => {
    expect(xpToNextLevel(2)).toBeGreaterThan(xpToNextLevel(1));
    expect(xpToNextLevel(10)).toBeGreaterThan(xpToNextLevel(5));
  });

  it('levelFromXp matches cumulative table', () => {
    const need = totalXpForLevel(5);
    const info = levelFromXp(need);
    expect(info.level).toBe(5);
    expect(info.xpIntoLevel).toBe(0);
  });

  it('partial XP fills the bar', () => {
    const at3 = totalXpForLevel(3);
    const info = levelFromXp(at3 + 10);
    expect(info.level).toBe(3);
    expect(info.xpIntoLevel).toBe(10);
    expect(info.progress).toBeGreaterThan(0);
  });

  it('scales trash XP down for high levels', () => {
    const low = scaledXp('hunt', 5);
    const high = scaledXp('hunt', 30);
    expect(high).toBeLessThanOrEqual(low);
    expect(scaledXp('boss', 30)).toBe(scaledXp('boss', 5));
  });

  it('grows max health with level', () => {
    expect(maxHealthForLevel(5)).toBeGreaterThan(maxHealthForLevel(1));
  });
});

describe('hunting', () => {
  it('spawns a herd', () => {
    const herd = createPreyHerdSeeded(10);
    expect(herd).toHaveLength(10);
    expect(PREY[herd[0].defId]).toBeDefined();
  });

  it('kills prey and yields xp', () => {
    const herd = createPreyHerdSeeded(1);
    const p = herd[0];
    const events: { kind: string; xp?: number }[] = [];
    damagePrey(p, 9999, Date.now(), events as any);
    expect(p.mood).toBe('dead');
    expect(events[0]?.kind).toBe('prey_kill');
    expect((events[0] as any).xp).toBeGreaterThan(0);
  });
});
