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
  { at: 5, text: 'compositor  ok  · audio bus  ok  · input  ok' },
  { at: 6, text: 'handshake  complete' },
  { at: 7, text: 'press [ enter ] to continue — auto in 1s' },
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
      className="fixed inset-0 cursor-pointer"
      style={{
        background: '#0b0b0c',
        color: '#e6e6e6',
        fontFamily:
          'ui-monospace, "JetBrains Mono", "SF Mono", Menlo, monospace',
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),' +
          'linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
      }}
    >
      {/* Title band */}
      <div
        className="absolute inset-x-0 top-0 px-10 pt-8 flex items-baseline justify-between text-[11px] tracking-[0.3em] uppercase"
        style={{ color: '#6b6b70' }}
      >
        <span>IRONHAVEN / cold boot</span>
        <span>
          {String(t).padStart(2, '0')}:0{BOOT_SECONDS - t} remain
        </span>
      </div>

      {/* Wordmark */}
      <div className="absolute left-10 right-10" style={{ top: '14vh' }}>
        <div
          className="text-[11px] tracking-[0.4em] uppercase mb-4"
          style={{ color: '#8a3b34' }}
        >
          ironhaven · aimmo · build 2087
        </div>
        <h1
          className="font-bold leading-[0.85] tracking-[-0.04em]"
          style={{
            fontFamily: '"Inter Tight", Inter, system-ui, sans-serif',
            fontSize: 'clamp(80px, 13vw, 220px)',
            color: '#f4f4f5',
          }}
        />
        
        {/* Floating particles */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-cyan-400 rounded-full opacity-60"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-8">
        {/* Main title */}
        <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 mb-6 animate-pulse">
          {content.title}
        </h1>
        <div
          className="mt-3 text-[13px] tracking-[0.2em] uppercase"
          style={{ color: '#9ca3af' }}
        >
          a cyberpunk mmo · ai-directed · webgl
        </div>
      </div>

      {/* Boot console */}
      <div
        className="absolute left-10 right-10"
        style={{ bottom: '14vh', minHeight: '180px' }}
      >
        <div
          className="border-l-2 pl-5 text-[13px] leading-[1.75]"
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
      <div className="absolute inset-x-10 bottom-8">
        <div
          className="flex items-center justify-between text-[11px] tracking-[0.3em] uppercase mb-2"
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
        className="absolute top-6 left-6 w-6 h-6 border-t border-l"
        style={{ borderColor: c }}
      />
      <div
        className="absolute top-6 right-6 w-6 h-6 border-t border-r"
        style={{ borderColor: c }}
      />
      <div
        className="absolute bottom-6 left-6 w-6 h-6 border-b border-l"
        style={{ borderColor: c }}
      />
      <div
        className="absolute bottom-6 right-6 w-6 h-6 border-b border-r"
        style={{ borderColor: c }}
      />
    </>
  );
}

export default SimpleIntro;
