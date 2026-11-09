// Step 2 checks: slot<->role rules, plus static "wiring" checks that the engine and motion
// controller really route by slot (the engine itself needs WebGL, so it cannot run in CI).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as R from "../src/slot_roles.js";
import { MatchManager } from "../src/match_manager.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0, failed = 0;
const ok = (c, n) => { if (c) passed++; else { failed++; console.error("  ✗ FAIL:", n); } };
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

// mapping is a bijection and matches the server
ok(Object.entries(R.ROLE_BY_SLOT).every(([s, r]) => R.SLOT_BY_ROLE[r] === s), "ROLE_BY_SLOT and SLOT_BY_ROLE are inverse");
const api = read("server/api.js");
ok(api.includes('ROLE_BY_SLOT = { A1: "p1", B1: "p2", A2: "p3", B2: "p4" }'), "server ROLE_BY_SLOT matches client mapping");
ok(R.slotForRole("p3") === "A2" && R.slotForRole("p4") === "B2" && R.slotForRole("p1") === "A1" && R.slotForRole("p2") === "B1", "role -> slot");
ok(R.slotForRole(undefined) === "B1", "unknown role falls back to B1 (legacy guest)");
ok(R.normRole("P3") === "p3" && R.normRole("opponent") === "p2" && R.normRole("x") === "p1", "normRole");
ok(R.teamOfSlot("A2") === "A" && R.teamOfSlot("B2") === "B", "teamOfSlot");

// who gets pinned to their own actor
const h = (id) => ({ slotId: id, playerType: "human" });
const b = (id) => ({ slotId: id, playerType: "bot" });
ok(R.forceActorFor([h("A1"), b("A2")], "A1") === null, "lone human with bot partner keeps legacy behaviour");
ok(R.forceActorFor([h("A1"), h("A2")], "A1") === "A1", "host pinned to A1 when A2 is human");
ok(R.forceActorFor([h("A1"), h("A2")], "A2") === "A2", "A2 pinned to A2");
ok(R.forceActorFor([h("B1"), b("B2")], "B2") === "B2", "partner seat always pinned");
ok(R.forceActorFor([h("B1"), h("B2")], "B1") === "B1", "B1 pinned when B2 human");
ok(R.forceActorFor([], "B1") === null && R.forceActorFor(null, "A1") === null, "no slot info -> legacy");
ok(R.forceActorFor([], "Z9") === null, "unknown slot -> null");
ok(R.isServeBlocked("SERVE_STANCE", "A2") && R.isServeBlocked("SERVE_TOSS", "B2"), "partners cannot serve");
ok(!R.isServeBlocked("SERVE_STANCE", "A1") && !R.isServeBlocked("RALLY", "A2") && !R.isServeBlocked("TITLE", "B2"), "servers/rally/title not blocked");

// wiring in the engine
const eng = read("src/game_engine.js");
for (const [needle, name] of [
  ["_routeSlotInput(i,!1)", "engine routes remote swings by slot"],
  ["_routeSlotInput(i,!0)", "engine routes remote tosses by slot"],
  ["onSwing:i=>this._handleLocalSwing(i)", "host input pinned through _handleLocalSwing"],
  ['e.slotActor==="A2"||e.slotActor!=="A1"', "team A strike honours slotActor"],
  ['r=e.slotActor==="B2"||e.slotActor!=="B1"', "team B strike honours slotActor"],
  ["this._viewTeamB()?!p:p", "victory perspective follows team"],
  ["e===this._localActor()", "phone orientation follows the local actor"],
  ["role:this.controlRole", "motion controller gets the slot role"],
]) ok(eng.includes(needle), name);
ok(!eng.includes('this.playerRole==="p2"?(t.set(this.opponent.pos.x'), "camera no longer keyed on host/guest");

const mc = read("src/motion_controls.js");
ok(mc.includes('role:this.role,cid:this._newCid(),type:"swing"') && mc.includes("&role=${this.role}"), "guest posts swings with its own role");
ok(mc.includes("_pollExtraRoles(a)") && mc.includes('["p3","p4"]'), "host polls p3/p4 swings");
ok(!mc.includes('role:"p2",type:"swing"'), "no hard-coded p2 swing post left");

// Execute the real routing methods extracted from the engine source against a fake engine.
{
  const a = eng.indexOf("_viewTeamB(){"), z = eng.indexOf("_handleUserSwingInput(e={}){");
  const Cls = new Function("__sr", "return class E{" + eng.slice(a, z) + "}")(R);
  const mk = (slots, extra = {}) => {
    const e = new Cls();
    e.matchManager = { slots };
    e.calls = [];
    e.phase = "RALLY"; e.playerRole = "p1"; e.viewTeam = "A"; e.localSlot = "A1";
    for (const n of ["_handleUserSwingInput", "_handleUserTossInput", "_handleP2SwingInput", "_handleP2TossInput"]) e[n] = (ev) => { e.calls.push([n, ev.slotActor]); return true; };
    Object.assign(e, extra);
    return e;
  };
  const full = [h("A1"), h("A2"), h("B1"), h("B2")];
  let e = mk(full);
  e._routeSlotInput({ role: "p3" }); e._routeSlotInput({ role: "p4" }); e._routeSlotInput({ role: "p2" }); e._handleLocalSwing({});
  ok(JSON.stringify(e.calls) === JSON.stringify([["_handleUserSwingInput", "A2"], ["_handleP2SwingInput", "B2"], ["_handleP2SwingInput", "B1"], ["_handleUserSwingInput", "A1"]]),
    "4 humans: p3->A2, p4->B2, p2->B1, host->A1, each pinned to its own actor");
  e = mk([h("A1"), b("A2"), h("B1"), b("B2")]);
  e._routeSlotInput({ role: "p2" }); e._handleLocalSwing({});
  ok(JSON.stringify(e.calls) === JSON.stringify([["_handleP2SwingInput", null], ["_handleUserSwingInput", null]]), "2 humans + bots: legacy behaviour, no pinning");
  e = mk(full, { phase: "SERVE_STANCE" });
  ok(e._routeSlotInput({ role: "p3" }) === false && e.calls.length === 0, "A2 swing during serve is ignored");
  e._routeSlotInput({ role: "p1" }); e._routeSlotInput({ role: "p2" }, true);
  ok(e.calls.length === 2 && e.calls[1][0] === "_handleP2TossInput", "server seats still serve; toss goes to team B handler");
  e = mk([h("A1"), h("A2"), h("B1"), b("B2")], { localSlot: "A2", viewTeam: "A" });
  ok(e._viewTeamB() === false && e._forcedSlotFor("A2") === "A2", "A2 guest views from team A");
  e.viewTeam = "B";
  ok(e._viewTeamB() === true, "B guest views from team B");
  e = mk(full, { localSlot: "B2", player: "P", playerPartner: "PP", opponent: "O", opponentPartner: "OP" });
  ok(e._localActor() === "OP", "local actor for B2 is opponentPartner");
}

// seat follows the server (guest moved by host / re-seated), host never does
{
  const g = new MatchManager({ roomId: "12345" });
  g.isHost = false; g.localPlayerSlot = "A2";
  g.syncFromServer({ mySlot: "B2", sound: { music: false, sfx: true }, slots: [] });
  ok(g.localPlayerSlot === "B2", "guest localPlayerSlot follows server mySlot");
  ok(g.sound.music === false && g.sound.sfx === true, "sound setting synced to client");
  const h = new MatchManager({ roomId: "12345" });
  h.isHost = true; h.localPlayerSlot = "A1";
  h.syncFromServer({ mySlot: "B1" });
  ok(h.localPlayerSlot === "A1", "host seat is not overwritten");
}
// UI wiring
{
  const hud = read("src/hud_ui.js"), html = read("index.html");
  ok(html.includes('id="guest-join-card"') && html.includes('id="gjc-name"') && html.includes('id="gjc-start"'), "join card has name field and start button");
  ok(eng.includes("showGuestJoinCard(this.urlRoom)"), "share link opens the join card instead of auto-joining");
  ok(hud.includes("syncFromServer(data);   // always start from the server's latest"), "lobby syncs final server state before starting");
  ok(hud.includes("_postRoomSetting({ scenery: scId })"), "host scenery choice is sent to the server");
  ok(html.includes('id="lobby-sound-music"') && eng.includes("setMusicVolume&&this.audioEngine.setMusicVolume(__sd.music"), "host sound setting is applied at match start");
  ok(eng.includes("this._onlineLobby||this._applyDifficultyTuning"), "guest swings no longer reset host difficulty/length");
}

// index.html loads session wrapper before the engine
const idx = read("index.html");
ok(idx.indexOf("session_client.js") > 0 && idx.indexOf("session_client.js") < idx.indexOf("game_engine.js"), "session_client loads before engine");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
