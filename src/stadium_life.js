// =====================================================================
//  STADIUM LIFE  -  Hachihi Pickleball
//  - Bảng điện tử chính (tên + tỷ số) và bảng thứ 2 (tốc độ / cú đánh) đặt NGOÀI sân
//  - Bảng quảng cáo LED chạy chữ quanh sân
//  - Trọng tài ngồi ghế cao (quay đầu theo bóng, giơ tay chỉ bên thắng, ra hiệu lỗi/out)
//  - Trọng tài biên ngồi 4 góc
//  - Khán giả 3 khán đài, vẫy tay / nhảy / làn sóng + đèn flash máy ảnh
//  Mọi thứ đứng ngoài đường biên (|x| > 7, |z| > 13) nên không che sân.
// =====================================================================

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a, b) => a + Math.random() * (b - a);

export class StadiumLife {
  constructor(engine, THREE) {
    this.e = engine;
    this.T = THREE;
    this.t = 0;
    this.acc = 0;
    this.crowdAcc = 0;
    this.coarse = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    this.root = new THREE.Group();
    this.root.name = "StadiumLife";
    engine.scene.add(this.root);

    this.sb = { pText: "00", oText: "00", deuce: null, pGames: 0, oGames: 0, gamesToWin: 2, serverNum: 2 };
    this.shot = { hitter: "", speed: 0, max: 0, type: "", stroke: 0, t: -99, grade: "", detail: "", tPopup: -99 };
    this.result = { text: "", t: -99 };
    this.pose = { type: "none", until: -1, side: 1 };
    this.excite = 0;
    this.wave = { until: -1, start: 0 };
    this._hitKey = "";
    this._pending = 0;
    this._pendingMax = 0;
    this._rallyWaveDone = false;
    this._tmp = new THREE.Vector3();

    try { this._buildBoards(); } catch (err) { console.warn("[StadiumLife] boards", err); }
    try { this._buildAdBoards(); } catch (err) { console.warn("[StadiumLife] ads", err); }
    try { this._buildReferee(); } catch (err) { console.warn("[StadiumLife] referee", err); }
    try { this._buildCrowd(); } catch (err) { console.warn("[StadiumLife] crowd", err); }
    try { this._buildFlashes(); } catch (err) { console.warn("[StadiumLife] flashes", err); }
    this._injectCss();
    this._hookEngine();
  }

  // ------------------------------------------------------------------
  //  CSS: đưa popup / banner ra khỏi giữa sân
  // ------------------------------------------------------------------
  _injectCss() {
    const st = document.createElement("style");
    st.textContent = `
#timing-popup.pb-top{left:50%!important;top:66px!important;transform:translateX(-50%)!important;animation:none!important}
.center-banner-layer{top:17%!important;transform:translateY(-50%) scale(.7)!important}
`;
    document.head.appendChild(st);
  }

  _useBoards() {
    return window.innerWidth >= 900 && window.innerWidth > window.innerHeight;
  }

  // ------------------------------------------------------------------
  //  Hook vào engine / HUD
  // ------------------------------------------------------------------
  _hookEngine() {
    const e = this.e, h = e.hud;
    if (h && h.updateScoreboard) {
      const o = h.updateScoreboard.bind(h);
      h.updateScoreboard = (a = {}) => {
        this.sb = {
          pText: a.playerScoreText ?? "00", oText: a.opponentScoreText ?? "00",
          deuce: a.deuceLabel || null, pGames: a.playerGames || 0, oGames: a.opponentGames || 0,
          gamesToWin: a.gamesToWin || 2, serverNum: a.serverNumber || 2
        };
        this.main && (this.main.dirty = true);
        return o(a);
      };
    }
    if (h && h.showTimingPopup) {
      const o = h.showTimingPopup.bind(h);
      h.showTimingPopup = (opts = {}) => {
        this.shot.grade = opts.grade || "";
        this.shot.detail = opts.detail || "";
        this.shot.tPopup = this.t;
        this.info && (this.info.dirty = true);
        const pop = h.elTimingPopup;
        if (this._useBoards()) {
          pop && pop.classList.add("hidden");
          return;
        }
        const r = o({ ...opts, screenPos: null });
        pop && pop.classList.add("pb-top");
        return r;
      };
    }
    if (h && h.showCenterBanner) {
      const o = h.showCenterBanner.bind(h);
      h.showCenterBanner = (t, opts) => {
        this.result = { text: String(t || ""), t: this.t };
        this.main && (this.main.dirty = true);
        return o(t, opts);
      };
    }
    if (e._awardPoint) {
      const o = e._awardPoint.bind(e);
      e._awardPoint = (w, r = "") => {
        try { this._onPoint(w, r); } catch (_) {}
        return o(w, r);
      };
    }
  }

  _onPoint(winner, reason) {
    const isOut = /lỗi|fault|out|ngoài|lưới|net|2 lần|bếp|kitchen/i.test(reason || "");
    const playerWin = winner === "player";
    const rotated = Math.abs(this.root.rotation.y) > 1;
    const side = (playerWin ? 1 : -1) * (rotated ? -1 : 1);
    this.pose = { type: isOut ? "out" : "point", until: this.t + (isOut ? 1.9 : 2.4), side };
    this.excite = 1;
    this.result = { text: String(reason || "").split("(")[0].trim(), t: this.t };
    this.main && (this.main.dirty = true);
    // pháo giấy từ khán đài
    const burst = this.e._spawnStarBurst ? this.e._spawnStarBurst.bind(this.e) : null;
    if (burst) {
      for (let i = 0; i < 3; i++) {
        const sx = Math.random() < 0.5 ? -1 : 1;
        burst(new this.T.Vector3(sx * rnd(9, 11.5), rnd(2.3, 3.6), rnd(-8, 8)), 10);
      }
    }
  }

  // ------------------------------------------------------------------
  //  BẢNG ĐIỆN TỬ
  // ------------------------------------------------------------------
  _makeBoard(w, h, px, py) {
    const T = this.T;
    const canvas = document.createElement("canvas");
    canvas.width = px; canvas.height = py;
    const ctx = canvas.getContext("2d");
    const tex = new T.CanvasTexture(canvas);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    const group = new T.Group();
    const frameMat = new T.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.6, metalness: 0.5 });
    const frame = new T.Mesh(new T.BoxGeometry(w + 0.35, h + 0.35, 0.28), frameMat);
    group.add(frame);
    const screen = new T.Mesh(
      new T.PlaneGeometry(w, h),
      new T.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false })
    );
    screen.position.z = 0.15;
    group.add(screen);
    // hai trụ đỡ
    for (const sx of [-1, 1]) {
      const post = new T.Mesh(new T.BoxGeometry(0.16, 1.9, 0.16), frameMat);
      post.position.set(sx * (w * 0.38), -(h / 2) - 0.8, -0.05);
      group.add(post);
    }
    return { group, canvas, ctx, tex, dirty: true, w: px, h: py };
  }

  _buildBoards() {
    // y giữa bảng = 3.0 -> chân bảng chạm đất (trụ dài 1.9)
    this.main = this._makeBoard(5.2, 2.6, 1024, 512);
    this.main.group.position.set(-8.7, 3.2, -5.2);
    this.main.group.rotation.y = 0.3;
    this.root.add(this.main.group);

    this.info = this._makeBoard(5.2, 2.6, 1024, 512);
    this.info.group.position.set(8.7, 3.2, -5.2);
    this.info.group.rotation.y = -0.3;
    this.root.add(this.info.group);
  }

  _led(ctx, text, x, y, size, color, align = "left", glow = 14) {
    ctx.font = `900 ${size}px system-ui, "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
  }

  _boardBg(ctx, W, H, title, sub) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#050b18"); g.addColorStop(1, "#0b1b36");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#0c3f96"; ctx.fillRect(0, 0, W, 78);
    ctx.fillStyle = "#1fd1ff"; ctx.fillRect(0, 78, W, 4);
    this._led(ctx, title, 28, 40, 40, "#ffffff", "left", 6);
    this._led(ctx, sub, W - 28, 40, 28, "#c8f27a", "right", 6);
    ctx.fillStyle = "rgba(0,0,0,0.20)";
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.5);
    ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6);
  }

  _drawMain() {
    const b = this.main; if (!b) return;
    const ctx = b.ctx, W = b.w, H = b.h, e = this.e, sb = this.sb;
    this._boardBg(ctx, W, H, "HACHIHI OPEN 2026", "SÂN 1 • PICKLEBALL");
    const pName = ((e.hud && e.hud.playerName) || "HACHIHI PRO").toUpperCase().slice(0, 16);
    let oName = "ĐỐI THỦ";
    try {
      const n = e.matchManager && e.matchManager.teamBName;
      if (n && !/Đội B/i.test(n)) oName = String(n).toUpperCase().slice(0, 16);
    } catch (_) {}
    const server = e.score && e.score.server;
    const rows = [
      { name: pName, txt: sb.pText, games: sb.pGames, mine: true, serve: server === "player" },
      { name: oName, txt: sb.oText, games: sb.oGames, mine: false, serve: server !== "player" }
    ];
    rows.forEach((r, i) => {
      const cy = 160 + i * 130;
      ctx.fillStyle = r.mine ? "rgba(32,140,255,0.22)" : "rgba(255,120,60,0.18)";
      ctx.fillRect(18, cy - 56, W - 36, 112);
      if (r.serve) {
        ctx.fillStyle = "#b6ff3c"; ctx.shadowColor = "#b6ff3c"; ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(52, cy, 17, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      }
      this._led(ctx, r.name, 92, cy, 54, "#ffffff", "left", 4);
      for (let g = 0; g < sb.gamesToWin; g++) {
        const gx = 640 + g * 52;
        ctx.fillStyle = g < r.games ? "#b6ff3c" : "rgba(255,255,255,0.18)";
        ctx.fillRect(gx, cy - 18, 38, 36);
      }
      if (!sb.deuce) this._led(ctx, String(r.txt), W - 40, cy + 2, 108, "#ffc83a", "right", 20);
    });
    if (sb.deuce) this._led(ctx, String(sb.deuce), W - 40, 225, 80, "#ffc83a", "right", 20);
    // footer
    ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.fillRect(0, H - 92, W, 92);
    const fresh = this.t - this.result.t < 5 && this.result.text;
    if (fresh) this._led(ctx, this.result.text.toUpperCase().slice(0, 28), W / 2, H - 46, 46, "#ff6b6b", "center", 16);
    else this._led(ctx, `GIAO BÓNG  S${sb.serverNum}   •   TỚI ${e.targetPoints || 11} ĐIỂM`, W / 2, H - 46, 40, "#7fe3ff", "center", 10);
    b.tex.needsUpdate = true; b.dirty = false;
  }

  _drawInfo() {
    const b = this.info; if (!b) return;
    const ctx = b.ctx, W = b.w, H = b.h, s = this.shot, e = this.e;
    this._boardBg(ctx, W, H, "SHOT CENTER", "TỐC ĐỘ • CÚ ĐÁNH");
    const live = this.t - s.t < 7;
    const who = s.hitter === "player"
      ? ((e.hud && e.hud.playerName) || "HACHIHI PRO").toUpperCase().slice(0, 14)
      : (s.hitter ? "ĐỐI THỦ" : "—");
    // tốc độ lớn
    this._led(ctx, "TỐC ĐỘ", 40, 130, 34, "#7fe3ff", "left", 8);
    const spd = live ? Math.round(s.speed) : 0;
    this._led(ctx, live ? String(spd) : "--", 40, 215, 130, "#ffc83a", "left", 22);
    this._led(ctx, "km/h", 330, 235, 44, "#ffffff", "left", 6);
    // thanh tốc độ
    const bx = 40, by = 292, bw = 520, bh = 26;
    ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.fillRect(bx, by, bw, bh);
    const frac = clamp(spd / 120, 0, 1);
    const gr = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    gr.addColorStop(0, "#37e36b"); gr.addColorStop(0.6, "#ffd23a"); gr.addColorStop(1, "#ff4b3a");
    ctx.fillStyle = gr; ctx.fillRect(bx, by, bw * frac, bh);
    // cột phải: người đánh / cú đánh / timing
    const gradeCol = /EARLY|SỚM/i.test(s.grade) ? "#4cc2ff" : /LATE|MUỘN|LỖI|FAULT/i.test(s.grade) ? "#ff6b6b" : "#b6ff3c";
    const popLive = this.t - s.tPopup < 4;
    this._led(ctx, "NGƯỜI ĐÁNH", 600, 128, 26, "#7fe3ff", "left", 6);
    this._led(ctx, live ? who : "—", 600, 168, 46, "#ffffff", "left", 4);
    this._led(ctx, "CÚ ĐÁNH", 600, 232, 26, "#7fe3ff", "left", 6);
    const typeTxt = popLive && s.detail ? s.detail : (live && s.type ? s.type : "—");
    this._led(ctx, String(typeTxt).toUpperCase().slice(0, 18), 600, 272, 38, "#ffffff", "left", 4);
    this._led(ctx, "TIMING", 600, 330, 26, "#7fe3ff", "left", 6);
    this._led(ctx, popLive && s.grade ? String(s.grade).toUpperCase().slice(0, 14) : "—", 600, 372, 46, gradeCol, "left", 14);
    // footer
    ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.fillRect(0, H - 92, W, 92);
    this._led(ctx, `RALLY ${s.stroke || 0}   •   MAX ${Math.round(s.max || 0)} km/h`, W / 2, H - 46, 42, "#ffc83a", "center", 12);
    b.tex.needsUpdate = true; b.dirty = false;
  }

  // ------------------------------------------------------------------
  //  BẢNG QUẢNG CÁO LED CHẠY CHỮ
  // ------------------------------------------------------------------
  _buildAdBoards() {
    const T = this.T;
    const c = document.createElement("canvas");
    c.width = 2048; c.height = 96;
    const x = c.getContext("2d");
    x.fillStyle = "#06122a"; x.fillRect(0, 0, 2048, 96);
    const items = ["HACHIHI OPEN 2026", "PICKLEBALL", "17 NĂM HOÀNG MAI", "TEAMWORK MAKES THE DREAM WORK"];
    const cols = ["#ffffff", "#b6ff3c", "#ffc83a", "#7fe3ff"];
    x.font = "900 56px system-ui, Arial, sans-serif"; x.textBaseline = "middle";
    let px = 30;
    items.forEach((t, i) => {
      x.fillStyle = cols[i]; x.shadowColor = cols[i]; x.shadowBlur = 10;
      x.fillText(t, px, 50);
      px += x.measureText(t).width + 50;
      x.fillStyle = "#ff5a5a"; x.fillText("★", px - 36, 50);
    });
    x.shadowBlur = 0;
    this.adTex = [];
    const mk = (len, cx, cz, rotY) => {
      const tex = new T.CanvasTexture(c);
      tex.colorSpace = T.SRGBColorSpace;
      tex.wrapS = T.RepeatWrapping;
      tex.repeat.set(len / 7, 1);
      tex.offset.x = Math.random();
      this.adTex.push(tex);
      const g = new T.Group();
      const base = new T.Mesh(new T.BoxGeometry(len, 0.82, 0.12), new T.MeshStandardMaterial({ color: 0x08142c, roughness: 0.7 }));
      const face = new T.Mesh(new T.PlaneGeometry(len, 0.78), new T.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false }));
      face.position.z = 0.07;
      g.add(base, face);
      g.position.set(cx, 0.42, cz);
      g.rotation.y = rotY;
      this.root.add(g);
    };
    // 2 bên hông (chừa khoảng trống cho ghế trọng tài ở giữa)
    mk(9.2, -7.5, -6.6, Math.PI / 2); mk(9.2, -7.5, 6.6, Math.PI / 2);
    mk(9.2, 7.5, -6.6, -Math.PI / 2); mk(9.2, 7.5, 6.6, -Math.PI / 2);
    // sau vạch cuối xa
    mk(14, 0, -13.3, 0);
  }

  // ------------------------------------------------------------------
  //  TRỌNG TÀI + TRỌNG TÀI BIÊN
  // ------------------------------------------------------------------
  _mat(color) { return new this.T.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.02 }); }

  _makePerson({ shirt = 0xffffff, pants = 0x1b2a49, skin = 0xf0c9a0, cap = 0x0c3f96, seated = true }) {
    const T = this.T;
    const g = new T.Group();
    const torso = new T.Mesh(new T.CylinderGeometry(0.2, 0.23, 0.6, 10), this._mat(shirt));
    torso.position.y = 0.3; g.add(torso);
    const head = new T.Group(); head.position.y = 0.64; g.add(head);
    const skull = new T.Mesh(new T.SphereGeometry(0.17, 12, 10), this._mat(skin));
    skull.position.y = 0.17; head.add(skull);
    const capM = new T.Mesh(new T.CylinderGeometry(0.175, 0.185, 0.09, 12), this._mat(cap));
    capM.position.y = 0.3; head.add(capM);
    const brim = new T.Mesh(new T.BoxGeometry(0.2, 0.02, 0.14), this._mat(cap));
    brim.position.set(0, 0.27, 0.18); head.add(brim);
    const mkArm = sx => {
      const p = new T.Group(); p.position.set(sx * 0.26, 0.55, 0);
      const up = new T.Mesh(new T.CylinderGeometry(0.055, 0.05, 0.5, 8), this._mat(shirt));
      up.position.y = -0.25; p.add(up);
      const hand = new T.Mesh(new T.SphereGeometry(0.065, 8, 8), this._mat(skin));
      hand.position.y = -0.53; p.add(hand);
      g.add(p); return p;
    };
    const armPlus = mkArm(1), armMinus = mkArm(-1);
    if (seated) {
      for (const sx of [-1, 1]) {
        const th = new T.Mesh(new T.BoxGeometry(0.15, 0.15, 0.46), this._mat(pants));
        th.position.set(sx * 0.1, -0.05, 0.24); g.add(th);
        const sh = new T.Mesh(new T.BoxGeometry(0.13, 0.46, 0.13), this._mat(pants));
        sh.position.set(sx * 0.1, -0.3, 0.45); g.add(sh);
      }
    } else {
      for (const sx of [-1, 1]) {
        const lg = new T.Mesh(new T.CylinderGeometry(0.08, 0.07, 0.85, 8), this._mat(pants));
        lg.position.set(sx * 0.1, -0.42, 0); g.add(lg);
      }
    }
    return { group: g, head, armPlus, armMinus };
  }

  _buildReferee() {
    const T = this.T;
    // ghế trọng tài cao ở giữa lưới, bên phải sân
    const chair = new T.Group();
    const wood = this._mat(0xe9edf5), dark = this._mat(0x1b2a49);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = new T.Mesh(new T.BoxGeometry(0.08, 1.5, 0.08), dark);
      leg.position.set(sx * 0.38, 0.75, sz * 0.36); chair.add(leg);
    }
    const seat = new T.Mesh(new T.BoxGeometry(0.95, 0.08, 0.85), wood); seat.position.y = 1.5; chair.add(seat);
    const back = new T.Mesh(new T.BoxGeometry(0.95, 0.7, 0.07), wood); back.position.set(0, 1.9, -0.4); chair.add(back);
    const foot = new T.Mesh(new T.BoxGeometry(0.8, 0.06, 0.4), dark); foot.position.set(0, 0.9, 0.55); chair.add(foot);
    const rail = new T.Mesh(new T.BoxGeometry(0.06, 0.06, 0.9), dark); rail.position.set(0.5, 1.9, 0); chair.add(rail);
    const rail2 = rail.clone(); rail2.position.x = -0.5; chair.add(rail2);
    const ref = this._makePerson({ shirt: 0xffffff, pants: 0x0f1b36, cap: 0x0c3f96, seated: true });
    ref.group.position.set(0, 1.56, 0.02);
    chair.add(ref.group);
    chair.position.set(7.3, 0, 0);
    chair.rotation.y = -Math.PI / 2; // nhìn về phía sân
    this.root.add(chair);
    this.ref = ref;
    this.refChair = chair;

    // trọng tài biên: 4 góc, ngồi ghế thấp, quay mặt vào sân
    this.judges = [];
    const spots = [[-6.9, -13.3], [6.9, -13.3], [-6.9, 13.3], [6.9, 13.3]];
    spots.forEach(([x, z]) => {
      const gp = new T.Group();
      const stool = new T.Mesh(new T.BoxGeometry(0.5, 0.42, 0.5), dark); stool.position.y = 0.21; gp.add(stool);
      const p = this._makePerson({ shirt: 0x24a4f5, pants: 0x0f1b36, cap: 0xffffff, seated: true });
      p.group.position.set(0, 0.46, 0); gp.add(p.group);
      gp.position.set(x, 0, z);
      gp.rotation.y = Math.atan2(-x * 0.35, -z); // nhìn vào giữa sân
      this.root.add(gp);
      this.judges.push(p);
    });
  }

  _lookAtBall(person, dt, k = 1) {
    const b = this.e.ball;
    if (!b || !b.pos) return;
    const v = this._tmp.copy(b.pos);
    person.group.worldToLocal(v);
    const yaw = clamp(Math.atan2(v.x, Math.max(0.5, v.z)), -1.15, 1.15) * k;
    const pit = clamp(0.1 - v.y * 0.03, -0.15, 0.3);
    person.head.rotation.y += (yaw - person.head.rotation.y) * Math.min(1, dt * 10);
    person.head.rotation.x += (pit - person.head.rotation.x) * Math.min(1, dt * 6);
  }

  _updateReferee(dt) {
    if (!this.ref) return;
    this._lookAtBall(this.ref, dt, 1);
    const active = this.t < this.pose.until;
    let tp = 0.12, tm = -0.12;
    if (active) {
      if (this.pose.type === "point") {
        if (this.pose.side > 0) tp = Math.PI * 0.88; else tm = -Math.PI * 0.88;
      } else if (this.pose.type === "out") {
        const w = Math.sin(this.t * 16) * 0.07;
        tp = Math.PI * 0.5 + w; tm = -Math.PI * 0.5 - w;
      }
    }
    const k = Math.min(1, dt * 9);
    this.ref.armPlus.rotation.z += (tp - this.ref.armPlus.rotation.z) * k;
    this.ref.armMinus.rotation.z += (tm - this.ref.armMinus.rotation.z) * k;
    this.ref.group.position.y = 1.56 + Math.sin(this.t * 1.6) * 0.008;

    const out = active && this.pose.type === "out";
    this.judges.forEach((j, i) => {
      this._lookAtBall(j, dt, 0.8);
      const a = out ? Math.PI * 0.5 : 0.1;
      j.armPlus.rotation.z += (a - j.armPlus.rotation.z) * k;
      j.armMinus.rotation.z += (-a - j.armMinus.rotation.z) * k;
    });
  }

  // ------------------------------------------------------------------
  //  KHÁN GIẢ
  // ------------------------------------------------------------------
  _buildCrowd() {
    const T = this.T;
    const rowsN = this.coarse ? 2 : 3;
    const gap = this.coarse ? 1.25 : 0.95;
    const fans = [];
    const tierMat = new T.MeshStandardMaterial({ color: 0x14233f, roughness: 0.85 });
    const addTier = (cx, cy, cz, sx, sy, sz) => {
      const m = new T.Mesh(new T.BoxGeometry(sx, sy, sz), tierMat);
      m.position.set(cx, cy, cz); this.root.add(m);
    };
    // 2 khán đài bên hông
    for (const side of [-1, 1]) {
      for (let r = 0; r < rowsN; r++) {
        const x = side * (9.5 + r * 0.95), top = (r + 1) * 0.42;
        addTier(x, top / 2, 0, 1.0, top, 26);
        for (let z = -12; z <= 12; z += gap) {
          fans.push({ x, y: top, z: z + rnd(-0.12, 0.12), yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2, ph: Math.random() * 6.28, zz: z });
        }
      }
    }
    // khán đài phía xa
    for (let r = 0; r < rowsN; r++) {
      const z = -14.6 - r * 0.95, top = (r + 1) * 0.42;
      addTier(0, top / 2, z, 19, top, 1.0);
      for (let x = -8.6; x <= 8.6; x += gap) {
        fans.push({ x: x + rnd(-0.12, 0.12), y: top, z, yaw: 0, ph: Math.random() * 6.28, zz: x });
      }
    }
    this.fans = fans;
    const N = fans.length;
    const body = new T.CylinderGeometry(0.19, 0.22, 0.8, 8); body.translate(0, 0.4, 0);
    const head = new T.SphereGeometry(0.15, 10, 8);
    const arm = new T.CylinderGeometry(0.045, 0.04, 0.42, 6); arm.translate(0, -0.21, 0);
    const mat = () => new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    this.iBody = new T.InstancedMesh(body, mat(), N);
    this.iHead = new T.InstancedMesh(head, mat(), N);
    this.iArmL = new T.InstancedMesh(arm, mat(), N);
    this.iArmR = new T.InstancedMesh(arm, mat(), N);
    const shirts = [0x2e7dff, 0xb6ff3c, 0xffffff, 0xff5a5a, 0xffc83a, 0x24a4f5, 0xff8a3a, 0x9b5cff];
    const skins = [0xf3d1b0, 0xe0ac82, 0xc68642, 0x8d5524, 0xf0c9a0];
    const col = new T.Color();
    fans.forEach((f, i) => {
      const sh = shirts[(Math.random() * shirts.length) | 0];
      this.iBody.setColorAt(i, col.setHex(sh));
      this.iArmL.setColorAt(i, col.setHex(sh));
      this.iArmR.setColorAt(i, col.setHex(sh));
      this.iHead.setColorAt(i, col.setHex(skins[(Math.random() * skins.length) | 0]));
    });
    [this.iBody, this.iHead, this.iArmL, this.iArmR].forEach(m => {
      m.frustumCulled = false;
      this.root.add(m);
    });
    this.dummy = new T.Object3D();
    this._updateCrowd(0.016, true);
  }

  triggerWave(seconds = 6) {
    this.wave = { until: this.t + seconds, start: this.t };
  }

  _updateCrowd(dt, force = false) {
    if (!this.fans) return;
    this.crowdAcc += dt;
    const step = this.coarse ? 1 / 24 : 1 / 40;
    if (!force && this.crowdAcc < step) return;
    this.crowdAcc = 0;
    const e = this.e, t = this.t;
    const energy = clamp(((e.cheerEnergy || 0.22) - 0.25) / 0.75, 0, 1);
    const celebrate = e.phase === "MATCH_OVER" ? 1 : 0;
    const ex = Math.max(this.excite, energy * 0.7, celebrate);
    const waving = t < this.wave.until;
    const d = this.dummy;
    const L = this.fans.length;
    for (let i = 0; i < L; i++) {
      const f = this.fans[i];
      let up = ex * (0.55 + 0.45 * Math.sin(t * 11 + f.ph));
      if (waving) {
        const front = ((t - this.wave.start) * 9) - 13;
        const dd = f.zz - front;
        up = Math.max(up, Math.exp(-dd * dd / 6) * 1.1);
      }
      const bob = ex * Math.abs(Math.sin(t * 9 + f.ph)) * 0.16 + Math.sin(t * 1.7 + f.ph) * 0.012 + (waving ? Math.max(0, up - ex) * 0.1 : 0);
      const ang = clamp(0.12 + up * 2.7, 0.08, Math.PI * 0.95);
      const c = Math.cos(f.yaw), s = Math.sin(f.yaw);
      d.rotation.set(0, f.yaw, 0);
      d.position.set(f.x, f.y + bob, f.z);
      d.updateMatrix(); this.iBody.setMatrixAt(i, d.matrix);
      d.position.set(f.x, f.y + bob + 0.98, f.z);
      d.updateMatrix(); this.iHead.setMatrixAt(i, d.matrix);
      // tay: vai lệch ±0.25 theo trục ngang cục bộ
      d.rotation.set(0, f.yaw, ang, "YXZ");
      d.position.set(f.x + 0.25 * c, f.y + bob + 0.72, f.z - 0.25 * s);
      d.updateMatrix(); this.iArmR.setMatrixAt(i, d.matrix);
      d.rotation.set(0, f.yaw, -ang, "YXZ");
      d.position.set(f.x - 0.25 * c, f.y + bob + 0.72, f.z + 0.25 * s);
      d.updateMatrix(); this.iArmL.setMatrixAt(i, d.matrix);
    }
    this.iBody.instanceMatrix.needsUpdate = true;
    this.iHead.instanceMatrix.needsUpdate = true;
    this.iArmL.instanceMatrix.needsUpdate = true;
    this.iArmR.instanceMatrix.needsUpdate = true;
  }

  // ------------------------------------------------------------------
  //  ĐÈN FLASH MÁY ẢNH TỪ KHÁN ĐÀI
  // ------------------------------------------------------------------
  _buildFlashes() {
    const T = this.T;
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d");
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,0.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const tex = new T.CanvasTexture(c);
    this.flashes = [];
    const n = this.coarse ? 8 : 18;
    for (let i = 0; i < n; i++) {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
      sp.visible = false;
      this.root.add(sp);
      this.flashes.push({ sp, next: rnd(0.2, 2.5), age: 99 });
    }
  }

  _updateFlashes(dt) {
    if (!this.flashes) return;
    const rate = 1 + this.excite * 3;
    for (const f of this.flashes) {
      f.next -= dt * rate;
      if (f.next <= 0 && f.age > 0.3) {
        const fan = this.fans && this.fans[(Math.random() * this.fans.length) | 0];
        if (fan) {
          f.sp.position.set(fan.x, fan.y + 1.15, fan.z);
          f.age = 0; f.next = rnd(0.4, 3);
        }
      }
      if (f.age < 0.22) {
        f.age += dt;
        const k = clamp(f.age / 0.22, 0, 1);
        const a = k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75;
        f.sp.visible = true;
        f.sp.material.opacity = clamp(a, 0, 1);
        f.sp.scale.setScalar(0.5 + a * 1.1);
      } else {
        f.sp.visible = false;
      }
    }
  }

  // ------------------------------------------------------------------
  //  CẬP NHẬT MỖI FRAME
  // ------------------------------------------------------------------
  _detectHit() {
    const b = this.e.ball;
    if (!b || !b.vel) return;
    const key = (b.rallyStrokeCount || 0) + "|" + (b.lastHitter || "");
    if (key !== this._hitKey) {
      this._hitKey = key;
      this._pending = 3;
      this._pendingMax = 0;
      this.shot.hitter = b.lastHitter || "";
      this.shot.stroke = b.rallyStrokeCount || 0;
      this.shot.type = (b.lastHitter === "player" && this.e.selectedShotType) ? String(this.e.selectedShotType) : "";
      if ((b.rallyStrokeCount || 0) >= 7 && !this._rallyWaveDone) {
        this._rallyWaveDone = true;
        this.triggerWave(6);
      }
      if (!(b.rallyStrokeCount > 0)) this._rallyWaveDone = false;
    }
    if (this._pending > 0) {
      this._pending--;
      const sp = Math.hypot(b.vel.x, b.vel.y, b.vel.z) * 3.6;
      this._pendingMax = Math.max(this._pendingMax, sp);
      if (this._pending === 0 && this._pendingMax > 8) {
        this.shot.speed = this._pendingMax;
        this.shot.max = Math.max(this.shot.max, this._pendingMax);
        this.shot.t = this.t;
        this.info && (this.info.dirty = true);
      }
    }
  }

  update(dt) {
    dt = Math.min(dt, 0.05);
    this.t += dt;
    this.root.rotation.y = this.e.playerRole === "p2" ? Math.PI : 0;
    this.excite = Math.max(0, this.excite - dt * 0.4);
    if (this.e.phase === "TITLE") { /* vẫn chạy để nền sống động */ }
    this._detectHit();
    this._updateReferee(dt);
    this._updateCrowd(dt);
    this._updateFlashes(dt);
    if (this.adTex) for (const tx of this.adTex) tx.offset.x += dt * 0.06;
    if (this.info && this.t - this.shot.t > 7 && this.t - this.shot.t < 7.1) this.info.dirty = true;
    this.acc += dt;
    if (this.acc >= 1 / 15) {
      this.acc = 0;
      if (this.main && (this.main.dirty || (this.result.text && this.t - this.result.t > 5 && this.t - this.result.t < 5.2))) this._drawMain();
      if (this.info && this.info.dirty) this._drawInfo();
    }
  }
}
