// XP / level progression — pure functions for level curves and activity rewards.

export interface LevelInfo {
  level: number;
  /** XP into the current level. */
  xpIntoLevel: number;
  /** XP needed to finish the current level. */
  xpForLevel: number;
  totalXp: number;
  /** 0–1 progress bar. */
  progress: number;
}

/** XP required to go from `level` → `level+1` (level is 1-based). */
export function xpToNextLevel(level: number): number {
  const lv = Math.max(1, Math.floor(level));
  // Gentle curve: 100, 140, 188… early game friendly, late game grindier.
  return Math.round(100 * Math.pow(1.35, lv - 1));
}

/** Total XP required to *reach* a given level from 0. */
export function totalXpForLevel(level: number): number {
  let sum = 0;
  for (let L = 1; L < level; L++) sum += xpToNextLevel(L);
  return sum;
}

export function levelFromXp(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let remaining = xp;
  // Cap display progression at 99 for UI sanity.
  while (level < 99) {
    const need = xpToNextLevel(level);
    if (remaining < need) {
      return {
        level,
        xpIntoLevel: remaining,
        xpForLevel: need,
        totalXp: xp,
        progress: need > 0 ? remaining / need : 1,
      };
    }
    remaining -= need;
    level += 1;
  }
  return {
    level: 99,
    xpIntoLevel: remaining,
    xpForLevel: xpToNextLevel(99),
    totalXp: xp,
    progress: 1,
  };
}

export type XpSource =
  | 'hunt'
  | 'npc_kill'
  | 'boss'
  | 'pvp'
  | 'fish'
  | 'harvest'
  | 'craft'
  | 'contract'
  | 'quest'
  | 'talk'
  | 'discovery'
  | 'faction';

/** Base XP tables by activity. Multipliers applied by level elsewhere. */
export const XP_REWARDS: Record<XpSource, number> = {
  hunt: 45,
  npc_kill: 35,
  boss: 400,
  pvp: 80,
  fish: 18,
  harvest: 12,
  craft: 40,
  contract: 120,
  quest: 150,
  talk: 8,
  discovery: 25,
  faction: 50,
};

/**
 * Slight anti-steamroll: high-level players get a little less XP from trash,
 * low-level players get full credit. Bosses always pay full.
 */
export function scaledXp(
  source: XpSource,
  playerLevel: number,
  baseOverride?: number
): number {
  const base = baseOverride ?? XP_REWARDS[source];
  if (source === 'boss' || source === 'contract' || source === 'quest') {
    return base;
  }
  // Soft diminishing returns past level 15.
  if (playerLevel <= 10) return base;
  const damp = 1 / (1 + (playerLevel - 10) * 0.04);
  return Math.max(1, Math.round(base * damp));
}

/** Flat HP bonus from level (keeps tankiness growing). */
export function maxHealthForLevel(level: number): number {
  return 100 + Math.max(0, level - 1) * 8;
}

/** Skill point every N levels (spent elsewhere / auto combat bump). */
export function skillPointsFromLevel(level: number): number {
  return Math.floor(Math.max(0, level - 1) / 3);
}
