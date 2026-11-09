import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

import { createApi } from "./server/api.js";
import { handleApiRequest } from "./server/http.js";

const assetCache = new Map();
const assetInFlight = new Map();
const mimeForPath = (p) =>
  p.endsWith(".glb")
    ? "model/gltf-binary"
    : p.endsWith(".mp3")
    ? "audio/mpeg"
    : p.endsWith(".png")
    ? "image/png"
    : p.endsWith(".wasm")
    ? "application/wasm"
    : p.endsWith(".json")
    ? "application/json; charset=utf-8"
    : "application/octet-stream";

function tennisRelayPlugin() {
  // Same room API as server.js (server/api.js) - no duplicated logic.
  const api = createApi({ tunnelBaseUrl: "https://argon-tennis-sandbox-170440.uc.r.appspot.com" });

  const handleMiddleware = (req, res, next) => {
    const urlStr = req.url || "/";
    const parsedUrl = new URL(urlStr, "http://localhost:3000");
    const pathname = parsedUrl.pathname;

    if (pathname === "/___rPc_sWiTcH___") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("OK");
      return;
    }

    // Upstream static proxy
    if (
      pathname.startsWith("/assets/models/") ||
      pathname.startsWith("/assets/audio/") ||
      pathname.startsWith("/assets/textures/") ||
      pathname.startsWith("/assets/mediapipe/")
    ) {
      const targetUrl = `https://www.gstatic.com/aistudio/starter-apps/tennis/${pathname.slice(8)}${parsedUrl.search}`;
      (async () => {
        try {
          let entry = assetCache.get(targetUrl);
          if (!entry) {
            let pending = assetInFlight.get(targetUrl);
            if (!pending) {
              pending = fetch(targetUrl)
                .then(async (resp) => {
                  if (!resp.ok) throw new Error(`Upstream ${resp.status}`);
                  const buf = Buffer.from(await resp.arrayBuffer());
                  const item = { contentType: mimeForPath(pathname), body: buf };
                  assetCache.set(targetUrl, item);
                  return item;
                })
                .finally(() => assetInFlight.delete(targetUrl));
              assetInFlight.set(targetUrl, pending);
            }
            entry = await pending;
          }
          res.statusCode = 200;
          res.setHeader("Content-Type", entry.contentType);
          res.setHeader("Content-Length", entry.body.length);
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Cache-Control", "public, max-age=86400");
          res.end(entry.body);
        } catch {
          res.statusCode = 502;
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end("Upstream asset fetch failed");
        }
      })();
      return;
    }

    if (!pathname.startsWith("/api/")) {
      next();
      return;
    }

    handleApiRequest(api, req, res).catch(() => {
      res.statusCode = 500;
      res.end("API error");
    });
  };

  return {
    name: "argon-tennis-relay",
    configureServer(server) {
      server.middlewares.use(handleMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleMiddleware);
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
      hmr: process.env.DISABLE_HMR !== "true"
    },
    plugins: [react(), tennisRelayPlugin()],
    define: {},
    resolve: {
      alias: {
        "../assets/vendor/GLTFLoader.js": "three/examples/jsm/loaders/GLTFLoader.js",
        "@": path.resolve(".")
      }
    }
  };
});
