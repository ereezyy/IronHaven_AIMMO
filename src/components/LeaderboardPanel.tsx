import React, { useMemo, useState, useEffect } from 'react';
import { useGameStore } from '../store/gameState';
import { gameAudio } from '../lib/gameAudio';
import { getFaction } from '../game/factions';
import {
  LEADERBOARD_CATEGORIES,
  buildBoard,
  loadLeaderboard,
  saveLeaderboard,
  playerRank,
  type LeaderboardCategory,
  type RankedRow,
} from '../game/leaderboard';

interface LeaderboardPanelProps {
  onClose: () => void;
}

const GOLD = '#c9a15a';
const RED = '#c03a30';

function fmt(cat: LeaderboardCategory, v: number): string {
  return cat === 'wealth' ? `$${v.toLocaleString()}` : String(v);
}

const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({ onClose }) => {
  const stats = useGameStore((s) => s.sessionStats);
  const username = useGameStore((s) => s.username);
  const factionId = useGameStore((s) => s.factionId);
  const money = useGameStore((s) => s.playerStats.money);

  const [cat, setCat] = useState<LeaderboardCategory>('pvpKills');

  const { season, rows, me } = useMemo(() => {
    const persisted = loadLeaderboard();
    const built = buildBoard(
      {
        name: username || 'You',
        factionId,
        pvpKills: stats.pvpKills,
        bossKills: stats.bossKills,
        huntKills: stats.huntKills,
        wealth: stats.totalMoneyEarned,
        xp: stats.xpGained,
      },
      cat,
      new Date(),
      persisted
    );
    saveLeaderboard({ season: built.season, best: built.playerBest });
    return {
      season: built.season,
      rows: built.rows,
      me: playerRank(built.rows),
    };
  }, [cat, username, factionId, stats.pvpKills, stats.bossKills, stats.huntKills, stats.totalMoneyEarned, stats.xpGained, money]);

  useEffect(() => {
    gameAudio.play('ui', 0.12);
  }, []);

  const top = rows.slice(0, 10);
  const showMe = me && me.rank > 10;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center font-mono bg-black/55 backdrop-blur-[2px]">
      <div className="w-full max-w-lg mx-3 border border-[#222428] bg-[#08080a]/96 backdrop-blur-md max-h-[88vh] flex flex-col shadow-2xl">
        <div className="flex justify-between items-center border-b border-[#1a1c1f] px-4 py-3">
          <div>
            <div className="text-[9px] tracking-[0.35em] uppercase text-neutral-600">
              season · {season}
            </div>
            <div className="text-[14px] tracking-[0.18em] uppercase text-neutral-100">
              Leaderboard
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[10px] tracking-[0.25em] uppercase text-neutral-500 hover:text-neutral-200"
          >
            esc · y
          </button>
        </div>

        <div className="flex gap-1 px-3 pt-3 flex-wrap">
          {LEADERBOARD_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setCat(c.id);
                gameAudio.play('ui', 0.1);
              }}
              className="text-[9px] tracking-[0.2em] uppercase px-2 py-1 border transition-colors"
              style={
                cat === c.id
                  ? { color: GOLD, borderColor: GOLD }
                  : { color: '#666', borderColor: '#1a1c1f' }
              }
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="px-4 pt-1.5 text-[9px] text-neutral-600 tracking-[0.15em] uppercase">
          {LEADERBOARD_CATEGORIES.find((c) => c.id === cat)?.blurb}
        </div>

        <div className="overflow-y-auto p-3 space-y-1 flex-1">
          {top.map((r) => (
            <Row key={r.id} row={r} cat={cat} />
          ))}
          {showMe && (
            <>
              <div className="text-center text-neutral-700 text-[10px] py-0.5">···</div>
              <Row row={me} cat={cat} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ row: RankedRow; cat: LeaderboardCategory }> = ({ row, cat }) => {
  const faction = getFaction(row.factionId);
  const isTop = row.rank <= 3;
  return (
    <div
      className="flex items-center justify-between px-3 py-2 border"
      style={{
        borderColor: row.isPlayer ? RED : '#141517',
        background: row.isPlayer ? 'rgba(192,58,48,0.08)' : 'transparent',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="text-[12px] tabular-nums w-6 text-right"
          style={{ color: isTop ? GOLD : '#666' }}
        >
          {row.rank}
        </span>
        <div className="min-w-0">
          <div className="text-[12px] tracking-[0.06em] uppercase truncate" style={{ color: row.isPlayer ? '#fff' : '#d4d4d4' }}>
            {row.name}
            {row.isPlayer ? ' · you' : ''}
          </div>
          <div className="text-[8px] tracking-[0.2em] uppercase" style={{ color: faction.color }}>
            {faction.id === 'null' ? 'unaffiliated' : faction.name}
          </div>
        </div>
      </div>
      <span className="text-[12px] tabular-nums" style={{ color: isTop ? GOLD : '#a3a3a3' }}>
        {fmt(cat, row.value)}
      </span>
    </div>
  );
};

export default LeaderboardPanel;
