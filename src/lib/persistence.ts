import { supabase } from './supabase';

export interface PlayerData {
  id: string;
  username: string;
  position: [number, number, number];
  rotation: number;
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
  inventory: string[];
  currentWeaponId: string;
}

export interface GameSession {
  id: string;
  playerId: string;
  startTime: string;
  endTime?: string;
  totalKills: number;
  totalMoneyEarned: number;
  maxWantedLevel: number;
}

class PersistenceService {
  private currentPlayerId: string | null = null;
  private currentSessionId: string | null = null;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private offlineMode: boolean = false;

  async initializePlayer(username: string): Promise<string> {
    try {
      const playerId = this.generatePlayerId();

      const playerData = {
        id: playerId,
        username: username || `Player_${Math.floor(Math.random() * 10000)}`,
        position_x: 0,
        position_y: 1.5,
        position_z: 0,
        rotation: 0,
        health: 100,
        reputation: 0,
        wanted: 0,
        money: 1000,
        police_kill_count: 0,
        skills: {
          combat: 10,
          stealth: 10,
          driving: 10,
          intimidation: 10
        },
        inventory: [],
        current_weapon_id: 'fists'
      };

      const { data, error } = await supabase
        .from('players')
        .insert([playerData])
        .select()
        .maybeSingle();

      if (error) {
        console.warn('Failed to save player to database, using offline mode:', error);
        this.offlineMode = true;
        this.currentPlayerId = playerId;
        this.saveToLocalStorage('player_data', playerData);
        return playerId;
      }

      this.currentPlayerId = playerId;
      this.offlineMode = false;
      return playerId;
    } catch (error) {
      console.warn('Database error, switching to offline mode:', error);
      this.offlineMode = true;
      const playerId = this.generatePlayerId();
      this.currentPlayerId = playerId;
      return playerId;
    }
  }

  async startSession(playerId: string): Promise<string | null> {
    if (this.offlineMode) {
      const sessionId = this.generateSessionId();
      this.currentSessionId = sessionId;
      this.saveToLocalStorage('current_session', { id: sessionId, playerId, startTime: new Date().toISOString() });
      return sessionId;
    }

    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .insert([{
          id: this.generateSessionId(),
          player_id: playerId,
          start_time: new Date().toISOString(),
          total_kills: 0,
          total_money_earned: 0,
          max_wanted_level: 0
        }])
        .select()
        .maybeSingle();

      if (error) {
        console.error('Failed to start session:', error);
        return null;
      }

      this.currentSessionId = data.id;
      return data.id;
    } catch (error) {
      console.error('Error starting session:', error);
      return null;
    }
  }

  async savePlayerState(playerData: Partial<PlayerData>): Promise<boolean> {
    if (!this.currentPlayerId) return false;

    if (this.offlineMode) {
      this.saveToLocalStorage('player_data', playerData);
      return true;
    }

    try {
      const updateData = {
        position_x: playerData.position?.[0],
        position_y: playerData.position?.[1],
        position_z: playerData.position?.[2],
        rotation: playerData.rotation,
        health: playerData.health,
        reputation: playerData.reputation,
        wanted: playerData.wanted,
        money: playerData.money,
        police_kill_count: playerData.policeKillCount,
        skills: playerData.skills,
        inventory: playerData.inventory,
        current_weapon_id: playerData.currentWeaponId
      };

      Object.keys(updateData).forEach(key =>
        updateData[key] === undefined && delete updateData[key]
      );

      const { error } = await supabase
        .from('players')
        .update(updateData)
        .eq('id', this.currentPlayerId);

      if (error) {
        console.error('Failed to save player state:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error saving player state:', error);
      return false;
    }
  }

  async loadPlayerState(playerId: string): Promise<PlayerData | null> {
    if (this.offlineMode) {
      const data = this.loadFromLocalStorage('player_data');
      return data as PlayerData | null;
    }

    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .maybeSingle();

      if (error || !data) {
        console.error('Failed to load player state:', error);
        return null;
      }

      return {
        id: data.id,
        username: data.username,
        position: [data.position_x, data.position_y, data.position_z],
        rotation: data.rotation,
        health: data.health,
        reputation: data.reputation,
        wanted: data.wanted,
        money: data.money,
        policeKillCount: data.police_kill_count,
        skills: data.skills,
        inventory: data.inventory,
        currentWeaponId: data.current_weapon_id
      };
    } catch (error) {
      console.error('Error loading player state:', error);
      return null;
    }
  }

  startAutoSave(saveCallback: () => PlayerData, intervalMs: number = 30000) {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(async () => {
      const playerData = saveCallback();
      await this.savePlayerState(playerData);
    }, intervalMs);
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  async endSession(stats: { totalKills: number; totalMoneyEarned: number; maxWantedLevel: number }) {
    if (!this.currentSessionId) return;

    if (this.offlineMode) {
      this.saveToLocalStorage('last_session_stats', stats);
      return;
    }

    try {
      await supabase
        .from('game_sessions')
        .update({
          end_time: new Date().toISOString(),
          total_kills: stats.totalKills,
          total_money_earned: stats.totalMoneyEarned,
          max_wanted_level: stats.maxWantedLevel
        })
        .eq('id', this.currentSessionId);
    } catch (error) {
      console.error('Error ending session:', error);
    }

    this.currentSessionId = null;
  }

  async updateMultiplayerPlayer(playerData: {
    id: string;
    username: string;
    position: [number, number, number];
    rotation: number;
    velocity: [number, number, number];
    health: number;
    stamina: number;
    level: number;
    isInCombat: boolean;
  }): Promise<boolean> {
    if (this.offlineMode) return false;

    try {
      const { error } = await supabase
        .from('multiplayer_players')
        .upsert({
          id: playerData.id,
          username: playerData.username,
          position_x: playerData.position[0],
          position_y: playerData.position[1],
          position_z: playerData.position[2],
          rotation: playerData.rotation,
          velocity_x: playerData.velocity[0],
          velocity_y: playerData.velocity[1],
          velocity_z: playerData.velocity[2],
          health: playerData.health,
          stamina: playerData.stamina,
          level: playerData.level,
          is_in_combat: playerData.isInCombat,
          last_seen: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to update multiplayer player:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating multiplayer player:', error);
      return false;
    }
  }

  async getNearbyPlayers(position: [number, number, number], radius: number = 50): Promise<any[]> {
    if (this.offlineMode) return [];

    try {
      const { data, error } = await supabase
        .from('multiplayer_players')
        .select('*')
        .gte('last_seen', new Date(Date.now() - 10000).toISOString());

      if (error || !data) {
        return [];
      }

      return data.filter(player => {
        const dx = player.position_x - position[0];
        const dz = player.position_z - position[2];
        const distance = Math.sqrt(dx * dx + dz * dz);
        return distance <= radius;
      }).map(player => ({
        id: player.id,
        username: player.username,
        position: [player.position_x, player.position_y, player.position_z],
        rotation: player.rotation,
        velocity: [player.velocity_x, player.velocity_y, player.velocity_z],
        health: player.health,
        stamina: player.stamina,
        level: player.level,
        isInCombat: player.is_in_combat
      }));
    } catch (error) {
      console.error('Error getting nearby players:', error);
      return [];
    }
  }

  private generatePlayerId(): string {
    return 'player_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
  }

  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
  }

  private saveToLocalStorage(key: string, data: any) {
    try {
      localStorage.setItem(`ironhaven_${key}`, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }

  private loadFromLocalStorage(key: string): any {
    try {
      const data = localStorage.getItem(`ironhaven_${key}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }

  isOfflineMode(): boolean {
    return this.offlineMode;
  }

  getCurrentPlayerId(): string | null {
    return this.currentPlayerId;
  }
}

export const persistenceService = new PersistenceService();
