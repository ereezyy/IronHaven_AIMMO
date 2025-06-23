import { generateNPCResponse } from './ai';

export interface WorldChunk {
  id: string;
  x: number;
  z: number;
  generated: boolean;
  buildings: Building[];
  npcs: NPCData[];
  vehicles: VehicleData[];
  props: PropData[];
  biome: 'downtown' | 'industrial' | 'residential' | 'slums' | 'warehouse';
}

export interface Building {
  id: string;
  position: [number, number, number];
  size: [number, number, number];
  type: 'residential' | 'commercial' | 'industrial' | 'office' | 'warehouse';
  color: string;
  windows: boolean;
  neonSign: boolean;
}

export interface NPCData {
  id: string;
  position: [number, number, number];
  type: 'civilian' | 'gangster' | 'police' | 'dealer' | 'hitman' | 'boss';
  mood: 'hostile' | 'neutral' | 'friendly' | 'terrified' | 'aggressive';
  dialogue: string;
  health: number;
  maxHealth: number;
  isDead: boolean;
  bloodLevel: number;
  weapon?: string;
  bounty?: number;
  faction?: string;
}

export interface VehicleData {
  id: string;
  position: [number, number, number];
  type: 'sedan' | 'sports' | 'truck' | 'police' | 'ambulance';
  health: number;
  speed: number;
  occupied: boolean;
}

export interface PropData {
  id: string;
  position: [number, number, number];
  type: 'trash_can' | 'street_light' | 'debris' | 'bench' | 'fire_hydrant';
  scale: [number, number, number];
  rotation: number;
}

const CHUNK_SIZE = 50;
const RENDER_DISTANCE = 2; // Chunks around player to keep loaded

export class WorldGenerator {
  private chunks: Map<string, WorldChunk> = new Map();
  private lastPlayerPosition: [number, number, number] = [0, 0, 0];

  getChunkKey(x: number, z: number): string {
    return `${Math.floor(x / CHUNK_SIZE)}_${Math.floor(z / CHUNK_SIZE)}`;
  }

  getChunkCoords(x: number, z: number): { chunkX: number; chunkZ: number } {
    return {
      chunkX: Math.floor(x / CHUNK_SIZE),
      chunkZ: Math.floor(z / CHUNK_SIZE)
    };
  }

  getBiomeForChunk(chunkX: number, chunkZ: number): WorldChunk['biome'] {
    const distance = Math.sqrt(chunkX * chunkX + chunkZ * chunkZ);
    
    // Center is downtown
    if (distance < 1) return 'downtown';
    
    // Ring around center is commercial/residential
    if (distance < 2) return Math.random() > 0.5 ? 'residential' : 'downtown';
    
    // Further out becomes industrial and slums
    if (distance < 4) {
      const rand = Math.random();
      if (rand < 0.3) return 'industrial';
      if (rand < 0.6) return 'residential';
      if (rand < 0.8) return 'slums';
      return 'warehouse';
    }
    
    // Far out is mostly slums and industrial
    return Math.random() > 0.3 ? 'slums' : 'industrial';
  }

  generateBuildings(chunkX: number, chunkZ: number, biome: WorldChunk['biome']): Building[] {
    const buildings: Building[] = [];
    const baseX = chunkX * CHUNK_SIZE;
    const baseZ = chunkZ * CHUNK_SIZE;
    
    let buildingCount = 0;
    let minHeight = 5;
    let maxHeight = 15;
    
    switch (biome) {
      case 'downtown':
        buildingCount = 8;
        minHeight = 15;
        maxHeight = 35;
        break;
      case 'residential':
        buildingCount = 12;
        minHeight = 3;
        maxHeight = 8;
        break;
      case 'industrial':
        buildingCount = 6;
        minHeight = 8;
        maxHeight = 20;
        break;
      case 'warehouse':
        buildingCount = 4;
        minHeight = 6;
        maxHeight = 12;
        break;
      case 'slums':
        buildingCount = 15;
        minHeight = 2;
        maxHeight = 6;
        break;
    }

    for (let i = 0; i < buildingCount; i++) {
      const x = baseX + (Math.random() - 0.5) * CHUNK_SIZE * 0.8;
      const z = baseZ + (Math.random() - 0.5) * CHUNK_SIZE * 0.8;
      const height = Math.random() * (maxHeight - minHeight) + minHeight;
      const width = Math.random() * 8 + 4;
      const depth = Math.random() * 8 + 4;
      
      let buildingType: Building['type'] = 'residential';
      let color = '#4a4a4a';
      
      switch (biome) {
        case 'downtown':
          buildingType = Math.random() > 0.5 ? 'office' : 'commercial';
          color = `hsl(${Math.random() * 30}, 20%, ${Math.random() * 20 + 15}%)`;
          break;
        case 'industrial':
          buildingType = Math.random() > 0.3 ? 'industrial' : 'warehouse';
          color = `hsl(${Math.random() * 30}, 15%, ${Math.random() * 15 + 8}%)`;
          break;
        case 'warehouse':
          buildingType = 'warehouse';
          color = `hsl(${Math.random() * 30}, 10%, ${Math.random() * 12 + 6}%)`;
          break;
        case 'slums':
          buildingType = 'residential';
          color = `hsl(${Math.random() * 30}, 25%, ${Math.random() * 10 + 5}%)`;
          break;
        default:
          color = `hsl(${Math.random() * 30}, 20%, ${Math.random() * 15 + 12}%)`;
      }

      buildings.push({
        id: `building_${chunkX}_${chunkZ}_${i}`,
        position: [x, height / 2, z],
        size: [width, height, depth],
        type: buildingType,
        color,
        windows: Math.random() > 0.2,
        neonSign: biome === 'downtown' && Math.random() > 0.7
      });
    }

    return buildings;
  }

  generateNPCs(chunkX: number, chunkZ: number, biome: WorldChunk['biome']): NPCData[] {
    const npcs: NPCData[] = [];
    const baseX = chunkX * CHUNK_SIZE;
    const baseZ = chunkZ * CHUNK_SIZE;
    
    let npcCount = 0;
    let npcTypes: NPCData['type'][] = ['civilian'];
    
    switch (biome) {
      case 'downtown':
        npcCount = 8;
        npcTypes = ['civilian', 'police', 'dealer', 'gangster'];
        break;
      case 'residential':
        npcCount = 6;
        npcTypes = ['civilian', 'civilian', 'civilian', 'police'];
        break;
      case 'industrial':
        npcCount = 4;
        npcTypes = ['gangster', 'dealer', 'hitman', 'civilian'];
        break;
      case 'warehouse':
        npcCount = 3;
        npcTypes = ['gangster', 'hitman', 'boss'];
        break;
      case 'slums':
        npcCount = 10;
        npcTypes = ['civilian', 'dealer', 'gangster', 'gangster'];
        break;
    }

    for (let i = 0; i < npcCount; i++) {
      const type = npcTypes[Math.floor(Math.random() * npcTypes.length)];
      const x = baseX + (Math.random() - 0.5) * CHUNK_SIZE * 0.8;
      const z = baseZ + (Math.random() - 0.5) * CHUNK_SIZE * 0.8;
      
      const health = type === 'boss' ? 200 : type === 'hitman' ? 150 : 100;
      
      npcs.push({
        id: `npc_${chunkX}_${chunkZ}_${i}`,
        position: [x, 1, z],
        type,
        mood: 'neutral',
        dialogue: this.generateDialogueForBiome(type, biome),
        health,
        maxHealth: health,
        isDead: false,
        bloodLevel: 0,
        weapon: type === 'police' ? 'pistol' : type === 'gangster' ? 'knife' : undefined,
        bounty: type === 'boss' ? 5000 : type === 'hitman' ? 2000 : type === 'dealer' ? 1000 : undefined,
        faction: type === 'gangster' ? 'local_gang' : type === 'police' ? 'police' : undefined
      });
    }

    return npcs;
  }

  generateDialogueForBiome(npcType: NPCData['type'], biome: WorldChunk['biome']): string {
    const dialogues = {
      downtown: {
        civilian: ["This city's getting worse every day.", "I just want to get home safe.", "Too many criminals around here."],
        police: ["Keep it moving, citizen.", "This area's under patrol.", "Report any suspicious activity."],
        gangster: ["This is our territory.", "You lost, friend?", "Better watch yourself."],
        dealer: ["Looking for something special?", "I got what you need.", "Cash only, no questions."]
      },
      slums: {
        civilian: ["Life's tough out here.", "Nobody cares about us.", "Just trying to survive."],
        gangster: ["This is our block.", "You don't belong here.", "Pay up or get out."],
        dealer: ["Best prices in the city.", "No cops come here.", "What you looking for?"]
      },
      industrial: {
        gangster: ["Good place to disappear.", "Nobody hears screaming here.", "Business is business."],
        hitman: ["...", "You didn't see me.", "This conversation never happened."],
        civilian: ["I mind my own business.", "Don't see nothing, don't say nothing.", "Just here to work."]
      }
    };

    const biomeDialogues = dialogues[biome as keyof typeof dialogues];
    if (biomeDialogues && biomeDialogues[npcType as keyof typeof biomeDialogues]) {
      const options = biomeDialogues[npcType as keyof typeof biomeDialogues];
      return options[Math.floor(Math.random() * options.length)];
    }

    return "...";
  }

  generateVehicles(chunkX: number, chunkZ: number, biome: WorldChunk['biome']): VehicleData[] {
    const vehicles: VehicleData[] = [];
    const baseX = chunkX * CHUNK_SIZE;
    const baseZ = chunkZ * CHUNK_SIZE;
    
    let vehicleCount = 0;
    let vehicleTypes: VehicleData['type'][] = ['sedan'];
    
    switch (biome) {
      case 'downtown':
        vehicleCount = 4;
        vehicleTypes = ['sedan', 'sports', 'police'];
        break;
      case 'residential':
        vehicleCount = 6;
        vehicleTypes = ['sedan', 'sedan', 'truck'];
        break;
      case 'industrial':
        vehicleCount = 3;
        vehicleTypes = ['truck', 'truck', 'sedan'];
        break;
      case 'warehouse':
        vehicleCount = 2;
        vehicleTypes = ['truck', 'truck'];
        break;
      case 'slums':
        vehicleCount = 2;
        vehicleTypes = ['sedan', 'ambulance'];
        break;
    }

    for (let i = 0; i < vehicleCount; i++) {
      const type = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
      const x = baseX + (Math.random() - 0.5) * CHUNK_SIZE * 0.7;
      const z = baseZ + (Math.random() - 0.5) * CHUNK_SIZE * 0.7;
      
      vehicles.push({
        id: `vehicle_${chunkX}_${chunkZ}_${i}`,
        position: [x, 0.5, z],
        type,
        health: 100,
        speed: Math.random() * 50 + 30,
        occupied: false
      });
    }

    return vehicles;
  }

  generateProps(chunkX: number, chunkZ: number): PropData[] {
    const props: PropData[] = [];
    const baseX = chunkX * CHUNK_SIZE;
    const baseZ = chunkZ * CHUNK_SIZE;
    
    const propCount = Math.floor(Math.random() * 15) + 10;
    const propTypes: PropData['type'][] = ['trash_can', 'street_light', 'debris', 'bench', 'fire_hydrant'];

    for (let i = 0; i < propCount; i++) {
      const type = propTypes[Math.floor(Math.random() * propTypes.length)];
      const x = baseX + (Math.random() - 0.5) * CHUNK_SIZE * 0.9;
      const z = baseZ + (Math.random() - 0.5) * CHUNK_SIZE * 0.9;
      
      let scale: [number, number, number] = [1, 1, 1];
      
      switch (type) {
        case 'trash_can':
          scale = [0.4, 1, 0.4];
          break;
        case 'street_light':
          scale = [0.1, 5, 0.1];
          break;
        case 'debris':
          scale = [Math.random() * 0.8 + 0.2, 0.4, Math.random() * 0.8 + 0.2];
          break;
        case 'bench':
          scale = [2, 0.5, 0.8];
          break;
        case 'fire_hydrant':
          scale = [0.5, 1.2, 0.5];
          break;
      }

      props.push({
        id: `prop_${chunkX}_${chunkZ}_${i}`,
        position: [x, 0.5, z],
        type,
        scale,
        rotation: Math.random() * Math.PI * 2
      });
    }

    return props;
  }

  async generateChunk(chunkX: number, chunkZ: number): Promise<WorldChunk> {
    const chunkKey = `${chunkX}_${chunkZ}`;
    
    if (this.chunks.has(chunkKey)) {
      return this.chunks.get(chunkKey)!;
    }

    const biome = this.getBiomeForChunk(chunkX, chunkZ);
    
    const chunk: WorldChunk = {
      id: chunkKey,
      x: chunkX,
      z: chunkZ,
      generated: true,
      biome,
      buildings: this.generateBuildings(chunkX, chunkZ, biome),
      npcs: this.generateNPCs(chunkX, chunkZ, biome),
      vehicles: this.generateVehicles(chunkX, chunkZ, biome),
      props: this.generateProps(chunkX, chunkZ)
    };

    this.chunks.set(chunkKey, chunk);
    return chunk;
  }

  async updateWorld(playerPosition: [number, number, number]): Promise<WorldChunk[]> {
    const { chunkX: playerChunkX, chunkZ: playerChunkZ } = this.getChunkCoords(playerPosition[0], playerPosition[2]);
    
    const chunksToLoad: Promise<WorldChunk>[] = [];
    const activeChunks: WorldChunk[] = [];

    // Generate chunks around player
    for (let x = playerChunkX - RENDER_DISTANCE; x <= playerChunkX + RENDER_DISTANCE; x++) {
      for (let z = playerChunkZ - RENDER_DISTANCE; z <= playerChunkZ + RENDER_DISTANCE; z++) {
        const chunkKey = `${x}_${z}`;
        
        if (this.chunks.has(chunkKey)) {
          activeChunks.push(this.chunks.get(chunkKey)!);
        } else {
          chunksToLoad.push(this.generateChunk(x, z));
        }
      }
    }

    // Load new chunks
    const newChunks = await Promise.all(chunksToLoad);
    activeChunks.push(...newChunks);

    // Remove distant chunks for performance
    const chunksToRemove: string[] = [];
    for (const [chunkKey, chunk] of this.chunks) {
      const distance = Math.max(
        Math.abs(chunk.x - playerChunkX),
        Math.abs(chunk.z - playerChunkZ)
      );
      
      if (distance > RENDER_DISTANCE + 1) {
        chunksToRemove.push(chunkKey);
      }
    }

    chunksToRemove.forEach(key => this.chunks.delete(key));

    this.lastPlayerPosition = playerPosition;
    return activeChunks;
  }

  getActiveChunks(): WorldChunk[] {
    return Array.from(this.chunks.values());
  }
}

export const worldGenerator = new WorldGenerator();