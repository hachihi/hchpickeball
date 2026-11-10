// Node http adapter around server/api.js (used by server.js and the vite dev plugin).
const MAX_BODY = 1024 * 1024;

export function readJson(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => { size += c.length; if (size <= MAX_BODY) chunks.push(Buffer.from(c)); });
    req.on("end", () => {
      try { const s = Buffer.concat(chunks).toString("utf-8"); resolve(s ? JSON.parse(s) : {}); } catch { resolve({}); }
    });
    req.on("error", () => resolve({}));
  });
}

export function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.end(JSON.stringify(data));
}

// Returns true when the request was an /api/ request that we answered.
export async function handleApiRequest(api, req, res, base = "http://localhost") {
  const url = new URL(req.url || "/", base);
  if (!url.pathname.startsWith("/api/")) return false;
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Session");
    res.end();
    return true;
  }
  if (req.method === "GET" && url.pathname === "/api/match/events") {
    if (!api.subscribe(url.searchParams.get("room"), res)) sendJson(res, 404, { ok: false, error: "ROOM_NOT_FOUND" });
    return true;
  }
  const body = req.method === "POST" ? await readJson(req) : {};
  const token = String(req.headers["x-session"] || body.session || url.searchParams.get("session") || "") || null;
  const fwd = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();   // Render puts the client IP here
  const ip = fwd || (req.socket && req.socket.remoteAddress) || "";
  const out = await api.handle({ method: req.method, pathname: url.pathname, query: url.searchParams, body, token, ip });
  if (!out) { sendJson(res, 404, { ok: false, error: "NOT_FOUND" }); return true; }
  sendJson(res, out.status, out.body);
  return true;
}
