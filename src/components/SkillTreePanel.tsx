import React, { useMemo, useState } from 'react';
import { useGameStore } from '../store/gameState';
import {
  SKILL_NODES,
  TREE_META,
  canRankUp,
  unlockedActives,
  ACTIVE_ABILITIES,
  computeModifiers,
  type SkillTreeId,
  type ActiveAbilityId,
} from '../game/skills';
import { gameAudio } from '../lib/gameAudio';

interface SkillTreePanelProps {
  onClose: () => void;
}

const TREES: SkillTreeId[] = ['combat', 'street', 'ops', 'focus'];

const SkillTreePanel: React.FC<SkillTreePanelProps> = ({ onClose }) => {
  const [tree, setTree] = useState<SkillTreeId>('combat');
  const ranks = useGameStore((s) => s.skillRanks);
  const sp = useGameStore((s) => s.playerStats.skillPoints);
  const level = useGameStore((s) => s.playerStats.level);
  const rankSkill = useGameStore((s) => s.rankSkill);
  const abilityBar = useGameStore((s) => s.abilityBar);
  const equipAbility = useGameStore((s) => s.equipAbility);
  const mods = useMemo(() => computeModifiers(ranks), [ranks]);
  const unlocked = useMemo(() => unlockedActives(ranks), [ranks]);

  const nodes = SKILL_NODES.filter((n) => n.tree === tree);
  const meta = TREE_META[tree];

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center font-mono bg-black/55 backdrop-blur-[2px]">
      <div className="w-full max-w-4xl mx-3 border border-[#222428] bg-[#08080a]/96 backdrop-blur-md max-h-[88vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1a1c1f] px-5 py-3">
          <div>
            <div className="text-[10px] tracking-[0.4em] uppercase text-neutral-500">
              neural loadout
            </div>
            <div className="text-[15px] tracking-[0.2em] uppercase text-neutral-100">
              skill matrix
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[9px] tracking-[0.3em] uppercase text-neutral-600">
                skill points
              </div>
              <div
                className="text-xl tracking-[0.1em]"
                style={{ color: sp > 0 ? '#c03a30' : '#5a5d62' }}
              >
                {sp}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[9px] tracking-[0.3em] uppercase text-neutral-600">
                level
              </div>
              <div className="text-xl text-neutral-200">{level}</div>
            </div>
            <button
              onClick={onClose}
              className="text-[10px] tracking-[0.25em] uppercase text-neutral-500 hover:text-neutral-200 px-2"
            >
              esc
            </button>
          </div>
        </div>

        {/* Tree tabs */}
        <div className="flex border-b border-[#1a1c1f]">
          {TREES.map((t) => (
            <button
              key={t}
              onClick={() => setTree(t)}
              className={`flex-1 py-2.5 text-[10px] tracking-[0.28em] uppercase transition-colors ${
                tree === t
                  ? 'text-neutral-100 border-b-2'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
              style={
                tree === t
                  ? {
                      borderColor: TREE_META[t].color,
                      color: TREE_META[t].color,
                    }
                  : undefined
              }
            >
              {TREE_META[t].name}
            </button>
          ))}
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Grid */}
          <div className="flex-1 p-5 overflow-auto">
            <p className="text-[11px] text-neutral-500 mb-4 tracking-wide">
              {meta.blurb}
            </p>
            <div
              className="relative grid gap-3"
              style={{
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              }}
            >
              {nodes
                .slice()
                .sort((a, b) => a.row - b.row || a.col - b.col)
                .map((node) => {
                  const rank = ranks[node.id] || 0;
                  const check = canRankUp(ranks, node.id, sp, level);
                  const maxed = rank >= node.maxRank;
                  const unlockedNode =
                    rank > 0 ||
                    (node.requires.every((r) => (ranks[r] || 0) >= 1) &&
                      level >= node.minLevel);
                  return (
                    <button
                      key={node.id}
                      onClick={() => {
                        if (rankSkill(node.id)) gameAudio.play('ui', 0.2);
                      }}
                      disabled={!check.ok && !maxed}
                      className={`text-left border p-3 transition-all ${
                        rank > 0
                          ? 'border-opacity-80'
                          : unlockedNode
                            ? 'border-[#2a2d33] hover:border-[#444]'
                            : 'border-[#15171a] opacity-50'
                      }`}
                      style={
                        rank > 0
                          ? {
                              borderColor: meta.color,
                              background: `${meta.color}12`,
                            }
                          : undefined
                      }
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span
                          className="text-[11px] tracking-[0.14em] uppercase"
                          style={{ color: rank > 0 ? meta.color : '#c8c8c8' }}
                        >
                          {node.name}
                        </span>
                        <span className="text-[10px] text-neutral-500 shrink-0">
                          {rank}/{node.maxRank}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-neutral-500 leading-relaxed">
                        {node.blurb}
                      </p>
                      <div className="mt-2 flex justify-between text-[9px] tracking-[0.15em] uppercase text-neutral-600">
                        <span>lv {node.minLevel}</span>
                        <span>
                          {maxed
                            ? 'maxed'
                            : check.ok
                              ? `${node.cost} sp`
                              : check.reason}
                        </span>
                      </div>
                      {/* Rank pips */}
                      <div className="mt-2 flex gap-1">
                        {Array.from({ length: node.maxRank }).map((_, i) => (
                          <div
                            key={i}
                            className="h-1 flex-1"
                            style={{
                              background: i < rank ? meta.color : '#1a1c1f',
                            }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Side: stats + ability equip */}
          <div className="w-56 border-l border-[#1a1c1f] p-4 overflow-y-auto shrink-0">
            <div className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-2">
              live modifiers
            </div>
            <div className="space-y-1.5 text-[10px] text-neutral-400 mb-5">
              <Mod label="Damage" value={`${Math.round(mods.damage * 100)}%`} />
              <Mod
                label="Crit"
                value={`${Math.round(mods.critChance * 100)}% ×${mods.critMult.toFixed(1)}`}
              />
              <Mod label="Bonus HP" value={`+${mods.maxHealth}`} />
              <Mod
                label="XP"
                value={`+${Math.round((mods.xpBonus - 1) * 100)}%`}
              />
              <Mod
                label="Harvest"
                value={`+${Math.round((mods.harvestYield - 1) * 100)}%`}
              />
              <Mod
                label="Drive"
                value={`+${Math.round((mods.driveSpeed - 1) * 100)}%`}
              />
              <Mod
                label="CDR"
                value={`${Math.round((1 - mods.cooldown) * 100)}%`}
              />
            </div>

            <div className="text-[9px] tracking-[0.3em] uppercase text-neutral-600 mb-2">
              ability bar
            </div>
            <p className="text-[9px] text-neutral-600 mb-2 leading-relaxed">
              Click a slot, then an unlocked ability. Cast with keys{' '}
              <span className="text-neutral-400">5–8</span>.
            </p>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {abilityBar.map((id, i) => (
                <div
                  key={i}
                  className="border border-[#222428] p-2 text-center"
                >
                  <div className="text-[8px] text-neutral-600 mb-1">
                    [{i + 5}]
                  </div>
                  <div
                    className="text-[9px] tracking-[0.1em] uppercase truncate"
                    style={{
                      color: id ? ACTIVE_ABILITIES[id].color : '#444',
                    }}
                  >
                    {id ? ACTIVE_ABILITIES[id].name : 'empty'}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {unlocked.length === 0 && (
                <div className="text-[10px] text-neutral-600">
                  Unlock actives in the trees.
                </div>
              )}
              {unlocked.map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    // equip into first empty or replace slot 0
                    const empty = abilityBar.findIndex((a) => a === null);
                    equipAbility(empty >= 0 ? empty : 0, id as ActiveAbilityId);
                    gameAudio.play('ui', 0.12);
                  }}
                  className="w-full text-left border border-[#1a1c1f] px-2 py-1.5 text-[10px] hover:border-[#333]"
                  style={{ color: ACTIVE_ABILITIES[id].color }}
                >
                  {ACTIVE_ABILITIES[id].name}
                  <span className="block text-neutral-600 normal-case tracking-normal text-[9px]">
                    {ACTIVE_ABILITIES[id].blurb}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Mod: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-neutral-600 tracking-[0.12em] uppercase">
      {label}
    </span>
    <span className="text-neutral-300">{value}</span>
  </div>
);

export default SkillTreePanel;
