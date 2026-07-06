import { supabase, SUPABASE_CONFIGURED, ensureAuthUser } from './supabase';

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

export interface NearbyPlayer {
  id: string;
  username: string;
  position: [number, number, number];
  rotation: number;
  velocity: [number, number, number];
  health: number;
  stamina: number;
  level: number;
  isInCombat: boolean;
}

class PersistenceService {
  private currentPlayerId: string | null = null;
  private currentSessionId: string | null = null;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private offlineMode: boolean = !SUPABASE_CONFIGURED;
  private lastSavedStateHash: string | null = null;

  async initializePlayer(username: string): Promise<string> {
    try {
      // Sign in anonymously first so the insert carries a JWT; the DB stamps
      // owner = auth.uid() and owner-scoped RLS gates every later read/write.
      await ensureAuthUser();

      const playerId = this.generatePlayerId();

      const playerData = {
        id: playerId,
        username: username || `Player_${crypto.randomUUID().substring(0, 8)}`,
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
          intimidation: 10,
        },
        inventory: [],
        current_weapon_id: 'fists',
      };

      const { error } = await supabase
        .from('players')
        .insert([playerData])
        .select()
        .maybeSingle();

      if (error) {
        console.warn(
          'Failed to save player to database, using offline mode:',
          error
        );
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
      this.saveToLocalStorage('current_session', {
        id: sessionId,
        playerId,
        startTime: new Date().toISOString(),
      });
      return sessionId;
    }

    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .insert([
          {
            id: this.generateSessionId(),
            player_id: playerId,
            start_time: new Date().toISOString(),
            total_kills: 0,
            total_money_earned: 0,
            max_wanted_level: 0,
          },
        ])
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
        current_weapon_id: playerData.currentWeaponId,
      };

      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key]
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
        currentWeaponId: data.current_weapon_id,
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

    this.lastSavedStateHash = null;

    this.autoSaveInterval = setInterval(async () => {
      const playerData = saveCallback();

      // Optimization: Check if data has changed before saving
      const currentStateHash = JSON.stringify(playerData);
      if (this.lastSavedStateHash === currentStateHash) {
        return;
      }

      const success = await this.savePlayerState(playerData);
      if (success) {
        this.lastSavedStateHash = currentStateHash;
      }
    }, intervalMs);
  }

  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  async endSession(stats: {
    totalKills: number;
    totalMoneyEarned: number;
    maxWantedLevel: number;
  }) {
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
          max_wanted_level: stats.maxWantedLevel,
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
      const { error } = await supabase.from('multiplayer_players').upsert({
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
        last_seen: new Date().toISOString(),
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

  private mapMultiplayerRow(row: any): NearbyPlayer {
    return {
      id: row.id,
      username: row.username,
      position: [row.position_x, row.position_y, row.position_z],
      rotation: row.rotation,
      velocity: [row.velocity_x, row.velocity_y, row.velocity_z],
      health: row.health,
      stamina: row.stamina,
      level: row.level,
      isInCombat: row.is_in_combat,
    };
  }

  // One-shot snapshot used to seed the local roster before the live stream
  // takes over. Live position/health updates now arrive via
  // subscribeToNearbyPlayers (postgres_changes), not by re-polling this.
  async getNearbyPlayers(
    position: [number, number, number],
    radius: number = 50
  ): Promise<NearbyPlayer[]> {
    if (this.offlineMode) return [];

    try {
      const { data, error } = await supabase
        .from('multiplayer_players')
        .select('*')
        .gte('last_seen', new Date(Date.now() - 30000).toISOString());

      if (error || !data) {
        return [];
      }

      const radiusSq = radius * radius;
      return data
        .filter((player) => {
          const dx = player.position_x - position[0];
          const dz = player.position_z - position[2];
          return dx * dx + dz * dz <= radiusSq;
        })
        .map((player) => this.mapMultiplayerRow(player));
    } catch (error) {
      console.error('Error getting nearby players:', error);
      return [];
    }
  }

  // Live multiplayer sync: subscribe to row-level changes on multiplayer_players
  // so other players' positions/health propagate with sub-100ms latency instead
  // of a 10s poll. Returns an unsubscribe function.
  subscribeToNearbyPlayers(handlers: {
    onUpsert: (player: NearbyPlayer) => void;
    onRemove?: (id: string) => void;
  }): () => void {
    if (this.offlineMode) return () => {};

    const channel = supabase
      .channel('multiplayer_players_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'multiplayer_players' },
        (payload: any) => {
          if (payload.eventType === 'DELETE') {
            const id = payload.old?.id;
            if (id) handlers.onRemove?.(id);
          } else if (payload.new) {
            handlers.onUpsert(this.mapMultiplayerRow(payload.new));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  private generatePlayerId(): string {
    return 'player_' + crypto.randomUUID();
  }

  private generateSessionId(): string {
    return 'session_' + crypto.randomUUID();
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
