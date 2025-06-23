import React from 'react';

interface DayNightUIProps {
  currentTime: number;
  isNight: boolean;
}

const DayNightUI: React.FC<DayNightUIProps> = ({ currentTime, isNight }) => {
  const formatTime = (time: number): string => {
    const hours = Math.floor(time);
    const minutes = Math.floor((time - hours) * 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const getTimeOfDay = (): string => {
    if (currentTime >= 5 && currentTime < 7) return 'Dawn';
    if (currentTime >= 7 && currentTime < 12) return 'Morning';
    if (currentTime >= 12 && currentTime < 17) return 'Afternoon';
    if (currentTime >= 17 && currentTime < 19) return 'Evening';
    if (currentTime >= 19 && currentTime < 21) return 'Dusk';
    return 'Night';
  };

  return (
    <div className="absolute top-44 left-4 p-3 bg-black/90 text-white rounded-lg border border-red-500/70 backdrop-blur-sm">
      <div className="text-center">
        <div className="text-lg font-bold text-yellow-400">{formatTime(currentTime)}</div>
        <div className="text-sm text-gray-400">{getTimeOfDay()}</div>
        <div className="text-xs text-gray-500 mt-1">
          {isNight ? '🌙 Night' : '☀️ Day'}
        </div>
      </div>
    </div>
  );
};

export default DayNightUI;