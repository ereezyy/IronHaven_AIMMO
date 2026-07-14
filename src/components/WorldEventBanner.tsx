import React, { useEffect, useState } from 'react';
import type { WorldEventDef } from '../game/worldEvents';

interface WorldEventBannerProps {
  event: WorldEventDef;
  startedAt: number;
  endsAt: number;
  hidden?: boolean;
}

const TONE_ACCENT: Record<WorldEventDef['tone'], string> = {
  kill: '#c03a30',
  territory: '#c9a15a',
  info: '#39ff14',
};

/**
 * Persistent HUD strip for the currently-live world event, with a countdown
 * bar. Purely presentational — lifecycle is owned by MMOGame.
 */
const WorldEventBanner: React.FC<WorldEventBannerProps> = ({
  event,
  startedAt,
  endsAt,
  hidden,
}) => {
  const [pct, setPct] = useState(100);

  useEffect(() => {
    const total = Math.max(1, endsAt - startedAt);
    let raf = 0;
    const tick = () => {
      const remaining = Math.max(0, endsAt - Date.now());
      setPct(Math.max(0, Math.min(100, (remaining / total) * 100)));
      if (remaining > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startedAt, endsAt]);

  if (hidden) return null;
  const accent = TONE_ACCENT[event.tone];
  const secsLeft = Math.ceil(Math.max(0, endsAt - Date.now()) / 1000);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[8%] z-30 flex justify-center font-mono"
      style={{ animation: 'wevIn 0.5s ease both' }}
    >
      <div
        className="min-w-[280px] max-w-md border bg-[#08080a]/85 backdrop-blur-sm px-4 py-2.5"
        style={{ borderColor: `${accent}88`, boxShadow: `0 0 28px ${accent}22` }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: accent, animation: 'wevPulse 1.1s ease-in-out infinite' }}
            />
            <span
              className="text-[12px] tracking-[0.3em] uppercase"
              style={{ color: accent, textShadow: `0 0 18px ${accent}66` }}
            >
              {event.title}
            </span>
          </div>
          <span className="text-[10px] tabular-nums tracking-[0.2em] text-neutral-400">
            {secsLeft}s · x{event.rewardMult}
          </span>
        </div>
        <p className="mt-1 text-[9px] leading-relaxed tracking-[0.08em] uppercase text-neutral-500">
          {event.blurb}
        </p>
        <div className="mt-2 h-[2px] w-full bg-[#141517]">
          <div
            className="h-full transition-[width] duration-200 ease-linear"
            style={{ width: `${pct}%`, background: accent }}
          />
        </div>
      </div>
      <style>{`
        @keyframes wevIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes wevPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
};

export default WorldEventBanner;
