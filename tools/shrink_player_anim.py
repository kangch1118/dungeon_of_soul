# -*- coding: utf-8 -*-
"""player_anim 스트립을 딱 한 번, 원본(build_player_anim.py 직후) 기준 0.4배로 축소하고
결과 셀 크기를 manifest.json 기준으로 재계산해 출력한다. (재실행해도 매번 원본 매니페스트의
cellW/cellH * SCALE 로 다시 계산하므로 이중 축소가 나지 않는다 — in-place resize여도 안전.)
"""
import json
import os
from PIL import Image

BASE = r"C:\Users\강치원\OneDrive\Desktop\webapp\image\player_anim"
SCALE = 0.4
STATES = {'idle': 4, 'walk': 6, 'attack': 6, 'hit': 3, 'death': 8}
DIRS = ['down', 'side', 'up']
CLASSES = ['warrior', 'mage', 'rogue', 'cleric']
BOTTOM_MARGIN = 10

manifest = json.load(open(os.path.join(BASE, 'manifest.json'), encoding='utf-8'))

for cls in CLASSES:
    orig_cell_w = manifest[cls]['cellW']
    for st, n in STATES.items():
        for d in DIRS:
            fname = f"{cls}_{st}_{d}.png"
            path = os.path.join(BASE, fname)
            img = Image.open(path)
            w, h = img.size
            expected_w = orig_cell_w * n
            if abs(w - expected_w) > 2:
                raise SystemExit(f"{fname}: 예상 폭 {expected_w} vs 실제 {w} -- 이미 축소된 파일일 수 있음, 중단")
            nw, nh = round(w * SCALE), round(h * SCALE)
            img.convert('RGBA').resize((nw, nh), Image.LANCZOS).save(path, optimize=True)

new_manifest = {}
for cls in CLASSES:
    sample = Image.open(os.path.join(BASE, f"{cls}_idle_down.png"))
    cell_w = sample.width // STATES['idle']
    cell_h = sample.height
    baseline_y = cell_h - round(BOTTOM_MARGIN * SCALE)
    ref_body_h = round(manifest[cls]['refBodyH'] * SCALE)
    new_manifest[cls] = {'cellW': cell_w, 'cellH': cell_h, 'baselineY': baseline_y, 'refBodyH': ref_body_h}
    print(f"{cls}: {{ cellW: {cell_w}, cellH: {cell_h}, baselineY: {baseline_y}, refBodyH: {ref_body_h} }},")

with open(os.path.join(BASE, 'manifest.json'), 'w', encoding='utf-8') as f:
    json.dump(new_manifest, f, ensure_ascii=False, indent=2)
print('resized in place, manifest.json updated to reflect final (scaled) sizes')
