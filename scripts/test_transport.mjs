// Guest -> host swing transport, using the REAL MotionController (src/motion_controls.js) in Node
// with a tiny DOM stub, against the REAL server.js. Checks: right role, delivered once, fast (SSE),
// and still delivered when SSE is unavailable (poll fallback).
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4800 + Math.floor(Math.random() * 300);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const srv = spawn(process.execPath, ["server.js"], { cwd: root, env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
let passed = 0, failed = 0;
const ok = (c, n) => { if (c) passed++; else { failed++; console.error("  ✗ FAIL:", n); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- minimal browser stubs ----
const realFetch = globalThis.fetch;
const noop = () => {};
const fakeCtx = new Proxy({}, { get: () => noop });
const fakeEl = () => ({ getContext: () => fakeCtx, style: {}, classList: { add: noop, remove: noop, toggle: noop }, addEventListener: noop, appendChild: noop, setAttribute: noop, width: 0, height: 0 });
globalThis.window = globalThis;
globalThis.document = { createElement: fakeEl, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, head: fakeEl(), body: fakeEl() };
globalThis.location = { href: ORIGIN + "/", origin: ORIGIN, protocol: "http:", hostname: "127.0.0.1" };
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = noop;
globalThis.addEventListener = noop; globalThis.removeEventListener = noop;
let slowPostMs = 0;   // simulate a slow network: the swing POST reply arrives late, so a poll can see our own swing first
const tokenByRole = {};   // in a browser, src/session_client.js attaches the tab's own token; here one wrapper plays every tab
globalThis.fetch = async (u, i) => {
  let init = i;
  const role = typeof u === "string" && /[?&]role=(p[1-4])/.exec(u);
  if (role && tokenByRole[role[1]]) init = { ...(i || {}), headers: { ...((i && i.headers) || {}), "X-Session": tokenByRole[role[1]] } };
  const r = await realFetch(typeof u === "string" && u.startsWith("/") ? ORIGIN + u : u, init);
  if (slowPostMs && typeof u === "string" && u.includes("/api/racket/swing")) await sleep(slowPostMs);
  return r;
};
class FakeEventSource {                       // enough SSE for this test
  constructor(url) { this.l = {}; this.ctl = new AbortController(); this._run(url); }
  addEventListener(n, f) { (this.l[n] ||= []).push(f); }
  close() { this.ctl.abort(); }
  async _run(url) {
    try {
      const r = await realFetch(ORIGIN + url, { signal: this.ctl.signal });
      const dec = new TextDecoder(); let buf = "";
      for await (const chunk of r.body) {
        buf += dec.decode(chunk, { stream: true });
        let i;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const block = buf.slice(0, i); buf = buf.slice(i + 2);
          const ev = /^event: (.+)$/m.exec(block), data = /^data: (.+)$/m.exec(block);
          if (ev && data) for (const f of this.l[ev[1]] || []) f({ data: data[1] });
        }
      }
    } catch {}
  }
}

const { MotionController } = await import("../src/motion_controls.js");
const api = (p, b) => realFetch(ORIGIN + p, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b || {}) }).then((r) => r.json());

async function scenario(label, withSSE, slow = 0) {
  console.log(`  — ${label}`);
  slowPostMs = slow;
  if (withSSE) globalThis.EventSource = FakeEventSource; else delete globalThis.EventSource;
  const c = await api("/api/match/create", { p1Name: "Host" });
  const room = c.roomId;
  tokenByRole.p1 = c.sessionToken;
  for (const [role, name] of [["p3", "A2"], ["p2", "B1"], ["p4", "B2"]]) {   // join order gives seats A2, B1, B2
    const g = await api("/api/match/slot/join", { room, playerName: name });
    tokenByRole[role] = g.sessionToken;
  }
  const mk = (role) => {
    const got = { swings: [], tosses: [] };
    const mc = new MotionController({ roomId: room, role, onP2Swing: (e) => got.swings.push({ ...e, t: Date.now() }), onP2Toss: (e) => { got.tosses.push(e); return true; } });
    return { mc, got, role };
  };
  const host = mk("p1"), g2 = mk("p2"), g3 = mk("p3"), g4 = mk("p4");
  await sleep(400);   // streams connected, first poll done

  // guest A2 (p3) swings
  const t0 = Date.now();
  g3.mc._emitSwing({ source: "mouse", shotType: "smash", speed: 1.4, dirX: 0.3 });
  await sleep(500);
  const hs = host.got.swings.filter((e) => e.role === "p3");
  ok(hs.length === 1, `${label}: host receives p3 swing exactly once (got ${hs.length})`);
  ok(hs[0] && hs[0].shotType === "smash" && Math.abs(hs[0].dirX - 0.3) < 1e-6, `${label}: host sees the swing's shot type and direction`);
  if (withSSE && hs[0]) ok(hs[0].t - t0 < 200, `${label}: delivered fast (${hs[0].t - t0}ms)`);
  ok(g3.got.swings.filter((e) => e.role === "p3").length === 1, `${label}: guest's own swing applied once locally (no echo duplicate)`);
  ok(g2.got.swings.filter((e) => e.role === "p3").length === 1, `${label}: other guests also see it once`);

  // B1 (p2) and B2 (p4)
  g2.mc._emitSwing({ source: "mouse", shotType: "topspin", speed: 1.1, dirX: -0.2 });
  g4.mc._emitSwing({ source: "mouse", shotType: "lob", speed: 1.0, dirX: 0 });
  await sleep(500);
  ok(host.got.swings.filter((e) => e.role === "p2").length === 1, `${label}: host receives p2 swing once`);
  ok(host.got.swings.filter((e) => e.role === "p4").length === 1, `${label}: host receives p4 swing once`);
  ok(g2.got.swings.filter((e) => e.role === "p2").length === 1, `${label}: p2 guest not duplicated`);

  // two quick swings in a row from the same guest both arrive
  g3.mc._emitSwing({ source: "mouse", shotType: "topspin", speed: 1.1 });
  await sleep(15);
  g3.mc._emitSwing({ source: "mouse", shotType: "slice", speed: 1.1 });
  await sleep(500);
  ok(host.got.swings.filter((e) => e.role === "p3").length === 3, `${label}: back-to-back swings both reach the host`);

  // toss (serve) from p2 reaches the host as a toss
  g2.mc._emitToss({ source: "mouse", shotType: "lob", speed: 1.1 });
  await sleep(500);
  ok(host.got.tosses.some((e) => e.role === "p2"), `${label}: serve toss from p2 reaches host`);
  for (const x of [host, g2, g3, g4]) { try { x.mc.dispose(); } catch {} }
}

try {
  for (let i = 0; i < 50; i++) { try { await realFetch(ORIGIN + "/api/match/state?room=10150"); break; } catch { await sleep(100); } }
  await scenario("SSE push", true);
  await scenario("poll fallback (no EventSource)", false);
  await scenario("SSE + slow network (POST reply 200ms late)", true, 200);
  await scenario("poll + slow network (POST reply 200ms late)", false, 200);
} catch (e) {
  failed++; console.error("  ✗ aborted:", e.stack || e.message);
} finally { srv.kill(); }
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
