import React, { useState } from 'react';
import { useGameStore } from '../store/gameState';
import {
  RESOURCES,
  RECIPES,
  resourceName,
  canCraft,
  type ResourceId,
} from '../game/economy';
import { SAFEHOUSE } from '../game/safehouse';
import { gameAudio } from '../lib/gameAudio';

interface SafehousePanelProps {
  onClose: () => void;
}

type Tab = 'stash' | 'craft' | 'rest';

const SafehousePanel: React.FC<SafehousePanelProps> = ({ onClose }) => {
  const [tab, setTab] = useState<Tab>('stash');
  const bag = useGameStore((s) => s.bag);
  const stash = useGameStore((s) => s.stash);
  const money = useGameStore((s) => s.playerStats.money);
  const health = useGameStore((s) => s.playerStats.health);
  const depositToStash = useGameStore((s) => s.depositToStash);
  const withdrawFromStash = useGameStore((s) => s.withdrawFromStash);
  const craftRecipe = useGameStore((s) => s.craftRecipe);
  const updateStats = useGameStore((s) => s.updateStats);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'stash', label: 'stash' },
    { id: 'craft', label: 'workbench' },
    { id: 'rest', label: 'rest' },
  ];

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center font-mono bg-black/55 backdrop-blur-[2px]">
      <div className="w-full max-w-xl mx-4 border border-[#222428] bg-[#08080a]/96 backdrop-blur-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#1a1c1f] px-4 py-3">
          <span className="text-[11px] tracking-[0.28em] uppercase text-neutral-200">
            {SAFEHOUSE.name}{' '}
            <span style={{ color: SAFEHOUSE.color }}>· safehouse</span>
          </span>
          <span className="text-[11px] text-neutral-400">
            $<span className="text-neutral-100">{money}</span>
          </span>
        </div>

        <div className="flex border-b border-[#1a1c1f]">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-[10px] tracking-[0.25em] uppercase ${
                tab === t.id
                  ? 'text-neutral-100 border-b border-[#3f7d4e]'
                  : 'text-neutral-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          {tab === 'stash' && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] tracking-[0.25em] uppercase text-neutral-500 mb-1">
                <span>material · bag / stash</span>
                <span>move</span>
              </div>
              {RESOURCES.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between border border-[#1a1c1f] px-3 py-2 text-[11px]"
                >
                  <div>
                    <div className="text-neutral-200 uppercase tracking-[0.1em]">
                      {r.name}
                    </div>
                    <div className="text-neutral-600">
                      bag ×{bag[r.id] || 0} · stash ×{stash[r.id] || 0}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        if (depositToStash(r.id as ResourceId, 1))
                          gameAudio.play('ui', 0.12);
                      }}
                      disabled={(bag[r.id] || 0) < 1}
                      className="border border-[#222428] px-2 py-1 text-neutral-400 hover:text-white disabled:opacity-40"
                    >
                      store
                    </button>
                    <button
                      onClick={() => {
                        if (withdrawFromStash(r.id as ResourceId, 1))
                          gameAudio.play('ui', 0.12);
                      }}
                      disabled={(stash[r.id] || 0) < 1}
                      className="border border-[#222428] px-2 py-1 text-neutral-400 hover:text-white disabled:opacity-40"
                    >
                      take
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'craft' && (
            <div className="space-y-2">
              {RECIPES.map((r) => {
                const ok = canCraft(bag, money, r);
                return (
                  <button
                    key={r.id}
                    disabled={!ok}
                    onClick={() => {
                      if (craftRecipe(r.id)) gameAudio.play('market', 0.25);
                    }}
                    className={`w-full text-left border px-3 py-2 transition-colors ${
                      ok
                        ? 'border-[#222428] hover:border-[#3f7d4e] text-neutral-300'
                        : 'border-[#141517] text-neutral-600 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-[12px] tracking-[0.08em] uppercase">
                      {r.name}
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">
                      {r.description}
                    </div>
                    <div className="text-[10px] text-neutral-600 mt-1">
                      {Object.entries(r.cost)
                        .map(([k, v]) => `${resourceName(k)}×${v}`)
                        .join(' · ')}
                      {r.money ? ` · $${r.money}` : ''}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'rest' && (
            <div className="space-y-3">
              <p className="text-[11px] text-neutral-500 leading-relaxed tracking-[0.06em]">
                The Den is a safe zone. Rest to patch up — free at full hideout,
                no heat clear (visit a shop for that).
              </p>
              <div className="border border-[#1a1c1f] px-3 py-3 text-[11px] text-neutral-400">
                vitality ·{' '}
                <span className="text-neutral-100">{Math.round(health)}</span>
                /100
              </div>
              <button
                type="button"
                onClick={() => {
                  updateStats({ health: 100 });
                  gameAudio.play('market', 0.2);
                }}
                disabled={health >= 100}
                className="w-full border border-[#3f7d4e] py-3 text-[11px] tracking-[0.22em] uppercase text-[#3f7d4e] hover:bg-[#3f7d4e]/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                rest · full heal
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="border-t border-[#1a1c1f] px-4 py-3 text-left text-[11px] tracking-[0.2em] uppercase text-neutral-400 hover:text-neutral-100"
        >
          <span style={{ color: SAFEHOUSE.color }} className="mr-2">
            &gt;
          </span>
          leave [esc]
        </button>
      </div>
    </div>
  );
};

export default SafehousePanel;
