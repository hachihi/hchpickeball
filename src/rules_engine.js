// Pickleball rules engine — pure logic, no DOM / three.js.
// game_engine.js imports this module, and scripts/test_pickleball_rules.mjs
// tests this same module, so a rule change cannot pass tests while the game differs.

export const NVZ_DEPTH_M = 2.134;      // Kitchen = 7 ft from the net
export const NVZ_TOE_GRACE_M = 0.15;   // small tolerance so a toe on the line is not punished harshly

const other = (team) => (team === "player" ? "opponent" : "player");

export function createInitialScore() {
  return { playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0,
           server: "player", serverNumber: 2, deuceSide: true };
}

/**
 * Apply the result of one rally. Mutates `score`.
 * Returns "POINT_SCORED" | "SECOND_SERVER" | "SIDE_OUT".
 * Doubles: partners only swap courts when their team scores, so Server 2 always
 * serves from the court opposite to Server 1's last serve (deuceSide flips).
 * After a side-out in doubles the new Server 1 is the player in the RIGHT court.
 * Singles: serve court follows the server's own score (even = right, odd = left).
 */
export function applyRallyResult(score, rallyWinner, { matchType = "doubles" } = {}) {
  if (rallyWinner === score.server) {
    if (rallyWinner === "player") score.playerPoints += 1; else score.opponentPoints += 1;
    score.deuceSide = !score.deuceSide;
    return "POINT_SCORED";
  }
  if (matchType === "singles") {
    score.server = other(score.server);
    score.serverNumber = 2;
    const pts = score.server === "player" ? score.playerPoints : score.opponentPoints;
    score.deuceSide = pts % 2 === 0;
    return "SIDE_OUT";
  }
  if (score.serverNumber === 1) {
    score.serverNumber = 2;
    score.deuceSide = !score.deuceSide;
    return "SECOND_SERVER";
  }
  score.server = other(score.server);
  score.serverNumber = 1;
  score.deuceSide = true;
  return "SIDE_OUT";
}

/** Returns "player" | "opponent" when the game is won (target reached, win by 2), else null. */
export function getGameWinner(score, targetPoints = 11) {
  const p = score.playerPoints, o = score.opponentPoints;
  if ((p >= targetPoints || o >= targetPoints) && Math.abs(p - o) >= 2) return p > o ? "player" : "opponent";
  return null;
}

/** Credit the game, reset points and serve state for the next game. */
export function startNextGame(score, winner) {
  if (winner === "player") score.playerGames += 1; else score.opponentGames += 1;
  score.playerPoints = 0;
  score.opponentPoints = 0;
  score.serverNumber = 2;
  score.deuceSide = true;
  score.server = other(score.server);
}

/** Two-bounce rule: stroke 1 (serve) and stroke 2 (return) must be played after a bounce. */
export function isTwoBounceViolation(strokeCount, bouncesOnReceivingSide) {
  return (strokeCount === 1 || strokeCount === 2) && bouncesOnReceivingSide === 0;
}

/**
 * Kitchen rule: volleying (ball not yet bounced) while standing in the NVZ is a fault.
 * side = +1 for the team defending z > 0, -1 for z < 0.
 */
export function isKitchenVolleyFault({ bouncesOnSide, actorZ, side }) {
  if (bouncesOnSide >= 1) return false;
  return side * actorZ <= NVZ_DEPTH_M + NVZ_TOE_GRACE_M;
}
