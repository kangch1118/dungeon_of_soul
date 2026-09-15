const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function fn(file,name){const text=fs.readFileSync(file,'utf8'),start=text.indexOf('function '+name+'(');let end=text.indexOf('{',start),depth=1;for(end++;depth;end++){if(text[end]==='{')depth++;if(text[end]==='}')depth--;}return text.slice(start,end);}
const c={Math,player:{x:0,y:0,radius:12,hp:100,slowTimer:0},playSfx(){},feedbackTone(){},
  hazards:[],makeHazard(b,kind,opts){const h={kind,...opts};c.hazards.push(h);return h;},
  hurtPlayer(d,slow){c.player.hp-=d;if(slow)c.player.slowTimer=Math.max(c.player.slowTimer,slow);},
  dist:(x,y,a,b)=>Math.hypot(x-a,y-b)};
vm.createContext(c);vm.runInContext(fn('data.js','stageMonsterPool')+'\n'+fn('phase2.js','enemyAttackSpec')+'\n'+fn('phase2.js','updateNormalAttack'),c);
assert.equal(c.stageMonsterPool(1).filter(x=>x==='tree').length,1);
assert(c.stageMonsterPool(1).includes('slime'));
assert(!c.stageMonsterPool(2).includes('tree'));
const e={monsterType:'tree',x:-80,y:0,dmg:4};
c.updateNormalAttack(e,.01);assert.equal(e.aiState,'windup');assert.equal(c.player.hp,100);
c.updateNormalAttack(e,.86);assert.equal(e.aiState,'recover');assert.equal(c.player.hp,100,'ranged leaf must not hit instantly');
assert.equal(c.hazards.length,1);assert.equal(c.hazards[0].leafArrow,true);assert.equal(c.hazards[0].slow,1.4);
c.updateNormalAttack(e,.2);assert.equal(c.hazards.length,1,'still recovering, no second leaf yet');
e.aiState='idle';c.player.y=400;c.updateNormalAttack(e,.01);assert.equal(e.aiState,'idle','out of the new 320 range, should not re-windup');assert.equal(c.hazards.length,1);
for(const action of ['walk','attack']){const b=fs.readFileSync('image/tree_monster_20260914/'+action+'_strip_256.png');assert.equal(b.readUInt32BE(16),1024);assert.equal(b.readUInt32BE(20),256);assert.equal(b[25],6);}
console.log('PASS: stage-1 pool, ranged leaf windup, weak+slow leaf hazard, out-of-range no retrigger, RGBA sprite dimensions');
