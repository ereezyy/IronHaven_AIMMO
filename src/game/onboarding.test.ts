import { describe, it, expect } from 'vitest';
import { CONTROLS_ROWS } from './onboarding';

describe('CONTROLS_ROWS Phase 1 bindings', () => {
  it('documents weapon loadout on plain 1–4', () => {
    expect(CONTROLS_ROWS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keys: '1–4', action: 'Weapon loadout' }),
      ])
    );
  });

  it('documents emotes on Shift+1–4', () => {
    expect(CONTROLS_ROWS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keys: 'Shift+1–4', action: 'Emotes' }),
      ])
    );
  });

  it('splits graphics and AI keys', () => {
    expect(CONTROLS_ROWS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ keys: 'G', action: 'Graphics quality' }),
        expect.objectContaining({ keys: 'I', action: 'AI director panel' }),
      ])
    );
  });
});
