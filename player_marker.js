// =====================================================================
//  PLAYER MARKERS  -  đánh dấu NGƯỜI ĐANG CHƠI
//  - Mỗi nhân vật do NGƯỜI THẬT điều khiển có: vòng sáng dưới chân + tên chữ nhỏ trên đầu.
//      * Nhân vật của bạn : vòng xanh lá nhấp nháy + mũi tên nảy + tên (nền xanh lá)
//      * Người chơi khác  : vòng xanh dương + tên
//  - Bot (máy): chỉ có tên mờ nhỏ (không vòng sáng) để phân biệt với người chơi.
//  - Tên là chữ HTML đặt theo vị trí đầu nhân vật trên màn hình (luôn nét, cỡ nhỏ 12px),
//    không phụ thuộc sương mù / độ sâu / sprite 3D.
//  - Chỗ ngồi -> nhân vật:  A1=player, A2=playerPartner, B1=opponent, B2=opponentPartner
//  - Cài đặt "Chữ trên đầu" chỉ tắt phần tên; vòng sáng vẫn giữ.
//  - Mọi lỗi được nuốt và chỉ cảnh báo 1 lần để KHÔNG làm hỏng vòng lặp game.
//  - Thêm ?debugMarkers vào URL để xem trạng thái trong Console (F12).
// =====================================================================

const SLOTS = [
  { id: "A1", actor: "player", team: "A" },
  { id: "A2", actor: "playerPartner", team: "A" },
  { id: "B1", actor: "opponent", team: "B" },
  { id: "B2", actor: "opponentPartner", team: "B" }
];
const FALLBACK_NAME = { A1: "Người chơi", A2: "Đồng đội", B1: "Đối thủ 1", B2: "Đối thủ 2" };

export class PlayerMarkers {
  constructor(engine, THREE) {
    this.e = engine;
    this.T = THREE;
    this.t = 0;
    this.frame = 0;
    this.modalOpen = false;
    this.warned = false;
    this.debug = /[?&]debugMarkers\b/.test(window.location.search || "");
    this.root = new THREE.Group();
    this.root.name = "PlayerMarkers";
    engine.scene.add(this.root);
    this._injectCss();
    this.layer = document.createElement("div");
    this.layer.id = "player-name-tags";
    document.body.appendChild(this.layer);
    this.items = SLOTS.map(def => this._makeItem(def));

    // Tùy chọn trong Cài đặt: hiện / ẩn tên trên đầu (nhớ lại lần sau)
    this.showText = this._loadSetting();
    const sw = document.getElementById("setting-name-tags");
    if (sw) {
      sw.checked = this.showText;
      sw.addEventListener("change", () => {
        this.showText = !!sw.checked;
        try { localStorage.setItem("hchShowNameTags", this.showText ? "1" : "0"); } catch (_) {}
      });
    }
  }

  _loadSetting() {
    try { return localStorage.getItem("hchShowNameTags") !== "0"; } catch (_) { return true; }
  }

  _injectCss() {
    if (document.getElementById("player-marker-css")) return;
    const st = document.createElement("style");
    st.id = "player-marker-css";
    st.textContent = `
#player-name-tags{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:8}
.pm-tag{position:absolute;left:0;top:0;display:none;max-width:140px;padding:1px 8px;border-radius:999px;
  font:800 12px/18px var(--font-body,system-ui,"Segoe UI",Arial,sans-serif);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  color:#fff;background:rgba(14,70,140,.9);border:1.5px solid rgba(255,255,255,.85);will-change:transform}
.pm-tag.pm-mine{background:#b6ff3c;color:#10240a;border-color:#fff}
.pm-tag.pm-bot{background:rgba(20,28,40,.65);border-color:rgba(255,255,255,.4);font-weight:700}
`;
    document.head.appendChild(st);
  }

  _makeItem(def) {
    const T = this.T;
    const g = new T.Group();
    g.visible = false;
    const ringMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, side: T.DoubleSide, fog: false, toneMapped: false });
    const ring = new T.Mesh(new T.RingGeometry(0.62, 0.9, 48), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.09;
    ring.renderOrder = 30;
    g.add(ring);
    const discMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, depthWrite: false, side: T.DoubleSide, fog: false, toneMapped: false });
    const disc = new T.Mesh(new T.CircleGeometry(0.62, 40), discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.085;
    disc.renderOrder = 29;
    g.add(disc);
    const arrow = new T.Mesh(
      new T.ConeGeometry(0.24, 0.5, 14),
      new T.MeshBasicMaterial({ color: 0xb6ff3c, depthWrite: false, fog: false, toneMapped: false })
    );
    arrow.rotation.x = Math.PI;
    arrow.renderOrder = 31;
    arrow.visible = false;
    g.add(arrow);
    this.root.add(g);
    const tag = document.createElement("div");
    tag.className = "pm-tag";
    this.layer.appendChild(tag);
    return { def, group: g, ring, disc, ringMat, discMat, arrow, tag, text: "", cls: "" };
  }

  _slotInfo(slotId) {
    const e = this.e;
    const mm = (e.hud && e.hud.matchManager) || e.matchManager;
    const slots = mm && mm.slots;
    return { mm, slot: slots && slots.find(q => q.slotId === slotId) };
  }

  _anyModalOpen() {
    const list = document.querySelectorAll(".wii-modal-backdrop");
    for (const el of list) {
      if (!el.classList.contains("hidden") && getComputedStyle(el).display !== "none") return true;
    }
    return false;
  }

  _hideAll() {
    for (const it of this.items) {
      it.group.visible = false;
      it.tag.style.display = "none";
    }
  }

  update(dt) {
    try {
      this._update(dt);
    } catch (err) {
      if (!this.warned) { this.warned = true; console.warn("[PlayerMarkers] lỗi (đã bỏ qua, game vẫn chạy):", err); }
    }
  }

  _update(dt) {
    this.t += Math.min(dt, 0.05);
    this.frame++;
    const e = this.e;
    if (this.frame % 15 === 1) this.modalOpen = this._anyModalOpen();
    if (e.phase === "TITLE" || this.modalOpen) { this._hideAll(); return; }

    const mm = this._slotInfo("A1").mm;
    const slots = (mm && mm.slots) || [];
    const mine = (mm && mm.localPlayerSlot) || "A1";
    const singles = e.matchType === "singles";
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 4);
    const myName = (e.hud && e.hud.playerName) || "Bạn";
    const debugRows = [];
    const serving = e.phase === "SERVE_STANCE" || e.phase === "SERVE_TOSS";
    const serverActor = serving ? (e.score && e.score.server === "player" ? e.player : e.opponent) : null;

    for (const it of this.items) {
      const id = it.def.id;
      const actor = e[it.def.actor];
      if (!actor || !actor.pos || (singles && (id === "A2" || id === "B2"))) {
        it.group.visible = false; it.tag.style.display = "none"; continue;
      }
      const slot = slots.find(q => q.slotId === id);
      const isMine = id === mine;
      // Người thật: slot có playerType "human"; riêng chỗ ngồi của mình luôn tính là người thật
      const isHuman = isMine || (!!slot && slot.playerType === "human");
      const rawName = (slot && (slot.playerName || slot.botName)) || "";
      const hasName = !!rawName && !/^Vị trí /.test(rawName);
      let name = hasName ? rawName : FALLBACK_NAME[id];
      if (isMine && (!slot || !hasName || /^Hachihi Pro$/.test(name))) name = myName || name;

      // --- vòng sáng dưới chân: CHỈ người đang chơi ---
      it.group.position.set(actor.pos.x, 0, actor.pos.z);
      it.group.visible = isHuman;
      if (isHuman) {
        const col = isMine ? 0xb6ff3c : 0x38bdf8;
        it.ringMat.color.setHex(col);
        it.discMat.color.setHex(col);
        it.ringMat.opacity = isMine ? 0.8 + 0.2 * pulse : 0.85;
        it.discMat.opacity = isMine ? 0.2 + 0.12 * pulse : 0.14;
        const rs = isMine ? 1.15 + 0.08 * pulse : 1.0;
        it.ring.scale.set(rs, rs, 1);
        it.disc.scale.set(rs, rs, 1);
        it.arrow.visible = isMine;
        if (isMine) it.arrow.position.y = 3.0 + Math.sin(this.t * 6) * 0.14;
      }

      // --- tên chữ nhỏ trên đầu (HTML, bám theo đầu nhân vật) ---
      const tag = it.tag;
      if (!this.showText) { tag.style.display = "none"; }
      else {
        const p = e._projectToScreen(new this.T.Vector3(actor.pos.x, 2.6, actor.pos.z));
        // Người đang giao bóng đã có chip "Giao bóng" trên đầu -> đẩy tên lên cao hơn để không đè nhau
        if (p && actor === serverActor) p.y -= 34;
        if (!p || !p.visible) { tag.style.display = "none"; }
        else {
          if (it.text !== name) { tag.textContent = name; it.text = name; }
          const cls = "pm-tag" + (isMine ? " pm-mine" : isHuman ? "" : " pm-bot");
          if (it.cls !== cls) { tag.className = cls; it.cls = cls; }
          tag.style.display = "block";
          tag.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) translate(-50%,-100%)`;
        }
      }
      if (this.debug) debugRows.push(`${id}->${it.def.actor} human=${isHuman} mine=${isMine} name="${name}"`);
    }
    if (this.debug && this.frame % 120 === 1) console.info("[PlayerMarkers] phase=" + e.phase + " mySlot=" + mine + "\n" + debugRows.join("\n"));
  }
}
