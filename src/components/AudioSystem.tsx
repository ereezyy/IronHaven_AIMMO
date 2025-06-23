import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameState';

interface AudioSystemProps {}

const AudioSystem: React.FC<AudioSystemProps> = () => {
  const gameStore = useGameStore();
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundsRef = useRef<{ [key: string]: AudioBuffer }>({});
  const backgroundMusicRef = useRef<AudioBufferSourceNode | null>(null);

  // Initialize Web Audio API
  useEffect(() => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      generateSounds();
      playBackgroundMusic();
    } catch (error) {
      console.log('Web Audio API not supported');
    }

    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.stop();
      }
    };
  }, []);

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
    if (!audioContextRef.current || !soundsRef.current[soundName]) return;

    const ctx = audioContextRef.current;
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    
    source.buffer = soundsRef.current[soundName];
    source.playbackRate.value = pitch;
    gainNode.gain.value = volume;
    
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    source.start();
  };

  const playBackgroundMusic = () => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator1.type = 'sawtooth';
    oscillator1.frequency.value = 55; // Low A
    oscillator2.type = 'sine';
    oscillator2.frequency.value = 110; // Higher A
    
    gainNode.gain.value = 0.05; // Very low volume
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator1.start();
    oscillator2.start();
    
    // Create a dark, atmospheric loop
    setInterval(() => {
      if (oscillator1.frequency && oscillator2.frequency) {
        const variation = Math.random() * 10 - 5;
        oscillator1.frequency.value = 55 + variation;
        oscillator2.frequency.value = 110 + variation * 2;
      }
    }, 2000);
  };

  // Listen for game events and play sounds
  useEffect(() => {
    const recentAction = gameStore.recentActions[gameStore.recentActions.length - 1];
    if (!recentAction) return;

    if (recentAction.includes('fired_')) {
      playSound('gunshot', 0.8, Math.random() * 0.4 + 0.8);
    }
    
    if (recentAction.includes('player_moved')) {
      if (Math.random() > 0.95) { // Occasional footsteps
        playSound('footstep', 0.3, Math.random() * 0.4 + 0.8);
      }
    }
    
    if (recentAction.includes('stole_')) {
      playSound('engine', 0.6);
    }
    
    if (gameStore.playerStats.wanted > 2) {
      if (Math.random() > 0.98) { // Occasional siren when wanted
        playSound('siren', 0.4);
      }
    }
  }, [gameStore.recentActions, gameStore.playerStats.wanted]);

  // Ambient city sounds
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.9) {
        playSound('ambient', 0.1, Math.random() * 0.6 + 0.7);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return null; // This component handles audio, no visual output
};

export default AudioSystem;