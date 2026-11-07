// Pickleball BOT Unified Controller
// Tích hợp di chuyển, ra quyết định chiến thuật, phối hợp đồng đội và thực thi hành động

import { getBotDifficultyConfig } from "./bot_difficulty.js";
import { BotMovement } from "./bot_movement.js";
import { BotDecision } from "./bot_decision.js";
import { BotTeamwork } from "./bot_teamwork.js";
import * as THREE from "three";

export class BotController {
  constructor(actor, slotConfig = {}) {
    this.actor = actor;
    this.slotConfig = {
      slotId: "B1",
      playerType: "bot",
      botId: "BOT_MATT",
      botName: "Matt (AI)",
      botDifficulty: "normal",
      matchType: "doubles",
      ...slotConfig
    };

    this.difficulty = getBotDifficultyConfig(this.slotConfig.botDifficulty);
    this.movement = new BotMovement(actor, this.slotConfig);
    this.decision = new BotDecision(actor, this.difficulty);
    this.teamworkState = { isPrimaryHitter: true, role: "solo" };
    this.reactionDelayRemaining = 0;
    this.serveWaitTimer = 0;
    this._lastHitter = null;
    this._lastStroke = -1;
    this._engineRef = null;
  }

  // Chỉ người được phân vai giao bóng (A1 cho đội A, B1 cho đội B) mới tung/giao bóng.
  // Trước đây cả bot đồng đội (A2/B2) cũng tự giao/đánh đè lên pha giao bóng của người thật.
  _isDesignatedServer(engine) {
    const server = engine.score.server;
    return (server === "player" && this.actor === engine.player) ||
           (server === "opponent" && this.actor === engine.opponent);
  }

  setDifficulty(level) {
    this.slotConfig.botDifficulty = level;
    this.difficulty = getBotDifficultyConfig(level);
    this.decision.setDifficulty(this.difficulty);
  }

  setSlotConfig(cfg) {
    this.slotConfig = { ...this.slotConfig, ...cfg };
    if (cfg.botDifficulty) this.setDifficulty(cfg.botDifficulty);
    this.movement.setSlotConfig(this.slotConfig);
  }

  // Cập nhật trạng thái phối hợp đồng đội
  updateTeamwork(partnerActor, ball) {
    if (this.slotConfig.matchType === "doubles" && partnerActor) {
      const assignment = BotTeamwork.evaluatePairAssignment(this.actor, partnerActor, ball, "doubles", {
        // Đồng đội là người thật (có thể đang đứng yên) -> bot ưu tiên tự đón bóng
        partnerIsHuman: !this._partnerIsBot(partnerActor)
      });
      this.teamworkState = assignment.actor1;
    } else {
      this.teamworkState = { isPrimaryHitter: true, role: "solo" };
    }
  }

  _partnerIsBot(partnerActor) {
    const e = this._engineRef;
    if (!e || !e.botControllers) return false;
    for (const bc of e.botControllers.values()) if (bc.actor === partnerActor) return true;
    return false;
  }

  // Vòng lặp cập nhật từng frame
  update(dt, engine) {
    if (!this.actor || !this.actor.model) return;

    this._engineRef = engine;
    const ball = engine.ball;
    const phase = engine.phase;
    const d = this.difficulty;

    // 1. Giao bóng tự động khi đến lượt BOT (chỉ bot được phân vai giao bóng)
    if (phase === "SERVE_STANCE") {
      if (!engine.persistentStateLock && this._isDesignatedServer(engine)) {
        this.serveWaitTimer += dt;
        // BOT đợi một lúc tạo cảm giác chuẩn bị tự nhiên (bot yếu chậm hơn)
        const wait = d.id === "hard" ? 0.9 : d.id === "normal" ? 1.2 : 1.7;
        if (this.serveWaitTimer > wait) {
          this.serveWaitTimer = 0;
          engine._startServeToss(this.actor);
        }
        return;
      }
      this.serveWaitTimer = 0;
      // Bot không giao thì đứng vào vị trí sẵn sàng
      this.movement.updateTargetPosition(ball, d, this.teamworkState);
      this.movement.step(dt, d);
      return;
    }

    // 2. Tung bóng và đánh bóng khi giao (SERVE_TOSS)
    if (phase === "SERVE_TOSS") {
      if (this._isDesignatedServer(engine) && ball.vel.y <= 0.35 && ball.pos.y >= (d.serveContactY || 2.1)) {
        engine._executeServeHit(this.actor, this.decision.evaluateServe());
      } else if (this._isDesignatedServer(engine) && d.serveContactY < 2.0 && ball.pos.y >= d.serveContactY && ball.vel.y > 0) {
        // Bot cấp thấp đánh sớm khi bóng còn đang bay lên (cú giao yếu)
        engine._executeServeHit(this.actor, this.decision.evaluateServe());
      }
      return;
    }

    // 3. Trong pha bóng (RALLY)
    if (phase === "RALLY" && ball.inPlay) {
      // Xác định đối thủ để tính góc đánh
      const opponents = this.actor.sideSign > 0
        ? [engine.opponent, engine.opponentPartner].filter(Boolean)
        : [engine.player, engine.playerPartner].filter(Boolean);

      // Phát hiện cú đánh mới -> bot cần thời gian phản xạ + đoán điểm rơi (theo cấp độ)
      if (ball.lastHitter !== this._lastHitter || (ball.rallyStrokeCount || 0) !== this._lastStroke) {
        this._lastHitter = ball.lastHitter;
        this._lastStroke = ball.rallyStrokeCount || 0;
        this.reactionDelayRemaining = d.reactionDelaySeconds * (0.7 + Math.random() * 0.6);
        const err = (1 - d.anticipationAccuracy) * 3.2;
        this.movement.anticipationNoise.x = (Math.random() * 2 - 1) * err;
        this.movement.anticipationNoise.z = (Math.random() * 2 - 1) * err * 0.8;
      }

      const isBallOnMySide = (this.actor.sideSign > 0 && ball.pos.z > 0) || (this.actor.sideSign < 0 && ball.pos.z < 0);
      const isBallMovingTowardsMe = (this.actor.sideSign > 0 && ball.vel.z > 0) || (this.actor.sideSign < 0 && ball.vel.z < 0);

      // Bóng do đối thủ đánh tới -> còn đang "phản xạ" thì chưa chạy / chưa vung vợt
      if (this.reactionDelayRemaining > 0 && ball.lastHitter !== this._myTeamName()) {
        this.reactionDelayRemaining -= dt;
        return;
      }

      // Cập nhật hướng chạy và vị trí đón bóng
      this.movement.updateTargetPosition(ball, d, this.teamworkState);
      this.movement.step(dt, d);

      // Kiểm tra thời điểm đánh bóng hợp lệ
      const distToBall = Math.hypot(this.actor.pos.x - ball.pos.x, this.actor.pos.z - ball.pos.z);
      const distZ = Math.abs(this.actor.pos.z - ball.pos.z);

      if (isBallOnMySide && isBallMovingTowardsMe && this.teamworkState.isPrimaryHitter) {
        // Tuân thủ luật Two-Bounce Rule: Đỡ giao bóng và cú thứ 3 phải đợi bóng nảy
        const mustBounce = (ball.rallyStrokeCount === 1 || ball.rallyStrokeCount === 2);
        if (mustBounce && ball.bounceCountOnCurrentSide === 0) return;

        // Tuân thủ luật Kitchen (NVZ): Không được volley trong vùng bếp
        const inKitchen = Math.abs(this.actor.pos.z) <= 2.15;
        if (inKitchen && ball.bounceCountOnCurrentSide === 0) return;

        const canHitHeight = ball.bounceCountOnCurrentSide >= 1
          ? (ball.pos.y >= 0.18 && ball.pos.y <= 2.65)
          : (ball.pos.y >= 0.55 && ball.pos.y <= 2.45);
        if (distZ <= d.reachDepth && distToBall <= d.reachDistance && canHitHeight && this.actor.swingCooldown <= 0) {
          this.executeRallyHit(engine, ball, opponents);
        }
      }
    } else {
      // Ngoài pha bóng: hồi vị trí về zone
      this.movement.updateTargetPosition(ball, d, this.teamworkState);
      this.movement.step(dt, d);
    }
  }

  _myTeamName() {
    return this.actor.sideSign > 0 ? "player" : "opponent";
  }

  executeRallyHit(engine, ball, opponents) {
    const shot = this.decision.evaluateRallyShot(ball, opponents);
    
    this.actor.swingType = shot.swingSide;
    this.actor.swingDuration = 0.36;
    this.actor.swingTimer = 0.36;
    this.actor.arcVisibleTimer = 0.36;
    this.actor.swingCooldown = this.difficulty.cooldownBetweenShots;

    // Kích hoạt animation vung vợt và kinematics
    if (engine.racketKinematics) {
      engine.racketKinematics.triggerSwing(this.actor, {
        shotType: shot.shotType.toLowerCase(),
        side: shot.swingSide,
        speed: 1.25,
        timing: shot.timingQuality.toLowerCase()
      });
      engine.racketKinematics.triggerImpactRecoil(this.actor, 1.0);
    }

    const contactPos = ball.pos.clone();
    contactPos.y = THREE.MathUtils.clamp(contactPos.y, 0.8, 1.85);
    ball.pos.copy(contactPos);

    // Bắn bóng đến mục tiêu chiến thuật
    engine._launchBallToTarget(
      contactPos,
      new THREE.Vector3(shot.targetX, 0, shot.targetZ),
      shot.flightDuration,
      {
        topspin: shot.topspin,
        sidespin: shot.sidespin,
        allowNetFault: shot.allowFault,
        shotType: shot.shotType
      }
    );

    // Cập nhật trạng thái trận đấu
    ball.inPlay = true;
    ball.lastHitter = this.actor.sideSign > 0 ? "player" : "opponent";
    ball.bounceCountOnCurrentSide = 0;
    ball.rallyStrokeCount = (ball.rallyStrokeCount || 0) + 1;
    ball.shotType = shot.shotType;
    ball.isPowerShot = (shot.shotType === "FLAT");

    if (engine.ballTrail) {
      engine.ballTrail.setStyle(shot.shotType, ball.isPowerShot);
    }

    if (engine.swingVfx) {
      engine.swingVfx.onRacketContact({
        actor: this.actor,
        ball: ball,
        contactPos: contactPos,
        shotType: shot.shotType,
        isPower: ball.isPowerShot,
        isServe: false,
        timingQuality: shot.timingQuality,
        speed: ball.vel.length()
      });
    }

    if (engine.audioEngine) {
      engine.audioEngine.playSwingWhoosh(1.1);
      engine.audioEngine.playRacketHit(shot.shotType.toLowerCase(), shot.timingQuality.toLowerCase());
    }

    // Hiển thị HUD thông báo cú đánh của BOT
    const screenPos = engine._projectToScreen(this.actor.pos.clone().add(new THREE.Vector3(0, 2.3, 0)));
    engine.hud.showTimingPopup({
      grade: `${this.slotConfig.botName} • ${shot.shotType}!`,
      detail: `${shot.speedKmh} KM/H (${this.difficulty.nameVi})`,
      screenPos: screenPos,
      durationMs: 1200
    });
  }
}
