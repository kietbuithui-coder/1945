// Game controller: owns the world, the scene and the UI, and runs the day loop.
import { World, newGame, fmtMoney, SAVE_PREFIX } from './systems';
import { Scene, preload, splitAssetUrls } from './scene';
import { BUILD } from './version';
import { UI } from './ui';
import { audio } from './audio';
import { eventById, EVENTS, MAIN_STORY_IDS, ARC_IDS } from './events';
import { CHAPTERS, ITEMS, UPGRADES, LOCATIONS, NPCS } from './data';
import type { GameState, Difficulty, GameEvent, EventDef } from './types';

export type Screen = 'boot' | 'title' | 'playing' | 'ended';

export class Game {
  world: World;
  scene: Scene;
  ui: UI;
  screen: Screen = 'boot';
  eventQueue: EventDef[] = [];
  pendingAfterChapter: (() => void) | null = null;
  private afterEventMode: 'morning' | 'evening' = 'evening';
  private seenToday = new Set<string>();
  private last = 0;
  private raf = 0;
  private rainOn = false;
  private audioReady = false;

  constructor(canvas: HTMLCanvasElement) {
    this.world = new World(newGame('', 'normal'), this.emit);
    this.scene = new Scene(canvas);
    this.ui = new UI(this);
    this.screen = 'title';
    this.scene.titleMode = true;
    this.bindShortcuts();
  }

  private typing(): boolean {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || el.isContentEditable;
  }

  private bindShortcuts() {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.typing()) return;
      const s = this.world.state;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      switch (e.key) {
        case ' ':
          if (this.screen === 'playing' && s.time.phase === 'open') {
            s.time.paused = !s.time.paused;
            this.ui.refresh();
          }
          break;
        case '1': s.time.speed = 1; this.ui.refresh(); break;
        case '2': s.time.speed = 2; this.ui.refresh(); break;
        case '3': s.time.speed = 3; this.ui.refresh(); break;
        case 'i': case 'I': this.ui.openPanel('inventory'); break;
        case 'p': case 'P': this.ui.openPanel('prices'); break;
        case 'm': case 'M': this.ui.openPanel('map'); break;
        case 'o': case 'O': if (s.time.phase === 'morning') this.openShop(); break;
        case 'e': case 'E': if (s.time.phase === 'open') this.endDay(); break;
        case 'Escape':
          // story-critical cards (chapter, report, event, ending) must be answered
          if (!document.querySelector('.backdrop[data-static]')) this.ui.closeModal();
          break;
        default: break;
      }
    });
  }

  // ------------------------------------------------------------- lifecycle --
  async boot() {
    this.ui.showTitle();
    this.scene.titleMode = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    window.addEventListener('pagehide', this.onHide);
    document.addEventListener('visibilitychange', this.onHide);
    this.warnIfStale();
    console.info(`Cửa Hàng 1945 · bản ${BUILD}`);
    const { critical, rest } = splitAssetUrls();
    try {
      await preload(critical, (done, total) => {
        const el = document.getElementById('loading-bar');
        if (el) el.style.width = `${Math.round((done / Math.max(1, total)) * 100)}%`;
      });
    } catch { /* assets are optional at boot; missing images degrade gracefully */ }
    const load = document.getElementById('loading');
    if (load) load.classList.add('done');
    // character sprites keep loading in the background so the title appears fast
    preload(rest).catch(() => { /* non-fatal */ });
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    audio.stopMusic();
    audio.stopRain();
    window.removeEventListener('pagehide', this.onHide);
    window.removeEventListener('visibilitychange', this.onHide);
  }

  /** If this tab was opened before a rebuild, tell the player to reload instead
   *  of letting them click buttons that no longer exist. */
  private warnIfStale() {
    try {
      const KEY = 'vn1945.build';
      const seen = localStorage.getItem(KEY);
      localStorage.setItem(KEY, BUILD);
      if (seen && seen !== BUILD) {
        this.ui.toast('Đã có bản mới — tải lại trang (Ctrl+Shift+R) để cập nhật.', 'info');
      }
    } catch { /* storage unavailable: nothing to warn about */ }
  }

  /** Keep the player's progress when the tab is closed or hidden, and stop the
   *  soundtrack while nobody is listening. */
  private onHide = () => {
    if (this.screen !== 'playing') return;
    if (document.visibilityState === 'hidden') {
      if (this.world.state.settings.autosave) this.world.save(0);
      audio.duck(true);
    } else {
      audio.duck(false);
    }
  };

  private loop = (t: number) => {
    const dt = Math.min(0.05, Math.max(0, (t - this.last) / 1000));
    this.last = t;
    if (this.screen === 'playing') {
      const before = this.world.state.time.phase;
      this.world.advanceTime(dt);
      if (before === 'open' && this.world.state.time.phase === 'report') {
        // the clock ran out on its own: show the ledger instead of stalling
        this.ui.showReport();
      }
      if (this.world.state.time.phase === 'open' && !this.world.state.time.paused) {
        this.world.state.playSeconds += dt;
      }
    }
    this.scene.draw(this.world, dt);
    this.ui.tick();
    this.updateAmbience();
    this.raf = requestAnimationFrame(this.loop);
  };

  private updateAmbience() {
    const s = this.world.state;
    const rain = s.weather.today === 'mua' || s.weather.today === 'mua_to';
    if (rain && !this.rainOn) { audio.startRain(); this.rainOn = true; }
    if (!rain && this.rainOn) { audio.stopRain(); this.rainOn = false; }
  }

  private ensureAudio() {
    if (this.audioReady) return;
    audio.init();
    audio.resume();
    audio.setSfx(this.world.state.settings.sfx);
    audio.setMusic(this.world.state.settings.music);
    this.audioReady = true;
  }

  emit = (e: GameEvent) => {
    switch (e.type) {
      case 'money':
        this.scene.addFloat(`${e.amount >= 0 ? '+' : ''}${fmtMoney(e.amount)}`, 640, 470, e.amount >= 0 ? '#f0c86a' : '#c4513f', 24);
        break;
      case 'rep':
        if (e.amount) this.scene.addFloat(`Uy tín ${e.amount > 0 ? '+' : ''}${e.amount}`, 640, 430, e.amount > 0 ? '#c9d88a' : '#c4513f', 16);
        break;
      case 'toast':
        this.ui.toast(e.text, 'info', e.icon);
        break;
      case 'sound':
        audio.play(e.name);
        break;
      case 'float':
        this.scene.addFloat(e.text, e.x, e.y, e.color ?? '#f0c86a');
        break;
      case 'refresh':
        this.ui.refresh();
        break;
      default:
        break;
    }
  };

  // ------------------------------------------------------------------ flow --
  startNew(name: string, difficulty: Difficulty) {
    this.ensureAudio();
    const st = newGame(name, difficulty);
    this.world = new World(st, this.emit);
    this.screen = 'playing';
    this.scene.titleMode = false;
    this.eventQueue = [];
    this.seenToday.clear();
    this.ui.closeModal();
    this.ui.selectedUid = null;
    this.ui.lastCustomerUid = null;
    this.ui.hideTitleChrome();
    this.ui.refresh();
    this.ui.showChapter(1);
    this.pendingAfterChapter = () => {
      st.chapterIntroSeen = [1];
      const ev = eventById('intro_day1');
      if (ev && !st.seenEvents.includes(ev.id)) {
        this.afterEventMode = 'morning';
        this.ui.showEvent(ev);
        return;
      }
      this.beginMorning();
    };
  }

  beginMorning() {
    this.ui.closeModal();
    this.ui.refresh();
    // snapshot at the top of the day: quitting mid-day still leaves a Continue
    if (this.world.state.settings.autosave) this.world.save(0);
    this.ui.toast(`Ngày ${this.world.state.player.day} · ${this.world.state.weather.today === 'mua_to' ? 'Mưa lớn' : 'Hãy mở cửa khi sẵn sàng'}`, 'info');
  }

  loadSlot(slot: number) {
    const st = World.load(slot);
    if (!st) { this.ui.toast('Ô lưu này trống.', 'bad'); return; }
    this.world = new World(st, this.emit);
    this.screen = 'playing';
    this.scene.titleMode = false;
    this.ui.closeModal();
    this.ui.lastCustomerUid = null;
    this.ui.hideTitleChrome();
    this.ui.refresh();
    this.ensureAudio();
    audio.setSfx(st.settings.sfx);
    audio.setMusic(st.settings.music);
    this.ui.toast(`Đã tải ngày ${st.player.day}.`, 'good');
  }

  saveSlot(slot: number) {
    if (this.screen !== 'playing') { this.ui.toast('Chưa có tiến trình để lưu.', 'bad'); return; }
    if (this.world.save(slot)) {
      this.ui.toast(slot === 0 ? 'Đã lưu tự động.' : `Đã lưu vào ô ${slot}.`, 'good');
      if (this.ui.activePanel === 'save') this.ui.openSave();
    } else {
      this.ui.toast('Không thể lưu (trình duyệt chặn localStorage).', 'bad');
    }
  }

  deleteSlot(slot: number) {
    const key = slot === 0 ? SAVE_PREFIX + 'auto' : SAVE_PREFIX + 'slot' + slot;
    try {
      localStorage.removeItem(key);
      localStorage.removeItem(key + '.bak');
      this.ui.toast('Đã xóa ô lưu.', 'info');
    } catch { /* ignore */ }
  }

  peekSlot(slot: number): GameState | null {
    try {
      const key = slot === 0 ? SAVE_PREFIX + 'auto' : SAVE_PREFIX + 'slot' + slot;
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as GameState;
      if (!parsed || !parsed.player) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  toTitle() {
    this.screen = 'title';
    this.scene.titleMode = true;
    this.eventQueue = [];
    this.ui.showTitle();
  }

  // --------------------------------------------------------------- actions --
  openShop() {
    if (this.world.state.time.phase !== 'morning') return;
    this.ensureAudio();
    this.world.openShop();
    audio.play('bell');
    this.ui.closeModal();
    this.ui.refresh();
    this.ui.toast('Cửa hàng mở cửa.', 'good');
  }

  endDay() {
    if (this.world.state.time.phase !== 'open') return;
    this.world.endDay();
    audio.play('paper');
    this.ui.showReport();
  }

  nextCustomer() {
    this.world.nextCustomer();
    this.ui.renderTrade();
  }

  dismissCustomer() {
    this.world.dismissActive('refused');
    this.ui.renderTrade();
  }

  refreshScene() {
    this.scene.lastBg = '';
    this.ui.refresh();
  }

  afterReport() {
    const s = this.world.state;
    if (s.settings.autosave) this.world.save(0);
    this.buildEveningEvents();
    this.showNextEvent();
  }

  afterEvent() {
    if (this.afterEventMode === 'morning') {
      this.afterEventMode = 'evening';
      this.beginMorning();
      return;
    }
    const s = this.world.state;
    if (s.player.day >= 30) {
      this.world.computeEnding();
      this.ui.showEnding();
      this.screen = 'ended';
      return;
    }
    this.showNextEvent();
  }

  afterChapter() {
    this.ui.closeModal();
    const fn = this.pendingAfterChapter;
    this.pendingAfterChapter = null;
    if (fn) fn();
    else this.beginMorning();
  }

  private buildEveningEvents() {
    const s = this.world.state;
    this.seenToday.clear();
    const out: EventDef[] = [];
    for (const id of MAIN_STORY_IDS) {
      const ev = eventById(id);
      if (!ev) continue;
      if (ev.day !== s.player.day) continue;
      if (ev.once !== false && s.seenEvents.includes(ev.id)) continue;
      out.push(ev);
    }
    const arcs = ARC_IDS.map((id) => eventById(id)).filter((ev): ev is EventDef => {
      if (!ev) return false;
      if (s.seenEvents.includes(ev.id)) return false;
      if (ev.minDay && s.player.day < ev.minDay) return false;
      if (ev.maxDay && s.player.day > ev.maxDay) return false;
      if (ev.condition && !ev.condition(s)) return false;
      return true;
    });
    if (arcs.length) out.push(arcs[Math.floor(this.world.rand() * arcs.length)]);
    if (this.world.rand() < 0.55) {
      const pool = EVENTS.filter((ev) => {
        if (!ARC_IDS.includes(ev.id) && !MAIN_STORY_IDS.includes(ev.id)) {
          if (ev.minDay && s.player.day < ev.minDay) return false;
          if (ev.maxDay && s.player.day > ev.maxDay) return false;
          if (ev.condition && !ev.condition(s)) return false;
          if (this.seenToday.has(ev.id)) return false;
          return true;
        }
        return false;
      });
      if (pool.length) {
        const total = pool.reduce((a, e) => a + (e.weight ?? 5), 0);
        let r = this.world.rand() * total;
        let pick = pool[0];
        for (const ev of pool) { r -= ev.weight ?? 5; if (r <= 0) { pick = ev; break; } }
        out.push(pick);
      }
    }
    this.eventQueue = out;
    if (!out.length) {
      s.journal.push({ day: s.player.day, text: 'Một buổi chiều yên tĩnh.', kind: 'system' });
    }
  }

  private showNextEvent() {
    const ev = this.eventQueue.shift();
    if (!ev) { this.finishDay(); return; }
    this.seenToday.add(ev.id);
    this.ui.showEvent(ev);
  }

  private finishDay() {
    const s = this.world.state;
    this.world.nextDay();
    this.ui.closeModal();
    this.ui.refresh();
    if (s.settings.autosave) this.world.save(0);
    const ch = CHAPTERS.find((c) => c.day === s.player.day);
    if (ch && !s.chapterIntroSeen.includes(ch.n)) {
      s.chapterIntroSeen.push(ch.n);
      this.pendingAfterChapter = () => this.beginMorning();
      this.ui.showChapter(ch.n);
      return;
    }
    this.beginMorning();
  }

  // ---------------------------------------------------------------- lookup --
  upgradeDef(id: string) { return UPGRADES[id]; }
  locationDef(id: string) { return LOCATIONS[id]; }
  npcDef(id: string) { return NPCS[id]; }
  itemDef(id: string) { return ITEMS[id]; }
}
