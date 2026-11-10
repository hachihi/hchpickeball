// Tối ưu UI/UX cho điện thoại: nhận diện cảm ứng, xoay ngang, toàn màn hình,
// menu gọn, giữ màn hình sáng, tự tạm dừng khi rời tab.
(function initMobileUX() {
  const root = document.documentElement;
  const mq = q => !!(window.matchMedia && window.matchMedia(q).matches);
  const isTouch = mq("(pointer: coarse)") || "ontouchstart" in window || (navigator.maxTouchPoints || 0) > 1;
  const isIOS = /iPhone|iPod|iPad/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const applyOrientation = () => {
    const portrait = window.innerHeight > window.innerWidth;
    root.classList.toggle("portrait", portrait);
    root.classList.toggle("landscape", !portrait);
  };
  applyOrientation();
  window.addEventListener("resize", applyOrientation);
  window.addEventListener("orientationchange", () => setTimeout(applyOrientation, 250));

  if (!isTouch) return;
  root.classList.add("is-touch");

  const safeGet = k => { try { return sessionStorage.getItem(k); } catch (_) { return null; } };
  const safeSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch (_) {} };
  const lsGet = k => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };

  if (safeGet("hchRotateDismissed") === "1") root.classList.add("rotate-dismissed");

  const canFS = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  const inFS = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

  async function enterFullscreen() {
    try {
      if (canFS && !inFS()) {
        if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: "hide" });
        else root.webkitRequestFullscreen();
      }
      if (screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock("landscape").catch(() => {});
      }
    } catch (_) {}
  }
  function exitFullscreen() {
    try {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (_) {}
  }

  // ---------- Nút tiện ích: Menu + Toàn màn hình ----------
  const tools = document.createElement("div");
  tools.id = "mx-tools";
  tools.innerHTML = `
    <button id="mx-menu" type="button" aria-label="Menu" title="Menu">☰</button>
    <button id="mx-fs" type="button" aria-label="Toàn màn hình" title="Toàn màn hình" ${canFS ? "" : "hidden"}>⛶</button>`;
  document.body.appendChild(tools);

  const menuBtn = tools.querySelector("#mx-menu");
  const fsBtn = tools.querySelector("#mx-fs");
  const setMenu = open => {
    root.classList.toggle("menu-open", open);
    menuBtn.textContent = open ? "✕" : "☰";
  };
  menuBtn.addEventListener("click", e => { e.stopPropagation(); setMenu(!root.classList.contains("menu-open")); });
  fsBtn.addEventListener("click", e => { e.stopPropagation(); inFS() ? exitFullscreen() : enterFullscreen(); });

  // Bấm ra ngoài / bấm nút trong menu -> đóng menu
  document.addEventListener("pointerdown", e => {
    if (!root.classList.contains("menu-open")) return;
    if (e.target.closest && (e.target.closest("#mx-tools") || e.target.closest("#bottom-left-dock"))) return;
    setMenu(false);
  }, true);
  document.addEventListener("click", e => {
    if (!root.classList.contains("menu-open")) return;
    const b = e.target.closest && e.target.closest("#bottom-left-dock .hud-mini-btn");
    if (b && b.id !== "btn-audio-toggle" && b.id !== "btn-camera-cycle") setMenu(false);
  }, true);

  // ---------- Nhắc xoay ngang ----------
  const ro = document.createElement("div");
  ro.id = "rotate-overlay";
  ro.innerHTML = `
    <div class="ro-icon">📱</div>
    <h3>Xoay ngang điện thoại</h3>
    <p>Chơi pickleball ở chế độ ngang sẽ thấy rõ sân và dễ điều khiển hơn.${isIOS ? "<br><br>iPhone: bấm <b>Chia sẻ</b> → <b>Thêm vào MH chính</b> để chơi toàn màn hình." : ""}</p>
    ${canFS ? '<button id="ro-fs" type="button">⛶ Toàn màn hình &amp; xoay ngang</button>' : ""}
    <button id="ro-skip" type="button" class="ghost">Vẫn chơi màn dọc</button>`;
  document.body.appendChild(ro);
  const roFs = ro.querySelector("#ro-fs");
  roFs && roFs.addEventListener("click", () => enterFullscreen());
  ro.querySelector("#ro-skip").addEventListener("click", () => {
    root.classList.add("rotate-dismissed");
    safeSet("hchRotateDismissed", "1");
  });

  // ---------- Toast hướng dẫn lần đầu ----------
  const toast = document.createElement("div");
  toast.id = "mx-toast";
  toast.innerHTML = "<b>Chạm nửa trái</b>: chạy &amp; ngắm trái/phải • nút <b>ĐÁNH</b>: tự chọn đập/dink/drive • <b>CẮT • ĐẬP • DINK • LOB</b>: chọn tay";
  document.body.appendChild(toast);
  let toastShown = lsGet("hchTouchTipSeen") === "1";
  const showToast = () => {
    toastShown = true;
    lsSet("hchTouchTipSeen", "1");
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 6500);
  };

  // ---------- Hiện/ẩn nút cảm ứng theo trạng thái ----------
  let wasInMatch = false;
  const modalOpen = () => {
    const list = document.querySelectorAll(".wii-modal-backdrop");
    for (const el of list) {
      if (!el.classList.contains("hidden") && getComputedStyle(el).display !== "none") return true;
    }
    return false;
  };
  setInterval(() => {
    const open = modalOpen();
    const pad = document.getElementById("easy-controls-root");
    if (pad) pad.classList.toggle("pad-hidden", open);
    root.classList.toggle("in-match", !open);
    if (open) setMenu(false);
    if (!open && !wasInMatch && !toastShown && pad) setTimeout(showToast, 600);
    wasInMatch = !open;
  }, 300);

  // ---------- Tự vào toàn màn hình khi bắt đầu trận (Android) ----------
  if (canFS && !isIOS) {
    document.addEventListener("click", e => {
      const t = e.target.closest && e.target.closest("#btn-start-match, #btn-choice-solo, #btn-tank-start-match, #btn-about-play-court");
      if (t) enterFullscreen();
    }, true);
  }

  // ---------- Giữ màn hình sáng ----------
  let wakeLock = null;
  const requestWake = async () => {
    try {
      if ("wakeLock" in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => { wakeLock = null; });
      }
    } catch (_) {}
  };
  document.addEventListener("pointerdown", requestWake, { once: true, passive: true });

  // ---------- Tự tạm dừng khi rời tab / khóa máy ----------
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      const eng = window.__argonTennis;
      if (eng && !eng.isPaused && ["RALLY", "SERVE_STANCE", "SERVE_TOSS"].includes(eng.phase) && typeof eng.pauseMatch === "function") {
        eng.pauseMatch();
      }
    } else {
      requestWake();
    }
  });
})();
