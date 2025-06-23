import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameState';
import { Skull, Eye, Zap, AlertTriangle } from 'lucide-react';

interface CrimeEvent {
  id: string;
  type: 'murder' | 'theft' | 'assault' | 'vandalism' | 'drug_deal';
  severity: number;
  witnessCount: number;
  policeResponse: number;
  location: [number, number, number];
  timestamp: number;
}

interface CrimeSystemProps {
  playerPosition: [number, number, number];
  nearbyNPCs: any[];
  onCrimeCommitted: (crime: CrimeEvent) => void;
}

const CrimeSystem: React.FC<CrimeSystemProps> = ({ playerPosition, nearbyNPCs, onCrimeCommitted }) => {
  const gameStore = useGameStore();
  const [recentCrimes, setRecentCrimes] = useState<CrimeEvent[]>([]);
  const [heatLevel, setHeatLevel] = useState(0);
  const [witnesses, setWitnesses] = useState<string[]>([]);

  // Calculate heat level based on recent crimes
  useEffect(() => {
    const now = Date.now();
    const recentCrimeEvents = recentCrimes.filter(crime => now - crime.timestamp < 300000); // 5 minutes
    
    const heat = recentCrimeEvents.reduce((total, crime) => {
      const timeFactor = Math.max(0, 1 - (now - crime.timestamp) / 300000);
      return total + crime.severity * timeFactor;
    }, 0);
    
    setHeatLevel(Math.min(heat, 100));
  }, [recentCrimes]);

  // Monitor for crimes based on player actions
  useEffect(() => {
    const lastAction = gameStore.recentActions[gameStore.recentActions.length - 1];
    if (!lastAction) return;

    let crimeType: CrimeEvent['type'] | null = null;
    let severity = 0;

    if (lastAction.includes('killed_civilian')) {
      crimeType = 'murder';
      severity = 95;
    } else if (lastAction.includes('killed_gangster')) {
      crimeType = 'murder';
      severity = 80;
    } else if (lastAction.includes('killed_police')) {
      crimeType = 'murder';
      severity = 100;
    } else if (lastAction.includes('stole_')) {
      crimeType = 'theft';
      severity = 40;
    } else if (lastAction.includes('attacked_')) {
      crimeType = 'assault';
      severity = 60;
    } else if (lastAction.includes('destroyed_')) {
      crimeType = 'vandalism';
      severity = 25;
    } else if (lastAction.includes('drug_deal')) {
      crimeType = 'drug_deal';
      severity = 50;
    }

    if (crimeType) {
      const witnessCount = nearbyNPCs.filter(npc => {
        const distance = Math.sqrt(
          Math.pow(npc.position[0] - playerPosition[0], 2) +
          Math.pow(npc.position[2] - playerPosition[2], 2)
        );
        return distance < 20 && npc.type === 'civilian';
      }).length;

      const crime: CrimeEvent = {
        id: `crime_${Date.now()}`,
        type: crimeType,
        severity,
        witnessCount,
        policeResponse: Math.min(severity + witnessCount * 10, 100),
        location: [...playerPosition],
        timestamp: Date.now()
      };

      setRecentCrimes(prev => [...prev, crime]);
      onCrimeCommitted(crime);

      // Update wanted level based on crime severity and witnesses
      const wantedIncrease = Math.ceil((severity + witnessCount * 5) / 30);
      const newWanted = Math.min(gameStore.playerStats.wanted + wantedIncrease, 5);
      gameStore.updateStats({ wanted: newWanted });

      // Add witnesses to the list
      if (witnessCount > 0) {
        const newWitnesses = nearbyNPCs
          .filter(npc => npc.type === 'civilian')
          .map(npc => npc.id)
          .slice(0, witnessCount);
        setWitnesses(prev => [...new Set([...prev, ...newWitnesses])]);
      }
    }
  }, [gameStore.recentActions, nearbyNPCs, playerPosition]);

  // Decay heat level over time
  useEffect(() => {
    const interval = setInterval(() => {
      setHeatLevel(prev => Math.max(0, prev - 1));
    }, 10000); // Decrease by 1 every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Clean up old crimes
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setRecentCrimes(prev => prev.filter(crime => now - crime.timestamp < 600000)); // Keep for 10 minutes
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const getHeatColor = () => {
    if (heatLevel > 75) return 'text-red-500';
    if (heatLevel > 50) return 'text-orange-500';
    if (heatLevel > 25) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getCrimeIcon = (type: CrimeEvent['type']) => {
    switch (type) {
      case 'murder': return <Skull className="h-4 w-4" />;
      case 'theft': return <Zap className="h-4 w-4" />;
      case 'assault': return <AlertTriangle className="h-4 w-4" />;
      case 'vandalism': return <AlertTriangle className="h-4 w-4" />;
      case 'drug_deal': return <Zap className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="absolute bottom-20 left-4 p-3 bg-black/90 text-white rounded-lg border border-red-500/70 backdrop-blur-sm">
      <h3 className="text-lg font-bold text-red-400 mb-2 border-b border-red-500/30 pb-1">CRIME STATUS</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Heat Level:</span>
          <span className={`font-bold ${getHeatColor()}`}>
            {Math.round(heatLevel)}%
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Witnesses:</span>
          <span className="text-yellow-400 font-bold flex items-center">
            <Eye className="h-3 w-3 mr-1" />
            {witnesses.length}
          </span>
        </div>
        
        {recentCrimes.length > 0 && (
          <div className="mt-3">
            <p className="text-gray-400 text-xs mb-1">Recent Crimes:</p>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {recentCrimes.slice(-3).reverse().map(crime => (
                <div key={crime.id} className="flex items-center text-xs">
                  {getCrimeIcon(crime.type)}
                  <span className="ml-1 capitalize">{crime.type.replace('_', ' ')}</span>
                  <span className="ml-auto text-gray-500">
                    {Math.floor((Date.now() - crime.timestamp) / 1000)}s ago
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Heat Level Bar */}
      <div className="mt-3 bg-gray-700 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${
            heatLevel > 75 ? 'bg-red-500' : 
            heatLevel > 50 ? 'bg-orange-500' : 
            heatLevel > 25 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${heatLevel}%` }}
        />
      </div>

      {heatLevel > 50 && (
        <div className="mt-2 text-xs text-red-400 animate-pulse">
          ⚠️ High criminal activity detected!
        </div>
      )}
    </div>
  );
};

export default CrimeSystem;