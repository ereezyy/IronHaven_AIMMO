import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameState';

export interface Weapon {
  id: string;
  name: string;
  damage: number;
  range: number;
  ammo: number;
  maxAmmo: number;
  fireRate: number;
  brutality: number;
  sprite: string;
}

export const weapons: Weapon[] = [
  {
    id: 'fists',
    name: 'Bare Hands',
    damage: 15,
    range: 1,
    ammo: -1,
    maxAmmo: -1,
    fireRate: 800,
    brutality: 2,
    sprite: '👊'
  },
  {
    id: 'knife',
    name: 'Combat Knife',
    damage: 35,
    range: 1.5,
    ammo: -1,
    maxAmmo: -1,
    fireRate: 600,
    brutality: 8,
    sprite: '🔪'
  },
  {
    id: 'bat',
    name: 'Baseball Bat',
    damage: 45,
    range: 2,
    ammo: -1,
    maxAmmo: -1,
    fireRate: 1000,
    brutality: 6,
    sprite: '🏏'
  },
  {
    id: 'pistol',
    name: '9mm Pistol',
    damage: 60,
    range: 15,
    ammo: 12,
    maxAmmo: 12,
    fireRate: 400,
    brutality: 5,
    sprite: '🔫'
  },
  {
    id: 'shotgun',
    name: 'Pump Shotgun',
    damage: 120,
    range: 8,
    ammo: 6,
    maxAmmo: 6,
    fireRate: 1200,
    brutality: 9,
    sprite: '💥'
  },
  {
    id: 'uzi',
    name: 'Uzi SMG',
    damage: 25,
    range: 12,
    ammo: 30,
    maxAmmo: 30,
    fireRate: 100,
    brutality: 7,
    sprite: '🔫'
  }
];


const WeaponSystem: React.FC = () => {
  const gameStore = useGameStore();
  const currentWeapon = gameStore.getCurrentWeapon();
  const [unlockedWeapons, setUnlockedWeapons] = useState<string[]>(['fists']);
  const [lastFired, setLastFired] = useState(0);

  useEffect(() => {
    // Unlock weapons based on reputation
    const rep = gameStore.playerStats.reputation;
    const newUnlocked = ['fists'];
    
    if (rep >= 10) newUnlocked.push('knife');
    if (rep >= 20) newUnlocked.push('bat');
    if (rep >= 30) newUnlocked.push('pistol');
    if (rep >= 50) newUnlocked.push('shotgun');
    if (rep >= 70) newUnlocked.push('uzi');
    
    setUnlockedWeapons(newUnlocked);
  }, [gameStore.playerStats.reputation]);

  const canFire = () => {
    const now = Date.now();
    return now - lastFired > currentWeapon.fireRate;
  };

  const fire = () => {
    if (!canFire()) return false;
    
    if (currentWeapon.ammo > 0) {
      setLastFired(Date.now());
      // Decrease ammo for guns
      if (currentWeapon.ammo !== -1) {
        currentWeapon.ammo--;
      }
      return true;
    }
    return false;
  };

  return (
    <div className="absolute bottom-4 right-4 p-3 bg-black/90 text-white rounded-lg border border-red-500/70 backdrop-blur-sm">
      <h3 className="text-lg font-bold text-red-400 mb-3 border-b border-red-500/30 pb-1">ARSENAL</h3>
      
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Current:</span>
          <span className="text-white font-bold text-sm">{currentWeapon?.sprite || '👊'} {currentWeapon?.name || 'Bare Hands'}</span>
        </div>
        
        {currentWeapon?.ammo !== -1 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Ammo:</span>
            <span className="text-yellow-400 font-bold text-sm">{currentWeapon?.ammo || 0}/{currentWeapon?.maxAmmo || 0}</span>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Brutality:</span>
          <span className="text-red-500 font-bold text-sm">{'💀'.repeat(Math.floor((currentWeapon?.brutality || 0) / 2))}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {weapons.filter(w => unlockedWeapons.includes(w.id)).map((weapon) => (
          <button
            key={weapon.id}
            onClick={() => gameStore.setCurrentWeaponId(weapon.id)}
            className={`p-1 rounded text-xs transition-colors ${
              currentWeapon?.id === weapon.id
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            }`}
          >
            <div className="text-sm mb-1">{weapon.sprite}</div>
            <div className="font-medium text-xs">{weapon.name.split(' ')[0]}</div>
          </button>
        ))}
      </div>
      
      <div className="mt-3 text-xs text-gray-400">
        <div>Keys 1-6: Quick select | Mouse: Attack</div>
      </div>
    </div>
  );
};

export { WeaponSystem };