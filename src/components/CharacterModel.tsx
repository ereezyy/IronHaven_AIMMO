import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';

const MODEL_URL = '/models/soldier.glb';

// Blend thresholds (m/s): idle below WALK, run above RUN, walk in between.
const WALK_SPEED = 0.3;
const RUN_SPEED = 5;

interface CharacterModelProps {
  /** Ref the parent updates each frame with the character's current speed (m/s). */
  speedRef: React.MutableRefObject<number>;
  /** Base tint for the outfit, so local/remote players read differently. */
  tint?: string;
  /** Optional ref that receives a "flash" trigger for hit feedback. */
  flashRef?: React.MutableRefObject<number>;
}

/**
 * Rigged, animated humanoid (CC0-friendly three.js example Soldier).
 * Crossfades Idle / Walk / Run from a speed ref without React re-renders,
 * SkeletonUtils-cloned so any number of players can share one loaded asset.
 */
const CharacterModel: React.FC<CharacterModelProps> = ({
  speedRef,
  tint = '#d4d5d8',
  flashRef,
}) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL_URL);

  // Clone with skeleton so every player instance animates independently.
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, mixer } = useAnimations(animations, group);
  const current = useRef<string>('Idle');
  const materials = useRef<THREE.MeshStandardMaterial[]>([]);

  useEffect(() => {
    const mats: THREE.MeshStandardMaterial[] = [];
    clone.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // Clone materials per instance so tint/flash don't leak across players.
        const src = mesh.material as THREE.MeshStandardMaterial;
        const mat = src.clone();
        mat.color.multiply(new THREE.Color(tint));
        mat.emissive = new THREE.Color('#c03a30');
        mat.emissiveIntensity = 0;
        mesh.material = mat;
        mats.push(mat);
      }
    });
    materials.current = mats;
  }, [clone, tint]);

  useEffect(() => {
    actions.Idle?.play();
    current.current = 'Idle';
  }, [actions]);

  useFrame((_, delta) => {
    const speed = speedRef.current;
    const next =
      speed > RUN_SPEED ? 'Run' : speed > WALK_SPEED ? 'Walk' : 'Idle';

    if (next !== current.current) {
      const from = actions[current.current];
      const to = actions[next];
      if (to) {
        to.reset().play();
        if (from) to.crossFadeFrom(from, 0.25, false);
        current.current = next;
      }
    }

    // Scale playback so foot speed roughly tracks ground speed.
    if (current.current === 'Walk') mixer.timeScale = Math.max(0.6, speed / 2);
    else if (current.current === 'Run')
      mixer.timeScale = Math.max(0.8, speed / 6);
    else mixer.timeScale = 1;

    // Hit flash: decay emissive without touching React state.
    if (flashRef && flashRef.current > 0) {
      flashRef.current = Math.max(0, flashRef.current - delta * 4);
      for (const mat of materials.current) {
        mat.emissiveIntensity = flashRef.current;
      }
    }
  });

  return (
    <group ref={group}>
      <primitive object={clone} />
    </group>
  );
};

useGLTF.preload(MODEL_URL);

export default CharacterModel;
