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
  let current = null;            // the room this tab is playing in right now; stale polls of an old room must not raise banners
  let exitTimer = null;
  const watched = (room) => !!room && norm(room) !== DEFAULT_ROOM && !!read(room) && (!current || norm(room) === current);
  // Leaving for the menu is a full page load: it throws away every stale in-memory flag of the old room.
  function goMenu(room) { try { window.hachihiSession.clear(room); } catch {} location.href = location.origin + "/"; }
  function leaveSoon(room, ms) { if (exitTimer) return; exitTimer = setTimeout(() => goMenu(room), ms); }
  // Console helper for "my guest can't control": run  await hachihiDiag()  in BOTH browsers' consoles and compare.
  window.hachihiDiag = async () => {
    let r = current;
    if (!r) { try { for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); if (k && k.startsWith("hachihi.session.")) r = k.slice(16); } } catch {} }
    if (!r) return { error: "this tab has no room session" };
    const res = await orig("/api/match/state?room=" + encodeURIComponent(r), { headers: { "X-Session": read(r) || "" }, cache: "no-store" });
    const st = await res.json().catch(() => ({}));
    const eng = window.__argonTennis || {};
    return {
      room: r, httpStatus: res.status, error: st.error, reason: st.reason, mySlot: st.mySlot, started: st.started, hostOnline: st.hostOnline,
      phase: eng.phase, tabHidden: typeof document !== "undefined" ? document.hidden : null, visibility: typeof document !== "undefined" ? document.visibilityState : null,
      lastSwingAgoMs: Object.fromEntries(Object.entries(st.rackets || {}).map(([k, v]) => [k, v.lastSwing ? Math.round((st.serverTimeMs || Date.now()) - v.lastSwing.serverTimeMs) : null]))
    };
  };
  window.hachihiLeaveRoom = (room, hostClose) => {      // best effort, used when the player returns to the menu
    const r = room || current; if (!r) return Promise.resolve();
    const t = read(r); if (!t) return Promise.resolve();
    return orig("/api/match/" + (hostClose ? "close" : "leave"), { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", "X-Session": t }, body: JSON.stringify({ room: r }) })
      .catch(() => {}).then(() => { try { window.hachihiSession.clear(r); } catch {} if (norm(r) === current) current = null; });
  };
  function noteOk(room) {
    health.lastOk = Date.now();
    if (health.failing && !health.closed) { health.failing = false; hideBanner(); }
    try { window.dispatchEvent(new CustomEvent("hachihi:net", { detail: { state: "ok", room } })); } catch {}
  }
  function noteFail(room, why) {
    if (health.closed) return;
    if (why === "ROOM_CLOSED") {
      health.closed = true; health.failing = true;
      const reason = arguments[2];
      const msg = reason === "host_gone" ? "Chủ phòng đã mất kết nối quá lâu — phòng đã đóng. Đang về menu…" : "Chủ phòng đã đóng phòng. Đang về menu…";
      banner("error", msg, { label: "Về menu ngay", run: () => goMenu(room) });
      try { window.dispatchEvent(new CustomEvent("hachihi:net", { detail: { state: "room-closed", room, reason } })); } catch {}
      leaveSoon(room, 2500);
      return;
    }
    if (why === "ROOM_NOT_FOUND") {
      health.closed = true; health.failing = true;
      banner("error", "Phòng không còn tồn tại (máy chủ vừa khởi động lại hoặc phòng đã hết hạn). Đang về menu…", { label: "Về menu ngay", run: () => goMenu(room) });
      try { window.dispatchEvent(new CustomEvent("hachihi:net", { detail: { state: "room-gone", room } })); } catch {}
      leaveSoon(room, 4000);
      return;
    }
    if (Date.now() - health.lastOk > 3000) {
      health.failing = true;
      banner("warn", "Mất kết nối tới máy chủ — đang tự thử lại… (trận của bạn được giữ chỗ)");
      try { window.dispatchEvent(new CustomEvent("hachihi:net", { detail: { state: "down", room } })); } catch {}
    }
  }
  try { const q = new URLSearchParams(location.search).get("room"); if (q && read(q)) current = norm(q); } catch {}
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
        if (res.status === 404 || res.status === 410) { let j = {}; try { j = await res.clone().json(); } catch {} if (j.error === "ROOM_CLOSED") noteFail(room, "ROOM_CLOSED", j.reason); else if (j.error === "ROOM_NOT_FOUND") noteFail(room, "ROOM_NOT_FOUND"); }
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
          if (data && data.sessionToken && (data.roomId || room)) {
            write(data.roomId || room, data.sessionToken);
            // entering a (new) room: forget every problem of the previous one
            current = norm(data.roomId || room); health.closed = false; health.failing = false; health.lastOk = Date.now();
            if (exitTimer) { clearTimeout(exitTimer); exitTimer = null; }
            hideBanner();
          }
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
