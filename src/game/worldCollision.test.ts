import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  buildBuildingColliders,
  resolveCollision,
  AABBCollider,
} from './worldCollision';
import { CITY_BUILDINGS } from './cityLayout';

// Unit box centered at origin: -1..1 on both axes.
const UNIT: AABBCollider[] = [{ minX: -1, maxX: 1, minZ: -1, maxZ: 1 }];
const R = 0.5;

describe('buildBuildingColliders', () => {
  it('derives one collider per building', () => {
    expect(buildBuildingColliders()).toHaveLength(CITY_BUILDINGS.length);
  });

  it('centers the AABB on the building position with half-extents', () => {
    const b = CITY_BUILDINGS[0];
    const c = buildBuildingColliders()[0];
    expect(c.minX).toBeCloseTo(b.position[0] - b.size[0] / 2);
    expect(c.maxX).toBeCloseTo(b.position[0] + b.size[0] / 2);
    expect(c.minZ).toBeCloseTo(b.position[2] - b.size[2] / 2);
    expect(c.maxZ).toBeCloseTo(b.position[2] + b.size[2] / 2);
  });
});

describe('resolveCollision', () => {
  it('leaves a point clearly outside untouched', () => {
    const p = new THREE.Vector3(5, 1, 5);
    resolveCollision(p, R, UNIT);
    expect(p.x).toBe(5);
    expect(p.z).toBe(5);
  });

  it('is a no-op with no colliders', () => {
    const p = new THREE.Vector3(0, 1, 0);
    resolveCollision(p, R, []);
    expect(p.x).toBe(0);
    expect(p.z).toBe(0);
  });

  it('pushes an overlapping point out by radius along the nearest face', () => {
    const p = new THREE.Vector3(1.2, 1, 0);
    resolveCollision(p, R, UNIT);
    // Nearest face is +X (box.maxX = 1); resolved to face + radius.
    expect(p.x).toBeCloseTo(1.5);
    // Push distance from the solid face equals the radius.
    expect(p.x - 1).toBeCloseTo(R);
    expect(p.z).toBe(0);
  });

  it('resolves corners along the minimum-penetration axis', () => {
    // Deeper on X (0.2) than Z (0.1) → resolve along Z, leave X alone.
    const p = new THREE.Vector3(1.3, 1, 1.4);
    resolveCollision(p, R, UNIT);
    expect(p.z).toBeCloseTo(1.5);
    expect(p.x).toBe(1.3);
  });

  it('never modifies the vertical axis', () => {
    const p = new THREE.Vector3(0, 3.7, 0);
    resolveCollision(p, R, UNIT);
    expect(p.y).toBe(3.7);
  });

  it('ejects a fully-enclosed point to an inflated face', () => {
    const p = new THREE.Vector3(0, 1, 0);
    resolveCollision(p, R, UNIT);
    const onFace =
      Math.abs(Math.abs(p.x) - 1.5) < 1e-6 ||
      Math.abs(Math.abs(p.z) - 1.5) < 1e-6;
    expect(onFace).toBe(true);
  });
});
