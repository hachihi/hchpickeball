# HANDOFF — Multiplayer 2/3/4 người (Pickleball Hachihi)

**Mới nhất: xem `ONLINE_RENDER_REVIEW.md` (rà soát online trên Render, đề xuất, tiến trình, các lỗi đã sửa).**

Cập nhật lần cuối: sau Bước 4 (rà soát toàn bộ chơi chung online). Đọc file này trước khi làm tiếp.

## Trạng thái từng bước

| Bước | Nội dung | Trạng thái |
|---|---|---|
| 1 | Server: module API chung, session token, quyền, ROOM_NOT_FOUND, BOT khi mất kết nối | Xong, có test (`npm test`) |
| 2 | Engine: điều khiển theo slot A1/A2/B1/B2, camera/UI theo đội | Code xong, **chưa chơi thử thật** |
| 3A | Khóa ghế host ở A1 (server từ chối move/switch-team của A1) + lobby ẩn nút đổi đội/kéo thả của host | Xong, có test |
| 3B | Lobby báo rõ khi phòng hết hạn/server restart (404) thay vì im lặng | Code xong, chưa thử trên trình duyệt |
| 3C | Bộ Playwright `e2e/multiplayer.e2e.mjs` | Viết xong, **chưa chạy lần nào** |
| 4A | Sửa lỗi "khách bấm đánh không khớp/không chạy" (xem mục Nguyên nhân bên dưới) | Xong, có test chạy MotionController thật + server thật |
| 4B | Luồng khách: mở link/QR → thẻ vào phòng (xem tóm tắt, nhập tên, bấm BẮT ĐẦU) → phòng chờ gọn (số người, link, chat) | Code xong, chưa xem trên trình duyệt |
| 4C | Cài đặt host đồng bộ cho khách: sân (trước đây chỉ đổi trên máy host), âm thanh (mới), cấp độ bot, tên/màu đội | Xong, có test server |
| 4D | CSS co giãn: lobby/join card theo `dvh`, safe-area, điện thoại dọc/ngang | Code xong, **chưa xem trên thiết bị thật** |
| 3D/5 | Chạy E2E + test tay 2/3/4 người trên thiết bị thật, sửa lỗi phát hiện | **CHƯA LÀM — việc tiếp theo** |

## Nguyên nhân lỗi "khách bấm đánh không khớp / không chạy" (đã sửa)
1. **Ghế của khách bị cũ.** Client chỉ lưu ghế lúc vào phòng. Nếu host đổi đội/di chuyển khách, hoặc khách bị BOT thế rồi vào lại, `localPlayerSlot` sai → swing gửi sai vai/sai actor. Nay `state` trả `mySlot` (theo session) và `match_manager.syncFromServer` cập nhật theo server; poll cuối trước khi bắt đầu cũng được đồng bộ (trước đây bị bỏ qua).
2. **Độ trễ.** Host chỉ nhận swing của khách qua poll 50ms + 2 vòng HTTP. Nay server đẩy swing tức thời qua SSE (`/api/match/events`); poll vẫn là dự phòng.
3. **Đánh trùng.** Khi mạng chậm, poll thấy swing của chính khách trước khi POST trả về → engine cục bộ đánh 2 lần. Nay mỗi swing có `cid`, bỏ qua echo của chính mình (test mô phỏng POST trễ 200ms; bỏ cid thì test fail).
4. **Swing của khách làm host mất cài đặt.** `_handleP2SwingInput` gọi `_applyDifficultyTuning("1v1")` mỗi lần → ghi đè độ khó và đặt số ván thắng = 1 của host. Nay bỏ qua trong phòng online (`_onlineLobby`).
5. **Phím K/Shift phải/Numpad0** đánh cho "P2" cục bộ, không gửi lên host → khách nhấn không có tác dụng. Nay tắt trong phòng online (khách dùng chuột/chạm/webcam/điện thoại).
6. **Link mời vào thẳng phòng** với tên ngẫu nhiên, không có bước nhập tên. Nay đi qua thẻ vào phòng; `joinUrl` của server cũng có `join=lobby`.
7. **Sân host chọn không đến khách** (chỉ gọi `applyScenery` cục bộ). Nay gửi lên server và áp dụng cho mọi người lúc bắt đầu.

## Chạy test
- `npm test` = 5 bộ: luật (51), phòng (13), multiplayer server (55), slot/role + định tuyến engine + nối dây UI (44), truyền swing khách→host bằng MotionController thật (38). Tất cả xanh.
- Chưa chạy: `npm run build`, `npm run lint` (`tsc`). **Chạy hai lệnh này trước khi deploy** (`vite.config.ts` giờ import `server/api.js`).
- E2E trình duyệt (không nằm trong `npm test`):
  ```
  npm i --no-save playwright && npx playwright install chromium
  node server.js &
  BASE_URL=http://localhost:3000 PLAYERS=4 HOLD_SECONDS=70 HEADED=1 node e2e/multiplayer.e2e.mjs
  ```
  Script dùng id trong `index.html` (`#btn-multiplayer-modal`, `#btn-create-multi-room`, `#input-join-room-code`, `#btn-submit-join-room`, `#lobby-room-code-val`, `#btn-tank-start-match`). Lần chạy đầu có thể phải chỉnh selector/thời gian.

## Kiến trúc cần biết
- Production chạy `node server.js`. Toàn bộ API phòng ở `server/api.js` (logic) + `server/http.js` (HTTP). `vite.config.ts` (dev) dùng chung hai file này.
- Host chạy mô phỏng vật lý; khách nhận snapshot qua `/api/match/state`. Mọi máy vẫn tự mô phỏng và bị snapshot host ghi đè ~45ms/lần (chưa phải server-authoritative).
- Nhân vật tự chạy theo bóng; người chơi chỉ điều khiển lúc vung vợt.
- Vai theo slot: A1=p1, B1=p2, A2=p3, B2=p4 (`src/slot_roles.js` và `ROLE_BY_SLOT` trong `server/api.js` phải khớp, có test).
- Khi chỉ có 1 người thật + bot đồng đội, giữ hành vi cũ (người đó đánh thay cả đồng đội theo khoảng cách). Chỉ khi hai người thật cùng đội, hoặc ở ghế A2/B2, swing mới bị gắn cứng vào actor của chính họ.

### Session
- `create` và `slot/join` trả `sessionToken`. Client (`src/session_client.js`) lưu trong `sessionStorage` theo phòng và tự gắn header `X-Session`. Mỗi tab = một người chơi.
- Token không bao giờ nằm trong `state`. `state` trả `mySlot` và `slotOnline`.

### Mã lỗi API
`401 SESSION_REQUIRED`, `403 HOST_ONLY | FORBIDDEN | HOST_SEAT_LOCKED | HOST_ALREADY_SEATED`, `404 ROOM_NOT_FOUND`, `409 ROOM_FULL | NOT_ENOUGH_PLAYERS | ALREADY_STARTED`.

### Luồng khách (Bước 4B)
Link/QR: `/?room=ID&role=p2&join=lobby` → engine gọi `hud.showGuestJoinCard` (GET state, không chiếm ghế) → khách nhập tên, bấm BẮT ĐẦU → `slot/join` → phòng chờ. Link/QR dùng `window.location.origin`: nếu host mở bằng `localhost` thì link không dùng được trên điện thoại — hãy mở bằng URL công khai (Render).

### Cài đặt phòng do host chọn (server giữ)
`scenery`, `sound {music,sfx}`, `botDifficulty`, `teamA/BName`, `teamA/BColor`, `matchType`, `gamesToWin`, `isPublic` qua `POST /api/match/team/update` (chỉ host). Khách nhận qua `state` và áp dụng lúc vào trận (sân + âm lượng nhạc/hiệu ứng; khách vẫn tự tắt âm trên máy mình).

### Biến môi trường
`ROOM_GRACE_MS` (mặc định 45000): guest im lặng quá mức này thì BOT thế chỗ. `ROOM_TTL_MS` (mặc định 4 giờ): dọn phòng bỏ trống. Phòng mặc định `10150` không bao giờ bị dọn.

## Việc tiếp theo — checklist test tay (thiết bị thật)
Mỗi tab một session (hoặc mỗi thiết bị). Làm cho 2, 3 và 4 người:
0. Link/QR: quét QR bằng điện thoại thật → thấy thẻ vào phòng, nhập tên, bấm BẮT ĐẦU → vào phòng chờ có số người, link, chat. Thử cả điện thoại dọc/ngang, màn hình nhỏ.
1. Host tạo phòng, khách vào bằng mã, host bắt đầu. Tên đúng slot. Host đổi sân/âm thanh/bot → khách vào trận thấy đúng sân.
2. Mỗi người vung vợt: đúng nhân vật của mình đánh; hai người cùng đội không đánh thay nhau.
3. Camera: khách ở A2 nhìn từ phía đội A; B1/B2 nhìn từ phía đội B; màn hình thắng/thua đúng đội.
4. Giao bóng: A2/B2 không giao thay. Thử A1 là BOT mà người thật ở A2 (chưa rõ bot có giao hay kẹt).
5. Để trận chạy >60 giây: không ai bị đổi thành BOT. Nếu có, tăng `ROOM_GRACE_MS` hoặc kiểm tra khách có đang poll `/api/match/state` trong trận.
6. Tải lại tab giữa trận: về đúng slot.
7. Vào mã phòng sai / để phòng hết hạn: có thông báo rõ.
8. Độ trễ: có giật khi vung vợt không (snapshot ghi đè).

## Hạn chế đã biết (chưa sửa)
- SSE cần proxy không đệm (Render ổn). Nếu qua proxy khác bị đệm, poll 50ms vẫn dùng được nhưng trễ hơn. Mỗi máy poll `/api/match/state` mỗi 50ms; với nhiều phòng nên giảm tần suất/thu nhỏ payload.
- Phòng chỉ lưu trong RAM: Render free ngủ/restart là mất hết phòng. Trong trận, khách bị 404 cũng chưa có thông báo (chỉ lobby có).
- Host luôn là A1 (đã khóa ở server). Chưa hỗ trợ host chơi đội B.
- Giao bóng luôn do actor A1/B1 (engine), kể cả khi người thật ở ghế 2.
- Chưa phải server-authoritative; nếu 3D thấy lệch nhiều thì hướng tiếp là server giữ trạng thái + WebSocket.
- `playerRole` trong engine nghĩa là "host (p1) hay khách (p2)"; đội đang xem là `viewTeam`, slot là `localSlot`, vai là `controlRole`. Đừng dùng `playerRole` để suy ra đội.

## Bản đồ file
- Server: `server/api.js`, `server/http.js`, `server.js`, `vite.config.ts`
- Client: `src/session_client.js`, `src/slot_roles.js`, `src/game_engine.js` (minified, vá bằng chuỗi), `src/motion_controls.js`, `src/hud_ui.js`, `src/stadium_life.js`
- Test: `scripts/test_room_sync.mjs`, `scripts/test_multiplayer.mjs`, `scripts/test_slot_roles.mjs`, `e2e/multiplayer.e2e.mjs`
- `scripts/patch_step2.py`: script đã dùng để vá engine (tham khảo, không chạy lại — các anchor đã đổi)

## Ghi chú sửa `game_engine.js`
File này là bản minified một dòng. Sửa bằng cách thay chuỗi chính xác (xem `scripts/patch_step2.py` để biết các chỗ đã vá) và luôn chạy `node --check src/game_engine.js` + `npm test` sau khi sửa.
