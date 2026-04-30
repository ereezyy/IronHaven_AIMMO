import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockTextGeneration } = vi.hoisted(() => ({
  mockTextGeneration: vi.fn(),
}));

vi.mock('@huggingface/inference', () => {
  return {
    HfInference: vi.fn().mockImplementation(function() {
      this.textGeneration = mockTextGeneration;
    }),
  };
});

// Import aiService after mocking
import { aiService } from './ai';

describe('AIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateMission', () => {
    it('should generate a mission successfully using AI', async () => {
      const mockResponse = {
        generated_text: 'Title: Test Mission | Description: Test Desc | Objectives: 1.Obj1 2.Obj2 3.Obj3 | Difficulty: easy | Reward: 000',
      };

      mockTextGeneration.mockResolvedValue(mockResponse);

      const mission = await aiService.generateMission(1, 'Test Location', 'test-type');

      expect(mission.title).toBe('Test Mission');
      expect(mission.description).toBe('Test Desc');
      expect(mockTextGeneration).toHaveBeenCalledWith(expect.objectContaining({
        model: 'gpt2',
        inputs: expect.stringContaining('Test Location'),
      }));
    });

    it('should use fallback mission when AI generation fails', async () => {
      // Mock error
      mockTextGeneration.mockRejectedValue(new Error('API Error'));

      const mission = await aiService.generateMission(10, 'Night City', 'combat');

      // The fallback mission ID should start with fallback_mission_
      expect(mission.id).toMatch(/^fallback_mission_/);

      // Verify it is one of the fallback missions
      const possibleTitles = ['Corporate Infiltration', 'Territory War', 'Information Broker'];
      expect(possibleTitles).toContain(mission.title);

      expect(mission.location).toBe('Night City');
      expect(mockTextGeneration).toHaveBeenCalled();
    });

    it('should handle empty response from AI by using default values in parser', async () => {
      mockTextGeneration.mockResolvedValue({ generated_text: '' });

      const mission = await aiService.generateMission(5, 'Empty Zone', 'stealth');

      expect(mission.title).toBe('Generated Mission');
      expect(mission.description).toBe('AI-generated objective');
      expect(mission.id).toMatch(/^ai_mission_/);
    });
  });
});
