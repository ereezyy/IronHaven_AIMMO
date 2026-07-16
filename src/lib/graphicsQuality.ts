/**
 * Adaptive GPU quality for the MMO canvas.
 *
 * Full cinematic post (SSAO + normal pass + large bloom + CA + SMAA) is the
 * leading cause of WebGL context loss on mid-range GPUs after a few minutes.
 * We start on a stable tier and step down on each context-loss event, with
 * the choice persisted so the next session boots safe.
 */

const STORAGE_KEY = 'ironhaven_gfx_tier';

export type GfxTier = 'cinematic' | 'balanced' | 'performance' | 'safe';

const TIER_ORDER: GfxTier[] = ['cinematic', 'balanced', 'performance', 'safe'];

export type GfxSettings = {
  tier: GfxTier;
  /** R3F dpr cap. */
  dpr: [number, number];
  /** Shadow map resolution (square). */
  shadowMapSize: number;
  /** Master switch for EffectComposer. */
  postEnabled: boolean;
  ssao: boolean;
  bloom: boolean;
  bloomKernel: 'small' | 'medium' | 'large';
  chromatic: boolean;
  noise: boolean;
  vignette: boolean;
  smaa: boolean;
  /** EffectComposer enableNormalPass — required by SSAO, expensive. */
  normalPass: boolean;
};

const SETTINGS: Record<GfxTier, GfxSettings> = {
  cinematic: {
    tier: 'cinematic',
    dpr: [1, 1.5],
    shadowMapSize: 2048,
    postEnabled: true,
    ssao: true,
    bloom: true,
    bloomKernel: 'large',
    chromatic: true,
    noise: true,
    vignette: true,
    smaa: true,
    normalPass: true,
  },
  // Default: neon look without the SSAO/normal-pass tax that triggers TDR.
  balanced: {
    tier: 'balanced',
    dpr: [1, 1.25],
    shadowMapSize: 1024,
    postEnabled: true,
    ssao: false,
    bloom: true,
    bloomKernel: 'medium',
    chromatic: false,
    noise: true,
    vignette: true,
    smaa: true,
    normalPass: false,
  },
  performance: {
    tier: 'performance',
    dpr: [1, 1],
    shadowMapSize: 512,
    postEnabled: true,
    ssao: false,
    bloom: true,
    bloomKernel: 'small',
    chromatic: false,
    noise: false,
    vignette: true,
    smaa: false,
    normalPass: false,
  },
  safe: {
    tier: 'safe',
    dpr: [1, 1],
    shadowMapSize: 512,
    postEnabled: false,
    ssao: false,
    bloom: false,
    bloomKernel: 'small',
    chromatic: false,
    noise: false,
    vignette: false,
    smaa: false,
    normalPass: false,
  },
};

function isTier(v: unknown): v is GfxTier {
  return (
    v === 'cinematic' || v === 'balanced' || v === 'performance' || v === 'safe'
  );
}

export function readGfxTier(): GfxTier {
  if (typeof localStorage === 'undefined') return 'balanced';
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isTier(raw)) return raw;
  } catch {
    // ignore
  }
  return 'balanced';
}

export function writeGfxTier(tier: GfxTier): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, tier);
  } catch {
    // ignore
  }
}

export function getGfxSettings(tier: GfxTier = readGfxTier()): GfxSettings {
  return SETTINGS[tier];
}

/** Drop one tier (cinematic → … → safe). Returns the new tier. */
export function degradeGfxTier(current?: GfxTier): GfxTier {
  const from = current ?? readGfxTier();
  const i = TIER_ORDER.indexOf(from);
  const next = TIER_ORDER[Math.min(TIER_ORDER.length - 1, i + 1)];
  writeGfxTier(next);
  return next;
}

export function tierLabel(tier: GfxTier): string {
  switch (tier) {
    case 'cinematic':
      return 'cinematic';
    case 'balanced':
      return 'balanced';
    case 'performance':
      return 'performance';
    case 'safe':
      return 'safe';
  }
}
