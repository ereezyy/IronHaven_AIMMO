import React, { useEffect, useRef } from 'react';

// Ink-on-graphite post-processing for the 2D layer: static CRT scanlines plus a
// ref-driven film-grain shimmer. The grain is animated entirely through a
// requestAnimationFrame loop that mutates the node's style directly — no React
// state, so it never triggers re-renders.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const AtmosphereOverlay: React.FC = () => {
  const grainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = grainRef.current;
      if (el) {
        // Jitter the tile origin so the grain crawls, and flicker its opacity
        // for that unstable, projected-film feel.
        const x = Math.floor(Math.random() * 140);
        const y = Math.floor(Math.random() * 140);
        el.style.backgroundPosition = `${x}px ${y}px`;
        el.style.opacity = (0.045 + Math.random() * 0.05).toFixed(3);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {/* Film grain — animated via ref */}
      <div
        ref={grainRef}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: GRAIN,
          backgroundRepeat: 'repeat',
          opacity: 0.06,
          mixBlendMode: 'overlay',
        }}
      />
      {/* CRT scanlines — static, restrained */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 3px)',
          mixBlendMode: 'multiply',
          opacity: 0.5,
        }}
      />
      {/* Edge vignette to seat the frame in graphite */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </div>
  );
};

export default AtmosphereOverlay;
