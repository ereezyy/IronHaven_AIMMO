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
}

const SpriteCharacter: React.FC<SpriteCharacterProps> = ({
  position,
  type,
  mood = 'neutral',
  scale = 1,
  onClick,
  onHover,
  bloodLevel = 0,
  weapon
}) => {
  const spriteRef = useRef<THREE.Sprite>(null);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [isWalking, setIsWalking] = useState(false);

  // Create detailed sprite texture based on character type
  const createCharacterTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Clear canvas
    ctx.clearRect(0, 0, 128, 128);

    if (type === 'corpse') {
      // Draw detailed corpse
      ctx.fillStyle = '#4a0000';
      ctx.fillRect(40, 90, 48, 16); // Body lying down
      ctx.fillStyle = '#2d1810';
      ctx.fillRect(36, 84, 16, 16); // Head
      
      // Large blood pool
      ctx.fillStyle = '#8B0000';
      ctx.beginPath();
      ctx.ellipse(64, 100, 30, 16, 0, 0, 2 * Math.PI);
      ctx.fill();
      
      // Blood splatter pattern
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = `rgba(139, 0, 0, ${Math.random() * 0.8 + 0.2})`;
        ctx.beginPath();
        ctx.arc(
          40 + Math.random() * 48,
          80 + Math.random() * 30,
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
          50 + Math.random() * 28,
          88 + Math.random() * 12,
          2,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }
      
      return new THREE.CanvasTexture(canvas);
    }

    // Character colors and details based on type
    let bodyColor = '#4A5568';
    let headColor = '#D69E2E';
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
      bodyColor = '#C53030';
    } else if (mood === 'friendly') {
      bodyColor = '#38A169';
    } else if (mood === 'terrified') {
      bodyColor = '#9F7AEA';
    }

    // Draw shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(64, 120, 20, 8, 0, 0, 2 * Math.PI);
    ctx.fill();

    // Draw body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(48, 64, 32, 40);

    // Draw head
    ctx.fillStyle = headColor;
    ctx.fillRect(52, 40, 24, 24);

    // Draw facial features
    ctx.fillStyle = '#000000';
    // Eyes
    ctx.fillRect(56, 48, 4, 4);
    ctx.fillRect(68, 48, 4, 4);
    // Mouth
    if (mood === 'hostile' || mood === 'aggressive') {
      ctx.fillRect(60, 56, 8, 2); // Angry mouth
    } else if (mood === 'terrified') {
      ctx.beginPath();
      ctx.arc(64, 58, 3, 0, Math.PI);
      ctx.fill();
    } else {
      ctx.fillRect(62, 56, 4, 2); // Neutral mouth
    }

    // Draw clothing details
    ctx.fillStyle = accessoryColor;
    clothingDetails.forEach(detail => {
      switch (detail) {
        case 'leather_jacket':
          ctx.fillRect(48, 64, 4, 40); // Left side
          ctx.fillRect(76, 64, 4, 40); // Right side
          ctx.fillRect(48, 64, 32, 4); // Collar
          break;
        case 'suit':
          ctx.fillRect(48, 64, 32, 4); // Lapels
          ctx.fillRect(62, 68, 4, 36); // Tie
          break;
        case 'uniform':
          ctx.fillRect(48, 64, 32, 4); // Collar
          ctx.fillRect(56, 68, 16, 2); // Pocket
          break;
        case 'hoodie':
          ctx.fillRect(46, 62, 36, 6); // Hood
          ctx.fillRect(48, 64, 32, 4); // Hood opening
          break;
        case 'fedora':
          ctx.fillStyle = '#1A1A1A';
          ctx.fillRect(50, 36, 28, 8);
          ctx.fillRect(48, 40, 32, 4);
          break;
        case 'badge':
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(58, 70, 6, 6);
          break;
        case 'gun':
          ctx.fillStyle = '#2D3748';
          ctx.fillRect(82, 70, 12, 4);
          break;
        case 'sunglasses':
          ctx.fillStyle = '#000000';
          ctx.fillRect(54, 46, 20, 8);
          break;
        case 'chains':
          ctx.fillStyle = '#FFD700';
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(60 + i * 2, 68 + i * 2, 8, 2);
          }
          break;
        case 'gold_watch':
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(46, 80, 8, 4);
          break;
        case 'cigar':
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(76, 54, 8, 2);
          ctx.fillStyle = '#FF4500';
          ctx.fillRect(84, 54, 2, 2);
          break;
      }
      ctx.fillStyle = accessoryColor; // Reset color
    });

    // Draw legs
    ctx.fillStyle = '#2D3748';
    ctx.fillRect(52, 104, 10, 20);
    ctx.fillRect(66, 104, 10, 20);

    // Draw shoes
    ctx.fillStyle = '#000000';
    ctx.fillRect(50, 124, 14, 4);
    ctx.fillRect(64, 124, 14, 4);

    // Add weapon if specified
    if (weapon) {
      ctx.fillStyle = '#2D3748';
      switch (weapon) {
        case 'fists':
          // No weapon to draw
          break;
        case 'knife':
          ctx.fillStyle = '#C0C0C0';
          ctx.fillRect(82, 68, 2, 12);
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(82, 76, 2, 4);
          break;
        case 'bat':
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(84, 60, 4, 20);
          break;
        case 'pistol':
          ctx.fillStyle = '#2D3748';
          ctx.fillRect(82, 70, 12, 6);
          break;
        case 'shotgun':
          ctx.fillStyle = '#2D3748';
          ctx.fillRect(82, 68, 16, 8);
          break;
        case 'uzi':
          ctx.fillStyle = '#2D3748';
          ctx.fillRect(82, 70, 14, 6);
          ctx.fillRect(82, 66, 6, 4);
          break;
      }
    }

    // Add blood effects if bloodLevel > 0
    if (bloodLevel > 0) {
      ctx.fillStyle = `rgba(139, 0, 0, ${bloodLevel})`;
      
      // Blood on clothes
      for (let i = 0; i < bloodLevel * 15; i++) {
        ctx.fillRect(
          48 + Math.random() * 32,
          64 + Math.random() * 40,
          Math.random() * 4 + 1,
          Math.random() * 4 + 1
        );
      }
      
      // Blood on hands
      if (bloodLevel > 0.3) {
        ctx.fillStyle = 'rgba(139, 0, 0, 0.9)';
        ctx.fillRect(44, 80, 8, 8); // Left hand
        ctx.fillRect(76, 80, 8, 8); // Right hand
      }
      
      // Blood on face for extreme violence
      if (bloodLevel > 0.7) {
        ctx.fillStyle = 'rgba(139, 0, 0, 0.8)';
        ctx.fillRect(52, 56, 24, 8); // Face blood
        
        // Blood drips
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(
            56 + i * 6,
            64,
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
          52 + Math.random() * 24,
          68 + Math.random() * 32,
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
      
      // Floating animation for living characters
      if (type !== 'corpse') {
        spriteRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.08;
        
        // Breathing animation
        const breathe = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.02;
        spriteRef.current.scale.y = scale * 3 * breathe;
      }
      
      // Walking animation
      if (isWalking && type !== 'corpse') {
        const walkCycle = Math.sin(state.clock.elapsedTime * 8);
        spriteRef.current.scale.x = scale * 3 * (1 + walkCycle * 0.1);
      }
      
      // Mood-based animations
      if (mood === 'terrified' && type !== 'corpse') {
        const shake = Math.sin(state.clock.elapsedTime * 20) * 0.1;
        spriteRef.current.position.x = position[0] + shake;
      }
      
      if (mood === 'aggressive' && type !== 'corpse') {
        const aggressive = Math.sin(state.clock.elapsedTime * 6) * 0.15;
        spriteRef.current.scale.setScalar(scale * 3 * (1 + aggressive));
      }
    }
  });

  return (
    <sprite
      ref={spriteRef}
      position={position}
      scale={[scale * 3, scale * 3, 1]}
      onClick={onClick}
      onPointerOver={onHover}
    >
      <spriteMaterial map={texture} transparent />
    </sprite>
  );
};

export default SpriteCharacter;