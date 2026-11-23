// UI kit: wood & parchment panels, buttons, slots, icons (authored 1x, exported 2x).
import { Surface, hex, mul, mix, withAlpha, rngFor } from '../lib/pixel.mjs';
import { PAL, roundRect, vgrad, paperSheet } from '../lib/draw.mjs';

const C = (x) => hex(x);
const sh = (c, f) => mul(C(c), f);
const S2 = (s) => s.scale(2);

function woodPanel(w = 96, h = 96, dark = false) {
  const s = new Surface(w, h);
  const rng = rngFor('woodpanel' + w + dark);
  const base = dark ? '#3a2718' : '#5a3d24';
  const light = dark ? '#5a3d24' : '#7a5330';
  const darkc = dark ? '#241708' : '#3a2718';
  s.rect(0, 0, w, h, base);
  // planks
  for (let y = 0; y < h; y += 8) {
    s.hline(0, y, w, sh(base, 0.78));
    s.hline(0, y + 1, w, sh(base, 1.12));
  }
  for (let i = 0; i < w * h * 0.02; i++) {
    const x = Math.floor(rng() * w), y = Math.floor(rng() * h);
    s.set(x, y, rng() < 0.5 ? sh(base, 1.14) : sh(base, 0.8));
  }
  // inner bevel
  s.frame(3, 3, w - 6, h - 6, sh(base, 1.25));
  s.frame(4, 4, w - 8, h - 8, sh(base, 0.7));
  // outer frame
  s.frame(0, 0, w, h, '#2a1c12');
  s.frame(1, 1, w - 2, h - 2, '#8a6238');
  s.frame(2, 2, w - 4, h - 4, '#4a3222');
  // corner studs
  for (const [x, y] of [[6, 6], [w - 7, 6], [6, h - 7], [w - 7, h - 7]]) {
    s.rect(x, y, 2, 2, '#b98a3e');
    s.set(x, y, '#e0b862');
    s.set(x + 1, y + 1, '#7a5a24');
  }
  // subtle inner vignette
  for (let i = 0; i < 4; i++) {
    s.frame(6 + i, 6 + i, w - 12 - i * 2, h - 12 - i * 2, withAlpha(hex(darkc), 10 + i * 6));
  }
  return s;
}

function paperPanel(w = 96, h = 96) {
  const s = new Surface(w, h);
  const rng = rngFor('paperpanel' + w);
  s.rect(0, 0, w, h, '#e6d3a3');
  for (let i = 0; i < w * h * 0.05; i++) {
    const x = Math.floor(rng() * w), y = Math.floor(rng() * h);
    s.set(x, y, rng() < 0.5 ? '#dcc79a' : '#f0e2bd');
  }
  // fiber lines
  for (let i = 0; i < 30; i++) {
    const y = Math.floor(rng() * h);
    s.hline(Math.floor(rng() * w * 0.4), y, 6 + Math.floor(rng() * 20), withAlpha(hex('#c9b07a'), 60));
  }
  // torn edge shading
  s.hline(0, 0, w, '#f4e6c4');
  s.hline(0, 1, w, '#cbb488');
  s.hline(0, h - 1, w, '#b9a273');
  s.hline(0, h - 2, w, '#d8c49a');
  s.vline(0, 0, h, '#cbb488');
  s.vline(w - 1, 0, h, '#c9b07a');
  // stains
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(rng() * w), y = Math.floor(rng() * h);
    s.ellipse(x, y, 4 + Math.floor(rng() * 8), 3 + Math.floor(rng() * 6), withAlpha(hex('#b9a273'), 30));
  }
  // stitched border
  for (let x = 4; x < w - 4; x += 5) {
    s.set(x, 3, '#8a6a44');
    s.set(x, h - 4, '#8a6a44');
  }
  for (let y = 4; y < h - 4; y += 5) {
    s.set(3, y, '#8a6a44');
    s.set(w - 4, y, '#8a6a44');
  }
  return s;
}

function button(w = 120, h = 32, state = 'normal') {
  const s = new Surface(w, h);
  const base = state === 'disabled' ? '#4a4038' : state === 'hover' ? '#8a6238' : '#6b4a2f';
  const top = state === 'disabled' ? '#5a4f46' : '#9a6d40';
  const bottom = state === 'disabled' ? '#3a322c' : '#4a3222';
  roundRect(s, 1, 1, w - 2, h - 2, 4, base);
  // bevel
  s.hline(3, 1, w - 6, sh(top, state === 'disabled' ? 0.9 : 1.15));
  s.hline(3, 2, w - 6, top);
  s.hline(3, h - 3, w - 6, bottom);
  s.hline(3, h - 2, w - 6, sh(bottom, 0.7));
  s.vline(1, 4, h - 8, sh(base, 1.15));
  s.vline(w - 2, 4, h - 8, sh(base, 0.7));
  // wood grain
  for (let i = 0; i < w * 0.6; i++) {
    const x = 4 + Math.floor(Math.random() * (w - 8)), y = 4 + Math.floor(Math.random() * (h - 8));
    s.set(x, y, sh(base, 0.9 + Math.random() * 0.2));
  }
  // highlight band
  s.hline(4, 5, w - 8, withAlpha(hex('#e0b862'), state === 'disabled' ? 20 : 45));
  // outline
  s.frame(0, 0, w, h, '#241711');
  s.frame(1, 1, w - 2, h - 2, state === 'disabled' ? '#5a5048' : '#8a6238');
  return s;
}

function slot(size = 48, state = 'normal') {
  const s = new Surface(size, size);
  const base = state === 'selected' ? '#8a6238' : state === 'hover' ? '#5a3d24' : '#3a2718';
  s.rect(1, 1, size - 2, size - 2, base);
  // bevel
  s.hline(1, 1, size - 2, state === 'selected' ? '#c1935a' : '#6b4a2f');
  s.hline(1, 2, size - 2, sh(base, 1.18));
  s.hline(1, size - 3, size - 2, sh(base, 0.6));
  s.vline(1, 1, size - 2, sh(base, 1.1));
  s.vline(size - 2, 1, size - 2, sh(base, 0.65));
  s.frame(0, 0, size, size, '#241711');
  // inner shadow
  s.frame(3, 3, size - 6, size - 6, withAlpha(hex('#120c08'), 60));
  if (state === 'locked') {
    for (let i = 0; i < size - 8; i += 3) {
      s.set(4 + i, 4, withAlpha(hex('#8a8278'), 90));
      s.set(4 + i, size - 5, withAlpha(hex('#8a8278'), 90));
    }
    s.rect(6, 6, 3, 3, '#8a8278');
  }
  return s;
}

function portraitFrame(size = 104) {
  const s = new Surface(size, size);
  s.rect(0, 0, size, size, '#241711');
  s.frame(1, 1, size - 2, size - 2, '#8a6238');
  s.frame(2, 2, size - 4, size - 4, '#5a3d24');
  s.frame(3, 3, size - 6, size - 6, '#b98a3e');
  // corner ornaments
  for (const [x, y] of [[4, 4], [size - 7, 4], [4, size - 7], [size - 7, size - 7]]) {
    s.rect(x, y, 3, 3, '#d9a441');
    s.set(x, y, '#f0c86a');
  }
  s.rect(8, 8, size - 16, size - 16, withAlpha(hex('#241711'), 255));
  return s;
}

// ---------------------------------------------------------------- icons ----
function iconSurface() { return new Surface(32, 32); }

const ICONS = {
  tab_inventory(s) {
    s.rect(5, 8, 22, 19, '#8a6238');
    s.rect(6, 9, 20, 17, '#b08a52');
    s.rect(6, 9, 20, 4, '#c9a86a');
    s.rect(13, 9, 6, 17, '#7a5330');
    s.rect(15, 16, 2, 5, '#d9a441');
    s.frame(5, 8, 22, 19, '#241711');
  },
  tab_ledger(s) {
    s.rect(5, 6, 22, 21, '#7a3a2a');
    s.rect(7, 8, 18, 17, '#e8dcc0');
    s.vline(9, 8, 17, '#b9a273');
    for (let i = 0; i < 4; i++) s.hline(11, 10 + i * 4, 12, '#8a6a44');
    s.frame(5, 6, 22, 21, '#241711');
  },
  tab_suppliers(s) {
    s.rect(4, 14, 24, 10, '#8a6238');
    s.rect(5, 15, 22, 8, '#b08a52');
    s.ellipseOutline(9, 26, 3, 3, '#241711');
    s.ellipseOutline(23, 26, 3, 3, '#241711');
    s.rect(8, 6, 14, 8, '#a8864e');
    s.hline(8, 6, 14, '#c9a86a');
    s.frame(4, 6, 24, 20, '#241711');
  },
  tab_quests(s) {
    s.rect(7, 5, 18, 22, '#e6d3a3');
    s.rect(8, 6, 16, 20, '#f0e2bd');
    for (let i = 0; i < 4; i++) s.hline(10, 9 + i * 4, 12, '#a8864e');
    s.ellipse(22, 24, 4, 4, '#a83226');
    s.set(21, 23, '#e6d3a3');
    s.frame(7, 5, 18, 22, '#241711');
  },
  tab_journal(s) {
    s.rect(6, 7, 20, 19, '#e6d3a3');
    s.rect(7, 8, 18, 17, '#f0e2bd');
    for (let i = 0; i < 5; i++) s.hline(9, 11 + i * 3, 14, '#b9a273');
    s.line(18, 4, 26, 2, '#3a2a1c');
    s.line(18, 4, 22, 8, '#3a2a1c');
    s.set(26, 2, '#d9a441');
    s.frame(6, 7, 20, 19, '#241711');
  },
  tab_shop(s) {
    s.poly([[3, 14], [16, 3], [29, 14]], '#8a4630');
    s.poly([[5, 14], [16, 5], [27, 14]], '#a95f42');
    s.rect(6, 14, 20, 14, '#c9b083');
    s.rect(13, 19, 6, 9, '#5a3d24');
    s.rect(8, 17, 4, 4, '#ffdf9a');
    s.rect(20, 17, 4, 4, '#ffdf9a');
    s.frame(6, 14, 20, 14, '#241711');
    s.line(3, 14, 29, 14, '#241711');
  },
  tab_map(s) {
    s.poly([[5, 7], [12, 4], [20, 8], [27, 5], [27, 25], [20, 28], [12, 24], [5, 27]], '#d8c9a8');
    s.line(8, 20, 13, 14, '#8a4a32');
    s.line(13, 14, 19, 18, '#8a4a32');
    s.line(19, 18, 24, 10, '#8a4a32');
    s.ellipse(22, 20, 3, 3, '#a83226');
    s.set(22, 19, '#f0e2bd');
    s.outline('#241711', true);
  },
  tab_save(s) {
    s.rect(5, 6, 22, 21, '#3a4a58');
    s.rect(6, 7, 20, 19, '#586b7a');
    s.rect(9, 9, 14, 6, '#c9cfd2');
    s.rect(17, 10, 3, 4, '#3a4a58');
    s.rect(9, 18, 14, 6, '#c9cfd2');
    s.frame(5, 6, 22, 21, '#241711');
  },
  tab_settings(s) {
    s.ellipse(16, 16, 11, 11, '#8a8278');
    s.ellipse(16, 16, 5, 5, '#3a3228');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      s.rect(Math.round(16 + Math.cos(a) * 12) - 2, Math.round(16 + Math.sin(a) * 12) - 2, 4, 4, '#a8a098');
    }
    s.ellipseOutline(16, 16, 11, 11, '#241711');
    s.ellipseOutline(16, 16, 5, 5, '#241711');
  },
  tab_help(s) {
    s.ellipse(16, 16, 13, 13, '#c9b083');
    s.ellipse(16, 16, 10, 10, '#e6d3a3');
    s.rect(14, 9, 4, 3, '#3a2a1c');
    s.rect(14, 12, 3, 6, '#3a2a1c');
    s.rect(14, 20, 4, 3, '#3a2a1c');
    s.ellipseOutline(16, 16, 13, 13, '#241711');
  },
  action_buy(s) {
    s.rect(7, 12, 18, 14, '#8a6238');
    s.rect(8, 13, 16, 12, '#b08a52');
    s.line(16, 3, 16, 14, '#5d7a3a');
    s.poly([[12, 9], [16, 15], [20, 9]], '#5d7a3a');
    s.frame(7, 12, 18, 14, '#241711');
  },
  action_sell(s) {
    s.rect(7, 12, 18, 14, '#8a6238');
    s.rect(8, 13, 16, 12, '#b08a52');
    s.line(16, 15, 16, 4, '#a83226');
    s.poly([[12, 9], [16, 3], [20, 9]], '#a83226');
    s.frame(7, 12, 18, 14, '#241711');
  },
  action_confirm(s) {
    s.line(6, 17, 13, 25, '#5d7a3a');
    s.line(13, 25, 27, 7, '#5d7a3a');
    s.line(7, 17, 13, 24, '#8aa357');
    s.line(14, 24, 27, 7, '#8aa357');
  },
  action_cancel(s) {
    s.line(7, 7, 25, 25, '#a83226');
    s.line(8, 7, 26, 25, '#c4513f');
    s.line(25, 7, 7, 25, '#a83226');
    s.line(26, 7, 8, 25, '#c4513f');
  },
  action_sort(s) {
    s.rect(6, 6, 4, 20, '#c9b083');
    s.rect(13, 10, 4, 16, '#c9b083');
    s.rect(20, 14, 4, 12, '#c9b083');
    s.poly([[23, 4], [29, 10], [23, 16]], '#d9a441');
  },
  action_filter(s) {
    s.poly([[4, 6], [28, 6], [19, 17], [19, 27], [13, 24], [13, 17]], '#c9b083');
    s.poly([[6, 8], [26, 8], [18, 16], [18, 24], [14, 22], [14, 16]], '#8a6a44');
  },
  action_search(s) {
    s.ellipseOutline(14, 14, 8, 8, '#c9cfd2');
    s.ellipseOutline(14, 14, 6, 6, '#8e979c');
    s.line(20, 20, 28, 28, '#c9cfd2');
    s.line(21, 20, 29, 28, '#8e979c');
  },
  action_close(s) {
    s.line(9, 9, 23, 23, '#a83226');
    s.line(10, 9, 24, 23, '#c4513f');
    s.line(23, 9, 9, 23, '#a83226');
    s.line(24, 9, 10, 23, '#c4513f');
  },
  action_next(s) {
    s.poly([[8, 5], [24, 16], [8, 27]], '#c9b083');
    s.poly([[11, 9], [20, 16], [11, 23]], '#e6d3a3');
  },
  action_prev(s) {
    s.poly([[24, 5], [8, 16], [24, 27]], '#c9b083');
    s.poly([[21, 9], [12, 16], [21, 23]], '#e6d3a3');
  },
  action_pause(s) {
    s.rect(8, 6, 6, 20, '#c9b083');
    s.rect(18, 6, 6, 20, '#c9b083');
  },
  action_play(s) {
    s.poly([[9, 5], [27, 16], [9, 27]], '#c9b083');
  },
  action_fast(s) {
    s.poly([[5, 6], [17, 16], [5, 26]], '#c9b083');
    s.poly([[17, 6], [29, 16], [17, 26]], '#c9b083');
  },
  currency(s) {
    s.ellipse(16, 16, 12, 12, '#d9a441');
    s.ellipse(15, 15, 9, 9, '#f0c86a');
    s.rect(13, 13, 6, 6, '#8a6220');
    s.set(14, 14, '#d9a441');
    s.ellipseOutline(16, 16, 12, 12, '#7a5a24');
  },
  star(s) {
    s.poly([[16, 3], [20, 12], [29, 13], [22, 19], [24, 28], [16, 23], [8, 28], [10, 19], [3, 13], [12, 12]], '#d9a441');
    s.poly([[16, 7], [18, 13], [24, 14], [19, 18], [20, 24], [16, 21], [12, 24], [13, 18], [8, 14], [14, 13]], '#f0c86a');
  },
  heart(s) {
    s.ellipse(11, 12, 6, 5, '#a83226');
    s.ellipse(21, 12, 6, 5, '#a83226');
    s.poly([[5, 14], [16, 28], [27, 14]], '#a83226');
    s.ellipse(12, 11, 3, 2, '#c4513f');
    s.outline('#5a1a14', true);
  },
  clock(s) {
    s.ellipse(16, 16, 13, 13, '#e6d3a3');
    s.ellipse(16, 16, 10, 10, '#f0e2bd');
    s.line(16, 16, 16, 8, '#3a2a1c');
    s.line(16, 16, 22, 18, '#3a2a1c');
    s.ellipseOutline(16, 16, 13, 13, '#241711');
  },
  weather_sun(s) {
    s.ellipse(16, 16, 7, 7, '#f0c86a');
    s.ellipse(16, 16, 4, 4, '#ffe6a8');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      s.line(Math.round(16 + Math.cos(a) * 9), Math.round(16 + Math.sin(a) * 9), Math.round(16 + Math.cos(a) * 13), Math.round(16 + Math.sin(a) * 13), '#d9a441');
    }
  },
  weather_rain(s) {
    s.ellipse(13, 12, 7, 5, '#8a9494');
    s.ellipse(20, 12, 6, 4, '#a8b0ac');
    s.ellipse(16, 14, 8, 4, '#7a8280');
    for (let i = 0; i < 4; i++) s.line(9 + i * 5, 20, 7 + i * 5, 27, '#7d9a9a');
  },
  weather_cloud(s) {
    s.ellipse(13, 14, 7, 5, '#a8b0ac');
    s.ellipse(20, 13, 6, 4, '#c9cfd2');
    s.ellipse(16, 16, 8, 4, '#8a9494');
  },
  weather_night(s) {
    s.ellipse(18, 14, 9, 9, '#e8e0cc');
    s.ellipse(22, 11, 8, 8, '#3a4a68');
    s.set(8, 8, '#e8e0cc'); s.set(10, 5, '#e8e0cc'); s.set(6, 14, '#e8e0cc');
  },
  weather_storm(s) {
    s.ellipse(13, 11, 7, 5, '#6a7478');
    s.ellipse(20, 10, 6, 4, '#8a9494');
    s.ellipse(16, 13, 8, 4, '#5a6468');
    s.poly([[15, 15], [11, 22], [15, 22], [12, 29], [20, 20], [16, 20], [19, 15]], '#f0c86a');
  },
  category_food(s) {
    s.rect(9, 12, 14, 14, '#c9b083');
    s.rect(10, 13, 12, 12, '#d8c69a');
    s.hline(10, 13, 12, '#f0e2bd');
    s.rect(14, 9, 4, 4, '#a8864e');
    s.frame(9, 12, 14, 14, '#241711');
    for (let i = 0; i < 5; i++) s.set(11 + i * 2, 18, '#8a6a44');
  },
  category_household(s) {
    s.ellipse(16, 18, 11, 6, '#b9a98c');
    s.ellipse(16, 17, 9, 4, '#d8c9a8');
    s.rect(7, 18, 18, 4, '#b9a98c');
    s.outline('#241711', true);
  },
  category_materials(s) {
    s.rect(6, 13, 20, 8, '#8a6238');
    s.hline(6, 13, 20, '#c1935a');
    s.hline(6, 20, 20, '#5a3d24');
    for (let i = 0; i < 4; i++) s.set(9 + i * 5, 16, '#5a3d24');
    s.frame(6, 13, 20, 8, '#241711');
  },
  category_medicine(s) {
    s.rect(12, 6, 8, 4, '#3a2a1c');
    s.rect(9, 10, 14, 16, '#8a5a34');
    s.rect(10, 11, 12, 14, '#a06a3e');
    s.vline(11, 12, 12, '#c98a58');
    s.rect(12, 15, 8, 6, '#e8dcc0');
    s.rect(14, 16, 4, 4, '#a83226');
    s.outline('#241711', true);
  },
  category_valuables(s) {
    s.poly([[16, 4], [27, 14], [16, 28], [5, 14]], '#d9a441');
    s.poly([[16, 4], [27, 14], [16, 18]], '#f0c86a');
    s.poly([[5, 14], [16, 28], [16, 18]], '#b98a3e');
    s.set(14, 11, '#fff2cc');
    s.outline('#241711', true);
  },
  category_special(s) {
    s.rect(7, 6, 18, 22, '#e6d3a3');
    s.rect(8, 7, 16, 20, '#f0e2bd');
    for (let i = 0; i < 4; i++) s.hline(10, 10 + i * 4, 12, '#a8864e');
    s.ellipse(22, 22, 4, 4, '#a83226');
    s.outline('#241711', true);
  },
  status_neutral(s) {
    s.ellipse(16, 16, 12, 12, '#d19b6c');
    s.rect(13, 13, 2, 2, '#241711');
    s.rect(19, 13, 2, 2, '#241711');
    s.hline(14, 21, 5, '#8a3a32');
    s.ellipseOutline(16, 16, 12, 12, '#241711');
  },
  status_happy(s) {
    s.ellipse(16, 16, 12, 12, '#d19b6c');
    s.line(11, 13, 14, 11, '#241711'); s.line(14, 11, 17, 13, '#241711');
    s.line(19, 13, 22, 11, '#241711'); s.line(22, 11, 25, 13, '#241711');
    s.line(12, 20, 16, 24, '#8a3a32'); s.line(16, 24, 20, 20, '#8a3a32');
    s.ellipseOutline(16, 16, 12, 12, '#241711');
  },
  status_sad(s) {
    s.ellipse(16, 16, 12, 12, '#d19b6c');
    s.line(11, 12, 14, 14, '#241711'); s.line(19, 14, 22, 12, '#241711');
    s.line(13, 23, 19, 21, '#8a3a32');
    s.ellipseOutline(16, 16, 12, 12, '#241711');
  },
  status_angry(s) {
    s.ellipse(16, 16, 12, 12, '#d19b6c');
    s.line(10, 11, 15, 14, '#241711'); s.line(22, 14, 27, 11, '#241711');
    s.rect(12, 16, 3, 2, '#241711'); s.rect(19, 16, 3, 2, '#241711');
    s.hline(13, 23, 7, '#6a2a24');
    s.ellipseOutline(16, 16, 12, 12, '#241711');
  },
  icon_credit(s) {
    s.rect(5, 7, 22, 18, '#e6d3a3');
    s.rect(6, 8, 20, 16, '#f0e2bd');
    s.hline(8, 11, 12, '#8a6a44');
    s.hline(8, 14, 16, '#b9a273');
    s.ellipse(22, 21, 4, 4, '#a83226');
    s.set(21, 20, '#f0e2bd');
    s.outline('#241711', true);
  },
  icon_debt(s) {
    s.rect(5, 7, 22, 18, '#e6d3a3');
    s.rect(6, 8, 20, 16, '#f0e2bd');
    s.hline(8, 11, 12, '#8a6a44');
    s.hline(8, 14, 16, '#b9a273');
    s.line(14, 17, 22, 25, '#a83226');
    s.line(22, 17, 14, 25, '#a83226');
    s.outline('#241711', true);
  },
  icon_gift(s) {
    s.rect(6, 13, 20, 14, '#a83226');
    s.rect(7, 14, 18, 12, '#c4513f');
    s.rect(14, 13, 4, 14, '#e6d3a3');
    s.rect(6, 11, 20, 4, '#8a3a2a');
    s.ellipse(12, 9, 4, 3, '#e6d3a3');
    s.ellipse(20, 9, 4, 3, '#e6d3a3');
    s.frame(6, 11, 20, 16, '#241711');
  },
  icon_barter(s) {
    s.line(5, 11, 22, 11, '#5d7a3a');
    s.poly([[19, 7], [25, 11], [19, 15]], '#5d7a3a');
    s.line(27, 21, 10, 21, '#a83226');
    s.poly([[13, 17], [7, 21], [13, 25]], '#a83226');
  },
  icon_warning(s) {
    s.poly([[16, 4], [29, 27], [3, 27]], '#d9a441');
    s.poly([[16, 8], [26, 25], [6, 25]], '#f0c86a');
    s.rect(15, 13, 3, 8, '#3a2a1c');
    s.rect(15, 22, 3, 2, '#3a2a1c');
    s.outline('#241711', true);
  },
  icon_info(s) {
    s.ellipse(16, 16, 13, 13, '#5a7a8a');
    s.ellipse(16, 16, 10, 10, '#7d9a9a');
    s.rect(14, 8, 4, 3, '#e8e0cc');
    s.rect(14, 12, 4, 11, '#e8e0cc');
    s.ellipseOutline(16, 16, 13, 13, '#241711');
  },
  icon_arrow_right(s) {
    s.line(4, 16, 24, 16, '#c9b083');
    s.poly([[20, 9], [29, 16], [20, 23]], '#e6d3a3');
  },
  icon_arrow_left(s) {
    s.line(28, 16, 8, 16, '#c9b083');
    s.poly([[12, 9], [3, 16], [12, 23]], '#e6d3a3');
  },
  icon_plus(s) {
    s.rect(14, 6, 4, 20, '#c9b083');
    s.rect(6, 14, 20, 4, '#c9b083');
  },
  icon_minus(s) {
    s.rect(6, 14, 20, 4, '#c9b083');
  },
  icon_lock(s) {
    s.rect(9, 14, 14, 13, '#8a8278');
    s.rect(10, 15, 12, 11, '#a8a098');
    s.rect(12, 7, 8, 8, '#6a625a');
    s.rect(13, 8, 6, 6, '#3a3228');
    s.set(15, 18, '#3a3228'); s.set(16, 21, '#3a3228');
    s.outline('#241711', true);
  },
  icon_check(s) {
    s.line(6, 17, 13, 25, '#5d7a3a');
    s.line(13, 25, 27, 7, '#8aa357');
  },
  icon_split(s) {
    s.rect(8, 8, 7, 16, '#c9b083');
    s.rect(18, 8, 7, 16, '#c9b083');
    s.line(16, 4, 16, 28, '#8a6a44');
  },
  icon_merge(s) {
    s.rect(5, 8, 7, 16, '#c9b083');
    s.rect(20, 8, 7, 16, '#c9b083');
    s.line(12, 16, 20, 16, '#8a6a44');
    s.poly([[18, 12], [23, 16], [18, 20]], '#8a6a44');
  },
  icon_star_empty(s) {
    s.poly([[16, 3], [20, 12], [29, 13], [22, 19], [24, 28], [16, 23], [8, 28], [10, 19], [3, 13], [12, 12]], '#4a3a2c');
    s.poly([[16, 6], [18, 13], [25, 14], [20, 18], [21, 24], [16, 21], [11, 24], [12, 18], [7, 14], [14, 13]], '#241711');
  },
};

function divider() {
  const s = new Surface(200, 12);
  s.hline(0, 6, 200, '#8a6238');
  s.hline(0, 5, 200, '#b98a3e');
  s.hline(0, 7, 200, '#4a3222');
  s.ellipse(100, 6, 5, 4, '#d9a441');
  s.set(99, 4, '#f0c86a');
  s.ellipse(96, 6, 2, 2, '#b98a3e');
  s.ellipse(104, 6, 2, 2, '#b98a3e');
  return s;
}

function plaque(w = 140, h = 34) {
  const s = new Surface(w, h);
  roundRect(s, 1, 1, w - 2, h - 2, 4, '#3a2718');
  s.hline(3, 1, w - 6, '#7a5330');
  s.hline(3, h - 3, w - 6, '#241708');
  s.frame(0, 0, w, h, '#241711');
  s.frame(1, 1, w - 2, h - 2, '#b98a3e');
  for (const [x, y] of [[4, 4], [w - 6, 4], [4, h - 6], [w - 6, h - 6]]) {
    s.rect(x, y, 2, 2, '#d9a441');
  }
  return s;
}

function cursorNormal() {
  const s = new Surface(24, 24);
  s.poly([[4, 2], [18, 14], [11, 15], [14, 22], [10, 23], [8, 16], [4, 20]], '#241711');
  s.poly([[6, 5], [15, 14], [10, 14], [12, 20], [10, 20], [8, 14], [6, 17]], '#e6d3a3');
  s.outline('#241711', true);
  return s;
}

function cursorPointer() {
  const s = new Surface(24, 24);
  s.rect(9, 4, 6, 14, '#e6d3a3');
  s.rect(7, 10, 10, 10, '#e6d3a3');
  s.rect(11, 18, 2, 4, '#e6d3a3');
  s.outline('#241711', true);
  return s;
}

function cursorGrab() {
  const s = new Surface(24, 24);
  for (let i = 0; i < 4; i++) s.rect(5 + i * 4, 7, 3, 10, '#e6d3a3');
  s.rect(5, 14, 14, 6, '#e6d3a3');
  s.outline('#241711', true);
  return s;
}

function scrollBar() {
  const s = new Surface(12, 60);
  s.rect(2, 0, 8, 60, '#3a2718');
  s.frame(2, 0, 8, 60, '#241711');
  s.rect(3, 2, 6, 24, '#8a6238');
  s.hline(3, 2, 6, '#b98a3e');
  s.hline(3, 25, 6, '#5a3d24');
  return s;
}

function progressBar(w = 160, h = 12) {
  const s = new Surface(w, h);
  s.rect(0, 0, w, h, '#241711');
  s.rect(1, 1, w - 2, h - 2, '#3a2718');
  s.rect(2, 2, w - 4, h - 4, '#1a120c');
  return s;
}

export function buildUI(out) {
  const files = [];
  const save = (name, s) => { out(name, s); files.push(name); };

  save('ui/panels/wood.png', S2(woodPanel(96, 96, false)));
  save('ui/panels/wood_dark.png', S2(woodPanel(96, 96, true)));
  save('ui/panels/paper.png', S2(paperPanel(96, 96)));
  save('ui/panels/tooltip.png', S2(paperPanel(64, 48)));
  for (const state of ['normal', 'hover', 'disabled']) {
    save(`ui/buttons/btn_${state}.png`, S2(button(120, 32, state)));
  }
  save('ui/buttons/btn_primary.png', S2(button(120, 32, 'normal')));
  save('ui/slots/slot.png', S2(slot(48, 'normal')));
  save('ui/slots/slot_hover.png', S2(slot(48, 'hover')));
  save('ui/slots/slot_selected.png', S2(slot(48, 'selected')));
  save('ui/slots/slot_locked.png', S2(slot(48, 'locked')));
  save('ui/portrait_frame.png', S2(portraitFrame(104)));
  save('ui/divider.png', S2(divider()));
  save('ui/hud/plaque_money.png', S2(plaque(150, 34)));
  save('ui/hud/plaque_small.png', S2(plaque(96, 28)));
  save('ui/cursors/cursor_normal.png', cursorNormal().scale(2));
  save('ui/cursors/cursor_pointer.png', cursorPointer().scale(2));
  save('ui/cursors/cursor_grab.png', cursorGrab().scale(2));
  save('ui/scrollbar.png', scrollBar().scale(2));
  save('ui/progress.png', progressBar().scale(2));

  for (const [name, fn] of Object.entries(ICONS)) {
    const s = iconSurface();
    fn(s);
    save(`ui/icons/${name}.png`, S2(s));
  }
  return files;
}
