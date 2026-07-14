import React, { useState } from 'react';
import { gameAudio } from '../lib/gameAudio';

interface CallsignGateProps {
  onEnter: (callsign: string) => void;
}

const RANDOM = [
  'Ash',
  'Vex',
  'Nyx',
  'Rook',
  'Pike',
  'Mara',
  'Crow',
  'Salt',
  'Wren',
  'Dex',
];

/**
 * First-run callsign before the district loads — short, on-brand, skips if
 * the player already named themselves this browser.
 */
const CallsignGate: React.FC<CallsignGateProps> = ({ onEnter }) => {
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem('ironhaven-username') || '';
    } catch {
      return '';
    }
  });

  const submit = (value: string) => {
    const clean =
      value.trim().slice(0, 16) ||
      `${RANDOM[Math.floor(Math.random() * RANDOM.length)]}_${Math.floor(
        Math.random() * 90 + 10
      )}`;
    try {
      localStorage.setItem('ironhaven-username', clean);
    } catch {
      /* ignore */
    }
    void gameAudio.unlock();
    gameAudio.play('ui', 0.2);
    onEnter(clean);
  };

  return (
    <div className="min-h-screen bg-[#050507] text-neutral-200 font-mono flex items-center justify-center px-4">
      <div className="w-full max-w-md border border-[#222428] bg-black/80">
        <div className="border-b border-[#1a1c1f] px-5 py-3 flex justify-between text-[10px] tracking-[0.28em] uppercase text-neutral-500">
          <span>iron haven</span>
          <span style={{ color: '#c03a30' }}>callsign</span>
        </div>
        <div className="px-5 py-8">
          <div className="text-[11px] tracking-[0.35em] uppercase text-neutral-500 mb-2">
            district entry
          </div>
          <h1 className="text-2xl tracking-[0.12em] uppercase text-neutral-100 mb-2">
            Who walks in?
          </h1>
          <p className="text-[12px] text-neutral-500 leading-relaxed mb-6">
            Your callsign shows on the shard, in chat, and above your head for
            other runners. You can change it later in the browser store.
          </p>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit(name);
            }}
            maxLength={16}
            placeholder="e.g. VEX_07"
            className="w-full bg-[#0d0d0f] border border-[#222428] px-4 py-3 text-[14px] tracking-[0.15em] uppercase text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-[#c03a30] mb-4"
          />
          <div className="flex gap-2">
            <button
              onClick={() => submit(name)}
              className="flex-1 border border-[#c03a30] bg-[#c03a30]/10 px-4 py-3 text-[11px] tracking-[0.28em] uppercase text-neutral-100 hover:bg-[#c03a30]/20 transition-colors"
            >
              enter district
            </button>
            <button
              onClick={() => submit('')}
              className="border border-[#222428] px-4 py-3 text-[11px] tracking-[0.2em] uppercase text-neutral-500 hover:text-neutral-200 transition-colors"
            >
              random
            </button>
          </div>
        </div>
        <div className="border-t border-[#1a1c1f] px-5 py-3 text-[10px] tracking-[0.2em] uppercase text-neutral-600">
          g grok · j job · m mute · b market
        </div>
      </div>
    </div>
  );
};

export default CallsignGate;
