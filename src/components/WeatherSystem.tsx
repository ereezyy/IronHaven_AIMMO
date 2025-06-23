import React, { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface WeatherSystemProps {
  currentWeather?: 'clear' | 'rain' | 'fog' | 'storm';
}

const WeatherSystem: React.FC<WeatherSystemProps> = ({ currentWeather = 'clear' }) => {
  const [weather, setWeather] = useState(currentWeather);
  const [rainDrops, setRainDrops] = useState<THREE.Vector3[]>([]);
  const rainRef = useRef<THREE.Points>(null);

  // Randomly change weather
  useEffect(() => {
    const changeWeather = () => {
      const weatherTypes = ['clear', 'rain', 'fog', 'storm'];
      const randomWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)] as any;
      setWeather(randomWeather);
    };

    const interval = setInterval(changeWeather, 120000 + Math.random() * 180000); // 2-5 minutes
    return () => clearInterval(interval);
  }, []);

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

  const getWeatherIcon = () => {
    switch (weather) {
      case 'clear': return '☀️';
      case 'rain': return '🌧️';
      case 'fog': return '🌫️';
      case 'storm': return '⛈️';
      default: return '☀️';
    }
  };

  const getWeatherDescription = () => {
    switch (weather) {
      case 'clear': return 'Clear skies';
      case 'rain': return 'Light rain';
      case 'fog': return 'Heavy fog';
      case 'storm': return 'Thunderstorm';
      default: return 'Unknown';
    }
  };

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

      {/* Weather UI */}
      <div className="absolute top-56 left-4 p-2 bg-black/90 text-white rounded-lg border border-red-500/70 backdrop-blur-sm">
        <div className="flex items-center text-sm">
          <span className="text-lg mr-2">{getWeatherIcon()}</span>
          <span className="text-gray-300">{getWeatherDescription()}</span>
        </div>
      </div>
    </>
  );
};

export default WeatherSystem;