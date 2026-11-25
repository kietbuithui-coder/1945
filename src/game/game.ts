// ── game.ts · điều phối: vòng lặp ngày, phím tắt, mọi action của UI ─────────
import {
  ASSET_PRELOAD, DIFFICULTY, ENDINGS, ITEM, QUEST, NPC, HELP, portrait,
} from './data';
import type { QuestDef, EventDef } from './data';
import { audio } from './audio';
import {
  collectDebts, dailyCosts, marketStep, procure, payDebt, resolveDeliveries,
  restockSuppliers, rollWeather,
} from './economy';
import {
  addLine, applyTactic, clearTrade, commit, inspect, newTrade, quote, quoted, refuse, tradeSheet,
  type Tactic,
} from './trade';
import {
  mergeAll, move, quickRestock, resizeGrids, sortGrid, spoil, split, visible,
} from './inventory';
import {
  activeCustomer, arrived, buildQueue, callNext, npcSummary, onTradeDone, tickPatience,
} from './people';
import {
  buyUpgrade, checkLevel, dismiss, hire, travel,
} from './progression';
import { Scene, preload, type Floater } from './scene';
import {
  blankDayLog, clock, deleteSave, fmt, journal, loadWorld, newWorld, note, round,
  saveWorld, SLOTS, type Slot,
} from './state';
import {
  chooseEvent, chooseQuest, condition, finishRun, pendingQuest, pickEvent,
  randomLine, updateChapter, updateQuests,
} from './story';
import { UI, type ModalSpec, type PanelId, type UIEvent, type UIHost } from './ui';
import type { Customer, Difficulty, GridId, Trade, World } from './types';

type Pending = { kind: 'quest' | 'event'; id: string } | null;

export class Game implements UIHost {
  world: World;
  trade: Trade | null = null;
  scene: Scene;
  ui: UI;
  floaters: Floater[] = [];
  private fade = 0;
  private fadeDir = 0;
  private fadeCb: (() => void) | null = null;
  private last = 0;
  private uiClock = 0;
  private pending: Pending = null;
  private started = false;
  private raf = 0;
  private running = false;
  private nextDifficulty: Difficulty = 'normal';

  constructor(canvas: HTMLCanvasElement, root: HTMLElement) {
    const saved = loadWorld('auto');
    this.world = saved ?? newWorld(19450819, 'normal');
    resizeGrids(this.world);
    this.scene = new Scene(canvas);
    this.ui = new UI(root, this);
    this.nextDifficulty = this.world.difficulty;
    this.bindKeys();
    this.bindLifecycle();
  }

  customer(): Customer | null { return activeCustomer(this.world); }
  trayCount(): number { return this.trade?.lines.length ?? 0; }

  async boot(): Promise<void> {
    if (this.running) return;
    this.ui.loading = { done: 0, total: ASSET_PRELOAD.length };
    this.ui.render();
    await preload(ASSET_PRELOAD, (d, t) => {
      this.ui.loading = { done: d, total: t };
      this.ui.render();
    });
    this.ui.loading = null;
    this.ui.titleMode = true;
    this.ui.render();
    this.last = performance.now();
    this.running = true;
    const loop = (now: number): void => {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.tick(dt);
      this.scene.draw({
        world: this.world, dt, customer: this.ui.titleMode ? null : this.customer(),
        floaters: this.floaters, fade: this.fade, titleMode: this.ui.titleMode,
        trayCount: this.trayCount(),
      });
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop(): void { this.running = false; cancelAnimationFrame(this.raf); }

  // ── Vòng lặp ──────────────────────────────────────────────────────────────
  private tick(dt: number): void {
    const w = this.world;
    if (this.fadeDir !== 0) {
      this.fade += this.fadeDir * dt * 4;
      if (this.fade >= 1) {
        this.fade = 1; this.fadeDir = -1;
        this.fadeCb?.(); this.fadeCb = null;
      } else if (this.fade <= 0) { this.fade = 0; this.fadeDir = 0; }
    }
    if (this.ui.titleMode || !this.started || w.phase !== 'open') return;
    const blocked = w.paused || !!this.ui.modal || (this.ui.panel !== null && w.settings.autoPause);
    if (blocked) return;
    w.minute += dt * 8 * w.speed;
    const left = tickPatience(w, dt);
    if (left.length) {
      this.toast(`${left[0].name} chờ quá lâu, bỏ đi.`, 'bad');
      audio.sfx('wood');
      if (w.activeCustomerId && left.some((c) => c.id === w.activeCustomerId)) this.afterCustomer();
    }
    if (!this.customer()) {
      const next = callNext(w);
      if (next) {
        this.trade = newTrade(next.id);
        audio.sfx('door');
        this.scene.addFloater(this.floaters, `${next.name} tới quầy`, 640, 250, '#e6d3a3', 20);
        this.ui.render();
      }
    }
    if (w.minute >= 1020) { this.setPhase('report'); return; }
    this.uiClock += dt;
    if (this.uiClock > 0.24) { this.uiClock = 0; this.ui.render(); }
  }

  private transition(fn: () => void): void {
    if (this.fadeDir !== 0) { fn(); return; }
    this.fadeDir = 1; this.fadeCb = fn;
  }
  private toast(text: string, kind: 'info' | 'good' | 'bad' = 'info'): void {
    this.ui.toast(text, kind);
  }
  private render(): void { this.ui.render(); }

  // ── Pha trong ngày ────────────────────────────────────────────────────────
  setPhase(p: string): void {
    const w = this.world;
    if (this.ui.titleMode || w.phase === 'ending') return;
    const allowed: Record<string, string[]> = {
      procure: ['morning'], open: ['procure'], report: ['open'],
      evening: ['report'], nextday: ['evening'],
    };
    if (!allowed[p]) return;
    if (!allowed[p].includes(w.phase)) {
      this.toast('Cứ đi theo thứ tự: sáng → nhập hàng → mở cửa → chốt sổ → tối.', 'bad');
      return;
    }
    switch (p) {
      case 'procure': w.phase = 'procure'; w.minute = 420; audio.sfx('paper'); break;
      case 'open': this.openShop(); return;
      case 'report': this.closeShop(); return;
      case 'evening': this.enterEvening(); return;
      case 'nextday': this.nextDay(); return;
    }
    this.ui.modal = null;
    this.render();
  }

  nextPhase(): void {
    const w = this.world;
    if (this.ui.titleMode) return;
    switch (w.phase) {
      case 'morning': this.setPhase('procure'); break;
      case 'procure': this.setPhase('open'); break;
      case 'open': this.setPhase('report'); break;
      case 'report': this.setPhase('evening'); break;
      case 'evening': this.setPhase('nextday'); break;
      case 'ending': this.newGame(this.nextDifficulty); break;
    }
  }

  private openShop(): void {
    const w = this.world;
    w.phase = 'open'; w.minute = 480; w.paused = false;
    buildQueue(w);
    const c = callNext(w);
    this.trade = c ? newTrade(c.id) : null;
    this.ui.modal = null; this.ui.panel = null;
    audio.sfx('door');
    journal(w, 'system', `Mở cửa ngày ${w.day}. ${w.queue.length} người trong lịch ghé tiệm.`, 'Cửa tiệm');
    this.toast(`Mở cửa · ${w.queue.length} khách hôm nay · ${w.weather === 'storm' ? 'mưa lớn' : 'trời ' + w.weather}`, 'info');
    this.render();
  }

  private closeShop(): void {
    const w = this.world;
    for (const c of w.queue) if (c.state === 'active') { c.state = 'left'; c.result = 'Đóng cửa lúc khách còn ở quầy.'; }
    w.activeCustomerId = null;
    w.phase = 'report'; w.minute = 1020;
    // Sổ ngày chỉ đóng ở nextDay, sau khi quyết định buổi tối cũng được ghi vào.
    audio.sfx('bell');
    const l = w.dayLog;
    const profit = l.revenue - l.cost;
    const table = [
      `Doanh thu        +${fmt(l.revenue)} đ`,
      `Chi phí          −${fmt(l.cost)} đ`,
      `Lãi / lỗ         ${profit >= 0 ? '+' : ''}${fmt(profit)} đ`,
      `Giao dịch        ${l.trades} · khách ${l.served} · bỏ đi ${l.missed}`,
      `Hàng hư          ${l.spoilage} món`,
      `Uy tín           ${l.repDelta >= 0 ? '+' : ''}${l.repDelta} → ${Math.round(w.rep)}`,
      `Lòng tin xóm     ${l.communityDelta >= 0 ? '+' : ''}${l.communityDelta} → ${Math.round(w.community)}`,
      `Két tiền         ${fmt(w.money)} đ · bếp nhà ${w.family} suất`,
      '',
      ...l.notes.map((n) => `· ${n}`),
      '',
      `Ngày mai: ${w.forecast}`,
    ].join('\n');
    journal(w, 'system', `Chốt sổ ngày ${w.day}: ${profit >= 0 ? 'lãi' : 'lỗ'} ${fmt(Math.abs(profit))} đ.`, 'Báo cáo');
    this.ui.showModal({
      kind: 'report', title: `Chốt sổ · ngày ${w.day}`, sub: `Chương ${w.chapter} · ${randomLine(w)}`,
      text: 'Một ngày khép lại. Sổ đã ghi đủ các khoản, hàng hư và lời hứa.',
      table, choices: [{ label: 'Sang buổi tối →', act: 'phase', value: 'evening' }], closable: true,
    });
    saveWorld(w, 'auto');
  }

  private enterEvening(): void {
    const w = this.world;
    w.phase = 'evening'; w.minute = 1110;
    const q = pendingQuest(w) ?? updateQuests(w);
    if (q) { this.showQuest(q); return; }
    const e = pickEvent(w);
    if (e) { this.showEvent(e); return; }
    this.ui.showModal({
      kind: 'event', title: `Tối ngày ${w.day}`, sub: randomLine(w),
      text: 'Không có ai gõ cửa. Bạn dọn lại quầy, châm thêm dầu, rồi nghe tiếng mưa ngoài ngõ. Một ngày yên, nhưng không phải ngày trống.',
      table: `${w.news[0] ?? w.forecast}\n\nNgày mai: ${w.forecast}`,
      choices: [{ label: 'Ngày mới →', act: 'phase', value: 'nextday' }], closable: true,
    });
  }

  private showQuest(q: QuestDef): void {
    this.pending = { kind: 'quest', id: q.id };
    this.ui.showModal({
      kind: 'quest', title: q.title, sub: q.npc ? `Người ghé: ${NPC[q.npc]?.name ?? q.npc}` : 'Chuyện trong xóm',
      text: q.text, closable: false,
      choices: q.choices.map((c, i) => ({ label: c.label, act: 'questchoice', value: String(i) })),
    });
  }
  private showEvent(e: EventDef): void {
    this.pending = { kind: 'event', id: e.id };
    this.ui.showModal({
      kind: 'event', title: `Tối ngày ${this.world.day}`, sub: e.category === 'supply' ? 'Tin từ nguồn hàng' : 'Chuyện trong thị trấn',
      text: e.text, closable: false,
      choices: e.choices.map((c, i) => ({ label: c.label, act: 'eventchoice', value: String(i) })),
    });
  }

  private archiveDay(w: World): void {
    if (w.history[w.history.length - 1]?.day === w.day) return;
    w.history.push({ ...w.dayLog });
    if (w.history.length > 40) w.history.shift();
  }

  private nextDay(): void {
    const w = this.world;
    if (w.day >= w.maxDays) { this.archiveDay(w); this.endRun(); return; }
    this.transition(() => {
      this.archiveDay(w);                 // gồm cả hệ quả quyết định buổi tối
      w.day += 1;
      w.dayLog = blankDayLog(w.day);      // hư hỏng / nợ / lương đêm ghi vào sổ ngày mới
      // Cờ trễ của ngày trước đã qua buổi tối; chuyến mới của hôm nay sẽ tự đặt lại.
      w.flags.delivery_late = 0;
      rollWeather(w);
      marketStep(w);
      restockSuppliers(w);
      resolveDeliveries(w);       // dùng route_fixed được chuẩn bị tối hôm trước
      w.flags.route_fixed = 0;    // một lần bảo vệ, không kéo dài vô hạn
      spoil(w);
      collectDebts(w);
      dailyCosts(w);
      updateChapter(w);
      updateQuests(w);
      checkLevel(w);
      resizeGrids(w);
      w.phase = 'morning'; w.minute = 360; w.paused = false;
      w.queue = []; w.activeCustomerId = null; w.travelUsed = false; w.location = 'shop';
      this.trade = null; this.pending = null; this.ui.modal = null; this.ui.panel = null;
      const prev = w.history[w.history.length - 1];
      journal(w, 'story', `Sáng ngày ${w.day}. ${prev ? `Hôm qua ${prev.revenue - prev.cost >= 0 ? 'lãi' : 'lỗ'} ${fmt(Math.abs(prev.revenue - prev.cost))} đ. ` : ''}${w.forecast}`, 'Ngày mới');
      audio.setWeather(w.weather);
      audio.sfx('bell');
      saveWorld(w, 'auto');
      this.toast(`Ngày ${w.day} · ${w.forecast}`, 'info');
      this.render();
    });
  }

  private endRun(): void {
    const e = finishRun(this.world);
    audio.sfx('success');
    saveWorld(this.world, 'auto');
    this.ui.showModal({
      kind: 'ending', title: e.title, sub: `Ba mươi ngày · ${e.test}`,
      text: e.text,
      table: [
        `Két tiền ${fmt(this.world.money)} đ · uy tín ${Math.round(this.world.rep)} · xóm ${Math.round(this.world.community)}`,
        `Cấp tiệm ${this.world.shopLevel} · ${this.world.upgrades.length} nâng cấp · ${this.world.stats.served} khách`,
        `Giúp ${this.world.stats.helped} lần · từ chối ${this.world.stats.refused} lần · chuỗi dài nhất ${this.world.stats.bestStreak}`,
        `Chuyện đã ngã ngũ ${Object.values(this.world.quests).filter((q) => q.status === 'done').length}/${Object.keys(this.world.quests).length}`,
      ].join('\n'),
      choices: [{ label: 'Chơi lại', act: 'newgame' }, { label: 'Xem nhật ký', act: 'panel', value: 'journal' }],
    });
  }

  newGame(difficulty: Difficulty = this.nextDifficulty): void {
    this.nextDifficulty = difficulty;
    this.world = newWorld(19450819 + Math.floor(Math.random() * 100000), difficulty);
    resizeGrids(this.world);
    this.started = true;
    this.trade = null; this.pending = null;
    this.ui.titleMode = false; this.ui.panel = null;
    marketStep(this.world);
    updateChapter(this.world);
    updateQuests(this.world);
    audio.unlock(); audio.sync(this.world);
    saveWorld(this.world, 'auto');
    this.ui.showModal({
      kind: 'intro', title: 'Ngày 1 · Cửa tiệm nhỏ', sub: DIFFICULTY[difficulty].name,
      text: 'Bạn thừa hưởng một quầy gỗ, hai kệ hàng, ít vốn và một cuốn sổ nợ cũ. Tháng Tám năm 1945, thị trấn An Bình đang thiếu từng bát gạo. Giữ được cái tiệm đã khó; giữ được chữ tín với những người ghé quầy còn khó hơn.',
      table: `Vốn ${fmt(this.world.money)} đ · ${this.world.warehouse.cells.filter(Boolean).length} chồng hàng trong kho\n${this.world.forecast}`,
      choices: [{ label: 'Mở sổ, bắt đầu →', act: 'modalclose' }], closable: true,
    });
    this.render();
  }

  private continueGame(): void {
    const w = loadWorld('auto');
    if (!w) { this.toast('Không tìm thấy bản lưu, bắt đầu ván mới.', 'bad'); this.newGame(); return; }
    this.world = w; resizeGrids(w);
    this.started = true; this.ui.titleMode = false; this.ui.panel = null;
    this.trade = null; this.pending = null;
    this.nextDifficulty = w.difficulty;
    audio.unlock(); audio.sync(w);
    if (w.phase === 'open') {
      const c = this.customer() ?? callNext(w);
      this.trade = c ? newTrade(c.id) : null;
    }
    this.ui.modal = null;
    this.render();
    this.toast(`Tiếp ngày ${w.day} · ${clock(w.minute)}`, 'good');
  }

  private afterCustomer(): void {
    const w = this.world;
    this.trade = null;
    const next = callNext(w);
    if (next) this.trade = newTrade(next.id);
    else if (arrived(w).length === 0 && w.queue.every((c) => c.state !== 'waiting')) {
      this.toast('Hết khách. Chốt sổ khi bạn sẵn sàng.', 'good');
    }
    this.render();
  }

  // ── Xử lý mọi action ──────────────────────────────────────────────────────
  handle(e: UIEvent): void {
    const w = this.world;
    const v = e.value ?? '';
    if (e.type === 'search') { this.ui.search = v; this.render(); return; }
    if (e.type === 'sort') {
      this.ui.sort = v as typeof this.ui.sort;
      sortGrid(w, 'warehouse', this.ui.sort); sortGrid(w, 'shelves', this.ui.sort);
      this.render(); return;
    }
    if (e.type === 'filter') { this.ui.cat = v; this.render(); return; }
    if (e.type === 'select') {
      this.ui.selected = { grid: e.from!, i: e.fi! };
      audio.sfx('click'); this.render(); return;
    }
    if (e.type === 'split') {
      const r = split(w, e.from!, e.fi!);
      audio.sfx(r.ok ? 'paper' : 'error');
      this.toast(r.message, r.ok ? 'info' : 'bad'); this.render(); return;
    }
    if (e.type === 'move') {
      const r = move(w, e.from!, e.fi!, e.to!, e.ti!, e.qty);
      audio.sfx(r.ok ? 'wood' : 'error');
      this.toast(r.message, r.ok ? 'info' : 'bad');
      if (w.settings.autoSort && r.ok) { sortGrid(w, 'warehouse', this.ui.sort === 'manual' ? 'category' : this.ui.sort); }
      this.render(); return;
    }
    if (e.type === 'tray') {
      if (!this.trade) { this.toast('Chưa tới giờ mở cửa.', 'bad'); return; }
      const c = this.customer(); if (!c) return;
      const r = addLine(w, this.trade, e.from!, e.fi!);
      audio.sfx(r.ok ? 'wood' : 'error');
      this.toast(r.message, r.ok ? 'info' : 'bad'); this.render(); return;
    }

    switch (e.action) {
      case 'search': this.ui.search = v; this.render(); break;
      case 'sort':
        this.ui.sort = v as typeof this.ui.sort;
        sortGrid(w, 'warehouse', this.ui.sort); sortGrid(w, 'shelves', this.ui.sort);
        this.render(); break;
      case 'filter': this.ui.cat = v; this.render(); break;
      case 'panel': this.ui.openPanel(v as PanelId); audio.sfx('click'); this.render(); break;
      case 'panelclose': this.ui.panel = null; this.render(); break;
      case 'modalclose': this.ui.closeModal(); break;
      case 'pause': w.paused = !w.paused; audio.sfx('click'); this.render(); break;
      case 'speed': w.speed = Number(v) || 1; audio.sfx('click'); this.render(); break;
      case 'nextphase': case 'phase': this.nextPhaseOr(v); break;
      case 'newgame': this.confirmNewGame(); break;
      case 'donewgame': this.newGame(this.nextDifficulty); break;
      case 'continue': this.continueGame(); break;
      case 'difficulty':
        this.nextDifficulty = v as Difficulty;
        this.ui.showModal({
          kind: 'confirm', title: 'Đổi độ khó', text: `Chơi lại từ ngày 1 ở chế độ ${DIFFICULTY[this.nextDifficulty].name}?`,
          choices: [{ label: 'Bắt đầu lại', act: 'donewgame' }, { label: 'Ở lại', act: 'modalclose' }],
        });
        break;
      case 'sound':
        w.settings.sound = !w.settings.sound;
        audio.toggle(w.settings.sound); audio.sync(w); this.render(); break;
      case 'volume': w.settings.volume = Number(v) / 100; audio.setVolume(w.settings.volume); break;
      case 'reduced': w.settings.reduced = !w.settings.reduced; this.render(); break;
      case 'autopause': w.settings.autoPause = !w.settings.autoPause; this.render(); break;
      case 'autosort': w.settings.autoSort = !w.settings.autoSort; this.render(); break;
      case 'merge': {
        const n = mergeAll(w, 'warehouse') + mergeAll(w, 'shelves');
        audio.sfx('paper'); this.toast(n ? `Gộp ${n} món.` : 'Các chồng đã gọn sẵn.', 'info'); this.render(); break;
      }
      case 'restock': {
        const n = quickRestock(w);
        audio.sfx(n ? 'wood' : 'error');
        this.toast(n ? `Bổ sung ${n} món lên kệ.` : 'Kho rỗng hoặc kệ đã đầy.', n ? 'good' : 'bad');
        this.render(); break;
      }
      case 'buy': this.doBuy(v); break;
      case 'paydebt': {
        const r = payDebt(w, v);
        audio.sfx(r.ok ? 'coin' : 'error'); this.toast(r.message, r.ok ? 'good' : 'bad'); this.render(); break;
      }
      case 'npc': {
        this.ui.showModal({ kind: 'result', title: NPC[v]?.name ?? v, text: npcSummary(w, v), choices: [{ label: 'Đóng', act: 'modalclose' }] });
        break;
      }
      case 'travel': {
        const r = travel(w, v);
        audio.sfx(r.ok ? 'step' : 'error'); this.toast(r.message, r.ok ? 'good' : 'bad'); this.render(); break;
      }
      case 'levelup': {
        const n = checkLevel(w);
        audio.sfx(n ? 'success' : 'error');
        this.toast(n ? `Tiệm lên cấp ${n}! Khung cảnh đổi khác.` : 'Chưa đủ điều kiện.', n ? 'good' : 'bad');
        this.render(); break;
      }
      case 'upgrade': {
        const r = buyUpgrade(w, v);
        audio.sfx(r.ok ? 'success' : 'error'); this.toast(r.message, r.ok ? 'good' : 'bad'); this.render(); break;
      }
      case 'hire': case 'fire': {
        const r = e.action === 'hire' ? hire(w, v) : dismiss(w, v);
        audio.sfx(r.ok ? 'bell' : 'error'); this.toast(r.message, r.ok ? 'good' : 'bad'); this.render(); break;
      }
      case 'save': {
        const ok = saveWorld(w, v as Slot);
        audio.sfx(ok ? 'paper' : 'error'); this.toast(ok ? `Đã lưu ô ${v}.` : 'Không lưu được.', ok ? 'good' : 'bad'); this.render(); break;
      }
      case 'load': {
        const loaded = loadWorld(v as Slot);
        if (!loaded) { this.toast('Ô này trống hoặc hỏng.', 'bad'); break; }
        this.world = loaded; resizeGrids(loaded); this.trade = null;
        this.ui.titleMode = false; this.ui.modal = null; this.ui.panel = null;
        this.started = true; this.nextDifficulty = loaded.difficulty;
        audio.unlock(); audio.sync(loaded);
        if (loaded.phase === 'open') { const c = this.customer() ?? callNext(loaded); this.trade = c ? newTrade(c.id) : null; }
        audio.sfx('bell'); this.toast(`Đã tải ngày ${loaded.day}.`, 'good'); this.render(); break;
      }
      case 'deletesave': deleteSave(v as Slot); this.toast(`Đã xoá ô ${v}.`, 'info'); this.render(); break;
      case 'trayadd': this.doAddToTray(Number(v)); break;
      case 'trayremove': this.doRemoveLine(Number(v)); break;
      case 'cleartray': if (this.trade) clearTrade(this.trade); this.render(); break;
      case 'inspect': this.doInspect(Number(v)); break;
      case 'price': this.doPrice(v); break;
      case 'quote': this.doQuote(); break;
      case 'tactic': this.doTactic(v as Tactic); break;
      case 'confirm': this.showConfirm(); break;
      case 'doconfirm': this.doCommit(); break;
      case 'refuse': this.doRefuse(); break;
      case 'questchoice': this.doQuestChoice(Number(v)); break;
      case 'eventchoice': this.doEventChoice(Number(v)); break;
      default: this.toast(`Chưa xử lý: ${e.action ?? e.type}`, 'bad');
    }
  }

  private nextPhaseOr(v: string): void { if (v) this.setPhase(v); else this.nextPhase(); }

  private doBuy(v: string): void {
    const [sid, item, qty, mode] = v.split('|');
    const r = procure(this.world, sid, item, Number(qty), mode as 'cash' | 'barter' | 'order');
    audio.sfx(r.ok ? 'coin' : 'error');
    this.toast(r.message, r.ok ? 'good' : 'bad');
    if (r.ok) saveWorld(this.world, 'auto');
    this.render();
  }

  private doAddToTray(cell: number): void {
    const w = this.world, c = this.customer();
    if (!this.trade || !c || w.phase !== 'open') return;
    const r = addLine(w, this.trade, 'shelves', cell);
    audio.sfx(r.ok ? 'wood' : 'error');
    this.toast(r.message, r.ok ? 'info' : 'bad');
    this.render();
  }
  private doRemoveLine(i: number): void {
    if (!this.trade) return;
    // removeLine được gọi trực tiếp để tránh import vòng
    this.trade.lines.splice(i, 1);
    this.trade.reaction = null; this.trade.step = 'build';
    audio.sfx('click'); this.render();
  }
  private doInspect(i: number): void {
    if (!this.trade) return;
    const text = inspect(this.world, this.trade, i);
    audio.sfx('scale');
    this.toast(text, 'info');
    this.render();
  }
  private doPrice(v: string): void {
    const t = this.trade; if (!t) return;
    if (v === 'reset') t.discount = 0;
    else t.discount = Math.max(-0.4, Math.min(0.3, round(t.discount + Number(v) / 100)));
    t.price = quoted(t);
    if (t.step === 'quoted') { t.reaction = null; t.step = 'build'; }
    audio.sfx('click'); this.render();
  }
  private doQuote(): void {
    const t = this.trade, c = this.customer();
    if (!t || !c || !t.lines.length) { this.toast('Khay quầy còn trống.', 'bad'); return; }
    t.price = quoted(t);
    const r = quote(this.world, t, c);
    audio.sfx(r.kind === 'accept' ? 'success' : 'paper');
    this.render();
  }
  private doTactic(a: Tactic): void {
    const t = this.trade, c = this.customer();
    if (!t || !c) return;
    if (a === 'refuse') { this.doRefuse(); return; }
    const text = applyTactic(this.world, t, c, a);
    if (a === 'small' || a === 'big' || a === 'hold' || a === 'acceptCounter' || a === 'credit') t.price = t.price || quoted(t);
    audio.sfx('paper');
    this.toast(text, 'info');
    this.render();
  }
  private showConfirm(): void {
    const t = this.trade, c = this.customer();
    if (!t || !c || !t.lines.length) { this.toast('Khay quầy còn trống.', 'bad'); return; }
    t.price = t.price || quoted(t);
    this.ui.showModal({
      kind: 'confirm', title: 'Xác nhận giao dịch',
      sub: `${c.name} · ${NPC[c.npc]?.job ?? ''}`,
      text: 'Kiểm lại giá, số lượng và hình thức trước khi ghi sổ.',
      table: tradeSheet(this.world, t, c), closable: true,
      choices: [{ label: '✓ Xác nhận', act: 'doconfirm' }, { label: 'Quay lại', act: 'modalclose' }],
    });
  }
  private doCommit(): void {
    const t = this.trade, c = this.customer();
    if (!t || !c) return;
    const r = commit(this.world, t, c, true);
    audio.sfx(r.sfx as 'coin');
    this.ui.closeModal();
    if (r.ok) {
      this.scene.addFloater(this.floaters, `+${fmt(r.money)} đ`, 640, 330, '#f0c86a', 32);
      this.toast(r.text, 'good');
      saveWorld(this.world, 'auto');
    } else this.toast(r.text, 'bad');
    this.afterCustomer();
  }
  private doRefuse(): void {
    const t = this.trade, c = this.customer();
    if (!t || !c) return;
    const r = refuse(this.world, t, c);
    audio.sfx('wood'); this.toast(r.text, 'info');
    this.ui.modal = null;
    this.afterCustomer();
  }

  private doQuestChoice(i: number): void {
    const p = this.pending;
    if (!p || p.kind !== 'quest') return;
    const r = chooseQuest(this.world, p.id, i);
    audio.sfx('success'); this.pending = null;
    this.ui.showModal({
      kind: 'result', title: 'Quyết định đã ghi vào sổ',
      text: r.text, table: r.effects.length ? `Hệ quả: ${r.effects.join(' · ')}` : '',
      choices: [{ label: 'Ngày mai →', act: 'phase', value: 'nextday' }], closable: false,
    });
    saveWorld(this.world, 'auto');
  }
  private doEventChoice(i: number): void {
    const p = this.pending;
    if (!p || p.kind !== 'event') return;
    const r = chooseEvent(this.world, p.id, i);
    audio.sfx('success'); this.pending = null;
    this.ui.showModal({
      kind: 'result', title: 'Đêm qua đi qua',
      text: r.text, table: r.effects.length ? `Hệ quả: ${r.effects.join(' · ')}` : '',
      choices: [{ label: 'Ngày mai →', act: 'phase', value: 'nextday' }], closable: false,
    });
    saveWorld(this.world, 'auto');
  }

  private confirmNewGame(): void {
    if (this.ui.titleMode) { this.newGame(this.nextDifficulty); return; }
    this.ui.showModal({
      kind: 'confirm', title: 'Bắt đầu ván mới?',
      text: 'Ván hiện tại sẽ được thay bằng một thế giới mới. Các ô lưu thủ công vẫn giữ nguyên.',
      choices: [{ label: 'Bắt đầu lại', act: 'donewgame' }, { label: 'Ở lại', act: 'modalclose' }],
    });
  }

  // ── Phím tắt & lifecycle ──────────────────────────────────────────────────
  private bindKeys(): void {
    document.addEventListener('keydown', (ev) => {
      const tag = (ev.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (ev.key === 'Escape') (ev.target as HTMLElement).blur();
        return;
      }
      const k = ev.key.toLowerCase();
      if (k === 'escape') { this.ui.closeModal(); this.ui.panel = null; this.render(); return; }
      if (k === 'enter' && this.ui.modal?.kind === 'confirm') {
        const first = this.ui.modal.choices?.[0];
        if (first) this.handle({ type: 'action', action: first.act, value: first.value });
        return;
      }
      if (this.ui.titleMode) return;
      const map: Record<string, string> = {
        i: 'inventory', b: 'supply', l: 'ledger', m: 'map', j: 'journal',
        u: 'upgrade', s: 'save', h: 'help', c: 'settings',
      };
      if (k === ' ') { ev.preventDefault(); this.handle({ type: 'action', action: 'pause' }); return; }
      if (k === '1' || k === '2' || k === '3') { this.handle({ type: 'action', action: 'speed', value: k }); return; }
      if (k === 'o') { this.setPhase('open'); return; }
      if (k === 'e') { this.setPhase('report'); return; }
      if (map[k]) { this.handle({ type: 'action', action: 'panel', value: map[k] }); return; }
    });
  }
  private bindLifecycle(): void {
    const unlock = (): void => { audio.unlock(); audio.sync(this.world); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.started) saveWorld(this.world, 'auto');
    });
    window.addEventListener('beforeunload', () => { if (this.started) saveWorld(this.world, 'auto'); });
  }
}
