'use strict';

/* =========================================================================
   sound.js — 효과음(SFX) 재생
   - 재생마다 새 Audio 인스턴스를 만들어서 같은 소리가 겹쳐도 끊기지 않게 한다.
   - 키별로 최소 재생 간격(cooldown)을 둬서 짧은 시간에 몰리면 시끄럽게
     겹쳐 들리지 않도록 막는다(사용자 요청 — "적당히 딜레이").
   - 볼륨은 옵션 화면의 효과음 슬라이더(options.sfx, 0~100)를 곱해서 적용한다.
     options는 game.js에서 선언되지만 클래식 스크립트라 같은 전역 스코프를 공유하므로
     여기서 그냥 참조해도 된다(실제 접근은 재생 시점이라 로드 순서 문제 없음).
   ========================================================================= */

const SFX = {
  // 전사 기본공격 — 스윙마다 1타/2타 번갈아 재생(game.js에서 직접 골라 씀)
  warrior_hit1: { src: 'sound/1타.mp3', volume: 0.85 },
  warrior_hit2: { src: 'sound/2타.mp3', volume: 0.85 },
  // 도적 기본공격(단검)
  rogue_basic: { src: 'sound/samll_sword.mp3', volume: 0.7 },
  // 마법사 기본공격(마력탄)
  mage_basic: { src: 'sound/magic_nomal.mp3', volume: 0.6 },
  // 성기사 Q(정령 소환) 전용, 볼륨 낮춤(요청사항). 기본공격(성스러운 파동)에선 재생 안 함.
  holy: { src: 'sound/holy.mp3', volume: 0.4 },
  // 마법사 Q(파이어볼) — 쏠 때 / 적중(폭발) 시
  fire_shoot: { src: 'sound/fire_magic_shoot.mp3', volume: 0.65 },
  fire_hit: { src: 'sound/fire_magic_hit.mp3', volume: 0.8 },
  // 도적 Q(표창난사)
  shuriken: { src: 'sound/표창.mp3', volume: 0.7 },
  // 화염의 검 W스킬 적중 시
  flame_slash: { src: 'sound/화염검기.mp3', volume: 0.75 },
  // R스킬(낙뢰 강타)
  lightning: { src: 'sound/번개.mp3', volume: 0.8 },
  // 공격했지만 사거리 안에 대상이 없을 때(헛스윙)
  whiff: { src: 'sound/허공.mp3', volume: 0.45, cooldown: 0.25 },
  // 몬스터
  bat: { src: 'sound/bat.mp3', volume: 0.3, cooldown: 0.3 },
  monster_atk: { src: 'sound/monster.mp3', volume: 0.55, cooldown: 0.3 },
  slime_die: { src: 'sound/die_slime.mp3', volume: 0.7 },
  // 플레이어
  hurt: { src: 'sound/hurt.mp3', volume: 0.8, cooldown: 0.2 },
  exp: { src: 'sound/exp.mp3', volume: 0.5, cooldown: 0.25 },
  // UI
  tick: { src: 'sound/tick_button.mp3', volume: 0.6 },
  button: { src: 'sound/nomal_button.mp3', volume: 0.55 },
  // 레벨업 카드 — 카드 3장이 뜰 때 / 그중 하나를 고를 때
  card: { src: 'sound/card.mp3', volume: 0.6 },
  select: { src: 'sound/select.mp3', volume: 0.65 },
};

// 배경음악(BGM) — 루프 재생, 상황에 따라 트랙 전환. sound/가 아니라 background_sound/ 폴더.
// 효과음보다 확실히 낮은 볼륨으로 깔아서 SFX를 안 덮게 한다(요청사항).
const BGM = {
  lobby: { src: 'background_sound/lobby.mp3', volume: 0.32 },
  stage: { src: 'background_sound/1stage_sound.mp3', volume: 0.26 },
  // 보스 테마 2종 — 낮은 티어(스테이지 1~4)는 boss_battle1, 높은 티어(5+)는 bossbattle2
  boss1: { src: 'background_sound/boss_battle1.mp3', volume: 0.28 },
  boss2: { src: 'background_sound/bossbattle2.mp3', volume: 0.28 },
};
let bgmAudio = null;
let bgmKey = null;
let pendingBgmKey = null;

function bgmMasterVol() {
  return (typeof options !== 'undefined' && options.bgm != null ? options.bgm : 50) / 100;
}
function playBgm(key) {
  if (key === bgmKey && bgmAudio && !bgmAudio.paused) return; // 이미 그 곡이면 끊지 않고 그대로 둔다
  const def = BGM[key];
  if (!def) { stopBgm(); return; }
  if (bgmAudio) { bgmAudio.pause(); bgmAudio = null; }
  bgmKey = key;
  try {
    const audio = new Audio(def.src);
    audio.loop = true;
    audio.volume = Math.max(0, Math.min(1, def.volume * bgmMasterVol()));
    audio.addEventListener('error', () => {
      pendingBgmKey = key;
      console.warn('[sound] BGM 파일을 불러오지 못했습니다:', def.src);
    }, { once: true });
    audio.play().then(() => {
      pendingBgmKey = null;
    }).catch(() => {
      pendingBgmKey = key;
    });
    bgmAudio = audio;
  } catch (e) { /* 무시 */ }
}
function stopBgm() {
  if (bgmAudio) { bgmAudio.pause(); bgmAudio = null; }
  bgmKey = null;
  pendingBgmKey = null;
}

// 브라우저가 첫 자동 재생을 막은 경우, 사용자의 다음 입력에서 BGM을 다시 시작한다.
function retryPendingBgm() {
  if (pendingBgmKey) playBgm(pendingBgmKey);
}
window.addEventListener('pointerdown', retryPendingBgm, { capture: true });
window.addEventListener('keydown', retryPendingBgm, { capture: true });
// 재생 중에 BGM 슬라이더를 움직이면 즉시 반영(효과음처럼 다음 재생까지 기다릴 필요 없음)
const optBgmSliderForBgm = document.getElementById('opt-bgm');
if (optBgmSliderForBgm) {
  optBgmSliderForBgm.addEventListener('input', () => {
    if (bgmAudio && bgmKey && BGM[bgmKey]) {
      bgmAudio.volume = Math.max(0, Math.min(1, BGM[bgmKey].volume * bgmMasterVol()));
    }
  });
}

const DEFAULT_SFX_COOLDOWN = 0.06; // 겹침 방지용 최소 간격(초)
const sfxLastPlayed = {};
const activeSfx = new Set();

function playSfx(key) {
  const def = SFX[key];
  if (!def) return;
  const now = performance.now() / 1000;
  const cooldown = def.cooldown != null ? def.cooldown : DEFAULT_SFX_COOLDOWN;
  if (sfxLastPlayed[key] != null && now - sfxLastPlayed[key] < cooldown) return;
  sfxLastPlayed[key] = now;

  const masterVol = (typeof options !== 'undefined' && options.sfx != null ? options.sfx : 70) / 100;
  if (masterVol <= 0) return;
  try {
    const priority=['hurt','monster_atk'].includes(key)?2:1;
    if(activeSfx.size>=12){const victim=[...activeSfx].find(v=>v.priority<priority);if(!victim)return;victim.audio.pause();activeSfx.delete(victim);}
    const audio = new Audio(def.src),voice={audio,priority};
    activeSfx.add(voice);const release=()=>activeSfx.delete(voice);
    audio.addEventListener('ended',release,{once:true});audio.addEventListener('error',release,{once:true});
    audio.volume = Math.max(0, Math.min(1, def.volume * masterVol));
    audio.play().catch(release);
  } catch (e) { /* 무시 */ }
}

// 공용 UI 사운드 — 탭 전환은 tick, 그 외 버튼은 nomal_button.
// 각 화면의 개별 클릭 핸들러와는 별개로 동작하는 위임 리스너라 기존 로직을 건드리지 않는다.
document.addEventListener('click', (e) => {
  if (e.target.closest('.tab-btn')) { playSfx('tick'); return; }
  // .skill-card(레벨업 카드)는 game.js에서 select 사운드를 직접 재생하므로 여기선 제외(중복 방지)
  if (e.target.closest('.menu-btn, .img-btn, .corner-btn, .item-card, .shop-card, .equip-slot-box')) {
    playSfx('button');
  }
});
['opt-difficulty', 'opt-showfps'].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', () => playSfx('tick'));
});
['opt-bgm', 'opt-sfx'].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', () => playSfx('tick')); // 드래그 중(input)엔 안 울리고 놓을 때만
});
