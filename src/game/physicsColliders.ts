// Pure data for the Rapier physics world (Stage C). No three/rapier imports
// so it stays unit-testable in node without wasm or a WebGL context.
//
// Conventions (must match MMOPlayer + cityLayout):
// - Ground surface is y=0; the player's kinematic body center rides at y=1.
// - CITY_BUILDINGS.position is the box CENTER (y = height/2), size is FULL
//   extents; Rapier cuboids want HALF extents.

import { CITY_BUILDINGS, CITY_RADIUS } from './cityLayout';

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
  /** Gap Rapier keeps between the capsule and the world (~5cm). */
  offset: 0.05,
  /** Curb/step height the controller climbs automatically. */
  autostepMaxHeight: 0.5,
  autostepMinWidth: 0.2,
  /** Stick-to-ground distance when walking down slopes/steps. */
  snapToGroundDistance: 0.5,
  /** Max walkable slope (radians). */
  maxSlopeClimbAngle: (60 * Math.PI) / 180,
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
