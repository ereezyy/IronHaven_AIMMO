import React, { useState } from 'react';
import { useGameStore } from '../store/gameState';
import { FACTIONS, type FactionId } from '../game/factions';
import { gameAudio } from '../lib/gameAudio';

interface SocialPanelProps {
  onClose: () => void;
  /** Fired after joining a real faction (not unaffiliated). */
  onFactionJoined?: (id: FactionId) => void;
}

const SocialPanel: React.FC<SocialPanelProps> = ({
  onClose,
  onFactionJoined,
}) => {
  const [tab, setTab] = useState<'factions' | 'club' | 'pvp'>('factions');
  const [clubName, setClubName] = useState('');
  const [clubTag, setClubTag] = useState('');
  const [motto, setMotto] = useState('');

  const factionId = useGameStore((s) => s.factionId);
  const standing = useGameStore((s) => s.factionStanding);
  const club = useGameStore((s) => s.club);
  const pvp = useGameStore((s) => s.pvpEnabled);
  const joinFaction = useGameStore((s) => s.joinFaction);
  const leaveFaction = useGameStore((s) => s.leaveFaction);
  const createPlayerClub = useGameStore((s) => s.createPlayerClub);
  const leavePlayerClub = useGameStore((s) => s.leavePlayerClub);
  const setPvpEnabled = useGameStore((s) => s.setPvpEnabled);
  const stats = useGameStore((s) => s.sessionStats);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center font-mono bg-black/55 backdrop-blur-[2px]">
      <div className="w-full max-w-lg mx-4 border border-[#222428] bg-[#08080a]/96 backdrop-blur-md max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex justify-between items-center border-b border-[#1a1c1f] px-4 py-3">
          <span className="text-[11px] tracking-[0.28em] uppercase text-neutral-200">
            social grid
          </span>
          <button
            onClick={onClose}
            className="text-[10px] text-neutral-500 uppercase tracking-[0.2em]"
          >
            esc
          </button>
        </div>
        <div className="flex border-b border-[#1a1c1f]">
          {(['factions', 'club', 'pvp'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-[10px] tracking-[0.25em] uppercase ${
                tab === t
                  ? 'text-neutral-100 border-b border-[#c03a30]'
                  : 'text-neutral-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto p-4 flex-1 space-y-3">
          {tab === 'factions' && (
            <>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Pick a color. Enemies hunt you harder in their turf; allies cut
                shop prices and open dialogue.
              </p>
              {FACTIONS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    if (f.id === 'null') {
                      leaveFaction();
                      gameAudio.play('ui', 0.15);
                      return;
                    }
                    const id = f.id as FactionId;
                    joinFaction(id);
                    gameAudio.play('market', 0.22);
                    onFactionJoined?.(id);
                    onClose();
                  }}
                  className={`w-full text-left border px-3 py-2 transition-colors ${
                    factionId === f.id
                      ? 'border-[#c03a30] bg-[#c03a30]/10'
                      : 'border-[#1a1c1f] hover:border-[#333]'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span
                      className="text-[12px] tracking-[0.12em] uppercase"
                      style={{ color: f.color }}
                    >
                      {f.name}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      stand {standing[f.id] || 0}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-600 mt-1">
                    {f.blurb}
                  </div>
                </button>
              ))}
            </>
          )}

          {tab === 'club' && (
            <>
              {club ? (
                <div className="border border-[#222428] p-3 space-y-2">
                  <div className="text-[12px] tracking-[0.15em] uppercase text-neutral-100">
                    [{club.tag}] {club.name}
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    leader {club.leader} · {club.members.length} members
                  </div>
                  {club.motto && (
                    <div className="text-[11px] text-neutral-400 italic">
                      “{club.motto}”
                    </div>
                  )}
                  <div className="text-[10px] text-neutral-600">
                    {club.members.join(' · ')}
                  </div>
                  <button
                    onClick={() => {
                      leavePlayerClub();
                      gameAudio.play('ui', 0.12);
                    }}
                    className="w-full border border-[#222428] py-2 text-[10px] tracking-[0.2em] uppercase text-neutral-400 hover:text-neutral-100"
                  >
                    leave club
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-neutral-500">
                    Found a club. Tag shows in chat; membership syncs when
                    multiplayer is live.
                  </p>
                  <input
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                    placeholder="CLUB NAME"
                    className="w-full bg-[#0d0d0f] border border-[#222428] px-3 py-2 text-[12px] uppercase focus:outline-none focus:border-[#c03a30]"
                  />
                  <input
                    value={clubTag}
                    onChange={(e) => setClubTag(e.target.value)}
                    placeholder="TAG"
                    maxLength={4}
                    className="w-full bg-[#0d0d0f] border border-[#222428] px-3 py-2 text-[12px] uppercase focus:outline-none focus:border-[#c03a30]"
                  />
                  <input
                    value={motto}
                    onChange={(e) => setMotto(e.target.value)}
                    placeholder="motto (optional)"
                    className="w-full bg-[#0d0d0f] border border-[#222428] px-3 py-2 text-[12px] focus:outline-none focus:border-[#c03a30]"
                  />
                  <button
                    onClick={() => {
                      createPlayerClub(clubName, clubTag, motto);
                      gameAudio.play('market', 0.2);
                    }}
                    className="w-full border border-[#c03a30] py-2 text-[11px] tracking-[0.25em] uppercase text-neutral-100"
                  >
                    found club
                  </button>
                </div>
              )}
            </>
          )}

          {tab === 'pvp' && (
            <div className="space-y-3">
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Open-world PvP: arm flag to fight in PvE streets. Blood Grid and
                Neon Killbox are always hostile. Spawn Sanctum is always safe.
              </p>
              <button
                onClick={() => {
                  setPvpEnabled(!pvp);
                  gameAudio.play('siren', 0.15);
                }}
                className={`w-full border py-3 text-[12px] tracking-[0.25em] uppercase ${
                  pvp
                    ? 'border-[#c03a30] text-[#c03a30] bg-[#c03a30]/10'
                    : 'border-[#222428] text-neutral-400'
                }`}
              >
                open pvp {pvp ? 'ARMED' : 'off'}
              </button>
              <div className="grid grid-cols-2 gap-2 text-[10px] tracking-[0.12em] uppercase text-neutral-500">
                <div>
                  pvp kills{' '}
                  <span className="text-neutral-200">{stats.pvpKills}</span>
                </div>
                <div>
                  boss kills{' '}
                  <span className="text-neutral-200">{stats.bossKills}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SocialPanel;
