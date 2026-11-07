// court_scenery.js - Đấu trường & Khung cảnh kỳ quan Việt Nam & Thế Giới
// Tích hợp Landmark 81 (VN), Tháp Eiffel (Pháp), Big Ben (Anh), New York Skyline (Mỹ), Biển Nha Trang (VN), Hachihi Cyber Arena 2026.

export const SCENERIES = {
  landmark81: {
    id: 'landmark81',
    name: 'Landmark 81 (TP. Hồ Chí Minh)',
    country: 'Việt Nam 🇻🇳',
    icon: '🏙️',
    badge: 'Việt Nam',
    desc: 'Tòa tháp cao nhất Việt Nam lấp lánh đèn LED vươn tới trời đêm sông Sài Gòn huyền ảo.',
    lighting: 'night',
    courtColor: 0x0f2b48,
    kitchenColor: 0x00bcd4,
    skyColor: 0x07111e,
    fogColor: 0x0a1c30,
    accentColor: '#38bdf8'
  },
  eiffel: {
    id: 'eiffel',
    name: 'Tháp Eiffel (Paris)',
    country: 'Pháp 🇫🇷',
    icon: '🗼',
    badge: 'Châu Âu',
    desc: 'Biểu tượng kinh đô ánh sáng Pháp với giàn thép vàng rực và chùm đèn pha quét trời hoàng hôn.',
    lighting: 'sunset',
    courtColor: 0x7c2d12,
    kitchenColor: 0xf59e0b,
    skyColor: 0x3b110e,
    fogColor: 0x451a14,
    accentColor: '#fb923c'
  },
  bigben: {
    id: 'bigben',
    name: 'Tháp Đồng Hồ Big Ben (Luân Đôn)',
    country: 'Vương Quốc Anh 🇬🇧',
    icon: '🕰️',
    badge: 'Châu Âu',
    desc: 'Cung điện Westminster bên dòng sông Thames sương mù thơ mộng, mặt đồng hồ Big Ben phát sáng trang trọng.',
    lighting: 'night',
    courtColor: 0x1e3a1e,
    kitchenColor: 0x84cc16,
    skyColor: 0x08151f,
    fogColor: 0x112233,
    accentColor: '#4ade80'
  },
  newyork: {
    id: 'newyork',
    name: 'New York & Nữ Thần Tự Do',
    country: 'Hoa Kỳ 🇺🇸',
    icon: '🗽',
    badge: 'Châu Mỹ',
    desc: 'Thành phố không ngủ, ngọn đuốc Nữ Thần Tự Do rực sáng cùng các tòa chọc trời Manhattan huyền thoại.',
    lighting: 'sunset',
    courtColor: 0x1e293b,
    kitchenColor: 0xef4444,
    skyColor: 0x1f1435,
    fogColor: 0x2e1b4d,
    accentColor: '#f43f5e'
  },
  nhatrang: {
    id: 'nhatrang',
    name: 'Bãi Biển Nhiệt Đới Nha Trang',
    country: 'Việt Nam 🇻🇳',
    icon: '🏖️',
    badge: 'Việt Nam',
    desc: 'Bờ biển nhiệt đới cát vàng, nước biển xanh ngọc bích, rặng dừa đung đưa dưới ánh nắng hè.',
    lighting: 'day',
    courtColor: 0x0284c7,
    kitchenColor: 0xfacc15,
    skyColor: 0x77bbf5,
    fogColor: 0xb9e4fc,
    accentColor: '#38bdf8'
  },
  hachihi_arena: {
    id: 'hachihi_arena',
    name: 'Đấu Trường Hachihi Cyber 2026',
    country: 'Việt Nam 🇻🇳',
    icon: '⚡',
    badge: 'Cyber Arena',
    desc: 'Đấu trường thể thao tương lai mái vòm với dải neon Hachihi bùng nổ, kỷ niệm 17 năm Hoàng Mai.',
    lighting: 'night',
    courtColor: 0x111827,
    kitchenColor: 0x10b981,
    skyColor: 0x050914,
    fogColor: 0x091426,
    accentColor: '#a855f7'
  }
};

/**
 * Tạo mô hình 3D Landmark kỳ quan và cảnh quan bên ngoài sân thi đấu
 */
export function createSceneryGroup(THREE, sceneryId = 'landmark81') {
  const root = new THREE.Group();
  root.name = `court_scenery_${sceneryId}`;

  switch (sceneryId) {
    case 'landmark81':
      buildLandmark81Scenery(THREE, root);
      break;
    case 'eiffel':
      buildEiffelScenery(THREE, root);
      break;
    case 'bigben':
      buildBigBenScenery(THREE, root);
      break;
    case 'newyork':
      buildNewYorkScenery(THREE, root);
      break;
    case 'nhatrang':
      buildNhaTrangScenery(THREE, root);
      break;
    case 'hachihi_arena':
    default:
      buildHachihiCyberScenery(THREE, root);
      break;
  }

  return root;
}

/**
 * 1. LANDMARK 81 (TP. HỒ CHÍ MINH, VIỆT NAM)
 * Tòa tháp giật cấp 81 tầng với đỉnh tháp nhọn vươn cao, đèn LED neon chuyển màu
 */
function buildLandmark81Scenery(THREE, group) {
  const towerGroup = new THREE.Group();
  towerGroup.position.set(0, 0, -68);

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1b3b6f,
    roughness: 0.15,
    metalness: 0.85,
    emissive: 0x071e3d,
    emissiveIntensity: 0.35
  });

  const neonSpineMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    wireframe: false
  });

  // Khối giật cấp mô phỏng bó tre Landmark 81
  const tiers = [
    { w: 14, d: 14, h: 22, y: 11 },
    { w: 11, d: 11, h: 20, y: 32 },
    { w: 8.5, d: 8.5, h: 22, y: 53 },
    { w: 6, d: 6, h: 20, y: 74 },
    { w: 4, d: 4, h: 18, y: 93 },
    { w: 2.2, d: 2.2, h: 16, y: 110 }
  ];

  tiers.forEach((t) => {
    const boxGeo = new THREE.BoxGeometry(t.w, t.h, t.d);
    const boxMesh = new THREE.Mesh(boxGeo, glassMat);
    boxMesh.position.set(0, t.y, 0);
    towerGroup.add(boxMesh);

    // Gân sáng LED neon 4 góc
    const edgeOffsetW = t.w / 2 + 0.05;
    const edgeOffsetD = t.d / 2 + 0.05;
    const ribGeo = new THREE.BoxGeometry(0.35, t.h, 0.35);

    const corners = [
      [edgeOffsetW, edgeOffsetD],
      [-edgeOffsetW, edgeOffsetD],
      [edgeOffsetW, -edgeOffsetD],
      [-edgeOffsetW, -edgeOffsetD]
    ];
    corners.forEach(([cx, cz]) => {
      const rib = new THREE.Mesh(ribGeo, neonSpineMat);
      rib.position.set(cx, t.y, cz);
      towerGroup.add(rib);
    });
  });

  // Đỉnh kim thu lôi Spire vươn cao chót vót
  const spireGeo = new THREE.ConeGeometry(0.85, 26, 8);
  const spireMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.9,
    roughness: 0.1
  });
  const spire = new THREE.Mesh(spireGeo, spireMat);
  spire.position.set(0, 131, 0);
  towerGroup.add(spire);

  // Đèn đỏ hàng không nhấp nháy trên đỉnh
  const beaconGeo = new THREE.SphereGeometry(0.6, 8, 8);
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.set(0, 144, 0);
  towerGroup.add(beacon);

  // Các tòa cao ốc Vinhomes phụ cận hai bên
  const subTowers = [
    { x: -28, z: -10, w: 9, h: 42, d: 9, col: 0x162c46 },
    { x: -18, z: 8, w: 7, h: 36, d: 7, col: 0x1b3552 },
    { x: 20, z: -8, w: 8, h: 46, d: 8, col: 0x172d47 },
    { x: 30, z: 6, w: 10, h: 38, d: 10, col: 0x14273e }
  ];
  subTowers.forEach(st => {
    const geo = new THREE.BoxGeometry(st.w, st.h, st.d);
    const mat = new THREE.MeshStandardMaterial({ color: st.col, metalness: 0.6, roughness: 0.3 });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(st.x, st.h / 2, st.z);
    towerGroup.add(m);
  });

  // Biển hiệu LED chào mừng
  const signGeo = new THREE.PlaneGeometry(16, 2.5);
  const signMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(0, 24, 8);
  towerGroup.add(sign);

  group.add(towerGroup);
}

/**
 * 2. THÁP EIFFEL (PARIS, PHÁP)
 * Giàn thép vòm cong, 2 tầng quan sát, chóp tháp vươn cao và chùm đèn pha Paris
 */
function buildEiffelScenery(THREE, group) {
  const eiffelGroup = new THREE.Group();
  eiffelGroup.position.set(0, 0, -65);

  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x9c7a4a, // Eiffel bronze
    metalness: 0.75,
    roughness: 0.35,
    emissive: 0x4a361a,
    emissiveIntensity: 0.45
  });

  const lightGlowMat = new THREE.MeshBasicMaterial({
    color: 0xffd166
  });

  // 4 Chân đế vát nghiêng
  const legGeo = new THREE.CylinderGeometry(1.4, 2.8, 20, 4);
  const legs = [
    { x: -10, z: -10, rotZ: -0.22, rotX: 0.22 },
    { x: 10, z: -10, rotZ: 0.22, rotX: 0.22 },
    { x: -10, z: 10, rotZ: -0.22, rotX: -0.22 },
    { x: 10, z: 10, rotZ: 0.22, rotX: -0.22 }
  ];
  legs.forEach(l => {
    const leg = new THREE.Mesh(legGeo, ironMat);
    leg.position.set(l.x, 9, l.z);
    leg.rotation.set(l.rotX, 0, l.rotZ);
    eiffelGroup.add(leg);
  });

  // Vòm chân tháp
  const archGeo = new THREE.TorusGeometry(8, 1.2, 8, 16, Math.PI);
  const arch = new THREE.Mesh(archGeo, ironMat);
  arch.position.set(0, 11, 0);
  eiffelGroup.add(arch);

  // Sàn quan sát Tầng 1
  const deck1Geo = new THREE.BoxGeometry(16, 2, 16);
  const deck1 = new THREE.Mesh(deck1Geo, ironMat);
  deck1.position.set(0, 19, 0);
  eiffelGroup.add(deck1);

  // Thân giữa vươn lên tầng 2
  const midGeo = new THREE.CylinderGeometry(4.2, 6.8, 24, 4);
  const mid = new THREE.Mesh(midGeo, ironMat);
  mid.position.set(0, 32, 0);
  mid.rotation.y = Math.PI / 4;
  eiffelGroup.add(mid);

  // Sàn quan sát Tầng 2
  const deck2Geo = new THREE.BoxGeometry(10, 1.8, 10);
  const deck2 = new THREE.Mesh(deck2Geo, ironMat);
  deck2.position.set(0, 45, 0);
  eiffelGroup.add(deck2);

  // Tháp nhọn trên cùng
  const spireGeo = new THREE.CylinderGeometry(0.8, 3.8, 48, 4);
  const spire = new THREE.Mesh(spireGeo, ironMat);
  spire.position.set(0, 70, 0);
  spire.rotation.y = Math.PI / 4;
  eiffelGroup.add(spire);

  // Chóp ngọn tháp và chùm đèn quét
  const topGeo = new THREE.ConeGeometry(1.2, 12, 8);
  const topMesh = new THREE.Mesh(topGeo, lightGlowMat);
  topMesh.position.set(0, 98, 0);
  eiffelGroup.add(topMesh);

  // Tia sáng đèn pha quét Paris (Spotlight Cone)
  const beamGeo = new THREE.ConeGeometry(8, 45, 12, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffea75,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(0, 110, 14);
  beam.rotation.x = Math.PI / 3;
  eiffelGroup.add(beam);

  // Hàng cây Champs de Mars hai bên
  const treeMat = new THREE.MeshStandardMaterial({ color: 0x3d5a24 });
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    const treeTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 5), ironMat);
    const treeFoliage = new THREE.Mesh(new THREE.ConeGeometry(2.5, 7, 7), treeMat);
    treeTrunk.position.set(i * 9, 2.5, -15);
    treeFoliage.position.set(i * 9, 7.5, -15);
    eiffelGroup.add(treeTrunk);
    eiffelGroup.add(treeFoliage);
  }

  group.add(eiffelGroup);
}

/**
 * 3. THÁP ĐỒNG HỒ BIG BEN & CUNG ĐIỆN WESTMINSTER (LUÂN ĐÔN, ANH)
 */
function buildBigBenScenery(THREE, group) {
  const clockGroup = new THREE.Group();
  clockGroup.position.set(0, 0, -64);

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xb59e7a, // Victorian limestone
    roughness: 0.7,
    metalness: 0.2
  });

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.8,
    roughness: 0.3
  });

  const clockFaceMat = new THREE.MeshBasicMaterial({
    color: 0xfffbe8
  });

  // Thân tháp gạch vuông cao lớn
  const towerBody = new THREE.Mesh(new THREE.BoxGeometry(9, 64, 9), stoneMat);
  towerBody.position.set(0, 32, 0);
  clockGroup.add(towerBody);

  // Khối buồng đồng hồ (Clock chamber)
  const chamber = new THREE.Mesh(new THREE.BoxGeometry(11, 14, 11), stoneMat);
  chamber.position.set(0, 71, 0);
  clockGroup.add(chamber);

  // 4 Mặt đồng hồ phát sáng
  const faceGeo = new THREE.CircleGeometry(3.6, 24);
  const faces = [
    { z: 5.56, rotY: 0 },
    { z: -5.56, rotY: Math.PI },
    { x: 5.56, rotY: Math.PI / 2 },
    { x: -5.56, rotY: -Math.PI / 2 }
  ];
  faces.forEach(f => {
    const face = new THREE.Mesh(faceGeo, clockFaceMat);
    if (f.z !== undefined) face.position.set(0, 71, f.z);
    if (f.x !== undefined) face.position.set(f.x, 71, 0);
    face.rotation.y = f.rotY;
    clockGroup.add(face);

    // Kim đồng hồ Big Ben
    const handGeo = new THREE.BoxGeometry(0.35, 2.2, 0.1);
    const handMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const hand = new THREE.Mesh(handGeo, handMat);
    hand.position.set(face.position.x, 71.8, face.position.z + (f.z ? (f.z > 0 ? 0.1 : -0.1) : 0));
    hand.rotation.y = f.rotY;
    clockGroup.add(hand);
  });

  // Tầng chuông belfry & chóp tháp Gothic
  const belfry = new THREE.Mesh(new THREE.BoxGeometry(9.5, 9, 9.5), goldTrimMat);
  belfry.position.set(0, 82, 0);
  clockGroup.add(belfry);

  // Mái tháp nhọn Gothic màu xanh đồng
  const spireGeo = new THREE.ConeGeometry(5.2, 24, 4);
  const spireMat = new THREE.MeshStandardMaterial({
    color: 0x2d4f48, // aged copper roof
    roughness: 0.4
  });
  const spire = new THREE.Mesh(spireGeo, spireMat);
  spire.position.set(0, 98, 0);
  spire.rotation.y = Math.PI / 4;
  clockGroup.add(spire);

  // Cung điện Westminster trải dài 2 bên tháp
  const wingGeo = new THREE.BoxGeometry(32, 22, 10);
  const wingLeft = new THREE.Mesh(wingGeo, stoneMat);
  wingLeft.position.set(-23, 11, -2);
  clockGroup.add(wingLeft);

  const wingRight = new THREE.Mesh(wingGeo, stoneMat);
  wingRight.position.set(23, 11, -2);
  clockGroup.add(wingRight);

  group.add(clockGroup);
}

/**
 * 4. TƯỢNG NỮ THẦN TỰ DO & SKYLINE NEW YORK (MỸ)
 */
function buildNewYorkScenery(THREE, group) {
  const nyGroup = new THREE.Group();
  nyGroup.position.set(0, 0, -65);

  const copperMat = new THREE.MeshStandardMaterial({
    color: 0x69a297, // Patina copper green
    roughness: 0.6,
    metalness: 0.2
  });

  const stonePedestalMat = new THREE.MeshStandardMaterial({
    color: 0x9ca3af,
    roughness: 0.8
  });

  const goldFlameMat = new THREE.MeshBasicMaterial({
    color: 0xffb703
  });

  // Bệ đỡ tượng Nữ Thần Tự Do (Fort Wood + Pedestal)
  const baseStar = new THREE.Mesh(new THREE.CylinderGeometry(10, 14, 8, 8), stonePedestalMat);
  baseStar.position.set(0, 4, 0);
  nyGroup.add(baseStar);

  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(7, 16, 7), stonePedestalMat);
  pedestal.position.set(0, 16, 0);
  nyGroup.add(pedestal);

  // Thân tượng với áo choàng
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.8, 18, 12), copperMat);
  robe.position.set(0, 33, 0);
  nyGroup.add(robe);

  // Đầu và vương miện 7 tia hào quang
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 12), copperMat);
  head.position.set(0, 44, 0);
  nyGroup.add(head);

  const crownGeo = new THREE.ConeGeometry(2.4, 2, 7);
  const crown = new THREE.Mesh(crownGeo, copperMat);
  crown.position.set(0, 45.6, 0);
  nyGroup.add(crown);

  // Cánh tay giơ cao cầm ngọn đuốc
  const armGeo = new THREE.CylinderGeometry(0.6, 0.7, 10);
  const arm = new THREE.Mesh(armGeo, copperMat);
  arm.position.set(2.4, 46, 0);
  arm.rotation.z = -0.35;
  nyGroup.add(arm);

  // Ngọn đuốc bốc lửa vàng sáng rực
  const torchMesh = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), goldFlameMat);
  torchMesh.position.set(4.2, 52, 0);
  nyGroup.add(torchMesh);

  // Các tòa cao ốc chọc trời Manhattan ở hậu cảnh
  const nySkyscrapers = [
    { x: -34, z: -16, w: 9, h: 62, d: 9, col: 0x1f2937 }, // Empire State vibe
    { x: -20, z: -20, w: 12, h: 78, d: 11, col: 0x111827 }, // One WTC vibe
    { x: 22, z: -18, w: 10, h: 72, d: 10, col: 0x1e293b }, // Chrysler vibe
    { x: 36, z: -14, w: 11, h: 54, d: 11, col: 0x334155 }
  ];
  nySkyscrapers.forEach(b => {
    const bMesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), new THREE.MeshStandardMaterial({
      color: b.col,
      roughness: 0.3,
      metalness: 0.7
    }));
    bMesh.position.set(b.x, b.h / 2, b.z);
    nyGroup.add(bMesh);

    // Chóp nhọn Art Deco
    const spire = new THREE.Mesh(new THREE.ConeGeometry(1.8, 16, 4), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    spire.position.set(b.x, b.h + 8, b.z);
    nyGroup.add(spire);
  });

  group.add(nyGroup);
}

/**
 * 5. BÃI BIỂN NHIỆT ĐỚI NHA TRANG (KHÁNH HÒA, VIỆT NAM)
 */
function buildNhaTrangScenery(THREE, group) {
  const beachGroup = new THREE.Group();
  beachGroup.position.set(0, 0, -58);

  // Mặt biển xanh ngọc bích trải dài
  const seaGeo = new THREE.PlaneGeometry(160, 60);
  const seaMat = new THREE.MeshStandardMaterial({
    color: 0x0096c7,
    roughness: 0.1,
    metalness: 0.6,
    transparent: true,
    opacity: 0.88
  });
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.1, -12);
  beachGroup.add(sea);

  // Bờ cát vàng óng
  const sandGeo = new THREE.PlaneGeometry(160, 24);
  const sandMat = new THREE.MeshStandardMaterial({
    color: 0xf4d35e,
    roughness: 0.95
  });
  const sand = new THREE.Mesh(sandGeo, sandMat);
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.15, 8);
  beachGroup.add(sand);

  // Hòn Mun / Đảo Vinpearl nhấp nhô xa xa
  const islandGeo = new THREE.ConeGeometry(24, 18, 7);
  const islandMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.9 });
  const island1 = new THREE.Mesh(islandGeo, islandMat);
  island1.position.set(-38, 7, -32);
  beachGroup.add(island1);

  const island2 = new THREE.Mesh(islandGeo, islandMat);
  island2.position.set(36, 9, -36);
  beachGroup.add(island2);

  // Hàng dừa nhiệt đới đung đưa bên bờ cát
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7f4f24, roughness: 0.8 });
  const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x38b000, side: THREE.DoubleSide });

  const palms = [
    { x: -24, z: 6, rotZ: 0.12 },
    { x: -16, z: 9, rotZ: -0.08 },
    { x: 18, z: 7, rotZ: -0.14 },
    { x: 26, z: 9, rotZ: 0.1 }
  ];

  palms.forEach(p => {
    const palm = new THREE.Group();
    palm.position.set(p.x, 0, p.z);
    palm.rotation.z = p.rotZ;

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.7, 14, 8), trunkMat);
    trunk.position.y = 7;
    palm.add(trunk);

    // Tán lá dừa xoè tròn
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const leafGeo = new THREE.ConeGeometry(1.6, 6, 4);
      const leaf = new THREE.Mesh(leafGeo, palmLeafMat);
      leaf.position.set(Math.cos(angle) * 2.8, 14, Math.sin(angle) * 2.8);
      leaf.rotation.x = Math.sin(angle) * 0.7;
      leaf.rotation.z = -Math.cos(angle) * 0.7;
      palm.add(leaf);
    }
    beachGroup.add(palm);
  });

  group.add(beachGroup);
}

/**
 * 6. ĐẤU TRƯỜNG HACHIHI CYBER ARENA 2026 (VIỆT NAM)
 */
function buildHachihiCyberScenery(THREE, group) {
  const cyberGroup = new THREE.Group();
  cyberGroup.position.set(0, 0, -60);

  // Vòm thép mái khổng lồ Cyber Dome
  const domeMat = new THREE.MeshBasicMaterial({
    color: 0x8b5cf6,
    wireframe: true,
    transparent: true,
    opacity: 0.35
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(65, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
  dome.position.set(0, 0, 10);
  cyberGroup.add(dome);

  // Vòng năng lượng Neon xoay
  const ringGeo = new THREE.TorusGeometry(32, 0.65, 8, 48);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 26, 0);
  cyberGroup.add(ring);

  // 2 Trụ đèn laser khổng lồ hướng thẳng lên vũ trụ
  const pillarMat = new THREE.MeshBasicMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.6
  });
  const beamLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 4, 120, 8), pillarMat);
  beamLeft.position.set(-28, 60, 0);
  cyberGroup.add(beamLeft);

  const beamRight = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 4, 120, 8), pillarMat);
  beamRight.position.set(28, 60, 0);
  cyberGroup.add(beamRight);

  // Biển hiệu Hologram HACHIHI 2026
  const bannerGeo = new THREE.BoxGeometry(26, 4.5, 0.4);
  const bannerMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const banner = new THREE.Mesh(bannerGeo, bannerMat);
  banner.position.set(0, 36, -5);
  cyberGroup.add(banner);

  group.add(cyberGroup);
}
