import { describe, it, expect, beforeEach } from 'vitest';
import { gameAudio } from './gameAudio';

describe('gameAudio', () => {
  beforeEach(() => {
    gameAudio.setMuted(false);
  });

  it('toggles mute state', () => {
    expect(gameAudio.isMuted()).toBe(false);
    expect(gameAudio.toggleMute()).toBe(true);
    expect(gameAudio.isMuted()).toBe(true);
    expect(gameAudio.toggleMute()).toBe(false);
  });

  it('play and footstep do not throw without unlock', () => {
    expect(() => gameAudio.play('hit')).not.toThrow();
    expect(() => gameAudio.footstep(6)).not.toThrow();
    expect(() => gameAudio.play('stinger')).not.toThrow();
    expect(() => gameAudio.speak('Test line', 'director')).not.toThrow();
    expect(() => gameAudio.cutsceneStinger('system')).not.toThrow();
    expect(() => gameAudio.startCityBed()).not.toThrow();
    expect(() => gameAudio.stopCityBed()).not.toThrow();
  });
});
