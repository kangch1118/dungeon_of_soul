const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root=path.resolve(__dirname,'..'),stage=root;
const server=http.createServer((req,res)=>{const url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const rel=url==='/'?'index.html':url.slice(1);let file=path.resolve(stage,rel);if(!file.startsWith(stage+path.sep)){res.writeHead(403).end();return;}if(!fs.existsSync(file))file=path.resolve(root,rel);fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.mp3':'audio/mpeg','.json':'application/json','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;try{
  browser=await chromium.launch({headless:true,channel:'msedge'});
  const page=await browser.newPage({viewport:{width:1280,height:800},serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'load'});
  const results=await page.evaluate(()=>{
    const checks=[];function check(n,v){if(!v)throw Error(n);checks.push(n)}
    options.sfx=0;options.bgm=0;
    const fresh=()=>{meta=defaultMeta();startRun();spawnTimer=999;state.nextWaveAt=999;player.invuln=999;};
    const enemy=(x,y,hp=10000)=>({x,y,hp,maxHp:hp,radius:18,speed:0,dmg:0,hitCooldown:999,monsterType:'goblin'});
    fresh();let seen=new Set();for(let i=0;i<700;i++){update(1/60);seen.add(player.animFrame)}check('idle uses all 4 frames',seen.size===4);
    fresh();keys.arrowright=true;seen=new Set();for(let i=0;i<120;i++){update(1/60);seen.add(player.animFrame)}check('walk uses all 6 frames',seen.size===6);clearInput();
    fresh();enemies=[enemy(player.x-50,player.y)];useSkill('Q');check('Q faces left',player.animDir==='side'&&player.animFlip);
    fresh();player.dying=true;player.hp=0;enemies=[enemy(player.x+30,player.y,1)];useSkill('Q');check('no post-death cast',!enemies[0].dead&&player.skills.Q.cd===0);
    fresh();const before=meta.charExp;settleAndQuitToLobby();check('no empty run XP',meta.charExp===before);
    fresh();state.killCount=state.killTarget;settleAndQuitToLobby();const rewarded=meta.charExp;settleAndQuitToLobby();check('earned exit XP only once',rewarded===6&&meta.charExp===rewarded);
    fresh();meta.job.tier1='archer';player=newPlayer();enemies=[enemy(2500,2500)];useSkill('E');check('archer cannot cast out of range',player.skills.E.cd===0);
    enemies=[enemy(player.x+100,player.y)];const hp=enemies[0].hp;useSkill('E');for(let i=0;i<60;i++)updateTimedAttacks(1/60);check('archer five shots on single target',Math.abs(hp-enemies[0].hp-player.atk*1.2*5)<.001);
    fresh();meta.equipment.flame_sword={level:0};meta.equippedWeapon='flame_sword';player=newPlayer();enemies=[enemy(player.x+50,player.y),enemy(player.x-50,player.y)];useSkill('W');check('flame cone excludes rear',enemies[0].hp<10000&&enemies[1].hp===10000);
    fresh();meta.equipment.steel_bow={level:0};meta.equippedWeapon='steel_bow';player=newPlayer();enemies=[enemy(player.x+50,player.y),enemy(player.x+200,player.y),enemy(player.x+200,player.y+100)];useSkill('W');check('bow line hits aligned only',enemies[0].hp<10000&&enemies[1].hp<10000&&enemies[2].hp===10000);
    fresh();meta.equipment.frost_staff={level:0};meta.equippedWeapon='frost_staff';player=newPlayer();enemies=[enemy(player.x+100,player.y)];useSkill('W');check('frost applies slow',enemies[0].slowTimer===3);for(let i=0;i<190;i++)update(1/60);check('frost expires',enemies[0].slowTimer===0);
    fresh();meta.job.tier1='warrior';player=newPlayer();enemies=[enemy(player.x+90,player.y)];const dx=player.x,oldHp=enemies[0].hp;useSkill('E');for(let i=0;i<30;i++)updateTimedAttacks(1/60);check('dash moves 180',Math.abs(player.x-dx-180)<.01);check('dash hits once',Math.abs(oldHp-enemies[0].hp-player.atk*3.5)<.001);
    fresh();spawnBoss();state.boss.x=player.x+5;state.boss.y=player.y;state.boss.hp=1;player.pet={def:PET_POOL.find(p=>p.id==='flame_spirit'),timer:0};update(1/60);
    check('pet kill keeps stage clear',state.mode==='stageclear'&&state.boss.dead);check('boss XP queued and collected',pendingLevelUps>0&&!pickups.some(p=>p.type==='exp'));
    const gold=meta.gold;onStageClear();check('clear settled once',meta.gold===gold);
    document.getElementById('btn-next-stage').click();check('queued card before combat',state.stage===2&&state.mode==='levelup');
    fresh();document.getElementById('btn-controls').click();togglePause();check('ESC cannot resume under help',state.mode==='controls');document.getElementById('btn-controls-close').click();check('help closes to prior play',state.mode==='playing');
    togglePause();document.getElementById('btn-pause-option').click();togglePause();check('ESC cannot resume under options',state.mode==='options');document.getElementById('btn-option-close').click();check('options returns paused',state.mode==='paused');
    fresh();keys.arrowright=true;window.dispatchEvent(new Event('blur'));check('blur clears and pauses',!keys.arrowright&&state.mode==='paused');
    fresh();state.killCount=state.killTarget;onStageClear();const exp=meta.charExp;document.getElementById('btn-clear-lobby').click();check('clear to lobby no extra reward',state.mode==='idle'&&meta.charExp===exp);
    return checks;
  });
  // Exercise asynchronous card completion and both resolutions in a real DOM.
  await page.evaluate(()=>{startRun();pendingLevelUps=2;showLevelUpModal()});
  await page.locator('#card-row button').first().click();await page.waitForFunction(()=>pendingLevelUps===1,null,{polling:50});
  await page.locator('#card-row button').first().click();await page.waitForFunction(()=>pendingLevelUps===0&&state.mode==='playing',null,{polling:50});
  results.push('card queue completes asynchronously');
  await page.evaluate(()=>{startRun();state.killCount=state.killTarget;onStageClear()});
  fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
  await page.screenshot({path:path.join(root,'test-results','phase1-clear-desktop.png')});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(root,'test-results','phase1-clear-mobile.png')});
  const box=await page.locator('#btn-clear-lobby').boundingBox();assert(box.x>=0&&box.x+box.width<=390&&box.y+box.height<=844);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:results.length+1,checks:results,pageErrors:errors},null,2));
}finally{if(browser)await browser.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
