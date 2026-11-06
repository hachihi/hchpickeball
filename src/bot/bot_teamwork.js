// Pickleball BOT Teamwork Coordinator
// Quản lý phối hợp giữa hai người chơi cùng đội trong thể thức Đánh Đôi (Doubles)

export class BotTeamwork {
  static evaluatePairAssignment(actor1, actor2, ball, matchType = "doubles") {
    if (matchType !== "doubles" || !actor2) {
      return {
        actor1: { isPrimaryHitter: true, role: "solo" },
        actor2: { isPrimaryHitter: false, role: "inactive" }
      };
    }

    // Tính khoảng cách từ 2 actor tới điểm rơi dự kiến của bóng
    const target = ball.targetLanding || ball.pos;
    const dist1 = Math.hypot(actor1.pos.x - target.x, actor1.pos.z - target.z);
    const dist2 = Math.hypot(actor2.pos.x - target.x, actor2.pos.z - target.z);

    // Ưu tiên tay thuận ở giữa sân (Forehand in the middle pickleball strategy)
    // Nếu actor1 ở bên trái (x < 0) và cầm vợt tay phải, cú đánh giữa sân là Forehand
    let bias1 = 0;
    if (actor1.pos.x < 0 && target.x > -0.5 && target.x < 0.5) bias1 -= 0.45;
    if (actor2.pos.x < 0 && target.x > -0.5 && target.x < 0.5) bias1 += 0.45;

    const actor1IsCloser = (dist1 + bias1) <= dist2;

    return {
      actor1: {
        isPrimaryHitter: actor1IsCloser,
        role: actor1IsCloser ? "hitter" : "cover",
        partnerDistance: dist1
      },
      actor2: {
        isPrimaryHitter: !actor1IsCloser,
        role: !actor1IsCloser ? "hitter" : "cover",
        partnerDistance: dist2
      }
    };
  }

  // Đồng bộ trạng thái di chuyển theo cặp (Tandem)
  static getTandemTargetZ(primaryActorTargetZ, sideSign) {
    // Trong Pickleball, hai đồng đội luôn duy trì cự ly song song, cùng lên lưới hoặc cùng lùi
    return primaryActorTargetZ;
  }
}
