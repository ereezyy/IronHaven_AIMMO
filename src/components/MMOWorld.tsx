import React, { useMemo } from 'react';
import * as THREE from 'three';

const MMOWorld: React.FC = () => {
  const buildings = useMemo(() => {
    const buildingArray = [];
    const cityRadius = 80;
    const buildingCount = 50;

    for (let i = 0; i < buildingCount; i++) {
      const angle = (i / buildingCount) * Math.PI * 2;
      const distance = 20 + Math.random() * 60;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      const width = 3 + Math.random() * 5;
      const height = 10 + Math.random() * 30;
      const depth = 3 + Math.random() * 5;

      const colors = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#2d4059'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      buildingArray.push({
        id: `building_${i}`,
        position: [x, height / 2, z] as [number, number, number],
        size: [width, height, depth] as [number, number, number],
        color,
        hasWindows: Math.random() > 0.3,
        hasNeon: Math.random() > 0.5
      });
    }

    return buildingArray;
  }, []);

  const trees = useMemo(() => {
    const treeArray = [];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 15 + Math.random() * 40;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      treeArray.push({
        id: `tree_${i}`,
        position: [x, 0, z] as [number, number, number]
      });
    }
    return treeArray;
  }, []);

  const streetLights = useMemo(() => {
    const lights = [];
    const radius = 50;
    const count = 20;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      lights.push({
        id: `light_${i}`,
        position: [x, 0, z] as [number, number, number]
      });
    }
    return lights;
  }, []);

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[100, 64]} />
        <meshStandardMaterial
          color="#1a1a1a"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0, 100, 64]} />
        <meshStandardMaterial
          color="#2a2a2a"
          roughness={0.9}
          metalness={0.1}
          emissive="#0a0a0a"
          emissiveIntensity={0.2}
        />
      </mesh>

      {buildings.map(building => (
        <group key={building.id} position={building.position}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={building.size} />
            <meshStandardMaterial
              color={building.color}
              metalness={0.4}
              roughness={0.6}
            />
          </mesh>

          {building.hasWindows && (
            <>
              <mesh position={[0, 0, building.size[2] / 2 + 0.01]}>
                <boxGeometry args={[building.size[0] * 0.8, building.size[1] * 0.8, 0.1]} />
                <meshBasicMaterial
                  color="#001122"
                  transparent
                  opacity={0.6}
                />
              </mesh>

              <mesh position={[0, 0, -building.size[2] / 2 - 0.01]}>
                <boxGeometry args={[building.size[0] * 0.8, building.size[1] * 0.8, 0.1]} />
                <meshBasicMaterial
                  color="#001122"
                  transparent
                  opacity={0.6}
                />
              </mesh>
            </>
          )}

          {building.hasNeon && (
            <mesh position={[0, building.size[1] / 2 + 0.5, building.size[2] / 2 + 0.1]}>
              <boxGeometry args={[building.size[0] * 0.6, 0.8, 0.1]} />
              <meshBasicMaterial
                color="#00ffff"
                emissive="#00ffff"
                emissiveIntensity={2}
              />
              <pointLight
                position={[0, 0, 1]}
                color="#00ffff"
                intensity={2}
                distance={15}
              />
            </mesh>
          )}
        </group>
      ))}

      {trees.map(tree => (
        <group key={tree.id} position={tree.position}>
          <mesh castShadow position={[0, 2, 0]}>
            <cylinderGeometry args={[0.3, 0.4, 4, 8]} />
            <meshStandardMaterial color="#3d2817" />
          </mesh>

          <mesh castShadow position={[0, 5, 0]}>
            <coneGeometry args={[2, 4, 8]} />
            <meshStandardMaterial color="#1a4d2e" />
          </mesh>
        </group>
      ))}

      {streetLights.map(light => (
        <group key={light.id} position={light.position}>
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.1, 6, 8]} />
            <meshStandardMaterial color="#333333" />
          </mesh>

          <mesh position={[0, 6.5, 0]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshBasicMaterial
              color="#ffaa00"
              emissive="#ffaa00"
              emissiveIntensity={2}
            />
          </mesh>

          <pointLight
            position={[0, 6, 0]}
            color="#ffaa00"
            intensity={3}
            distance={20}
            castShadow
          />
        </group>
      ))}

      <gridHelper args={[200, 40, '#00ff88', '#003322']} position={[0, 0.02, 0]} />
    </group>
  );
};

export default MMOWorld;
