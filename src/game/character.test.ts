import { describe, it, expect, vi } from 'vitest';
import {
  defaultBuild,
  resolveSkills,
  bonusSpent,
  BONUS_POOL,
  ARCHETYPES,
  DEFAULT_APPEARANCE,
  GEAR_LEVELS,
  loadBuild,
  sanitizeAvatarWire,
} from './character';

describe('character build', () => {
  it('resolves enforcer with higher combat', () => {
    const b = defaultBuild('Test');
    b.archetype = 'enforcer';
    const skills = resolveSkills(b);
    const runner = resolveSkills({ ...b, archetype: 'runner' });
    expect(skills.combat).toBeGreaterThan(runner.combat);
  });

  it('tracks bonus pool spend', () => {
    const b = defaultBuild('X');
    b.bonuses.combat = 3;
    b.bonuses.stealth = 2;
    expect(bonusSpent(b)).toBe(5);
    expect(bonusSpent(b)).toBeLessThanOrEqual(BONUS_POOL);
  });

  it('has four archetypes', () => {
    expect(ARCHETYPES).toHaveLength(4);
  });

  it('seeds every appearance field on a fresh build', () => {
    const a = defaultBuild('Y').appearance;
    expect(a.accent2).toBe(DEFAULT_APPEARANCE.accent2);
    expect(a.skinTone).toBe(DEFAULT_APPEARANCE.skinTone);
    expect(a.gear).toBe('none');
    expect(GEAR_LEVELS).toContain(a.gear);
  });

  it('starts with no parts equipped', () => {
    expect(defaultBuild('Z').parts).toEqual({});
  });
});

describe('loadBuild appearance backfill', () => {
  it('fills fields missing from a legacy save', () => {
    // Simulate an older save with only the original appearance keys. Stub
    // getItem directly since the test env's localStorage isn't fully backed.
    const legacy = {
      callsign: 'Legacy',
      archetype: 'runner',
      appearance: { tint: '#111111', accent: '#222222', bodyScale: 1 },
      bonuses: { combat: 0, stealth: 0, driving: 0, intimidation: 0 },
    };
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify(legacy),
      setItem: () => {},
      removeItem: () => {},
    });

    const loaded = loadBuild();
    expect(loaded).not.toBeNull();
    expect(loaded!.appearance.tint).toBe('#111111');
    expect(loaded!.appearance.accent2).toBe(DEFAULT_APPEARANCE.accent2);
    expect(loaded!.appearance.skinTone).toBe(DEFAULT_APPEARANCE.skinTone);
    expect(loaded!.appearance.gear).toBe('none');
    // Legacy saves predate parts entirely — backfilled to empty.
    expect(loaded!.parts).toEqual({});

    vi.unstubAllGlobals();
  });

  it('drops saved part ids the archetype cannot equip', () => {
    const save = {
      callsign: 'Locked',
      archetype: 'runner',
      appearance: { tint: '#111111', accent: '#222222', bodyScale: 1 },
      bonuses: { combat: 0, stealth: 0, driving: 0, intimidation: 0 },
      // Heavy Blaster is enforcer-only; crate is unrestricted.
      parts: { weapon: 'weapon_blaster_d', back: 'back_field_crate' },
    };
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify(save),
      setItem: () => {},
      removeItem: () => {},
    });

    const loaded = loadBuild();
    expect(loaded).not.toBeNull();
    expect(loaded!.parts).toEqual({ back: 'back_field_crate' });

    vi.unstubAllGlobals();
  });
});

describe('sanitizeAvatarWire', () => {
  it('returns null for non-object input', () => {
    expect(sanitizeAvatarWire(null)).toBeNull();
    expect(sanitizeAvatarWire(undefined)).toBeNull();
    expect(sanitizeAvatarWire('ghost')).toBeNull();
    expect(sanitizeAvatarWire(42)).toBeNull();
  });

  it('round-trips a fully valid wire blob', () => {
    const wire = {
      archetype: 'ghost',
      appearance: {
        tint: '#112233',
        accent: '#22d3ee',
        accent2: '#1f5a4a',
        skinTone: '#c68642',
        gear: 'heavy',
        bodyScale: 0.95,
      },
      // Long Rifle is ghost-legal; crate is unrestricted.
      parts: { weapon: 'weapon_blaster_e', back: 'back_field_crate' },
    };
    const out = sanitizeAvatarWire(wire);
    expect(out).not.toBeNull();
    expect(out!.archetype).toBe('ghost');
    expect(out!.appearance).toEqual(wire.appearance);
    expect(out!.parts).toEqual(wire.parts);
  });

  it('falls back field-by-field on hostile values', () => {
    const out = sanitizeAvatarWire({
      archetype: 'godmode',
      appearance: {
        tint: 'javascript:alert(1)',
        gear: 'mega',
        bodyScale: 5,
      },
    });
    expect(out).not.toBeNull();
    expect(out!.archetype).toBe(ARCHETYPES[0].id);
    expect(out!.appearance.tint).toBe(DEFAULT_APPEARANCE.tint);
    expect(out!.appearance.gear).toBe(DEFAULT_APPEARANCE.gear);
    expect(out!.appearance.bodyScale).toBe(1.1);
  });

  it('drops parts the wire archetype cannot equip', () => {
    const out = sanitizeAvatarWire({
      archetype: 'runner',
      appearance: {},
      // Heavy Blaster is enforcer-only; crate is unrestricted.
      parts: { weapon: 'weapon_blaster_d', back: 'back_field_crate' },
    });
    expect(out).not.toBeNull();
    expect(out!.parts).toEqual({ back: 'back_field_crate' });
  });
});
