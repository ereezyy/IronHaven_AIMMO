import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameState';
import { Target, Clock, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';

interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'assassination' | 'heist' | 'protection' | 'delivery' | 'intimidation';
  target?: string;
  location: string;
  reward: number;
  timeLimit?: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  requirements?: string[];
  completed: boolean;
  failed: boolean;
  progress: number;
  maxProgress: number;
}

interface MissionSystemProps {
  playerPosition: [number, number, number];
  onMissionUpdate: (mission: Mission) => void;
}

const MissionSystem: React.FC<MissionSystemProps> = ({ playerPosition, onMissionUpdate }) => {
  const gameStore = useGameStore();
  const [availableMissions, setAvailableMissions] = useState<Mission[]>([]);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [showMissionBoard, setShowMissionBoard] = useState(false);

  // Generate dynamic missions based on player stats and location
  const generateMissions = (): Mission[] => {
    const missions: Mission[] = [];
    const playerRep = gameStore.playerStats.reputation;
    const playerMoney = gameStore.playerStats.money;

    // Easy missions for low reputation
    if (playerRep < 30) {
      missions.push({
        id: 'intimidate_shopkeeper',
        title: 'Send a Message',
        description: 'A local shopkeeper needs to learn about protection fees. Make him understand.',
        type: 'intimidation',
        target: 'Local Shopkeeper',
        location: 'Downtown Market',
        reward: 500,
        difficulty: 'easy',
        completed: false,
        failed: false,
        progress: 0,
        maxProgress: 1
      });

      missions.push({
        id: 'steal_car',
        title: 'Grand Theft Auto',
        description: 'The crew needs a clean ride. Steal a sedan from the parking lot.',
        type: 'heist',
        target: 'Blue Sedan',
        location: 'Shopping Center',
        reward: 800,
        difficulty: 'easy',
        completed: false,
        failed: false,
        progress: 0,
        maxProgress: 1
      });
    }

    // Medium missions for moderate reputation
    if (playerRep >= 30 && playerRep < 70) {
      missions.push({
        id: 'eliminate_rival',
        title: 'Hostile Takeover',
        description: 'A rival dealer is moving in on our territory. Make sure he disappears permanently.',
        type: 'assassination',
        target: 'Rico Martinez',
        location: 'Industrial District',
        reward: 2500,
        timeLimit: 300000, // 5 minutes
        difficulty: 'medium',
        requirements: ['pistol', 'reputation >= 30'],
        completed: false,
        failed: false,
        progress: 0,
        maxProgress: 1
      });

      missions.push({
        id: 'bank_heist',
        title: 'Easy Money',
        description: 'Hit the First National Bank. Get in, get the cash, get out. Simple.',
        type: 'heist',
        location: 'Downtown Financial District',
        reward: 15000,
        timeLimit: 600000, // 10 minutes
        difficulty: 'hard',
        requirements: ['shotgun', 'getaway vehicle'],
        completed: false,
        failed: false,
        progress: 0,
        maxProgress: 3 // Multiple objectives
      });
    }

    // Hard missions for high reputation
    if (playerRep >= 70) {
      missions.push({
        id: 'eliminate_boss',
        title: 'Regime Change',
        description: 'The Falcone family boss has outlived his usefulness. Take him out and claim the throne.',
        type: 'assassination',
        target: 'Vincent Falcone',
        location: 'Harbor District Warehouse',
        reward: 50000,
        timeLimit: 900000, // 15 minutes
        difficulty: 'extreme',
        requirements: ['uzi', 'reputation >= 70', 'body armor'],
        completed: false,
        failed: false,
        progress: 0,
        maxProgress: 4 // Multiple stages
      });
    }

    return missions.filter(m => !gameStore.recentActions.includes(`completed_${m.id}`));
  };

  // Update available missions periodically
  useEffect(() => {
    const updateMissions = () => {
      setAvailableMissions(generateMissions());
    };

    updateMissions();
    const interval = setInterval(updateMissions, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [gameStore.playerStats.reputation, gameStore.playerStats.money]);

  // Check mission progress
  useEffect(() => {
    if (!activeMission) return;

    const checkProgress = () => {
      let newProgress = activeMission.progress;
      let completed = false;
      let failed = false;

      switch (activeMission.type) {
        case 'assassination':
          // Check if target was killed
          const killActions = gameStore.recentActions.filter(action => 
            action.includes('killed') && action.includes(activeMission.target?.toLowerCase().replace(' ', '_') || '')
          );
          if (killActions.length > 0) {
            newProgress = activeMission.maxProgress;
            completed = true;
          }
          break;

        case 'intimidation':
          // Check if player approached target NPC
          const intimidationActions = gameStore.recentActions.filter(action => 
            action.includes('intimidated') || action.includes('threatened')
          );
          if (intimidationActions.length > 0) {
            newProgress = activeMission.maxProgress;
            completed = true;
          }
          break;

        case 'heist':
          // Check for theft actions
          const theftActions = gameStore.recentActions.filter(action => 
            action.includes('stole') || action.includes('robbed')
          );
          newProgress = Math.min(theftActions.length, activeMission.maxProgress);
          if (newProgress >= activeMission.maxProgress) {
            completed = true;
          }
          break;

        case 'protection':
          // Check if no civilians were harmed
          const harmActions = gameStore.recentActions.filter(action => 
            action.includes('killed_civilian')
          );
          if (harmActions.length > 0) {
            failed = true;
          }
          break;
      }

      // Check time limit
      if (activeMission.timeLimit) {
        const elapsed = Date.now() - (activeMission as any).startTime;
        if (elapsed > activeMission.timeLimit) {
          failed = true;
        }
      }

      const updatedMission = {
        ...activeMission,
        progress: newProgress,
        completed,
        failed
      };

      if (completed || failed) {
        if (completed) {
          gameStore.updateStats({ 
            money: gameStore.playerStats.money + activeMission.reward,
            reputation: gameStore.playerStats.reputation + (activeMission.difficulty === 'extreme' ? 20 : activeMission.difficulty === 'hard' ? 15 : 10)
          });
          gameStore.addAction(`completed_${activeMission.id}`);
        }
        
        setActiveMission(null);
        onMissionUpdate(updatedMission);
      } else {
        setActiveMission(updatedMission);
      }
    };

    const interval = setInterval(checkProgress, 1000);
    return () => clearInterval(interval);
  }, [activeMission, gameStore.recentActions]);

  const acceptMission = (mission: Mission) => {
    const missionWithStartTime = {
      ...mission,
      startTime: Date.now()
    } as any;
    
    setActiveMission(missionWithStartTime);
    setShowMissionBoard(false);
    gameStore.addAction(`accepted_${mission.id}`);
  };

  const abandonMission = () => {
    if (activeMission) {
      gameStore.addAction(`abandoned_${activeMission.id}`);
      setActiveMission(null);
    }
  };

  const getDifficultyColor = (difficulty: Mission['difficulty']) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'hard': return 'text-orange-400';
      case 'extreme': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getMissionIcon = (type: Mission['type']) => {
    switch (type) {
      case 'assassination': return <Target className="h-5 w-5" />;
      case 'heist': return <DollarSign className="h-5 w-5" />;
      case 'protection': return <CheckCircle className="h-5 w-5" />;
      case 'intimidation': return <AlertTriangle className="h-5 w-5" />;
      default: return <Target className="h-5 w-5" />;
    }
  };

  return (
    <>
      {/* Mission Board Toggle */}
      <button
        onClick={() => setShowMissionBoard(!showMissionBoard)}
        className="absolute top-20 right-4 p-3 bg-black/90 text-white rounded-lg border border-red-500/70 backdrop-blur-sm hover:bg-red-600/20 transition-colors"
      >
        <Target className="h-6 w-6" />
      </button>

      {/* Active Mission Display */}
      {activeMission && (
        <div className="absolute top-4 right-4 p-4 bg-black/90 text-white rounded-lg border border-red-500/70 backdrop-blur-sm max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-red-400 flex items-center">
              {getMissionIcon(activeMission.type)}
              <span className="ml-2">{activeMission.title}</span>
            </h3>
            <button
              onClick={abandonMission}
              className="text-gray-400 hover:text-red-400 text-xs"
            >
              ABANDON
            </button>
          </div>
          
          <p className="text-gray-300 text-sm mb-3">{activeMission.description}</p>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span>Progress:</span>
              <span className="text-yellow-400">
                {activeMission.progress}/{activeMission.maxProgress}
              </span>
            </div>
            
            {activeMission.target && (
              <div className="flex justify-between">
                <span>Target:</span>
                <span className="text-red-400">{activeMission.target}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span>Location:</span>
              <span className="text-blue-400">{activeMission.location}</span>
            </div>
            
            <div className="flex justify-between">
              <span>Reward:</span>
              <span className="text-green-400">${activeMission.reward.toLocaleString()}</span>
            </div>
            
            {activeMission.timeLimit && (
              <div className="flex justify-between">
                <span>Time Left:</span>
                <span className="text-orange-400 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {Math.max(0, Math.floor((activeMission.timeLimit - (Date.now() - (activeMission as any).startTime)) / 1000))}s
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-3 bg-gray-700 rounded-full h-2">
            <div 
              className="bg-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(activeMission.progress / activeMission.maxProgress) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Mission Board */}
      {showMissionBoard && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 p-6 rounded-lg border border-red-500/70 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-red-400">MISSION BOARD</h2>
              <button
                onClick={() => setShowMissionBoard(false)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {availableMissions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No missions available. Check back later.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableMissions.map(mission => (
                  <div key={mission.id} className="bg-zinc-800 p-4 rounded border border-zinc-700 hover:border-red-500/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-white flex items-center">
                        {getMissionIcon(mission.type)}
                        <span className="ml-2">{mission.title}</span>
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(mission.difficulty)} bg-black/50`}>
                        {mission.difficulty.toUpperCase()}
                      </span>
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-3">{mission.description}</p>
                    
                    <div className="space-y-1 text-xs mb-4">
                      {mission.target && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Target:</span>
                          <span className="text-red-400">{mission.target}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">Location:</span>
                        <span className="text-blue-400">{mission.location}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">Reward:</span>
                        <span className="text-green-400">${mission.reward.toLocaleString()}</span>
                      </div>
                      
                      {mission.timeLimit && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Time Limit:</span>
                          <span className="text-orange-400">{Math.floor(mission.timeLimit / 60000)} minutes</span>
                        </div>
                      )}
                    </div>

                    {mission.requirements && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-400 mb-1">Requirements:</p>
                        <ul className="text-xs text-yellow-400 space-y-1">
                          {mission.requirements.map((req, index) => (
                            <li key={index}>• {req}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      onClick={() => acceptMission(mission)}
                      disabled={!!activeMission}
                      className={`w-full py-2 px-4 rounded text-sm font-medium transition-colors ${
                        activeMission
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      {activeMission ? 'MISSION ACTIVE' : 'ACCEPT MISSION'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default MissionSystem;