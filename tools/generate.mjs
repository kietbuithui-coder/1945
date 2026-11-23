// Asset pipeline entry point: generates every PNG, the manifest, data JSON and previews.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Surface, hex, withAlpha, rngFor } from './lib/pixel.mjs';
import { PNG } from 'pngjs';
import { ITEMS, ITEM_CATEGORIES, renderItemIcon } from './gen/items.mjs';
import { NPCS, CROWD } from './gen/npcs.mjs';
import { drawCharacter, drawPortrait } from './gen/characters.mjs';
import { SCENES, shopLevelOverlay } from './gen/backgrounds.mjs';
import { buildUI } from './gen/ui.mjs';
import { buildTiles, buildVFX, TILES } from './gen/tiles-vfx.mjs';
import { drawText, drawTextCentered, textWidth } from './lib/font.mjs';

// Deterministic output: the whole pipeline runs on one seeded PRNG so that
// `npm run assets` always reproduces the same bytes for the same source.
{
  let seed = 0x9e3779b9;
  Math.random = () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const manifest = [];
const stats = { files: 0, bytes: 0, groups: {} };

function save(rel, surface) {
  const file = path.join(ASSETS, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const buf = surface.toPNG();
  fs.writeFileSync(file, buf);
  const parts = rel.replace(/\.[a-z]+$/, '').split('/');
  const name = parts[parts.length - 1];
  const id = parts[0] === 'characters' && parts.length > 2 ? `${parts[1]}_${name}` : name;
  const entry = {
    id,
    file: `assets/${rel}`,
    format: 'png',
    size: `${surface.w}x${surface.h}`,
    w: surface.w,
    h: surface.h,
    bytes: buf.length,
  };
  manifest.push(entry);
  stats.files++;
  stats.bytes += buf.length;
  const group = rel.split('/').slice(0, 2).join('/');
  stats.groups[group] = (stats.groups[group] || 0) + 1;
  return entry;
}

function label(rel, group, description, extra = {}) {
  const e = manifest.find((m) => m.file === `assets/${rel}`);
  if (e) Object.assign(e, { group, description, ...extra });
}

// --------------------------------------------------------------- overlays --
console.log('• overlays');
{
  // Transparent 640x360 plates that any background can be composited with.
  // The game multiplies them over the scene to get time of day and weather.
  const plate = (name, color, alpha) => {
    const s = new Surface(640, 360);
    s.rect(0, 0, 640, 360, withAlpha(hex(color), alpha));
    save(`backgrounds/overlays/${name}.png`, s);
  };
  plate('dawn', '#183050', 107);
  plate('morning', '#ffd696', 15);
  plate('day', '#ffecbe', 8);
  plate('dusk', '#ffaa5a', 36);
  plate('night', '#1c2650', 97);
  plate('rain', '#3c5064', 26);
  plate('storm', '#28374b', 56);
  // warm pool of light around the lamp, composited with 'lighter'
  {
    const s = new Surface(640, 360);
    for (let r = 180; r > 0; r -= 3) {
      const a = Math.round(70 * Math.pow(1 - r / 180, 1.6));
      if (a > 0) s.ellipse(320, 44, r, Math.round(r * 0.78), withAlpha(hex('#ffd98a'), a));
    }
    save('backgrounds/overlays/lamp_glow.png', s);
  }
}

// ------------------------------------------------------------------ items ---
console.log('• items');
for (const def of ITEMS) {
  const s = renderItemIcon(def, 2);
  const rel = `items/${def.cat}/${def.id}.png`;
  const e = save(rel, s);
  Object.assign(e, {
    group: `items/${def.cat}`,
    description: def.desc,
    name: def.name,
    category: def.cat,
  });
}

// -------------------------------------------------------------- characters --
console.log('• characters');
const charMeta = [];
const allChars = [...NPCS, ...CROWD];
for (const npc of allChars) {
  const dir = `characters/${npc.id}`;
  const frames = [];
  // front: idle 2, talk, emotions
  const frontFrames = [
    ['front_idle_0', 0, 'neutral'],
    ['front_idle_1', 1, 'neutral'],
    ['front_talk', 0, 'neutral'],
    ['front_happy', 0, 'happy'],
    ['front_sad', 0, 'sad'],
    ['front_angry', 0, 'angry'],
    ['front_surprised', 0, 'surprised'],
    ['front_tired', 0, 'tired'],
  ];
  for (const [name, frame, expr] of frontFrames) {
    const s = drawCharacter(npc.p, 'front', frame, expr);
    const rel = `${dir}/${name}.png`;
    const e = save(rel, s);
    Object.assign(e, { group: `characters/${npc.id}`, description: `${npc.name} — ${npc.role}`, frame: name, direction: 'front' });
    frames.push({ name, file: `assets/${rel}`, dir: 'front' });
  }
  for (let f = 0; f < 4; f++) {
    const s = drawCharacter(npc.p, 'side', f, 'neutral');
    const rel = `${dir}/side_walk_${f}.png`;
    const e = save(rel, s);
    Object.assign(e, { group: `characters/${npc.id}`, description: `${npc.name} — walk frame`, frame: f, direction: 'side' });
    frames.push({ name: `side_walk_${f}`, file: `assets/${rel}`, dir: 'side' });
  }
  for (let f = 0; f < 2; f++) {
    const s = drawCharacter(npc.p, 'back', f, 'neutral');
    const rel = `${dir}/back_walk_${f}.png`;
    const e = save(rel, s);
    Object.assign(e, { group: `characters/${npc.id}`, description: `${npc.name} — back`, frame: f, direction: 'back' });
    frames.push({ name: `back_walk_${f}`, file: `assets/${rel}`, dir: 'back' });
  }
  // portraits
  const portraits = [];
  for (const expr of ['neutral', 'happy', 'sad', 'angry', 'surprised', 'tired']) {
    const s = drawPortrait({ ...npc.p, id: npc.id }, expr);
    const rel = `characters/portraits/${npc.id}_${expr}.png`;
    const e = save(rel, s);
    Object.assign(e, { group: 'characters/portraits', description: `${npc.name} — portrait ${expr}`, expression: expr });
    portraits.push({ expression: expr, file: `assets/${rel}` });
  }
  charMeta.push({
    id: npc.id, name: npc.name, age: npc.age, role: npc.role, bio: npc.bio,
    portrait: `assets/characters/portraits/${npc.id}_neutral.png`,
    portraits, frames,
  });
}

// -------------------------------------------------------------- backgrounds --
console.log('• backgrounds');
for (const scene of SCENES) {
  const s = scene.fn();
  const e = save(`backgrounds/${scene.id}.png`, s);
  Object.assign(e, { group: 'backgrounds', description: scene.name, usage: 'scene background, 2x nearest-neighbour' });
}
for (let lv = 2; lv <= 5; lv++) {
  const s = shopLevelOverlay(lv);
  const e = save(`backgrounds/shop_level${lv}.png`, s);
  Object.assign(e, { group: 'backgrounds/overlays', description: `Overlay phòng cấp ${lv}`, usage: 'draw over shop background' });
}

// --------------------------------------------------------------------- UI ---
console.log('• ui');
const uiFiles = [];
buildUI((rel, s) => {
  save(rel, s);
  uiFiles.push(rel);
});
for (const f of uiFiles) label(f, 'ui', f.replace('ui/', ''));

// ------------------------------------------------------------------ tiles ---
console.log('• tiles');
{
  const { sheet, meta } = buildTiles();
  save('tilesets/terrain.png', sheet);
  fs.mkdirSync(path.join(ASSETS, 'tilesets'), { recursive: true });
  fs.writeFileSync(path.join(ASSETS, 'tilesets/terrain.json'), JSON.stringify({
    image: 'assets/tilesets/terrain.png', tileSize: 32, tiles: meta,
  }, null, 2));
  label('tilesets/terrain.png', 'tilesets', 'Terrain / interior tileset 32px', { tiles: meta });
}

// ------------------------------------------------------------------- VFX ----
console.log('• effects');
buildVFX((rel, s) => {
  save(rel, s);
  label(rel, 'effects', rel.replace('effects/', '').replace('.png', ''));
});

// ---------------------------------------------------------------- previews --
function contactSheet(w, h, bg = '#1d140e') {
  const s = new Surface(w, h);
  s.rect(0, 0, w, h, bg);
  // texture
  const r = rngFor('sheet' + w);
  for (let i = 0; i < w * h * 0.01; i++) s.set(Math.floor(r() * w), Math.floor(r() * h), '#241a12');
  return s;
}

console.log('• previews');
{
  // items sheet
  const cols = 10, cell = 80, cellH = 92;
  const rows = Math.ceil(ITEMS.length / cols);
  const s = contactSheet(cols * cell, rows * cellH + 44);
  drawText(s, 'VIETNAM 1945 - ITEM ICONS', 12, 14, '#e6d3a3', 2);
  ITEMS.forEach((def, i) => {
    const cx = (i % cols) * cell, cy = 44 + Math.floor(i / cols) * cellH;
    s.frame(cx + 2, cy + 2, cell - 4, cellH - 4, '#2e2116');
    s.copy(renderItemIcon(def, 1), cx + (cell - 32) / 2, cy + 8);
    const label = def.id.length > 14 ? def.id.slice(0, 13) + '~' : def.id;
    drawTextCentered(s, label, cx + cell / 2, cy + 50, '#c9b083', 1);
    drawTextCentered(s, def.name.slice(0, 16), cx + cell / 2, cy + 62, '#8a7a62', 1);
  });
  const e = save('previews/items.png', s);
  Object.assign(e, { group: 'previews', description: 'Bảng tổng hợp icon vật phẩm' });
}
{
  // characters sheet
  const cols = 4, cellW = 300, cellH = 260;
  const rows = Math.ceil(allChars.length / cols);
  const s = contactSheet(cols * cellW, rows * cellH + 40);
  drawText(s, 'VIETNAM 1945 - CHARACTERS', 12, 12, '#e6d3a3', 2);
  allChars.forEach((npc, i) => {
    const cx = (i % cols) * cellW, cy = 40 + Math.floor(i / cols) * cellH;
    s.frame(cx + 3, cy + 3, cellW - 6, cellH - 6, '#2e2116');
    const spr = drawCharacter(npc.p, 'front', 0, 'neutral');
    s.copy(spr, cx + 20, cy + 24);
    const walk = drawCharacter(npc.p, 'side', 1, 'neutral');
    s.copy(walk, cx + 20, cy + 110);
    s.copy(drawPortrait({ ...npc.p, id: npc.id }, 'neutral'), cx + 90, cy + 20);
    s.copy(drawPortrait({ ...npc.p, id: npc.id }, 'happy'), cx + 190, cy + 20);
    s.copy(drawPortrait({ ...npc.p, id: npc.id }, 'sad'), cx + 90, cy + 120);
    s.copy(drawPortrait({ ...npc.p, id: npc.id }, 'angry'), cx + 190, cy + 120);
    drawText(s, npc.name, cx + 90, cy + 222, '#e6d3a3', 1);
    drawText(s, npc.id, cx + 90, cy + 234, '#8a7a62', 1);
  });
  const e = save('previews/characters.png', s);
  Object.assign(e, { group: 'previews', description: 'Bảng tổng hợp nhân vật' });
}
{
  // backgrounds sheet
  const thumbs = SCENES.filter((x) => x.id !== 'title');
  const cols = 3, tw = 320, th = 180, pad = 12, labelH = 16;
  const rows = Math.ceil(thumbs.length / cols);
  const s = contactSheet(cols * (tw + pad) + pad, rows * (th + labelH + pad) + 44);
  drawText(s, 'VIETNAM 1945 - BACKGROUNDS', 12, 12, '#e6d3a3', 2);
  thumbs.forEach((sc, i) => {
    const x = pad + (i % cols) * (tw + pad), y = 44 + Math.floor(i / cols) * (th + labelH + pad);
    const img = sc.fn();
    s.copy(img.scaleDown(2), x, y);
    s.frame(x, y, tw, th, '#3a2a1e');
    drawText(s, sc.id, x + 2, y + th + 3, '#c9b083', 1);
  });
  const e = save('previews/backgrounds.png', s);
  Object.assign(e, { group: 'previews', description: 'Bảng tổng hợp background' });
}
{
  // UI sheet
  const icons = fs.readdirSync(path.join(ASSETS, 'ui/icons')).filter((f) => f.endsWith('.png'));
  const cols = 8, cell = 84;
  const rows = Math.ceil(icons.length / cols);
  const s = contactSheet(Math.max(cols * cell, 700), 40 + 220 + rows * cell + 120);
  drawText(s, 'VIETNAM 1945 - UI KIT', 12, 12, '#e6d3a3', 2);
  // panels
  const wood = new Surface(0, 0);
  void wood;
  const loadImage = (rel) => {
    const buf = fs.readFileSync(path.join(ASSETS, rel));
    return PNG.sync.read(buf);
  };
  // draw panels by re-rendering (avoid png decode)
  const { buildUI } = await import('./gen/ui.mjs');
  const samples = [];
  buildUI((rel, surf) => { samples.push([rel, surf]); });
  let sx = 12, sy = 44;
  for (const [rel, surf] of samples) {
    if (!rel.startsWith('ui/panels') && !rel.startsWith('ui/buttons') && !rel.startsWith('ui/slots')) continue;
    const scale = Math.min(1, 180 / surf.w);
    s.copy(surf, sx, sy);
    drawText(s, rel.split('/').pop(), sx, sy + surf.h + 2, '#8a7a62', 1);
    sx += surf.w + 12;
    if (sx > s.w - 200) { sx = 12; sy += 200; }
  }
  let ix = 12, iy = sy + 210;
  for (const f of icons.sort()) {
    const png = loadImage('ui/icons/' + f);
    s.copy(png, ix, iy);
    drawText(s, f.replace('.png', '').slice(0, 13), ix, iy + 68, '#c9b083', 1);
    ix += cell;
    if (ix > s.w - cell) { ix = 12; iy += cell; }
  }
  const e = save('previews/ui.png', s);
  Object.assign(e, { group: 'previews', description: 'Bảng tổng hợp UI' });
}
{
  // master cover
  const s = contactSheet(960, 620);
  const title = SCENES.find((x) => x.id === 'title').fn();
  s.copy(title, 0, 0);
  const chars = ['ba_tu', 'ong_nam', 'co_hoa', 'ong_giao_minh'];
  chars.forEach((id, i) => {
    const npc = NPCS.find((n) => n.id === id);
    const p = drawPortrait({ ...npc.p, id }, "neutral").scaleDown(1);
    s.copy(p, 40 + i * 130, 420);
    drawTextCentered(s, npc.name.split(' ').pop(), 88 + i * 130, 560, '#e6d3a3', 1);
  });
  for (let i = 0; i < 8; i++) {
    s.copy(renderItemIcon(ITEMS[i * 9], 2), 620 + (i % 4) * 80, 400 + Math.floor(i / 4) * 84);
  }
  drawText(s, 'VIETNAM 1945', 600, 585, '#e6d3a3', 2);
  const e = save('previews/cover.png', s);
  Object.assign(e, { group: 'previews', description: 'Ảnh bìa bộ asset' });
}

// ------------------------------------------------------------------- data ---
fs.mkdirSync(path.join(ROOT, 'src/data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'src/data/items.json'), JSON.stringify(ITEMS.map((d) => ({
  id: d.id, name: d.name, cat: d.cat, desc: d.desc, buy: d.buy, sell: d.sell,
  weight: d.weight, vol: d.vol, perish: d.perish, shelf: d.shelf,
  icon: `assets/items/${d.cat}/${d.id}.png`,
})), null, 2));

fs.writeFileSync(path.join(ROOT, 'src/data/npcs.json'), JSON.stringify(NPCS.map((n) => ({
  id: n.id, name: n.name, age: n.age, role: n.role, bio: n.bio,
  portrait: `assets/characters/portraits/${n.id}_neutral.png`,
  portraits: Object.fromEntries(['neutral', 'happy', 'sad', 'angry', 'surprised', 'tired'].map((e) => [e, `assets/characters/portraits/${n.id}_${e}.png`])),
  sprite: `assets/characters/${n.id}`,
})), null, 2));

// --------------------------------------------------------------- manifest ---
const groups = {};
for (const m of manifest) {
  const g = m.group || m.file.split('/').slice(0, 3).join('/');
  groups[g] = groups[g] || { count: 0, files: [] };
  groups[g].count++;
  groups[g].files.push(m.file);
}
// --------------------------------------------------------------- enrich --
// Every entry gets a stable id, a human usage line, its animation frames and
// the pivot the renderer uses.
const stem = (p) => p.replace(/\.[a-z]+$/, '');
const charFrames = new Map();
const portraitFrames = new Map();
for (const m of manifest) {
  const parts = m.file.replace('assets/', '').split('/');
  if (parts[0] !== 'characters') continue;
  if (parts[1] === 'portraits') {
    const f = stem(parts[2]);
    const owner = f.replace(/_(neutral|happy|sad|angry|surprised|tired)$/, '');
    if (!portraitFrames.has(owner)) portraitFrames.set(owner, []);
    portraitFrames.get(owner).push(f);
  } else {
    if (!charFrames.has(parts[1])) charFrames.set(parts[1], []);
    charFrames.get(parts[1]).push(stem(parts[2]));
  }
}
const EXPR = /_(neutral|happy|sad|angry|surprised|tired)$/;
for (const m of manifest) {
  const parts = m.file.replace('assets/', '').split('/');
  const [top, second, third] = parts;
  const name = stem(parts[parts.length - 1]);
  const thirdStem = stem(third || '');
  const isPortrait = top === 'characters' && second === 'portraits';
  const isChar = top === 'characters' && !isPortrait;
  const isItem = top === 'items';
  const isBg = top === 'backgrounds';
  const isUi = top === 'ui';
  const isFx = top === 'effects';
  const isTile = top === 'tilesets';
  const isPrev = top === 'previews';

  if (isPortrait) {
    const owner = thirdStem.replace(EXPR, '');
    const expr = (thirdStem.match(EXPR) || [])[1] || 'neutral';
    m.id = `${owner}_portrait_${expr}`;
    m.usage = 'dialogue portrait';
    m.expression = expr;
    m.pivot = { x: 48, y: 40 };
    m.frames = (portraitFrames.get(owner) || []).slice().sort();
  } else if (isChar) {
    m.id = `${second}_${name}`;
    m.usage = 'world sprite (idle / walk / talk / emotion)';
    m.pivot = { x: 24, y: 62 };
    m.frames = (charFrames.get(second) || []).slice().sort();
    const f = String(m.frame ?? '');
    m.direction = f.startsWith('side') ? 'side' : f.startsWith('back') ? 'back' : 'front';
  } else if (isItem) {
    m.id = name;
    m.usage = 'inventory and shop icon';
    m.pivot = { x: 16, y: 16 };
  } else if (isBg) {
    m.usage = name.startsWith('shop_level')
      ? 'shop tier overlay, composited over the shop background'
      : second === 'overlays'
        ? 'time-of-day / weather tint plate, multiply over any background'
        : 'scene background, 2x nearest-neighbour';
    m.pivot = { x: 0, y: 0 };
  } else if (isUi) {
    m.id = `ui_${stem(second)}_${name}`;
    m.usage = 'interface chrome';
    const UI_DESC = {
      divider: 'Đường phân cách gỗ',
      portrait_frame: 'Khung chân dung',
      scrollbar: 'Thanh cuộn',
      progress: 'Thanh tiến trình',
    };
    if (UI_DESC[name]) m.description = UI_DESC[name];
    m.pivot = { x: 0, y: 0 };
  } else if (isFx) {
    m.id = `fx_${name}`;
    m.usage = 'visual effect';
    m.pivot = { x: 0, y: 0 };
  } else if (isTile) {
    m.id = `tileset_${name}`;
    m.usage = 'map tileset';
    m.pivot = { x: 0, y: 0 };
  } else if (isPrev) {
    m.id = `preview_${name}`;
    m.usage = 'preview sheet';
    m.pivot = { x: 0, y: 0 };
  }
  if (!m.id) m.id = name;
  if (!m.pivot) m.pivot = { x: 0, y: 0 };
}

const manifestDoc = {
  name: 'Vietnam 1945 — Game Asset Pack',
  version: '1.0.0',
  generated: new Date().toISOString(),
  artBible: 'docs/ART_BIBLE.md',
  palette: {
    ink: '#241711', woodDark: '#3b2718', wood: '#5a3d24', woodLight: '#9a6d40',
    parchment: '#e6d3a3', lamp: '#ffdf9a', moss: '#4c5a32', brick: '#8a4630',
    indigo: '#3c4a58', water: '#4d6b70', skin: ['#e9b98f', '#d19b6c', '#b0784b', '#8d5a36'],
  },
  conventions: {
    pixelArt: 'All assets authored at integer pixel scale; display with nearest-neighbour scaling.',
    displayScale: 2,
    itemIcon: '32x32 source, 64x64 on screen',
    character: '48x64 source, 96x128 on screen',
    portrait: '96x96 source, 192x192 on screen',
    background: '640x360 source, 1280x720 on screen',
    ui: 'authored 1x, exported 2x (CSS pixels = source pixels)',
  },
  stats: { files: stats.files, bytes: stats.bytes, groups: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.count])) },
  groups,
  assets: manifest,
};
fs.mkdirSync(path.join(ASSETS, 'manifests'), { recursive: true });
fs.writeFileSync(path.join(ASSETS, 'manifests/ASSET_MANIFEST.json'), JSON.stringify(manifestDoc, null, 2));

console.log(`\nDone: ${stats.files} files, ${(stats.bytes / 1024 / 1024).toFixed(1)} MB`);
console.log(Object.entries(stats.groups).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `  ${k}: ${v}`).join('\n'));
