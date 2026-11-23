# ART BIBLE — *Cửa Hàng 1945* (Vietnam 1945)

**Pack:** `assets/` · **Version:** 1.0.0 · **799 files** · **8.5 MB**
**Direction:** *High-detail 2D Pixel Art — Atmospheric Historical Shop Simulation*

A small shop in a fictional Northern Vietnamese delta town, August 1945.
Everything is drawn as if lit by one oil lamp and one overcast sky: warm interior
wood against cool, wet exteriors. The player should feel the humidity, the smell of
rice and lamp oil, and the quiet of a town where nothing is certain.

---

## 1. Core rules (non-negotiable)

| Rule | Detail |
| --- | --- |
| **Integer pixels only** | Every asset is authored on a whole-pixel grid. No sub-pixel edges, no anti-aliasing, no blur. |
| **Nearest-neighbour display** | `image-rendering: pixelated` everywhere; canvas `imageSmoothingEnabled = false`. Never bilinear. |
| **Authored size ≠ display size** | Backgrounds 640×360 → 1280×720; characters 48×64 → 96×128; items 32×32 → 64×64; portraits 96×96 → 192×192; UI 1× → 2×. |
| **Limited palette** | ~40 colours per scene, drawn from the master palette below. No pure black (`#000`) and no pure white (`#fff`) — use `#241711` and `#f2e6c8`. |
| **One light source per scene** | Interiors: a single oil lamp (warm `#ffdf9a`), falling off to `#241711`. Exteriors: overcast sky, cool fill `#3c4a58`. |
| **No modern objects** | No plastic, no neon, no zippers, no printed brand labels, no wristwatches on commoners, no motorcycles. |
| **No text baked into art** | Letters are drawn by the UI font. The only exception is the hand-painted shop sign, which uses abstract brush strokes, not real words. |
| **No gore, no shock imagery** | Hardship is shown through empty shelves, patched clothing and rain — never through bodies or violence. |
| **Not a copy of *Probably Stolen*** | The inspiration is the *feel* (counter-trading, tactile inventory, weather). All pixels here are original. |

---

## 2. Palette

### Master palette

| Token | Hex | Used for |
| --- | --- | --- |
| `ink` | `#241711` | Outlines, deepest shadow, UI text on paper |
| `woodDark` | `#3b2718` | Beam undersides, shelf interiors |
| `wood` | `#5a3d24` | Walls, counters, crates |
| `woodLight` | `#9a6d40` | Lit edges, worn wood |
| `parchment` | `#e6d3a3` | Paper, sacks, labels |
| `lamp` | `#ffdf9a` | Lamp core, highlights |
| `moss` | `#4c5a32` | Vegetation, mould, damp |
| `brick` | `#8a4630` | Roof tiles, laterite, dried blood-free earth |
| `indigo` | `#3c4a58` | Shadows at dusk, cloth of the poor |
| `water` | `#4d6b70` | River, rain, wet reflections |
| `gold` | `#d9a441` | Money, UI accent, brass |
| `red` | `#a83226` | Warning, lacquer, sunset |

### Skin tones

`#e9b98f` · `#d19b6c` · `#b0784b` · `#8d5a36` — four tones, all warm, all desaturated.
Never pink-toned; the light in this world is amber.

### Category colours (items & UI)

| Category | Colour |
| --- | --- |
| Lương thực / food | `#8a9a5a` |
| Vật dụng / household | `#b98a3e` |
| Vật liệu / materials | `#8a7a5a` |
| Y tế / medicine | `#a83226` |
| Hàng quý / valuables | `#d9a441` |
| Giấy tờ & đặc biệt / special | `#5a7a8a` |

Quality tiers: `#8a6a44` (Kém) → `#8aa357` (Thường) → `#5a8ac9` (Tốt) → `#d9a441` (Đặc biệt).

---

## 3. Characters

### Format
- **Sprite:** 48×64 source, exported 2× (96×128 on screen), transparent PNG.
- **Frames per character (14):**
  `front_idle_0`, `front_idle_1`, `front_talk`, `front_happy`, `front_sad`,
  `front_angry`, `front_surprised`, `front_tired`,
  `side_walk_0..3`, `back_walk_0..1`.
- **Portrait:** 96×96 source, 192×192 on screen, six expressions:
  `neutral, happy, sad, angry, surprised, tired`.
- **Pivot:** feet at `(24, 62)` in source space; portraits centred on the eyes at `(48, 40)`.

### Silhouette first
Every character must read at 48×64 from across the room. Each has one unmistakable
shape: Bà Tư's nón lá and basket, Ông Năm's conical hat and shoulder pole, Anh Khởi's
handcart posture, Thầy Minh's long robe and book, Bà Hậu's fine scarf and upright collar.

### Costume notes (1945, rural North)
- **Women:** `áo tứ thân` or `áo bà ba` in indigo, brown or faded black; nón lá when outdoors; hair in a bun or a tight braid.
- **Men:** plain cotton shirt and trousers, rolled cuffs; nón lá or a cloth turban; wooden or rubber sandals.
- **Children:** smaller cut of adult clothing, patched at the knee.
- **Elders:** thinner frame, greyer hair, slightly stooped idle.
- **Wealthy traders:** finer weave, darker indigo, a scarf or a pocket watch — but never a suit.

### Expression rules
Expressions are 2–4 pixel changes: brow angle, mouth line, eye highlight. No cartoon
sweat drops, no blush marks, no exaggerated eyes. Emotion comes from posture and
the mouth, as in a woodcut.

### Animation
- Idle: 2 frames, 1.6 s loop, ±1 px breathing offset.
- Talk: 1 frame + a 3-frame jaw offset used by the scene at 8 fps.
- Walk: 4 frames, contact/pass positions, 8 fps, feet never slide more than 2 px.
- Emotions are static poses held while the dialogue line is on screen.

---

## 4. Environments

### Format
- **Background:** 640×360 source, 1280×720 on screen, opaque PNG.
- **Overlays:** 640×360 transparent PNG for weather and time-of-day passes
  (`backgrounds/overlays/`), composited by the renderer with `multiply`/`lighter`.
- 26 backgrounds, 4 overlay plates.

### The 12 core sets (with variants)
1. Shop interior — day / dusk / night / rain
2. Shop exterior — day / dusk / night / rain
3. Market — day / dusk
4. River dock — day / night / rain
5. Warehouse
6. Residential lane — day / rain
7. Tea stall — day / dusk
8. Farmer's house
9. Staging yard (carts, sacks, porters)
10. Street — day / rain
11. Alley — day / rain
12. Shop by level — 2 / 3 / 4 / 5

### Lighting ladder (interior)
| Hour | Tint | Lamp |
| --- | --- | --- |
| 06:00–07:00 | `rgba(24,36,72,0.42)` cool dawn | on, 0.5 |
| 07:00–09:00 | `rgba(255,214,150,0.06)` | on, 0.3 |
| 09:00–15:00 | `rgba(255,236,190,0.03)` | off, 0.28 ambient |
| 15:00–17:00 | `rgba(255,170,90,0.14)` amber | on, 0.45 |
| 17:00+ | `rgba(28,38,80,0.38)` blue hour | on, 0.6 |

### Weather
- **Rain:** 120 streaks, 1.5 px, `rgba(190,210,215,0.28)`, wind −0.18; puddles are painted into the background, not animated.
- **Storm:** 1.35× speed, `0.42` alpha, occasional lightning flash (2 frames, `rgba(220,235,255,0.18)`).
- **Heat:** dust motes drift upward, warm tint +0.05.
- **Overcast:** desaturate the background 8%, lower contrast.

### Props (100+)
Jars, sacks, baskets, bolts of cloth, oil lamps, scales, abacus, ledgers, hanging
herbs, drying fish, water jars, bamboo poles, bicycle parts, cart wheels, shrines,
incense bowls, stools, mats, mosquito nets, roof tiles, wells, fences, banana trees,
neem trees, paddy bundles. Each prop is 16–64 px, drawn with the same palette and a
single light direction.

---

## 5. Items

- **122 icons**, 32×32 source, 64×64 on screen, transparent PNG.
- Groups: food (37), household (32), materials (16), medicine (12), valuables (14), special (11).
- Every icon is drawn from a **three-quarter top-down** view with the light from the upper left.
- Each icon must be recognisable in silhouette at 16×16. Test: squint, or downscale to 16 px.
- Stack sizes and quality are communicated by UI overlays, never baked into the icon.
- Perishable goods show a freshness bar; spoiled goods are removed at day end.

---

## 6. UI

- Authored at 1×, exported at 2× so **1 CSS px = 1 source px**.
- Wood panels: 24 px border-image with a bevel, inner shadow, and a 1 px highlight.
- Paper panels: 12 px border-image, warm parchment `#e6d3a3`, ink `#3a2a1c`.
- Buttons: 12 px nine-slice, normal / hover / primary / disabled.
- Icons: 32×32, single-weight 2 px strokes, no gradients beyond two tones.
- Type: **Be Vietnam Pro** for UI (400/500/600/700), **EB Garamond** for narrative.
  Vietnamese diacritics must always be visible — never use a font that lacks `ắ ằ ẳ ẵ ặ ệ ở ...`.
- Readability floor: 13 px body, 11 px labels, 1.45 line-height. Contrast ratio ≥ 4.5:1 on wood.
- Small screens: the stage scales uniformly; panels never overflow 1280×720 design space.

---

## 7. VFX

15 effect sprites in `assets/effects/`: dust motes, rain streaks, lamp glow, sun shaft,
smoke, steam, fireflies, coin sparkle, ink bleed, page flip, cloth flutter, water ripple,
leaf fall, fog, heat shimmer.
All are loopable, drawn at 1×, and composited additively only for light.

---

## 8. Tilesets

One 8×8 tile sheet (16×16 px tiles) for ground, water, paths and vegetation, plus
autotile corners. Used by the map screen and by the exterior scenes.

---

## 9. File & naming conventions

- ASCII only, `snake_case`, English words: `rice_white.png`, `ong_nam_front_happy.png`.
- Paths: `assets/{backgrounds,characters,items,environment,tilesets,ui,effects,fonts,previews,manifests}`.
- Portraits: `characters/portraits/{id}_{expression}.png`.
- Sprites: `characters/{id}/{direction}_{pose}[_{frame}].png`.
- Items: `items/{category}/{id}.png`.
- Manifest: `assets/manifests/ASSET_MANIFEST.json` — one entry per file with
  `file, w, h, bytes, group, description, name, category, frame, direction, usage`.
- IDs in the manifest match game IDs exactly (`ba_tu`, `ong_nam`, `rice_white`, …).

---

## 10. Do / Don't

**Do**
- Paint with 3 tones per material (base, shadow, highlight) and one specular pixel.
- Let the lamp do the storytelling: pool the light, keep the corners dark.
- Repeat the same 8–10 prop shapes across scenes so the town feels like one place.
- Keep a 1 px `#241711` outline on characters and items; 2 px on large props.

**Don't**
- Don't use gradients on pixel art (dither instead).
- Don't mix 1× and 2× assets in the same layer.
- Don't draw text, logos or modern packaging.
- Don't depict famine, corpses or violence.
- Don't use anime proportions, cel shading or vector outlines.
- Don't upscale with smoothing — ever.

---

## 11. Asset inventory

| Group | Files |
| --- | --- |
| Backgrounds | 26 painted + 4 tier overlays + 8 light/weather plates (12 plates total) |
| Characters (sprites) | 29 × 14 = 406 |
| Portraits | 27 × 6 = 162 |
| Items | 122 |
| UI | 78 |
| Effects | 15 |
| Tilesets | 1 |
| Previews | 5 |
| **Total** | **799** |

Regenerate everything with `npm run assets` (deterministic; seeded per asset id).
