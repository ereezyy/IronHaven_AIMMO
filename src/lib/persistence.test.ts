import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { persistenceService } from './persistence';
import { supabase } from './supabase';

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('PersistenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset private state using type assertion
    (persistenceService as any).currentPlayerId = null;
    (persistenceService as any).offlineMode = false;
  });

  describe('initializePlayer', () => {
    it('should initialize player successfully and save to database', async () => {
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: { id: 'test-id' }, error: null });
      const mockSelect = vi
        .fn()
        .mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any);

      const playerId = await persistenceService.initializePlayer('TestPlayer');

      expect(playerId).toBeDefined();
      expect(persistenceService.getCurrentPlayerId()).toBe(playerId);
      expect(persistenceService.isOfflineMode()).toBe(false);
      expect(supabase.from).toHaveBeenCalledWith('players');
      expect(mockInsert).toHaveBeenCalled();

      const insertedData = mockInsert.mock.calls[0][0][0];
      expect(insertedData.username).toBe('TestPlayer');
      expect(insertedData.id).toBe(playerId);
    });

    it('should use a generated username if none is provided', async () => {
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: { id: 'test-id' }, error: null });
      const mockSelect = vi
        .fn()
        .mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any);

      const playerId = await persistenceService.initializePlayer('');

      expect(playerId).toBeDefined();
      const insertedData = mockInsert.mock.calls[0][0][0];
      expect(insertedData.username).toMatch(/^Player_/);
    });

    it('should fallback to offline mode if database insertion returns an error', async () => {
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'DB Error' } });
      const mockSelect = vi
        .fn()
        .mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any);

      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const playerId = await persistenceService.initializePlayer('TestPlayer');

      expect(playerId).toBeDefined();
      expect(persistenceService.isOfflineMode()).toBe(true);
      expect(persistenceService.getCurrentPlayerId()).toBe(playerId);

      const storedData = JSON.parse(
        localStorage.getItem('ironhaven_player_data') || '{}'
      );
      expect(storedData.username).toBe('TestPlayer');
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should fallback to offline mode if an exception occurs during initialization', async () => {
      vi.mocked(supabase.from).mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const playerId = await persistenceService.initializePlayer('TestPlayer');

      expect(playerId).toBeDefined();
      expect(persistenceService.isOfflineMode()).toBe(true);
      expect(persistenceService.getCurrentPlayerId()).toBe(playerId);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });
});
