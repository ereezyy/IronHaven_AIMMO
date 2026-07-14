import React, { useState } from 'react';
import { useGameStore } from '../store/gameState';
import {
  RESOURCES,
  RECIPES,
  resourceName,
  canCraft,
  type ResourceId,
} from '../game/economy';
import { weapons } from './WeaponSystem';
import { gameAudio } from '../lib/gameAudio';

interface EconomyPanelProps {
  onClose: () => void;
}

type Tab = 'bag' | 'craft' | 'trade' | 'fish';

const EconomyPanel: React.FC<EconomyPanelProps> = ({ onClose }) => {
  const [tab, setTab] = useState<Tab>('bag');
  const bag = useGameStore((s) => s.bag);
  const fishBag = useGameStore((s) => s.fishBag);
  const money = useGameStore((s) => s.playerStats.money);
  const inventory = useGameStore((s) => s.inventory);
  const currentWeaponId = useGameStore((s) => s.currentWeaponId);
  const craftRecipe = useGameStore((s) => s.craftRecipe);
  const buyResource = useGameStore((s) => s.buyResource);
  const sellResource = useGameStore((s) => s.sellResource);
  const useStim = useGameStore((s) => s.useStim);
  const sellFish = useGameStore((s) => s.sellFish);
  const setCurrentWeaponId = useGameStore((s) => s.setCurrentWeaponId);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'bag', label: 'bag' },
    { id: 'craft', label: 'craft' },
    { id: 'trade', label: 'trade' },
    { id: 'fish', label: 'fish' },
  ];

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center font-mono bg-black/55 backdrop-blur-[2px]">
      <div className="w-full max-w-xl mx-4 border border-[#222428] bg-black/92 backdrop-blur-sm max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-[#1a1c1f] px-4 py-3">
          <span className="text-[11px] tracking-[0.28em] uppercase text-neutral-200">
            street economy <span style={{ color: '#c03a30' }}>·</span> terminal
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
                  ? 'text-neutral-100 border-b border-[#c03a30]'
                  : 'text-neutral-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          {tab === 'bag' && (
            <div className="space-y-4">
              <div>
                <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-500 mb-2">
                  materials
                </div>
                {RESOURCES.map((r) => (
                  <div
                    key={r.id}
                    className="flex justify-between text-[12px] py-1 border-b border-[#141517] text-neutral-300"
                  >
                    <span>{r.name}</span>
                    <span className="text-neutral-500">×{bag[r.id] || 0}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-500 mb-2">
                  weapons
                </div>
                <button
                  onClick={() => setCurrentWeaponId('fists')}
                  className={`w-full text-left text-[12px] py-1.5 ${
                    currentWeaponId === 'fists'
                      ? 'text-neutral-100'
                      : 'text-neutral-400'
                  }`}
                >
                  {currentWeaponId === 'fists' ? '■' : '>'} Fists
                </button>
                {inventory.map((id) => {
                  const w = weapons.find((x) => x.id === id);
                  if (!w) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => setCurrentWeaponId(id)}
                      className={`w-full text-left text-[12px] py-1.5 ${
                        currentWeaponId === id
                          ? 'text-neutral-100'
                          : 'text-neutral-400'
                      }`}
                    >
                      {currentWeaponId === id ? '■' : '>'} {w.name} ({w.damage}{' '}
                      dmg)
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  if (useStim()) gameAudio.play('talk', 0.2);
                }}
                disabled={(bag.stim_vial || 0) < 1}
                className="w-full border border-[#222428] py-2 text-[11px] tracking-[0.2em] uppercase text-neutral-300 hover:border-[#c03a30] disabled:opacity-40"
              >
                use stim (+40 hp) · ×{bag.stim_vial || 0}
              </button>
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
                        ? 'border-[#222428] hover:border-[#c03a30] text-neutral-300'
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

          {tab === 'trade' && (
            <div className="space-y-2">
              <div className="text-[10px] text-neutral-500 mb-2 tracking-[0.15em] uppercase">
                street rates · buy high / sell low
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
                      buy ${r.buy} · sell ${r.sell} · have {bag[r.id] || 0}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        if (buyResource(r.id as ResourceId, 1))
                          gameAudio.play('ui', 0.12);
                      }}
                      className="border border-[#222428] px-2 py-1 text-neutral-400 hover:text-white"
                    >
                      buy
                    </button>
                    <button
                      onClick={() => {
                        if (sellResource(r.id as ResourceId, 1))
                          gameAudio.play('ui', 0.12);
                      }}
                      className="border border-[#222428] px-2 py-1 text-neutral-400 hover:text-white"
                    >
                      sell
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'fish' && (
            <div className="space-y-3">
              <p className="text-[10px] text-neutral-500 tracking-[0.12em] uppercase">
                cast at piers with C · sell the haul here
              </p>
              {Object.entries(fishBag).map(([id, qty]) => (
                <div
                  key={id}
                  className="flex justify-between text-[12px] py-1 border-b border-[#141517] text-neutral-300"
                >
                  <span className="uppercase tracking-[0.08em]">
                    {id.replace(/_/g, ' ')}
                  </span>
                  <span className="text-neutral-500">×{qty}</span>
                </div>
              ))}
              <button
                onClick={() => {
                  const earned = sellFish();
                  if (earned > 0) gameAudio.play('market', 0.25);
                }}
                className="w-full border border-[#222428] py-2 text-[11px] tracking-[0.2em] uppercase text-neutral-300 hover:border-[#c03a30]"
              >
                sell all fish
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="border-t border-[#1a1c1f] px-4 py-3 text-left text-[11px] tracking-[0.2em] uppercase text-neutral-400 hover:text-neutral-100"
        >
          <span style={{ color: '#c03a30' }} className="mr-2">
            &gt;
          </span>
          close [tab]
        </button>
      </div>
    </div>
  );
};

export default EconomyPanel;
