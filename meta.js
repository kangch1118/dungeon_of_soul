'use strict';

/* =========================================================================
   meta.js — 로비(캐릭터/장비/상점/펫) 영구 진행도. localStorage 에 저장.
   ========================================================================= */

const SAVE_KEY = 'dungeon_of_soul_save_v1';

function defaultMeta() {
  return {
    gold: 10000,
    soul: 10000,
    crystal: 0, // 미구현
    charLevel: 1,
    charExp: 0,
    job: { tier1: null, tier2: null },
    advancements: { owned: [], selected: {} },
    maxStageCleared: 0,
    equipment: { starter_dagger: { level: 0 } }, // id -> { level }
    equippedWeapon: 'starter_dagger',
    equippedArmor: null,
    equippedAccessory: null,
    pets: {}, // id -> true
    equippedPet: null,
    appearance: 'warrior', // 코스메틱 외형 (직업/스탯과 무관)
  };
}

let saveWarning = '';
function setSaveWarning(message) { saveWarning=message;window.dispatchEvent(new Event('storage-warning')); }
function normalizeMeta(input) {
  const base=defaultMeta(),valid=input&&typeof input==='object'&&!Array.isArray(input)?input:{};
  const number=(key,fallback,max=1e9,min=0)=>Number.isFinite(valid[key])?Math.min(max,Math.max(min,Math.floor(valid[key]))):fallback;
  for(const key of ['gold','soul','crystal','charExp','maxStageCleared'])base[key]=number(key,base[key]);
  base.charLevel=number('charLevel',1,10000,1);
  base.charExp=Math.min(base.charExp,charExpToNext(base.charLevel)-1);
  if(APPEARANCE_POOL.some(a=>a.id===valid.appearance))base.appearance=valid.appearance;
  base.advancements.owned = ADVANCED_JOBS.filter(j=>Array.isArray(valid.advancements?.owned)&&valid.advancements.owned.includes(j.id)).map(j=>j.id);
  for(const j of ADVANCED_JOBS)if(base.advancements.owned.includes(j.id)&&valid.advancements?.selected?.[j.base]===j.id)base.advancements.selected[j.base]=j.id;
  const tier1=JOB_TIER1.find(j=>j.id===valid.job?.tier1);
  if(tier1){base.job.tier1=tier1.id;const tier2=JOB_TIER2.find(j=>j.id===valid.job?.tier2&&j.upgradeOf===tier1.id);if(tier2)base.job.tier2=tier2.id;}
  if(valid.equipment&&typeof valid.equipment==='object')for(const def of EQUIPMENT_POOL){const item=valid.equipment[def.id];if(item&&Number.isFinite(item.level))base.equipment[def.id]={level:Math.max(0,Math.min(10,Math.floor(item.level)))};}
  for(const [key,category] of [['equippedWeapon','weapon'],['equippedArmor','armor'],['equippedAccessory','accessory']]){
    if(valid[key]===null)base[key]=null;
    else if(EQUIPMENT_POOL.some(e=>e.id===valid[key]&&e.category===category)&&base.equipment[valid[key]])base[key]=valid[key];
  }
  for(const pet of PET_POOL)if(valid.pets?.[pet.id]===true)base.pets[pet.id]=true;
  base.equippedPet=base.pets[valid.equippedPet]?valid.equippedPet:null;
  return base;
}
function loadMeta() {
  let raw=null;
  try {
    raw=localStorage.getItem(SAVE_KEY);if(!raw)return defaultMeta();
    const parsed=JSON.parse(raw),clean=normalizeMeta(parsed);
    if(JSON.stringify(clean)!==JSON.stringify(parsed)) {
      if(!localStorage.getItem(SAVE_KEY+'_recovery'))localStorage.setItem(SAVE_KEY+'_recovery',raw);
      saveWarning='저장 데이터의 잘못된 항목을 복구했습니다. 복구 전 데이터도 보관했습니다.';
    }
    return clean;
  }catch(_){
    try{if(raw&&!localStorage.getItem(SAVE_KEY+'_recovery'))localStorage.setItem(SAVE_KEY+'_recovery',raw);}catch(_){}
    saveWarning='저장 데이터를 읽지 못했습니다. 기존 기록을 덮어쓰지 않도록 저장이 보류됩니다.';
    return defaultMeta();
  }
}
let meta = loadMeta();
function saveMeta() {
  if(saveWarning.includes('저장이 보류'))return false;
  try {localStorage.setItem(SAVE_KEY,JSON.stringify(meta));if(saveWarning.includes('저장 공간'))setSaveWarning('');return true;}
  catch(_){setSaveWarning('진행도를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.');return false;}
}

/* -------------------------------------------------------------------------
   캐릭터 경험치 / 레벨
   ------------------------------------------------------------------------- */

function gainCharExp(amount) {
  meta.charExp += amount;
  let leveled = false;
  while (meta.charExp >= charExpToNext(meta.charLevel)) {
    meta.charExp -= charExpToNext(meta.charLevel);
    meta.charLevel++;
    leveled = true;
  }
  saveMeta();
  return leveled;
}

function trainWithSoul() {
  if (meta.soul < SHOP_COSTS.trainSoulCost) return false;
  meta.soul -= SHOP_COSTS.trainSoulCost;
  gainCharExp(SHOP_COSTS.trainExpAmount);
  saveMeta();
  return true;
}

/* -------------------------------------------------------------------------
   전직
   ------------------------------------------------------------------------- */

function setAppearance(id) {
  if (!APPEARANCE_POOL.find(a => a.id === id)) return;
  meta.appearance = id;
  saveMeta();
}

function canChooseTier1() { return meta.charLevel >= 5 && !meta.job.tier1; }
function chooseAdvancement(id) {
  const job=ADVANCED_JOBS.find(j=>j.id===id&&j.base===meta.appearance);
  if(!job||meta.charLevel<5)return false;
  const prior=JSON.stringify(meta.advancements),gold=meta.gold,soul=meta.soul;
  if(!meta.advancements.owned.includes(id)){
    if(meta.gold<job.cost.gold||meta.soul<job.cost.soul)return false;
    meta.gold-=job.cost.gold;meta.soul-=job.cost.soul;meta.advancements.owned.push(id);
  }
  meta.advancements.selected[job.base]=id;
  if(!saveMeta()){meta.advancements=JSON.parse(prior);meta.gold=gold;meta.soul=soul;return false;}
  return true;
}
function canChooseTier2() {
  return meta.charLevel >= 15 && meta.job.tier1 && !meta.job.tier2;
}

function chooseTier1(jobId) {
  const node = JOB_TIER1.find(j => j.id === jobId);
  if (!node || !canChooseTier1()) return false;
  if (meta.gold < node.cost.gold || meta.soul < node.cost.soul) return false;
  meta.gold -= node.cost.gold;
  meta.soul -= node.cost.soul;
  meta.job.tier1 = jobId;
  saveMeta();
  return true;
}

function chooseTier2() {
  if (!canChooseTier2()) return false;
  const node = JOB_TIER2.find(j => j.upgradeOf === meta.job.tier1);
  if (!node) return false;
  if (meta.gold < node.cost.gold || meta.soul < node.cost.soul) return false;
  meta.gold -= node.cost.gold;
  meta.soul -= node.cost.soul;
  meta.job.tier2 = node.id;
  saveMeta();
  return true;
}

/* -------------------------------------------------------------------------
   장비
   ------------------------------------------------------------------------- */

function ownedEquipmentList() {
  return Object.keys(meta.equipment).map(id => ({
    def: EQUIPMENT_POOL.find(e => e.id === id),
    level: meta.equipment[id].level,
  })).filter(e => e.def);
}

function equipItem(id) {
  const def = EQUIPMENT_POOL.find(e => e.id === id);
  if (!def || !meta.equipment[id]) return;
  if (def.category === 'weapon') meta.equippedWeapon = id;
  else if (def.category === 'armor') meta.equippedArmor = id;
  else if (def.category === 'accessory') meta.equippedAccessory = id;
  saveMeta();
}

function unequipItem(category) {
  if (category === 'weapon') meta.equippedWeapon = null;
  else if (category === 'armor') meta.equippedArmor = null;
  else if (category === 'accessory') meta.equippedAccessory = null;
  saveMeta();
}

const UPGRADE_MAX_LEVEL = 10;
function upgradeCost(level) { return Math.round(40 * Math.pow(1.35, level)); }

function upgradeEquipment(id) {
  const owned = meta.equipment[id];
  if (!owned) return false;
  if (owned.level >= UPGRADE_MAX_LEVEL) return false;
  const cost = upgradeCost(owned.level);
  if (meta.gold < cost) return false;
  meta.gold -= cost;
  owned.level++;
  saveMeta();
  return true;
}

function gachaEquipment() {
  if (meta.gold < SHOP_COSTS.equipGacha) return null;
  meta.gold -= SHOP_COSTS.equipGacha;
  const drop = weightedPick(EQUIPMENT_POOL.filter(e => !e.starter));
  let duplicate = false;
  if (meta.equipment[drop.id]) {
    duplicate = true;
    meta.gold += Math.round(SHOP_COSTS.equipGacha * 0.4); // 중복 시 골드 일부 환급
  } else {
    meta.equipment[drop.id] = { level: 0 };
  }
  saveMeta();
  return { drop, duplicate };
}

/* -------------------------------------------------------------------------
   펫
   ------------------------------------------------------------------------- */

function petsUnlocked() { return meta.maxStageCleared >= PET_UNLOCK_STAGE; }

function ownedPetList() {
  return Object.keys(meta.pets).map(id => PET_POOL.find(p => p.id === id)).filter(Boolean);
}

function equipPet(id) {
  if (!meta.pets[id]) return;
  meta.equippedPet = id;
  saveMeta();
}

function unequipPet() { meta.equippedPet = null; saveMeta(); }

function gachaPet() {
  if (!petsUnlocked()) return null;
  if (meta.gold < SHOP_COSTS.petGacha) return null;
  meta.gold -= SHOP_COSTS.petGacha;
  const drop = weightedPick(PET_POOL);
  const duplicate = !!meta.pets[drop.id];
  if (duplicate) {
    meta.gold += Math.round(SHOP_COSTS.petGacha * 0.4);
  } else {
    meta.pets[drop.id] = true;
  }
  saveMeta();
  return { drop, duplicate };
}

/* -------------------------------------------------------------------------
   상점 — 경험치 물약
   ------------------------------------------------------------------------- */

function buyExpPotion() {
  if (meta.gold < SHOP_COSTS.expPotion) return false;
  meta.gold -= SHOP_COSTS.expPotion;
  gainCharExp(SHOP_COSTS.expPotionAmount);
  saveMeta();
  return true;
}

/* -------------------------------------------------------------------------
   런(스테이지)에 사용할 최종 스탯 / 스킬 로드아웃 계산
   ------------------------------------------------------------------------- */

function getComputedStats() {
  const s = { ...BASE_STATS, defPct: 0, lifesteal: 0, goldMult: 1, soulMult: 1, dmgReductionChance: 0, dmgReductionAmount: 0 };

  s.hp += GROWTH_PER_LEVEL.hp * (meta.charLevel - 1);
  s.atk += GROWTH_PER_LEVEL.atk * (meta.charLevel - 1);
  s.def += GROWTH_PER_LEVEL.def * (meta.charLevel - 1);

  const jobNode = getJobNode(meta.job);
  applyStatBonus(s, jobNode.statBonus);

  for (const id of [meta.equippedWeapon, meta.equippedArmor, meta.equippedAccessory]) {
    if (!id) continue;
    const owned = meta.equipment[id];
    const def = EQUIPMENT_POOL.find(e => e.id === id);
    if (!def || !owned) continue;
    const mult = 1 + owned.level * 0.12;
    const scaled = {};
    for (const k in def.stat) scaled[k] = def.stat[k] * mult;
    applyStatBonus(s, scaled);
    if (def.skill && def.skill.passiveOnly) {
      if (def.id === 'knight_plate') { s.dmgReductionChance = 0.25; s.dmgReductionAmount = 0.4; }
    }
  }

  if (meta.equippedPet) {
    const pet = PET_POOL.find(p => p.id === meta.equippedPet);
    if (pet && pet.type === 'passive' && pet.goldMult) s.goldMult += pet.goldMult;
  }

  s.speed *= 1 + (sumStat('speedMult') || 0);
  return s;
}

function applyStatBonus(target, bonus) {
  for (const k in bonus) {
    if (k === 'speedMult') continue; // 별도 처리
    target[k] = (target[k] || 0) + bonus[k];
  }
}

function sumStat(key) {
  let total = 0;
  for (const id of [meta.equippedWeapon, meta.equippedArmor, meta.equippedAccessory]) {
    if (!id) continue;
    const def = EQUIPMENT_POOL.find(e => e.id === id);
    if (def && meta.equipment[id] && def.stat[key]) total += def.stat[key] * (1 + meta.equipment[id].level * .12);
  }
  return total;
}

function getWeaponSkill() {
  if (!meta.equippedWeapon) return null;
  const def = EQUIPMENT_POOL.find(e => e.id === meta.equippedWeapon);
  if (!def || !def.skill || def.skill.passiveOnly) return null;
  const owned = meta.equipment[meta.equippedWeapon];
  const lvlMult = 1 + (owned ? owned.level : 0) * 0.12;
  return { ...def.skill, dmgMult: def.skill.dmgMult * lvlMult };
}

function getJobSkills() {
  return getJobNode(meta.job); // { qSkill, eSkill, ... }
}

function getEquippedPetDef() {
  if (!meta.equippedPet) return null;
  return PET_POOL.find(p => p.id === meta.equippedPet) || null;
}

/* -------------------------------------------------------------------------
   진행도 정산 — 스테이지 클리어 시 / 사망 시 모두 이 함수로 반영한다.
   (골드·영혼은 즉시 로비 재화로 귀속되고, 캐릭터 경험치도 함께 오른다)
   ------------------------------------------------------------------------- */

function settleProgress({ gold, soul, stage, cleared, kills = 0, killTarget = 1 }) {
  meta.gold += gold;
  meta.soul += soul;
  if (cleared && stage > meta.maxStageCleared) meta.maxStageCleared = stage;
  // 미클리어 경험치는 처치 목표 달성 비율만큼 지급한다. 무전투 복귀는 0.
  const exp = cleared ? stage * 12 : stage * 6 * Math.min(1, Math.max(0, kills) / Math.max(1, killTarget));
  if (exp > 0) gainCharExp(Math.floor(exp));
  saveMeta();
}
