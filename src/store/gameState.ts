import { create } from 'zustand';
import { weapons, Weapon } from '../components/WeaponSystem';

interface GameState {
  playerStats: {
    health: number;
    reputation: number;
    wanted: number;
    money: number;
    skills: {
      combat: number;
      stealth: number;
      driving: number;
      intimidation: number;
    };
  };
  inventory: string[];
  recentActions: string[];
  activeMission: any;
  currentWeaponId: string;
  getCurrentWeapon: () => Weapon;
  addAction: (action: string) => void;
  updateStats: (stats: Partial<GameState['playerStats']>) => void;
  addInventoryItem: (item: string) => void;
  setActiveMission: (mission: any) => void;
  updateSkills: (skillUpdates: Partial<GameState['playerStats']['skills']>) => void;
  setCurrentWeaponId: (weaponId: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
  playerStats: {
    health: 100,
    reputation: 0,
    wanted: 0,
    money: 1000,
    skills: {
      combat: 10,
      stealth: 10,
      driving: 10,
      intimidation: 10
    }
  },
  inventory: [],
  recentActions: [],
  activeMission: null,
  currentWeaponId: 'fists',
  getCurrentWeapon: () => {
    const state = get();
    return weapons.find(w => w.id === state.currentWeaponId) || weapons[0];
  },
  addAction: (action) => 
    set((state) => ({
      recentActions: [...state.recentActions.slice(-4), action]
    })),
  updateStats: (stats) =>
    set((state) => ({
      playerStats: { ...state.playerStats, ...stats }
    })),
  addInventoryItem: (item) =>
    set((state) => ({
      inventory: [...state.inventory, item]
    })),
  setActiveMission: (mission) =>
    set(() => ({
      activeMission: mission
    })),
  updateSkills: (skillUpdates) =>
    set((state) => ({
      playerStats: { ...state.playerStats, skills: { ...state.playerStats.skills, ...skillUpdates } }
    })),
  setCurrentWeaponId: (weaponId) =>
    set(() => ({
      currentWeaponId: weaponId
    }))
}));