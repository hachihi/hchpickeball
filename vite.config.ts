import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function createRacketState(role) {
  return {
    role,
    seq: 0,
    lastSeenTs: 0,
    connected: false,
    orientation: { pitch: 0, roll: 0, yaw: 0, accelMag: 0, buttonB: false, connected: false },
    lastSwing: null,
    swingHistory: [],
    feedbackSeq: 0,
    lastFeedback: null
  };
}

function createDefaultSlots(matchType = "doubles", hostName = "Hachihi Pro") {
  const isDoubles = matchType === "doubles";
  const slots = [
    {
      slotId: "A1",
      teamCode: "A",
      slotNumber: 1,
      playerType: "human",
      playerId: "p1",
      playerName: hostName || "Hachihi Pro",
      botId: null,
      botDifficulty: null,
      status: "ready",
      avatar: "player1"
    }
  ];

  if (isDoubles) {
    slots.push({
      slotId: "A2",
      teamCode: "A",
      slotNumber: 2,
      playerType: "empty",
      playerId: null as any,
      botId: null,
      playerName: "Vị trí A2 (Đang chờ...)",
      botDifficulty: null,
      status: "waiting",
      avatar: "player2"
    });
  }

  slots.push({
    slotId: "B1",
    teamCode: "B",
    slotNumber: 1,
    playerType: "empty",
    playerId: null as any,
    botId: null,
    playerName: "Vị trí B1 (Đang chờ...)",
    botDifficulty: null,
    status: "waiting",
    avatar: "opponent1"
  });

  if (isDoubles) {
    slots.push({
      slotId: "B2",
      teamCode: "B",
      slotNumber: 2,
      playerType: "empty",
      playerId: null as any,
      botId: null,
      playerName: "Vị trí B2 (Đang chờ...)",
      botDifficulty: null,
      status: "waiting",
      avatar: "opponent2"
    });
  }

  return slots;
}

function createRoom(id, hostName = "Hachihi Pro", guestName = "Challenger", gamesToWin = 2, matchType = "doubles") {
  return {
    roomId: id,
    hostName,
    guestName,
    matchType,
    gamesToWin,
    teamAName: "Đội A",
    teamBName: "Đội B",
    teamAColor: "#ffea28",
    teamBColor: "#25a8f5",
    botDifficulty: "normal",
    scenery: "landmark81",
    isPublic: true,
    started: false,
    slots: createDefaultSlots(matchType, hostName),
    messages: [
      {
        id: "msg_init_" + Date.now(),
        sender: "Hệ thống",
        role: "system",
        team: "SYS",
        text: "Chào mừng đến với phòng Pickleball Hachihi! Hãy sẵn sàng thi đấu.",
        timestamp: Date.now()
      }
    ],
    rackets: {
      p1: createRacketState("p1"),
      p2: createRacketState("p2")
    },
    stateSeq: 0,
    matchSnapshot: null,
    p1DesktopSeenTs: 0,
    p2DesktopSeenTs: 0,
    createdAt: Date.now()
  };
}

function getRacketSummary(racket) {
  const now = Date.now();
  const diff = racket.lastSeenTs > 0 ? Math.max(0, now - racket.lastSeenTs) : -1;
  const connected = racket.connected && diff >= 0 && diff < 12000;
  return {
    role: racket.role,
    connected,
    lastSeenMs: diff,
    orientation: { ...racket.orientation, connected },
    lastSwing: racket.lastSwing ? { ...racket.lastSwing } : null,
    lastFeedback: racket.lastFeedback ? { ...racket.lastFeedback } : null,
    swingHistory: racket.swingHistory.slice(-15)
  };
}

function parseJsonBody(req: any): Promise<any> {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(String(chunk)));
    req.on("end", () => {
      try {
        const str = chunks.join("");
        resolve(str ? JSON.parse(str) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function sendJsonResponse(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.end(JSON.stringify(data));
}

const assetCache = new Map();
const assetInFlight = new Map();
const mimeForPath = (p) =>
  p.endsWith(".glb")
    ? "model/gltf-binary"
    : p.endsWith(".mp3")
    ? "audio/mpeg"
    : p.endsWith(".png")
    ? "image/png"
    : p.endsWith(".wasm")
    ? "application/wasm"
    : p.endsWith(".json")
    ? "application/json; charset=utf-8"
    : "application/octet-stream";

function tennisRelayPlugin() {
  const rooms = new Map();
  rooms.set("default", createRoom("10150"));
  rooms.set("10150", createRoom("10150"));

  const tunnelBaseUrl = "https://argon-tennis-sandbox-170440.uc.r.appspot.com";

  const getOrCreateRoom = (roomId, matchType = "doubles") => {
    const rawId = (roomId || "10150").replace(/[^A-Za-z0-9_-]/g, "").toUpperCase() || "10150";
    const cleanId = rawId === "DEFAULT" ? "10150" : rawId;
    let r = rooms.get(cleanId);
    if (!r) {
      r = createRoom(cleanId, "Hachihi Pro", "Challenger", 2, matchType);
      rooms.set(cleanId, r);
    }
    return r;
  };

  const handleMiddleware = (req, res, next) => {
    const urlStr = req.url || "/";
    const parsedUrl = new URL(urlStr, "http://localhost:3000");
    const pathname = parsedUrl.pathname;

    if (pathname === "/___rPc_sWiTcH___") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("OK");
      return;
    }

    // Upstream static proxy
    if (
      pathname.startsWith("/assets/models/") ||
      pathname.startsWith("/assets/audio/") ||
      pathname.startsWith("/assets/textures/") ||
      pathname.startsWith("/assets/mediapipe/")
    ) {
      const targetUrl = `https://www.gstatic.com/aistudio/starter-apps/tennis/${pathname.slice(8)}${parsedUrl.search}`;
      (async () => {
        try {
          let entry = assetCache.get(targetUrl);
          if (!entry) {
            let pending = assetInFlight.get(targetUrl);
            if (!pending) {
              pending = fetch(targetUrl)
                .then(async (resp) => {
                  if (!resp.ok) throw new Error(`Upstream ${resp.status}`);
                  const buf = Buffer.from(await resp.arrayBuffer());
                  const item = { contentType: mimeForPath(pathname), body: buf };
                  assetCache.set(targetUrl, item);
                  return item;
                })
                .finally(() => assetInFlight.delete(targetUrl));
              assetInFlight.set(targetUrl, pending);
            }
            entry = await pending;
          }
          res.statusCode = 200;
          res.setHeader("Content-Type", entry.contentType);
          res.setHeader("Content-Length", entry.body.length);
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Cache-Control", "public, max-age=86400");
          res.end(entry.body);
        } catch {
          res.statusCode = 502;
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end("Upstream asset fetch failed");
        }
      })();
      return;
    }

    if (!pathname.startsWith("/api/")) {
      next();
      return;
    }

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.end();
      return;
    }

    const roomIdParam = parsedUrl.searchParams.get("room") || "10150";
    const roleParam = (parsedUrl.searchParams.get("role") || "p1").toLowerCase();
    const roleKey = roleParam === "p2" || roleParam === "2" || roleParam === "opponent" ? "p2" : "p1";

    (async () => {
      // GET /api/match/state
      if (req.method === "GET" && pathname === "/api/match/state") {
        const room = getOrCreateRoom(roomIdParam);
        const touch = parsedUrl.searchParams.get("touch");
        if (touch === "p1") room.p1DesktopSeenTs = Date.now();
        if (touch === "p2") room.p2DesktopSeenTs = Date.now();

        const now = Date.now();
        const p1Racket = getRacketSummary(room.rackets.p1);
        const p2Racket = getRacketSummary(room.rackets.p2);
        const p1Online = room.p1DesktopSeenTs > 0 && now - room.p1DesktopSeenTs < 8000;
        const p2Online = room.p2DesktopSeenTs > 0 && now - room.p2DesktopSeenTs < 8000;

        sendJsonResponse(res, 200, {
          ok: true,
          roomId: room.roomId,
          matchType: room.matchType || "doubles",
          hostName: room.hostName,
          guestName: room.guestName,
          gamesToWin: room.gamesToWin,
          teamAName: room.teamAName || "Đội A",
          teamBName: room.teamBName || "Đội B",
          teamAColor: room.teamAColor || "#ffea28",
          teamBColor: room.teamBColor || "#25a8f5",
          botDifficulty: room.botDifficulty || "normal",
          scenery: room.scenery || "landmark81",
          isPublic: room.isPublic !== false,
          started: !!room.started,
          slots: room.slots || [],
          messages: (room.messages || []).slice(-40),
          p1Online,
          p2Online,
          p1DesktopOnline: p1Online,
          p2DesktopOnline: p2Online,
          p1PhoneConnected: p1Racket.connected,
          p2PhoneConnected: p2Racket.connected,
          p1: p1Racket,
          p2: p2Racket,
          rackets: { p1: p1Racket, p2: p2Racket },
          snapshotSeq: room.stateSeq,
          snapshot: room.matchSnapshot,
          tunnelUrl: tunnelBaseUrl
        });
        return;
      }

      // GET /api/match/chat
      if (req.method === "GET" && pathname === "/api/match/chat") {
        const room = getOrCreateRoom(roomIdParam);
        sendJsonResponse(res, 200, {
          ok: true,
          roomId: room.roomId,
          messages: (room.messages || []).slice(-50)
        });
        return;
      }

      // GET /api/racket/state
      if (req.method === "GET" && pathname === "/api/racket/state") {
        const room = getOrCreateRoom(roomIdParam);
        const racket = room.rackets[roleKey];
        sendJsonResponse(res, 200, { ...getRacketSummary(racket), roomId: room.roomId, tunnelUrl: tunnelBaseUrl });
        return;
      }

      // GET /api/tunnel/status
      if (req.method === "GET" && pathname === "/api/tunnel/status") {
        const room = getOrCreateRoom(roomIdParam);
        const roomQuery = room.roomId !== "default" ? `room=${room.roomId}&` : "";
        sendJsonResponse(res, 200, {
          ok: true,
          active: true,
          tunnelUrl: tunnelBaseUrl,
          companionUrl: `${tunnelBaseUrl}/companion.html?${roomQuery}role=${roleKey}`,
          joinUrl: `${tunnelBaseUrl}/join.html?room=${room.roomId}&role=${roleKey}`
        });
        return;
      }

      // GET /api/tournament/bracket
      if (req.method === "GET" && pathname === "/api/tournament/bracket") {
        const room = getOrCreateRoom(roomIdParam);
        sendJsonResponse(res, 200, {
          ok: true,
          tournament: {
            id: "TOUR-HACHIHI-2026",
            name: "Pickleball Hachihi Mở Rộng 2026",
            matchType: room.matchType || "doubles",
            allowBots: true,
            rounds: [
              {
                roundName: "Bán kết (Semi-Finals)",
                matches: [
                  { matchId: "SF-1", teamA: "Hachihi Pro & Maya", teamB: "Matt (AI) & Akira (AI)", winner: null },
                  { matchId: "SF-2", teamA: "CLB Hoàng Mai (Human)", teamB: "CLB Thủ Đức (AI)", winner: null }
                ]
              },
              {
                roundName: "Chung kết (Final)",
                matches: [{ matchId: "FINALS", teamA: "Thắng Bán Kết 1", teamB: "Thắng Bán Kết 2", winner: null }]
              }
            ]
          }
        });
        return;
      }

      // POST handlers
      if (req.method === "POST") {
        const body = await parseJsonBody(req);
        const targetRoomId = String(body.room || roomIdParam || "10150");
        const room = getOrCreateRoom(targetRoomId, body.matchType || "doubles");

        // POST /api/match/create (Generate 5-digit room code like 10150)
        if (pathname === "/api/match/create") {
          const new5DigitId = String(Math.floor(10000 + Math.random() * 90000));
          const matchType = body.matchType === "singles" ? "singles" : "doubles";
          const hostName = String(body.hostName || body.p1Name || "Hachihi Pro");
          const gamesToWin = Number(body.gamesToWin || 2);
          const newRoom = createRoom(new5DigitId, hostName, "Challenger", gamesToWin, matchType);
          if (body.teamAName) newRoom.teamAName = body.teamAName;
          if (body.teamBName) newRoom.teamBName = body.teamBName;
          if (body.teamAColor) newRoom.teamAColor = body.teamAColor;
          if (body.teamBColor) newRoom.teamBColor = body.teamBColor;
          rooms.set(new5DigitId, newRoom);

          sendJsonResponse(res, 200, {
            ok: true,
            roomId: new5DigitId,
            matchType: newRoom.matchType,
            hostName: newRoom.hostName,
            slots: newRoom.slots,
            hostDesktopUrl: `/?room=${new5DigitId}&role=p1`,
            guestDesktopUrl: `/?room=${new5DigitId}&role=p2`,
            p1PhoneUrl: `${tunnelBaseUrl}/companion.html?room=${new5DigitId}&role=p1`,
            p2PhoneUrl: `${tunnelBaseUrl}/companion.html?room=${new5DigitId}&role=p2`,
            guestJoinHubUrl: `${tunnelBaseUrl}/join.html?room=${new5DigitId}&role=p2`
          });
          return;
        }

        // POST /api/match/chat (Send chat message)
        if (pathname === "/api/match/chat") {
          const sender = String(body.sender || "Người chơi");
          const text = String(body.text || "").trim();
          if (text) {
            const newMsg = {
              id: "msg_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
              sender,
              role: body.role || "human",
              team: body.team || "A",
              text,
              timestamp: Date.now()
            };
            room.messages = room.messages || [];
            room.messages.push(newMsg);
            if (room.messages.length > 80) room.messages.shift();
          }
          sendJsonResponse(res, 200, { ok: true, roomId: room.roomId, messages: room.messages });
          return;
        }

        // POST /api/match/start (Host clicks Start Match)
        if (pathname === "/api/match/start") {
          room.started = true;
          room.messages = room.messages || [];
          room.messages.push({
            id: "msg_start_" + Date.now(),
            sender: "Hệ thống",
            role: "system",
            team: "SYS",
            text: `▶ ${room.hostName || "Chủ phòng"} đã BẮT ĐẦU TRẬN ĐẤU! Cùng vào sân!`,
            timestamp: Date.now()
          });
          sendJsonResponse(res, 200, { ok: true, roomId: room.roomId, started: true });
          return;
        }

        // POST /api/match/team/update
        if (pathname === "/api/match/team/update") {
          if (body.teamAName) room.teamAName = String(body.teamAName);
          if (body.teamBName) room.teamBName = String(body.teamBName);
          if (body.teamAColor) room.teamAColor = String(body.teamAColor);
          if (body.teamBColor) room.teamBColor = String(body.teamBColor);
          if (body.botDifficulty) room.botDifficulty = String(body.botDifficulty);
          if (body.scenery) room.scenery = String(body.scenery);
          if (body.isPublic !== undefined) room.isPublic = !!body.isPublic;
          if (body.gamesToWin) room.gamesToWin = Number(body.gamesToWin);
          if (body.matchType && body.matchType !== room.matchType) {
            room.matchType = body.matchType;
            room.slots = createDefaultSlots(room.matchType, room.hostName);
          }
          sendJsonResponse(res, 200, {
            ok: true,
            roomId: room.roomId,
            teamAName: room.teamAName,
            teamBName: room.teamBName,
            matchType: room.matchType,
            scenery: room.scenery,
            slots: room.slots
          });
          return;
        }

        // POST /api/match/slot/switch-team (Move player to other team)
        if (pathname === "/api/match/slot/switch-team") {
          const slotId = body.slotId;
          const currentSlot = room.slots.find((s) => s.slotId === slotId);
          if (currentSlot) {
            const currentTeam = currentSlot.teamCode;
            const targetTeam = currentTeam === "A" ? "B" : "A";
            // Find open slot or bot in target team
            const targetSlot = room.slots.find(
              (s) => s.teamCode === targetTeam && (s.playerType === "empty" || s.playerType === "bot")
            );
            if (targetSlot) {
              const prevData = {
                playerType: currentSlot.playerType,
                playerId: currentSlot.playerId,
                playerName: currentSlot.playerName,
                botId: currentSlot.botId,
                botDifficulty: currentSlot.botDifficulty,
                status: currentSlot.status,
                avatar: currentSlot.avatar
              };
              currentSlot.playerType = targetSlot.playerType;
              currentSlot.playerId = targetSlot.playerId;
              currentSlot.playerName = targetSlot.playerName;
              currentSlot.botId = targetSlot.botId;
              currentSlot.botDifficulty = targetSlot.botDifficulty;
              currentSlot.status = targetSlot.status;

              targetSlot.playerType = prevData.playerType;
              targetSlot.playerId = prevData.playerId;
              targetSlot.playerName = prevData.playerName;
              targetSlot.botId = prevData.botId;
              targetSlot.botDifficulty = prevData.botDifficulty;
              targetSlot.status = prevData.status;

              room.messages.push({
                id: "msg_team_" + Date.now(),
                sender: "Hệ thống",
                role: "system",
                team: "SYS",
                text: `${prevData.playerName || "Người chơi"} đã chuyển sang Đội ${targetTeam}`,
                timestamp: Date.now()
              });
            }
          }
          sendJsonResponse(res, 200, { ok: true, roomId: room.roomId, slots: room.slots });
          return;
        }

        // POST /api/match/slot/move (Drag & Drop or Move to team / slot)
        if (pathname === "/api/match/slot/move") {
          const fromSlotId = body.fromSlotId;
          const toSlotId = body.toSlotId;
          const targetTeam = body.targetTeam;
          const fromSlot = room.slots.find((s) => s.slotId === fromSlotId);
          if (fromSlot) {
            let toSlot = toSlotId ? room.slots.find((s) => s.slotId === toSlotId) : null;
            if (!toSlot && targetTeam) {
              toSlot = room.slots.find((s) => s.teamCode === targetTeam && s.playerType === "empty");
              if (!toSlot) {
                toSlot = room.slots.find((s) => s.teamCode === targetTeam && s.playerType === "bot");
              }
              if (!toSlot) {
                toSlot = room.slots.find((s) => s.teamCode === targetTeam && s.slotId !== fromSlotId);
              }
            }
            if (toSlot && toSlot.slotId !== fromSlot.slotId) {
              const temp = {
                playerType: fromSlot.playerType,
                playerId: fromSlot.playerId,
                playerName: fromSlot.playerName,
                botId: fromSlot.botId,
                botDifficulty: fromSlot.botDifficulty,
                status: fromSlot.status,
                avatar: fromSlot.avatar
              };
              fromSlot.playerType = toSlot.playerType;
              fromSlot.playerId = toSlot.playerId;
              fromSlot.playerName = toSlot.playerName;
              fromSlot.botId = toSlot.botId;
              fromSlot.botDifficulty = toSlot.botDifficulty;
              fromSlot.status = toSlot.status;

              toSlot.playerType = temp.playerType;
              toSlot.playerId = temp.playerId;
              toSlot.playerName = temp.playerName;
              toSlot.botId = temp.botId;
              toSlot.botDifficulty = temp.botDifficulty;
              toSlot.status = temp.status;

              room.messages.push({
                id: "msg_move_" + Date.now(),
                sender: "Hệ thống",
                role: "system",
                team: "SYS",
                text: `${temp.playerName || "Thành viên"} đã chuyển sang vị trí ${toSlot.slotId} (Đội ${toSlot.teamCode})`,
                timestamp: Date.now()
              });
            }
          }
          sendJsonResponse(res, 200, { ok: true, roomId: room.roomId, slots: room.slots });
          return;
        }

        // POST /api/match/slot/update
        if (pathname === "/api/match/slot/update") {
          const targetSlot = room.slots.find((s) => s.slotId === body.slotId);
          if (targetSlot) {
            if (body.playerType !== undefined) targetSlot.playerType = body.playerType;
            if (body.botDifficulty !== undefined) targetSlot.botDifficulty = body.botDifficulty;
            if (body.playerName !== undefined) targetSlot.playerName = body.playerName;
            if (body.botId !== undefined) targetSlot.botId = body.botId;
            if (body.status !== undefined) targetSlot.status = body.status;
            if (body.playerId !== undefined) targetSlot.playerId = body.playerId;
          }
          sendJsonResponse(res, 200, { ok: true, roomId: room.roomId, slots: room.slots });
          return;
        }

        // POST /api/match/slot/join
        if (pathname === "/api/match/slot/join") {
          let targetSlot = room.slots.find((s) => s.slotId === body.slotId);
          if (!targetSlot) {
            targetSlot = room.slots.find((s) => s.playerType === "empty" || s.playerType === "bot");
          }
          if (targetSlot) {
            targetSlot.playerType = "human";
            targetSlot.playerId = body.playerId || `human-${Date.now()}`;
            targetSlot.playerName = body.playerName || "Vận động viên";
            targetSlot.botId = null;
            targetSlot.botDifficulty = null;
            targetSlot.status = "ready";

            room.messages.push({
              id: "msg_join_" + Date.now(),
              sender: "Hệ thống",
              role: "system",
              team: "SYS",
              text: `${targetSlot.playerName} đã tham gia vị trí ${targetSlot.slotId} (Đội ${targetSlot.teamCode})!`,
              timestamp: Date.now()
            });
          }
          sendJsonResponse(res, 200, { ok: true, roomId: room.roomId, slots: room.slots });
          return;
        }

        // POST /api/match/leave
        if (pathname === "/api/match/leave") {
          const targetSlot = room.slots.find((s) => s.slotId === body.slotId || s.playerId === body.playerId);
          if (targetSlot && targetSlot.slotId !== "A1") {
            const name = targetSlot.playerName;
            targetSlot.playerType = "bot";
            targetSlot.botId = `BOT_${targetSlot.slotId}`;
            targetSlot.playerName = targetSlot.teamCode === "A" ? "Maya (AI)" : "Matt (AI)";
            targetSlot.botDifficulty = "normal";
            targetSlot.status = "ready";

            room.messages.push({
              id: "msg_leave_" + Date.now(),
              sender: "Hệ thống",
              role: "system",
              team: "SYS",
              text: `${name} đã rời phòng. Máy BOT tự động thế chỗ.`,
              timestamp: Date.now()
            });
          }
          sendJsonResponse(res, 200, { ok: true, roomId: room.roomId, slots: room.slots });
          return;
        }

        // POST /api/match/sync
        if (pathname === "/api/match/sync") {
          room.stateSeq += 1;
          room.p1DesktopSeenTs = Date.now();
          const s = body.snapshot && typeof body.snapshot === "object" ? body.snapshot : body;
          room.matchSnapshot = { ...s, seq: room.stateSeq, serverTimeMs: Date.now() };
          sendJsonResponse(res, 200, { ok: true, roomId: room.roomId, seq: room.stateSeq, p2Racket: getRacketSummary(room.rackets.p2) });
          return;
        }

        // POST /api/racket/swing
        if (pathname === "/api/racket/swing") {
          const racketKey = String(body.role || roleKey).toLowerCase() === "p2" ? "p2" : "p1";
          const rkt = room.rackets[racketKey];
          const now = Date.now();
          rkt.seq += 1;
          rkt.lastSeenTs = now;
          rkt.connected = true;
          const swingData = {
            seq: rkt.seq,
            role: rkt.role,
            type: String(body.type || "swing").toLowerCase() === "toss" ? "toss" : "swing",
            shotType: String(body.shotType || "topspin").toLowerCase(),
            speed: Number(body.speed ?? 1),
            angleX: Number(body.angleX ?? body.dirX ?? 0),
            dirX: Number(body.angleX ?? body.dirX ?? 0),
            dirY: Number(body.dirY ?? 0),
            pitch: Number(body.pitch ?? rkt.orientation.pitch ?? 0),
            roll: Number(body.roll ?? rkt.orientation.roll ?? 0),
            yaw: Number(body.yaw ?? rkt.orientation.yaw ?? 0),
            timestamp: Number(body.timestamp ?? now),
            serverTimeMs: now,
            source: String(body.source || "phone")
          };
          rkt.lastSwing = swingData;
          rkt.swingHistory.push(swingData);
          if (rkt.swingHistory.length > 50) rkt.swingHistory.shift();
          sendJsonResponse(res, 200, { ok: true, roomId: room.roomId, role: rkt.role, swing: swingData });
          return;
        }

        // POST /api/racket/telemetry
        if (pathname === "/api/racket/telemetry") {
          const racketKey = String(body.role || roleKey).toLowerCase() === "p2" ? "p2" : "p1";
          const rkt = room.rackets[racketKey];
          rkt.lastSeenTs = Date.now();
          rkt.connected = !!(body.connected ?? true);
          rkt.orientation = {
            pitch: Number(body.pitch ?? rkt.orientation.pitch ?? 0),
            roll: Number(body.roll ?? rkt.orientation.roll ?? 0),
            yaw: Number(body.yaw ?? rkt.orientation.yaw ?? 0),
            accelMag: Number(body.accelMag ?? 0),
            buttonB: !!(body.buttonB ?? false),
            connected: rkt.connected
          };
          sendJsonResponse(res, 200, { ok: true, roomId: room.roomId, role: rkt.role, orientation: rkt.orientation, lastFeedback: rkt.lastFeedback });
          return;
        }

        // POST /api/racket/feedback
        if (pathname === "/api/racket/feedback") {
          const racketKey = String(body.role || roleKey).toLowerCase() === "p2" ? "p2" : "p1";
          const rkt = room.rackets[racketKey];
          rkt.feedbackSeq += 1;
          rkt.lastFeedback = {
            seq: rkt.feedbackSeq,
            role: rkt.role,
            kind: String(body.kind || "hit"),
            grade: String(body.grade || "PERFECT"),
            shotType: String(body.shotType || "TOPSPIN"),
            speedKmh: Number(body.speedKmh ?? 160),
            intensity: Number(body.intensity ?? 1),
            serverTimeMs: Date.now()
          };
          sendJsonResponse(res, 200, { ok: true, roomId: room.roomId, feedback: rkt.lastFeedback });
          return;
        }
      }

      next();
    })();
  };

  return {
    name: "argon-tennis-relay",
    configureServer(server) {
      server.middlewares.use(handleMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleMiddleware);
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
      hmr: process.env.DISABLE_HMR !== "true"
    },
    plugins: [react(), tennisRelayPlugin()],
    define: {},
    resolve: {
      alias: {
        "../assets/vendor/GLTFLoader.js": "three/examples/jsm/loaders/GLTFLoader.js",
        "@": path.resolve(".")
      }
    }
  };
});
