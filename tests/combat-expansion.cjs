const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const mime = {'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.mp3':'audio/mpeg','.json':'application/json'};
const server = http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err,data) => {if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async () => {
  await new Promise(r => server.listen(0,'127.0.0.1',r));
  let browser;
  try {
    try { browser = await chromium.launch({headless:true}); }
    catch { browser = await chromium.launch({headless:true,channel:'msedge'}); }
    const page = await browser.newPage({viewport:{width:1280,height:800},serviceWorkers:'block'});
    const errors=[]; page.on('pageerror', e=>errors.push(e.message));
    // 독립 테스트 브라우저에서만 실행하며 사용자의 저장 진행도는 변경하지 않는다.
    await page.addInitScript(() => {window.requestAnimationFrame=()=>0;});
    await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'load'});
    const report=await page.evaluate(async()=>{
      const checks=[];
      const check=(name,ok)=>{if(!ok)throw new Error(name);checks.push(name);};
      options.bgm=0;options.sfx=0;startRun();
      check('18 cards',SKILL_POOL.length===18);
      check('7 bosses',BOSS_TIERS.length===7);
      for(const c of SKILL_POOL){
        const img=new Image();img.src=cardImagePath(c.id);await img.decode();check(`icon ${c.id}`,img.naturalWidth>0);
      }
      check('projectile-only cards excluded for warrior',!availableCards(player).some(c=>c.id==='pierce'));
      const p=newPlayer();SKILL_POOL.find(c=>c.id==='armor').apply(p);check('armor applies',p.def===player.def+8);
      SKILL_POOL.find(c=>c.id==='haste').apply(player);player.skills.Q.cd=5;update(.1);check('haste cooldown',Math.abs(player.skills.Q.cd-4.888)<.001);
      player.atkTimer=.5;updateHud();check('basic cooldown text',document.getElementById('basic-cd-text').textContent==='0.5초');
      enemies=[];const slime=spawnNormalEnemy('slime',{x:player.x-240,y:player.y});slime.hopTime=0;
      const oldX=slime.x;update(.1);check('slime hop moves and lifts',slime.x>oldX&&slime.height>0);
      const bat=spawnNormalEnemy('bat',{x:player.x-250,y:player.y});check('bat faster',bat.speed>slime.speed);
      startRun();state.stage=2;startStage();state.stageElapsed=23.95;update(.1);
      check('bat wave spawned',enemies.filter(e=>e.monsterType==='bat').length>=3);
      check('longer stage',state.stageDuration>=95&&state.killTarget>=46);
      enemies=[];spawnTimer=0;state.killCount=state.killTarget;state.stageElapsed=10;update(.1);check('no premature boss',!state.bossActive&&enemies.length>0);
      enemies=[];state.stageElapsed=state.stageDuration;update(.1);check('boss after waves cleared',state.bossActive);
      startRun();player.secondWind=true;player.hp=player.maxHp*.2;update(.1);check('second wind healing',player.hp>player.maxHp*.4&&player.secondWindCd===30);
      for(let i=0;i<BOSS_TIERS.length;i++){
        startRun();state.stage=i+1;startStage();enemies=[];spawnBoss();const b=state.boss;
        const img=bossImages[b.bossFile];await img.decode();check(`boss art ${b.bossId}`,img.naturalWidth>0);
        b.x=player.x+160;b.y=player.y;player.invuln=999;
        let maxHazards=0,maxSummons=0;
        for(let n=0;n<2400;n++){updateBossAI(b,1/60);updateBossHazards(1/60);maxHazards=Math.max(maxHazards,bossHazards.length);maxSummons=Math.max(maxSummons,enemies.length-1);}
        check(`patterns ${b.bossId}`,b.patternIndex>=2&&maxHazards>0&&Number.isFinite(b.x));
        b.hp=b.maxHp*.45;b.aiState='recover';b.aiTime=0;updateBossAI(b,.01);check(`phase ${b.bossId}`,b.phase===2);
        const kills=state.killCount;const summoned=enemies.find(e=>e.isBossSummon);if(summoned)killEnemy(summoned);
        check(`summon rewards ${b.bossId}`,state.killCount===kills);
        cleanBossObjects(b);check(`cleanup ${b.bossId}`,!bossHazards.length&&!enemies.some(e=>!e.dead&&e.isBossSummon));
      }
      startRun();player.def=0;player.shield=0;player.invuln=0;const hp=player.hp;
      makeHazard({ownerId:1,x:player.x,y:player.y,dmg:10},'circle',{delay:.5});
      updateBossHazards(.4);check('no damage before warning',player.hp===hp);
      updateBossHazards(.11);updateBossHazards(.01);check('one hit per hazard',player.hp===hp-10);
      resetBossCombat();startRun();pendingLevelUps=2;showLevelUpModal();
      document.querySelector('#card-row button').click();document.querySelectorAll('#card-row button')[1].click();
      check('one card on double click',Object.values(player.cardStacks).reduce((a,b)=>a+b,0)===1);
      return checks;
    });
    await page.waitForFunction(()=>pendingLevelUps===1,null,{polling:50});
    await page.locator('#card-row button').first().click();
    await page.waitForFunction(()=>state.mode==='playing'&&pendingLevelUps===0,null,{polling:50});
    await page.evaluate(()=>{startRun();pendingLevelUps=1;showLevelUpModal();});
    await page.locator('#card-row img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode().catch(()=>{}))));
    fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
    await page.screenshot({path:path.join(root,'test-results/cards-desktop.png'),animations:'disabled'});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:path.join(root,'test-results/cards-mobile.png'),animations:'disabled'});
    const bounds=await page.locator('#card-row button').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right};}));
    assert(bounds.every(r=>r.x>=0&&r.right<=390),'mobile cards inside viewport');
    await page.evaluate(()=>{
      startRun();enemies=[];spawnBoss();const b=state.boss;b.x=player.x+200;b.y=player.y;b.aiState='idle';b.aiTime=0;
      player.invuln=999;for(let i=0;i<600;i++)updateBossAI(b,1/60);
      if(b.patternIndex===0)throw new Error('mobile boss failed to approach and attack');
      const box=document.querySelector('.basic-attack-hud').getBoundingClientRect();
      if(box.y<0||box.bottom>innerHeight)throw new Error('basic cooldown outside viewport');
    });
    await page.setViewportSize({width:1280,height:800});
    await page.evaluate(()=>{startRun();enemies=[];spawnBoss();state.boss.x=player.x+150;state.boss.y=player.y-50;startBossPattern(state.boss);state.camera.x=player.x-canvas.width/2;state.camera.y=player.y-canvas.height/2;render();updateHud();});
    await page.screenshot({path:path.join(root,'test-results/boss-desktop.png')});
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({passed:report.length+4,checks:report,pageErrors:errors},null,2));
  } finally { if(browser)await browser.close();server.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
