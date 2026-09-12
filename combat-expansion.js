'use strict';

// 보스의 시간은 게임 dt로만 진행한다. 투사체·예고도 일시정지와 함께 멈춘다.
let bossHazards = [];
let bossSequence = 0;
function resetBossCombat() { bossHazards = []; bossSequence = 0; }
function initializeBoss(boss, def) {
  Object.assign(boss, { bossId: def.id, phase: 1, phaseChanged: false,
    aiState: 'intro', aiTime: 1.5, patternIndex: 0, height: 0,
    faceAngle: 0, action: null, ownerId: ++bossSequence });
}
function hurtPlayer(raw) {
  if (!player || player.dying || player.invuln > 0 || state.mode !== 'playing') return;
  let amount = raw * 50 / (50 + player.def);
  if (Math.random() < player.dmgReductionChance) {
    amount *= 1 - player.dmgReductionAmount;
    spawnVfxBurst(player.x, player.y, 'passive_shield_spark', 70, .35);
  }
  player.timeSinceDamage = 0;
  const absorbed = Math.min(player.shield, amount);
  player.shield -= absorbed;
  player.hp = Math.max(0, player.hp - (amount - absorbed));
  player.invuln = .4; player.hitFlash = .15; player.hitAnimTimer = PLAYER_HIT_ANIM_DUR;
  playSfx('hurt');
  if (player.hp <= 0) {
    player.dying = true; player.deathAnimTimer = 0; player.animState = 'death'; player.animFrame = 0;
    player.pendingBasicAttackDelay = null;
    player.pendingShots = null; player.activeDash = null;
    clearInput();
    bossHazards = [];
  }
}
function bossDamageMultiplier(e, source, continuous) {
  if (!e.isBoss) return 1;
  if (e.bossId === 'ancient_golem' && e.aiState === 'recover') return 1.3;
  if (e.bossId !== 'skeleton_commander' || continuous || !['idle','intro'].includes(e.aiState)) return 1;
  const a = Math.atan2(source.y - e.y, source.x - e.x);
  return Math.cos(a - e.faceAngle) >= .5 ? .5 : 1;
}
function makeHazard(b, kind, opts) {
  const h = { ownerId: b.ownerId, bossId: b.bossId, kind, age: 0, delay: .9, duration: .22,
    x: b.x, y: b.y, radius: 90, damage: b.dmg, hit: false, ...opts };
  bossHazards.push(h); return h;
}
function bossPoint(x, y, radius = 90) {
  return { x: clamp(x, radius + 20, WORLD_W - radius - 20), y: clamp(y, radius + 20, WORLD_H - radius - 20) };
}
function summonBossMinions(b, type, count) {
  const existing = enemies.filter(e => !e.dead && e.ownerBossId === b.ownerId && !e.isTotem).length;
  const limit = type === 'bat' ? 6 : 4;
  for (let i = 0; i < Math.min(count, limit - existing, MAX_LIVE_ENEMIES - enemies.length); i++) {
    const a = i * 2.4 + rand(0, 1);
    let p = bossPoint(b.x + Math.cos(a) * 150, b.y + Math.sin(a) * 150, 24);
    if (dist(p.x,p.y,player.x,player.y) < 90) p = bossPoint(b.x - Math.cos(a)*180,b.y-Math.sin(a)*180,24);
    const e = spawnNormalEnemy(type, p);
    if (e) { e.ownerBossId = b.ownerId; e.isBossSummon = true; }
  }
}
function spawnBossTotem(b, angle, ritual = false) {
  if (enemies.length >= MAX_LIVE_ENEMIES) return;
  const p = bossPoint(b.x + Math.cos(angle)*210,b.y+Math.sin(angle)*210,30);
  enemies.push({ ...p, radius: 23, hp: b.maxHp * (ritual ? .05 : .08), maxHp: b.maxHp * (ritual ? .05 : .08),
    isTotem: true, ritual, isBossSummon: true, ownerBossId: b.ownerId,
    life: ritual ? 6 : 8, healTimer: 1, speed: 0, dmg: 0, flash: 0, facing: 1 });
}
function cleanBossObjects(b) {
  bossHazards = bossHazards.filter(h => h.ownerId !== b.ownerId);
  enemies.forEach(e => { if (e.ownerBossId === b.ownerId) e.dead = true; });
}
function startBossPattern(b) {
  const second = b.patternIndex++ % 2 === 1;
  const a = Math.atan2(player.y-b.y,player.x-b.x);
  b.faceAngle = a; b.facing = Math.cos(a)<0?-1:1;
  b.aiState = 'attack'; b.action = null;
  const target = bossPoint(player.x,player.y,100);
  const circle = (p, radius, delay, damage=1) => makeHazard(b,'circle',{...p,radius,delay,damage:b.dmg*damage});
  const dash = (length, delay=.9) => {
    const end=bossPoint(b.x+Math.cos(a)*length,b.y+Math.sin(a)*length,55);
    makeHazard(b,'line',{x:b.x,y:b.y,ex:end.x,ey:end.y,width:70,delay,duration:.45,damage:b.dmg*1.1});
    b.action={type:'dash',sx:b.x,sy:b.y,ex:end.x,ey:end.y,start:delay,duration:.45,age:0};
    b.aiTime=delay+.45;
  };
  const slash = (delay=1, angle=a) => makeHazard(b,'cone',{x:b.x,y:b.y,radius:150,angle,spread:Math.PI*2/3,delay,damage:b.dmg*1.3});
  switch(b.bossId) {
    case 'slime_king':
      if(second && enemies.filter(e=>!e.dead&&e.ownerBossId===b.ownerId).length<4) {
        b.action={type:'summon',monster:'slime',count:2,start:1,age:0}; b.aiTime=1.1;
      } else {
        circle(target,90,.9+.45,1.2);
        b.action={type:'jump',sx:b.x,sy:b.y,ex:target.x,ey:target.y,start:.9,duration:.45,age:0}; b.aiTime=1.6;
      } break;
    case 'bat_queen':
      if(second) { b.action={type:'summon',monster:'bat',count:3,start:1.1,age:0}; b.aiTime=1.2; }
      else dash(420,.85);
      break;
    case 'goblin_bomber': {
      const count=second?1:(b.phase===2?4:3);
      for(let i=0;i<count;i++) {
        const angle=a+(i-(count-1)/2)*1.6;
        const p=second?bossPoint(b.x+Math.cos(a)*170,b.y+Math.sin(a)*170,120):bossPoint(target.x+Math.cos(angle)*150,target.y+Math.sin(angle)*150,70);
        circle(p,second?120:70,second?2.5:2+i*.4,second?1.2:.8);
      }
      b.aiTime=second?2.8:2.3+(count-1)*.4; break;
    }
    case 'skeleton_commander':
      if(second) {slash();if(b.phase===2)slash(2, a+.9);b.aiTime=b.phase===2?2.25:1.25;}
      else dash(360);
      break;
    case 'fallen_cleric':
      if(second && !enemies.some(e=>!e.dead&&e.isTotem&&e.ownerBossId===b.ownerId)) {
        b.action={type:'totem',start:1,age:0};b.aiTime=1.2;
      } else {
        const count=b.phase===2?4:3;
        for(let i=0;i<count;i++) {
          // 한쪽 반원을 비워 탈출 경로를 보장한다.
          const p=bossPoint(target.x+(i-(count-1)/2)*165,target.y+50,75);
          circle(p,75,1.6,.9);
        } b.aiTime=1.85;
      } break;
    case 'ancient_golem':
      if(second) {makeHazard(b,'ring',{x:b.x,y:b.y,radius:40,endRadius:320,width:32,delay:1.3,duration:1.75,damage:b.dmg});b.aiTime=3.1;}
      else {circle(target,100,1.2,1.3);if(b.phase===2)circle(bossPoint(target.x+150,target.y,100),100,2.4,1.3);b.aiTime=b.phase===2?2.65:1.45;}
      break;
    case 'vampire_lord':
      if(second) {
        const p=bossPoint(player.x+Math.cos(a+Math.PI/2)*210,player.y+Math.sin(a+Math.PI/2)*210,90);
        const facing=Math.atan2(player.y-p.y,player.x-p.x);
        makeHazard(b,'cone',{...p,radius:130,angle:facing,spread:Math.PI*100/180,delay:1.5,damage:b.dmg*1.1});
        b.action={type:'teleport',ex:p.x,ey:p.y,start:1.4,age:0};b.aiTime=1.75;
      } else {
        // 탄환은 발사 위치와 방향을 예고하고, 발사 후 고정 방향으로 진행한다.
        const volley={hit:false};
        for(let i=0;i<5;i++)makeHazard(b,'bullet',{x:b.x,y:b.y,angle:a+(i-2)*.28,radius:12,delay:.9,duration:2.5,speed:200,damage:b.dmg*.65,volley});
        b.aiTime=1.2;
      } break;
  }
  feedbackTone('warning');
  playSfx('monster_atk');
}
function updateBossAI(b, dt) {
  b.faceAngle = b.faceAngle || 0;
  if(b.aiState==='idle') {
    const a=Math.atan2(player.y-b.y,player.x-b.x);b.faceAngle=a;b.facing=Math.cos(a)<0?-1:1;
    const approachDistance = Math.max(60, Math.min(190, canvas.width * .3, canvas.height * .28));
    if(dist(b.x,b.y,player.x,player.y)>approachDistance){const speed=b.speed*(b.slowTimer > 0 ? .5 : b.inAura ? .65 : 1);b.x+=Math.cos(a)*speed*dt;b.y+=Math.sin(a)*speed*dt;}
  }
  const action=b.action;
  if(action) {
    action.age+=dt;
    if(action.type==='jump'||action.type==='dash') {
      const t=clamp((action.age-action.start)/action.duration,0,1);
      b.x=action.sx+(action.ex-action.sx)*t;b.y=action.sy+(action.ey-action.sy)*t;
      b.height=action.type==='jump'?Math.sin(t*Math.PI)*85:0;
    } else if(action.age>=action.start&&!action.done) {
      action.done=true;
      if(action.type==='summon')summonBossMinions(b,action.monster,action.count);
      if(action.type==='totem')spawnBossTotem(b,b.faceAngle+Math.PI);
      if(action.type==='teleport'){b.x=action.ex;b.y=action.ey;}
    }
  }
  b.aiTime-=dt;
  if(b.aiTime>0)return;
  const canChain = b.aiState === 'attack' && b.phase === 2 && !b.chainDone &&
    ((b.bossId === 'slime_king' && b.action?.type === 'jump') || (b.bossId === 'bat_queen' && b.action?.type === 'dash'));
  b.action=null;b.height=0;
  if(canChain) { b.chainDone=true; b.patternIndex--; startBossPattern(b); return; }
  if(b.aiState==='attack'){b.aiState='recover';b.aiTime=b.bossId==='ancient_golem'?2:1.3;return;}
  if(b.aiState==='ritual') {
    const alive=enemies.filter(e=>!e.dead&&e.ritual&&e.ownerBossId===b.ownerId);
    b.hp=Math.min(b.maxHp,b.hp+alive.length*b.maxHp*.04);alive.forEach(e=>e.dead=true);
    b.aiState='recover';b.aiTime=2;return;
  }
  if(!b.phaseChanged && b.hp<=b.maxHp*.5){
    b.phaseChanged=true;b.phase=2;
    floatTexts.push({x:b.x,y:b.y-75,text:'분노 · 2단계',color:'#ffb35b',life:1.5,vy:-20});
    if(b.bossId==='vampire_lord') {spawnBossTotem(b,0,true);spawnBossTotem(b,Math.PI,true);b.aiState='ritual';b.aiTime=6;}
    else {b.aiState='intro';b.aiTime=1;}
    return;
  }
  if(b.aiState!=='idle'){b.aiState='idle';b.aiTime=b.phase===2?.85:1.25;return;}
  if(Math.abs(b.x-player.x)>canvas.width*.46||Math.abs(b.y-player.y)>canvas.height*.4){b.aiTime=.3;return;}
  b.chainDone=false;
  startBossPattern(b);
}
function segmentDistance(px,py,ax,ay,bx,by) {
  const dx=bx-ax,dy=by-ay,t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1);
  return dist(px,py,ax+t*dx,ay+t*dy);
}
function updateBossHazards(dt) {
  for(const h of bossHazards) {
    const before=h.age;h.age+=dt;
    if(h.age<h.delay)continue;
    if(before<h.delay) playSfx(h.bossId==='goblin_bomber'?'fire_hit':h.bossId==='fallen_cleric'?'holy':'monster_atk');
    const t=clamp(h.age-h.delay,0,h.duration),prev=clamp(before-h.delay,0,h.duration);
    let hit=false;const pr=player.radius;
    if(h.kind==='circle')hit=dist(player.x,player.y,h.x,h.y)<=h.radius+pr;
    if(h.kind==='cone') {
      const d=dist(player.x,player.y,h.x,h.y),diff=Math.acos(clamp(Math.cos(Math.atan2(player.y-h.y,player.x-h.x)-h.angle),-1,1));
      hit=d<=pr||(d<=h.radius+pr&&diff<=h.spread/2+Math.asin(Math.min(1,pr/Math.max(d,1))));
    }
    if(h.kind==='line') {
      const ax=h.x+(h.ex-h.x)*prev/h.duration,ay=h.y+(h.ey-h.y)*prev/h.duration;
      const bx=h.x+(h.ex-h.x)*t/h.duration,by=h.y+(h.ey-h.y)*t/h.duration;
      hit=segmentDistance(player.x,player.y,ax,ay,bx,by)<=h.width/2+pr;
    }
    if(h.kind==='ring') {
      const r0=h.radius+(h.endRadius-h.radius)*prev/h.duration,r1=h.radius+(h.endRadius-h.radius)*t/h.duration;
      const d=dist(player.x,player.y,h.x,h.y);hit=d>=r0-h.width/2-pr&&d<=r1+h.width/2+pr;
    }
    if(h.kind==='bullet') {
      const dx=Math.cos(h.angle)*h.speed,dy=Math.sin(h.angle)*h.speed;
      hit=segmentDistance(player.x,player.y,h.x+dx*prev,h.y+dy*prev,h.x+dx*t,h.y+dy*t)<=h.radius+pr;
    }
    if(hit&&!h.hit&&!h.volley?.hit) {hurtPlayer(h.damage);h.hit=true;if(h.volley)h.volley.hit=true;}
  }
  bossHazards=bossHazards.filter(h=>h.age<h.delay+h.duration);
}
function updateTotem(e,dt) {
  const b=state.boss;if(!b||b.dead){e.dead=true;return;}
  // 의식 제단의 만료는 보스가 처리해 회복 판정을 놓치지 않는다.
  if(e.ritual)return;
  e.life-=dt;e.healTimer-=dt;
  if(e.healTimer<=0){e.healTimer+=1;b.hp=Math.min(b.maxHp,b.hp+b.maxHp*.01);}
  if(e.life<=0)e.dead=true;
}
function drawBossHazards(outlineOnly = false) {
  ctx.save();
  for(const h of bossHazards) {
    const [x,y]=worldToScreen(h.x,h.y),warning=h.age<h.delay;
    ctx.strokeStyle=warning?'#ffbd66':'#fff1b6';ctx.fillStyle=warning?'rgba(255,83,55,.16)':'rgba(255,157,54,.45)';
    ctx.lineWidth=warning?2:4;ctx.setLineDash(warning?[8,5]:[]);ctx.beginPath();
    if(h.kind==='circle')ctx.arc(x,y,h.radius,0,Math.PI*2);
    if(h.kind==='cone'){ctx.moveTo(x,y);ctx.arc(x,y,h.radius,h.angle-h.spread/2,h.angle+h.spread/2);ctx.closePath();}
    if(h.kind==='line') {
      const [ex,ey]=worldToScreen(h.ex,h.ey),a=Math.atan2(ey-y,ex-x),nx=-Math.sin(a)*h.width/2,ny=Math.cos(a)*h.width/2;
      ctx.moveTo(x+nx,y+ny);ctx.lineTo(ex+nx,ey+ny);ctx.lineTo(ex-nx,ey-ny);ctx.lineTo(x-nx,y-ny);ctx.closePath();
    }
    if(h.kind==='ring') {const r=warning?h.endRadius:h.radius+(h.endRadius-h.radius)*clamp((h.age-h.delay)/h.duration,0,1);ctx.arc(x,y,r,0,Math.PI*2);if(!warning)ctx.lineWidth=h.width;}
    if(h.kind==='bullet') {
      if(warning){ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(h.angle)*180,y+Math.sin(h.angle)*180);}
      else {const t=h.age-h.delay;ctx.arc(x+Math.cos(h.angle)*h.speed*t,y+Math.sin(h.angle)*h.speed*t,h.radius,0,Math.PI*2);}
    }
    if(!outlineOnly && h.kind!=='ring')ctx.fill();ctx.stroke();
    if(warning && h.kind==='circle') {ctx.setLineDash([]);ctx.beginPath();ctx.arc(x,y,h.radius,-Math.PI/2,-Math.PI/2+Math.PI*2*h.age/h.delay);ctx.lineWidth=4;ctx.stroke();}
    if(!outlineOnly && !warning && h.kind==='circle') {
      const key=h.bossId==='goblin_bomber'?'w_flame_slash':h.bossId==='fallen_cleric'?'e_mana_burst':'e_earth_shockwave';
      const img=vfxImages[key];
      if(img?.complete&&img.naturalWidth) {ctx.save();ctx.globalAlpha=.75;ctx.globalCompositeOperation='lighter';ctx.drawImage(img,x-h.radius,y-h.radius,h.radius*2,h.radius*2);ctx.restore();}
    }
    if(!outlineOnly && warning && h.bossId==='goblin_bomber' && h.kind==='circle') {
      const fly=clamp(h.age/.65,0,1);ctx.save();ctx.translate(x,y-Math.sin(fly*Math.PI)*65);
      ctx.fillStyle='#252536';ctx.strokeStyle='#e8b56b';ctx.lineWidth=2;ctx.setLineDash([]);ctx.beginPath();ctx.arc(0,0,13,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.strokeStyle='#ffd475';ctx.beginPath();ctx.moveTo(5,-11);ctx.quadraticCurveTo(4,-26,14,-20);ctx.stroke();ctx.restore();
    }
  }ctx.restore();
}
function drawTotem(e) {
  const[x,y]=worldToScreen(e.x,e.y);ctx.save();ctx.translate(x,y);
  ctx.fillStyle=e.ritual?'#b73563':'#6947ad';ctx.strokeStyle='#d7b366';ctx.lineWidth=3;
  ctx.fillRect(-14,-42,28,42);ctx.strokeRect(-14,-42,28,42);
  ctx.beginPath();ctx.moveTo(0,-66);ctx.lineTo(18,-45);ctx.lineTo(0,-27);ctx.lineTo(-18,-45);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#272133';ctx.fillRect(-24,-78,48,5);ctx.fillStyle='#c5a2ff';ctx.fillRect(-24,-78,48*clamp(e.hp/e.maxHp,0,1),5);ctx.restore();
}
