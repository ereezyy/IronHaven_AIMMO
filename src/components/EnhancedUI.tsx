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
        message: '🔥 COP ELIMINATED! Heat is rising.',
        type: 'error'
      };
    } else if (lastAction.includes('killed_boss')) {
      notification = {
        message: '👑 BOSS TERMINATED! Massive reputation gain!',
        type: 'success'
      };
    } else if (lastAction.includes('killed_hitman')) {
      notification = {
        message: '💀 HITMAN DOWN! Professional kill.',
        type: 'warning'
      };
    } else if (lastAction.includes('completed_')) {
      notification = {
        message: '✅ MISSION COMPLETE! Reputation gained.',
        type: 'success'
      };
    } else if (lastAction.includes('entered_vehicle')) {
      notification = {
        message: '🚗 RIDE ACQUIRED!',
        type: 'info'
      };
    } else if (lastAction.includes('bought_')) {
      notification = {
        message: '💰 PURCHASE COMPLETE',
        type: 'success'
      };
    } else if (lastAction.includes('civilian_called_police')) {
      notification = {
        message: '📞 CIVILIAN CALLED BACKUP!',
        type: 'warning'
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
      <div className="absolute top-4 left-4 p-4 glass-panel text-white rounded-lg border border-red-500/70 min-w-[320px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold neon-text animate-glow">🏴‍☠️ CRIMINAL STATUS</h2>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-gray-400 hover:text-red-400 transition-all duration-300 hover:scale-110"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Health with visual bar */}
          <div className={`space-y-2 p-2 rounded ${gameStore.playerStats.health < 30 ? 'animate-danger-pulse' : ''}`}>
            <div className="flex justify-between items-center">
              <span className="flex items-center text-sm">
                <Heart className={`h-4 w-4 mr-2 ${gameStore.playerStats.health < 30 ? 'animate-pulse text-red-400' : 'text-red-500'}`} />
                Health
              </span>
              <span className={`font-bold text-lg ${getHealthColor()}`}>
                {gameStore.playerStats.health}/100
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  gameStore.playerStats.health > 70 ? 'bg-green-500' :
                  gameStore.playerStats.health > 30 ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
                }`}
                style={{ width: `${gameStore.playerStats.health}%` }}
              >
                <div className="h-full bg-gradient-to-r from-transparent to-white opacity-30"></div>
              </div>
            </div>
          </div>

          {/* Wanted Level */}
          <div className={`flex justify-between items-center p-2 rounded ${gameStore.playerStats.wanted > 2 ? 'animate-danger-pulse' : ''}`}>
            <span className="flex items-center text-sm">
              <AlertTriangle className={`h-4 w-4 mr-2 ${gameStore.playerStats.wanted > 2 ? 'animate-pulse text-red-400' : 'text-yellow-500'}`} />
              Heat Level
            </span>
            <div className="flex items-center">
              {getWantedStars()}
              {gameStore.playerStats.wanted >= 5 && (
                <span className="ml-2 text-red-500 text-xs animate-pulse">MAX HEAT</span>
              )}
            </div>
          </div>

          {/* Money */}
          <div className="flex justify-between items-center">
            <span className="flex items-center text-sm">
              <DollarSign className="h-4 w-4 mr-2 text-green-400" />
              Blood Money
            </span>
            <span className="text-green-400 font-bold text-lg">
              ${gameStore.playerStats.money.toLocaleString()} 
            </span>
          </div>

          {/* Reputation */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="flex items-center text-sm">
                <Star className="h-4 w-4 mr-2 text-yellow-400" />
                Street Cred
              </span>
              <span className="text-yellow-400 font-bold text-lg flex items-center">
                {gameStore.playerStats.reputation}
                {gameStore.playerStats.reputation > 80 && (
                  <span className="ml-2 text-red-500 text-xs">LEGENDARY</span>
                )}
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div 
                className="h-2 bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(gameStore.playerStats.reputation, 100)}%` }}
              >
                <div className="h-full bg-gradient-to-r from-transparent to-white opacity-30"></div>
              </div>
            </div>
          </div>

          {/* Kill Count */}
          <div className="flex justify-between items-center border-t border-gray-600/50 pt-3">
            <span className="flex items-center text-sm text-red-400">
              <Skull className="h-4 w-4 mr-2" />
              Body Count
            </span>
            <span className="text-red-400 font-bold text-lg">
              {gameStore.playerStats.policeKillCount} cops
            </span>
          </div>

          {/* Game Time */}
          <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-600/50 pt-3 mt-4">
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
        <div className="absolute top-4 left-4 ml-[340px] p-4 glass-panel text-white rounded-lg border border-red-500/70 animate-slide-in">
          <h3 className="text-lg font-bold text-red-400 mb-4 neon-text">SETTINGS</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Audio</span>
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`p-2 rounded transition-all duration-300 hover:scale-110 ${
                  audioEnabled ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'
                }`}
              >
                {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Pause Game</span>
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`p-2 rounded transition-all duration-300 hover:scale-110 ${
                  isPaused ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'
                }`}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
            </div>
            
            <button
              className="w-full btn-premium text-white py-2 px-4 rounded text-sm font-medium"
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
            className={`p-4 rounded-lg border glass-panel text-white text-sm animate-slide-in shadow-lg ${getNotificationColor(notification.type)}`}
          >
            <div className="font-medium">{notification.message}</div>
            <div className="text-xs text-gray-400 mt-1">
              {new Date(notification.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>

      {/* Performance Monitor (Debug) */}
      <div className="absolute bottom-4 right-4 p-3 glass-panel text-white rounded text-xs border border-gray-600/50">
        <div className="font-bold text-green-400 mb-1">🔧 SYSTEM</div>
        <div>FPS: <span className="text-green-400">60</span></div>
        <div>Chaos: <span className="text-red-400">{gameStore.recentActions.filter(a => a.includes('killed')).length}</span></div>
        <div>Status: <span className="text-green-400">STABLE</span></div>
      </div>
    </>
  );
};

export default EnhancedUI;