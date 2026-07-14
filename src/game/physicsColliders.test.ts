import { describe, it, expect } from 'vitest';
import {
  PLAYER_CAPSULE,
  CHARACTER_CONTROLLER,
  PLAYER_MOTION,
  groundColliderSpec,
  buildingColliderSpecs,
} from './physicsColliders';
import { CITY_BUILDINGS, CITY_RADIUS } from './cityLayout';

describe('PLAYER_CAPSULE', () => {
  it('total capsule height is 2 so feet touch y=0 with center at y=1', () => {
    const total = 2 * PLAYER_CAPSULE.halfHeight + 2 * PLAYER_CAPSULE.radius;
    expect(total).toBe(2);
    expect(PLAYER_CAPSULE.centerY - total / 2).toBe(0);
  });
});

describe('CHARACTER_CONTROLLER', () => {
  it('has sane tuning ranges', () => {
    expect(CHARACTER_CONTROLLER.offset).toBeGreaterThan(0);
    expect(CHARACTER_CONTROLLER.offset).toBeLessThan(0.2);
    expect(CHARACTER_CONTROLLER.autostepMaxHeight).toBeLessThan(
      PLAYER_CAPSULE.centerY
    );
    expect(CHARACTER_CONTROLLER.autostepMinWidth).toBeGreaterThan(0);
    expect(CHARACTER_CONTROLLER.maxSlopeClimbAngle).toBeLessThan(Math.PI / 2);
    expect(CHARACTER_CONTROLLER.snapToGroundDistance).toBeGreaterThan(0);
    expect(CHARACTER_CONTROLLER.snapToGroundDistance).toBeLessThan(0.5);
  });
});

describe('PLAYER_MOTION', () => {
  it('stays in the intended agile-on-foot range', () => {
    expect(PLAYER_MOTION.sprintSpeed).toBeGreaterThan(PLAYER_MOTION.walkSpeed);
    expect(PLAYER_MOTION.acceleration).toBeGreaterThan(0);
    expect(PLAYER_MOTION.friction).toBeGreaterThan(0);
    expect(PLAYER_MOTION.jumpForce).toBeGreaterThan(0);
    expect(PLAYER_MOTION.gravity).toBeLessThan(0);
    expect(PLAYER_MOTION.groundedBias).toBeLessThan(0);
    expect(PLAYER_MOTION.gamepadDeadzone).toBeGreaterThan(0);
    expect(PLAYER_MOTION.staminaRecoverPerSecond).toBeLessThan(
      PLAYER_MOTION.staminaDrainPerSecond
    );
  });
});

describe('groundColliderSpec', () => {
  it('top face sits exactly at y=0 and covers the playable radius', () => {
    const g = groundColliderSpec();
    expect(g.position[1] + g.halfExtents[1]).toBe(0);
    expect(g.halfExtents[0]).toBeGreaterThanOrEqual(CITY_RADIUS);
    expect(g.halfExtents[2]).toBeGreaterThanOrEqual(CITY_RADIUS);
  });
});

describe('buildingColliderSpecs', () => {
  it('produces one cuboid per building', () => {
    expect(buildingColliderSpecs()).toHaveLength(CITY_BUILDINGS.length);
  });

  it('half-extents are exactly half the building size, centered on position', () => {
    const specs = buildingColliderSpecs();
    CITY_BUILDINGS.forEach((b, i) => {
      expect(specs[i].position).toEqual([
        b.position[0],
        b.position[1],
        b.position[2],
      ]);
      expect(specs[i].halfExtents).toEqual([
        b.size[0] / 2,
        b.size[1] / 2,
        b.size[2] / 2,
      ]);
    });
  });

  it('building boxes rest on the ground (bottom at y=0)', () => {
    for (const s of buildingColliderSpecs()) {
      expect(s.position[1] - s.halfExtents[1]).toBeCloseTo(0, 6);
    }
  });
});
