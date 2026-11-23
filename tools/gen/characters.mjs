// Parametric pixel-art characters: 48x64 sprites and 96x96 portraits.
import { Surface, hex, mul, mix, withAlpha, rngFor } from '../lib/pixel.mjs';
import { PAL, roundRect, vgrad } from '../lib/draw.mjs';

const W = 48, H = 64;

// ---------------------------------------------------------------- helpers --
function layer(w, h, fn, outlineColor = PAL.ink) {
  const s = new Surface(w, h);
  fn(s);
  if (outlineColor) s.outline(outlineColor, true);
  return s;
}

function blit(dst, src, x, y) {
  dst.copy(src, x, y);
}

const SKIN = ['#e9b98f', '#d19b6c', '#b0784b', '#8d5a36'];
const HAIR = ['#241a14', '#3a2a1e', '#4a3524', '#6b5a44', '#8d8578', '#d8d0bd'];

function col(c) { return hex(c); }

function shade(c, f) { return mul(col(c), f); }

// ------------------------------------------------------------- front body --
function drawLegs(s, p, frame = 0, step = 0) {
  const pants = p.pants || '#3a3228';
  const hipY = 43;
  const legW = p.build === 'stout' ? 7 : p.build === 'slim' ? 5 : 6;
  const gap = p.build === 'stout' ? 2 : 3;
  const leftX = 24 - gap - legW;
  const rightX = 24 + gap;
  const l1 = layer(legW + 2, 21, (t) => {
    t.rect(1, 1, legW, 18, pants);
    t.vline(1, 1, 18, shade(pants, 1.16));
    t.vline(legW, 1, 18, shade(pants, 0.72));
    t.hline(1, 1, legW, shade(pants, 1.2));
  });
  const l2 = layer(legW + 2, 21, (t) => {
    t.rect(1, 1, legW, 18, pants);
    t.vline(1, 1, 18, shade(pants, 1.16));
    t.vline(legW, 1, 18, shade(pants, 0.72));
    t.hline(1, 1, legW, shade(pants, 1.2));
  });
  blit(s, l1, leftX - 1, hipY - 1 + Math.max(0, step));
  blit(s, l2, rightX - 1, hipY - 1 + Math.max(0, -step));
  // feet / sandals
  const foot = layer(legW + 4, 5, (t) => {
    t.rect(1, 1, legW + 2, 3, p.sandals || '#4a3524');
    t.hline(1, 1, legW + 2, shade(p.sandals || '#4a3524', 1.3));
    t.set(1, 3, shade(p.sandals || '#4a3524', 0.7));
  });
  blit(s, foot, leftX - 2, 58 + Math.max(0, step));
  blit(s, foot, rightX - 2, 58 + Math.max(0, -step));
}

function drawTorso(s, p, frame = 0) {
  const shirt = p.shirt || '#7b5a3e';
  const build = p.build || 'normal';
  const shoulderW = build === 'stout' ? 24 : build === 'slim' ? 19 : 21;
  const waistW = build === 'stout' ? 20 : build === 'slim' ? 15 : 17;
  const topY = 23;
  const botY = 45;
  const t = new Surface(30, 24);
  const x0 = 15 - Math.floor(shoulderW / 2) + 15;
  // build silhouette with rows
  for (let y = 0; y < 22; y++) {
    const frac = y / 21;
    const wdt = Math.round(shoulderW + (waistW - shoulderW) * frac);
    const xx = 15 - Math.floor(wdt / 2);
    t.rect(xx, y, wdt, 1, shirt);
  }
  // shading
  for (let y = 0; y < 22; y++) {
    const frac = y / 21;
    const wdt = Math.round(shoulderW + (waistW - shoulderW) * frac);
    const xx = 15 - Math.floor(wdt / 2);
    t.vline(xx, y, 1, shade(shirt, 1.18));
    t.vline(xx + wdt - 1, y, 1, shade(shirt, 0.66));
    t.vline(xx + wdt - 2, y, 1, shade(shirt, 0.8));
  }
  // collar / neckline
  const collar = p.collar || shade(shirt, 1.35);
  if (p.clothing === 'vest') {
    // shirt underneath + vest panels
    t.rect(12, 0, 6, 12, p.undershirt || '#d8c9a8');
    t.rect(12, 0, 3, 12, shade(p.undershirt || '#d8c9a8', 0.82));
    const vc = p.vest || '#4a3a2c';
    for (let y = 0; y < 21; y++) {
      const frac = y / 21;
      const wdt = Math.round(shoulderW + (waistW - shoulderW) * frac);
      const xx = 15 - Math.floor(wdt / 2);
      t.rect(xx, y, Math.floor(wdt / 2) - 2, 1, vc);
      t.rect(xx + Math.ceil(wdt / 2) + 2, y, Math.floor(wdt / 2) - 2, 1, vc);
    }
    t.vline(15, 4, 15, shade(vc, 0.6));
  } else if (p.clothing === 'ao_ba_ba' || p.clothing === 'ao_canh' || p.clothing === 'tu_than') {
    // diagonal placket from left collar to right hip
    for (let i = 0; i < 14; i++) {
      const y = 2 + i, x = 17 + Math.floor(i * 0.55);
      t.set(x, y, shade(shirt, 0.66));
      t.set(x + 1, y, shade(shirt, 1.18));
    }
    // buttons
    for (let i = 0; i < 4; i++) {
      const y = 6 + i * 4, x = 18 + Math.floor((y - 2) * 0.55);
      t.set(x, y, p.buttons || '#2a1e14');
    }
    // collar V
    t.line(15, 0, 18, 5, collar);
    t.line(21, 0, 18, 5, collar);
    t.set(15, 0, collar); t.set(21, 0, collar);
  } else if (p.clothing === 'blouse') {
    // apron
    t.rect(12, 6, 6, 15, p.apron || '#c9b083');
    t.vline(12, 6, 15, shade(p.apron || '#c9b083', 0.8));
    t.vline(17, 6, 15, shade(p.apron || '#c9b083', 0.8));
    t.hline(12, 6, 6, shade(p.apron || '#c9b083', 1.2));
    t.rect(13, 0, 4, 5, p.undershirt || '#d8c9a8');
  } else if (p.clothing === 'rag') {
    for (let i = 0; i < 8; i++) {
      const x = 8 + (i * 7) % 14, y = 3 + (i * 5) % 17;
      t.rect(x, y, 3, 2, i % 2 ? shade(shirt, 0.7) : shade(shirt, 1.16));
    }
    t.line(15, 0, 18, 5, collar);
    t.line(21, 0, 18, 5, collar);
  } else if (p.clothing === 'coat') {
    t.rect(15, 0, 3, 21, shade(shirt, 0.72));
    t.vline(18, 0, 21, shade(shirt, 1.2));
    t.hline(13, 0, 9, shade(shirt, 1.16));
  }
  // sash / belt
  if (p.sash) {
    t.rect(8, 15, 14, 3, p.sash);
    t.hline(8, 15, 14, shade(p.sash, 1.2));
    t.hline(8, 17, 14, shade(p.sash, 0.7));
  }
  const torso = layer(30, 24, (x) => x.copy(t, 0, 0));
  blit(s, torso, 9, topY - 1);
  return { topY, botY };
}

function drawArms(s, p, frame = 0, expr = 'neutral') {
  const shirt = p.shirt || '#7b5a3e';
  const skin = p.skin || '#d19b6c';
  const build = p.build || 'normal';
  const armW = build === 'stout' ? 7 : build === 'slim' ? 4 : 5;
  const shoulderY = 25;
  const armLen = 17;
  const swing = p.armSwing || 0;
  const mkArm = (side) => {
    const wdt = armW + 4;
    const t = new Surface(wdt, armLen + 6);
    // sleeve
    t.rect(1, 1, armW, armLen - 3, shirt);
    t.vline(1, 1, armLen - 3, shade(shirt, 1.15));
    t.vline(armW, 1, armLen - 3, shade(shirt, 0.66));
    t.hline(1, 1, armW, shade(shirt, 1.22));
    // hand
    t.rect(1, armLen - 3, armW, 4, skin);
    t.hline(1, armLen - 3, armW, shade(skin, 1.15));
    t.hline(1, armLen, armW, shade(skin, 0.72));
    return t;
  };
  const leftArm = layer(armW + 6, armLen + 8, (t) => { t.copy(mkArm(-1), 2, 1); });
  const rightArm = layer(armW + 6, armLen + 8, (t) => { t.copy(mkArm(1), 2, 1); });
  blit(s, leftArm, 7 + swing, shoulderY);
  blit(s, rightArm, 36 - swing, shoulderY);
}

function drawHead(s, p, expr = 'neutral', dir = 'front') {
  const skin = p.skin || '#d19b6c';
  const headW = p.headW || 14;
  const headH = p.headH || 14;
  const x = 24 - Math.floor(headW / 2);
  const y = 6;
  const t = new Surface(22, 22);
  const cx = 11, cy = 11;
  // neck
  t.rect(cx - 3, 15, 6, 6, shade(skin, 0.86));
  t.rect(cx - 3, 15, 2, 6, shade(skin, 0.76));
  // head shape
  for (let yy = 0; yy < headH; yy++) {
    const frac = yy / (headH - 1);
    let wdt = headW;
    if (yy < 2) wdt = headW - 3;
    if (yy >= headH - 4) wdt = headW - 2 - (yy - (headH - 4));
    const xx = cx - Math.floor(wdt / 2);
    t.rect(xx, cy - Math.floor(headH / 2) + yy, wdt, 1, skin);
  }
  // shading
  const leftEdge = cx - Math.floor(headW / 2);
  for (let yy = 1; yy < headH - 3; yy++) {
    t.vline(leftEdge, cy - Math.floor(headH / 2) + yy, 1, shade(skin, 1.12));
    t.vline(leftEdge + headW - 1, cy - Math.floor(headH / 2) + yy, 1, shade(skin, 0.76));
  }
  // ears
  t.rect(cx - Math.floor(headW / 2) - 1, cy - 1, 2, 4, skin);
  t.rect(cx + Math.floor(headW / 2) - 1, cy - 1, 2, 4, shade(skin, 0.86));
  // face
  const fy = cy - 2;
  const eyeY = fy;
  const eyeCol = '#241a14';
  if (dir === 'front') {
    if (expr === 'happy') {
      t.hline(cx - 4, eyeY + 1, 2, eyeCol); t.set(cx - 3, eyeY, eyeCol);
      t.hline(cx + 2, eyeY + 1, 2, eyeCol); t.set(cx + 3, eyeY, eyeCol);
    } else if (expr === 'sad') {
      t.hline(cx - 4, eyeY, 2, eyeCol); t.set(cx - 3, eyeY + 1, eyeCol);
      t.hline(cx + 2, eyeY, 2, eyeCol); t.set(cx + 3, eyeY + 1, eyeCol);
    } else if (expr === 'angry') {
      t.hline(cx - 4, eyeY + 1, 2, eyeCol);
      t.hline(cx + 2, eyeY + 1, 2, eyeCol);
      t.line(cx - 5, eyeY - 2, cx - 2, eyeY, eyeCol);
      t.line(cx + 4, eyeY - 2, cx + 1, eyeY, eyeCol);
    } else if (expr === 'surprised') {
      t.rect(cx - 4, eyeY, 2, 2, '#f2e7d0');
      t.set(cx - 4, eyeY + 1, eyeCol);
      t.rect(cx + 2, eyeY, 2, 2, '#f2e7d0');
      t.set(cx + 3, eyeY + 1, eyeCol);
    } else if (expr === 'tired') {
      t.hline(cx - 4, eyeY + 1, 2, eyeCol);
      t.hline(cx + 2, eyeY + 1, 2, eyeCol);
      t.hline(cx - 4, eyeY, 2, shade(skin, 0.82));
      t.hline(cx + 2, eyeY, 2, shade(skin, 0.82));
    } else {
      t.rect(cx - 4, eyeY, 2, 1, eyeCol);
      t.rect(cx + 2, eyeY, 2, 1, eyeCol);
    }
    // brows
    const browCol = p.hairColor && p.age === 'old' ? shade(p.hairColor, 1.1) : '#3a281c';
    t.hline(cx - 5, eyeY - 2, 3, browCol);
    t.hline(cx + 2, eyeY - 2, 3, browCol);
    // nose
    t.set(cx, eyeY + 3, shade(skin, 0.72));
    t.set(cx + 1, eyeY + 3, shade(skin, 0.85));
    // mouth
    const my = eyeY + 5;
    if (expr === 'happy') { t.hline(cx - 2, my, 4, '#8a3a32'); t.set(cx - 1, my + 1, '#8a3a32'); t.set(cx + 2, my + 1, '#8a3a32'); }
    else if (expr === 'sad') { t.hline(cx - 2, my + 1, 4, '#8a3a32'); }
    else if (expr === 'angry') { t.hline(cx - 2, my, 4, '#6a2a24'); }
    else if (expr === 'surprised') { t.ellipse(cx, my, 1, 1, '#8a3a32'); }
    else if (expr === 'tired') { t.hline(cx - 2, my, 3, '#8a3a32'); }
    else { t.hline(cx - 1, my, 3, '#8a3a32'); }
    // age lines
    if (p.age === 'old') {
      t.set(cx - 4, eyeY + 2, shade(skin, 0.8));
      t.set(cx + 4, eyeY + 2, shade(skin, 0.8));
      t.hline(cx - 2, my + 3, 4, shade(skin, 0.82));
    }
    // facial hair
    if (p.beard) {
      const bc = p.beardColor || p.hairColor || '#3a2a1e';
      t.rect(cx - 4, my + 1, 9, 3, bc);
      t.rect(cx - 3, my + 4, 7, 1, bc);
      t.set(cx - 4, my, bc); t.set(cx + 4, my, bc);
    } else if (p.mustache) {
      t.hline(cx - 3, my - 1, 7, p.beardColor || p.hairColor || '#3a2a1e');
    }
  } else if (dir === 'side') {
    t.rect(cx + 1, eyeY, 2, 1, eyeCol);
    t.hline(cx, eyeY - 2, 3, '#3a281c');
    t.set(cx + 5, eyeY + 3, shade(skin, 0.72));
    t.hline(cx + 2, eyeY + 5, 3, '#8a3a32');
    if (p.beard) t.rect(cx + 1, eyeY + 5, 5, 3, p.beardColor || p.hairColor || '#3a2a1e');
  }
  // hair
  drawHair(t, p, cx, cy, headW, headH);
  const head = layer(22, 22, (x) => x.copy(t, 0, 0));
  blit(s, head, x - 4, y - 5);
}

function drawHair(t, p, cx, cy, headW, headH) {
  const hair = p.hairColor || '#241a14';
  const style = p.hairStyle || 'short';
  const top = cy - Math.floor(headH / 2);
  const left = cx - Math.floor(headW / 2);
  if (style === 'bald') {
    t.rect(left + 1, top + 3, 2, 4, hair);
    t.rect(left + headW - 3, top + 3, 2, 4, hair);
    return;
  }
  if (style === 'conical') {
    // normal hair under the nón lá; the hat itself is drawn as an overlay
    t.rect(left + 1, top + 1, headW - 2, 3, hair);
    t.hline(left + 2, top + 1, headW - 4, shade(hair, 1.25));
    return;
  }
  if (style === 'headscarf') {
    t.rect(left, top + 1, headW, 5, hair);
    t.rect(left - 1, top + 2, 2, 6, hair);
    t.rect(left + headW - 1, top + 2, 2, 6, hair);
    t.hline(left, top + 1, headW, shade(hair, 1.25));
    t.rect(left + headW - 1, top + 6, 3, 3, shade(hair, 0.9));
    return;
  }
  if (style === 'bun') {
    t.ellipse(cx + 3, top - 1, 4, 3, hair);
    t.ellipse(cx + 2, top - 1, 2, 2, shade(hair, 1.3));
  } else if (style === 'topknot') {
    t.rect(cx - 1, top - 3, 3, 4, hair);
    t.rect(cx, top - 4, 1, 1, shade(hair, 1.3));
  }
  // main hair cap
  t.rect(left, top, headW, 4, hair);
  t.rect(left - 1, top + 1, 2, 6, hair);
  t.rect(left + headW - 1, top + 1, 2, 6, hair);
  t.rect(left + 1, top + 4, 3, 2, hair);
  t.rect(left + headW - 4, top + 4, 3, 2, hair);
  t.hline(left + 1, top, headW - 2, shade(hair, 1.3));
  if (style === 'long' || style === 'braid') {
    t.rect(left - 1, top + 5, 3, 9, hair);
    t.rect(left + headW - 2, top + 5, 3, 9, hair);
    if (style === 'braid') {
      for (let i = 0; i < 4; i++) t.rect(cx - 2, top + 8 + i * 3, 4, 2, i % 2 ? shade(hair, 1.2) : hair);
    }
  }
}

function drawAccessories(s, p, frame = 0) {
  const skin = p.skin || '#d19b6c';
  const acc = p.accessory;
  if (!acc) return;
  if (acc === 'basket') {
    const t = layer(18, 14, (x) => {
      x.poly([[1, 3], [16, 3], [14, 12], [3, 12]], '#b08a52');
      for (let yy = 4; yy < 12; yy += 2) x.hline(2, yy, 13, '#7a5a32');
      x.hline(1, 3, 16, '#d8b07a');
      x.ellipseOutline(8, 3, 7, 4, '#8a6a44');
    });
    blit(s, t, 29, 35);
  } else if (acc === 'pole') {
    // shoulder pole with two baskets behind
    const t = layer(48, 26, (x) => {
      x.line(0, 10, 47, 6, '#8a6238');
      x.line(1, 11, 46, 7, '#b08a52');
      x.ellipse(5, 20, 5, 5, '#b08a52');
      x.ellipse(42, 18, 5, 5, '#b08a52');
      x.hline(0, 16, 8, '#8a6a44');
      x.hline(38, 14, 8, '#8a6a44');
    });
    blit(s, t, 0, 4);
  } else if (acc === 'pipe') {
    const t = layer(10, 6, (x) => {
      x.line(1, 4, 8, 1, '#6b4a2f');
      x.rect(7, 0, 2, 2, '#3a2a1c');
      x.set(8, 0, '#e0b04a');
    });
    blit(s, t, 27, 20);
  } else if (acc === 'bag') {
    const t = layer(14, 12, (x) => {
      x.rect(1, 2, 12, 9, '#8a6a44');
      x.rect(2, 3, 10, 7, '#a8864e');
      x.line(1, 2, 12, 10, '#6a4a2e');
      x.hline(2, 3, 10, '#c9a86a');
    });
    blit(s, t, 29, 33);
  } else if (acc === 'cane') {
    const t = layer(5, 26, (x) => {
      x.line(2, 25, 2, 2, '#8a6238');
      x.set(1, 1, '#b08a52');
    });
    blit(s, t, 34, 36);
  } else if (acc === 'book') {
    const t = layer(12, 10, (x) => {
      x.rect(1, 1, 10, 8, '#7a3a2a');
      x.rect(2, 2, 8, 6, '#e8dcc0');
      x.hline(3, 4, 6, '#8a6a44');
      x.hline(3, 6, 5, '#8a6a44');
    });
    blit(s, t, 27, 34);
  } else if (acc === 'fish') {
    const t = layer(16, 10, (x) => {
      x.ellipse(8, 5, 6, 3, '#8fa3a5');
      x.poly([[13, 5], [16, 2], [16, 8]], '#8fa3a5');
      x.set(4, 4, '#241711');
    });
    blit(s, t, 27, 32);
  } else if (acc === 'scarf') {
    const t = layer(18, 8, (x) => {
      x.rect(1, 1, 16, 4, p.scarfColor || '#2a2a2a');
      x.hline(1, 1, 16, shade(p.scarfColor || '#2a2a2a', 1.4));
      x.rect(13, 4, 4, 3, p.scarfColor || '#2a2a2a');
    });
    blit(s, t, 15, 21);
  }
}

// --------------------------------------------------------------- sprites ---
export function drawCharacter(p, dir = 'front', frame = 0, expr = 'neutral') {
  const s = new Surface(W, H);
  const breathe = frame === 1 ? 1 : 0;
  if (p.accessory === 'pole') drawAccessories(s, { ...p, accessory: 'pole' }, frame);
  if (p.accessory === 'scarf') {
    // behind neck
  }
  if (dir === 'front') {
    drawLegs(s, p, frame, 0);
    drawTorso(s, p, frame);
    drawArms(s, p, frame, expr);
    // shift torso/head up 1 on breathe for a subtle idle
    drawHead(s, p, expr, 'front');
    if (p.accessory && p.accessory !== 'pole') drawAccessories(s, p, frame);
    if (p.hat === 'conical') {
      // hat drawn after head
      const t = layer(30, 16, (x) => {
        x.poly([[15, 0], [3, 10], [27, 10]], '#c9a86a');
        x.poly([[15, 0], [3, 10], [15, 10]], '#e0c58a');
        x.hline(3, 10, 24, '#8a6a44');
        x.line(8, 8, 14, 2, '#f0dca8');
      });
      blit(s, t, 9, 0);
    }
  } else if (dir === 'back') {
    const step = frame === 1 ? 1 : 0;
    drawLegs(s, p, frame, step);
    drawTorso(s, p, frame);
    // back hair / head
    const t = new Surface(22, 22);
    const skin = p.skin || '#d19b6c';
    const hair = p.hairColor || '#241a14';
    t.rect(8, 15, 6, 6, shade(skin, 0.86));
    for (let yy = 0; yy < 14; yy++) {
      let wdt = 14;
      if (yy < 2) wdt = 11;
      if (yy >= 10) wdt = 12 - (yy - 10);
      t.rect(11 - Math.floor(wdt / 2), 4 + yy, wdt, 1, hair);
    }
    t.rect(7, 7, 3, 8, hair);
    t.rect(19, 7, 3, 8, hair);
    if (p.hairStyle === 'bun') t.ellipse(14, 5, 4, 3, hair);
    if (p.hairStyle === 'topknot') t.rect(13, 2, 3, 4, hair);
    if (p.hairStyle === 'long' || p.hairStyle === 'braid') {
      t.rect(7, 15, 3, 7, hair);
      t.rect(19, 15, 3, 7, hair);
    }
    if (p.hat === 'conical') {
      t.poly([[11, 1], [1, 12], [21, 12]], '#c9a86a');
      t.poly([[11, 1], [1, 12], [11, 12]], '#e0c58a');
      t.hline(1, 12, 20, '#8a6a44');
    }
    const head = layer(22, 22, (x) => x.copy(t, 0, 0));
    blit(s, head, 13, 1);
    drawArms(s, p, frame, expr);
    if (p.accessory && p.accessory !== 'pole') drawAccessories(s, p, frame);
  } else {
    // side view, facing right
    const step = frame === 1 ? 2 : frame === 3 ? -2 : 0;
    const s2 = new Surface(W, H);
    // back leg
    const pants = p.pants || '#3a3228';
    const leg = layer(9, 22, (x) => {
      x.rect(1, 1, 6, 18, pants);
      x.vline(1, 1, 18, shade(pants, 1.16));
      x.vline(6, 1, 18, shade(pants, 0.7));
      x.rect(1, 18, 8, 3, p.sandals || '#4a3524');
    });
    blit(s2, leg, 21, 42 + Math.max(0, step));
    // torso side
    const shirt = p.shirt || '#7b5a3e';
    const t = layer(22, 24, (x) => {
      roundRect(x, 1, 1, 18, 22, 4, shirt);
      x.vline(1, 3, 18, shade(shirt, 1.15));
      x.vline(18, 3, 18, shade(shirt, 0.7));
      if (p.sash) { x.rect(1, 14, 18, 3, p.sash); x.hline(1, 14, 18, shade(p.sash, 1.2)); }
      if (p.clothing === 'ao_ba_ba') {
        x.line(2, 2, 8, 18, shade(shirt, 0.7));
      }
    });
    blit(s2, t, 14, 22);
    // head side
    const head = layer(20, 20, (x) => {
      const skin = p.skin || '#d19b6c';
      x.rect(7, 12, 6, 5, shade(skin, 0.86));
      for (let yy = 0; yy < 14; yy++) {
        let wdt = 13;
        if (yy < 2) wdt = 10;
        if (yy >= 11) wdt = 11 - (yy - 11);
        x.rect(7, 3 + yy, wdt, 1, skin);
      }
      x.vline(7, 4, 12, shade(skin, 1.12));
      x.vline(19, 4, 12, shade(skin, 0.78));
      // eye + brow
      x.rect(14, 9, 2, 1, '#241a14');
      x.hline(13, 7, 3, '#3a281c');
      x.set(19, 11, shade(skin, 0.72));
      x.hline(15, 13, 3, '#8a3a32');
      // hair
      const hair = p.hairColor || '#241a14';
      x.rect(6, 2, 14, 5, hair);
      x.rect(5, 3, 3, 9, hair);
      x.rect(18, 3, 3, 6, hair);
      if (p.hairStyle === 'bun') x.ellipse(5, 4, 3, 3, hair);
      if (p.hairStyle === 'topknot') x.rect(10, 0, 3, 3, hair);
      if (p.hat === 'conical') {
        x.poly([[11, -4], [0, 8], [22, 8]], '#c9a86a');
        x.poly([[11, -4], [0, 8], [11, 8]], '#e0c58a');
      }
      if (p.beard) x.rect(15, 13, 4, 3, p.beardColor || hair);
    });
    blit(s2, head, 12, 1);
    // arm
    const arm = layer(7, 18, (x) => {
      x.rect(1, 1, 4, 13, shirt);
      x.vline(1, 1, 13, shade(shirt, 1.15));
      x.vline(4, 1, 13, shade(shirt, 0.72));
      x.rect(1, 13, 4, 4, p.skin || '#d19b6c');
    });
    blit(s2, arm, 22 - Math.floor(step / 2), 25);
    // front leg
    blit(s2, leg, 20, 42 + Math.max(0, -step));
    s2.outline(PAL.ink, true);
    return s2;
  }
  if (p.accessory === 'pole') {
    // redraw pole in front of body
    drawAccessories(s, p, frame);
  }
  return s;
}

// -------------------------------------------------------------- portrait ---
export function drawPortrait(p, expr = 'neutral') {
  const S = 96;
  const s = new Surface(S, S);
  const rng = rngFor(p.id + expr);
  // background: warm vignette
  vgrad(s, 0, 0, S, S, '#3a2a1e', '#1d140e');
  s.ellipse(48, 44, 42, 42, withAlpha(hex('#6b4a2a'), 70));
  s.ellipse(48, 40, 30, 30, withAlpha(hex('#8a6238'), 45));
  // subtle texture
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(rng() * S), y = Math.floor(rng() * S);
    s.set(x, y, withAlpha(hex('#c9a86a'), 12));
  }
  const skin = p.skin || '#d19b6c';
  const hair = p.hairColor || '#241a14';
  const shirt = p.shirt || '#7b5a3e';

  // shoulders / clothing
  const sh = layer(S, 34, (x) => {
    x.poly([[6, 34], [16, 8], [38, 2], [58, 2], [80, 8], [90, 34]], shirt);
    x.poly([[16, 8], [38, 2], [58, 2], [80, 8], [74, 20], [22, 20]], shade(shirt, 1.1));
    // collar
    if (p.clothing === 'ao_ba_ba' || p.clothing === 'ao_canh' || p.clothing === 'tu_than') {
      x.line(30, 2, 48, 22, shade(shirt, 1.4));
      x.line(66, 2, 48, 22, shade(shirt, 1.4));
      x.line(32, 2, 48, 20, shade(shirt, 0.7));
      for (let i = 0; i < 4; i++) x.set(44 + i * 2, 12 + i * 4, '#2a1e14');
    } else if (p.clothing === 'vest') {
      x.poly([[6, 34], [16, 8], [30, 4], [30, 34]], p.vest || '#4a3a2c');
      x.poly([[90, 34], [80, 8], [66, 4], [66, 34]], p.vest || '#4a3a2c');
      x.rect(30, 4, 36, 30, p.undershirt || '#d8c9a8');
    } else if (p.clothing === 'blouse') {
      x.poly([[30, 2], [66, 2], [60, 20], [36, 20]], p.apron || '#c9b083');
      x.line(30, 2, 36, 20, shade(p.apron || '#c9b083', 0.75));
      x.line(66, 2, 60, 20, shade(p.apron || '#c9b083', 0.75));
    }
    if (p.scarf) {
      x.rect(28, 0, 40, 8, p.scarfColor || '#2a2a2a');
      x.hline(28, 0, 40, shade(p.scarfColor || '#2a2a2a', 1.5));
      x.rect(62, 7, 8, 12, p.scarfColor || '#2a2a2a');
    }
  });
  blit(s, sh, 0, 62);

  // neck
  const neck = layer(18, 16, (x) => {
    x.rect(2, 2, 14, 12, shade(skin, 0.82));
    x.rect(2, 2, 5, 12, shade(skin, 0.72));
    x.rect(12, 2, 4, 12, shade(skin, 0.9));
    x.hline(2, 2, 14, shade(skin, 0.7));
  });
  blit(s, neck, 39, 56);

  // head
  const head = new Surface(60, 62);
  const hx = 30, hy = 30;
  const faceW = p.headW ? 36 + (p.headW - 14) * 2 : 38;
  const faceH = p.headH ? 44 + (p.headH - 14) * 2 : 44;
  const top = hy - Math.floor(faceH / 2);
  const left = hx - Math.floor(faceW / 2);
  // skull
  for (let yy = 0; yy < faceH; yy++) {
    let wdt = faceW;
    if (yy < 4) wdt = faceW - 8 + yy * 2;
    if (yy >= faceH - 10) wdt = faceW - (yy - (faceH - 10)) * 2;
    const xx = hx - Math.floor(wdt / 2);
    head.rect(xx, top + yy, wdt, 1, skin);
  }
  // shading
  for (let yy = 4; yy < faceH - 6; yy++) {
    let wdt = faceW;
    if (yy >= faceH - 10) wdt = faceW - (yy - (faceH - 10)) * 2;
    const xx = hx - Math.floor(wdt / 2);
    head.vline(xx, top + yy, 1, shade(skin, 1.12));
    head.vline(xx + wdt - 1, top + yy, 1, shade(skin, 0.72));
    head.vline(xx + wdt - 2, top + yy, 1, shade(skin, 0.84));
  }
  // ears
  head.rect(left - 3, top + 18, 4, 9, skin);
  head.rect(left + faceW - 1, top + 18, 4, 9, shade(skin, 0.88));
  head.set(left - 2, top + 21, shade(skin, 0.7));
  head.set(left + faceW + 1, top + 21, shade(skin, 0.7));

  const eyeY = top + 19;
  const eyeCol = '#241a14';
  const white = '#f2e7d0';
  const drawEye = (ex, open, mood) => {
    head.rect(ex, eyeY, 7, 5, shade(skin, 0.94));
    head.ellipse(ex + 3, eyeY + 2, 3, 2, white);
    if (open) {
      head.rect(ex + 2, eyeY + 1, 3, 3, eyeCol);
      head.set(ex + 3, eyeY + 1, '#f2e7d0');
    } else {
      head.hline(ex, eyeY + 2, 7, eyeCol);
    }
    if (mood === 'sad') { head.hline(ex, eyeY - 1, 7, shade(skin, 0.86)); }
  };
  if (expr === 'happy') {
    head.line(left + 8, eyeY + 2, left + 14, eyeY, eyeCol);
    head.line(left + 14, eyeY, left + 19, eyeY + 2, eyeCol);
    head.line(left + 21, eyeY + 2, left + 27, eyeY, eyeCol);
    head.line(left + 27, eyeY, left + 32, eyeY + 2, eyeCol);
  } else if (expr === 'sad') {
    drawEye(left + 6, false, 'sad');
    drawEye(left + 22, false, 'sad');
    head.line(left + 6, eyeY - 4, left + 12, eyeY - 2, '#3a281c');
    head.line(left + 32, eyeY - 4, left + 26, eyeY - 2, '#3a281c');
  } else if (expr === 'angry') {
    drawEye(left + 6, true);
    drawEye(left + 22, true);
    head.line(left + 6, eyeY - 5, left + 13, eyeY - 1, '#3a281c');
    head.line(left + 32, eyeY - 5, left + 25, eyeY - 1, '#3a281c');
  } else if (expr === 'surprised') {
    drawEye(left + 6, true);
    drawEye(left + 22, true);
    head.ellipse(left + 9, eyeY + 2, 4, 4, white);
    head.ellipse(left + 25, eyeY + 2, 4, 4, white);
    head.ellipse(left + 9, eyeY + 2, 2, 3, eyeCol);
    head.ellipse(left + 25, eyeY + 2, 2, 3, eyeCol);
  } else if (expr === 'tired') {
    head.hline(left + 6, eyeY + 2, 7, eyeCol);
    head.hline(left + 22, eyeY + 2, 7, eyeCol);
    head.hline(left + 6, eyeY, 7, shade(skin, 0.8));
    head.hline(left + 22, eyeY, 7, shade(skin, 0.8));
  } else {
    drawEye(left + 6, true);
    drawEye(left + 22, true);
    // brows
    head.line(left + 5, eyeY - 5, left + 13, eyeY - 4, '#3a281c');
    head.line(left + 31, eyeY - 5, left + 23, eyeY - 4, '#3a281c');
  }
  // nose
  head.line(hx, eyeY + 5, hx - 2, eyeY + 10, shade(skin, 0.74));
  head.line(hx - 2, eyeY + 10, hx + 2, eyeY + 10, shade(skin, 0.68));
  head.set(hx + 2, eyeY + 9, shade(skin, 1.12));
  // mouth
  const my = eyeY + 16;
  if (expr === 'happy') {
    head.line(left + 12, my, left + 18, my + 3, '#8a3a32');
    head.line(left + 18, my + 3, left + 24, my, '#8a3a32');
    head.hline(left + 14, my + 1, 8, '#c4513f');
  } else if (expr === 'sad') {
    head.line(left + 13, my + 2, left + 23, my + 2, '#8a3a32');
    head.line(left + 13, my + 2, left + 16, my, '#8a3a32');
    head.line(left + 23, my + 2, left + 20, my, '#8a3a32');
  } else if (expr === 'angry') {
    head.hline(left + 13, my + 1, 10, '#6a2a24');
  } else if (expr === 'surprised') {
    head.ellipse(hx, my + 1, 3, 3, '#8a3a32');
    head.ellipse(hx, my + 1, 1, 2, '#4a1a14');
  } else if (expr === 'tired') {
    head.hline(left + 13, my + 1, 10, '#8a3a32');
  } else {
    head.hline(left + 12, my + 1, 12, '#8a3a32');
    head.hline(left + 14, my + 2, 8, '#a84a3e');
  }
  // age lines
  if (p.age === 'old') {
    head.line(left + 6, eyeY + 8, left + 11, eyeY + 7, shade(skin, 0.78));
    head.line(left + 31, eyeY + 8, left + 26, eyeY + 7, shade(skin, 0.78));
    head.hline(left + 14, my + 5, 10, shade(skin, 0.8));
    head.hline(left + 15, my + 7, 8, shade(skin, 0.84));
    head.line(left + 11, eyeY - 8, left + 17, eyeY - 9, shade(skin, 0.8));
  }
  if (p.beard) {
    const bc = p.beardColor || hair;
    head.rect(left + 10, my + 3, 18, 8, bc);
    head.rect(left + 12, my + 10, 14, 4, bc);
    head.rect(left + 8, my + 1, 4, 6, bc);
    head.rect(left + 26, my + 1, 4, 6, bc);
  } else if (p.mustache) {
    head.hline(left + 11, my - 1, 16, p.beardColor || hair);
    head.hline(left + 13, my, 12, p.beardColor || hair);
  }

  // hair
  const hstyle = p.hairStyle || 'short';
  if (hstyle === 'bald') {
    head.rect(left, top + 10, 5, 12, hair);
    head.rect(left + faceW - 5, top + 10, 5, 12, hair);
  } else if (hstyle === 'headscarf') {
    head.rect(left - 2, top - 2, faceW + 4, 16, p.scarfColor || '#3a4a58');
    head.rect(left - 4, top + 2, 6, 18, p.scarfColor || '#3a4a58');
    head.rect(left + faceW - 2, top + 2, 6, 18, p.scarfColor || '#3a4a58');
    head.hline(left - 2, top - 2, faceW + 4, shade(p.scarfColor || '#3a4a58', 1.3));
  } else if (hstyle === 'conical') {
    head.poly([[hx, top - 26], [left - 16, top + 14], [left + faceW + 16, top + 14]], '#c9a86a');
    head.poly([[hx, top - 26], [left - 16, top + 14], [hx, top + 14]], '#e0c58a');
    head.hline(left - 16, top + 14, faceW + 32, '#8a6a44');
    head.line(left - 8, top + 10, hx - 4, top - 18, '#f0dca8');
  } else {
    // hair cap
    head.poly([[left - 2, top + 14], [left + 2, top + 2], [hx, top - 4], [left + faceW - 2, top + 2], [left + faceW + 2, top + 14], [left + faceW - 4, top + 10], [left + 4, top + 10]], hair);
    head.rect(left - 3, top + 8, 6, 14, hair);
    head.rect(left + faceW - 3, top + 8, 6, 14, hair);
    head.hline(left + 4, top - 2, faceW - 8, shade(hair, 1.35));
    if (hstyle === 'bun') {
      head.ellipse(hx + 16, top - 4, 9, 7, hair);
      head.ellipse(hx + 14, top - 6, 4, 3, shade(hair, 1.3));
    } else if (hstyle === 'topknot') {
      head.rect(hx - 4, top - 12, 8, 10, hair);
      head.rect(hx - 2, top - 14, 4, 3, hair);
    } else if (hstyle === 'long' || hstyle === 'braid') {
      head.rect(left - 4, top + 12, 7, 26, hair);
      head.rect(left + faceW - 3, top + 12, 7, 26, hair);
      if (hstyle === 'braid') {
        for (let i = 0; i < 6; i++) head.rect(hx - 5, top + 34 + i * 5, 10, 4, i % 2 ? shade(hair, 1.25) : hair);
      }
    }
  }
  if (p.glasses) {
    head.ellipseOutline(hx - 11, eyeY + 2, 7, 5, '#6a5a3a');
    head.ellipseOutline(hx + 11, eyeY + 2, 7, 5, '#6a5a3a');
    head.line(hx - 4, eyeY + 2, hx + 4, eyeY + 2, '#6a5a3a');
    head.set(hx - 16, eyeY + 1, withAlpha(hex('#f2e7d0'), 120));
  }
  const headL = layer(60, 62, (x) => x.copy(head, 0, 0));
  blit(s, headL, 18, 10);

  // rim light
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const c = s.get(x, y);
      if ((c >>> 24) > 0 && x < 26 && ((x + y) % 3 === 0)) {
        s.set(x, y, mix(c, hex('#ffd98a'), 0.22));
      }
    }
  }
  // vignette
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x - 48) / 48, dy = (y - 48) / 48;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0.72) s.blend(x, y, withAlpha(hex('#0d0906'), Math.round((d - 0.72) * 380)));
    }
  }
  return s;
}
