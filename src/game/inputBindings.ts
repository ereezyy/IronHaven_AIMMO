/**
 * Keyboard routing for in-world play.
 *
 * Digit 1–4 used to fire emotes AND weapon swap in the same handler;
 * emotes returned first so loadout keys were dead. Keep FPS-standard
 * 1–4 = weapons; Shift+1–4 = emotes.
 */

const DIGIT_1_4 = new Set(['Digit1', 'Digit2', 'Digit3', 'Digit4']);

export function isWeaponDigit(e: {
  code: string;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}): boolean {
  return (
    DIGIT_1_4.has(e.code) &&
    !e.shiftKey &&
    !e.altKey &&
    !e.metaKey &&
    !e.ctrlKey
  );
}

export function isEmoteDigit(e: {
  code: string;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}): boolean {
  return (
    DIGIT_1_4.has(e.code) && e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey
  );
}

/** 0-based loadout index from Digit1–4. */
export function weaponSlotFromDigit(code: string): number | null {
  if (!DIGIT_1_4.has(code)) return null;
  return parseInt(code.replace('Digit', ''), 10) - 1;
}

export const EMOTES: Record<string, string> = {
  Digit1: '👍 respect',
  Digit2: '🔥 heat',
  Digit3: '💀 threat',
  Digit4: '🤝 deal',
};

/** Graphics settings. */
export const GFX_KEY = 'KeyG';
/** AI director panel (G is graphics). */
export const AI_PANEL_KEY = 'KeyI';
