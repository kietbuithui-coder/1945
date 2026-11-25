// ── people.ts · NPC AI: lịch, nhu cầu, trí nhớ, quan hệ ─────────────────────
import { DIFFICULTY, ITEM, NPC, NPCS, portrait } from './data';
import { fairSell } from './economy';
import { totalItem } from './inventory';
import { clamp, coin, hasStaff, hasUpgrade, journal, note, pick, rint, rnd, uid } from './state';
import type { BarterOffer, Customer, Mood, Relation, Request, World } from './types';

export function rel(w: World, id: string): Relation {
  if (!w.relations[id]) {
    w.relations[id] = { trust: NPC[id]?.trust ?? 50, bond: 0, visits: 0, lastDay: 0, helped: 0, refused: 0, history: [], flags: {} };
  }
  return w.relations[id];
}

export function adjust(w: World, id: string, delta: number, why: string): void {
  const r = rel(w, id);
  const before = r.trust;
  r.trust = clamp(r.trust + delta, 0, 100);
  r.bond = clamp(r.bond + Math.round(delta * 0.6), -50, 100);
  r.history.unshift(`Ngày ${w.day}: ${why} (${delta >= 0 ? '+' : ''}${delta})`);
  if (r.history.length > 12) r.history.length = 12;
  if (Math.abs(r.trust - before) >= 5) {
    journal(w, 'story', `${NPC[id]?.name ?? id} ${delta > 0 ? 'nhớ thêm' : 'nguôi đi'} một chút vì ${why.toLowerCase()}.`, 'Quan hệ');
  }
}

const LINES: Record<string, string[]> = {
  rice_white: ['Cho mình một bát gạo trắng.', 'Gạo mới còn không chú?', 'Nhà mình hết gạo từ hôm qua.'],
  rice_old: ['Gạo cũ thôi cũng được.', 'Mình lấy ít gạo vừa đủ nấu.'],
  salt: ['Cần chút muối để ướp cá.', 'Muối còn không, cô/chú ơi?'],
  herbal_medicine: ['Thầy lang dặn mua thang thuốc.', 'Nhà có người sốt, cần thuốc nam.'],
  quinine: ['Còn chai ký ninh nào không?', 'Cô Tuyết bảo ghé đây hỏi thử.'],
  charcoal: ['Lò rèn hết than rồi.', 'Cho mình mấy cân than củi.'],
  fresh_fish: ['Cá mới đưa lên bến, mua giúp mình ít.', 'Cá tươi hôm nay có không?'],
  tea_leaves: ['Cho mình nắm chè khô.', 'Ấm chè nhà mình cạn từ hôm rồi.'],
  default: ['Cho mình xem ít hàng trên kệ.', 'Có thứ này không, cô/chú?', 'Mình ghé mua đúng thứ cần thôi.'],
};

function lineFor(item: string, w: World): string {
  const arr = LINES[item] ?? LINES.default;
  return pick(w, arr);
}

function barterFor(w: World, npcId: string, item: string): BarterOffer | undefined {
  const n = NPC[npcId];
  const table: Record<string, string[]> = {
    ong_nam: ['corn', 'sweet_potato', 'peanuts'],
    anh_vuong: ['fresh_fish', 'dried_fish'],
    bac_hung: ['bamboo', 'rope', 'charcoal'],
    co_hoa: ['cloth', 'do_paper'],
    ba_giao: ['cloth', 'soap'],
    ong_giao_minh: ['old_book', 'do_paper'],
    ong_chin: ['tea_set', 'sugar'],
  };
  const cands = (table[npcId] ?? []).filter((x) => x !== item && ITEM[x]);
  if (!cands.length || rnd(w) > 0.45) return undefined;
  const offer = pick(w, cands);
  return { item: offer, qty: rint(w, 1, 3), q: (rnd(w) < 0.2 ? 2 : 1) as 0 | 1 | 2 | 3 };
}

function requestFor(w: World, npcId: string): Request {
  const n = NPC[npcId];
  // Nhu cầu cá nhân, nhưng ưu tiên món đang có trên kệ để giao dịch luôn có thể xảy ra
  const onShelf = w.shelves.cells.filter((c) => c && ITEM[c.item]).map((c) => c!.item);
  const pool = n.needs.filter((i) => ITEM[i] && (onShelf.includes(i) || totalItem(w, i) > 0 || rnd(w) < 0.45));
  const item = (pool.length ? pick(w, pool) : pick(w, onShelf.length ? onShelf : n.needs)) as string;
  const d = ITEM[item] ?? ITEM.rice_white;
  const qty = d.tags.includes('rare') ? 1 : rint(w, 1, Math.min(3, d.stack));
  const market = fairSell(w, item, 1);
  const urgency = clamp(0.35 + (n.trait.includes('lo lắng') ? 0.25 : 0) + (d.tags.includes('medicine') ? 0.3 : 0) + (rnd(w) - 0.5) * 0.3, 0, 1);
  const maxPrice = coin(market * qty * (0.85 + urgency * 0.45 + rnd(w) * 0.25));
  const budget = coin(rint(w, n.budget[0], n.budget[1]) * (0.8 + w.day / 60));
  const wantsCredit = (n.age > 60 || n.trait.includes('Lo lắng') || n.trait.includes('tự trọng')) && rnd(w) < 0.35;
  return {
    item, qty, maxPrice: Math.max(maxPrice, budget), urgency,
    barter: barterFor(w, npcId, item), credit: wantsCredit && budget < maxPrice,
    note: n.desc,
  };
}

function moodOf(w: World, r: Relation, urgency: number): Mood {
  if (w.rep < 35 && r.trust < 45) return 'angry';
  if (r.trust < 35) return 'sad';
  if (r.trust > 72 || r.helped > 1) return 'happy';
  if (urgency > 0.75) return 'tired';
  return 'neutral';
}

export function makeCustomer(w: World, npcId: string, arrive: number, arcStep = 0): Customer {
  const n = NPC[npcId];
  const r = rel(w, npcId);
  const request = requestFor(w, npcId);
  const mood = moodOf(w, r, request.urgency);
  return {
    id: uid(w, 'c'), npc: npcId, name: n.name,
    portrait: portrait(npcId, mood), sprite: npcId,
    mood, arrive, line: lineFor(request.item, w), request,
    budget: coin(rint(w, n.budget[0], n.budget[1]) * (0.85 + w.day / 70)),
    patience: DIFFICULTY[w.difficulty].patience * (22 + r.trust / 8) * (hasStaff(w, 'mai') ? 1.2 : 1) * (hasUpgrade(w, 'counter') ? 1.25 : 1),
    haggle: rnd(w), state: 'waiting', result: '', arcStep,
  };
}

const ARC_DAYS: Record<string, number[]> = {
  arc_cuc: [3, 9, 16, 23, 29],
  arc_lan: [2, 7, 15, 22, 28],
  arc_nam: [4, 10, 17, 25],
  arc_vuong: [5, 11, 18, 26],
  arc_hung: [8, 14, 21, 27],
  arc_tuyet: [13, 20, 27],
  arc_tam: [6, 12, 19, 24],
  arc_chin: [9, 16, 24, 29],
  arc_sen: [7, 15, 23, 30],
};

/** Lịch khách trong ngày: có logic, không random toàn bộ. */
export function buildQueue(w: World): Customer[] {
  const base = DIFFICULTY[w.difficulty].customers;
  const bonus = (w.shopLevel - 1) + (hasUpgrade(w, 'sign') ? 1 : 0) + (hasUpgrade(w, 'window') ? 1 : 0)
    + (hasUpgrade(w, 'lamp') ? 1 : 0) + (w.rep >= 70 ? 1 : 0) + (w.community >= 70 ? 1 : 0);
  const count = clamp(base + bonus + rint(w, -1, 1), 3, 11);
  const out: Customer[] = [];
  const used = new Set<string>();

  // NPC có chuỗi sự kiện cá nhân xuất hiện đúng những ngày đã định
  for (const n of NPCS) {
    if (!n.arc) continue;
    const days = ARC_DAYS[n.arc] ?? [];
    const step = days.filter((d) => d <= w.day).length;
    if (days.includes(w.day) || (w.day > 6 && w.day % 9 === 0 && rnd(w) < 0.5)) {
      out.push(makeCustomer(w, n.id, 480 + rint(w, 0, 90), step));
      used.add(n.id);
    }
  }

  const timePref: Record<string, [number, number]> = {
    morning: [480, 630], midday: [630, 810], afternoon: [810, 990], any: [480, 990],
  };
  let guard = 0;
  while (out.length < count && guard++ < 200) {
    const n = pick(w, NPCS);
    if (used.has(n.id)) continue;
    const [lo, hi] = timePref[n.schedule];
    const r = rel(w, n.id);
    // người mất niềm tin ghé ít hẳn đi, nhưng không biến mất hoàn toàn
    if (r.trust < 30 && rnd(w) < 0.7) continue;
    if (w.weather === 'storm' && n.job.includes('đánh cá') && rnd(w) < 0.6) continue;
    if (r.bond > 25 && rnd(w) < 0.25) continue; // người quen kéo thêm khách mới → xử lý ở referral
    used.add(n.id);
    out.push(makeCustomer(w, n.id, rint(w, lo, hi)));
  }
  out.sort((a, b) => a.arrive - b.arrive);
  w.queue = out;
  w.activeCustomerId = null;
  return out;
}

export function referral(w: World, npcId: string): boolean {
  const r = rel(w, npcId);
  if (r.trust < 72 || r.bond < 18 || w.queue.length >= 11 || rnd(w) > 0.28) return false;
  const cands = NPCS.filter((n) => !w.queue.some((c) => c.npc === n.id) && rel(w, n.id).trust > 40);
  if (!cands.length) return false;
  const n = pick(w, cands);
  const c = makeCustomer(w, n.id, Math.min(1000, w.minute + rint(w, 10, 40)));
  w.queue.push(c);
  w.queue.sort((a, b) => a.arrive - b.arrive);
  note(w, `${NPC[npcId].name} giới thiệu ${n.name} ghé tiệm.`);
  journal(w, 'story', `${NPC[npcId].name} kéo thêm ${n.name} tới cửa tiệm.`, 'Quan hệ');
  return true;
}

export function arrived(w: World): Customer[] {
  return w.queue.filter((c) => c.state === 'waiting' && c.arrive <= w.minute);
}
export function activeCustomer(w: World): Customer | null {
  if (!w.activeCustomerId) return null;
  return w.queue.find((c) => c.id === w.activeCustomerId) ?? null;
}
export function callNext(w: World): Customer | null {
  const a = activeCustomer(w);
  if (a && a.state === 'active') return a;
  const line = arrived(w);
  if (!line.length) return null;
  const c = line[0];
  c.state = 'active';
  w.activeCustomerId = c.id;
  const r = rel(w, c.npc);
  r.visits += 1; r.lastDay = w.day;
  c.mood = moodOf(w, r, c.request.urgency);
  c.portrait = portrait(c.npc, c.mood);
  return c;
}

/** Kiên nhẫn có thật: khách bỏ đi nếu chờ quá lâu. */
export function tickPatience(w: World, dt: number): Customer[] {
  const left: Customer[] = [];
  for (const c of w.queue) {
    // Cả người đang ở quầy lẫn người xếp hàng đều có kiên nhẫn thật.
    if ((c.state !== 'waiting' && c.state !== 'active') || c.arrive > w.minute) continue;
    c.patience -= dt;
    if (c.patience <= 0) {
      c.state = 'left'; c.result = 'Chờ quá lâu, khách bỏ đi.';
      if (w.activeCustomerId === c.id) w.activeCustomerId = null;
      left.push(c);
      w.stats.missed += 1; w.dayLog.missed += 1;
      w.rep = clamp(w.rep - 1, 0, 100); w.dayLog.repDelta -= 1;
      w.stats.streak = 0;
      adjust(w, c.npc, -2, 'phải chờ quá lâu ở quầy');
    }
  }
  return left;
}

export interface TradeOutcome {
  ok: boolean;
  qualityBad: boolean;
  helped: boolean;
  refused: boolean;
  value: number;
  mode: string;
}

/** Phản ứng có mức độ, không cực đoan chỉ vì một lần. */
export function onTradeDone(w: World, c: Customer, o: TradeOutcome): void {
  const r = rel(w, c.npc);
  c.state = o.ok ? 'served' : 'left';
  c.result = o.ok ? 'Đã xong giao dịch.' : 'Không thành giao dịch.';
  if (o.ok) {
    w.stats.served += 1; w.dayLog.served += 1; w.stats.trades += 1; w.dayLog.trades += 1;
    w.stats.streak += 1;
    w.stats.bestStreak = Math.max(w.stats.bestStreak, w.stats.streak);
    const delta = clamp(1 + (o.helped ? 3 : 0) + (o.qualityBad ? -3 : 0) + (w.stats.streak >= 4 ? 1 : 0), -4, 6);
    adjust(w, c.npc, delta, o.helped ? 'được giúp lúc khó' : o.qualityBad ? 'mua phải hàng kém' : 'giao dịch êm');
    w.rep = clamp(w.rep + (o.helped ? 2 : 1) - (o.qualityBad ? 3 : 0), 0, 100);
    w.dayLog.repDelta += (o.helped ? 2 : 1) - (o.qualityBad ? 3 : 0);
    if (o.helped) {
      r.helped += 1; w.stats.helped += 1;
      w.community = clamp(w.community + 2, 0, 100); w.dayLog.communityDelta += 2;
    }
    if (o.qualityBad) {
      w.community = clamp(w.community - 1, 0, 100); w.dayLog.communityDelta -= 1;
      note(w, `${c.name} phàn nàn về phẩm chất hàng.`);
    }
    if (w.stats.streak === 4) note(w, 'Bốn giao dịch liền tay — tiếng lành bắt đầu đi xa.');
    referral(w, c.npc);
    c.mood = o.helped ? 'happy' : o.qualityBad ? 'angry' : 'happy';
  } else {
    w.stats.streak = 0;
    if (o.refused) {
      r.refused += 1; w.stats.refused += 1;
      adjust(w, c.npc, -2, 'bị từ chối ở quầy');
      w.rep = clamp(w.rep - 1, 0, 100); w.dayLog.repDelta -= 1;
    } else {
      adjust(w, c.npc, -1, 'không chốt được giá');
    }
    c.mood = o.refused ? 'sad' : 'neutral';
  }
  c.portrait = portrait(c.npc, c.mood);
  w.activeCustomerId = null;
  journal(w, 'sale', `${c.name}: ${o.ok ? `chốt ${o.value} đ (${o.mode})` : 'không thành giao dịch'}.`, 'Quầy');
}

export function npcSummary(w: World, id: string): string {
  const n = NPC[id], r = rel(w, id);
  if (!n) return '';
  return [
    `${n.name} · ${n.age} tuổi · ${n.job} · ${n.home}`,
    n.trait, n.desc,
    `Tín nhiệm ${Math.round(r.trust)} · thân tình ${r.bond} · đã ghé ${r.visits} lần`,
    `Được giúp ${r.helped} · bị từ chối ${r.refused}`,
    r.history.length ? `Gần nhất: ${r.history[0]}` : 'Chưa có giao dịch nào.',
  ].join('\n');
}
