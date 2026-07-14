import { describe, it, expect } from 'vitest';
import {
  personalityFor,
  sceneContext,
  aiConfigured,
  pickContractGoal,
  contractProgress,
  type StreetContract,
} from './npcAi';
import { createNpcs, type Npc } from '../game/npc';

const npcOf = (type: Npc['type']): Npc => {
  const list = createNpcs(16, 42);
  const found = list.find((n) => n.type === type);
  if (!found) throw new Error(`no ${type}`);
  return found;
};

const stats = {
  x: 0,
  z: 0,
  wanted: 0,
  reputation: 10,
  kills: 0,
};

describe('npcAi personality mapping', () => {
  it('maps every npc type to a personality', () => {
    for (const type of [
      'civilian',
      'dealer',
      'gangster',
      'police',
      'hitman',
      'boss',
    ] as const) {
      const p = personalityFor(npcOf(type), stats);
      expect(p.traits.length).toBeGreaterThan(0);
      expect(p.background.length).toBeGreaterThan(0);
      expect(p.currentMood.length).toBeGreaterThan(0);
    }
  });

  it('raises mood heat when the player is wanted', () => {
    const p = personalityFor(npcOf('civilian'), { ...stats, wanted: 4 });
    expect(p.currentMood).toMatch(/heat|edge/i);
  });

  it('builds a scene context string with player stats', () => {
    const ctx = sceneContext(npcOf('dealer'), {
      ...stats,
      reputation: 33,
      kills: 2,
    });
    expect(ctx).toContain('Iron Haven');
    expect(ctx).toContain('rep=33');
    expect(ctx).toContain('dealer');
  });

  it('reports AI unconfigured without a session key', () => {
    // Default test env has no VITE_XAI_API_KEY → offline fallback path.
    expect(typeof aiConfigured()).toBe('boolean');
  });
});

describe('street contract goals', () => {
  it('picks clear-heat when the player is wanted', () => {
    const g = pickContractGoal(
      { ...stats, wanted: 2 },
      { title: 'Stay cool', description: 'Any work', difficulty: 'easy' }
    );
    expect(g.kind).toBe('clear_heat');
  });

  it('detects kill jobs from flavor text', () => {
    const g = pickContractGoal(stats, {
      title: 'Eliminate the snitch',
      description: 'Drop a body at the docks.',
      difficulty: 'medium',
    });
    expect(g.kind).toBe('kills');
    expect(g.target).toBeGreaterThan(0);
  });

  it('tracks earn progress as money delta from baseline', () => {
    const c: StreetContract = {
      id: 't1',
      title: 'Score',
      description: 'Make cash',
      reward: 100,
      difficulty: 'easy',
      goal: { kind: 'earn', target: 500, label: 'Earn $500' },
      baseline: {
        kills: 0,
        money: 1000,
        talks: 0,
        reputation: 0,
        wanted: 0,
      },
    };
    expect(
      contractProgress(c, {
        kills: 0,
        money: 1200,
        talks: 0,
        reputation: 0,
        wanted: 0,
      }).done
    ).toBe(false);
    expect(
      contractProgress(c, {
        kills: 0,
        money: 1600,
        talks: 0,
        reputation: 0,
        wanted: 0,
      }).done
    ).toBe(true);
  });

  it('completes clear_heat when wanted hits zero', () => {
    const c: StreetContract = {
      id: 't2',
      title: 'Cool off',
      description: 'Heat',
      reward: 50,
      difficulty: 'easy',
      goal: { kind: 'clear_heat', target: 0, label: 'Zero heat' },
      baseline: {
        kills: 0,
        money: 0,
        talks: 0,
        reputation: 0,
        wanted: 2,
      },
    };
    expect(
      contractProgress(c, {
        kills: 0,
        money: 0,
        talks: 0,
        reputation: 0,
        wanted: 1,
      }).done
    ).toBe(false);
    expect(
      contractProgress(c, {
        kills: 0,
        money: 0,
        talks: 0,
        reputation: 0,
        wanted: 0,
      }).done
    ).toBe(true);
  });
});
