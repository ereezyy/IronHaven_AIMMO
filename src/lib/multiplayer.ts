// Multiplayer Networking System for IronHaven AIMMO
// Real-time player synchronization and world state management

export interface PlayerData {
  id: string;
  username: string;
  position: [number, number, number];
  rotation: number;
  velocity: [number, number, number];
  health: number;
  stamina: number;
  level: number;
  characterClass: CharacterClass;
  guild?: string;
  isInCombat: boolean;
  lastSeen: number;
}

export interface WorldState {
  players: Map<string, PlayerData>;
  npcs: Map<string, NPCData>;
  events: GameEvent[];
  territories: Territory[];
  timestamp: number;
}

export interface GameEvent {
  id: string;
  type: 'combat' | 'quest' | 'world_boss' | 'faction_war' | 'territory_capture';
  position: [number, number, number];
  participants: string[];
  data: any;
  startTime: number;
  duration: number;
}

export interface Territory {
  id: string;
  name: string;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  controlledBy?: string; // Guild ID
  captureProgress: number;
  defenseLevel: number;
  resources: ResourceNode[];
}

export interface CharacterClass {
  id: string;
  name: string;
  description: string;
  baseStats: {
    health: number;
    stamina: number;
    damage: number;
    defense: number;
    speed: number;
  };
  skills: Skill[];
  unlockLevel: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  cooldown: number;
  manaCost: number;
  effect: SkillEffect;
}

export interface SkillEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'teleport' | 'shield';
  value: number;
  duration?: number;
  radius?: number;
}

// Multiplayer Network Manager
class MultiplayerManager {
  private ws: WebSocket | null = null;
  private playerId: string = '';
  private worldState: WorldState = {
    players: new Map(),
    npcs: new Map(),
    events: [],
    territories: [],
    timestamp: Date.now()
  };
  private callbacks: Map<string, Function[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    this.playerId = this.generatePlayerId();
  }

  // Connect to multiplayer server
  connect(serverUrl: string = 'wss://ironhaven-server.manus.space'): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(serverUrl);
        
        this.ws.onopen = () => {
          console.log('🌐 Connected to IronHaven AIMMO multiplayer server');
          this.reconnectAttempts = 0;
          this.sendMessage('player_join', {
            playerId: this.playerId,
            timestamp: Date.now()
          });
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };

        this.ws.onclose = () => {
          console.log('🔌 Disconnected from multiplayer server');
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('❌ Multiplayer connection error:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  // Handle incoming messages from server
  private handleMessage(message: any) {
    const { type, data } = message;

    switch (type) {
      case 'world_state_update':
        this.updateWorldState(data);
        break;
      case 'player_joined':
        this.addPlayer(data);
        break;
      case 'player_left':
        this.removePlayer(data.playerId);
        break;
      case 'player_moved':
        this.updatePlayerPosition(data);
        break;
      case 'combat_event':
        this.handleCombatEvent(data);
        break;
      case 'chat_message':
        this.handleChatMessage(data);
        break;
      case 'guild_update':
        this.handleGuildUpdate(data);
        break;
      case 'territory_update':
        this.handleTerritoryUpdate(data);
        break;
    }

    // Trigger callbacks
    this.triggerCallbacks(type, data);
  }

  // Send message to server
  sendMessage(type: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data, playerId: this.playerId }));
    }
  }

  // Update player position (called frequently)
  updatePlayerPosition(position: [number, number, number], rotation: number, velocity: [number, number, number]) {
    this.sendMessage('player_move', {
      position,
      rotation,
      velocity,
      timestamp: Date.now()
    });
  }

  // Start combat with another player or NPC
  initiateCombat(targetId: string, targetType: 'player' | 'npc') {
    this.sendMessage('combat_start', {
      targetId,
      targetType,
      timestamp: Date.now()
    });
  }

  // Send chat message
  sendChatMessage(message: string, channel: 'global' | 'guild' | 'local' = 'global') {
    this.sendMessage('chat_message', {
      message,
      channel,
      timestamp: Date.now()
    });
  }

  // Join or create guild
  joinGuild(guildName: string) {
    this.sendMessage('guild_join', {
      guildName,
      timestamp: Date.now()
    });
  }

  // Capture territory
  captureTerritory(territoryId: string) {
    this.sendMessage('territory_capture', {
      territoryId,
      timestamp: Date.now()
    });
  }

  // Get current world state
  getWorldState(): WorldState {
    return this.worldState;
  }

  // Get other players in range
  getNearbyPlayers(position: [number, number, number], range: number = 50): PlayerData[] {
    const nearby: PlayerData[] = [];
    
    this.worldState.players.forEach((player) => {
      if (player.id === this.playerId) return;
      
      const distance = this.calculateDistance(position, player.position);
      if (distance <= range) {
        nearby.push(player);
      }
    });

    return nearby;
  }

  // Register callback for events
  on(eventType: string, callback: Function) {
    if (!this.callbacks.has(eventType)) {
      this.callbacks.set(eventType, []);
    }
    this.callbacks.get(eventType)!.push(callback);
  }

  // Remove callback
  off(eventType: string, callback: Function) {
    const callbacks = this.callbacks.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Private helper methods
  private generatePlayerId(): string {
    return 'player_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  private updateWorldState(data: Partial<WorldState>) {
    if (data.players) {
      this.worldState.players = new Map(data.players);
    }
    if (data.npcs) {
      this.worldState.npcs = new Map(data.npcs);
    }
    if (data.events) {
      this.worldState.events = data.events;
    }
    if (data.territories) {
      this.worldState.territories = data.territories;
    }
    this.worldState.timestamp = data.timestamp || Date.now();
  }

  private addPlayer(playerData: PlayerData) {
    this.worldState.players.set(playerData.id, playerData);
  }

  private removePlayer(playerId: string) {
    this.worldState.players.delete(playerId);
  }

  private updatePlayerPosition(data: any) {
    const player = this.worldState.players.get(data.playerId);
    if (player) {
      player.position = data.position;
      player.rotation = data.rotation;
      player.velocity = data.velocity;
      player.lastSeen = data.timestamp;
    }
  }

  private handleCombatEvent(data: any) {
    // Handle combat events between players
    console.log('⚔️ Combat event:', data);
  }

  private handleChatMessage(data: any) {
    // Handle incoming chat messages
    console.log('💬 Chat:', data);
  }

  private handleGuildUpdate(data: any) {
    // Handle guild-related updates
    console.log('🏰 Guild update:', data);
  }

  private handleTerritoryUpdate(data: any) {
    // Handle territory control changes
    console.log('🗺️ Territory update:', data);
  }

  private calculateDistance(pos1: [number, number, number], pos2: [number, number, number]): number {
    const dx = pos1[0] - pos2[0];
    const dy = pos1[1] - pos2[1];
    const dz = pos1[2] - pos2[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private triggerCallbacks(eventType: string, data: any) {
    const callbacks = this.callbacks.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, 2000 * this.reconnectAttempts); // Exponential backoff
    } else {
      console.log('❌ Max reconnection attempts reached. Switching to offline mode.');
    }
  }

  // Cleanup
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Character Classes Definition
export const CHARACTER_CLASSES: CharacterClass[] = [
  {
    id: 'street_samurai',
    name: 'Street Samurai',
    description: 'Cybernetic-enhanced warrior with deadly melee combat skills',
    baseStats: {
      health: 120,
      stamina: 100,
      damage: 25,
      defense: 15,
      speed: 12
    },
    skills: [
      {
        id: 'cyber_slash',
        name: 'Cyber Slash',
        description: 'Enhanced melee attack with cybernetic implants',
        level: 1,
        maxLevel: 10,
        cooldown: 3000,
        manaCost: 20,
        effect: { type: 'damage', value: 40, radius: 3 }
      },
      {
        id: 'reflex_boost',
        name: 'Reflex Boost',
        description: 'Temporarily increases movement speed and dodge chance',
        level: 1,
        maxLevel: 5,
        cooldown: 15000,
        manaCost: 30,
        effect: { type: 'buff', value: 50, duration: 8000 }
      }
    ],
    unlockLevel: 1
  },
  {
    id: 'netrunner',
    name: 'Netrunner',
    description: 'Master hacker who manipulates technology and data streams',
    baseStats: {
      health: 80,
      stamina: 120,
      damage: 15,
      defense: 8,
      speed: 10
    },
    skills: [
      {
        id: 'data_spike',
        name: 'Data Spike',
        description: 'Ranged cyber attack that damages and slows enemies',
        level: 1,
        maxLevel: 10,
        cooldown: 2000,
        manaCost: 25,
        effect: { type: 'damage', value: 30, radius: 1 }
      },
      {
        id: 'system_hack',
        name: 'System Hack',
        description: 'Disables enemy weapons and cybernetics temporarily',
        level: 1,
        maxLevel: 5,
        cooldown: 20000,
        manaCost: 40,
        effect: { type: 'debuff', value: 0, duration: 6000 }
      }
    ],
    unlockLevel: 1
  },
  {
    id: 'corpo_agent',
    name: 'Corporate Agent',
    description: 'Well-equipped operative with advanced gear and connections',
    baseStats: {
      health: 100,
      stamina: 110,
      damage: 20,
      defense: 12,
      speed: 11
    },
    skills: [
      {
        id: 'smart_weapon',
        name: 'Smart Weapon',
        description: 'Auto-targeting weapon system with increased accuracy',
        level: 1,
        maxLevel: 8,
        cooldown: 1000,
        manaCost: 15,
        effect: { type: 'damage', value: 35, radius: 1 }
      },
      {
        id: 'corpo_shield',
        name: 'Corporate Shield',
        description: 'Deploys energy shield that absorbs incoming damage',
        level: 1,
        maxLevel: 5,
        cooldown: 25000,
        manaCost: 50,
        effect: { type: 'shield', value: 100, duration: 10000 }
      }
    ],
    unlockLevel: 5
  }
];

// Export singleton instance
export const multiplayerManager = new MultiplayerManager();

// Fallback for offline mode
export const createOfflineMode = () => {
  return {
    isOnline: false,
    players: new Map(),
    sendMessage: () => {},
    updatePlayerPosition: () => {},
    getNearbyPlayers: () => [],
    on: () => {},
    off: () => {}
  };
};

