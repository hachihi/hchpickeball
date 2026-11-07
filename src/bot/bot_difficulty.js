// Pickleball BOT Difficulty Configurations
// 3 cấp độ bot hiển thị cho người chơi trong phòng:
//   Cấp 1 (easy)   - Đánh hơi dở : chậm, phản xạ trễ, hay đánh hỏng, bóng yếu, đặt bóng lung tung
//   Cấp 2 (normal) - Đánh hay    : ổn định, biết dink / smash, đặt bóng khá tốt
//   Cấp 3 (hard)   - Rất thông minh: nhanh, gần như không lỗi, đọc vị trí đối thủ, đánh vào góc trống / lob / dink hiểm

export const BOT_LEVELS = {
  1: "easy",
  2: "normal",
  3: "hard"
};

export const BOT_DIFFICULTY_PRESETS = {
  easy: {
    id: "easy",
    level: 1,
    name: "Cấp 1 - Đánh dở",
    nameVi: "Cấp 1 [Dở]",
    description: "Di chuyển chậm, phản xạ trễ, hay đánh ra ngoài hoặc vào lưới, bóng yếu và đặt không chính xác",
    reactionDelaySeconds: 0.40,     // trễ sau khi đối thủ đánh mới bắt đầu chạy
    movementSpeedMultiplier: 0.62,  // chạy chậm
    anticipationAccuracy: 0.45,     // đoán sai điểm rơi khá nhiều
    errorProbability: 0.30,         // 30% đánh hỏng (ra biên / vào lưới)
    sweetSpotChance: 0.30,
    dinkTendency: 0.08,
    smashTendency: 0.20,
    placementSkill: 0.10,           // gần như đánh ngẫu nhiên, không nhắm góc trống
    aimNoise: 1.1,                  // sai số điểm rơi (m)
    flightScale: 1.28,              // bóng bay chậm / dễ đỡ
    lobTendency: 0.0,
    spinIntensity: 6,
    shotSpeedMaxKmH: 95,
    cooldownBetweenShots: 0.45,
    reachDistance: 1.95,            // tầm với của vợt
    reachDepth: 1.25,
    serveSpeed: 0.95,
    serveContactY: 1.6              // tung bóng hơi non tay
  },
  normal: {
    id: "normal",
    level: 2,
    name: "Cấp 2 - Đánh hay",
    nameVi: "Cấp 2 [Hay]",
    description: "Rally bền bỉ, ít lỗi, biết dink vào bếp, smash khi bóng bổng và đặt bóng khá tốt",
    reactionDelaySeconds: 0.13,
    movementSpeedMultiplier: 0.98,
    anticipationAccuracy: 0.85,
    errorProbability: 0.06,
    sweetSpotChance: 0.78,
    dinkTendency: 0.35,
    smashTendency: 0.70,
    placementSkill: 0.65,
    aimNoise: 0.40,
    flightScale: 1.0,
    lobTendency: 0.10,
    spinIntensity: 16,
    shotSpeedMaxKmH: 150,
    cooldownBetweenShots: 0.20,
    reachDistance: 2.55,
    reachDepth: 1.65,
    serveSpeed: 1.25,
    serveContactY: 2.1
  },
  hard: {
    id: "hard",
    level: 3,
    name: "Cấp 3 - Rất thông minh",
    nameVi: "Cấp 3 [Cao thủ]",
    description: "Rất nhanh, gần như không lỗi, đọc vị trí đối thủ: đánh vào góc trống, lob qua đầu người lên lưới, dink hiểm sát lưới, smash dứt điểm",
    reactionDelaySeconds: 0.03,
    movementSpeedMultiplier: 1.20,
    anticipationAccuracy: 0.98,
    errorProbability: 0.008,
    sweetSpotChance: 0.97,
    dinkTendency: 0.50,
    smashTendency: 0.95,
    placementSkill: 0.97,
    aimNoise: 0.08,
    flightScale: 0.90,
    lobTendency: 0.38,
    spinIntensity: 24,
    shotSpeedMaxKmH: 198,
    cooldownBetweenShots: 0.10,
    reachDistance: 2.9,
    reachDepth: 1.9,
    serveSpeed: 1.42,
    serveContactY: 2.1,
    smart: true
  }
};

// Chấp nhận khoá mới (easy/normal/hard), số cấp (1/2/3, "level2"...) và khoá của màn hình chọn độ khó ngoài sảnh:
//   casual (Dễ) -> cấp 1, pro (Vừa) -> cấp 2, 1v1 (Khó) / turbo -> cấp 3
const ALIASES = {
  "1": "easy", level1: "easy", lv1: "easy", easy: "easy", casual: "easy",
  "2": "normal", level2: "normal", lv2: "normal", normal: "normal", pro: "normal",
  "3": "hard", level3: "hard", lv3: "hard", hard: "hard", "1v1": "hard", turbo: "hard"
};

export function normalizeBotLevel(level = "normal") {
  const key = String(level ?? "normal").toLowerCase().replace(/[\s_-]/g, "");
  return ALIASES[key] || "normal";
}

export function getBotDifficultyConfig(level = "normal") {
  return BOT_DIFFICULTY_PRESETS[normalizeBotLevel(level)];
}
