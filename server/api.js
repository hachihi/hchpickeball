// Shared room/match API for server.js (production) and vite.config.ts (dev).
// One implementation, so the two can never drift apart again.
import crypto from "node:crypto";

export const DEFAULT_ROOM_ID = "10150";
export const ROLE_BY_SLOT = { A1: "p1", B1: "p2", A2: "p3", B2: "p4" };
const RACKET_ROLES = ["p1", "p2", "p3", "p4"];
const MAX_LISTENERS_PER_ROOM = 16;

const num = (v, d) => (v === undefined || v === null || v === "" || Number.isNaN(Number(v)) ? d : Number(v));

function cleanRoomId(raw) {
  const id = String(raw || DEFAULT_ROOM_ID).replace(/[^A-Za-z0-9_-]/g, "").toUpperCase() || DEFAULT_ROOM_ID;
  return id === "DEFAULT" ? DEFAULT_ROOM_ID : id;
}

function racketRole(raw, fallback = "p1") {
  const r = String(raw || "").toLowerCase();
  if (RACKET_ROLES.includes(r)) return r;
  if (r === "2" || r === "opponent") return "p2";
  if (r === "3") return "p3";
  if (r === "4") return "p4";
  if (r === "1") return "p1";
  return fallback;
}

function createRacketState(role) {
  return {
    role, seq: 0, lastSeenTs: 0, connected: false,
    orientation: { pitch: 0, roll: 0, yaw: 0, accelMag: 0, buttonB: false, connected: false },
    lastSwing: null, swingHistory: [], feedbackSeq: 0, lastFeedback: null, move: null
  };
}

function emptySlot(slotId, teamCode, slotNumber, avatar) {
  return {
    slotId, teamCode, slotNumber, playerType: "empty", playerId: null, botId: null,
    playerName: `Vị trí ${slotId} (Đang chờ...)`, botDifficulty: null, status: "waiting", avatar
  };
}

export function createDefaultSlots(matchType = "doubles", hostName = "Hachihi Pro") {
  const dbl = matchType === "doubles";
  const slots = [{
    slotId: "A1", teamCode: "A", slotNumber: 1, playerType: "human", playerId: "p1",
    playerName: hostName || "Hachihi Pro", botId: null, botDifficulty: null, status: "ready", avatar: "player1"
  }];
  if (dbl) slots.push(emptySlot("A2", "A", 2, "player2"));
  slots.push(emptySlot("B1", "B", 1, "opponent1"));
  if (dbl) slots.push(emptySlot("B2", "B", 2, "opponent2"));
  return slots;
}

function sysMsg(text, idPrefix = "msg_sys") {
  return { id: `${idPrefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`, sender: "Hệ thống", role: "system", team: "SYS", text, timestamp: Date.now() };
}

function newToken() { return crypto.randomBytes(16).toString("hex"); }

export function createApi(opts = {}) {
  const graceMs = num(opts.graceMs ?? process.env.ROOM_GRACE_MS, 45000);
  const roomTtlMs = num(opts.roomTtlMs ?? process.env.ROOM_TTL_MS, 4 * 3600 * 1000);
  const ONLINE_MS = num(opts.onlineMs ?? process.env.ROOM_ONLINE_MS, 8000);   // "seen recently" window
  const tunnelBaseUrl = opts.tunnelBaseUrl || "";
  const maxRooms = num(opts.maxRooms ?? process.env.MAX_ROOMS, 300);
  const createPerMin = num(opts.createPerMin ?? process.env.CREATE_PER_MIN, 12);
  const createLog = new Map();   // ip -> [timestamps]; protects a free Render instance from room spam
  const rooms = new Map();

  function initRoom(id, hostName = "Hachihi Pro", matchType = "doubles", gamesToWin = 2) {
    return {
      roomId: id, matchType, hostName, guestName: "Challenger", gamesToWin,
      teamAName: "Đội A", teamBName: "Đội B", teamAColor: "#ffea28", teamBColor: "#25a8f5",
      botDifficulty: "normal", scenery: "landmark81", isPublic: true, started: false,
      slots: createDefaultSlots(matchType, hostName),
      messages: [sysMsg("Chào mừng đến với phòng Pickleball Hachihi! Hãy sẵn sàng thi đấu.", "msg_init")],
      rackets: Object.fromEntries(RACKET_ROLES.map((r) => [r, createRacketState(r)])),
      sound: { music: true, sfx: true },
      listeners: new Set(),     // SSE subscribers (swing push)
      sessions: new Map(),      // token -> { slotId, isHost, lastSeen, preferredSlot }
      hostToken: null,
      stateSeq: 0, matchSnapshot: null, p1DesktopSeenTs: 0, p2DesktopSeenTs: 0,
      createdAt: Date.now(), lastActivity: Date.now()
    };
  }

  // The default room (legacy links / racket companion) always exists, with no host token.
  rooms.set(DEFAULT_ROOM_ID, initRoom(DEFAULT_ROOM_ID));

  // MP-06: unknown rooms are NOT auto-created any more.
  const findRoom = (id) => rooms.get(cleanRoomId(id)) || null;

  // The host's seat can move (drag A1 -> B1), so "host seat" is looked up, not hard-coded.
  function hostSlotId(room) {
    for (const s of room.sessions.values()) if (s.isHost) return s.slotId;
    return "A1";
  }

  function slotOf(room, token) {
    const s = token && room.sessions.get(token);
    if (!s || !s.slotId) return null;
    return room.slots.find((x) => x.slotId === s.slotId) || null;
  }

  function toBot(room, slot, reason) {
    const name = slot.playerName;
    slot.playerType = "bot";
    slot.playerId = null;
    slot.botId = `BOT_${slot.slotId}`;
    slot.playerName = slot.teamCode === "A" ? "Maya (AI)" : "Matt (AI)";
    slot.botDifficulty = room.botDifficulty || "normal";
    slot.status = "ready";
    room.messages.push(sysMsg(`${name} ${reason} Máy BOT tự động thế chỗ.`, "msg_leave"));
  }

  // MP-07: a human who stops polling keeps the seat for graceMs, then a BOT takes over.
  function sweep(room, now = Date.now()) {
    for (const [token, s] of room.sessions) {
      if (!s.slotId || s.isHost) continue;
      if (now - s.lastSeen <= graceMs) continue;
      const slot = room.slots.find((x) => x.slotId === s.slotId);
      if (slot && slot.playerType === "human") toBot(room, slot, "mất kết nối quá lâu.");
      s.preferredSlot = s.slotId;
      s.slotId = null;
    }
  }

  const sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, room] of rooms) {
      sweep(room, now);
      if (id !== DEFAULT_ROOM_ID && now - room.lastActivity > roomTtlMs) rooms.delete(id);
    }
  }, 5000);
  if (sweepTimer.unref) sweepTimer.unref();

  function hostOnline(room, now) {
    for (const s of room.sessions.values()) if (s.isHost) return now - s.lastSeen < ONLINE_MS;
    return true;   // default room has no host
  }

  function slotOnlineMap(room, now) {
    const out = {};
    for (const slot of room.slots) {
      if (slot.playerType === "bot") { out[slot.slotId] = true; continue; }
      if (slot.playerType !== "human") { out[slot.slotId] = false; continue; }
      let seen = 0;
      for (const s of room.sessions.values()) if (s.slotId === slot.slotId) seen = Math.max(seen, s.lastSeen);
      out[slot.slotId] = now - seen < ONLINE_MS;
    }
    return out;
  }

  // Same rule as src/match_manager.js canStart().
  function canStart(room) {
    const a = room.slots.filter((s) => s.teamCode === "A" && s.playerType !== "empty").length;
    const b = room.slots.filter((s) => s.teamCode === "B" && s.playerType !== "empty").length;
    if (room.matchType === "singles") return a >= 1 && b >= 1;
    return a >= 1 && b >= 1 && a + b >= 2;
  }

  function racketSummary(r) {
    const now = Date.now();
    const diff = r.lastSeenTs > 0 ? Math.max(0, now - r.lastSeenTs) : -1;
    const connected = r.connected && diff >= 0 && diff < 12000;
    return {
      role: r.role, connected, lastSeenMs: diff, orientation: { ...r.orientation, connected },
      lastSwing: r.lastSwing ? { ...r.lastSwing } : null, lastFeedback: r.lastFeedback ? { ...r.lastFeedback } : null,
      swingHistory: r.swingHistory.slice(-15), move: r.move ? { ...r.move } : null
    };
  }

  function swapSlots(a, b) {
    const keys = ["playerType", "playerId", "playerName", "botId", "botDifficulty", "status"];
    for (const k of keys) { const t = a[k]; a[k] = b[k]; b[k] = t; }
  }

  function moveSessions(room, fromId, toId) {
    // keep tokens pointing at the right seat after a swap
    for (const s of room.sessions.values()) {
      if (s.slotId === fromId) s.slotId = toId;
      else if (s.slotId === toId) s.slotId = fromId;
    }
  }

  function bracket(room) {
    return {
      ok: true,
      tournament: {
        id: "TOUR-HACHIHI-2026", name: "Pickleball Hachihi Mở Rộng 2026",
        matchType: room.matchType || "doubles", allowBots: true,
        rounds: [
          { roundName: "Bán kết (Semi-Finals)", matches: [
            { matchId: "SF-1", teamA: "Hachihi Pro & Maya", teamB: "Matt (AI) & Akira (AI)", winner: null },
            { matchId: "SF-2", teamA: "CLB Hoàng Mai (Human)", teamB: "CLB Thủ Đức (AI)", winner: null }] },
          { roundName: "Chung kết (Final)", matches: [{ matchId: "FINALS", teamA: "Thắng Bán Kết 1", teamB: "Thắng Bán Kết 2", winner: null }] }
        ]
      }
    };
  }

  // Server-sent events: swings reach everybody in the room immediately instead of waiting for the next poll.
  function push(room, event, data) {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of room.listeners) { try { res.write(msg); } catch { room.listeners.delete(res); } }
  }
  function subscribe(roomId, res) {
    const room = findRoom(roomId);
    if (!room) return false;
    if (room.listeners.size >= MAX_LISTENERS_PER_ROOM) { res.writeHead(429, { "Content-Type": "application/json" }); res.end('{"ok":false,"error":"TOO_MANY_STREAMS"}'); return true; }
    res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no", "Access-Control-Allow-Origin": "*" });
    res.write("retry: 1000\n\n: connected\n\n");
    room.listeners.add(res);
    const ka = setInterval(() => { try { res.write(": ka\n\n"); } catch {} }, 15000);
    res.on("close", () => { clearInterval(ka); room.listeners.delete(res); });
    return true;
  }

  // handle(): returns {status, body} for an /api/ request, or null if the path is not ours.
  async function handle({ method, pathname, query, body, token, ip = "" }) {
    const q = (k) => query.get(k);
    const err = (status, error, extra = {}) => ({ status, body: { ok: false, error, ...extra } });
    const ok = (b) => ({ status: 200, body: { ok: true, ...b } });

    const roomIdParam = cleanRoomId(q("room") || (body && body.room));
    const roleKey = racketRole(q("role"));

    // ---- create (the only way to get a new room) ----
    if (method === "POST" && pathname === "/api/match/create") {
      const nowC = Date.now();
      const recent = (createLog.get(ip) || []).filter((t) => nowC - t < 60000);
      if (ip && recent.length >= createPerMin) return err(429, "RATE_LIMITED", { retryAfterSec: 30 });
      if (rooms.size >= maxRooms) {                      // drop idle rooms first, then refuse
        for (const [rid, r] of rooms) if (rid !== DEFAULT_ROOM_ID && nowC - r.lastActivity > 15 * 60000) rooms.delete(rid);
        if (rooms.size >= maxRooms) return err(503, "SERVER_BUSY");
      }
      recent.push(nowC); if (ip) createLog.set(ip, recent);
      let id;
      do { id = String(Math.floor(10000 + Math.random() * 90000)); } while (rooms.has(id));
      const matchType = body.matchType === "singles" ? "singles" : "doubles";
      const hostName = String(body.p1Name || body.hostName || "Hachihi Pro").slice(0, 16);
      const room = initRoom(id, hostName, matchType, num(body.gamesToWin, 2));
      for (const k of ["teamAName", "teamBName", "teamAColor", "teamBColor"]) if (body[k]) room[k] = String(body[k]).slice(0, 24);
      const hostToken = newToken();
      room.hostToken = hostToken;
      room.sessions.set(hostToken, { slotId: "A1", isHost: true, lastSeen: Date.now(), preferredSlot: "A1" });
      rooms.set(id, room);
      return ok({
        roomId: id, matchType: room.matchType, hostName: room.hostName, slots: room.slots,
        sessionToken: hostToken, assignedSlot: "A1", joinUrl: `/?room=${id}&role=p2&join=lobby`
      });
    }

    // ---- reads: no session needed, but a valid one acts as heartbeat ----
    if (method === "GET" || (method === "POST" && !pathname.startsWith("/api/match/") && !pathname.startsWith("/api/racket/"))) {
      if (pathname === "/api/tournament/bracket") {
        const r = findRoom(roomIdParam);
        return ok(bracket(r || initRoom(roomIdParam)));
      }
    }

    if (pathname.startsWith("/api/match/") || pathname.startsWith("/api/racket/") || pathname === "/api/tunnel/status") {
      const room = findRoom(roomIdParam);
      if (!room) return err(404, "ROOM_NOT_FOUND", { roomId: roomIdParam });
      const now = Date.now();
      room.lastActivity = now;
      sweep(room, now);
      const sess = token ? room.sessions.get(token) : null;
      if (sess) { sess.lastSeen = now; }
      const mySlot = slotOf(room, token);
      const isHost = !!(sess && sess.isHost);
      const deny = (why = "FORBIDDEN") => err(403, why);
      const needMember = () => (sess && (sess.slotId || sess.isHost)) ? null : err(401, "SESSION_REQUIRED");
      const needHost = () => (isHost ? null : (sess ? deny("HOST_ONLY") : err(401, "SESSION_REQUIRED")));

      // ---------------- GET ----------------
      if (method === "GET" && pathname === "/api/match/state") {
        const touch = q("touch");
        if (touch === "p1") room.p1DesktopSeenTs = now;
        if (touch === "p2") room.p2DesktopSeenTs = now;
        const rk = Object.fromEntries(RACKET_ROLES.map((r) => [r, racketSummary(room.rackets[r])]));
        const p1Online = room.p1DesktopSeenTs > 0 && now - room.p1DesktopSeenTs < ONLINE_MS;
        const p2Online = room.p2DesktopSeenTs > 0 && now - room.p2DesktopSeenTs < ONLINE_MS;
        const slotOnline = slotOnlineMap(room, now);
        return ok({
          roomId: room.roomId, matchType: room.matchType || "doubles", hostName: room.hostName, guestName: room.guestName,
          gamesToWin: room.gamesToWin, teamAName: room.teamAName || "Đội A", teamBName: room.teamBName || "Đội B",
          teamAColor: room.teamAColor || "#ffea28", teamBColor: room.teamBColor || "#25a8f5",
          botDifficulty: room.botDifficulty || "normal", scenery: room.scenery || "landmark81",
          isPublic: room.isPublic !== false, started: !!room.started, canStart: canStart(room), sound: room.sound,
          slots: room.slots, messages: (room.messages || []).slice(-40),
          p1Online: p1Online || slotOnline.A1, p2Online: p2Online || slotOnline.B1,
          p1DesktopOnline: p1Online, p2DesktopOnline: p2Online,
          slotOnline, mySlot: mySlot ? mySlot.slotId : null, hostOnline: hostOnline(room, now), serverTimeMs: now,
          p1PhoneConnected: rk.p1.connected, p2PhoneConnected: rk.p2.connected,
          p1: rk.p1, p2: rk.p2, rackets: rk,
          snapshotSeq: room.stateSeq, snapshot: room.matchSnapshot, tunnelUrl: tunnelBaseUrl
        });
      }
      if (method === "GET" && pathname === "/api/match/chat") {
        return ok({ roomId: room.roomId, messages: (room.messages || []).slice(-50) });
      }
      if (method === "GET" && pathname === "/api/racket/state") {
        return { status: 200, body: { ...racketSummary(room.rackets[roleKey]), roomId: room.roomId, tunnelUrl: tunnelBaseUrl } };
      }
      if (method === "GET" && pathname === "/api/tunnel/status") {
        const rq = room.roomId !== DEFAULT_ROOM_ID ? `room=${room.roomId}&` : "";
        return ok({ active: !!tunnelBaseUrl, tunnelUrl: tunnelBaseUrl,
          companionUrl: `${tunnelBaseUrl}/companion.html?${rq}role=${roleKey}`,
          joinUrl: `${tunnelBaseUrl}/join.html?room=${room.roomId}&role=${roleKey}` });
      }

      if (method !== "POST") return null;

      // ---------------- POST ----------------
      if (pathname === "/api/match/slot/join") {
        // Idempotent: a valid session that already owns a seat just gets it back.
        if (sess && sess.slotId && !sess.isHost) {
          const cur = room.slots.find((s) => s.slotId === sess.slotId);
          if (cur && cur.playerType === "human") {
            if (body.playerName) cur.playerName = String(body.playerName).slice(0, 16);
            return ok({ roomId: room.roomId, assignedSlot: cur.slotId, sessionToken: token, slots: room.slots, rejoined: true });
          }
        }
        if (sess && sess.isHost) return deny("HOST_ALREADY_SEATED");
        const free = (s) => s.playerType === "empty" || s.playerType === "bot";
        let slot = null;
        const want = body.slotId || (sess && sess.preferredSlot);
        const hostSeat = hostSlotId(room);
        if (want) slot = room.slots.find((s) => s.slotId === want && free(s) && s.slotId !== hostSeat) || null;
        if (!slot) slot = room.slots.find((s) => s.playerType === "empty" && s.slotId !== hostSeat) || room.slots.find((s) => s.playerType === "bot" && s.slotId !== hostSeat);
        if (!slot) return err(409, "ROOM_FULL", { roomId: room.roomId });
        const t = sess ? token : newToken();
        slot.playerType = "human";
        slot.playerId = `human-${t.slice(0, 8)}`;
        slot.playerName = String(body.playerName || "Vận động viên").slice(0, 16);
        slot.botId = null; slot.botDifficulty = null; slot.status = "ready";
        room.sessions.set(t, { slotId: slot.slotId, isHost: false, lastSeen: now, preferredSlot: slot.slotId });
        room.messages.push(sysMsg(`${slot.playerName} đã tham gia vị trí ${slot.slotId} (Đội ${slot.teamCode})!`, "msg_join"));
        return ok({ roomId: room.roomId, assignedSlot: slot.slotId, sessionToken: t, slots: room.slots });
      }

      if (pathname === "/api/match/leave") {
        // own seat via session; host may also remove another seat by slotId
        let target = mySlot && !isHost ? mySlot : null;
        if (!target && isHost && body.slotId && body.slotId !== hostSlotId(room)) target = room.slots.find((s) => s.slotId === body.slotId) || null;
        if (!target && !sess) return err(401, "SESSION_REQUIRED");
        if (target && target.slotId !== hostSlotId(room) && target.playerType === "human") {
          for (const s of room.sessions.values()) if (s.slotId === target.slotId) { s.preferredSlot = target.slotId; s.slotId = null; }
          toBot(room, target, "đã rời phòng.");
        }
        return ok({ roomId: room.roomId, slots: room.slots });
      }

      if (pathname === "/api/match/sync") {
        const h = needHost(); if (h) return h;            // MP-04
        room.stateSeq += 1;
        room.p1DesktopSeenTs = now;
        const s = body.snapshot && typeof body.snapshot === "object" ? body.snapshot : body;
        room.matchSnapshot = { ...s, seq: room.stateSeq, serverTimeMs: now };
        return ok({ roomId: room.roomId, seq: room.stateSeq, p2Racket: racketSummary(room.rackets.p2) });
      }

      if (pathname === "/api/match/start") {
        const h = needHost(); if (h) return h;
        if (!canStart(room)) return err(409, "NOT_ENOUGH_PLAYERS", { canStart: false });   // MP-05
        room.started = true;
        room.messages.push(sysMsg(`▶ ${room.hostName || "Chủ phòng"} đã BẮT ĐẦU TRẬN ĐẤU! Cùng vào sân!`, "msg_start"));
        return ok({ roomId: room.roomId, started: true, slots: room.slots });
      }

      if (pathname === "/api/match/chat") {
        const m = needMember(); if (m) return m;
        const text = String(body.text || "").trim().slice(0, 300);
        if (text) {
          const me = mySlot || room.slots[0];
          room.messages.push({
            id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            sender: String(me.playerName || body.sender || "Người chơi").slice(0, 16),
            role: "human", team: me.teamCode || "A", text, timestamp: Date.now()
          });
          if (room.messages.length > 80) room.messages.shift();
        }
        return ok({ roomId: room.roomId, messages: room.messages });
      }

      if (pathname === "/api/match/team/update") {
        const h = needHost(); if (h) return h;
        if (body.teamAName) room.teamAName = String(body.teamAName).slice(0, 24);
        if (body.teamBName) room.teamBName = String(body.teamBName).slice(0, 24);
        if (body.teamAColor) room.teamAColor = String(body.teamAColor).slice(0, 16);
        if (body.teamBColor) room.teamBColor = String(body.teamBColor).slice(0, 16);
        // lobby UI sends {teamCode, name|color}
        if (body.teamCode === "A" || body.teamCode === "B") {
          if (body.name) room[`team${body.teamCode}Name`] = String(body.name).slice(0, 24);
          if (body.color) room[`team${body.teamCode}Color`] = String(body.color).slice(0, 16);
        }
        if (body.botDifficulty) {
          room.botDifficulty = String(body.botDifficulty);
          for (const sl of room.slots) if (sl.playerType === "bot") sl.botDifficulty = room.botDifficulty;
        }
        if (body.scenery && !room.started) room.scenery = String(body.scenery); // khóa sân khi trận đã bắt đầu
        if (body.sound && typeof body.sound === "object") room.sound = { music: body.sound.music !== false, sfx: body.sound.sfx !== false };
        if (body.isPublic !== undefined) room.isPublic = !!body.isPublic;
        if (body.gamesToWin) room.gamesToWin = Math.max(1, Math.min(5, num(body.gamesToWin, room.gamesToWin)));
        if (body.matchType && body.matchType !== room.matchType && (body.matchType === "singles" || body.matchType === "doubles")) {
          if (room.started) return err(409, "ALREADY_STARTED");
          const fresh = createDefaultSlots(body.matchType, room.hostName);
          const keep = new Map(room.slots.map((s) => [s.slotId, s]));
          room.slots = fresh.map((f) => (keep.has(f.slotId) ? keep.get(f.slotId) : f));
          const ids = new Set(room.slots.map((s) => s.slotId));
          for (const s of room.sessions.values()) if (s.slotId && !ids.has(s.slotId)) { s.preferredSlot = s.slotId; s.slotId = null; }
          room.matchType = body.matchType;
        }
        return ok({ roomId: room.roomId, teamAName: room.teamAName, teamBName: room.teamBName,
          teamAColor: room.teamAColor, teamBColor: room.teamBColor, matchType: room.matchType,
          scenery: room.scenery, sound: room.sound, slots: room.slots });
      }

      if (pathname === "/api/match/slot/update") {
        const m = needMember(); if (m) return m;
        const slot = room.slots.find((s) => s.slotId === body.slotId);
        if (slot) {
          if (!isHost && !(mySlot && mySlot.slotId === slot.slotId)) return deny();
          if (body.playerName) {
            slot.playerName = String(body.playerName).slice(0, 16);
            if (slot.slotId === hostSlotId(room)) room.hostName = slot.playerName;
          }
          if (isHost) {   // only the host may add/remove bots or change seat state
            if (body.playerType) {
              if (slot.playerType === "human" && slot.slotId !== hostSlotId(room) && body.playerType !== "human") {
                for (const s of room.sessions.values()) if (s.slotId === slot.slotId) { s.preferredSlot = slot.slotId; s.slotId = null; }
              }
              if (slot.slotId !== hostSlotId(room)) slot.playerType = String(body.playerType);
            }
            if (body.botDifficulty) slot.botDifficulty = String(body.botDifficulty);
            if (body.botId) slot.botId = String(body.botId);
            if (body.status) slot.status = String(body.status);
          }
        }
        return ok({ roomId: room.roomId, slots: room.slots });
      }

      if (pathname === "/api/match/slot/switch-team" || pathname === "/api/match/slot/move") {
        const m = needMember(); if (m) return m;
        const fromId = body.fromSlotId || body.slotId;
        const from = room.slots.find((s) => s.slotId === fromId);
        if (from) {
          if (!isHost && !(mySlot && mySlot.slotId === from.slotId)) return deny();
          if (from.slotId === hostSlotId(room)) return deny("HOST_SEAT_LOCKED");
          const isMove = pathname === "/api/match/slot/move";
          const wantTeam = isMove ? body.targetTeam : (from.teamCode === "A" ? "B" : "A");
          let to = body.toSlotId ? room.slots.find((s) => s.slotId === body.toSlotId) : null;
          if (!to) {
            const pool = wantTeam ? room.slots.filter((s) => s.teamCode === wantTeam && s.slotId !== from.slotId) : [];
            to = pool.find((s) => s.playerType === "empty") || pool.find((s) => s.playerType === "bot") ||
                 (isMove ? pool[0] : null) || null;
          }
          if (to && to.slotId !== from.slotId) {
            // never let a guest push a human out of a seat; host may swap anything except it keeps A1 host
            if (to.slotId === hostSlotId(room)) return deny("HOST_SEAT_LOCKED");
            const movingHuman = to.playerType === "human";
            if (!isHost && movingHuman) return deny();
            const fromId = from.slotId, toId = to.slotId;
            const who = from.playerName || "Người chơi";
            swapSlots(from, to);
            moveSessions(room, fromId, toId);
            room.messages.push(sysMsg(isMove ? `Vị trí đã được điều chỉnh: ${fromId} ⇄ ${toId}` : `${who} đã chuyển sang Đội ${to.teamCode}`, isMove ? "msg_move" : "msg_team"));
          }
        }
        return ok({ roomId: room.roomId, slots: room.slots });
      }

      // ---- racket (phone controller): open, but only valid roles ----
      // Swings/telemetry must come from a seated player and are always filed under THEIR seat
      // (before: anyone who knew the room code could swing for any player).
      const ownRole = () => (isHost ? ROLE_BY_SLOT[hostSlotId(room)] : (mySlot ? ROLE_BY_SLOT[mySlot.slotId] : null)) || "p1";
      const guardRacket = () => (room.roomId === DEFAULT_ROOM_ID ? null : needMember());
      if (pathname === "/api/racket/swing") {
        const g = guardRacket(); if (g) return g;
        const rk = room.rackets[room.roomId === DEFAULT_ROOM_ID ? racketRole(body.role, roleKey) : ownRole()];
        rk.seq += 1; rk.lastSeenTs = now; rk.connected = true;
        const a = num(body.angleX ?? body.dirX, 0);
        const sw = {
          seq: rk.seq, role: rk.role,
          type: String(body.type || "swing").toLowerCase() === "toss" ? "toss" : "swing",
          shotType: String(body.shotType || "topspin").toLowerCase(), speed: num(body.speed, 1),
          angleX: a, dirX: a, dirY: num(body.dirY, 0),
          pitch: num(body.pitch, rk.orientation.pitch), roll: num(body.roll, rk.orientation.roll), yaw: num(body.yaw, rk.orientation.yaw),
          timestamp: num(body.timestamp, now), serverTimeMs: now, source: String(body.source || "phone"),
          cid: String(body.cid || "").slice(0, 40), side: body.side || null
        };
        rk.lastSwing = sw; rk.swingHistory.push(sw);
        if (rk.swingHistory.length > 50) rk.swingHistory.shift();
        push(room, "swing", sw);
        return ok({ roomId: room.roomId, role: rk.role, swing: sw });
      }
      // Movement of a remote player (keys / touch joystick). The HOST runs the simulation, so without this the
      // guest's character never moved: it stood where the formation put it and could not reach the ball.
      if (pathname === "/api/racket/move") {
        const g = guardRacket(); if (g) return g;
        const rk = room.rackets[room.roomId === DEFAULT_ROOM_ID ? racketRole(body.role, roleKey) : ownRole()];
        const clamp1 = (v) => Math.max(-1, Math.min(1, num(v, 0)));
        rk.lastSeenTs = now;
        rk.move = { x: clamp1(body.x), z: clamp1(body.z), seq: ((rk.move && rk.move.seq) || 0) + 1, serverTimeMs: now };
        push(room, "move", { role: rk.role, ...rk.move });
        return ok({ roomId: room.roomId, role: rk.role });
      }
      if (pathname === "/api/racket/telemetry") {
        const g = guardRacket(); if (g) return g;
        const rk = room.rackets[room.roomId === DEFAULT_ROOM_ID ? racketRole(body.role, roleKey) : ownRole()];
        rk.lastSeenTs = now; rk.connected = !!(body.connected ?? true);
        rk.orientation = {
          pitch: num(body.pitch, rk.orientation.pitch), roll: num(body.roll, rk.orientation.roll), yaw: num(body.yaw, rk.orientation.yaw),
          accelMag: num(body.accelMag, 0), buttonB: !!body.buttonB, connected: rk.connected
        };
        return ok({ roomId: room.roomId, role: rk.role, orientation: rk.orientation, lastFeedback: rk.lastFeedback });
      }
      if (pathname === "/api/racket/feedback") {
        const g = guardRacket(); if (g) return g;
        const rk = room.rackets[room.roomId === DEFAULT_ROOM_ID || isHost ? racketRole(body.role, roleKey) : ownRole()];
        rk.feedbackSeq += 1;
        rk.lastFeedback = {
          seq: rk.feedbackSeq, role: rk.role, kind: String(body.kind || "hit"), grade: String(body.grade || "PERFECT"),
          shotType: String(body.shotType || "TOPSPIN"), speedKmh: num(body.speedKmh, 160), intensity: num(body.intensity, 1), serverTimeMs: now
        };
        return ok({ roomId: room.roomId, feedback: rk.lastFeedback });
      }
    }
    return null;
  }

  return { handle, rooms, findRoom, sweep, subscribe };
}
