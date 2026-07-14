import { describe, it, expect } from 'vitest';
import {
  archetypeAttachments,
  ARCHETYPE_RECIPES,
  Attachment,
  PrimitiveKind,
} from './archetypeVisuals';
import { ARCHETYPES, ArchetypeId } from './character';

const ALL_IDS: ArchetypeId[] = ARCHETYPES.map((a) => a.id);
const VALID_KINDS: PrimitiveKind[] = ['box', 'sphere', 'cylinder'];

// Expected size-array length per primitive kind.
const SIZE_LEN: Record<PrimitiveKind, number> = {
  box: 3,
  sphere: 1,
  cylinder: 3,
};

describe('archetypeVisuals recipes', () => {
  it('defines a recipe for every archetype', () => {
    for (const id of ALL_IDS) {
      expect(ARCHETYPE_RECIPES[id]).toBeDefined();
      expect(ARCHETYPE_RECIPES[id].id).toBe(id);
    }
  });

  it('gives each archetype at least one attachment', () => {
    for (const id of ALL_IDS) {
      expect(archetypeAttachments(id).length).toBeGreaterThan(0);
    }
  });

  it('produces visually distinct recipes across archetypes', () => {
    const sigs = ALL_IDS.map((id) => JSON.stringify(archetypeAttachments(id)));
    expect(new Set(sigs).size).toBe(ALL_IDS.length);
  });

  it('returns an empty list for an unknown archetype', () => {
    expect(archetypeAttachments('nope' as ArchetypeId)).toEqual([]);
  });
});

describe('attachment shape validity', () => {
  const every: Attachment[] = ALL_IDS.flatMap((id) => archetypeAttachments(id));

  it('has a valid primitive kind and matching size arity', () => {
    for (const a of every) {
      expect(VALID_KINDS).toContain(a.kind);
      expect(a.size).toHaveLength(SIZE_LEN[a.kind]);
      for (const n of a.size) expect(n).toBeGreaterThan(0);
    }
  });

  it('has a 3-tuple position and (when present) 3-tuple rotation', () => {
    for (const a of every) {
      expect(a.pos).toHaveLength(3);
      if (a.rot) expect(a.rot).toHaveLength(3);
    }
  });

  it('uses only known color roles', () => {
    const roles = ['tint', 'accent', 'accent2', 'skin'];
    for (const a of every) expect(roles).toContain(a.color);
  });

  it('keeps attachments within a plausible body envelope (|frac| <= 1)', () => {
    for (const a of every) {
      for (const v of a.pos) expect(Math.abs(v)).toBeLessThanOrEqual(1);
    }
  });
});
