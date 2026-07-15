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
  speak(text: string, tone: VoiceTone = 'director', volume = 0.22): void {
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
      const f = base * pitch * (1 + 0.08 * Math.sin(i * 1.7) + (i % 3) * 0.04);
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
    const now = ctx.currentTime;
    this.cityRunning = true;

    // Master ambient gain — kept low so it's atmospheric, not intrusive.
    const ambGain = ctx.createGain();
    ambGain.gain.value = 0.28;
    ambGain.connect(this.master);

    const nodes: AudioNode[] = [ambGain];

    // ── Sub-bass (felt, not heard) ──
    const sub = ctx.createOscillator();
    const subG = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.value = 41;
    subG.gain.value = 0.35;
    sub.connect(subG);
    subG.connect(ambGain);
    sub.start(now);
    nodes.push(sub, subG);

    // Slow LFO on sub-bass pitch for organic drift.
    const subLfo = ctx.createOscillator();
    const subLfoG = ctx.createGain();
    subLfo.type = 'sine';
    subLfo.frequency.value = 0.12;
    subLfoG.gain.value = 2.5;
    subLfo.connect(subLfoG);
    subLfoG.connect(sub.frequency);
    subLfo.start(now);
    nodes.push(subLfo, subLfoG);

    // ── Pad layer (two detuned sawtooth waves, filtered) ──
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 380;
    padFilter.Q.value = 0.6;
    padFilter.connect(ambGain);
    nodes.push(padFilter);

    // Saw 1 — root note (~C2)
    const saw1 = ctx.createOscillator();
    const saw1G = ctx.createGain();
    saw1.type = 'sawtooth';
    saw1.frequency.value = 65.41;
    saw1G.gain.value = 0.035;
    saw1.connect(saw1G);
    saw1G.connect(padFilter);
    saw1.start(now);
    nodes.push(saw1, saw1G);

    // Saw 2 — detuned fifth above for width
    const saw2 = ctx.createOscillator();
    const saw2G = ctx.createGain();
    saw2.type = 'sawtooth';
    saw2.frequency.value = 97.99;
    saw2G.gain.value = 0.028;
    saw2.connect(saw2G);
    saw2G.connect(padFilter);
    saw2.start(now);
    nodes.push(saw2, saw2G);

    // Slow LFO on pad filter cutoff — the "breathing" pad.
    const padLfo = ctx.createOscillator();
    const padLfoG = ctx.createGain();
    padLfo.type = 'sine';
    padLfo.frequency.value = 0.08;
    padLfoG.gain.value = 180;
    padLfo.connect(padLfoG);
    padLfoG.connect(padFilter.frequency);
    padLfo.start(now);
    nodes.push(padLfo, padLfoG);

    // ── Subtle rhythmic pulse (distant heartbeat of the city) ──
    const pulseLfo = ctx.createOscillator();
    const pulseG = ctx.createGain();
    const pulseDest = ctx.createGain();
    pulseDest.gain.value = 0.04;
    pulseDest.connect(ambGain);
    pulseLfo.type = 'sine';
    pulseLfo.frequency.value = 1.4;
    pulseG.gain.value = 0.04;
    pulseLfo.connect(pulseG);
    pulseG.connect(pulseDest.gain);
    pulseLfo.start(now);
    nodes.push(pulseLfo, pulseG, pulseDest);

    // ── Filtered noise bed (distant city, data streams) ──
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    noiseSrc.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 800;
    noiseFilter.Q.value = 0.5;

    const noiseG = ctx.createGain();
    noiseG.gain.value = 0.018;

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseG);
    noiseG.connect(ambGain);
    noiseSrc.start(now);
    nodes.push(noiseSrc, noiseFilter, noiseG);

    // Slow LFO on noise filter for "city breathing"
    const noiseLfo = ctx.createOscillator();
    const noiseLfoG = ctx.createGain();
    noiseLfo.type = 'sine';
    noiseLfo.frequency.value = 0.06;
    noiseLfoG.gain.value = 350;
    noiseLfo.connect(noiseLfoG);
    noiseLfoG.connect(noiseFilter.frequency);
    noiseLfo.start(now);
    nodes.push(noiseLfo, noiseLfoG);

    // ── Stereo delay / space (feedback loop for width) ──
    const delayIn = ctx.createGain();
    delayIn.gain.value = 0.22;
    delayIn.connect(ambGain);

    const delay = ctx.createDelay(0.4);
    delay.delayTime.value = 0.28;

    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;

    const delayOut = ctx.createGain();
    delayOut.gain.value = 0.14;

    delayIn.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    feedback.connect(delayOut);
    delayOut.connect(ambGain);

    // Tap the pad into the delay for spatial width.
    const delayTap = ctx.createGain();
    delayTap.gain.value = 0.5;
    padFilter.connect(delayTap);
    delayTap.connect(delayIn);
    nodes.push(delayIn, delay, feedback, delayOut, delayTap);

    this.cityNodes = nodes;
  }

  stopCityBed(): void {
    for (const n of this.cityNodes) {
      try {
        if (
          'stop' in n &&
          typeof (n as OscillatorNode | AudioBufferSourceNode).stop === 'function'
        ) {
          (n as OscillatorNode | AudioBufferSourceNode).stop();
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
