import {
  ITEMS, ITEM_LIST, NPCS, SUPPLIERS, UPGRADES, QUESTS, DIFFICULTY, CHAPTERS, ENDING_TEXT,
  QUALITY_MULT, SHOP_TIERS, LENDERS,
} from './data';
import type {
  GameState, InvItem, Shelf, Customer, PlannedCustomer, Debt, Delivery, NpcState,
  Weather, Difficulty, DayStats, Totals, GameEvent, QuestState,
} from './types';

export const SAVE_VERSION = 3;
export const SAVE_PREFIX = 'vn1945.';

// --------------------------------------------------------------------- rng --
export function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// --------------------------------------------------------------- day stats --
export function emptyDay(): DayStats {
  return {
    revenue: 0, cost: 0, purchases: 0, profit: 0, itemsSold: 0, itemsBought: 0, customersServed: 0,
    customersLost: 0, gifts: 0, creditGiven: 0, spoiled: 0, fairDeals: 0, gouged: 0,
    helped: 0, repDelta: 0, trustDelta: 0, familyMeal: 0, feedback: [],
  };
}
export function emptyTotals(): Totals {
  return {
    revenue: 0, cost: 0, purchases: 0, profit: 0, itemsSold: 0, itemsBought: 0, customersServed: 0,
    customersLost: 0, gifts: 0, creditGiven: 0, debtsPaid: 0, spoiled: 0, fairDeals: 0,
    gouged: 0, helped: 0,
  };
}

// ------------------------------------------------------------------ world ---
export class World {
  state: GameState;
  emit: (e: GameEvent) => void;
  private rng: () => number;

  constructor(state: GameState, emit: (e: GameEvent) => void) {
    this.state = state;
    this.emit = emit;
    this.rng = mulberry32(state.rngSeed || 12345);
    this.syncShelves();
  }

  /** The shelf array must always match the unlocked shelf count (upgrades add shelves). */
  syncShelves() {
    const want = this.shelfCount();
    while (this.state.shelves.length < want) {
      this.state.shelves.push({
        id: this.state.shelves.length, itemId: null, qty: 0, quality: 1,
        freshness: 100, capacity: 20, markup: 0.1, cost: 0,
      });
    }
  }

  rand() { return this.rng(); }
  saveRng() { this.state.rngSeed = Math.floor(this.rng() * 4294967296); }

  // ------------------------------------------------------------- economy --
  weatherSupplyMod(): number {
    switch (this.state.weather.today) {
      case 'mua': return 0.88;
      case 'mua_to': return 0.74;
      case 'am_u': return 0.96;
      case 'nang_nhieu': return 1.04;
      default: return 1;
    }
  }

  weatherDemandMod(itemId: string): number {
    const w = this.state.weather.today;
    const it = ITEMS[itemId];
    if (!it) return 1;
    let m = 1;
    if (w === 'mua' || w === 'mua_to') {
      if (it.cat === 'food') m += 0.1;
      if (itemId === 'firewood' || itemId === 'charcoal' || itemId === 'lamp_bowl') m += 0.18;
      if (it.cat === 'medicine') m += 0.08;
      if (itemId === 'umbrella') m += 0.35;
      if (itemId === 'conical_hat') m += 0.2;
    }
    if (w === 'nong') {
      if (it.cat === 'food') m += 0.12;
      if (itemId === 'lamp_bowl') m += 0.1;
      if (itemId === 'conical_hat') m += 0.15;
    }
    if (w === 'am_u' && it.cat === 'food') m += 0.05;
    return m;
  }

  fairSell(itemId: string): number {
    const it = ITEMS[itemId];
    if (!it) return 0;
    const diff = DIFFICULTY[this.state.player.difficulty];
    const supply = clamp((this.state.economy.supply[itemId] ?? 1) * this.weatherSupplyMod() * diff.supply, 0.4, 2.0);
    const demand = clamp((this.state.economy.demand[itemId] ?? 1) * this.weatherDemandMod(itemId) * diff.demand, 0.4, 2.0);
    const mod = Number(this.state.story.flags['price_' + itemId] ?? 0);
    return Math.max(1, Math.round(it.sell * (demand / supply) * (1 + mod)));
  }

  fairBuy(itemId: string): number {
    const it = ITEMS[itemId];
    if (!it) return 0;
    const diff = DIFFICULTY[this.state.player.difficulty];
    const supply = clamp((this.state.economy.supply[itemId] ?? 1) * this.weatherSupplyMod() * diff.supply, 0.4, 2.0);
    const demand = clamp((this.state.economy.demand[itemId] ?? 1) * this.weatherDemandMod(itemId) * diff.demand, 0.4, 2.0);
    const mod = Number(this.state.story.flags['price_' + itemId] ?? 0);
    return Math.max(1, Math.round(it.buy * Math.pow(demand / supply, 0.65) * (1 + mod * 0.6)));
  }

  priceRange(itemId: string): [number, number] {
    const it = ITEMS[itemId];
    const f = this.fairSell(itemId);
    return [Math.max(1, Math.round(it.buy * 0.8)), Math.round(f * 1.6)];
  }

  driftEconomy() {
    // Random walk with mean reversion: prices swing with weather, news and stock,
    // but they do not inflate (or deflate) without end.
    for (const it of ITEM_LIST) {
      const s = this.state.economy.supply[it.id] ?? 1;
      const d = this.state.economy.demand[it.id] ?? 1;
      this.state.economy.supply[it.id] = clamp(s + (1 - s) * 0.16 + (this.rand() - 0.5) * 0.16, 0.42, 1.85);
      this.state.economy.demand[it.id] = clamp(d + (1 - d) * 0.16 + (this.rand() - 0.5) * 0.16, 0.42, 1.85);
    }
    // local scarcity: if the town stock is low, demand rises
    for (const it of ITEM_LIST) {
      const stock = this.townStock(it.id);
      if (stock === 0 && it.cat !== 'special') this.state.economy.demand[it.id] = clamp((this.state.economy.demand[it.id] ?? 1) + 0.05, 0.42, 1.9);
      if (stock > 30) this.state.economy.demand[it.id] = clamp((this.state.economy.demand[it.id] ?? 1) - 0.04, 0.42, 1.9);
    }
  }

  townStock(itemId: string): number {
    let n = 0;
    for (const inv of this.state.inventory) if (inv.itemId === itemId) n += inv.qty;
    for (const sh of this.state.shelves) if (sh.itemId === itemId) n += sh.qty;
    return n;
  }

  // ------------------------------------------------------------ inventory --
  warehouseSlots(): number {
    return this.state.warehouse.cols * this.state.warehouse.rows;
  }

  inventoryWeight(): number {
    let w = 0;
    for (const inv of this.state.inventory) {
      const it = ITEMS[inv.itemId];
      if (it) w += it.weight * inv.qty;
    }
    return Math.round(w * 10) / 10;
  }

  weightCap(): number {
    let cap = this.state.warehouse.weightCap;
    if (this.state.upgrades.includes('warehouse_2')) cap += 60;
    if (this.state.upgrades.includes('warehouse_3')) cap += 40;
    return cap;
  }

  canAdd(itemId: string, qty: number): boolean {
    const it = ITEMS[itemId];
    if (!it) return false;
    if (this.inventoryWeight() + it.weight * qty > this.weightCap() + 0.01) return false;
    // find stackable or empty
    for (const inv of this.state.inventory) {
      if (inv.itemId === itemId && inv.qty + qty <= 99) return true;
    }
    return this.state.inventory.length < this.warehouseSlots();
  }

  addItem(itemId: string, qty: number, quality = 1, cost = 0, freshness = 100): number {
    const it = ITEMS[itemId];
    if (!it || qty <= 0) return 0;
    let left = qty;
    // merge into same quality stacks
    for (const inv of this.state.inventory) {
      if (left <= 0) break;
      if (inv.itemId === itemId && inv.quality === quality && inv.qty < 99) {
        const add = Math.min(99 - inv.qty, left);
        inv.qty += add; left -= add;
      }
    }
    while (left > 0) {
      const slot = this.firstEmptySlot();
      if (slot < 0) break;
      const add = Math.min(99, left);
      this.state.inventory.push({
        uid: this.nextUid(), itemId, qty: add, quality, freshness,
        slot, acquiredDay: this.state.player.day, cost,
      });
      left -= add;
    }
    return qty - left;
  }

  nextUid(): number {
    let max = 1000;
    for (const inv of this.state.inventory) max = Math.max(max, inv.uid);
    for (const c of this.state.customers) max = Math.max(max, c.uid);
    return max + 1;
  }

  firstEmptySlot(): number {
    const used = new Set(this.state.inventory.map((i) => i.slot));
    for (let i = 0; i < this.warehouseSlots(); i++) if (!used.has(i)) return i;
    return -1;
  }

  removeWarehouse(uid: number, qty: number): boolean {
    const inv = this.state.inventory.find((i) => i.uid === uid);
    if (!inv || inv.qty < qty) return false;
    inv.qty -= qty;
    if (inv.qty <= 0) this.state.inventory = this.state.inventory.filter((i) => i.uid !== uid);
    return true;
  }

  splitStack(uid: number, qty: number): boolean {
    const inv = this.state.inventory.find((i) => i.uid === uid);
    if (!inv || inv.qty <= qty) return false;
    const slot = this.firstEmptySlot();
    if (slot < 0) return false;
    inv.qty -= qty;
    this.state.inventory.push({
      uid: this.nextUid(), itemId: inv.itemId, qty, quality: inv.quality,
      freshness: inv.freshness, slot, acquiredDay: inv.acquiredDay, cost: inv.cost,
    });
    return true;
  }

  moveStack(uid: number, slot: number): boolean {
    const inv = this.state.inventory.find((i) => i.uid === uid);
    if (!inv) return false;
    const other = this.state.inventory.find((i) => i.slot === slot);
    if (other && other.uid !== uid) {
      other.slot = inv.slot;
    }
    inv.slot = slot;
    return true;
  }

  /** Fills every empty shelf from the warehouse, most valuable goods first.
   *  Saves the player ten clicks every morning; returns how many shelves filled. */
  autoRestock(): number {
    let placed = 0;
    for (const sh of this.state.shelves) {
      if (sh.itemId) continue;
      const pick = [...this.state.inventory]
        .filter((i) => ITEMS[i.itemId] && i.qty > 0)
        .sort((a, b) => (ITEMS[b.itemId].sell - ITEMS[a.itemId].sell) || (b.qty - a.qty))[0];
      if (!pick) break;
      if (this.restockShelf(sh.id, pick.uid, pick.qty)) placed++;
    }
    return placed;
  }

  autoSort(mode: 'category' | 'qty' | 'value' | 'quality' = 'category') {
    const list = [...this.state.inventory];
    list.sort((a, b) => {
      const ia = ITEMS[a.itemId], ib = ITEMS[b.itemId];
      if (mode === 'qty') return b.qty - a.qty;
      if (mode === 'value') return (ib?.sell ?? 0) * b.qty - (ia?.sell ?? 0) * a.qty;
      if (mode === 'quality') return b.quality - a.quality || b.freshness - a.freshness;
      return (ia?.cat ?? '').localeCompare(ib?.cat ?? '') || (ia?.name ?? '').localeCompare(ib?.name ?? '');
    });
    list.forEach((inv, i) => { inv.slot = i; });
  }

  // A hired hand is not idle income: she restocks the shelves from the warehouse
  // each morning, so the shop opens full without the player doing it by hand.
  staffRestock(): number {
    if (!this.state.employees.length) return 0;
    let moved = 0;
    for (const sh of this.state.shelves.slice(0, this.shelfCount())) {
      const cap = sh.itemId ? this.shelfCapacity(sh.itemId) : 0;
      if (sh.itemId && sh.qty >= cap * 0.6) continue;
      const want = sh.itemId;
      const inv = this.state.inventory.find((i) => (!want || i.itemId === want) && ITEMS[i.itemId]);
      if (!inv) continue;
      const space = (sh.itemId ? this.shelfCapacity(inv.itemId) : this.shelfCapacity(inv.itemId)) - sh.qty;
      if (space <= 0) continue;
      if (this.restockShelf(sh.id, inv.uid, Math.min(inv.qty, space))) moved++;
    }
    return moved;
  }

  // --------------------------------------------------------------- shelves --
  shelfCount(): number {
    let n = this.state.shelfCount + Math.max(0, (this.state.shopLevel ?? 1) - 1);
    if (this.state.upgrades.includes('shelf_2')) n += 2;
    if (this.state.upgrades.includes('shelf_3')) n += 2;
    return Math.min(n, 12);
  }

  shopTier() {
    return SHOP_TIERS.find((t) => t.level === (this.state.shopLevel ?? 1)) ?? SHOP_TIERS[0];
  }

  nextShopTier() {
    const next = SHOP_TIERS.find((t) => t.level === (this.state.shopLevel ?? 1) + 1);
    if (!next) return null;
    const s = this.state;
    const dayOk = s.player.day >= next.req.day;
    const repOk = s.player.reputation >= next.req.rep;
    const trustOk = s.player.communityTrust >= next.req.trust;
    const moneyOk = s.player.money >= next.cost;
    const reason = !dayOk ? `Cần đến ngày ${next.req.day}`
      : !repOk ? `Cần uy tín ${next.req.rep} (hiện ${Math.round(s.player.reputation)})`
      : !trustOk ? `Cần cộng đồng ${next.req.trust} (hiện ${Math.round(s.player.communityTrust)})`
      : !moneyOk ? `Cần ${next.cost} đồng`
      : '';
    return { tier: next, ready: dayOk && repOk && trustOk && moneyOk, reason };
  }

  upgradeShopTier(): { ok: boolean; msg: string } {
    const next = this.nextShopTier();
    if (!next) return { ok: false, msg: 'Cửa hàng đã đạt cấp cao nhất.' };
    if (!next.ready) return { ok: false, msg: next.reason };
    this.state.player.money -= next.tier.cost;
    this.state.shopLevel = next.tier.level;
    this.syncShelves();
    this.state.journal.push({ day: this.state.player.day, text: `Cửa hàng lên cấp ${next.tier.level}: ${next.tier.name}.`, kind: 'event' });
    this.state.player.reputation = clamp(this.state.player.reputation + 3, 0, 100);
    return { ok: true, msg: `Cửa hàng đã lên cấp ${next.tier.level}: ${next.tier.name}.` };
  }

  shelfCapacity(itemId: string): number {
    const it = ITEMS[itemId];
    if (!it) return 10;
    let cap = Math.max(5, Math.round(30 / Math.max(0.8, it.vol)));
    if (this.state.upgrades.includes('counter_2')) cap = Math.round(cap * 1.2);
    return cap;
  }

  shelfPrice(shelf: Shelf): number {
    if (!shelf.itemId) return 0;
    const fair = this.fairSell(shelf.itemId);
    let p = fair * (1 + shelf.markup) * (QUALITY_MULT[shelf.quality] ?? 1);
    if (this.state.upgrades.includes('shelf_3')) p *= 1.03;
    if (this.state.upgrades.includes('cabinet_2') && ITEMS[shelf.itemId]?.cat === 'valuables') p *= 1.08;
    return Math.max(1, Math.round(p));
  }

  restockShelf(shelfId: number, uid: number, qty: number): boolean {
    const shelf = this.state.shelves.find((s) => s.id === shelfId);
    const inv = this.state.inventory.find((i) => i.uid === uid);
    if (!shelf || !inv) return false;
    const cap = this.shelfCapacity(inv.itemId);
    if (shelf.itemId && shelf.itemId !== inv.itemId) return false;
    const canPut = Math.min(qty, inv.qty, cap - shelf.qty);
    if (canPut <= 0) return false;
    shelf.itemId = inv.itemId;
    shelf.qty += canPut;
    shelf.quality = inv.quality;
    shelf.freshness = inv.freshness;
    shelf.cost = inv.cost;
    this.removeWarehouse(uid, canPut);
    return true;
  }

  takeFromShelf(shelfId: number, qty: number): { itemId: string; quality: number; freshness: number; qty: number } | null {
    const shelf = this.state.shelves.find((s) => s.id === shelfId);
    if (!shelf || !shelf.itemId || shelf.qty < qty) return null;
    const res = { itemId: shelf.itemId, quality: shelf.quality, freshness: shelf.freshness, qty };
    shelf.qty -= qty;
    if (shelf.qty <= 0) {
      shelf.itemId = null;
      shelf.qty = 0;
      shelf.quality = 1;
      shelf.freshness = 100;
    }
    return res;
  }

  returnShelfToWarehouse(shelfId: number): boolean {
    const shelf = this.state.shelves.find((s) => s.id === shelfId);
    if (!shelf || !shelf.itemId) return false;
    const added = this.addItem(shelf.itemId, shelf.qty, shelf.quality, shelf.cost, shelf.freshness);
    if (added <= 0) return false;
    shelf.qty -= added;
    if (shelf.qty <= 0) { shelf.itemId = null; shelf.qty = 0; }
    return true;
  }

  // -------------------------------------------------------------- customers --
  stockedItems(): Set<string> {
    const set = new Set<string>();
    for (const sh of this.state.shelves) if (sh.itemId && sh.qty > 0) set.add(sh.itemId);
    for (const inv of this.state.inventory) if (inv.qty > 0) set.add(inv.itemId);
    return set;
  }

  buildDayPlan(): PlannedCustomer[] {
    const plan: PlannedCustomer[] = [];
    const day = this.state.player.day;
    const stocked = this.stockedItems();
    for (const npc of Object.values(NPCS)) {
      let rate = npc.schedule.rate;
      if (day <= 3) rate = Math.min(1, rate + 0.15);
      if (this.state.upgrades.includes('sign_2')) rate *= 1.15;
      if (this.state.player.reputation < 15) rate *= 0.8;
      if (this.state.player.reputation > 60) rate *= 1.1;
      rate *= 1 + Math.max(0, (this.state.shopLevel ?? 1) - 1) * 0.05;
      if (this.rand() > rate) continue;
      const hour = npc.schedule.start + this.rand() * (npc.schedule.end - npc.schedule.start);
      const need = this.pickNeed(npc.id, stocked);
      if (!need) continue;
      plan.push({ npcId: npc.id, itemId: need.item, qty: need.qty, hour, spawned: false });
    }
    // guarantee a reasonable day (a hired hand draws one extra customer)
    const minCustomers = (day <= 2 ? 5 : day <= 6 ? 6 : 8) + (this.state.employees.length ? 1 : 0);
    while (plan.length < minCustomers) {
      const npc = Object.values(NPCS)[Math.floor(this.rand() * Object.values(NPCS).length)];
      const need = this.pickNeed(npc.id, stocked);
      if (!need) continue;
      plan.push({
        npcId: npc.id, itemId: need.item, qty: need.qty,
        hour: 8 + this.rand() * 8, spawned: false,
      });
    }
    plan.sort((a, b) => a.hour - b.hour);
    return plan.slice(0, 14);
  }

  pickNeed(npcId: string, stocked?: Set<string>): { item: string; qty: number } | null {
    const npc = NPCS[npcId];
    if (!npc) return null;
    let pool = npc.needs;
    // People come because they heard you have something. Bias demand toward the
    // goods actually on the shelves so breadth of stock is rewarded.
    if (stocked && stocked.size > 0) {
      const inStock = npc.needs.filter((n) => stocked.has(n.item));
      if (inStock.length > 0 && this.rand() < 0.72) pool = inStock;
    }
    const total = pool.reduce((a, n) => a + n.weight, 0);
    if (total <= 0) return null;
    let r = this.rand() * total;
    for (const n of pool) {
      r -= n.weight;
      if (r <= 0) {
        const qty = n.min + Math.floor(this.rand() * (n.max - n.min + 1));
        return { item: n.item, qty };
      }
    }
    return { item: pool[0].item, qty: pool[0].min };
  }

  spawnCustomer(npcId: string, itemId: string, qty: number): Customer | null {
    const npc = NPCS[npcId];
    if (!npc) return null;
    const it = ITEMS[itemId];
    if (!it) return null;
    const diff = DIFFICULTY[this.state.player.difficulty];
    const fair = this.fairSell(itemId);
    const baseBudget = qty * fair * (0.78 + this.rand() * 0.55);
    const budget = Math.round(clamp(baseBudget, npc.budget[0], npc.budget[1]));
    const urgency = clamp(0.35 + (it.cat === 'medicine' ? 0.35 : 0) + (it.cat === 'food' ? 0.15 : 0) + (this.rand() - 0.5) * 0.3, 0.15, 0.98);
    const patience = Math.max(1, npc.patience + diff.patience + (this.state.upgrades.includes('lamp_2') ? 1 : 0));
    const uid = this.nextUid();
    const customer: Customer = {
      uid, npcId, name: npc.name, role: npc.role, portrait: npc.portrait,
      itemId, qty, budget, urgency, patience, maxPatience: patience,
      state: 'queue', mood: 'neutral', offer: null,
      x: 1320, targetX: 640, arrivedAt: this.state.time.hour,
      lastOfferPrice: 0, history: [], line: this.customerLine(npc, itemId, qty),
    };
    this.state.customers.push(customer);
    if (this.state.activeCustomer === null) {
      this.state.activeCustomer = uid;
      customer.state = 'active';
      customer.x = 1280;
      customer.targetX = 640;
    }
    return customer;
  }

  customerLine(npc: typeof NPCS[string], itemId: string, qty: number): string {
    const it = ITEMS[itemId];
    const name = it?.name.toLowerCase() ?? itemId;
    const templates = [
      `Cho tôi ${qty} ${name} với.`,
      `Anh/chị còn ${name} không? Tôi cần ${qty}.`,
      `${name} giờ thế nào? Tôi lấy ${qty}.`,
      `Nhà tôi cần ${qty} ${name}, cho tôi xin.`,
      `Tôi tìm ${name} cả buổi rồi. Còn không?`,
    ];
    return templates[Math.floor(this.rand() * templates.length)];
  }

  activeCustomer(): Customer | null {
    if (this.state.activeCustomer === null) return null;
    return this.state.customers.find((c) => c.uid === this.state.activeCustomer) ?? null;
  }

  queuedCustomers(): Customer[] {
    return this.state.customers.filter((c) => c.state === 'queue');
  }

  nextCustomer() {
    const active = this.activeCustomer();
    if (active) active.state = 'served';
    this.state.customers = this.state.customers.filter((c) => c.state !== 'served' || c.uid !== this.state.activeCustomer);
    this.state.activeCustomer = null;
    const next = this.queuedCustomers().sort((a, b) => a.uid - b.uid)[0];
    if (next) {
      next.state = 'active';
      next.targetX = 640;
      this.state.activeCustomer = next.uid;
    }
  }

  dismissActive(reason: 'served' | 'left' | 'refused' | 'nostock') {
    const c = this.activeCustomer();
    if (!c) return;
    c.state = reason === 'served' ? 'served' : 'leaving';
    c.targetX = 1360;
    if (reason !== 'served') {
      const npc = this.state.npcs[c.npcId];
      // Running out of stock is a missed sale, not a broken promise: the customer
      // is disappointed but the shop's reputation is untouched.
      const trustHit = reason === 'refused' ? 3 : reason === 'left' ? 2 : 1;
      const repHit = reason === 'refused' ? 1 : reason === 'left' ? 1 : 0;
      if (npc) {
        npc.trust = clamp(npc.trust - trustHit, 0, 100);
        this.state.day.trustDelta -= trustHit > 1 ? 1 : 0;
      }
      this.state.day.customersLost += 1;
      this.state.player.reputation = clamp(this.state.player.reputation - repHit, 0, 100);
      this.state.day.repDelta -= repHit;
    }
    this.state.activeCustomer = null;
  }

  evaluateOffer(c: Customer, price: number, qty: number, bonus = 0): { accepted: boolean; reason: string; counter?: number } {
    const fair = this.fairSell(c.itemId);
    const it = ITEMS[c.itemId];
    if (!it) return { accepted: false, reason: 'Không có hàng.' };
    const shelf = this.state.shelves.find((s) => s.itemId === c.itemId && s.qty >= qty);
    const quality = shelf ? shelf.quality : 1;
    const ratio = price / Math.max(1, fair * (QUALITY_MULT[quality] ?? 1));
    const npc = NPCS[c.npcId];
    const st = this.state.npcs[c.npcId];
    let score = 0.78 + (1 - ratio) * 1.6;
    score += ((st?.trust ?? 0) / 100) * 0.2;
    score += (this.state.player.reputation / 100) * 0.16;
    score += (c.urgency - 0.5) * 0.22;
    score -= (npc?.priceSensitivity ?? 1) * 0.1;
    if (npc?.personality === 'kind') score += 0.06;
    if (npc?.personality === 'shrewd') score -= 0.08;
    if (npc?.personality === 'proud') score -= 0.03;
    if (ratio < 0.8) score += 0.12;
    if (ratio > 1.35) score -= 0.25;
    score += bonus;
    const total = price * qty;
    if (total > c.budget) score -= 0.28;
    const roll = this.rand();
    if (roll < score) {
      return { accepted: true, reason: 'Đồng ý.' };
    }
    const counter = Math.max(1, Math.round(fair * (0.78 + this.rand() * 0.16)));
    return { accepted: false, reason: 'Chưa được, đắt quá.', counter };
  }

  acceptSale(c: Customer, price: number, qty: number, shelfId: number) {
    const shelf = this.state.shelves.find((s) => s.id === shelfId);
    if (!shelf || !shelf.itemId || shelf.qty < qty) return false;
    const total = Math.round(price * qty);
    this.takeFromShelf(shelfId, qty);
    this.state.player.money += total;
    this.state.day.revenue += total;
    this.state.day.cost += (shelf.cost ?? 0) * qty;
    this.state.day.profit += total - (shelf.cost ?? 0) * qty;
    this.state.day.itemsSold += qty;
    this.state.day.customersServed += 1;
    const npc = this.state.npcs[c.npcId];
    if (npc) {
      const fair = this.fairSell(c.itemId);
      const ratio = price / Math.max(1, fair);
      if (ratio <= 1.02) {
        npc.trust = clamp(npc.trust + 4, 0, 100);
        this.state.day.fairDeals += 1;
        this.state.player.reputation = clamp(this.state.player.reputation + 1, 0, 100);
        this.state.day.repDelta += 1;
        // honest prices are how a shop becomes part of the town
        this.state.player.communityTrust = clamp(this.state.player.communityTrust + 0.4, 0, 100);
      }
      else if (ratio >= 1.25) { npc.trust = clamp(npc.trust - 2, 0, 100); this.state.day.gouged += 1; this.state.player.reputation = clamp(this.state.player.reputation - 1, 0, 100); this.state.day.repDelta -= 1; }
      else { npc.trust = clamp(npc.trust + 2, 0, 100); }
      npc.visits += 1;
      npc.purchases += 1;
      npc.totalSpent += total;
      npc.lastVisitDay = this.state.player.day;
      npc.history.push({ day: this.state.player.day, itemId: c.itemId, qty, price, type: 'sale' });
      npc.met = true;
    }
    this.emit({ type: 'money', amount: total });
    this.emit({ type: 'sound', name: 'coin' });
    c.state = 'served';
    c.mood = 'happy';
    c.targetX = 1400;
    c.x = 1400;
    this.state.activeCustomer = null;
    return true;
  }

  makeCreditSale(c: Customer, price: number, qty: number, shelfId: number) {
    const shelf = this.state.shelves.find((s) => s.id === shelfId);
    if (!shelf || !shelf.itemId || shelf.qty < qty) return false;
    const total = Math.round(price * qty);
    this.takeFromShelf(shelfId, qty);
    this.state.day.cost += (shelf.cost ?? 0) * qty;
    this.state.day.profit -= (shelf.cost ?? 0) * qty;
    const dueDay = this.state.player.day + 7;
    this.state.debts.push({
      id: 'd' + this.state.player.day + '_' + c.npcId + '_' + Math.floor(this.rand() * 9999),
      kind: 'lent', partyId: c.npcId, partyName: c.name,
      principal: total, interest: 0.02, dueDay, createdDay: this.state.player.day, paid: 0, status: 'active',
      note: 'Bán chịu',
    });
    const npc = this.state.npcs[c.npcId];
    if (npc) { npc.trust = clamp(npc.trust + 8, 0, 100); npc.owed += total; npc.purchases += 1; }
    this.state.player.communityTrust = clamp(this.state.player.communityTrust + 1, 0, 100);
    this.state.day.creditGiven += total;
    this.state.day.customersServed += 1;
    this.state.day.helped += 1;
    c.state = 'served';
    c.mood = 'happy';
    c.targetX = 1400;
    c.x = 1400;
    this.state.activeCustomer = null;
    return true;
  }

  giftTo(c: Customer, itemId: string, qty: number, shelfId: number) {
    const shelf = this.state.shelves.find((s) => s.id === shelfId && s.itemId === itemId && s.qty >= qty);
    if (!shelf) return false;
    this.takeFromShelf(shelfId, qty);
    this.state.day.cost += (shelf.cost ?? 0) * qty;
    this.state.day.profit -= (shelf.cost ?? 0) * qty;
    const npc = this.state.npcs[c.npcId];
    if (npc) { npc.trust = clamp(npc.trust + 12, 0, 100); }
    this.state.day.gifts += 1;
    this.state.day.helped += 1;
    this.state.player.communityTrust = clamp(this.state.player.communityTrust + 3, 0, 100);
    this.emit({ type: 'sound', name: 'heart' });
    return true;
  }

  // ----------------------------------------------------------------- debts --
  borrow(lenderId: string, amount: number): Debt | null {
    const def = LENDERS.find((x) => x.id === lenderId);
    if (!def) return null;
    const trust = this.state.npcs[lenderId]?.trust ?? 0;
    if (trust < def.trustReq) return null;
    const amt = clamp(Math.round(amount), 10, def.max);
    const d: Debt = {
      id: 'b' + this.state.player.day + '_' + lenderId + '_' + Math.floor(this.rand() * 9999),
      kind: 'borrowed', partyId: lenderId, partyName: def.name,
      principal: amt, interest: def.rate, dueDay: this.state.player.day + def.days,
      createdDay: this.state.player.day, paid: 0, status: 'active', note: 'Vay vốn',
    };
    this.state.debts.push(d);
    this.state.player.money += amt;
    return d;
  }

  debtDue(d: Debt): number {
    return Math.round(d.principal * (1 + d.interest * Math.max(1, d.dueDay - d.createdDay)));
  }

  repayDebt(id: string, amount: number): boolean {
    const d = this.state.debts.find((x) => x.id === id);
    if (!d || d.status !== 'active') return false;
    const due = this.debtDue(d);
    const pay = Math.min(amount, due - d.paid, this.state.player.money);
    if (pay <= 0) return false;
    this.state.player.money -= pay;
    d.paid += pay;
    if (d.paid >= due) {
      d.status = 'paid';
      const npc = this.state.npcs[d.partyId];
      if (npc && d.kind === 'lent') npc.owed = Math.max(0, npc.owed - d.principal);
      this.state.totals.debtsPaid += pay;
      this.state.player.reputation = clamp(this.state.player.reputation + 2, 0, 100);
    }
    return true;
  }

  processDebts() {
    for (const d of this.state.debts) {
      if (d.status !== 'active') continue;
      if (d.dueDay <= this.state.player.day) {
        if (d.kind === 'borrowed') {
          d.status = 'overdue';
          this.state.player.reputation = clamp(this.state.player.reputation - 3, 0, 100);
          const npc = this.state.npcs[d.partyId];
          if (npc) npc.trust = clamp(npc.trust - 8, 0, 100);
          this.state.day.feedback.push(`Nợ ${d.partyName} đã quá hạn.`);
        } else {
          const npc = this.state.npcs[d.partyId];
          const due = this.debtDue(d);
          if (npc && npc.trust >= 35 && this.rand() < 0.75) {
            this.state.player.money += due;
            d.status = 'paid';
            npc.owed = Math.max(0, npc.owed - d.principal);
            this.state.day.feedback.push(`${d.partyName} đã trả nợ ${due} đồng.`);
          } else if (npc && npc.trust < 15) {
            d.status = 'defaulted';
            npc.trust = clamp(npc.trust - 10, 0, 100);
            this.state.day.feedback.push(`${d.partyName} không trả được nợ.`);
          } else {
            d.dueDay += 3;
            this.state.day.feedback.push(`${d.partyName} xin lùi hạn trả nợ.`);
          }
        }
      }
    }
  }

  // ------------------------------------------------------------- suppliers --
  supplierPrice(supplierId: string, itemId: string): number {
    const sup = SUPPLIERS[supplierId];
    if (!sup) return this.fairBuy(itemId);
    const entry = sup.items.find((i) => i.item === itemId);
    const mod = entry?.priceMod ?? 1.1;
    const st = this.state.suppliers[supplierId];
    const trustDisc = 1 - Math.min(0.12, (st?.trust ?? 0) / 800);
    return Math.max(1, Math.round(this.fairBuy(itemId) * mod * trustDisc));
  }

  restockSuppliers() {
    for (const [id, sup] of Object.entries(SUPPLIERS)) {
      const st = this.state.suppliers[id];
      if (!st) continue;
      if (this.state.player.day - st.lastRestock < sup.restock) continue;
      st.lastRestock = this.state.player.day;
      st.stock = {};
      for (const it of sup.items) {
        st.stock[it.item] = it.min + Math.floor(this.rand() * (it.max - it.min + 1));
      }
      st.priceMod = 0.92 + this.rand() * 0.18;
    }
  }

  buyFromSupplier(supplierId: string, itemId: string, qty: number): { ok: boolean; msg: string } {
    const st = this.state.suppliers[supplierId];
    if (!st) return { ok: false, msg: 'Không tìm thấy nhà cung cấp.' };
    const avail = st.stock[itemId] ?? 0;
    if (avail < qty) return { ok: false, msg: 'Không đủ hàng.' };
    const unit = this.supplierPrice(supplierId, itemId);
    const total = unit * qty;
    if (this.state.player.money < total) return { ok: false, msg: 'Không đủ tiền.' };
    if (!this.canAdd(itemId, qty)) return { ok: false, msg: 'Kho đã đầy.' };
    const added = this.addItem(itemId, qty, 1 + (this.rand() < 0.25 ? 1 : 0), unit);
    if (added <= 0) return { ok: false, msg: 'Không thể chứa thêm hàng.' };
    st.stock[itemId] -= added;
    this.state.player.money -= unit * added;
    this.state.day.purchases += unit * added;
    this.state.day.itemsBought += added;
    st.trust = clamp(st.trust + 0.4, 0, 100);
    const npc = this.state.npcs[supplierId];
    if (npc) npc.trust = clamp(npc.trust + 0.5, 0, 100);
    this.emit({ type: 'sound', name: 'buy' });
    return { ok: true, msg: `Đã mua ${added} ${ITEMS[itemId]?.name}.` };
  }

  placeOrder(supplierId: string, itemId: string, qty: number): { ok: boolean; msg: string } {
    const sup = SUPPLIERS[supplierId];
    if (!sup) return { ok: false, msg: 'Không tìm thấy nhà cung cấp.' };
    if (sup.leadDays <= 0) return this.buyFromSupplier(supplierId, itemId, qty);
    const unit = this.supplierPrice(supplierId, itemId) * 0.95;
    const total = unit * qty;
    if (this.state.player.money < total) return { ok: false, msg: 'Không đủ tiền đặt cọc.' };
    this.state.player.money -= total;
    this.state.day.purchases += total;
    const d: Delivery = {
      id: 'o' + this.state.player.day + '_' + supplierId + '_' + Math.floor(this.rand() * 9999),
      supplierId, supplierName: sup.name, itemId, qty, quality: 1, paid: total,
      orderDay: this.state.player.day, dueDay: this.state.player.day + sup.leadDays, status: 'transit',
    };
    this.state.deliveries.push(d);
    const npc = this.state.npcs[supplierId];
    if (npc) npc.trust = clamp(npc.trust + 1, 0, 100);
    this.emit({ type: 'sound', name: 'paper' });
    return { ok: true, msg: `Đã đặt ${qty} ${ITEMS[itemId]?.name}, giao sau ${sup.leadDays} ngày.` };
  }

  processDeliveries() {
    for (const d of this.state.deliveries) {
      if (d.status !== 'transit') continue;
      if (d.dueDay > this.state.player.day) continue;
      const sup = SUPPLIERS[d.supplierId];
      const risk = 1 - (sup?.reliability ?? 0.85);
      if (this.state.weather.today === 'mua_to' && this.rand() < 0.25) {
        d.dueDay += 1;
        d.status = 'delayed';
        this.state.day.feedback.push(`Chuyến hàng ${d.supplierName} bị trễ vì mưa.`);
        continue;
      }
      if (this.rand() < risk * 0.55) {
        d.dueDay += 1;
        d.status = 'delayed';
        this.state.day.feedback.push(`Chuyến hàng ${d.supplierName} bị trễ một ngày.`);
        continue;
      }
      if (this.rand() < risk * 0.12) {
        d.status = 'lost';
        this.state.day.feedback.push(`Chuyến hàng ${d.supplierName} bị mất trên đường.`);
        this.state.player.money += Math.round(d.paid * 0.5);
        continue;
      }
      const added = this.addItem(d.itemId, d.qty, d.quality, d.paid / Math.max(1, d.qty));
      d.status = 'arrived';
      this.state.day.itemsBought += added;
      this.state.day.feedback.push(`Nhận ${added} ${ITEMS[d.itemId]?.name} từ ${d.supplierName}.`);
    }
    this.state.deliveries = this.state.deliveries.filter((d) => d.status !== 'arrived');
  }

  // ------------------------------------------------------------------ day --
  startDay() {
    this.syncShelves();
    this.state.day = emptyDay();
    this.state.time.hour = 6;
    this.state.time.minute = 0;
    this.state.time.phase = 'morning';
    this.state.customers = [];
    this.state.activeCustomer = null;
    this.state.weather.today = this.state.weather.tomorrow;
    this.state.weather.tomorrow = this.rollWeather();
    this.driftEconomy();
    this.restockSuppliers();
    this.state.dayPlan = { customers: this.buildDayPlan(), eventIds: [], news: [] };
    this.state.travel = { location: 'shop', actionsLeft: 2 };
  }

  rollWeather(): Weather {
    const r = this.rand();
    const day = this.state.player.day;
    const rainy = day >= 6 && day <= 20;
    if (r < (rainy ? 0.28 : 0.12)) return 'mua';
    if (r < (rainy ? 0.36 : 0.16)) return 'mua_to';
    if (r < 0.55) return 'am_u';
    if (r < 0.75) return 'nang_nhieu';
    if (r < 0.88) return 'nong';
    return 'nang';
  }

  openShop() {
    this.state.time.phase = 'open';
    this.state.time.hour = 8;
    this.state.time.paused = false;
    this.state.dayPlan.customers.forEach((c) => { c.spawned = false; });
    this.emit({ type: 'sound', name: 'door' });
  }

  advanceTime(dt: number) {
    if (this.state.time.phase !== 'open' || this.state.time.paused) return;
    this.state.time.hour += dt * this.state.time.speed * 0.025;
    if (this.state.time.hour >= 17) { this.endDay(); return; }
    // spawn customers
    for (const p of this.state.dayPlan.customers) {
      if (p.spawned || p.hour > this.state.time.hour) continue;
      if (this.state.customers.length >= 3) continue;
      p.spawned = true;
      this.spawnCustomer(p.npcId, p.itemId, p.qty);
      this.emit({ type: 'sound', name: 'door' });
    }
    // move customers
    for (const c of this.state.customers) {
      const target = c.state === 'active' ? 640 : c.state === 'queue' ? 400 : 1400;
      c.targetX = target;
      if (Math.abs(c.x - target) > 3) {
        c.x += (target - c.x) * Math.min(1, dt * 3.2);
      }
    }
    // patience decay while waiting
    if (this.state.activeCustomer !== null) {
      const c = this.activeCustomer();
      if (c) {
        c.patience -= dt * 0.035 * this.state.time.speed;
        if (c.patience <= 0) {
          this.dismissActive('left');
          this.emit({ type: 'toast', text: `${c.name} đã bỏ đi vì chờ quá lâu.` });
          this.emit({ type: 'sound', name: 'door' });
        }
      }
    }
    for (const c of this.queuedCustomers()) {
      c.patience -= dt * 0.02 * this.state.time.speed;
      if (c.patience <= 0) {
        c.state = 'leaving';
        c.targetX = 1400;
        this.state.day.customersLost += 1;
      }
    }
    this.state.customers = this.state.customers.filter((c) => !(c.state === 'leaving' && c.x > 1330));
  }

  endDay() {
    if (this.state.time.phase !== 'open') return;
    this.state.time.phase = 'report';
    this.state.time.paused = true;
    // spoiled goods
    const storageMod = this.state.upgrades.includes('warehouse_3') ? 0.6 : 1;
    for (const inv of [...this.state.inventory]) {
      const it = ITEMS[inv.itemId];
      if (!it || it.perish <= 0) continue;
      inv.freshness -= (100 / Math.max(1, it.shelf)) * (this.state.weather.today === 'nong' ? 1.35 : 1) * storageMod;
      if (inv.freshness <= 0) {
        this.state.day.spoiled += inv.qty;
        this.state.inventory = this.state.inventory.filter((i) => i.uid !== inv.uid);
      }
    }
    for (const sh of this.state.shelves) {
      if (!sh.itemId) continue;
      const it = ITEMS[sh.itemId];
      if (!it || it.perish <= 0) continue;
      sh.freshness -= (100 / Math.max(1, it.shelf)) * 1.25 * storageMod;
      if (sh.freshness <= 0) {
        this.state.day.spoiled += sh.qty;
        sh.itemId = null; sh.qty = 0;
      }
    }
    // family meal: the larder first, then whatever food is left in the warehouse
    const need = 2;
    let fed = 0;
    while (fed < need && this.state.player.familyPantry > 0) {
      const take = Math.min(need - fed, Math.floor(this.state.player.familyPantry));
      this.state.player.familyPantry -= take;
      fed += take;
    }
    let takenFromStock = 0;
    while (fed < need) {
      const inv = this.state.inventory.find((i) => ITEMS[i.itemId]?.cat === 'food' && i.qty > 0);
      if (!inv) break;
      const take = Math.min(need - fed, inv.qty);
      this.removeWarehouse(inv.uid, take);
      fed += take;
      takenFromStock += take;
    }
    this.state.day.familyMeal = fed;
    if (fed >= need) {
      this.state.player.familyHealth = clamp(this.state.player.familyHealth + 2, 0, 100);
      if (takenFromStock > 0) this.state.day.feedback.push(`Lấy ${takenFromStock} thức ăn trong kho cho bữa tối.`);
    } else {
      this.state.player.familyHealth = clamp(this.state.player.familyHealth - 9, 0, 100);
      this.state.player.communityTrust = clamp(this.state.player.communityTrust - 2, 0, 100);
      this.state.day.feedback.push('Gia đình thiếu ăn. Sức khỏe giảm.');
    }
    this.state.day.profit = this.state.day.revenue - this.state.day.cost;
    this.state.totals.revenue += this.state.day.revenue;
    this.state.totals.cost += this.state.day.cost;
    this.state.totals.purchases += this.state.day.purchases;
    this.state.totals.profit += this.state.day.profit;
    this.state.totals.itemsSold += this.state.day.itemsSold;
    this.state.totals.itemsBought += this.state.day.itemsBought;
    this.state.totals.customersServed += this.state.day.customersServed;
    this.state.totals.customersLost += this.state.day.customersLost;
    this.state.totals.gifts += this.state.day.gifts;
    this.state.totals.creditGiven += this.state.day.creditGiven;
    this.state.totals.spoiled += this.state.day.spoiled;
    this.state.totals.fairDeals += this.state.day.fairDeals;
    this.state.totals.gouged += this.state.day.gouged;
    this.state.totals.helped += this.state.day.helped;
    this.processDebts();
    this.processDeliveries();
    this.state.lastReport = { ...this.state.day };
    this.saveRng();
  }

  nextDay() {
    const s = this.state;
    this.syncShelves();
    s.player.day += 1;
    s.time.phase = 'morning';
    s.time.hour = 6;
    s.time.paused = false;
    s.day = emptyDay();
    s.customers = [];
    s.activeCustomer = null;
    s.weather.today = s.weather.tomorrow;
    s.weather.tomorrow = this.rollWeather();
    this.driftEconomy();
    this.restockSuppliers();
    s.dayPlan = { customers: this.buildDayPlan(), eventIds: [], news: [] };
    s.travel = { location: 'shop', actionsLeft: 2 };
    // chapter transition
    const ch = CHAPTERS.find((c) => c.day === s.player.day);
    if (ch && s.story.chapter < ch.n) s.story.chapter = ch.n;
    this.saveRng();
    this.emit({ type: 'refresh' });
  }

  // --------------------------------------------------------------- quests --
  activateQuest(id: string) {
    if (!QUESTS[id]) return;
    const q: QuestState = { id, status: 'active', stage: 1, choices: [], startedDay: this.state.player.day };
    this.state.quests[id] = q;
  }

  advanceQuest(id: string, stage: number) {
    const q = this.state.quests[id];
    if (!q) { this.activateQuest(id); return; }
    q.stage = Math.max(q.stage, stage);
    if (stage >= (QUESTS[id]?.stages.length ?? 1)) q.status = 'done';
  }

  questDone(id: string) {
    const q = this.state.quests[id];
    return q?.status === 'done';
  }

  // --------------------------------------------------------------- events --
  applyEffects(effects: string[] = []) {
    for (const raw of effects) {
      const [head, ...rest] = raw.split(':');
      switch (head) {
        case 'money': {
          const v = Number(rest[0]);
          this.state.player.money = Math.max(0, this.state.player.money + v);
          break;
        }
        case 'rep': {
          const v = Number(rest[0]);
          this.state.player.reputation = clamp(this.state.player.reputation + v, 0, 100);
          this.state.day.repDelta += v;
          break;
        }
        case 'community': {
          const v = Number(rest[0]);
          this.state.player.communityTrust = clamp(this.state.player.communityTrust + v, 0, 100);
          break;
        }
        case 'family': {
          const v = Number(rest[0]);
          this.state.player.familyHealth = clamp(this.state.player.familyHealth + v, 0, 100);
          break;
        }
        case 'trust': {
          const npcId = rest[0];
          const v = Number(rest[1]);
          const npc = this.state.npcs[npcId];
          if (npc) npc.trust = clamp(npc.trust + v, 0, 100);
          break;
        }
        case 'item': {
          const id = rest[0];
          const v = Number(rest[1]);
          if (v > 0) this.addItem(id, v, 1, this.fairBuy(id));
          else {
            let left = -v;
            for (const inv of [...this.state.inventory]) {
              if (inv.itemId !== id || left <= 0) continue;
              const take = Math.min(inv.qty, left);
              this.removeWarehouse(inv.uid, take);
              left -= take;
            }
            for (const sh of this.state.shelves) {
              if (sh.itemId !== id || left <= 0) continue;
              const take = Math.min(sh.qty, left);
              sh.qty -= take; left -= take;
              if (sh.qty <= 0) { sh.itemId = null; sh.qty = 0; }
            }
          }
          break;
        }
        case 'credit': {
          const npcId = rest[0];
          const v = Number(rest[1]);
          this.state.debts.push({
            id: 'c' + this.state.player.day + '_' + npcId + '_' + Math.floor(this.rand() * 9999),
            kind: 'lent', partyId: npcId, partyName: NPCS[npcId]?.name ?? npcId,
            principal: v, interest: 0.02, dueDay: this.state.player.day + 7,
            createdDay: this.state.player.day, paid: 0, status: 'active', note: 'Bán chịu',
          });
          const npc = this.state.npcs[npcId];
          if (npc) { npc.owed += v; npc.trust = clamp(npc.trust + 5, 0, 100); }
          break;
        }
        case 'debt': {
          if (rest[0] === 'collect') {
            const amt = Number(rest[1]);
            const d = this.state.debts.find((x) => x.kind === 'lent' && x.status === 'active');
            if (d) { this.state.player.money += amt; d.paid += amt; if (d.paid >= this.debtDue(d)) d.status = 'paid'; }
          } else if (rest[0] === 'forgive') {
            for (const d of this.state.debts) if (d.kind === 'lent' && d.status === 'active') { d.status = 'paid'; const n = this.state.npcs[d.partyId]; if (n) n.owed = 0; }
          }
          break;
        }
        case 'quest': {
          const id = rest[0];
          const stage = Number(rest[1] ?? 1);
          this.advanceQuest(id, stage);
          break;
        }
        case 'flag': {
          this.state.story.flags[rest.join(':')] = true;
          break;
        }
        case 'chapter': {
          this.state.story.chapter = Number(rest[0]);
          break;
        }
        case 'price': {
          const id = rest[0];
          const v = Number(rest[1]);
          const key = 'price_' + id;
          this.state.story.flags[key] = clamp(Number(this.state.story.flags[key] ?? 0) + v, -0.5, 0.8);
          break;
        }
        case 'weather': {
          const w = rest[0] as Weather;
          this.state.weather.tomorrow = w;
          break;
        }
        case 'spoil': {
          const v = Number(rest[0]);
          let removed = 0;
          for (const inv of [...this.state.inventory]) {
            if (removed >= v) break;
            const it = ITEMS[inv.itemId];
            if (!it || it.perish <= 0) continue;
            const take = Math.min(inv.qty, v - removed);
            this.removeWarehouse(inv.uid, take);
            removed += take;
          }
          this.state.day.spoiled += removed;
          break;
        }
        case 'delivery': {
          for (const d of this.state.deliveries) {
            if (d.status !== 'transit') continue;
            if (rest[0] === 'delay') d.dueDay += 1;
            if (rest[0] === 'expedite') d.dueDay = Math.max(this.state.player.day, d.dueDay - 2);
          }
          break;
        }
        case 'ending': {
          this.setEnding(rest[0]);
          break;
        }
        case 'finale': {
          this.computeEnding();
          break;
        }
        default:
          break;
      }
    }
    this.saveRng();
  }

  computeEnding() {
    const s = this.state;
    const trusted = Object.values(s.npcs).filter((n) => n.trust > 40).length;
    const close = Object.values(s.npcs).filter((n) => n.trust > 55).length;
    // Every path is scored on the same rough scale (100-450), so the ending is
    // decided by *how* you played rather than by money alone.
    let community = s.player.communityTrust * 2 + s.totals.helped * 10 + s.totals.gifts * 8;
    let merchant = Math.min(400, s.player.money) + s.totals.revenue / 30 + trusted * 4;
    let honor = s.player.reputation * 2 + s.totals.fairDeals * 3 + close * 5;
    let family = s.player.familyHealth * 1.5 + s.player.familyPantry * 4 + 40;
    // Chapter 4 is a promise: the direction you chose weighs heavily at the end.
    if (s.story.flags.direction_community) community += 60;
    if (s.story.flags.direction_merchant) merchant += 60;
    if (s.story.flags.direction_honor) honor += 60;
    if (s.story.flags.direction_family) family += 60;
    const decline = s.debts.filter((d) => d.status !== 'paid').reduce((a, d) => a + this.debtDue(d), 0) + s.totals.customersLost * 3 + (100 - s.player.reputation) * 0.4;
    const scores: Record<string, number> = { community, merchant, honor, family, decline };
    let best = 'community';
    for (const k of Object.keys(scores)) if (scores[k] > scores[best]) best = k;
    if (s.player.money < 30 && s.totals.profit < 0) best = 'decline';
    this.setEnding(best);
  }

  setEnding(id: string) {
    const e = ENDING_TEXT[id] ?? ENDING_TEXT.community;
    this.state.ending = { id, title: e.title, text: e.text };
    this.state.time.phase = 'ended';
    this.state.time.paused = true;
  }

  // ----------------------------------------------------------------- save --
  serialize(): string {
    return JSON.stringify(this.state);
  }

  save(slot: number): boolean {
    try {
      this.saveRng();
      this.state.savedAt = Date.now();
      const key = slot === 0 ? SAVE_PREFIX + 'auto' : SAVE_PREFIX + 'slot' + slot;
      const prev = localStorage.getItem(key);
      if (prev) localStorage.setItem(key + '.bak', prev);
      localStorage.setItem(key, JSON.stringify(this.state));
      return true;
    } catch {
      return false;
    }
  }

  static load(slot: number): GameState | null {
    try {
      const key = slot === 0 ? SAVE_PREFIX + 'auto' : SAVE_PREFIX + 'slot' + slot;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as GameState;
      return World.migrate(parsed);
    } catch {
      return null;
    }
  }

  static migrate(s: GameState): GameState | null {
    if (!s || typeof s !== 'object' || !s.player) return null;
    const base = newGame('Người chơi', s.player.difficulty ?? 'normal');
    const merged: GameState = {
      ...base,
      ...s,
      player: { ...base.player, ...s.player },
      time: { ...base.time, ...s.time },
      weather: { ...base.weather, ...s.weather },
      calendar: { ...base.calendar, ...s.calendar },
      warehouse: { ...base.warehouse, ...s.warehouse },
      day: { ...emptyDay(), ...(s.day ?? {}) },
      totals: { ...emptyTotals(), ...(s.totals ?? {}) },
      settings: { ...base.settings, ...(s.settings ?? {}) },
      economy: {
        supply: { ...base.economy.supply, ...(s.economy?.supply ?? {}) },
        demand: { ...base.economy.demand, ...(s.economy?.demand ?? {}) },
      },
      suppliers: { ...base.suppliers, ...(s.suppliers ?? {}) },
      npcs: { ...base.npcs, ...(s.npcs ?? {}) },
      quests: { ...base.quests, ...(s.quests ?? {}) },
      story: { chapter: s.story?.chapter ?? 1, flags: { ...(s.story?.flags ?? {}) } },
    };
    merged.shopLevel = s.shopLevel ?? 1;
    merged.version = SAVE_VERSION;
    return merged;
  }
}

// --------------------------------------------------------------- new game --
/** Creates a fresh game. `seed` makes the whole run reproducible — the sim and the
 *  tests pass one, the UI passes none so every new game is a different 1945. */
export function newGame(name: string, difficulty: Difficulty, seed?: number): GameState {
  const diff = DIFFICULTY[difficulty];
  const state: GameState = {
    version: SAVE_VERSION,
    slot: 0,
    savedAt: 0,
    playSeconds: 0,
    player: {
      name: name || 'Người chơi',
      difficulty,
      day: 1,
      chapter: 1,
      money: diff.money,
      reputation: 20,
      communityTrust: 25,
      familyHealth: 80,
      familyPantry: 4,
      flags: {},
    },
    time: { hour: 6, minute: 0, phase: 'morning', paused: false, speed: 1 },
    weather: { today: 'nang', tomorrow: 'am_u', daysLeft: 1 },
    calendar: { day: 12, month: 8, year: 1945 },
    inventory: [],
    shelves: [],
    warehouse: { cols: 8, rows: 4, weightCap: 120 },
    npcs: {},
    quests: {},
    debts: [],
    deliveries: [],
    suppliers: {},
    economy: { supply: {}, demand: {} },
    customers: [],
    activeCustomer: null,
    journal: [],
    totals: emptyTotals(),
    day: emptyDay(),
    story: { chapter: 1, flags: {} },
    settings: { sfx: 0.7, music: 0.45, autosave: true, hints: true },
    rngSeed: seed ?? Math.floor(Math.random() * 4294967296),
    dayPlan: { customers: [], eventIds: [], news: [] },
    upgrades: [],
    employees: [],
    shopLevel: 1,
    shelfCount: 6,
    travel: { location: 'shop', actionsLeft: 2 },
    seenEvents: [],
    introDone: false,
    chapterIntroSeen: [],
  };

  // economy (same PRNG as the rest of the run when a seed is given)
  const init = mulberry32(state.rngSeed || 12345);
  const pick = () => (seed === undefined ? Math.random() : init());
  for (const it of ITEM_LIST) {
    state.economy.supply[it.id] = 0.85 + pick() * 0.3;
    state.economy.demand[it.id] = 0.85 + pick() * 0.3;
  }
  // npcs
  for (const npc of Object.values(NPCS)) {
    state.npcs[npc.id] = {
      id: npc.id, trust: 8 + Math.floor(pick() * 8), relationship: 10,
      met: false, lastVisitDay: 0, visits: 0, purchases: 0, totalSpent: 0,
      flags: {}, history: [], questStage: 0, owed: 0,
    };
  }
  // suppliers
  for (const sup of Object.values(SUPPLIERS)) {
    state.suppliers[sup.id] = { trust: 10, stock: {}, lastRestock: 0, priceMod: 1 };
    for (const it of sup.items) state.suppliers[sup.id].stock[it.item] = it.min + Math.floor(pick() * (it.max - it.min + 1));
  }
  // shelves (6 base; upgrades add 2 each)
  for (let i = 0; i < 6; i++) {
    state.shelves.push({ id: i, itemId: null, qty: 0, quality: 1, freshness: 100, capacity: 20, markup: 0.1, cost: 0 });
  }
  // starting inventory
  const start: [string, number, number][] = [
    ['rice_white', 8, 2], ['salt', 6, 1], ['dried_fish', 3, 1], ['tea', 2, 1],
    ['lamp_bowl', 2, 1], ['cloth', 2, 1], ['medicine_bottle', 1, 1], ['basket', 1, 1],
  ];
  let uid = 1000;
  let slot = 0;
  for (const [id, qty, quality] of start) {
    state.inventory.push({
      uid: uid++, itemId: id, qty, quality, freshness: 92, slot: slot++,
      acquiredDay: 1, cost: ITEMS[id]?.buy ?? 0,
    });
  }
  // put some on shelves
  const shelf0 = state.shelves[0];
  shelf0.itemId = 'rice_white'; shelf0.qty = 4; shelf0.quality = 2; shelf0.freshness = 92; shelf0.cost = 8;
  const shelf1 = state.shelves[1];
  shelf1.itemId = 'salt'; shelf1.qty = 3; shelf1.quality = 1; shelf1.freshness = 95; shelf1.cost = 4;
  // remove from warehouse
  const riceInv = state.inventory.find((i) => i.itemId === 'rice_white');
  if (riceInv) riceInv.qty -= 4;
  const saltInv = state.inventory.find((i) => i.itemId === 'salt');
  if (saltInv) saltInv.qty -= 3;
  // day plan
  const w = new World(state, () => {});
  state.dayPlan = { customers: w.buildDayPlan(), eventIds: [], news: [] };
  state.journal.push({ day: 1, text: 'Bạn tiếp quản căn tiệm cũ của gia đình.', kind: 'story' });
  // carry the day-plan draws into the live seed so a seeded game stays reproducible
  if (seed === undefined) state.rngSeed = Math.floor(Math.random() * 4294967296);
  else w.saveRng();
  return state;
}

// ------------------------------------------------------------------ utils --
export function fmtMoney(n: number): string {
  return Math.round(n).toLocaleString('vi-VN');
}

export function weatherLabel(w: Weather): string {
  return ({ nang: 'Nắng', nang_nhieu: 'Nắng nhiều', am_u: 'Âm u', mua: 'Mưa', mua_to: 'Mưa lớn', nong: 'Nóng' })[w];
}

export function weatherIcon(w: Weather): string {
  return ({
    nang: '/assets/ui/icons/weather_sun.png', nang_nhieu: '/assets/ui/icons/weather_sun.png',
    am_u: '/assets/ui/icons/weather_cloud.png', mua: '/assets/ui/icons/weather_rain.png',
    mua_to: '/assets/ui/icons/weather_storm.png', nong: '/assets/ui/icons/weather_sun.png',
  })[w];
}

export function timePhase(hour: number): string {
  if (hour < 11) return 'Sáng';
  if (hour < 14) return 'Trưa';
  if (hour < 17) return 'Chiều';
  return 'Tối';
}

export function clock(hour: number): string {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour - Math.floor(hour)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function dateLabel(state: GameState): string {
  return `Ngày ${state.calendar.day + state.player.day - 1} · Tháng ${state.calendar.month} · ${state.calendar.year}`;
}

export function relationshipLabel(trust: number): string {
  if (trust >= 80) return 'Bạn đời';
  if (trust >= 60) return 'Tin cậy';
  if (trust >= 40) return 'Thân';
  if (trust >= 20) return 'Quen';
  return 'Lạ';
}

export function reputationLabel(rep: number): string {
  if (rep >= 80) return 'Nổi tiếng';
  if (rep >= 60) return 'Được kính trọng';
  if (rep >= 40) return 'Được tin';
  if (rep >= 20) return 'Bình thường';
  if (rep >= 10) return 'Ít được biết';
  return 'Đáng ngờ';
}
