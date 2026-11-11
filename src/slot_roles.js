// Slot <-> role mapping and "who does this swing belong to" rules shared by the engine,
// the motion controller and the tests. Keep in sync with ROLE_BY_SLOT in server/api.js.
export const ROLE_BY_SLOT = { A1: "p1", B1: "p2", A2: "p3", B2: "p4" };
export const SLOT_BY_ROLE = { p1: "A1", p2: "B1", p3: "A2", p4: "B2" };
const MATE = { A1: "A2", A2: "A1", B1: "B2", B2: "B1" };

export const normRole = (r) => {
  const v = String(r || "").toLowerCase();
  if (SLOT_BY_ROLE[v]) return v;
  if (v === "2" || v === "opponent") return "p2";
  if (v === "3") return "p3";
  if (v === "4") return "p4";
  return "p1";
};
export const slotForRole = (r) => SLOT_BY_ROLE[String(r || "").toLowerCase()] || "B1";
export const teamOfSlot = (slotId) => (String(slotId || "")[0] === "B" ? "B" : "A");

// Returns the slot id the swing must be applied to, or null to keep the old
// "closest teammate" behaviour. A swing is pinned to its own actor when the seat is a partner
// seat (A2/B2) or when the teammate seat is also a human (so two humans never steal each other's ball).
export const seatsFor = (matchType) => (matchType === "singles" ? ["A1", "B1"] : ["A1", "A2", "B1", "B2"]);
export const isSeatValid = (matchType, slotId) => seatsFor(matchType).includes(slotId);

export function forceActorFor(slots, slotId, matchType) {
  if (matchType === "singles") return null;      // 1-1: there is no partner, nobody is pinned
  if (!MATE[slotId]) return null;
  if (slotId === "A2" || slotId === "B2") return slotId;
  const mate = MATE[slotId];
  const humanMate = Array.isArray(slots) && slots.some((s) => s.slotId === mate && s.playerType === "human");
  return humanMate ? slotId : null;
}

// During serve only the serving seats (A1/B1) may start the toss/hit.
export const isServeBlocked = (phase, slotId) => /^SERVE/.test(String(phase || "")) && slotId !== "A1" && slotId !== "B1";
// A seat that does not exist in the current mode (A2/B2 in 1-1) can neither serve nor swing.
export const canControlSeat = (matchType, phase, slotId) => isSeatValid(matchType, slotId) && !isServeBlocked(phase, slotId);
