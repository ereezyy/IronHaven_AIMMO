/**
 * Seasonal leaderboard — competitive ranking across categories.
 *
 * Client-side model with localStorage persistence for offline play.
 * Seasons window by ISO week so all players share the same season key.
 * When no live players are present, a deterministic pool of AI rivals is
 * seeded from the season key so the board always feels populated, and the
 * local player is merged/ranked against them. Production can later replace
 * the AI pool with rows pulled from Supabase.
 */

import type { FactionId } from './factions';

export const LEADERBOARD_STORAGE_KEY = 'ironhaven-leaderboard';

export type LeaderboardCategory =
  | 'pvpKills'
  | 'bossKills'
  | 'huntKills'
  | 'wealth'
  | 'xp';

export interface CategoryDef {
  id: LeaderboardCategory;
  label: string;
  blurb: string;
  /** Field on LeaderboardScore used to rank this category. */
  field: keyof LeaderboardScore & string;
}

export const LEADERBOARD_CATEGORIES: CategoryDef[] = [
  { id: 'pvpKills', label: 'PvP Kills', blurb: 'Runners dropped in open-world PvP.', field: 'pvpKills' },
  { id: 'bossKills', label: 'Boss Kills', blurb: 'World bosses put down.', field: 'bossKills' },
  { id: 'huntKills', label: 'Hunts', blurb: 'Wildlife taken across the district.', field: 'huntKills' },
  { id: 'wealth', label: 'Wealth', blurb: 'Total cash earned this season.', field: 'wealth' },
  { id: 'xp', label: 'XP', blurb: 'Experience banked this season.', field: 'xp' },
];

export interface LeaderboardScore {
  id: string;
  name: string;
  factionId: FactionId;
  pvpKills: number;
  bossKills: number;
  huntKills: number;
  wealth: number;
  xp: number;
  /** True for the local player's row. */
  isPlayer?: boolean;
}

export interface RankedRow extends LeaderboardScore {
  rank: number;
  value: number;
}

/** ISO-week season key, e.g. "S-2026-W28". Shared with subscription weeks. */
export function seasonKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `S-${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const RIVAL_NAMES = [
  'Vex', 'Static', 'Mako', 'Cinder', 'Halcyon', 'Rook', 'Nyx', 'Drift',
  'Ozone', 'Wraith', 'Quartz', 'Havoc', 'Slate', 'Ember', 'Cobalt', 'Riven',
];
const RIVAL_FACTIONS: FactionId[] = ['neon_syndicate', 'chrome_guard', 'dock_rats'];

/**
 * Deterministic AI rival pool for a season. Same season key → same rivals,
 * so the board is stable within a season and rerolls each week.
 */
export function seedRivals(key: string, count = 12): LeaderboardScore[] {
  const rivals: LeaderboardScore[] = [];
  for (let i = 0; i < count; i++) {
    const h = hash(`${key}:rival:${i}`);
    const tier = 1 + (h % 5); // 1..5 skill tier scales all stats
    rivals.push({
      id: `rival_${key}_${i}`,
      name: RIVAL_NAMES[h % RIVAL_NAMES.length] + '-' + String(((h >>> 8) % 90) + 10),
      factionId: RIVAL_FACTIONS[h % RIVAL_FACTIONS.length],
      pvpKills: tier * (3 + (h % 9)),
      bossKills: Math.floor(tier * ((h >>> 3) % 4)),
      huntKills: tier * (5 + ((h >>> 5) % 14)),
      wealth: tier * (900 + ((h >>> 7) % 4000)),
      xp: tier * (600 + ((h >>> 9) % 3200)),
    });
  }
  return rivals;
}

export function categoryValue(
  s: LeaderboardScore,
  cat: LeaderboardCategory
): number {
  const def = LEADERBOARD_CATEGORIES.find((c) => c.id === cat);
  if (!def) return 0;
  const v = s[def.field];
  return typeof v === 'number' ? v : 0;
}

/** Rank a set of scores by category (desc), ties broken by name for stability. */
export function rankByCategory(
  scores: LeaderboardScore[],
  cat: LeaderboardCategory
): RankedRow[] {
  return [...scores]
    .sort((a, b) => {
      const dv = categoryValue(b, cat) - categoryValue(a, cat);
      return dv !== 0 ? dv : a.name.localeCompare(b.name);
    })
    .map((s, i) => ({ ...s, rank: i + 1, value: categoryValue(s, cat) }));
}

export function playerRank(rows: RankedRow[]): RankedRow | null {
  return rows.find((r) => r.isPlayer) ?? null;
}

/** Persisted best-ever player score per season (survives reloads). */
export interface PersistedLeaderboard {
  season: string;
  best: Omit<LeaderboardScore, 'id' | 'name' | 'factionId' | 'isPlayer'>;
}

export function emptyPlayerScore(): PersistedLeaderboard['best'] {
  return { pvpKills: 0, bossKills: 0, huntKills: 0, wealth: 0, xp: 0 };
}

export function loadLeaderboard(now = new Date()): PersistedLeaderboard {
  const season = seasonKey(now);
  try {
    if (typeof localStorage === 'undefined') return { season, best: emptyPlayerScore() };
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (!raw) return { season, best: emptyPlayerScore() };
    const parsed = JSON.parse(raw) as Partial<PersistedLeaderboard>;
    // New season → reset the persisted best.
    if (parsed.season !== season || !parsed.best) {
      return { season, best: emptyPlayerScore() };
    }
    const b = parsed.best;
    return {
      season,
      best: {
        pvpKills: Number(b.pvpKills) || 0,
        bossKills: Number(b.bossKills) || 0,
        huntKills: Number(b.huntKills) || 0,
        wealth: Number(b.wealth) || 0,
        xp: Number(b.xp) || 0,
      },
    };
  } catch {
    return { season, best: emptyPlayerScore() };
  }
}

/** Merge live session stats with the persisted best (per-field max). */
export function mergeBest(
  best: PersistedLeaderboard['best'],
  live: PersistedLeaderboard['best']
): PersistedLeaderboard['best'] {
  return {
    pvpKills: Math.max(best.pvpKills, live.pvpKills),
    bossKills: Math.max(best.bossKills, live.bossKills),
    huntKills: Math.max(best.huntKills, live.huntKills),
    wealth: Math.max(best.wealth, live.wealth),
    xp: Math.max(best.xp, live.xp),
  };
}

export function saveLeaderboard(p: PersistedLeaderboard): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore quota / private mode */
  }
}

export interface PlayerLiveInput {
  name: string;
  factionId: FactionId;
  pvpKills: number;
  bossKills: number;
  huntKills: number;
  wealth: number;
  xp: number;
}

/**
 * Build the full board for a season: seeded rivals + the local player row,
 * ranked for the given category. Also returns the merged player score so the
 * caller can persist it.
 */
export function buildBoard(
  player: PlayerLiveInput,
  cat: LeaderboardCategory,
  now = new Date(),
  persisted?: PersistedLeaderboard,
  rivalCount = 12
): { season: string; rows: RankedRow[]; playerBest: PersistedLeaderboard['best'] } {
  const season = seasonKey(now);
  const prev = persisted && persisted.season === season
    ? persisted.best
    : emptyPlayerScore();
  const merged = mergeBest(prev, {
    pvpKills: player.pvpKills,
    bossKills: player.bossKills,
    huntKills: player.huntKills,
    wealth: player.wealth,
    xp: player.xp,
  });
  const playerRow: LeaderboardScore = {
    id: 'player',
    name: player.name || 'You',
    factionId: player.factionId,
    ...merged,
    isPlayer: true,
  };
  const scores = [...seedRivals(season, rivalCount), playerRow];
  return { season, rows: rankByCategory(scores, cat), playerBest: merged };
}
