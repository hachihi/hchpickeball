// Nút loa ở góc phải trên (#btn-hud-sound): tắt/mở TOÀN BỘ âm thanh (nhạc nền + hiệu ứng).
// - Dùng đúng logic có sẵn của nút "Lyria" trong menu (#btn-audio-toggle) nên nhãn nhạc luôn khớp.
// - Nhớ lựa chọn lần sau (localStorage "hchMuted").
(function initHudSound() {
  const btn = document.getElementById("btn-hud-sound");
  if (!btn) return;
  const engine = () => window.__argonTennis;
  const audio = () => (engine() && engine().audioEngine) || null;
  const get = () => { try { return localStorage.getItem("hchMuted"); } catch (_) { return null; } };
  const set = v => { try { localStorage.setItem("hchMuted", v ? "1" : "0"); } catch (_) {} };

  const paint = muted => {
    btn.classList.toggle("is-muted", muted);
    btn.setAttribute("aria-pressed", muted ? "true" : "false");
    const label = muted ? "Đang tắt loa – bấm để mở" : "Đang mở loa – bấm để tắt";
    btn.title = label;
    btn.setAttribute("aria-label", label);
  };

  function toggle() {
    const ae = audio();
    const viaMenu = document.getElementById("btn-audio-toggle");
    if (viaMenu) viaMenu.click();           // cùng đường với nút trong menu -> engine + nhãn nhạc cập nhật
    else if (ae && typeof ae.toggleMute === "function") ae.toggleMute();
    const a2 = audio();
    if (a2 && typeof a2.muted === "boolean") { set(a2.muted); paint(a2.muted); }
  }
  btn.addEventListener("click", e => { e.stopPropagation(); toggle(); });

  // Đồng bộ biểu tượng (kể cả khi tắt/mở bằng nút khác) + khôi phục lựa chọn đã lưu một lần
  let restored = false;
  setInterval(() => {
    const ae = audio();
    if (!ae || typeof ae.muted !== "boolean") return;
    if (!restored) {
      restored = true;
      if (get() === "1" && !ae.muted) { toggle(); return; }
    }
    paint(ae.muted);
  }, 400);
})();
