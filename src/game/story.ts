// ── story.ts · chương, nhiệm vụ, sự kiện, quyết định, kết thúc ──────────────
import { CHAPTERS, ENDINGS, EVENTS, EVENT, ITEM, NPC, QUEST, QUESTS, UPGRADE } from './data';
import type { EventDef, QuestDef } from './data';
import { place, resizeGrids } from './inventory';
import { addDebt, removeItem, resolveDeliveries } from './economy';
import { adjust, rel } from './people';
import { clamp, hasUpgrade, journal, note, rnd } from './state';
import type { World } from './types';

// ── Effect DSL ──────────────────────────────────────────────────────────────
export function applyEffects(w: World, effects: string[]): string[] {
  const out: string[] = [];
  for (const raw of effects) {
    const p = raw.split(':');
    const key = p[0];
    const arg = p[1] ?? '';
    const num = (s: string): number => Number(s) || 0;
    switch (key) {
      case 'money': {
        const d = num(p[1]); w.money = Math.max(0, w.money + d);
        if (d > 0) w.dayLog.revenue += d; else w.dayLog.cost += -d;
        out.push(`${d >= 0 ? '+' : ''}${d} đ`); break;
      }
      case 'rep': {
        const d = num(p[1]); w.rep = clamp(w.rep + d, 0, 100); w.dayLog.repDelta += d;
        out.push(`uy tín ${d >= 0 ? '+' : ''}${d}`); break;
      }
      case 'community': {
        const d = num(p[1]); w.community = clamp(w.community + d, 0, 100); w.dayLog.communityDelta += d;
        out.push(`lòng tin xóm ${d >= 0 ? '+' : ''}${d}`); break;
      }
      case 'family': {
        const d = num(p[1]); w.family = clamp(w.family + d, 0, 20);
        out.push(`bếp nhà ${d >= 0 ? '+' : ''}${d}`); break;
      }
      case 'item': {
        const id = p[1], d = num(p[2]), q = (p[3] ? Number(p[3]) : 1) as 0 | 1 | 2 | 3;
        if (!ITEM[id]) break;
        if (d > 0) place(w, 'warehouse', id, d, q, 'story');
        else removeItem(w, id, -d);
        out.push(`${d >= 0 ? '+' : ''}${d} ${ITEM[id].name}`); break;
      }
      case 'relation': {
        if (!NPC[arg]) break;
        adjust(w, arg, num(p[2]), 'một quyết định của bạn');
        out.push(`quan hệ ${NPC[arg].name} ${p[2]}`); break;
      }
      case 'flag': {
        const cur = w.flags[arg] ?? 0;
        const v = p[2]?.startsWith('+') ? cur + num(p[2].slice(1)) : num(p[2]);
        w.flags[arg] = v; break;
      }
      case 'debt': {
        if (arg === 'pay') {
          // "debt:pay:6" = thu 6 đ nợ cũ, không tạo khoản nợ mới.
          let left = Math.max(0, num(p[2]));
          let got = 0;
          for (const d of w.debts) {
            if (left <= 0 || d.kind !== 'receivable') continue;
            const pay = Math.min(left, Math.max(0, d.amount - d.paid));
            if (pay <= 0) continue;
            d.paid += pay; left -= pay; got += pay;
            d.history.push(`Ngày ${w.day}: trả ${pay} đ (sự kiện)`);
          }
          w.debts = w.debts.filter((d) => d.paid < d.amount);
          out.push(`thu ${got} đ nợ cũ`);
        } else {
          addDebt(w, NPC[arg]?.name ?? arg, NPC[arg] ? arg : null, num(p[2]), w.day + num(p[3]), 'receivable');
          out.push(`ghi nợ ${num(p[2])} đ`);
        }
        break;
      }
      case 'quest': {
        if (w.quests[arg]) { w.quests[arg].status = p[2] as 'active' | 'done' | 'failed'; w.quests[arg].day = w.day; }
        break;
      }
      case 'upgrade': {
        if (UPGRADE[arg] && !hasUpgrade(w, arg)) {
          w.upgrades.push(arg); resizeGrids(w);
          out.push(`nhận ${UPGRADE[arg].name}`);
        }
        break;
      }
      case 'supplier': {
        const s = w.suppliers[arg];
        if (s) { s.bond = clamp(s.bond + num(p[2]), 0, 100); out.push(`mối hàng ${arg} thắt chặt`); }
        break;
      }
      case 'market': {
        const m = w.market[arg];
        if (m) m.flag = clamp(m.flag + num(p[2]), -0.35, 0.35);
        break;
      }
      case 'news': w.news.unshift(raw.slice(5)); break;
      case 'delivery': {
        if (arg === 'rescue' || arg === 'check' || arg === 'protect') {
          for (const d of w.deliveries) {
            if (arg === 'rescue') d.due = Math.min(d.due, w.day);
            if (arg === 'protect') d.risk = Math.max(0, d.risk - 0.3);
            if (arg === 'check') d.risk = Math.max(0, d.risk - 0.1);
          }
          if (arg === 'check') out.push('hỏi tin, rủi ro chuyến −10%');
          if (arg === 'protect') out.push('buộc chặt chuyến, rủi ro −30%');
          if (arg === 'rescue') { resolveDeliveries(w); out.push('kéo chuyến về hôm nay'); }
        }
        break;
      }
      case 'staff': if (!w.staff.includes(arg)) w.staff.push(arg); break;
      default: break;
    }
  }
  return out;
}
// ── Điều kiện ───────────────────────────────────────────────────────────────
export function condition(w: World, cond?: string): boolean {
  if (!cond) return true;
  const [a, b, c] = cond.split(':');
  switch (a) {
    case 'day': return cmp(w.day, b);
    case 'daymod': return w.day % Number(b || 6) === 0;
    case 'flag': return cmp(w.flags[b] ?? 0, c);
    case 'quest': return w.quests[b]?.status === c;
    case 'weather': return w.weather === b;
    case 'rep': return cmp(w.rep, b);
    case 'community': return cmp(w.community, b);
    case 'debt': return b === 'any' ? w.debts.length > 0 : w.debts.some((d) => d.kind === b);
    case 'delivery': return b === 'any' ? w.deliveries.length > 0 : !!w.flags[`delivery_${b}`];
    case 'relation': {
      if (b === 'any') return Object.values(w.relations).some((r) => cmp(r.trust, c));
      return cmp(rel(w, b).trust, c ?? '>=50');
    }
    case 'supplier': return cmp(w.suppliers[b]?.bond ?? 0, c);
    default: return true;
  }
}
function cmp(v: number, expr?: string): boolean {
  const s = expr ?? '';
  if (s.startsWith('>=')) return v >= Number(s.slice(2));
  if (s.startsWith('<=')) return v <= Number(s.slice(2));
  if (s.startsWith('<')) return v < Number(s.slice(1));
  if (s.startsWith('>')) return v > Number(s.slice(1));
  return v >= Number(s || 1);
}

export function updateChapter(w: World): void {
  const c = CHAPTERS.find((x) => w.day >= x.from && w.day <= x.to) ?? CHAPTERS[CHAPTERS.length - 1];
  if (c.id !== w.chapter) {
    w.chapter = c.id;
    journal(w, 'story', `Chương ${c.id} · ${c.title}. ${c.hook}`, 'Cốt truyện');
    w.news.unshift(`Chương ${c.id}: ${c.title}`);
  }
}

/** Kích hoạt nhiệm vụ theo ngày & điều kiện; tối đa một nhiệm vụ mới mỗi ngày. */
export function updateQuests(w: World): QuestDef | null {
  let activated: QuestDef | null = null;
  for (const q of QUESTS) {
    const st = w.quests[q.id];
    if (!st || st.status !== 'locked') continue;
    const byDay = q.day > 0 && w.day >= q.day && w.chapter >= q.chapter;
    const byCond = q.day === 0 && q.cond && condition(w, q.cond);
    if (!byDay && !byCond) continue;
    if (q.once && w.flags[`q_${q.id}_seen`]) continue;
    // Nhịp: chỉ một nhiệm vụ mới mỗi ngày, kể cả khi hàm được gọi lại buổi tối.
    if (w.flags.last_quest_day === w.day) continue;
    st.status = 'active'; st.day = w.day;
    w.flags[`q_${q.id}_seen`] = 1;
    w.flags.last_quest_day = w.day;
    journal(w, 'quest', `Nhiệm vụ: ${q.title}.`, 'Nhật ký');
    if (!activated) activated = q;
  }
  return activated;
}

export function pendingQuest(w: World): QuestDef | null {
  const st = Object.values(w.quests).find((s) => s.status === 'active' && !s.choice);
  return st ? QUEST[st.id] ?? null : null;
}

export function chooseQuest(w: World, id: string, idx: number): { text: string; effects: string[] } {
  const q = QUEST[id], st = w.quests[id];
  if (!q || !st || st.status !== 'active') return { text: 'Nhiệm vụ này không còn.', effects: [] };
  const ch = q.choices[clamp(idx, 0, q.choices.length - 1)];
  const effects = applyEffects(w, ch.effects);
  st.status = 'done'; st.choice = ch.label; st.step += 1;
  w.stats.helped += ch.effects.some((e) => e.includes('community:+')) ? 1 : 0;
  journal(w, 'quest', `${q.title}: ${ch.label}. ${ch.reply}`, 'Quyết định');
  note(w, `${q.title}: ${ch.label}.`);
  if (q.next && w.quests[q.next]) { w.quests[q.next].status = 'active'; w.quests[q.next].day = w.day + 2; }
  return { text: ch.reply, effects };
}

/** Sự kiện tối: có trọng số, có điều kiện, không dày đặc, không lặp ngay. */
export function pickEvent(w: World): EventDef | null {
  const cands = EVENTS.filter((e) => {
    if (!condition(w, e.cond)) return false;
    const last = w.flags[`ev_${e.id}_day`] ?? -99;
    return w.day - last >= 4;
  });
  if (!cands.length) return null;
  const total = cands.reduce((n, e) => n + e.weight, 0);
  let r = rnd(w) * total;
  let chosen = cands[cands.length - 1];
  for (const e of cands) { r -= e.weight; if (r <= 0) { chosen = e; break; } }
  w.flags[`ev_${chosen.id}_day`] = w.day;
  w.eventsSeen.push(chosen.id);
  return chosen;
}

export function chooseEvent(w: World, id: string, idx: number): { text: string; effects: string[] } {
  const e = EVENT[id];
  if (!e) return { text: 'Sự kiện đã qua.', effects: [] };
  const ch = e.choices[clamp(idx, 0, e.choices.length - 1)];
  const effects = applyEffects(w, ch.effects);
  journal(w, 'event', `${e.text.slice(0, 60)}… → ${ch.label}. ${ch.reply}`, 'Buổi tối');
  note(w, `${ch.label}: ${ch.reply}`);
  return { text: ch.reply, effects };
}

export function endingFor(w: World): typeof ENDINGS[number] {
  const score: Record<string, number> = {
    community: w.community * 1.3 + w.stats.helped * 4 + (w.flags.aim_community ? 30 : 0) - w.stats.refused * 2,
    merchant: w.money * 0.5 + w.shopLevel * 12 + w.suppliers.ong_chin?.bond * 0.4 + (w.flags.contract ? 25 : 0),
    trusted: w.rep * 1.4 + Object.values(w.relations).reduce((n, r) => n + r.trust, 0) / 27 + (w.flags.ledger_kind ? 15 : 0),
    family: w.family * 3 + (w.flags.aim_self ? 25 : 0) + (w.community < 45 ? 10 : 0),
    faded: 100 - w.money * 0.2 - w.rep * 0.3 - w.community * 0.3,
  };
  // Không có kết thúc "tốt nhất" cố định: cái cao nhất phản ánh cách bạn chơi
  if (w.money < 20 && w.rep < 35) return ENDINGS.find((e) => e.id === 'faded')!;
  const best = Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];
  return ENDINGS.find((e) => e.id === best) ?? ENDINGS[0];
}

export function finishRun(w: World): typeof ENDINGS[number] {
  const e = endingFor(w);
  w.ending = e.id;
  w.phase = 'ending';
  journal(w, 'story', `Kết thúc: ${e.title}. ${e.text}`, 'Ngày mai');
  return e;
}

export function storyBeat(w: World): string {
  const c = CHAPTERS.find((x) => x.id === w.chapter) ?? CHAPTERS[0];
  const done = Object.values(w.quests).filter((q) => q.status === 'done').length;
  return `Chương ${c.id} · ${c.title} — đã ngã ngũ ${done}/${QUESTS.length} chuyện trong xóm.`;
}

export const eventCount = (): number => EVENTS.length;
export const questCount = (): number => QUESTS.length;
export function randomLine(w: World): string {
  return {
    storm: 'Mưa dập mái, tiếng chổi ai đó quét ngõ.',
    rain: 'Hạt mưa lấm tấm trên bao gạo dựng ngoài hiên.',
    clear: 'Nắng lọt qua khe cửa, bụi đứng im trong vệt sáng.',
    cloudy: 'Trời xám, mùi đèn dầu đậm hơn mọi khi.',
  }[w.weather];
}
