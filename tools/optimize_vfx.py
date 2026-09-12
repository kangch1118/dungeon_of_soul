# -*- coding: utf-8 -*-
"""image/vfx/*.png (생성 원본, 보존용)을 image/vfx2/*.png(실사용, 축소+autocrop)로 만든다."""
import os
from PIL import Image

SRC = r"C:\Users\강치원\OneDrive\Desktop\webapp\image\vfx"
OUT = r"C:\Users\강치원\OneDrive\Desktop\webapp\image\vfx2"
os.makedirs(OUT, exist_ok=True)

MAX_DIM = 420  # 실제 게임 표시 크기보다 넉넉히 크게(레티나 대비), 원본 1254~2172보단 훨씬 작게

# 4프레임 애니메이션 세트 — 프레임마다 따로 autocrop하면 폭발 중심이 프레임마다 미묘하게
# 어긋나 재생할 때 이미지가 떨려 보인다. 같은 세트는 전부 "합집합 바운딩박스"로 동일하게
# 크롭해서 중심이 고정되게 한다.
ANIM_GROUPS = [
    [f"q_fire_explosion_0{i}.png" for i in range(1, 5)],
    [f"e_meteor_explosion_0{i}.png" for i in range(1, 5)],
    [f"r_lightning_spark_0{i}.png" for i in range(1, 5)],
    [f"q_fire_ground_0{i}.png" for i in range(1, 4)],
]

total_before = total_after = 0
handled = set()


def save_out(fname, img):
    global total_before, total_after
    out_path = os.path.join(OUT, fname)
    img.save(out_path, optimize=True)
    total_before += os.path.getsize(os.path.join(SRC, fname))
    total_after += os.path.getsize(out_path)
    print(fname, '->', img.size)


for group in ANIM_GROUPS:
    imgs = [Image.open(os.path.join(SRC, f)).convert('RGBA') for f in group]
    boxes = [im.split()[-1].getbbox() for im in imgs]
    x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
    x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
    w, h = x1 - x0, y1 - y0
    f = MAX_DIM / max(w, h)
    nw, nh = max(1, round(w * f)), max(1, round(h * f))
    for fname, im in zip(group, imgs):
        cropped = im.crop((x0, y0, x1, y1))
        if f < 1:
            cropped = cropped.resize((nw, nh), Image.LANCZOS)
        save_out(fname, cropped)
        handled.add(fname)

for fname in sorted(os.listdir(SRC)):
    if not fname.endswith('.png') or fname in handled:
        continue
    p = os.path.join(SRC, fname)
    img = Image.open(p).convert('RGBA')
    bbox = img.split()[-1].getbbox()
    if bbox:
        img = img.crop(bbox)
    w, h = img.size
    f = MAX_DIM / max(w, h)
    if f < 1:
        img = img.resize((max(1, round(w * f)), max(1, round(h * f))), Image.LANCZOS)
    save_out(fname, img)

print(f"\nbefore: {total_before/1024/1024:.1f} MB  after: {total_after/1024/1024:.1f} MB")
