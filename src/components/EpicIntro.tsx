import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Box, Sphere } from '@react-three/drei';
import * as THREE from 'three';

interface EpicIntroProps {
  onComplete: () => void;
}

// Cinematic Camera Movement
const CinematicCamera = ({ stage }: { stage: number }) => {
  const cameraRef = useRef<THREE.Camera>();
  
  useFrame((state) => {
    if (!cameraRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    switch (stage) {
      case 0: // Swooping city overview
        state.camera.position.set(
          Math.sin(time * 0.5) * 100,
          50 + Math.sin(time * 0.3) * 20,
          Math.cos(time * 0.5) * 100
        );
        state.camera.lookAt(0, 0, 0);
        break;
        
      case 1: // Dive into action
        const targetY = 5 + Math.sin(time * 2) * 2;
        state.camera.position.lerp(new THREE.Vector3(0, targetY, 20), 0.05);
        state.camera.lookAt(0, 0, 0);
        break;
        
      case 2: // Combat focus
        state.camera.position.lerp(new THREE.Vector3(15, 8, 15), 0.03);
        state.camera.lookAt(0, 0, 0);
        break;
    }
  });
  
  return null;
};

// Epic Cyberpunk City
const EpicCity = () => {
  const buildings = useMemo(() => {
    const buildingArray = [];
    for (let i = 0; i < 50; i++) {
      buildingArray.push({
        position: [
          (Math.random() - 0.5) * 200,
          Math.random() * 30 + 10,
          (Math.random() - 0.5) * 200
        ] as [number, number, number],
        size: [
          Math.random() * 8 + 4,
          Math.random() * 40 + 20,
          Math.random() * 8 + 4
        ] as [number, number, number],
        color: Math.random() > 0.7 ? '#ff0066' : '#0066ff'
      });
    }
    return buildingArray;
  }, []);

  return (
    <>
      {buildings.map((building, index) => (
        <group key={index} position={building.position}>
          <Box scale={building.size}>
            <meshStandardMaterial 
              color={building.color}
              emissive={building.color}
              emissiveIntensity={0.2}
            />
          </Box>
          
          {/* Neon glow effect */}
          <Box scale={[building.size[0] * 1.1, building.size[1] * 1.1, building.size[2] * 1.1]}>
            <meshBasicMaterial 
              color={building.color}
              transparent
              opacity={0.1}
            />
          </Box>
        </group>
      ))}
    </>
  );
};

// Action Sequence with AI NPCs
const ActionSequence = ({ stage }: { stage: number }) => {
  const [combatEffects, setCombatEffects] = useState<any[]>([]);
  
  useEffect(() => {
    if (stage === 2) {
      // Trigger epic combat effects
      const effects = [];
      for (let i = 0; i < 10; i++) {
        effects.push({
          id: i,
          position: [
            (Math.random() - 0.5) * 30,
            Math.random() * 5 + 2,
            (Math.random() - 0.5) * 30
          ],
          type: Math.random() > 0.5 ? 'explosion' : 'laser'
        });
      }
      setCombatEffects(effects);
    }
  }, [stage]);

  return (
    <>
      {/* Player Character */}
      <group position={[0, 1, 0]}>
        <Sphere scale={[1, 2, 1]}>
          <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.3} />
        </Sphere>
        
        {/* Cybernetic glow */}
        <Sphere scale={[1.2, 2.2, 1.2]}>
          <meshBasicMaterial color="#00ffff" transparent opacity={0.2} />
        </Sphere>
      </group>

      {/* AI NPCs in combat */}
      {[...Array(5)].map((_, i) => (
        <group 
          key={i} 
          position={[
            Math.sin(i * 1.2) * 15,
            1,
            Math.cos(i * 1.2) * 15
          ]}
        >
          <Sphere scale={[0.8, 1.8, 0.8]}>
            <meshStandardMaterial 
              color={i % 2 === 0 ? "#ff0066" : "#ff6600"} 
              emissive={i % 2 === 0 ? "#ff0066" : "#ff6600"}
              emissiveIntensity={0.4}
            />
          </Sphere>
          
          {/* AI indicator */}
          <Text
            position={[0, 3, 0]}
            fontSize={0.5}
            color="#00ff00"
            anchorX="center"
            anchorY="middle"
          >
            AI NPC
          </Text>
        </group>
      ))}

      {/* Combat Effects */}
      {combatEffects.map((effect) => (
        <group key={effect.id} position={effect.position}>
          {effect.type === 'explosion' ? (
            <Sphere scale={[2, 2, 2]}>
              <meshBasicMaterial 
                color="#ff4400" 
                transparent 
                opacity={0.6}
              />
            </Sphere>
          ) : (
            <Box scale={[0.2, 0.2, 10]}>
              <meshBasicMaterial 
                color="#00ffff" 
                emissive="#00ffff"
                emissiveIntensity={1}
              />
            </Box>
          )}
        </group>
      ))}
    </>
  );
};

// Epic Text Overlays
const EpicTextOverlay = ({ stage, timeLeft }: { stage: number; timeLeft: number }) => {
  const getStageText = () => {
    switch (stage) {
      case 0:
        return {
          title: "IRONHAVEN AIMMO",
          subtitle: "AI-Powered Cyberpunk MMORPG",
          description: "Experience the future of gaming"
        };
      case 1:
        return {
          title: "REAL-TIME MULTIPLAYER",
          subtitle: "Connect with players worldwide",
          description: "Guilds • PvP • Territory Wars"
        };
      case 2:
        return {
          title: "ADVANCED AI SYSTEMS",
          subtitle: "Hugging Face Integration",
          description: "Smart NPCs • Dynamic Stories • Procedural Missions"
        };
      case 3:
        return {
          title: "READY TO PLAY",
          subtitle: "Click anywhere to start",
          description: "Built for Bolt Hackathon 2025"
        };
      default:
        return { title: "", subtitle: "", description: "" };
    }
  };

  const text = getStageText();

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Main title */}
      <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 text-center">
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600 mb-4 animate-pulse">
          {text.title}
        </h1>
        <h2 className="text-2xl text-cyan-300 mb-2 animate-fade-in">
          {text.subtitle}
        </h2>
        <p className="text-lg text-gray-300 animate-fade-in-delay">
          {text.description}
        </p>
      </div>

      {/* Feature highlights */}
      <div className="absolute bottom-1/4 left-1/2 transform -translate-x-1/2 text-center">
        <div className="flex space-x-8 text-sm text-cyan-400">
          <div className="animate-bounce">🤖 AI NPCs</div>
          <div className="animate-bounce delay-100">🌐 Multiplayer</div>
          <div className="animate-bounce delay-200">⚔️ Real-time Combat</div>
          <div className="animate-bounce delay-300">🏰 Guild Wars</div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="w-64 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-400 to-purple-600 transition-all duration-1000"
            style={{ width: `${((20 - timeLeft) / 20) * 100}%` }}
          />
        </div>
        <p className="text-center text-gray-400 mt-2">
          {timeLeft > 0 ? `Starting in ${timeLeft}s` : "Click to enter game"}
        </p>
      </div>
    </div>
  );
};

const EpicIntro: React.FC<EpicIntroProps> = ({ onComplete }) => {
  const [stage, setStage] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const stageTimer = setInterval(() => {
      setStage((prev) => (prev + 1) % 4);
    }, 5000);

    return () => clearInterval(stageTimer);
  }, []);

  useEffect(() => {
    if (isComplete) {
      setTimeout(onComplete, 1000);
    }
  }, [isComplete, onComplete]);

  const handleClick = () => {
    if (timeLeft <= 5) {
      onComplete();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black cursor-pointer"
      onClick={handleClick}
    >
      <Canvas
        camera={{ position: [0, 50, 100], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
      >
        {/* Dramatic lighting */}
        <ambientLight intensity={0.2} />
        <directionalLight position={[10, 10, 5]} intensity={0.5} color="#00ffff" />
        <directionalLight position={[-10, 10, -5]} intensity={0.5} color="#ff0066" />
        <pointLight position={[0, 20, 0]} intensity={1} color="#ffffff" />

        {/* Cinematic camera */}
        <CinematicCamera stage={stage} />

        {/* Epic city */}
        <EpicCity />

        {/* Action sequence */}
        <ActionSequence stage={stage} />

        {/* Particle effects */}
        {[...Array(100)].map((_, i) => (
          <group
            key={i}
            position={[
              (Math.random() - 0.5) * 200,
              Math.random() * 50,
              (Math.random() - 0.5) * 200
            ]}
          >
            <Sphere scale={[0.1, 0.1, 0.1]}>
              <meshBasicMaterial 
                color={Math.random() > 0.5 ? "#00ffff" : "#ff0066"}
                transparent
                opacity={0.6}
              />
            </Sphere>
          </group>
        ))}

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
          <planeGeometry args={[400, 400]} />
          <meshStandardMaterial 
            color="#001122" 
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      </Canvas>

      {/* Epic text overlay */}
      <EpicTextOverlay stage={stage} timeLeft={timeLeft} />

      {/* Cyberpunk effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-600 to-transparent animate-pulse" />
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-cyan-400 to-transparent animate-pulse" />
        <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-purple-600 to-transparent animate-pulse" />
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-delay {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .animate-fade-in-delay {
          animation: fade-in-delay 1s ease-out 0.5s both;
        }
      `}</style>
    </div>
  );
};

export default EpicIntro;

