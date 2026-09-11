// Additive fire-aim pose for the soldier rig.
// Same mixer-then-nudge convention as hitReaction: Idle/Walk/Run already
// posed the skeleton this frame; we layer a right-arm raise so the weapon
// (parented to mixamorig:RightHand) comes up instead of hanging at rest.

import type { BoneFlinch } from './hitReaction';

/**
 * Mixamo idle hangs the right arm at the hip, so the blaster sits holstered.
 * These amplitudes are large on purpose — a 0.3 rad flinch would not read as
 * "raised to fire". Tuned against mixamorig local axes on soldier.glb.
 */
export const FIRE_AIM: BoneFlinch[] = [
  { bone: 'mixamorig:Spine2', amplitude: [0.1, 0.04, 0] },
  { bone: 'mixamorig:RightShoulder', amplitude: [0.28, 0.08, 0.62] },
  { bone: 'mixamorig:RightArm', amplitude: [-1.22, 0.18, -0.52] },
  { bone: 'mixamorig:RightForeArm', amplitude: [-0.42, 0.05, 0.16] },
  { bone: 'mixamorig:RightHand', amplitude: [-0.28, 0.06, 0.38] },
];

/**
 * Keep the gun up through most of the 1→0 fire decay, then drop it.
 * sqrt holds ~0.7 strength at fire=0.5; cubic flinch would already be 0.125.
 */
export function aimStrength(fire: number): number {
  const f = Math.min(1, Math.max(0, fire));
  return Math.sqrt(f);
}

/** Extra kick on the arm at the instant of the shot (dies faster than hold). */
export function recoilKick(fire: number): number {
  const f = Math.min(1, Math.max(0, fire));
  return f * f;
}

export const FIRE_AIM_DECAY_PER_SEC = 1.55;
