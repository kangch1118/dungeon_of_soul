const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'image/monsters_ready_20260914');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8').replace(/^\uFEFF/, ''));
let total = 0;
for (const monster of Object.values(manifest.monsters)) {
  for (const anim of Object.values(monster.animations)) {
    total += anim.count;
    for (const [file, width] of [...anim.frames.map(p => [p, 256]), [anim.strip, anim.count * 256], [anim.compatibilityStrip, 1024]]) {
      const png = fs.readFileSync(path.join(dir, file));
      if (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== 256 || png[25] !== 6) throw Error('Invalid RGBA sprite: ' + file);
    }
  }
}
const names = {walk:'이동',idle:'대기',attack:'공격',attack_alt:'추가 공격',special:'특수 공격',hit:'피격',death:'사망',directions:'방향별 모습',bag:'자루 공격',charge:'돌진',bone:'뼈 투척',treasure:'보물 소환',impact:'타격 효과',portraits:'표정'};
fs.writeFileSync(path.join(dir, 'preview.html'), `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>몬스터 애니메이션 미리보기</title><style>body{margin:32px;background:#101522;color:#eee;font:16px system-ui}h1{font-size:26px}header{position:sticky;top:0;background:#101522ed;padding:12px;z-index:1}section{margin:28px 0}.grid{display:flex;flex-wrap:wrap;gap:12px}article{background:#222b3d;border:1px solid #46516c;border-radius:12px;padding:12px}canvas{width:192px;height:192px;image-rendering:pixelated;background:repeating-conic-gradient(#455366 0% 25%,#354255 0% 50%) 0/24px 24px}a{color:#bca5ff}button,input{margin:8px}</style><header><h1>몬스터 애니메이션 미리보기</h1><p>256 × 256 · 투명 PNG · ${total}개 프레임 · 발 기준선 232px</p><button id="pause">일시정지</button><label>재생 속도 <input id="speed" type="range" min="1" max="15" value="8"> <span id="fps">8</span> FPS</label><button id="background">배경 변경</button></header><main></main><script>
const manifest=${JSON.stringify(manifest)}, names=${JSON.stringify(names)}, items=[];let paused=false,clock=0,last=performance.now();
for(const [id,m] of Object.entries(manifest.monsters)){const section=document.createElement('section');section.innerHTML='<h2>'+m.name+'</h2><div class="grid"></div>';document.querySelector('main').append(section);for(const [key,a] of Object.entries(m.animations)){const article=document.createElement('article');article.innerHTML='<h3>'+names[key]+' · '+a.count+'장</h3><canvas width="256" height="256"></canvas><p><a href="'+a.strip+'">전체 시트</a> · <a href="'+a.compatibilityStrip+'">게임용 4프레임</a></p>';section.lastChild.append(article);const img=new Image();img.src=a.strip;items.push({ctx:article.querySelector('canvas').getContext('2d'),img,count:a.count});}}
document.querySelector('#pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'재생':'일시정지'};document.querySelector('#speed').oninput=e=>document.querySelector('#fps').textContent=e.target.value;let bg=0;document.querySelector('#background').onclick=()=>{bg=(bg+1)%3;for(const c of document.querySelectorAll('canvas'))c.style.background=bg===1?'#fafafa':bg===2?'#090b10':''};
function tick(now){if(!paused)clock+=(now-last)/1000;last=now;const fps=+document.querySelector('#speed').value;for(const item of items){const c=item.ctx;c.clearRect(0,0,256,256);c.imageSmoothingEnabled=false;if(item.img.complete&&item.img.naturalWidth)c.drawImage(item.img,Math.floor(clock*fps)%item.count*256,0,256,256,0,0,256,256)}requestAnimationFrame(tick)}requestAnimationFrame(tick);
</script></html>`);
fs.writeFileSync(path.join(dir, 'README.md'), `# 몬스터 에셋 사용 안내\n\n7개 원본 시트에서 추출한 6종 몬스터와 탐관오리 추가 공격입니다.\n\n- 개별 프레임: 256×256 투명 PNG, 발 기준선 y=232, 픽셀 보존 배율 조정.\n- *_strip_all_256.png: 선택한 동작의 모든 프레임을 원본 순서대로 연결. 프레임 수는 manifest.json 참조.\n- *_strip_256.png: 기존 게임과 호환되는 4프레임 가로 시트(1024×256).\n- preview.html: 브라우저에서 열어 재생·정지·속도 조절·흰색/검정 배경 확인.\n- manifest.json: 전체 경로, 프레임 수, 배율, 4프레임 선택 인덱스(0부터).\n\n새 6종의 이동·공격은 data.js의 MONSTER_TYPES에 등록되어 있습니다. spawnNormalEnemy('demon_archer')처럼 기존 생성 함수를 사용할 수 있습니다. 스테이지별 자동 등장 목록은 기존 설정을 유지합니다. 피격·사망·특수공격 시트는 자산으로 제공하며 해당 동작의 게임 로직은 별도 연결이 필요합니다.\n\n원본 PNG는 보존했습니다. 내장 이미지 편집 도구로 배경 제거를 시도했으나 일부 결과에 체크무늬가 남고 그림이 변형되어, 최종 프레임은 원본 영역을 기준으로 알파 정리 및 절단했습니다. 편집 요청: 배경·글자·테두리 제거, 모든 스프라이트 위치·크기·색상·포즈 보존, 투명 PNG 출력.\n\n재생성: Windows PowerShell에서 tools/prepare_import_monsters.ps1 실행 후 node tools/build_monster_preview.cjs 실행.\n\n총 개별 프레임: ${total}장.\n`);
console.log('Validated RGBA dimensions and paths: '+total+' frames. Preview created.');
