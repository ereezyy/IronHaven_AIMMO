/**
 * Player-experience helpers — first-session clarity, recovery UX, low-end
 * detection, and daily board splash state. Pure / localStorage only.
 */

import { readBreadcrumb, clearBreadcrumb } from './crashBreadcrumb';
import {
  degradeGfxTier,
  getGfxSettings,
  readGfxTier,
  writeGfxTier,
  type GfxTier,
} from './graphicsQuality';
export type PxObjective = { id: string; label: string; done: boolean };

const DAILY_SPLASH_KEY = 'ironhaven_daily_splash_day';
const CONTROLS_PIN_KEY = 'ironhaven_controls_pinned';

/** Heuristic: integrated / weak GPU → start on performance tier. */
export function detectLowEndGpu(): boolean {
  if (typeof navigator === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '')
      : '';
    const cores = navigator.hardwareConcurrency || 4;
    const mem =
      (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
    const lowRenderer =
      /intel|uhd|hd graphics|iris|mali|adreno|apple gpu|swiftshader|llvmpipe/i.test(
        renderer
      );
    return lowRenderer || cores <= 4 || mem <= 4;
  } catch {
    return false;
  }
}

/**
 * Boot-time quality: respect a saved tier; if none and device looks weak,
 * pin performance. Does not upgrade a user who already chose cinematic.
 */
export function resolveBootGfxTier(): GfxTier {
  if (typeof localStorage === 'undefined') return 'balanced';
  try {
    const raw = localStorage.getItem('ironhaven_gfx_tier');
    if (
      raw === 'cinematic' ||
      raw === 'balanced' ||
      raw === 'performance' ||
      raw === 'safe'
    ) {
      return raw;
    }
  } catch {
    // fall through
  }
  if (detectLowEndGpu()) {
    writeGfxTier('performance');
    return 'performance';
  }
  writeGfxTier('balanced');
  return 'balanced';
}

export type SessionNotice = {
  id: string;
  title: string;
  body: string;
  tone: 'warn' | 'info' | 'ok';
};

/** Consume prior crash breadcrumb into a one-shot player-facing notice. */
export function consumeSessionRecoveryNotice(): SessionNotice | null {
  const crumb = readBreadcrumb();
  if (!crumb) return null;
  clearBreadcrumb();
  if (crumb.kind === 'webglcontextlost') {
    const tier = readGfxTier();
    return {
      id: 'webgl-recover',
      title: 'GPU recovered',
      body: `Last session lost the graphics context after ${crumb.sessionAgeSec}s. Running on ${tier} quality.`,
      tone: 'warn',
    };
  }
  if (crumb.kind === 'error' || crumb.kind === 'unhandledrejection') {
    return {
      id: 'js-recover',
      title: 'Session recovered',
      body: crumb.message.slice(0, 160),
      tone: 'warn',
    };
  }
  return null;
}

export function firstOpenObjective(
  objectives: PxObjective[] | undefined
): PxObjective | null {
  if (!objectives?.length) return null;
  return objectives.find((o) => !o.done) ?? null;
}

/** UTC day key for daily board splash once per day. */
export function utcDayKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function shouldShowDailySplash(now = Date.now()): boolean {
  if (typeof localStorage === 'undefined') return true;
  try {
    return localStorage.getItem(DAILY_SPLASH_KEY) !== utcDayKey(now);
  } catch {
    return true;
  }
}

export function markDailySplashSeen(now = Date.now()): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DAILY_SPLASH_KEY, utcDayKey(now));
  } catch {
    // ignore
  }
}

export function loadControlsPinned(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(CONTROLS_PIN_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveControlsPinned(pinned: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (pinned) localStorage.setItem(CONTROLS_PIN_KEY, '1');
    else localStorage.removeItem(CONTROLS_PIN_KEY);
  } catch {
    // ignore
  }
}

export function wantedCoolOffHint(wanted: number): string | null {
  if (wanted <= 0) return null;
  if (wanted >= 3)
    return 'Heat is high — lay low, visit a shop for clear heat, or reach The Den (safe zone).';
  return 'Wanted — avoid cops or pay clear heat at a street shop.';
}

export function deathLessonLines(penalty: number): string[] {
  const lines = [
    'Wanted stars cleared on respawn.',
    'You wake at Spawn Sanctum with full health.',
  ];
  if (penalty > 0) {
    lines.unshift(`Lost $${penalty} on the street (death tax).`);
  }
  lines.push('The Den (safehouse) stores gear — press E near the door.');
  return lines;
}

/** Particle / sparkles density multiplier from gfx tier. */
export function vfxDensityForTier(tier: GfxTier = readGfxTier()): number {
  switch (tier) {
    case 'cinematic':
      return 1;
    case 'balanced':
      return 0.7;
    case 'performance':
      return 0.35;
    case 'safe':
      return 0.15;
  }
}

export { getGfxSettings, readGfxTier, writeGfxTier, degradeGfxTier };
