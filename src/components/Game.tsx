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
      
      {/* Glowing outline for interactive NPCs */}
      {!npc.isDead && (
        <mesh position={npc.position} scale={[3.5, 4, 3.5]}>
          <cylinderGeometry args={[1, 1, 0.1, 8]} />
          <meshBasicMaterial 
            color={npc.type === 'police' ? '#0066ff' : npc.type === 'gangster' ? '#ff0066' : '#44ff44'} 
            transparent 
            opacity={0.2}
            wireframe
          />
        </mesh>
      )}
      
      {/* Health bar for living NPCs */}
      {!npc.isDead && npc.health < npc.maxHealth && (
        <group position={[npc.position[0], npc.position[1] + 3.5, npc.position[2]]}>
          <Plane args={[2, 0.2]} position={[0, 0, 0]}>
            <meshBasicMaterial color="#555555" />
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
        <mesh
          position={[npc.position[0], npc.position[1] + 2.8, npc.position[2]]}
          scale={[0.3, 0.3, 0.3]}
          onClick={handleAttack}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial 
            color="#ff0000" 
            transparent 
            opacity={0.8}
            emissive="#ff0000"
          />
        </mesh>
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
  const [position, setPosition] = useState<[number, number, number]>([0, 1.5, 0]);
  const [velocity, setVelocity] = useState<[number, number, number]>([0, 0, 0]);
  const [smoothVelocity, setSmoothVelocity] = useState<[number, number, number]>([0, 0, 0]);
  const [keys, setKeys] = useState<{[key: string]: boolean}>({});
  const [bloodLevel, setBloodLevel] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [combatEffects, setCombatEffects] = useState<CombatEffect[]>([]);
  const [isInVehicle, setIsInVehicle] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(null);
  const [rotation, setRotation] = useState(0);

  const currentWeapon = gameStore.getCurrentWeapon();

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      setKeys(prev => ({ ...prev, [key]: true }));
      
      // Weapon switching
      const weaponIndex = parseInt(key) - 1;
      if (weaponIndex >= 0 && weaponIndex < weapons.length) {
        gameStore.setCurrentWeaponId(weapons[weaponIndex].id);
      }
      
      // Exit vehicle
      if (key === 'f' && isInVehicle) {
        setIsInVehicle(false);
        setCurrentVehicle(null);
      }
      
      // Sprint with shift
      if (key === 'shift') {
        setKeys(prev => ({ ...prev, sprint: true }));
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      setKeys(prev => ({ ...prev, [key]: false }));
      
      if (key === 'shift') {
        setKeys(prev => ({ ...prev, sprint: false }));
      }
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
  }, [currentWeapon.id, gameStore]);

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
    const baseSpeed = isInVehicle ? 30 : 20;
    const speed = keys.sprint ? baseSpeed * 2.2 : baseSpeed;
    const acceleration = 0.15;
    const friction = 0.12;
    
    let targetVelocity: [number, number, number] = [0, 0, 0];

    // WASD movement
    if (keys['w']) targetVelocity[2] -= speed;
    if (keys['s']) targetVelocity[2] += speed;
    if (keys['a']) targetVelocity[0] -= speed;
    if (keys['d']) targetVelocity[0] += speed;
    
    // Smooth velocity interpolation
    const newSmoothVelocity: [number, number, number] = [
      THREE.MathUtils.lerp(smoothVelocity[0], targetVelocity[0], acceleration),
      0,
      THREE.MathUtils.lerp(smoothVelocity[2], targetVelocity[2], acceleration)
    ];
    
    // Apply friction when not moving
    if (targetVelocity[0] === 0) newSmoothVelocity[0] *= (1 - friction);
    if (targetVelocity[2] === 0) newSmoothVelocity[2] *= (1 - friction);
    
    setSmoothVelocity(newSmoothVelocity);
    
    // Update rotation based on movement direction
    if (Math.abs(newSmoothVelocity[0]) > 0.1 || Math.abs(newSmoothVelocity[2]) > 0.1) {
      const newRotation = Math.atan2(newSmoothVelocity[0], newSmoothVelocity[2]);
      setRotation(THREE.MathUtils.lerp(rotation, newRotation, 0.1));
    }

    // Apply movement
    const newPosition: [number, number, number] = [
      position[0] + newSmoothVelocity[0] * delta,
      1.5,
      position[2] + newSmoothVelocity[2] * delta
    ];

    // Boundary constraints
    newPosition[0] = Math.max(-40, Math.min(40, newPosition[0]));
    newPosition[2] = Math.max(-40, Math.min(40, newPosition[2]));

    setPosition(newPosition);
    setVelocity(newSmoothVelocity);
    setIsMoving(Math.abs(newSmoothVelocity[0]) > 0.5 || Math.abs(newSmoothVelocity[2]) > 0.5);

    if (isMoving) {
      gameStore.addAction('player_moved');
    }

    // Update threat level periodically
    if (Math.floor(state.clock.elapsedTime) % 5 === 0) {
      const checkThreat = async () => {
        const threat = await analyzeThreatLevel(newPosition, []);
        if (threat.level > 0.7) {
          gameStore.addAction('detected_high_threat');
        }
      };
      checkThreat();
    }
    
    // Update player position for other components
    gameStore.setPlayerPosition(newPosition);
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
        scale={1.5}
        weapon={currentWeapon.id}
        rotation={rotation}
      />
      
      <CombatSystem 
        effects={combatEffects}
        onEffectComplete={removeCombatEffect}
      />
    </>
  );
}

function City() {
  // Fixed NPC positions to prevent flutter
  const [npcs, setNpcs] = useState<NPCData[]>(() => {
    const fixedPositions = [
      [-20, 1, -20], [-10, 1, -25], [0, 1, -30], [10, 1, -20], [20, 1, -25],
      [-25, 1, -10], [-15, 1, 0], [5, 1, -15], [15, 1, 0], [25, 1, -10],
      [-30, 1, 5], [-20, 1, 10], [-10, 1, 15], [0, 1, 20], [10, 1, 25],
      [20, 1, 15], [30, 1, 5], [-15, 1, 25], [5, 1, 30], [25, 1, 20],
      [-35, 1, -5], [-25, 1, 20], [-5, 1, -35], [15, 1, -30], [35, 1, -15],
      [-30, 1, 25], [0, 1, 35], [20, 1, 30], [30, 1, 10], [-10, 1, 30]
    ];
    
    return Array.from({ length: 30 }).map((_, i) => {
      const types = ['civilian', 'gangster', 'police', 'dealer', 'hitman', 'boss'];
      const type = types[Math.floor(Math.random() * types.length)] as NPCData['type'];
      
      return {
        id: i.toString(),
        position: fixedPositions[i] as [number, number, number],
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
    });
  });

  // Fixed vehicle positions to prevent flutter
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const fixedVehiclePositions = [
      [-18, 0.5, -18], [-8, 0.5, -22], [2, 0.5, -28], [12, 0.5, -18], [22, 0.5, -23],
      [-23, 0.5, -8], [-13, 0.5, 2], [7, 0.5, -13], [17, 0.5, 2], [27, 0.5, -8],
      [-28, 0.5, 7], [-18, 0.5, 12], [-8, 0.5, 17], [2, 0.5, 22], [12, 0.5, 27]
    ];
    
    return Array.from({ length: 15 }).map((_, i) => {
      const types = ['sedan', 'sports', 'truck', 'police', 'ambulance'];
      return {
        id: `vehicle_${i}`,
        position: fixedVehiclePositions[i] as [number, number, number],
        type: types[Math.floor(Math.random() * types.length)] as Vehicle['type'],
        health: 100,
        speed: Math.random() * 50 + 30,
        occupied: false
      };
    });
  });

  const [corpses, setCorpses] = useState<Array<{
    id: string;
    position: [number, number, number];
    type: string;
    weapon: string;
  }>>([]);

  const [playerPosition, setPlayerPosition] = useState<[number, number, number]>([0, 1, 0]);

  const gameStore = useGameStore();
  const currentWeapon = gameStore.getCurrentWeapon();

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
        args={[120, 120]}
      >
        <meshStandardMaterial 
          color="#1a1a1a" 
          roughness={0.8}
          metalness={0.05}
        />
      </Plane>
      
      {/* Blood stains on ground */}
      {corpses.map((corpse, i) => (
        <group key={`blood-${i}`}>
          <Plane
            rotation={[-Math.PI / 2, 0, 0]}
            position={[corpse.position[0], 0.01, corpse.position[2]]}
            args={[3, 3]}
          >
            <meshBasicMaterial 
              color="#660000" 
              transparent 
              opacity={0.9}
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
        args={[120, 120]}
      >
        <meshBasicMaterial 
          color="#444444" 
          transparent 
          opacity={0.4}
        />
      </Plane>
      
      {/* Buildings - more detailed and atmospheric */}
      {Array.from({ length: 25 }).map((_, i) => {
        // Fixed building positions to prevent any movement
        const buildingData = [
          { x: -35, z: -35, h: 12, w: 4, d: 4 }, { x: -25, z: -35, h: 18, w: 6, d: 5 },
          { x: -15, z: -35, h: 8, w: 3, d: 4 }, { x: 0, z: -35, h: 15, w: 5, d: 6 },
          { x: 15, z: -35, h: 10, w: 4, d: 4 }, { x: 25, z: -35, h: 20, w: 7, d: 5 },
          { x: 35, z: -35, h: 14, w: 5, d: 4 }, { x: -35, z: -20, h: 16, w: 5, d: 6 },
          { x: -25, z: -15, h: 9, w: 4, d: 3 }, { x: -15, z: -10, h: 13, w: 6, d: 4 },
          { x: 15, z: -10, h: 11, w: 4, d: 5 }, { x: 25, z: -15, h: 17, w: 6, d: 6 },
          { x: 35, z: -20, h: 7, w: 3, d: 3 }, { x: -35, z: 10, h: 19, w: 7, d: 5 },
          { x: -25, z: 15, h: 12, w: 5, d: 4 }, { x: -15, z: 20, h: 8, w: 3, d: 4 },
          { x: 0, z: 25, h: 22, w: 8, d: 6 }, { x: 15, z: 20, h: 14, w: 5, d: 5 },
          { x: 25, z: 15, h: 10, w: 4, d: 4 }, { x: 35, z: 10, h: 16, w: 6, d: 5 },
          { x: -30, z: 30, h: 13, w: 5, d: 4 }, { x: -10, z: 35, h: 9, w: 4, d: 3 },
          { x: 10, z: 35, h: 15, w: 6, d: 5 }, { x: 30, z: 30, h: 11, w: 4, d: 4 },
          { x: 0, z: 0, h: 25, w: 10, d: 8 }
        ];
        
        const building = buildingData[i] || { x: 0, z: 0, h: 10, w: 4, d: 4 };
        const { x, z, h: height, w: width, d: depth } = building;
        
        return (
          <group key={`building-${i}`}>
            <Box
              position={[x, height / 2, z]}
              scale={[width, height, depth]}
            >
              <meshStandardMaterial 
                color={`hsl(${Math.random() * 30}, 25%, ${Math.random() * 15 + 12}%)`}
                roughness={0.7}
                metalness={0.2}
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
                      color={Math.random() > 0.6 ? "#ffaa44" : "#111111"} 
                      transparent
                      opacity={0.9}
                      emissive={Math.random() > 0.6 ? "#ff6622" : "#000000"}
                      emissiveIntensity={Math.random() > 0.6 ? 0.8 : 0}
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
                <meshStandardMaterial color="#444444" roughness={0.8} />
              </Box>
            )}
            
            {/* Neon signs */}
            {Math.random() > 0.8 && (
              <Box
                position={[x, height * 0.8, z + depth/2 + 0.2]}
                scale={[width * 0.8, 0.5, 0.1]}
              >
                <meshStandardMaterial 
                  color="#ff3366" 
                  emissive="#ff3366"
                  emissiveIntensity={2.0}
                />
              </Box>
            )}
          </group>
        );
      })}

      {/* Street props */}
      {Array.from({ length: 30 }).map((_, i) => {
        // Fixed prop positions
        const propPositions = [
          [-40, -40], [-30, -38], [-20, -42], [-10, -45], [0, -40],
          [10, -45], [20, -42], [30, -38], [40, -40], [-42, -20],
          [-38, -10], [-45, 0], [-40, 10], [-42, 20], [-38, 30],
          [-40, 40], [42, -20], [38, -10], [45, 0], [40, 10],
          [42, 20], [38, 30], [40, 40], [-20, 42], [-10, 45],
          [0, 40], [10, 45], [20, 42], [30, 38], [40, 40]
        ];
        
        const [x, z] = propPositions[i] || [0, 0];
        const propType = Math.random();
        
        if (propType < 0.3) {
          // Trash cans
          return (
            <Cylinder
              key={`prop-${i}`}
              position={[x, 0.5, z]}
              scale={[0.4, 1, 0.4]}
            >
              <meshStandardMaterial color="#3d3d3d" roughness={0.9} />
            </Cylinder>
          );
        } else if (propType < 0.6) {
          // Street lights
          return (
            <group key={`prop-${i}`}>
              <Cylinder position={[x, 2.5, z]} scale={[0.1, 5, 0.1]}>
                <meshStandardMaterial color="#555555" roughness={0.8} />
              </Cylinder>
              <Sphere position={[x, 4.5, z]} scale={[0.3, 0.3, 0.3]}>
                <meshStandardMaterial 
                  color="#ffaa44" 
                  emissive="#ff6622"
                  emissiveIntensity={1.2}
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
              <meshStandardMaterial color="#2a2a2a" roughness={0.9} />
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
  const gameStore = useGameStore();
  const [targetPosition, setTargetPosition] = useState(new THREE.Vector3(15, 25, 15));
  
  useFrame(() => {
    // Much more stable camera following
    const playerPos = gameStore.playerPosition || [0, 0, 0];
    const newTarget = new THREE.Vector3(playerPos[0] + 12, 22, playerPos[2] + 12);
    
    // Only update if player has moved significantly
    if (targetPosition.distanceTo(newTarget) > 0.5) {
      setTargetPosition(newTarget);
    }
    
    // Smooth, stable camera movement
    camera.position.lerp(targetPosition, 0.02);
    
    // Stable lookAt point
    const lookAtPoint = new THREE.Vector3(playerPos[0], 0, playerPos[2]);
    camera.lookAt(lookAtPoint);
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
    <div className="absolute top-4 right-4 p-4 bg-black/90 text-white rounded-lg border border-red-500/70 backdrop-blur-sm shadow-2xl max-w-xs">
      {gameStore.activeMission ? (
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-red-400 border-b border-red-500/30 pb-2">ACTIVE CONTRACT</h3>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-400">Type:</span> <span className="text-white font-semibold uppercase text-xs">{gameStore.activeMission.type}</span></p>
            <p><span className="text-gray-400">Target:</span> <span className="text-white text-xs">{gameStore.activeMission.target}</span></p>
            <p><span className="text-gray-400">Location:</span> <span className="text-white text-xs">{gameStore.activeMission.location}</span></p>
            <p><span className="text-gray-400">Blood Money:</span> <span className="text-green-400 font-bold text-sm">${gameStore.activeMission.reward?.toLocaleString()}</span></p>
          </div>
          
          {gameStore.activeMission.description && (
            <div className="mt-3 p-2 bg-red-900/40 border border-red-500/40 rounded">
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
          <h3 className="text-lg font-bold text-red-400 mb-3">NO ACTIVE CONTRACT</h3>
          <p className="text-gray-400 text-xs mb-3">The streets are calling for blood...</p>
          <button
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition-colors font-medium border border-red-500 w-full text-sm"
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
      <div className="p-4 bg-black/90 text-white rounded-lg border border-red-500/70 backdrop-blur-sm shadow-2xl">
        <h3 className="text-lg font-bold text-red-400 mb-3 border-b border-red-500/30 pb-1">DANNY'S STATUS</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Health:</span>
            <div className="flex items-center">
              <div className="w-24 h-3 bg-gray-800 rounded-full mr-2 border border-gray-600 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${gameStore.playerStats.health}%` }}
                ></div>
              </div>
              <span className="text-white font-bold text-xs">{gameStore.playerStats.health}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Reputation:</span>
            <div className="text-right">
              <div className="flex items-center">
                <div className="w-24 h-3 bg-gray-800 rounded-full mr-2 border border-gray-600 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-red-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${gameStore.playerStats.reputation}%` }}
                  ></div>
                </div>
                <span className="text-white font-bold text-xs">{gameStore.playerStats.reputation}</span>
              </div>
              <span className="text-xs text-yellow-400 block">{getReputationLabel(gameStore.playerStats.reputation)}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Heat Level:</span>
            <span className="text-red-400 font-bold text-lg animate-pulse">
              {'★'.repeat(gameStore.playerStats.wanted)}
              {'☆'.repeat(5 - gameStore.playerStats.wanted)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Blood Money:</span>
            <span className="text-green-400 font-bold text-lg">${gameStore.playerStats.money.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-400">Body Count:</span>
            <span className="text-red-500 font-bold text-xl animate-bounce">{killCount}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-3 bg-black/90 text-white rounded-lg border border-blue-500/70 backdrop-blur-sm shadow-2xl">
        <h3 className="text-lg font-bold text-blue-400 mb-3 border-b border-blue-500/30 pb-1">CONTROLS</h3>
        <div className="space-y-1 text-xs leading-tight">
          <p><span className="text-blue-400 font-bold">WASD:</span> <span className="text-white">Smooth Movement</span></p>
          <p><span className="text-blue-400 font-bold">Shift:</span> <span className="text-white">Sprint (Fast!)</span></p>
          <p><span className="text-blue-400 font-bold">1-6:</span> <span className="text-white">Quick Weapons</span></p>
          <p><span className="text-blue-400 font-bold">Click NPCs:</span> <span className="text-white">Interact</span></p>
          <p><span className="text-blue-400 font-bold">Red Spheres:</span> <span className="text-white">Attack!</span></p>
          <p><span className="text-blue-400 font-bold">Mouse Drag:</span> <span className="text-white">Camera</span></p>
        </div>
      </div>

      {/* Violence Warning */}
      <div className="p-2 bg-red-900/60 text-white rounded-lg border border-red-500/80 backdrop-blur-sm">
        <div className="flex items-center text-xs">
          <span className="text-red-500 font-bold mr-2">⚠</span>
          <span className="text-red-300">MATURE 17+</span>
        </div>
      </div>
    </div>
  );
}

const Game: React.FC = () => {
  return (
    <div className="w-full h-screen relative bg-gradient-to-b from-red-900/20 to-black">
      <Canvas 
        camera={{ position: [12, 22, 12], fov: 65 }}
        shadows
        gl={{ 
          antialias: true, 
          alpha: false, 
          powerPreference: "high-performance",
          stencil: false,
          depth: true
        }}
        frameloop="demand"
      >
        {/* Stable lighting setup - no flickering */}
        <ambientLight intensity={0.8} color="#442222" />
        <directionalLight 
          position={[20, 30, 20]} 
          intensity={1.0} 
          color="#ffffff"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        
        {/* Stable atmospheric lights */}
        <pointLight position={[0, 20, 0]} intensity={0.8} color="#ff3322" distance={80} />
        <pointLight position={[-30, 12, -30]} intensity={0.6} color="#ff4433" distance={60} />
        <pointLight position={[30, 12, 30]} intensity={0.6} color="#ff4433" distance={60} />
        
        {/* Stable fog - no movement */}
        <fog attach="fog" args={['#221111', 40, 100]} />
        
        <Player />
        <City />
        <CameraController />
        <OrbitControls 
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          maxDistance={50}
          minDistance={15}
          maxPolarAngle={Math.PI / 2.5}
          enableDamping={true}
          dampingFactor={0.08}
          rotateSpeed={0.3}
          zoomSpeed={0.5}
        />
      </Canvas>
      
      <HUD />
      <MissionPanel />
      <WeaponSystem />
      
      {/* Game Controls Help */}
      <div className="absolute bottom-4 right-1/2 transform translate-x-1/2 text-white text-center">
        <div className="bg-black/80 px-6 py-3 rounded-lg border border-red-500/30 backdrop-blur-sm">
          <div className="text-sm text-gray-300 mb-2">🎮 WASD = Move | Shift = Sprint | Click NPCs | Red = Attack | Mouse = Camera</div>
          <div className="flex space-x-2 text-xs justify-center">
            <span className="bg-red-600 px-2 py-1 rounded">MATURE 17+</span>
            <span className="bg-gray-800 px-2 py-1 rounded">CRIME SIMULATOR</span>
          </div>
        </div>
      </div>

      {/* Atmospheric overlay with film grain effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-red-900/10 pointer-events-none"></div>
      <div className="absolute inset-0 bg-black/5 pointer-events-none"></div>
    </div>
  );
};

export default Game;