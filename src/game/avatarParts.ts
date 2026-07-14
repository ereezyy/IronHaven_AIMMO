// Stage E (buildable half): data model for the future modular swappable-GLB
// avatar. No loader/UI yet — that work is blocked on external art assets —
// but shipping the schema now means saves, netcode and the creator can adopt
// part IDs early, and the GLB pipeline has a fixed contract to target.

import type { ArchetypeId } from './character';

/** Skeleton-attached slots a part GLB may occupy. */
export const AVATAR_SLOTS = [
  'head',
  'torso',
  'legs',
  'hands',
  'back',
  'weapon',
] as const;
export type AvatarSlot = (typeof AVATAR_SLOTS)[number];

/** One equippable GLB part. url is relative to /public. */
export interface AvatarPartDef {
  id: string;
  slot: AvatarSlot;
  name: string;
  /** GLB path, e.g. /models/parts/head_hood_01.glb (asset may not exist yet). */
  url: string;
  /** Archetypes allowed to equip; empty/undefined = all. */
  archetypes?: ArchetypeId[];
}

/** A player's current loadout: slot -> part id (missing slot = base model). */
export type AvatarParts = Partial<Record<AvatarSlot, string>>;

/** Registry of known parts, keyed by part id. */
export type AvatarPartRegistry = Record<string, AvatarPartDef>;

export function isAvatarSlot(v: string): v is AvatarSlot {
  return (AVATAR_SLOTS as readonly string[]).includes(v);
}

/**
 * Validate a loadout against a registry: drops unknown part ids, parts whose
 * slot key doesn't match their definition, and parts locked to other
 * archetypes. Returns a new object; never throws on malformed input
 * (loadouts will arrive from saves and, later, the network).
 */
export function sanitizeAvatarParts(
  parts: unknown,
  registry: AvatarPartRegistry,
  archetype?: ArchetypeId
): AvatarParts {
  const out: AvatarParts = {};
  if (typeof parts !== 'object' || parts === null) return out;
  for (const [slot, id] of Object.entries(parts as Record<string, unknown>)) {
    if (!isAvatarSlot(slot) || typeof id !== 'string') continue;
    const def = registry[id];
    if (!def || def.slot !== slot) continue;
    if (
      archetype &&
      def.archetypes &&
      def.archetypes.length > 0 &&
      !def.archetypes.includes(archetype)
    ) {
      continue;
    }
    out[slot] = id;
  }
  return out;
}

/**
 * Placeholder registry. Empty on purpose: entries land alongside their GLB
 * files so the registry can never reference art that doesn't ship.
 */
export const AVATAR_PART_REGISTRY: AvatarPartRegistry = {};
