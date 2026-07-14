import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import SimpleIntro from './components/SimpleIntro';
import ScreenFade from './components/ScreenFade';
import type { CharacterBuild } from './game/character';
import { loadBuild } from './game/character';
import {
  hasSeenOpening,
  markOpeningSeen,
  loadContinueHint,
  saveContinueHint,
} from './game/onboarding';
import { handlePassReturnFromUrl } from './lib/stripePass';
import { useGameStore } from './store/gameState';

const OpeningCinematic = lazy(() => import('./components/OpeningCinematic'));
const InstantAction = lazy(() => import('./components/InstantAction'));
const CharacterCreator = lazy(() => import('./components/CharacterCreator'));
const MMOGame = lazy(() => import('./components/MMOGame'));

type View = 'intro' | 'cinematic' | 'menu' | 'creator' | 'game';

function BootScreen({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-[#050507] text-neutral-500 font-mono flex items-center justify-center text-[11px] tracking-[0.35em] uppercase">
      {label}
    </div>
  );
}

function App() {
  const [currentView, setCurrentView] = useState<View>('intro');
  const [build, setBuild] = useState<CharacterBuild | null>(null);
  const [fading, setFading] = useState(false);
  const [pendingView, setPendingView] = useState<View | null>(null);

  // Stripe return + skip-seen opening on boot.
  useEffect(() => {
    void handlePassReturnFromUrl().then((pass) => {
      if (pass) useGameStore.setState({ pass });
    });
  }, []);

  const go = useCallback((next: View) => {
    setPendingView(next);
    setFading(true);
  }, []);

  const enterCreator = () => go('creator');

  const enterFromMenu = () => {
    // Continue with saved build if present.
    const saved = loadBuild();
    if (saved?.callsign) {
      setBuild(saved);
      saveContinueHint(saved.callsign);
      go('game');
      return;
    }
    enterCreator();
  };

  if (currentView === 'intro') {
    return (
      <>
        <SimpleIntro
          onComplete={() => {
            if (hasSeenOpening()) go('menu');
            else go('cinematic');
          }}
        />
        <ScreenFade
          active={fading}
          onMidpoint={() => {
            if (pendingView) {
              setCurrentView(pendingView);
              setPendingView(null);
            }
          }}
          onDone={() => setFading(false)}
        />
      </>
    );
  }

  return (
    <Suspense fallback={<BootScreen label="loading district…" />}>
      {currentView === 'cinematic' && (
        <OpeningCinematic
          onComplete={() => {
            markOpeningSeen();
            go('menu');
          }}
        />
      )}
      {currentView === 'menu' && (
        <InstantAction
          onAIDemo={enterFromMenu}
          onMultiplayerDemo={enterFromMenu}
          onCombatDemo={enterFromMenu}
          continueCallsign={loadContinueHint() || loadBuild()?.callsign || null}
          onContinue={
            loadBuild()
              ? () => {
                  const b = loadBuild();
                  if (b) {
                    setBuild(b);
                    go('game');
                  } else enterCreator();
                }
              : undefined
          }
          onNewRunner={enterCreator}
        />
      )}
      {currentView === 'creator' && (
        <CharacterCreator
          onComplete={(b) => {
            setBuild(b);
            saveContinueHint(b.callsign);
            go('game');
          }}
        />
      )}
      {currentView === 'game' && (
        <MMOGame
          initialCallsign={build?.callsign}
          initialBuild={build || undefined}
        />
      )}
      <ScreenFade
        active={fading}
        onMidpoint={() => {
          if (pendingView) {
            setCurrentView(pendingView);
            setPendingView(null);
          }
        }}
        onDone={() => setFading(false)}
      />
    </Suspense>
  );
}

export default App;
