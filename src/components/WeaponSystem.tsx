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
    damage: 25,
    range: 1,
    ammo: -1,
    maxAmmo: -1,
    fireRate: 600,
    brutality: 2,
    sprite: '👊'
  },
  {
    id: 'knife',
    name: 'Combat Knife',
    damage: 60,
    range: 1.5,
    ammo: -1,
    maxAmmo: -1,
    fireRate: 400,
    brutality: 8,
    sprite: '🔪'
  },
  {
    id: 'bat',
    name: 'Baseball Bat',
    damage: 75,
    range: 2,
    ammo: -1,
    maxAmmo: -1,
    fireRate: 800,
    brutality: 6,
    sprite: '🏏'
  },
  {
    id: 'pistol',
    name: '9mm Pistol',
    damage: 100,
    range: 15,
    ammo: 15,
    maxAmmo: 15,
    fireRate: 300,
    brutality: 5,
    sprite: '🔫'
  },
  {
    id: 'shotgun',
    name: 'Pump Shotgun',
    damage: 200,
    range: 8,
    ammo: 8,
    maxAmmo: 8,
    fireRate: 1000,
    brutality: 9,
    sprite: '💥'
  },
  {
    id: 'uzi',
    name: 'Uzi SMG',
    damage: 45,
    range: 12,
    ammo: 32,
    maxAmmo: 32,
    fireRate: 80,
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
          <span className="text-white font-bold text-sm animate-pulse bg-red-600/20 px-2 py-1 rounded">{currentWeapon?.sprite || '👊'} {currentWeapon?.name || 'Bare Hands'}</span>
        </div>
        
        {currentWeapon?.ammo !== -1 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Ammo:</span>
            <span className={`font-bold text-sm transition-colors duration-300 ${
              (currentWeapon?.ammo || 0) < 3 ? 'text-red-400 animate-pulse' : 'text-yellow-400'
            }`}>{currentWeapon?.ammo || 0}/{currentWeapon?.maxAmmo || 0}</span>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Damage:</span>
          <span className="text-red-400 font-bold text-sm">{currentWeapon?.damage || 0}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Range:</span>
          <span className="text-blue-400 font-bold text-sm">{currentWeapon?.range || 0}m</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Brutality:</span>
          <span className="text-red-500 font-bold text-sm animate-bounce">{'💀'.repeat(Math.min(Math.floor((currentWeapon?.brutality || 0) / 2), 5))}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {weapons.filter(w => unlockedWeapons.includes(w.id)).map((weapon) => (
          <button
            key={weapon.id}
            onClick={() => gameStore.setCurrentWeaponId(weapon.id)}
            className={`p-2 rounded text-xs transition-all duration-200 transform hover:scale-110 hover:shadow-lg ${
              currentWeapon?.id === weapon.id
                ? 'bg-red-600 text-white shadow-lg shadow-red-500/50 border border-red-400'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600'
            }`}
          >
            <div className="text-lg mb-1 animate-pulse">{weapon.sprite}</div>
            <div className="font-medium text-xs">{weapon.name.split(' ')[0]}</div>
            <div className="text-xs text-red-400 font-bold">{weapon.damage}</div>
          </button>
        ))}
      </div>
      
      <div className="mt-3 text-xs text-gray-400">
        <div className="animate-fade-in bg-black/30 p-2 rounded">
          <div>🎯 Keys 1-6: Quick select</div>
          <div>🖱️ Mouse: Attack</div>
          <div>⚡ Higher damage = More brutality</div>
        </div>
      </div>
    </div>
  );
};

export { WeaponSystem };