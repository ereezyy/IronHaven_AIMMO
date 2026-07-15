import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameState';
import {
  skillCost,
  skillTier,
  UPGRADE_STEP,
  MAX_SKILL_LEVEL,
} from '../components/BlackMarket';
import { DEATH_LOSS_FRACTION } from '../components/MMOGame';

// The store auto-saves to Supabase on every mutation, but saveGameState
// early-returns while playerId is null — so as long as we never assign a
// playerId, these tests exercise pure in-memory state with no network.
const reset = () =>
  useGameStore.setState({
    playerId: null,
    username: 'Runner',
    inventory: [],
    bag: {
      scrap: 0,
      circuits: 0,
      chems: 0,
      nano_fiber: 0,
      stim_vial: 0,
      armor_plate: 0,
      fuel_cell: 0,
    },
    playerStats: {
      health: 100,
      reputation: 0,
      wanted: 0,
      money: 1000,
      policeKillCount: 0,
      xp: 0,
      level: 1,
      skillPoints: 3,
      skills: { combat: 10, stealth: 10, driving: 10, intimidation: 10 },
    },
    skillRanks: {},
    sessionStats: {
      totalKills: 0,
      totalMoneyEarned: 0,
      maxWantedLevel: 0,
      pvpKills: 0,
      bossKills: 0,
      huntKills: 0,
      xpGained: 0,
    },
    xpToast: null,
    factionId: 'null',
    pvpEnabled: false,
    fishBag: {
      neon_minnow: 0,
      chrome_bass: 0,
      toxic_eel: 0,
      void_koi: 0,
      scrap_boot: 0,
    },
    pass: {
      expiresAt: 0,
      source: 'demo',
      weeklySpClaimKey: null,
      activatedAt: 0,
    },
    boardCounters: {
      huntKills: 0,
      totalKills: 0,
      talks: 0,
      harvests: 0,
      moneyEarned: 0,
      fishCaught: 0,
      factionJoined: 0,
    },
    boardClaimed: [],
  });

// Mirrors BlackMarket.buySkill — kept here so the test asserts the same
// money/skill bookkeeping the component performs against the real store.
const buySkill = (key: 'combat' | 'stealth') => {
  const s = useGameStore.getState();
  const level = s.playerStats.skills[key];
  if (level >= MAX_SKILL_LEVEL) return false;
  const cost = skillCost(level);
  if (s.playerStats.money < cost) return false;
  s.updateStats({ money: s.playerStats.money - cost });
  s.updateSkills({ [key]: Math.min(MAX_SKILL_LEVEL, level + UPGRADE_STEP) });
  return true;
};

describe('skillCost — tiered upgrade pricing', () => {
  it('matches the rounded power curve at known levels', () => {
    expect(skillCost(10)).toBe(40);
    expect(skillCost(15)).toBe(Math.round(40 * Math.pow(1.5, 1.6)));
    expect(skillCost(50)).toBe(Math.round(40 * Math.pow(5, 1.6)));
  });

  it('is strictly increasing across the upgrade steps', () => {
    let prev = -1;
    for (let lv = 10; lv <= MAX_SKILL_LEVEL; lv += UPGRADE_STEP) {
      const c = skillCost(lv);
      expect(c).toBeGreaterThan(prev);
      prev = c;
    }
  });

  it('maps levels to the right tier (10→I .. 50→IX)', () => {
    expect(skillTier(10)).toBe(1);
    expect(skillTier(15)).toBe(2);
    expect(skillTier(50)).toBe(9);
  });
});

describe('Black Market purchases against the store', () => {
  beforeEach(reset);

  it('deducts the exact cost and bumps the skill by one step', () => {
    const ok = buySkill('combat');
    expect(ok).toBe(true);
    const s = useGameStore.getState();
    expect(s.playerStats.skills.combat).toBe(15);
    expect(s.playerStats.money).toBe(1000 - skillCost(10));
  });

  it('charges the escalating price on the second upgrade', () => {
    buySkill('combat');
    const afterFirst = useGameStore.getState().playerStats.money;
    buySkill('combat');
    const s = useGameStore.getState();
    expect(s.playerStats.skills.combat).toBe(20);
    expect(s.playerStats.money).toBe(afterFirst - skillCost(15));
  });

  it('refuses an upgrade the player cannot afford (no state change)', () => {
    useGameStore.setState((st) => ({
      playerStats: { ...st.playerStats, money: 5 },
    }));
    const ok = buySkill('stealth');
    expect(ok).toBe(false);
    const s = useGameStore.getState();
    expect(s.playerStats.skills.stealth).toBe(10);
    expect(s.playerStats.money).toBe(5);
  });

  it('caps the skill at MAX_SKILL_LEVEL and stops charging', () => {
    useGameStore.setState((st) => ({
      playerStats: {
        ...st.playerStats,
        money: 999999,
        skills: { ...st.playerStats.skills, combat: MAX_SKILL_LEVEL },
      },
    }));
    const moneyBefore = useGameStore.getState().playerStats.money;
    const ok = buySkill('combat');
    expect(ok).toBe(false);
    const s = useGameStore.getState();
    expect(s.playerStats.skills.combat).toBe(MAX_SKILL_LEVEL);
    expect(s.playerStats.money).toBe(moneyBefore);
  });
});

describe('death penalty — 25% money loss aversion', () => {
  beforeEach(reset);

  // Mirrors the once-per-death deduction MMOGame applies when health hits 0.
  const applyDeathPenalty = () => {
    const s = useGameStore.getState();
    const lost = Math.round(s.playerStats.money * DEATH_LOSS_FRACTION);
    s.updateStats({ money: s.playerStats.money - lost });
    return lost;
  };

  it('uses a 0.25 fraction', () => {
    expect(DEATH_LOSS_FRACTION).toBe(0.25);
  });

  it('drops exactly a quarter of the player cash', () => {
    const lost = applyDeathPenalty();
    expect(lost).toBe(250);
    expect(useGameStore.getState().playerStats.money).toBe(750);
  });

  it('rounds the penalty for odd balances', () => {
    useGameStore.setState((st) => ({
      playerStats: { ...st.playerStats, money: 999 },
    }));
    const lost = applyDeathPenalty();
    expect(lost).toBe(Math.round(999 * 0.25)); // 250
    expect(useGameStore.getState().playerStats.money).toBe(999 - lost);
  });

  it('never drives money negative at zero balance', () => {
    useGameStore.setState((st) => ({
      playerStats: { ...st.playerStats, money: 0 },
    }));
    const lost = applyDeathPenalty();
    expect(lost).toBe(0);
    expect(useGameStore.getState().playerStats.money).toBe(0);
  });
});

describe('Iron Haven Pass — store integration', () => {
  beforeEach(reset);

  it('demo subscribe activates Pass for a week', () => {
    const res = useGameStore.getState().subscribePass('demo');
    expect(res.ok).toBe(true);
    expect(res.path).toBe('demo');
    expect(useGameStore.getState().isPassActive()).toBe(true);
    expect(useGameStore.getState().pass.expiresAt).toBeGreaterThan(Date.now());
  });

  it('boosts XP by 25% when Pass is active', () => {
    const base = useGameStore.getState().gainXp('hunt');
    reset();
    useGameStore.getState().subscribePass('demo');
    const boosted = useGameStore.getState().gainXp('hunt');
    // Pass multiplies after skill xpBonus; with empty ranks both start from same base.
    expect(boosted).toBe(Math.round(base * 1.25));
  });

  it('claims weekly skill points once', () => {
    useGameStore.getState().subscribePass('demo');
    const before = useGameStore.getState().playerStats.skillPoints;
    const first = useGameStore.getState().claimPassWeeklySp();
    expect(first.ok).toBe(true);
    expect(first.amount).toBe(2);
    expect(useGameStore.getState().playerStats.skillPoints).toBe(before + 2);
    const second = useGameStore.getState().claimPassWeeklySp();
    expect(second.ok).toBe(false);
  });

  it('cancelPass clears benefits', () => {
    useGameStore.getState().subscribePass('demo');
    useGameStore.getState().cancelPass();
    expect(useGameStore.getState().isPassActive()).toBe(false);
  });
});

describe('safehouse stash — deposit and withdraw', () => {
  beforeEach(() => {
    reset();
    useGameStore.setState((st) => ({
      bag: { ...st.bag, scrap: 3 },
      stash: {
        scrap: 0,
        circuits: 0,
        chems: 0,
        nano_fiber: 0,
        stim_vial: 0,
        armor_plate: 0,
        fuel_cell: 0,
      },
    }));
  });

  it('deposits from bag into stash', () => {
    const ok = useGameStore.getState().depositToStash('scrap', 2);
    expect(ok).toBe(true);
    const s = useGameStore.getState();
    expect(s.bag.scrap).toBe(1);
    expect(s.stash.scrap).toBe(2);
  });

  it('withdraws from stash back into bag', () => {
    useGameStore.getState().depositToStash('scrap', 3);
    const ok = useGameStore.getState().withdrawFromStash('scrap', 1);
    expect(ok).toBe(true);
    const s = useGameStore.getState();
    expect(s.bag.scrap).toBe(1);
    expect(s.stash.scrap).toBe(2);
  });

  it('rejects moves beyond what is held (no state change)', () => {
    expect(useGameStore.getState().depositToStash('scrap', 5)).toBe(false);
    expect(useGameStore.getState().withdrawFromStash('scrap', 1)).toBe(false);
    const s = useGameStore.getState();
    expect(s.bag.scrap).toBe(3);
    expect(s.stash.scrap).toBe(0);
  });
});
