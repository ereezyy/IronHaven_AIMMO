import React, { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { DEFAULT_SLOT_ATTACH, type AvatarPartDef } from '../game/avatarParts';

// The soldier's "Character" root node carries a uniform 0.01 scale, so
// bone-local space is centimeters. Attach transforms are authored in world
// meters; multiplying position and scale by 100 cancels that root scale.
const CM_PER_M = 100;

interface AvatarPartAttachmentProps {
  /** Cloned soldier scene whose skeleton the part parents to. */
  root: THREE.Object3D;
  def: AvatarPartDef;
}

/**
 * Parents one rigid part GLB to a bone of an already-cloned soldier rig.
 * Renders nothing itself — the mesh lives in the bone's subtree — so it can
 * sit anywhere under the model's existing Suspense (useGLTF suspends).
 */
const AvatarPartAttachment: React.FC<AvatarPartAttachmentProps> = ({
  root,
  def,
}) => {
  const { scene } = useGLTF(def.url);
  const attach = def.attach ?? DEFAULT_SLOT_ATTACH[def.slot];

  const group = useMemo(() => {
    if (!attach) return null;
    const g = new THREE.Group();
    // Plain deep clone: kit parts are rigid props, no skinning to preserve.
    const part = scene.clone(true);
    part.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        // Clone materials so per-player tint/flash edits can't leak in.
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((m) => m.clone())
          : mesh.material.clone();
      }
    });
    g.add(part);
    g.position.set(
      attach.pos[0] * CM_PER_M,
      attach.pos[1] * CM_PER_M,
      attach.pos[2] * CM_PER_M
    );
    g.rotation.set(attach.rot[0], attach.rot[1], attach.rot[2]);
    g.scale.setScalar(attach.scale * CM_PER_M);
    return g;
  }, [scene, attach]);

  useEffect(() => {
    if (!group || !attach) return;
    // GLTFLoader strips ':' from node names — try the sanitized spelling
    // first, colon form as fallback (same pattern as the flinch bones).
    const bone =
      root.getObjectByName(attach.bone.replace(/:/g, '')) ??
      root.getObjectByName(attach.bone);
    if (!bone) return;
    bone.add(group);
    return () => {
      bone.remove(group);
    };
  }, [root, group, attach]);

  return null;
};

export default AvatarPartAttachment;
