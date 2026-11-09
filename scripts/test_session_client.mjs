// The real src/session_client.js against the real server: what a player's tab does when the host leaves,
// and that entering another room starts clean (the "old room is gone, can't play the new one" bug).
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 5600 + Math.floor(Math.random() * 300);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const srv = spawn(process.execPath, ["server.js"], { cwd: root, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
let passed = 0, failed = 0;
const ok = (c, n) => { if (c) passed++; else { failed++; console.error("  ✗ FAIL:", n); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const realFetch = globalThis.fetch;

// ---- browser stubs ----
const store = new Map();
const loc = { _href: ORIGIN + "/?room=", origin: ORIGIN, search: "", get href() { return this._href; }, set href(v) { this._href = v; this.navigations.push(v); }, navigations: [] };
const els = [];
const mkEl = () => ({ style: {}, children: [], appendChild(c) { this.children.push(c); }, setAttribute() {}, set textContent(v) { this._t = v; this.children = []; }, get textContent() { return this._t || ""; } });
globalThis.window = globalThis;
globalThis.location = loc;
globalThis.sessionStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
globalThis.document = { body: { appendChild: (e) => els.push(e) }, createElement: () => mkEl() };
globalThis.dispatchEvent = () => true;
globalThis.fetch = (u, i) => realFetch(typeof u === "string" && u.startsWith("/") ? ORIGIN + u : u, i);
await import("../src/session_client.js");
const bannerEl = () => els[0];
const bannerText = () => (bannerEl() && bannerEl().style.display !== "none" ? bannerEl().textContent : "");
const J = (p, b) => fetch(p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b || {}) });
const S = (room) => fetch(`/api/match/state?room=${room}`);

try {
  for (let i = 0; i < 50; i++) { try { await realFetch(ORIGIN + "/api/match/state?room=10150"); break; } catch { await sleep(100); } }
  // Two "tabs" cannot share sessionStorage in this stub, so: host acts through the raw server API, the guest tab is this stub.
  const raw = (p, b, t) => realFetch(ORIGIN + p, { method: "POST", headers: { "Content-Type": "application/json", ...(t ? { "X-Session": t } : {}) }, body: JSON.stringify(b || {}) }).then((r) => r.json());
  const h1 = await raw("/api/match/create", { p1Name: "Host" });
  const g = await (await J("/api/match/slot/join", { room: h1.roomId, playerName: "Guest" })).json();
  ok(!!window.hachihiSession.get(h1.roomId), "guest tab stored its session on join");
  ok((await S(h1.roomId)).status === 200 && bannerText() === "", "playing normally: no banner");

  // host leaves
  await raw("/api/match/leave", { room: h1.roomId, slotId: "A1" }, h1.sessionToken);
  const r = await S(h1.roomId);
  ok(r.status === 410, "guest poll sees the closed room");
  ok(/Chủ phòng đã đóng phòng/.test(bannerText()), "guest sees 'host closed the room' (" + bannerText() + ")");
  await sleep(2800);
  ok(loc.navigations.length === 1 && loc.navigations[0] === ORIGIN + "/", "guest is sent to the menu automatically");
  ok(!window.hachihiSession.get(h1.roomId), "old session is forgotten");

  // ---- the reported bug: host makes another room, the guest must be able to play it ----
  loc.navigations.length = 0;
  const h2 = await raw("/api/match/create", { p1Name: "Host" });
  const g2 = await (await J("/api/match/slot/join", { room: h2.roomId, playerName: "Guest" })).json();
  ok(!!g2.sessionToken && g2.assignedSlot, "guest joins the NEW room");
  ok(bannerText() === "", "stale 'room gone' banner is cleared when entering the new room");
  // an old-room poll that is still in flight / looping must not bring the banner back or redirect
  await S(h1.roomId);
  await sleep(300);
  ok(bannerText() === "" && loc.navigations.length === 0, "late polls of the old room are ignored");
  ok((await S(h2.roomId)).status === 200 && bannerText() === "", "new room polls fine");
  ok((await J("/api/racket/swing", { room: h2.roomId, speed: 1.2, shotType: "topspin" })).status === 200, "guest swing is accepted in the new room (session header attached)");
  await raw("/api/match/team/update", { room: h2.roomId, botDifficulty: "hard" }, h2.sessionToken);
  const st = await (await S(h2.roomId)).json();
  ok(st.mySlot === g2.assignedSlot && st.botDifficulty === "hard", "guest sees its seat and the host's settings");

  // quick re-entry: new room entered while the exit timer of the old one is still pending -> no redirect
  const h3 = await raw("/api/match/create", { p1Name: "H3" });
  await J("/api/match/slot/join", { room: h3.roomId, playerName: "G" });
  await raw("/api/match/close", { room: h3.roomId }, h3.sessionToken);
  await S(h3.roomId);                                   // banner + 2.5 s exit timer start
  const h4 = await raw("/api/match/create", { p1Name: "H4" });
  await J("/api/match/slot/join", { room: h4.roomId, playerName: "G" });   // player joins another room straight away
  loc.navigations.length = 0;
  await sleep(2800);
  ok(loc.navigations.length === 0 && bannerText() === "", "joining another room cancels the pending exit");

  // explicit leave from the guest side
  await window.hachihiLeaveRoom(h4.roomId, false);
  ok(!window.hachihiSession.get(h4.roomId), "hachihiLeaveRoom forgets the session");
  const after = await (await realFetch(`${ORIGIN}/api/match/state?room=${h4.roomId}`)).json();
  ok(after.slots.filter((s) => s.playerType === "human").length === 1, "guest seat was released on the server");
} catch (e) { failed++; console.error("  ✗ aborted:", e.stack || e.message); }
finally { srv.kill(); }
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
