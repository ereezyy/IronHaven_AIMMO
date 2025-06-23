import { create } from 'zustand';
import { weapons, Weapon } from '../components/WeaponSystem';

interface GameState {
  playerStats: {
    health: number;
    reputation: number;
    wanted: number;
    money: number;
    policeKillCount: number;
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
  playerPosition: [number, number, number];
  getCurrentWeapon: () => Weapon;
  addAction: (action: string) => void;
  updateStats: (stats: Partial<GameState['playerStats']>) => void;
  incrementPoliceKillCount: () => void;
  addInventoryItem: (item: string) => void;
  setActiveMission: (mission: any) => void;
  updateSkills: (skillUpdates: Partial<GameState['playerStats']['skills']>) => void;
  setCurrentWeaponId: (weaponId: string) => void;
  setPlayerPosition: (position: [number, number, number]) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  playerStats: {
    health: 100,
    reputation: 0,
    wanted: 0,
    money: 1000,
    policeKillCount: 0,
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
  playerPosition: [0, 1.5, 0],
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
  incrementPoliceKillCount: () =>
    set((state) => ({
      playerStats: { ...state.playerStats, policeKillCount: state.playerStats.policeKillCount + 1 }
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
    })),
  setPlayerPosition: (position) =>
    set(() => ({
      playerPosition: position
    }))
}));