// ── audio.ts · WebAudio tự sinh: nhạc nền, tiếng động, mưa ───────────────────
// Không cần file ngoài, hoạt động cả offline. Mở khoá bằng cử chỉ đầu tiên của
// người chơi (pointerdown / keydown), đúng chính sách autoplay của trình duyệt.
import type { Weather, World } from './types';

type Sfx = 'coin' | 'wood' | 'paper' | 'click' | 'error' | 'success' | 'door' | 'step' | 'scale' | 'bell' | 'drop';

export class AudioManager {
  enabled = true;
  volume = 0.55;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private rain: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private musicTimer: number | null = null;
  private step = 0;

  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const scope = globalThis as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      };
      const Ctor = scope.AudioContext ?? scope.webkitAudioContext;
      if (!Ctor) return null;
      try {
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);
      } catch { return null; }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Gọi từ pointerdown/keydown đầu tiên: tạo AudioContext và hồi nhạc nền. */
  unlock(): void {
    this.ensure();
    this.music(this.enabled);
  }
  isUnlocked(): boolean { return this.ctx !== null; }
  isMusicActive(): boolean { return this.musicTimer !== null; }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.value = this.enabled ? this.volume : 0;
  }

  /** Đồng bộ đủ trạng thái: âm lượng, mưa, nhạc. Dùng sau mở khoá / tải game. */
  sync(w: World): void {
    this.enabled = w.settings.sound;
    this.setVolume(w.settings.volume);
    if (this.master) this.master.gain.value = this.enabled ? this.volume : 0;
    if (!this.enabled) {
      this.stopRain();
      this.music(false);
      return;
    }
    this.ensure();
    this.setWeather(w.weather);
    this.music(true);
  }

  toggle(on: boolean): void {
    this.enabled = on;
    if (!on) {
      this.stopRain();
      this.music(false);
    } else {
      this.ensure();
      this.music(true);
    }
    if (this.master) this.master.gain.value = on ? this.volume : 0;
  }

  private stopRain(): void {
    if (!this.rain) return;
    try { this.rain.src.stop(); } catch { /* already stopped */ }
    try { this.rain.gain.disconnect(); } catch { /* already disconnected */ }
    this.rain = null;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0, slide = 0): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, gain: number, filterHz: number): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = filterHz;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start();
  }

  sfx(name: Sfx): void {
    switch (name) {
      case 'coin': this.tone(880, 0.12, 'triangle', 0.14); this.tone(1320, 0.16, 'triangle', 0.09, 0.06); break;
      case 'wood': this.noise(0.09, 0.12, 700); this.tone(160, 0.09, 'sine', 0.08); break;
      case 'paper': this.noise(0.14, 0.07, 3200); break;
      case 'click': this.tone(520, 0.045, 'square', 0.045); break;
      case 'error': this.tone(220, 0.16, 'sawtooth', 0.07, 0, -80); break;
      case 'success': this.tone(523, 0.1, 'triangle', 0.1); this.tone(659, 0.1, 'triangle', 0.1, 0.09); this.tone(784, 0.18, 'triangle', 0.1, 0.18); break;
      case 'door': this.noise(0.22, 0.1, 420); this.tone(110, 0.2, 'sine', 0.06, 0, -30); break;
      case 'step': this.noise(0.06, 0.045, 300); break;
      case 'scale': this.tone(660, 0.08, 'sine', 0.06); this.tone(990, 0.1, 'sine', 0.04, 0.07); break;
      case 'bell': this.tone(1046, 0.5, 'sine', 0.07); this.tone(1568, 0.4, 'sine', 0.03, 0.02); break;
      case 'drop': this.tone(900, 0.05, 'sine', 0.035, 0, -500); break;
    }
  }

  /** Nhạc ngũ cung tiết chế: một nốt mỗi 0.9s, có bass mỗi 4 nhịp. */
  music(on: boolean): void {
    if (this.musicTimer !== null) { clearInterval(this.musicTimer); this.musicTimer = null; }
    if (!on || !this.enabled) return;
    const scale = [196, 220, 262, 294, 330, 392, 440];
    this.musicTimer = setInterval(() => {
      if (!this.enabled || !this.ctx) return;
      const f = scale[(this.step * 2 + Math.floor(this.step / 3)) % scale.length];
      this.tone(f, 0.75, 'sine', 0.018);
      if (this.step % 4 === 0) this.tone(f / 2, 1.1, 'triangle', 0.012);
      this.step++;
    }, 900) as unknown as number;
  }

  setWeather(w: Weather): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    this.stopRain();
    if (w !== 'rain' && w !== 'storm') return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * 2));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.6;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = w === 'storm' ? 950 : 1400;
    const g = ctx.createGain(); g.gain.value = w === 'storm' ? 0.075 : 0.04;
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start();
    this.rain = { src, gain: g };
  }
}

export const audio = new AudioManager();
