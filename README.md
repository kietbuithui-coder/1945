# Cửa Hàng 1945 — *Vietnam 1945*

Một game mô phỏng cửa hàng / sinh tồn / kể chuyện, bối cảnh một thị trấn nhỏ ở miền Bắc Việt Nam, tháng 8 năm 1945.
Bạn thừa kế một tiệm tạp hóa cũ. Hàng khan hiếm, tiền thiếu, và mỗi quyết định — bán chịu, giữ giá, giúp hàng xóm — đều để lại dấu vết.

Đóng gói kèm bộ **asset pixel art 799 file** ( xem `docs/ART_BIBLE.md` và `assets/manifests/ASSET_MANIFEST.json` ).

---

## Chạy game

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + build production
npm run preview    # xem bản build
npm run assets     # regenerate toàn bộ asset (deterministic)
npm run sim        # headless economy simulation 30 ngày
npx tsx tools/dom-test.ts   # DOM/UI smoke test (jsdom)
```

Yêu cầu: Node 20+, trình duyệt hỗ trợ Canvas 2D và WebAudio. Game chạy trên desktop trước,
kiến trúc tách module để mở rộng sang Android/touch.

---

## Điều khiển

| Phím | Tác dụng |
| --- | --- |
| `Space` | Tạm dừng / tiếp tục |
| `1` `2` `3` | Tốc độ thời gian |
| `I` | Kho hàng & kệ |
| `P` | Bảng giá & thị trường |
| `M` | Bản đồ |
| `O` | Mở cửa (buổi sáng) |
| `E` | Đóng cửa, chốt sổ |
| `Esc` | Đóng cửa sổ |
| Chuột / chạm | Kéo thả chồng hàng, bấm nút |

---

## Vòng lặp một ngày (5 pha)

1. **Sáng** — sắp kệ, chỉnh giá, đi chợ/nhà cung cấp, đặt hàng trước.
2. **Mua hàng** — chợ (mua ngay, đắt hơn) hoặc nhà cung cấp (rẻ hơn, có độ trễ, có rủi ro mất hàng).
3. **Mở cửa** — khách ghé theo lịch, chào giá, mặc cả, bán chịu, đổi hàng, từ chối.
4. **Chốt sổ** — báo cáo doanh thu, giá vốn, tiền mua hàng, hư hỏng, nợ.
5. **Chiều tối** — sự kiện ngẫu nhiên hoặc câu chuyện, lựa chọn có hệ quả.

---

## Hệ thống

| Hệ thống | File | Nội dung |
| --- | --- | --- |
| Dữ liệu | `src/game/data.ts`, `src/data/*.json` | 122 vật phẩm, 24 NPC, 9 nhà cung cấp, 8 địa điểm, 10 nâng cấp, 10 nhiệm vụ, 5 chương, 5 kết thúc |
| Thế giới | `src/game/systems.ts` | kinh tế, kho/kệ, khách, công nợ, cung ứng, giao hàng, nhiệm vụ, save/migrate |
| Sự kiện | `src/game/events.ts` | 6 sự kiện chính, 25 arc nhân vật, 17 sự kiện ngẫu nhiên |
| Giao diện | `src/game/ui.ts`, `src/game/panels.ts` | HUD, dock, trade, 12 panel, title/report/event/ending |
| Render | `src/game/scene.ts` | nền pixel, overlay nâng cấp, khách, đèn, bụi, mưa, tint, vignette |
| Điều khiển | `src/game/game.ts` | vòng lặp ngày, sự kiện, save/load, phím tắt |
| Âm thanh | `src/game/audio.ts` | SFX + mưa + nhạc ngũ cung, procedural WebAudio (không cần file ngoài) |

### Các trụ cột liên kết với nhau

- **Thời tiết → vận chuyển → khan hiếm → giá → quyết định của người chơi.**
  Mưa lớn làm Supply giảm, Delivery trễ, demand thực phẩm và dầu đèn tăng.
- **Uy tín + quan hệ + ngày** mới mở được nâng cấp, không phải chỉ cần tiền.
- **Bán chịu** giữ khách nhưng tạo khoản phải thu; đòi nợ đúng hạn tăng uy tín, để quá hạn thì mất.
- **Gia đình** tiêu 2 phần cơm mỗi ngày; thiếu ăn giảm sức khỏe và cộng đồng.
- **Nhân viên** không phải tiền tự động: Mai tự sắp kệ mỗi sáng và kéo thêm 1 khách/ngày.

### Kinh tế

- `fairSell = round(sell × (demand/supply) × (1 + priceFlag))`
- `fairBuy  = round(buy × (demand/supply)^0.65 × (1 + priceFlag×0.6))`
- Cung cầu random-walk **có hồi quy về 1.0** (không lạm phát vô hạn), kẹp 0.42–1.85.
- Nhà cung cấp có tồn kho giới hạn, đặt lại theo chu kỳ; đặt trước rẻ 5% nhưng có thể trễ/mất.
- Khách có ngân sách, kiên nhẫn, độ nhạy giá, tính cách; giá cao quá thì trả giá hoặc bỏ đi.

### Lưu game

`localStorage` với key `vn1945.auto`, `vn1945.slot1..3` (+ `.bak`).
Autosave sau mỗi ngày và khi tải. Lưu đủ: vị trí, kho, kệ, NPC, nợ, giao hàng, nhiệm vụ, cờ truyện, nâng cấp.
`World.migrate` merge bản cũ vào `newGame` nên save cũ vẫn mở được; **không phát lại giao dịch** khi tải.

---

## Kiểm thử

- `npm run sim` — chạy 30 ngày ở 3 độ khó, assert: tiền không âm, không NaN, đến ngày 30,
  giá hợp lý, tồn kho nhà cung cấp có giới hạn, save/load giữ nguyên trạng thái.
  Sim dùng seed cố định (`SIM_SEED`) nên kết quả balances lặp lại y hệt mỗi lần chạy;
  còn kiểm tra thêm hai game cùng seed cho cùng một thế giới.
- `npx tsx tools/dom-test.ts` — boots UI thật bằng jsdom: title → new game → intro → 12 panel →
  kéo thả/tách chồng → mua hàng → phục vụ khách → 6 nút mặc cả → nâng cấp → đi map → kết thúc.
- `npm run build` — `tsc --noEmit` + Vite.

---

## Cấu trúc

```
assets/            799 file pixel art + ASSET_MANIFEST.json
docs/ART_BIBLE.md  art direction, palette, quy tắc pixel
src/game/          types, data, events, systems, ui, panels, scene, game, audio
src/data/          items.json, npcs.json (sinh từ tools/gen)
src/style.css      design system gỗ/giấy cũ
tools/             generator asset, simulation, DOM test
```

## Ghi chú lịch sử

Bối cảnh là hư cấu (thị trấn An Bình), lấy cảm hứng từ nông thôn Bắc Bộ 1945.
Tiền tệ trong game dùng **đồng** theo thang giá tham chiếu của cuối thời thuộc địa;
không có tiền polymer, không có vật dụng hiện đại. Không khai thác nạn đói hay bạo lực để gây sốc.
