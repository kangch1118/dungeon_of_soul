'use strict';

// Feedback uses game time, so menus and pause freeze visual effects.
const combatFeedback = { sparks: [], shake: 0, pause: 0 };
let feedbackAudio = null;
const feedbackLast = {};
function unlockFeedbackAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  try { feedbackAudio ||= new AudioContextClass(); feedbackAudio.resume().catch(() => {}); } catch (_) {}
}
window.addEventListener('pointerdown', unlockFeedbackAudio);
window.addEventListener('keydown', unlockFeedbackAudio);
function feedbackTone(kind) {
  if (!feedbackAudio || feedbackAudio.state !== 'running' || options.sfx <= 0) return;
  const now = feedbackAudio.currentTime;
  if (now - (feedbackLast[kind] ?? -10) < (kind === 'warning' ? .35 : .09)) return;
  feedbackLast[kind] = now;
  const def = {
    hit: [190,70,.045,.12], crit: [740,180,.09,.17], warning: [440,880,.18,.22],
    reward: [620,930,.07,.08], heal: [480,720,.12,.08], skill: [320,640,.1,.1]
  }[kind] || [190,70,.045,.12];
  const oscillator = feedbackAudio.createOscillator(), gain = feedbackAudio.createGain();
  oscillator.type = kind === 'hit' ? 'triangle' : 'sine';
  oscillator.frequency.setValueAtTime(def[0],now);
  oscillator.frequency.exponentialRampToValueAtTime(def[1],now+def[2]);
  gain.gain.setValueAtTime(def[3]*options.sfx/100,now);
  gain.gain.exponentialRampToValueAtTime(.001,now+def[2]);
  oscillator.connect(gain);gain.connect(feedbackAudio.destination);
  oscillator.start(now);oscillator.stop(now+def[2]);
  oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
}
function emitHitFeedback(enemy, critical) {
  const heavy = critical || player.basicAttack.type === 'melee_arc';
  combatFeedback.sparks.push({x:enemy.x,y:enemy.y-enemy.radius*.4,life:.18,max:.18,critical});
  if(combatFeedback.sparks.length>48)combatFeedback.sparks.shift();
  feedbackTone(critical?'crit':'hit');
  if(heavy && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    combatFeedback.shake=Math.max(combatFeedback.shake,critical?.1:.05);
    combatFeedback.pause=Math.max(combatFeedback.pause,critical?.035:.018);
  }
}
function drawCombatFeedback() {
  ctx.save();
  for(const spark of combatFeedback.sparks){
    const [x,y]=worldToScreen(spark.x,spark.y),t=1-spark.life/spark.max,r=7+t*(spark.critical?27:15);
    ctx.globalAlpha=spark.life/spark.max;ctx.strokeStyle=spark.critical?'#ffd168':'#eaf7ff';ctx.lineWidth=spark.critical?3:2;
    ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.moveTo(x+Math.cos(a)*r*.45,y+Math.sin(a)*r*.45);ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}ctx.stroke();
  }
  ctx.restore();
}

function enemyAttackSpec(e) {
  const enemyScale=typeof MOBILE_ENEMY_SCALE==='number'?MOBILE_ENEMY_SCALE:1;
  if(e.monsterType==='skeleton_archer')return {range:360*enemyScale,windup:.85,recovery:1.3,spread:.12,ranged:true};
  if(e.monsterType==='tree')return {range:320*enemyScale,windup:.85,recovery:2.1,spread:.12,ranged:true};
  if(e.monsterType==='bat')return {range:230*enemyScale,windup:.55,recovery:1.0,dash:true};
  if(e.monsterType==='skeleton')return {range:110*enemyScale,windup:.7,recovery:.9,spread:Math.PI*.85};
  if(e.monsterType==='slime'||e.monsterType==='poison_slime')return {range:48 * (typeof MOBILE_SLIME_SCALE === 'number' ? MOBILE_SLIME_SCALE : 1),windup:.35,recovery:.6,spread:Math.PI*2};
  return {range:62*enemyScale,windup:.32,recovery:.55,spread:Math.PI*.65};
}
function updateNormalAttack(e,dt) {
  const spec=enemyAttackSpec(e);
  if(e.aiState==='windup') {
    e.aiTime-=dt;
    if(e.aiTime>0)return;
    e.attackAnim=.4;
    playSfx(e.monsterType==='bat'?(Math.random()<0.5?'bat_idle1':'bat_idle3'):(e.monsterType==='slime'||e.monsterType==='poison_slime')?'slime_atk':'monster_atk');
    if(spec.dash){e.aiState='dash';e.aiTime=.35;e.dashHit=false;return;}
    if(spec.ranged){
      if(e.monsterType==='tree') makeHazard(e,'bullet',{delay:0,duration:1.6,radius:11,speed:210,angle:e.attackAngle,leafArrow:true,slow:1.4});
      else makeHazard(e,'bullet',{delay:0,duration:1.8,radius:6,speed:320,angle:e.attackAngle,archerArrow:true});
      e.aiState='recover';e.aiTime=spec.recovery;return;
    }
    const angle=Math.atan2(player.y-e.y,player.x-e.x);
    if(dist(e.x,e.y,player.x,player.y)<=spec.range+player.radius && Math.cos(angle-e.attackAngle)>=Math.cos(spec.spread/2))hurtPlayer(e.dmg);
    e.aiState='recover';e.aiTime=spec.recovery;return;
  }
  if(e.aiState==='dash') {
    const duration=Math.min(dt,e.aiTime),x=e.x,y=e.y;
    const slow=e.slowTimer>0?.5:e.inAura?.65:1;
    const dashSpeed=620*(typeof MOBILE_ENEMY_SCALE==='number'?MOBILE_ENEMY_SCALE:1);
    e.x=clamp(e.x+Math.cos(e.attackAngle)*dashSpeed*slow*duration,e.radius,WORLD_W-e.radius);
    e.y=clamp(e.y+Math.sin(e.attackAngle)*dashSpeed*slow*duration,e.radius,WORLD_H-e.radius);
    if(!e.dashHit && segmentDistance(player.x,player.y,x,y,e.x,e.y)<=e.radius+player.radius){hurtPlayer(e.dmg);e.dashHit=true;}
    e.aiTime-=dt;if(e.aiTime<=0){e.aiState='recover';e.aiTime=spec.recovery;}return;
  }
  if(e.aiState==='recover'){e.aiTime-=dt;if(e.aiTime<=0)e.aiState='idle';return;}
  if(!e.hopping && dist(e.x,e.y,player.x,player.y)<=spec.range) {
    e.aiState='windup';e.aiTime=spec.windup;
    e.attackAngle=Math.atan2(player.y-e.y,player.x-e.x);e.facing=Math.cos(e.attackAngle)<0?-1:1;
    if(e.monsterType==='bat'||e.monsterType==='skeleton')feedbackTone('warning');
  }
}
function updateNormalEnemy(e,dt) {
  if(player.dying)return;
  updateNormalAttack(e,dt);
  if(e.aiState && e.aiState!=='idle')return;
  const angle=Math.atan2(player.y-e.y,player.x-e.x),slow=e.slowTimer>0?.5:e.inAura?.65:1;
  e.x=clamp(e.x+Math.cos(angle)*e.speed*slow*dt,e.radius,WORLD_W-e.radius);
  e.y=clamp(e.y+Math.sin(angle)*e.speed*slow*dt,e.radius,WORLD_H-e.radius);
  e.facing=Math.cos(angle)<0?-1:1;
}
function separateNormalEnemies() {
  const movable=enemies.filter(e=>!e.dead&&!e.isBoss&&!e.isTotem&&!e.hopping&&(!e.aiState||e.aiState==='idle'));
  for(let i=0;i<movable.length;i++)for(let j=i+1;j<movable.length;j++){
    const a=movable[i],b=movable[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=(a.radius+b.radius)*.8;
    if(d>=min)continue;const nx=d?dx/d:1,ny=d?dy/d:0,push=Math.min(1.5,(min-d)/2);
    a.x=clamp(a.x-nx*push,a.radius,WORLD_W-a.radius);a.y=clamp(a.y-ny*push,a.radius,WORLD_H-a.radius);
    b.x=clamp(b.x+nx*push,b.radius,WORLD_W-b.radius);b.y=clamp(b.y+ny*push,b.radius,WORLD_H-b.radius);
  }
}
function drawNormalWarnings() {
  ctx.save();ctx.lineWidth=2;
  for(const e of enemies){
    if(e.dead||e.isBoss||e.aiState!=='windup')continue;
    const s=enemyAttackSpec(e),[x,y]=worldToScreen(e.x,e.y);
    ctx.strokeStyle='#ffd378';ctx.fillStyle='rgba(255,90,50,.12)';ctx.beginPath();
    if(s.dash){const ex=x+Math.cos(e.attackAngle)*217,ey=y+Math.sin(e.attackAngle)*217;ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.lineWidth=4;}
    else{ctx.moveTo(x,y);ctx.arc(x,y,s.range,e.attackAngle-s.spread/2,e.attackAngle+s.spread/2);ctx.closePath();}
    ctx.fill();ctx.stroke();ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(x,y-45,9,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-e.aiTime/s.windup));ctx.stroke();
  }ctx.restore();
}

// Independent pointers permit moving, holding attack and tapping a skill together.
const touchMove={x:0,y:0};
let touchAttack=false,joystickPointer=null,attackPointer=null;
const joystick=document.getElementById('touch-joystick'),knob=document.getElementById('touch-knob'),attackButton=document.getElementById('touch-attack');
function resetTouchControls(){touchMove.x=touchMove.y=0;touchAttack=false;joystickPointer=attackPointer=null;knob.style.transform='translate(0px,0px)';attackButton.classList.remove('held');}
function updateJoystick(e){const r=joystick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,d=Math.hypot(dx,dy),max=r.width*.32,scale=d>max?max/d:1;touchMove.x=d<8?0:dx*scale/max;touchMove.y=d<8?0:dy*scale/max;knob.style.transform='translate('+dx*scale+'px,'+dy*scale+'px)';}
joystick.addEventListener('pointerdown',e=>{if(state.mode!=='playing'||player.dying||joystickPointer!==null)return;e.preventDefault();joystickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);updateJoystick(e);});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===joystickPointer)updateJoystick(e);});
for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,e=>{if(e.pointerId===joystickPointer){joystickPointer=null;touchMove.x=touchMove.y=0;knob.style.transform='translate(0px,0px)';}});
attackButton.addEventListener('pointerdown',e=>{if(state.mode!=='playing'||player.dying||attackPointer!==null)return;e.preventDefault();attackPointer=e.pointerId;attackButton.setPointerCapture(e.pointerId);touchAttack=true;attackButton.classList.add('held');});
for(const event of ['pointerup','pointercancel','lostpointercapture'])attackButton.addEventListener(event,e=>{if(e.pointerId===attackPointer){attackPointer=null;touchAttack=false;attackButton.classList.remove('held');}});

const mobileSkillSlots = document.querySelectorAll('#hotbar .slot');
for (const slotEl of mobileSkillSlots) {
  slotEl.addEventListener('pointerdown', e => {
    if (!isMobileDevice) return;
    if (state.mode !== 'playing') return;
    e.preventDefault();
    useSkill(slotEl.dataset.slot);
  });
}

const storageNotice=document.getElementById('storage-notice');
function refreshStorageNotice(){document.getElementById('storage-message').textContent=saveWarning;storageNotice.hidden=!saveWarning;document.getElementById('storage-recover').hidden=!saveWarning.includes('저장이 보류');}
window.addEventListener('storage-warning',refreshStorageNotice);refreshStorageNotice();
// Persist options only on a completed control change, not on every drag frame.
try {
  const saved=JSON.parse(localStorage.getItem('dungeon_of_soul_options')||'null');
  if(saved){for(const k of ['bgm','sfx'])if(Number.isFinite(saved[k]))options[k]=clamp(saved[k],0,100);if(['easy','normal','hard'].includes(saved.difficulty))options.difficulty=saved.difficulty;options.showFps=saved.showFps===true;for(const k of ['scaleHud','scaleBasic','scaleHotbar'])if(Number.isFinite(saved[k]))options[k]=clamp(saved[k],70,130);}
}catch(_){}
optBgm.value=optBgmVal.textContent=options.bgm;optSfx.value=optSfxVal.textContent=options.sfx;optDifficulty.value=options.difficulty;optShowFps.checked=options.showFps;
document.getElementById('hud-fps').style.display=options.showFps?'block':'none';
for(const entry of UI_SCALE_SLIDERS){entry.input.value=options[entry.key];applyUiScale(entry);}
for(const id of ['opt-bgm','opt-sfx','opt-difficulty','opt-showfps','opt-scale-hud','opt-scale-basic','opt-scale-hotbar'])document.getElementById(id).addEventListener('change',()=>{try{localStorage.setItem('dungeon_of_soul_options',JSON.stringify(options));}catch(_){setSaveWarning('설정을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.');}});

document.getElementById('storage-retry').addEventListener('click',()=>{saveMeta();refreshStorageNotice();});
document.getElementById('storage-recover').addEventListener('click',()=>{try{const raw=localStorage.getItem(SAVE_KEY);if(raw)localStorage.setItem(SAVE_KEY+'_recovery',raw);const warning=saveWarning;saveWarning='';if(saveMeta())setSaveWarning('');else if(!saveWarning)saveWarning=warning;refreshStorageNotice();}catch(_){setSaveWarning('복구 전 기록을 보관하지 못해 저장이 보류됩니다. 저장 공간을 확인해 주세요.');}});

function enhanceKeyboardCards(){document.querySelectorAll('div.item-card,div.equip-slot-box').forEach(el=>{if(el.querySelector('button'))return;el.tabIndex=0;el.setAttribute('role','button');});}
new MutationObserver(enhanceKeyboardCards).observe(document.getElementById('screen-lobby'),{childList:true,subtree:true});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('div[role=button]')){e.preventDefault();e.target.click();}});
enhanceKeyboardCards();
