import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  degradeGfxTier,
  getGfxSettings,
  readGfxTier,
  writeGfxTier,
} from './graphicsQuality';

const KEY = 'ironhaven_gfx_tier';

const hasStorage =
  typeof localStorage !== 'undefined' &&
  typeof localStorage.setItem === 'function' &&
  typeof localStorage.getItem === 'function' &&
  typeof localStorage.removeItem === 'function';

describe('graphicsQuality', () => {
  beforeEach(() => {
    if (hasStorage) localStorage.removeItem(KEY);
  });
  afterEach(() => {
    if (hasStorage) localStorage.removeItem(KEY);
  });

  it('defaults to balanced with no SSAO', () => {
    const s = getGfxSettings(readGfxTier());
    expect(s.tier).toBe('balanced');
    expect(s.ssao).toBe(false);
    expect(s.normalPass).toBe(false);
    expect(s.bloom).toBe(true);
  });

  it('degrades toward safe and persists', () => {
    if (!hasStorage) return;
    writeGfxTier('cinematic');
    expect(degradeGfxTier()).toBe('balanced');
    expect(readGfxTier()).toBe('balanced');
    expect(degradeGfxTier()).toBe('performance');
    expect(degradeGfxTier()).toBe('safe');
    expect(degradeGfxTier()).toBe('safe');
  });

  it('safe tier disables post entirely', () => {
    const s = getGfxSettings('safe');
    expect(s.postEnabled).toBe(false);
  });
});
