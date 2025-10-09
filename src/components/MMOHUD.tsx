import React from 'react';
import { Heart, Zap, Droplet, Users, Sword, Shield } from 'lucide-react';

interface MMOHUDProps {
  health: number;
  stamina: number;
  mana: number;
  level: number;
  experience: number;
  maxExperience: number;
  playersOnline: number;
}

const MMOHUD: React.FC<MMOHUDProps> = ({
  health,
  stamina,
  mana,
  level,
  experience,
  maxExperience,
  playersOnline
}) => {
  return (
    <>
      <div className="absolute top-4 left-4 space-y-3">
        <div className="bg-black/80 backdrop-blur-sm border border-cyan-500/50 rounded-lg p-4 min-w-[300px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-cyan-400 font-bold text-lg">Level {level}</span>
            <span className="text-gray-400 text-sm flex items-center gap-1">
              <Users size={14} />
              {playersOnline} Online
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-red-400 text-sm flex items-center gap-1">
                  <Heart size={14} />
                  Health
                </span>
                <span className="text-white text-xs">{health}/100</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-red-600 to-red-400 h-full transition-all duration-300"
                  style={{ width: `${health}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-green-400 text-sm flex items-center gap-1">
                  <Zap size={14} />
                  Stamina
                </span>
                <span className="text-white text-xs">{stamina}/100</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-600 to-green-400 h-full transition-all duration-300"
                  style={{ width: `${stamina}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-blue-400 text-sm flex items-center gap-1">
                  <Droplet size={14} />
                  Mana
                </span>
                <span className="text-white text-xs">{mana}/100</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 to-blue-400 h-full transition-all duration-300"
                  style={{ width: `${mana}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-yellow-400 text-sm">Experience</span>
              <span className="text-white text-xs">{experience}/{maxExperience}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-yellow-600 to-yellow-400 h-full transition-all duration-300"
                style={{ width: `${(experience / maxExperience) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-black/80 backdrop-blur-sm border border-cyan-500/50 rounded-lg p-3">
          <div className="text-cyan-400 text-xs font-bold mb-2">QUICK STATS</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1 text-gray-300">
              <Sword size={12} className="text-red-400" />
              <span>ATK: 25</span>
            </div>
            <div className="flex items-center gap-1 text-gray-300">
              <Shield size={12} className="text-blue-400" />
              <span>DEF: 15</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4">
        <div className="bg-black/80 backdrop-blur-sm border border-cyan-500/50 rounded-lg p-4 min-w-[250px]">
          <div className="text-cyan-400 font-bold mb-3">MINIMAP</div>
          <div className="w-full aspect-square bg-gray-900 rounded border border-cyan-500/30 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            </div>
            <div className="absolute top-2 left-2 w-1 h-1 bg-green-400 rounded-full" />
            <div className="absolute bottom-3 right-4 w-1 h-1 bg-green-400 rounded-full" />
            <div className="absolute top-1/2 right-3 w-1 h-1 bg-green-400 rounded-full" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4">
        <div className="bg-black/80 backdrop-blur-sm border border-cyan-500/50 rounded-lg p-3">
          <div className="text-cyan-400 text-xs font-bold mb-2">ACTIVE QUESTS</div>
          <div className="space-y-2 text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full" />
              <span>Explore the City (0/5)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full" />
              <span>Meet Other Players (0/3)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(slot => (
            <div
              key={slot}
              className="w-12 h-12 bg-black/80 backdrop-blur-sm border border-cyan-500/50 rounded flex items-center justify-center text-cyan-400 text-xs font-bold hover:border-cyan-400 transition-colors cursor-pointer"
            >
              {slot}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default MMOHUD;
