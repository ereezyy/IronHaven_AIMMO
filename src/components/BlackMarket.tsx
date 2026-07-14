import React from 'react';
import { useGameStore } from '../store/gameState';
import { weapons } from './WeaponSystem';

interface BlackMarketProps {
  onClose: () => void;
}

// Per-rarity street prices. Fists are free (starter); common guns cost cash
// so the armory loop actually matters instead of free loot on spawn.
export const WEAPON_PRICE: Record<string, number> = {
  common: 500,
  rare: 1500,
  epic: 4000,
  legendary: 9000,
};

export const STARTER_WEAPON_ID = 'fists';

export const UPGRADE_STEP = 5;
export const MAX_SKILL_LEVEL = 50;

// Escalating, tiered pricing: each tier costs meaningfully more than the last,
// so accumulated investment compounds and walking away from a near-maxed skill
// stings — loss aversion that keeps players grinding the loop.
export const skillCost = (level: number) =>
  Math.round(40 * Math.pow(level / 10, 1.6));

// Skills start at 10 and step by 5 to a cap of 50 → tiers I..IX.
export const skillTier = (level: number) =>
  Math.floor((level - 10) / UPGRADE_STEP) + 1;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// Terminal-style storefront. Spends the persisted Supabase economy (money) on
// skill upgrades and weapon acquisition; all writes flow through the store,
// which auto-saves to the backend.
const BlackMarket: React.FC<BlackMarketProps> = ({ onClose }) => {
  const money = useGameStore((s) => s.playerStats.money);
  const skills = useGameStore((s) => s.playerStats.skills);
  const inventory = useGameStore((s) => s.inventory);
  const currentWeaponId = useGameStore((s) => s.currentWeaponId);
  const updateStats = useGameStore((s) => s.updateStats);
  const updateSkills = useGameStore((s) => s.updateSkills);
  const addInventoryItem = useGameStore((s) => s.addInventoryItem);
  const setCurrentWeaponId = useGameStore((s) => s.setCurrentWeaponId);

  const buySkill = (key: 'combat' | 'stealth') => {
    if (skills[key] >= MAX_SKILL_LEVEL) return;
    const cost = skillCost(skills[key]);
    if (money < cost) return;
    updateStats({ money: money - cost });
    updateSkills({
      [key]: Math.min(MAX_SKILL_LEVEL, skills[key] + UPGRADE_STEP),
    });
  };

  const owns = (id: string, _rarity: string) =>
    id === STARTER_WEAPON_ID || inventory.includes(id);

  const acquire = (id: string, rarity: string) => {
    if (owns(id, rarity)) {
      setCurrentWeaponId(id);
      return;
    }
    const price = WEAPON_PRICE[rarity] ?? 0;
    if (money < price) return;
    updateStats({ money: money - price });
    addInventoryItem(id);
    setCurrentWeaponId(id);
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center font-mono bg-black/55 backdrop-blur-[2px]">
      <div className="w-full max-w-2xl mx-4 border border-[#222428] bg-black/90 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-[#1a1c1f] px-5 py-3">
          <span className="text-[11px] tracking-[0.28em] uppercase text-neutral-200">
            black market <span style={{ color: '#c03a30' }}>·</span> terminal
          </span>
          <span className="text-[11px] tracking-[0.18em] uppercase text-neutral-400">
            $<span className="text-neutral-100">{money}</span>
          </span>
        </div>

        <div className="px-5 py-4 border-b border-[#141517]">
          <div className="mb-2 text-[10px] tracking-[0.3em] uppercase text-neutral-500">
            skills
          </div>
          {(['combat', 'stealth'] as const).map((key) => {
            const maxed = skills[key] >= MAX_SKILL_LEVEL;
            const cost = skillCost(skills[key]);
            const afford = !maxed && money >= cost;
            return (
              <button
                key={key}
                onClick={() => buySkill(key)}
                disabled={!afford}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-[12px] tracking-[0.06em] transition-colors ${
                  afford
                    ? 'text-neutral-300 hover:bg-[#15171a] hover:text-neutral-100'
                    : 'text-neutral-600 cursor-not-allowed'
                }`}
              >
                <span>
                  <span style={{ color: '#c03a30' }} className="mr-3">
                    &gt;
                  </span>
                  {key}
                  <span className="ml-2 text-[10px] text-neutral-600">
                    tier {ROMAN[skillTier(skills[key]) - 1] ?? '—'} · lv{' '}
                    {skills[key]}
                    {maxed ? '' : ` → ${skills[key] + UPGRADE_STEP}`}
                  </span>
                </span>
                <span className="text-[11px] text-neutral-500">
                  {maxed ? 'maxed' : `$${cost}`}
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-5 py-4">
          <div className="mb-2 text-[10px] tracking-[0.3em] uppercase text-neutral-500">
            armory
          </div>
          {weapons.map((w) => {
            const owned = owns(w.id, w.rarity);
            const equipped = currentWeaponId === w.id;
            const price = WEAPON_PRICE[w.rarity] ?? 0;
            const afford = owned || money >= price;
            return (
              <button
                key={w.id}
                onClick={() => acquire(w.id, w.rarity)}
                disabled={!afford || equipped}
                className={`w-full flex items-center justify-between px-3 py-2 text-left text-[12px] tracking-[0.06em] transition-colors ${
                  equipped
                    ? 'text-neutral-100'
                    : afford
                      ? 'text-neutral-300 hover:bg-[#15171a] hover:text-neutral-100'
                      : 'text-neutral-600 cursor-not-allowed'
                }`}
              >
                <span>
                  <span style={{ color: '#c03a30' }} className="mr-3">
                    {equipped ? '■' : '>'}
                  </span>
                  {w.name}
                  <span className="ml-2 text-[10px] text-neutral-600">
                    {w.damage} dmg · {w.rarity}
                  </span>
                </span>
                <span className="text-[11px] text-neutral-500">
                  {equipped ? 'equipped' : owned ? 'equip' : `$${price}`}
                </span>
              </button>
            );
          })}
        </div>

        <div className="border-t border-[#1a1c1f]">
          <button
            onClick={onClose}
            className="w-full px-5 py-3 text-left text-[12px] tracking-[0.12em] uppercase text-neutral-300 hover:bg-[#15171a] hover:text-neutral-100 transition-colors"
          >
            <span style={{ color: '#c03a30' }} className="mr-3">
              &gt;
            </span>
            close [b]
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlackMarket;
