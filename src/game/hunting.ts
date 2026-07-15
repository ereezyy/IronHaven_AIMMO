// Open-world hunting targets — pure spawn + combat data.

import { isSafeZoneAt, isSpawnProtected } from './zones';

export type PreyId =
  | 'street_rat'
  | 'chrome_hound'
  | 'neon_stag'
  | 'drone_pest'
  | 'void_boar';

export interface PreyDef {
  id: PreyId;
  name: string;
  maxHealth: number;
  damage: number;
  speed: number;
  aggroRange: number;
  fleeHealth: number; // flee below this fraction
  xp: number;
  money: number;
  color: string;
  scale: number;
}

export const PREY: Record<PreyId, PreyDef> = {
  street_rat: {
    id: 'street_rat',
    name: 'Street Rat',
    maxHealth: 35,
    damage: 4,
    speed: 6.5,
    aggroRange: 8,
    fleeHealth: 0.4,
    xp: 28,
    money: 15,
    color: '#6a6560',
    scale: 0.55,
  },
  chrome_hound: {
    id: 'chrome_hound',
    name: 'Chrome Hound',
    maxHealth: 90,
    damage: 12,
    speed: 7.2,
    aggroRange: 14,
    fleeHealth: 0.25,
    xp: 55,
    money: 40,
    color: '#8a9aa8',
    scale: 0.9,
  },
  neon_stag: {
    id: 'neon_stag',
    name: 'Neon Stag',
    maxHealth: 120,
    damage: 8,
    speed: 8.5,
    aggroRange: 12,
    fleeHealth: 0.55,
    xp: 70,
    money: 55,
    color: '#22d3ee',
    scale: 1.1,
  },
  drone_pest: {
    id: 'drone_pest',
    name: 'Drone Pest',
    maxHealth: 60,
    damage: 10,
    speed: 5.5,
    aggroRange: 16,
    fleeHealth: 0.15,
    xp: 48,
    money: 35,
    color: '#c03a30',
    scale: 0.7,
  },
  void_boar: {
    id: 'void_boar',
    name: 'Void Boar',
    maxHealth: 200,
    damage: 18,
    speed: 5.8,
    aggroRange: 18,
    fleeHealth: 0.2,
    xp: 110,
    money: 90,
    color: '#a855f7',
    scale: 1.25,
  },
};

export type PreyMood = 'wander' | 'flee' | 'hostile' | 'dead';

export interface PreyRuntime {
  id: string;
  defId: PreyId;
  x: number;
  z: number;
  homeX: number;
  homeZ: number;
  health: number;
  mood: PreyMood;
  rotation: number;
  attackCd: number;
  hitFlash: number;
  wanderCd: number;
  respawnAt: number;
}

export interface PreyEvent {
  kind: 'damage_player' | 'prey_kill';
  amount?: number;
  xp?: number;
  money?: number;
  preyId?: PreyId;
  name?: string;
}

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

const SPAWN_TABLE: PreyId[] = [
  'street_rat',
  'street_rat',
  'street_rat',
  'chrome_hound',
  'chrome_hound',
  'neon_stag',
  'drone_pest',
  'drone_pest',
  'void_boar',
];

export function createPreyHerd(count = 18, seed = 0x4877): PreyRuntime[] {
  const rng = mulberry32(seed);
  const list: PreyRuntime[] = [];
  for (let i = 0; i < count; i++) {
    const defId = SPAWN_TABLE[i % SPAWN_TABLE.length];
    const def = PREY[defId];
    const angle = rng() * Math.PI * 2;
    const radius = 20 + rng() * 70;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    list.push({
      id: `prey_${i}`,
      defId,
      x,
      z,
      homeX: x,
      homeZ: z,
      health: def.maxHealth,
      mood: 'wander',
      rotation: rng() * Math.PI * 2,
      attackCd: 0,
      hitFlash: 0,
      wanderCd: rng() * 3,
      respawnAt: 0,
    });
  }
  return list;
}

/** @deprecated alias */
export const createPreyHerdSeeded = createPreyHerd;

const WORLD_R = 98;
const MELEE = 2.2;

export function tickPrey(
  p: PreyRuntime,
  player: { x: number; z: number; alive: boolean },
  delta: number,
  now: number,
  events: PreyEvent[]
): void {
  const def = PREY[p.defId];

  if (p.mood === 'dead') {
    if (now >= p.respawnAt) {
      p.mood = 'wander';
      p.health = def.maxHealth;
      p.x = p.homeX + (Math.random() - 0.5) * 8;
      p.z = p.homeZ + (Math.random() - 0.5) * 8;
    }
    return;
  }

  if (p.hitFlash > 0) p.hitFlash = Math.max(0, p.hitFlash - delta * 3);
  if (p.attackCd > 0) p.attackCd -= delta;

  const dx = player.x - p.x;
  const dz = player.z - p.z;
  const distSq = dx * dx + dz * dz;
  const frac = p.health / def.maxHealth;

  // Protected players (safe zone / spawn grace) never draw aggro.
  const protectedPlayer =
    isSafeZoneAt(player.x, player.z) || isSpawnProtected();
  if (
    !protectedPlayer &&
    player.alive &&
    distSq < def.aggroRange * def.aggroRange
  ) {
    if (frac < def.fleeHealth) p.mood = 'flee';
    else p.mood = defIdIsAggressive(p.defId) ? 'hostile' : 'flee';
  } else if (p.mood !== 'wander') {
    p.mood = 'wander';
  }

  if (p.mood === 'flee') {
    const dist = Math.sqrt(distSq) || 1;
    p.x -= (dx / dist) * def.speed * 1.25 * delta;
    p.z -= (dz / dist) * def.speed * 1.25 * delta;
    p.rotation = Math.atan2(-dx, -dz);
  } else if (p.mood === 'hostile') {
    const dist = Math.sqrt(distSq) || 1;
    p.x += (dx / dist) * def.speed * delta;
    p.z += (dz / dist) * def.speed * delta;
    p.rotation = Math.atan2(dx, dz);
    if (distSq < MELEE * MELEE && p.attackCd <= 0) {
      p.attackCd = 1.0;
      events.push({ kind: 'damage_player', amount: def.damage });
    }
  } else {
    p.wanderCd -= delta;
    if (p.wanderCd <= 0) {
      p.wanderCd = 2 + Math.random() * 4;
      p.x += (Math.random() - 0.5) * 6;
      p.z += (Math.random() - 0.5) * 6;
    }
  }

  const r = Math.sqrt(p.x * p.x + p.z * p.z);
  if (r > WORLD_R) {
    p.x = (p.x / r) * WORLD_R;
    p.z = (p.z / r) * WORLD_R;
  }
}

function defIdIsAggressive(id: PreyId): boolean {
  return id === 'chrome_hound' || id === 'drone_pest' || id === 'void_boar';
}

export function damagePrey(
  p: PreyRuntime,
  amount: number,
  now: number,
  events: PreyEvent[]
): void {
  if (p.mood === 'dead') return;
  const def = PREY[p.defId];
  p.health = Math.max(0, p.health - amount);
  p.hitFlash = 1;
  if (p.health / def.maxHealth < def.fleeHealth) p.mood = 'flee';
  else if (defIdIsAggressive(p.defId)) p.mood = 'hostile';
  if (p.health <= 0) {
    p.mood = 'dead';
    p.respawnAt = now + 45000;
    events.push({
      kind: 'prey_kill',
      xp: def.xp,
      money: def.money,
      preyId: p.defId,
      name: def.name,
    });
  }
}

export const HUNT_MELEE_RANGE = 2.8;
