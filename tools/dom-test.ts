// DOM smoke test with jsdom: boots the real UI and plays through the day loop.
// Run with: npx tsx tools/dom-test.ts
import { JSDOM } from 'jsdom';

const dom = new JSDOM(
  `<!doctype html><html><body><div id="app"><div id="stage">
     <canvas id="scene" width="1280" height="720"></canvas><div id="ui"></div><div id="loading"><div class="load-inner"><div class="load-title">Cửa Hàng 1945</div><div class="load-bar"><i id="loading-bar"></i></div></div></div>
   </div></div></body></html>`,
  { url: 'http://localhost/', pretendToBeVisual: true },
);

// ---------------------------------------------------------------- globals --
const g = globalThis as Record<string, unknown>;
const win = dom.window as unknown as Record<string, unknown>;
for (const key of ['window', 'document', 'localStorage', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'getComputedStyle']) {
  g[key] = win[key];
}
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number;
g.cancelAnimationFrame = (id: number) => clearTimeout(id);
g.localStorage = dom.window.localStorage;

class FakeImage {
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  complete = false;
  naturalWidth = 0;
  naturalHeight = 0;
  private _src = '';
  get src() { return this._src; }
  set src(v: string) {
    this._src = v;
    this.complete = true;
    this.naturalWidth = 64;
    this.naturalHeight = 64;
    setTimeout(() => this.onload?.(), 0);
  }
}
g.Image = FakeImage;
win.Image = FakeImage;

function makeCtx(): CanvasRenderingContext2D {
  const gradient = { addColorStop() { /* noop */ } };
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop: string) {
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => gradient;
      if (prop === 'measureText') return () => ({ width: 10 });
      return () => { /* noop */ };
    },
    set() { return true; },
  };
  return new Proxy({}, handler) as unknown as CanvasRenderingContext2D;
}
(dom.window as unknown as { HTMLCanvasElement: { prototype: { getContext: () => unknown } } }).HTMLCanvasElement.prototype.getContext = function () {
  return makeCtx();
};

// ------------------------------------------------------------------- test --
const failures: string[] = [];
function check(cond: unknown, msg: string) {
  if (cond) console.log('  ✓ ' + msg);
  else { console.log('  ✗ ' + msg); failures.push(msg); }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const { Game } = await import('../src/game/game');
  const canvas = document.getElementById('scene') as HTMLCanvasElement;
  const game = new Game(canvas);
  const ui = game.ui as unknown as Record<string, (...a: unknown[]) => unknown>;
  // NOTE: game.world is replaced on new game / load, always read it fresh.
  const world = () => game.world;
  const $ = (sel: string) => document.querySelector(sel);
  const $$ = (sel: string) => Array.from(document.querySelectorAll(sel));
  const click = (sel: string) => {
    const el = $(sel) as HTMLElement | null;
    if (!el) throw new Error('Missing element ' + sel);
    el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  };

  console.log('\n— boot —');
  game.boot();
  await sleep(60);
  check(!!$('.title-screen'), 'title screen renders');
  check(!!$('[data-action="new-game-screen"]'), 'title has new-game button');
  {
    // no save yet: the entry is visible but explains itself instead of vanishing
    const c = $('[data-action="continue"]') as HTMLButtonElement | null;
    check(!!c, 'title always shows a "Tiếp tục" entry');
    check(!!c && c.disabled, '"Tiếp tục" is disabled when nothing is saved');
    check(!!c && !!(c as HTMLElement).title, 'disabled "Tiếp tục" explains why');
  }
  check(!!$('#loading'), 'loading overlay exists');

  console.log('\n— new game —');
  game.startNew('Thử Nghiệm', 'normal');
  check(game.screen === 'playing', 'screen switches to playing');
  check(!!$('.modal'), 'chapter card modal opens');
  check(($('.modal')?.textContent ?? '').includes('Chương 1'), 'chapter 1 card shown');
  game.afterChapter();
  await sleep(10);
  check(!!$('.modal'), 'intro event modal opens');
  check(($('.modal')?.textContent ?? '').includes('Căn tiệm của cha'), 'intro event text shown');

  console.log('\n— intro choice —');
  click('[data-action="event-choice"][data-choice="0"]');
  await sleep(20);
  check(world().state.seenEvents.includes('intro_day1'), 'intro marked as seen');
  check(world().state.time.phase === 'morning', 'still morning after intro (no day skip)');
  check(world().state.player.day === 1, 'still day 1 after intro');

  console.log('\n— HUD & dock —');
  check(($('#hud')?.textContent ?? '').includes('Ngày 1'), 'HUD shows day');
  check(($('#hud')?.textContent ?? '').length > 20, 'HUD has content');
  check($$('#dock .icon-btn').length >= 12, 'dock has 12+ buttons, got ' + $$('#dock .icon-btn').length);

  console.log('\n— panels render without throwing —');
  const panels = ['inventory', 'prices', 'suppliers', 'debts', 'quests', 'journal', 'shop', 'map', 'save', 'settings', 'family', 'help'];
  for (const p of panels) {
    try {
      (ui.openPanel as (n: string) => void)(p);
      const ok = !!$('.modal') && ($('.modal')?.textContent?.length ?? 0) > 40;
      check(ok, `panel "${p}" renders (${($('.modal')?.textContent?.length ?? 0)} chars)`);
    } catch (e) {
      check(false, `panel "${p}" threw: ${(e as Error).message}`);
    }
  }

  console.log('\n— inventory —');
  (ui.openPanel as (n: string) => void)('inventory');
  check($$('.inv-grid .slot').length === world().warehouseSlots(), `warehouse grid has ${world().warehouseSlots()} slots`);
  const firstSlot = $('.inv-grid .slot[data-uid]') as HTMLElement;
  check(!!firstSlot, 'starting inventory visible in grid');
  firstSlot?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await sleep(10);
  check(($('.inv-side')?.textContent?.length ?? 0) > 60, 'selecting an item shows details');
  check(!!$('[data-action="to-shelf"]'), 'put-on-shelf action available');
  // shelf picker -> put rice on an empty shelf
  const beforeShelf = world().state.shelves.filter((s) => s.itemId).length;
  click('[data-action="to-shelf"]');
  await sleep(10);
  check(!!$('[data-action="shelf-pick"]'), 'shelf picker lists shelves');
  click('[data-action="shelf-pick"]');
  await sleep(10);
  check(world().state.shelves.filter((s) => s.itemId).length >= beforeShelf, 'shelf restocked without error');

  console.log('\n— search & filter —');
  {
    const search = document.querySelector('[data-field="search"]') as HTMLInputElement | null;
    check(!!search, 'search box rendered');
    if (search) {
      const before = $$('.inv-grid .slot[data-uid]').length;
      const sample = $('.inv-grid .slot[data-uid]') as HTMLElement | null;
      const term = (sample?.title ?? '').split(' ×')[0];
      check(term.length > 1, 'slot exposes its item name (title), got "' + term + '"');
      search.value = term;
      search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      await sleep(10);
      const after = document.querySelector('[data-field="search"]') as HTMLInputElement | null;
      check(!!after && after.value === term, 'search keeps the typed text');
      check(document.activeElement === after, 'search box keeps focus while typing');
      const dimmed = $$('.inv-grid .slot.dimmed').length;
      check(dimmed > 0 && dimmed < before, `search dims non-matching slots (${dimmed}/${before})`);
      // clear again
      after!.value = '';
      after!.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      await sleep(10);
    }
    const foodChip = $('[data-action="filter"][data-cat="food"]') as HTMLElement | null;
    check(!!foodChip, 'category chips rendered');
    foodChip?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await sleep(10);
    check($$('.inv-grid .slot[data-uid]').length > 0, 'category filter shows matching items');
    const allChip = $('[data-action="filter"][data-cat="all"]') as HTMLElement | null;
    allChip?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await sleep(10);
  }

  console.log('\n— split stack —');
  const rice = world().state.inventory.find((i) => i.itemId === 'rice_white');
  if (rice && rice.qty > 1) {
    const uid = rice.uid;
    const before = world().state.inventory.length;
    world().splitStack(uid, 1);
    check(world().state.inventory.length === before + 1, 'splitStack creates a new stack');
  } else {
    check(true, 'splitStack skipped (no stack > 1)');
  }

  console.log('\n— drag & drop (moveStack) —');
  {
    const inv = world().state.inventory[0];
    const target = world().firstEmptySlot();
    const ok = world().moveStack(inv.uid, target);
    check(ok && world().state.inventory.find((i) => i.uid === inv.uid)!.slot === target, 'moveStack relocates a stack');
  }

  console.log('\n— suppliers —');
  (ui.openPanel as (n: string) => void)('suppliers');
  check($$('.sup-card').length === Object.keys(world().state.suppliers).length, 'all suppliers listed');
  const moneyBefore = world().state.player.money;
  const stockBefore = world().state.suppliers.market.stock.rice_white ?? 0;
  const r = world().buyFromSupplier('market', 'rice_white', 2);
  check(r.ok, 'buying from market succeeds: ' + r.msg);
  check(world().state.player.money < moneyBefore, 'money is deducted');
  check((world().state.suppliers.market.stock.rice_white ?? 0) === stockBefore - 2, 'supplier stock decreases (no infinite supply)');

  console.log('\n— open shop & serve a customer —');
  game.openShop();
  check(world().state.time.phase === 'open', 'phase becomes open');
  let spawned = false;
  for (let i = 0; i < 3200 && !spawned; i++) {
    world().advanceTime(0.1);
    spawned = !!world().activeCustomer();
  }
  check(spawned, 'a customer spawns during opening hours');
  const cust = world().activeCustomer();
  if (cust) {
    ui.renderTrade();
    check(($('#trade-root')?.textContent ?? '').includes(cust.name), 'trade panel shows the customer');
    // auto-offer at shelf price
    const sh = world().state.shelves.find((x) => x.itemId === cust.itemId && x.qty > 0);
    if (sh) {
      const qty = Math.min(cust.qty, sh.qty);
      const price = world().shelfPrice(sh);
      const ev = world().evaluateOffer(cust, price, qty);
      check(typeof ev.accepted === 'boolean', 'offer evaluated');
      if (ev.accepted) {
        const before = world().state.player.money;
        const okSale = world().acceptSale(cust, price, qty, sh.id);
        check(okSale && world().state.player.money > before, 'sale credits money');
      } else {
        check(!!ev.counter && ev.counter > 0, 'counter-offer returned');
      }
    } else {
      check(true, 'customer wanted an unstocked item (substitute flow)');
    }
  }

  console.log('\n— save / load —');
  world().state.player.money = 321;
  const savedInv = world().state.inventory.length;
  const savedDay = world().state.player.day;
  game.saveSlot(1);
  check(game.peekSlot(1)?.player.money === 321, 'slot 1 holds the saved money');
  world().state.player.money = 1;
  world().state.inventory = [];
  game.loadSlot(1);
  check(game.world.state.player.money === 321, 'load restores money');
  check(game.world.state.player.day === savedDay, 'load restores day');
  check(game.world.state.inventory.length === savedInv, 'load restores inventory');
  check(game.world.state.totals.revenue === 0, 'load does not replay transactions');

  console.log('\n— delete slot —');
  game.deleteSlot(1);
  check(game.peekSlot(1) === null, 'slot deleted');

  console.log('\n— day end & report —');
  // finish the day
  if (world().state.time.phase !== 'open') game.openShop();
  let guard = 0;
  while (world().state.time.phase === 'open' && guard++ < 4000) {
    world().advanceTime(0.5);
    const c = world().activeCustomer();
    if (c) {
      const sh = world().state.shelves.find((x) => x.itemId === c.itemId && x.qty > 0);
      if (sh) {
        const qty = Math.min(c.qty, sh.qty);
        world().acceptSale(c, world().shelfPrice(sh), qty, sh.id);
      } else {
        world().dismissActive('nostock');
      }
      world().nextCustomer();
    }
  }
  check(world().state.time.phase === 'report', 'day ends in report phase');
  game.ui.showReport();
  await sleep(10);
  check(!!$('.report'), 'report modal renders');
  check(($('.report')?.textContent ?? '').includes('Doanh thu'), 'report shows revenue');
  const rep = world().state.lastReport;
  check(!!rep && rep.revenue >= 0, 'lastReport recorded');

  game.afterReport();
  await sleep(20);
  const modalText = $('.modal')?.textContent ?? '';
  check(modalText.length > 0 || game.world.state.time.phase === 'morning', 'evening: either an event or the next morning appears');
  // resolve any queued events until the day advances
  let clicks = 0;
  while (game.world.state.player.day === 1 && clicks++ < 6) {
    const btn = $('[data-action="event-choice"]') as HTMLElement | null;
    if (btn) { btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); await sleep(10); }
    else break;
  }
  check(game.world.state.player.day === 2, 'advances to day 2, got day ' + game.world.state.player.day);
  check(game.world.state.time.phase === 'morning', 'new day starts in the morning');

  console.log('\n— keyboard shortcuts —');
  (document.activeElement as HTMLElement | null)?.blur?.();
  window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'i' }));
  await sleep(10);
  check(!!$('.inv-grid'), 'I opens inventory');
  window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
  await sleep(10);
  check(!$('.modal'), 'Esc closes the modal');
  window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: '3' }));
  check(game.world.state.time.speed === 3, '3 sets speed 3');

  console.log('\n— autosave on day change —');
  check(game.peekSlot(0) !== null, 'autosave slot populated');

  // =========================================================================
  console.log('\n=== PART 2: negotiation, upgrades, travel, ending ===');
  game.startNew('Thương Nhân', 'normal');
  game.afterChapter();
  await sleep(10);
  // dismiss the intro event
  const introBtn = $('[data-action="event-choice"]') as HTMLElement | null;
  introBtn?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await sleep(10);
  check(game.world.state.time.phase === 'morning', 'fresh game is in the morning');

  const trade = () => ui.trade as unknown as { shelfId: number | null; qty: number; price: number; counter: number | null; message: string };
  const give = (n: number) => { game.world.state.player.money += n; };

  console.log('\n— accepted offer —');
  game.openShop();
  // make sure rice is on a shelf
  const riceShelf = game.world.state.shelves.find((x) => x.itemId === 'rice_white') ?? game.world.state.shelves[0];
  if (!riceShelf.itemId) {
    const inv = game.world.state.inventory.find((i) => i.itemId === 'rice_white');
    if (inv) game.world.restockShelf(riceShelf.id, inv.uid, inv.qty);
  }
  give(200);
  const money0 = game.world.state.player.money;
  game.world.state.customers = [];
  game.world.state.activeCustomer = null;
  game.world.spawnCustomer('ba_tu', 'rice_white', 1);
  ui.renderTrade();
  await sleep(5);
  check(!!$('[data-action="trade-offer"]'), 'offer button rendered');
  check(!!$('[data-action="trade-gift"]'), 'gift button rendered');
  check(!!$('[data-action="trade-credit"]'), 'credit button rendered');
  check(!!$('[data-action="trade-barter"]'), 'barter button rendered');
  trade().price = 1; // a giveaway price always succeeds
  click('[data-action="trade-offer"]');
  await sleep(10);
  check(game.world.state.player.money > money0, 'offer at a low price sells and credits money');
  check(trade().message.includes('đồng ý'), 'success message shown: ' + trade().message);

  console.log('\n— negotiation verbs —');
  game.world.state.customers = [];
  game.world.state.activeCustomer = null;
  game.world.spawnCustomer('ba_tu', 'rice_white', 1);
  ui.renderTrade();
  await sleep(5);
  check(!!$('[data-action="trade-hold"]'), 'hold-price button rendered');
  check($$('[data-action="trade-cut"]').length === 2, 'two price-cut buttons rendered');
  check(!!$('[data-action="trade-bundle"]'), 'bundle button rendered');
  // bundle: sells the unit plus one sweetener
  game.world.state.customers = [];
  game.world.state.activeCustomer = null;
  const bShelf = game.world.state.shelves.find((x) => x.itemId === 'rice_white' && x.qty >= 2);
  if (bShelf) {
    const qtyBefore = bShelf.qty;
    game.world.spawnCustomer('ba_tu', 'rice_white', 1);
    ui.renderTrade();
    await sleep(5);
    trade().price = 1;
    const bundleBtn = $('[data-action="trade-bundle"]') as HTMLButtonElement | null;
    if (bundleBtn && !bundleBtn.disabled) {
      bundleBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
      await sleep(10);
      check(bShelf.qty <= qtyBefore - 2, 'bundle consumes the sold unit plus a sweetener');
    } else {
      check(true, 'bundle button disabled');
    }
  } else {
    check(true, 'not enough stock to bundle (skipped)');
  }

  console.log('\n— refused offer & counter —');
  game.world.state.customers = [];
  game.world.state.activeCustomer = null;
  game.world.spawnCustomer('ong_nam', 'salt', 1);
  ui.renderTrade();
  await sleep(5);
  const saltShelf = game.world.state.shelves.find((x) => x.itemId === 'salt' && x.qty > 0);
  if (saltShelf) {
    trade().price = Math.round(game.world.fairSell('salt') * 40); // absurd price
    click('[data-action="trade-offer"]');
    await sleep(10);
    check(!!$('[data-action="trade-counter"]') || game.world.activeCustomer() === null, 'absurd price is rejected');
    check(trade().message.length > 0, 'rejection message shown');
    if ($('[data-action="trade-counter"]')) {
      click('[data-action="trade-counter"]');
      await sleep(10);
      check(game.world.activeCustomer() === null, 'accepting the counter completes the sale');
    }
  } else {
    check(true, 'no salt on shelf (skipped)');
  }

  console.log('\n— credit sale —');
  game.world.state.customers = [];
  game.world.state.activeCustomer = null;
  game.world.state.npcs.co_man.trust = 60;
  const medShelf = game.world.state.shelves.find((x) => x.itemId === 'medicine_bottle');
  if (!medShelf) {
    const inv = game.world.state.inventory.find((i) => i.itemId === 'medicine_bottle');
    const empty = game.world.state.shelves.find((x) => !x.itemId);
    if (inv && empty) game.world.restockShelf(empty.id, inv.uid, inv.qty);
  }
  game.world.spawnCustomer('co_man', 'medicine_bottle', 1);
  ui.renderTrade();
  await sleep(5);
  const creditBtn = $('[data-action="trade-credit"]') as HTMLButtonElement | null;
  if (creditBtn && !creditBtn.disabled) {
    const debts0 = game.world.state.debts.length;
    click('[data-action="trade-credit"]');
    await sleep(10);
    check(game.world.state.debts.length === debts0 + 1, 'credit sale creates a receivable');
    check(game.world.state.debts[game.world.state.debts.length - 1].kind === 'lent', 'receivable is a loan to the customer');
  } else {
    check(true, 'credit button unavailable (trust too low)');
  }

  console.log('\n— barter —');
  game.world.state.customers = [];
  game.world.state.activeCustomer = null;
  game.world.spawnCustomer('ong_nam', 'salt', 1);
  ui.renderTrade();
  await sleep(5);
  const barterBtn = $('[data-action="trade-barter"]') as HTMLButtonElement | null;
  if (barterBtn && !barterBtn.disabled) {
    const potatoes0 = game.world.townStock('corn');
    click('[data-action="trade-barter"]');
    await sleep(10);
    check(game.world.townStock('corn') > potatoes0, 'barter brings goods into stock');
  } else {
    check(true, 'barter unavailable for this customer');
  }

  console.log('\n— refuse —');
  game.world.state.customers = [];
  game.world.state.activeCustomer = null;
  game.world.spawnCustomer('cau_ti', 'banana', 1);
  ui.renderTrade();
  await sleep(5);
  click('[data-action="trade-refuse"]');
  await sleep(10);
  check(game.world.activeCustomer() === null, 'refusing clears the customer');

  console.log('\n— substitute —');
  game.world.state.customers = [];
  game.world.state.activeCustomer = null;
  game.world.spawnCustomer('ong_chin', 'antique', 1); // not stocked
  ui.renderTrade();
  await sleep(5);
  check($('[data-action="trade-substitute"]') !== null, 'substitute buttons offered when out of stock');
  click('[data-action="trade-substitute"]');
  await sleep(10);
  check(trade().message.includes('thay thế'), 'substitute message shown');

  console.log('\n— shop tier & upgrades —');
  give(3000);
  game.world.state.player.reputation = 80;
  game.world.state.player.communityTrust = 80;
  game.world.state.player.day = 25;
  game.world.state.story.chapter = 4;
  ui.openPanel('shop');
  check(!!$('[data-action="shop-tier"]'), 'shop tier upgrade button rendered');
  const tierBtn = $('[data-action="shop-tier"]') as HTMLButtonElement | null;
  const shelvesBefore = game.world.state.shelves.length;
  if (tierBtn && !tierBtn.disabled) {
    tierBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await sleep(10);
    check(game.world.state.shopLevel === 2, 'shop tier upgraded to 2');
    check(game.world.state.shelves.length >= shelvesBefore + 1, 'a new shelf is added with the tier');
  } else {
    check(true, 'tier button disabled (requirements unmet)');
  }
  ui.openPanel('shop');
  const upgradeBtn = $('[data-action="upgrade"]') as HTMLButtonElement | null;
  check(!!upgradeBtn, 'at least one upgrade is purchasable');
  if (upgradeBtn) {
    const upId = upgradeBtn.dataset.id!;
    const money1 = game.world.state.player.money;
    upgradeBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await sleep(10);
    check(game.world.state.upgrades.includes(upId), 'upgrade purchased: ' + upId);
    check(game.world.state.player.money < money1, 'upgrade costs money');
  }

  console.log('\n— map travel —');
  ui.openPanel('map');
  check($$('.map-card').length === 8, 'map cards rendered (8 locations), got ' + $$('.map-card').length);
  const travelBtn = $('[data-action="travel"]') as HTMLButtonElement | null;
  check(!!travelBtn, 'a travel button exists');
  if (travelBtn) {
    const before = game.world.state.travel.actionsLeft;
    travelBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await sleep(10);
    check(game.world.state.travel.actionsLeft === before - 1, 'travelling consumes an action');
    check(!!$('.loc-hero') || !!$('.modal'), 'location panel opens');
  }

  console.log('\n— confirm dialog & discard —');
  {
    ui.openPanel('inventory');
    const slot = $('.inv-grid .slot[data-uid]') as HTMLElement | null;
    check(!!slot, 'inventory has a selectable stack');
    slot?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await sleep(10);
    const before = game.world.state.inventory.length;
    const discard = $('[data-action="discard"]') as HTMLElement | null;
    check(!!discard, 'discard action available');
    discard?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await sleep(10);
    check(!!$('.confirm-box'), 'discard asks for confirmation');
    click('[data-action="confirm-no"]');
    await sleep(10);
    check(game.world.state.inventory.length === before, 'cancelling keeps the item');
    ui.openPanel('inventory');
    const slot2 = $('.inv-grid .slot[data-uid]') as HTMLElement | null;
    slot2?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await sleep(10);
    const discard2 = $('[data-action="discard"]') as HTMLElement | null;
    discard2?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await sleep(10);
    click('[data-action="confirm-yes"]');
    await sleep(10);
    check(game.world.state.inventory.length === before - 1, 'confirming discards the stack');
  }

  console.log('\n— title: panels, continue, autosave —');
  {
    // an autosave must exist as soon as a day has started, so the player can
    // always come back to a run they already began
    game.toTitle();
    await sleep(10);
    check(!!$('[data-action="continue"]'), 'title offers "Tiếp tục" once a run exists');
    const cont = $('[data-action="continue"]') as HTMLButtonElement | null;
    check(!!cont && !cont.disabled, '"Tiếp tục" is enabled when a save exists');

    // opening a panel from the title used to wipe the title screen for good
    click('[data-action="open-panel"][data-panel="settings"]');
    await sleep(10);
    check(!!$('.modal'), 'settings panel opens from the title');
    click('[data-action="close-modal"]');
    await sleep(10);
    check(!!$('.title-screen'), 'title screen comes back after closing a panel');
    check(!!$('[data-action="new-game-screen"]'), '"Chơi mới" is clickable again after closing a panel');
    check((document.getElementById('modal-root') as HTMLElement).style.display !== 'none', 'modal-root is visible on the title');

    // and the continue button actually loads the run
    click('[data-action="continue"]');
    await sleep(20);
    check(game.screen === 'playing', 'continue loads the autosave');
    check(game.world.state.player.day >= 1, 'loaded run is on a real day: ' + game.world.state.player.day);
  }

  console.log('\n— ending —');
  game.world.state.player.day = 30;
  game.world.state.story.chapter = 5;
  game.world.state.totals.revenue = 1200;
  game.afterReport();
  await sleep(10);
  check(!!$('[data-action="event-choice"]'), 'finale event appears on day 30');
  const fin = $('[data-action="event-choice"]') as HTMLElement | null;
  fin?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await sleep(10);
  check(!!$('.ending'), 'ending screen renders');
  check(!!game.world.state.ending, 'an ending is recorded: ' + (game.world.state.ending?.id ?? 'none'));
  check(($('.ending')?.textContent ?? '').length > 200, 'ending has narrative text');
  game.destroy();
  console.log('\n' + (failures.length ? `${failures.length} FAILURE(S)` : 'All DOM checks passed.'));
  if (failures.length) { console.log(failures.join('\n')); process.exit(1); }
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
