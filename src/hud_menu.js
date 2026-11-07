// Menu trận đấu (#hud-menu-sheet) + xác nhận thao tác nguy hiểm trong màn Pause.
// - Nút #btn-hud-menu (desktop) bật/tắt class html.menu-open (class này mobile_ux.js cũng dùng cho nút ☰ cảm ứng).
// - Esc đóng menu trước (không làm game pause); bấm ra ngoài đóng; trả focus về nút đã mở.
(function initHudMenu() {
  const root = document.documentElement;
  const btn = document.getElementById("btn-hud-menu");
  const sheet = document.getElementById("hud-menu-sheet");
  if (!btn || !sheet) return;
  const isOpen = () => root.classList.contains("menu-open");
  const touch = () => root.classList.contains("is-touch");

  function setOpen(open, { restoreFocus = false } = {}) {
    root.classList.toggle("menu-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      const first = sheet.querySelector("button:not(.hidden):not([hidden])");
      first && first.focus({ preventScroll: true });
    } else if (restoreFocus) {
      btn.focus({ preventScroll: true });
    }
  }

  btn.addEventListener("click", e => { e.stopPropagation(); setOpen(!isOpen()); });

  // Esc: đóng menu trước, không để engine bắt Esc để pause
  window.addEventListener("keydown", e => {
    if (e.code === "Escape" && isOpen()) {
      e.stopImmediatePropagation();
      e.preventDefault();
      setOpen(false, { restoreFocus: true });
    }
  }, true);

  // Bấm ra ngoài -> đóng (mobile_ux.js tự xử lý phía cảm ứng)
  document.addEventListener("pointerdown", e => {
    if (!isOpen() || touch()) return;
    if (e.target.closest && (e.target.closest("#hud-menu-sheet") || e.target.closest("#btn-hud-menu"))) return;
    setOpen(false);
  }, true);

  // Chọn một mục -> đóng (trừ âm thanh / góc camera: người chơi hay bấm liên tiếp)
  document.addEventListener("click", e => {
    if (!isOpen() || touch()) return;
    const b = e.target.closest && e.target.closest("#hud-menu-sheet .hud-mini-btn");
    if (b && b.id !== "btn-audio-toggle" && b.id !== "btn-camera-cycle" && b.id !== "btn-lang-toggle") setOpen(false);
  }, true);

  // Menu tự đóng khi có modal mở (pause, luật chơi, cài đặt...)
  setInterval(() => {
    if (!isOpen() || touch()) return;
    for (const el of document.querySelectorAll(".wii-modal-backdrop")) {
      if (!el.classList.contains("hidden") && getComputedStyle(el).display !== "none") { setOpen(false); break; }
    }
  }, 400);

  // ---- Pause: bấm lần 1 chỉ "lên đạn", bấm lần 2 trong 3 giây mới thực hiện (Hủy phòng / Thoát) ----
  const DANGER = ["btn-pause-cancel-room", "btn-pause-main-menu"];
  const armed = new Map();
  const reset = el => {
    el.classList.remove("armed");
    const s = el.querySelector("small");
    if (s && s.dataset.orig !== undefined) { s.textContent = s.dataset.orig; delete s.dataset.orig; }
    clearTimeout(armed.get(el)); armed.delete(el);
  };
  document.addEventListener("click", e => {
    const el = e.target.closest && e.target.closest(DANGER.map(i => "#" + i).join(","));
    if (!el) return;
    if (armed.has(el)) { reset(el); return; } // lần 2: cho đi tiếp tới handler gốc
    e.stopImmediatePropagation();
    e.preventDefault();
    el.classList.add("armed");
    const s = el.querySelector("small");
    if (s) { s.dataset.orig = s.textContent; s.textContent = "Bấm lần nữa để xác nhận"; }
    armed.set(el, setTimeout(() => reset(el), 3000));
  }, true);
})();
