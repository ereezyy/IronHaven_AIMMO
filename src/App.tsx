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
import EpicIntro from './components/EpicIntro';
import InstantAction from './components/InstantAction';

function App() {
  const [currentView, setCurrentView] = useState<'intro' | 'instant-action' | 'landing' | 'game'>('intro');

  // Epic intro sequence (first 20 seconds)
  if (currentView === 'intro') {
    return (
      <EpicIntro onComplete={() => setCurrentView('instant-action')} />
    );
  }

  // Instant action demo (judges can interact immediately)
  if (currentView === 'instant-action') {
    return (
      <InstantAction
        onAIDemo={() => setCurrentView('game')}
        onMultiplayerDemo={() => setCurrentView('game')}
        onCombatDemo={() => setCurrentView('game')}
      />
    );
  }

  if (currentView === 'game') {
    return (
      <div className="relative">
        <MobileWarning />
        <button
          onClick={() => setCurrentView('instant-action')}
          className="absolute top-4 left-4 z-50 bg-black/80 hover:bg-black text-white px-4 py-2 rounded-sm border border-red-500/50 backdrop-blur-sm transition-colors"
        >
          ← BACK TO DEMO
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