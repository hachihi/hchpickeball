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

    // Nếu là Doubles: Slot A2 mặc định là BOT đồng đội
    if (this.matchType === "doubles") {
      globalMatchDB.assignBotToSlot(this.currentMatch.id, "A2", {
        botId: "BOT_MAYA",
        botName: "Maya (AI)",
        botDifficulty: this.botDifficulty,
        avatar: "player2"
      });
    }

    // Slot B1: Mặc định là BOT đối thủ
    globalMatchDB.assignBotToSlot(this.currentMatch.id, "B1", {
      botId: "BOT_MATT",
      botName: "Matt (AI)",
      botDifficulty: this.botDifficulty,
      avatar: "opponent1"
    });

    // Nếu là Doubles: Slot B2 mặc định là BOT đối thủ 2
    if (this.matchType === "doubles") {
      globalMatchDB.assignBotToSlot(this.currentMatch.id, "B2", {
        botId: "BOT_AKIRA",
        botName: "Akira (AI)",
        botDifficulty: this.botDifficulty,
        avatar: "opponent2"
      });
    }

    this.slots = globalMatchDB.getMatchSlots(this.currentMatch.id);
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
    const teamAActive = this.slots.filter(s => s.teamCode === "A" && s.playerType !== "empty");
    const teamBActive = this.slots.filter(s => s.teamCode === "B" && s.playerType !== "empty");

    if (this.matchType === "singles") {
      return teamAActive.length >= 1 && teamBActive.length >= 1;
    }
    return teamAActive.length >= 1 && teamBActive.length >= 1 && (teamAActive.length + teamBActive.length >= 2);
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
      canStart: this.canStart(),
      slots: this.slots,
      messages: this.messages,
      started: this.started
    };
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
    if (serverData.teamAName) this.teamAName = serverData.teamAName;
    if (serverData.teamBName) this.teamBName = serverData.teamBName;
    if (serverData.teamAColor) this.teamAColor = serverData.teamAColor;
    if (serverData.teamBColor) this.teamBColor = serverData.teamBColor;
    if (serverData.botDifficulty) this.botDifficulty = serverData.botDifficulty;
    if (serverData.messages && Array.isArray(serverData.messages)) {
      this.messages = serverData.messages;
    }
    if (serverData.started !== undefined) {
      this.started = !!serverData.started;
    }
  }
}

