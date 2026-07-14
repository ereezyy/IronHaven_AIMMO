// High-end MMORPG skill system — trees, ranks, passives, actives.

export type SkillTreeId = 'combat' | 'street' | 'ops' | 'focus';

export type PassiveKey =
  | 'damage'
  | 'critChance'
  | 'critMult'
  | 'maxHealth'
  | 'staminaDrain'
  | 'harvestYield'
  | 'fishChance'
  | 'craftCost'
  | 'driveSpeed'
  | 'xpBonus'
  | 'cooldown'
  | 'wantedDecay'
  | 'shopDiscount'
  | 'pvpDamage'
  | 'bossDamage'
  | 'huntDamage';

export type ActiveAbilityId =
  | 'adrenaline'
  | 'shadow_strike'
  | 'smoke_veil'
  | 'overdrive'
  | 'field_patch'
  | 'blood_mark'
  | 'scavenger_pulse'
  | 'focus_lock';

export interface SkillNode {
  id: string;
  tree: SkillTreeId;
  name: string;
  blurb: string;
  maxRank: number;
  /** Skill points per rank. */
  cost: number;
  /** Node ids that must be ranked ≥1. */
  requires: string[];
  /** Minimum character level. */
  minLevel: number;
  /** Passive bonuses per rank (additive). */
  passives?: Partial<Record<PassiveKey, number>>;
  /** Unlocks this active at rank 1. */
  unlocksActive?: ActiveAbilityId;
  icon: string;
  /** Grid position in tree UI (col 0–3, row 0–4). */
  col: number;
  row: number;
}

export interface ActiveAbility {
  id: ActiveAbilityId;
  name: string;
  blurb: string;
  cooldownMs: number;
  durationMs: number;
  /** Resource cost as stamina fraction 0–1 (optional). */
  staminaCost?: number;
  icon: string;
  color: string;
}

export const ACTIVE_ABILITIES: Record<ActiveAbilityId, ActiveAbility> = {
  adrenaline: {
    id: 'adrenaline',
    name: 'Adrenaline',
    blurb: '+35% damage for 8s.',
    cooldownMs: 28000,
    durationMs: 8000,
    staminaCost: 0.2,
    icon: 'fist',
    color: '#c03a30',
  },
  shadow_strike: {
    id: 'shadow_strike',
    name: 'Shadow Strike',
    blurb: 'Next melee hit deals 2.2× damage.',
    cooldownMs: 14000,
    durationMs: 6000,
    icon: 'kills',
    color: '#a855f7',
  },
  smoke_veil: {
    id: 'smoke_veil',
    name: 'Smoke Veil',
    blurb: 'Drop 1 heat and ghost for a moment.',
    cooldownMs: 45000,
    durationMs: 0,
    icon: 'wanted',
    color: '#8a8d92',
  },
  overdrive: {
    id: 'overdrive',
    name: 'Overdrive',
    blurb: '+40% vehicle speed for 10s.',
    cooldownMs: 32000,
    durationMs: 10000,
    icon: 'sprint',
    color: '#22d3ee',
  },
  field_patch: {
    id: 'field_patch',
    name: 'Field Patch',
    blurb: 'Restore 35% max HP.',
    cooldownMs: 40000,
    durationMs: 0,
    icon: 'health',
    color: '#3f7d4e',
  },
  blood_mark: {
    id: 'blood_mark',
    name: 'Blood Mark',
    blurb: '+25% PvP & boss damage for 12s.',
    cooldownMs: 35000,
    durationMs: 12000,
    icon: 'rep',
    color: '#ff2d6b',
  },
  scavenger_pulse: {
    id: 'scavenger_pulse',
    name: 'Scavenger Pulse',
    blurb: 'Next harvest yields double mats.',
    cooldownMs: 25000,
    durationMs: 15000,
    icon: 'cash',
    color: '#f5a524',
  },
  focus_lock: {
    id: 'focus_lock',
    name: 'Focus Lock',
    blurb: '+50% XP from kills for 20s.',
    cooldownMs: 60000,
    durationMs: 20000,
    icon: 'mana',
    color: '#c9a15a',
  },
};

export const SKILL_NODES: SkillNode[] = [
  // ── COMBAT ──
  {
    id: 'c_brutality',
    tree: 'combat',
    name: 'Brutality',
    blurb: '+4% all damage per rank.',
    maxRank: 5,
    cost: 1,
    requires: [],
    minLevel: 1,
    passives: { damage: 0.04 },
    icon: 'fist',
    col: 0,
    row: 0,
  },
  {
    id: 'c_precision',
    tree: 'combat',
    name: 'Precision',
    blurb: '+3% crit chance per rank.',
    maxRank: 5,
    cost: 1,
    requires: ['c_brutality'],
    minLevel: 3,
    passives: { critChance: 0.03 },
    icon: 'kills',
    col: 0,
    row: 1,
  },
  {
    id: 'c_execute',
    tree: 'combat',
    name: 'Execute',
    blurb: '+12% crit damage per rank.',
    maxRank: 3,
    cost: 1,
    requires: ['c_precision'],
    minLevel: 6,
    passives: { critMult: 0.12 },
    icon: 'kills',
    col: 0,
    row: 2,
  },
  {
    id: 'c_adrenaline',
    tree: 'combat',
    name: 'Adrenaline Protocol',
    blurb: 'Unlock active: Adrenaline.',
    maxRank: 1,
    cost: 2,
    requires: ['c_brutality'],
    minLevel: 4,
    unlocksActive: 'adrenaline',
    icon: 'sprint',
    col: 1,
    row: 1,
  },
  {
    id: 'c_shadow',
    tree: 'combat',
    name: 'Shadow Strike',
    blurb: 'Unlock active: Shadow Strike.',
    maxRank: 1,
    cost: 2,
    requires: ['c_precision'],
    minLevel: 8,
    unlocksActive: 'shadow_strike',
    icon: 'fist',
    col: 1,
    row: 2,
  },
  {
    id: 'c_hunter',
    tree: 'combat',
    name: 'Apex Hunter',
    blurb: '+8% damage to wildlife per rank.',
    maxRank: 4,
    cost: 1,
    requires: ['c_brutality'],
    minLevel: 2,
    passives: { huntDamage: 0.08 },
    icon: 'rep',
    col: 2,
    row: 1,
  },
  {
    id: 'c_slayer',
    tree: 'combat',
    name: 'Titan Slayer',
    blurb: '+7% damage to world bosses per rank.',
    maxRank: 4,
    cost: 1,
    requires: ['c_hunter', 'c_execute'],
    minLevel: 10,
    passives: { bossDamage: 0.07 },
    icon: 'wanted',
    col: 2,
    row: 3,
  },
  {
    id: 'c_blood',
    tree: 'combat',
    name: 'Blood Mark',
    blurb: 'Unlock active: Blood Mark.',
    maxRank: 1,
    cost: 2,
    requires: ['c_execute'],
    minLevel: 12,
    unlocksActive: 'blood_mark',
    passives: { pvpDamage: 0.05 },
    icon: 'health',
    col: 0,
    row: 3,
  },

  // ── STREET ──
  {
    id: 's_presence',
    tree: 'street',
    name: 'Street Presence',
    blurb: '+5% shop discount per rank.',
    maxRank: 4,
    cost: 1,
    requires: [],
    minLevel: 1,
    passives: { shopDiscount: 0.05 },
    icon: 'cash',
    col: 0,
    row: 0,
  },
  {
    id: 's_ghost',
    tree: 'street',
    name: 'Ghost Walk',
    blurb: 'Heat decays faster (+15% per rank).',
    maxRank: 3,
    cost: 1,
    requires: ['s_presence'],
    minLevel: 3,
    passives: { wantedDecay: 0.15 },
    icon: 'wanted',
    col: 0,
    row: 1,
  },
  {
    id: 's_smoke',
    tree: 'street',
    name: 'Smoke Veil',
    blurb: 'Unlock active: Smoke Veil.',
    maxRank: 1,
    cost: 2,
    requires: ['s_ghost'],
    minLevel: 5,
    unlocksActive: 'smoke_veil',
    icon: 'wanted',
    col: 1,
    row: 2,
  },
  {
    id: 's_fix',
    tree: 'street',
    name: 'Iron Will',
    blurb: '+6 max HP per rank.',
    maxRank: 5,
    cost: 1,
    requires: [],
    minLevel: 1,
    passives: { maxHealth: 6 },
    icon: 'health',
    col: 2,
    row: 0,
  },
  {
    id: 's_patch',
    tree: 'street',
    name: 'Field Medic',
    blurb: 'Unlock active: Field Patch.',
    maxRank: 1,
    cost: 2,
    requires: ['s_iron'],
    minLevel: 6,
    unlocksActive: 'field_patch',
    icon: 'health',
    col: 2,
    row: 2,
  },

  // ── OPS ──
  {
    id: 'o_scavenge',
    tree: 'ops',
    name: 'Scavenger',
    blurb: '+20% harvest yield per rank.',
    maxRank: 4,
    cost: 1,
    requires: [],
    minLevel: 1,
    passives: { harvestYield: 0.2 },
    icon: 'cash',
    col: 0,
    row: 0,
  },
  {
    id: 'o_pulse',
    tree: 'ops',
    name: 'Scavenger Pulse',
    blurb: 'Unlock active: Scavenger Pulse.',
    maxRank: 1,
    cost: 2,
    requires: ['o_scavenge'],
    minLevel: 4,
    unlocksActive: 'scavenger_pulse',
    icon: 'cash',
    col: 0,
    row: 1,
  },
  {
    id: 'o_angler',
    tree: 'ops',
    name: 'Neon Angler',
    blurb: 'Better rare fish odds (+8% weight per rank).',
    maxRank: 4,
    cost: 1,
    requires: [],
    minLevel: 1,
    passives: { fishChance: 0.08 },
    icon: 'mana',
    col: 1,
    row: 0,
  },
  {
    id: 'o_craft',
    tree: 'ops',
    name: 'Jury Rigger',
    blurb: '−8% craft material cost per rank.',
    maxRank: 3,
    cost: 1,
    requires: ['o_scavenge'],
    minLevel: 5,
    passives: { craftCost: 0.08 },
    icon: 'map',
    col: 0,
    row: 2,
  },
  {
    id: 'o_wheel',
    tree: 'ops',
    name: 'Wheelman',
    blurb: '+6% vehicle top speed per rank.',
    maxRank: 5,
    cost: 1,
    requires: [],
    minLevel: 2,
    passives: { driveSpeed: 0.06 },
    icon: 'sprint',
    col: 2,
    row: 0,
  },
  {
    id: 'o_overdrive',
    tree: 'ops',
    name: 'Overdrive',
    blurb: 'Unlock active: Overdrive.',
    maxRank: 1,
    cost: 2,
    requires: ['o_wheel'],
    minLevel: 7,
    unlocksActive: 'overdrive',
    icon: 'sprint',
    col: 2,
    row: 2,
  },

  // ── FOCUS ──
  {
    id: 'f_scholar',
    tree: 'focus',
    name: 'Street Scholar',
    blurb: '+5% XP gained per rank.',
    maxRank: 5,
    cost: 1,
    requires: [],
    minLevel: 1,
    passives: { xpBonus: 0.05 },
    icon: 'rep',
    col: 0,
    row: 0,
  },
  {
    id: 'f_lock',
    tree: 'focus',
    name: 'Focus Lock',
    blurb: 'Unlock active: Focus Lock.',
    maxRank: 1,
    cost: 2,
    requires: ['f_scholar'],
    minLevel: 5,
    unlocksActive: 'focus_lock',
    icon: 'mana',
    col: 0,
    row: 1,
  },
  {
    id: 'f_cool',
    tree: 'focus',
    name: 'Cool Head',
    blurb: '−6% ability cooldowns per rank.',
    maxRank: 4,
    cost: 1,
    requires: [],
    minLevel: 3,
    passives: { cooldown: 0.06 },
    icon: 'stamina',
    col: 1,
    row: 0,
  },
  {
    id: 'f_endurance',
    tree: 'focus',
    name: 'Endurance',
    blurb: '−8% stamina drain while sprinting per rank.',
    maxRank: 4,
    cost: 1,
    requires: ['f_cool'],
    minLevel: 4,
    passives: { staminaDrain: 0.08 },
    icon: 'stamina',
    col: 1,
    row: 1,
  },
  {
    id: 'f_vital',
    tree: 'focus',
    name: 'Vital Core',
    blurb: '+8 max HP per rank.',
    maxRank: 5,
    cost: 1,
    requires: ['f_scholar'],
    minLevel: 2,
    passives: { maxHealth: 8 },
    icon: 'health',
    col: 2,
    row: 1,
  },
];

export const TREE_META: Record<
  SkillTreeId,
  { name: string; color: string; blurb: string }
> = {
  combat: {
    name: 'Combat',
    color: '#c03a30',
    blurb: 'Damage, crits, hunters, and finishers.',
  },
  street: {
    name: 'Street',
    color: '#a855f7',
    blurb: 'Presence, heat control, survival.',
  },
  ops: {
    name: 'Ops',
    color: '#22d3ee',
    blurb: 'Harvest, fish, craft, and vehicles.',
  },
  focus: {
    name: 'Focus',
    color: '#c9a15a',
    blurb: 'XP, cooldowns, stamina, vitality.',
  },
};

export type SkillRanks = Record<string, number>;

export function emptyRanks(): SkillRanks {
  const r: SkillRanks = {};
  for (const n of SKILL_NODES) r[n.id] = 0;
  return r;
}

export function getNode(id: string): SkillNode | undefined {
  return SKILL_NODES.find((n) => n.id === id);
}

export function canRankUp(
  ranks: SkillRanks,
  nodeId: string,
  skillPoints: number,
  level: number
): { ok: boolean; reason?: string } {
  const node = getNode(nodeId);
  if (!node) return { ok: false, reason: 'Unknown skill' };
  const cur = ranks[nodeId] || 0;
  if (cur >= node.maxRank) return { ok: false, reason: 'Max rank' };
  if (level < node.minLevel)
    return { ok: false, reason: `Requires level ${node.minLevel}` };
  if (skillPoints < node.cost)
    return { ok: false, reason: `Need ${node.cost} SP` };
  for (const req of node.requires) {
    if ((ranks[req] || 0) < 1)
      return { ok: false, reason: `Requires ${getNode(req)?.name || req}` };
  }
  return { ok: true };
}

export interface SkillModifiers {
  damage: number;
  critChance: number;
  critMult: number;
  maxHealth: number;
  staminaDrain: number;
  harvestYield: number;
  fishChance: number;
  craftCost: number;
  driveSpeed: number;
  xpBonus: number;
  cooldown: number;
  wantedDecay: number;
  shopDiscount: number;
  pvpDamage: number;
  bossDamage: number;
  huntDamage: number;
}

export function baseModifiers(): SkillModifiers {
  return {
    damage: 1,
    critChance: 0.05,
    critMult: 1.5,
    maxHealth: 0,
    staminaDrain: 1,
    harvestYield: 1,
    fishChance: 0,
    craftCost: 1,
    driveSpeed: 1,
    xpBonus: 1,
    cooldown: 1,
    wantedDecay: 1,
    shopDiscount: 0,
    pvpDamage: 1,
    bossDamage: 1,
    huntDamage: 1,
  };
}

export function computeModifiers(ranks: SkillRanks): SkillModifiers {
  const m = baseModifiers();
  for (const node of SKILL_NODES) {
    const rank = ranks[node.id] || 0;
    if (rank <= 0 || !node.passives) continue;
    for (const [k, v] of Object.entries(node.passives)) {
      const key = k as PassiveKey;
      const add = (v || 0) * rank;
      if (key === 'damage') m.damage += add;
      else if (key === 'critChance') m.critChance += add;
      else if (key === 'critMult') m.critMult += add;
      else if (key === 'maxHealth') m.maxHealth += add;
      else if (key === 'staminaDrain')
        m.staminaDrain = Math.max(0.4, m.staminaDrain - add);
      else if (key === 'harvestYield') m.harvestYield += add;
      else if (key === 'fishChance') m.fishChance += add;
      else if (key === 'craftCost')
        m.craftCost = Math.max(0.5, m.craftCost - add);
      else if (key === 'driveSpeed') m.driveSpeed += add;
      else if (key === 'xpBonus') m.xpBonus += add;
      else if (key === 'cooldown') m.cooldown = Math.max(0.5, m.cooldown - add);
      else if (key === 'wantedDecay') m.wantedDecay += add;
      else if (key === 'shopDiscount') m.shopDiscount += add;
      else if (key === 'pvpDamage') m.pvpDamage += add;
      else if (key === 'bossDamage') m.bossDamage += add;
      else if (key === 'huntDamage') m.huntDamage += add;
    }
  }
  m.critChance = Math.min(0.55, m.critChance);
  m.shopDiscount = Math.min(0.4, m.shopDiscount);
  return m;
}

export function unlockedActives(ranks: SkillRanks): ActiveAbilityId[] {
  const list: ActiveAbilityId[] = [];
  for (const node of SKILL_NODES) {
    if ((ranks[node.id] || 0) >= 1 && node.unlocksActive) {
      list.push(node.unlocksActive);
    }
  }
  return list;
}

/** SP granted when reaching `newLevel` from `oldLevel`. */
export function skillPointsOnLevel(oldLevel: number, newLevel: number): number {
  let pts = 0;
  for (let L = oldLevel + 1; L <= newLevel; L++) {
    pts += 1;
    if (L % 5 === 0) pts += 1; // bonus every 5 levels
  }
  return pts;
}

export function applyCrit(
  baseDamage: number,
  mods: SkillModifiers,
  rng = Math.random
): { damage: number; crit: boolean } {
  const crit = rng() < mods.critChance;
  const dmg = Math.max(
    1,
    Math.round(baseDamage * mods.damage * (crit ? mods.critMult : 1))
  );
  return { damage: dmg, crit };
}
