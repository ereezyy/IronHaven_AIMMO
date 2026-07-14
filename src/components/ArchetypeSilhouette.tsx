import React from 'react';
import { ArchetypeId } from '../game/character';
import { BEZEL_INNER, EASE } from '../game/uiTheme';

interface ArchetypeSilhouetteProps {
  archetype: ArchetypeId;
  tint: string;
  accent: string;
  bodyScale: number;
}

/**
 * Stylized per-archetype silhouette. Replaces the old gray-block placeholder so
 * the content layer reads as designed (matching the HUD chrome) rather than a
 * prototype. Each class gets a distinct posture / gear; the figure is painted in
 * the player's chosen tint + accent. Depth via layering (Double-Bezel frame +
 * tactical grid), motion via the shared EASE tokens, reduced-motion aware.
 */

/** Gear overlay drawn in the accent color — the per-class signature. */
const GEAR: Record<ArchetypeId, React.ReactNode> = {
  // Runner — light scarf + satchel strap. Fast, unburdened.
  runner: (
    <>
      <path d="M40 44 q20 6 40 0 l-2 8 q-18 5 -36 0 z" />
      <path d="M46 60 L74 128" strokeWidth={3} fill="none" />
    </>
  ),
  // Enforcer — chest plate + shoulder pauldron. Heavy, front-line.
  enforcer: (
    <>
      <rect x="42" y="58" width="36" height="34" rx="2" opacity={0.9} />
      <path d="M34 56 q10 -8 22 -4 l-2 12 q-12 -3 -20 4 z" />
    </>
  ),
  // Ghost — hood + visor slit. Quiet, obscured.
  ghost: (
    <>
      <path d="M42 28 q18 -14 36 0 l0 20 q-18 8 -36 0 z" opacity={0.85} />
      <rect x="50" y="36" width="20" height="4" rx="2" />
    </>
  ),
  // Fixer — long coat lapels + case. Dealmaker.
  fixer: (
    <>
      <path d="M52 46 L46 120 M68 46 L74 120" strokeWidth={3} fill="none" />
      <rect x="76" y="96" width="16" height="20" rx="1" opacity={0.9} />
    </>
  ),
};

const ArchetypeSilhouette: React.FC<ArchetypeSilhouetteProps> = ({
  archetype,
  tint,
  accent,
  bodyScale,
}) => {
  const gid = `sil-grad-${archetype}`;
  return (
    <div
      className={`${BEZEL_INNER} w-32 h-44 overflow-hidden`}
      data-hud-anim
      style={{ animation: `silIn 520ms ${EASE.out} both` }}
    >
      <style>{`
        @keyframes silIn {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes silBreathe {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-hud-anim] { animation: none !important; opacity: 1 !important; transform: none !important; }
          .sil-figure { animation: none !important; }
        }
      `}</style>

      {/* tactical grid backdrop */}
      <div
        className="absolute inset-0 opacity-[0.14] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#ffffff11 1px, transparent 1px), linear-gradient(90deg, #ffffff11 1px, transparent 1px)',
          backgroundSize: '12px 12px',
        }}
      />
      {/* accent floor glow */}
      <div
        className="absolute inset-x-4 bottom-0 h-10 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 100%, ${accent}44, transparent 70%)`,
        }}
      />

      <svg
        viewBox="0 0 120 150"
        className="sil-figure absolute inset-0 w-full h-full"
        style={{
          transform: `scale(${bodyScale})`,
          transformOrigin: '50% 60%',
          animation: `silBreathe 4200ms ${EASE.soft} infinite`,
        }}
        role="img"
        aria-label={`${archetype} silhouette`}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={tint} stopOpacity="0.95" />
            <stop offset="1" stopColor={tint} stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* body base — shared torso/head/legs, gear differentiates class */}
        <g fill={`url(#${gid})`} stroke="none">
          <circle cx="60" cy="26" r="13" />
          <path d="M44 42 q16 -6 32 0 l4 52 q-20 8 -40 0 z" />
          <path d="M48 96 L44 138 L54 138 L60 100 L66 138 L76 138 L72 96 z" />
        </g>

        {/* per-class gear in accent */}
        <g fill={accent} stroke={accent} strokeLinejoin="round">
          {GEAR[archetype]}
        </g>
      </svg>
    </div>
  );
};

export default ArchetypeSilhouette;
