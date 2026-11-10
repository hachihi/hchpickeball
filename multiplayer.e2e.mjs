// Browser E2E for 2/3/4 players. NOT part of `npm test` (needs a real browser).
//   npm i --no-save playwright && npx playwright install chromium
//   node server.js &            (or deploy URL)   -> BASE_URL=http://localhost:3000 PLAYERS=4 node e2e/multiplayer.e2e.mjs
// Env: BASE_URL (default http://localhost:3000), PLAYERS=2|3|4 (default 4), HOLD_SECONDS (default 70), HEADED=1
// Status: run against 2 players on 2026-11-09 (selectors fixed: #btn-choice-multi first, join button scrolled into view).
// 4 browsers at once is heavy on CPU-only machines (software WebGL) - use PLAYERS=2 there.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const PLAYERS = Math.min(4, Math.max(2, Number(process.env.PLAYERS || 4)));
const HOLD = Number(process.env.HOLD_SECONDS || 70);
let passed = 0, failed = 0;
const ok = (c, n) => { if (c) { passed++; console.log("  ✓", n); } else { failed++; console.error("  ✗ FAIL:", n); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: !process.env.HEADED });
const pages = [];
const errors = [];
try {
  for (let i = 0; i < PLAYERS; i++) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });   // separate context = separate sessionStorage
    const page = await ctx.newPage();
    await page.route("**/*", (r) => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
    page.on("pageerror", (e) => errors.push(`P${i + 1}: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error" && !/favicon|404/.test(m.text())) errors.push(`P${i + 1} console: ${m.text()}`); });
    pages.push(page);
  }
  const [host, ...guests] = pages;
  const state = (page, room, extra = "") => page.evaluate(async ([r]) => (await fetch(`/api/match/state?room=${r}`)).json(), [room]);

  // ---- host creates the room ----
  await host.goto(BASE, { waitUntil: "domcontentloaded" });
  await host.click("#btn-choice-multi");
  await host.$eval("#btn-create-multi-room", (e) => e.scrollIntoView({ block: "center" })); await host.click("#btn-create-multi-room");
  await host.waitForFunction(() => /^\d{5}$/.test((document.querySelector("#lobby-room-code-val")?.textContent || "").trim()), null, { timeout: 15000 });
  const room = (await host.textContent("#lobby-room-code-val")).trim();
  ok(/^\d{5}$/.test(room), `host created room ${room}`);
  ok(!!(await host.evaluate((r) => sessionStorage.getItem("hachihi.session." + r), room)), "host session token stored in the browser");

  // ---- guests join by code ----
  for (const [i, g] of guests.entries()) {
    await g.goto(BASE, { waitUntil: "domcontentloaded" });
    await g.click("#btn-choice-multi");
    await g.fill("#input-join-room-code", room);
    await g.$eval("#btn-submit-join-room", (e) => e.scrollIntoView({ block: "center" })); await g.click("#btn-submit-join-room");
    await g.waitForFunction((r) => !!sessionStorage.getItem("hachihi.session." + r), room, { timeout: 15000 });
    ok(true, `guest ${i + 1} joined and holds a session token`);
    await sleep(300);
  }
  let st = await state(host, room);
  const humans = st.slots.filter((s) => s.playerType === "human").length;
  ok(humans === PLAYERS, `${PLAYERS} human seats in server state (got ${humans})`);
  const mine = [];
  for (const p of pages) mine.push((await p.evaluate(async (r) => (await fetch(`/api/match/state?room=${r}`)).json(), room)).mySlot);
  ok(new Set(mine).size === PLAYERS && mine[0] === "A1", `every browser sees its own distinct seat: ${mine.join(", ")}`);

  // ---- fill empty seats with bots (so both teams exist), host starts ----
  for (const s of st.slots.filter((x) => x.playerType === "empty")) {
    await host.evaluate(async ([r, id]) => fetch("/api/match/slot/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room: r, slotId: id, playerType: "bot", botDifficulty: "normal" }) }), [room, s.slotId]);
  }
  await sleep(1500);
  await host.click("#btn-tank-start-match");
  await host.waitForFunction(async (r) => (await (await fetch(`/api/match/state?room=${r}`)).json()).started === true, room, { timeout: 15000 });
  ok(true, "host started the match");
  await sleep(4000);

  // ---- hold the match: nobody may be swapped for a BOT ----
  console.log(`  … holding ${HOLD}s (guests must keep their seats)`);
  const t0 = Date.now(); let lost = null;
  while (Date.now() - t0 < HOLD * 1000) {
    st = await state(host, room);
    const now = st.slots.filter((s) => s.playerType === "human").length;
    if (now < PLAYERS) { lost = st.slots.map((s) => `${s.slotId}:${s.playerType}`).join(" "); break; }
    await sleep(2000);
  }
  ok(!lost, "no human was replaced by a BOT during the hold" + (lost ? ` (${lost})` : ""));

  // ---- reload a guest tab mid-match: same seat ----
  if (guests.length) {
    const g = guests[guests.length - 1];
    const before = mine[mine.length - 1];
    await g.reload();
    await sleep(2500);
    const after = (await g.evaluate(async (r) => (await fetch(`/api/match/state?room=${r}`)).json(), room)).mySlot;
    ok(after === before, `reloaded guest keeps seat ${before} (got ${after})`);
  }
  ok(errors.length === 0, "no page errors / console errors" + (errors.length ? ":\n    " + errors.slice(0, 8).join("\n    ") : ""));
  console.log("\nManual follow-ups (see HANDOFF.md section 5): swing ownership, camera per team, serve rules, input lag.");
} catch (e) {
  failed++; console.error("  ✗ E2E aborted:", e.message);
} finally {
  await browser.close();
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
