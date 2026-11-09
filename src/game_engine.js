import*as o from"three";import*as __sr from"./slot_roles.js";import{applyRallyResult,getGameWinner,startNextGame,isTwoBounceViolation,isKitchenVolleyFault}from"./rules_engine.js";import{GLTFLoader as D}from"../assets/vendor/GLTFLoader.js";import{HudUI as Y}from"./hud_ui.js";import*as z from"./motion_controls.js";import*as U from"./audio_engine.js";import{RacketKinematicsController as Z}from"./racket_kinematics.js";import{upgradeMiiCharacterMaterials as $,upgradeRacketMaterials as q,updateCharacterContactShadow as j}from"./mii_model_overhaul.js";import{MiiBodyAnimator as Q}from"./mii_body_animation.js";import{MiiFacialFXController as J}from"./mii_facial_fx.js";import{SwingVFXManager as ee}from"./swing_vfx.js";import{MatchManager as MM}from"./match_manager.js";import{BotController as BC}from"./bot/bot_controller.js";import{StadiumLife as SL}from"./stadium_life.js";import{PlayerMarkers as PM}from"./player_marker.js";import{SCENERIES,createSceneryGroup}from"./court_scenery.js";const S={BASELINE_Z:11.89,SERVICE_LINE_Z:6.4,SINGLES_X:4.115,DOUBLES_X:5.485,NET_HEIGHT_CENTER:.914,NET_HEIGHT_POST:1.07,NET_POST_X:6.4},L={FIXED_DT:1/120,GRAVITY:9.15,AIR_DRAG:.012,BOUNCE_RESTITUTION:.77,SURFACE_FRICTION:.86},W=["00","15","30","40"];class te{constructor(e,t=45){this.scene=e,this.maxPoints=t,this.points=[],this.color=new o.Color(16777215),this.accentColor=new o.Color(16773494),this.baseWidth=.28;const i=t*2;this.positions=new Float32Array(i*3),this.colors=new Float32Array(i*4);const a=[];for(let s=0;s<t-1;s++){const n=s*2,h=n+1,r=n+2,l=n+3;a.push(n,h,r,h,l,r)}this.geometry=new o.BufferGeometry,this.geometry.setAttribute("position",new o.BufferAttribute(this.positions,3)),this.geometry.setAttribute("color",new o.BufferAttribute(this.colors,4)),this.geometry.setIndex(a),this.material=new o.MeshBasicMaterial({vertexColors:!0,transparent:!0,opacity:.95,side:o.DoubleSide,depthWrite:!1,blending:o.NormalBlending}),this.mesh=new o.Mesh(this.geometry,this.material),this.mesh.frustumCulled=!1,this.mesh.renderOrder=6,this.scene.add(this.mesh)}setStyle(e="TOPSPIN",t=!1){const i=String(e||"TOPSPIN").toUpperCase();t||i==="SMASH"||i==="POWER"?(this.color.setHex(16777215),this.accentColor.setHex(5432831),this.baseWidth=.3):i==="SLICE"?(this.color.setHex(16777215),this.accentColor.setHex(8974591),this.baseWidth=.28):i==="LOB"?(this.color.setHex(16777215),this.accentColor.setHex(15661311),this.baseWidth=.25):(this.color.setHex(16777215),this.accentColor.setHex(16771925),this.baseWidth=.28)}clear(){this.points.length=0,this.mesh.visible=!1}pushPoint(e){this.points.unshift(e.clone()),this.points.length>this.maxPoints&&this.points.pop()}seedArc(e,t,i=.85){this.points.length=0;for(let a=0;a<this.maxPoints;a++){const n=1-a/(this.maxPoints-1),h=new o.Vector3().lerpVectors(e,t,n);h.y+=Math.sin(n*Math.PI)*i,this.points.push(h)}this.mesh.visible=!0}updateGeometry(e){const t=this.points.length;if(t<2){this.mesh.visible=!1;return}this.mesh.visible=!0;const i=e.position,a=new o.Vector3,s=new o.Vector3,n=new o.Vector3,h=new o.Color;for(let r=0;r<this.maxPoints;r++){const l=Math.min(r,t-1),p=this.points[l],g=Math.min(l+1,t-1),c=Math.max(l-1,0);a.subVectors(this.points[c],this.points[g]),a.lengthSq()<1e-6?a.set(0,0,1):a.normalize(),s.subVectors(i,p).normalize(),n.crossVectors(a,s).normalize(),n.lengthSq()<1e-4&&n.set(1,0,0);const y=1-l/Math.max(1,t-1),f=this.baseWidth*(.24+.76*Math.pow(y,.65))*.5,m=Math.pow(y,.9)*.92;h.copy(this.color).lerp(this.accentColor,(1-y)*.65);const d=r*2,b=d+1;this.positions[d*3+0]=p.x+n.x*f,this.positions[d*3+1]=p.y+n.y*f,this.positions[d*3+2]=p.z+n.z*f,this.positions[b*3+0]=p.x-n.x*f,this.positions[b*3+1]=p.y-n.y*f,this.positions[b*3+2]=p.z-n.z*f,this.colors[d*4+0]=h.r,this.colors[d*4+1]=h.g,this.colors[d*4+2]=h.b,this.colors[d*4+3]=m,this.colors[b*4+0]=h.r,this.colors[b*4+1]=h.g,this.colors[b*4+2]=h.b,this.colors[b*4+3]=m}this.geometry.attributes.position.needsUpdate=!0,this.geometry.attributes.color.needsUpdate=!0}}function se(){const P=new o.RingGeometry(.22,.72,28,1,-Math.PI*.28,Math.PI*.56),e=P.attributes.position,t=new Float32Array(e.count*4);for(let s=0;s<e.count;s++){const n=e.getX(s),h=e.getY(s),l=(Math.atan2(h,n)+Math.PI*.28)/(Math.PI*.56),g=(Math.hypot(n,h)-.22)/(.72-.22),c=Math.max(0,Math.min(1,l*(.35+.65*g)));t[s*4+0]=.97,t[s*4+1]=.99,t[s*4+2]=1,t[s*4+3]=c*.85}P.setAttribute("color",new o.BufferAttribute(t,4));const i=new o.MeshBasicMaterial({vertexColors:!0,transparent:!0,opacity:.88,side:o.DoubleSide,depthWrite:!1}),a=new o.Mesh(P,i);return a.visible=!1,a.renderOrder=7,a}function ie(){const P=document.createElement("canvas");P.width=128,P.height=128;const e=P.getContext("2d"),t=e.createRadialGradient(64,64,6,64,64,60);return t.addColorStop(0,"rgba(10, 24, 8, 0.78)"),t.addColorStop(.55,"rgba(10, 24, 8, 0.46)"),t.addColorStop(1,"rgba(10, 24, 8, 0.0)"),e.fillStyle=t,e.fillRect(0,0,128,128),new o.CanvasTexture(P)}function ae(){const P=document.createElement("canvas");P.width=1024,P.height=512;const e=P.getContext("2d"),t=e.createLinearGradient(0,0,0,320);t.addColorStop(0,"#2e86e6"),t.addColorStop(.42,"#5cb2ff"),t.addColorStop(.78,"#a6dcff"),t.addColorStop(1,"#def4ff"),e.fillStyle=t,e.fillRect(0,0,1024,512),[[120,185,95,38],[180,175,110,44],[250,188,85,34],[460,168,120,45],[535,160,130,50],[610,174,95,36],[820,180,115,42],[895,170,125,48],[960,184,90,35]].forEach(([s,n,h,r])=>{const l=e.createRadialGradient(s,n-r*.2,h*.1,s,n,h);l.addColorStop(0,"rgba(255, 255, 255, 0.92)"),l.addColorStop(.6,"rgba(245, 252, 255, 0.55)"),l.addColorStop(1,"rgba(255, 255, 255, 0.0)"),e.fillStyle=l,e.beginPath(),e.ellipse(s,n,h,r,0,0,Math.PI*2),e.fill()});const a=new o.CanvasTexture(P);return a.colorSpace=o.SRGBColorSpace,a}
function createPickleballCourtTexture(threeLib){
  const c=document.createElement("canvas");
  c.width=2048;c.height=4096;
  const ctx=c.getContext("2d");

  // 1. Apron floor (outer stadium flooring) - deep navy / asphalt indoor sports court
  ctx.fillStyle="#071322";
  ctx.fillRect(0,0,2048,4096);

  // Subtle floor sports grain
  ctx.fillStyle="rgba(255,255,255,0.016)";
  for(let y=0;y<4096;y+=8){
    ctx.fillRect(0,y,2048,4);
  }

  // 2. Exact world coordinates mapped to 2048x4096 on a 24m x 36m plane:
  // x in [-12, +12] => cx = 1024 + (x / 12) * 1024
  // z in [-18, +18] => cy = 2048 + (z / 18) * 2048
  const leftX=673,rightX=1375;
  const topY=695,botY=3401;
  const courtW=rightX-leftX; // 702px (~8.23m)
  const netY=2048;
  const nvzTopY=1803; // 2048 - 2.15*(2048/18)
  const nvzBotY=2293; // 2048 + 2.15*(2048/18)

  // 3. Service Courts: Vibrant Tournament Ocean Blue (matching tournament photos)
  const blueGradTop=ctx.createLinearGradient(leftX,topY,rightX,nvzTopY);
  blueGradTop.addColorStop(0,"#0284c7");
  blueGradTop.addColorStop(1,"#0369a1");
  ctx.fillStyle=blueGradTop;
  ctx.fillRect(leftX,topY,courtW,nvzTopY-topY);

  const blueGradBot=ctx.createLinearGradient(leftX,nvzBotY,rightX,botY);
  blueGradBot.addColorStop(0,"#0369a1");
  blueGradBot.addColorStop(1,"#0284c7");
  ctx.fillStyle=blueGradBot;
  ctx.fillRect(leftX,nvzBotY,courtW,botY-nvzBotY);

  // 4. Kitchen / Non-Volley Zone (NVZ): Royal Tournament Purple (matching tournament photos)
  const purpleGrad=ctx.createLinearGradient(leftX,nvzTopY,rightX,nvzBotY);
  purpleGrad.addColorStop(0,"#7c3aed");
  purpleGrad.addColorStop(0.5,"#6d28d9");
  purpleGrad.addColorStop(1,"#7c3aed");
  ctx.fillStyle=purpleGrad;
  ctx.fillRect(leftX,nvzTopY,courtW,nvzBotY-nvzTopY);

  // Subtle acrylic sports texture inside the court
  ctx.fillStyle="rgba(255,255,255,0.03)";
  for(let y=topY;y<botY;y+=12){
    ctx.fillRect(leftX,y,courtW,5);
  }

  // 5. Stenciled Official Markings on the Kitchen Floor
  ctx.save();
  ctx.textAlign="center";
  ctx.textBaseline="middle";

  // Opponent Kitchen Stencil (rotated 180 deg)
  ctx.save();
  ctx.translate(1024,(netY+nvzTopY)/2);
  ctx.rotate(Math.PI);
  ctx.font="900 36px -apple-system, sans-serif";
  ctx.fillStyle="rgba(255,255,255,0.55)";
  ctx.fillText("VÙNG BẾP • NON-VOLLEY ZONE (7 FT)",0,-18);
  ctx.font="bold 20px -apple-system, sans-serif";
  ctx.fillStyle="rgba(245,158,11,0.7)";
  ctx.fillText("⚠ CẤM ĐỨNG BẮT VÔ-LÊ TRỰC TIẾP TRONG VÙNG NÀY ⚠",0,20);
  ctx.restore();

  // Player Kitchen Stencil
  ctx.save();
  ctx.translate(1024,(netY+nvzBotY)/2);
  ctx.font="900 36px -apple-system, sans-serif";
  ctx.fillStyle="rgba(255,255,255,0.55)";
  ctx.fillText("VÙNG BẾP • NON-VOLLEY ZONE (7 FT)",0,-18);
  ctx.font="bold 20px -apple-system, sans-serif";
  ctx.fillStyle="rgba(245,158,11,0.7)";
  ctx.fillText("⚠ CẤM ĐỨNG BẮT VÔ-LÊ TRỰC TIẾP TRONG VÙNG NÀY ⚠",0,20);
  ctx.restore();

  // 6. Backcourt Arena Logos
  ctx.save();
  ctx.translate(1024,botY-140);
  ctx.font="900 46px -apple-system, sans-serif";
  ctx.fillStyle="rgba(255,255,255,0.38)";
  ctx.fillText("HACHIHI PICKLEBALL MỞ RỘNG 2026",0,-22);
  ctx.font="bold 22px -apple-system, sans-serif";
  ctx.fillStyle="rgba(245,158,11,0.6)";
  ctx.fillText("KẾT NỐI ĐAM MÊ • BỨT PHÁ GIỚI HẠN • 17 NĂM HOÀNG MAI",0,24);
  ctx.restore();

  ctx.save();
  ctx.translate(1024,topY+140);
  ctx.rotate(Math.PI);
  ctx.font="900 46px -apple-system, sans-serif";
  ctx.fillStyle="rgba(255,255,255,0.38)";
  ctx.fillText("HACHIHI PICKLEBALL MỞ RỘNG 2026",0,-22);
  ctx.font="bold 22px -apple-system, sans-serif";
  ctx.fillStyle="rgba(245,158,11,0.6)";
  ctx.fillText("KẾT NỐI ĐAM MÊ • BỨT PHÁ GIỚI HẠN • 17 NĂM HOÀNG MAI",0,24);
  ctx.restore();

  // 7. White Boundary Lines (50mm regulation / 14px on 2048x4096 canvas)
  ctx.strokeStyle="#ffffff";
  ctx.lineWidth=14;
  ctx.lineCap="square";
  ctx.lineJoin="miter";

  // Perimeter rectangle
  ctx.strokeRect(leftX,topY,courtW,botY-topY);

  // Kitchen lines
  ctx.beginPath();
  ctx.moveTo(leftX,nvzTopY);ctx.lineTo(rightX,nvzTopY);
  ctx.moveTo(leftX,nvzBotY);ctx.lineTo(rightX,nvzBotY);
  ctx.stroke();

  // Centerlines (baseline to kitchen line only, NOT inside the kitchen!)
  ctx.beginPath();
  ctx.moveTo(1024,topY);ctx.lineTo(1024,nvzTopY);
  ctx.moveTo(1024,nvzBotY);ctx.lineTo(1024,botY);
  ctx.stroke();

  ctx.restore();

  const tex=new threeLib.CanvasTexture(c);
  tex.colorSpace=threeLib.SRGBColorSpace;
  tex.anisotropy=8;
  return tex;
}

function createPickleballBallTexture(threeLib){
  const c=document.createElement("canvas");
  c.width=512;c.height=256;
  const ctx=c.getContext("2d");
  // Neon yellow wiffle ball base
  ctx.fillStyle="#e6f827";
  ctx.fillRect(0,0,512,256);

  const g=ctx.createLinearGradient(0,0,0,256);
  g.addColorStop(0,"rgba(255,255,255,0.22)");
  g.addColorStop(0.5,"rgba(0,0,0,0.0)");
  g.addColorStop(1,"rgba(0,0,0,0.18)");
  ctx.fillStyle=g;ctx.fillRect(0,0,512,256);

  // 40 perforated wiffle holes with 3D depth
  for(let row=0;row<5;row++){
    const y=28+row*50;
    const isEven=row%2===0;
    const count=isEven?8:7;
    const startX=isEven?32:68;
    for(let col=0;col<count;col++){
      const x=startX+col*64;
      ctx.fillStyle="#1b3612";
      ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#081405";
      ctx.beginPath();ctx.arc(x,y+1.5,7,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,0.6)";
      ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(x,y,9,Math.PI*0.8,Math.PI*1.8);ctx.stroke();
    }
  }
  ctx.fillStyle="rgba(20,50,20,0.55)";
  ctx.font="bold 15px -apple-system, sans-serif";
  ctx.textAlign="center";
  ctx.fillText("HACHIHI 40 DURA-PRO",256,128);

  const tex=new threeLib.CanvasTexture(c);
  tex.colorSpace=threeLib.SRGBColorSpace;
  return tex;
}

function createPickleballPaddleTexture(threeLib,role="player"){
  const c=document.createElement("canvas");
  c.width=512;c.height=512;
  const ctx=c.getContext("2d");
  ctx.fillStyle=role==="player"?"#111827":"#1e1b4b";
  ctx.fillRect(0,0,512,512);

  // Raw carbon fiber micro-weave
  ctx.fillStyle="rgba(255,255,255,0.04)";
  for(let x=0;x<512;x+=8){
    for(let y=0;y<512;y+=8){
      if(((x/8)+(y/8))%2===0)ctx.fillRect(x,y,8,8);
    }
  }
  
  // Perimeter accent stroke
  ctx.strokeStyle=role==="player"?"#0284c7":"#7c3aed";
  ctx.lineWidth=12;
  ctx.strokeRect(28,28,456,456);

  ctx.fillStyle="#ffffff";
  ctx.font="900 42px -apple-system, sans-serif";
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText("HACHIHI",256,210);
  ctx.fillStyle=role==="player"?"#38bdf8":"#c084fc";
  ctx.font="bold 22px -apple-system, sans-serif";
  ctx.fillText("CARBON T700 PRO",256,260);
  ctx.font="bold 14px -apple-system, sans-serif";
  ctx.fillStyle="rgba(255,255,255,0.65)";
  ctx.fillText("USAPA APPROVED • 16MM CORE",256,305);

  const tex=new threeLib.CanvasTexture(c);
  tex.colorSpace=threeLib.SRGBColorSpace;
  return tex;
}

function createPickleballPaddleMesh(threeLib,role="player"){
  const group=new threeLib.Group();
  
  // 1. Solid Paddle Blade (rounded rectangle with 16mm depth)
  const shape=new threeLib.Shape();
  const w=0.195,h=0.27,r=0.042;
  const x0=-w/2,y0=0.12;
  shape.moveTo(x0+r,y0);
  shape.lineTo(x0+w-r,y0);
  shape.quadraticCurveTo(x0+w,y0,x0+w,y0+r);
  shape.lineTo(x0+w,y0+h-r);
  shape.quadraticCurveTo(x0+w,y0+h,x0+w-r,y0+h);
  shape.lineTo(x0+r,y0+h);
  shape.quadraticCurveTo(x0,y0+h,x0,y0+h-r);
  shape.lineTo(x0,y0+r);
  shape.quadraticCurveTo(x0,y0,x0+r,y0);

  const extrudeSettings={
    steps:1,
    depth:0.016,
    bevelEnabled:true,
    bevelThickness:0.003,
    bevelSize:0.003,
    bevelSegments:2
  };
  const bladeGeo=new threeLib.ExtrudeGeometry(shape,extrudeSettings);
  bladeGeo.center();
  bladeGeo.translate(0,0.265,0);

  const padTex=createPickleballPaddleTexture(threeLib,role);
  const bladeMat=new threeLib.MeshStandardMaterial({
    map:padTex,
    roughness:0.35,
    metalness:0.12,
    color:0xffffff
  });
  const bladeMesh=new threeLib.Mesh(bladeGeo,bladeMat);
  bladeMesh.castShadow=true;
  bladeMesh.receiveShadow=true;
  group.add(bladeMesh);

  // 2. Handle Grip Wrap
  const handleGeo=new threeLib.CylinderGeometry(0.016,0.0175,0.135,12);
  const handleMat=new threeLib.MeshStandardMaterial({
    color:role==="player"?0xf8fafc:0xd1d5db,
    roughness:0.85
  });
  const handleMesh=new threeLib.Mesh(handleGeo,handleMat);
  handleMesh.position.set(0,0.065,0);
  handleMesh.castShadow=true;
  group.add(handleMesh);

  // 3. Butt Cap
  const buttGeo=new threeLib.CylinderGeometry(0.020,0.020,0.014,12);
  const buttMat=new threeLib.MeshStandardMaterial({color:0x0f172a,roughness:0.5});
  const buttMesh=new threeLib.Mesh(buttGeo,buttMat);
  buttMesh.position.set(0,-0.002,0);
  group.add(buttMesh);

  // 4. Throat Collar Band
  const collarGeo=new threeLib.CylinderGeometry(0.019,0.017,0.018,12);
  const collarMat=new threeLib.MeshStandardMaterial({
    color:role==="player"?0x0284c7:0x7c3aed,
    roughness:0.3
  });
  const collarMesh=new threeLib.Mesh(collarGeo,collarMat);
  collarMesh.position.set(0,0.132,0);
  group.add(collarMesh);

  return group;
}

export class ArgonTennisEngine{constructor(){this.params=new URLSearchParams(window.location.search),this.urlState=(this.params.get("state")||"").toLowerCase(),this.urlRoom=(this.params.get("room")||"").trim().toUpperCase(),this.urlRole=__sr.normRole((this.params.get("role")||"p1").trim()),this.urlMode=(this.params.get("mode")||this.params.get("difficulty")||"").toLowerCase(),this.urlAutoPlay=this.params.has("play")||!!this.urlState,this.roomId=this.urlRoom||"default",this.playerRole=this.urlRole==="p1"?"p1":"p2",this.controlRole=this.urlRole,this.localSlot=__sr.slotForRole(this.urlRole),this.viewTeam=__sr.teamOfSlot(this.localSlot),this.isMultiplayer=!!(this.urlRoom&&this.urlRoom!=="DEFAULT")||this.urlMode==="1v1",this.roomStatus={roomId:this.roomId,p1Online:!0,p2Online:!1,p1Phone:!1,p2Phone:!1,tunnelUrl:"",urls:null},this.lastAppliedSnapshotSeq=0,this.lastSyncSentAt=0,this.bannerSeq=0,this.lastBannerBroadcast=null,this.canvas=document.getElementById("game-canvas"),this.renderer=new o.WebGLRenderer({canvas:this.canvas,antialias:!0,powerPreference:"high-performance"}),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,(window.matchMedia&&window.matchMedia("(pointer: coarse)").matches)?1.5:2)),this.renderer.setSize(window.innerWidth,window.innerHeight),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=o.PCFSoftShadowMap,this.renderer.outputColorSpace=o.SRGBColorSpace,this.renderer.toneMapping=o.ACESFilmicToneMapping,this.renderer.toneMappingExposure=1.12,this.scene=new o.Scene,this.scene.background=new o.Color(7914239),this.scene.fog=new o.FogExp2(12313855,.0038),this.camera=new o.PerspectiveCamera(45,window.innerWidth/window.innerHeight,.1,260),this.cameraMode="RALLY_CAM",this.manualCameraOverride=null,this.cameraPosSmooth=new o.Vector3(0,7.8,22.8),this.cameraLookSmooth=new o.Vector3(0,.35,1.8),this.cameraTrauma=0,this.isPaused=!1,this.gameMode="offline",this.pendingSessionCache=null,this.currentSceneryId=(localStorage.getItem("hachihi_selected_scenery")||"landmark81"),this.currentSceneryMesh=null;const e=this.isMultiplayer?"1v1":["casual","pro","1v1"].includes(this.urlMode)?this.urlMode:"casual";this.matchConfig={gamesToWin:e==="1v1"?1:2,inputMode:"mouse",difficulty:e},this.matchType=(this.urlMode==="singles"||this.params.get("format")==="singles")?"singles":"doubles",this.matchManager=new MM({roomId:this.roomId,matchType:this.matchType,hostName:"Hachihi Pro"}),this.botControllers=new Map,this.score={playerPoints:0,opponentPoints:0,playerGames:0,opponentGames:0,server:"player",serverNumber:2,deuceSide:!0},this.targetPoints=11,this.phase="TITLE",this.phaseTimer=0,this.selectedShotType="TOPSPIN",this.p2SelectedShotType="TOPSPIN",this.autoPlayMode=this.urlAutoPlay,this.userHasInteracted=!1,this.persistentStateLock=!1,this.pendingUserSwing=null,this.pendingP2Swing=null,this.pendingServeSwing=null,this.ball={mesh:null,pos:new o.Vector3(.85,1.15,11.6),vel:new o.Vector3(0,0,0),spin:new o.Vector3(0,0,0),inPlay:!1,lastHitter:"player",bounceCountOnCurrentSide:0,shotType:"TOPSPIN",isPowerShot:!1,rallyStrokeCount:0,targetLanding:new o.Vector3(0,0,-8.5)},this.player=this._createActorState("player",1,new o.Vector3(1.15,0,S.BASELINE_Z)),this.playerPartner=this._createActorState("player_partner",1,new o.Vector3(-2.1,0,5.4)),this.opponent=this._createActorState("opponent",-1,new o.Vector3(-1.35,0,-S.BASELINE_Z)),this.opponentPartner=this._createActorState("opponent_partner",-1,new o.Vector3(2.1,0,-5.4)),this._applyDifficultyTuning(this.matchConfig.difficulty),this.crowdScene=null,this.cheerEnergy=.25,this.ballTrail=new te(this.scene,45),this.bounceRings=[],this.starParticles=[],this.racketKinematics=new Z,this.bodyAnimator=new Q,this.facialFX=new J(this.scene),this.swingVfx=new ee(this.scene),this._setupLightingAndSky(),this._setupEffectsPools(),this._initHudAndControllers(),this.applyLineupConfiguration(this.matchManager.getState()),this.clock=new o.Clock,this.physicsAccumulator=0,this.elapsedTime=0,window.addEventListener("resize",()=>this._onResize())}setGameMatchType(e){this.matchType=e;const t=(e==="singles");this.playerPartner&&(this.playerPartner.root.visible=!t);this.playerPartner&&this.playerPartner.shadowBlob&&(this.playerPartner.shadowBlob.visible=!t);this.opponentPartner&&(this.opponentPartner.root.visible=!t);this.opponentPartner&&this.opponentPartner.shadowBlob&&(this.opponentPartner.shadowBlob.visible=!t)}applyLineupConfiguration({matchType:e,slots:t,actorMapping:i}){this.setGameMatchType(e);this.botControllers.clear();const a=i||(this.matchManager?this.matchManager.getActorMapping():null);if(!a)return;if(a.player&&a.player.playerType==="bot"){this.botControllers.set("A1",new BC(this.player,{slotId:"A1",playerType:"bot",botName:a.player.botName||"Alex (AI)",botDifficulty:a.player.botDifficulty||"normal",matchType:e}));}if(e==="doubles"&&a.playerPartner&&a.playerPartner.playerType==="bot"){this.botControllers.set("A2",new BC(this.playerPartner,{slotId:"A2",playerType:"bot",botName:a.playerPartner.botName||"Maya (AI)",botDifficulty:a.playerPartner.botDifficulty||"normal",matchType:e}));}if(a.opponent&&a.opponent.playerType==="bot"){this.botControllers.set("B1",new BC(this.opponent,{slotId:"B1",playerType:"bot",botName:a.opponent.botName||"Matt (AI)",botDifficulty:a.opponent.botDifficulty||"normal",matchType:e}));}if(e==="doubles"&&a.opponentPartner&&a.opponentPartner.playerType==="bot"){this.botControllers.set("B2",new BC(this.opponentPartner,{slotId:"B2",playerType:"bot",botName:a.opponentPartner.botName||"Akira (AI)",botDifficulty:a.opponentPartner.botDifficulty||"normal",matchType:e}));}}_createActorState(e,t,i){const a={player:9.8,player_partner:8.4,opponent:5.85,opponent_partner:5.2};return{role:e,sideSign:t,root:new o.Group,model:null,parts:{},racketPivot:new o.Group,racketMesh:null,swingArcMesh:null,shadowBlob:null,pos:i.clone(),vel:new o.Vector3,targetPos:i.clone(),maxSpeed:a[e]||8.2,stridePhase:0,swingTimer:0,swingDuration:.34,swingCooldown:0,swingType:"forehand",arcVisibleTimer:0}}_applyDifficultyTuning(e="casual"){const t=String(e||"casual").toLowerCase();this.matchConfig.difficulty=t,t==="1v1"?(this.isMultiplayer=!0,this.matchConfig.gamesToWin=1,this.player.maxSpeed=9.8,this.playerPartner.maxSpeed=8.4,this.opponent.maxSpeed=9.6,this.opponentPartner.maxSpeed=8.2):t==="pro"?(this.isMultiplayer=!!(this.urlRoom&&this.urlRoom!=="DEFAULT"),this.player.maxSpeed=9.8,this.playerPartner.maxSpeed=8.4,this.opponent.maxSpeed=7.65,this.opponentPartner.maxSpeed=6.6):(this.isMultiplayer=!!(this.urlRoom&&this.urlRoom!=="DEFAULT"),this.player.maxSpeed=10.2,this.playerPartner.maxSpeed=8.6,this.opponent.maxSpeed=5.85,this.opponentPartner.maxSpeed=5.15)}_setupLightingAndSky(){const e=new o.TextureLoader,t=new o.SphereGeometry(185,36,20),i=new o.MeshBasicMaterial({map:ae(),side:o.BackSide,depthWrite:!1,fog:!1});this.skyDome=new o.Mesh(t,i),this.scene.add(this.skyDome),e.load("https://www.gstatic.com/aistudio/starter-apps/tennis/textures/court/tns_sky_a.png",c=>{c.colorSpace=o.SRGBColorSpace,c.wrapS=o.RepeatWrapping,c.wrapT=o.ClampToEdgeWrapping,c.repeat.set(8,1),i.map=c,i.needsUpdate=!0});const a=(c,y,f,m,d)=>{const b=new o.CylinderGeometry(c,c,y,48,1,!0),u=new o.MeshBasicMaterial({transparent:!0,opacity:.92,side:o.BackSide,depthWrite:!1,fog:!1}),w=new o.Mesh(b,u);return w.position.y=f,w.renderOrder=d,w.visible=!1,this.scene.add(w),e.load(m,x=>{x.colorSpace=o.SRGBColorSpace,x.wrapS=o.RepeatWrapping,x.wrapT=o.ClampToEdgeWrapping,x.repeat.set(8,1),u.map=x,u.needsUpdate=!0,w.visible=!0}),w};this.cloudRing2=a(152,54,24,"https://www.gstatic.com/aistudio/starter-apps/tennis/textures/court/cloud02.png",-2),this.cloudRing1=a(138,46,19,"https://www.gstatic.com/aistudio/starter-apps/tennis/textures/court/cloud01.png",-1);const s=new o.CylinderGeometry(96,96,15.5,64,1,!0),n=new o.MeshBasicMaterial({transparent:!0,alphaTest:.15,side:o.BackSide,depthWrite:!1});this.horizonRing=new o.Mesh(s,n),this.horizonRing.position.y=7.2,this.horizonRing.visible=!1,this.scene.add(this.horizonRing),e.load("https://www.gstatic.com/aistudio/starter-apps/tennis/textures/court/tns_BG_c1.png",c=>{c.colorSpace=o.SRGBColorSpace,c.wrapS=o.RepeatWrapping,c.wrapT=o.ClampToEdgeWrapping,c.repeat.set(8,1),n.map=c,n.needsUpdate=!0,this.horizonRing.visible=!0});const h=new o.HemisphereLight(10935551,5612068,1.22);h.position.set(0,40,0),this.hemiLight=h,this.scene.add(h),this.sunLight=new o.DirectionalLight(16775660,2.55),this.sunLight.position.set(14.5,25,15),this.sunLight.castShadow=!0,this.sunLight.shadow.mapSize.width=(window.matchMedia&&window.matchMedia("(pointer: coarse)").matches)?1024:2048,this.sunLight.shadow.mapSize.height=(window.matchMedia&&window.matchMedia("(pointer: coarse)").matches)?1024:2048,this.sunLight.shadow.camera.near=2,this.sunLight.shadow.camera.far=75;const r=22;this.sunLight.shadow.camera.left=-r,this.sunLight.shadow.camera.right=r,this.sunLight.shadow.camera.top=r,this.sunLight.shadow.camera.bottom=-r,this.sunLight.shadow.bias=-4e-4,this.scene.add(this.sunLight);const l=new o.DirectionalLight(13362943,.72);l.position.set(-15,16,-12),this.fillLight=l,this.scene.add(l);const p=ie(),g=(c,y)=>{const f=new o.PlaneGeometry(c*2,c*2);f.rotateX(-Math.PI/2);const m=new o.MeshBasicMaterial({map:p,transparent:!0,opacity:y,depthWrite:!1}),d=new o.Mesh(f,m);return d.position.y=.018,d.renderOrder=2,this.scene.add(d),d};this.player.shadowBlob=g(.56,.82),this.playerPartner.shadowBlob=g(.54,.78),this.opponent.shadowBlob=g(.56,.82),this.opponentPartner.shadowBlob=g(.54,.78),this.ballShadowBlob=g(.34,.88)}_setupEffectsPools(){for(let t=0;t<6;t++){const i=new o.RingGeometry(.12,.24,28);i.rotateX(-Math.PI/2);const a=new o.MeshBasicMaterial({color:16777215,transparent:!0,opacity:0,side:o.DoubleSide,depthWrite:!1}),s=new o.Mesh(i,a);s.visible=!1,s.position.y=.024,s.renderOrder=3,this.scene.add(s),this.bounceRings.push({mesh:s,age:0,active:!1})}const e=new o.OctahedronGeometry(.085,0);for(let t=0;t<36;t++){const i=new o.MeshBasicMaterial({color:t%2===0?16771624:4777471,transparent:!0,opacity:0,depthWrite:!1}),a=new o.Mesh(e,i);a.visible=!1,a.renderOrder=8,this.scene.add(a),this.starParticles.push({mesh:a,vel:new o.Vector3,age:0,maxAge:.42,active:!1})}}_initHudAndControllers(){this.hud=new Y({matchManager:this.matchManager,onStartMatchFromLobby:i=>{if(i&&i.gameMode==="online"&&this.hud._lockedRoomId){this.roomId=String(this.hud._lockedRoomId).toUpperCase();this.isMultiplayer=!0;this._onlineLobby=!0;this.playerRole=this.hud.matchManager.isHost?"p1":"p2";{const __h=this.hud.matchManager.isHost,__ls=this.hud.matchManager.localPlayerSlot;this.localSlot=__h?"A1":(__sr.ROLE_BY_SLOT[__ls]?__ls:"B1");this.controlRole=__sr.ROLE_BY_SLOT[this.localSlot];this.viewTeam=__sr.teamOfSlot(this.localSlot);}this.motionController&&this.motionController.setRoomConfig&&this.motionController.setRoomConfig({roomId:this.roomId,role:this.controlRole});}{const __m=(i&&i.actorMapping)||{},__me=({A1:__m.player,A2:__m.playerPartner,B1:__m.opponent,B2:__m.opponentPartner})[this.localSlot]||(this.playerRole==="p2"?__m.opponent:__m.player),__nm=__me&&__me.playerName;__nm&&!/Đang chờ/.test(__nm)&&(this.playerName=__nm,document.querySelectorAll(".plate-name").forEach(el=>el.textContent=__nm));}{const __mm=this.hud.matchManager;try{__mm.scenery&&this.applyScenery(__mm.scenery)}catch{}const __sd=__mm.sound;if(__sd&&this.audioEngine){try{this.audioEngine.setMusicVolume&&this.audioEngine.setMusicVolume(__sd.music===!1?0:.65),this.audioEngine.setSfxVolume&&this.audioEngine.setSfxVolume(__sd.sfx===!1?0:.85)}catch{}}}this.applyLineupConfiguration(i),this.autoPlayMode=!1,this.userHasInteracted=!0,this.persistentStateLock=!1,this.startNewMatch({showStartBanner:!0})},onMatchTypeChanged:i=>{this.setGameMatchType(i)},onSelectMatchLength:i=>{this.matchConfig.gamesToWin=i},onSelectDifficulty:i=>{this._applyDifficultyTuning(i),i==="1v1"&&(!this.roomId||this.roomId==="default")&&this.createMultiplayerRoom()},onCreateMultiplayerRoom:async(i={})=>await this.createMultiplayerRoom(i),onSelectInputMode:i=>{this.matchConfig.inputMode=i,i==="webcam"&&this.motionController&&this.motionController.enableWebcam()},onStartMatch:({gamesToWin:i,inputMode:a,difficulty:s,playerName:pName})=>{this.matchConfig.gamesToWin=i,this.matchConfig.inputMode=a,s&&this._applyDifficultyTuning(s),pName&&(this.playerName=pName,document.querySelectorAll('.plate-name').forEach(el=>el.textContent=pName)),this.autoPlayMode=!1,this.userHasInteracted=!0,this.persistentStateLock=!1,a==="webcam"&&this.motionController&&this.motionController.enableWebcam(),this.startNewMatch({showStartBanner:!0})},onSelectShotType:i=>{this.playerRole==="p2"?this.p2SelectedShotType=i:this.selectedShotType=i,this.motionController&&this.motionController.setShotType&&this.motionController.setShotType(i.toLowerCase())},onSelectScenery:i=>this.applyScenery(i),onToggleAudio:()=>{if(this.audioEngine){const i=this.audioEngine.toggleMute(),a=this.audioEngine.getCurrentTrackInfo();this.hud.updateAudioStatus({playing:!i,trackName:a.title})}},onCycleCamera:()=>{const i=[null,"RALLY_CAM","SERVE_CAM","REPLAY_CAM","INTRO_PAN"],a=i.indexOf(this.manualCameraOverride);this.manualCameraOverride=i[(a+1)%i.length];const s={null:"Auto",RALLY_CAM:"Rally",SERVE_CAM:"Serve",REPLAY_CAM:"Net Close",INTRO_PAN:"Aerial"};this.hud.updateCameraLabel(s[this.manualCameraOverride]||"Auto"),this.hud.setReplayMode(this.manualCameraOverride==="REPLAY_CAM")},onToggleReplay:()=>{this.phase==="REPLAY"?(this.persistentStateLock=!1,this.hud.setReplayMode(!1),this._setupPointServe({showBanner:!1})):this._enterInstantReplayState({persistent:!1})},onToggleWebcam:async()=>{if(this.motionController)if(this.autoPlayMode=!1,this.userHasInteracted=!0,this.persistentStateLock=!1,this.motionController.webcamActive)this.motionController.disableWebcam&&this.motionController.disableWebcam(),this.hud.updateMotionStatus({webcamActive:!1,phoneConnected:this.motionController.phoneState?.connected});else{const i=await this.motionController.enableWebcam();this.hud.updateMotionStatus({webcamActive:i,phoneConnected:this.motionController.phoneState?.connected}),this.phase==="TITLE"&&(this.hud.hideTitleModal(),this.startNewMatch({showStartBanner:!0}))}},onPlayAgain:()=>{this.autoPlayMode=!1,this.userHasInteracted=!0,this.persistentStateLock=!1,this.startNewMatch({showStartBanner:!0})},onSetSensitivity:v=>{this.motionSensitivity=v;if(this.motionController)this.motionController.sensitivity=v;},onSetSweetSpotAssist:b=>{this.sweetSpotAssisted=!!b;},onSetMusicVolume:v=>{if(this.audioEngine&&this.audioEngine.setMusicVolume)this.audioEngine.setMusicVolume(v);},onSetSfxVolume:v=>{if(this.audioEngine&&this.audioEngine.setSfxVolume)this.audioEngine.setSfxVolume(v);},onTriggerWhistle:()=>{if(this.audioEngine&&this.audioEngine.playRefereeWhistle)this.audioEngine.playRefereeWhistle();},onTriggerCheer:t=>{this.triggerCrowdCheer(t);},onSetLighting:m=>{this.setLightingPreset(m);},onTriggerConfetti:()=>{this.triggerConfetti();},onPauseMatch:()=>{this.pauseMatch();},onResumeMatch:()=>{this.resumeMatch();},onRestartMatch:()=>{this.restartCurrentMatch();},onExitToMenu:()=>{this.exitMatchToMenu();},onExitToLobby:()=>{this.openLobbyFromPause();},onDisbandRoom:()=>{this.disbandAndCancelRoom();},onSelectGameMode:m=>{this.setGameModeArchitecture(m);},onReconnectResume:()=>{this.restorePendingMatchSession();},onReconnectDiscard:()=>{this.clearMatchSessionCache();}});const e=U.AudioEngine||U.default;e&&(this.audioEngine=new e({onTrackChange:i=>{this.hud.updateAudioStatus({playing:!i.muted,trackName:i.title.replace(/\s*\(Lyria 3\)/i,"")})}}));const t=z.MotionController||z.default;t&&(this.motionController=new t({webcamCanvasId:"webcam-canvas",roomId:this.roomId,role:this.controlRole,onSwing:i=>this._handleLocalSwing(i),onToss:i=>this._handleUserTossInput(i),onP2Swing:i=>this._routeSlotInput(i,!1),onP2Toss:i=>this._routeSlotInput(i,!0),onRoomState:i=>this._handleRoomStateUpdate(i),onStatusChange:i=>{this.hud.updateMotionStatus({webcamActive:!!i.webcam,phoneConnected:!!i.phone,p1Phone:!!i.p1Phone,p2Phone:!!i.p2Phone})}})),window.addEventListener("keydown",i=>{if(i.target&&(i.target.tagName==="INPUT"||i.target.tagName==="TEXTAREA"))return;if(i.code==="Escape"||i.code==="KeyP"){this.isPaused?this.resumeMatch():this.pauseMatch();return;}i.code==="KeyC"?this.hud.callbacks.onCycleCamera():i.code==="KeyR"?this.hud.callbacks.onToggleReplay():this.isMultiplayer&&!this._onlineLobby&&(i.code==="ShiftRight"||i.code==="KeyK"||i.code==="Numpad0")&&this._handleP2SwingInput({source:"keyboard_p2",shotType:this.p2SelectedShotType,speed:1.18})})}async createMultiplayerRoom({p1Name:e="Player 1",p2Name:t="Player 2"}={}){try{const i=await fetch("/api/match/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({p1Name:e,p2Name:t})});if(i.ok){const a=await i.json();if(a.roomId)return this.roomId=a.roomId,this.isMultiplayer=!0,this._applyDifficultyTuning("1v1"),this.motionController&&this.motionController.setRoomConfig&&this.motionController.setRoomConfig({roomId:this.roomId,role:this.controlRole}),this.roomStatus={...this.roomStatus,roomId:a.roomId,tunnelUrl:a.tunnelUrl||"",urls:a.urls||null,gchatCard:a.gchatCard||null},this.hud&&this.hud.updateMultiplayerRoomInfo&&this.hud.updateMultiplayerRoomInfo(this.roomStatus),a}}catch(i){console.warn("[ArgonTennisEngine] Failed to create multiplayer room:",i)}return null}async loadAssetsAndStart(){const e=new D,t=async(y,f=4)=>{const c=y.startsWith("http")||y.startsWith("./")||y.startsWith("/")?y.replace("https://www.gstatic.com/aistudio/starter-apps/tennis/","./assets/"):`./assets/models/${y}?v=argon4_kinetic`;for(let m=0;m<=f;m++)try{return await new Promise((b,u)=>{e.load(c,w=>b(w.scene),void 0,w=>u(w))})}catch(d){if(m===f)return console.warn(`[ArgonTennisEngine] Could not load ${c}:`,d),new o.Group;await new Promise(b=>setTimeout(b,350))}return new o.Group},[i,a,s,n,h,r,l]=await Promise.all([t("https://www.gstatic.com/aistudio/starter-apps/tennis/models/stadium_court.glb?v=argon4_kinetic"),t("https://www.gstatic.com/aistudio/starter-apps/tennis/models/tennis_net.glb?v=argon4_kinetic"),t("https://www.gstatic.com/aistudio/starter-apps/tennis/models/mii_player.glb?v=argon4_kinetic"),t("https://www.gstatic.com/aistudio/starter-apps/tennis/models/mii_opponent.glb?v=argon4_kinetic"),t("https://www.gstatic.com/aistudio/starter-apps/tennis/models/tennis_racket.glb?v=argon4_kinetic"),t("https://www.gstatic.com/aistudio/starter-apps/tennis/models/tennis_ball.glb?v=argon4_kinetic"),t("https://www.gstatic.com/aistudio/starter-apps/tennis/models/mii_crowd.glb?v=argon4_kinetic")]),p=s.clone(!0),g=n.clone(!0);this._prepareStadiumAndNet(i,a),this._prepareCrowd(l),this._prepareMiiActor(this.player,s,h),this._prepareMiiActor(this.playerPartner,p,h),this._prepareMiiActor(this.opponent,n,h),this._prepareMiiActor(this.opponentPartner,g,h),this._prepareTennisBall(r),this._initStadiumLife(),this.applyScenery(this.currentSceneryId),this._bootInitialStateFromURL(),this.checkPendingMatchSession(),this.clock.start();const c=()=>{requestAnimationFrame(c);const y=Math.min(this.clock.getDelta(),.08);this.update(y),this.render()};requestAnimationFrame(c)}_prepareStadiumAndNet(e,t){const i=this.renderer.capabilities.getMaxAnisotropy?this.renderer.capabilities.getMaxAnisotropy():8,a=s=>{if(!s)return;const n=s.name||"";s.map&&(s.map.anisotropy=i,s.map.wrapS=o.RepeatWrapping,s.map.wrapT=o.RepeatWrapping,s.map.needsUpdate=!0),/TreeSprite/i.test(n)?(s.alphaTest=.35,s.transparent=!0,s.side=o.DoubleSide,s.depthWrite=!0):/Shadow|LogoArgonBanner/i.test(n)?(s.transparent=!0,s.depthWrite=!1,s.polygonOffset=!0,s.polygonOffsetFactor=-2,s.polygonOffsetUnits=-2):/NetMesh/i.test(n)&&(s.transparent=!0,s.alphaTest=.08,s.side=o.DoubleSide,s.depthWrite=!1),s.needsUpdate=!0};
  e.traverse(s=>{
    if(s.isMesh){
      const n=s.name||"";
      (Array.isArray(s.material)?s.material:[s.material]).forEach(m=>{
        a(m);
        const mn=(m.name||n||"").toLowerCase();
        if(/courtwhiteline|whiteline/i.test(mn)||/CourtWhiteLine/i.test(n)){
          m.visible=!1;m.opacity=0;m.transparent=!0;
        }
        if(/grass|outerground/i.test(mn)){
          m.color=new o.Color(0x071322);
          m.map=null;
          m.roughness=0.88;
          m.metalness=0.05;
          m.needsUpdate=!0;
        }
        if(/logoargon/i.test(mn)){m.visible=!1;}
      });
      /Shadow/i.test(n)?(s.castShadow=!1,s.receiveShadow=!1,s.renderOrder=1):/Tree/i.test(n)?(s.castShadow=!0,s.receiveShadow=!0):(s.receiveShadow=!0,/Wall|Bleacher|Canopy|Pillar|Umpire|Bench|Clubhouse|StadiumCourt/i.test(n)&&(s.castShadow=!0));
    }
  });
  this.scene.add(e);

  // Lower net to regulation Pickleball height (34" center, 36" posts)
  t.scale.set(1,0.92,1);
  t.traverse(s=>{
    if(s.isMesh){
      const n=s.name||"";
      (Array.isArray(s.material)?s.material:[s.material]).forEach(a);
      /Shadow/i.test(n)?(s.castShadow=!1,s.receiveShadow=!1,s.renderOrder=1):/Mesh/i.test(n)?(s.castShadow=!0,s.receiveShadow=!0,s.renderOrder=2):(s.castShadow=!0,s.receiveShadow=!0);
    }
  });
  this.scene.add(t);

  // Center net strap with tournament badge (matching image_5b2dc31f.png)
  try{
    const strapGeo=new o.BoxGeometry(0.12,0.86,0.04);
    const strapMat=new o.MeshStandardMaterial({color:0x111827,roughness:0.9});
    const strapMesh=new o.Mesh(strapGeo,strapMat);
    strapMesh.position.set(0,0.43,0);
    strapMesh.castShadow=!0;
    this.scene.add(strapMesh);

    const bc=document.createElement("canvas");
    bc.width=256;bc.height=128;
    const bctx=bc.getContext("2d");
    bctx.fillStyle="#ffffff";
    bctx.fillRect(0,0,256,128);
    bctx.strokeStyle="#000000";
    bctx.lineWidth=6;
    bctx.strokeRect(4,4,248,120);
    bctx.fillStyle="#000000";
    bctx.font="900 36px -apple-system, sans-serif";
    bctx.textAlign="center";
    bctx.fillText("SÂN 1 / COURT 1",128,48);
    bctx.font="bold 20px -apple-system, sans-serif";
    bctx.fillStyle="#0284c7";
    bctx.fillText("HACHIHI OPEN 2026",128,92);

    const badgeTex=new o.CanvasTexture(bc);
    badgeTex.colorSpace=o.SRGBColorSpace;
    const badgeGeo=new o.PlaneGeometry(0.26,0.13);
    const badgeMat=new o.MeshBasicMaterial({map:badgeTex});
    const badgeMesh=new o.Mesh(badgeGeo,badgeMat);
    badgeMesh.position.set(0,0.58,0.024);
    this.scene.add(badgeMesh);

    const badgeMeshBack=badgeMesh.clone();
    badgeMeshBack.position.set(0,0.58,-0.024);
    badgeMeshBack.rotation.y=Math.PI;
    this.scene.add(badgeMeshBack);
  }catch(err){console.warn("[NetStrap] err:",err);}

  // Full 24m x 36m Pickleball Court Surface at y = 0.025
  try{
    const cTex=createPickleballCourtTexture(o);
    const cGeo=new o.PlaneGeometry(24,36);
    cGeo.rotateX(-Math.PI/2);
    const cMat=new o.MeshStandardMaterial({map:cTex,roughness:0.82,metalness:0.04,polygonOffset:!0,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    const cMesh=new o.Mesh(cGeo,cMat);
    cMesh.position.set(0,0.025,0);
    cMesh.receiveShadow=!0;
    cMesh.renderOrder=1;
    this.scene.add(cMesh);
  }catch(err){console.warn("[PickleballCourt] Overlay err:",err);}

  // 3D Tournament Backdrop Banners (North & South arena walls)
  try{
    const texLoader=new o.TextureLoader();
    // North Wall: Real Hachihi Sponsor Backdrop Banner (image_f56d5a53.png)
    texLoader.load("/assets/aistudio/image_f56d5a53.png",tex=>{
      tex.colorSpace=o.SRGBColorSpace;
      const bGeo=new o.PlaneGeometry(26,6.2);
      const bMat=new o.MeshBasicMaterial({map:tex});
      const bMesh=new o.Mesh(bGeo,bMat);
      bMesh.position.set(0,3.8,-18.2);
      this.scene.add(bMesh);
    });

    // South Wall: Arena Opening Banner (image_947f7d6e.png)
    texLoader.load("/assets/aistudio/image_947f7d6e.png",tex=>{
      tex.colorSpace=o.SRGBColorSpace;
      const bGeo=new o.PlaneGeometry(26,6.2);
      const bMat=new o.MeshBasicMaterial({map:tex});
      const bMesh=new o.Mesh(bGeo,bMat);
      bMesh.position.set(0,3.8,18.2);
      bMesh.rotation.y=Math.PI;
      this.scene.add(bMesh);
    });

    // Side Wall East: Arena Logo (image_3b36b13f.png)
    texLoader.load("/assets/aistudio/image_3b36b13f.png",tex=>{
      tex.colorSpace=o.SRGBColorSpace;
      const bGeo=new o.PlaneGeometry(28,3.8);
      const bMat=new o.MeshBasicMaterial({map:tex});
      const bMesh=new o.Mesh(bGeo,bMat);
      bMesh.position.set(12.2,2.2,0);
      bMesh.rotation.y=-Math.PI/2;
      this.scene.add(bMesh);
    });

    // Side Wall West: Official Tournament Poster (image_1999677e.png)
    texLoader.load("/assets/aistudio/image_1999677e.png",tex=>{
      tex.colorSpace=o.SRGBColorSpace;
      const bGeo=new o.PlaneGeometry(28,3.8);
      const bMat=new o.MeshBasicMaterial({map:tex});
      const bMesh=new o.Mesh(bGeo,bMat);
      bMesh.position.set(-12.2,2.2,0);
      bMesh.rotation.y=Math.PI/2;
      this.scene.add(bMesh);
    });
  }catch(err){console.warn("[TournamentBanners] err:",err);}}_prepareCrowd(e){e.position.set(0,0,0),e.traverse(t=>{t.isMesh&&(t.castShadow=!1,t.receiveShadow=!0)}),this.crowdScene=e,this.scene.add(e)}_prepareMiiActor(e,t,i){e.model=t,t.traverse(s=>{s.isMesh&&(s.castShadow=!0,s.receiveShadow=!0),s.userData.basePos=s.position.clone(),s.userData.baseRot=s.rotation.clone();const n=(s.name||"").trim();/^head(\.?0*\d+)?$/i.test(n)&&(!e.parts.head||!s.isMesh)?e.parts.head=s:/^torso(\.?0*\d+)?$/i.test(n)&&(!e.parts.torso||!s.isMesh)?e.parts.torso=s:/^hand_l(\.?0*\d+)?$/i.test(n)&&(!e.parts.handL||!s.isMesh)?e.parts.handL=s:/^hand_r(\.?0*\d+)?$/i.test(n)&&(!e.parts.handR||!s.isMesh)?e.parts.handR=s:/^foot_l(\.?0*\d+)?$/i.test(n)&&(!e.parts.footL||!s.isMesh)?e.parts.footL=s:/^foot_r(\.?0*\d+)?$/i.test(n)&&(!e.parts.footR||!s.isMesh)&&(e.parts.footR=s)}),t.scale.setScalar(1.16),e.root.add(t),$(e,e.sideSign>0?"p1":"p2"),this.facialFX&&this.facialFX.attachFacialRig(e),this.bodyAnimator&&this.bodyAnimator.setupArticulatedMiiRig(e);const a=createPickleballPaddleMesh(o,e.sideSign>0?"player":"opponent");a.scale.setScalar(1.05);e.racketMesh=a,e.racketPivot.position.set(-.36,.9,.16),e.racketMesh.rotation.set(0,0,0),e.racketPivot.add(e.racketMesh),e.swingArcMesh=se(),e.swingArcMesh.visible=!1,e.root.add(e.swingArcMesh),e.root.add(e.racketPivot),e.root.rotation.y=e.sideSign>0?Math.PI:0,e.root.position.copy(e.pos),this.scene.add(e.root),this.racketKinematics&&this.racketKinematics.initActor(e),this.swingVfx&&this.swingVfx.registerActor(e)}_prepareTennisBall(e){e.traverse(t=>{t.isMesh&&(t.castShadow=!0,t.receiveShadow=!1)}),e.scale.setScalar(1.65);try{
  const pbTex=createPickleballBallTexture(o);
  e.traverse(s=>{if(s.isMesh&&s.material){s.material=new o.MeshStandardMaterial({map:pbTex,roughness:0.62,metalness:0.02,color:0xffffff});}});
}catch(err){console.warn("[PickleballBall] Texture err:",err);}
this.ball.mesh=e,this.ball.mesh.position.copy(this.ball.pos),this.scene.add(this.ball.mesh)}_bootInitialStateFromURL(){if(this.params.get("join")==="lobby"&&/^[A-Z0-9]{4,8}$/.test(this.urlRoom)){this.hud.hideTitleModal();this.hud.showGuestJoinCard?this.hud.showGuestJoinCard(this.urlRoom):this.hud.joinRoomFromLink&&this.hud.joinRoomFromLink(this.urlRoom);return}if(this.urlRoom&&this.urlRoom!=="DEFAULT"&&!this.urlAutoPlay){this.hud.hideTitleModal(),this.autoPlayMode=!1,this.userHasInteracted=!0,this.persistentStateLock=!1,this.startNewMatch({showStartBanner:!0}),this._snapCameraImmediate();return}if(!this.urlAutoPlay){this.score.playerPoints=0,this.score.opponentPoints=0,this._syncScoreboardHUD(),this._setupMidRallyShowcase({scorePlayer:0,scoreOpponent:0}),this.autoPlayMode=!0,this.audioEngine&&this.audioEngine.playMusicForState("title");return}if(this.hud.hideTitleModal(),this.urlState==="gamepoint"||this.urlState==="serve"){this.score.playerPoints=3,this.score.opponentPoints=0,this.score.playerGames=0,this.score.opponentGames=0,this.score.server="player",this.score.deuceSide=!1,this._syncScoreboardHUD(),this.persistentStateLock=!0,this._setupPointServe({showBanner:!0,bannerText:"Game Point",bannerStyle:"style-gold",persistentBanner:!0}),this._snapCameraImmediate(),this.audioEngine&&this.audioEngine.playMusicForState("gamepoint");return}if(this.urlState==="start"){this.score.playerPoints=0,this.score.opponentPoints=0,this.score.server="player",this.score.deuceSide=!0,this._syncScoreboardHUD(),this.persistentStateLock=!0,this._setupPointServe({showBanner:!0,bannerText:"Start",bannerStyle:"style-start",persistentBanner:!0}),this._snapCameraImmediate();return}if(this.urlState==="replay"){this.score.playerPoints=3,this.score.opponentPoints=0,this._syncScoreboardHUD(),this.persistentStateLock=!0,this._enterInstantReplayState({persistent:!0}),this._snapCameraImmediate(),this.audioEngine&&this.audioEngine.playMusicForState("replay");return}if(this.urlState&&this.urlState.startsWith("showcase")){this.score.playerPoints=2,this.score.opponentPoints=1,this._syncScoreboardHUD(),this.persistentStateLock=!0,this.autoPlayMode=!1,this._setupKineticShowcaseState(this.urlState),this._snapCameraImmediate();return}this.score.playerPoints=1,this.score.opponentPoints=0,this.score.playerGames=0,this.score.opponentGames=0,this._syncScoreboardHUD(),this.hud.hideCenterBanner(),this.hud.setReplayMode(!1),this.autoPlayMode=!0,this.persistentStateLock=!1,this._setupMidRallyShowcase({scorePlayer:1,scoreOpponent:0}),this._snapCameraImmediate(),this.audioEngine&&this.audioEngine.playMusicForState("rally")}_setupKineticShowcaseState(e="showcase_topspin"){this.phase="SHOWCASE",this.showcaseModeName=e,this.phaseTimer=0,this.cameraMode="SHOWCASE_CAM",this.hud.setReplayMode(!1),this.hud.hideCenterBanner(),this.player.pos.set(1.15,0,11.2),this.player.targetPos.copy(this.player.pos),this.player.root.rotation.y=Math.PI+.18,this.opponent.pos.set(-1.25,0,-10.2),this.opponent.targetPos.copy(this.opponent.pos),this.playerPartner.pos.set(-2.35,0,5.2),this.opponentPartner.pos.set(2.35,0,-5.2),this._refreshShowcasePose()}_refreshShowcasePose(){const e=this.showcaseModeName||"showcase_topspin",t=i=>{for(let a=0;a<10;a++)this.player.racketKinematics.swingActive=!0,this.player.racketKinematics.swingElapsed=i,this.racketKinematics.update(this.player,.016,{ball:this.ball,phase:this.phase}),this.player.racketKinematics.swingActive=!0,this.player.racketKinematics.swingElapsed=i,this.bodyAnimator.updateMiiBodyAnimation(this.player,.016,this);this.player.root.updateMatrixWorld(!0)};if(e==="showcase_slice"||e==="showcase_backhand"){this.player.swingType="backhand",this.player.swingDuration=.36,this.player.swingTimer=.26,this.racketKinematics.triggerSwing(this.player,{shotType:e==="showcase_backhand"?"topspin":"slice",side:"backhand",speed:1.32,timing:"sweet"}),t(.072),this.swingVfx.seedActorSwingArc(this.player,{shotType:"SLICE",isPower:!1,whipSpeed:28,swingType:"backhand"}),this.facialFX.setExpression(this.player,"focused_squint",10);const a=this.racketKinematics.getRacketRimWorldPoints(this.player).centerWorld.clone();this.ball.pos.copy(a).add(new o.Vector3(.06,.03,-.22)),this.ball.vel.set(1.4,.9,-15.2),this.ballTrail.setStyle("SLICE",!1),this.ballTrail.seedArc(a,this.ball.pos,.05),this.swingVfx.triggerBallDeformation(this.ball,"racket_hit",this.ball.vel,26),this.swingVfx.spawnImpactBurst(a,{shotType:"SLICE",isPower:!1,count:16})}else if(e==="showcase_smash"){this.player.swingType="smash",this.player.swingDuration=.36,this.player.swingTimer=.26,this.racketKinematics.triggerSwing(this.player,{shotType:"smash",side:"overhead",speed:1.45,timing:"sweet"}),t(.058),this.swingVfx.seedActorSwingArc(this.player,{shotType:"SMASH",isPower:!0,whipSpeed:34,swingType:"smash"}),this.facialFX.setExpression(this.player,"effort_shout",10);const a=this.racketKinematics.getRacketRimWorldPoints(this.player).centerWorld.clone();this.ball.pos.copy(a).add(new o.Vector3(-.04,-.04,-.22)),this.ball.vel.set(-1.5,-2.8,-22),this.ballTrail.setStyle("SMASH",!0),this.ballTrail.seedArc(a,this.ball.pos,.05),this.swingVfx.triggerBallDeformation(this.ball,"racket_hit",this.ball.vel,32),this.swingVfx.spawnImpactBurst(a,{shotType:"SMASH",isPower:!0,count:22})}else if(e==="showcase_panic")this.player.vel.set(-6.8,0,1.2),this.player.stridePhase+=.35,this.facialFX.setExpression(this.player,"wide_eyed_panic",10),this.facialFX.spawnSweatDrops(this.player,6),this.facialFX.triggerEmoteBurst(this.player,"panic"),this.ball.pos.set(.78,2.15,9.85),this.ballTrail.setStyle("LOB",!1),this.ballTrail.seedArc(new o.Vector3(-.8,2.75,5.2),this.ball.pos,.72);else if(e==="showcase_win")this.player.rig?.reaction?.type||this.bodyAnimator.triggerPointReaction(this.player,"win"),this.player.rig?.reaction&&(this.player.rig.reaction.timer=.16),this.facialFX.setExpression(this.player,"happy_grin",10),this.facialFX.triggerEmoteBurst(this.player,"win"),this.opponent.rig?.reaction?.type||this.bodyAnimator.triggerPointReaction(this.opponent,"loss"),this.facialFX.setExpression(this.opponent,"shocked_loss",10),this.ball.pos.set(-2.5,.12,-11.5);else{this.player.swingType="forehand",this.player.swingDuration=.36,this.player.swingTimer=.26,this.racketKinematics.triggerSwing(this.player,{shotType:"topspin",side:"forehand",speed:1.35,timing:"sweet"}),t(.068),this.swingVfx.seedActorSwingArc(this.player,{shotType:"TOPSPIN",isPower:!0,whipSpeed:29,swingType:"forehand"}),this.facialFX.setExpression(this.player,"effort_shout",10);const a=this.racketKinematics.getRacketRimWorldPoints(this.player).centerWorld.clone();this.ball.pos.copy(a).add(new o.Vector3(-.06,.04,-.22)),this.ball.vel.set(-1.8,2.2,-18.5),this.ballTrail.setStyle("TOPSPIN",!0),this.ballTrail.seedArc(a,this.ball.pos,.05),this.swingVfx.triggerBallDeformation(this.ball,"racket_hit",this.ball.vel,28),this.swingVfx.spawnImpactBurst(a,{shotType:"TOPSPIN",isPower:!0,count:18})}}startNewMatch({showStartBanner:e=!0}={}){this.score.serverNumber=2,this.score.playerPoints=0,this.score.opponentPoints=0,this.score.playerGames=0,this.score.opponentGames=0,this.score.server="player",this.score.deuceSide=!0,this._syncScoreboardHUD(),this.hud.setReplayMode(!1),this.audioEngine&&(this.audioEngine.playMusicForState("start"),this.audioEngine.announceScore("Start")),this._setupPointServe({showBanner:e,bannerText:"Start",bannerStyle:"style-start",persistentBanner:!1})}_setupPointServe({showBanner:e=!0,bannerText:t=null,bannerStyle:i="style-gold",persistentBanner:a=!1}={}){this.phase="SERVE_STANCE",this.phaseTimer=0,this.cameraMode="SERVE_CAM",this.hud.setReplayMode(!1),this.ballTrail.clear(),this.swingVfx&&this.swingVfx.clearAllTrails();const s=this.score.deuceSide?1.35:-.55,n=this.score.deuceSide?-2.35:2.15;this.score.server==="player"?(this.player.pos.set(s,0,S.BASELINE_Z+.12),this.player.targetPos.copy(this.player.pos),this.opponent.pos.set(n,0,-S.BASELINE_Z+.35),this.opponent.targetPos.copy(this.opponent.pos),this.ball.pos.set(s-.28,1.12,S.BASELINE_Z-.15)):(this.opponent.pos.set(-s,0,-S.BASELINE_Z-.12),this.opponent.targetPos.copy(this.opponent.pos),this.player.pos.set(-n,0,S.BASELINE_Z-.35),this.player.targetPos.copy(this.player.pos),this.ball.pos.set(-s+.28,1.12,-S.BASELINE_Z+.15));const h=this.score.deuceSide?-2.05:2.05;const isDoubles=(this.matchType!=="singles");this.playerPartner.pos.set(h,0,5.2),this.playerPartner.targetPos.copy(this.playerPartner.pos),this.playerPartner.root.visible=isDoubles,this.playerPartner.shadowBlob&&(this.playerPartner.shadowBlob.visible=isDoubles),this.opponentPartner.pos.set(-h,0,-5.2),this.opponentPartner.targetPos.copy(this.opponentPartner.pos),this.opponentPartner.root.visible=isDoubles,this.opponentPartner.shadowBlob&&(this.opponentPartner.shadowBlob.visible=isDoubles),this.ball.vel.set(0,0,0),this.ball.spin.set(0,0,0),this.ball.inPlay=!1,this.ball.bounceCountOnCurrentSide=0,this.ball.rallyStrokeCount=0,this.pendingUserSwing=null,this.pendingP2Swing=null,this.pendingServeSwing=null,this.player.swingArcMesh.visible=!1,this.opponent.swingArcMesh.visible=!1,this.playerPartner.swingArcMesh&&(this.playerPartner.swingArcMesh.visible=!1),this.opponentPartner.swingArcMesh&&(this.opponentPartner.swingArcMesh.visible=!1),this.player.swingCooldown=0,this.playerPartner.swingCooldown=0,this.opponent.swingCooldown=0,this.opponentPartner.swingCooldown=0,this.facialFX&&(this.facialFX.setExpression(this.player,"neutral",2),this.facialFX.setExpression(this.opponent,"neutral",2),this.facialFX.setExpression(this.playerPartner,"neutral",2),this.facialFX.setExpression(this.opponentPartner,"neutral",2));let r=t,l=i;if(!r&&e){const p=this._getHighStakesPointLabel();p&&(r=p,l="style-gold",this.audioEngine&&this.audioEngine.announceScore(p,{delayMs:180}))}r&&e?(this._recordBannerBroadcast(r,l,""),this.hud.showCenterBanner(r,{style:l,durationMs:1800,persistent:a})):a||this.hud.hideCenterBanner(),this.hud.updateTimingGauge({cursorNormalized:.5,modeTitle:"GIAO BÓNG DƯỚI EO",speedText:"DƯỚI THẮT LƯNG / SPACE"})}_setupMidRallyShowcase({scorePlayer:e=1,scoreOpponent:t=0}={}){this.phase="RALLY",this.phaseTimer=0,this.cameraMode="RALLY_CAM",this.hud.setReplayMode(!1),this.hud.hideCenterBanner(),this.player.pos.set(1.35,0,11.4),this.player.targetPos.set(1.15,0,11.4),this.player.swingType="forehand",this.player.swingTimer=.25,this.player.arcVisibleTimer=1.2,this.player.swingArcMesh.visible=!0,this.racketKinematics&&(this.racketKinematics.triggerSwing(this.player,{shotType:"topspin",side:"forehand",speed:1.35,timing:"sweet"}),this.player.racketKinematics.swingElapsed=.13),this.swingVfx&&this.swingVfx.seedActorSwingArc(this.player,{shotType:"TOPSPIN",isPower:!0,whipSpeed:28,swingType:"forehand"}),this.facialFX&&(this.facialFX.setExpression(this.player,"effort_shout",1.2),this.facialFX.setExpression(this.opponent,"focused_squint",1.2));const isShowcaseDoubles=(this.matchType!=="singles");this.playerPartner.pos.set(-2.1,0,5.4),this.playerPartner.targetPos.copy(this.playerPartner.pos),this.playerPartner.root.visible=isShowcaseDoubles,this.playerPartner.shadowBlob&&(this.playerPartner.shadowBlob.visible=isShowcaseDoubles),this.opponentPartner.pos.set(2.1,0,-5.4),this.opponentPartner.targetPos.copy(this.opponentPartner.pos),this.opponentPartner.root.visible=isShowcaseDoubles,this.opponentPartner.shadowBlob&&(this.opponentPartner.shadowBlob.visible=isShowcaseDoubles),this.opponent.pos.set(-1.65,0,-10.5),this.opponent.targetPos.set(-1.95,0,-10.8);const i=new o.Vector3(1.42,1.25,10.85),a=new o.Vector3(-.18,1.88,.65);this.ball.pos.copy(a),this.ball.vel.set(-1.85,2.15,-14.8),this.ball.spin.set(18,0,0),this.ball.inPlay=!0,this.ball.lastHitter="player",this.ball.bounceCountOnCurrentSide=0,this.ball.rallyStrokeCount=2,this.ball.shotType="TOPSPIN",this.ball.isPowerShot=!0,this.ballTrail.setStyle("TOPSPIN",!1),this.ballTrail.seedArc(i,a,.72),this.swingVfx&&this.swingVfx.spawnImpactBurst(i,{shotType:"TOPSPIN",isPower:!0,count:14}),this._predictBallIntercept(this.opponent)}_enterInstantReplayState({persistent:e=!1}={}){this.phase="REPLAY",this.phaseTimer=0,this.cameraMode="REPLAY_CAM",this.persistentStateLock=e,this.hud.hideCenterBanner(),this.hud.setReplayMode(!0),this.cheerEnergy=.85,this.audioEngine&&!e&&this.audioEngine.playVoiceCallout("replay"),this._resetReplayNetExchangePose()}_resetReplayNetExchangePose(){this.player.pos.set(1.55,0,.95),this.player.targetPos.copy(this.player.pos),this.player.root.rotation.y=Math.PI+.22,this.player.swingType="forehand",this.player.swingTimer=.08,this.player.arcVisibleTimer=1.5,this.player.swingArcMesh.visible=!0,this.opponent.pos.set(-1.25,0,-1.35),this.opponent.targetPos.copy(this.opponent.pos),this.opponent.root.rotation.y=-.18,this.opponent.swingType="forehand",this.opponent.swingTimer=.12,this.opponent.arcVisibleTimer=1.5,this.opponent.swingArcMesh.visible=!0,this.racketKinematics&&(this.racketKinematics.triggerSwing(this.player,{shotType:"topspin",side:"forehand",speed:1.32,timing:"sweet"}),this.player.racketKinematics.swingElapsed=.14,this.racketKinematics.triggerSwing(this.opponent,{shotType:"slice",side:"forehand",speed:1.25,timing:"sweet"}),this.opponent.racketKinematics.swingElapsed=.11),this.swingVfx&&(this.swingVfx.seedActorSwingArc(this.player,{shotType:"TOPSPIN",isPower:!0,whipSpeed:28,swingType:"forehand"}),this.swingVfx.seedActorSwingArc(this.opponent,{shotType:"SLICE",isPower:!1,whipSpeed:25,swingType:"forehand"})),this.facialFX&&(this.facialFX.setExpression(this.player,"effort_shout",2),this.facialFX.setExpression(this.opponent,"wide_eyed_panic",2),this.facialFX.spawnSweatDrops(this.opponent,5)),this.playerPartner.pos.set(-4.2,0,9.5),this.opponentPartner.pos.set(4.2,0,-9.5);const e=new o.Vector3(-1.12,1.22,-1.08),t=new o.Vector3(-.08,1.34,.05);this.ball.pos.copy(t),this.ball.vel.set(.95,.85,3.6),this.ball.inPlay=!0,this.ballTrail.setStyle("SLICE",!0),this.ballTrail.seedArc(e,t,.24)}_applyManualMovement(dt){
  const mc=this.motionController;
  if(!mc||this.phase!=="RALLY")return;
  if(this.playerRole==="p2")return;   // guests: their keys/joystick are relayed to the host (motion_controls._restartMoveRelay)
  // Moves one actor by an input vector. Team B is seen from the other end, so its axes are mirrored.
  const step=(p,mv,sgn,team)=>{
    if(!p||!p.targetPos||!p.pos)return;
    const len=Math.hypot(mv.x,mv.z)||1,reach=(p.maxSpeed||7)*.14,nx=p.pos.x+sgn*mv.x/len*reach,nz=p.pos.z+sgn*mv.z/len*reach;
    const zMin=team==="B"?-(S.BASELINE_Z+.9):.35,zMax=team==="B"?-.35:S.BASELINE_Z+.9;
    p.targetPos.set(o.MathUtils.clamp(nx,-S.DOUBLES_X+.25,S.DOUBLES_X-.25),0,o.MathUtils.clamp(nz,zMin,zMax));
  };
  const own=mc.moveInput;
  if(own&&(own.x||own.z)&&!(this.botControllers&&this.botControllers.has("A1")))step(this.player,own,1,"A");
  const rm=mc.remoteMoves;
  if(rm){
    const now=Date.now(),slots=(this.matchManager&&this.matchManager.slots)||[];
    for(const [role,slot,actor] of [["p2","B1",this.opponent],["p3","A2",this.playerPartner],["p4","B2",this.opponentPartner]]){
      const m=rm[role];
      if(!m||now-m.t>600||(!m.x&&!m.z))continue;                       // stale = key released / packet lost
      const sl=slots.find(s=>s.slotId===slot);
      if(!sl||sl.playerType!=="human"||(this.botControllers&&this.botControllers.has(slot)))continue;
      step(actor,m,slot[0]==="B"?-1:1,slot[0]);
    }
  }
}
_resolveSmartShot(actor){
  // Tự chọn cú đánh theo tình huống: bóng cao -> ĐẬP, bóng thấp/chậm gần lưới -> DINK, còn lại -> DRIVE
  const b=this.ball,p=actor||this.player;
  const speed=Math.hypot(b.vel.x,b.vel.z);
  if(b.pos.y>1.5)return"SMASH";
  if(p.pos.z<5.4&&b.pos.y<1.3&&speed<11)return"DINK";
  return"TOPSPIN";
}
_handleUserTossInput(e={}){return this.userHasInteracted=!0,this.phase==="TITLE"?(this.hud.hideTitleModal(),this.autoPlayMode=!1,this.persistentStateLock=!1,this.startNewMatch({showStartBanner:!0}),!0):this.phase==="SERVE_STANCE"&&this.score.server==="player"?(this.persistentStateLock=!1,this.hud.hideCenterBanner(),this._startServeToss(this.player),!0):!1}_viewTeamB(){return this.viewTeam==="B"}
_slotActor(slot){return({A1:this.player,A2:this.playerPartner,B1:this.opponent,B2:this.opponentPartner})[slot]||null}
_localActor(){return this._slotActor(this.localSlot)||(this.playerRole==="p2"?this.opponent:this.player)}
_forcedSlotFor(slot){return __sr.forceActorFor(this.matchManager&&this.matchManager.slots,slot)}
_handleLocalSwing(e={}){return this._handleUserSwingInput({...e,slotActor:this._forcedSlotFor("A1")})}
_routeSlotInput(e={},toss=!1){const slot=__sr.slotForRole(e.role);if(__sr.isServeBlocked(this.phase,slot))return!1;const ev={...e,slotActor:this._forcedSlotFor(slot)};if(slot[0]==="A")return toss?this._handleUserTossInput(ev):this._handleUserSwingInput(ev);return toss?this._handleP2TossInput(ev):this._handleP2SwingInput(ev)}
_handleUserSwingInput(e={}){if(this.userHasInteracted=!0,this.phase==="TITLE"){this.hud.hideTitleModal(),this.autoPlayMode=!1,this.persistentStateLock=!1,this.startNewMatch({showStartBanner:!0});return}if(e.shotType&&e.shotType!=="toss"){const t=String(e.shotType).toUpperCase();["TOPSPIN","SLICE","LOB","SMASH","FLAT","DINK"].includes(t)&&(this.selectedShotType=t==="SMASH"?"FLAT":t)}if(this.phase==="SERVE_STANCE"&&this.score.server==="player"){this.persistentStateLock=!1,this.hud.hideCenterBanner(),this._startServeToss(this.player);return}if(this.phase==="SERVE_TOSS"&&this.score.server==="player"){if(this.phaseTimer<.16)return;if(this.ball.pos.y>=1.45&&this.ball.pos.y<2.25&&this.ball.vel.y>.5){this.pendingServeSwing={actor:this.player,evt:{...e,speed:Math.max(1.22,Number(e.speed||1.22))}};return}this._executeServeHit(this.player,e);return}if(this.phase==="RALLY"){this.autoPlayMode=!1;e.smart&&(e={...e,shotType:this._resolveSmartShot(this.player).toLowerCase()});const t=e.autoSide?(this.ball.pos.x<this.player.pos.x-.05?"backhand":"forehand"):e.side==="backhand"||Number(e.dirX||0)>.12&&e.side!=="forehand"?"backhand":e.side==="forehand"||Number(e.dirX||0)<-.12?"forehand":this.ball.pos.x<this.player.pos.x-.05||this.ball.targetLanding.x<-.15?"backhand":"forehand",i=String(e.shotType||this.selectedShotType||"topspin").toLowerCase();e.smart&&(this.selectedShotType=i==="smash"?"FLAT":i.toUpperCase());if(this.ball.lastHitter==="opponent"){const s=this.ball.pos.z-this.player.pos.z,n=this.ball.pos.z-this.playerPartner.pos.z,h=e.slotActor==="A2"||e.slotActor!=="A1"&&this.ball.pos.z>.3&&this.ball.pos.z<=7.5&&Math.abs(this.ball.pos.x-this.playerPartner.pos.x)<3.4,r=h?n:s;if(r<-.95&&r>=-7.8){const l=h?this.playerPartner:this.player;this.racketKinematics&&this.racketKinematics.triggerSwing(l,{shotType:i,side:t,speed:Number(e.speed||1.2),timing:"early",dirX:Number(e.dirX||0)}),this.audioEngine&&this.audioEngine.playSwingWhoosh(Number(e.speed||1.15)),this.pendingUserSwing={evt:{...e,side:t,sweetSpotAssisted:!0},expiresAt:this.elapsedTime+.48,waitForSweetSpot:!0};return}}if(!this._attemptPlayerRallyStrike({...e,side:t},!1)&&(this.racketKinematics&&this.racketKinematics.triggerSwing(e.slotActor==="A2"?this.playerPartner:this.player,{shotType:i,side:t,speed:Number(e.speed||1.2),timing:"sweet",dirX:Number(e.dirX||0)}),this.audioEngine&&this.audioEngine.playSwingWhoosh(Number(e.speed||1.15)),this.ball.lastHitter==="opponent")){const s=this.ball.pos.z-this.player.pos.z,n=this.ball.pos.z-this.playerPartner.pos.z;(s>=-8&&s<=.9||n>=-5.5&&n<=.9)&&(this.pendingUserSwing={evt:{...e,side:t,sweetSpotAssisted:!0},expiresAt:this.elapsedTime+.48,waitForSweetSpot:!0})}}}_handleP2TossInput(e={}){if(this._guestControlsTeamA())return this._handleUserTossInput(e);return this.userHasInteracted=!0,this.isMultiplayer=!0,this.phase==="TITLE"?(this.hud.hideTitleModal(),this.autoPlayMode=!1,this.persistentStateLock=!1,this.startNewMatch({showStartBanner:!0}),!0):this.phase==="SERVE_STANCE"&&this.score.server==="opponent"?(this.persistentStateLock=!1,this.hud.hideCenterBanner(),this._startServeToss(this.opponent),!0):!1}_handleP2SwingInput(e={}){if(this._guestControlsTeamA())return this._handleUserSwingInput(e);if(this.userHasInteracted=!0,this.isMultiplayer=!0,this._onlineLobby||this._applyDifficultyTuning("1v1"),this.phase==="TITLE"){this.hud.hideTitleModal(),this.autoPlayMode=!1,this.persistentStateLock=!1,this.startNewMatch({showStartBanner:!0});return}if(e.shotType&&e.shotType!=="toss"){const t=String(e.shotType).toUpperCase();["TOPSPIN","SLICE","LOB","SMASH","FLAT"].includes(t)&&(this.p2SelectedShotType=t==="SMASH"?"FLAT":t)}if(this.phase==="SERVE_STANCE"&&this.score.server==="opponent"){this.persistentStateLock=!1,this.hud.hideCenterBanner(),this._startServeToss(this.opponent);return}if(this.phase==="SERVE_TOSS"&&this.score.server==="opponent"){if(this.phaseTimer<.16)return;if(this.ball.pos.y>=1.45&&this.ball.pos.y<2.25&&this.ball.vel.y>.5){this.pendingServeSwing={actor:this.opponent,evt:{...e,speed:Math.max(1.22,Number(e.speed||1.22))}};return}this._executeServeHit(this.opponent,e);return}if(this.phase==="RALLY"){this.autoPlayMode=!1;const t=e.side==="backhand"||Number(e.dirX||0)>.12&&e.side!=="forehand"?"backhand":e.side==="forehand"||Number(e.dirX||0)<-.12?"forehand":this.ball.pos.x>(e.slotActor==="B2"?this.opponentPartner:this.opponent).pos.x+.05||this.ball.targetLanding.x>.15?"backhand":"forehand",i=String(e.shotType||this.p2SelectedShotType||"topspin").toLowerCase();if(this.ball.lastHitter==="player"){const s=(e.slotActor==="B2"?this.opponentPartner:this.opponent).pos.z-this.ball.pos.z;if(s<-.95&&s>=-7.8){this.racketKinematics&&this.racketKinematics.triggerSwing((e.slotActor==="B2"?this.opponentPartner:this.opponent),{shotType:i,side:t,speed:Number(e.speed||1.2),timing:"early",dirX:Number(e.dirX||0)}),this.pendingP2Swing={evt:{...e,side:t,sweetSpotAssisted:!0},expiresAt:this.elapsedTime+.48,waitForSweetSpot:!0};return}}this._attemptP2RallyStrike({...e,side:t})||(this.racketKinematics&&this.racketKinematics.triggerSwing((e.slotActor==="B2"?this.opponentPartner:this.opponent),{shotType:i,side:t,speed:Number(e.speed||1.2),timing:"sweet",dirX:Number(e.dirX||0)}),this.ball.lastHitter==="player"&&(this.pendingP2Swing={evt:{...e,side:t,sweetSpotAssisted:!0},expiresAt:this.elapsedTime+.48,waitForSweetSpot:!0}))}}_startServeToss(e){this.phase="SERVE_TOSS",this.phaseTimer=0,this.pendingServeSwing=null;const t=e.sideSign>0?-.32:.32;this.ball.pos.set(e.pos.x+t,1.18,e.pos.z-e.sideSign*.22),this.ball.vel.set(0,6.32,0),this.ball.inPlay=!1,this.facialFX&&this.facialFX.setExpression(e,"focused_squint",1.4),this.audioEngine&&this.audioEngine.playServeToss()}_executeServeHit(e,t={}){const i=this.ball.pos.y;if(i<1.25)return;this.pendingServeSwing=null;const a=o.MathUtils.clamp(Number(t.speed||1.18),.78,1.68),s=i>=2.05&&i<=3.55,n=i<1.72;e.swingType="serve",e.swingDuration=.38,e.swingTimer=.38,e.arcVisibleTimer=.36,e.swingArcMesh.visible=!0,this.racketKinematics&&(this.racketKinematics.triggerSwing(e,{shotType:"serve",side:"overhead",speed:a,timing:s?"sweet":n?"early":"sweet",isServe:!0,dirX:Number(t.dirX||0)}),this.racketKinematics.triggerImpactRecoil(e,s?1.45:.95));const h=this.score.deuceSide?-1:1,r=o.MathUtils.clamp(Number(t.dirX||0),-1,1)*1.15,l=e.sideSign*h*(1.75+Math.random()*.85),p=o.MathUtils.clamp(l+r,-S.SINGLES_X+.45,S.SINGLES_X-.45),c=e.role==="opponent"&&!this.isMultiplayer?this.matchConfig.difficulty==="pro"?1:1.24:1;let y=-e.sideSign*(4.4+Math.random()*1.35),f=s?Math.max(.58,.66/Math.min(1.18,a*.92))*c:n?.94*c:.8*c,m=s?22:n?8:15,d=Number(t.dirX||0)*-8;const b=!1,u=this.ball.pos.clone();this._launchBallToTarget(this.ball.pos,new o.Vector3(p,0,y),f,{topspin:m,sidespin:d,allowNetFault:b});const w=Math.round(s?188+Math.min(22,(a-1)*32):n?128+Math.random()*14:158+Math.min(22,(a-.9)*28));if(this.ball.inPlay=!0,this.ball.lastHitter=e.role==="player"?"player":"opponent",this.ball.bounceCountOnCurrentSide=0,this.ball.rallyStrokeCount=1,this.ball.isPowerShot=s,this.ball.shotType=s?"POWER":"TOPSPIN",this.ballTrail.clear(),this.ballTrail.setStyle(this.ball.shotType,s),this.ballTrail.pushPoint(this.ball.pos),this.phase="RALLY",this.cameraMode="RALLY_CAM",this.swingVfx&&this.swingVfx.onRacketContact({actor:e,ball:this.ball,contactPos:u,shotType:s?"SMASH":"SERVE",isPower:s,isServe:!0,timingQuality:s?"PERFECT":"GOOD",speed:this.ball.vel.length()}),this.facialFX&&this.facialFX.setExpression(e,"effort_shout",.55),s&&(this.cameraTrauma=.34,this._spawnStarBurst(this.ball.pos,14)),this.audioEngine&&(this.audioEngine.playSwingWhoosh(s?1.5:1.1),this.audioEngine.playRacketHit(s?"smash":"topspin",s?"perfect":"good"),(e.role==="player"||this.isMultiplayer)&&s&&!this.autoPlayMode&&this.audioEngine.playVoiceCallout("power serve")),e.role==="player"||e.role==="opponent"&&this.isMultiplayer){const _=e.role==="player"?"p1":"p2",T=s?"POWER SERVE!":n?"EARLY SERVE":"GOOD SERVE",M=`${w} KM/H \u2022 ${s?"SWEET SPOT APEX":n?"LOW CONTACT":"SERVICE BOX"}`,R=this._projectToScreen(e.pos.clone().add(new o.Vector3(0,2.35,0)));this.hud.showTimingPopup({grade:T,detail:M,screenPos:R}),this.hud.updateTimingGauge({cursorNormalized:s?.5:n?.22:.42,modeTitle:"SERVE IMPACT",speedText:`${w} KM/H`}),this.motionController&&this.motionController.triggerHapticFeedback&&!this.autoPlayMode&&this.motionController.triggerHapticFeedback({role:_,kind:"hit",grade:T,shotType:s?"SMASH":"TOPSPIN",speedKmh:w,intensity:s?1.5:n?.75:1.05})}const x=e.role==="player"?this.opponent:this.player;this._predictBallIntercept(x)}_attemptPlayerRallyStrike(e={},t=!1){if(this.ball.lastHitter==="player")return!1;const i=this.ball.pos.z-this.player.pos.z,a=Math.abs(this.ball.pos.x-this.player.pos.x),s=Math.hypot(a,i),n=this.ball.pos.z-this.playerPartner.pos.z,h=Math.abs(this.ball.pos.x-this.playerPartner.pos.x),r=Math.hypot(h,n),l=!t&&(e.slotActor==="A2"||e.slotActor!=="A1"&&this.ball.pos.z>.3&&this.ball.pos.z<=7.6&&r<=3.95&&r<s),p=l?this.playerPartner:this.player,g=l?n:i,c=l?h:a,y=l?r:s;if(!t&&p.swingCooldown>0)return!1;const f=o.MathUtils.clamp(Number(e.speed||1.18),.8,1.68);e.smart&&(e={...e,shotType:this._resolveSmartShot(p).toLowerCase()});if(e.shotType){const A=String(e.shotType).toUpperCase();this.selectedShotType=A==="SMASH"||A==="POWER"?"FLAT":A}const m=e.side==="backhand"?!0:e.side==="forehand"?!1:Number(e.dirX||0)>.14?!0:Number(e.dirX||0)<-.14?!1:this.ball.pos.x<p.pos.x-.04||this.ball.targetLanding.x<-.12,d=e.side==="overhead"||(this.selectedShotType==="FLAT"||e.shotType==="smash")&&this.ball.pos.y>1.5||this.ball.pos.y>1.78;if(p.swingType=d?"smash":m?"backhand":"forehand",p.swingDuration=.36,p.swingTimer=.36,p.arcVisibleTimer=this.autoPlayMode?.85:.36,p.swingArcMesh&&(p.swingArcMesh.visible=!1),this.racketKinematics){const A=String(e.shotType||this.selectedShotType||"topspin").toLowerCase(),G=d||A==="power"?"smash":A;this.racketKinematics.triggerSwing(p,{shotType:G,side:d?"overhead":m?"backhand":"forehand",speed:f,timing:"sweet",dirX:Number(e.dirX||0)})}// Pickleball Rule 3: Two-Bounce Rule (Stroke 1 & 2 must bounce) — only judged when the swing can really reach the ball
const inReach=(y<=(l?4.05:4.85)||!!t);
if(inReach&&this.ball.rallyStrokeCount===1&&isTwoBounceViolation(1,this.ball.bounceCountOnCurrentSide)){
  const scr=this._projectToScreen(p.pos.clone().add(new o.Vector3(0,2.35,0)));
  this.hud.showTimingPopup({grade:"LỖI 2 LẦN NẢY!",detail:"ĐỘI ĐỠ PHẢI ĐỂ BÓNG NẢY 1 LẦN",screenPos:scr,durationMs:1600});
  this.audioEngine&&this.audioEngine.playVoiceCallout("fault");
  this._awardPoint("opponent","Lỗi 2 Lần Nảy (Two-Bounce)");
  return false;
}
if(inReach&&this.ball.rallyStrokeCount===2&&isTwoBounceViolation(2,this.ball.bounceCountOnCurrentSide)){
  const scr=this._projectToScreen(p.pos.clone().add(new o.Vector3(0,2.35,0)));
  this.hud.showTimingPopup({grade:"LỖI 2 LẦN NẢY!",detail:"CÚ THỨ 3 PHẢI ĐỂ BÓNG NẢY 1 LẦN",screenPos:scr,durationMs:1600});
  this.audioEngine&&this.audioEngine.playVoiceCallout("fault");
  this._awardPoint("opponent","Lỗi 2 Lần Nảy (Cú thứ 3)");
  return false;
}
// Pickleball Rule 4: Kitchen Non-Volley Zone (7ft / 2.134m)
// Volley while standing in or stepping into NVZ is a fault. If ball bounced (>=1), completely legal!
if(inReach&&isKitchenVolleyFault({bouncesOnSide:this.ball.bounceCountOnCurrentSide,actorZ:p.pos.z,side:1})){
  const scr=this._projectToScreen(p.pos.clone().add(new o.Vector3(0,2.35,0)));
  this.hud.showTimingPopup({grade:"LỖI VÀO BẾP!",detail:"CẤM VOLLEY TRONG VÙNG BẾP (NVZ)",screenPos:scr,durationMs:1600});
  this.audioEngine&&this.audioEngine.playVoiceCallout("fault");
  this._awardPoint("opponent","Lỗi Vào Bếp (Kitchen Fault)");
  return false;
}if(this.audioEngine&&this.audioEngine.playSwingWhoosh(f),y>(l?4.05:4.85)&&!t){if(g>1.45){p.swingCooldown=.16;const A="TOO LATE! \u2022 WHIFF",G=this._projectToScreen(p.pos.clone().add(new o.Vector3(0,2.35,0)));this.hud.showTimingPopup({grade:A,detail:"BALL PASSED",screenPos:G,durationMs:750}),this.hud.updateTimingGauge({cursorNormalized:.92,modeTitle:"SWING WHIFF!",speedText:"LATE"}),this.motionController&&this.motionController.triggerHapticFeedback&&this.motionController.triggerHapticFeedback({role:"p1",kind:"whiff",grade:A,shotType:this.selectedShotType||"TOPSPIN",speedKmh:0,intensity:.65})}return!1}let u="PERFECT",w=.5;const x=c>2.85;e.timing?u=String(e.timing).toUpperCase():e.sweetSpotAssisted&&g>=-1.85&&g<=.78?(u="PERFECT",w=.5):g<-2.65?(u="VERY EARLY",w=.14):g<-1.45||e.dirX&&e.dirX<-.52?(u="EARLY",w=.28):g>1.35?(u="VERY LATE",w=.88):g>.68||e.dirX&&e.dirX>.52?(u="LATE",w=.72):x&&this.matchConfig.difficulty==="pro"&&(u=g<0?"EARLY":"LATE",w=g<0?.3:.7);const _=u==="VERY EARLY"||u==="VERY LATE",T=this.selectedShotType||"TOPSPIN",isSmash=(d||T==="FLAT"),M=!_&&(u==="PERFECT"||isSmash)&&f>=.98&&T!=="DINK"&&T!=="SLICE"&&T!=="LOB",R=p.pos.x>=0?1:-1,v=o.MathUtils.clamp(Number(e.dirX||0),-1,1);let E=0;if(u==="EARLY"||u==="VERY EARLY")E=-R*(2.35+Math.random()*1.15)+v*.95;else if(u==="LATE"||u==="VERY LATE")E=R*(2.35+Math.random()*1.05)+v*.95;else{const A=this.opponent.pos.x>=0?-1:1;Math.abs(v)>.22?E=v*(2.75+Math.random()*.95):E=A*(2.45+Math.random()*1.25)}let k=!1,O=!1;
if(isSmash && !this.autoPlayMode){
  const contactY = this.ball.pos.y, distFromNet = Math.abs(p.pos.z);
  if(_){
    if(Math.random() < 0.25) O = true;
  } else if(contactY < 1.12 && Math.random() < 0.20){
    O = true;
  } else if(distFromNet > 9.6 && u !== "PERFECT" && Math.random() < 0.15){
    O = true;
  }
} else if(_ && !t && !this.autoPlayMode){
  if(Math.random() < 0.15) k = true;
  else if(Math.random() < 0.12 && T !== "LOB") O = true;
}
k?E=(E>=0?1:-1)*(S.SINGLES_X+.48+Math.random()*.45):_?E=o.MathUtils.clamp(E*.65,-S.SINGLES_X+.65,S.SINGLES_X-.65):E=o.MathUtils.clamp(E,-S.SINGLES_X+.35,S.SINGLES_X-.35);
let N=-(8.4+Math.random()*2.4), I=0.72, C=18, V=0;
if(T==="DINK"){
  N=-(1.6+Math.random()*0.8);
  I=0.95;
  C=4;
  V=0;
  E=o.MathUtils.clamp(E*0.55,-S.SINGLES_X+0.85,S.SINGLES_X-0.85);
} else if(T==="SLICE"){
  N=-(5.2+Math.random()*2.6);
  I=1.05;
  C=-10;
  V=-R*8;
} else if(T==="LOB"){
  N=-(9.8+Math.random()*1.5);
  I=1.55;
  C=4;
  V=0;
  O=false;
} else if(isSmash){
  N=-(7.8+Math.random()*3.0);
  I=0.50;
  C=22;
  V=0;
} else {
  N=-(8.5+Math.random()*2.2);
  I=0.72;
  C=18;
  V=0;
}
const B=this.ball.pos.clone();B.y=Math.max(.78,Math.min(1.92,B.y)),this.ball.pos.copy(B),this._launchBallToTarget(B,new o.Vector3(E,0,N),I,{topspin:C,sidespin:V,allowNetFault:O,shotType:isSmash?"FLAT":T}),this.ball.inPlay=!0,this.ball.lastHitter="player",this.ball.bounceCountOnCurrentSide=0,this.ball.rallyStrokeCount+=1,this.ball.shotType=isSmash?"FLAT":T,this.ball.isPowerShot=M,this.ballTrail.setStyle(isSmash?"FLAT":T,M),this.racketKinematics&&this.racketKinematics.triggerImpactRecoil(p,M?1.4:1),this.swingVfx&&this.swingVfx.onRacketContact({actor:p,ball:this.ball,contactPos:B,shotType:isSmash?"SMASH":T,isPower:M,isServe:!1,timingQuality:u,speed:this.ball.vel.length()}),this.facialFX&&this.facialFX.setExpression(p,M?"effort_shout":"focused_squint",.55),M&&(this.cameraTrauma=.26,this._spawnStarBurst(B,11)),this.audioEngine&&(this.audioEngine.playRacketHit(isSmash?"smash":T.toLowerCase(),u==="PERFECT"?"perfect":"good"),p.swingType==="smash"&&!this.autoPlayMode&&this.audioEngine.playVoiceCallout("smash"));const F=Math.round(this.ball.vel.length()*6.8),H=isSmash?"SMASH":m?"BACKHAND":"FOREHAND",X=l?"NET VOLLEY":_?"DEFENSIVE":u==="EARLY"?`${H} CROSS`:u==="LATE"?`${H} LINE`:`${H} ${T}`;if(!this.autoPlayMode){const A=this._projectToScreen(p.pos.clone().add(new o.Vector3(0,2.35,0)));this.hud.showTimingPopup({grade:`${u} \u2022 ${X}!`,detail:`${F} KM/H`,screenPos:A}),this.motionController&&this.motionController.triggerHapticFeedback&&this.motionController.triggerHapticFeedback({role:"p1",kind:O?"fault":_?"fault":"hit",grade:`${u} \u2022 ${X}`,shotType:isSmash?"SMASH":T,speedKmh:F,intensity:M?1.45:_?.75:1.1})}return this.hud.updateTimingGauge({cursorNormalized:w,modeTitle:`${u} (${X})`,speedText:`${F} KM/H`}),this.player.targetPos.set(o.MathUtils.clamp(-E*.22,-1.6,1.6),0,S.BASELINE_Z-.15),this.playerPartner.targetPos.set(o.MathUtils.clamp(E*.35+(this.score.deuceSide?-1.4:1.4),-2.8,2.8),0,5.1),this._predictBallIntercept(this.opponent),!0}_attemptP2RallyStrike(e={}){if(this.ball.lastHitter==="opponent")return!1;const t=this.opponent.pos.z-this.ball.pos.z,i=Math.abs(this.ball.pos.x-this.opponent.pos.x),a=Math.hypot(i,t),s=this.opponentPartner.pos.z-this.ball.pos.z,n=Math.abs(this.ball.pos.x-this.opponentPartner.pos.x),h=Math.hypot(n,s),r=e.slotActor==="B2"||e.slotActor!=="B1"&&this.ball.pos.z<-.3&&this.ball.pos.z>=-7.6&&h<=3.95&&h<a,l=r?this.opponentPartner:this.opponent,p=r?s:t,g=r?n:i,c=r?h:a;if(l.swingCooldown>0)return!1;
const inReach=(c<=(r?4.05:4.85));
if(inReach&&this.ball.rallyStrokeCount===1&&isTwoBounceViolation(1,this.ball.bounceCountOnCurrentSide)){
  this.hud.showTimingPopup({grade:"LỖI 2 LẦN NẢY!",detail:"ĐỘI ĐỠ PHẢI ĐỂ BÓNG NẢY",durationMs:1600});
  this.audioEngine&&this.audioEngine.playVoiceCallout("fault");
  this._awardPoint("player","Lỗi 2 Lần Nảy");
  return false;
}
if(inReach&&this.ball.rallyStrokeCount===2&&isTwoBounceViolation(2,this.ball.bounceCountOnCurrentSide)){
  this.hud.showTimingPopup({grade:"LỖI 2 LẦN NẢY!",detail:"CÚ THỨ 3 PHẢI ĐỂ BÓNG NẢY",durationMs:1600});
  this.audioEngine&&this.audioEngine.playVoiceCallout("fault");
  this._awardPoint("player","Lỗi 2 Lần Nảy");
  return false;
}
if(inReach&&isKitchenVolleyFault({bouncesOnSide:this.ball.bounceCountOnCurrentSide,actorZ:l.pos.z,side:-1})){
  this.hud.showTimingPopup({grade:"LỖI VÀO BẾP!",detail:"KITCHEN FAULT (NVZ)",durationMs:1600});
  this.audioEngine&&this.audioEngine.playVoiceCallout("fault");
  this._awardPoint("player","Lỗi Vào Bếp");
  return false;
}const y=o.MathUtils.clamp(Number(e.speed||1.18),.8,1.68);if(e.shotType){const C=String(e.shotType).toUpperCase();this.p2SelectedShotType=C==="SMASH"||C==="POWER"?"FLAT":C}const f=e.side==="backhand"?!0:e.side==="forehand"?!1:Number(e.dirX||0)>.14?!0:Number(e.dirX||0)<-.14?!1:this.ball.pos.x>l.pos.x+.04||this.ball.targetLanding.x>.12,m=this.p2SelectedShotType||"TOPSPIN",isP2Smash=e.side==="overhead"||(m==="FLAT"||e.shotType==="smash")&&this.ball.pos.y>1.5||this.ball.pos.y>1.78;if(l.swingType=isP2Smash?"smash":f?"backhand":"forehand",l.swingDuration=.36,l.swingTimer=.36,l.arcVisibleTimer=.36,l.swingArcMesh&&(l.swingArcMesh.visible=!1),this.racketKinematics){const C=String(e.shotType||m||"topspin").toLowerCase(),V=isP2Smash||C==="power"?"smash":C;this.racketKinematics.triggerSwing(l,{shotType:V,side:isP2Smash?"overhead":f?"backhand":"forehand",speed:y,timing:"sweet",dirX:Number(e.dirX||0)})}if(this.audioEngine&&this.audioEngine.playSwingWhoosh(y),c>(r?4.05:4.85))return p>1.45&&(l.swingCooldown=.16,this.motionController&&this.motionController.triggerHapticFeedback&&this.motionController.triggerHapticFeedback({role:"p2",kind:"whiff",grade:"TOO LATE! \u2022 WHIFF",shotType:m,speedKmh:0,intensity:.65})),!1;let u="PERFECT";e.sweetSpotAssisted&&p>=-1.85&&p<=.78?u="PERFECT":p<-1.45||e.dirX&&e.dirX<-.52?u="EARLY":(p>.68||e.dirX&&e.dirX>.52)&&(u="LATE");const w=(u==="PERFECT"||isP2Smash)&&y>=.98,x=l.pos.x>=0?1:-1,_=o.MathUtils.clamp(Number(e.dirX||0),-1,1);let T=0;if(u==="EARLY")T=-x*(2.25+Math.random()*1.1)-_*.95;else if(u==="LATE")T=x*(2.25+Math.random()*1.05)-_*.95;else{const C=this.player.pos.x>=0?-1:1;T=Math.abs(_)>.22?-_*(2.65+Math.random()*.95):C*(2.35+Math.random()*1.25)}T=o.MathUtils.clamp(T,-S.SINGLES_X+.38,S.SINGLES_X-.38);let P2O=!1;if(isP2Smash){const contactY=this.ball.pos.y;if(contactY<1.12){if(Math.random()<0.20)P2O=!0}else if(u==="EARLY"||u==="LATE"){if(Math.random()<0.12)P2O=!0}}let M=8.2+Math.random()*2.2,R=0.72,v=18,E=0;if(m==="DINK"){M=1.6+Math.random()*0.7;R=0.95;v=4;E=0;T=o.MathUtils.clamp(T*0.52,-S.SINGLES_X+0.85,S.SINGLES_X-0.85)}else if(m==="SLICE"){M=5.2+Math.random()*2.2;R=1.05;v=-10;E=x*6}else if(m==="LOB"){M=9.8+Math.random()*1.6;R=1.55;v=4;E=0;P2O=!1}else if(isP2Smash){M=7.8+Math.random()*2.8;R=0.50;v=22;E=0}else{M=8.2+Math.random()*2.2;R=0.72;v=18;E=0}const k=this.ball.pos.clone();k.y=Math.max(.78,Math.min(1.92,k.y)),this.ball.pos.copy(k),this._launchBallToTarget(k,new o.Vector3(T,0,M),R,{topspin:v,sidespin:E,allowNetFault:P2O,shotType:isP2Smash?"FLAT":m}),this.ball.inPlay=!0,this.ball.lastHitter="opponent",this.ball.bounceCountOnCurrentSide=0,this.ball.rallyStrokeCount+=1,this.ball.shotType=isP2Smash?"FLAT":m,this.ball.isPowerShot=w,this.ballTrail.setStyle(isP2Smash?"FLAT":m,w),this.racketKinematics&&this.racketKinematics.triggerImpactRecoil(l,w?1.4:1),this.swingVfx&&this.swingVfx.onRacketContact({actor:l,ball:this.ball,contactPos:k,shotType:isP2Smash?"SMASH":m,isPower:w,isServe:!1,timingQuality:u,speed:this.ball.vel.length()}),this.facialFX&&this.facialFX.setExpression(l,w?"effort_shout":"focused_squint",.55),w&&(this.cameraTrauma=.24,this._spawnStarBurst(k,10)),this.audioEngine&&this.audioEngine.playRacketHit(isP2Smash?"smash":m.toLowerCase(),u==="PERFECT"?"perfect":"good");const O=Math.round(this.ball.vel.length()*6.8),N=r?"NET VOLLEY":u==="EARLY"?"CROSS-COURT":u==="LATE"?"DOWN THE LINE":`SWEET SPOT ${m}`,I=this._projectToScreen(l.pos.clone().add(new o.Vector3(0,2.35,0)));return this.hud.showTimingPopup({grade:`P2 ${u} \u2022 ${N}!`,detail:`${O} KM/H`,screenPos:I}),this.motionController&&this.motionController.triggerHapticFeedback&&this.motionController.triggerHapticFeedback({role:"p2",kind:P2O?"fault":"hit",grade:`${u} \u2022 ${N}`,shotType:isP2Smash?"SMASH":m,speedKmh:O,intensity:w?1.45:1.1}),this.opponent.targetPos.set(o.MathUtils.clamp(-T*.22,-1.6,1.6),0,-S.BASELINE_Z+.25),this.opponentPartner.targetPos.set(o.MathUtils.clamp(T*.35+(this.score.deuceSide?1.4:-1.4),-2.8,2.8),0,-5.1),this._predictBallIntercept(this.player),!0}_executeOpponentReturn(e=this.opponent){const t=e===this.opponentPartner,i=this.matchConfig.difficulty!=="pro",a=Math.abs(this.ball.pos.x-e.pos.x),s=!!this.ball.isPowerShot,h=a>(i?1.35:1.75)||s&&a>(i?1.05:1.45),r=this.ball.pos.x>e.pos.x+.05;const isHighBall=this.ball.pos.y>1.62&&Math.abs(this.ball.pos.z)<5.5;e.swingType=isHighBall?"smash":r?"backhand":"forehand",e.swingDuration=.36,e.swingTimer=.36,e.arcVisibleTimer=this.autoPlayMode?.85:.36,e.swingArcMesh&&(e.swingArcMesh.visible=!1);const l=this.player.pos.x>=0?-1:1,p=i?.85+Math.random()*1.15:1.25+Math.random()*1.75;let g=o.MathUtils.clamp(l*p,-S.SINGLES_X+.65,S.SINGLES_X-.65),c=i?7.6+Math.random()*2.2:8.2+Math.random()*2.4,y="TOPSPIN",f=0.72,m=!1;if(this.autoPlayMode&&!this.userHasInteracted){y="TOPSPIN",f=0.72;}else if(isHighBall&&Math.random()<0.75){y="FLAT",c=7.8+Math.random()*2.8,f=0.50;if(this.ball.pos.y<1.15&&Math.random()<0.15)m=!0;}else if(h&&this.ball.rallyStrokeCount>=2){y=a>1.35||s?"LOB":"SLICE";g=o.MathUtils.clamp((Math.random()-.5)*2.8,-S.SINGLES_X+1.2,S.SINGLES_X-1.2);c=y==="LOB"?9.8+Math.random()*1.6:5.8+Math.random()*2.2;f=y==="LOB"?1.55:1.08;if(a>2.2&&Math.random()<0.02)m=!0;}else if(t){y="SLICE";c=5.4+Math.random()*2.2;f=1.05;}else{const b=["TOPSPIN","TOPSPIN","SLICE","TOPSPIN","DINK","LOB"];y=b[this.ball.rallyStrokeCount%b.length];if(y==="DINK"){c=1.6+Math.random()*0.7;f=0.95;g*=0.6;}else if(y==="LOB"){c=9.8+Math.random()*1.6;f=1.55;}else if(y==="SLICE"){c=5.4+Math.random()*2.2;f=1.05;}else{c=8.2+Math.random()*2.2;f=0.72;}}const d=this.ball.pos.clone();d.y=Math.max(.82,Math.min(1.68,d.y));this.ball.pos.copy(d);this._launchBallToTarget(d,new o.Vector3(g,0,c),f,{topspin:y==="SLICE"?-10:y==="LOB"?4:y==="FLAT"?22:y==="DINK"?4:18,sidespin:y==="SLICE"?(r?6:-6):0,allowNetFault:m,shotType:y});this.ball.inPlay=!0;this.ball.lastHitter="opponent";this.ball.bounceCountOnCurrentSide=0;this.ball.rallyStrokeCount+=1;this.ball.shotType=y;this.ball.isPowerShot=(y==="FLAT");this.ballTrail.setStyle(y,y==="FLAT");this.racketKinematics&&(this.racketKinematics.triggerSwing(e,{shotType:y==="FLAT"?"smash":y.toLowerCase(),side:isHighBall?"overhead":r?"backhand":"forehand",speed:1.15,timing:"sweet"}),this.racketKinematics.triggerImpactRecoil(e,.95));this.swingVfx&&this.swingVfx.onRacketContact({actor:e,ball:this.ball,contactPos:d,shotType:y,isPower:y==="FLAT",isServe:!1,timingQuality:"GOOD",speed:this.ball.vel.length()});this.facialFX&&(this.facialFX.setExpression(e,h?"wide_eyed_panic":"effort_shout",.65),h&&this.facialFX.spawnSweatDrops(e,4));this.audioEngine&&(this.audioEngine.playSwingWhoosh(1),this.audioEngine.playRacketHit(y==="FLAT"?"smash":y.toLowerCase(),"good"));this.opponent.targetPos.set(o.MathUtils.clamp(-g*.25,-1.6,1.6),0,-S.BASELINE_Z+.35);this._predictBallIntercept(this.player)}_launchBallToTarget(e,t,i,{topspin:a=14,sidespin:s=0,allowNetFault:n=!1,shotType:st="TOPSPIN"}={}){const h=Math.max(.36,i),r=t.x-e.x,l=t.z-e.z,p=.08-e.y;let dragMult=1;if(st==="SLICE")dragMult=1.25;else if(st==="LOB")dragMult=1.1;else if(st==="FLAT"||st==="SMASH")dragMult=0.85;else if(st==="DINK")dragMult=1.0;const g=L.GRAVITY+a*.12,estSpeed=Math.abs(l)/h,dragLoss=Math.exp(0.5*L.AIR_DRAG*dragMult*estSpeed*h),c=(r/h-.5*(s*.12)*h)*dragLoss,y=(l/h)*dragLoss;let f=((p+.5*g*h*h)/h)*dragLoss;this.ball.vel.set(c,f,y),this.ball.spin.set(a,s,0),this.ball.targetLanding.copy(t);const willCrossNet=(e.z>0&&t.z<0)||(e.z<0&&t.z>0);if(willCrossNet&&Math.abs(y)>0.1){const tNet=(Math.abs(e.z)/Math.abs(y))*1.08,expectedNetY=e.y+f*tNet-.5*g*tNet*tNet;if(n){const targetNetY=S.NET_HEIGHT_CENTER-0.08-Math.random()*0.12,u=(targetNetY-expectedNetY)/tNet;this.ball.vel.y+=u;}else{let minClearance=0.28;if(st==="FLAT"||st==="SMASH")minClearance=0.20;else if(st==="DINK")minClearance=0.24;else if(st==="SLICE")minClearance=0.32;else if(st==="LOB")minClearance=2.2;const b=S.NET_HEIGHT_CENTER+minClearance;if(expectedNetY<b&&tNet>0){const u=(b-expectedNetY)/tNet;this.ball.vel.y+=u;}}}}_predictBallIntercept(e){const t=this.ball.targetLanding,i=o.MathUtils.clamp(t.z+e.sideSign*2.15,e.sideSign>0?3.2:-13.6,e.sideSign>0?13.4:-3.2),a=t.x<-.12?.38:-.38,s=o.MathUtils.clamp(t.x+a,-S.DOUBLES_X+.4,S.DOUBLES_X-.4);e.targetPos.set(s,0,i),e===this.player&&this.playerPartner?t.z>0&&t.z<6.6&&Math.abs(t.x-this.playerPartner.pos.x)<2.9?this.playerPartner.targetPos.set(o.MathUtils.clamp(t.x,-S.SINGLES_X+.4,S.SINGLES_X-.4),0,o.MathUtils.clamp(t.z+.85,2.8,6.2)):this.playerPartner.targetPos.set(o.MathUtils.clamp(t.x*.42+(this.score.deuceSide?-1.35:1.35),-2.9,2.9),0,5.1):e===this.opponent&&this.opponentPartner&&this.opponentPartner.targetPos.set(o.MathUtils.clamp(t.x*.45+(this.score.deuceSide?1.35:-1.35),-2.9,2.9),0,-5.1)}update(e){if(this.isPaused){this._updateCameraRig(e);return;}this._applyManualMovement(e);this.elapsedTime+=e,this.cameraTrauma=Math.max(0,this.cameraTrauma-e*1.4);const t=this.swingVfx?this.swingVfx.consumeHitStop(e):e,i=this.phase==="REPLAY"?.38:1;if(this.botControllers&&this.botControllers.size>0){if(this.matchType==="doubles"){this.botControllers.has("A1")&&this.botControllers.get("A1").updateTeamwork(this.playerPartner,this.ball);this.botControllers.has("A2")&&this.botControllers.get("A2").updateTeamwork(this.player,this.ball);this.botControllers.has("B1")&&this.botControllers.get("B1").updateTeamwork(this.opponentPartner,this.ball);this.botControllers.has("B2")&&this.botControllers.get("B2").updateTeamwork(this.opponent,this.ball)}this.playerRole!=="p2"&&this.botControllers.forEach(bc=>bc.update(e,this))}for(this.physicsAccumulator+=t*i;this.physicsAccumulator>=L.FIXED_DT;)this._stepPhysics(L.FIXED_DT),this.physicsAccumulator-=L.FIXED_DT;if(this.isMultiplayer&&this.roomId&&this.roomId!=="default"&&this.playerRole==="p1"&&this.elapsedTime-this.lastSyncSentAt>=.045&&(this.lastSyncSentAt=this.elapsedTime,this._broadcastMultiplayerSnapshot()),this._updateMiiAnimation(this.player,e),this._updateMiiAnimation(this.playerPartner,e),this._updateMiiAnimation(this.opponent,e),this._updateMiiAnimation(this.opponentPartner,e),this._updateCrowdAnimation(e),this.swingVfx)if(this.swingVfx.update(e,{actors:[this.player,this.playerPartner,this.opponent,this.opponentPartner],ball:this.ball,camera:this.camera}),this.phase==="SHOWCASE"){const a=this.showcaseModeName||"showcase_topspin";a==="showcase_slice"||a==="showcase_backhand"?this.swingVfx.seedActorSwingArc(this.player,{shotType:"SLICE",isPower:!1,whipSpeed:26,swingType:"backhand"}):a==="showcase_smash"?this.swingVfx.seedActorSwingArc(this.player,{shotType:"SMASH",isPower:!0,whipSpeed:34,swingType:"smash"}):a==="showcase_topspin"&&this.swingVfx.seedActorSwingArc(this.player,{shotType:"TOPSPIN",isPower:!0,whipSpeed:29,swingType:"forehand"})}else this.phase==="REPLAY"&&this.persistentStateLock&&!this.userHasInteracted?(this.swingVfx.seedActorSwingArc(this.player,{shotType:"TOPSPIN",isPower:!0,whipSpeed:28,swingType:"forehand"}),this.swingVfx.seedActorSwingArc(this.opponent,{shotType:"SLICE",isPower:!1,whipSpeed:25,swingType:"forehand"})):this.phase==="RALLY"&&this.autoPlayMode&&!this.userHasInteracted&&this.swingVfx.seedActorSwingArc(this.player,{shotType:"TOPSPIN",isPower:!0,whipSpeed:28,swingType:"forehand"});this._updateEffects(e),this._updateCameraRig(e),this._updateProjectedHUD()}_stepPhysics(e){if(this.phaseTimer+=e,this.player.swingCooldown>0&&(this.player.swingCooldown=Math.max(0,this.player.swingCooldown-e)),this.playerPartner.swingCooldown>0&&(this.playerPartner.swingCooldown=Math.max(0,this.playerPartner.swingCooldown-e)),this.opponent.swingCooldown>0&&(this.opponent.swingCooldown=Math.max(0,this.opponent.swingCooldown-e)),this.opponentPartner.swingCooldown>0&&(this.opponentPartner.swingCooldown=Math.max(0,this.opponentPartner.swingCooldown-e)),this.phase==="SHOWCASE"){if(this.phaseTimer>=.34)this.phaseTimer=0,this._refreshShowcasePose();else{const t=this.showcaseModeName||"showcase_topspin";(t==="showcase_slice"||t==="showcase_backhand")&&this.player.racketKinematics?(this.player.racketKinematics.swingActive=!0,this.player.racketKinematics.swingElapsed=.072,this.player.swingTimer=.26):t==="showcase_smash"&&this.player.racketKinematics?(this.player.racketKinematics.swingActive=!0,this.player.racketKinematics.swingElapsed=.058,this.player.swingTimer=.26):t==="showcase_topspin"&&this.player.racketKinematics?(this.player.racketKinematics.swingActive=!0,this.player.racketKinematics.swingElapsed=.068,this.player.swingTimer=.26):t==="showcase_panic"?(this.player.vel.set(-6.8,0,1.2),this.player.stridePhase+=e*15):t==="showcase_win"&&this.player.rig?.reaction&&(this.player.rig.reaction.timer=.16)}return}if(this.phase==="REPLAY"){if(this.persistentStateLock&&!this.userHasInteracted){const t=.5+.5*Math.sin(this.elapsedTime*2.2),i=new o.Vector3(-1.12,1.22,-1.08),a=new o.Vector3(-.18+t*.22,1.32+t*.08,-.05+t*.22);this.ball.pos.copy(a),this.ballTrail.seedArc(i,a,.24),this.player.swingTimer=.22,this.player.arcVisibleTimer=.9,this.opponent.swingTimer=.2,this.opponent.arcVisibleTimer=.9,this.player.racketKinematics&&(this.player.racketKinematics.swingActive=!0,this.player.racketKinematics.swingShotType="topspin",this.player.racketKinematics.swingSide="forehand",this.player.racketKinematics.swingElapsed=.13),this.opponent.racketKinematics&&(this.opponent.racketKinematics.swingActive=!0,this.opponent.racketKinematics.swingShotType="slice",this.opponent.racketKinematics.swingSide="forehand",this.opponent.racketKinematics.swingElapsed=.11);return}this.ball.pos.addScaledVector(this.ball.vel,e),this.ball.vel.y-=L.GRAVITY*.65*e,this.ballTrail.pushPoint(this.ball.pos),this.phaseTimer>1.45&&(this.hud.setReplayMode(!1),this._setupPointServe({showBanner:!0}));return}if(this.phase==="SERVE_STANCE"&&!this.persistentStateLock&&(this.score.server==="opponent"&&!this.isMultiplayer&&this.phaseTimer>1.25?this._startServeToss(this.opponent):this.autoPlayMode&&this.score.server==="player"&&this.phaseTimer>1.4&&this._startServeToss(this.player)),this.phase==="SERVE_TOSS"){this.ball.pos.addScaledVector(this.ball.vel,e),this.ball.vel.y-=L.GRAVITY*e;const t=o.MathUtils.clamp((this.ball.pos.y-1.15)/(3.35-1.15),0,1);if(this.hud.updateTimingGauge({cursorNormalized:t*.52,modeTitle:"SERVE APEX TIMING",speedText:this.ball.pos.y>=2.05?"SWEET SPOT! (198 KM/H)":"RISING..."}),this.pendingServeSwing&&(this.ball.pos.y>=2.68||this.ball.vel.y<=.35)){const{actor:i,evt:a}=this.pendingServeSwing;this.pendingServeSwing=null,this._executeServeHit(i,a);return}if((this.score.server==="opponent"&&!this.isMultiplayer||this.autoPlayMode)&&this.ball.vel.y<=.25&&this.ball.pos.y>=2.75){const i=this.score.server==="player"?this.player:this.opponent;this._executeServeHit(i,{timing:"PERFECT"});return}this.ball.pos.y<=.95&&this.ball.vel.y<0&&(this.phase="SERVE_STANCE",this.phaseTimer=0,this.ball.vel.set(0,0,0),this.pendingServeSwing=null);return}if(this.phase==="POINT_OVER"){this.phaseTimer>2.15&&this._setupPointServe({showBanner:!0});return}if(this.phase==="RALLY"&&this.ball.inPlay){if(this.autoPlayMode&&!this.userHasInteracted){const s=this.elapsedTime*.85%1,n=.42+.34*Math.sin(s*Math.PI*2),h=new o.Vector3(1.42,1.24,10.85),r=new o.Vector3(-1.35,.25,-8.5),l=new o.Vector3().lerpVectors(h,r,n);l.y+=Math.sin(n*Math.PI)*1.45,this.ball.pos.copy(l),this.ball.mesh&&(this.ball.mesh.rotation.x-=e*16),this.ballTrail.setStyle("TOPSPIN",!1),this.ballTrail.seedArc(h,l,.78*n),this.player.pos.set(1.35+Math.sin(this.elapsedTime*2.2)*.18,0,11.4),this.player.stridePhase+=e*4.2,this.player.swingType="forehand",this.player.swingTimer=.24,this.player.arcVisibleTimer=.85,this.player.racketKinematics&&(this.player.racketKinematics.swingActive=!0,this.player.racketKinematics.swingShotType="topspin",this.player.racketKinematics.swingSide="forehand",this.player.racketKinematics.swingElapsed=.12),this.opponent.pos.set(-1.35+Math.cos(this.elapsedTime*2.2)*.35,0,-10.5),this.opponent.stridePhase+=e*4.2;return}const t=this.ball.pos.z,i=this.ball.vel.length();const stPhysics=this.ball.shotType||"TOPSPIN";let dragMult=1;if(stPhysics==="SLICE")dragMult=1.25;else if(stPhysics==="LOB")dragMult=1.1;else if(stPhysics==="FLAT"||stPhysics==="SMASH")dragMult=0.85;else if(stPhysics==="DINK")dragMult=1.0;const a=Math.max(0,1-L.AIR_DRAG*dragMult*i*e);if(this.ball.vel.multiplyScalar(a),this.ball.vel.y-=(L.GRAVITY+this.ball.spin.x*.14)*e,this.ball.vel.x+=this.ball.spin.y*.12*e,this.ball.pos.addScaledVector(this.ball.vel,e),this.ball.mesh&&(this.ball.mesh.rotation.x+=this.ball.vel.z*e*1.8,this.ball.mesh.rotation.z-=this.ball.vel.x*e*1.8),this.ballTrail.pushPoint(this.ball.pos),this.ball.isPowerShot&&Math.random()<.45&&this._spawnStarBurst(this.ball.pos,1),(t>0&&this.ball.pos.z<=0||t<0&&this.ball.pos.z>=0)&&this.ball.pos.y<S.NET_HEIGHT_CENTER+.04){this.ball.vel.z*=-.25,this.ball.vel.x*=.45,this.ball.vel.y=1.2,this.audioEngine&&this.audioEngine.playNetCord();const netCallout=stPhysics==="FLAT"?"ĐẬP VƯỚNG LƯỚI!":"VƯỚNG LƯỚI!";this.hud&&this.hud.showTimingPopup&&this.hud.showTimingPopup({grade:netCallout,detail:stPhysics==="FLAT"?"SMASH NET FAULT":"NET CORD",durationMs:1500});this._awardPoint(this.ball.lastHitter==="player"?"opponent":"player","Net");return}if(this.ball.pos.y<=.075&&this.ball.vel.y<0){const s=Math.abs(this.ball.vel.y);this.ball.pos.y=.075;let shotRestitution=L.BOUNCE_RESTITUTION,shotFriction=L.SURFACE_FRICTION;if(stPhysics==="SLICE"){shotRestitution=0.52;shotFriction=0.62;}else if(stPhysics==="DINK"){shotRestitution=0.42;shotFriction=0.72;}else if(stPhysics==="FLAT"){shotRestitution=0.80;shotFriction=0.92;}else if(stPhysics==="LOB"){shotRestitution=0.84;shotFriction=0.76;}else if(stPhysics==="TOPSPIN"){shotRestitution=0.70;shotFriction=1.04;}this.ball.vel.y=-this.ball.vel.y*shotRestitution;this.ball.vel.x*=shotFriction;this.ball.vel.z*=shotFriction;this._spawnBounceRing(this.ball.pos.x,this.ball.pos.z);this.swingVfx&&this.swingVfx.spawnTurfBounce(this.ball.pos.x,this.ball.pos.z,this.ball,s);this.audioEngine&&this.audioEngine.playBallBounce(Math.min(1.2,s/5));const n=this.ball.pos.z>0,h=this.ball.lastHitter==="player";if(h&&n||!h&&!n){this._awardPoint(h?"opponent":"player","Out");return}if(this.ball.bounceCountOnCurrentSide+=1,this.ball.bounceCountOnCurrentSide===1){const r=Math.abs(this.ball.pos.x)>S.SINGLES_X+.22,l=Math.abs(this.ball.pos.z)>S.BASELINE_Z+.28;if(r||l){this._awardPoint(h?"opponent":"player","Out");return}}if(this.ball.bounceCountOnCurrentSide>=2){this._awardPoint(this.ball.lastHitter,"Nice Shot!");return}}(!this.botControllers||!this.botControllers.has("A1"))&&this._stepActorFootwork(this.player,e),(!this.botControllers||!this.botControllers.has("A2"))&&this._stepActorFootwork(this.playerPartner,e),(!this.botControllers||!this.botControllers.has("B1"))&&this._stepActorFootwork(this.opponent,e),(!this.botControllers||!this.botControllers.has("B2"))&&this._stepActorFootwork(this.opponentPartner,e);if(this.ball.lastHitter==="player"&&this.ball.pos.z<-2)if(this.isMultiplayer||(this.botControllers&&this.botControllers.has("B1"))){const s=Math.hypot(this.ball.pos.x-this.opponent.pos.x,this.ball.pos.z-this.ball.pos.z),n=Math.hypot(this.ball.pos.x-this.opponentPartner.pos.x,this.opponentPartner.pos.z-this.ball.pos.z),h=(a=>a==="B2"?this.opponentPartner:a==="B1"?this.opponent:null)(this.pendingP2Swing&&this.pendingP2Swing.evt&&this.pendingP2Swing.evt.slotActor)||(this.ball.pos.z>=-7.2&&n<s&&n<=3.9?this.opponentPartner:this.opponent),r=h.pos.z-this.ball.pos.z,l=Math.abs(this.ball.pos.x-h.pos.x);if(this._viewTeamB()){const p=o.MathUtils.clamp(.5+r*.16,.06,.94);this.hud.updateTimingGauge({cursorNormalized:p,modeTitle:h===this.opponentPartner?"P2 NET TIMING":"P2 SWING TIMING",speedText:r>=-1.45&&r<=.68?"SWEET SPOT!":r<-1.45?"EARLY (CROSS)":"LATE (LINE)"})}if(this.pendingP2Swing)if(this.elapsedTime>this.pendingP2Swing.expiresAt)this.pendingP2Swing=null;else{const p=h===this.opponentPartner?3.95:4.65;if(r>=-.85&&r<=.65&&Math.hypot(l,r)<=p&&this.ball.pos.y<2.35){const c=this.pendingP2Swing.evt;this.pendingP2Swing=null,this._attemptP2RallyStrike(c);return}}if(this.ball.pos.z<-15.6){this._awardPoint("player","Nice Shot!");return}}else{const s=this.matchConfig.difficulty!=="pro",n=s?.85:1.3,h=s?1.8:2.34;if(!this.ball.isPowerShot&&this.ball.shotType!=="LOB"&&this.ball.rallyStrokeCount>2&&Math.abs(this.ball.pos.z-this.opponentPartner.pos.z)<.88&&Math.abs(this.ball.pos.x-this.opponentPartner.pos.x)<n&&this.ball.pos.y<1.78&&(!s||Math.random()<.55)){this._executeOpponentReturn(this.opponentPartner);return}const r=Math.abs(this.ball.pos.z-this.opponent.pos.z),l=Math.abs(this.ball.pos.x-this.opponent.pos.x);if(r<1.32&&this.ball.pos.y<2.05){if(l<=h)this._executeOpponentReturn(this.opponent);else if(l<=3.45&&this.opponent.swingTimer<=0){const p=this.ball.pos.x<this.opponent.pos.x?"backhand":"forehand";this.opponent.swingType=p,this.opponent.swingDuration=.36,this.opponent.swingTimer=.36,this.opponent.arcVisibleTimer=.32,this.racketKinematics&&this.racketKinematics.triggerSwing(this.opponent,{shotType:"slice",side:p,speed:1.2,timing:"late"}),this.facialFX&&(this.facialFX.setExpression(this.opponent,"wide_eyed_panic",.9),this.facialFX.spawnSweatDrops(this.opponent,5)),this.audioEngine&&this.audioEngine.playSwingWhoosh(.95)}}else if(this.ball.pos.z<-15.2){this._awardPoint("player","Nice Shot!");return}}if(this.ball.lastHitter==="opponent"&&this.ball.pos.z>2){const s=Math.hypot(this.ball.pos.x-this.player.pos.x,this.ball.pos.z-this.player.pos.z),n=Math.hypot(this.ball.pos.x-this.playerPartner.pos.x,this.ball.pos.z-this.playerPartner.pos.z),h=(a=>a==="A2"?this.playerPartner:a==="A1"?this.player:null)(this.pendingUserSwing&&this.pendingUserSwing.evt&&this.pendingUserSwing.evt.slotActor)||(this.ball.pos.z<=7.2&&n<s&&n<=3.8?this.playerPartner:this.player),r=this.ball.pos.z-h.pos.z,l=Math.abs(this.ball.pos.x-h.pos.x);if(!this._viewTeamB()){const p=o.MathUtils.clamp(.5+r*.16,.06,.94);this.hud.updateTimingGauge({cursorNormalized:p,modeTitle:h===this.playerPartner?"NET VOLLEY TIMING":"SWING TIMING",speedText:r>=-1.45&&r<=.68?"SWEET SPOT!":r<-2.65?"VERY EARLY":r<-1.45?"EARLY (CROSS)":r>1.35?"TOO LATE!":"LATE (LINE)"})}if(this.pendingUserSwing)if(this.elapsedTime>this.pendingUserSwing.expiresAt)this.pendingUserSwing=null;else{const p=h===this.playerPartner?3.95:4.65;if((!this.pendingUserSwing.waitForSweetSpot||r>=-.85&&r<=.65)&&Math.hypot(l,r)<=p&&this.ball.pos.y<2.35){const c=this.pendingUserSwing.evt;this.pendingUserSwing=null,this._attemptPlayerRallyStrike(c,!1);return}}if(this.autoPlayMode&&!this.userHasInteracted&&Math.abs(r)<.55&&l<1.45&&this.ball.pos.y<1.75)this._attemptPlayerRallyStrike({timing:"PERFECT"},!0);else if(this.ball.pos.z>15.6){this._awardPoint("opponent",this.isMultiplayer?"Nice Shot!":"Point");return}}}}_stepActorFootwork(e,t){const i=e.targetPos.x-e.pos.x,a=e.targetPos.z-e.pos.z,s=Math.hypot(i,a);if(s>.08){const n=Math.min(s,e.maxSpeed*t),h=i/s*(n/t),r=a/s*(n/t);e.vel.set(h,0,r),e.pos.x+=i/s*n,e.pos.z+=a/s*n,e.stridePhase+=n*4.4}else e.vel.set(0,0,0)}_awardPoint(e,t=""){this.phase="POINT_OVER",this.phaseTimer=0,this.ball.inPlay=!1,this.cheerEnergy=1,this.pendingUserSwing=null,this.pendingP2Swing=null,this.pendingServeSwing=null;const i=e==="player";this.bodyAnimator&&(this.bodyAnimator.triggerPointReaction(this.player,i?"win":"loss"),this.bodyAnimator.triggerPointReaction(this.playerPartner,i?"win":"loss"),this.bodyAnimator.triggerPointReaction(this.opponent,i?"loss":"win"),this.bodyAnimator.triggerPointReaction(this.opponentPartner,i?"loss":"win")),this.facialFX&&(this.facialFX.setExpression(this.player,i?"happy_grin":"shocked_loss",1.8),this.facialFX.setExpression(this.playerPartner,i?"happy_grin":"shocked_loss",1.8),this.facialFX.setExpression(this.opponent,i?"shocked_loss":"happy_grin",1.8),this.facialFX.setExpression(this.opponentPartner,i?"shocked_loss":"happy_grin",1.8),this.facialFX.triggerEmoteBurst(i?this.player:this.opponent,"win")),this.audioEngine&&this.audioEngine.playCrowdReaction(e==="player"?"cheer":"ooh"),this.motionController&&this.motionController.triggerHapticFeedback&&!this.autoPlayMode&&(this.motionController.triggerHapticFeedback({role:"p1",kind:e==="player"?"point_won":"fault",grade:t||(e==="player"?"POINT WON!":"POINT LOST"),shotType:"TOPSPIN",speedKmh:0,intensity:e==="player"?1.4:.75}),this.isMultiplayer&&this.motionController.triggerHapticFeedback({role:"p2",kind:e==="opponent"?"point_won":"fault",grade:t||(e==="opponent"?"POINT WON!":"POINT LOST"),shotType:"TOPSPIN",speedKmh:0,intensity:e==="opponent"?1.4:.75}));const isServerScoring=(e===this.score.server);
const __ev=applyRallyResult(this.score,e,{matchType:this.matchType});
if(__ev==="SECOND_SERVER")t="LƯỢT GIAO 2 (SECOND SERVER)";else if(__ev==="SIDE_OUT")t="ĐỔI GIAO BÓNG (SIDE OUT)";
this.saveMatchSessionCache();
const a=this.score.playerPoints,s=this.score.opponentPoints;
const targetPts=this.targetPoints||11;
if(getGameWinner(this.score,targetPts)){
  startNextGame(this.score,a>s?"player":"opponent");
if(this._syncScoreboardHUD(),this.score.playerGames>=this.matchConfig.gamesToWin||this.score.opponentGames>=this.matchConfig.gamesToWin){this.clearMatchSessionCache();const p=this.score.playerGames>this.score.opponentGames;this.phase="MATCH_OVER";const g=this.isMultiplayer?p?"P1 WINS!":"P2 WINS!":p?"YOU WIN!":"Game!",c=`Final Games: ${this.score.playerGames} - ${this.score.opponentGames}`;this._recordBannerBroadcast(g,"style-gold",c),this.hud.showCenterBanner(g,{style:"style-gold",subText:c,durationMs:2600}),this.audioEngine&&(this.audioEngine.playMusicForState("victory"),this.audioEngine.announceScore(p?"Game Set and Match":"Game")),setTimeout(()=>{this.hud.showVictoryModal({playerWon:this._viewTeamB()?!p:p,playerGames:this.score.playerGames,opponentGames:this.score.opponentGames})},1800);return}const l=`Games: ${this.score.playerGames} - ${this.score.opponentGames}`;this._recordBannerBroadcast("Game!","style-gold",l),this.hud.showCenterBanner("Game!",{style:"style-gold",subText:l,durationMs:1650}),this.audioEngine&&this.audioEngine.announceScore("Game");return}this._syncScoreboardHUD();const{bannerScoreText:n}=this._formatCurrentScore(),h=t==="Out"||t==="Net"?"style-fault":"style-score";this._recordBannerBroadcast(n,h,t||""),this.hud.showCenterBanner(n,{style:h,subText:t||"",durationMs:1450}),this.audioEngine&&(t==="Out"||t==="Net"||t==="Nice Shot!"?(this.audioEngine.playVoiceCallout(t,{clearQueue:!0}),this.audioEngine.announceScore(n,{delayMs:680})):this.audioEngine.announceScore(n))}_recordBannerBroadcast(e,t="style-score",i=""){this.bannerSeq+=1,this.lastBannerBroadcast={seq:this.bannerSeq,text:e,style:t,subText:i}}_broadcastMultiplayerSnapshot(){const e=i=>({px:Number(i.pos.x.toFixed(3)),pz:Number(i.pos.z.toFixed(3)),tx:Number(i.targetPos.x.toFixed(3)),tz:Number(i.targetPos.z.toFixed(3)),st:i.swingType,sw:Number(i.swingTimer.toFixed(3)),av:Number(i.arcVisibleTimer.toFixed(3))}),t={phase:this.phase,phaseTimer:Number(this.phaseTimer.toFixed(3)),cameraMode:this.cameraMode,score:{...this.score},ball:{px:Number(this.ball.pos.x.toFixed(3)),py:Number(this.ball.pos.y.toFixed(3)),pz:Number(this.ball.pos.z.toFixed(3)),vx:Number(this.ball.vel.x.toFixed(3)),vy:Number(this.ball.vel.y.toFixed(3)),vz:Number(this.ball.vel.z.toFixed(3)),inPlay:this.ball.inPlay,lastHitter:this.ball.lastHitter,shotType:this.ball.shotType,isPowerShot:this.ball.isPowerShot,rallyStrokeCount:this.ball.rallyStrokeCount},actors:{player:e(this.player),playerPartner:e(this.playerPartner),opponent:e(this.opponent),opponentPartner:e(this.opponentPartner)},banner:this.lastBannerBroadcast};fetch("/api/match/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({room:this.roomId,snapshot:t})}).catch(()=>{})}_handleRoomStateUpdate(e={}){if(!e)return;const t=!!(this.roomStatus.p2Online||this.roomStatus.p2Phone),i=!!(this.roomStatus.p1Online||this.roomStatus.p1Phone),a=!!(e.p2Online||e.p2?.connected),s=!!(e.p1Online||e.p1?.connected);if(a&&!t?(this.isMultiplayer=!0,this._applyDifficultyTuning("1v1"),this.playerRole!=="p2"&&this.audioEngine&&this.audioEngine.playServeToss&&this.audioEngine.playServeToss()):s&&!i&&this.playerRole==="p2"&&this.audioEngine&&this.audioEngine.playServeToss&&this.audioEngine.playServeToss(),this.roomStatus={roomId:e.roomId||this.roomId,hostName:e.hostName||this.roomStatus.hostName||"Player 1",guestName:e.guestName||this.roomStatus.guestName||"Player 2",p1Online:!!e.p1Online,p2Online:!!e.p2Online,p1Phone:!!e.p1?.connected,p2Phone:!!e.p2?.connected,isMultiplayer:!!(this.isMultiplayer||this.roomId&&this.roomId!=="default"),inRally:this.phase==="RALLY",tunnelUrl:e.tunnelUrl||this.roomStatus.tunnelUrl||"",urls:e.urls||this.roomStatus.urls||null},this.hud&&this.hud.updateMultiplayerRoomInfo&&this.hud.updateMultiplayerRoomInfo(this.roomStatus),this.playerRole==="p2"&&e.snapshot&&typeof e.snapshotSeq=="number"&&e.snapshotSeq>this.lastAppliedSnapshotSeq){this.lastAppliedSnapshotSeq=e.snapshotSeq;const n=e.snapshot;n.phase&&n.phase!=="TITLE"&&(this.phase==="TITLE"&&this.hud.hideTitleModal(),this.phase=n.phase,this.cameraMode=n.cameraMode||this.cameraMode),n.score&&(this.score={...this.score,...n.score},this._syncScoreboardHUD()),n.ball&&(this.ball.pos.set(n.ball.px,n.ball.py,n.ball.pz),this.ball.vel.set(n.ball.vx,n.ball.vy,n.ball.vz),this.ball.inPlay=!!n.ball.inPlay,this.ball.lastHitter=n.ball.lastHitter||this.ball.lastHitter,this.ball.shotType=n.ball.shotType||"TOPSPIN",this.ball.isPowerShot=!!n.ball.isPowerShot,this.ball.rallyStrokeCount=Number(n.ball.rallyStrokeCount||0),this.ballTrail.setStyle(this.ball.shotType,this.ball.isPowerShot));const h=(r,l)=>{l&&(r.pos.x=o.MathUtils.lerp(r.pos.x,l.px,.65),r.pos.z=o.MathUtils.lerp(r.pos.z,l.pz,.65),r.targetPos.set(l.tx,0,l.tz),l.sw>0&&r.swingTimer<=.05&&(r.swingType=l.st||"forehand",r.swingTimer=l.sw,r.arcVisibleTimer=l.av||.32,this.racketKinematics&&this.racketKinematics.triggerSwing(r,{shotType:(n.ball?.shotType||"topspin").toLowerCase(),side:l.st==="backhand"?"backhand":l.st==="smash"?"overhead":"forehand",speed:1.2,timing:"sweet"})))};if(n.actors&&(h(this.player,n.actors.player),h(this.playerPartner,n.actors.playerPartner),h(this.opponent,n.actors.opponent),h(this.opponentPartner,n.actors.opponentPartner)),n.banner&&n.banner.seq&&n.banner.seq!==this.bannerSeq&&(this.bannerSeq=n.banner.seq,this.hud.showCenterBanner(n.banner.text,{style:n.banner.style||"style-score",subText:n.banner.subText||"",durationMs:1550}),this.audioEngine)){const r=n.banner.subText||"";r==="Out"||r==="Net"||r==="Nice Shot!"?(this.audioEngine.playVoiceCallout(r,{clearQueue:!0}),this.audioEngine.announceScore(n.banner.text,{delayMs:680})):this.audioEngine.announceScore(n.banner.text)}}}_formatCurrentScore(){
  const p=this.score.playerPoints;
  const o=this.score.opponentPoints;
  const pText=String(p).padStart(2,"0");
  const oText=String(o).padStart(2,"0");
  const sNum=this.score.serverNumber||2;
  const sP=(this.score.server==="player");
  const callout=this.matchType==="singles"?(sP?`${p} - ${o}`:`${o} - ${p}`):(sP?`${p} - ${o} - ${sNum}`:`${o} - ${p} - ${sNum}`);
  return{playerScoreText:pText,opponentScoreText:oText,serverNumber:sNum,deuceLabel:null,bannerScoreText:callout};
}_getHighStakesPointLabel(){const tp=this.targetPoints||11,sv=this.score.server==="player",sp=sv?this.score.playerPoints:this.score.opponentPoints,op=sv?this.score.opponentPoints:this.score.playerPoints,sg=sv?this.score.playerGames:this.score.opponentGames;return sp+1>=tp&&sp+1-op>=2?(sg+1>=this.matchConfig.gamesToWin?"Match Point":"Game Point"):null}_syncScoreboardHUD(){const e=this._formatCurrentScore();this.hud.updateScoreboard({playerScoreText:e.playerScoreText,opponentScoreText:e.opponentScoreText,deuceLabel:e.deuceLabel,serverNumber:this.score.serverNumber||2,server:this.score.server,playerGames:this.score.playerGames,opponentGames:this.score.opponentGames,gamesToWin:this.matchConfig.gamesToWin})}_updateMiiAnimation(e,t){if(!e.model)return;e.swingTimer>0&&(e.swingTimer=Math.max(0,e.swingTimer-t)),e.arcVisibleTimer>0&&(e.arcVisibleTimer=Math.max(0,e.arcVisibleTimer-t)),e.swingArcMesh&&(e.swingArcMesh.visible=!1);let i=null;if(this.motionController&&this.motionController.phoneState?.connected&&e===this._localActor()){const s=this.motionController.phoneState.orientation||{};i={tiltPitch:(Number(s.pitch)||0)*Math.PI/180,tiltRoll:(Number(s.roll)||0)*Math.PI/180,tiltYaw:(Number(s.yaw)||0)*Math.PI/180,accelMag:Number(this.motionController.phoneState.accelMag)||0}}if(this.racketKinematics){let a=t;if(this.phase==="SHOWCASE"&&e===this.player&&e.racketKinematics){const s=this.showcaseModeName||"showcase_topspin";a=1e-4,s==="showcase_slice"||s==="showcase_backhand"?(e.racketKinematics.swingActive=!0,e.racketKinematics.swingElapsed=.072):s==="showcase_smash"?(e.racketKinematics.swingActive=!0,e.racketKinematics.swingElapsed=.058):s==="showcase_topspin"&&(e.racketKinematics.swingActive=!0,e.racketKinematics.swingElapsed=.068)}this.racketKinematics.update(e,a,{phase:this.phase,score:this.score,ball:this.ball,elapsedTime:this.elapsedTime,liveInput:i})}this.bodyAnimator?this.bodyAnimator.updateMiiBodyAnimation(e,t,this):e.root.position.set(e.pos.x,e.pos.y,e.pos.z),j(e,e.rig?.verticalHopOffset||0),this.facialFX&&this.facialFX.update(e,t,{phase:this.phase,ball:this.ball,score:this.score,rallyCount:this.ball.rallyStrokeCount,camera:this.camera})}_initStadiumLife(){try{this.stadiumLife=new SL(this,o)}catch(err){console.warn("[StadiumLife]",err)}try{this.playerMarkers=new PM(this,o)}catch(err){console.warn("[PlayerMarkers]",err)}}_updateCrowdAnimation(e){this.stadiumLife&&this.stadiumLife.update(e);this.playerMarkers&&this.playerMarkers.update(e);if(this.cheerEnergy=Math.max(.22,this.cheerEnergy-e*.35),this.crowdScene){const t=5.5+this.cheerEnergy*4.5,i=.025+this.cheerEnergy*.055;this.crowdScene.position.y=Math.abs(Math.sin(this.elapsedTime*t))*i}}_spawnBounceRing(e,t){const i=this.bounceRings.find(a=>!a.active)||this.bounceRings[0];i.active=!0,i.age=0,i.mesh.position.set(e,.024,t),i.mesh.scale.setScalar(.6),i.mesh.material.opacity=.9,i.mesh.visible=!0}_spawnStarBurst(e,t=8){let i=0;for(let a=0;a<this.starParticles.length&&i<t;a++){const s=this.starParticles[a];s.active||(s.active=!0,s.age=0,s.maxAge=.32+Math.random()*.22,s.mesh.position.copy(e),s.vel.set((Math.random()-.5)*4.2,(Math.random()-.2)*3.8,(Math.random()-.5)*4.2),s.mesh.scale.setScalar(.9+Math.random()*.6),s.mesh.material.opacity=1,s.mesh.visible=!0,i++)}}_updateEffects(e){if(this.ball.mesh&&this.ball.mesh.position.copy(this.ball.pos),this.ballShadowBlob){this.ballShadowBlob.position.x=this.ball.pos.x,this.ballShadowBlob.position.z=this.ball.pos.z;const t=o.MathUtils.clamp(1.15-this.ball.pos.y*.16,.45,1.15);this.ballShadowBlob.scale.setScalar(t),this.ballShadowBlob.material.opacity=o.MathUtils.clamp(.88-this.ball.pos.y*.14,.28,.88)}for(const t of this.bounceRings){if(!t.active)continue;t.age+=e;const i=t.age/.48;i>=1?(t.active=!1,t.mesh.visible=!1):(t.mesh.scale.setScalar(.6+i*2.4),t.mesh.material.opacity=(1-i)*.85)}for(const t of this.starParticles){if(!t.active)continue;t.age+=e;const i=t.age/t.maxAge;i>=1?(t.active=!1,t.mesh.visible=!1):(t.mesh.position.addScaledVector(t.vel,e),t.mesh.rotation.y+=e*9,t.mesh.rotation.z+=e*7,t.mesh.scale.setScalar((1-i*.65)*1.15),t.mesh.material.opacity=1-i)}this.cloudRing1&&(this.cloudRing1.rotation.y+=e*.0065),this.cloudRing2&&(this.cloudRing2.rotation.y+=e*.0035),this.ballTrail.updateGeometry(this.camera)}_computeTargetCameraPose(){const e=this.manualCameraOverride||this.cameraMode,t=new o.Vector3,i=new o.Vector3;if(e==="INTRO_PAN"){const a=this.elapsedTime*.42;t.set(Math.sin(a)*9.5,8.2,16.5+Math.cos(a)*3.5),i.set(0,.8,-1.5)}else if(e==="SHOWCASE_CAM")t.set(1.15,1.54,7.55),i.set(1.15,1.12,11.2);else if(e==="SERVE_CAM")if(this._viewTeamB()){const a=this.opponent.pos.x;t.set(a*.16,7.8,-22.8),i.set(a*.08,.35,-1.8)}else{const a=this.player.pos.x;t.set(a*.16,7.8,22.8),i.set(a*.08,.35,1.8)}else e==="REPLAY_CAM"?(t.set(2.35,1.48,4.15),i.set(-1.45,.95,-1.35)):this._viewTeamB()?(t.set(this.opponent.pos.x*.16,7.8,-22.8),i.set(this.ball.pos.x*.12,.35,-1.8)):(t.set(this.player.pos.x*.16,7.8,22.8),i.set(this.ball.pos.x*.12,.35,1.8));return{targetPos:t,targetLook:i}}_snapCameraImmediate(){const{targetPos:e,targetLook:t}=this._computeTargetCameraPose();this.cameraPosSmooth.copy(e),this.cameraLookSmooth.copy(t),this.camera.position.copy(e),this.camera.lookAt(t),this.camera.updateMatrixWorld(),this.ballTrail.updateGeometry(this.camera),this._updateProjectedHUD()}_updateCameraRig(e){const{targetPos:t,targetLook:i}=this._computeTargetCameraPose(),a=1-Math.exp(-6.5*e);if(this.cameraPosSmooth.lerp(t,a),this.cameraLookSmooth.lerp(i,a),this.camera.position.copy(this.cameraPosSmooth),this.cameraTrauma>.001){const s=this.cameraTrauma*this.cameraTrauma*.26;this.camera.position.x+=(Math.random()-.5)*s,this.camera.position.y+=(Math.random()-.5)*s}this.camera.lookAt(this.cameraLookSmooth)}_projectToScreen(e){const t=e.clone().project(this.camera),i=t.z>=-1&&t.z<=1,a=(t.x*.5+.5)*window.innerWidth,s=(-t.y*.5+.5)*window.innerHeight;return{x:a,y:s,visible:i}}_updateProjectedHUD(){if((this.phase==="SERVE_STANCE"||this.phase==="SERVE_TOSS")&&this.cameraMode!=="REPLAY_CAM"){const i=(this.score.server==="player"?this.player:this.opponent).pos.clone().add(new o.Vector3(0,2.25,0)),a=this._projectToScreen(i);this.hud.updateServerTag(a,!0)}else this.hud.updateServerTag(null,!1)}_onResize(){const w=window.innerWidth,h=window.innerHeight,a=w/h;this.camera.aspect=a,this.camera.fov=a<1?Math.min(78,45*Math.pow(1/a,.62)):45,this.camera.updateProjectionMatrix(),this.renderer.setSize(w,h)}setLightingPreset(mode="day"){
  if(mode==="night"){
    this.scene&&(this.scene.background=new o.Color(0x07111e),this.scene.fog&&(this.scene.fog.color.setHex(0x0a1628),this.scene.fog.density=0.0055));
    this.hemiLight&&(this.hemiLight.color.setHex(0x38bdf8),this.hemiLight.groundColor.setHex(0x0f172a),this.hemiLight.intensity=0.85);
    this.sunLight&&(this.sunLight.color.setHex(0xe0f2fe),this.sunLight.intensity=2.9,this.sunLight.position.set(12,28,14));
    this.fillLight&&(this.fillLight.color.setHex(0x818cf8),this.fillLight.intensity=1.4);
    this.renderer&&(this.renderer.toneMappingExposure=1.25);
  }else if(mode==="sunset"){
    this.scene&&(this.scene.background=new o.Color(0x3b110e),this.scene.fog&&(this.scene.fog.color.setHex(0x451a14),this.scene.fog.density=0.0042));
    this.hemiLight&&(this.hemiLight.color.setHex(0xfb923c),this.hemiLight.groundColor.setHex(0x7c2d12),this.hemiLight.intensity=1.1);
    this.sunLight&&(this.sunLight.color.setHex(0xff7733),this.sunLight.intensity=2.8,this.sunLight.position.set(18,14,16));
    this.fillLight&&(this.fillLight.color.setHex(0xf43f5e),this.fillLight.intensity=0.95);
    this.renderer&&(this.renderer.toneMappingExposure=1.18);
  }else{
    this.scene&&(this.scene.background=new o.Color(7914239),this.scene.fog&&(this.scene.fog.color.setHex(12313855),this.scene.fog.density=0.0038));
    this.hemiLight&&(this.hemiLight.color.setHex(10935551),this.hemiLight.groundColor.setHex(5612068),this.hemiLight.intensity=1.22);
    this.sunLight&&(this.sunLight.color.setHex(16775660),this.sunLight.intensity=2.55,this.sunLight.position.set(14.5,25,15));
    this.fillLight&&(this.fillLight.color.setHex(13362943),this.fillLight.intensity=0.72);
    this.renderer&&(this.renderer.toneMappingExposure=1.12);
  }
}
applyScenery(sceneryId="landmark81"){
  const info=SCENERIES[sceneryId]||SCENERIES.landmark81;
  this.currentSceneryId=info.id;
  try{localStorage.setItem("hachihi_selected_scenery",info.id);}catch(e){}
  if(this.currentSceneryMesh){
    this.scene.remove(this.currentSceneryMesh);
    this.currentSceneryMesh.traverse(c=>{
      if(c.geometry)c.geometry.dispose();
      if(c.material){
        if(Array.isArray(c.material))c.material.forEach(m=>m.dispose());
        else c.material.dispose();
      }
    });
    this.currentSceneryMesh=null;
  }
  try{
    this.currentSceneryMesh=createSceneryGroup(o,info.id);
    this.scene.add(this.currentSceneryMesh);
  }catch(err){console.warn("[Scenery] Failed to create 3D scenery:",err);}
  this.setLightingPreset(info.lighting);
  if(this.scene){
    if(info.skyColor)this.scene.background=new o.Color(info.skyColor);
    if(this.scene.fog&&info.fogColor){
      this.scene.fog.color.setHex(info.fogColor);
      this.scene.fog.density=(info.lighting==="night"?0.0055:0.0038);
    }
  }
  if(this.hud&&this.hud.updateSceneryUI){
    this.hud.updateSceneryUI(info);
  }
}
triggerConfetti(){
  for(let i=0;i<6;i++){
    const rx=(Math.random()-0.5)*7,rz=(Math.random()-0.5)*8;
    this._spawnStarBurst(new o.Vector3(rx,2.2+Math.random()*1.8,rz),16);
  }
  this.audioEngine&&this.audioEngine.playCrowdReaction("cheer");
}
triggerCrowdCheer(type="clap"){
  if(this.audioEngine&&this.audioEngine.playCrowdShout){
    this.audioEngine.playCrowdShout(type);
  }else if(this.audioEngine&&this.audioEngine.playCrowdReaction){
    this.audioEngine.playCrowdReaction("cheer");
  }
  this.cheerEnergy=1.6;
  this.facialFX&&this.facialFX.triggerEmoteBurst(this.player,"win");
}
pauseMatch(){
  this.isPaused = true;
  this.hud.showPauseModal({
    playerPoints: this.score.playerPoints,
    opponentPoints: this.score.opponentPoints,
    playerGames: this.score.playerGames,
    opponentGames: this.score.opponentGames,
    matchType: this.matchType
  });
}
resumeMatch(){
  this.isPaused = false;
  this.hud.hidePauseModal();
}
restartCurrentMatch(){
  this.isPaused = false;
  this.hud.hidePauseModal();
  this.clearMatchSessionCache();
  this.startNewMatch({showStartBanner: true});
}
exitMatchToMenu(){
  this.isPaused = false;
  this.hud.hidePauseModal();
  this.saveMatchSessionCache();
  this.phase = "TITLE";
  this.hud.showTitleModal();
}
openLobbyFromPause(){
  this.isPaused = false;
  this.hud.hidePauseModal();
  this.hud.openRoomLobbyModal();
}
disbandAndCancelRoom(){
  this.isPaused = false;
  this.clearMatchSessionCache();
  this.hud.hidePauseModal();
  this.hud.closeRoomLobbyModal();
  this.phase = "TITLE";
  this.score = {playerPoints: 0, opponentPoints: 0, playerGames: 0, opponentGames: 0, server: "player", serverNumber: 2, deuceSide: true};
  this._syncScoreboardHUD();
  this.hud.showTitleModal();
  this.hud.showCenterBanner("ĐÃ HỦY PHÒNG & LÀM MỚI", { style: "style-gold", subText: "Phòng chơi đã được dọn sạch", durationMs: 2000 });
}
setGameMatchType(matchType = "doubles"){
  this.matchType = matchType;
  const isDoubles = matchType !== "singles";
  if(this.playerPartner && this.playerPartner.root){
    this.playerPartner.root.visible = isDoubles;
    if(this.playerPartner.shadowBlob) this.playerPartner.shadowBlob.visible = isDoubles;
  }
  if(this.opponentPartner && this.opponentPartner.root){
    this.opponentPartner.root.visible = isDoubles;
    if(this.opponentPartner.shadowBlob) this.opponentPartner.shadowBlob.visible = isDoubles;
  }
  this.saveMatchSessionCache();
}
applyLineupConfiguration(config = {}){
  const matchType = config.matchType || (this.matchManager ? this.matchManager.matchType : "doubles");
  this.setGameMatchType(matchType);
  const mapping = config.actorMapping || (this.matchManager ? this.matchManager.getActorMapping() : null);
  if(mapping && mapping.player && mapping.player.playerName){
    this.playerName = mapping.player.playerName;
    document.querySelectorAll('.plate-name').forEach(el => el.textContent = this.playerName);
  }
  this._rebuildBotControllers(matchType, mapping);
}
// Tạo BotController cho mọi slot bot (A1/A2/B1/B2). Cấp bot lấy theo cấp của phòng
// (matchManager.botDifficulty: easy=1, normal=2, hard=3), fallback về cấp của từng slot.
_rebuildBotControllers(matchType, mapping){
  if(!this.botControllers) this.botControllers = new Map();
  this.botControllers.clear();
  if(!mapping) return;
  const roomLevel = this.matchManager && this.matchManager.botDifficulty;
  const defs = [
    ["A1", this.player, mapping.player, "Alex (AI)"],
    ["A2", this.playerPartner, mapping.playerPartner, "Maya (AI)"],
    ["B1", this.opponent, mapping.opponent, "Matt (AI)"],
    ["B2", this.opponentPartner, mapping.opponentPartner, "Akira (AI)"]
  ];
  for(const [slotId, actor, slot, fallbackName] of defs){
    if(!actor || !slot || slot.playerType !== "bot") continue;
    if(matchType === "singles" && (slotId === "A2" || slotId === "B2")) continue;
    this.botControllers.set(slotId, new BC(actor, {
      slotId,
      playerType: "bot",
      botName: slot.playerName || slot.botName || fallbackName,
      botDifficulty: roomLevel || slot.botDifficulty || "normal",
      matchType
    }));
  }
}
// Khách (p2) ngồi ở đội A (A2) và không có người thật nào ở đội B -> input của khách điều khiển đội A
_guestControlsTeamA(){
  const slots = this.matchManager && this.matchManager.slots;
  if(!slots) return false;
  const humans = slots.filter(sl => sl.playerType === "human");
  const guestOnA = humans.some(sl => sl.teamCode === "A" && sl.slotId !== "A1");
  const humanOnB = humans.some(sl => sl.teamCode === "B");
  return guestOnA && !humanOnB;
}
// Đổi cấp độ bot ngay cho mọi bot đang có trong trận
setBotLevel(level){
  if(this.matchManager) this.matchManager.botDifficulty = level;
  this.botControllers.forEach(bc => bc.setDifficulty(level));
}
setGameModeArchitecture(mode="offline"){
  this.gameMode = mode;
  if(mode === "offline"){
    this.isMultiplayer = false;
    this.roomId = "LOCAL-BOT";
  } else if(mode === "lan"){
    this.isMultiplayer = true;
    if(!this.roomId || this.roomId === "default" || this.roomId === "LOCAL-BOT") {
      this.roomId = "HCH-LAN1";
    }
    const hostIp = window.location.hostname || "192.168.1.100";
    const lanTxt = document.getElementById("lan-ip-text");
    if(lanTxt) lanTxt.textContent = `http://${hostIp}:${window.location.port || "3000"}/?room=${this.roomId}`;
  } else if(mode === "online"){
    this.isMultiplayer = true;
    if(!this.roomId || this.roomId === "default" || this.roomId === "LOCAL-BOT") {
      this.roomId = "HCH-" + Math.random().toString(36).substring(2,6).toUpperCase();
    }
  }
  this.matchManager.roomId = this.roomId;
  this.hud.currentRoomId = this.roomId;
  this.saveMatchSessionCache();
}
saveMatchSessionCache(){
  if(this.phase === "TITLE") return;
  const session = {
    roomId: this.roomId,
    matchType: this.matchType,
    gameMode: this.gameMode,
    score: this.score,
    playerName: this.playerName,
    timestamp: Date.now()
  };
  try {
    localStorage.setItem("hachihi_match_cache", JSON.stringify(session));
  } catch(e) {}
}
clearMatchSessionCache(){
  try {
    localStorage.removeItem("hachihi_match_cache");
  } catch(e) {}
  this.pendingSessionCache = null;
}
checkPendingMatchSession(){
  try {
    const raw = localStorage.getItem("hachihi_match_cache");
    if(!raw) return;
    const s = JSON.parse(raw);
    if(s && s.score && (s.score.playerPoints > 0 || s.score.opponentPoints > 0 || s.score.playerGames > 0 || s.score.opponentGames > 0)) {
      if(Date.now() - s.timestamp < 3600 * 2000) {
        this.pendingSessionCache = s;
        this.hud.showReconnectModal(s);
      }
    }
  } catch(e) {}
}
restorePendingMatchSession(){
  if(!this.pendingSessionCache) return;
  const s = this.pendingSessionCache;
  this.roomId = s.roomId || this.roomId;
  this.gameMode = s.gameMode || "offline";
  this.setGameMatchType(s.matchType || "doubles");
  this.score = { ...s.score };
  this._syncScoreboardHUD();
  this.hud.hideReconnectModal();
  this.hud.hideTitleModal();
  this.autoPlayMode = false;
  this.userHasInteracted = true;
  this.persistentStateLock = false;
  this.isPaused = false;
  this._setupPointServe({showBanner: true});
  this.hud.showCenterBanner("ĐÃ KHÔI PHỤC TRẬN ĐẤU!", { style: "style-gold", subText: `Tiếp tục ván đấu: ${this.score.playerPoints} - ${this.score.opponentPoints}`, durationMs: 2500 });
}
render(){this.renderer.render(this.scene,this.camera)}}window.addEventListener("DOMContentLoaded",()=>{const P=new ArgonTennisEngine;window.__argonTennis=P,P._onResize(),P.loadAssetsAndStart()});
