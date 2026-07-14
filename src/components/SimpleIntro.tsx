import React, { useEffect, useMemo, useState } from 'react';

interface SimpleIntroProps {
  onComplete: () => void;
}

const BOOT_SECONDS = 8;

const BOOT_LINES: ReadonlyArray<{ at: number; text: string }> = [
  { at: 0, text: 'ironhaven/boot  v1.0.0  build 2087-A' },
  { at: 1, text: 'mounting /world  ok' },
  { at: 2, text: 'loading /districts/north,south,docks,uptown  ok' },
  { at: 3, text: 'spawning ai/director  ok' },
  { at: 4, text: 'opening uplink supabase://realtime  optional' },
  { at: 5, text: 'compositor  ok  · audio bus  ok  · cinematics  ok' },
  { at: 6, text: 'handshake  complete  · narrative buffer primed' },
  { at: 7, text: 'press [ enter ] — cutscene sequence arming' },
];

const SimpleIntro: React.FC<SimpleIntroProps> = ({ onComplete }) => {
  const [t, setT] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setT((prev) => prev + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (t >= BOOT_SECONDS) onComplete();
  }, [t, onComplete]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') onComplete();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onComplete]);

  const visibleLines = useMemo(() => BOOT_LINES.filter((l) => l.at <= t), [t]);
  const pct = Math.min(100, Math.round((t / BOOT_SECONDS) * 100));

  return (
    <div
      onClick={onComplete}
      className="fixed inset-0 cursor-pointer overflow-hidden"
      style={{
        background: '#050507',
        color: '#e6e6e6',
        fontFamily:
          'ui-monospace, "JetBrains Mono", "SF Mono", Menlo, monospace',
      }}
    >
      {/* Dramatic generated city background */}
      <div
        className="absolute inset-0 opacity-55"
        style={{
          backgroundImage: `url(/assets/ironhaven_city_intro.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 38%',
          filter: 'contrast(1.12) brightness(0.62) saturate(0.88)',
        }}
      />

      {/* Heavy vignette + film grain / scanlines */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 12%, rgba(0,0,0,0.62) 58%, rgba(0,0,0,0.92) 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, #111 2px, #111 3.5px)',
        }}
      />

      {/* Title band */}
      <div
        className="absolute inset-x-0 top-0 px-10 pt-8 flex items-baseline justify-between text-[11px] tracking-[0.3em] uppercase z-10"
        style={{ color: '#6b6b70' }}
      >
        <span>IRONHAVEN / cold boot</span>
        <span>
          {String(t).padStart(2, '0')}:0{BOOT_SECONDS - t} remain
        </span>
      </div>

      {/* Wordmark + premium generated title art */}
      <div className="absolute left-10 right-10 z-10" style={{ top: '9vh' }}>
        <div
          className="text-[11px] tracking-[0.4em] uppercase mb-2.5"
          style={{ color: '#8a3b34' }}
        >
          ironhaven · aimmo · build 2087
        </div>

        <div
          className="h-[82px] md:h-[104px] bg-contain bg-no-repeat mb-1"
          style={{
            backgroundImage: `url(/assets/ironhaven_title.png)`,
            backgroundPosition: 'left center',
            filter: 'contrast(1.08) brightness(1.05)',
          }}
        />

        <div
          className="mt-1 text-[13px] tracking-[0.2em] uppercase"
          style={{ color: '#9ca3af' }}
        >
          a cyberpunk mmo · ai-directed · webgl
        </div>
      </div>

      {/* Boot console */}
      <div
        className="absolute left-10 right-10 z-10"
        style={{ bottom: '12vh', minHeight: '170px' }}
      >
        <div
          className="border-l-2 pl-5 text-[13px] leading-[1.7]"
          style={{ borderColor: '#c03a30' }}
        >
          {visibleLines.map((l) => (
            <div key={l.at} style={{ color: '#cfcfd2' }}>
              <span style={{ color: '#6b6b70' }}>
                [ {String(l.at).padStart(2, '0')}.000 ]
              </span>{' '}
              {l.text}
            </div>
          ))}
          {t < BOOT_SECONDS && (
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 14,
                background: '#c03a30',
                marginLeft: 2,
                animation: 'ironhavenBlink 1s steps(2) infinite',
                verticalAlign: 'text-bottom',
              }}
            />
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute inset-x-10 bottom-7 z-10">
        <div
          className="flex items-center justify-between text-[11px] tracking-[0.3em] uppercase mb-1.5"
          style={{ color: '#6b6b70' }}
        >
          <span>compositing</span>
          <span>{pct.toString().padStart(3, '0')}%</span>
        </div>
        <div className="h-[2px] w-full" style={{ background: '#1f1f22' }}>
          <div
            className="h-full transition-all duration-700"
            style={{ width: `${pct}%`, background: '#c03a30' }}
          />
        </div>
      </div>

      {/* Corner ticks */}
      <CornerTicks />

      <style>{`
        @keyframes ironhavenBlink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
};

function CornerTicks() {
  const c = '#3a3a3e';
  return (
    <>
      <div
        className="absolute top-6 left-6 w-6 h-6 border-t border-l z-10"
        style={{ borderColor: c }}
      />
      <div
        className="absolute top-6 right-6 w-6 h-6 border-t border-r z-10"
        style={{ borderColor: c }}
      />
      <div
        className="absolute bottom-6 left-6 w-6 h-6 border-b border-l z-10"
        style={{ borderColor: c }}
      />
      <div
        className="absolute bottom-6 right-6 w-6 h-6 border-b border-r z-10"
        style={{ borderColor: c }}
      />
    </>
  );
}

export default SimpleIntro;
