import React from 'react';

interface WeatherUIProps {
  weather: 'clear' | 'rain' | 'fog' | 'storm';
}

const WeatherUI: React.FC<WeatherUIProps> = ({ weather }) => {
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
    <div className="absolute top-56 left-4 p-2 bg-black/90 text-white rounded-lg border border-red-500/70 backdrop-blur-sm">
      <div className="flex items-center text-sm">
        <span className="text-lg mr-2">{getWeatherIcon()}</span>
        <span className="text-gray-300">{getWeatherDescription()}</span>
      </div>
    </div>
  );
};

export default WeatherUI;