import React, { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder } from '@react-three/drei';
import { useGameStore } from '../store/gameState';
import * as THREE from 'three';

interface DrivableVehicle {
  id: string;
  position: [number, number, number];
  rotation: number;
  velocity: [number, number, number];
  type: 'sedan' | 'sports' | 'truck' | 'police' | 'ambulance';
  health: number;
  maxSpeed: number;
  acceleration: number;
  handling: number;
  isPlayerDriving: boolean;
}

interface VehicleSystemProps {
  playerPosition: [number, number, number];
  onPlayerEnterVehicle: (vehicleId: string) => void;
  onPlayerExitVehicle: () => void;
}

const VehicleSystem: React.FC<VehicleSystemProps> = ({ 
  playerPosition, 
  onPlayerEnterVehicle, 
  onPlayerExitVehicle 
}) => {
  const gameStore = useGameStore();
  const [vehicles, setVehicles] = useState<DrivableVehicle[]>([]);
  const [playerVehicle, setPlayerVehicle] = useState<string | null>(null);
  const [keys, setKeys] = useState<{[key: string]: boolean}>({});
  const vehicleRefs = useRef<{ [key: string]: THREE.Group }>({});

  // Initialize some vehicles around the player
  useEffect(() => {
    const initialVehicles: DrivableVehicle[] = [];
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const distance = 15 + Math.random() * 25;
      const x = playerPosition[0] + Math.cos(angle) * distance;
      const z = playerPosition[2] + Math.sin(angle) * distance;
      
      const types: DrivableVehicle['type'][] = ['sedan', 'sports', 'truck', 'police', 'ambulance'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      let maxSpeed = 25;
      let acceleration = 0.8;
      let handling = 0.9;
      
      switch (type) {
        case 'sports':
          maxSpeed = 40;
          acceleration = 1.2;
          handling = 1.1;
          break;
        case 'truck':
          maxSpeed = 20;
          acceleration = 0.5;
          handling = 0.6;
          break;
        case 'police':
          maxSpeed = 35;
          acceleration = 1.0;
          handling = 1.0;
          break;
      }

      initialVehicles.push({
        id: `vehicle_${i}`,
        position: [x, 0.5, z],
        rotation: Math.random() * Math.PI * 2,
        velocity: [0, 0, 0],
        type,
        health: 100,
        maxSpeed,
        acceleration,
        handling,
        isPlayerDriving: false
      });
    }
    
    setVehicles(initialVehicles);
  }, []);

  // Handle keyboard input for driving
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [event.key.toLowerCase()]: true }));
      
      // Enter/Exit vehicle with F key
      if (event.key.toLowerCase() === 'f') {
        if (playerVehicle) {
          // Exit vehicle
          setPlayerVehicle(null);
          setVehicles(prev => prev.map(v => 
            v.id === playerVehicle ? { ...v, isPlayerDriving: false } : v
          ));
          onPlayerExitVehicle();
        } else {
          // Try to enter nearby vehicle
          const nearbyVehicle = vehicles.find(v => {
            const distance = Math.sqrt(
              Math.pow(v.position[0] - playerPosition[0], 2) +
              Math.pow(v.position[2] - playerPosition[2], 2)
            );
            return distance < 5 && !v.isPlayerDriving;
          });
          
          if (nearbyVehicle) {
            setPlayerVehicle(nearbyVehicle.id);
            setVehicles(prev => prev.map(v => 
              v.id === nearbyVehicle.id ? { ...v, isPlayerDriving: true } : v
            ));
            onPlayerEnterVehicle(nearbyVehicle.id);
          }
        }
      }
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
  }, [playerVehicle, vehicles, playerPosition]);

  // Vehicle physics and movement
  useFrame((state, delta) => {
    if (!playerVehicle) return;

    setVehicles(prev => prev.map(vehicle => {
      if (vehicle.id === playerVehicle && vehicle.isPlayerDriving) {
        let newVelocity = [...vehicle.velocity] as [number, number, number];
        let newRotation = vehicle.rotation;
        
        const maxSpeed = vehicle.maxSpeed;
        const acceleration = vehicle.acceleration;
        const handling = vehicle.handling;
        
        // Acceleration/Deceleration
        if (keys['w'] || keys['arrowup']) {
          newVelocity[0] += Math.sin(newRotation) * acceleration * delta * 10;
          newVelocity[2] += Math.cos(newRotation) * acceleration * delta * 10;
        }
        if (keys['s'] || keys['arrowdown']) {
          newVelocity[0] -= Math.sin(newRotation) * acceleration * delta * 8;
          newVelocity[2] -= Math.cos(newRotation) * acceleration * delta * 8;
        }
        
        // Steering
        const speed = Math.sqrt(newVelocity[0] * newVelocity[0] + newVelocity[2] * newVelocity[2]);
        if (speed > 1) {
          if (keys['a'] || keys['arrowleft']) {
            newRotation -= handling * delta * 3;
          }
          if (keys['d'] || keys['arrowright']) {
            newRotation += handling * delta * 3;
          }
        }
        
        // Apply speed limit
        if (speed > maxSpeed) {
          const scale = maxSpeed / speed;
          newVelocity[0] *= scale;
          newVelocity[2] *= scale;
        }
        
        // Friction
        newVelocity[0] *= 0.98;
        newVelocity[2] *= 0.98;
        
        // Update position
        const newPosition: [number, number, number] = [
          vehicle.position[0] + newVelocity[0] * delta,
          vehicle.position[1],
          vehicle.position[2] + newVelocity[2] * delta
        ];
        
        // Update player position if driving
        gameStore.setPlayerPosition([newPosition[0], newPosition[1] + 1, newPosition[2]]);
        
        return {
          ...vehicle,
          position: newPosition,
          rotation: newRotation,
          velocity: newVelocity
        };
      }
      return vehicle;
    }));
  });

  const getVehicleColor = (type: DrivableVehicle['type']) => {
    switch (type) {
      case 'police': return '#0066CC';
      case 'ambulance': return '#FFFFFF';
      case 'sports': return '#FF0000';
      case 'truck': return '#8B4513';
      default: return '#333333';
    }
  };

  const getVehicleScale = (type: DrivableVehicle['type']): [number, number, number] => {
    switch (type) {
      case 'sports': return [3.5, 1.2, 1.8];
      case 'truck': return [5, 2, 2.5];
      case 'ambulance': return [4.5, 2, 2.2];
      default: return [4, 1.5, 2];
    }
  };

  return (
    <>
      {vehicles.map(vehicle => (
        <group 
          key={vehicle.id} 
          position={vehicle.position}
          rotation={[0, vehicle.rotation, 0]}
          ref={ref => {
            if (ref) vehicleRefs.current[vehicle.id] = ref;
          }}
        >
          {/* Main body */}
          <Box scale={getVehicleScale(vehicle.type)}>
            <meshStandardMaterial 
              color={getVehicleColor(vehicle.type)}
              metalness={0.8}
              roughness={0.2}
            />
          </Box>
          
          {/* Wheels */}
          <Cylinder position={[-1.5, -0.5, 1]} rotation={[Math.PI/2, 0, 0]} scale={[0.4, 0.2, 0.4]}>
            <meshStandardMaterial color="#000000" />
          </Cylinder>
          <Cylinder position={[1.5, -0.5, 1]} rotation={[Math.PI/2, 0, 0]} scale={[0.4, 0.2, 0.4]}>
            <meshStandardMaterial color="#000000" />
          </Cylinder>
          <Cylinder position={[-1.5, -0.5, -1]} rotation={[Math.PI/2, 0, 0]} scale={[0.4, 0.2, 0.4]}>
            <meshStandardMaterial color="#000000" />
          </Cylinder>
          <Cylinder position={[1.5, -0.5, -1]} rotation={[Math.PI/2, 0, 0]} scale={[0.4, 0.2, 0.4]}>
            <meshStandardMaterial color="#000000" />
          </Cylinder>
          
          {/* Headlights */}
          <Box position={[0, 0, 1.2]} scale={[2, 0.3, 0.1]}>
            <meshStandardMaterial 
              color="#ffffff" 
              emissive="#ffffff"
              emissiveIntensity={vehicle.isPlayerDriving ? 0.5 : 0.2}
            />
          </Box>
          
          {/* Brake lights */}
          <Box position={[0, 0, -1.2]} scale={[2, 0.3, 0.1]}>
            <meshStandardMaterial 
              color="#ff0000" 
              emissive="#ff0000"
              emissiveIntensity={keys['s'] && vehicle.isPlayerDriving ? 0.8 : 0.1}
            />
          </Box>
          
          {/* Player driving indicator */}
          {vehicle.isPlayerDriving && (
            <Box position={[0, 2, 0]} scale={[0.5, 0.5, 0.5]}>
              <meshBasicMaterial 
                color="#00ff00" 
                emissive="#00ff00"
                emissiveIntensity={1}
              />
            </Box>
          )}
          
          {/* Interaction prompt when near */}
          {!vehicle.isPlayerDriving && (
            (() => {
              const distance = Math.sqrt(
                Math.pow(vehicle.position[0] - playerPosition[0], 2) +
                Math.pow(vehicle.position[2] - playerPosition[2], 2)
              );
              return distance < 5 ? (
                <Box position={[0, 2.5, 0]} scale={[0.3, 0.3, 0.3]}>
                  <meshBasicMaterial 
                    color="#ffff00" 
                    emissive="#ffff00"
                    emissiveIntensity={0.8}
                  />
                </Box>
              ) : null;
            })()
          )}
        </group>
      ))}
    </>
  );
};

export default VehicleSystem;