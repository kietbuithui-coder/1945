// Canvas scene renderer: layered pixel-art diorama, weather, VFX.
import type { World } from './systems';
import type { Customer, Weather } from './types';

type Img = HTMLImageElement;

export interface Floater { text: string; x: number; y: number; t: number; color: string; size: number; }
interface RainDrop { x: number; y: number; v: number; len: number; }
interface Mote { x: number; y: number; vx: number; vy: number; a: number; }

const cache = new Map<string, Img>();

export function loadImage(url: string): Promise<Img> {
  return new Promise((resolve) => {
    const cached = cache.get(url);
    if (cached) { resolve(cached); return; }
    const img = new Image();
    img.onload = () => { cache.set(url, img); resolve(img); };
    img.onerror = () => resolve(img);
    img.src = url;
  });
}

export async function preload(urls: string[], onProgress?: (done: number, total: number) => void): Promise<void> {
  let done = 0;
  await Promise.all(urls.map(async (u) => {
    await loadImage(u);
    done++;
    onProgress?.(done, urls.length);
  }));
}

/** The asset pack ships transparent tint plates; the scene multiplies them over
 *  the background so time of day and weather are data, not hard-coded colours. */
function timePlate(h: number): string {
  if (h < 7) return '/assets/backgrounds/overlays/dawn.png';
  if (h < 9) return '/assets/backgrounds/overlays/morning.png';
  if (h < 15) return '/assets/backgrounds/overlays/day.png';
  if (h < 17) return '/assets/backgrounds/overlays/dusk.png';
  return '/assets/backgrounds/overlays/night.png';
}

function weatherPlate(w: string): string | null {
  if (w === 'mua') return '/assets/backgrounds/overlays/rain.png';
  if (w === 'mua_to') return '/assets/backgrounds/overlays/storm.png';
  return null;
}

function bgFor(world: World): string {
  const loc = world.state.travel.location;
  const h = world.state.time.hour;
  const rain = world.state.weather.today === 'mua' || world.state.weather.today === 'mua_to';
  if (loc === 'shop') {
    if (rain) return '/assets/backgrounds/shop_rain.png';
    if (h >= 19) return '/assets/backgrounds/shop_night.png';
    if (h >= 16) return '/assets/backgrounds/shop_dusk.png';
    return '/assets/backgrounds/shop.png';
  }
  if (loc === 'market') return rain ? '/assets/backgrounds/market_dusk.png' : '/assets/backgrounds/market.png';
  if (loc === 'river') return rain ? '/assets/backgrounds/river_dock_rain.png' : h >= 18 ? '/assets/backgrounds/river_dock_night.png' : '/assets/backgrounds/river_dock.png';
  if (loc === 'warehouse') return '/assets/backgrounds/warehouse.png';
  if (loc === 'residential') return rain ? '/assets/backgrounds/residential_rain.png' : '/assets/backgrounds/residential.png';
  if (loc === 'tea_stall') return h >= 16 ? '/assets/backgrounds/tea_stall_dusk.png' : '/assets/backgrounds/tea_stall.png';
  if (loc === 'supplier_house') return '/assets/backgrounds/poor_house.png';
  if (loc === 'staging') return '/assets/backgrounds/staging.png';
  return '/assets/backgrounds/shop.png';
}

export class Scene {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  floaters: Floater[] = [];
  rain: RainDrop[] = [];
  motes: Mote[] = [];
  fade = 0;
  fadeDir = 0;
  fadeCb: (() => void) | null = null;
  lastBg = '';
  lastBgImg: Img | null = null;
  titleMode = false;
  time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < 120; i++) {
      this.rain.push({ x: Math.random() * 1280, y: Math.random() * 720, v: 600 + Math.random() * 500, len: 8 + Math.random() * 14 });
    }
    for (let i = 0; i < 40; i++) {
      this.motes.push({ x: Math.random() * 1280, y: Math.random() * 720, vx: (Math.random() - 0.5) * 6, vy: -2 - Math.random() * 6, a: 0.1 + Math.random() * 0.4 });
    }
  }

  fadeTo(cb: () => void) {
    this.fadeDir = 1;
    this.fadeCb = cb;
  }

  addFloat(text: string, x: number, y: number, color = '#f0c86a', size = 22) {
    this.floaters.push({ text, x, y, t: 0, color, size });
  }

  private img(url: string): Img | null {
    return cache.get(url) ?? null;
  }

  draw(world: World, dt: number) {
    const ctx = this.ctx;
    const s = world.state;
    this.time += dt;
    const W = 1280, H = 720;

    // background
    const bgUrl = this.titleMode ? '/assets/backgrounds/title.png' : bgFor(world);
    if (bgUrl !== this.lastBg) {
      this.lastBg = bgUrl;
      const im = this.img(bgUrl);
      if (im && im.complete && im.naturalWidth > 0) this.lastBgImg = im;
    }
    ctx.imageSmoothingEnabled = false;
    if (this.lastBgImg) ctx.drawImage(this.lastBgImg, 0, 0, W, H);
    else { ctx.fillStyle = '#241a12'; ctx.fillRect(0, 0, W, H); }

    // the shop itself is rebuilt as it climbs tiers: each tier paints new furniture
    if (s.travel.location === 'shop' && (s.shopLevel ?? 1) > 1) {
      const im = this.img(`/assets/backgrounds/shop_level${Math.min(5, s.shopLevel)}.png`);
      if (im && im.complete && im.naturalWidth > 0) ctx.drawImage(im, 0, 0, W, H);
    }

    // customers
    const active = world.activeCustomer();
    const queue = world.queuedCustomers();
    for (const c of queue) this.drawCustomer(c, 0.7, world);
    if (active) this.drawCustomer(active, 1, world);

    // lamp glow
    const h = s.time.hour;
    const lampStrength = h >= 16 || h < 7 ? 0.5 : 0.28;
    const glow = ctx.createRadialGradient(640, 96, 10, 640, 96, 320);
    glow.addColorStop(0, `rgba(255,214,138,${lampStrength})`);
    glow.addColorStop(0.35, `rgba(255,184,77,${lampStrength * 0.4})`);
    glow.addColorStop(1, 'rgba(255,184,77,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    // dust motes
    if (s.weather.today !== 'mua' && s.weather.today !== 'mua_to') {
      for (const m of this.motes) {
        m.x += m.vx * dt; m.y += m.vy * dt;
        if (m.y < -10) { m.y = 730; m.x = Math.random() * 1280; }
        if (m.x < -10) m.x = 1290; if (m.x > 1290) m.x = -10;
        const tw = 0.4 + 0.6 * Math.sin(this.time * 2 + m.x * 0.01);
        ctx.fillStyle = `rgba(255,230,168,${m.a * tw * 0.6})`;
        ctx.fillRect(m.x, m.y, 2, 2);
      }
    }

    // rain
    if (s.weather.today === 'mua' || s.weather.today === 'mua_to') {
      const heavy = s.weather.today === 'mua_to';
      ctx.strokeStyle = heavy ? 'rgba(190,210,215,0.42)' : 'rgba(190,210,215,0.28)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (const d of this.rain) {
        d.y += d.v * dt * (heavy ? 1.35 : 1);
        d.x -= d.v * dt * 0.18;
        if (d.y > 720) { d.y = -20; d.x = Math.random() * 1400; }
        if (d.x < -20) d.x = 1300;
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + 2, d.y + d.len);
      }
      ctx.stroke();
    }

    // time-of-day and weather tint plates (from the asset pack)
    const plateUrl = timePlate(h);
    const plate = this.img(plateUrl);
    ctx.globalCompositeOperation = 'multiply';
    if (plate && plate.complete && plate.naturalWidth > 0) {
      ctx.drawImage(plate, 0, 0, W, H);
    } else {
      // fallback: the same tints, painted by hand
      let tint = 'rgba(28,38,80,0.38)';
      if (h < 7) tint = 'rgba(24,36,72,0.42)';
      else if (h < 9) tint = 'rgba(255,214,150,0.06)';
      else if (h < 15) tint = 'rgba(255,236,190,0.03)';
      else if (h < 17) tint = 'rgba(255,170,90,0.14)';
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, W, H);
    }
    const wp = weatherPlate(s.weather.today);
    if (wp) {
      const wplate = this.img(wp);
      if (wplate && wplate.complete && wplate.naturalWidth > 0) ctx.drawImage(wplate, 0, 0, W, H);
    }
    // warm pool of lamplight — additive, only after dark or under a storm
    ctx.globalCompositeOperation = 'lighter';
    if (h >= 17 || h < 7 || s.weather.today === 'mua_to') {
      const glow = this.img('/assets/backgrounds/overlays/lamp_glow.png');
      if (glow && glow.complete && glow.naturalWidth > 0) ctx.drawImage(glow, 0, 0, W, H);
    }
    ctx.globalCompositeOperation = 'source-over';

    // vignette
    const vg = ctx.createRadialGradient(640, 380, 260, 640, 380, 760);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10,6,3,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    // floaters
    for (const f of this.floaters) {
      f.t += dt;
      const p = f.t / 1.3;
      if (p >= 1) continue;
      ctx.globalAlpha = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
      ctx.font = `700 ${f.size}px "Be Vietnam Pro", sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(20,10,4,0.8)';
      ctx.strokeText(f.text, f.x, f.y - p * 70);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - p * 70);
      ctx.globalAlpha = 1;
    }
    this.floaters = this.floaters.filter((f) => f.t < 1.3);

    // fade
    if (this.fadeDir !== 0) {
      this.fade += this.fadeDir * dt * 2.4;
      if (this.fade >= 1) {
        this.fade = 1;
        this.fadeDir = -1;
        this.fadeCb?.();
        this.fadeCb = null;
      }
      if (this.fade <= 0 && this.fadeDir < 0) { this.fade = 0; this.fadeDir = 0; }
      ctx.fillStyle = `rgba(8,5,3,${Math.max(0, this.fade)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  drawCustomer(c: Customer, alpha: number, world: World) {
    const ctx = this.ctx;
    const x = Math.round(c.x);
    const feet = 626;
    const mood = c.mood === 'neutral' ? 'idle_0' : c.mood;
    const url = `/assets/characters/${c.npcId}/front_${mood}.png`;
    const img = this.img(url);
    ctx.globalAlpha = alpha;
    // shadow
    ctx.fillStyle = 'rgba(10,6,3,0.35)';
    ctx.beginPath();
    ctx.ellipse(x, feet - 4, 34, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    if (img && img.complete && img.naturalWidth > 0) {
      const bob = Math.sin(this.time * 2 + c.uid) * 1.5;
      ctx.drawImage(img, x - 48, feet - 128 + bob, 96, 128);
    } else {
      ctx.fillStyle = '#5a3d24';
      ctx.fillRect(x - 24, feet - 96, 48, 96);
    }
    // patience bar
    if (c.state === 'active') {
      const w = 90;
      const p = Math.max(0, c.patience / c.maxPatience);
      ctx.fillStyle = 'rgba(10,6,3,0.7)';
      ctx.fillRect(x - w / 2, feet - 146, w, 6);
      ctx.fillStyle = p > 0.5 ? '#8aa357' : p > 0.25 ? '#c47a22' : '#a83226';
      ctx.fillRect(x - w / 2 + 1, feet - 145, (w - 2) * p, 4);
    }
    // name
    ctx.font = '600 13px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(15,9,4,0.9)';
    ctx.strokeText(c.name, x, feet - 152);
    ctx.fillStyle = 'rgba(240,226,189,0.9)';
    ctx.fillText(c.name, x, feet - 152);
    ctx.globalAlpha = 1;
  }
}

/** Sprites are streamed after the first screen; everything the title and the shop
 *  need is preloaded behind the loading bar. */
export function splitAssetUrls(): { critical: string[]; rest: string[] } {
  const all = allAssetUrls();
  const isSprite = (u: string) => /\/assets\/characters\/(?!portraits\/)[^/]+\//.test(u);
  return { critical: all.filter((u) => !isSprite(u)), rest: all.filter(isSprite) };
}

export function allAssetUrls(): string[] {
  const urls: string[] = [];
  const scenes = [
    'shop', 'shop_dusk', 'shop_night', 'shop_rain', 'market', 'market_dusk', 'river_dock',
    'river_dock_night', 'river_dock_rain', 'warehouse', 'residential', 'residential_rain',
    'tea_stall', 'tea_stall_dusk', 'poor_house', 'staging', 'shop_level2', 'shop_level3',
    'shop_level4', 'shop_level5', 'title', 'street', 'street_rain', 'alley', 'alley_rain',
    'counter_outside', 'counter_outside_night', 'shop_exterior', 'shop_exterior_night',
    'shop_exterior_rain',
  ];
  for (const s of scenes) urls.push(`/assets/backgrounds/${s}.png`);
  for (const o of ['dawn', 'morning', 'day', 'dusk', 'night', 'rain', 'storm', 'lamp_glow']) {
    urls.push(`/assets/backgrounds/overlays/${o}.png`);
  }
  const chars = [
    'player', 'ba_tu', 'ong_nam', 'chi_lan', 'anh_khoi', 'co_hoa', 'ong_to', 'ba_cuc', 'anh_phuc',
    'co_diep', 'ong_giao_minh', 'ba_hau', 'anh_vuong', 'co_man', 'bac_hung', 'chi_sen', 'ong_ca',
    'co_tuyet', 'anh_tam', 'ba_giao', 'cau_ti', 'ong_chin', 'ba_tam', 'co_mai',
  ];
  for (const c of chars) {
    for (const f of ['front_idle_0', 'front_happy', 'front_sad', 'front_angry', 'front_surprised', 'front_tired', 'side_walk_0', 'back_walk_0']) {
      urls.push(`/assets/characters/${c}/${f}.png`);
    }
    for (const e of ['neutral', 'happy', 'sad', 'angry', 'surprised', 'tired']) {
      urls.push(`/assets/characters/portraits/${c}_${e}.png`);
    }
  }
  return urls;
}
