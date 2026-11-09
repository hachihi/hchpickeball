// Standalone Production Server for Pickleball Hachihi Open 2026
// Hỗ trợ deploy 100% độc lập trên Render.com, GitHub, Docker hoặc VPS
// Tích hợp đầy đủ REST API, đồng bộ trận đấu và phục vụ file tĩnh từ dist/

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { createApi } from "./server/api.js";
import { handleApiRequest } from "./server/http.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.resolve(__dirname, "dist");

const api = createApi();
const GZIP_EXT = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg"]);
const gzCache = new Map();

const MIME_MAP = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".glb": "model/gltf-binary",
  ".wasm": "application/wasm",
  ".mp3": "audio/mpeg"
};

const server = http.createServer(async (req, res) => {
  try { await onRequest(req, res); } catch (e) {          // one bad request must never take the room server down
    console.error("[server] request failed:", e && e.stack || e);
    try { if (!res.headersSent) { res.statusCode = 500; res.setHeader("Content-Type", "application/json"); } res.end('{"ok":false,"error":"INTERNAL"}'); } catch {}
  }
});
process.on("uncaughtException", (e) => console.error("[server] uncaughtException:", e && e.stack || e));
process.on("unhandledRejection", (e) => console.error("[server] unhandledRejection:", e && e.stack || e));

async function onRequest(req, res) {
  const parsedUrl = new URL(req.url || "/", `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // --- API Endpoints (logic lives in server/api.js, shared with vite dev server) ---
  if (pathname.startsWith("/api/")) {
    await handleApiRequest(api, req, res, `http://localhost:${PORT}`);
    return;
  }

  if (pathname === "/healthz") {                       // cheap probe for Render / uptime monitors (does not touch rooms)
    res.statusCode = 200; res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store");
    res.end(JSON.stringify({ ok: true, rooms: api.rooms.size, uptimeSec: Math.round(process.uptime()) }));
    return;
  }

  // --- Static files (dist/ in production) ---
  const root = fs.existsSync(DIST_DIR) ? DIST_DIR : __dirname;
  let rel;
  try { rel = decodeURIComponent(pathname); } catch { rel = "/"; }
  let filePath = path.resolve(root, "." + (rel === "/" ? "/index.html" : rel));
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {   // block ../ escapes
    res.statusCode = 403; res.end("Forbidden"); return;
  }
  const exists = (f) => { try { return fs.statSync(f).isFile(); } catch { return false; } };
  if (!exists(filePath)) {
    // A missing file WITH an extension (model, mp3, texture...) must be a real 404: answering with
    // index.html made the loaders choke on HTML. Only extension-less routes fall back to the SPA page.
    if (path.extname(rel)) { res.statusCode = 404; res.setHeader("Content-Type", "text/plain; charset=utf-8"); res.end("404 Not Found"); return; }
    filePath = path.join(root, "index.html");
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";
    const stat = fs.statSync(filePath);
    const hashed = /[\\/]assets[\\/].*-[A-Za-z0-9_-]{8}\.(js|css)$/.test(filePath);   // Vite content-hashed bundles only
    res.statusCode = 200;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", ext === ".html" ? "no-cache" : hashed ? "public, max-age=31536000, immutable" : "public, max-age=3600");
    const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
    res.setHeader("ETag", etag);
    if (req.headers["if-none-match"] === etag) { res.statusCode = 304; res.end(); return; }
    if (req.method === "HEAD") { res.setHeader("Content-Length", stat.size); res.end(); return; }
    // gzip text assets once and keep them in memory: the 1.1 MB bundle becomes ~310 KB on Render's slow free tier.
    if (GZIP_EXT.has(ext) && /\bgzip\b/.test(String(req.headers["accept-encoding"] || ""))) {
      const key = filePath + "|" + stat.mtimeMs;
      let gz = gzCache.get(key);
      if (!gz) { gz = zlib.gzipSync(fs.readFileSync(filePath), { level: 6 }); gzCache.set(key, gz); }
      res.setHeader("Content-Encoding", "gzip"); res.setHeader("Vary", "Accept-Encoding"); res.setHeader("Content-Length", gz.length);
      res.end(gz); return;
    }
    res.setHeader("Content-Length", stat.size);
    fs.createReadStream(filePath).on("error", () => res.destroy()).pipe(res);
  } catch (err) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("404 Not Found");
  }
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Pickleball Server] Running on http://0.0.0.0:${PORT} (Render / Production ready)`);
  console.log(`[Pickleball Server] rooms are kept in RAM: a restart/sleep drops them (clients are told ROOM_NOT_FOUND)`);
});
