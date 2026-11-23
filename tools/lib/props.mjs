// Reusable environment props for backgrounds and shop overlays.
import { Surface, hex, mul, mix, withAlpha, rngFor } from './pixel.mjs';
import { PAL, roundRect, plankFloor, brickWall, thatch, wallPlaster, vgrad } from './draw.mjs';

const C = (x) => hex(x);
const sh = (c, f) => mul(C(c), f);

export function shelf(s, x, y, w, h, wood = '#6b4a2f', levels = 3, rng = Math.random, goods = true) {
  // back board
  s.rect(x, y, w, h, sh(wood, 0.55));
  // frame
  s.frame(x, y, w, h, sh(wood, 0.8));
  const levelH = Math.floor(h / levels);
  for (let i = 1; i < levels; i++) {
    const yy = y + i * levelH;
    s.rect(x, yy, w, 3, sh(wood, 1.1));
    s.hline(x, yy, w, sh(wood, 1.35));
    s.hline(x, yy + 2, w, sh(wood, 0.55));
  }
  // goods on shelves
  if (goods) {
    for (let lv = 0; lv < levels; lv++) {
      const baseY = y + (lv + 1) * levelH - 2;
      let px = x + 4;
      while (px < x + w - 8) {
        const kind = Math.floor(rng() * 6);
        if (kind === 0) {
          // jar
          const jh = 8 + Math.floor(rng() * 6);
          s.ellipse(px + 3, baseY - jh / 2, 4, jh / 2, rng() < 0.5 ? '#8a5a34' : '#7a6a52');
          s.rect(px, baseY - jh + 2, 7, jh - 3, rng() < 0.5 ? '#8a5a34' : '#7a6a52');
          s.hline(px + 1, baseY - jh + 1, 5, '#4a3a2a');
          s.vline(px + 1, baseY - jh + 3, jh - 5, sh('#8a5a34', 1.3));
          px += 10;
        } else if (kind === 1) {
          // bottles
          const n = 2 + Math.floor(rng() * 3);
          for (let i = 0; i < n; i++) {
            const bx = px + i * 4;
            s.rect(bx, baseY - 8, 3, 8, '#5f7d5a');
            s.rect(bx, baseY - 10, 2, 2, '#3a2a1c');
            s.set(bx, baseY - 7, sh('#5f7d5a', 1.4));
          }
          px += n * 4 + 3;
        } else if (kind === 2) {
          // stacked bowls
          for (let i = 0; i < 3; i++) s.ellipse(px + 5, baseY - 2 - i * 2, 5, 2, i % 2 ? '#b9a98c' : '#9a8a70');
          px += 13;
        } else if (kind === 3) {
          // sacks
          s.ellipse(px + 5, baseY - 5, 5, 6, '#c2ab7c');
          s.rect(px + 1, baseY - 11, 8, 5, sh('#c2ab7c', 0.9));
          s.hline(px + 2, baseY - 10, 6, '#8a6a44');
          px += 13;
        } else if (kind === 4) {
          // baskets
          s.ellipse(px + 6, baseY - 3, 6, 3, '#b08a52');
          s.hline(px, baseY - 5, 12, '#8a6a44');
          px += 15;
        } else {
          // folded cloth
          s.rect(px, baseY - 5, 12, 5, rng() < 0.5 ? '#7b5a3e' : '#5a6a7a');
          s.hline(px, baseY - 5, 12, sh('#7b5a3e', 1.25));
          px += 15;
        }
      }
    }
  }
}

export function windowFrame(s, x, y, w, h, sky = '#7d8a8c', rng = Math.random, closed = false) {
  // frame
  s.rect(x - 4, y - 4, w + 8, h + 8, '#4a3222');
  s.rect(x - 2, y - 2, w + 4, h + 4, '#6b4a2f');
  // sky
  if (!closed) {
    s.rect(x, y, w, h, sky);
    // clouds
    for (let i = 0; i < 4; i++) {
      const cx = x + Math.floor(rng() * w), cy = y + Math.floor(rng() * Math.floor(h * 0.55));
      s.ellipse(cx, cy, 6 + Math.floor(rng() * 8), 3, withAlpha(hex('#e8e0cc'), 90));
    }
    // distant roofs / trees
    s.rect(x, y + h - Math.floor(h * 0.35), w, Math.floor(h * 0.35), '#5a6a5a');
    for (let i = 0; i < 6; i++) {
      const bx = x + i * Math.floor(w / 6);
      s.poly([[bx, y + h - 10], [bx + 10, y + h - 22], [bx + 20, y + h - 10]], '#4a4a3a');
    }
    // rain streaks
    for (let i = 0; i < 10; i++) {
      const rx = x + Math.floor(rng() * w), ry = y + Math.floor(rng() * h);
      s.vline(rx, ry, 4, withAlpha(hex('#aebfc0'), 70));
    }
  } else {
    s.rect(x, y, w, h, '#3a2a1e');
    for (let i = 0; i < 5; i++) s.vline(x + 4 + i * Math.floor(w / 5), y, h, '#4a3524');
  }
  // mullions
  s.vline(x + Math.floor(w / 2), y, h, '#5a3d24');
  s.hline(x, y + Math.floor(h / 2), w, '#5a3d24');
  s.frame(x, y, w, h, '#3a281c');
}

export function doorFrame(s, x, y, w, h, wood = '#5a3d24') {
  s.rect(x - 3, y - 3, w + 6, h + 3, '#3a281c');
  s.rect(x, y, w, h, wood);
  // planks
  for (let i = 0; i < 4; i++) s.vline(x + 3 + i * Math.floor(w / 4), y, h, sh(wood, 0.72));
  for (let i = 0; i < 3; i++) s.hline(x + 2, y + 8 + i * Math.floor(h / 3), w - 4, sh(wood, 1.12));
  // brace
  s.line(x + 3, y + h - 6, x + w - 3, y + 8, sh(wood, 1.2));
  // handle
  s.ellipse(x + w - 9, y + Math.floor(h * 0.55), 2, 2, '#b98a3e');
  s.set(x + w - 9, y + Math.floor(h * 0.55), '#6a4a1a');
}

export function counter(s, x, y, w, h, wood = '#6b4a2f', top = '#8a6238', rng = Math.random) {
  // top surface
  s.rect(x, y, w, 12, top);
  s.hline(x, y, w, sh(top, 1.3));
  s.hline(x, y + 3, w, sh(top, 1.1));
  s.hline(x, y + 11, w, sh(top, 0.55));
  // front planks
  s.rect(x, y + 12, w, h - 12, wood);
  const plankW = 46;
  for (let px = x; px < x + w; px += plankW) {
    s.vline(px, y + 12, h - 12, sh(wood, 0.62));
    s.vline(px + 1, y + 12, h - 12, sh(wood, 1.15));
  }
  s.hline(x, y + 12, w, sh(wood, 0.5));
  // grain
  for (let i = 0; i < w * 0.5; i++) {
    const gx = x + Math.floor(rng() * w), gy = y + 14 + Math.floor(rng() * (h - 16));
    s.set(gx, gy, rng() < 0.5 ? sh(wood, 1.12) : sh(wood, 0.8));
  }
}

export function hangingLamp(s, x, y, size = 1, lit = true) {
  // cord
  s.vline(x, 0, y, '#2a1e14');
  // shade
  s.poly([[x - 12 * size, y + 12 * size], [x + 12 * size, y + 12 * size], [x + 7 * size, y], [x - 7 * size, y]], '#7a5a32');
  s.poly([[x - 12 * size, y + 12 * size], [x + 12 * size, y + 12 * size], [x + 7 * size, y], [x - 7 * size, y]], withAlpha(hex('#ffdf9a'), lit ? 60 : 0));
  s.hline(x - 7 * size, y, 14 * size, '#a8864e');
  s.hline(x - 12 * size, y + 12 * size, 24 * size, '#4a3524');
  // bulb
  s.ellipse(x, y + 17 * size, 4 * size, 5 * size, lit ? '#ffe6a8' : '#8a7a62');
  if (lit) {
    s.ellipse(x, y + 17 * size, 2 * size, 3 * size, '#fff6d8');
  }
}

export function oilLamp(s, x, y, lit = true) {
  s.ellipse(x, y + 6, 7, 3, '#b98a3e');
  s.ellipse(x, y + 5, 6, 2, '#e0b862');
  s.rect(x - 3, y - 4, 6, 9, '#d9c9a0');
  s.rect(x - 2, y - 3, 2, 7, '#f0e6c8');
  if (lit) {
    s.ellipse(x, y - 7, 3, 4, '#f0b04a');
    s.ellipse(x, y - 7, 1, 2, '#fff6d8');
  }
}

export function sackPile(s, x, y, n = 4, rng = Math.random) {
  for (let i = 0; i < n; i++) {
    const px = x + (i % 3) * 16 + Math.floor(rng() * 4);
    const py = y - Math.floor(i / 3) * 12;
    s.ellipse(px + 8, py - 6, 8, 6, '#c2ab7c');
    s.rect(px + 2, py - 14, 12, 7, '#b8a273');
    s.hline(px + 3, py - 13, 10, '#d8c69a');
    s.hline(px + 4, py - 10, 8, '#8a6a44');
    s.vline(px + 2, py - 8, 7, '#a08a62');
    s.vline(px + 14, py - 8, 7, '#8a7a52');
  }
}

export function cratePile(s, x, y, n = 3, rng = Math.random) {
  for (let i = 0; i < n; i++) {
    const px = x + (i % 2) * 18 + Math.floor(rng() * 3);
    const py = y - Math.floor(i / 2) * 14;
    const w = 16 + Math.floor(rng() * 6), h = 13;
    s.rect(px, py - h, w, h, '#8a6238');
    s.rect(px + 1, py - h + 1, w - 2, h - 2, '#9a7040');
    s.frame(px + 1, py - h + 1, w - 2, h - 2, '#6b4a2f');
    s.line(px + 1, py - 1, px + w - 1, py - h + 1, '#7a5330');
    s.set(px + 2, py - h + 2, '#5a5a52');
    s.set(px + w - 3, py - 2, '#5a5a52');
  }
}

export function basketStack(s, x, y, n = 3) {
  for (let i = 0; i < n; i++) {
    s.ellipse(x + 9, y - i * 6, 9, 3, i % 2 ? '#b08a52' : '#a87e48');
    s.ellipseOutline(x + 9, y - i * 6, 9, 3, '#8a6a44');
    s.hline(x, y - i * 6 - 1, 18, '#c9a86a');
  }
}

export function jars(s, x, y, n = 3, rng = Math.random) {
  for (let i = 0; i < n; i++) {
    const px = x + i * 15, py = y;
    const h = 14 + Math.floor(rng() * 8);
    s.ellipse(px + 6, py - h / 2, 6, h / 2, i % 2 ? '#7a5a3a' : '#6a5a44');
    s.rect(px, py - h + 3, 12, h - 5, i % 2 ? '#7a5a3a' : '#6a5a44');
    s.hline(px + 1, py - h + 2, 10, '#4a3a2a');
    s.vline(px + 2, py - h + 4, h - 8, sh(i % 2 ? '#7a5a3a' : '#6a5a44', 1.35));
    s.ellipse(px + 7, py - h * 0.4, 4, 4, sh(i % 2 ? '#7a5a3a' : '#6a5a44', 0.85));
  }
}

export function chicken(s, x, y, color = '#c9a86a') {
  s.ellipse(x + 6, y - 4, 5, 4, color);
  s.ellipse(x + 10, y - 8, 3, 3, color);
  s.set(x + 12, y - 9, '#a83226');
  s.set(x + 13, y - 7, '#d9a441');
  s.set(x + 11, y - 9, '#241711');
  s.line(x + 4, y - 1, x + 4, y + 1, '#8a6a44');
  s.line(x + 7, y - 1, x + 7, y + 1, '#8a6a44');
}

export function tree(s, x, y, size = 1, rng = Math.random) {
  s.rect(x - 3 * size, y - 40 * size, 6 * size, 40 * size, '#4a3222');
  s.rect(x - 2 * size, y - 40 * size, 2 * size, 40 * size, '#6b4a2f');
  for (let i = 0; i < 5; i++) {
    s.ellipse(x + Math.floor((rng() - 0.5) * 50 * size), y - 46 * size - Math.floor(rng() * 26 * size), 16 * size, 10 * size, i % 2 ? '#4c5a32' : '#3f5527');
  }
}

export function bambooCluster(s, x, y, rng = Math.random) {
  for (let i = 0; i < 5; i++) {
    const bx = x + i * 5 + Math.floor(rng() * 4);
    const h = 60 + Math.floor(rng() * 50);
    s.rect(bx, y - h, 3, h, '#6f7f47');
    s.rect(bx + 1, y - h, 1, h, '#a8bf5a');
    for (let yy = y - h + 8; yy < y; yy += 10) s.hline(bx, yy, 3, '#4c5a32');
    for (let k = 0; k < 3; k++) {
      s.line(bx + 1, y - h + 12 + k * 14, bx + 8 + k * 2, y - h + 6 + k * 14, '#5f7a3a');
    }
  }
}

export function boat(s, x, y, w = 80, color = '#5a3d24') {
  s.poly([[x, y], [x + w, y], [x + w - 10, y + 14], [x + 10, y + 14]], color);
  s.hline(x, y, w, sh(color, 1.25));
  s.hline(x + 10, y + 13, w - 20, sh(color, 0.6));
  // canopy
  s.rect(x + w * 0.3, y - 16, w * 0.4, 16, '#c9b083');
  s.poly([[x + w * 0.28, y - 16], [x + w * 0.72, y - 16], [x + w * 0.66, y - 26], [x + w * 0.34, y - 26]], '#b8945a');
  for (let i = 0; i < 4; i++) s.vline(x + w * 0.34 + i * 6, y - 16, 16, '#a8864e');
  // pole
  s.line(x + w - 14, y - 2, x + w - 6, y - 38, '#6b4a2f');
}

export function water(s, x, y, w, h, rng = Math.random) {
  s.rect(x, y, w, h, '#4d6b70');
  for (let i = 0; i < w * h * 0.02; i++) {
    const wx = x + Math.floor(rng() * w), wy = y + Math.floor(rng() * h);
    s.hline(wx, wy, 3 + Math.floor(rng() * 8), rng() < 0.5 ? '#7d9a9a' : '#31484e');
  }
  // reflection bands
  for (let i = 0; i < 6; i++) {
    s.hline(x + Math.floor(rng() * w), y + Math.floor(rng() * h), 10 + Math.floor(rng() * 20), withAlpha(hex('#a8c0b8'), 40));
  }
}

export function roofTiles(s, x, y, w, h, rng = Math.random) {
  s.rect(x, y, w, h, '#6a5a4a');
  for (let row = 0; row * 6 < h; row++) {
    const yy = y + row * 6;
    for (let xx = 0; xx < w; xx += 8) {
      s.rect(x + xx + (row % 2) * 4, yy, 7, 5, rng() < 0.5 ? '#7a6a58' : '#5a4a3c');
      s.hline(x + xx + (row % 2) * 4, yy, 7, '#8a7a66');
    }
  }
}

export function thatchRoof(s, x, y, w, h, rng = Math.random) {
  thatch(s, x, y, w, h, '#a8864e', rng);
  s.hline(x, y + h - 1, w, '#6a4a2a');
  for (let i = 0; i < 6; i++) s.line(x + i * Math.floor(w / 6), y, x + i * Math.floor(w / 6) + 4, y + h, '#8a6a44');
}

export function fence(s, x, y, w, h) {
  s.rect(x, y, w, 3, '#8a6a44');
  s.rect(x, y + h - 4, w, 3, '#8a6a44');
  for (let i = 0; i < w; i += 7) {
    s.rect(x + i, y - 4, 3, h + 4, '#a8864e');
    s.vline(x + i, y - 4, h + 4, '#c9a86a');
  }
}

export function smoke(s, x, y, size = 1, rng = Math.random) {
  for (let i = 0; i < 6; i++) {
    s.ellipse(x + Math.floor((rng() - 0.5) * 18 * size), y - i * 9 * size, 5 * size + i, 3 * size + Math.floor(i / 2), withAlpha(hex('#c9c0b0'), 45 - i * 5));
  }
}

export function signBoard(s, x, y, w, h, wood = '#5a3d24') {
  s.rect(x - 2, y - 2, w + 4, h + 4, '#3a281c');
  s.rect(x, y, w, h, wood);
  s.frame(x, y, w, h, '#8a6238');
  for (let i = 0; i < 3; i++) s.hline(x + 4, y + 5 + i * 6, w - 8, withAlpha(hex('#e6d3a3'), 90));
}

export function hangingHerbs(s, x, y, rng = Math.random) {
  s.vline(x, y - 10, 10, '#8a6a44');
  for (let i = 0; i < 4; i++) {
    const px = x + Math.floor((rng() - 0.5) * 14);
    s.line(x, y, px, y + 10 + Math.floor(rng() * 8), '#5d7a3a');
    s.ellipse(px, y + 12, 2, 3, '#6f7f47');
  }
}

export function dustMotes(s, w, h, rng = Math.random, count = 40) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rng() * w), y = Math.floor(rng() * h);
    s.set(x, y, withAlpha(hex('#ffe6a8'), 40 + Math.floor(rng() * 70)));
  }
}

export function vignette(s, strength = 0.65) {
  const w = s.w, h = s.h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0.62) s.blend(x, y, withAlpha(hex('#120c08'), Math.round(Math.min(210, (d - 0.62) * 420 * strength))));
    }
  }
}

export function lightShaft(s, x, y, w, h, color = '#ffe6a8', alpha = 30) {
  s.poly([[x, y], [x + w, y], [x + w + h * 0.35, y + h], [x - h * 0.1, y + h]], withAlpha(hex(color), alpha));
}
