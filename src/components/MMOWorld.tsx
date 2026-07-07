import React, { useMemo } from 'react';
import { MeshReflectorMaterial, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import {
  CITY_BUILDINGS,
  CITY_TREES,
  CITY_STREET_LIGHTS,
} from '../game/cityLayout';

// Textured asphalt ground using CC0 Poly Haven maps served from /public.
// Split out so its useTexture suspense is scoped to the ground only.
const Ground: React.FC = () => {
  const [map, normalMap, roughnessMap] = useTexture([
    '/textures/ground/asphalt_diff_1k.jpg',
    '/textures/ground/asphalt_nor_1k.jpg',
    '/textures/ground/asphalt_rough_1k.jpg',
  ]);

  useMemo(() => {
    for (const t of [map, normalMap, roughnessMap]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(28, 28);
      t.anisotropy = 4;
    }
    map.colorSpace = THREE.SRGBColorSpace;
  }, [map, normalMap, roughnessMap]);

  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <circleGeometry args={[100, 64]} />
      {/* Rain-slick asphalt: real-time planar reflections make the neon
          signs and street lamps mirror in the street — the single biggest
          "modern game" realism cue for a night city. */}
      <MeshReflectorMaterial
        map={map}
        normalMap={normalMap}
        roughnessMap={roughnessMap}
        color="#565b66"
        metalness={0.4}
        roughness={1}
        mirror={0.45}
        resolution={512}
        blur={[300, 100]}
        mixBlur={1}
        mixStrength={4.5}
        depthScale={1.1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        depthToBlurRatioBias={0.3}
      />
    </mesh>
  );
};

const MMOWorld: React.FC = () => {
  // Shared deterministic layout: the same data drives the 3D meshes here and
  // the HUD minimap, so the map is always truthful.
  const buildings = CITY_BUILDINGS;
  const trees = CITY_TREES;
  const streetLights = CITY_STREET_LIGHTS;

  return (
    <group>
      <Ground />

      {buildings.map((building) => (
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
                <boxGeometry
                  args={[building.size[0] * 0.8, building.size[1] * 0.8, 0.1]}
                />
                <meshBasicMaterial color="#001122" transparent opacity={0.6} />
              </mesh>

              <mesh position={[0, 0, -building.size[2] / 2 - 0.01]}>
                <boxGeometry
                  args={[building.size[0] * 0.8, building.size[1] * 0.8, 0.1]}
                />
                <meshBasicMaterial color="#001122" transparent opacity={0.6} />
              </mesh>
            </>
          )}

          {building.hasNeon && (
            <mesh
              position={[
                0,
                building.size[1] / 2 + 0.5,
                building.size[2] / 2 + 0.1,
              ]}
            >
              <boxGeometry args={[building.size[0] * 0.6, 0.5, 0.1]} />
              {/* toneMapped=false keeps the sign above the bloom threshold so
                  it reads as a self-lit source, not a flatly coloured box. */}
              <meshStandardMaterial
                color="#050506"
                emissive={building.neonColor}
                emissiveIntensity={2.6}
                toneMapped={false}
              />
              <pointLight
                position={[0, 0, 1]}
                color={building.neonColor}
                intensity={1.1}
                distance={14}
              />
            </mesh>
          )}
        </group>
      ))}

      {trees.map((tree) => (
        <group key={tree.id} position={tree.position}>
          <mesh castShadow position={[0, 2, 0]}>
            <cylinderGeometry args={[0.3, 0.4, 4, 8]} />
            <meshStandardMaterial color="#3d2817" />
          </mesh>

          <mesh castShadow position={[0, 5, 0]}>
            <coneGeometry args={[2, 4, 8]} />
            <meshStandardMaterial color="#1c2a20" />
          </mesh>
        </group>
      ))}

      {streetLights.map((light) => (
        <group key={light.id} position={light.position}>
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.1, 6, 8]} />
            <meshStandardMaterial color="#333333" />
          </mesh>

          <mesh position={[0, 6.5, 0]}>
            <boxGeometry args={[0.4, 0.4, 0.4]} />
            <meshStandardMaterial
              color="#050506"
              emissive="#ffcf8a"
              emissiveIntensity={2.2}
              toneMapped={false}
            />
          </mesh>

          <pointLight
            position={[0, 6, 0]}
            color="#caa066"
            intensity={1.4}
            distance={16}
            castShadow
          />
        </group>
      ))}
    </group>
  );
};

export default MMOWorld;
