import itemsJson from '../data/items.json';
import npcsJson from '../data/npcs.json';
import type { ItemDef, NpcDef, SupplierDef, LocationDef, UpgradeDef, QuestDef, Category } from './types';

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  (itemsJson as unknown as ItemDef[]).map((i) => [i.id, i]),
);
export const ITEM_LIST: ItemDef[] = itemsJson as unknown as ItemDef[];
export const ITEM_IDS = ITEM_LIST.map((i) => i.id);

export const CATEGORY_LABEL: Record<Category, string> = {
  food: 'Lương thực',
  household: 'Vật dụng',
  materials: 'Vật liệu',
  medicine: 'Y tế',
  valuables: 'Hàng quý',
  special: 'Giấy tờ & đặc biệt',
};

export const QUALITY_LABEL = ['Kém', 'Thường', 'Tốt', 'Đặc biệt'];
export const QUALITY_COLOR = ['#8a6a44', '#8aa357', '#5a8ac9', '#d9a441'];
export const QUALITY_MULT = [0.62, 1.0, 1.32, 1.9];

export function item(id: string): ItemDef {
  const it = ITEMS[id];
  if (!it) throw new Error('Unknown item ' + id);
  return it;
}

// ------------------------------------------------------------------ people --
interface NpcExtra {
  rate: number;
  start: number;
  end: number;
  needs: { item: string; weight: number; min: number; max: number }[];
  budget: [number, number];
  priceSensitivity: number;
  patience: number;
  personality: string;
  barter: { give: string; want: string; ratio: number }[];
  arc?: string;
}

const NPC_X: Record<string, NpcExtra> = {
  ba_tu: {
    rate: 0.55, start: 8, end: 16, budget: [6, 22], priceSensitivity: 1.25, patience: 3, personality: 'kind',
    needs: [
      { item: 'rice_white', weight: 5, min: 1, max: 3 },
      { item: 'rice_old', weight: 4, min: 1, max: 4 },
      { item: 'medicine_bottle', weight: 2, min: 1, max: 1 },
      { item: 'salt', weight: 2, min: 1, max: 2 },
    ],
    barter: [{ give: 'sweet_potato', want: 'rice_white', ratio: 1.4 }],
    arc: 'ba_tu',
  },
  ong_nam: {
    rate: 0.5, start: 7, end: 15, budget: [15, 55], priceSensitivity: 0.95, patience: 4, personality: 'stern',
    needs: [
      { item: 'salt', weight: 4, min: 1, max: 3 },
      { item: 'lamp_bowl', weight: 2, min: 1, max: 1 },
      { item: 'cloth', weight: 2, min: 1, max: 2 },
      { item: 'medicine_bottle', weight: 2, min: 1, max: 1 },
    ],
    barter: [{ give: 'corn', want: 'salt', ratio: 1.2 }],
    arc: 'ong_nam',
  },
  chi_lan: {
    rate: 0.75, start: 7, end: 17, budget: [10, 40], priceSensitivity: 1.1, patience: 4, personality: 'cheerful',
    needs: [
      { item: 'salt', weight: 5, min: 1, max: 3 },
      { item: 'fish_sauce', weight: 4, min: 1, max: 2 },
      { item: 'cloth', weight: 2, min: 1, max: 2 },
      { item: 'kitchen_knife', weight: 1, min: 1, max: 1 },
      { item: 'soap', weight: 2, min: 1, max: 2 },
    ],
    barter: [{ give: 'water_spinach', want: 'salt', ratio: 1.3 }],
  },
  anh_khoi: {
    rate: 0.7, start: 6, end: 18, budget: [8, 30], priceSensitivity: 1.15, patience: 3, personality: 'cheerful',
    needs: [
      { item: 'rice_white', weight: 4, min: 1, max: 2 },
      { item: 'dried_fish', weight: 4, min: 1, max: 2 },
      { item: 'lamp_oil', weight: 2, min: 1, max: 1 },
      { item: 'tea', weight: 2, min: 1, max: 1 },
    ],
    barter: [{ give: 'charcoal', want: 'rice_white', ratio: 1.2 }],
    arc: 'anh_khoi',
  },
  co_hoa: {
    rate: 0.65, start: 6, end: 14, budget: [12, 45], priceSensitivity: 1.0, patience: 3, personality: 'proud',
    needs: [
      { item: 'salt', weight: 5, min: 1, max: 3 },
      { item: 'rice_white', weight: 3, min: 1, max: 2 },
      { item: 'water_spinach', weight: 3, min: 1, max: 2 },
      { item: 'fish_sauce', weight: 2, min: 1, max: 1 },
      { item: 'conical_hat', weight: 2, min: 1, max: 1 },
    ],
    barter: [{ give: 'fresh_fish', want: 'salt', ratio: 1.1 }],
    arc: 'co_hoa',
  },
  ong_to: {
    rate: 0.45, start: 9, end: 16, budget: [20, 80], priceSensitivity: 0.9, patience: 5, personality: 'quiet',
    needs: [
      { item: 'nails', weight: 5, min: 1, max: 4 },
      { item: 'wood', weight: 4, min: 1, max: 3 },
      { item: 'rice_white', weight: 3, min: 1, max: 2 },
      { item: 'medicine_bottle', weight: 3, min: 1, max: 1 },
    ],
    barter: [{ give: 'wooden_box', want: 'nails', ratio: 1.6 }],
    arc: 'ong_to',
  },
  ba_cuc: {
    rate: 0.8, start: 9, end: 15, budget: [4, 14], priceSensitivity: 1.3, patience: 4, personality: 'gentle',
    needs: [
      { item: 'medicine_bottle', weight: 5, min: 1, max: 1 },
      { item: 'salt', weight: 4, min: 1, max: 1 },
      { item: 'rice_bowl', weight: 4, min: 1, max: 2 },
      { item: 'herbal_medicine', weight: 3, min: 1, max: 1 },
      { item: 'incense', weight: 2, min: 1, max: 2 },
    ],
    barter: [{ give: 'bowl_porcelain', want: 'medicine_bottle', ratio: 1.2 }],
  },
  anh_phuc: {
    rate: 0.55, start: 7, end: 17, budget: [10, 40], priceSensitivity: 1.05, patience: 4, personality: 'kind',
    needs: [
      { item: 'rice_white', weight: 5, min: 2, max: 4 },
      { item: 'dried_fish', weight: 3, min: 1, max: 2 },
      { item: 'tea', weight: 2, min: 1, max: 1 },
    ],
    barter: [{ give: 'charcoal', want: 'rice_white', ratio: 1.2 }],
  },
  co_diep: {
    rate: 0.6, start: 8, end: 17, budget: [25, 120], priceSensitivity: 0.8, patience: 4, personality: 'shrewd',
    needs: [
      { item: 'cloth', weight: 4, min: 1, max: 3 },
      { item: 'salt', weight: 3, min: 1, max: 4 },
      { item: 'fish_sauce', weight: 3, min: 1, max: 2 },
      { item: 'fine_cloth', weight: 2, min: 1, max: 1 },
    ],
    barter: [{ give: 'stamped_paper', want: 'fine_cloth', ratio: 1.1 }],
  },
  ong_giao_minh: {
    rate: 0.45, start: 9, end: 17, budget: [20, 90], priceSensitivity: 0.75, patience: 5, personality: 'quiet',
    needs: [
      { item: 'paper', weight: 5, min: 1, max: 4 },
      { item: 'ink', weight: 4, min: 1, max: 1 },
      { item: 'brush', weight: 3, min: 1, max: 2 },
      { item: 'tea', weight: 4, min: 1, max: 2 },
      { item: 'medicine_bottle', weight: 2, min: 1, max: 1 },
    ],
    barter: [{ give: 'old_book', want: 'paper', ratio: 1.5 }],
    arc: 'ong_giao_minh',
  },
  ba_hau: {
    rate: 0.35, start: 10, end: 16, budget: [80, 260], priceSensitivity: 0.7, patience: 4, personality: 'shrewd',
    needs: [
      { item: 'fine_cloth', weight: 5, min: 1, max: 3 },
      { item: 'tea_set', weight: 3, min: 1, max: 1 },
      { item: 'silver_item', weight: 2, min: 1, max: 1 },
      { item: 'sugar', weight: 3, min: 1, max: 2 },
      { item: 'incense', weight: 1, min: 1, max: 1 },
    ],
    barter: [{ give: 'fine_cloth', want: 'tea', ratio: 1 }],
  },
  anh_vuong: {
    rate: 0.55, start: 6, end: 12, budget: [10, 45], priceSensitivity: 1.0, patience: 4, personality: 'stern',
    needs: [
      { item: 'salt', weight: 6, min: 1, max: 4 },
      { item: 'rice_white', weight: 4, min: 1, max: 3 },
      { item: 'rope', weight: 3, min: 1, max: 2 },
      { item: 'lamp_oil', weight: 2, min: 1, max: 1 },
      { item: 'conical_hat', weight: 1, min: 1, max: 1 },
    ],
    barter: [{ give: 'fresh_fish', want: 'rice_white', ratio: 1.15 }],
    arc: 'anh_vuong',
  },
  co_man: {
    rate: 0.6, start: 8, end: 16, budget: [5, 20], priceSensitivity: 1.3, patience: 3, personality: 'anxious',
    needs: [
      { item: 'rice_white', weight: 5, min: 1, max: 2 },
      { item: 'medicine_bottle', weight: 4, min: 1, max: 1 },
      { item: 'cloth', weight: 2, min: 1, max: 1 },
      { item: 'sugar', weight: 2, min: 1, max: 1 },
    ],
    barter: [{ give: 'banana', want: 'medicine_bottle', ratio: 1.4 }],
    arc: 'co_man',
  },
  bac_hung: {
    rate: 0.4, start: 9, end: 16, budget: [30, 110], priceSensitivity: 0.85, patience: 5, personality: 'stern',
    needs: [
      { item: 'charcoal', weight: 6, min: 2, max: 6 },
      { item: 'nails', weight: 4, min: 1, max: 4 },
      { item: 'rice_white', weight: 3, min: 1, max: 3 },
      { item: 'cloth', weight: 2, min: 1, max: 2 },
    ],
    barter: [{ give: 'kitchen_knife', want: 'charcoal', ratio: 1.3 }],
  },
  chi_sen: {
    rate: 0.65, start: 6, end: 18, budget: [12, 50], priceSensitivity: 1.0, patience: 4, personality: 'cheerful',
    needs: [
      { item: 'tea', weight: 6, min: 1, max: 3 },
      { item: 'sugar', weight: 4, min: 1, max: 2 },
      { item: 'rice_white', weight: 3, min: 1, max: 2 },
      { item: 'bowl_earth', weight: 2, min: 1, max: 3 },
    ],
    barter: [{ give: 'tea_leaves', want: 'sugar', ratio: 1.2 }],
  },
  ong_ca: {
    rate: 0.25, start: 10, end: 15, budget: [60, 220], priceSensitivity: 0.7, patience: 5, personality: 'proud',
    needs: [
      { item: 'tea', weight: 4, min: 1, max: 2 },
      { item: 'fine_cloth', weight: 4, min: 1, max: 2 },
      { item: 'paper', weight: 3, min: 1, max: 3 },
      { item: 'stamped_paper', weight: 2, min: 1, max: 1 },
      { item: 'betel', weight: 2, min: 1, max: 2 },
      { item: 'incense', weight: 2, min: 1, max: 2 },
    ],
    barter: [{ give: 'antique', want: 'fine_cloth', ratio: 0.9 }],
  },
  co_tuyet: {
    rate: 0.5, start: 8, end: 17, budget: [15, 60], priceSensitivity: 1.05, patience: 4, personality: 'gentle',
    needs: [
      { item: 'herbal_medicine', weight: 5, min: 1, max: 2 },
      { item: 'medicine_bottle', weight: 4, min: 1, max: 1 },
      { item: 'cotton', weight: 3, min: 1, max: 2 },
      { item: 'paper', weight: 2, min: 1, max: 2 },
    ],
    barter: [{ give: 'herb_leaves', want: 'paper', ratio: 1.1 }],
  },
  anh_tam: {
    rate: 0.6, start: 7, end: 18, budget: [10, 45], priceSensitivity: 1.0, patience: 4, personality: 'kind',
    needs: [
      { item: 'rice_bowl', weight: 4, min: 1, max: 3 },
      { item: 'dried_fish', weight: 4, min: 1, max: 2 },
      { item: 'lamp_oil', weight: 3, min: 1, max: 1 },
      { item: 'rope', weight: 2, min: 1, max: 2 },
    ],
    barter: [{ give: 'shipping_paper', want: 'dried_fish', ratio: 1.2 }],
  },
  ba_giao: {
    rate: 0.45, start: 9, end: 16, budget: [25, 100], priceSensitivity: 0.8, patience: 5, personality: 'gentle',
    needs: [
      { item: 'tea', weight: 4, min: 1, max: 2 },
      { item: 'paper', weight: 4, min: 1, max: 3 },
      { item: 'medicine_bottle', weight: 3, min: 1, max: 1 },
      { item: 'sugar', weight: 3, min: 1, max: 2 },
    ],
    barter: [{ give: 'old_book', want: 'tea', ratio: 1.3 }],
  },
  cau_ti: {
    rate: 0.8, start: 8, end: 17, budget: [2, 10], priceSensitivity: 1.4, patience: 2, personality: 'cheerful',
    needs: [
      { item: 'banana', weight: 5, min: 1, max: 3 },
      { item: 'sugar', weight: 3, min: 1, max: 1 },
      { item: 'rice_bowl', weight: 4, min: 1, max: 2 },
      { item: 'peanuts', weight: 3, min: 1, max: 2 },
      { item: 'betel', weight: 2, min: 1, max: 2 },
    ],
    barter: [],
  },
  ong_chin: {
    rate: 0.3, start: 11, end: 17, budget: [80, 300], priceSensitivity: 0.65, patience: 5, personality: 'shrewd',
    needs: [
      { item: 'stamped_paper', weight: 4, min: 1, max: 2 },
      { item: 'antique', weight: 4, min: 1, max: 1 },
      { item: 'pocket_watch', weight: 3, min: 1, max: 1 },
      { item: 'tea', weight: 3, min: 1, max: 2 },
    ],
    barter: [{ give: 'secret_package', want: 'stamped_paper', ratio: 1.2 }],
  },
  ba_tam: {
    rate: 0.5, start: 8, end: 17, budget: [15, 70], priceSensitivity: 0.95, patience: 5, personality: 'quiet',
    needs: [
      { item: 'herbal_medicine', weight: 5, min: 1, max: 3 },
      { item: 'herb_leaves', weight: 4, min: 1, max: 3 },
      { item: 'paper', weight: 3, min: 1, max: 2 },
      { item: 'tea', weight: 3, min: 1, max: 1 },
    ],
    barter: [{ give: 'herbal_medicine', want: 'paper', ratio: 1.1 }],
  },
  co_mai: {
    rate: 0.55, start: 8, end: 17, budget: [4, 18], priceSensitivity: 1.2, patience: 4, personality: 'gentle',
    needs: [
      { item: 'rice_white', weight: 5, min: 1, max: 2 },
      { item: 'cloth', weight: 3, min: 1, max: 1 },
      { item: 'tea', weight: 2, min: 1, max: 1 },
      { item: 'needle', weight: 2, min: 1, max: 2 },
    ],
    barter: [],
  },
};

const npcJson = npcsJson as unknown as {
  id: string; name: string; age: number; role: string; bio: string;
  portrait: string; portraits: Record<string, string>; sprite: string;
}[];

export const NPCS: Record<string, NpcDef> = {};
for (const n of npcJson) {
  if (n.id === 'player') continue;
  const x = NPC_X[n.id];
  if (!x) continue;
  NPCS[n.id] = {
    id: n.id, name: n.name, age: n.age, role: n.role, bio: n.bio,
    portrait: '/' + n.portrait.replace(/^\//, ''),
    portraits: Object.fromEntries(Object.entries(n.portraits).map(([k, v]) => [k, '/' + v.replace(/^\//, '')])),
    sprite: '/' + n.sprite.replace(/^\//, ''),
    schedule: { rate: x.rate, start: x.start, end: x.end },
    needs: x.needs, budget: x.budget, priceSensitivity: x.priceSensitivity,
    patience: x.patience, personality: x.personality as NpcDef['personality'],
    barter: x.barter, arc: x.arc,
  };
}
export const NPC_LIST = Object.values(NPCS);

export const PLAYER_PORTRAIT = '/assets/characters/portraits/player_neutral.png';

// --------------------------------------------------------------- suppliers --
export const SUPPLIERS: Record<string, SupplierDef> = {
  market: {
    id: 'market', name: 'Chợ quê', role: 'Phiên chợ sáng', portrait: '',
    location: 'market', desc: 'Mua ngay, giá cao hơn một chút nhưng không phải chờ.',
    items: [
      { item: 'rice_white', min: 4, max: 12, priceMod: 1.18 },
      { item: 'rice_old', min: 4, max: 14, priceMod: 1.12 },
      { item: 'salt', min: 3, max: 10, priceMod: 1.1 },
      { item: 'dried_fish', min: 2, max: 8, priceMod: 1.15 },
      { item: 'water_spinach', min: 3, max: 10, priceMod: 1.1 },
      { item: 'cabbage', min: 2, max: 8, priceMod: 1.1 },
      { item: 'banana', min: 3, max: 10, priceMod: 1.08 },
      { item: 'chili', min: 2, max: 8, priceMod: 1.1 },
      { item: 'fish_sauce', min: 1, max: 5, priceMod: 1.12 },
      { item: 'tea', min: 1, max: 4, priceMod: 1.1 },
      { item: 'conical_hat', min: 2, max: 6, priceMod: 1.05 },
      { item: 'umbrella', min: 1, max: 3, priceMod: 1.12 },
      { item: 'incense', min: 2, max: 6, priceMod: 1.05 },
      { item: 'soap', min: 1, max: 4, priceMod: 1.12 },
      { item: 'betel', min: 2, max: 6, priceMod: 1.05 },
    ],
    reliability: 1, leadDays: 0, restock: 1, trustGain: 0.5,
  },
  ong_nam: {
    id: 'ong_nam', name: 'Ông Năm', role: 'Nông dân', portrait: '/assets/characters/portraits/ong_nam_neutral.png',
    location: 'supplier_house', desc: 'Ruộng ở đầu làng, gạo còn nhưng cần muối và vải.',
    items: [
      { item: 'rice_white', min: 6, max: 20, priceMod: 0.88 },
      { item: 'rice_old', min: 6, max: 22, priceMod: 0.8 },
      { item: 'corn', min: 4, max: 16, priceMod: 0.85 },
      { item: 'sweet_potato', min: 4, max: 16, priceMod: 0.8 },
      { item: 'cassava', min: 4, max: 18, priceMod: 0.75 },
      { item: 'peanuts', min: 2, max: 8, priceMod: 0.9 },
    ],
    reliability: 0.85, leadDays: 1, restock: 2, trustGain: 1.2,
  },
  anh_vuong: {
    id: 'anh_vuong', name: 'Anh Vượng', role: 'Người đánh cá', portrait: '/assets/characters/portraits/anh_vuong_neutral.png',
    location: 'river', desc: 'Thuyền ở bến sông, cá tươi mỗi sáng, cá khô để lâu.',
    items: [
      { item: 'fresh_fish', min: 2, max: 10, priceMod: 0.82 },
      { item: 'dried_fish', min: 3, max: 12, priceMod: 0.9 },
      { item: 'dried_shrimp', min: 1, max: 5, priceMod: 0.92 },
      { item: 'fish_sauce', min: 1, max: 4, priceMod: 0.9 },
      { item: 'salt', min: 2, max: 6, priceMod: 1.0 },
    ],
    reliability: 0.78, leadDays: 1, restock: 2, trustGain: 1.1,
  },
  bac_hung: {
    id: 'bac_hung', name: 'Bác Hùng', role: 'Thợ rèn', portrait: '/assets/characters/portraits/bac_hung_neutral.png',
    location: 'supplier_house', desc: 'Lò rèn bên bến, có dụng cụ và đinh sắt.',
    items: [
      { item: 'nails', min: 3, max: 10, priceMod: 1.02 },
      { item: 'kitchen_knife', min: 1, max: 4, priceMod: 1.05 },
      { item: 'charcoal', min: 4, max: 12, priceMod: 0.95 },
      { item: 'rope', min: 2, max: 6, priceMod: 1.0 },
      { item: 'wood', min: 2, max: 6, priceMod: 1.05 },
    ],
    reliability: 0.9, leadDays: 2, restock: 3, trustGain: 1.0,
  },
  co_tuyet: {
    id: 'co_tuyet', name: 'Cô Tuyết', role: 'Người bán thuốc', portrait: '/assets/characters/portraits/co_tuyet_neutral.png',
    location: 'market', desc: 'Nhà thuốc trong chợ, thuốc men đủ loại nhưng đắt.',
    items: [
      { item: 'medicine_bottle', min: 1, max: 4, priceMod: 1.25 },
      { item: 'herbal_medicine', min: 2, max: 7, priceMod: 1.12 },
      { item: 'cotton', min: 2, max: 6, priceMod: 1.1 },
      { item: 'bandage', min: 2, max: 6, priceMod: 1.1 },
      { item: 'antiseptic', min: 1, max: 3, priceMod: 1.22 },
      { item: 'quinine', min: 1, max: 2, priceMod: 1.3 },
    ],
    reliability: 0.86, leadDays: 2, restock: 3, trustGain: 1.0,
  },
  anh_tam: {
    id: 'anh_tam', name: 'Anh Tâm', role: 'Người giao hàng', portrait: '/assets/characters/portraits/anh_tam_neutral.png',
    location: 'staging', desc: 'Chuyên chở hàng giữa các vùng, gọi là có.',
    items: [
      { item: 'rice_bag', min: 1, max: 3, priceMod: 1.05 },
      { item: 'lamp_oil', min: 2, max: 8, priceMod: 1.05 },
      { item: 'cloth', min: 2, max: 6, priceMod: 1.08 },
      { item: 'paper', min: 2, max: 8, priceMod: 1.05 },
      { item: 'balm', min: 1, max: 4, priceMod: 1.05 },
      { item: 'lamp_oil', min: 2, max: 8, priceMod: 1.0 },
    ],
    reliability: 0.92, leadDays: 1, restock: 2, trustGain: 0.9,
  },
  ong_chin: {
    id: 'ong_chin', name: 'Ông Chín', role: 'Người buôn hàng hiếm', portrait: '/assets/characters/portraits/ong_chin_neutral.png',
    location: 'market', desc: 'Hàng hiếm, giấy tờ, đồ cổ. Giá không bao giờ rẻ.',
    items: [
      { item: 'fine_cloth', min: 1, max: 3, priceMod: 1.28 },
      { item: 'stamped_paper', min: 1, max: 2, priceMod: 1.35 },
      { item: 'antique', min: 1, max: 1, priceMod: 1.3 },
      { item: 'pocket_watch', min: 1, max: 1, priceMod: 1.35 },
      { item: 'secret_package', min: 1, max: 1, priceMod: 1.3 },
      { item: 'unmarked_goods', min: 1, max: 2, priceMod: 1.15 },
    ],
    reliability: 0.7, leadDays: 3, restock: 4, trustGain: 1.3,
  },
  ba_tam: {
    id: 'ba_tam', name: 'Bà Tám', role: 'Người bán thuốc bắc', portrait: '/assets/characters/portraits/ba_tam_neutral.png',
    location: 'market', desc: 'Thuốc bắc, lá thuốc, chè khô. Bà bán cho ai cũng giữ giá.',
    items: [
      { item: 'herbal_medicine', min: 3, max: 10, priceMod: 0.98 },
      { item: 'herb_leaves', min: 3, max: 10, priceMod: 0.95 },
      { item: 'tea', min: 2, max: 8, priceMod: 0.92 },
      { item: 'tea_leaves', min: 2, max: 8, priceMod: 0.9 },
      { item: 'paper', min: 2, max: 8, priceMod: 1.0 },
    ],
    reliability: 0.9, leadDays: 1, restock: 2, trustGain: 1.0,
  },
  chi_sen: {
    id: 'chi_sen', name: 'Chị Sen', role: 'Người bán chè', portrait: '/assets/characters/portraits/chi_sen_neutral.png',
    location: 'tea_stall', desc: 'Quán chè ven đường, có đường và chè khô.',
    items: [
      { item: 'tea', min: 3, max: 10, priceMod: 0.96 },
      { item: 'sugar', min: 2, max: 8, priceMod: 1.0 },
      { item: 'bowl_earth', min: 2, max: 8, priceMod: 0.98 },
      { item: 'teacup', min: 2, max: 6, priceMod: 1.0 },
    ],
    reliability: 0.9, leadDays: 1, restock: 2, trustGain: 1.0,
  },
};

// --------------------------------------------------------------- locations --
export const LOCATIONS: Record<string, LocationDef> = {
  shop: {
    id: 'shop', name: 'Tiệm tạp hóa', desc: 'Căn tiệm cũ của gia đình bạn.',
    bg: '/assets/backgrounds/shop.png', unlockDay: 1,
    actions: [{ id: 'open', label: 'Mở cửa', desc: 'Bắt đầu một ngày bán hàng.', kind: 'shop' }],
  },
  market: {
    id: 'market', name: 'Chợ quê', desc: 'Phiên chợ sáng, ai cũng đem thứ gì đó đến đổi.',
    bg: '/assets/backgrounds/market.png', unlockDay: 1,
    actions: [
      { id: 'market_buy', label: 'Mua hàng ở chợ', desc: 'Mua ngay, không chờ.', kind: 'shop' },
      { id: 'market_talk', label: 'Nghe tin chợ', desc: 'Tin tức về giá cả và hàng hóa.', kind: 'talk' },
    ],
  },
  river: {
    id: 'river', name: 'Bến sông', desc: 'Thuyền cá, nước mưa và những chuyến hàng từ tỉnh lẻ.',
    bg: '/assets/backgrounds/river_dock.png', unlockDay: 2,
    actions: [
      { id: 'river_buy', label: 'Mua cá', desc: 'Gặp anh Vượng và dân chài.', kind: 'shop' },
      { id: 'river_talk', label: 'Nghe chuyện bến nước', desc: 'Tin tức về vận chuyển.', kind: 'talk' },
    ],
  },
  warehouse: {
    id: 'warehouse', name: 'Kho hàng', desc: 'Kho gỗ cũ, mùi gạo và bụi.',
    bg: '/assets/backgrounds/warehouse.png', unlockDay: 3,
    actions: [{ id: 'warehouse_storage', label: 'Xem kho', desc: 'Quản lý kho và sắp xếp lại.', kind: 'explore' }],
  },
  residential: {
    id: 'residential', name: 'Khu dân cư', desc: 'Những mái tranh thấp, ai đó đang cần giúp.',
    bg: '/assets/backgrounds/residential.png', unlockDay: 4,
    actions: [
      { id: 'res_visit', label: 'Thăm hàng xóm', desc: 'Ghé nhà bà Tư và mọi người.', kind: 'talk' },
      { id: 'res_help', label: 'Giúp đỡ', desc: 'Dành thời gian giúp một gia đình.', kind: 'quest' },
    ],
  },
  tea_stall: {
    id: 'tea_stall', name: 'Quán nước', desc: 'Chén chè nóng, vài câu chuyện.',
    bg: '/assets/backgrounds/tea_stall.png', unlockDay: 5,
    actions: [
      { id: 'tea_talk', label: 'Nghe đồn đoán', desc: 'Tin đồn về thị trường.', kind: 'talk' },
      { id: 'tea_buy', label: 'Mua chè và đường', desc: 'Chị Sen bán sỉ cho người quen.', kind: 'shop' },
    ],
  },
  supplier_house: {
    id: 'supplier_house', name: 'Nhà nông', desc: 'Đồng lúa và những bao gạo của ông Năm.',
    bg: '/assets/backgrounds/poor_house.png', unlockDay: 2,
    actions: [
      { id: 'sup_nam', label: 'Gặp ông Năm', desc: 'Đặt gạo, ngô, khoai.', kind: 'shop' },
      { id: 'sup_hung', label: 'Gặp bác Hùng', desc: 'Đặt dụng cụ, đinh sắt.', kind: 'shop' },
    ],
  },
  staging: {
    id: 'staging', name: 'Khu tập kết', desc: 'Xe kéo, bao tải và những người khuân vác.',
    bg: '/assets/backgrounds/staging.png', unlockDay: 6,
    actions: [{ id: 'staging_talk', label: 'Hỏi về vận chuyển', desc: 'Tình trạng đường sá, giá cước.', kind: 'talk' }],
  },
};

// ---------------------------------------------------------------- upgrades --
export const UPGRADES: Record<string, UpgradeDef> = {
  shelf_2: {
    id: 'shelf_2', name: 'Thêm kệ hàng', desc: 'Một kệ gỗ mới, bày được nhiều mặt hàng hơn.', cost: 90,
    level: 2, category: 'shelf', effect: 'Số kệ +2', req: { rep: 8, day: 3 },
  },
  shelf_3: {
    id: 'shelf_3', name: 'Kệ gỗ tốt', desc: 'Kệ chắc chắn, trưng bày đẹp hơn, bán chạy hơn.', cost: 180,
    level: 3, category: 'shelf', effect: 'Số kệ +2, giá bán +3%', req: { rep: 20, day: 8 },
  },
  warehouse_2: {
    id: 'warehouse_2', name: 'Mở rộng kho', desc: 'Xếp thêm hai hàng kho, chứa được nhiều hơn.', cost: 120,
    level: 2, category: 'storage', effect: 'Kho +16 ô', req: { day: 4 },
  },
  warehouse_3: {
    id: 'warehouse_3', name: 'Kho khô ráo', desc: 'Giảm hư hỏng hàng hóa mỗi ngày.', cost: 240,
    level: 4, category: 'storage', effect: 'Hư hỏng -40%', req: { rep: 30, day: 12 },
  },
  counter_2: {
    id: 'counter_2', name: 'Quầy gỗ mới', desc: 'Quầy rộng hơn, khách thấy thoải mái.', cost: 100,
    level: 2, category: 'counter', effect: 'Sức chứa kệ +20%', req: { day: 5 },
  },
  lamp_2: {
    id: 'lamp_2', name: 'Đèn dầu đẹp', desc: 'Ánh sáng ấm áp, khách chịu đứng lại lâu hơn.', cost: 70,
    level: 2, category: 'lamp', effect: 'Khách kiên nhẫn +1', req: { day: 3 },
  },
  sign_2: {
    id: 'sign_2', name: 'Biển hiệu mới', desc: 'Biển gỗ khắc chữ, ai đi qua cũng thấy.', cost: 150,
    level: 3, category: 'sign', effect: 'Khách +15%', req: { rep: 22, day: 9 },
  },
  cabinet_2: {
    id: 'cabinet_2', name: 'Tủ kính', desc: 'Trưng bày hàng quý, bán được giá hơn.', cost: 220,
    level: 4, category: 'counter', effect: 'Giá bán hàng quý +8%', req: { rep: 35, day: 13 },
  },
  staff_1: {
    id: 'staff_1', name: 'Thuê người phụ giúp', desc: 'Mai sang giúp sắp kho và trông cửa.', cost: 200,
    level: 3, category: 'staff', effect: 'Tự sắp kho, +1 lượt khách/ngày', req: { trust: 30, day: 10 },
  },
  scale_2: {
    id: 'scale_2', name: 'Cân đồng hồ', desc: 'Cân chính xác, khách tin tưởng hơn.', cost: 140,
    level: 3, category: 'counter', effect: 'Uy tín bán hàng +', req: { rep: 25, day: 11 },
  },
};

export const UPGRADE_LIST = Object.values(UPGRADES);

// ------------------------------------------------------------ shop tiers --
// The shop itself has five tiers. Money alone is never enough: every tier also
// demands a day, a reputation and a community-trust threshold.
export interface ShopTier {
  level: number;
  name: string;
  desc: string;
  cost: number;
  req: { day: number; rep: number; trust: number };
  effect: string;
}

export const SHOP_TIERS: ShopTier[] = [
  { level: 1, name: 'Tiệm cũ', desc: 'Căn tiệm bạn thừa kế: ván gỗ mốc, một bóng đèn dầu.', cost: 0, req: { day: 1, rep: 0, trust: 0 }, effect: '6 kệ hàng' },
  { level: 2, name: 'Tiệm tạp hóa', desc: 'Sửa lại mái, thêm một dãy kệ. Người ta bắt đầu gọi đây là "tiệm".', cost: 120, req: { day: 4, rep: 22, trust: 20 }, effect: '7 kệ hàng, khách +5%' },
  { level: 3, name: 'Cửa hàng', desc: 'Kệ gỗ tốt, quầy rộng hơn. Hàng bày được đẹp hơn.', cost: 240, req: { day: 9, rep: 32, trust: 28 }, effect: '8 kệ hàng, khách +10%' },
  { level: 4, name: 'Cửa hàng lớn', desc: 'Tủ kính, biển hiệu mới. Người xa cũng ghé.', cost: 400, req: { day: 16, rep: 44, trust: 38 }, effect: '9 kệ hàng, khách +15%' },
  { level: 5, name: 'Nhà buôn An Bình', desc: 'Nơi tụ họp của cả thị trấn, có người phụ việc và xe kéo đỗ trước cửa.', cost: 600, req: { day: 23, rep: 55, trust: 48 }, effect: '10 kệ hàng, khách +25%' },
];

// ------------------------------------------------------------------ quests --
export const QUESTS: Record<string, QuestDef> = {
  rice_bowl: {
    id: 'rice_bowl', name: 'Bát gạo cuối cùng', giver: 'ba_tu', type: 'story',
    desc: 'Bà Tư cần gạo cho ba đứa con nhưng không đủ tiền.',
    stages: [
      { text: 'Bà Tư đến tiệm, xin mua chịu một ít gạo.', objective: 'Chọn cách giúp bà Tư.', done: 'Bạn đã đưa ra quyết định.' },
      { text: 'Hôm sau, bà Tư quay lại.', objective: 'Nghe bà Tư nói.', done: 'Câu chuyện của bà Tư có tiếp diễn.' },
    ],
  },
  late_delivery: {
    id: 'late_delivery', name: 'Chuyến hàng bị trễ', giver: 'anh_tam', type: 'story',
    desc: 'Một đơn hàng không đến đúng hẹn, tiệm sắp hết gạo.',
    stages: [
      { text: 'Đơn gạo của anh Tâm bị kẹt ở bến sông.', objective: 'Tìm nguồn hàng thay thế.', done: 'Bạn đã có hàng bán.' },
      { text: 'Anh Tâm tìm cách giải thích.', objective: 'Quyết định có tiếp tục hợp tác không.', done: 'Quan hệ với anh Tâm đã rõ.' },
    ],
  },
  old_ledger: {
    id: 'old_ledger', name: 'Cuốn sổ cũ', giver: 'player', type: 'story',
    desc: 'Trong tủ cũ còn cuốn sổ ghi nợ của người chủ trước.',
    stages: [
      { text: 'Bạn tìm thấy cuốn sổ ghi nợ cũ.', objective: 'Tìm những người được ghi trong sổ.', done: 'Bạn đã gặp một người trong sổ.' },
      { text: 'Những khoản nợ cũ dần được giải quyết.', objective: 'Quyết định cách xử lý.', done: 'Cuốn sổ đã khép lại.' },
    ],
  },
  afternoon_market: {
    id: 'afternoon_market', name: 'Phiên chợ chiều', giver: 'ong_ca', type: 'side',
    desc: 'Một phiên chợ đặc biệt xuất hiện ở bến sông chiều muộn.',
    stages: [
      { text: 'Ông Cả báo tin có phiên chợ chiều.', objective: ' Quyết định có đi không.', done: 'Bạn đã tham gia phiên chợ.' },
      { text: 'Phiên chợ đem lại một món đồ đáng nhớ.', objective: 'Chọn món hàng.', done: 'Bạn đã chọn.' },
    ],
  },
  craftsman_family: {
    id: 'craftsman_family', name: 'Gia đình người thợ', giver: 'ong_to', type: 'side',
    desc: 'Nhà thợ mộc Tô hết gỗ, đứa con nhỏ đang ốm.',
    stages: [
      { text: 'Ông Tô đến hỏi mua gỗ và đinh.', objective: 'Quyết định giúp hay từ chối.', done: 'Bạn đã quyết định.' },
      { text: 'Ông Tô mang đến một món đồ anh tự làm.', objective: 'Nhận hay trả lại.', done: 'Câu chuyện đã có hồi kết.' },
    ],
  },
  ba_tu_arc: {
    id: 'ba_tu_arc', name: 'Ba đứa trẻ', giver: 'ba_tu', type: 'personal',
    desc: 'Bà Tư và những ngày thiếu đói.',
    stages: [
      { text: 'Bà Tư ghé tiệm, tay không mang theo gì.', objective: 'Nghe bà nói.', done: 'Bạn đã lắng nghe.' },
      { text: 'Bà Tư đem đến ít khoai lang.', objective: 'Nhận lấy.', done: 'Quan hệ tốt hơn.' },
      { text: 'Bà Tư hỏi bạn một điều không ngờ.', objective: 'Trả lời.', done: 'Câu chuyện của bà Tư khép lại.' },
    ],
  },
  ong_nam_arc: {
    id: 'ong_nam_arc', name: 'Mùa lúa thất', giver: 'ong_nam', type: 'personal',
    desc: 'Ông Năm và thửa ruộng không còn.',
    stages: [
      { text: 'Ông Năm kể chuyện mất mùa.', objective: 'Nghe ông nói.', done: 'Bạn đã lắng nghe.' },
      { text: 'Ông Năm đề nghị một cuộc trao đổi.', objective: 'Quyết định.', done: 'Ông Năm ghi nhớ.' },
      { text: 'Ông Năm đưa bạn một bao gạo.', objective: 'Nhận hoặc từ chối.', done: 'Tình nghĩa đã rõ.' },
    ],
  },
  ong_to_arc: {
    id: 'ong_to_arc', name: 'Người thợ và đứa con', giver: 'ong_to', type: 'personal',
    desc: 'Ông Tô và đứa con ốm.',
    stages: [
      { text: 'Ông Tô hỏi mua thuốc cho con.', objective: 'Quyết định.', done: 'Bạn đã giúp hoặc từ chối.' },
      { text: 'Ông Tô mang đến một chiếc hộp gỗ.', objective: 'Nhận lấy.', done: 'Ông Tô cảm kích.' },
      { text: 'Ông Tô rủ bạn cùng làm ăn.', objective: 'Quyết định.', done: 'Hợp tác hoặc từ chối.' },
    ],
  },
  anh_khoi_arc: {
    id: 'anh_khoi_arc', name: 'Đôi chân của Khởi', giver: 'anh_khoi', type: 'personal',
    desc: 'Anh Khởi kéo xe và những chuyến hàng.',
    stages: [
      { text: 'Anh Khởi hỏi mua một đôi dép.', objective: 'Quyết định.', done: 'Anh Khởi nhớ ơn.' },
      { text: 'Anh Khởi rủ bạn góp tiền mua xe mới.', objective: 'Quyết định.', done: 'Hợp tác hoặc không.' },
      { text: 'Anh Khởi mang hàng từ tỉnh về.', objective: 'Nhận hàng.', done: 'Mối quan hệ bền chặt hơn.' },
    ],
  },
  co_hoa_arc: {
    id: 'co_hoa_arc', name: 'Cô gái bán cá', giver: 'co_hoa', type: 'personal',
    desc: 'Cô Hoa và người cha đánh cá.',
    stages: [
      { text: 'Cô Hoa muốn đổi cá lấy gạo.', objective: 'Quyết định.', done: 'Cô Hoa cảm kích.' },
      { text: 'Cô Hoa hỏi bạn về giá cá ở chợ.', objective: 'Chia sẻ thông tin.', done: 'Cô Hoa tin tưởng hơn.' },
      { text: 'Cô Hoa mời bạn ra bến sông.', objective: 'Đi hoặc từ chối.', done: 'Câu chuyện có hướng đi.' },
    ],
  },
  ong_giao_minh_arc: {
    id: 'ong_giao_minh_arc', name: 'Người thầy và những trang sách', giver: 'ong_giao_minh', type: 'personal',
    desc: 'Thầy Minh và những cuốn sách cũ.',
    stages: [
      { text: 'Thầy Minh hỏi mua giấy và mực.', objective: 'Bán hoặc tặng.', done: 'Thầy Minh ghi nhớ.' },
      { text: 'Thầy Minh gửi bạn một cuốn sách.', objective: 'Nhận lấy.', done: 'Bạn học được điều gì đó.' },
      { text: 'Thầy Minh nói về những thay đổi sắp đến.', objective: 'Lắng nghe.', done: 'Bạn thấy rõ hơn.' },
    ],
  },
  anh_vuong_arc: {
    id: 'anh_vuong_arc', name: 'Người đánh cá và cơn bão', giver: 'anh_vuong', type: 'personal',
    desc: 'Anh Vượng và cơn bão ngoài khơi.',
    stages: [
      { text: 'Anh Vượng kể về cơn bão sắp tới.', objective: 'Lắng nghe.', done: 'Bạn biết trước thời tiết.' },
      { text: 'Anh Vượng cần muối để ướp cá.', objective: 'Giúp hay không.', done: 'Anh Vượng ghi nhớ.' },
      { text: 'Anh Vượng tặng bạn một món quà.', objective: 'Nhận lấy.', done: 'Tình nghĩa bền chặt.' },
    ],
  },
  co_man_arc: {
    id: 'co_man_arc', name: 'Người mẹ trẻ', giver: 'co_man', type: 'personal',
    desc: 'Mận và đứa con chưa đầy tuổi.',
    stages: [
      { text: 'Mận cần thuốc cho con.', objective: 'Quyết định.', done: 'Mận cảm kích.' },
      { text: 'Mận hỏi bạn có biết tin chồng cô không.', objective: 'Trả lời.', done: 'Mận vững tâm hơn.' },
      { text: 'Mận mang đến ít chuối chín.', objective: 'Nhận lấy.', done: 'Mối quan hệ tốt đẹp.' },
    ],
  },
};

export const QUEST_LIST = Object.values(QUESTS);

// ------------------------------------------------------------------ lenders --
export const LENDERS = [
  { id: 'ba_hau', name: 'Bà Hậu', rate: 0.03, max: 300, days: 10, trustReq: 20 },
  { id: 'ong_ca', name: 'Ông Cả', rate: 0.04, max: 200, days: 8, trustReq: 10 },
  { id: 'anh_tam', name: 'Anh Tâm', rate: 0.05, max: 120, days: 6, trustReq: 5 },
];

export const DIFFICULTY = {
  story: { label: 'Chuyện', desc: 'Kinh tế dễ thở, tập trung vào nhân vật và cốt truyện.', supply: 1.15, demand: 0.9, money: 160, patience: 1 },
  normal: { label: 'Thường', desc: 'Cân bằng giữa mua bán và sinh tồn.', supply: 1.0, demand: 1.0, money: 120, patience: 0 },
  hard: { label: 'Khó', desc: 'Hàng khan hiếm, giá biến động mạnh, mỗi đồng đều quý.', supply: 0.82, demand: 1.15, money: 90, patience: -1 },
} as const;

export const CHAPTERS = [
  { n: 1, name: 'Cửa hàng nhỏ', day: 1, text: 'Bạn trở về thừa kế căn tiệm cũ của gia đình. Bụi phủ kín kệ, két sắt chỉ còn vài đồng bạc. Ngoài đường, người ta rảo bước tìm miếng ăn.' },
  { n: 2, name: 'Những ngày thiếu thốn', day: 7, text: 'Hàng hóa bắt đầu khan hiếm. Mỗi bao gạo trở nên quý giá, và mỗi quyết định của bạn đều có thể khiến một gia đình no hay đói.' },
  { n: 3, name: 'Thị trấn biến động', day: 13, text: 'Tin tức từ tỉnh lẻ ngày càng đáng lo. Người ta đồn về những thay đổi lớn. Cửa hàng của bạn trở thành nơi tụ họp của những người bồn chồn.' },
  { n: 4, name: 'Những lựa chọn', day: 19, text: 'Bạn đã hiểu rõ thị trấn. Giờ là lúc quyết định mình muốn trở thành người bán hàng như thế nào.' },
  { n: 5, name: 'Ngày mai', day: 25, text: 'Mọi thứ bạn đã làm giờ đây trở thành một con đường. Ngày mai của thị trấn bắt đầu từ những lựa chọn hôm nay.' },
];

export const ENDING_TEXT: Record<string, { title: string; text: string }> = {
  community: {
    title: 'Cửa hàng cộng đồng',
    text: 'Người ta không còn gọi đó là "tiệm của bạn" nữa. Họ gọi đó là "tiệm của xóm". Những ngày thiếu đói, căn tiệm nhỏ trở thành nơi người ta tìm đến không chỉ để mua gạo, mà để tìm một câu nói, một món đồ tạm vay, một chút ấm. Bạn không giàu có, nhưng thị trấn nhớ tên bạn.',
  },
  merchant: {
    title: 'Nhà buôn thành công',
    text: 'Bạn đã xây dựng được mạng lưới mua bán vững chắc. Hàng từ tỉnh lẻ, cá từ bến sông, vải từ chợ lớn — tất cả đều qua tay bạn. Tiệm nhỏ trở thành điểm tập kết của cả vùng. Có người nói bạn giàu lên nhờ thời thế, nhưng họ không nhìn thấy những đêm bạn thức tính từng đồng lãi.',
  },
  honor: {
    title: 'Người giữ chữ tín',
    text: 'Bạn không phải người bán nhiều nhất, nhưng là người được tin nhất. Giá của bạn không bao giờ quá cao, cân của bạn không bao giờ thiếu. Người ta mang tiền đến trước, nhận hàng sau. Trong một năm mà tiền bạc mất giá, chữ tín là thứ duy nhất không bị mất.',
  },
  family: {
    title: 'Gia đình bình yên',
    text: 'Bạn đã chọn những gì quan trọng nhất. Bữa cơm trong nhà luôn có, đứa nhỏ không phải đi đói, mẹ già có thuốc. Cửa hàng có thể không lớn, nhưng ngôi nhà vẫn vững. Có những buổi chiều, bạn ngồi bên quầy, nghe tiếng mưa, và thấy rằng mình đã đủ.',
  },
  decline: {
    title: 'Cửa hàng suy tàn',
    text: 'Nợ chất chất, kệ trống, người quen dần thôi ghé. Bạn vẫn ra mở cửa mỗi sáng, nhưng ánh đèn dầu lúc nào cũng leo lét. Có lẽ bạn đã chọn sai, hoặc đơn giản là năm ấy không cho ai con đường dễ. Căn tiệm vẫn đứng đó, chờ một người chủ khác.',
  },
};
