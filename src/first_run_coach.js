// Hướng dẫn nhanh lần đầu vào sân (3 bước). Tự đóng gói: không phụ thuộc engine.
// - Chỉ hiện 1 lần / trình duyệt (localStorage "hachihi_coach_v1"). Mở lại: Menu -> "Hướng dẫn nhanh"
//   hoặc console: hachihiShowCoach().  Tắt hẳn khi test: thêm ?nocoach vào URL.
// - Nội dung theo thiết bị (cảm ứng / bàn phím) và theo ngôn ngữ đang chọn (VI / EN).
(function initFirstRunCoach() {
  const KEY = "hachihi_coach_v1";
  const root = document.documentElement;
  const params = new URLSearchParams(location.search);
  if (params.has("nocoach")) return;

  const store = {
    get() { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } },
    set() { try { localStorage.setItem(KEY, "1"); } catch {} }
  };
  const isTouch = () => root.classList.contains("is-touch") ||
    (window.matchMedia && matchMedia("(pointer: coarse)").matches);
  const lang = () => {
    const t = (document.getElementById("btn-start-match-text") || {}).textContent || "";
    return /play|start/i.test(t) ? "en" : "vi";
  };

  const TEXT = {
    vi: {
      step: (i, n) => `Bước ${i}/${n}`, skip: "Bỏ qua", next: "Tiếp", back: "Quay lại", done: "Đã hiểu, chơi thôi!",
      title: "Cách chơi nhanh",
      touch: [
        { h: "Giao bóng và đánh bóng", p: "Chạm nút <b>ĐÁNH</b> (góc phải dưới) để giao bóng, rồi chạm lại khi bóng tới gần vợt. Một nút duy nhất: bóng cao tự đập, bóng thấp gần lưới tự dink." },
        { h: "Chọn hướng bóng", p: "Đặt ngón cái trái lên màn hình để hiện <b>joystick</b>. Kéo sang trái hoặc phải rồi bấm ĐÁNH để đánh chéo. Nhân vật tự chạy theo bóng." },
        { h: "Cú đánh đặc biệt", p: "Muốn đổi kiểu đánh? Dùng nút <b>CẮT · ĐẬP · DINK · LOB</b>. Quên cách chơi? Mở <b>☰ Menu → Hướng dẫn nhanh</b>." }
      ],
      desk: [
        { h: "Giao bóng và đánh bóng", p: "Bấm <kbd>Space</kbd> hoặc <b>click chuột</b> để tung và giao bóng, rồi bấm lại khi bóng tới gần vợt. Một nút duy nhất: bóng cao tự đập, bóng thấp gần lưới tự dink." },
        { h: "Chọn hướng bóng", p: "Giữ <kbd>A</kbd>/<kbd>D</kbd> (hoặc <kbd>←</kbd>/<kbd>→</kbd>) khi đánh để bóng đi chéo trái hoặc phải. Nhân vật tự chạy theo bóng; <kbd>W</kbd>/<kbd>S</kbd> để tiến lên lưới hoặc lùi ra sau." },
        { h: "Cú đánh đặc biệt", p: "<kbd>J</kbd> cắt · <kbd>L</kbd> đập · <kbd>U</kbd> dink · <kbd>I</kbd> lob. Quên cách chơi? <kbd>Esc</kbd> tạm dừng, hoặc <b>Menu → Hướng dẫn nhanh</b>." }
      ]
    },
    en: {
      step: (i, n) => `Step ${i}/${n}`, skip: "Skip", next: "Next", back: "Back", done: "Got it, let's play!",
      title: "Quick how-to",
      touch: [
        { h: "Serve and hit", p: "Tap <b>ĐÁNH</b> (bottom right) to serve, then tap again when the ball is near your paddle. One button does it all: high balls become smashes, low balls near the net become dinks." },
        { h: "Aim the ball", p: "Put your left thumb on the screen to show the <b>joystick</b>. Drag left or right, then tap ĐÁNH to hit cross-court. Your player runs to the ball by itself." },
        { h: "Special shots", p: "Want another shot? Use <b>CẮT · ĐẬP · DINK · LOB</b> (slice, smash, dink, lob). Forgot something? Open <b>☰ Menu → Quick how-to</b>." }
      ],
      desk: [
        { h: "Serve and hit", p: "Press <kbd>Space</kbd> or <b>click</b> to toss and serve, then press again when the ball is near your paddle. One button does it all: high balls become smashes, low balls near the net become dinks." },
        { h: "Aim the ball", p: "Hold <kbd>A</kbd>/<kbd>D</kbd> (or <kbd>←</kbd>/<kbd>→</kbd>) as you hit to send the ball cross-court left or right. Your player runs to the ball by itself; <kbd>W</kbd>/<kbd>S</kbd> move forward to the net or back." },
        { h: "Special shots", p: "<kbd>J</kbd> slice · <kbd>L</kbd> smash · <kbd>U</kbd> dink · <kbd>I</kbd> lob. Forgot something? <kbd>Esc</kbd> pauses, or use <b>Menu → Quick how-to</b>." }
      ]
    }
  };

  let el = null, idx = 0, steps = [], tx = TEXT.vi, polling = null, lastFocus = null;

  function build() {
    el = document.createElement("div");
    el.id = "coach-overlay";
    el.className = "coach-overlay";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "coach-title");
    el.hidden = true;
    el.innerHTML = `
      <div class="coach-card">
        <div class="coach-top"><span class="coach-step" id="coach-step"></span>
          <button type="button" class="coach-skip" id="coach-skip"></button></div>
        <h2 class="coach-title" id="coach-title"></h2>
        <p class="coach-body" id="coach-body"></p>
        <div class="coach-dots" id="coach-dots" aria-hidden="true"></div>
        <div class="coach-actions">
          <button type="button" class="coach-btn coach-btn-ghost" id="coach-back"></button>
          <button type="button" class="coach-btn coach-btn-primary" id="coach-next"></button>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.querySelector("#coach-skip").addEventListener("click", close);
    el.querySelector("#coach-back").addEventListener("click", () => go(idx - 1));
    el.querySelector("#coach-next").addEventListener("click", () => (idx >= steps.length - 1 ? close() : go(idx + 1)));
  }

  function render() {
    const s = steps[idx];
    el.querySelector("#coach-step").textContent = tx.step(idx + 1, steps.length);
    el.querySelector("#coach-title").textContent = s.h;
    el.querySelector("#coach-body").innerHTML = s.p;
    el.querySelector("#coach-skip").textContent = tx.skip;
    el.querySelector("#coach-back").textContent = tx.back;
    el.querySelector("#coach-back").style.visibility = idx === 0 ? "hidden" : "visible";
    el.querySelector("#coach-next").textContent = idx >= steps.length - 1 ? tx.done : tx.next;
    el.querySelector("#coach-dots").innerHTML = steps.map((_, i) => `<i class="${i === idx ? "on" : ""}"></i>`).join("");
  }
  function go(i) { idx = Math.max(0, Math.min(steps.length - 1, i)); render(); el.querySelector("#coach-next").focus(); }

  // Khi overlay mở: chặn phím/chuột lọt xuống game (Space/Click là nút đánh!)
  function onKey(e) {
    if (!el || el.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); close(); return; }
    if (e.key === "Tab") {   // giữ focus trong thẻ
      const f = [...el.querySelectorAll("button")].filter(b => b.style.visibility !== "hidden");
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      e.stopImmediatePropagation();
      return;
    }
    if (e.key === "Enter" && e.type === "keydown") { e.stopImmediatePropagation(); return; }   // để nút đang focus tự xử lý
    e.stopImmediatePropagation();
  }

  function open(force) {
    if (!force && store.get()) return;
    if (!el) build();
    tx = TEXT[lang()];
    steps = isTouch() ? tx.touch : tx.desk;
    idx = 0;
    lastFocus = document.activeElement;
    el.hidden = false;
    render();
    el.querySelector("#coach-next").focus();
  }
  function close() {
    store.set();
    if (el) el.hidden = true;
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch {} }
  }

  ["keydown", "keyup", "keypress"].forEach(t => window.addEventListener(t, onKey, true));

  // Hiện khi đã vào sân: không còn modal nào đang mở (menu chính, phòng chờ, pause...)
  const modalOpen = () => [...document.querySelectorAll(".wii-modal-backdrop")]
    .some(m => !m.classList.contains("hidden") && getComputedStyle(m).display !== "none");
  function tick() {
    if (store.get()) { clearInterval(polling); polling = null; return; }
    if (root.classList.contains("autoplay-mode") && !modalOpen() && document.getElementById("hud-root")) {
      clearInterval(polling); polling = null;
      setTimeout(() => { if (!modalOpen()) open(false); }, 700);
    }
  }
  if (!store.get()) polling = setInterval(tick, 600);

  // Mở lại thủ công
  window.hachihiShowCoach = () => open(true);
  document.addEventListener("click", e => {
    if (e.target.closest && e.target.closest("#btn-coach-hud")) setTimeout(() => open(true), 50);
  });
})();
