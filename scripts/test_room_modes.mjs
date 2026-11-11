// Room modes (1-1 / 2-2) and the "the game never adds a BOT by itself" rule, against the real server.js.
// NOTE: if you still have your original, larger test_room_modes.mjs, overwrite this file with it.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as SR from "../src/slot_roles.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4600 + Math.floor(Math.random() * 300);
const base = `http://127.0.0.1:${PORT}`;
const srv = spawn(process.execPath, ["server.js"], { cwd: root, env: { ...process.env, PORT: String(PORT), CREATE_PER_MIN: "500", ROOM_GRACE_MS: "60000" }, stdio: "ignore" });
let passed = 0, failed = 0;
const ok = (c, n) => { if (c) passed++; else { failed++; console.error("  ✗ FAIL:", n); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(method, p, body, token) {
  const r = await fetch(base + p, { method, headers: { "Content-Type": "application/json", ...(token ? { "X-Session": token } : {}) }, body: method === "POST" ? JSON.stringify(body || {}) : undefined });
  return { status: r.status, j: await r.json() };
}
const post = (p, b, t) => call("POST", p, b, t);
const get = (p, t) => call("GET", p, null, t);
const slot = (j, id) => j.slots.find((s) => s.slotId === id);
const ids = (j) => j.slots.map((s) => s.slotId).sort().join(",");

try {
  for (let i = 0; i < 50; i++) { try { await fetch(base + "/api/match/state?room=10150"); break; } catch { await sleep(100); } }

  // ---- slot_roles (client rules) ----
  ok(SR.seatsFor("singles").join() === "A1,B1", "singles seats = A1,B1");
  ok(SR.seatsFor("doubles").join() === "A1,A2,B1,B2", "doubles seats = A1,A2,B1,B2");
  ok(SR.canControlSeat("singles", "rally", "A2") === false, "A2 cannot act in singles");
  ok(SR.canControlSeat("singles", "rally", "B1") === true, "B1 can act in singles");
  ok(SR.canControlSeat("doubles", "rally", "A2") === true, "A2 can act in doubles (rally)");
  ok(SR.forceActorFor([], "A1", "singles") === null, "singles: nobody is pinned to a partner");

  // ---- doubles room: only the host is seated, nothing auto-filled ----
  const d = (await post("/api/match/create", { p1Name: "Host", matchType: "doubles" })).j;
  ok(ids(d) === "A1,A2,B1,B2", "doubles room has 4 seats");
  ok(slot(d, "A1").playerType === "human" && d.slots.filter((s) => s.playerType === "empty").length === 3, "only host seated; 3 seats empty");
  ok(d.slots.every((s) => s.playerType !== "bot"), "no BOT added automatically");
  const s0 = await post("/api/match/start", { room: d.roomId }, d.sessionToken);
  ok(s0.status === 409 && s0.j.error === "NOT_ENOUGH_PLAYERS", "host alone cannot start");

  // host adds bots himself; start only when ALL 4 seats are filled
  await post("/api/match/slot/update", { room: d.roomId, slotId: "A2", playerType: "bot" }, d.sessionToken);
  await post("/api/match/slot/update", { room: d.roomId, slotId: "B1", playerType: "bot" }, d.sessionToken);
  ok((await post("/api/match/start", { room: d.roomId }, d.sessionToken)).status === 409, "3 of 4 seats filled cannot start");
  await post("/api/match/slot/update", { room: d.roomId, slotId: "B2", playerType: "bot" }, d.sessionToken);
  ok(slot((await get(`/api/match/state?room=${d.roomId}`)).j, "B2").playerType === "bot", "host-added BOT is visible");
  ok((await post("/api/match/start", { room: d.roomId }, d.sessionToken)).j.started === true, "all 4 seats filled -> starts");

  // ---- guest cannot take a BOT seat; leave before start frees the seat ----
  const d2 = (await post("/api/match/create", { p1Name: "H2", matchType: "doubles" })).j;
  await post("/api/match/slot/update", { room: d2.roomId, slotId: "B1", playerType: "bot" }, d2.sessionToken);
  const g = (await post("/api/match/slot/join", { room: d2.roomId, playerName: "G" })).j;
  ok(g.assignedSlot && slot(g, g.assignedSlot).playerType === "human" && g.assignedSlot !== "B1", "guest gets an EMPTY seat, never the BOT seat");
  const lv = (await post("/api/match/leave", { room: d2.roomId }, g.sessionToken)).j;
  ok(slot(lv, g.assignedSlot).playerType === "empty", "guest leaving before start frees the seat (no auto BOT)");

  // ---- leaving AFTER start: a BOT keeps the match going ----
  const d3 = (await post("/api/match/create", { p1Name: "H3", matchType: "doubles" })).j;
  const g3 = (await post("/api/match/slot/join", { room: d3.roomId, playerName: "G3" })).j;
  for (const sid of ["A2", "B1", "B2"]) if (slot((await get(`/api/match/state?room=${d3.roomId}`)).j, sid).playerType === "empty") await post("/api/match/slot/update", { room: d3.roomId, slotId: sid, playerType: "bot" }, d3.sessionToken);
  ok((await post("/api/match/start", { room: d3.roomId }, d3.sessionToken)).j.started === true, "room with 1 guest + bots starts");
  const lv3 = (await post("/api/match/leave", { room: d3.roomId }, g3.sessionToken)).j;
  ok(slot(lv3, g3.assignedSlot).playerType === "bot", "guest leaving DURING the match is replaced by a BOT");

  // ---- singles ----
  const s = (await post("/api/match/create", { p1Name: "S", matchType: "singles" })).j;
  ok(ids(s) === "A1,B1", "singles room has 2 seats");
  ok((await post("/api/match/start", { room: s.roomId }, s.sessionToken)).status === 409, "singles: host alone cannot start");
  const sg = (await post("/api/match/slot/join", { room: s.roomId, playerName: "O" })).j;
  ok(sg.assignedSlot === "B1", "singles guest lands in B1");
  ok((await post("/api/match/start", { room: s.roomId }, s.sessionToken)).j.started === true, "singles starts with 2 humans");
  const s2 = (await post("/api/match/create", { p1Name: "S2", matchType: "singles" })).j;
  await post("/api/match/slot/update", { room: s2.roomId, slotId: "B1", playerType: "bot" }, s2.sessionToken);
  ok((await post("/api/match/start", { room: s2.roomId }, s2.sessionToken)).j.started === true, "singles starts with human + host-added BOT");
} finally {
  srv.kill();
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
