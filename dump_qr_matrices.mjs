import { createQRMatrix } from "../src/qr_generator.js";
import fs from "node:fs";
const texts = ["48213","https://hchpickeball.onrender.com/?room=48213&role=p2&join=lobby","https://x.io/?room=10150","https://hachihi-pickleball-service-name.onrender.com/?room=48213&role=p2&join=lobby&extra=" + "a".repeat(60),"https://example.com/"+"z".repeat(120), "Tiếng Việt Hachihi 🏓"];
fs.writeFileSync("/tmp/qr_matrices.json", JSON.stringify(texts.map(t=>({t, m:createQRMatrix(t).map(r=>r.map(c=>c?1:0))}))));
