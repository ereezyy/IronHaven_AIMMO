import React, { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface WeatherSystemProps {
  currentWeather?: 'clear' | 'rain' | 'fog' | 'storm';
  onWeatherUpdate?: (weather: 'clear' | 'rain' | 'fog' | 'storm') => void;
}

const WeatherSystem: React.FC<WeatherSystemProps> = ({ currentWeather = 'clear', onWeatherUpdate }) => {
  const [weather, setWeather] = useState(currentWeather);
  const [rainDrops, setRainDrops] = useState<THREE.Vector3[]>([]);
  const rainRef = useRef<THREE.Points>(null);

  // Randomly change weather
  useEffect(() => {
    const changeWeather = () => {
      const weatherTypes = ['clear', 'rain', 'fog', 'storm'];
      const randomWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)] as any;
      setWeather(randomWeather);
      if (onWeatherUpdate) {
        onWeatherUpdate(randomWeather);
      }
    };

    const interval = setInterval(changeWeather, 120000 + Math.random() * 180000); // 2-5 minutes
    return () => clearInterval(interval);
  }, [onWeatherUpdate]);

  // Generate rain particles
  useEffect(() => {
    if (weather === 'rain' || weather === 'storm') {
      const drops: THREE.Vector3[] = [];
      const intensity = weather === 'storm' ? 1000 : 500;
      
      for (let i = 0; i < intensity; i++) {
        drops.push(new THREE.Vector3(
          (Math.random() - 0.5) * 200,
          Math.random() * 50 + 20,
          (Math.random() - 0.5) * 200
        ));
      }
      setRainDrops(drops);
    } else {
      setRainDrops([]);
    }
  }, [weather]);

  // Animate rain
  useFrame((state, delta) => {
    if ((weather === 'rain' || weather === 'storm') && rainRef.current) {
      setRainDrops(prev => 
        prev.map(drop => {
          drop.y -= (weather === 'storm' ? 25 : 15) * delta;
          if (drop.y < 0) {
            drop.y = 50;
            drop.x = (Math.random() - 0.5) * 200;
            drop.z = (Math.random() - 0.5) * 200;
          }
          return drop;
        })
      );
    }
  });

  return (
    <>
      {/* Rain particles */}
      {(weather === 'rain' || weather === 'storm') && rainDrops.length > 0 && (
        <points ref={rainRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array(rainDrops.flatMap(drop => [drop.x, drop.y, drop.z]))}
              count={rainDrops.length}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            color="#6eb5ff"
            size={0.1}
            transparent
            opacity={0.6}
          />
        </points>
      )}

      {/* Storm lightning effect */}
      {weather === 'storm' && Math.random() > 0.98 && (
        <ambientLight intensity={2} color="#ffffff" />
      )}

      {/* Fog effect */}
      {weather === 'fog' && (
        <group>
          {Array.from({ length: 20 }).map((_, i) => (
            <mesh
              key={i}
              position={[
                (Math.random() - 0.5) * 100,
                Math.random() * 10 + 2,
                (Math.random() - 0.5) * 100
              ]}
            >
              <sphereGeometry args={[5 + Math.random() * 10, 8, 8]} />
              <meshBasicMaterial
                color="#cccccc"
                transparent
                opacity={0.3}
              />
            </mesh>
          ))}
        </group>
      )}
    </>
  );
};

export default WeatherSystem;