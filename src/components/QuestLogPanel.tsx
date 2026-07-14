import React, { useMemo } from 'react';
import { useGameStore } from '../store/gameState';
import {
  isJobComplete,
  type DailyJob,
} from '../game/dailyBoard';
import { gameAudio } from '../lib/gameAudio';
import type { StreetContract } from '../lib/npcAi';
import { contractProgress } from '../lib/npcAi';

interface QuestLogPanelProps {
  onClose: () => void;
  activeContract: StreetContract | null;
  talkCount: number;
}

const JobRow: React.FC<{
  job: DailyJob;
  tag: string;
  onClaim: () => void;
}> = ({ job, tag, onClaim }) => {
  const done = isJobComplete(job);
  const pct = Math.min(100, Math.round((job.progress / job.target) * 100));
  return (
    <div className="border border-[#1a1c1f] px-3 py-2.5 space-y-1.5">
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="text-[9px] tracking-[0.28em] uppercase text-neutral-600">
            {tag} · {job.kind}
          </div>
          <div className="text-[12px] tracking-[0.08em] uppercase text-neutral-200">
            {job.title}
          </div>
        </div>
        {job.claimed ? (
          <span className="text-[9px] tracking-[0.2em] uppercase text-neutral-600">
            claimed
          </span>
        ) : done ? (
          <button
            onClick={onClaim}
            className="text-[9px] tracking-[0.2em] uppercase px-2 py-1 border"
            style={{ color: '#c9a15a', borderColor: '#c9a15a' }}
          >
            claim
          </button>
        ) : (
          <span className="text-[10px] text-neutral-500">
            {job.progress}/{job.target}
          </span>
        )}
      </div>
      <p className="text-[10px] text-neutral-600 leading-relaxed">{job.blurb}</p>
      <div className="h-[2px] w-full bg-[#141517]">
        <div
          className="h-full transition-all"
          style={{
            width: `${pct}%`,
            background: done ? '#c9a15a' : '#c03a30',
          }}
        />
      </div>
      <div className="text-[9px] tracking-[0.15em] uppercase text-neutral-600">
        ${job.rewardMoney} · {job.rewardXp} xp
        {job.rewardSp > 0 ? ` · +${job.rewardSp} sp` : ''}
      </div>
    </div>
  );
};

const QuestLogPanel: React.FC<QuestLogPanelProps> = ({
  onClose,
  activeContract,
  talkCount,
}) => {
  const board = useGameStore((s) => s.dailyBoard);
  const claimDaily = useGameStore((s) => s.claimDailyJob);
  const stats = useGameStore((s) => s.sessionStats);
  const money = useGameStore((s) => s.playerStats.money);
  const rep = useGameStore((s) => s.playerStats.reputation);
  const wanted = useGameStore((s) => s.playerStats.wanted);
  const territory = useGameStore((s) => s.territory);

  const contractProg = useMemo(() => {
    if (!activeContract) return null;
    return contractProgress(activeContract, {
      kills: stats.totalKills,
      money,
      talks: talkCount,
      reputation: rep,
      wanted,
    });
  }, [activeContract, stats.totalKills, money, talkCount, rep, wanted]);

  const zonesHeld = useMemo(() => {
    let n = 0;
    for (const v of Object.values(territory.control)) {
      if (v && v !== 'null') n += 0; // count player's later
    }
    return territory;
  }, [territory]);

  void zonesHeld;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center font-mono bg-black/55 backdrop-blur-[2px]">
      <div className="w-full max-w-lg mx-3 border border-[#222428] bg-[#08080a]/96 backdrop-blur-md max-h-[88vh] flex flex-col shadow-2xl">
        <div className="flex justify-between items-center border-b border-[#1a1c1f] px-4 py-3">
          <div>
            <div className="text-[9px] tracking-[0.35em] uppercase text-neutral-600">
              operations
            </div>
            <div className="text-[14px] tracking-[0.18em] uppercase text-neutral-100">
              Quest log
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[10px] tracking-[0.25em] uppercase text-neutral-500 hover:text-neutral-200"
          >
            esc · l
          </button>
        </div>

        <div className="overflow-y-auto p-3 space-y-4 flex-1">
          {/* Active street contract */}
          <section>
            <div className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-2">
              active contract · j for new
            </div>
            {activeContract && contractProg ? (
              <div className="border border-[#c03a30]/40 bg-[#c03a30]/08 px-3 py-2.5">
                <div className="text-[12px] uppercase tracking-[0.08em] text-neutral-100">
                  {activeContract.title}
                </div>
                <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">
                  {activeContract.description}
                </p>
                <div className="mt-2 text-[10px] text-neutral-400">
                  {contractProg.label} · {contractProg.current}/
                  {contractProg.target || 0} · ${activeContract.reward}
                </div>
                <div className="h-[2px] w-full bg-[#1a1c1f] mt-2">
                  <div
                    className="h-full"
                    style={{
                      width: `${
                        contractProg.target
                          ? Math.min(
                              100,
                              (contractProg.current / contractProg.target) * 100
                            )
                          : contractProg.done
                            ? 100
                            : 0
                      }%`,
                      background: '#c03a30',
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-neutral-600 border border-[#141517] px-3 py-3">
                No active job. Press J for a street briefing.
              </div>
            )}
          </section>

          {/* Daily board */}
          <section className="space-y-2">
            <div className="text-[9px] tracking-[0.3em] uppercase text-neutral-600">
              daily board · {board.dayKey}
            </div>
            {board.dailies.map((j) => (
              <JobRow
                key={j.id}
                job={j}
                tag="daily"
                onClaim={() => {
                  const r = claimDaily(j.id);
                  gameAudio.play(r.ok ? 'market' : 'ui', 0.2);
                }}
              />
            ))}
          </section>

          <section className="space-y-2">
            <div className="text-[9px] tracking-[0.3em] uppercase text-neutral-600">
              weekly · {board.weekKey}
            </div>
            <JobRow
              job={board.weekly}
              tag="weekly"
              onClaim={() => {
                const r = claimDaily(board.weekly.id);
                gameAudio.play(r.ok ? 'market' : 'ui', 0.2);
              }}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

export default QuestLogPanel;
