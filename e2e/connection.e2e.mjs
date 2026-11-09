// Browser test of the Render failure modes: server unreachable, server restarted (rooms lost), host silent.
// Spawns its own server so it can kill/restart it.  npm i --no-save playwright && node e2e/connection.e2e.mjs
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 5300 + Math.floor(Math.random() * 300), BASE = `http://127.0.0.1:${PORT}`;
let srv; const start = () => (srv = spawn(process.execPath, ["server.js"], { cwd: root, env: { ...process.env, PORT: String(PORT), ROOM_ONLINE_MS: "3000" }, stdio: "ignore" }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 9000) => { const t = Date.now(); for (;;) { const v = await fn(); if (v || Date.now() - t > ms) return v; await sleep(250); } };
let passed = 0, failed = 0; const ok = (c, n) => { if (c) { passed++; console.log("  ✓", n); } else { failed++; console.error("  ✗ FAIL:", n); } };
start(); for (let i = 0; i < 50; i++) { try { await fetch(BASE + "/healthz"); break; } catch { await sleep(100); } }
const browser = await chromium.launch();
try {
  const mk = async () => { const p = await (await browser.newContext({ viewport: { width: 900, height: 700 } })).newPage(); await p.route("**/*", (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort())); await p.goto(BASE, { waitUntil: "domcontentloaded" }); return p; };
  const banner = (p) => p.evaluate(() => { const e = document.getElementById("net-status-banner"); return e && getComputedStyle(e).display !== "none" ? e.textContent : null; });

  // Offline play: no room, no token -> never shows a connection banner even when /api is unreachable
  const solo = await mk();
  await solo.evaluate(() => { for (let i = 0; i < 6; i++) fetch("/api/match/state?room=default&role=p1&touch=1").catch(() => {}); });
  srv.kill(); await sleep(4500);
  await solo.evaluate(() => { fetch("/api/match/state?room=default&role=p1&touch=1").catch(() => {}); }); await sleep(400);
  ok((await banner(solo)) === null, "Offline/solo: no connection banner while the server is down");
  start(); for (let i = 0; i < 50; i++) { try { await fetch(BASE + "/healthz"); break; } catch { await sleep(100); } }

  // Online room: host + guest
  const host = await mk(), guest = await mk();
  const room = await host.evaluate(async () => (await (await fetch("/api/match/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ p1Name: "H" }) })).json()).roomId);
  await guest.evaluate(async (r) => { await fetch("/api/match/slot/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room: r, playerName: "G" }) }); }, room);
  const pollJs = (r, sync) => { window.__t && clearInterval(window.__t); window.__t = setInterval(() => { fetch(`/api/match/state?room=${r}&role=p2`).catch(() => {}); if (sync) fetch("/api/match/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room: r, snapshot: { phase: "RALLY" } }) }).catch(() => {}); }, 100); };
  await host.evaluate(pollJs, room);
  await guest.evaluate(pollJs, room);
  await host.evaluate(async (r) => { await fetch("/api/match/slot/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room: r, slotId: "B1", playerType: "bot" }) }); await fetch("/api/match/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room: r }) }); }, room);
  await sleep(1200);
  ok((await banner(guest)) === null, "healthy room: no banner");

  // Host stops (tab frozen): guest is told
  await host.evaluate(() => clearInterval(window.__t));
  ok(await until(async () => /Chủ phòng/.test((await banner(guest)) || "")), "guest sees 'host lost connection' banner");
  await host.evaluate(pollJs, room);
  ok(await until(async () => (await banner(guest)) === null), "banner clears when the host is back");

  // Server unreachable, then back with the SAME rooms impossible (RAM) -> restart = room gone
  srv.kill(); await sleep(1000);
  ok(await until(async () => /Mất kết nối/.test((await banner(guest)) || "")), "guest sees 'connection lost' banner while the server is down");
  start(); for (let i = 0; i < 50; i++) { try { await fetch(BASE + "/healthz"); break; } catch { await sleep(100); } }
  ok(await until(async () => /không còn tồn tại/.test((await banner(guest)) || "")), "after a server restart the guest gets 'room no longer exists' (not a silent freeze)");
  ok(await guest.evaluate(() => !!document.querySelector("#net-status-banner button")), "banner offers a way back to the menu");
} catch (e) { failed++; console.error("  ✗ aborted:", e.message); }
finally { await browser.close(); srv.kill(); }
console.log(`\n${passed} passed, ${failed} failed`); process.exit(failed ? 1 : 0);
