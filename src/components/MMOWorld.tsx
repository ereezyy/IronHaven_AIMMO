import React, { useMemo } from 'react';
import { MeshReflectorMaterial, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import {
  BuildingSkin,
  CITY_BUILDINGS,
  CITY_TREES,
  CITY_STREET_LIGHTS,
} from '../game/cityLayout';
import CityProps from './CityProps';

// --- free CC0 Poly Haven PBR maps (served from /public/textures) ---

type SkinMaps = {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
};

function prepMaps(maps: THREE.Texture[], repeat: number) {
  for (const t of maps) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = 4;
  }
  maps[0].colorSpace = THREE.SRGBColorSpace;
}

// Textured asphalt ground using CC0 Poly Haven maps served from /public.
// Split out so its useTexture suspense is scoped to the ground only.
const Ground: React.FC = () => {
  const [map, normalMap, roughnessMap] = useTexture([
    '/textures/ground/asphalt_diff_1k.jpg',
    '/textures/ground/asphalt_nor_1k.jpg',
    '/textures/ground/asphalt_rough_1k.jpg',
  ]);

  useMemo(() => {
    prepMaps([map, normalMap, roughnessMap], 28);
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

/** Shared facade skins so 50 towers reuse 4 material sets, not 50. */
const BuildingSkins: React.FC<{
  children: (skins: Record<BuildingSkin, SkinMaps>) => React.ReactNode;
}> = ({ children }) => {
  const [
    cDiff,
    cNor,
    cRough,
    pDiff,
    pNor,
    pRough,
    mDiff,
    mNor,
    mRough,
    iDiff,
    iNor,
    iRough,
  ] = useTexture([
    '/textures/buildings/concrete_wall_008_diff_1k.jpg',
    '/textures/buildings/concrete_wall_008_nor_1k.jpg',
    '/textures/buildings/concrete_wall_008_rough_1k.jpg',
    '/textures/buildings/painted_plaster_wall_diff_1k.jpg',
    '/textures/buildings/painted_plaster_wall_nor_1k.jpg',
    '/textures/buildings/painted_plaster_wall_rough_1k.jpg',
    '/textures/metal/metal_plate_diff_1k.jpg',
    '/textures/metal/metal_plate_nor_1k.jpg',
    '/textures/metal/metal_plate_rough_1k.jpg',
    '/textures/metal/corrugated_iron_02_diff_1k.jpg',
    '/textures/metal/corrugated_iron_02_nor_1k.jpg',
    '/textures/metal/corrugated_iron_02_rough_1k.jpg',
  ]);

  const skins = useMemo(() => {
    prepMaps([cDiff, cNor, cRough], 2.5);
    prepMaps([pDiff, pNor, pRough], 2.2);
    prepMaps([mDiff, mNor, mRough], 3);
    prepMaps([iDiff, iNor, iRough], 2.8);
    return {
      concrete: { map: cDiff, normalMap: cNor, roughnessMap: cRough },
      plaster: { map: pDiff, normalMap: pNor, roughnessMap: pRough },
      metal: { map: mDiff, normalMap: mNor, roughnessMap: mRough },
      corrugated: { map: iDiff, normalMap: iNor, roughnessMap: iRough },
    } satisfies Record<BuildingSkin, SkinMaps>;
  }, [
    cDiff,
    cNor,
    cRough,
    pDiff,
    pNor,
    pRough,
    mDiff,
    mNor,
    mRough,
    iDiff,
    iNor,
    iRough,
  ]);

  return <>{children(skins)}</>;
};

const metalnessFor = (skin: BuildingSkin) =>
  skin === 'metal' || skin === 'corrugated' ? 0.75 : 0.15;

const MMOWorld: React.FC = () => {
  const buildings = CITY_BUILDINGS;
  const trees = CITY_TREES;
  const streetLights = CITY_STREET_LIGHTS;

  return (
    <group>
      <Ground />

      <BuildingSkins>
        {(skins) =>
          buildings.map((building) => {
            const skin = skins[building.skin];
            return (
              <group key={building.id} position={building.position}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={building.size} />
                  <meshStandardMaterial
                    map={skin.map}
                    normalMap={skin.normalMap}
                    roughnessMap={skin.roughnessMap}
                    color={building.color}
                    metalness={metalnessFor(building.skin)}
                    roughness={1}
                  />
                </mesh>

                {building.hasWindows && (
                  <>
                    <mesh position={[0, 0, building.size[2] / 2 + 0.02]}>
                      <boxGeometry
                        args={[
                          building.size[0] * 0.75,
                          building.size[1] * 0.75,
                          0.08,
                        ]}
                      />
                      <meshStandardMaterial
                        color="#050810"
                        emissive="#1a4060"
                        emissiveIntensity={0.55}
                        metalness={0.9}
                        roughness={0.2}
                        transparent
                        opacity={0.85}
                        toneMapped={false}
                      />
                    </mesh>

                    <mesh position={[0, 0, -building.size[2] / 2 - 0.02]}>
                      <boxGeometry
                        args={[
                          building.size[0] * 0.75,
                          building.size[1] * 0.75,
                          0.08,
                        ]}
                      />
                      <meshStandardMaterial
                        color="#050810"
                        emissive="#1a4060"
                        emissiveIntensity={0.4}
                        metalness={0.9}
                        roughness={0.2}
                        transparent
                        opacity={0.8}
                        toneMapped={false}
                      />
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
            );
          })
        }
      </BuildingSkins>

      {/* CC0 Poly Haven street clutter (barrels, hydrants, crates, …). */}
      <CityProps />

      {trees.map((tree) => (
        <group key={tree.id} position={tree.position}>
          <mesh castShadow position={[0, 2, 0]}>
            <cylinderGeometry args={[0.3, 0.4, 4, 8]} />
            <meshStandardMaterial color="#3d2817" roughness={0.9} />
          </mesh>

          <mesh castShadow position={[0, 5, 0]}>
            <coneGeometry args={[2, 4, 8]} />
            <meshStandardMaterial color="#1c2a20" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {streetLights.map((light) => (
        <group key={light.id} position={light.position}>
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.1, 6, 8]} />
            <meshStandardMaterial
              color="#333333"
              metalness={0.7}
              roughness={0.4}
            />
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
