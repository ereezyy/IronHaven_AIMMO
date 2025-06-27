import React, { useState } from 'react';
import MinimalGame from './components/MinimalGame';
import SimpleIntro from './components/SimpleIntro';
import InstantAction from './components/InstantAction';

function App() {
  const [currentView, setCurrentView] = useState<'intro' | 'instant-action' | 'landing' | 'game'>('intro');

  // Epic intro sequence (first 20 seconds)
  if (currentView === 'intro') {
    return (
      <SimpleIntro onComplete={() => setCurrentView('instant-action')} />
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
    return <MinimalGame />;
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="text-white p-8">
        <h1>Landing page temporarily disabled for testing</h1>
        <button 
          onClick={() => setCurrentView('intro')}
          className="bg-cyan-500 px-4 py-2 rounded mt-4"
        >
          Go to Intro
        </button>
      </div>
    </div>
  );
}

export default App;