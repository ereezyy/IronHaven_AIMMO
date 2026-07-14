import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  CITY_STREET_PROPS,
  CityPropKind,
  CityStreetProp,
  propModelUrl,
} from '../game/cityLayout';

// Free CC0 Poly Haven props — one shared load per kind, cloned into the
// district so 48 placements don't mean 48 network requests.

const PROP_KINDS = Array.from(
  new Set(CITY_STREET_PROPS.map((p) => p.kind))
) as CityPropKind[];

function PropMesh({
  prop,
  scene,
}: {
  prop: CityStreetProp;
  scene: THREE.Object3D;
}) {
  const clone = useMemo(() => {
    // Deep clone geometry + materials for static props (no skinned meshes).
    const c = scene.clone(true);
    c.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  return (
    <primitive
      object={clone}
      position={prop.position}
      rotation={[0, prop.rotation, 0]}
      scale={prop.scale}
    />
  );
}

const KindInstances: React.FC<{
  kind: CityPropKind;
  items: CityStreetProp[];
}> = ({ kind, items }) => {
  const { scene } = useGLTF(propModelUrl(kind));
  return (
    <>
      {items.map((prop) => (
        <PropMesh key={prop.id} prop={prop} scene={scene} />
      ))}
    </>
  );
};

/**
 * Street clutter from free Poly Haven models: barrels, hydrants, crates,
 * trash, barriers, propane tanks, and a few real street lamps.
 */
const CityProps: React.FC = () => {
  const byKind = useMemo(() => {
    const map = new Map<CityPropKind, CityStreetProp[]>();
    for (const p of CITY_STREET_PROPS) {
      const list = map.get(p.kind) ?? [];
      list.push(p);
      map.set(p.kind, list);
    }
    return map;
  }, []);

  return (
    <group>
      {PROP_KINDS.map((kind) => {
        const items = byKind.get(kind);
        if (!items?.length) return null;
        return <KindInstances key={kind} kind={kind} items={items} />;
      })}
    </group>
  );
};

// Warm the loader so the world gate includes prop meshes.
for (const kind of PROP_KINDS) {
  useGLTF.preload(propModelUrl(kind));
}

export default CityProps;
