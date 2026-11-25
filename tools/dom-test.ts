// DOM acceptance test with jsdom: boot UI thật, audio giả, kéo thả, bán hàng,
// save/load, chuyển ngày, quest/event, nâng cấp nhìn thấy, và mọi nút có handler.
// Chạy: npx tsx tools/dom-test.ts
import { JSDOM } from 'jsdom';
import { performance as nodePerf } from 'node:perf_hooks';

const dom = new JSDOM(
  `<!doctype html><html lang="vi"><body><div id="stage">
     <canvas id="scene" width="1280" height="720"></canvas><div id="ui"></div>
   </div></body></html>`,
  { url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'dangerously' },
);
const win = dom.window as unknown as Record<string, any>;
const doc = dom.window.document;
win.localStorage.clear();

const g = globalThis as unknown as Record<string, any>;
for (const key of [
  'window', 'document', 'localStorage', 'HTMLElement', 'Element', 'Node',
  'Event', 'MouseEvent', 'KeyboardEvent', 'getComputedStyle',
]) g[key] = win[key];
g.requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(() => cb(nodePerf.now()), 16) as unknown as number;
g.cancelAnimationFrame = (id: number) => clearTimeout(id);

class FakeImage {
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  complete = false;
  naturalWidth = 0;
  naturalHeight = 0;
  private _src = '';
  get src(): string { return this._src; }
  set src(v: string) {
    this._src = v;
    this.complete = true;
    this.naturalWidth = 64;
    this.naturalHeight = 64;
    setTimeout(() => this.onload?.(), 0);
  }
}
g.Image = FakeImage; win.Image = FakeImage;

class FakeParam {
  value = 0;
  setValueAtTime(): void { /* noop */ }
  exponentialRampToValueAtTime(): void { /* noop */ }
  linearRampToValueAtTime(): void { /* noop */ }
}
let fakeAudio: any = null;
class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  oscStarts = 0;
  bufferStarts = 0;
  masterGain = 0.55;
  constructor() { fakeAudio = this; }
  createGain(): any {
    return {
      gain: new FakeParam(),
      connect: () => { /* noop */ },
      disconnect: () => { /* noop */ },
    };
  }
  createOscillator(): any {
    return {
      type: 'sine', frequency: new FakeParam(),
      connect: () => { /* noop */ },
      start: () => { this.oscStarts++; },
      stop: () => { /* noop */ },
    };
  }
  createBuffer(_ch: number, len: number): any {
    return { getChannelData: () => new Float32Array(len) };
  }
  createBufferSource(): any {
    return {
      buffer: null, loop: false,
      connect: () => { /* noop */ },
      start: () => { this.bufferStarts++; },
      stop: () => { /* noop */ },
    };
  }
  createBiquadFilter(): any {
    return { type: '', frequency: new FakeParam(), connect: () => { /* noop */ } };
  }
  resume(): Promise<void> { this.state = 'running'; return Promise.resolve(); }
}
g.AudioContext = FakeAudioContext; win.AudioContext = FakeAudioContext;

class PointerEventShim extends dom.window.MouseEvent {
  pointerType: string;
  constructor(type: string, init: MouseEventInit & { pointerType?: string } = {}) {
    super(type, init);
    this.pointerType = init.pointerType ?? 'mouse';
  }
}
g.PointerEvent = PointerEventShim; win.PointerEvent = PointerEventShim;

function recordingCtx(): { ctx: any; calls: Record<string, number> } {
  const calls: Record<string, number> = { fillRect: 0, strokeRect: 0, drawImage: 0, arc: 0 };
  const gradient = { addColorStop() { /* noop */ } };
  const ctx = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => gradient;
      if (prop === 'measureText') return () => ({ width: 10 });
      if (prop in calls) return () => { calls[prop]++; };
      return () => { /* noop */ };
    },
    set() { return true; },
  });
  return { ctx, calls };
}
const baseCtx = recordingCtx();
(dom.window as unknown as { HTMLCanvasElement: { prototype: { getContext: () => unknown } } })
  .HTMLCanvasElement.prototype.getContext = () => baseCtx.ctx;

const failures: string[] = [];
const check = (ok: unknown, msg: string): void => {
  if (ok) console.log('  ✓ ' + msg);
  else { console.log('  ✗ ' + msg); failures.push(msg); }
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const { Game } = await import('../src/game/game');
  const { audio } = await import('../src/game/audio');
  const { BG_FOR_LEVEL, UPGRADES } = await import('../src/game/data');
  const { callNext, buildQueue } = await import('../src/game/people');
  const { newTrade } = await import('../src/game/trade');
  const { totalItem } = await import('../src/game/inventory');
  const { addDebt } = await import('../src/game/economy');
  const { listSaves } = await import('../src/game/state');

  const canvas = doc.getElementById('scene') as HTMLCanvasElement;
  const root = doc.getElementById('ui') as HTMLElement;
  const game = new Game(canvas, root);
  const w = (): any => game.world;
  const $ = (sel: string) => doc.querySelector(sel) as HTMLElement | null;
  const $$ = (sel: string) => Array.from(doc.querySelectorAll(sel)) as HTMLElement[];
  const click = (sel: string): void => {
    const el = $(sel);
    if (!el) throw new Error('Thiếu phần tử ' + sel);
    el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  };
  const act = (action: string, value = ''): void => {
    game.handle({ type: 'action', action, value } as any);
  };
  const noOrphan = (): boolean => !game.ui.toasts.some((t) => t.text.startsWith('Chưa xử lý'));

  console.log('\n— boot, asset & nhạc nền —');
  await game.boot();
  await sleep(60);
  check(!!$('.title-card'), 'màn tiêu đề hiện ra');
  check(!!$('[data-act="newgame"]'), 'có nút ván mới');
  check(!$('[data-act="continue"]'), 'chưa có save → không hiện Tiếp ván');
  check($('#loading')?.innerHTML === '', 'loading biến mất sau preload');
  check($$('img').length > 0, 'HUD dùng ảnh asset pack thật');

  win.dispatchEvent(new dom.window.MouseEvent('pointerdown', { bubbles: true }));
  check(audio.isUnlocked(), 'cử chỉ đầu tiên mở khoá AudioContext');
  check(audio.isMusicActive(), 'nhạc nền được bật sau cử chỉ');
  await sleep(1000);
  check(!!fakeAudio && fakeAudio.oscStarts > 0, 'nhạc nền sinh oscillator thật');
  w().weather = 'storm'; audio.setWeather('storm');
  check(!!fakeAudio && fakeAudio.bufferStarts > 0, 'tiếng mưa sinh buffer thật');
  act('sound');
  check(!audio.isMusicActive() && !w().settings.sound, 'tắt âm thanh dừng nhạc nền');
  act('sound');
  check(audio.isMusicActive() && w().settings.sound, 'bật lại khởi động nhạc nền');

  console.log('\n— ván mới & nhập hàng —');
  click('[data-act="newgame"]');
  check(!game.ui.titleMode && w().phase === 'morning', 'ván mới vào buổi sáng');
  check(!!$('.modal-card.intro'), 'thiệp mở đầu chương 1');
  click('[data-act="modalclose"]');
  click('[data-act="phase"][data-value="procure"]');
  check(w().phase === 'procure', 'sang pha nhập hàng');
  click('[data-act="panel"][data-value="supply"]');
  check(game.ui.panel === 'supply', 'bảng nhà cung cấp mở');
  const buyBtn = $('[data-act="buy"]')!;
  const [sid, item, qty] = buyBtn.dataset.value!.split('|');
  const money0 = w().money, stock0 = w().suppliers[sid].stock[item].qty, item0 = totalItem(w(), item);
  buyBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  check(w().money < money0, 'mua hàng trừ tiền thật');
  check(w().suppliers[sid].stock[item].qty === stock0 - Number(qty), 'tồn kho nhà cung cấp giảm');
  check(totalItem(w(), item) === item0 + Number(qty), 'hàng giao ngay vào kho');
  check(noOrphan(), 'nút mua có handler thật');
  click('[data-act="panelclose"]');

  console.log('\n— kho: kéo thả, tách, sắp xếp, tìm —');
  act('panel', 'inventory');
  check(game.ui.panel === 'inventory' && $$('[data-grid]').length > 0, 'grid kho & kệ render');
  {
    const from = $('[data-grid="warehouse"][data-i="0"]')!;
    const to = $('[data-grid="shelves"][data-i="9"]')!;
    const sourceItem = w().warehouse.cells[0]?.item;
    const original = doc.elementFromPoint;
    (doc as any).elementFromPoint = () => to;
    from.dispatchEvent(new PointerEventShim('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
    win.dispatchEvent(new PointerEventShim('pointermove', { bubbles: true, clientX: 60, clientY: 60 }));
    win.dispatchEvent(new PointerEventShim('pointerup', { bubbles: true, clientX: 60, clientY: 60 }));
    (doc as any).elementFromPoint = original;
    check(w().warehouse.cells[0] === null, 'pointer drag chuyển hết chồng ra khỏi kho');
    check(w().shelves.cells[9]?.item === sourceItem, 'pointer drop đặt đúng ô kệ');
  }
  {
    const before = w().warehouse.cells.filter(Boolean).length;
    $('[data-grid="warehouse"][data-i="1"]')!.dispatchEvent(
      new dom.window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    );
    check(w().warehouse.cells.filter(Boolean).length === before + 1, 'chuột phải tách đôi chồng');
  }
  {
    const select = $('[data-field="sort"]') as HTMLSelectElement;
    select.value = 'qty';
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    check(game.ui.sort === 'qty', 'sắp xếp đổi state thật');
    let input = $('[data-field="search"]') as HTMLInputElement;
    input.value = 'gạo';
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    check(game.ui.search === 'gạo', 'tìm kiếm đổi state thật');
    input = $('[data-field="search"]') as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  }
  click('[data-act="merge"]');
  click('[data-act="restock"]');
  check(noOrphan(), 'gộp / bổ sung kệ có handler thật');
  click('[data-act="panelclose"]');

  console.log('\n— quầy: khay, kiểm hàng, mặc cả, chốt tiền —');
  click('[data-act="phase"][data-value="open"]');
  check(w().phase === 'open', 'mở cửa');
  w().minute = 1000;
  const c = callNext(w()) ?? (() => { buildQueue(w()); return callNext(w()); })()!;
  game.trade = newTrade(c.id);
  c.haggle = 0; c.budget = 100; c.request.maxPrice = 100;
  game.ui.render();
  check(!!game.customer() && !!$('[data-act="trayadd"]'), 'khách & kệ bấm nhanh hiện ra');
  click('[data-act="trayadd"]');
  check(game.trade?.lines.length === 1, 'bấm kệ đưa hàng lên khay');
  click('[data-act="inspect"]');
  check(game.trade?.inspected.length === 1, 'kiểm hàng ghi nhận');
  click('[data-act="price"][data-value="-5"]');
  check(game.trade?.discount === -0.05, 'nút giảm giá đổi % thật');
  click('[data-act="price"][data-value="reset"]');
  check(game.trade?.discount === 0, 'nút về giá hợp lý');
  click('[data-act="quote"]');
  check(game.trade?.reaction?.kind === 'accept', 'đưa giá có phản ứng NPC');
  const beforeTactic = game.trade!.price;
  click('[data-act="tactic"][data-value="small"]');
  check(game.trade!.price < beforeTactic, 'thương lượng bớt nhẹ đổi giá thật');
  click('[data-act="confirm"]');
  check(game.ui.modal?.kind === 'confirm' && !!$('.modal-sheet'), 'xác nhận hiện biên lai');
  const expected = game.trade!.price;
  const moneyBefore = w().money;
  const npc = game.customer()!.npc;
  const trustBefore = w().relations[npc].trust;
  const line = game.trade!.lines[0];
  const itemBefore = totalItem(w(), line.item);
  click('[data-act="doconfirm"]');
  check(w().money === moneyBefore + expected, `chốt đúng ${expected} đ vào két`);
  check(w().dayLog.trades === 1 && w().stats.trades === 1, 'sổ ghi đúng 1 giao dịch');
  check(totalItem(w(), line.item) === itemBefore - line.qty, 'hàng rời kệ đúng số lượng');
  check(w().relations[npc].trust > trustBefore, 'NPC phản ứng, tín nhiệm đổi');
  check(noOrphan(), 'mọi nút quầy có handler thật');

  console.log('\n— lưu / tải, không phát lại giao dịch —');
  act('panel', 'save');
  click('[data-act="save"][data-value="slot1"]');
  check(listSaves().find((s: any) => s.slot === 'slot1')?.valid === true, 'ô lưu thủ công hợp lệ');
  const tradesAtSave = w().dayLog.trades;
  click('[data-act="load"][data-value="slot1"]');
  check(w().dayLog.trades === tradesAtSave, 'tải lại không làm tăng số giao dịch');
  await sleep(120);
  check(w().dayLog.trades === tradesAtSave, 'sau vài frame vẫn không phát lại giao dịch');
  act('panelclose');

  console.log('\n— vòng ngày, quest, event —');
  game.ui.modal = null; game.ui.render();
  act('nextphase'); check(w().phase === 'report', 'chốt sổ');
  act('nextphase'); check(w().phase === 'evening', 'sang buổi tối');
  const dayBefore = w().day;
  act('nextphase');
  await sleep(500);
  check(w().day === dayBefore + 1, 'fade chuyển sang ngày mới');
  check(w().history.length >= 1 && w().dayLog.day === w().day, 'sổ ngày được đóng & mở mới');

  const qw = w();
  qw.day = 2; qw.phase = 'report'; qw.flags.last_quest_day = 0;
  for (const st of Object.values(qw.quests) as any[]) { st.status = 'locked'; st.choice = ''; }
  qw.quests.bowl.status = 'active'; qw.quests.bowl.choice = '';
  game.ui.modal = null; game.setPhase('evening');
  check(!!$('.modal-card.quest'), 'nhiệm vụ buổi tối hiện modal thật');
  click('[data-act="questchoice"]');
  check(w().quests.bowl.status === 'done', 'lựa chọn quest ghi kết quả');

  const ew = w();
  ew.phase = 'report'; ew.day = 5; ew.weather = 'storm'; ew.flags = {}; ew.eventsSeen = [];
  for (const st of Object.values(ew.quests) as any[]) { st.status = 'done'; st.choice = 'x'; }
  game.ui.modal = null; game.setPhase('evening');
  check(!!$('.modal-card.event'), 'sự kiện buổi tối hiện modal thật');
  click('[data-act="eventchoice"]');
  check(game.ui.modal?.kind === 'result', 'sự kiện có kết quả hệ quả');

  console.log('\n— nâng cấp đổi khung cảnh —');
  {
    const rec = recordingCtx();
    (game.scene as any).ctx = rec.ctx;
    const sw = w();
    sw.weather = 'clear'; sw.minute = 720; sw.settings.reduced = true; sw.shopLevel = 5;
    sw.upgrades = [];
    const input = { world: sw, dt: 0, customer: null, floaters: [], fade: 0, titleMode: false, trayCount: 0 };
    game.scene.draw(input as any);
    const baseline = rec.calls.fillRect;
    sw.upgrades = UPGRADES.map((u: any) => u.id);
    game.scene.draw(input as any);
    check(rec.calls.fillRect > baseline, 'nâng cấp vẽ thêm chi tiết lên nền');
    check(BG_FOR_LEVEL(1) !== BG_FOR_LEVEL(5), 'lên cấp đổi background asset');
  }

  console.log('\n— mọi data-act đều có handler —');
  game.newGame('normal');
  click('[data-act="modalclose"]');
  {
    const aw = w();
    aw.day = 10; aw.money = 500; aw.shopLevel = 5; aw.rep = 80; aw.community = 80;
    aw.phase = 'open'; aw.minute = 1000; aw.weather = 'clear'; aw.settings.autoPause = false;
    aw.activeCustomerId = null; buildQueue(aw);
    const ac = callNext(aw)!;
    game.trade = newTrade(ac.id);
    ac.haggle = 0; ac.budget = 100; ac.request.maxPrice = 100;
    addDebt(aw, 'Bà Tư', 'ba_tu', 10, aw.day, 'receivable');
    game.handle({ type: 'action', action: 'trayadd', value: '0' } as any);
    game.handle({ type: 'action', action: 'quote' } as any);
    game.handle({ type: 'action', action: 'save', value: 'slot1' } as any);
    game.ui.modal = null; game.ui.panel = null; game.ui.render();
  }
  const collected = new Map<string, { act: string; value: string }>();
  const collect = (label: string): void => {
    for (const el of $$('[data-act]')) {
      const a = el.dataset.act!, v = el.dataset.value ?? '';
      collected.set(`${a}|${v}`, { act: a, value: v });
    }
    console.log(`  · ${label}: ${$$('[data-act]').length} nút`);
  };
  collect('HUD / dock / counter');
  const panelIds = ['inventory', 'supply', 'ledger', 'map', 'journal', 'upgrade', 'save', 'help', 'settings'];
  for (const id of panelIds) {
    game.ui.modal = null; game.ui.panel = id as any; game.ui.render();
    collect('panel ' + id);
  }
  game.ui.panel = null; game.ui.titleMode = true; game.ui.render(); collect('title');
  game.ui.titleMode = false;
  const modals: any[] = [
    { kind: 'intro', title: 'Intro', text: '', choices: [{ label: 'Đóng', act: 'modalclose' }] },
    { kind: 'confirm', title: 'Confirm', text: '', choices: [
      { label: 'Chốt', act: 'doconfirm' }, { label: 'Mới', act: 'donewgame' }, { label: 'Tiếp', act: 'continue' },
    ] },
    { kind: 'quest', title: 'Quest', text: '', choices: [{ label: 'Chọn', act: 'questchoice', value: '0' }] },
    { kind: 'event', title: 'Event', text: '', choices: [{ label: 'Chọn', act: 'eventchoice', value: '0' }] },
    { kind: 'result', title: 'Result', text: '', choices: [
      { label: 'Ngày mới', act: 'phase', value: 'nextday' }, { label: 'Đóng', act: 'modalclose' },
    ] },
  ];
  for (const m of modals) { game.ui.showModal(m); collect('modal ' + m.kind); }
  game.ui.modal = null; game.ui.render();

  const implemented = new Set([
    'panel', 'panelclose', 'modalclose', 'pause', 'speed', 'nextphase', 'phase',
    'newgame', 'donewgame', 'continue', 'difficulty', 'sound', 'reduced',
    'autopause', 'autosort', 'merge', 'restock', 'buy', 'paydebt', 'npc',
    'travel', 'levelup', 'upgrade', 'hire', 'fire', 'save', 'load',
    'deletesave', 'trayadd', 'trayremove', 'cleartray', 'inspect', 'price',
    'quote', 'tactic', 'confirm', 'doconfirm', 'refuse', 'questchoice', 'eventchoice',
    'search', 'sort', 'filter',
  ]);
  check(collected.size > 35, `thu được ${collected.size} action khác nhau`);
  const unknown = [...collected.values()].filter((x) => !implemented.has(x.act)).map((x) => x.act);
  check(unknown.length === 0, `không có data-act lạ${unknown.length ? ': ' + [...new Set(unknown)].join(', ') : ''}`);
  for (const x of collected.values()) {
    game.ui.toasts = [];
    act(x.act, x.value);
    if (!noOrphan()) { check(false, `action "${x.act}" rơi vào default handler`); break; }
  }
  check(noOrphan(), 'không nút nào là nút giả');

  game.stop();
  audio.music(false);
  audio.toggle(false);
  try { dom.window.close(); } catch { /* noop */ }
  if (failures.length) {
    console.error(`\n✗ ${failures.length} kiểm thử DOM thất bại.`);
    process.exit(1);
  }
  console.log('\n✓ Tất cả kiểm thử DOM / UI đều đạt.');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
