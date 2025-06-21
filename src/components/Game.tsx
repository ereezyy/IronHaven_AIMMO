import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Box, Plane, Text, Sphere, Cylinder } from '@react-three/drei';
import { useGameStore } from '../store/gameState';
import { generateNPCResponse, analyzeThreatLevel, generateDynamicMission } from '../lib/ai';
import SpriteCharacter from './SpriteCharacter';
import { WeaponSystem, weapons, Weapon } from './WeaponSystem';
import { CombatSystem, CombatEffect } from './CombatSystem';
import * as THREE from 'three';

interface NPCData {
  id: string;
  position: [number, number, number];
  type: 'civilian' | 'gangster' | 'police' | 'dealer' | 'hitman' | 'boss';
  mood: 'hostile' | 'neutral' | 'friendly' | 'terrified' | 'aggressive';
  dialogue: string;
  health: number;
  maxHealth: number;
  isDead: boolean;
  bloodLevel: number;
  lastInteraction: number;
  weapon?: string;
  bounty?: number;
  faction?: string;
  ai_behavior: 'patrol' | 'guard' | 'flee' | 'hunt' | 'idle';
  lastPosition: [number, number, number];
  alertLevel: number;
}

interface Vehicle {
  id: string;
  position: [number, number, number];
  type: 'sedan' | 'sports' | 'truck' | 'police' | 'ambulance';
  health: number;
  speed: number;
  occupied: boolean;
}

function NPC({ npc, onInteract, onKill, onDamage, playerPosition, currentWeapon }: { 
  npc: NPCData; 
  onInteract: (id: string) => void;
  onKill: (id: string, weapon: Weapon) => void;
  onDamage: (id: string, damage: number) => void;
  playerPosition: [number, number, number];
  currentWeapon: Weapon;
}) {
  const [showDialogue, setShowDialogue] = useState(false);
  const [isInRange, setIsInRange] = useState(false);
  const gameStore = useGameStore();

  // Calculate distance to player
  useEffect(() => {
    const distance = Math.sqrt(
      Math.pow(npc.position[0] - playerPosition[0], 2) +
      Math.pow(npc.position[2] - playerPosition[2], 2)
    );
    setIsInRange(distance < currentWeapon.range);
  }, [npc.position, playerPosition, currentWeapon.range]);

  const handleClick = () => {
    if (npc.isDead) return;
    
    onInteract(npc.id);
    setShowDialogue(true);
    setTimeout(() => setShowDialogue(false), 3000);
  };

  const handleAttack = () => {
    if (npc.isDead || !isInRange) return;
    
    const damage = currentWeapon.damage + Math.random() * 20 - 10;
    
    if (npc.health - damage <= 0) {
      onKill(npc.id, currentWeapon);
      
      // Reputation and wanted level changes based on target type
      let repGain = 0;
      let wantedIncrease = 0;
      
      switch (npc.type) {
        case 'police':
          repGain = 25;
          wantedIncrease = 2;
          break;
        case 'gangster':
          repGain = 15;
          wantedIncrease = 1;
          break;
        case 'boss':
          repGain = 50;
          wantedIncrease = 3;
          break;
        case 'civilian':
          repGain = -10; // Lose reputation for killing innocents
          wantedIncrease = 2;
          break;
        case 'dealer':
          repGain = 20;
          wantedIncrease = 1;
          break;
        case 'hitman':
          repGain = 30;
          wantedIncrease = 1;
          break;
      }
      
      gameStore.addAction(`executed_${npc.type}_with_${currentWeapon.name}`);
      gameStore.updateStats({ 
        reputation: Math.max(0, gameStore.playerStats.reputation + repGain),
        wanted: Math.min(gameStore.playerStats.wanted + wantedIncrease, 5),
        money: gameStore.playerStats.money + (npc.bounty || 100)
      });
    } else {
      onDamage(npc.id, damage);
      gameStore.addAction(`attacked_${npc.type}`);
    }
  };

  const getHealthBarColor = () => {
    const healthPercent = npc.health / npc.maxHealth;
    if (healthPercent > 0.6) return '#00FF00';
    if (healthPercent > 0.3) return '#FFFF00';
    return '#FF0000';
  };

  return (
    <group>
      <SpriteCharacter
        position={npc.position}
        type={npc.isDead ? 'corpse' : npc.type}
        mood={npc.isDead ? 'dead' : npc.mood}
        onClick={handleClick}
        onHover={() => setShowDialogue(true)}
        bloodLevel={npc.bloodLevel}
        weapon={npc.weapon}
      />
      
      {/* Health bar for living NPCs */}
      {!npc.isDead && npc.health < npc.maxHealth && (
        <group position={[npc.position[0], npc.position[1] + 3.5, npc.position[2]]}>
          <Plane args={[2, 0.2]} position={[0, 0, 0]}>
            <meshBasicMaterial color="#333333" />
          </Plane>
          <Plane 
            args={[(npc.health / npc.maxHealth) * 2, 0.15]} 
            position={[-(1 - npc.health / npc.maxHealth), 0, 0.01]}
          >
            <meshBasicMaterial color={getHealthBarColor()} />
          </Plane>
        </group>
      )}
      
      {showDialogue && !npc.isDead && npc.dialogue && (
        <Text
          position={[npc.position[0], npc.position[1] + 4, npc.position[2]]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
          maxWidth={4}
          textAlign="center"
        >
          {npc.dialogue}
        </Text>
      )}
      
      {/* Attack indicator when in range */}
      {!npc.isDead && isInRange && (
        <Sphere
          position={[npc.position[0], npc.position[1] + 2.8, npc.position[2]]}
          scale={[0.2, 0.2, 0.2]}
          onClick={handleAttack}
        >
          <meshBasicMaterial color="#ff0000" transparent opacity={0.8} />
        </Sphere>
      )}
      
      {/* Bounty indicator for high-value targets */}
      {npc.bounty && npc.bounty > 500 && !npc.isDead && (
        <Text
          position={[npc.position[0], npc.position[1] + 3.2, npc.position[2]]}
          fontSize={0.2}
          color="#FFD700"
          anchorX="center"
          anchorY="middle"
        >
          ${npc.bounty}
        </Text>
      )}
    </group>
  );
}

function Vehicle({ vehicle, onSteal }: { vehicle: Vehicle; onSteal: (id: string) => void }) {
  const getVehicleColor = () => {
    switch (vehicle.type) {
      case 'police': return '#0066CC';
      case 'ambulance': return '#FFFFFF';
      case 'sports': return '#FF0000';
      case 'truck': return '#8B4513';
      default: return '#333333';
    }
  };

  return (
    <group position={vehicle.position} onClick={() => onSteal(vehicle.id)}>
      <Box scale={[4, 1.5, 2]}>
        <meshStandardMaterial color={getVehicleColor()} />
      </Box>
      {/* Wheels */}
      <Cylinder position={[-1.5, -0.5, 0.8]} rotation={[Math.PI/2, 0, 0]} scale={[0.4, 0.2, 0.4]}>
        <meshStandardMaterial color="#000000" />
      </Cylinder>
      <Cylinder position={[1.5, -0.5, 0.8]} rotation={[Math.PI/2, 0, 0]} scale={[0.4, 0.2, 0.4]}>
        <meshStandardMaterial color="#000000" />
      </Cylinder>
      <Cylinder position={[-1.5, -0.5, -0.8]} rotation={[Math.PI/2, 0, 0]} scale={[0.4, 0.2, 0.4]}>
        <meshStandardMaterial color="#000000" />
      </Cylinder>
      <Cylinder position={[1.5, -0.5, -0.8]} rotation={[Math.PI/2, 0, 0]} scale={[0.4, 0.2, 0.4]}>
        <meshStandardMaterial color="#000000" />
      </Cylinder>
    </group>
  );
}

function Player() {
  const gameStore = useGameStore();
  const [position, setPosition] = useState<[number, number, number]>([0, 1, 0]);
  const [velocity, setVelocity] = useState<[number, number, number]>([0, 0, 0]);
  const [keys, setKeys] = useState<{[key: string]: boolean}>({});
  const [bloodLevel, setBloodLevel] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [currentWeapon, setCurrentWeapon] = useState<Weapon>(weapons[0]);
  const [combatEffects, setCombatEffects] = useState<CombatEffect[]>([]);
  const [isInVehicle, setIsInVehicle] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(null);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      setKeys(prev => ({ ...prev, [key]: true }));
      
      // Weapon switching
      const weaponIndex = parseInt(key) - 1;
      if (weaponIndex >= 0 && weaponIndex < weapons.length) {
        setCurrentWeapon(weapons[weaponIndex]);
      }
      
      // Exit vehicle
      if (key === 'f' && isInVehicle) {
        setIsInVehicle(false);
        setCurrentVehicle(null);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [event.key.toLowerCase()]: false }));
    };

    const handleMouseClick = (event: MouseEvent) => {
      if (event.button === 0) { // Left click
        fireWeapon();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseClick);
    };
  }, [currentWeapon]);

  const fireWeapon = () => {
    if (currentWeapon.ammo === 0) return;
    
    // Create muzzle flash effect
    const effectId = `muzzle_${Date.now()}`;
    setCombatEffects(prev => [...prev, {
      id: effectId,
      position: [position[0], position[1] + 1, position[2]],
      type: 'muzzle_flash',
      duration: 100,
      startTime: Date.now()
    }]);
    
    // Decrease ammo
    if (currentWeapon.ammo > 0) {
      currentWeapon.ammo--;
    }
    
    gameStore.addAction(`fired_${currentWeapon.name}`);
  };

  const addCombatEffect = (type: CombatEffect['type'], pos: [number, number, number]) => {
    const effectId = `effect_${Date.now()}_${Math.random()}`;
    setCombatEffects(prev => [...prev, {
      id: effectId,
      position: pos,
      type,
      duration: type === 'blood_splatter' ? 10000 : 500,
      startTime: Date.now()
    }]);
  };

  const removeCombatEffect = (id: string) => {
    setCombatEffects(prev => prev.filter(effect => effect.id !== id));
  };

  useFrame((state, delta) => {
    // Movement speed
    const speed = isInVehicle ? 25 : 15;
    let newVelocity: [number, number, number] = [0, 0, 0];

    // WASD movement
    if (keys['w']) newVelocity[2] -= speed;
    if (keys['s']) newVelocity[2] += speed;
    if (keys['a']) newVelocity[0] -= speed;
    if (keys['d']) newVelocity[0] += speed;

    // Apply movement
    const newPosition: [number, number, number] = [
      position[0] + newVelocity[0] * delta,
      position[1],
      position[2] + newVelocity[2] * delta
    ];

    // Boundary constraints
    newPosition[0] = Math.max(-45, Math.min(45, newPosition[0]));
    newPosition[2] = Math.max(-45, Math.min(45, newPosition[2]));

    setPosition(newPosition);
    setVelocity(newVelocity);
    setIsMoving(newVelocity[0] !== 0 || newVelocity[2] !== 0);

    if (isMoving) {
      gameStore.addAction('player_moved');
    }

    // Update threat level periodically
    if (Math.floor(state.clock.elapsedTime) % 3 === 0) {
      const checkThreat = async () => {
        const threat = await analyzeThreatLevel(newPosition, []);
        if (threat.level > 0.7) {
          gameStore.addAction('detected_high_threat');
          gameStore.updateStats({ wanted: Math.min(gameStore.playerStats.wanted + 1, 5) });
        }
      };
      checkThreat();
    }
  });

  // Increase blood level based on recent violent actions
  useEffect(() => {
    const violentActions = gameStore.recentActions.filter(action => 
      action.includes('killed') || action.includes('executed') || action.includes('attacked')
    ).length;
    setBloodLevel(Math.min(violentActions * 0.15, 1));
  }, [gameStore.recentActions]);

  return (
    <>
      <SpriteCharacter
        position={position}
        type="player"
        bloodLevel={bloodLevel}
        scale={1.2}
        weapon={currentWeapon.id}
      />
      
      <WeaponSystem 
        currentWeapon={currentWeapon}
        onWeaponChange={setCurrentWeapon}
      />
      
      <CombatSystem 
        effects={combatEffects}
        onEffectComplete={removeCombatEffect}
      />
    </>
  );
}

function City() {
  const [npcs, setNpcs] = useState<NPCData[]>(() => 
    Array.from({ length: 30 }).map((_, i) => {
      const types = ['civilian', 'gangster', 'police', 'dealer', 'hitman', 'boss'];
      const type = types[Math.floor(Math.random() * types.length)] as NPCData['type'];
      
      return {
        id: i.toString(),
        position: [
          Math.random() * 80 - 40,
          1,
          Math.random() * 80 - 40
        ] as [number, number, number],
        type,
        mood: 'neutral' as const,
        dialogue: '',
        health: type === 'boss' ? 200 : type === 'hitman' ? 150 : 100,
        maxHealth: type === 'boss' ? 200 : type === 'hitman' ? 150 : 100,
        isDead: false,
        bloodLevel: 0,
        lastInteraction: 0,
        weapon: type === 'police' ? 'pistol' : type === 'gangster' ? 'knife' : undefined,
        bounty: type === 'boss' ? 5000 : type === 'hitman' ? 2000 : type === 'dealer' ? 1000 : undefined,
        faction: type === 'gangster' ? 'falcone' : type === 'police' ? 'police' : undefined,
        ai_behavior: 'idle',
        lastPosition: [0, 0, 0] as [number, number, number],
        alertLevel: 0
      };
    })
  );

  const [vehicles, setVehicles] = useState<Vehicle[]>(() =>
    Array.from({ length: 15 }).map((_, i) => {
      const types = ['sedan', 'sports', 'truck', 'police', 'ambulance'];
      return {
        id: `vehicle_${i}`,
        position: [
          Math.random() * 70 - 35,
          0.5,
          Math.random() * 70 - 35
        ] as [number, number, number],
        type: types[Math.floor(Math.random() * types.length)] as Vehicle['type'],
        health: 100,
        speed: Math.random() * 50 + 30,
        occupied: false
      };
    })
  );

  const [corpses, setCorpses] = useState<Array<{
    id: string;
    position: [number, number, number];
    type: string;
    weapon: string;
  }>>([]);

  const [playerPosition, setPlayerPosition] = useState<[number, number, number]>([0, 1, 0]);
  const [currentWeapon, setCurrentWeapon] = useState<Weapon>(weapons[0]);

  const gameStore = useGameStore();

  // Update NPC behavior based on player actions
  useEffect(() => {
    const updateNPCs = async () => {
      const updatedNPCs = await Promise.all(
        npcs.map(async (npc) => {
          if (npc.isDead) return npc;
          
          const response = await generateNPCResponse(
            gameStore.playerStats.reputation,
            gameStore.recentActions,
            `NPC Type: ${npc.type}, Position: ${npc.position.join(', ')}, Faction: ${npc.faction || 'none'}`
          );
          
          return {
            ...npc,
            dialogue: response.dialogue,
            mood: response.mood as NPCData['mood'],
            lastInteraction: Date.now()
          };
        })
      );
      setNpcs(updatedNPCs);
    };

    updateNPCs();
  }, [gameStore.playerStats.reputation, gameStore.recentActions]);

  const handleNPCInteract = (id: string) => {
    gameStore.addAction(`talked_to_npc_${id}`);
  };

  const handleNPCKill = (id: string, weapon: Weapon) => {
    setNpcs(prev => prev.map(npc => 
      npc.id === id 
        ? { ...npc, isDead: true, health: 0, bloodLevel: 1, mood: 'dead' as const }
        : npc
    ));
    
    // Add corpse to scene
    const killedNPC = npcs.find(npc => npc.id === id);
    if (killedNPC) {
      setCorpses(prev => [...prev, {
        id: `corpse_${id}`,
        position: killedNPC.position,
        type: killedNPC.type,
        weapon: weapon.name
      }]);
    }
  };

  const handleNPCDamage = (id: string, damage: number) => {
    setNpcs(prev => prev.map(npc => 
      npc.id === id 
        ? { 
            ...npc, 
            health: Math.max(0, npc.health - damage),
            bloodLevel: Math.min(npc.bloodLevel + 0.2, 1),
            mood: 'hostile' as const
          }
        : npc
    ));
  };

  const handleVehicleSteal = (id: string) => {
    const vehicle = vehicles.find(v => v.id === id);
    if (vehicle && !vehicle.occupied) {
      gameStore.addAction(`stole_${vehicle.type}`);
      gameStore.updateStats({ 
        wanted: Math.min(gameStore.playerStats.wanted + (vehicle.type === 'police' ? 2 : 1), 5)
      });
      
      setVehicles(prev => prev.map(v => 
        v.id === id ? { ...v, occupied: true } : v
      ));
    }
  };

  return (
    <>
      {/* Ground with improved textures */}
      <Plane
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        args={[100, 100]}
      >
        <meshStandardMaterial 
          color="#0a0a0a" 
          roughness={0.9}
          metalness={0.1}
        />
      </Plane>
      
      {/* Blood stains on ground */}
      {corpses.map((corpse, i) => (
        <group key={`blood-${i}`}>
          <Plane
            rotation={[-Math.PI / 2, 0, 0]}
            position={[corpse.position[0], 0.01, corpse.position[2]]}
            args={[4, 4]}
          >
            <meshBasicMaterial 
              color="#4a0000" 
              transparent 
              opacity={0.8}
            />
          </Plane>
          
          {/* Blood splatter pattern */}
          {Array.from({ length: 6 }).map((_, j) => (
            <Plane
              key={j}
              rotation={[-Math.PI / 2, 0, 0]}
              position={[
                corpse.position[0] + (Math.random() - 0.5) * 6,
                0.02,
                corpse.position[2] + (Math.random() - 0.5) * 6
              ]}
              args={[Math.random() * 0.8 + 0.2, Math.random() * 0.8 + 0.2]}
            >
              <meshBasicMaterial 
                color="#8B0000" 
                transparent 
                opacity={0.6}
              />
            </Plane>
          ))}
        </group>
      ))}
      
      {/* Street grid */}
      <Plane
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        args={[100, 100]}
      >
        <meshBasicMaterial 
          color="#222222" 
          transparent 
          opacity={0.3}
          wireframe
        />
      </Plane>
      
      {/* Buildings - more detailed and atmospheric */}
      {Array.from({ length: 35 }).map((_, i) => {
        const x = (Math.random() - 0.5) * 80;
        const z = (Math.random() - 0.5) * 80;
        const height = Math.random() * 15 + 5;
        const width = Math.random() * 5 + 3;
        const depth = Math.random() * 5 + 3;
        
        return (
          <group key={`building-${i}`}>
            <Box
              position={[x, height / 2, z]}
              scale={[width, height, depth]}
            >
              <meshStandardMaterial 
                color={`hsl(${Math.random() * 30}, 15%, ${Math.random() * 12 + 8}%)`}
                roughness={0.9}
                metalness={0.1}
              />
            </Box>
            
            {/* Windows */}
            {Array.from({ length: Math.floor(height / 3) }).map((_, floor) => (
              <group key={floor}>
                {Array.from({ length: 3 }).map((_, window) => (
                  <Box
                    key={window}
                    position={[
                      x + (window - 1) * width / 4,
                      (floor + 1) * 3,
                      z + depth/2 + 0.1
                    ]}
                    scale={[0.6, 0.8, 0.1]}
                  >
                    <meshStandardMaterial 
                      color={Math.random() > 0.7 ? "#ffff88" : "#000000"} 
                      transparent
                      opacity={0.8}
                      emissive={Math.random() > 0.7 ? "#ffff44" : "#000000"}
                      emissiveIntensity={0.3}
                    />
                  </Box>
                ))}
              </group>
            ))}
            
            {/* Rooftop details */}
            {Math.random() > 0.5 && (
              <Box
                position={[x, height + 0.5, z]}
                scale={[1, 1, 1]}
              >
                <meshStandardMaterial color="#333333" />
              </Box>
            )}
            
            {/* Neon signs */}
            {Math.random() > 0.8 && (
              <Box
                position={[x, height * 0.8, z + depth/2 + 0.2]}
                scale={[width * 0.8, 0.5, 0.1]}
              >
                <meshStandardMaterial 
                  color="#ff0066" 
                  emissive="#ff0066"
                  emissiveIntensity={1.5}
                />
              </Box>
            )}
          </group>
        );
      })}

      {/* Street props */}
      {Array.from({ length: 40 }).map((_, i) => {
        const x = (Math.random() - 0.5) * 90;
        const z = (Math.random() - 0.5) * 90;
        const propType = Math.random();
        
        if (propType < 0.3) {
          // Trash cans
          return (
            <Cylinder
              key={`prop-${i}`}
              position={[x, 0.5, z]}
              scale={[0.4, 1, 0.4]}
            >
              <meshStandardMaterial color="#2d2d2d" />
            </Cylinder>
          );
        } else if (propType < 0.6) {
          // Street lights
          return (
            <group key={`prop-${i}`}>
              <Cylinder position={[x, 2.5, z]} scale={[0.1, 5, 0.1]}>
                <meshStandardMaterial color="#444444" />
              </Cylinder>
              <Sphere position={[x, 4.5, z]} scale={[0.3, 0.3, 0.3]}>
                <meshStandardMaterial 
                  color="#ffff88" 
                  emissive="#ffff44"
                  emissiveIntensity={0.8}
                />
              </Sphere>
            </group>
          );
        } else {
          // Debris
          return (
            <Box
              key={`prop-${i}`}
              position={[x, 0.2, z]}
              scale={[Math.random() * 0.8 + 0.2, 0.4, Math.random() * 0.8 + 0.2]}
              rotation={[0, Math.random() * Math.PI, 0]}
            >
              <meshStandardMaterial color="#1a1a1a" />
            </Box>
          );
        }
      })}

      {/* Vehicles */}
      {vehicles.filter(v => !v.occupied).map((vehicle) => (
        <Vehicle 
          key={vehicle.id} 
          vehicle={vehicle} 
          onSteal={handleVehicleSteal}
        />
      ))}

      {/* NPCs */}
      {npcs.map((npc) => (
        <NPC 
          key={`npc-${npc.id}`} 
          npc={npc} 
          onInteract={handleNPCInteract}
          onKill={handleNPCKill}
          onDamage={handleNPCDamage}
          playerPosition={playerPosition}
          currentWeapon={currentWeapon}
        />
      ))}

      {/* Corpses with detailed death scenes */}
      {corpses.map((corpse) => (
        <group key={corpse.id}>
          <SpriteCharacter
            position={corpse.position}
            type="corpse"
            mood="dead"
          />
          
          {/* Crime scene tape for high-profile kills */}
          {corpse.type === 'police' || corpse.type === 'boss' && (
            <Box
              position={[corpse.position[0], 0.1, corpse.position[2]]}
              scale={[6, 0.1, 6]}
            >
              <meshBasicMaterial 
                color="#ffff00" 
                transparent 
                opacity={0.3}
                wireframe
              />
            </Box>
          )}
        </group>
      ))}
    </>
  );
}

function CameraController() {
  const { camera } = useThree();
  
  useFrame(() => {
    // Dynamic camera following with cinematic angles
    const targetPosition = new THREE.Vector3(20, 25, 20);
    camera.position.lerp(targetPosition, 0.02);
    camera.lookAt(0, 0, 0);
  });
  
  return null;
}

function MissionPanel() {
  const gameStore = useGameStore();
  const [loading, setLoading] = useState(false);

  const missions = [
    {
      type: "assassination",
      target: "Rival Gang Lieutenant",
      location: "Industrial District",
      reward: 5000,
      description: "Take out the target. Make it look like an accident."
    },
    {
      type: "heist",
      target: "First National Bank",
      location: "Downtown",
      reward: 15000,
      description: "In and out. No witnesses."
    },
    {
      type: "protection",
      target: "Local Business Owner",
      location: "Little Italy",
      reward: 2500,
      description: "Keep them breathing. Eliminate threats."
    },
    {
      type: "territory_war",
      target: "Rival Gang Hideout",
      location: "Harbor District",
      reward: 8000,
      description: "Send a message. Leave no survivors."
    }
  ];

  const startNewMission = () => {
    setLoading(true);
    setTimeout(() => {
      const mission = missions[Math.floor(Math.random() * missions.length)];
      gameStore.setActiveMission(mission);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="absolute top-20 right-4 p-6 bg-black/95 text-white rounded-lg border border-red-500/50 backdrop-blur-sm shadow-2xl max-w-sm">
      {gameStore.activeMission ? (
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-red-400 border-b border-red-500/30 pb-2">ACTIVE CONTRACT</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-400">Type:</span> <span className="text-white font-semibold uppercase">{gameStore.activeMission.type}</span></p>
            <p><span className="text-gray-400">Target:</span> <span className="text-white">{gameStore.activeMission.target}</span></p>
            <p><span className="text-gray-400">Location:</span> <span className="text-white">{gameStore.activeMission.location}</span></p>
            <p><span className="text-gray-400">Blood Money:</span> <span className="text-green-400 font-bold">${gameStore.activeMission.reward?.toLocaleString()}</span></p>
          </div>
          
          {gameStore.activeMission.description && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded">
              <p className="text-xs text-red-300 italic">"{gameStore.activeMission.description}"</p>
            </div>
          )}
          
          <button
            className="w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition-colors text-sm font-medium"
            onClick={() => gameStore.setActiveMission(null)}
          >
            ABANDON CONTRACT
          </button>
        </div>
      ) : (
        <div className="text-center">
          <h3 className="text-lg font-bold text-red-400 mb-4">NO ACTIVE CONTRACT</h3>
          <p className="text-gray-400 text-sm mb-4">The streets are calling for blood...</p>
          <button
            className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg transition-colors font-medium border border-red-500 w-full"
            onClick={startNewMission}
            disabled={loading}
          >
            {loading ? 'FINDING WORK...' : 'GET NEW CONTRACT'}
          </button>
        </div>
      )}
    </div>
  );
}

function HUD() {
  const gameStore = useGameStore();
  
  const getReputationLabel = (rep: number) => {
    if (rep < 15) return "NOBODY";
    if (rep < 30) return "STREET THUG";
    if (rep < 50) return "ENFORCER";
    if (rep < 70) return "LIEUTENANT";
    if (rep < 90) return "UNDERBOSS";
    return "KINGPIN";
  };

  const killCount = gameStore.recentActions.filter(action => 
    action.includes('killed') || action.includes('executed')
  ).length;
  
  return (
    <div className="absolute top-4 left-4 space-y-4">
      {/* Player Stats */}
      <div className="p-4 bg-black/95 text-white rounded-lg border border-red-500/50 backdrop-blur-sm shadow-2xl">
        <h3 className="text-lg font-bold text-red-400 mb-3 border-b border-red-500/30 pb-1">DANNY'S STATUS</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Health:</span>
            <div className="flex items-center">
              <div className="w-20 h-2 bg-gray-700 rounded-full mr-2 border border-gray-600">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-green-500 rounded-full transition-all"
                  style={{ width: `${gameStore.playerStats.health}%` }}
                ></div>
              </div>
              <span className="text-white font-bold">{gameStore.playerStats.health}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Reputation:</span>
            <div className="text-right">
              <div className="flex items-center">
                <div className="w-20 h-2 bg-gray-700 rounded-full mr-2 border border-gray-600">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-600 to-red-500 rounded-full transition-all"
                    style={{ width: `${gameStore.playerStats.reputation}%` }}
                  ></div>
                </div>
                <span className="text-white font-bold">{gameStore.playerStats.reputation}</span>
              </div>
              <span className="text-xs text-yellow-400">{getReputationLabel(gameStore.playerStats.reputation)}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Heat Level:</span>
            <span className="text-red-400 font-bold">
              {'★'.repeat(gameStore.playerStats.wanted)}
              {'☆'.repeat(5 - gameStore.playerStats.wanted)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Blood Money:</span>
            <span className="text-green-400 font-bold">${gameStore.playerStats.money.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400">Body Count:</span>
            <span className="text-red-500 font-bold">{killCount}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 bg-black/95 text-white rounded-lg border border-blue-500/50 backdrop-blur-sm shadow-2xl">
        <h3 className="text-lg font-bold text-blue-400 mb-3 border-b border-blue-500/30 pb-1">CONTROLS</h3>
        <div className="space-y-1 text-xs">
          <p><span className="text-blue-400 font-bold">WASD:</span> Move Danny</p>
          <p><span className="text-blue-400 font-bold">1-6:</span> Switch weapons</p>
          <p><span className="text-blue-400 font-bold">Click:</span> Fire weapon</p>
          <p><span className="text-blue-400 font-bold">F:</span> Interact/Steal car</p>
          <p><span className="text-blue-400 font-bold">Mouse:</span> Look around</p>
        </div>
      </div>

      {/* Violence Warning */}
      <div className="p-3 bg-red-900/50 text-white rounded-lg border border-red-500/70 backdrop-blur-sm">
        <div className="flex items-center text-xs">
          <span className="text-red-500 font-bold mr-2">⚠</span>
          <span className="text-red-300">EXTREME VIOLENCE - MATURE CONTENT</span>
        </div>
      </div>
    </div>
  );
}

const Game: React.FC = () => {
  return (
    <div className="w-full h-screen relative bg-gradient-to-b from-red-900/20 to-black">
      <Canvas 
        camera={{ position: [20, 25, 20], fov: 75 }}
        shadows
      >
        {/* Dramatic lighting setup */}
        <ambientLight intensity={0.15} color="#2a0a0a" />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={0.5} 
          color="#ffffff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        {/* Multiple colored lights for atmosphere */}
        <pointLight position={[0, 15, 0]} intensity={0.8} color="#ff1122" distance={50} />
        <pointLight position={[-30, 8, -30]} intensity={0.6} color="#ff4444" distance={40} />
        <pointLight position={[30, 8, 30]} intensity={0.6} color="#ff4444" distance={40} />
        <pointLight position={[0, 5, -40]} intensity={0.4} color="#0066ff" distance={30} />
        
        {/* Heavy atmospheric fog */}
        <fog attach="fog" args={['#0a0000', 25, 100]} />
        
        <Player />
        <City />
        <CameraController />
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxDistance={80}
          minDistance={10}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
      
      <HUD />
      <MissionPanel />
      
      {/* Enhanced Game Title Overlay */}
      <div className="absolute bottom-4 left-4 text-white">
        <h1 className="text-4xl font-bold text-red-500 tracking-wider drop-shadow-lg">IRONHAVEN</h1>
        <p className="text-sm text-gray-300 drop-shadow">Blood. Money. Power. Survival.</p>
        <p className="text-xs text-red-400 mt-1">No Mercy. No Witnesses. No Escape.</p>
        <div className="mt-2 flex space-x-2 text-xs">
          <span className="bg-red-600 px-2 py-1 rounded">BRUTAL</span>
          <span className="bg-gray-800 px-2 py-1 rounded">OPEN WORLD</span>
          <span className="bg-yellow-600 px-2 py-1 rounded">CRIME</span>
        </div>
      </div>

      {/* Atmospheric overlay with film grain effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-red-900/10 pointer-events-none"></div>
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E")`,
          mixBlendMode: 'multiply'
        }}
      ></div>
    </div>
  );
};

export default Game;
