import { describe, it, expect } from 'vitest';
import {
  AVATAR_PART_REGISTRY,
  AVATAR_SLOTS,
  isAvatarSlot,
  partsForSlot,
  sanitizeAvatarParts,
  type AvatarPartRegistry,
} from './avatarParts';
import { ARCHETYPES } from './character';

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

describe('AVATAR_PART_REGISTRY', () => {
  it('keys match ids and every entry has a valid slot and kit url', () => {
    for (const [key, def] of Object.entries(AVATAR_PART_REGISTRY)) {
      expect(def.id).toBe(key);
      expect(isAvatarSlot(def.slot)).toBe(true);
      expect(def.url).toMatch(/^\/models\/parts\/blaster_kit\/.+\.glb$/);
    }
  });

  it('the unrestricted starter loadout survives every archetype', () => {
    const loadout = { weapon: 'weapon_blaster_a', back: 'back_field_crate' };
    for (const a of ARCHETYPES) {
      expect(sanitizeAvatarParts(loadout, AVATAR_PART_REGISTRY, a.id)).toEqual(
        loadout
      );
    }
  });

  it('drops archetype-locked parts for the wrong archetype', () => {
    expect(
      sanitizeAvatarParts(
        { weapon: 'weapon_blaster_d' },
        AVATAR_PART_REGISTRY,
        'runner'
      )
    ).toEqual({});
    expect(
      sanitizeAvatarParts(
        { weapon: 'weapon_blaster_d' },
        AVATAR_PART_REGISTRY,
        'enforcer'
      )
    ).toEqual({ weapon: 'weapon_blaster_d' });
  });
});

describe('partsForSlot', () => {
  it('filters by slot and honors archetype locks', () => {
    const runner = partsForSlot('weapon', 'runner').map((d) => d.id);
    expect(runner).toContain('weapon_blaster_a');
    expect(runner).toContain('weapon_blaster_h');
    expect(runner).not.toContain('weapon_blaster_d');
    expect(runner).not.toContain('weapon_blaster_p');

    const enforcer = partsForSlot('weapon', 'enforcer').map((d) => d.id);
    expect(enforcer).toContain('weapon_blaster_d');
    expect(enforcer).toContain('weapon_blaster_e');

    expect(partsForSlot('back', 'ghost').map((d) => d.id)).toEqual([
      'back_field_crate',
    ]);
    expect(partsForSlot('head', 'runner')).toEqual([]);
  });

  it('returns all slot entries when no archetype is given', () => {
    const all = partsForSlot('weapon');
    expect(all.length).toBe(5);
  });
});
