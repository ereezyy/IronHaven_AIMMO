// Pure XZ AABB collision for the on-foot player against city buildings.
// Kept dependency-free (only three's Vector3) and side-effect-free so it can
// be unit tested and called every frame from MMOPlayer's useFrame with refs.

import * as THREE from 'three';
import { CITY_BUILDINGS } from './cityLayout';

export interface AABBCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Derive horizontal (XZ) AABBs from CITY_BUILDINGS, where `position` is the
 * box center and `size` its full extents. Cheap enough to call once and cache.
 */
export function buildBuildingColliders(): AABBCollider[] {
  return CITY_BUILDINGS.map((b) => {
    const cx = b.position[0];
    const cz = b.position[2];
    const halfW = b.size[0] / 2;
    const halfD = b.size[2] / 2;
    return {
      minX: cx - halfW,
      maxX: cx + halfW,
      minZ: cz - halfD,
      maxZ: cz + halfD,
    };
  });
}

/**
 * Push a capsule of the given `radius` out of any overlapped AABB along the
 * minimum-penetration horizontal axis. Mutates and returns `pos`; `pos.y` is
 * never touched so gravity / ground snapping stay owned by the caller.
 */
export function resolveCollision(
  pos: THREE.Vector3,
  radius: number,
  colliders: AABBCollider[]
): THREE.Vector3 {
  for (const c of colliders) {
    // Inflate the box by the capsule radius (Minkowski sum) so the center
    // point test is equivalent to a circle-vs-box test.
    const minX = c.minX - radius;
    const maxX = c.maxX + radius;
    const minZ = c.minZ - radius;
    const maxZ = c.maxZ + radius;

    // Boundary counts as outside so a resolved point doesn't re-trigger.
    if (pos.x <= minX || pos.x >= maxX || pos.z <= minZ || pos.z >= maxZ) {
      continue;
    }

    // Penetration depth toward each face; resolve along the shallower axis.
    const penLeft = pos.x - minX;
    const penRight = maxX - pos.x;
    const penDown = pos.z - minZ;
    const penUp = maxZ - pos.z;
    const penX = Math.min(penLeft, penRight);
    const penZ = Math.min(penDown, penUp);

    if (penX < penZ) {
      pos.x = penLeft < penRight ? minX : maxX;
    } else {
      pos.z = penDown < penUp ? minZ : maxZ;
    }
  }
  return pos;
}
