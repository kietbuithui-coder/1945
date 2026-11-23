// Minimal pixel-art drawing library for the 1945 asset pipeline.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const colorCache = new Map();

export function hex(h, alphaOverride) {
  if (typeof h === 'number') return h;
  let c = colorCache.get(h);
  if (c === undefined) {
    let s = h.replace('#', '');
    if (s.length === 3) s = s.split('').map((x) => x + x).join('');
    let a = 255;
    if (s.length === 8) {
      a = parseInt(s.slice(6, 8), 16);
      s = s.slice(0, 6);
    }
    const r = parseInt(s.slice(0, 2), 16);
    const g = parseInt(s.slice(2, 4), 16);
    const b = parseInt(s.slice(4, 6), 16);
    c = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
    colorCache.set(h, c);
  }
  if (alphaOverride !== undefined) {
    return (((alphaOverride & 255) << 24) | (c & 0x00ffffff)) >>> 0;
  }
  return c;
}

export function rgba(r, g, b, a = 255) {
  return (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
}

export function mul(c, f) {
  const r = Math.min(255, Math.round(((c & 255) * f)));
  const g = Math.min(255, Math.round((((c >>> 8) & 255) * f)));
  const b = Math.min(255, Math.round((((c >>> 16) & 255) * f)));
  const a = (c >>> 24) & 255;
  return rgba(r, g, b, a);
}

export function mix(c1, c2, t) {
  const r = Math.round(((c1 & 255) * (1 - t)) + ((c2 & 255) * t));
  const g = Math.round((((c1 >>> 8) & 255) * (1 - t)) + (((c2 >>> 8) & 255) * t));
  const b = Math.round((((c1 >>> 16) & 255) * (1 - t)) + (((c2 >>> 16) & 255) * t));
  const a = Math.round((((c1 >>> 24) & 255) * (1 - t)) + (((c2 >>> 24) & 255) * t));
  return rgba(r, g, b, a);
}

export function withAlpha(c, a) {
  return (((a & 255) << 24) | (c & 0x00ffffff)) >>> 0;
}

export function packRGB(r, g, b) {
  return rgba(r, g, b, 255);
}

export class Surface {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint32Array(w * h);
  }

  clone() {
    const s = new Surface(this.w, this.h);
    s.data.set(this.data);
    return s;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[y * this.w + x];
  }

  set(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[y * this.w + x] = c;
  }

  blend(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    const dst = this.data[i];
    const sa = (c >>> 24) & 255;
    if (sa === 255) { this.data[i] = c; return; }
    if (sa === 0) return;
    const da = (dst >>> 24) & 255;
    const oa = sa + Math.round((da * (255 - sa)) / 255);
    if (oa === 0) { this.data[i] = 0; return; }
    const r = Math.round((((c & 255) * sa) + ((dst & 255) * da * (255 - sa)) / 255) / oa);
    const g = Math.round((((((c >>> 8) & 255) * sa) + (((dst >>> 8) & 255) * da * (255 - sa)) / 255) / oa));
    const b = Math.round((((((c >>> 16) & 255) * sa) + (((dst >>> 16) & 255) * da * (255 - sa)) / 255) / oa));
    this.data[i] = rgba(r, g, b, oa);
  }

  fill(c) {
    const col = hex(c);
    this.data.fill(col);
  }

  rect(x, y, w, h, c) {
    const col = hex(c);
    const x0 = Math.max(0, x), y0 = Math.max(0, y);
    const x1 = Math.min(this.w, x + w), y1 = Math.min(this.h, y + h);
    for (let yy = y0; yy < y1; yy++) {
      const row = yy * this.w;
      for (let xx = x0; xx < x1; xx++) this.data[row + xx] = col;
    }
  }

  blendRect(x, y, w, h, c) {
    for (let yy = Math.max(0, y); yy < Math.min(this.h, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(this.w, x + w); xx++) this.blend(xx, yy, hex(c));
    }
  }

  frame(x, y, w, h, c) {
    const col = hex(c);
    const x0 = Math.max(0, x), y0 = Math.max(0, y);
    const x1 = Math.min(this.w, x + w) - 1, y1 = Math.min(this.h, y + h) - 1;
    for (let xx = x0; xx <= x1; xx++) { this.set(xx, y, col); this.set(xx, y + h - 1, col); }
    for (let yy = y0; yy <= y1; yy++) { this.set(x, yy, col); this.set(x + w - 1, yy, col); }
  }

  hline(x, y, w, c) {
    const col = hex(c);
    for (let xx = Math.max(0, x); xx < Math.min(this.w, x + w); xx++) this.set(xx, y, col);
  }

  vline(x, y, h, c) {
    const col = hex(c);
    for (let yy = Math.max(0, y); yy < Math.min(this.h, y + h); yy++) this.set(x, yy, col);
  }

  line(x0, y0, x1, y1, c) {
    const col = hex(c);
    let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  ellipse(cx, cy, rx, ry, c) {
    const col = hex(c);
    if (rx <= 0 || ry <= 0) return;
    for (let y = -ry; y <= ry; y++) {
      const span = Math.floor(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
      for (let x = -span; x <= span; x++) this.set(cx + x, cy + y, col);
    }
  }

  ellipseOutline(cx, cy, rx, ry, c) {
    const col = hex(c);
    let px = -1, py = -1;
    const steps = Math.max(12, Math.floor((rx + ry) * 2.5));
    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const x = Math.round(cx + Math.cos(t) * rx);
      const y = Math.round(cy + Math.sin(t) * ry);
      if (x !== px || y !== py) this.set(x, y, col);
      px = x; py = y;
    }
  }

  poly(points, c) {
    const col = hex(c);
    let minY = Infinity, maxY = -Infinity;
    for (const p of points) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(this.h - 1, Math.ceil(maxY)); y++) {
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
          xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
      }
      xs.sort((m, n) => m - n);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const x0 = Math.round(xs[i]), x1 = Math.round(xs[i + 1]);
        for (let x = Math.max(0, x0); x <= Math.min(this.w - 1, x1); x++) this.data[y * this.w + x] = col;
      }
    }
  }

  // Add an outline around non-transparent pixels (inside the surface bounds).
  outline(c, diagonal = false) {
    if (!c) return this;
    const src = new Uint32Array(this.data);
    const col = hex(c);
    const w = this.w, h = this.h;
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && ((src[y * w + x] >>> 24) & 255) > 40;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if ((src[y * w + x] >>> 24) > 40) continue;
        let near = solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1);
        if (!near && diagonal) near = solid(x - 1, y - 1) || solid(x + 1, y - 1) || solid(x - 1, y + 1) || solid(x + 1, y + 1);
        if (near) this.data[y * w + x] = col;
      }
    }
    return this;
  }

  dither(x, y, w, h, cA, cB, step = 2) {
    const a = hex(cA), b = hex(cB);
    for (let yy = Math.max(0, y); yy < Math.min(this.h, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(this.w, x + w); xx++) {
        this.data[yy * this.w + xx] = ((xx + yy) % step === 0) ? a : b;
      }
    }
  }

  // Scatter tiny texture pixels with a deterministic rng.
  speckle(x, y, w, h, colors, rng, density = 0.08) {
    for (let yy = Math.max(0, y); yy < Math.min(this.h, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(this.w, x + w); xx++) {
        if (rng() < density) {
          this.data[yy * this.w + xx] = hex(colors[Math.floor(rng() * colors.length)]);
        }
      }
    }
  }

  copy(src, dx, dy) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.get(x, y);
        if ((c >>> 24) > 0) this.blend(dx + x, dy + y, c);
      }
    }
  }

  copyScaled(src, dx, dy, scale = 1) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.get(x, y);
        if ((c >>> 24) === 0) continue;
        for (let yy = 0; yy < scale; yy++) {
          for (let xx = 0; xx < scale; xx++) this.set(dx + x * scale + xx, dy + y * scale + yy, c);
        }
      }
    }
  }

  scale(n) {
    const s = new Surface(this.w * n, this.h * n);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.data[y * this.w + x];
        if ((c >>> 24) === 0) continue;
        for (let yy = 0; yy < n; yy++) {
          const row = (y * n + yy) * s.w + x * n;
          for (let xx = 0; xx < n; xx++) s.data[row + xx] = c;
        }
      }
    }
    return s;
  }

  scaleDown(n) {
    const s = new Surface(Math.floor(this.w / n), Math.floor(this.h / n));
    for (let y = 0; y < s.h; y++) {
      for (let x = 0; x < s.w; x++) {
        // average n x n block
        let r = 0, g = 0, b = 0, a = 0, n2 = 0;
        for (let yy = 0; yy < n; yy++) {
          for (let xx = 0; xx < n; xx++) {
            const c = this.get(x * n + xx, y * n + yy);
            const ca = (c >>> 24) & 255;
            if (ca === 0) continue;
            r += (c & 255) * ca; g += ((c >>> 8) & 255) * ca; b += ((c >>> 16) & 255) * ca;
            a += ca; n2++;
          }
        }
        if (n2 > 0) {
          s.data[y * s.w + x] = rgba(Math.round(r / a), Math.round(g / a), Math.round(b / a), Math.round(a / n2));
        }
      }
    }
    return s;
  }

  // Soft radial light map (RGBA, white-ish) used with additive blending in engine.
  static glow(w, h, color = '#ffd98a') {
    const s = new Surface(w, h);
    const c = hex(color);
    const r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
    const cx = (w - 1) / 2, cy = (h - 1) / 2;
    const maxD = Math.sqrt(cx * cx + cy * cy);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxD;
        const a = Math.max(0, 1 - d);
        const aa = Math.round(Math.pow(a, 1.8) * 255);
        s.data[y * w + x] = rgba(r, g, b, aa);
      }
    }
    return s;
  }

  toPNG() {
    const png = new PNG({ width: this.w, height: this.h });
    const buf = Buffer.from(this.data.buffer, this.data.byteOffset, this.data.byteLength);
    // data is Uint32 little-endian RGBA -> same byte order PNG expects (RGBA)
    png.data = Buffer.from(buf);
    return PNG.sync.write(png);
  }

  save(file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, this.toPNG());
    return file;
  }
}

export function surface(w, h) {
  return new Surface(w, h);
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rngFor(name) {
  return mulberry32(hash(String(name)));
}
