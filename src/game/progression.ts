// ── progression.ts · cấp tiệm, nâng cấp, nhân viên, bản đồ ──────────────────
import { LOCATION, LOCATIONS, STAFF_MAP, SUPPLIER, UPGRADE } from './data';
import { clamp, hasStaff, hasUpgrade, journal, note, pick, rnd } from './state';
import { resizeGrids } from './inventory';
import { adjust } from './people';
import type { World } from './types';

export interface Result { ok: boolean; message: string }

const LEVEL_REQ: Record<number, { day: number; rep: number; community: number; upgrades: number; quests: number; chapter: number; label: string }> = {
  2: { day: 5, rep: 52, community: 45, upgrades: 0, quests: 1, chapter: 1, label: 'Tiệm ổn định' },
  3: { day: 11, rep: 58, community: 55, upgrades: 1, quests: 2, chapter: 2, label: 'Cửa hàng lớn hơn' },
  4: { day: 18, rep: 65, community: 62, upgrades: 3, quests: 4, chapter: 3, label: 'Trung tâm trao đổi' },
  5: { day: 25, rep: 72, community: 68, upgrades: 5, quests: 6, chapter: 4, label: 'Cửa hàng có ảnh hưởng' },
};

export function levelProgress(w: World): { next: number; parts: string[]; ready: boolean } {
  const n = clamp(w.shopLevel + 1, 2, 5);
  const r = LEVEL_REQ[n];
  if (!r) return { next: 5, parts: ['Đã đạt cấp cao nhất.'], ready: false };
  const doneQuests = Object.values(w.quests).filter((q) => q.status === 'done').length;
  const parts = [
    `${w.day >= r.day ? '✓' : '·'} Ngày ${r.day} (hiện ${w.day})`,
    `${w.rep >= r.rep ? '✓' : '·'} Uy tín ${r.rep} (hiện ${Math.round(w.rep)})`,
    `${w.community >= r.community ? '✓' : '·'} Lòng tin xóm ${r.community} (hiện ${Math.round(w.community)})`,
    `${w.upgrades.length >= r.upgrades ? '✓' : '·'} ${r.upgrades} nâng cấp (hiện ${w.upgrades.length})`,
    `${doneQuests >= r.quests ? '✓' : '·'} ${r.quests} chuyện đã ngã ngũ (hiện ${doneQuests})`,
    `${w.chapter >= r.chapter ? '✓' : '·'} Chương ${r.chapter}`,
  ];
  const ready = w.day >= r.day && w.rep >= r.rep && w.community >= r.community
    && w.upgrades.length >= r.upgrades && doneQuests >= r.quests && w.chapter >= r.chapter;
  return { next: n, parts, ready };
}

/** Không mở cấp chỉ bằng tiền: cần uy tín, dịch vụ, quan hệ, nguồn cung và truyện. */
export function checkLevel(w: World): number | null {
  const p = levelProgress(w);
  if (!p.ready || w.shopLevel >= 5) return null;
  w.shopLevel = p.next;
  resizeGrids(w);
  journal(w, 'story', `Cửa tiệm lên cấp ${p.next} · ${LEVEL_REQ[p.next].label}. Khung cảnh trong tiệm đổi khác đi.`, 'Phát triển');
  w.news.unshift(`Cửa tiệm lên cấp ${p.next}: ${LEVEL_REQ[p.next].label}.`);
  note(w, `Lên cấp ${p.next} — kệ và kho rộng hơn.`);
  return p.next;
}

export function buyUpgrade(w: World, id: string): Result {
  const u = UPGRADE[id];
  if (!u) return { ok: false, message: 'Nâng cấp không tồn tại.' };
  if (hasUpgrade(w, id)) return { ok: false, message: 'Đã có nâng cấp này rồi.' };
  if (w.shopLevel < u.require) return { ok: false, message: `Cần tiệm cấp ${u.require}.` };
  if (w.money < u.cost) return { ok: false, message: `Thiếu ${u.cost - w.money} đ.` };
  w.money -= u.cost; w.dayLog.cost += u.cost;
  w.upgrades.push(id);
  resizeGrids(w);
  journal(w, 'system', `${u.name}: ${u.desc} ${u.effect}.`, 'Nâng cấp');
  note(w, `${u.name} — ${u.effect}.`);
  return { ok: true, message: `${u.name} xong. ${u.effect}` };
}

export function hire(w: World, id: string): Result {
  const s = STAFF_MAP[id];
  if (!s) return { ok: false, message: 'Không có người này.' };
  if (hasStaff(w, id)) return { ok: false, message: `${s.name} đang làm rồi.` };
  if (w.shopLevel < 3) return { ok: false, message: 'Cần tiệm cấp 3 mới thuê được người.' };
  if (w.money < s.wage * 2) return { ok: false, message: `Cần trả trước ${s.wage * 2} đ.` };
  w.money -= s.wage * 2; w.dayLog.cost += s.wage * 2;
  w.staff.push(id);
  journal(w, 'system', `Thuê ${s.name} (${s.role}, ${s.wage} đ/ngày). ${s.effect}.`, 'Nhân sự');
  return { ok: true, message: `${s.name} nhận việc. ${s.effect}` };
}
export function dismiss(w: World, id: string): Result {
  if (!hasStaff(w, id)) return { ok: false, message: 'Họ không làm ở đây.' };
  w.staff = w.staff.filter((x) => x !== id);
  w.rep = clamp(w.rep - 2, 0, 100);
  journal(w, 'system', `${STAFF_MAP[id].name} thôi việc.`, 'Nhân sự');
  return { ok: true, message: `${STAFF_MAP[id].name} thôi việc, uy tín −2.` };
}

export function unlocked(w: World, id: string): boolean {
  const l = LOCATION[id];
  return !!l && w.day >= l.unlockDay;
}

/** Đi lại tốn thời gian thật và luôn có hệ quả thật. */
export function travel(w: World, id: string): Result {
  const l = LOCATION[id];
  if (!l) return { ok: false, message: 'Nơi này không có trên bản đồ.' };
  if (!unlocked(w, id)) return { ok: false, message: `Nơi này mở từ ngày ${l.unlockDay}.` };
  if (w.travelUsed) return { ok: false, message: 'Hôm nay đã đi một chuyến rồi, ngày mai đi tiếp.' };
  if (w.phase === 'open') return { ok: false, message: 'Đang có khách ở quầy, không đi xa được.' };
  w.location = id;
  w.travelUsed = true;
  w.minute += 30;
  let extra = '';
  switch (l.action) {
    case 'counter': extra = 'Bạn về lại quầy.'; break;
    case 'market': {
      for (const sid of l.suppliers) {
        const s = w.suppliers[sid];
        if (s) { s.bond = clamp(s.bond + 2, 0, 100); s.stock[Object.keys(s.stock)[0]] && (s.stock[Object.keys(s.stock)[0]].qty += 1); }
      }
      extra = 'Dạo chợ: mối hàng thân hơn, có thêm một ít hàng.'; break;
    }
    case 'river': {
      const s = w.suppliers.anh_vuong;
      if (s) s.stock.fresh_fish = { qty: (s.stock.fresh_fish?.qty ?? 0) + (w.weather === 'storm' ? 0 : 2), q: 2 };
      extra = w.weather === 'storm' ? 'Bến vắng, thuyền không ra.' : 'Thuyền vừa cập bến, cá tươi thêm 2 con.'; break;
    }
    case 'visit': {
      const n = pick(w, l.npcs);
      adjust(w, n, 3, 'bạn ghé nhà hỏi thăm');
      w.community = clamp(w.community + 2, 0, 100);
      extra = `Ghé nhà ${l.npcs.length ? n : 'người quen'}, ngồi nói một lát.`; break;
    }
    case 'rumour': {
      w.news.unshift('Tin ở quán nước: giá gạo mấy hôm nay khó đoán.');
      w.flags.rumour = (w.flags.rumour ?? 0) + 1;
      w.market.rice_white.flag = clamp(w.market.rice_white.flag + (rnd(w) < 0.5 ? 0.05 : -0.05), -0.3, 0.3);
      extra = 'Nghe được một câu có thể đổi giá ngày mai.'; break;
    }
    case 'order': {
      for (const sid of l.suppliers) { const s = w.suppliers[sid]; if (s) s.bond = clamp(s.bond + 3, 0, 100); }
      w.flags.order_visit = 1;
      extra = 'Đặt chuyến ở kho: thương lái ưu tiên hơn, giá đặt trước tốt hơn.'; break;
    }
    case 'help': {
      w.community = clamp(w.community + 3, 0, 100);
      w.dayLog.communityDelta += 3;
      if (l.npcs.length) adjust(w, pick(w, l.npcs), 2, 'bạn ghé giúp một tay');
      extra = 'Không bán gì cả, nhưng ai đó trong ngõ nhớ bạn.'; break;
    }
    case 'dispatch': {
      let n = 0;
      for (const d of w.deliveries) if (d.due > w.day) { d.due -= 1; n++; }
      extra = n ? `Giục ${n} chuyến hàng, mỗi chuyến sớm thêm một ngày.` : 'Ra bãi, hôm nay không có chuyến nào đậu.'; break;
    }
  }
  journal(w, 'system', `Đi ${l.name}. ${extra}`, 'Bản đồ');
  note(w, `Đi ${l.name} (30 phút).`);
  return { ok: true, message: `${l.name}: ${extra}` };
}

export function visualUpgrades(w: World): string[] {
  return w.upgrades.map((id) => UPGRADE[id]?.visual).filter((x): x is string => !!x);
}
export const locationList = (): typeof LOCATIONS => LOCATIONS;
export const supplierName = (id: string): string => SUPPLIER[id]?.name ?? id;
