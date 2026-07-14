import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameState';
import {
  PASS_PRODUCT,
  PASS_BENEFIT_LINES,
  PASS_BENEFITS,
  formatPassRemaining,
  canClaimWeeklySp,
  isStripeReady,
  isPassActive,
} from '../game/subscription';
import { gameAudio } from '../lib/gameAudio';

interface PassPanelProps {
  onClose: () => void;
}

const PassPanel: React.FC<PassPanelProps> = ({ onClose }) => {
  const pass = useGameStore((s) => s.pass);
  const subscribePass = useGameStore((s) => s.subscribePass);
  const claimPassWeeklySp = useGameStore((s) => s.claimPassWeeklySp);
  const cancelPass = useGameStore((s) => s.cancelPass);
  const skillPoints = useGameStore((s) => s.playerStats.skillPoints);
  const [tick, setTick] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  // Refresh remaining countdown while open.
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const active = isPassActive(pass);
  const remaining = formatPassRemaining(pass);
  const weeklyReady = canClaimWeeklySp(pass);
  const stripe = isStripeReady();
  void tick;

  const showFlash = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2800);
  };

  const onSubscribe = (mode: 'auto' | 'demo') => {
    const res = subscribePass(mode);
    gameAudio.play(res.ok ? 'market' : 'ui', 0.2);
    showFlash(res.message);
  };

  const onClaim = () => {
    const res = claimPassWeeklySp();
    gameAudio.play(res.ok ? 'talk' : 'ui', 0.2);
    showFlash(res.message);
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center font-mono bg-black/55 backdrop-blur-[2px]">
      <div className="w-full max-w-lg mx-3 border border-[#2a2418] bg-[#08080a]/96 backdrop-blur-md shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#1f1c16] px-5 py-4">
          <div>
            <div
              className="text-[10px] tracking-[0.4em] uppercase"
              style={{ color: '#c9a15a' }}
            >
              premium · weekly
            </div>
            <div className="text-[17px] tracking-[0.18em] uppercase text-neutral-100 mt-0.5">
              {PASS_PRODUCT.name}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              {PASS_PRODUCT.tagline}
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-2xl tracking-[0.05em]"
              style={{ color: '#c9a15a' }}
            >
              {PASS_PRODUCT.priceLabel}
            </div>
            <button
              onClick={onClose}
              className="mt-2 text-[10px] tracking-[0.25em] uppercase text-neutral-500 hover:text-neutral-200"
            >
              esc
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="px-5 py-3 border-b border-[#1f1c16] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{
                background: active ? '#c9a15a' : '#3a3a3e',
                boxShadow: active ? '0 0 8px #c9a15a88' : 'none',
              }}
            />
            <span className="text-[11px] tracking-[0.2em] uppercase text-neutral-300">
              {active ? 'pass active' : 'free tier'}
            </span>
          </div>
          <span className="text-[11px] text-neutral-500">
            {active ? (
              <>
                ends in <span style={{ color: '#c9a15a' }}>{remaining}</span>
                {pass.source !== 'demo' ? (
                  <span className="ml-2 text-neutral-600">· {pass.source}</span>
                ) : (
                  <span className="ml-2 text-neutral-600">· demo</span>
                )}
              </>
            ) : (
              'no active period'
            )}
          </span>
        </div>

        {/* Benefits */}
        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-2">
          <div className="text-[9px] tracking-[0.35em] uppercase text-neutral-600 mb-2">
            you get
          </div>
          {PASS_BENEFIT_LINES.map((b) => (
            <div
              key={b.id}
              className="flex gap-3 border border-[#1a1814] px-3 py-2.5"
            >
              <span
                className="text-[11px] tracking-[0.08em] uppercase shrink-0 w-36"
                style={{ color: active ? '#c9a15a' : '#8a8070' }}
              >
                {b.label}
              </span>
              <span className="text-[11px] text-neutral-500 leading-relaxed">
                {b.detail}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="border-t border-[#1f1c16] px-5 py-4 space-y-2">
          {active && weeklyReady && (
            <button
              onClick={onClaim}
              className="w-full border border-[#c9a15a] bg-[#c9a15a]/12 px-4 py-3 text-[11px] tracking-[0.25em] uppercase text-[#c9a15a] hover:bg-[#c9a15a]/22"
            >
              claim +{PASS_BENEFITS.weeklySkillPoints} weekly skill points
            </button>
          )}
          {active && !weeklyReady && (
            <div className="text-center text-[10px] tracking-[0.2em] uppercase text-neutral-600 py-1">
              weekly sp claimed · {skillPoints} unspent
            </div>
          )}

          {!active && (
            <>
              <button
                onClick={() => onSubscribe('auto')}
                className="w-full border border-[#c9a15a] bg-[#c9a15a] px-4 py-3 text-[12px] tracking-[0.22em] uppercase text-black font-semibold hover:bg-[#d4b06a]"
              >
                {stripe
                  ? `subscribe · ${PASS_PRODUCT.priceLabel}`
                  : `activate demo week · ${PASS_PRODUCT.priceLabel}`}
              </button>
              {stripe && (
                <button
                  onClick={() => onSubscribe('demo')}
                  className="w-full border border-[#2a2418] px-4 py-2 text-[10px] tracking-[0.22em] uppercase text-neutral-500 hover:text-neutral-300"
                >
                  skip payment · claim demo week
                </button>
              )}
            </>
          )}

          {active && (
            <button
              onClick={() => onSubscribe('auto')}
              className="w-full border border-[#2a2418] px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase text-neutral-400 hover:text-[#c9a15a] hover:border-[#c9a15a]/40"
            >
              {stripe ? 'renew / extend via stripe' : 'extend demo week +7d'}
            </button>
          )}

          {active && pass.source === 'demo' && (
            <button
              onClick={() => {
                cancelPass();
                gameAudio.play('ui', 0.12);
                showFlash('Pass cancelled.');
              }}
              className="w-full text-[9px] tracking-[0.25em] uppercase text-neutral-700 hover:text-neutral-500 py-1"
            >
              cancel demo pass
            </button>
          )}

          {!stripe && (
            <p className="text-[9px] text-neutral-700 leading-relaxed pt-1">
              Stripe: set VITE_STRIPE_PAYMENT_LINK in .env for live checkout.
              Without keys, demo activation grants full Pass benefits for 7
              days.
            </p>
          )}

          {flash && (
            <div
              className="text-center text-[11px] tracking-[0.12em] py-2"
              style={{ color: '#c9a15a' }}
            >
              {flash}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PassPanel;
