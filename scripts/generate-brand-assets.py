#!/usr/bin/env python3
"""Export platform sizes from the reviewed image-generation artwork.

Artwork edits are made with image_gen. This script performs mechanical resizing,
platform masking/padding, and Android alpha-only small-icon normalization.
Requires Pillow; no network access or private credentials.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json

ROOT = Path(__file__).resolve().parents[1]
RES = ROOT / 'android/app/src/main/res'
SOURCE = ROOT / 'resources/brand/app-icon-master.png'
GLYPH_SOURCE = ROOT / 'resources/brand/notification-glyph-master.png'
MASTER = Image.open(SOURCE).convert('RGB')
LANCZOS = Image.Resampling.LANCZOS


def output(image, path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, optimize=True)


def square(size):
    return MASTER.resize((size, size), LANCZOS)


# One reviewed full-bleed icon, never pre-rounded for iOS/PWA/store use.
for name, size in [('app-icon-1024.png', 1024), ('play-store-icon-512.png', 512),
                   ('pwa-icon-192.png', 192), ('pwa-icon-512.png', 512),
                   ('pwa-maskable-512.png', 512), ('toonreels-icon.png', 512),
                   ('toonlyreels-splash-logo.png', 1024)]:
    output(square(size), ROOT / 'public' / name)
output(square(512), ROOT / 'src/assets/toonreels-logo.png')
square(64).save(ROOT / 'public/favicon.ico', format='ICO', sizes=[(16,16),(32,32),(48,48),(64,64)])

# Normalize generated notification artwork to the alpha-only Android contract.
# Low-alpha background segmentation residue is discarded; geometry is unchanged.
alpha = Image.open(GLYPH_SOURCE).convert('RGBA').getchannel('A')
alpha = alpha.point(lambda value: 255 if value >= 128 else 0)
alpha = alpha.crop(alpha.getbbox())


def notification(size, inset=2/24):
    canvas = Image.new('RGBA', (size, size), (255,255,255,0))
    max_edge = round(size * (1 - 2 * inset))
    target = alpha.copy()
    target.thumbnail((max_edge, max_edge), LANCZOS)
    glyph = Image.new('RGBA', target.size, (255,255,255,255))
    glyph.putalpha(target)
    canvas.alpha_composite(glyph, ((size-target.width)//2, (size-target.height)//2))
    return canvas


output(notification(96), ROOT / 'public/notification-badge-96.png')
for density, factor in [('mdpi',1),('hdpi',1.5),('xhdpi',2),('xxhdpi',3),('xxxhdpi',4)]:
    size = round(48 * factor)
    output(square(size), RES / f'mipmap-{density}/ic_launcher.png')
    round_icon = square(size).convert('RGBA')
    mask = Image.new('L', (size*4,size*4), 0)
    ImageDraw.Draw(mask).ellipse((0,0,size*4-1,size*4-1), fill=255)
    round_icon.putalpha(mask.resize((size,size), LANCZOS))
    output(round_icon, RES / f'mipmap-{density}/ic_launcher_round.png')
    # Adaptive artwork has a 108dp layer, with a nominal 72dp mask viewport.
    # Putting the shared icon into that viewport prevents Android's 1.5x crop
    # from enlarging the monogram relative to iOS and the PWA.
    extent = round(108 * factor)
    viewport = round(72 * factor)
    foreground = Image.new('RGBA', (extent, extent), (0,0,0,0))
    foreground.alpha_composite(square(viewport).convert('RGBA'), ((extent-viewport)//2, (extent-viewport)//2))
    output(foreground, RES / f'mipmap-{density}/ic_launcher_foreground.png')
    output(notification(round(24 * factor)), RES / f'drawable-{density}/ic_stat_onesignal_default.png')

output(square(256), RES / 'drawable-nodpi/ic_onesignal_large_icon_default.png')
output(square(256), RES / 'drawable-nodpi/ic_onesignal_large_icon.png')
# Optional Android 13 themed icon uses the same centered brand silhouette.
output(notification(432, inset=0.352), RES / 'drawable-nodpi/ic_launcher_monochrome.png')
(RES / 'drawable/ic_launcher_background.xml').write_text('''<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <gradient android:angle="315" android:startColor="#FF4424" android:centerColor="#FF6D20" android:endColor="#FF9420" />
</shape>
''')
(RES / 'values/ic_launcher_background.xml').write_text('''<?xml version="1.0" encoding="utf-8"?>
<resources><color name="ic_launcher_background">#FF6D20</color></resources>
''')
for version in [26,33]:
    folder = RES / f'mipmap-anydpi-v{version}'
    folder.mkdir(parents=True,exist_ok=True)
    monochrome = '\n    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>' if version >= 33 else ''
    adaptive = f'''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>{monochrome}
</adaptive-icon>
'''
    for name in ['ic_launcher.xml','ic_launcher_round.xml']:
        (folder/name).write_text(adaptive)

catalog = ROOT / 'ios/App/App/Assets.xcassets/AppIcon.appiconset'
if catalog.exists():
    output(square(1024), catalog / 'AppIcon-512@2x.png')

# Native launch screens use the shared brand instead of the Capacitor placeholder.
output(square(512), RES / 'drawable-nodpi/splash_brand.png')
for path in RES.glob('drawable*/splash.png'):
    dimensions = Image.open(path).size
    canvas = Image.new('RGB', dimensions, '#FF6D20')
    edge = round(min(dimensions) * 0.48)
    canvas.paste(square(edge), ((dimensions[0]-edge)//2, (dimensions[1]-edge)//2))
    output(canvas, path)

# Assert the assets that can silently regress after a later icon replacement.
for name, size in [('pwa-icon-192.png',192),('pwa-icon-512.png',512),('play-store-icon-512.png',512)]:
    image = Image.open(ROOT / 'public' / name)
    assert image.size == (size,size) and image.mode == 'RGB'
    assert image.getpixel((0,0)) != (255,255,255)
for density in ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi']:
    image = Image.open(RES/f'drawable-{density}/ic_stat_onesignal_default.png').convert('RGBA')
    pixels = image.tobytes()
    assert any(pixels[index+3] == 0 for index in range(0,len(pixels),4))
    assert all(pixels[index:index+3] == bytes((255,255,255)) for index in range(0,len(pixels),4) if pixels[index+3] > 0)
if catalog.exists():
    ios = Image.open(catalog/'AppIcon-512@2x.png')
    assert ios.size == (1024,1024) and ios.mode == 'RGB'
print(json.dumps({'canonical': 'public/app-icon-1024.png', 'android_small': 'ic_stat_onesignal_default', 'android_large': 'ic_onesignal_large_icon_default', 'ios': str(catalog.relative_to(ROOT)) if catalog.exists() else 'not generated yet'}))
