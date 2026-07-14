/**
 * Stripe Pass client helpers — Payment Link checkout + success restore.
 *
 * Production flow:
 * 1. Client opens VITE_STRIPE_PAYMENT_LINK
 * 2. Stripe redirects to success URL with ?pass=success (configure in Dashboard)
 * 3. Optional: Supabase Edge Function `stripe-pass-webhook` verifies signature
 *    and upserts ironhaven_pass_subs
 * 4. Client calls restorePassFromServer() if VITE_STRIPE_PASS_API is set
 *
 * Offline / demo: activatePassPeriod remains available.
 */

import {
  activatePassPeriod,
  loadPassFromStorage,
  savePassToStorage,
  type PassPersisted,
  EMPTY_PASS,
  PASS_DURATION_MS,
} from '../game/subscription';

export function stripePassApiUrl(): string | null {
  try {
    const u = import.meta.env.VITE_STRIPE_PASS_API?.trim();
    if (!u) return null;
    // Allow relative paths for same-origin Vercel /api routes.
    if (u.startsWith('/') && typeof window !== 'undefined') {
      return `${window.location.origin}${u}`;
    }
    return u;
  } catch {
    return null;
  }
}

export function stripeWebhookSecretConfigured(): boolean {
  // Client never sees the secret; presence of API URL means server path exists.
  return Boolean(stripePassApiUrl());
}

/**
 * After Stripe redirects back with ?pass=success, provision a week locally
 * (and try server restore when API is set).
 */
export async function handlePassReturnFromUrl(
  search = typeof window !== 'undefined' ? window.location.search : ''
): Promise<PassPersisted | null> {
  const params = new URLSearchParams(search);
  const flag = params.get('pass') || params.get('checkout');
  if (flag !== 'success' && flag !== 'complete') return null;

  // Prefer server truth when available (player id from local progress).
  let playerId: string | null = null;
  try {
    const progress = localStorage.getItem('ironhaven-progress-v1');
    if (progress) {
      const p = JSON.parse(progress) as { playerId?: string };
      playerId = p.playerId || null;
    }
  } catch {
    /* ignore */
  }

  const remote = await restorePassFromServer(playerId);
  if (remote) {
    clearPassQueryParams();
    return remote;
  }

  // Fallback: client provision (dev / Payment Link without webhook yet).
  const next = activatePassPeriod(loadPassFromStorage(), 'stripe');
  savePassToStorage(next);
  clearPassQueryParams();
  return next;
}

function clearPassQueryParams(): void {
  try {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('pass');
    url.searchParams.delete('checkout');
    url.searchParams.delete('session_id');
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
  } catch {
    /* ignore */
  }
}

/**
 * GET/POST VITE_STRIPE_PASS_API?playerId=… — returns { expiresAt }.
 * Edge function should read Stripe subscription or DB row.
 */
export async function restorePassFromServer(
  playerId?: string | null
): Promise<PassPersisted | null> {
  const api = stripePassApiUrl();
  if (!api) return null;
  try {
    const url = new URL(api);
    if (playerId) url.searchParams.set('playerId', playerId);
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      expiresAt?: number;
      active?: boolean;
    };
    if (!data.expiresAt && !data.active) return null;
    const expiresAt =
      data.expiresAt ||
      (data.active ? Date.now() + PASS_DURATION_MS : 0);
    if (expiresAt <= Date.now()) return null;
    const pass: PassPersisted = {
      ...EMPTY_PASS,
      expiresAt,
      source: 'restore',
      activatedAt: Date.now(),
      weeklySpClaimKey: loadPassFromStorage().weeklySpClaimKey,
    };
    savePassToStorage(pass);
    return pass;
  } catch {
    return null;
  }
}

/**
 * Dev / local playtest: grant a week via pass-api POST /dev/grant-pass.
 * No-op if API is not local or request fails.
 */
export async function grantPassViaLocalApi(
  playerId?: string | null
): Promise<PassPersisted | null> {
  const api = stripePassApiUrl();
  if (!api || !/localhost|127\.0\.0\.1/.test(api)) return null;
  try {
    const base = new URL(api);
    const grantUrl = `${base.origin}/dev/grant-pass`;
    const res = await fetch(grantUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ playerId: playerId || 'anonymous' }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { expiresAt?: number; active?: boolean };
    if (!data.active && !data.expiresAt) return null;
    const expiresAt =
      data.expiresAt || Date.now() + PASS_DURATION_MS;
    const pass: PassPersisted = {
      ...EMPTY_PASS,
      expiresAt,
      source: 'restore',
      activatedAt: Date.now(),
      weeklySpClaimKey: loadPassFromStorage().weeklySpClaimKey,
    };
    savePassToStorage(pass);
    return pass;
  } catch {
    return null;
  }
}
