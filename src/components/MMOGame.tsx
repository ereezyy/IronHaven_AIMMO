import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Sky, KeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameState';
import { supabase } from '../lib/supabase';
import MMOPlayer from './MMOPlayer';
import MMOWorld from './MMOWorld';
import MMOHUD from './MMOHUD';
import MMOChat from './MMOChat';

interface OtherPlayer {
  id: string;
  username: string;
  position: [number, number, number];
  rotation: number;
  health: number;
  level: number;
  lastSeen: number;
}

const ThirdPersonCamera: React.FC<{
  target: THREE.Vector3;
  playerRotation: number;
}> = ({ target, playerRotation }) => {
  const { camera } = useThree();
  const [cameraDistance, setCameraDistance] = useState(5);
  const [cameraHeight, setCameraHeight] = useState(2);
  const [cameraPitch, setCameraPitch] = useState(-0.3);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setCameraDistance(prev => Math.max(2, Math.min(15, prev + e.deltaY * 0.01)));
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  useFrame(() => {
    const offset = new THREE.Vector3(
      Math.sin(playerRotation) * cameraDistance,
      cameraHeight,
      Math.cos(playerRotation) * cameraDistance
    );

    const idealPosition = new THREE.Vector3().copy(target).add(offset);
    const lerpSpeed = 0.1;

    camera.position.lerp(idealPosition, lerpSpeed);

    const lookAtPoint = new THREE.Vector3(
      target.x,
      target.y + 1.5,
      target.z
    );
    camera.lookAt(lookAtPoint);
  });

  return null;
};

const MMOGame: React.FC = () => {
  const gameStore = useGameStore();
  const [otherPlayers, setOtherPlayers] = useState<OtherPlayer[]>([]);
  const [playerId] = useState(() => `player_${Math.random().toString(36).substr(2, 9)}`);
  const [playerPosition, setPlayerPosition] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [playerRotation, setPlayerRotation] = useState(0);
  const channelRef = useRef<any>(null);
  const lastBroadcast = useRef(0);

  useEffect(() => {
    gameStore.initializePlayer(`Player_${playerId.slice(-4)}`);

    const channel = supabase.channel('game-world', {
      config: {
        broadcast: { self: false },
        presence: { key: playerId }
      }
    });

    channel
      .on('broadcast', { event: 'player-move' }, ({ payload }) => {
        if (payload.id !== playerId) {
          setOtherPlayers(prev => {
            const existing = prev.find(p => p.id === payload.id);
            const now = Date.now();

            if (existing) {
              return prev.map(p =>
                p.id === payload.id
                  ? { ...p, ...payload, lastSeen: now }
                  : p
              );
            } else {
              return [...prev, { ...payload, lastSeen: now }];
            }
          });
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('Players online:', Object.keys(state).length);
      })
      .subscribe();

    channelRef.current = channel;

    const cleanupInterval = setInterval(() => {
      setOtherPlayers(prev =>
        prev.filter(p => Date.now() - p.lastSeen < 5000)
      );
    }, 1000);

    return () => {
      channel.unsubscribe();
      clearInterval(cleanupInterval);
    };
  }, [playerId, gameStore]);

  const broadcastPosition = (position: THREE.Vector3, rotation: number) => {
    const now = Date.now();
    if (now - lastBroadcast.current < 50) return;

    lastBroadcast.current = now;

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'player-move',
        payload: {
          id: playerId,
          username: gameStore.playerId || 'Player',
          position: [position.x, position.y, position.z],
          rotation: rotation,
          health: gameStore.playerStats.health,
          level: 1
        }
      });
    }
  };

  const handlePlayerUpdate = (position: THREE.Vector3, rotation: number) => {
    setPlayerPosition(position);
    setPlayerRotation(rotation);
    gameStore.setPlayerPosition([position.x, position.y, position.z]);
    broadcastPosition(position, rotation);
  };

  return (
    <div className="w-full h-screen bg-black relative">
      <KeyboardControls
        map={[
          { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
          { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
          { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
          { name: 'right', keys: ['KeyD', 'ArrowRight'] },
          { name: 'jump', keys: ['Space'] },
          { name: 'sprint', keys: ['ShiftLeft'] },
          { name: 'interact', keys: ['KeyE'] },
          { name: 'attack', keys: ['Mouse0'] },
        ]}
      >
        <Canvas
          shadows
          camera={{ position: [0, 5, 10], fov: 75 }}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            alpha: false
          }}
        >
          <Sky
            distance={450000}
            sunPosition={[100, 20, 100]}
            inclination={0.6}
            azimuth={0.25}
          />

          <ambientLight intensity={0.5} />
          <directionalLight
            position={[50, 50, 25]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={100}
            shadow-camera-left={-50}
            shadow-camera-right={50}
            shadow-camera-top={50}
            shadow-camera-bottom={-50}
          />

          <fog attach="fog" args={['#000000', 50, 200]} />

          <MMOWorld />

          <MMOPlayer
            playerId={playerId}
            onUpdate={handlePlayerUpdate}
          />

          {otherPlayers.map(player => (
            <group key={player.id} position={player.position}>
              <mesh castShadow>
                <capsuleGeometry args={[0.5, 1.5, 8, 16]} />
                <meshStandardMaterial color="#00ff88" />
              </mesh>

              <mesh position={[0, 2, 0]}>
                <boxGeometry args={[0.05, 0.5, 0.05]} />
                <meshBasicMaterial color="#ff0000" />
              </mesh>

              <mesh position={[0, 2.5, 0]}>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshBasicMaterial color="#ffff00" />
              </mesh>
            </group>
          ))}

          <ThirdPersonCamera
            target={playerPosition}
            playerRotation={playerRotation}
          />
        </Canvas>
      </KeyboardControls>

      <MMOHUD
        health={gameStore.playerStats.health}
        stamina={100}
        mana={100}
        level={1}
        experience={0}
        maxExperience={100}
        playersOnline={otherPlayers.length + 1}
      />

      <MMOChat />

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-center bg-black/70 px-6 py-3 rounded-lg">
        <div className="text-sm mb-1">WASD - Move | Space - Jump | Shift - Sprint | Mouse - Look Around</div>
        <div className="text-xs text-gray-400">Scroll to zoom camera | ESC to unlock cursor</div>
      </div>
    </div>
  );
};

export default MMOGame;
