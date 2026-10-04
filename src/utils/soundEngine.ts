// Synthesized Web Audio API sound effects for the hydraulic water hammer, anvil clang, water wheel, and bellows

class ForgeAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Plays a realistic metallic anvil impact combined with low-frequency stone/wood thud
   * Pitch and ring resonance change based on iron temperature and hammer force.
   */
  public playHammerStrike(forceLevel: 1 | 2 | 3, temperatureC: number, accuracyBonus: number) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Hot iron is softer and produces a deeper, duller thud; cold iron rings sharply
    const tempFactor = Math.max(0, Math.min(1, (temperatureC - 500) / 700));
    const baseFreq = 390 + (1 - tempFactor) * 260 + (accuracyBonus > 0.8 ? 45 : 0);
    const volume = forceLevel === 3 ? 0.55 : forceLevel === 2 ? 0.4 : 0.26;

    // 1. Low hydraulic timber & stone thud
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(115 - forceLevel * 12, now);
    thudOsc.frequency.exponentialRampToValueAtTime(34, now + 0.19);

    thudGain.gain.setValueAtTime(volume * 0.9, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start(now);
    thudOsc.stop(now + 0.23);

    // 2. Metallic anvil ring (2 inharmonic partials)
    const partials = [1, 2.42, 3.85];
    partials.forEach((ratio, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'square';
      osc.frequency.setValueAtTime(baseFreq * ratio, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * ratio * 0.98, now + 0.35);

      const partialGain = (volume * 0.32) / (idx + 1);
      gain.gain.setValueAtTime(partialGain, now);
      // Cold iron rings longer, glowing hot iron damps faster
      const ringDuration = 0.24 + (1 - tempFactor) * 0.28;
      gain.gain.exponentialRampToValueAtTime(0.0008, now + ringDuration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + ringDuration + 0.02);
    });

    // 3. High-frequency scale/spark burst noise
    const bufferSize = ctx.sampleRate * 0.09;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.setValueAtTime(1.5, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(now);
  }

  /**
   * Plays the hydro-eolic trumpet ("tromba idroeolica") air blast sound when reheating the iron
   */
  public playReheatBellows() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = 0.55;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, now);
    filter.frequency.exponentialRampToValueAtTime(980, now + duration * 0.5);
    filter.frequency.exponentialRampToValueAtTime(280, now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  /**
   * Plays a celebratory harmonic anvil chime when completing a forging blueprint
   */
  public playCompletionChime(isMasterpiece: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = isMasterpiece ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);

      gain.gain.setValueAtTime(0.18, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + idx * 0.09 + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.67);
    });
  }
}

export const forgeAudio = new ForgeAudioEngine();
