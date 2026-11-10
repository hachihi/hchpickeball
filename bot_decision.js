// Pickleball BOT Decision & Shot Selection Engine
// Quyết định chiến thuật đánh bóng, tuân thủ luật Kitchen (NVZ) & Two-Bounce.
// Chất lượng quyết định phụ thuộc cấp độ bot (xem bot_difficulty.js).

import * as THREE from "three";

const rand = (a, b) => a + Math.random() * (b - a);
const jitter = (amp) => (Math.random() * 2 - 1) * amp;

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
    const d = this.diffConfig;
    const isHard = d.id === "hard";
    return {
      timing: isHard ? "PERFECT" : Math.random() < d.sweetSpotChance ? "GOOD" : "EARLY",
      speed: d.serveSpeed || 1.25,
      dirX: jitter(d.id === "easy" ? 0.9 : d.id === "normal" ? 0.5 : 0.35),
      shotType: isHard && Math.random() < 0.4 ? "POWER" : "TOPSPIN"
    };
  }

  // Quyết định cú đánh trong pha bóng (Rally)
  evaluateRallyShot(ball, opponents = []) {
    const d = this.diffConfig;
    const ballPos = ball.pos;
    const isHighBall = ballPos.y > 1.62;
    const isNearNet = Math.abs(ballPos.z) < 4.2;
    const strokeCount = ball.rallyStrokeCount || 0;
    const s = this.sideSign;

    // Phân tích vị trí đối thủ
    const hasOpp = opponents.length > 0;
    const avgOppX = hasOpp ? opponents.reduce((sum, o) => sum + o.pos.x, 0) / opponents.length : 0;
    const avgOppDepth = hasOpp ? opponents.reduce((sum, o) => sum + Math.abs(o.pos.z), 0) / opponents.length : 7;
    const oppsAtNet = hasOpp && opponents.every((o) => Math.abs(o.pos.z) < 4.6);
    const oppsDeep = hasOpp && avgOppDepth > 8.0;

    // Góc trống: bot cao cấp nhắm đúng chỗ trống, bot yếu đánh ngẫu nhiên
    let openCornerX;
    if (Math.random() < d.placementSkill && hasOpp) {
      openCornerX = avgOppX >= 0 ? -2.4 : 2.4;
    } else {
      openCornerX = (Math.random() < 0.5 ? -1 : 1) * rand(0.6, 2.6);
    }

    let selectedShot = "TOPSPIN";
    let targetZ = -s * rand(7.8, 10.4);
    let targetX = openCornerX * 0.85 + jitter(0.3);
    let flightDuration = 0.72;
    let topspin = 18;
    let sidespin = 0;

    // Bot thông minh: đối thủ dâng lưới thì lob qua đầu, đối thủ lùi sâu thì dink kéo lên
    const lobChance = oppsAtNet ? d.lobTendency : d.lobTendency * 0.25;
    const dinkChance = d.smart && oppsDeep ? Math.min(0.9, d.dinkTendency * 1.7) : d.dinkTendency;

    if (strokeCount === 2) {
      // Cú thứ 3: drop shot mềm hoặc drive sâu
      if (Math.random() < dinkChance) {
        selectedShot = "SLICE";
        targetZ = -s * rand(2.6, 3.8);
        flightDuration = 1.05;
        topspin = -10;
        sidespin = (Math.random() < 0.5 ? -1 : 1) * 6;
      } else {
        selectedShot = "TOPSPIN";
        targetZ = -s * rand(8.2, 10.4);
      }
    } else if (isHighBall && (isNearNet || Math.abs(this.actor.pos.z) < 7.0) && Math.random() < d.smashTendency) {
      selectedShot = "FLAT"; // Smash
      targetZ = -s * rand(7.5, 10.5);
      flightDuration = 0.50;
      topspin = 22;
      targetX = openCornerX * 0.95;
    } else if (Math.random() < lobChance && oppsAtNet) {
      selectedShot = "LOB"; // Lob qua đầu đối thủ đang áp lưới
      targetZ = -s * rand(9.6, 10.9);
      flightDuration = 1.5;
      topspin = 4;
    } else if (isNearNet && Math.random() < dinkChance) {
      selectedShot = "DINK";
      targetZ = -s * rand(1.6, 2.4);
      flightDuration = 0.95;
      topspin = 4;
      targetX = THREE.MathUtils.clamp(targetX * 0.6, -2.6, 2.6);
    } else if (Math.abs(this.actor.pos.x) > 2.9 && Math.random() < 0.20) {
      selectedShot = "LOB"; // Phòng thủ khi bị ép biên
      targetZ = -s * rand(9.5, 11.0);
      flightDuration = 1.52;
      topspin = 4;
    } else if (Math.random() < 0.18) {
      selectedShot = "SLICE";
      targetZ = -s * rand(5.5, 8.0);
      flightDuration = 1.02;
      topspin = -12;
      sidespin = (Math.random() < 0.5 ? -1 : 1) * 8;
    }

    // Bot yếu bay chậm hơn (dễ đỡ), bot mạnh bay nhanh hơn
    flightDuration *= d.flightScale || 1;

    // Sai số ngắm theo cấp độ
    targetX += jitter(d.aimNoise);
    targetZ += -s * jitter(d.aimNoise * 0.9);

    // Lỗi tự đánh hỏng theo cấp độ: ra biên hoặc vào lưới
    let allowFault = false;
    if (Math.random() < d.errorProbability) {
      if (Math.random() < 0.65) {
        targetX = (targetX >= 0 ? 1 : -1) * rand(4.55, 5.2);
      } else {
        allowFault = true;
      }
    }

    // Nếu không cố ý hỏng thì giữ bóng trong sân đối phương
    if (!allowFault && Math.abs(targetX) <= 4.2) {
      targetX = THREE.MathUtils.clamp(targetX, -3.6, 3.6);
      targetZ = s > 0
        ? THREE.MathUtils.clamp(targetZ, -10.8, -1.6)
        : THREE.MathUtils.clamp(targetZ, 1.6, 10.8);
    }

    const isBackhand = (this.actor.pos.x > ballPos.x && s > 0) || (this.actor.pos.x < ballPos.x && s < 0);
    const swingSide = isHighBall ? "overhead" : isBackhand ? "backhand" : "forehand";

    return {
      shotType: selectedShot,
      targetX: THREE.MathUtils.clamp(targetX, -5.2, 5.2),
      targetZ,
      flightDuration,
      topspin,
      sidespin,
      allowFault,
      swingSide,
      timingQuality: Math.random() < d.sweetSpotChance ? "PERFECT" : "GOOD",
      speedKmh: Math.round(
        selectedShot === "FLAT" ? d.shotSpeedMaxKmH :
        selectedShot === "DINK" ? 65 + Math.random() * 15 :
        d.shotSpeedMaxKmH * (0.7 + Math.random() * 0.25)
      )
    };
  }
}
