import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';
import type { GearLevel, ArchetypeId } from '../game/character';
import {
  archetypeAttachments,
  Attachment,
  ColorRole,
} from '../game/archetypeVisuals';
import {
  HIT_FLINCH,
  flinchStrength,
  collapseProgress,
  collapsePose,
} from '../game/hitReaction';

const MODEL_URL = '/models/soldier.glb';

// Blend thresholds (m/s): idle below WALK, run above RUN, walk in between.
const WALK_SPEED = 0.3;
const RUN_SPEED = 5;

// The soldier.glb second material zone — recolored for the accent2 swatch.
const VISOR_MAT = 'Vanguard_VisorMat';

interface CharacterModelProps {
  /** Ref the parent updates each frame with the character's current speed (m/s). */
  speedRef: React.MutableRefObject<number>;
  /** Base tint for the outfit, so local/remote players read differently. */
  tint?: string;
  /** Neon accent for hit emissive (character creator). */
  accent?: string;
  /** Secondary trim color applied to the visor zone and procedural gear trim. */
  accent2?: string;
  /** Exposed neck/skin tone. */
  skinTone?: string;
  /** Procedural gear tier layered over the base model. */
  gear?: GearLevel;
  /** Archetype whose procedural silhouette (scarf/plate/hood/coat) is drawn. */
  archetype?: ArchetypeId;
  /** Body scale from character creator. */
  bodyScale?: number;
  /** Optional ref that receives a "flash" trigger for hit feedback. */
  flashRef?: React.MutableRefObject<number>;
  /** When true, plays the procedural death collapse (Stage D). */
  deadRef?: React.MutableRefObject<boolean>;
}

interface GearRig {
  h: number;
  minY: number;
  headY: number;
  neckY: number;
  shoulderY: number;
  shoulderX: number;
  chestY: number;
  chestZ: number;
}

/** Colors resolved from the creator swatches, keyed by attachment ColorRole. */
type AttachmentColors = Record<ColorRole, string>;

/**
 * Per-archetype procedural silhouette (runner scarf/satchel, enforcer
 * plate/pauldron, ghost hood/visor, fixer coat/case). Recipe fractions are
 * resolved to world units against the measured rig: y is a floor-fraction
 * (minY + frac*h); x/z and all sizes are height-fractions. Data lives in
 * archetypeVisuals.ts so it stays pure and unit-tested.
 */
const ArchetypeAttachments: React.FC<{
  archetype: ArchetypeId;
  rig: GearRig;
  colors: AttachmentColors;
}> = ({ archetype, rig, colors }) => {
  const parts = archetypeAttachments(archetype);
  if (parts.length === 0) return null;
  const h = rig.h;
  const geom = (a: Attachment) => {
    if (a.kind === 'sphere') {
      return (
        <sphereGeometry
          args={[
            a.size[0] * h,
            16,
            12,
            0,
            Math.PI * 2,
            0,
            a.thetaLength ?? Math.PI,
          ]}
        />
      );
    }
    if (a.kind === 'cylinder') {
      return (
        <cylinderGeometry
          args={[a.size[0] * h, a.size[1] * h, a.size[2] * h, 12]}
        />
      );
    }
    return <boxGeometry args={[a.size[0] * h, a.size[1] * h, a.size[2] * h]} />;
  };
  return (
    <group>
      {parts.map((a, i) => (
        <mesh
          key={`${a.kind}-${i}`}
          position={[a.pos[0] * h, rig.minY + a.pos[1] * h, a.pos[2] * h]}
          rotation={a.rot ?? [0, 0, 0]}
          castShadow
        >
          {geom(a)}
          <meshStandardMaterial
            color={colors[a.color]}
            metalness={a.metalness ?? 0.3}
            roughness={a.roughness ?? 0.6}
          />
        </mesh>
      ))}
    </group>
  );
};

/**
 * Primitive-only armor layered over the base model. `light` adds shoulder
 * pauldrons + a chest plate; `heavy` adds those plus a helmet dome. Trim uses
 * the accent2 swatch so it reads as the same customization zone as the visor.
 */
const ProceduralGear: React.FC<{
  gear: GearLevel;
  accent2: string;
  rig: GearRig;
}> = ({ gear, accent2, rig }) => {
  if (gear === 'none') return null;
  const plate = new THREE.Color(accent2).multiplyScalar(0.6);
  const s = rig.h;
  return (
    <group>
      <mesh position={[-rig.shoulderX, rig.shoulderY, 0]} castShadow>
        <sphereGeometry args={[s * 0.09, 12, 12]} />
        <meshStandardMaterial color={plate} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[rig.shoulderX, rig.shoulderY, 0]} castShadow>
        <sphereGeometry args={[s * 0.09, 12, 12]} />
        <meshStandardMaterial color={plate} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, rig.chestY, rig.chestZ]} castShadow>
        <boxGeometry args={[s * 0.22, s * 0.2, s * 0.08]} />
        <meshStandardMaterial color={accent2} metalness={0.5} roughness={0.5} />
      </mesh>
      {gear === 'heavy' && (
        <mesh position={[0, rig.headY, 0]} castShadow>
          <sphereGeometry
            args={[s * 0.08, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6]}
          />
          <meshStandardMaterial
            color={plate}
            metalness={0.7}
            roughness={0.35}
          />
        </mesh>
      )}
    </group>
  );
};

/**
 * Rigged, animated humanoid (CC0-friendly three.js example Soldier).
 * Crossfades Idle / Walk / Run from a speed ref without React re-renders,
 * SkeletonUtils-cloned so any number of players can share one loaded asset.
 */
const CharacterModel: React.FC<CharacterModelProps> = ({
  speedRef,
  tint = '#d4d5d8',
  accent = '#c03a30',
  accent2 = '#2b2f36',
  skinTone = '#e0b48c',
  gear = 'none',
  archetype,
  bodyScale = 1,
  flashRef,
  deadRef,
}) => {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL_URL);

  // Clone with skeleton so every player instance animates independently.
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, mixer } = useAnimations(animations, group);
  const current = useRef<string>('Idle');
  const materials = useRef<THREE.MeshStandardMaterial[]>([]);
  // Seconds since death started; -1 while alive (collapse not running).
  const deathClock = useRef(-1);

  // Flinch targets resolved once per clone; missing bones are skipped so a
  // future rig swap can never crash the frame loop. GLTFLoader sanitizes
  // node names (strips ':'), so look up the sanitized spelling first.
  const flinchBones = useMemo(() => {
    const found: { bone: THREE.Bone; amplitude: [number, number, number] }[] =
      [];
    for (const f of HIT_FLINCH) {
      const obj =
        clone.getObjectByName(f.bone.replace(/:/g, '')) ??
        clone.getObjectByName(f.bone);
      if (obj && (obj as THREE.Bone).isBone) {
        found.push({ bone: obj as THREE.Bone, amplitude: f.amplitude });
      }
    }
    return found;
  }, [clone]);

  // Anchor points for procedural gear, derived once from the model's bounds.
  // Horizontal offsets use height fractions (not the raw width) so a T/A-pose
  // bind arm span never pushes shoulder plates out to the fingertips.
  const rig = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clone);
    const minY = box.min.y;
    const maxY = box.max.y;
    const h = Math.max(0.001, maxY - minY);
    return {
      h,
      minY,
      headY: maxY - h * 0.05,
      neckY: minY + h * 0.82,
      shoulderY: minY + h * 0.8,
      shoulderX: h * 0.17,
      chestY: minY + h * 0.66,
      chestZ: h * 0.1,
    };
  }, [clone]);

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
        // Visor is the second material zone → drive it from the accent2 swatch;
        // the body zone keeps the multiplicative tint.
        if (src.name === VISOR_MAT || mesh.name === 'vanguard_visor') {
          mat.color.set(accent2);
        } else {
          mat.color.multiply(new THREE.Color(tint));
        }
        mat.emissive = new THREE.Color(accent);
        mat.emissiveIntensity = 0;
        mesh.material = mat;
        mats.push(mat);
      }
    });
    materials.current = mats;
  }, [clone, tint, accent, accent2]);

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

    // Additive hit flinch: the mixer (registered by useAnimations before this
    // callback) has already posed the skeleton this frame, so nudging bone
    // rotations here layers recoil on top of Idle/Walk/Run. Skipped while
    // dead — a frozen mixer stops rewriting poses, so nudges would accumulate.
    const flinch = deadRef?.current
      ? 0
      : flinchStrength(flashRef?.current ?? 0);
    if (flinch > 0.001) {
      for (const { bone, amplitude } of flinchBones) {
        bone.rotation.x += amplitude[0] * flinch;
        bone.rotation.y += amplitude[1] * flinch;
        bone.rotation.z += amplitude[2] * flinch;
      }
    }

    // Death collapse: pitch the whole model around the feet while the
    // animation freezes. Respawn remounts the player (spawnKey), so the
    // reset branch only matters if health is restored without a remount.
    const g = group.current;
    if (deadRef?.current) {
      deathClock.current =
        deathClock.current < 0 ? 0 : deathClock.current + delta;
      const pose = collapsePose(collapseProgress(deathClock.current));
      if (g) {
        g.rotation.x = pose.pitch;
        g.position.y = -pose.sink * rig.h;
      }
      mixer.timeScale *= pose.mixerScale;
    } else if (deathClock.current >= 0) {
      deathClock.current = -1;
      if (g) {
        g.rotation.x = 0;
        g.position.y = 0;
      }
    }
  });

  return (
    <group ref={group} scale={bodyScale}>
      <primitive object={clone} />
      {/* Exposed skin at the neck so skinTone reads on the base model. */}
      <mesh position={[0, rig.neckY, 0]}>
        <cylinderGeometry
          args={[rig.h * 0.05, rig.h * 0.05, rig.h * 0.05, 10]}
        />
        <meshStandardMaterial color={skinTone} roughness={0.8} />
      </mesh>
      <ProceduralGear gear={gear} accent2={accent2} rig={rig} />
      {archetype && (
        <ArchetypeAttachments
          archetype={archetype}
          rig={rig}
          colors={{ tint, accent, accent2, skin: skinTone }}
        />
      )}
    </group>
  );
};

useGLTF.preload(MODEL_URL);

export default CharacterModel;
