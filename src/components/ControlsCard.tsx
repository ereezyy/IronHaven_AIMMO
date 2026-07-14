import React, { useEffect } from 'react';
import { CONTROLS_ROWS, markControlsCardSeen } from '../game/onboarding';
import { gameAudio } from '../lib/gameAudio';
import {
  MODAL_BACKDROP,
  BEZEL_OUTER,
  BEZEL_INNER,
  EASE,
  HUD_KEYFRAMES,
  COLORS,
  Z,
} from '../game/uiTheme';

interface ControlsCardProps {
  onClose: () => void;
}

const ControlsCard: React.FC<ControlsCardProps> = ({ onClose }) => {
  const close = () => {
    markControlsCardSeen();
    gameAudio.play('ui', 0.12);
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.code === 'Enter' ||
        e.code === 'Space' ||
        e.code === 'Escape' ||
        e.code === 'KeyX'
      ) {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  return (
    <div
      data-hud-anim
      className={MODAL_BACKDROP}
      style={{
        zIndex: Z.modalTop,
        animation: `hudBackdropIn 0.3s ${EASE.out} both`,
      }}
      onClick={close}
    >
      <style>{HUD_KEYFRAMES}</style>
      <div
        data-hud-anim
        className={`${BEZEL_OUTER} w-full max-w-md mx-3 max-h-[88vh] flex flex-col p-[3px]`}
        style={{ animation: `hudShellIn 0.42s ${EASE.out} both` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${BEZEL_INNER} flex flex-col min-h-0 flex-1`}>
          <div className="border-b border-[#141517] px-5 py-4 flex justify-between items-center">
            <div className="space-y-1">
              <div className="text-[9px] tracking-[0.38em] uppercase text-neutral-600">
                first drop
              </div>
              <div className="text-[15px] tracking-[0.2em] uppercase text-neutral-50">
                Controls
              </div>
            </div>
            <button
              onClick={close}
              className="text-[10px] tracking-[0.25em] uppercase text-neutral-500 hover:text-neutral-200 active:translate-y-[1px] transition-all"
              style={{ transitionTimingFunction: EASE.out }}
            >
              esc
            </button>
          </div>
          <div className="overflow-y-auto p-3 space-y-1 flex-1">
            {CONTROLS_ROWS.map((r, i) => (
              <div
                key={r.keys + r.action}
                data-hud-anim
                className="flex justify-between gap-3 px-2.5 py-2 border border-[#141517] text-[11px]"
                style={{
                  animation: `hudRowIn 0.4s ${EASE.out} both`,
                  animationDelay: `${Math.min(i, 12) * 0.03}s`,
                }}
              >
                <span
                  className="tracking-[0.12em] uppercase shrink-0"
                  style={{ color: COLORS.accent }}
                >
                  {r.keys}
                </span>
                <span className="text-neutral-400 text-right">{r.action}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-[#141517] px-5 py-4">
            <button
              onClick={close}
              className="w-full border py-2.5 text-[11px] tracking-[0.25em] uppercase active:translate-y-[1px] transition-all"
              style={{
                borderColor: COLORS.accent,
                color: COLORS.accent,
                background: `${COLORS.accent}18`,
                boxShadow: `inset 0 1px 0 ${COLORS.accent}22, 0 0 24px ${COLORS.accent}12`,
                transitionTimingFunction: EASE.out,
              }}
            >
              enter district · enter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlsCard;
