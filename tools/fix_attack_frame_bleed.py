# -*- coding: utf-8 -*-
"""
build_player_anim.py의 균등분할 슬라이싱은 이펙트가 넓게 퍼지는 "공격" 상태에서 한 프레임의
이펙트 끝자락이 옆 칸으로 잘려 들어가는 잔상 얼룩을 남길 수 있다(마법사 attack에서 실제로
발견됨 — q_fireball처럼 넓게 퍼지는 이펙트가 있는 상태일수록 잘 생김). 캐릭터 몸통과
붙어있지 않은(발밑 기준선에 안 닿는) 별개의 덩어리를 연결요소 분석으로 찾아서 지운다.

사용법: 아래 FILES 리스트에 점검하고 싶은 {class}_attack_{dir}.png 파일명을 넣고 실행.
먼저 diag 모드(SIZE_THRESHOLD=0 근처로 낮춰서 로그만 보고 저장 안 함)로 몇 px짜리
덩어리들이 있는지 확인한 뒤, 의도된 장식용 반짝임 파티클(대체로 300px 이하)까지
지우지 않도록 SIZE_THRESHOLD를 잡을 것 — 무작정 낮게 잡으면 장식이 같이 삭제된다.
2026-09-12 기준: mage_attack_{down,side,up} 3장만 고쳤음. 다른 클래스(전사/도적/성기사)의
attack 시트도 진단해보면 비슷한 잔상이 있을 수 있으니, 사용자가 비슷한 문제를 다시
지적하면 여기 FILES에 추가해서 돌려볼 것.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

DIR = r"C:\Users\강치원\OneDrive\Desktop\webapp\image\player_anim"
FILES = ["mage_attack_down.png", "mage_attack_side.png", "mage_attack_up.png"]
ALPHA_THRESH = 12
SIZE_THRESHOLD = 350  # 이보다 작은 덩어리는 장식용 파티클로 보고 건드리지 않는다


def fix_file(fname):
    path = os.path.join(DIR, fname)
    img = Image.open(path).convert("RGBA")
    arr = np.array(img)
    w, h = img.size
    n = 6
    cellW = w // n
    changed = False
    for i in range(n):
        x0, x1 = i * cellW, (i + 1) * cellW if i < n - 1 else w
        cell_alpha = arr[:, x0:x1, 3]
        mask = cell_alpha > ALPHA_THRESH
        if not mask.any():
            continue
        labeled, num = ndimage.label(mask, structure=np.ones((3, 3)))  # 8-연결
        if num <= 1:
            continue
        # 캐릭터가 속한 덩어리 = 셀 맨 아래 행(발밑)에 닿아 있는 라벨들
        bottom_region = labeled[-15:, :]
        bottom_labels = set(bottom_region[bottom_region > 0].tolist())
        for lbl in range(1, num + 1):
            if lbl in bottom_labels:
                continue
            comp_mask = labeled == lbl
            size = comp_mask.sum()
            # 진짜 잔상 얼룩(수백~수천 px)만 지운다 — 60px 안팎의 작은 반짝임 파티클은
            # 의도된 장식이라 남겨둔다 (전체 진단 결과 255px 이하는 전부 장식용 스파클이었음).
            if size < SIZE_THRESHOLD:
                continue
            ys, xs = np.where(comp_mask)
            print(f"  {fname} frame{i}: 잔상 덩어리 {size}px 제거 "
                  f"(cell x{xs.min()}-{xs.max()} y{ys.min()}-{ys.max()})")
            full_mask = np.zeros(cell_alpha.shape, dtype=bool)
            full_mask[comp_mask] = True
            sub = arr[:, x0:x1]
            sub[full_mask] = 0
            changed = True
    if changed:
        Image.fromarray(arr).save(path)
        print(f"저장: {fname}")
    else:
        print(f"변경 없음: {fname}")


for f in FILES:
    fix_file(f)
