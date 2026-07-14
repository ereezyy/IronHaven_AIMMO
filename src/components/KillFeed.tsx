import React from 'react';

export interface KillFeedEntry {
  id: string;
  text: string;
  at: number;
  tone?: 'kill' | 'system' | 'territory' | 'loot';
}

interface KillFeedProps {
  entries: KillFeedEntry[];
}

const TONE: Record<NonNullable<KillFeedEntry['tone']>, string> = {
  kill: '#c03a30',
  system: '#8a8d92',
  territory: '#c9a15a',
  loot: '#39ff14',
};

const KillFeed: React.FC<KillFeedProps> = ({ entries }) => {
  if (!entries.length) return null;
  const now = Date.now();
  const live = entries.filter((e) => now - e.at < 6000).slice(-6);
  if (!live.length) return null;

  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[26] font-mono pointer-events-none space-y-1 max-w-md w-full px-4 flex flex-col items-center">
      {live.map((e) => (
        <div
          key={e.id}
          className="text-[10px] tracking-[0.12em] uppercase px-3 py-1 border bg-black/75 backdrop-blur-sm text-center"
          style={{
            borderColor: '#222428',
            color: TONE[e.tone || 'system'],
            opacity: Math.max(0.4, 1 - (now - e.at) / 6000),
          }}
        >
          {e.text}
        </div>
      ))}
    </div>
  );
};

export default KillFeed;
