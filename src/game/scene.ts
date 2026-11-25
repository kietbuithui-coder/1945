// ── scene.ts · khung cảnh pixel art: nền, ánh sáng, thời tiết, nâng cấp ──────
import {
  A, BG_FOR_LEVEL, LOCATION, timePlate, weatherPlate,
} from './data';
import type { Customer, World } from './types';

type Img = HTMLImageElement;
const cache = new Map<string, Img>();

export function loadImage(url: string): Promise<Img> {
  return new Promise((resolve) => {
    const hit = cache.get(url);
    if (hit) { resolve(hit); return; }
    if (typeof Image === 'undefined') { resolve({ naturalWidth: 0 } as Img); return; }
    const img = new Image();
    img.onload = () => { cache.set(url, img); resolve(img); };
    img.onerror = () => { cache.set(url, img); resolve(img); };
    img.src = url;
  });
}
export async function preload(urls: string[], onProgress?: (done: number, total: number) => void): Promise<void> {
  let done = 0;
  await Promise.all(urls.map(async (u) => { await loadImage(u); done++; onProgress?.(done, urls.length); }));
}
const img = (url: string): Img | null => {
  const i = cache.get(url);
  return i && i.naturalWidth > 0 ? i : null;
};

export interface Floater { text: string; x: number; y: number; t: number; color: string; size: number }
interface Drop { x: number; y: number; v: number; len: number }
interface Mote { x: number; y: number; vx: number; vy: number; a: number }

export interface SceneInput {
  world: World;
  dt: number;
  customer: Customer | null;
  floaters: Floater[];
  fade: number;
  titleMode: boolean;
  trayCount: number;
}

export class Scene {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null = null;
  private rain: Drop[] = [];
  private motes: Mote[] = [];
  private t = 0;
  private frame = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    try {
      this.ctx = canvas.getContext('2d');
      if (this.ctx) this.ctx.imageSmoothingEnabled = false;
    } catch { this.ctx = null; }
    for (let i = 0; i < 150; i++) this.rain.push({ x: Math.random() * 1280, y: Math.random() * 720, v: 520 + Math.random() * 620, len: 8 + Math.random() * 16 });
    for (let i = 0; i < 34; i++) this.motes.push({ x: Math.random() * 1280, y: Math.random() * 720, vx: (Math.random() - 0.5) * 7, vy: -3 - Math.random() * 6, a: 0.08 + Math.random() * 0.35 });
  }

  addFloater(fl: Floater[], text: string, x = 640, y = 330, color = '#f0c86a', size = 26): void {
    fl.push({ text, x, y, t: 0, color, size });
  }

  private bgUrl(w: World, titleMode: boolean): string {
    if (titleMode) return A('backgrounds/title.png');
    const loc = LOCATION[w.location] ?? LOCATION.shop;
    if (loc.id !== 'shop') {
      const wet = w.weather === 'rain' || w.weather === 'storm';
      if (wet && loc.bgRain) return A(`backgrounds/${loc.bgRain}`);
      if (w.minute >= 960 && loc.bgDusk) return A(`backgrounds/${loc.bgDusk}`);
      return A(`backgrounds/${loc.bg}`);
    }
    const wet = w.weather === 'rain' || w.weather === 'storm';
    if (wet) return w.day > 6 ? BG_FOR_LEVEL(w.shopLevel) : A('backgrounds/shop_rain.png');
    if (w.minute >= 1080) return A('backgrounds/shop_night.png');
    if (w.minute >= 960) return A('backgrounds/shop_dusk.png');
    return BG_FOR_LEVEL(w.shopLevel);
  }

  private drawPlate(i: SceneInput, url: string, alpha: number, mode: GlobalCompositeOperation = 'multiply'): void {
    const c = this.ctx, im = img(url);
    if (!c || !im) return;
    c.save();
    c.globalCompositeOperation = mode;
    c.globalAlpha = alpha;
    c.drawImage(im, 0, 0, 1280, 720);
    c.restore();
  }

  /** Các nâng cấp phải NHÌN THẤY, không chỉ đổi chỉ số ẩn. */
  private drawUpgrades(c: CanvasRenderingContext2D, w: World): void {
    const up = new Set(w.upgrades);
    c.save();
    c.imageSmoothingEnabled = false;
    if (up.has('window')) {
      c.fillStyle = 'rgba(255,223,154,0.14)';
      c.beginPath(); c.moveTo(60, 0); c.lineTo(360, 0); c.lineTo(250, 470); c.lineTo(60, 470); c.closePath(); c.fill();
    }
    if (up.has('roof')) {
      c.fillStyle = 'rgba(36,23,17,0.20)';
      c.fillRect(0, 0, 1280, 62);
      c.fillStyle = '#3b2718';
      for (let x = 0; x < 1280; x += 64) c.fillRect(x, 52, 56, 10);
    }
    if (up.has('shelves')) {
      c.fillStyle = '#3b2718'; c.fillRect(90, 300, 300, 16);
      c.fillStyle = '#5a3d24'; c.fillRect(90, 300, 300, 6);
      c.fillStyle = '#241711'; c.fillRect(120, 316, 12, 150); c.fillRect(350, 316, 12, 150);
    }
    if (up.has('crates') || up.has('warehouse')) {
      for (let k = 0; k < 3; k++) {
        const x = 1000 + k * 76, y = 430 + (k % 2) * 20;
        c.fillStyle = '#5a3d24'; c.fillRect(x, y, 66, 66);
        c.strokeStyle = '#3b2718'; c.lineWidth = 4; c.strokeRect(x, y, 66, 66);
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + 66, y + 66); c.stroke();
      }
    }
    if (up.has('sign')) {
      c.fillStyle = '#5a3d24'; c.fillRect(500, 24, 280, 62);
      c.strokeStyle = '#9a6d40'; c.lineWidth = 5; c.strokeRect(500, 24, 280, 62);
      c.fillStyle = '#e6d3a3';
      for (let k = 0; k < 5; k++) c.fillRect(528 + k * 48, 42 + (k % 2) * 8, 30, 6);
    }
    if (up.has('counter')) {
      c.fillStyle = 'rgba(154,109,64,0.55)'; c.fillRect(400, 520, 480, 12);
    }
    if (up.has('scale')) {
      c.fillStyle = '#d9a441'; c.fillRect(1010, 470, 44, 8);
      c.fillRect(1028, 478, 8, 34);
      c.beginPath(); c.arc(1014, 466, 12, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(1050, 466, 12, 0, Math.PI * 2); c.fill();
    }
    if (up.has('ledger')) {
      c.fillStyle = '#e6d3a3'; c.fillRect(940, 500, 90, 52);
      c.strokeStyle = '#8a4630'; c.lineWidth = 3; c.strokeRect(940, 500, 90, 52);
    }
    if (up.has('cellar')) {
      c.fillStyle = '#241711'; c.fillRect(150, 560, 180, 80);
      c.strokeStyle = '#9a6d40'; c.lineWidth = 4; c.strokeRect(150, 560, 180, 80);
    }
    c.restore();
  }

  private drawCustomer(c: CanvasRenderingContext2D, cust: Customer | null, w: World): void {
    if (!cust) return;
    const frames: Record<string, string> = {
      happy: 'front_happy', sad: 'front_sad', angry: 'front_angry',
      surprised: 'front_surprised', tired: 'front_tired', neutral: 'front_talk',
    };
    const f = frames[cust.mood] ?? 'front_idle_0';
    const im = img(A(`characters/${cust.sprite}/${f}.png`)) ?? img(A(`characters/${cust.sprite}/front_idle_0.png`));
    if (im) {
      c.save();
      c.imageSmoothingEnabled = false;
      c.drawImage(im, 742, 208, 96, 128);
      c.restore();
    } else {
      // fallback không phải placeholder ảnh: vẽ bóng người bằng chính palette của pack
      c.fillStyle = '#3c4a58';
      c.fillRect(770, 250, 40, 80);
      c.fillStyle = '#e9b98f';
      c.beginPath(); c.arc(790, 240, 18, 0, Math.PI * 2); c.fill();
    }
    // bóng chân
    c.fillStyle = 'rgba(36,23,17,0.28)';
    c.beginPath(); c.ellipse(790, 338, 42, 10, 0, 0, Math.PI * 2); c.fill();
    // khách đang xếp hàng phía sau (có thật trong state)
    const line = w.queue.filter((q) => q.state === 'waiting' && q.arrive <= w.minute).slice(1, 3);
    line.forEach((q, i) => {
      const back = img(A(`characters/${q.sprite}/back_walk_0.png`));
      const x = 950 + i * 70, y = 250 + i * 16;
      if (back) { c.globalAlpha = 0.75; c.drawImage(back, x, y, 72, 96); c.globalAlpha = 1; }
      else { c.fillStyle = 'rgba(60,74,88,0.7)'; c.fillRect(x + 12, y + 16, 34, 66); }
    });
  }

  private drawWeather(c: CanvasRenderingContext2D, w: World, dt: number): void {
    const storm = w.weather === 'storm', rain = w.weather === 'rain' || storm;
    if (rain && !w.settings.reduced) {
      c.save();
      c.strokeStyle = storm ? 'rgba(200,215,225,0.5)' : 'rgba(190,210,220,0.32)';
      c.lineWidth = storm ? 2 : 1;
      for (const d of this.rain) {
        d.y += d.v * dt; d.x -= (storm ? 150 : 60) * dt;
        if (d.y > 720) { d.y = -20; d.x = Math.random() * 1400; }
        if (d.x < -20) d.x = 1300;
        c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(d.x - (storm ? 8 : 3), d.y + d.len); c.stroke();
      }
      c.restore();
    }
    if (!w.settings.reduced) {
      for (const m of this.motes) {
        m.x += m.vx * dt; m.y += m.vy * dt;
        if (m.y < 0) { m.y = 720; m.x = Math.random() * 1280; }
        c.fillStyle = `rgba(255,223,154,${m.a})`;
        c.fillRect(m.x, m.y, 2, 2);
      }
    }
    // Đèn dầu: một nguồn sáng duy nhất, đúng art bible
    const night = w.minute >= 960 || w.weather === 'storm';
    if (night || w.upgrades.includes('lamp')) {
      const glow = img(A('effects/glow.png'));
      const g = c.createRadialGradient(690, 210, 10, 690, 210, w.upgrades.includes('lamp') ? 460 : 320);
      g.addColorStop(0, 'rgba(255,223,154,0.20)');
      g.addColorStop(1, 'rgba(255,223,154,0)');
      c.fillStyle = g; c.fillRect(0, 0, 1280, 720);
      if (glow) { c.globalAlpha = 0.35; c.drawImage(glow, 630, 150, 120, 120); c.globalAlpha = 1; }
    }
  }

  draw(i: SceneInput): void {
    const c = this.ctx;
    if (!c) return;
    const { world: w, dt } = i;
    this.t += dt;
    this.frame++;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, 1280, 720);
    c.fillStyle = '#241711'; c.fillRect(0, 0, 1280, 720);

    const bg = img(this.bgUrl(w, i.titleMode));
    if (bg) c.drawImage(bg, 0, 0, 1280, 720);
    else {
      // nền dự phòng vẫn là màu của pack, không phải màn đen trống
      c.fillStyle = '#3b2718'; c.fillRect(0, 0, 1280, 420);
      c.fillStyle = '#5a3d24'; c.fillRect(0, 420, 1280, 300);
    }
    this.drawPlate(i, timePlate(w.minute), w.minute >= 1020 ? 0.85 : 0.55);
    const wp = weatherPlate(w.weather);
    if (wp) this.drawPlate(i, wp, w.weather === 'storm' ? 0.7 : 0.42);
    if (!i.titleMode) this.drawUpgrades(c, w);
    this.drawWeather(c, w, dt);
    if (!i.titleMode) this.drawCustomer(c, i.customer, w);

    // vignette
    const v = c.createRadialGradient(640, 360, 260, 640, 360, 820);
    v.addColorStop(0, 'rgba(36,23,17,0)');
    v.addColorStop(1, 'rgba(36,23,17,0.55)');
    c.fillStyle = v; c.fillRect(0, 0, 1280, 720);

    // khay quầy có hàng → phản hồi trực quan ngay trên nền
    if (i.trayCount > 0 && !i.titleMode) {
      c.fillStyle = 'rgba(255,223,154,0.10)';
      c.fillRect(430, 470, 420, 90);
      c.strokeStyle = 'rgba(217,164,65,0.5)'; c.lineWidth = 3;
      c.strokeRect(430, 470, 420, 90);
    }

    // floaters
    for (let k = i.floaters.length - 1; k >= 0; k--) {
      const f = i.floaters[k];
      f.t += dt;
      c.globalAlpha = Math.max(0, 1 - f.t / 1.6);
      c.fillStyle = f.color;
      c.font = `bold ${f.size}px "Be Vietnam Pro", system-ui, sans-serif`;
      c.textAlign = 'center';
      c.fillText(f.text, f.x, f.y - f.t * 42);
      c.globalAlpha = 1;
      if (f.t > 1.6) i.floaters.splice(k, 1);
    }

    if (i.fade > 0) {
      c.fillStyle = `rgba(36,23,17,${Math.min(1, i.fade)})`;
      c.fillRect(0, 0, 1280, 720);
    }
  }
}
