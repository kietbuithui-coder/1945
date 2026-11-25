// Asset-pack integrity: mọi URL sinh ra từ data.ts phải trỏ tới file có thật,
// mọi id trong DSL phải tồn tại, và dữ liệu phải đạt quy mô thiết kế.
// Chạy bằng: npx tsx tools/check-assets.ts
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  A, ASSET_PRELOAD, BG_FOR_LEVEL, CAT_ICON, CHAPTERS, DIFFICULTY, ENDINGS,
  EVENTS, ITEM, ITEMS, LOCATIONS, LOCATION, NPC, NPCS, QUEST, QUESTS,
  STAFF_MAP, SUPPLIER, SUPPLIERS, UPGRADE, UPGRADES, WEATHER_ICON,
  itemIcon, portrait, sprite, timePlate, weatherPlate,
} from '../src/game/data';
import { condition } from '../src/game/story';
import { newWorld } from '../src/game/state';

const root = process.cwd();
const failures: string[] = [];
const seen = new Set<string>();
const need = (ok: unknown, msg: string): void => { if (!ok) failures.push(msg); };

function checkUrl(url: string | null, label: string): void {
  if (!url) return;
  if (seen.has(url)) return;
  seen.add(url);
  const rel = url.split('?')[0].replace(/^(\.?\/)+/, '');
  const file = resolve(root, rel);
  need(existsSync(file), `${label}: thiếu ${url}`);
}

// ── Ảnh thật, không placeholder ────────────────────────────────────────────
for (const url of ASSET_PRELOAD) checkUrl(url, 'preload');
for (const it of ITEMS) checkUrl(itemIcon(it.id), `icon ${it.id}`);
for (const n of NPCS) {
  for (const mood of ['neutral', 'happy', 'sad', 'angry', 'tired', 'surprised']) {
    checkUrl(portrait(n.id, mood), `portrait ${n.id}/${mood}`);
  }
  for (const frame of ['front_idle_0', 'front_talk', 'front_happy', 'front_sad', 'front_angry', 'front_surprised', 'front_tired', 'back_walk_0']) {
    checkUrl(sprite(n.id, frame), `sprite ${n.id}/${frame}`);
  }
}
for (const l of LOCATIONS) {
  checkUrl(A(`backgrounds/${l.bg}`), `location ${l.id}`);
  if (l.bgRain) checkUrl(A(`backgrounds/${l.bgRain}`), `location rain ${l.id}`);
  if (l.bgDusk) checkUrl(A(`backgrounds/${l.bgDusk}`), `location dusk ${l.id}`);
}
for (let lv = 1; lv <= 5; lv++) checkUrl(BG_FOR_LEVEL(lv), `shop level ${lv}`);
for (const w of ['rain', 'storm'] as const) checkUrl(weatherPlate(w), `weather ${w}`);
for (const m of [0, 420, 720, 1000, 1200]) checkUrl(timePlate(m), `time ${m}`);
for (const p of ['ui/panels/wood.png', 'ui/panels/wood_dark.png', 'ui/panels/paper.png', 'ui/slots/slot.png']) checkUrl(A(p), `panel ${p}`);
for (const name of new Set<string>([
  ...Object.values(WEATHER_ICON), ...Object.values(CAT_ICON),
  'action_pause', 'action_play', 'action_search', 'action_fast', 'icon_merge',
  'currency', 'star', 'heart', 'category_food', 'status_happy', 'status_sad',
  'status_angry', 'status_neutral', 'tab_inventory', 'tab_suppliers',
  'tab_ledger', 'tab_map', 'tab_journal', 'tab_shop', 'tab_save',
  'tab_settings', 'tab_help',
])) checkUrl(A(`ui/icons/${name}.png`), `ui icon ${name}`);

// ── Dữ liệu: quy mô & liên kết ─────────────────────────────────────────────
need(NPCS.length >= 20, `cần 20+ NPC, có ${NPCS.length}`);
need(NPCS.filter((n) => n.arc).length >= 8, 'cần 8+ chuỗi NPC nhiều ngày');
need(CHAPTERS.length === 5, 'cần 5 chương');
need(Object.keys(DIFFICULTY).length === 3, 'cần 3 độ khó');
need(ENDINGS.length >= 3, 'cần nhiều kết thúc');
need(UPGRADES.length >= 8, 'cần 8+ nâng cấp');
need(Object.keys(STAFF_MAP).length >= 3, 'cần 3+ nhân viên');
need(QUESTS.length >= 10, 'cần 10+ nhiệm vụ');
need(EVENTS.length >= 15, 'cần 15+ sự kiện');
need(newWorld(1).maxDays === 30, 'ván chơi 30 ngày');
for (const n of NPCS) {
  for (const id of n.needs) need(!!ITEM[id], `NPC ${n.id}: need ${id} không tồn tại`);
}
for (const s of SUPPLIERS) {
  need(!!LOCATION[s.location], `supplier ${s.id}: location ${s.location}`);
  for (const id of s.items) need(!!ITEM[id], `supplier ${s.id}: item ${id} không tồn tại`);
}
for (const l of LOCATIONS) {
  for (const sid of l.suppliers) need(!!SUPPLIER[sid], `location ${l.id}: supplier ${sid}`);
  for (const nid of l.npcs) need(!!NPC[nid], `location ${l.id}: npc ${nid}`);
}
for (const u of UPGRADES) need(!!UPGRADE[u.id], `upgrade ${u.id}`);
// STAFF_MAP được kiểm tra quy mô ở trên; id là key của chính nó.

// ── DSL effects & conditions ───────────────────────────────────────────────
const effectKeys = new Set([
  'money', 'rep', 'community', 'family', 'item', 'relation', 'flag', 'debt',
  'quest', 'upgrade', 'supplier', 'market', 'news', 'delivery', 'staff',
]);
const condKeys = new Set([
  'day', 'daymod', 'flag', 'quest', 'weather', 'rep', 'community',
  'debt', 'delivery', 'relation', 'supplier',
]);
const allStories = [...QUESTS, ...EVENTS];
for (const st of allStories) {
  need(st.choices.length >= 2, `${st.id}: cần ít nhất 2 lựa chọn thật`);
  if ('cond' in st && st.cond) {
    const key = st.cond.split(':')[0];
    need(condKeys.has(key), `${st.id}: điều kiện lạ "${st.cond}"`);
    let condOk = true;
    try { condition(newWorld(1945), st.cond); } catch { condOk = false; }
    need(condOk, `${st.id}: điều kiện "${st.cond}" lỗi`);
  }
  for (const ch of st.choices) {
    need(!!ch.label && !!ch.reply, `${st.id}: lựa chọn thiếu nhãn / phản hồi`);
    for (const raw of ch.effects) {
      const p = raw.split(':');
      need(effectKeys.has(p[0]), `${st.id}: effect lạ "${raw}"`);
      switch (p[0]) {
        case 'item': need(!!ITEM[p[1]], `${st.id}: item ${p[1]} không tồn tại`); break;
        case 'relation': need(!!NPC[p[1]], `${st.id}: npc ${p[1]} không tồn tại`); break;
        case 'debt': if (p[1] !== 'pay') need(!!NPC[p[1]], `${st.id}: debtor ${p[1]} không tồn tại`); break;
        case 'supplier': need(!!SUPPLIER[p[1]], `${st.id}: supplier ${p[1]} không tồn tại`); break;
        case 'upgrade': need(!!UPGRADE[p[1]], `${st.id}: upgrade ${p[1]} không tồn tại`); break;
        case 'quest': need(!!QUEST[p[1]], `${st.id}: quest ${p[1]} không tồn tại`); break;
        case 'market': need(!!ITEM[p[1]], `${st.id}: market item ${p[1]} không tồn tại`); break;
        case 'staff': need(!!STAFF_MAP[p[1]], `${st.id}: staff ${p[1]} không tồn tại`); break;
        case 'delivery': need(['rescue', 'check', 'protect'].includes(p[1]), `${st.id}: delivery ${p[1]} không có tác dụng`); break;
        case 'money': case 'rep': case 'community': case 'family':
          need(Number.isFinite(Number(p[1])), `${st.id}: ${raw} không phải số`); break;
        default: break;
      }
    }
  }
}

// ── Tiền tệ lịch sử, không hiện đại hoá ────────────────────────────────────
const source = [
  'src/game/data.ts', 'src/game/ui.ts', 'src/game/game.ts',
  'src/game/economy.ts', 'src/game/trade.ts',
].map((f) => readFileSync(resolve(root, f), 'utf8')).join('\n');
need(!/VNĐ|VND|₫|Việt Nam đồng|thẻ tín dụng|chuyển khoản/i.test(source), 'xuất hiện tiền / vật thể hiện đại');
need(source.includes('đồng bạc Đông Dương'), 'thiếu ghi chú đồng bạc Đông Dương');

if (failures.length) {
  console.error(`✗ Asset / data integrity: ${failures.length} lỗi`);
  for (const f of failures.slice(0, 60)) console.error('  · ' + f);
  if (failures.length > 60) console.error(`  … và ${failures.length - 60} lỗi khác`);
  process.exit(1);
}
console.log(`✓ Asset / data integrity: ${seen.size} URL ảnh hợp lệ, ${NPCS.length} NPC, ${QUESTS.length} quest, ${EVENTS.length} event, ${ASSET_PRELOAD.length} preload.`);
