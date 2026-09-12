# -*- coding: utf-8 -*-
"""생성 원본(165MB)을 실제 웹앱에 쓸 수 있는 용량으로 최적화한다."""
import os
from PIL import Image

BASE = r"C:\Users\강치원\OneDrive\Desktop\webapp\image"
SRC = os.path.join(BASE, "generated_full_20260911")
PLAYER_ANIM = os.path.join(BASE, "player_anim")


def resize_png(path, out_path, max_dim=None, scale=None, optimize=True):
    img = Image.open(path).convert('RGBA')
    w, h = img.size
    if scale:
        nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    elif max_dim:
        f = max_dim / max(w, h)
        if f >= 1:
            nw, nh = w, h
        else:
            nw, nh = max(1, round(w * f)), max(1, round(h * f))
    else:
        nw, nh = w, h
    if (nw, nh) != (w, h):
        img = img.resize((nw, nh), Image.LANCZOS)
    img.save(out_path, optimize=optimize)
    return os.path.getsize(out_path)


def to_jpeg(path, out_path, max_dim=1600, quality=88):
    img = Image.open(path).convert('RGB')
    w, h = img.size
    f = max_dim / max(w, h)
    if f < 1:
        img = img.resize((round(w * f), round(h * f)), Image.LANCZOS)
    img.save(out_path, quality=quality, optimize=True)
    return os.path.getsize(out_path)


total_before = 0
total_after = 0


def track(before_path, after_size):
    global total_before, total_after
    total_before += os.path.getsize(before_path)
    total_after += after_size


# 1) 이미 정규화한 모션은 재축소하지 않는다. 원본 생성/정렬은 별도 도구에서 수행한다.
# 게임이 기대하는 고정 셀 크기로만 축소하므로 같은 입력에 재실행해도 크기가 유지된다.
TARGET_CELLS = {'warrior': (262, 437), 'mage': (220, 370), 'rogue': (235, 263), 'cleric': (294, 448)}
FRAME_COUNTS = {'idle': 4, 'walk': 6, 'attack': 6, 'hit': 3, 'death': 8}
def normalize_player_strip(path):
    cls, state, _direction = os.path.splitext(os.path.basename(path))[0].split('_')
    cw, ch = TARGET_CELLS[cls]
    target = (cw * FRAME_COUNTS[state], ch)
    with Image.open(path) as img:
        if img.size == target:
            return
        if img.width < target[0] or img.height < target[1]:
            raise ValueError(f'{path}: 목표 크기보다 작으므로 원본 복구가 필요합니다.')
        result = img.convert('RGBA').resize(target, Image.Resampling.LANCZOS)
    result.save(path, optimize=True)

os.makedirs(PLAYER_ANIM, exist_ok=True)
for fname in os.listdir(PLAYER_ANIM):
    if fname.endswith('.png'):
        normalize_player_strip(os.path.join(PLAYER_ANIM, fname))

# 2) 바닥 타일 / 벽 텍스처 / 장식 — 512x512
floor_dir = os.path.join(BASE, 'floor')
wall_dir = os.path.join(BASE, 'wall')
decal_dir = os.path.join(BASE, 'decal')
for d in (floor_dir, wall_dir, decal_dir):
    os.makedirs(d, exist_ok=True)

for fname in os.listdir(SRC):
    if not fname.endswith('.png'):
        continue
    p = os.path.join(SRC, fname)
    if fname.startswith('floor_'):
        out = os.path.join(floor_dir, fname)
        track(p, resize_png(p, out, max_dim=512))
    elif fname.startswith('wall_'):
        out = os.path.join(wall_dir, fname)
        track(p, resize_png(p, out, max_dim=512))
    elif fname.startswith('decal_'):
        out = os.path.join(decal_dir, fname)
        track(p, resize_png(p, out, max_dim=420))

# 3) 아이콘 — 160x160
icon_dir = os.path.join(BASE, 'icon')
os.makedirs(icon_dir, exist_ok=True)
for fname in os.listdir(SRC):
    if fname.endswith('.png') and fname.startswith('icon_'):
        p = os.path.join(SRC, fname)
        out = os.path.join(icon_dir, fname)
        track(p, resize_png(p, out, max_dim=160))

# 4) UI 패널/버튼/탭/카드/기타 — 최대 변 900px로 축소
ui_dir = os.path.join(BASE, 'ui2')
os.makedirs(ui_dir, exist_ok=True)
for fname in os.listdir(SRC):
    if fname.endswith('.png') and fname.startswith('ui_'):
        p = os.path.join(SRC, fname)
        out = os.path.join(ui_dir, fname)
        track(p, resize_png(p, out, max_dim=900))

# 5) 타이틀/로비 배경 — JPEG 변환
for fname in ('background_title.png', 'background_lobby.png'):
    p = os.path.join(SRC, fname)
    out = os.path.join(BASE, fname.replace('.png', '.jpg'))
    track(p, to_jpeg(p, out, max_dim=1600, quality=88))

print(f"before: {total_before/1024/1024:.1f} MB  after: {total_after/1024/1024:.1f} MB")
