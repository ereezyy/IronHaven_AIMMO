import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Cylinder, Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface ImmersiveWorldProps {
  playerPosition: [number, number, number];
  timeOfDay: number;
  weather: string;
}

const ImmersiveWorld: React.FC<ImmersiveWorldProps> = ({ playerPosition, timeOfDay, weather }) => {
  const trafficRef = useRef<THREE.Group[]>([]);
  const crowdRef = useRef<THREE.Group[]>([]);

  // Generate ambient traffic
  const trafficVehicles = useMemo(() => {
    const vehicles = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const distance = 30 + Math.random() * 40;
      vehicles.push({
        id: i,
        position: [
          playerPosition[0] + Math.cos(angle) * distance,
          0.5,
          playerPosition[2] + Math.sin(angle) * distance
        ] as [number, number, number],
        direction: angle + Math.PI,
        speed: 5 + Math.random() * 10,
        type: Math.random() > 0.8 ? 'truck' : 'car'
      });
    }
    return vehicles;
  }, []);

  // Generate ambient crowds
  const crowdPeople = useMemo(() => {
    const people = [];
    const crowdDensity = timeOfDay > 6 && timeOfDay < 22 ? 20 : 8; // More people during day
    
    for (let i = 0; i < crowdDensity; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 15 + Math.random() * 25;
      people.push({
        id: i,
        position: [
          playerPosition[0] + Math.cos(angle) * distance,
          1,
          playerPosition[2] + Math.sin(angle) * distance
        ] as [number, number, number],
        walkSpeed: 1 + Math.random() * 2,
        direction: Math.random() * Math.PI * 2
      });
    }
    return people;
  }, [timeOfDay]);

  // Animate traffic
  useFrame((state, delta) => {
    trafficVehicles.forEach((vehicle, index) => {
      if (trafficRef.current[index]) {
        vehicle.position[0] += Math.cos(vehicle.direction) * vehicle.speed * delta;
        vehicle.position[2] += Math.sin(vehicle.direction) * vehicle.speed * delta;
        
        // Respawn if too far from player
        const distance = Math.sqrt(
          Math.pow(vehicle.position[0] - playerPosition[0], 2) +
          Math.pow(vehicle.position[2] - playerPosition[2], 2)
        );
        
        if (distance > 80) {
          const newAngle = Math.random() * Math.PI * 2;
          const newDistance = 30 + Math.random() * 10;
          vehicle.position = [
            playerPosition[0] + Math.cos(newAngle) * newDistance,
            0.5,
            playerPosition[2] + Math.sin(newAngle) * newDistance
          ];
        }
        
        trafficRef.current[index].position.set(...vehicle.position);
        trafficRef.current[index].rotation.y = vehicle.direction;
      }
    });

    // Animate crowd
    crowdPeople.forEach((person, index) => {
      if (crowdRef.current[index]) {
        person.position[0] += Math.cos(person.direction) * person.walkSpeed * delta;
        person.position[2] += Math.sin(person.direction) * person.walkSpeed * delta;
        
        // Random direction changes
        if (Math.random() > 0.98) {
          person.direction = Math.random() * Math.PI * 2;
        }
        
        crowdRef.current[index].position.set(...person.position);
      }
    });
  });

  return (
    <group>
      {/* Ambient Traffic */}
      {trafficVehicles.map((vehicle, index) => (
        <group
          key={`traffic-${vehicle.id}`}
          ref={el => el && (trafficRef.current[index] = el)}
          position={vehicle.position}
        >
          <Box scale={vehicle.type === 'truck' ? [5, 2.5, 2.5] : [4, 1.5, 2]}>
            <meshStandardMaterial 
              color={`hsl(${Math.random() * 360}, 50%, 40%)`}
              metalness={0.8}
              roughness={0.2}
            />
          </Box>
          
          {/* Headlights */}
          {(timeOfDay < 6 || timeOfDay > 19) && (
            <>
              <Sphere position={[1.8, 0, 1]} scale={[0.2, 0.2, 0.1]}>
                <meshBasicMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
              </Sphere>
              <Sphere position={[-1.8, 0, 1]} scale={[0.2, 0.2, 0.1]}>
                <meshBasicMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1} />
              </Sphere>
              <pointLight position={[0, 0, 2]} intensity={0.5} distance={10} color="#ffffff" />
            </>
          )}
        </group>
      ))}
      
      {/* Ambient Crowd */}
      {crowdPeople.map((person, index) => (
        <group
          key={`crowd-${person.id}`}
          ref={el => el && (crowdRef.current[index] = el)}
          position={person.position}
        >
          <Cylinder scale={[0.3, 1.8, 0.3]}>
            <meshStandardMaterial color={`hsl(${Math.random() * 360}, 40%, 60%)`} />
          </Cylinder>
        </group>
      ))}
      
      {/* Environmental Details */}
      <UrbanDetails playerPosition={playerPosition} timeOfDay={timeOfDay} />
      
      {/* Weather Effects */}
      <WeatherEffects weather={weather} />
      
      {/* Ambient Sounds Visualization */}
      <AmbientSounds timeOfDay={timeOfDay} />
    </group>
  );
};

const UrbanDetails: React.FC<{ playerPosition: [number, number, number]; timeOfDay: number }> = ({ 
  playerPosition, 
  timeOfDay 
}) => {
  const details = useMemo(() => {
    const items = [];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 10 + Math.random() * 40;
      const type = Math.random();
      
      let detailType = 'trash_can';
      let scale: [number, number, number] = [1, 1, 1];
      let color = '#666666';
      
      if (type < 0.2) {
        detailType = 'fire_hydrant';
        scale = [0.5, 1.2, 0.5];
        color = '#ff0000';
      } else if (type < 0.4) {
        detailType = 'street_light';
        scale = [0.1, 6, 0.1];
        color = '#333333';
      } else if (type < 0.6) {
        detailType = 'mailbox';
        scale = [0.4, 1.2, 0.6];
        color = '#0066cc';
      } else if (type < 0.8) {
        detailType = 'bench';
        scale = [2, 0.5, 0.8];
        color = '#8B4513';
      }
      
      items.push({
        id: i,
        type: detailType,
        position: [
          playerPosition[0] + Math.cos(angle) * distance,
          scale[1] / 2,
          playerPosition[2] + Math.sin(angle) * distance
        ] as [number, number, number],
        scale,
        color
      });
    }
    return items;
  }, [playerPosition]);

  return (
    <>
      {details.map(detail => (
        <Box key={detail.id} position={detail.position} scale={detail.scale}>
          <meshStandardMaterial color={detail.color} />
          
          {/* Street light glow effect */}
          {detail.type === 'street_light' && (timeOfDay < 6 || timeOfDay > 19) && (
            <pointLight 
              position={[0, 5, 0]} 
              intensity={0.8} 
              distance={15}
              color="#ffaa00"
            />
          )}
        </Box>
      ))}
    </>
  );
};

const WeatherEffects: React.FC<{ weather: string }> = ({ weather }) => {
  const particlesRef = useRef<THREE.Points>(null);

  useFrame((state, delta) => {
    if (particlesRef.current && weather === 'rain') {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= 20 * delta; // Rain falling
        if (positions[i] < 0) {
          positions[i] = 30;
        }
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  if (weather === 'rain') {
    const rainPositions = new Float32Array(1500);
    for (let i = 0; i < rainPositions.length; i += 3) {
      rainPositions[i] = (Math.random() - 0.5) * 100;     // x
      rainPositions[i + 1] = Math.random() * 30;          // y
      rainPositions[i + 2] = (Math.random() - 0.5) * 100; // z
    }

    return (
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={rainPositions}
            count={500}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial color="#6eb5ff" size={0.1} transparent opacity={0.6} />
      </points>
    );
  }

  return null;
};

const AmbientSounds: React.FC<{ timeOfDay: number }> = ({ timeOfDay }) => {
  const soundEmitters = useMemo(() => {
    const emitters = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const distance = 20 + Math.random() * 30;
      emitters.push({
        id: i,
        position: [Math.cos(angle) * distance, 2, Math.sin(angle) * distance] as [number, number, number],
        type: Math.random() > 0.5 ? 'urban' : 'nature',
        intensity: timeOfDay > 6 && timeOfDay < 22 ? 0.8 : 0.3
      });
    }
    return emitters;
  }, [timeOfDay]);

  return (
    <>
      {soundEmitters.map(emitter => (
        <mesh key={emitter.id} position={emitter.position}>
          <sphereGeometry args={[0.1, 4, 4]} />
          <meshBasicMaterial 
            color={emitter.type === 'urban' ? "#ffaa00" : "#00ff00"}
            transparent 
            opacity={emitter.intensity * 0.3}
          />
        </mesh>
      ))}
    </>
  );
};

export default ImmersiveWorld;