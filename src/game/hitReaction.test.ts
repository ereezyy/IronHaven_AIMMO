import { describe, it, expect } from 'vitest';
import {
  HIT_FLINCH,
  flinchStrength,
  collapseProgress,
  collapsePose,
  DEATH_COLLAPSE_DURATION,
} from './hitReaction';

describe('HIT_FLINCH', () => {
  it('targets upper-body mixamorig bones only', () => {
    expect(HIT_FLINCH.length).toBeGreaterThanOrEqual(3);
    for (const f of HIT_FLINCH) {
      expect(f.bone.startsWith('mixamorig:')).toBe(true);
      expect(f.amplitude).toHaveLength(3);
    }
  });

  it('keeps amplitudes subtle (< 0.5 rad) so poses never break', () => {
    for (const f of HIT_FLINCH) {
      for (const a of f.amplitude) {
        expect(Math.abs(a)).toBeLessThan(0.5);
      }
    }
  });
});

describe('flinchStrength', () => {
  it('clamps input to [0,1]', () => {
    expect(flinchStrength(-1)).toBe(0);
    expect(flinchStrength(2)).toBe(1);
  });

  it('eases out: recovers faster than the linear flash decay', () => {
    expect(flinchStrength(1)).toBe(1);
    expect(flinchStrength(0.5)).toBeLessThan(0.5);
    expect(flinchStrength(0)).toBe(0);
  });
});

describe('collapseProgress', () => {
  it('is 0 at start and clamps to 1 after the duration', () => {
    expect(collapseProgress(0)).toBe(0);
    expect(collapseProgress(DEATH_COLLAPSE_DURATION)).toBe(1);
    expect(collapseProgress(DEATH_COLLAPSE_DURATION * 5)).toBe(1);
    expect(collapseProgress(-1)).toBe(0);
  });

  it('is monotonically non-decreasing', () => {
    let prev = 0;
    for (let t = 0; t <= DEATH_COLLAPSE_DURATION; t += 0.05) {
      const p = collapseProgress(t);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
  });
});

describe('collapsePose', () => {
  it('stands upright at 0 and lies nearly flat at 1', () => {
    const up = collapsePose(0);
    expect(up.pitch).toBeCloseTo(0, 10);
    expect(up.mixerScale).toBe(1);
    expect(up.sink).toBe(0);

    const down = collapsePose(1);
    expect(down.pitch).toBeLessThan(-Math.PI / 3);
    expect(down.pitch).toBeGreaterThan(-Math.PI / 2);
    expect(down.mixerScale).toBe(0);
    expect(down.sink).toBeGreaterThan(0);
  });

  it('clamps progress outside [0,1]', () => {
    expect(collapsePose(-2).pitch).toBeCloseTo(0, 10);
    expect(collapsePose(3).pitch).toBe(collapsePose(1).pitch);
  });
});
