# Rà soát chơi online nhiều người trên Render — đề xuất & tiến trình

Ngày: 2026-11-09 · Phạm vi: chế độ Online (2–4 người thật, có thể kèm BOT) chạy trên Render Web Service.
Bỏ ngoài phạm vi theo yêu cầu: LAN. Offline chỉ nhắc khi liên quan.

## 1. Kết luận ngắn

Luồng online **chạy được** (tạo phòng, vào phòng, bắt đầu, giữ ghế, tải lại tab). Các lỗ hổng chính nằm ở những việc xảy ra *riêng trên Render*: server ngủ/khởi động lại làm mất phòng mà người chơi không được báo, mất mạng giữa trận không có thông báo, bất kỳ ai biết mã phòng đều "đánh hộ" được người khác, và gói free rất yếu so với tần suất polling hiện tại. Các mục an toàn/độ bền đã sửa trong lần này; phần còn lại là việc kiến trúc lớn (WebSocket, server giữ tỉ số, Supabase) ghi ở mục 5.

## 2. Phương pháp đo

| Việc | Cách làm | Kết quả |
|---|---|---|
| Test tự động | `npm test` (5 bộ) trước và sau sửa | 51 + 13 + 64 + 44 + 38, đều xanh |
| Kiểu/biên dịch | `tsc --noEmit`, `vite build` | qua |
| Tải máy chủ | `load.mjs`: mỗi phòng 1 host sync 22 lần/s + 3 khách poll 20 lần/s, 8 giây, server thật | 1 phòng ≈ 81 req/s, ≈3,5% một lõi CPU, p95 3 ms. 5 phòng ≈ 405 req/s, ≈10% một lõi |
| Trình duyệt thật | Playwright, 2 người: tạo phòng, vào phòng, bắt đầu, giữ 20 s, tải lại tab khách | đạt (giữ ghế A2) |
| Trình duyệt, sự cố | `e2e/connection.e2e.mjs`: host im, server tắt, server khởi động lại | đạt 7/7 sau sửa (trước sửa: không có thông báo gì) |

Không đo được: độ trễ qua mạng thật tới Render (không ra Internet từ môi trường này), 3–4 trình duyệt cùng lúc (máy kiểm thử render WebGL bằng CPU nên quá nặng), điện thoại thật.

## 3. Phát hiện và trạng thái

Mức độ: **Cao** = hỏng trận hoặc gian lận được; **TB** = trải nghiệm xấu/rủi ro vận hành; **Thấp** = nên làm.

| ID | Mức | Phát hiện | Trạng thái |
|---|---|---|---|
| R-01 | Cao | Server Render ngủ (free, ~15 phút rảnh) hoặc deploy lại → phòng nằm trong RAM mất hết. Giữa trận client nhận 404 nhưng **bỏ qua**, màn hình đứng im. | **Đã sửa**: banner "Phòng không còn tồn tại" + nút Về menu (`src/session_client.js`). Phòng vẫn mất (xem R-12) |
| R-02 | Cao | Mất mạng/server không phản hồi giữa trận: mọi `fetch` bị nuốt lỗi (`catch{}`), không thông báo, không tự báo trạng thái | **Đã sửa**: sau 3 giây lỗi liên tục hiện "Mất kết nối… đang tự thử lại", tự ẩn khi có mạng lại |
| R-03 | Cao | `/api/racket/swing`, `telemetry`, `feedback` **không cần session**: ai biết mã phòng 5 số đều gửi cú đánh cho bất kỳ vai p1–p4 | **Đã sửa**: bắt buộc là người trong phòng, vai luôn lấy theo *ghế của người gửi* (khách giả vai p1 bị ghi vào ghế của chính họ). Có test. Phòng mặc định 10150 giữ hành vi cũ |
| R-04 | TB | Host im (đóng tab, khóa màn hình, chuyển tab) → khách đứng hình, không biết vì sao | **Đã sửa**: server trả `hostOnline`; khách thấy "Chủ phòng đang mất kết nối — chờ quay lại" |
| R-05 | TB | `setInterval` poll 50 ms **không có chống chồng** — server chậm thì request dồn lại, càng chậm càng dồn | **Đã sửa**: dùng chung request đang chờ cho cùng URL state |
| R-06 | TB | Tạo phòng không giới hạn → một vòng lặp gọi `create` đủ làm đầy RAM/CPU gói free | **Đã sửa**: tối đa 12 phòng/phút/IP (nhìn `X-Forwarded-For` của Render), `MAX_ROOMS=300` (trả 503 `SERVER_BUSY`) |
| R-07 | TB | SSE không giới hạn số kết nối/phòng | **Đã sửa**: tối đa 16 luồng/phòng (429) |
| R-08 | TB | File tĩnh thiếu: `index.html` trả cho **mọi** đường dẫn kể cả `.glb/.mp3/.png` không tồn tại (loader nhận HTML rồi lỗi); không nén; không cache; đọc cả file mỗi request | **Đã sửa**: file có đuôi mà thiếu → 404 thật; gzip có cache trong RAM (bundle 1,15 MB → 311 KB); `ETag`/304; cache dài cho bundle có hash; chặn `../` |
| R-09 | TB | Một ngoại lệ trong handler `async` làm **sập cả tiến trình** Node, mất mọi phòng | **Đã sửa**: bọc try/catch, trả 500, ghi log; thêm `uncaughtException`/`unhandledRejection` log |
| R-10 | TB | `npm run build` gọi `download-assets` — CDN lỗi một lần là **deploy Render thất bại** (code vẫn tự tải tài nguyên từ CDN) | **Đã sửa**: lỗi tải chỉ cảnh báo, không fail build |
| R-11 | Thấp | Health check trỏ `/` (trả cả trang HTML) | **Đã sửa**: `/healthz` nhẹ, không đụng phòng; `render.yaml` cập nhật, thêm `MAX_ROOMS`, `ROOM_GRACE_MS` |
| R-12 | Cao | Phòng chỉ ở RAM: khởi động lại = mất phòng và ván đang chơi. Không thể "reconnect" thật | **Chưa sửa** (cần lưu bên ngoài: mục 5-B) |
| R-13 | Cao | **Không có WebSocket**; đồng bộ bằng HTTP polling 20 lần/giây/người + SSE chỉ cho cú đánh. Tốn CPU và độ trễ cao hơn trên Render | **Chưa sửa** (mục 5-A). Ước tính: 1 phòng 4 người ≈ 35% quota CPU của gói free (0,1 CPU) |
| R-14 | Cao | Tỉ số do **máy host** quyết định, server chỉ lưu snapshot; không có API xác nhận kết quả | **Chưa sửa** (mục 5-C) |
| R-15 | Cao | **Không có Supabase**: kết quả trận/giải đấu không được lưu ở đâu | **Chưa sửa** (mục 5-B) |
| R-16 | TB | Host chạy mô phỏng nên **phải giữ tab ở nền trước**; tab nền bị trình duyệt làm chậm/tạm dừng `requestAnimationFrame` → cả phòng đứng hình (điện thoại khóa màn hình cũng vậy). Nay khách được báo (R-04) nhưng nguyên nhân gốc còn | **Hạn chế đã biết**, chỉ khắc phục triệt để khi server giữ trạng thái (5-C) |
| R-17 | Thấp | Đọc `state` không cần session: ai biết mã (5 chữ số ngẫu nhiên) đọc được tên, chat, snapshot của phòng | Chưa sửa; rủi ro thấp. Đề xuất: mã dài hơn (6 ký tự chữ-số) khi mở rộng |
| R-18 | Thấp | Khách tạo phòng lần đầu sau khi server ngủ phải chờ 30–60 s mà không có thông báo | **Đã sửa một phần**: `create`/`slot/join` tự thử lại tối đa 8 lần kèm thông báo "Máy chủ đang khởi động". Nếu *cả trang* chưa tải được thì chỉ trình duyệt hiện lỗi (không can thiệp được) |
| R-20 | **Cao** | **Khách không điều khiển được nhân vật** (báo cáo của người dùng: host trên Chrome, khách vào bằng Edge, host giao bóng, khách "không đỡ được"). Host chạy toàn bộ mô phỏng; phím WASD/joystick của khách chỉ ghi vào máy khách (`moveInput`) và `_applyManualMovement` bỏ qua khách. Kết quả: nhân vật ghế A2 đứng yên ở giữa sân (vị trí đội hình), chỉ tự chạy khi bóng rơi gần; bóng đi vào vùng khác thì khách bấm đánh cũng không chạm tới. Đo trên server thật: khách gửi 745 cú đánh, 0 lần trúng; host 8/89 | **Đã sửa**: relay di chuyển khách → host (`POST /api/racket/move`, đẩy tức thời qua SSE, có poll dự phòng); host áp dụng cho đúng nhân vật của khách (A2/B1/B2), đội B được lật trục vì khách nhìn từ phía đối diện; bỏ qua lệnh cũ >0,6 s và ghế đang do BOT điều khiển |
| R-21 | TB | Độ trễ cú đánh: cú bấm của khách đi lên server rồi mới tới host (thêm 1 RTT, thường 100–300 ms qua Render). Game yêu cầu bấm đúng lúc bóng tới, nên khách vẫn thấy "đánh trễ" hơn host | **Chưa sửa**: cần bù độ trễ (host chấp nhận cú đánh muộn thêm ~RTT) hoặc WebSocket (mục 5-A). Dùng `serverTimeMs` có sẵn trong `swing` để đo |
| R-22 | TB | Đội hình 2v2: người ở A2 đứng giữa sân (z≈5) và chỉ được giao bóng nằm ở vùng giữa; bóng sâu mặc định do A1 (host) xử lý | Hành vi thiết kế cũ, chưa đổi. Với relay di chuyển khách có thể tự chạy ra phía sau |
| R-19 | Thấp | Ba file `match_db` trùng nhau; README mẫu AI Studio; tệp `download` rỗng | Chưa dọn (không ảnh hưởng chạy) |

### Chi tiết kỹ thuật các thay đổi

- `server/api.js`: `guardRacket()` + `ownRole()` (R-03); `hostOnline()` + trường `hostOnline`, `serverTimeMs` trong `state` (R-04); giới hạn tạo phòng/`maxRooms` (R-06); trần luồng SSE (R-07); `ROOM_ONLINE_MS` đọc từ env để test được.
- `server/http.js`: truyền IP khách (`X-Forwarded-For`) cho giới hạn tạo phòng.
- `server.js`: static an toàn/nén/cache, `/healthz`, bắt lỗi toàn cục (R-08, R-09, R-11).
- `src/session_client.js`: banner kết nối, chống chồng poll, tự thử lại khi tạo/vào phòng (R-01, R-02, R-04, R-05, R-18). Chỉ theo dõi phòng mà tab này có session, nên **chơi Offline không bao giờ hiện banner**.
- `scripts/download-assets.mjs`, `render.yaml` (R-10, R-11).
- `server/api.js` `/api/racket/move`, `src/motion_controls.js` (`_restartMoveRelay`, `_handleRemoteMove`), `src/game_engine.js` (`_applyManualMovement` dùng cho cả khách) — R-20.
- Test mới/đổi: `scripts/test_multiplayer.mjs` (51 → 64: swing cần session, vai bị ép theo ghế, `hostOnline`, giới hạn tạo phòng, trần phòng), `scripts/test_transport.mjs` (nay vào phòng bằng session thật như trình duyệt), `e2e/connection.e2e.mjs` (mới).

## 3b. Đợt sửa tiếp (báo cáo của người dùng sau bản step6-lock)

| ID | Mức | Phát hiện | Trạng thái |
|---|---|---|---|
| R-23 | **Cao** | **Host thoát phòng mà khách không tự thoát.** Server không có khái niệm "đóng phòng": nút rời của host gọi `leave` nhưng server bỏ qua ghế host; thoát từ menu tạm dừng/hủy phòng/về menu thì không gọi server. Phòng sống tới 4 giờ, khách chỉ thấy "chủ phòng mất kết nối". Test mới chạy trên **code step6 gốc: fail** (khách không nhận gì) | **Đã sửa**: `POST /api/match/close` (chỉ host); host `leave` cũng đóng phòng; mọi request vào phòng đã đóng trả `410 ROOM_CLOSED` + `reason` (`host_closed`/`host_gone`); host im quá `ROOM_HOST_GONE_MS` (mặc định 120 s) thì phòng tự đóng; phòng đóng được giữ `ROOM_CLOSED_KEEP_MS` (120 s) để khách còn nhận thông báo rồi xóa. Khách thấy banner và **tự về menu sau 2,5 s** (tải lại trang = sạch mọi trạng thái cũ) |
| R-24 | **Cao** | **Host tạo phòng mới thì khách không chơi được "vì phòng cũ đã thoát".** `health.closed` trong `session_client.js` bật một lần là khóa vĩnh viễn: banner "Phòng không còn tồn tại" không bao giờ tắt, và poll của phòng cũ vẫn chạy song song với phòng mới. Thêm các cờ cũ (`_matchStartedLocally`, `_lockedRoomId`, `_onlineLobby`, vai/ghế) không được reset khi rời phòng | **Đã sửa**: tab chỉ theo dõi *phòng hiện tại*; vào/tạo phòng mới xóa banner, hủy hẹn giờ thoát, reset trạng thái; `showTitleModal()` luôn rời phòng đang có (host ⇒ đóng) và gọi `onLeftRoom` để engine reset cờ online; tạo phòng mới tự đóng phòng cũ trước |
| R-25 | **Cao (giả thuyết, chưa tái hiện được)** | **2 trình duyệt trên 1 máy: host điều khiển được, khách không.** Host chạy toàn bộ mô phỏng bằng `requestAnimationFrame`. Cửa sổ bị che/thu nhỏ/ở nền thì trình duyệt dừng rAF → mô phỏng host đứng, cú đánh và di chuyển của khách tới host nhưng không ai xử lý. Khi bạn bấm vào cửa sổ khách thì cửa sổ host thường bị che. Đây là R-16 | **Đã giảm**: khi rAF dừng >150 ms, host online tiếp tục `update()` bằng Web Worker timer (không bị throttle như timer thường; không vẽ). Cách thử đúng trên 1 máy: đặt 2 cửa sổ **cạnh nhau, không chồng lên nhau**. Dùng `await hachihiDiag()` ở console cả hai cửa sổ để xem `mySlot`, `tabHidden`, `lastSwingAgoMs` |
| R-26 | Thấp | `scripts/test_transport.mjs` đôi khi báo `fetch failed` khi chạy trong `npm test` (gặp 2 lần, không tái hiện được khi chạy lại 5 lần) | Chưa rõ nguyên nhân (nghi cổng ngẫu nhiên trùng). Nếu gặp: chạy lại |

Không đo được: lỗi R-25 trên 2 trình duyệt thật — môi trường kiểm thử không có three.js nên không chạy được engine. Nếu sau bản này khách vẫn không điều khiển được khi 2 cửa sổ cạnh nhau, hãy gửi kết quả `await hachihiDiag()` của cả hai cửa sổ.

Test mới: `scripts/test_session_client.mjs` (15, chạy `session_client.js` thật với server thật), 11 test đóng phòng/host biến mất trong `scripts/test_multiplayer.mjs` (73 → 84), 6 test nối dây trong `scripts/test_slot_roles.mjs`.

## 4. Việc nên làm trước khi mở cho nhiều người chơi

1. Đưa `render.yaml` mới lên và deploy; kiểm `GET /healthz` trả `{"ok":true}`.
2. Gói **free** ngủ sau ~15 phút và tự mất phòng. Cho sự kiện thật nên dùng gói **Starter** (luôn chạy), hoặc ít nhất dùng dịch vụ ping `/healthz` mỗi 10 phút. Phòng vẫn mất khi deploy.
3. Chạy tay theo `HANDOFF.md` mục "checklist test tay" với **2, 3, 4 người thật qua URL Render** (đo độ trễ vung vợt, giật hình).
4. Bảo người chơi: host phải để tab ở nền trước và không khóa màn hình (R-16).

## 5. Đề xuất tiếp theo (chưa làm)

| Ưu tiên | Hạng mục | Lý do | Ước lượng |
|---|---|---|---|
| A | WebSocket (thư viện `ws`, một đường duy nhất cho state, swing, chat, presence; tự kết nối lại, gửi lại `seq`) | Bỏ polling, giảm >80% request, độ trễ thấp, phát hiện rớt kết nối tức thì | 2–3 ngày |
| B | Supabase (bảng `matches`, `match_players`, `results`) lưu **kết quả + tiến trình**; khi server khởi động lại, tạo lại phòng từ bản lưu (`room_snapshots`) | Có reconnect thật khi server restart; lưu giải đấu | 2 ngày |
| C | Server giữ tỉ số: chuyển `rules_engine.js` (đã tách, đã test) lên server; client chỉ gửi *input* và nhận trạng thái; server xác nhận kết quả trận | Không để client quyết định điểm; hết phụ thuộc tab của host | 4–6 ngày (lớn nhất) |
| D | Tách lớp Transport phía client (`net/transport.js`) thay cho ~25 chỗ `fetch("/api/...")` | Dễ thay HTTP bằng WebSocket, dễ test | 1 ngày |
| E | Mã phòng 6 ký tự, `state` chỉ trả đủ thông tin cho thành viên | Giảm đoán mã | 0,5 ngày |

Nên làm theo thứ tự D → A → B → C. C là thay đổi lớn nhất, chỉ cần khi yêu cầu "client không quyết định điểm số" thực sự bắt buộc.

## 6. Nhật ký tiến trình

| Mốc | Nội dung | Kết quả |
|---|---|---|
| 1 | Đọc `server/api.js`, `http.js`, `server.js`, `session_client.js`; đo payload (`state` ≈ 3,5 KB) và tải | Xác định R-01…R-19 |
| 2 | Sửa server (R-03, R-04, R-06, R-07) | `test_multiplayer` 64/64 |
| 3 | Cập nhật test cũ gọi swing ẩn danh (hành vi cũ) cho khớp session thật | `test_transport` 38/38 |
| 4 | Static server, `/healthz`, bắt lỗi, build không fail (R-08…R-11) | Kiểm thủ công: 404 file thiếu, gzip 311 KB, `../` bị chặn |
| 5 | Client chịu lỗi mạng (R-01, R-02, R-04, R-05, R-18) | `e2e/connection.e2e.mjs` 7/7 |
| 6 | Chạy lại toàn bộ test, `tsc`, `vite build`, đóng gói | Xem mục 7 |
| 7 | Người dùng báo: khách (Edge) không điều khiển/không đỡ được bóng. Dựng lại bằng 2 trình duyệt + server thật; truy từng bước: cú đánh của khách **tới được** host (server nhận 70/70, host định tuyến đúng A2), nhưng nhân vật A2 không bao giờ di chuyển. Sửa bằng relay di chuyển (R-20) | `test_multiplayer` 69/69, `test_transport` 50/50 (thêm kiểm tra di chuyển ở cả 4 kịch bản mạng); kiểm trên trình duyệt: A2 dịch đúng hướng, B1/B2 chỉ khi là người, lệnh cũ và ghế BOT bị bỏ qua |

## 7. Cách chạy lại kiểm tra

```
npm test                                  # 5 bộ test, không cần trình duyệt
npm run lint && npx vite build
npm i --no-save playwright && npx playwright install chromium
node e2e/connection.e2e.mjs               # sự cố mạng/server (tự mở server riêng)
node server.js &                          # rồi:
BASE_URL=http://localhost:3000 PLAYERS=2 node e2e/multiplayer.e2e.mjs
```
Lưu ý `e2e/multiplayer.e2e.mjs` trong repo vẫn dùng nút lobby cũ (`#btn-multiplayer-modal` bị ẩn); cần bấm `#btn-choice-multi` trước và cuộn nút "Tham gia" vào giữa màn hình. Bản trong repo đã được sửa theo đó (chạy được với PLAYERS=2).

## 8. Quy tắc phòng online: host quyết định số người và BOT (2026-11-10)

Nguyên nhân kết quả "2 người + 2 BOT": lobby không cho chọn 1–1/2–2 và ngầm tạo phòng 2–2; khách vào được xếp ghế A2 (cùng đội host), nên muốn bắt đầu host phải bấm "+ Thêm Máy" hai lần ở đội B.

Đã làm theo đặc tả (Offline giữ nguyên tự điền BOT):
- Chọn **1–1 / 2–2 ngay khi tạo phòng** (`index.html`, `src/hud_ui.js`). Phòng 1–1 chỉ có A1, B1; phòng 2–2 có A1, A2, B1, B2. Tạo phòng không có BOT.
- `server/api.js`: chỉ host thêm/xóa/đổi BOT (kèm cấp dễ/bình thường/chuyên nghiệp); khách chỉ vào **ghế trống** (không chiếm ghế BOT hay ghế người khác, cả khi vào lẫn khi đổi chỗ); bắt đầu chỉ khi **mọi ghế** (2 hoặc 4) có người/BOT và có ít nhất 1 người; sau khi bắt đầu không đổi BOT/ghế; rời phòng trước khi bắt đầu → ghế **trống** (không BOT).
- Một ngoại lệ duy nhất: người **rớt mạng/rời giữa trận đang chạy** vẫn được BOT thế chỗ, vì trận không thể chờ.
- Đổi 2–2 → 1–1 trước khi bắt đầu: khách ở A2 được chuyển sang B1 (không bị đá, không thành BOT).
- `src/match_manager.js`: `initRoomLobbySlots(tên, chế độ)`, `canStart()` chặt, `addBotToTeam` chỉ vào ghế trống; `src/slot_roles.js`: `seatsFor`, `canControlSeat` theo chế độ; `src/game_engine.js`: input theo chế độ, và bắt đầu trận **offline** sau khi từng ở phòng online sẽ đặt lại vai/phòng (không mang trạng thái cũ).
- Test mới `scripts/test_room_modes.mjs` (64 kiểm tra) bao phủ từng điều kiện nghiệm thu; `npm test` 8 bộ đều xanh, `tsc` và `vite build` qua.
