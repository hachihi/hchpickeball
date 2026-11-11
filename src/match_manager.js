// Match Manager
// Quản lý trạng thái phòng, phân bổ slots, hỗ trợ linh hoạt Người Thật + BOT & Chat

import { globalMatchDB } from "./db/match_db.js";

export class MatchManager {
  constructor({ roomId = "10150", matchType = "doubles", hostName = "Hachihi Pro" } = {}) {
    this.roomId = roomId;
    this.matchType = matchType; // 'singles' | 'doubles'
    this.hostName = hostName;
    this.teamAName = "Đội A";
    this.teamBName = "Đội B";
    this.teamAColor = "#ffea28";
    this.teamBColor = "#25a8f5";
    this.botDifficulty = "normal";
    this.isHost = true;
    this.localPlayerSlot = "A1";
    this.scenery = "landmark81";
    this.sound = { music: true, sfx: true };
    this.currentMatch = null;
    this.slots = [];
    this.messages = [];
    this.started = false;
    this.initDefaultMatch();
  }

  initDefaultMatch() {
    const created = globalMatchDB.createMatch({
      roomId: this.roomId,
      matchType: this.matchType,
      teamAName: this.teamAName,
      teamBName: this.teamBName
    });

    this.currentMatch = created.match;
    this.slots = created.slots;

    // Slot A1: Host (Human)
    globalMatchDB.assignHumanToSlot(this.currentMatch.id, "A1", {
      playerId: "p1",
      playerName: this.hostName,
      avatar: "player1"
    });

    // Slots A2, B1, B2 để trống, chờ người chơi tham gia hoặc chủ phòng thêm Bot thủ công
    this.slots = globalMatchDB.getMatchSlots(this.currentMatch.id);
  }

  // Khởi tạo danh sách slot chuẩn cho Lobby phòng mới: chỉ Host ở A1, A2, B1, B2 để trống
  // Online room: ONLY the host (A1) is seated. Singles = 2 seats (A1, B1); doubles = 4 seats. Nothing is auto-filled with BOTs:
  // the host adds BOTs himself. (Offline/solo keeps using autoFillBots.)
  initRoomLobbySlots(hostName = this.hostName, matchType = "doubles") {
    this.hostName = hostName || "Hachihi Pro";
    this.matchType = matchType === "singles" ? "singles" : "doubles";
    const empty = (slotId, teamCode, slotNumber, avatar) => ({
      slotId, teamCode, slotNumber, playerType: "empty", playerId: null, botId: null,
      playerName: "Đang chờ người chơi...", botDifficulty: null, status: "waiting", avatar
    });
    const slots = [{
      slotId: "A1", teamCode: "A", slotNumber: 1, playerType: "human", playerId: "p1", playerName: this.hostName,
      botId: null, botDifficulty: null, status: "ready", avatar: "player1"
    }];
    if (this.matchType === "doubles") slots.push(empty("A2", "A", 2, "player2"));
    slots.push(empty("B1", "B", 1, "opponent1"));
    if (this.matchType === "doubles") slots.push(empty("B2", "B", 2, "opponent2"));
    this.slots = slots;
    this.started = false;
    return this.slots;
  }

  // Thêm Bot thủ công vào đội A hoặc đội B
  addBotToTeam(teamCode = "A", difficulty = this.botDifficulty) {
    // only a vacant seat: never replaces a human or another BOT
    const slot = this.slots.find(s => s.teamCode === teamCode && s.playerType === "empty");
    if (slot) {
      return this.addBot(slot.slotId, difficulty);
    }
    return null;
  }

  // Tự động add BOT vào cho đủ theo thể thức 1-1 hay 2-2
  autoFillBots(type = this.matchType, difficulty = this.botDifficulty) {
    this.matchType = type === "singles" ? "singles" : "doubles";
    this.botDifficulty = difficulty;

    const botDefs = {
      A2: { id: "BOT_MAYA", name: "Maya (AI)", avatar: "player2" },
      B1: { id: "BOT_MATT", name: "Matt (AI)", avatar: "opponent1" },
      B2: { id: "BOT_AKIRA", name: "Akira (AI)", avatar: "opponent2" }
    };

    if (this.matchType === "singles") {
      // 1-1: Chỉ cần A1 (bạn) và B1 (Bot)
      this.slots = [
        {
          slotId: "A1",
          teamCode: "A",
          slotNumber: 1,
          playerType: "human",
          playerId: "p1",
          playerName: this.hostName,
          botId: null,
          botDifficulty: null,
          status: "ready",
          avatar: "player1"
        },
        {
          slotId: "B1",
          teamCode: "B",
          slotNumber: 1,
          playerType: "bot",
          playerId: null,
          botId: "BOT_MATT",
          playerName: "Matt (AI)",
          botDifficulty: difficulty,
          status: "ready",
          avatar: "opponent1"
        }
      ];
    } else {
      // 2-2: Đủ 4 vị trí A1, A2, B1, B2
      const existingA1 = this.slots.find(s => s.slotId === "A1");
      const existingA2 = this.slots.find(s => s.slotId === "A2" && s.playerType === "human");
      const existingB1 = this.slots.find(s => s.slotId === "B1" && s.playerType === "human");
      const existingB2 = this.slots.find(s => s.slotId === "B2" && s.playerType === "human");

      this.slots = [
        existingA1 || {
          slotId: "A1",
          teamCode: "A",
          slotNumber: 1,
          playerType: "human",
          playerId: "p1",
          playerName: this.hostName,
          botId: null,
          botDifficulty: null,
          status: "ready",
          avatar: "player1"
        },
        existingA2 || {
          slotId: "A2",
          teamCode: "A",
          slotNumber: 2,
          playerType: "bot",
          playerId: null,
          botId: botDefs.A2.id,
          playerName: botDefs.A2.name,
          botDifficulty: difficulty,
          status: "ready",
          avatar: botDefs.A2.avatar
        },
        existingB1 || {
          slotId: "B1",
          teamCode: "B",
          slotNumber: 1,
          playerType: "bot",
          playerId: null,
          botId: botDefs.B1.id,
          playerName: botDefs.B1.name,
          botDifficulty: difficulty,
          status: "ready",
          avatar: botDefs.B1.avatar
        },
        existingB2 || {
          slotId: "B2",
          teamCode: "B",
          slotNumber: 2,
          playerType: "bot",
          playerId: null,
          botId: botDefs.B2.id,
          playerName: botDefs.B2.name,
          botDifficulty: difficulty,
          status: "ready",
          avatar: botDefs.B2.avatar
        }
      ];
    }

    return this.slots;
  }

  // Chuyển đổi giữa Singles và Doubles
  setMatchType(newType) {
    if (newType !== "singles" && newType !== "doubles") return;
    this.matchType = newType;
    return this.autoFillBots(newType, this.botDifficulty);
  }

  // Thêm BOT vào vị trí cụ thể
  addBot(slotId, difficulty = this.botDifficulty) {
    const botNames = {
      A1: "Alex (AI)",
      A2: "Maya (AI)",
      B1: "Matt (AI)",
      B2: "Akira (AI)"
    };
    const avatarMap = {
      A1: "player1",
      A2: "player2",
      B1: "opponent1",
      B2: "opponent2"
    };

    let target = this.slots.find(s => s.slotId === slotId);
    if (!target) {
      target = {
        slotId,
        teamCode: slotId.startsWith("A") ? "A" : "B",
        slotNumber: parseInt(slotId.slice(1), 10) || 1
      };
      this.slots.push(target);
    }

    target.playerType = "bot";
    target.botId = `BOT_${slotId}`;
    target.playerName = botNames[slotId] || `BOT (${slotId})`;
    target.botDifficulty = difficulty;
    target.avatar = avatarMap[slotId] || "player1";
    target.status = "ready";

    return target;
  }

  // Đổi cấp độ khó của BOT
  setBotDifficulty(slotId, difficulty) {
    const target = this.slots.find(s => s.slotId === slotId);
    if (target) {
      target.botDifficulty = difficulty;
    }
    return target;
  }

  // Chuyển người chơi qua đội đối diện
  switchTeam(slotId) {
    const current = this.slots.find(s => s.slotId === slotId);
    if (!current) return false;
    const currentTeam = current.teamCode;
    const targetTeam = currentTeam === "A" ? "B" : "A";

    const targetSlot = this.slots.find(
      s => s.teamCode === targetTeam && (s.playerType === "empty" || s.playerType === "bot")
    );

    if (targetSlot) {
      const temp = {
        playerType: current.playerType,
        playerId: current.playerId,
        playerName: current.playerName,
        botId: current.botId,
        botDifficulty: current.botDifficulty,
        status: current.status,
        avatar: current.avatar
      };

      current.playerType = targetSlot.playerType;
      current.playerId = targetSlot.playerId;
      current.playerName = targetSlot.playerName;
      current.botId = targetSlot.botId;
      current.botDifficulty = targetSlot.botDifficulty;
      current.status = targetSlot.status;

      targetSlot.playerType = temp.playerType;
      targetSlot.playerId = temp.playerId;
      targetSlot.playerName = temp.playerName;
      targetSlot.botId = temp.botId;
      targetSlot.botDifficulty = temp.botDifficulty;
      targetSlot.status = temp.status;

      if (slotId === this.localPlayerSlot) {
        this.localPlayerSlot = targetSlot.slotId;
      }
      return true;
    }
    return false;
  }

  // Tráo đổi vị trí giữa 2 slot (hỗ trợ kéo thả drag & drop)
  swapSlots(fromSlotId, toSlotId) {
    if (fromSlotId === toSlotId) return false;
    const fromSlot = this.slots.find(s => s.slotId === fromSlotId);
    const toSlot = this.slots.find(s => s.slotId === toSlotId);
    if (!fromSlot || !toSlot) return false;

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

    if (this.localPlayerSlot === fromSlotId) {
      this.localPlayerSlot = toSlotId;
    } else if (this.localPlayerSlot === toSlotId) {
      this.localPlayerSlot = fromSlotId;
    }
    return true;
  }

  // Kéo thả hoặc di chuyển một slot sang một đội mục tiêu
  moveToTeam(fromSlotId, targetTeamCode) {
    const fromSlot = this.slots.find(s => s.slotId === fromSlotId);
    if (!fromSlot) return false;
    if (fromSlot.teamCode === targetTeamCode) return false;

    // Tìm slot trống trước
    let toSlot = this.slots.find(s => s.teamCode === targetTeamCode && s.playerType === "empty");
    if (!toSlot) {
      toSlot = this.slots.find(s => s.teamCode === targetTeamCode && s.playerType === "bot");
    }
    if (!toSlot) {
      toSlot = this.slots.find(s => s.teamCode === targetTeamCode);
    }
    if (toSlot && toSlot.slotId !== fromSlotId) {
      return this.swapSlots(fromSlotId, toSlot.slotId);
    }
    return false;
  }

  // Đưa slot về trạng thái trống để chờ người vào
  clearSlot(slotId) {
    const target = this.slots.find(s => s.slotId === slotId);
    if (target) {
      target.playerType = "empty";
      target.playerId = null;
      target.playerName = "Đang chờ...";
      target.botId = null;
      target.botDifficulty = null;
      target.status = "waiting";
    }
    return target;
  }

  // Kiểm tra điều kiện có thể bắt đầu trận đấu
  canStart() {
    // Every seat of the chosen mode (2 for singles, 4 for doubles) holds a human or a BOT, and at least one human is present.
    const need = this.matchType === "singles" ? 2 : 4;
    return this.slots.length === need &&
      this.slots.every(s => s.playerType === "human" || s.playerType === "bot") &&
      this.slots.some(s => s.playerType === "human");
  }

  // Human-readable reason the start button is disabled ("" when the match can start)
  startBlockedReason() {
    if (this.canStart()) return "";
    const n = this.slots.filter(s => s.playerType === "empty").length;
    return n
      ? `Còn ${n} chỗ trống: chờ bạn bè vào, hoặc bấm “🤖 + Máy” ở chỗ trống để thêm máy.`
      : "Chưa đủ người để bắt đầu.";
  }

  // Trả về cấu hình cho từng Actor trong Game Engine
  getActorMapping() {
    const slotMap = {};
    for (const slot of this.slots) {
      slotMap[slot.slotId] = slot;
    }

    return {
      matchType: this.matchType,
      teamAName: this.teamAName,
      teamBName: this.teamBName,
      teamAColor: this.teamAColor,
      teamBColor: this.teamBColor,
      player: slotMap["A1"] || null,
      playerPartner: slotMap["A2"] || null,
      opponent: slotMap["B1"] || null,
      opponentPartner: slotMap["B2"] || null
    };
  }

  getState() {
    return {
      roomId: this.roomId,
      matchType: this.matchType,
      hostName: this.hostName,
      teamAName: this.teamAName,
      teamBName: this.teamBName,
      teamAColor: this.teamAColor,
      teamBColor: this.teamBColor,
      botDifficulty: this.botDifficulty,
      scenery: this.scenery,
      canStart: this.canStart(),
      slots: this.slots,
      messages: this.messages,
      started: this.started
    };
  }

  setScenery(sceneryId) {
    if (sceneryId) {
      this.scenery = sceneryId;
    }
    return this.scenery;
  }

  // Đồng bộ trạng thái từ Server
  syncFromServer(serverData) {
    if (!serverData) return;
    if (serverData.matchType && serverData.matchType !== this.matchType) {
      this.matchType = serverData.matchType;
    }
    if (serverData.slots && Array.isArray(serverData.slots)) {
      this.slots = serverData.slots;
    }
    if (serverData.roomId) {
      this.roomId = serverData.roomId;
    }
    if (serverData.hostName) this.hostName = serverData.hostName;
    if (serverData.teamAName) this.teamAName = serverData.teamAName;
    if (serverData.teamBName) this.teamBName = serverData.teamBName;
    if (serverData.teamAColor) this.teamAColor = serverData.teamAColor;
    if (serverData.teamBColor) this.teamBColor = serverData.teamBColor;
    if (serverData.botDifficulty) this.botDifficulty = serverData.botDifficulty;
    if (serverData.scenery) this.scenery = serverData.scenery;
    if (serverData.sound) this.sound = { music: serverData.sound.music !== false, sfx: serverData.sound.sfx !== false };
    // the server owns seat assignment: a guest moved/re-seated by the host must follow it, or swings go to the wrong actor
    if (!this.isHost && serverData.mySlot) this.localPlayerSlot = serverData.mySlot;
    if (serverData.messages && Array.isArray(serverData.messages)) {
      this.messages = serverData.messages;
    }
    if (serverData.started !== undefined) {
      this.started = !!serverData.started;
    }
  }
}

