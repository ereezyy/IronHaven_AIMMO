/**
 * Overlay stack for first-session clarity and recovery UX.
 * Mounted by MMOGame; stays out of the R3F tree.
 */
import React, { useEffect, useState } from 'react';
import { writeGfxTier, type GfxTier } from '../lib/graphicsQuality';
import {
  consumeSessionRecoveryNotice,
  deathLessonLines,
  firstOpenObjective,
  loadControlsPinned,
  markDailySplashSeen,
  saveControlsPinned,
  shouldShowDailySplash,
  wantedCoolOffHint,
  type SessionNotice,
} from '../lib/playerExperience';
import type { HudObjective } from './MMOHUD';
import { gameAudio } from '../lib/gameAudio';
import { PASS_BENEFIT_LINES, PASS_PRODUCT } from '../game/subscription';

const TIER_OPTS: { id: GfxTier; label: string; blurb: string }[] = [
  {
    id: 'cinematic',
    label: 'cinematic',
    blurb: 'SSAO + full post · heavy GPU',
  },
  {
    id: 'balanced',
    label: 'balanced',
    blurb: 'bloom · vignette · stable default',
  },
  {
    id: 'performance',
    label: 'performance',
    blurb: 'light bloom · dpr 1',
  },
  { id: 'safe', label: 'safe', blurb: 'no post · max stability' },
];

export function SessionRecoveryToast({ onDone }: { onDone?: () => void }) {
  const [notice, setNotice] = useState<SessionNotice | null>(null);
  useEffect(() => {
    const n = consumeSessionRecoveryNotice();
    if (n) setNotice(n);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => {
      setNotice(null);
      onDone?.();
    }, 6500);
    return () => window.clearTimeout(t);
  }, [notice, onDone]);
  if (!notice) return null;
  return (
    <div className="absolute top-[18%] left-1/2 -translate-x-1/2 z-[45] font-mono border border-[#c9a15a] bg-black/92 px-5 py-3 max-w-[min(420px,92vw)] text-center">
      <div className="text-[10px] tracking-[0.3em] uppercase text-[#c9a15a]">
        {notice.title}
      </div>
      <div className="mt-1 text-[11px] tracking-[0.08em] text-neutral-300 leading-relaxed">
        {notice.body}
      </div>
    </div>
  );
}

export function ClickToResume({
  visible,
  reason,
}: {
  visible: boolean;
  reason?: string;
}) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-[42] flex items-center justify-center pointer-events-none">
      <div className="font-mono border border-[#222428] bg-black/80 px-8 py-5 text-center">
        <div className="text-[11px] tracking-[0.35em] uppercase text-neutral-500">
          {reason || 'pointer unlocked'}
        </div>
        <div
          className="mt-2 text-lg tracking-[0.2em] uppercase"
          style={{ color: '#c03a30' }}
        >
          click to resume
        </div>
        <div className="mt-2 text-[10px] tracking-[0.18em] uppercase text-neutral-500">
          mouse look · wasd move
        </div>
      </div>
    </div>
  );
}

export function AudioUnlockBanner({
  needsUnlock,
  onUnlock,
}: {
  needsUnlock: boolean;
  onUnlock: () => void;
}) {
  if (!needsUnlock) return null;
  return (
    <button
      type="button"
      onClick={() => {
        void gameAudio.unlock();
        onUnlock();
        gameAudio.play('ui', 0.15);
      }}
      className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[36] font-mono border border-[#222428] bg-black/85 px-5 py-2.5 text-[10px] tracking-[0.28em] uppercase text-neutral-300 hover:border-[#c03a30] hover:text-neutral-100 transition"
    >
      click for sound
    </button>
  );
}

export function ActiveObjectiveBar({
  objectives,
  hidden,
}: {
  objectives?: HudObjective[];
  hidden?: boolean;
}) {
  const next = firstOpenObjective(objectives);
  if (hidden || !next) return null;
  return (
    <div className="absolute top-[4.25rem] left-1/2 -translate-x-1/2 z-[22] font-mono border border-[#222428] bg-black/75 backdrop-blur-sm px-4 py-2 max-w-[min(480px,92vw)] text-center">
      <div className="text-[9px] tracking-[0.32em] uppercase text-neutral-500">
        active objective
      </div>
      <div className="mt-0.5 text-[12px] tracking-[0.1em] uppercase text-neutral-100">
        <span style={{ color: '#c03a30' }}>— </span>
        {next.label}
      </div>
    </div>
  );
}

export function WantedHintBar({ wanted }: { wanted: number }) {
  const hint = wantedCoolOffHint(wanted);
  if (!hint) return null;
  return (
    <div className="absolute top-[7.25rem] left-1/2 -translate-x-1/2 z-[21] font-mono text-[10px] tracking-[0.16em] uppercase text-[#c03a30] bg-black/60 border border-[#3a1515] px-3 py-1.5 max-w-[min(440px,90vw)] text-center">
      {hint}
    </div>
  );
}

export function PersistentControlsStrip({
  pinned,
  onTogglePin,
  hidden,
}: {
  pinned: boolean;
  onTogglePin: (v: boolean) => void;
  hidden?: boolean;
}) {
  if (hidden && !pinned) return null;
  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[19] font-mono border border-[#1a1c1f] bg-black/55 backdrop-blur-sm px-3 py-1.5 flex items-center gap-3 max-w-[96vw]">
      <span className="text-[9px] tracking-[0.14em] uppercase text-neutral-500">
        <span className="text-neutral-300">wasd</span> move ·{' '}
        <span className="text-neutral-300">e</span> talk ·{' '}
        <span className="text-neutral-300">click</span> look ·{' '}
        <span className="text-neutral-300">b</span> market ·{' '}
        <span className="text-neutral-300">l</span> jobs ·{' '}
        <span className="text-neutral-300">o</span> pass ·{' '}
        <span className="text-neutral-300">g</span> gfx
      </span>
      <button
        type="button"
        onClick={() => onTogglePin(!pinned)}
        className="text-[9px] tracking-[0.2em] uppercase text-neutral-600 hover:text-neutral-300"
      >
        {pinned ? 'unpin' : 'pin'}
      </button>
    </div>
  );
}

export function GraphicsSettingsPanel({
  open,
  tier,
  onTier,
  onClose,
}: {
  open: boolean;
  tier: GfxTier;
  onTier: (t: GfxTier) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center font-mono bg-black/60 backdrop-blur-[2px]">
      <div className="w-full max-w-md mx-3 border border-[#222428] bg-[#08080a]/96 shadow-2xl">
        <div className="flex justify-between items-center border-b border-[#1a1c1f] px-4 py-3">
          <div>
            <div className="text-[10px] tracking-[0.35em] uppercase text-neutral-500">
              display
            </div>
            <div className="text-[14px] tracking-[0.15em] uppercase text-neutral-100">
              graphics
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[10px] tracking-[0.25em] uppercase text-neutral-500 hover:text-neutral-200"
          >
            esc · g
          </button>
        </div>
        <div className="p-3 space-y-2">
          {TIER_OPTS.map((opt) => {
            const active = opt.id === tier;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  writeGfxTier(opt.id);
                  onTier(opt.id);
                  gameAudio.play('ui', 0.12);
                }}
                className="w-full text-left border px-3 py-2.5 transition"
                style={{
                  borderColor: active ? '#c03a30' : '#1a1c1f',
                  background: active ? 'rgba(192,58,48,0.08)' : 'transparent',
                }}
              >
                <div className="text-[12px] tracking-[0.18em] uppercase text-neutral-100">
                  {opt.label}
                  {active ? ' · active' : ''}
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5">
                  {opt.blurb}
                </div>
              </button>
            );
          })}
        </div>
        <div className="px-4 py-3 border-t border-[#1a1c1f] text-[10px] text-neutral-600 tracking-[0.12em] uppercase">
          tier auto-drops if the GPU loses context
        </div>
      </div>
    </div>
  );
}

export function DailyBoardSplash({
  open,
  jobs,
  onOpenLog,
  onDismiss,
}: {
  open: boolean;
  jobs: { title: string; progress: number; target: number; claimed: boolean }[];
  onOpenLog: () => void;
  onDismiss: () => void;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[48] flex items-center justify-center font-mono bg-black/70 backdrop-blur-[2px]">
      <div className="w-full max-w-md mx-3 border border-[#222428] bg-[#08080a]/96">
        <div className="px-5 py-4 border-b border-[#1a1c1f]">
          <div className="text-[10px] tracking-[0.35em] uppercase text-[#c9a15a]">
            today on the street
          </div>
          <div className="text-[16px] tracking-[0.15em] uppercase text-neutral-100 mt-1">
            daily board
          </div>
          <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">
            Complete these for cash and XP. Press L anytime to claim rewards.
          </p>
        </div>
        <div className="p-3 space-y-2 max-h-56 overflow-y-auto">
          {jobs.slice(0, 4).map((j, i) => (
            <div
              key={i}
              className="border border-[#1a1c1f] px-3 py-2 flex justify-between gap-2"
            >
              <span className="text-[11px] tracking-[0.08em] uppercase text-neutral-200">
                {j.title}
              </span>
              <span className="text-[10px] text-neutral-500 shrink-0">
                {j.claimed ? 'claimed' : `${j.progress}/${j.target}`}
              </span>
            </div>
          ))}
        </div>
        <div className="flex border-t border-[#1a1c1f]">
          <button
            type="button"
            onClick={() => {
              markDailySplashSeen();
              onOpenLog();
            }}
            className="flex-1 py-3 text-[11px] tracking-[0.22em] uppercase text-[#c9a15a] hover:bg-white/5"
          >
            open board · l
          </button>
          <button
            type="button"
            onClick={() => {
              markDailySplashSeen();
              onDismiss();
              gameAudio.play('ui', 0.1);
            }}
            className="flex-1 py-3 text-[11px] tracking-[0.22em] uppercase text-neutral-500 hover:text-neutral-200 border-l border-[#1a1c1f]"
          >
            hit the street
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeathLessonList({ penalty }: { penalty: number }) {
  return (
    <ul className="mt-4 space-y-1.5 text-[10px] tracking-[0.14em] uppercase text-neutral-500 max-w-sm text-left mx-auto">
      {deathLessonLines(penalty).map((line) => (
        <li key={line} className="flex gap-2">
          <span style={{ color: '#c03a30' }}>—</span>
          <span className="text-neutral-400">{line}</span>
        </li>
      ))}
    </ul>
  );
}

export function PassValueLine({ active }: { active: boolean }) {
  if (active) return null;
  const top = PASS_BENEFIT_LINES[0];
  return (
    <div className="text-[9px] tracking-[0.12em] uppercase text-neutral-600 mt-0.5">
      {PASS_PRODUCT.priceLabel} · {top.label} · {PASS_BENEFIT_LINES[1]?.label}
    </div>
  );
}

export function EmoteBubble({
  text,
  visible,
}: {
  text: string | null;
  visible: boolean;
}) {
  if (!visible || !text) return null;
  return (
    <div className="absolute bottom-[9rem] left-1/2 -translate-x-1/2 z-[24] font-mono border border-[#222428] bg-black/80 px-4 py-2 text-[12px] tracking-[0.12em] text-neutral-200">
      {text}
    </div>
  );
}

export function usePinnedControls(): [boolean, (v: boolean) => void] {
  const [pinned, setPinned] = useState(() => loadControlsPinned());
  const set = (v: boolean) => {
    saveControlsPinned(v);
    setPinned(v);
  };
  return [pinned, set];
}

export function useShouldDailySplash(ready: boolean): [boolean, () => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!ready) return;
    if (shouldShowDailySplash()) {
      const t = window.setTimeout(() => setOpen(true), 2200);
      return () => window.clearTimeout(t);
    }
  }, [ready]);
  const dismiss = () => {
    markDailySplashSeen();
    setOpen(false);
  };
  return [open, dismiss];
}
