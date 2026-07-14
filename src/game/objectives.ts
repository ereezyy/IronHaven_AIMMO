// Progressive street objectives for the live MMO loop.
// Pure functions — HUD renders the list; MMOGame supplies the snapshot.

import { levelFromXp } from './progression';

export interface ObjectiveSnapshot {
  talked: boolean;
  kills: number;
  money: number;
  reputation: number;
  hasWeapon: boolean;
  combatSkill: number;
}

export interface StreetObjective {
  id: string;
  label: string;
  done: boolean;
  /** Cash reward paid once when the objective first completes. */
  reward: number;
}

const COMBAT_BASELINE = 10;

/**
 * Ordered street contracts. Early steps teach the loop (talk → fight → shop);
 * later ones are longer-term goals that stay on the board after the tutorial.
 */
export function buildStreetObjectives(s: ObjectiveSnapshot): StreetObjective[] {
  return [
    {
      id: 'talk',
      label: 'Talk to someone on the street (E)',
      done: s.talked,
      reward: 50,
    },
    {
      id: 'kill',
      label: `Drop a body (${Math.min(s.kills, 1)}/1 kill)`,
      done: s.kills >= 1,
      reward: 100,
    },
    {
      id: 'arm',
      label: s.hasWeapon
        ? 'Arm up — weapon equipped'
        : 'Buy a weapon at the black market (B)',
      done: s.hasWeapon,
      reward: 75,
    },
    {
      id: 'train',
      label: `Train combat (${Math.min(s.combatSkill, 15)}/15)`,
      done: s.combatSkill >= 15,
      reward: 100,
    },
    {
      id: 'cash',
      label: `Stack paper ($${Math.min(s.money, 2500)}/2500)`,
      done: s.money >= 2500,
      reward: 200,
    },
    {
      id: 'rep',
      label: `Make a name (rep ${Math.min(s.reputation, 40)}/40)`,
      done: s.reputation >= 40,
      reward: 250,
    },
  ];
}

/**
 * Legacy helpers — prefer levelFromXp(totalXp) from progression.ts.
 * Kept so older call sites still compile; reputation is no longer the XP source.
 */
export function streetLevel(totalXpOrRep: number): number {
  // If value looks like raw XP (>= 100 possible at low levels), treat as XP.
  // Call sites that still pass reputation get a weak fallback.
  return levelFromXp(totalXpOrRep).level;
}

export function streetExperience(totalXp: number): {
  experience: number;
  maxExperience: number;
} {
  const info = levelFromXp(totalXp);
  return {
    experience: info.xpIntoLevel,
    maxExperience: info.xpForLevel,
  };
}

/**
 * Combat skill scales weapon damage. Baseline skill (10) is ~1.0×;
 * max skill (50) is 1.8×. Keeps early fists weak and upgrades meaningful.
 */
export function scaleDamage(baseDamage: number, combatSkill: number): number {
  const skill = Math.max(COMBAT_BASELINE, combatSkill);
  const mult = 0.8 + skill / 50;
  return Math.max(1, Math.round(baseDamage * mult));
}

/** Attack cooldown from weapon fire rate (ms). */
export function attackCooldownMs(fireRate: number): number {
  const rate = Math.max(0.4, fireRate);
  return Math.round(1000 / rate);
}
