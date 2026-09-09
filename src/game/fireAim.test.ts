import { describe, it, expect } from 'vitest';
import {
  FIRE_AIM,
  aimStrength,
  recoilKick,
  FIRE_AIM_DECAY_PER_SEC,
} from './fireAim';
import { flinchStrength } from './hitReaction';

describe('FIRE_AIM', () => {
  it('raises the right-arm chain that holds the weapon', () => {
    const bones = FIRE_AIM.map((b) => b.bone);
    expect(bones).toEqual(
      expect.arrayContaining([
        'mixamorig:RightShoulder',
        'mixamorig:RightArm',
        'mixamorig:RightForeArm',
        'mixamorig:RightHand',
      ])
    );
  });

  it('uses a real raise on RightArm, not a subtle flinch', () => {
    const arm = FIRE_AIM.find((b) => b.bone === 'mixamorig:RightArm');
    expect(arm).toBeTruthy();
    const mag = Math.hypot(...arm!.amplitude);
    expect(mag).toBeGreaterThan(0.8);
  });
});

describe('aimStrength vs flinch', () => {
  it('clamps', () => {
    expect(aimStrength(-1)).toBe(0);
    expect(aimStrength(2)).toBe(1);
  });

  it('holds the raise longer than a hit flinch at mid decay', () => {
    expect(aimStrength(0.5)).toBeGreaterThan(flinchStrength(0.5));
    expect(aimStrength(0.5)).toBeGreaterThan(0.65);
  });
});

describe('recoilKick', () => {
  it('is snappier than the hold (zero at rest, 1 at fire)', () => {
    expect(recoilKick(0)).toBe(0);
    expect(recoilKick(1)).toBe(1);
    expect(recoilKick(0.5)).toBeLessThan(aimStrength(0.5));
  });
});

describe('FIRE_AIM_DECAY_PER_SEC', () => {
  it('drops the pose in under a second, not instantly', () => {
    expect(FIRE_AIM_DECAY_PER_SEC).toBeGreaterThan(0.8);
    expect(FIRE_AIM_DECAY_PER_SEC).toBeLessThan(4);
  });
});
