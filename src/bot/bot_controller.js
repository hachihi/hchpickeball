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
      const assignment = BotTeamwork.evaluatePairAssignment(this.actor, partnerActor, ball, "doubles");
      this.teamworkState = assignment.actor1;
    } else {
      this.teamworkState = { isPrimaryHitter: true, role: "solo" };
    }
  }

  // Vòng lặp cập nhật từng frame
  update(dt, engine) {
    if (!this.actor || !this.actor.model) return;

    const ball = engine.ball;
    const phase = engine.phase;

    // 1. Giao bóng tự động khi đến lượt BOT
    const isBotTurnToServe = (
      phase === "SERVE_STANCE" &&
      !engine.persistentStateLock &&
      ((this.actor.sideSign > 0 && engine.score.server === "player") ||
       (this.actor.sideSign < 0 && engine.score.server === "opponent"))
    );

    if (isBotTurnToServe) {
      this.serveWaitTimer += dt;
      // BOT đợi từ 0.9s đến 1.4s tạo cảm giác chuẩn bị tự nhiên
      if (this.serveWaitTimer > (this.difficulty.id === "hard" ? 0.9 : 1.3)) {
        this.serveWaitTimer = 0;
        engine._startServeToss(this.actor);
      }
      return;
    }

    // 2. Tung bóng và đánh bóng khi giao (SERVE_TOSS)
    if (phase === "SERVE_TOSS") {
      const isMyToss = (
        (this.actor.sideSign > 0 && engine.score.server === "player") ||
        (this.actor.sideSign < 0 && engine.score.server === "opponent")
      );
      if (isMyToss && ball.vel.y <= 0.35 && ball.pos.y >= 2.1) {
        const serveDecision = this.decision.evaluateServe();
        engine._executeServeHit(this.actor, serveDecision);
      }
      return;
    }

    // 3. Trong pha bóng (RALLY)
    if (phase === "RALLY" && ball.inPlay) {
      // Xác định đối thủ để tính góc đánh
      const opponents = this.actor.sideSign > 0 
        ? [engine.opponent, engine.opponentPartner].filter(Boolean)
        : [engine.player, engine.playerPartner].filter(Boolean);

      // Cập nhật hướng chạy và vị trí đón bóng
      this.movement.updateTargetPosition(ball, this.difficulty, this.teamworkState);
      this.movement.step(dt, this.difficulty);

      // Kiểm tra thời điểm đánh bóng hợp lệ
      const isBallOnMySide = (this.actor.sideSign > 0 && ball.pos.z > 0) || (this.actor.sideSign < 0 && ball.pos.z < 0);
      const isBallMovingTowardsMe = (this.actor.sideSign > 0 && ball.vel.z > 0) || (this.actor.sideSign < 0 && ball.vel.z < 0);
      const distToBall = Math.hypot(this.actor.pos.x - ball.pos.x, this.actor.pos.z - ball.pos.z);
      const distZ = Math.abs(this.actor.pos.z - ball.pos.z);

      if (isBallOnMySide && isBallMovingTowardsMe && this.teamworkState.isPrimaryHitter) {
        // Tuân thủ luật Two-Bounce Rule: Đỡ giao bóng và cú thứ 3 phải đợi bóng nảy
        const mustBounce = (ball.rallyStrokeCount === 1 || ball.rallyStrokeCount === 2);
        if (mustBounce && ball.bounceCountOnCurrentSide === 0) {
          // BOT kiên nhẫn chờ bóng nảy, không được đánh volley sớm phạm quy
          return;
        }

        // Tuân thủ luật Kitchen (NVZ): Không được volley trong vùng bếp
        const inKitchen = Math.abs(this.actor.pos.z) <= 2.15;
        if (inKitchen && ball.bounceCountOnCurrentSide === 0) {
          // Đang trong bếp và bóng chưa nảy -> lùi ra hoặc chờ bóng nảy
          return;
        }

        // Khoảng cách tiếp xúc bóng lý tưởng: 0.7m - 1.6m theo trục Z, độ cao 0.55m - 2.2m
        if (distZ <= 1.45 && distToBall <= 2.2 && ball.pos.y >= 0.55 && ball.pos.y <= 2.45 && this.actor.swingCooldown <= 0) {
          this.executeRallyHit(engine, ball, opponents);
        }
      }
    } else {
      // Ngoài pha bóng: hồi vị trí về zone
      this.movement.updateTargetPosition(ball, this.difficulty, this.teamworkState);
      this.movement.step(dt, this.difficulty);
    }
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
        allowNetFault: shot.allowFault
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
