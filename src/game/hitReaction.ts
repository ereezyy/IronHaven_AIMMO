// Pure math for Stage D hit reactions + death collapse on the soldier rig.
// No three imports — CharacterModel resolves bone names against the skeleton
// and applies these angles additively AFTER the animation mixer updates, so
// flinches layer on top of Idle/Walk/Run instead of replacing them.

/** Additive flinch recipe for one bone (mixamorig naming, colon variant). */
export interface BoneFlinch {
  /** Bone name as it appears in soldier.glb's skeleton. */
  bone: string;
  /** Peak additive rotation (radians) at flinch strength 1. */
  amplitude: [number, number, number];
}

/**
 * Upper-body recoil: spine snaps back, neck/head whip slightly further and
 * off-axis so the reaction reads organic rather than hinged. Driven by the
 * same 1→0 flash signal that powers the emissive hit feedback.
 */
export const HIT_FLINCH: BoneFlinch[] = [
  { bone: 'mixamorig:Spine1', amplitude: [-0.18, 0, 0] },
  { bone: 'mixamorig:Spine2', amplitude: [-0.3, 0.05, 0] },
  { bone: 'mixamorig:Neck', amplitude: [-0.22, -0.08, 0] },
  { bone: 'mixamorig:Head', amplitude: [-0.35, 0.12, 0.06] },
];

/**
 * Shape the linear 1→0 flash decay into a snappier flinch: instant hit at
 * strength 1, fast ease-out so the pose recovers before the glow does.
 */
export function flinchStrength(flash: number): number {
  const f = Math.min(1, Math.max(0, flash));
  return f * f * f;
}

/** Seconds from death trigger to fully collapsed. */
export const DEATH_COLLAPSE_DURATION = 1.1;

/**
 * Eased 0→1 collapse progress. Ease-in (gravity: slow buckle, fast fall)
 * with a hard clamp at 1 so the body stays down until respawn remounts.
 */
export function collapseProgress(elapsedSeconds: number): number {
  const t = Math.min(1, Math.max(0, elapsedSeconds / DEATH_COLLAPSE_DURATION));
  return t * t * (3 - 2 * t) * t; // smoothstep * t: soft start, weighted end
}

export interface CollapsePose {
  /** Pitch of the whole model around the feet (radians; backward fall). */
  pitch: number;
  /** Animation mixer time scale — locomotion dies with the character. */
  mixerScale: number;
  /** Extra knee-buckle sink (fraction of model height). */
  sink: number;
}

/** Resolve collapse progress into the pose CharacterModel applies. */
export function collapsePose(progress: number): CollapsePose {
  const p = Math.min(1, Math.max(0, progress));
  return {
    pitch: -(Math.PI / 2) * 0.92 * p,
    mixerScale: Math.max(0, 1 - p * 2.5),
    sink: 0.08 * p,
  };
}
