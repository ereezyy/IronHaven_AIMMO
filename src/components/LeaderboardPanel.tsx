import React, { useMemo, useState, useEffect } from 'react';
import { useGameStore } from '../store/gameState';
import { gameAudio } from '../lib/gameAudio';
import { getFaction } from '../game/factions';
import { BEZEL_OUTER, BEZEL_INNER, EASE, HUD_KEYFRAMES } from '../game/uiTheme';
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
  }, [
    cat,
    username,
    factionId,
    stats.pvpKills,
    stats.bossKills,
    stats.huntKills,
    stats.totalMoneyEarned,
    stats.xpGained,
    money,
  ]);

  useEffect(() => {
    gameAudio.play('ui', 0.12);
  }, []);

  const top = rows.slice(0, 10);
  const showMe = me && me.rank > 10;

  return (
    <div
      data-hud-anim
      className="absolute inset-0 z-40 flex items-center justify-center font-mono bg-black/60 backdrop-blur-[3px]"
      style={{ animation: `hudBackdropIn 0.3s ${EASE.out} both` }}
    >
      <style>{HUD_KEYFRAMES}</style>
      {/* Outer shell — hard machined edge */}
      <div
        data-hud-anim
        className={`${BEZEL_OUTER} w-full max-w-lg mx-3 max-h-[88vh] flex flex-col p-[3px]`}
        style={{ animation: `hudShellIn 0.42s ${EASE.out} both` }}
      >
        {/* Inner core — inset enclosure holding all content */}
        <div className={`${BEZEL_INNER} flex flex-col min-h-0 flex-1`}>
          <div className="flex justify-between items-center border-b border-[#141517] px-5 py-4">
            <div className="space-y-1">
              <div className="text-[9px] tracking-[0.38em] uppercase text-neutral-600">
                season · {season}
              </div>
              <div className="text-[15px] tracking-[0.2em] uppercase text-neutral-50">
                Leaderboard
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[10px] tracking-[0.25em] uppercase text-neutral-500 hover:text-neutral-200 active:translate-y-[1px] transition-all"
              style={{ transitionTimingFunction: EASE.out }}
            >
              esc · y
            </button>
          </div>

          <div className="flex gap-1.5 px-5 pt-4 flex-wrap">
            {LEADERBOARD_CATEGORIES.map((c) => {
              const active = cat === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setCat(c.id);
                    gameAudio.play('ui', 0.1);
                  }}
                  className="text-[9px] tracking-[0.2em] uppercase px-2.5 py-1.5 border active:translate-y-[1px] transition-all duration-200"
                  style={{
                    transitionTimingFunction: EASE.out,
                    color: active ? GOLD : '#666',
                    borderColor: active ? GOLD : '#16181b',
                    background: active ? `${GOLD}12` : 'transparent',
                    boxShadow: active
                      ? `inset 0 1px 0 ${GOLD}22, 0 0 20px ${GOLD}14`
                      : 'none',
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          <div className="px-5 pt-2 pb-1 text-[9px] text-neutral-600 tracking-[0.15em] uppercase">
            {LEADERBOARD_CATEGORIES.find((c) => c.id === cat)?.blurb}
          </div>

          <div className="overflow-y-auto px-4 pb-4 pt-1 space-y-1 flex-1">
            {top.map((r, i) => (
              <Row key={r.id} row={r} cat={cat} index={i} />
            ))}
            {showMe && (
              <>
                <div className="text-center text-neutral-700 text-[10px] py-0.5">
                  ···
                </div>
                <Row row={me} cat={cat} index={top.length} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{
  row: RankedRow;
  cat: LeaderboardCategory;
  index: number;
}> = ({ row, cat, index }) => {
  const faction = getFaction(row.factionId);
  const isTop = row.rank <= 3;
  return (
    <div
      data-hud-anim
      className="flex items-center justify-between px-3 py-2 border"
      style={{
        borderColor: row.isPlayer ? RED : '#141517',
        background: row.isPlayer ? 'rgba(192,58,48,0.08)' : 'transparent',
        boxShadow: row.isPlayer ? `inset 0 0 24px ${RED}12` : 'none',
        animation: `hudRowIn 0.4s ${EASE.out} both`,
        animationDelay: `${Math.min(index, 12) * 0.035}s`,
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
          <div
            className="text-[12px] tracking-[0.06em] uppercase truncate"
            style={{ color: row.isPlayer ? '#fff' : '#d4d4d4' }}
          >
            {row.name}
            {row.isPlayer ? ' · you' : ''}
          </div>
          <div
            className="text-[8px] tracking-[0.2em] uppercase"
            style={{ color: faction.color }}
          >
            {faction.id === 'null' ? 'unaffiliated' : faction.name}
          </div>
        </div>
      </div>
      <span
        className="text-[12px] tabular-nums"
        style={{ color: isTop ? GOLD : '#a3a3a3' }}
      >
        {fmt(cat, row.value)}
      </span>
    </div>
  );
};

export default LeaderboardPanel;
