const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root=path.resolve(__dirname,'..'),stage=root;
const server=http.createServer((req,res)=>{const url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const rel=url==='/'?'index.html':url.slice(1);let file=path.resolve(stage,rel);if(!file.startsWith(stage+path.sep)){res.writeHead(403).end();return;}if(!fs.existsSync(file))file=path.resolve(root,rel);fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.mp3':'audio/mpeg','.json':'application/json','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const checks=[];try{
 browser=await chromium.launch({headless:true,channel:'msedge'});const url='http://127.0.0.1:'+server.address().port;
 const context=await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:'block'}),page=await context.newPage();const errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});await page.goto(url,{waitUntil:'load'});
 assert(!requests.some(r=>r.includes('player_anim/')||r.includes('boss_expansion_')));checks.push('title does not load class sheets or bosses');
 checks.push(...await page.evaluate(()=>{
  const result=[],check=(n,v)=>{if(!v)throw Error(n);result.push(n)};options.sfx=0;options.bgm=0;
  function fresh(){meta=defaultMeta();startRun();spawnTimer=999;state.nextWaveAt=999;}
  fresh();check('only selected class requested',Object.keys(playerAnimImages).join()==='warrior');
  const valid={...defaultMeta(),gold:321,charLevel:9,charExp:12,equipment:{starter_dagger:{level:0},shadow_robe:{level:10}},equippedArmor:'shadow_robe'};
  check('valid save preserved',JSON.stringify(normalizeMeta(valid))===JSON.stringify(valid));
  const recovered=normalizeMeta({gold:-9,charLevel:null,job:null,pets:null,equipment:null,appearance:'missing'});check('malformed nested save normalized',recovered.gold===0&&recovered.job.tier1===null&&recovered.appearance==='warrior');
  meta=valid;check('upgraded speed applied',Math.abs(getComputedStats().speed-BASE_STATS.speed*1.176)<.001);
  const setItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new Error('quota')};check('save failure returns false',saveMeta()===false);check('visible save failure',!document.getElementById('storage-notice').hidden);Storage.prototype.setItem=setItem;check('save retry clears error',saveMeta()&&!saveWarning);
  for(const type of ['goblin','skeleton','bat']){
   fresh();const e=spawnNormalEnemy(type,{x:player.x-35,y:player.y});const hp=player.hp;updateNormalEnemy(e,.01);check(type+' warns before damage',e.aiState==='windup'&&player.hp===hp);
   const a=e.attackAngle;player.y+=350;updateNormalEnemy(e,1);if(type==='bat')updateNormalEnemy(e,.4);check(type+' dodge succeeds',player.hp===hp&&e.attackAngle===a);check(type+' recovery exists',e.aiState==='recover');
  }
  fresh();const e=spawnNormalEnemy('skeleton',{x:player.x-45,y:player.y});const hp=player.hp;updateNormalEnemy(e,.01);updateNormalEnemy(e,.71);check('skeleton hits after warning',player.hp<hp);
  fresh();const enemy=spawnNormalEnemy('goblin',{x:player.x+60,y:player.y});enemy.hp=10000;dealDamageToEnemy(enemy,5,false);check('hit emits visible feedback',combatFeedback.sparks.length===1);dealDamageToEnemy(enemy,5,true);check('critical feedback distinguished',combatFeedback.sparks[1].critical&&combatFeedback.pause>0);
  const count=combatFeedback.sparks.length;dealDamageToEnemy(enemy,1,false,true);check('damage over time does not spam feedback',combatFeedback.sparks.length===count);
  check('rogue close range damage advantage',CLASS_KITS.rogue.basicAttack.dmgMult/CLASS_KITS.rogue.basicAttack.interval>CLASS_KITS.mage.basicAttack.dmgMult/CLASS_KITS.mage.basicAttack.interval);
  fresh();meta.charLevel=5;meta.gold=1000;meta.soul=100;openJobModal();check('job selection keyboard button',document.querySelector('#job-card-row button')!==null);check('job unlock and free switching shown',document.getElementById('job-modal-sub').textContent.includes('해금 후 변경 무료')&&document.getElementById('job-card-row').textContent.includes('150골드'));
  return result;
 }));
 await page.evaluate(()=>{document.getElementById('opt-sfx').value=23;document.getElementById('opt-sfx').dispatchEvent(new Event('input'));document.getElementById('opt-sfx').dispatchEvent(new Event('change'));});await page.reload();assert.equal(await page.evaluate(()=>options.sfx),23);checks.push('options persist on reload');
 await page.evaluate(()=>localStorage.setItem(SAVE_KEY,'{broken'));await page.reload();assert(await page.evaluate(()=>saveMeta()===false&&localStorage.getItem(SAVE_KEY)==='{broken'));checks.push('broken JSON protected from overwrite');await page.locator('#storage-recover').click();assert(await page.evaluate(()=>JSON.parse(localStorage.getItem(SAVE_KEY)).charLevel===1&&localStorage.getItem(SAVE_KEY+'_recovery')==='{broken'));checks.push('explicit save recovery keeps original backup');
 fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
 const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'}),mp=await mobile.newPage();mp.on('pageerror',e=>errors.push(e.message));await mp.addInitScript(()=>{window.requestAnimationFrame=()=>0;});await mp.goto(url);await mp.evaluate(()=>{options.sfx=0;options.bgm=0;startRun();render();updateHud();});
 const joy=await mp.locator('#touch-joystick').boundingBox(),attack=await mp.locator('#touch-attack').boundingBox();assert(joy&&attack);const cdp=await mobile.newCDPSession(mp);const touches=[{x:joy.x+joy.width*.8,y:joy.y+joy.height/2,id:1},{x:attack.x+attack.width/2,y:attack.y+attack.height/2,id:2}];
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:touches});assert(await mp.evaluate(()=>touchMove.x>.5&&touchAttack));checks.push('simultaneous joystick and attack pointers');
 assert(await mp.evaluate(()=>{const x=player.x;update(.05);return player.x>x&&player.atkTimer>0}));checks.push('touch moves and starts basic attack');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert(await mp.evaluate(()=>!touchAttack&&touchMove.x===0));checks.push('cancel clears touch state');
 await mp.evaluate(async()=>{await playerAnimImages.warrior.walk.side.decode();update(.016);render();updateHud();});
 await mp.screenshot({path:path.join(root,'test-results','phase2-mobile.png')});
 await mp.setViewportSize({width:844,height:390});await mp.evaluate(()=>{update(.016);render();updateHud();});await mp.screenshot({path:path.join(root,'test-results','phase2-landscape.png')});
 for(const selector of ['#touch-joystick','#touch-attack','#hotbar']){const b=await mp.locator(selector).boundingBox();assert(b.x>=0&&b.y>=0&&b.x+b.width<=844&&b.y+b.height<=390);}checks.push('landscape controls stay within screen');
 const offline=await browser.newContext({viewport:{width:1280,height:800}}),op=await offline.newPage();op.on('pageerror',e=>errors.push(e.message));await op.addInitScript(()=>{window.requestAnimationFrame=()=>0;});await op.goto(url);await op.locator('#btn-offline').click();await op.waitForFunction(()=>document.getElementById('offline-status').textContent==='오프라인 준비 완료',null,{timeout:120000,polling:100});checks.push('all runtime assets prepared offline');
 await offline.setOffline(true);await op.reload({waitUntil:'load'});assert(await op.evaluate(async()=>{options.sfx=0;options.bgm=0;meta.appearance='rogue';startRun();state.stage=7;startStage();spawnBoss();await playerAnimImages.rogue.walk.side.decode();await bossImages[state.boss.bossFile].decode();return state.mode==='playing'}));checks.push('offline reload alternate class and final boss');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:checks.length,checks,pageErrors:errors},null,2));
}finally{if(browser)await browser.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
