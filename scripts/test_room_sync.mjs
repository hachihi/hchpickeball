// Integration test of the real server.js room API: the contract the lobby relies on.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 3900 + Math.floor(Math.random() * 90);
const base = `http://127.0.0.1:${PORT}`;
const srv = spawn(process.execPath, ["server.js"], { cwd: root, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
let passed = 0, failed = 0;
const ok = (c, n) => { if (c) passed++; else { failed++; console.error("  ✗ FAIL:", n); } };
let tok = {};
// t === undefined -> use the host session of that room; t === "" -> anonymous (a new guest)
const post = (p, body, t) => { const T = t !== undefined ? t : tok[body && body.room]; return fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json", ...(T ? { "X-Session": T } : {}) }, body: JSON.stringify(body) }); };
const get = async (p) => (await fetch(base + p)).json();

try {
  for (let i = 0; i < 50; i++) { try { await fetch(base + "/api/match/state?room=PING"); break; } catch { await new Promise(r => setTimeout(r, 100)); } }

  // 1+2. host creates a room: real 5-digit code, never "default"
  const created = await (await post("/api/match/create", { p1Name: "Minh", hostName: "Minh", matchType: "doubles" })).json();
  ok(/^\d{5}$/.test(created.roomId), "create returns a 5-digit room code");
  ok(created.slots.find(s => s.slotId === "A1").playerName === "Minh", "host name stored in slot A1");
  const room = created.roomId;
  tok[room] = created.sessionToken;   // host session

  // 3. names: guest joins with own name and is told which slot it got; rename syncs
  const j = await (await post("/api/match/slot/join", { room, playerName: "Lan", slotId: "B1" }, "")).json();
  ok(!!j.assignedSlot, "join returns assignedSlot");
  ok(j.slots.find(s => s.slotId === j.assignedSlot).playerName === "Lan", "guest name stored");
  await post("/api/match/slot/update", { room, slotId: "A1", playerName: "Hoàng" });
  let st = await get(`/api/match/state?room=${room}`);
  ok(st.slots.find(s => s.slotId === "A1").playerName === "Hoàng", "host rename visible to everyone");
  ok(st.hostName === "Hoàng", "hostName follows rename");

  // 4. start: only the real room becomes started; a stray 'default' room does not leak
  ok(st.started === false, "room not started before host presses start");
  const other = await get("/api/match/state?room=default");
  ok(other.started === false && other.roomId !== room, "'default' room is separate");
  // Luật mới: game KHÔNG tự thêm BOT. Chủ phòng tự lấp hết ghế trống rồi mới bắt đầu.
  for (const sid of ["A2", "B2"]) await post("/api/match/slot/update", { room, slotId: sid, playerType: "bot" });
  const s1 = await post("/api/match/start", { room });
  ok(s1.ok, "start accepted");
  st = await get(`/api/match/state?room=${room}`);
  ok(st.started === true, "guest polling sees started=true for the real room");
  const other2 = await get("/api/match/state?room=default");
  ok(other2.started === false, "starting a room does not start 'default'");

  // full room => 409; leaving frees the seat
  for (let i = 0; i < 4; i++) await post("/api/match/slot/join", { room, playerName: "X" + i }, "");
  const full = await post("/api/match/slot/join", { room, playerName: "Late" }, "");
  ok(full.status === 409, "full room rejects join");
  const lv = await (await post("/api/match/leave", { room, slotId: j.assignedSlot })).json();
  ok(lv.slots.find(s => s.slotId === j.assignedSlot).playerType === "bot", "leaving frees the seat");
} finally {
  srv.kill();
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
