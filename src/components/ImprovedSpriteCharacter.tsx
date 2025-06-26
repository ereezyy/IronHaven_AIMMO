import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

interface ImprovedSpriteCharacterProps {
  position: [number, number, number];
  characterType: 'player' | 'npc' | 'enemy';
  isMoving?: boolean;
  health?: number;
  maxHealth?: number;
  name?: string;
  onClick?: () => void;
}

const ImprovedSpriteCharacter: React.FC<ImprovedSpriteCharacterProps> = ({
  position,
  characterType,
  isMoving = false,
  health = 100,
  maxHealth = 100,
  name = '',
  onClick
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [lastFrameTime, setLastFrameTime] = useState(0);

  // Load character texture based on type
  const texture = useLoader(TextureLoader, '/assets/cyberpunk_main_chars.jpg');
  
  // Configure texture for sprite animation
  useMemo(() => {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    // Set up sprite sheet parameters (assuming 6 frames per row, 4 rows)
    const framesX = 6;
    const framesY = 4;
    texture.repeat.set(1 / framesX, 1 / framesY);
  }, [texture]);

  // Animation logic
  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.elapsedTime;
    
    // Animate sprite frames when moving
    if (isMoving && time - lastFrameTime > 0.2) {
      setAnimationFrame((prev) => (prev + 1) % 6);
      setLastFrameTime(time);
    }

    // Update texture offset for animation
    const frameX = animationFrame;
    const frameY = characterType === 'player' ? 0 : characterType === 'npc' ? 1 : 2;
    texture.offset.set(frameX / 6, frameY / 4);

    // Add floating animation for better visual appeal
    meshRef.current.position.y = position[1] + Math.sin(time * 2 + position[0]) * 0.1;
    
    // Add glow effect based on character type
    const glowIntensity = characterType === 'player' ? 0.3 : 0.1;
    meshRef.current.material.emissiveIntensity = glowIntensity + Math.sin(time * 3) * 0.1;
  });

  // Character colors based on type
  const getCharacterColor = () => {
    switch (characterType) {
      case 'player':
        return '#00ffff'; // Cyan for player
      case 'npc':
        return '#00ff00'; // Green for friendly NPCs
      case 'enemy':
        return '#ff0066'; // Pink/red for enemies
      default:
        return '#ffffff';
    }
  };

  return (
    <group position={position} onClick={onClick}>
      {/* Main character sprite */}
      <mesh ref={meshRef}>
        <planeGeometry args={[2, 3]} />
        <meshStandardMaterial
          map={texture}
          transparent
          alphaTest={0.5}
          emissive={getCharacterColor()}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Health bar */}
      {health < maxHealth && (
        <group position={[0, 2.5, 0]}>
          {/* Background bar */}
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[2, 0.3]} />
            <meshBasicMaterial color="#333333" transparent opacity={0.8} />
          </mesh>
          
          {/* Health bar */}
          <mesh position={[-(1 - (health / maxHealth)), 0, 0.02]}>
            <planeGeometry args={[2 * (health / maxHealth), 0.25]} />
            <meshBasicMaterial 
              color={health > 50 ? '#00ff00' : health > 25 ? '#ffff00' : '#ff0000'} 
            />
          </mesh>
        </group>
      )}

      {/* Name tag */}
      {name && (
        <mesh position={[0, 3.2, 0]}>
          <planeGeometry args={[name.length * 0.3, 0.5]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.7} />
        </mesh>
      )}

      {/* Character glow effect */}
      <mesh>
        <planeGeometry args={[2.5, 3.5]} />
        <meshBasicMaterial
          color={getCharacterColor()}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Weapon attachment point */}
      {characterType === 'player' && (
        <group position={[0.8, 0, 0]} rotation={[0, 0, Math.PI / 6]}>
          <mesh>
            <boxGeometry args={[0.1, 1.2, 0.1]} />
            <meshStandardMaterial 
              color="#00ffff" 
              emissive="#00ffff"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      )}

      {/* Status effects */}
      {isMoving && (
        <>
          {/* Movement particles */}
          {[...Array(3)].map((_, i) => (
            <mesh
              key={i}
              position={[
                (Math.random() - 0.5) * 2,
                -1 + Math.random() * 0.5,
                0
              ]}
            >
              <sphereGeometry args={[0.05]} />
              <meshBasicMaterial
                color="#00ffff"
                transparent
                opacity={0.6}
              />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
};

export default ImprovedSpriteCharacter;

