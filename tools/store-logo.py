# 스토어 그림에 로고 얹기. store/art/ 의 글자 없는 원본에 store/steam-library-logo.png 를 얹어 store/ 에 쓴다
# 사용: python tools/store-logo.py   (Pillow 필요)
# 스팀 규격(2026-11 확인): 헤더 920x430, 작은 캡슐 462x174, 큰 캡슐 1232x706, 세로 캡슐 748x896, 라이브러리 캡슐 600x900
# 라이브러리 히어로·페이지 바탕에는 글자를 넣지 않는다
import os
from PIL import Image, ImageFilter

root = os.path.join(os.path.dirname(__file__), '..', 'store')

# 이름: (최종 크기, 로고 너비 비율, 로고 가운데 x 비율, 로고 위 y 비율)
JOBS = {
    'steam-header': ((920, 430), 0.44, 0.27, 0.10),
    'steam-capsule-small': ((462, 174), 0.56, 0.32, 0.08),
    'steam-capsule-main': ((1232, 706), 0.42, 0.30, 0.09),
    'steam-capsule-vertical': ((748, 896), 0.72, 0.50, 0.06),
    'steam-library-capsule': ((600, 900), 0.74, 0.50, 0.06),
    'itch-cover': ((630, 500), 0.56, 0.38, 0.07),
    'share-card': ((1200, 630), 0.40, 0.72, 0.08),
}

def cover(im, size):
    w, h = size
    s = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))

logo = Image.open(os.path.join(root, 'steam-library-logo.png')).convert('RGBA')
logo = logo.crop(logo.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())

for name, (size, lw, cx, top) in JOBS.items():
    base = cover(Image.open(os.path.join(root, 'art', name + '.png')).convert('RGB'), size).convert('RGBA')
    w = round(size[0] * lw)
    lg = logo.resize((w, round(logo.height * w / logo.width)), Image.LANCZOS)
    x, y = round(size[0] * cx - w / 2), round(size[1] * top)
    # 글자 뒤에 종이 빛을 번지게 깔아 그림의 선과 섞이지 않게 한다
    pad = max(8, w // 12)
    halo_a = Image.new('L', (lg.width + pad * 2, lg.height + pad * 2), 0)
    halo_a.paste(lg.getchannel('A').filter(ImageFilter.MaxFilter(9)), (pad, pad))
    halo_a = halo_a.filter(ImageFilter.GaussianBlur(pad / 2)).point(lambda a: min(255, a * 2) * 0.85)
    paper = base.crop((x, y, x + lg.width, y + lg.height)).convert('RGB').resize((1, 1), Image.BOX).getpixel((0, 0))
    halo = Image.new('RGBA', halo_a.size, paper + (0,)); halo.putalpha(halo_a.convert('L'))
    base.alpha_composite(halo, (x - pad, y - pad))
    base.alpha_composite(lg, (x, y))
    base.convert('RGB').save(os.path.join(root, name + '.png'), optimize=True)
    print(name, size)
