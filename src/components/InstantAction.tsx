import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, Sphere, Text } from '@react-three/drei';
import * as THREE from 'three';

interface InstantActionProps {
  onAIDemo: () => void;
  onMultiplayerDemo: () => void;
  onCombatDemo: () => void;
}

// Auto-playing action sequence
const AutoActionSequence = () => {
  const [actionPhase, setActionPhase] = useState(0);
  const [explosions, setExplosions] = useState<any[]>([]);
  const [aiMessages, setAiMessages] = useState<string[]>([]);
  
  useEffect(() => {
    const phaseTimer = setInterval(() => {
      setActionPhase((prev) => (prev + 1) % 4);
    }, 3000);

    return () => clearInterval(phaseTimer);
  }, []);

  useEffect(() => {
    // Auto-trigger explosions and effects
    const effectTimer = setInterval(() => {
      const newExplosion = {
        id: Date.now(),
        position: [
          (Math.random() - 0.5) * 40,
          Math.random() * 10 + 2,
          (Math.random() - 0.5) * 40
        ],
        scale: Math.random() * 3 + 1,
        color: Math.random() > 0.5 ? '#ff4400' : '#00ffff'
      };
      
      setExplosions(prev => [...prev.slice(-10), newExplosion]);
    }, 500);

    return () => clearInterval(effectTimer);
  }, []);

  useEffect(() => {
    // Auto-generate AI messages
    const messages = [
      "🤖 AI NPC: 'Incoming hostiles detected!'",
      "🧠 Smart AI: 'Analyzing combat patterns...'",
      "⚡ AI System: 'Optimizing weapon targeting'",
      "🎯 AI Mission: 'New objective generated'",
      "🌐 Multiplayer: '5 players joined the battle'"
    ];

    const messageTimer = setInterval(() => {
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      setAiMessages(prev => [...prev.slice(-3), randomMessage]);
    }, 2000);

    return () => clearInterval(messageTimer);
  }, []);

  return (
    <>
      {/* Player character with epic effects */}
      <group position={[0, 2, 0]}>
        <Sphere scale={[1, 2, 1]}>
          <meshStandardMaterial 
            color="#00ffff" 
            emissive="#00ffff" 
            emissiveIntensity={0.5 + Math.sin(Date.now() * 0.01) * 0.3}
          />
        </Sphere>
        
        {/* Power aura */}
        <Sphere scale={[2, 3, 2]}>
          <meshBasicMaterial 
            color="#00ffff" 
            transparent 
            opacity={0.1 + Math.sin(Date.now() * 0.005) * 0.1}
          />
        </Sphere>
      </group>

      {/* AI-controlled enemies */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 20 + Math.sin(Date.now() * 0.001 + i) * 5;
        
        return (
          <group 
            key={i}
            position={[
              Math.sin(angle) * radius,
              2,
              Math.cos(angle) * radius
            ]}
          >
            <Sphere scale={[0.8, 1.6, 0.8]}>
              <meshStandardMaterial 
                color="#ff0066" 
                emissive="#ff0066"
                emissiveIntensity={0.4}
              />
            </Sphere>
            
            {/* AI indicator */}
            <Text
              position={[0, 3, 0]}
              fontSize={0.4}
              color="#00ff00"
              anchorX="center"
              anchorY="middle"
            >
              AI
            </Text>
            
            {/* Laser beams */}
            <Box 
              position={[0, 0, -radius * 0.8]}
              scale={[0.1, 0.1, radius * 0.6]}
              rotation={[0, angle, 0]}
            >
              <meshBasicMaterial 
                color="#ff0066" 
                emissive="#ff0066"
                emissiveIntensity={1}
                transparent
                opacity={0.8}
              />
            </Box>
          </group>
        );
      })}

      {/* Dynamic explosions */}
      {explosions.map((explosion) => (
        <group key={explosion.id} position={explosion.position}>
          <Sphere scale={[explosion.scale, explosion.scale, explosion.scale]}>
            <meshBasicMaterial 
              color={explosion.color}
              emissive={explosion.color}
              emissiveIntensity={1}
              transparent
              opacity={0.7}
            />
          </Sphere>
        </group>
      ))}

      {/* Floating AI messages */}
      {aiMessages.map((message, index) => (
        <Text
          key={index}
          position={[-15, 8 - index * 2, 10]}
          fontSize={0.8}
          color="#00ff00"
          anchorX="left"
          anchorY="middle"
        >
          {message}
        </Text>
      ))}

      {/* Epic environment */}
      {[...Array(20)].map((_, i) => (
        <group
          key={i}
          position={[
            (Math.random() - 0.5) * 100,
            Math.random() * 20 + 5,
            (Math.random() - 0.5) * 100
          ]}
        >
          <Box scale={[
            Math.random() * 5 + 2,
            Math.random() * 15 + 10,
            Math.random() * 5 + 2
          ]}>
            <meshStandardMaterial 
              color={Math.random() > 0.7 ? "#ff0066" : "#0066ff"}
              emissive={Math.random() > 0.7 ? "#ff0066" : "#0066ff"}
              emissiveIntensity={0.2}
            />
          </Box>
        </group>
      ))}
    </>
  );
};

// Dynamic camera that follows the action
const ActionCamera = () => {
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Epic camera movement
    state.camera.position.set(
      Math.sin(time * 0.3) * 30,
      15 + Math.sin(time * 0.2) * 5,
      Math.cos(time * 0.3) * 30
    );
    
    state.camera.lookAt(0, 5, 0);
  });
  
  return null;
};

const InstantAction: React.FC<InstantActionProps> = ({ 
  onAIDemo, 
  onMultiplayerDemo, 
  onCombatDemo 
}) => {
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    // Show controls after 3 seconds
    const timer = setTimeout(() => {
      setShowControls(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-screen bg-black">
      <Canvas
        camera={{ position: [25, 15, 25], fov: 75 }}
        gl={{ antialias: true, alpha: false }}
      >
        {/* Dramatic lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[20, 20, 10]} intensity={0.8} color="#00ffff" />
        <directionalLight position={[-20, 20, -10]} intensity={0.8} color="#ff0066" />
        <pointLight position={[0, 30, 0]} intensity={2} color="#ffffff" />

        {/* Dynamic camera */}
        <ActionCamera />

        {/* Auto-playing action sequence */}
        <AutoActionSequence />

        {/* Ground with cyberpunk grid */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial 
            color="#001122" 
            metalness={0.8}
            roughness={0.2}
            wireframe={true}
          />
        </mesh>
      </Canvas>

      {/* Epic HUD overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top status bar */}
        <div className="absolute top-4 left-4 right-4 flex justify-between text-cyan-400">
          <div className="bg-black/80 px-4 py-2 rounded border border-cyan-500/50">
            🤖 AI Systems: ACTIVE
          </div>
          <div className="bg-black/80 px-4 py-2 rounded border border-purple-500/50">
            🌐 Multiplayer: CONNECTED
          </div>
          <div className="bg-black/80 px-4 py-2 rounded border border-red-500/50">
            ⚔️ Combat: ENGAGED
          </div>
        </div>

        {/* Center title */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 mb-4 animate-pulse">
            IRONHAVEN AIMMO
          </h1>
          <p className="text-xl text-cyan-300 mb-8">
            AI-Powered Cyberpunk MMORPG
          </p>
          
          {showControls && (
            <div className="space-y-4 pointer-events-auto">
              <button
                onClick={onAIDemo}
                className="block mx-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-3 rounded-lg font-bold transition-all transform hover:scale-105"
              >
                🤖 DEMO AI FEATURES
              </button>
              
              <button
                onClick={onMultiplayerDemo}
                className="block mx-auto bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-8 py-3 rounded-lg font-bold transition-all transform hover:scale-105"
              >
                🌐 JOIN MULTIPLAYER
              </button>
              
              <button
                onClick={onCombatDemo}
                className="block mx-auto bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white px-8 py-3 rounded-lg font-bold transition-all transform hover:scale-105"
              >
                ⚔️ START COMBAT
              </button>
            </div>
          )}
        </div>

        {/* Bottom feature showcase */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
          <div className="flex space-x-8 text-lg text-cyan-400 mb-4">
            <div className="animate-bounce">🧠 Smart AI NPCs</div>
            <div className="animate-bounce delay-100">🎮 Real-time Multiplayer</div>
            <div className="animate-bounce delay-200">⚡ Dynamic Combat</div>
            <div className="animate-bounce delay-300">🏰 Guild Warfare</div>
          </div>
          
          <p className="text-gray-400">
            Built with Hugging Face AI • React • Three.js • WebSocket Multiplayer
          </p>
        </div>

        {/* Cyberpunk scan lines */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent animate-pulse" />
        
        {/* Corner decorations */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-cyan-400" />
        <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-purple-600" />
        <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-purple-600" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-cyan-400" />
      </div>
    </div>
  );
};

export default InstantAction;

