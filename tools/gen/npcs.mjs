// The people of Thị trấn An Bình, 1945.
// Visual specs + identities shared by the asset pipeline and the game.
export const NPCS = [
  {
    id: 'player', name: 'Bạn', age: 26, role: 'Chủ tiệm', bio: 'Người thừa kế tiệm tạp hóa cũ của gia đình.',
    p: { skin: '#d19b6c', hairStyle: 'short', hairColor: '#241a14', clothing: 'ao_canh', shirt: '#7b5a3e', pants: '#2f2a24', sandals: '#5a3d24', build: 'normal' },
  },
  {
    id: 'ba_tu', name: 'Trần Thị Tư', age: 42, role: 'Người mẹ nghèo', bio: 'Chồng mất sớm, một mình nuôi ba con trong căn nhà tranh cuối xóm.',
    p: { skin: '#b0784b', hairStyle: 'headscarf', hairColor: '#3a2a22', scarfColor: '#6a5a44', clothing: 'blouse', shirt: '#8a7a62', apron: '#b9a98c', pants: '#3a3228', build: 'slim', age: 'adult', accessory: 'basket' },
  },
  {
    id: 'ong_nam', name: 'Nguyễn Văn Năm', age: 58, role: 'Nông dân', bio: 'Ruộng thấp, lúa mất mùa, vẫn đem gạo còn lại ra chợ bán.',
    p: { skin: '#8d5a36', hairStyle: 'short', hairColor: '#8d8578', clothing: 'rag', shirt: '#7a6a4e', pants: '#4a3a28', sandals: '#5a3d24', build: 'normal', age: 'old', mustache: true, hat: 'conical', accessory: 'basket' },
  },
  {
    id: 'chi_lan', name: 'Phạm Thị Lan', age: 29, role: 'Người bán rau', bio: 'Gánh rau từ vườn nhà vào chợ mỗi sáng, tay chẳng khi nào rảnh.',
    p: { skin: '#d19b6c', hairStyle: 'bun', hairColor: '#241a14', clothing: 'blouse', shirt: '#6f7f47', apron: '#c9b083', pants: '#3a3228', build: 'slim', hat: 'conical', accessory: 'basket' },
  },
  {
    id: 'anh_khoi', name: 'Lê Văn Khởi', age: 34, role: 'Người kéo xe', bio: 'Kéo xe đưa khách từ bến sông lên chợ, đôi chân chai sạn.',
    p: { skin: '#b0784b', hairStyle: 'short', hairColor: '#241a14', clothing: 'ao_canh', shirt: '#5a6a5a', pants: '#2f2a24', sandals: '#4a3524', build: 'stout', scarf: true, scarfColor: '#c9b083', accessory: 'towel' },
  },
  {
    id: 'co_hoa', name: 'Trần Thị Hoa', age: 24, role: 'Người bán cá', bio: 'Con gái nhà anh Vượng, đem cá tươi ra chợ bán giùm cha.',
    p: { skin: '#d19b6c', hairStyle: 'headscarf', hairColor: '#241a14', scarfColor: '#4a5a6a', clothing: 'blouse', shirt: '#6a7a8a', apron: '#9aa3a3', pants: '#3a3228', build: 'slim', accessory: 'fish' },
  },
  {
    id: 'ong_to', name: 'Phạm Văn Tô', age: 51, role: 'Thợ mộc', bio: 'Thợ mộc giỏi nhưng không còn tiền mua gỗ, đứa con nhỏ đang ốm.',
    p: { skin: '#b0784b', hairStyle: 'short', hairColor: '#6b5a44', clothing: 'ao_ba_ba', shirt: '#7b5a3e', pants: '#2f2a24', build: 'normal', age: 'adult', beard: true, beardColor: '#3a2a1e', accessory: 'bag' },
  },
  {
    id: 'ba_cuc', name: 'Bà Cúc', age: 67, role: 'Người già', bio: 'Ở một mình, ngày nào cũng ghé tiệm mua ít muối và thuốc.',
    p: { skin: '#b0784b', hairStyle: 'bun', hairColor: '#d8d0bd', clothing: 'blouse', shirt: '#4a4038', apron: '#8a7a62', pants: '#2f2a24', build: 'slim', age: 'old', accessory: 'cane' },
  },
  {
    id: 'anh_phuc', name: 'Đoàn Văn Phúc', age: 28, role: 'Người khuân vác', bio: 'Vai rộng, sức khỏe, gánh được hai bao gạo một lúc.',
    p: { skin: '#8d5a36', hairStyle: 'short', hairColor: '#241a14', clothing: 'rag', shirt: '#6a5a44', pants: '#3a3228', build: 'stout', accessory: 'pole' },
  },
  {
    id: 'co_diep', name: 'Điệp', age: 31, role: 'Người buôn nhỏ', bio: 'Đi chợ này chợ nọ, mua bán từng món nhỏ, belonged nowhere.',
    p: { skin: '#d19b6c', hairStyle: 'braid', hairColor: '#241a14', clothing: 'tu_than', shirt: '#5a4a3a', pants: '#2f2a24', sash: '#b9a98c', build: 'slim', scarf: true, scarfColor: '#3a4a58', accessory: 'bag' },
  },
  {
    id: 'ong_giao_minh', name: 'Giáo Minh', age: 45, role: 'Người trí thức', bio: 'Thầy giáo trường làng, hay nghĩ về những thay đổi sắp đến.',
    p: { skin: '#d19b6c', hairStyle: 'short', hairColor: '#241a14', clothing: 'vest', shirt: '#d8c9a8', vest: '#4a3a2c', pants: '#3a3228', build: 'slim', glasses: true, accessory: 'book' },
  },
  {
    id: 'ba_hau', name: 'Bà Hậu', age: 50, role: 'Nhà buôn vải', bio: 'Cửa hiệu vải lớn nhất chợ, tính tình sắc sảo, ít khi nhượng bộ.',
    p: { skin: '#e9b98f', hairStyle: 'bun', hairColor: '#241a14', clothing: 'tu_than', shirt: '#6a3a4a', pants: '#2f2a24', sash: '#d9a441', build: 'normal', age: 'adult', accessory: 'bag' },
  },
  {
    id: 'anh_vuong', name: 'Vượng', age: 37, role: 'Người đánh cá', bio: 'Sống trên thuyền, nhìn nước biết ngày mưa hay nắng.',
    p: { skin: '#b0784b', hairStyle: 'short', hairColor: '#241a14', clothing: 'rag', shirt: '#5a6a6a', pants: '#3a3228', build: 'normal', hat: 'conical', accessory: 'fish' },
  },
  {
    id: 'co_man', name: 'Mận', age: 26, role: 'Người mẹ trẻ', bio: 'Chồng đi phu, ở nhà với đứa con chưa đầy tuổi.',
    p: { skin: '#e9b98f', hairStyle: 'bun', hairColor: '#241a14', clothing: 'blouse', shirt: '#7a6a8a', apron: '#c9b083', pants: '#3a3228', build: 'slim', accessory: 'basket' },
  },
  {
    id: 'bac_hung', name: 'Hùng', age: 44, role: 'Thợ rèn', bio: 'Thợ rèn lò bên bến sông, tay đen sạm than.',
    p: { skin: '#8d5a36', hairStyle: 'short', hairColor: '#241a14', clothing: 'ao_canh', shirt: '#5a5a52', pants: '#2f2a24', build: 'stout', beard: true, beardColor: '#241a14', apron: '#6a5a44' },
  },
  {
    id: 'chi_sen', name: 'Sen', age: 35, role: 'Người bán chè', bio: 'Quán chè nhỏ bên chợ, ai buồn cũng ra đó ngồi.',
    p: { skin: '#d19b6c', hairStyle: 'bun', hairColor: '#241a14', clothing: 'blouse', shirt: '#8a6a44', apron: '#c9b083', pants: '#3a3228', build: 'normal', accessory: 'basket' },
  },
  {
    id: 'ong_ca', name: 'Ông Cả', age: 62, role: 'Chủ chợ', bio: 'Người giữ trật tự phiên chợ, biết mọi tin tức buôn bán.',
    p: { skin: '#b0784b', hairStyle: 'topknot', hairColor: '#8d8578', clothing: 'coat', shirt: '#4a3a2c', pants: '#2f2a24', build: 'normal', age: 'old', mustache: true, beardColor: '#8d8578' },
  },
  {
    id: 'co_tuyet', name: 'Tuyết', age: 27, role: 'Người bán thuốc', bio: 'Con gái nhà thuốc bắc, biết vài bài thuốc nam.',
    p: { skin: '#e9b98f', hairStyle: 'braid', hairColor: '#241a14', clothing: 'blouse', shirt: '#d8c9a8', apron: '#8a6a44', pants: '#3a3228', build: 'slim', accessory: 'bag' },
  },
  {
    id: 'anh_tam', name: 'Tâm', age: 30, role: 'Người giao hàng', bio: 'Đi đường xa, đem thư và hàng hóa giữa các vùng.',
    p: { skin: '#b0784b', hairStyle: 'short', hairColor: '#241a14', clothing: 'ao_canh', shirt: '#6a5a44', pants: '#2f2a24', build: 'normal', hat: 'conical', accessory: 'bag' },
  },
  {
    id: 'ba_giao', name: 'Bà Giáo', age: 41, role: 'Vợ người trí thức', bio: 'Lo việc nhà, hay sang tiệm hỏi tin tức ngoài kia.',
    p: { skin: '#e9b98f', hairStyle: 'bun', hairColor: '#241a14', clothing: 'tu_than', shirt: '#7a5a6a', pants: '#3a3228', sash: '#c9b083', build: 'slim', glasses: true },
  },
  {
    id: 'cau_ti', name: 'Tí', age: 9, role: 'Trẻ em', bio: 'Thằng bé chạy vặt chợ, mắt tinh như sóc.',
    p: { skin: '#d19b6c', hairStyle: 'short', hairColor: '#241a14', clothing: 'rag', shirt: '#8a7a62', pants: '#4a3a28', build: 'slim', headW: 15, headH: 15, height: 'child' },
  },
  {
    id: 'ong_chin', name: 'Ông Chín', age: 55, role: 'Người buôn hàng hiếm', bio: 'Ít khi lộ diện, nhưng hễ có hàng hiếm là lại thấy ông.',
    p: { skin: '#b0784b', hairStyle: 'short', hairColor: '#6b5a44', clothing: 'coat', shirt: '#3a4a58', pants: '#2f2a24', build: 'normal', age: 'old', mustache: true, beardColor: '#6b5a44', hat: 'conical', accessory: 'pipe' },
  },
  {
    id: 'ba_tam', name: 'Bà Tám', age: 56, role: 'Người bán thuốc bắc', bio: 'Nhà thuốc bắc bốn đời, biết tên từng vị thuốc.',
    p: { skin: '#b0784b', hairStyle: 'bun', hairColor: '#6b5a44', clothing: 'blouse', shirt: '#6a5a44', apron: '#c9b083', pants: '#2f2a24', build: 'normal', age: 'old', accessory: 'bag' },
  },
  {
    id: 'co_mai', name: 'Mai', age: 20, role: 'Người phụ giúp', bio: 'Cô gái láng giềng, chịu khó, mong được học việc.',
    p: { skin: '#e9b98f', hairStyle: 'braid', hairColor: '#241a14', clothing: 'blouse', shirt: '#7a8a6a', apron: '#c9b083', pants: '#3a3228', build: 'slim', accessory: 'basket' },
  },
];

// A few ambient villagers used for crowd silhouettes in backgrounds.
export const CROWD = [
  { id: 'villager_a', name: 'Người làng A', age: 40, role: 'Người qua đường', bio: '', p: { skin: '#b0784b', hairStyle: 'short', hairColor: '#241a14', clothing: 'rag', shirt: '#6a5a44', pants: '#3a3228', build: 'normal' } },
  { id: 'villager_b', name: 'Người làng B', age: 35, role: 'Người qua đường', bio: '', p: { skin: '#d19b6c', hairStyle: 'bun', hairColor: '#241a14', clothing: 'blouse', shirt: '#7a6a52', apron: '#b9a98c', pants: '#3a3228', build: 'slim' } },
  { id: 'villager_c', name: 'Người làng C', age: 50, role: 'Người qua đường', bio: '', p: { skin: '#8d5a36', hairStyle: 'short', hairColor: '#241a14', clothing: 'ao_ba_ba', shirt: '#5a4a3a', pants: '#2f2a24', build: 'stout', hat: 'conical' } },
];
