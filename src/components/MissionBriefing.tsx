import React, { useEffect, useState } from 'react';
import type { StreetContract } from '../lib/npcAi';
import { gameAudio } from '../lib/gameAudio';

interface MissionBriefingProps {
  contract: StreetContract;
  onAccept: () => void;
  onDecline: () => void;
  /** Handler / faction accent. */
  accent?: string;
  sourceLabel?: string;
}

/**
 * Full-screen mission briefing — accept/decline before a street contract
 * goes live on the HUD. Cinematic dossier feel with type-in objective.
 */
const MissionBriefing: React.FC<MissionBriefingProps> = ({
  contract,
  onAccept,
  onDecline,
  accent = '#c03a30',
  sourceLabel = 'street handler',
}) => {
  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    void gameAudio.unlock();
    gameAudio.cutsceneStinger('director');
    gameAudio.speak(
      `${contract.title}. ${contract.goal.label}. Payout ${contract.reward}.`,
      'director',
      0.18
    );
  }, [contract.id, contract.title, contract.goal.label, contract.reward]);

  // Stagger reveal: header → body → objective → actions
  useEffect(() => {
    const timers = [200, 600, 1100, 1500].map((ms, i) =>
      window.setTimeout(() => setPhase(i + 1), ms)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [contract.id]);

  // Type objective label
  useEffect(() => {
    if (phase < 3) return;
    const label = contract.goal.label;
    setTyped(0);
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setTyped(n);
      if (n >= label.length) window.clearInterval(id);
    }, 22);
    return () => window.clearInterval(id);
  }, [phase, contract.goal.label]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Enter' || e.code === 'KeyY') {
        e.preventDefault();
        gameAudio.play('market', 0.25);
        onAccept();
      } else if (e.code === 'Escape' || e.code === 'KeyN') {
        e.preventDefault();
        gameAudio.play('ui', 0.12);
        onDecline();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAccept, onDecline]);

  const diffColor =
    contract.difficulty === 'hard'
      ? '#c03a30'
      : contract.difficulty === 'medium'
        ? '#c9a15a'
        : '#3f7d4e';

  return (
    <div
      className="fixed inset-0 z-[52] flex items-center justify-center font-mono"
      style={{
        background:
          'radial-gradient(ellipse at 50% 40%, rgba(12,14,18,0.92) 0%, rgba(5,5,7,0.97) 70%)',
      }}
      role="dialog"
      aria-label="Mission briefing"
    >
      {/* Letterbox */}
      <div className="absolute inset-x-0 top-0 h-[8vh] bg-black" />
      <div className="absolute inset-x-0 bottom-0 h-[8vh] bg-black" />

      <div
        className="relative w-full max-w-xl mx-4 border bg-black/80 backdrop-blur-md"
        style={{ borderColor: accent + '55' }}
      >
        {/* Header rail */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: '#1a1c1f' }}
        >
          <div>
            <div
              className="text-[9px] tracking-[0.4em] uppercase"
              style={{ color: accent }}
            >
              mission briefing · {sourceLabel}
            </div>
            {phase >= 1 && (
              <div className="text-[11px] tracking-[0.2em] uppercase text-neutral-500 mt-1">
                contract {contract.id.slice(0, 8)}
              </div>
            )}
          </div>
          <div className="text-right">
            <div
              className="text-[10px] tracking-[0.25em] uppercase"
              style={{ color: diffColor }}
            >
              {contract.difficulty}
            </div>
            <div
              className="text-xl tracking-[0.08em] mt-0.5"
              style={{ color: accent }}
            >
              ${contract.reward}
            </div>
          </div>
        </div>

        <div className="px-5 py-6 space-y-5">
          {phase >= 1 && (
            <h2
              className="text-[clamp(22px,4vw,34px)] font-semibold tracking-[-0.02em] text-neutral-100 leading-tight"
              style={{
                fontFamily: '"Inter Tight", Inter, system-ui, sans-serif',
                textShadow: `0 0 28px ${accent}33`,
                animation: 'briefIn 0.45s ease both',
              }}
            >
              {contract.title}
            </h2>
          )}

          {phase >= 2 && (
            <p
              className="text-[13px] leading-relaxed text-neutral-400 max-w-md"
              style={{ animation: 'briefIn 0.5s ease both' }}
            >
              {contract.description}
            </p>
          )}

          {phase >= 3 && (
            <div
              className="border px-4 py-3"
              style={{
                borderColor: accent + '40',
                background: accent + '0c',
                animation: 'briefIn 0.45s ease both',
              }}
            >
              <div className="text-[9px] tracking-[0.35em] uppercase text-neutral-600 mb-2">
                primary objective
              </div>
              <div className="text-[13px] tracking-[0.06em] uppercase text-neutral-200">
                {contract.goal.label.slice(0, typed)}
                {typed < contract.goal.label.length && (
                  <span
                    className="inline-block w-2 h-3 ml-0.5 align-middle"
                    style={{
                      background: accent,
                      animation: 'briefBlink 0.8s steps(2) infinite',
                    }}
                  />
                )}
              </div>
              <div className="mt-2 text-[10px] text-neutral-600 tracking-[0.15em] uppercase">
                target · {contract.goal.target} · track live on HUD
              </div>
            </div>
          )}

          {phase >= 4 && (
            <div
              className="flex flex-col sm:flex-row gap-2 pt-1"
              style={{ animation: 'briefIn 0.4s ease both' }}
            >
              <button
                onClick={() => {
                  gameAudio.play('market', 0.25);
                  onAccept();
                }}
                className="flex-1 px-4 py-3 text-[11px] tracking-[0.28em] uppercase font-semibold text-black"
                style={{ background: accent }}
              >
                accept · enter / y
              </button>
              <button
                onClick={() => {
                  gameAudio.play('ui', 0.12);
                  onDecline();
                }}
                className="flex-1 border border-[#222428] px-4 py-3 text-[11px] tracking-[0.28em] uppercase text-neutral-500 hover:text-neutral-200"
              >
                decline · esc / n
              </button>
            </div>
          )}
        </div>

        {/* Subtitle strip */}
        <div className="border-t border-[#1a1c1f] px-5 py-2.5 flex justify-between text-[9px] tracking-[0.22em] uppercase text-neutral-600">
          <span>
            <span style={{ color: accent }}>handler</span> · voice uplink
          </span>
          <span>j re-open · street jobs</span>
        </div>
      </div>

      <style>{`
        @keyframes briefIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes briefBlink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
};

export default MissionBriefing;
