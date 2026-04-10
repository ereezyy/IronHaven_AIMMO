import React, { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../store/gameState';

interface AudioSystemProps {
  enabled?: boolean;
}

const AudioSystem: React.FC<AudioSystemProps> = ({ enabled = true }) => {
  const gameStore = useGameStore();
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundsRef = useRef<{ [key: string]: AudioBuffer }>({});
  const backgroundMusicRef = useRef<AudioBufferSourceNode | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  // Initialize Web Audio API after user interaction
  useEffect(() => {
    const initAudio = async () => {
      if (!enabled || !userInteracted) return;
      
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) {
          console.warn('Web Audio API not supported');
          return;
        }
        
        audioContextRef.current = new AudioContext();
        
        // Resume context if suspended
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        
        generateSounds();
        setAudioInitialized(true);
        
        // Only play background music if context is running
        if (audioContextRef.current.state === 'running') {
          playBackgroundMusic();
        }
      } catch (error) {
        console.warn('Audio initialization failed:', error);
      }
    };

    initAudio();
  }, [enabled, userInteracted]);
  
  // Handle user interaction to enable audio
  useEffect(() => {
    const handleInteraction = () => {
      setUserInteracted(true);
    };
    
    if (!userInteracted) {
      document.addEventListener('click', handleInteraction);
      document.addEventListener('keydown', handleInteraction);
      document.addEventListener('touchstart', handleInteraction);
    }

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, [userInteracted]);

  // Generate procedural sounds using Web Audio API
  const generateSounds = () => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    
    // Gunshot sound
    const gunshotBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const gunshotData = gunshotBuffer.getChannelData(0);
    for (let i = 0; i < gunshotData.length; i++) {
      const decay = Math.exp(-i / (ctx.sampleRate * 0.05));
      gunshotData[i] = (Math.random() * 2 - 1) * decay * 0.8;
    }
    soundsRef.current.gunshot = gunshotBuffer;

    // Footstep sound
    const footstepBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const footstepData = footstepBuffer.getChannelData(0);
    for (let i = 0; i < footstepData.length; i++) {
      const decay = Math.exp(-i / (ctx.sampleRate * 0.02));
      footstepData[i] = (Math.random() * 2 - 1) * decay * 0.3;
    }
    soundsRef.current.footstep = footstepBuffer;

    // Car engine sound
    const engineBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const engineData = engineBuffer.getChannelData(0);
    for (let i = 0; i < engineData.length; i++) {
      const time = i / ctx.sampleRate;
      engineData[i] = Math.sin(time * 60 * Math.PI) * 0.4 + Math.sin(time * 120 * Math.PI) * 0.2;
    }
    soundsRef.current.engine = engineBuffer;

    // Police siren
    const sirenBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const sirenData = sirenBuffer.getChannelData(0);
    for (let i = 0; i < sirenData.length; i++) {
      const time = i / ctx.sampleRate;
      const freq = 800 + Math.sin(time * 4 * Math.PI) * 400;
      sirenData[i] = Math.sin(time * freq * Math.PI * 2) * 0.5;
    }
    soundsRef.current.siren = sirenBuffer;

    // Ambient city noise
    const ambientBuffer = ctx.createBuffer(1, ctx.sampleRate * 5, ctx.sampleRate);
    const ambientData = ambientBuffer.getChannelData(0);
    for (let i = 0; i < ambientData.length; i++) {
      ambientData[i] = (Math.random() * 2 - 1) * 0.1;
    }
    soundsRef.current.ambient = ambientBuffer;
  };

  const playSound = (soundName: string, volume: number = 1, pitch: number = 1) => {
    if (!audioInitialized || !audioContextRef.current || !soundsRef.current[soundName] || !enabled) return;
    
    try {
      const ctx = audioContextRef.current;
      
      // Check if context is suspended
      if (ctx.state === 'suspended') {
        ctx.resume();
        return;
      }
      
      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();
      
      source.buffer = soundsRef.current[soundName];
      source.playbackRate.value = pitch;
      gainNode.gain.value = Math.min(volume * 0.3, 0.3); // Reduce volume significantly
      
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      source.start();
      
      // Clean up after sound finishes
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
      };
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  };

  const playBackgroundMusic = () => {
    if (!audioInitialized || !audioContextRef.current || !enabled) return;
    
    // Simplified background music - just a low drone
    try {
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 60; // Low drone
      gainNode.gain.value = 0.02; // Very quiet
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start();
      backgroundMusicRef.current = oscillator as any;
    } catch (error) {
      console.warn('Error starting background music:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (backgroundMusicRef.current) {
        try {
          (backgroundMusicRef.current as any).stop();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  // Listen for game events and play sounds (with reduced frequency)
  useEffect(() => {
    if (!audioInitialized || !enabled) return;
    
    const recentAction = gameStore.recentActions[gameStore.recentActions.length - 1];
    if (!recentAction) return;

    // Reduce sound frequency to avoid spam
    if (Math.random() > 0.7) return;

    if (recentAction.includes('fired_') || recentAction.includes('killed_')) {
      playSound('gunshot', 0.3, Math.random() * 0.4 + 0.8);
    }
    
    if (recentAction.includes('stole_')) {
      playSound('engine', 0.2);
    }
  }, [gameStore.recentActions, audioInitialized, enabled]);

  // Show audio status if not initialized
  if (!userInteracted && enabled) {
    return (
      <div className="absolute top-72 left-4 p-3 bg-yellow-600/90 text-white rounded-lg border border-yellow-500/70 backdrop-blur-sm text-sm">
        <div className="flex items-center">
          <span className="mr-2">🔊</span>
          <span>Click anywhere to enable audio</span>
        </div>
      </div>
    );
  }

  return null;
};

export default AudioSystem;