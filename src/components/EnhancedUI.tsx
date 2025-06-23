import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameState';
import { 
  Heart, 
  Shield, 
  DollarSign, 
  Star, 
  AlertTriangle, 
  Clock,
  Settings,
  Volume2,
  VolumeX,
  Pause,
  Play
} from 'lucide-react';

const EnhancedUI: React.FC = () => {
  const gameStore = useGameStore();
  const [showSettings, setShowSettings] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [gameTime, setGameTime] = useState(0);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    timestamp: number;
  }>>([]);

  // Game timer
  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setGameTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPaused]);

  // Monitor for achievement-worthy actions
  useEffect(() => {
    const lastAction = gameStore.recentActions[gameStore.recentActions.length - 1];
    if (!lastAction) return;

    let notification: { message: string; type: 'info' | 'warning' | 'success' | 'error' } | null = null;

    if (lastAction.includes('killed_police')) {
      notification = {
        message: 'Police Officer Down! Wanted level increased.',
        type: 'warning'
      };
    } else if (lastAction.includes('completed_')) {
      notification = {
        message: 'Mission Completed! Reputation gained.',
        type: 'success'
      };
    } else if (lastAction.includes('entered_vehicle')) {
      notification = {
        message: 'Vehicle Acquired',
        type: 'info'
      };
    } else if (lastAction.includes('bought_')) {
      notification = {
        message: 'Item Purchased',
        type: 'success'
      };
    }

    if (notification) {
      const newNotification = {
        id: `notif_${Date.now()}`,
        ...notification,
        timestamp: Date.now()
      };
      
      setNotifications(prev => [...prev, newNotification]);
      
      // Auto-remove after 4 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 4000);
    }
  }, [gameStore.recentActions]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getHealthColor = () => {
    const health = gameStore.playerStats.health;
    if (health > 70) return 'text-green-400';
    if (health > 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getWantedStars = () => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-lg ${
          i < gameStore.playerStats.wanted 
            ? 'text-red-500 animate-pulse' 
            : 'text-gray-600'
        }`}
      >
        ★
      </span>
    ));
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success': return 'border-green-500 bg-green-500/10';
      case 'warning': return 'border-yellow-500 bg-yellow-500/10';
      case 'error': return 'border-red-500 bg-red-500/10';
      default: return 'border-blue-500 bg-blue-500/10';
    }
  };

  return (
    <>
      {/* Enhanced Main Stats Panel */}
      <div className="absolute top-4 left-4 p-4 bg-black/95 text-white rounded-lg border border-red-500/70 backdrop-blur-sm min-w-[280px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-red-400">IRONHAVEN STATUS</h2>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-3">
          {/* Health with visual bar */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="flex items-center text-sm">
                <Heart className="h-4 w-4 mr-2 text-red-500" />
                Health
              </span>
              <span className={`font-bold ${getHealthColor()}`}>
                {gameStore.playerStats.health}/100
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  gameStore.playerStats.health > 70 ? 'bg-green-500' :
                  gameStore.playerStats.health > 30 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${gameStore.playerStats.health}%` }}
              />
            </div>
          </div>

          {/* Wanted Level */}
          <div className="flex justify-between items-center">
            <span className="flex items-center text-sm">
              <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
              Wanted
            </span>
            <div className="flex">{getWantedStars()}</div>
          </div>

          {/* Money */}
          <div className="flex justify-between items-center">
            <span className="flex items-center text-sm">
              <DollarSign className="h-4 w-4 mr-2 text-green-500" />
              Cash
            </span>
            <span className="text-green-400 font-bold">
              ${gameStore.playerStats.money.toLocaleString()}
            </span>
          </div>

          {/* Reputation */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="flex items-center text-sm">
                <Star className="h-4 w-4 mr-2 text-yellow-500" />
                Reputation
              </span>
              <span className="text-yellow-400 font-bold">
                {gameStore.playerStats.reputation}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1">
              <div 
                className="h-1 bg-yellow-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(gameStore.playerStats.reputation, 100)}%` }}
              />
            </div>
          </div>

          {/* Game Time */}
          <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-700 pt-2">
            <span className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Session Time
            </span>
            <span>{formatTime(gameTime)}</span>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-4 left-4 ml-[300px] p-4 bg-black/95 text-white rounded-lg border border-red-500/70 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-red-400 mb-3">SETTINGS</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Audio</span>
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`p-2 rounded transition-colors ${
                  audioEnabled ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Pause Game</span>
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`p-2 rounded transition-colors ${
                  isPaused ? 'text-yellow-400' : 'text-green-400'
                }`}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
            </div>
            
            <button
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded text-sm transition-colors"
              onClick={() => window.location.reload()}
            >
              Restart Game
            </button>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="absolute top-4 right-4 space-y-2 max-w-sm z-50">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`p-3 rounded-lg border backdrop-blur-sm text-white text-sm animate-slide-in ${getNotificationColor(notification.type)}`}
          >
            {notification.message}
          </div>
        ))}
      </div>

      {/* Performance Monitor (Debug) */}
      <div className="absolute bottom-4 right-4 p-2 bg-black/80 text-white rounded text-xs">
        <div>FPS: {Math.round(60)} {/* This would need actual FPS calculation */}</div>
        <div>Entities: {gameStore.recentActions.length}</div>
      </div>
    </>
  );
};

export default EnhancedUI;