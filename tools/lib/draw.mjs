// Shared pixel-art primitives used across every asset family.
import { Surface, hex, mul, mix, withAlpha, rgba } from './pixel.mjs';

export const PAL = {
  ink: '#241711',
  inkSoft: '#3a281c',
  black: '#171009',

  woodDark: '#3b2718',
  wood: '#5a3d24',
  woodMid: '#7a5330',
  woodLight: '#9a6d40',
  woodPale: '#c1935a',
  woodHighlight: '#dcb47a',

  earth: '#4a3222',
  earthLight: '#6b4a30',
  mud: '#5d4a34',
  mudLight: '#7d6547',

  paper: '#e6d3a3',
  paperLight: '#f4e6c4',
  paperDark: '#c3ab7a',
  paperShadow: '#9d855c',

  lamp: '#ffdf9a',
  lampMid: '#f0b04a',
  lampDeep: '#c07a22',
  fire: '#ffcf6a',
  ember: '#e07a2a',

  moss: '#4c5a32',
  mossLight: '#6f7f47',
  mossDark: '#333f22',
  leaf: '#5f7a3a',
  leafLight: '#8aa357',
  leafDark: '#3f5527',

  brick: '#8a4630',
  brickLight: '#a95f42',
  brickDark: '#632f20',

  clothBrown: '#7b5a3e',
  clothBrownLight: '#9c7654',
  clothDark: '#4b3a2b',
  indigo: '#3c4a58',
  indigoLight: '#586b7a',
  indigoDark: '#26313c',

  water: '#4d6b70',
  waterLight: '#7d9a9a',
  waterDark: '#31484e',

  skin1: '#e9b98f',
  skin2: '#d19b6c',
  skin3: '#b0784b',
  skin4: '#8d5a36',
  skinShadow: '#8a5433',
  hair: '#241a14',
  hairGrey: '#8d8578',
  hairWhite: '#d8d0bd',

  white: '#f2e7d0',
  red: '#a83226',
  redLight: '#c4513f',
  gold: '#d9a441',
  goldLight: '#f0c86a',
  silver: '#c9cfd2',
  silverDark: '#8e979c',
  brass: '#b98a3e',
  copper: '#b06b3e',
  green: '#5d7a3a',
  greenLight: '#8aa357',
  blue: '#4a6a80',
};

// Soft vertical gradient inside a rect.
export function vgrad(s, x, y, w, h, top, bottom) {
  const a = hex(top), b = hex(bottom);
  for (let yy = 0; yy < h; yy++) {
    const c = mix(a, b, yy / Math.max(1, h - 1));
    for (let xx = 0; xx < w; xx++) s.set(x + xx, y + yy, c);
  }
}

export function hgrad(s, x, y, w, h, left, right) {
  const a = hex(left), b = hex(right);
  for (let xx = 0; xx < w; xx++) {
    const c = mix(a, b, xx / Math.max(1, w - 1));
    for (let yy = 0; yy < h; yy++) s.set(x + xx, y + yy, c);
  }
}

export function shadeRect(s, x, y, w, h, color, topLight = 1.12, bottomDark = 0.78) {
  const c = hex(color);
  const mid = mul(c, topLight);
  const low = mul(c, bottomDark);
  const mid2 = mul(c, 0.95);
  const rows = [mid, mid, c, c, c, mid2, mid2, low, low];
  for (let yy = 0; yy < h; yy++) {
    const t = yy / Math.max(1, h - 1);
    const idx = Math.min(rows.length - 1, Math.floor(t * rows.length));
    for (let xx = 0; xx < w; xx++) s.set(x + xx, y + yy, rows[idx]);
  }
}

export function plankFloor(s, x, y, w, h, base, rng, plankH = 10, vertical = false) {
  const dark = mul(hex(base), 0.72);
  const light = mul(hex(base), 1.14);
  const mid = hex(base);
  s.rect(x, y, w, h, mid);
  if (!vertical) {
    for (let yy = 0; yy < h; yy += plankH) {
      for (let xx = 0; xx < w; xx++) {
        const g = rng();
        if (g < 0.03) s.set(x + xx, y + yy, light);
      }
      s.hline(x, y + yy, w, dark);
      const seam = Math.floor(rng() * w);
      s.vline(x + seam, y + yy, Math.min(plankH, h - yy), dark);
    }
  } else {
    for (let xx = 0; xx < w; xx += plankH) {
      s.vline(x + xx, y, h, dark);
      const seam = Math.floor(rng() * h);
      s.hline(x + xx, y + seam, Math.min(plankH, w - xx), dark);
    }
  }
}

export function wallPlaster(s, x, y, w, h, base, rng) {
  const c = hex(base);
  s.rect(x, y, w, h, c);
  const dark = mul(c, 0.86), light = mul(c, 1.1);
  for (let i = 0; i < w * h * 0.045; i++) {
    const px = x + Math.floor(rng() * w), py = y + Math.floor(rng() * h);
    s.set(px, py, rng() < 0.5 ? dark : light);
  }
  // subtle damp patches
  for (let i = 0; i < 3; i++) {
    const px = x + Math.floor(rng() * w), py = y + Math.floor(rng() * h);
    const rx = 4 + Math.floor(rng() * 10), ry = 3 + Math.floor(rng() * 8);
    s.blendRect(px, py, rx, ry, withAlpha(mul(c, 0.7), 60));
  }
}

export function brickWall(s, x, y, w, h, base, rng, mortar = '#6f6152') {
  s.rect(x, y, w, h, mortar);
  const bw = 18, bh = 8;
  const colors = [base, mul(hex(base), 1.12), mul(hex(base), 0.9), mul(hex(base), 0.78)];
  for (let row = 0, yy = y; yy < y + h; row++, yy += bh + 2) {
    const off = row % 2 ? -bw / 2 : 0;
    for (let xx = x + off; xx < x + w; xx += bw + 2) {
      const c = colors[Math.floor(rng() * colors.length)];
      s.rect(xx, yy, bw, bh, c);
      s.hline(xx, yy, bw, mul(c, 1.18));
      s.hline(xx, yy + bh - 1, bw, mul(c, 0.7));
    }
  }
}

export function thatch(s, x, y, w, h, base, rng) {
  s.rect(x, y, w, h, base);
  for (let yy = 0; yy < h; yy += 3) {
    for (let xx = 0; xx < w; xx += 2) {
      const r = rng();
      s.set(x + xx + (yy % 6 === 0 ? 1 : 0), y + yy, r < 0.3 ? mul(hex(base), 0.72) : r > 0.75 ? mul(hex(base), 1.16) : hex(base));
    }
  }
  for (let i = 0; i < w * h * 0.01; i++) {
    const px = x + Math.floor(rng() * w), py = y + Math.floor(rng() * h);
    s.set(px, py, mul(hex(base), 0.6));
  }
}

// Rounded rect using per-row spans.
export function roundRect(s, x, y, w, h, r, color) {
  const c = hex(color);
  for (let yy = 0; yy < h; yy++) {
    const ry = Math.abs(yy - h / 2) > h / 2 - r ? Math.round(r - Math.sqrt(Math.max(0, r * r - (r - (h / 2 - Math.abs(yy - h / 2))) ** 2))) : 0;
    for (let xx = ry; xx < w - ry; xx++) s.set(x + xx, y + yy, c);
  }
}

export function outlineShape(s, color = PAL.ink) {
  s.outline(color, true);
}

// ---------------------------------------------------------------- items ----
// All item primitives draw inside a 32x32 surface with a 1px ink outline.

export function sack(s, x, y, w, h, body = '#c9b083', tie = '#8a6a44', rng = Math.random) {
  roundRect(s, x + 1, y + 4, w - 2, h - 5, 3, body);
  // neck / folded top
  s.rect(x + 4, y, w - 8, 6, mul(hex(body), 0.92));
  s.hline(x + 4, y, w - 8, mul(hex(body), 1.14));
  s.hline(x + 5, y + 5, w - 10, mul(hex(body), 0.66));
  // tie
  s.hline(x + 5, y + 7, w - 10, tie);
  s.set(x + 6, y + 8, tie); s.set(x + w - 7, y + 8, tie);
  // shading
  const dark = mul(hex(body), 0.72), light = mul(hex(body), 1.14);
  s.vline(x + 1, y + 7, h - 10, dark);
  s.vline(x + w - 2, y + 7, h - 10, mul(hex(body), 0.55));
  s.vline(x + 2, y + 8, 3, light);
  // stitches
  for (let i = 0; i < 4; i++) s.set(x + 4 + i * 3, y + h - 5, mul(hex(body), 0.6));
  outlineShape(s);
}

export function jar(s, cx, cy, w, h, body = '#8a5a34', rim = '#5a3a22', rng = Math.random) {
  // body
  s.ellipse(cx, cy + 3, Math.floor(w / 2) - 1, Math.floor(h / 2) - 4, body);
  s.rect(cx - Math.floor(w / 2) + 1, cy - 3, w - 2, h - 6, body);
  // neck
  s.rect(cx - Math.floor(w / 4) - 1, cy - Math.floor(h / 2) + 1, Math.floor(w / 2) + 2, 5, mul(hex(body), 0.9));
  s.hline(cx - Math.floor(w / 4) - 2, cy - Math.floor(h / 2) + 1, Math.floor(w / 2) + 4, rim);
  // highlight
  s.vline(cx - Math.floor(w / 2) + 3, cy - 2, h - 12, mul(hex(body), 1.3));
  s.vline(cx - Math.floor(w / 2) + 4, cy - 1, h - 14, mul(hex(body), 1.16));
  s.ellipse(cx + 2, cy + 5, Math.floor(w / 3), Math.floor(h / 4), mul(hex(body), 0.86));
  s.ellipseOutline(cx, cy + 3, Math.floor(w / 2) - 1, Math.floor(h / 2) - 4, mul(hex(body), 0.55));
  outlineShape(s);
}

export function bowl(s, cx, cy, w, h, bowlColor = '#b9a98c', content = null, rng = Math.random) {
  s.ellipse(cx, cy - 2, Math.floor(w / 2), Math.floor(h / 2), content || bowlColor);
  s.rect(cx - Math.floor(w / 2), cy - 2, w, 6, bowlColor);
  s.ellipse(cx, cy + 3, Math.floor(w / 2), Math.max(2, Math.floor(h / 3)), bowlColor);
  s.hline(cx - Math.floor(w / 2) + 1, cy + 3, w - 2, mul(hex(bowlColor), 1.18));
  s.ellipse(cx, cy + 4, Math.floor(w / 2) - 1, Math.max(1, Math.floor(h / 3) - 1), mul(hex(bowlColor), 0.8));
  if (content) {
    for (let i = 0; i < 6; i++) {
      s.set(cx - Math.floor(w / 3) + Math.floor(rng() * (w / 1.5)), cy - 3 + Math.floor(rng() * 3), mul(hex(content), 0.82));
    }
  }
  outlineShape(s);
}

export function bottle(s, cx, cy, h, body = '#5f7d5a', cap = '#3a2a1c', liquid = null) {
  const w = 10;
  const top = cy - Math.floor(h / 2);
  // neck
  s.rect(cx - 2, top + 3, 4, 6, body);
  s.rect(cx - 3, top, 6, 4, cap);
  s.hline(cx - 3, top + 4, 6, mul(hex(body), 0.7));
  // body
  roundRect(s, cx - 5, top + 8, 10, h - 9, 3, body);
  s.vline(cx - 4, top + 10, h - 14, mul(hex(body), 1.35));
  s.vline(cx + 3, top + 10, h - 14, mul(hex(body), 0.62));
  if (liquid) {
    s.rect(cx - 3, cy + 2, 6, Math.floor(h / 3), liquid);
    s.hline(cx - 3, cy + 2, 6, mul(hex(liquid), 1.3));
  }
  // label
  s.rect(cx - 3, cy - 1, 6, 4, '#e8dcc0');
  s.set(cx - 2, cy, '#8a4a32');
  outlineShape(s);
}

export function smallBottle(s, cx, cy, color, capColor = '#2e2418') {
  s.rect(cx - 2, cy - 6, 4, 3, capColor);
  s.rect(cx - 4, cy - 3, 8, 9, color);
  s.hline(cx - 4, cy - 3, 8, mul(hex(color), 1.3));
  s.rect(cx - 2, cy, 4, 3, '#e9ddbe');
  outlineShape(s);
}

export function fish(s, x, y, dir, body = '#8fa3a5', belly = '#cdd6cf') {
  // body ellipse
  s.ellipse(x + 11, y + 6, 9, 4, body);
  s.ellipse(x + 11, y + 7, 8, 2, belly);
  // tail
  s.poly([[x + 19, y + 6], [x + 26, y + 1], [x + 26, y + 11]], body);
  // fins
  s.poly([[x + 8, y + 2], [x + 12, y + 1], [x + 12, y + 4]], mul(hex(body), 0.9));
  // eye
  s.set(x + 4, y + 5, PAL.ink);
  s.set(x + 3, y + 4, PAL.white);
  // gill
  s.vline(x + 8, y + 3, 6, mul(hex(body), 0.7));
  // scales
  for (let i = 0; i < 5; i++) s.set(x + 10 + i * 2, y + 4 + (i % 2), mul(hex(body), 1.18));
  outlineShape(s);
}

export function vegBundle(s, x, y, leaf = '#5d7a3a', tie = '#8a6a44', rng = Math.random) {
  for (let i = 0; i < 9; i++) {
    const px = x + 3 + i * 2;
    const h = 8 + Math.floor(rng() * 8);
    s.line(px, y + 20, px - 2 + Math.floor(rng() * 5), y + 20 - h, i % 3 === 0 ? mul(hex(leaf), 1.2) : leaf);
  }
  s.ellipse(x + 12, y + 20, 8, 3, tie);
  s.hline(x + 5, y + 21, 14, mul(hex(tie), 0.7));
  outlineShape(s);
}

export function grainPile(s, cx, cy, rx, ry, color = '#e2d3a8', rng = Math.random) {
  s.ellipse(cx, cy, rx, ry, color);
  for (let i = 0; i < rx * ry * 1.6; i++) {
    const a = rng() * Math.PI * 2, d = Math.sqrt(rng());
    const px = Math.round(cx + Math.cos(a) * rx * d * 0.9);
    const py = Math.round(cy + Math.sin(a) * ry * d * 0.9);
    s.set(px, py, rng() < 0.35 ? mul(hex(color), 0.82) : rng() < 0.6 ? mul(hex(color), 1.16) : color);
  }
  s.ellipseOutline(cx, cy, rx, ry, mul(hex(color), 0.68));
  outlineShape(s);
}

export function clothBolt(s, x, y, w, h, color = '#7b5a3e', rng = Math.random) {
  roundRect(s, x, y + 2, w, h - 4, 3, color);
  s.ellipse(x + 4, y + 2, 4, 2, mul(hex(color), 1.2));
  s.ellipse(x + 4, y + 2, 2, 1, mul(hex(color), 0.7));
  for (let i = 0; i < 4; i++) {
    s.vline(x + 8 + i * 5, y + 4, h - 8, mul(hex(color), 0.8));
  }
  s.hline(x + 1, y + 3, w - 2, mul(hex(color), 1.2));
  s.hline(x + 1, y + h - 4, w - 2, mul(hex(color), 0.6));
  outlineShape(s);
}

export function paperSheet(s, x, y, w, h, color = PAL.paper, mark = null, rng = Math.random) {
  s.rect(x, y, w, h, color);
  s.hline(x, y, w, mul(hex(color), 1.12));
  s.vline(x, y, h, mul(hex(color), 0.92));
  s.hline(x, y + h - 1, w, mul(hex(color), 0.78));
  // folded corner
  s.poly([[x + w - 5, y], [x + w, y + 5], [x + w - 5, y + 5]], mul(hex(color), 0.85));
  if (mark) {
    s.rect(x + 4, y + 4, w - 8, h - 8, mark);
    s.frame(x + 4, y + 4, w - 8, h - 8, mul(hex(mark), 0.7));
    for (let i = 0; i < 4; i++) s.hline(x + 6, y + 6 + i * 3, w - 12, mul(hex(mark), 1.2));
  } else {
    for (let i = 0; i < 4; i++) s.hline(x + 4, y + 6 + i * 3, w - 8, mul(hex(color), 0.72));
  }
  outlineShape(s);
}

export function crate(s, x, y, w, h, wood = '#8a6238', metal = '#6b6a64', rng = Math.random) {
  s.rect(x, y, w, h, wood);
  s.rect(x + 2, y + 2, w - 4, h - 4, mul(hex(wood), 1.12));
  s.frame(x + 2, y + 2, w - 4, h - 4, mul(hex(wood), 0.68));
  // diagonal planks
  s.line(x + 2, y + h - 3, x + w - 3, y + 2, mul(hex(wood), 0.8));
  s.line(x + 2, y + 2, x + w - 3, y + h - 3, mul(hex(wood), 0.86));
  // nails
  for (const [nx, ny] of [[x + 3, y + 3], [x + w - 4, y + 3], [x + 3, y + h - 4], [x + w - 4, y + h - 4]]) {
    s.set(nx, ny, metal);
  }
  outlineShape(s);
}

export function tool(s, x, y, angle, headColor, handleColor = '#8a6238', headType = 'blade') {
  // handle from bottom-left to top-right
  s.line(x + 4, y + 27, x + 20, y + 8, handleColor);
  s.line(x + 5, y + 27, x + 21, y + 8, mul(hex(handleColor), 1.2));
  if (headType === 'blade') {
    s.poly([[x + 20, y + 8], [x + 29, y + 3], [x + 28, y + 9], [x + 20, y + 12]], headColor);
    s.line(x + 20, y + 10, x + 28, y + 5, mul(hex(headColor), 1.4));
  } else if (headType === 'hammer') {
    s.rect(x + 20, y + 4, 10, 6, headColor);
    s.hline(x + 20, y + 4, 10, mul(hex(headColor), 1.3));
    s.hline(x + 20, y + 9, 10, mul(hex(headColor), 0.6));
  } else if (headType === 'sickle') {
    s.ellipseOutline(x + 24, y + 9, 7, 6, headColor);
    s.ellipseOutline(x + 24, y + 9, 6, 5, headColor);
  }
  outlineShape(s);
}

export function coin(s, cx, cy, r, color = '#d9a441', mark = '#8a6220') {
  s.ellipse(cx, cy, r, r, color);
  s.ellipse(cx - 1, cy - 1, r - 2, r - 2, mul(hex(color), 1.18));
  s.rect(cx - 2, cy - 2, 4, 4, mark);
  s.hline(cx - 1, cy - 1, 2, mul(hex(mark), 1.3));
  s.ellipseOutline(cx, cy, r, r, mul(hex(color), 0.6));
  outlineShape(s);
}

export function pot(s, cx, cy, w, h, color = '#7a4a30', rim = '#4a2a1c') {
  s.ellipse(cx, cy, Math.floor(w / 2), Math.floor(h / 2), color);
  s.ellipse(cx, cy - Math.floor(h / 4), Math.floor(w / 2), Math.floor(h / 6), mul(hex(color), 0.7));
  s.ellipse(cx, cy - Math.floor(h / 4), Math.floor(w / 2) - 2, Math.floor(h / 6) - 1, mul(hex(color), 1.15));
  s.hline(cx - Math.floor(w / 2), cy - Math.floor(h / 4) - 1, w, rim);
  s.ellipseOutline(cx, cy, Math.floor(w / 2), Math.floor(h / 2), mul(hex(color), 0.55));
  outlineShape(s);
}

export function boxItem(s, x, y, w, h, wood = '#6b4a2f', band = '#b98a3e') {
  s.rect(x, y, w, h, wood);
  s.hline(x, y, w, mul(hex(wood), 1.3));
  s.hline(x, y + h - 1, w, mul(hex(wood), 0.6));
  s.hline(x, y + 3, w, band);
  s.vline(x + Math.floor(w / 2), y + 3, 3, band);
  s.rect(x + Math.floor(w / 2) - 1, y + 6, 2, 3, band);
  outlineShape(s);
}

export function packet(s, x, y, w, h, color = '#c9b083', label = '#a83226') {
  s.rect(x, y, w, h, color);
  s.hline(x, y, w, mul(hex(color), 1.2));
  s.hline(x, y + h - 1, w, mul(hex(color), 0.7));
  s.rect(x + 3, y + 4, w - 6, h - 8, label);
  s.hline(x + 5, y + 6, w - 10, mul(hex(label), 1.25));
  s.hline(x + 5, y + 9, w - 10, mul(hex(label), 1.25));
  outlineShape(s);
}

export function leafItem(s, cx, cy, color = '#5d7a3a', dark = null) {
  const d = dark || mul(hex(color), 0.7);
  s.ellipse(cx, cy, 8, 4, color);
  s.line(cx - 8, cy, cx + 8, cy, d);
  for (let i = -6; i <= 6; i += 3) s.line(cx + i, cy, cx + i + 3, cy - 3, mul(hex(color), 1.18));
  outlineShape(s);
}

export function ropeCoil(s, cx, cy, r = 9, color = '#b09468') {
  s.ellipseOutline(cx, cy, r, r, color);
  s.ellipseOutline(cx, cy, r - 2, r - 2, color);
  s.ellipseOutline(cx, cy, r - 4, r - 4, mul(hex(color), 0.85));
  s.line(cx - r + 1, cy + 2, cx + r - 1, cy + 2, mul(hex(color), 0.75));
  outlineShape(s);
}

export function chopsticks(s, cx, cy) {
  s.line(cx - 5, cy + 12, cx + 6, cy - 12, '#c9a86a');
  s.line(cx - 3, cy + 12, cx + 8, cy - 12, '#b08f52');
  s.line(cx - 4, cy + 13, cx + 7, cy - 11, '#e0c58a');
  outlineShape(s);
}

export function glassBottle(s, cx, cy, h = 20) {
  const top = cy - Math.floor(h / 2);
  s.rect(cx - 2, top + 2, 4, 5, '#9fb2ac');
  s.rect(cx - 3, top, 6, 3, '#6b5a3a');
  roundRect(s, cx - 5, top + 6, 10, h - 7, 2, '#7f9994');
  s.vline(cx - 4, top + 8, h - 12, '#c6d8ce');
  s.vline(cx + 3, top + 8, h - 12, '#5d7570');
  s.hline(cx - 4, top + h - 3, 8, '#b8ccc0');
  outlineShape(s);
}

export function sackSmall(s, x, y, color = '#c9b083') {
  s.ellipse(x + 8, y + 10, 7, 8, color);
  s.rect(x + 4, y, 8, 5, mul(hex(color), 0.92));
  s.hline(x + 3, y + 5, 10, '#8a6a44');
  s.vline(x + 3, y + 9, 7, mul(hex(color), 0.72));
  s.vline(x + 13, y + 9, 7, mul(hex(color), 1.2));
  outlineShape(s);
}

export function basket(s, cx, cy, w = 18, h = 12, color = '#b08a52', dark = '#7a5a32') {
  // woven body
  s.poly([[cx - Math.floor(w / 2), cy - Math.floor(h / 2)], [cx + Math.floor(w / 2), cy - Math.floor(h / 2)], [cx + Math.floor(w / 2) - 3, cy + Math.floor(h / 2)], [cx - Math.floor(w / 2) + 3, cy + Math.floor(h / 2)]], color);
  for (let yy = -Math.floor(h / 2) + 2; yy < Math.floor(h / 2) - 1; yy += 2) {
    s.hline(cx - Math.floor(w / 2) + 1, cy + yy, w - 2, dark);
    s.hline(cx - Math.floor(w / 2) + 2, cy + yy + 1, w - 4, mul(hex(color), 1.18));
  }
  // rim
  s.hline(cx - Math.floor(w / 2), cy - Math.floor(h / 2), w, mul(hex(color), 1.25));
  s.hline(cx - Math.floor(w / 2), cy - Math.floor(h / 2) + 1, w, dark);
  outlineShape(s);
}

export function broom(s, x, y) {
  s.line(x + 6, y + 27, x + 18, y + 4, '#c9a86a');
  s.line(x + 7, y + 27, x + 19, y + 4, '#a8864e');
  for (let i = 0; i < 7; i++) {
    s.line(x + 3 + i * 2, y + 30, x + 6 + Math.floor(i / 2), y + 25, '#b89a5e');
  }
  outlineShape(s);
}

export function candleLamp(s, cx, cy) {
  s.rect(cx - 5, cy + 4, 10, 4, '#8a6238');
  s.rect(cx - 2, cy - 4, 4, 8, '#d9c9a0');
  s.ellipse(cx, cy - 6, 2, 3, '#f0b04a');
  s.set(cx, cy - 8, '#fff0c0');
  outlineShape(s);
}

export function scaleItem(s, cx, cy) {
  // beam scale
  s.vline(cx, cy - 10, 16, '#8a6238');
  s.rect(cx - 9, cy + 6, 18, 2, '#6b4a2f');
  s.line(cx - 12, cy - 6, cx + 12, cy - 6, '#b08a52');
  s.line(cx - 12, cy - 6, cx - 12, cy + 2, '#8a6238');
  s.line(cx + 12, cy - 6, cx + 12, cy + 2, '#8a6238');
  s.ellipse(cx - 12, cy + 3, 5, 2, '#c9a86a');
  s.ellipse(cx + 12, cy + 3, 5, 2, '#c9a86a');
  s.rect(cx - 3, cy - 12, 6, 3, '#6b4a2f');
  outlineShape(s);
}

export function bottleGroup(s, x, y, colors) {
  colors.forEach((c, i) => smallBottle(s, x + 7 + i * 8, y + 18, c));
}

export function gem(s, cx, cy, r, color) {
  s.poly([[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]], color);
  s.poly([[cx, cy - r], [cx + r, cy], [cx, cy]], mul(hex(color), 1.35));
  s.poly([[cx - r, cy], [cx, cy + r], [cx, cy]], mul(hex(color), 0.7));
  s.set(cx - 1, cy - 1, mul(hex(color), 1.6));
  outlineShape(s);
}

export function ring(s, cx, cy) {
  s.ellipseOutline(cx, cy + 2, 6, 6, '#d9a441');
  s.ellipseOutline(cx, cy + 2, 5, 5, '#f0c86a');
  s.ellipse(cx, cy - 3, 3, 3, '#f0c86a');
  s.set(cx - 1, cy - 4, '#fff2cc');
  outlineShape(s);
}

export function book(s, x, y, w, h, cover = '#7a3a2a', pages = '#e8dcc0') {
  s.rect(x, y + 1, w, h - 2, pages);
  s.rect(x + 1, y, w - 3, h - 2, cover);
  s.vline(x + 2, y + 1, h - 4, mul(hex(cover), 1.25));
  s.hline(x + 4, y + 3, w - 8, mul(hex(cover), 1.2));
  s.hline(x + 4, y + 6, w - 8, mul(hex(cover), 1.2));
  outlineShape(s);
}
