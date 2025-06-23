import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

interface SpriteCharacterProps {
  position: [number, number, number];
  type: 'player' | 'gangster' | 'civilian' | 'police' | 'corpse' | 'dealer' | 'hitman' | 'boss';
  mood?: 'hostile' | 'neutral' | 'friendly' | 'dead' | 'terrified' | 'aggressive';
  scale?: number;
  onClick?: () => void;
  onHover?: () => void;
  bloodLevel?: number;
  weapon?: string;
  rotation?: number;
}

const SpriteCharacter: React.FC<SpriteCharacterProps> = ({
  position,
  type,
  mood = 'neutral',
  scale = 1,
  onClick,
  onHover,
  bloodLevel = 0,
  weapon,
  rotation = 0
}) => {
  const spriteRef = useRef<THREE.Sprite>(null);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [isWalking, setIsWalking] = useState(false);

  // Create detailed sprite texture based on character type
  const createCharacterTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Clear canvas
    ctx.clearRect(0, 0, 256, 256);

    if (type === 'corpse') {
      // Draw detailed corpse
      ctx.fillStyle = '#4a0000';
      ctx.fillRect(80, 180, 96, 32); // Body lying down
      ctx.fillStyle = '#2d1810';
      ctx.fillRect(72, 168, 32, 32); // Head
      
      // Large blood pool
      ctx.fillStyle = '#8B0000';
      ctx.beginPath();
      ctx.ellipse(128, 200, 60, 32, 0, 0, 2 * Math.PI);
      ctx.fill();
      
      // Blood splatter pattern
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = `rgba(139, 0, 0, ${Math.random() * 0.8 + 0.2})`;
        ctx.beginPath();
        ctx.arc(
          80 + Math.random() * 96,
          160 + Math.random() * 60,
          Math.random() * 6 + 2,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }
      
      // Bullet holes or stab wounds
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(
          100 + Math.random() * 56,
          176 + Math.random() * 24,
          2,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }
      
      return new THREE.CanvasTexture(canvas);
    }

    // Character colors and details based on type
    let bodyColor = '#5A6578';
    let headColor = '#E6A53E';
    let accessoryColor = '#2D3748';
    let clothingDetails = [];

    switch (type) {
      case 'player':
        bodyColor = '#C53030';
        accessoryColor = '#1A202C';
        clothingDetails = ['leather_jacket', 'combat_boots'];
        break;
      case 'gangster':
        bodyColor = '#2D3748';
        accessoryColor = '#000000';
        clothingDetails = ['suit', 'fedora', 'gun'];
        break;
      case 'police':
        bodyColor = '#2B6CB0';
        accessoryColor = '#1A365D';
        clothingDetails = ['uniform', 'badge', 'radio', 'gun'];
        break;
      case 'civilian':
        bodyColor = '#4A5568';
        accessoryColor = '#718096';
        clothingDetails = ['casual'];
        break;
      case 'dealer':
        bodyColor = '#38A169';
        accessoryColor = '#2F855A';
        clothingDetails = ['hoodie', 'chains'];
        break;
      case 'hitman':
        bodyColor = '#000000';
        accessoryColor = '#4A5568';
        clothingDetails = ['suit', 'sunglasses', 'silencer'];
        break;
      case 'boss':
        bodyColor = '#744210';
        accessoryColor = '#FFD700';
        clothingDetails = ['expensive_suit', 'gold_watch', 'cigar'];
        break;
    }

    // Adjust colors based on mood
    if (mood === 'hostile' || mood === 'aggressive') {
      bodyColor = '#D53040';
    } else if (mood === 'friendly') {
      bodyColor = '#48B179';
    } else if (mood === 'terrified') {
      bodyColor = '#AF8AFA';
    }

    // Draw shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(128, 240, 40, 16, 0, 0, 2 * Math.PI);
    ctx.fill();

    // Draw body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(96, 128, 64, 80);

    // Draw head
    ctx.fillStyle = headColor;
    ctx.fillRect(104, 80, 48, 48);

    // Draw facial features
    ctx.fillStyle = '#000000';
    // Eyes
    ctx.fillRect(112, 96, 8, 8);
    ctx.fillRect(136, 96, 8, 8);
    // Mouth
    if (mood === 'hostile' || mood === 'aggressive') {
      ctx.fillRect(120, 112, 16, 4); // Angry mouth
    } else if (mood === 'terrified') {
      ctx.beginPath();
      ctx.arc(128, 116, 6, 0, Math.PI);
      ctx.fill();
    } else {
      ctx.fillRect(124, 112, 8, 4); // Neutral mouth
    }

    // Draw clothing details
    ctx.fillStyle = accessoryColor;
    clothingDetails.forEach(detail => {
      switch (detail) {
        case 'leather_jacket':
          ctx.fillRect(96, 128, 8, 80); // Left side
          ctx.fillRect(152, 128, 8, 80); // Right side
          ctx.fillRect(96, 128, 64, 8); // Collar
          break;
        case 'suit':
          ctx.fillRect(96, 128, 64, 8); // Lapels
          ctx.fillRect(124, 136, 8, 72); // Tie
          break;
        case 'uniform':
          ctx.fillRect(96, 128, 64, 8); // Collar
          ctx.fillRect(112, 136, 32, 4); // Pocket
          break;
        case 'hoodie':
          ctx.fillRect(92, 124, 72, 12); // Hood
          ctx.fillRect(96, 128, 64, 8); // Hood opening
          break;
        case 'fedora':
          ctx.fillStyle = '#1A1A1A';
          ctx.fillRect(100, 72, 56, 16);
          ctx.fillRect(96, 80, 64, 8);
          break;
        case 'badge':
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(116, 140, 12, 12);
          break;
        case 'gun':
          ctx.fillStyle = '#2D3748';
          ctx.fillRect(164, 140, 24, 8);
          break;
        case 'sunglasses':
          ctx.fillStyle = '#000000';
          ctx.fillRect(108, 92, 40, 16);
          break;
        case 'chains':
          ctx.fillStyle = '#FFD700';
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(120 + i * 4, 136 + i * 4, 16, 4);
          }
          break;
        case 'gold_watch':
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(92, 160, 16, 8);
          break;
        case 'cigar':
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(152, 108, 16, 4);
          ctx.fillStyle = '#FF4500';
          ctx.fillRect(168, 108, 4, 4);
          break;
      }
      ctx.fillStyle = accessoryColor; // Reset color
    });

    // Draw legs
    ctx.fillStyle = '#2D3748';
    ctx.fillRect(104, 208, 20, 40);
    ctx.fillRect(132, 208, 20, 40);

    // Draw shoes
    ctx.fillStyle = '#000000';
    ctx.fillRect(100, 248, 28, 8);
    ctx.fillRect(128, 248, 28, 8);

    // Add weapon if specified
    if (weapon) {
      ctx.fillStyle = '#2D3748';
      switch (weapon) {
        case 'fists':
          // No weapon to draw
          break;
        case 'knife':
          ctx.fillStyle = '#C0C0C0';
          ctx.fillRect(164, 136, 4, 24);
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(164, 152, 4, 8);
          break;
        case 'bat':
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(168, 120, 8, 40);
          break;
        case 'pistol':
          ctx.fillStyle = '#2D3748';
          ctx.fillRect(164, 140, 24, 12);
          break;
        case 'shotgun':
          ctx.fillStyle = '#2D3748';
          ctx.fillRect(164, 136, 32, 16);
          break;
        case 'uzi':
          ctx.fillStyle = '#2D3748';
          ctx.fillRect(164, 140, 28, 12);
          ctx.fillRect(164, 132, 12, 8);
          break;
      }
    }

    // Add blood effects if bloodLevel > 0
    if (bloodLevel > 0) {
      ctx.fillStyle = `rgba(139, 0, 0, ${bloodLevel})`;
      
      // Blood on clothes
      for (let i = 0; i < bloodLevel * 15; i++) {
        ctx.fillRect(
          96 + Math.random() * 64,
          128 + Math.random() * 80,
          Math.random() * 4 + 1,
          Math.random() * 4 + 1
        );
      }
      
      // Blood on hands
      if (bloodLevel > 0.3) {
        ctx.fillStyle = 'rgba(139, 0, 0, 0.9)';
        ctx.fillRect(88, 160, 16, 16); // Left hand
        ctx.fillRect(152, 160, 16, 16); // Right hand
      }
      
      // Blood on face for extreme violence
      if (bloodLevel > 0.7) {
        ctx.fillStyle = 'rgba(139, 0, 0, 0.8)';
        ctx.fillRect(104, 112, 48, 16); // Face blood
        
        // Blood drips
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(
            112 + i * 12,
            128,
            2,
            Math.random() * 10 + 5
          );
        }
      }
    }

    // Add damage indicators for wounded characters
    if (bloodLevel > 0.5 && type !== 'corpse') {
      // Bullet holes
      ctx.fillStyle = '#000000';
      for (let i = 0; i < Math.floor(bloodLevel * 3); i++) {
        ctx.beginPath();
        ctx.arc(
          104 + Math.random() * 48,
          136 + Math.random() * 64,
          1.5,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }
    }

    return new THREE.CanvasTexture(canvas);
  };

  const texture = createCharacterTexture();

  useFrame((state) => {
    if (spriteRef.current) {
      // Billboard effect - always face camera
      spriteRef.current.lookAt(state.camera.position);
      
      // Apply rotation for movement direction
      if (rotation !== 0) {
        spriteRef.current.material.rotation = rotation;
      }
      
      // Floating animation for living characters
      if (type !== 'corpse') {
        spriteRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.12;
        
        // Breathing animation
        const breathe = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.03;
        spriteRef.current.scale.y = scale * 4 * breathe;
      }
      
      // Walking animation
      if (isWalking && type !== 'corpse') {
        const walkCycle = Math.sin(state.clock.elapsedTime * 12);
        spriteRef.current.scale.x = scale * 4 * (1 + walkCycle * 0.15);
      }
      
      // Mood-based animations
      if (mood === 'terrified' && type !== 'corpse') {
        const shake = Math.sin(state.clock.elapsedTime * 25) * 0.15;
        spriteRef.current.position.x = position[0] + shake;
      }
      
      if (mood === 'aggressive' && type !== 'corpse') {
        const aggressive = Math.sin(state.clock.elapsedTime * 8) * 0.2;
        spriteRef.current.scale.setScalar(scale * 4 * (1 + aggressive));
      }
    }
  });

  return (
    <sprite
      ref={spriteRef}
      position={position}
      scale={[scale * 4, scale * 4, 1]}
      onClick={onClick}
      onPointerOver={onHover}
    >
      <spriteMaterial map={texture} transparent />
    </sprite>
  );
};

export default SpriteCharacter;