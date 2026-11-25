# Cửa Hàng 1945

Một game quản lý tiệm / sinh tồn / tự sự lấy bối cảnh một thị trấn đồng bằng sông hư cấu ở miền Bắc Việt Nam, tháng Tám năm 1945. Bạn thừa hưởng một quầy gỗ, vài kệ hàng, ít vốn và cuốn sổ nợ của ông chủ cũ. Mỗi ngày là một chuỗi lựa chọn có hệ quả: nhập gì, xếp gì lên kệ, đưa giá ai, giúp ai, giữ chữ tín hay giữ tiền.

> Chỉ mượn **cảm giác** đứng quầy, cầm vật phẩm, xếp kho và bầu không khí giao dịch; không sao chép nội dung, hình ảnh hay cơ chế độc quyền của bất kỳ game nào khác. Toàn bộ đồ hoạ là **Vietnam 1945 Game Asset Pack** có sẵn trong repo.

## Chơi

```bash
npm install
npm run dev
```

Mở preview do Arena cung cấp (Vite bind `0.0.0.0:5173`). PC dùng chuột; màn cảm ứng dùng kéo/chạm tương tự. Khung game 1280×720 được scale nguyên vẹn, pixel art giữ `image-rendering: pixelated`.

Một ngày gồm 5 pha, có nút đi tiếp rõ ràng:

1. **Sáng** — đọc tin, thời tiết, sổ nợ.
2. **Nhập hàng** — đặt từ 8 mối hàng; tồn kho có hạn, chuyến có hẹn và có rủi ro.
3. **Mở cửa** — khách xếp hàng thật, kiên nhẫn thật; kéo hàng lên khay, kiểm phẩm chất, đưa giá, mặc cả / đổi hàng / ghi sổ / tặng kèm, rồi **xác nhận** mới trừ hàng và cộng tiền.
4. **Chốt sổ** — doanh thu, chi phí, hư hỏng, uy tín, lòng tin xóm.
5. **Tối** — nhiệm vụ nhiều ngày hoặc sự kiện có điều kiện; quyết định ghi vào nhật ký và ảnh hưởng ngày mai.

30 ngày · 5 chương · 3 độ khó · 26 NPC (9 chuỗi riêng) · 13 nhiệm vụ · 20 sự kiện · 10 nâng cấp · 4 nhân viên · 8 địa điểm · 5 kết thúc.

### Tiền tệ

Game dùng **đồng bạc Đông Dương / piastre**, ký hiệu `đ`, và **xu / cent**: một đồng = 100 xu. Không có tiền VN hiện đại, thẻ, chuyển khoản hay thiết bị điện tử.

### Điều khiển

| | |
|---|---|
| Kéo thả / chạm | Chuyển hàng giữa kho ↔ kệ ↔ khay quầy |
| Chuột phải | Tách đôi chồng hàng |
| `Space` | Tạm dừng |
| `1` `2` `3` | Tốc độ |
| `I` `B` `L` `M` `J` `U` `S` `H` | Kho, nhập hàng, sổ, bản đồ, nhật ký, nâng cấp, lưu, trợ giúp |
| `O` / `E` | Mở cửa / chốt sổ (theo đúng pha) |
| `Enter` / `Esc` | Xác nhận / đóng bảng |

## Âm thanh & nhạc nền

Nhạc ngũ cung, tiếng gỗ, tiền xu, cân hàng, cửa, mưa… được **tổng hợp trực tiếp bằng WebAudio**, không tải file ngoài, hoạt động offline. Trình duyệt chặn autoplay nên `pointerdown` / `keydown` đầu tiên sẽ mở khoá `AudioContext`; sau đó nhạc nền chạy liên tục, tiếng mưa bật theo thời tiết. Có nút **Âm thanh** và thanh **Âm lượng** trong Cài đặt; tắt tiếng dừng cả nhạc lẫn mưa.

## Lưu trữ

`auto`, `slot1`, `slot2`, `slot3`; tự động lưu đầu ngày, sau giao dịch, khi ẩn tab / đóng trang. Mỗi ô có `.bak`, JSON hỏng không làm crash, save cũ được migrate lên `SAVE_VERSION = 3`. Khi tải, khách đang dở được đưa về trạng thái chờ: **không phát lại giao dịch đã chốt**.

## Kiến trúc

```
index.html · src/main.ts · src/style.css
src/game/
  types.ts       hợp đồng dữ liệu dùng chung
  data.ts        vật phẩm, NPC, mối hàng, bản đồ, quest/event, asset URL
  state.ts       thế giới, RNG, SaveManager
  inventory.ts   grid, kéo thả, gộp/tách/sắp, hư hỏng
  economy.ts     cung cầu, thời tiết, nhập hàng, chuyến, nợ, chi phí
  people.ts      lịch khách, nhu cầu, kiên nhẫn, quan hệ
  trade.ts       khay, kiểm hàng, đưa giá, chiến thuật, chốt sổ
  story.ts       effect DSL, điều kiện, quest/event, chương, kết thúc
  progression.ts cấp tiệm, nâng cấp, nhân viên, đi lại
  audio.ts       WebAudio: nhạc, sfx, mưa
  scene.ts       nền pixel, thời tiết, khách, nâng cấp nhìn thấy
  ui.ts          HUD, dock, quầy, panel, modal, drag/drop
  game.ts        vòng pha, action, phím tắt, lifecycle
vite.config.ts  dev middleware + build copy cho /assets
tools/          asset integrity, 30-day sim, jsdom acceptance test
```

Asset pack nằm ở `assets/` (799 file). Vite phục vụ `/assets/*` lúc dev và copy nguyên cây vào `dist/assets` lúc build, nên `./assets/...` hoạt động cả preview lẫn deploy tĩnh, không nhân bản file trong Git.

## Kiểm thử

```bash
npm run typecheck
npm run assets:check   # 474 URL ảnh + tính toàn vẹn DSL / dữ liệu
npm run sim            # 30 ngày × 3 độ khó + unit test hệ thống
npm run dom-test       # jsdom: boot, audio, drag/drop, trade, save, mọi nút
npm run build
npm test               # tất cả phía trên (trừ build)
```

`npm test` kiểm cả tiền vào két đúng số, NPC phản ứng, hàng rời kệ, hư hỏng, chuyến giao, quest/event, nâng cấp đổi khung cảnh, save/load không replay và không có nút giả.

## Giới hạn thiết kế

Không idle clicker, không bắn súng / chiến tranh, không tiền hay hàng vô cực, không NPC chỉ để trang trí, không thanh stat rườm rà, không giật gân hay thương mại hoá nạn đói, không đồ vật hiện đại. Mỗi vật phẩm, mỗi nút và mỗi ngày đều có tác dụng thật.
