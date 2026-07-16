import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  deathLessonLines,
  firstOpenObjective,
  markDailySplashSeen,
  shouldShowDailySplash,
  utcDayKey,
  wantedCoolOffHint,
  vfxDensityForTier,
} from './playerExperience';

const hasStorage =
  typeof localStorage !== 'undefined' &&
  typeof localStorage.setItem === 'function' &&
  typeof localStorage.getItem === 'function' &&
  typeof localStorage.removeItem === 'function';

describe('playerExperience', () => {
  beforeEach(() => {
    if (hasStorage) localStorage.removeItem('ironhaven_daily_splash_day');
  });
  afterEach(() => {
    if (hasStorage) localStorage.removeItem('ironhaven_daily_splash_day');
  });

  it('picks first incomplete objective', () => {
    expect(
      firstOpenObjective([
        { id: 'a', label: 'done', done: true },
        { id: 'b', label: 'next', done: false },
      ])?.id
    ).toBe('b');
    expect(
      firstOpenObjective([{ id: 'a', label: 'x', done: true }])
    ).toBeNull();
  });

  it('wanted cool-off only when heated', () => {
    expect(wantedCoolOffHint(0)).toBeNull();
    expect(wantedCoolOffHint(1)).toMatch(/Wanted/);
    expect(wantedCoolOffHint(4)).toMatch(/Heat/);
  });

  it('death lessons mention tax and den', () => {
    const lines = deathLessonLines(120);
    expect(lines.some((l) => l.includes('$120'))).toBe(true);
    expect(lines.some((l) => /Den|safehouse/i.test(l))).toBe(true);
  });

  it('daily splash once per day', () => {
    if (!hasStorage) return;
    expect(shouldShowDailySplash()).toBe(true);
    markDailySplashSeen();
    expect(shouldShowDailySplash()).toBe(false);
    expect(utcDayKey().length).toBe(10);
  });

  it('vfx density drops with tier', () => {
    expect(vfxDensityForTier('cinematic')).toBeGreaterThan(
      vfxDensityForTier('safe')
    );
  });
});
