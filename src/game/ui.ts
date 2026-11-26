// ── ui.ts · HUD, quầy, kho, sổ sách, bản đồ, nhật ký, modal ─────────────────
// Mọi [data-act] đều được Game xử lý; không có nút giả.
import {
  A, CAT_ICON, CAT_NAME, CURRENCY, CURRENCY_NOTE, DIFFICULTY, HELP, ITEM,
  LOCATIONS, NPC, QUALITY_COLOR, QUALITY_NAME, STAFF, SUPPLIERS, UPGRADE,
  UPGRADES, WEATHER_ICON, WEATHER_NAME, itemIcon, portrait,
} from './data';
import { fairSell, priceTrend, supplierPrice, trendText, dueList } from './economy';
import { gridOf, nominal, SORT_KEYS, visible, wantedSize } from './inventory';
import type { SortKey } from './inventory';
import { activeCustomer } from './people';
import { levelProgress, unlocked } from './progression';
import { baseTotal, quoted, TACTICS, tradeSheet } from './trade';
import { clock, fmt, listSaves, round, SLOTS } from './state';
import type { GridId, Trade, World } from './types';

export const esc = (s: unknown): string => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const icon = (n: string): string => A(`ui/icons/${n}.png`);
const attr = (s: string): string => esc(s);

export type PanelId = 'inventory' | 'supply' | 'ledger' | 'map' | 'journal' | 'upgrade' | 'save' | 'help' | 'settings' | null;
export interface ModalSpec {
  kind: 'report' | 'quest' | 'event' | 'ending' | 'confirm' | 'intro' | 'result';
  title: string;
  text: string;
  sub?: string;
  choices?: { label: string; act: string; value?: string }[];
  table?: string;
  closable?: boolean;
}
export interface UIEvent {
  type: 'action' | 'move' | 'split' | 'tray' | 'select' | 'inspect' | 'search' | 'filter' | 'sort' | 'price';
  action?: string; value?: string;
  from?: GridId; fi?: number; to?: GridId; ti?: number; qty?: number;
}
export interface UIHost {
  world: World;
  trade: Trade | null;
  customer(): ReturnType<typeof activeCustomer>;
  handle(e: UIEvent): void;
  trayCount(): number;
}

const PANEL_TABS: { id: Exclude<PanelId, null>; label: string; icon: string; key: string }[] = [
  { id: 'inventory', label: 'Kho & kệ', icon: 'tab_inventory', key: 'I' },
  { id: 'supply', label: 'Nhập hàng', icon: 'tab_suppliers', key: 'B' },
  { id: 'ledger', label: 'Sổ sách', icon: 'tab_ledger', key: 'L' },
  { id: 'map', label: 'Bản đồ', icon: 'tab_map', key: 'M' },
  { id: 'journal', label: 'Nhật ký', icon: 'tab_journal', key: 'J' },
  { id: 'upgrade', label: 'Tiệm & người', icon: 'tab_shop', key: 'U' },
  { id: 'save', label: 'Lưu / tải', icon: 'tab_save', key: 'S' },
  { id: 'settings', label: 'Cài đặt', icon: 'tab_settings', key: 'C' },
  { id: 'help', label: 'Trợ giúp', icon: 'tab_help', key: 'H' },
];

export class UI {
  root: HTMLElement;
  host: UIHost;
  panel: PanelId = null;
  modal: ModalSpec | null = null;
  titleMode = true;
  search = '';
  cat: string = 'all';
  sort: SortKey = 'manual';
  selected: { grid: GridId; i: number } | null = null;
  toasts: { text: string; kind: string; t: number }[] = [];
  loading: { done: number; total: number } | null = null;
  private drag: { grid: GridId; i: number; x: number; y: number; moved: boolean } | null = null;
  private ghost: HTMLElement | null = null;
  private focus: { key: string; pos: number } | null = null;
  private lastActions = new Set<string>();

  constructor(root: HTMLElement, host: UIHost) {
    this.root = root;
    this.host = host;
    this.mount();
  }

  private mount(): void {
    const r = document.documentElement.style;
    r.setProperty('--wood', `url("${A('ui/panels/wood.png')}")`);
    r.setProperty('--wood-dark', `url("${A('ui/panels/wood_dark.png')}")`);
    r.setProperty('--paper', `url("${A('ui/panels/paper.png')}")`);
    r.setProperty('--slot', `url("${A('ui/slots/slot.png')}")`);
    this.root.innerHTML = `
      <div id="hud"></div>
      <div id="dock"></div>
      <div id="counter"></div>
      <div id="panel"></div>
      <div id="modal"></div>
      <div id="toasts"></div>
      <div id="title"></div>
      <div id="loading"></div>
      <div id="ghost"></div>`;
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('input', (e) => this.onInput(e));
    this.root.addEventListener('change', (e) => this.onChange(e));
    this.root.addEventListener('contextmenu', (e) => this.onContext(e));
    this.root.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
  }

  private el(id: string): HTMLElement { return this.root.querySelector('#' + id) as HTMLElement; }

  toast(text: string, kind: 'info' | 'good' | 'bad' = 'info'): void {
    this.toasts.unshift({ text, kind, t: Date.now() });
    if (this.toasts.length > 4) this.toasts.length = 4;
    this.paintToasts();
  }
  private paintToasts(): void {
    const now = Date.now();
    this.toasts = this.toasts.filter((t) => now - t.t < 4200);
    this.el('toasts').innerHTML = this.toasts.map((t) =>
      `<div class="toast ${t.kind}">${esc(t.text)}</div>`).join('');
  }
  openPanel(p: PanelId): void {
    this.panel = this.panel === p ? null : p;
    this.modal = null;
    this.render();
  }
  showModal(m: ModalSpec): void { this.modal = m; this.panel = null; this.render(); }
  closeModal(): void { this.modal = null; this.render(); }

  render(): void {
    const w = this.host.world;
    this.lastActions = new Set();
    this.el('hud').innerHTML = this.hud(w);
    this.el('dock').innerHTML = this.dock(w);
    this.el('counter').innerHTML = this.counter(w);
    this.el('panel').innerHTML = this.paintPanel(w);
    this.el('modal').innerHTML = this.paintModal();
    this.el('title').innerHTML = this.titleMode ? this.title(w) : '';
    this.el('loading').innerHTML = this.loading ? this.loadingScreen() : '';
    this.el('loading').style.display = this.loading ? 'flex' : 'none';
    this.el('ghost').innerHTML = '';
    this.ghost = null;
    this.paintToasts();
    if (this.focus) {
      const inp = this.root.querySelector<HTMLInputElement>(`[data-field="${this.focus.key}"]`);
      if (inp) { inp.focus(); inp.setSelectionRange(this.focus.pos, this.focus.pos); }
      this.focus = null;
    }
  }
  renderedActions(): string[] { return [...this.lastActions]; }
  private A(act: string, label: string, cls = '', extra = '', value = ''): string {
    this.lastActions.add(act);
    return `<button class="btn ${cls}" data-act="${attr(act)}" ${value ? `data-value="${attr(value)}"` : ''} ${extra}>${label}</button>`;
  }

  // ── HUD ───────────────────────────────────────────────────────────────────
  private hud(w: World): string {
    const phaseName: Record<string, string> = {
      morning: 'Buổi sáng', procure: 'Nhập hàng', open: 'Mở cửa', report: 'Chốt sổ', evening: 'Buổi tối', ending: 'Kết thúc',
    };
    const speed = w.speed;
    return `
      <div class="hud-left">
        <div class="plaque"><span class="plaque-k">Ngày</span><b>${w.day}<small>/${w.maxDays}</small></b></div>
        <div class="plaque"><span class="plaque-k">Giờ</span><b>${clock(w.minute)}</b></div>
        <div class="plaque weather"><img src="${icon(WEATHER_ICON[w.weather])}" alt=""><span>${WEATHER_NAME[w.weather]}</span></div>
        <div class="plaque phase"><b>${phaseName[w.phase] ?? ''}</b><span>${esc(w.news[0] ?? w.forecast)}</span></div>
      </div>
      <div class="hud-right">
        <div class="stat money"><img src="${icon('currency')}" alt=""><b>${fmt(w.money)}</b><small>đ</small></div>
        <div class="stat"><img src="${icon('star')}" alt=""><b>${Math.round(w.rep)}</b><small>uy tín</small></div>
        <div class="stat"><img src="${icon('heart')}" alt=""><b>${Math.round(w.community)}</b><small>xóm</small></div>
        <div class="stat"><img src="${icon('category_food')}" alt=""><b>${w.family}</b><small>bếp</small></div>
        <div class="hud-btns">
          ${this.A('pause', `<img src="${icon(w.paused ? 'action_play' : 'action_pause')}" alt="">`, 'icon', `title="Tạm dừng (Space)"`)}
          ${[1, 2, 3].map((s) => this.A('speed', String(s), `icon ${speed === s ? 'on' : ''}`, `title="Tốc độ ${s}"`, String(s))).join('')}
          ${this.A('nextphase', 'Tiếp →', 'primary small', `title="Sang pha tiếp theo"`)}
        </div>
      </div>`;
  }

  private dock(w: World): string {
    return `<div class="dock-inner">${PANEL_TABS.map((t) => `
      <button class="dock-btn ${this.panel === t.id ? 'on' : ''}" data-act="panel" data-value="${t.id}" title="${esc(t.label)} (${t.key})">
        <img src="${icon(t.icon)}" alt=""><span>${esc(t.label)}</span>
      </button>`).join('')}</div>`;
  }

  // ── Quầy giao dịch ────────────────────────────────────────────────────────
  private counter(w: World): string {
    if (this.titleMode || w.phase === 'ending' || this.modal) return '';
    const c = this.host.customer();
    const t = this.host.trade;
    if (w.phase === 'morning' || w.phase === 'procure' || w.phase === 'report' || w.phase === 'evening') {
      return `<div class="phasebar">
        <div class="phasebar-txt">${esc(this.phaseHint(w))}</div>
        <div class="phasebar-btns">
          ${w.phase === 'morning' ? this.A('phase', 'Đi nhập hàng →', 'primary', '', 'procure') : ''}
          ${w.phase === 'procure' ? this.A('phase', 'Mở cửa →', 'primary', '', 'open') : ''}
          ${w.phase === 'report' ? this.A('phase', 'Sang buổi tối →', 'primary', '', 'evening') : ''}
          ${w.phase === 'evening' ? this.A('phase', 'Ngày mới →', 'primary', '', 'nextday') : ''}
        </div></div>`;
    }
    if (w.phase !== 'open') return '';
    if (!c) {
      const waiting = w.queue.filter((q) => q.state === 'waiting').length;
      return `<div class="phasebar"><div class="phasebar-txt">${waiting ? `Còn ${waiting} người ngoài ngõ, chờ tới lượt…` : 'Quầy vắng. Chốt sổ khi bạn muốn.'}</div>
        <div class="phasebar-btns">${this.A('nextphase', 'Chốt sổ →', 'primary')}</div></div>`;
    }
    const req = c.request;
    const d = ITEM[req.item];
    const moodIcon = ({ happy: 'status_happy', sad: 'status_sad', angry: 'status_angry', tired: 'status_neutral', surprised: 'status_happy', neutral: 'status_neutral' } as Record<string, string>)[c.mood] ?? 'status_neutral';
    const tray = t ? t.lines : [];
    const price = t ? (t.step === 'build' ? quoted(t) : t.price) : 0;
    const fair = tray.reduce((n, l) => n + fairSell(w, l.item, l.q) * l.qty, 0);
    const reaction = t?.reaction;
    const canQuote = t && t.step === 'build' && tray.length > 0;
    const tactics = reaction ? TACTICS : [];
    return `
      <div class="counter-wrap">
        <div class="cust-card">
          <img class="cust-portrait" src="${portrait(c.npc, c.mood)}" alt="${attr(c.name)}">
          <div class="cust-frame"></div>
          <img class="cust-mood" src="${icon(moodIcon)}" alt="">
          <div class="cust-name">${esc(c.name)}<small>${esc(NPC[c.npc]?.job ?? '')}</small></div>
          <div class="cust-line">“${esc(c.line)}”</div>
          <div class="cust-need">Cần <b>${req.qty} ${esc(d?.name ?? req.item)}</b> · ngân sách ~${fmt(c.budget)} đ${req.urgency > 0.7 ? ' · <span class="urgent">đang cần gấp</span>' : ''}</div>
          <div class="patience"><i style="width:${Math.max(0, Math.min(100, c.patience / 40 * 100))}%"></i></div>
          <div class="cust-trust">Tín nhiệm ${Math.round(w.relations[c.npc]?.trust ?? 50)} · đã ghé ${w.relations[c.npc]?.visits ?? 0} lần</div>
          ${req.barter ? `<div class="cust-extra">Mang theo ${req.barter.qty} ${esc(ITEM[req.barter.item]?.name)} để đổi</div>` : ''}
          ${req.credit ? `<div class="cust-extra">Có thể xin mua chịu</div>` : ''}
        </div>
        <div class="tray-wrap" data-tray="1">
          <div class="tray-head"><b>Khay quầy</b><span>${tray.length}/6 món · kéo hoặc bấm hàng ở kệ bên phải</span></div>
          <div class="tray-grid">${Array.from({ length: 6 }, (_, i) => {
            const l = tray[i];
            if (!l) return `<div class="tray-cell empty" data-traycell="${i}"><span>+</span></div>`;
            const ins = t?.inspected.includes(l.uid);
            return `<div class="tray-cell" data-traycell="${i}" title="${attr(ITEM[l.item]?.name)} · ${QUALITY_NAME[l.q]}">
              <img src="${itemIcon(l.item)}" alt=""><span class="qty">×${l.qty}</span>
              <i class="qdot" style="background:${QUALITY_COLOR[l.q]}"></i>
              <button class="mini inspect" data-act="inspect" data-value="${i}" title="Kiểm hàng">?</button>
              <button class="mini remove" data-act="trayremove" data-value="${i}" title="Bỏ khỏi khay">×</button>
              ${ins ? '<i class="checked">✓</i>' : ''}
            </div>`;
          }).join('')}</div>
          <div class="tray-shelf">${this.shelfStrip(w)}</div>
        </div>
        <div class="price-col">
          <div class="price-head">Đưa giá</div>
          <div class="price-value"><b>${fmt(price)}</b> đ</div>
          <div class="price-fair">Giá hợp lý ~${fmt(fair)} đ · ${t?.discount ? `đã ${Math.round(t.discount * 100)}%` : 'đang giữ giá'}</div>
          <div class="price-btns">
            ${this.A('price', '−', 'icon', 'title="Giảm 5%"', '-5')}
            ${this.A('price', '+', 'icon', 'title="Tăng 5%"', '+5')}
            ${this.A('price', '↺', 'icon', 'title="Về giá hợp lý"', 'reset')}
          </div>
          ${canQuote ? this.A('quote', 'Đưa giá', 'primary wide') : ''}
          ${reaction ? `<div class="reaction ${reaction.kind === 'accept' ? 'good' : 'warn'}">“${esc(reaction.text.replace(/^"|"$/g, ''))}”</div>` : ''}
          ${reaction ? `<div class="tactics">${tactics.map((x) => this.A('tactic', esc(x.label), 'small', `title="${attr(x.hint)}"`, x.id)).join('')}</div>` : ''}
          ${reaction ? this.A('confirm', 'Xác nhận giao dịch', 'primary wide') : ''}
          <div class="tray-foot">
            ${this.A('cleartray', 'Dọn khay', 'small')}
            ${this.A('refuse', 'Từ chối khách', 'small danger')}
            ${this.A('panel', 'Kho (I)', 'small', '', 'inventory')}
          </div>
        </div>
      </div>`;
  }

  private shelfStrip(w: World): string {
    return `<div class="shelf-strip">${w.shelves.cells.map((s, i) => s
      ? `<button class="shelf-cell" data-act="trayadd" data-value="${i}" title="${attr(ITEM[s.item]?.name)} ×${s.qty}">
          <img src="${itemIcon(s.item)}" alt=""><span>${s.qty}</span><i class="qdot" style="background:${QUALITY_COLOR[s.q]}"></i></button>`
      : `<span class="shelf-cell empty"></span>`).join('')}</div>`;
  }

  private phaseHint(w: World): string {
    switch (w.phase) {
      case 'morning': return `Sáng ngày ${w.day}. ${w.forecast} Xem tin, xếp kệ, rồi đi nhập hàng.`;
      case 'procure': return 'Đặt hàng từ các mối quen. Hàng có hạn, chuyến có thể trễ.';
      case 'report': return 'Đã chốt sổ. Xem báo cáo rồi sang buổi tối.';
      case 'evening': return randomLineSafe(w);
      default: return '';
    }
  }

  // ── Panels ────────────────────────────────────────────────────────────────
  private paintPanel(w: World): string {
    if (!this.panel) return '';
    const body: Record<Exclude<PanelId, null>, () => string> = {
      inventory: () => this.inventoryPanel(w), supply: () => this.supplyPanel(w),
      ledger: () => this.ledgerPanel(w), map: () => this.mapPanel(w),
      journal: () => this.journalPanel(w), upgrade: () => this.upgradePanel(w),
      save: () => this.savePanel(w), help: () => this.helpPanel(),
      settings: () => this.settingsPanel(w),
    };
    const title = PANEL_TABS.find((t) => t.id === this.panel)?.label ?? '';
    return `<div class="panel ${this.panel === 'inventory' ? 'wide' : ''}">
      <div class="panel-head"><h2>${esc(title)}</h2>${this.A('panelclose', '×', 'icon', 'title="Đóng (Esc)"')}</div>
      <div class="panel-body">${body[this.panel]()}</div></div>`;
  }

  private grid(w: World, id: GridId): string {
    const g = gridOf(w, id);
    const shown = new Set(visible(w, { search: this.search, cat: this.cat, grid: id }));
    const size = wantedSize(w, id);
    return `<div class="grid-title">${id === 'warehouse' ? 'Kho' : 'Kệ trưng bày'} · ${g.cells.filter(Boolean).length}/${size.w * size.h} ô</div>
      <div class="grid ${id}" style="--cols:${g.w}">${g.cells.map((s, i) => {
        const hidden = !shown.has(i);
        const sel = this.selected?.grid === id && this.selected.i === i;
        if (!s) return `<div class="cell ${hidden ? 'faded' : ''} ${sel ? 'selected' : ''}" data-grid="${id}" data-i="${i}"></div>`;
        return `<div class="cell has ${hidden ? 'faded' : ''} ${sel ? 'selected' : ''}" data-grid="${id}" data-i="${i}" data-uid="${attr(s.uid)}" title="${attr(ITEM[s.item]?.name)} ×${s.qty} · ${QUALITY_NAME[s.q]}">
          <img src="${itemIcon(s.item)}" alt=""><span class="qty">${s.qty}</span>
          <i class="qdot" style="background:${QUALITY_COLOR[s.q]}"></i>
          ${s.fresh >= 0 ? `<i class="fresh" title="Còn ${s.fresh} ngày">${s.fresh}</i>` : ''}
          ${s.item === 'damaged_goods' ? '<i class="badge">!</i>' : ''}
        </div>`;
      }).join('')}</div>`;
  }

  private inventoryPanel(w: World): string {
    const sel = this.selected ? gridOf(w, this.selected.grid).cells[this.selected.i] : null;
    const cats = ['all', 'food', 'household', 'materials', 'medicine', 'valuables', 'special'];
    return `
      <div class="inv-tools">
        <label class="searchbox"><img src="${icon('action_search')}" alt=""><input data-field="search" placeholder="Tìm hàng..." value="${attr(this.search)}"></label>
        <div class="chips">${cats.map((c) => `<button class="chip ${this.cat === c ? 'on' : ''}" data-act="filter" data-value="${c}">${c === 'all' ? 'Tất cả' : esc(CAT_NAME[c as keyof typeof CAT_NAME])}</button>`).join('')}</div>
        <label class="select">Sắp xếp <select data-field="sort">${SORT_KEYS.map((k) => `<option value="${k}" ${this.sort === k ? 'selected' : ''}>${({ manual: 'Tay', category: 'Loại', qty: 'Số lượng', value: 'Giá trị', quality: 'Phẩm chất', expiry: 'Hạn dùng' } as Record<string, string>)[k]}</option>`).join('')}</select></label>
        <div class="tools-btns">
          ${this.A('merge', `<img src="${icon('icon_merge')}" alt=""> Gộp`, 'small')}
          ${this.A('restock', `<img src="${icon('action_fast')}" alt=""> Bổ sung kệ`, 'small')}
          ${this.A('autosort', `Tự sắp: ${w.settings.autoSort ? 'Bật' : 'Tắt'}`, `small ${w.settings.autoSort ? 'on' : ''}`)}
        </div>
      </div>
      <div class="inv-cols">
        <div>${this.grid(w, 'warehouse')}</div>
        <div>${this.grid(w, 'shelves')}
          <div class="hint">Kéo thả giữa hai grid · chuột phải để tách chồng · bấm ô để xem chi tiết. Chỉ hàng trên kệ là khách thấy được.</div>
        </div>
      </div>
      <div class="detail">${sel ? `<h3>${esc(ITEM[sel.item]?.name)}</h3><pre>${esc(this.detailText(sel))}</pre>` : '<span class="muted">Chọn một ô để xem thông tin vật phẩm.</span>'}</div>`;
  }
  private detailText(s: { item: string; qty: number; q: number; fresh: number; origin: string }): string {
    const d = ITEM[s.item];
    return [
      `${d?.name} · ${s.qty} cái · ${QUALITY_NAME[s.q]}`,
      `Giá bán tham chiếu ${d?.sell} đ · giá trị chồng ~${Math.round((d?.sell ?? 0) * [0.72, 1, 1.22, 1.5][s.q] * s.qty)} đ`,
      `Thể tích ${d?.vol} · cân nặng ${d?.weight} · tối đa ${d?.stack}/chồng`,
      s.fresh >= 0 ? `Còn ${s.fresh} ngày trước hư` : 'Không hư hỏng',
      `Nguồn: ${s.origin === 'heirloom' ? 'của ông chủ cũ' : s.origin}`, d?.desc ?? '',
    ].join('\n');
  }

  private supplyPanel(w: World): string {
    const dl = dueList(w);
    return `
      <div class="supply-head">Vốn <b>${fmt(w.money)} đ</b> · ${w.travelUsed ? 'đã đi một chuyến hôm nay' : 'có thể đi một chuyến'} · ${this.A('panel', 'Ra bản đồ →', 'small', '', 'map')}</div>
      <div class="supply-list">${SUPPLIERS.map((s) => {
        const st = w.suppliers[s.id];
        return `<div class="supplier">
          <div class="sup-head"><b>${esc(s.name)}</b><small>${esc(s.kind)} · tin cậy ${Math.round(st?.reliability * 100)}% · giao ${st?.delay ?? 0} ngày · thân tình ${st?.bond ?? 0}</small></div>
          <div class="sup-desc">${esc(s.desc)} ${st?.note ? `<span class="warn">${esc(st.note)}</span>` : ''}</div>
          <div class="sup-items">${s.items.map((id) => {
            const d = ITEM[id]; const stock = st?.stock[id];
            const trend = priceTrend(w, id);
            return `<div class="sup-item">
              <img src="${itemIcon(id)}" alt=""><span class="si-name">${esc(d.name)}</span>
              <span class="si-stock">${stock?.qty ?? 0} · ${stock ? QUALITY_NAME[stock.q] : '—'}</span>
              <span class="si-price ${trend}">${supplierPrice(w, s.id, id, stock?.q ?? 1)} đ <small>${trendText(w, id)}</small></span>
              <div class="si-buy">
                ${[1, 3, 5].map((n) => this.A('buy', `×${n}`, 'tiny', `title="Mua ${n}"`, `${s.id}|${id}|${n}|cash`)).join('')}
                ${this.A('buy', 'Đặt', 'tiny', `title="Đặt trước −7%, giao chậm hơn"`, `${s.id}|${id}|3|order`)}
                ${this.A('buy', 'Đổi', 'tiny', `title="Đổi bằng hàng trong kho"`, `${s.id}|${id}|3|barter`)}
              </div></div>`;
          }).join('')}</div></div>`;
      }).join('')}</div>
      <h3 class="sub">Chuyến hàng đang đi (${dl.length})</h3>
      <div class="deliveries">${dl.length ? dl.map((d) => `<div class="delivery ${d.due <= w.day ? 'due' : ''}">
        <b>${d.qty} ${esc(ITEM[d.item]?.name)}</b> · ${esc(SUPPLIERS.find((s) => s.id === d.supplier)?.name ?? d.supplier)} · ngày ${d.due} · rủi ro ${Math.round(d.risk * 100)}%${d.due <= w.day ? ' · <span class="warn">hôm nay</span>' : ''}
      </div>`).join('') : '<span class="muted">Không có chuyến nào đang đi.</span>'}</div>`;
  }

  private ledgerPanel(w: World): string {
    const l = w.dayLog, debts = w.debts;
    const topNpcs = Object.entries(w.relations).sort((a, b) => b[1].visits - a[1].visits).slice(0, 8);
    return `
      <div class="ledger-cols">
        <div>
          <h3 class="sub">Hôm nay · ngày ${l.day}</h3>
          <div class="kv"><span>Doanh thu</span><b class="good">+${fmt(l.revenue)} đ</b></div>
          <div class="kv"><span>Chi phí</span><b class="bad">−${fmt(l.cost)} đ</b></div>
          <div class="kv"><span>Lãi / lỗ</span><b>${fmt(l.revenue - l.cost)} đ</b></div>
          <div class="kv"><span>Giao dịch / khách</span><b>${l.trades} / ${l.served}</b></div>
          <div class="kv"><span>Bỏ đi</span><b>${l.missed}</b></div>
          <div class="kv"><span>Hư hỏng</span><b>${l.spoilage} món</b></div>
          <div class="kv"><span>Uy tín / xóm</span><b>${l.repDelta >= 0 ? '+' : ''}${l.repDelta} / ${l.communityDelta >= 0 ? '+' : ''}${l.communityDelta}</b></div>
          <h3 class="sub">Sổ nợ (${debts.length})</h3>
          ${debts.length ? debts.map((d) => `<div class="debt"><b>${esc(d.who)}</b> ${fmt(d.amount - d.paid)} đ · hẹn ngày ${d.due} · ${d.kind === 'receivable' ? 'phải thu' : 'phải trả'}
            ${this.A('paydebt', d.kind === 'receivable' ? 'Thu' : 'Trả', 'tiny', '', d.id)}</div>`).join('') : '<span class="muted">Sổ nợ sạch.</span>'}
        </div>
        <div>
          <h3 class="sub">Người quen</h3>
          ${topNpcs.map(([id, r]) => `<div class="npc-row" data-act="npc" data-value="${attr(id)}">
            <img src="${portrait(id)}" alt=""><span><b>${esc(NPC[id]?.name ?? id)}</b><small>${esc(NPC[id]?.job ?? '')} · ghé ${r.visits} lần · tín nhiệm ${Math.round(r.trust)}</small></span>
          </div>`).join('')}
          <h3 class="sub">Báo cáo các ngày</h3>
          <div class="history">${w.history.slice(-6).reverse().map((h) => `<div>Ngày ${h.day}: thu ${fmt(h.revenue)}, chi ${fmt(h.cost)}, ${h.trades} giao dịch, ${h.missed} khách bỏ đi.</div>`).join('') || '<span class="muted">Chưa có ngày nào chốt sổ.</span>'}</div>
        </div>
      </div>`;
  }

  private mapPanel(w: World): string {
    return `<div class="map-grid">${LOCATIONS.map((l) => {
      const open = unlocked(w, l.id);
      const cur = w.location === l.id;
      return `<div class="map-card ${cur ? 'cur' : ''} ${open ? '' : 'locked'}">
        <div class="map-img" style="background-image:url('${A(`backgrounds/${l.bg}`)}')"></div>
        <div class="map-body"><b>${esc(l.name)}</b><small>${esc(l.desc)}</small>
          <div class="map-meta">${open ? `Mở từ ngày ${l.unlockDay} · ${l.suppliers.length} mối hàng · ${l.npcs.length} người quen` : `Khoá · mở ngày ${l.unlockDay}`}</div>
          ${open ? this.A('travel', cur ? 'Đang ở đây' : 'Đi tới →', `small ${cur ? 'on' : ''}`, cur ? 'disabled' : '', l.id) : ''}
        </div></div>`;
    }).join('')}</div>`;
  }

  private journalPanel(w: World): string {
    const qs = Object.values(w.quests).filter((q) => q.status !== 'locked');
    return `<div class="journal-cols"><div>
      <h3 class="sub">Chuyện đang mở (${qs.filter((q) => q.status === 'active').length})</h3>
      ${qs.filter((q) => q.status === 'active').map((q) => `<div class="quest active"><b>${esc(q.id)}</b> <span class="muted">mở ngày ${q.day}</span></div>`).join('') || '<span class="muted">Không có nhiệm vụ nào đang chờ.</span>'}
      <h3 class="sub">Đã ngã ngũ (${qs.filter((q) => q.status === 'done').length})</h3>
      ${qs.filter((q) => q.status === 'done').slice(0, 12).map((q) => `<div class="quest done">✓ <b>${esc(q.id)}</b> — ${esc(q.choice)}</div>`).join('') || '<span class="muted">Chưa có quyết định nào.</span>'}
    </div><div>
      <h3 class="sub">Nhật ký quyết định</h3>
      <div class="journal-list">${w.journal.slice(0, 40).map((j) => `<div class="jrow ${j.kind}"><span>Ngày ${j.day}</span><p>${esc(j.text)}</p><small>${esc(j.meta)}</small></div>`).join('')}</div>
    </div></div>`;
  }

  private upgradePanel(w: World): string {
    const p = levelProgress(w);
    return `<div class="up-cols"><div>
      <h3 class="sub">Cấp tiệm ${w.shopLevel}/5 · ${p.ready ? 'đủ điều kiện lên cấp!' : 'đang tích điều kiện'}</h3>
      <div class="reqs">${p.parts.map((x) => `<div>${esc(x)}</div>`).join('')}</div>
      ${p.ready ? this.A('levelup', `Lên cấp ${p.next}`, 'primary') : ''}
      <h3 class="sub">Nâng cấp (${w.upgrades.length}/${UPGRADES.length})</h3>
      <div class="up-grid">${UPGRADES.map((u) => `<div class="up-card ${w.upgrades.includes(u.id) ? 'owned' : ''}">
        <b>${esc(u.name)}</b><small>${esc(u.effect)}</small><p>${esc(u.desc)}</p>
        <div class="up-foot"><span>${u.cost} đ · cần cấp ${u.require}</span>
        ${w.upgrades.includes(u.id) ? '<span class="owned-tag">✓ Đã có</span>' : this.A('upgrade', 'Mua', 'tiny', '', u.id)}</div></div>`).join('')}</div>
    </div><div>
      <h3 class="sub">Nhân viên (${w.staff.length})</h3>
      ${STAFF.map((s) => `<div class="staff"><b>${esc(s.name)}</b> · ${esc(s.role)} · ${s.wage} đ/ngày
        <small>${esc(s.effect)}</small>
        ${w.staff.includes(s.id) ? this.A('fire', 'Cho nghỉ', 'tiny danger', '', s.id) : this.A('hire', 'Thuê', 'tiny', '', s.id)}</div>`).join('')}
      <div class="hint">Nhân viên bớt việc tay, nhưng mọi quyết định giá vẫn do bạn. Họ không tự kiếm tiền.</div>
    </div></div>`;
  }

  private savePanel(w: World): string {
    const saves = listSaves();
    return `<div class="save-list">${saves.map((s) => `<div class="save-row">
      <div><b>${({ auto: 'Tự động', slot1: 'Ô 1', slot2: 'Ô 2', slot3: 'Ô 3' } as Record<string, string>)[s.slot]}</b>
        <small>${s.valid ? `Ngày ${s.day} · ${fmt(s.money)} đ · chương ${s.chapter} · ${new Date(s.savedAt).toLocaleString('vi-VN')}` : 'Trống'}</small></div>
      ${this.A('save', 'Lưu', 'tiny', '', s.slot)}
      ${s.valid ? this.A('load', 'Tải', 'tiny', '', s.slot) : ''}
      ${s.valid ? this.A('deletesave', 'Xoá', 'tiny danger', '', s.slot) : ''}
    </div>`).join('')}</div>
    <div class="save-foot">${this.A('newgame', 'Bắt đầu ván mới', 'danger')}
      <span>Tự động lưu: đầu mỗi ngày, sau mỗi giao dịch và khi ẩn tab. Có bản .bak cho mỗi ô.</span></div>`;
  }

  private helpPanel(): string {
    return `<div class="help-cols"><div><h3 class="sub">Điều khiển</h3>
      <div class="help-keys">${HELP.map(([k, v]) => `<div><kbd>${esc(k)}</kbd><span>${esc(v)}</span></div>`).join('')}</div>
      <h3 class="sub">Một ngày</h3>
      <p class="help-p">Sáng → Nhập hàng → Mở cửa → Chốt sổ → Sự kiện tối. Mỗi pha có nút “Tiếp”, không phải chờ đồng hồ. Quầy bán có kiên nhẫn thật: khách chờ lâu sẽ bỏ đi.</p>
      <h3 class="sub">Tiền tệ</h3><p class="help-p">${esc(CURRENCY_NOTE)}</p>
    </div><div>
      <h3 class="sub">Sáu trụ cột</h3>
      <p class="help-p">Quản lý tiệm · Kho hàng · Giao dịch & thương lượng · Cung ứng & kinh tế · Quan hệ NPC · Sinh tồn & câu chuyện. Mưa làm chậm chuyến hàng → gạo khan → giá nhập tăng → khách cần gạo hơn → bạn chọn giữ, bán giới hạn hay ưu tiên nhà khó.</p>
      <h3 class="sub">Kéo thả</h3>
      <p class="help-p">Kéo ô trong Kho sang Kệ (hoặc ngược lại) để di chuyển. Kéo lên <b>Khay quầy</b> hoặc bấm nhanh ô kệ để đưa hàng lên quầy. Chuột phải tách đôi chồng. “Bổ sung kệ” lấp nhanh các ô trống.</p>
      <h3 class="sub">Kiểm hàng</h3>
      <p class="help-p">Bấm <b>?</b> trên khay để xem phẩm chất, nguồn gốc và mở gói hàng không rõ gốc. Hàng kém mà không kiểm sẽ bị khách phàn nàn.</p>
    </div></div>`;
  }

  private settingsPanel(w: World): string {
    const s = w.settings;
    return `<div class="settings">
      <div class="setting"><b>Âm thanh</b>${this.A('sound', s.sound ? 'Bật' : 'Tắt', `small ${s.sound ? 'on' : ''}`)}</div>
      <div class="setting"><b>Âm lượng</b><input type="range" min="0" max="100" value="${Math.round(s.volume * 100)}" data-field="volume"></div>
      <div class="setting"><b>Giảm hiệu ứng</b>${this.A('reduced', s.reduced ? 'Bật' : 'Tắt', `small ${s.reduced ? 'on' : ''}`)}</div>
      <div class="setting"><b>Tự sắp kho</b>${this.A('autosort', s.autoSort ? 'Bật' : 'Tắt', `small ${s.autoSort ? 'on' : ''}`)}</div>
      <div class="setting"><b>Tự dừng khi mở bảng</b>${this.A('autopause', s.autoPause ? 'Bật' : 'Tắt', `small ${s.autoPause ? 'on' : ''}`)}</div>
      <h3 class="sub">Độ khó (áp dụng cho ván mới)</h3>
      ${(Object.keys(DIFFICULTY) as (keyof typeof DIFFICULTY)[]).map((d) => `<div class="diff ${w.difficulty === d ? 'cur' : ''}">
        <b>${esc(DIFFICULTY[d].name)}</b><small>${esc(DIFFICULTY[d].desc)}</small>
        ${this.A('difficulty', w.difficulty === d ? 'Đang chơi' : 'Chọn', 'tiny', '', d)}</div>`).join('')}
      <div class="hint">${esc(CURRENCY_NOTE)}</div>
    </div>`;
  }

  // ── Modal / title / loading ───────────────────────────────────────────────
  private paintModal(): string {
    const m = this.modal;
    if (!m) return '';
    return `<div class="modal-bg"><div class="modal-card ${m.kind}">
      <div class="modal-head"><h2>${esc(m.title)}</h2>${m.closable !== false ? this.A('modalclose', '×', 'icon') : ''}</div>
      ${m.sub ? `<div class="modal-sub">${esc(m.sub)}</div>` : ''}
      <div class="modal-text">${esc(m.text)}</div>
      ${m.table ? `<pre class="modal-sheet">${esc(m.table)}</pre>` : ''}
      <div class="modal-choices">${(m.choices ?? []).map((c, i) => this.A(c.act, esc(c.label), 'primary', '', c.value ?? String(i))).join('')}</div>
    </div></div>`;
  }

  private title(w: World): string {
    const saves = listSaves().filter((s) => s.valid);
    return `<div class="title-card">
      <div class="title-kicker">Việt Nam · Tháng Tám 1945</div>
      <h1>CỬA HÀNG 1945</h1>
      <p class="title-sub">Một quầy gỗ. Vài cái kệ. Ba mươi ngày để giữ một cái tiệm và những người quanh nó.</p>
      <div class="title-btns">
        ${this.A('newgame', 'Bắt đầu ván mới', 'primary big')}
        ${saves.length ? this.A('continue', `Tiếp ván · ngày ${saves[0].day}`, 'big') : ''}
        ${this.A('panel', 'Cách chơi', 'big', '', 'help')}
      </div>
      <div class="title-foot">${esc(DIFFICULTY[w.difficulty].name)} · ${esc(CURRENCY)} · pixel art · nhạc & tiếng động sinh ra trực tiếp</div>
    </div>`;
  }
  private loadingScreen(): string {
    const l = this.loading!;
    return `<div class="load-card"><div class="load-title">CỬA HÀNG 1945</div>
      <div class="load-note">Đang xếp hàng lên kệ…</div>
      <div class="load-bar"><i style="width:${Math.round(l.done / Math.max(1, l.total) * 100)}%"></i></div>
      <div class="load-num">${l.done}/${l.total} asset</div></div>`;
  }

  // ── Sự kiện DOM ───────────────────────────────────────────────────────────
  private onClick(e: Event): void {
    const target = e.target as HTMLElement;
    const btn = target.closest<HTMLElement>('[data-act]');
    if (!btn || btn.hasAttribute('disabled')) return;
    const act = btn.dataset.act!, value = btn.dataset.value ?? '';
    this.host.handle({ type: 'action', action: act, value });
  }
  private onInput(e: Event): void {
    const t = e.target as HTMLInputElement;
    if (!t.dataset.field) return;
    if (t.dataset.field === 'search') {
      this.focus = { key: 'search', pos: t.selectionStart ?? t.value.length };
      this.host.handle({ type: 'search', value: t.value });
    } else if (t.dataset.field === 'volume') {
      this.host.handle({ type: 'action', action: 'volume', value: t.value });
    }
  }
  private onChange(e: Event): void {
    const t = e.target as HTMLSelectElement | HTMLInputElement;
    if (t.dataset.field === 'sort') this.host.handle({ type: 'sort', value: t.value });
  }
  private onContext(e: Event): void {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-grid][data-i]');
    if (!cell) return;
    e.preventDefault();
    this.host.handle({ type: 'split', from: cell.dataset.grid as GridId, fi: Number(cell.dataset.i) });
  }

  private onDown(e: PointerEvent): void {
    const cell = (e.target as HTMLElement).closest<HTMLElement>('[data-grid][data-i]');
    if (!cell || (e.target as HTMLElement).closest('button')) return;
    this.drag = { grid: cell.dataset.grid as GridId, i: Number(cell.dataset.i), x: e.clientX, y: e.clientY, moved: false };
  }
  private onMove(e: PointerEvent): void {
    if (!this.drag) return;
    const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
    if (!this.drag.moved && Math.hypot(dx, dy) < 7) return;
    this.drag.moved = true;
    if (!this.ghost) {
      const stackEl = this.root.querySelector<HTMLElement>(`[data-grid="${this.drag.grid}"][data-i="${this.drag.i}"]`);
      const im = stackEl?.querySelector('img');
      const g = document.createElement('div');
      g.className = 'drag-ghost';
      g.innerHTML = im ? `<img src="${im.getAttribute('src')}" alt="">` : '';
      this.el('ghost').appendChild(g);
      this.ghost = g;
    }
    if (this.ghost) { this.ghost.style.left = `${e.clientX}px`; this.ghost.style.top = `${e.clientY}px`; }
  }
  private onUp(e: PointerEvent): void {
    const d = this.drag;
    this.drag = null;
    if (this.ghost) { this.ghost.remove(); this.ghost = null; }
    if (!d) return;
    const under = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const target = under?.closest<HTMLElement>('[data-grid][data-i], [data-tray], [data-traycell]');
    if (!d.moved) {
      if (target?.dataset.grid) {
        this.host.handle({ type: 'select', from: d.grid, fi: d.i });
      }
      return;
    }
    if (target?.dataset.tray !== undefined || target?.dataset.traycell !== undefined) {
      this.host.handle({ type: 'tray', from: d.grid, fi: d.i });
      return;
    }
    if (target?.dataset.grid) {
      const to = target.dataset.grid as GridId, ti = Number(target.dataset.i);
      if (e.shiftKey) this.host.handle({ type: 'move', from: d.grid, fi: d.i, to, ti, qty: 1 });
      else this.host.handle({ type: 'move', from: d.grid, fi: d.i, to, ti });
    }
  }
}

function randomLineSafe(w: World): string {
  return ({
    storm: 'Mưa dập mái. Cả xóm đóng cửa sớm, chỉ còn ánh đèn tiệm bạn.',
    rain: 'Mưa rả rích trên mái, mùi đèn dầu đậm hơn.',
    clear: 'Trời quang, tiếng chổi quét ngõ vọng tới cửa.',
    cloudy: 'Trời xám, có người ghé muộn sau khi chợ tan.',
  } as Record<string, string>)[w.weather];
}
