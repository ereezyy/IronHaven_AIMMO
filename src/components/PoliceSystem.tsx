import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameState';
import SpriteCharacter from './SpriteCharacter';
import * as THREE from 'three';

interface PoliceUnit {
  id: string;
  position: [number, number, number];
  target: [number, number, number];
  type: 'patrol' | 'swat' | 'helicopter' | 'roadblock';
  health: number;
  weapon: string;
  speed: number;
  alertLevel: number;
}

interface PoliceSystemProps {
  playerPosition: [number, number, number];
  onPoliceKilled: (id: string) => void;
}

const PoliceSystem: React.FC<PoliceSystemProps> = ({ playerPosition, onPoliceKilled }) => {
  const gameStore = useGameStore();
  const [policeUnits, setPoliceUnits] = useState<PoliceUnit[]>([]);
  const [responseTimer, setResponseTimer] = useState(0);

  // Spawn police based on wanted level
  useEffect(() => {
    const wantedLevel = gameStore.playerStats.wanted;
    
    if (wantedLevel === 0) {
      setPoliceUnits([]);
      return;
    }

    const spawnPolice = () => {
      const newUnits: PoliceUnit[] = [];
      const unitsToSpawn = wantedLevel * 2;
      
      for (let i = 0; i < unitsToSpawn; i++) {
        const angle = (i / unitsToSpawn) * Math.PI * 2;
        const distance = 30 + Math.random() * 20;
        const x = playerPosition[0] + Math.cos(angle) * distance;
        const z = playerPosition[2] + Math.sin(angle) * distance;
        
        let type: PoliceUnit['type'] = 'patrol';
        let health = 100;
        let weapon = 'pistol';
        let speed = 8;
        
        if (wantedLevel >= 3) {
          type = Math.random() > 0.5 ? 'swat' : 'patrol';
          if (type === 'swat') {
            health = 150;
            weapon = 'shotgun';
            speed = 6;
          }
        }
        
        if (wantedLevel >= 4 && Math.random() > 0.8) {
          type = 'helicopter';
          health = 200;
          weapon = 'machine_gun';
          speed = 12;
        }

        newUnits.push({
          id: `police_${i}_${Date.now()}`,
          position: [x, 1, z],
          target: [...playerPosition],
          type,
          health,
          weapon,
          speed,
          alertLevel: wantedLevel
        });
      }
      
      setPoliceUnits(newUnits);
    };

    // Delay police response based on wanted level
    const responseDelay = Math.max(1000, 5000 - wantedLevel * 1000);
    const timer = setTimeout(spawnPolice, responseDelay);
    
    return () => clearTimeout(timer);
  }, [gameStore.playerStats.wanted, playerPosition]);

  // Update police movement and behavior
  useEffect(() => {
    if (policeUnits.length === 0) return;

    const updateInterval = setInterval(() => {
      setPoliceUnits(prev => prev.map(unit => {
        // Move towards player
        const dx = playerPosition[0] - unit.position[0];
        const dz = playerPosition[2] - unit.position[2];
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance > 2) {
          const moveX = (dx / distance) * unit.speed * 0.1;
          const moveZ = (dz / distance) * unit.speed * 0.1;
          
          return {
            ...unit,
            position: [
              unit.position[0] + moveX,
              unit.position[1],
              unit.position[2] + moveZ
            ] as [number, number, number],
            target: [...playerPosition] as [number, number, number]
          };
        }
        
        return unit;
      }));
    }, 100);

    return () => clearInterval(updateInterval);
  }, [policeUnits, playerPosition]);

  // Auto-attack player if in range
  useEffect(() => {
    policeUnits.forEach(unit => {
      const distance = Math.sqrt(
        Math.pow(unit.position[0] - playerPosition[0], 2) +
        Math.pow(unit.position[2] - playerPosition[2], 2)
      );
      
      if (distance < 15 && Math.random() > 0.95) {
        // Police shoots at player
        const damage = unit.type === 'swat' ? 25 : unit.type === 'helicopter' ? 35 : 15;
        if (gameStore.playerStats.health > damage) {
          gameStore.updateStats({ 
            health: gameStore.playerStats.health - damage 
          });
          gameStore.addAction(`police_shot_player`);
        }
      }
    });
  }, [policeUnits, playerPosition, gameStore]);

  const handlePoliceAttacked = (id: string) => {
    setPoliceUnits(prev => prev.map(unit => 
      unit.id === id 
        ? { ...unit, health: unit.health - 50 }
        : unit
    ).filter(unit => {
      if (unit.health <= 0) {
        onPoliceKilled(unit.id);
        return false;
      }
      return true;
    }));
  };

  return (
    <>
      {policeUnits.map(unit => (
        <group key={unit.id}>
          <SpriteCharacter
            position={unit.position}
            type="police"
            mood={unit.alertLevel > 3 ? 'aggressive' : 'hostile'}
            scale={unit.type === 'swat' ? 1.3 : 1.0}
            weapon={unit.weapon}
            onClick={() => handlePoliceAttacked(unit.id)}
          />
          
          {/* Police health bar */}
          {unit.health < 100 && (
            <group position={[unit.position[0], unit.position[1] + 3, unit.position[2]]}>
              <mesh>
                <planeGeometry args={[2, 0.2]} />
                <meshBasicMaterial color="#000000" />
              </mesh>
              <mesh position={[-(1 - unit.health / 100), 0, 0.01]}>
                <planeGeometry args={[(unit.health / 100) * 2, 0.15]} />
                <meshBasicMaterial color="#0066ff" />
              </mesh>
            </group>
          )}
          
          {/* Unit type indicator */}
          <mesh
            position={[unit.position[0], unit.position[1] + 2.5, unit.position[2]]}
            scale={[0.2, 0.2, 0.2]}
          >
            <sphereGeometry args={[1]} />
            <meshBasicMaterial 
              color={unit.type === 'swat' ? '#ff0000' : unit.type === 'helicopter' ? '#ffff00' : '#0066ff'}
              emissive={unit.type === 'swat' ? '#ff0000' : unit.type === 'helicopter' ? '#ffff00' : '#0066ff'}
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      ))}
    </>
  );
};

export default PoliceSystem;