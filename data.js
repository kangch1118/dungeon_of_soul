'use strict';

/* =========================================================================
   data.js — 정적 게임 데이터 (장비 / 펫 / 직업 / 밸런스 상수)
   로크라이크 게임.txt 기획서 기반
   ========================================================================= */

const RARITY = {
  common:    { label: '일반', color: '#b9c4d6', weight: 55 },
  rare:      { label: '희귀', color: '#5fb0ff', weight: 30 },
  epic:      { label: '영웅', color: '#c46bff', weight: 12 },
  legendary: { label: '전설', color: '#ffcf5c', weight: 3 },
};

// ---------------------------------------------------------------------
// 장비 (장비탭 / 상점 뽑기 풀)
// weapon 은 W 슬롯(장비스킬1) 액티브를 가짐, armor/accessory 는 패시브만 보유
// ---------------------------------------------------------------------
const EQUIPMENT_POOL = [
  {
    id: 'starter_dagger', name: '낡은 단검', icon: '🗡️', category: 'weapon', rarity: 'common',
    stat: { atk: 5 },
    skill: null,
    starter: true,
  },
  {
    id: 'flame_sword', name: '화염의 검', icon: '🔥', category: 'weapon', rarity: 'rare',
    stat: { atk: 10 },
    skill: { effect: 'cone', name: '화염 참격', icon: '🔥', desc: '전방 부채꼴 범위에 화염 피해', cdMax: 7, dmgMult: 2.2, radius: 160, vfx: 'w_flame_slash' },
  },
  {
    id: 'frost_staff', name: '서리 지팡이', icon: '❄️', category: 'weapon', rarity: 'epic',
    stat: { atk: 14 },
    skill: { effect: 'slow', name: '냉기 폭발', icon: '❄️', desc: '범위 피해 + 3초간 이동속도 50% 감소', cdMax: 9, dmgMult: 2.6, radius: 190, vfx: 'w_frost_burst', groundVfx: 'w_frost_ground' },
  },
  {
    id: 'steel_bow', name: '강철 활', icon: '🏹', category: 'weapon', rarity: 'rare',
    stat: { atk: 9, critChance: 0.05 },
    skill: { effect: 'line', name: '관통 사격', icon: '🏹', desc: '직선상의 적을 모두 관통 타격', cdMax: 6, dmgMult: 2.0, radius: 480, vfx: 'w_piercing_arrow' },
  },
  {
    id: 'dragon_fang', name: '용아검', icon: '🐉', category: 'weapon', rarity: 'legendary',
    stat: { atk: 22, critMult: 0.4 },
    skill: { name: '용의 분노', icon: '🐉', desc: '광범위한 적에게 강력한 피해', cdMax: 10, dmgMult: 3.4, radius: 230, vfx: 'w_dragon_roar' },
  },

  {
    id: 'leather_armor', name: '가죽 갑옷', icon: '🥋', category: 'armor', rarity: 'common',
    stat: { def: 4, hp: 10 }, skill: null,
  },
  {
    id: 'knight_plate', name: '기사의 판금', icon: '🛡️', category: 'armor', rarity: 'epic',
    stat: { def: 12, hp: 30 },
    skill: { name: '철벽', icon: '🛡️', desc: '피격 시 25% 확률로 피해 40% 감소 (패시브)', passiveOnly: true, vfx: 'passive_shield_spark' },
  },
  {
    id: 'shadow_robe', name: '그림자 로브', icon: '🧥', category: 'armor', rarity: 'rare',
    stat: { def: 5, speedMult: 0.08 }, skill: null,
  },

  {
    id: 'lucky_ring', name: '행운의 반지', icon: '💍', category: 'accessory', rarity: 'rare',
    stat: { critChance: 0.08 }, skill: null,
  },
  {
    id: 'vampire_necklace', name: '흡혈의 목걸이', icon: '📿', category: 'accessory', rarity: 'epic',
    stat: { lifesteal: 0.04 },
    skill: { name: '흡혈', icon: '📿', desc: '공격 시 피해량의 4%만큼 체력 흡수 (패시브)', passiveOnly: true, vfx: 'passive_lifesteal' },
  },
  {
    id: 'mana_bracelet', name: '마력의 팔찌', icon: '🔮', category: 'accessory', rarity: 'common',
    stat: { atk: 6 }, skill: null,
  },
];

// ---------------------------------------------------------------------
// 펫 (펫탭 / 상점 뽑기 풀) — 스테이지 5 클리어 이후 뽑기 해금
// ---------------------------------------------------------------------
const PET_POOL = [
  {
    id: 'baby_slime', name: '아기 슬라임', icon: '🟢', rarity: 'common',
    desc: '골드 획득량 15% 증가', type: 'passive', goldMult: 0.15,
  },
  {
    id: 'flame_spirit', name: '불꽃 정령', icon: '🕯️', rarity: 'rare',
    desc: '4초마다 무작위 적에게 화염구 공격', type: 'active', interval: 4, dmgMult: 1.4, radius: 60,
  },
  {
    id: 'frost_wolf', name: '얼음 늑대', icon: '🐺', rarity: 'epic',
    desc: '주변 적을 지속적으로 감속시키고 피해를 입히는 냉기 오라', type: 'aura', radius: 130, dmgPerSec: 4,
  },
  {
    id: 'fairy', name: '요정', icon: '🧚', rarity: 'rare',
    desc: '5초마다 체력을 소량 회복', type: 'heal', interval: 5, healAmount: 12,
  },
  {
    id: 'griffin', name: '그리핀', icon: '🦅', rarity: 'legendary',
    desc: '6초마다 가장 강한 적에게 강타', type: 'active', interval: 6, dmgMult: 3.0, radius: 90, targetStrongest: true,
  },
];

// ---------------------------------------------------------------------
// 전직 전 기본 상태 — 전직(ADVANCED_JOBS, advancement-data.js)을 선택하면
// selectedAdvancement()가 이 값을 대체한다.
// ---------------------------------------------------------------------
const BASE_JOB_NODE = {
  id: 'base', name: '견습 모험가', icon: '🌱', tier: 0,
  statBonus: {},
  qSkill: { name: '강타', icon: '👊', cdMax: 4, dmgMult: 2.2 },
  eSkill: null,
};

function getJobNode() {
  return selectedAdvancement() || BASE_JOB_NODE;
}

// ---------------------------------------------------------------------
// 밸런스 상수
// ---------------------------------------------------------------------
const BASE_STATS = { hp: 100, speed: 210, atk: 12, def: 0, critChance: 0.05, critMult: 1.6 };
const GROWTH_PER_LEVEL = { hp: 3, atk: 0.4, def: 0.15 };

function charExpToNext(level) { return Math.round(60 + (level - 1) * 35); }

const SHOP_COSTS = {
  equipGacha: 100,
  petGacha: 150,
  expPotion: 60,
  expPotionAmount: 40,
  trainSoulCost: 5,
  trainExpAmount: 40,
};

const PET_UNLOCK_STAGE = 5;

// ---------------------------------------------------------------------
// 외형(코스메틱) — ch.png 스프라이트 시트에서 뽑아낸 4종 캐릭터.
// 직업(전직)과는 별개로 순수 겉모습만 바꾸는 선택지다.
// 각 스프라이트는 sprites/<id>.png 에 downA,downB,sideA,sideB,upA,upB
// 순서로 가로 6프레임(각 110x150)짜리 아틀라스로 저장돼 있다.
// ---------------------------------------------------------------------
const APPEARANCE_FRAME_W = 110;
const APPEARANCE_FRAME_H = 150;
// file    : 예전 걷기 아틀라스(sprites/*.png) — 폴백용
// sprite  : 인게임 캐릭터 (image/player/*.png, classmoving.png 클래스 일러스트 크롭)
// portrait: 로비 메뉴용 초상화 (image/portrait/*.png)
const APPEARANCE_POOL = [
  { id: 'warrior', name: '대검사', icon: '⚔️', file: 'sprites/warrior.png', sprite: 'image/player/warrior.png', portrait: 'image/portrait/warrior.png' },
  { id: 'mage',    name: '마법사', icon: '🔮', file: 'sprites/mage.png',    sprite: 'image/player/mage.png',    portrait: 'image/portrait/mage.png' },
  { id: 'rogue',   name: '도적',   icon: '🗡️', file: 'sprites/rogue.png',   sprite: 'image/player/rogue.png',   portrait: 'image/portrait/rogue.png' },
  { id: 'cleric',  name: '성기사', icon: '📿', file: 'sprites/cleric.png',  sprite: 'image/player/cleric.png',  portrait: 'image/portrait/cleric.png' },
];

// ---------------------------------------------------------------------
// 플레이어 모션 스프라이트 — image/player_anim/{class}_{state}_{dir}.png
// GPT 생성 원본(archive/unused-assets/image/generated_full_20260911/)을 Pillow로 균등분할 + 발밑 기준선
// 정렬한 결과물이다(각 클래스별 캔버스 크기(cellW/cellH)가 달라도 refBodyH로
// 실제 캐릭터 높이를 통일해서 그린다 — drawPlayer() 참고).
// direction은 down/side/up 3종만 있고, 왼쪽 이동은 side를 좌우반전해서 쓴다.
// ---------------------------------------------------------------------
const PLAYER_ANIM_DIRS = ['down', 'side', 'up'];
const PLAYER_ANIM_FRAMES = { idle: 4, walk: 6, attack: 6, hit: 3, death: 8 };
const PLAYER_ANIM_FPS = { idle: 2.5, walk: 7, death: 8 };
// 대기 0번 프레임(정지 자세)을 몇 배 더 오래 붙잡고 있을지 — 프레임이 4장뿐이라 그냥 균등하게
// 돌리면 쉬지 않고 씰룩거리는 것처럼 보여서, 대부분은 가만히 있다가 가끔 숨쉬듯 움직이게 한다.
// 나머지 프레임(1~3번)도 idle fps를 낮춰서(2.5fps=0.4초/프레임) 천천히 왕복(ping-pong)시킨다.
const PLAYER_IDLE_HOLD_MULT = 6;
const PLAYER_HIT_ANIM_DUR = 0.3;
// 공격 애니메이션 길이는 클래스 재사용대기시간(atkInterval)에 비례시키지 않고 고정한다.
// (도적처럼 재사용대기시간이 아주 짧은 클래스는 그 값에 맞추면 모션이 매 프레임 다시 시작돼
// 뚝뚝 끊겨 보였다 — 이제 기본공격이 자동발사가 아니라 A키 입력으로 나가므로 고정 길이가 더 자연스럽다)
const PLAYER_ATTACK_ANIM_DUR = 0.3;
const PLAYER_DEATH_HOLD = 0.5; // 마지막 프레임에서 게임오버 모달 뜨기 전 대기 시간

// image/player_anim/*.png는 웹 배포 용량 때문에 원본의 40%로 축소해뒀다.
// (아래 수치는 그 축소본의 실제 픽셀 크기 — 축소 전 원본 크기가 아니다)
const PLAYER_ANIM_META = {
  warrior: { cellW: 262, cellH: 437, baselineY: 433, refBodyH: 215 },
  mage:    { cellW: 220, cellH: 370, baselineY: 366, refBodyH: 234 },
  rogue:   { cellW: 235, cellH: 263, baselineY: 259, refBodyH: 241 },
  cleric:  { cellW: 294, cellH: 448, baselineY: 444, refBodyH: 234 },
};

function playerAnimPath(classId, state, dir) {
  return `image/player_anim/${classId}_${state}_${dir}.png`;
}

// ---------------------------------------------------------------------
// GPT 생성 아이콘 — image/icon/*.png (원본 요청 목록의 "장비/펫/스킬/재화" 항목).
// 이모지 icon 필드는 그대로 두고(캔버스 fillText·미매핑 항목 폴백용), id 기준으로
// 실제 이미지가 있는 항목만 별도로 매핑한다. UI 쪽에서는 iconHtml()로 렌더링.
// ---------------------------------------------------------------------
const ICON_IMAGES = {
  equipment: {
    starter_dagger: 'image/icon/icon_equipment_dagger.png',
    flame_sword: 'image/icon/icon_equipment_flame_sword.png',
    frost_staff: 'image/icon/icon_equipment_frost_staff.png',
    steel_bow: 'image/icon/icon_equipment_steel_bow.png',
    dragon_fang: 'image/icon/icon_equipment_dragonfang_sword.png',
    leather_armor: 'image/icon/icon_equipment_leather_armor.png',
    knight_plate: 'image/icon/icon_equipment_knight_armor.png',
    shadow_robe: 'image/icon/icon_equipment_shadow_robe.png',
    lucky_ring: 'image/icon/icon_equipment_luck_ring.png',
    vampire_necklace: 'image/icon/icon_equipment_vampire_necklace.png',
    mana_bracelet: 'image/icon/icon_equipment_magic_bracelet.png',
  },
  pet: {
    baby_slime: 'image/icon/icon_pet_slime.png',
    flame_spirit: 'image/icon/icon_pet_flame_spirit.png',
    frost_wolf: 'image/icon/icon_pet_ice_wolf.png',
    fairy: 'image/icon/icon_pet_fairy.png',
    griffin: 'image/icon/icon_pet_griffin.png',
  },
  // 클래스(외형) 고유 Q스킬 — CLASS_KITS[x].qSkill.id 기준
  classQ: {
    warriorQ: 'image/icon/icon_q_flash_slash.png',
    mageQ: 'image/icon/icon_q_fireball.png',
    rogueQ: 'image/icon/icon_q_shuriken.png',
    clericQ: 'image/icon/icon_q_spirit.png',
  },
  // 전직 전 기본 상태(BASE_JOB_NODE)의 Q 아이콘. 전직 아이콘은
  // ADVANCED_JOBS[x].iconImg(advancement-data.js)를 직접 쓴다.
  job: {
    base_Q: 'image/icon/icon_skill_smash.png',
  },
  currency: {
    diamond: 'image/icon/icon_currency_diamond.png',
  },
};

// emoji 대신 <img>로 아이콘을 그릴 때 공통으로 쓰는 헬퍼. src가 없으면(매핑 안 된
// 항목) 이모지로 조용히 폴백한다 — 호출부를 분기 없이 단순하게 유지하기 위함.
function iconHtml(src, emojiFallback, extraClass) {
  if (!src) return emojiFallback || '';
  return `<img class="icon-img${extraClass ? ' ' + extraClass : ''}" src="${src}" alt="">`;
}

// ---------------------------------------------------------------------
// 전투 이펙트(VFX) — image/vfx2/*.png (image/vfx/ 생성 원본을 축소한 실사용본).
// 정지 이미지는 VFX, 여러 장짜리(터짐/장판) 애니메이션은 VFX_ANIM에 프레임 배열로 둔다.
// 각 스킬 정의(CLASS_KITS/EQUIPMENT_POOL/ADVANCED_JOBS)의 vfx/vfxAnim/vfxBurst/groundVfx*
// 필드가 이 키를 가리킨다 — game.js가 실제로 그린다.
// ---------------------------------------------------------------------
const VFX = {
  slime_king_land_splash: 'image/effects_boss_20260914/slime_king_land_splash.png',
  slime_king_ring_texture: 'image/effects_boss_20260914/slime_king_ring_texture.png',
  attack_sword_swoosh: 'image/vfx2/attack_sword_swoosh.png',
  attack_arcane_bolt: 'image/vfx2/attack_arcane_bolt.png',
  attack_dagger_spark: 'image/vfx2/attack_dagger_spark.png',
  attack_holy_ring: 'image/vfx2/attack_holy_ring.png',
  q_flash_beam: 'image/vfx2/q_flash_beam.png',
  q_fireball: 'image/vfx2/q_fireball.png',
  q_shuriken: 'image/vfx2/q_shuriken.png',
  q_guardian_spirit: 'image/vfx2/q_guardian_spirit.png',
  e_dash_trail: 'image/vfx2/e_dash_trail.png',
  e_earth_shockwave: 'image/vfx2/e_earth_shockwave.png',
  e_arrow_fall: 'image/vfx2/e_arrow_fall.png',
  e_mana_burst: 'image/vfx2/e_mana_burst.png',
  e_meteor: 'image/vfx2/e_meteor.png',
  w_flame_slash: 'image/vfx2/w_flame_slash.png',
  w_frost_burst: 'image/vfx2/w_frost_burst.png',
  w_frost_ground: 'image/vfx2/w_frost_ground.png',
  w_piercing_arrow: 'image/vfx2/w_piercing_arrow.png',
  w_dragon_roar: 'image/vfx2/w_dragon_roar.png',
  passive_shield_spark: 'image/vfx2/passive_shield_spark.png',
  passive_lifesteal: 'image/vfx2/passive_lifesteal.png',
  r_lightning_bolt: 'image/vfx2/r_lightning_bolt.png',
};
const VFX_ANIM = {
  q_fire_explosion: [1, 2, 3, 4].map(i => `image/vfx2/q_fire_explosion_0${i}.png`),
  q_fire_ground: [1, 2, 3].map(i => `image/vfx2/q_fire_ground_0${i}.png`),
  e_meteor_explosion: [1, 2, 3, 4].map(i => `image/vfx2/e_meteor_explosion_0${i}.png`),
  r_lightning_spark: [1, 2, 3, 4].map(i => `image/vfx2/r_lightning_spark_0${i}.png`),
};

// ---------------------------------------------------------------------
// 클래스 전투 세트 — 외형(전사/마법사/도적/성직자) 선택에 따라
// 기본공격 방식과 Q 고유 스킬이 통째로 바뀐다.
// (E 스킬은 지금까지처럼 캐릭터탭의 전직 트리에서 별도로 얻는다)
// ---------------------------------------------------------------------
const CLASS_KITS = {
  warrior: {
    basicAttack: {
      type: 'melee_arc', interval: 1.0, range: 130, arcDeg: 110, dmgMult: 1.6,
      label: '대검 휘두르기', desc: '느리지만 전방 부채꼴 범위를 베는 근접 공격',
      vfx: 'attack_sword_swoosh', castFraction: 0.35,
    },
    qSkill: {
      id: 'warriorQ', name: '일섬', icon: '💫', cdMax: 6, dmgMult: 3.0, range: 480, width: 42,
      desc: '정면 일직선상의 모든 적을 벤다. (재사용 6초)',
      vfx: 'q_flash_beam',
    },
  },
  mage: {
    basicAttack: {
      type: 'projectile', interval: 0.55, range: 340, dmgMult: 1.0, speed: 620,
      label: '마력탄 발사', desc: '가장 가까운 적에게 마력탄을 발사하는 원거리 공격',
      vfx: 'attack_arcane_bolt', castFraction: 0.45,
    },
    qSkill: {
      id: 'mageQ', name: '파이어볼', icon: '🔥', cdMax: 7, dmgMult: 2.5, speed: 520,
      splashMult: 1.8, splashRadius: 130, burnDps: 0.45, burnRadius: 100, burnDur: 4,
      desc: '적중 시 폭발하고 바닥에 화염 장판을 남긴다. (재사용 7초)',
      vfx: 'q_fireball', vfxAnim: 'q_fire_explosion', groundVfxAnim: 'q_fire_ground',
    },
  },
  rogue: {
    basicAttack: {
      type: 'fast_stab', interval: 0.25, range: 100, dmgMult: 0.55,
      label: '빠른 찌르기', desc: '사거리는 짧지만 매우 빠르게 연타하는 근접 공격',
      vfx: 'attack_dagger_spark', castFraction: 0.2,
    },
    qSkill: {
      id: 'rogueQ', name: '표창난사', icon: '🗡️', cdMax: 5, dmgMult: 0.9, count: 5, coneDeg: 55, pierce: 1, speed: 640,
      desc: '전방 원뿔 범위에 수리검을 흩뿌린다. (재사용 5초)',
      vfx: 'q_shuriken',
    },
  },
  cleric: {
    basicAttack: {
      type: 'holy_pulse', interval: 1.3, range: 220, dmgMult: 0.9,
      label: '성스러운 파동', desc: '느리지만 주변의 모든 적을 타격하는 광역 공격',
      vfx: 'attack_holy_ring', castFraction: 0.3,
    },
    qSkill: {
      id: 'clericQ', name: '정령 소환', icon: '👻', cdMax: 16, dur: 6, extraHits: 1, healPerSec: 4,
      desc: '6초간 정령을 소환해 공격 타수를 늘리고 체력을 회복한다. (재사용 16초)',
      vfx: 'q_guardian_spirit',
    },
    shieldMaxPct: 0.25, shieldRegenDelay: 3, shieldRegenPerSec: 4,
  },
};

// ---------------------------------------------------------------------
// 몬스터 스프라이트 — image/*_walk|attack_strip_256.png (가로 4프레임 x 256, 투명배경)
// 방향 구분 없이 정면 1세트. 이동 시 진행 방향으로 좌우 반전만 한다.
// ---------------------------------------------------------------------
const MONSTER_FRAME = 256;
const MONSTER_FRAMES = 4;
const MONSTER_TYPES = {
  poison_slime: { name: '독 슬라임', walk: 'image/poison_slime_20260914/walk_strip_256.png', attack: 'image/poison_slime_20260914/attack_strip_256.png' },
  skeleton_archer: { name: '스켈레톤 궁병', walk: 'image/skeleton_archer_20260914/walk_strip_256.png', attack: 'image/skeleton_archer_20260914/attack_strip_256.png' },
  tree: { name: '나무 몬스터', walk: 'image/tree_monster_20260914/walk_strip_256.png', attack: 'image/tree_monster_20260914/attack_strip_256.png' },
  slime:    { name: '슬라임',   walk: 'image/slime_walk_strip_256.png',    attack: 'image/slime_attack_strip_256.png' },
  bat:      { name: '박쥐',     walk: 'image/bat_walk_strip_256.png',      attack: 'image/bat_attack_strip_256.png' },
  goblin:   { name: '고블린',   walk: 'image/goblin_walk_strip_256.png',   attack: 'image/goblin_attack_strip_256.png' },
  skeleton: { name: '스켈레톤', walk: 'image/skeleton_walk_strip_256.png', attack: 'image/skeleton_attack_strip_256.png' },
  demon_archer: { name: '마족 궁수', walk: 'image/monsters_ready_20260914/demon_archer/walk_strip_256.png', attack: 'image/monsters_ready_20260914/demon_archer/attack_strip_256.png' },
  fallen_mace: { name: '타락한 철퇴병', walk: 'image/monsters_ready_20260914/fallen_mace/walk_strip_256.png', attack: 'image/monsters_ready_20260914/fallen_mace/attack_strip_256.png' },
  demon_warrior: { name: '마족 전사', walk: 'image/monsters_ready_20260914/demon_warrior/walk_strip_256.png', attack: 'image/monsters_ready_20260914/demon_warrior/attack_strip_256.png' },
  corrupt_official: { name: '탐관오리', walk: 'image/monsters_ready_20260914/corrupt_official/walk_strip_256.png', attack: 'image/monsters_ready_20260914/corrupt_official/attack_strip_256.png' },
  demon_slime: { name: '악마 슬라임', walk: 'image/monsters_ready_20260914/demon_slime/walk_strip_256.png', attack: 'image/monsters_ready_20260914/demon_slime/attack_strip_256.png' },
  succubus: { name: '서큐버스', walk: 'image/monsters_ready_20260914/succubus/walk_strip_256.png', attack: 'image/monsters_ready_20260914/succubus/attack_strip_256.png' },
};

function stageMonsterPool(stage, progress = 1) {
  if (stage <= 1) return progress >= 0.5 ? ['slime', 'slime', 'tree'] : ['slime', 'slime'];
  if (stage === 2) return ['slime', 'bat', 'poison_slime'];
  if (stage === 3) return ['bat', 'goblin'];
  if (stage === 4) return ['goblin', 'skeleton', 'skeleton_archer'];
  return ['goblin', 'skeleton', 'bat', 'skeleton_archer'];
}

// 스테이지마다 고유 보스 등장. 8스테이지부터 7종을 순환한다.
const BOSS_TIERS = [
  { id: 'slime_king', name: '슬라임 왕', hp: .7, speed: 48 },
  { id: 'bat_queen', name: '박쥐 여왕', hp: .8, speed: 80 },
  { id: 'goblin_bomber', name: '고블린 폭탄왕', hp: .9, speed: 64 },
  { id: 'skeleton_commander', name: '해골 기사단장', hp: 1, speed: 56 },
  { id: 'fallen_cleric', name: '타락한 성직자', hp: 1, speed: 48 },
  { id: 'ancient_golem', name: '고대 석상 골렘', hp: 1.25, speed: 38 },
  { id: 'vampire_lord', name: '흡혈귀 군주', hp: 1.1, speed: 68 },
];
BOSS_TIERS.forEach(b => { b.file = `image/boss_expansion_20260912/${b.id}.png`; });
function bossTierForStage(stage) {
  return BOSS_TIERS[(stage - 1) % BOSS_TIERS.length];
}

// ---------------------------------------------------------------------
// 스테이지 배경 — image/floor/*.png(시임리스 바닥 타일), image/wall/*.png(벽 타일)
// stageMonsterPool()과 동일한 등급 기준으로 바이옴을 맞춘다.
// ---------------------------------------------------------------------
// 지역 이름만 지정한다. 배경 선택과 스테이지 진행 규칙은 기존대로 유지한다.
const STAGE_NAMES = {
  1: '이끼 낀 습지 던전',
  2: '어두운 동굴',
  3: '고블린 소굴',
  4: '지하 묘지',
  5: '부패한 왕도',
  6: '왕도 초입',
  7: '성내',
};

const STAGE_FLOOR_TILES = [
  'image/floor/floor_01_moss.png',    // 1: 슬라임 — 이끼 낀 습지 던전
  'image/floor/floor_02_cave.png',    // 2: 슬라임+박쥐 — 어두운 동굴
  'image/floor/floor_03_goblin.png',  // 3: 박쥐+고블린 — 고블린 소굴
  'image/floor/floor_04_crypt.png',   // 4: 고블린+스켈레톤 — 지하 묘지
  'image/floor/floor_05_vampire.png', // 5: 부패한 왕도, 6: 왕도 초입, 7: 성내 — 기존 배경 공용
];
function stageFloorTile(stage) {
  const idx = clampInt(stage - 1, 0, STAGE_FLOOR_TILES.length - 1);
  return STAGE_FLOOR_TILES[idx];
}
function clampInt(v, min, max) { return Math.max(min, Math.min(max, v)); }


const STAGE_WALL_TILES = {
  normal: 'image/wall/wall_01_stone.png',
  vampire: 'image/wall/wall_02_fortress.png',
};
function stageWallTile(stage) {
  return stage >= 5 ? STAGE_WALL_TILES.vampire : STAGE_WALL_TILES.normal;
}

function weightedPick(pool) {
  const total = pool.reduce((s, it) => s + RARITY[it.rarity].weight, 0);
  let r = Math.random() * total;
  for (const it of pool) {
    r -= RARITY[it.rarity].weight;
    if (r <= 0) return it;
  }
  return pool[pool.length - 1];
}
