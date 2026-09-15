const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function fn(file,name){const text=fs.readFileSync(file,'utf8'),start=text.indexOf('function '+name+'(');assert(start>=0);let end=text.indexOf('{',start),depth=1;for(end++;depth;end++){if(text[end]==='{')depth++;if(text[end]==='}')depth--;}return text.slice(start,end);}
const c={Math,player:{x:0,y:0,radius:12,hp:100,goldMult:1},state:{stage:2,killCount:0},pickups:[],particles:[],advancementKill(){},playSfx(){},rand:(a,b)=>(a+b)/2,hurtPlayer(d){c.player.hp-=d;},dist:(x,y,a,b)=>Math.hypot(x-a,y-b),clamp:(x,a,b)=>Math.max(a,Math.min(b,x))};
vm.createContext(c);vm.runInContext('let bossHazards=[],bossSequence=0;\n'+fn('data.js','stageMonsterPool')+'\n'+fn('phase2.js','enemyAttackSpec')+'\n'+fn('game.js','killEnemy')+'\n'+fn('combat-expansion.js','makeHazard')+'\n'+fn('combat-expansion.js','updateBossHazards')+'\n'+fn('combat-expansion.js','resetBossCombat'),c);
assert(c.stageMonsterPool(2).includes('poison_slime'));assert(!c.stageMonsterPool(1).includes('poison_slime'));
assert.deepEqual(c.enemyAttackSpec({monsterType:'poison_slime'}),c.enemyAttackSpec({monsterType:'slime'}));
const e={monsterType:'poison_slime',x:0,y:0,dmg:8};c.killEnemy(e);c.killEnemy(e);assert.equal(c.state.killCount,1);assert.equal(c.pickups.length,2);assert.equal(vm.runInContext('bossHazards.length',c),1);
c.updateBossHazards(.4);assert.equal(c.player.hp,100);c.updateBossHazards(.1);assert.equal(c.player.hp,100);c.updateBossHazards(.4);assert.equal(c.player.hp,96);c.updateBossHazards(.4);assert.equal(c.player.hp,96);
c.player.x=200;c.updateBossHazards(.8);assert.equal(c.player.hp,96);c.player.x=0;c.updateBossHazards(.8);assert.equal(c.player.hp,92);c.updateBossHazards(0);assert.equal(c.player.hp,92);
c.updateBossHazards(10);assert.equal(c.player.hp,92);assert.equal(vm.runInContext('bossHazards.length',c),0);
c.killEnemy({...e,dead:false});c.resetBossCombat();assert.equal(vm.runInContext('bossHazards.length',c),0);
const game=fs.readFileSync('game.js','utf8');assert(game.includes("if(e.monsterType !== 'slime' && e.monsterType !== 'poison_slime')"));assert(game.includes("if (e.monsterType === 'slime' || e.monsterType === 'poison_slime') {"));
for(const action of ['walk','attack']){const b=fs.readFileSync('image/poison_slime_20260914/'+action+'_strip_256.png');assert.equal(b.readUInt32BE(16),1024);assert.equal(b.readUInt32BE(20),256);assert.equal(b[25],6);}
console.log('PASS: stage 2, slime attack/movement routing, single death/drop, poison delay/repeated damage/exit/reentry/pause/expiry/reset, sprites');
