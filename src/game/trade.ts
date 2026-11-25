// ── trade.ts · quầy giao dịch: đưa giá, mặc cả, đổi hàng, chịu, xác nhận ────
import { ITEM, QUALITY_NAME } from './data';
import { addDebt, fairSell, removeItem } from './economy';
import { gridOf, place, take, totalItem } from './inventory';
import { adjust, onTradeDone, rel } from './people';
import { clamp, coin, hasUpgrade, journal, note, rnd, round } from './state';
import type { Customer, GridId, Reaction, Trade, World } from './types';

export const TACTICS = [
  { id: 'hold', label: 'Giữ giá', hint: 'Để nguyên lời đã đưa.' },
  { id: 'acceptCounter', label: 'Nghe giá khách', hint: 'Chấp nhận giá khách vừa đưa.' },
  { id: 'small', label: 'Bớt nhẹ', hint: '−8%, dễ chốt hơn.' },
  { id: 'big', label: 'Bớt nhiều', hint: '−18%, gần như chắc chắn.' },
  { id: 'gift', label: 'Tặng thêm', hint: 'Cho kèm một món nhỏ, tăng thiện cảm.' },
  { id: 'barter', label: 'Đổi hàng', hint: 'Nhận đồ khách mang tới, trừ vào giá.' },
  { id: 'credit', label: 'Cho mua chịu', hint: 'Ghi sổ, hẹn trả sau 4 ngày.' },
  { id: 'refuse', label: 'Từ chối', hint: 'Không bán lần này.' },
] as const;
export type Tactic = typeof TACTICS[number]['id'];

/** Hash ổn định để save cũ (không có haggle) vẫn có một tính cách mặc cả cố định. */
function hashUnit(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}
const thresholdOf = (c: Customer): number =>
  typeof c.haggle === 'number' ? clamp(c.haggle, 0, 1) : hashUnit(c.id);

export function newTrade(customerId: string): Trade {
  return {
    customerId, lines: [], price: 0, mode: 'cash', discount: 0,
    reaction: null, counter: 0, gift: null, barter: null, inspected: [], step: 'build',
  };
}

export function baseTotal(t: Trade): number {
  return round(t.lines.reduce((s, l) => s + l.unit * l.qty, 0));
}
export function quoted(t: Trade): number {
  return Math.max(0, coin(baseTotal(t) * (1 + t.discount)));
}
export function barterValue(w: World, t: Trade): number {
  if (!t.barter) return 0;
  return coin(fairSell(w, t.barter.item, t.barter.q) * t.barter.qty * 0.82);
}

/** Đưa một chồng từ kho/kệ lên khay quầy. Chưa trừ hàng cho đến khi xác nhận. */
export function addLine(w: World, t: Trade, grid: GridId, cell: number, qty?: number): { ok: boolean; message: string } {
  if (t.step !== 'build') return { ok: false, message: 'Đã đưa giá, bỏ hàng ra khỏi khay trước đã.' };
  const s = gridOf(w, grid).cells[cell];
  if (!s || !ITEM[s.item]) return { ok: false, message: 'Ô này trống.' };
  const existing = t.lines.find((l) => l.uid === s.uid && l.grid === grid && l.cell === cell);
  if (!existing && t.lines.length >= 6) return { ok: false, message: 'Khay quầy chỉ chứa 6 món.' };
  const n = qty === undefined ? s.qty : clamp(Math.floor(qty), 1, s.qty);
  if (existing) {
    const max = s.qty - t.lines.filter((l) => l.uid === s.uid).reduce((a, b) => a + b.qty, 0) + existing.qty;
    existing.qty = Math.min(max, existing.qty + n);
    return { ok: true, message: `Thêm ${ITEM[s.item].name} lên khay.` };
  }
  t.lines.push({
    uid: s.uid, grid, cell, item: s.item, qty: n, q: s.q,
    unit: fairSell(w, s.item, s.q),
  });
  return { ok: true, message: `Đặt ${n} ${ITEM[s.item].name} lên khay.` };
}
export function removeLine(t: Trade, idx: number): void {
  t.lines.splice(idx, 1);
  t.reaction = null; t.step = 'build';
}
export function clearTrade(t: Trade): void {
  t.lines = []; t.price = 0; t.discount = 0; t.mode = 'cash';
  t.reaction = null; t.counter = 0; t.gift = null; t.barter = null;
  t.inspected = []; t.step = 'build';
}

/** Kiểm hàng: lộ phẩm chất, nguồn gốc, và giải mã "hàng không rõ gốc". */
export function inspect(w: World, t: Trade, idx: number): string {
  const l = t.lines[idx];
  if (!l) return 'Không có gì để kiểm.';
  if (t.inspected.includes(l.uid)) return `Đã kiểm: ${ITEM[l.item].name} · ${QUALITY_NAME[l.q]}.`;
  const s = gridOf(w, l.grid).cells[l.cell];
  if (l.item === 'unmarked_goods') {
    const reveal = (['rice_old', 'old_book', 'silver_bracelet', 'damaged_goods', 'tea_leaves', 'damaged_goods'] as const)[Math.floor(rnd(w) * 6)];
    l.item = reveal;
    l.q = (rnd(w) < 0.25 ? 2 : rnd(w) < 0.35 ? 0 : 1) as 0 | 1 | 2 | 3;
    l.unit = fairSell(w, reveal, l.q);
    if (s) { s.item = reveal; s.q = l.q; }
    t.inspected.push(l.uid);
    journal(w, 'story', `Bạn mở gói hàng không rõ gốc: hoá ra là ${ITEM[reveal].name}.`, 'Quầy');
    return `Mở gói ra: ${ITEM[reveal].name} · ${QUALITY_NAME[l.q]}. Giá hợp lý ~${l.unit} đ.`;
  }
  t.inspected.push(l.uid);
  const qText = QUALITY_NAME[l.q];
  const orig = s?.origin === 'heirloom' ? 'hàng của ông chủ cũ' : (s?.origin ?? 'không rõ');
  const warn = l.q === 0 ? ' ⚠ Hàng kém, khách dễ phàn nàn.' : '';
  return `${ITEM[l.item].name} · ${qText} · nguồn: ${orig} · giá hợp lý ~${l.unit} đ.${warn}`;
}

function qualityBad(t: Trade): boolean {
  return t.lines.some((l) => l.q === 0 && !t.inspected.includes(l.uid));
}

/** Quyết định của khách: giá, ngân sách, nhu cầu, tín nhiệm, uy tín, phẩm chất. */
export function decide(w: World, t: Trade, c: Customer, price: number): { accept: boolean; kind: Reaction['kind']; text: string; counter: number } {
  const r = rel(w, c.npc);
  const urgent = c.request.urgency;
  const trust = r.trust;
  const scarcity = clamp((w.market[c.request.item]?.demand ?? 1) / (w.market[c.request.item]?.supply ?? 1), 0.5, 2);
  const limit = coin(c.request.maxPrice * (1 + urgent * 0.18 + trust / 420 + (w.rep - 50) / 500 + (scarcity - 1) * 0.12));
  const bad = qualityBad(t) ? 0.16 : 0;
  const scale = hasUpgrade(w, 'scale') ? 0.05 : 0;
  const cashAvailable = c.budget + (t.mode === 'credit' ? c.request.maxPrice : 0);
  const needCash = Math.max(0, price - barterValue(w, t));

  if (needCash > cashAvailable * 1.35 && t.mode !== 'credit') {
    return { accept: false, kind: 'cantPay', text: `"Cháu chỉ có ${c.budget} đ thôi…", ${c.name} đặt lại mấy đồng xu.`, counter: cashAvailable };
  }
  if (price > limit * 1.28 && t.mode === 'cash') {
    const counter = coin(Math.min(limit, cashAvailable));
    return { accept: false, kind: 'haggle', text: `"Đắt quá, bớt cho ${counter} đ được không?"`, counter };
  }
  const p = clamp(
    0.56 + (limit - price) / Math.max(20, price) + (trust - 50) / 320 + (w.rep - 50) / 420
    + urgent * 0.12 + scale + (t.gift ? 0.12 : 0) - bad + (t.discount < 0 ? 0.08 : 0),
    0.05, 0.97,
  );
  // Quyết định cố định cho một mức giá: đưa giá và chốt sổ không bị "đổi ý" do RNG.
  if (p > thresholdOf(c)) {
    return { accept: true, kind: 'accept', text: pickAccept(c, price), counter: price };
  }
  if (c.request.credit && t.mode === 'cash' && price > c.budget) {
    return { accept: false, kind: 'askCredit', text: `"Cho cháu ghi sổ, mai trả nhé?"`, counter: price };
  }
  if (c.request.barter && t.mode === 'cash') {
    const b = c.request.barter;
    return {
      accept: false, kind: 'barter',
      text: `"Hay mình đổi ${b.qty} ${ITEM[b.item].name} lấy bớt đi?"`,
      counter: coin(price - barterValue(w, { ...t, barter: b })),
    };
  }
  const counter = coin(Math.min(price * 0.88, limit));
  return { accept: false, kind: 'haggle', text: `"Bớt chút nữa, ${counter} đ nhé?"`, counter };
}

function pickAccept(c: Customer, price: number): string {
  const lines = [
    `"Được, ${price} đ. Cảm ơn cô/chú."`,
    `"Ừ, lấy vậy." ${c.name} đếm tiền ngay.`,
    `"Giá này được rồi."`,
    `${c.name} gật đầu, cầm lấy hàng.`,
  ];
  return lines[Math.floor(hashUnit(`${c.id}:${price}`) * lines.length) % lines.length];
}

export function quote(w: World, t: Trade, c: Customer): Reaction {
  const price = quoted(t);
  const d = decide(w, t, c, price);
  const reaction: Reaction = { kind: d.kind, text: d.text, counter: d.counter, delta: 0 };
  t.reaction = reaction;
  t.price = price;
  t.counter = d.counter;
  t.step = 'quoted';
  return reaction;
}

export function applyTactic(w: World, t: Trade, c: Customer, action: Tactic): string {
  const base = quoted(t);
  switch (action) {
    case 'hold':
      t.price = base;
      return 'Bạn giữ nguyên giá.';
    case 'small':
      t.discount = clamp(t.discount - 0.08, -0.4, 0.3); t.price = quoted(t);
      return `Bớt nhẹ còn ${t.price} đ.`;
    case 'big':
      t.discount = clamp(t.discount - 0.18, -0.4, 0.3); t.price = quoted(t);
      return `Bớt nhiều còn ${t.price} đ.`;
    case 'acceptCounter':
      t.price = Math.max(0, coin(t.counter));
      return `Chấp nhận ${t.price} đ.`;
    case 'gift': {
      const cand = giftCandidate(w, t);
      if (!cand) return 'Kệ không còn món nhỏ nào để tặng.';
      t.gift = { item: cand, qty: 1 };
      return `Tặng kèm 1 ${ITEM[cand].name}.`;
    }
    case 'barter': {
      if (!c.request.barter) return `${c.name} không mang đồ để đổi.`;
      t.barter = { ...c.request.barter };
      t.mode = 'barter';
      t.price = Math.max(0, base - barterValue(w, t));
      return `Đổi ${t.barter.qty} ${ITEM[t.barter.item].name}, khách trả thêm ${t.price} đ.`;
    }
    case 'credit':
      t.mode = 'credit'; t.price = base;
      return `Ghi sổ ${base} đ, hẹn 4 ngày.`;
    case 'refuse':
      t.mode = 'cash';
      return 'Bạn lắc đầu, dọn hàng lại vào kệ.';
  }
}

function giftCandidate(w: World, t: Trade): string | null {
  const inTray = new Set(t.lines.map((l) => l.item));
  for (const s of [...w.shelves.cells, ...w.warehouse.cells]) {
    if (s && !inTray.has(s.item) && ITEM[s.item].sell <= 6 && s.qty > 0 && s.item !== 'damaged_goods') return s.item;
  }
  return null;
}

export interface CommitResult {
  ok: boolean; text: string; money: number; sfx: string; title: string;
}

/** Chỉ chạy khi người chơi bấm Xác nhận. Không tự trừ hàng trước đó. */
export function commit(w: World, t: Trade, c: Customer, confirmed: boolean): CommitResult {
  if (!confirmed) return { ok: false, text: 'Chưa xác nhận, chưa có giao dịch nào.', money: 0, sfx: 'error', title: 'Chưa chốt' };
  if (t.step === 'done') return { ok: false, text: 'Giao dịch này đã ghi sổ rồi.', money: 0, sfx: 'error', title: 'Đã chốt' };
  if (!t.lines.length) return { ok: false, text: 'Khay quầy còn trống.', money: 0, sfx: 'error', title: 'Khay trống' };

  const d = decide(w, t, c, t.price);
  const helped = t.discount <= -0.16 || t.mode === 'credit' || !!t.gift;
  if (!d.accept) {
    onTradeDone(w, c, { ok: false, qualityBad: false, helped: false, refused: false, value: 0, mode: t.mode });
    note(w, `${c.name}: không chốt được giá.`);
    return { ok: false, text: `${c.name} lắc đầu: "${d.text.replace(/^"|"$/g, '')}"`, money: 0, sfx: 'error', title: 'Không thành' };
  }

  // Trừ hàng thật, theo đúng ô người chơi đã kéo lên khay
  let missing = false;
  for (const l of t.lines) {
    const s = gridOf(w, l.grid).cells[l.cell];
    if (!s || s.uid !== l.uid || s.qty < l.qty) { missing = true; continue; }
    const taken = take(w, l.grid, l.cell, l.qty);
    if (!taken || taken.qty < l.qty) missing = true;
  }
  if (missing) {
    return { ok: false, text: 'Hàng trên kệ đã thay đổi, mời xếp lại khay.', money: 0, sfx: 'error', title: 'Hàng đã đổi' };
  }
  if (t.gift) {
    if (totalItem(w, t.gift.item) > 0) removeItem(w, t.gift.item, t.gift.qty);
    else t.gift = null;
  }
  if (t.barter) place(w, 'warehouse', t.barter.item, t.barter.qty, t.barter.q, c.npc);

  const cash = coin(t.price);
  if (t.mode === 'credit') {
    addDebt(w, c.name, c.npc, t.price, w.day + 4, 'receivable');
    note(w, `${c.name} ghi nợ ${t.price} đ.`);
  } else {
    w.money += cash;
    w.dayLog.revenue += cash;
  }
  if (t.gift) adjust(w, c.npc, 2, 'được tặng kèm một món nhỏ');
  onTradeDone(w, c, {
    ok: true, qualityBad: qualityBad(t), helped, refused: false,
    value: t.price, mode: t.mode,
  });
  if (helped) note(w, `Bạn nới giá cho ${c.name}.`);
  const title = t.mode === 'credit' ? 'Ghi sổ' : t.mode === 'barter' ? 'Đổi hàng' : 'Chốt xong';
  const text = t.mode === 'credit'
    ? `${c.name} ghi nợ ${t.price} đ, hẹn ngày ${w.day + 4}.`
    : `${c.name} trả ${cash} đ. ${d.text}`;
  t.step = 'done';
  return { ok: true, text, money: cash, sfx: 'coin', title };
}

export function refuse(w: World, t: Trade, c: Customer): CommitResult {
  clearTrade(t);
  onTradeDone(w, c, { ok: false, qualityBad: false, helped: false, refused: true, value: 0, mode: 'refuse' });
  note(w, `Bạn từ chối ${c.name}.`);
  return { ok: false, text: `${c.name} cười gượng rồi đi ra.`, money: 0, sfx: 'wood', title: 'Từ chối' };
}

export function tradeSheet(w: World, t: Trade, c: Customer): string {
  const rows = t.lines.map((l) => {
    const d = ITEM[l.item];
    return `• ${l.qty} × ${d.name} (${QUALITY_NAME[l.q]}) — ${l.unit} đ/đơn = ${coin(l.unit * l.qty)} đ`;
  });
  const bits = [
    `Khách: ${c.name} · ngân sách ~${c.budget} đ · cần ${c.request.qty} ${ITEM[c.request.item].name}`,
    ...rows,
    `Giá gốc: ${baseTotal(t)} đ · điều chỉnh ${Math.round(t.discount * 100)}%`,
    t.barter ? `Đổi: ${t.barter.qty} ${ITEM[t.barter.item].name} (trừ ${barterValue(w, t)} đ)` : '',
    t.gift ? `Tặng kèm: 1 ${ITEM[t.gift.item].name}` : '',
    `Khách trả: ${t.price} đ · hình thức: ${({ cash: 'tiền mặt', credit: 'mua chịu', barter: 'đổi hàng', gift: 'có quà' } as Record<string, string>)[t.mode]}`,
    '',
    'Mọi giá trị đã tính. Bấm Xác nhận mới thực hiện giao dịch.',
  ].filter(Boolean);
  return bits.join('\n');
}
