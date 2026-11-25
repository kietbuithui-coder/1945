// ── economy.ts · cung cầu, thời tiết, nguồn cung, vận chuyển, công nợ ───────
import {
  DIFFICULTY, FRESH, ITEM, ITEMS, QUALITY_MULT, SUPPLIER, SUPPLIERS, WEATHER_NAME,
} from './data';
import { countItem, place, totalItem } from './inventory';
import { clamp, coin, hasStaff, hasUpgrade, journal, note, rnd, round, uid } from './state';
import type { Delivery, Quality, SupplierState, Weather, World } from './types';

export const PRICE_MIN = 0.45;
export const PRICE_MAX = 2.35;

export function demandSupply(w: World, item: string): number {
  const m = w.market[item];
  if (!m) return 1;
  return clamp(m.demand / Math.max(0.25, m.supply), PRICE_MIN, PRICE_MAX);
}

export function fairSell(w: World, item: string, q: Quality | number = 1): number {
  const d = ITEM[item];
  if (!d) return 1;
  const m = w.market[item] ?? { supply: 1, demand: 1, flag: 0 };
  const raw = d.sell * demandSupply(w, item) * (1 + m.flag) * QUALITY_MULT[clamp(q, 0, 3) as Quality];
  return Math.max(1, coin(raw));
}
export function fairBuy(w: World, item: string, q: Quality | number = 1): number {
  const d = ITEM[item];
  if (!d) return 1;
  const m = w.market[item] ?? { supply: 1, demand: 1, flag: 0 };
  const ds = Math.pow(demandSupply(w, item), 0.65);
  const raw = d.buy * ds * (1 + m.flag * 0.6) * QUALITY_MULT[clamp(q, 0, 3) as Quality];
  return Math.max(1, coin(raw));
}
export function supplierPrice(w: World, sid: string, item: string, q: Quality = 1, mode: 'cash' | 'barter' | 'order' = 'cash'): number {
  const s = w.suppliers[sid], def = SUPPLIER[sid];
  if (!s || !def) return fairBuy(w, item, q);
  const bondDiscount = 1 - clamp(s.bond / 500, 0, 0.12);
  const orderDiscount = mode === 'order' ? 0.93 : 1;
  const barterFee = mode === 'barter' ? 1.06 : 1;
  return Math.max(1, coin(fairBuy(w, item, q) * def.priceFactor * s.priceFactor / def.priceFactor * bondDiscount * orderDiscount * barterFee));
}

/** Cung cầu random-walk có hồi quy về 1.0 — không tăng giá vô cớ mỗi ngày. */
export function marketStep(w: World): void {
  const supplyMult = DIFFICULTY[w.difficulty].supply;
  const storm = w.weather === 'storm' ? 1 : 0;
  const rain = w.weather === 'rain' ? 1 : 0;
  for (const it of ITEMS) {
    const m = w.market[it.id] ?? (w.market[it.id] = { supply: 1, demand: 1, flag: 0 });
    const isFresh = FRESH.includes(it.id) || it.tags.includes('perishable');
    const isStaple = it.tags.includes('staple');
    const isFuel = it.tags.includes('fuel');
    const isMed = it.tags.includes('medicine');

    // Cú sốc nguồn cung do thời tiết / vận chuyển
    let supplyShock = (rnd(w) - 0.5) * 0.16 * (it.tags.includes('rare') ? 1.5 : 1);
    if (isFresh && (rain || storm)) supplyShock -= 0.12 + storm * 0.14;
    if (storm && it.tags.includes('material')) supplyShock -= 0.06;
    m.supply = clamp(m.supply + (1 - m.supply) * 0.22 + supplyShock * (2 - supplyMult), 0.42, 1.85);

    // Nhu cầu: mưa → thực phẩm, dầu đèn, thuốc; khan hiếm → người ta càng tìm mua
    let demandTarget = 1;
    if (isStaple && (rain || storm)) demandTarget += 0.12 + storm * 0.1;
    if (isFuel && (rain || storm)) demandTarget += 0.15;
    if (isMed && storm) demandTarget += 0.1;
    if (m.supply < 0.7 && isStaple) demandTarget += 0.08;
    const demandShock = (rnd(w) - 0.5) * 0.1;
    m.demand = clamp(m.demand + (demandTarget - m.demand) * 0.3 + demandShock, 0.42, 1.85);
    m.flag = round(m.flag * 0.55); // mọi cú sốc giá đều có nguyên nhân và tự nguôi
  }
  const headline = newsFor(w);
  w.news = [headline];
}

function newsFor(w: World): string {
  if (w.weather === 'storm') return 'Mưa lớn suốt đêm, đường đê lầy — chuyến hàng dễ trễ.';
  if (w.weather === 'rain') return 'Mưa rả rích, rau và cá tươi khó giữ qua ngày.';
  const rice = w.market.rice_white;
  if (rice && rice.supply < 0.8) return 'Gạo về ít, người xóm Bến bắt đầu hỏi giá sớm hơn.';
  if (w.day > 20) return 'Phố trên rục rịch đặt hàng cho mùa mới.';
  return 'Chợ hôm nay họp đều, tiếng rao vọng tới đầu ngõ.';
}

export function rollWeather(w: World): void {
  w.weather = w.weatherNext;
  const r = rnd(w);
  const seasonBias = w.day > 12 && w.day < 24 ? 0.12 : 0;
  w.weatherNext = (r < 0.36 - seasonBias ? 'clear' : r < 0.7 - seasonBias ? 'cloudy' : r < 0.9 ? 'rain' : 'storm') as Weather;
  const map: Record<Weather, string> = {
    clear: 'Ngày mai trời quang, xe dễ đi.',
    cloudy: 'Ngày mai nhiều mây, đường vẫn khô.',
    rain: 'Ngày mai có mưa — rau cá nên bán sớm.',
    storm: 'Ngày mai mưa lớn, coi chừng chuyến hàng.',
  };
  w.forecast = map[w.weatherNext];
}

export function restockSuppliers(w: World): void {
  const mult = DIFFICULTY[w.difficulty].supply;
  const badRoad = w.weather === 'rain' || w.weather === 'storm';
  for (const def of SUPPLIERS) {
    const s: SupplierState = w.suppliers[def.id];
    if (!s) continue;
    for (const id of def.items) {
      const d = ITEM[id];
      if (!d) continue;
      const rare = d.tags.includes('rare') || d.tags.includes('luxury');
      let add = Math.max(1, Math.round((rare ? 1.5 : 4) * mult * (0.6 + rnd(w) * 0.9)));
      if (s.bond > 20) add += 1;                 // mối quan hệ ưu tiên khi khan hiếm
      if (badRoad && (d.tags.includes('fresh') || d.tags.includes('perishable'))) add = Math.ceil(add * 0.5);
      if (badRoad && rnd(w) > s.reliability) add = 0;
      const cap = rare ? 6 : 16;
      const cur = s.stock[id]?.qty ?? 0;
      s.stock[id] = {
        qty: Math.min(cap, cur + add),
        q: (rnd(w) < 0.1 + s.bond / 600 ? 2 : rnd(w) < 0.08 ? 0 : 1) as Quality,
      };
    }
    s.note = badRoad && rnd(w) > s.reliability ? 'Đường xấu, chưa chắc có hàng.' : '';
    s.lastRestock = w.day;
  }
}

export interface ProcureResult { ok: boolean; message: string; delivery?: Delivery }

/** Nhập hàng. delay = 0 nhận ngay, >0 tạo chuyến có hẹn và rủi ro. */
export function procure(
  w: World, sid: string, item: string, qty: number, mode: 'cash' | 'barter' | 'order' = 'cash',
  payItem?: string,
): ProcureResult {
  const def = SUPPLIER[sid], s = w.suppliers[sid], d = ITEM[item];
  if (!def || !s || !d) return { ok: false, message: 'Nhà cung cấp hoặc mặt hàng không tồn tại.' };
  const n = Math.floor(qty);
  if (n <= 0) return { ok: false, message: 'Số lượng không hợp lệ.' };
  const stock = s.stock[item];
  if (!stock || stock.qty < n) return { ok: false, message: `${def.name} chỉ còn ${stock?.qty ?? 0} ${d.name}.` };
  const unit = supplierPrice(w, sid, item, stock.q, mode);
  const cost = coin(unit * n);

  if (mode === 'barter') {
    const pay = payItem && totalItem(w, payItem) > 0 ? payItem : defaultBarterItem(w, item);
    if (!pay) return { ok: false, message: 'Kho không có hàng để đổi.' };
    const need = Math.ceil(cost / Math.max(1, fairSell(w, pay, 1)));
    if (totalItem(w, pay) < need) return { ok: false, message: `Cần ${need} ${ITEM[pay].name} để đổi, kho không đủ.` };
    removeItem(w, pay, need);
  } else if (w.money < cost) {
    return { ok: false, message: `Thiếu ${cost - w.money} đ (cần ${cost} đ).` };
  } else {
    w.money -= cost;
    w.dayLog.cost += cost;
  }

  s.stock[item].qty -= n;
  s.bond = clamp(s.bond + (mode === 'order' ? 3 : 2), 0, 100);
  const extra = mode === 'order' ? 2 : 0;
  const due = w.day + def.delay + s.delay + extra + (w.weather === 'storm' ? 1 : 0);
  const risk = clamp((1 - s.reliability) * 0.7 + (w.weather === 'storm' ? 0.2 : 0) - (hasStaff(w, 'hung') ? 0.2 : 0) - (w.flags.route_fixed ? 0.2 : 0), 0, 0.75);
  const delivery: Delivery = {
    id: uid(w, 'd'), supplier: sid, item, qty: n, q: stock.q, cost,
    due, risk, prepaid: true, mode, // mọi hình thức đều đã thanh toán / đổi hàng lúc đặt
  };

  // Mối hàng giao ngay: phải thấy hàng trong kho ngay, không đợi sang ngày mai.
  if (due <= w.day) {
    const placed = place(w, 'warehouse', item, n, stock.q, sid);
    if (placed < n) {
      const refund = coin((n - placed) * fairBuy(w, item, stock.q) * 0.5);
      w.money += refund;
      w.dayLog.cost = Math.max(0, w.dayLog.cost - refund);
      note(w, `Kho đầy, ${n - placed} ${d.name} gửi lại ${def.name} (hoàn ${refund} đ).`);
    }
    return { ok: true, message: `Đã lấy ${placed} ${d.name} (${cost} đ), hàng vào kho ngay.`, delivery };
  }

  w.deliveries.push(delivery);
  return { ok: true, message: `Đặt ${n} ${d.name} (${cost} đ), hẹn ngày ${due}.`, delivery };
}

function defaultBarterItem(w: World, except: string): string | null {
  const cands = Object.keys(w.market).filter((id) => id !== except && totalItem(w, id) >= 2 && ITEM[id].sell > 0 && ITEM[id].sell < 20);
  return cands.sort((a, b) => totalItem(w, b) - totalItem(w, a))[0] ?? null;
}
export function removeItem(w: World, item: string, qty: number): number {
  let left = qty;
  for (const id of ['shelves', 'warehouse'] as const) {
    const g = id === 'shelves' ? w.shelves : w.warehouse;
    for (let i = 0; i < g.cells.length && left > 0; i++) {
      const s = g.cells[i];
      if (!s || s.item !== item) continue;
      const n = Math.min(left, s.qty);
      s.qty -= n; left -= n;
      if (s.qty <= 0) g.cells[i] = null;
    }
  }
  return qty - left;
}

/** Chuyến hàng đến hạn: trễ, hư trên đường, hoặc về nguyên vẹn. */
export function resolveDeliveries(w: World): Delivery[] {
  const arrived: Delivery[] = [];
  const pending: Delivery[] = [];
  for (const d of w.deliveries) {
    if (d.due > w.day) { pending.push(d); continue; }
    const s = w.suppliers[d.supplier];
    const protect = w.flags.route_fixed || hasStaff(w, 'hung') ? 0.5 : 1;
    const roll = rnd(w);
    let qty = d.qty, q = d.q;
    let damaged = 0;
    if (roll < d.risk * protect) {
      const loss = Math.max(1, Math.round(d.qty * (0.3 + rnd(w) * 0.4)));
      qty -= loss; damaged = loss;
      w.flags.delivery_late = 1;
      journal(w, 'event', `Chuyến ${ITEM[d.item].name} từ ${SUPPLIER[d.supplier].name} về thiếu ${loss} món.`, 'Vận chuyển');
    }
    if ((w.weather === 'rain' || w.weather === 'storm') && !hasUpgrade(w, 'roof') && !hasStaff(w, 'hung') && rnd(w) < 0.35) {
      q = Math.max(0, q - 1) as Quality;
      journal(w, 'system', `Hàng ${ITEM[d.item].name} bị ướt trên đường, phẩm chất giảm.`, 'Vận chuyển');
    }
    const placed = place(w, 'warehouse', d.item, qty, q, d.supplier);
    if (placed < qty) {
      w.money += Math.round((qty - placed) * fairBuy(w, d.item, q) * 0.5);
      note(w, `Kho đầy, ${qty - placed} ${ITEM[d.item].name} gửi lại bến (hoàn một nửa).`);
    }
    if (damaged > 0) note(w, `Chuyến hàng hao ${damaged} ${ITEM[d.item].name} do đường xấu.`);
    arrived.push(d);
  }
  w.deliveries = pending;
  if (arrived.length) w.flags.delivery_any = 1;
  return arrived;
}

// ── Công nợ ─────────────────────────────────────────────────────────────────
export function addDebt(w: World, who: string, npc: string | null, amount: number, due: number, kind: 'receivable' | 'payable'): void {
  w.debts.push({ id: uid(w, 'n'), who, npc, amount: coin(amount), paid: 0, due, kind, history: [`Ngày ${w.day}: ${coin(amount)} đ`] });
  if (kind === 'receivable') w.dayLog.debtOut += coin(amount);
  else w.dayLog.debtIn += coin(amount);
  journal(w, 'system', `${who} ${kind === 'receivable' ? 'nợ tiệm' : 'cho tiệm vay'} ${coin(amount)} đ, hẹn ngày ${due}.`, 'Sổ nợ');
}
export function payDebt(w: World, id: string, amount?: number): { ok: boolean; message: string } {
  const d = w.debts.find((x) => x.id === id);
  if (!d) return { ok: false, message: 'Khoản nợ không còn.' };
  const rest = d.amount - d.paid;
  if (d.kind === 'payable') {
    const n = Math.min(rest, amount ?? rest);
    if (w.money < n) return { ok: false, message: 'Két không đủ để trả.' };
    w.money -= n; d.paid += n; w.dayLog.cost += n;
  } else {
    const n = Math.min(rest, amount ?? rest);
    w.money += n; d.paid += n; w.dayLog.revenue += n;
  }
  d.history.push(`Ngày ${w.day}: trả ${d.paid}/${d.amount} đ`);
  if (d.paid >= d.amount) w.debts = w.debts.filter((x) => x.id !== id);
  return { ok: true, message: `Đã ghi ${d.who}: xong một khoản.` };
}

/** NPC trả nợ đúng hạn / trả một phần / chưa thể trả — không phải máy in tiền. */
export function collectDebts(w: World): void {
  for (const d of [...w.debts]) {
    if (d.kind !== 'receivable' || d.due > w.day) continue;
    const rel = d.npc ? w.relations[d.npc] : null;
    const chance = 0.45 + (rel ? rel.trust / 300 : 0) + w.community / 500;
    if (rnd(w) < chance) {
      const part = rnd(w) < 0.75 ? d.amount - d.paid : Math.ceil((d.amount - d.paid) / 2);
      w.money += part; d.paid += part; w.dayLog.revenue += part; w.dayLog.debtIn += part;
      d.history.push(`Ngày ${w.day}: trả ${part} đ`);
      note(w, `${d.who} trả ${part} đ nợ cũ.`);
      if (d.paid >= d.amount) w.debts = w.debts.filter((x) => x.id !== d.id);
      else d.due = w.day + 3;
    } else {
      d.due = w.day + 2;
      note(w, `${d.who} chưa trả được, hẹn lại ngày ${d.due}.`);
      if (rel) rel.trust = clamp(rel.trust - 1, 0, 100);
    }
  }
  for (const d of [...w.debts]) {
    if (d.kind !== 'payable' || d.due > w.day) continue;
    const rest = d.amount - d.paid;
    if (w.money >= rest) {
      w.money -= rest; d.paid = d.amount; w.dayLog.cost += rest;
      w.debts = w.debts.filter((x) => x.id !== d.id);
      note(w, `Trả đủ ${rest} đ cho ${d.who}.`);
    } else {
      w.rep = clamp(w.rep - 3, 0, 100);
      d.due = w.day + 2;
      note(w, `Chưa trả được ${d.who} (${rest} đ), uy tín giảm 3.`);
    }
  }
}

/** Chi phí cuối ngày: lương nhân viên, bếp nhà mình. */
export function dailyCosts(w: World): void {
  let wages = 0;
  for (const id of w.staff) wages += ({ mai: 6, ty: 4, lan: 5, hung: 7 } as Record<string, number>)[id] ?? 5;
  if (wages > 0) {
    if (w.money >= wages) { w.money -= wages; w.dayLog.cost += wages; note(w, `Lương nhân viên ${wages} đ.`); }
    else {
      w.staff = [];
      w.rep = clamp(w.rep - 4, 0, 100);
      note(w, 'Không đủ trả lương, mọi người xin nghỉ. Uy tín −4.');
      journal(w, 'system', 'Két tiền không đủ lương, nhân viên rời tiệm.', 'Nhân sự');
    }
  }
  if (hasStaff(w, 'lan')) { w.money += 1; w.dayLog.revenue += 1; note(w, 'Sổ sách rõ ràng, thất thoát giảm (+1 đ).'); }

  // Gia đình ăn 2 suất/ngày: lấy từ kho trước, không đủ thì mua, không đủ nữa thì cộng đồng đi xuống
  let need = 2;
  for (const item of ['rice_white', 'rice_old', 'corn', 'sweet_potato', 'cassava', 'cassava_dried'] as const) {
    if (need <= 0) break;
    const got = removeItem(w, item, need);
    need -= got;
  }
  if (need > 0) {
    const cost = need * 5;
    if (w.money >= cost) { w.money -= cost; w.dayLog.cost += cost; note(w, `Mua ${need} suất gạo cho bếp nhà (${cost} đ).`); }
    else { w.family = Math.max(0, w.family - need * 2); w.community = clamp(w.community - 2, 0, 100); note(w, 'Bếp nhà thiếu, sức khỏe gia đình giảm.'); }
  } else {
    w.family = Math.min(20, w.family + 1);
  }
  // route_fixed được tiêu thụ ở lần resolveDeliveries kế tiếp; delivery_late giữ
  // đến buổi tối để quest "Chuyến hàng bị trễ" còn có nghĩa. Chỉ cập nhật cờ tồn tại.
  w.flags.delivery_any = w.deliveries.length ? 1 : 0;
}

export function dueList(w: World): Delivery[] { return [...w.deliveries].sort((a, b) => a.due - b.due); }
export function priceTrend(w: World, item: string): 'up' | 'down' | 'flat' {
  const m = w.market[item];
  if (!m) return 'flat';
  const v = m.demand / m.supply;
  return v > 1.12 ? 'up' : v < 0.88 ? 'down' : 'flat';
}
export const trendText = (w: World, item: string): string => ({
  up: 'Đang khan', down: 'Đang dư', flat: 'Ổn định',
}[priceTrend(w, item)]);
export const weatherText = (w: World): string => WEATHER_NAME[w.weather];
export const stockText = (w: World, sid: string, item: string): string => {
  const s = w.suppliers[sid]?.stock[item];
  return s ? `${s.qty} ${ITEM[item].name}` : 'Hết';
};
export const supplyCount = (w: World, item: string): number => countItem(w, 'warehouse', item);
