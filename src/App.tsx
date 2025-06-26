import React, { useState } from 'react';
import Game from './components/Game';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import StorySection from './components/StorySection';
import GameplaySection from './components/GameplaySection';
import CitySection from './components/CitySection';
import CharacterSection from './components/CharacterSection';
import FeaturesSection from './components/FeaturesSection';
import FooterSection from './components/FooterSection';
import AIStatusDisplay from './components/AIStatusDisplay';
import MobileWarning from './components/MobileWarning';

function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'game'>('landing');

  if (currentView === 'game') {
    return (
      <div className="relative">
        <MobileWarning />
        <button
          onClick={() => setCurrentView('landing')}
          className="absolute top-4 left-4 z-50 bg-black/80 hover:bg-black text-white px-4 py-2 rounded-sm border border-red-500/50 backdrop-blur-sm transition-colors"
        >
          ← BACK TO SITE
        </button>
        <AIStatusDisplay />
        <Game />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <MobileWarning />
      <AIStatusDisplay />
      <Navbar onPlayGame={() => setCurrentView('game')} />
      <HeroSection onPlayGame={() => setCurrentView('game')} />
      <StorySection />
      <GameplaySection />
      <CitySection />
      <CharacterSection />
      <FeaturesSection />
      <FooterSection />
    </div>
  );
}

export default App;