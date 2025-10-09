import { create } from 'zustand';
import { weapons, Weapon } from '../components/WeaponSystem';
import { persistenceService } from '../lib/persistence';

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
  playerId: string | null;
  sessionStats: {
    totalKills: number;
    totalMoneyEarned: number;
    maxWantedLevel: number;
  };
  getCurrentWeapon: () => Weapon;
  addAction: (action: string) => void;
  updateStats: (stats: Partial<GameState['playerStats']>) => void;
  incrementPoliceKillCount: () => void;
  addInventoryItem: (item: string) => void;
  setActiveMission: (mission: any) => void;
  updateSkills: (skillUpdates: Partial<GameState['playerStats']['skills']>) => void;
  setCurrentWeaponId: (weaponId: string) => void;
  setPlayerPosition: (position: [number, number, number]) => void;
  initializePlayer: (username?: string) => Promise<void>;
  saveGameState: () => Promise<void>;
  loadGameState: (playerId: string) => Promise<void>;
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
  playerId: null,
  sessionStats: {
    totalKills: 0,
    totalMoneyEarned: 0,
    maxWantedLevel: 0
  },
  getCurrentWeapon: () => {
    const state = get();
    return weapons.find(w => w.id === state.currentWeaponId) || weapons[0];
  },
  addAction: (action) =>
    set((state) => ({
      recentActions: [...state.recentActions.slice(-4), action]
    })),
  updateStats: (stats) => {
    set((state) => {
      const newStats = { ...state.playerStats, ...stats };
      const newSessionStats = { ...state.sessionStats };

      if (stats.wanted !== undefined && stats.wanted > newSessionStats.maxWantedLevel) {
        newSessionStats.maxWantedLevel = stats.wanted;
      }

      if (stats.money !== undefined) {
        const moneyEarned = stats.money - state.playerStats.money;
        if (moneyEarned > 0) {
          newSessionStats.totalMoneyEarned += moneyEarned;
        }
      }

      return {
        playerStats: newStats,
        sessionStats: newSessionStats
      };
    });

    get().saveGameState();
  },
  incrementPoliceKillCount: () => {
    set((state) => ({
      playerStats: {
        ...state.playerStats,
        policeKillCount: state.playerStats.policeKillCount + 1
      },
      sessionStats: {
        ...state.sessionStats,
        totalKills: state.sessionStats.totalKills + 1
      }
    }));

    get().saveGameState();
  },
  addInventoryItem: (item) => {
    set((state) => ({
      inventory: [...state.inventory, item]
    }));

    get().saveGameState();
  },
  setActiveMission: (mission) =>
    set(() => ({
      activeMission: mission
    })),
  updateSkills: (skillUpdates) => {
    set((state) => ({
      playerStats: {
        ...state.playerStats,
        skills: { ...state.playerStats.skills, ...skillUpdates }
      }
    }));

    get().saveGameState();
  },
  setCurrentWeaponId: (weaponId) => {
    set(() => ({
      currentWeaponId: weaponId
    }));

    get().saveGameState();
  },
  setPlayerPosition: (position) =>
    set(() => ({
      playerPosition: position
    })),
  initializePlayer: async (username?: string) => {
    try {
      const playerId = await persistenceService.initializePlayer(username || `Player_${Math.floor(Math.random() * 10000)}`);
      await persistenceService.startSession(playerId);

      persistenceService.startAutoSave(() => {
        const state = get();
        return {
          id: playerId,
          username: username || 'Player',
          position: state.playerPosition,
          rotation: 0,
          health: state.playerStats.health,
          reputation: state.playerStats.reputation,
          wanted: state.playerStats.wanted,
          money: state.playerStats.money,
          policeKillCount: state.playerStats.policeKillCount,
          skills: state.playerStats.skills,
          inventory: state.inventory,
          currentWeaponId: state.currentWeaponId
        };
      }, 30000);

      set({ playerId });
    } catch (error) {
      console.error('Failed to initialize player:', error);
    }
  },
  saveGameState: async () => {
    const state = get();
    if (!state.playerId) return;

    await persistenceService.savePlayerState({
      id: state.playerId,
      username: 'Player',
      position: state.playerPosition,
      rotation: 0,
      health: state.playerStats.health,
      reputation: state.playerStats.reputation,
      wanted: state.playerStats.wanted,
      money: state.playerStats.money,
      policeKillCount: state.playerStats.policeKillCount,
      skills: state.playerStats.skills,
      inventory: state.inventory,
      currentWeaponId: state.currentWeaponId
    });
  },
  loadGameState: async (playerId: string) => {
    const playerData = await persistenceService.loadPlayerState(playerId);
    if (playerData) {
      set({
        playerId: playerData.id,
        playerPosition: playerData.position,
        playerStats: {
          health: playerData.health,
          reputation: playerData.reputation,
          wanted: playerData.wanted,
          money: playerData.money,
          policeKillCount: playerData.policeKillCount,
          skills: playerData.skills
        },
        inventory: playerData.inventory,
        currentWeaponId: playerData.currentWeaponId
      });
    }
  }
}));