import os
from PIL import Image

D = r"C:\Users\강치원\OneDrive\Desktop\webapp\image\ui2"
for fname in os.listdir(D):
    if not fname.endswith('.png'):
        continue
    p = os.path.join(D, fname)
    img = Image.open(p).convert('RGBA')
    bbox = img.split()[-1].getbbox()  # 알파 채널 기준 (RGB 잔여값 때문에 getbbox() 직접 쓰면 안 됨)
    if bbox:
        img.crop(bbox).save(p, optimize=True)
    print(fname, img.size, '->', bbox)
