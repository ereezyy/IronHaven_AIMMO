import React, { useState, useEffect } from 'react';
import { multiplayerManager, PlayerData, CHARACTER_CLASSES } from '../lib/multiplayer';

// Multiplayer Status Widget
export const MultiplayerStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [playerCount, setPlayerCount] = useState(0);
  const [ping, setPing] = useState(0);

  useEffect(() => {
    // Try to connect to multiplayer server
    multiplayerManager.connect().then(() => {
      setIsConnected(true);
    }).catch(() => {
      setIsConnected(false);
    });

    // Listen for player updates
    multiplayerManager.on('world_state_update', (data: any) => {
      setPlayerCount(data.players?.size || 0);
    });

    return () => {
      multiplayerManager.off('world_state_update', () => {});
    };
  }, []);

  return (
    <div className="fixed top-4 left-4 bg-black bg-opacity-80 text-white p-3 rounded-lg border border-cyan-500">
      <div className="text-sm font-bold text-cyan-400 mb-2">🌐 MULTIPLAYER STATUS</div>
      
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
        
        <div>👥 Players: {playerCount}</div>
        <div>📡 Ping: {ping}ms</div>
        
        {!isConnected && (
          <div className="text-yellow-400 text-xs mt-2">
            ⚠️ Playing in offline mode
          </div>
        )}
      </div>
    </div>
  );
};

// Chat System
export const ChatSystem: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [currentChannel, setCurrentChannel] = useState<'global' | 'guild' | 'local'>('global');
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    multiplayerManager.on('chat_message', (data: any) => {
      setMessages(prev => [...prev.slice(-49), data]); // Keep last 50 messages
    });

    return () => {
      multiplayerManager.off('chat_message', () => {});
    };
  }, []);

  const sendMessage = () => {
    if (inputMessage.trim()) {
      multiplayerManager.sendChatMessage(inputMessage, currentChannel);
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 bg-cyan-600 hover:bg-cyan-700 text-white p-2 rounded"
      >
        💬 Chat
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 w-80 bg-black bg-opacity-90 text-white rounded-lg border border-cyan-500">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-cyan-500">
        <div className="flex gap-2">
          {(['global', 'guild', 'local'] as const).map(channel => (
            <button
              key={channel}
              onClick={() => setCurrentChannel(channel)}
              className={`px-2 py-1 text-xs rounded ${
                currentChannel === channel 
                  ? 'bg-cyan-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {channel.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="h-32 overflow-y-auto p-2 space-y-1">
        {messages.map((msg, index) => (
          <div key={index} className="text-xs">
            <span className="text-cyan-400">[{msg.channel}]</span>
            <span className="text-yellow-400 ml-1">{msg.username}:</span>
            <span className="ml-1">{msg.message}</span>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-cyan-500">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Message ${currentChannel}...`}
            className="flex-1 bg-gray-800 text-white px-2 py-1 text-xs rounded border border-gray-600 focus:border-cyan-500 outline-none"
            maxLength={200}
          />
          <button
            onClick={sendMessage}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 text-xs rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

// Player List (nearby players)
export const PlayerList: React.FC<{ playerPosition: [number, number, number] }> = ({ playerPosition }) => {
  const [nearbyPlayers, setNearbyPlayers] = useState<PlayerData[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateNearbyPlayers = () => {
      const players = multiplayerManager.getNearbyPlayers(playerPosition, 50);
      setNearbyPlayers(players);
    };

    const interval = setInterval(updateNearbyPlayers, 1000);
    return () => clearInterval(interval);
  }, [playerPosition]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-20 left-4 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded text-xs"
      >
        👥 Players ({nearbyPlayers.length})
      </button>
    );
  }

  return (
    <div className="fixed top-20 left-4 w-64 bg-black bg-opacity-90 text-white rounded-lg border border-purple-500">
      <div className="flex items-center justify-between p-2 border-b border-purple-500">
        <span className="text-sm font-bold text-purple-400">👥 NEARBY PLAYERS</span>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto p-2">
        {nearbyPlayers.length === 0 ? (
          <div className="text-gray-400 text-xs text-center py-4">
            No players nearby
          </div>
        ) : (
          <div className="space-y-2">
            {nearbyPlayers.map(player => (
              <div key={player.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                <div>
                  <div className="text-sm font-medium">{player.username}</div>
                  <div className="text-xs text-gray-400">
                    Lv.{player.level} {player.characterClass.name}
                  </div>
                  {player.guild && (
                    <div className="text-xs text-yellow-400">
                      🏰 {player.guild}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-end">
                  <div className="text-xs text-green-400">
                    ❤️ {player.health}%
                  </div>
                  {player.isInCombat && (
                    <div className="text-xs text-red-400">⚔️ Combat</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Character Class Selection
export const CharacterClassSelector: React.FC<{
  onClassSelect: (classId: string) => void;
  playerLevel: number;
}> = ({ onClassSelect, playerLevel }) => {
  const [selectedClass, setSelectedClass] = useState<string>('');

  const availableClasses = CHARACTER_CLASSES.filter(cls => cls.unlockLevel <= playerLevel);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white p-6 rounded-lg border border-cyan-500 max-w-4xl w-full mx-4">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4 text-center">
          🎭 SELECT CHARACTER CLASS
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {availableClasses.map(cls => (
            <div
              key={cls.id}
              onClick={() => setSelectedClass(cls.id)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedClass === cls.id
                  ? 'border-cyan-500 bg-cyan-900 bg-opacity-30'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <h3 className="text-lg font-bold text-cyan-400 mb-2">{cls.name}</h3>
              <p className="text-sm text-gray-300 mb-3">{cls.description}</p>
              
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Health:</span>
                  <span className="text-green-400">{cls.baseStats.health}</span>
                </div>
                <div className="flex justify-between">
                  <span>Damage:</span>
                  <span className="text-red-400">{cls.baseStats.damage}</span>
                </div>
                <div className="flex justify-between">
                  <span>Defense:</span>
                  <span className="text-blue-400">{cls.baseStats.defense}</span>
                </div>
                <div className="flex justify-between">
                  <span>Speed:</span>
                  <span className="text-yellow-400">{cls.baseStats.speed}</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs text-purple-400 mb-1">Starting Skills:</div>
                {cls.skills.slice(0, 2).map(skill => (
                  <div key={skill.id} className="text-xs text-gray-400">
                    • {skill.name}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => selectedClass && onClassSelect(selectedClass)}
            disabled={!selectedClass}
            className={`px-6 py-2 rounded font-bold ${
              selectedClass
                ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
};

// Guild System UI
export const GuildPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [guildName, setGuildName] = useState('');
  const [currentGuild, setCurrentGuild] = useState<string | null>(null);

  const joinGuild = () => {
    if (guildName.trim()) {
      multiplayerManager.joinGuild(guildName);
      setGuildName('');
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-4 right-20 bg-yellow-600 hover:bg-yellow-700 text-white p-2 rounded text-xs"
      >
        🏰 Guild
      </button>
    );
  }

  return (
    <div className="fixed top-16 right-4 w-80 bg-black bg-opacity-90 text-white rounded-lg border border-yellow-500">
      <div className="flex items-center justify-between p-3 border-b border-yellow-500">
        <span className="text-sm font-bold text-yellow-400">🏰 GUILD SYSTEM</span>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="p-3">
        {currentGuild ? (
          <div>
            <div className="text-sm mb-2">Current Guild:</div>
            <div className="text-yellow-400 font-bold">{currentGuild}</div>
            
            <div className="mt-4 space-y-2">
              <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-xs">
                Guild Chat
              </button>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-xs">
                Guild Wars
              </button>
              <button className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-xs">
                Leave Guild
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-sm mb-2">Join or Create Guild:</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={guildName}
                onChange={(e) => setGuildName(e.target.value)}
                placeholder="Guild name..."
                className="flex-1 bg-gray-800 text-white px-2 py-1 text-xs rounded border border-gray-600 focus:border-yellow-500 outline-none"
                maxLength={20}
              />
              <button
                onClick={joinGuild}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 text-xs rounded"
              >
                Join
              </button>
            </div>
            
            <div className="mt-3 text-xs text-gray-400">
              • Create new guild if name doesn't exist
              • Join existing guild if it does
              • Guild members can chat and fight together
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

