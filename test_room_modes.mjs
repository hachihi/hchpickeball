// Acceptance tests for the online room rules: host decides 1-1 / 2-2, the game NEVER adds a BOT by itself,
// only the host adds/removes/changes BOTs, guests cannot take BOT or other people's seats, start needs every seat filled.
// Server part runs against the real API module; client part against the real MatchManager / slot_roles.
import { createApi } from "../server/api.js";
import { MatchManager } from "../src/match_manager.js";
import * as R from "../src/slot_roles.js";

let passed = 0, failed = 0;
const ok = (c, n) => { if (c) passed++; else { failed++; console.error("  ✗ FAIL:", n); } };
const api = createApi({ createPerMin: 1000, graceMs: 80, onlineMs: 5000 });
const call = (method, pathname, body = {}, token = null, qs = {}) => api.handle({ method, pathname, query: new URLSearchParams(qs), body, token, ip: "t" });
const create = async (matchType) => (await call("POST", "/api/match/create", { p1Name: "Host", matchType })).body;
const join = async (room, name = "G") => (await call("POST", "/api/match/slot/join", { room, playerName: name })).body;
const state = async (room, tok) => (await call("GET", "/api/match/state", {}, tok, { room })).body;
const ids = (s) => s.slots.map((x) => x.slotId).join(",");
const types = (s) => s.slots.map((x) => x.slotId + ":" + x.playerType).join(" ");
const bot = (room, tok, slotId, extra = {}) => call("POST", "/api/match/slot/update", { room, slotId, playerType: "bot", ...extra }, tok);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- creation: exact seats, no BOT ----
const s1 = await create("singles");
ok(ids(s1) === "A1,B1", "1-1 room has exactly A1, B1 (got " + ids(s1) + ")");
ok(!s1.slots.some((s) => s.playerType === "bot"), "1-1 room is created without BOTs");
const d1 = await create("doubles");
ok(ids(d1) === "A1,A2,B1,B2", "2-2 room has A1, A2, B1, B2");
ok(types(d1) === "A1:human A2:empty B1:empty B2:empty", "2-2 room: only the host is seated, nothing auto-filled (" + types(d1) + ")");
ok(ids(await create(undefined)) === "A1,A2,B1,B2", "missing matchType defaults to 2-2");

// ---- 1-1: guest goes to B1, 2 humans can start with 0 BOT ----
ok((await call("POST", "/api/match/start", { room: s1.roomId }, s1.sessionToken)).status === 409, "1-1 with only the host cannot start");
const g = await join(s1.roomId);
ok(g.assignedSlot === "B1", "1-1 guest is seated at B1");
ok((await join(s1.roomId)).error === "ROOM_FULL", "1-1 third person is refused (ROOM_FULL)");
ok((await call("POST", "/api/match/start", { room: s1.roomId }, s1.sessionToken)).status === 200, "1-1 with 2 humans starts with 0 BOT");
ok(!(await state(s1.roomId, s1.sessionToken)).slots.some((s) => s.playerType === "bot"), "no BOT appeared by itself");

// ---- 1-1 with a BOT chosen by the host ----
const s2 = await create("singles");
ok((await bot(s2.roomId, s2.sessionToken, "A2")).body.slots.length === 2, "unknown seat A2 does nothing in 1-1");
await bot(s2.roomId, s2.sessionToken, "B1", { botDifficulty: "hard", botName: "Pro" });
const s2s = await state(s2.roomId, s2.sessionToken);
ok(s2s.slots.find((x) => x.slotId === "B1").playerType === "bot" && s2s.slots.find((x) => x.slotId === "B1").botDifficulty === "hard", "host adds a BOT with a level");
ok(s2s.canStart === true, "host + BOT can start 1-1");

// ---- 2-2: examples from the spec ----
const need = async (humans, bots) => {                         // humans = extra guests besides the host
  const r = await create("doubles"); const toks = [];
  for (let i = 0; i < humans; i++) toks.push((await join(r.roomId, "G" + i)).sessionToken);
  const st0 = await state(r.roomId, r.sessionToken);
  ok(st0.canStart === (humans === 3), `2-2 with ${humans + 1} humans, 0 BOT: canStart=${humans === 3}`);
  const empties = st0.slots.filter((s) => s.playerType === "empty").map((s) => s.slotId);
  ok(empties.length === 3 - humans, `2-2 with ${humans + 1} humans leaves ${3 - humans} seats for the host to decide`);
  for (const id of empties.slice(0, bots)) await bot(r.roomId, r.sessionToken, id);
  return (await state(r.roomId, r.sessionToken)).canStart;
};
ok(await need(0, 2) === false, "2-2: 1 human + 2 BOT cannot start (a seat is still empty)");
ok(await need(0, 3) === true, "2-2: 1 human + 3 BOT can start");
ok(await need(1, 1) === false && await need(1, 2) === true, "2-2: 2 humans need 2 BOT");
ok(await need(2, 1) === true, "2-2: 3 humans need 1 BOT");
ok(await need(3, 0) === true, "2-2: 4 humans need 0 BOT");

// ---- who may touch BOTs / seats ----
const r = await create("doubles");
const a = await join(r.roomId, "A"), b = await join(r.roomId, "B");           // A2, B1
await bot(r.roomId, r.sessionToken, "B2");
ok((await bot(r.roomId, a.sessionToken, "B2", { botDifficulty: "easy" })).status === 403, "guest cannot add/change a BOT");
ok((await call("POST", "/api/match/slot/update", { room: r.roomId, slotId: "B2", playerType: "empty" }, a.sessionToken)).status === 403, "guest cannot remove a BOT");
ok((await call("POST", "/api/match/team/update", { room: r.roomId, botDifficulty: "easy" }, a.sessionToken)).status === 403, "guest cannot change the BOT level");
ok((await join(r.roomId, "Thief")).error === "ROOM_FULL", "guest cannot take the BOT seat (room is full)");
ok((await call("POST", "/api/match/slot/move", { room: r.roomId, fromSlotId: a.assignedSlot, toSlotId: "B2" }, a.sessionToken)).status === 403, "guest cannot move onto a BOT seat");
ok((await call("POST", "/api/match/slot/move", { room: r.roomId, fromSlotId: a.assignedSlot, toSlotId: b.assignedSlot }, a.sessionToken)).status === 403, "guest cannot take another player's seat");
ok((await call("POST", "/api/match/slot/update", { room: r.roomId, slotId: b.assignedSlot, playerName: "Hack" }, a.sessionToken)).status === 403, "guest cannot edit someone else's seat");
ok((await call("POST", "/api/match/slot/update", { room: r.roomId, slotId: "B2", playerType: "human" }, r.sessionToken)).status === 400, "host cannot fake a 'human' seat");
await call("POST", "/api/match/slot/update", { room: r.roomId, slotId: "B2", botDifficulty: "normal" }, r.sessionToken);
ok((await call("POST", "/api/match/team/update", { room: r.roomId, botDifficulty: "pro" }, r.sessionToken)).status === 200, "host can change the BOT level (easy / normal / pro)");
ok((await call("POST", "/api/match/team/update", { room: r.roomId, botDifficulty: "<script>" }, r.sessionToken)).status === 200 && (await state(r.roomId, r.sessionToken)).botDifficulty === "pro", "invalid level is ignored");
await call("POST", "/api/match/slot/update", { room: r.roomId, slotId: "B2", playerType: "empty" }, r.sessionToken);
ok((await state(r.roomId, r.sessionToken)).slots.find((x) => x.slotId === "B2").playerType === "empty", "host removes a BOT -> seat is empty again");
const thief = await join(r.roomId, "Late");
ok(thief.assignedSlot === "B2", "a guest can take an EMPTY seat");

// ---- start: everything filled, then the lineup is frozen ----
ok((await call("POST", "/api/match/start", { room: r.roomId }, a.sessionToken)).status === 403, "guest cannot start");
ok((await call("POST", "/api/match/start", { room: r.roomId }, r.sessionToken)).status === 200, "host starts when all 4 seats are filled");
ok((await bot(r.roomId, r.sessionToken, "B2")).status === 409, "BOTs cannot be changed after the match started");
ok((await join(r.roomId, "Later")).error === "ALREADY_STARTED", "nobody joins a started match");

// ---- leaving: before start -> empty (no BOT), during a match -> BOT takes over (match cannot wait) ----
const l = await create("doubles"); const lg = await join(l.roomId);
await call("POST", "/api/match/leave", { room: l.roomId }, lg.sessionToken);
ok((await state(l.roomId, l.sessionToken)).slots.find((x) => x.slotId === lg.assignedSlot).playerType === "empty", "leaving the lobby frees the seat, no BOT");
const m = await create("singles"); const mg = await join(m.roomId);
await call("POST", "/api/match/start", { room: m.roomId }, m.sessionToken);
await sleep(300); await state(m.roomId, m.sessionToken);
ok((await state(m.roomId, m.sessionToken)).slots.find((x) => x.slotId === "B1").playerType === "bot", "a player who drops out DURING a running match is replaced (the only automatic BOT)");

// ---- changing the mode before start keeps rules ----
const c = await create("doubles"); const cg = await join(c.roomId);          // A2
await call("POST", "/api/match/team/update", { room: c.roomId, matchType: "singles" }, c.sessionToken);
const cs = await state(c.roomId, c.sessionToken);
ok(ids(cs) === "A1,B1", "switching 2-2 -> 1-1 leaves only A1, B1");
ok(cs.slots.find((x) => x.slotId === "B1").playerType === "human" && (await state(c.roomId, cg.sessionToken)).mySlot === "B1", "the guest from A2 is moved to B1 (not dropped, not turned into a BOT)");
await call("POST", "/api/match/team/update", { room: c.roomId, matchType: "doubles" }, c.sessionToken);
ok(types(await state(c.roomId, c.sessionToken)) === "A1:human A2:empty B1:human B2:empty", "switching back adds EMPTY seats only");

// ---- a new room never inherits seats or BOTs of an old one ----
const o1 = await create("doubles"); for (const id of ["A2", "B1", "B2"]) await bot(o1.roomId, o1.sessionToken, id);
await call("POST", "/api/match/leave", { room: o1.roomId, slotId: "A1" }, o1.sessionToken);          // host leaves -> room closed
const o2 = await create("doubles");
ok(o2.roomId !== o1.roomId && types(o2) === "A1:human A2:empty B1:empty B2:empty", "new room after leaving starts clean (" + types(o2) + ")");

// ---- client MatchManager ----
const mm = new MatchManager();
mm.initRoomLobbySlots("Host", "singles");
ok(mm.slots.map((x) => x.slotId).join() === "A1,B1" && mm.matchType === "singles", "client 1-1 lobby: A1, B1 only");
ok(!mm.slots.some((x) => x.playerType === "bot") && mm.canStart() === false, "client 1-1 lobby: no BOT, cannot start");
mm.initRoomLobbySlots("Host", "doubles");
ok(mm.slots.map((x) => x.slotId).join() === "A1,A2,B1,B2" && !mm.slots.some((x) => x.playerType === "bot"), "client 2-2 lobby: 4 seats, no BOT");
mm.addBotToTeam("B"); mm.addBotToTeam("B"); mm.addBotToTeam("A");
ok(mm.canStart() === true, "client: host added 3 BOTs -> can start");
mm.slots.find((x) => x.slotId === "A2").playerType = "human";
const before = mm.slots.map((x) => x.playerType).join();
ok(mm.addBotToTeam("A") === null && mm.slots.map((x) => x.playerType).join() === before, "client: adding a BOT never replaces a human or another BOT");
mm.initRoomLobbySlots("Host2", "doubles");
ok(!mm.slots.some((x) => x.playerType === "bot") && mm.slots[0].playerName === "Host2", "client: a new room does not keep old seats/BOTs");
const off = new MatchManager(); off.autoFillBots("doubles", "normal");
ok(off.slots.filter((x) => x.playerType === "bot").length === 3 && off.canStart(), "OFFLINE still auto-fills 3 BOTs for 2-2");
off.autoFillBots("singles", "normal");
ok(off.slots.filter((x) => x.playerType === "bot").length === 1, "OFFLINE still auto-fills 1 BOT for 1-1");

// ---- slot_roles by mode ----
ok(R.seatsFor("singles").join() === "A1,B1" && R.seatsFor("doubles").length === 4, "seatsFor");
ok(R.canControlSeat("singles", "RALLY", "A2") === false && R.canControlSeat("singles", "RALLY", "B1") === true, "1-1: A2/B2 cannot act, B1 can");
ok(R.canControlSeat("doubles", "SERVE_STANCE", "A2") === false && R.canControlSeat("doubles", "SERVE_STANCE", "A1") === true, "2-2: only A1/B1 serve");
ok(R.forceActorFor([{ slotId: "A1", playerType: "human" }, { slotId: "B1", playerType: "human" }], "A1", "singles") === null, "1-1: nobody is pinned");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
