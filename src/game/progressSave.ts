/**
 * Full local progress snapshot — XP, skills, bag, faction, board, weapon.
 * Complements Supabase player rows (which store a thinner schema).
 */

import type { ResourceBag } from './economy';
import type { FactionId, FactionStanding } from './factions';
import type { SkillRanks, ActiveAbilityId } from './skills';
import type { BoardState, BoardCounters } from './dailyBoard';
import type { TerritoryState } from './territory';
import type { FishBag } from './fishing';

export const PROGRESS_STORAGE_KEY = 'ironhaven-progress-v1';

export interface ProgressSnapshot {
  version: 1;
  savedAt: number;
  playerId: string | null;
  username: string;
  playerStats: {
    health: number;
    reputation: number;
    wanted: number;
    money: number;
    policeKillCount: number;
    xp: number;
    level: number;
    skillPoints: number;
    skills: {
      combat: number;
      stealth: number;
      driving: number;
      intimidation: number;
    };
  };
  skillRanks: SkillRanks;
  abilityBar: (ActiveAbilityId | null)[];
  inventory: string[];
  bag: ResourceBag;
  /** Safehouse storage. Missing on pre-safehouse snapshots — default empty. */
  stash?: ResourceBag;
  fishBag: FishBag;
  currentWeaponId: string;
  playerPosition: [number, number, number];
  factionId: FactionId;
  factionStanding: FactionStanding;
  pvpEnabled: boolean;
  dailyBoard: BoardState;
  boardCounters: BoardCounters;
  boardClaimed: string[];
  territory: TerritoryState;
}

export function saveProgressSnapshot(snap: ProgressSnapshot): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const payload: ProgressSnapshot = {
      ...snap,
      version: 1,
      savedAt: Date.now(),
    };
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadProgressSnapshot(): ProgressSnapshot | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProgressSnapshot;
    if (!parsed || parsed.version !== 1 || !parsed.playerStats) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearProgressSnapshot(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
