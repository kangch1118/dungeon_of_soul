# -*- coding: utf-8 -*-
"""
생성된 원본 캐릭터 스프라이트시트(image/generated_full_20260911/{class}_{state}_{dir}.png)를
게임에 바로 쓸 수 있는 균일 셀 크기의 스트립으로 정규화한다.

절차:
1. 시트를 상태별 예상 프레임 수(N)로 "균등 분할"한다 (블롭 탐지는 공격/사망 이펙트가 서로 붙어있어
   신뢰할 수 없음이 사전 분석으로 확인됨 -> 균등분할이 더 안전).
2. 각 분할 구간 안에서 알파>임계값인 실제 내용의 바운딩박스를 구해 여백을 잘라낸다.
3. 클래스별로 idle/walk/attack/hit/death 전 프레임 중 가장 큰 (width,height)를 셀 크기로 잡아
   모든 프레임을 같은 셀에 '발밑 기준선(bottom-anchored) + 수평 중앙'으로 붙여넣는다.
   -> 프레임이 바뀌어도 캐릭터가 위아래로 튀지 않는다.
4. idle_down 프레임의 내용 높이를 클래스별 '기준 신장(refBodyH)'으로 기록해 두면,
   엔진에서 클래스마다 이펙트 여백이 달라도 실제 캐릭터 크기를 통일해서 그릴 수 있다.
"""
import json
import os

import numpy as np
from PIL import Image

SRC = r"C:\Users\강치원\OneDrive\Desktop\webapp\image\generated_full_20260911"
OUT = r"C:\Users\강치원\OneDrive\Desktop\webapp\image\player_anim"
os.makedirs(OUT, exist_ok=True)

CLASSES = ['warrior', 'mage', 'rogue', 'cleric']
DIRS = ['down', 'side', 'up']
STATES = {'idle': 4, 'walk': 6, 'attack': 6, 'hit': 3, 'death': 8}
ALPHA_THRESH = 16
CELL_PAD = 14          # 셀 여백(px)
BOTTOM_MARGIN = 10      # 셀 바닥에서 발까지 여백(그림자 자리)


def content_bbox(alpha, x0, x1):
    """alpha[:, x0:x1] 구간에서 실제 내용(알파>임계값)의 바운딩박스. 없으면 전체 구간 반환."""
    region = alpha[:, x0:x1]
    mask = region > ALPHA_THRESH
    if not mask.any():
        return x0, 0, x1, alpha.shape[0]
    cols = np.where(mask.any(axis=0))[0]
    rows = np.where(mask.any(axis=1))[0]
    return x0 + cols[0], rows[0], x0 + cols[-1] + 1, rows[-1] + 1


def slice_sheet(path, n_frames):
    img = Image.open(path).convert('RGBA')
    arr = np.array(img)
    alpha = arr[:, :, 3]
    w = img.width
    step = w / n_frames
    frames = []
    for i in range(n_frames):
        x0 = int(round(i * step))
        x1 = int(round((i + 1) * step))
        bx0, by0, bx1, by1 = content_bbox(alpha, x0, x1)
        if bx1 <= bx0 or by1 <= by0:
            # 내용 없음 -> 이전 프레임 복사(생성 누락 방지)
            crop = Image.new('RGBA', (max(1, x1 - x0), img.height), (0, 0, 0, 0))
        else:
            crop = img.crop((bx0, by0, bx1, by1))
        frames.append(crop)
    return frames


manifest = {}

for cls in CLASSES:
    cls_frames = {}      # state -> dir -> [PIL frames] (원본 스케일, 크롭만 된 상태)
    char_height = {}     # (state,dir) -> 그 시트의 "기준 신장"(0번 프레임 높이)
    for st, n in STATES.items():
        cls_frames[st] = {}
        for d in DIRS:
            fname = f"{cls}_{st}_{d}.png"
            path = os.path.join(SRC, fname)
            frames = slice_sheet(path, n)
            cls_frames[st][d] = frames
            # 0번 프레임(대기=자연스러운 정면, 걷기=한 스텝, 공격=준비자세, 피격=처음 움찔,
            # 사망=쓰러지기 직전 서있는 자세) 높이를 그 시트의 "서있을 때 키"로 삼는다.
            char_height[(st, d)] = frames[0].height

    # 60장이 전부 독립적으로 생성된 이미지라 상태/방향마다 캐릭터가 그려진
    # 실제 픽셀 배율이 조금씩 다르다(제일 눈에 띄는 문제: 이동/모션이 바뀔 때마다
    # 캐릭터 크기가 달라 보임). idle_down 시트를 기준으로 모든 시트를 리스케일해서
    # "서있는 키"를 통일한 다음에 셀에 붙인다.
    ref_h = char_height[('idle', 'down')]

    rescaled = {}   # state -> dir -> [PIL frames] (스케일 보정 완료)
    max_w = 0
    max_h = 0
    for st, n in STATES.items():
        rescaled[st] = {}
        for d in DIRS:
            factor = ref_h / char_height[(st, d)]
            frames = cls_frames[st][d]
            new_frames = []
            for f in frames:
                if abs(factor - 1.0) > 0.008:
                    nw = max(1, round(f.width * factor))
                    nh = max(1, round(f.height * factor))
                    f = f.resize((nw, nh), Image.LANCZOS)
                new_frames.append(f)
                max_w = max(max_w, f.width)
                max_h = max(max_h, f.height)
            rescaled[st][d] = new_frames
            print(f"  {cls} {st:6s} {d:4s} scale x{factor:.3f}")

    cell_w = max_w + CELL_PAD * 2
    cell_h = max_h + CELL_PAD * 2 + BOTTOM_MARGIN
    baseline_y = cell_h - BOTTOM_MARGIN  # 이 y좌표에 발이 오도록 정렬
    ref_body_h = ref_h  # 리스케일 기준 자체가 곧 클래스 기준 신장

    for st, n in STATES.items():
        for d in DIRS:
            frames = rescaled[st][d]
            strip = Image.new('RGBA', (cell_w * n, cell_h), (0, 0, 0, 0))
            for i, f in enumerate(frames):
                cx = i * cell_w + cell_w // 2
                px = cx - f.width // 2
                py = baseline_y - f.height
                strip.paste(f, (px, py), f)
            out_name = f"{cls}_{st}_{d}.png"
            strip.save(os.path.join(OUT, out_name))

    manifest[cls] = {
        'cellW': cell_w,
        'cellH': cell_h,
        'baselineY': baseline_y,
        'refBodyH': ref_body_h,
        'frames': STATES,
    }
    print(f"{cls}: cell {cell_w}x{cell_h}  refBodyH={ref_body_h}")

with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8') as f:
    json.dump(manifest, f, ensure_ascii=False, indent=2)

print('done ->', OUT)
