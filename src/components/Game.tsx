import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Box, Text, OrbitControls } from '@react-three/drei';
import { useGameStore } from '../store/gameState';
import { generateNPCResponse, analyzeThreatLevel } from '../lib/ai';
import { worldGenerator, WorldChunk, Building, NPCData } from '../lib/worldGenerator';
import SpriteCharacter from './SpriteCharacter';
import { WeaponSystem, weapons, Weapon } from './WeaponSystem';
import EnhancedCombat, { CombatEffect } from './EnhancedCombat';
import SmartNPC from './SmartNPC';
import ImmersiveWorld from './ImmersiveWorld';
import VehicleSystem from './VehicleSystem';
import PoliceSystem from './PoliceSystem';
import AudioSystem from './AudioSystem';
import MissionSystem from './MissionSystem';
import CrimeSystem from './CrimeSystem';
import DynamicEvents from './DynamicEvents';
import InventorySystem from './InventorySystem';
import ParticleSystem from './ParticleSystem';
import DayNightCycle from './DayNightCycle';
import DayNightUI from './DayNightUI';
import WeatherSystem from './WeatherSystem';
import WeatherUI from './WeatherUI';
import EnhancedUI from './EnhancedUI';
import * as THREE from 'three';

// Collision detection helper
const checkCollision = (position: [number, number, number], buildings: Building[]): boolean => {
  const [x, y, z] = position;
  
  for (const building of buildings) {
    const [bx, by, bz] = building.position;
    const [width, height, depth] = building.size;
    
    const minX = bx - width / 2 - 2; // Add 2 unit buffer
    const maxX = bx + width / 2 + 2;
    const minZ = bz - depth / 2 - 2;
    const maxZ = bz + depth / 2 + 2;
    
    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
      return true; // Collision detected
    }
  }
  return false;
};

// Optimized Building Component
const OptimizedBuilding = React.memo(({ building }: { building: Building }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  return (
    <group position={building.position}>
      <Box ref={meshRef} scale={building.size}>
        <meshStandardMaterial 
          color={building.color}
          metalness={0.3}
          roughness={0.7}
        />
      </Box>
      
      {building.windows && (
        <>
          {/* Front windows */}
          <Box position={[0, 0, building.size[2] / 2 + 0.01]} scale={[building.size[0] * 0.8, building.size[1] * 0.8, 0.1]}>
            <meshBasicMaterial color="#001122" transparent opacity={0.6} />
          </Box>
          
          {/* Back windows */}
          <Box position={[0, 0, -building.size[2] / 2 - 0.01]} scale={[building.size[0] * 0.8, building.size[1] * 0.8, 0.1]}>
            <meshBasicMaterial color="#001122" transparent opacity={0.6} />
          </Box>
        </>
      )}
      
      {building.neonSign && (
        <Box position={[0, building.size[1] / 2 + 1, building.size[2] / 2 + 0.1]} scale={[building.size[0] * 0.6, 1, 0.1]}>
          <meshBasicMaterial 
            color="#ff0066" 
            emissive="#ff0066"
            emissiveIntensity={Math.sin(Date.now() * 0.005) * 0.3 + 0.7}
          />
        </Box>
      )}
    </group>
  );
});

// Optimized NPC Component
const OptimizedNPC = React.memo(({ 
  npc, 
  playerPosition, 
  onNPCClick 
}: { 
  npc: NPCData;
  playerPosition: [number, number, number];
  onNPCClick: (npc: NPCData) => void;
}) => {
  const distance = useMemo(() => {
    const dx = npc.position[0] - playerPosition[0];
    const dz = npc.position[2] - playerPosition[2];
    return Math.sqrt(dx * dx + dz * dz);
  }, [npc.position, playerPosition]);

  // Don't render NPCs that are too far away
  if (distance > 50) return null;

  return (
    <SpriteCharacter
      position={npc.position}
      type={npc.type}
      mood={npc.mood}
      bloodLevel={npc.bloodLevel}
      weapon={npc.weapon}
      onClick={() => onNPCClick(npc)}
    />
  );
});

// Player Component with collision detection
const Player: React.FC<{ 
  position: [number, number, number];
  rotation: number;
  buildings: Building[];
  onPositionChange: (pos: [number, number, number]) => void;
  onRotationChange: (rot: number) => void;
}> = ({ position, rotation, buildings, onPositionChange, onRotationChange }) => {
  const gameStore = useGameStore();
  const { camera } = useThree();
  const [keys, setKeys] = useState<{[key: string]: boolean}>({});
  const [isInVehicle, setIsInVehicle] = useState(false);
  
  const currentWeapon = gameStore.getCurrentWeapon();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [event.key.toLowerCase()]: true }));
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [event.key.toLowerCase()]: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (isInVehicle) return; // Don't move player if in vehicle

    let newPosition = [...position] as [number, number, number];
    let newRotation = rotation;
    const moveSpeed = 12;
    const rotateSpeed = 3;

    // Handle rotation first
    if (keys['a'] || keys['arrowleft']) {
      newRotation -= rotateSpeed * delta;
    }
    if (keys['d'] || keys['arrowright']) {
      newRotation += rotateSpeed * delta;
    }

    // Calculate movement direction based on rotation
    let moveX = 0;
    let moveZ = 0;

    if (keys['w'] || keys['arrowup']) {
      moveX = Math.sin(newRotation) * moveSpeed * delta;
      moveZ = Math.cos(newRotation) * moveSpeed * delta;
    }
    if (keys['s'] || keys['arrowdown']) {
      moveX = -Math.sin(newRotation) * moveSpeed * delta * 0.5;
      moveZ = -Math.cos(newRotation) * moveSpeed * delta * 0.5;
    }

    // Check collision before moving
    const testPosition: [number, number, number] = [
      newPosition[0] + moveX,
      newPosition[1],
      newPosition[2] + moveZ
    ];

    if (!checkCollision(testPosition, buildings)) {
      newPosition[0] += moveX;
      newPosition[2] += moveZ;
    }

    // Update camera to follow player with offset
    const cameraDistance = 15;
    const cameraHeight = 12;
    const cameraX = newPosition[0] - Math.sin(newRotation) * cameraDistance;
    const cameraZ = newPosition[2] - Math.cos(newRotation) * cameraDistance;
    
    camera.position.set(cameraX, newPosition[1] + cameraHeight, cameraZ);
    camera.lookAt(newPosition[0], newPosition[1], newPosition[2]);

    // Update positions if they changed
    if (newPosition[0] !== position[0] || newPosition[2] !== position[2]) {
      onPositionChange(newPosition);
    }
    if (newRotation !== rotation) {
      onRotationChange(newRotation);
    }

    // Update game store position
    gameStore.setPlayerPosition(newPosition);
  });

  return (
    <SpriteCharacter
      position={position}
      type="player"
      weapon={currentWeapon.id}
      rotation={rotation}
    />
  );
};

// Main Game Component
const Game: React.FC = () => {
  const gameStore = useGameStore();
  const [playerPosition, setPlayerPosition] = useState<[number, number, number]>([0, 1, 0]);
  const [rotation, setRotation] = useState(0);
  const [worldChunks, setWorldChunks] = useState<WorldChunk[]>([]);
  const [combatEffects, setCombatEffects] = useState<CombatEffect[]>([]);
  const [selectedNPC, setSelectedNPC] = useState<NPCData | null>(null);
  const [threatLevel, setThreatLevel] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [frameRate, setFrameRate] = useState(60);
  const [explosions, setExplosions] = useState<Array<{id: string, position: [number, number, number], intensity: number}>>([]);
  const [bloodPools, setBloodPools] = useState<Array<{id: string, position: [number, number, number], size: number}>>([]);
  const [screenEffects, setScreenEffects] = useState<{
    shake: number;
    flash: number;
    slowMotion: boolean;
    redTint: number;
  }>({ shake: 0, flash: 0, slowMotion: false, redTint: 0 });
  const [killStreak, setKillStreak] = useState(0);
  const [lastKillTime, setLastKillTime] = useState(0);
  
  // Performance monitoring
  useEffect(() => {
    let frameCount = 0;
    let startTime = performance.now();
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      if (currentTime - startTime >= 1000) {
        setFrameRate(Math.round((frameCount * 1000) / (currentTime - startTime)));
        frameCount = 0;
        startTime = currentTime;
      }
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }, []);
  const [missionActive, setMissionActive] = useState(false);
  const [particleEffects, setParticleEffects] = useState<any[]>([]);

  // Kill streak tracking
  useEffect(() => {
    const now = Date.now();
    if (now - lastKillTime > 10000) { // Reset after 10 seconds
      setKillStreak(0);
    }
  }, [lastKillTime]);

  // Add state for UI updates
  const [dayNightData, setDayNightData] = useState({ currentTime: 12, isNight: false });
  const [currentWeather, setCurrentWeather] = useState<'clear' | 'rain' | 'fog' | 'storm'>('clear');

  // Memoize buildings for collision detection
  const allBuildings = useMemo(() => {
    return worldChunks.flatMap(chunk => chunk.buildings);
  }, [worldChunks]);

  // Get all NPCs for smart AI system
  const allNPCs = useMemo(() => {
    return worldChunks.flatMap(chunk => chunk.npcs);
  }, [worldChunks]);

  // Update world chunks periodically, not every frame
  useEffect(() => {
    const updateWorld = async () => {
      const now = Date.now();
      if (now - lastUpdate < 1000) return; // Update max once per second
      
      try {
        const chunks = await worldGenerator.updateWorld(playerPosition);
        setWorldChunks(chunks);
        setLastUpdate(now);
      } catch (error) {
        console.error('Error updating world:', error);
      }
    };

    updateWorld();
  }, [playerPosition, lastUpdate]);

  // Analyze threat level periodically
  useEffect(() => {
    const analyzeThreat = async () => {
      try {
        const analysis = await analyzeThreatLevel(playerPosition, allNPCs);
        setThreatLevel(analysis.level);
      } catch (error) {
        console.error('Error analyzing threat:', error);
      }
    };

    const interval = setInterval(analyzeThreat, 3000);
    return () => clearInterval(interval);
  }, [playerPosition, allNPCs]);

  const handleNPCClick = useCallback(async (npc: NPCData) => {
    try {
      const response = await generateNPCResponse(
        gameStore.playerStats.reputation,
        gameStore.recentActions,
        `Player approached ${npc.type} in ${worldChunks[0]?.biome || 'unknown'} area`
      );
      
      setSelectedNPC({
        ...npc,
        dialogue: response.dialogue,
        mood: response.mood
      });

      // Auto-hide dialogue after 3 seconds
      setTimeout(() => setSelectedNPC(null), 3000);
    } catch (error) {
      console.error('Error generating NPC response:', error);
      setSelectedNPC({
        ...npc,
        dialogue: "...",
        mood: 'neutral'
      });
      setTimeout(() => setSelectedNPC(null), 2000);
    }
  }, [gameStore.playerStats.reputation, gameStore.recentActions, worldChunks]);

  const handleCombatEffectComplete = useCallback((id: string) => {
    setCombatEffects(prev => prev.filter(effect => effect.id !== id));
  }, []);

  const handlePlayerEnterVehicle = useCallback((vehicleId: string) => {
    gameStore.addAction(`entered_vehicle_${vehicleId}`);
  }, [gameStore]);

  const handlePlayerExitVehicle = useCallback(() => {
    gameStore.addAction('exited_vehicle');
  }, [gameStore]);

  const handlePoliceKilled = useCallback((policeId: string) => {
    gameStore.incrementPoliceKillCount();
    gameStore.addAction(`killed_police_${policeId}`);
    
    // Increase kill streak
    setKillStreak(prev => prev + 1);
    setLastKillTime(Date.now());
    
    // Massive reputation gain for police kills
    gameStore.updateStats({ 
      reputation: gameStore.playerStats.reputation + 15,
      wanted: Math.min(gameStore.playerStats.wanted + 1, 5)
    });
    
    // Add multiple effects for police kills
    const bloodEffect: CombatEffect = {
      id: `police_blood_${Date.now()}`,
      position: playerPosition,
      type: 'death_burst',
      intensity: 1,
      duration: 3000,
      startTime: Date.now()
    };
    
    const explosionEffect = {
      id: `police_explosion_${Date.now()}`,
      position: playerPosition,
      intensity: 0.8
    };
    
    setCombatEffects(prev => [...prev, bloodEffect]);
    setExplosions(prev => [...prev, explosionEffect]);
    setBloodPools(prev => [...prev, {
      id: `blood_pool_${Date.now()}`,
      position: playerPosition,
      size: 2 + Math.random()
    }]);
    
    // Screen shake effect for dramatic impact
    setScreenEffects(prev => ({ ...prev, shake: 1, flash: 0.8, redTint: 0.3 }));
    setTimeout(() => {
      setScreenEffects(prev => ({ ...prev, shake: 0, flash: 0, redTint: 0 }));
    }, 800);
    
    // Slow motion for dramatic effect
    setScreenEffects(prev => ({ ...prev, slowMotion: true }));
    setTimeout(() => {
      setScreenEffects(prev => ({ ...prev, slowMotion: false }));
    }, 1000);
  }, [gameStore, playerPosition]);

  const handleMissionUpdate = useCallback((mission: any) => {
    setMissionActive(!mission.completed && !mission.failed);
  }, []);

  const handleCrimeCommitted = useCallback((crime: any) => {
    // Add particle effects for serious crimes
    if (crime.severity > 70) {
      const effect = {
        id: `crime_particle_${Date.now()}`,
        type: crime.type === 'murder' ? 'blood_spatter' : 'impact',
        position: crime.location,
        intensity: crime.severity / 100
      };
      setParticleEffects(prev => [...prev, effect]);
    }
    
    // Add visual effects for serious crimes
    if (crime.severity > 70) {
      const effect: CombatEffect = {
        id: `crime_${Date.now()}`,
        position: crime.location,
        type: crime.type === 'murder' ? 'blood_splatter' : 'impact',
        duration: 8000,
        startTime: Date.now()
      };
      setCombatEffects(prev => [...prev, effect]);
    }
  }, []);

  const handleEventTriggered = useCallback((event: any) => {
    // Add particle effects for events
    if (event.type === 'gang_war' || event.type === 'police_raid') {
      const effect = {
        id: `event_particle_${Date.now()}`,
        type: 'explosion',
        position: event.location,
        intensity: event.severity / 100
      };
      setParticleEffects(prev => [...prev, effect]);
    }
    
    gameStore.addAction(`event_${event.type}_started`);
  }, [gameStore]);

  const handleParticleEffectComplete = useCallback((id: string) => {
    setParticleEffects(prev => prev.filter(effect => effect.id !== id));
  }, []);

  const handleTimeUpdate = useCallback((currentTime: number, isNight: boolean) => {
    setDayNightData({ currentTime, isNight });
  }, []);

  const handleWeatherUpdate = useCallback((weather: 'clear' | 'rain' | 'fog' | 'storm') => {
    setCurrentWeather(weather);
  }, []);

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <Canvas
        camera={{ position: [0, 12, 15], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#0a0a0a');
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        {/* Day/Night Cycle with Dynamic Lighting */}
        <DayNightCycle timeScale={180} onTimeUpdate={handleTimeUpdate} />
        
        {/* Weather System */}
        <WeatherSystem onWeatherUpdate={handleWeatherUpdate} />
        
        {/* Fixed lighting system */}
        <ambientLight intensity={0.4} color="#ffffff" />
        <directionalLight 
          position={[50, 50, 50]} 
          intensity={0.8} 
          color="#ffffff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={200}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />
        
        {/* Additional point lights for better visibility */}
        <pointLight position={[20, 20, 20]} intensity={0.5} color="#ffffff" distance={100} />
        <pointLight position={[-20, 20, 20]} intensity={0.5} color="#ffffff" distance={100} />
        <pointLight position={[20, 20, -20]} intensity={0.5} color="#ffffff" distance={100} />
        <pointLight position={[-20, 20, -20]} intensity={0.5} color="#ffffff" distance={100} />

        {/* Ground */}
        <mesh position={[0, -0.5, 0]} receiveShadow>
          <boxGeometry args={[1000, 1, 1000]} />
          <meshStandardMaterial 
            color="#1a1a1a" 
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
        
        {/* Render Buildings with LOD */}
        {allBuildings.map((building, index) => {
          const distance = Math.sqrt(
            Math.pow(building.position[0] - playerPosition[0], 2) +
            Math.pow(building.position[2] - playerPosition[2], 2)
          );
          
          // Only render buildings within a certain distance
          if (distance > 80) return null;
          
          return <OptimizedBuilding key={building.id} building={building} />;
        })}

        {/* Player */}
        <Player
          position={playerPosition}
          rotation={rotation}
          buildings={allBuildings}
          onPositionChange={setPlayerPosition}
          onRotationChange={setRotation}
        />

        {/* Enhanced Smart NPCs with better AI */}
        {allNPCs.slice(0, 20).map(npc => {
          const distance = Math.sqrt(
            Math.pow(npc.position[0] - playerPosition[0], 2) +
            Math.pow(npc.position[2] - playerPosition[2], 2)
          );
          
          if (distance > 60 || npc.isDead) return null;
          
          return (
            <SmartNPC
              key={npc.id}
              id={npc.id}
              position={npc.position}
              type={npc.type}
              playerPosition={playerPosition}
              onInteraction={handleNPCClick}
            />
          );
        })}
        {/* Enhanced Smart NPCs */}
        {allNPCs.slice(0, 15).map(npc => {
          const distance = Math.sqrt(
            Math.pow(npc.position[0] - playerPosition[0], 2) +
            Math.pow(npc.position[2] - playerPosition[2], 2)
          );
          
          if (distance > 50 || npc.isDead) return null;
          
          return (
          <SmartNPC
            key={npc.id}
            id={npc.id}
            position={npc.position}
            type={npc.type}
            playerPosition={playerPosition}
            onInteraction={handleNPCClick}
          />
        );
        })}

        {/* Persistent Blood Pools */}
        {bloodPools.map(pool => (
          <mesh key={pool.id} position={pool.position} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[pool.size, pool.size]} />
            <meshBasicMaterial 
              color="#4a0000" 
              transparent 
              opacity={0.8}
              depthWrite={false}
            />
          </mesh>
        ))}
        
        {/* Dynamic Explosions */}
        {explosions.map(explosion => (
          <group key={explosion.id} position={explosion.position}>
            <mesh>
              <sphereGeometry args={[explosion.intensity * 3, 16, 16]} />
              <meshBasicMaterial 
                color="#ff4500" 
                transparent 
                opacity={0.7}
                emissive="#ff4500"
                emissiveIntensity={2}
              />
            </mesh>
            <pointLight 
              color="#ff4500" 
              intensity={explosion.intensity * 5} 
              distance={20}
              decay={2}
            />
          </group>
        ))}
        {/* Vehicle System */}
        <VehicleSystem
          playerPosition={playerPosition}
          onPlayerEnterVehicle={handlePlayerEnterVehicle}
          onPlayerExitVehicle={handlePlayerExitVehicle}
        />

        {/* Police System */}
        <PoliceSystem
          playerPosition={playerPosition}
          onPoliceKilled={handlePoliceKilled}
        />

        {/* Enhanced Combat Effects */}
        <EnhancedCombat
          effects={combatEffects}
          onEffectComplete={handleCombatEffectComplete}
        />
        
        {/* Particle System for Enhanced Visual Effects */}
        <ParticleSystem
          effects={particleEffects}
          onEffectComplete={handleParticleEffectComplete}
        />

        {/* Immersive World Details */}
        <ImmersiveWorld 
          playerPosition={playerPosition}
          timeOfDay={dayNightData.currentTime}
          weather={currentWeather}
        />

        {/* Street lights for atmosphere */}
        {worldChunks.map(chunk =>
          chunk.props
            .filter(prop => prop.type === 'street_light')
            .slice(0, 5) // Limit street lights per chunk
            .map(prop => {
              const distance = Math.sqrt(
                Math.pow(prop.position[0] - playerPosition[0], 2) +
                Math.pow(prop.position[2] - playerPosition[2], 2)
              );
              
              if (distance > 50) return null;
              
              return (
                <group key={prop.id} position={prop.position}>
                  <Box scale={prop.scale}>
                    <meshStandardMaterial color="#333333" />
                  </Box>
                  <pointLight 
                    position={[0, 4, 0]} 
                    intensity={0.8} 
                    distance={15}
                    color="#ffaa00"
                  />
                </group>
              );
            })
        )}
      </Canvas>

      {/* Day/Night UI (outside Canvas) */}
      <DayNightUI 
        currentTime={dayNightData.currentTime} 
        isNight={dayNightData.isNight} 
      />

      {/* Weather UI (outside Canvas) */}
      <WeatherUI weather={currentWeather} />

      {/* UI Elements */}
      <div className="absolute top-4 left-4 p-4 bg-black/90 text-white rounded-lg border border-red-500/70 backdrop-blur-sm">
        <h2 className="text-xl font-bold text-red-400 mb-3">IRONHAVEN STATUS</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Health:</span>
            <span className={`font-bold ${gameStore.playerStats.health < 30 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
              {gameStore.playerStats.health}/100
            </span>
          </div>
          <div className="flex justify-between">
            <span>Wanted:</span>
            <span className="text-red-500 font-bold animate-bounce">
              {'★'.repeat(gameStore.playerStats.wanted)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Cash:</span>
            <span className="text-green-400 font-bold">${gameStore.playerStats.money.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Reputation:</span>
            <span className="text-yellow-400 font-bold">{gameStore.playerStats.reputation}</span>
          </div>
          <div className="flex justify-between">
            <span>Threat Level:</span>
            <span className={`font-bold ${threatLevel > 0.7 ? 'text-red-400' : threatLevel > 0.4 ? 'text-yellow-400' : 'text-green-400'}`}>
              {Math.round(threatLevel * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* NPC Dialogue */}
      {selectedNPC && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 bg-black/95 text-white rounded-lg border border-red-500/70 backdrop-blur-sm max-w-md z-40">
          <h3 className="font-bold text-red-400 mb-2 capitalize">{selectedNPC.type}</h3>
          <p className="text-gray-300 text-sm">{selectedNPC.dialogue}</p>
          <div className="mt-2 text-xs text-gray-400">
            Click elsewhere to close
          </div>
        </div>
      )}

      {/* Controls Help */}
      {/* Enhanced UI replaces basic stats display */}
      <EnhancedUI />

      {/* Performance Dashboard */}
      <div className="absolute bottom-4 right-4 p-3 glass-panel text-white rounded text-xs border border-gray-600/50">
        <div className="font-bold text-green-400 mb-1">PERFORMANCE</div>
        <div>FPS: <span className={`font-bold ${frameRate > 45 ? 'text-green-400' : frameRate > 30 ? 'text-yellow-400' : 'text-red-400'}`}>{frameRate}</span></div>
        <div>NPCs: <span className="text-blue-400">{allNPCs.filter(npc => !npc.isDead).length}</span></div>
        <div>Effects: <span className="text-purple-400">{combatEffects.length + explosions.length}</span></div>
        <div>Kills: <span className="text-red-400">{killStreak > 0 ? `${killStreak}x STREAK` : '0'}</span></div>
      </div>

      {/* Advanced Controls Help */}
      <div className="absolute bottom-44 left-4 p-3 glass-panel text-white rounded text-xs border border-gray-600/50 max-w-xs">
        <div className="font-bold text-red-400 mb-2">CONTROLS</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <span>WASD:</span><span className="text-gray-300">Move</span>
          <span>Mouse:</span><span className="text-gray-300">Look/Attack</span>
          <span>F:</span><span className="text-gray-300">Enter Vehicle</span>
          <span>1-6:</span><span className="text-gray-300">Weapons</span>
          <span>Tab:</span><span className="text-gray-300">Inventory</span>
          <span>M:</span><span className="text-gray-300">Missions</span>
        </div>
      </div>
      {/* Weapon System */}
      <WeaponSystem />

      {/* Audio System */}
      <AudioSystem enabled={true} />
      
      {/* Inventory System */}
      <InventorySystem />

      {/* Mission System */}
      <MissionSystem
        playerPosition={playerPosition}
        onMissionUpdate={handleMissionUpdate}
      />

      {/* Crime System */}
      <CrimeSystem
        playerPosition={playerPosition}
        nearbyNPCs={allNPCs.filter(npc => {
          const distance = Math.sqrt(
            Math.pow(npc.position[0] - playerPosition[0], 2) +
            Math.pow(npc.position[2] - playerPosition[2], 2)
          );
          return distance < 25;
        })}
        onCrimeCommitted={handleCrimeCommitted}
      />

      {/* Dynamic Events */}
      <DynamicEvents
        playerPosition={playerPosition}
        onEventTriggered={handleEventTriggered}
      />
      
      {/* Screen Effects Overlay */}
      {(screenEffects.shake > 0 || screenEffects.flash > 0 || screenEffects.redTint > 0) && (
        <div 
          className="absolute inset-0 pointer-events-none z-50"
          style={{
            backgroundColor: `rgba(255, 0, 0, ${screenEffects.redTint})`,
            animation: screenEffects.shake > 0 ? 'screen-shake 0.1s ease-in-out 5' : undefined,
            boxShadow: screenEffects.flash > 0 ? `inset 0 0 100px rgba(255, 255, 255, ${screenEffects.flash})` : undefined
          }}
        />
      )}
      
      {/* Kill Streak Display */}
      {killStreak > 2 && (
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
          <div className="text-6xl font-bold text-red-500 animate-pulse text-center">
            {killStreak}x KILL STREAK
          </div>
          <div className="text-xl text-white text-center mt-2 animate-bounce">
            UNSTOPPABLE!
          </div>
        </div>
      )}
    </div>
  );
};

export default Game;