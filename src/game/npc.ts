// Pure NPC simulation — no React, no THREE, no per-frame allocations.
// The manager component owns rendering; this module owns behavior.

import { isSafeZoneAt, isSpawnProtected } from './zones';

export type NpcType =
  | 'civilian'
  | 'gangster'
  | 'police'
  | 'dealer'
  | 'hitman'
  | 'boss';

export type NpcMood = 'calm' | 'alert' | 'hostile' | 'fleeing' | 'dead';

export interface Npc {
  id: string;
  type: NpcType;
  name: string;
  x: number;
  z: number;
  homeX: number;
  homeZ: number;
  rotation: number;
  health: number;
  maxHealth: number;
  mood: NpcMood;
  targetX: number;
  targetZ: number;
  speed: number;
  attackCd: number;
  hitFlash: number;
  wanderCd: number;
  factionTargetId: string | null;
}

export interface PlayerSnapshot {
  x: number;
  z: number;
  wanted: number;
  reputation: number;
  kills: number;
}

export interface NpcEvent {
  kind: 'damage' | 'kill';
  amount?: number; // damage dealt to player
  npc?: Npc; // the npc, for kill rewards
  rep?: number;
  money?: number;
}

const WORLD_RADIUS = 100;
export const TALK_RANGE = 4;
export const MELEE_RANGE = 2.4;
const AGGRO_RANGE = 22;
const FACTION_RANGE = 26;
const WITNESS_RANGE = 14;

// Which NPC types a given type will hunt on sight (faction warfare). The
// police/gang conflict is two-sided: cops sweep gangs, and gangs (and their
// bosses) shoot back — producing emergent, unscripted street firefights the
// player can stumble into, side with, or exploit.
const ENEMIES_OF: Partial<Record<NpcType, NpcType[]>> = {
  police: ['gangster', 'boss'],
  gangster: ['police'],
  boss: ['police'],
};

const BASE: Record<
  NpcType,
  { hp: number; speed: number; rep: number; money: number; dmg: number }
> = {
  civilian: { hp: 60, speed: 3.2, rep: 2, money: 20, dmg: 0 },
  dealer: { hp: 80, speed: 2.6, rep: 5, money: 120, dmg: 0 },
  gangster: { hp: 100, speed: 4.4, rep: 8, money: 80, dmg: 15 },
  police: { hp: 120, speed: 4.8, rep: 15, money: 150, dmg: 20 },
  hitman: { hp: 140, speed: 5.2, rep: 20, money: 300, dmg: 25 },
  boss: { hp: 220, speed: 4.0, rep: 30, money: 500, dmg: 35 },
};

const TYPE_ORDER: NpcType[] = [
  'civilian',
  'civilian',
  'dealer',
  'gangster',
  'police',
  'gangster',
  'hitman',
  'boss',
];

const NAMES = [
  'Vex',
  'Cain',
  'Rook',
  'Salt',
  'Mara',
  'Dex',
  'Nyx',
  'Crow',
  'Pike',
  'Ash',
  'Wren',
  'Gent',
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createNpcs(count: number, seed = 1337): Npc[] {
  const rng = mulberry32(seed);
  const npcs: Npc[] = [];
  for (let i = 0; i < count; i++) {
    const type = TYPE_ORDER[i % TYPE_ORDER.length];
    const b = BASE[type];
    const angle = rng() * Math.PI * 2;
    const radius = 14 + rng() * 70;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    npcs.push({
      id: `npc_${i}`,
      type,
      name: NAMES[Math.floor(rng() * NAMES.length)],
      x,
      z,
      homeX: x,
      homeZ: z,
      rotation: rng() * Math.PI * 2,
      health: b.hp,
      maxHealth: b.hp,
      mood: 'calm',
      targetX: x,
      targetZ: z,
      speed: b.speed,
      attackCd: 0,
      hitFlash: 0,
      wanderCd: rng() * 4,
      factionTargetId: null,
    });
  }
  return npcs;
}

export function tickNpc(
  npc: Npc,
  p: PlayerSnapshot,
  delta: number,
  events: NpcEvent[],
  world?: Npc[]
): void {
  if (npc.mood === 'dead') return;
  if (npc.hitFlash > 0) npc.hitFlash = Math.max(0, npc.hitFlash - delta * 3);
  if (npc.attackCd > 0) npc.attackCd -= delta;

  const dx = p.x - npc.x;
  const dz = p.z - npc.z;
  const distSq = dx * dx + dz * dz;

  // Faction warfare takes priority over reacting to the player: police hunt
  // gangsters/bosses on sight, attacking them directly (no player rewards).
  if (world) {
    const target = findFactionTarget(npc, world);
    if (target) {
      npc.factionTargetId = target.id;
      npc.mood = 'hostile';
      npc.targetX = target.x;
      npc.targetZ = target.z;
      moveToward(npc, delta, npc.speed);
      const fdx = target.x - npc.x;
      const fdz = target.z - npc.z;
      if (
        fdx * fdx + fdz * fdz < MELEE_RANGE * MELEE_RANGE &&
        npc.attackCd <= 0
      ) {
        npc.attackCd = 1.1;
        applyNpcMelee(npc, target);
      }
      clampToWorld(npc);
      return;
    }
    npc.factionTargetId = null;
  }

  decideMood(npc, p, distSq, world);

  if (npc.mood === 'fleeing') {
    npc.targetX = npc.x - dx * 3;
    npc.targetZ = npc.z - dz * 3;
    moveToward(npc, delta, npc.speed * 1.3);
  } else if (npc.mood === 'hostile') {
    npc.targetX = p.x;
    npc.targetZ = p.z;
    moveToward(npc, delta, npc.speed);
    if (distSq < MELEE_RANGE * MELEE_RANGE && npc.attackCd <= 0) {
      npc.attackCd = npc.type === 'police' && p.wanted >= 3 ? 0.85 : 1.1;
      // Police hit harder when the city wants you dead.
      const heatBonus = npc.type === 'police' ? Math.min(5, p.wanted) * 3 : 0;
      events.push({
        kind: 'damage',
        amount: BASE[npc.type].dmg + heatBonus,
      });
    }
  } else {
    npc.wanderCd -= delta;
    if (npc.wanderCd <= 0) {
      npc.wanderCd = 3 + Math.random() * 4;
      npc.targetX = npc.homeX + (Math.random() - 0.5) * 18;
      npc.targetZ = npc.homeZ + (Math.random() - 0.5) * 18;
    }
    moveToward(npc, delta, npc.speed * 0.5);
  }

  clampToWorld(npc);
}

function clampToWorld(npc: Npc): void {
  const r = Math.sqrt(npc.x * npc.x + npc.z * npc.z);
  if (r > WORLD_RADIUS) {
    npc.x = (npc.x / r) * WORLD_RADIUS;
    npc.z = (npc.z / r) * WORLD_RADIUS;
  }
}

// Nearest living rival-faction NPC within FACTION_RANGE, or null.
function findFactionTarget(npc: Npc, world: Npc[]): Npc | null {
  const enemies = ENEMIES_OF[npc.type];
  if (!enemies) return null;
  let best: Npc | null = null;
  let bestSq = FACTION_RANGE * FACTION_RANGE;
  for (const other of world) {
    if (other === npc || other.mood === 'dead') continue;
    if (!enemies.includes(other.type)) continue;
    const dx = other.x - npc.x;
    const dz = other.z - npc.z;
    const d = dx * dx + dz * dz;
    if (d < bestSq) {
      bestSq = d;
      best = other;
    }
  }
  return best;
}

// Does this npc see active combat (a hostile or freshly-hit npc) nearby?
function witnessesCombat(npc: Npc, world: Npc[]): boolean {
  const rSq = WITNESS_RANGE * WITNESS_RANGE;
  for (const other of world) {
    if (other === npc) continue;
    if (other.mood !== 'hostile' && other.hitFlash <= 0.01) continue;
    const dx = other.x - npc.x;
    const dz = other.z - npc.z;
    if (dx * dx + dz * dz < rSq) return true;
  }
  return false;
}

// NPC-vs-NPC melee: damages the victim without emitting player-reward events.
function applyNpcMelee(attacker: Npc, victim: Npc): void {
  if (victim.mood === 'dead') return;
  victim.health = Math.max(0, victim.health - BASE[attacker.type].dmg);
  victim.hitFlash = 1;
  if (victim.health <= 0) victim.mood = 'dead';
}

function decideMood(
  npc: Npc,
  p: PlayerSnapshot,
  distSq: number,
  world?: Npc[]
): void {
  const t = npc.type;
  // Safe zones and the post-spawn grace window are hard no-aggro: nobody
  // hunts a protected player, so the Spawn Sanctum is actually safe.
  if (isSafeZoneAt(p.x, p.z) || isSpawnProtected()) {
    npc.mood = 'calm';
    if (t === 'police') npc.speed = BASE.police.speed;
    return;
  }
  if (t === 'civilian') {
    const sawCombat = world ? witnessesCombat(npc, world) : false;
    npc.mood = p.wanted > 1 || p.kills > 5 || sawCombat ? 'fleeing' : 'calm';
  } else if (t === 'police') {
    // Heat escalation: each wanted star pulls cops from farther away and
    // they commit harder once the player is already a problem.
    const heat = Math.max(0, Math.min(5, p.wanted));
    const rangeMul = 1.2 + heat * 0.55;
    const rangeSq = AGGRO_RANGE * AGGRO_RANGE * rangeMul * rangeMul;
    const shouldHunt = heat > 0 || p.kills > 2;
    npc.mood = shouldHunt && distSq < rangeSq ? 'hostile' : 'calm';
    // Hot pursuits move faster.
    if (npc.mood === 'hostile') {
      npc.speed = BASE.police.speed * (1 + heat * 0.08);
    } else {
      npc.speed = BASE.police.speed;
    }
  } else if (t === 'gangster' || t === 'hitman' || t === 'boss') {
    // High heat makes crews twitchy too — they don't want your mess on them.
    const heatAggro = p.wanted >= 3 && distSq < AGGRO_RANGE * AGGRO_RANGE * 0.6;
    npc.mood =
      (p.reputation < 20 && distSq < AGGRO_RANGE * AGGRO_RANGE) || heatAggro
        ? 'hostile'
        : 'calm';
  } else {
    npc.mood = 'calm';
  }
}

function moveToward(npc: Npc, delta: number, speed: number): void {
  const dx = npc.targetX - npc.x;
  const dz = npc.targetZ - npc.z;
  const distSq = dx * dx + dz * dz;
  if (distSq > 0.25) {
    const dist = Math.sqrt(distSq);
    npc.x += (dx / dist) * speed * delta;
    npc.z += (dz / dist) * speed * delta;
    npc.rotation = Math.atan2(dx, dz);
  }
}

export function damageNpc(npc: Npc, amount: number, events: NpcEvent[]): void {
  if (npc.mood === 'dead') return;
  npc.health = Math.max(0, npc.health - amount);
  npc.hitFlash = 1;
  if (npc.health <= 0) {
    npc.mood = 'dead';
    const b = BASE[npc.type];
    events.push({ kind: 'kill', npc, rep: b.rep, money: b.money });
  }
}

export function npcColor(npc: Npc): string {
  if (npc.mood === 'dead') return '#3a3a3e';
  if (npc.hitFlash > 0.01) return '#e8554a';
  switch (npc.mood) {
    case 'hostile':
      return '#c03a30';
    case 'fleeing':
      return '#8a8d92';
    default:
      return TYPE_COLOR[npc.type];
  }
}

const TYPE_COLOR: Record<NpcType, string> = {
  civilian: '#9a9da2',
  dealer: '#b0863a',
  gangster: '#7d4a44',
  police: '#3f5566',
  hitman: '#6a4a6e',
  boss: '#a83228',
};
