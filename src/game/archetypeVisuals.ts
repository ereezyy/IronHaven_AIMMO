// Per-archetype procedural silhouette recipes (no new art).
//
// Each archetype maps to a set of primitive attachments layered over the shared
// soldier model, carrying the 2D ArchetypeSilhouette language into 3D:
//   runner   — light scarf + satchel strap (fast, unburdened)
//   enforcer — chest plate + shoulder pauldron (heavy, front-line)
//   ghost    — hood dome + visor slit (quiet, obscured)
//   fixer    — long-coat lapels + deal case (dealmaker)
//
// Anchors are expressed as fractions of the model's height (never raw width) so a
// T/A-pose bind arm span never pushes attachments out to the fingertips. This is
// pure data: no THREE, no side effects — CharacterModel resolves fractions to
// world units against its measured rig and renders each attachment.

import type { ArchetypeId } from './character';

export type PrimitiveKind = 'box' | 'sphere' | 'cylinder';

/** Which customization color drives an attachment's material. */
export type ColorRole = 'tint' | 'accent' | 'accent2' | 'skin';

export interface Attachment {
  kind: PrimitiveKind;
  /** Position as height-fractions from the model floor (y) / center (x,z). */
  pos: [x: number, y: number, z: number];
  /** Size as height-fractions. box=[w,h,d]; sphere=[r]; cylinder=[rTop,rBot,h]. */
  size: number[];
  /** Euler rotation in radians. */
  rot?: [x: number, y: number, z: number];
  color: ColorRole;
  metalness?: number;
  roughness?: number;
  /** Upper polar cap sweep for dome-like spheres (radians). */
  thetaLength?: number;
}

export interface ArchetypeRecipe {
  id: ArchetypeId;
  attachments: Attachment[];
}

// Height-fraction anchors kept in one place so silhouettes stay proportional.
const SHOULDER_X = 0.17;
const SHOULDER_Y = 0.8;
const CHEST_Y = 0.66;
const HEAD_Y = 0.95;

const RECIPES: Record<ArchetypeId, ArchetypeRecipe> = {
  // Runner — thin scarf across the collar + a diagonal satchel strap.
  runner: {
    id: 'runner',
    attachments: [
      {
        kind: 'box',
        pos: [0, SHOULDER_Y + 0.02, 0.06],
        size: [0.2, 0.05, 0.06],
        color: 'accent',
        roughness: 0.9,
        metalness: 0,
      },
      {
        kind: 'box',
        pos: [0.06, CHEST_Y + 0.04, 0.08],
        size: [0.03, 0.32, 0.03],
        rot: [0, 0, 0.5],
        color: 'accent2',
        roughness: 0.8,
        metalness: 0.1,
      },
    ],
  },
  // Enforcer — bulky chest plate + a single dominant shoulder pauldron.
  enforcer: {
    id: 'enforcer',
    attachments: [
      {
        kind: 'box',
        pos: [0, CHEST_Y, 0.1],
        size: [0.26, 0.24, 0.1],
        color: 'accent2',
        metalness: 0.55,
        roughness: 0.45,
      },
      {
        kind: 'sphere',
        pos: [-SHOULDER_X - 0.02, SHOULDER_Y + 0.02, 0],
        size: [0.12],
        color: 'accent2',
        metalness: 0.6,
        roughness: 0.4,
      },
    ],
  },
  // Ghost — low hood dome over the head + a slim visor slit in accent.
  ghost: {
    id: 'ghost',
    attachments: [
      {
        kind: 'sphere',
        pos: [0, HEAD_Y - 0.02, 0],
        size: [0.1],
        color: 'tint',
        thetaLength: Math.PI * 0.62,
        metalness: 0.1,
        roughness: 0.85,
      },
      {
        kind: 'box',
        pos: [0, HEAD_Y - 0.04, 0.09],
        size: [0.11, 0.02, 0.02],
        color: 'accent',
        metalness: 0.3,
        roughness: 0.3,
      },
    ],
  },
  // Fixer — long-coat lapels down the torso + a boxy deal case at the hip.
  fixer: {
    id: 'fixer',
    attachments: [
      {
        kind: 'box',
        pos: [0, CHEST_Y - 0.12, 0.07],
        size: [0.22, 0.42, 0.05],
        color: 'tint',
        roughness: 0.75,
        metalness: 0.05,
      },
      {
        kind: 'box',
        pos: [SHOULDER_X + 0.06, CHEST_Y - 0.28, 0.02],
        size: [0.1, 0.14, 0.05],
        color: 'accent2',
        metalness: 0.5,
        roughness: 0.5,
      },
    ],
  },
};

/** Resolve the attachment recipe for an archetype (empty if unknown). */
export function archetypeAttachments(archetype: ArchetypeId): Attachment[] {
  return RECIPES[archetype]?.attachments ?? [];
}

export { RECIPES as ARCHETYPE_RECIPES };
