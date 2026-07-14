// Procedural game audio — zero binary assets, fully free, works offline.
// Web Audio oscillators + noise buffers for combat, footsteps, and a night
// city bed. Call unlock() after the first user gesture.

type SoundName =
  | 'hit'
  | 'kill'
  | 'ui'
  | 'talk'
  | 'market'
  | 'death'
  | 'siren'
  | 'stinger';

export type VoiceTone = 'system' | 'director' | 'street' | 'hostile' | 'warm';

const VOICE_PITCH: Record<VoiceTone, number> = {
  system: 1.15,
  director: 0.92,
  street: 0.85,
  hostile: 0.72,
  warm: 1.05,
};

class GameAudio {
  private ctx: AudioContext | null = null;
  private muted = false;
  private unlocked = false;
  private cityNodes: AudioNode[] = [];
  private cityRunning = false;
  private lastFootstep = 0;
  private master: GainNode | null = null;
  private voiceGain: GainNode | null = null;

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) {
      this.master.gain.value = muted ? 0 : 1;
    }
    if (muted) this.stopCityBed();
    else if (this.unlocked) this.startCityBed();
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  /** Must run from a click/keydown handler (browser autoplay policy). */
  async unlock(): Promise<void> {
    if (this.unlocked && this.ctx?.state === 'running') return;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      if (!this.ctx) this.ctx = new AC();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      if (!this.master) {
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 1;
        this.master.connect(this.ctx.destination);
      }
      this.unlocked = true;
      this.startCityBed();
    } catch (e) {
      console.warn('[gameAudio] unlock failed', e);
    }
  }

  play(name: SoundName, volume = 0.35): void {
    if (!this.ctx || !this.master || this.muted || !this.unlocked) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = Math.min(0.5, volume);
    out.connect(this.master);

    switch (name) {
      case 'hit':
        this.noiseBurst(out, now, 0.08, 0.45);
        this.tone(out, now, 180, 0.06, 'square', 0.2);
        break;
      case 'kill':
        this.noiseBurst(out, now, 0.18, 0.55);
        this.tone(out, now, 90, 0.2, 'sawtooth', 0.25);
        this.tone(out, now + 0.05, 60, 0.25, 'sine', 0.2);
        break;
      case 'ui':
        this.tone(out, now, 880, 0.04, 'sine', 0.12);
        break;
      case 'talk':
        this.tone(out, now, 420, 0.05, 'triangle', 0.1);
        this.tone(out, now + 0.04, 520, 0.05, 'triangle', 0.08);
        break;
      case 'market':
        this.tone(out, now, 660, 0.05, 'sine', 0.1);
        this.tone(out, now + 0.06, 990, 0.06, 'sine', 0.08);
        break;
      case 'death':
        this.tone(out, now, 220, 0.4, 'sawtooth', 0.2);
        this.tone(out, now, 110, 0.5, 'sine', 0.25);
        this.noiseBurst(out, now, 0.35, 0.3);
        break;
      case 'siren':
        this.sirenBlip(out, now);
        break;
      case 'stinger':
        this.tone(out, now, 220, 0.12, 'sine', 0.14);
        this.tone(out, now + 0.08, 330, 0.18, 'triangle', 0.1);
        this.tone(out, now + 0.16, 440, 0.22, 'sine', 0.08);
        break;
    }

    // Disconnect after max duration so nodes don't leak.
    window.setTimeout(() => {
      try {
        out.disconnect();
      } catch {
        /* ignore */
      }
    }, 800);
  }

  /**
   * Procedural "voice" for cutscene subtitles — formant-ish blips paced
   * by word count. Not TTS; a cinematic radio stinger that feels spoken.
   */
  speak(
    text: string,
    tone: VoiceTone = 'director',
    volume = 0.22
  ): void {
    if (!this.ctx || !this.master || this.muted || !this.unlocked) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const words = text.trim().split(/\s+/).filter(Boolean);
    const n = Math.min(28, Math.max(4, words.length));
    const pitch = VOICE_PITCH[tone] ?? 1;
    const base = tone === 'hostile' ? 140 : tone === 'system' ? 210 : 170;

    if (!this.voiceGain) {
      this.voiceGain = ctx.createGain();
      this.voiceGain.connect(this.master);
    }
    this.voiceGain.gain.value = Math.min(0.35, volume);

    for (let i = 0; i < n; i++) {
      const t = now + i * 0.075;
      const f =
        base * pitch * (1 + 0.08 * Math.sin(i * 1.7) + (i % 3) * 0.04);
      // Two partials ≈ rough formants.
      this.tone(this.voiceGain, t, f, 0.055, 'sawtooth', 0.07);
      this.tone(this.voiceGain, t, f * 1.85, 0.045, 'triangle', 0.035);
      if (i % 5 === 4) {
        this.noiseBurst(this.voiceGain, t, 0.02, 0.04);
      }
    }
  }

  /** Short whoosh into a cutscene beat. */
  cutsceneStinger(tone: VoiceTone = 'director'): void {
    this.play('stinger', 0.2);
    // Soft tail in the voice band.
    if (!this.ctx || !this.master || this.muted || !this.unlocked) return;
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 0.08;
    out.connect(this.master);
    const f0 = 90 * (VOICE_PITCH[tone] || 1);
    this.tone(out, ctx.currentTime, f0, 0.35, 'sine', 0.12);
    window.setTimeout(() => {
      try {
        out.disconnect();
      } catch {
        /* ignore */
      }
    }, 500);
  }

  /** Call from the player frame when moving; rate scales with speed. */
  footstep(speed: number): void {
    if (!this.ctx || !this.master || this.muted || !this.unlocked) return;
    if (speed < 0.8) return;
    const now = performance.now();
    const interval = speed > 5.5 ? 220 : 340;
    if (now - this.lastFootstep < interval) return;
    this.lastFootstep = now;

    const ctx = this.ctx;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0.12 + Math.min(0.12, speed * 0.015);
    out.connect(this.master);
    this.noiseBurst(out, t, 0.04, 0.35);
    this.tone(out, t, 90 + Math.random() * 30, 0.03, 'sine', 0.15);
    window.setTimeout(() => {
      try {
        out.disconnect();
      } catch {
        /* ignore */
      }
    }, 200);
  }

  startCityBed(): void {
    if (!this.ctx || !this.master || this.muted || this.cityRunning) return;
    const ctx = this.ctx;
    this.cityRunning = true;

    // Low cyberpunk drone.
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 55;
    oscGain.gain.value = 0.018;
    osc.connect(oscGain);
    oscGain.connect(this.master);
    osc.start();

    // Soft second partial.
    const osc2 = ctx.createOscillator();
    const osc2Gain = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.value = 82.5;
    osc2Gain.gain.value = 0.008;
    osc2.connect(osc2Gain);
    osc2Gain.connect(this.master);
    osc2.start();

    // Filtered noise = rain / traffic hush.
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.012;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.master);
    noise.start();

    this.cityNodes = [osc, osc2, noise, oscGain, osc2Gain, noiseGain, filter];
  }

  stopCityBed(): void {
    for (const n of this.cityNodes) {
      try {
        if ('stop' in n && typeof (n as OscillatorNode).stop === 'function') {
          (n as OscillatorNode).stop();
        }
        n.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.cityNodes = [];
    this.cityRunning = false;
  }

  private tone(
    dest: AudioNode,
    start: number,
    freq: number,
    dur: number,
    type: OscillatorType,
    peak: number
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  private noiseBurst(
    dest: AudioNode,
    start: number,
    dur: number,
    peak: number
  ): void {
    if (!this.ctx) return;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = peak;
    src.connect(g);
    g.connect(dest);
    src.start(start);
  }

  private sirenBlip(dest: AudioNode, start: number): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, start);
    osc.frequency.linearRampToValueAtTime(1100, start + 0.25);
    osc.frequency.linearRampToValueAtTime(700, start + 0.5);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);
    osc.connect(g);
    g.connect(dest);
    osc.start(start);
    osc.stop(start + 0.6);
  }
}

export const gameAudio = new GameAudio();
