# 에셋 처리 스크립트

`image/generated_full_20260911/`(생성 원본, 보존용)을 실제 게임에서 쓰는 형태로 가공하는 Python 스크립트.
Pillow(+numpy) 필요: `C:\Users\강치원\AppData\Local\Programs\Python\Python313\python.exe -m pip install pillow numpy`

실행 순서(플레이어 스프라이트를 원본부터 다시 만들 때):

1. `build_player_anim.py` — `generated_full_20260911/{class}_{state}_{dir}.png`를 프레임별로 균등분할 +
   내용물 바운딩박스로 크롭 + **시트별 캐릭터 스케일을 idle_down 기준으로 보정**(중요 — 60장이 전부 독립
   생성이라 상태/방향마다 캐릭터가 그려진 픽셀 크기가 달랐음) + 발밑 기준선 정렬해서
   `image/player_anim/`에 원본 크기로 저장하고 `manifest.json`을 만든다.
2. `shrink_player_anim.py` — 위 결과물을 화면 표시 크기에 맞춰 0.4배로 축소(웹 배포 용량 때문).
   실행할 때마다 `manifest.json`의 현재 셀 크기 기준으로 다시 계산하므로, **1번을 먼저 새로 돌린
   직후에만** 실행해야 이중 축소가 안 난다(안 그러면 0.4×0.4로 줄어드는 사고가 남).
   끝나면 콘솔에 찍히는 `{ cellW, cellH, baselineY, refBodyH }`를 `data.js`의 `PLAYER_ANIM_META`에
   그대로 옮겨 적어야 한다(자동 반영 안 됨).
3. `optimize_assets.py` — 바닥/벽/장식/아이콘/UI 텍스처를 리사이즈해서 `image/floor,wall,decal,icon,ui2/`
   에 만든다. **주의**: player_anim 부분도 포함하고 있어서, 이미 축소된 player_anim 위에 또 돌리면
   이중 축소된다 — 이 스크립트는 배경/아이콘/UI만 다시 만들 때 쓰고 캐릭터는 위 1·2번으로 따로 처리할 것.
4. `autocrop_ui.py` — `image/ui2/*.png`를 알파 채널 기준으로 여백 크롭(9-slice border-image 쓰기 전 전처리).
5. `optimize_vfx.py` — `image/vfx/*.png`(전투 이펙트 생성 원본)를 `image/vfx2/`로 축소. 4프레임 애니메이션
   세트(`q_fire_explosion_0N`, `e_meteor_explosion_0N`, `r_lightning_spark_0N`, `q_fire_ground_0N`)는
   프레임마다 따로 autocrop하면 터짐 중심이 미묘하게 어긋나 떨려 보이므로, 같은 세트를 **합집합
   바운딩박스로 동일하게** 크롭하는 로직이 들어있다 — 새 애니메이션 세트를 추가할 땐 `ANIM_GROUPS`에
   등록할 것.

6. `fix_attack_frame_bleed.py` — (scipy 필요: `pip install scipy`) 균등분할 슬라이싱 때문에
   넓게 퍼지는 이펙트 프레임의 끝자락이 옆 칸으로 잘려 들어가 남는 잔상 얼룩을 연결요소
   분석으로 찾아서 지운다. 2026-09-12에 마법사 attack 3장(down/side/up)에서 발견해서 고침 —
   다른 클래스 attack 시트에도 비슷한 문제가 있을 수 있음(아직 다 확인 안 함).

## 캐릭터 스케일 보정 로직 메모
`build_player_anim.py`는 각 시트의 "0번 프레임"(idle=정면 대기, walk=한 스텝, attack=준비자세,
hit=처음 움찔, death=쓰러지기 직전 서 있는 자세) 높이를 그 시트의 "서 있을 때 키"로 보고,
클래스의 `idle_down` 0번 프레임 높이에 맞춰 시트 전체를 리스케일한다. death 시퀀스가 뒤로 갈수록
작아지는 건 캐릭터가 쓰러지는 정상적인 연출이라 그대로 둔다(0번 프레임만 기준으로 삼는 이유).
