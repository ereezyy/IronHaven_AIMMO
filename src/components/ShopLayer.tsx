import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  WORLD_SHOPS,
  SHOP_RANGE,
  type WorldShop,
  isResourceId,
} from '../game/shops';
import { useGameStore } from '../store/gameState';
import { gameAudio } from '../lib/gameAudio';
import type { ResourceId } from '../game/economy';

interface ShopLayerProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  nearestRef: React.MutableRefObject<WorldShop | null>;
  onNearest: (s: WorldShop | null) => void;
}

export const ShopLayer: React.FC<ShopLayerProps> = ({
  playerPosRef,
  nearestRef,
  onNearest,
}) => {
  useFrame(() => {
    const p = playerPosRef.current;
    let best: WorldShop | null = null;
    let bestSq = SHOP_RANGE * SHOP_RANGE;
    for (const s of WORLD_SHOPS) {
      const dx = s.position[0] - p.x;
      const dz = s.position[2] - p.z;
      const d = dx * dx + dz * dz;
      if (d < bestSq) {
        bestSq = d;
        best = s;
      }
    }
    if (nearestRef.current?.id !== best?.id) {
      nearestRef.current = best;
      onNearest(best);
    }
  });

  return (
    <group>
      {WORLD_SHOPS.map((s) => (
        <group key={s.id} position={s.position}>
          <mesh castShadow position={[0, 1.2, 0]}>
            <boxGeometry args={[2.4, 2.4, 2.4]} />
            <meshStandardMaterial
              color="#15171a"
              metalness={0.4}
              roughness={0.55}
            />
          </mesh>
          <mesh position={[0, 2.6, 1.25]}>
            <boxGeometry args={[2, 0.45, 0.12]} />
            <meshStandardMaterial
              color="#050506"
              emissive={s.color}
              emissiveIntensity={2}
              toneMapped={false}
            />
          </mesh>
          <pointLight
            position={[0, 2.2, 1.5]}
            color={s.color}
            intensity={0.9}
            distance={10}
          />
        </group>
      ))}
    </group>
  );
};

interface ShopUIProps {
  shop: WorldShop;
  onClose: () => void;
}

export const ShopUI: React.FC<ShopUIProps> = ({ shop, onClose }) => {
  const money = useGameStore((s) => s.playerStats.money);
  const factionId = useGameStore((s) => s.factionId);
  const standing = useGameStore((s) => s.factionStanding);

  const skillDisc = useGameStore.getState().getModifiers().shopDiscount;
  const passActive = useGameStore.getState().isPassActive();
  const passDisc = passActive ? 0.1 : 0;
  const allyDiscount = Math.max(
    0.5,
    (shop.factionId && shop.factionId === factionId
      ? 0.85
      : shop.factionId &&
          (standing[shop.factionId as keyof typeof standing] || 0) > 40
        ? 0.92
        : 1) -
      skillDisc -
      passDisc
  );

  const purchase = (listPrice: number, effect: () => void) => {
    const cost = Math.round(listPrice * allyDiscount);
    const s = useGameStore.getState();
    if (s.playerStats.money < cost) return;
    s.updateStats({ money: s.playerStats.money - cost });
    effect();
    gameAudio.play('market', 0.2);
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center font-mono bg-black/55 backdrop-blur-[2px]">
      <div className="w-full max-w-md mx-4 border border-[#222428] bg-[#08080a]/96 backdrop-blur-md shadow-2xl">
        <div className="flex justify-between border-b border-[#1a1c1f] px-4 py-3">
          <span className="text-[11px] tracking-[0.22em] uppercase text-neutral-200">
            {shop.name}
          </span>
          <span className="text-[11px] text-neutral-500">
            ${money}
            {allyDiscount < 1 && (
              <span className="ml-2" style={{ color: shop.color }}>
                −{Math.round((1 - allyDiscount) * 100)}%
                {passActive ? ' · pass' : ''}
              </span>
            )}
          </span>
        </div>
        <div className="p-3 space-y-1 max-h-72 overflow-y-auto">
          {shop.items.map((item) => {
            const list = item.price;
            const price = Math.round(list * allyDiscount);
            const canAfford = money >= price;
            return (
              <button
                key={item.id + item.name}
                disabled={!canAfford}
                onClick={() => {
                  if (!canAfford) return;
                  if (item.kind === 'resource' && isResourceId(item.id)) {
                    purchase(item.price, () => {
                      useGameStore.getState().harvestIntoBag({
                        [item.id]: 1,
                      } as Partial<Record<ResourceId, number>>);
                    });
                    return;
                  }
                  if (item.kind === 'weapon') {
                    purchase(item.price, () => {
                      const st = useGameStore.getState();
                      st.addInventoryItem(item.id);
                      st.setCurrentWeaponId(item.id);
                    });
                    return;
                  }
                  if (item.service === 'heal') {
                    purchase(item.price, () => {
                      const st = useGameStore.getState();
                      const heal = item.price >= 400 ? 100 : 50;
                      st.updateStats({
                        health: Math.min(100, st.playerStats.health + heal),
                      });
                    });
                    return;
                  }
                  if (item.service === 'clear_heat') {
                    purchase(item.price, () => {
                      useGameStore.getState().updateStats({ wanted: 0 });
                    });
                    return;
                  }
                  if (item.service === 'repair') {
                    purchase(item.price, () => {
                      const st = useGameStore.getState();
                      st.updateStats({
                        health: Math.min(100, st.playerStats.health + 25),
                      });
                    });
                  }
                }}
                className={`w-full flex justify-between items-center px-3 py-2 text-[12px] border ${
                  canAfford
                    ? 'text-neutral-300 border-[#141517] hover:border-[#333]'
                    : 'text-neutral-600 border-[#0e0f11] opacity-70 cursor-not-allowed'
                }`}
              >
                <span>{item.name}</span>
                <span className="text-right">
                  <span style={{ color: canAfford ? '#cfcfd2' : '#c03a30' }}>
                    ${price}
                  </span>
                  {list !== price && (
                    <span className="ml-2 text-neutral-600 line-through">
                      ${list}
                    </span>
                  )}
                  {!canAfford && (
                    <span className="ml-2 text-[9px] tracking-[0.15em] uppercase text-neutral-600">
                      short ${price - money}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="w-full border-t border-[#1a1c1f] py-3 text-[11px] tracking-[0.2em] uppercase text-neutral-500"
        >
          close [esc]
        </button>
      </div>
    </div>
  );
};

export default ShopLayer;
