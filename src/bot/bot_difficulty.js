// Pickleball BOT Difficulty Configurations
// Tham số điều chỉnh rõ ràng cho 3 cấp độ: Easy, Normal, Hard
// Không tạo cảm giác gian lận, mô phỏng phản xạ và độ chính xác của con người thật

export const BOT_DIFFICULTY_PRESETS = {
  easy: {
    id: "easy",
    name: "Người mới (Easy)",
    nameVi: "Dễ / Người mới",
    description: "Phản ứng chậm hơn, đánh bóng đơn giản, tỉ lệ đánh hỏng cao hơn khi bóng khó",
    reactionDelaySeconds: 0.28,    // Thời gian trễ trước khi nhận diện và bắt đầu chạy đến bóng
    movementSpeedMultiplier: 0.78,  // Tốc độ chạy vừa phải
    anticipationAccuracy: 0.72,    // Ước tính điểm rơi bóng có độ lệch nhẹ
    errorProbability: 0.18,        // Xác suất đánh hỏng (ra ngoài hoặc lưới) khi bị ép góc
    sweetSpotChance: 0.50,         // Xác suất vào điểm ngọt vợt
    dinkTendency: 0.12,            // Ít dink, chủ yếu trả bóng bổng hoặc drive
    smashTendency: 0.40,           // Đập bóng khi bóng bổng nhưng không quá dứt khoát
    spinIntensity: 8,              // Độ xoáy bóng cơ bản
    shotSpeedMaxKmH: 125,          // Tốc độ cú đánh tối đa
    cooldownBetweenShots: 0.32
  },
  normal: {
    id: "normal",
    name: "Vừa sức (Normal)",
    nameVi: "Vừa sức / CLB",
    description: "Di chuyển hợp lý, phản ứng tương đối nhanh, đánh bóng ổn định và biết phối hợp cơ bản",
    reactionDelaySeconds: 0.14,
    movementSpeedMultiplier: 0.94,
    anticipationAccuracy: 0.90,
    errorProbability: 0.06,
    sweetSpotChance: 0.80,
    dinkTendency: 0.35,            // Thường xuyên thả bóng vào Bếp (Kitchen) khi đối thủ lùi sâu
    smashTendency: 0.75,           // Đập bóng dứt khoát khi bóng cao hơn lưới
    spinIntensity: 15,
    shotSpeedMaxKmH: 160,
    cooldownBetweenShots: 0.20
  },
  hard: {
    id: "hard",
    name: "Cao thủ (Hard)",
    nameVi: "Chuyên nghiệp / Hard",
    description: "Phản ứng nhanh, dự đoán quỹ đạo sớm, biết chọn vị trí chiến thuật và phối hợp đồng đội xuất sắc",
    reactionDelaySeconds: 0.05,    // Phản xạ chớp nhoáng
    movementSpeedMultiplier: 1.10,  // Tốc độ di chuyển nhanh, bao quát sân tốt
    anticipationAccuracy: 0.98,    // Dự đoán chính xác vị trí bóng nảy
    errorProbability: 0.015,       // Hầu như không mắc lỗi sơ đẳng
    sweetSpotChance: 0.96,         // Cú đánh luôn chạm điểm ngọt tâm vợt
    dinkTendency: 0.55,            // Dink hiểm hóc sát mép lưới
    smashTendency: 0.95,           // Smash hiểm hóc vào góc trống
    spinIntensity: 22,             // Xoáy topspin / slice mạnh
    shotSpeedMaxKmH: 195,
    cooldownBetweenShots: 0.12
  }
};

export function getBotDifficultyConfig(level = "normal") {
  const key = String(level || "normal").toLowerCase();
  return BOT_DIFFICULTY_PRESETS[key] || BOT_DIFFICULTY_PRESETS.normal;
}
