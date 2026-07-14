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

export const PANEL =
  'border border-[#222428] bg-black/70 backdrop-blur-sm';

export const LABEL =
  'text-[10px] tracking-[0.3em] uppercase text-neutral-500';

export const PROMPT =
  'font-mono border border-[#222428] bg-black/80 backdrop-blur-sm px-5 py-2 text-center text-[11px] tracking-[0.18em] uppercase text-neutral-300';
