/**
 * Shared HUD / panel chrome — keeps modal + toast layout consistent.
 */

/** Tailwind-friendly z-index scale (use as style.zIndex or arbitrary classes). */
export const Z = {
  hud: 20,
  prompts: 25,
  toast: 28,
  killFeed: 26,
  modal: 40,
  modalTop: 46,
  cutscene: 55,
  briefing: 52,
  fade: 60,
  system: 9998,
} as const;

export const COLORS = {
  accent: '#c03a30',
  gold: '#c9a15a',
  border: '#222428',
  borderSoft: '#1a1c1f',
  panel: 'rgba(8, 8, 10, 0.94)',
  panelSolid: '#08080a',
  muted: '#5a5d62',
  text: '#e5e5e8',
  dim: '#9ca3af',
} as const;

/** Shared modal shell className. */
export const MODAL_SHELL =
  'w-full max-w-lg mx-3 border border-[#222428] bg-[#08080a]/96 backdrop-blur-md max-h-[88vh] flex flex-col shadow-2xl';

export const MODAL_BACKDROP =
  'absolute inset-0 flex items-center justify-center font-mono bg-black/55 backdrop-blur-[2px]';

export const PANEL = 'border border-[#222428] bg-black/70 backdrop-blur-sm';

export const LABEL = 'text-[10px] tracking-[0.3em] uppercase text-neutral-500';

export const PROMPT =
  'font-mono border border-[#222428] bg-black/80 backdrop-blur-sm px-5 py-2 text-center text-[11px] tracking-[0.18em] uppercase text-neutral-300';

/**
 * Motion choreography — custom cubic-bezier curves (no linear / ease-in-out).
 * EASE_OUT is the primary panel-entry curve (fast in, soft settle);
 * EASE_SPRING gives a subtle over-settle for tactile chrome.
 */
export const EASE = {
  out: 'cubic-bezier(0.32, 0.72, 0, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  soft: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

/**
 * Double-Bezel (Doppelrand) — a nested enclosure that reads as machined depth
 * instead of a flat bordered box. The OUTER shell carries the hard edge; the
 * INNER core sits inset with a hairline + top highlight for edge refraction.
 * Radii are intentionally matched (sharp / near-sharp) to honor the HUD's
 * shape lock — this is depth via layering, not rounding.
 */
export const BEZEL_OUTER =
  'relative border border-[#222428] bg-[#050506]/96 backdrop-blur-md ' +
  'shadow-[0_24px_70px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.04)]';

export const BEZEL_INNER =
  'relative border border-[#16181b] bg-[#0a0a0c]/70 ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.03),inset_0_0_0_1px_rgba(0,0,0,0.4)]';

/**
 * Keyframes + reduced-motion collapse for HUD chrome. Mount once per panel
 * (inline <style>) so the overlay is self-contained. Every animation degrades
 * to a static, instant state under prefers-reduced-motion.
 */
export const HUD_KEYFRAMES = `
  @keyframes hudBackdropIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes hudShellIn {
    from { opacity: 0; transform: translateY(14px) scale(0.985); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes hudRowIn {
    from { opacity: 0; transform: translateX(-8px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes hudStripIn {
    from { opacity: 0; transform: translateY(-12px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes hudPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.68); }
  }
  @media (prefers-reduced-motion: reduce) {
    [data-hud-anim] { animation: none !important; opacity: 1 !important; transform: none !important; }
  }
`;
