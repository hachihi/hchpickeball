// Pickleball BOT Decision & Shot Selection Engine
// Quyết định chiến thuật đánh bóng, tuân thủ luật Kitchen (NVZ) & Two-Bounce

import * as THREE from "three";

export class BotDecision {
  constructor(actor, difficultyConfig) {
    this.actor = actor;
    this.diffConfig = difficultyConfig;
    this.sideSign = actor.sideSign || 1;
  }

  setDifficulty(diffConfig) {
    this.diffConfig = diffConfig;
  }

  // Quyết định giao bóng (Serve)
  evaluateServe() {
    // BOT chọn góc giao bóng chéo sân theo luật Pickleball (Deuce / Ad court)
    const isHard = this.diffConfig.id === "hard";
    const speed = isHard ? 1.42 : this.diffConfig.id === "normal" ? 1.25 : 1.05;
    const dirX = (Math.random() - 0.5) * 0.45;
    return {
      timing: isHard ? "PERFECT" : Math.random() < 0.75 ? "GOOD" : "EARLY",
      speed,
      dirX,
      shotType: isHard && Math.random() < 0.4 ? "POWER" : "TOPSPIN"
    };
  }

  // Quyết định cú đánh trong pha bóng (Rally)
  evaluateRallyShot(ball, opponents = []) {
    const ballPos = ball.pos;
    const isHighBall = ballPos.y > 1.62;
    const isNearNet = Math.abs(ballPos.z) < 4.2;
    const strokeCount = ball.rallyStrokeCount || 0;

    // Phân tích vị trí đối thủ để tìm góc trống
    let openCornerX = 0;
    if (opponents.length > 0) {
      const avgOppX = opponents.reduce((sum, opp) => sum + opp.pos.x, 0) / opponents.length;
      openCornerX = avgOppX >= 0 ? -2.4 : 2.4;
    } else {
      openCornerX = (Math.random() < 0.5 ? -1 : 1) * 2.2;
    }

    let selectedShot = "TOPSPIN";
    let targetZ = -this.sideSign * (7.5 + Math.random() * 2.8);
    let targetX = openCornerX + (Math.random() - 0.5) * 0.8;
    let flightDuration = 0.85;
    let topspin = 14;
    let sidespin = 0;

    // Cú đánh thứ 3 (3rd Shot Drop) - Chiến thuật kinh điển trong Pickleball
    if (strokeCount === 2) {
      if (Math.random() < (this.diffConfig.dinkTendency + 0.35)) {
        selectedShot = "SLICE"; // Drop shot rơi êm vào bếp đối thủ
        targetZ = -this.sideSign * (1.35 + Math.random() * 0.65);
        flightDuration = 0.95;
        topspin = -6;
      }
    } 
    // Smash khi bóng đối phương lốp cao sát lưới
    else if (isHighBall && isNearNet && Math.random() < this.diffConfig.smashTendency) {
      selectedShot = "FLAT"; // Smash dứt điểm
      targetZ = -this.sideSign * (6.0 + Math.random() * 3.5);
      flightDuration = 0.56;
      topspin = 24;
      targetX = openCornerX * 1.15;
    } 
    // Dink đấu bếp (Kitchen battle) khi cả hai bên đều ở sát vạch 7ft
    else if (isNearNet && Math.random() < this.diffConfig.dinkTendency) {
      selectedShot = "DINK";
      targetZ = -this.sideSign * (1.15 + Math.random() * 0.8);
      flightDuration = 0.92;
      topspin = 4;
      targetX = THREE.MathUtils.clamp(targetX * 0.65, -3.2, 3.2);
    } 
    // Lob phòng thủ khi bị ép góc
    else if (Math.abs(this.actor.pos.x) > 3.2 && Math.random() < 0.22) {
      selectedShot = "LOB";
      targetZ = -this.sideSign * (9.5 + Math.random() * 2.0);
      flightDuration = 1.35;
      topspin = 4;
    }

    // Mô phỏng sai số theo cấp độ khó (Error probability)
    let allowFault = false;
    if (Math.random() < this.diffConfig.errorProbability) {
      // Đánh hỏng: hoặc ra ngoài biên hoặc đập lưới
      if (Math.random() < 0.5) {
        targetX = (targetX >= 0 ? 1 : -1) * (4.8 + Math.random() * 0.6); // Ra ngoài biên
      } else {
        allowFault = true; // Lỗi chạm lưới
      }
    }

    // Xác định tay thuận (forehand) hay tay nghịch (backhand)
    const isBackhand = (this.actor.pos.x > ballPos.x && this.sideSign > 0) || (this.actor.pos.x < ballPos.x && this.sideSign < 0);
    const swingSide = isHighBall ? "overhead" : isBackhand ? "backhand" : "forehand";

    return {
      shotType: selectedShot,
      targetX: THREE.MathUtils.clamp(targetX, -4.5, 4.5),
      targetZ,
      flightDuration,
      topspin,
      sidespin,
      allowFault,
      swingSide,
      timingQuality: Math.random() < this.diffConfig.sweetSpotChance ? "PERFECT" : "GOOD",
      speedKmh: Math.round(
        selectedShot === "FLAT" ? this.diffConfig.shotSpeedMaxKmH : 
        selectedShot === "DINK" ? 65 + Math.random() * 15 : 
        this.diffConfig.shotSpeedMaxKmH * (0.7 + Math.random() * 0.25)
      )
    };
  }
}
