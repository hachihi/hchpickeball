// Kiểm tra HudUI thật (DOM giả): (1) chip "Connected • Ready to Serve!" chỉ báo 1 lần rồi ẩn, không chớp lại;
// (2) khi đang thi đấu thì đổi sân/ánh sáng bị khóa, ở màn hình chính vẫn đổi được.
import fs from "node:fs";
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : (fail++, console.log("  FAIL:", m)); if (c) console.log("  ok:", m); };
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const IDS = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const store = new Map();
function mkEl(id) {
  const t = { id, listeners: {}, children: [], style: {}, dataset: {}, attrs: {}, _cls: new Set(), textContent: "", value: "", innerHTML: "", checked: false, disabled: false, offsetWidth: 1, adds: [],
    addEventListener(ev, f) { (this.listeners[ev] ||= []).push(f); }, removeEventListener() {},
    querySelector() { return mkEl("q"); }, querySelectorAll() { return []; }, appendChild(c) { this.children.push(c); return c; },
    setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] ?? null; }, removeAttribute() {}, closest() { return null; }, focus() {}, scrollIntoView() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 1, height: 1 }; },
    getContext() { const c = new Proxy({}, { get: (x, p) => (p === "canvas" ? {} : p === "measureText" ? () => ({ width: 1 }) : p in x ? x[p] : () => c), set: (x, p, v) => { x[p] = v; return true; } }); return c; } };
  t.classList = { add: (...c) => c.forEach(x => { t._cls.add(x); t.adds.push(x); }), remove: (...c) => c.forEach(x => t._cls.delete(x)), toggle: (c, f) => { const on = f === undefined ? !t._cls.has(c) : !!f; on ? t._cls.add(c) : t._cls.delete(c); return on; }, contains: c => t._cls.has(c) };
  return new Proxy(t, { get: (o, p) => (p in o ? o[p] : undefined), set: (o, p, v) => { o[p] = v; return true; } });
}
const getEl = id => { if (!IDS.has(id)) return null; if (!store.has(id)) store.set(id, mkEl(id)); return store.get(id); };
const ls = new Map();
globalThis.document = { getElementById: getEl, querySelector: () => mkEl("qs"), querySelectorAll: () => [], createElement: () => mkEl("new"), addEventListener() {}, body: mkEl("body"), head: mkEl("head"), documentElement: mkEl("html"), activeElement: null, hidden: false, fonts: { ready: Promise.resolve() } };
globalThis.window = globalThis;
globalThis.location = { search: "", origin: "http://x", href: "http://x/", hash: "", pathname: "/", protocol: "http:", host: "x" };
globalThis.localStorage = { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) };
globalThis.sessionStorage = globalThis.localStorage;
Object.defineProperty(globalThis, "navigator", { value: { userAgent: "t", language: "vi", maxTouchPoints: 0 }, configurable: true });
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
globalThis.innerWidth = 1200; globalThis.innerHeight = 800; globalThis.requestAnimationFrame = () => 0;
globalThis.Image = class {}; globalThis.AudioContext = class {};
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({}) });

const { HudUI } = await import("../src/hud_ui.js");
const callbacks = []; 
const hud = new HudUI({ onSelectScenery: id => callbacks.push(["scenery", id]), onSetLighting: m => callbacks.push(["light", m]) });

// ---- (1) chip kết nối chỉ báo một lần ----
console.log("Chip 'Connected' chỉ hiện một lần");
const pill = getEl("opponent-presence-pill");
const state = { isMultiplayer: true, p2Online: true, p2Phone: true, hostName: "H", guestName: "G" };
hud.updateOpponentPresence(state);
ok(!pill.classList.contains("hidden"), "lần đầu đối thủ vào -> chip hiện");
const justJoinedAfterFirst = pill.adds.filter(c => c === "just-joined").length;
ok(justJoinedAfterFirst === 1, "hiệu ứng 'just-joined' chạy đúng 1 lần");
for (let i = 0; i < 60; i++) hud.updateOpponentPresence(state); // ~3 giây cập nhật liên tục như poll 50ms
ok(pill.adds.filter(c => c === "just-joined").length === 1, "60 lần cập nhật tiếp theo KHÔNG chạy lại hiệu ứng (hết chớp)");
hud._presenceUntil = Date.now() - 1; // giả lập đã qua 4 giây
hud.updateOpponentPresence(state);
ok(pill.classList.contains("hidden"), "sau ~4 giây chip tự ẩn");
for (let i = 0; i < 20; i++) hud.updateOpponentPresence(state);
ok(pill.classList.contains("hidden"), "đang chơi: chip không tự hiện lại");
hud.updateOpponentPresence({ ...state, p2Online: false, p2Phone: false });
ok(pill.classList.contains("hidden"), "mất kết nối: không hiện chữ 'Waiting…' khi đang chơi");

// ---- (2) khóa đổi sân / ánh sáng ----
console.log("Khóa đổi sân & ánh sáng khi đang thi đấu");
window.__argonTennis = { phase: "TITLE" };
ok(hud._isMatchLocked() === false, "màn hình chính (TITLE): không khóa");
hud.setSelectedScenery("eiffel");
ok(hud.selectedScenery === "eiffel", "TITLE: đổi sân được");
for (const ph of ["SERVE_STANCE", "SERVE_TOSS", "RALLY", "POINT_OVER", "REPLAY", "MATCH_OVER"]) {
  window.__argonTennis = { phase: ph };
  ok(hud._isMatchLocked() === true, `${ph}: khóa`);
}
window.__argonTennis = { phase: "RALLY" };
hud.setSelectedScenery("bigben");
ok(hud.selectedScenery === "eiffel", "đang RALLY: setSelectedScenery bị bỏ qua (vẫn là eiffel)");
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
