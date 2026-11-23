// Item catalogue + procedural 32x32 icons.
import { Surface, hex, mul, withAlpha, rngFor } from '../lib/pixel.mjs';
import {
  PAL, sack, jar, bowl, bottle, smallBottle, fish, vegBundle, grainPile, clothBolt,
  paperSheet, crate, tool, coin, pot, boxItem, packet, leafItem, ropeCoil, chopsticks,
  glassBottle, basket, broom, candleLamp, scaleItem, gem, ring, book, roundRect,
} from '../lib/draw.mjs';

const C = {
  sackLight: '#d8c69a', sackMid: '#c2ab7c', sackDark: '#a08a62',
  riceWhite: '#f0e8d2', riceOld: '#cbb98e', riceHusk: '#b89a62',
  cornYellow: '#e0b53e', cornDeep: '#b98a22', cornLeaf: '#7a8a3e',
  potato: '#a85a3e', potatoLight: '#c47a55', cassava: '#c9b083',
  green: '#5d7a3a', greenLight: '#8aa357', greenDark: '#3f5527',
  red: '#a83226', redLight: '#c4513f', orange: '#c47a22',
  clay: '#b06b3e', clayLight: '#cf8a58', clayDark: '#7a4426',
  porcelain: '#e8e0cc', porcelainBlue: '#5a7a8a',
  brass: '#b98a3e', brassLight: '#e0b862', brassDark: '#7a5a24',
  silver: '#c9cfd2', silverDark: '#8e979c', silverLight: '#eef2f2',
  paper: '#e6d3a3', paperDark: '#b9a273', inkBlue: '#3a4a5a',
  cloth: '#7b5a3e', clothLight: '#9c7654', indigo: '#3c4a58',
  wood: '#8a6238', woodDark: '#5a3d24', woodLight: '#c1935a',
  bottleGreen: '#5f7d5a', bottleBrown: '#8a5a34', bottleBlue: '#5a7a8a',
  salt: '#e9e6da', saltShadow: '#b8b8a8',
  sugar: '#e0cfa8', sugarWhite: '#f2e8ce',
  fishBlue: '#8fa3a5', fishBrown: '#a88a5a', shrimp: '#c47a5a',
};

// helpers ---------------------------------------------------------------
function riceSack(s, seed, body, grain, label = null) {
  const rng = rngFor(seed);
  sack(s, 4, 2, 24, 28, body, '#8a6a44', rng);
  // grain texture
  for (let i = 0; i < 26; i++) {
    const x = 6 + Math.floor(rng() * 20), y = 8 + Math.floor(rng() * 20);
    s.set(x, y, rng() < 0.5 ? mul(hex(grain), 0.86) : mul(hex(grain), 1.12));
  }
  s.rect(8, 12, 16, 8, withAlpha(hex(label || '#8a6a44'), 220));
  s.hline(9, 13, 14, mul(hex(label || '#8a6a44'), 1.2));
  s.hline(9, 16, 10, mul(hex(label || '#8a6a44'), 0.8));
}

function bottleItem(s, color, liquid, label = '#e8dcc0') {
  bottle(s, 16, 16, 26, color, '#3a2a1c', liquid);
  s.rect(13, 13, 6, 4, label);
  s.set(14, 14, '#8a4a32');
}

function bowlItem(s, content, specks = null) {
  const rng = rngFor('bowl' + content);
  bowl(s, 16, 17, 24, 14, '#b9a98c', content, rng);
  if (specks) {
    for (let i = 0; i < 8; i++) s.set(8 + Math.floor(rng() * 16), 13 + Math.floor(rng() * 3), specks);
  }
}

function paperPacket(s, color, label, lines = true) {
  paperSheet(s, 5, 5, 22, 22, color, label);
  if (lines) {
    for (let i = 0; i < 3; i++) s.hline(8, 9 + i * 4, 16, mul(hex(color), 0.7));
  }
}

function drawItem(def) {
  const s = new Surface(32, 32);
  const p = def.p || {};
  const rng = rngFor(def.id);
  switch (def.icon) {
    // ---- staple foods
    case 'rice_white': riceSack(s, def.id, C.sackLight, C.riceWhite); break;
    case 'rice_old': riceSack(s, def.id, '#b8a273', C.riceOld, '#7a5a3e'); break;
    case 'rice_bag': {
      sack(s, 2, 1, 28, 30, '#c9b083', '#7a5a32', rng);
      s.rect(6, 12, 20, 9, '#8a5a34');
      s.hline(7, 13, 18, '#c47a55');
      for (let i = 0; i < 10; i++) s.set(8 + Math.floor(rng() * 16), 15 + Math.floor(rng() * 4), '#e0c58a');
      break;
    }
    case 'rice_bowl': bowlItem(s, C.riceWhite); for (let i = 0; i < 10; i++) s.set(9 + Math.floor(rng() * 14), 14 + Math.floor(rng() * 3), '#fffaf0'); break;
    case 'corn': {
      s.ellipse(15, 17, 7, 13, C.cornYellow);
      s.ellipse(15, 17, 5, 11, '#e8c050');
      for (let yy = 7; yy < 27; yy += 2) for (let xx = 10; xx < 21; xx += 2) s.set(xx + (yy % 4 === 0 ? 1 : 0), yy, '#c99a2e');
      s.poly([[9, 18], [3, 26], [7, 27], [11, 21]], C.cornLeaf);
      s.poly([[21, 18], [27, 26], [24, 27], [19, 21]], C.cornLeaf);
      s.outline(PAL.ink, true);
      break;
    }
    case 'sweet_potato': {
      s.ellipse(16, 17, 6, 12, C.potato);
      s.ellipse(14, 15, 4, 9, C.potatoLight);
      for (let i = 0; i < 5; i++) s.set(13 + Math.floor(rng() * 7), 8 + Math.floor(rng() * 18), '#7a3a28');
      s.outline(PAL.ink, true);
      break;
    }
    case 'cassava': {
      s.ellipse(16, 17, 5, 12, C.cassava);
      s.ellipse(14, 16, 3, 9, '#dcc79a');
      s.line(11, 7, 8, 3, C.cassava);
      s.line(21, 7, 24, 3, C.cassava);
      s.outline(PAL.ink, true);
      break;
    }
    case 'cassava_dried': {
      for (let i = 0; i < 3; i++) s.ellipse(11 + i * 6, 18 - i * 3, 6, 3, '#d8c69a');
      s.ellipse(16, 12, 6, 3, '#e8d8b0');
      s.outline(PAL.ink, true);
      break;
    }
    case 'cassava_fresh': {
      s.ellipse(16, 17, 6, 13, C.cassava);
      s.ellipse(14, 16, 3, 9, '#e0cfa4');
      s.set(13, 12, '#7a5a3a'); s.set(17, 20, '#7a5a3a');
      s.outline(PAL.ink, true);
      break;
    }
    case 'banana_stem': {
      s.ellipse(16, 17, 6, 11, '#c9b083');
      s.ellipse(14, 16, 3, 8, '#e0cfa4');
      s.rect(13, 4, 6, 5, '#7a8a3e');
      s.outline(PAL.ink, true);
      break;
    }
    case 'peanuts': {
      for (let i = 0; i < 4; i++) {
        const x = 8 + (i % 2) * 9, y = 14 + Math.floor(i / 2) * 6;
        s.ellipse(x, y, 4, 2, '#c9a86a');
        s.ellipse(x + 2, y + 1, 3, 2, '#b8945a');
      }
      s.outline(PAL.ink, true);
      break;
    }
    case 'mung_beans': bowlItem(s, '#6f8a3a', '#a8bf5a'); break;
    case 'black_beans': bowlItem(s, '#3a2a22', '#5a4a3a'); break;
    case 'water_spinach': vegBundle(s, 4, 2, C.green, '#8a6a44', rng); break;
    case 'wild_vegetables': vegBundle(s, 4, 2, '#6f7f47', '#a8864e', rng); break;
    case 'cabbage': {
      s.ellipse(16, 18, 9, 8, C.greenLight);
      s.ellipse(13, 15, 6, 5, C.green);
      s.ellipse(19, 15, 5, 4, '#9fb05a');
      for (let i = 0; i < 10; i++) s.set(10 + Math.floor(rng() * 13), 12 + Math.floor(rng() * 11), mul(hex(C.green), 0.8));
      s.outline(PAL.ink, true);
      break;
    }
    case 'pumpkin': {
      s.ellipse(16, 18, 10, 7, '#c47a22');
      s.ellipse(16, 18, 9, 6, '#d98a30');
      for (let i = -6; i <= 6; i += 3) s.line(16 + i, 12, 16 + i, 24, '#a85a1e');
      s.rect(14, 10, 4, 3, '#5d7a3a');
      s.outline(PAL.ink, true);
      break;
    }
    case 'cucumber': {
      s.ellipse(16, 17, 4, 11, C.green);
      s.ellipse(14, 16, 2, 8, C.greenLight);
      s.outline(PAL.ink, true);
      break;
    }
    case 'eggplant': {
      s.ellipse(16, 18, 6, 10, '#4a2a4a');
      s.ellipse(14, 16, 3, 7, '#6a3a6a');
      s.rect(13, 5, 6, 4, C.green);
      s.outline(PAL.ink, true);
      break;
    }
    case 'luffa': {
      s.ellipse(16, 17, 4, 12, '#8aa357');
      for (let yy = 6; yy < 28; yy += 3) s.hline(13, yy, 6, '#6f8a3a');
      s.outline(PAL.ink, true);
      break;
    }
    case 'chili': {
      s.ellipse(16, 17, 4, 10, C.red);
      s.ellipse(14, 16, 2, 7, C.redLight);
      s.rect(14, 5, 4, 4, C.green);
      s.outline(PAL.ink, true);
      break;
    }
    case 'garlic': {
      s.ellipse(16, 18, 7, 7, '#e8dcc8');
      s.line(16, 12, 16, 5, '#c9b89a');
      s.ellipse(12, 18, 3, 6, '#f2e8d8');
      s.ellipse(20, 18, 3, 6, '#d8c9b0');
      s.outline(PAL.ink, true);
      break;
    }
    case 'onion': {
      s.ellipse(16, 19, 7, 6, '#c9a86a');
      s.ellipse(14, 18, 4, 4, '#e0c58a');
      s.line(16, 13, 16, 6, '#a8864e');
      s.outline(PAL.ink, true);
      break;
    }
    case 'banana': {
      for (let i = 0; i < 4; i++) {
        s.ellipse(11 + i * 3, 18 - i * 2, 5, 8, '#d9b53e');
        s.ellipse(11 + i * 3, 17 - i * 2, 3, 6, '#e8c858');
      }
      s.outline(PAL.ink, true);
      break;
    }
    case 'dried_fish': fish(s, 3, 10, 1, C.fishBrown, '#d8c9a8'); break;
    case 'fresh_fish': fish(s, 3, 10, 1, C.fishBlue, '#cdd6cf'); break;
    case 'dried_shrimp': {
      for (let i = 0; i < 5; i++) {
        const x = 8 + Math.floor(rng() * 15), y = 12 + Math.floor(rng() * 12);
        s.ellipse(x, y, 3, 2, C.shrimp);
        s.set(x + 2, y - 1, '#e0a080');
      }
      s.outline(PAL.ink, true);
      break;
    }
    case 'salt': {
      s.rect(8, 17, 16, 8, '#c9b083');
      s.ellipse(16, 17, 8, 4, C.salt);
      for (let i = 0; i < 14; i++) s.set(10 + Math.floor(rng() * 12), 15 + Math.floor(rng() * 5), '#ffffff');
      s.hline(8, 21, 16, '#8a6a44');
      s.outline(PAL.ink, true);
      break;
    }
    case 'sugar': {
      s.poly([[16, 5], [24, 24], [8, 24]], C.sugar);
      s.poly([[16, 5], [20, 24], [16, 24]], C.sugarWhite);
      s.hline(10, 22, 12, '#c9b07a');
      s.outline(PAL.ink, true);
      break;
    }
    case 'rice_flour': {
      paperPacket(s, '#e2d3a8', '#b9a273');
      s.rect(10, 12, 12, 6, '#f0e8d2');
      s.outline(PAL.ink, true);
      break;
    }
    case 'corn_flour': paperPacket(s, '#d8b07a', '#a87a3a'); break;
    case 'paste': bottleItem(s, C.bottleBrown, '#5a3a1e', '#e8dcc0'); break;
    case 'fish_sauce': bottleItem(s, C.bottleBrown, '#3a2a18', '#d8c9a8'); break;
    case 'soy': bottleItem(s, C.bottleBrown, '#2a1a10', '#c9b083'); break;
    case 'tea': {
      s.rect(5, 9, 22, 16, '#c9b083');
      s.rect(6, 10, 20, 14, '#a8864e');
      for (let i = 0; i < 24; i++) s.set(7 + Math.floor(rng() * 18), 11 + Math.floor(rng() * 12), rng() < 0.5 ? '#4a5a2a' : '#5d7030');
      s.hline(5, 9, 22, '#8a6a44');
      s.outline(PAL.ink, true);
      break;
    }
    case 'tea_leaves': {
      for (let i = 0; i < 3; i++) leafItem(s, 12 + i * 4, 18 - i * 2, '#4a5a2a', '#33401e');
      break;
    }
    // ---- household
    case 'bowl_earth': bowl(s, 16, 17, 24, 14, '#8a6238', null, rng); break;
    case 'bowl_porcelain': {
      bowl(s, 16, 17, 24, 14, C.porcelain, null, rng);
      s.hline(8, 14, 16, C.porcelainBlue);
      s.hline(8, 15, 16, mul(hex(C.porcelainBlue), 1.2));
      s.outline(PAL.ink, true);
      break;
    }
    case 'chopsticks': chopsticks(s, 16, 16); break;
    case 'clay_pot': pot(s, 16, 17, 22, 18, '#9a6238', '#5a3a22'); break;
    case 'brass_pot': pot(s, 16, 17, 22, 18, C.brass, '#7a5a24'); break;
    case 'pan': {
      s.ellipse(16, 19, 11, 5, '#5a5a52');
      s.ellipse(16, 18, 10, 4, '#7a7a70');
      s.rect(24, 16, 7, 3, '#3a3028');
      s.outline(PAL.ink, true);
      break;
    }
    case 'kettle': {
      s.ellipse(16, 19, 9, 8, C.brass);
      s.rect(13, 8, 6, 5, C.brass);
      s.rect(12, 6, 8, 3, '#7a5a24');
      s.line(24, 14, 28, 10, C.brass);
      s.ellipse(16, 19, 7, 6, C.brassLight);
      s.outline(PAL.ink, true);
      break;
    }
    case 'teapot': {
      s.ellipse(16, 19, 9, 7, C.porcelain);
      s.ellipse(16, 19, 7, 5, '#f2ecdc');
      s.rect(13, 9, 6, 4, C.porcelain);
      s.ellipse(16, 9, 4, 2, C.porcelain);
      s.line(25, 17, 29, 12, C.porcelain);
      s.ellipse(16, 19, 5, 3, C.porcelainBlue);
      s.outline(PAL.ink, true);
      break;
    }
    case 'kitchen_knife': tool(s, 2, 3, 0, '#c9cfd2', '#8a6238', 'blade'); break;
    case 'cutting_board': {
      s.rect(4, 12, 24, 12, C.wood);
      s.rect(5, 13, 22, 10, mul(hex(C.wood), 1.12));
      s.hline(5, 14, 22, mul(hex(C.wood), 1.2));
      s.rect(6, 14, 3, 3, '#5a3d24');
      s.outline(PAL.ink, true);
      break;
    }
    case 'basket': basket(s, 16, 16, 22, 16); break;
    case 'hand_basket': {
      basket(s, 16, 18, 18, 12);
      s.ellipseOutline(16, 10, 7, 4, '#8a6a44');
      s.outline(PAL.ink, true);
      break;
    }
    case 'carrying_basket': {
      basket(s, 16, 20, 22, 14);
      s.ellipseOutline(16, 9, 9, 6, '#a8864e');
      s.outline(PAL.ink, true);
      break;
    }
    case 'flat_basket': {
      s.ellipse(16, 17, 13, 7, '#c9a86a');
      s.ellipse(16, 17, 11, 5, '#b8945a');
      for (let r = 3; r < 12; r += 3) s.ellipseOutline(16, 17, r, Math.max(1, Math.round(r * 0.45)), '#8a6a44');
      s.outline(PAL.ink, true);
      break;
    }
    case 'basin': {
      s.ellipse(16, 18, 11, 5, '#9aa3a3');
      s.ellipse(16, 17, 10, 4, '#c9cfd2');
      s.ellipse(16, 17, 8, 3, '#8e979c');
      s.outline(PAL.ink, true);
      break;
    }
    case 'water_jar': jar(s, 16, 16, 18, 24, '#7a6a52', '#4a3a2a', rng); break;
    case 'glass_bottle': glassBottle(s, 16, 16, 24); break;
    case 'lamp_oil': {
      // flat tin oil can with a cork spout
      s.rect(9, 8, 14, 18, '#6a6252');
      s.rect(11, 9, 10, 16, '#7d7462');
      s.rect(14, 4, 4, 5, '#4a4238');
      s.rect(15, 3, 2, 2, '#2e2418');
      s.rect(12, 13, 8, 6, '#d9c9a0');
      s.hline(13, 14, 6, '#8a6238');
      s.hline(13, 16, 5, '#8a6238');
      s.vline(22, 9, 16, '#9a9078');
      s.outline(PAL.ink, true);
      break;
    }
    case 'conical_hat': {
      // nón lá: cone with a wide brim and a chin strap
      s.poly([[16, 4], [27, 22], [5, 22]], '#e6d3a3');
      s.poly([[16, 6], [24, 21], [8, 21]], '#f2e6c8');
      for (let i = 0; i < 5; i++) s.line(16, 7 + i * 3, 10 + i * 3, 21, '#c9b07a');
      s.ellipse(16, 22, 13, 3, '#d8c69a');
      s.ellipse(16, 22, 12, 2, '#e6d3a3');
      s.line(8, 24, 12, 30, '#8a6238');
      s.line(24, 24, 20, 30, '#8a6238');
      s.outline(PAL.ink, true);
      break;
    }
    case 'umbrella': {
      // ô dầu: lacquered paper canopy on a bamboo handle
      s.ellipse(16, 16, 13, 9, '#8a3a2a');
      s.ellipse(16, 15, 12, 8, '#b04a32');
      s.ellipse(16, 14, 10, 6, '#c9603e');
      for (let i = -2; i <= 2; i++) s.line(16, 8, 16 + i * 5, 22, '#7a2a1e');
      s.line(16, 15, 16, 30, '#5a3d24');
      s.set(16, 30, '#8a6238');
      s.set(15, 8, '#f0c86a');
      s.outline(PAL.ink, true);
      break;
    }
    case 'incense': {
      // bundle of joss sticks with red tips
      for (let i = 0; i < 6; i++) {
        const x = 7 + i * 3;
        s.vline(x, 6, 20, '#c9b083');
        s.vline(x, 6, 3, '#a83226');
        s.set(x, 5, '#e0a441');
      }
      s.rect(6, 18, 20, 4, '#8a6238');
      s.hline(7, 19, 18, '#c1935a');
      s.outline(PAL.ink, true);
      break;
    }
    case 'betel': {
      // trầu cau: green betel leaf with an areca nut
      s.ellipse(12, 18, 8, 6, '#5d7a3a');
      s.ellipse(12, 18, 6, 4, '#8aa357');
      s.line(6, 14, 18, 22, '#3f5527');
      s.ellipse(21, 14, 5, 6, '#a85a3e');
      s.ellipse(21, 14, 4, 5, '#c47a55');
      s.set(21, 12, '#e0b862');
      s.outline(PAL.ink, true);
      break;
    }
    case 'soap': {
      // a bar of brown soap with a stamped mark
      s.rect(5, 11, 22, 12, '#c9a06a');
      s.rect(6, 12, 20, 9, '#e0c58a');
      s.ellipse(16, 16, 5, 3, '#b98a3e');
      s.ellipse(16, 16, 4, 2, '#c9a06a');
      s.set(10, 20, '#a8864e');
      s.outline(PAL.ink, true);
      break;
    }
    case 'slippers': {
      // pair of rubber sandals seen from above
      for (const [cx, rot] of [[11, 0], [21, 1]]) {
        s.ellipse(cx, 19, 5, 9, '#3e3a34');
        s.ellipse(cx, 19, 4, 8, '#575048');
        s.line(cx - 3, 15, cx + 1, 19, '#c9b083');
        s.line(cx + 3, 15, cx - 1, 19, '#c9b083');
        s.set(cx, 20, '#2a2622');
      }
      s.outline(PAL.ink, true);
      break;
    }
    case 'lamp_bowl': {
      s.ellipse(16, 21, 9, 4, C.brass);
      s.ellipse(16, 20, 8, 3, C.brassLight);
      s.rect(13, 10, 6, 8, '#d9c9a0');
      s.ellipse(16, 9, 3, 4, '#f0b04a');
      s.set(16, 6, '#fff0c0');
      s.outline(PAL.ink, true);
      break;
    }
    case 'mat': {
      s.rect(4, 10, 24, 14, '#c9b083');
      for (let yy = 11; yy < 23; yy += 2) s.hline(5, yy, 22, '#a8864e');
      for (let xx = 6; xx < 27; xx += 3) s.vline(xx, 10, 14, '#b8945a');
      s.outline(PAL.ink, true);
      break;
    }
    case 'pillow': {
      roundRect(s, 4, 10, 24, 13, 5, '#c9b083');
      roundRect(s, 6, 12, 20, 9, 4, '#d8c69a');
      s.hline(8, 16, 16, '#a8864e');
      s.outline(PAL.ink, true);
      break;
    }
    case 'blanket': {
      s.rect(4, 12, 24, 12, '#7a6a52');
      for (let yy = 13; yy < 23; yy += 3) s.hline(5, yy, 22, '#8a7a62');
      for (let xx = 7; xx < 27; xx += 5) s.vline(xx, 12, 12, '#6a5a44');
      s.outline(PAL.ink, true);
      break;
    }
    case 'mosquito_net': {
      s.rect(6, 8, 20, 18, withAlpha(hex('#e8e0cc'), 90));
      for (let xx = 6; xx < 26; xx += 3) s.vline(xx, 8, 18, withAlpha(hex('#c9bfa8'), 140));
      for (let yy = 8; yy < 26; yy += 3) s.hline(6, yy, 20, withAlpha(hex('#c9bfa8'), 120));
      s.outline(PAL.ink, true);
      break;
    }
    case 'broom': broom(s, 4, 1); break;
    case 'ladle': {
      s.ellipse(11, 21, 6, 4, C.brass);
      s.line(15, 19, 26, 5, C.brass);
      s.line(16, 20, 27, 6, C.brassDark);
      s.outline(PAL.ink, true);
      break;
    }
    case 'tray': {
      s.ellipse(16, 18, 13, 6, '#c9a86a');
      s.ellipse(16, 18, 11, 4, '#b8945a');
      s.outline(PAL.ink, true);
      break;
    }
    case 'teacup': {
      s.rect(10, 14, 12, 7, C.porcelain);
      s.ellipse(16, 14, 6, 2, '#f2ecdc');
      s.ellipse(16, 21, 6, 2, C.porcelainBlue);
      s.line(22, 16, 25, 18, C.porcelain);
      s.outline(PAL.ink, true);
      break;
    }
    // ---- materials
    case 'firewood': {
      for (let i = 0; i < 5; i++) {
        const x = 6 + i * 4, y = 10 + (i % 2) * 5;
        s.line(x, 24, x + 6, 8 + (i % 2) * 3, C.wood);
        s.line(x + 1, 24, x + 7, 8 + (i % 2) * 3, C.woodLight);
      }
      s.outline(PAL.ink, true);
      break;
    }
    case 'charcoal': {
      for (let i = 0; i < 6; i++) {
        const x = 9 + Math.floor(rng() * 14), y = 13 + Math.floor(rng() * 12);
        s.ellipse(x, y, 4, 3, '#3a3a38');
        s.ellipse(x - 1, y - 1, 2, 1, '#5a5a56');
      }
      s.outline(PAL.ink, true);
      break;
    }
    case 'straw': {
      for (let i = 0; i < 8; i++) s.line(6 + i * 2, 24, 12 + i * 2, 7, i % 2 ? '#c9a86a' : '#b8945a');
      s.hline(6, 18, 20, '#8a6a44');
      s.outline(PAL.ink, true);
      break;
    }
    case 'bamboo': {
      s.rect(13, 3, 6, 26, '#8aa357');
      s.rect(14, 3, 3, 26, '#a8bf5a');
      for (let yy = 7; yy < 28; yy += 6) s.hline(13, yy, 6, '#5d7a3a');
      s.outline(PAL.ink, true);
      break;
    }
    case 'wood': {
      s.rect(3, 12, 26, 8, C.wood);
      s.hline(3, 12, 26, C.woodLight);
      s.hline(3, 19, 26, C.woodDark);
      for (let i = 0; i < 5; i++) s.set(6 + i * 5, 15, C.woodDark);
      s.outline(PAL.ink, true);
      break;
    }
    case 'nails': {
      for (let i = 0; i < 7; i++) {
        const x = 8 + Math.floor(rng() * 16), y = 9 + Math.floor(rng() * 14);
        s.line(x, y, x + 1, y + 5, '#8e979c');
        s.hline(x - 1, y, 3, '#c9cfd2');
      }
      s.outline(PAL.ink, true);
      break;
    }
    case 'rope': ropeCoil(s, 16, 16, 11, '#b09468'); break;
    case 'cloth': clothBolt(s, 3, 6, 26, 20, C.cloth, rng); break;
    case 'canvas': clothBolt(s, 3, 6, 26, 20, '#9a8a62', rng); break;
    case 'thread': {
      s.ellipse(16, 18, 7, 7, '#a83226');
      for (let i = 0; i < 12; i++) s.line(10 + Math.floor(rng() * 12), 12 + Math.floor(rng() * 12), 10 + Math.floor(rng() * 12), 12 + Math.floor(rng() * 12), '#c4513f');
      s.rect(13, 10, 6, 3, '#8a6a44');
      s.outline(PAL.ink, true);
      break;
    }
    case 'needle': {
      s.line(7, 25, 25, 7, '#c9cfd2');
      s.ellipse(7, 25, 2, 2, '#8e979c');
      s.outline(PAL.ink, true);
      break;
    }
    case 'do_paper': {
      paperSheet(s, 4, 5, 24, 22, '#e8dcc0', null, rng);
      for (let i = 0; i < 3; i++) s.set(8 + i * 7, 12 + i * 4, '#c9b083');
      break;
    }
    case 'paper': paperSheet(s, 4, 5, 24, 22, C.paper, null, rng); break;
    case 'ink': {
      s.rect(9, 12, 14, 12, '#2a2a32');
      s.rect(10, 13, 12, 3, '#4a4a5a');
      s.rect(12, 6, 8, 7, '#3a3a44');
      s.hline(12, 6, 8, '#5a5a6a');
      s.outline(PAL.ink, true);
      break;
    }
    case 'brush': {
      s.line(10, 26, 22, 6, '#b08a52');
      s.poly([[21, 6], [26, 2], [24, 9]], '#3a2a1c');
      s.line(9, 27, 21, 7, '#d8b07a');
      s.outline(PAL.ink, true);
      break;
    }
    case 'fountain_pen': {
      s.line(9, 25, 23, 7, '#3a2a1c');
      s.line(10, 24, 22, 8, '#6a4a2a');
      s.rect(21, 5, 3, 4, C.brass);
      s.outline(PAL.ink, true);
      break;
    }
    // ---- medicine
    case 'herbal_medicine': {
      for (let i = 0; i < 7; i++) {
        const x = 8 + Math.floor(rng() * 16), y = 9 + Math.floor(rng() * 14);
        s.ellipse(x, y, 3, 1, i % 2 ? '#7a5a3e' : '#8a6a44');
      }
      s.outline(PAL.ink, true);
      break;
    }
    case 'medicine_bag': {
      s.ellipse(16, 18, 9, 8, '#8a6a44');
      s.rect(13, 8, 6, 4, '#6a4a2e');
      s.line(9, 12, 16, 4, '#5a3a22');
      s.line(23, 12, 16, 4, '#5a3a22');
      s.rect(13, 15, 6, 5, '#c9a86a');
      s.outline(PAL.ink, true);
      break;
    }
    case 'herb_leaves': leafItem(s, 16, 16, '#4a5a2a', '#33401e'); break;
    case 'medicine_bottle': {
      bottle(s, 16, 16, 24, '#8a5a34', '#3a2a1c', '#6a4a2a');
      s.rect(12, 12, 8, 6, '#e8dcc0');
      s.set(15, 14, C.red);
      s.outline(PAL.ink, true);
      break;
    }
    case 'cotton': {
      s.ellipse(16, 18, 8, 5, '#f2ecdc');
      s.ellipse(12, 16, 4, 3, '#ffffff');
      s.ellipse(20, 16, 4, 3, '#e0d8c8');
      s.outline(PAL.ink, true);
      break;
    }
    case 'bandage': {
      s.rect(8, 11, 16, 12, '#e8dcc0');
      s.rect(10, 13, 12, 8, '#f2ecdc');
      s.line(16, 13, 16, 21, '#c9b083');
      s.outline(PAL.ink, true);
      break;
    }
    case 'antiseptic': bottleItem(s, C.bottleBlue, '#4a6a80', '#e8dcc0'); break;
    case 'medicine_box': {
      boxItem(s, 5, 8, 22, 18, '#c9b083', C.red);
      s.rect(13, 14, 6, 2, C.red);
      s.rect(15, 12, 2, 6, C.red);
      s.outline(PAL.ink, true);
      break;
    }
    case 'balm': {
      s.ellipse(16, 18, 9, 6, '#9aa3a3');
      s.ellipse(16, 17, 8, 5, '#c9cfd2');
      s.ellipse(16, 17, 6, 3, '#b9a98c');
      s.outline(PAL.ink, true);
      break;
    }
    case 'rub_oil': bottleItem(s, C.bottleGreen, '#4a5a2a', '#e8dcc0'); break;
    case 'quinine': {
      bottleItem(s, C.bottleBlue, '#5a7a8a', '#e8dcc0');
      s.rect(13, 14, 6, 2, C.red);
      break;
    }
    case 'ointment': {
      s.rect(8, 14, 16, 10, '#e8dcc0');
      s.ellipse(16, 14, 8, 3, '#c9b083');
      s.hline(8, 19, 16, C.red);
      s.outline(PAL.ink, true);
      break;
    }
    // ---- valuables
    case 'fine_cloth': clothBolt(s, 3, 6, 26, 20, '#7a3a4a', rng); break;
    case 'brass_item': {
      s.ellipse(16, 19, 8, 6, C.brass);
      s.ellipse(16, 18, 7, 5, C.brassLight);
      s.rect(13, 8, 6, 6, C.brass);
      s.outline(PAL.ink, true);
      break;
    }
    case 'silver_item': {
      s.ellipse(16, 19, 8, 6, C.silver);
      s.ellipse(16, 18, 7, 5, C.silverLight);
      s.rect(13, 8, 6, 6, C.silver);
      s.outline(PAL.ink, true);
      break;
    }
    case 'silver_bracelet': {
      s.ellipseOutline(16, 18, 9, 6, C.silver);
      s.ellipseOutline(16, 18, 7, 4, C.silverLight);
      s.outline(PAL.ink, true);
      break;
    }
    case 'ring': ring(s, 16, 16); break;
    case 'pocket_watch': {
      s.ellipse(16, 18, 9, 9, C.brass);
      s.ellipse(16, 18, 7, 7, '#e8dcc0');
      s.line(16, 18, 16, 13, '#3a2a1c');
      s.line(16, 18, 20, 18, '#3a2a1c');
      s.rect(13, 7, 6, 3, C.brass);
      s.outline(PAL.ink, true);
      break;
    }
    case 'wooden_box': boxItem(s, 4, 9, 24, 16, '#5a3d24', C.brass); break;
    case 'fine_ceramic': {
      jar(s, 16, 16, 16, 22, C.porcelain, '#5a7a8a', rng);
      s.hline(9, 15, 14, C.porcelainBlue);
      s.outline(PAL.ink, true);
      break;
    }
    case 'painting': {
      s.rect(4, 6, 24, 20, '#5a3d24');
      s.rect(6, 8, 20, 16, '#e8dcc0');
      s.ellipse(14, 16, 5, 4, '#8aa357');
      s.rect(18, 12, 6, 8, '#8a6238');
      s.line(6, 24, 25, 8, '#c9b083');
      s.outline(PAL.ink, true);
      break;
    }
    case 'antique': {
      jar(s, 16, 17, 15, 20, '#6a5a44', '#3a2a1c', rng);
      s.rect(11, 13, 10, 2, '#b98a3e');
      s.outline(PAL.ink, true);
      break;
    }
    case 'old_book': book(s, 5, 6, 22, 22, '#5a3a2a', '#d8c9a8'); break;
    case 'map': {
      paperSheet(s, 4, 5, 24, 22, '#d8c9a8', '#6a7a52', rng);
      s.line(8, 20, 14, 14, '#8a4a32');
      s.line(14, 14, 20, 18, '#8a4a32');
      s.line(20, 18, 24, 10, '#8a4a32');
      break;
    }
    case 'stamped_paper': {
      paperSheet(s, 4, 5, 24, 22, C.paper, null, rng);
      s.circle ? null : null;
      s.ellipse(21, 19, 5, 5, C.red);
      s.ellipse(21, 19, 3, 3, C.paper);
      s.set(20, 18, C.red); s.set(22, 20, C.red);
      break;
    }
    case 'tea_set': {
      s.ellipse(16, 20, 11, 4, '#c9a86a');
      s.ellipse(12, 14, 5, 5, C.porcelain);
      s.rect(10, 10, 4, 3, C.porcelain);
      s.rect(19, 12, 6, 6, C.porcelain);
      s.ellipse(22, 12, 3, 1, '#f2ecdc');
      s.hline(19, 15, 6, C.porcelainBlue);
      s.outline(PAL.ink, true);
      break;
    }
    // ---- special
    case 'ration_book': {
      book(s, 5, 6, 22, 22, '#5a4a3a', '#e8dcc0');
      s.rect(8, 10, 16, 4, '#c9b083');
      s.outline(PAL.ink, true);
      break;
    }
    case 'coupon': {
      paperSheet(s, 4, 7, 24, 18, '#d8c9a8', '#8a6a44', rng);
      s.ellipse(22, 20, 3, 3, C.red);
      break;
    }
    case 'iou_note': {
      paperSheet(s, 4, 5, 24, 22, '#d8c9a8', null, rng);
      for (let i = 0; i < 3; i++) s.hline(7, 9 + i * 4, 14, '#6a5a44');
      s.ellipse(22, 21, 4, 4, withAlpha(hex(C.red), 180));
      break;
    }
    case 'shipping_paper': {
      paperSheet(s, 4, 5, 24, 22, '#e2d3a8', null, rng);
      s.rect(7, 8, 12, 3, '#8a6a44');
      s.rect(7, 13, 18, 2, '#a8864e');
      s.rect(7, 17, 14, 2, '#a8864e');
      break;
    }
    case 'id_paper': {
      paperSheet(s, 4, 6, 24, 20, '#e2d3a8', null, rng);
      s.rect(7, 9, 8, 8, '#b9a273');
      s.rect(17, 9, 8, 2, '#8a6a44');
      s.rect(17, 13, 8, 2, '#8a6a44');
      s.ellipse(22, 20, 3, 3, C.red);
      break;
    }
    case 'stamp': {
      s.rect(7, 7, 18, 18, '#c9b083');
      for (let i = 0; i < 4; i++) {
        s.ellipse(8 + i * 5, 7, 2, 2, '#a8864e');
        s.ellipse(8 + i * 5, 25, 2, 2, '#a8864e');
      }
      s.rect(10, 10, 12, 12, '#e8dcc0');
      s.ellipse(16, 16, 4, 4, C.red);
      s.outline(PAL.ink, true);
      break;
    }
    case 'marked_sack': {
      riceSack(s, def.id, '#b8a273', '#cbb98e', '#8a3a2a');
      s.rect(10, 12, 12, 6, '#8a3a2a');
      s.set(13, 14, '#e8dcc0'); s.set(18, 14, '#e8dcc0');
      break;
    }
    case 'secret_package': {
      s.rect(6, 10, 20, 14, '#8a6a44');
      s.rect(7, 11, 18, 12, '#a8864e');
      s.line(7, 11, 24, 22, '#c9b083');
      s.line(24, 11, 7, 22, '#c9b083');
      s.outline(PAL.ink, true);
      break;
    }
    case 'damaged_goods': {
      sack(s, 4, 2, 24, 28, '#a08a62', '#6a4a2e', rng);
      s.poly([[10, 12], [20, 10], [22, 18], [12, 20]], '#6a5a3a');
      s.set(14, 15, '#4a3a22');
      break;
    }
    case 'fake_goods': {
      sack(s, 4, 2, 24, 28, '#c2ab7c', '#8a6a44', rng);
      s.rect(8, 12, 16, 8, '#e8dcc0');
      s.line(10, 14, 22, 18, C.red);
      s.line(22, 14, 10, 18, C.red);
      break;
    }
    case 'unmarked_goods': {
      sack(s, 4, 2, 24, 28, '#8a7a5a', '#5a4a32', rng);
      s.rect(10, 12, 12, 4, '#6a5a3a');
      break;
    }
    default: {
      s.rect(6, 6, 20, 20, '#c9b083');
      s.outline(PAL.ink, true);
    }
  }
  return s;
}

// Catalogue --------------------------------------------------------------
// buy/sell are reference prices in đồng. qualityMul applies per quality tier.
export const ITEMS = [
  // staples
  { id: 'rice_white', name: 'Gạo trắng', cat: 'food', icon: 'rice_white', buy: 8, sell: 12, weight: 1, vol: 1, perish: 0.05, shelf: 45, desc: 'Gạo mới, hạt trắng thơm. Hàng quý nhất trong mùa khó khăn.' },
  { id: 'rice_old', name: 'Gạo cũ', cat: 'food', icon: 'rice_old', buy: 5, sell: 7, weight: 1, vol: 1, perish: 0.1, shelf: 25, desc: 'Gạo để lâu, hơi ẩm. Người nghèo vẫn quý.' },
  { id: 'rice_bag', name: 'Bao gạo', cat: 'food', icon: 'rice_bag', buy: 38, sell: 52, weight: 10, vol: 4, perish: 0.03, shelf: 60, desc: 'Một bao gạo 10kg, đủ cho cả xóm ăn vài bữa.' },
  { id: 'rice_bowl', name: 'Bát gạo', cat: 'food', icon: 'rice_bowl', buy: 2, sell: 3, weight: 0.3, vol: 0.2, perish: 0.12, shelf: 6, desc: 'Gạo đong sẵn, bán lẻ cho người không mua cả bao.' },
  { id: 'corn', name: 'Ngô', cat: 'food', icon: 'corn', buy: 3, sell: 5, weight: 0.4, vol: 0.3, perish: 0.08, shelf: 20, desc: 'Ngô khô, lương thực thay gạo khi thất thu.' },
  { id: 'sweet_potato', name: 'Khoai lang', cat: 'food', icon: 'sweet_potato', buy: 2, sell: 3, weight: 0.3, vol: 0.3, perish: 0.14, shelf: 14, desc: 'Khoai lang, no lâu, dễ trồng.' },
  { id: 'cassava', name: 'Khoai mì', cat: 'food', icon: 'cassava', buy: 1.5, sell: 2.5, weight: 0.4, vol: 0.4, perish: 0.16, shelf: 10, desc: 'Khoai mì, đồ ăn của người nghèo.' },
  { id: 'cassava_dried', name: 'Sắn khô', cat: 'food', icon: 'cassava_dried', buy: 2, sell: 3, weight: 0.2, vol: 0.2, perish: 0.05, shelf: 40, desc: 'Sắn thái mỏng phơi khô, để được lâu.' },
  { id: 'cassava_fresh', name: 'Sắn tươi', cat: 'food', icon: 'cassava_fresh', buy: 1, sell: 1.8, weight: 0.5, vol: 0.4, perish: 0.22, shelf: 6, desc: 'Sắn mới đào, phải ăn nhanh.' },
  { id: 'banana_stem', name: 'Củ chuối', cat: 'food', icon: 'banana_stem', buy: 1, sell: 1.5, weight: 0.5, vol: 0.4, perish: 0.2, shelf: 5, desc: 'Củ chuối, ăn thay cơm trong mùa đói.' },
  { id: 'peanuts', name: 'Lạc', cat: 'food', icon: 'peanuts', buy: 6, sell: 9, weight: 0.3, vol: 0.4, perish: 0.06, shelf: 30, desc: 'Lạc vụn, đánh dầu hoặc ăn sống.' },
  { id: 'mung_beans', name: 'Đậu xanh', cat: 'food', icon: 'mung_beans', buy: 7, sell: 10, weight: 0.3, vol: 0.3, perish: 0.05, shelf: 35, desc: 'Đậu xanh nấu chè, đãi khách.' },
  { id: 'black_beans', name: 'Đậu đen', cat: 'food', icon: 'black_beans', buy: 7, sell: 10, weight: 0.3, vol: 0.3, perish: 0.05, shelf: 35, desc: 'Đậu đen, núm thuốc bắc.' },
  { id: 'water_spinach', name: 'Rau muống', cat: 'food', icon: 'water_spinach', buy: 2, sell: 3, weight: 0.3, vol: 0.5, perish: 0.3, shelf: 4, desc: 'Rau muống tươi, héo nhanh.' },
  { id: 'wild_vegetables', name: 'Rau dại', cat: 'food', icon: 'wild_vegetables', buy: 1, sell: 1.8, weight: 0.2, vol: 0.4, perish: 0.3, shelf: 3, desc: 'Rau dại hái ven đồng, vị đắng.' },
  { id: 'cabbage', name: 'Rau cải', cat: 'food', icon: 'cabbage', buy: 2, sell: 3, weight: 0.4, vol: 0.5, perish: 0.25, shelf: 5, desc: 'Rau cải, nấu canh.' },
  { id: 'pumpkin', name: 'Bí đỏ', cat: 'food', icon: 'pumpkin', buy: 3, sell: 4.5, weight: 0.8, vol: 0.8, perish: 0.12, shelf: 12, desc: 'Bí đỏ, để được khá lâu.' },
  { id: 'cucumber', name: 'Dưa chuột', cat: 'food', icon: 'cucumber', buy: 2, sell: 3, weight: 0.3, vol: 0.4, perish: 0.28, shelf: 4, desc: 'Dưa chuột, ăn sống.' },
  { id: 'eggplant', name: 'Cà', cat: 'food', icon: 'eggplant', buy: 2, sell: 3, weight: 0.3, vol: 0.4, perish: 0.2, shelf: 6, desc: 'Cà tím, om dừa.' },
  { id: 'luffa', name: 'Mướp', cat: 'food', icon: 'luffa', buy: 2, sell: 3, weight: 0.3, vol: 0.5, perish: 0.24, shelf: 5, desc: 'Mướp hương, nấu canh cua.' },
  { id: 'chili', name: 'Ớt', cat: 'food', icon: 'chili', buy: 2, sell: 3.5, weight: 0.1, vol: 0.2, perish: 0.18, shelf: 7, desc: 'Ớt chỉ thiên, cay nồng.' },
  { id: 'garlic', name: 'Tỏi', cat: 'food', icon: 'garlic', buy: 3, sell: 4.5, weight: 0.1, vol: 0.2, perish: 0.1, shelf: 20, desc: 'Tỏi khô, để được lâu.' },
  { id: 'onion', name: 'Hành', cat: 'food', icon: 'onion', buy: 2, sell: 3, weight: 0.1, vol: 0.2, perish: 0.14, shelf: 14, desc: 'Hành khô, không thể thiếu trong bếp.' },
  { id: 'banana', name: 'Chuối', cat: 'food', icon: 'banana', buy: 2, sell: 3, weight: 0.3, vol: 0.4, perish: 0.2, shelf: 5, desc: 'Chuối chín, trẻ em thích.' },
  { id: 'dried_fish', name: 'Cá khô', cat: 'food', icon: 'dried_fish', buy: 10, sell: 16, weight: 0.3, vol: 0.3, perish: 0.06, shelf: 40, desc: 'Cá khô muối, để được lâu.' },
  { id: 'fresh_fish', name: 'Cá tươi', cat: 'food', icon: 'fresh_fish', buy: 8, sell: 13, weight: 0.5, vol: 0.5, perish: 0.45, shelf: 2, desc: 'Cá tươi từ sông, phải bán ngay.' },
  { id: 'dried_shrimp', name: 'Tôm khô', cat: 'food', icon: 'dried_shrimp', buy: 14, sell: 20, weight: 0.2, vol: 0.2, perish: 0.08, shelf: 30, desc: 'Tôm khô, đồ quen trong bữa cơm nghèo.' },
  { id: 'salt', name: 'Muối', cat: 'food', icon: 'salt', buy: 4, sell: 6, weight: 0.5, vol: 0.4, perish: 0.02, shelf: 90, desc: 'Muối, hàng không thể thiếu. Bán chạy quanh năm.' },
  { id: 'sugar', name: 'Đường', cat: 'food', icon: 'sugar', buy: 10, sell: 15, weight: 0.4, vol: 0.4, perish: 0.04, shelf: 60, desc: 'Đường cát, hàng xa xỉ với người nghèo.' },
  { id: 'rice_flour', name: 'Bột gạo', cat: 'food', icon: 'rice_flour', buy: 5, sell: 8, weight: 0.4, vol: 0.5, perish: 0.1, shelf: 20, desc: 'Bột gạo, làm bánh.' },
  { id: 'corn_flour', name: 'Bột ngô', cat: 'food', icon: 'corn_flour', buy: 3, sell: 5, weight: 0.4, vol: 0.5, perish: 0.1, shelf: 18, desc: 'Bột ngô, nấu cháo.' },
  { id: 'paste', name: 'Mắm', cat: 'food', icon: 'paste', buy: 9, sell: 14, weight: 0.4, vol: 0.4, perish: 0.05, shelf: 50, desc: 'Mắm trong vại, mua theo lượt.' },
  { id: 'fish_sauce', name: 'Nước mắm', cat: 'food', icon: 'fish_sauce', buy: 12, sell: 18, weight: 0.5, vol: 0.5, perish: 0.04, shelf: 60, desc: 'Nước mắm ngon, bán theo chai.' },
  { id: 'soy', name: 'Tương', cat: 'food', icon: 'soy', buy: 8, sell: 12, weight: 0.4, vol: 0.4, perish: 0.06, shelf: 40, desc: 'Tương bần, nấu canh.' },
  { id: 'tea', name: 'Chè khô', cat: 'food', icon: 'tea', buy: 12, sell: 18, weight: 0.2, vol: 0.3, perish: 0.04, shelf: 70, desc: 'Chè khô, đãi khách và bán cho người thích uống trà.' },
  { id: 'tea_leaves', name: 'Lá chè', cat: 'food', icon: 'tea_leaves', buy: 6, sell: 9, weight: 0.2, vol: 0.4, perish: 0.2, shelf: 8, desc: 'Lá chè tươi, sao khô để dùng dần.' },
  // household
  { id: 'bowl_earth', name: 'Bát sành', cat: 'household', icon: 'bowl_earth', buy: 2, sell: 3, weight: 0.3, vol: 0.3, perish: 0, shelf: 999, desc: 'Bát sành cộm, dùng hàng ngày.' },
  { id: 'bowl_porcelain', name: 'Bát sứ', cat: 'household', icon: 'bowl_porcelain', buy: 6, sell: 10, weight: 0.3, vol: 0.3, perish: 0, shelf: 999, desc: 'Bát sứ men xanh, nhà khá mới dùng.' },
  { id: 'chopsticks', name: 'Đũa tre', cat: 'household', icon: 'chopsticks', buy: 1, sell: 2, weight: 0.1, vol: 0.1, perish: 0, shelf: 999, desc: 'Đũa tre, đôi một.' },
  { id: 'clay_pot', name: 'Nồi đất', cat: 'household', icon: 'clay_pot', buy: 5, sell: 8, weight: 0.8, vol: 0.8, perish: 0, shelf: 999, desc: 'Nồi đất nấu cơm, dễ vỡ.' },
  { id: 'brass_pot', name: 'Nồi đồng', cat: 'household', icon: 'brass_pot', buy: 18, sell: 28, weight: 1.2, vol: 1, perish: 0, shelf: 999, desc: 'Nồi đồng, bền để dành của gia đình.' },
  { id: 'pan', name: 'Chảo', cat: 'household', icon: 'pan', buy: 7, sell: 11, weight: 0.8, vol: 0.8, perish: 0, shelf: 999, desc: 'Chảo gang cũ.' },
  { id: 'kettle', name: 'Ấm nước', cat: 'household', icon: 'kettle', buy: 9, sell: 14, weight: 0.7, vol: 0.8, perish: 0, shelf: 999, desc: 'Ấm đồng đun nước.' },
  { id: 'teapot', name: 'Ấm trà', cat: 'household', icon: 'teapot', buy: 8, sell: 13, weight: 0.5, vol: 0.6, perish: 0, shelf: 999, desc: 'Ấm trà sứ, dùng tiếp khách.' },
  { id: 'kitchen_knife', name: 'Dao bếp', cat: 'household', icon: 'kitchen_knife', buy: 6, sell: 10, weight: 0.3, vol: 0.2, perish: 0, shelf: 999, desc: 'Dao thái, mũi thép.' },
  { id: 'cutting_board', name: 'Thớt', cat: 'household', icon: 'cutting_board', buy: 4, sell: 7, weight: 0.6, vol: 0.6, perish: 0, shelf: 999, desc: 'Thớt gỗ, dùng nhiều năm.' },
  { id: 'basket', name: 'Rổ tre', cat: 'household', icon: 'basket', buy: 3, sell: 5, weight: 0.2, vol: 0.6, perish: 0, shelf: 999, desc: 'Rổ tre đan, vo gạo, đựng rau.' },
  { id: 'hand_basket', name: 'Giỏ xách', cat: 'household', icon: 'hand_basket', buy: 3, sell: 5, weight: 0.2, vol: 0.6, perish: 0, shelf: 999, desc: 'Giỏ tre có quai xách.' },
  { id: 'carrying_basket', name: 'Thúng', cat: 'household', icon: 'carrying_basket', buy: 4, sell: 6, weight: 0.4, vol: 1, perish: 0, shelf: 999, desc: 'Thúng lớn, gánh được.' },
  { id: 'flat_basket', name: 'Mẹt', cat: 'household', icon: 'flat_basket', buy: 2, sell: 4, weight: 0.1, vol: 0.8, perish: 0, shelf: 999, desc: 'Mẹt tre, phơi khô đồ.' },
  { id: 'basin', name: 'Chậu nhôm', cat: 'household', icon: 'basin', buy: 7, sell: 11, weight: 0.5, vol: 0.9, perish: 0, shelf: 999, desc: 'Chậu nhôm, hàng mới có ở chợ.' },
  { id: 'water_jar', name: 'Bình nước', cat: 'household', icon: 'water_jar', buy: 6, sell: 10, weight: 1, vol: 1, perish: 0, shelf: 999, desc: 'Bình gốm đựng nước mưa.' },
  { id: 'glass_bottle', name: 'Chai thủy tinh', cat: 'household', icon: 'glass_bottle', buy: 4, sell: 7, weight: 0.3, vol: 0.4, perish: 0, shelf: 999, desc: 'Chai thủy tinh, đựng nước mắm.' },
  { id: 'lamp_bowl', name: 'Bát đèn dầu', cat: 'household', icon: 'lamp_bowl', buy: 5, sell: 8, weight: 0.3, vol: 0.3, perish: 0, shelf: 999, desc: 'Đèn dầu bấc, thắp buổi tối.' },
  { id: 'lamp_oil', name: 'Dầu đèn', cat: 'household', icon: 'lamp_oil', buy: 3, sell: 5, weight: 0.4, vol: 0.3, perish: 0, shelf: 999, desc: 'Dầu thắp đèn, mùi hắc nhưng sáng lâu.' },
  { id: 'slippers', name: 'Dép cao su', cat: 'household', icon: 'slippers', buy: 2, sell: 4, weight: 0.15, vol: 0.3, perish: 0, shelf: 999, desc: 'Dép cao su, đi đường lầy không sợ ướt.' },
  { id: 'conical_hat', name: 'Nón lá', cat: 'household', icon: 'conical_hat', buy: 2, sell: 4, weight: 0.1, vol: 0.5, perish: 0, shelf: 999, desc: 'Nón lá, che nắng che mưa, ai đi đồng cũng cần.' },
  { id: 'umbrella', name: 'Ô dầu', cat: 'household', icon: 'umbrella', buy: 6, sell: 10, weight: 0.6, vol: 0.8, perish: 0, shelf: 999, desc: 'Ô giấy quét dầu, hàng của nhà khá giả.' },
  { id: 'incense', name: 'Hương', cat: 'household', icon: 'incense', buy: 2, sell: 4, weight: 0.05, vol: 0.2, perish: 0, shelf: 999, desc: 'Nén hương, thắp cúng ngày rằm.' },
  { id: 'betel', name: 'Trầu cau', cat: 'food', icon: 'betel', buy: 1, sell: 2, weight: 0.1, vol: 0.2, perish: 0.25, shelf: 5, desc: 'Câu trầu coi như câu chuyện, héo nhanh.' },
  { id: 'soap', name: 'Xà phòng', cat: 'household', icon: 'soap', buy: 3, sell: 6, weight: 0.2, vol: 0.3, perish: 0, shelf: 999, desc: 'Xà phòng cục, hàng hiếm trong mùa khó khăn.' },
  { id: 'mat', name: 'Chiếu', cat: 'household', icon: 'mat', buy: 5, sell: 8, weight: 0.8, vol: 1.5, perish: 0, shelf: 999, desc: 'Chiếu tre, trải ngủ.' },
  { id: 'pillow', name: 'Gối', cat: 'household', icon: 'pillow', buy: 4, sell: 6, weight: 0.4, vol: 0.8, perish: 0, shelf: 999, desc: 'Gối gỗ, gối đầu.' },
  { id: 'blanket', name: 'Chăn', cat: 'household', icon: 'blanket', buy: 9, sell: 14, weight: 0.9, vol: 1.5, perish: 0, shelf: 999, desc: 'Chăn bông, mùa đông ấm.' },
  { id: 'mosquito_net', name: 'Màn', cat: 'household', icon: 'mosquito_net', buy: 12, sell: 19, weight: 0.6, vol: 2, perish: 0, shelf: 999, desc: 'Màn chống muỗi.' },
  { id: 'broom', name: 'Chổi', cat: 'household', icon: 'broom', buy: 1, sell: 2, weight: 0.3, vol: 1, perish: 0, shelf: 999, desc: 'Chổi rơm quét nhà.' },
  { id: 'ladle', name: 'Muôi', cat: 'household', icon: 'ladle', buy: 2, sell: 4, weight: 0.1, vol: 0.2, perish: 0, shelf: 999, desc: 'Muôi đồng múc canh.' },
  { id: 'tray', name: 'Mâm', cat: 'household', icon: 'tray', buy: 4, sell: 7, weight: 0.4, vol: 1, perish: 0, shelf: 999, desc: 'Mâm gỗ, bưng bát.' },
  { id: 'teacup', name: 'Chén trà', cat: 'household', icon: 'teacup', buy: 2, sell: 4, weight: 0.1, vol: 0.15, perish: 0, shelf: 999, desc: 'Chén sứ nhỏ, uống trà.' },
  // materials
  { id: 'firewood', name: 'Củi', cat: 'materials', icon: 'firewood', buy: 2, sell: 3, weight: 1, vol: 1.5, perish: 0.05, shelf: 30, desc: 'Củi khô, nhóm bếp.' },
  { id: 'charcoal', name: 'Than', cat: 'materials', icon: 'charcoal', buy: 4, sell: 6, weight: 0.8, vol: 1, perish: 0, shelf: 999, desc: 'Than gỗ, nấu bếp và sưởi.' },
  { id: 'straw', name: 'Rơm', cat: 'materials', icon: 'straw', buy: 1, sell: 2, weight: 0.5, vol: 2, perish: 0.1, shelf: 20, desc: 'Rơm khô, lót chuồng và đắp nhà.' },
  { id: 'bamboo', name: 'Tre', cat: 'materials', icon: 'bamboo', buy: 3, sell: 5, weight: 0.7, vol: 2, perish: 0, shelf: 999, desc: 'Tre già, dựng nhà làm đồ dùng.' },
  { id: 'wood', name: 'Gỗ', cat: 'materials', icon: 'wood', buy: 8, sell: 12, weight: 2, vol: 2.5, perish: 0, shelf: 999, desc: 'Gỗ tốt, làm đồ gỗ và sửa nhà.' },
  { id: 'nails', name: 'Đinh sắt', cat: 'materials', icon: 'nails', buy: 5, sell: 8, weight: 0.3, vol: 0.2, perish: 0, shelf: 999, desc: 'Đinh sắt, hàng cần cho thợ mộc.' },
  { id: 'rope', name: 'Dây thừng', cat: 'materials', icon: 'rope', buy: 4, sell: 6, weight: 0.4, vol: 0.5, perish: 0, shelf: 999, desc: 'Dây gai đan, buộc gói hàng.' },
  { id: 'cloth', name: 'Vải thô', cat: 'materials', icon: 'cloth', buy: 15, sell: 24, weight: 0.8, vol: 1.2, perish: 0, shelf: 999, desc: 'Vải thô nhuộm nâu, may áo.' },
  { id: 'canvas', name: 'Vải bố', cat: 'materials', icon: 'canvas', buy: 10, sell: 16, weight: 0.9, vol: 1.2, perish: 0, shelf: 999, desc: 'Vải bố dày, may túi và bạt.' },
  { id: 'thread', name: 'Chỉ may', cat: 'materials', icon: 'thread', buy: 2, sell: 4, weight: 0.05, vol: 0.1, perish: 0, shelf: 999, desc: 'Chỉ may, cuộn nhỏ.' },
  { id: 'needle', name: 'Kim khâu', cat: 'materials', icon: 'needle', buy: 2, sell: 4, weight: 0.02, vol: 0.05, perish: 0, shelf: 999, desc: 'Kim khâu thép.' },
  { id: 'do_paper', name: 'Giấy dó', cat: 'materials', icon: 'do_paper', buy: 6, sell: 10, weight: 0.2, vol: 0.3, perish: 0, shelf: 999, desc: 'Giấy dó, viết và gói hàng.' },
  { id: 'paper', name: 'Giấy viết', cat: 'materials', icon: 'paper', buy: 4, sell: 7, weight: 0.2, vol: 0.3, perish: 0, shelf: 999, desc: 'Giấy trắng, chép sách.' },
  { id: 'ink', name: 'Mực', cat: 'materials', icon: 'ink', buy: 5, sell: 8, weight: 0.3, vol: 0.3, perish: 0, shelf: 999, desc: 'Mực đen, viết sổ.' },
  { id: 'brush', name: 'Bút lông', cat: 'materials', icon: 'brush', buy: 4, sell: 7, weight: 0.05, vol: 0.1, perish: 0, shelf: 999, desc: 'Bút lông, viết chữ.' },
  { id: 'fountain_pen', name: 'Bút máy cũ', cat: 'materials', icon: 'fountain_pen', buy: 14, sell: 22, weight: 0.1, vol: 0.1, perish: 0, shelf: 999, desc: 'Bút máy kiểu cũ, đồ của người trí thức.' },
  // medicine
  { id: 'herbal_medicine', name: 'Thuốc bắc', cat: 'medicine', icon: 'herbal_medicine', buy: 14, sell: 22, weight: 0.2, vol: 0.3, perish: 0.06, shelf: 50, desc: 'Thuốc bắc, thang nhỏ.' },
  { id: 'medicine_bag', name: 'Túi thuốc', cat: 'medicine', icon: 'medicine_bag', buy: 8, sell: 13, weight: 0.2, vol: 0.3, perish: 0, shelf: 999, desc: 'Túi vải đựng thuốc.' },
  { id: 'herb_leaves', name: 'Lá thuốc', cat: 'medicine', icon: 'herb_leaves', buy: 3, sell: 5, weight: 0.1, vol: 0.2, perish: 0.2, shelf: 6, desc: 'Lá thuốc tươi, sắc uống.' },
  { id: 'medicine_bottle', name: 'Chai thuốc', cat: 'medicine', icon: 'medicine_bottle', buy: 18, sell: 28, weight: 0.2, vol: 0.3, perish: 0.08, shelf: 40, desc: 'Chai thuốc tây, hiếm và đắt.' },
  { id: 'cotton', name: 'Bông y tế', cat: 'medicine', icon: 'cotton', buy: 4, sell: 7, weight: 0.1, vol: 0.2, perish: 0, shelf: 999, desc: 'Bông cuộn, băng vết thương.' },
  { id: 'bandage', name: 'Băng vải', cat: 'medicine', icon: 'bandage', buy: 5, sell: 8, weight: 0.1, vol: 0.2, perish: 0, shelf: 999, desc: 'Băng vải sạch.' },
  { id: 'antiseptic', name: 'Thuốc sát trùng', cat: 'medicine', icon: 'antiseptic', buy: 16, sell: 25, weight: 0.2, vol: 0.3, perish: 0.05, shelf: 45, desc: 'Thuốc sát trùng, cồn i-ốt.' },
  { id: 'medicine_box', name: 'Hộp thuốc', cat: 'medicine', icon: 'medicine_box', buy: 7, sell: 11, weight: 0.4, vol: 0.5, perish: 0, shelf: 999, desc: 'Hộp gỗ đựng thuốc.' },
  { id: 'balm', name: 'Cao xoa', cat: 'medicine', icon: 'balm', buy: 9, sell: 14, weight: 0.1, vol: 0.1, perish: 0, shelf: 999, desc: 'Cao xoa gió, hộp nhỏ.' },
  { id: 'rub_oil', name: 'Dầu xoa', cat: 'medicine', icon: 'rub_oil', buy: 8, sell: 13, weight: 0.1, vol: 0.15, perish: 0, shelf: 999, desc: 'Dầu xoa gió, chai nhỏ.' },
  { id: 'quinine', name: 'Thuốc sốt rét', cat: 'medicine', icon: 'quinine', buy: 35, sell: 55, weight: 0.05, vol: 0.1, perish: 0.03, shelf: 60, desc: 'Thuốc sốt rét, hàng cứu người.' },
  { id: 'ointment', name: 'Thuốc mỡ', cat: 'medicine', icon: 'ointment', buy: 7, sell: 11, weight: 0.1, vol: 0.1, perish: 0.1, shelf: 30, desc: 'Thuốc mỡ bôi ngoài da.' },
  // valuables
  { id: 'fine_cloth', name: 'Vải tốt', cat: 'valuables', icon: 'fine_cloth', buy: 35, sell: 55, weight: 0.8, vol: 1.2, perish: 0, shelf: 999, desc: 'Vải đẹp, hàng nhà giàu.' },
  { id: 'brass_item', name: 'Đồ đồng', cat: 'valuables', icon: 'brass_item', buy: 30, sell: 48, weight: 1.2, vol: 1, perish: 0, shelf: 999, desc: 'Đồ đồng thau, tiền cũ.' },
  { id: 'silver_item', name: 'Đồ bạc', cat: 'valuables', icon: 'silver_item', buy: 55, sell: 85, weight: 0.8, vol: 0.8, perish: 0, shelf: 999, desc: 'Đồ bạc, của để dành.' },
  { id: 'silver_bracelet', name: 'Vòng bạc', cat: 'valuables', icon: 'silver_bracelet', buy: 45, sell: 70, weight: 0.2, vol: 0.2, perish: 0, shelf: 999, desc: 'Vòng bạc, nữ nhân đeo.' },
  { id: 'ring', name: 'Nhẫn', cat: 'valuables', icon: 'ring', buy: 38, sell: 60, weight: 0.05, vol: 0.05, perish: 0, shelf: 999, desc: 'Nhẫn vàng bạc, món kỷ vật.' },
  { id: 'pocket_watch', name: 'Đồng hồ cơ', cat: 'valuables', icon: 'pocket_watch', buy: 60, sell: 95, weight: 0.2, vol: 0.2, perish: 0, shelf: 999, desc: 'Đồng hồ quả quýt, hàng sang.' },
  { id: 'wooden_box', name: 'Hộp gỗ', cat: 'valuables', icon: 'wooden_box', buy: 12, sell: 20, weight: 0.6, vol: 0.8, perish: 0, shelf: 999, desc: 'Hộp gỗ đóng đồ quý.' },
  { id: 'fine_ceramic', name: 'Gốm tốt', cat: 'valuables', icon: 'fine_ceramic', buy: 22, sell: 35, weight: 0.7, vol: 0.9, perish: 0, shelf: 999, desc: 'Gốm men xanh, đẹp.' },
  { id: 'painting', name: 'Tranh giấy', cat: 'valuables', icon: 'painting', buy: 28, sell: 45, weight: 0.3, vol: 0.6, perish: 0.02, shelf: 200, desc: 'Tranh giấy, của chơi.' },
  { id: 'antique', name: 'Đồ cổ', cat: 'valuables', icon: 'antique', buy: 50, sell: 80, weight: 0.9, vol: 1, perish: 0, shelf: 999, desc: 'Đồ cổ, người sành mới mua.' },
  { id: 'old_book', name: 'Sách cũ', cat: 'valuables', icon: 'old_book', buy: 15, sell: 25, weight: 0.4, vol: 0.5, perish: 0.03, shelf: 300, desc: 'Sách cũ, còn đọc được.' },
  { id: 'map', name: 'Bản đồ', cat: 'valuables', icon: 'map', buy: 18, sell: 30, weight: 0.1, vol: 0.2, perish: 0.02, shelf: 300, desc: 'Bản đồ cũ, hiếm.' },
  { id: 'stamped_paper', name: 'Giấy tờ có dấu', cat: 'valuables', icon: 'stamped_paper', buy: 20, sell: 32, weight: 0.05, vol: 0.1, perish: 0, shelf: 999, desc: 'Giấy tờ đóng dấu, có giá trị.' },
  { id: 'tea_set', name: 'Bộ ấm trà', cat: 'valuables', icon: 'tea_set', buy: 26, sell: 42, weight: 1, vol: 1.2, perish: 0, shelf: 999, desc: 'Bộ ấm chén sứ, đãi khách quý.' },
  // special
  { id: 'ration_book', name: 'Sổ phân phối', cat: 'special', icon: 'ration_book', buy: 10, sell: 16, weight: 0.1, vol: 0.1, perish: 0, shelf: 999, desc: 'Sổ ghi quota lương thực, hàng nhạy cảm.' },
  { id: 'coupon', name: 'Phiếu mua hàng', cat: 'special', icon: 'coupon', buy: 6, sell: 10, weight: 0.02, vol: 0.02, perish: 0, shelf: 999, desc: 'Phiếu đổi hàng, có thể dùng thay tiền.' },
  { id: 'iou_note', name: 'Giấy ghi nợ', cat: 'special', icon: 'iou_note', buy: 5, sell: 8, weight: 0.02, vol: 0.02, perish: 0, shelf: 999, desc: 'Giấy nợ, bằng chứng cho món nợ.' },
  { id: 'shipping_paper', name: 'Giấy vận chuyển', cat: 'special', icon: 'shipping_paper', buy: 8, sell: 13, weight: 0.02, vol: 0.02, perish: 0, shelf: 999, desc: 'Giấy phép vận chuyển hàng.' },
  { id: 'id_paper', name: 'Giấy tờ tùy thân', cat: 'special', icon: 'id_paper', buy: 7, sell: 12, weight: 0.02, vol: 0.02, perish: 0, shelf: 999, desc: 'Giấy tờ thân phận, cần giữ kỹ.' },
  { id: 'stamp', name: 'Tem kiểm hàng', cat: 'special', icon: 'stamp', buy: 9, sell: 15, weight: 0.01, vol: 0.01, perish: 0, shelf: 999, desc: 'Tem kiểm tra hàng hóa.' },
  { id: 'marked_sack', name: 'Bao có dấu', cat: 'special', icon: 'marked_sack', buy: 30, sell: 48, weight: 10, vol: 4, perish: 0.04, shelf: 50, desc: 'Bao hàng có dấu lạ, nguồn gốc không rõ.' },
  { id: 'secret_package', name: 'Gói hàng bí mật', cat: 'special', icon: 'secret_package', buy: 25, sell: 40, weight: 1, vol: 1, perish: 0.05, shelf: 30, desc: 'Gói hàng gói kỹ, không ghi gì.' },
  { id: 'damaged_goods', name: 'Hàng hư', cat: 'special', icon: 'damaged_goods', buy: 1, sell: 1, weight: 1, vol: 1, perish: 0.5, shelf: 2, desc: 'Hàng hư hỏng, chỉ bán rẻ hoặc bỏ.' },
  { id: 'fake_goods', name: 'Hàng giả', cat: 'special', icon: 'fake_goods', buy: 4, sell: 6, weight: 1, vol: 1, perish: 0.1, shelf: 10, desc: 'Hàng giả mạo, bán sẽ mất uy tín.' },
  { id: 'unmarked_goods', name: 'Hàng không rõ nguồn', cat: 'special', icon: 'unmarked_goods', buy: 8, sell: 13, weight: 1, vol: 1, perish: 0.1, shelf: 15, desc: 'Hàng không nhãn, mua rẻ nhưng rủi ro.' },
];

export function renderItemIcon(def, scale = 2) {
  return drawItem(def).scale(scale);
}

export const ITEM_CATEGORIES = {
  food: { label: 'Lương thực', color: '#8a9a5a' },
  household: { label: 'Vật dụng', color: '#b98a3e' },
  materials: { label: 'Vật liệu', color: '#8a7a5a' },
  medicine: { label: 'Y tế', color: '#a83226' },
  valuables: { label: 'Hàng quý', color: '#d9a441' },
  special: { label: 'Giấy tờ & đặc biệt', color: '#5a7a8a' },
};
