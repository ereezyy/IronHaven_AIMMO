// World bosses — pure state + tick for open-world PvE.

export interface BossDef {
  id: string;
  name: string;
  title: string;
  x: number;
  z: number;
  maxHealth: number;
  damage: number;
  speed: number;
  aggroRange: number;
  meleeRange: number;
  color: string;
  rewardMoney: number;
  rewardRep: number;
  /** Respawns this many ms after death. */
  respawnMs: number;
}

export interface BossRuntime {
  def: BossDef;
  health: number;
  mood: 'idle' | 'enraged' | 'dead' | 'windup';
  targetPlayer: boolean;
  attackCd: number;
  hitFlash: number;
  deadUntil: number;
  rotation: number;
  /** Telegraph window end timestamp. */
  telegraphUntil: number;
}

export const WORLD_BOSSES: BossDef[] = [
  {
    id: 'boss_titan',
    name: 'IRON TITAN',
    title: 'District Apex',
    x: -10,
    z: 55,
    maxHealth: 2500,
    damage: 28,
    speed: 5.5,
    aggroRange: 28,
    meleeRange: 3.2,
    color: '#a855f7',
    rewardMoney: 2500,
    rewardRep: 40,
    respawnMs: 90000,
  },
  {
    id: 'boss_wraith',
    name: 'GRID WRAITH',
    title: 'Circuit Phantom',
    x: 5,
    z: -52,
    maxHealth: 1600,
    damage: 22,
    speed: 7,
    aggroRange: 24,
    meleeRange: 2.8,
    color: '#22d3ee',
    rewardMoney: 1600,
    rewardRep: 28,
    respawnMs: 70000,
  },
];

export function createBossRuntime(def: BossDef): BossRuntime {
  return {
    def,
    health: def.maxHealth,
    mood: 'idle',
    targetPlayer: false,
    attackCd: 0,
    hitFlash: 0,
    deadUntil: 0,
    rotation: 0,
    telegraphUntil: 0,
  };
}

export interface BossLoot {
  money: number;
  rep: number;
  /** Optional bag resource drops. */
  scrap?: number;
  circuits?: number;
  chems?: number;
  label: string;
}

export interface BossEvent {
  kind: 'damage_player' | 'boss_kill' | 'telegraph';
  amount?: number;
  bossId?: string;
  money?: number;
  rep?: number;
  loot?: BossLoot;
  /** Wind-up seconds for telegraphs. */
  telegraphMs?: number;
}

/** Roll loot table on boss death. */
export function rollBossLoot(def: BossDef, rng = Math.random): BossLoot {
  const bonus = rng() > 0.55;
  return {
    money: def.rewardMoney + (bonus ? Math.round(def.rewardMoney * 0.25) : 0),
    rep: def.rewardRep,
    scrap: 2 + Math.floor(rng() * 4),
    circuits: rng() > 0.4 ? 1 + Math.floor(rng() * 2) : 0,
    chems: rng() > 0.7 ? 1 : 0,
    label: bonus ? 'Rare cache' : 'Boss spoils',
  };
}

export function tickBoss(
  b: BossRuntime,
  player: { x: number; z: number; alive: boolean },
  delta: number,
  now: number,
  events: BossEvent[]
): void {
  if (b.mood === 'dead') {
    if (now >= b.deadUntil) {
      b.mood = 'idle';
      b.health = b.def.maxHealth;
      b.targetPlayer = false;
    }
    return;
  }

  if (b.hitFlash > 0) b.hitFlash = Math.max(0, b.hitFlash - delta * 3);
  if (b.attackCd > 0) b.attackCd -= delta;

  const dx = player.x - b.def.x;
  const dz = player.z - b.def.z;
  // Bosses are fixed arena anchors but "lunge" conceptually via range checks.
  // We store offset on def for spawn; runtime moves a local offset.
  const px = (b as BossRuntime & { _x?: number })._x ?? b.def.x;
  const pz = (b as BossRuntime & { _z?: number })._z ?? b.def.z;
  const pdx = player.x - px;
  const pdz = player.z - pz;
  const distSq = pdx * pdx + pdz * pdz;
  const aggro = b.def.aggroRange;

  if (player.alive && distSq < aggro * aggro) {
    b.mood = 'enraged';
    b.targetPlayer = true;
    b.rotation = Math.atan2(pdx, pdz);
    // Move toward player but stay near home.
    const dist = Math.sqrt(distSq) || 1;
    const sp = b.def.speed * delta;
    let nx = px + (pdx / dist) * sp;
    let nz = pz + (pdz / dist) * sp;
    const hdx = nx - b.def.x;
    const hdz = nz - b.def.z;
    const homeR = 18;
    if (hdx * hdx + hdz * hdz > homeR * homeR) {
      const hr = Math.sqrt(hdx * hdx + hdz * hdz);
      nx = b.def.x + (hdx / hr) * homeR;
      nz = b.def.z + (hdz / hr) * homeR;
    }
    (b as BossRuntime & { _x?: number })._x = nx;
    (b as BossRuntime & { _z?: number })._z = nz;

    const ndx = player.x - nx;
    const ndz = player.z - nz;
    const inMelee = ndx * ndx + ndz * ndz < b.def.meleeRange * b.def.meleeRange;

    // Telegraph → strike: wind-up gives players a beat to dodge.
    if (b.mood === 'windup') {
      if (now >= b.telegraphUntil) {
        b.mood = 'enraged';
        b.attackCd = 1.4;
        if (inMelee) {
          events.push({ kind: 'damage_player', amount: b.def.damage });
        }
      }
    } else if (inMelee && b.attackCd <= 0) {
      b.mood = 'windup';
      b.telegraphUntil = now + 650;
      events.push({
        kind: 'telegraph',
        bossId: b.def.id,
        telegraphMs: 650,
      });
    }
  } else {
    b.mood = 'idle';
    b.targetPlayer = false;
    // Drift home.
    const curX = (b as BossRuntime & { _x?: number })._x ?? b.def.x;
    const curZ = (b as BossRuntime & { _z?: number })._z ?? b.def.z;
    (b as BossRuntime & { _x?: number })._x =
      curX + (b.def.x - curX) * Math.min(1, delta * 0.8);
    (b as BossRuntime & { _z?: number })._z =
      curZ + (b.def.z - curZ) * Math.min(1, delta * 0.8);
  }
}

export function bossPosition(b: BossRuntime): { x: number; z: number } {
  return {
    x: (b as BossRuntime & { _x?: number })._x ?? b.def.x,
    z: (b as BossRuntime & { _z?: number })._z ?? b.def.z,
  };
}

export function damageBoss(
  b: BossRuntime,
  amount: number,
  now: number,
  events: BossEvent[]
): void {
  if (b.mood === 'dead') return;
  b.health = Math.max(0, b.health - amount);
  b.hitFlash = 1;
  b.mood = 'enraged';
  if (b.health <= 0) {
    b.mood = 'dead';
    b.deadUntil = now + b.def.respawnMs;
    const loot = rollBossLoot(b.def);
    events.push({
      kind: 'boss_kill',
      bossId: b.def.id,
      money: loot.money,
      rep: loot.rep,
      loot,
    });
  }
}
