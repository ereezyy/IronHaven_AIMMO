/**
 * First-run / return-visitor onboarding flags.
 * Keeps cutscenes from replaying forever and supports continue-callsign.
 */

const SEEN_OPENING = 'ironhaven-seen-opening';
const SEEN_DROP = 'ironhaven-seen-district-drop';
const SEEN_CONTROLS = 'ironhaven-seen-controls';
const CONTINUE_BUILD = 'ironhaven-continue-build';

function getFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function setFlag(key: string, on = true): void {
  try {
    if (on) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function hasSeenOpening(): boolean {
  return getFlag(SEEN_OPENING);
}

export function markOpeningSeen(): void {
  setFlag(SEEN_OPENING);
}

export function hasSeenDistrictDrop(): boolean {
  return getFlag(SEEN_DROP);
}

export function markDistrictDropSeen(): void {
  setFlag(SEEN_DROP);
}

export function hasSeenControlsCard(): boolean {
  return getFlag(SEEN_CONTROLS);
}

export function markControlsCardSeen(): void {
  setFlag(SEEN_CONTROLS);
}

export function saveContinueHint(callsign: string): void {
  try {
    localStorage.setItem(CONTINUE_BUILD, callsign.slice(0, 16));
  } catch {
    /* ignore */
  }
}

export function loadContinueHint(): string | null {
  try {
    return localStorage.getItem(CONTINUE_BUILD);
  } catch {
    return null;
  }
}

/** Full control cheat-sheet for the post-drop card. */
export const CONTROLS_ROWS: { keys: string; action: string }[] = [
  { keys: 'WASD', action: 'Move' },
  { keys: 'Mouse', action: 'Look · click attack' },
  { keys: 'E', action: 'Talk / shop' },
  { keys: 'Shift', action: 'Sprint' },
  { keys: 'J', action: 'Street job (briefing)' },
  { keys: 'U', action: 'Social / factions' },
  { keys: 'K', action: 'Skill matrix' },
  { keys: 'O', action: 'Iron Haven Pass' },
  { keys: 'L', action: 'Quest log · daily board' },
  { keys: 'B', action: 'Black market' },
  { keys: 'Tab', action: 'Economy / craft' },
  { keys: 'F', action: 'Vehicle enter/exit' },
  { keys: 'R', action: 'Harvest' },
  { keys: 'C', action: 'Fish cast' },
  { keys: 'P', action: 'Toggle PvP' },
  { keys: '5–8', action: 'Active abilities' },
  { keys: 'Gamepad', action: 'LS stick move · R stick look · A jump · RT attack' },
  { keys: 'N', action: 'Next coach tip (first-time guide)' },
];
