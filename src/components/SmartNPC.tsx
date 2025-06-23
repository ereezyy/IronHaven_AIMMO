import React, { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store/gameState';
import SpriteCharacter from './SpriteCharacter';
import * as THREE from 'three';

interface SmartNPCProps {
  id: string;
  position: [number, number, number];
  type: 'civilian' | 'gangster' | 'police' | 'dealer' | 'hitman' | 'boss';
  playerPosition: [number, number, number];
  onInteraction: (npc: any) => void;
}

interface NPCState {
  health: number;
  mood: 'calm' | 'alert' | 'hostile' | 'fleeing' | 'dead';
  awareness: number;
  lastPlayerSeen: number;
  currentAction: 'idle' | 'patrol' | 'investigate' | 'attack' | 'flee' | 'seek_cover';
  target: [number, number, number] | null;
  pathfinding: [number, number, number][];
  weapon: string | null;
}

const SmartNPC: React.FC<SmartNPCProps> = ({ 
  id, 
  position: initialPosition, 
  type, 
  playerPosition, 
  onInteraction 
}) => {
  const gameStore = useGameStore();
  const [position, setPosition] = useState(initialPosition);
  const [rotation, setRotation] = useState(0);
  const [state, setState] = useState<NPCState>({
    health: type === 'boss' ? 200 : type === 'police' ? 120 : 100,
    mood: 'calm',
    awareness: 0,
    lastPlayerSeen: 0,
    currentAction: 'idle',
    target: null,
    pathfinding: [],
    weapon: type === 'police' ? 'pistol' : type === 'gangster' ? 'knife' : null
  });

  const meshRef = useRef<THREE.Group>(null);
  const visionCone = useRef<THREE.Mesh>(null);

  // Advanced AI Decision Making
  const makeDecision = () => {
    const distanceToPlayer = Math.sqrt(
      Math.pow(position[0] - playerPosition[0], 2) +
      Math.pow(position[2] - playerPosition[2], 2)
    );

    const playerWanted = gameStore.playerStats.wanted;
    const playerRep = gameStore.playerStats.reputation;
    const playerKills = gameStore.playerStats.policeKillCount;

    // Line of sight check
    const hasLineOfSight = distanceToPlayer < 30 && Math.random() > 0.2;
    
    if (hasLineOfSight) {
      setState(prev => ({ 
        ...prev,
        awareness: Math.min(1, prev.awareness + 0.15),
        lastPlayerSeen: Date.now()
      }));
    }

    // Enhanced decision tree with more realistic behavior
    if (state.health <= 0) {
      setState(prev => ({ ...prev, mood: 'dead', currentAction: 'idle' }));
      return;
    }

    if (state.mood === 'dead') return;

    // Calculate threat level based on multiple factors
    let threatLevel = (playerWanted * 2 + playerRep / 10 + playerKills / 5) / 15;
    
    if (type === 'civilian') {
      if (state.awareness > 0.5 || playerWanted > 1 || playerKills > 5) {
        setState(prev => ({ 
          ...prev, 
          mood: 'fleeing', 
          currentAction: 'flee',
          target: generateFleeTarget()
        }));
        
        // Civilians call police if they see crimes
        if (playerWanted > 2 && Math.random() > 0.7) {
          gameStore.addAction('civilian_called_police');
        }
      } else if (distanceToPlayer < 8 && Math.random() > 0.9) {
        // Random civilian interaction
        onInteraction({
          id,
          type,
          dialogue: getCivilianDialogue(playerRep, playerWanted),
          mood: state.mood
        });
      }
    } else if (type === 'police') {
      if (playerWanted > 0 || playerKills > 0) {
        setState(prev => ({ 
          ...prev, 
          mood: 'hostile', 
          currentAction: 'attack',
          target: [...playerPosition]
        }));
      } else if (state.awareness > 0.5) {
        setState(prev => ({ 
          ...prev, 
          mood: 'alert', 
          currentAction: 'investigate',
          target: [...playerPosition]
        }));
      }
    } else if (type === 'gangster' || type === 'hitman' || type === 'boss') {
      // Gangsters react differently based on player reputation
      if (playerRep < 20 && distanceToPlayer < 20) {
        setState(prev => ({ 
          ...prev, 
          mood: 'hostile', 
          currentAction: 'attack',
          target: [...playerPosition]
        }));
      } else if (playerRep > 80 && type === 'boss') {
        // High-level bosses challenge powerful players
        setState(prev => ({ 
          ...prev, 
          mood: 'hostile', 
          currentAction: 'attack',
          target: [...playerPosition]
        }));
      } else if (playerRep >= 20 && playerRep <= 80 && distanceToPlayer < 15) {
        setState(prev => ({ 
          ...prev, 
          mood: 'hostile', 
          currentAction: 'attack',
          target: [...playerPosition]
        }));
      } else if (playerRep > 50 && distanceToPlayer < 10) {
        // Show respect to high-rep player
        onInteraction({
          id,
          type,
          dialogue: getGangsterDialogue(playerRep, playerKills, true),
          mood: 'calm'
        });
      }
    } else if (type === 'dealer') {
      if (distanceToPlayer < 12 && Math.random() > 0.8) {
        onInteraction({
          id,
          type,
          dialogue: getDealerDialogue(playerRep, playerKills),
          mood: state.mood
        });
      }
    }
  };

  const generateFleeTarget = (): [number, number, number] => {
    const angle = Math.atan2(position[2] - playerPosition[2], position[0] - playerPosition[0]);
    const distance = 20 + Math.random() * 15;
    return [
      position[0] + Math.cos(angle) * distance,
      position[1],
      position[2] + Math.sin(angle) * distance
    ];
  };

  const getCivilianDialogue = (rep: number, wanted: number): string => {
    if (wanted > 3) return "Oh god, please don't kill me! I have a family!";
    if (wanted > 1) return "Stay back! I know what you've done!";
    if (rep > 70) return "You're that psycho everyone's talking about...";
    if (rep > 30) return "I don't want any trouble, please.";
    return "Nice day, isn't it?";
  };

  const getGangsterDialogue = (rep: number, kills: number, respectful: boolean): string => {
    if (respectful && kills > 10) return "Damn, you're a real killer. Respect.";
    if (respectful) return "Boss, heard you're making moves.";
    if (rep < 10) return "Get lost before I make you disappear.";
    if (kills > 20) return "Holy shit, you're the Ironhaven Reaper!";
    return "You got business here?";
  };

  const getDealerDialogue = (rep: number, kills: number): string => {
    if (kills > 15) return "Yo, the murder king! Want something special?";
    if (rep > 50) return "Premium merchandise for a premium client.";
    if (rep > 20) return "You're moving up, I got what you need.";
    return "First time? I got starter packages.";
  };

  // Movement and pathfinding
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    makeDecision();

    // Execute current action
    switch (state.currentAction) {
      case 'flee':
        if (state.target) {
          moveToTarget(state.target, delta, 12); // Fast movement when fleeing
        }
        break;
      case 'attack':
        if (state.target) {
          moveToTarget(state.target, delta, 8);
          // Attack logic
          const distanceToTarget = Math.sqrt(
            Math.pow(position[0] - state.target[0], 2) +
            Math.pow(position[2] - state.target[2], 2)
          );
          if (distanceToTarget < 5 && Math.random() > 0.93) {
            // NPC attacks player
            const damage = type === 'boss' ? 35 : type === 'hitman' ? 25 : type === 'police' ? 20 : 15;
            gameStore.updateStats({ health: Math.max(0, gameStore.playerStats.health - damage) });
            gameStore.addAction(`${type}_attacked_player`);
          }
        }
        break;
      case 'investigate':
        if (state.target) {
          moveToTarget(state.target, delta, 6);
        }
        break;
      case 'patrol':
        // Simple patrol behavior
        if (!state.target || Math.random() > 0.99) {
          setState(prev => ({
            ...prev,
            target: [
              position[0] + (Math.random() - 0.5) * 20,
              position[1],
              position[2] + (Math.random() - 0.5) * 20
            ]
          }));
        }
        if (state.target) {
          moveToTarget(state.target, delta, 4);
        }
        break;
    }

    // Update awareness decay
    if (Date.now() - state.lastPlayerSeen > 5000) {
      setState(prev => ({ 
        ...prev, 
        awareness: Math.max(0, prev.awareness - delta * 0.2) 
      }));
    }
  });

  const moveToTarget = (target: [number, number, number], delta: number, speed: number) => {
    const dx = target[0] - position[0];
    const dz = target[2] - position[2];
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance > 1) {
      const moveX = (dx / distance) * speed * delta;
      const moveZ = (dz / distance) * speed * delta;
      
      setPosition(prev => [prev[0] + moveX, prev[1], prev[2] + moveZ]);
      setRotation(Math.atan2(dx, dz));
    }
  };

  const handleClick = () => {
    if (state.mood === 'dead') return;
    
    // Combat interaction
    setState(prev => ({ 
      ...prev, 
      health: Math.max(0, prev.health - (50 + Math.random() * 30)),
      mood: prev.health <= 50 ? 'dead' : 'hostile',
      currentAction: prev.health <= 50 ? 'idle' : 'attack'
    }));
    
    if (state.health <= 0) {
      gameStore.addAction(`killed_${type}`);
      
      // Variable reputation gain based on target importance
      let repGain = 5;
      if (type === 'boss') repGain = 30;
      else if (type === 'hitman') repGain = 20;
      else if (type === 'police') repGain = 15;
      else if (type === 'gangster') repGain = 8;
      
      gameStore.updateStats({ reputation: gameStore.playerStats.reputation + repGain });
    }
  };

  const getMoodColor = () => {
    switch (state.mood) {
      case 'hostile': return '#ff0000';
      case 'alert': return '#ffaa00';
      case 'fleeing': return '#00aaff';
      case 'dead': return '#666666';
      default: return '#ffffff';
    }
  };

  return (
    <group ref={meshRef} position={position}>
      <SpriteCharacter
        position={[0, 0, 0]}
        type={state.mood === 'dead' ? 'corpse' : type}
        mood={state.mood === 'dead' ? 'dead' : state.mood === 'fleeing' ? 'terrified' : state.mood === 'hostile' ? 'aggressive' : 'neutral'}
        bloodLevel={state.mood === 'dead' ? 1 : Math.max(0, 1 - state.health / 100)}
        weapon={state.weapon || undefined}
        rotation={rotation}
        onClick={handleClick}
      />
      
      {/* Awareness indicator */}
      {state.awareness > 0.3 && state.mood !== 'dead' && (
        <mesh position={[0, 3, 0]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial 
            color={getMoodColor()} 
            emissive={getMoodColor()}
            emissiveIntensity={0.8}
          />
        </mesh>
      )}
      
      {/* Health bar for damaged NPCs */}
      {state.health < 100 && state.mood !== 'dead' && (
        <group position={[0, 2.5, 0]}>
          <mesh>
            <planeGeometry args={[2, 0.2]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
          <mesh position={[-(1 - state.health / 100), 0, 0.01]}>
            <planeGeometry args={[(state.health / 100) * 2, 0.15]} />
            <meshBasicMaterial color="#ff0000" />
          </mesh>
        </group>
      )}
      
      {/* Vision cone for police/gangsters */}
      {(type === 'police' || type === 'gangster') && state.mood !== 'dead' && (
        <mesh 
          ref={visionCone}
          position={[0, 0.5, 1]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <coneGeometry args={[state.awareness * 8, 15, 8, 1, true]} />
          <meshBasicMaterial 
            color="#ffff00" 
            transparent 
            opacity={state.awareness * 0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};

export default SmartNPC;