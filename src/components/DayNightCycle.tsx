import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface DayNightCycleProps {
  timeScale?: number; // How fast time passes (1 = real time, 60 = 1 minute = 1 hour)
  onTimeUpdate?: (time: number, isNight: boolean) => void;
}

const DayNightCycle: React.FC<DayNightCycleProps> = ({ timeScale = 120, onTimeUpdate }) => {
  const { scene } = useThree();
  const [currentTime, setCurrentTime] = useState(12); // Start at noon
  const [isNight, setIsNight] = useState(false);
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const ambientLightRef = useRef<THREE.AmbientLight>(null);

  useFrame((state, delta) => {
    // Update time
    setCurrentTime(prev => {
      const newTime = (prev + (delta * timeScale / 3600)) % 24; // 24 hour cycle
      return newTime;
    });
  });

  useEffect(() => {
    // Call the callback to update parent component
    if (onTimeUpdate) {
      onTimeUpdate(currentTime, isNight);
    }

    // Determine if it's night
    setIsNight(currentTime < 6 || currentTime > 20);

    // Calculate sun position
    const sunAngle = (currentTime / 24) * Math.PI * 2 - Math.PI / 2; // Sun starts at east
    const sunHeight = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle) * 30;
    const sunY = Math.max(sunHeight * 30, -5); // Don't go too far below ground
    const sunZ = 10;

    // Update directional light (sun)
    if (directionalLightRef.current) {
      directionalLightRef.current.position.set(sunX, sunY, sunZ);
      
      // Adjust light intensity based on time
      let intensity = 0.5;
      if (currentTime >= 6 && currentTime <= 18) {
        // Daytime
        intensity = 0.8;
      } else if ((currentTime >= 5 && currentTime < 6) || (currentTime > 18 && currentTime <= 19)) {
        // Dawn/Dusk
        intensity = 0.4;
      } else {
        // Nighttime
        intensity = 0.1;
      }
      
      directionalLightRef.current.intensity = intensity;
      
      // Adjust light color based on time
      let color = new THREE.Color(1, 1, 1); // White
      if (currentTime < 6 || currentTime > 20) {
        // Night - blue tint
        color = new THREE.Color(0.4, 0.6, 1);
      } else if ((currentTime >= 5 && currentTime < 7) || (currentTime >= 18 && currentTime < 20)) {
        // Dawn/Dusk - orange tint
        const t = currentTime < 12 ? (currentTime - 5) / 2 : (20 - currentTime) / 2;
        color = new THREE.Color(1, 0.6 + t * 0.4, 0.2 + t * 0.8);
      }
      
      directionalLightRef.current.color = color;
    }

    // Update ambient light
    if (ambientLightRef.current) {
      let ambientIntensity = 0.3;
      if (currentTime >= 6 && currentTime <= 18) {
        ambientIntensity = 0.4;
      } else {
        ambientIntensity = 0.15;
      }
      
      ambientLightRef.current.intensity = ambientIntensity;
      
      // Ambient color
      let ambientColor = new THREE.Color(1, 1, 1);
      if (currentTime < 6 || currentTime > 20) {
        ambientColor = new THREE.Color(0.2, 0.3, 0.6);
      }
      
      ambientLightRef.current.color = ambientColor;
    }

    // Update fog for atmosphere
    if (scene.fog) {
      const fog = scene.fog as THREE.Fog;
      if (isNight) {
        fog.color = new THREE.Color(0.02, 0.02, 0.05);
        fog.far = 80;
      } else {
        fog.color = new THREE.Color(0.05, 0.05, 0.1);
        fog.far = 120;
      }
    } else {
      // Add fog if it doesn't exist
      scene.fog = new THREE.Fog(
        isNight ? new THREE.Color(0.02, 0.02, 0.05) : new THREE.Color(0.05, 0.05, 0.1),
        20,
        isNight ? 80 : 120
      );
    }
  }, [currentTime, isNight, scene, onTimeUpdate]);

  return (
    <>
      {/* Main directional light (sun/moon) */}
      <directionalLight
        ref={directionalLightRef}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      
      {/* Ambient light */}
      <ambientLight ref={ambientLightRef} />
      
      {/* Moon light (only at night) */}
      {isNight && (
        <pointLight
          position={[-20, 25, -20]}
          intensity={0.2}
          color="#e6f2ff"
          distance={100}
        />
      )}
      
      {/* Street lights effect at night */}
      {isNight && (
        <>
          <pointLight position={[10, 5, 10]} intensity={0.3} color="#ffaa00" distance={15} />
          <pointLight position={[-15, 5, 20]} intensity={0.3} color="#ffaa00" distance={15} />
          <pointLight position={[25, 5, -10]} intensity={0.3} color="#ffaa00" distance={15} />
          <pointLight position={[-5, 5, -25]} intensity={0.3} color="#ffaa00" distance={15} />
        </>
      )}
    </>
  );
};

export default DayNightCycle;