import { describe, it, expect } from 'vitest';
import {
  isWeaponDigit,
  isEmoteDigit,
  weaponSlotFromDigit,
  EMOTES,
  GFX_KEY,
  AI_PANEL_KEY,
} from './inputBindings';

function key(
  code: string,
  mods: Partial<{
    shiftKey: boolean;
    altKey: boolean;
    metaKey: boolean;
    ctrlKey: boolean;
  }> = {}
) {
  return {
    code,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ctrlKey: false,
    ...mods,
  };
}

describe('in-world digit bindings', () => {
  it('maps 1–4 to weapons, not emotes', () => {
    expect(isWeaponDigit(key('Digit1'))).toBe(true);
    expect(isEmoteDigit(key('Digit1'))).toBe(false);
    expect(weaponSlotFromDigit('Digit1')).toBe(0);
    expect(weaponSlotFromDigit('Digit4')).toBe(3);
  });

  it('does not let emotes steal unshifted 1–4', () => {
    for (const code of ['Digit1', 'Digit2', 'Digit3', 'Digit4'] as const) {
      expect(isWeaponDigit(key(code))).toBe(true);
      expect(isEmoteDigit(key(code))).toBe(false);
    }
  });

  it('Shift+1–4 is emotes only', () => {
    expect(isEmoteDigit(key('Digit2', { shiftKey: true }))).toBe(true);
    expect(isWeaponDigit(key('Digit2', { shiftKey: true }))).toBe(false);
    expect(EMOTES.Digit2).toMatch(/heat/i);
  });

  it('ignores Alt/Ctrl/Meta so browser chrome is not hijacked', () => {
    expect(isWeaponDigit(key('Digit1', { altKey: true }))).toBe(false);
    expect(isEmoteDigit(key('Digit1', { altKey: true, shiftKey: true }))).toBe(
      false
    );
    expect(isWeaponDigit(key('Digit1', { ctrlKey: true }))).toBe(false);
  });

  it('keeps graphics and AI on different keys', () => {
    expect(GFX_KEY).toBe('KeyG');
    expect(AI_PANEL_KEY).toBe('KeyI');
    expect(GFX_KEY).not.toBe(AI_PANEL_KEY);
  });
});
