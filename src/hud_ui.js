import { renderAllHudMiiAvatars as P, renderMiiAvatar as L } from "./mii_avatars.js";
import { MatchManager } from "./match_manager.js";
import { drawQRCodeToCanvas } from "./qr_generator.js";
import { SCENERIES } from "./court_scenery.js";

const I18N = {
  vi: {
    langBtn: "🇻🇳 VI",
    rulesBtn: "Luật chơi",
    rulesTitleBtn: "Xem Luật Chơi Pickleball",
    rulesModalTitle: "📖 Luật Chơi Cơ Bản Cho Người Mới",
    rulesModalSubtitle: "5 quy tắc cốt lõi chuẩn quốc tế được áp dụng trực tiếp trong game",
    rulesCloseBtn: "Đã hiểu • Vào sân thi đấu!",
    startMatch: "Bắt đầu trận đấu",
    casualAi: "Người mới",
    proAi: "Chuyên nghiệp",
    match1v1: "Đấu 1v1",
    game1: "1 Ván (11đ)",
    bestOf3: "Bo3 (11đ)",
    bestOf5: "Nhanh (5đ)",
    playerNameLabel: "Tên Vận Động Viên:",
    playAgain: "Chơi lại",
    menu: "Trang chủ",
    webcamMotion: "Webcam",
    replay: "Xem lại",
    camPrefix: "Góc:",
    gaugeTitle: "ĐỘ CHUẨN VUNG VỢT",
    gaugeSpeedReady: "SẴN SÀNG",
    zoneEarly: "SỚM (Chéo)",
    zoneSweet: "ĐIỂM NGỌT",
    zoneLate: "MUỘN (Dọc)",
    clubRatingHeader: "Bảng Xếp Hạng Kỹ Năng CLB Hachihi",
    serverTag: "Giao bóng",
    youWin: "BẠN CHIẾN THẮNG!",
    tryAgain: "CỐ GẮNG LẦN SAU!",
    skillPrefix: "Điểm CLB"
  },
  en: {
    langBtn: "🇬🇧 EN",
    rulesBtn: "Rules",
    rulesTitleBtn: "View Pickleball Rules",
    rulesModalTitle: "📖 Basic Pickleball Rules for Beginners",
    rulesModalSubtitle: "5 core official rules enforced directly inside the game",
    rulesCloseBtn: "Got it • Back to Court!",
    startMatch: "Start Match",
    casualAi: "Casual AI",
    proAi: "Pro AI",
    match1v1: "1v1 Match",
    game1: "1 Game (11pts)",
    bestOf3: "Best of 3 (11pts)",
    bestOf5: "Fast (5pts)",
    playerNameLabel: "Player Name:",
    playAgain: "Play again",
    menu: "Menu",
    webcamMotion: "Webcam Motion",
    replay: "Replay",
    camPrefix: "Cam:",
    gaugeTitle: "SWING TIMING",
    gaugeSpeedReady: "READY",
    zoneEarly: "EARLY (Cross)",
    zoneSweet: "SWEET SPOT",
    zoneLate: "LATE (Line)",
    clubRatingHeader: "Hachihi Club Skill Rating",
    serverTag: "Server",
    youWin: "YOU WIN!",
    tryAgain: "TRY AGAIN!",
    skillPrefix: "Skill Level"
  }
};

// Nhãn cấp độ bot hiển thị trong lobby (nhận cả khoá cũ casual/pro/turbo)
function botLevelLabel(level) {
  const k = String(level || "normal").toLowerCase();
  if (k === "easy" || k === "casual" || k === "1") return "Cấp 1 [Dở]";
  if (k === "hard" || k === "1v1" || k === "turbo" || k === "3") return "Cấp 3 [Rất thông minh]";
  return "Cấp 2 [Hay]";
}

export class HudUI {
  constructor(t = {}) {
    this.callbacks = t;
    this.bannerTimer = null;
    this.timingPopupTimer = null;
    this.skillHistory = [980, 1005, 1030, 1065, 1120];
    this.selectedGamesToWin = 2;
    this.selectedInputMode = "mouse";
    this.selectedDifficulty = "casual";
    this.currentRoomId = "default";
    this.currentTunnelUrl = "https://argon-tennis-sandbox-170440.uc.r.appspot.com";
    this.currentLang = "vi";
    this.playerName = "Hachihi Pro";

    this.matchManager = t.matchManager || new MatchManager({
      roomId: this.currentRoomId,
      matchType: "doubles",
      hostName: this.playerName
    });

    this.elTitleModal = document.getElementById("title-modal");
    this.elCompanionModal = document.getElementById("companion-modal");
    this.elVictoryModal = document.getElementById("victory-modal");
    this.elRulesModal = document.getElementById("rules-modal");
    this.elPortalModal = document.getElementById("hachihi-portal-modal");
    this.elRoomLobbyModal = document.getElementById("room-lobby-modal");
    this.elPauseModal = document.getElementById("pause-exit-modal");
    this.elReconnectModal = document.getElementById("match-reconnect-modal");
    this.selectedGameMode = "offline"; // "offline" | "lan" | "online" | "tournament"

    this.elScoreCenter = document.getElementById("score-center-display");
    this.elScorePlayer = document.getElementById("score-player-text");
    this.elScoreSep = document.getElementById("score-separator");
    this.elScoreOpponent = document.getElementById("score-opponent-text");
    this.elScoreServerBadge = document.getElementById("score-server-badge");

    this.elGamesPlayer = document.getElementById("games-pill-player");
    this.elGamesOpponent = document.getElementById("games-pill-opponent");
    this.elServerTag = document.getElementById("server-tag");
    this.elPlayerNameplate = document.getElementById("player-nameplate");
    this.elTimingPopup = document.getElementById("timing-popup");
    this.elTimingGrade = document.getElementById("timing-popup-grade");
    this.elTimingDetail = document.getElementById("timing-popup-detail");
    this.elBannerLayer = document.getElementById("center-banner-layer");
    this.elBannerText = document.getElementById("center-banner-text");
    this.elBannerSub = document.getElementById("center-banner-sub");
    this.elReplayBadge = document.getElementById("replay-badge");
    this.elTimingCursor = document.getElementById("timing-cursor");
    this.elGaugeModeTitle = document.getElementById("gauge-mode-title");
    this.elGaugeSpeedReadout = document.getElementById("gauge-speed-readout");
    this.elAudioDot = document.getElementById("audio-status-dot");
    this.elAudioLabel = document.getElementById("audio-track-label");
    this.elCameraLabel = document.getElementById("camera-mode-label");
    this.elWebcamPip = document.getElementById("webcam-pip-card");
    this.elWebcamDot = document.getElementById("webcam-status-dot");
    this.elPhoneDot = document.getElementById("phone-status-dot");
    this.elPhoneLabel = document.getElementById("phone-status-label");
    this.elOpponentPresencePill = document.getElementById("opponent-presence-pill");
    this.elOpponentPresenceText = document.getElementById("opponent-presence-text");

    this._lastRoomStatus = {};
    this.primaryPlayChoice = "solo";
    this.selectedFormat = "doubles";
    this._lobbyPollTimer = null;
    this._matchStartedLocally = false;
    this.selectedScenery = "landmark81";

    this._renderAllMiiPortraits();
    this._bindEvents();
    this.setSelectedScenery(this.selectedScenery);
    this.matchManager.autoFillBots(this.selectedFormat, this.selectedDifficulty);
    this.updateSoloBotNotice();
    this._initUrlParamsState();
    this.applyLanguage(this.currentLang);
  }

  applyLanguage(t = "vi") {
    this.currentLang = t;
    const n = I18N[t] || I18N.vi;

    const e = document.getElementById("btn-lang-toggle");
    e && (e.innerHTML = `<span>${n.langBtn}</span>`);

    const rBtn = document.getElementById("btn-rules-hud-text");
    rBtn && (rBtn.textContent = n.rulesBtn);

    const rTitleBtn = document.getElementById("btn-rules-title-text");
    rTitleBtn && (rTitleBtn.textContent = n.rulesTitleBtn);

    const rModalTitle = document.getElementById("rules-modal-title");
    rModalTitle && (rModalTitle.textContent = n.rulesModalTitle);

    const rModalSub = document.getElementById("rules-modal-subtitle");
    rModalSub && (rModalSub.textContent = n.rulesModalSubtitle);

    const rCloseBtn = document.getElementById("btn-close-rules-text");
    rCloseBtn && (rCloseBtn.textContent = n.rulesCloseBtn);

    const i = document.getElementById("btn-start-match-text");
    i && (i.textContent = n.startMatch);

    const o = document.getElementById("choice-diff-casual");
    o && (o.textContent = n.casualAi);

    const s = document.getElementById("choice-diff-pro");
    s && (s.textContent = n.proAi);

    const a = document.getElementById("choice-diff-1v1");
    a && (a.textContent = n.match1v1);

    const r = document.getElementById("choice-length-1");
    r && (r.textContent = n.game1);

    const l = document.getElementById("choice-length-3");
    l && (l.textContent = n.bestOf3);

    const p = document.getElementById("choice-length-5");
    p && (p.textContent = n.bestOf5);

    const g = document.getElementById("label-player-name");
    g && (g.textContent = n.playerNameLabel);

    const c = document.getElementById("btn-play-again-text");
    c && (c.textContent = n.playAgain);

    const y = document.getElementById("btn-menu-text");
    y && (y.textContent = n.menu);

    const f = document.getElementById("btn-webcam-text");
    f && (f.textContent = n.webcamMotion);

    const m = document.getElementById("btn-replay-text");
    m && (m.textContent = n.replay);

    const d = document.getElementById("cam-label-prefix");
    d && (d.textContent = n.camPrefix);

    const b = document.getElementById("gauge-zone-early");
    b && (b.textContent = n.zoneEarly);

    const u = document.getElementById("gauge-zone-sweet");
    u && (u.textContent = n.zoneSweet);

    const w = document.getElementById("gauge-zone-late");
    w && (w.textContent = n.zoneLate);

    const x = document.getElementById("server-tag-text");
    x && (x.textContent = `${n.serverTag} (S2)`);

    const h = document.getElementById("victory-card-header");
    h && (h.textContent = n.clubRatingHeader);

    const k = document.getElementById("hud-player-skill");
    k && (k.textContent = `${n.skillPrefix} 1050`);
  }

  toggleLanguage() {
    this.applyLanguage(this.currentLang === "vi" ? "en" : "vi");
  }

  showRulesModal() {
    this.showPortalModal("rules");
  }

  hideRulesModal() {
    this.elRulesModal && this.elRulesModal.classList.add("hidden");
    this.hidePortalModal();
  }

  showPortalModal(tabName = "about") {
    this.elPortalModal && this.elPortalModal.classList.remove("hidden");
    this.switchPortalTab(tabName);
  }

  hidePortalModal() {
    this.elPortalModal && this.elPortalModal.classList.add("hidden");
  }

  switchPortalTab(tabName = "about") {
    const tabs = document.querySelectorAll(".portal-tab");
    tabs.forEach(tab => {
      const isSelected = tab.dataset.tab === tabName;
      tab.classList.toggle("active", isSelected);
      tab.setAttribute("aria-selected", isSelected ? "true" : "false");
    });

    const panes = document.querySelectorAll(".portal-tab-pane");
    panes.forEach(pane => {
      pane.classList.toggle("active", pane.id === `pane-${tabName}`);
    });
  }

  _renderAllMiiPortraits() {
    P();
  }

  _drawMiiFace(t, n = {}) {
    L(t, n.characterId || t?.id || "player1", n);
  }

  _initUrlParamsState() {
    const t = new URLSearchParams(window.location.search),
      n = (t.get("room") || "").trim().toUpperCase(),
      e = ["p2", "p3", "p4"].includes((t.get("role") || "p1").trim().toLowerCase()) ? "p2" : "p1",
      i = (t.get("mode") || t.get("difficulty") || "").toLowerCase();

    if (
      ((this.playerRole = e),
      n && n !== "DEFAULT"
        ? ((this.currentRoomId = n), this._setDifficultySelection("1v1", { notify: !1 }))
        : ["casual", "pro", "1v1"].includes(i) && this._setDifficultySelection(i, { notify: !1 }),
      e === "p2")
    ) {
      const o = document.querySelector(".you-tag");
      o && (o.textContent = "Player 1");
      const s = document.getElementById("setup-opponent-label");
      s && (s.textContent = "You");
    }
    this.updateMultiplayerRoomInfo({
      roomId: this.currentRoomId,
      tunnelUrl: this.currentTunnelUrl,
      role: this.playerRole
    });
  }

  _setDifficultySelection(t, { notify: n = !0 } = {}) {
    const e = ["casual", "pro", "1v1"].includes(t) ? t : "casual";
    (this.selectedDifficulty = e),
      document.querySelectorAll("#difficulty-mode-group .wii-green-choice").forEach(a => {
        a.classList.toggle("selected", a.dataset.difficulty === e);
      });
    const o = document.getElementById("match-length-section");
    if (e === "1v1") {
      o && o.classList.add("hidden");
      this.selectedGamesToWin = 1;
      this.configureGameBubbles(1);
      n && this.callbacks.onSelectMatchLength && this.callbacks.onSelectMatchLength(1);
    } else {
      o && o.classList.remove("hidden");
      const a = document.querySelector("#match-length-group .wii-green-choice.selected"),
        r = parseInt(a?.dataset?.games || "3", 10);
      this.selectedGamesToWin = r === 1 ? 1 : r === 5 ? 1 : Math.ceil(r / 2);
      this.configureGameBubbles(this.selectedGamesToWin);
      n && this.callbacks.onSelectMatchLength && this.callbacks.onSelectMatchLength(this.selectedGamesToWin);
    }
    const s = document.getElementById("setup-opponent-label");
    s &&
      this.playerRole !== "p2" &&
      (e === "1v1"
        ? (s.textContent = "Player 2")
        : e === "pro"
        ? (s.textContent = "Matt Pro")
        : (s.textContent = this.currentLang === "vi" ? "CLB AI" : "Club AI")),
      this.updateOpponentPresence(this._lastRoomStatus || {}),
      n && this.callbacks.onSelectDifficulty && this.callbacks.onSelectDifficulty(e);
  }

  _bindEvents() {
    document.querySelectorAll("#difficulty-mode-group .wii-green-choice").forEach(l => {
      l.addEventListener("click", () => {
        const c = l.dataset.difficulty || "casual";
        this._setDifficultySelection(c, { notify: !0 });
      });
    });

    const n = document.querySelectorAll("#match-length-group .wii-green-choice");
    n.forEach(l => {
      l.addEventListener("click", () => {
        n.forEach(u => u.classList.remove("selected"));
        l.classList.add("selected");
        const c = parseInt(l.dataset.games || "3", 10);
        this.selectedGamesToWin = c === 1 ? 1 : c === 5 ? 1 : Math.ceil(c / 2);
        this.configureGameBubbles(this.selectedGamesToWin);
        this.callbacks.onSelectMatchLength && this.callbacks.onSelectMatchLength(this.selectedGamesToWin);
      });
    });

    // Primary Choice: Solo vs Multi
    const btnChoiceSolo = document.getElementById("btn-choice-solo");
    const btnChoiceMulti = document.getElementById("btn-choice-multi");
    const panelSolo = document.getElementById("panel-solo-setup");
    const panelMulti = document.getElementById("panel-multi-setup");

    const selectPrimaryChoice = (type) => {
      this.primaryPlayChoice = type;
      if (btnChoiceSolo) btnChoiceSolo.classList.toggle("active", type === "solo");
      if (btnChoiceMulti) btnChoiceMulti.classList.toggle("active", type === "multi");
      if (panelSolo) panelSolo.classList.toggle("hidden", type !== "solo");
      if (panelMulti) panelMulti.classList.toggle("hidden", type !== "multi");
      if (type === "solo") {
        this.matchManager.autoFillBots(this.selectedFormat || "doubles", this.selectedDifficulty);
        this.updateSoloBotNotice();
      }
    };

    btnChoiceSolo && btnChoiceSolo.addEventListener("click", () => selectPrimaryChoice("solo"));
    btnChoiceMulti && btnChoiceMulti.addEventListener("click", () => selectPrimaryChoice("multi"));

    const btnBackToSolo = document.getElementById("btn-back-to-solo");
    btnBackToSolo && btnBackToSolo.addEventListener("click", () => selectPrimaryChoice("solo"));

    // Solo format selection: 1-1 (singles) vs 2-2 (doubles)
    const formatBtns = document.querySelectorAll("#match-format-group .format-choice");
    formatBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        formatBtns.forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        const fmt = btn.dataset.format || "doubles";
        this.selectedFormat = fmt;
        this.matchManager.autoFillBots(fmt, this.selectedDifficulty);
        this.updateSoloBotNotice();
        const setupOppLabel = document.getElementById("setup-opponent-label");
        if (setupOppLabel) {
          setupOppLabel.textContent = fmt === "singles" ? "CLB AI (Đơn)" : "CLB AI (Đôi)";
        }
      });
    });

    // Start match directly from Solo mode
    const i = document.getElementById("btn-start-match");
    i &&
      i.addEventListener("click", () => {
        const v = document.getElementById("player-name-input");
        v && v.value.trim() && this.setPlayerName(v.value.trim());
        this.matchManager.hostName = this.playerName;
        this.matchManager.autoFillBots(this.selectedFormat || "doubles", this.selectedDifficulty);
        this.hideTitleModal();
        if (this.callbacks.onStartMatchFromLobby) {
          this.callbacks.onStartMatchFromLobby({
            matchType: this.matchManager.matchType,
            slots: this.matchManager.slots,
            actorMapping: this.matchManager.getActorMapping(),
            gameMode: "offline"
          });
        } else if (this.callbacks.onStartMatch) {
          this.callbacks.onStartMatch({
            gamesToWin: this.selectedGamesToWin,
            inputMode: this.selectedInputMode,
            difficulty: this.selectedDifficulty,
            playerName: this.playerName
          });
        }
      });

    // Multi Mode: Create Room or Join Room
    const btnCreateMulti = document.getElementById("btn-create-multi-room");
    btnCreateMulti &&
      btnCreateMulti.addEventListener("click", async () => {
        const v = document.getElementById("player-name-input");
        v && v.value.trim() && this.setPlayerName(v.value.trim());

        // Thiết lập trạng thái Chủ phòng & khởi tạo slot phòng mới: chỉ Host ở A1, A2/B1/B2 để trống
        this.matchManager.isHost = true;
        this.matchManager.hostName = this.playerName;
        this.matchManager.localPlayerSlot = "A1";
        this.matchManager.initRoomLobbySlots(this.playerName);

        // Hiển thị trực tiếp bảng tạo phòng ngay lập tức không để người dùng chờ
        if (this._lockedRoomId) this._leaveCurrentRoom();   // old room is closed (guests are told) before a new one is created
        this._lockedRoomId = null;
        this.currentRoomId = "";
        this.matchManager.roomId = "";
        this.openRoomLobbyModal();

        try {
          const res = await fetch("/api/match/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              p1Name: this.playerName,
              hostName: this.playerName,
              matchType: this.selectedFormat || "doubles"
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (!data.roomId) throw new Error("create: missing roomId");
            const roomId = String(data.roomId);
            this._lockedRoomId = roomId;
            this.currentRoomId = roomId;
            this.matchManager.roomId = roomId;
            if (data.slots && Array.isArray(data.slots)) {
              this.matchManager.slots = data.slots;
            }
            if (typeof window !== "undefined") {
              window.__argonTennis = window.__argonTennis || {};
              window.__argonTennis.roomId = roomId;
              window.__argonTennis.isMultiplayer = true;
            }
            this.updateLobbyUI();
            this.startLobbyPolling(roomId);
          } else {
            throw new Error("create: HTTP " + res.status);
          }
        } catch (e) {
          console.warn("[Lobby] Create room failed:", e);
          this._showRoomError("Không tạo được phòng. Kiểm tra kết nối rồi thử lại.");
        }
      });

    const btnSubmitJoin = document.getElementById("btn-submit-join-room");
    const inputJoinCode = document.getElementById("input-join-room-code");
    const doJoinRoom = async () => {
      const raw = inputJoinCode ? inputJoinCode.value.trim() : "";
      if (!raw) {
        inputJoinCode && inputJoinCode.focus();
        return;
      }
      const v = document.getElementById("player-name-input");
      v && v.value.trim() && this.setPlayerName(v.value.trim());

      const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!code) { inputJoinCode && inputJoinCode.focus(); return; }
      if (this.playerName === "Hachihi Pro" && !(v && v.value.trim())) this.setPlayerName("Khách " + Math.floor(100 + Math.random() * 900));
      this._lockedRoomId = code;
      this.currentRoomId = code;
      this.matchManager.roomId = code;
      this.matchManager.isHost = false;
      this.matchManager.localPlayerSlot = "B1";

      // Hiển thị ngay màn hình chờ tham gia (Guest View đơn giản)
      this.openRoomLobbyModal();

      try {
        const res = await fetch("/api/match/slot/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: code, playerName: this.playerName })
        });
        if (!res.ok) {
          this._showRoomError(res.status === 409 ? "Phòng đã đầy." : "Không vào được phòng. Kiểm tra lại mã phòng.");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data.assignedSlot) {
            this.matchManager.localPlayerSlot = data.assignedSlot;
          }
          this._joinedRoomId = code;
          if (data.slots && Array.isArray(data.slots)) {
            this.matchManager.slots = data.slots;
          }
          this.updateLobbyUI();
          this.startLobbyPolling(code);
        }
      } catch (err) {
        console.warn("[Lobby] Join network err:", err);
        this._showRoomError("Mất kết nối khi vào phòng. Thử lại.");
      }
    };
    this.joinRoomFromLink = (code) => { if (inputJoinCode) inputJoinCode.value = code; return doJoinRoom(); };
    btnSubmitJoin && btnSubmitJoin.addEventListener("click", doJoinRoom);
    inputJoinCode && inputJoinCode.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doJoinRoom();
    });

    const btnOpenPortalMulti = document.getElementById("btn-open-portal-multi");
    btnOpenPortalMulti && btnOpenPortalMulti.addEventListener("click", () => {
      this.showPortalModal("about");
    });

    const btnOpenRules = document.getElementById("btn-open-rules-title");
    btnOpenRules &&
      btnOpenRules.addEventListener("click", l => {
        l.stopPropagation();
        this.showPortalModal("rules");
      });

    const btnRulesHud = document.getElementById("btn-rules-hud");
    btnRulesHud &&
      btnRulesHud.addEventListener("click", l => {
        l.stopPropagation();
        this.showPortalModal("rules");
      });

    const btnCloseRules = document.getElementById("btn-close-rules");
    btnCloseRules &&
      btnCloseRules.addEventListener("click", () => {
        this.hideRulesModal();
      });

    // Portal modal triggers & tabs
    const btnOpenPortal = document.getElementById("btn-open-portal");
    btnOpenPortal &&
      btnOpenPortal.addEventListener("click", l => {
        l.stopPropagation();
        this.showPortalModal("about");
      });

    const btnPortalHud = document.getElementById("btn-portal-hud");
    btnPortalHud &&
      btnPortalHud.addEventListener("click", l => {
        l.stopPropagation();
        this.showPortalModal("about");
      });

    const btnSettingsHud = document.getElementById("btn-settings-hud");
    btnSettingsHud &&
      btnSettingsHud.addEventListener("click", l => {
        l.stopPropagation();
        this.showPortalModal("stage");
      });

    const btnClosePortalX = document.getElementById("btn-close-portal-x");
    btnClosePortalX &&
      btnClosePortalX.addEventListener("click", () => {
        this.hidePortalModal();
      });

    const btnClosePortalFooter = document.getElementById("btn-close-portal-footer");
    btnClosePortalFooter &&
      btnClosePortalFooter.addEventListener("click", () => {
        this.hidePortalModal();
      });

    const startFromPortal = () => {
      const v = document.getElementById("player-name-input");
      v && v.value.trim() && this.setPlayerName(v.value.trim());
      this.hidePortalModal();
      this.hideTitleModal();
      this.callbacks.onStartMatch &&
        this.callbacks.onStartMatch({
          gamesToWin: this.selectedGamesToWin,
          inputMode: this.selectedInputMode,
          difficulty: this.selectedDifficulty,
          playerName: this.playerName
        });
    };

    const btnPortalPlayNow = document.getElementById("btn-portal-play-now");
    btnPortalPlayNow && btnPortalPlayNow.addEventListener("click", startFromPortal);

    const btnAboutPlayCourt = document.getElementById("btn-about-play-court");
    btnAboutPlayCourt && btnAboutPlayCourt.addEventListener("click", startFromPortal);

    document.querySelectorAll(".portal-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        const tabKey = tab.dataset.tab || "about";
        this.switchPortalTab(tabKey);
      });
    });

    // Controls sensitivity & sweet spot assist
    const sliderSens = document.getElementById("slider-sensitivity");
    const valSens = document.getElementById("val-sensitivity");
    if (sliderSens) {
      sliderSens.addEventListener("input", e => {
        const v = parseFloat(e.target.value);
        valSens && (valSens.textContent = `${v.toFixed(1)}x`);
        this.callbacks.onSetSensitivity && this.callbacks.onSetSensitivity(v);
      });
    }

    const toggleSweetSpot = document.getElementById("toggle-sweet-spot");
    if (toggleSweetSpot) {
      toggleSweetSpot.addEventListener("change", e => {
        this.callbacks.onSetSweetSpotAssist && this.callbacks.onSetSweetSpotAssist(e.target.checked);
      });
    }

    // Sound & Music Sliders
    const sliderMusic = document.getElementById("slider-music-vol");
    const valMusic = document.getElementById("val-music-vol");
    if (sliderMusic) {
      sliderMusic.addEventListener("input", e => {
        const v = parseInt(e.target.value, 10);
        valMusic && (valMusic.textContent = `${v}%`);
        this.callbacks.onSetMusicVolume && this.callbacks.onSetMusicVolume(v / 100);
      });
    }

    const sliderSfx = document.getElementById("slider-sfx-vol");
    const valSfx = document.getElementById("val-sfx-vol");
    if (sliderSfx) {
      sliderSfx.addEventListener("input", e => {
        const v = parseInt(e.target.value, 10);
        valSfx && (valSfx.textContent = `${v}%`);
        this.callbacks.onSetSfxVolume && this.callbacks.onSetSfxVolume(v / 100);
      });
    }

    // Whistle test
    const btnWhistle = document.getElementById("btn-test-whistle");
    btnWhistle &&
      btnWhistle.addEventListener("click", () => {
        this.callbacks.onTriggerWhistle && this.callbacks.onTriggerWhistle();
      });

    // Crowd Cheering Buttons
    const btnCheerClap = document.getElementById("btn-cheer-clap");
    btnCheerClap &&
      btnCheerClap.addEventListener("click", () => {
        this.callbacks.onTriggerCheer && this.callbacks.onTriggerCheer("clap");
      });

    const btnCheerRoar = document.getElementById("btn-cheer-roar");
    btnCheerRoar &&
      btnCheerRoar.addEventListener("click", () => {
        this.callbacks.onTriggerCheer && this.callbacks.onTriggerCheer("roar");
      });

    const btnCheerHachihi = document.getElementById("btn-cheer-hachihi");
    btnCheerHachihi &&
      btnCheerHachihi.addEventListener("click", () => {
        this.callbacks.onTriggerCheer && this.callbacks.onTriggerCheer("hachihi");
      });

    // Lighting preset cards
    const lightCards = document.querySelectorAll(".lighting-card");
    lightCards.forEach(card => {
      card.addEventListener("click", () => {
        if (this._isMatchLocked()) { this._notifyMatchLocked(); return; }
        lightCards.forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        const preset = card.dataset.lighting || card.dataset.preset || "day"; // HTML dùng data-lighting
        this.callbacks.onSetLighting && this.callbacks.onSetLighting(preset);
      });
    });

    // Confetti Cannon Button
    const btnConfetti = document.getElementById("btn-fire-confetti");
    btnConfetti &&
      btnConfetti.addEventListener("click", () => {
        this.callbacks.onTriggerConfetti && this.callbacks.onTriggerConfetti();
      });

    const o = document.getElementById("btn-audio-toggle");
    o &&
      o.addEventListener("click", l => {
        l.stopPropagation();
        this.callbacks.onToggleAudio && this.callbacks.onToggleAudio();
      });

    const s = document.getElementById("btn-camera-cycle");
    s &&
      s.addEventListener("click", l => {
        l.stopPropagation();
        this.callbacks.onCycleCamera && this.callbacks.onCycleCamera();
      });

    const a = document.getElementById("btn-replay-trigger");
    a &&
      a.addEventListener("click", l => {
        l.stopPropagation();
        this.callbacks.onToggleReplay && this.callbacks.onToggleReplay();
      });

    const r = document.getElementById("btn-webcam-toggle");
    r &&
      r.addEventListener("click", l => {
        l.stopPropagation();
        this.callbacks.onToggleWebcam && this.callbacks.onToggleWebcam();
      });

    const m = document.getElementById("btn-phone-racket");
    m &&
      m.addEventListener("click", l => {
        l.stopPropagation();
        this.openMultiplayerModal();
      });

    const p = document.getElementById("btn-multiplayer-modal");
    p &&
      p.addEventListener("click", l => {
        l.stopPropagation();
        this.openMultiplayerModal();
      });

    const g = document.getElementById("btn-lang-toggle");
    g &&
      g.addEventListener("click", l => {
        l.stopPropagation();
        this.toggleLanguage();
      });

    const c = document.getElementById("player-name-input");
    c &&
      c.addEventListener("input", () => {
        this.setPlayerName(c.value);
      });

    document.querySelectorAll(".shot-chip").forEach(l => {
      l.addEventListener("click", u => {
        u.stopPropagation();
        const h = l.dataset.shot || "TOPSPIN";
        this.setActiveShotChip(h);
        this.callbacks.onSelectShotType && this.callbacks.onSelectShotType(h);
      });
    });

    window.addEventListener("keydown", l => {
      if (l.target && (l.target.tagName === "INPUT" || l.target.tagName === "TEXTAREA")) return;
      if (l.code === "KeyH" || l.code === "F1") {
        this.elRulesModal && this.elRulesModal.classList.contains("hidden")
          ? this.showRulesModal()
          : this.hideRulesModal();
        return;
      }
      const h = { Digit1: "TOPSPIN", Digit2: "DINK", Digit3: "SLICE", Digit4: "FLAT", Digit5: "LOB" }[l.code];
      h && (this.setActiveShotChip(h), this.callbacks.onSelectShotType && this.callbacks.onSelectShotType(h));
    });

    const b = document.getElementById("btn-close-companion");
    b &&
      b.addEventListener("click", () => {
        this.elCompanionModal && this.elCompanionModal.classList.add("hidden");
      });

    const B = document.getElementById("btn-play-again");
    B &&
      B.addEventListener("click", () => {
        this.hideVictoryModal();
        this.callbacks.onPlayAgain && this.callbacks.onPlayAgain();
      });

    const T = document.getElementById("btn-return-title");
    T &&
      T.addEventListener("click", () => {
        this.hideVictoryModal();
        this.showTitleModal();
      });

    // Scenery Cards Click Handlers (Solo setup, Lobby & Stage)
    const sceneryCards = document.querySelectorAll(".scenery-card");
    sceneryCards.forEach(card => {
      card.addEventListener("click", () => {
        const scId = card.dataset.scenery;
        if (!scId) return;
        if (this._isMatchLocked()) { this._notifyMatchLocked(); return; }
        this.setSelectedScenery(scId);
        this.callbacks.onSelectScenery && this.callbacks.onSelectScenery(scId);
      });
    });

    const btnSceneryCycle = document.getElementById("btn-scenery-cycle");
    btnSceneryCycle &&
      btnSceneryCycle.addEventListener("click", e => {
        e.stopPropagation();
        if (this._isMatchLocked()) { this._notifyMatchLocked(); return; }
        const order = ["landmark81", "eiffel", "bigben", "newyork", "nhatrang", "hachihi_arena"];
        const idx = order.indexOf(this.selectedScenery || "landmark81");
        const nextId = order[(idx + 1) % order.length];
        this.setSelectedScenery(nextId);
        this.callbacks.onSelectScenery && this.callbacks.onSelectScenery(nextId);
        const scInfo = SCENERIES[nextId];
        this.showTimingPopup({
          grade: "ĐỔI SÂN KỲ QUAN",
          detail: scInfo ? `${scInfo.icon} ${scInfo.name}` : nextId,
          durationMs: 1400
        });
      });

    // ==========================================
    // TANK BATTLE 1990 STYLE LOBBY EVENT HANDLERS
    // ==========================================

    const btnCloseLobbyX = document.getElementById("btn-close-lobby-x");
    const btnTankLeave = document.getElementById("btn-tank-leave-room");
    const handleLeaveLobby = async () => {
      const rid = this._lockedRoomId;
      this.stopLobbyPolling();
      try {
        if (rid) await fetch("/api/match/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: rid, slotId: this.matchManager.isHost ? undefined : this.matchManager.localPlayerSlot })
        });
      } catch {}
      this._lockedRoomId = null;     // already left on the server: skip the second leave in showTitleModal
      this._leaveCurrentRoom();
      this.closeRoomLobbyModal();
      this.showTitleModal();
    };
    btnCloseLobbyX && btnCloseLobbyX.addEventListener("click", handleLeaveLobby);
    btnTankLeave && btnTankLeave.addEventListener("click", handleLeaveLobby);

    // Copy 5-digit room code
    const btnCopyRoomCode = document.getElementById("btn-copy-room-code");
    btnCopyRoomCode &&
      btnCopyRoomCode.addEventListener("click", () => {
        const code = this._lockedRoomId || "";
        if (!code) return;
        this._copyText(code);
        const orig = btnCopyRoomCode.innerHTML;
        btnCopyRoomCode.innerHTML = "<span>✓ Đã sao chép!</span>";
        setTimeout(() => { btnCopyRoomCode.innerHTML = orig; }, 1800);
      });

    // Copy invite link
    const btnCopyLobbyLink = document.getElementById("btn-copy-lobby-link");
    btnCopyLobbyLink &&
      btnCopyLobbyLink.addEventListener("click", () => {
        if (!this._lockedRoomId) return;
        this._copyText(this._joinUrl());
        const orig = btnCopyLobbyLink.innerHTML;
        btnCopyLobbyLink.innerHTML = "<span>✓ Đã chép link!</span>";
        setTimeout(() => { btnCopyLobbyLink.innerHTML = orig; }, 1800);
      });

    // Public toggle
    const togglePublic = document.getElementById("lobby-public-toggle");
    const textPublic = document.getElementById("lobby-public-text");
    togglePublic &&
      togglePublic.addEventListener("change", () => {
        if (textPublic) {
          textPublic.textContent = togglePublic.checked ? "MỞ (CÔNG KHAI)" : "ĐÓNG (RIÊNG TƯ)";
        }
      });

    // Player name in lobby header
    const tankPlayerNameInput = document.getElementById("tank-player-name-input");
    tankPlayerNameInput &&
      tankPlayerNameInput.addEventListener("input", () => {
        this.setPlayerName(tankPlayerNameInput.value);
        this.matchManager.hostName = this.playerName;
      });

    // Team A and Team B Name editing
    const inputTeamA = document.getElementById("input-team-a-name");
    const inputTeamB = document.getElementById("input-team-b-name");
    const updateTeamName = async (teamCode, name) => {
      if (teamCode === "A") this.matchManager.teamAName = name;
      else this.matchManager.teamBName = name;
      try {
        await fetch("/api/match/team/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: this.currentRoomId, teamCode, name })
        });
      } catch {}
    };
    inputTeamA && inputTeamA.addEventListener("change", () => updateTeamName("A", inputTeamA.value.trim() || "Đội A"));
    inputTeamB && inputTeamB.addEventListener("change", () => updateTeamName("B", inputTeamB.value.trim() || "Đội B"));

    // Team Color Palettes
    const bindTeamPalette = (paletteId, teamCode) => {
      const pal = document.getElementById(paletteId);
      if (!pal) return;
      pal.querySelectorAll(".color-swatch").forEach(swatch => {
        swatch.addEventListener("click", async () => {
          pal.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
          swatch.classList.add("active");
          const color = swatch.dataset.color || (teamCode === "A" ? "#ffea28" : "#0284c7");
          if (teamCode === "A") this.matchManager.teamAColor = color;
          else this.matchManager.teamBColor = color;
          const ind = document.getElementById(`team-${teamCode.toLowerCase()}-indicator`);
          if (ind) ind.style.backgroundColor = color;
          try {
            await fetch("/api/match/team/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ room: this.currentRoomId, teamCode, color })
            });
          } catch {}
        });
      });
    };
    bindTeamPalette("team-a-palette", "A");
    bindTeamPalette("team-b-palette", "B");

    // Add Bot buttons
    const btnAddBotA = document.getElementById("btn-add-bot-team-a");
    const btnAddBotB = document.getElementById("btn-add-bot-team-b");
    const handleAddBot = async (teamCode) => {
      const slotId = teamCode === "A" ? "A2" : (this.matchManager.slots.find(s => s.slotId === "B1" && s.playerType === "empty") ? "B1" : "B2");
      this.matchManager.addBot(slotId, this.matchManager.botDifficulty || "normal");
      this.updateLobbyUI();
      try {
        await fetch("/api/match/slot/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room: this.currentRoomId,
            slotId,
            playerType: "bot",
            botDifficulty: this.matchManager.botDifficulty || "normal",
            botName: slotId === "A2" ? "Maya (AI)" : slotId === "B1" ? "Matt (AI)" : "Akira (AI)"
          })
        });
      } catch {}
    };
    btnAddBotA && btnAddBotA.addEventListener("click", () => handleAddBot("A"));
    btnAddBotB && btnAddBotB.addEventListener("click", () => handleAddBot("B"));

    // Switch team buttons in member rows
    document.querySelectorAll(".btn-switch-team").forEach(btn => {
      btn.addEventListener("click", async () => {
        const slotId = btn.dataset.slot;
        if (!slotId) return;
        this.matchManager.switchTeam(slotId);
        this.updateLobbyUI();
        try {
          await fetch("/api/match/slot/switch-team", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room: this.currentRoomId, slotId })
          });
        } catch {}
      });
    });

    // Toggle slot type (Human <-> Bot)
    document.querySelectorAll(".btn-toggle-slot-type").forEach(btn => {
      btn.addEventListener("click", async () => {
        const slotId = btn.dataset.slot;
        if (!slotId) return;
        this.toggleSlotType(slotId);
        const slot = this.matchManager.slots.find(s => s.slotId === slotId);
        try {
          await fetch("/api/match/slot/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              room: this.currentRoomId,
              slotId,
              playerType: slot ? slot.playerType : "bot",
              playerName: slot ? slot.playerName : "Bot AI"
            })
          });
        } catch {}
      });
    });

    // Remove slot (Clear to empty)
    document.querySelectorAll(".btn-remove-slot").forEach(btn => {
      btn.addEventListener("click", async () => {
        const slotId = btn.dataset.slot;
        if (!slotId) return;
        this.matchManager.clearSlot(slotId);
        this.updateLobbyUI();
        try {
          await fetch("/api/match/slot/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              room: this.currentRoomId,
              slotId,
              playerType: "empty"
            })
          });
        } catch {}
      });
    });

    // Combat Mode selector (Doubles 2v2 vs Singles 1v1)
    const tankModeDoubles = document.getElementById("tank-mode-doubles");
    const tankModeSingles = document.getElementById("tank-mode-singles");
    const setCombatMode = async (mode) => {
      if (tankModeDoubles) tankModeDoubles.classList.toggle("active", mode === "doubles");
      if (tankModeSingles) tankModeSingles.classList.toggle("active", mode === "singles");
      this.matchManager.setMatchType(mode);
      this.updateLobbyUI();
      try {
        await fetch("/api/match/team/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: this.currentRoomId, matchType: mode })
        });
      } catch {}
    };
    tankModeDoubles && tankModeDoubles.addEventListener("click", () => setCombatMode("doubles"));
    tankModeSingles && tankModeSingles.addEventListener("click", () => setCombatMode("singles"));

    // Bot Speed buttons (1..5)
    const speedBtns = document.querySelectorAll("#tank-speed-group .btn-speed-item");
    const speedBadge = document.getElementById("tank-speed-badge");
    const speedLevels = {
      1: { diff: "easy", label: "CẤP 1 [DỞ]", note: "Cấp 1: Bot chạy chậm, phản xạ trễ, hay đánh hỏng và đặt bóng lung tung - dành cho người mới tập." },
      2: { diff: "normal", label: "CẤP 2 [HAY]", note: "Cấp 2: Bot đánh ổn định, biết dink vào bếp và smash khi bóng bổng." },
      3: { diff: "hard", label: "CẤP 3 [RẤT THÔNG MINH]", note: "Cấp 3: Bot rất nhanh, gần như không lỗi, đọc vị trí của bạn để đánh vào góc trống, lob qua đầu và dink hiểm." }
    };
    const speedNote = document.getElementById("tank-speed-note");
    const applyBotLevelUI = (sp) => {
      const info = speedLevels[sp] || speedLevels[2];
      speedBtns.forEach(b => b.classList.toggle("active", parseInt(b.dataset.speed || "2", 10) === sp));
      if (speedBadge) speedBadge.textContent = info.label;
      if (speedNote) speedNote.textContent = info.note;
      return info;
    };
    speedBtns.forEach(btn => {
      btn.addEventListener("click", async () => {
        const sp = parseInt(btn.dataset.speed || "2", 10);
        const info = applyBotLevelUI(sp);
        // Áp cấp độ mới cho mọi bot đang có trong phòng (cả client lẫn server)
        this.matchManager.botDifficulty = info.diff;
        (this.matchManager.slots || []).forEach(sl => { if (sl.playerType === "bot") sl.botDifficulty = info.diff; });
        try { this.updateLobbyUI && this.updateLobbyUI(); } catch {}
        try {
          await fetch("/api/match/team/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room: this.currentRoomId, botDifficulty: info.diff })
          });
        } catch {}
      });
    });

    // Chat Box in Lobby
    const chatInput = document.getElementById("lobby-chat-input");
    const btnSendChat = document.getElementById("btn-lobby-send-chat");
    const doSendChat = async () => {
      if (!chatInput) return;
      const text = chatInput.value.trim();
      if (!text) return;
      chatInput.value = "";
      const sender = this.playerName || "Hachihi Pro";
      try {
        const res = await fetch("/api/match/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: this.currentRoomId, sender, text })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.messages) {
            this.matchManager.messages = data.messages;
            this.renderChatMessages();
          }
        }
      } catch {}
    };
    btnSendChat && btnSendChat.addEventListener("click", doSendChat);
    chatInput &&
      chatInput.addEventListener("keydown", e => {
        if (e.key === "Enter") doSendChat();
      });

    // Host Start Match CTA
    const btnTankStart = document.getElementById("btn-tank-start-match");
    btnTankStart &&
      btnTankStart.addEventListener("click", async () => {
        if (!this.matchManager.isHost) return;
        if (!this.matchManager.canStart()) return;
        let startOk = false;
        try {
          const r = await fetch("/api/match/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room: this._lockedRoomId })
          });
          startOk = r.ok;
        } catch {}
        if (!startOk || !this._lockedRoomId) {
          this._showRoomError("Không gửi được lệnh bắt đầu tới các máy khác. Thử lại.");
          return;
        }
        this.stopLobbyPolling();
        this.closeRoomLobbyModal();
        this.hideTitleModal();
        this.callbacks.onStartMatchFromLobby &&
          this.callbacks.onStartMatchFromLobby({
            matchType: this.matchManager.matchType,
            slots: this.matchManager.slots,
            actorMapping: this.matchManager.getActorMapping(),
            gameMode: "online"
          });
      });

    // Pause / Exit Trigger Buttons (Top HUD & Dock)
    const btnPauseHud = document.getElementById("btn-pause-exit-hud");
    btnPauseHud &&
      btnPauseHud.addEventListener("click", l => {
        l.stopPropagation();
        this.callbacks.onPauseMatch ? this.callbacks.onPauseMatch() : this.showPauseModal();
      });

    const btnExitDock = document.getElementById("btn-exit-match");
    btnExitDock &&
      btnExitDock.addEventListener("click", l => {
        l.stopPropagation();
        this.callbacks.onPauseMatch ? this.callbacks.onPauseMatch() : this.showPauseModal();
      });

    // Pause Modal Action Buttons
    const btnPauseResume = document.getElementById("btn-pause-resume");
    btnPauseResume &&
      btnPauseResume.addEventListener("click", () => {
        this.hidePauseModal();
        this.callbacks.onResumeMatch && this.callbacks.onResumeMatch();
      });

    const btnPauseLobby = document.getElementById("btn-pause-lobby");
    btnPauseLobby &&
      btnPauseLobby.addEventListener("click", () => {
        this.hidePauseModal();
        this.callbacks.onExitToLobby ? this.callbacks.onExitToLobby() : this.openRoomLobbyModal();
      });

    const btnPauseRestart = document.getElementById("btn-pause-restart");
    btnPauseRestart &&
      btnPauseRestart.addEventListener("click", () => {
        this.hidePauseModal();
        this.callbacks.onRestartMatch && this.callbacks.onRestartMatch();
      });

    const btnPauseCancelRoom = document.getElementById("btn-pause-cancel-room");
    btnPauseCancelRoom &&
      btnPauseCancelRoom.addEventListener("click", () => {
        this.hidePauseModal();
        this.callbacks.onDisbandRoom ? this.callbacks.onDisbandRoom() : this.showTitleModal();
      });

    const btnPauseMainMenu = document.getElementById("btn-pause-main-menu");
    btnPauseMainMenu &&
      btnPauseMainMenu.addEventListener("click", () => {
        this.hidePauseModal();
        this.callbacks.onExitToMenu ? this.callbacks.onExitToMenu() : this.showTitleModal();
      });

    // 3-Mode Architecture Selector
    const modeCards = document.querySelectorAll(".mode-select-card");
    modeCards.forEach(card => {
      card.addEventListener("click", () => {
        const mode = card.dataset.mode || "offline";
        this.setGameMode(mode);
      });
    });

    // Reconnection Modal Actions (Browser Cache)
    const btnRecResume = document.getElementById("btn-reconnect-resume");
    btnRecResume &&
      btnRecResume.addEventListener("click", () => {
        this.hideReconnectModal();
        this.callbacks.onReconnectResume && this.callbacks.onReconnectResume();
      });

    const btnRecDiscard = document.getElementById("btn-reconnect-discard");
    btnRecDiscard &&
      btnRecDiscard.addEventListener("click", () => {
        this.hideReconnectModal();
        this.callbacks.onReconnectDiscard && this.callbacks.onReconnectDiscard();
      });
  }

  setGameMode(mode = "offline") {
    this.selectedGameMode = mode;
    const cards = document.querySelectorAll(".mode-select-card");
    cards.forEach(c => c.classList.toggle("active", c.dataset.mode === mode));

    const stripText = document.getElementById("mode-desc-strip-text");
    const stripDot = document.querySelector(".mode-dot-indicator");

    if (stripDot) {
      stripDot.className = `mode-dot-indicator dot-${mode}`;
    }

    if (stripText) {
      if (mode === "offline") {
        stripText.textContent = "Chế độ Offline: Chạy 100% trên trình duyệt không cần mạng Internet. Bot AI sẽ tự động lấp đầy các vị trí trống.";
      } else if (mode === "lan") {
        stripText.textContent = "Chế độ LAN (Mạng nội bộ): Chơi chung mạng Wi-Fi/LAN, máy tính làm Host phát tín hiệu cho các máy khác vào cùng phòng.";
      } else if (mode === "online") {
        stripText.textContent = "Chế độ Online: Chơi từ xa qua máy chủ Render.com (WebSocket WSS), chia sẻ đường link thi đấu cho bạn bè ở bất kỳ đâu.";
      } else if (mode === "tournament") {
        stripText.textContent = "Chế độ Giải Đấu: Thi đấu theo sơ đồ phân nhánh Cúp Pickleball Hachihi Mở Rộng 2026 chào mừng 17 năm Hoàng Mai.";
      }
    }

    if (mode === "tournament") {
      this.openRoomLobbyModal();
      const tabTour = document.querySelector('.lobby-tab[data-tab="tournament"]');
      tabTour && tabTour.click();
    }

    this.callbacks.onSelectGameMode && this.callbacks.onSelectGameMode(mode);
  }

  showPauseModal(info = {}) {
    if (this.elPauseModal) {
      const pPts = info.playerPoints !== undefined ? info.playerPoints : 0;
      const oPts = info.opponentPoints !== undefined ? info.opponentPoints : 0;
      const chipScore = document.getElementById("pause-score-chip");
      const chipFmt = document.getElementById("pause-format-chip");

      if (chipScore) chipScore.textContent = `Tỉ số: ${pPts} - ${oPts}`;
      if (chipFmt) {
        const isSingles = (info.matchType || this.matchManager.matchType) === "singles";
        chipFmt.textContent = isSingles ? "Đánh Đơn 1v1" : "Đánh Đôi 2v2";
      }

      this.elPauseModal.classList.remove("hidden");
    }
  }

  hidePauseModal() {
    this.elPauseModal && this.elPauseModal.classList.add("hidden");
  }

  showReconnectModal(session = {}) {
    if (this.elReconnectModal) {
      const roomEl = document.getElementById("reconnect-room-id");
      const modeEl = document.getElementById("reconnect-mode-type");
      const scoreEl = document.getElementById("reconnect-score-val");
      const timeEl = document.getElementById("reconnect-time-val");

      if (roomEl) roomEl.textContent = session.roomId || "HCH-2026";
      if (modeEl) {
        const modeLabel = (session.gameMode || "offline").toUpperCase();
        const fmtLabel = session.matchType === "singles" ? "Đơn (1v1)" : "Đôi (2v2)";
        modeEl.textContent = `${modeLabel} • ${fmtLabel}`;
      }
      if (scoreEl) {
        const p = session.score ? session.score.playerPoints : 0;
        const o = session.score ? session.score.opponentPoints : 0;
        scoreEl.textContent = `${p} - ${o}`;
      }
      if (timeEl && session.timestamp) {
        const diffSec = Math.round((Date.now() - session.timestamp) / 1000);
        timeEl.textContent = diffSec < 60 ? `${diffSec} giây trước` : `${Math.round(diffSec / 60)} phút trước`;
      }

      this.elReconnectModal.classList.remove("hidden");
    }
  }

  hideReconnectModal() {
    this.elReconnectModal && this.elReconnectModal.classList.add("hidden");
  }

  openRoomLobbyModal() {
    this._presenceShown = false; // phòng mới: cho phép báo "đã kết nối" lại 1 lần
    this._presenceUntil = 0;
    this.hideTitleModal();
    this.updateLobbyUI();
    if (this.elRoomLobbyModal) {
      this.elRoomLobbyModal.classList.remove("hidden");
      this.elRoomLobbyModal.style.display = "flex";
    }
    if (this._lockedRoomId) this.startLobbyPolling(this._lockedRoomId);
  }

  _showRoomError(msg) {
    const codeEl = document.getElementById("lobby-room-code-val");
    if (codeEl) codeEl.textContent = "-----";
    const banner = document.getElementById("tank-condition-banner");
    if (banner) { banner.textContent = "⚠ " + msg; banner.classList.remove("hidden"); banner.style.display = "flex"; }
    console.warn("[Lobby]", msg);
  }

  _joinUrl() {
    return `${window.location.origin}/?room=${encodeURIComponent(this._lockedRoomId || "")}&role=p2&join=lobby`;
  }

  async _copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch {}
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch { return false; }
  }

  _renderLobbyQR(roomId) {
    if (!roomId) return;
    const url = this._joinUrl();
    const link = document.getElementById("lobby-qr-direct-link");
    if (link) { link.href = url; link.textContent = url.replace(/^https?:\/\//, ""); }
    if (this._lastQrUrl === url) return;
    const canvas = document.getElementById("lobby-qr-canvas");
    if (!canvas) return;
    try {
      drawQRCodeToCanvas(canvas, url, { size: 248, margin: 2 });
      canvas.style.width = "124px"; canvas.style.height = "124px";
      this._lastQrUrl = url;
    } catch (e) { console.warn("[Lobby] QR render failed:", e); }
  }

  closeRoomLobbyModal() {
    this.stopLobbyPolling();
    if (this.elRoomLobbyModal) {
      this.elRoomLobbyModal.classList.add("hidden");
      this.elRoomLobbyModal.style.display = "none";
    }
  }

  startLobbyPolling(roomId) {
    this.stopLobbyPolling();
    this._matchStartedLocally = false;
    const gen = (this._pollGen = (this._pollGen || 0) + 1);
    const rid = String(roomId || this._lockedRoomId || "");
    if (!rid) return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/match/state?room=${encodeURIComponent(rid)}`);
        if (res.ok) {
          const data = await res.json();
          // drop stale / foreign responses so another room can never overwrite this lobby
          if (gen !== this._pollGen || String(data.roomId).toUpperCase() !== rid.toUpperCase()) return;
          this.matchManager.syncFromServer(data);   // always start from the server's latest slots/settings
          if (!this.matchManager.isHost && data.mySlot === null && this._joinedRoomId === rid && !this._matchStartedLocally) {
            this._exitRoomToMenu(rid, "Bạn không còn trong phòng " + rid + " (chủ phòng đã mời ra hoặc mất kết nối quá lâu). Hãy vào lại bằng link/mã phòng.");
            return;
          }
          if (data.started && !this._matchStartedLocally) {
            this._matchStartedLocally = true;
            this.stopLobbyPolling();
            this.closeRoomLobbyModal();
            this.hideTitleModal();
            this.callbacks.onStartMatchFromLobby &&
              this.callbacks.onStartMatchFromLobby({
                matchType: data.matchType || this.matchManager.matchType,
                slots: data.slots || this.matchManager.slots,
                actorMapping: this.matchManager.getActorMapping(),
                gameMode: "online"
              });
            return;
          }
          this.matchManager.syncFromServer(data);
          this.updateLobbyUI();
        } else if ((res.status === 404 || res.status === 410) && gen === this._pollGen) {
          // host closed the room, or it expired / the server restarted: leave cleanly instead of staying stuck
          let j = {}; try { j = await res.json(); } catch {}
          const why = j.reason === "host_gone" ? "Chủ phòng đã mất kết nối quá lâu nên phòng " + rid + " đã đóng."
            : res.status === 410 ? "Chủ phòng đã đóng phòng " + rid + "."
            : "Phòng " + rid + " đã hết hạn hoặc không còn tồn tại.";
          this._exitRoomToMenu(rid, why + " Hãy tạo phòng mới hoặc vào lại bằng link/mã phòng mới.");
        }
      } catch {}
    };
    poll();
    this._lobbyPollTimer = setInterval(poll, 1200);
  }

  // Forget the current room (server side too) and reset every per-room flag, so the next room starts clean.
  _leaveCurrentRoom() {
    const rid = this._lockedRoomId;
    this.stopLobbyPolling();
    if (rid) {
      try { window.hachihiLeaveRoom && window.hachihiLeaveRoom(rid, !!this.matchManager.isHost); } catch {}
    }
    this._lockedRoomId = null;
    this.currentRoomId = "";
    this._joinedRoomId = null;
    this._matchStartedLocally = false;
    this._lastQrUrl = null;
    try { this.callbacks.onLeftRoom && this.callbacks.onLeftRoom(); } catch {}
  }

  _exitRoomToMenu(rid, message) {
    this.stopLobbyPolling();
    try { window.hachihiSession && window.hachihiSession.clear(rid); } catch {}
    this._lockedRoomId = null;
    this.currentRoomId = "";
    this._joinedRoomId = null;
    this._matchStartedLocally = false;
    this._lastQrUrl = null;
    try { this.callbacks.onLeftRoom && this.callbacks.onLeftRoom(); } catch {}
    this.closeRoomLobbyModal();
    try { this.showTitleModal(); } catch {}
    if (message) alert(message);
  }

  stopLobbyPolling() {
    if (this._lobbyPollTimer) {
      clearInterval(this._lobbyPollTimer);
      this._lobbyPollTimer = null;
    }
  }

  updateSoloBotNotice() {
    const notice = document.getElementById("solo-bot-status-text");
    if (!notice) return;
    const isSingles = (this.selectedFormat || "doubles") === "singles";
    if (isSingles) {
      notice.textContent = "Đã tự động lấp 1 BOT AI đối thủ thông minh cho thể thức Đơn 1-1. Bấm nút dưới để vào sân thi đấu ngay!";
    } else {
      notice.textContent = "Đã tự động lấp đủ BOT AI thông minh (Đồng đội & Đối thủ) cho thể thức Đôi 2-2. Bấm nút dưới để vào sân ngay!";
    }
  }

  renderChatMessages() {
    const container = document.getElementById("lobby-chat-messages");
    const countEl = document.getElementById("lobby-chat-count");
    if (!container) return;
    const msgs = this.matchManager.messages || [];
    if (countEl) countEl.textContent = String(msgs.length);
    if (msgs.length === 0) {
      container.innerHTML = `
        <div class="chat-msg-row system">
          <span class="msg-time">00:00</span>
          <span class="msg-sender">[Hệ thống]:</span>
          <span class="msg-content">Chào mừng bạn đến phòng Pickleball Hachihi! Hãy gửi lời chào đồng đội và đối thủ.</span>
        </div>`;
      return;
    }
    let html = "";
    for (const m of msgs) {
      const isSys = m.sender === "System" || m.sender === "Hệ thống";
      const date = new Date(m.time || Date.now());
      const timeStr = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
      html += `
        <div class="chat-msg-row ${isSys ? "system" : ""}">
          <span class="msg-time">${timeStr}</span>
          <span class="msg-sender">[${m.sender}]:</span>
          <span class="msg-content">${m.text}</span>
        </div>`;
    }
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
  }

  setMatchType(newType) {
    if (newType !== "singles" && newType !== "doubles") return;
    this.matchManager.setMatchType(newType);
    this.updateLobbyUI();
    this.callbacks.onMatchTypeChanged && this.callbacks.onMatchTypeChanged(newType);
  }

  toggleSlotType(slotId) {
    const slot = this.matchManager.slots.find(s => s.slotId === slotId);
    if (!slot) return;
    if (slot.playerType === "human") {
      this.matchManager.addBot(slotId, this.matchManager.botDifficulty || "normal");
    } else {
      this.matchManager.assignHuman(slotId, {
        playerId: `human_${slotId}`,
        playerName: slotId === "A1" ? this.playerName : `Player (${slotId})`,
        avatar: slotId === "A1" ? "player1" : slotId === "A2" ? "player2" : slotId === "B1" ? "opponent1" : "opponent2"
      });
    }
    this.updateLobbyUI();
  }

  async _syncSlotMove(fromSlotId, toSlotId = null, targetTeam = null) {
    try {
      await fetch("/api/match/slot/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room: this.currentRoomId,
          fromSlotId,
          toSlotId,
          targetTeam
        })
      });
    } catch (e) {
      console.warn("[Lobby] syncSlotMove err:", e);
    }
  }

  updateLobbyUI() {
    const isHost = !!this.matchManager.isHost;
    const isSingles = this.matchManager.matchType === "singles";
    const roomId = this._lockedRoomId || "";

    // 1. Cập nhật mã phòng 5 chữ số
    const codeEl = document.getElementById("lobby-room-code-val");
    if (codeEl) codeEl.textContent = roomId || "-----";
    this._renderLobbyQR(roomId);

    // 2. Cập nhật số lượng người chơi / slot
    const activeSlots = this.matchManager.slots.filter(s => s.playerType !== "empty");
    const maxPlayers = isSingles ? 2 : 4;
    const curPlayersEl = document.getElementById("lobby-current-players");
    const maxPlayersEl = document.getElementById("lobby-max-players");
    if (curPlayersEl) curPlayersEl.textContent = String(Math.min(maxPlayers, activeSlots.length));
    if (maxPlayersEl) maxPlayersEl.textContent = String(maxPlayers);

    // 3. Phân biệt màn hình Host vs Guest
    const elHostView = document.getElementById("lobby-host-view");
    const elGuestView = document.getElementById("lobby-guest-view");
    const elVisibility = document.getElementById("lobby-visibility-col");
    const btnStart = document.getElementById("btn-tank-start-match");
    const condBanner = document.getElementById("tank-condition-banner");

    if (isHost) {
      if (elHostView) { elHostView.classList.remove("hidden"); elHostView.style.display = "block"; }
      if (elGuestView) { elGuestView.classList.add("hidden"); elGuestView.style.display = "none"; }
      if (elVisibility) { elVisibility.classList.remove("hidden"); elVisibility.style.display = "flex"; }
      if (btnStart) { btnStart.classList.remove("hidden"); btnStart.style.display = "flex"; }
      if (condBanner) { condBanner.classList.remove("hidden"); condBanner.style.display = "flex"; }
      this._renderHostLobby();
    } else {
      if (elHostView) { elHostView.classList.add("hidden"); elHostView.style.display = "none"; }
      if (elGuestView) { elGuestView.classList.remove("hidden"); elGuestView.style.display = "block"; }
      if (elVisibility) { elVisibility.classList.add("hidden"); elVisibility.style.display = "none"; }
      if (btnStart) { btnStart.classList.add("hidden"); btnStart.style.display = "none"; }
      if (condBanner) { condBanner.classList.add("hidden"); condBanner.style.display = "none"; }
      this._renderGuestLobby();
      ["guest-summary-scenery", "guest-summary-bot-speed", "guest-summary-room-code"].forEach((id) => {
        const it = document.getElementById(id) && document.getElementById(id).closest(".guest-info-item");
        if (it) it.style.display = "none";
      });
      const qrc = document.getElementById("lobby-qr-container");
      if (qrc) qrc.classList.add("guest-compact");
      // guests already typed their name on the join card
      const nmIn = document.getElementById("tank-player-name-input");
      if (nmIn) { nmIn.style.display = "none"; const lb = document.querySelector('label[for="tank-player-name-input"]'); if (lb) lb.style.display = "none"; }
    }
    if (isHost) { const qrc = document.getElementById("lobby-qr-container"); if (qrc) qrc.classList.remove("guest-compact"); this._initSoundControls(); this._syncSoundButtons(); }

    // 4. Render tin nhắn chat
    this.renderChatMessages();
  }

  _renderGuestLobby() {
    const isSingles = this.matchManager.matchType === "singles";
    const mySlotId = this.matchManager.localPlayerSlot || "B1";
    const mySlot = this.matchManager.slots.find(s => s.slotId === mySlotId) ||
                   this.matchManager.slots.find(s => s.playerName === this.playerName) ||
                   this.matchManager.slots.find(s => s.playerType === "human" && s.slotId !== "A1") ||
                   this.matchManager.slots[1];

    // 1. Vị trí & Đội của bạn
    const badgeRole = document.getElementById("guest-my-role-badge");
    if (badgeRole) {
      if (mySlot) {
        const teamLetter = mySlot.teamCode || (mySlot.slotId.startsWith("A") ? "A" : "B");
        const isTeamA = teamLetter === "A";
        const teamName = isTeamA ? (this.matchManager.teamAName || "Đội A") : (this.matchManager.teamBName || "Đội B");
        const roleDesc = mySlot.slotId === "A1" ? "Chủ phòng" : isTeamA ? "Đồng đội Đội A" : "Đội B (Đối thủ)";
        badgeRole.innerHTML = `
          <span style="color: ${isTeamA ? '#ffea28' : '#38bdf8'}; font-weight: 900;">
            ${isTeamA ? '🟡' : '🔵'} ${teamName} • Vị trí ${mySlot.slotId} [${roleDesc}]
          </span>
        `;
      } else {
        badgeRole.textContent = "Đang ở hàng chờ...";
      }
    }

    // 2. Thể thức thi đấu
    const elMode = document.getElementById("guest-summary-mode");
    if (elMode) {
      elMode.textContent = isSingles ? "🤺 PVP Quyết Đấu 1v1 (Đơn)" : "⚔️ Đối Kháng 2 Đội (2v2 Đôi)";
    }

    // 3. Thành phần phòng (Người thật vs Bot)
    const elPlayers = document.getElementById("guest-summary-players");
    if (elPlayers) {
      const humans = this.matchManager.slots.filter(s => s.playerType === "human").length;
      const bots = this.matchManager.slots.filter(s => s.playerType === "bot").length;
      const total = humans + bots;
      const maxP = isSingles ? 2 : 4;
      elPlayers.textContent = `${humans} Người chơi • ${bots} Máy Bot (${total}/${maxP})`;
    }

    // 4. Cấp độ máy bot
    const elBotSpeed = document.getElementById("guest-summary-bot-speed");
    if (elBotSpeed) {
      const diff = (this.matchManager.botDifficulty || "normal").toLowerCase();
      elBotSpeed.textContent = botLevelLabel(diff);
    }

    // 5. Chủ phòng
    const elHost = document.getElementById("guest-summary-host");
    if (elHost) {
      elHost.textContent = this.matchManager.hostName || "Hachihi Pro";
    }

    // 6. Mã phòng
    const elCode = document.getElementById("guest-summary-room-code");
    if (elCode) {
      elCode.textContent = this.matchManager.roomId || this.currentRoomId || "10150";
    }

    // 7. Tên và màu đội
    const nameA = document.getElementById("guest-name-team-a");
    if (nameA) nameA.textContent = this.matchManager.teamAName || "Đội A";
    const nameB = document.getElementById("guest-name-team-b");
    if (nameB) nameB.textContent = this.matchManager.teamBName || "Đội B";

    const indA = document.getElementById("guest-ind-a");
    if (indA) indA.style.backgroundColor = this.matchManager.teamAColor || "#ffea28";
    const indB = document.getElementById("guest-ind-b");
    if (indB) indB.style.backgroundColor = this.matchManager.teamBColor || "#0284c7";

    // 8. Render Danh sách 2 Đội ở chế độ chỉ xem
    const renderTeamRoster = (containerId, teamCode) => {
      const container = document.getElementById(containerId);
      if (!container) return;
      const slots = this.matchManager.slots.filter(s => s.teamCode === teamCode);
      let html = "";
      slots.forEach(s => {
        if (isSingles && s.slotNumber > 1) return;
        const isMe = s.slotId === mySlotId || (mySlot && s.slotId === mySlot.slotId);
        if (s.playerType === "empty") {
          html += `
            <div class="guest-roster-slot-row is-empty">
              <div class="guest-slot-left">
                <span class="guest-slot-tag">${s.slotId}</span>
                <span class="guest-slot-name" style="color: #64748b; font-style: italic;">Đang chờ người chơi...</span>
              </div>
              <span class="guest-slot-badge">[Trống]</span>
            </div>`;
        } else if (s.playerType === "bot") {
          html += `
            <div class="guest-roster-slot-row">
              <div class="guest-slot-left">
                <span class="guest-slot-tag">${s.slotId}</span>
                <span class="guest-slot-name">🤖 ${s.playerName || "Bot AI"}</span>
              </div>
              <span class="guest-slot-badge" style="color: #38bdf8;">[BOT]</span>
            </div>`;
        } else {
          const isHostSlot = s.slotId === "A1";
          html += `
            <div class="guest-roster-slot-row ${isMe ? 'is-me' : ''}">
              <div class="guest-slot-left">
                <span class="guest-slot-tag">${s.slotId}</span>
                <span class="guest-slot-name">👤 ${s.playerName || "Người chơi"} ${isMe ? '<strong style="color: #ffea28;">(Bạn)</strong>' : ''}</span>
              </div>
              <span class="guest-slot-badge" style="color: ${isHostSlot ? '#ffea28' : '#22c55e'}; font-weight: 800;">
                ${isHostSlot ? '[Chủ phòng]' : '[Sẵn sàng]'}
              </span>
            </div>`;
        }
      });
      container.innerHTML = html;
    };

    renderTeamRoster("guest-list-team-a", "A");
    renderTeamRoster("guest-list-team-b", "B");
  }

  _renderHostLobby() {
    const isSingles = this.matchManager.matchType === "singles";

    // 1. Tên đội & màu sắc
    const inputTeamA = document.getElementById("input-team-a-name");
    if (inputTeamA && document.activeElement !== inputTeamA) inputTeamA.value = this.matchManager.teamAName || "Đội A (Sân Nhà)";
    const inputTeamB = document.getElementById("input-team-b-name");
    if (inputTeamB && document.activeElement !== inputTeamB) inputTeamB.value = this.matchManager.teamBName || "Đội B (Đối Thủ)";

    const indA = document.getElementById("team-a-indicator");
    if (indA) indA.style.backgroundColor = this.matchManager.teamAColor || "#ffea28";
    const indB = document.getElementById("team-b-indicator");
    if (indB) indB.style.backgroundColor = this.matchManager.teamBColor || "#0284c7";

    const countA = this.matchManager.slots.filter(s => s.teamCode === "A" && s.playerType !== "empty").length;
    const countB = this.matchManager.slots.filter(s => s.teamCode === "B" && s.playerType !== "empty").length;
    const elCountA = document.getElementById("team-a-count");
    if (elCountA) elCountA.textContent = String(countA);
    const elCountB = document.getElementById("team-b-count");
    if (elCountB) elCountB.textContent = String(countB);

    // 2. Render danh sách slots cho Đội A và Đội B
    this._renderHostTeamSlots("team-a-members", "A");
    this._renderHostTeamSlots("team-b-members", "B");

    // 3. Highlight chế độ thi đấu
    const modeDoubles = document.getElementById("tank-mode-doubles");
    const modeSingles = document.getElementById("tank-mode-singles");
    if (modeDoubles) modeDoubles.classList.toggle("active", !isSingles);
    if (modeSingles) modeSingles.classList.toggle("active", isSingles);

    // 4. Banner điều kiện & nút Bắt đầu
    const condBanner = document.getElementById("tank-condition-banner");
    const condIcon = document.getElementById("tank-condition-icon");
    const condText = document.getElementById("tank-condition-text");
    const btnStart = document.getElementById("btn-tank-start-match");
    const txtStart = document.getElementById("btn-tank-start-text");

    const canStart = this.matchManager.canStart();
    if (canStart) {
      if (condBanner) {
        condBanner.className = "tank-condition-banner ready";
        if (condIcon) condIcon.textContent = "✅";
        if (condText) condText.textContent = "Đã đủ điều kiện! Chủ phòng có thể nhấn Bắt Đầu để vào sân thi đấu.";
      }
      if (btnStart) {
        btnStart.disabled = false;
        btnStart.className = "btn-tank-start-cta ready";
        if (txtStart) txtStart.textContent = "BẮT ĐẦU TRẬN ĐẤU";
      }
    } else {
      if (condBanner) {
        condBanner.className = "tank-condition-banner warn";
        if (condIcon) condIcon.textContent = "⚠️";
        if (condText) condText.textContent = "Chế độ đối kháng yêu cầu ít nhất 2 người hoặc thêm Máy (Bot) để bắt đầu!";
      }
      if (btnStart) {
        btnStart.disabled = true;
        btnStart.className = "btn-tank-start-cta disabled";
        if (txtStart) txtStart.textContent = "CHƯA ĐỦ ĐIỀU KIỆN BẮT ĐẦU";
      }
    }
  }

  _renderHostTeamSlots(containerId, teamCode) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const isSingles = this.matchManager.matchType === "singles";
    const slots = this.matchManager.slots.filter(s => s.teamCode === teamCode);
    const otherTeam = teamCode === "A" ? "B" : "A";

    let html = "";
    slots.forEach(slot => {
      if (isSingles && slot.slotNumber > 1) return;
      const isHostSlot = slot.slotId === "A1";

      if (slot.playerType === "empty") {
        html += `
          <div class="tank-member-row empty-slot" id="row-slot-${slot.slotId}" data-slot="${slot.slotId}">
            <div class="member-info-col">
              <span class="member-prefix">${slot.slotId}</span>
              <strong class="member-name" id="name-${slot.slotId}" style="color: #64748b; font-style: italic;">Chưa có người chơi trong đội...</strong>
              <span class="member-role-badge empty-badge" id="badge-${slot.slotId}">[Đang chờ]</span>
              <span class="member-status-badge waiting">CHỜ</span>
            </div>
            <div class="member-actions-col">
              <button type="button" class="btn-add-bot-slot-quick" data-slot="${slot.slotId}" title="Thêm Máy Bot vào vị trí này">🤖 + Máy</button>
            </div>
          </div>`;
      } else if (slot.playerType === "bot") {
        const botSpeed = botLevelLabel(slot.botDifficulty || this.matchManager.botDifficulty || "normal").toUpperCase();
        html += `
          <div class="tank-member-row bot-member" id="row-slot-${slot.slotId}" data-slot="${slot.slotId}" draggable="true" title="Kéo thả để đổi vị trí hoặc chuyển đội">
            <div class="member-info-col">
              <span class="member-prefix">${slot.slotId}</span>
              <strong class="member-name" id="name-${slot.slotId}">${slot.playerName || (slot.slotId === "A2" ? "Maya (AI)" : slot.slotId === "B1" ? "Matt (AI)" : "Akira (AI)")}</strong>
              <span class="member-role-badge bot-badge" id="badge-${slot.slotId}">[Máy Bot - ${botSpeed}]</span>
              <span class="member-status-badge ready">SẴN SÀNG</span>
            </div>
            <div class="member-actions-col">
              <button type="button" class="btn-switch-team" data-slot="${slot.slotId}" title="Chuyển sang Đội ${otherTeam}">⇄ Đội ${otherTeam}</button>
              <button type="button" class="btn-remove-slot" data-slot="${slot.slotId}" title="Xóa Bot khỏi slot">✕</button>
            </div>
          </div>`;
      } else {
        html += `
          <div class="tank-member-row ${isHostSlot ? 'host-member' : 'human-member'}" id="row-slot-${slot.slotId}" data-slot="${slot.slotId}" draggable="${isHostSlot ? 'false' : 'true'}" title="Kéo thả để đổi vị trí hoặc chuyển đội">
            <div class="member-info-col">
              <span class="member-prefix">${slot.slotId}</span>
              <strong class="member-name" id="name-${slot.slotId}">${slot.playerName || "Người chơi"}</strong>
              <span class="member-role-badge ${isHostSlot ? 'host-badge' : 'player-badge'}" id="badge-${slot.slotId}">
                ${isHostSlot ? '[Chủ phòng]' : '[Người chơi]'}
              </span>
              <span class="member-status-badge ready">SẴN SÀNG</span>
            </div>
            <div class="member-actions-col">
              ${!isHostSlot ? `<button type="button" class="btn-switch-team" data-slot="${slot.slotId}" title="Chuyển sang Đội ${otherTeam}">⇄ Đội ${otherTeam}</button>` : ''}
              ${!isHostSlot ? `<button type="button" class="btn-remove-slot" data-slot="${slot.slotId}" title="Mời người này ra khỏi phòng">✕</button>` : ''}
            </div>
          </div>`;
      }
    });

    container.innerHTML = html;
    this._attachHostSlotEvents(container, teamCode);
  }

  _attachHostSlotEvents(container, teamCode) {
    if (!container) return;
    container.dataset.team = teamCode;

    // Quick Add Bot nút trực tiếp trên hàng trống
    container.querySelectorAll(".btn-add-bot-slot-quick").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const slotId = btn.dataset.slot;
        if (!slotId) return;
        const botSlot = this.matchManager.addBot(slotId, this.matchManager.botDifficulty || "normal");
        this.updateLobbyUI();
        try {
          await fetch("/api/match/slot/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              room: this.currentRoomId,
              slotId,
              playerType: "bot",
              botDifficulty: this.matchManager.botDifficulty || "normal",
              botName: botSlot ? botSlot.playerName : "Bot AI"
            })
          });
        } catch {}
      });
    });

    // Switch Team (Chuyển sang đội đối diện)
    container.querySelectorAll(".btn-switch-team").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const slotId = btn.dataset.slot;
        if (!slotId) return;
        this.matchManager.switchTeam(slotId);
        this.updateLobbyUI();
        try {
          await fetch("/api/match/slot/switch-team", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room: this.currentRoomId, slotId })
          });
        } catch {}
      });
    });

    // Remove Slot (Xóa / Đưa về trạng thái trống)
    container.querySelectorAll(".btn-remove-slot").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const slotId = btn.dataset.slot;
        if (!slotId) return;
        this.matchManager.clearSlot(slotId);
        this.updateLobbyUI();
        try {
          await fetch("/api/match/slot/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ room: this.currentRoomId, slotId, playerType: "empty" })
          });
        } catch {}
      });
    });

    // Drag and Drop cho từng hàng
    container.querySelectorAll(".tank-member-row").forEach(row => {
      const slotId = row.dataset.slot;

      row.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", slotId);
        e.dataTransfer.effectAllowed = "move";
        row.classList.add("dragging");
      });

      row.addEventListener("dragend", () => {
        document.querySelectorAll(".tank-member-row").forEach(r => r.classList.remove("dragging", "drag-target"));
        document.querySelectorAll(".team-members-list").forEach(l => l.classList.remove("drag-over"));
      });

      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        row.classList.add("drag-target");
      });

      row.addEventListener("dragleave", () => {
        row.classList.remove("drag-target");
      });

      row.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        row.classList.remove("drag-target");
        const fromSlotId = e.dataTransfer.getData("text/plain");
        const toSlotId = row.dataset.slot;
        if (fromSlotId && toSlotId && fromSlotId !== toSlotId) {
          this.matchManager.swapSlots(fromSlotId, toSlotId);
          this.updateLobbyUI();
          this._syncSlotMove(fromSlotId, toSlotId);
        }
      });
    });

    // Kéo thả vào vùng danh sách của đội
    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      container.classList.add("drag-over");
    });

    container.addEventListener("dragleave", (e) => {
      if (e.target === container) {
        container.classList.remove("drag-over");
      }
    });

    container.addEventListener("drop", (e) => {
      container.classList.remove("drag-over");
      if (e.target === container) {
        e.preventDefault();
        const fromSlotId = e.dataTransfer.getData("text/plain");
        if (fromSlotId) {
          this.matchManager.moveToTeam(fromSlotId, teamCode);
          this.updateLobbyUI();
          this._syncSlotMove(fromSlotId, null, teamCode);
        }
      }
    });
  }

  async fetchAndRenderTournamentBracket() {
    try {
      const allowBots = document.getElementById("tour-allow-bots-switch")?.checked ?? true;
      const res = await fetch(`/api/tournament/bracket?matchType=${this.matchManager.matchType}&allowBots=${allowBots}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.bracket) return;

      const bracketView = document.getElementById("tournament-bracket-view");
      if (!bracketView) return;

      let html = "";
      for (const round of data.bracket) {
        const isFinals = round.roundId === "finals";
        html += `<div class="bracket-round ${isFinals ? "finals-round" : ""}">
          <div class="round-header">${round.roundName}</div>`;

        for (const m of round.matches) {
          const isChampionship = m.isChampionship;
          html += `
            <div class="bracket-match-card ${isChampionship ? "championship-match" : m.status === "in_progress" ? "active-match" : ""}">
              <div class="match-meta">${m.courtName} • ${m.matchType.toUpperCase()}</div>
              <div class="match-team ${m.teamA.score > m.teamB.score ? "team-lead" : ""}">
                <span class="team-name">${m.teamA.name}</span>
                <span class="team-tag ${m.teamA.type === "human" ? "tag-human" : m.teamA.type === "bot" ? "tag-bot" : "tag-gold"}">${m.teamA.label}</span>
                <span class="team-score">${m.teamA.score}</span>
              </div>
              <div class="match-team ${m.teamB.score > m.teamA.score ? "team-lead" : ""}">
                <span class="team-name">${m.teamB.name}</span>
                <span class="team-tag ${m.teamB.type === "human" ? "tag-human" : m.teamB.type === "bot" ? "tag-bot" : "tag-gold"}">${m.teamB.label}</span>
                <span class="team-score">${m.teamB.score}</span>
              </div>
            </div>`;
        }
        html += `</div>`;
      }
      bracketView.innerHTML = html;
    } catch (err) {
      console.warn("[TournamentBracket] fetch err:", err);
    }
  }


  setPlayerName(t) {
    const n = (t || "Hachihi Pro").trim().slice(0, 16) || "Hachihi Pro";
    this.playerName = n;
    const e = document.getElementById("hud-player-name");
    e && (e.textContent = n);
    const i = document.getElementById("setup-you-label");
    i && (i.textContent = n);
    const o = document.getElementById("victory-player-name");
    o && (o.textContent = `${n} (+120)`);
    if (this._lockedRoomId && this.matchManager && this.matchManager.localPlayerSlot) {
      const slotId = this.matchManager.localPlayerSlot;
      const mine = (this.matchManager.slots || []).find((s) => s.slotId === slotId);
      if (mine) mine.playerName = n;
      fetch("/api/match/slot/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: this._lockedRoomId, slotId, playerName: n })
      }).catch(() => {});
    }
  }

  setActiveShotChip(t = "TOPSPIN") {
    const n = String(t || "TOPSPIN").toUpperCase();
    document.querySelectorAll(".shot-chip").forEach(e => {
      e.classList.toggle("active", e.dataset.shot === n);
    });
  }

  async openMultiplayerModal() {
    if (this.elCompanionModal) {
      try {
        const t = await fetch("/api/tunnel/status", { cache: "no-store" });
        if (t.ok) {
          const n = await t.json();
          if (n.tunnelUrl) {
            this.currentTunnelUrl = n.tunnelUrl;
            const e = document.getElementById("tunnel-url-input");
            e && (e.value = n.tunnelUrl);
          }
        }
      } catch {}
      this.updateMultiplayerRoomInfo({ roomId: this.currentRoomId, tunnelUrl: this.currentTunnelUrl });
      this.elCompanionModal.classList.remove("hidden");
    }
  }

  hideTitleModal() {
    document.documentElement.classList.add("autoplay-mode");
    this.elTitleModal && (this.elTitleModal.classList.add("hidden"), (this.elTitleModal.style.display = "none"));
  }

  showTitleModal() {
    if (this._lockedRoomId) this._leaveCurrentRoom();   // returning to the menu always leaves the room (host => closes it for everyone)
    document.documentElement.classList.remove("autoplay-mode");
    this.elTitleModal && (this.elTitleModal.classList.remove("hidden"), (this.elTitleModal.style.display = "flex"));
  }

  hideVictoryModal() {
    this.elVictoryModal && this.elVictoryModal.classList.add("hidden");
  }

  showVictoryModal({ playerWon: t, playerGames: n, opponentGames: e }) {
    if (!this.elVictoryModal) return;
    const i = document.getElementById("victory-result-banner"),
      o = document.getElementById("victory-match-score"),
      s = document.getElementById("skill-rating-value");
    const a = I18N[this.currentLang] || I18N.vi;
    i && ((i.textContent = t ? a.youWin : a.tryAgain), (i.style.color = t ? "#ffea28" : "#9ad4ff"));
    o && (o.textContent = this.currentLang === "vi" ? `Tỉ Số: ${n} - ${e}` : `Final Games: ${n} - ${e}`);
    const r = t ? 1145 : 1020;
    s && (s.textContent = String(r));
    this._drawSkillGraph(t);
    this.elVictoryModal.classList.remove("hidden");
  }

  _drawSkillGraph(t) {
    const n = document.getElementById("skill-graph-canvas");
    if (!n) return;
    const e = n.getContext("2d"),
      i = n.width,
      o = n.height;
    e.clearRect(0, 0, i, o);
    e.fillStyle = "#f8fbff";
    e.fillRect(0, 0, i, o);
    e.strokeStyle = "#d0dce8";
    e.lineWidth = 1;
    for (let p = 25; p < o; p += 35) {
      e.beginPath();
      e.moveTo(0, p);
      e.lineTo(i, p);
      e.stroke();
    }
    const s = o * 0.56;
    e.strokeStyle = "#9aaab8";
    e.setLineDash([4, 4]);
    e.beginPath();
    e.moveTo(0, s);
    e.lineTo(i, s);
    e.stroke();
    e.setLineDash([]);
    e.fillStyle = "#6c7c8c";
    e.font = "bold 11px sans-serif";
    e.fillText("HACHIHI 1000", 8, s - 5);
    const a = t ? [0.74, 0.66, 0.58, 0.45, 0.24] : [0.74, 0.66, 0.58, 0.52, 0.55];
    e.strokeStyle = "#1f96f2";
    e.lineWidth = 3.5;
    e.lineCap = "round";
    e.lineJoin = "round";
    e.beginPath();
    a.forEach((p, g) => {
      const y = 24 + (g / (a.length - 1)) * (i - 48),
        f = o * p;
      g === 0 ? e.moveTo(y, f) : e.lineTo(y, f);
    });
    e.stroke();
    const r = i - 24,
      m = o * a[a.length - 1];
    e.fillStyle = "#ffea28";
    e.beginPath();
    e.arc(r, m, 6, 0, Math.PI * 2);
    e.fill();
    e.strokeStyle = "#006cc4";
    e.lineWidth = 2.5;
    e.stroke();
  }

  configureGameBubbles(t = 2) {
    [this.elGamesPlayer, this.elGamesOpponent].forEach(n => {
      if (!n) return;
      n.querySelectorAll(".game-bubble").forEach((i, o) => {
        o < Math.max(1, t) ? i.classList.remove("hidden") : i.classList.add("hidden");
      });
    });
  }

  updateScoreboard({
    playerScoreText: t = "00",
    opponentScoreText: n = "00",
    serverNumber: sNum = 2,
    deuceLabel: e = null,
    playerGames: i = 0,
    opponentGames: o = 0,
    gamesToWin: s = 2,
    server: srvTeam = null
  }) {
    this._updateServerChip(sNum, srvTeam);
    if (this.elScoreCenter) {
      if (e) {
        this.elScoreCenter.classList.add("deuce-mode");
        this.elScorePlayer.textContent = e;
        this.elScoreSep.classList.add("hidden");
        this.elScoreOpponent.classList.add("hidden");
      } else {
        this.elScoreCenter.classList.remove("deuce-mode");
        this.elScorePlayer.textContent = t;
        this.elScoreSep.classList.remove("hidden");
        this.elScoreOpponent.classList.remove("hidden");
        this.elScoreOpponent.textContent = n;
      }
      if (this.elScoreServerBadge) {
        this.elScoreServerBadge.textContent = `S${sNum || 2}`;
      }
      this.configureGameBubbles(s);
      this.elGamesPlayer &&
        this.elGamesPlayer.querySelectorAll(".game-bubble").forEach((r, m) => r.classList.toggle("won", m < i));
      this.elGamesOpponent &&
        this.elGamesOpponent.querySelectorAll(".game-bubble").forEach((r, m) => r.classList.toggle("won", m < o));
    }
  }

  // Chip "Giao bóng · người số N" dưới bảng điểm + chấm báo bên đang giao
  _updateServerChip(sNum, srvTeam) {
    const chip = document.getElementById("server-chip");
    const txt = document.getElementById("server-chip-text");
    const n = sNum || 2;
    if (txt) txt.textContent = this.currentLang === "en" ? `Serving · player #${n}` : `Giao bóng · người số ${n}`;
    if (chip) chip.dataset.short = this.currentLang === "en" ? `Serve #${n}` : `Giao #${n}`;
    const board = document.getElementById("scoreboard-pill");
    if (board && srvTeam) board.dataset.server = srvTeam === "opponent" ? "opponent" : "player";
  }

  updateServerTag(t, n, serverNumber = 2) {
    if (!this.elServerTag) return;
    if (!n || !t || !t.visible) {
      this.elServerTag.classList.add("hidden");
      return;
    }
    this.elServerTag.classList.remove("hidden");
    const e = Math.max(80, Math.min(window.innerWidth - 80, t.x)),
      i = Math.max(95, Math.min(window.innerHeight - 90, t.y));
    this.elServerTag.style.left = `${e.toFixed(1)}px`;
    this.elServerTag.style.top = `${i.toFixed(1)}px`;
    const label = document.getElementById("server-tag-text");
    if (label) {
      const prefix = this.currentLang === "vi" ? "Giao bóng" : "Server";
      label.textContent = `${prefix} (S${serverNumber || 2})`;
    }
  }

  updatePlayerNameplate(t, n) {
    if (!this.elPlayerNameplate) return;
    if (!n || !t || !t.visible) {
      this.elPlayerNameplate.classList.add("hidden");
      return;
    }
    this.elPlayerNameplate.classList.remove("hidden");
    const e = Math.max(90, Math.min(window.innerWidth - 90, t.x)),
      i = Math.max(120, Math.min(window.innerHeight - 50, t.y));
    this.elPlayerNameplate.style.left = `${e.toFixed(1)}px`;
    this.elPlayerNameplate.style.top = `${i.toFixed(1)}px`;
  }

  showTimingPopup({
    grade: t = "PERFECT",
    detail: n = "DINK \u2022 KITCHEN DROP",
    screenPos: e = null,
    durationMs: i = 700
  }) {
    if (this.elTimingPopup) {
      if (this.timingPopupTimer && clearTimeout(this.timingPopupTimer)) {
        // cleared
      }
      this.elTimingGrade.textContent = t;
      this.elTimingGrade.className = "timing-grade";
      t.includes("EARLY") || t.includes("SỚM")
        ? this.elTimingGrade.classList.add("grade-early")
        : t.includes("LATE") || t.includes("MUỘN") || t.includes("LỖI") || t.includes("FAULT")
        ? this.elTimingGrade.classList.add("grade-late")
        : this.elTimingGrade.classList.add("grade-perfect");

      this.elTimingDetail.textContent = n;
      if (e && e.visible) {
        const o = Math.max(110, Math.min(window.innerWidth - 110, e.x)),
          s = Math.max(110, Math.min(window.innerHeight - 120, e.y));
        this.elTimingPopup.style.left = `${o.toFixed(1)}px`;
        this.elTimingPopup.style.top = `${s.toFixed(1)}px`;
      } else {
        this.elTimingPopup.style.left = "50%";
        this.elTimingPopup.style.top = "54%";
      }
      this.elTimingPopup.classList.remove("hidden");
      i > 0 &&
        (this.timingPopupTimer = setTimeout(() => {
          this.elTimingPopup.classList.add("hidden");
        }, i));
    }
  }

  // Ưu tiên banner: 1 = thắng ván/trận, game/match point (giữa) · 2 = lỗi, ra ngoài (trên giữa) · 3 = còn lại.
  // Chỉ một banner hiện cùng lúc; ưu tiên thấp hơn không được ghi đè banner ưu tiên cao đang hiện.
  _bannerPriorityOf(style, text) {
    if (style === "style-gold") return 1;
    if (style === "style-fault") return 2;
    if (style === "style-score") return 2;
    return 3;
  }

  showCenterBanner(t, { style: n = "style-gold", subText: e = "", durationMs: i = 1600, persistent: o = !1 } = {}) {
    if (!this.elBannerLayer || !this.elBannerText) return;
    const prio = this._bannerPriorityOf(n, t);
    const now = Date.now();
    if (this._bannerPrio && this._bannerUntil > now && prio > this._bannerPrio) return; // đang có banner quan trọng hơn
    this._bannerPrio = prio;
    this._bannerUntil = now + (o ? 2500 : Math.max(300, i));
    this.bannerTimer && (clearTimeout(this.bannerTimer), (this.bannerTimer = null));
    this.elBannerText.textContent = t;
    this.elBannerText.className = `center-banner-text ${n}`;
    this.elBannerLayer.classList.toggle("banner-top", prio === 2);
    this.elBannerSub &&
      (e ? ((this.elBannerSub.textContent = e), this.elBannerSub.classList.remove("hidden")) : this.elBannerSub.classList.add("hidden"));
    this.elBannerLayer.classList.remove("hidden");
    !o &&
      i > 0 &&
      (this.bannerTimer = setTimeout(() => {
        this.hideCenterBanner();
      }, i));
  }

  hideCenterBanner() {
    this._bannerPrio = 0;
    this._bannerUntil = 0;
    this.bannerTimer && (clearTimeout(this.bannerTimer), (this.bannerTimer = null));
    this.elBannerLayer && this.elBannerLayer.classList.add("hidden");
  }

  setReplayMode(t) {
    document.body.classList.toggle("replay-mode", !!t);
    this.elReplayBadge && this.elReplayBadge.classList.toggle("hidden", !t);
  }

  updateTimingGauge({ cursorNormalized: t = 0.5, modeTitle: n = "SWING TIMING", speedText: e = "READY" }) {
    if (this.elTimingCursor) {
      const i = Math.max(4, Math.min(96, t * 100));
      this.elTimingCursor.style.left = `${i.toFixed(1)}%`;
    }
    this.elGaugeModeTitle && (this.elGaugeModeTitle.textContent = n);
    this.elGaugeSpeedReadout && (this.elGaugeSpeedReadout.textContent = e);
  }

  updateAudioStatus({ playing: t, trackName: n }) {
    this.elAudioDot && this.elAudioDot.classList.toggle("music-on", !!t);
    this.elAudioLabel && (this.elAudioLabel.textContent = t ? `Lyria: ${n || "Sunny Rally"}` : "Lyria: Muted");
  }

  updateCameraLabel(t) {
    this.elCameraLabel && (this.elCameraLabel.textContent = t);
  }

  updateMotionStatus({ webcamActive: t = !1, phoneConnected: n = !1, p1Phone: e = !1, p2Phone: i = !1 }) {
    this.elWebcamPip && this.elWebcamPip.classList.toggle("hidden", !t);
    this.elWebcamDot && this.elWebcamDot.classList.toggle("active", !!t);
    this.elPhoneDot && this.elPhoneDot.classList.toggle("active", !!(n || e || i));
    this.elPhoneLabel &&
      (e && i
        ? (this.elPhoneLabel.textContent = "P1 & P2")
        : n || e || i
        ? (this.elPhoneLabel.textContent = "Paddle Connected")
        : (this.elPhoneLabel.textContent = "Pocket Paddle"));
  }

  updateMultiplayerRoomInfo(t = {}) {
    const n = { ...(this._lastRoomStatus || {}), ...t };
    this._lastRoomStatus = n;
    n.roomId && !this._lockedRoomId && String(n.roomId).toLowerCase() !== "default" && (this.currentRoomId = String(n.roomId));
    n.role && (this.playerRole = ["p2", "p3", "p4"].includes(String(n.role).toLowerCase()) ? "p2" : "p1");
    if (n.tunnelUrl) {
      this.currentTunnelUrl = String(n.tunnelUrl).replace(/\/+$/, "");
      const d = document.getElementById("tunnel-url-input");
      d && document.activeElement !== d && (d.value = this.currentTunnelUrl);
    }
    const e = this.playerRole === "p2",
      i = document.getElementById("mp-card-p1"),
      o = document.getElementById("mp-card-p2"),
      s = document.getElementById("mp-gchat-invite-box"),
      a = document.getElementById("btn-create-1v1-room");
    i && i.classList.toggle("hidden", e);
    o && o.classList.toggle("hidden", !e);
    s && s.classList.toggle("hidden", e);
    a && a.classList.toggle("hidden", e);
    const r = document.getElementById("companion-room-badge");
    r && (r.textContent = `PHÒNG #${this.currentRoomId.toUpperCase()} \u2022 ${e ? "PLAYER 2" : "PLAYER 1"}`);
    const m = encodeURIComponent(this.currentRoomId),
      p = (this.currentTunnelUrl || window.location.origin).replace(/\/+$/, ""),
      g = `${p}/companion.html?room=${m}&role=p1`,
      y = `${p}/companion.html?room=${m}&role=p2`,
      f = document.getElementById("companion-link");
    f && (f.href = g);
    const I = document.getElementById("companion-link-p2");
    I && (I.href = y);
    const b = document.getElementById("companion-qr");
    if (b) {
      const d = "https://www.gstatic.com/aistudio/starter-apps/tennis/qr/player1_qr.png";
      b.dataset.lastSrc !== d && ((b.src = d), (b.dataset.lastSrc = d));
    }
    const B = document.getElementById("companion-qr-p2");
    if (B) {
      const d = "https://www.gstatic.com/aistudio/starter-apps/tennis/qr/player2_qr.png";
      B.dataset.lastSrc !== d && ((B.src = d), (B.dataset.lastSrc = d));
    }
    const c = document.getElementById("mp-p1-status");
    if (c) {
      const d = !!(n.p1Phone || n.p1Online);
      c.textContent = n.p1Phone ? "Connected \u2713" : d ? "Court Ready" : "Scan QR";
      c.classList.toggle("online", !!n.p1Phone);
    }
    const u = document.getElementById("mp-p2-status");
    if (u) {
      const d = !!(n.p2Phone || n.p2Online);
      u.textContent = n.p2Phone ? "Connected \u2713" : d ? "Court Ready" : "Scan QR";
      u.classList.toggle("online", !!n.p2Phone);
    }
    const h = document.getElementById("mp-active-status");
    if (h) {
      const d = e ? !!n.p2Phone : !!n.p1Phone;
      h.textContent = d ? "Connected \u2713" : "Scan QR";
      h.classList.toggle("online", d);
    }
    this.updateOpponentPresence(n);
  }

  updateOpponentPresence(t = {}) {
    const n = !!(
        t.isMultiplayer ||
        this.selectedDifficulty === "1v1" ||
        (this.currentRoomId && this.currentRoomId !== "default")
      ),
      e = document.querySelector(".mii-side-opponent .mii-avatar-badge:not(.secondary-mii)");
    if (!n) {
      this.elOpponentPresencePill && this.elOpponentPresencePill.classList.add("hidden");
      e && e.classList.remove("opponent-ready");
      this._lastOtherReady = !1;
      return;
    }
    const i = t.hostName && t.hostName.trim() ? t.hostName.trim() : "Player 1",
      o = t.guestName && t.guestName.trim() ? t.guestName.trim() : "Player 2",
      s = this.playerRole === "p2";
    let a = !1,
      r = "";
    s
      ? ((a = !!(t.p2Phone || t.p1Phone || t.p1Online)),
        t.p2Phone
          ? (r = `Paddle Ready \u2022 ${i} Joined`)
          : t.p1Phone || t.p1Online
          ? (r = `${i} Ready \u2022 Scan QR for Paddle`)
          : (r = `Waiting for ${i}\u2026`))
      : ((a = !!(t.p2Phone || t.p2Online)),
        t.p2Phone && t.p2Online
          ? (r = `${o} Connected \u2022 Ready to Serve!`)
          : t.p2Phone
          ? (r = `${o}'s Paddle Ready \u2022 Ready!`)
          : t.p2Online
          ? (r = `${o} Joined \u2022 Ready!`)
          : (r = `Waiting for ${o}\u2026`));
    // Chỉ báo "đã kết nối" MỘT LẦN khi đối thủ vừa vào; sau ~4 giây tự ẩn và KHÔNG hiện lại khi đang chơi.
    // (Trước đây _lastOtherReady không bao giờ được ghi nhớ nên hiệu ứng chớp chạy lại mỗi lần cập nhật trạng thái.)
    const pill = this.elOpponentPresencePill;
    if (pill) {
      const now = Date.now();
      if (a && !this._presenceShown) {
        this._presenceShown = true;
        this._presenceUntil = now + 4000;
        this.elOpponentPresenceText && (this.elOpponentPresenceText.textContent = r);
        pill.classList.remove("hidden");
        pill.classList.add("ready");
        pill.classList.remove("just-joined");
        void pill.offsetWidth;
        pill.classList.add("just-joined");
        this._justJoinedTimer && clearTimeout(this._justJoinedTimer);
        this._justJoinedTimer = setTimeout(() => {
          pill.classList.remove("just-joined");
          pill.classList.add("hidden");
        }, 4000);
      } else if (now >= (this._presenceUntil || 0)) {
        pill.classList.add("hidden");
        pill.classList.remove("just-joined");
      }
    }
    this._lastOtherReady = a;
    e && e.classList.toggle("opponent-ready", a);
  }

  // Đang trong trận (đã giao bóng / đang đánh / xem lại / hết trận) thì KHÓA đổi sân & ánh sáng.
  // Ở màn hình chính / phòng chờ (phase TITLE) vẫn đổi bình thường.
  _isMatchLocked() {
    const e = typeof window !== "undefined" && window.__argonTennis;
    const ph = e && e.phase;
    return !!ph && ["SERVE_STANCE", "SERVE_TOSS", "RALLY", "POINT_OVER", "REPLAY", "MATCH_OVER"].includes(ph);
  }

  _notifyMatchLocked() {
    let t = document.getElementById("match-lock-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "match-lock-toast";
      t.className = "match-lock-toast";
      t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = "🔒 Đang thi đấu – không đổi được sân và ánh sáng";
    t.classList.add("show");
    clearTimeout(this._lockToastTimer);
    this._lockToastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  setSelectedScenery(scId) {
    if (this._isMatchLocked()) return; // khóa khi đang chơi
    this.selectedScenery = scId;
    const info = SCENERIES[scId] || SCENERIES.landmark81;
    this.updateSceneryUI(info);
    if (this.matchManager) {
      this.matchManager.setScenery(scId);
    }
    this._postRoomSetting({ scenery: scId });
  }

  // Host-only room settings are stored on the server so every player sees the same game.
  _postRoomSetting(patch) {
    try {
      if (!this.matchManager || !this.matchManager.isHost || !this._lockedRoomId) return;
      fetch("/api/match/team/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: this._lockedRoomId, ...patch })
      }).catch(() => {});
    } catch {}
  }

  _syncSoundButtons() {
    const snd = this.matchManager.sound || { music: true, sfx: true };
    const set = (id, on, label) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle("active", !!on);
      el.setAttribute("aria-pressed", on ? "true" : "false");
      el.textContent = (on ? "🔊 " : "🔇 ") + label + (on ? ": BẬT" : ": TẮT");
    };
    set("lobby-sound-music", snd.music, "Nhạc nền");
    set("lobby-sound-sfx", snd.sfx, "Hiệu ứng");
  }

  _initSoundControls() {
    [["lobby-sound-music", "music"], ["lobby-sound-sfx", "sfx"]].forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (!el || el._bound) return;
      el._bound = true;
      el.addEventListener("click", () => {
        const cur = this.matchManager.sound || { music: true, sfx: true };
        this.matchManager.sound = { ...cur, [key]: !cur[key] };
        this._syncSoundButtons();
        this._postRoomSetting({ sound: this.matchManager.sound });
      });
    });
  }

  // ---- Guest: join card (see room summary, type a name, then press START) ----
  async showGuestJoinCard(rawCode) {
    const code = String(rawCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const card = document.getElementById("guest-join-card");
    if (!card || !code) { this.joinRoomFromLink && this.joinRoomFromLink(code); return; }
    const $ = (id) => document.getElementById(id);
    const btn = $("gjc-start"), err = $("gjc-error"), nameEl = $("gjc-name");
    const fail = (msg, block = true) => { err.textContent = "⚠ " + msg; err.classList.remove("hidden"); if (block) btn.disabled = true; };
    err.classList.add("hidden"); btn.disabled = true;
    $("gjc-code").textContent = code;
    $("gjc-host").textContent = "...";
    $("gjc-mode").textContent = "...";
    $("gjc-count").textContent = "...";
    let saved = "";
    try { saved = localStorage.getItem("hachihi_guest_name") || ""; } catch {}
    nameEl.value = nameEl.value || saved || (this.playerName && this.playerName !== "Hachihi Pro" ? this.playerName : "");
    card.classList.remove("hidden"); card.style.display = "flex";
    try {
      const res = await fetch(`/api/match/state?room=${encodeURIComponent(code)}`, { cache: "no-store" });
      if (res.status === 404) { fail("Phòng không tồn tại hoặc đã hết hạn. Hãy xin link mới từ chủ phòng."); return; }
      if (!res.ok) { fail("Không kết nối được máy chủ. Thử lại sau."); return; }
      const d = await res.json();
      const slots = d.slots || [];
      const humans = slots.filter((s) => s.playerType === "human").length;
      const max = d.matchType === "singles" ? 2 : 4;
      const free = slots.filter((s) => s.slotId !== "A1" && (s.playerType === "empty" || s.playerType === "bot")).length;
      $("gjc-host").textContent = d.hostName || "Chủ phòng";
      $("gjc-mode").textContent = d.matchType === "singles" ? "Đấu đơn 1v1" : "Đấu đôi 2v2";
      $("gjc-count").textContent = `${humans} / ${max} người`;
      if (d.started) { fail("Trận đã bắt đầu, không thể vào thêm."); return; }
      if (free === 0) { fail("Phòng đã đầy."); return; }
      btn.disabled = false;
    } catch { fail("Mất kết nối. Kiểm tra mạng rồi mở lại link."); return; }

    const go = async () => {
      const name = nameEl.value.trim().slice(0, 16);
      if (!name) { fail("Hãy nhập tên của bạn trước khi bắt đầu.", false); nameEl.focus(); return; }
      try { localStorage.setItem("hachihi_guest_name", name); } catch {}
      const pn = document.getElementById("player-name-input");
      if (pn) pn.value = name;
      this.setPlayerName(name);
      card.classList.add("hidden"); card.style.display = "none";
      this.joinRoomFromLink && this.joinRoomFromLink(code);
    };
    btn.onclick = go;
    nameEl.onkeydown = (e) => { if (e.key === "Enter") go(); };
    $("gjc-cancel").onclick = () => { card.classList.add("hidden"); card.style.display = "none"; this.showTitleModal && this.showTitleModal(); };
  }

  updateSceneryUI(info) {
    if (!info) return;
    const scId = info.id;
    document.querySelectorAll(".scenery-card").forEach(c => {
      c.classList.toggle("active", c.dataset.scenery === scId);
    });
    const soloBadge = document.getElementById("solo-selected-scenery-name");
    if (soloBadge) soloBadge.textContent = `${info.icon} ${info.name}`;
    const lobbyBadge = document.getElementById("lobby-scenery-badge");
    if (lobbyBadge) lobbyBadge.textContent = (info.badge || info.name).toUpperCase();
    const guestSummary = document.getElementById("guest-summary-scenery");
    if (guestSummary) guestSummary.textContent = `${info.icon} ${info.name}`;
    const hudLabel = document.getElementById("scenery-label-hud");
    if (hudLabel) {
      const shortName = info.name.split(" ")[0].replace(/[^A-Za-z0-9]/g, "") || "Sân Đấu";
      hudLabel.textContent = `${info.icon} ${shortName}`;
    }
  }
}
