"""Decode the QR codes produced by src/qr_generator.js with OpenCV (pip install opencv-python numpy).
Run: python3 scripts/verify_qr.py"""
import json, subprocess, numpy as np, cv2, sys
subprocess.run(["node", "scripts/dump_qr_matrices.mjs"], check=True)
bad = 0
for o in json.load(open("/tmp/qr_matrices.json")):
    m = np.array(o["m"], dtype=np.uint8); n = m.shape[0]
    img = np.where(m == 1, 0, 255).astype(np.uint8)
    img = cv2.copyMakeBorder(cv2.resize(img, (n*8, n*8), interpolation=cv2.INTER_NEAREST), 40, 40, 40, 40, cv2.BORDER_CONSTANT, value=255)
    ok = cv2.QRCodeDetector().detectAndDecode(img)[0] == o["t"]
    bad += not ok; print("OK " if ok else "BAD", o["t"][:60])
sys.exit(1 if bad else 0)
