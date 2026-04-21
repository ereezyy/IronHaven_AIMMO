import { render, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Game from './Game';
import React from 'react';
import { worldGenerator } from '../lib/worldGenerator';
import { generateNPCResponse } from '../lib/ai';

// Mock all the sub-components
vi.mock('./SpriteCharacter', () => ({ default: (props: any) => (
  <div data-testid="sprite-character">
    {props.onClick && <button data-testid={`click-sprite-${props.type}`} onClick={props.onClick}>Click Sprite</button>}
  </div>
) }));
vi.mock('./WeaponSystem', () => ({
  default: () => <div data-testid="weapon-system" />,
  weapons: [{ id: 'fists', name: 'Fists' }]
}));
vi.mock('./EnhancedCombat', () => ({ default: () => <div data-testid="enhanced-combat" /> }));
vi.mock('./SmartNPC', () => ({ default: (props: any) => (
  <div data-testid="smart-npc">
    <button data-testid={`click-npc-${props.id}`} onClick={() => props.onInteraction(props)}>Click NPC</button>
  </div>
) }));
vi.mock('./ImmersiveWorld', () => ({ default: () => <div data-testid="immersive-world" /> }));
vi.mock('./VehicleSystem', () => ({ default: () => <div data-testid="vehicle-system" /> }));
vi.mock('./PoliceSystem', () => ({ default: () => <div data-testid="police-system" /> }));
vi.mock('./AudioSystem', () => ({ default: () => <div data-testid="audio-system" /> }));
vi.mock('./MissionSystem', () => ({ default: () => <div data-testid="mission-system" /> }));
vi.mock('./CrimeSystem', () => ({ default: () => <div data-testid="crime-system" /> }));
vi.mock('./DynamicEvents', () => ({ default: () => <div data-testid="dynamic-events" /> }));
vi.mock('./InventorySystem', () => ({ default: () => <div data-testid="inventory-system" /> }));
vi.mock('./ParticleSystem', () => ({ default: () => <div data-testid="particle-system" /> }));
vi.mock('./DayNightCycle', () => ({ default: () => <div data-testid="day-night-cycle" /> }));
vi.mock('./DayNightUI', () => ({ default: () => <div data-testid="day-night-ui" /> }));
vi.mock('./WeatherSystem', () => ({ default: () => <div data-testid="weather-system" /> }));
vi.mock('./WeatherUI', () => ({ default: () => <div data-testid="weather-ui" /> }));
vi.mock('./EnhancedUI', () => ({ default: () => <div data-testid="enhanced-ui" /> }));

// Mock the store
const mockUpdateStats = vi.fn();
const mockAddAction = vi.fn();
const mockSetPlayerPosition = vi.fn();

vi.mock('../store/gameState', () => ({
  useGameStore: () => ({
    playerStats: { health: 100, reputation: 0, wanted: 0, money: 1000, skills: {} },
    playerPosition: [0, 0, 0],
    currentWeaponId: 'fists',
    recentActions: [],
    getCurrentWeapon: () => ({ id: 'fists', name: 'Fists' }),
    setPlayerPosition: mockSetPlayerPosition,
    addAction: mockAddAction,
    updateStats: mockUpdateStats,
  })
}));

// Mock the world generator
vi.mock('../lib/worldGenerator', () => ({
  worldGenerator: {
    updateWorld: vi.fn().mockResolvedValue([{ id: 'chunk-1', biome: 'downtown', buildings: [], npcs: [], vehicles: [], props: [] }]),
    getActiveChunks: vi.fn().mockReturnValue([]),
  }
}));

// Mock AI functions
vi.mock('../lib/ai', () => ({
  generateNPCResponse: vi.fn().mockResolvedValue({ dialogue: 'Hello there!', mood: 'neutral' }),
  analyzeThreatLevel: vi.fn().mockResolvedValue({ level: 'low' }),
}));

describe('Game Component - World Updates', () => {
  let consoleSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('updates world chunks successfully', async () => {
    const mockChunks = [{ id: 'chunk-1', biome: 'downtown', buildings: [], npcs: [], vehicles: [], props: [] }];
    vi.mocked(worldGenerator.updateWorld).mockResolvedValue(mockChunks);

    await act(async () => {
      render(<Game />);
    });

    await waitFor(() => {
      expect(worldGenerator.updateWorld).toHaveBeenCalled();
    });
  });

  it('handles error during world update', async () => {
    const error = new Error('Failed to update world');
    vi.mocked(worldGenerator.updateWorld).mockRejectedValue(error);

    await act(async () => {
      render(<Game />);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error updating world:', error);
    });
  });

  it('uses world chunk data in NPC interaction', async () => {
    const mockChunks = [{ id: 'chunk-1', biome: 'slums', buildings: [], npcs: [{ id: 'npc-1', type: 'civilian', position: [1, 0, 1] }], vehicles: [], props: [] }];
    vi.mocked(worldGenerator.updateWorld).mockResolvedValue(mockChunks);

    const { getByTestId } = render(<Game />);

    await waitFor(() => {
      expect(worldGenerator.updateWorld).toHaveBeenCalled();
    });

    // Wait for the NPC to be rendered
    const npcClickButton = await waitFor(() => getByTestId('click-npc-npc-1'));

    await act(async () => {
      npcClickButton.click();
    });

    await waitFor(() => {
      expect(generateNPCResponse).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Array),
        expect.stringContaining('slums')
      );
    });
  });
});
