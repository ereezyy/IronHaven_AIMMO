/**
 * Progressive first-time coach tips.
 * Completes by doing the action or skipping; persists in localStorage.
 */

const STORAGE_KEY = 'ironhaven-guided-tips';

export type TipId =
  | 'look'
  | 'move'
  | 'talk'
  | 'harvest'
  | 'job'
  | 'quest'
  | 'skills'
  | 'done';

export interface GuidedTip {
  id: TipId;
  step: number;
  title: string;
  body: string;
  keyHint?: string;
  /** Accent label under title. */
  chapter: string;
}

export const GUIDED_TIPS: GuidedTip[] = [
  {
    id: 'look',
    step: 1,
    chapter: 'street sense',
    title: 'Claim the camera',
    body: 'Click the world once to lock the mouse. Move the mouse to look around the district.',
    keyHint: 'click',
  },
  {
    id: 'move',
    step: 2,
    chapter: 'street sense',
    title: 'Get moving',
    body: 'Use WASD to walk the streets. Hold Shift to sprint when you need to clear heat.',
    keyHint: 'wasd',
  },
  {
    id: 'talk',
    step: 3,
    chapter: 'the grid',
    title: 'Talk to someone',
    body: 'Walk up to a runner or civilian until a prompt appears. Press E to open dialogue — jobs and intel start here.',
    keyHint: 'e',
  },
  {
    id: 'harvest',
    step: 4,
    chapter: 'the grind',
    title: 'Scavenge scrap',
    body: 'Find a glowing harvest node on the street. Press R to pull scrap and circuits for crafting.',
    keyHint: 'r',
  },
  {
    id: 'job',
    step: 5,
    chapter: 'the grind',
    title: 'Take a street job',
    body: 'Press J for a mission briefing. Accept it, then complete the objective for cash and XP.',
    keyHint: 'j',
  },
  {
    id: 'quest',
    step: 6,
    chapter: 'the board',
    title: 'Check the board',
    body: 'Press L to open the quest log — daily and weekly jobs refresh on a timer. Claim rewards when bars fill.',
    keyHint: 'l',
  },
  {
    id: 'skills',
    step: 7,
    chapter: 'loadout',
    title: 'Spend skill points',
    body: 'Press K to open the skill matrix. Rank combat, street, ops, or focus nodes — then equip actives on 5–8.',
    keyHint: 'k',
  },
  {
    id: 'done',
    step: 8,
    chapter: 'you are live',
    title: 'District is yours',
    body: 'U for factions · O for Pass · B black market · Tab craft. Stay lethal. Tips will stay off unless you reset them.',
    keyHint: 'u · o · b',
  },
];

export interface GuidedTipsState {
  /** Completed tip ids (action or skip). */
  completed: TipId[];
  /** Player dismissed the whole tour. */
  dismissed: boolean;
  /** Tour fully finished (saw done tip). */
  finished: boolean;
}

export const EMPTY_TIPS_STATE: GuidedTipsState = {
  completed: [],
  dismissed: false,
  finished: false,
};

export function loadGuidedTipsState(): GuidedTipsState {
  try {
    if (typeof localStorage === 'undefined') return { ...EMPTY_TIPS_STATE };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_TIPS_STATE };
    const p = JSON.parse(raw) as Partial<GuidedTipsState>;
    return {
      completed: Array.isArray(p.completed)
        ? (p.completed.filter(Boolean) as TipId[])
        : [],
      dismissed: Boolean(p.dismissed),
      finished: Boolean(p.finished),
    };
  } catch {
    return { ...EMPTY_TIPS_STATE };
  }
}

export function saveGuidedTipsState(state: GuidedTipsState): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function markTipComplete(
  state: GuidedTipsState,
  id: TipId
): GuidedTipsState {
  if (state.completed.includes(id)) return state;
  const completed = [...state.completed, id];
  const finished = id === 'done' || completed.includes('done');
  const next = { ...state, completed, finished };
  saveGuidedTipsState(next);
  return next;
}

export function dismissGuidedTips(state: GuidedTipsState): GuidedTipsState {
  const next = { ...state, dismissed: true, finished: true };
  saveGuidedTipsState(next);
  return next;
}

export function resetGuidedTips(): GuidedTipsState {
  saveGuidedTipsState({ ...EMPTY_TIPS_STATE });
  return { ...EMPTY_TIPS_STATE };
}

/** First incomplete tip in order, or null if tour done/dismissed. */
export function currentTip(state: GuidedTipsState): GuidedTip | null {
  if (state.dismissed || state.finished) return null;
  for (const tip of GUIDED_TIPS) {
    if (!state.completed.includes(tip.id)) return tip;
  }
  return null;
}

export function tipProgress(state: GuidedTipsState): {
  step: number;
  total: number;
} {
  const total = GUIDED_TIPS.length;
  const done = state.completed.filter((id) => id !== 'done').length;
  const cur = currentTip(state);
  return { step: cur ? cur.step : total, total };
}

/** World signals used to auto-complete tips. */
export interface TipSignals {
  pointerLocked: boolean;
  movedFar: boolean;
  talked: boolean;
  harvested: boolean;
  tookJob: boolean;
  openedQuest: boolean;
  openedSkills: boolean;
}

export function autoCompleteFromSignals(
  state: GuidedTipsState,
  signals: TipSignals
): GuidedTipsState {
  if (state.dismissed || state.finished) return state;
  let next = state;
  const tryMark = (id: TipId, ok: boolean) => {
    if (ok && !next.completed.includes(id)) {
      next = markTipComplete(next, id);
    }
  };
  tryMark('look', signals.pointerLocked);
  tryMark('move', signals.movedFar);
  tryMark('talk', signals.talked);
  tryMark('harvest', signals.harvested);
  tryMark('job', signals.tookJob);
  tryMark('quest', signals.openedQuest);
  tryMark('skills', signals.openedSkills);
  return next;
}

export function totalTipCount(): number {
  return GUIDED_TIPS.length;
}
