#!/usr/bin/env python3
"""Generate bonus game overlay background art using Pillow.
Produces HD gradient/texture backgrounds for bonus game overlays.
"""
import os
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
    import math, random
except ImportError:
    print("Installing Pillow...")
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
    import math, random

OUTPUT_DIR = Path("assets/bonus_overlays")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

W, H = 800, 600

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def make_gradient(img, c1, c2, direction='radial'):
    draw = ImageDraw.Draw(img)
    if direction == 'radial':
        cx, cy = W//2, H//2
        maxd = math.sqrt(cx**2 + cy**2)
        for y in range(H):
            for x in range(W):
                d = math.sqrt((x-cx)**2 + (y-cy)**2)
                t = min(1.0, d / maxd)
                draw.point((x, y), lerp_color(c1, c2, t))
    else:
        for y in range(H):
            t = y / H
            col = lerp_color(c1, c2, t)
            draw.line([(0, y), (W, y)], fill=col)
    return img

def add_particles(img, color, count=80, size_range=(2,8), alpha=120):
    overlay = Image.new('RGBA', (W, H), (0,0,0,0))
    draw = ImageDraw.Draw(overlay)
    for _ in range(count):
        x = random.randint(0, W)
        y = random.randint(0, H)
        r = random.randint(*size_range)
        a = random.randint(40, alpha)
        draw.ellipse([x-r, y-r, x+r, y+r], fill=(*color, a))
    img = img.convert('RGBA')
    img = Image.alpha_composite(img, overlay)
    return img.convert('RGB')

def add_grid_lines(img, color=(255,255,255), spacing=60, alpha=18):
    overlay = Image.new('RGBA', (W, H), (0,0,0,0))
    draw = ImageDraw.Draw(overlay)
    for x in range(0, W, spacing):
        draw.line([(x, 0), (x, H)], fill=(*color, alpha), width=1)
    for y in range(0, H, spacing):
        draw.line([(0, y), (W, y)], fill=(*color, alpha), width=1)
    img = img.convert('RGBA')
    img = Image.alpha_composite(img, overlay)
    return img.convert('RGB')

def add_vignette(img):
    overlay = Image.new('RGBA', (W, H), (0,0,0,0))
    draw = ImageDraw.Draw(overlay)
    cx, cy = W//2, H//2
    for r in range(max(W, H), 0, -4):
        t = max(0, (r - max(W,H)*0.4) / (max(W,H)*0.6))
        a = int(t * 180)
        col = (0, 0, 0, a)
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=col, width=4)
    img = img.convert('RGBA')
    img = Image.alpha_composite(img, overlay)
    return img.convert('RGB')

BONUS_THEMES = {
    'tumble': {
        'c1': (15, 5, 35), 'c2': (5, 0, 15),
        'accent': (100, 60, 255), 'particles': 120,
        'desc': 'Cascading purple-blue deep space tumble field',
    },
    'avalanche': {
        'c1': (5, 25, 50), 'c2': (0, 10, 25),
        'accent': (0, 150, 255), 'particles': 100,
        'desc': 'Icy blue avalanche frozen mountain atmosphere',
    },
    'random_multiplier': {
        'c1': (40, 0, 80), 'c2': (20, 0, 40),
        'accent': (200, 100, 255), 'particles': 90,
        'desc': 'Mystical violet multiplier cosmic reveal',
    },
    'zeus_multiplier': {
        'c1': (0, 10, 40), 'c2': (0, 5, 20),
        'accent': (135, 200, 255), 'particles': 60,
        'desc': 'Divine blue-white stormy Olympian atmosphere',
    },
    'money_collect': {
        'c1': (30, 20, 0), 'c2': (15, 10, 0),
        'accent': (255, 200, 0), 'particles': 100,
        'desc': 'Rich golden vault treasure collection overlay',
    },
    'fisherman_collect': {
        'c1': (0, 20, 40), 'c2': (0, 10, 25),
        'accent': (0, 200, 180), 'particles': 80,
        'desc': 'Deep ocean teal fisherman bounty underwater',
    },
    'hold_and_win': {
        'c1': (25, 10, 0), 'c2': (15, 5, 0),
        'accent': (255, 150, 0), 'particles': 70,
        'desc': 'Warm amber fortune hold respin premium',
    },
    'chamber_spins': {
        'c1': (10, 0, 20), 'c2': (5, 0, 12),
        'accent': (180, 80, 255), 'particles': 110,
        'desc': 'Dark mystical chamber escalating power',
    },
    'wheel_multiplier': {
        'c1': (35, 15, 0), 'c2': (20, 8, 0),
        'accent': (255, 170, 0), 'particles': 85,
        'desc': 'Glowing golden prize wheel fortune show',
    },
    'mystery_stacks': {
        'c1': (0, 30, 25), 'c2': (0, 15, 12),
        'accent': (0, 230, 180), 'particles': 95,
        'desc': 'Emerald mysterious stack revelation glow',
    },
    'expanding_wilds': {
        'c1': (0, 35, 10), 'c2': (0, 18, 5),
        'accent': (50, 255, 100), 'particles': 100,
        'desc': 'Vivid green expanding wild power surge',
    },
    'stacked_wilds': {
        'c1': (35, 0, 30), 'c2': (18, 0, 15),
        'accent': (255, 80, 220), 'particles': 90,
        'desc': 'Electric magenta stacked wilds mega reel',
    },
    'coin_respin': {
        'c1': (30, 25, 0), 'c2': (15, 12, 0),
        'accent': (255, 215, 0), 'particles': 110,
        'desc': 'Pure gold coin respin grand jackpot',
    },
}

def generate_overlay(name, theme):
    print(f"Generating: {name}.png — {theme['desc']}")
    img = Image.new('RGB', (W, H))
    img = make_gradient(img, theme['c1'], theme['c2'], 'radial')
    img = add_particles(img, theme['accent'], theme['particles'], (1, 5), 90)
    img = add_particles(img, (255,255,255), 30, (1,2), 40)  # star field
    img = add_grid_lines(img, theme['accent'], 80, 12)
    img = add_vignette(img)
    img = img.filter(ImageFilter.GaussianBlur(0.5))
    out = OUTPUT_DIR / f"{name}.png"
    img.save(out, 'PNG', optimize=True)
    print(f"  Saved: {out} ({out.stat().st_size // 1024}KB)")

if __name__ == '__main__':
    random.seed(42)
    for name, theme in BONUS_THEMES.items():
        generate_overlay(name, theme)
    print(f"\nDone! {len(BONUS_THEMES)} bonus overlays saved to {OUTPUT_DIR}/")
