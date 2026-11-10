import * as THREE from "three";

/**
 * Standard Pickleball Court Dimensions (in meters)
 * Official USA Pickleball & PPA specs:
 * 44 ft length = 13.4112 m (~13.41 m)
 * 20 ft width = 6.096 m (~6.10 m)
 * Kitchen (Non-Volley Zone) = 7 ft = 2.1336 m (~2.13 m) each side of net
 * Center net height = 34 inches = 0.8636 m (~0.86 m)
 * Post net height = 36 inches = 0.9144 m (~0.914 m)
 * Lines = 2 inches = 0.0508 m (~0.05 m) wide
 */
export const PICKLEBALL_SPECS = Object.freeze({
  COURT_LENGTH: 13.41,
  COURT_WIDTH: 6.10,
  BASELINE_Z: 6.705,
  KITCHEN_Z: 2.134,
  SIDELINE_X: 3.05,
  NET_HEIGHT_CENTER: 0.864,
  NET_HEIGHT_POST: 0.914,
  NET_POST_X: 3.35,
  BALL_RADIUS: 0.037, // ~74mm diameter standard wiffle pickleball
  BOUNCE_RESTITUTION: 0.60, // Authentic polymer lower bounce
  AIR_DRAG: 0.022,
  SURFACE_FRICTION: 0.88,
  POINTS_TO_WIN_GAME: 11,
  MIN_LEAD_POINTS: 2
});

/**
 * Generates a high-resolution tournament Pickleball Court texture
 * Features:
 * - Contrasting vibrant Kitchen (Non-Volley Zone) in electric lime/cyan
 * - Service courts in deep tournament emerald / sapphire
 * - Outer apron in rich navy blue with "HACHIHI PICKLEBALL" typography
 * - Crisp 2-inch white lines for baseline, sidelines, kitchen lines, and centerline
 */
export function createPickleballCourtTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 4096;
  const ctx = canvas.getContext("2d");

  const w = canvas.width;
  const h = canvas.height;

  // Background apron (Navy Blue)
  ctx.fillStyle = "#12263f";
  ctx.fillRect(0, 0, w, h);

  // Court bounding box on canvas
  const marginX = w * 0.16;
  const marginY = h * 0.12;
  const courtW = w - marginX * 2;
  const courtH = h - marginY * 2;
  const courtLeft = marginX;
  const courtTop = marginY;
  const courtRight = courtLeft + courtW;
  const courtBottom = courtTop + courtH;
  const centerY = h / 2;
  const centerX = w / 2;

  // Ratio calculation:
  // Total court length = 13.41m.
  // Kitchen is 2.134m each side of net.
  // Kitchen fraction = 2.134 / 6.705 = ~0.318
  const kitchenOffsetPx = (courtH / 2) * (PICKLEBALL_SPECS.KITCHEN_Z / PICKLEBALL_SPECS.BASELINE_Z);

  // 1. Service Courts (Deep Tournament Emerald Green #157347 / Teal #0e5b56)
  ctx.fillStyle = "#136f48";
  ctx.fillRect(courtLeft, courtTop, courtW, courtH);

  // Service court subtle gradient / turf micro-texture
  const grad = ctx.createLinearGradient(0, courtTop, 0, courtBottom);
  grad.addColorStop(0, "rgba(255, 255, 255, 0.05)");
  grad.addColorStop(0.5, "rgba(0, 0, 0, 0.08)");
  grad.addColorStop(1, "rgba(255, 255, 255, 0.05)");
  ctx.fillStyle = grad;
  ctx.fillRect(courtLeft, courtTop, courtW, courtH);

  // 2. Kitchen Zone (Non-Volley Zone): Vibrant contrasting Lime Green (#4cb838)
  const kitchenTop = centerY - kitchenOffsetPx;
  const kitchenHeight = kitchenOffsetPx * 2;
  ctx.fillStyle = "#3da834";
  ctx.fillRect(courtLeft, kitchenTop, courtW, kitchenHeight);

  // Subtle interior sheen on kitchen
  const kGrad = ctx.createLinearGradient(0, kitchenTop, 0, kitchenTop + kitchenHeight);
  kGrad.addColorStop(0, "rgba(255, 255, 255, 0.08)");
  kGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.0)");
  kGrad.addColorStop(1, "rgba(255, 255, 255, 0.08)");
  ctx.fillStyle = kGrad;
  ctx.fillRect(courtLeft, kitchenTop, courtW, kitchenHeight);

  // 3. Crisp Court Lines (White, 2 inches wide relative scale)
  const lineWidth = Math.max(14, Math.round(w * 0.009));
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "square";
  ctx.lineJoin = "miter";

  // Perimeter (Sidelines & Baselines)
  ctx.strokeRect(courtLeft, courtTop, courtW, courtH);

  // Kitchen Lines (Non-Volley Zone lines at z = ±2.134m)
  ctx.beginPath();
  ctx.moveTo(courtLeft, centerY - kitchenOffsetPx);
  ctx.lineTo(courtRight, centerY - kitchenOffsetPx);
  ctx.moveTo(courtLeft, centerY + kitchenOffsetPx);
  ctx.lineTo(courtRight, centerY + kitchenOffsetPx);
  ctx.stroke();

  // Centerline (Divides Left and Right Service Courts from Kitchen Line to Baseline)
  ctx.beginPath();
  // Top service courts
  ctx.moveTo(centerX, courtTop);
  ctx.lineTo(centerX, centerY - kitchenOffsetPx);
  // Bottom service courts
  ctx.moveTo(centerX, centerY + kitchenOffsetPx);
  ctx.lineTo(centerX, courtBottom);
  ctx.stroke();

  // Baseline Center Hash Marks (4 inches long = ~0.1m)
  const hashLength = 38;
  ctx.beginPath();
  ctx.moveTo(centerX, courtTop);
  ctx.lineTo(centerX, courtTop + hashLength);
  ctx.moveTo(centerX, courtBottom);
  ctx.lineTo(centerX, courtBottom - hashLength);
  ctx.stroke();

  // 4. Text Stencils & Decals
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Apron Baseline Branding: "HACHIHI PICKLEBALL"
  ctx.font = "bold 58px 'Arial Rounded MT Bold', sans-serif";
  ctx.fillText("★ HACHIHI PICKLEBALL ★", centerX, courtTop - 90);
  ctx.save();
  ctx.translate(centerX, courtBottom + 90);
  ctx.rotate(Math.PI);
  ctx.fillText("★ HACHIHI PICKLEBALL ★", 0, 0);
  ctx.restore();

  // Side apron sponsor decals: "PPA TOUR 2025"
  ctx.font = "bold 44px 'Arial Rounded MT Bold', sans-serif";
  ctx.save();
  ctx.translate(courtLeft - 85, centerY);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "rgba(255, 235, 59, 0.75)";
  ctx.fillText("PPA PICKLEBALL TOUR 2025", 0, 0);
  ctx.restore();

  ctx.save();
  ctx.translate(courtRight + 85, centerY);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = "rgba(255, 235, 59, 0.75)";
  ctx.fillText("PPA PICKLEBALL TOUR 2025", 0, 0);
  ctx.restore();

  // Kitchen Stencil text (Subtle white lettering inside the Non-Volley Zone)
  ctx.font = "bold 32px 'Arial Rounded MT Bold', sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
  ctx.fillText("NON-VOLLEY ZONE • KITCHEN", centerX, centerY - kitchenOffsetPx * 0.5);
  ctx.save();
  ctx.translate(centerX, centerY + kitchenOffsetPx * 0.5);
  ctx.rotate(Math.PI);
  ctx.fillText("NON-VOLLEY ZONE • KITCHEN", 0, 0);
  ctx.restore();

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates the complete 3D Tournament Pickleball Court
 * Replaces the tennis court turf with proper dimensions (13.41m x 6.10m),
 * kitchen zone, and tournament apron.
 */
export function createPickleballCourtMesh() {
  const group = new THREE.Group();
  group.name = "PickleballCourtGroup";

  // Court Plane (covers court + apron)
  // Apron extends 2.5m on each side for player footwork
  const totalLength = PICKLEBALL_SPECS.COURT_LENGTH + 5.5; // ~18.9m
  const totalWidth = PICKLEBALL_SPECS.COURT_WIDTH + 4.8;  // ~10.9m

  const courtGeo = new THREE.PlaneGeometry(totalWidth, totalLength);
  courtGeo.rotateX(-Math.PI / 2);

  const courtTexture = createPickleballCourtTexture();
  const courtMat = new THREE.MeshStandardMaterial({
    map: courtTexture,
    roughness: 0.78,
    metalness: 0.04,
    depthWrite: true
  });

  const courtMesh = new THREE.Mesh(courtGeo, courtMat);
  courtMesh.position.set(0, 0.012, 0); // Sits right on top of turf
  courtMesh.receiveShadow = true;
  courtMesh.name = "PickleballTurfMesh";
  group.add(courtMesh);

  // Subtle Kitchen Boundary Glow/Highlight to help players see the line clearly
  const createKitchenMarker = (z) => {
    const geo = new THREE.PlaneGeometry(PICKLEBALL_SPECS.COURT_WIDTH, 0.06);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(0, 0.015, z);
    return m;
  };

  group.add(createKitchenMarker(PICKLEBALL_SPECS.KITCHEN_Z));
  group.add(createKitchenMarker(-PICKLEBALL_SPECS.KITCHEN_Z));

  return group;
}

/**
 * Creates the official 3D Pickleball Net
 * - Height: 0.864m (34 inches) in center, 0.914m (36 inches) at posts
 * - Width: 6.70m (extends beyond the 6.10m sidelines to the posts at ±3.35m)
 * - Features center strap pulling down the center, white 2-inch headband, and black woven mesh
 */
export function createPickleballNetMesh() {
  const group = new THREE.Group();
  group.name = "PickleballNetGroup";

  const postX = PICKLEBALL_SPECS.NET_POST_X; // 3.35m
  const postH = PICKLEBALL_SPECS.NET_HEIGHT_POST; // 0.914m
  const centerH = PICKLEBALL_SPECS.NET_HEIGHT_CENTER; // 0.864m

  // 1. Net Posts (Sturdy black steel tournament posts)
  const postGeo = new THREE.CylinderGeometry(0.045, 0.045, postH + 0.05, 16);
  const postMat = new THREE.MeshStandardMaterial({
    color: 0x1a202c,
    roughness: 0.35,
    metalness: 0.82
  });

  const postL = new THREE.Mesh(postGeo, postMat);
  postL.position.set(-postX, postH / 2, 0);
  postL.castShadow = true;
  group.add(postL);

  const postR = new THREE.Mesh(postGeo, postMat);
  postR.position.set(postX, postH / 2, 0);
  postR.castShadow = true;
  group.add(postR);

  // Post base plates
  const baseGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.04, 16);
  const baseL = new THREE.Mesh(baseGeo, postMat);
  baseL.position.set(-postX, 0.02, 0);
  group.add(baseL);

  const baseR = new THREE.Mesh(baseGeo, postMat);
  baseR.position.set(postX, 0.02, 0);
  group.add(baseR);

  // 2. Net Mesh Geometry (curved slightly toward center 0.864m)
  const segs = 32;
  const netGeo = new THREE.PlaneGeometry(postX * 2, postH, segs, 8);
  const posAttr = netGeo.attributes.position;

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const normX = x / postX; // -1 to 1
    // Parabolic sag in center: postH (0.914) to centerH (0.864) = 0.05m dip
    const sag = (1 - normX * normX) * (postH - centerH);
    // Shift top vertices down by sag
    if (y > 0) {
      posAttr.setY(i, y - sag);
    }
  }
  netGeo.computeVertexNormals();

  // Create net texture (fine black diamond mesh)
  const netCanvas = document.createElement("canvas");
  netCanvas.width = 64;
  netCanvas.height = 64;
  const nCtx = netCanvas.getContext("2d");
  nCtx.fillStyle = "rgba(0,0,0,0)";
  nCtx.clearRect(0, 0, 64, 64);
  nCtx.strokeStyle = "rgba(18, 22, 28, 0.88)";
  nCtx.lineWidth = 3.5;
  nCtx.beginPath();
  nCtx.moveTo(0, 32);
  nCtx.lineTo(32, 0);
  nCtx.lineTo(64, 32);
  nCtx.lineTo(32, 64);
  nCtx.closePath();
  nCtx.stroke();

  const netTex = new THREE.CanvasTexture(netCanvas);
  netTex.wrapS = THREE.RepeatWrapping;
  netTex.wrapT = THREE.RepeatWrapping;
  netTex.repeat.set(48, 8);

  const netMat = new THREE.MeshStandardMaterial({
    map: netTex,
    transparent: true,
    alphaTest: 0.12,
    side: THREE.DoubleSide,
    roughness: 0.65,
    metalness: 0.1
  });

  const netMesh = new THREE.Mesh(netGeo, netMat);
  netMesh.position.set(0, postH / 2, 0);
  netMesh.castShadow = true;
  group.add(netMesh);

  // 3. Top White Vinyl Headband Tape
  const tapeWidth = postX * 2 + 0.05;
  const tapeGeo = new THREE.BoxGeometry(tapeWidth, 0.055, 0.035, segs, 1, 1);
  const tapePos = tapeGeo.attributes.position;
  for (let i = 0; i < tapePos.count; i++) {
    const x = tapePos.getX(i);
    const y = tapePos.getY(i);
    const normX = x / postX;
    const sag = (1 - Math.min(1, normX * normX)) * (postH - centerH);
    tapePos.setY(i, y - sag);
  }
  tapeGeo.computeVertexNormals();

  const tapeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.05
  });
  const tapeMesh = new THREE.Mesh(tapeGeo, tapeMat);
  tapeMesh.position.set(0, postH - 0.02, 0);
  tapeMesh.castShadow = true;
  group.add(tapeMesh);

  // 4. Center Strap (holds net down to 34 inches / 0.864m)
  const strapGeo = new THREE.BoxGeometry(0.05, centerH, 0.04);
  const strapMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.1
  });
  const strapMesh = new THREE.Mesh(strapGeo, strapMat);
  strapMesh.position.set(0, centerH / 2, 0);
  strapMesh.castShadow = true;
  group.add(strapMesh);

  return group;
}

/**
 * Creates the Official 3D Tournament Pickleball Ball
 * - Optic Neon Yellow/Lime hard polymer wiffle ball
 * - 32-40 circular precision holes (perforations)
 * - Seamless molded polymer surface with plastic gloss
 */
export function createPickleballBallMesh() {
  const radius = PICKLEBALL_SPECS.BALL_RADIUS; // 0.037m

  // Generate perforated ball texture (40 holes wiffle ball pattern)
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  // Bright USAPA Dura / Franklin neon yellow-lime
  ctx.fillStyle = "#e2ff1a";
  ctx.fillRect(0, 0, 512, 256);

  // Subtle plastic seam equator line
  ctx.strokeStyle = "rgba(180, 205, 10, 0.4)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 128);
  ctx.lineTo(512, 128);
  ctx.stroke();

  // Holes (drawn with 3D recessed shading)
  const numRows = 5;
  const colsPerRow = [6, 8, 10, 8, 6];
  const holeRadius = 9;

  for (let r = 0; r < numRows; r++) {
    const y = 35 + r * 46;
    const count = colsPerRow[r];
    const offset = (r % 2) * (512 / (count * 2));
    for (let c = 0; c < count; c++) {
      const x = (c * (512 / count) + offset) % 512;

      // Dark hole interior
      ctx.fillStyle = "#0a1400";
      ctx.beginPath();
      ctx.arc(x, y, holeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Recessed bevel rim
      ctx.strokeStyle = "rgba(160, 190, 5, 0.85)";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Specular hole rim highlight
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x - 1, y - 1, holeRadius + 1, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
    }
  }

  const ballTexture = new THREE.CanvasTexture(canvas);
  ballTexture.colorSpace = THREE.SRGBColorSpace;

  const geo = new THREE.SphereGeometry(radius, 28, 20);
  const mat = new THREE.MeshStandardMaterial({
    map: ballTexture,
    roughness: 0.32,
    metalness: 0.08,
    emissive: 0x223300,
    emissiveIntensity: 0.15
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  mesh.name = "PickleballBall";

  const group = new THREE.Group();
  group.add(mesh);
  group.name = "PickleballBallGroup";
  return group;
}

/**
 * Creates an authentic 3D Pickleball Paddle (Solid polymer honeycomb composite)
 * Replaces the stringed tennis racket.
 * - Solid rounded-rectangular blade (19.5cm x 26.5cm x 16mm)
 * - Molded rubber/poly edge guard running around the perimeter
 * - Tapered throat neck
 * - Octagonal cushioned grip handle with perforated grip tape
 * - Stylized "HACHIHI PRO TOUR" composite face
 */
export function createPickleballPaddleMesh(role = "player") {
  const group = new THREE.Group();
  group.name = `PickleballPaddle_${role}`;

  const isPlayer = role.startsWith("player");
  const primaryColor = isPlayer ? "#ff6b1a" : "#1a88ff"; // Player: Hot Ember / Opponent: Pro Sapphire
  const accentColor = isPlayer ? "#ffea28" : "#7be0ff";

  // 1. Paddle Face Texture (Carbon fiber + Hachihi Branding + Sweet Spot Crosshair)
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // Carbon fiber woven background
  ctx.fillStyle = "#161a20";
  ctx.fillRect(0, 0, 512, 512);

  // Micro weave pattern
  ctx.fillStyle = "#202630";
  for (let x = 0; x < 512; x += 8) {
    for (let y = 0; y < 512; y += 8) {
      if ((x / 8 + y / 8) % 2 === 0) {
        ctx.fillRect(x, y, 8, 8);
      }
    }
  }

  // Dynamic color sweep / decal
  const grad = ctx.createLinearGradient(0, 50, 512, 450);
  grad.addColorStop(0, primaryColor);
  grad.addColorStop(0.5, "rgba(22, 26, 32, 0.4)");
  grad.addColorStop(1, accentColor);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 180);
  ctx.lineTo(512, 60);
  ctx.lineTo(512, 140);
  ctx.lineTo(0, 260);
  ctx.closePath();
  ctx.fill();

  // Sweet spot circle & target
  ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 260, 72, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(256, 260, 48, 0, Math.PI * 2);
  ctx.stroke();

  // Crosshairs
  ctx.beginPath();
  ctx.moveTo(256, 170);
  ctx.lineTo(256, 350);
  ctx.moveTo(166, 260);
  ctx.lineTo(346, 260);
  ctx.stroke();

  // Branding text: "HACHIHI" & "PRO TOUR"
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "900 48px 'Arial Rounded MT Bold', sans-serif";
  ctx.fillText("HACHIHI", 256, 140);
  ctx.font = "bold 22px 'Arial Rounded MT Bold', sans-serif";
  ctx.fillStyle = accentColor;
  ctx.fillText("PRO TOUR 16mm", 256, 175);

  ctx.font = "bold 18px sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.fillText("RAW CARBON FIBER • USAPA APPROVED", 256, 420);
  ctx.restore();

  const paddleFaceTex = new THREE.CanvasTexture(canvas);
  paddleFaceTex.colorSpace = THREE.SRGBColorSpace;

  // 2. Paddle Blade (Solid rounded rectangle geometry)
  // Dimensions: 19.5cm wide x 26.5cm high x 1.6cm thick
  const bladeW = 0.20;
  const bladeH = 0.27;
  const bladeD = 0.016;
  const cornerR = 0.045;

  const shape = new THREE.Shape();
  const hw = bladeW / 2;
  const hh = bladeH / 2;

  shape.moveTo(-hw + cornerR, -hh);
  shape.lineTo(hw - cornerR, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + cornerR);
  shape.lineTo(hw, hh - cornerR);
  shape.quadraticCurveTo(hw, hh, hw - cornerR, hh);
  shape.lineTo(-hw + cornerR, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - cornerR);
  shape.lineTo(-hw, -hh + cornerR);
  shape.quadraticCurveTo(-hw, -hh, -hw + cornerR, -hh);

  const extrudeSettings = {
    steps: 1,
    depth: bladeD,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 3
  };

  const bladeGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  bladeGeo.center();

  // Compute UVs for face texture
  const pos = bladeGeo.attributes.position;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    uvs[i * 2 + 0] = (x / bladeW) + 0.5;
    uvs[i * 2 + 1] = (y / bladeH) + 0.5;
  }
  bladeGeo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

  const bladeMat = new THREE.MeshStandardMaterial({
    map: paddleFaceTex,
    roughness: 0.38,
    metalness: 0.12,
    bumpMap: paddleFaceTex,
    bumpScale: 0.001
  });

  const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
  bladeMesh.position.set(0, 0.42, 0); // Position blade at the top of handle
  bladeMesh.castShadow = true;
  bladeMesh.receiveShadow = true;
  group.add(bladeMesh);

  // 3. Molded TPU Edge Guard (Protective rim enclosing the perimeter)
  const edgeGeo = new THREE.BoxGeometry(bladeW + 0.012, bladeH + 0.012, bladeD + 0.006);
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0x11161e,
    roughness: 0.55,
    metalness: 0.2
  });
  // Subtract or place edge guard trim
  const edgeGuardTop = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, bladeW * 0.9, 12), edgeMat);
  edgeGuardTop.rotateZ(Math.PI / 2);
  edgeGuardTop.position.set(0, 0.42 + hh + 0.004, 0);
  group.add(edgeGuardTop);

  const edgeGuardL = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, bladeH * 0.85, 12), edgeMat);
  edgeGuardL.position.set(-hw - 0.004, 0.42, 0);
  group.add(edgeGuardL);

  const edgeGuardR = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, bladeH * 0.85, 12), edgeMat);
  edgeGuardR.position.set(hw + 0.004, 0.42, 0);
  group.add(edgeGuardR);

  // 4. Throat (Tapered neck bridging handle to blade)
  const throatGeo = new THREE.CylinderGeometry(0.024, 0.019, 0.07, 16);
  const throatMat = new THREE.MeshStandardMaterial({
    color: isPlayer ? 0xcc4400 : 0x0055aa,
    roughness: 0.32,
    metalness: 0.5
  });
  const throatMesh = new THREE.Mesh(throatGeo, throatMat);
  throatMesh.position.set(0, 0.26, 0);
  throatMesh.castShadow = true;
  group.add(throatMesh);

  // 5. Ergonomic Handle with Perforated Grip Tape
  const handleH = 0.22;
  const handleGeo = new THREE.CylinderGeometry(0.019, 0.021, handleH, 8);
  const handleMat = new THREE.MeshStandardMaterial({
    color: 0x1f242d,
    roughness: 0.72,
    metalness: 0.04
  });
  const handleMesh = new THREE.Mesh(handleGeo, handleMat);
  handleMesh.position.set(0, 0.11, 0);
  handleMesh.castShadow = true;
  group.add(handleMesh);

  // Grip Tape Wrap Ribs
  for (let r = 0; r < 5; r++) {
    const ribGeo = new THREE.TorusGeometry(0.0205, 0.0025, 8, 16);
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x323a48,
      roughness: 0.6
    });
    const rib = new THREE.Mesh(ribGeo, ribMat);
    rib.rotateX(Math.PI / 2);
    rib.position.set(0, 0.03 + r * 0.04, 0);
    group.add(rib);
  }

  // Handle Butt Cap (Gold / Silver emblem at the bottom)
  const capGeo = new THREE.CylinderGeometry(0.023, 0.023, 0.016, 16);
  const capMat = new THREE.MeshStandardMaterial({
    color: isPlayer ? 0xffaa00 : 0x00aaff,
    roughness: 0.25,
    metalness: 0.75
  });
  const capMesh = new THREE.Mesh(capGeo, capMat);
  capMesh.position.set(0, 0.008, 0);
  capMesh.castShadow = true;
  group.add(capMesh);

  // Set default rotation & scale to align with Mii hand grip
  group.scale.setScalar(1.28);
  return group;
}
