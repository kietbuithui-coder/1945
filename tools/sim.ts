// Headless economy simulation: 30 in-game days with a simple auto-player.
// Run with: npm run sim
import { World, newGame, fmtMoney } from '../src/game/systems';
import { ITEMS, SUPPLIERS, DIFFICULTY } from '../src/game/data';
import type { GameState, Difficulty } from '../src/game/types';

// Fixed seeds so `npm run sim` is a reproducible balance test rather than a lottery.
const SIM_SEED = 1945;

/** Same PRNG as the engine's, so the auto-player's choices replay identically. */
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let ai = mulberry32(SIM_SEED ^ 0x5f3759df);

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg);
}

function restockAll(w: World) {
  const s = w.state;
  // put whatever is in the warehouse onto shelves, keeping one stack per shelf
  for (const sh of s.shelves.slice(0, w.shelfCount())) {
    if (sh.itemId && sh.qty > 0) continue;
    const inv = s.inventory
      .filter((i) => ITEMS[i.itemId])
      .sort((a, b) => (ITEMS[b.itemId].sell - ITEMS[a.itemId].sell))[0];
    if (inv) w.restockShelf(sh.id, inv.uid, inv.qty);
  }
}

function buyStock(w: World) {
  const s = w.state;
  // buy staples from the market when a shelf is low and money allows
  for (const sh of s.shelves.slice(0, w.shelfCount())) {
    if (!sh.itemId || sh.qty > 4) continue;
    const st = s.suppliers.market;
    const avail = st.stock[sh.itemId] ?? 0;
    const want = Math.min(4, avail);
    if (want > 0 && s.player.money > 60) w.buyFromSupplier('market', sh.itemId, want);
  }
  // always try to keep rice + salt on the shelf
  for (const id of ['rice_white', 'salt']) {
    const sh = s.shelves.find((x) => x.itemId === id && x.qty > 0);
    if (sh) continue;
    const empty = s.shelves.find((x) => !x.itemId);
    if (!empty) continue;
    const avail = s.suppliers.market.stock[id] ?? 0;
    if (avail > 0 && s.player.money > 40) {
      w.buyFromSupplier('market', id, Math.min(6, avail));
      const inv = s.inventory.find((i) => i.itemId === id);
      if (inv) w.restockShelf(empty.id, inv.uid, inv.qty);
    }
  }
}

function autoServe(w: World) {
  const c = w.activeCustomer();
  if (!c) return;
  let sh = w.state.shelves.find((x) => x.itemId === c.itemId && x.qty > 0);
  // a real player offers a substitute when the exact item is missing
  if (!sh) {
    const cat = ITEMS[c.itemId]?.cat;
    const alt = w.state.shelves.find((x) => x.itemId && x.qty > 0 && ITEMS[x.itemId]?.cat === cat);
    if (alt && ai() < 0.55) sh = alt;
  }
  if (!sh) { w.dismissActive('nostock'); w.nextCustomer(); return; }
  const qty = Math.min(c.qty, sh.qty);
  const price = w.shelfPrice(sh);
  const r = w.evaluateOffer(c, price, qty);
  if (r.accepted) {
    w.acceptSale(c, price, qty, sh.id);
  } else if (r.counter && r.counter >= w.fairSell(sh.itemId!) * 0.72) {
    w.acceptSale(c, r.counter, qty, sh.id);
  } else {
    w.dismissActive('refused');
  }
  w.nextCustomer();
}

function runDay(w: World) {
  const s = w.state;
  restockAll(w);
  buyStock(w);
  w.openShop();
  let guard = 0;
  while (s.time.phase === 'open' && guard++ < 20000) {
    w.advanceTime(0.1);
    if (s.time.phase !== 'open') break;
    if (s.activeCustomer !== null) autoServe(w);
  }
  assert(s.time.phase !== 'open', 'day should end');
}

function snapshot(st: GameState) {
  return {
    day: st.player.day,
    money: st.player.money,
    rep: st.player.reputation,
    community: st.player.communityTrust,
    familyHealth: st.player.familyHealth,
    pantry: st.player.familyPantry,
    revenue: st.totals.revenue,
    profit: st.totals.profit,
    served: st.totals.customersServed,
    lost: st.totals.customersLost,
    spoiled: st.totals.spoiled,
    lent: st.debts.filter((d) => d.kind === 'lent' && d.status === 'active').length,
    borrowed: st.debts.filter((d) => d.kind === 'borrowed' && d.status !== 'paid').length,
    shelfItems: st.shelves.filter((x) => x.itemId).length,
    warehouse: st.inventory.length,
  };
}

const difficulties: Difficulty[] = ['story', 'normal', 'hard'];
let failed = false;

for (const diff of difficulties) {
  console.log(`\n=== ${diff.toUpperCase()} ===`);
  const state = newGame('Người chơi', diff, SIM_SEED + diff.length);
  const w = new World(state, () => {});
  const days: ReturnType<typeof snapshot>[] = [];
  const prices: number[] = [];
  for (let d = 0; d < 30; d++) {
    runDay(w);
    prices.push(w.fairSell('rice_white'));
    days.push(snapshot(w.state));
    if (d < 30) {
      w.endDay();
      // report -> evening -> next day
      w.nextDay();
    }
  }
  const first = days[0];
  const last = days[days.length - 1];
  assert(days.every((x) => Number.isFinite(x.money)), 'money finite');
  assert(days.every((x) => x.money >= 0), 'money never negative');
  assert(days.every((x) => Number.isFinite(x.profit)), 'profit finite');
  assert(last.day === 30, 'reached day 30, got ' + last.day);
  assert(last.served > 20, 'served a meaningful number of customers: ' + last.served);
  assert(prices.every((p) => p >= 1 && p < 500), 'prices sane');

  // ---- save / load round trip (state identity, no replay) ----
  const json = w.serialize();
  const restored = World.migrate(JSON.parse(json) as GameState);
  assert(restored, 'migrate returns state');
  assert(restored!.player.day === state.player.day, 'day persists');
  assert(restored!.player.money === state.player.money, 'money persists');
  assert(restored!.inventory.length === state.inventory.length, 'inventory persists');
  assert(restored!.debts.length === state.debts.length, 'debts persist');
  assert(restored!.upgrades.length === state.upgrades.length, 'upgrades persist');
  assert(JSON.stringify(restored!.quests) === JSON.stringify(state.quests), 'quests persist');
  assert(JSON.stringify(restored!.story) === JSON.stringify(state.story), 'story persists');

  // ---- no infinite supply ----
  const marketStock = Object.values(state.suppliers.market.stock).reduce((a, b) => a + b, 0);
  assert(marketStock < 400, 'market stock bounded: ' + marketStock);

  console.log(
    `day 1 -> 30: money ${fmtMoney(first.money)} -> ${fmtMoney(last.money)} | ` +
    `revenue ${fmtMoney(last.revenue)} | profit ${fmtMoney(last.profit)} | ` +
    `served ${last.served} lost ${last.lost} | spoiled ${last.spoiled} | ` +
    `rep ${Math.round(last.rep)} community ${Math.round(last.community)} | ` +
    `family ${Math.round(last.familyHealth)} | debts L${last.lent}/B${last.borrowed}`
  );
  console.log(
    `rice price: min ${Math.min(...prices)} max ${Math.max(...prices)} avg ${Math.round(
      prices.reduce((a, b) => a + b, 0) / prices.length
    )} (base ${ITEMS.rice_white.sell})`
  );
  // print a compact per-week table
  for (const i of [0, 6, 12, 18, 24, 29]) {
    const d = days[i];
    console.log(
      `  d${String(d.day).padStart(2)} money ${String(d.money).padStart(5)} served ${String(d.served).padStart(3)} ` +
      `lost ${String(d.lost).padStart(2)} rep ${String(Math.round(d.rep)).padStart(3)} fam ${String(Math.round(d.familyHealth)).padStart(3)} ` +
      `pantry ${String(d.pantry).padStart(3)} shelf ${d.shelfItems} wh ${d.warehouse}`
    );
  }
  const drift = prices[29] / prices[0];
  console.log(`  price drift over 30 days: x${drift.toFixed(2)}`);
  if (drift > 2.2 || drift < 0.45) {
    console.log('  WARNING: price drift out of band');
  }
}

// ---- deterministic RNG check ----
{
  const a = new World(newGame('A', 'normal'), () => {});
  const b = new World(newGame('B', 'normal'), () => {});
  const seqA = [a.rand(), a.rand(), a.rand()];
  const seqB = [b.rand(), b.rand(), b.rand()];
  assert(seqA.some((v, i) => v !== seqB[i]), 'different seeds give different sequences');

  // same seed -> byte-identical starting world, and identical play sequence
  const s1 = newGame('X', 'hard', 424242);
  const s2 = newGame('X', 'hard', 424242);
  assert(JSON.stringify(s1.economy) === JSON.stringify(s2.economy), 'seeded economy is identical');
  assert(JSON.stringify(s1.npcs) === JSON.stringify(s2.npcs), 'seeded npcs are identical');
  assert(JSON.stringify(s1.dayPlan) === JSON.stringify(s2.dayPlan), 'seeded day plan is identical');
  const w1 = new World(s1, () => {});
  const w2 = new World(s2, () => {});
  for (let i = 0; i < 40; i++) assert(w1.rand() === w2.rand(), 'seeded rng stream diverged at ' + i);
  w1.endDay();
  w2.endDay();
  assert(w1.state.player.day === w2.state.player.day, 'seeded day advance matches');
}

console.log('\nAll simulation checks passed.');
if (failed) process.exit(1);
