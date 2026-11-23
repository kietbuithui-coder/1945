// DOM UI core: HUD, dock, modals, trade, screens.
import type { Game } from './game';
import { BUILD } from './version';
import type { World } from './systems';
import {
  ITEMS, NPCS, QUALITY_LABEL, QUALITY_COLOR, QUALITY_MULT, DIFFICULTY, CHAPTERS,
} from './data';
import {
  fmtMoney, weatherLabel, timePhase, clock, dateLabel, relationshipLabel,
} from './systems';
import type { GameState, Shelf, EventDef, Difficulty } from './types';
import { audio } from './audio';
import {
  renderInventoryPanel, renderPricesPanel, renderSuppliersPanel, renderDebtsPanel,
  renderQuestsPanel, renderJournalPanel, renderShopPanel, renderMapPanel, renderSavePanel,
  renderSettingsPanel, renderFamilyPanel, renderHelpPanel, renderShelfPicker, renderStockPicker,
  renderLocationPanel, renderMarketPanel, renderNeighbourPanel,
} from './panels';

const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

interface TradeState {
  shelfId: number | null;
  qty: number;
  price: number;
  counter: number | null;
  message: string;
  tone: 'info' | 'good' | 'bad';
  mode: 'offer' | 'substitute';
  customerUid: number | null;
}

export class UI {
  game: Game;
  root: HTMLElement;
  trade: TradeState = {
    shelfId: null, qty: 1, price: 0, counter: null, message: '', tone: 'info', mode: 'offer', customerUid: null,
  };
  activePanel: string | null = null;
  invTab: 'warehouse' | 'shelves' = 'warehouse';
  filter = 'all';
  search = '';
  sortMode = 'category';
  selectedUid: number | null = null;
  lastCustomerUid: number | null = null;
  hintVisible = true;
  /** True while a modal or panel covers the shop — the clock is frozen then, so
   *  the player can read and rearrange stock without losing customers. */
  modalOpen = false;
  currentEvent: EventDef | null = null;
  private confirmCb: (() => void) | null = null;
  private dragUid: number | null = null;
  private ghost: HTMLElement | null = null;
  private dragMoved = false;

  constructor(game: Game) {
    this.game = game;
    this.root = document.getElementById('ui')!;
    this.root.innerHTML = `
      <div class="hud" id="hud"></div>
      <div class="dock" id="dock"></div>
      <div id="trade-root"></div>
      <div class="help-hint" id="hint"></div>
      <div class="pause-overlay" id="pause-overlay"><div class="pause-card"><div class="t">TẠM DỪNG</div><div class="s">Nhấn <b>Space</b> để tiếp tục · <b>1/2/3</b> đổi tốc độ</div></div></div>
      <div id="modal-root"></div>
      <div class="toasts" id="toasts"></div>
    `;
    this.bind();
    this.refresh();
  }

  get world(): World { return this.game.world; }
  get state(): GameState { return this.world.state; }

  // ------------------------------------------------------------- plumbing --
  private bind() {
    // The action router listens in the CAPTURE phase on `document`: nothing inside
    // the UI (inline handler, stopPropagation, a component that swallows clicks)
    // can prevent a button from working. Every button in the game is a
    // [data-action], so this one listener is the whole input layer.
    document.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest?.('[data-action]') as HTMLElement | null;
      if (!t || !this.root.contains(t)) return;
      const action = t.dataset.action!;
      if (action === 'backdrop') {
        if (!t.dataset.static) this.closeModal();
        return;
      }
      this.handleAction(action, { ...t.dataset } as Record<string, string>);
    }, true);
    this.root.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement;
      if (t.dataset.field) this.handleInput(t.dataset.field, t.value);
    });
    this.root.addEventListener('change', (e) => {
      const t = e.target as HTMLInputElement;
      if (t.dataset.field) this.handleInput(t.dataset.field, t.value);
    });
    this.root.addEventListener('pointerdown', (e) => {
      const slot = (e.target as HTMLElement).closest('.slot[data-uid]') as HTMLElement | null;
      if (!slot) return;
      this.dragUid = Number(slot.dataset.uid);
      this.dragMoved = false;
      const img = slot.querySelector('img');
      if (img) {
        const ghost = document.createElement('img');
        ghost.src = img.src;
        ghost.className = 'item-icon';
        ghost.style.cssText = 'position:fixed;width:64px;height:64px;pointer-events:none;z-index:9999;opacity:.9';
        ghost.style.left = e.clientX - 32 + 'px';
        ghost.style.top = e.clientY - 32 + 'px';
        document.body.appendChild(ghost);
        this.ghost = ghost;
      }
      const move = (ev: PointerEvent) => {
        if (!this.dragMoved && Math.abs(ev.clientX - e.clientX) + Math.abs(ev.clientY - e.clientY) > 6) this.dragMoved = true;
        if (this.ghost) { this.ghost.style.left = ev.clientX - 32 + 'px'; this.ghost.style.top = ev.clientY - 32 + 'px'; }
        document.querySelectorAll('.slot.dragover, .shelf-card.dragover').forEach((x) => x.classList.remove('dragover'));
        const hit = document.elementFromPoint(ev.clientX, ev.clientY);
        const under = hit?.closest('.slot[data-slot]') as HTMLElement | null;
        const underShelf = hit?.closest('.shelf-card[data-shelf]') as HTMLElement | null;
        if (under) under.classList.add('dragover');
        else if (underShelf) underShelf.classList.add('dragover');
      };
      const up = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        this.ghost?.remove();
        this.ghost = null;
        const hit = document.elementFromPoint(ev.clientX, ev.clientY);
        const under = hit?.closest('.slot[data-slot]') as HTMLElement | null;
        const underShelf = hit?.closest('.shelf-card[data-shelf]') as HTMLElement | null;
        document.querySelectorAll('.slot.dragover, .shelf-card.dragover').forEach((x) => x.classList.remove('dragover'));
        // drop onto a shelf strip = put the stack on that shelf
        if (this.dragMoved && underShelf && this.dragUid !== null) {
          this.world.restockShelf(Number(underShelf.dataset.shelf), this.dragUid, 999);
          this.dragUid = null;
          this.refreshPanel();
          return;
        }
        if (this.dragMoved && under && this.dragUid !== null) {
          const targetSlot = Number(under.dataset.slot);
          const dragged = this.state.inventory.find((i) => i.uid === this.dragUid);
          const target = this.state.inventory.find((i) => i.slot === targetSlot);
          if (dragged && target && target.itemId === dragged.itemId && target.quality === dragged.quality && target.uid !== dragged.uid) {
            const space = 99 - target.qty;
            const moveQty = Math.min(space, dragged.qty);
            if (moveQty > 0) {
              target.qty += moveQty;
              dragged.qty -= moveQty;
              if (dragged.qty <= 0) this.state.inventory = this.state.inventory.filter((i) => i.uid !== dragged.uid);
              this.refreshPanel();
              return;
            }
          }
          this.world.moveStack(this.dragUid, targetSlot);
          this.refreshPanel();
        }
        this.dragUid = null;
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }

  handleInput(field: string, value: string) {
    if (field === 'search') {
      this.search = value;
      // re-render the list but keep the caret in the box the player is typing in
      const el = document.querySelector('[data-field="search"]') as HTMLInputElement | null;
      const pos = el?.selectionStart ?? null;
      this.refreshPanel();
      const next = document.querySelector('[data-field="search"]') as HTMLInputElement | null;
      if (next) { next.focus(); if (pos !== null) next.setSelectionRange(pos, pos); }
    } else if (field === 'trade-qty') {
      this.trade.qty = Math.max(1, Math.min(99, Number(value) || 1));
      this.updateTradeTotals();
    } else if (field === 'trade-price') {
      this.trade.price = Math.max(1, Number(value) || 1);
      this.updateTradeTotals();
    } else if (field === 'sfx' || field === 'music') {
      const v = Math.max(0, Math.min(1, Number(value)));
      if (field === 'sfx') { this.state.settings.sfx = v; audio.setSfx(v); }
      else { this.state.settings.music = v; audio.setMusic(v); }
      const box = document.querySelector(`[data-field="${field}"]`) as HTMLInputElement | null;
      const label = box?.parentElement?.querySelector('b');
      if (label) label.textContent = `${Math.round(v * 100)}%`;
    }
  }

  private handleAction(action: string, d: Record<string, string>) {
    audio.play('click');
    switch (action) {
      case 'new-game': this.game.startNew('', 'normal'); break;
      case 'new-game-screen': this.showNewGame(); break;
      case 'continue': this.game.loadSlot(0); break;
      case 'load-slot': {
        const slot = Number(d.slot);
        const doLoad = () => this.game.loadSlot(slot);
        if (this.game.screen === 'playing') this.confirm('Tải ô lưu này sẽ thay thế tiến trình hiện tại. Tiếp tục?', doLoad, 'Tải');
        else doLoad();
        break;
      }
      case 'save-slot': {
        const slot = Number(d.slot);
        const exists = this.game.peekSlot(slot);
        const doSave = () => this.game.saveSlot(slot);
        if (exists) this.confirm(`Ô ${slot} đã có dữ liệu. Ghi đè?`, doSave, 'Ghi đè');
        else doSave();
        break;
      }
      case 'delete-slot': {
        const slot = Number(d.slot);
        this.confirm(`Xóa ô lưu ${slot}? Không thể khôi phục.`, () => { this.game.deleteSlot(slot); this.openSave(); }, 'Xóa');
        break;
      }
      case 'confirm-yes': {
        const cb = this.confirmCb;
        this.confirmCb = null;
        this.closeModal();
        cb?.();
        break;
      }
      case 'confirm-no':
        this.confirmCb = null;
        this.closeModal();
        break;
      case 'back-title': this.game.toTitle(); break;
      case 'open-panel': this.openPanel(d.panel!); break;
      case 'close-modal': this.closeModal(); break;
      case 'modal-surface': break; // the modal's own background: swallow the click
      case 'tab': this.invTab = d.tab as 'warehouse' | 'shelves'; this.openInventory(); break;
      case 'auto-restock': {
        const n = this.world.autoRestock();
        this.toast(n ? `Đã bày hàng lên ${n} kệ.` : 'Không còn kệ trống hoặc kho đã hết hàng.', n ? 'good' : 'info');
        this.openInventory();
        break;
      }
      case 'filter': this.filter = d.cat!; this.refreshPanel(); break;
      case 'sort': this.sortMode = d.mode!; this.world.autoSort(this.sortMode as never); this.refreshPanel(); break;
      case 'select-item': this.selectedUid = Number(d.uid); this.openInventory(); break;
      case 'split': if (this.selectedUid !== null) { const inv = this.state.inventory.find((i) => i.uid === this.selectedUid); if (inv) { this.world.splitStack(inv.uid, Math.max(1, Math.floor(inv.qty / 2))); this.openInventory(); } } break;
      case 'to-shelf': this.openShelfPicker(Number(d.uid)); break;
      case 'shelf-pick': this.world.restockShelf(Number(d.shelf), Number(d.uid), Number(d.qty || 999)); this.closeModal(); this.openInventory(); break;
      case 'shelf-return': this.world.returnShelfToWarehouse(Number(d.shelf)); this.openInventory(); break;
      case 'shelf-restock': this.openStockPicker(Number(d.shelf)); break;
      case 'stock-pick': this.world.restockShelf(Number(d.shelf), Number(d.uid), Number(d.qty || 999)); this.closeModal(); this.openInventory(); break;
      case 'markup': {
        const sh = this.state.shelves.find((s) => s.id === Number(d.shelf));
        if (sh) { sh.markup = Math.max(-0.3, Math.min(0.6, Math.round((sh.markup + Number(d.delta)) * 100) / 100)); this.refreshPanel(); }
        break;
      }
      case 'markup-quick': {
        this.trade.price = Math.max(1, Math.round(this.trade.price * (1 + Number(d.delta))));
        this.updateTradeTotals();
        this.renderTrade();
        break;
      }
      case 'discard': {
        const inv = this.state.inventory.find((i) => i.uid === Number(d.uid));
        if (inv) {
          const name = ITEMS[inv.itemId]?.name ?? inv.itemId;
          this.confirm(`Bỏ toàn bộ ${name} ×${inv.qty}?`, () => {
            this.world.removeWarehouse(inv.uid, inv.qty);
            this.selectedUid = null;
            this.toast('Đã bỏ vật phẩm.', 'info');
            this.openInventory();
          }, 'Bỏ đi');
        }
        break;
      }
      case 'family-food': {
        const inv = this.state.inventory.find((i) => i.uid === Number(d.uid));
        if (inv && ITEMS[inv.itemId]?.cat === 'food') {
          this.world.removeWarehouse(inv.uid, 1);
          this.state.player.familyPantry += 1;
          this.toast('Đã để một phần cơm cho gia đình.', 'good');
          this.openFamily();
        }
        break;
      }
      case 'buy': {
        const r = this.world.buyFromSupplier(d.supplier!, d.item!, Number(d.qty || 1));
        this.toast(r.msg, r.ok ? 'good' : 'bad');
        if (r.ok) this.openSuppliers();
        break;
      }
      case 'order': {
        const r = this.world.placeOrder(d.supplier!, d.item!, Number(d.qty || 1));
        this.toast(r.msg, r.ok ? 'good' : 'bad');
        if (r.ok) this.openSuppliers();
        break;
      }
      case 'repay': {
        const debt = this.state.debts.find((x) => x.id === d.id!);
        if (debt) {
          const due = this.world.debtDue(debt) - debt.paid;
          const want = d.amt === 'half' ? Math.ceil(due / 2) : due;
          const ok = this.world.repayDebt(debt.id, Math.min(want, this.state.player.money));
          this.toast(ok ? `Đã trả ${fmtMoney(Math.min(want, this.state.player.money))} đồng nợ.` : 'Không thể trả nợ.', ok ? 'good' : 'bad');
          this.openDebts();
        }
        break;
      }
      case 'borrow': {
        const debt = this.world.borrow(d.lender!, Number(d.amount || 50));
        if (debt) { this.toast(`Đã vay ${fmtMoney(debt.principal)} đồng.`, 'good'); this.openDebts(); }
        else this.toast('Không thể vay thêm.', 'bad');
        break;
      }
      case 'upgrade': {
        const upDef = this.game.upgradeDef(d.id!);
        if (!upDef) break;
        if (this.state.upgrades.includes(upDef.id)) { this.toast('Đã nâng cấp món này.', 'info'); break; }
        if (this.state.player.money < upDef.cost) { this.toast('Không đủ tiền.', 'bad'); break; }
        if (upDef.level > this.shopLevel()) { this.toast('Cần đạt cấp cửa hàng cao hơn.', 'bad'); break; }
        const dayOk = this.state.player.day >= (upDef.req?.day ?? 1);
        const repOk = this.state.player.reputation >= (upDef.req?.rep ?? 0);
        const trustOk = this.state.player.communityTrust >= (upDef.req?.trust ?? 0);
        if (!dayOk) { this.toast(`Cần đến ngày ${upDef.req?.day}.`, 'bad'); break; }
        if (!repOk) { this.toast(`Cần uy tín ${upDef.req?.rep}.`, 'bad'); break; }
        if (!trustOk) { this.toast(`Cần cộng đồng ${upDef.req?.trust}.`, 'bad'); break; }
        this.state.player.money -= upDef.cost;
        this.state.upgrades.push(upDef.id);
        if (upDef.category === 'staff' && !this.state.employees.includes('co_mai')) this.state.employees.push('co_mai');
        this.state.journal.push({ day: this.state.player.day, text: `Đã nâng cấp: ${upDef.name}.`, kind: 'event' });
        this.toast(`Đã nâng cấp: ${upDef.name}`, 'good');
        audio.play('success');
        this.openShop();
        break;
      }
      case 'travel': {
        const loc = this.game.locationDef(d.id!);
        if (!loc) break;
        if (this.state.travel.actionsLeft <= 0) { this.toast('Hôm nay bạn đã đi nhiều rồi.', 'bad'); break; }
        if (this.state.player.day < loc.unlockDay) { this.toast('Chưa thể đến nơi này.', 'bad'); break; }
        this.state.travel.location = loc.id;
        this.state.travel.actionsLeft -= 1;
        this.closeModal();
        this.game.refreshScene();
        this.toast(`Đến ${loc.name}.`, 'info');
        renderLocationPanel(this, loc.id);
        break;
      }
      case 'location-action': this.doLocationAction(d.id!); break;
      case 'go-shop': this.state.travel.location = 'shop'; this.closeModal(); this.game.refreshScene(); this.refresh(); break;
      case 'shop-tier': {
        const r = this.world.upgradeShopTier();
        this.toast(r.msg, r.ok ? 'good' : 'bad');
        if (r.ok) { audio.play('success'); this.game.refreshScene(); }
        this.openShop();
        break;
      }
      case 'open-shop': this.game.openShop(); break;
      case 'end-day': this.game.requestEndDay(); break;
      case 'pause': this.state.time.paused = !this.state.time.paused; this.refresh(); break;
      case 'speed': this.state.time.speed = (this.state.time.speed === 1 ? 2 : this.state.time.speed === 2 ? 3 : 1); this.refresh(); break;
      case 'trade-offer': this.doOffer(); break;
      case 'trade-hold': {
        const c = this.world.activeCustomer();
        if (c) c.patience = Math.max(0.2, c.patience - 1);
        this.doOffer(0.1);
        break;
      }
      case 'trade-cut': {
        this.trade.price = Math.max(1, Math.round(this.trade.price * (1 + Number(d.delta))));
        this.doOffer(0.08);
        break;
      }
      case 'trade-bundle': this.doBundle(); break;
      case 'trade-counter': this.doAcceptCounter(); break;
      case 'trade-gift': this.doGift(); break;
      case 'trade-credit': this.doCredit(); break;
      case 'trade-barter': this.doBarter(); break;
      case 'trade-refuse': this.doRefuse(); break;
      case 'trade-substitute': this.doSubstitute(Number(d.shelf)); break;
      case 'event-choice': this.chooseEvent(d.choice!); break;
      case 'report-continue': this.closeModal(); this.game.afterReport(); break;
      case 'chapter-continue': this.closeModal(); this.game.afterChapter(); break;
      case 'ending-continue': this.closeModal(); this.game.toTitle(); break;
      case 'setting': this.toggleSetting(d.key!); break;
      case 'wipe-saves':
        this.confirm('Xóa toàn bộ ô lưu và tiến trình hiện tại? Không thể khôi phục.', () => {
          for (let i = 0; i < 4; i++) this.game.deleteSlot(i);
          this.closeModal();
          this.game.toTitle();
          this.toast('Đã xóa toàn bộ dữ liệu.', 'info');
        }, 'Xóa hết');
        break;
      case 'help': this.openHelp(); break;
      case 'trade-next': this.game.nextCustomer(); break;
      case 'dismiss': this.game.dismissCustomer(); break;
      case 'open-family': this.openFamily(); break;
      case 'nb-talk': this.talkTo(d.id!); break;
      case 'nb-gift': this.giveGiftTo(d.id!); break;
      default: break;
    }
  }

  toggleSetting(key: string) {
    const st = this.state.settings;
    if (key === 'autosave') st.autosave = !st.autosave;
    if (key === 'hints') { st.hints = !st.hints; this.hintVisible = st.hints; }
    if (key === 'reduceMotion') st.reduceMotion = !st.reduceMotion;
    this.openSettings();
  }

  shopLevel(): number { return this.state.shopLevel ?? 1; }

  // ------------------------------------------------------------- rendering --
  refresh() {
    this.renderHUD();
    this.renderDock();
    this.renderTrade();
    this.renderHint();
  }

  tick() {
    const s = this.state;
    const timeEl = document.getElementById('hud-time');
    if (timeEl) {
      timeEl.textContent = s.time.phase === 'open' ? `${clock(s.time.hour)} · ${timePhase(s.time.hour)}` : phaseLabel(s.time.phase);
    }
    const frozen = s.time.paused || this.modalOpen || this.activePanel !== null;
    const speedEl = document.getElementById('hud-speed');
    if (speedEl) speedEl.textContent = frozen ? '❚❚' : `${s.time.speed}×`;
    const overlay = document.getElementById('pause-overlay');
    if (overlay) overlay.style.display = s.time.paused && !this.modalOpen && !this.activePanel ? 'flex' : 'none';
    const timeEl2 = document.getElementById('hud-time');
    if (timeEl2) timeEl2.classList.toggle('closing', s.time.phase === 'open' && s.time.hour >= 16);
    const c = this.world.activeCustomer();
    const bar = document.getElementById('patience-fill');
    if (bar && c) {
      const p = Math.max(0, c.patience / c.maxPatience);
      bar.style.width = `${p * 100}%`;
      bar.style.background = p > 0.5 ? 'linear-gradient(90deg,#8aa357,#c9d88a)' : p > 0.25 ? 'linear-gradient(90deg,#c47a22,#e0a441)' : 'linear-gradient(90deg,#a83226,#c4513f)';
    }
    if (c && c.uid !== this.lastCustomerUid) this.renderTrade();
  }

  renderHUD() {
    const s = this.state;
    const el = document.getElementById('hud');
    if (!el) return;
    const dueDebts = s.debts.filter((d) => d.status === 'active' && d.dueDay <= s.player.day).length;
    el.innerHTML = `
      <div class="plaque"><img src="/assets/ui/icons/clock.png"><span>${dateLabel(s)}</span><span class="sub">· ${weatherLabel(s.weather.today)}</span></div>
      <div class="plaque" id="hud-time">${s.time.phase === 'open' ? `${clock(s.time.hour)} · ${timePhase(s.time.hour)}` : phaseLabel(s.time.phase)}</div>
      <div class="phase" id="hud-phase"><b>${phaseLabel(s.time.phase)}</b></div>
      <div class="spacer"></div>
      ${dueDebts > 0 ? `<div class="plaque" style="color:#e8a090"><img src="/assets/ui/icons/icon_warning.png">${dueDebts} nợ đến hạn</div>` : ''}
      <div class="plaque money"><img src="/assets/ui/icons/currency.png">${fmtMoney(s.player.money)}</div>
      <div class="plaque rep" title="Uy tín cửa hàng"><img src="/assets/ui/icons/star.png">${Math.round(s.player.reputation)}</div>
      <div class="plaque family" title="Lương thực gia đình"><img src="/assets/ui/icons/category_food.png">${Math.floor(s.player.familyPantry)}</div>
      <div class="phase" style="cursor:pointer" data-action="speed" id="hud-speed">${s.time.paused ? '❚❚' : `${s.time.speed}×`}</div>
      <div class="phase" style="cursor:pointer" data-action="pause">${s.time.paused ? 'Tiếp tục' : 'Tạm dừng'}</div>
      ${s.time.phase === 'morning' ? '<button class="btn small primary" data-action="open-shop">Mở cửa</button>' : ''}
      ${s.time.phase === 'open' ? '<button class="btn small" data-action="end-day">Đóng cửa</button>' : ''}
    `;
  }

  renderDock() {
    const s = this.state;
    const el = document.getElementById('dock');
    if (!el) return;
    const activeQuests = Object.values(s.quests).filter((q) => q.status === 'active').length;
    const due = s.debts.filter((d) => d.status === 'active' && d.dueDay <= s.player.day).length;
    const deliveries = s.deliveries.filter((d) => d.status === 'transit').length;
    const btn = (panel: string, icon: string, tip: string, badge = 0) => `
      <div class="icon-btn" data-action="open-panel" data-panel="${panel}" title="${tip}">
        <img src="/assets/ui/icons/${icon}.png" alt="${tip}">
        ${badge ? `<span class="badge">${badge}</span>` : ''}
        <span class="tip">${tip}</span>
      </div>`;
    el.innerHTML = `
      ${btn('inventory', 'tab_inventory', 'Kho hàng & kệ')}
      ${btn('prices', 'tab_ledger', 'Bảng giá')}
      ${btn('suppliers', 'tab_suppliers', 'Nhà cung cấp', deliveries)}
      ${btn('debts', 'icon_debt', 'Sổ nợ', due)}
      ${btn('quests', 'tab_quests', 'Nhiệm vụ', activeQuests)}
      ${btn('journal', 'tab_journal', 'Nhật ký')}
      ${btn('shop', 'tab_shop', 'Cửa hàng & nâng cấp')}
      ${btn('map', 'tab_map', 'Bản đồ')}
      ${btn('family', 'heart', 'Gia đình')}
      ${btn('save', 'tab_save', 'Lưu game')}
      ${btn('settings', 'tab_settings', 'Cài đặt')}
      ${btn('help', 'tab_help', 'Trợ giúp')}
    `;
  }

  renderHint() {
    const el = document.getElementById('hint');
    if (!el) return;
    const s = this.state;
    if (!this.hintVisible || s.time.phase === 'ended' || this.game.screen === 'title') { el.style.display = 'none'; return; }
    el.style.display = 'block';
    let text = '';
    if (s.time.phase === 'morning') text = '<b>Buổi sáng.</b> Sắp xếp kệ, chỉnh giá, nhập hàng rồi <b>Mở cửa</b>. Mỗi lần đi tới nơi khác tốn 1 lượt.';
    else if (s.time.phase === 'open') {
      const c = this.world.activeCustomer();
      text = c ? '<b>Khách đang chờ.</b> Chọn số lượng, ra giá rồi chào khách. Giá quá cao sẽ bị mặc cả.' : '<b>Cửa hàng đang mở.</b> Khách sẽ ghé theo thời gian. Bạn có thể tạm dừng để sắp kho.';
    } else if (s.time.phase === 'report') text = '<b>Chốt sổ.</b> Xem báo cáo ngày và những gì đã xảy ra.';
    else if (s.time.phase === 'evening') text = '<b>Buổi tối.</b> Những quyết định của bạn sẽ được ghi nhớ.';
    el.innerHTML = text;
  }

  // ---------------------------------------------------------------- trade --
  renderTrade() {
    const el = document.getElementById('trade-root');
    if (!el) return;
    const s = this.state;
    const c = this.world.activeCustomer();
    if (!c || s.time.phase !== 'open') { el.innerHTML = ''; this.lastCustomerUid = null; return; }
    if (c.uid !== this.lastCustomerUid) {
      this.trade = { shelfId: null, qty: 1, price: 0, counter: null, message: '', tone: 'info', mode: 'offer', customerUid: c.uid };
      this.lastCustomerUid = c.uid;
    }
    const it = ITEMS[c.itemId];
    const npc = NPCS[c.npcId];
    const st = this.state.npcs[c.npcId];
    const shelf = this.state.shelves.find((sh) => sh.itemId === c.itemId && sh.qty > 0);
    const hasShelf = !!shelf;
    if (!hasShelf && this.trade.shelfId === null) {
      this.trade.mode = 'substitute';
    } else if (shelf && this.trade.shelfId === null) {
      this.trade.shelfId = shelf.id;
      this.trade.qty = Math.min(c.qty, shelf.qty);
      this.trade.price = this.world.shelfPrice(shelf);
    }
    const activeShelf = this.state.shelves.find((sh) => sh.id === this.trade.shelfId && sh.itemId && sh.qty > 0);
    const fair = activeShelf?.itemId ? this.world.fairSell(activeShelf.itemId) : this.world.fairSell(c.itemId);
    const total = this.trade.price * this.trade.qty;
    const moodIcon = c.mood === 'happy' ? 'status_happy' : c.mood === 'sad' ? 'status_sad' : c.mood === 'angry' ? 'status_angry' : 'status_neutral';
    el.innerHTML = `
      <div class="trade panel-wood frame-inner">
        <div class="cust-head">
          <div class="portrait" style="background-image:url('${c.portrait}')"></div>
          <div class="who">
            <div class="nm">${esc(c.name)}</div>
            <div class="rl">${esc(c.role)} · ${relationshipLabel(st?.trust ?? 0)}</div>
            <div style="margin-top:4px"><img src="/assets/ui/icons/${moodIcon}.png" style="width:22px;height:22px;vertical-align:middle"> <span class="small muted">Ngân sách: <b class="gold">${fmtMoney(c.budget)}</b> đồng</span></div>
          </div>
        </div>
        <div class="bubble">"${esc(c.line)}"</div>
        <div class="patience">Kiên nhẫn <div class="bar"><i id="patience-fill" style="width:${Math.max(0, c.patience / c.maxPatience) * 100}%"></i></div></div>
        ${this.trade.message ? `<div class="pill ${this.trade.tone === 'good' ? 'good' : this.trade.tone === 'bad' ? 'bad' : 'neutral'}" style="margin-top:6px;display:block;text-align:center;padding:6px">${esc(this.trade.message)}</div>` : ''}
        <div class="row"><label>Cần</label><div style="flex:1"><b>${esc(it?.name ?? c.itemId)}</b> × ${c.qty} <span class="dim small">(giá thị trường ${fmtMoney(this.world.fairSell(c.itemId))})</span></div></div>
        ${hasShelf ? `
          <div class="row"><label>Số lượng</label><input type="number" min="1" max="${Math.min(activeShelf?.qty ?? 1, 99)}" value="${this.trade.qty}" data-field="trade-qty"><span class="dim small">/ ${activeShelf?.qty ?? 0}</span></div>
          <div class="row"><label>Giá bán</label><input type="number" min="1" value="${this.trade.price}" data-field="trade-price"><span class="dim small">đồng</span></div>
          <div class="price-big">${fmtMoney(total)} đồng</div>
          <div class="small dim" style="text-align:center">Giá hợp lý: ${fmtMoney(Math.round(fair * (QUALITY_MULT[activeShelf?.quality ?? 1] ?? 1)))} đồng</div>
          ${(() => {
            const unit = activeShelf?.cost ?? 0;
            const profit = total - unit * this.trade.qty;
            return `<div class="small ${profit >= 0 ? 'dim' : ''}" style="text-align:center;${profit < 0 ? 'color:#e08a7a' : ''}">Giá vốn ${fmtMoney(unit * this.trade.qty)} đồng · ${profit >= 0 ? 'Lãi' : 'Lỗ'} ~${fmtMoney(Math.abs(profit))} đồng</div>`;
          })()}
          <div class="actions">
            <button class="btn small" data-action="markup-quick" data-delta="-0.05">-5%</button>
            <button class="btn small" data-action="markup-quick" data-delta="0.05">+5%</button>
            <button class="btn small primary" data-action="trade-offer" style="grid-column:span 2">Chào giá</button>
            ${this.trade.counter ? `<button class="btn small primary" data-action="trade-counter" style="grid-column:span 2">Nhận lời ${fmtMoney(this.trade.counter)}/đơn vị</button>` : ''}
            <button class="btn small" data-action="trade-hold" title="Giữ nguyên giá, khách xem là bạn tự tin">Giữ giá</button>
            <button class="btn small" data-action="trade-cut" data-delta="-0.05">Giảm 5%</button>
            <button class="btn small" data-action="trade-cut" data-delta="-0.15">Giảm 15%</button>
            <button class="btn small" data-action="trade-bundle" ${activeShelf && activeShelf.qty > this.trade.qty ? '' : 'disabled'}>Bán kèm quà</button>
            <button class="btn small" data-action="trade-gift" ${activeShelf && activeShelf.qty > 1 ? '' : 'disabled'}>Tặng thêm</button>
            <button class="btn small" data-action="trade-credit" ${(st?.trust ?? 0) >= 25 ? '' : 'disabled'}>Bán chịu</button>
            <button class="btn small" data-action="trade-barter" ${npc && npc.barter.length ? '' : 'disabled'}>Đổi hàng</button>
            <button class="btn small danger" data-action="trade-refuse">Từ chối</button>
          </div>
        ` : `
          <div class="pill bad" style="display:block;text-align:center;padding:8px;margin:8px 0">Không có hàng khách cần trên kệ.</div>
          <div class="small muted" style="margin-bottom:6px">Gợi ý món khác:</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${this.state.shelves.filter((sh) => sh.itemId && sh.qty > 0).slice(0, 6).map((sh) => `
              <button class="btn small" data-action="trade-substitute" data-shelf="${sh.id}">${esc(ITEMS[sh.itemId!]?.name ?? '')} ×${sh.qty}</button>
            `).join('') || '<span class="dim small">Kệ đang trống.</span>'}
          </div>
          <div class="actions" style="margin-top:8px">
            <button class="btn small danger" data-action="trade-refuse">Từ chối</button>
          </div>
        `}
        <div class="hint">${this.state.time.paused ? 'Đang tạm dừng' : 'Giá quá cao sẽ mất kiên nhẫn của khách.'}</div>
      </div>
    `;
  }

  private tradeShelf(): Shelf | null {
    const c = this.world.activeCustomer();
    if (!c) return null;
    if (this.trade.shelfId !== null) {
      const sh = this.state.shelves.find((s) => s.id === this.trade.shelfId && s.qty > 0);
      if (sh) return sh;
    }
    return this.state.shelves.find((s) => s.itemId === c.itemId && s.qty > 0) ?? null;
  }

  updateTradeTotals() {
    const el = document.querySelector('.trade .price-big') as HTMLElement | null;
    if (el) el.textContent = `${fmtMoney(this.trade.price * this.trade.qty)} đồng`;
  }

  private doBundle() {
    const sh = this.tradeShelf();
    if (!sh) return;
    if (sh.qty <= this.trade.qty) { this.toast('Không đủ hàng để bán kèm.', 'bad'); return; }
    this.doOffer(0.26, true);
  }

  private doOffer(bonus = 0, bundle = false) {
    const c = this.world.activeCustomer();
    const sh = this.tradeShelf();
    if (!c || !sh) return;
    this.trade.qty = Math.max(1, Math.min(this.trade.qty, sh.qty));
    this.trade.price = Math.max(1, Math.round(this.trade.price));
    if (bundle && sh.qty <= this.trade.qty) { this.toast('Không đủ hàng để bán kèm.', 'bad'); return; }
    const r = this.world.evaluateOffer(c, this.trade.price, this.trade.qty, bonus);
    if (r.accepted) {
      if (bundle) {
        this.world.takeFromShelf(sh.id, 1);
        this.state.day.gifts += 1;
        this.state.day.cost += sh.cost ?? 0;
        this.state.player.communityTrust = Math.min(100, this.state.player.communityTrust + 1);
      }
      this.world.acceptSale(c, this.trade.price, this.trade.qty, sh.id);
      this.trade.message = `${c.name} đồng ý. Bạn thu ${fmtMoney(this.trade.price * this.trade.qty)} đồng.`;
      this.trade.tone = 'good';
      this.trade.counter = null;
      this.game.scene.addFloat(`+${fmtMoney(this.trade.price * this.trade.qty)}`, 640, 500);
      this.renderTrade();
      setTimeout(() => this.game.nextCustomer(), 900);
    } else {
      c.patience -= 1;
      c.mood = c.patience <= 1 ? 'angry' : 'sad';
      this.trade.counter = r.counter ?? null;
      this.trade.message = `${r.reason} Khách trả giá ${fmtMoney(r.counter ?? 0)} đồng.`;
      this.trade.tone = 'bad';
      audio.play('error');
      if (c.patience <= 0) {
        this.world.dismissActive('left');
        this.toast(`${c.name} bỏ đi.`, 'bad');
        setTimeout(() => this.game.nextCustomer(), 500);
      }
      this.renderTrade();
    }
  }

  private doAcceptCounter() {
    const c = this.world.activeCustomer();
    const sh = this.tradeShelf();
    if (!c || !sh || !this.trade.counter) return;
    const price = this.trade.counter;
    this.world.acceptSale(c, price, this.trade.qty, sh.id);
    this.trade.message = `${c.name} mua với giá ${fmtMoney(price)} đồng.`;
    this.trade.tone = 'good';
    this.trade.counter = null;
    this.renderTrade();
    setTimeout(() => this.game.nextCustomer(), 900);
  }

  private doGift() {
    const c = this.world.activeCustomer();
    const sh = this.tradeShelf();
    if (!c || !sh) return;
    if (sh.qty < 2) { this.toast('Không đủ hàng để tặng.', 'bad'); return; }
    this.world.giftTo(c, sh.itemId!, 1, sh.id);
    this.trade.message = `Bạn tặng thêm một ${ITEMS[sh.itemId!]?.name}. ${c.name} cảm ơn.`;
    this.trade.tone = 'good';
    this.renderTrade();
  }

  private doCredit() {
    const c = this.world.activeCustomer();
    const sh = this.tradeShelf();
    if (!c || !sh) return;
    this.trade.qty = Math.max(1, Math.min(this.trade.qty, sh.qty));
    const price = this.trade.price || this.world.shelfPrice(sh);
    this.world.makeCreditSale(c, price, this.trade.qty, sh.id);
    this.trade.message = `${c.name} mang hàng đi. Bạn ghi nợ ${fmtMoney(price * this.trade.qty)} đồng.`;
    this.trade.tone = 'good';
    this.renderTrade();
    setTimeout(() => this.game.nextCustomer(), 900);
  }

  private doBarter() {
    const c = this.world.activeCustomer();
    const sh = this.tradeShelf();
    if (!c || !sh) return;
    const npc = NPCS[c.npcId];
    const barter = npc?.barter.find((b) => b.want === c.itemId);
    if (!barter) { this.toast('Khách không có gì để đổi.', 'bad'); return; }
    const giveValue = this.world.fairBuy(barter.give) * (barter.ratio || 1);
    const getValue = this.world.fairSell(c.itemId) * this.trade.qty;
    this.world.takeFromShelf(sh.id, this.trade.qty);
    this.world.addItem(barter.give, Math.max(1, Math.round(giveValue / Math.max(1, this.world.fairBuy(barter.give)))), 1, this.world.fairBuy(barter.give));
    const st = this.state.npcs[c.npcId];
    if (st) { st.trust = Math.min(100, st.trust + 10); st.purchases += 1; }
    this.trade.message = `Đổi ${this.trade.qty} ${ITEMS[c.itemId]?.name} lấy ${ITEMS[barter.give]?.name}. Giá trị: ${fmtMoney(getValue)} ↔ ${fmtMoney(giveValue)}.`;
    this.trade.tone = 'good';
    this.state.day.customersServed += 1;
    this.renderTrade();
    setTimeout(() => this.game.nextCustomer(), 1000);
  }

  private doRefuse() {
    const c = this.world.activeCustomer();
    if (!c) return;
    this.world.dismissActive('refused');
    this.toast(`${c.name} ra về.`, 'bad');
    this.renderTrade();
    setTimeout(() => this.game.nextCustomer(), 400);
  }

  private doSubstitute(shelfId: number) {
    const c = this.world.activeCustomer();
    const sh = this.state.shelves.find((s) => s.id === shelfId);
    if (!c || !sh || !sh.itemId) return;
    this.trade.shelfId = shelfId;
    this.trade.qty = 1;
    this.trade.price = this.world.shelfPrice(sh);
    this.trade.mode = 'substitute';
    this.trade.message = `Bạn đề nghị ${ITEMS[sh.itemId].name} thay thế. Giá ${fmtMoney(this.trade.price)} đồng.`;
    this.trade.tone = 'info';
    this.renderTrade();
  }

  // --------------------------------------------------------------- modals --
  openModal(html: string, cls = '', staticBackdrop = false) {
    this.modalOpen = true;
    const root = document.getElementById('modal-root')!;
    // Re-rendering a panel (filter chip, markup +, sort...) must not throw the
    // player back to the top of a long list: carry the scroll position over.
    const prevBody = root.querySelector('.modal .body') as HTMLElement | null;
    const keepScroll = prevBody ? prevBody.scrollTop : 0;
    root.innerHTML = `<div class="backdrop" data-action="backdrop" ${staticBackdrop ? 'data-static="1"' : ''}>
      <div class="modal panel-wood frame-inner ${cls}" data-action="modal-surface">${html}</div>
    </div>`;
    root.style.display = 'block';
    if (keepScroll > 0) {
      const body = root.querySelector('.modal .body') as HTMLElement | null;
      if (body) body.scrollTop = keepScroll;
    }
  }

  closeModal() {
    const root = document.getElementById('modal-root');
    if (root) { root.innerHTML = ''; root.style.display = 'none'; }
    this.activePanel = null;
    this.modalOpen = false;
    // The title screen is rendered into the same container as panels: closing a
    // panel from the title must bring the title back, not leave a black screen.
    if (this.game.screen === 'title') { this.showTitle(); return; }
    this.refresh();
  }

  panelHead(title: string, sub = ''): string {
    return `<div class="head">
      <h2>${title}</h2>
      ${sub ? `<div class="small muted">${sub}</div>` : ''}
      <img src="/assets/ui/icons/action_close.png" class="close" data-action="close-modal" alt="Đóng">
    </div>`;
  }

  // ------------------------------------------------------------- panels ----
  openPanel(name: string) {
    this.activePanel = name;
    switch (name) {
      case 'inventory': return this.openInventory();
      case 'prices': return this.openPrices();
      case 'suppliers': return this.openSuppliers();
      case 'debts': return this.openDebts();
      case 'quests': return this.openQuests();
      case 'journal': return this.openJournal();
      case 'shop': return this.openShop();
      case 'map': return this.openMap();
      case 'save': return this.openSave();
      case 'settings': return this.openSettings();
      case 'family': return this.openFamily();
      case 'help': return this.openHelp();
      default: return;
    }
  }

  refreshPanel() {
    if (this.activePanel) this.openPanel(this.activePanel);
  }

  openInventory() { this.activePanel = 'inventory'; renderInventoryPanel(this); }
  openPrices() { this.activePanel = 'prices'; renderPricesPanel(this); }
  openSuppliers() { this.activePanel = 'suppliers'; renderSuppliersPanel(this); }
  openDebts() { this.activePanel = 'debts'; renderDebtsPanel(this); }
  openQuests() { this.activePanel = 'quests'; renderQuestsPanel(this); }
  openJournal() { this.activePanel = 'journal'; renderJournalPanel(this); }
  openShop() { this.activePanel = 'shop'; renderShopPanel(this); }
  openMap() { this.activePanel = 'map'; renderMapPanel(this); }
  openSave() { this.activePanel = 'save'; renderSavePanel(this); }
  openSettings() { this.activePanel = 'settings'; renderSettingsPanel(this); }
  openFamily() { this.activePanel = 'family'; renderFamilyPanel(this); }
  openHelp() { this.activePanel = 'help'; renderHelpPanel(this); }
  openShelfPicker(uid: number) { renderShelfPicker(this, uid); }
  openStockPicker(shelfId: number) { renderStockPicker(this, shelfId); }

  private doLocationAction(id: string) {
    switch (id) {
      case 'open': this.closeModal(); this.game.openShop(); break;
      case 'market_buy': renderMarketPanel(this, 'market'); break;
      case 'market_talk': this.world.emit({ type: 'toast', text: 'Người ta nói gạo sẽ khan hơn vào cuối tuần.' }); this.closeModal(); break;
      case 'river_buy': renderMarketPanel(this, 'anh_vuong'); break;
      case 'river_talk': this.world.emit({ type: 'toast', text: 'Bến sông vẫn đông, nhưng cá ngày càng ít.' }); this.closeModal(); break;
      case 'warehouse_storage': this.openInventory(); break;
      case 'res_visit': renderNeighbourPanel(this); break;
      case 'res_help': this.helpNeighbour(); break;
      case 'tea_talk': this.world.emit({ type: 'toast', text: 'Quán nước rôm rả chuyện giá gạo.' }); this.closeModal(); break;
      case 'tea_buy': renderMarketPanel(this, 'chi_sen'); break;
      case 'sup_nam': renderMarketPanel(this, 'ong_nam'); break;
      case 'sup_hung': renderMarketPanel(this, 'bac_hung'); break;
      case 'staging_talk': this.world.emit({ type: 'toast', text: 'Đường lên tỉnh đang lầy, cước phí tăng.' }); this.closeModal(); break;
      default: this.closeModal();
    }
  }

  private talkTo(npcId: string) {
    const npc = NPCS[npcId];
    const st = this.state.npcs[npcId];
    if (!npc || !st) return;
    if (this.state.travel.actionsLeft <= 0) { this.toast('Hôm nay bạn đã đi nhiều rồi.', 'bad'); return; }
    this.state.travel.actionsLeft -= 1;
    st.trust = Math.min(100, st.trust + 4);
    st.met = true;
    this.state.player.communityTrust = Math.min(100, this.state.player.communityTrust + 1);
    const lines = [
      `${npc.name}: "${npc.bio}"`,
      `${npc.name} hỏi thăm chuyện buôn bán của bạn.`,
      `${npc.name} kể vài chuyện trong xóm.`,
      `${npc.name} nói giá ${ITEMS[npc.needs[0]?.item]?.name ?? 'gạo'} đang thay đổi.`,
    ];
    this.toast(lines[Math.floor(Math.random() * lines.length)], 'info');
    this.state.journal.push({ day: this.state.player.day, text: `Nói chuyện với ${npc.name}.`, kind: 'event' });
    this.closeModal();
  }

  private giveGiftTo(npcId: string) {
    const npc = NPCS[npcId];
    const st = this.state.npcs[npcId];
    if (!npc || !st) return;
    if (this.state.player.money < 5) { this.toast('Không đủ tiền để mua quà.', 'bad'); return; }
    this.state.player.money -= 5;
    st.trust = Math.min(100, st.trust + 9);
    this.state.player.communityTrust = Math.min(100, this.state.player.communityTrust + 3);
    this.state.day.helped += 1;
    this.state.totals.helped += 1;
    this.state.journal.push({ day: this.state.player.day, text: `Tặng quà cho ${npc.name}.`, kind: 'event' });
    this.toast(`${npc.name} nhận quà, mỉm cười.`, 'good');
    audio.play('heart');
    this.closeModal();
  }

  private helpNeighbour() {
    const s = this.state;
    if (s.player.money < 10) { this.toast('Không đủ tiền để giúp.', 'bad'); return; }
    s.player.money -= 10;
    s.player.communityTrust = Math.min(100, s.player.communityTrust + 6);
    s.player.reputation = Math.min(100, s.player.reputation + 2);
    s.journal.push({ day: s.player.day, text: 'Bạn giúp một gia đình trong xóm.', kind: 'event' });
    this.toast('Bạn giúp đỡ hàng xóm. Cộng đồng ghi nhớ.', 'good');
    audio.play('heart');
    this.closeModal();
  }

  confirm(message: string, onYes: () => void, yesLabel = 'Đồng ý') {
    this.confirmCb = onYes;
    this.openModal(`
      <div class="confirm-box">
        <h2>Xác nhận</h2>
        <p>${esc(message)}</p>
        <div class="confirm-actions">
          <button class="btn" data-action="confirm-no">Hủy</button>
          <button class="btn primary" data-action="confirm-yes">${esc(yesLabel)}</button>
        </div>
      </div>
    `, 'small-modal', true);
  }

  // ------------------------------------------------------------- toasts ----
  toast(text: string, tone: 'good' | 'bad' | 'info' = 'info', icon?: string) {
    const root = document.getElementById('toasts');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast';
    const ic = icon ?? (tone === 'good' ? '/assets/ui/icons/icon_check.png' : tone === 'bad' ? '/assets/ui/icons/icon_warning.png' : '/assets/ui/icons/icon_info.png');
    el.innerHTML = `<img src="${ic}"><span>${esc(text)}</span>`;
    root.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 2600);
  }

  float(text: string, x: number, y: number, color = '#f0c86a') {
    this.game.scene.addFloat(text, x, y, color);
  }

  // ------------------------------------------------------------ screens ----
  showTitle() {
    const root = document.getElementById('modal-root')!;
    this.activePanel = null;
    this.modalOpen = false;
    root.style.display = 'block';
    const auto = this.game.peekSlot(0);
    root.innerHTML = `<div class="title-screen">
      <div class="title-logo">
        <div class="over">Việt Nam · 1945</div>
        <h1>Cửa Hàng<br><span style="font-size:52px;letter-spacing:.18em">1945</span></h1>
        <div class="sub">Một ngày ở thị trấn An Bình</div>
      </div>
      <div class="title-menu">
        ${auto
          ? `<button class="btn big primary" data-action="continue">Tiếp tục · Ngày ${auto.player.day}</button>
             <button class="btn big" data-action="new-game-screen">Chơi mới</button>`
          : `<button class="btn big primary" data-action="new-game-screen">Chơi mới</button>
             <button class="btn big" data-action="continue" disabled title="Chưa có dữ liệu lưu — chơi mới rồi game sẽ tự lưu">Tiếp tục</button>`}
        <button class="btn" data-action="open-panel" data-panel="save">Lưu / Tải</button>
        <button class="btn" data-action="open-panel" data-panel="settings">Cài đặt</button>
      </div>
      <div class="title-foot">MỘT TRÒ CHƠI MÔ PHỎNG CỬA HÀNG · LỊCH SỬ VIỆT NAM 1945 · bản ${BUILD}</div>
    </div>`;
    this.renderDock();
    this.renderHUD();
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'none';
    const dock = document.getElementById('dock');
    if (dock) dock.style.display = 'none';
    const hint = document.getElementById('hint');
    if (hint) hint.style.display = 'none';
  }

  hideTitleChrome() {
    const hud = document.getElementById('hud');
    if (hud) hud.style.display = 'flex';
    const dock = document.getElementById('dock');
    if (dock) dock.style.display = 'flex';
    const hint = document.getElementById('hint');
    if (hint) hint.style.display = 'block';
  }

  showNewGame() {
    this.modalOpen = true;
    let difficulty: Difficulty = 'normal';
    let armed = false; // second click confirms overwriting an existing run
    const root = document.getElementById('modal-root')!;
    const render = () => {
      root.style.display = 'block';
      const existing = this.game.peekSlot(0);
      const confirming = !!existing && armed; // armed by the first click
      root.innerHTML = `<div class="backdrop" data-action="backdrop" data-static="1">
        <div class="modal panel-wood frame-inner" style="width:620px" data-action="modal-surface">
          <div class="head"><h2>Bắt đầu câu chuyện</h2></div>
          <div class="body">
            <div class="field"><label>Tên của bạn</label><input type="text" id="player-name" placeholder="Người chủ tiệm" maxlength="24"></div>
            <div class="field"><label>Chế độ</label></div>
            <div class="diff-grid">
              ${(['story', 'normal', 'hard'] as Difficulty[]).map((d) => `
                <div class="diff-card ${difficulty === d ? 'active' : ''}" data-diff="${d}">
                  <div class="nm">${DIFFICULTY[d].label}</div>
                  <div class="ds">${DIFFICULTY[d].desc}</div>
                </div>`).join('')}
            </div>
            <div class="small dim" style="line-height:1.6">Tháng 8 năm 1945. Bạn thừa kế một tiệm tạp hóa nhỏ ở thị trấn An Bình. Hàng khan hiếm, người dân thiếu tiền, và mỗi quyết định của bạn đều để lại dấu vết.</div>
            ${existing ? `<div class="warn-box">⚠ Đang có tiến trình <b>ngày ${existing.player.day}</b>. Bắt đầu mới sẽ ghi đè lên tiến trình đó${confirming ? ' — bấm <b>Bắt đầu (ghi đè)</b> để xác nhận.' : '.'}</div>` : ''}
          </div>
          <div class="foot">
            <button class="btn" data-action="back-title">Quay lại</button>
            <button class="btn primary" id="start-btn">${confirming ? 'Bắt đầu (ghi đè)' : 'Bắt đầu'}</button>
          </div>
        </div>
      </div>`;
      root.querySelectorAll('.diff-card').forEach((el) => {
        el.addEventListener('click', () => {
          difficulty = (el as HTMLElement).dataset.diff as Difficulty;
          render();
        });
      });
      const nameInput = root.querySelector('#player-name') as HTMLInputElement | null;
      if (nameInput) nameInput.value = this.game.peekSlot(0)?.player.name ?? nameInput.value;
      root.querySelector('#start-btn')?.addEventListener('click', () => {
        const name = (root.querySelector('#player-name') as HTMLInputElement)?.value.trim() || 'Người chủ tiệm';
        // a run already exists: the first click only arms the button, so nobody
        // loses 20 days of progress by mis-clicking "Chơi mới"
        if (this.game.peekSlot(0) && !armed) { armed = true; render(); return; }
        this.game.startNew(name, difficulty);
      });
    };
    render();
  }

  showChapter(n: number) {
    const ch = CHAPTERS.find((c) => c.n === n);
    if (!ch) return;
    this.modalOpen = true;
    const root = document.getElementById('modal-root')!;
    root.style.display = 'block';
    root.innerHTML = `<div class="backdrop" data-action="backdrop" data-static="1">
      <div class="modal panel-wood frame-inner" style="width:680px;text-align:center" data-action="modal-surface">
        <div style="padding:10px 6px">
          <div class="small" style="letter-spacing:.4em;color:var(--gold-2);text-transform:uppercase">Chương ${ch.n}</div>
          <h2 style="font-size:40px;margin:6px 0 14px;color:#f6e8c4">${esc(ch.name)}</h2>
          <div class="divider" style="width:260px;margin:0 auto 14px"></div>
          <p style="font-family:'EB Garamond',serif;font-size:18px;line-height:1.7;color:#e0d0ac;margin:0">${esc(ch.text)}</p>
          <div style="margin-top:22px"><button class="btn primary big" data-action="chapter-continue">Tiếp tục</button></div>
        </div>
      </div>
    </div>`;
  }

  showReport() {
    this.modalOpen = true;
    const r = this.state.lastReport ?? this.state.day;
    const root = document.getElementById('modal-root')!;
    root.style.display = 'block';
    const feedback = (r.feedback ?? []).map((f) => `<div class="small" style="color:#6a4a2e">· ${esc(f)}</div>`).join('');
    root.innerHTML = `<div class="backdrop" data-action="backdrop" data-static="1">
      <div class="modal panel-paper report" style="width:760px" data-action="modal-surface">
        <div style="padding:14px 18px">
          <div style="text-align:center;border-bottom:2px solid #8a6a44;padding-bottom:8px;margin-bottom:10px">
            <div class="small" style="letter-spacing:.3em;color:#8a5a2a;text-transform:uppercase">Sổ khóa sổ</div>
            <h2 style="font-size:34px;margin:2px 0;color:#3a2414">Ngày ${this.state.player.day} · Tháng ${this.state.calendar.month}</h2>
            <div class="small" style="color:#8a6a44">Thị trấn An Bình · ${weatherLabel(this.state.weather.today)}</div>
          </div>
          <div class="cols">
            <div>
              <div class="sec"><h3>Kinh doanh</h3>
                <div class="line"><span>Doanh thu</span><b class="pos">${fmtMoney(r.revenue)} đ</b></div>
                <div class="line"><span>Giá vốn hàng bán</span><b>− ${fmtMoney(r.cost)} đ</b></div>
                <div class="line"><span>Tiền mua hàng hôm nay</span><b>− ${fmtMoney(r.purchases ?? 0)} đ</b></div>
                <div class="line"><span>Khách đã phục vụ</span><b>${r.customersServed}</b></div>
                <div class="line"><span>Khách bỏ đi</span><b>${r.customersLost}</b></div>
                <div class="line"><span>Món đã bán</span><b>${r.itemsSold}</b></div>
              </div>
              <div class="total"><span>Lãi gộp</span><span class="${r.profit >= 0 ? 'pos' : 'neg'}">${r.profit >= 0 ? '+' : ''}${fmtMoney(r.profit)} đ</span></div>
              <div class="line"><span>Tiền mặt cuối ngày</span><b>${fmtMoney(this.state.player.money)} đ</b></div>
            </div>
            <div>
              <div class="sec"><h3>Người & nhà cửa</h3>
                <div class="line"><span>Hàng hư hỏng</span><b>${r.spoiled}</b></div>
                <div class="line"><span>Bán chịu</span><b>${fmtMoney(r.creditGiven)} đ</b></div>
                <div class="line"><span>Tặng quà</span><b>${r.gifts}</b></div>
                <div class="line"><span>Cơm gia đình</span><b>${r.familyMeal}/2</b></div>
                <div class="line"><span>Uy tín</span><b>${r.repDelta >= 0 ? '+' : ''}${r.repDelta}</b></div>
              </div>
              <div class="sec"><h3>Ghi chú</h3>${feedback || '<div class="small" style="color:#6a4a2e">Một ngày bình thường.</div>'}</div>
            </div>
          </div>
          <div class="quote">"${this.dayQuote(r)}"</div>
          <div style="text-align:center;margin-top:8px"><button class="btn primary" data-action="report-continue">Tiếp tục</button></div>
        </div>
      </div>
    </div>`;
  }

  private dayQuote(r: { profit: number; customersServed: number; spoiled: number }): string {
    if (r.profit > 60) return 'Hôm nay cửa hàng đông vui. Tiếng tiền vang trong két.';
    if (r.profit > 10) return 'Một ngày đủ ăn, còn dư chút ít.';
    if (r.profit > 0) return 'Không lãi nhiều, nhưng cũng không lỗ.';
    if (r.spoiled > 3) return 'Hàng hư nhiều hơn bán được. Phải cân nhắc lại cách trữ.';
    if (r.customersServed === 0) return 'Hôm nay không ai ghé. Tiệm im như cái hũ.';
    return 'Hôm nay khó khăn. Nhưng ngày mai còn tiếp.';
  }

  showEvent(ev: EventDef) {
    this.modalOpen = true;
    const root = document.getElementById('modal-root')!;
    root.style.display = 'block';
    const portrait = ev.portrait || (ev.kind === 'npc' ? '/assets/characters/portraits/player_neutral.png' : '');
    root.innerHTML = `<div class="backdrop" data-action="backdrop" data-static="1">
      <div class="modal panel-wood frame-inner" style="width:720px" data-action="modal-surface">
        <div style="padding:8px 6px">
          <div style="display:flex;gap:16px;align-items:flex-start">
            ${portrait ? `<img src="${portrait}" style="width:120px;height:120px;border:2px solid #8a6238;box-shadow:0 0 0 1px #241711;flex:none">` : ''}
            <div style="flex:1">
              <div class="small" style="letter-spacing:.25em;color:var(--gold-2);text-transform:uppercase">${ev.kind === 'story' ? 'Câu chuyện' : ev.kind === 'npc' ? 'Người quen' : 'Thị trấn'}</div>
              <h2 style="margin:2px 0 6px;font-size:28px;color:#f6e8c4">${esc(ev.title)}</h2>
              ${ev.speaker ? `<div class="small" style="color:var(--muted);margin-bottom:6px">${esc(ev.speaker)}</div>` : ''}
              <p style="font-family:'EB Garamond',serif;font-size:17px;line-height:1.65;color:#e0d0ac;margin:0">${esc(ev.text)}</p>
            </div>
          </div>
          <div class="divider"></div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${ev.choices.map((c, i) => `<button class="btn" data-action="event-choice" data-choice="${i}" style="justify-content:flex-start;text-align:left;padding:10px 16px">
              <span>${esc(c.label)}</span>${c.hint ? `<span class="small dim" style="margin-left:10px">${esc(c.hint)}</span>` : ''}
            </button>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
    this.currentEvent = ev;
  }

  chooseEvent(index: string) {
    const ev = this.currentEvent;
    if (!ev) return;
    const choice = ev.choices[Number(index)];
    if (!choice) return;
    if (choice.require && !choice.require(this.state)) { this.toast('Bạn chưa đủ điều kiện.', 'bad'); return; }
    this.world.applyEffects(choice.effects);
    if (choice.result) {
      this.state.journal.push({ day: this.state.player.day, text: choice.result, kind: 'event' });
      this.toast(choice.result, 'good');
    }
    if (ev.once !== false) this.state.seenEvents.push(ev.id);
    this.closeModal();
    this.game.afterEvent();
  }

  showEnding() {
    this.modalOpen = true;
    const e = this.state.ending;
    if (!e) return;
    const root = document.getElementById('modal-root')!;
    root.style.display = 'block';
    root.innerHTML = `<div class="backdrop" data-action="backdrop" data-static="1">
      <div class="modal panel-wood frame-inner ending" style="width:820px" data-action="modal-surface">
        <div style="padding:18px 22px">
          <div class="sub">${e.id === 'decline' ? 'Một kết thúc' : 'Kết thúc'}</div>
          <h2>${esc(e.title)}</h2>
          <div class="divider" style="width:300px;margin:8px auto 16px"></div>
          <p>${esc(e.text)}</p>
          <div class="stats">
            <div class="stat"><div class="v">${this.state.player.day}</div><div class="l">Ngày</div></div>
            <div class="stat"><div class="v">${fmtMoney(this.state.player.money)}</div><div class="l">Đồng còn lại</div></div>
            <div class="stat"><div class="v">${Math.round(this.state.player.reputation)}</div><div class="l">Uy tín</div></div>
            <div class="stat"><div class="v">${Math.round(this.state.player.communityTrust)}</div><div class="l">Cộng đồng</div></div>
            <div class="stat"><div class="v">${this.state.totals.customersServed}</div><div class="l">Khách đã phục vụ</div></div>
            <div class="stat"><div class="v">${this.state.totals.gifts}</div><div class="l">Món tặng</div></div>
            <div class="stat"><div class="v">${this.state.totals.helped}</div><div class="l">Lần giúp đỡ</div></div>
            <div class="stat"><div class="v">${this.state.totals.spoiled}</div><div class="l">Hàng hư</div></div>
          </div>
          <div style="text-align:center;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
            <button class="btn primary big" data-action="ending-continue">Về màn hình chính</button>
            <button class="btn big" data-action="new-game-screen">Chơi lại</button>
          </div>
        </div>
      </div>
    </div>`;
  }
}

function phaseLabel(p: string): string {
  return ({ morning: 'Buổi sáng', open: 'Đang bán', report: 'Chốt sổ', evening: 'Buổi tối', ended: 'Kết thúc' })[p] ?? p;
}
