import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Simple rotating cube to test Three.js
const RotatingCube = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta;
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.2} />
    </mesh>
  );
};

// Simple character sprite
const TestCharacter = ({ position }: { position: [number, number, number] }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[1, 2]} />
      <meshStandardMaterial color="#ff0066" />
    </mesh>
  );
};

const TestGame = () => {
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 0, 0]);
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

  // Movement logic
  useEffect(() => {
    const moveLoop = setInterval(() => {
      setPlayerPos(prev => {
        let newPos: [number, number, number] = [...prev];
        const speed = 0.1;

        if (keys.has('KeyW') || keys.has('ArrowUp')) newPos[2] -= speed;
        if (keys.has('KeyS') || keys.has('ArrowDown')) newPos[2] += speed;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) newPos[0] -= speed;
        if (keys.has('KeyD') || keys.has('ArrowRight')) newPos[0] += speed;

        return newPos;
      });
    }, 16);

    return () => clearInterval(moveLoop);
  }, [keys]);

  return (
    <div className="w-full h-screen bg-black">
      {/* UI */}
      <div className="absolute top-4 left-4 text-white z-10">
        <h1 className="text-2xl font-bold text-cyan-400">TEST GAME</h1>
        <p className="text-sm">WASD to move | Mouse to look around</p>
        <p className="text-xs">Player: [{playerPos[0].toFixed(1)}, {playerPos[1].toFixed(1)}, {playerPos[2].toFixed(1)}]</p>
      </div>

      {/* 3D Scene */}
      <Canvas camera={{ position: [5, 5, 5], fov: 75 }}>
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 10, 5]} intensity={0.5} />
        <pointLight position={[0, 5, 0]} intensity={0.3} color="#00ffff" />

        {/* Ground */}
        <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#222222" />
        </mesh>

        {/* Test objects */}
        <RotatingCube />
        
        {/* Player character */}
        <TestCharacter position={playerPos} />

        {/* Some environment objects */}
        <mesh position={[3, 0, 3]}>
          <cylinderGeometry args={[0.5, 0.5, 2]} />
          <meshStandardMaterial color="#ff6600" />
        </mesh>

        <mesh position={[-3, 0, -3]}>
          <sphereGeometry args={[0.8]} />
          <meshStandardMaterial color="#00ff00" />
        </mesh>

        {/* Controls */}
        <OrbitControls target={playerPos} />
      </Canvas>

      {/* Status */}
      <div className="absolute bottom-4 right-4 text-white text-sm z-10">
        <div className="bg-black bg-opacity-70 p-2 rounded">
          <div>Keys pressed: {Array.from(keys).join(', ') || 'None'}</div>
          <div>Status: {keys.size > 0 ? 'Moving' : 'Idle'}</div>
        </div>
      </div>
    </div>
  );
};

export default TestGame;

