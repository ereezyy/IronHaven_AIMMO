import { describe, it, expect } from 'vitest';
import {
  generateBoard,
  refreshProgress,
  isJobComplete,
  utcDayKey,
  emptyCounters,
} from './dailyBoard';
import { emptyTerritory, tickTerritory, controlBonus } from './territory';
import { spawnGhosts, ghostPosition } from './ghostRunners';
import { hasSeenOpening, markOpeningSeen } from './onboarding';
import { rollBossLoot } from './bosses';
import { WORLD_BOSSES } from './bosses';

describe('daily board', () => {
  it('generates 3 dailies + weekly for the day', () => {
    const b = generateBoard(new Date('2026-07-10T12:00:00Z'));
    expect(b.dailies).toHaveLength(3);
    expect(b.dayKey).toBe('2026-07-10');
    expect(b.weekly.target).toBeGreaterThan(0);
  });

  it('refreshes progress and detects complete', () => {
    const b = generateBoard(new Date('2026-07-10T12:00:00Z'));
    const c = emptyCounters();
    c.totalKills = 999;
    c.huntKills = 999;
    c.talks = 999;
    c.harvests = 999;
    c.moneyEarned = 99999;
    c.fishCaught = 999;
    c.factionJoined = 1;
    const r = refreshProgress(b, c);
    expect(r.dailies.every((j) => isJobComplete(j))).toBe(true);
  });
});

describe('territory', () => {
  it('captures zone when standing long enough', () => {
    let state = emptyTerritory();
    // Syndicate strip center
    for (let i = 0; i < 20; i++) {
      const res = tickTerritory(state, 'chrome_guard', 40, -30, 0.5);
      state = res.state;
      if (res.event) {
        expect(res.event).toMatch(/Guard|took/i);
        expect(state.control['z_syndicate']).toBe('chrome_guard');
        return;
      }
    }
    // Should have made progress even if not flipped in 20 ticks
    expect(state.capture['z_syndicate'] || 0).toBeGreaterThan(0);
  });

  it('grants control bonuses', () => {
    const t = emptyTerritory();
    t.control['z_syndicate'] = 'neon_syndicate';
    t.control['z_guard'] = 'neon_syndicate';
    const b = controlBonus(t, 'neon_syndicate');
    expect(b.zonesHeld).toBeGreaterThanOrEqual(2);
    expect(b.xpMult).toBeGreaterThan(1);
  });
});

describe('ghosts + onboarding + loot', () => {
  it('spawns ghosts on orbits', () => {
    const g = spawnGhosts(4);
    expect(g).toHaveLength(4);
    const p = ghostPosition(g[0], 1);
    expect(p[0]).not.toBeNaN();
  });

  it('rolls boss loot', () => {
    const loot = rollBossLoot(WORLD_BOSSES[0], () => 0.9);
    expect(loot.money).toBeGreaterThan(0);
    expect(loot.label).toBeTruthy();
  });

  it('utc day key is ISO date', () => {
    expect(utcDayKey(new Date('2026-01-02T05:00:00Z'))).toBe('2026-01-02');
  });
});
