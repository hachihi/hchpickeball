// Pickleball BOT Movement Controller
// Điều khiển vị trí, tốc độ di chuyển và phạm vi sân được phân công

import * as THREE from "three";

const COURT_CONSTANTS = {
  BASELINE_Z: 11.89,
  KITCHEN_LINE_Z: 2.15, // Vạch Bếp (NVZ) 7ft ~ 2.13-2.15m từ lưới
  SINGLES_MAX_X: 4.115,
  DOUBLES_MAX_X: 5.485
};

export class BotMovement {
  constructor(actor, slotConfig = {}) {
    this.actor = actor;
    this.slotConfig = slotConfig;
    this.sideSign = actor.sideSign || 1; // 1: Team A (Player side), -1: Team B (Opponent side)
    this.matchType = slotConfig.matchType || "doubles";
    this.assignedRole = slotConfig.slotId || "B1"; // A1, A2, B1, B2
    // Tốc độ gốc cố định (không phụ thuộc maxSpeed của actor) để cấp độ bot quyết định tốc độ chạy
    this.baseSpeed = 7.6;
    this.anticipationNoise = { x: 0, z: 0 };
    this.reactionTimer = 0;
    this.currentTandemState = "baseline"; // 'baseline', 'transition', 'kitchen'
  }

  setSlotConfig(cfg) {
    this.slotConfig = { ...this.slotConfig, ...cfg };
    if (cfg.matchType) this.matchType = cfg.matchType;
    if (cfg.slotId) this.assignedRole = cfg.slotId;
  }

  // Tính toán vùng sân được phân công cho BOT
  getAssignedZone() {
    const isTeamA = this.sideSign > 0;
    const baseZ = isTeamA ? COURT_CONSTANTS.BASELINE_Z : -COURT_CONSTANTS.BASELINE_Z;
    const kitchenZ = isTeamA ? COURT_CONSTANTS.KITCHEN_LINE_Z + 0.35 : -(COURT_CONSTANTS.KITCHEN_LINE_Z + 0.35);

    if (this.matchType === "singles") {
      // Đánh đơn: bao quát toàn bộ chiều ngang sân
      return {
        minX: -COURT_CONSTANTS.SINGLES_MAX_X + 0.45,
        maxX: COURT_CONSTANTS.SINGLES_MAX_X - 0.45,
        homeX: 0,
        baselineZ: baseZ,
        kitchenZ: kitchenZ
      };
    } else {
      // Đánh đôi: phân chia nửa sân trái (Left) và nửa sân phải (Right)
      const isLeftPlayer = (this.assignedRole === "A2" || this.assignedRole === "B1");
      const minX = isLeftPlayer ? -COURT_CONSTANTS.DOUBLES_MAX_X + 0.4 : -0.2;
      const maxX = isLeftPlayer ? 0.2 : COURT_CONSTANTS.DOUBLES_MAX_X - 0.4;
      const homeX = isLeftPlayer ? -2.2 : 2.2;

      return {
        minX,
        maxX,
        homeX,
        baselineZ: baseZ,
        kitchenZ: kitchenZ
      };
    }
  }

  // Cập nhật vị trí di chuyển BOT theo diễn biến trận
  updateTargetPosition(ball, diffConfig, teamworkState) {
    const zone = this.getAssignedZone();
    const isBallOnMySide = (this.sideSign > 0 && ball.pos.z > 0) || (this.sideSign < 0 && ball.pos.z < 0);
    const isMyShot = teamworkState ? teamworkState.isPrimaryHitter : isBallOnMySide;

    if (!ball.inPlay) {
      // Khi bóng không trong cuộc, đứng ở vị trí sẵn sàng chuẩn bị giao bóng hoặc đỡ bóng
      const readyZ = THREE.MathUtils.clamp(zone.baselineZ - this.sideSign * 0.15, -13.5, 13.5);
      this.actor.targetPos.set(zone.homeX, 0, readyZ);
      return;
    }

    if (isMyShot && isBallOnMySide) {
      // BOT được phân công đón bóng
      const rawLanding = ball.targetLanding || ball.pos;
      const targetLanding = { x: rawLanding.x + this.anticipationNoise.x, z: rawLanding.z + this.anticipationNoise.z };
      const marginZ = this.sideSign * (ball.vel.length() > 14 ? 1.6 : 1.1);
      let interceptZ = targetLanding.z + marginZ;

      // Quy tắc bảo vệ: Không để BOT đứng trong vùng Bếp nếu bóng chưa nảy (Tránh lỗi NVZ)
      if (this.sideSign > 0) {
        if (interceptZ < COURT_CONSTANTS.KITCHEN_LINE_Z + 0.12 && ball.bounceCountOnCurrentSide === 0) {
          interceptZ = COURT_CONSTANTS.KITCHEN_LINE_Z + 0.25;
        }
      } else {
        if (interceptZ > -COURT_CONSTANTS.KITCHEN_LINE_Z - 0.12 && ball.bounceCountOnCurrentSide === 0) {
          interceptZ = -COURT_CONSTANTS.KITCHEN_LINE_Z - 0.25;
        }
      }

      // Giới hạn trong vùng sân hợp lệ
      const targetX = THREE.MathUtils.clamp(targetLanding.x, zone.minX, zone.maxX);
      const targetZ = THREE.MathUtils.clamp(interceptZ, this.sideSign > 0 ? 2.3 : -13.2, this.sideSign > 0 ? 13.2 : -2.3);

      this.actor.targetPos.set(targetX, 0, targetZ);
    } else {
      // Khi đồng đội đang đón bóng hoặc bóng đang ở sân đối phương:
      // Bọc lót chiến thuật (Tandem Pickleball positioning)
      if (this.matchType === "doubles") {
        // Nếu đối phương đang đánh bóng sâu, lùi nhẹ về baseline
        // Nếu bóng ngắn, dâng lên sát vạch Bếp để ép lưới
        const oppNearKitchen = (this.sideSign > 0 && ball.pos.z < -3.5) || (this.sideSign < 0 && ball.pos.z > 3.5);
        const shiftZ = oppNearKitchen ? zone.kitchenZ : zone.baselineZ * 0.75;
        const coverX = THREE.MathUtils.clamp(zone.homeX + (ball.pos.x * 0.2), zone.minX, zone.maxX);
        this.actor.targetPos.set(coverX, 0, shiftZ);
      } else {
        // Đánh đơn: hồi vị trí về tâm sân baseline (Recovery to center)
        const recoverX = THREE.MathUtils.clamp(ball.pos.x * 0.25, -1.5, 1.5);
        const recoverZ = zone.baselineZ - this.sideSign * 0.2;
        this.actor.targetPos.set(recoverX, 0, recoverZ);
      }
    }
  }

  // Bước di chuyển vật lý từng frame
  step(dt, diffConfig) {
    const speed = this.baseSpeed * (diffConfig.movementSpeedMultiplier || 1.0);
    const toTarget = new THREE.Vector3().subVectors(this.actor.targetPos, this.actor.pos);
    toTarget.y = 0;
    const dist = toTarget.length();

    if (dist > 0.05) {
      toTarget.normalize();
      const stepDist = Math.min(dist, speed * dt);
      this.actor.pos.addScaledVector(toTarget, stepDist);
      this.actor.vel.copy(toTarget).multiplyScalar(speed);
      this.actor.stridePhase = (this.actor.stridePhase || 0) + dt * speed * 1.5;
    } else {
      this.actor.vel.set(0, 0, 0);
    }

    if (this.actor.root) {
      this.actor.root.position.copy(this.actor.pos);
    }
    if (this.actor.shadowBlob) {
      this.actor.shadowBlob.position.set(this.actor.pos.x, 0.018, this.actor.pos.z);
    }
  }
}
