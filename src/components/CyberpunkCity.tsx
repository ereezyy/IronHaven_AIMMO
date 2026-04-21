import React, { useMemo } from 'react';

// Cyberpunk City Environment
const CyberpunkCity = () => {
  const buildings = useMemo(() => {
    const buildingArray = [];
    for (let i = 0; i < 20; i++) {
      buildingArray.push({
        position: [
          (Math.random() - 0.5) * 100,
          Math.random() * 20 + 5,
          (Math.random() - 0.5) * 100,
        ] as [number, number, number],
        scale: [
          2 + Math.random() * 4,
          10 + Math.random() * 20,
          2 + Math.random() * 4,
        ] as [number, number, number],
        color: Math.random() > 0.5 ? '#0066ff' : '#ff0066',
      });
    }
    return buildingArray;
  }, []);

  return (
    <group>
      {/* Ground */}
      <mesh position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#111111" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Buildings */}
      {buildings.map((building, index) => (
        <mesh
          key={index}
          position={building.position}
          scale={building.scale}
          castShadow
        >
          <boxGeometry />
          <meshStandardMaterial
            color={building.color}
            emissive={building.color}
            emissiveIntensity={0.1}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
      ))}

      {/* Neon Grid Lines */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <group key={`grid-${i}`}>
          <mesh position={[i * 10 - 45, 0.1, 0]}>
            <planeGeometry args={[0.1, 100]} />
            <meshBasicMaterial
              color="#00ffff"
              emissive="#00ffff"
              emissiveIntensity={0.5}
              transparent
              opacity={0.6}
            />
          </mesh>
          <mesh position={[0, 0.1, i * 10 - 45]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.1, 100]} />
            <meshBasicMaterial
              color="#ff00ff"
              emissive="#ff00ff"
              emissiveIntensity={0.5}
              transparent
              opacity={0.6}
            />
          </mesh>
        </group>
      ))}

      {/* Floating platforms */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={`platform-${i}`}
          position={[
            (Math.random() - 0.5) * 60,
            5 + Math.random() * 10,
            (Math.random() - 0.5) * 60,
          ]}
          castShadow
        >
          <cylinderGeometry args={[3, 3, 0.5]} />
          <meshStandardMaterial
            color="#333333"
            emissive="#00ffff"
            emissiveIntensity={0.2}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
};

export default CyberpunkCity;
