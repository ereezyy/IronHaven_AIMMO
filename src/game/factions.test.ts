import { describe, it, expect } from 'vitest';
import {
  isHostileFaction,
  zoneAt,
  FACTIONS,
  emptyStanding,
} from './factions';
import { zoneAt as combatZoneAt, allowsPvp } from './zones';
import { rollFish, FISH_SPOTS, emptyFishBag, sellAllFish } from './fishing';
import { createBossRuntime, damageBoss } from './bosses';
import { WORLD_BOSSES } from './bosses';

describe('factions', () => {
  it('has three joinable factions plus null', () => {
    expect(FACTIONS.length).toBe(4);
  });

  it('marks syndicate vs guard as hostile', () => {
    expect(isHostileFaction('neon_syndicate', 'chrome_guard')).toBe(true);
    expect(isHostileFaction('neon_syndicate', 'neon_syndicate')).toBe(false);
  });

  it('detects faction zones', () => {
    const z = zoneAt(40, -30);
    expect(z?.factionId).toBe('neon_syndicate');
  });
});

describe('combat zones', () => {
  it('spawn is safe', () => {
    expect(combatZoneAt(0, 0).kind).toBe('safe');
    expect(allowsPvp(combatZoneAt(0, 0), true)).toBe(false);
  });

  it('blood grid is always pvp', () => {
    const z = combatZoneAt(-45, -20);
    expect(z.kind).toBe('pvp');
    expect(allowsPvp(z, false)).toBe(true);
  });
});

describe('fishing', () => {
  it('rolls a fish at a spot', () => {
    const f = rollFish(FISH_SPOTS[0], () => 0.1);
    expect(f.name.length).toBeGreaterThan(0);
  });

  it('sells fish for money', () => {
    const bag = emptyFishBag();
    bag.neon_minnow = 2;
    const { money } = sellAllFish(bag);
    expect(money).toBe(50);
  });
});

describe('bosses', () => {
  it('dies and emits kill event', () => {
    const b = createBossRuntime(WORLD_BOSSES[0]);
    const events: { kind: string }[] = [];
    damageBoss(b, 99999, Date.now(), events as any);
    expect(b.mood).toBe('dead');
    expect(events.some((e) => e.kind === 'boss_kill')).toBe(true);
  });
});
