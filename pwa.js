'use strict';

/* =========================================================================
   pwa.js — 웹앱을 "폰 앱처럼" 쓰기 위한 부분들
   - 서비스워커 등록 (오프라인에서도 켜짐)
   - 홈 화면에 추가(설치) 버튼
   - 터치 기기 감지(핫바 크기 조정용), 핫바 탭으로 스킬 사용
   ========================================================================= */

// 1) 서비스워커 등록
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* 등록 실패는 무시(그냥 캐싱만 안 됨) */ });
  });
}

// 2) "홈 화면에 추가" 커스텀 버튼 (Android/Chrome 계열)
let deferredInstallPrompt = null;
const installBtn = document.getElementById('btn-install-app');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (installBtn) installBtn.classList.remove('hidden');
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installBtn.classList.add('hidden');
  });
}

window.addEventListener('appinstalled', () => {
  if (installBtn) installBtn.classList.add('hidden');
});

// 3) 터치 기기 감지 — 감지되면 body에 클래스를 달아 핫바 등을 터치용으로 키운다.
//    (이동 조작은 방향키 전용이라 터치 기기에서는 핫바 탭으로 스킬만 사용 가능)
const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouchDevice) document.body.classList.add('touch-device');

// 4) 핫바(Q/W/E/R) 탭으로 스킬 사용 — 터치뿐 아니라 마우스 클릭도 동작(데스크톱에서도 편의 제공)
document.querySelectorAll('#hotbar .slot').forEach((slotEl) => {
  slotEl.addEventListener('click', () => {
    if (typeof state !== 'undefined' && state.mode === 'playing') {
      useSkill(slotEl.dataset.slot);
    }
  });
});

const offlineButton=document.getElementById('btn-offline'),offlineStatus=document.getElementById('offline-status');
if('serviceWorker' in navigator && window.isSecureContext && location.protocol!=='file:')offlineButton.hidden=false;
offlineButton.addEventListener('click',async()=>{offlineButton.disabled=true;offlineStatus.textContent='게임 파일을 준비합니다…';try{const registration=await navigator.serviceWorker.ready;const worker=registration.active;if(!worker)throw Error('not active');const channel=new MessageChannel();channel.port1.onmessage=event=>{const result=event.data;if(result.error){offlineStatus.textContent=result.error;offlineButton.disabled=false;channel.port1.close();}else if(result.complete){offlineStatus.textContent='오프라인 준비 완료';offlineButton.disabled=false;channel.port1.close();}else offlineStatus.textContent='준비 중 '+result.done+'/'+result.total;};worker.postMessage({type:'PREPARE_OFFLINE'},[channel.port2]);}catch(_){offlineStatus.textContent='준비할 수 없습니다. 연결을 확인하고 다시 시도하세요.';offlineButton.disabled=false;}});
