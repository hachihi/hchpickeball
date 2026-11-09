// Gắn session của từng người chơi vào mọi request /api/match|racket.
// Server cấp sessionToken khi tạo phòng (host) hoặc vào slot (guest); token lưu theo phòng
// trong sessionStorage nên tải lại trang vẫn giữ đúng slot, và mỗi tab là một người chơi riêng.
(function () {
  if (typeof window === "undefined" || window.__hachihiSessionFetch) return;
  window.__hachihiSessionFetch = true;
  const orig = window.fetch.bind(window);
  const norm = (r) => {
    const id = String(r || "").replace(/[^A-Za-z0-9_-]/g, "").toUpperCase();
    return id === "DEFAULT" ? "10150" : id;
  };
  const key = (r) => "hachihi.session." + norm(r);
  const read = (r) => { try { return sessionStorage.getItem(key(r)); } catch { return null; } };
  const write = (r, t) => { try { sessionStorage.setItem(key(r), t); } catch {} };

  window.hachihiSession = { get: read, clear: (r) => { try { sessionStorage.removeItem(key(r)); } catch {} } };

  // ---------------------------------------------------------------------------------------------
  // Connection health (Render free servers sleep/restart, phones switch networks).
  // Only rooms where THIS tab holds a session token are watched, so Offline play never shows it.
  // ---------------------------------------------------------------------------------------------
  const health = { lastOk: Date.now(), failing: false, closed: false, el: null, since: 0 };
  function banner(kind, text, action) {
    if (typeof document === "undefined" || !document.body) return;
    if (!health.el) {
      const el = document.createElement("div");
      el.id = "net-status-banner"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite");
      el.style.cssText = "position:fixed;left:50%;transform:translateX(-50%);bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483000;max-width:min(92vw,520px);padding:10px 14px;border-radius:12px;font:600 14px/1.35 system-ui,sans-serif;color:#fff;box-shadow:0 6px 24px rgba(0,0,0,.45);display:flex;gap:10px;align-items:center;";
      document.body.appendChild(el); health.el = el;
    }
    health.el.style.background = kind === "error" ? "#b3261e" : "#9a6700";
    health.el.textContent = text;
    if (action) {
      const b = document.createElement("button");
      b.textContent = action.label; b.style.cssText = "margin-left:6px;padding:6px 10px;border-radius:8px;border:0;font:700 13px system-ui;cursor:pointer;";
      b.onclick = action.run; health.el.appendChild(b);
    }
    health.el.style.display = "flex";
  }
  const hideBanner = () => { if (health.el) health.el.style.display = "none"; };
  const DEFAULT_ROOM = "10150";
  const watched = (room) => !!room && norm(room) !== DEFAULT_ROOM && !!read(room);
  function noteOk(room) {
    health.lastOk = Date.now();
    if (health.failing && !health.closed) { health.failing = false; hideBanner(); }
    try { window.dispatchEvent(new CustomEvent("hachihi:net", { detail: { state: "ok", room } })); } catch {}
  }
  function noteFail(room, why) {
    if (health.closed) return;
    if (why === "ROOM_NOT_FOUND") {
      health.closed = true; health.failing = true;
      banner("error", "Phòng không còn tồn tại (máy chủ vừa khởi động lại hoặc phòng đã hết hạn).", { label: "Về menu", run: () => { try { window.hachihiSession.clear(room); } catch {} location.href = location.origin + "/"; } });
      try { window.dispatchEvent(new CustomEvent("hachihi:net", { detail: { state: "room-gone", room } })); } catch {}
      return;
    }
    if (Date.now() - health.lastOk > 3000) {
      health.failing = true;
      banner("warn", "Mất kết nối tới máy chủ — đang tự thử lại… (trận của bạn được giữ chỗ)");
      try { window.dispatchEvent(new CustomEvent("hachihi:net", { detail: { state: "down", room } })); } catch {}
    }
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const inflight = new Map();   // same state URL requested while the previous answer is still pending -> share it

  window.fetch = async function (input, init) {
    let u;
    try { u = new URL(typeof input === "string" ? input : input.url, location.href); } catch { return orig(input, init); }
    if (u.origin !== location.origin || !/^\/api\/(match|racket)\//.test(u.pathname) || typeof input !== "string") {
      return orig(input, init);
    }
    let room = u.searchParams.get("room");
    if (!room && init && typeof init.body === "string") { try { room = JSON.parse(init.body).room; } catch {} }
    const token = room ? read(room) : null;
    let nextInit = init;
    if (token) {
      const headers = new Headers((init && init.headers) || {});
      headers.set("X-Session", token);
      nextInit = { ...(init || {}), headers };
    }
    const isState = u.pathname === "/api/match/state", isSync = u.pathname === "/api/match/sync";
    const track = (isState || isSync) && watched(room);
    const isEntry = /\/api\/match\/(create|slot\/join)$/.test(u.pathname);

    // Polling every 50 ms must never pile up when the server is slow: reuse the pending request.
    const dedupeKey = isState && (!init || !init.method || init.method === "GET") ? input + "|" + (token || "") : null;
    if (dedupeKey && inflight.has(dedupeKey)) return inflight.get(dedupeKey).then((r) => r.clone());

    const run = async () => {
      let res, attempt = 0;
      for (;;) {
        try {
          res = await orig(input, nextInit);
          if (isEntry && [502, 503, 504].includes(res.status) && attempt < 8) throw new Error("waking");
          break;
        } catch (e) {
          if (isEntry && attempt < 8) {      // Render free instance waking up: keep trying instead of failing at once
            attempt++;
            banner("warn", `Máy chủ đang khởi động (gói miễn phí cần ~30–60 giây)… thử lần ${attempt}/8`);
            await sleep(Math.min(8000, 1500 * attempt));
            continue;
          }
          if (track) noteFail(room, "NETWORK");
          throw e;
        }
      }
      if (attempt && !health.closed) hideBanner();
      if (track) {
        if (res.status === 404) { let code = ""; try { code = (await res.clone().json()).error; } catch {} if (code === "ROOM_NOT_FOUND") noteFail(room, "ROOM_NOT_FOUND"); }
        else if (res.status >= 500) noteFail(room, "SERVER");
        else if (res.ok) {
          noteOk(room);
          if (isState) {
            try {
              const d = await res.clone().json();
              if (d && d.started && d.hostOnline === false && d.mySlot && d.mySlot !== "A1") banner("warn", "Chủ phòng đang mất kết nối — trận tạm dừng, chờ chủ phòng quay lại…");
              else if (health.el && health.el.textContent.startsWith("Chủ phòng")) hideBanner();
            } catch {}
          }
        }
      }
      if (res.ok && /\/api\/match\/(create|slot\/join)$/.test(u.pathname)) {
        try {
          const data = await res.clone().json();
          if (data && data.sessionToken && (data.roomId || room)) write(data.roomId || room, data.sessionToken);
        } catch {}
      }
      return res;
    };
    if (!dedupeKey) return run();
    const p = run();
    inflight.set(dedupeKey, p);
    try { return (await p).clone(); } finally { inflight.delete(dedupeKey); }
  };
})();
