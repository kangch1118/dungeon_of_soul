'use strict';

/* =========================================================================
   던전 오브 소울 — 로그라이크 프로토타입
   기획서(로크라이크 게임.txt) 기반:
   - 일반 공세 95~140초 + 보스전 → 골드/영혼 획득 → 캐릭터 레벨업
   - 방향키 이동 + 오토에이밍 공격
   - 레벨업 시 3장의 카드 중 1장 선택(액티브/패시브)
   - 스테이지 보스를 잡으면 다음 스테이지로 진행
   ========================================================================= */

/* -------------------------------------------------------------------------
   0. 공통 유틸 / 화면 전환
   ------------------------------------------------------------------------- */

const screens = {
  title: document.getElementById('screen-title'),
  lobby: document.getElementById('screen-lobby'),
  option: document.getElementById('screen-option'),
  game: document.getElementById('screen-game'),
};

let optionReturnTo = 'title'; // 옵션을 어디서 열었는지(타이틀 / 일시정지)

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function pick(arr) { return arr[randInt(0, arr.length - 1)]; }

/* -------------------------------------------------------------------------
   1. 옵션
   ------------------------------------------------------------------------- */

const options = {
  bgm: 50,
  sfx: 70,
  difficulty: 'normal',
  showFps: false,
  scaleHud: 100,
  scaleBasic: 100,
  scaleHotbar: 100,
};

const optBgm = document.getElementById('opt-bgm');
const optSfx = document.getElementById('opt-sfx');
const optBgmVal = document.getElementById('opt-bgm-val');
const optSfxVal = document.getElementById('opt-sfx-val');
const optDifficulty = document.getElementById('opt-difficulty');
const optShowFps = document.getElementById('opt-showfps');

optBgm.addEventListener('input', () => { options.bgm = +optBgm.value; optBgmVal.textContent = optBgm.value; });
optSfx.addEventListener('input', () => { options.sfx = +optSfx.value; optSfxVal.textContent = optSfx.value; });
optDifficulty.addEventListener('change', () => { options.difficulty = optDifficulty.value; });
optShowFps.addEventListener('change', () => {
  options.showFps = optShowFps.checked;
  document.getElementById('hud-fps').style.display = options.showFps ? 'block' : 'none';
});

// 체력/기본공격/스킬 바 UI 크기 슬라이더 — 각각 CSS 변수로 넘겨서 transform:scale()로 적용한다
// (.hud-top-left / #hud .basic-attack-hud / #hud .hotbar, style.css 맨 아래 참고).
const UI_SCALE_SLIDERS = [
  { key: 'scaleHud', cssVar: '--ui-hud-scale', input: document.getElementById('opt-scale-hud'), val: document.getElementById('opt-scale-hud-val') },
  { key: 'scaleBasic', cssVar: '--ui-basic-scale', input: document.getElementById('opt-scale-basic'), val: document.getElementById('opt-scale-basic-val') },
  { key: 'scaleHotbar', cssVar: '--ui-hotbar-scale', input: document.getElementById('opt-scale-hotbar'), val: document.getElementById('opt-scale-hotbar-val') },
];
function applyUiScale(entry) {
  document.documentElement.style.setProperty(entry.cssVar, options[entry.key] / 100);
  entry.val.textContent = options[entry.key] + '%';
}
for (const entry of UI_SCALE_SLIDERS) {
  entry.input.addEventListener('input', () => {
    options[entry.key] = +entry.input.value;
    applyUiScale(entry);
  });
}

const DIFFICULTY_SCALE = { easy: 0.75, normal: 1, hard: 1.4 };

document.getElementById('btn-option').addEventListener('click', () => {
  optionReturnTo = 'title';
  showScreen('option');
});
document.getElementById('btn-pause-option').addEventListener('click', () => {
  optionReturnTo = 'pause';
  state.mode = 'options';
  clearInput();
  showScreen('option');
});
document.getElementById('btn-option-close').addEventListener('click', () => {
  if (optionReturnTo === 'pause') {
    state.mode = 'paused';
    showScreen('game');
    document.getElementById('pause-modal').classList.remove('hidden');
  } else {
    showScreen('title');
  }
});

/* -------------------------------------------------------------------------
   2. 캔버스 세팅
   ------------------------------------------------------------------------- */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let vignetteGradient = null; // 리사이즈할 때만 다시 만든다 (매 프레임 생성하면 비용이 큼)
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  vignetteGradient = null;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const WORLD_W = 2600;
const WORLD_H = 2600;
// 플레이어가 못 따라잡으면 몬스터가 무한정 쌓여서 렉으로 이어질 수 있어 안전장치로 상한을 둔다.
const MAX_LIVE_ENEMIES = 55;

/* -------------------------------------------------------------------------
   3. 입력
   ------------------------------------------------------------------------- */

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;

  if (e.key === 'Escape' && !e.repeat) { e.preventDefault(); togglePause(); }

  if (state.mode === 'playing' && !e.repeat) {
    if (e.key.toLowerCase() === 'q') useSkill('Q');
    if (e.key.toLowerCase() === 'w') useSkill('W');
    if (e.key.toLowerCase() === 'e') useSkill('E');
    if (e.key.toLowerCase() === 'r') useSkill('R');
  }

  if (state.mode === 'levelup' && !e.repeat && ['1','2','3'].includes(e.key)) {
    const card = cardRow.children[Number(e.key) - 1];
    if (card && !card.disabled) card.click();
  }
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
function clearInput() { for (const key in keys) delete keys[key]; if(typeof resetTouchControls === 'function')resetTouchControls(); }
window.addEventListener('blur', () => { clearInput(); if (state.mode === 'playing' && !player.dying) togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); if (state.mode === 'playing' && !player.dying) togglePause(); } });
function setPlayerDirection(x, y) {
  player.facing = { x, y };
  if (Math.abs(y) > Math.abs(x)) { player.animDir = y < 0 ? 'up' : 'down'; player.animFlip = false; }
  else { player.animDir = 'side'; player.animFlip = x < 0; }
}

// 이동은 방향키 전용이다 (WASD를 쓰면 W/E 스킬 단축키와 겹치므로 의도적으로 뺐다).
function moveVector() {
  let dx = 0, dy = 0;
  if (keys['arrowleft']) dx -= 1;
  if (keys['arrowright']) dx += 1;
  if (keys['arrowup']) dy -= 1;
  if (keys['arrowdown']) dy += 1;
  if (dx !== 0 && dy !== 0) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }
  dx += touchMove.x; dy += touchMove.y;
  const length = Math.hypot(dx,dy);
  if(length>1){dx/=length;dy/=length;}
  return { dx, dy };
}

/* -------------------------------------------------------------------------
   4. 스킬 카드 풀 (패시브 / 액티브 QWER)
   ------------------------------------------------------------------------- */

const SKILL_POOL = [
  {
    id: 'atk', name: '검격 강화', icon: '⚔️', tag: '패시브',
    desc: '공격력이 20% 증가합니다.',
    apply(p) { p.atk *= 1.2; },
  },
  {
    id: 'aspd', name: '신속', icon: '💨', tag: '패시브',
    desc: '기본공격 대기시간이 15% 감소합니다. (최소 0.12초)',
    apply(p) { p.atkInterval = Math.max(.12, p.atkInterval * .85); },
  },
  {
    id: 'mspd', name: '질주', icon: '🥾', tag: '패시브',
    desc: '이동속도가 12% 증가합니다.',
    apply(p) { p.speed *= 1.12; },
  },
  {
    id: 'hp', name: '활력', icon: '❤️', tag: '패시브',
    desc: '최대 체력이 25 증가하고 즉시 모두 회복합니다.',
    apply(p) { p.maxHp += 25; p.hp = p.maxHp; },
  },
  {
    id: 'pierce', name: '관통의 기술', icon: '➵', tag: '패시브',
    desc: '마력탄과 도적 Q 표창이 적을 1회 더 관통합니다.',
    apply(p) { p.pierce += 1; },
  },
  {
    id: 'multishot', name: '다중 사격', icon: '🏹', tag: '패시브',
    desc: '마력탄과 도적 Q 표창의 발사 개수가 1개 증가합니다.',
    apply(p) { p.projectileCount += 1; },
  },
  {
    id: 'crit', name: '치명의 감각', icon: '🎯', tag: '패시브',
    desc: '치명타 확률이 10% 증가합니다.',
    apply(p) { p.critChance = clamp(p.critChance + 0.1, 0, 0.95); },
  },
  {
    id: 'critdmg', name: '치명의 일격', icon: '💥', tag: '패시브',
    desc: '치명타 피해량이 30% 증가합니다.',
    apply(p) { p.critMult += 0.3; },
  },
  {
    id: 'regen', name: '재생', icon: '♻️', tag: '패시브',
    desc: '초당 체력을 1.5 회복합니다. (중첩)',
    apply(p) { p.regen += 1.5; },
  },
  {
    id: 'goldup', name: '골드의 축복', icon: '🪙', tag: '패시브',
    desc: '골드 획득량이 25% 증가합니다.',
    apply(p) { p.goldMult += 0.25; },
  },
  {
    id: 'soulup', name: '영혼의 인도', icon: '🔮', tag: '패시브',
    desc: '영혼 획득량이 30% 증가합니다.',
    apply(p) { p.soulMult += 0.3; },
  },
  {
    id: 'skillR', name: '낙뢰 강타', icon: '⚡', tag: '액티브 R (탐험 한정)',
    desc: '가장 가까운 적에게 강력한 낙뢰를 내려칩니다. (재사용 10초)',
    apply(p) {
      if (!p.skills.R) {
        p.skills.R = { id: 'skillR', cd: 0, cdMax: 10, dmgMult: 4.0, radius: 90, name: '낙뢰 강타', icon: '⚡', desc: this.desc, vfx: 'r_lightning_bolt', vfxAnim: 'r_lightning_spark' };
      } else {
        p.skills.R.dmgMult += 1.2;
        p.skills.R.cdMax = Math.max(5, p.skills.R.cdMax - 0.5);
        p.skills.R.desc = `가장 가까운 적 주변에 낙뢰를 내립니다. (재사용 ${p.skills.R.cdMax}초, 피해 ${p.skills.R.dmgMult.toFixed(1)}배)`;
      }
    },
  },
];

SKILL_POOL.push(
  { id: 'armor', name: '강철 피부', icon: '🛡️', tag: '패시브', desc: '방어력이 8 증가합니다.', apply(p) { p.def += 8; } },
  { id: 'lifesteal', name: '붉은 계약', icon: '🩸', tag: '패시브', desc: '직접 공격 피해의 2%만큼 체력을 흡수합니다.', apply(p) { p.lifesteal += .02; } },
  { id: 'magnet', name: '보물 자석', icon: '🧲', tag: '패시브', desc: '전리품 수집 범위가 50 증가합니다.', apply(p) { p.pickupBonus = (p.pickupBonus || 0) + 50; } },
  { id: 'wisdom', name: '깨달음', icon: '📖', tag: '패시브', desc: '전투 경험치 획득량이 20% 증가합니다.', apply(p) { p.expBonus = (p.expBonus || 0) + .2; } },
  { id: 'haste', name: '시간의 모래', icon: '⌛', tag: '패시브', desc: 'QWER 스킬 쿨타임 회복 속도가 12% 증가합니다.', apply(p) { p.cooldownBonus = (p.cooldownBonus || 0) + .12; } },
  { id: 'secondwind', name: '불굴의 숨결', icon: '💚', tag: '패시브', desc: '체력 30% 이하일 때 최대 체력의 25%를 회복합니다. 재사용 30초.', apply(p) { p.secondWind = true; p.secondWindCd = 0; } }
);
const CARD_LIMITS = { atk: 6, aspd: 6, mspd: 4, hp: 8, pierce: 3, multishot: 3, crit: 5, critdmg: 5, regen: 5, goldup: 4, soulup: 4, skillR: 6, armor: 5, lifesteal: 4, magnet: 4, wisdom: 4, haste: 4, secondwind: 1 };
function cardImagePath(id) {
  return `image/${['atk','aspd','hp'].includes(id) ? 'levelup_design_20260912' : 'levelup_expansion_20260912'}/icon_${id}.png`;
}
function availableCards(p) {
  return SKILL_POOL.filter(c => {
    if ((p.cardStacks?.[c.id] || 0) >= CARD_LIMITS[c.id]) return false;
    if (['pierce','multishot'].includes(c.id) && !['projectile','fast_stab'].includes(p.basicAttack.type)) return false;
    return true;
  });
}
// 전투 시작 후 첫 레벨업 전에 아이콘을 받아 카드 선택 화면의 빈 이미지를 줄인다.
const cardArtCache = [];
function preloadCardArt() {
  if (cardArtCache.length) return;
  SKILL_POOL.forEach(card => { const img = new Image(); img.src = cardImagePath(card.id); cardArtCache.push(img); });
}

// Q(직업 강공격) / W(장비스킬1) / E(직업스킬)는 카드가 아니라
// 캐릭터탭의 전직·장비탭의 장착 상태(meta.js)에서 곧바로 정해진다.
// 레벨업 카드는 패시브 능력치 + 탐험 한정 액티브(R) 만을 제공한다.

/* -------------------------------------------------------------------------
   5. 게임 상태
   ------------------------------------------------------------------------- */

const state = {
  mode: 'idle', // idle | playing | paused | levelup | stageclear | gameover
  stage: 1,
  killCount: 0,
  killTarget: 15,
  bossActive: false,
  boss: null,
  stageGoldEarned: 0,
  stageSoulEarned: 0,
  camera: { x: 0, y: 0 },
};

let player, enemies, projectiles, pickups, floatTexts, particles, groundEffects, vfxAnims;

function newPlayer() {
  // 캐릭터탭(전직/외형) · 장비탭(장착 무기) · 펫탭(장착 펫)에서 정해진
  // 로비 진행도를 그대로 이번 런의 초기 스탯/스킬로 사용한다.
  const cs = getComputedStats();
  const jobNode = getJobSkills();
  const weaponSkill = getWeaponSkill();
  const petDef = getEquippedPetDef();
  const classKit = CLASS_KITS[meta.appearance] || CLASS_KITS.mage;
  const shieldMax = classKit.shieldMaxPct ? Math.round(cs.hp * classKit.shieldMaxPct) : 0;

  const p = {
    x: WORLD_W / 2, y: WORLD_H / 2,
    radius: 16,
    facing: { x: 0, y: 1 },
    speed: cs.speed,
    hp: cs.hp, maxHp: cs.hp,
    shield: shieldMax, shieldMax,
    shieldRegenDelay: classKit.shieldRegenDelay || 0,
    shieldRegenPerSec: classKit.shieldRegenPerSec || 0,
    timeSinceDamage: 999,
    slowTimer: 0,
    level: 1, exp: 0, expToNext: 20,
    gold: 0, soul: 0,
    goldMult: cs.goldMult, soulMult: cs.soulMult,
    atk: cs.atk,
    basicAttack: classKit.basicAttack,
    atkInterval: classKit.basicAttack.interval, atkTimer: 0, atkRange: classKit.basicAttack.range,
    projectileCount: 1, pierce: 0,
    critChance: cs.critChance, critMult: cs.critMult,
    def: cs.def, dmgReductionChance: cs.dmgReductionChance, dmgReductionAmount: cs.dmgReductionAmount,
    lifesteal: cs.lifesteal,
    regen: 0,
    invuln: 0,
    hitFlash: 0,
    skills: { Q: null, W: null, E: null, R: null },
    summon: null,
    buffAtkSpeed: 0, buffMoveSpeed: 0, buffTimer: 0,
    pet: petDef ? { def: petDef, timer: petDef.interval || 0 } : null,
    // 걷기/공격 모션 상태
    animDir: 'down', animFlip: false, animFrame: 0, animTimer: 0,
    moving: false, attackLunge: 0, facing: { x: 1, y: 0 },
    // idle/walk/attack/hit/death 스프라이트 상태머신
    animState: 'idle', attackAnimTimer: 0, attackAnimDur: 0,
    hitAnimTimer: 0, dying: false, deathAnimTimer: 0,
  };

  // Q: 클래스(외형) 고유 스킬 — 견습 모험가부터 항상 보유, 전직과 무관
  const q = classKit.qSkill;
  p.skills.Q = {
    id: q.id, cd: 0, cdMax: q.cdMax, dmgMult: q.dmgMult,
    name: q.name, icon: q.icon, iconImg: ICON_IMAGES.classQ[q.id], desc: q.desc,
    // 스킬별 고유 파라미터도 그대로 실어둔다 (useClassSkillQ 에서 읽어 씀)
    range: q.range, width: q.width, speed: q.speed,
    splashMult: q.splashMult, splashRadius: q.splashRadius,
    burnDps: q.burnDps, burnRadius: q.burnRadius, burnDur: q.burnDur,
    count: q.count, coneDeg: q.coneDeg, pierce: q.pierce,
    dur: q.dur, extraHits: q.extraHits, healPerSec: q.healPerSec,
    vfx: q.vfx, vfxAnim: q.vfxAnim, groundVfxAnim: q.groundVfxAnim,
  };

  // W: 장비스킬1 (무기에 액티브 스킬이 있을 때만)
  if (weaponSkill) {
    p.skills.W = {
      id: 'weaponW', cd: 0, cdMax: weaponSkill.cdMax, dmgMult: weaponSkill.dmgMult,
      name: weaponSkill.name, icon: weaponSkill.icon, iconImg: ICON_IMAGES.equipment[meta.equippedWeapon], desc: weaponSkill.desc, radius: weaponSkill.radius || 150,
      vfx: weaponSkill.vfx, groundVfx: weaponSkill.groundVfx, effect: weaponSkill.effect,
    };
  }

  // E: 직업 스킬 (전직했을 때만)
  if (jobNode.eSkill) {
    const e = jobNode.eSkill;
    p.skills.E = {
      id: 'jobE', cd: 0, cdMax: e.cdMax, dmgMult: e.dmgMult, shots: e.shots,
      name: e.name, icon: e.icon, iconImg: ICON_IMAGES.job[jobNode.id + '_E'], desc: e.desc, radius: e.radius || 150,
      vfx: e.vfx, vfxAnim: e.vfxAnim, vfxBurst: e.vfxBurst, effect: e.effect,
    };
  }

  configureAdvancement(p);
  return p;
}

const goblinImg = new Image();
goblinImg.src = 'go.png';

// 몬스터/보스 스프라이트 미리 로드
const monsterImages = {};
for (const key in MONSTER_TYPES) {
  const w = new Image(); w.src = MONSTER_TYPES[key].walk;
  const a = new Image(); a.src = MONSTER_TYPES[key].attack;
  monsterImages[key] = { walk: w, attack: a };
}
const bossImages = {};
function ensureBossArt(def){if(!bossImages[def.file]){const img=new Image();img.src=def.file;bossImages[def.file]=img;}}

// 스테이지 배경(바닥/벽) 타일 미리 로드 + 캔버스 패턴 캐시
const bgTileImages = {};
[...STAGE_FLOOR_TILES, ...Object.values(STAGE_WALL_TILES)].forEach(src => {
  const img = new Image();
  img.src = src;
  bgTileImages[src] = img;
});
const bgPatternCache = {};

function getBgPattern(src) {
  const img = bgTileImages[src];
  if (!img || !img.complete || img.naturalWidth === 0) return null;
  if (!bgPatternCache[src]) bgPatternCache[src] = ctx.createPattern(img, 'repeat');
  return bgPatternCache[src];
}

// 펫 아이콘(전투 중 캔버스에 그리는 미니 아이콘) 미리 로드
const petIconImages = {};
Object.entries(ICON_IMAGES.pet).forEach(([id, src]) => {
  const img = new Image();
  img.src = src;
  petIconImages[id] = img;
});

// 전투 이펙트(VFX) 미리 로드 — 정지 이미지(vfxImages)와 연속 프레임(vfxAnimImages)
const vfxImages = {};
Object.entries(VFX).forEach(([key, src]) => {
  const img = new Image();
  img.src = src;
  vfxImages[key] = img;
});
const vfxAnimImages = {};
Object.entries(VFX_ANIM).forEach(([key, srcs]) => {
  vfxAnimImages[key] = srcs.map(src => { const img = new Image(); img.src = src; return img; });
});

// 각 몬스터 스프라이트의 실제 불투명 픽셀 상/하단 위치(0~1)를 측정한다.
// - top: 체력바를 겹치지 않게 띄우는 데 사용
// - bottom: 셀 하단에 투명 여백이 있으면(발밑에 빈 공간) 그림자보다 캐릭터가 위에 붕 떠 보이므로,
//   실제 "발"이 그림자 위치에 오도록 그리는 y좌표를 보정하는 데 사용
const monsterOpaqueTop = {};
const monsterOpaqueBottom = {};
function measureMonsterExtent(key, img) {
  try {
    const c = document.createElement('canvas');
    c.width = MONSTER_FRAME; c.height = MONSTER_FRAME;
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0, MONSTER_FRAME, MONSTER_FRAME, 0, 0, MONSTER_FRAME, MONSTER_FRAME);
    const d = cx.getImageData(0, 0, MONSTER_FRAME, MONSTER_FRAME).data;
    let top = null, bottom = null;
    outerTop:
    for (let y = 0; y < MONSTER_FRAME; y++) {
      for (let x = 0; x < MONSTER_FRAME; x++) {
        if (d[(y * MONSTER_FRAME + x) * 4 + 3] > 24) { top = y; break outerTop; }
      }
    }
    outerBottom:
    for (let y = MONSTER_FRAME - 1; y >= 0; y--) {
      for (let x = 0; x < MONSTER_FRAME; x++) {
        if (d[(y * MONSTER_FRAME + x) * 4 + 3] > 24) { bottom = y; break outerBottom; }
      }
    }
    monsterOpaqueTop[key] = top !== null ? top / MONSTER_FRAME : 0.12;
    monsterOpaqueBottom[key] = bottom !== null ? (bottom + 1) / MONSTER_FRAME : 0.92;
  } catch (e) {
    monsterOpaqueTop[key] = 0.12;
    monsterOpaqueBottom[key] = 0.92;
  }
}
for (const key in monsterImages) {
  const w = monsterImages[key].walk;
  if (w.complete && w.naturalWidth > 0) measureMonsterExtent(key, w);
  else w.addEventListener('load', () => measureMonsterExtent(key, w));
}

// 캐릭터탭에서 고른 외형(ch.png에서 뽑아낸 걷기 스프라이트) 4종 미리 로드.
// 각 아틀라스는 가로 6프레임(down0,down1,side0,side1,up0,up1) x 110x150.
const appearanceImages = {};
const playerSpriteImages = {};
APPEARANCE_POOL.forEach(a => {
  const img = new Image();
  img.src = a.file;
  appearanceImages[a.id] = img;
  if (a.sprite) {
    const hero = new Image();
    hero.src = a.sprite;
    playerSpriteImages[a.id] = hero;
  }
});
const ANIM_DIR_COL = { down: 0, side: 2, up: 4 }; // 프레임 인덱스(0/1)에 더해질 방향 오프셋

// 플레이어 모션 스프라이트(idle/walk/attack/hit/death x down/side/up) 미리 로드
const playerAnimImages = {};
function ensurePlayerArt(classId) {
  if(playerAnimImages[classId])return;
  const a=APPEARANCE_POOL.find(a=>a.id===classId);
  if(!a)return;
  const perState = {};
  for (const st in PLAYER_ANIM_FRAMES) {
    const perDir = {};
    for (const dir of PLAYER_ANIM_DIRS) {
      const img = new Image();
      img.src = playerAnimPath(a.id, st, dir);
      perDir[dir] = img;
    }
    perState[st] = perDir;
  }
  playerAnimImages[a.id] = perState;
}

/* -------------------------------------------------------------------------
   6. 스테이지 / 스폰 로직
   ------------------------------------------------------------------------- */

let spawnTimer = 0;

function stageDifficultyMult() {
  return DIFFICULTY_SCALE[options.difficulty] * (1 + (state.stage - 1) * 0.22);
}

function startRun() {
  ensurePlayerArt(meta.appearance);
  clearInput();
  [stageClearModal, gameoverModal, pauseModal, controlsModal].forEach(el => el.classList.add('hidden'));
  preloadCardArt();
  pendingLevelUps = 0;
  levelupModal.classList.add('hidden');
  player = newPlayer();
  enemies = [];
  projectiles = [];
  pickups = [];
  floatTexts = [];
  particles = [];
  groundEffects = [];
  vfxAnims = [];
  state.stage = 1;
  state.mode = 'playing';
  startStage();
  showScreen('game');
}

function startStage() {
  if(player.adv){player.adv.fx=[];player.adv.allies=[];player.adv.wall=0;}
  ensureBossArt(bossTierForStage(state.stage));
  state.stageSettled = false;
  combatFeedback.sparks=[];combatFeedback.pause=0;combatFeedback.shake=0;
  player.pendingShots = null;
  player.activeDash = null;
  player.pendingBasicAttackDelay = null;
  enemies = []; pickups = []; projectiles = []; groundEffects = [];
  particles = []; floatTexts = []; vfxAnims = [];
  playBgm('stage');
  state.killCount = 0;
  state.killTarget = 40 + state.stage * 6;
  state.stageElapsed = 0;
  state.stageDuration = Math.min(140, 85 + state.stage * 10);
  state.nextWaveAt = 24;
  state.waveNotice = 0;
  resetBossCombat();
  state.bossActive = false;
  state.boss = null;
  state.stageGoldEarned = 0;
  state.stageSoulEarned = 0;
  spawnTimer = 0;
  document.getElementById('hud-stage').textContent = state.stage;
  document.getElementById('hud-boss').classList.remove('show');
  updateHudPortrait();
}

function spawnNormalEnemy(forcedType, position) {
  if (enemies.length >= MAX_LIVE_ENEMIES) return null;
  const mult = stageDifficultyMult();
  const isElite = state.stage >= 3 && Math.random() < 0.14;

  // 화면 밖 랜덤 위치(플레이어 주변 링 형태)에서 스폰
  const angle = rand(0, Math.PI * 2);
  const spawnDist = rand(520, 700);
  let x = clamp(player.x + Math.cos(angle) * spawnDist, 20, WORLD_W - 20);
  let y = clamp(player.y + Math.sin(angle) * spawnDist, 20, WORLD_H - 20);

  const monsterType = forcedType || pick(stageMonsterPool(state.stage, state.stageElapsed / state.stageDuration));
  const e = {
    x: position ? position.x : x, y: position ? position.y : y,
    radius: monsterType === 'tree' ? 31 : isElite ? 24 : 18,
    renderSize: monsterType === 'tree' ? 172 : undefined,
    speed: rand(monsterType === 'tree' ? 55 : monsterType === 'bat' ? 135 : 70, monsterType === 'tree' ? 75 : monsterType === 'bat' ? 165 : 110) * (isElite ? 0.9 : 1) * (1 + Math.min(10,state.stage - 1) * 0.02),
    hp: (isElite ? 70 : monsterType === 'tree' ? 30 : 22) * mult,
    maxHp: (isElite ? 70 : monsterType === 'tree' ? 30 : 22) * mult,
    dmg: (isElite ? 14 : monsterType === 'tree' ? 4 : 8) * mult,
    isElite,
    isBoss: false,
    hitCooldown: 0,
    flash: 0,
    monsterType,
    hopTime: rand(0,.65), height: 0,
    animFrame: randInt(0, MONSTER_FRAMES - 1),
    animTimer: rand(0, 0.12),
    attackAnim: 0,
    facing: 1,
  };
  enemies.push(e);
  return e;
}

function spawnBoss() {
  const mult = stageDifficultyMult();
  const angle = rand(0, Math.PI * 2);
  const x = clamp(player.x + Math.cos(angle) * 560, 60, WORLD_W - 60);
  const y = clamp(player.y + Math.sin(angle) * 560, 60, WORLD_H - 60);

  const tierIdx = Math.min(BOSS_TIERS.length - 1, Math.floor((state.stage - 1) / 2));
  playBgm(tierIdx <= 1 ? 'boss1' : 'boss2');
  const tier = bossTierForStage(state.stage);
  ensureBossArt(tier);
  state.boss = {
    x, y,
    radius: 70,
    speed: tier.speed,
    hp: 560 * mult * tier.hp,
    maxHp: 560 * mult * tier.hp,
    dmg: 30 * mult,
    isElite: true,
    isBoss: true,
    hitCooldown: 0,
    flash: 0,
    slamTimer: rand(2, 3),
    bossFile: tier.file,
    attackAnim: 0,
    facing: 1,
  };
  initializeBoss(state.boss, tier);
  enemies.push(state.boss);
  state.bossActive = true;
  const hudBoss = document.getElementById('hud-boss');
  hudBoss.classList.add('show');
  document.getElementById('hud-boss-name').textContent = `STAGE ${state.stage} · ${tier.name}`;
}

/* -------------------------------------------------------------------------
   7. 전투 로직
   ------------------------------------------------------------------------- */

function findNearestEnemy(x, y, maxRange) {
  let best = null, bestD = maxRange;
  for (const e of enemies) {
    if (e.dead) continue;
    // 거리는 몸통 표면 기준으로 잰다 — 판정 반지름이 큰 보스(슬라임 왕 등)를 중심까지의
    // 거리로만 재면, 사거리 안에 서 있어도 "닿지 않은" 것으로 취급돼 공격이 아예 안 나간다.
    const d = dist(x, y, e.x, e.y) - (e.radius || 0);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

// 마법사의 기본공격(마력탄) — 가장 가까운 적에게 원거리 투사체를 발사한다.
function fireProjectiles() {
  const target = findNearestEnemy(player.x, player.y, player.atkRange);
  if (!target) { playSfx('whiff'); return; }
  playSfx('mage_basic');
  const baseAngle = Math.atan2(target.y - player.y, target.x - player.x);
  const count = player.projectileCount;
  const spread = 0.16;
  const dmgMult = (player.basicAttack && player.basicAttack.dmgMult) || 1;
  const speed = (player.basicAttack && player.basicAttack.speed) || 620;
  for (let i = 0; i < count; i++) {
    const off = (i - (count - 1) / 2) * spread;
    const angle = baseAngle + off;
    projectiles.push({
      x: player.x, y: player.y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      radius: 6,
      life: 1.1,
      pierceLeft: player.pierce,
      hitSet: new Set(),
      dmgMult, kind: 'bolt',
    });
  }
  player.facing = { x: Math.cos(baseAngle), y: Math.sin(baseAngle) };
}

// 전사의 기본공격(대검) — 느리지만 전방 부채꼴 범위를 베는 근접 공격.
function meleeArcAttack(cfg) {
  const target = findNearestEnemy(player.x, player.y, cfg.range);
  if (!target) { playSfx('whiff'); return; } // 사거리 내 적이 없으면 헛스윙하지 않는다
  player.warriorHitToggle = !player.warriorHitToggle; // 스윙마다 1타/2타 번갈아 재생
  playSfx(player.warriorHitToggle ? 'warrior_hit1' : 'warrior_hit2');
  const angle = Math.atan2(target.y - player.y, target.x - player.x);
  player.facing = { x: Math.cos(angle), y: Math.sin(angle) };
  const halfArc = (cfg.arcDeg * Math.PI / 180) / 2;

  for (const e of enemies) {
    if (e.dead) continue;
    if (dist(player.x, player.y, e.x, e.y) - e.radius > cfg.range) continue;
    let diff = Math.abs(Math.atan2(e.y - player.y, e.x - player.x) - angle);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    if (diff <= halfArc) {
      const isCrit = Math.random() < player.critChance;
      const dmg = player.atk * cfg.dmgMult * (isCrit ? player.critMult : 1);
      dealDamageToEnemy(e, dmg, isCrit);
    }
  }
  if (cfg.vfx) {
    spawnVfxSwing(player.x, player.y, cfg.vfx, angle, cfg.range * 1.9, 0.22);
  } else {
    particles.push({ x: player.x, y: player.y, vx: 0, vy: 0, life: 0.22, color: 'rgba(232,232,255,0.85)', arc: { angle, spread: halfArc * 2, radius: cfg.range } });
  }
}

// 도적의 기본공격(단검) — 사거리는 짧지만 매우 빠르게 단일 대상을 찌른다.
function fastStabAttack(cfg) {
  const target = findNearestEnemy(player.x, player.y, cfg.range);
  if (!target) { playSfx('whiff'); return; }
  playSfx('rogue_basic');
  const angle = Math.atan2(target.y - player.y, target.x - player.x);
  player.facing = { x: Math.cos(angle), y: Math.sin(angle) };
  const isCrit = Math.random() < player.critChance;
  const dmg = player.atk * cfg.dmgMult * (isCrit ? player.critMult : 1);
  dealDamageToEnemy(target, dmg, isCrit);
  if (cfg.vfx) {
    spawnVfxSwing(player.x, player.y, cfg.vfx, angle, cfg.range * 1.3, 0.14);
  } else {
    particles.push({
      x: player.x + Math.cos(angle) * 18, y: player.y + Math.sin(angle) * 18,
      vx: 0, vy: 0, life: 0.12, color: 'rgba(255,255,255,0.9)',
      arc: { angle, spread: 0.3, radius: cfg.range * 0.65 },
    });
  }
}

// 성직자의 기본공격(성스러운 파동) — 느리지만 주변의 모든 적을 광역 타격.
function holyPulseAttack(cfg) {
  // holy 사운드는 Q스킬(정령 소환) 전용 — 기본공격에선 재생 안 함(사용자 요청)
  for (const e of enemies) {
    if (e.dead) continue;
    if (dist(player.x, player.y, e.x, e.y) - e.radius <= cfg.range) {
      const isCrit = Math.random() < player.critChance;
      const dmg = player.atk * cfg.dmgMult * (isCrit ? player.critMult : 1);
      dealDamageToEnemy(e, dmg, isCrit);
    }
  }
  spawnRing(player.x, player.y, cfg.range, 'rgba(255,242,184,0.9)', cfg.vfx);
}

// 클래스(외형)에 따라 다른 기본공격을 내보낸다.
function performBasicAttack() {
  if (performAdvancementBasic()) return;
  const cfg = player.basicAttack;
  if (!cfg || cfg.type === 'projectile') return fireProjectiles();
  if (cfg.type === 'melee_arc') return meleeArcAttack(cfg);
  if (cfg.type === 'fast_stab') return fastStabAttack(cfg);
  if (cfg.type === 'holy_pulse') return holyPulseAttack(cfg);
}

function dealDamageToEnemy(e, dmg, isCrit, continuous = false) {
  if (e.dead || player.dying) return;
  dmg *= bossDamageMultiplier(e, player, continuous);
  dmg *= advancementDamageMultiplier();
  e.hp -= dmg;
  if (continuous) { if (e.hp <= 0) killEnemy(e); return; }
  advancementHit(dmg);
  emitHitFeedback(e,isCrit);
  e.flash = 0.12;
  floatTexts.push({
    x: e.x, y: e.y - e.radius, life: 0.6, vy: -40,
    text: (isCrit ? '치명타! ' : '') + Math.round(dmg),
    color: isCrit ? '#ffcf5c' : '#ffffff',
  });
  if (player.lifesteal > 0) {
    player.hp = Math.min(player.maxHp, player.hp + dmg * player.lifesteal);
    // 공격마다 매번 띄우면 너무 정신없어서 살짝 텀을 둔다(짧은 쿨다운)
    if (!player.lifestealVfxCd || player.lifestealVfxCd <= 0) {
      spawnVfxBurst(player.x, player.y, 'passive_lifesteal', 50, 0.4);
      player.lifestealVfxCd = 0.5;
    }
  }
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  advancementKill(e);
  if (e.isBossSummon) {
    if (e.isTotem && state.boss && !state.boss.dead) {
      const b = state.boss;
      if (!e.ritual || !enemies.some(x => !x.dead && x.ritual && x.ownerBossId === b.ownerId)) {
        b.aiState = 'recover'; b.aiTime = 2; b.action = null;
        bossHazards = bossHazards.filter(h => h.ownerId !== b.ownerId);
      }
    }
    return;
  }
  if (e.monsterType === 'slime' || e.monsterType === 'poison_slime') playSfx('slime_die');
  if (e.monsterType === 'poison_slime') {
    makeHazard(e,'poison',{delay:.65,duration:4,radius:62,damage:e.dmg*.5,nextTick:0});
  }
  if (e.monsterType === 'bat') playSfx('bat_die');
  const goldDrop = Math.round((e.isBoss ? rand(60, 90) : e.isElite ? rand(8, 14) : rand(2, 5)) * player.goldMult);
  const expDrop = e.isBoss ? 40 : e.isElite ? 12 : rand(3, 6);
  pickups.push({ type: 'gold', x: e.x, y: e.y, amount: goldDrop, life: 12 });
  pickups.push({ type: 'exp', x: e.x + rand(-10, 10), y: e.y + rand(-10, 10), amount: expDrop, life: 12 });

  if (state.stage >= 3 && (e.isElite || e.isBoss) && Math.random() < (e.isBoss ? 1 : 0.6)) {
    const soulDrop = Math.round((e.isBoss ? rand(3, 5) : rand(1, 2)) * player.soulMult);
    pickups.push({ type: 'soul', x: e.x + rand(-14, 14), y: e.y + rand(-14, 14), amount: soulDrop, life: 12 });
  }

  for (let i = 0; i < 8; i++) {
    particles.push({
      x: e.x, y: e.y,
      vx: rand(-120, 120), vy: rand(-120, 120),
      life: 0.4, color: e.isBoss ? '#d16bff' : '#ffb347',
    });
  }

  if (e.isBoss) {
    cleanBossObjects(e);
    state.bossActive = false;
    document.getElementById('hud-boss').classList.remove('show');
    onStageClear();
  } else {
    state.killCount++;
  }
}

// W(장비스킬1) / E(직업스킬) / R(스테이지 액티브)는 공통 규칙으로 처리한다:
// player.atk * dmgMult 의 피해를
// - shots: 사거리 안의 적에게 게임 시간 기준으로 순차 발사
// - effect: 부채꼴/직선/감속/돌진을 구분하고, 나머지 E는 자기 중심 광역
// - 나머지 W/R: 가장 가까운 적의 위치를 중심으로 범위 피해
// Q(클래스 고유 스킬)는 클래스마다 형태가 완전히 달라서 별도 함수로 분기한다.
// Skill geometry is explicit: cone, line, slow area, moving dash or timed volley.
function useSkill(slot) {
  if (!player || player.dying || state.mode !== 'playing') return;
  if (useAdvancementSkill(slot)) return;
  const s = player.skills[slot];
  if (!s || s.cd > 0) return;
  const target = findNearestEnemy(player.x, player.y, s.shots ? s.radius : 900);
  if (slot !== 'Q' && slot !== 'E' && !target) return;
  if (s.shots && !target) return;
  s.cd = s.cdMax;
  if(slot==='E'||(slot==='W'&&s.effect!=='cone'))feedbackTone('skill');
  player.attackAnimDur = PLAYER_ATTACK_ANIM_DUR;
  player.attackAnimTimer = player.attackAnimDur;
  if (slot === 'Q') { useClassSkillQ(s); setPlayerDirection(player.facing.x, player.facing.y); return; }
  const dmg = player.atk * (s.dmgMult || 1);
  const angle = target ? Math.atan2(target.y-player.y,target.x-player.x) : Math.atan2(player.facing.y,player.facing.x);
  setPlayerDirection(Math.cos(angle), Math.sin(angle));
  if (s.shots) {
    player.pendingShots = { remaining:s.shots, index:0, timer:0, interval:.14, radius:s.radius, dmg, vfx:s.vfx };
    return;
  }
  if (s.effect === 'dash') {
    player.activeDash = { sx:player.x, sy:player.y,
      ex:clamp(player.x+Math.cos(angle)*180,player.radius,WORLD_W-player.radius),
      ey:clamp(player.y+Math.sin(angle)*180,player.radius,WORLD_H-player.radius),
      age:0, duration:.24, width:90, dmg, hits:new Set() };
    spawnVfxSwing(player.x,player.y,s.vfx,angle,180,.3);
    return;
  }
  if (s.effect === 'cone' || s.effect === 'line') {
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const rx=enemy.x-player.x, ry=enemy.y-player.y;
      const forward=rx*Math.cos(angle)+ry*Math.sin(angle);
      const side=Math.abs(rx*Math.sin(angle)-ry*Math.cos(angle));
      const inShape=s.effect==='line'
        ? forward>=0 && forward<=s.radius && side<=24+enemy.radius
        : Math.hypot(rx,ry)<=s.radius+enemy.radius && Math.cos(Math.atan2(ry,rx)-angle)>=Math.cos(Math.PI/3);
      if(inShape)dealDamageToEnemy(enemy,dmg,false);
    }
    spawnVfxSwing(player.x,player.y,s.vfx,angle,s.radius,.3);
    if(s.effect==='cone')playSfx('flame_slash');
    return;
  }
  const center=slot==='E'?player:target;
  for(const enemy of enemies) {
    if(!enemy.dead && dist(center.x,center.y,enemy.x,enemy.y)<=s.radius+enemy.radius) {
      if(s.effect==='slow')enemy.slowTimer=3;
      dealDamageToEnemy(enemy,dmg,false);
    }
  }
  if(s.vfx==='r_lightning_bolt') {
    playSfx('lightning');spawnVfxBurst(center.x,center.y,s.vfx,s.radius*3.2,.3,'bottom');
  } else if(s.vfx==='e_meteor') spawnVfxBurst(center.x,center.y,s.vfx,s.radius*1.6,.3);
  else spawnRing(center.x,center.y,s.radius,'#8fd3ff',s.vfxBurst||s.vfx);
  if(s.vfxAnim)spawnVfxAnim(center.x,center.y,s.vfxAnim,{size:s.radius*2.2,frameDur:.06});
  if(s.groundVfx)groundEffects.push({x:center.x,y:center.y,radius:s.radius,dps:0,life:3,vfxImage:s.groundVfx});
}

function updateTimedAttacks(dt) {
  const volley=player.pendingShots;
  if(volley) {
    volley.timer-=dt;
    while(volley.timer<=0 && volley.remaining>0 && state.mode==='playing' && !player.dying) {
      const targets=enemies.filter(e=>!e.dead && dist(player.x,player.y,e.x,e.y)<=volley.radius)
        .sort((a,b)=>dist(player.x,player.y,a.x,a.y)-dist(player.x,player.y,b.x,b.y));
      if(!targets.length){volley.remaining=0;break;}
      const target=targets[volley.index++ % targets.length];
      dealDamageToEnemy(target,volley.dmg,false);
      spawnVfxBurst(target.x,target.y,volley.vfx,70,.35);
      volley.remaining--;volley.timer+=volley.interval;
    }
    if(!volley.remaining)player.pendingShots=null;
  }
  const dash=player.activeDash;
  if(dash && state.mode==='playing' && !player.dying) {
    const ax=player.x,ay=player.y;
    dash.age+=dt;const t=Math.min(1,dash.age/dash.duration);
    player.x=dash.sx+(dash.ex-dash.sx)*t;player.y=dash.sy+(dash.ey-dash.sy)*t;
    for(const enemy of enemies)if(!enemy.dead&&!dash.hits.has(enemy)&&segmentDistance(enemy.x,enemy.y,ax,ay,player.x,player.y)<=dash.width/2+enemy.radius){
      dash.hits.add(enemy);dealDamageToEnemy(enemy,dash.dmg,false);
    }
    if(t===1){player.activeDash=null;spawnVfxBurst(player.x,player.y,'e_earth_shockwave',120,.3);}
  }
}

function spawnRing(x, y, radius, color, vfxKey) {
  particles.push({ x, y, vx: 0, vy: 0, life: 0.35, color, ring: radius, vfxKey });
}

// 클래스/스킬별 이펙트 스프라이트를 그리는 공통 헬퍼들.
// - spawnVfxBurst: 한 점을 중심으로 커지며 사라지는 방사형 이펙트(폭발/오라 등)
// - spawnVfxSwing: 특정 각도로 뻗어나가는 방향성 이펙트(베기/빔/돌진 잔상 등), player 위치에 앵커
// - spawnVfxAnim: 여러 장짜리 프레임을 순서대로 재생하는 1회성 애니메이션(터짐 등)
function spawnVfxBurst(x, y, vfxKey, size, life, anchor) {
  particles.push({ x, y, vx: 0, vy: 0, life: life || 0.4, vfxBurstKey: vfxKey, vfxBurstMaxLife: life || 0.4, vfxBurstSize: size, vfxBurstAnchor: anchor });
}
function spawnVfxSwing(x, y, vfxKey, angle, length, life) {
  particles.push({ x, y, vx: 0, vy: 0, life: life || 0.25, vfxSwingKey: vfxKey, vfxSwingMaxLife: life || 0.25, vfxSwingAngle: angle, vfxSwingLength: length });
}
function spawnVfxAnim(x, y, animKey, opts) {
  const frames = vfxAnimImages[animKey];
  if (!frames || !frames.length) return;
  const o = opts || {};
  vfxAnims.push({
    x, y, frames, frame: 0, timer: 0,
    frameDur: o.frameDur || 0.05, size: o.size || 140,
  });
}

/* -------------------------------------------------------------------------
   7-1. 클래스(외형) 고유 Q 스킬 — 전사: 일섬 / 마법사: 파이어볼 /
        도적: 표창난사 / 성직자: 정령 소환
   ------------------------------------------------------------------------- */

function useClassSkillQ(s) {
  if (meta.appearance === 'warrior') return qWarriorLineSlash(s);
  if (meta.appearance === 'rogue') return qRogueShurikenCone(s);
  if (meta.appearance === 'cleric') return qClericSummon(s);
  return qMageFireball(s);
}

// 전사 Q: 일섬 — 정면 일직선상의 모든 적을 벤다.
function qWarriorLineSlash(s) {
  playSfx('warrior_hit2'); // 일섬 전용 사운드는 아직 없어서 강한 타격음으로 대체
  const target = findNearestEnemy(player.x, player.y, s.range);
  const angle = target
    ? Math.atan2(target.y - player.y, target.x - player.x)
    : Math.atan2(player.facing.y, player.facing.x);
  player.facing = { x: Math.cos(angle), y: Math.sin(angle) };

  const dx = Math.cos(angle), dy = Math.sin(angle);
  const halfWidth = s.width / 2;
  for (const e of enemies) {
    if (e.dead) continue;
    const relx = e.x - player.x, rely = e.y - player.y;
    const proj = relx * dx + rely * dy; // 진행축으로의 투영 거리
    if (proj < -e.radius || proj > s.range + e.radius) continue;
    const perp = Math.abs(relx * dy - rely * dx); // 진행축에서 수직으로 떨어진 거리
    if (perp <= halfWidth + e.radius) {
      dealDamageToEnemy(e, player.atk * s.dmgMult, false);
    }
  }
  if (s.vfx) {
    spawnVfxSwing(player.x, player.y, s.vfx, angle, s.range, 0.25);
  } else {
    particles.push({
      x: player.x + dx * s.range / 2, y: player.y + dy * s.range / 2,
      vx: 0, vy: 0, life: 0.25, color: 'rgba(207,232,255,0.9)',
      line: { angle, length: s.range, width: halfWidth * 2 },
    });
  }
}

// 마법사 Q: 파이어볼 — 적중 시 폭발, 바닥에 화염 장판을 남긴다.
function qMageFireball(s) {
  playSfx('fire_shoot');
  const target = findNearestEnemy(player.x, player.y, 520);
  const angle = target
    ? Math.atan2(target.y - player.y, target.x - player.x)
    : Math.atan2(player.facing.y, player.facing.x);
  player.facing = { x: Math.cos(angle), y: Math.sin(angle) };

  projectiles.push({
    x: player.x, y: player.y,
    vx: Math.cos(angle) * s.speed, vy: Math.sin(angle) * s.speed,
    radius: 9, life: 1.4, pierceLeft: 0, hitSet: new Set(),
    dmgMult: s.dmgMult, kind: 'fireball',
    explode: {
      splashMult: s.splashMult, splashRadius: s.splashRadius,
      burnDps: s.burnDps, burnRadius: s.burnRadius, burnDur: s.burnDur,
      vfxAnim: s.vfxAnim, groundVfxAnim: s.groundVfxAnim,
    },
  });
}

// 도적 Q: 표창난사 — 전방 원뿔 범위에 수리검을 흩뿌린다.
function qRogueShurikenCone(s) {
  playSfx('shuriken');
  const target = findNearestEnemy(player.x, player.y, 520);
  const baseAngle = target
    ? Math.atan2(target.y - player.y, target.x - player.x)
    : Math.atan2(player.facing.y, player.facing.x);
  player.facing = { x: Math.cos(baseAngle), y: Math.sin(baseAngle) };

  const coneRad = s.coneDeg * Math.PI / 180;
  const count = s.count + player.projectileCount - 1;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : (i / (count - 1)) - 0.5;
    const angle = baseAngle + t * coneRad;
    projectiles.push({
      x: player.x, y: player.y,
      vx: Math.cos(angle) * s.speed, vy: Math.sin(angle) * s.speed,
      radius: 7, life: 1.0, pierceLeft: s.pierce + player.pierce, hitSet: new Set(),
      dmgMult: s.dmgMult, kind: 'shuriken',
    });
  }
}

// 성직자 Q: 정령 소환 — 일정 시간 타수 증가 + 지속 회복.
function qClericSummon(s) {
  playSfx('holy');
  player.summon = { timer: s.dur, extraHits: s.extraHits, healPerSec: s.healPerSec };
  spawnRing(player.x, player.y, 60, 'rgba(201,168,255,0.9)');
}

/* -------------------------------------------------------------------------
   8. 레벨업 / 카드 선택
   ------------------------------------------------------------------------- */

const levelupModal = document.getElementById('levelup-modal');
const cardRow = document.getElementById('card-row');

function gainExp(amount) {
  if (player.dying) return;
  playSfx('exp');
  player.exp += amount * (1 + (player.expBonus || 0));
  while (player.exp >= player.expToNext) {
    player.exp -= player.expToNext;
    player.level++;
    player.expToNext = Math.round(player.expToNext * 1.28 + 6);
    openLevelUpCard();
  }
}

let pendingLevelUps = 0;

function openLevelUpCard() {
  pendingLevelUps++;
  if (state.mode !== 'playing') return; // 클리어 보상 카드는 다음 스테이지 진입 전에 선택
  showLevelUpModal();
}

function showLevelUpModal() {
  clearInput();
  playSfx('card');
  state.mode = 'levelup';
  document.getElementById('levelup-lv').textContent = `Lv.${player.level}`;
  cardRow.innerHTML = '';

  const choices = [];
  const poolCopy = availableCards(player);
  if (!poolCopy.length) poolCopy.push({id:'hp',name:'생명의 선물',icon:'❤️',tag:'회복',desc:'모든 카드를 완성했습니다. 체력을 전부 회복합니다.',apply(p){p.hp=p.maxHp;}});
  while (choices.length < 3 && poolCopy.length > 0) {
    const idx = randInt(0, poolCopy.length - 1);
    choices.push(poolCopy.splice(idx, 1)[0]);
  }

  const artPath = 'image/levelup_design_20260912/';
  let selectionLocked = false;
  choices.forEach((card, index) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'skill-card';
    el.style.setProperty('--card-index', index);
    el.innerHTML = `
      <div class="card-icon"><img class="levelup-halo" src="${artPath}fx_levelup_halo.png" alt=""><img class="levelup-icon" src="${cardImagePath(card.id)}" alt=""></div>
      <div class="card-name">${card.name}</div>
      <div class="card-desc">${card.desc}</div>
      <div class="card-tag">${card.tag} · ${(player.cardStacks?.[card.id] || 0) + 1}/${CARD_LIMITS[card.id] || 1}</div>
      <img class="levelup-burst" src="${artPath}fx_card_select.png" alt="">
    `;
    const iconImage = el.querySelector('.levelup-icon');
    if (iconImage) iconImage.addEventListener('error', () => {
      const fallback = document.createElement('span');
      fallback.textContent = card.icon;
      iconImage.replaceWith(fallback);
    }, { once: true });
    el.addEventListener('click', () => {
      if (selectionLocked || state.mode !== 'levelup') return;
      selectionLocked = true;
      cardRow.querySelectorAll('button').forEach(button => { button.disabled = true; });
      el.classList.add('selected');
      playSfx('select');
      card.apply(player);
      player.cardStacks = player.cardStacks || {};
      player.cardStacks[card.id] = (player.cardStacks[card.id] || 0) + 1;
      const selectedPlayer = player;
      // 선택 연출 동안 입력을 잠가 능력치가 중복 적용되지 않게 한다.
      const finishSelection = () => {
        if (state.mode !== 'levelup' || player !== selectedPlayer || !el.isConnected) return;
        levelupModal.classList.add('hidden');
        pendingLevelUps--;
        if (pendingLevelUps > 0) {
          showLevelUpModal();
        } else {
          state.mode = 'playing';
        }
      };
      window.setTimeout(finishSelection, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 480);
    });
    cardRow.appendChild(el);
  });

  levelupModal.classList.remove('hidden');
  cardRow.querySelector('button')?.focus({ preventScroll: true });
}

/* -------------------------------------------------------------------------
   9. 스테이지 클리어 / 게임 오버 / 일시정지
   ------------------------------------------------------------------------- */

const stageClearModal = document.getElementById('stageclear-modal');
const gameoverModal = document.getElementById('gameover-modal');
const pauseModal = document.getElementById('pause-modal');

function onStageClear() {
  if (player.dying || state.stageSettled) return;
  state.mode = 'stageclear';
  clearInput();
  player.pendingShots = null; player.activeDash = null; player.pendingBasicAttackDelay = null;
  // 클리어 상태에서 재화와 경험치를 모두 회수한다. 카드는 다음 전투 전에 선택한다.
  for (const pk of pickups) {
    if (pk.collected) continue;
    if (pk.type === 'gold') { player.gold += pk.amount; state.stageGoldEarned += pk.amount; pk.collected = true; }
    if (pk.type === 'soul') { player.soul += pk.amount; state.stageSoulEarned += pk.amount; pk.collected = true; }
    if (pk.type === 'exp') { pk.collected = true; gainExp(pk.amount); }
  }
  pickups = pickups.filter(pk => !pk.collected);
  playBgm('stage'); // 보스 테마를 끄고 클리어 화면에선 다시 평상시 스테이지 곡으로
  state.mode = 'stageclear';
  document.getElementById('clear-summary').innerHTML = `
    스테이지 <b>${state.stage}</b> 클리어!<br>
    획득 골드 <b>${state.stageGoldEarned}</b> · 획득 영혼 <b>${state.stageSoulEarned}</b><br>
    현재 레벨 <b>${player.level}</b>
  `;
  // 이번 스테이지에서 번 골드/영혼은 즉시 로비(영구) 재화로 귀속된다.
  settleCurrentStage(true);
  state.stageGoldEarned = 0;
  state.stageSoulEarned = 0;
  stageClearModal.classList.remove('hidden');
}

document.getElementById('btn-next-stage').addEventListener('click', () => {
  if (state.mode !== 'stageclear' || player.dying) return;
  stageClearModal.classList.add('hidden');
  state.stage++;
  player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.4);
  startStage();
  state.mode = 'playing';
  if (pendingLevelUps > 0) showLevelUpModal();
});

document.getElementById('btn-clear-lobby').addEventListener('click', () => {
  if (state.mode !== 'stageclear') return;
  stageClearModal.classList.add('hidden');
  pendingLevelUps = 0;
  settleAndQuitToLobby();
  playBgm('lobby'); showScreen('lobby'); renderLobbyAll();
});

function onGameOver() {
  if (state.mode === 'gameover') return;
  clearInput();
  stopBgm();
  state.mode = 'gameover';
  document.getElementById('gameover-summary').innerHTML = `
    도달 스테이지 <b>${state.stage}</b> · 레벨 <b>${player.level}</b><br>
    이번 런 획득 골드 <b>${player.gold}</b> · 획득 영혼 <b>${player.soul}</b>
  `;
  // 사망 시점까지 이번 스테이지에서 번 골드/영혼도 로비 재화로 귀속된다(스테이지는 미클리어 처리).
  settleCurrentStage(false);
  state.stageGoldEarned = 0;
  state.stageSoulEarned = 0;
  gameoverModal.classList.remove('hidden');
}

// 화면 전환(로비/타이틀 이동)은 lobby.js 가 담당한다.

const pauseCardRow = document.getElementById('pause-card-row');
function renderPauseCards() {
  pauseCardRow.innerHTML = '';
  const stacks = player.cardStacks || {};
  const owned = SKILL_POOL.filter(c => stacks[c.id] > 0);
  if (!owned.length) {
    pauseCardRow.innerHTML = '<p class="pause-card-empty">아직 선택한 카드가 없습니다.</p>';
    return;
  }
  owned.forEach(card => {
    const el = document.createElement('div');
    el.className = 'pause-card';
    el.innerHTML = `
      <div class="pause-card-icon"><img src="${cardImagePath(card.id)}" alt=""></div>
      <div class="pause-card-name">${card.name}</div>
      <div class="pause-card-count">${stacks[card.id]}/${CARD_LIMITS[card.id] || 1}</div>
    `;
    const iconImage = el.querySelector('img');
    iconImage.addEventListener('error', () => {
      const fallback = document.createElement('span');
      fallback.textContent = card.icon;
      iconImage.replaceWith(fallback);
    }, { once: true });
    pauseCardRow.appendChild(el);
  });
}

function togglePause() {
  if (!player || player.dying) return;
  clearInput();
  if (state.mode === 'playing') {
    state.mode = 'paused';
    renderPauseCards();
    pauseModal.classList.remove('hidden');
  } else if (state.mode === 'paused') {
    state.mode = 'playing';
    pauseModal.classList.add('hidden');
  }
}

document.getElementById('btn-pause').addEventListener('click', togglePause);
document.getElementById('btn-resume').addEventListener('click', togglePause);

// 조작법 안내 — 게임 화면 코너 버튼(플레이 중 바로) 또는 일시정지 메뉴에서 열 수 있다.
const controlsModal = document.getElementById('controls-modal');
let controlsReturnTo = 'game'; // 'game' | 'pause' — 닫을 때 어디로 돌아갈지

document.getElementById('btn-controls').addEventListener('click', () => {
  if (state.mode !== 'playing' || player.dying) return;
  controlsReturnTo = 'game';
  state.mode = 'controls';
  clearInput();
  controlsModal.classList.remove('hidden');
});
document.getElementById('btn-pause-controls').addEventListener('click', () => {
  if (state.mode !== 'paused') return;
  controlsReturnTo = 'pause';
  state.mode = 'controls';
  pauseModal.classList.add('hidden');
  controlsModal.classList.remove('hidden');
});
document.getElementById('btn-controls-close').addEventListener('click', () => {
  if (state.mode !== 'controls') return;
  controlsModal.classList.add('hidden');
  if (controlsReturnTo === 'pause') {
    state.mode = 'paused';
    pauseModal.classList.remove('hidden');
  } else {
    state.mode = 'playing';
  }
});

// 플레이 중 로비로 나갈 때, 현재(미완료) 스테이지에서 번 골드/영혼까지 정산한다.
function settleCurrentStage(cleared) {
  if (state.stageSettled) return;
  settleProgress({ gold:state.stageGoldEarned, soul:state.stageSoulEarned, stage:state.stage,
    cleared, kills:state.killCount, killTarget:state.killTarget });
  state.stageSettled = true;
}

function settleAndQuitToLobby() {
  clearInput();
  settleCurrentStage(false);
  state.stageGoldEarned = 0;
  state.stageSoulEarned = 0;
  state.mode = 'idle';
}

/* -------------------------------------------------------------------------
   11. 메인 루프
   ------------------------------------------------------------------------- */

let lastTime = performance.now();
let fpsAcc = 0, fpsFrames = 0, fpsDisplay = 0;

function update(dt) {
  if (state.mode !== 'playing') return;
  if (player.dying) {
    player.animState='death';player.deathAnimTimer+=dt;
    player.animFrame=clamp(Math.floor(player.deathAnimTimer*PLAYER_ANIM_FPS.death),0,PLAYER_ANIM_FRAMES.death-1);
    if(player.deathAnimTimer>=PLAYER_ANIM_FRAMES.death/PLAYER_ANIM_FPS.death+PLAYER_DEATH_HOLD)onGameOver();
    return;
  }
  if(combatFeedback.pause>0){combatFeedback.pause=Math.max(0,combatFeedback.pause-dt);return;}
  combatFeedback.shake=Math.max(0,combatFeedback.shake-dt);
  combatFeedback.sparks.forEach(s=>s.life-=dt);
  combatFeedback.sparks=combatFeedback.sparks.filter(s=>s.life>0);
  updateTimedAttacks(dt);
  if(state.mode!=='playing')return;
  // 스킬 쿨다운
  for (const k of ['Q', 'W', 'E', 'R']) {
    const s = player.skills[k];
    if (s && s.cd > 0) s.cd = Math.max(0, s.cd - dt * (1 + (player.cooldownBonus || 0)));
  }
  player.secondWindCd = Math.max(0, (player.secondWindCd || 0) - dt);
  updateAdvancements(dt);
  if(state.mode!=='playing'||player.dying)return;
  if (player.secondWind && !player.dying && player.hp < player.maxHp * .3 && player.secondWindCd === 0) {
    player.hp = Math.min(player.maxHp, player.hp + player.maxHp * .25);
    player.secondWindCd = 30;
    spawnVfxBurst(player.x, player.y, 'passive_lifesteal', 90, .7);
    floatTexts.push({x:player.x,y:player.y-40,text:'불굴의 숨결',color:'#89ffc3',life:1,vy:-30});
  }

  // 버프 타이머
  if (player.buffTimer > 0) {
    player.buffTimer -= dt;
    if (player.buffTimer <= 0) { player.buffAtkSpeed = 0; player.buffMoveSpeed = 0; }
  }

  // 이동 (사망 연출 중에는 입력을 막아 시체가 미끄러지지 않게 한다)
  const mv = player.activeDash ? { dx: 0, dy: 0 } : moveVector();
  const curSpeed = player.speed * (1 + player.buffMoveSpeed + advancementMoveSpeed()) * (player.slowTimer > 0 ? 0.55 : 1);
  player.x = clamp(player.x + mv.dx * curSpeed * dt, player.radius, WORLD_W - player.radius);
  player.y = clamp(player.y + mv.dy * curSpeed * dt, player.radius, WORLD_H - player.radius);
  player.moving = mv.dx !== 0 || mv.dy !== 0;
  if (player.moving && player.attackAnimTimer <= 0) setPlayerDirection(mv.dx,mv.dy);

  if (player.invuln > 0) player.invuln -= dt;
  if (player.slowTimer > 0) player.slowTimer -= dt;
  if (player.hitFlash > 0) player.hitFlash -= dt;
  if (player.attackLunge > 0) player.attackLunge -= dt;
  if (player.lifestealVfxCd > 0) player.lifestealVfxCd -= dt;

  // 체력 재생
  if (player.regen > 0 && player.hp < player.maxHp) {
    player.hp = Math.min(player.maxHp, player.hp + player.regen * dt);
  }

  // 보호막 재생 (성직자 전용 — 일정 시간 피격당하지 않으면 서서히 회복)
  player.timeSinceDamage += dt;
  if (player.shieldMax > 0 && player.shield < player.shieldMax && player.timeSinceDamage >= player.shieldRegenDelay) {
    player.shield = Math.min(player.shieldMax, player.shield + player.shieldRegenPerSec * dt);
  }

  // 정령 소환(성직자 Q) 지속시간 & 회복 틱
  if (player.summon) {
    if (player.summon.healPerSec > 0) {
      player.hp = Math.min(player.maxHp, player.hp + player.summon.healPerSec * dt);
    }
    player.summon.timer -= dt;
    if (player.summon.timer <= 0) player.summon = null;
  }

  // 기본 공격 — 더 이상 자동발사가 아니라 A 키를 누르고 있을 때만 나간다 (재사용대기시간은 그대로 적용)
  const curAtkInterval = Math.max(.12, player.atkInterval / (1 + player.buffAtkSpeed + advancementAttackSpeed()));
  if (player.atkTimer > 0) player.atkTimer -= dt;
  if ((keys['a'] || touchAttack) && player.atkTimer <= 0 && !player.dying) {
    player.atkTimer = curAtkInterval;
    player.attackAnimDur = Math.min(PLAYER_ATTACK_ANIM_DUR, curAtkInterval * .9);
    player.attackAnimTimer = player.attackAnimDur;
    // 모션에서 실제로 "찌르는/쏘는" 동작이 보이는 지점(castFraction)까지 기다렸다가 투사체를
    // 내보낸다 — 즉시 내보내면 자세를 잡기도 전에 이미 날아가버려서 다음 모션 재생 때
    // 화면 밖에서 미사일이 날아드는 것처럼 어색해 보였다.
    const castFraction = (player.basicAttack && player.basicAttack.castFraction) || 0.3;
    player.pendingBasicAttackDelay = player.attackAnimDur * castFraction;
  }
  if (player.pendingBasicAttackDelay != null) {
    player.pendingBasicAttackDelay -= dt;
    if (player.pendingBasicAttackDelay <= 0) {
      performBasicAttack();
      if (player.summon && player.summon.extraHits > 0) performBasicAttack(); // 정령 소환 중 타수 증가
      if (findNearestEnemy(player.x, player.y, (player.atkRange || 300) * 1.6)) {
        player.attackLunge = 0.16;
      }
      setPlayerDirection(player.facing.x,player.facing.y);
      player.pendingBasicAttackDelay = null;
    }
  }
  if(state.mode !== 'playing') return;

  // 스폰
  if (!state.bossActive) {
    state.stageElapsed += dt;
    state.waveNotice = Math.max(0, state.waveNotice - dt);
    spawnTimer -= dt;
    const needsEnemies = state.stageElapsed < state.stageDuration || state.killCount < state.killTarget;
    const spawnInterval = clamp(1.35 - state.stage * .06 - Math.min(.35,state.stageElapsed / 350), .45, 1.35);
    if (spawnTimer <= 0 && needsEnemies && enemies.length < MAX_LIVE_ENEMIES) {
      spawnNormalEnemy();
      spawnTimer = spawnInterval;
    }
    if (needsEnemies && state.stageElapsed >= state.nextWaveAt) {
      state.nextWaveAt += 20;
      state.waveNotice = 3;
      const type = state.stage >= 2 ? 'bat' : 'slime';
      const center = bossPoint(player.x + Math.cos(state.nextWaveAt) * 540, player.y + Math.sin(state.nextWaveAt) * 540, 80);
      const count = Math.min(9, 4 + Math.floor(state.stage / 1.5));
      for (let i = 0; i < count; i++) spawnNormalEnemy(type, bossPoint(center.x + (i - count/2)*45, center.y + (i%2)*45, 25));
      floatTexts.push({x:player.x,y:player.y-80,text:type==='bat'?'박쥐 무리 접근!':'슬라임 공세!',color:'#ffc574',life:2,vy:-15});
    }
    if (!needsEnemies && enemies.filter(e => !e.dead).length === 0) {
      spawnBoss();
    }
  }

  // 투사체 이동/충돌
  for (const pr of projectiles) {
    const previousX=pr.x,previousY=pr.y;
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    if (pr.life <= 0) continue;
    for (const e of enemies) {
      if (e.dead || pr.hitSet.has(e)) continue;
      if (segmentDistance(e.x,e.y,previousX,previousY,pr.x,pr.y) <= e.radius + pr.radius) {
        const isCrit = Math.random() < player.critChance;
        const dmg = player.atk * (pr.dmgMult || 1) * (isCrit ? player.critMult : 1);
        dealDamageToEnemy(e, dmg, isCrit);
        pr.hitSet.add(e);

        if (pr.explode) {
          // 파이어볼: 착탄 지점 주변에 스플래시 피해 + 화염 장판을 남기고 즉시 소멸
          playSfx('fire_hit');
          for (const e2 of enemies) {
            if (e2 === e || e2.dead) continue;
            if (dist(pr.x, pr.y, e2.x, e2.y) <= pr.explode.splashRadius) {
              dealDamageToEnemy(e2, player.atk * pr.explode.splashMult, false);
            }
          }
          groundEffects.push({
            x: pr.x, y: pr.y, radius: pr.explode.burnRadius,
            dps: player.atk * pr.explode.burnDps, life: pr.explode.burnDur,
            color: 'rgba(255,122,61,0.28)', vfxAnimKey: pr.explode.groundVfxAnim,
          });
          if (pr.explode.vfxAnim) {
            spawnVfxAnim(pr.x, pr.y, pr.explode.vfxAnim, { size: pr.explode.splashRadius * 2.2, frameDur: 0.05 });
          } else {
            spawnRing(pr.x, pr.y, pr.explode.splashRadius, 'rgba(255,122,61,0.9)');
          }
          pr.life = 0;
          break;
        }

        pr.pierceLeft -= 1;
        if (pr.pierceLeft < 0) { pr.life = 0; break; }
      }
    }
  }
  projectiles = projectiles.filter(p => p.life > 0 &&
    p.x > -50 && p.x < WORLD_W + 50 && p.y > -50 && p.y < WORLD_H + 50);

  // 바닥 장판(파이어볼 화염/서리 등) — 범위 안의 적에게 지속 피해(있으면) + 루프 애니메이션 프레임 진행
  for (const gz of groundEffects) {
    gz.life -= dt;
    if (gz.dps) {
      for (const e of enemies) {
        if (e.dead) continue;
        if (dist(gz.x, gz.y, e.x, e.y) <= gz.radius) {
          dealDamageToEnemy(e, gz.dps * dt, false, true);
        }
      }
    }
    if (gz.vfxAnimKey) {
      const frames = vfxAnimImages[gz.vfxAnimKey];
      if (frames && frames.length) {
        gz.vfxTimer = (gz.vfxTimer || 0) + dt;
        if (gz.vfxTimer >= 0.12) { gz.vfxTimer -= 0.12; gz.vfxFrame = ((gz.vfxFrame || 0) + 1) % frames.length; }
      }
    }
  }
  groundEffects = groundEffects.filter(g => g.life > 0);

  // 이펙트 폭발/터짐 등 여러 장짜리 1회성 애니메이션 진행
  for (const va of vfxAnims) {
    va.timer += dt;
    if (va.timer >= va.frameDur) { va.timer -= va.frameDur; va.frame++; }
  }
  vfxAnims = vfxAnims.filter(va => va.frame < va.frames.length);

  // 적 이동/공격
  for (const e of enemies) {
    if (e.dead) continue;
    if (e.hitCooldown > 0) e.hitCooldown -= dt;
    if (e.flash > 0) e.flash -= dt;
    e.slowTimer = Math.max(0, (e.slowTimer || 0) - dt);
    if (e.attackAnim > 0) e.attackAnim -= dt;

    // 걷기 애니메이션 프레임 진행
    const animFps = e.isBoss ? 5 : e.monsterType === 'tree' ? 3 : 8;
    e.animTimer = (e.animTimer || 0) + dt;
    if (e.animTimer >= 1 / animFps) {
      e.animTimer -= 1 / animFps;
      e.animFrame = ((e.animFrame || 0) + 1) % MONSTER_FRAMES;
    }

    if (e.isTotem) { updateTotem(e, dt); continue; }
    if (e.isBoss) { if (!player.dying) updateBossAI(e, dt); continue; }
    if(e.monsterType !== 'slime' && e.monsterType !== 'poison_slime'){updateNormalEnemy(e,dt);continue;}
    if(e.aiState && e.aiState!=='idle'){updateNormalAttack(e,dt);continue;}

    const d = dist(e.x, e.y, player.x, player.y);
    const desired = e.radius + player.radius - 4;
    if (e.monsterType === 'slime' || e.monsterType === 'poison_slime') {
      // 짧게 웅크린 뒤 방향을 고정하고 전진한다. 공중에선 접촉 공격을 하지 않는다.
      e.hopTime -= dt;
      if (!e.hopping && e.hopTime <= 0 && d > desired) {
        e.hopping = true; e.hopAge = 0;
        e.hopAngle = Math.atan2(player.y - e.y, player.x - e.x);
      }
      if (e.hopping) {
        e.hopAge += dt;
        e.height = Math.sin(Math.min(1,e.hopAge/.38)*Math.PI)*22;
        const step = e.speed * 1.8 * (e.slowTimer > 0 ? .5 : e.inAura ? .65 : 1) * dt;
        e.x = clamp(e.x + Math.cos(e.hopAngle)*step,20,WORLD_W-20);
        e.y = clamp(e.y + Math.sin(e.hopAngle)*step,20,WORLD_H-20);
        if(e.hopAge >= .38){e.hopping=false;e.height=0;e.hopTime=rand(.45,.8);}
      }
    } else if (d > desired) {
      const ang = Math.atan2(player.y - e.y, player.x - e.x);
      const moveSpeed = e.speed * (e.slowTimer > 0 ? .5 : e.inAura ? .65 : 1); // 얼음 늑대 펫의 냉기 오라 감속
      e.x += Math.cos(ang) * moveSpeed * dt;
      e.y += Math.sin(ang) * moveSpeed * dt;
      if (Math.abs(Math.cos(ang)) > 0.15) e.facing = Math.cos(ang) < 0 ? -1 : 1;
    }

    updateNormalAttack(e,dt);
  }
  separateNormalEnemies();
  if (!player.dying && state.mode === 'playing') updateBossHazards(dt);
  enemies = enemies.filter(e => !e.dead);
  if (state.mode !== 'playing' || player.dying) return;

  // 펫 로직 (펫탭에서 장착한 펫이 있을 때만)
  if (player.pet) {
    const pd = player.pet.def;
    if (pd.type === 'active') {
      player.pet.timer -= dt;
      if (player.pet.timer <= 0) {
        player.pet.timer = pd.interval;
        const target = pd.targetStrongest
          ? enemies.filter(e => !e.dead).reduce((best, e) => (!best || e.hp > best.hp) ? e : best, null)
          : findNearestEnemy(player.x, player.y, 900);
        if (target) {
          const dmg = player.atk * pd.dmgMult;
          for (const e of enemies) {
            if (dist(target.x, target.y, e.x, e.y) <= pd.radius) dealDamageToEnemy(e, dmg, false);
          }
          spawnRing(target.x, target.y, pd.radius, '#9be89b');
        }
      }
    } else if (pd.type === 'aura') {
      for (const e of enemies) {
        if (e.dead) continue;
        e.inAura = dist(player.x, player.y, e.x, e.y) <= pd.radius;
        if (e.inAura) {
          dealDamageToEnemy(e, pd.dmgPerSec * dt, false, true);
        }
      }
    } else if (pd.type === 'heal') {
      player.pet.timer -= dt;
      if (player.pet.timer <= 0) {
        player.pet.timer = pd.interval;
        player.hp = Math.min(player.maxHp, player.hp + pd.healAmount);
        feedbackTone('heal');
      }
    }
  }

  if (state.mode !== 'playing' || player.dying) return;

  // 픽업 이동/획득
  const pickupRadius = 46 + (player.pickupBonus || 0);
  for (const pk of pickups) {
    const d = dist(pk.x, pk.y, player.x, player.y);
    if (d < pickupRadius) {
      const ang = Math.atan2(player.y - pk.y, player.x - pk.x);
      pk.x += Math.cos(ang) * 620 * dt;
      pk.y += Math.sin(ang) * 620 * dt;
    }
    if (d < 20) {
      pk.collected = true;
      if (pk.type === 'gold') { player.gold += pk.amount; state.stageGoldEarned += pk.amount; feedbackTone('reward'); }
      else if (pk.type === 'exp') { gainExp(pk.amount); }
      else if (pk.type === 'soul') { player.soul += pk.amount; state.stageSoulEarned += pk.amount; feedbackTone('reward'); }
    }
    pk.life -= dt;
  }
  pickups = pickups.filter(p => !p.collected && p.life > 0);

  // 파티클/텍스트
  for (const ft of floatTexts) { ft.y += ft.vy * dt; ft.life -= dt; }
  floatTexts = floatTexts.filter(f => f.life > 0);
  for (const pt of particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt; }
  particles = particles.filter(p => p.life > 0);

  // 카메라
  state.camera.x = clamp(player.x - canvas.width / 2, 0, Math.max(0, WORLD_W - canvas.width));
  state.camera.y = clamp(player.y - canvas.height / 2, 0, Math.max(0, WORLD_H - canvas.height));

  // idle/walk/attack/hit/death 스프라이트 상태 결정 (이 프레임에 일어난 피격/공격을 모두 반영하도록 맨 뒤에서 처리)
  if (player.attackAnimTimer > 0) player.attackAnimTimer = Math.max(0, player.attackAnimTimer - dt);
  if (player.hitAnimTimer > 0) player.hitAnimTimer = Math.max(0, player.hitAnimTimer - dt);
  const prevAnimState = player.animState;

  if (player.dying) {
    player.animState = 'death';
    player.deathAnimTimer += dt;
    const deathFrames = PLAYER_ANIM_FRAMES.death;
    player.animFrame = clamp(Math.floor(player.deathAnimTimer * PLAYER_ANIM_FPS.death), 0, deathFrames - 1);
    const deathDur = deathFrames / PLAYER_ANIM_FPS.death;
    if (player.deathAnimTimer >= deathDur + PLAYER_DEATH_HOLD && state.mode !== 'gameover') {
      onGameOver();
    }
  } else if (player.hitAnimTimer > 0) {
    player.animState = 'hit';
    const prog = 1 - player.hitAnimTimer / PLAYER_HIT_ANIM_DUR;
    player.animFrame = clamp(Math.floor(prog * PLAYER_ANIM_FRAMES.hit), 0, PLAYER_ANIM_FRAMES.hit - 1);
  } else if (player.attackAnimTimer > 0) {
    player.animState = 'attack';
    const prog = 1 - player.attackAnimTimer / player.attackAnimDur;
    player.animFrame = clamp(Math.floor(prog * PLAYER_ANIM_FRAMES.attack), 0, PLAYER_ANIM_FRAMES.attack - 1);
  } else if (player.moving) {
    if (prevAnimState !== 'walk') { player.animFrame = 0; player.walkAnimTimer = 0; }
    player.animState = 'walk';
    player.walkAnimTimer = (player.walkAnimTimer || 0) + dt;
    const frameDur = 1 / PLAYER_ANIM_FPS.walk;
    if (player.walkAnimTimer >= frameDur) {
      player.walkAnimTimer -= frameDur;
      player.animFrame = (player.animFrame + 1) % PLAYER_ANIM_FRAMES.walk;
    }
  } else {
    if (prevAnimState !== 'idle') { player.animFrame = 0; player.idleAnimTimer = 0; player.idleDir = 1; }
    player.animState = 'idle';
    player.idleAnimTimer = (player.idleAnimTimer || 0) + dt;
    // 0번 프레임(정지 자세)에서 오래 머물다가 나머지 프레임은 천천히 왕복 재생한다.
    // 4장뿐이라 3→0으로 뚝 끊어 되감으면(루프) 그 자체가 "픽" 튀는 것처럼 보여서
    // 0→1→2→3→2→1→0으로 왕복(ping-pong)시켜 끊김을 없앴다.
    const baseFrameDur = 1 / PLAYER_ANIM_FPS.idle;
    const frameDur = player.animFrame === 0 ? baseFrameDur * PLAYER_IDLE_HOLD_MULT : baseFrameDur;
    if (player.idleAnimTimer >= frameDur) {
      player.idleAnimTimer -= frameDur;
      const last = PLAYER_ANIM_FRAMES.idle - 1;
      if (player.animFrame >= last) player.idleDir = -1;
      else if (player.animFrame <= 0) player.idleDir = 1;
      player.animFrame += player.idleDir;
    }
  }
}

/* -------------------------------------------------------------------------
   12. 렌더링
   ------------------------------------------------------------------------- */

// 타일 좌표로 고정된 의사난수(깜빡임 없음)
function tileHash(tx, ty) {
  const h = Math.sin(tx * 127.1 + ty * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

// 던전 배경 — 스테이지 바이옴에 맞는 GPT 생성 바닥/벽 텍스처를 캔버스 패턴으로 깐다.
// 이미지가 아직 로드되지 않았으면(초기 몇 프레임) 예전 절차적 플래그스톤으로 대체한다.
function drawProceduralFloor() {
  const TILE = 72;
  const startTx = Math.floor(state.camera.x / TILE);
  const startTy = Math.floor(state.camera.y / TILE);
  const cols = Math.ceil(canvas.width / TILE) + 1;
  const rows = Math.ceil(canvas.height / TILE) + 1;

  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      const tx = startTx + ix;
      const ty = startTy + iy;
      const sx = tx * TILE - state.camera.x;
      const sy = ty * TILE - state.camera.y;
      const r = tileHash(tx, ty);
      const shade = 24 + Math.round(r * 13);
      ctx.fillStyle = `rgb(${shade},${shade + 3},${shade + 10})`;
      ctx.fillRect(sx, sy, TILE, TILE);
      ctx.fillStyle = 'rgba(0,0,0,0.36)';
      ctx.fillRect(sx, sy, TILE, 2);
      ctx.fillRect(sx, sy, 2, TILE);
      if (r > 0.82) {
        ctx.fillStyle = 'rgba(120,140,180,0.05)';
        ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
      } else if (r < 0.12) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(sx + 3, sy + 3, TILE - 6, TILE - 6);
      }
    }
  }
}

function drawBackground() {
  ctx.fillStyle = '#0c0f16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const floorPattern = getBgPattern(stageFloorTile(state.stage));
  if (floorPattern) {
    ctx.save();
    ctx.translate(-state.camera.x, -state.camera.y);
    ctx.fillStyle = floorPattern;
    ctx.fillRect(state.camera.x, state.camera.y, canvas.width, canvas.height);
    ctx.restore();
  } else {
    drawProceduralFloor();
  }

  // 월드 경계 = 석벽(스테이지 바이옴 텍스처, 로드 전엔 어두운 단색)
  const bx = -state.camera.x, by = -state.camera.y;
  const wall = 26;
  const wallPattern = getBgPattern(stageWallTile(state.stage));
  ctx.save();
  ctx.translate(-state.camera.x, -state.camera.y);
  ctx.fillStyle = wallPattern || 'rgba(8,10,16,0.9)';
  ctx.fillRect(-wall, -wall, WORLD_W + wall * 2, wall);
  ctx.fillRect(-wall, WORLD_H, WORLD_W + wall * 2, wall);
  ctx.fillRect(-wall, 0, wall, WORLD_H);
  ctx.fillRect(WORLD_W, 0, wall, WORLD_H);
  ctx.restore();
  ctx.strokeStyle = 'rgba(217,164,65,0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(bx, by, WORLD_W, WORLD_H);

  // 화면 가장자리 비네트 (리사이즈 전까지 재사용)
  if (!vignetteGradient) {
    vignetteGradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.35,
      canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.72);
    vignetteGradient.addColorStop(0, 'rgba(0,0,0,0)');
    vignetteGradient.addColorStop(1, 'rgba(0,0,0,0.55)');
  }
  ctx.fillStyle = vignetteGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function worldToScreen(x, y) { return [x - state.camera.x, y - state.camera.y]; }

function drawPlayer() {
  if (drawAdvancementPlayer()) return;
  const [sx, sy] = worldToScreen(player.x, player.y);
  const animSet = playerAnimImages[meta.appearance];
  const animMeta = PLAYER_ANIM_META[meta.appearance];
  const stateImg = animSet && animSet[player.animState] && animSet[player.animState][player.animDir];
  const heroImg = playerSpriteImages[meta.appearance];
  const atlasImg = appearanceImages[meta.appearance] || appearanceImages.warrior;

  ctx.save();
  if (player.invuln > 0 && !player.dying) ctx.globalAlpha = 0.55 + 0.3 * Math.sin(performance.now() / 40);

  // 바닥 그림자 (사망 연출 중에는 넓적하게 눕는 그림자로)
  ctx.beginPath();
  if (player.dying) {
    ctx.ellipse(sx, sy + player.radius * 0.5, player.radius * 1.6, player.radius * 0.5, 0, 0, Math.PI * 2);
  } else {
    ctx.ellipse(sx, sy + player.radius * 0.7, player.radius * 0.95, player.radius * 0.36, 0, 0, Math.PI * 2);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fill();

  if (animMeta && stateImg && stateImg.complete && stateImg.naturalWidth > 0) {
    // GPT 생성 후 정규화한 idle/walk/attack/hit/death 스프라이트 시트
    const frameCount = PLAYER_ANIM_FRAMES[player.animState];
    const frame = clamp(player.animFrame, 0, frameCount - 1);
    const { cellW, cellH, refBodyH } = animMeta;
    const desiredBodyH = player.radius * 6.6; // 기존 단일포즈 연출과 같은 체감 크기
    const scale = desiredBodyH / refBodyH;
    const drawW = cellW * scale;
    const drawH = cellH * scale;

    ctx.translate(sx, sy + player.radius * 0.68);
    if (player.animFlip) ctx.scale(-1, 1);
    ctx.drawImage(stateImg, frame * cellW, 0, cellW, cellH, -drawW / 2, -drawH, drawW, drawH);
  } else if (heroImg && heroImg.complete && heroImg.naturalWidth > 0) {
    // classmoving.png 클래스 일러스트(단일 포즈) — 절차적 걷기/공격 모션
    const drawH = player.radius * 6.6;
    const drawW = drawH * (heroImg.naturalWidth / heroImg.naturalHeight);
    const t = performance.now() / 1000;

    // 걷기: 좌우로 흔들리는 스텝(상하 바운스 + 몸통 기울임) — 이동 중에만
    let bob = 0, tilt = 0, stride = 0;
    if (player.moving) {
      const phase = t * 9;
      bob = Math.abs(Math.sin(phase)) * player.radius * 0.22;
      tilt = Math.sin(phase * 0.5) * 0.09;          // 좌우 기울임
      stride = Math.sin(phase) * player.radius * 0.12; // 앞뒤 흔들림
    } else {
      bob = Math.sin(t * 2.2) * player.radius * 0.05; // 정지 시 호흡
    }

    // 공격: facing 방향으로 짧게 돌진(런지) + 스케일 펀치
    let lungeX = 0, lungeY = 0, punch = 1;
    if (player.attackLunge > 0) {
      const k = player.attackLunge / 0.16;          // 1 -> 0
      const amt = Math.sin(k * Math.PI) * player.radius * 0.9;
      const f = player.facing || { x: 1, y: 0 };
      lungeX = f.x * amt;
      lungeY = f.y * amt * 0.5;
      punch = 1 + Math.sin(k * Math.PI) * 0.08;
    }

    ctx.translate(sx + lungeX, sy + player.radius * 0.5 + bob + lungeY);
    ctx.rotate(tilt);
    ctx.scale(punch, punch);
    if (player.animFlip) ctx.scale(-1, 1);
    ctx.drawImage(heroImg, -drawW / 2 + stride, -drawH, drawW, drawH);
  } else if (atlasImg && atlasImg.complete && atlasImg.naturalWidth > 0) {
    const drawH = player.radius * 6.2;
    const drawW = drawH * (APPEARANCE_FRAME_W / APPEARANCE_FRAME_H);
    const sxTex = (ANIM_DIR_COL[player.animDir] + player.animFrame) * APPEARANCE_FRAME_W;
    ctx.translate(sx, sy + player.radius * 0.55);
    if (player.animFlip) ctx.scale(-1, 1);
    ctx.drawImage(atlasImg, sxTex, 0, APPEARANCE_FRAME_W, APPEARANCE_FRAME_H, -drawW / 2, -drawH, drawW, drawH);
  } else {
    ctx.beginPath();
    ctx.arc(sx, sy, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#5fd0ff';
    ctx.fill();
  }
  ctx.restore();
}

// 캔버스 filter의 drop-shadow는 매 프레임 전체 블러 연산을 다시 돌려서 매우 느리다
// (엘리트/보스가 여러 마리 겹치면 스테이지 3부터 체감될 정도로 렉이 걸렸던 원인).
// 같은 반경의 그라디언트는 내용이 항상 같으니 한 번만 만들어서 재사용한다.
const glowGradientCache = {};
function getGlowGradient(radius, colorInner, colorOuter) {
  const key = radius + '|' + colorInner;
  let g = glowGradientCache[key];
  if (!g) {
    g = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    g.addColorStop(0, colorInner);
    g.addColorStop(1, colorOuter);
    glowGradientCache[key] = g;
  }
  return g;
}

// 엘리트 몹도 매 프레임 ctx.filter(saturate/brightness)를 걸면 위 drop-shadow와 같은 이유로 느려진다
// (엘리트가 여러 마리 겹치면 스테이지 3부터 렉 발생). 필터는 스프라이트당 한 번만 적용해 캔버스에 구워두고,
// 이후에는 필터 없이 그 결과물을 그대로 그린다.
const eliteSpriteCache = {};
function getEliteSprite(img) {
  if (!img || !img.complete || img.naturalWidth === 0) return null;
  let baked = eliteSpriteCache[img.src];
  if (!baked) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const cx = c.getContext('2d');
    cx.filter = 'saturate(1.5) brightness(1.15)';
    cx.drawImage(img, 0, 0);
    baked = c;
    eliteSpriteCache[img.src] = baked;
  }
  return baked;
}

// 엘리트가 처음 등장하는 프레임에 필터용 캔버스를 만들지 않도록 미리 준비한다.
function warmEliteSprites() {
  const warm = () => {
    for (const set of Object.values(monsterImages)) {
      getEliteSprite(set.walk);
      getEliteSprite(set.attack);
    }
  };
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(warm, { timeout: 1200 });
  else window.setTimeout(warm, 0);
}
for (const set of Object.values(monsterImages)) {
  set.walk.addEventListener('load', warmEliteSprites, { once: true });
  set.attack.addEventListener('load', warmEliteSprites, { once: true });
}
warmEliteSprites();

function drawEnemies() {
  for (const e of enemies) {
    if (e.dead) continue;
    if (e.isTotem) { drawTotem(e); continue; }
    const [sx, sy] = worldToScreen(e.x, e.y);

    // 바닥 그림자 — 스프라이트 발 위치(footAnchor)에 맞춰서 그려야 붕 떠 보이지 않는다
    // 판정 원(e.radius)과 실제 그려지는 몸집(e.renderSize)이 분리된 개체는 그림자 폭도
    // 판정이 아니라 그려지는 크기를 따라가야 한다 — 안 그러면 큰 몸집 아래 그림자만 작아서
    // 공중에 뜬 것처럼 보인다.
    const shadowY = e.bossId==='slime_king' ? sy+86+(e.height||0) : sy + e.radius * (e.isBoss ? 0.35 : 0.4);
    const shadowRx = e.bossId==='slime_king' ? e.renderSize * 0.34 : e.renderSize ? e.renderSize * 0.30 : e.radius * 0.95;
    const shadowRy = e.bossId==='slime_king' ? e.renderSize * 0.12 : e.renderSize ? e.renderSize * 0.10 : e.radius * 0.34;
    ctx.beginPath();
    ctx.ellipse(sx, shadowY, shadowRx, shadowRy, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fill();

    ctx.save();
    ctx.translate(sx, sy);
    if (e.facing < 0) ctx.scale(-1, 1);

    const size = e.renderSize || (e.isBoss ? e.radius * 4.4 : e.radius * 3.6);
    const footAnchor = e.radius * (e.isBoss ? 0.35 : 0.4);   // 스프라이트 하단(발) 위치
    // 셀 안에서 캐릭터 발밑에 투명 여백이 있으면 그대로 그릴 때 그림자보다 위에 붕 떠 보인다.
    // 실제 불투명 픽셀의 하단 비율(bottomRatio)만큼만 그려서 "진짜 발"이 footAnchor에 오게 한다.
    const bottomRatio = e.isBoss ? .88 : (monsterOpaqueBottom[e.monsterType] != null ? monsterOpaqueBottom[e.monsterType] : 0.92);
    const drawTopY = e.bossId==='slime_king' ? -size*.60 : footAnchor - size * bottomRatio - (e.height || 0);
    const spriteTopY = sy + drawTopY;                        // 셀 상단의 화면 y
    let drawn = false;

    if (e.isBoss) {
      const img = bossImages[e.bossFile];
      if (img && img.complete && img.naturalWidth > 0) {
        const bob = Math.sin((state.stageElapsed || 0) * 4) * 2;
        if (e.flash > 0) {
          ctx.filter = 'brightness(2.4)';
        } else {
          ctx.filter = 'none';
          const glowR = size * 0.55;
          ctx.fillStyle = getGlowGradient(glowR, 'rgba(200,40,60,0.55)', 'rgba(200,40,60,0)');
          ctx.beginPath();
          ctx.arc(0, drawTopY + size * bottomRatio * 0.5, glowR, 0, Math.PI * 2);
          ctx.fill();
        }
        const preparing = (e.action && e.action.age < e.action.start) || (e.aiState === 'attack' && bossHazards.some(h => h.ownerId === e.ownerId && h.age < h.delay));
        const squash = preparing ? .9 : e.aiState === 'recover' ? .96 : 1;
        if(e.phase === 2 && e.flash <= 0) ctx.filter = 'saturate(1.25) brightness(1.12)';
        if(e.action?.type === 'teleport' && !e.action.done) ctx.globalAlpha = .3;
        ctx.drawImage(img, -size / (2*squash), drawTopY + bob + size*(1-squash), size/squash, size*squash);
        drawn = true;
      }
    } else {
      const set = monsterImages[e.monsterType];
      const useAttack = e.attackAnim > 0 && set && set.attack && set.attack.complete && set.attack.naturalWidth > 0;
      const img = useAttack ? set.attack : (set && set.walk);
      if (img && img.complete && img.naturalWidth > 0) {
        const frame = useAttack
          ? clamp(Math.floor((0.4 - e.attackAnim) / 0.1), 0, MONSTER_FRAMES - 1)
          : (e.animFrame || 0);
        let drawImg = img;
        if (e.flash > 0) {
          ctx.filter = 'brightness(2.4)';
        } else if (e.isElite) {
          ctx.filter = 'none';
          drawImg = getEliteSprite(img) || img;
          const glowR = e.radius * 1.8;
          ctx.fillStyle = getGlowGradient(glowR, 'rgba(120,200,255,0.4)', 'rgba(120,200,255,0)');
          ctx.beginPath();
          ctx.arc(0, drawTopY + size * bottomRatio * 0.5, glowR, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.filter = 'none';
        }
        const squash = (e.monsterType === 'slime' || e.monsterType === 'poison_slime') && !e.hopping && e.hopTime < .2 ? .88 : 1;
        ctx.drawImage(drawImg, frame * MONSTER_FRAME, 0, MONSTER_FRAME, MONSTER_FRAME,
                      -size / (2*squash), drawTopY + size*(1-squash), size/squash, size*squash);
        drawn = true;
      }
    }

    if (!drawn) {
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fillStyle = e.isBoss ? '#a53df0' : e.isElite ? '#4a9be0' : '#3fae4a';
      ctx.fill();
    }
    ctx.restore();

    // 체력바 — 스프라이트 실제 불투명 상단 위로 띄운다 (보스는 상단 HUD 바 사용)
    if (!e.isBoss) {
      const w = Math.max(e.radius * 2, 30);
      const hpRatio = clamp(e.hp / e.maxHp, 0, 1);
      const topRatio = monsterOpaqueTop[e.monsterType] != null ? monsterOpaqueTop[e.monsterType] : 0.14;
      const headY = drawn ? spriteTopY + size * topRatio : sy - e.radius;
      const barY = headY - 9;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(sx - w / 2, barY, w, 5);
      ctx.fillStyle = e.isElite ? '#7fd6ff' : '#ff6b6b';
      ctx.fillRect(sx - w / 2, barY, w * hpRatio, 5);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx - w / 2, barY, w, 5);
    }
  }
}

// 이미지를 각도만큼 회전시켜 폭(targetWidth) 기준으로 스케일해서 그린다 (발사체/베기류 공용)
function drawRotatedSprite(img, sx, sy, angle, targetWidth) {
  const scale = targetWidth / img.naturalWidth;
  const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawProjectiles() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const pr of projectiles) {
    const [sx, sy] = worldToScreen(pr.x, pr.y);
    const angle = Math.atan2(pr.vy, pr.vx);

    if (pr.advCard) {
      ctx.save();ctx.globalCompositeOperation='source-over';ctx.translate(sx,sy);ctx.rotate(angle+Math.PI/2);ctx.fillStyle='#f9e9ff';ctx.fillRect(-7,-11,14,22);ctx.strokeStyle='#d99af9';ctx.lineWidth=2;ctx.strokeRect(-7,-11,14,22);ctx.fillStyle='#843ba4';ctx.fillRect(-3,-4,6,8);ctx.restore();continue;
    }
    if (pr.kind === 'fireball') {
      const img = vfxImages.q_fireball;
      if (img && img.complete && img.naturalWidth) {
        drawRotatedSprite(img, sx, sy, angle, pr.radius * 7);
        continue;
      }
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, pr.radius * 3.2);
      grad.addColorStop(0, 'rgba(255,210,140,0.95)');
      grad.addColorStop(0.5, 'rgba(255,120,40,0.65)');
      grad.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, pr.radius * 3.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (pr.kind === 'shuriken') {
      const img = vfxImages.q_shuriken;
      if (img && img.complete && img.naturalWidth) {
        drawRotatedSprite(img, sx, sy, (performance.now() / 250) % (Math.PI * 2), pr.radius * 4.4);
        continue;
      }
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate((performance.now() / 60) % (Math.PI * 2));
      ctx.fillStyle = '#dfe6ee';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a1 = i * Math.PI / 2, a2 = a1 + Math.PI / 4;
        ctx.lineTo(Math.cos(a1) * pr.radius * 1.7, Math.sin(a1) * pr.radius * 1.7);
        ctx.lineTo(Math.cos(a2) * pr.radius * 0.5, Math.sin(a2) * pr.radius * 0.5);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      // 마법사 기본공격 마력탄
      const img = vfxImages.attack_arcane_bolt;
      if (img && img.complete && img.naturalWidth) {
        drawRotatedSprite(img, sx, sy, angle, pr.radius * 6.2);
        continue;
      }
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, pr.radius * 2.4);
      grad.addColorStop(0, 'rgba(255,240,180,0.95)');
      grad.addColorStop(1, 'rgba(255,180,60,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, pr.radius * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// 바닥 장판(화염/서리 등) 렌더링 — vfxAnimKey(루프 애니메이션) 또는 vfxImage(정지 이미지)가
// 있으면 이미지로, 없으면 예전처럼 색깔 원으로 그린다.
// 장판 안에 흩뿌릴 불씨 위치(중앙 1개 + 주변 2개) — 반경 비율로 고정해서 매 프레임 같은 자리에 나온다
const GROUND_VFX_SPOTS = [
  { dx: 0, dy: 0, scale: 1 },
  { dx: -0.5, dy: 0.28, scale: 0.55 },
  { dx: 0.45, dy: -0.32, scale: 0.5 },
];

function drawGroundEffects() {
  for (const gz of groundEffects) {
    const [sx, sy] = worldToScreen(gz.x, gz.y);
    const frames = gz.vfxAnimKey && vfxAnimImages[gz.vfxAnimKey];
    const img = frames ? frames[(gz.vfxFrame || 0) % frames.length] : (gz.vfxImage && vfxImages[gz.vfxImage]);
    if (img && img.complete && img.naturalWidth) {
      ctx.save();
      // 불투명하게 덮으면 밑에 있는 이미지 원본 그대로라 흐리게 죽어보인다 — 발광 합성으로 켜켜이
      // 겹쳐 그리면 어두운 바닥 위에서 실제 불빛처럼 두드러진다.
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = clamp(gz.life / 2, 0.55, 0.9);
      const baseSize = gz.radius * 1.6;
      const baseH = baseSize * (img.naturalHeight / img.naturalWidth);
      const spots = gz.vfxAnimKey ? GROUND_VFX_SPOTS : GROUND_VFX_SPOTS.slice(0, 1);
      for (const spot of spots) {
        const w = baseSize * spot.scale, h = baseH * spot.scale;
        ctx.drawImage(img, sx + spot.dx * gz.radius - w / 2, sy + spot.dy * gz.radius - h / 2, w, h);
      }
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = clamp(gz.life / 2, 0.3, 0.65);
      ctx.fillStyle = gz.color || 'rgba(255,122,61,0.28)';
      ctx.beginPath();
      ctx.arc(sx, sy, gz.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// 폭발/터짐 등 여러 장짜리 1회성 애니메이션 (spawnVfxAnim)
function drawVfxAnims() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const va of vfxAnims) {
    const img = va.frames[Math.min(va.frame, va.frames.length - 1)];
    if (!img || !img.complete || !img.naturalWidth) continue;
    const [sx, sy] = worldToScreen(va.x, va.y);
    const w = va.size, h = va.size * (img.naturalHeight / img.naturalWidth);
    ctx.drawImage(img, sx - w / 2, sy - h / 2, w, h);
  }
  ctx.restore();
}

// 골드/경험치 드롭 — HUD 재화 아이콘과 같은 이미지(image/ui/coin.png, gem.png)를 재사용한다.
// 영혼(soul) 드롭은 아직 전용 이미지가 없어서 기존 이모지로 남겨둔다.
const pickupImages = { gold: new Image(), exp: new Image() };
pickupImages.gold.src = 'image/ui/coin.png';
pickupImages.exp.src = 'image/ui/gem.png';

function drawPickups() {
  const size = 20; // HUD 상단 재화 아이콘(17px)과 비슷한 크기로
  for (const pk of pickups) {
    const [sx, sy] = worldToScreen(pk.x, pk.y);
    const img = pickupImages[pk.type];
    if (img && img.complete && img.naturalWidth) {
      const w = size, h = size * (img.naturalHeight / img.naturalWidth);
      ctx.drawImage(img, sx - w / 2, sy - h / 2, w, h);
    } else {
      ctx.font = '18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pk.type === 'gold' ? '🪙' : pk.type === 'exp' ? '🔷' : '🔮', sx, sy);
    }
  }
}

function drawParticles() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const pt of particles) {
    const [sx, sy] = worldToScreen(pt.x, pt.y);

    // 방향성 이펙트(베기/빔/돌진 잔상 등) — player 위치에 앵커, 각도로 회전
    if (pt.vfxSwingKey) {
      const img = vfxImages[pt.vfxSwingKey];
      if (img && img.complete && img.naturalWidth) {
        ctx.save();
        ctx.globalAlpha = clamp(pt.life / pt.vfxSwingMaxLife, 0, 1);
        ctx.translate(sx, sy);
        ctx.rotate(pt.vfxSwingAngle);
        const scale = pt.vfxSwingLength / img.naturalWidth;
        const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
        ctx.drawImage(img, 0, -h / 2, w, h);
        ctx.restore();
        continue;
      }
    }
    // 방사형 이펙트(폭발/오라 등) — 커지면서 사라짐
    if (pt.vfxBurstKey) {
      const img = vfxImages[pt.vfxBurstKey];
      if (img && img.complete && img.naturalWidth) {
        const t = 1 - clamp(pt.life / pt.vfxBurstMaxLife, 0, 1);
        const size = (pt.vfxBurstSize || 140) * (0.5 + 0.5 * t);
        const h = size * (img.naturalHeight / img.naturalWidth);
        ctx.globalAlpha = clamp(pt.life / pt.vfxBurstMaxLife, 0, 1);
        const py = pt.vfxBurstAnchor === 'bottom' ? sy - h : sy - h / 2;
        ctx.drawImage(img, sx - size / 2, py, size, h);
        continue;
      }
    }

    if (pt.arc) {
      // 근접 공격의 부채꼴 슬래시 이펙트
      ctx.globalAlpha = clamp(pt.life / 0.25, 0, 1);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.arc(sx, sy, pt.arc.radius, pt.arc.angle - pt.arc.spread / 2, pt.arc.angle + pt.arc.spread / 2);
      ctx.closePath();
      ctx.fill();
    } else if (pt.line) {
      // 일자 검기(전사 Q) 이펙트
      ctx.save();
      ctx.globalAlpha = clamp(pt.life / 0.25, 0, 1);
      ctx.translate(sx, sy);
      ctx.rotate(pt.line.angle);
      ctx.fillStyle = pt.color;
      ctx.fillRect(-pt.line.length / 2, -pt.line.width / 2, pt.line.length, pt.line.width);
      ctx.restore();
    } else if (pt.ring) {
      const img = pt.vfxKey && vfxImages[pt.vfxKey];
      if (img && img.complete && img.naturalWidth) {
        const t = 1 - clamp(pt.life / 0.35, 0, 1);
        const size = pt.ring * 2 * (0.5 + 0.5 * t);
        const h = size * (img.naturalHeight / img.naturalWidth);
        ctx.globalAlpha = clamp(pt.life / 0.35, 0, 1);
        ctx.drawImage(img, sx - size / 2, sy - h / 2, size, h);
      } else {
        ctx.strokeStyle = pt.color;
        ctx.globalAlpha = clamp(pt.life / 0.35, 0, 1);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(sx, sy, pt.ring, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = clamp(pt.life / 0.4, 0, 1);
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawFloatTexts() {
  ctx.font = 'bold 16px Georgia, serif';
  ctx.textAlign = 'center';
  for (const ft of floatTexts) {
    const [sx, sy] = worldToScreen(ft.x, ft.y);
    ctx.globalAlpha = clamp(ft.life / 0.6, 0, 1);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, sx, sy);
  }
  ctx.globalAlpha = 1;
}

function drawPet() {
  if (!player.pet) return;
  const [sx, sy] = worldToScreen(player.x, player.y);
  if (player.pet.def.type === 'aura') {
    ctx.save();
    ctx.strokeStyle = 'rgba(140,200,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, player.pet.def.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  const petImg = petIconImages[player.pet.def.id];
  if (petImg && petImg.complete && petImg.naturalWidth > 0) {
    ctx.drawImage(petImg, sx + 22, sy - 60, 28, 28);
  } else {
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.pet.def.icon, sx + 36, sy - 46);
  }
}

function drawSummon() {
  if (!player.summon) return;
  const [sx, sy] = worldToScreen(player.x, player.y);
  const bob = Math.sin(performance.now() / 300) * 4;
  ctx.save();
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(performance.now() / 150);
  const img = vfxImages.q_guardian_spirit;
  if (img && img.complete && img.naturalWidth) {
    const size = 40;
    const h = size * (img.naturalHeight / img.naturalWidth);
    ctx.drawImage(img, sx - 38 - size / 2, sy - 46 - h / 2 + bob, size, h);
  } else {
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👻', sx - 38, sy - 46 + bob);
  }
  ctx.restore();
}

function render() {
  ctx.save();
  if(combatFeedback.shake>0 && state.mode==='playing'){const n=combatFeedback.shake*25;ctx.translate(Math.sin(performance.now()*.12)*n,Math.cos(performance.now()*.09)*n);}
  drawBackground();
  drawGroundEffects();
  drawBossHazards();
  drawPickups();
  drawEnemies();
  drawProjectiles();
  drawParticles();
  drawVfxAnims();
  drawAdvancements();
  drawPlayer();
  drawPet();
  drawSummon();
  drawFloatTexts();
  drawBossHazards(true);
  drawNormalWarnings();
  drawCombatFeedback();
  ctx.restore();
}

/* -------------------------------------------------------------------------
   13. HUD 갱신
   ------------------------------------------------------------------------- */

// updateHud()가 매 프레임(최대 60회/초) 호출되므로 DOM 요소는 한 번만 찾아서 캐시해둔다.
// (특히 핫바 아이콘의 innerHTML을 프레임마다 다시 쓰면 <img> 태그를 계속 새로 만들게 돼서
// 체감 프레임이 뚝뚝 끊기는 원인이 됐다 — 아이콘이 실제로 바뀔 때만 갱신하도록 고침)
const hudEls = {
  basicCdText: document.getElementById('basic-cd-text'),
  basicCdFill: document.getElementById('basic-cd-fill'),
  stageProgress: document.getElementById('hud-stage-progress'),
  hpFill: document.getElementById('hud-hp-fill'),
  hpText: document.getElementById('hud-hp-text'),
  shieldBar: document.getElementById('hud-shield-bar'),
  shieldFill: document.getElementById('hud-shield-fill'),
  shieldText: document.getElementById('hud-shield-text'),
  expFill: document.getElementById('hud-exp-fill'),
  expText: document.getElementById('hud-exp-text'),
  gold: document.getElementById('hud-gold'),
  soul: document.getElementById('hud-soul'),
  stage: document.getElementById('hud-stage'),
  bossFill: document.getElementById('hud-boss-fill'),
  fps: document.getElementById('hud-fps'),
  portraitFrame: document.getElementById('hud-portrait-frame'),
  levelBadge: document.getElementById('hud-level-badge'),
};

// HUD 좌측 상단 초상화 — 로비의 .portrait-frame과 같은 규칙(전직 시 전직 모션 첫 프레임,
// 아니면 외형 초상화)이라 advPortraitStyle()을 그대로 재사용한다. 외형/전직은 스테이지 중
// 바뀌지 않으므로 스테이지 시작 시 한 번만 그리면 된다.
function updateHudPortrait() {
  const advanced = player.adv && ADVANCED_JOBS.find(j => j.id === player.adv.id);
  const appearanceDef = APPEARANCE_POOL.find(a => a.id === meta.appearance) || APPEARANCE_POOL[0];
  hudEls.portraitFrame.innerHTML = advanced
    ? advPortraitHtml(advanced)
    : `<img src="${appearanceDef.portrait}" alt="${appearanceDef.name}">`;
}
const hotbarEls = {};
for (const k of ['Q', 'W', 'E', 'R']) {
  hotbarEls[k] = {
    slot: document.querySelector(`.slot[data-slot="${k}"]`),
    cd: document.getElementById('slot-cd-' + k),
    icon: document.getElementById('slot-icon-' + k),
    lastActive: null,
    lastIconKey: undefined,
    lastCdText: undefined,
    lastCdShown: null,
  };
}

function updateHud() {
  const basicInterval = Math.max(.12, player.atkInterval / (1 + player.buffAtkSpeed + advancementAttackSpeed()));
  updateAdvancementHud();
  const basicRemaining = Math.max(0, player.atkTimer);
  hudEls.basicCdText.textContent = basicRemaining > 0 ? `${basicRemaining.toFixed(1)}초` : '준비';
  hudEls.basicCdFill.style.width = `${clamp(1-basicRemaining/basicInterval,0,1)*100}%`;
  const remain = Math.max(0, Math.ceil(state.stageDuration-state.stageElapsed));
  hudEls.stageProgress.textContent = state.bossActive ? `보스 처치 · ${state.boss.phase === 2 ? '2단계' : '1단계'}` : remain > 0 || state.killCount < state.killTarget ? `시간 ${remain > 0 ? remain + '초' : '완료'} · 처치 ${Math.min(state.killCount,state.killTarget)}/${state.killTarget}` : '조건 달성 · 남은 적을 정리하세요';
  const hpRatio = clamp(player.hp / player.maxHp, 0, 1);
  hudEls.hpFill.style.width = (hpRatio * 100) + '%';
  hudEls.hpText.textContent = `${Math.ceil(player.hp)}/${player.maxHp}`;

  if (player.shieldMax > 0) {
    hudEls.shieldBar.classList.add('show');
    hudEls.shieldFill.style.width = (clamp(player.shield / player.shieldMax, 0, 1) * 100) + '%';
    hudEls.shieldText.textContent = `${Math.ceil(player.shield)}/${player.shieldMax}`;
  } else {
    hudEls.shieldBar.classList.remove('show');
  }

  const expRatio = clamp(player.exp / player.expToNext, 0, 1);
  hudEls.expFill.style.width = (expRatio * 100) + '%';
  hudEls.expText.textContent = `${Math.floor(player.exp)} / ${player.expToNext}`;
  hudEls.levelBadge.textContent = player.level;

  hudEls.gold.textContent = player.gold;
  hudEls.soul.textContent = player.soul;
  hudEls.stage.textContent = state.stage;

  if (state.boss && !state.boss.dead) {
    hudEls.bossFill.style.width = (clamp(state.boss.hp / state.boss.maxHp, 0, 1) * 100) + '%';
  }

  for (const k of ['Q', 'W', 'E', 'R']) {
    const s = player.skills[k];
    const els = hotbarEls[k];
    if (s) {
      if (els.lastActive !== true) { els.slot.classList.add('active'); els.lastActive = true; }
      const iconKey = s.iconImg || s.icon;
      if (els.lastIconKey !== iconKey) {
        els.icon.innerHTML = iconHtml(s.iconImg, s.icon);
        els.lastIconKey = iconKey;
      }
      const cdShown = s.cd > 0;
      const cdText = cdShown ? String(Math.ceil(s.cd)) : '';
      if (els.lastCdText !== cdText) { els.cd.textContent = cdText; els.lastCdText = cdText; }
      if (els.lastCdShown !== cdShown) { els.cd.style.display = cdShown ? 'flex' : 'none'; els.lastCdShown = cdShown; }
    } else {
      if (els.lastActive !== false) { els.slot.classList.remove('active'); els.lastActive = false; }
      if (els.lastIconKey !== null) { els.icon.innerHTML = ''; els.lastIconKey = null; }
      if (els.lastCdShown !== false) { els.cd.style.display = 'none'; els.lastCdShown = false; }
    }
  }
  if (hoveredSlot) refreshSkillTooltip(hoveredSlot); // 마우스를 올린 채로 쿨타임이 흐를 때도 즉시 갱신

  if (options.showFps) {
    hudEls.fps.textContent = `FPS ${fpsDisplay}`;
  }
}

/* -------------------------------------------------------------------------
   13-1. 스킬 툴팁 — QWER 슬롯에 마우스를 올리면 이름/설명/재사용 대기시간 표시
   ------------------------------------------------------------------------- */

const skillTooltip = document.getElementById('skill-tooltip');
const tooltipNameEl = document.getElementById('tooltip-name');
const tooltipDescEl = document.getElementById('tooltip-desc');
const tooltipCdEl = document.getElementById('tooltip-cd');

// 아직 스킬을 습득하지 못한 빈 슬롯에도 "왜 비어있는지" 안내를 띄운다.
const EMPTY_SLOT_HINT = {
  Q: { name: 'Q — 클래스 고유 스킬', desc: '캐릭터탭에서 외형을 선택하면 자동으로 주어집니다.' },
  W: { name: 'W — 장비 스킬', desc: '액티브 스킬이 있는 무기를 장착하면 사용할 수 있습니다.' },
  E: { name: 'E — 전직 스킬', desc: '캐릭터탭에서 전직하면 얻을 수 있습니다.' },
  R: { name: 'R — 탐험 액티브 스킬', desc: '전투 중 레벨업 카드에서 "낙뢰 강타"를 선택하면 얻을 수 있습니다.' },
};

let hoveredSlot = null;
let tooltipLastNameKey; // 마우스를 올려둔 채로 매 프레임 갱신될 때 innerHTML을 불필요하게 다시 쓰지 않으려는 캐시

function refreshSkillTooltip(slotKey) {
  const s = player ? player.skills[slotKey] : null;
  if (s) {
    const nameKey = (s.iconImg || s.icon) + '|' + s.name;
    if (tooltipLastNameKey !== nameKey) {
      tooltipNameEl.innerHTML = `${iconHtml(s.iconImg, s.icon, 'icon-img-inline')} ${s.name || ''}`.trim();
      tooltipLastNameKey = nameKey;
    }
    tooltipDescEl.textContent = s.desc || '';
    tooltipCdEl.textContent = s.cd > 0
      ? `재사용 대기 중 · ${Math.ceil(s.cd)}초 남음`
      : (s.cdMax ? `재사용 대기시간 ${s.cdMax}초` : '');
  } else {
    const hint = EMPTY_SLOT_HINT[slotKey];
    tooltipLastNameKey = undefined;
    tooltipNameEl.textContent = hint.name;
    tooltipDescEl.textContent = hint.desc;
    tooltipCdEl.textContent = '';
  }
}

function positionSkillTooltip(slotEl) {
  const rect = slotEl.getBoundingClientRect();
  skillTooltip.style.left = (rect.left + rect.width / 2) + 'px';
  skillTooltip.style.top = rect.top + 'px';
}

document.querySelectorAll('#hotbar .slot').forEach(slotEl => {
  const key = slotEl.dataset.slot;
  slotEl.addEventListener('mouseenter', () => {
    hoveredSlot = key;
    refreshSkillTooltip(key);
    positionSkillTooltip(slotEl);
    skillTooltip.classList.remove('hidden');
  });
  slotEl.addEventListener('mouseleave', () => {
    hoveredSlot = null;
    skillTooltip.classList.add('hidden');
  });
});

/* -------------------------------------------------------------------------
   14. 루프 실행
   ------------------------------------------------------------------------- */

function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  fpsAcc += dt; fpsFrames++;
  if (fpsAcc >= 0.5) { fpsDisplay = Math.round(fpsFrames / fpsAcc); fpsAcc = 0; fpsFrames = 0; }

  if (state.mode === 'playing') {
    update(dt);
  }

  if (state.mode === 'playing' || state.mode === 'paused' ||
      state.mode === 'levelup' || state.mode === 'controls' || state.mode === 'stageclear' || state.mode === 'gameover') {
    render();
    updateHud();
  }

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
showScreen('title');
