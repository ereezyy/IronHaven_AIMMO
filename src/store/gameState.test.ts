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
    playerStats: {
      health: 100,
      reputation: 0,
      wanted: 0,
      money: 1000,
      policeKillCount: 0,
      skills: { combat: 10, stealth: 10, driving: 10, intimidation: 10 },
    },
    sessionStats: { totalKills: 0, totalMoneyEarned: 0, maxWantedLevel: 0 },
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
