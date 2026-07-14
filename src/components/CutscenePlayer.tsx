import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CutsceneScript, CutsceneBeat } from '../game/cutscenes';
import { gameAudio } from '../lib/gameAudio';

interface CutscenePlayerProps {
  script: CutsceneScript;
  onComplete: () => void;
  /** Optional callsign injected into body text via {callsign}. */
  callsign?: string;
  /** z-index layer. Default 50. */
  zIndex?: number;
  /** If true, smaller letterbox. */
  compact?: boolean;
  /** Play procedural voice + subtitle bar. Default true. */
  voice?: boolean;
}

const MOOD_BG: Record<NonNullable<CutsceneBeat['mood']>, string> = {
  void: 'radial-gradient(ellipse at 50% 40%, #121214 0%, #050507 70%)',
  city: 'radial-gradient(ellipse at 30% 20%, #1a1214 0%, #0a0a0c 55%, #050507 100%)',
  blood:
    'radial-gradient(ellipse at 50% 60%, #2a1010 0%, #0c0808 50%, #050507 100%)',
  gold: 'radial-gradient(ellipse at 50% 30%, #1a1610 0%, #0a0908 60%, #050507 100%)',
  signal:
    'radial-gradient(ellipse at 70% 40%, #141820 0%, #0a0b0e 55%, #050507 100%)',
  faction:
    'radial-gradient(ellipse at 40% 50%, #141018 0%, #0a080c 55%, #050507 100%)',
};

/**
 * Letterboxed cinematic player — typewriter title, subtitles, procedural
 * voice stingers, auto-advance beats. ESC/Enter/Space/click to skip or next.
 */
const CutscenePlayer: React.FC<CutscenePlayerProps> = ({
  script,
  onComplete,
  callsign,
  zIndex = 50,
  compact = false,
  voice = true,
}) => {
  const [beatIdx, setBeatIdx] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [subCount, setSubCount] = useState(0);
  const [fading, setFading] = useState(false);
  const beat = script.beats[beatIdx];
  const accent = beat?.accent || '#c03a30';

  const title = beat?.title || '';
  const body = useMemo(() => {
    if (!beat?.body) return '';
    return callsign
      ? beat.body.replace(/\{callsign\}/gi, callsign)
      : beat.body;
  }, [beat, callsign]);

  const subtitle = useMemo(() => {
    const raw = beat?.subtitle || beat?.body || '';
    return callsign ? raw.replace(/\{callsign\}/gi, callsign) : raw;
  }, [beat, callsign]);

  const finish = useCallback(() => {
    setFading(true);
    window.setTimeout(() => onComplete(), 420);
  }, [onComplete]);

  const advance = useCallback(() => {
    if (beatIdx >= script.beats.length - 1) {
      finish();
      return;
    }
    setFading(true);
    window.setTimeout(() => {
      setBeatIdx((i) => i + 1);
      setCharCount(0);
      setSubCount(0);
      setFading(false);
      gameAudio.play('ui', 0.08);
    }, 280);
  }, [beatIdx, script.beats.length, finish]);

  // Typewriter for title
  useEffect(() => {
    if (!beat) return;
    setCharCount(0);
    setSubCount(0);
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setCharCount(n);
      if (n >= title.length) window.clearInterval(id);
    }, 26);
    return () => window.clearInterval(id);
  }, [beat, title]);

  // Subtitle typewriter after title
  useEffect(() => {
    if (!beat || charCount < title.length || !subtitle) return;
    let n = 0;
    const id = window.setInterval(() => {
      n += 1;
      setSubCount(n);
      if (n >= subtitle.length) window.clearInterval(id);
    }, 14);
    return () => window.clearInterval(id);
  }, [beat, charCount, title.length, subtitle]);

  // Voice + stinger on each beat
  useEffect(() => {
    if (!beat || !voice) return;
    void gameAudio.unlock();
    gameAudio.cutsceneStinger(beat.voice || 'director');
    const line = beat.subtitle || beat.body || beat.title;
    if (line) {
      // Slight delay so stinger leads the "speech"
      const t = window.setTimeout(() => {
        gameAudio.speak(line, beat.voice || 'director', 0.2);
      }, 180);
      return () => window.clearTimeout(t);
    }
  }, [beat, voice, beatIdx]);

  // Auto-advance timer
  useEffect(() => {
    if (!beat) return;
    const t = window.setTimeout(advance, beat.durationMs);
    return () => window.clearTimeout(t);
  }, [beat, beatIdx, advance]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Escape' && script.skippable !== false) {
        e.preventDefault();
        finish();
        return;
      }
      if (
        e.code === 'Enter' ||
        e.code === 'Space' ||
        e.code === 'KeyX' ||
        e.code === 'NumpadEnter'
      ) {
        e.preventDefault();
        if (charCount < title.length) {
          setCharCount(title.length);
          setSubCount(subtitle.length);
          return;
        }
        if (subCount < subtitle.length) {
          setSubCount(subtitle.length);
          return;
        }
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    script.skippable,
    finish,
    advance,
    charCount,
    title.length,
    subCount,
    subtitle.length,
  ]);

  useEffect(() => {
    void gameAudio.unlock();
  }, [script.id]);

  if (!beat) return null;

  const shownTitle = title.slice(0, charCount);
  const shownSub = subtitle.slice(0, subCount);
  const progress =
    ((beatIdx + Math.min(1, charCount / Math.max(1, title.length))) /
      script.beats.length) *
    100;

  const letterbox = script.letterbox !== false;
  const barH = compact ? '7vh' : '11vh';

  return (
    <div
      className="fixed inset-0 flex flex-col font-mono select-none cursor-pointer"
      style={{
        zIndex,
        background: MOOD_BG[beat.mood || 'void'],
        opacity: fading ? 0 : 1,
        transition: 'opacity 280ms ease, background 600ms ease',
      }}
      onClick={() => {
        if (charCount < title.length) {
          setCharCount(title.length);
          setSubCount(subtitle.length);
        } else if (subCount < subtitle.length) {
          setSubCount(subtitle.length);
        } else advance();
      }}
      role="dialog"
      aria-label={script.name}
    >
      {letterbox && (
        <div
          className="w-full bg-black shrink-0"
          style={{ height: barH, transition: 'height 400ms ease' }}
        />
      )}

      <div className="relative flex-1 flex flex-col justify-end px-8 md:px-16 pb-6 md:pb-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 3px)',
          }}
        />

        {(beat.mood === 'city' ||
          beat.mood === 'signal' ||
          beat.mood === 'faction') && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-30">
            {Array.from({ length: 18 }).map((_, i) => {
              const h = 20 + ((i * 37) % 55);
              const w = 4 + (i % 5);
              return (
                <div
                  key={i}
                  className="absolute bottom-0"
                  style={{
                    left: `${(i / 18) * 100}%`,
                    width: `${w}%`,
                    height: `${h}%`,
                    background: '#0e0e12',
                    borderTop: `1px solid ${
                      i % 4 === 0 ? accent + '55' : '#1a1a20'
                    }`,
                  }}
                />
              );
            })}
          </div>
        )}

        {beat.location && (
          <div
            className="mb-6 text-[10px] tracking-[0.4em] uppercase"
            style={{ color: accent }}
          >
            ▸ {beat.location}
          </div>
        )}

        {beat.chapter && (
          <div className="text-[10px] tracking-[0.35em] uppercase text-neutral-500 mb-3">
            {beat.chapter}
          </div>
        )}

        <h2
          className="text-[clamp(28px,5vw,56px)] font-semibold tracking-[-0.02em] leading-[1.05] text-neutral-100 max-w-4xl"
          style={{
            fontFamily: '"Inter Tight", Inter, system-ui, sans-serif',
            textShadow: `0 0 40px ${accent}33`,
          }}
        >
          {shownTitle}
          {charCount < title.length && (
            <span
              className="inline-block w-[0.45em] h-[0.85em] ml-1 align-baseline"
              style={{
                background: accent,
                animation: 'cutsceneBlink 0.8s steps(2) infinite',
              }}
            />
          )}
        </h2>

        <div
          className="mt-3 h-[2px] max-w-[120px]"
          style={{
            background: accent,
            opacity: charCount >= title.length ? 1 : 0.3,
          }}
        />

        {body && charCount >= title.length && !beat.subtitle && (
          <p
            className="mt-5 max-w-xl text-[14px] md:text-[15px] leading-relaxed text-neutral-400"
            style={{ animation: 'cutsceneFadeUp 0.5s ease both' }}
          >
            {body}
          </p>
        )}

        {/* Progress + skip */}
        <div className="mt-8 flex items-end justify-between gap-4">
          <div className="flex-1 max-w-xs">
            <div className="h-[2px] w-full bg-[#1a1a1e]">
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${progress}%`, background: accent }}
              />
            </div>
            <div className="mt-2 text-[9px] tracking-[0.28em] uppercase text-neutral-600">
              {beatIdx + 1} / {script.beats.length} · {script.name}
            </div>
          </div>
          <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-600 text-right">
            {script.skippable !== false && (
              <span>
                <span style={{ color: accent }}>esc</span> skip ·{' '}
              </span>
            )}
            <span style={{ color: accent }}>enter</span> next
          </div>
        </div>
      </div>

      {/* Subtitle caption bar (over bottom letterbox) */}
      {(beat.speaker || subtitle) && charCount >= title.length && (
        <div
          className="shrink-0 px-8 md:px-16 pb-3 pt-2 bg-black/90 border-t"
          style={{ borderColor: accent + '33', minHeight: compact ? 72 : 88 }}
        >
          {beat.speaker && (
            <div
              className="text-[9px] tracking-[0.35em] uppercase mb-1.5"
              style={{ color: accent }}
            >
              {beat.speaker}
            </div>
          )}
          <p className="text-[13px] md:text-[14px] leading-relaxed text-neutral-200 max-w-3xl">
            {shownSub}
            {subCount < subtitle.length && (
              <span
                className="inline-block w-1.5 h-3 ml-0.5 align-middle"
                style={{
                  background: accent,
                  animation: 'cutsceneBlink 0.8s steps(2) infinite',
                }}
              />
            )}
          </p>
        </div>
      )}

      {letterbox && (
        <div
          className="w-full bg-black shrink-0"
          style={{
            height: beat.speaker || subtitle ? '4vh' : barH,
            transition: 'height 400ms ease',
          }}
        />
      )}

      <style>{`
        @keyframes cutsceneBlink { 50% { opacity: 0; } }
        @keyframes cutsceneFadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CutscenePlayer;
