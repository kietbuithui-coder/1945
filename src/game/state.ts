// ── state.ts · thế giới, RNG, lưu/tải (SaveManager) ─────────────────────────
// Không đụng DOM: module này chạy được cả trong headless simulation lẫn jsdom.

import {
  DIFFICULTY, ITEM, ITEMS, NPCS, QUESTS, SUPPLIERS,
} from './data';
import type {
  DayLog, Difficulty, Grid, JournalEntry, Quality, Relation, SaveEnvelope,
  Settings, Stack, SupplierState, World,
} from './types';

export const SAVE_VERSION = 3;
const PREFIX = 'vn1945.v3.';
export const SLOTS = ['auto', 'slot1', 'slot2', 'slot3'] as const;
export type Slot = typeof SLOTS[number];

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const memory = new Map<string, string>();
export const memoryStorage: StorageLike = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => { memory.set(k, v); },
  removeItem: (k) => { memory.delete(k); },
};

let activeStorage: StorageLike | null = null;
export function setStorage(s: StorageLike): void { activeStorage = s; }
export function storage(): StorageLike {
  if (activeStorage) return activeStorage;
  try {
    if (typeof localStorage !== 'undefined') {
      const probe = '__vn1945_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      activeStorage = localStorage;
      return activeStorage;
    }
  } catch { /* private mode / node */ }
  activeStorage = memoryStorage;
  return activeStorage;
}

export const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
export const round = (n: number): number => Math.round(n * 100) / 100;
export const coin = (n: number): number => Math.max(0, Math.round(n));
export const fmt = (n: number): string => Math.round(n).toLocaleString('vi-VN');
export const pad2 = (n: number): string => String(n).padStart(2, '0');
export const clock = (minute: number): string => `${pad2(Math.floor(minute / 60))}:${pad2(Math.floor(minute % 60))}`;

/** xorshift32 — cùng seed cho ra cùng một thế giới. */
export function rnd(w: World): number {
  let x = w.rng | 0;
  if (x === 0) x = 0x6d2b79f5;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  w.rng = x | 0;
  return ((x >>> 0) % 1_000_000) / 1_000_000;
}
export const rint = (w: World, lo: number, hi: number): number => lo + Math.floor(rnd(w) * (hi - lo + 1));
export const pick = <T>(w: World, arr: T[]): T => arr[Math.floor(rnd(w) * arr.length) % arr.length];
export function uid(w: World, prefix = 'x'): string {
  return `${prefix}${(w.rng >>> 0).toString(36)}${(w.day * 997 + w.minute).toString(36)}${Math.floor(rnd(w) * 1e6).toString(36)}`;
}

export function makeGrid(w: number, h: number): Grid {
  return { w, h, cells: Array.from({ length: w * h }, () => null) };
}
export function makeStack(w: World, item: string, qty: number, q: Quality = 1, origin = 'heirloom'): Stack {
  const def = ITEM[item];
  return {
    uid: uid(w, 's'), item, qty: Math.max(1, Math.min(qty, def?.stack ?? 20)),
    q, fresh: def && def.perish > 0 ? def.perish : -1, origin,
  };
}
export function addStarting(grid: Grid, w: World, list: [string, number, Quality][]): void {
  let i = 0;
  for (const [item, qty, q] of list) {
    while (i < grid.cells.length && grid.cells[i]) i++;
    if (i >= grid.cells.length) break;
    grid.cells[i] = makeStack(w, item, qty, q, 'heirloom');
    i++;
  }
}

function marketSeed(w: World): World['market'] {
  const m: World['market'] = {};
  for (const it of ITEMS) {
    const rare = it.tags.includes('rare') || it.tags.includes('luxury');
    m[it.id] = { supply: rare ? 0.75 : 1, demand: 1, flag: 0 };
  }
  return m;
}

function supplierSeed(w: World): Record<string, SupplierState> {
  const out: Record<string, SupplierState> = {};
  const mult = DIFFICULTY[w.difficulty].supply;
  for (const s of SUPPLIERS) {
    const stock: SupplierState['stock'] = {};
    for (const id of s.items) {
      const def = ITEM[id];
      if (!def) continue;
      const base = def.tags.includes('rare') ? 2 : def.tags.includes('luxury') ? 3 : 6;
      stock[id] = {
        qty: Math.max(1, Math.round(base * mult * (0.7 + rnd(w) * 0.8))),
        q: (rnd(w) < 0.12 ? 2 : rnd(w) < 0.1 ? 0 : 1) as Quality,
      };
    }
    out[s.id] = {
      id: s.id, stock, bond: 0, lastRestock: w.day,
      reliability: s.reliability, priceFactor: s.priceFactor,
      delay: s.delay, location: s.location, note: '',
    };
  }
  return out;
}

function relationSeed(): Record<string, Relation> {
  const out: Record<string, Relation> = {};
  for (const n of NPCS) {
    out[n.id] = { trust: n.trust, bond: 0, visits: 0, lastDay: 0, helped: 0, refused: 0, history: [], flags: {} };
  }
  return out;
}

export function blankDayLog(day: number): DayLog {
  return {
    day, revenue: 0, cost: 0, spoilage: 0, debtIn: 0, debtOut: 0,
    repDelta: 0, communityDelta: 0, trades: 0, served: 0, missed: 0, notes: [],
  };
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true, volume: 0.55, reduced: false, autoSort: false, autoPause: true,
};

export function newWorld(seed = 19450819, difficulty: Difficulty = 'normal'): World {
  const w: World = {
    version: SAVE_VERSION, seed: seed | 0, rng: (seed | 0) || 0x1945,
    difficulty,
    day: 1, maxDays: 30, minute: 360, phase: 'morning', speed: 1, paused: false,
    weather: 'cloudy', weatherNext: 'clear', forecast: 'Trời hôm nay hơi âm u, đường còn khô.',
    money: DIFFICULTY[difficulty].money,
    rep: 50, community: 50, family: DIFFICULTY[difficulty].family,
    shopLevel: 1, upgrades: [], staff: [],
    warehouse: makeGrid(8, 5), shelves: makeGrid(5, 2),
    market: {} as World['market'], suppliers: {}, deliveries: [], debts: [],
    relations: relationSeed(), quests: {}, journal: [], eventsSeen: [], flags: {}, chapter: 1, ending: null,
    queue: [], activeCustomerId: null, news: [],
    dayLog: blankDayLog(1), history: [], settings: { ...DEFAULT_SETTINGS },
    location: 'shop', travelUsed: false,
    stats: { served: 0, missed: 0, trades: 0, streak: 0, bestStreak: 0, helped: 0, refused: 0 },
    createdAt: Date.now(), savedAt: 0,
  };
  w.market = marketSeed(w);
  w.suppliers = supplierSeed(w);
  w.quests = Object.fromEntries(QUESTS.map((q) => [q.id, {
    id: q.id, status: 'locked' as const, step: 0, choice: '', day: 0,
  }]));
  addStarting(w.warehouse, w, [
    ['rice_white', 4, 1], ['rice_old', 3, 0], ['salt', 2, 1], ['dried_fish', 2, 1],
    ['lamp_oil', 1, 1], ['do_paper', 3, 1], ['herbal_medicine', 1, 1], ['iou_note', 1, 1],
  ]);
  addStarting(w.shelves, w, [
    ['rice_white', 2, 1], ['rice_old', 2, 0], ['salt', 1, 1], ['dried_fish', 1, 1],
  ]);
  journal(w, 'story', 'Bạn mở cửa tiệm của gia đình vào một sáng tháng Tám. Két tiền mỏng, kệ thì vơi.', 'Chương 1');
  return w;
}

export function journal(w: World, kind: JournalEntry['kind'], text: string, meta = ''): void {
  w.journal.unshift({ day: w.day, kind, text, meta });
  if (w.journal.length > 160) w.journal.length = 160;
}
export function note(w: World, text: string): void {
  if (!w.dayLog.notes.includes(text)) w.dayLog.notes.push(text);
}
export function hasUpgrade(w: World, id: string): boolean { return w.upgrades.includes(id); }
export function hasStaff(w: World, id: string): boolean { return w.staff.includes(id); }

// ── SaveManager ─────────────────────────────────────────────────────────────
export interface SaveInfo { slot: Slot; day: number; money: number; savedAt: number; chapter: number; valid: boolean }

export function serialize(w: World, slot: Slot): string {
  const env: SaveEnvelope = { v: SAVE_VERSION, slot, savedAt: Date.now(), world: w };
  return JSON.stringify(env);
}

export function saveWorld(w: World, slot: Slot = 'auto'): boolean {
  try {
    const s = storage();
    const key = PREFIX + slot;
    const prev = s.getItem(key);
    if (prev && slot !== 'auto') s.setItem(key + '.bak', prev);
    if (prev && slot === 'auto') s.setItem(PREFIX + 'auto.bak', prev);
    w.savedAt = Date.now();
    s.setItem(key, serialize(w, slot));
    return true;
  } catch { return false; }
}

/** Merge bản cũ vào world mới: save cũ vẫn mở được, không phát lại giao dịch. */
export function migrate(raw: unknown): World | null {
  if (!raw || typeof raw !== 'object') return null;
  const env = raw as Partial<SaveEnvelope>;
  const old = (env.world ?? raw) as Partial<World>;
  if (typeof old !== 'object' || !old.day) return null;
  const base = newWorld(old.seed ?? 19450819, old.difficulty ?? 'normal');
  const merged: World = {
    ...base, ...old,
    version: SAVE_VERSION,
    settings: { ...base.settings, ...(old.settings ?? {}) },
    stats: { ...base.stats, ...(old.stats ?? {}) },
    warehouse: validGrid(old.warehouse, base.warehouse),
    shelves: validGrid(old.shelves, base.shelves),
    market: { ...base.market, ...(old.market ?? {}) },
    suppliers: { ...base.suppliers, ...(old.suppliers ?? {}) },
    relations: { ...base.relations, ...(old.relations ?? {}) },
    quests: { ...base.quests, ...(old.quests ?? {}) },
    dayLog: { ...base.dayLog, ...(old.dayLog ?? {}) },
  };
  // Dọn các con trỏ tạm: tải lại không bao giờ phát lại một giao dịch đang dở.
  merged.activeCustomerId = null;
  merged.paused = false;
  merged.queue = (merged.queue ?? []).map((c) => ({ ...c, state: c.state === 'active' ? 'waiting' : c.state }));
  if (!merged.phase || merged.phase === 'title') merged.phase = 'morning';
  return validate(merged) ? merged : null;
}

function validGrid(g: Grid | undefined, fallback: Grid): Grid {
  if (!g || !Array.isArray(g.cells) || !g.w || !g.h) return fallback;
  const cells: (Stack | null)[] = Array.from({ length: g.w * g.h }, (_, i) => {
    const c = g.cells[i];
    if (!c || typeof c !== 'object' || !ITEM[c.item]) return null;
    return {
      uid: typeof c.uid === 'string' ? c.uid : `m${i}`,
      item: c.item, qty: Math.max(0, Math.floor(c.qty)),
      q: clamp(c.q ?? 1, 0, 3) as Quality,
      fresh: typeof c.fresh === 'number' ? c.fresh : -1,
      origin: typeof c.origin === 'string' ? c.origin : 'unknown',
    };
  }).map((c) => (c && c.qty <= 0 ? null : c));
  return { w: g.w, h: g.h, cells };
}

export function validate(w: World): boolean {
  const nums = [w.money, w.rep, w.community, w.family, w.day, w.minute, w.rng];
  if (nums.some((n) => typeof n !== 'number' || !Number.isFinite(n))) return false;
  if (w.day < 1 || w.day > w.maxDays + 1) return false;
  if (!Array.isArray(w.warehouse.cells) || !Array.isArray(w.shelves.cells)) return false;
  if (w.money < 0 || w.rep < 0 || w.community < 0) {
    w.money = Math.max(0, w.money); w.rep = Math.max(0, w.rep); w.community = Math.max(0, w.community);
  }
  return true;
}

export function loadWorld(slot: Slot = 'auto'): World | null {
  const s = storage();
  let raw = s.getItem(PREFIX + slot);
  if (!raw) raw = s.getItem(PREFIX + slot + '.bak');
  if (!raw) return null;
  try { return migrate(JSON.parse(raw)); } catch { return null; }
}

export function listSaves(): SaveInfo[] {
  const s = storage();
  return SLOTS.map((slot) => {
    const raw = s.getItem(PREFIX + slot);
    if (!raw) return { slot, day: 0, money: 0, savedAt: 0, chapter: 0, valid: false };
    try {
      const w = migrate(JSON.parse(raw));
      return w
        ? { slot, day: w.day, money: w.money, savedAt: w.savedAt || 0, chapter: w.chapter, valid: true }
        : { slot, day: 0, money: 0, savedAt: 0, chapter: 0, valid: false };
    } catch { return { slot, day: 0, money: 0, savedAt: 0, chapter: 0, valid: false }; }
  });
}

export function deleteSave(slot: Slot): void {
  const s = storage();
  s.removeItem(PREFIX + slot);
  s.removeItem(PREFIX + slot + '.bak');
}
export function hasAnySave(): boolean { return listSaves().some((s) => s.valid); }
