import { describe, it, expect } from 'vitest';
import {
  seasonKey,
  seedRivals,
  rankByCategory,
  categoryValue,
  playerRank,
  mergeBest,
  emptyPlayerScore,
  buildBoard,
  LEADERBOARD_CATEGORIES,
  type LeaderboardScore,
} from './leaderboard';

describe('leaderboard season key', () => {
  it('is stable within a week and ISO-formatted', () => {
    // Tue and Thu of the same ISO week cannot straddle a week boundary.
    const a = seasonKey(new Date('2026-07-07T00:00:00Z'));
    const b = seasonKey(new Date('2026-07-09T23:59:00Z'));
    expect(a).toBe(b);
    expect(a).toMatch(/^S-\d{4}-W\d{2}$/);
  });

  it('rolls to a new key ~7 days later', () => {
    const wk = seasonKey(new Date('2026-07-08T12:00:00Z'));
    const next = seasonKey(new Date('2026-07-16T12:00:00Z'));
    expect(wk).not.toBe(next);
  });
});

describe('rival seeding', () => {
  it('is deterministic for a season key', () => {
    const key = seasonKey(new Date('2026-07-08T12:00:00Z'));
    const first = seedRivals(key, 12);
    const second = seedRivals(key, 12);
    expect(first).toHaveLength(12);
    expect(second).toEqual(first);
  });

  it('rerolls across seasons', () => {
    const a = seedRivals('S-2026-W28', 8);
    const b = seedRivals('S-2026-W29', 8);
    expect(a).not.toEqual(b);
  });

  it('produces non-negative stats', () => {
    for (const r of seedRivals('S-2026-W28', 12)) {
      expect(r.pvpKills).toBeGreaterThanOrEqual(0);
      expect(r.wealth).toBeGreaterThanOrEqual(0);
      expect(r.xp).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('ranking', () => {
  const scores: LeaderboardScore[] = [
    {
      id: 'a',
      name: 'Alpha',
      factionId: 'dock_rats',
      pvpKills: 3,
      bossKills: 1,
      huntKills: 2,
      wealth: 100,
      xp: 50,
    },
    {
      id: 'b',
      name: 'Bravo',
      factionId: 'chrome_guard',
      pvpKills: 9,
      bossKills: 0,
      huntKills: 4,
      wealth: 300,
      xp: 20,
    },
    {
      id: 'c',
      name: 'Charlie',
      factionId: 'neon_syndicate',
      pvpKills: 9,
      bossKills: 5,
      huntKills: 1,
      wealth: 50,
      xp: 80,
      isPlayer: true,
    },
  ];

  it('sorts descending by category value', () => {
    const rows = rankByCategory(scores, 'pvpKills');
    expect(rows[0].value).toBe(9);
    expect(rows[rows.length - 1].value).toBe(3);
    expect(rows[0].rank).toBe(1);
  });

  it('breaks ties by name for stability', () => {
    const rows = rankByCategory(scores, 'pvpKills');
    // Bravo and Charlie both 9; Bravo < Charlie alphabetically → rank 1
    expect(rows[0].name).toBe('Bravo');
    expect(rows[1].name).toBe('Charlie');
  });

  it('locates the player row', () => {
    const rows = rankByCategory(scores, 'bossKills');
    const me = playerRank(rows);
    expect(me?.name).toBe('Charlie');
    expect(me?.rank).toBe(1);
  });

  it('categoryValue maps every defined category', () => {
    for (const c of LEADERBOARD_CATEGORIES) {
      expect(typeof categoryValue(scores[0], c.id)).toBe('number');
    }
  });
});

describe('persistence merge', () => {
  it('takes per-field max of best vs live', () => {
    const best = {
      pvpKills: 5,
      bossKills: 2,
      huntKills: 10,
      wealth: 500,
      xp: 200,
    };
    const live = {
      pvpKills: 3,
      bossKills: 4,
      huntKills: 8,
      wealth: 900,
      xp: 150,
    };
    expect(mergeBest(best, live)).toEqual({
      pvpKills: 5,
      bossKills: 4,
      huntKills: 10,
      wealth: 900,
      xp: 200,
    });
  });

  it('empty score is all zeros', () => {
    expect(emptyPlayerScore()).toEqual({
      pvpKills: 0,
      bossKills: 0,
      huntKills: 0,
      wealth: 0,
      xp: 0,
    });
  });
});

describe('buildBoard', () => {
  const player = {
    name: 'Tester',
    factionId: 'dock_rats' as const,
    pvpKills: 999,
    bossKills: 999,
    huntKills: 999,
    wealth: 9_999_999,
    xp: 9_999_999,
  };

  it('includes the player and ranks them #1 with dominant stats', () => {
    const { rows, season } = buildBoard(
      player,
      'wealth',
      new Date('2026-07-08T12:00:00Z')
    );
    expect(season).toMatch(/^S-\d{4}-W\d{2}$/);
    const me = playerRank(rows);
    expect(me?.rank).toBe(1);
    expect(rows.length).toBe(13); // 12 rivals + player
  });

  it('merges persisted best into the board', () => {
    const now = new Date('2026-07-08T12:00:00Z');
    const persisted = {
      season: season(now),
      best: { pvpKills: 40, bossKills: 0, huntKills: 0, wealth: 0, xp: 0 },
    };
    const weakPlayer = {
      ...player,
      pvpKills: 1,
      wealth: 0,
      xp: 0,
      bossKills: 0,
      huntKills: 0,
    };
    const { playerBest } = buildBoard(weakPlayer, 'pvpKills', now, persisted);
    expect(playerBest.pvpKills).toBe(40); // persisted best wins over weak live
  });
});

function season(now: Date): string {
  return seasonKey(now);
}
