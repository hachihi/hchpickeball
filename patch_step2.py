import re,sys
def sub(s,a,b,n=1):
    c=s.count(a)
    assert c==n,(c,a[:80])
    return s.replace(a,b)

# ---------------- game_engine.js ----------------
p='src/game_engine.js'; s=open(p).read()
s=sub(s,'import*as o from"three";','import*as o from"three";import*as __sr from"./slot_roles.js";')
s=sub(s,'this.urlRole=(this.params.get("role")||"p1").trim().toLowerCase()==="p2"?"p2":"p1"',
 'this.urlRole=__sr.normRole((this.params.get("role")||"p1").trim())')
s=sub(s,'this.playerRole=this.urlRole,',
 'this.playerRole=this.urlRole==="p1"?"p1":"p2",this.controlRole=this.urlRole,this.localSlot=__sr.slotForRole(this.urlRole),this.viewTeam=__sr.teamOfSlot(this.localSlot),')
s=sub(s,'role:this.playerRole,onSwing:i=>this._handleUserSwingInput(i),onToss:i=>this._handleUserTossInput(i),onP2Swing:i=>this._handleP2SwingInput(i),onP2Toss:i=>this._handleP2TossInput(i)',
 'role:this.controlRole,onSwing:i=>this._handleLocalSwing(i),onToss:i=>this._handleUserTossInput(i),onP2Swing:i=>this._routeSlotInput(i,!1),onP2Toss:i=>this._routeSlotInput(i,!0)')
s=sub(s,'this.playerRole=this.hud.matchManager.isHost?"p1":"p2";this.motionController&&this.motionController.setRoomConfig&&this.motionController.setRoomConfig({roomId:this.roomId,role:this.playerRole});}',
 'this.playerRole=this.hud.matchManager.isHost?"p1":"p2";{const __h=this.hud.matchManager.isHost,__ls=this.hud.matchManager.localPlayerSlot;this.localSlot=__h?"A1":(__sr.ROLE_BY_SLOT[__ls]?__ls:"B1");this.controlRole=__sr.ROLE_BY_SLOT[this.localSlot];this.viewTeam=__sr.teamOfSlot(this.localSlot);}this.motionController&&this.motionController.setRoomConfig&&this.motionController.setRoomConfig({roomId:this.roomId,role:this.controlRole});}')
s=sub(s,'__me=this.playerRole==="p2"?__m.opponent:__m.player',
 '__me=({A1:__m.player,A2:__m.playerPartner,B1:__m.opponent,B2:__m.opponentPartner})[this.localSlot]||(this.playerRole==="p2"?__m.opponent:__m.player)')
s=sub(s,'this.motionController.setRoomConfig({roomId:this.roomId,role:this.playerRole}),this.roomStatus','this.motionController.setRoomConfig({roomId:this.roomId,role:this.controlRole}),this.roomStatus')

new_methods='''_viewTeamB(){return this.viewTeam==="B"}
_slotActor(slot){return({A1:this.player,A2:this.playerPartner,B1:this.opponent,B2:this.opponentPartner})[slot]||null}
_localActor(){return this._slotActor(this.localSlot)||(this.playerRole==="p2"?this.opponent:this.player)}
_forcedSlotFor(slot){return __sr.forceActorFor(this.matchManager&&this.matchManager.slots,slot)}
_handleLocalSwing(e={}){return this._handleUserSwingInput({...e,slotActor:this._forcedSlotFor("A1")})}
_routeSlotInput(e={},toss=!1){const slot=__sr.slotForRole(e.role);if(__sr.isServeBlocked(this.phase,slot))return!1;const ev={...e,slotActor:this._forcedSlotFor(slot)};if(slot[0]==="A")return toss?this._handleUserTossInput(ev):this._handleUserSwingInput(ev);return toss?this._handleP2TossInput(ev):this._handleP2SwingInput(ev)}
'''
s=sub(s,'}_handleUserSwingInput(e={}){if(this.userHasInteracted=!0,','}'+new_methods+'_handleUserSwingInput(e={}){if(this.userHasInteracted=!0,')

# strike actor selection
s=sub(s,'this.ball.pos.z>.3&&this.ball.pos.z<=7.6&&r<=3.95&&r<s,p=l?this.playerPartner:this.player',
 '(e.slotActor==="A2"||e.slotActor!=="A1"&&this.ball.pos.z>.3&&this.ball.pos.z<=7.6&&r<=3.95&&r<s),p=l?this.playerPartner:this.player')
# the original was "l=!t&&<cond>": make the forced form keep the !t guard
assert 'l=!t&&(e.slotActor==="A2"' in s
s=sub(s,'r=this.ball.pos.z<-.3&&this.ball.pos.z>=-7.6&&h<=3.95&&h<a,l=r?this.opponentPartner:this.opponent',
 'r=e.slotActor==="B2"||e.slotActor!=="B1"&&this.ball.pos.z<-.3&&this.ball.pos.z>=-7.6&&h<=3.95&&h<a,l=r?this.opponentPartner:this.opponent')
# early-swing animation / whiff actor, team A
s=sub(s,'h=this.ball.pos.z>.3&&this.ball.pos.z<=7.5&&Math.abs(this.ball.pos.x-this.playerPartner.pos.x)<3.4,r=h?n:s;',
 'h=e.slotActor==="A2"||e.slotActor!=="A1"&&this.ball.pos.z>.3&&this.ball.pos.z<=7.5&&Math.abs(this.ball.pos.x-this.playerPartner.pos.x)<3.4,r=h?n:s;')
s=sub(s,'this.racketKinematics&&this.racketKinematics.triggerSwing(this.player,{shotType:i,side:t,speed:Number(e.speed||1.2),timing:"sweet",dirX:Number(e.dirX||0)}),this.audioEngine&&this.audioEngine.playSwingWhoosh(Number(e.speed||1.15)),this.ball.lastHitter==="opponent")',
 'this.racketKinematics&&this.racketKinematics.triggerSwing(e.slotActor==="A2"?this.playerPartner:this.player,{shotType:i,side:t,speed:Number(e.speed||1.2),timing:"sweet",dirX:Number(e.dirX||0)}),this.audioEngine&&this.audioEngine.playSwingWhoosh(Number(e.speed||1.15)),this.ball.lastHitter==="opponent")')
# team B handler rally block
j=s.index('_handleP2SwingInput(e={})'); k=s.index('_startServeToss(e){',j)
blk=s[j:k]
OPP='(e.slotActor==="B2"?this.opponentPartner:this.opponent)'
assert blk.count('this.ball.pos.x>this.opponent.pos.x+.05')==1
blk=blk.replace('this.ball.pos.x>this.opponent.pos.x+.05','this.ball.pos.x>'+OPP+'.pos.x+.05')
assert blk.count('const s=this.opponent.pos.z-this.ball.pos.z')==1
blk=blk.replace('const s=this.opponent.pos.z-this.ball.pos.z','const s='+OPP+'.pos.z-this.ball.pos.z')
assert blk.count('triggerSwing(this.opponent,{shotType:i')==2
blk=blk.replace('triggerSwing(this.opponent,{shotType:i','triggerSwing('+OPP+',{shotType:i')
s=s[:j]+blk+s[k:]
# pending swing: evaluate the actor that was pinned
s=sub(s,'h=this.ball.pos.z<=7.2&&n<s&&n<=3.8?this.playerPartner:this.player,',
 'h=(a=>a==="A2"?this.playerPartner:a==="A1"?this.player:null)(this.pendingUserSwing&&this.pendingUserSwing.evt&&this.pendingUserSwing.evt.slotActor)||(this.ball.pos.z<=7.2&&n<s&&n<=3.8?this.playerPartner:this.player),')
s=sub(s,'h=this.ball.pos.z>=-7.2&&n<s&&n<=3.9?this.opponentPartner:this.opponent,',
 'h=(a=>a==="B2"?this.opponentPartner:a==="B1"?this.opponent:null)(this.pendingP2Swing&&this.pendingP2Swing.evt&&this.pendingP2Swing.evt.slotActor)||(this.ball.pos.z>=-7.2&&n<s&&n<=3.9?this.opponentPartner:this.opponent),')
# perspective: team of the local seat, not "guest or host"
s=sub(s,'if(this.playerRole==="p2"){const p=o.MathUtils.clamp(.5+r*.16','if(this._viewTeamB()){const p=o.MathUtils.clamp(.5+r*.16')
s=sub(s,'if(this.playerRole!=="p2"){const p=o.MathUtils.clamp(.5+r*.16','if(!this._viewTeamB()){const p=o.MathUtils.clamp(.5+r*.16')
s=sub(s,'playerWon:this.playerRole==="p2"?!p:p','playerWon:this._viewTeamB()?!p:p')
s=sub(s,'(this.playerRole!=="p2"&&e===this.player||this.playerRole==="p2"&&e===this.opponent)','e===this._localActor()')
s=sub(s,'else if(e==="SERVE_CAM")if(this.playerRole==="p2"){','else if(e==="SERVE_CAM")if(this._viewTeamB()){')
s=sub(s,'this.playerRole==="p2"?(t.set(this.opponent.pos.x*.16,7.8,-22.8)','this._viewTeamB()?(t.set(this.opponent.pos.x*.16,7.8,-22.8)')
open(p,'w').write(s)

# ---------------- motion_controls.js ----------------
p='src/motion_controls.js'; m=open(p).read()
m=sub(m,'this.role=(e.role||"p1").toLowerCase()==="p2"?"p2":"p1"','this.role=(r=>["p1","p2","p3","p4"].includes(r)?r:"p1")(String(e.role||"p1").toLowerCase())')
m=sub(m,'t&&(this.role=String(t).toLowerCase()==="p2"?"p2":"p1")','t&&(this.role=(r=>["p1","p2","p3","p4"].includes(r)?r:"p1")(String(t).toLowerCase()))')
m=sub(m,'this.lastProcessedPhoneSeq=0,this.lastProcessedP2PhoneSeq=0),t&&','this.lastProcessedPhoneSeq=0,this.lastProcessedP2PhoneSeq=0,this._remoteSeq={}),t&&')
m=sub(m,'this.role==="p2"&&e.role!=="p1")return l.source','this.role!=="p1"&&e.role!=="p1")return l.source')
m=sub(m,'this.role==="p2"&&e.role!=="p1")return s.source','this.role!=="p1"&&e.role!=="p1")return s.source')
m=sub(m,'&role=p2`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({room:this.roomId,role:"p2",type:"swing"','&role=${this.role}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({room:this.roomId,role:this.role,type:"swing"')
m=sub(m,'&role=p2`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({room:this.roomId,role:"p2",type:"toss"','&role=${this.role}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({room:this.roomId,role:this.role,type:"toss"')
m=sub(m,'r&&r.swing&&typeof r.swing.seq=="number"&&(this.p2PhonePollInitialized=!0,this.lastProcessedP2PhoneSeq=Math.max(this.lastProcessedP2PhoneSeq,r.swing.seq))','r&&r.swing&&typeof r.swing.seq=="number"&&this._markOwnSwing(r.swing.seq)',2)
m=sub(m,'this._emitP2Swing(l)','this._emitP2Swing({...l,role:this.role})')
m=sub(m,'this._emitP2Toss(s)','this._emitP2Toss({...s,role:this.role})')
m=sub(m,'s={type:"swing",role:"p2",source:e.source||"phone"','s={type:"swing",role:["p2","p3","p4"].includes(e.role)?e.role:"p2",source:e.source||"phone"')
m=sub(m,'n={type:"toss",role:"p2",source:e.source||"phone"','n={type:"toss",role:["p2","p3","p4"].includes(e.role)?e.role:"p2",source:e.source||"phone"')
m=sub(m,'const s=this.role==="p2"&&h?h:n;','const s=this.role!=="p1"&&(a.rackets&&a.rackets[this.role]||(this.role==="p2"?h:null))||n;')
m=sub(m,'this.lastProcessedP2PhoneSeq=0)}}catch{}};e(),','this.lastProcessedP2PhoneSeq=0);this._pollExtraRoles(a)}}catch{}};e(),')
extra='''_markOwnSwing(q){if(this.role==="p2"){this.p2PhonePollInitialized=!0;this.lastProcessedP2PhoneSeq=Math.max(this.lastProcessedP2PhoneSeq,q);return}const b=this._remoteSeq||(this._remoteSeq={}),c=b[this.role]||(b[this.role]={init:!0,seq:0});c.init=!0;c.seq=Math.max(c.seq,q)}
_pollExtraRoles(a){const rk=a&&a.rackets;if(!rk)return;const b=this._remoteSeq||(this._remoteSeq={});for(const role of["p3","p4"]){const st=rk[role];if(!st||!st.lastSwing||typeof st.lastSwing.seq!=="number")continue;const c=b[role]||(b[role]={init:!1,seq:0}),o=st.lastSwing,r=o.seq;if(!c.init){c.init=!0;c.seq=Date.now()-Number(o.serverTimeMs||0)<1200?r-1:r}if(r>c.seq){c.seq=r;const ev={source:"phone",role,side:o.side,shotType:o.shotType||(o.type==="toss"?"lob":void 0),speed:o.speed||(o.type==="toss"?1.1:1.15),dirX:o.angleX??o.dirX??0,dirY:o.dirY??(o.type==="toss"?-.9:-.45),pitch:o.pitch,roll:o.roll};o.type==="toss"?this._emitP2Toss(ev):this._emitP2Swing(ev)}}}
'''
m=sub(m,'stopPhonePolling(){','%s'%'' + extra.strip()+'\nstopPhonePolling(){')
open(p,'w').write(m)
print("patched")
