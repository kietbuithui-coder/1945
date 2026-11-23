// Environment scenes, 640x360 art resolution (displayed at 2x).
import { Surface, hex, mul, mix, withAlpha, rngFor } from '../lib/pixel.mjs';
import {
  PAL, roundRect, plankFloor, brickWall, thatch, wallPlaster, vgrad,
} from '../lib/draw.mjs';
import {
  shelf, windowFrame, doorFrame, counter, hangingLamp, oilLamp, sackPile, cratePile,
  basketStack, jars, chicken, tree, bambooCluster, boat, water, roofTiles, thatchRoof,
  fence, smoke, signBoard, hangingHerbs, dustMotes, vignette, lightShaft,
} from '../lib/props.mjs';

const C = (x) => hex(x);
const sh = (c, f) => mul(C(c), f);

function grade(s, mulR, mulG, mulB, tint = null, tintA = 0) {
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      const c = s.get(x, y);
      if ((c >>> 24) === 0) continue;
      const r = Math.min(255, Math.round((c & 255) * mulR));
      const g = Math.min(255, Math.round(((c >>> 8) & 255) * mulG));
      const b = Math.min(255, Math.round(((c >>> 16) & 255) * mulB));
      let nc = ((c >>> 24) << 24 | b << 16 | g << 8 | r) >>> 0;
      if (tint && tintA > 0) nc = mix(nc, C(tint), tintA);
      s.set(x, y, nc);
    }
  }
}

function addGlow(s, cx, cy, radius, color = '#ffd98a', strength = 0.55) {
  for (let y = Math.max(0, cy - radius); y < Math.min(s.h, cy + radius); y++) {
    for (let x = Math.max(0, cx - radius); x < Math.min(s.w, cx + radius); x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / radius;
      if (d >= 1) continue;
      const a = Math.round((1 - d) ** 2 * 255 * strength);
      s.blend(x, y, withAlpha(C(color), a));
    }
  }
}

// ------------------------------------------------------------ shop inside --
export function shopInterior(mode = 'day') {
  const s = new Surface(640, 360);
  const rng = rngFor('shopv3' + mode);
  const night = mode === 'night';
  const dusk = mode === 'dusk';
  const rain = mode === 'rain';

  // ---- ceiling & beams
  s.rect(0, 0, 640, 38, '#241711');
  for (let x = 0; x < 640; x += 64) {
    s.rect(x, 0, 46, 36, '#3a281a');
    s.hline(x, 0, 46, '#4a3524');
    s.hline(x, 35, 46, '#1d1209');
    s.vline(x + 45, 0, 36, '#2a1c12');
  }
  s.rect(0, 38, 640, 5, '#2e1e13');
  s.hline(0, 43, 640, '#4a3524');

  // ---- back wall
  wallPlaster(s, 0, 43, 640, 178, night ? '#4a3628' : '#5c4430', rng);
  for (let x = 0; x < 640; x += 42) {
    s.vline(x, 43, 178, '#4e3826');
    s.vline(x + 1, 43, 178, '#6b4f36');
  }
  // wainscot
  plankFloor(s, 0, 221, 640, 54, night ? '#3a2718' : '#4a3222', rng, 13, true);
  s.hline(0, 221, 640, '#2e1e13');
  s.hline(0, 222, 640, '#6b4a2f');

  // ---- floor
  plankFloor(s, 0, 275, 640, 85, night ? '#2a1c12' : '#3e2a1a', rng, 13, false);
  // woven mat where customers stand
  s.rect(252, 278, 136, 24, '#8a7a52');
  for (let yy = 280; yy < 300; yy += 4) s.hline(256, yy, 128, '#6a5a3a');
  for (let xx = 256; xx < 386; xx += 6) s.vline(xx, 278, 24, '#a89468');
  s.frame(252, 278, 136, 24, '#5a4a2e');

  // ---- shelves
  shelf(s, 14, 72, 152, 182, '#5a3d24', 3, rng, true);
  shelf(s, 474, 72, 152, 182, '#5a3d24', 3, rng, true);
  shelf(s, 14, 44, 152, 22, '#4a3222', 1, rng, true);

  // ---- window
  windowFrame(s, 196, 64, 96, 96, rain ? '#5a6a72' : night ? '#1e2a3a' : dusk ? '#c47a55' : '#7d8a8c', rng, false);
  addGlow(s, 244, 112, 100, night ? '#7d9ab8' : '#ffe6a8', 0.2);

  // ---- door
  doorFrame(s, 408, 116, 56, 160, '#4a3222');
  // curtain rod + cloth
  s.rect(402, 108, 68, 4, '#3a281c');
  for (let i = 0; i < 5; i++) {
    s.poly([[406 + i * 13, 112], [416 + i * 13, 112], [414 + i * 13, 138], [404 + i * 13, 136]], i % 2 ? '#7a5a44' : '#6a4a38');
  }
  s.hline(404, 112, 60, '#8a6a52');

  // ---- family altar (Vietnamese touch)
  s.rect(300, 196, 76, 5, '#6b4a2f');
  s.rect(300, 196, 76, 2, '#8a6238');
  s.rect(310, 172, 16, 24, '#8a6238');
  s.ellipse(318, 172, 8, 3, '#b98a3e');
  s.ellipse(318, 171, 6, 2, '#e0b862');
  for (let i = 0; i < 3; i++) s.line(313 + i * 4, 169, 312 + i * 4, 158, '#c9b083');
  s.set(312, 157, '#ffcf6a'); s.set(316, 156, '#ffcf6a'); s.set(320, 157, '#ffcf6a');
  // red paper on wall
  s.rect(344, 176, 18, 20, '#a83226');
  s.rect(347, 179, 12, 2, '#e6d3a3');
  s.rect(347, 183, 9, 2, '#e6d3a3');
  s.rect(347, 187, 12, 2, '#e6d3a3');

  // ---- wall clock
  s.ellipse(380, 152, 15, 15, '#3a2a1c');
  s.ellipse(380, 152, 12, 12, '#e6d3a3');
  s.ellipse(380, 152, 10, 10, '#f2e6c8');
  s.line(380, 152, 380, 144, '#241711');
  s.line(380, 152, 387, 155, '#241711');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    s.set(Math.round(380 + Math.cos(a) * 9), Math.round(152 + Math.sin(a) * 9), '#6a5a44');
  }

  // ---- hanging herbs & dried goods
  hangingHerbs(s, 452, 54, rng);
  hangingHerbs(s, 462, 52, rng);
  s.vline(120, 44, 24, '#8a6a44');
  s.line(120, 68, 110, 78, '#8a6a44');
  s.line(120, 68, 132, 80, '#8a6a44');
  s.ellipse(108, 82, 6, 3, '#b8945a');
  s.ellipse(134, 84, 6, 3, '#b8945a');

  // ---- hanging lamp
  hangingLamp(s, 320, 26, 1.15, !rain);
  addGlow(s, 320, 44, 130, '#ffcf6a', night ? 0.5 : dusk ? 0.4 : 0.3);

  // ---- counter
  counter(s, 28, 300, 584, 60, '#4a3222', '#8a6238', rng);
  s.hline(28, 300, 584, '#a97c4a');
  s.hline(28, 302, 584, '#c1935a');

  // ---- counter props
  // balance scale
  s.rect(148, 286, 4, 14, '#8a6238');
  s.rect(132, 284, 36, 3, '#6b4a2f');
  s.line(126, 279, 174, 279, '#b08a52');
  s.line(126, 279, 126, 288, '#8a6238');
  s.line(174, 279, 174, 288, '#8a6238');
  s.ellipse(124, 290, 7, 2, '#c9a86a');
  s.ellipse(176, 290, 7, 2, '#c9a86a');
  // ledger + brush
  s.rect(392, 290, 42, 8, '#7a3a2a');
  s.rect(394, 291, 38, 5, '#e8dcc0');
  s.hline(396, 293, 28, '#a8864e');
  s.hline(396, 295, 22, '#a8864e');
  s.line(434, 296, 444, 288, '#3a2a1c');
  // abacus
  s.rect(446, 292, 32, 8, '#5a3d24');
  s.frame(447, 293, 30, 6, '#8a6238');
  for (let i = 0; i < 8; i++) {
    s.set(450 + i * 3, 295, '#d9a441');
    s.set(450 + i * 3, 297, '#b98a3e');
  }
  // oil lamp
  oilLamp(s, 352, 292, !rain);
  addGlow(s, 352, 286, 55, '#ffb84d', night ? 0.4 : 0.25);
  // bowls
  s.ellipse(232, 295, 10, 3, '#b9a98c');
  s.ellipse(232, 294, 8, 2, '#d8c9a8');
  s.ellipse(218, 296, 8, 2, '#9a8a70');
  // jars
  jars(s, 492, 300, 2, rng);
  // sleeping cat
  s.ellipse(556, 294, 13, 5, '#8a7a62');
  s.ellipse(564, 291, 5, 4, '#8a7a62');
  s.poly([[560, 289], [562, 285], [564, 289]], '#8a7a62');
  s.poly([[565, 289], [567, 285], [569, 289]], '#8a7a62');
  s.set(562, 292, '#241711'); s.set(566, 292, '#241711');
  s.line(548, 296, 542, 300, '#8a7a62');
  // string of dried chilies
  s.vline(200, 44, 18, '#8a6a44');
  for (let i = 0; i < 4; i++) {
    s.ellipse(200 + (i % 2) * 3, 66 + i * 6, 2, 3, '#a83226');
  }

  // ---- dust motes
  if (!rain) dustMotes(s, 640, 300, rng, 60);

  // ---- grading
  if (night) {
    grade(s, 0.55, 0.58, 0.74, '#2a3a58', 0.1);
    addGlow(s, 320, 44, 170, '#ffd98a', 0.55);
    addGlow(s, 352, 286, 80, '#ffb84d', 0.35);
  } else if (dusk) {
    grade(s, 0.92, 0.74, 0.62, '#c47a55', 0.07);
    addGlow(s, 320, 44, 140, '#ffcf6a', 0.42);
    addGlow(s, 352, 286, 70, '#ffb84d', 0.3);
  } else if (rain) {
    grade(s, 0.76, 0.8, 0.88, '#5a6a72', 0.07);
    addGlow(s, 320, 44, 120, '#ffd98a', 0.3);
    addGlow(s, 352, 286, 60, '#ffb84d', 0.25);
  } else {
    grade(s, 1.04, 1.0, 0.94);
    addGlow(s, 320, 44, 140, '#ffe6a8', 0.24);
  }
  vignette(s, 0.72);
  return s;
}

// ----------------------------------------------------------- shop overlays --
export function shopLevelOverlay(level) {
  const s = new Surface(640, 360);
  const rng = rngFor('overlay' + level);
  if (level >= 2) {
    // extra shelf on left upper wall + goods
    shelf(s, 190, 168, 90, 76, '#5a3d24', 2, rng, true);
  }
  if (level >= 3) {
    // glass cabinet on right
    s.rect(560, 120, 66, 150, '#3a281c');
    s.rect(563, 123, 60, 144, withAlpha(hex('#a8c0b8'), 60));
    s.frame(563, 123, 60, 144, '#8a6238');
    s.vline(593, 123, 144, '#8a6238');
    s.hline(563, 195, 60, '#8a6238');
    s.hline(563, 240, 60, '#8a6238');
    jars(s, 568, 194, 2, rng);
    jars(s, 568, 239, 2, rng);
    jars(s, 568, 290, 2, rng);
    s.rect(560, 270, 66, 4, '#6b4a2f');
  }
  if (level >= 4) {
    // new lamp + hanging sign
    hangingLamp(s, 160, 60, 0.9, true);
    signBoard(s, 250, 190, 74, 28, '#e6d3a3');
    s.rect(258, 196, 58, 2, '#8a3a2a');
    s.rect(258, 202, 44, 2, '#8a3a2a');
    s.rect(258, 208, 52, 2, '#8a3a2a');
  }
  if (level >= 5) {
    // decorated beams + extra counter goods
    s.rect(0, 0, 640, 10, '#6b4a2f');
    s.hline(0, 10, 640, '#8a6238');
    for (let x = 20; x < 640; x += 60) {
      s.ellipse(x, 18, 6, 3, '#a83226');
      s.set(x, 18, '#d9a441');
    }
    sackPile(s, 100, 300, 3, rng);
    cratePile(s, 300, 300, 2, rng);
  }
  return s;
}

// ------------------------------------------------------------- shop outside --
export function shopExterior(mode = 'dusk') {
  const s = new Surface(640, 360);
  const rng = rngFor('exterior' + mode);
  const night = mode === 'night';
  const rain = mode === 'rain';
  // sky
  if (night) vgrad(s, 0, 0, 640, 250, '#1a2434', '#3a3a4a');
  else if (rain) vgrad(s, 0, 0, 640, 250, '#5a6a72', '#8a9494');
  else vgrad(s, 0, 0, 640, 250, '#3a4a68', '#d98a4a');
  // clouds
  for (let i = 0; i < 10; i++) {
    s.ellipse(Math.floor(rng() * 640), 20 + Math.floor(rng() * 130), 30 + Math.floor(rng() * 40), 6 + Math.floor(rng() * 6), withAlpha(hex(night ? '#2a3448' : '#c9a88a'), 50));
  }
  // distant roofs
  for (let x = 0; x < 640; x += 52) {
    const h = 30 + Math.floor(rng() * 30);
    s.rect(x, 250 - h, 52, h, night ? '#141c26' : '#2e2a28');
    s.poly([[x - 4, 250 - h], [x + 26, 250 - h - 22], [x + 56, 250 - h]], night ? '#101820' : '#3a3430');
  }
  // ground
  s.rect(0, 250, 640, 110, night ? '#241a16' : '#3a2a20');
  for (let i = 0; i < 200; i++) {
    s.set(Math.floor(rng() * 640), 250 + Math.floor(rng() * 110), sh('#3a2a20', 0.7 + rng() * 0.5));
  }
  // shop facade left
  const fx = 60, fw = 250;
  s.rect(fx, 90, fw, 170, '#4a3222');
  plankFloor(s, fx, 90, fw, 170, '#4a3222', rng, 12, true);
  // roof
  s.poly([[fx - 20, 92], [fx + fw / 2, 40], [fx + fw + 20, 92]], '#3a2a20');
  roofTiles(s, fx - 20, 92, fw + 40, 16, rng);
  // signboard
  signBoard(s, fx + 70, 100, 110, 30, '#5a3d24');
  s.rect(fx + 80, 108, 90, 3, withAlpha(hex('#e6d3a3'), 120));
  s.rect(fx + 88, 116, 74, 3, withAlpha(hex('#e6d3a3'), 100));
  // window with warm light
  s.rect(fx + 30, 150, 80, 70, '#2a1e14');
  s.rect(fx + 34, 154, 72, 62, night ? '#ffcf6a' : '#f0b04a');
  s.rect(fx + 34, 154, 72, 62, withAlpha(hex('#ffdf9a'), 90));
  s.vline(fx + 70, 154, 62, '#5a3d24');
  s.hline(fx + 34, 184, 72, '#5a3d24');
  s.frame(fx + 30, 150, 80, 70, '#3a281c');
  addGlow(s, fx + 70, 184, 120, '#ffcf6a', night ? 0.5 : 0.35);
  // door
  doorFrame(s, fx + 160, 150, 54, 110, '#3a281c');
  // hanging lamp by door
  hangingLamp(s, fx + 150, 140, 0.7, true);
  addGlow(s, fx + 150, 155, 60, '#ffcf6a', 0.4);
  // awning
  s.poly([[fx + 20, 140], [fx + 230, 140], [fx + 240, 150], [fx + 10, 150]], '#8a6a44');
  for (let i = 0; i < 10; i++) s.line(fx + 20 + i * 22, 140, fx + 12 + i * 22, 150, '#a8864e');
  // crates & baskets outside
  cratePile(s, fx + 240, 250, 2, rng);
  basketStack(s, fx + 20, 250, 3);
  // villagers silhouettes
  const drawPerson = (px, py, shirt, hat) => {
    s.ellipse(px, py - 44, 6, 7, '#8a5a36');
    s.rect(px - 8, py - 38, 16, 26, shirt);
    s.rect(px - 6, py - 12, 4, 12, '#2a2420');
    s.rect(px + 2, py - 12, 4, 12, '#2a2420');
    if (hat) s.poly([[px, py - 54], [px - 12, py - 44], [px + 12, py - 44]], '#c9a86a');
    else s.ellipse(px, py - 49, 6, 3, '#241a14');
  };
  drawPerson(400, 270, '#5a4a3a', true);
  drawPerson(450, 262, '#6a5a44', false);
  drawPerson(500, 274, '#4a4a3a', true);
  drawPerson(560, 258, '#6a4a44', false);
  // rain
  if (rain) {
    for (let i = 0; i < 220; i++) {
      const x = Math.floor(rng() * 640), y = Math.floor(rng() * 360);
      s.vline(x, y, 5, withAlpha(hex('#aebfc0'), 90));
    }
    for (let i = 0; i < 6; i++) s.ellipse(Math.floor(rng() * 640), 300 + Math.floor(rng() * 50), 14, 3, withAlpha(hex('#8a9a9a'), 30));
  }
  grade(s, night ? 0.7 : 1, night ? 0.75 : 0.98, night ? 0.9 : 0.95);
  vignette(s, 0.8);
  return s;
}

// ---------------------------------------------------------------- market ---
export function market(mode = 'day') {
  const s = new Surface(640, 360);
  const rng = rngFor('market' + mode);
  const dusk = mode === 'dusk';
  vgrad(s, 0, 0, 640, 220, dusk ? '#6a5a6a' : '#8a9a9a', dusk ? '#d98a4a' : '#c9c0a8');
  for (let i = 0; i < 8; i++) s.ellipse(Math.floor(rng() * 640), 30 + Math.floor(rng() * 120), 30, 5, withAlpha(hex('#e8e0cc'), 50));
  // distant trees
  for (let x = 0; x < 640; x += 40) {
    s.ellipse(x + 10, 210 - Math.floor(rng() * 20), 18, 12, '#4c5a32');
  }
  // ground
  s.rect(0, 220, 640, 140, dusk ? '#4a3a2a' : '#5a4a38');
  for (let i = 0; i < 400; i++) s.set(Math.floor(rng() * 640), 220 + Math.floor(rng() * 140), sh('#5a4a38', 0.75 + rng() * 0.5));
  // stalls
  const stall = (x, y, w, color) => {
    // poles
    s.rect(x, y - 90, 4, 90, '#6b4a2f');
    s.rect(x + w - 4, y - 90, 4, 90, '#6b4a2f');
    // awning
    s.poly([[x - 14, y - 88], [x + w + 14, y - 88], [x + w, y - 62], [x, y - 62]], color);
    for (let i = 0; i < 6; i++) s.line(x - 10 + i * Math.floor((w + 20) / 6), y - 88, x - 6 + i * Math.floor((w + 20) / 6), y - 62, sh(color, 0.8));
    // table
    s.rect(x, y - 40, w, 8, '#6b4a2f');
    s.hline(x, y - 40, w, '#8a6238');
    s.rect(x + 2, y - 32, 4, 32, '#4a3222');
    s.rect(x + w - 6, y - 32, 4, 32, '#4a3222');
    // goods
    for (let gx = x + 4; gx < x + w - 8; gx += 14) {
      const k = Math.floor(rng() * 4);
      if (k === 0) s.ellipse(gx + 5, y - 44, 6, 4, '#c9a86a');
      else if (k === 1) s.ellipse(gx + 5, y - 44, 5, 5, '#5d7a3a');
      else if (k === 2) s.rect(gx, y - 50, 10, 9, '#c47a22');
      else s.ellipse(gx + 5, y - 44, 5, 4, '#a83226');
    }
  };
  stall(30, 250, 120, '#a83226');
  stall(180, 262, 130, '#5d7a3a');
  stall(340, 246, 120, '#b98a3e');
  stall(480, 260, 130, '#5a7a8a');
  // hanging goods
  for (let i = 0; i < 5; i++) {
    const x = 100 + i * 100;
    s.vline(x, 130, 30, '#8a6a44');
    s.line(x, 160, x - 8, 170, '#8a6a44');
    s.ellipse(x - 10, 174, 5, 4, '#b8945a');
  }
  // crowd silhouettes
  const person = (x, y, shirt, scale = 1) => {
    s.ellipse(x, y - 34 * scale, 5 * scale, 6 * scale, '#8a5a36');
    s.rect(x - 7 * scale, y - 29 * scale, 14 * scale, 22 * scale, shirt);
    s.rect(x - 5 * scale, y - 7 * scale, 4 * scale, 8 * scale, '#2a2420');
    s.rect(x + 2 * scale, y - 7 * scale, 4 * scale, 8 * scale, '#2a2420');
    s.poly([[x, y - 42 * scale], [x - 10 * scale, y - 33 * scale], [x + 10 * scale, y - 33 * scale]], '#c9a86a');
  };
  const colors = ['#5a4a3a', '#6a5a44', '#4a4a3a', '#6a4a44', '#5a6a5a', '#7a6a52'];
  const positions = [[90, 290], [150, 310], [230, 295], [290, 320], [370, 300], [430, 315], [520, 290], [580, 310], [60, 330], [330, 340], [470, 340]];
  positions.forEach((p, i) => person(p[0], p[1], colors[i % colors.length], 0.9 + (i % 3) * 0.12));
  // smoke from food stall
  smoke(s, 250, 210, 0.9, rng);
  smoke(s, 520, 220, 0.7, rng);
  // baskets foreground
  basketStack(s, 20, 355, 3);
  basketStack(s, 600, 352, 2);
  grade(s, dusk ? 0.85 : 1.02, dusk ? 0.7 : 1, dusk ? 0.62 : 0.95, dusk ? '#c47a55' : null, dusk ? 0.08 : 0);
  vignette(s, 0.7);
  return s;
}

// ---------------------------------------------------------------- street ---
export function street(mode = 'day') {
  const s = new Surface(640, 360);
  const rng = rngFor('street' + mode);
  const rain = mode === 'rain';
  vgrad(s, 0, 0, 640, 200, rain ? '#5a6a72' : '#8a9a9a', rain ? '#8a9494' : '#c9c0a8');
  // houses both sides
  const house = (x, y, w, h, roofColor, wallColor) => {
    s.rect(x, y, w, h, wallColor);
    for (let yy = y; yy < y + h; yy += 10) s.hline(x, yy, w, sh(wallColor, 0.9));
    s.poly([[x - 10, y], [x + w / 2, y - 40], [x + w + 10, y]], roofColor);
    for (let i = 0; i < 5; i++) s.line(x - 8 + i * Math.floor((w + 16) / 5), y - 1, x + w / 2, y - 38, sh(roofColor, 0.8));
    // windows
    for (let i = 0; i < 2; i++) {
      s.rect(x + 10 + i * Math.floor(w / 2), y + 30, 20, 22, '#3a2a1e');
      s.rect(x + 12 + i * Math.floor(w / 2), y + 32, 16, 18, rain ? '#4a5a62' : '#7d8a8c');
      s.vline(x + 20 + i * Math.floor(w / 2), y + 32, 18, '#4a3222');
    }
  };
  house(-20, 170, 200, 130, '#3a2a20', '#4a3222');
  house(180, 190, 180, 110, '#4a3222', '#5a3d2a');
  house(380, 180, 160, 120, '#3a2a20', '#4a3222');
  house(540, 200, 120, 100, '#4a3222', '#5a3d2a');
  // road
  s.rect(0, 300, 640, 60, '#3a2e24');
  for (let i = 0; i < 300; i++) s.set(Math.floor(rng() * 640), 300 + Math.floor(rng() * 60), sh('#3a2e24', 0.7 + rng() * 0.5));
  // puddles
  if (rain) {
    for (let i = 0; i < 5; i++) {
      s.ellipse(Math.floor(rng() * 600), 320 + Math.floor(rng() * 30), 14 + Math.floor(rng() * 20), 3, withAlpha(hex('#8a9a9a'), 60));
    }
  }
  // lamp post
  s.rect(350, 200, 4, 100, '#3a2a1e');
  s.rect(340, 196, 24, 4, '#3a2a1e');
  hangingLamp(s, 352, 190, 0.6, true);
  addGlow(s, 352, 205, 50, '#ffcf6a', 0.35);
  // fence & plants
  fence(s, 20, 270, 90, 30);
  s.ellipse(120, 270, 16, 10, '#4c5a32');
  s.ellipse(135, 262, 12, 8, '#5f7a3a');
  // bicycle leaning
  s.ellipseOutline(300, 300, 12, 12, '#2a2420');
  s.ellipseOutline(340, 300, 12, 12, '#2a2420');
  s.line(300, 300, 322, 280, '#2a2420');
  s.line(322, 280, 340, 300, '#2a2420');
  s.line(322, 280, 318, 272, '#2a2420');
  s.line(318, 272, 326, 272, '#2a2420');
  // person
  s.ellipse(460, 262, 6, 7, '#8a5a36');
  s.rect(452, 268, 16, 24, '#5a4a3a');
  s.rect(454, 290, 4, 10, '#2a2420');
  s.rect(462, 290, 4, 10, '#2a2420');
  s.poly([[460, 250], [448, 260], [472, 260]], '#c9a86a');
  if (rain) {
    for (let i = 0; i < 240; i++) {
      const x = Math.floor(rng() * 640), y = Math.floor(rng() * 360);
      s.vline(x, y, 6, withAlpha(hex('#aebfc0'), 80));
    }
    grade(s, 0.72, 0.78, 0.86, '#5a6a72', 0.06);
  } else grade(s, 1, 0.98, 0.94);
  vignette(s, 0.75);
  return s;
}

// ------------------------------------------------------------- warehouse ---
export function warehouse() {
  const s = new Surface(640, 360);
  const rng = rngFor('warehouse');
  // roof beams
  s.rect(0, 0, 640, 60, '#2e1e13');
  for (let x = 0; x < 640; x += 80) {
    s.rect(x, 0, 54, 56, '#3a281a');
    s.hline(x, 0, 54, '#4a3524');
    s.hline(x, 55, 54, '#221610');
  }
  // back wall
  plankFloor(s, 0, 56, 640, 210, '#4a3222', rng, 14, true);
  for (let i = 0; i < 30; i++) s.set(Math.floor(rng() * 640), 60 + Math.floor(rng() * 200), sh('#4a3222', 0.85));
  // floor
  plankFloor(s, 0, 266, 640, 94, '#3a2718', rng, 16, false);
  // light shafts
  lightShaft(s, 200, 56, 80, 220, '#ffe6a8', 20);
  lightShaft(s, 480, 56, 60, 220, '#ffe6a8', 16);
  // sacks
  sackPile(s, 30, 290, 5, rng);
  sackPile(s, 110, 290, 4, rng);
  sackPile(s, 430, 290, 6, rng);
  sackPile(s, 530, 290, 4, rng);
  // crates
  cratePile(s, 240, 290, 4, rng);
  cratePile(s, 340, 292, 3, rng);
  // shelf
  shelf(s, 260, 90, 130, 120, '#4a3222', 3, rng, true);
  // hanging scale
  s.vline(200, 60, 40, '#8a6a44');
  s.rect(186, 98, 28, 3, '#8a6238');
  s.line(186, 101, 186, 112, '#8a6238');
  s.line(214, 101, 214, 112, '#8a6238');
  s.ellipse(184, 114, 6, 2, '#c9a86a');
  s.ellipse(216, 114, 6, 2, '#c9a86a');
  dustMotes(s, 640, 300, rng, 60);
  grade(s, 0.92, 0.9, 0.86);
  vignette(s, 0.8);
  return s;
}

// ------------------------------------------------------------------ alley ---
export function alley(mode = 'day') {
  const s = new Surface(640, 360);
  const rng = rngFor('alley' + mode);
  const rain = mode === 'rain';
  vgrad(s, 0, 0, 640, 160, rain ? '#5a6a72' : '#8a9a9a', rain ? '#8a9494' : '#b8b098');
  // left wall
  wallPlaster(s, 0, 40, 240, 260, '#5a4a38', rng);
  for (let y = 40; y < 300; y += 26) s.hline(0, y, 240, sh('#5a4a38', 0.85));
  // right wall
  wallPlaster(s, 400, 30, 240, 270, '#4a3a2c', rng);
  for (let y = 30; y < 300; y += 24) s.hline(400, y, 240, sh('#4a3a2c', 0.82));
  // roofs
  s.poly([[-20, 40], [120, 0], [260, 40]], '#3a2a20');
  s.poly([[380, 30], [520, -10], [660, 30]], '#3a2a20');
  // moss
  for (let i = 0; i < 40; i++) {
    s.set(Math.floor(rng() * 240), 40 + Math.floor(rng() * 260), '#4c5a32');
    s.set(400 + Math.floor(rng() * 240), 30 + Math.floor(rng() * 270), '#4c5a32');
  }
  // door left
  doorFrame(s, 60, 150, 50, 120, '#3a281c');
  // window right
  windowFrame(s, 470, 100, 70, 60, rain ? '#5a6a72' : '#7d8a8c', rng, false);
  // hanging laundry
  s.line(240, 100, 400, 120, '#8a7a62');
  for (let i = 0; i < 5; i++) {
    const x = 260 + i * 28;
    const c = ['#7b5a3e', '#9aa3a3', '#6a5a44', '#a83226', '#5a7a8a'][i];
    s.poly([[x, 108 + i * 2], [x + 16, 110 + i * 2], [x + 14, 140 + i * 2], [x + 2, 138 + i * 2]], c);
    s.hline(x, 108 + i * 2, 16, sh(c, 1.25));
  }
  // path
  s.poly([[240, 360], [400, 360], [360, 200], [280, 200]], '#4a3a2a');
  for (let i = 0; i < 500; i++) {
    const x = 240 + Math.floor(rng() * 160), y = 200 + Math.floor(rng() * 160);
    if (Math.abs(x - 320) < (y - 200) * 0.35 + 40) s.set(x, y, sh('#4a3a2a', 0.7 + rng() * 0.5));
  }
  // bamboo
  bambooCluster(s, 180, 200, rng);
  // cat
  s.ellipse(300, 300, 8, 4, '#8a7a62');
  s.ellipse(306, 296, 4, 4, '#8a7a62');
  s.set(305, 296, '#241711');
  if (rain) {
    for (let i = 0; i < 200; i++) {
      const x = Math.floor(rng() * 640), y = Math.floor(rng() * 360);
      s.vline(x, y, 5, withAlpha(hex('#aebfc0'), 70));
    }
    grade(s, 0.72, 0.78, 0.86, '#5a6a72', 0.08);
  } else grade(s, 0.95, 0.94, 0.9);
  vignette(s, 0.85);
  return s;
}

// ------------------------------------------------------------ poor house ---
export function poorHouse() {
  const s = new Surface(640, 360);
  const rng = rngFor('poorhouse');
  // thatch wall
  thatch(s, 0, 0, 640, 260, '#6a5a3a', rng);
  for (let y = 20; y < 260; y += 30) s.hline(0, y, 640, sh('#6a5a3a', 0.8));
  // bamboo frame
  for (let x = 40; x < 640; x += 120) {
    s.rect(x, 0, 6, 260, '#4a3222');
    s.vline(x + 1, 0, 260, '#6b4a2f');
  }
  s.rect(0, 0, 640, 16, '#3a281c');
  // earthen floor
  s.rect(0, 260, 640, 100, '#4a3a28');
  for (let i = 0; i < 600; i++) s.set(Math.floor(rng() * 640), 260 + Math.floor(rng() * 100), sh('#4a3a28', 0.7 + rng() * 0.5));
  // small window
  s.rect(480, 80, 70, 60, '#2a1e14');
  s.rect(484, 84, 62, 52, '#8a9a9a');
  s.vline(515, 84, 52, '#4a3222');
  s.hline(484, 110, 62, '#4a3222');
  s.frame(480, 80, 70, 60, '#3a281c');
  lightShaft(s, 486, 84, 60, 200, '#ffe6a8', 18);
  // fire
  s.ellipse(320, 300, 26, 8, '#3a2a20');
  for (let i = 0; i < 5; i++) s.ellipse(312 + i * 4, 292 - Math.floor(rng() * 8), 5, 6, i % 2 ? '#e07a2a' : '#ffcf6a');
  s.ellipse(320, 288, 4, 5, '#fff0c0');
  addGlow(s, 320, 292, 90, '#ff9a3a', 0.35);
  // pot on fire
  s.ellipse(320, 280, 18, 5, '#3a2a20');
  s.rect(304, 268, 32, 14, '#4a3222');
  s.ellipse(320, 268, 16, 4, '#3a2a20');
  // hammock
  s.line(60, 140, 160, 230, '#8a7a62');
  s.line(60, 140, 200, 150, '#8a7a62');
  s.line(160, 230, 200, 150, '#8a7a62');
  s.line(80, 155, 180, 205, '#c9b083');
  // jars
  jars(s, 60, 260, 3, rng);
  // child sleeping silhouette
  s.ellipse(430, 250, 16, 6, '#6a5a44');
  s.ellipse(448, 246, 6, 5, '#8a5a36');
  // smoke
  smoke(s, 320, 268, 0.6, rng);
  grade(s, 0.95, 0.9, 0.85, '#c47a55', 0.04);
  vignette(s, 0.85);
  return s;
}

// ------------------------------------------------------------- river dock ---
export function riverDock(mode = 'day') {
  const s = new Surface(640, 360);
  const rng = rngFor('river' + mode);
  const night = mode === 'night';
  const rain = mode === 'rain';
  vgrad(s, 0, 0, 640, 200, night ? '#1a2434' : rain ? '#6a7a82' : '#9aa8a8', night ? '#3a3a4a' : rain ? '#8a9494' : '#d8c9a8');
  // distant shore
  s.rect(0, 180, 640, 30, night ? '#141c26' : '#4a5a4a');
  for (let x = 0; x < 640; x += 30) {
    s.ellipse(x, 180 - Math.floor(rng() * 10), 18, 8, night ? '#101820' : '#3f5527');
  }
  // mist
  for (let i = 0; i < 10; i++) s.ellipse(Math.floor(rng() * 640), 190 + Math.floor(rng() * 20), 50, 6, withAlpha(hex('#c9d0cc'), 30));
  // water
  water(s, 0, 205, 640, 155, rng);
  // reflections
  for (let i = 0; i < 30; i++) s.hline(Math.floor(rng() * 640), 210 + Math.floor(rng() * 140), 8 + Math.floor(rng() * 30), withAlpha(hex('#a8c0b8'), 25));
  // boats
  boat(s, 90, 230, 100, '#5a3d24');
  boat(s, 380, 250, 90, '#4a3222');
  boat(s, 520, 215, 70, '#6b4a2f');
  // dock
  s.rect(0, 300, 300, 60, '#3a2718');
  plankFloor(s, 0, 300, 300, 60, '#3a2718', rng, 12, false);
  for (let x = 0; x < 300; x += 40) s.rect(x, 300, 4, 60, '#2a1c12');
  // sacks on dock
  sackPile(s, 60, 310, 3, rng);
  cratePile(s, 200, 312, 2, rng);
  // pole
  s.rect(290, 200, 5, 160, '#4a3222');
  // person with pole
  s.ellipse(250, 246, 6, 7, '#8a5a36');
  s.rect(242, 252, 16, 24, '#5a4a3a');
  s.rect(244, 274, 4, 10, '#2a2420');
  s.rect(252, 274, 4, 10, '#2a2420');
  s.line(236, 240, 300, 226, '#8a6238');
  s.ellipse(230, 232, 5, 5, '#b08a52');
  s.ellipse(306, 220, 5, 5, '#b08a52');
  // lantern on pole
  if (night) {
    s.ellipse(292, 196, 6, 8, '#ffcf6a');
    addGlow(s, 292, 196, 60, '#ffcf6a', 0.5);
  }
  if (rain) {
    for (let i = 0; i < 220; i++) {
      const x = Math.floor(rng() * 640), y = Math.floor(rng() * 360);
      s.vline(x, y, 5, withAlpha(hex('#aebfc0'), 80));
    }
    grade(s, 0.72, 0.78, 0.86, '#5a6a72', 0.08);
  } else if (night) grade(s, 0.6, 0.66, 0.82, '#2a3a58', 0.12);
  else grade(s, 1, 0.98, 0.94);
  vignette(s, 0.8);
  return s;
}

// ----------------------------------------------------------- staging area ---
export function staging() {
  const s = new Surface(640, 360);
  const rng = rngFor('staging');
  vgrad(s, 0, 0, 640, 220, '#8a9a9a', '#c9c0a8');
  // ground
  s.rect(0, 220, 640, 140, '#5a4a38');
  for (let i = 0; i < 400; i++) s.set(Math.floor(rng() * 640), 220 + Math.floor(rng() * 140), sh('#5a4a38', 0.75 + rng() * 0.5));
  // warehouse wall back
  s.rect(0, 60, 640, 160, '#4a3222');
  plankFloor(s, 0, 60, 640, 160, '#4a3222', rng, 14, true);
  s.rect(0, 60, 640, 12, '#2e1e13');
  // cart
  s.rect(120, 230, 90, 40, '#6b4a2f');
  s.rect(125, 235, 80, 30, '#8a6238');
  s.ellipseOutline(140, 285, 18, 18, '#3a2a1e');
  s.ellipseOutline(140, 285, 14, 14, '#5a3d24');
  s.ellipseOutline(200, 285, 18, 18, '#3a2a1e');
  s.ellipseOutline(200, 285, 14, 14, '#5a3d24');
  s.line(210, 250, 250, 235, '#5a3d24');
  // sacks and crates
  sackPile(s, 300, 290, 6, rng);
  sackPile(s, 420, 292, 4, rng);
  cratePile(s, 520, 290, 4, rng);
  // workers
  const worker = (x, y, shirt, hat) => {
    s.ellipse(x, y - 34, 6, 7, '#8a5a36');
    s.rect(x - 8, y - 28, 16, 22, shirt);
    s.rect(x - 6, y - 6, 4, 10, '#2a2420');
    s.rect(x + 2, y - 6, 4, 10, '#2a2420');
    if (hat) s.poly([[x, y - 44], [x - 12, y - 34], [x + 12, y - 34]], '#c9a86a');
    s.line(x - 10, y - 22, x + 10, y - 22, '#8a5a36');
  };
  worker(380, 280, '#5a4a3a', true);
  worker(470, 285, '#6a5a44', false);
  // smoke
  smoke(s, 80, 210, 0.8, rng);
  grade(s, 1, 0.98, 0.94);
  vignette(s, 0.75);
  return s;
}

// -------------------------------------------------------------- tea stall ---
export function teaStall(mode = 'day') {
  const s = new Surface(640, 360);
  const rng = rngFor('tea' + mode);
  const dusk = mode === 'dusk';
  vgrad(s, 0, 0, 640, 240, dusk ? '#6a5a6a' : '#8a9a9a', dusk ? '#d98a4a' : '#c9c0a8');
  // ground
  s.rect(0, 240, 640, 120, '#5a4a38');
  for (let i = 0; i < 300; i++) s.set(Math.floor(rng() * 640), 240 + Math.floor(rng() * 120), sh('#5a4a38', 0.75 + rng() * 0.5));
  // bamboo frame
  s.rect(180, 80, 8, 200, '#8aa357');
  s.rect(470, 80, 8, 200, '#8aa357');
  s.rect(170, 76, 320, 10, '#6f7f47');
  // thatch roof
  thatchRoof(s, 150, 50, 360, 40, rng);
  // counter
  s.rect(200, 210, 250, 14, '#8a6238');
  s.rect(200, 224, 250, 40, '#6b4a2f');
  for (let x = 200; x < 450; x += 30) s.vline(x, 224, 40, '#4a3222');
  // kettle & cups
  s.ellipse(300, 200, 14, 8, '#b98a3e');
  s.rect(294, 188, 12, 8, '#b98a3e');
  s.rect(292, 186, 16, 4, '#7a5a24');
  s.line(314, 194, 324, 186, '#b98a3e');
  smoke(s, 300, 184, 0.5, rng);
  s.ellipse(340, 208, 5, 2, '#e8e0cc');
  s.ellipse(360, 208, 5, 2, '#e8e0cc');
  s.ellipse(380, 208, 5, 2, '#e8e0cc');
  // stools
  for (let i = 0; i < 4; i++) {
    const x = 220 + i * 55;
    s.rect(x, 260, 26, 6, '#8a6238');
    s.rect(x + 2, 266, 4, 20, '#6b4a2f');
    s.rect(x + 20, 266, 4, 20, '#6b4a2f');
  }
  // customers seated
  const sit = (x, y, shirt) => {
    s.ellipse(x, y - 22, 5, 6, '#8a5a36');
    s.rect(x - 7, y - 16, 14, 18, shirt);
    s.rect(x - 5, y + 2, 4, 10, '#2a2420');
    s.rect(x + 2, y + 2, 4, 10, '#2a2420');
    s.poly([[x, y - 31], [x - 10, y - 23], [x + 10, y - 23]], '#c9a86a');
  };
  sit(238, 270, '#5a4a3a');
  sit(350, 268, '#6a5a44');
  sit(450, 272, '#4a4a3a');
  // bamboo
  bambooCluster(s, 50, 240, rng);
  bambooCluster(s, 580, 250, rng);
  grade(s, dusk ? 0.85 : 1, dusk ? 0.7 : 0.98, dusk ? 0.6 : 0.94, dusk ? '#c47a55' : null, dusk ? 0.08 : 0);
  vignette(s, 0.8);
  return s;
}

// ------------------------------------------------------------- residential ---
export function residential(mode = 'day') {
  const s = new Surface(640, 360);
  const rng = rngFor('residential' + mode);
  const rain = mode === 'rain';
  vgrad(s, 0, 0, 640, 230, rain ? '#5a6a72' : '#8a9a9a', rain ? '#8a9494' : '#c9c0a8');
  // ground
  s.rect(0, 230, 640, 130, '#4a3a2a');
  for (let i = 0; i < 400; i++) s.set(Math.floor(rng() * 640), 230 + Math.floor(rng() * 130), sh('#4a3a2a', 0.7 + rng() * 0.5));
  // huts
  const hut = (x, y, w, h) => {
    thatch(s, x, y, w, h, '#8a7a52', rng);
    s.poly([[x - 14, y], [x + w / 2, y - 34], [x + w + 14, y]], '#6a5a3a');
    for (let i = 0; i < 6; i++) s.line(x - 10 + i * Math.floor((w + 20) / 6), y - 1, x + w / 2, y - 32, '#7a6a44');
    s.rect(x + w / 2 - 8, y + h - 28, 16, 28, '#2a1e14');
    s.rect(x + 10, y + 10, 14, 12, '#2a1e14');
  };
  hut(20, 150, 140, 90);
  hut(220, 170, 120, 70);
  hut(420, 145, 150, 95);
  // fence
  fence(s, 150, 250, 120, 30);
  // trees
  tree(s, 380, 260, 0.8, rng);
  tree(s, 600, 270, 0.6, rng);
  // drying laundry
  s.line(160, 190, 320, 200, '#8a7a62');
  for (let i = 0; i < 4; i++) {
    const x = 175 + i * 32;
    s.poly([[x, 192 + i], [x + 20, 193 + i], [x + 18, 220 + i], [x + 2, 219 + i]], ['#7b5a3e', '#9aa3a3', '#6a5a44', '#a83226'][i]);
  }
  // chickens
  chicken(s, 350, 300, '#c9a86a');
  chicken(s, 380, 310, '#a8864e');
  chicken(s, 330, 320, '#d8c69a');
  // children
  const kid = (x, y, shirt) => {
    s.ellipse(x, y - 20, 5, 5, '#8a5a36');
    s.rect(x - 6, y - 15, 12, 12, shirt);
    s.rect(x - 4, y - 3, 3, 8, '#2a2420');
    s.rect(x + 2, y - 3, 3, 8, '#2a2420');
  };
  kid(300, 320, '#5a6a5a');
  kid(330, 330, '#6a4a44');
  if (rain) {
    for (let i = 0; i < 200; i++) {
      const x = Math.floor(rng() * 640), y = Math.floor(rng() * 360);
      s.vline(x, y, 5, withAlpha(hex('#aebfc0'), 70));
    }
    grade(s, 0.72, 0.78, 0.86, '#5a6a72', 0.08);
  } else grade(s, 1, 0.98, 0.94);
  vignette(s, 0.8);
  return s;
}

// --------------------------------------------------- counter from outside ---
export function counterOutside(mode = 'day') {
  const s = new Surface(640, 360);
  const rng = rngFor('counterout' + mode);
  const night = mode === 'night';
  // street wall
  wallPlaster(s, 0, 0, 640, 360, '#5a4a38', rng);
  for (let y = 0; y < 360; y += 24) s.hline(0, y, 640, sh('#5a4a38', 0.9));
  // window opening
  s.rect(110, 70, 420, 230, '#2a1e14');
  s.rect(120, 80, 400, 210, night ? '#3a2a1e' : '#4a3222');
  // interior visible
  s.rect(120, 80, 400, 210, night ? '#4a3222' : '#6b4a2f');
  for (let i = 0; i < 6; i++) {
    s.rect(130 + i * 64, 100, 54, 160, sh('#6b4a2f', 0.9 + (i % 2) * 0.1));
  }
  // shelves inside
  shelf(s, 130, 100, 160, 120, '#5a3d24', 2, rng, true);
  shelf(s, 350, 100, 150, 120, '#5a3d24', 2, rng, true);
  // counter inside
  s.rect(120, 240, 400, 50, '#4a3222');
  s.hline(120, 240, 400, '#7a5330');
  s.rect(130, 232, 380, 10, '#8a6238');
  // lamp inside
  oilLamp(s, 320, 222, true);
  addGlow(s, 320, 220, 90, '#ffcf6a', 0.4);
  // wooden shutter frame
  s.rect(100, 60, 440, 16, '#4a3222');
  s.rect(100, 294, 440, 16, '#4a3222');
  s.rect(100, 60, 16, 250, '#4a3222');
  s.rect(524, 60, 16, 250, '#4a3222');
  s.rect(100, 60, 440, 4, '#6b4a2f');
  s.rect(100, 306, 440, 4, '#6b4a2f');
  // open shutters
  s.poly([[60, 70], [110, 76], [110, 296], [60, 302]], '#5a3d24');
  for (let i = 0; i < 4; i++) s.line(64, 80 + i * 55, 108, 84 + i * 55, '#4a3222');
  s.poly([[534, 76], [590, 70], [590, 302], [534, 296]], '#5a3d24');
  for (let i = 0; i < 4; i++) s.line(536, 84 + i * 55, 586, 80 + i * 55, '#4a3222');
  // hanging sign above
  signBoard(s, 230, 10, 180, 34, '#e6d3a3');
  s.rect(248, 18, 144, 4, withAlpha(hex('#8a3a2a'), 160));
  s.rect(260, 28, 120, 4, withAlpha(hex('#8a3a2a'), 130));
  // person outside silhouette
  s.ellipse(620, 300, 6, 7, '#8a5a36');
  s.rect(612, 306, 16, 24, '#5a4a3a');
  grade(s, night ? 0.65 : 0.95, night ? 0.7 : 0.93, night ? 0.85 : 0.88);
  vignette(s, 0.8);
  return s;
}

// --------------------------------------------------------------- title art --
export function titleArt() {
  const s = new Surface(640, 360);
  const rng = rngFor('title');
  // dusk sky
  vgrad(s, 0, 0, 640, 260, '#2a3450', '#c47a55');
  for (let i = 0; i < 8; i++) {
    s.ellipse(Math.floor(rng() * 640), 40 + Math.floor(rng() * 160), 40, 6, withAlpha(hex('#e8c0a0'), 40));
  }
  // moon
  s.ellipse(520, 60, 18, 18, '#f2e6c8');
  s.ellipse(526, 56, 14, 14, '#c47a55');
  // distant roofs
  for (let x = -10; x < 650; x += 56) {
    const h = 36 + Math.floor(rng() * 34);
    s.rect(x, 260 - h, 56, h, '#1e1a22');
    s.poly([[x - 6, 260 - h], [x + 28, 260 - h - 20], [x + 62, 260 - h]], '#17141c');
  }
  // trees
  tree(s, 100, 270, 1.1, rng);
  tree(s, 590, 280, 0.9, rng);
  // ground
  s.rect(0, 260, 640, 100, '#241a16');
  for (let i = 0; i < 300; i++) s.set(Math.floor(rng() * 640), 260 + Math.floor(rng() * 100), sh('#241a16', 0.7 + rng() * 0.5));
  // shop facade right
  s.rect(360, 120, 240, 160, '#3a2a20');
  plankFloor(s, 360, 120, 240, 160, '#3a2a20', rng, 12, true);
  s.poly([[340, 122], [480, 40], [620, 122]], '#2a1e18');
  roofTiles(s, 340, 122, 280, 18, rng);
  // sign
  signBoard(s, 400, 130, 160, 34, '#5a3d24');
  // window light
  s.rect(420, 190, 80, 70, '#2a1e14');
  s.rect(424, 194, 72, 62, '#ffcf6a');
  s.rect(424, 194, 72, 62, withAlpha(hex('#ffdf9a'), 100));
  s.vline(460, 194, 62, '#5a3d24');
  s.hline(424, 224, 72, '#5a3d24');
  s.frame(420, 190, 80, 70, '#3a281c');
  addGlow(s, 460, 224, 130, '#ffcf6a', 0.45);
  // door
  doorFrame(s, 520, 190, 50, 90, '#2a1e14');
  hangingLamp(s, 510, 180, 0.8, true);
  addGlow(s, 510, 196, 70, '#ffcf6a', 0.45);
  // awning
  s.poly([[400, 180], [580, 180], [590, 190], [390, 190]], '#8a6a44');
  for (let i = 0; i < 9; i++) s.line(400 + i * 20, 180, 392 + i * 20, 190, '#a8864e');
  // counter goods silhouette
  s.ellipse(400, 200, 14, 6, '#6b4a2f');
  // figure walking
  s.ellipse(280, 232, 6, 7, '#8a5a36');
  s.rect(272, 238, 16, 26, '#4a3a2c');
  s.rect(274, 262, 4, 12, '#241a16');
  s.rect(282, 262, 4, 12, '#241a16');
  s.poly([[280, 220], [268, 230], [292, 230]], '#c9a86a');
  // fireflies
  for (let i = 0; i < 24; i++) {
    s.set(Math.floor(rng() * 640), 180 + Math.floor(rng() * 170), withAlpha(hex('#ffe6a8'), 60 + Math.floor(rng() * 120)));
  }
  vignette(s, 0.9);
  return s;
}

export const SCENES = [
  { id: 'shop', fn: () => shopInterior('day'), name: 'Tiệm tạp hóa' },
  { id: 'shop_dusk', fn: () => shopInterior('dusk'), name: 'Tiệm — chiều tối' },
  { id: 'shop_night', fn: () => shopInterior('night'), name: 'Tiệm — đêm' },
  { id: 'shop_rain', fn: () => shopInterior('rain'), name: 'Tiệm — trời mưa' },
  { id: 'shop_exterior', fn: () => shopExterior('dusk'), name: 'Ngoài tiệm — hoàng hôn' },
  { id: 'shop_exterior_night', fn: () => shopExterior('night'), name: 'Ngoài tiệm — đêm' },
  { id: 'shop_exterior_rain', fn: () => shopExterior('rain'), name: 'Ngoài tiệm — mưa' },
  { id: 'market', fn: () => market('day'), name: 'Chợ quê' },
  { id: 'market_dusk', fn: () => market('dusk'), name: 'Chợ quê — chiều' },
  { id: 'street', fn: () => street('day'), name: 'Con phố nhỏ' },
  { id: 'street_rain', fn: () => street('rain'), name: 'Con phố — mưa' },
  { id: 'warehouse', fn: () => warehouse(), name: 'Kho hàng' },
  { id: 'alley', fn: () => alley('day'), name: 'Con ngõ' },
  { id: 'alley_rain', fn: () => alley('rain'), name: 'Con ngõ — mưa' },
  { id: 'poor_house', fn: () => poorHouse(), name: 'Nhà tranh' },
  { id: 'river_dock', fn: () => riverDock('day'), name: 'Bến sông' },
  { id: 'river_dock_night', fn: () => riverDock('night'), name: 'Bến sông — đêm' },
  { id: 'river_dock_rain', fn: () => riverDock('rain'), name: 'Bến sông — mưa' },
  { id: 'staging', fn: () => staging(), name: 'Khu tập kết' },
  { id: 'tea_stall', fn: () => teaStall('day'), name: 'Quán nước' },
  { id: 'tea_stall_dusk', fn: () => teaStall('dusk'), name: 'Quán nước — chiều' },
  { id: 'residential', fn: () => residential('day'), name: 'Khu dân cư' },
  { id: 'residential_rain', fn: () => residential('rain'), name: 'Khu dân cư — mưa' },
  { id: 'counter_outside', fn: () => counterOutside('day'), name: 'Qua ô cửa bán hàng' },
  { id: 'counter_outside_night', fn: () => counterOutside('night'), name: 'Qua ô cửa — đêm' },
  { id: 'title', fn: () => titleArt(), name: 'Title' },
];
