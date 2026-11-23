// Modal panels: inventory, prices, suppliers, debts, quests, journal, shop, map, save, settings, family, help.
import type { UI } from './ui';
import type { InvItem, Shelf, DayStats } from './types';
import {
  ITEMS, ITEM_LIST, CATEGORY_LABEL, QUALITY_LABEL, QUALITY_COLOR, UPGRADES, QUESTS,
  SUPPLIERS, LOCATIONS, LENDERS, NPCS, CHAPTERS,
} from './data';
import { fmtMoney, dateLabel, relationshipLabel, reputationLabel, weatherLabel } from './systems';
import { audio } from './audio';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const A = (p: string) => (p && !p.startsWith('/') ? '/' + p : p);
const iconOf = (id: string) => {
  const it = ITEMS[id];
  return it ? A(it.icon) : '';
};
const qColor = (q: number) => QUALITY_COLOR[Math.max(0, Math.min(3, q))] ?? QUALITY_COLOR[1];
const qLabel = (q: number) => QUALITY_LABEL[Math.max(0, Math.min(3, q))] ?? '';

export const CATEGORY_ORDER = ['food', 'household', 'materials', 'medicine', 'valuables', 'special'] as const;

function freshnessClass(f: number): string {
  return f > 60 ? 'fresh' : f > 30 ? 'mid' : 'low';
}

function bar(pct: number, cls = ''): string {
  const p = Math.max(0, Math.min(100, pct));
  return `<div class="bar ${cls}"><i style="width:${p}%"></i></div>`;
}

function itemChip(id: string, qty?: number): string {
  const it = ITEMS[id];
  if (!it) return '';
  return `<span class="item-chip"><img src="${A(it.icon)}" alt="">${esc(it.name)}${qty !== undefined ? ` ×${qty}` : ''}</span>`;
}

// --------------------------------------------------------------- inventory --
export function renderInventoryPanel(ui: UI) {
  const w = ui.world;
  const s = ui.state;
  const slots = w.warehouseSlots();
  const cols = s.warehouse.cols;
  const weight = w.inventoryWeight();
  const cap = w.weightCap();
  const shelfCount = w.shelfCount();
  const shelves = s.shelves.slice(0, shelfCount);
  const q = ui.search.trim().toLowerCase();
  const filtered = s.inventory.filter((inv) => {
    const it = ITEMS[inv.itemId];
    if (!it) return false;
    if (ui.filter !== 'all' && it.cat !== ui.filter) return false;
    if (q && !it.name.toLowerCase().includes(q)) return false;
    return true;
  });
  const visible = new Set(filtered.map((i) => i.slot));

  const slotHtml = (i: number) => {
    const inv = s.inventory.find((x) => x.slot === i);
    if (!inv) return `<div class="slot empty" data-slot="${i}"></div>`;
    const it = ITEMS[inv.itemId];
    const sel = ui.selectedUid === inv.uid ? ' selected' : '';
    const hide = !visible.has(i) ? ' dimmed' : '';
    return `<div class="slot${sel}${hide}" data-slot="${i}" data-uid="${inv.uid}" data-action="select-item" title="${esc(it?.name ?? '')} ×${inv.qty} · ${qLabel(inv.quality)}">
      <img src="${A(it?.icon ?? '')}" alt="">
      <span class="qty">${inv.qty}</span>
      <span class="qual" style="background:${qColor(inv.quality)}"></span>
      <span class="fresh ${freshnessClass(inv.freshness)}" style="width:${Math.max(0, inv.freshness)}%"></span>
    </div>`;
  };

  const selected = s.inventory.find((i) => i.uid === ui.selectedUid);
  const selIt = selected ? ITEMS[selected.itemId] : null;

  const shelfHtml = shelves.map((sh: Shelf) => {
    const it = sh.itemId ? ITEMS[sh.itemId] : null;
    const price = sh.itemId ? w.shelfPrice(sh) : 0;
    const capSh = sh.itemId ? w.shelfCapacity(sh.itemId) : 20;
    return `<div class="shelf-card ${it ? '' : 'empty'}" data-action="shelf-restock" data-shelf="${sh.id}" title="Bày hàng lên kệ">
      <div class="shelf-no">Kệ ${sh.id + 1}</div>
      ${it ? `<img src="${A(it.icon)}" alt="">
        <div class="shelf-name">${esc(it.name)}</div>
        <div class="shelf-qty">${sh.qty}/${capSh}</div>
        <div class="shelf-price">${fmtMoney(price)} đ</div>
        <div class="shelf-q" style="color:${qColor(sh.quality)}">${qLabel(sh.quality)}</div>` : '<div class="shelf-empty">Trống</div>'}
    </div>`;
  }).join('');

  ui.openModal(`
    ${ui.panelHead('Kho hàng & kệ', `Ngày ${s.player.day} · ${esc(dateLabel(s))} · ${esc(weatherLabel(s.weather.today))}`)}
    <div class="body">
      <div class="inv-wrap">
        <div class="inv-main">
          <div class="inv-toolbar">
            <div class="searchbox"><img src="/assets/ui/icons/action_search.png" alt=""><input type="text" placeholder="Tìm hàng..." value="${esc(ui.search)}" data-field="search"></div>
            <div class="chips">
              <button class="chip ${ui.filter === 'all' ? 'on' : ''}" data-action="filter" data-cat="all">Tất cả</button>
              ${CATEGORY_ORDER.map((c) => `<button class="chip ${ui.filter === c ? 'on' : ''}" data-action="filter" data-cat="${c}">${CATEGORY_LABEL[c]}</button>`).join('')}
            </div>
            <div class="chips">
              ${(['category', 'qty', 'value', 'quality'] as const).map((m) => `<button class="chip ${ui.sortMode === m ? 'on' : ''}" data-action="sort" data-mode="${m}">${{ category: 'Loại', qty: 'Số lượng', value: 'Giá trị', quality: 'Chất lượng' }[m]}</button>`).join('')}
            </div>
          </div>
          <div class="inv-meta">
            <span>Kho: <b>${s.inventory.length}</b>/${slots} ô</span>
            <span>Tải trọng: <b>${weight.toFixed(1)}</b>/${cap}</span>
            <span>Kệ: <b>${shelves.filter((x) => x.itemId).length}</b>/${shelfCount}</span>
          </div>
          <div class="inv-grid" style="grid-template-columns:repeat(${cols},1fr)">
            ${Array.from({ length: slots }, (_, i) => slotHtml(i)).join('')}
          </div>
          <div class="small dim" style="margin-top:6px">Kéo một chồng hàng sang ô khác để sắp xếp. Bấm vào món để xem chi tiết.</div>
          <div style="margin-top:6px"><button class="btn small" data-action="auto-restock" title="Bày hàng trong kho lên mọi kệ đang trống, món đắt trước">Bày hàng tự động</button></div>
          <div class="shelf-strip">${shelfHtml}</div>
        </div>
        <div class="inv-side">
          ${selIt && selected ? `
            <div class="side-icon" style="border-color:${qColor(selected.quality)}"><img src="${A(selIt.icon)}" alt=""></div>
            <h3>${esc(selIt.name)}</h3>
            <div class="kv"><span>Loại</span><b>${CATEGORY_LABEL[selIt.cat]}</b></div>
            <div class="kv"><span>Số lượng</span><b>${selected.qty}</b></div>
            <div class="kv"><span>Chất lượng</span><b style="color:${qColor(selected.quality)}">${qLabel(selected.quality)}</b></div>
            <div class="kv"><span>Độ tươi</span><b>${Math.round(selected.freshness)}%</b></div>
            <div class="kv"><span>Giá mua</span><b>${fmtMoney(selected.cost)} đ</b></div>
            <div class="kv"><span>Giá thị trường</span><b>${fmtMoney(w.fairSell(selected.itemId))} đ</b></div>
            <div class="kv"><span>Cân nặng</span><b>${selIt.weight.toFixed(2)}</b></div>
            <p class="small muted">${esc(selIt.desc)}</p>
            ${selected.freshness <= 30 && selIt.perish > 0 ? '<div class="pill bad">Sắp hư — nên bán sớm</div>' : ''}
            <div class="side-actions">
              <button class="btn small" data-action="to-shelf" data-uid="${selected.uid}">Bày lên kệ</button>
              ${selected.qty > 1 ? `<button class="btn small" data-action="split" data-uid="${selected.uid}">Tách chồng</button>` : ''}
              ${selIt.cat === 'food' ? `<button class="btn small" data-action="family-food" data-uid="${selected.uid}">Để dành cho gia đình</button>` : ''}
              <button class="btn small danger" data-action="discard" data-uid="${selected.uid}">Bỏ đi</button>
            </div>
          ` : '<div class="small muted">Chọn một món trong kho để xem chi tiết.</div>'}
        </div>
      </div>
    </div>
    <div class="foot">
      <span class="small dim">Kéo thả để sắp xếp · Tách chồng để chia nhỏ</span>
      <button class="btn" data-action="close-modal">Đóng</button>
    </div>
  `, 'inv-modal');
}

export function renderShelfPicker(ui: UI, uid: number) {
  const w = ui.world;
  const inv = ui.state.inventory.find((i) => i.uid === uid);
  if (!inv) return;
  const cap = w.shelfCapacity(inv.itemId);
  const rows = ui.state.shelves.slice(0, w.shelfCount()).map((sh) => {
    const ok = !sh.itemId || sh.itemId === inv.itemId;
    const free = ok ? cap - sh.qty : 0;
    const it = sh.itemId ? ITEMS[sh.itemId] : null;
    return `<button class="pick-row ${ok && free > 0 ? '' : 'off'}" data-action="shelf-pick" data-shelf="${sh.id}" data-uid="${uid}" data-qty="${Math.min(inv.qty, free)}" ${ok && free > 0 ? '' : 'disabled'}>
      <span class="pr-name">Kệ ${sh.id + 1}</span>
      <span class="pr-sub">${it ? esc(it.name) : 'Trống'} · còn ${free}/${cap}</span>
      <span class="pr-val">${ok && free > 0 ? `Bày ${Math.min(inv.qty, free)}` : 'Không thể'}</span>
    </button>`;
  }).join('');
  ui.openModal(`
    ${ui.panelHead('Bày hàng lên kệ', `${esc(ITEMS[inv.itemId]?.name ?? '')} ×${inv.qty}`)}
    <div class="body"><div class="pick-list">${rows || '<div class="small muted">Chưa có kệ trống.</div>'}</div></div>
    <div class="foot"><button class="btn" data-action="close-modal">Quay lại</button></div>
  `, 'small-modal');
}

export function renderStockPicker(ui: UI, shelfId: number) {
  const w = ui.world;
  const sh = ui.state.shelves.find((x) => x.id === shelfId);
  if (!sh) return;
  const cap = sh.itemId ? w.shelfCapacity(sh.itemId) : 20;
  const list = ui.state.inventory.filter((i) => !sh.itemId || i.itemId === sh.itemId);
  const rows = list.map((inv) => {
    const it = ITEMS[inv.itemId];
    const free = cap - sh.qty;
    return `<button class="pick-row ${free > 0 ? '' : 'off'}" data-action="stock-pick" data-shelf="${sh.id}" data-uid="${inv.uid}" data-qty="${Math.min(inv.qty, free)}" ${free > 0 ? '' : 'disabled'}>
      <img class="pr-icon" src="${A(it?.icon ?? '')}" alt="">
      <span class="pr-name">${esc(it?.name ?? '')} <span style="color:${qColor(inv.quality)}">(${qLabel(inv.quality)})</span></span>
      <span class="pr-sub">kho ${inv.qty} · tươi ${Math.round(inv.freshness)}%</span>
      <span class="pr-val">Bày ${Math.min(inv.qty, Math.max(0, free))}</span>
    </button>`;
  }).join('');
  ui.openModal(`
    ${ui.panelHead('Chọn hàng để bày', `Kệ ${sh.id + 1} · ${sh.itemId ? esc(ITEMS[sh.itemId]?.name ?? '') : 'trống'} · còn ${cap - sh.qty}/${cap}`)}
    <div class="body"><div class="pick-list">${rows || '<div class="small muted">Kho không có hàng phù hợp.</div>'}</div></div>
    <div class="foot">
      ${sh.itemId ? `<button class="btn" data-action="shelf-return" data-shelf="${sh.id}">Thu hàng về kho</button>` : ''}
      <button class="btn" data-action="close-modal">Đóng</button>
    </div>
  `, 'small-modal');
}

// ------------------------------------------------------------------ prices --
export function renderPricesPanel(ui: UI) {
  const w = ui.world;
  const s = ui.state;
  const shelfRows = s.shelves.slice(0, w.shelfCount()).map((sh) => {
    const it = sh.itemId ? ITEMS[sh.itemId] : null;
    return `<tr>
      <td>Kệ ${sh.id + 1}</td>
      <td>${it ? itemChip(sh.itemId!) : '<span class="dim">Trống</span>'}</td>
      <td>${it ? fmtMoney(w.fairSell(sh.itemId!)) + ' đ' : '—'}</td>
      <td>${it ? `<div class="markup"><button class="mini" data-action="markup" data-shelf="${sh.id}" data-delta="-0.05">−</button>
        <b>${Math.round(sh.markup * 100)}%</b>
        <button class="mini" data-action="markup" data-shelf="${sh.id}" data-delta="0.05">+</button></div>` : '—'}</td>
      <td>${it ? `<b class="gold">${fmtMoney(w.shelfPrice(sh))} đ</b>` : '—'}</td>
      <td>${it ? `${sh.qty}/${w.shelfCapacity(sh.itemId!)}` : '—'}</td>
    </tr>`;
  }).join('');

  const q = ui.search.trim().toLowerCase();
  const rows = ITEM_LIST.filter((it) => (ui.filter === 'all' || it.cat === ui.filter) && (!q || it.name.toLowerCase().includes(q)))
    .map((it) => {
      const sup = s.economy.supply[it.id] ?? 1;
      const dem = s.economy.demand[it.id] ?? 1;
      const trend = dem / sup;
      const arrow = trend > 1.12 ? '▲' : trend < 0.88 ? '▼' : '·';
      const tcol = trend > 1.12 ? '#c4513f' : trend < 0.88 ? '#8aa357' : '#b9a273';
      const stock = w.townStock(it.id);
      return `<tr class="${stock ? '' : 'dim'}">
        <td><img class="row-icon" src="${A(it.icon)}" alt=""></td>
        <td>${esc(it.name)}</td>
        <td>${CATEGORY_LABEL[it.cat]}</td>
        <td>${fmtMoney(w.fairBuy(it.id))} đ</td>
        <td>${fmtMoney(w.fairSell(it.id))} đ</td>
        <td style="color:${tcol}">${arrow} ${trend.toFixed(2)}</td>
        <td>${stock}</td>
      </tr>`;
    }).join('');

  ui.openModal(`
    ${ui.panelHead('Bảng giá & thị trường', 'Giá thị trường thay đổi theo cung cầu, thời tiết và tin tức.')}
    <div class="body">
      <div class="inv-toolbar">
        <div class="searchbox"><img src="/assets/ui/icons/action_search.png" alt=""><input type="text" placeholder="Tìm hàng..." value="${esc(ui.search)}" data-field="search"></div>
        <div class="chips">
          <button class="chip ${ui.filter === 'all' ? 'on' : ''}" data-action="filter" data-cat="all">Tất cả</button>
          ${CATEGORY_ORDER.map((c) => `<button class="chip ${ui.filter === c ? 'on' : ''}" data-action="filter" data-cat="${c}">${CATEGORY_LABEL[c]}</button>`).join('')}
        </div>
      </div>
      <div class="cols">
        <div>
          <h3 class="sec-title">Kệ hàng của bạn</h3>
          <table class="tbl"><thead><tr><th>Kệ</th><th>Món</th><th>Giá hợp lý</th><th>Cộng thêm</th><th>Giá bán</th><th>Số lượng</th></tr></thead>
          <tbody>${shelfRows}</tbody></table>
        </div>
        <div>
          <h3 class="sec-title">Giá thị trường hôm nay</h3>
          <div class="scroll" style="max-height:300px">
            <table class="tbl tight"><thead><tr><th></th><th>Món</th><th>Loại</th><th>Mua</th><th>Bán</th><th>Cung cầu</th><th>Kho</th></tr></thead>
            <tbody>${rows}</tbody></table>
          </div>
          <div class="small dim" style="margin-top:4px">▲ giá đang lên · ▼ giá đang xuống · "Kho" là tổng hàng của bạn.</div>
        </div>
      </div>
    </div>
    <div class="foot"><span class="small dim">Giá quá cao: khách trả giá hoặc bỏ đi. Giá quá thấp: lỗ vốn.</span><button class="btn" data-action="close-modal">Đóng</button></div>
  `, 'wide-modal');
}

// --------------------------------------------------------------- suppliers --
export function renderSuppliersPanel(ui: UI) {
  const s = ui.state;
  const cards = Object.values(SUPPLIERS).map((sup) => {
    const st = s.suppliers[sup.id];
    const npc = NPCS[sup.id];
    const trust = st?.trust ?? 0;
    const rows = sup.items.map((e) => {
      const stock = st?.stock[e.item] ?? 0;
      const price = ui.world.supplierPrice(sup.id, e.item);
      const it = ITEMS[e.item];
      const order = sup.leadDays > 0;
      return `<tr>
        <td><img class="row-icon" src="${A(it?.icon ?? '')}" alt=""></td>
        <td>${esc(it?.name ?? e.item)}</td>
        <td>${stock}</td>
        <td class="gold">${fmtMoney(price)} đ</td>
        <td>
          <button class="mini" data-action="buy" data-supplier="${sup.id}" data-item="${e.item}" data-qty="1" ${stock < 1 ? 'disabled' : ''}>1</button>
          <button class="mini" data-action="buy" data-supplier="${sup.id}" data-item="${e.item}" data-qty="5" ${stock < 5 ? 'disabled' : ''}>5</button>
          <button class="mini" data-action="buy" data-supplier="${sup.id}" data-item="${e.item}" data-qty="10" ${stock < 10 ? 'disabled' : ''}>10</button>
          ${order ? `<button class="mini order" data-action="order" data-supplier="${sup.id}" data-item="${e.item}" data-qty="10">Đặt 10</button>` : ''}
        </td>
      </tr>`;
    }).join('');
    return `<div class="sup-card">
      <div class="sup-head">
        ${sup.portrait ? `<img class="sup-portrait" src="${A(sup.portrait)}" alt="">` : '<div class="sup-portrait noimg">🧺</div>'}
        <div>
          <div class="nm">${esc(sup.name)} <span class="small muted">· ${esc(sup.role)}</span></div>
          <div class="small dim">${esc(sup.desc)}</div>
          <div class="sup-meta">
            <span>Uy tín: <b>${Math.round(trust)}</b> ${bar(trust, 'tiny')}</span>
            <span>Giao: <b>${sup.leadDays === 0 ? 'ngay' : sup.leadDays + ' ngày'}</b></span>
            <span>Đáng tin: <b>${Math.round(sup.reliability * 100)}%</b></span>
            ${npc ? `<span>Quan hệ: ${relationshipLabel(s.npcs[sup.id]?.trust ?? 0)}</span>` : ''}
          </div>
        </div>
      </div>
      <table class="tbl tight"><thead><tr><th></th><th>Món</th><th>Còn</th><th>Giá</th><th>Mua</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
  }).join('');

  ui.openModal(`
    ${ui.panelHead('Nhà cung cấp', 'Mua ngay ở chợ, hoặc đặt hàng trước để có giá tốt hơn nhưng phải chờ.')}
    <div class="body"><div class="sup-grid">${cards}</div></div>
    <div class="foot"><span class="small dim">Đặt hàng trước rẻ hơn 5% nhưng có thể trễ hoặc mất trên đường.</span><button class="btn" data-action="close-modal">Đóng</button></div>
  `, 'wide-modal');
}

// ------------------------------------------------------------------- debts --
export function renderDebtsPanel(ui: UI) {
  const w = ui.world;
  const s = ui.state;
  const owed = s.debts.filter((d) => d.kind === 'lent' && d.status === 'active');
  const owe = s.debts.filter((d) => d.kind === 'borrowed' && (d.status === 'active' || d.status === 'overdue'));
  const row = (d: (typeof s.debts)[number]) => {
    const due = w.debtDue(d);
    const left = Math.max(0, due - d.paid);
    return `<div class="debt-row">
      <div class="dr-main">
        <div class="nm">${esc(d.partyName)} <span class="small dim">· ${esc(d.note ?? '')}</span></div>
        <div class="small">${d.status === 'overdue' ? '<span class="red">Quá hạn</span>' : `Đến hạn ngày ${d.dueDay}`}</div>
        ${bar((d.paid / Math.max(1, due)) * 100, 'tiny')}
      </div>
      <div class="dr-val">
        <div class="gold">${fmtMoney(left)} đ</div>
        <div class="small dim">còn lại / ${fmtMoney(due)} đ</div>
      </div>
      <div class="dr-actions">
        <button class="mini" data-action="repay" data-id="${d.id}" data-amt="all">Trả hết</button>
        <button class="mini" data-action="repay" data-id="${d.id}" data-amt="half">Trả một nửa</button>
      </div>
    </div>`;
  };
  const lenders = LENDERS.map((l) => {
    const npc = s.npcs[l.id];
    const ok = (npc?.trust ?? 0) >= l.trustReq;
    return `<div class="lender">
      <div class="nm">${esc(l.name)}</div>
      <div class="small">Lãi ${Math.round(l.rate * 100)}%/kỳ · ${l.days} ngày</div>
      <div class="small dim">Tối đa ${fmtMoney(l.max)} đ</div>
      ${ok ? `<div class="dr-actions">
        <button class="mini" data-action="borrow" data-lender="${l.id}" data-amount="50">Vay 50</button>
        <button class="mini" data-action="borrow" data-lender="${l.id}" data-amount="100">Vay 100</button>
      </div>` : `<div class="small dim">Cần quan hệ ${l.trustReq} (hiện ${npc?.trust ?? 0})</div>`}
    </div>`;
  }).join('');
  ui.openModal(`
    ${ui.panelHead('Sổ nợ', 'Bán chịu tạo ra khoản phải thu. Vay vốn tạo ra khoản phải trả. Đến hạn không trả sẽ mất uy tín.')}
    <div class="body">
      <div class="cols">
        <div>
          <h3 class="sec-title">Người mua chịu (${owed.length})</h3>
          <div class="debt-list">${owed.map(row).join('') || '<div class="small muted">Chưa có ai nợ bạn.</div>'}</div>
        </div>
        <div>
          <h3 class="sec-title">Bạn đang nợ (${owe.length})</h3>
          <div class="debt-list">${owe.map(row).join('') || '<div class="small muted">Bạn không nợ ai.</div>'}</div>
          <h3 class="sec-title" style="margin-top:14px">Vay vốn</h3>
          <div class="lender-grid">${lenders}</div>
        </div>
      </div>
    </div>
    <div class="foot"><button class="btn" data-action="close-modal">Đóng</button></div>
  `, 'wide-modal');
}

// ------------------------------------------------------------------ quests --
export function renderQuestsPanel(ui: UI) {
  const s = ui.state;
  const list = Object.values(s.quests);
  const typeLabel = { story: 'Chính', personal: 'Nhân vật', side: 'Phụ' };
  const rows = list.filter((q) => q.status !== 'inactive').map((q) => {
    const def = QUESTS[q.id];
    if (!def) return '';
    const stage = def.stages[Math.min(q.stage - 1, def.stages.length - 1)];
    const giver = NPCS[def.giver];
    return `<div class="quest-item ${q.status}">
      <div class="qi-head">
        <span class="qi-type">${typeLabel[def.type]}</span>
        <b>${esc(def.name)}</b>
        <span class="small dim">${giver ? esc(giver.name) : ''}</span>
        <span class="qi-status">${q.status === 'done' ? 'Hoàn thành' : q.status === 'failed' ? 'Thất bại' : 'Đang làm'}</span>
      </div>
      <div class="small muted">${esc(def.desc)}</div>
      ${q.status === 'active' && stage ? `<div class="qi-stage">Giai đoạn ${q.stage}/${def.stages.length}: ${esc(stage.text)}<br><span class="small">${esc(stage.objective)}</span></div>` : ''}
    </div>`;
  }).join('');
  ui.openModal(`
    ${ui.panelHead('Nhiệm vụ', 'Mỗi người trong thị trấn có chuyện riêng của họ.')}
    <div class="body"><div class="scroll" style="max-height:420px">${rows || '<div class="small muted">Chưa có nhiệm vụ nào. Hãy ra chợ và gặp người ta.</div>'}</div></div>
    <div class="foot"><button class="btn" data-action="close-modal">Đóng</button></div>
  `, 'wide-modal');
}

// ----------------------------------------------------------------- journal --
export function renderJournalPanel(ui: UI) {
  const s = ui.state;
  const byDay = new Map<number, typeof s.journal>();
  for (const e of [...s.journal].reverse()) {
    if (!byDay.has(e.day)) byDay.set(e.day, []);
    byDay.get(e.day)!.push(e);
  }
  const kindIcon: Record<string, string> = {
    story: '/assets/ui/icons/icon_info.png', quest: '/assets/ui/icons/tab_quests.png',
    event: '/assets/ui/icons/icon_star_empty.png', sale: '/assets/ui/icons/currency.png',
    system: '/assets/ui/icons/icon_info.png',
  };
  const html = [...byDay.entries()].map(([day, entries]) => `
    <div class="journal-day">
      <div class="jd-head">Ngày ${day} · ${esc(dateLabel({ ...s, player: { ...s.player, day } }))}</div>
      ${entries.map((e) => `<div class="jd-row"><img src="${kindIcon[e.kind] ?? kindIcon.system}" alt=""><span>${esc(e.text)}</span></div>`).join('')}
    </div>`).join('');
  ui.openModal(`
    ${ui.panelHead('Nhật ký', 'Những gì đã xảy ra, theo từng ngày.')}
    <div class="body"><div class="scroll" style="max-height:440px">${html || '<div class="small muted">Chưa có gì để viết.</div>'}</div></div>
    <div class="foot"><button class="btn" data-action="close-modal">Đóng</button></div>
  `, 'wide-modal');
}

// -------------------------------------------------------------------- shop --
export function renderShopPanel(ui: UI) {
  const w = ui.world;
  const s = ui.state;
  const lvl = s.shopLevel ?? 1;
  const ch = CHAPTERS.find((c) => c.n === s.story.chapter);
  const cards = Object.values(UPGRADES).map((up) => {
    const owned = s.upgrades.includes(up.id);
    const affordable = s.player.money >= up.cost;
    const dayOk = s.player.day >= (up.req?.day ?? 1);
    const repOk = s.player.reputation >= (up.req?.rep ?? 0);
    const trustOk = s.player.communityTrust >= (up.req?.trust ?? 0);
    const levelOk = lvl >= up.level;
    const ready = dayOk && repOk && trustOk && levelOk;
    const why = !levelOk ? `Cần chương ${up.level}` : !dayOk ? `Cần ngày ${up.req?.day}` : !repOk ? `Cần uy tín ${up.req?.rep}` : !trustOk ? `Cần cộng đồng ${up.req?.trust}` : '';
    return `<div class="up-card ${owned ? 'owned' : ready ? 'ready' : 'locked'}">
      <div class="up-head"><b>${esc(up.name)}</b>${owned ? '<span class="pill good">Đã có</span>' : ''}</div>
      <div class="small muted">${esc(up.desc)}</div>
      <div class="up-effect">${esc(up.effect)}</div>
      <div class="up-foot">
        <span class="gold">${fmtMoney(up.cost)} đ</span>
        ${owned ? '' : ready
          ? `<button class="btn small ${affordable ? 'primary' : ''}" data-action="upgrade" data-id="${up.id}" ${affordable ? '' : 'disabled'}>${affordable ? 'Nâng cấp' : 'Không đủ tiền'}</button>`
          : `<span class="small dim">${why}</span>`}
      </div>
    </div>`;
  }).join('');
  const staff = s.employees.length
    ? s.employees.map((id) => `<div class="staff-row"><img src="${A(NPCS[id]?.portrait ?? '')}" alt=""><div><b>${esc(NPCS[id]?.name ?? id)}</b><div class="small dim">${esc(NPCS[id]?.role ?? '')}</div></div><span class="small">Sắp kho & trông cửa</span></div>`).join('')
    : '<div class="small muted">Chưa có nhân viên. Nâng cấp "Thuê người phụ giúp" để có người sắp kho.</div>';
  const tier = w.shopTier();
  const next = w.nextShopTier();
  const tierBox = next ? `
    <div class="tier-box ${next.ready ? 'ready' : ''}">
      <div class="tier-head">
        <div>
          <div class="small dim">Cấp ${tier.level} · ${esc(tier.name)}</div>
          <b>${esc(next.tier.name)}</b>
          <div class="small muted">${esc(next.tier.desc)}</div>
        </div>
        <div class="tier-req">
          <div class="small">${esc(next.tier.effect)}</div>
          <div class="small ${next.ready ? 'green' : 'dim'}">${next.ready ? 'Đủ điều kiện' : esc(next.reason)}</div>
          <div class="gold">${fmtMoney(next.tier.cost)} đ</div>
          <button class="btn small ${next.ready ? 'primary' : ''}" data-action="shop-tier" ${next.ready ? '' : 'disabled'}>Nâng cấp cửa hàng</button>
        </div>
      </div>
    </div>` : `
    <div class="tier-box ready"><div class="tier-head"><div><div class="small dim">Cấp ${tier.level}</div><b>${esc(tier.name)}</b><div class="small muted">Cửa hàng đã đạt cấp cao nhất.</div></div></div></div>`;

  ui.openModal(`
    ${ui.panelHead('Cửa hàng', `Cấp ${lvl} · ${esc(tier.name)} · Chương ${s.story.chapter}`)}
    <div class="body">
      ${tierBox}
      <div class="shop-stats">
        <div class="stat"><div class="v">${w.shelfCount()}</div><div class="l">Kệ hàng</div></div>
        <div class="stat"><div class="v">${s.shelves.filter((x) => x.itemId).length}</div><div class="l">Đang bày</div></div>
        <div class="stat"><div class="v">${w.weightCap()}</div><div class="l">Tải trọng kho</div></div>
        <div class="stat"><div class="v">${Math.round(s.player.reputation)}</div><div class="l">Uy tín</div></div>
        <div class="stat"><div class="v">${s.employees.length}</div><div class="l">Nhân viên</div></div>
      </div>
      <div class="up-grid">${cards}</div>
      <h3 class="sec-title" style="margin-top:14px">Nhân viên</h3>
      <div class="staff-list">${staff}</div>
    </div>
    <div class="foot"><span class="small dim">Nâng cấp cần đạt điều kiện về chương, uy tín và ngày.</span><button class="btn" data-action="close-modal">Đóng</button></div>
  `, 'wide-modal');
}

// --------------------------------------------------------------------- map --
export function renderMapPanel(ui: UI) {
  const s = ui.state;
  const cards = Object.values(LOCATIONS).map((loc) => {
    const here = s.travel.location === loc.id;
    const locked = s.player.day < loc.unlockDay;
    return `<div class="map-card ${here ? 'here' : ''} ${locked ? 'locked' : ''}">
      <div class="map-thumb" style="background-image:url('${loc.bg}')"></div>
      <div class="map-body">
        <div class="nm">${esc(loc.name)} ${here ? '<span class="pill good">Bạn ở đây</span>' : ''}</div>
        <div class="small dim">${esc(loc.desc)}</div>
        ${locked ? `<div class="small red">Mở từ ngày ${loc.unlockDay}</div>` : ''}
      </div>
      <div class="map-foot">
        ${!here && !locked ? `<button class="btn small" data-action="travel" data-id="${loc.id}" ${s.travel.actionsLeft <= 0 ? 'disabled' : ''}>Đi tới</button>` : ''}
      </div>
    </div>`;
  }).join('');
  ui.openModal(`
    ${ui.panelHead('Bản đồ thị trấn', `Còn ${s.travel.actionsLeft} lượt đi hôm nay · Ngày ${s.player.day}`)}
    <div class="body"><div class="map-grid">${cards}</div></div>
    <div class="foot"><span class="small dim">Đi lại tốn lượt. Mỗi ngày có 2 lượt.</span><button class="btn" data-action="close-modal">Đóng</button></div>
  `, 'wide-modal');
}

// -------------------------------------------------------------------- save --
function slotMeta(st: { player: { day: number; money: number; name: string }; savedAt: number } | null): string {
  if (!st) return '<span class="dim">Trống</span>';
  const d = new Date(st.savedAt || 0);
  const when = st.savedAt ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : 'chưa lưu';
  return `<b>${esc(st.player.name || 'Người chơi')}</b> · Ngày ${st.player.day} · ${fmtMoney(st.player.money)} đ<div class="small dim">${when}</div>`;
}

export function renderSavePanel(ui: UI) {
  const slots = [0, 1, 2, 3].map((n) => {
    const st = ui.game.peekSlot(n);
    return `<div class="save-slot">
      <div class="ss-label">${n === 0 ? 'Lưu tự động' : 'Ô ' + n}</div>
      <div class="ss-meta">${slotMeta(st)}</div>
      <div class="ss-actions">
        ${n > 0 ? `<button class="btn small primary" data-action="save-slot" data-slot="${n}">Lưu</button>` : ''}
        <button class="btn small" data-action="load-slot" data-slot="${n}" ${st ? '' : 'disabled'}>Tải</button>
        ${n > 0 && st ? `<button class="btn small danger" data-action="delete-slot" data-slot="${n}">Xóa</button>` : ''}
      </div>
    </div>`;
  }).join('');
  ui.openModal(`
    ${ui.panelHead('Lưu & tải', 'Tự động lưu sau mỗi ngày. Bạn có 3 ô lưu thủ công.')}
    <div class="body"><div class="save-grid">${slots}</div></div>
    <div class="foot"><span class="small dim">Tải lại sẽ thay thế tiến trình hiện tại.</span><button class="btn" data-action="close-modal">Đóng</button></div>
  `, 'wide-modal');
}

// ---------------------------------------------------------------- settings --
export function renderSettingsPanel(ui: UI) {
  const st = ui.state.settings;
  ui.openModal(`
    ${ui.panelHead('Cài đặt', '')}
    <div class="body">
      <div class="set-row"><span>Âm thanh hiệu ứng</span><input type="range" min="0" max="1" step="0.05" value="${st.sfx}" data-field="sfx"><b>${Math.round(st.sfx * 100)}%</b></div>
      <div class="set-row"><span>Nhạc nền</span><input type="range" min="0" max="1" step="0.05" value="${st.music}" data-field="music"><b>${Math.round(st.music * 100)}%</b></div>
      <div class="set-row"><span>Tự động lưu</span><button class="btn small ${st.autosave ? 'primary' : ''}" data-action="setting" data-key="autosave">${st.autosave ? 'Bật' : 'Tắt'}</button></div>
      <div class="set-row"><span>Gợi ý trên màn hình</span><button class="btn small ${st.hints ? 'primary' : ''}" data-action="setting" data-key="hints">${st.hints ? 'Bật' : 'Tắt'}</button></div>
      <div class="small dim" style="line-height:1.7">Phím tắt: <b>Space</b> tạm dừng · <b>1/2/3</b> tốc độ · <b>I</b> kho hàng · <b>P</b> bảng giá · <b>M</b> bản đồ · <b>Esc</b> đóng · <b>E</b> đóng cửa ngày.</div>
      <div class="divider"></div>
      <button class="btn" data-action="back-title">Về màn hình chính</button>
    </div>
    <div class="foot"><button class="btn" data-action="close-modal">Đóng</button></div>
  `, 'small-modal');
}

// ------------------------------------------------------------------ family --
export function renderFamilyPanel(ui: UI) {
  const s = ui.state;
  const foods = s.inventory.filter((i) => ITEMS[i.itemId]?.cat === 'food');
  const health = s.player.familyHealth;
  const mood = health > 70 ? 'Khỏe mạnh' : health > 40 ? 'Hơi mệt' : health > 20 ? 'Yếu' : 'Rất yếu';
  const members = [
    { name: 'Mẹ già', desc: 'Người dạy bạn cách chọn gạo, cách nhìn cân.', need: 'Thuốc và ấm no.' },
    { name: 'Em trai', desc: 'Giúp bạn coi kho, nhưng còn nhỏ.', need: 'Một bữa cơm đủ.' },
    { name: 'Cháu nhỏ', desc: 'Nhà có trẻ con, ai cũng phải nhường.', need: 'Sữa hoặc cháo.' },
  ];
  ui.openModal(`
    ${ui.panelHead('Gia đình', 'Mỗi ngày cần 2 phần cơm. Thiếu ăn sẽ làm sức khỏe giảm.')}
    <div class="body">
      <div class="family-stats">
        <div class="stat"><div class="v">${Math.round(health)}</div><div class="l">Sức khỏe</div></div>
        <div class="stat"><div class="v">${Math.floor(s.player.familyPantry)}</div><div class="l">Phần cơm dự trữ</div></div>
        <div class="stat"><div class="v">${s.day.familyMeal}/2</div><div class="l">Bữa hôm nay</div></div>
      </div>
      <div class="small" style="margin:6px 0">Tình trạng: <b>${mood}</b>${health < 40 ? ' <span class="red">— cần ăn uống đầy đủ</span>' : ''}</div>
      <div class="member-list">
        ${members.map((m) => `<div class="member"><div><b>${m.name}</b><div class="small dim">${m.desc}</div></div><div class="small muted">${m.need}</div></div>`).join('')}
      </div>
      <h3 class="sec-title" style="margin-top:12px">Để dành thức ăn</h3>
      <div class="food-list">
        ${foods.length ? foods.map((f) => `<button class="food-btn" data-action="family-food" data-uid="${f.uid}"><img src="${A(ITEMS[f.itemId].icon)}" alt=""><span>${esc(ITEMS[f.itemId].name)}</span><span class="small dim">×${f.qty}</span></button>`).join('') : '<div class="small muted">Kho không còn thức ăn.</div>'}
      </div>
    </div>
    <div class="foot"><button class="btn" data-action="close-modal">Đóng</button></div>
  `, 'small-modal');
}

// -------------------------------------------------------------------- help --
export function renderHelpPanel(ui: UI) {
  ui.openModal(`
    ${ui.panelHead('Trợ giúp', 'Một ngày ở thị trấn An Bình')}
    <div class="body">
      <div class="help-grid">
        <div>
          <h3 class="sec-title">Một ngày</h3>
          <ol class="help-list">
            <li><b>Sáng</b> — sắp kệ, chỉnh giá, đi chợ nhập hàng.</li>
            <li><b>Mở cửa</b> — khách ghé, chào giá, mặc cả, bán chịu hoặc đổi hàng.</li>
            <li><b>Chốt sổ</b> — xem báo cáo, hư hỏng, nợ nần.</li>
            <li><b>Chiều tối</b> — sự kiện, lựa chọn, câu chuyện.</li>
          </ol>
          <h3 class="sec-title">Giá cả</h3>
          <p class="small">Giá thị trường phụ thuộc cung – cầu, thời tiết và tin tức. Mưa làm đường lầy, hàng khan hơn. Bán quá đắt thì khách trả giá hoặc bỏ đi; bán quá rẻ thì lỗ.</p>
        </div>
        <div>
          <h3 class="sec-title">Mặc cả</h3>
          <p class="small">Mỗi khách có ngân sách, sự kiên nhẫn và tính cách riêng. <b>Chào giá</b> gần giá hợp lý dễ được nhận. Nếu bị từ chối, bạn có thể nhận lời trả giá hoặc từ chối.</p>
          <h3 class="sec-title">Nợ & quan hệ</h3>
          <p class="small">Bán chịu giữ được khách nhưng tiền về chậm. Vay vốn giúp vượt qua ngày khó, nhưng lãi và kỳ hạn sẽ đeo bám. Quan hệ tốt mở ra hàng rẻ hơn và những câu chuyện riêng.</p>
          <h3 class="sec-title">Phím tắt</h3>
          <table class="keys">
            <tr><td><kbd>Space</kbd></td><td>Tạm dừng / tiếp tục</td></tr>
            <tr><td><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd></td><td>Tốc độ thời gian</td></tr>
            <tr><td><kbd>I</kbd></td><td>Kho hàng & kệ</td></tr>
            <tr><td><kbd>P</kbd></td><td>Bảng giá</td></tr>
            <tr><td><kbd>C</kbd></td><td>Cửa hàng & nâng cấp</td></tr>
            <tr><td><kbd>M</kbd></td><td>Bản đồ</td></tr>
            <tr><td><kbd>Q</kbd></td><td>Nhiệm vụ</td></tr>
            <tr><td><kbd>F</kbd></td><td>Gia đình</td></tr>
            <tr><td><kbd>L</kbd></td><td>Lưu game</td></tr>
            <tr><td><kbd>H</kbd></td><td>Trợ giúp</td></tr>
            <tr><td><kbd>O</kbd></td><td>Mở cửa (buổi sáng)</td></tr>
            <tr><td><kbd>E</kbd></td><td>Đóng cửa / chốt sổ</td></tr>
            <tr><td><kbd>Esc</kbd></td><td>Đóng cửa sổ đang mở</td></tr>
          </table>
          <p class="small dim">Mẹo: đồng hồ <b>dừng</b> khi bạn mở một bảng, nên cứ thỏa mái sắp kho — khách không mất kiên nhẫn lúc đó.</p>
        </div>
      </div>
    </div>
    <div class="foot"><button class="btn" data-action="close-modal">Đã hiểu</button></div>
  `, 'wide-modal');
}

// ------------------------------------------------------- location / market --
export function renderLocationPanel(ui: UI, locId: string) {
  const loc = LOCATIONS[locId];
  if (!loc) return;
  const s = ui.state;
  const actions = loc.actions.map((a) => `<button class="btn" data-action="location-action" data-id="${a.id}">
      <span style="text-align:left"><b>${esc(a.label)}</b><br><span class="small dim">${esc(a.desc)}</span></span>
    </button>`).join('');
  ui.openModal(`
    <div class="loc-hero" style="background-image:url('${loc.bg}')"></div>
    ${ui.panelHead(loc.name, `Còn ${s.travel.actionsLeft} lượt đi hôm nay`)}
    <div class="body">
      <p class="small muted">${esc(loc.desc)}</p>
      <div class="loc-actions">${actions}</div>
    </div>
    <div class="foot">
      <button class="btn" data-action="go-shop">Về tiệm</button>
      <button class="btn" data-action="close-modal">Đóng</button>
    </div>
  `, 'loc-modal');
}

export function renderMarketPanel(ui: UI, supplierId: string) {
  const sup = SUPPLIERS[supplierId];
  if (!sup) return;
  const st = ui.state.suppliers[supplierId];
  const rows = sup.items.map((e) => {
    const stock = st?.stock[e.item] ?? 0;
    const price = ui.world.supplierPrice(supplierId, e.item);
    const it = ITEMS[e.item];
    return `<tr>
      <td><img class="row-icon" src="${A(it?.icon ?? '')}" alt=""></td>
      <td>${esc(it?.name ?? e.item)}</td>
      <td>${stock}</td>
      <td class="gold">${fmtMoney(price)} đ</td>
      <td>
        <button class="mini" data-action="buy" data-supplier="${supplierId}" data-item="${e.item}" data-qty="1" ${stock < 1 ? 'disabled' : ''}>1</button>
        <button class="mini" data-action="buy" data-supplier="${supplierId}" data-item="${e.item}" data-qty="5" ${stock < 5 ? 'disabled' : ''}>5</button>
        ${sup.leadDays > 0 ? `<button class="mini order" data-action="order" data-supplier="${supplierId}" data-item="${e.item}" data-qty="10">Đặt 10</button>` : ''}
      </td>
    </tr>`;
  }).join('');
  ui.openModal(`
    ${ui.panelHead(sup.name, `${sup.role} · ${esc(sup.desc)}`)}
    <div class="body">
      <div class="sup-meta" style="margin-bottom:8px">
        <span>Uy tín: <b>${Math.round(st?.trust ?? 0)}</b></span>
        <span>Giao: <b>${sup.leadDays === 0 ? 'ngay' : sup.leadDays + ' ngày'}</b></span>
        <span>Tiền của bạn: <b class="gold">${fmtMoney(ui.state.player.money)} đ</b></span>
      </div>
      <table class="tbl tight"><thead><tr><th></th><th>Món</th><th>Còn</th><th>Giá</th><th>Mua</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
    <div class="foot"><button class="btn" data-action="close-modal">Đóng</button></div>
  `, 'wide-modal');
}

export function renderNeighbourPanel(ui: UI) {
  const people = ['ba_tu', 'ong_to', 'co_man', 'anh_khoi'];
  const rows = people.map((id) => {
    const npc = NPCS[id];
    if (!npc) return '';
    const st = ui.state.npcs[id];
    return `<div class="neighbour">
      <img src="${A(npc.portrait)}" alt="">
      <div class="nb-body">
        <b>${esc(npc.name)}</b> <span class="small dim">${esc(npc.role)}</span>
        <div class="small muted">${esc(npc.bio)}</div>
        <div class="small">Quan hệ: ${relationshipLabel(st?.trust ?? 0)}</div>
      </div>
      <div class="nb-actions">
        <button class="mini" data-action="nb-talk" data-id="${id}">Nói chuyện</button>
        <button class="mini" data-action="nb-gift" data-id="${id}">Tặng quà</button>
      </div>
    </div>`;
  }).join('');
  ui.openModal(`
    ${ui.panelHead('Khu dân cư', 'Những mái tranh ven đường. Ai cũng đang cần một điều gì đó.')}
    <div class="body"><div class="nb-list">${rows}</div>
      <div class="small dim" style="margin-top:8px">Nói chuyện tăng quan hệ. Tặng quà (5 đồng) tăng quan hệ và cộng đồng.</div>
    </div>
    <div class="foot"><button class="btn" data-action="go-shop">Về tiệm</button><button class="btn" data-action="close-modal">Đóng</button></div>
  `, 'wide-modal');
}

export function renderAllSaveSlots(ui: UI): string {
  return [0, 1, 2, 3].map((n) => slotMeta(ui.game.peekSlot(n))).join('');
}
