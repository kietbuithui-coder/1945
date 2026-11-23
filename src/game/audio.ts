// Procedural WebAudio: SFX, ambience and a soft pentatonic score.
type Ctx = AudioContext;

class AudioEngine {
  ctx: Ctx | null = null;
  master!: GainNode;
  sfxGain!: GainNode;
  musicGain!: GainNode;
  ambientGain!: GainNode;
  started = false;
  musicTimer: number | null = null;
  rainNode: AudioBufferSourceNode | null = null;
  rainGain: GainNode | null = null;
  step = 0;

  init() {
    if (this.started) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.7;
    this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.32;
    this.musicGain.connect(this.master);
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.28;
    this.ambientGain.connect(this.master);
    this.started = true;
    this.startMusic();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.started) this.init();
  }

  setSfx(v: number) { if (this.sfxGain) this.sfxGain.gain.value = v; }
  setMusic(v: number) { if (this.musicGain) this.musicGain.gain.value = v * 0.7; }

  private noiseBuffer(seconds = 1): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, when = 0, slide = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noise(dur: number, gain: number, filterFreq: number, type: BiquadFilterType = 'bandpass', when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(dur + 0.1);
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + dur + 0.05);
  }

  play(name: string) {
    if (!this.ctx) return;
    this.resume();
    switch (name) {
      case 'click':
        this.tone(660, 0.05, 'square', 0.05);
        break;
      case 'coin':
        this.tone(1320, 0.09, 'sine', 0.12);
        this.tone(1760, 0.14, 'sine', 0.1, 0.06);
        this.tone(2217, 0.18, 'sine', 0.06, 0.12);
        break;
      case 'buy':
        this.tone(520, 0.1, 'triangle', 0.1);
        this.tone(780, 0.14, 'triangle', 0.08, 0.07);
        break;
      case 'door':
        this.noise(0.35, 0.12, 320, 'bandpass');
        this.tone(140, 0.3, 'sine', 0.06, 0.02, -30);
        break;
      case 'paper':
        this.noise(0.18, 0.08, 2400, 'highpass');
        break;
      case 'heart':
        this.tone(660, 0.12, 'sine', 0.08);
        this.tone(990, 0.16, 'sine', 0.07, 0.1);
        break;
      case 'error':
        this.tone(180, 0.16, 'sawtooth', 0.06);
        this.tone(140, 0.2, 'sawtooth', 0.05, 0.08);
        break;
      case 'success':
        this.tone(523, 0.12, 'sine', 0.08);
        this.tone(659, 0.12, 'sine', 0.08, 0.1);
        this.tone(784, 0.2, 'sine', 0.1, 0.2);
        break;
      case 'footstep':
        this.noise(0.07, 0.05, 200, 'lowpass');
        break;
      case 'bell':
        this.tone(880, 0.5, 'sine', 0.07);
        this.tone(1320, 0.7, 'sine', 0.04, 0.02);
        break;
      case 'water':
        this.noise(0.5, 0.06, 900, 'bandpass');
        break;
      default:
        break;
    }
  }

  startRain() {
    if (!this.ctx || this.rainNode) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(2);
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1200;
    f.Q.value = 0.5;
    const g = this.ctx.createGain();
    g.gain.value = 0.0001;
    src.connect(f); f.connect(g); g.connect(this.ambientGain);
    src.start();
    g.gain.exponentialRampToValueAtTime(0.18, this.ctx.currentTime + 1.2);
    this.rainNode = src;
    this.rainGain = g;
  }

  stopRain() {
    if (!this.rainNode || !this.rainGain) return;
    const g = this.rainGain;
    const src = this.rainNode;
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx!.currentTime + 1);
    setTimeout(() => { try { src.stop(); } catch { /* noop */ } }, 1200);
    this.rainNode = null;
    this.rainGain = null;
  }

  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
    let idx = 0;
    const playNote = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [0, 2, 4, 2, 3, 1, 4, 2];
      const n = scale[notes[idx % notes.length]];
      idx++;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = n;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);
      o.connect(g); g.connect(this.musicGain);
      o.start(t); o.stop(t + 4.5);
      // soft fifth
      if (idx % 2 === 0) {
        const o2 = this.ctx.createOscillator();
        const g2 = this.ctx.createGain();
        o2.type = 'triangle';
        o2.frequency.value = n * 1.5;
        g2.gain.setValueAtTime(0, t);
        g2.gain.linearRampToValueAtTime(0.025, t + 0.8);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + 4);
        o2.connect(g2); g2.connect(this.musicGain);
        o2.start(t); o2.stop(t + 4.2);
      }
    };
    playNote();
    this.musicTimer = window.setInterval(playNote, 4200);
  }

  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  }
}

export const audio = new AudioEngine();
