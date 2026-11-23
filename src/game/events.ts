import type { EventDef, GameState } from './types';

const npcPortrait = (id: string, expr = 'neutral') => `/assets/characters/portraits/${id}_${expr}.png`;

// ------------------------------------------------------------------ story --
const STORY: EventDef[] = [
  {
    id: 'intro_day1', title: 'Căn tiệm của cha', kind: 'story', day: 1, once: true, weight: 0,
    speaker: 'Bạn', portrait: npcPortrait('player'),
    text: 'Buổi sáng đầu tiên. Bạn đứng sau quầy gỗ cũ, tay lau lớp bụi trên mặt kệ. Ngoài kia, thị trấn An Bình thức dậy trong tiếng gà gáy và mùi rơm ẩm. Trong két chỉ còn vài đồng bạc. Bạn quyết định mở cửa.',
    choices: [
      { label: 'Mở cửa đón khách', hint: 'Bắt đầu ngày đầu tiên.', effects: ['rep:+2', 'flag:opened'], result: 'Bạn lật tấm ván cửa. Tiếng gỗ kêu cót két, như một lời chào.' },
      { label: 'Dọn dẹp trước đã', hint: 'Uy tín +, thời gian trôi.', effects: ['rep:+4', 'money:-0'], result: 'Bạn dọn lại kệ, lau cửa kính. Khi mở cửa, tiệm đã sáng sủa hơn.' },
    ],
  },
  {
    id: 'chapter2', title: 'Chương 2 — Những ngày thiếu thốn', kind: 'story', day: 7, once: true, weight: 0,
    speaker: 'Thị trấn', portrait: '',
    text: 'Tuần đầu tiên trôi qua. Hàng hóa bắt đầu khan hiếm: gạo lên giá, muối khó mua, thuốc gần như biến mất. Người ta đến tiệm không chỉ để mua, mà để hỏi xem còn gì không.',
    choices: [{ label: 'Tiếp tục', effects: ['chapter:2'], result: 'Chương 2 bắt đầu.' }],
  },
  {
    id: 'chapter3', title: 'Chương 3 — Thị trấn biến động', kind: 'story', day: 13, once: true, weight: 0,
    speaker: 'Thị trấn', portrait: '',
    text: 'Tin từ tỉnh lẻ ngày càng đáng lo. Người ta rủ nhau đi họp, bàn bạc. Chợ vắng hơn, nhưng nhu cầu lại tăng lên. Bạn nghe thấy những câu chuyện mà trước đây không ai dám nói.',
    choices: [
      { label: 'Giữ giá bán ổn định', hint: 'Uy tín +, cộng đồng +', effects: ['chapter:3', 'rep:+6', 'community:+6'], result: 'Bạn quyết định không tăng giá. Người ta ghi nhớ điều đó.' },
      { label: 'Tăng giá theo thị trường', hint: 'Tiền +, uy tín -', effects: ['chapter:3', 'money:+25', 'rep:-5'], result: 'Bạn bán được nhiều hơn, nhưng có ánh mắt không vui.' },
      { label: 'Giúp những gia đình khó nhất', hint: 'Cộng đồng +, tiền -', effects: ['chapter:3', 'community:+10', 'money:-15'], result: 'Bạn giấu vài bao gạo sau quầy, dành cho những người cần nhất.' },
    ],
  },
  {
    id: 'chapter4', title: 'Chương 4 — Những lựa chọn', kind: 'story', day: 19, once: true, weight: 0,
    speaker: 'Bạn', portrait: npcPortrait('player'),
    text: 'Bạn đã biết mặt hầu hết người trong thị trấn. Bạn biết ai nghèo, ai giàu, ai đang cần gì. Giờ, khi thị trấn thay đổi, bạn phải quyết định căn tiệm này sẽ trở thành gì.',
    choices: [
      { label: 'Một nơi để mọi người dựa vào', hint: 'Hướng cộng đồng', effects: ['chapter:4', 'flag:direction_community', 'community:+8'], result: 'Bạn muốn tiệm mình là nơi không ai bị bỏ lại phía sau.' },
      { label: 'Một mạng lưới buôn bán', hint: 'Hướng thương nhân', effects: ['chapter:4', 'flag:direction_merchant', 'money:+20'], result: 'Bạn muốn hàng từ nơi này đến được nơi khác.' },
      { label: 'Một chữ tín trong thị trấn', hint: 'Hướng uy tín', effects: ['chapter:4', 'flag:direction_honor', 'rep:+8'], result: 'Bạn muốn người ta tin vào con số trên cân và lời hứa của mình.' },
      { label: 'Một mái nhà vững vàng', hint: 'Hướng gia đình', effects: ['chapter:4', 'flag:direction_family', 'family:+10'], result: 'Trước hết, bạn muốn gia đình mình không phải lo từng bữa.' },
    ],
  },
  {
    id: 'chapter5', title: 'Chương 5 — Ngày mai', kind: 'story', day: 25, once: true, weight: 0,
    speaker: 'Bạn', portrait: npcPortrait('player'),
    text: 'Hai mươi lăm ngày. Bạn đã nhìn thấy thị trấn trong những ngày nắng và những ngày mưa. Có những người bạn đã giúp, có những người bạn từ chối, có những người đã giúp bạn khi bạn không ngờ tới.',
    choices: [{ label: 'Tiếp tục', effects: ['chapter:5'], result: 'Những ngày cuối cùng bắt đầu.' }],
  },
  {
    id: 'finale', title: 'Ngày mai', kind: 'story', day: 30, once: true, weight: 0,
    speaker: 'Bạn', portrait: npcPortrait('player'),
    text: 'Sáng ngày thứ ba mươi. Bạn mở cửa tiệm như mọi khi. Ánh nắng xuyên qua ô cửa, chiếu lên những bao gạo, những chiếc bình rỗng và cuốn sổ đã viết đầy. Bạn nhận ra rằng mình đã xây được điều gì đó — dù là to hay nhỏ.',
    choices: [{ label: 'Nhìn lại hành trình', effects: ['finale:1'], result: 'Câu chuyện khép lại.' }],
  },
];

// -------------------------------------------------------------- personal arcs
const ARC: EventDef[] = [
  // bà Tư
  {
    id: 'ba_tu_1', title: 'Bà Tư và ba đứa trẻ', kind: 'npc', minDay: 2, once: true, weight: 0,
    speaker: 'Trần Thị Tư', portrait: npcPortrait('ba_tu', 'sad'),
    condition: (s) => (s.npcs.ba_tu?.trust ?? 0) >= 0,
    text: 'Bà Tư đứng trước quầy, tay bấu vào vạt áo rách. Ba đứa nhỏ ở nhà đã hai bữa chưa có cơm. Bà không đủ tiền, nhưng bà hỏi liệu bạn có thể bán chịu một ít gạo.',
    choices: [
      { label: 'Bán chịu, ghi vào sổ', hint: 'Quan hệ +, công nợ +', effects: ['trust:ba_tu:+12', 'credit:ba_tu:14', 'rep:+3', 'quest:rice_bowl:1', 'flag:ba_tu_credit'], result: 'Bà Tư cúi đầu cảm ơn. Bạn viết vào sổ một khoản nợ nhỏ.' },
      { label: 'Giảm một nửa giá', hint: 'Quan hệ +, tiền +', effects: ['trust:ba_tu:+8', 'money:+6', 'rep:+2', 'quest:rice_bowl:1', 'flag:ba_tu_discount'], result: 'Bà Tư trả được một phần. Bạn để bà lấy thêm ít muối.' },
      { label: 'Tặng một phần gạo', hint: 'Cộng đồng +, uy tín +', effects: ['trust:ba_tu:+16', 'community:+8', 'rep:+5', 'item:rice_white:-1', 'quest:rice_bowl:1', 'flag:ba_tu_gift'], result: 'Bà Tư ôm bao gạo, mắt đỏ hoe. Bạn không nói gì thêm.' },
      { label: 'Từ chối', hint: 'Quan hệ -, uy tín -', effects: ['trust:ba_tu:-12', 'rep:-4', 'community:-4', 'quest:rice_bowl:1', 'flag:ba_tu_refused'], result: 'Bà Tư gật đầu, quay đi. Bạn thấy mình không dám nhìn theo.' },
    ],
  },
  {
    id: 'ba_tu_2', title: 'Ít khoai lang', kind: 'npc', minDay: 4, once: true, weight: 0,
    speaker: 'Trần Thị Tư', portrait: npcPortrait('ba_tu', 'happy'),
    condition: (s) => s.npcs.ba_tu?.trust >= 8 && !s.seenEvents.includes('ba_tu_2'),
    text: 'Bà Tư quay lại, mang theo một gói khoai lang nhỏ. "Nhà còn ít, em đem lên anh chị dùng dần."',
    choices: [
      { label: 'Nhận và trả thêm ít gạo', effects: ['trust:ba_tu:+8', 'item:sweet_potato:+2', 'item:rice_white:-1', 'quest:rice_bowl:2'], result: 'Bà Tư cười, lần đầu tiên bạn thấy bà cười.' },
      { label: 'Nhận, không trả lại', effects: ['trust:ba_tu:+4', 'item:sweet_potato:+2', 'quest:rice_bowl:2'], result: 'Bạn nhận lấy. Bà Tư có vẻ nhẹ nhõm hơn.' },
    ],
  },
  {
    id: 'ba_tu_3', title: 'Câu hỏi của bà Tư', kind: 'npc', minDay: 9, once: true, weight: 0,
    speaker: 'Trần Thị Tư', portrait: npcPortrait('ba_tu', 'neutral'),
    condition: (s) => s.npcs.ba_tu?.trust >= 20 && !s.seenEvents.includes('ba_tu_3'),
    text: 'Bà Tư đến sớm, khi tiệm chưa đông. "Anh chị ơi, em muốn hỏi... nếu em đem đứa nhỏ ra đây làm phụ, anh chị có nhận không?"',
    choices: [
      { label: 'Nhận giúp việc', effects: ['trust:ba_tu:+15', 'community:+8', 'flag:ba_tu_child_worker', 'money:-5'], result: 'Bạn nói sẽ để cô bé phụ quét dọn, mỗi tuần trả ít tiền. Bà Tư cúi đầu.' },
      { label: 'Từ chối nhẹ nhàng', effects: ['trust:ba_tu:-4', 'flag:ba_tu_child_no'], result: 'Bạn giải thích tiệm nhỏ, chưa cần người. Bà Tư gật đầu, nhưng bạn thấy thất vọng trong mắt bà.' },
    ],
  },
  // ông Năm
  {
    id: 'ong_nam_1', title: 'Thửa ruộng của ông Năm', kind: 'npc', minDay: 3, once: true, weight: 0,
    speaker: 'Nguyễn Văn Năm', portrait: npcPortrait('ong_nam', 'sad'),
    condition: (s) => s.npcs.ong_nam?.trust >= 0,
    text: 'Ông Năm ngồi xuống bậc thềm, đặt vào quầy một bao ngô nhỏ. "Năm nay mất mùa. Ruộng gần như không thu được gì. Ông chỉ còn mỗi này."',
    choices: [
      { label: 'Mua hết ngô với giá cao', effects: ['money:-18', 'item:corn:+8', 'trust:ong_nam:+12', 'rep:+3', 'quest:ong_nam_arc:1'], result: 'Ông Năm nhìn bạn, có vẻ không tin. "Cậu chủ này..." Ông lắc đầu, cười.' },
      { label: 'Mua với giá thường', effects: ['money:-10', 'item:corn:+8', 'trust:ong_nam:+5', 'quest:ong_nam_arc:1'], result: 'Ông Năm nhận tiền, nhẹ nhõm thở ra.' },
      { label: 'Tặng ông ít muối', effects: ['item:salt:-1', 'trust:ong_nam:+10', 'community:+4', 'quest:ong_nam_arc:1'], result: 'Ông Năm nhận bịch muối, cất vào trong người như cất một thứ quý.' },
    ],
  },
  {
    id: 'ong_nam_2', title: 'Đề nghị của ông Năm', kind: 'npc', minDay: 7, once: true, weight: 0,
    speaker: 'Nguyễn Văn Năm', portrait: npcPortrait('ong_nam', 'neutral'),
    condition: (s) => s.npcs.ong_nam?.trust >= 12 && !s.seenEvents.includes('ong_nam_2'),
    text: 'Ông Năm nói có người quen ở đầu làng còn gạo, nhưng cần vải và muối để đổi. Ông hỏi bạn có muốn đi một phần không.',
    choices: [
      { label: 'Góp phần, cùng đi', effects: ['money:-15', 'item:cloth:-2', 'item:rice_white:+10', 'trust:ong_nam:+10', 'quest:ong_nam_arc:2'], result: 'Chuyến đi thành công. Ông Năm chia cho bạn một nửa số gạo.' },
      { label: 'Từ chối, nhưng cho ông vay ít tiền', effects: ['money:-10', 'trust:ong_nam:+6', 'flag:ong_nam_loan', 'quest:ong_nam_arc:2'], result: 'Ông Năm hứa sẽ trả. Bạn không chắc mình có tin không.' },
    ],
  },
  {
    id: 'ong_nam_3', title: 'Bao gạo của ông Năm', kind: 'npc', minDay: 13, once: true, weight: 0,
    speaker: 'Nguyễn Văn Năm', portrait: npcPortrait('ong_nam', 'happy'),
    condition: (s) => s.npcs.ong_nam?.trust >= 24 && !s.seenEvents.includes('ong_nam_3'),
    text: 'Ông Năm khiêng đến một bao gạo nhỏ, đặt xuống quầy. "Cậu giúp tôi. Đây là phần của cậu."',
    choices: [
      { label: 'Nhận, và trả ông một phần tiền', effects: ['item:rice_white:+6', 'money:-8', 'trust:ong_nam:+8', 'quest:ong_nam_arc:3'], result: 'Ông Năm nhận tiền, nhưng bạn biết ông chỉ nhận cho có lễ.' },
      { label: 'Nhận và mời ông uống chè', effects: ['item:rice_white:+6', 'trust:ong_nam:+12', 'community:+4', 'quest:ong_nam_arc:3'], result: 'Hai người ngồi uống chè dưới hiên. Không ai nói gì nhiều.' },
    ],
  },
  // ông Tô
  {
    id: 'ong_to_1', title: 'Người thợ mộc', kind: 'npc', minDay: 5, once: true, weight: 0,
    speaker: 'Phạm Văn Tô', portrait: npcPortrait('ong_to', 'sad'),
    condition: (s) => s.npcs.ong_to?.trust >= 0,
    text: 'Ông Tô đứng trước quầy, đôi tay đầy vết chai. "Tôi cần vài cân đinh và thanh gỗ. Đứa con ốm, tôi muốn làm cho nó một cái giường nhỏ."',
    choices: [
      { label: 'Bán đúng giá', effects: ['item:nails:-2', 'item:wood:-1', 'money:+14', 'trust:ong_to:+5', 'quest:ong_to_arc:1'], result: 'Ông Tô cầm hàng, cẩn thận như cầm một món đồ quý.' },
      { label: 'Giảm giá cho ông', effects: ['item:nails:-2', 'item:wood:-1', 'money:+7', 'trust:ong_to:+10', 'rep:+3', 'quest:ong_to_arc:1'], result: 'Ông Tô cảm ơn rối rít. Bạn thấy ấm ở trong lòng.' },
      { label: 'Tặng luôn', effects: ['item:nails:-2', 'item:wood:-1', 'trust:ong_to:+18', 'community:+6', 'quest:ong_to_arc:1'], result: 'Ông Tô đứng lặng một lúc, rồi cúi đầu. "Tôi sẽ không quên."' },
    ],
  },
  {
    id: 'ong_to_2', title: 'Chiếc hộp gỗ', kind: 'npc', minDay: 10, once: true, weight: 0,
    speaker: 'Phạm Văn Tô', portrait: npcPortrait('ong_to', 'happy'),
    condition: (s) => s.npcs.ong_to?.trust >= 10 && !s.seenEvents.includes('ong_to_2'),
    text: 'Ông Tô mang đến một chiếc hộp gỗ nhỏ, khắc hoa văn chỉn chu. "Tôi làm cho cậu. Cảm ơn cậu đã giúp tôi."',
    choices: [
      { label: 'Nhận và treo lên kệ', effects: ['item:wooden_box:+1', 'trust:ong_to:+10', 'quest:ong_to_arc:2'], result: 'Chiếc hộp nằm trên kệ, như một lời hứa.' },
      { label: 'Nhận, nhưng trả ông tiền công', effects: ['item:wooden_box:+1', 'money:-10', 'trust:ong_to:+8', 'quest:ong_to_arc:2'], result: 'Ông Tô lắc đầu, nhưng cuối cùng cũng nhận.' },
    ],
  },
  {
    id: 'ong_to_3', title: 'Cùng làm ăn', kind: 'npc', minDay: 16, once: true, weight: 0,
    speaker: 'Phạm Văn Tô', portrait: npcPortrait('ong_to', 'neutral'),
    condition: (s) => s.npcs.ong_to?.trust >= 22 && !s.seenEvents.includes('ong_to_3'),
    text: 'Ông Tô rủ bạn cùng làm: ông làm đồ gỗ, bạn bán. "Cậu có cửa hàng, tôi có tay nghề. Mình giúp nhau."',
    choices: [
      { label: 'Nhận lời hợp tác', effects: ['trust:ong_to:+15', 'flag:ong_to_partner', 'money:-20', 'quest:ong_to_arc:3'], result: 'Bạn góp ít vốn. Ông Tô bắt tay, tay người thợ chai sạn mà ấm.' },
      { label: 'Từ chối, nhưng hứa bán đồ giúp', effects: ['trust:ong_to:+6', 'flag:ong_to_selling', 'quest:ong_to_arc:3'], result: 'Ông Tô gật đầu. Ít nhất, đồ của ông có chỗ bán.' },
    ],
  },
  // anh Khởi
  {
    id: 'anh_khoi_1', title: 'Đôi dép của anh Khởi', kind: 'npc', minDay: 3, once: true, weight: 0,
    speaker: 'Lê Văn Khởi', portrait: npcPortrait('anh_khoi', 'neutral'),
    condition: (s) => s.npcs.anh_khoi?.trust >= 0,
    text: 'Anh Khởi dừng xe trước cửa, nhìn xuống đôi chân đất. "Có đôi dép nào rẻ không? Đôi này rách rồi."',
    choices: [
      { label: 'Bán đúng giá', effects: ['money:+6', 'trust:anh_khoi:+4', 'quest:anh_khoi_arc:1'], result: 'Anh Khởi đi thử, gật đầu, rồi trở lại kéo xe.' },
      { label: 'Tặng anh một đôi', effects: ['item:slippers:-1', 'trust:anh_khoi:+14', 'community:+4', 'quest:anh_khoi_arc:1'], result: 'Anh Khởi nhìn bạn, không nói gì, chỉ gật đầu thật lâu.' },
      { label: 'Cho anh vay tiền', effects: ['credit:anh_khoi:6', 'trust:anh_khoi:+6', 'quest:anh_khoi_arc:1'], result: 'Anh Khởi hứa sẽ trả dần.' },
    ],
  },
  {
    id: 'anh_khoi_2', title: 'Chuyến hàng tỉnh lẻ', kind: 'npc', minDay: 9, once: true, weight: 0,
    speaker: 'Lê Văn Khởi', portrait: npcPortrait('anh_khoi', 'happy'),
    condition: (s) => s.npcs.anh_khoi?.trust >= 12 && !s.seenEvents.includes('anh_khoi_2'),
    text: 'Anh Khởi hỏi bạn có muốn góp tiền mua một xe mới không. "Xe cũ rồi, kéo không được xa. Có xe mới, tôi đưa hàng cho cậu khỏi trả cước."',
    choices: [
      { label: 'Góp một nửa', effects: ['money:-30', 'flag:anh_khoi_bike', 'trust:anh_khoi:+15', 'quest:anh_khoi_arc:2'], result: 'Anh Khởi đẩy xe mới về, cười như trẻ con.' },
      { label: 'Từ chối, nhưng cho vay', effects: ['credit:anh_khoi:25', 'trust:anh_khoi:+6', 'quest:anh_khoi_arc:2'], result: 'Anh Khởi nhận lời. Bạn thấy hơi lo, nhưng cũng tin anh.' },
    ],
  },
  {
    id: 'anh_khoi_3', title: 'Hàng từ tỉnh', kind: 'npc', minDay: 15, once: true, weight: 0,
    speaker: 'Lê Văn Khởi', portrait: npcPortrait('anh_khoi', 'happy'),
    condition: (s) => s.npcs.anh_khoi?.trust >= 24 && !s.seenEvents.includes('anh_khoi_3'),
    text: 'Anh Khởi trở về từ tỉnh, trên xe là những gói hàng nhỏ. "Tôi mua giúp cậu. Giá tốt đấy."',
    choices: [
      { label: 'Nhận hết', effects: ['money:-25', 'item:tea:+3', 'item:sugar:+2', 'item:paper:+4', 'trust:anh_khoi:+10', 'quest:anh_khoi_arc:3'], result: 'Hàng tốt, giá hợp lý. Bạn sung sướng cất vào kho.' },
      { label: 'Nhận một phần', effects: ['money:-12', 'item:tea:+2', 'item:paper:+2', 'trust:anh_khoi:+6', 'quest:anh_khoi_arc:3'], result: 'Anh Khởi gật đầu, không ép.' },
    ],
  },
  // cô Hoa
  {
    id: 'co_hoa_1', title: 'Cá tươi đổi gạo', kind: 'npc', minDay: 4, once: true, weight: 0,
    speaker: 'Trần Thị Hoa', portrait: npcPortrait('co_hoa', 'neutral'),
    condition: (s) => s.npcs.co_hoa?.trust >= 0,
    text: 'Cô Hoa xách một xô cá tươi, đứng trước quầy. "Anh/chị ơi, đổi ít gạo cho em. Cá mới bắt, còn sống này."',
    choices: [
      { label: 'Đổi với giá hợp lý', effects: ['item:fresh_fish:+3', 'item:rice_white:-1', 'trust:co_hoa:+8', 'quest:co_hoa_arc:1'], result: 'Cô Hoa cười, nhận gạo. Cá tươi để trong thùng đá.' },
      { label: 'Đổi với giá ưu đãi', effects: ['item:fresh_fish:+4', 'item:rice_white:-1', 'trust:co_hoa:+14', 'community:+3', 'quest:co_hoa_arc:1'], result: 'Cô Hoa ngạc nhiên, rồi cảm ơn rối rít.' },
      { label: 'Từ chối', effects: ['trust:co_hoa:-8', 'quest:co_hoa_arc:1'], result: 'Cô Hoa gật đầu, xách xô cá đi tiếp. Bạn ngửi thấy mùi tanh còn vương.' },
    ],
  },
  {
    id: 'co_hoa_2', title: 'Hỏi giá cá', kind: 'npc', minDay: 10, once: true, weight: 0,
    speaker: 'Trần Thị Hoa', portrait: npcPortrait('co_hoa', 'neutral'),
    condition: (s) => s.npcs.co_hoa?.trust >= 12 && !s.seenEvents.includes('co_hoa_2'),
    text: 'Cô Hoa hỏi bạn về giá cá ở chợ. "Em mới bán, không biết mình có bị ép giá không."',
    choices: [
      { label: 'Chia sẻ giá thật', effects: ['trust:co_hoa:+12', 'community:+4', 'quest:co_hoa_arc:2'], result: 'Cô Hoa ghi nhớ. Lần sau, cô bán được giá tốt hơn.' },
      { label: 'Nói giá cao hơn để cô nhớ ơn', effects: ['trust:co_hoa:+4', 'flag:co_hoa_misled', 'quest:co_hoa_arc:2'], result: 'Cô Hoa tin bạn. Bạn thấy hơi không yên.' },
    ],
  },
  {
    id: 'co_hoa_3', title: 'Bến sông chiều', kind: 'npc', minDay: 16, once: true, weight: 0,
    speaker: 'Trần Thị Hoa', portrait: npcPortrait('co_hoa', 'happy'),
    condition: (s) => s.npcs.co_hoa?.trust >= 22 && !s.seenEvents.includes('co_hoa_3'),
    text: 'Cô Hoa mời bạn ra bến sông. "Hôm nay cha em đánh được mẻ cá lớn. Em muốn mời anh/chị ăn cơm."',
    choices: [
      { label: 'Đi', effects: ['trust:co_hoa:+12', 'community:+5', 'flag:co_hoa_dinner', 'quest:co_hoa_arc:3'], result: 'Bữa cơm chiều bên bến sông, có cá, có rau dại, có tiếng nước.' },
      { label: 'Từ chối, tặng cô ít gạo', effects: ['item:rice_white:-1', 'trust:co_hoa:+6', 'quest:co_hoa_arc:3'], result: 'Cô Hoa nhận gạo, mời bạn lần sau.' },
    ],
  },
  // thầy Minh
  {
    id: 'ong_giao_minh_1', title: 'Giấy và mực', kind: 'npc', minDay: 6, once: true, weight: 0,
    speaker: 'Giáo Minh', portrait: npcPortrait('ong_giao_minh', 'neutral'),
    condition: (s) => s.npcs.ong_giao_minh?.trust >= 0,
    text: 'Thầy Minh đến, hỏi mua giấy và mực. "Trường làng cần chép bài cho học trò. Giấy giờ khó mua quá."',
    choices: [
      { label: 'Bán đúng giá', effects: ['item:paper:-3', 'item:ink:-1', 'money:+20', 'trust:ong_giao_minh:+5', 'quest:ong_giao_minh_arc:1'], result: 'Thầy Minh cất giấy vào túi, cúi đầu cảm ơn.' },
      { label: 'Tặng giấy', effects: ['item:paper:-3', 'trust:ong_giao_minh:+15', 'community:+5', 'quest:ong_giao_minh_arc:1'], result: 'Thầy Minh lặng đi. Rồi thầy nói: "Tôi sẽ nhớ điều này."' },
    ],
  },
  {
    id: 'ong_giao_minh_2', title: 'Cuốn sách cũ', kind: 'npc', minDay: 12, once: true, weight: 0,
    speaker: 'Giáo Minh', portrait: npcPortrait('ong_giao_minh', 'happy'),
    condition: (s) => s.npcs.ong_giao_minh?.trust >= 12 && !s.seenEvents.includes('ong_giao_minh_2'),
    text: 'Thầy Minh gửi bạn một cuốn sách cũ, bìa đã bạc màu. "Tôi chép lại được. Cậu giữ lấy, có lúc sẽ dùng tới."',
    choices: [
      { label: 'Nhận và đọc', effects: ['item:old_book:+1', 'trust:ong_giao_minh:+10', 'quest:ong_giao_minh_arc:2'], result: 'Bạn đọc hết đêm đó. Có những câu bạn không hiểu, nhưng nhớ mãi.' },
      { label: 'Nhận, nhưng để lại kệ', effects: ['item:old_book:+1', 'trust:ong_giao_minh:+4', 'quest:ong_giao_minh_arc:2'], result: 'Cuốn sách nằm trên kệ, cạnh những món đồ cũ.' },
    ],
  },
  {
    id: 'ong_giao_minh_3', title: 'Những thay đổi', kind: 'npc', minDay: 18, once: true, weight: 0,
    speaker: 'Giáo Minh', portrait: npcPortrait('ong_giao_minh', 'neutral'),
    condition: (s) => s.npcs.ong_giao_minh?.trust >= 24 && !s.seenEvents.includes('ong_giao_minh_3'),
    text: 'Thầy Minh ngồi xuống, hạ giọng: "Sắp có những thay đổi lớn. Cậu nên chuẩn bị. Tiếm của cậu có thể thành nơi mọi người tìm đến."',
    choices: [
      { label: 'Lắng nghe và cảm ơn', effects: ['trust:ong_giao_minh:+10', 'flag:teacher_warning', 'quest:ong_giao_minh_arc:3'], result: 'Bạn gật đầu. Ngoài đường, gió đổi hướng.' },
      { label: 'Hỏi thêm chi tiết', effects: ['trust:ong_giao_minh:+6', 'flag:teacher_warning_detail', 'quest:ong_giao_minh_arc:3'], result: 'Thầy Minh kể thêm vài điều, rồi dừng lại. "Cậu tự quyết định."' },
    ],
  },
  // anh Vượng
  {
    id: 'anh_vuong_1', title: 'Cơn bão', kind: 'npc', minDay: 8, once: true, weight: 0,
    speaker: 'Vượng', portrait: npcPortrait('anh_vuong', 'sad'),
    condition: (s) => s.npcs.anh_vuong?.trust >= 0,
    text: 'Anh Vượng nhìn trời, rồi nói: "Sắp có bão. Cậu nên biết trước. Hàng trên sông sẽ khan đấy."',
    choices: [
      { label: 'Cảm ơn và chuẩn bị', effects: ['trust:anh_vuong:+8', 'flag:storm_warning', 'quest:anh_vuong_arc:1'], result: 'Bạn ghi nhớ. Hôm sau, trời đổ mưa.' },
      { label: 'Hỏi thêm về giá cá', effects: ['trust:anh_vuong:+5', 'flag:storm_warning', 'quest:anh_vuong_arc:1'], result: 'Anh Vượng kể tỉ mỉ. Bạn hiểu hơn về mùa cá.' },
    ],
  },
  {
    id: 'anh_vuong_2', title: 'Muối ướp cá', kind: 'npc', minDay: 14, once: true, weight: 0,
    speaker: 'Vượng', portrait: npcPortrait('anh_vuong', 'neutral'),
    condition: (s) => s.npcs.anh_vuong?.trust >= 12 && !s.seenEvents.includes('anh_vuong_2'),
    text: 'Anh Vượng cần muối để ướp cá cho chuyến biển dài. "Nếu cậu giúp, tôi trả bằng cá khô."',
    choices: [
      { label: 'Giúp', effects: ['item:salt:-3', 'item:dried_fish:+6', 'trust:anh_vuong:+12', 'quest:anh_vuong_arc:2'], result: 'Anh Vượng nhận muối, hứa sẽ trả.' },
      { label: 'Bán muối, không đổi', effects: ['item:salt:-3', 'money:+15', 'trust:anh_vuong:+4', 'quest:anh_vuong_arc:2'], result: 'Anh Vượng mua, nhưng có vẻ hơi thất vọng.' },
    ],
  },
  {
    id: 'anh_vuong_3', title: 'Món quà của biển', kind: 'npc', minDay: 20, once: true, weight: 0,
    speaker: 'Vượng', portrait: npcPortrait('anh_vuong', 'happy'),
    condition: (s) => s.npcs.anh_vuong?.trust >= 24 && !s.seenEvents.includes('anh_vuong_3'),
    text: 'Anh Vượng đưa bạn một chiếc lồng cá nhỏ, đan bằng tre. "Tôi làm chơi. Cậu giữ làm kỷ niệm."',
    choices: [
      { label: 'Nhận', effects: ['item:basket:+1', 'trust:anh_vuong:+12', 'quest:anh_vuong_arc:3'], result: 'Bạn treo chiếc lồng ở góc kệ. Nó đẹp hơn bạn nghĩ.' },
      { label: 'Nhận, đổi lại ít gạo', effects: ['item:basket:+1', 'item:rice_white:-1', 'trust:anh_vuong:+8', 'quest:anh_vuong_arc:3'], result: 'Anh Vượng nhận gạo, cười toe.' },
    ],
  },
  // Mận
  {
    id: 'co_man_1', title: 'Thuốc cho con', kind: 'npc', minDay: 5, once: true, weight: 0,
    speaker: 'Mận', portrait: npcPortrait('co_man', 'sad'),
    condition: (s) => s.npcs.co_man?.trust >= 0,
    text: 'Mận bồng đứa con, đứng ngoài quầy. "Nó sốt hai ngày rồi. Anh chị có thuốc nào không? Em... không có tiền."',
    choices: [
      { label: 'Tặng thuốc', effects: ['item:medicine_bottle:-1', 'trust:co_man:+18', 'community:+8', 'rep:+4', 'quest:co_man_arc:1'], result: 'Mận nhận thuốc, mắt đỏ lên. Đứa nhỏ ngủ thiếp trên vai mẹ.' },
      { label: 'Bán chịu', effects: ['item:medicine_bottle:-1', 'credit:co_man:18', 'trust:co_man:+10', 'quest:co_man_arc:1'], result: 'Mận hứa sẽ trả. Bạn ghi vào sổ.' },
      { label: 'Từ chối', effects: ['trust:co_man:-14', 'rep:-5', 'community:-5', 'quest:co_man_arc:1'], result: 'Mận quay đi. Đứa nhỏ khóc. Bạn nghe thấy tiếng khóc suốt buổi chiều.' },
    ],
  },
  {
    id: 'co_man_2', title: 'Tin chồng', kind: 'npc', minDay: 11, once: true, weight: 0,
    speaker: 'Mận', portrait: npcPortrait('co_man', 'neutral'),
    condition: (s) => s.npcs.co_man?.trust >= 14 && !s.seenEvents.includes('co_man_2'),
    text: 'Mận hỏi bạn có nghe tin gì về những người đi phu không. "Chồng em đi gần một năm rồi."',
    choices: [
      { label: 'Chia sẻ những gì bạn nghe', effects: ['trust:co_man:+10', 'quest:co_man_arc:2'], result: 'Mận lắng nghe, rồi gật đầu. "Cảm ơn anh chị đã nói thật."' },
      { label: 'An ủi, không nói cụ thể', effects: ['trust:co_man:+5', 'quest:co_man_arc:2'], result: 'Mận cảm ơn, nhưng bạn thấy cô vẫn lo.' },
    ],
  },
  {
    id: 'co_man_3', title: 'Chuối chín', kind: 'npc', minDay: 17, once: true, weight: 0,
    speaker: 'Mận', portrait: npcPortrait('co_man', 'happy'),
    condition: (s) => s.npcs.co_man?.trust >= 22 && !s.seenEvents.includes('co_man_3'),
    text: 'Mận mang đến một nải chuối chín. "Nhà còn ít, em đem lên. Con em đã khỏe lại rồi."',
    choices: [
      { label: 'Nhận và tặng lại ít gạo', effects: ['item:banana:+3', 'item:rice_white:-1', 'trust:co_man:+12', 'quest:co_man_arc:3'], result: 'Mận cười. Lần đầu bạn thấy cô cười thật.' },
      { label: 'Nhận', effects: ['item:banana:+3', 'trust:co_man:+6', 'quest:co_man_arc:3'], result: 'Chuối chín ngọt. Bạn chia cho mấy đứa trẻ hàng xóm.' },
    ],
  },
];

// ------------------------------------------------------------------ random --
const RANDOM: EventDef[] = [
  {
    id: 'rnd_price_spike', title: 'Gạo lên giá', kind: 'world', weight: 10, once: false,
    condition: (s) => s.player.day >= 3,
    text: 'Tin từ chợ: một tuyến vận chuyển bị đứt, gạo ở tỉnh lẻ khan hàng. Giá gạo đang tăng nhanh.',
    choices: [
      { label: 'Mua thêm gạo ngay', hint: 'Tốn tiền, có hàng bán.', effects: ['money:-30', 'item:rice_white:+6', 'price:rice_white:+0.25'], result: 'Bạn mua được sáu đơn vị gạo trước khi giá tăng nữa.' },
      { label: 'Đứng ngoài cuộc', effects: ['price:rice_white:+0.35'], result: 'Bạn không mua. Giá gạo tăng, khách đến hỏi nhiều hơn.' },
    ],
  },
  {
    id: 'rnd_rain', title: 'Mưa lớn', kind: 'world', weight: 12, once: false,
    condition: (s) => s.player.day >= 4,
    text: 'Mưa lớn suốt đêm. Đường vào thị trấn lầy lội, vài chuyến hàng bị kẹt lại.',
    choices: [
      { label: 'Chuẩn bị trước', effects: ['weather:mua_to:1', 'flag:rain_ready'], result: 'Bạn che chắn kho, kê cao hàng. Hôm sau, tiệm vẫn khô ráo.' },
      { label: 'Không làm gì', effects: ['weather:mua_to:1', 'spoil:+2'], result: 'Một ít hàng bị ẩm. Bạn phải bỏ đi.' },
    ],
  },
  {
    id: 'rnd_good_harvest', title: 'Mùa khoai được', kind: 'world', weight: 8, once: false,
    condition: (s) => s.player.day >= 5,
    text: 'Khoai lang và ngô được mùa ở ngoại ô. Người ta đem ra chợ bán rẻ.',
    choices: [
      { label: 'Mua vào', effects: ['money:-12', 'item:sweet_potato:+8', 'item:corn:+6'], result: 'Bạn mua được nhiều khoai, ngô với giá rẻ.' },
      { label: 'Bỏ qua', effects: ['price:sweet_potato:-0.2'], result: 'Giá khoai giảm. Bạn không mua.' },
    ],
  },
  {
    id: 'rnd_debt_return', title: 'Người trả nợ', kind: 'world', weight: 9, once: false,
    condition: (s) => s.debts.some((d) => d.kind === 'lent' && d.status === 'active'),
    text: 'Một người quen gõ cửa, đem theo ít tiền trả một phần nợ cũ.',
    choices: [
      { label: 'Nhận tiền', effects: ['debt:collect:12'], result: 'Bạn nhận tiền, gạch một khoản trong sổ.' },
      { label: 'Xóa nợ cho họ', effects: ['debt:forgive', 'community:+8', 'rep:+3'], result: 'Bạn xóa khoản nợ. Người đó đứng lặng, rồi cúi đầu.' },
    ],
  },
  {
    id: 'rnd_rare_item', title: 'Món đồ cũ', kind: 'world', weight: 7, once: false,
    condition: (s) => s.player.day >= 8,
    text: 'Một người đàn ông lạ mang đến một chiếc đồng hồ cơ cũ, hỏi bạn có mua không.',
    choices: [
      { label: 'Mua', effects: ['money:-40', 'item:pocket_watch:+1'], result: 'Chiếc đồng hồ chạy tốt. Bạn cất vào tủ kính.' },
      { label: 'Từ chối', effects: [], result: 'Ông ta gật đầu, mang món đồ đi tiếp.' },
    ],
  },
  {
    id: 'rnd_big_order', title: 'Đơn hàng lớn', kind: 'world', weight: 8, once: false,
    condition: (s) => s.player.day >= 6 && s.player.reputation >= 15,
    text: 'Một quán ăn trong thị trấn muốn đặt một lượng gạo và muối lớn cho mấy ngày tới.',
    choices: [
      { label: 'Nhận đơn', effects: ['money:+45', 'item:rice_white:-6', 'item:salt:-3', 'rep:+4'], result: 'Bạn giao hàng đúng hẹn. Quán ăn hài lòng.' },
      { label: 'Từ chối vì thiếu hàng', effects: ['rep:-2'], result: 'Bạn nói thật là không đủ hàng. Họ gật đầu.' },
    ],
  },
  {
    id: 'rnd_sick_neighbor', title: 'Người ốm', kind: 'world', weight: 8, once: false,
    condition: (s) => s.player.day >= 7,
    text: 'Một gia đình trong xóm có người sốt. Họ đến hỏi mua thuốc, nhưng tiền không đủ.',
    choices: [
      { label: 'Giúp', effects: ['item:medicine_bottle:-1', 'community:+8', 'trust:ba_cuc:+6'], result: 'Bạn đưa thuốc. Họ hứa sẽ trả sau.' },
      { label: 'Bán chịu', effects: ['item:medicine_bottle:-1', 'credit:ba_cuc:20', 'community:+4'], result: 'Bạn ghi sổ. Họ cảm ơn.' },
    ],
  },
  {
    id: 'rnd_market_gossip', title: 'Tin đồn ở chợ', kind: 'world', weight: 10, once: false,
    condition: (s) => s.player.day >= 3,
    text: 'Ở quán nước, người ta bàn tán về việc một đoàn hàng sẽ về thị trấn vào ngày mai.',
    choices: [
      { label: 'Chuẩn bị tiền mua hàng', effects: ['flag:caravan_tomorrow', 'money:-0'], result: 'Bạn để dành một ít tiền, chờ ngày mai.' },
      { label: 'Không tin', effects: [], result: 'Bạn bỏ qua. Biết đâu chỉ là đồn.' },
    ],
  },
  {
    id: 'rnd_child_steal', title: 'Thằng bé và món hàng', kind: 'world', weight: 6, once: false,
    condition: (s) => s.player.day >= 6,
    text: 'Bạn bắt gặp một đứa trẻ lén lấy một quả chuối trên kệ. Nó run rẩy, mắt mở to.',
    choices: [
      { label: 'Để nó lấy đi', effects: ['item:banana:-1', 'community:+5', 'rep:+2'], result: 'Đứa trẻ chạy mất. Hôm sau, nó để lại trước cửa một bó rau dại.' },
      { label: 'Bắt trả lại', effects: ['rep:-2', 'community:-3'], result: 'Đứa trẻ bỏ chạy. Bạn thấy khó chịu suốt ngày.' },
    ],
  },
  {
    id: 'rnd_supplier_letter', title: 'Thư từ nhà cung cấp', kind: 'world', weight: 7, once: false,
    condition: (s) => s.player.day >= 5,
    text: 'Một lá thư từ người buôn ở tỉnh: họ muốn gửi hàng xuống thị trấn, cần người nhận.',
    choices: [
      { label: 'Nhận làm đầu mối', effects: ['flag:supplier_contact', 'money:+20', 'rep:+3'], result: 'Bạn đồng ý. Đây có thể là một mối hàng lớn.' },
      { label: 'Từ chối', effects: [], result: 'Bạn gửi thư lại. Không phải lúc nào cũng nên nhận.' },
    ],
  },
  {
    id: 'rnd_new_family', title: 'Gia đình mới', kind: 'world', weight: 7, once: false,
    condition: (s) => s.player.day >= 8,
    text: 'Một gia đình từ nơi khác chuyển đến, thuê căn nhà cuối ngõ. Họ không quen ai.',
    choices: [
      { label: 'Đón tiếp, tặng ít gạo', effects: ['item:rice_white:-1', 'community:+8', 'rep:+3', 'flag:new_family'], result: 'Họ cảm ơn. Ngày sau, họ ghé tiệm thường hơn.' },
      { label: 'Chào hỏi qua loa', effects: [], result: 'Bạn gật đầu chào, rồi quay vào công việc.' },
    ],
  },
  {
    id: 'rnd_shortage', title: 'Thiếu muối', kind: 'world', weight: 8, once: false,
    condition: (s) => s.player.day >= 9,
    text: 'Muối đột nhiên khan hiếm ở chợ. Người ta xếp hàng hỏi mua.',
    choices: [
      { label: 'Bán giá thị trường', effects: ['price:salt:+0.3', 'money:+18'], result: 'Bạn bán được nhiều muối, giá cao.' },
      { label: 'Giữ giá cũ', effects: ['price:salt:+0.1', 'rep:+5', 'community:+5'], result: 'Người ta cảm ơn. Bạn bán ít hơn nhưng được nhớ.' },
    ],
  },
  {
    id: 'rnd_rain_delay', title: 'Chuyến hàng bị trễ', kind: 'world', weight: 9, once: false,
    condition: (s) => s.deliveries.some((d) => d.status === 'transit'),
    text: 'Người giao hàng đến báo: đường sạt lở, chuyến hàng của bạn sẽ trễ ít nhất một ngày.',
    choices: [
      { label: 'Chờ', effects: ['delivery:delay'], result: 'Bạn gật đầu. Hàng sẽ đến muộn.' },
      { label: 'Thuê người chở đường khác', effects: ['money:-15', 'delivery:expedite'], result: 'Bạn mất thêm tiền, nhưng hàng đến đúng hẹn.' },
    ],
  },
  {
    id: 'rnd_festival', title: 'Ngày lễ ở đình', kind: 'world', weight: 5, once: false,
    condition: (s) => s.player.day >= 10,
    text: 'Làng làm lễ ở đình. Người ta cần đèn dầu, đường và trà để đãi khách.',
    choices: [
      { label: 'Bán cho làng', effects: ['item:tea:-2', 'item:sugar:-2', 'money:+24', 'community:+5'], result: 'Bạn cung cấp cho lễ hội. Người ta nhớ tên tiệm.' },
      { label: 'Tặng một ít', effects: ['item:tea:-1', 'item:sugar:-1', 'community:+10', 'rep:+4'], result: 'Bạn tặng. Làng cảm ơn trước đông người.' },
    ],
  },
  {
    id: 'rnd_rumor_change', title: 'Tin đồn lớn', kind: 'world', weight: 6, once: false,
    condition: (s) => s.player.day >= 12,
    text: 'Người ta nói rằng sắp có những thay đổi lớn. Người thì lo, người thì hy vọng.',
    choices: [
      { label: 'Lắng nghe và chuẩn bị', effects: ['flag:change_coming', 'community:+3'], result: 'Bạn nghe, rồi quay lại công việc. Nhưng có gì đó khác đi.' },
      { label: 'Không quan tâm', effects: [], result: 'Bạn mỉm cười, không nói gì.' },
    ],
  },
  {
    id: 'rnd_thief', title: 'Mất đồ', kind: 'world', weight: 4, once: false,
    condition: (s) => s.player.day >= 8,
    text: 'Sáng ra, bạn thấy một bao hàng nhỏ đã bị xé. Có người đã lẻn vào kho đêm qua.',
    choices: [
      { label: 'Báo với mọi người', effects: ['item:rice_white:-2', 'community:+4', 'flag:theft_reported'], result: 'Hàng xóm giúp bạn canh giữ. Bạn mất ít hơn bạn sợ.' },
      { label: 'Im lặng', effects: ['item:rice_white:-2', 'flag:theft_hidden'], result: 'Bạn không nói gì. Nhưng từ đó, bạn khóa kỹ hơn.' },
    ],
  },
  {
    id: 'rnd_good_news', title: 'Tin vui', kind: 'world', weight: 6, once: false,
    condition: (s) => s.player.communityTrust >= 25,
    text: 'Một người bạn quen báo tin: có người muốn mua một món đồ quý với giá tốt.',
    choices: [
      { label: 'Bán', effects: ['item:antique:-1', 'money:+80'], result: 'Bạn bán được món đồ quý. Lãi lớn.' },
      { label: 'Giữ lại', effects: [], result: 'Bạn quyết định giữ. Biết đâu sau này còn giá trị hơn.' },
    ],
  },
  {
    id: 'rnd_caravan', title: 'Đoàn hàng', kind: 'world', weight: 7, once: false,
    condition: (s) => s.player.day >= 9 && s.story.flags.caravan_tomorrow === true,
    text: 'Đoàn hàng về đến thị trấn. Có nhiều thứ hiếm: vải tốt, thuốc, giấy tờ.',
    choices: [
      { label: 'Mua sắm', effects: ['money:-40', 'item:fine_cloth:+1', 'item:medicine_bottle:+2', 'item:paper:+4'], result: 'Bạn mua được ít hàng quý với giá hợp lý.' },
      { label: 'Chỉ xem', effects: [], result: 'Bạn nhìn người ta mua bán, rồi trở lại tiệm.' },
    ],
  },
];

export const EVENTS: EventDef[] = [...STORY, ...ARC, ...RANDOM];

export function eventById(id: string): EventDef | undefined {
  return EVENTS.find((e) => e.id === id);
}

export const MAIN_STORY_IDS = STORY.map((e) => e.id);
export const ARC_IDS = ARC.map((e) => e.id);
export const RANDOM_IDS = RANDOM.map((e) => e.id);
