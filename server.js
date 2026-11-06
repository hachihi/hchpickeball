// Standalone Production Server for Pickleball Hachihi Open 2026
// Hỗ trợ deploy 100% độc lập trên Render.com, GitHub, Docker hoặc VPS
// Tích hợp đầy đủ REST API, đồng bộ trận đấu và phục vụ file tĩnh từ dist/

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.resolve(__dirname, "dist");

// In-memory room & tournament state
const rooms = new Map();
const tournaments = new Map();

function createDefaultSlots(matchType = "doubles", hostName = "Hachihi Pro") {
  const isDoubles = matchType === "doubles";
  const slots = [
    {
      slotId: "A1",
      teamCode: "A",
      slotNumber: 1,
      playerType: "human",
      playerId: "p1",
      playerName: hostName || "Player 1",
      status: "ready",
      avatar: "player1"
    }
  ];

  if (isDoubles) {
    slots.push({
      slotId: "A2",
      teamCode: "A",
      slotNumber: 2,
      playerType: "bot",
      botId: "BOT_MAYA",
      playerName: "Maya (AI)",
      botDifficulty: "normal",
      status: "ready",
      avatar: "player2"
    });
  }

  slots.push({
    slotId: "B1",
    teamCode: "B",
    slotNumber: 1,
    playerType: "bot",
    botId: "BOT_MATT",
    playerName: "Matt (AI)",
    botDifficulty: "normal",
    status: "ready",
    avatar: "opponent1"
  });

  if (isDoubles) {
    slots.push({
      slotId: "B2",
      teamCode: "B",
      slotNumber: 2,
      playerType: "bot",
      botId: "BOT_AKIRA",
      playerName: "Akira (AI)",
      botDifficulty: "normal",
      status: "ready",
      avatar: "opponent2"
    });
  }

  return slots;
}

function initRoom(roomId, hostName = "Hachihi Pro", matchType = "doubles", gamesToWin = 2) {
  return {
    roomId,
    matchType,
    hostName,
    guestName: "Challenger",
    gamesToWin,
    teamAName: "Đội A",
    teamBName: "Đội B",
    teamAColor: "#ffea28",
    teamBColor: "#25a8f5",
    botDifficulty: "normal",
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
    stateSeq: 0,
    matchSnapshot: null,
    p1DesktopSeenTs: 0,
    p2DesktopSeenTs: 0,
    createdAt: Date.now()
  };
}

rooms.set("default", initRoom("10150"));
rooms.set("10150", initRoom("10150"));

function getRoom(roomId, matchType = "doubles") {
  const id = (roomId || "10150").toUpperCase();
  let r = rooms.get(id);
  if (!r) {
    r = initRoom(id, "Host", matchType);
    rooms.set(id, r);
  }
  return r;
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const str = Buffer.concat(chunks).toString("utf-8");
        resolve(str ? JSON.parse(str) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.end(JSON.stringify(data));
}

const MIME_MAP = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".glb": "model/gltf-binary",
  ".wasm": "application/wasm",
  ".mp3": "audio/mpeg"
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || "/", `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // CORS headers
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end();
    return;
  }

  // --- API Endpoints ---
  if (pathname.startsWith("/api/")) {
    const roomId = (parsedUrl.searchParams.get("room") || "10150").toUpperCase();
    const room = getRoom(roomId);

    // GET /api/match/state
    if (req.method === "GET" && pathname === "/api/match/state") {
      const touch = parsedUrl.searchParams.get("touch");
      if (touch === "p1") room.p1DesktopSeenTs = Date.now();
      if (touch === "p2") room.p2DesktopSeenTs = Date.now();
      const now = Date.now();

      sendJson(res, 200, {
        ok: true,
        roomId: room.roomId,
        matchType: room.matchType,
        hostName: room.hostName,
        guestName: room.guestName,
        gamesToWin: room.gamesToWin,
        teamAName: room.teamAName || "Đội A",
        teamBName: room.teamBName || "Đội B",
        teamAColor: room.teamAColor || "#ffea28",
        teamBColor: room.teamBColor || "#25a8f5",
        botDifficulty: room.botDifficulty || "normal",
        isPublic: room.isPublic !== false,
        started: !!room.started,
        slots: room.slots,
        messages: (room.messages || []).slice(-40),
        p1Online: (now - room.p1DesktopSeenTs) < 8000,
        p2Online: (now - room.p2DesktopSeenTs) < 8000,
        snapshotSeq: room.stateSeq,
        snapshot: room.matchSnapshot
      });
      return;
    }

    // GET /api/match/chat
    if (req.method === "GET" && pathname === "/api/match/chat") {
      sendJson(res, 200, {
        ok: true,
        roomId: room.roomId,
        messages: (room.messages || []).slice(-50)
      });
      return;
    }

    // POST /api/match/create
    if (req.method === "POST" && pathname === "/api/match/create") {
      const body = await parseJsonBody(req);
      const newRoomId = String(Math.floor(10000 + Math.random() * 90000));
      const matchType = body.matchType === "singles" ? "singles" : "doubles";
      const hostName = body.p1Name || body.hostName || "Hachihi Pro";
      const newRoom = initRoom(newRoomId, hostName, matchType, Number(body.gamesToWin || 2));
      if (body.teamAName) newRoom.teamAName = body.teamAName;
      if (body.teamBName) newRoom.teamBName = body.teamBName;
      if (body.teamAColor) newRoom.teamAColor = body.teamAColor;
      if (body.teamBColor) newRoom.teamBColor = body.teamBColor;
      rooms.set(newRoomId, newRoom);

      sendJson(res, 200, {
        ok: true,
        roomId: newRoomId,
        matchType: newRoom.matchType,
        hostName: newRoom.hostName,
        slots: newRoom.slots,
        joinUrl: `/?room=${newRoomId}&role=p2`
      });
      return;
    }

    // POST /api/match/chat
    if (req.method === "POST" && pathname === "/api/match/chat") {
      const body = await parseJsonBody(req);
      const targetRoom = getRoom(body.room || roomId);
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
        targetRoom.messages = targetRoom.messages || [];
        targetRoom.messages.push(newMsg);
        if (targetRoom.messages.length > 80) targetRoom.messages.shift();
      }
      sendJson(res, 200, { ok: true, roomId: targetRoom.roomId, messages: targetRoom.messages });
      return;
    }

    // POST /api/match/start
    if (req.method === "POST" && pathname === "/api/match/start") {
      const body = await parseJsonBody(req);
      const targetRoom = getRoom(body.room || roomId);
      targetRoom.started = true;
      targetRoom.messages = targetRoom.messages || [];
      targetRoom.messages.push({
        id: "msg_start_" + Date.now(),
        sender: "Hệ thống",
        role: "system",
        team: "SYS",
        text: `▶ ${targetRoom.hostName || "Chủ phòng"} đã BẮT ĐẦU TRẬN ĐẤU! Cùng vào sân!`,
        timestamp: Date.now()
      });
      sendJson(res, 200, { ok: true, roomId: targetRoom.roomId, started: true });
      return;
    }

    // POST /api/match/team/update
    if (req.method === "POST" && pathname === "/api/match/team/update") {
      const body = await parseJsonBody(req);
      const targetRoom = getRoom(body.room || roomId);
      if (body.teamAName) targetRoom.teamAName = String(body.teamAName);
      if (body.teamBName) targetRoom.teamBName = String(body.teamBName);
      if (body.teamAColor) targetRoom.teamAColor = String(body.teamAColor);
      if (body.teamBColor) targetRoom.teamBColor = String(body.teamBColor);
      if (body.botDifficulty) targetRoom.botDifficulty = String(body.botDifficulty);
      if (body.isPublic !== undefined) targetRoom.isPublic = !!body.isPublic;
      if (body.gamesToWin) targetRoom.gamesToWin = Number(body.gamesToWin);
      if (body.matchType && body.matchType !== targetRoom.matchType) {
        targetRoom.matchType = body.matchType;
        targetRoom.slots = createDefaultSlots(targetRoom.matchType, targetRoom.hostName);
      }
      sendJson(res, 200, {
        ok: true,
        roomId: targetRoom.roomId,
        teamAName: targetRoom.teamAName,
        teamBName: targetRoom.teamBName,
        matchType: targetRoom.matchType,
        slots: targetRoom.slots
      });
      return;
    }

    // POST /api/match/slot/switch-team
    if (req.method === "POST" && pathname === "/api/match/slot/switch-team") {
      const body = await parseJsonBody(req);
      const targetRoom = getRoom(body.room || roomId);
      const slotId = body.slotId;
      const currentSlot = targetRoom.slots.find((s) => s.slotId === slotId);
      if (currentSlot) {
        const currentTeam = currentSlot.teamCode;
        const targetTeam = currentTeam === "A" ? "B" : "A";
        const targetSlot = targetRoom.slots.find(
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

          targetRoom.messages.push({
            id: "msg_team_" + Date.now(),
            sender: "Hệ thống",
            role: "system",
            team: "SYS",
            text: `${prevData.playerName || "Người chơi"} đã chuyển sang Đội ${targetTeam}`,
            timestamp: Date.now()
          });
        }
      }
      sendJson(res, 200, { ok: true, roomId: targetRoom.roomId, slots: targetRoom.slots });
      return;
    }

    // POST /api/match/slot/update (Thêm BOT, đổi cấp độ, gán slot)
    if (req.method === "POST" && pathname === "/api/match/slot/update") {
      const body = await parseJsonBody(req);
      const targetRoom = getRoom(body.room || roomId);
      const slot = targetRoom.slots.find((s) => s.slotId === body.slotId);

      if (slot) {
        if (body.playerType) slot.playerType = body.playerType;
        if (body.botDifficulty) slot.botDifficulty = body.botDifficulty;
        if (body.playerName) slot.playerName = body.playerName;
        if (body.botId) slot.botId = body.botId;
        if (body.status) slot.status = body.status;
      }

      sendJson(res, 200, { ok: true, roomId: targetRoom.roomId, slots: targetRoom.slots });
      return;
    }

    // POST /api/match/slot/join (Người thật tham gia slot trống)
    if (req.method === "POST" && pathname === "/api/match/slot/join") {
      const body = await parseJsonBody(req);
      const targetRoom = getRoom(body.room || roomId);
      let slot = targetRoom.slots.find((s) => s.slotId === body.slotId);
      if (!slot) {
        slot = targetRoom.slots.find((s) => s.playerType === "empty" || s.playerType === "bot");
      }

      if (slot) {
        slot.playerType = "human";
        slot.playerId = body.playerId || `human-${Date.now()}`;
        slot.playerName = body.playerName || "Vận động viên";
        slot.botId = null;
        slot.botDifficulty = null;
        slot.status = "ready";

        targetRoom.messages.push({
          id: "msg_join_" + Date.now(),
          sender: "Hệ thống",
          role: "system",
          team: "SYS",
          text: `${slot.playerName} đã tham gia vị trí ${slot.slotId} (Đội ${slot.teamCode})!`,
          timestamp: Date.now()
        });
      }

      sendJson(res, 200, { ok: true, roomId: targetRoom.roomId, slots: targetRoom.slots });
      return;
    }

    // POST /api/match/leave
    if (req.method === "POST" && pathname === "/api/match/leave") {
      const body = await parseJsonBody(req);
      const targetRoom = getRoom(body.room || roomId);
      const targetSlot = targetRoom.slots.find((s) => s.slotId === body.slotId || s.playerId === body.playerId);
      if (targetSlot && targetSlot.slotId !== "A1") {
        const name = targetSlot.playerName;
        targetSlot.playerType = "bot";
        targetSlot.botId = `BOT_${targetSlot.slotId}`;
        targetSlot.playerName = targetSlot.teamCode === "A" ? "Maya (AI)" : "Matt (AI)";
        targetSlot.botDifficulty = "normal";
        targetSlot.status = "ready";

        targetRoom.messages.push({
          id: "msg_leave_" + Date.now(),
          sender: "Hệ thống",
          role: "system",
          team: "SYS",
          text: `${name} đã rời phòng. Máy BOT tự động thế chỗ.`,
          timestamp: Date.now()
        });
      }
      sendJson(res, 200, { ok: true, roomId: targetRoom.roomId, slots: targetRoom.slots });
      return;
    }

    // POST /api/match/sync (Đồng bộ snapshot bóng và vị trí)
    if (req.method === "POST" && pathname === "/api/match/sync") {
      const body = await parseJsonBody(req);
      const targetRoom = getRoom(body.room || roomId);
      targetRoom.stateSeq += 1;
      targetRoom.p1DesktopSeenTs = Date.now();
      targetRoom.matchSnapshot = {
        ...(body.snapshot || body),
        seq: targetRoom.stateSeq,
        serverTimeMs: Date.now()
      };
      sendJson(res, 200, { ok: true, roomId: targetRoom.roomId, seq: targetRoom.stateSeq });
      return;
    }

    // POST /api/racket/swing
    if (req.method === "POST" && pathname === "/api/racket/swing") {
      const body = await parseJsonBody(req);
      sendJson(res, 200, { ok: true, swing: body });
      return;
    }

    // GET /api/tournament/bracket
    if (req.method === "GET" && pathname === "/api/tournament/bracket") {
      sendJson(res, 200, {
        ok: true,
        tournament: {
          id: "TOUR-HACHIHI-2026",
          name: "Pickleball Hachihi Mở Rộng 2026",
          matchType: room.matchType,
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
              matches: [
                { matchId: "FINALS", teamA: "Thắng Bán Kết 1", teamB: "Thắng Bán Kết 2", winner: null }
              ]
            }
          ]
        }
      });
      return;
    }
  }

  // --- Static Asset Serving (Production mode / Render.com) ---
  let filePath = path.join(DIST_DIR, pathname === "/" ? "index.html" : pathname);
  
  // If not built yet or running in root, fallback to applet root
  if (!fs.existsSync(DIST_DIR)) {
    filePath = path.join(__dirname, pathname === "/" ? "index.html" : pathname);
  }

  // Fallback to index.html for SPA routing
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = fs.existsSync(path.join(DIST_DIR, "index.html"))
      ? path.join(DIST_DIR, "index.html")
      : path.join(__dirname, "index.html");
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";
    const data = fs.readFileSync(filePath);

    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", data.length);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(data);
  } catch (err) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("404 Not Found");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Pickleball Server] Running on http://0.0.0.0:${PORT} (Render / Production ready)`);
});
