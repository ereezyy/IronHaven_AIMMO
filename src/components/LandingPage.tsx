'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface LandingPageProps {
  onEnter: () => void;
}

const ACCENT = '#c03a30';

/**
 * Atmospheric gate + minimal marketing landing for ironhaven.cc.
 * Dark cinematic threshold. Zero marketing fluff. One red accent.
 * Dial: VARIANCE 9 / MOTION 7 / DENSITY 3
 */
const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const [visible, setVisible] = useState(false);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const scrollTo = useCallback((idx: number) => {
    sectionRefs.current[idx]?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div
      className="relative overflow-x-hidden"
      style={{
        background: '#050507',
        color: '#d4d4d8',
        fontFamily: '"Geist Sans", "Inter Tight", Inter, system-ui, sans-serif',
      }}
    >
      {/* ── Fixed ambient city background (below content) ── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(/assets/ironhaven_city_intro.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.48,
          filter: 'brightness(0.55) saturate(0.85)',
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 40%, transparent 20%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.82) 100%)',
        }}
      />

      {/* ── Grain overlay ── */}
      <div
        className="fixed inset-0 z-[60] pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.5\'/%3E%3C/svg%3E")',
          backgroundSize: '256px',
        }}
      />

      {/* ── HERO ── */}
      <section
        ref={(el) => { sectionRefs.current[0] = el; }}
        className="relative z-10 flex flex-col items-center justify-center min-h-[100dvh] px-6"
      >
        {/* Eyebrow */}
        <div
          className="text-[11px] tracking-[0.32em] uppercase mb-8"
          style={{
            color: ACCENT,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
          }}
        >
          a cyberpunk mmo
        </div>

        {/* Wordmark */}
        <div
          className="h-[56px] md:h-[72px] bg-contain bg-no-repeat bg-center w-full max-w-[620px] mb-6"
          style={{
            backgroundImage: `url(/assets/ironhaven_title.png)`,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 1.4s cubic-bezier(0.16, 1, 0.3, 1) 0.4s',
          }}
        />

        {/* Subtext */}
        <p
          className="text-[15px] md:text-[17px] text-center max-w-[440px] leading-relaxed mb-10"
          style={{
            color: '#8a8d94',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            transition: 'all 1.6s cubic-bezier(0.16, 1, 0.3, 1) 0.6s',
          }}
        >
          AI-directed factions. Persistent world. Every conversation can become a
          contract, every contract a funeral.
        </p>

        {/* CTA */}
        <button
          onClick={onEnter}
          className="group relative px-10 py-3.5 text-[15px] tracking-[0.18em] uppercase font-medium transition-all duration-500"
          style={{
            background: 'transparent',
            border: `1px solid ${ACCENT}`,
            color: ACCENT,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(28px)',
            transition: 'all 1.8s cubic-bezier(0.16, 1, 0.3, 1) 0.8s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = ACCENT;
            e.currentTarget.style.color = '#0a0a0c';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = ACCENT;
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.97)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          Enter IronHaven
        </button>
      </section>

      {/* ── WHAT IT IS ── */}
      <section
        ref={(el) => { sectionRefs.current[1] = el; }}
        className="relative z-10 px-6 py-32 md:py-40 max-w-[720px] mx-auto"
      >
        <h2
          className="text-[28px] md:text-[36px] font-semibold tracking-[-0.02em] leading-[1.1] mb-6"
          style={{ color: '#f4f4f5' }}
        >
          A city that plays back.
        </h2>
        <p
          className="text-[16px] leading-relaxed max-w-[54ch]"
          style={{ color: '#8a8d94' }}
        >
          IronHaven is a browser-based cyberpunk MMORPG where the AI director
          writes the next job while you bleed for the last one. Three factions
          control the neon sprawl. You are a callsign, a loadout, and a debt.
          Talk carefully. Shoot faster. Die once if you must. Learn twice.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-1">
          {[
            { label: 'Live faction warfare', sub: 'Neon Syndicate, Chrome Guard, Dock Rats' },
            { label: 'AI-driven street contracts', sub: 'Every NPC conversation can become a job' },
            { label: 'Persistent territory control', sub: 'Hold blocks, earn bonuses, paint the map' },
            { label: 'Browser-native, zero install', sub: 'WebGL. WASD. No launcher. Just play.' },
          ].map((item, i) => (
            <div
              key={i}
              className="px-5 py-5 border-l-2 transition-colors duration-400"
              style={{ borderColor: i === 0 ? ACCENT : '#1f1f24' }}
            >
              <div className="text-[14px] font-medium" style={{ color: '#e4e4e7' }}>
                {item.label}
              </div>
              <div className="text-[12px] mt-1.5" style={{ color: '#6b6d74' }}>
                {item.sub}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── THE WORLD ── */}
      <section
        ref={(el) => { sectionRefs.current[2] = el; }}
        className="relative z-10 px-6 py-24 md:py-32"
      >
        <div
          className="relative max-w-[1100px] mx-auto overflow-hidden"
          style={{ aspectRatio: '16 / 7' }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(/assets/ironhaven_hero_banner.png)`,
              filter: 'brightness(0.7) contrast(1.05)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div
              className="text-[10px] tracking-[0.28em] uppercase mb-2"
              style={{ color: ACCENT }}
            >
              North Spine district
            </div>
            <div className="text-[22px] md:text-[28px] font-semibold tracking-[-0.01em]" style={{ color: '#f4f4f5' }}>
              50+ city blocks. One persistent shard.
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW TO PLAY ── */}
      <section
        ref={(el) => { sectionRefs.current[3] = el; }}
        className="relative z-10 px-6 py-32 md:py-40 max-w-[720px] mx-auto"
      >
        <h2
          className="text-[28px] md:text-[36px] font-semibold tracking-[-0.02em] leading-[1.1] mb-10"
          style={{ color: '#f4f4f5' }}
        >
          Drop in. Make a name.
        </h2>

        <div className="space-y-8">
          {[
          { label: 'Pick a callsign', body: 'Character creator with archetypes. No two runners alike.' },
          { label: 'Choose a side', body: 'Three factions. Zero mercy. Loyalty is a discount, not a shield.' },
          { label: 'Take a contract', body: 'Talk to NPCs. The AI director listens. Every word matters.' },
          { label: 'Hold your block', body: 'Territory is currency. Paint the map or die freelancing.' },
          ].map((item, i) => (
          <div key={i} className="flex gap-5 items-start">
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0 mt-2"
              style={{ background: i === 0 ? ACCENT : '#2a2c30' }}
            />
            <div>
              <div className="text-[16px] font-medium" style={{ color: '#e4e4e7' }}>
                {item.label}
              </div>
              <div className="text-[13px] mt-1.5" style={{ color: '#6b6d74' }}>
                {item.body}
              </div>
            </div>
          </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[60dvh] px-6 pb-20">
        <div
          className="text-[11px] tracking-[0.32em] uppercase mb-6"
          style={{ color: '#6b6d74' }}
        >
          the shard is live
        </div>
        <h2
          className="text-[32px] md:text-[44px] font-semibold tracking-[-0.02em] leading-[1.08] text-center mb-4"
          style={{ color: '#f4f4f5' }}
        >
          The grid never sleeps.
        </h2>
        <p
          className="text-[15px] text-center max-w-[400px] mb-10"
          style={{ color: '#8a8d94' }}
        >
          No install. No launcher. Browser-native. Free to enter.
        </p>
        <button
          onClick={onEnter}
          className="px-12 py-4 text-[15px] tracking-[0.18em] uppercase font-medium transition-all duration-500"
          style={{
            background: ACCENT,
            border: 'none',
            color: '#0a0a0c',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.97)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          Enter IronHaven
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="relative z-10 border-t px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-[11px] tracking-[0.18em] uppercase max-w-[1100px] mx-auto"
        style={{ borderColor: '#1a1c20', color: '#4a4d53' }}
      >
        <span>IronHaven AIMMO</span>
        <span>
          <a
            href="https://github.com/ereezyy/IronHaven_AIMMO"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline transition-colors duration-300"
            style={{ color: '#6b6d74' }}
          >
            GitHub
          </a>
          <span className="mx-3" style={{ color: '#2a2c30' }}>/</span>
          <a
            href="https://ironhaven-aimmo.vercel.app"
            className="hover:underline transition-colors duration-300"
            style={{ color: '#6b6d74' }}
          >
            Live Demo
          </a>
        </span>
      </footer>
    </div>
  );
};

export default LandingPage;
