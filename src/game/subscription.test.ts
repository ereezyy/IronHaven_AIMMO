import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PASS_BENEFITS,
  PASS_DURATION_MS,
  PASS_PRICE_USD,
  EMPTY_PASS,
  isPassActive,
  msRemaining,
  formatPassRemaining,
  isoWeekKey,
  canClaimWeeklySp,
  activatePassPeriod,
  markWeeklySpClaimed,
  applyPassShopDiscount,
  applyPassXp,
  loadPassFromStorage,
  savePassToStorage,
  PASS_STORAGE_KEY,
} from './subscription';

describe('Iron Haven Pass model', () => {
  it('prices at $1.99 / week', () => {
    expect(PASS_PRICE_USD).toBe(1.99);
    expect(PASS_DURATION_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('grants the advertised multipliers', () => {
    expect(PASS_BENEFITS.xpMult).toBe(1.25);
    expect(PASS_BENEFITS.shopDiscount).toBe(0.1);
    expect(PASS_BENEFITS.weeklySkillPoints).toBe(2);
    expect(PASS_BENEFITS.vipBadge).toBe(true);
  });

  it('detects active vs expired', () => {
    const now = 1_000_000;
    expect(isPassActive({ expiresAt: now + 1000 }, now)).toBe(true);
    expect(isPassActive({ expiresAt: now }, now)).toBe(false);
    expect(isPassActive({ expiresAt: 0 }, now)).toBe(false);
  });

  it('formats remaining time', () => {
    const now = Date.UTC(2026, 0, 1);
    const day = 24 * 60 * 60 * 1000;
    expect(
      formatPassRemaining({ expiresAt: now + 2 * day + 3 * 3600000 }, now)
    ).toMatch(/2d/);
    expect(formatPassRemaining({ expiresAt: now - 1 }, now)).toBe('expired');
    expect(msRemaining({ expiresAt: now + 5000 }, now)).toBe(5000);
  });

  it('stacks renewal time when still active', () => {
    const now = 10_000_000;
    const first = activatePassPeriod(EMPTY_PASS, 'demo', now);
    expect(first.expiresAt).toBe(now + PASS_DURATION_MS);
    const mid = now + PASS_DURATION_MS / 2;
    const second = activatePassPeriod(first, 'demo', mid);
    expect(second.expiresAt).toBe(first.expiresAt + PASS_DURATION_MS);
  });

  it('gates weekly SP once per ISO week', () => {
    const now = Date.UTC(2026, 6, 8); // mid-week
    const pass = activatePassPeriod(EMPTY_PASS, 'demo', now);
    expect(canClaimWeeklySp(pass, now)).toBe(true);
    const claimed = markWeeklySpClaimed(pass, now);
    expect(canClaimWeeklySp(claimed, now)).toBe(false);
    expect(claimed.weeklySpClaimKey).toBe(isoWeekKey(new Date(now)));
  });

  it('applies XP and shop discounts only when active', () => {
    expect(applyPassXp(100, true)).toBe(125);
    expect(applyPassXp(100, false)).toBe(100);
    expect(applyPassShopDiscount(0.9, true)).toBeCloseTo(0.8);
    expect(applyPassShopDiscount(0.55, true, 0.5)).toBe(0.5);
    expect(applyPassShopDiscount(0.9, false)).toBe(0.9);
  });
});

describe('Pass localStorage', () => {
  const hasStorage =
    typeof localStorage !== 'undefined' &&
    typeof localStorage.setItem === 'function' &&
    typeof localStorage.removeItem === 'function';

  beforeEach(() => {
    if (hasStorage) localStorage.removeItem(PASS_STORAGE_KEY);
  });
  afterEach(() => {
    if (hasStorage) localStorage.removeItem(PASS_STORAGE_KEY);
  });

  it('round-trips persisted state when storage exists', () => {
    if (!hasStorage) {
      // Node vitest without browser localStorage — pure helpers still work.
      expect(loadPassFromStorage().expiresAt).toBe(0);
      return;
    }
    const pass = activatePassPeriod(EMPTY_PASS, 'stripe', 50_000);
    savePassToStorage(pass);
    const loaded = loadPassFromStorage();
    expect(loaded.expiresAt).toBe(pass.expiresAt);
    expect(loaded.source).toBe('stripe');
  });

  it('returns empty on corrupt data', () => {
    if (!hasStorage) {
      expect(loadPassFromStorage().expiresAt).toBe(0);
      return;
    }
    localStorage.setItem(PASS_STORAGE_KEY, '{not-json');
    expect(loadPassFromStorage().expiresAt).toBe(0);
  });
});
