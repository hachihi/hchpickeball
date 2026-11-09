// Khi đang thi đấu: làm mờ các nút đổi sân / ánh sáng (hud_ui.js + game_engine.js chặn thật sự;
// file này chỉ lo phần hiển thị: class html.match-active + thuộc tính aria-disabled).
(function initMatchLock() {
  const LOCK_PHASES = ["SERVE_STANCE", "SERVE_TOSS", "RALLY", "POINT_OVER", "REPLAY", "MATCH_OVER"];
  const root = document.documentElement;
  let last = null;
  setInterval(() => {
    const e = window.__argonTennis;
    const locked = !!(e && LOCK_PHASES.includes(e.phase));
    if (locked === last) return;
    last = locked;
    root.classList.toggle("match-active", locked);
    document.querySelectorAll(".scenery-card, .lighting-card, .scenery-hud-btn").forEach(el => {
      if (locked) {
        if (el.dataset.origTitle === undefined) el.dataset.origTitle = el.title || "";
        el.setAttribute("aria-disabled", "true");
        el.title = "Đang thi đấu – không đổi được";
      } else {
        el.removeAttribute("aria-disabled");
        if (el.dataset.origTitle !== undefined) { el.title = el.dataset.origTitle; delete el.dataset.origTitle; }
      }
    });
  }, 300);
})();
