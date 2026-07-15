import { describe, it, expect } from 'vitest';
import {
  createNpcs,
  tickNpc,
  damageNpc,
  npcColor,
  type Npc,
  type NpcType,
  type NpcEvent,
  type PlayerSnapshot,
} from './npc';

const player = (over: Partial<PlayerSnapshot> = {}): PlayerSnapshot => ({
  x: 0,
  z: 0,
  wanted: 0,
  reputation: 0,
  kills: 0,
  ...over,
});

// createNpcs lays types out in a fixed order; grab one of each by index.
const TYPE_INDEX: Record<NpcType, number> = {
  civilian: 0,
  dealer: 2,
  gangster: 3,
  police: 4,
  hitman: 6,
  boss: 7,
};

function npcOf(
  type: NpcType,
  at: { x: number; z: number } = { x: 0, z: 0 }
): Npc {
  const npc = createNpcs(8, 1337)[TYPE_INDEX[type]];
  npc.x = at.x;
  npc.z = at.z;
  return npc;
}

describe('createNpcs', () => {
  it('is deterministic for a given seed', () => {
    const a = createNpcs(12, 42);
    const b = createNpcs(12, 42);
    expect(a).toEqual(b);
  });

  it('produces different layouts for different seeds', () => {
    const a = createNpcs(12, 1);
    const b = createNpcs(12, 2);
    expect(a[0].x).not.toBe(b[0].x);
  });

  it('honors count and cycles the type order', () => {
    const npcs = createNpcs(8, 1337);
    expect(npcs).toHaveLength(8);
    expect(npcs.map((n) => n.type)).toEqual([
      'civilian',
      'civilian',
      'dealer',
      'gangster',
      'police',
      'gangster',
      'hitman',
      'boss',
    ]);
  });

  it('initializes every npc calm at full health', () => {
    for (const n of createNpcs(24, 9)) {
      expect(n.mood).toBe('calm');
      expect(n.health).toBe(n.maxHealth);
    }
  });
});

describe('mood transitions', () => {
  // Player positions sit outside the Spawn Sanctum safe zone (r=14 at origin)
  // because protected players never draw aggro.
  it('civilian flees on high wanted or kills, else stays calm', () => {
    const events: never[] = [];
    const calm = npcOf('civilian', { x: 60, z: 0 });
    tickNpc(calm, player({ x: 30 }), 0.016, events);
    expect(calm.mood).toBe('calm');

    const scaredWanted = npcOf('civilian', { x: 60, z: 0 });
    tickNpc(scaredWanted, player({ x: 30, wanted: 2 }), 0.016, events);
    expect(scaredWanted.mood).toBe('fleeing');

    const scaredKills = npcOf('civilian', { x: 60, z: 0 });
    tickNpc(scaredKills, player({ x: 30, kills: 6 }), 0.016, events);
    expect(scaredKills.mood).toBe('fleeing');
  });

  it('police turns hostile near a wanted player', () => {
    const events: never[] = [];
    const near = npcOf('police', { x: 65, z: 0 });
    tickNpc(near, player({ x: 60, wanted: 1 }), 0.016, events);
    expect(near.mood).toBe('hostile');

    const farClean = npcOf('police', { x: 65, z: 0 });
    tickNpc(farClean, player({ x: 60 }), 0.016, events);
    expect(farClean.mood).toBe('calm');
  });

  it('gangster/hitman/boss turn hostile on low reputation within aggro range', () => {
    const events: never[] = [];
    for (const t of ['gangster', 'hitman', 'boss'] as NpcType[]) {
      const hostile = npcOf(t, { x: 65, z: 0 });
      tickNpc(hostile, player({ x: 60, reputation: 0 }), 0.016, events);
      expect(hostile.mood).toBe('hostile');

      const friendly = npcOf(t, { x: 65, z: 0 });
      tickNpc(friendly, player({ x: 60, reputation: 50 }), 0.016, events);
      expect(friendly.mood).toBe('calm');
    }
  });

  it('npcs stay calm toward a player inside the safe spawn zone', () => {
    const events: never[] = [];
    for (const t of ['gangster', 'hitman', 'boss', 'police'] as NpcType[]) {
      const n = npcOf(t, { x: 5, z: 0 });
      tickNpc(n, player({ x: 0, wanted: 5, reputation: 0 }), 0.016, events);
      expect(n.mood).toBe('calm');
    }
    expect(events).toHaveLength(0);
  });

  it('dealer stays calm regardless', () => {
    const events: never[] = [];
    const d = npcOf('dealer', { x: 3, z: 0 });
    tickNpc(d, player({ wanted: 5, kills: 99, reputation: 0 }), 0.016, events);
    expect(d.mood).toBe('calm');
  });
});

describe('combat', () => {
  it('a hostile npc in melee range emits a damage event on cooldown', () => {
    const events: NpcEvent[] = [];
    // Outside the safe spawn zone so aggro is allowed.
    const g = npcOf('gangster', { x: 60, z: 0 });
    tickNpc(g, player({ x: 61, z: 0, reputation: 0 }), 0.016, events);
    expect(g.mood).toBe('hostile');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: 'damage', amount: 15 });
    expect(g.attackCd).toBeGreaterThan(0);
  });

  it('damageNpc reduces health, flashes, and rewards on kill', () => {
    const events: NpcEvent[] = [];
    const civ = npcOf('civilian');
    damageNpc(civ, 25, events);
    expect(civ.health).toBe(35);
    expect(civ.hitFlash).toBe(1);
    expect(events).toHaveLength(0);

    damageNpc(civ, 100, events);
    expect(civ.health).toBe(0);
    expect(civ.mood).toBe('dead');
    expect(events[0]).toMatchObject({ kind: 'kill', rep: 2, money: 20 });
  });

  it('scales kill rewards by type', () => {
    const events: NpcEvent[] = [];
    const boss = npcOf('boss');
    damageNpc(boss, boss.maxHealth, events);
    expect(events[0]).toMatchObject({ rep: 30, money: 500 });
  });
});

describe('factional AI', () => {
  it('police hunt a nearby gangster, going hostile and locking the target', () => {
    const events: NpcEvent[] = [];
    const cop = npcOf('police', { x: 0, z: 0 });
    const gang = npcOf('gangster', { x: 6, z: 0 });
    // Player is far and clean, so the only reason to aggro is the rival faction.
    tickNpc(cop, player({ x: 999, z: 999 }), 0.016, events, [cop, gang]);
    expect(cop.mood).toBe('hostile');
    expect(cop.factionTargetId).toBe(gang.id);
  });

  it('police damage a gangster in melee range without rewarding the player', () => {
    const events: NpcEvent[] = [];
    const cop = npcOf('police', { x: 0, z: 0 });
    const gang = npcOf('gangster', { x: 1, z: 0 });
    const before = gang.health;
    tickNpc(cop, player({ x: 999, z: 999 }), 0.016, events, [cop, gang]);
    expect(gang.health).toBeLessThan(before);
    expect(gang.hitFlash).toBe(1);
    expect(events).toHaveLength(0);
  });

  it('gangsters hunt police back — the war is two-sided', () => {
    const events: NpcEvent[] = [];
    const gang = npcOf('gangster', { x: 0, z: 0 });
    const cop = npcOf('police', { x: 6, z: 0 });
    // Player far and high-rep, so the only reason to aggro is the rival faction.
    tickNpc(gang, player({ x: 999, z: 999, reputation: 99 }), 0.016, events, [
      gang,
      cop,
    ]);
    expect(gang.mood).toBe('hostile');
    expect(gang.factionTargetId).toBe(cop.id);
  });

  it('a boss attacks police in melee without rewarding the player', () => {
    const events: NpcEvent[] = [];
    const boss = npcOf('boss', { x: 0, z: 0 });
    const cop = npcOf('police', { x: 1, z: 0 });
    const before = cop.health;
    tickNpc(boss, player({ x: 999, z: 999, reputation: 99 }), 0.016, events, [
      boss,
      cop,
    ]);
    expect(cop.health).toBeLessThan(before);
    expect(events).toHaveLength(0);
  });

  it('police ignore civilians (not a rival faction)', () => {
    const events: NpcEvent[] = [];
    const cop = npcOf('police', { x: 0, z: 0 });
    const civ = npcOf('civilian', { x: 3, z: 0 });
    tickNpc(cop, player({ x: 999, z: 999 }), 0.016, events, [cop, civ]);
    expect(cop.factionTargetId).toBeNull();
  });

  it('civilians flee when they witness a hostile npc nearby', () => {
    const events: NpcEvent[] = [];
    const civ = npcOf('civilian', { x: 0, z: 0 });
    const hostile = npcOf('gangster', { x: 5, z: 0 });
    hostile.mood = 'hostile';
    tickNpc(civ, player({ x: 999, z: 999 }), 0.016, events, [civ, hostile]);
    expect(civ.mood).toBe('fleeing');
  });

  it('civilians stay calm when no combat is in view', () => {
    const events: NpcEvent[] = [];
    const civ = npcOf('civilian', { x: 0, z: 0 });
    const calmGang = npcOf('gangster', { x: 5, z: 0 });
    calmGang.mood = 'calm';
    tickNpc(civ, player({ x: 999, z: 999 }), 0.016, events, [civ, calmGang]);
    expect(civ.mood).toBe('calm');
  });
});

describe('npcColor', () => {
  it('maps mood and state to the graphite palette', () => {
    const civ = npcOf('civilian');
    expect(npcColor(civ)).toBe('#9a9da2');
    civ.mood = 'hostile';
    expect(npcColor(civ)).toBe('#c03a30');
    civ.mood = 'fleeing';
    expect(npcColor(civ)).toBe('#8a8d92');
    civ.hitFlash = 1;
    expect(npcColor(civ)).toBe('#e8554a');
    civ.mood = 'dead';
    expect(npcColor(civ)).toBe('#3a3a3e');
  });
});
