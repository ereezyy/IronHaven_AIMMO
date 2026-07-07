import React, { useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface InstantActionProps {
  onAIDemo: () => void;
  onMultiplayerDemo: () => void;
  onCombatDemo: () => void;
}

// Deterministic pseudo-random so the city is identical on every load.
function rand(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 100_000) / 100_000;
  };
}

    return () => clearInterval(phaseTimer);
  }, []);

  useEffect(() => {
    // Auto-trigger explosions and effects
    const effectTimer = setInterval(() => {
      const newExplosion = {
        id: crypto.randomUUID(),
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
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
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
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((i) => (
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
      ))}
    </group>
  );
}

function GroundGrid() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#0a0a0c" roughness={1} />
      </mesh>
      <gridHelper
        args={[400, 80, '#1d1f23', '#141518']}
        position={[0, 0.01, 0]}
      />
    </>
  );
}

function SignalBeacon() {
  const ref = React.useRef<THREE.Mesh>(null!);
  useFrame((s) => {
    if (ref.current) {
      const y = 3 + Math.sin(s.clock.elapsedTime * 0.8) * 0.15;
      ref.current.position.y = y;
    }
  });
  return (
    <mesh ref={ref} position={[0, 3, 0]}>
      <cylinderGeometry args={[0.4, 0.4, 6, 12]} />
      <meshStandardMaterial
        color="#c03a30"
        emissive="#c03a30"
        emissiveIntensity={0.9}
      />
    </mesh>
  );
}

function SlowOrbit() {
  useFrame((s) => {
    const t = s.clock.elapsedTime * 0.06;
    s.camera.position.set(Math.sin(t) * 60, 28, Math.cos(t) * 60);
    s.camera.lookAt(0, 6, 0);
  });
  return null;
}

const PANEL = 'border border-[#222428] bg-black/55 backdrop-blur-sm';
const LABEL = 'text-[10px] tracking-[0.32em] uppercase text-neutral-500';

const InstantAction: React.FC<InstantActionProps> = ({
  onAIDemo,
  onMultiplayerDemo,
  onCombatDemo,
}) => {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{
        background: '#0b0b0c',
        color: '#e6e6e6',
        fontFamily: '"Inter Tight", Inter, system-ui, sans-serif',
      }}
    >
      <Canvas
        shadows
        camera={{ position: [60, 28, 60], fov: 42 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#0b0b0c']} />
        <fog attach="fog" args={['#0b0b0c', 60, 180]} />
        <ambientLight intensity={0.18} />
        <directionalLight
          position={[40, 60, 20]}
          intensity={0.55}
          color="#cccfd4"
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight
          position={[-30, 30, -40]}
          intensity={0.18}
          color="#c03a30"
        />
        <SlowOrbit />
        <GroundGrid />
        <Skyline />
        <SignalBeacon />
      </Canvas>

      {/* Top status rail */}
      <div className="absolute inset-x-0 top-0 flex items-baseline justify-between px-10 pt-6 font-mono text-[11px] tracking-[0.32em] uppercase pointer-events-none">
        <span className="text-neutral-500">
          ironhaven · live demo · build 2087
        </span>
        <span className="text-neutral-500">
          node <span className="text-neutral-200">eu-west-3</span> · ping{' '}
          <span className="text-neutral-200">38ms</span> ·{' '}
          <span style={{ color: '#7dd97d' }}>online</span>
        </span>
      </div>

      {/* Left wordmark */}
      <div className="absolute left-10 bottom-32 max-w-[640px]">
        <div
          className="text-[11px] tracking-[0.4em] uppercase mb-4"
          style={{ color: '#8a3b34' }}
        >
          district 01 · north spine
        </div>
        <h1
          className="font-bold leading-[0.85] tracking-[-0.04em]"
          style={{ fontSize: 'clamp(64px, 9vw, 144px)' }}
        >
          A city that
          <br />
          plays <span style={{ color: '#c03a30' }}>back</span>.
        </h1>
        <p className="mt-5 max-w-[440px] text-[15px] leading-relaxed text-neutral-400 font-mono">
          50+ AI-directed factions. Persistent presence on a shared world
          server. Pick a path below — every demo loads the same authoritative
          simulation.
        </p>
      </div>

      {/* Action menu */}
      <div className="absolute right-10 bottom-10 w-[320px]">
        <div className={`${LABEL} mb-3`}>00 — entry points</div>
        <div className="divide-y divide-[#1a1c1f]">
          {(
            [
              {
                id: 'ai',
                label: 'Walk into a conversation',
                sub: 'AI · director · NPCs',
                on: onAIDemo,
              },
              {
                id: 'mp',
                label: 'Join the live world',
                sub: 'Multiplayer · 24/7 shard',
                on: onMultiplayerDemo,
              },
              {
                id: 'cb',
                label: 'Pick a fight',
                sub: 'Combat · ballistics · cover',
                on: onCombatDemo,
              },
            ] as const
          ).map((opt, i) => (
            <button
              key={opt.id}
              onClick={opt.on}
              onMouseEnter={() => setHover(opt.id)}
              onMouseLeave={() => setHover(null)}
              className={`${PANEL} w-full text-left px-5 py-4 flex items-center justify-between transition-colors`}
              style={{
                borderColor: hover === opt.id ? '#c03a30' : '#222428',
                marginTop: i === 0 ? 0 : -1,
              }}
            >
              <span>
                <span className="block text-[15px] tracking-tight">
                  {opt.label}
                </span>
                <span className="block mt-1 text-[10px] tracking-[0.28em] uppercase text-neutral-500 font-mono">
                  {opt.sub}
                </span>
              </span>
              <span
                className="font-mono text-[14px]"
                style={{ color: hover === opt.id ? '#c03a30' : '#5a5d62' }}
              >
                →
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Corner ticks */}
      <div className="pointer-events-none absolute inset-0">
        {[
          'top-6 left-6 border-t border-l',
          'top-6 right-6 border-t border-r',
          'bottom-6 left-6 border-b border-l',
          'bottom-6 right-6 border-b border-r',
        ].map((c) => (
          <div
            key={c}
            className={`absolute w-6 h-6 ${c}`}
            style={{ borderColor: '#3a3a3e' }}
          />
        ))}
      </div>
    </div>
  );
};

export default InstantAction;
