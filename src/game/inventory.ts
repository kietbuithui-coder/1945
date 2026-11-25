// ── inventory.ts · kho & kệ: grid thật, kéo thả thật, hư hỏng thật ──────────
import { ITEM, QUALITY_MULT, STAPLES, UPGRADE } from './data';
import { clamp, hasUpgrade, journal, makeStack, note, uid } from './state';
import type { Grid, GridId, Quality, Stack, World } from './types';

export const SORT_KEYS = ['manual', 'category', 'qty', 'value', 'quality', 'expiry'] as const;
export type SortKey = typeof SORT_KEYS[number];

export const gridOf = (w: World, id: GridId): Grid => id === 'warehouse' ? w.warehouse : w.shelves;
export const otherGrid = (id: GridId): GridId => id === 'warehouse' ? 'shelves' : 'warehouse';

export function wantedSize(w: World, id: GridId): { w: number; h: number } {
  if (id === 'warehouse') {
    let h = 5;
    if (hasUpgrade(w, 'warehouse')) h += 2;
    if (hasUpgrade(w, 'cellar')) h += 1;
    if (w.shopLevel >= 4) h += 1;
    return { w: 8, h };
  }
  let h = 2;
  if (hasUpgrade(w, 'shelves')) h += 1;
  if (w.shopLevel >= 3) h += 1;
  if (w.shopLevel >= 5) h += 1;
  return { w: 5, h };
}

/** Nới/khép grid mà không xáo trộn vị trí người chơi đã xếp tay. */
export function resizeGrids(w: World): void {
  for (const id of ['warehouse', 'shelves'] as GridId[]) {
    const g = gridOf(w, id);
    const { w: gw, h: gh } = wantedSize(w, id);
    g.w = gw;
    const target = gw * gh;
    if (g.cells.length < target) {
      const oldRows = g.h || Math.ceil(g.cells.length / gw);
      // chèn các ô mới theo từng hàng để các hàng cũ giữ nguyên thứ tự
      const rebuilt: (Stack | null)[] = [];
      for (let r = 0; r < gh; r++) {
        for (let c = 0; c < gw; c++) {
          const oldIdx = r * gw + c;
          rebuilt.push(r < oldRows ? (g.cells[oldIdx] ?? null) : null);
        }
      }
      g.cells = rebuilt;
    } else if (g.cells.length > target) {
      g.cells = g.cells.slice(0, target);
    }
    g.h = gh;
  }
}

export const nominal = (s: Stack): number =>
  (ITEM[s.item]?.sell ?? 0) * QUALITY_MULT[s.q] * s.qty;

export const stackMax = (item: string): number => ITEM[item]?.stack ?? 20;
export const compatible = (a: Stack, b: Stack): boolean =>
  a.item === b.item && a.q === b.q && a.fresh === b.fresh && a.origin === b.origin && a.uid !== b.uid;

export function firstEmpty(g: Grid): number { return g.cells.findIndex((c) => c === null); }
export function usedCells(g: Grid): number { return g.cells.filter(Boolean).length; }

export function countItem(w: World, id: GridId, item: string): number {
  return gridOf(w, id).cells.reduce((n, c) => n + (c && c.item === item ? c.qty : 0), 0);
}
export function totalItem(w: World, item: string): number {
  return countItem(w, 'warehouse', item) + countItem(w, 'shelves', item);
}

/** Thêm hàng vào grid, gộp chồng nếu cùng phẩm chất / hạn / nguồn. Trả lại số chưa xếp được. */
export function addStack(w: World, g: Grid, s: Stack): number {
  let left = s.qty;
  const def = ITEM[s.item];
  const max = def?.stack ?? 20;
  for (const c of g.cells) {
    if (left <= 0) break;
    if (c && compatible(c, s) && c.qty < max) {
      const take = Math.min(left, max - c.qty);
      c.qty += take; left -= take;
    }
  }
  for (let i = 0; i < g.cells.length && left > 0; i++) {
    if (g.cells[i]) continue;
    const take = Math.min(left, max);
    g.cells[i] = { ...s, uid: uid(w, 'a'), qty: take, fresh: s.fresh };
    left -= take;
  }
  return left;
}

/** Giao nhận hàng từ hệ thống (chuyến hàng, hiệu ứng sự kiện). */
export function place(w: World, id: GridId, item: string, qty: number, q: Quality = 1, origin = 'market'): number {
  if (!ITEM[item] || qty <= 0) return 0;
  const g = gridOf(w, id);
  const left = addStack(w, g, makeStack(w, item, qty, q, origin));
  return qty - left;
}

/** Bốc hàng khỏi một ô. Trả về chồng đã bốc (đã trừ khỏi grid). */
export function take(w: World, id: GridId, cell: number, qty?: number): Stack | null {
  const g = gridOf(w, id);
  const s = g.cells[cell];
  if (!s) return null;
  const n = qty === undefined ? s.qty : Math.min(qty, s.qty);
  if (n <= 0) return null;
  const out: Stack = { ...s, qty: n };
  s.qty -= n;
  if (s.qty <= 0) g.cells[cell] = null;
  return out;
}

export interface MoveResult { ok: boolean; message: string }

/** Kéo thả: cùng grid hay khác grid, gộp / tách / đổi chỗ đều xử lý. */
export function move(w: World, from: GridId, fi: number, to: GridId, ti: number, qty?: number): MoveResult {
  const a = gridOf(w, from), b = gridOf(w, to);
  if (fi < 0 || fi >= a.cells.length || ti < 0 || ti >= b.cells.length) return { ok: false, message: 'Ô không hợp lệ.' };
  const src = a.cells[fi];
  if (!src) return { ok: false, message: 'Ô này trống.' };
  const n = qty === undefined ? src.qty : clamp(Math.floor(qty), 1, src.qty);
  const dst = b.cells[ti];

  if (from === to && fi === ti) return { ok: false, message: 'Vẫn ở chỗ cũ.' };
  if (dst && !compatible(dst, src) && n === src.qty && qty === undefined) {
    // đổi chỗ hai chồng
    a.cells[fi] = dst; b.cells[ti] = src;
    return { ok: true, message: 'Đổi chỗ hai chồng.' };
  }
  if (dst && compatible(dst, src)) {
    const room = stackMax(dst.item) - dst.qty;
    if (room <= 0) return { ok: false, message: 'Chồng này đã đầy.' };
    const takeN = Math.min(n, room);
    dst.qty += takeN;
    src.qty -= takeN;
    if (src.qty <= 0) a.cells[fi] = null;
    if (takeN < n && a.cells[fi]) a.cells[fi] = src;
    return { ok: true, message: `Gộp ${takeN} ${ITEM[src.item].name}.` };
  }
  if (dst) return { ok: false, message: 'Hai chồng khác loại, không gộp được.' };

  b.cells[ti] = { ...src, uid: uid(w, 's'), qty: n, fresh: src.fresh };
  src.qty -= n;
  if (src.qty <= 0) a.cells[fi] = null;
  if (from === to && w.settings.autoSort) sortGrid(w, a, w.sortKey ?? 'category');
  return { ok: true, message: `Chuyển ${n} ${ITEM[src.item].name}.` };
}

export function split(w: World, id: GridId, cell: number): MoveResult {
  const g = gridOf(w, id);
  const s = g.cells[cell];
  if (!s || s.qty < 2) return { ok: false, message: 'Chồng này không tách được.' };
  const empty = firstEmpty(g);
  if (empty < 0) return { ok: false, message: 'Kho đầy, không còn ô trống.' };
  const half = Math.floor(s.qty / 2);
  g.cells[empty] = { ...s, uid: uid(w, 's'), qty: s.qty - half };
  s.qty = half;
  return { ok: true, message: `Tách đôi: ${half} / ${s.qty - half}.` };
}

export function mergeAll(w: World, id: GridId): number {
  const g = gridOf(w, id);
  let merged = 0;
  for (let i = 0; i < g.cells.length; i++) {
    const a = g.cells[i];
    if (!a) continue;
    for (let j = i + 1; j < g.cells.length; j++) {
      const b = g.cells[j];
      if (!b || !compatible(a, b)) continue;
      const room = stackMax(a.item) - a.qty;
      if (room <= 0) break;
      const n = Math.min(room, b.qty);
      a.qty += n; b.qty -= n; merged += n;
      if (b.qty <= 0) g.cells[j] = null;
    }
  }
  return merged;
}

export function sortGrid(w: World, id: GridId | Grid, key: SortKey): void {
  const g = typeof id === 'string' ? gridOf(w, id) : id;
  if (key === 'manual') return;
  const cells = g.cells.filter((c): c is Stack => !!c);
  const val = (s: Stack): number => {
    switch (key) {
      case 'category': return ITEM[s.item]?.cat.localeCompare('') ?? 0;
      case 'qty': return -s.qty;
      case 'value': return -nominal(s);
      case 'quality': return -s.q;
      case 'expiry': return s.fresh < 0 ? 9999 : s.fresh;
      default: return 0;
    }
  };
  const cat = (s: Stack): string => ITEM[s.item]?.cat ?? '';
  cells.sort((a, b) => (key === 'category' ? cat(a).localeCompare(cat(b)) || val(a) - val(b) : val(a) - val(b)));
  g.cells = [...cells, ...Array.from({ length: g.cells.length - cells.length }, () => null)];
  if (typeof id === 'string') w.sortKey = key;
}

export interface FilterOpts { search: string; cat: string | 'all'; grid: GridId }
export function visible(w: World, opts: FilterOpts): number[] {
  const g = gridOf(w, opts.grid);
  const q = opts.search.trim().toLowerCase();
  return g.cells.map((c, i) => ({ c, i })).filter(({ c }) => {
    if (!c) return true;
    const d = ITEM[c.item];
    if (!d) return false;
    if (opts.cat !== 'all' && d.cat !== opts.cat) return false;
    if (q && !d.name.toLowerCase().includes(q) && !d.id.includes(q)) return false;
    return true;
  }).map(({ i }) => i);
}

/** Bổ sung kệ nhanh — không bắt kéo từng món, nhưng vẫn tốn hàng thật trong kho. */
export function quickRestock(w: World): number {
  const wh = w.warehouse, sh = w.shelves;
  let moved = 0;
  const cands = wh.cells
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c && c.qty > 0)
    .sort((a, b) => {
      const sa = a.c!, sb = b.c!;
      const pa = STAPLES.includes(sa.item) ? 100 : 0;
      const pb = STAPLES.includes(sb.item) ? 100 : 0;
      return (pb + nominal(sb)) - (pa + nominal(sa));
    });
  for (const { c, i } of cands) {
    if (!c) continue;
    // đừng dồn hết một mặt hàng: ưu tiên lấp ô trống trên kệ
    const empty = firstEmpty(sh);
    if (empty < 0) break;
    const n = Math.min(c.qty, Math.max(1, Math.ceil(c.qty / 2)));
    const ok = move(w, 'warehouse', i, 'shelves', empty, n);
    if (ok.ok) moved += n;
  }
  return moved;
}

/** Mỗi ngày: rau héo, gạo mốc, cá ướt. Có nguyên nhân, có cách chống lại. */
export function spoil(w: World): { lost: number; count: number } {
  let lost = 0, count = 0;
  const rainPenalty = (w.weather === 'rain' || w.weather === 'storm') && !hasUpgrade(w, 'roof') ? 1 : 0;
  const lamp = hasUpgrade(w, 'lamp') ? 0.9 : 1;
  const cellar = hasUpgrade(w, 'cellar') ? 2 : 0;
  for (const id of ['warehouse', 'shelves'] as GridId[]) {
    const g = gridOf(w, id);
    g.cells.forEach((s, i) => {
      if (!s) return;
      const def = ITEM[s.item];
      if (!def || def.perish <= 0 || s.fresh < 0 || s.item === 'damaged_goods') return;
      s.fresh = Math.max(0, s.fresh - 1 - rainPenalty + cellar);
      if (s.fresh > 0) return;
      const before = nominal(s);
      if (s.q > 0 && !rainPenalty) {
        s.q = (s.q - 1) as Quality;
        s.fresh = Math.max(1, def.perish - 1);
        lost += before - nominal(s);
        count += 1;
      } else {
        // hư hẳn → đổi thành "Hàng hư", vẫn có thể bán rẻ hoặc bỏ đi
        g.cells[i] = {
          ...s, uid: uid(w, 'd'), item: 'damaged_goods', q: 0, fresh: -1, origin: 'spoiled',
          qty: Math.min(s.qty, stackMax('damaged_goods')),
        };
        lost += before - nominal(g.cells[i]!);
        count += s.qty;
      }
    });
  }
  lost = Math.round(lost * lamp);
  if (count > 0) {
    w.dayLog.spoilage += count;
    note(w, `${count} món hư hỏng (hao ~${lost} ${'đ'}).`);
    journal(w, 'system', `Đêm qua ${count} món hàng hư, hao khoảng ${lost} đồng.`, 'Kho');
  }
  return { lost, count };
}

export function detail(s: Stack): string {
  const d = ITEM[s.item];
  if (!d) return 'Không rõ vật phẩm.';
  const bits = [
    `${d.name} · ${d.cat === 'food' ? 'Lương thực' : 'Hàng hóa'}`,
    `Số lượng ${s.qty}/${stackMax(s.item)}`,
    `Giá tham chiếu ${d.sell} đ · giá trị ~${Math.round(nominal(s))} đ`,
    `Phẩm chất ${['Kém', 'Thường', 'Tốt', 'Đặc biệt'][s.q]}`,
    `Thể tích ${d.vol}/đơn vị · cân nặng ${d.weight}`,
    s.fresh >= 0 ? `Còn ${s.fresh} ngày trước hư` : 'Không hư hỏng',
    `Nguồn: ${s.origin === 'heirloom' ? 'hàng của ông chủ cũ' : s.origin}`,
    d.desc,
  ];
  return bits.join('\n');
}

declare module './types' {
  interface World { sortKey?: SortKey }
}
export const upgradeName = (id: string): string => UPGRADE[id]?.name ?? id;
