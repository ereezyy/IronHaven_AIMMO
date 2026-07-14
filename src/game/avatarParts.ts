// Stage E: data model + registry for the modular swappable-GLB avatar.
// Parts are rigid props parented to skeleton bones at runtime
// (AvatarPartAttachment); this file stays pure data so saves, netcode and
// the creator share one contract.

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

/**
 * How a part hangs off the skeleton. pos/rot are bone-local but authored in
 * the part's world-meters frame — the loader applies them AFTER compensating
 * for the rig's centimeter bone space (soldier "Character" node scale 0.01),
 * so an author never thinks in centimeters here.
 */
export interface AvatarAttach {
  /** Colon-form bone name (runtime lookup also tries the sanitized form). */
  bone: string;
  /** Bone-local offset, world meters. */
  pos: [number, number, number];
  /** Bone-local euler rotation, radians. */
  rot: [number, number, number];
  /** World-size multiplier for the part mesh. */
  scale: number;
}

/** One equippable GLB part. url is relative to /public. */
export interface AvatarPartDef {
  id: string;
  slot: AvatarSlot;
  name: string;
  /** GLB path, e.g. /models/parts/blaster_kit/blaster-a.glb. */
  url: string;
  /** Archetypes allowed to equip; empty/undefined = all. */
  archetypes?: ArchetypeId[];
  /** Attach override; defaults to DEFAULT_SLOT_ATTACH for the slot. */
  attach?: AvatarAttach;
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

// Blaster-kit props are modeled with the long axis on +Z; the grip transform
// points that barrel forward from the right palm, the back mount stands the
// prop upright against the spine.
const WEAPON_GRIP: AvatarAttach = {
  bone: 'mixamorig:RightHand',
  pos: [0, 0.07, 0.03],
  rot: [-Math.PI / 2, 0, 0],
  scale: 1,
};

const BACK_MOUNT: AvatarAttach = {
  bone: 'mixamorig:Spine2',
  pos: [0, -0.05, -0.15],
  rot: [Math.PI / 2, 0, 0],
  scale: 1,
};

/** Fallback attach per slot; null = slot has no mount point yet. */
export const DEFAULT_SLOT_ATTACH: Record<AvatarSlot, AvatarAttach | null> = {
  head: null,
  torso: null,
  legs: null,
  hands: null,
  back: BACK_MOUNT,
  weapon: WEAPON_GRIP,
};

const KIT = '/models/parts/blaster_kit';

/** Registry entries land alongside their GLB files (CC0 blaster kit). */
export const AVATAR_PART_REGISTRY: AvatarPartRegistry = {
  weapon_blaster_a: {
    id: 'weapon_blaster_a',
    slot: 'weapon',
    name: 'Blaster A',
    url: `${KIT}/blaster-a.glb`,
  },
  weapon_blaster_h: {
    id: 'weapon_blaster_h',
    slot: 'weapon',
    name: 'Compact Blaster',
    url: `${KIT}/blaster-h.glb`,
    archetypes: ['runner', 'ghost'],
  },
  weapon_blaster_d: {
    id: 'weapon_blaster_d',
    slot: 'weapon',
    name: 'Heavy Blaster',
    url: `${KIT}/blaster-d.glb`,
    archetypes: ['enforcer'],
  },
  weapon_blaster_e: {
    id: 'weapon_blaster_e',
    slot: 'weapon',
    name: 'Long Rifle',
    url: `${KIT}/blaster-e.glb`,
    archetypes: ['ghost', 'enforcer'],
    // The 1.635m rifle reads comically long at full size; ~0.9m equipped.
    attach: { ...WEAPON_GRIP, scale: 0.55 },
  },
  weapon_blaster_p: {
    id: 'weapon_blaster_p',
    slot: 'weapon',
    name: 'Dealmaker',
    url: `${KIT}/blaster-p.glb`,
    archetypes: ['fixer'],
  },
  back_field_crate: {
    id: 'back_field_crate',
    slot: 'back',
    name: 'Field Crate',
    url: `${KIT}/crate-small.glb`,
    // ~0.55×0.23×0.8m crate shrunk so it reads as a pack, not cargo.
    attach: { ...BACK_MOUNT, scale: 0.45 },
  },
};

/** Registry entries for a slot, honoring archetype locks. */
export function partsForSlot(
  slot: AvatarSlot,
  archetype?: ArchetypeId
): AvatarPartDef[] {
  return Object.values(AVATAR_PART_REGISTRY).filter(
    (def) =>
      def.slot === slot &&
      (!archetype ||
        !def.archetypes ||
        def.archetypes.length === 0 ||
        def.archetypes.includes(archetype))
  );
}
