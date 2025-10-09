import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameState';

const MinimalGame = () => {
  const initializePlayer = useGameStore(state => state.initializePlayer);
  const [playerPos, setPlayerPos] = useState({ x: 50, y: 50 });
  const [score, setScore] = useState(0);
  const [enemies, setEnemies] = useState([
    { id: 1, x: 20, y: 20 },
    { id: 2, x: 80, y: 30 },
    { id: 3, x: 30, y: 80 }
  ]);

  useEffect(() => {
    initializePlayer();
  }, [initializePlayer]);

  // Movement with arrow keys
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const speed = 2;
      setPlayerPos(prev => {
        let newPos = { ...prev };
        
        switch(e.key) {
          case 'ArrowUp':
          case 'w':
          case 'W':
            newPos.y = Math.max(0, prev.y - speed);
            break;
          case 'ArrowDown':
          case 's':
          case 'S':
            newPos.y = Math.min(100, prev.y + speed);
            break;
          case 'ArrowLeft':
          case 'a':
          case 'A':
            newPos.x = Math.max(0, prev.x - speed);
            break;
          case 'ArrowRight':
          case 'd':
          case 'D':
            newPos.x = Math.min(100, prev.x + speed);
            break;
        }
        
        return newPos;
      });
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Enemy collision detection
  useEffect(() => {
    enemies.forEach(enemy => {
      const distance = Math.sqrt(
        Math.pow(playerPos.x - enemy.x, 2) + Math.pow(playerPos.y - enemy.y, 2)
      );
      
      if (distance < 5) {
        setScore(prev => prev + 10);
        setEnemies(prev => prev.filter(e => e.id !== enemy.id));
      }
    });
  }, [playerPos, enemies]);

  // Spawn new enemies
  useEffect(() => {
    if (enemies.length === 0) {
      setEnemies([
        { id: Date.now() + 1, x: Math.random() * 90 + 5, y: Math.random() * 90 + 5 },
        { id: Date.now() + 2, x: Math.random() * 90 + 5, y: Math.random() * 90 + 5 },
        { id: Date.now() + 3, x: Math.random() * 90 + 5, y: Math.random() * 90 + 5 }
      ]);
    }
  }, [enemies]);

  return (
    <div className="w-full h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 p-4 text-white">
        <h1 className="text-2xl font-bold text-cyan-400">IRONHAVEN AIMMO - MINIMAL DEMO</h1>
        <div className="flex gap-4 text-sm">
          <span>Score: {score}</span>
          <span>Enemies: {enemies.length}</span>
          <span>Position: ({playerPos.x.toFixed(0)}, {playerPos.y.toFixed(0)})</span>
        </div>
      </div>

      {/* Game Area */}
      <div className="flex-1 relative bg-gradient-to-br from-purple-900 to-black overflow-hidden">
        {/* Grid background */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 255, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 255, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />

        {/* Player */}
        <div
          className="absolute w-6 h-6 bg-cyan-400 rounded-full border-2 border-white shadow-lg transition-all duration-100"
          style={{
            left: `${playerPos.x}%`,
            top: `${playerPos.y}%`,
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 20px #00ffff'
          }}
        >
          <div className="absolute inset-0 bg-cyan-400 rounded-full animate-ping opacity-75" />
        </div>

        {/* Enemies */}
        {enemies.map(enemy => (
          <div
            key={enemy.id}
            className="absolute w-4 h-4 bg-red-500 rounded-full border border-red-300"
            style={{
              left: `${enemy.x}%`,
              top: `${enemy.y}%`,
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 10px #ff0000'
            }}
          >
            <div className="absolute inset-0 bg-red-500 rounded-full animate-pulse" />
          </div>
        ))}

        {/* Particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-60 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-4 text-white text-center">
        <div className="text-sm">
          <span className="text-cyan-400">CONTROLS:</span> WASD or Arrow Keys to move | 
          <span className="text-yellow-400"> GOAL:</span> Touch red enemies to destroy them | 
          <span className="text-green-400"> STATUS:</span> {enemies.length > 0 ? 'Hunt enemies!' : 'All enemies destroyed!'}
        </div>
      </div>
    </div>
  );
};

export default MinimalGame;

