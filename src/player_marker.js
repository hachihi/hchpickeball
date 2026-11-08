// =====================================================================
//  PLAYER MARKERS  -  đánh dấu nhân vật của MÌNH giữa nhiều nhân vật
//  - Nhân vật của bạn: vòng sáng xanh lá dưới chân + mũi tên nảy + nhãn "BẠN"
//  - Đồng đội: vòng xanh dương + tên;  Đối thủ: vòng đỏ nhạt + tên
//  - Nhận biết "của mình" theo chỗ ngồi (matchManager.localPlayerSlot):
//      A1 -> player, A2 -> playerPartner, B1 -> opponent, B2 -> opponentPartner
//  Nhãn tự co giãn theo khoảng cách camera nên luôn đọc được (cả điện thoại).
// =====================================================================

const SLOTS = [
  { id: "A1", actor: "player", team: "A" },
  { id: "A2", actor: "playerPartner", team: "A" },
  { id: "B1", actor: "opponent", team: "B" },
  { id: "B2", actor: "opponentPartner", team: "B" }
];
const FALLBACK_NAME = { A1: "Người chơi", A2: "Đồng đội", B1: "Đối thủ 1", B2: "Đối thủ 2" };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class PlayerMarkers {
  constructor(engine, THREE) {
    this.e = engine;
    this.T = THREE;
    this.t = 0;
    this.items = [];
    this.root = new THREE.Group();
    this.root.name = "PlayerMarkers";
    engine.scene.add(this.root);
    for (const def of SLOTS) this.items.push(this._makeItem(def));
  }

  _makeItem(def) {
    const T = this.T;
    const g = new T.Group();
    g.visible = false;
    // vòng dưới chân
    const ringMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, side: T.DoubleSide });
    const ring = new T.Mesh(new T.RingGeometry(0.7, 0.92, 40), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    ring.renderOrder = 4;
    g.add(ring);
    const disc = new T.Mesh(
      new T.CircleGeometry(0.7, 32),
      new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, depthWrite: false, side: T.DoubleSide })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.055;
    disc.renderOrder = 3;
    g.add(disc);
    // mũi tên chỉ xuống (chỉ dùng cho nhân vật của mình)
    const arrowMat = new T.MeshBasicMaterial({ color: 0xb6ff3c, depthWrite: false });
    const arrow = new T.Mesh(new T.ConeGeometry(0.24, 0.5, 14), arrowMat);
    arrow.rotation.x = Math.PI;
    arrow.renderOrder = 6;
    arrow.visible = false;
    g.add(arrow);
    // nhãn
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 128;
    const tex = new T.CanvasTexture(canvas);
    tex.colorSpace = T.SRGBColorSpace;
    const sprite = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
    sprite.renderOrder = 10;
    g.add(sprite);
    this.root.add(g);
    return { def, group: g, ring, disc, ringMat, discMat: disc.material, arrow, sprite, canvas, tex, key: "" };
  }

  _drawLabel(it, text, mine, team) {
    const key = text + "|" + mine + "|" + team;
    if (key === it.key) return;
    it.key = key;
    const c = it.canvas, x = c.getContext("2d");
    x.clearRect(0, 0, c.width, c.height);
    const bg = mine ? "#b6ff3c" : team === "A" ? "rgba(14,70,140,0.92)" : "rgba(120,36,36,0.92)";
    const fg = mine ? "#10240a" : "#ffffff";
    const w = mine ? 360 : 440, h = 92, px = (c.width - w) / 2, py = 18;
    x.fillStyle = bg;
    x.beginPath();
    const r = 26;
    x.moveTo(px + r, py); x.lineTo(px + w - r, py); x.quadraticCurveTo(px + w, py, px + w, py + r);
    x.lineTo(px + w, py + h - r); x.quadraticCurveTo(px + w, py + h, px + w - r, py + h);
    x.lineTo(px + r, py + h); x.quadraticCurveTo(px, py + h, px, py + h - r);
    x.lineTo(px, py + r); x.quadraticCurveTo(px, py, px + r, py);
    x.fill();
    x.lineWidth = 6; x.strokeStyle = mine ? "#ffffff" : "rgba(255,255,255,0.7)"; x.stroke();
    x.fillStyle = fg;
    x.textAlign = "center"; x.textBaseline = "middle";
    x.font = `900 ${mine ? 62 : 50}px system-ui, "Segoe UI", Arial, sans-serif`;
    let t = text;
    while (x.measureText(t).width > w - 40 && t.length > 3) t = t.slice(0, -2);
    if (t !== text) t += "…";
    x.fillText(t, c.width / 2, py + h / 2 + 3);
    it.tex.needsUpdate = true;
  }

  _slotInfo(slotId) {
    const e = this.e;
    const mm = (e.hud && e.hud.matchManager) || e.matchManager;
    const slots = mm && mm.slots;
    const s = slots && slots.find(q => q.slotId === slotId);
    return { mm, slot: s };
  }

  update(dt) {
    this.t += Math.min(dt, 0.05);
    const e = this.e;
    const hideAll = e.phase === "TITLE" || e.phase === "REPLAY" || e.phase === "SHOWCASE" ||
      (e.autoPlayMode && !e.userHasInteracted);
    const { mm } = this._slotInfo("A1");
    const mine = (mm && mm.localPlayerSlot) || "A1";
    const singles = e.matchType === "singles";
    const cam = e.camera;
    const viewH = (d) => 2 * d * Math.tan((cam.fov * Math.PI) / 360);
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 4);

    for (const it of this.items) {
      const actor = e[it.def.actor];
      const isSingleHidden = singles && (it.def.id === "A2" || it.def.id === "B2");
      if (hideAll || !actor || !actor.pos || isSingleHidden) { it.group.visible = false; continue; }
      it.group.visible = true;
      const isMine = it.def.id === mine;
      const myTeam = mine.charAt(0);
      const sameTeam = it.def.team === myTeam;
      it.group.position.set(actor.pos.x, 0, actor.pos.z);

      // màu vòng theo vai trò
      const col = isMine ? 0xb6ff3c : sameTeam ? 0x38bdf8 : 0xff6b6b;
      it.ringMat.color.setHex(col);
      it.discMat.color.setHex(col);
      it.ringMat.opacity = isMine ? 0.75 + 0.25 * pulse : sameTeam ? 0.6 : 0.4;
      it.discMat.opacity = isMine ? 0.18 + 0.1 * pulse : 0.1;
      const rs = isMine ? 1.15 + 0.08 * pulse : 0.85;
      it.ring.scale.set(rs, rs, 1);
      it.disc.scale.set(rs, rs, 1);

      // nhãn: kích thước theo tỷ lệ màn hình (luôn đọc được dù camera xa)
      const head = new this.T.Vector3(actor.pos.x, 2.9, actor.pos.z);
      const d = cam.position.distanceTo(head);
      const hWorld = viewH(d) * (isMine ? 0.075 : 0.052);
      it.sprite.scale.set(hWorld * 4, hWorld, 1);
      it.sprite.position.set(0, isMine ? 3.55 + 0.003 * d : 3.2, 0);

      let text = "BẠN";
      if (!isMine) {
        const { slot } = this._slotInfo(it.def.id);
        text = (slot && (slot.playerName || slot.botName)) || FALLBACK_NAME[it.def.id];
        text = String(text).replace(/^Vị trí .*/, FALLBACK_NAME[it.def.id]);
      }
      this._drawLabel(it, text, isMine, it.def.team);

      // mũi tên nảy phía trên nhân vật của mình
      it.arrow.visible = isMine;
      if (isMine) {
        const s = clamp(d / 22, 0.9, 2.4);
        it.arrow.scale.set(s, s, s);
        it.arrow.position.y = 2.85 + 0.003 * d + Math.sin(this.t * 6) * 0.14 * s;
      }
    }
  }
}
