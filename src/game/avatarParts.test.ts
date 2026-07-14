import { describe, it, expect } from 'vitest';
import {
  AVATAR_SLOTS,
  isAvatarSlot,
  sanitizeAvatarParts,
  type AvatarPartRegistry,
} from './avatarParts';

const REG: AvatarPartRegistry = {
  hood_01: { id: 'hood_01', slot: 'head', name: 'Hood', url: '/m/h.glb' },
  plate_01: {
    id: 'plate_01',
    slot: 'torso',
    name: 'Plate',
    url: '/m/p.glb',
    archetypes: ['enforcer'],
  },
  case_01: {
    id: 'case_01',
    slot: 'back',
    name: 'Case',
    url: '/m/c.glb',
    archetypes: [],
  },
};

describe('isAvatarSlot', () => {
  it('accepts every declared slot and rejects others', () => {
    for (const s of AVATAR_SLOTS) expect(isAvatarSlot(s)).toBe(true);
    expect(isAvatarSlot('tail')).toBe(false);
    expect(isAvatarSlot('')).toBe(false);
  });
});

describe('sanitizeAvatarParts', () => {
  it('keeps valid entries', () => {
    expect(sanitizeAvatarParts({ head: 'hood_01' }, REG)).toEqual({
      head: 'hood_01',
    });
  });

  it('drops unknown ids, wrong slots, and non-string values', () => {
    expect(
      sanitizeAvatarParts(
        { head: 'nope', torso: 'hood_01', legs: 42, back: null },
        REG
      )
    ).toEqual({});
  });

  it('enforces archetype locks only when a lock list is non-empty', () => {
    expect(sanitizeAvatarParts({ torso: 'plate_01' }, REG, 'runner')).toEqual(
      {}
    );
    expect(sanitizeAvatarParts({ torso: 'plate_01' }, REG, 'enforcer')).toEqual(
      { torso: 'plate_01' }
    );
    // Empty archetypes array = unrestricted.
    expect(sanitizeAvatarParts({ back: 'case_01' }, REG, 'runner')).toEqual({
      back: 'case_01',
    });
  });

  it('never throws on malformed input', () => {
    expect(sanitizeAvatarParts(null, REG)).toEqual({});
    expect(sanitizeAvatarParts('junk', REG)).toEqual({});
    expect(sanitizeAvatarParts(7, REG)).toEqual({});
    expect(sanitizeAvatarParts([], REG)).toEqual({});
  });
});
