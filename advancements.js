'use strict';

const advancementImages = {};
const ADV_FRAME_EDGES={archmage:[0,543,1086,1629,2172],berserker:[0,543,1060,1723,2172],commander:[0,534,1086,1662,2172],crusader:[0,520,1013,1740,2172],dragon:[0,527,979,1681,2172],honggildong:[0,543,1054,1643,2172],madmonk:[0,479,998,1677,2172],magician:[0,498,1066,1691,2172],ninja:[0,543,1079,1698,2172],paladin:[0,543,1067,1630,2172],pirate:[0,538,1047,1663,2172],warlock:[0,515,1059,1682,2172]};
const WARLOCK_RESULTS = [
  {id:'demon',name:'악마 소환',desc:'전방을 휩쓰는 악마가 9배 피해를 줍니다.',color:'#c770ff'},
  {id:'curse',name:'저주의 씨앗',desc:'8초 동안 저주 장판이 매초 1.2배 피해를 줍니다.',color:'#ab77ed'},
  {id:'revive',name:'되살린 대지',desc:'20초 동안 처치 위치에 회복 영역을 남깁니다. 영역 안에서 초당 체력 1% 회복.',color:'#80e4b0'},
];
function advImage(id) {
  if(!advancementImages[id]){const img=new Image();img.src=ADV_ART+id+'_motion.png';advancementImages[id]=img;}
  return advancementImages[id];
}
function advPortraitStyle(j){return `background-image:url('${j.motion}');background-size:${2172/ADV_FRAME_EDGES[j.id][1]*100}% 100%;`;}
function configureAdvancement(p) {
  const j=selectedAdvancement(); if(!j)return;
  advImage(j.id);
  p.adv={id:j.id,time:0,cast:0,count:0,fx:[],allies:[],rage:0,rageLife:0,hitCd:0,kills:0,growth:0,baseHp:p.maxHp,baseAtk:p.atk};
  p.basicAttack={...p.basicAttack,label:j.basic};
  const intervals={dragon:.8,berserker:.65,commander:.8,warlock:.6,archmage:.75,magician:.32,ninja:.32,honggildong:.28,pirate:.8,paladin:1,crusader:.85,madmonk:.3};
  p.atkInterval=intervals[j.id];p.basicAttack.interval=p.atkInterval;
  if(['magician','pirate'].includes(j.id))p.basicAttack.type='projectile';
  if(['ninja','honggildong'].includes(j.id))p.basicAttack.type='advanced_melee';
  if(j.id==='archmage')p.basicAttack.type='advanced_chain';
  p.atkRange=['warlock','archmage','magician','pirate'].includes(j.id)?380:150;
  for(const slot of ['Q','E'])p.skills[slot]={id:'adv'+slot,advId:j.id,cd:0,cdMax:slot==='Q'?j.qd:j.cd,name:slot==='Q'?j.q:j.e,icon:'✦',iconImg:j.iconImg,desc:slot==='Q'?advQDescription(j.id):j.desc};
  if(j.random)p.skills.E.roulette={phase:'ready',time:0,result:null,index:0};
}
function advQDescription(id) {
  return {dragon:'전방으로 돌진하며 3배 피해.',berserker:'주변을 베어 3배 피해. 적중 시 체력 3% 회복.',commander:'기사들을 집결시키고 주변에 2.5배 피해, 보호막 10%.',warlock:'적 위치에 3초 저주 장판과 감속.',archmage:'가까운 적에게 낙뢰 4배 피해.',magician:'부채꼴 관통 카드 5장을 발사.',ninja:'그림자 돌진 2.5배 피해, 0.4초 무적.',honggildong:'축지 돌진 2.5배 피해와 분신 잔상.',pirate:'전방 산탄 3배 피해와 밀치기.',paladin:'전방 방패 공격 2.5배 피해와 밀치기.',crusader:'전방 성검 3.5배 피해.',madmonk:'주변 파쇄권 3배 피해와 밀치기.'}[id];
}
function advToast(text,color='#ffe3a0') {floatTexts.push({x:player.x,y:player.y-65,text,color,life:1.2,vy:-22});}
function advTarget(){return findNearestEnemy(player.x,player.y,700);}
function advAim(){const t=advTarget();const a=t?Math.atan2(t.y-player.y,t.x-player.x):Math.atan2(player.facing.y,player.facing.x);setPlayerDirection(Math.cos(a),Math.sin(a));return a;}
function advFx(kind,opts={}) {
  const f={kind,x:player.x,y:player.y,age:0,delay:0,duration:.6,radius:140,color:ADVANCED_JOBS.find(j=>j.id===player.adv.id).color,mult:0,hit:false,...opts};
  player.adv.fx.push(f);return f;
}
function advArea(x,y,radius,mult,push=0,slow=0,canCrit=false) {
  for(const e of [...enemies])if(!e.dead&&Math.hypot(e.x-x,e.y-y)<=radius+e.radius){
    if(slow)e.slowTimer=Math.max(e.slowTimer||0,slow);
    if(push&&!e.isBoss){const a=Math.atan2(e.y-y,e.x-x);e.x=clamp(e.x+Math.cos(a)*push,e.radius,WORLD_W-e.radius);e.y=clamp(e.y+Math.sin(a)*push,e.radius,WORLD_H-e.radius);}
    const critical=canCrit&&Math.random()<player.critChance;
    dealDamageToEnemy(e,player.atk*mult*(critical?player.critMult:1),critical);
  }
}
function advLine(angle,length,width,mult,push=0) {
  for(const e of [...enemies])if(!e.dead){const dx=e.x-player.x,dy=e.y-player.y,f=dx*Math.cos(angle)+dy*Math.sin(angle),s=Math.abs(dx*Math.sin(angle)-dy*Math.cos(angle));if(f>=-e.radius&&f<=length+e.radius&&s<=width/2+e.radius){const critical=Math.random()<player.critChance;dealDamageToEnemy(e,player.atk*mult*(critical?player.critMult:1),critical);if(push&&!e.isBoss){e.x=clamp(e.x+Math.cos(angle)*push,e.radius,WORLD_W-e.radius);e.y=clamp(e.y+Math.sin(angle)*push,e.radius,WORLD_H-e.radius);}}}
}
function advShield(fraction){player.shieldMax=Math.max(player.shieldMax,player.maxHp*fraction);player.shield=Math.min(player.shieldMax,player.shield+player.maxHp*fraction);}
function advHeal(fraction){player.hp=Math.min(player.maxHp,player.hp+player.maxHp*fraction);}
function advProjectile(angle,mult,pierce=0,card=false){projectiles.push({x:player.x,y:player.y,vx:Math.cos(angle)*650,vy:Math.sin(angle)*650,radius:7,life:1.05,pierceLeft:pierce,hitSet:new Set(),dmgMult:mult,kind:'bolt',advCard:card});}

function performAdvancementBasic() {
  if(!player.adv)return false;
  const a=player.adv,id=a.id,t=findNearestEnemy(player.x,player.y,player.atkRange);if(!t)return true;
  const angle=Math.atan2(t.y-player.y,t.x-player.x);setPlayerDirection(Math.cos(angle),Math.sin(angle));a.count++;
  const color=ADVANCED_JOBS.find(j=>j.id===id).color;
  if(a.blood>0)advFx('burst',{x:t.x,y:t.y,radius:65,mult:.45,color:'#ff4661'});
  if(a.clones>0&&id!=='honggildong')for(let i=0;i<2;i++)advFx('echo',{x:t.x+(i?35:-35),y:t.y,target:t,delay:.08+i*.08,mult:.25,radius:85,duration:.4,color:'#66e8e4'});
  if(['magician','warlock'].includes(id)||(id==='pirate'&&dist(player.x,player.y,t.x,t.y)>120)){
    for(let n=0;n<player.projectileCount;n++)advProjectile(angle+(n-(player.projectileCount-1)/2)*.14,id==='pirate'?2:id==='magician'?.55:1,player.pierce+(id==='magician'?2:id==='pirate'?1:0),id==='magician');
    playSfx(id==='pirate'?'rogue_basic':id==='magician'?'magician_basic':'mage_basic');
    if(id==='warlock'&&a.count%3===0)advFx('field',{x:t.x,y:t.y,radius:65,duration:2,dps:.4,color});
  }else if(id==='archmage'){
    const list=enemies.filter(e=>!e.dead&&dist(t.x,t.y,e.x,e.y)<180).sort((x,y)=>dist(t.x,t.y,x.x,x.y)-dist(t.x,t.y,y.x,y.y)).slice(0,3);
    list.forEach((e,i)=>{const critical=Math.random()<player.critChance;dealDamageToEnemy(e,player.atk*(i? .5:1.2)*(critical?player.critMult:1),critical);advFx('bolt',{x:e.x,y:e.y,radius:35,duration:.25,color});});playSfx('mage_basic');
  }else{
    const mult={dragon:1.6,berserker:1.4,commander:1.4,ninja:.65,honggildong:.6,pirate:1.4,paladin:1.4,crusader:1.6,madmonk:.55}[id];
    if(['paladin','madmonk'].includes(id))advArea(player.x,player.y,id==='madmonk'?100:145,mult,0,0,true);
    else advLine(angle,150,id==='honggildong'?40:105,mult);
    advFx('slash',{angle,radius:145,duration:.22,color});playSfx(id==='honggildong'?'honggildong_basic':['ninja','madmonk'].includes(id)?'rogue_basic':'warrior_hit1');
    if(id==='paladin')player.shield=Math.min(player.shieldMax,player.shield+player.maxHp*.015);
    if(['dragon','crusader'].includes(id)&&a.count%3===0)advFx('burst',{x:t.x,y:t.y,radius:85,mult:.8,color});
    const echoes=id==='honggildong'?(a.clones>0?2:Math.random()<.3?1:0):id==='ninja'&&a.count%3===0?1:0;
    if(id==='honggildong'&&echoes>0)playSfx('honggildong_clone');
    for(let i=0;i<echoes;i++)advFx('echo',{x:t.x+(i?35:-35),y:t.y,target:t,delay:.08+i*.08,mult:mult*.45,radius:85,duration:.4,color});
  }
  return true;
}

function beginAdvCast(){player.adv.cast=.65;player.attackAnimDur=.65;player.attackAnimTimer=.65;feedbackTone('skill');}
function useAdvancementSkill(slot) {
  const s=player.skills[slot];if(!s?.advId)return false;
  if(s.cd>0)return true;
  if(s.roulette){
    const r=s.roulette;
    if(r.phase==='rolling')return true;
    if(r.phase==='held'){
      const result=r.result;r.phase='ready';r.time=0;r.result=null;s.cd=s.cdMax;
      beginAdvCast();executeRouletteResult(result);return true;
    }
    r.phase='rolling';r.time=1.2;r.elapsed=0;r.index=0;r.result=null;feedbackTone('skill');return true;
  }
  if(slot==='E'&&s.advId==='berserker'&&player.hp>player.maxHp*.3){advToast('체력 30% 이하에서 사용');return true;}
  s.cd=s.cdMax;beginAdvCast();if(slot==='Q')executeAdvQ(s.advId);else executeAdvUltimate(s.advId);return true;
}
function rollAdvResult(id) {
  if(id==='warlock')return {...WARLOCK_RESULTS[Math.floor(Math.random()*3)]};
  if(Math.random()<.5)return {id:'ace',name:'에이스 · 카드 폭풍',desc:'주변 5배 피해와 밀치기·감속. 쿨타임 2~5% 반환.',color:'#f5cf81',refund:.02+Math.random()*.03};
  const jobs=ADVANCED_JOBS.filter(j=>j.id!=='magician');const j=jobs[Math.floor(Math.random()*jobs.length)];
  const nestedResult=j.id==='warlock'?{...WARLOCK_RESULTS[Math.floor(Math.random()*3)]}:null;
  return {id:'joker',borrowed:j.id,nestedResult,name:'조커 · '+(nestedResult?.name||j.e),desc:j.name+'의 스킬을 복제합니다. '+(nestedResult?.desc||j.desc)+(j.id==='berserker'?' 복제 시 체력 조건 없이 발동합니다.':''),color:j.color,iconImg:j.iconImg};
}
function executeRouletteResult(result) {
  if(!result)return;advToast(result.name,result.color);
  if(result.id==='joker'){if(result.nestedResult)executeRouletteResult(result.nestedResult);else executeAdvUltimate(result.borrowed);return;}
  if(result.id==='ace'){advFx('cards',{radius:240,mult:5,push:100,slow:4,duration:1,color:'#f0c9ff'});player.skills.E.cd*=1-result.refund;return;}
  const t=advTarget()||player;
  if(result.id==='demon'){const angle=advAim();advFx('demon',{angle,length:580,radius:190,mult:9,delay:.35,duration:1,color:'#c770ff'});}
  if(result.id==='curse')advFx('field',{x:t.x,y:t.y,radius:190,duration:8,dps:1.2,slow:1,color:'#ae5fe5'});
  if(result.id==='revive'){player.adv.revive=20;advFx('aura',{radius:120,duration:1,color:'#7fffc2'});}
}
function executeAdvQ(id) {
  const angle=advAim(),t=advTarget()||player;
  if(['dragon','ninja','honggildong'].includes(id)){
    player.activeDash={sx:player.x,sy:player.y,ex:clamp(player.x+Math.cos(angle)*180,player.radius,WORLD_W-player.radius),ey:clamp(player.y+Math.sin(angle)*180,player.radius,WORLD_H-player.radius),age:0,duration:.24,width:85,dmg:player.atk*(id==='dragon'?3:2.5),hits:new Set()};
    if(id==='ninja')player.invuln=Math.max(player.invuln,.4);advFx('trail',{angle,length:190,radius:75,duration:.5});return;
  }
  if(id==='magician'){for(let i=0;i<5;i++)advProjectile(angle+(i-2)*.2,1.2,2,true);return;}
  if(id==='warlock'){advFx('field',{x:t.x,y:t.y,radius:125,duration:3,dps:1,slow:1});return;}
  if(id==='archmage'){advFx('bolt',{x:t.x,y:t.y,radius:100,mult:4,delay:.2});playSfx('lightning');return;}
  if(id==='commander'){player.adv.allies.forEach((u,i)=>{u.x=player.x+(i-1)*40;u.y=player.y;});advShield(.1);}
  if(id==='berserker'&&dist(player.x,player.y,t.x,t.y)<170)advHeal(.03);
  if(['pirate','paladin','crusader'].includes(id))advFx('line',{angle,length:220,radius:110,mult:id==='crusader'?3.5:id==='pirate'?3:2.5,push:id==='crusader'?0:75,delay:.12});
  else advFx('burst',{radius:165,mult:id==='commander'?2.5:3,push:id==='madmonk'?55:0,delay:.12});
}
function executeAdvUltimate(id) {
  const a=player.adv,angle=advAim(),t=advTarget()||player;
  switch(id){
    case 'dragon': advFx('dragon',{angle,length:560,radius:155,mult:8,delay:.25,duration:1,color:'#ff873e'});playSfx('flame_slash');playSfx('dragon_fire');break;
    case 'berserker': a.blood=8;advShield(.2);advFx('aura',{radius:150,duration:.8,color:'#ff4661'});break;
    case 'commander': a.allies=Array.from({length:3},(_,i)=>({x:player.x+(i-1)*40,y:player.y+30,life:12,attack:0,index:i}));advImage('commander');break;
    case 'archmage':for(let i=0;i<3;i++)advFx('bolt',{x:player.x+Math.cos(angle)*(100+i*110),y:player.y+Math.sin(angle)*(100+i*110),radius:110+i*15,mult:3,delay:.35+i*.35,duration:.65,color:'#80dcff'});playSfx('lightning');break;
    case 'ninja':for(const [i,p]of [[0,[0,0]],[1,[-70,40]],[2,[70,40]],[3,[-100,140]],[4,[100,140]],[5,[0,100]]])advFx('burst',{x:player.x+Math.cos(angle)*(120+p[1])-Math.sin(angle)*p[0],y:player.y+Math.sin(angle)*(120+p[1])+Math.cos(angle)*p[0],radius:80,mult:2.2,delay:.2+i*.12,duration:.6,color:'#ff6954'});break;
    case 'honggildong':a.clones=5;advFx('aura',{radius:100,duration:.6,color:'#66e8e4'});break;
    case 'pirate':advFx('wave',{angle,length:540,radius:180,mult:7,push:140,delay:.3,duration:1,color:'#5cd9ed'});a.sea=4;break;
    case 'paladin':a.wall=3;advShield(.25);advFx('wall',{radius:145,duration:3,color:'#ffdf8d'});break;
    case 'crusader':advFx('sword',{x:t.x,y:t.y,radius:190,mult:6,delay:.4,duration:.9,color:'#fff0ae'});a.holy=6;advHeal(.15);break;
    case 'madmonk':advFx('burst',{radius:220,mult:5,delay:.2,duration:.7,color:'#ef5478'});a.rage=20;a.rageLife=6;a.frenzy=8;break;
  }
}
function advancementDamageMultiplier(){const a=player.adv;if(!a)return 1;return (1+(a.holy>0?.25:0)+(a.rage||0)*.01)*(a.id==='berserker'&&player.hp<=player.maxHp*.3?1.25:1);}
function advancementAttackSpeed(){const a=player.adv;return a?(a.blood>0?.5:0)+(a.frenzy>0?.35:0):0;}
function advancementMoveSpeed(){const a=player.adv;return a?(a.sea>0?.5:0)+(a.holy>0?.2:0):0;}
function advancementHit(dmg){const a=player.adv;if(!a)return;if(a.blood>0||a.frenzy>0)player.hp=Math.min(player.maxHp,player.hp+dmg*(a.blood>0?.05:.03));if(a.id==='madmonk'&&a.hitCd<=0){a.hitCd=.5;a.rage=Math.min(20,a.rage+1);a.rageLife=6;}}
function advancementKill(e){const a=player.adv;if(!a||e.isBossSummon)return;if(a.revive>0)advFx('heal',{x:e.x,y:e.y,radius:65,duration:5,color:'#80e4b0'});if(a.id==='madmonk'){a.rage=Math.min(20,a.rage+1);a.rageLife=6;advHeal(.005);a.kills++;if(a.kills%50===0&&a.growth<5){a.growth++;player.maxHp+=a.baseHp*.02;player.hp+=a.baseHp*.02;player.atk+=a.baseAtk*.02;advToast('혈마 성장 '+a.growth+'/5');}}}

function updateAdvancements(dt) {
  const a=player.adv;if(!a)return;a.time+=dt;a.cast=Math.max(0,a.cast-dt);
  for(const key of ['blood','holy','sea','clones','revive','frenzy','rageLife','hitCd'])a[key]=Math.max(0,(a[key]||0)-dt);
  if(!a.rageLife)a.rage=0;
  const r=player.skills.E?.roulette;
  if(r&&r.phase!=='ready'){
    r.time=Math.max(0,r.time-dt);
    if(r.phase==='rolling'){
      r.elapsed+=dt;r.index=Math.floor(r.elapsed*14)%(a.id==='warlock'?3:2);
      if(r.time<=0){r.result=rollAdvResult(a.id);r.phase='held';r.time=10;feedbackTone('reward');}
    }else if(r.time<=0){r.phase='ready';r.result=null;player.skills.E.cd=player.skills.E.cdMax;advToast('보유 시간 종료 · 결과 소멸');}
  }
  if(a.wall>0){
    a.wall=Math.max(0,a.wall-dt);
    for(const e of enemies)if(!e.dead&&!e.isBoss){const d=dist(player.x,player.y,e.x,e.y);if(d<145+e.radius){const ang=Math.atan2(e.y-player.y,e.x-player.x);e.x=clamp(player.x+Math.cos(ang)*(145+e.radius),e.radius,WORLD_W-e.radius);e.y=clamp(player.y+Math.sin(ang)*(145+e.radius),e.radius,WORLD_H-e.radius);}}
    if(a.wall===0){advFx('burst',{radius:200,mult:5,color:'#ffdf8d'});advHeal(.15);}
  }
  for(const u of a.allies){u.life-=dt;u.attack-=dt;const t=findNearestEnemy(u.x,u.y,450);const dest=t||{x:player.x+(u.index-1)*40,y:player.y+35},d=dist(u.x,u.y,dest.x,dest.y);if(d>45){u.x+=(dest.x-u.x)/d*Math.min(d-45,player.speed*dt);u.y+=(dest.y-u.y)/d*Math.min(d-45,player.speed*dt);}if(t&&d<80&&u.attack<=0){u.attack=1.2;dealDamageToEnemy(t,player.atk*.5,false);advFx('slash',{x:u.x,y:u.y,angle:Math.atan2(t.y-u.y,t.x-u.x),radius:80,duration:.2,color:'#85c9ff'});}}
  a.allies=a.allies.filter(u=>u.life>0);
  const effects=[...a.fx];let healing=false;
  for(const f of effects){
    f.age+=dt;if(f.age<f.delay)continue;
    if(f.kind==='heal'){if(dist(player.x,player.y,f.x,f.y)<=f.radius)healing=true;continue;}
    if(f.kind==='field'){
      f.tick=(f.tick||0)+dt;
      if(f.tick>=.25){const elapsed=f.tick;f.tick=0;for(const e of [...enemies])if(!e.dead&&dist(f.x,f.y,e.x,e.y)<=f.radius+e.radius){if(f.slow)e.slowTimer=Math.max(e.slowTimer||0,1);dealDamageToEnemy(e,player.atk*f.dps*elapsed,true,true);}}
      continue;
    }
    if(f.mult&&!f.hit){f.hit=true;
      if(['burst','cards','sword','bolt'].includes(f.kind))spawnVfxBurst(f.x,f.y,f.kind==='bolt'?'r_lightning_bolt':f.kind==='sword'?'attack_holy_ring':f.kind==='cards'?'e_mana_burst':'q_fire_explosion_02',f.radius*2,.45);
      if(['dragon','demon','wave'].includes(f.kind))spawnVfxSwing(f.x,f.y,f.kind==='dragon'?'w_dragon_roar':f.kind==='demon'?'e_mana_burst':'w_frost_burst',f.angle,f.length,.7);
      if(['line','dragon','demon','wave'].includes(f.kind)){
        // Resolve from the cast origin even when the caster moves during the wind-up.
        for(const e of [...enemies])if(!e.dead){const dx=e.x-f.x,dy=e.y-f.y,p=dx*Math.cos(f.angle)+dy*Math.sin(f.angle),s=Math.abs(dx*Math.sin(f.angle)-dy*Math.cos(f.angle));if(p>=-e.radius&&p<=f.length+e.radius&&s<=f.radius/2+e.radius){dealDamageToEnemy(e,player.atk*f.mult,false);if(f.push&&!e.isBoss){e.x=clamp(e.x+Math.cos(f.angle)*f.push,e.radius,WORLD_W-e.radius);e.y=clamp(e.y+Math.sin(f.angle)*f.push,e.radius,WORLD_H-e.radius);}}}
      }else if(f.kind==='echo'){if(!f.target.dead)dealDamageToEnemy(f.target,player.atk*f.mult,false);}
      else advArea(f.x,f.y,f.radius,f.mult,f.push,f.slow);
    }
  }
  if(healing)advHeal(.01*dt);
  a.fx=a.fx.filter(f=>f.age<f.delay+f.duration);
}

function drawAdvancementPlayer() {
  if(!player.adv)return false;const a=player.adv,img=advImage(a.id);if(!img.complete||!img.naturalWidth)return false;
  const [x,y]=worldToScreen(player.x,player.y),ch=img.naturalHeight,h=132;
  const progress=a.cast>0?1-a.cast/.65:player.attackAnimTimer>0?1-player.attackAnimTimer/player.attackAnimDur:0;
  const frame=(a.cast>0||player.attackAnimTimer>0)?Math.min(3,1+Math.floor(progress*3)):0;
  const edges=ADV_FRAME_EDGES[a.id],left=edges[frame],cw=edges[frame+1]-left,w=h*cw/ch;
  ctx.save();ctx.translate(x,y+12-(player.moving?Math.abs(Math.sin(a.time*12))*4:0));
  if(player.dying){ctx.rotate(Math.min(1.5,player.deathAnimTimer*3));ctx.globalAlpha=Math.max(.1,1-player.deathAnimTimer);}
  else if(player.invuln>0)ctx.globalAlpha=.65;
  if(player.facing.x<0)ctx.scale(-1,1);
  if(player.hitFlash>0)ctx.globalAlpha=.7;
  ctx.drawImage(img,left,0,cw,ch,-w/2,-h,w,h);ctx.restore();return true;
}
function drawAdvancements() {
  const a=player.adv;if(!a)return;
  for(const f of a.fx){const [x,y]=worldToScreen(f.x,f.y);const active=f.age>=f.delay,k=clamp((f.age-f.delay)/f.duration,0,1);ctx.save();ctx.translate(x,y);ctx.strokeStyle=f.color;ctx.fillStyle=f.color;ctx.lineWidth=active?3:1;ctx.globalAlpha=active?Math.min(.85,1-k*.8):.25;
    if(['line','dragon','demon','wave','trail','slash'].includes(f.kind)){
      ctx.rotate(f.angle||0);const length=f.length||f.radius;
      if(f.kind==='slash'){ctx.beginPath();ctx.arc(0,0,f.radius*(.7+k*.3),-.75,.75);ctx.stroke();}
      else {ctx.globalAlpha*=.45;ctx.fillRect(0,-f.radius/2,length,f.radius);ctx.globalAlpha*=2;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(0,(i-1.5)*f.radius/4);ctx.quadraticCurveTo(length*.5,-f.radius*Math.sin(k*9+i),length,(i-1.5)*f.radius/5);ctx.stroke();}
        if(f.kind==='dragon'||f.kind==='demon'){const tip=length*(.45+k*.5);ctx.beginPath();ctx.moveTo(tip,0);ctx.lineTo(tip-60,-45);ctx.lineTo(tip-30,-12);ctx.lineTo(tip-100,0);ctx.lineTo(tip-30,12);ctx.lineTo(tip-60,45);ctx.closePath();ctx.fill();}
        if(f.kind==='wave'){ctx.beginPath();ctx.moveTo(length*.4,-30);ctx.lineTo(length*.6,-30);ctx.lineTo(length*.55,0);ctx.lineTo(length*.45,0);ctx.closePath();ctx.fill();ctx.fillRect(length*.5,-85,3,65);ctx.beginPath();ctx.moveTo(length*.5,-85);ctx.lineTo(length*.58,-45);ctx.lineTo(length*.5,-45);ctx.fill();}
      }
    }else{
      ctx.beginPath();ctx.arc(0,0,f.radius*(f.kind==='burst'?.35+k*.65:1),0,Math.PI*2);ctx.stroke();
      if(['field','heal','wall','aura'].includes(f.kind)){ctx.globalAlpha*=.15;ctx.fill();ctx.globalAlpha=.65;for(let i=0;i<8;i++){const an=i*Math.PI/4+a.time*.4;ctx.fillRect(Math.cos(an)*f.radius-3,Math.sin(an)*f.radius-3,6,6);}}
      if(f.kind==='bolt'){ctx.beginPath();ctx.moveTo(15,-200);ctx.lineTo(-15,-85);ctx.lineTo(18,-90);ctx.lineTo(0,0);ctx.lineWidth=7;ctx.stroke();}
      if(f.kind==='sword'){ctx.fillRect(-6,-140,12,140);ctx.fillRect(-40,-110,80,8);}
      if(f.kind==='cards')for(let i=0;i<12;i++){ctx.save();const an=i*Math.PI/6+k*3;ctx.rotate(an);ctx.translate(f.radius*(.4+k*.6),0);ctx.fillStyle=i%2?'#f4e9ff':'#c87bf9';ctx.fillRect(-8,-13,16,26);ctx.restore();}
      if(f.kind==='echo'){const img=advImage(a.id);if(img.complete&&img.naturalWidth)ctx.drawImage(img,img.naturalWidth/2,0,img.naturalWidth/4,img.naturalHeight,-42,-115,84,125);}
    }ctx.restore();
  }
  for(const u of a.allies){const [x,y]=worldToScreen(u.x,u.y),img=advImage('commander');if(img.complete&&img.naturalWidth){ctx.save();ctx.globalAlpha=.65;ctx.drawImage(img,(u.attack>1?2:0)*img.naturalWidth/4,0,img.naturalWidth/4,img.naturalHeight,x-34,y-92,68,100);ctx.restore();}}
}

function updateAdvancementHud() {
  let el=document.getElementById('roulette-hud');if(!el){el=document.createElement('div');el.id='roulette-hud';el.innerHTML='<img alt=""><div><strong></strong><p></p><small></small><div class="roulette-track"><i></i></div></div>';document.getElementById('screen-game').appendChild(el);}
  const s=player.skills.E,r=s?.roulette;el.hidden=!r||r.phase==='ready'||player.dying;
  if(el.hidden)return;
  const rolling=r.phase==='rolling',result=r.result;
  const name=rolling?(player.adv.id==='warlock'?WARLOCK_RESULTS[r.index].name:['에이스 · 카드 폭풍','조커 · 스킬 복제'][r.index]):result.name;
  const desc=rolling?'운명을 고르는 중…':result.desc;
  const key=rolling?'추첨 중':`E / 스킬 버튼으로 사용 · ${r.time.toFixed(1)}초`;
  const img=el.querySelector('img'),src=result?.iconImg||s.iconImg;
  if(img.getAttribute('src')!==src)img.src=src;
  img.style.transform=`rotate(${rolling?r.elapsed*900:0}deg)`;
  const write=(selector,text)=>{const node=el.querySelector(selector);if(node.textContent!==text)node.textContent=text;};
  write('strong',name);write('p',desc);write('small',key+' · 쿨타임 정지');
  el.querySelector('i').style.width=(rolling?100:Math.round(r.time*10))+'%';
}

function openJobModal() {
  const row=document.getElementById('job-card-row');row.innerHTML='';
  const base=APPEARANCE_POOL.find(j=>j.id===meta.appearance),current=selectedAdvancement();
  document.getElementById('job-modal-sub').textContent=`${base.name}의 전직 · Lv.5부터 해금 · 해금 후 변경 무료`;
  for(const j of ADVANCED_JOBS.filter(j=>j.base===meta.appearance)){
    const owned=meta.advancements.owned.includes(j.id),available=meta.charLevel>=5&&(owned||(meta.gold>=150&&meta.soul>=8));
    const card=document.createElement('article');card.className='adv-card'+(current?.id===j.id?' selected':'');
    card.innerHTML=`<div class="adv-portrait" style="${advPortraitStyle(j)}" role="img" aria-label="${j.name}"></div><h3><img src="${j.iconImg}" alt="">${j.name}</h3><p class="adv-basic">A · ${j.basic}</p><p>${Object.entries(j.statBonus).map(([key,value])=>statLabel(key)+' +'+(['critChance','lifesteal'].includes(key)?Math.round(value*100)+'%':value)).join(' · ')}</p><p>${j.passive}</p><p><b>Q · ${j.q}</b> · ${j.qd}초<br>${advQDescription(j.id)}</p><p><b>E · ${j.e}</b> · ${j.cd}초<br>${j.desc}</p><button type="button" class="menu-btn small" data-adv="${j.id}" ${available?'':'disabled'}>${current?.id===j.id?'선택 중':meta.charLevel<5?'Lv.5 필요':owned?'이 전직 선택':'해금 · 150골드 / 8영혼'}</button>`;
    card.querySelector('button').addEventListener('click',()=>{if(chooseAdvancement(j.id)){jobModal.classList.add('hidden');renderCharacterTab();renderGameTab();renderLobbyCurrency();}else{document.getElementById('job-modal-sub').textContent=saveWarning||'해금에 필요한 레벨 또는 재화가 부족합니다.';}});row.appendChild(card);
  }
  jobModal.classList.remove('hidden');
}
