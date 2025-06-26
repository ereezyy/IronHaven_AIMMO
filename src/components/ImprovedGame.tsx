import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Environment } from '@react-three/drei';
import * as THREE from 'three';
import ImprovedSpriteCharacter from './ImprovedSpriteCharacter';
import WeaponSystem, { weapons, Weapon } from './WeaponSystem';

interface GameState {
  player: {
    position: [number, number, number];
    health: number;
    maxHealth: number;
    currentWeapon: Weapon;
    ammo: number;
    isMoving: boolean;
    experience: number;
    level: number;
  };
  enemies: Array<{
    id: string;
    position: [number, number, number];
    health: number;
    maxHealth: number;
    isMoving: boolean;
  }>;
  npcs: Array<{
    id: string;
    position: [number, number, number];
    name: string;
    dialogue: string;
  }>;
  projectiles: Array<{
    id: string;
    position: [number, number, number];
    direction: [number, number, number];
    damage: number;
    speed: number;
  }>;
  score: number;
  gameTime: number;
}

// Cyberpunk City Environment
const CyberpunkCity = () => {
  const buildings = useMemo(() => {
    const buildingArray = [];
    for (let i = 0; i < 20; i++) {
      buildingArray.push({
        position: [
          (Math.random() - 0.5) * 100,
          Math.random() * 20 + 5,
          (Math.random() - 0.5) * 100
        ] as [number, number, number],
        scale: [
          2 + Math.random() * 4,
          10 + Math.random() * 20,
          2 + Math.random() * 4
        ] as [number, number, number],
        color: Math.random() > 0.5 ? '#0066ff' : '#ff0066'
      });
    }
    return buildingArray;
  }, []);

  return (
    <group>
      {/* Ground */}
      <mesh position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial 
          color="#111111" 
          roughness={0.8}
          metalness={0.2}
        />
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
      {[...Array(10)].map((_, i) => (
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
      {[...Array(5)].map((_, i) => (
        <mesh
          key={`platform-${i}`}
          position={[
            (Math.random() - 0.5) * 60,
            5 + Math.random() * 10,
            (Math.random() - 0.5) * 60
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

// Particle Effects
const ParticleSystem = ({ count = 100 }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;

    for (let i = 0; i < count; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * 100,
        Math.random() * 50,
        (Math.random() - 0.5) * 100
      );
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      dummy.scale.setScalar(0.1 + Math.random() * 0.2);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.05]} />
      <meshBasicMaterial
        color="#00ffff"
        transparent
        opacity={0.6}
      />
    </instancedMesh>
  );
};

// Game UI
const GameUI = ({ gameState }: { gameState: GameState }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {/* Health Bar */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-70 p-4 rounded-lg">
        <div className="text-cyan-400 text-sm mb-2">HEALTH</div>
        <div className="w-48 h-4 bg-gray-800 rounded">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-green-500 rounded transition-all"
            style={{ width: `${(gameState.player.health / gameState.player.maxHealth) * 100}%` }}
          />
        </div>
        <div className="text-white text-xs mt-1">
          {gameState.player.health}/{gameState.player.maxHealth}
        </div>
      </div>

      {/* Weapon Info */}
      <div className="absolute top-4 right-4 bg-black bg-opacity-70 p-4 rounded-lg">
        <div className="text-cyan-400 text-sm mb-2">{gameState.player.currentWeapon.name}</div>
        <div className="text-white text-xs">
          Ammo: {gameState.player.ammo}/{gameState.player.currentWeapon.maxAmmo}
        </div>
        <div className="text-white text-xs">
          Damage: {gameState.player.currentWeapon.damage}
        </div>
      </div>

      {/* Score and Level */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 p-4 rounded-lg">
        <div className="text-cyan-400 text-sm">SCORE: {gameState.score}</div>
        <div className="text-purple-400 text-sm">LEVEL: {gameState.player.level}</div>
        <div className="text-yellow-400 text-sm">EXP: {gameState.player.experience}</div>
      </div>

      {/* Minimap */}
      <div className="absolute bottom-4 right-4 w-32 h-32 bg-black bg-opacity-70 rounded-lg border border-cyan-400">
        <div className="text-cyan-400 text-xs text-center p-1">MINIMAP</div>
        <div className="relative w-full h-full">
          {/* Player dot */}
          <div className="absolute w-2 h-2 bg-cyan-400 rounded-full" style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }} />
          {/* Enemy dots */}
          {gameState.enemies.map((enemy, i) => (
            <div
              key={enemy.id}
              className="absolute w-1 h-1 bg-red-500 rounded-full"
              style={{
                left: `${50 + (enemy.position[0] / 100) * 50}%`,
                top: `${50 + (enemy.position[2] / 100) * 50}%`
              }}
            />
          ))}
        </div>
      </div>

      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-6 h-6 border border-cyan-400 rounded-full opacity-60" />
        <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-cyan-400 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  );
};

const ImprovedGame = () => {
  const [gameState, setGameState] = useState<GameState>({
    player: {
      position: [0, 0, 0],
      health: 100,
      maxHealth: 100,
      currentWeapon: weapons[0],
      ammo: weapons[0].maxAmmo,
      isMoving: false,
      experience: 0,
      level: 1
    },
    enemies: [
      {
        id: 'enemy1',
        position: [10, 0, 10],
        health: 50,
        maxHealth: 50,
        isMoving: true
      },
      {
        id: 'enemy2',
        position: [-15, 0, 5],
        health: 75,
        maxHealth: 75,
        isMoving: true
      }
    ],
    npcs: [
      {
        id: 'npc1',
        position: [-5, 0, -5],
        name: 'Cyber Merchant',
        dialogue: 'Welcome to the underground market!'
      }
    ],
    projectiles: [],
    score: 0,
    gameTime: 0
  });

  const [keys, setKeys] = useState<Set<string>>(new Set());

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => new Set(prev).add(e.code));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => {
        const newKeys = new Set(prev);
        newKeys.delete(e.code);
        return newKeys;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Game loop
  useEffect(() => {
    const gameLoop = setInterval(() => {
      setGameState(prev => {
        const newState = { ...prev };
        
        // Update game time
        newState.gameTime += 0.016; // ~60fps

        // Player movement
        let isMoving = false;
        const moveSpeed = 0.3;
        
        if (keys.has('KeyW') || keys.has('ArrowUp')) {
          newState.player.position[2] -= moveSpeed;
          isMoving = true;
        }
        if (keys.has('KeyS') || keys.has('ArrowDown')) {
          newState.player.position[2] += moveSpeed;
          isMoving = true;
        }
        if (keys.has('KeyA') || keys.has('ArrowLeft')) {
          newState.player.position[0] -= moveSpeed;
          isMoving = true;
        }
        if (keys.has('KeyD') || keys.has('ArrowRight')) {
          newState.player.position[0] += moveSpeed;
          isMoving = true;
        }
        
        newState.player.isMoving = isMoving;

        // Update projectiles
        newState.projectiles = newState.projectiles.filter(projectile => {
          projectile.position[0] += projectile.direction[0] * projectile.speed;
          projectile.position[1] += projectile.direction[1] * projectile.speed;
          projectile.position[2] += projectile.direction[2] * projectile.speed;
          
          // Remove projectiles that are too far
          const distance = Math.sqrt(
            projectile.position[0] ** 2 + 
            projectile.position[1] ** 2 + 
            projectile.position[2] ** 2
          );
          return distance < 100;
        });

        // Enemy AI
        newState.enemies.forEach(enemy => {
          // Simple AI: move towards player
          const dx = newState.player.position[0] - enemy.position[0];
          const dz = newState.player.position[2] - enemy.position[2];
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          if (distance > 2) {
            const moveSpeed = 0.05;
            enemy.position[0] += (dx / distance) * moveSpeed;
            enemy.position[2] += (dz / distance) * moveSpeed;
            enemy.isMoving = true;
          } else {
            enemy.isMoving = false;
          }
        });

        return newState;
      });
    }, 16); // ~60fps

    return () => clearInterval(gameLoop);
  }, [keys]);

  const handleWeaponFire = (weapon: Weapon, direction: [number, number, number]) => {
    if (gameState.player.ammo <= 0) return;

    // Create projectile
    const newProjectile = {
      id: `projectile-${Date.now()}`,
      position: [...gameState.player.position] as [number, number, number],
      direction,
      damage: weapon.damage,
      speed: 2
    };

    setGameState(prev => ({
      ...prev,
      projectiles: [...prev.projectiles, newProjectile],
      player: {
        ...prev.player,
        ammo: prev.player.ammo - 1
      }
    }));
  };

  return (
    <div className="w-full h-screen bg-black relative">
      <GameUI gameState={gameState} />
      
      <Canvas
        shadows
        camera={{ position: [0, 10, 10], fov: 75 }}
        gl={{ antialias: true, alpha: false }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.2} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={0.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[0, 10, 0]} intensity={0.3} color="#00ffff" />
        <pointLight position={[20, 5, 20]} intensity={0.3} color="#ff00ff" />

        {/* Environment */}
        <CyberpunkCity />
        <ParticleSystem count={50} />

        {/* Player */}
        <ImprovedSpriteCharacter
          position={gameState.player.position}
          characterType="player"
          isMoving={gameState.player.isMoving}
          health={gameState.player.health}
          maxHealth={gameState.player.maxHealth}
          name="PLAYER"
        />

        {/* Player weapon */}
        <WeaponSystem
          position={[
            gameState.player.position[0] + 0.5,
            gameState.player.position[1],
            gameState.player.position[2]
          ]}
          currentWeapon={gameState.player.currentWeapon}
          onFire={handleWeaponFire}
          isReloading={false}
          aimDirection={[1, 0, 0]}
        />

        {/* Enemies */}
        {gameState.enemies.map(enemy => (
          <ImprovedSpriteCharacter
            key={enemy.id}
            position={enemy.position}
            characterType="enemy"
            isMoving={enemy.isMoving}
            health={enemy.health}
            maxHealth={enemy.maxHealth}
            name="HOSTILE"
          />
        ))}

        {/* NPCs */}
        {gameState.npcs.map(npc => (
          <ImprovedSpriteCharacter
            key={npc.id}
            position={npc.position}
            characterType="npc"
            isMoving={false}
            name={npc.name}
          />
        ))}

        {/* Projectiles */}
        {gameState.projectiles.map(projectile => (
          <mesh key={projectile.id} position={projectile.position}>
            <sphereGeometry args={[0.1]} />
            <meshBasicMaterial
              color="#00ffff"
              emissive="#00ffff"
              emissiveIntensity={0.8}
            />
          </mesh>
        ))}

        {/* Controls */}
        <OrbitControls
          target={gameState.player.position}
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={20}
        />

        {/* Environment effects */}
        <Environment preset="night" />
      </Canvas>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 p-4 rounded-lg">
        <div className="text-cyan-400 text-sm text-center">
          WASD/Arrow Keys: Move | Mouse: Look Around | Click: Fire Weapon
        </div>
      </div>
    </div>
  );
};

export default ImprovedGame;

