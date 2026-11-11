// Multiplayer server scenarios (2/3/4 players) against the real server.js.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4100 + Math.floor(Math.random() * 400);
const base = `http://127.0.0.1:${PORT}`;
const GRACE = 1200;
const srv = spawn(process.execPath, ["server.js"], { cwd: root, env: { ...process.env, PORT: String(PORT), ROOM_GRACE_MS: String(GRACE), ROOM_HOST_GONE_MS: "4000", CREATE_PER_MIN: "500", ROOM_ONLINE_MS: "1000" }, stdio: "ignore" });
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

try {
  for (let i = 0; i < 50; i++) { try { await fetch(base + "/api/match/state?room=10150"); break; } catch { await sleep(100); } }

  // ---- 4 players: create + 3 joins ----
  const c = (await post("/api/match/create", { p1Name: "Host", matchType: "doubles" })).j;
  const room = c.roomId, H = c.sessionToken;
  ok(/^\d{5}$/.test(room) && !!H && c.assignedSlot === "A1", "create gives room code, host token, seat A1");
  const st0 = (await get(`/api/match/state?room=${room}`)).j;
  ok(!JSON.stringify(st0).includes(H), "session tokens are never exposed in state");

  const g1 = (await post("/api/match/slot/join", { room, playerName: "G1" })).j;
  const g2 = (await post("/api/match/slot/join", { room, playerName: "G2" })).j;
  const g3 = (await post("/api/match/slot/join", { room, playerName: "G3" })).j;
  ok([g1, g2, g3].map((g) => g.assignedSlot).sort().join() === "A2,B1,B2", "3 guests get A2, B1, B2");
  ok(new Set([H, g1.sessionToken, g2.sessionToken, g3.sessionToken]).size === 4, "4 distinct session tokens");
  const full = await post("/api/match/slot/join", { room, playerName: "G5" });
  ok(full.status === 409 && full.j.error === "ROOM_FULL", "5th player rejected with ROOM_FULL");

  // host seat cannot be taken
  const c2 = (await post("/api/match/create", { p1Name: "H2" })).j;
  const t = (await post("/api/match/slot/join", { room: c2.roomId, slotId: "A1", playerName: "Thief" })).j;
  ok(t.assignedSlot && t.assignedSlot !== "A1", "joining with slotId=A1 never steals the host seat");

  // ---- MP-04: only host may sync ----
  ok((await post("/api/match/sync", { room, snapshot: { score: [99, 0] } })).status === 401, "sync without session -> 401");
  ok((await post("/api/match/sync", { room, snapshot: { score: [99, 0] } }, g1.sessionToken)).status === 403, "sync from guest -> 403");
  ok((await post("/api/match/sync", { room, snapshot: { score: [1, 2] } }, H)).status === 200, "host sync ok");
  const snap = (await get(`/api/match/state?room=${room}`)).j.snapshot;
  ok(snap && snap.score[0] === 1, "forged 99-0 snapshot did not overwrite host snapshot");

  // ---- MP-05: start validation ----
  const solo = (await post("/api/match/create", { p1Name: "Solo" })).j;
  const s1 = await post("/api/match/start", { room: solo.roomId }, solo.sessionToken);
  ok(s1.status === 409 && s1.j.error === "NOT_ENOUGH_PLAYERS", "host alone cannot start");
  ok((await get(`/api/match/state?room=${solo.roomId}`)).j.started === false, "room stays not-started");
  ok((await post("/api/match/start", { room }, g1.sessionToken)).status === 403, "guest cannot start");
  ok((await post("/api/match/start", { room })).status === 401, "no session cannot start");
  ok((await post("/api/match/start", { room }, H)).j.started === true, "host starts a full room");

  // ---- MP-06: no phantom rooms ----
  for (const [m, p, b] of [["GET", "/api/match/state?room=99999"], ["POST", "/api/match/slot/join", { room: "99999" }], ["POST", "/api/match/sync", { room: "99999" }]]) {
    const r = await call(m, p, b);
    ok(r.status === 404 && r.j.error === "ROOM_NOT_FOUND", `${m} ${p} on unknown room -> ROOM_NOT_FOUND`);
  }
  ok((await get("/api/match/state?room=99999")).status === 404, "unknown room still not created on second call");
  ok((await get("/api/match/state?room=default")).j.roomId === "10150", "legacy 'default' room still maps to 10150");

  // ---- slot permissions ----
  const mine = slot(g1, g1.assignedSlot), other = g2.assignedSlot;
  ok((await post("/api/match/slot/update", { room, slotId: g1.assignedSlot, playerName: "Renamed" }, g1.sessionToken)).status === 200, "guest renames own seat");
  ok((await post("/api/match/slot/update", { room, slotId: other, playerName: "Hack" }, g1.sessionToken)).status === 403, "guest cannot rename others");
  await post("/api/match/slot/update", { room, slotId: g1.assignedSlot, playerType: "bot" }, g1.sessionToken);
  ok(slot((await get(`/api/match/state?room=${room}`)).j, g1.assignedSlot).playerType === "human", "guest cannot turn own seat into a bot");
  ok((await post("/api/match/team/update", { room, teamAName: "X" }, g1.sessionToken)).status === 403, "guest cannot edit teams");
  ok((await post("/api/match/chat", { room, text: "hi" })).status === 401, "chat needs a session");
  ok((await post("/api/match/chat", { room, text: "hi" }, g2.sessionToken)).status === 200, "member chat ok");

  // ---- leave / rejoin (MP-07) ----
  const r2 = (await post("/api/match/create", { p1Name: "H3" })).j;
  const a = (await post("/api/match/slot/join", { room: r2.roomId, playerName: "A" })).j;
  const b = (await post("/api/match/slot/join", { room: r2.roomId, playerName: "B" })).j;
  const again = (await post("/api/match/slot/join", { room: r2.roomId, playerName: "A" }, a.sessionToken)).j;
  ok(again.assignedSlot === a.assignedSlot && again.rejoined, "join with same session returns same seat (no seat leak)");
  const lv = (await post("/api/match/leave", { room: r2.roomId }, a.sessionToken)).j;
  ok(slot(lv, a.assignedSlot).playerType === "empty", "leave BEFORE start frees own seat (game never adds a BOT by itself)");
  const back = (await post("/api/match/slot/join", { room: r2.roomId, playerName: "A" }, a.sessionToken)).j;
  ok(back.assignedSlot === a.assignedSlot, "rejoin with same session reclaims the old seat");
  ok((await post("/api/match/leave", { room: r2.roomId, slotId: b.assignedSlot }, a.sessionToken)).j.slots.find((s) => s.slotId === b.assignedSlot).playerType === "human", "guest cannot kick another player");
  ok(slot((await post("/api/match/leave", { room: r2.roomId, slotId: b.assignedSlot }, r2.sessionToken)).j, b.assignedSlot).playerType === "empty", "host can remove a seat (seat becomes empty before start)");

  // ---- disconnect grace ----
  const r3 = (await post("/api/match/create", { p1Name: "H4" })).j;
  const d1 = (await post("/api/match/slot/join", { room: r3.roomId, playerName: "Stay" })).j;
  const d2 = (await post("/api/match/slot/join", { room: r3.roomId, playerName: "Drop" })).j;
  await sleep(GRACE * 0.6);
  await get(`/api/match/state?room=${r3.roomId}`, d1.sessionToken);          // d1 keeps polling
  let s = (await get(`/api/match/state?room=${r3.roomId}`, d1.sessionToken)).j;
  ok(slot(s, d2.assignedSlot).playerType === "human", "within grace the seat is still human");
  ok(s.slotOnline[d1.assignedSlot] === true, "polling guest shows online");
  await sleep(GRACE * 0.7);
  await get(`/api/match/state?room=${r3.roomId}`, d1.sessionToken);
  s = (await get(`/api/match/state?room=${r3.roomId}`, d1.sessionToken)).j;
  ok(slot(s, d2.assignedSlot).playerType === "empty", "silent guest frees the seat after grace (match not started yet)");
  ok(slot(s, d1.assignedSlot).playerType === "human", "polling guest keeps seat");
  ok(slot(s, "A1").playerType === "human", "host is never replaced");
  const d2b = (await post("/api/match/slot/join", { room: r3.roomId, playerName: "Drop" }, d2.sessionToken)).j;
  ok(d2b.assignedSlot === d2.assignedSlot, "dropped guest can reclaim seat with its session");

  // ---- host seat is locked to A1; guests may switch teams and their token follows ----
  const r4 = (await post("/api/match/create", { p1Name: "H5" })).j;
  const hm = await post("/api/match/slot/move", { room: r4.roomId, fromSlotId: "A1", toSlotId: "B1" }, r4.sessionToken);
  ok(hm.status === 403 && hm.j.error === "HOST_SEAT_LOCKED", "host cannot move out of A1");
  const hs = await post("/api/match/slot/switch-team", { room: r4.roomId, slotId: "A1" }, r4.sessionToken);
  ok(hs.status === 403, "host cannot switch team");
  const gA = (await post("/api/match/slot/join", { room: r4.roomId, playerName: "G" })).j;   // takes A2
  const toA1 = await post("/api/match/slot/move", { room: r4.roomId, fromSlotId: gA.assignedSlot, toSlotId: "A1" }, gA.sessionToken);
  ok(toA1.status === 403, "guest cannot take the host seat by moving");
  await post("/api/match/slot/switch-team", { room: r4.roomId, slotId: gA.assignedSlot }, gA.sessionToken);
  const gs = (await get(`/api/match/state?room=${r4.roomId}`, gA.sessionToken)).j;
  ok(gs.mySlot !== gA.assignedSlot && gs.mySlot[0] === "B" && slot(gs, gs.mySlot).playerName === "G", "guest token follows guest to the other team");
  ok((await get(`/api/match/state?room=${r4.roomId}`, r4.sessionToken)).j.mySlot === "A1", "host stays in A1");

  // ---- singles / matchType ----
  const sg = (await post("/api/match/create", { p1Name: "S", matchType: "singles" })).j;
  ok(sg.slots.length === 2, "singles room has 2 seats");
  const sj = (await post("/api/match/slot/join", { room: sg.roomId, playerName: "O" })).j;
  ok(sj.assignedSlot === "B1", "singles guest lands in B1");
  ok((await post("/api/match/start", { room: sg.roomId }, sg.sessionToken)).j.started === true, "singles starts with 2 players");
  const sw = (await post("/api/match/team/update", { room: r4.roomId, matchType: "singles" }, r4.sessionToken)).j;
  ok(sw.slots.length === 2, "host can switch to singles");


  // ---- khóa đổi sân khi trận đã bắt đầu ----
  const lk = (await post("/api/match/create", { p1Name: "K", matchType: "singles" })).j;
  await post("/api/match/team/update", { room: lk.roomId, scenery: "bigben" }, lk.sessionToken);
  ok((await get(`/api/match/state?room=${lk.roomId}`, lk.sessionToken)).j.scenery === "bigben", "scenery can change in the lobby before start");
  await post("/api/match/slot/join", { room: lk.roomId, playerName: "O" });
  ok((await post("/api/match/start", { room: lk.roomId }, lk.sessionToken)).j.started === true, "lock-test room starts");
  const lk2 = (await post("/api/match/team/update", { room: lk.roomId, scenery: "eiffel", botDifficulty: "hard" }, lk.sessionToken)).j;
  ok(lk2.scenery === "bigben", "scenery change is IGNORED after the match started");
  ok((await get(`/api/match/state?room=${lk.roomId}`, lk.sessionToken)).j.scenery === "bigben", "state still reports the locked scenery");

  // ---- room settings (sound/scenery), share link, SSE ----
  const rset = (await post("/api/match/create", { p1Name: "Settings" })).j;
  ok(rset.joinUrl.includes("join=lobby"), "create returns a join link that goes through the join card");
  ok((await get(`/api/match/state?room=${rset.roomId}`)).j.sound.music === true, "sound defaults to on");
  const gs1 = (await post("/api/match/slot/join", { room: rset.roomId, playerName: "S" })).j;
  ok((await post("/api/match/team/update", { room: rset.roomId, sound: { music: false, sfx: true } }, gs1.sessionToken)).status === 403, "guest cannot change room sound");
  await post("/api/match/team/update", { room: rset.roomId, sound: { music: false, sfx: true }, scenery: "eiffel" }, rset.sessionToken);
  const rst = (await get(`/api/match/state?room=${rset.roomId}`)).j;
  ok(rst.sound.music === false && rst.sound.sfx === true && rst.scenery === "eiffel", "host sound + scenery stored and visible to guests");
  ok((await fetch(`${base}/api/match/events?room=99999`)).status === 404, "event stream for unknown room -> 404");
  const ctl = new AbortController();
  const sse = await fetch(`${base}/api/match/events?room=${rset.roomId}`, { signal: ctl.signal });
  ok(sse.status === 200 && /text\/event-stream/.test(sse.headers.get("content-type")), "event stream opens for a real room");
  const reader = sse.body.getReader();
  await post("/api/racket/swing", { room: rset.roomId, role: "p3", cid: "abc123", speed: 1.5 }, gs1.sessionToken);
  let seen = "";
  const dl = Date.now() + 2000;
  while (Date.now() < dl && !seen.includes("abc123")) { const { value } = await reader.read(); seen += new TextDecoder().decode(value || new Uint8Array()); }
  ok(seen.includes("event: swing") && seen.includes('"role":"p3"') && seen.includes("abc123"), "swing is pushed over SSE with its client id");
  ctl.abort();


  // ---- host leaves / closes the room: everybody else is told (410), a new room works normally ----
  const hc = (await post("/api/match/create", { p1Name: "HC" })).j;
  const hg1 = (await post("/api/match/slot/join", { room: hc.roomId, playerName: "G1" })).j;
  const hg2 = (await post("/api/match/slot/join", { room: hc.roomId, playerName: "G2" })).j;
  ok((await post("/api/match/close", { room: hc.roomId }, hg1.sessionToken)).status === 403, "guest cannot close the room");
  await post("/api/match/leave", { room: hc.roomId }, hg1.sessionToken);
  ok((await get(`/api/match/state?room=${hc.roomId}`, hg2.sessionToken)).status === 200, "a guest leaving does not close the room");
  const lv2 = await post("/api/match/leave", { room: hc.roomId, slotId: "A1" }, hc.sessionToken);   // what the lobby 'leave' button sends for the host
  ok(lv2.status === 200 && lv2.j.closed === true, "host leave closes the room");
  const gst = await get(`/api/match/state?room=${hc.roomId}`, hg2.sessionToken);
  ok(gst.status === 410 && gst.j.error === "ROOM_CLOSED" && gst.j.reason === "host_closed", "guest polling a closed room gets 410 ROOM_CLOSED (reason host_closed)");
  ok((await post("/api/racket/swing", { room: hc.roomId, speed: 1 }, hg2.sessionToken)).status === 410, "swings to a closed room are refused with 410");
  ok((await post("/api/match/slot/join", { room: hc.roomId, playerName: "Late" })).status === 410, "joining a closed room -> 410");
  ok((await fetch(`${base}/api/match/events?room=${hc.roomId}`)).status === 410, "event stream of a closed room -> 410");
  const nr = (await post("/api/match/create", { p1Name: "HC" })).j;
  ok(nr.roomId !== hc.roomId, "host can create another room right away");
  const ng = (await post("/api/match/slot/join", { room: nr.roomId, playerName: "G2" }, hg2.sessionToken)).j;
  ok(ng.assignedSlot && ng.sessionToken, "a guest of the old room can join the new room (old session token is irrelevant)");
  const ex = (await post("/api/match/create", { p1Name: "EX" })).j;
  await post("/api/match/close", { room: ex.roomId }, ex.sessionToken);
  ok((await get(`/api/match/state?room=${ex.roomId}`)).status === 410, "explicit close -> 410");

  // ---- host disappears (tab killed): room closes by itself, guests are told why ----
  const hd = (await post("/api/match/create", { p1Name: "Gone" })).j;
  const hdg = (await post("/api/match/slot/join", { room: hd.roomId, playerName: "Stay" })).j;
  for (let i = 0; i < 5; i++) { await sleep(1000); await get(`/api/match/state?room=${hd.roomId}`, hdg.sessionToken); }   // guest keeps polling, host silent
  const hds = await get(`/api/match/state?room=${hd.roomId}`, hdg.sessionToken);
  ok(hds.status === 410 && hds.j.reason === "host_gone", "silent host: room closes with reason host_gone");

  // ---- racket roles: a swing is always filed under the SENDER's seat ----
  const rr = (await post("/api/match/create", { p1Name: "HR" })).j;
  const ra = (await post("/api/match/slot/join", { room: rr.roomId, playerName: "A" })).j;   // A2 -> p3
  const rb = (await post("/api/match/slot/join", { room: rr.roomId, playerName: "B" })).j;   // B1 -> p2
  const rc = (await post("/api/match/slot/join", { room: rr.roomId, playerName: "C" })).j;   // B2 -> p4
  await post("/api/racket/swing", { room: rr.roomId, role: "p3", speed: 2 }, ra.sessionToken);
  await post("/api/racket/swing", { room: rr.roomId, role: "p4", speed: 3 }, rc.sessionToken);
  let rs = (await get(`/api/match/state?room=${rr.roomId}`)).j;
  ok(rs.rackets.p3.lastSwing && rs.rackets.p3.lastSwing.speed === 2 && rs.rackets.p4.lastSwing.speed === 3, "p3/p4 swings stored per role");
  ok(!rs.rackets.p1.lastSwing, "p3/p4 swings do not leak into p1");
  ok((await post("/api/racket/swing", { room: rr.roomId, role: "p1", speed: 9 })).status === 401, "swing without a session is rejected (401)");
  await post("/api/racket/swing", { room: rr.roomId, role: "p1", speed: 9 }, rb.sessionToken);   // B1 pretends to be the host
  rs = (await get(`/api/match/state?room=${rr.roomId}`)).j;
  ok(!rs.rackets.p1.lastSwing && rs.rackets.p2.lastSwing && rs.rackets.p2.lastSwing.speed === 9, "a guest cannot swing for another player: role forced to own seat");
  ok((await post("/api/racket/telemetry", { room: rr.roomId, role: "p1", pitch: 5 })).status === 401, "telemetry without a session is rejected");
  ok(rs.hostOnline === true, "state reports hostOnline=true while the host is active");
  await sleep(1500);   // host silent longer than ROOM_ONLINE_MS, guest keeps polling
  const ho = (await get(`/api/match/state?room=${rr.roomId}`, rb.sessionToken)).j;
  ok(ho.hostOnline === false, "guests are told when the host stops responding (hostOnline=false)");
  await post("/api/match/sync", { room: rr.roomId, snapshot: { phase: "RALLY" } }, rr.sessionToken);
  ok((await get(`/api/match/state?room=${rr.roomId}`, rb.sessionToken)).j.hostOnline === true, "hostOnline recovers when the host syncs again");

  // ---- guest movement relay (keys / joystick -> host) ----
  const mrm = (await post("/api/match/create", { p1Name: "HM" })).j;
  const ma = (await post("/api/match/slot/join", { room: mrm.roomId, playerName: "A" })).j;   // A2 -> p3
  const mb = (await post("/api/match/slot/join", { room: mrm.roomId, playerName: "B" })).j;   // B1 -> p2
  const mc = (await post("/api/match/slot/join", { room: mrm.roomId, playerName: "C" })).j;   // B2 -> p4
  ok((await post("/api/racket/move", { room: mrm.roomId, role: "p3", x: 1, z: -1 })).status === 401, "move without a session is rejected");
  const mv = await post("/api/racket/move", { room: mrm.roomId, role: "p1", x: 5, z: -9 }, ma.sessionToken);   // A2 pretends to be p1 and sends out-of-range values
  ok(mv.status === 200, "member can send movement");
  const mst = (await get(`/api/match/state?room=${mrm.roomId}`)).j;
  ok(mst.rackets.p3.move && mst.rackets.p3.move.x === 1 && mst.rackets.p3.move.z === -1, "movement is stored under the sender's own seat (p3) and clamped to [-1,1]");
  ok(!mst.rackets.p1.move, "a guest cannot move the host's character");
  const mctl = new AbortController();
  const msse = await fetch(`${base}/api/match/events?room=${mrm.roomId}`, { signal: mctl.signal });
  const mreader = msse.body.getReader();
  await post("/api/racket/move", { room: mrm.roomId, x: 0, z: 1 }, mc.sessionToken);
  let mseen = ""; const mdl = Date.now() + 2000;
  while (Date.now() < mdl && !mseen.includes("event: move")) { const { value } = await mreader.read(); mseen += new TextDecoder().decode(value || new Uint8Array()); }
  ok(mseen.includes("event: move") && mseen.includes('"role":"p4"') && mseen.includes('"z":1'), "movement is pushed to the host over SSE");
  mctl.abort();

  // ---- Render protection: room cap + per-IP create limit (unit level, own API instance) ----
  const { createApi } = await import("../server/api.js");
  const mk = (o) => createApi(o);
  const lim = mk({ createPerMin: 3, maxRooms: 100 });
  const mkRoom = (api, ip) => api.handle({ method: "POST", pathname: "/api/match/create", query: new URLSearchParams(), body: {}, token: null, ip });
  const rs3 = []; for (let i = 0; i < 4; i++) rs3.push((await mkRoom(lim, "1.2.3.4")).status);
  ok(rs3.join() === "200,200,200,429", "per-IP room creation is rate limited (" + rs3.join() + ")");
  ok((await mkRoom(lim, "5.6.7.8")).status === 200, "another IP is not affected");
  const cap = mk({ createPerMin: 100, maxRooms: 3 });   // default room counts as 1
  const st3 = []; for (let i = 0; i < 4; i++) st3.push((await mkRoom(cap, "9.9.9." + i)).status);
  ok(st3.join() === "200,200,503,503", "room cap returns 503 SERVER_BUSY when full (" + st3.join() + ")");
} finally {
  srv.kill();
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
