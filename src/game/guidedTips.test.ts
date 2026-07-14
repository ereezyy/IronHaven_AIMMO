import { describe, it, expect, beforeEach } from 'vitest';
import {
  EMPTY_TIPS_STATE,
  GUIDED_TIPS,
  currentTip,
  markTipComplete,
  dismissGuidedTips,
  autoCompleteFromSignals,
  tipProgress,
  loadGuidedTipsState,
  saveGuidedTipsState,
} from './guidedTips';

describe('guided tips', () => {
  beforeEach(() => {
    try {
      localStorage.removeItem('ironhaven-guided-tips');
    } catch {
      /* ignore */
    }
  });

  it('starts on the look tip', () => {
    const tip = currentTip(EMPTY_TIPS_STATE);
    expect(tip?.id).toBe('look');
    expect(GUIDED_TIPS.length).toBeGreaterThanOrEqual(6);
  });

  it('advances when a tip is completed', () => {
    let s = markTipComplete(EMPTY_TIPS_STATE, 'look');
    expect(currentTip(s)?.id).toBe('move');
    s = markTipComplete(s, 'move');
    expect(currentTip(s)?.id).toBe('talk');
  });

  it('auto-completes from world signals', () => {
    const s = autoCompleteFromSignals(EMPTY_TIPS_STATE, {
      pointerLocked: true,
      movedFar: true,
      talked: false,
      harvested: false,
      tookJob: false,
      openedQuest: false,
      openedSkills: false,
    });
    expect(s.completed).toContain('look');
    expect(s.completed).toContain('move');
    expect(currentTip(s)?.id).toBe('talk');
  });

  it('dismiss ends the tour', () => {
    const s = dismissGuidedTips(EMPTY_TIPS_STATE);
    expect(s.dismissed).toBe(true);
    expect(currentTip(s)).toBeNull();
  });

  it('tracks progress steps', () => {
    const s = markTipComplete(EMPTY_TIPS_STATE, 'look');
    const p = tipProgress(s);
    expect(p.step).toBe(2);
    expect(p.total).toBe(GUIDED_TIPS.length);
  });

  it('persists when storage is available', () => {
    if (
      typeof localStorage === 'undefined' ||
      typeof localStorage.setItem !== 'function'
    ) {
      expect(loadGuidedTipsState().completed).toEqual([]);
      return;
    }
    const s = markTipComplete(EMPTY_TIPS_STATE, 'look');
    saveGuidedTipsState(s);
    const loaded = loadGuidedTipsState();
    expect(loaded.completed).toContain('look');
  });
});
