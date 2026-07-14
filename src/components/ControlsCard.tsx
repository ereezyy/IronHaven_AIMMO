import React, { useEffect } from 'react';
import { CONTROLS_ROWS, markControlsCardSeen } from '../game/onboarding';
import { gameAudio } from '../lib/gameAudio';
import { MODAL_BACKDROP, MODAL_SHELL, COLORS, Z } from '../game/uiTheme';

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
      className={MODAL_BACKDROP}
      style={{ zIndex: Z.modalTop }}
      onClick={close}
    >
      <div
        className={MODAL_SHELL + ' max-w-md'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[#1a1c1f] px-4 py-3 flex justify-between items-center">
          <div>
            <div className="text-[9px] tracking-[0.35em] uppercase text-neutral-600">
              first drop
            </div>
            <div className="text-[14px] tracking-[0.18em] uppercase text-neutral-100">
              Controls
            </div>
          </div>
          <button
            onClick={close}
            className="text-[10px] tracking-[0.25em] uppercase text-neutral-500 hover:text-neutral-200"
          >
            esc
          </button>
        </div>
        <div className="overflow-y-auto p-3 space-y-1 flex-1">
          {CONTROLS_ROWS.map((r) => (
            <div
              key={r.keys + r.action}
              className="flex justify-between gap-3 px-2 py-1.5 border border-[#141517] text-[11px]"
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
        <div className="border-t border-[#1a1c1f] px-4 py-3">
          <button
            onClick={close}
            className="w-full border py-2.5 text-[11px] tracking-[0.25em] uppercase"
            style={{
              borderColor: COLORS.accent,
              color: COLORS.accent,
              background: `${COLORS.accent}18`,
            }}
          >
            enter district · enter
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlsCard;
