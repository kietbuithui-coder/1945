// ── Cửa Hàng 1945 · toàn bộ dữ liệu tĩnh ───────────────────────────────────
// NPC / vật phẩm / sự kiện / nhiệm vụ nằm ở đây, UI không hardcode nội dung.

import type { Category, Difficulty, ItemDef, Quality, Weather } from './types';

/** Asset URL: đúng cả dev (Vite root) lẫn build (plugin copy asset pack). */
const RAW_BASE: string = (() => {
  try { return (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'; }
  catch { return '/'; }
})();
export const A = (p: string): string => `${RAW_BASE}assets/${p}`;
export const itemIcon = (id: string): string => {
  const d = ITEM[id];
  return d ? A(`items/${d.icon}`) : A('items/special/unmarked_goods.png');
};
export const portrait = (id: string, mood = 'neutral'): string =>
  A(`characters/portraits/${id}_${mood}.png`);
export const sprite = (id: string, frame = 'front_idle_0'): string =>
  A(`characters/${id}/${frame}.png`);

export const QUALITY_NAME = ['Kém', 'Thường', 'Tốt', 'Đặc biệt'] as const;
export const QUALITY_MULT = [0.72, 1, 1.22, 1.5] as const;
export const QUALITY_COLOR = ['#8a6a44', '#8aa357', '#5a8ac9', '#d9a441'] as const;
export const CAT_NAME: Record<Category, string> = {
  food: 'Lương thực', household: 'Vật dụng', materials: 'Vật liệu',
  medicine: 'Y tế', valuables: 'Hàng quý', special: 'Giấy tờ',
};
export const CAT_COLOR: Record<Category, string> = {
  food: '#8a9a5a', household: '#b98a3e', materials: '#8a7a5a',
  medicine: '#a83226', valuables: '#d9a441', special: '#5a7a8a',
};
export const CAT_ICON: Record<Category, string> = {
  food: 'category_food', household: 'category_household', materials: 'category_materials',
  medicine: 'category_medicine', valuables: 'category_valuables', special: 'category_special',
};
export const WEATHER_NAME: Record<Weather, string> = {
  clear: 'Trời quang', cloudy: 'Nhiều mây', rain: 'Mưa', storm: 'Mưa lớn',
};
export const WEATHER_ICON: Record<Weather, string> = {
  clear: 'weather_sun', cloudy: 'weather_cloud', rain: 'weather_rain', storm: 'weather_storm',
};

/* Tiền: đồng bạc Đông Dương (piastre) = 100 xu. Không dùng tiền VN hiện đại.
   Tham khảo: archives.org.vn "Tiền và hoạt động tiền tệ tại VN trước 1945". */
export const CURRENCY = 'đ';
export const CURRENCY_NOTE =
  'Tiền trong game quy ước theo đồng bạc Đông Dương (piastre) và xu cent; ' +
  'một đồng = 100 xu. Không có tiền giấy hiện đại, thẻ hay thiết bị điện tử.';

const I = (
  id: string, name: string, cat: Category, icon: string, buy: number, sell: number,
  perish: number, tags: string[], desc: string, opts: Partial<ItemDef> = {},
): ItemDef => ({
  id, name, cat, icon: `${cat}/${icon}.png`, buy, sell, vol: 1, weight: 1,
  stack: 20, perish, tags, desc, ...opts,
});

export const ITEMS: ItemDef[] = [
  // Lương thực — trụ cột của mọi quyết định
  I('rice_white', 'Gạo trắng', 'food', 'rice_white', 5, 8, 0, ['staple'], 'Gạo mới, giã kỹ. Ai cũng cần.'),
  I('rice_old', 'Gạo cũ', 'food', 'rice_old', 3, 5, 0, ['staple', 'cheap'], 'Gạo để lâu, vẫn ăn được nhưng kém thơm.'),
  I('rice_bag', 'Bao gạo', 'food', 'rice_bag', 22, 32, 0, ['staple', 'bulk'], 'Cả bao, nặng nhưng tiện tích trữ.', { vol: 4, weight: 5, stack: 4 }),
  I('corn', 'Ngô', 'food', 'corn', 2, 4, 5, ['staple', 'fresh', 'seasonal'], 'Ngô bẻ sáng, vài ngày là khô hạt.'),
  I('sweet_potato', 'Khoai lang', 'food', 'sweet_potato', 2, 4, 7, ['staple', 'fresh'], 'Chịu đói, dễ trồng, dễ hư.'),
  I('cassava', 'Sắn', 'food', 'cassava', 1, 3, 6, ['staple', 'cheap', 'fresh'], 'Rẻ, no lâu, nhưng chóng hỏng.'),
  I('mung_beans', 'Đậu xanh', 'food', 'mung_beans', 4, 7, 0, ['staple'], 'Nấu chè, nấu cháo, để được lâu.'),
  I('peanuts', 'Lạc', 'food', 'peanuts', 3, 5, 0, ['staple'], 'Vừa ăn vừa ép dầu.'),
  I('salt', 'Muối', 'food', 'salt', 4, 7, 0, ['staple', 'preserve'], 'Không có muối thì không giữ được cá.'),
  I('fish_sauce', 'Nước mắm', 'food', 'fish_sauce', 7, 12, 0, ['staple'], 'Chai mắm của cả xóm.', { stack: 8 }),
  I('fresh_fish', 'Cá tươi', 'food', 'fresh_fish', 5, 9, 2, ['fresh', 'perishable'], 'Bến sông đưa lên, hôm sau đã kém.'),
  I('dried_fish', 'Cá khô', 'food', 'dried_fish', 6, 10, 0, ['staple', 'preserve'], 'Phơi nắng, giữ được cả tháng.'),
  I('water_spinach', 'Rau muống', 'food', 'water_spinach', 1, 3, 2, ['fresh', 'perishable'], 'Rau hái sớm, héo rất nhanh.'),
  I('tea_leaves', 'Chè khô', 'food', 'tea_leaves', 6, 11, 0, ['staple', 'luxury'], 'Ấm chè là cớ để người ta ngồi lại nói chuyện.'),
  I('sugar', 'Đường', 'food', 'sugar', 8, 13, 0, ['luxury'], 'Hiếm, thường chỉ có ở thương lái.', { stack: 10 }),
  I('cassava_dried', 'Sắn khô', 'food', 'cassava_dried', 2, 4, 0, ['staple', 'preserve'], 'Phơi khô để dành ngày mưa.'),
  I('rice_flour', 'Bột gạo', 'food', 'rice_flour', 4, 7, 0, ['staple'], 'Làm bánh, đổi được nhiều thứ.'),
  // Vật dụng
  I('lamp_oil', 'Dầu đèn', 'household', 'lamp_oil', 6, 10, 0, ['fuel'], 'Đêm xuống là nhà nào cũng cần.', { stack: 10 }),
  I('lamp_bowl', 'Chén đèn', 'household', 'lamp_bowl', 9, 15, 0, ['tool'], 'Cái đèn dầu cũ của tiệm.', { stack: 6 }),
  I('clay_pot', 'Nồi đất', 'household', 'clay_pot', 8, 13, 0, ['tool'], 'Nồi đất nấu cơm của bếp nào cũng có.', { stack: 6 }),
  I('mat', 'Chiếu cói', 'household', 'mat', 7, 12, 0, ['tool'], 'Trải xuống là thành chỗ ngủ.', { stack: 5 }),
  I('basket', 'Sọt tre', 'household', 'basket', 4, 7, 0, ['tool'], 'Đựng hàng, cũng để gánh hàng.', { stack: 8 }),
  I('soap', 'Xà phòng', 'household', 'soap', 5, 9, 0, ['tool'], 'Hàng hiếm từ phố trên.', { stack: 10 }),
  I('incense', 'Hương', 'household', 'incense', 3, 6, 0, ['tool'], 'Thắp ở đình, ở bàn thờ nhà ai cũng có.', { stack: 12 }),
  I('umbrella', 'Ô che mưa', 'household', 'umbrella', 12, 19, 0, ['tool', 'luxury'], 'Ngày mưa, giá lại nhích lên.', { stack: 4 }),
  // Vật liệu
  I('firewood', 'Củi', 'materials', 'firewood', 2, 4, 0, ['fuel'], 'Đốt bếp, sưởi ẩm.', { vol: 2, stack: 12 }),
  I('charcoal', 'Than củi', 'materials', 'charcoal', 4, 7, 0, ['fuel'], 'Than cho bếp lò nhà thợ.', { vol: 2, stack: 10 }),
  I('bamboo', 'Tre', 'materials', 'bamboo', 3, 5, 0, ['material'], 'Sửa kệ, sửa mái.', { vol: 2, stack: 10 }),
  I('cloth', 'Vải thô', 'materials', 'cloth', 7, 12, 0, ['material'], 'Vá áo, may túi, bọc hàng.'),
  I('do_paper', 'Giấy dó', 'materials', 'do_paper', 5, 9, 0, ['material', 'paper'], 'Ghi sổ, gói thuốc, viết thư.'),
  I('rope', 'Dây chão', 'materials', 'rope', 3, 5, 0, ['material'], 'Buộc bao, buộc chuyến hàng.', { stack: 12 }),
  // Y tế
  I('herbal_medicine', 'Thuốc nam', 'medicine', 'herbal_medicine', 8, 14, 0, ['medicine'], 'Thầy lang bốc, hợp với người già.', { stack: 8 }),
  I('quinine', 'Thuốc ký ninh', 'medicine', 'quinine', 16, 26, 0, ['medicine', 'rare'], 'Hiếm, chỉ cô Tuyết có.', { stack: 5 }),
  I('bandage', 'Băng vải', 'medicine', 'bandage', 5, 9, 0, ['medicine'], 'Cần khi ai đó bị thương ở bến sông.', { stack: 10 }),
  I('rub_oil', 'Dầu xoa', 'medicine', 'rub_oil', 6, 11, 0, ['medicine'], 'Chai nhỏ, dùng cho cảm lạnh.', { stack: 8 }),
  // Hàng quý & giấy tờ
  I('old_book', 'Sách cũ', 'valuables', 'old_book', 20, 34, 0, ['rare', 'luxury'], 'Ông giáo đổi lấy gạo cho bọn trẻ.', { stack: 3 }),
  I('silver_bracelet', 'Vòng bạc', 'valuables', 'silver_bracelet', 28, 45, 0, ['rare', 'luxury'], 'Của hồi môn, mang đi cầm.', { stack: 3 }),
  I('tea_set', 'Bộ chén trà', 'valuables', 'tea_set', 18, 30, 0, ['rare', 'luxury'], 'Chén sứ, chỉ bán khi cùng đường.', { stack: 3 }),
  I('iou_note', 'Giấy nợ', 'special', 'iou_note', 0, 0, 0, ['paper', 'debt'], 'Một dòng trong cuốn sổ cũ.', { stack: 10 }),
  I('coupon', 'Phiếu đổi hàng', 'special', 'coupon', 0, 0, 0, ['paper', 'coupon'], 'Phiếu của phiên chợ, đổi được hàng.', { stack: 10 }),
  I('shipping_paper', 'Giấy gửi hàng', 'special', 'shipping_paper', 0, 0, 0, ['paper'], 'Biên nhận chuyến hàng về bến.', { stack: 10 }),
  I('damaged_goods', 'Hàng hư', 'special', 'damaged_goods', 0, 1, 0, ['damaged'], 'Mốc, vỡ, ướt — chỉ còn bán rẻ.', { stack: 12 }),
  I('unmarked_goods', 'Hàng không rõ gốc', 'special', 'unmarked_goods', 0, 0, 0, ['mystery'], 'Cần kiểm tra trước khi đưa giá.', { stack: 6 }),
];

export const ITEM: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export const STAPLES = ITEMS.filter((i) => i.tags.includes('staple')).map((i) => i.id);
export const FRESH = ITEMS.filter((i) => i.tags.includes('fresh')).map((i) => i.id);

// ── NPC: 24 danh tính, có nghề, hoàn cảnh, nhu cầu, lịch, tính cách ────────
export interface NpcDef {
  id: string; name: string; age: number; job: string; home: string; trait: string;
  needs: string[]; budget: [number, number]; trust: number; schedule: 'morning' | 'midday' | 'afternoon' | 'any';
  arc?: string; desc: string;
}
const N = (
  id: string, name: string, age: number, job: string, home: string, trait: string,
  needs: string[], budget: [number, number], trust: number,
  schedule: NpcDef['schedule'], desc: string, arc?: string,
): NpcDef => ({ id, name, age, job, home, trait, needs, budget, trust, schedule, desc, arc });

export const NPCS: NpcDef[] = [
  N('ba_cuc', 'Bà Cúc', 62, 'Bán rong', 'Xóm Bến', 'Chắt bủn, nhớ ơn lâu', ['rice_old', 'salt', 'herbal_medicine'], [8, 20], 55, 'morning', 'Bà gánh rau qua cửa tiệm từ trước khi trời sáng.', 'arc_cuc'),
  N('chi_lan', 'Chị Lan', 29, 'Mẹ có con nhỏ', 'Ngõ Chùa', 'Lo lắng, ít nói', ['rice_white', 'mung_beans', 'herbal_medicine'], [6, 16], 48, 'morning', 'Con chị đang sốt, mà két tiền thì cạn.', 'arc_lan'),
  N('ong_nam', 'Ông Năm', 57, 'Nông dân', 'Thửa ruộng ngoài đê', 'Thật thà, ghét mặc cả', ['salt', 'lamp_oil', 'do_paper'], [12, 30], 60, 'morning', 'Cứ mùa này ông lại mang ngô xuống đổi muối.', 'arc_nam'),
  N('anh_vuong', 'Anh Vượng', 33, 'Người đánh cá', 'Bến sông', 'Nóng tính nhưng trọng chữ tín', ['salt', 'rice_old', 'tea_leaves'], [10, 26], 50, 'morning', 'Cá tươi phải bán trong ngày, mưa là kẹt lại bến.', 'arc_vuong'),
  N('bac_hung', 'Bác Hùng', 48, 'Thợ rèn', 'Lò rèn đầu phố', 'Cẩn thận, khó tính', ['charcoal', 'bamboo', 'cloth'], [14, 34], 52, 'midday', 'Lò rèn thiếu than là bác đi ngay.', 'arc_hung'),
  N('co_tuyet', 'Cô Tuyết', 35, 'Người bán thuốc', 'Nhà thuốc cũ', 'Lạnh lùng, rất tinh', ['quinine', 'do_paper', 'sugar'], [20, 48], 46, 'afternoon', 'Cô giữ mấy chai ký ninh cuối cùng của thị trấn.', 'arc_tuyet'),
  N('anh_tam', 'Anh Tâm', 26, 'Người vận chuyển', 'Kho bến', 'Hay cười, hay trễ', ['rice_old', 'rope', 'lamp_oil'], [10, 24], 44, 'any', 'Đường lầy là chuyến hàng của anh lại nằm lại đâu đó.', 'arc_tam'),
  N('ong_chin', 'Ông Chín', 51, 'Thương lái', 'Phố trên', 'Khôn khéo, thích thương lượng', ['tea_leaves', 'old_book', 'silver_bracelet'], [30, 70], 40, 'afternoon', 'Ông có thứ người ta không kiếm được ở chợ.', 'arc_chin'),
  N('ba_tam', 'Bà Tám', 66, 'Bán thuốc bắc', 'Gốc đa', 'Hay than, nhưng tốt bụng', ['herbal_medicine', 'rice_old', 'tea_leaves'], [8, 22], 56, 'any', 'Bà biết tên từng người trong xóm.'),
  N('chi_sen', 'Chị Sen', 31, 'Bán chè', 'Quán nước', 'Vui vẻ, nhiều chuyện', ['tea_leaves', 'sugar', 'rice_flour'], [12, 28], 58, 'midday', 'Quán chè là nơi tin đồn đi nhanh hơn cả xe ngựa.', 'arc_sen'),
  N('ong_giao_minh', 'Ông Giáo Minh', 44, 'Thầy giáo', 'Trường làng', 'Điềm tĩnh, trọng chữ nghĩa', ['do_paper', 'old_book', 'tea_leaves'], [16, 38], 54, 'afternoon', 'Ông đổi sách lấy gạo cho lũ trẻ.'),
  N('ba_tu', 'Bà Tư', 70, 'Góa, ở một mình', 'Cuối ngõ', 'Tự trọng, không thích được thương hại', ['rice_old', 'herbal_medicine', 'lamp_oil'], [5, 14], 62, 'any', 'Bà luôn trả đủ, dù chậm vài ngày.'),
  N('anh_khoi', 'Anh Khôi', 24, 'Phu khuân vác', 'Bến sông', 'Khỏe, cả tin', ['rice_white', 'salt', 'mat'], [8, 20], 50, 'midday', 'Anh làm cả ngày nhưng vẫn thiếu một bát cơm.'),
  N('co_hoa', 'Cô Hoa', 22, 'Thợ may', 'Xóm Chợ', 'Khéo tay, hay mặc cả', ['cloth', 'do_paper', 'soap'], [10, 26], 47, 'afternoon', 'Cô mang cả túi vải vụn đến đổi.'),
  N('ong_to', 'Ông Tô', 59, 'Chủ kho cũ', 'Kho hàng', 'Giữ lời, ghét nợ', ['rope', 'bamboo', 'shipping_paper'], [18, 42], 45, 'midday', 'Kho của ông là nơi mọi chuyến hàng đi qua.'),
  N('ba_hau', 'Bà Hậu', 45, 'Làm bánh', 'Chợ quê', 'Rộng rãi, thích cho thêm', ['rice_flour', 'sugar', 'mung_beans'], [12, 30], 60, 'morning', 'Bà hay gửi thêm cái bánh cho ai mua chịu.'),
  N('anh_phuc', 'Anh Phúc', 37, 'Thợ mộc', 'Xóm Tre', 'Chậm rãi, tinh mắt', ['bamboo', 'rope', 'firewood'], [14, 32], 52, 'midday', 'Kệ tiệm của bạn do chính tay anh đóng.'),
  N('co_diep', 'Cô Diệp', 27, 'Người gánh nước', 'Bến sông', 'Nhát nói, nhớ lâu', ['rice_old', 'soap', 'cloth'], [7, 18], 53, 'morning', 'Cô đi qua mỗi sáng, chưa bao giờ quên một lần giúp đỡ.'),
  N('ong_ca', 'Ông Cả', 68, 'Trưởng xóm', 'Đình làng', 'Nghiêm, nhưng công bằng', ['tea_leaves', 'do_paper', 'rice_white'], [20, 44], 42, 'afternoon', 'Lời ông nói có trọng lượng với cả xóm.'),
  N('co_man', 'Cô Mận', 19, 'Giúp việc nhà giàu', 'Nhà ông Cả', 'Tò mò, dễ xúc động', ['sugar', 'soap', 'tea_set'], [10, 24], 55, 'any', 'Cô hay ghé mua thứ chủ nhà dặn, rồi đứng ngó mấy món hàng quý.'),
  N('cau_ti', 'Cậu Ti', 15, 'Chạy việc vặt', 'Ngõ Chùa', 'Nhanh nhảu, hay quên', ['corn', 'peanuts', 'iou_note'], [3, 9], 58, 'any', 'Cậu bé mang thư, mang cả tin đồn.'),
  N('ba_giao', 'Bà Giao', 54, 'Bán vải', 'Chợ quê', 'Sắc sảo, không mất lời', ['cloth', 'sugar', 'tea_leaves'], [16, 38], 49, 'midday', 'Bà biết giá từng thước vải trong chợ.'),
  N('co_mai', 'Cô Mai', 25, 'Hộ lý', 'Nhà thuốc cũ', 'Dịu dàng, hay lo', ['bandage', 'rub_oil', 'herbal_medicine'], [12, 28], 56, 'afternoon', 'Cô đi tìm băng vải khi bến sông có người ngã.'),
  N('villager_a', 'Anh Lực', 40, 'Lao động nghèo', 'Xóm Bến', 'Kiệm lời', ['rice_old', 'cassava', 'salt'], [5, 14], 50, 'any', 'Anh mua đúng thứ mình có tiền, không hơn.'),
  N('villager_b', 'Chị Nhàn', 34, 'Gánh hàng chợ', 'Chợ quê', 'Vui tính', ['corn', 'fish_sauce', 'basket'], [7, 18], 51, 'midday', 'Chị đi chợ về là ghé tiệm.'),
  N('villager_c', 'Bác Lão', 64, 'Giữ đình', 'Đình làng', 'Chậm, hay kể chuyện cũ', ['tea_leaves', 'incense', 'rice_old'], [6, 16], 57, 'afternoon', 'Bác nhớ cả cái tiệm thời ông chủ trước.'),
];
export const NPC: Record<string, NpcDef> = Object.fromEntries(NPCS.map((n) => [n.id, n]));

// ── Nhà cung cấp: tồn kho có hạn, độ tin cậy, thời gian giao ────────────────
export interface SupplierDef {
  id: string; name: string; kind: string; location: string; items: string[];
  priceFactor: number; reliability: number; delay: number; desc: string;
}
export const SUPPLIERS: SupplierDef[] = [
  { id: 'ong_nam', name: 'Ông Năm · ruộng ngoài đê', kind: 'Nông dân', location: 'market', items: ['corn', 'sweet_potato', 'cassava', 'peanuts', 'mung_beans'], priceFactor: 0.86, reliability: 0.88, delay: 0, desc: 'Hàng theo mùa, rẻ, nhưng mưa là không gánh xuống được.' },
  { id: 'anh_vuong', name: 'Anh Vượng · bến sông', kind: 'Người đánh cá', location: 'river', items: ['fresh_fish', 'dried_fish', 'salt', 'fish_sauce'], priceFactor: 0.92, reliability: 0.82, delay: 0, desc: 'Cá tươi chỉ giữ được một ngày.' },
  { id: 'bac_hung', name: 'Bác Hùng · lò rèn', kind: 'Thợ thủ công', location: 'residential', items: ['bamboo', 'charcoal', 'rope', 'lamp_bowl', 'clay_pot'], priceFactor: 1.0, reliability: 0.94, delay: 1, desc: 'Đồ dùng làm tay, chắc, giao chậm một buổi.' },
  { id: 'co_tuyet', name: 'Cô Tuyết · nhà thuốc', kind: 'Người bán thuốc', location: 'residential', items: ['herbal_medicine', 'quinine', 'bandage', 'rub_oil'], priceFactor: 1.18, reliability: 0.9, delay: 1, desc: 'Thuốc hiếm, giá cao, nhưng luôn đúng hẹn.' },
  { id: 'chi_sen', name: 'Chị Sen · quán chè', kind: 'Quán nước', location: 'tea_stall', items: ['tea_leaves', 'rice_flour', 'sugar', 'mung_beans'], priceFactor: 1.05, reliability: 0.86, delay: 0, desc: 'Chỗ ngồi lại nghe tin tức, không chỉ mua chè.' },
  { id: 'ong_chin', name: 'Ông Chín · thương lái', kind: 'Thương lái', location: 'warehouse', items: ['rice_white', 'rice_bag', 'sugar', 'soap', 'cloth', 'tea_set'], priceFactor: 1.12, reliability: 0.72, delay: 2, desc: 'Nhiều hàng, giá biến động, chuyến hay trễ.' },
  { id: 'ong_to', name: 'Ông Tô · kho cũ', kind: 'Kho hàng', location: 'warehouse', items: ['rice_old', 'cassava_dried', 'firewood', 'mat', 'basket'], priceFactor: 0.9, reliability: 0.9, delay: 1, desc: 'Hàng khô, để được lâu, hợp ngày mưa.' },
  { id: 'ba_cuc', name: 'Bà Cúc · gánh rong', kind: 'Người buôn rong', location: 'market', items: ['water_spinach', 'corn', 'lamp_oil', 'old_book'], priceFactor: 0.95, reliability: 0.68, delay: 0, desc: 'Mỗi ngày một ít, có khi mang cả món cũ quý.' },
];
export const SUPPLIER: Record<string, SupplierDef> = Object.fromEntries(SUPPLIERS.map((s) => [s.id, s]));

// ── Bản đồ: mỗi nơi có việc thật để làm ────────────────────────────────────
export interface LocationDef {
  id: string; name: string; bg: string; bgRain?: string; bgDusk?: string;
  unlockDay: number; suppliers: string[]; npcs: string[]; action: string; desc: string;
}
export const LOCATIONS: LocationDef[] = [
  { id: 'shop', name: 'Cửa tiệm', bg: 'shop.png', bgRain: 'shop_rain.png', bgDusk: 'shop_dusk.png', unlockDay: 1, suppliers: [], npcs: [], action: 'counter', desc: 'Quầy gỗ, hai kệ, một cái đèn dầu. Ở đây mọi chuyện bắt đầu.' },
  { id: 'market', name: 'Chợ quê', bg: 'market.png', bgDusk: 'market_dusk.png', unlockDay: 1, suppliers: ['ong_nam', 'ba_cuc'], npcs: ['ba_giao', 'ba_hau', 'villager_b'], action: 'market', desc: 'Phiên chợ họp sớm. Giá nói bằng miệng, hàng có thật.' },
  { id: 'river', name: 'Bến sông', bg: 'river_dock.png', bgRain: 'river_dock_rain.png', unlockDay: 2, suppliers: ['anh_vuong'], npcs: ['anh_khoi', 'co_diep'], action: 'river', desc: 'Thuyền về hay không là do trời.' },
  { id: 'residential', name: 'Khu dân cư', bg: 'residential.png', bgRain: 'residential_rain.png', unlockDay: 3, suppliers: ['bac_hung', 'co_tuyet'], npcs: ['chi_lan', 'ba_tu', 'ong_giao_minh'], action: 'visit', desc: 'Gõ cửa người quen, nghe chuyện, sửa một lời đã lỡ.' },
  { id: 'tea_stall', name: 'Quán nước', bg: 'tea_stall.png', bgDusk: 'tea_stall_dusk.png', unlockDay: 2, suppliers: ['chi_sen'], npcs: ['chi_sen', 'ong_ca', 'cau_ti'], action: 'rumour', desc: 'Tin đồn ở đây đi nhanh hơn xe ngựa.' },
  { id: 'warehouse', name: 'Kho hàng cũ', bg: 'warehouse.png', unlockDay: 4, suppliers: ['ong_chin', 'ong_to'], npcs: ['ong_to', 'anh_tam'], action: 'order', desc: 'Đặt chuyến lớn, rẻ hơn, nhưng phải chờ.' },
  { id: 'poor_house', name: 'Nhà cuối ngõ', bg: 'poor_house.png', unlockDay: 5, suppliers: [], npcs: ['ba_tu', 'chi_lan', 'co_mai'], action: 'help', desc: 'Không phải để bán hàng. Đôi khi chỉ để ghé.' },
  { id: 'staging', name: 'Bãi tập kết', bg: 'staging.png', unlockDay: 7, suppliers: [], npcs: ['anh_tam', 'bac_hung'], action: 'dispatch', desc: 'Xe kéo đậu ở đây. Chuyến đi hay nằm lại cũng từ đây.' },
];
export const LOCATION: Record<string, LocationDef> = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]));

// ── Nâng cấp: mỗi cái đổi cả con số lẫn khung cảnh ─────────────────────────
export interface UpgradeDef {
  id: string; name: string; cost: number; require: number; visual: string;
  effect: string; desc: string;
}
export const UPGRADES: UpgradeDef[] = [
  { id: 'shelves', name: 'Thêm kệ', cost: 45, require: 1, visual: 'shelf', effect: 'Kệ +1 hàng (10 ô)', desc: 'Kệ mới do anh Phúc đóng, bày được nhiều mặt hàng hơn.' },
  { id: 'warehouse', name: 'Nới kho', cost: 60, require: 1, visual: 'crates', effect: 'Kho +2 hàng ô', desc: 'Dọn thêm góc kho, xếp được hàng dự trữ.' },
  { id: 'lamp', name: 'Đèn dầu lớn', cost: 35, require: 2, visual: 'lamp', effect: 'Khách chiều tối +1, hư hỏng −10%', desc: 'Ánh đèn kéo khách ở lại lâu hơn.' },
  { id: 'scale', name: 'Cân đồng', cost: 40, require: 2, visual: 'scale', effect: 'Sai lệch giá khi mặc cả −20%', desc: 'Cân rõ thì khó bị ép giá.' },
  { id: 'roof', name: 'Lại mái', cost: 55, require: 3, visual: 'roof', effect: 'Hư hỏng do mưa −50%', desc: 'Dột mái là ướt cả bao gạo.' },
  { id: 'window', name: 'Mở cửa sổ', cost: 40, require: 3, visual: 'window', effect: 'Khách buổi sáng +1', desc: 'Ánh sáng vào, người ta thấy hàng từ ngoài ngõ.' },
  { id: 'ledger', name: 'Bàn ghi sổ', cost: 50, require: 3, visual: 'ledger', effect: 'Nợ đến hạn hiện rõ, lãi chậm −1 ngày', desc: 'Sổ cũ được đóng lại bìa mới.' },
  { id: 'sign', name: 'Biển hiệu', cost: 45, require: 4, visual: 'sign', effect: 'Uy tín +2/ngày, khách mới +1', desc: 'Nét sơn còn mùi, nhưng ai đi qua cũng nhìn.' },
  { id: 'cellar', name: 'Hầm bảo quản', cost: 80, require: 4, visual: 'cellar', effect: 'Hạn dùng +2 ngày', desc: 'Mát và khô, rau cá không héo chỉ sau một đêm.' },
  { id: 'counter', name: 'Quầy gỗ mới', cost: 70, require: 5, visual: 'counter', effect: 'Kiên nhẫn khách +25%', desc: 'Mặt quầy rộng hơn, khách đợi lâu hơn mà không cau mày.' },
];
export const UPGRADE: Record<string, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

export interface StaffDef { id: string; name: string; role: string; wage: number; effect: string; desc: string }
export const STAFF: StaffDef[] = [
  { id: 'mai', name: 'Cô Mai', role: 'Bán hàng', wage: 6, effect: 'Kiên nhẫn khách +20%', desc: 'Cô đứng quầy, còn bạn vẫn là người quyết giá.' },
  { id: 'ty', name: 'Thằng Tý', role: 'Sắp kho', wage: 4, effect: 'Tự gộp chồng mỗi sáng', desc: 'Kho gọn, nhưng cậu không tự bán được hàng.' },
  { id: 'lan', name: 'Chị Lan', role: 'Ghi sổ', wage: 5, effect: 'Nhắc nợ đến hạn, +1 đồng/ngày từ sổ sách rõ ràng', desc: 'Sổ rõ thì ít thất thoat.' },
  { id: 'hung', name: 'Bác Hùng', role: 'Vận chuyển', wage: 7, effect: 'Trễ hàng −40%, hư trên đường −30%', desc: 'Bác biết đường tắt khi mưa.' },
];
export const STAFF_MAP: Record<string, StaffDef> = Object.fromEntries(STAFF.map((s) => [s.id, s]));

// ── Chương / kết thúc ───────────────────────────────────────────────────────
export const CHAPTERS = [
  { id: 1, from: 1, to: 5, title: 'Cửa tiệm nhỏ', hook: 'Học cách đứng quầy, xếp kệ và giữ lời.' },
  { id: 2, from: 6, to: 11, title: 'Những ngày thiếu thốn', hook: 'Hàng về ít đi, mà người cần lại nhiều hơn.' },
  { id: 3, from: 12, to: 18, title: 'Thị trấn biến động', hook: 'Tin đồn, chuyến trễ và những cái tên trong sổ cũ.' },
  { id: 4, from: 19, to: 25, title: 'Những lựa chọn', hook: 'Bạn không thể làm hài lòng tất cả mọi người.' },
  { id: 5, from: 26, to: 30, title: 'Ngày mai', hook: 'Ba mươi ngày đủ để một cái tiệm thành một cái gì đó.' },
];

export interface EndingDef { id: string; title: string; text: string; test: string }
export const ENDINGS: EndingDef[] = [
  { id: 'community', title: 'Cửa tiệm của xóm', text: 'Tiền không dư, nhưng không nhà nào trong ngõ phải nhịn bát cơm. Người ta gọi cái tiệm này bằng tên bạn.', test: 'community' },
  { id: 'merchant', title: 'Nhà buôn thành đạt', text: 'Mạng lưới hàng hóa của bạn chạy từ bến sông tới phố trên. Cái tiệm nhỏ ngày nào giờ là chỗ mọi chuyến hàng phải ghé.', test: 'merchant' },
  { id: 'trusted', title: 'Người giữ chữ tín', text: 'Không ai nhớ bạn bán cái gì rẻ nhất. Họ nhớ bạn chưa bao giờ hứa mà không làm.', test: 'trusted' },
  { id: 'family', title: 'Gia đình bình yên', text: 'Két tiền vơi đi, nhưng bếp nhà bạn vẫn ấm mỗi tối. Có những cái không cần đem ra cân.', test: 'family' },
  { id: 'faded', title: 'Cửa tiệm lặng lẽ', text: 'Biển hiệu vẫn còn, kệ thì dần trống. Không phải vì bạn sai, chỉ vì năm ấy khó hơn sức một người.', test: 'faded' },
];

// ── Nhiệm vụ & sự kiện (effect DSL được thực thi trong story.ts) ────────────
export interface Choice { label: string; effects: string[]; reply: string }
export interface QuestDef {
  id: string; title: string; chapter: number; day: number; npc?: string;
  once: boolean; cond?: string; text: string; choices: Choice[]; next?: string;
}
export const QUESTS: QuestDef[] = [
  { id: 'bowl', title: 'Bát gạo cuối cùng', chapter: 1, day: 2, npc: 'chi_lan', once: true,
    text: 'Chị Lan đặt mấy đồng xu lên quầy, rồi đếm lại. Con đang sốt. Chị cần một bát gạo nhưng thiếu ba xu.',
    choices: [
      { label: 'Bán đúng giá', effects: ['money:+3', 'rep:+0'], reply: 'Chị gật đầu, ôm bát gạo về, không nói thêm.' },
      { label: 'Bớt cho chị ấy', effects: ['money:-2', 'community:+4', 'relation:chi_lan:+8', 'flag:helped_lan:1'], reply: 'Chị nhìn lên, rồi cười rất khẽ.' },
      { label: 'Cho chị mua chịu', effects: ['debt:chi_lan:3:4', 'relation:chi_lan:+5', 'flag:credit_lan:1'], reply: '"Mai cháu khá mình trả." Chị ghi tên vào sổ.' },
      { label: 'Tặng một nắm gạo', effects: ['item:rice_white:-1', 'community:+7', 'relation:chi_lan:+12', 'rep:-1', 'flag:helped_lan:2'], reply: 'Chị không nhận thêm, nhưng hôm sau có người ghé tiệm vì nghe kể.' },
      { label: 'Từ chối nhẹ nhàng', effects: ['relation:chi_lan:-4', 'rep:-2', 'flag:refused_lan:1'], reply: 'Chị gom lại mấy đồng xu, đi ra cửa.' },
    ], next: 'bowl_2' },
  { id: 'bowl_2', title: 'Chị Lan quay lại', chapter: 1, day: 0, npc: 'chi_lan', once: true, cond: 'quest:bowl:done',
    text: 'Mấy ngày sau chị Lan quay lại, tay cầm một quả trứng gói trong lá. Con đã đỡ sốt.',
    choices: [
      { label: 'Nhận và hỏi thăm', effects: ['item:peanuts:+2', 'relation:chi_lan:+6', 'community:+2'], reply: 'Chị ngồi lại một lát, kể chuyện cái ngõ Chùa.' },
      { label: 'Bảo chị giữ cho con', effects: ['community:+4', 'relation:chi_lan:+4'], reply: 'Chị cười, cất quả trứng lại vào rổ.' },
    ], next: 'bowl_3' },
  { id: 'bowl_3', title: 'Cái tên trong sổ', chapter: 3, day: 0, npc: 'chi_lan', once: true, cond: 'flag:helped_lan:>=1',
    text: '"Chồng mình ghi trong sổ của ông chủ cũ", chị Lan nói. "Người ta bảo còn nợ ba đồng, nhưng ảnh đi từ mùa gặt rồi."',
    choices: [
      { label: 'Xóa dòng nợ ấy', effects: ['community:+8', 'relation:chi_lan:+10', 'flag:ledger_kind:1'], reply: 'Bạn gạch một dòng. Sổ nhẹ đi, mà nặng thêm một cái tên.' },
      { label: 'Giữ lại, hỏi thêm ông Cả', effects: ['rep:+2', 'flag:ledger_asked:1'], reply: 'Ông Cả hứa sẽ coi lại sổ đình.' },
    ] },
  { id: 'ledger', title: 'Cuốn sổ cũ', chapter: 1, day: 3, once: true,
    text: 'Trong ngăn kéo quầy có cuốn sổ bìa vải của ông chủ trước. Những dòng nợ, những cái tên, vài nét gạch xóa chưa kịp giải thích.',
    choices: [
      { label: 'Đọc kỹ từng dòng', effects: ['flag:ledger_read:1', 'quest:ledger2:active'], reply: 'Có ba cái tên lặp lại nhiều hơn cả.' },
      { label: 'Cất lại, lo việc hôm nay', effects: ['money:+2'], reply: 'Bạn dọn kệ, còn cuốn sổ vẫn nằm đó.' },
    ], next: 'ledger2' },
  { id: 'ledger2', title: 'Ba cái tên', chapter: 2, day: 0, once: true, cond: 'flag:ledger_read:>=1',
    text: 'Bà Tư, ông Năm, bà Cúc. Mỗi người một dòng, không ai ghi ngày trả.',
    choices: [
      { label: 'Đi hỏi từng người', effects: ['community:+5', 'relation:ba_tu:+4', 'relation:ong_nam:+4', 'relation:ba_cuc:+4', 'flag:ledger_kind:1'], reply: 'Họ kể những chuyện bạn chưa từng nghe về ông chủ cũ.' },
      { label: 'Coi như nợ cũ đã xong', effects: ['rep:+2', 'money:+4'], reply: 'Bạn gập sổ lại. Tiệm này bắt đầu từ hôm nay.' },
    ] },
  { id: 'late', title: 'Chuyến hàng bị trễ', chapter: 2, day: 0, npc: 'anh_tam', once: true, cond: 'delivery:late',
    text: 'Anh Tâm đứng ở cửa, mũ còn ướt. Đường lầy, xe kẹt ở bãi tập kết. Chuyến gạo chưa về.',
    choices: [
      { label: 'Gửi người ra đẩy xe', effects: ['money:-5', 'delivery:rescue', 'relation:anh_tam:+6'], reply: 'Tối nay gạo về, ướt hai bao nhưng vẫn dùng được.' },
      { label: 'Tìm nguồn khác ở chợ', effects: ['money:-8', 'item:rice_old:+4', 'relation:ba_cuc:+3'], reply: 'Bà Cúc gom giúp bốn bó gạo cũ, giá chát nhưng có hàng ngay.' },
      { label: 'Đợi, không làm gì', effects: ['flag:waited_delivery:1', 'rep:-2'], reply: 'Ngày hôm sau kệ vẫn trống một góc.' },
    ] },
  { id: 'market_day', title: 'Phiên chợ chiều', chapter: 2, day: 0, once: false, cond: 'daymod:6',
    text: 'Phiên chợ chiều họp ngoài đình. Người ta mang cả đồ cũ ra đổi, có cả thứ không rõ gốc.',
    choices: [
      { label: 'Đi dò hàng', effects: ['item:unmarked_goods:+1', 'money:-6', 'flag:market_looked:1'], reply: 'Bạn mang về một gói nhỏ, chưa biết bên trong là gì.' },
      { label: 'Ngồi nghe tin đồn', effects: ['flag:rumour:1', 'news:Gạo phố trên sắp về, giá có thể dịu lại.'], reply: 'Một câu nói nhỏ có thể đổi cả giá ngày mai.' },
      { label: 'Ở lại tiệm', effects: ['money:+3'], reply: 'Bạn bán thêm được mấy món cho khách vãng lai.' },
    ] },
  { id: 'craft', title: 'Gia đình người thợ', chapter: 2, day: 0, npc: 'bac_hung', once: true, cond: 'day:>=8',
    text: 'Bác Hùng hết than, lò rèn nguội từ hôm qua. Bác không xin, chỉ đứng nhìn mấy thanh tre dựng ở góc.',
    choices: [
      { label: 'Gửi than, không lấy tiền', effects: ['item:charcoal:-3', 'community:+6', 'relation:bac_hung:+10', 'flag:helped_hung:1'], reply: 'Hôm sau bác mang tới một cái cân đồng tự sửa.' },
      { label: 'Bán và hẹn trả sau', effects: ['item:charcoal:-3', 'debt:bac_hung:9:5', 'relation:bac_hung:+3'], reply: 'Bác gật, ghi tên vào sổ của bạn.' },
      { label: 'Đổi lấy tre và dây', effects: ['item:charcoal:-3', 'item:bamboo:+5', 'item:rope:+3', 'relation:bac_hung:+5'], reply: 'Hai bên đều có cái để dùng tiếp.' },
    ], next: 'craft_2' },
  { id: 'craft_2', title: 'Cái kệ mới', chapter: 3, day: 0, npc: 'bac_hung', once: true, cond: 'flag:helped_hung:>=1',
    text: 'Bác Hùng ghé lại, tay cầm mấy thanh gỗ đã bào. "Để tôi đóng thêm kệ cho cái tiệm."',
    choices: [
      { label: 'Nhận, trả công đủ', effects: ['money:-18', 'upgrade:shelves', 'relation:bac_hung:+4'], reply: 'Kệ mới lên, hàng bày được thoáng hơn.' },
      { label: 'Nhận và mời bác ăn cơm', effects: ['money:-10', 'upgrade:shelves', 'community:+4', 'relation:bac_hung:+8'], reply: 'Bác ở lại đến tối, kể chuyện cái lò rèn cũ.' },
    ] },
  { id: 'quinine', title: 'Chai thuốc cuối', chapter: 3, day: 0, npc: 'co_tuyet', once: true, cond: 'day:>=13',
    text: 'Cô Tuyết chỉ còn một chai ký ninh. Ông Cả muốn giữ cho nhà mình, cô Mai nói nhà cuối ngõ có người sốt nặng hơn.',
    choices: [
      { label: 'Nhường cho nhà cuối ngõ', effects: ['community:+9', 'relation:co_mai:+8', 'relation:ong_ca:-3', 'flag:quinine_kind:1'], reply: 'Cô Tuyết không nói gì, nhưng gói thuốc kỹ hơn mọi khi.' },
      { label: 'Giữ theo lời ông Cả', effects: ['rep:+4', 'relation:ong_ca:+6', 'community:-3', 'flag:quinine_ca:1'], reply: 'Ông Cả gật đầu. Cô Mai lặng lẽ đi ra.' },
      { label: 'Mua lại rồi tự quyết', effects: ['money:-16', 'item:quinine:+1', 'flag:quinine_own:1'], reply: 'Chai thuốc nằm trên quầy bạn. Chưa ai biết nó sẽ đi đâu.' },
    ] },
  { id: 'rumour', title: 'Tin đồn ở quán nước', chapter: 3, day: 0, npc: 'chi_sen', once: true, cond: 'day:>=14',
    text: 'Chị Sen rót chè, rồi ghé sát: "Người ta bảo tuần sau đường đê cấm xe. Gạo lên hay không là ở mấy ông lái."',
    choices: [
      { label: 'Nghe và tích gạo ngay', effects: ['money:-20', 'item:rice_old:+6', 'flag:hoarded:1', 'community:-3'], reply: 'Kho đầy thêm một góc, xóm thì xì xào.' },
      { label: 'Báo cho mấy nhà quen', effects: ['community:+6', 'rep:+2', 'flag:shared_rumour:1'], reply: 'Tin ấy đi khắp ngõ trước khi trời tối.' },
      { label: 'Coi như lời nói gió', effects: ['money:+2'], reply: 'Bạn tiếp tục bán hàng như mọi hôm.' },
    ] },
  { id: 'choice', title: 'Lời mời của thương lái', chapter: 4, day: 0, npc: 'ong_chin', once: true, cond: 'day:>=20',
    text: 'Ông Chín mời bạn gom hết gạo cho phố trên, giá tốt, nhưng chợ quê tuần này sẽ trống kệ.',
    choices: [
      { label: 'Ký giao kèo', effects: ['money:+55', 'rep:+4', 'community:-10', 'flag:contract:1'], reply: 'Tiền về một cục. Sáng hôm sau có người đứng trước cửa tiệm im lặng.' },
      { label: 'Chia đôi, giữ lại cho xóm', effects: ['money:+22', 'community:+4', 'flag:contract_split:1'], reply: 'Ông Chín cười: "Lần sau tính giá khác đấy."' },
      { label: 'Từ chối', effects: ['community:+7', 'relation:ong_chin:-6', 'flag:contract_no:1'], reply: 'Ông ta cất giấy đi, không giận, nhưng cũng không quên.' },
    ] },
  { id: 'tomorrow', title: 'Trước ngày cuối', chapter: 5, day: 28, once: true,
    text: 'Còn hai ngày. Ông Cả hỏi bạn định giữ cái tiệm này theo kiểu nào. Bạn không trả lời ngay.',
    choices: [
      { label: 'Giữ cho xóm', effects: ['flag:aim_community:1', 'community:+3'], reply: 'Bạn xếp lại mấy bao gạo ra gần cửa.' },
      { label: 'Giữ cho mình', effects: ['flag:aim_self:1', 'money:+5'], reply: 'Bạn đếm lại két tiền, rồi khóa sổ.' },
      { label: 'Cứ để ngày mai tự nói', effects: ['flag:aim_open:1'], reply: 'Bạn mở cửa như mọi sáng.' },
    ] },
];
export const QUEST: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

export interface EventDef {
  id: string; weight: number; cond: string; text: string; choices: Choice[]; category: string;
}
export const EVENTS: EventDef[] = [
  { id: 'rain_route', weight: 3, cond: 'weather:storm', category: 'supply', text: 'Mưa lớn làm đường đê lầy. Anh Tâm nhắn: chuyến hàng ngày mai có thể nằm lại bãi.', choices: [
    { label: 'Gửi thêm dây chão', effects: ['money:-4', 'item:rope:-1', 'flag:route_fixed:1', 'delivery:protect'], reply: 'Xe được buộc chặt hơn. Rủi ro giảm đi.' },
    { label: 'Chấp nhận rủi ro', effects: ['flag:route_risk:1'], reply: 'Bạn ghi một dòng vào sổ: mai nhớ hỏi trước.' } ] },
  { id: 'new_supplier', weight: 2, cond: 'day:>=6', category: 'supply', text: 'Một người lạ ghé, tự giới thiệu là người gánh hàng từ phố trên. Hỏi có cần thêm mối hàng không.', choices: [
    { label: 'Mời vào nói chuyện', effects: ['supplier:ong_chin:+8', 'flag:met_driver:1'], reply: 'Từ nay ông Chín ghé thường hơn.' },
    { label: 'Lịch sự từ chối', effects: ['rep:+1'], reply: 'Người lạ gật đầu rồi đi.' } ] },
  { id: 'debt_return', weight: 3, cond: 'debt:any', category: 'debt', text: 'Có người gõ cửa trả một phần nợ cũ, tay còn run vì ngại.', choices: [
    { label: 'Nhận và ghi rõ', effects: ['debt:pay:6', 'money:+6', 'rep:+2', 'community:+2'], reply: 'Sổ sạch thêm một dòng.' },
    { label: 'Bảo giữ lại dùng tiếp', effects: ['community:+5', 'relation:ba_tu:+4'], reply: '"Để mai mình trả nốt", họ nói.' } ] },
  { id: 'old_item', weight: 2, cond: 'day:>=4', category: 'valuable', text: 'Một bà mang tới chiếc vòng bạc cũ, muốn đổi lấy gạo cho cháu đi học.', choices: [
    { label: 'Đổi theo giá thật', effects: ['item:silver_bracelet:+1', 'item:rice_white:-4', 'money:-6'], reply: 'Hai bên cùng có cái cần.' },
    { label: 'Trả thêm một ít', effects: ['item:silver_bracelet:+1', 'item:rice_white:-4', 'money:-10', 'community:+6'], reply: 'Bà cúi đầu, rồi đi rất nhanh.' },
    { label: 'Không nhận', effects: ['rep:-1'], reply: 'Bà cất lại chiếc vòng vào túi áo.' } ] },
  { id: 'market_spike', weight: 2, cond: 'day:>=7', category: 'economy', text: 'Tin từ chợ: muối khan, giá nhập đội lên. Người bán rong đứng chờ ngoài ngõ.', choices: [
    { label: 'Mua ngay dù đắt', effects: ['money:-12', 'item:salt:+3', 'flag:bought_high:1'], reply: 'Có muối để đổi cá, nhưng vốn vơi đi.' },
    { label: 'Chờ phiên sau', effects: ['flag:waited_salt:1'], reply: 'Bạn để dòng tin ấy lại cho ngày mai.' } ] },
  { id: 'big_order', weight: 2, cond: 'day:>=9', category: 'trade', text: 'Nhà ông Cả cần một chuyến hàng cho đám giỗ, trả trước một nửa.', choices: [
    { label: 'Nhận đơn', effects: ['money:+14', 'item:rice_white:-3', 'item:tea_leaves:-2', 'rep:+3'], reply: 'Chuyến đi đúng hẹn, tiếng lành lan ra.' },
    { label: 'Từ chối vì kho mỏng', effects: ['rep:-1'], reply: 'Bạn giữ lại hàng cho khách quen.' } ] },
  { id: 'family_sick', weight: 2, cond: 'day:>=5', category: 'family', text: 'Em gái bạn ho suốt đêm. Bếp nhà mình cũng chỉ còn ít gạo.', choices: [
    { label: 'Lấy thuốc từ kệ', effects: ['item:herbal_medicine:-1', 'family:+2', 'community:+1'], reply: 'Sáng hôm sau em ngồi dậy ăn cháo được.' },
    { label: 'Để dành mà bán', effects: ['money:+4', 'community:-2'], reply: 'Bạn cất chai thuốc lại lên kệ.' } ] },
  { id: 'new_family', weight: 2, cond: 'day:>=10', category: 'town', text: 'Một gia đình dọn tới cuối ngõ, chưa quen ai. Họ đứng ngoài cửa tiệm một lúc lâu.', choices: [
    { label: 'Ra mời vào', effects: ['community:+5', 'flag:new_family:1'], reply: 'Họ sẽ nhớ cái tiệm đầu tiên mình ghé.' },
    { label: 'Bận dọn hàng', effects: ['money:+2'], reply: 'Họ đi sang quán nước.' } ] },
  { id: 'rumour_price', weight: 2, cond: 'day:>=5', category: 'economy', text: 'Cậu Ti chạy vào: "Người ta bảo ngày mai gạo lên!" Chưa biết thật hay không.', choices: [
    { label: 'Chỉnh giá trước', effects: ['market:rice_white:+0.08', 'rep:-2', 'flag:early_price:1'], reply: 'Bạn sửa bảng giá, lòng hơi khó chịu.' },
    { label: 'Giữ nguyên', effects: ['rep:+2', 'flag:steady_price:1'], reply: 'Sáng mai rồi tính.' } ] },
  { id: 'lamp_out', weight: 2, cond: 'day:>=8', category: 'shop', text: 'Dầu đèn cạn giữa lúc còn khách. Cả quầy chìm vào bóng tối.', choices: [
    { label: 'Châm thêm dầu', effects: ['item:lamp_oil:-1', 'rep:+2'], reply: 'Ánh đèn bật lại, khách ở lại thêm một lát.' },
    { label: 'Đóng cửa sớm', effects: ['money:+2', 'rep:-2'], reply: 'Bạn chốt sổ trước khi trời tối hẳn.' } ] },
  { id: 'visit_thanks', weight: 3, cond: 'relation:any:>=65', category: 'relation', text: 'Một người quen ghé, không mua gì, chỉ mang theo một ít lạc rang "gửi cái tiệm".', choices: [
    { label: 'Nhận, mời ngồi', effects: ['item:peanuts:+2', 'community:+3'], reply: 'Câu chuyện kéo dài đến lúc đèn lên.' },
    { label: 'Nhận rồi đi dọn kệ', effects: ['item:peanuts:+2', 'money:+1'], reply: 'Bạn gật đầu, tay vẫn xếp hàng.' } ] },
  { id: 'spoiled_crate', weight: 2, cond: 'weather:rain', category: 'shop', text: 'Góc kho ẩm, mấy bó rau héo rũ. Phải xử lý trước khi mai.', choices: [
    { label: 'Phơi lại, bán rẻ', effects: ['money:+3', 'rep:+1'], reply: 'Vớt được một ít, không phí hẳn.' },
    { label: 'Bỏ hẳn', effects: ['rep:+1', 'community:+2'], reply: 'Chỗ kho ấy được dọn sạch.' } ] },
  { id: 'iou_found', weight: 2, cond: 'day:>=6', category: 'story', text: 'Kẹp trong cuốn sổ cũ là một tờ giấy nợ ghi tên ông Năm, nhưng đã bị gạch chéo.', choices: [
    { label: 'Hỏi ông ấy', effects: ['relation:ong_nam:+6', 'flag:ledger_kind:1'], reply: 'Ông Năm cười: "Ông chủ cũ xóa từ lâu rồi, chỉ quên gạch sổ."' },
    { label: 'Cất lại vào sổ', effects: ['money:+2'], reply: 'Bạn để tờ giấy lại đúng chỗ cũ.' } ] },
  { id: 'quiet_day', weight: 3, cond: 'day:>=3', category: 'town', text: 'Chiều nay chợ vắng. Chỉ có tiếng mưa nhỏ trên mái tôn và tiếng chổi ai đó quét ngõ.', choices: [
    { label: 'Ngồi nghe một lát', effects: ['community:+2', 'flag:quiet:1'], reply: 'Một ngày chậm, nhưng không phải ngày trống.' },
    { label: 'Dọn lại kệ', effects: ['money:+2'], reply: 'Kệ gọn hơn, ngày mai dễ bày.' } ] },
  { id: 'driver_late', weight: 2, cond: 'delivery:any', category: 'supply', text: 'Chuyến hàng hẹn hôm nay vẫn chưa thấy bóng dáng.', choices: [
    { label: 'Ra bãi hỏi tin', effects: ['money:-2', 'delivery:check', 'flag:checked:1'], reply: 'Anh Tâm bảo mai đầu giờ chắc có.' },
    { label: 'Cứ mở cửa như thường', effects: ['rep:+1'], reply: 'Bạn bán nốt những gì còn trên kệ.' } ] },
  { id: 'price_complaint', weight: 2, cond: 'rep:<45', category: 'relation', text: 'Ngoài chợ có người nói cái tiệm này bán hơi cao. Lời ấy tới tai bạn lúc chiều.', choices: [
    { label: 'Bớt giá vài món', effects: ['money:-3', 'rep:+4', 'community:+2'], reply: 'Bảng giá được sửa, người ta dịu lại.' },
    { label: 'Giữ nguyên, giải thích', effects: ['rep:-1'], reply: 'Bạn giải thích về giá nhập, nhưng không ai đứng lại nghe hết.' } ] },
  { id: 'festival', weight: 2, cond: 'daymod:9', category: 'town', text: 'Đình làng mở phiên nhỏ. Người ta mang bánh, chè và cả mấy món cũ ra đổi.', choices: [
    { label: 'Mang hàng ra đổi', effects: ['item:rice_flour:-2', 'item:tea_set:+1', 'community:+3'], reply: 'Bạn về với một bộ chén sứ không ngờ.' },
    { label: 'Chỉ đi xem', effects: ['community:+2', 'flag:festival:1'], reply: 'Trẻ con chạy qua cửa tiệm suốt buổi chiều.' } ] },
  { id: 'letter', weight: 2, cond: 'day:>=11', category: 'story', text: 'Cậu Ti mang tới một phong thư không ghi người gửi, chỉ có hàng chữ: "Cảm ơn hôm mưa ấy."', choices: [
    { label: 'Cất vào sổ', effects: ['community:+3', 'flag:letter:1'], reply: 'Bạn không biết ai gửi, nhưng giữ lại.' },
    { label: 'Hỏi cậu Ti', effects: ['relation:cau_ti:+4', 'flag:letter:1'], reply: 'Cậu bé chỉ cười rồi chạy đi.' } ] },
  { id: 'storm_night', weight: 2, cond: 'weather:storm', category: 'town', text: 'Gió nổi, mái kêu. Cả xóm đóng cửa sớm, chỉ còn ánh đèn tiệm bạn.', choices: [
    { label: 'Châm đèn sáng hơn', effects: ['item:lamp_oil:-1', 'community:+5', 'rep:+2'], reply: 'Có người ghé chỉ để thấy còn một chỗ mở cửa.' },
    { label: 'Đóng tiệm, giữ dầu', effects: ['money:+1'], reply: 'Đêm ấy dài hơn mọi khi.' } ] },
  { id: 'last_customer', weight: 2, cond: 'day:>=24', category: 'story', text: 'Bà Tư ghé muộn, mua đúng một nắm gạo cũ như mọi khi. Bà nói: "Tiệm vẫn mở là tốt rồi."', choices: [
    { label: 'Tiễn bà ra cửa', effects: ['community:+4', 'relation:ba_tu:+6'], reply: 'Bà đi chậm, tay bám vào gậy.' },
    { label: 'Thêm cho bà nắm nữa', effects: ['item:rice_old:-1', 'community:+6', 'relation:ba_tu:+8'], reply: 'Bà lắc đầu, nhưng vẫn nhận.' } ] },
];
export const EVENT: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

export const DIFFICULTY: Record<Difficulty, {
  name: string; money: number; family: number; supply: number; patience: number;
  customers: number; desc: string;
}> = {
  story: { name: 'Chuyện kể', money: 160, family: 8, supply: 1.2, patience: 1.35, customers: 4, desc: 'Kinh tế dễ thở, để nghe hết mấy câu chuyện trong xóm.' },
  normal: { name: 'Thường', money: 120, family: 6, supply: 1.0, patience: 1.0, customers: 5, desc: 'Nhịp cân bằng: đủ hàng, đủ khách, đủ chuyện phải chọn.' },
  hard: { name: 'Khan hiếm', money: 90, family: 4, supply: 0.78, patience: 0.8, customers: 6, desc: 'Nguồn hàng mỏng, khách chờ ngắn, sai một giá là thấy ngay.' },
};

export const HELP: [string, string][] = [
  ['Chuột / chạm', 'Kéo thả hàng giữa kho, kệ và khay quầy'],
  ['Chuột phải', 'Tách đôi chồng hàng'],
  ['Space', 'Tạm dừng / tiếp tục'],
  ['1 · 2 · 3', 'Tốc độ thời gian'],
  ['I', 'Kho hàng & kệ'],
  ['B', 'Nhập hàng / nhà cung cấp'],
  ['L', 'Sổ sách · công nợ · báo cáo'],
  ['M', 'Bản đồ'],
  ['J', 'Nhật ký & nhiệm vụ'],
  ['U', 'Nâng cấp & nhân viên'],
  ['S', 'Lưu / tải'],
  ['H', 'Trợ giúp'],
  ['O', 'Mở cửa'],
  ['E', 'Chốt sổ'],
  ['Enter', 'Xác nhận'],
  ['Esc', 'Đóng bảng'],
];

export const ASSET_PRELOAD = (() => {
  const urls = [
    A('backgrounds/title.png'), A('backgrounds/shop.png'), A('backgrounds/shop_dusk.png'),
    A('backgrounds/shop_night.png'), A('backgrounds/shop_rain.png'),
    ...['shop_level2', 'shop_level3', 'shop_level4', 'shop_level5'].map((n) => A(`backgrounds/${n}.png`)),
    ...LOCATIONS.filter((l) => l.id !== 'shop').flatMap((l) => [A(`backgrounds/${l.bg}`), ...(l.bgRain ? [A(`backgrounds/${l.bgRain!}`)] : []), ...(l.bgDusk ? [A(`backgrounds/${l.bgDusk!}`)] : [])]),
    ...['dawn', 'morning', 'day', 'dusk', 'night', 'rain', 'storm', 'lamp_glow'].map((n) => A(`backgrounds/overlays/${n}.png`)),
    A('effects/glow.png'), A('effects/coin.png'), A('effects/sparkle.png'), A('effects/dust.png'),
    A('ui/panels/wood.png'), A('ui/panels/paper.png'), A('ui/slots/slot.png'),
  ];
  return urls;
})();

export const BG_FOR_LEVEL = (level: number): string => {
  if (level >= 5) return A('backgrounds/shop_level5.png');
  if (level >= 4) return A('backgrounds/shop_level4.png');
  if (level >= 3) return A('backgrounds/shop_level3.png');
  if (level >= 2) return A('backgrounds/shop_level2.png');
  return A('backgrounds/shop.png');
};

export function weatherPlate(w: Weather): string | null {
  if (w === 'rain') return A('backgrounds/overlays/rain.png');
  if (w === 'storm') return A('backgrounds/overlays/storm.png');
  return null;
}
export function timePlate(minute: number): string {
  const h = minute / 60;
  if (h < 7) return A('backgrounds/overlays/dawn.png');
  if (h < 9) return A('backgrounds/overlays/morning.png');
  if (h < 15) return A('backgrounds/overlays/day.png');
  if (h < 17) return A('backgrounds/overlays/dusk.png');
  return A('backgrounds/overlays/night.png');
}

export const UI_ICON = (name: string): string => A(`ui/icons/${name}.png`);
export const qualityLabel = (q: Quality | number): string => QUALITY_NAME[Math.max(0, Math.min(3, q)) as Quality] ?? 'Thường';
