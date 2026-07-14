/**
 * Iron Haven Pass — $1.99/week premium subscription.
 *
 * Client-side model with localStorage persistence for demo play.
 * Production: open Stripe Checkout/Payment Link when env is set;
 * webhook should later set server truth. Demo path activates a week
 * without payment so the loop is fully testable offline.
 */

export const PASS_STORAGE_KEY = 'ironhaven-pass';

/** ISO currency display. */
export const PASS_PRICE_USD = 1.99;
export const PASS_PRICE_CENTS = 199;
export const PASS_INTERVAL: 'week' = 'week';
export const PASS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export const PASS_PRODUCT = {
  id: 'iron_haven_pass',
  name: 'Iron Haven Pass',
  tagline: 'Stay lethal on the street.',
  priceUsd: PASS_PRICE_USD,
  interval: PASS_INTERVAL,
  priceLabel: '$1.99 / week',
} as const;

/** Stackable multipliers / flags while Pass is active. */
export interface PassBenefits {
  /** Multiplier applied after skill xpBonus (e.g. 1.25 = +25%). */
  xpMult: number;
  /** Flat shop discount fraction (0.1 = 10% off), stacked then clamped. */
  shopDiscount: number;
  /** Extra harvest yield multiplier. */
  harvestMult: number;
  /** Extra fish bite chance bonus (additive 0–1 scale). */
  fishChanceBonus: number;
  /** Skill points granted once per calendar week while subscribed. */
  weeklySkillPoints: number;
  /** VIP name badge in chat / HUD. */
  vipBadge: boolean;
  /** Soft cosmetic: gold accent on callsign strip. */
  goldAccent: boolean;
}

export const PASS_BENEFITS: PassBenefits = {
  xpMult: 1.25,
  shopDiscount: 0.1,
  harvestMult: 1.1,
  fishChanceBonus: 0.05,
  weeklySkillPoints: 2,
  vipBadge: true,
  goldAccent: true,
};

export interface PassBenefitLine {
  id: string;
  label: string;
  detail: string;
}

export const PASS_BENEFIT_LINES: PassBenefitLine[] = [
  {
    id: 'xp',
    label: '+25% XP',
    detail: 'All sources — hunt, jobs, PvP, bosses, craft, fish.',
  },
  {
    id: 'shop',
    label: '10% shop discount',
    detail: 'Stacks with skills & faction ally rates (capped).',
  },
  {
    id: 'sp',
    label: '+2 skill points / week',
    detail: 'Claim once per week while your Pass is live.',
  },
  {
    id: 'harvest',
    label: '+10% harvest yield',
    detail: 'More scrap, circuits, and street goods per node.',
  },
  {
    id: 'fish',
    label: '+5% fish bite',
    detail: 'Better odds at every cast spot.',
  },
  {
    id: 'vip',
    label: 'VIP badge',
    detail: 'Gold Pass tag in chat and on your HUD strip.',
  },
];

export interface PassPersisted {
  /** Unix ms when current period ends. 0 / missing = inactive. */
  expiresAt: number;
  /** How the current period was activated. */
  source: 'demo' | 'stripe' | 'restore';
  /** ISO week key last claimed for weekly SP, e.g. "2026-W28". */
  weeklySpClaimKey: string | null;
  /** Last activation timestamp. */
  activatedAt: number;
}

export const EMPTY_PASS: PassPersisted = {
  expiresAt: 0,
  source: 'demo',
  weeklySpClaimKey: null,
  activatedAt: 0,
};

export function isPassActive(
  pass: Pick<PassPersisted, 'expiresAt'>,
  now = Date.now()
): boolean {
  return typeof pass.expiresAt === 'number' && pass.expiresAt > now;
}

export function msRemaining(
  pass: Pick<PassPersisted, 'expiresAt'>,
  now = Date.now()
): number {
  if (!isPassActive(pass, now)) return 0;
  return Math.max(0, pass.expiresAt - now);
}

export function formatPassRemaining(
  pass: Pick<PassPersisted, 'expiresAt'>,
  now = Date.now()
): string {
  const ms = msRemaining(pass, now);
  if (ms <= 0) return 'expired';
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days >= 1) return `${days}d ${hours}h`;
  const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours >= 1) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/** ISO week key used for weekly SP claim idempotency. */
export function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Thursday in current week decides the year.
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function canClaimWeeklySp(
  pass: PassPersisted,
  now = Date.now()
): boolean {
  if (!isPassActive(pass, now)) return false;
  return pass.weeklySpClaimKey !== isoWeekKey(new Date(now));
}

export function activatePassPeriod(
  prev: PassPersisted,
  source: PassPersisted['source'],
  now = Date.now()
): PassPersisted {
  // Stack remaining time if still active (renewal).
  const base = isPassActive(prev, now) ? prev.expiresAt : now;
  return {
    expiresAt: base + PASS_DURATION_MS,
    source,
    weeklySpClaimKey: prev.weeklySpClaimKey,
    activatedAt: now,
  };
}

export function markWeeklySpClaimed(
  pass: PassPersisted,
  now = Date.now()
): PassPersisted {
  return { ...pass, weeklySpClaimKey: isoWeekKey(new Date(now)) };
}

export function loadPassFromStorage(): PassPersisted {
  try {
    if (typeof localStorage === 'undefined') return { ...EMPTY_PASS };
    const raw = localStorage.getItem(PASS_STORAGE_KEY);
    if (!raw) return { ...EMPTY_PASS };
    const parsed = JSON.parse(raw) as Partial<PassPersisted>;
    return {
      expiresAt: Number(parsed.expiresAt) || 0,
      source:
        parsed.source === 'stripe' || parsed.source === 'restore'
          ? parsed.source
          : 'demo',
      weeklySpClaimKey:
        typeof parsed.weeklySpClaimKey === 'string'
          ? parsed.weeklySpClaimKey
          : null,
      activatedAt: Number(parsed.activatedAt) || 0,
    };
  } catch {
    return { ...EMPTY_PASS };
  }
}

export function savePassToStorage(pass: PassPersisted): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(PASS_STORAGE_KEY, JSON.stringify(pass));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Stripe Payment Link or Checkout URL from Vite env (optional). */
export function stripeCheckoutUrl(): string | null {
  try {
    const env = (import.meta as ImportMeta & { env?: Record<string, string> })
      .env;
    const url =
      env?.VITE_STRIPE_PAYMENT_LINK ||
      env?.VITE_STRIPE_CHECKOUT_URL ||
      env?.VITE_STRIPE_PASS_URL ||
      '';
    return url.trim() || null;
  } catch {
    return null;
  }
}

export function isStripeReady(): boolean {
  return Boolean(stripeCheckoutUrl());
}

/**
 * Open Stripe Checkout if configured; returns 'stripe' | 'demo' path chosen.
 * Caller still activates demo when 'demo' is returned.
 */
export function beginCheckout(): 'stripe' | 'demo' {
  const url = stripeCheckoutUrl();
  if (url && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return 'stripe';
  }
  return 'demo';
}

/** Apply Pass shop discount on top of existing multiplier, clamp floor. */
export function applyPassShopDiscount(
  currentMult: number,
  passActive: boolean,
  floor = 0.5
): number {
  if (!passActive) return currentMult;
  return Math.max(floor, currentMult - PASS_BENEFITS.shopDiscount);
}

export function applyPassXp(
  amount: number,
  passActive: boolean
): number {
  if (!passActive || amount <= 0) return amount;
  return Math.round(amount * PASS_BENEFITS.xpMult);
}
