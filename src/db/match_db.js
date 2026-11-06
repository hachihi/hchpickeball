// Match Database & Relational Storage Layer
// Triển khai đúng đặc tả Mục 10: matches, match_teams, match_players, tournaments

export class MatchDatabase {
  constructor() {
    this.matches = new Map();
    this.matchTeams = new Map();
    this.matchPlayers = new Map();
    this.tournaments = new Map();
    this.initDefaultSeed();
  }

  initDefaultSeed() {
    // Seed giải đấu mặc định Hachihi Open 2026
    const defaultTournament = {
      id: "TOUR-HACHIHI-2026",
      name: "Pickleball Hachihi Mở Rộng 2026",
      matchType: "doubles",
      totalSlots: 8, // 4 đội (Bán kết + Chung kết)
      allowBots: true,
      defaultBotDifficulty: "normal",
      status: "active",
      createdAt: Date.now()
    };
    this.tournaments.set(defaultTournament.id, defaultTournament);
  }

  // Tạo trận đấu mới theo thể thức Singles hoặc Doubles
  createMatch({
    roomId,
    tournamentId = null,
    matchType = "doubles",
    gamesToWin = 2,
    teamAName = "Đội A",
    teamBName = "Đội B"
  }) {
    if (!["singles", "doubles"].includes(matchType)) {
      throw new Error(`matchType không hợp lệ: ${matchType}. Chỉ chấp nhận 'singles' hoặc 'doubles'.`);
    }

    const matchId = `MATCH-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const timestamp = Date.now();

    const matchRecord = {
      id: matchId,
      roomId: roomId || `ROOM-${matchId}`,
      tournamentId,
      matchType,
      gamesToWin,
      status: "pending",
      scoreTeamA: 0,
      scoreTeamB: 0,
      gamesTeamA: 0,
      gamesTeamB: 0,
      winnerTeamId: null,
      startedAt: null,
      completedAt: null,
      createdAt: timestamp
    };
    this.matches.set(matchId, matchRecord);

    // Tạo 2 teams
    const teamAId = `${matchId}-TEAM-A`;
    const teamBId = `${matchId}-TEAM-B`;

    this.matchTeams.set(teamAId, {
      id: teamAId,
      matchId,
      teamCode: "A",
      teamName: teamAName
    });

    this.matchTeams.set(teamBId, {
      id: teamBId,
      matchId,
      teamCode: "B",
      teamName: teamBName
    });

    // Tạo danh sách slots theo thể thức
    const slotCount = matchType === "singles" ? 2 : 4;
    const slots = [];

    // Team A: Slot 1 (và Slot 2 nếu doubles)
    slots.push(this._createSlotRecord(matchId, teamAId, "A", 1));
    if (matchType === "doubles") {
      slots.push(this._createSlotRecord(matchId, teamAId, "A", 2));
    }

    // Team B: Slot 1 (và Slot 2 nếu doubles)
    slots.push(this._createSlotRecord(matchId, teamBId, "B", 1));
    if (matchType === "doubles") {
      slots.push(this._createSlotRecord(matchId, teamBId, "B", 2));
    }

    return {
      match: matchRecord,
      teams: { teamA: this.matchTeams.get(teamAId), teamB: this.matchTeams.get(teamBId) },
      slots
    };
  }

  _createSlotRecord(matchId, teamId, teamCode, slotNumber) {
    const slotId = `${teamCode}${slotNumber}`; // A1, A2, B1, B2
    const recordId = `${matchId}-${slotId}`;
    const slotRecord = {
      id: recordId,
      matchId,
      teamId,
      teamCode,
      slotNumber,
      slotId,
      playerType: "empty", // 'human', 'bot', 'empty'
      playerId: null,
      playerName: `Vị trí ${slotId}`,
      botId: null,
      botDifficulty: "normal",
      status: "empty", // 'empty', 'waiting', 'ready', 'playing', 'disconnected'
      avatar: teamCode === "A" ? (slotNumber === 1 ? "player1" : "player2") : (slotNumber === 1 ? "opponent1" : "opponent2"),
      joinedAt: null
    };
    this.matchPlayers.set(recordId, slotRecord);
    return slotRecord;
  }

  // Gán người thật vào slot
  assignHumanToSlot(matchId, slotId, { playerId, playerName, avatar }) {
    if (!playerId) throw new Error("Yêu cầu playerId cho người chơi thật");
    const record = this._getSlot(matchId, slotId);

    // Kiểm tra ràng buộc: không cho 1 người chiếm nhiều slot trong cùng trận
    const existingSlots = this.getMatchSlots(matchId);
    const alreadyJoined = existingSlots.find(s => s.playerType === "human" && s.playerId === playerId && s.slotId !== slotId);
    if (alreadyJoined) {
      throw new Error(`Người chơi ${playerId} đã tham gia ở vị trí ${alreadyJoined.slotId}`);
    }

    record.playerType = "human";
    record.playerId = playerId;
    record.playerName = playerName || `Vận động viên (${slotId})`;
    record.botId = null;
    record.botDifficulty = null;
    record.status = "ready";
    record.avatar = avatar || record.avatar;
    record.joinedAt = Date.now();
    return record;
  }

  // Gán BOT vào slot còn trống
  assignBotToSlot(matchId, slotId, { botId = null, botName = null, botDifficulty = "normal", avatar = null }) {
    const record = this._getSlot(matchId, slotId);
    const fallbackBotId = botId || `BOT-${slotId}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const defaultBotNames = {
      A1: "Alex (AI)",
      A2: "Maya (AI)",
      B1: "Matt (AI)",
      B2: "Akira (AI)"
    };

    record.playerType = "bot";
    record.playerId = null;
    record.botId = fallbackBotId;
    record.playerName = botName || defaultBotNames[slotId] || `BOT (${slotId})`;
    record.botDifficulty = ["easy", "normal", "hard"].includes(botDifficulty) ? botDifficulty : "normal";
    record.status = "ready";
    record.avatar = avatar || record.avatar;
    record.joinedAt = Date.now();
    return record;
  }

  // Thay đổi cấp độ BOT
  updateBotDifficulty(matchId, slotId, difficulty) {
    const record = this._getSlot(matchId, slotId);
    if (record.playerType !== "bot") {
      throw new Error(`Slot ${slotId} không phải là BOT`);
    }
    record.botDifficulty = ["easy", "normal", "hard"].includes(difficulty) ? difficulty : "normal";
    return record;
  }

  // Xóa / Trả về trạng thái trống cho slot
  clearSlot(matchId, slotId) {
    const record = this._getSlot(matchId, slotId);
    record.playerType = "empty";
    record.playerId = null;
    record.botId = null;
    record.playerName = `Vị trí ${slotId} (Trống)`;
    record.botDifficulty = null;
    record.status = "empty";
    record.joinedAt = null;
    return record;
  }

  // Kiểm tra điều kiện bắt đầu trận: tất cả slots phải có Human hoặc BOT (không còn empty)
  canStartMatch(matchId) {
    const slots = this.getMatchSlots(matchId);
    if (slots.length === 0) return false;
    return slots.every(s => (s.playerType === "human" || s.playerType === "bot") && s.status === "ready");
  }

  startMatch(matchId) {
    const match = this.matches.get(matchId);
    if (!match) throw new Error(`Không tìm thấy match ${matchId}`);
    if (!this.canStartMatch(matchId)) {
      throw new Error("Chưa đủ người thật hoặc BOT cho tất cả vị trí của trận đấu");
    }
    match.status = "in_progress";
    match.startedAt = Date.now();
    this.getMatchSlots(matchId).forEach(s => s.status = "playing");
    return match;
  }

  recordMatchScore(matchId, { scoreTeamA, scoreTeamB, gamesTeamA, gamesTeamB, isOver = false }) {
    const match = this.matches.get(matchId);
    if (!match) return null;
    match.scoreTeamA = scoreTeamA;
    match.scoreTeamB = scoreTeamB;
    match.gamesTeamA = gamesTeamA;
    match.gamesTeamB = gamesTeamB;

    if (isOver) {
      match.status = "completed";
      match.completedAt = Date.now();
      match.winnerTeamId = gamesTeamA > gamesTeamB ? "A" : "B";
      this.getMatchSlots(matchId).forEach(s => s.status = "completed");
    }
    return match;
  }

  // Xử lý mất kết nối
  markPlayerDisconnected(matchId, playerId) {
    const slots = this.getMatchSlots(matchId);
    const target = slots.find(s => s.playerId === playerId);
    if (target) {
      target.status = "disconnected";
      return target;
    }
    return null;
  }

  // Cho phép BOT tạm thời thay thế người thật khi mất kết nối
  replaceWithBot(matchId, slotId, botDifficulty = "normal") {
    const record = this._getSlot(matchId, slotId);
    record.finalStatus = "replaced_by_bot";
    record.playerType = "bot";
    record.botId = `SUB-BOT-${slotId}`;
    record.playerName = `AI Thay Thế (${slotId})`;
    record.botDifficulty = botDifficulty;
    record.status = "playing";
    return record;
  }

  // Lấy danh sách slots của match
  getMatchSlots(matchId) {
    const result = [];
    for (const [_, slot] of this.matchPlayers) {
      if (slot.matchId === matchId) {
        result.push(slot);
      }
    }
    return result.sort((a, b) => a.slotId.localeCompare(b.slotId));
  }

  _getSlot(matchId, slotId) {
    const recordId = `${matchId}-${slotId}`;
    const record = this.matchPlayers.get(recordId);
    if (!record) {
      throw new Error(`Không tìm thấy slot ${slotId} trong match ${matchId}`);
    }
    return record;
  }

  getMatch(matchId) {
    return this.matches.get(matchId) || null;
  }

  getMatchByRoomId(roomId) {
    for (const [_, m] of this.matches) {
      if (m.roomId === roomId) return m;
    }
    return null;
  }

  // Tournament operations
  createTournament({ name, matchType = "doubles", totalTeams = 4, allowBots = true, botDifficulty = "normal" }) {
    const tourId = `TOUR-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const record = {
      id: tourId,
      name: name || `Giải Đấu Pickleball Hachihi (${matchType.toUpperCase()})`,
      matchType,
      totalTeams,
      allowBots,
      botDifficulty,
      rounds: [],
      status: "active",
      createdAt: Date.now()
    };

    // Tạo các nhánh đấu Bracket (Bán kết + Chung kết)
    const teams = [];
    for (let i = 1; i <= totalTeams; i++) {
      teams.push({
        teamId: `T${i}`,
        name: i === 1 ? "Hachihi Pro" : `Đội CLB ${i}`,
        isHuman: i === 1,
        botDifficulty: allowBots ? botDifficulty : null
      });
    }

    record.rounds = [
      {
        roundName: totalTeams === 4 ? "Bán kết (Semi-Finals)" : "Vòng 1 (Quarter-Finals)",
        matches: [
          { matchId: `${tourId}-M1`, teamA: teams[0], teamB: teams[1], winner: null },
          { matchId: `${tourId}-M2`, teamA: teams[2], teamB: teams[3], winner: null }
        ]
      },
      {
        roundName: "Chung kết (Final)",
        matches: [
          { matchId: `${tourId}-FINALS`, teamA: null, teamB: null, winner: null }
        ]
      }
    ];

    this.tournaments.set(tourId, record);
    return record;
  }

  getTournament(tourId) {
    return this.tournaments.get(tourId) || null;
  }
}

// Global Singleton for in-app runtime
export const globalMatchDB = new MatchDatabase();
