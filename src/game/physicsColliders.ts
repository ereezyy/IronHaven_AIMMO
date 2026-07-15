// Pure data for the Rapier physics world (Stage C). No three/rapier imports
// so it stays unit-testable in node without wasm or a WebGL context.
//
// Conventions (must match MMOPlayer + cityLayout):
// - Ground surface is y=0; the player's kinematic body center rides at y=1.
// - CITY_BUILDINGS.position is the box CENTER (y = height/2), size is FULL
//   extents; Rapier cuboids want HALF extents.

import { CITY_BUILDINGS, CITY_RADIUS } from './cityLayout';
import { SAFEHOUSE } from './safehouse';

export interface CuboidSpec {
  /** World-space center of the cuboid. */
  position: [number, number, number];
  /** Rapier half-extents (hx, hy, hz). */
  halfExtents: [number, number, number];
}

/**
 * Player capsule: total height 2 (= 2*halfHeight + 2*radius), so with the
 * body center at y=1 the capsule bottom touches the ground at y=0 — the
 * same "feet 1 unit below center" convention the old manual loop used.
 */
export const PLAYER_CAPSULE = {
  radius: 0.5,
  halfHeight: 0.5,
  /** Spawn height of the body center (feet on the ground). */
  centerY: 1,
} as const;

/** Character-controller tuning shared by gameplay and tests. */
export const CHARACTER_CONTROLLER = {
  /** Gap Rapier keeps between the capsule and the world (~4cm). */
  offset: 0.04,
  /** Climb curbs / low stairs without popping onto waist-high ledges. */
  autostepMaxHeight: 0.4,
  autostepMinWidth: 0.15,
  /** Enough downhill stickiness for curbs without over-snapping off drops. */
  snapToGroundDistance: 0.25,
  /** Max walkable slope (radians). */
  maxSlopeClimbAngle: (55 * Math.PI) / 180,
} as const;

/** Shared on-foot locomotion tuning for MMOPlayer. */
export const PLAYER_MOTION = {
  walkSpeed: 4.2,
  sprintSpeed: 8.4,
  acceleration: 34,
  friction: 12,
  jumpForce: 8.5,
  gravity: -25,
  groundedBias: -1.25,
  gamepadDeadzone: 0.18,
  staminaDrainPerSecond: 30,
  staminaRecoverPerSecond: 20,
} as const;

/** Static ground slab: top face exactly at y=0, wide enough for the r=100 world. */
export function groundColliderSpec(): CuboidSpec {
  const half = CITY_RADIUS + 50;
  return { position: [0, -1, 0], halfExtents: [half, 1, half] };
}

/** One fixed cuboid per city building, derived from the shared layout data. */
export function buildingColliderSpecs(): CuboidSpec[] {
  return CITY_BUILDINGS.map((b) => ({
    position: [b.position[0], b.position[1], b.position[2]],
    halfExtents: [b.size[0] / 2, b.size[1] / 2, b.size[2] / 2],
  }));
}

/** Safehouse shell (must match the SafehouseLayer mesh: 5 × 3.2 × 4 box). */
export function safehouseColliderSpec(): CuboidSpec {
  const [x, , z] = SAFEHOUSE.position;
  return { position: [x, 1.6, z], halfExtents: [2.5, 1.6, 2] };
}
