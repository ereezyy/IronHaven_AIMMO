import { describe, it, expect } from 'vitest';
import {
  newlyCompletedObjectives,
  shouldNudgePass,
  formatContractPayout,
} from './demoLoop';
import type { StreetObjective } from './objectives';

const base = (
  partial: Partial<StreetObjective> & { id: string; label: string }
): StreetObjective => ({
  done: false,
  reward: 50,
  ...partial,
});

describe('newlyCompletedObjectives', () => {
  it('returns objectives that are done but not yet in the rewarded set', () => {
    const street = [
      base({ id: 'talk', label: 'Talk', done: true, reward: 50 }),
      base({ id: 'kill', label: 'Kill', done: false, reward: 100 }),
    ];
    const rewarded = new Set<string>();
    const hit = newlyCompletedObjectives(street, rewarded);
    expect(hit.map((o) => o.id)).toEqual(['talk']);
  });

  it('skips already rewarded ids', () => {
    const street = [
      base({ id: 'talk', label: 'Talk', done: true, reward: 50 }),
    ];
    const rewarded = new Set(['talk']);
    expect(newlyCompletedObjectives(street, rewarded)).toEqual([]);
  });
});

describe('shouldNudgePass', () => {
  it('nudges once after talk+kill are done when pass inactive and not yet nudged', () => {
    expect(
      shouldNudgePass({
        talkedDone: true,
        killDone: true,
        passActive: false,
        alreadyNudged: false,
      })
    ).toBe(true);
  });

  it('does not nudge if pass already active or already nudged or early beats incomplete', () => {
    expect(
      shouldNudgePass({
        talkedDone: true,
        killDone: true,
        passActive: true,
        alreadyNudged: false,
      })
    ).toBe(false);
    expect(
      shouldNudgePass({
        talkedDone: true,
        killDone: false,
        passActive: false,
        alreadyNudged: false,
      })
    ).toBe(false);
    expect(
      shouldNudgePass({
        talkedDone: true,
        killDone: true,
        passActive: false,
        alreadyNudged: true,
      })
    ).toBe(false);
  });
});

describe('formatContractPayout', () => {
  it('formats a readable kill-feed line', () => {
    expect(
      formatContractPayout('Talk to someone on the street (E)', 50)
    ).toMatch(/contract/i);
    expect(
      formatContractPayout('Talk to someone on the street (E)', 50)
    ).toMatch(/\$50/);
  });
});
