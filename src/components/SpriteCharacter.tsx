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
  // New props for enhanced gameplay
  isPlayer?: boolean;
  velocity?: [number, number, number];
  isSprinting?: boolean;
  stamina?: number;
  health?: number;
  isInCombat?: boolean;
  lastHitTime?: number;
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
  rotation = 0,
  // New props with safe defaults
  isPlayer = false,
  velocity = [0, 0, 0],
  isSprinting = false,
  stamina = 100,
  health = 100,
  isInCombat = false,
  lastHitTime = 0
}) => {
  const spriteRef = useRef<THREE.Sprite>(null);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [isWalking, setIsWalking] = useState(false);

  // Create detailed sprite texture based on character type
  const createCharacterTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Clear canvas with higher resolution
    ctx.clearRect(0, 0, 512, 512);
    
    // Enable anti-aliasing for smoother graphics
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (type === 'corpse') {
      // Draw ultra-detailed corpse with more realism
      ctx.fillStyle = '#2d1810';
      ctx.fillRect(180, 350, 152, 60); // Body lying down
      ctx.fillStyle = '#1a0f08';
      ctx.fillRect(160, 330, 60, 60); // Head
      
      // Massive blood pool with gradient
      const gradient = ctx.createRadialGradient(256, 380, 0, 256, 380, 120);
      gradient.addColorStop(0, '#8B0000');
      gradient.addColorStop(0.5, '#4a0000');
      gradient.addColorStop(1, 'rgba(139, 0, 0, 0.3)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(256, 380, 120, 60, 0, 0, 2 * Math.PI);
      ctx.fill();
      
      // Realistic blood spatter with varying opacity
      for (let i = 0; i < 25; i++) {
        ctx.fillStyle = `rgba(139, 0, 0, ${Math.random() * 0.8 + 0.2})`;
        ctx.beginPath();
        const size = Math.random() * 12 + 4;
        ctx.arc(
          180 + Math.random() * 152,
          320 + Math.random() * 120,
          size,
          0,
          2 * Math.PI
        );
        ctx.fill();
        
        // Blood drip trails
        if (Math.random() > 0.7) {
          ctx.fillRect(
            180 + Math.random() * 152,
            320 + Math.random() * 60,
            2,
            Math.random() * 20 + 10
          );
        }
      }
      
      // Multiple bullet holes with realistic detail
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(
          200 + Math.random() * 112,
          350 + Math.random() * 48,
          3,
          0,
          2 * Math.PI
        );
        ctx.fill();
        
        // Powder burns around bullet holes
        ctx.fillStyle = 'rgba(50, 50, 50, 0.3)';
        ctx.beginPath();
        ctx.arc(
          200 + Math.random() * 112,
          350 + Math.random() * 48,
          8,
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
    const shadowGradient = ctx.createRadialGradient(256, 480, 0, 256, 480, 80);
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGradient;
    ctx.beginPath();
    ctx.ellipse(256, 480, 80, 32, 0, 0, 2 * Math.PI);
    ctx.fill();

    // Draw body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(192, 256, 128, 160);
    
    // Add muscle/body definition with shading
    ctx.fillStyle = `rgba(0, 0, 0, 0.1)`;
    ctx.fillRect(192, 256, 20, 160); // Left shadow
    ctx.fillRect(300, 256, 20, 160); // Right shadow
    ctx.fillRect(220, 300, 72, 8); // Chest definition

    // Draw head
    ctx.fillStyle = headColor;
    ctx.fillRect(208, 160, 96, 96);
    
    // Add neck
    ctx.fillStyle = headColor;
    ctx.fillRect(232, 240, 48, 24);

    // Enhanced facial features with more detail
    ctx.fillStyle = '#000000';
    // Eyes with pupils and iris
    ctx.fillRect(224, 192, 16, 16);
    ctx.fillRect(272, 192, 16, 16);
    
    // Eye pupils
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(228, 196, 8, 8);
    ctx.fillRect(276, 196, 8, 8);
    
    // Nose
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(248, 208, 8, 12);
    
    // Mouth with expression based on mood
    ctx.fillStyle = '#000000';
    if (mood === 'hostile' || mood === 'aggressive') {
      ctx.fillRect(240, 224, 32, 8); // Angry mouth
      // Angry eyebrows
      ctx.fillRect(220, 184, 24, 4);
      ctx.fillRect(268, 184, 24, 4);
    } else if (mood === 'terrified') {
      // Open mouth in terror
      ctx.beginPath();
      ctx.arc(256, 232, 12, 0, Math.PI);
      ctx.fill();
    } else {
      ctx.fillRect(248, 224, 16, 6); // Neutral mouth
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
      ctx.fillStyle = `rgba(139, 0, 0, ${Math.min(bloodLevel * 1.2, 1)})`;
      
      // More realistic blood splatter on clothes
      for (let i = 0; i < bloodLevel * 30; i++) {
        const opacity = Math.random() * bloodLevel;
        ctx.fillStyle = `rgba(139, 0, 0, ${opacity})`;
        ctx.fillRect(
          192 + Math.random() * 128,
          256 + Math.random() * 160,
          Math.random() * 8 + 2,
          Math.random() * 8 + 2
        );
      }
      
      // Blood on hands with realistic coverage
      if (bloodLevel > 0.3) {
        ctx.fillStyle = 'rgba(139, 0, 0, 0.9)';
        ctx.fillRect(176, 320, 32, 32); // Left hand
        ctx.fillRect(304, 320, 32, 32); // Right hand
      }
      
      // Facial blood for extreme violence
      if (bloodLevel > 0.7) {
        ctx.fillStyle = 'rgba(139, 0, 0, 0.8)';
        ctx.fillRect(208, 224, 96, 32); // Face blood
        
        // Realistic blood drips down face
        for (let i = 0; i < 6; i++) {
          ctx.fillRect(
            224 + i * 16,
            256,
            4,
            Math.random() * 20 + 10
          );
        }
      }
    }

    // Enhanced damage indicators
    if (bloodLevel > 0.5 && type !== 'corpse') {
      // Multiple bullet holes with realistic detail
      ctx.fillStyle = '#000000';
      for (let i = 0; i < Math.floor(bloodLevel * 6); i++) {
        ctx.beginPath();
        ctx.arc(
          208 + Math.random() * 96,
          272 + Math.random() * 128,
          3,
          0,
          2 * Math.PI
        );
        ctx.fill();
        
        // Powder burns around holes
        ctx.fillStyle = 'rgba(50, 50, 50, 0.2)';
        ctx.beginPath();
        ctx.arc(
          208 + Math.random() * 96,
          272 + Math.random() * 128,
          8,
          0,
          2 * Math.PI
        );
        ctx.fill();
        ctx.fillStyle = '#000000';
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