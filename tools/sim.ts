// Headless acceptance simulation: 30 ngày × 3 độ khó, cộng kiểm thử từng hệ thống.
// Không DOM, không asset, không audio — chạy được trong Node: npm run sim
import {
  A, DIFFICULTY, ENDINGS, ITEMS, NPCS, QUESTS, EVENTS,
} from '../src/game/data';
import type { Difficulty } from '../src/game/types';
import {
  blankDayLog, deleteSave, listSaves, loadWorld, makeStack, migrate, newWorld,
  rnd, SAVE_VERSION, saveWorld, setStorage,
} from '../src/game/state';
import {
  collectDebts, dailyCosts, fairSell, marketStep, payDebt, procure,
  resolveDeliveries, restockSuppliers, rollWeather, supplierPrice,
} from '../src/game/economy';
import {
  mergeAll, move, place, quickRestock, resizeGrids, sortGrid, spoil,
  split, totalItem, visible, wantedSize,
} from '../src/game/inventory';
import { activeCustomer, buildQueue, callNext, tickPatience } from '../src/game/people';
import {
  addLine, applyTactic, baseTotal, commit, decide, newTrade, quote, refuse,
} from '../src/game/trade';
import {
  chooseEvent, chooseQuest, endingFor, finishRun, pendingQuest, pickEvent,
  updateChapter, updateQuests,
} from '../src/game/story';
import { buyUpgrade, checkLevel, travel } from '../src/game/progression';
import { addDebt } from '../src/game/economy';

const failures: string[] = [];
const need = (ok: unknown, msg: string): void => {
  if (ok) return;
  failures.push(msg);
  console.error('  ✗ ' + msg);
};
const section = (s: string): void => console.log('\n— ' + s + ' —');

// Bộ nhớ lưu tách biệt, không đụng localStorage của trình duyệt.
const store = new Map<string, string>();
setStorage({
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => { store.set(k, v); },
  removeItem: (k) => { store.delete(k); },
});

// ── 1. Dữ liệu & asset URL ─────────────────────────────────────────────────
section('dữ liệu & tiền tệ');
need(DIFFICULTY.story.money > DIFFICULTY.normal.money && DIFFICULTY.normal.money > DIFFICULTY.hard.money, '3 độ khó có vốn khác nhau');
need(NPCS.length >= 20 && NPCS.filter((n) => n.arc).length >= 8, '20+ NPC, 8+ arc');
need(QUESTS.length >= 10 && EVENTS.length >= 15, 'nhiệm vụ & sự kiện đủ dày');
need(ENDINGS.length >= 3, 'nhiều kết thúc');
need(A('items/food/rice_white.png').includes('assets/items/food/rice_white.png'), 'A() tạo URL asset pack');
{
  const a = newWorld(424242, 'hard'), b = newWorld(424242, 'hard');
  need(JSON.stringify(a.suppliers) === JSON.stringify(b.suppliers), 'cùng seed → cùng nguồn hàng');
  need(a.rng === b.rng, 'cùng seed → cùng trạng thái RNG');
  for (let i = 0; i < 25; i++) need(rnd(a) === rnd(b), 'RNG lặp được ở nhịp ' + i);
}

// ── 2. Kho: kéo/thả, gộp, tách, sắp xếp, lọc, hư hỏng ──────────────────────
section('kho & kệ');
{
  const w = newWorld(101, 'normal');
  const qty0 = w.warehouse.cells[0]!.qty;
  const moved = move(w, 'warehouse', 0, 'shelves', 0, 2); // gộp vào chồng gạo trên kệ
  need(moved.ok && w.warehouse.cells[0]?.qty === qty0 - 2, 'kéo 2 gạo sang kệ, kho giảm đúng');
  need(w.shelves.cells[0]?.qty === 4, 'gộp đúng vào chồng cùng phẩm chất');
  const beforeCells = w.warehouse.cells.filter(Boolean).length;
  const sp = split(w, 'warehouse', 1);
  need(sp.ok && w.warehouse.cells.filter(Boolean).length === beforeCells + 1, 'tách đôi chồng');
  const merged = mergeAll(w, 'warehouse');
  need(merged > 0, 'gộp các chồng tương thích');
  const orderBefore = w.warehouse.cells.map((c) => c?.item ?? ':').join(',');
  sortGrid(w, 'warehouse', 'qty');
  need(w.warehouse.cells.map((c) => c?.item ?? ':').join(',') !== orderBefore, 'sắp xếp đổi vị trí thật');
  need(visible(w, { search: 'gạo', cat: 'all', grid: 'warehouse' }).length > 0, 'tìm kiếm trả ô thật');
  place(w, 'warehouse', 'water_spinach', 2, 1, 'test');
  const freshBefore = totalItem(w, 'water_spinach');
  spoil(w); spoil(w); spoil(w);
  need(totalItem(w, 'water_spinach') < freshBefore, 'rau héo rồi hư hẳn');
  need(totalItem(w, 'damaged_goods') > 0, 'hàng hư thành mặt hàng thật');
  need(w.dayLog.spoilage > 0, 'sổ ngày ghi hư hỏng');
  const h0 = wantedSize(w, 'shelves').h;
  w.money = 500;
  need(buyUpgrade(w, 'shelves').ok, 'mua thêm kệ');
  need(wantedSize(w, 'shelves').h === h0 + 1 && w.shelves.cells.length === 5 * (h0 + 1), 'kệ nới ô thật, có thể nhìn thấy');
  need(!buyUpgrade(w, 'shelves').ok, 'không mua trùng nâng cấp');
  need(!travel(w, 'staging').ok, 'địa điểm khoá không đi được');
  need(travel(w, 'market').ok && w.travelUsed, 'đi chợ tốn lượt thật');
  need(!travel(w, 'river').ok, 'mỗi ngày chỉ đi một chuyến');
}

// ── 3. Nhập hàng, chuyến giao, công nợ ─────────────────────────────────────
section('cung ứng & công nợ');
{
  const w = newWorld(202, 'normal');
  const money = w.money, stock = w.suppliers.ong_nam.stock.corn.qty, corn = totalItem(w, 'corn');
  const buy = procure(w, 'ong_nam', 'corn', 2, 'cash');
  need(buy.ok, 'mua ngô từ ông Năm');
  need(w.money < money && w.suppliers.ong_nam.stock.corn.qty === stock - 2, 'trừ tiền & tồn kho nhà cung cấp');
  need(totalItem(w, 'corn') === corn + 2, 'hàng giao ngay vào kho, không đợi ngày mai');
  const money2 = w.money;
  const tooMuch = procure(w, 'ong_nam', 'corn', 999, 'cash');
  need(!tooMuch.ok && w.money === money2, 'mua quá tồn kho bị từ chối, không trừ tiền');
  const unit = supplierPrice(w, 'ong_chin', 'rice_white', 1, 'order');
  need(unit > 0 && unit < 500, 'giá đặt trước nằm trong biên hợp lý');
  const order = procure(w, 'ong_chin', 'rice_white', 2, 'order');
  need(order.ok && w.deliveries.length === 1, 'đặt chuyến có hẹn');
  const beforeRice = totalItem(w, 'rice_white');
  resolveDeliveries(w);
  need(w.deliveries.length === 1 && totalItem(w, 'rice_white') === beforeRice, 'chuyến chưa tới hạn không phát hàng');
  w.deliveries[0].due = w.day;
  resolveDeliveries(w);
  need(w.deliveries.length === 0 && totalItem(w, 'rice_white') > beforeRice, 'chuyến tới hạn phát hàng thật');
  addDebt(w, 'Bà Tư', 'ba_tu', 10, w.day, 'receivable');
  const cash = w.money;
  need(payDebt(w, w.debts[0].id).ok && w.money === cash + 10, 'thu nợ vào két đúng số tiền');
  need(w.debts.length === 0, 'khoản nợ xong thì xoá khỏi sổ');
}

// ── 4. Giao dịch: phản ứng, giá chính xác, quan hệ, biên ─────────────────────
section('quầy giao dịch');
{
  const w = newWorld(303, 'normal');
  buildQueue(w); w.minute = 1000;
  const c = callNext(w)!;
  c.haggle = 0; // khách này chắc chắn nhận giá hợp lý để kiểm số tiền chính xác
  c.budget = 100; c.request.maxPrice = 100; // cô lập biến ngân sách để kiểm đúng số tiền
  const idx = w.shelves.cells.findIndex((s) => s && s.qty > 0);
  const stack = w.shelves.cells[idx]!;
  const t = newTrade(c.id);
  need(addLine(w, t, 'shelves', idx, 1).ok, 'kéo một món lên khay');
  const q = quote(w, t, c);
  need(q.kind === 'accept', 'đưa giá có phản ứng chấp nhận');
  const price = t.price, money = w.money, trust = w.relations[c.npc].trust, itemCount = totalItem(w, stack.item);
  const result = commit(w, t, c, true);
  need(result.ok && w.money === money + price, `tiền vào két đúng ${price} đ`);
  need(w.dayLog.revenue === price && w.stats.trades === 1, 'sổ ngày ghi đúng 1 giao dịch');
  need(totalItem(w, stack.item) === itemCount - 1, 'hàng rời kệ đúng 1 cái');
  need(w.relations[c.npc].trust > trust, 'NPC nhớ giao dịch, quan hệ đổi');
  need(!commit(w, t, c, true).ok, 'không chốt lại giao dịch đã ghi sổ');
  const empty = newTrade('empty');
  need(!commit(w, empty, c, true).ok && w.money === money + price, 'khay trống không tạo tiền');
  need(!addLine(w, newTrade('x'), 'warehouse', 99, 1).ok, 'kéo ô không tồn tại bị từ chối');
}
{
  const w = newWorld(304, 'normal');
  w.shelves.cells.fill(null);
  for (let i = 0; i < 7; i++) w.shelves.cells[i] = makeStack(w, 'salt', 1, 1, 'test');
  const t = newTrade('c');
  for (let i = 0; i < 7; i++) {
    const r = addLine(w, t, 'shelves', i);
    if (i < 6) need(r.ok, `khay nhận món ${i + 1}`);
    else need(!r.ok && t.lines.length === 6, 'khay chặn đúng 6 món');
  }
}
{
  const w = newWorld(305, 'normal');
  buildQueue(w); w.minute = 1000;
  const c = callNext(w)!;
  c.patience = 0.1;
  const left = tickPatience(w, 0.2);
  need(left.includes(c) && w.activeCustomerId === null, 'khách đang ở quầy vẫn có kiên nhẫn thật');
  need(w.stats.missed === 1 && w.dayLog.missed === 1, 'khách bỏ đi ghi vào thống kê');
}
{
  const w = newWorld(306, 'normal');
  buildQueue(w); w.minute = 1000;
  const c = callNext(w)!;
  const idx = w.shelves.cells.findIndex((s) => s && s.qty > 0);
  const t = newTrade(c.id);
  addLine(w, t, 'shelves', idx, 1);
  if (c.request.barter) need(applyTactic(w, t, c, 'barter').includes('Đổi'), 'đổi hàng có phản hồi');
  else need(applyTactic(w, t, c, 'barter').includes('không mang'), 'không có đồ đổi thì báo rõ');
  applyTactic(w, t, c, 'credit');
  need(t.mode === 'credit' && t.price === baseTotal(t), 'mua chịu ghi đúng giá gốc');
  need(applyTactic(w, t, c, 'big').includes('Bớt'), 'bớt giá đổi số tiền thật');
  const d1 = decide(w, t, c, t.price), d2 = decide(w, t, c, t.price);
  need(d1.accept === d2.accept && d1.kind === d2.kind && d1.counter === d2.counter,
    'quyết định mặc cả không đổi ngẫu nhiên giữa hai lần gọi');
}

// ── 5. Nhiệm vụ, sự kiện, lưu/tải, migration ────────────────────────────────
section('cốt truyện & save');
{
  const w = newWorld(404, 'normal');
  w.day = 2; updateChapter(w);
  const q = updateQuests(w);
  need(q?.id === 'bowl', 'quest ngày 2 mở đúng lúc');
  const res = chooseQuest(w, 'bowl', 1);
  need(w.quests.bowl.status === 'done' && w.quests.bowl_2.status === 'active', 'quyết định mở tiếp chương mới');
  need(w.community > 50 && res.effects.length > 0, 'lựa chọn có hệ quả thật');
  w.day = 5; w.weather = 'storm'; w.flags = {};
  for (const st of Object.values(w.quests)) { st.status = 'done'; st.choice = 'x'; }
  const e = pickEvent(w);
  need(!!e, 'sự kiện tối chọn được theo điều kiện');
  if (e) need(chooseEvent(w, e.id, 0).text.length > 0 && w.eventsSeen.includes(e.id), 'sự kiện ghi vào nhật ký');
}
{
  const w = newWorld(505, 'normal');
  w.money = 77; w.day = 9; w.dayLog.trades = 3;
  w.activeCustomerId = 'dangling';
  w.queue = [{ ...buildQueue(w)[0], state: 'active' } as typeof w.queue[number]];
  saveWorld(w, 'slot1');
  const loaded = loadWorld('slot1');
  need(!!loaded, 'tải ô lưu hợp lệ');
  need(loaded?.day === 9 && loaded?.money === 77, 'ngày & tiền khôi phục');
  need(loaded?.dayLog.trades === 3, 'giao dịch xong không phát lại sau khi tải');
  need(loaded?.activeCustomerId === null, 'con trỏ khách đang dở được dọn');
  need(loaded?.queue.every((c) => c.state !== 'active'), 'không phát lại giao dịch đang dở');
  need(listSaves().find((s) => s.slot === 'slot1')?.valid === true, 'danh sách ô lưu hiện trạng');
  deleteSave('slot1');
  need(!loadWorld('slot1'), 'xoá ô lưu có thật');
  saveWorld(w, 'slot2');
  w.money = 78; saveWorld(w, 'slot2'); // lần 2 tạo .bak từ bản lưu lần 1
  store.set('vn1945.v3.slot2', '{ hỏng');
  need(!loadWorld('slot2'), 'JSON hỏng không crash, trả null');
  const backup = store.get('vn1945.v3.slot2.bak');
  need(!!backup, 'mỗi ô lưu có bản .bak');
  const env = JSON.parse(backup ?? '{}');
  env.v = 1; env.world.version = 1; env.world.activeCustomerId = 'abc';
  const migrated = migrate(env);
  need(migrated?.version === SAVE_VERSION && migrated?.activeCustomerId === null, 'save cũ được migrate & không phát lại giao dịch');
  need(!!migrated && migrated.day === 9, 'migration giữ ngày chơi');
}

section('nhiều kết thúc theo cách chơi');
{
  const w = newWorld(606, 'normal');
  w.money = 0; w.rep = 0; w.community = 0;
  need(endingFor(w).id === 'faded', 'kết thúc lặng lẽ khi két & uy tín kiệt');
  w.money = 100; w.rep = 50; w.community = 100; w.stats.helped = 20; w.flags.aim_community = 1;
  need(endingFor(w).id === 'community', 'kết thúc cửa tiệm của xóm');
  w.money = 500; w.rep = 50; w.community = 0; w.stats.helped = 0; w.flags.aim_community = 0;
  w.shopLevel = 5; w.suppliers.ong_chin.bond = 100; w.flags.contract = 1;
  need(endingFor(w).id === 'merchant', 'kết thúc nhà buôn');
  w.money = 20; w.rep = 100; w.community = 0; w.flags.contract = 0; w.shopLevel = 1;
  w.suppliers.ong_chin.bond = 0; w.flags.ledger_kind = 1;
  for (const r of Object.values(w.relations)) r.trust = 100;
  need(endingFor(w).id === 'trusted', 'kết thúc người giữ chữ tín');
  w.money = 20; w.rep = 35; w.community = 20; w.family = 20; w.flags.aim_self = 1;
  w.flags.ledger_kind = 0;
  for (const r of Object.values(w.relations)) r.trust = 0;
  need(endingFor(w).id === 'family', 'kết thúc gia đình bình yên');
}

// ── 6. Mô phỏng 30 ngày × 3 độ khó ─────────────────────────────────────────
function procureFor(w: ReturnType<typeof newWorld>): void {
  const plan: [string, string, number, 'cash' | 'order'][] = [
    ['ong_nam', 'corn', 2, 'cash'],
    ['ong_to', 'rice_old', 2, 'cash'],
    ['ong_chin', 'rice_white', 2, 'order'],
    ['anh_vuong', 'dried_fish', 1, 'cash'],
    ['ba_cuc', 'water_spinach', 3, 'cash'], // rau mau héo: bảo đảm có hư hỏng thật
  ];
  for (const [sid, item, qty, mode] of plan) {
    if (w.money < 45) break;
    const stock = w.suppliers[sid]?.stock[item]?.qty ?? 0;
    if (stock >= qty) procure(w, sid, item, qty, mode);
  }
}

function autoServe(w: ReturnType<typeof newWorld>): void {
  const c = activeCustomer(w);
  if (!c) return;
  const options = w.shelves.cells
    .map((s, i) => ({ s, i }))
    .filter((x): x is { s: NonNullable<typeof x.s>; i: number } => !!x.s && x.s.qty > 0);
  if (!options.length) { refuse(w, newTrade(c.id), c); return; }
  const exact = options.find((x) => x.s.item === c.request.item);
  const chosen = exact ?? options[0];
  const qty = Math.min(c.request.qty, chosen.s.qty);
  const t = newTrade(c.id);
  if (!addLine(w, t, 'shelves', chosen.i, qty).ok) { refuse(w, t, c); return; }
  quote(w, t, c);
  for (let k = 0; k < 5; k++) {
    if (decide(w, t, c, t.price).accept) break;
    applyTactic(w, t, c, k === 0 && t.counter > 0 ? 'acceptCounter' : 'big');
  }
  commit(w, t, c, true); // nếu vẫn từ chối, onTradeDone đã dọn khách, không replay
}

function archive(w: ReturnType<typeof newWorld>): void {
  if (w.history[w.history.length - 1]?.day === w.day) return;
  w.history.push({ ...w.dayLog });
  if (w.history.length > 40) w.history.shift();
}

function runOpen(w: ReturnType<typeof newWorld>): void {
  w.phase = 'open'; w.minute = 480;
  buildQueue(w);
  let guard = 0;
  while (w.minute < 1020 && guard++ < 500) {
    const c = activeCustomer(w) ?? callNext(w);
    if (c) { autoServe(w); continue; }
    const future = w.queue
      .filter((x) => x.state === 'waiting' && x.arrive > w.minute)
      .map((x) => x.arrive);
    const target = future.length ? Math.min(...future) : 1020;
    w.minute += Math.max(1, Math.min(60, Math.max(1, target - w.minute)));
    tickPatience(w, 0.12);
  }
  need(guard < 500, 'vòng lặp mở cửa không kẹt');
  for (const c of w.queue) if (c.state === 'active' || c.state === 'waiting') c.state = 'left';
  w.activeCustomerId = null;
  w.phase = 'report'; w.minute = 1020;
}

function evening(w: ReturnType<typeof newWorld>): void {
  w.phase = 'evening'; w.minute = 1110;
  const q = pendingQuest(w) ?? updateQuests(w);
  if (q) chooseQuest(w, q.id, w.day % Math.max(1, q.choices.length));
  else {
    const e = pickEvent(w);
    if (e) chooseEvent(w, e.id, 0);
  }
}

function advance(w: ReturnType<typeof newWorld>): void {
  archive(w);                         // quyết định buổi tối đã nằm trong sổ ngày
  w.day += 1;
  w.dayLog = blankDayLog(w.day);      // hư hỏng / nợ / lương đêm ghi vào sổ ngày mới
  w.flags.delivery_late = 0;
  rollWeather(w);
  marketStep(w);
  restockSuppliers(w);
  resolveDeliveries(w);
  w.flags.route_fixed = 0;
  spoil(w);
  collectDebts(w);
  dailyCosts(w);
  updateChapter(w);
  updateQuests(w);
  checkLevel(w);
  resizeGrids(w);
  w.phase = 'morning'; w.minute = 360; w.paused = false;
  w.queue = []; w.activeCustomerId = null; w.travelUsed = false; w.location = 'shop';
}

for (const diff of Object.keys(DIFFICULTY) as Difficulty[]) {
  section(`30 ngày · ${DIFFICULTY[diff].name}`);
  const w = newWorld(1945 + diff.length * 7919, diff);
  resizeGrids(w); marketStep(w); updateChapter(w); updateQuests(w);
  const prices: number[] = [];
  const weather = new Set<string>();
  const firstMoney = w.money;
  while (w.day <= w.maxDays) {
    weather.add(w.weather);
    quickRestock(w);                  // xếp kệ từ hàng cũ
    procureFor(w);                    // rau mới mua nằm lại kho, chờ hư thật
    runOpen(w);
    evening(w);
    prices.push(fairSell(w, 'rice_white'));
    if (w.day < w.maxDays) advance(w);
    else { archive(w); finishRun(w); break; }
  }
  const spoiled = w.history.reduce((n, h) => n + h.spoilage, 0);
  const doneQuests = Object.values(w.quests).filter((q) => q.status === 'done').length;
  const boundedStock = Object.values(w.suppliers).every((s) =>
    Object.values(s.stock).every((x) => x.qty <= 16));
  const saneMoney = w.history.every((h) => Number.isFinite(h.revenue) && Number.isFinite(h.cost));
  need(w.day === 30 && w.phase === 'ending' && !!w.ending, `${diff}: tới ngày 30 & có kết thúc`);
  need(w.history.length === 30, `${diff}: 30 bản chốt sổ`);
  need(w.stats.served > 20, `${diff}: phục vụ ${w.stats.served} khách (>20)`);
  need(w.money >= 0 && Number.isFinite(w.money) && saneMoney, `${diff}: tiền không âm / không NaN`);
  need(prices.every((p) => p >= 1 && p < 500), `${diff}: giá gạo trong biên`);
  need(weather.size >= 2, `${diff}: thời tiết thay đổi`);
  need(spoiled > 0, `${diff}: có hư hỏng thật (${spoiled})`);
  need(doneQuests > 0 && w.eventsSeen.length > 0, `${diff}: quest & event được chơi (${doneQuests}/${w.eventsSeen.length})`);
  need(boundedStock, `${diff}: nguồn hàng có hạn, không vô cực`);
  need(w.journal.length > 30, `${diff}: nhật ký có nội dung`);
  console.log(`  ${diff}: tiền ${firstMoney}→${w.money} đ · khách ${w.stats.served} · bỏ đi ${w.stats.missed} · hư ${spoiled} · cấp ${w.shopLevel} · kết thúc ${w.ending}`);
  console.log(`  giá gạo min ${Math.min(...prices)} / max ${Math.max(...prices)} · thời tiết ${[...weather].join(', ')}`);
}

section('kết luận');
if (failures.length) {
  console.error(`\n✗ ${failures.length} kiểm thử thất bại.`);
  process.exit(1);
}
console.log('\n✓ Tất cả kiểm thử mô phỏng headless đều đạt.');
