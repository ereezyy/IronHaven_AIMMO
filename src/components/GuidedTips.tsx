import React, { useEffect } from 'react';
import {
  type GuidedTip,
  tipProgress,
  type GuidedTipsState,
} from '../game/guidedTips';
import { COLORS, PANEL } from '../game/uiTheme';
import { gameAudio } from '../lib/gameAudio';

interface GuidedTipsProps {
  tip: GuidedTip;
  state: GuidedTipsState;
  onComplete: (id: GuidedTip['id']) => void;
  onSkipTour: () => void;
  /** When true, hide card (modals / cutscenes). */
  hidden?: boolean;
}

/**
 * Corner coach card for first-time players — non-blocking, auto-advances
 * when the suggested action is done, or via Next / Skip tour.
 */
const GuidedTips: React.FC<GuidedTipsProps> = ({
  tip,
  state,
  onComplete,
  onSkipTour,
  hidden,
}) => {
  const { step, total } = tipProgress(state);
  const isFinale = tip.id === 'done';

  useEffect(() => {
    if (hidden) return;
    gameAudio.play('ui', 0.08);
  }, [tip.id, hidden]);

  // Keyboard: N next/skip tip, Shift+Esc skip tour (Esc alone is for panels).
  useEffect(() => {
    if (hidden) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'KeyN' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        gameAudio.play('ui', 0.1);
        onComplete(tip.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tip.id, onComplete, hidden]);

  if (hidden) return null;

  return (
    <div
      className="absolute bottom-36 left-4 z-[27] w-[min(22rem,calc(100vw-2rem))] font-mono pointer-events-auto"
      style={{ animation: 'tipIn 0.35s ease both' }}
    >
      <div
        className={`${PANEL} overflow-hidden`}
        style={{
          borderColor: isFinale ? COLORS.gold : COLORS.border,
          boxShadow: `0 0 24px ${isFinale ? COLORS.gold : COLORS.accent}22`,
        }}
      >
        {/* Progress rail */}
        <div className="h-[2px] w-full bg-[#141517]">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (step / total) * 100)}%`,
              background: isFinale ? COLORS.gold : COLORS.accent,
            }}
          />
        </div>

        <div className="px-4 py-3 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div
                className="text-[9px] tracking-[0.32em] uppercase"
                style={{ color: isFinale ? COLORS.gold : COLORS.accent }}
              >
                coach · {tip.chapter}
              </div>
              <div className="text-[13px] tracking-[0.12em] uppercase text-neutral-100 mt-0.5">
                {tip.title}
              </div>
            </div>
            <div className="text-[9px] tracking-[0.2em] uppercase text-neutral-600 shrink-0 pt-0.5">
              {step}/{total}
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-neutral-400">
            {tip.body}
          </p>

          {tip.keyHint && (
            <div className="flex items-center gap-2 pt-0.5">
              <span className="text-[9px] tracking-[0.25em] uppercase text-neutral-600">
                try
              </span>
              <span
                className="text-[10px] tracking-[0.2em] uppercase px-2 py-0.5 border"
                style={{
                  borderColor: isFinale ? COLORS.gold : COLORS.accent,
                  color: isFinale ? COLORS.gold : COLORS.accent,
                }}
              >
                {tip.keyHint}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                gameAudio.play(isFinale ? 'market' : 'ui', 0.12);
                onComplete(tip.id);
              }}
              className="flex-1 border px-3 py-1.5 text-[10px] tracking-[0.22em] uppercase"
              style={{
                borderColor: isFinale ? COLORS.gold : COLORS.accent,
                color: isFinale ? COLORS.gold : COLORS.accent,
                background: isFinale
                  ? `${COLORS.gold}14`
                  : `${COLORS.accent}14`,
              }}
            >
              {isFinale ? 'finish · n' : 'next · n'}
            </button>
            {!isFinale && (
              <button
                type="button"
                onClick={() => {
                  gameAudio.play('ui', 0.1);
                  onSkipTour();
                }}
                className="px-3 py-1.5 text-[9px] tracking-[0.2em] uppercase text-neutral-600 hover:text-neutral-400"
              >
                skip tour
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tipIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default GuidedTips;
