// Tests run against the REAL rules module used by the game (src/rules_engine.js).
// Run: npm test
import fs from "node:fs";
import {
  createInitialScore, applyRallyResult, getGameWinner, startNextGame,
  isTwoBounceViolation, isKitchenVolleyFault, NVZ_DEPTH_M,
} from "../src/rules_engine.js";

let passed = 0, failed = 0;
function ok(cond, name) { if (cond) { passed++; } else { failed++; console.error("  ✗ FAIL:", name); } }
function eq(a, b, name) { ok(a === b, `${name} (got ${a}, expected ${b})`); }
const rally = (s, w, type = "doubles") => applyRallyResult(s, w, { matchType: type });

// 1. Doubles opening: 0-0-2, first fault is an immediate side-out
{
  const s = createInitialScore();
  eq(s.serverNumber, 2, "start at server 2"); ok(s.deuceSide, "start from right court");
  eq(rally(s, "opponent"), "SIDE_OUT", "0-0-2 fault => side-out");
  eq(s.server, "opponent", "serve passes"); eq(s.serverNumber, 1, "new team server 1"); ok(s.deuceSide, "new team serves from right");
}

// 2. Server 1 fault => Server 2 serves from the OPPOSITE court (regression for real-game bug)
{
  const s = createInitialScore(); rally(s, "opponent");           // opponent now 0-0-1, right
  eq(rally(s, "opponent"), "POINT_SCORED", "point"); ok(!s.deuceSide, "after 1 point serve from left");
  eq(rally(s, "player"), "SECOND_SERVER", "server 1 fault");
  ok(s.deuceSide, "server 2 serves from right (opposite of server 1's last court)");
  const t = createInitialScore(); rally(t, "opponent");           // 0-0-1 right
  rally(t, "player");                                              // server 1 faults with no point
  ok(!t.deuceSide, "no-point fault: server 2 serves from LEFT (opposite of right)");
}

// 3. Independent oracle: track the two partners' real courts and compare with deuceSide
{
  let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  let bad = 0, checks = 0;
  for (let g = 0; g < 400; g++) {
    const s = createInitialScore();
    // team positions: who is on the right court (0 or 1); server index within team
    const team = { player: { right: 0 }, opponent: { right: 0 } };
    let serverPlayer = 1; // first server of game is "Server 2" = partner index 1? by rule the serving player starts on right
    serverPlayer = team.player.right; // start of game: the server stands on the right court
    for (let r = 0; r < 60; r++) {
      const sTeam = s.server;
      const serverIsRight = team[sTeam].right === serverPlayer;
      checks++; if (serverIsRight !== s.deuceSide) bad++;
      const winner = rnd() < 0.5 ? s.server : (s.server === "player" ? "opponent" : "player");
      const ev = rally(s, winner);
      if (ev === "POINT_SCORED") { team[sTeam].right = 1 - team[sTeam].right; }                 // partners swap courts
      else if (ev === "SECOND_SERVER") { serverPlayer = 1 - serverPlayer; }                      // partner serves
      else { serverPlayer = team[s.server].right; }                                              // side-out: right-court player serves
      const w = getGameWinner(s, 11);
      if (w) break;
    }
  }
  eq(bad, 0, `doubles serve court matches real player positions in ${checks} serves`);
}

// 4. Singles: court follows own score parity, also after side-out with odd score
{
  const s = createInitialScore();
  rally(s, "player"); rally(s, "player");                          // 2-0
  rally(s, "opponent", "singles");                                 // side-out -> opponent has 0 pts => right
  eq(s.server, "opponent", "singles side-out"); ok(s.deuceSide, "0 pts => right");
  rally(s, "opponent", "singles");                                 // opp 1 pt
  ok(!s.deuceSide, "1 pt => left");
  rally(s, "player", "singles");                                   // side-out back: player has 2 => right
  ok(s.deuceSide, "2 pts => right");
  const t = createInitialScore(); t.playerPoints = 3; t.server = "opponent"; t.opponentPoints = 5;
  rally(t, "player", "singles"); ok(!t.deuceSide, "singles side-out onto ODD score => left");
}

// 5. Win by 2, overtime, game rollover, match
{
  const s = createInitialScore(); s.playerPoints = 10; s.opponentPoints = 10;
  eq(getGameWinner(s), null, "10-10 no winner"); s.playerPoints = 11; eq(getGameWinner(s), null, "11-10 not enough");
  s.playerPoints = 12; eq(getGameWinner(s), "player", "12-10 wins");
  s.server = "player"; s.serverNumber = 1; s.deuceSide = false;
  startNextGame(s, "player");
  eq(s.playerGames, 1, "game credited"); eq(s.playerPoints + s.opponentPoints, 0, "points reset");
  eq(s.serverNumber, 2, "0-0-2 for new game"); ok(s.deuceSide, "right court"); eq(s.server, "opponent", "serve alternates");
  const o = createInitialScore(); o.playerPoints = 11; o.opponentPoints = 0; eq(getGameWinner(o), "player", "11-0");
}

// 6. Two-bounce: real rally situations
{
  ok(isTwoBounceViolation(1, 0), "return of serve volleyed => fault");
  ok(!isTwoBounceViolation(1, 1), "return after bounce legal");
  ok(isTwoBounceViolation(2, 0), "3rd shot volleyed => fault");
  ok(!isTwoBounceViolation(2, 1), "3rd shot after bounce legal");
  ok(!isTwoBounceViolation(3, 0), "4th shot volley legal");
  ok(!isTwoBounceViolation(5, 0), "later volleys legal");
}

// 7. Kitchen
{
  const z = NVZ_DEPTH_M;
  ok(isKitchenVolleyFault({ bouncesOnSide: 0, actorZ: 1.0, side: 1 }), "volley inside kitchen (player half)");
  ok(isKitchenVolleyFault({ bouncesOnSide: 0, actorZ: -1.0, side: -1 }), "volley inside kitchen (opponent half)");
  ok(!isKitchenVolleyFault({ bouncesOnSide: 1, actorZ: 1.0, side: 1 }), "bounced ball in kitchen is legal");
  ok(!isKitchenVolleyFault({ bouncesOnSide: 0, actorZ: z + 0.5, side: 1 }), "volley from behind the line legal");
  ok(!isKitchenVolleyFault({ bouncesOnSide: 0, actorZ: -(z + 0.5), side: -1 }), "volley from behind line legal (opp)");
  ok(isKitchenVolleyFault({ bouncesOnSide: 0, actorZ: z, side: 1 }), "standing on the line = fault");
  // symmetry: same distance from net gives same verdict for both halves
  for (const d of [0.5, 2.0, 2.2, 2.3, 2.6, 4]) {
    eq(isKitchenVolleyFault({ bouncesOnSide: 0, actorZ: d, side: 1 }), isKitchenVolleyFault({ bouncesOnSide: 0, actorZ: -d, side: -1 }), `symmetry at ${d} m`);
  }
}

// 8. Guard: the game must actually use this module (prevents test/game drift)
{
  const src = fs.readFileSync(new URL("../src/game_engine.js", import.meta.url), "utf8");
  ok(/from"\.\/rules_engine\.js"/.test(src), "game_engine imports rules_engine");
  ok(src.includes("applyRallyResult(this.score"), "game uses applyRallyResult for scoring");
  ok(src.includes("getGameWinner(this.score") && src.includes("startNextGame(this.score"), "game uses shared game-end logic");
  ok((src.match(/isTwoBounceViolation\(/g) || []).length >= 4, "two-bounce checked for P1 and P2 via shared rule");
  ok((src.match(/isKitchenVolleyFault\(/g) || []).length >= 2, "kitchen checked for P1 and P2 via shared rule");
  ok((src.match(/inReach&&/g) || []).length >= 6, "faults only judged when ball is within swing reach");
  ok(!/this\.score\.serverNumber=1;/.test(src), "no inline serve-rotation left in the engine");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
