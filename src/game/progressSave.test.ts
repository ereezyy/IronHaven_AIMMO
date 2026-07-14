import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveProgressSnapshot,
  loadProgressSnapshot,
  clearProgressSnapshot,
  type ProgressSnapshot,
  PROGRESS_STORAGE_KEY,
} from './progressSave';
import { emptyBag } from './economy';
import { emptyStanding } from './factions';
import { emptyRanks } from './skills';
import { emptyCounters, generateBoard } from './dailyBoard';
import { emptyTerritory } from './territory';
import { emptyFishBag } from './fishing';

function sample(): ProgressSnapshot {
  const board = generateBoard(new Date());
  return {
    version: 1,
    savedAt: 0,
    playerId: 'player_test',
    username: 'Eddy',
    playerStats: {
      health: 88,
      reputation: 12,
      wanted: 1,
      money: 4200,
      policeKillCount: 2,
      xp: 1500,
      level: 4,
      skillPoints: 3,
      skills: { combat: 20, stealth: 15, driving: 10, intimidation: 10 },
    },
    skillRanks: emptyRanks(),
    abilityBar: [null, null, null, null],
    inventory: ['pistol'],
    bag: { ...emptyBag(), scrap: 5 },
    fishBag: emptyFishBag(),
    currentWeaponId: 'pistol',
    playerPosition: [10, 1.5, -4],
    factionId: 'neon_syndicate',
    factionStanding: emptyStanding(),
    pvpEnabled: true,
    dailyBoard: board,
    boardCounters: emptyCounters(),
    boardClaimed: [],
    territory: emptyTerritory(),
  };
}

const hasStorage = (() => {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem('__ih_probe', '1');
    localStorage.removeItem('__ih_probe');
    return true;
  } catch {
    return false;
  }
})();

describe('progressSave', () => {
  beforeEach(() => {
    if (hasStorage) localStorage.removeItem(PROGRESS_STORAGE_KEY);
    clearProgressSnapshot();
  });

  it('round-trips snapshot fields when storage exists', () => {
    const snap = sample();
    if (!hasStorage) {
      expect(saveProgressSnapshot(snap)).toBe(false);
      expect(loadProgressSnapshot()).toBeNull();
      return;
    }
    expect(saveProgressSnapshot(snap)).toBe(true);
    const loaded = loadProgressSnapshot();
    expect(loaded).not.toBeNull();
    expect(loaded!.username).toBe('Eddy');
    expect(loaded!.playerStats.xp).toBe(1500);
    expect(loaded!.playerStats.level).toBe(4);
    expect(loaded!.bag.scrap).toBe(5);
    expect(loaded!.factionId).toBe('neon_syndicate');
    expect(loaded!.playerPosition[0]).toBe(10);
  });

  it('returns null when empty', () => {
    expect(loadProgressSnapshot()).toBeNull();
  });
});
