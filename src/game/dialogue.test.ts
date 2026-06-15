import { describe, it, expect } from 'vitest';
import { npcDialogue, type DialogueEffect } from './dialogue';
import { createNpcs, type Npc, type NpcType, type PlayerSnapshot } from './npc';

const TYPE_INDEX: Record<NpcType, number> = {
  civilian: 0,
  dealer: 2,
  gangster: 3,
  police: 4,
  hitman: 6,
  boss: 7,
};

const npcOf = (type: NpcType): Npc => createNpcs(8, 1337)[TYPE_INDEX[type]];

const player = (over: Partial<PlayerSnapshot> = {}): PlayerSnapshot => ({
  x: 0,
  z: 0,
  wanted: 0,
  reputation: 0,
  kills: 0,
  ...over,
});

// Mirrors how the overlay folds an option's effect into player stats.
function apply(
  base: { money: number; rep: number; wanted: number },
  e?: DialogueEffect
) {
  return {
    money: base.money + (e?.money ?? 0),
    rep: base.rep + (e?.rep ?? 0),
    wanted: base.wanted + (e?.wanted ?? 0),
  };
}

describe('dialogue branching', () => {
  it('dealer line escalates with kills and reputation', () => {
    expect(npcDialogue(npcOf('dealer'), player()).line).toContain('First time');
    expect(
      npcDialogue(npcOf('dealer'), player({ reputation: 60 })).line
    ).toContain('Premium');
    expect(npcDialogue(npcOf('dealer'), player({ kills: 20 })).line).toContain(
      'murder king'
    );
  });

  it('gangster recognizes a high-reputation player', () => {
    expect(npcDialogue(npcOf('gangster'), player()).line).toContain('lost');
    expect(
      npcDialogue(npcOf('gangster'), player({ reputation: 60 })).line
    ).toContain('crew');
  });

  it('boss only respects an infamous player', () => {
    expect(npcDialogue(npcOf('boss'), player()).line).toContain(
      'don\u2019t walk up'
    );
    expect(
      npcDialogue(npcOf('boss'), player({ reputation: 90 })).line
    ).toContain('carving up');
  });

  it('police reacts to wanted level', () => {
    expect(npcDialogue(npcOf('police'), player()).line).toContain('Move along');
    expect(npcDialogue(npcOf('police'), player({ wanted: 1 })).line).toContain(
      'Hands where'
    );
  });

  it('civilian line shifts with wanted and reputation', () => {
    expect(npcDialogue(npcOf('civilian'), player()).line).toContain(
      'Rough part'
    );
    expect(
      npcDialogue(npcOf('civilian'), player({ reputation: 40 })).line
    ).toContain('whispers');
    expect(
      npcDialogue(npcOf('civilian'), player({ wanted: 2 })).line
    ).toContain('family');
  });

  it('always offers a no-op walk-away option', () => {
    for (const t of Object.keys(TYPE_INDEX) as NpcType[]) {
      const d = npcDialogue(npcOf(t), player());
      const leave = d.options[d.options.length - 1];
      expect(leave.label).toBe('Walk away');
      expect(leave.effect).toBeUndefined();
    }
  });
});

describe('dialogue effects', () => {
  it('dealer stim costs money but builds rep', () => {
    const start = { money: 500, rep: 0, wanted: 0 };
    const buy = npcDialogue(npcOf('dealer'), player()).options[0];
    expect(buy.effect).toEqual({ money: -120, rep: 3 });
    expect(apply(start, buy.effect)).toEqual({ money: 380, rep: 3, wanted: 0 });
  });

  it('dealer shakedown gains money, rep, and heat', () => {
    const rob = npcDialogue(npcOf('dealer'), player()).options[1];
    expect(rob.effect).toEqual({ money: 80, rep: 6, wanted: 1 });
  });

  it('gangster job reward scales with reputation', () => {
    const low = npcDialogue(npcOf('gangster'), player()).options[0];
    const high = npcDialogue(npcOf('gangster'), player({ reputation: 60 }))
      .options[0];
    expect(low.effect).toEqual({ rep: 2 });
    expect(high.effect).toEqual({ rep: 10, money: 250 });
  });

  it('police bribe lowers wanted at a cost', () => {
    const start = { money: 200, rep: 0, wanted: 3 };
    const bribe = npcDialogue(npcOf('police'), player({ wanted: 3 }))
      .options[0];
    expect(bribe.effect).toEqual({ money: -150, wanted: -1 });
    expect(apply(start, bribe.effect)).toEqual({
      money: 50,
      rep: 0,
      wanted: 2,
    });
  });

  it('boss pledge and threat carry distinct effects', () => {
    const opts = npcDialogue(npcOf('boss'), player({ reputation: 90 })).options;
    expect(opts[0].effect).toEqual({ rep: 15, money: 400 });
    expect(opts[1].effect).toEqual({ wanted: 2, rep: 8 });
  });

  it('hitman contract is an expensive rep purchase', () => {
    const buy = npcDialogue(npcOf('hitman'), player()).options[0];
    expect(buy.effect).toEqual({ money: -300, rep: 12 });
  });

  it('civilian intimidation nets cash and heat', () => {
    const intimidate = npcDialogue(npcOf('civilian'), player()).options[1];
    expect(intimidate.effect).toEqual({ money: 30, wanted: 1, rep: 2 });
  });
});
