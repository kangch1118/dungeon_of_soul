const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function fn(file,name){const text=fs.readFileSync(file,'utf8'),start=text.indexOf('function '+name+'(');let end=text.indexOf('{',start),depth=1;for(end++;depth;end++){if(text[end]==='{')depth++;if(text[end]==='}')depth--;}return text.slice(start,end);}
const c={Math,player:{x:100,y:0,radius:12,hp:100},playSfx(){},feedbackTone(){},hurtPlayer(d){c.player.hp-=d;},dist:(x,y,a,b)=>Math.hypot(x-a,y-b),clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),segmentDistance:(x,y,ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-ax-t*dx,y-ay-t*dy);}};
vm.createContext(c);vm.runInContext('let bossHazards=[];\n'+fn('data.js','stageMonsterPool')+'\n'+fn('phase2.js','enemyAttackSpec')+'\n'+fn('phase2.js','updateNormalAttack')+'\n'+fn('combat-expansion.js','makeHazard')+'\n'+fn('combat-expansion.js','updateBossHazards'),c);
for(const stage of [1,2,3])assert(!c.stageMonsterPool(stage).includes('skeleton_archer'));
for(const stage of [4,5,7,10])assert(c.stageMonsterPool(stage).includes('skeleton_archer'));
const e={monsterType:'skeleton_archer',x:0,y:0,dmg:8};c.updateNormalAttack(e,.01);assert.equal(e.aiState,'windup');c.updateNormalAttack(e,.9);assert.equal(c.player.hp,100);assert.equal(vm.runInContext('bossHazards.length',c),1);
c.updateBossHazards(.4);assert.equal(c.player.hp,92);c.updateBossHazards(.1);assert.equal(c.player.hp,92);
vm.runInContext('bossHazards=[]',c);e.aiState='idle';c.updateNormalAttack(e,.01);c.player.y=150;c.updateNormalAttack(e,.9);c.updateBossHazards(.5);assert.equal(c.player.hp,92);c.updateBossHazards(2);assert.equal(vm.runInContext('bossHazards.length',c),0);
for(const action of ['walk','attack']){const b=fs.readFileSync('image/skeleton_archer_20260914/'+action+'_strip_256.png');assert.equal(b.readUInt32BE(16),1024);assert.equal(b.readUInt32BE(20),256);assert.equal(b[25],6);}
console.log('PASS: stage gating, windup, projectile flight, swept collision, one hit, dodge, expiry, sprites');
