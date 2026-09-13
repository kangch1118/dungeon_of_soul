'use strict';

/* =========================================================================
   lobby.js — 로비 화면(캐릭터/장비/게임/상점/펫 5개 탭) 렌더링 & 상호작용
   ========================================================================= */

/* -------------------------------------------------------------------------
   화면 전환 (타이틀 <-> 로비)
   ------------------------------------------------------------------------- */

document.getElementById('btn-start').addEventListener('click', () => {
  playBgm('lobby');
  showScreen('lobby');
  renderLobbyAll();
});

document.getElementById('btn-reset-game').addEventListener('click', () => {
  if (!window.confirm('모든 진행도와 재화를 초기화할까요?')) return;
  localStorage.removeItem('dungeon_of_soul_save_v1');
  localStorage.removeItem('dungeon_of_soul_save_v1_recovery');
  meta = loadMeta();
  stopBgm();
  playBgm('lobby');
  showScreen('lobby');
  renderLobbyAll();
});

document.getElementById('btn-lobby-title').addEventListener('click', () => {
  stopBgm();
  showScreen('title');
});

document.getElementById('btn-quit-title').addEventListener('click', () => {
  playBgm('lobby');
  document.getElementById('pause-modal').classList.add('hidden');
  settleAndQuitToLobby();
  showScreen('lobby');
  renderLobbyAll();
});

document.getElementById('btn-gameover-title').addEventListener('click', () => {
  playBgm('lobby');
  document.getElementById('gameover-modal').classList.add('hidden');
  showScreen('lobby');
  renderLobbyAll();
});

/* -------------------------------------------------------------------------
   탭 전환
   ------------------------------------------------------------------------- */

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

function renderLobbyAll() {
  document.getElementById('lobby-gold').textContent = meta.gold;
  document.getElementById('lobby-soul').textContent = meta.soul;
  renderCharacterTab();
  renderEquipmentTab();
  renderGameTab();
  renderShopTab();
}

function rarityChip(rarityId) {
  const r = RARITY[rarityId];
  return `<span class="item-rarity" style="color:${r.color}">${r.label}</span>`;
}

/* -------------------------------------------------------------------------
   캐릭터 탭
   ------------------------------------------------------------------------- */

function renderCharacterTab() {
  const el = document.getElementById('tab-character');
  const cs = getComputedStats();
  const jobNode = getJobNode(meta.job);
  const advanced = selectedAdvancement();
  const baseKit = CLASS_KITS[meta.appearance] || CLASS_KITS.mage;
  const classKit = advanced ? {...baseKit,basicAttack:{...baseKit.basicAttack,label:advanced.basic,desc:advanced.passive},qSkill:{...baseKit.qSkill,name:advanced.q,desc:advQDescription(advanced.id)}} : baseKit;
  const appearanceDef = APPEARANCE_POOL.find(a => a.id === meta.appearance) || APPEARANCE_POOL[0];
  const shieldText = classKit.shieldMaxPct
    ? `최대체력의 ${Math.round(classKit.shieldMaxPct * 100)}% (${Math.round(cs.hp * classKit.shieldMaxPct)})`
    : '없음';
  const expNext = charExpToNext(meta.charLevel);
  const expRatio = Math.min(1, meta.charExp / expNext) * 100;

  let jobButtonsHtml = '';
  if (canChooseTier1()) {
    jobButtonsHtml = `<button class="menu-btn small" id="btn-open-job">1차 전직하기</button>`;
  } else if (canChooseTier2()) {
    jobButtonsHtml = `<button class="menu-btn small" id="btn-open-job">2차 전직하기</button>`;
  } else if (!meta.job.tier1) {
    jobButtonsHtml = `<span class="lock-note">캐릭터 Lv.5 달성 시 1차 전직 가능</span>`;
  } else if (!meta.job.tier2) {
    jobButtonsHtml = `<span class="lock-note">캐릭터 Lv.15 달성 시 2차 전직 가능</span>`;
  } else {
    jobButtonsHtml = `<span class="lock-note" style="color:#9be89b;">최종 전직 완료</span>`;
  }

  jobButtonsHtml = `<button class="menu-btn small" id="btn-open-job">${advanced?'전직 변경 / 확인':'전직 3종 살펴보기'}</button>`;
  el.innerHTML = `
    <div class="lobby-section">
      <h3>레벨 / 성장</h3>
      <div class="level-row">
        <div class="lv-badge">Lv.${meta.charLevel}</div>
        <div class="bar exp-bar">
          <div class="bar-fill exp-fill" style="width:${expRatio}%"></div>
          <span class="bar-text">${meta.charExp} / ${expNext}</span>
        </div>
        <button class="menu-btn small" id="btn-train-soul">🔮 영혼으로 수련 (${SHOP_COSTS.trainSoulCost})</button>
      </div>
      <p style="font-size:12px;color:#9fb8d8;margin:4px 0 0;">스테이지를 클리어하거나 영혼을 사용해 캐릭터 레벨을 올리세요. 레벨이 오르면 기본 능력치가 영구히 성장합니다.</p>
    </div>

    <div class="lobby-section">
      <h3>기본 능력치</h3>
      <div class="stat-grid">
        <div class="stat-item"><span class="stat-label">체력</span><span class="stat-value">${Math.round(cs.hp)}</span></div>
        <div class="stat-item"><span class="stat-label">이동속도</span><span class="stat-value">${Math.round(cs.speed)}</span></div>
        <div class="stat-item"><span class="stat-label">공격력</span><span class="stat-value">${Math.round(cs.atk)}</span></div>
        <div class="stat-item"><span class="stat-label">방어력</span><span class="stat-value">${Math.round(cs.def)}</span></div>
        <div class="stat-item"><span class="stat-label">치명타 확률</span><span class="stat-value">${Math.round(cs.critChance * 100)}%</span></div>
        <div class="stat-item"><span class="stat-label">치명타 피해</span><span class="stat-value">${Math.round(cs.critMult * 100)}%</span></div>
        <div class="stat-item"><span class="stat-label">흡혈</span><span class="stat-value">${Math.round(cs.lifesteal * 100)}%</span></div>
        <div class="stat-item"><span class="stat-label">골드 획득</span><span class="stat-value">+${Math.round((cs.goldMult - 1) * 100)}%</span></div>
        <div class="stat-item"><span class="stat-label">보호막</span><span class="stat-value">${shieldText}</span></div>
      </div>
    </div>

    <div class="lobby-section">
      <h3>기본 클래스 / 전투 스타일</h3>
      <div class="job-row" style="margin-bottom:12px;">
        <div class="portrait-frame">${advanced?advPortraitHtml(advanced):`<img src="${appearanceDef.portrait}" alt="${appearanceDef.name}">`}</div>
        <div>
          <div class="job-name">${appearanceDef.icon} ${advanced?advanced.name:appearanceDef.name}</div>
          <div class="job-tier">${classKit.basicAttack.label} · Q ${classKit.qSkill.name}</div>
        </div>
      </div>
      <p style="font-size:12px;color:#9a8a68;margin:0 0 10px;">기본 클래스마다 3개 전직이 있습니다. 해금한 전직은 로비에서 무료로 바꿀 수 있습니다.</p>
      <div class="item-grid" id="appearance-grid"></div>
      <div class="stat-grid" style="margin-top:12px;">
        <div class="stat-item"><span class="stat-label">기본공격</span><span class="stat-value">${classKit.basicAttack.label}</span></div>
        <div class="stat-item"><span class="stat-label">Q</span><span class="stat-value">${iconHtml(advanced?.iconImg || ICON_IMAGES.classQ[classKit.qSkill.id], classKit.qSkill.icon, 'icon-img-inline')} ${classKit.qSkill.name}</span></div>
      </div>
      <p style="font-size:12px;color:#cbbf9d;margin:8px 0 0;">${classKit.basicAttack.desc}<br>${classKit.qSkill.desc}</p>
    </div>

    <div class="lobby-section">
      <h3>전직 — 외형 · 기본 공격 · Q · E · 패시브</h3>
      <div class="job-row">
        <div class="job-current">
          <span class="job-icon">${jobNode.icon || '🌱'}</span>
          <div>
            <div class="job-name">${jobNode.name}</div>
            <div class="job-tier">Tier ${jobNode.tier}</div>
          </div>
        </div>
        ${jobButtonsHtml}
      </div>
      <div class="stat-grid" style="margin-top:12px;">
        <div class="stat-item"><span class="stat-label">E</span><span class="stat-value">${jobNode.eSkill ? iconHtml(advanced?.iconImg || ICON_IMAGES.job[jobNode.id + '_E'], jobNode.eSkill.icon, 'icon-img-inline') + ' ' + jobNode.eSkill.name : '미보유 (전직 필요)'}</span></div>
      </div>
    </div>
  `;

  document.getElementById('btn-train-soul').addEventListener('click', () => {
    if (trainWithSoul()) { renderCharacterTab(); renderLobbyCurrency(); }
  });
  const jobBtn = document.getElementById('btn-open-job');
  if (jobBtn) jobBtn.addEventListener('click', openJobModal);

  const appearanceGrid = document.getElementById('appearance-grid');
  appearanceGrid.innerHTML = APPEARANCE_POOL.map(a => `
    <button type="button" class="item-card" data-appearance="${a.id}">
      ${meta.appearance === a.id ? '<span class="item-equipped-badge">선택중</span>' : ''}
      <img class="appearance-portrait" src="${a.portrait}" alt="${a.name}">
      <div class="item-name">${a.icon} ${a.name}</div>
    </button>
  `).join('');
  appearanceGrid.querySelectorAll('.item-card').forEach(card => {
    card.addEventListener('click', () => {
      setAppearance(card.dataset.appearance);
      renderCharacterTab();
      renderGameTab();
    });
  });
}

function renderLobbyCurrency() {
  document.getElementById('lobby-gold').textContent = meta.gold;
  document.getElementById('lobby-soul').textContent = meta.soul;
}

/* -------------------------------------------------------------------------
   전직 모달
   ------------------------------------------------------------------------- */

const jobModal = document.getElementById('job-modal');
document.getElementById('btn-job-cancel').addEventListener('click', () => jobModal.classList.add('hidden'));

function openLegacyJobModal() {
  const row = document.getElementById('job-card-row');
  row.innerHTML = '';

  if (canChooseTier1()) {
    document.getElementById('job-modal-sub').textContent = '1차 전직 — 직업을 선택하세요';
    JOB_TIER1.forEach(job => {
      const affordable = meta.gold >= job.cost.gold && meta.soul >= job.cost.soul;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'skill-card' + (affordable ? '' : ' locked');
      card.innerHTML = `
        <div class="card-icon">${iconHtml(ICON_IMAGES.job[job.id + '_Q'], job.icon)}</div>
        <div class="card-name">${job.name}</div>
        <div class="card-desc">${job.desc}<br>${Object.entries(job.statBonus).map(([k,v]) => statLabel(k) + " +" + (["critChance","lifesteal","speedMult"].includes(k) ? (v*100).toFixed(0)+"%" : v)).join(" · ")}<br>선택 후 변경 불가<br>E: ${job.eSkill.name} — ${job.eSkill.desc}</div>
        <div class="card-tag">🪙${job.cost.gold} 🔮${job.cost.soul}</div>
      `;
      card.addEventListener('click', () => {
        if (!affordable) return;
        if (chooseTier1(job.id)) {
          jobModal.classList.add('hidden');
          renderCharacterTab();
          renderLobbyCurrency();
        }
      });
      row.appendChild(card);
    });
  } else if (canChooseTier2()) {
    document.getElementById('job-modal-sub').textContent = '2차 전직 — 심화 전직';
    const job = JOB_TIER2.find(j => j.upgradeOf === meta.job.tier1);
    const affordable = meta.gold >= job.cost.gold && meta.soul >= job.cost.soul;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'skill-card' + (affordable ? '' : ' locked');
    card.innerHTML = `
      <div class="card-icon">${iconHtml(ICON_IMAGES.job[job.id + '_Q'], job.icon)}</div>
      <div class="card-name">${job.name}</div>
      <div class="card-desc">${job.desc}<br>${Object.entries(job.statBonus).map(([k,v]) => statLabel(k) + " +" + (["critChance","lifesteal","speedMult"].includes(k) ? (v*100).toFixed(0)+"%" : v)).join(" · ")}<br>선택 후 변경 불가<br>E: ${job.eSkill.name} — ${job.eSkill.desc}</div>
      <div class="card-tag">🪙${job.cost.gold} 🔮${job.cost.soul}</div>
    `;
    card.addEventListener('click', () => {
      if (!affordable) return;
      if (chooseTier2()) {
        jobModal.classList.add('hidden');
        renderCharacterTab();
        renderLobbyCurrency();
      }
    });
    row.appendChild(card);
  }

  jobModal.classList.remove('hidden');
}

/* -------------------------------------------------------------------------
   장비 탭
   ------------------------------------------------------------------------- */

function renderEquipmentTab() {
  const el = document.getElementById('tab-equipment');
  const slots = [
    { cat: 'weapon', label: '무기', id: meta.equippedWeapon },
    { cat: 'armor', label: '방어구', id: meta.equippedArmor },
    { cat: 'accessory', label: '장신구', id: meta.equippedAccessory },
  ];

  const slotsHtml = slots.map(s => {
    const def = s.id ? EQUIPMENT_POOL.find(e => e.id === s.id) : null;
    const owned = s.id ? meta.equipment[s.id] : null;
    return `
      <div class="equip-slot-box ${def ? '' : 'empty'}" data-cat="${s.cat}">
        <div class="slot-cat">${s.label}</div>
        <div class="slot-icon-big">${def ? iconHtml(ICON_IMAGES.equipment[def.id], def.icon) : '➕'}</div>
        <div class="slot-item-name">${def ? def.name : '미장착'}</div>
        ${def ? `<div class="slot-item-lv">+${owned.level}</div>` : ''}
      </div>
    `;
  }).join('');

  // 펫 슬롯 — 예전 "펫" 탭을 없애고 장비탭 안에 4번째 슬롯으로 합쳤다.
  const petUnlocked = petsUnlocked();
  const equippedPetDef = getEquippedPetDef();
  const petSlotHtml = `
    <div class="equip-slot-box pet-slot ${equippedPetDef ? '' : 'empty'}" data-cat="pet">
      <div class="slot-cat">펫</div>
      <div class="slot-icon-big">${equippedPetDef ? iconHtml(ICON_IMAGES.pet[equippedPetDef.id], equippedPetDef.icon) : '➕'}</div>
      <div class="slot-item-name">${equippedPetDef ? equippedPetDef.name : (petUnlocked ? '미장착' : '잠김')}</div>
    </div>
  `;

  const owned = ownedEquipmentList();
  const itemsHtml = owned.map(({ def, level }) => {
    const equipped = [meta.equippedWeapon, meta.equippedArmor, meta.equippedAccessory].includes(def.id);
    return `
      <div class="item-card rarity-${def.rarity}" data-item="${def.id}">
        ${equipped ? '<span class="item-equipped-badge">장착중</span>' : ''}
        <div class="item-icon">${iconHtml(ICON_IMAGES.equipment[def.id], def.icon)}</div>
        <div class="item-name">${def.name}</div>
        ${rarityChip(def.rarity)}
        <div style="font-size:10px;color:#ffcf5c;margin-top:2px;">+${level}</div>
      </div>
    `;
  }).join('');

  let petSectionHtml;
  if (!petUnlocked) {
    petSectionHtml = `
      <div class="lobby-section">
        <h3>보유 펫</h3>
        <p class="lock-note">스테이지 ${PET_UNLOCK_STAGE}를 클리어하면 상점에서 펫 뽑기가 열립니다. (현재 최고 기록: 스테이지 ${meta.maxStageCleared})</p>
      </div>
    `;
  } else {
    const ownedPets = ownedPetList();
    const petsHtml = ownedPets.map(pet => {
      const equipped = meta.equippedPet === pet.id;
      return `
        <div class="item-card rarity-${pet.rarity}" data-pet="${pet.id}">
          ${equipped ? '<span class="item-equipped-badge">장착중</span>' : ''}
          <div class="item-icon">${iconHtml(ICON_IMAGES.pet[pet.id], pet.icon)}</div>
          <div class="item-name">${pet.name}</div>
          ${rarityChip(pet.rarity)}
        </div>
      `;
    }).join('');
    petSectionHtml = `
      <div class="lobby-section">
        <h3>보유 펫 (클릭해서 장착 — 상점에서 뽑기)</h3>
        <div class="item-grid">${petsHtml || '<span class="lock-note">보유한 펫이 없습니다. 상점에서 뽑아보세요.</span>'}</div>
      </div>
    `;
  }

  el.innerHTML = `
    <div class="lobby-section">
      <h3>장착 중인 장비 / 펫</h3>
      <div class="equip-slots">${slotsHtml}${petSlotHtml}</div>
      <p style="font-size:12px;color:#9fb8d8;">무기의 액티브 스킬은 전투 중 <b>W</b> 키로 사용됩니다.</p>
    </div>
    <div class="lobby-section">
      <h3>보유 장비 (클릭해서 장착 / 강화)</h3>
      <div class="item-grid">${itemsHtml || '<span class="lock-note">보유한 장비가 없습니다. 상점에서 뽑아보세요.</span>'}</div>
    </div>
    ${petSectionHtml}
  `;

  el.querySelectorAll('.equip-slot-box:not(.pet-slot)').forEach(box => {
    box.addEventListener('click', () => {
      const cat = box.dataset.cat;
      const id = { weapon: meta.equippedWeapon, armor: meta.equippedArmor, accessory: meta.equippedAccessory }[cat];
      if (id) openItemDetail(id);
    });
  });
  const petSlotBox = el.querySelector('.equip-slot-box.pet-slot');
  if (petSlotBox) {
    petSlotBox.addEventListener('click', () => {
      if (meta.equippedPet) { unequipPet(); renderEquipmentTab(); }
    });
  }
  el.querySelectorAll('.item-card[data-item]').forEach(card => {
    card.addEventListener('click', () => openItemDetail(card.dataset.item));
  });
  el.querySelectorAll('.item-card[data-pet]').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.pet;
      if (meta.equippedPet === id) unequipPet(); else equipPet(id);
      renderEquipmentTab();
    });
  });
}

function switchToTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tabName));
}

function openItemDetail(itemId) {
  const def = EQUIPMENT_POOL.find(e => e.id === itemId);
  const owned = meta.equipment[itemId];
  if (!def || !owned) return;

  const equippedId = { weapon: meta.equippedWeapon, armor: meta.equippedArmor, accessory: meta.equippedAccessory }[def.category];
  const isEquipped = equippedId === itemId;
  const maxed = owned.level >= UPGRADE_MAX_LEVEL;
  const cost = upgradeCost(owned.level);

  const statLines = Object.entries(def.stat).map(([k, v]) => `${statLabel(k)} +${["critChance","lifesteal","speedMult","critMult"].includes(k) ? (v * (1 + owned.level * .12)*100).toFixed(1)+"%" : (v * (1 + owned.level * .12)).toFixed(1)}`).join(' · ');

  document.getElementById('item-detail-inner').innerHTML = `
    <h2>${iconHtml(ICON_IMAGES.equipment[def.id], def.icon, 'icon-img-inline')} ${def.name}</h2>
    <p class="modal-sub">${rarityChip(def.rarity)} · 강화 +${owned.level}</p>
    <p style="font-size:13px;color:#e7dcc0;">${statLines}</p>
    ${def.skill ? `<p style="font-size:13px;color:#9fb8d8;">${iconHtml(ICON_IMAGES.equipment[def.id], def.skill.icon, 'icon-img-inline')} <b>${def.skill.name}</b> — ${def.skill.desc}</p>` : ''}
    <div class="pause-actions">
      <button class="menu-btn" id="btn-item-equip">${isEquipped ? '장착 해제' : '장착하기'}</button>
      <button class="menu-btn" id="btn-item-upgrade" ${maxed ? 'disabled' : ''}>${maxed ? '강화 MAX' : `강화하기 (🪙${cost})`}</button>
      <button class="menu-btn ghost" id="btn-item-close">닫기</button>
    </div>
  `;

  document.getElementById('btn-item-equip').addEventListener('click', () => {
    if (isEquipped) unequipItem(def.category); else equipItem(itemId);
    document.getElementById('item-detail-modal').classList.add('hidden');
    renderEquipmentTab();
    renderGameTab();
  });
  document.getElementById('btn-item-upgrade').addEventListener('click', () => {
    if (upgradeEquipment(itemId)) {
      renderLobbyCurrency();
      openItemDetail(itemId);
      renderEquipmentTab();
    }
  });
  document.getElementById('btn-item-close').addEventListener('click', () => {
    document.getElementById('item-detail-modal').classList.add('hidden');
  });

  document.getElementById('item-detail-modal').classList.remove('hidden');
}

function statLabel(key) {
  return {
    atk: '공격력', hp: '체력', def: '방어력', critChance: '치명타확률',
    critMult: '치명타피해', speedMult: '이동속도', lifesteal: '흡혈',
  }[key] || key;
}

/* -------------------------------------------------------------------------
   상점 탭
   ------------------------------------------------------------------------- */

function renderShopTab() {
  const el = document.getElementById('tab-shop');
  const petLocked = !petsUnlocked();

  el.innerHTML = `
    <div class="lobby-section">
      <h3>상점</h3>
      <div class="shop-grid">
        <div class="shop-card">
          <div class="shop-icon">📦</div>
          <div class="shop-name">장비 뽑기</div>
          <div class="shop-desc">무작위 장비 1개를 획득합니다.</div>
          <div class="shop-cost">🪙 ${SHOP_COSTS.equipGacha}</div>
          <button class="menu-btn" id="btn-gacha-equip">뽑기</button>
        </div>
        <div class="shop-card">
          <div class="shop-icon">🐾</div>
          <div class="shop-name">펫 뽑기</div>
          <div class="shop-desc">${petLocked ? `스테이지 ${PET_UNLOCK_STAGE} 클리어 시 해금` : '무작위 펫 1마리를 획득합니다.'}</div>
          <div class="shop-cost">🪙 ${SHOP_COSTS.petGacha}</div>
          <button class="menu-btn" id="btn-gacha-pet" ${petLocked ? 'disabled' : ''}>${petLocked ? '잠김' : '뽑기'}</button>
        </div>
        <div class="shop-card">
          <div class="shop-icon">🧪</div>
          <div class="shop-name">경험치 물약</div>
          <div class="shop-desc">캐릭터 경험치 ${SHOP_COSTS.expPotionAmount} 획득</div>
          <div class="shop-cost">🪙 ${SHOP_COSTS.expPotion}</div>
          <button class="menu-btn" id="btn-buy-potion">구매</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-gacha-equip').addEventListener('click', () => {
    const result = gachaEquipment();
    renderLobbyCurrency();
    showGachaModal(result, 'equipment');
  });
  document.getElementById('btn-gacha-pet').addEventListener('click', () => {
    if (petLocked) return;
    const result = gachaPet();
    renderLobbyCurrency();
    showGachaModal(result, 'pet');
  });
  document.getElementById('btn-buy-potion').addEventListener('click', () => {
    if (buyExpPotion()) { renderLobbyCurrency(); renderCharacterTab(); }
  });
}

function showGachaModal(result, kind) {
  const inner = document.getElementById('gacha-modal-inner');
  if (!result) {
    inner.innerHTML = `<h2>골드가 부족합니다</h2><button class="menu-btn" id="btn-gacha-close">확인</button>`;
  } else {
    const { drop, duplicate } = result;
    const dropIconSrc = kind === 'pet' ? ICON_IMAGES.pet[drop.id] : ICON_IMAGES.equipment[drop.id];
    inner.innerHTML = `
      <h2>${iconHtml(dropIconSrc, drop.icon, 'icon-img-inline')} ${drop.name}</h2>
      <p class="modal-sub">${rarityChip(drop.rarity)}</p>
      ${duplicate ? '<p style="color:#ff8a8a;font-size:13px;">이미 보유한 항목입니다 — 골드 일부 환급</p>' : '<p style="color:#9be89b;font-size:13px;">신규 획득!</p>'}
      <button class="menu-btn" id="btn-gacha-close">확인</button>
    `;
  }
  document.getElementById('gacha-modal').classList.remove('hidden');
  document.getElementById('btn-gacha-close').addEventListener('click', () => {
    document.getElementById('gacha-modal').classList.add('hidden');
    renderEquipmentTab();
  });
}

/* -------------------------------------------------------------------------
   게임 탭
   ------------------------------------------------------------------------- */

function renderGameTab() {
  const el = document.getElementById('tab-game');
  const jobNode = getJobNode(meta.job);
  const advanced = selectedAdvancement(),baseKit=CLASS_KITS[meta.appearance] || CLASS_KITS.mage;
  const classKit=advanced?{basicAttack:{label:advanced.basic},qSkill:{name:advanced.q}}:baseKit;
  const appearanceInfo = APPEARANCE_POOL.find(a => a.id === meta.appearance);
  const weapon = meta.equippedWeapon ? EQUIPMENT_POOL.find(e => e.id === meta.equippedWeapon) : null;
  const pet = getEquippedPetDef();

  el.innerHTML = `
    <div class="lobby-section">
      <h3>스테이지 진행</h3>
      <div class="game-tab-summary">
        최고 클리어 스테이지 <b>${meta.maxStageCleared}</b><br>
        다음 탐험 시작 스테이지 <b>1</b> (탐험 도중 종료하면 미정산 보상은 사라집니다. 일시정지 → 로비로를 이용하세요)
      </div>
      <div class="game-tab-summary">
        외형 <b>${appearanceInfo.name}</b> · 전직 <b>${jobNode.name}</b> · 무기 <b>${weapon ? weapon.name : '없음'}</b> · 펫 <b>${pet ? pet.name : '없음'}</b>
      </div>
      <button class="menu-btn btn-explore" id="btn-explore">탐험 시작</button>
    </div>
    <div class="lobby-section">
      <h3>진행 방식</h3>
      <p style="font-size:13px;color:#cbbf9d;line-height:1.8;">
        방향키로 이동하고 A 키를 누르고 있으면 기본공격(${classKit.basicAttack.label})을 반복합니다.<br>
        Q(${classKit.qSkill.name} · 외형별 고유 스킬) · W(무기 스킬) · E(전직 스킬) · R(탐험 액티브 스킬)을 사용하세요.<br>
        몬스터를 처치하면 골드/경험치, 스테이지 3부터는 강한 몬스터가 영혼을 드랍합니다.<br>
        보스를 처치하면 스테이지 클리어! 골드/영혼은 그 즉시 로비 재화로 귀속됩니다.
      </p>
    </div>
  `;

  document.getElementById('btn-explore').addEventListener('click', () => {
    startRun();
  });
}

renderLobbyAll();
