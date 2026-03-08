#!/usr/bin/env python3
"""Generate bonus game symbol icons using Pillow."""
import os
from pathlib import Path
try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    import math
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    import math

OUTPUT_DIR = Path("assets/bonus_symbols")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SYM_SIZE = 256

SYMBOLS = {
    'wild_gem':     {'emoji': '💎', 'bg': [(50,0,120),(0,0,50)],  'glow': (180,100,255)},
    'wild_star':    {'emoji': '⭐', 'bg': [(80,60,0),(30,20,0)],  'glow': (255,215,0)},
    'scatter_eye':  {'emoji': '👁️', 'bg': [(0,50,100),(0,20,40)], 'glow': (0,200,255)},
    'bonus_chest':  {'emoji': '📦', 'bg': [(60,30,0),(25,12,0)],  'glow': (255,150,0)},
    'coin_gold':    {'emoji': '🪙', 'bg': [(70,55,0),(30,22,0)],  'glow': (255,200,0)},
    'multiplier_x': {'emoji': '✖️', 'bg': [(60,0,80),(25,0,35)],  'glow': (200,80,255)},
    'money_bag':    {'emoji': '💰', 'bg': [(40,35,0),(20,15,0)],  'glow': (255,215,0)},
    'thunder':      {'emoji': '⚡', 'bg': [(0,20,60),(0,8,25)],   'glow': (100,180,255)},
    'seven_lucky':  {'emoji': '7️⃣',  'bg': [(80,0,0),(35,0,0)],   'glow': (255,50,50)},
    'wheel_prize':  {'emoji': '🎡', 'bg': [(60,40,0),(25,15,0)],  'glow': (255,170,0)},
    'fish_collect': {'emoji': '🐟', 'bg': [(0,30,50),(0,12,22)],  'glow': (0,200,180)},
    'mystery_box':  {'emoji': '❓', 'bg': [(20,0,50),(8,0,22)],   'glow': (150,100,255)},
}

def make_sym_gradient(img, c1, c2):
    draw = ImageDraw.Draw(img)
    cx, cy = SYM_SIZE//2, SYM_SIZE//2
    maxd = math.sqrt(cx**2 + cy**2)
    for y in range(SYM_SIZE):
        for x in range(SYM_SIZE):
            d = math.sqrt((x-cx)**2 + (y-cy)**2)
            t = min(1.0, d/maxd)
            col = tuple(int(c1[i]+(c2[i]-c1[i])*t) for i in range(3))
            draw.point((x,y), col)
    return img

def add_glow_ring(img, glow_color, rings=3):
    overlay = Image.new('RGBA', (SYM_SIZE, SYM_SIZE), (0,0,0,0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = SYM_SIZE//2, SYM_SIZE//2
    for i in range(rings, 0, -1):
        r = SYM_SIZE//2 - 4 - i*6
        a = int(80 / i)
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(*glow_color, a), width=3)
    img = img.convert('RGBA')
    img = Image.alpha_composite(img, overlay)
    return img

def generate_symbol(name, config):
    print(f"  Generating symbol: {name}")
    # Base gradient
    img = Image.new('RGB', (SYM_SIZE, SYM_SIZE))
    img = make_sym_gradient(img, config['bg'][0], config['bg'][1])
    # Circular mask
    mask = Image.new('L', (SYM_SIZE, SYM_SIZE), 0)
    draw_mask = ImageDraw.Draw(mask)
    draw_mask.ellipse([8,8,SYM_SIZE-8,SYM_SIZE-8], fill=255)
    # Glow ring
    img = add_glow_ring(img, config['glow'])
    # Slight blur for richness
    img_rgb = img.convert('RGB').filter(ImageFilter.GaussianBlur(0.8))
    # Save with circular crop
    result = Image.new('RGBA', (SYM_SIZE, SYM_SIZE), (0,0,0,0))
    result.paste(img_rgb, mask=mask)
    out = OUTPUT_DIR / f"{name}.png"
    result.save(out, 'PNG')
    print(f"    -> {out}")

if __name__ == '__main__':
    print("Generating bonus symbols...")
    for name, config in SYMBOLS.items():
        generate_symbol(name, config)
    print(f"\nDone! {len(SYMBOLS)} symbols in {OUTPUT_DIR}/")
