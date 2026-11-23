// Tileset (32px, 8x8 sheet) and VFX sprites.
import { Surface, hex, mul, withAlpha, rngFor } from '../lib/pixel.mjs';
import { PAL, plankFloor, brickWall, thatch } from '../lib/draw.mjs';

const C = (x) => hex(x);
const sh = (c, f) => mul(C(c), f);

export const TILES = [];

function tile(name, fn) {
  const s = new Surface(32, 32);
  fn(s, rngFor('tile' + name));
  s.outline(null);
  TILES.push({ name, s });
}

// --- ground
tile('dirt', (s, r) => {
  s.rect(0, 0, 32, 32, '#6a5238');
  for (let i = 0; i < 90; i++) s.set(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? '#5a4430' : '#7a6244');
  for (let i = 0; i < 4; i++) s.set(Math.floor(r() * 32), Math.floor(r() * 32), '#8a7050');
});
tile('dirt_dark', (s, r) => {
  s.rect(0, 0, 32, 32, '#4a3a2a');
  for (let i = 0; i < 80; i++) s.set(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? '#3e3024' : '#5a4834');
});
tile('mud', (s, r) => {
  s.rect(0, 0, 32, 32, '#4e4030');
  for (let i = 0; i < 40; i++) s.ellipse(Math.floor(r() * 32), Math.floor(r() * 32), 2 + Math.floor(r() * 4), 1, '#5d4a34');
  for (let i = 0; i < 20; i++) s.set(Math.floor(r() * 32), Math.floor(r() * 32), '#7d6547');
});
tile('grass', (s, r) => {
  s.rect(0, 0, 32, 32, '#55663a');
  for (let i = 0; i < 70; i++) s.set(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? '#4c5a32' : '#6f7f47');
  for (let i = 0; i < 10; i++) s.line(Math.floor(r() * 32), Math.floor(r() * 32), Math.floor(r() * 32), Math.floor(r() * 32) - 3, '#8aa357');
});
tile('grass_dark', (s, r) => {
  s.rect(0, 0, 32, 32, '#3f5527');
  for (let i = 0; i < 60; i++) s.set(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? '#333f22' : '#4c5a32');
});
tile('sand', (s, r) => {
  s.rect(0, 0, 32, 32, '#b8a474');
  for (let i = 0; i < 60; i++) s.set(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? '#a89468' : '#c9b488');
});
tile('stone', (s, r) => {
  s.rect(0, 0, 32, 32, '#7a7468');
  for (let i = 0; i < 60; i++) s.set(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? '#6a645a' : '#8a8478');
  for (let i = 0; i < 5; i++) s.ellipse(Math.floor(r() * 32), Math.floor(r() * 32), 3, 2, '#6a645a');
});
// --- floors
tile('brick_floor', (s, r) => {
  s.rect(0, 0, 32, 32, '#6a5a48');
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = ((col + (row % 2) * 0.5) * 8) % 32, y = row * 8;
      s.rect(Math.floor(x), y, 7, 7, row % 2 ? '#8a6a52' : '#9a7a5e');
      s.hline(Math.floor(x), y, 7, '#a88868');
    }
  }
});
tile('wood_floor', (s, r) => {
  plankFloor(s, 0, 0, 32, 32, '#6b4a2f', r, 8, false);
});
tile('wood_floor_dark', (s, r) => {
  plankFloor(s, 0, 0, 32, 32, '#4a3222', r, 8, false);
});
tile('bamboo_floor', (s, r) => {
  s.rect(0, 0, 32, 32, '#a8864e');
  for (let x = 0; x < 32; x += 4) {
    s.vline(x, 0, 32, '#8a6a44');
    s.vline(x + 1, 0, 32, '#c9a86a');
  }
  for (let y = 0; y < 32; y += 8) s.hline(0, y, 32, '#7a5a32');
});
tile('earthen_floor', (s, r) => {
  s.rect(0, 0, 32, 32, '#5a4632');
  for (let i = 0; i < 70; i++) s.set(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? '#4e3c2a' : '#6a5238');
  for (let i = 0; i < 6; i++) s.ellipse(Math.floor(r() * 32), Math.floor(r() * 32), 2, 1, '#4a3828');
});
// --- water
tile('water', (s, r) => {
  s.rect(0, 0, 32, 32, '#4d6b70');
  for (let i = 0; i < 20; i++) s.hline(Math.floor(r() * 32), Math.floor(r() * 32), 2 + Math.floor(r() * 8), r() < 0.5 ? '#7d9a9a' : '#31484e');
  for (let i = 0; i < 4; i++) s.hline(Math.floor(r() * 32), Math.floor(r() * 32), 4, '#a8c0b8');
});
tile('water_dark', (s, r) => {
  s.rect(0, 0, 32, 32, '#31484e');
  for (let i = 0; i < 16; i++) s.hline(Math.floor(r() * 32), Math.floor(r() * 32), 2 + Math.floor(r() * 6), r() < 0.5 ? '#4d6b70' : '#263a40');
});
tile('water_foam', (s, r) => {
  s.rect(0, 0, 32, 32, '#4d6b70');
  for (let i = 0; i < 10; i++) s.hline(Math.floor(r() * 32), Math.floor(r() * 32), 4 + Math.floor(r() * 8), '#a8c0b8');
  for (let i = 0; i < 30; i++) s.set(Math.floor(r() * 32), Math.floor(r() * 32), '#c9d8d0');
});
tile('puddle', (s, r) => {
  s.rect(0, 0, 32, 32, '#5a4632');
  for (let i = 0; i < 40; i++) s.set(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? '#4e3c2a' : '#6a5238');
  s.ellipse(16, 18, 11, 5, '#5d6b70');
  s.ellipse(15, 17, 9, 3, '#7d9a9a');
  s.hline(10, 16, 6, '#a8c0b8');
});
// --- walls
tile('wall_plaster', (s, r) => {
  s.rect(0, 0, 32, 32, '#b8a888');
  for (let i = 0; i < 40; i++) s.set(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? '#a89878' : '#c9b898');
  s.hline(0, 31, 32, '#8a7a5e');
});
tile('wall_plaster_dark', (s, r) => {
  s.rect(0, 0, 32, 32, '#8a7a62');
  for (let i = 0; i < 40; i++) s.set(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? '#7a6a54' : '#9a8a70');
  s.hline(0, 31, 32, '#5a4a38');
});
tile('wall_wood', (s, r) => {
  plankFloor(s, 0, 0, 32, 32, '#5a3d24', r, 8, true);
});
tile('wall_brick', (s, r) => {
  brickWall(s, 0, 0, 32, 32, '#8a4630', r);
});
tile('wall_mud', (s, r) => {
  s.rect(0, 0, 32, 32, '#8a7a58');
  for (let i = 0; i < 50; i++) s.set(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? '#7a6a4a' : '#9a8a66');
  for (let i = 0; i < 3; i++) s.line(Math.floor(r() * 32), Math.floor(r() * 32), Math.floor(r() * 32), Math.floor(r() * 32), '#6a5a3e');
});
tile('wall_thatch', (s, r) => {
  thatch(s, 0, 0, 32, 32, '#8a7a52', r);
});
// --- roofs
tile('roof_tiles', (s, r) => {
  s.rect(0, 0, 32, 32, '#6a5a4a');
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 4; col++) {
      s.rect(col * 8 + (row % 2) * 4, row * 7, 7, 6, r() < 0.5 ? '#7a6a58' : '#5a4a3c');
      s.hline(col * 8 + (row % 2) * 4, row * 7, 7, '#8a7a66');
    }
  }
});
tile('roof_thatch', (s, r) => {
  thatch(s, 0, 0, 32, 32, '#a8864e', r);
  s.hline(0, 31, 32, '#6a4a2a');
});
// --- decor
tile('fence', (s, r) => {
  s.rect(0, 0, 32, 32, withAlpha(hex('#000000'), 0));
  s.rect(0, 6, 32, 3, '#8a6a44');
  s.rect(0, 22, 32, 3, '#8a6a44');
  for (let x = 0; x < 32; x += 8) {
    s.rect(x + 2, 2, 3, 28, '#a8864e');
    s.vline(x + 2, 2, 28, '#c9a86a');
    s.vline(x + 4, 2, 28, '#7a5a32');
  }
});
tile('grass_tuft', (s, r) => {
  s.rect(0, 0, 32, 32, withAlpha(hex('#000000'), 0));
  for (let i = 0; i < 14; i++) {
    const x = 4 + Math.floor(r() * 24);
    s.line(x, 30, x + Math.floor(r() * 5) - 2, 12 + Math.floor(r() * 10), r() < 0.5 ? '#5d7a3a' : '#8aa357');
  }
});
tile('flowers', (s, r) => {
  s.rect(0, 0, 32, 32, withAlpha(hex('#000000'), 0));
  for (let i = 0; i < 5; i++) {
    const x = 4 + Math.floor(r() * 24), y = 14 + Math.floor(r() * 12);
    s.line(x, 30, x, y, '#5d7a3a');
    s.ellipse(x, y, 2, 2, r() < 0.5 ? '#c4513f' : '#e0c58a');
  }
});
tile('crack', (s, r) => {
  s.rect(0, 0, 32, 32, '#7a7468');
  for (let i = 0; i < 40; i++) s.set(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? '#6a645a' : '#8a8478');
  s.line(6, 4, 14, 16, '#4a463e');
  s.line(14, 16, 10, 28, '#4a463e');
  s.line(14, 16, 24, 22, '#4a463e');
});
tile('moss', (s, r) => {
  s.rect(0, 0, 32, 32, '#7a7468');
  for (let i = 0; i < 40; i++) s.set(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? '#6a645a' : '#8a8478');
  for (let i = 0; i < 60; i++) s.set(Math.floor(r() * 32), Math.floor(r() * 32), r() < 0.5 ? '#4c5a32' : '#6f7f47');
});
tile('door', (s, r) => {
  s.rect(0, 0, 32, 32, '#5a3d24');
  for (let i = 0; i < 4; i++) s.vline(4 + i * 7, 0, 32, '#4a3222');
  s.hline(0, 8, 32, '#6b4a2f');
  s.hline(0, 22, 32, '#6b4a2f');
  s.set(26, 16, '#b98a3e');
  s.frame(0, 0, 32, 32, '#3a281c');
});
tile('window', (s, r) => {
  s.rect(0, 0, 32, 32, '#5a3d24');
  s.rect(3, 3, 26, 26, '#8a9a9a');
  s.vline(16, 3, 26, '#5a3d24');
  s.hline(3, 16, 26, '#5a3d24');
  s.frame(3, 3, 26, 26, '#3a281c');
});
tile('sign', (s, r) => {
  s.rect(0, 0, 32, 32, '#8a6238');
  s.rect(3, 3, 26, 26, '#e6d3a3');
  for (let i = 0; i < 3; i++) s.hline(7, 9 + i * 6, 18, '#a8864e');
  s.frame(3, 3, 26, 26, '#4a3222');
});
tile('counter_top', (s, r) => {
  plankFloor(s, 0, 0, 32, 32, '#7a5330', r, 10, false);
  s.hline(0, 0, 32, '#9a6d40');
  s.hline(0, 31, 32, '#5a3d24');
});

export function buildTiles() {
  const size = 32;
  const cols = 8;
  const rows = Math.ceil(TILES.length / cols);
  const sheet = new Surface(cols * size, rows * size);
  const meta = [];
  TILES.forEach((t, i) => {
    const x = (i % cols) * size, y = Math.floor(i / cols) * size;
    for (let yy = 0; yy < size; yy++) {
      for (let xx = 0; xx < size; xx++) {
        const c = t.s.get(xx, yy);
        if ((c >>> 24) > 0) sheet.set(x + xx, y + yy, c);
      }
    }
    meta.push({ name: t.name, x, y, w: size, h: size });
  });
  return { sheet, meta, size, cols, rows };
}

// ------------------------------------------------------------------- VFX ----
export function buildVFX(out) {
  const files = [];
  const save = (n, s) => { out(n, s); files.push(n); };

  // rain drop 3x14
  {
    const s = new Surface(4, 14);
    s.vline(1, 1, 10, '#a8c0c8');
    s.set(1, 0, '#d8e8e8');
    s.set(1, 11, '#7d9a9a');
    save('effects/rain_drop.png', s);
  }
  // rain splash
  {
    const s = new Surface(16, 8);
    s.ellipse(8, 6, 6, 2, withAlpha(hex('#a8c0c8'), 120));
    s.ellipse(8, 5, 3, 1, withAlpha(hex('#d8e8e8'), 160));
    save('effects/rain_splash.png', s);
  }
  // smoke puff (4 frames)
  for (let f = 0; f < 4; f++) {
    const s = new Surface(32, 32);
    const r = rngFor('smoke' + f);
    for (let i = 0; i < 4; i++) {
      const rad = 3 + f * 2 + i;
      s.ellipse(16 + Math.floor((r() - 0.5) * (f + 2) * 3), 24 - f * 4 - i * 2, rad, Math.max(1, rad - 1), withAlpha(hex('#c9c0b0'), 55 - f * 8));
    }
    save(`effects/smoke_${f}.png`, s);
  }
  // sparkle
  {
    const s = new Surface(16, 16);
    s.line(8, 1, 8, 14, '#fff2cc');
    s.line(1, 8, 14, 8, '#fff2cc');
    s.line(4, 4, 11, 11, '#ffe6a8');
    s.line(11, 4, 4, 11, '#ffe6a8');
    s.set(8, 8, '#ffffff');
    save('effects/sparkle.png', s);
  }
  // coin
  {
    const s = new Surface(16, 16);
    s.ellipse(8, 8, 6, 6, '#d9a441');
    s.ellipse(7, 7, 4, 4, '#f0c86a');
    s.rect(6, 6, 3, 3, '#8a6220');
    s.outline('#5a3a14', true);
    save('effects/coin.png', s);
  }
  // heart
  {
    const s = new Surface(16, 16);
    s.ellipse(5, 6, 4, 3, '#c4513f');
    s.ellipse(11, 6, 4, 3, '#c4513f');
    s.poly([[1, 7], [8, 14], [15, 7]], '#c4513f');
    s.set(4, 5, '#e88a7a');
    save('effects/heart.png', s);
  }
  // dust
  {
    const s = new Surface(16, 16);
    for (let i = 0; i < 6; i++) s.set(2 + i * 2, 12 - (i % 3) * 3, withAlpha(hex('#c9b083'), 150));
    save('effects/dust.png', s);
  }
  // ember
  {
    const s = new Surface(8, 8);
    s.ellipse(4, 4, 2, 2, '#ffcf6a');
    s.set(3, 3, '#fff2cc');
    save('effects/ember.png', s);
  }
  // glow (large radial)
  {
    const s = new Surface(128, 128);
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const d = Math.sqrt((x - 64) ** 2 + (y - 64) ** 2) / 64;
        if (d < 1) s.set(x, y, withAlpha(hex('#ffcf6a'), Math.round((1 - d) ** 2 * 200)));
      }
    }
    save('effects/glow.png', s);
  }
  // check / cross marks
  {
    const s = new Surface(20, 20);
    s.line(4, 11, 9, 16, '#8aa357'); s.line(9, 16, 17, 4, '#8aa357');
    save('effects/check.png', s);
  }
  {
    const s = new Surface(20, 20);
    s.line(4, 4, 16, 16, '#c4513f'); s.line(16, 4, 4, 16, '#c4513f');
    save('effects/cross.png', s);
  }
  // money bag
  {
    const s = new Surface(24, 24);
    s.ellipse(12, 14, 8, 7, '#c9b083');
    s.rect(8, 4, 8, 6, '#b8a273');
    s.hline(7, 9, 10, '#8a6a44');
    s.set(10, 13, '#8a6220'); s.set(14, 13, '#8a6220');
    s.outline('#3a2a1c', true);
    save('effects/money_bag.png', s);
  }
  return files;
}
