import React, { useEffect, useState } from 'react';

interface LocationTitleProps {
  title: string;
  subtitle?: string;
  /** Auto-hide after ms. 0 = stay until unmount. */
  durationMs?: number;
  accent?: string;
  onDone?: () => void;
}

/**
 * MMO-style zone splash — "NORTH SPINE" floating title when entering areas.
 */
const LocationTitle: React.FC<LocationTitleProps> = ({
  title,
  subtitle,
  durationMs = 3200,
  accent = '#c03a30',
  onDone,
}) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    setShow(true);
    if (durationMs <= 0) return;
    const t = window.setTimeout(() => {
      setShow(false);
      onDone?.();
    }, durationMs);
    return () => window.clearTimeout(t);
  }, [title, durationMs, onDone]);

  if (!show) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[18%] z-30 flex flex-col items-center font-mono"
      style={{ animation: 'locTitleIn 0.6s ease both' }}
    >
      {subtitle && (
        <div
          className="text-[10px] tracking-[0.45em] uppercase mb-2"
          style={{ color: accent }}
        >
          {subtitle}
        </div>
      )}
      <div
        className="text-[clamp(22px,4vw,40px)] tracking-[0.28em] uppercase text-neutral-100"
        style={{
          fontFamily: '"Inter Tight", Inter, system-ui, sans-serif',
          textShadow: `0 0 32px ${accent}44`,
        }}
      >
        {title}
      </div>
      <div
        className="mt-3 h-[1px] w-24"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        }}
      />
      <style>{`
        @keyframes locTitleIn {
          from { opacity: 0; transform: translateY(12px); letter-spacing: 0.5em; }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default LocationTitle;
