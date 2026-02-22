#!/usr/bin/env python3
"""
generate_chrome_assets.py
Generates per-chrome-style PNG corner ornaments and frame strips
for the Royal Slots Casino UI chrome system.

Output: assets/chrome/{style}/
  corner_tl.png  80x80  top-left
  corner_tr.png  80x80  top-right
  corner_bl.png  80x80  bottom-left
  corner_br.png  80x80  bottom-right
  frame_top.png  600x50
  frame_bot.png  600x50
"""

import os, sys, math
from PIL import Image, ImageDraw

BASE = os.path.dirname(os.path.abspath(__file__))
CHROME_DIR = os.path.join(BASE, 'assets', 'chrome')
os.makedirs(CHROME_DIR, exist_ok=True)

CS   = 80          # corner size (px)
FW   = 600         # frame strip width
FH   = 50          # frame strip height

# ── Helpers ──────────────────────────────────────────────────────────────────

def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def rgba(h, a=255):
    return (*rgb(h), a)

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i]-c1[i])*t) for i in range(3))


# ── Corner painters ──────────────────────────────────────────────────────────

def draw_corner(style):
    """Return an 80x80 RGBA image of the top-left corner for *style*."""
    img = Image.new('RGBA', (CS, CS), (0, 0, 0, 0))
    d   = ImageDraw.Draw(img)
    C   = CS

    if style == 'candy':
        # Rounded L-bracket in pink→yellow gradient
        for i in range(7):
            frac = i / 6
            c = lerp_color(rgb('#ff6fd8'), rgb('#f7a531'), frac)
            w = 12 - i
            d.arc([i, i, C-i-1, C-i-1], 180, 270, fill=(*c, 230), width=2)
        # L arms
        d.rectangle([0, 0, 12, C], fill=rgba('#ff6fd8', 200))
        d.rectangle([0, 0, C, 12], fill=rgba('#f7a531', 200))
        d.rectangle([0, 0, 12, C], fill=rgba('#ff6fd8', 120))  # blend
        # Corner cap with star-burst circle
        d.ellipse([0, 0, 18, 18], fill=rgba('#ffffff', 220))
        d.ellipse([3, 3, 15, 15], fill=rgba('#ff6fd8', 255))
        # candy dots on arms
        for k in range(3):
            y = 18 + k * 18
            d.ellipse([3, y, 9, y+6], fill=rgba('#ffffff', 180))
        for k in range(3):
            x = 18 + k * 18
            d.ellipse([x, 3, x+6, 9], fill=rgba('#ffffff', 180))

    elif style == 'olympus':
        gold  = rgb('#f5c842')
        lgold = rgb('#ffe57a')
        blue  = rgb('#2a1a6e')
        # Vertical column on left
        d.rectangle([0, 0, 14, C], fill=(*gold, 255))
        d.rectangle([3, 0, 11, C], fill=(*blue, 255))
        for y in range(0, C, 8):
            d.rectangle([3, y, 11, y+4], fill=(*rgb('#1a0f4a'), 255))
        # Horizontal lintel on top
        d.rectangle([0, 0, C, 14], fill=(*gold, 255))
        d.rectangle([0, 3, C, 11], fill=(*blue, 255))
        # Capital (corner block)
        d.rectangle([0, 0, 18, 18], fill=(*gold, 255))
        # Inner arc accent
        d.arc([16, 16, C, C], 180, 270, fill=(*lgold, 160), width=2)
        # Small diamond on lintel
        cx, cy = C//2, 6
        d.polygon([(cx, cy-5), (cx+5, cy), (cx, cy+5), (cx-5, cy)],
                  fill=(*lgold, 255))

    elif style == 'wild':
        stone = rgb('#8b7355')
        dark  = rgb('#3a2810')
        copper= rgb('#b87333')
        # Thick L-bracket stone texture
        d.rectangle([0, 0, 16, C], fill=(*stone, 255))
        d.rectangle([0, 0, C, 16], fill=(*stone, 255))
        # Stone crack lines
        for y in range(0, C, 9):
            d.line([(0, y), (16, y)], fill=(*dark, 80), width=1)
        for x in range(0, C, 9):
            d.line([(x, 0), (x, 16)], fill=(*dark, 80), width=1)
        # Copper corner rivet
        d.ellipse([1, 1, 17, 17], fill=(*copper, 255))
        d.ellipse([4, 4, 14, 14], fill=(*rgb('#d4943a'), 255))
        d.ellipse([6, 6, 12, 12], fill=(*rgb('#8b4a00'), 255))

    elif style == 'egyptian':
        gold  = rgb('#c7a94e')
        sand  = rgb('#1a1006')
        # Thick L-border
        d.rectangle([0, 0, 14, C], fill=(*gold, 255))
        d.rectangle([0, 0, C, 14], fill=(*gold, 255))
        d.rectangle([3, 3, 11, C-3], fill=(*sand, 255))
        d.rectangle([3, 3, C-3, 11], fill=(*sand, 255))
        # Corner scarab circle
        d.ellipse([0, 0, 16, 16], fill=(*gold, 255))
        d.ellipse([3, 3, 13, 13], fill=(*rgb('#8b5e00'), 255))
        # Hieroglyph tick marks on arms
        for k in range(3):
            y = 18 + k * 14
            d.rectangle([4, y, 10, y+6], fill=(*gold, 200))
        for k in range(3):
            x = 18 + k * 14
            d.rectangle([x, 4, x+6, 10], fill=(*gold, 200))

    elif style == 'neon':
        neon  = rgb('#a855f7')
        cyan  = rgb('#06b6d4')
        black = rgb('#05000f')
        # Dark background in corner
        d.rectangle([0, 0, C, C], fill=(*black, 180))
        # Glowing L-arms (layered for glow)
        for w in range(8, 0, -2):
            a = int(40 + (8-w)*20)
            d.rectangle([0, 0, w, C],    fill=(*neon, a))
            d.rectangle([0, 0, C, w],    fill=(*neon, a))
        d.rectangle([0, 0, 4, C], fill=(*neon, 255))
        d.rectangle([0, 0, C, 4], fill=(*neon, 255))
        # Corner glow node
        for r in range(12, 2, -3):
            a = int(80 + (12-r)*15)
            d.ellipse([0, 0, r*2, r*2], fill=(*neon, a))
        d.ellipse([3, 3, 11, 11], fill=(*cyan, 255))
        # Circuit dot pattern
        for k in range(2):
            y = 16 + k * 20
            d.ellipse([1, y, 5, y+4], fill=(*cyan, 160))
        for k in range(2):
            x = 16 + k * 20
            d.ellipse([x, 1, x+4, 5], fill=(*cyan, 160))

    elif style == 'western':
        wood  = rgb('#5c3d1e')
        rope  = rgb('#8b6914')
        metal = rgb('#c0c0c0')
        # Wood plank border
        d.rectangle([0, 0, 16, C], fill=(*wood, 255))
        d.rectangle([0, 0, C, 16], fill=(*wood, 255))
        # Wood grain
        for y in range(0, C, 6):
            d.line([(0, y), (16, y)], fill=(*rgb('#3a2000'), 80), width=1)
        for x in range(0, C, 6):
            d.line([(x, 0), (x, 16)], fill=(*rgb('#3a2000'), 80), width=1)
        # Rope wrap overlay
        d.rectangle([6, 0, 10, C], fill=(*rope, 180))
        d.rectangle([0, 6, C, 10], fill=(*rope, 180))
        # Metal nail/sheriff star at corner
        d.ellipse([2, 2, 14, 14], fill=(*metal, 255))
        cx, cy = 8, 8
        for angle in range(0, 360, 60):
            r = math.radians(angle)
            px = cx + 5 * math.cos(r)
            py = cy + 5 * math.sin(r)
            d.ellipse([int(px)-2, int(py)-2, int(px)+2, int(py)+2],
                      fill=(*rgb('#ffd700'), 255))

    elif style == 'oriental':
        red   = rgb('#c41e3a')
        gold  = rgb('#ffd700')
        dkred = rgb('#7a0c1e')
        # Red lacquer border
        d.rectangle([0, 0, 16, C], fill=(*red, 255))
        d.rectangle([0, 0, C, 16], fill=(*red, 255))
        d.rectangle([3, 3, 13, C-3], fill=(*dkred, 255))
        d.rectangle([3, 3, C-3, 13], fill=(*dkred, 255))
        # Gold corner plate
        d.rectangle([0, 0, 18, 18], fill=(*gold, 255))
        d.ellipse([2, 2, 16, 16], fill=(*rgb('#b8860b'), 255))
        d.ellipse([5, 5, 13, 13], fill=(*gold, 255))
        # Gold filigree dots on arms
        for k in range(3):
            y = 22 + k * 16
            d.ellipse([5, y, 11, y+6], fill=(*gold, 200))
        for k in range(3):
            x = 22 + k * 16
            d.ellipse([x, 5, x+6, 11], fill=(*gold, 200))

    elif style == 'joker':
        chrome = rgb('#d0d0d0')
        red    = rgb('#ff0844')
        black  = rgb('#0a0a0a')
        # Chrome L-bracket
        d.rectangle([0, 0, 16, C], fill=(*chrome, 255))
        d.rectangle([0, 0, C, 16], fill=(*chrome, 255))
        d.rectangle([3, 3, 13, C-3], fill=(*black, 255))
        d.rectangle([3, 3, C-3, 13], fill=(*black, 255))
        # Red accent stripe
        d.rectangle([6, 0, 10, C], fill=(*red, 200))
        d.rectangle([0, 6, C, 10], fill=(*red, 200))
        # Chrome rivet at corner
        d.ellipse([1, 1, 15, 15], fill=(*chrome, 255))
        d.ellipse([4, 4, 12, 12], fill=(*black, 255))
        d.ellipse([6, 6, 10, 10], fill=(*red, 255))

    elif style == 'dark':
        purple = rgb('#6b21a8')
        blood  = rgb('#991b1b')
        black  = rgb('#050008')
        # Dark gothic border
        d.rectangle([0, 0, 14, C], fill=(*purple, 255))
        d.rectangle([0, 0, C, 14], fill=(*purple, 255))
        d.rectangle([3, 3, 11, C-3], fill=(*black, 255))
        d.rectangle([3, 3, C-3, 11], fill=(*black, 255))
        # Blood drip at corner
        d.rectangle([0, 0, 14, 14], fill=(*blood, 255))
        # Gothic arch
        d.arc([2, 2, 12, 18], 180, 360, fill=(*purple, 255), width=2)
        # Bat wing silhouette (simplified)
        d.polygon([(7, 14), (2, 8), (0, 14)], fill=(*rgb('#4a0072'), 200))
        d.polygon([(7, 14), (12, 8), (14, 14)], fill=(*rgb('#4a0072'), 200))

    elif style == 'fishing':
        ocean = rgb('#0077b6')
        foam  = rgb('#48cae4')
        wood  = rgb('#7b4f2e')
        # Wood dock border
        d.rectangle([0, 0, 16, C], fill=(*wood, 255))
        d.rectangle([0, 0, C, 16], fill=(*wood, 255))
        d.rectangle([4, 4, 12, C-4], fill=(*rgb('#4a2e10'), 255))
        d.rectangle([4, 4, C-4, 12], fill=(*rgb('#4a2e10'), 255))
        # Plank lines
        for y in range(0, C, 7):
            d.line([(0, y), (16, y)], fill=(*rgb('#3a1800'), 60), width=1)
        # Blue corner anchor circle
        d.ellipse([0, 0, 18, 18], fill=(*ocean, 255))
        d.ellipse([3, 3, 15, 15], fill=(*foam, 200))
        d.ellipse([6, 6, 12, 12], fill=(*ocean, 255))

    return img


def draw_frame_strip(style):
    """Return a 600x50 RGBA frame strip image for *style*."""
    img = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
    d   = ImageDraw.Draw(img)
    W, H = FW, FH

    if style == 'candy':
        # Gradient stripe top and bottom
        colors = ['#ff6fd8', '#f7a531', '#ffd166', '#f7a531', '#ff6fd8']
        step = W / (len(colors) - 1)
        for x in range(W):
            idx = min(int(x / step), len(colors)-2)
            t   = (x / step) - idx
            c   = lerp_color(rgb(colors[idx]), rgb(colors[idx+1]), t)
            d.rectangle([x, 0,   x, 6],    fill=(*c, 255))
            d.rectangle([x, H-6, x, H],    fill=(*c, 255))
        # Dots on mid strip
        for x in range(20, W, 28):
            d.ellipse([x-4, H//2-4, x+4, H//2+4], fill=rgba('#ffffff', 180))

    elif style == 'olympus':
        gold = rgb('#f5c842')
        blue = rgb('#2a1a6e')
        d.rectangle([0, 0, W, 8],    fill=(*gold, 255))
        d.rectangle([0, H-8, W, H],  fill=(*gold, 255))
        d.rectangle([0, 2, W, 6],    fill=(*blue, 255))
        d.rectangle([0, H-6, W, H-2],fill=(*blue, 255))
        # Column marks
        for x in range(0, W, 45):
            d.rectangle([x, 0, x+3, H], fill=(*gold, 100))
        # Diamond chain
        for x in range(22, W, 45):
            cx, cy = x, H//2
            d.polygon([(cx, cy-6), (cx+6, cy), (cx, cy+6), (cx-6, cy)],
                      fill=(*rgb('#ffe57a'), 200))

    elif style == 'wild':
        stone  = rgb('#8b7355')
        dark   = rgb('#3a2810')
        copper = rgb('#b87333')
        d.rectangle([0, 0, W, 10],   fill=(*stone, 255))
        d.rectangle([0, H-10, W, H], fill=(*stone, 255))
        for x in range(0, W, 8):
            d.line([(x, 0), (x, 10)], fill=(*dark, 80), width=1)
            d.line([(x, H-10), (x, H)], fill=(*dark, 80), width=1)
        # Copper rivet row
        for x in range(18, W, 36):
            d.ellipse([x-4, 3, x+4, 7],   fill=(*copper, 255))
            d.ellipse([x-4, H-7, x+4, H-3], fill=(*copper, 255))

    elif style == 'egyptian':
        gold = rgb('#c7a94e')
        sand = rgb('#1a1006')
        d.rectangle([0, 0, W, 8],    fill=(*gold, 255))
        d.rectangle([0, H-8, W, H],  fill=(*gold, 255))
        d.rectangle([0, 2, W, 6],    fill=(*sand, 200))
        d.rectangle([0, H-6, W, H-2],fill=(*sand, 200))
        # Hieroglyph notch marks
        for x in range(12, W, 22):
            d.rectangle([x, 0, x+4, 8],   fill=(*rgb('#b89030'), 220))
            d.rectangle([x, H-8, x+4, H], fill=(*rgb('#b89030'), 220))

    elif style == 'neon':
        neon = rgb('#a855f7')
        cyan = rgb('#06b6d4')
        # Glow build-up (darkest first)
        for thickness in [8, 6, 4, 3, 2]:
            alpha = int(50 + (8-thickness)*25)
            d.rectangle([0, 0, W, thickness],        fill=(*neon, alpha))
            d.rectangle([0, H-thickness, W, H],      fill=(*neon, alpha))
        # Sharp bright line
        d.rectangle([0, 0, W, 2],    fill=(*neon, 255))
        d.rectangle([0, H-2, W, H],  fill=(*neon, 255))
        # Cyan circuit nodes
        for x in range(30, W, 60):
            d.ellipse([x-3, 1, x+3, 7],   fill=(*cyan, 255))
            d.ellipse([x-3, H-7, x+3, H-1], fill=(*cyan, 255))

    elif style == 'western':
        wood  = rgb('#5c3d1e')
        rope  = rgb('#8b6914')
        metal = rgb('#c0c0c0')
        d.rectangle([0, 0, W, 10],   fill=(*wood, 255))
        d.rectangle([0, H-10, W, H], fill=(*wood, 255))
        # Wood grain
        for x in range(0, W, 7):
            d.line([(x, 0), (x, 10)], fill=(*rgb('#3a2000'), 60), width=1)
        # Rope stripe
        d.rectangle([0, 4, W, 6],    fill=(*rope, 200))
        d.rectangle([0, H-6, W, H-4],fill=(*rope, 200))
        # Metal nail row
        for x in range(20, W, 40):
            d.ellipse([x-3, 3, x+3, 7],   fill=(*metal, 220))
            d.ellipse([x-3, H-7, x+3, H-3], fill=(*metal, 220))

    elif style == 'oriental':
        red  = rgb('#c41e3a')
        gold = rgb('#ffd700')
        d.rectangle([0, 0, W, 9],    fill=(*red, 255))
        d.rectangle([0, H-9, W, H],  fill=(*red, 255))
        # Gold border line
        d.rectangle([0, 9, W, 11],   fill=(*gold, 255))
        d.rectangle([0, H-11, W, H-9], fill=(*gold, 255))
        # Diamond pattern
        for x in range(25, W, 50):
            cx, cy = x, H//2
            d.polygon([(cx, cy-6), (cx+7, cy), (cx, cy+6), (cx-7, cy)],
                      fill=(*gold, 180))

    elif style == 'joker':
        chrome = rgb('#d0d0d0')
        red    = rgb('#ff0844')
        d.rectangle([0, 0, W, 9],    fill=(*chrome, 255))
        d.rectangle([0, H-9, W, H],  fill=(*chrome, 255))
        d.rectangle([0, 3, W, 6],    fill=(*red, 255))
        d.rectangle([0, H-6, W, H-3],fill=(*red, 255))

    elif style == 'dark':
        purple = rgb('#6b21a8')
        blood  = rgb('#991b1b')
        d.rectangle([0, 0, W, 9],    fill=(*purple, 255))
        d.rectangle([0, H-9, W, H],  fill=(*purple, 255))
        d.rectangle([0, 2, W, 5],    fill=(*blood, 200))
        d.rectangle([0, H-5, W, H-2],fill=(*blood, 200))
        # Drip teeth on top strip
        for x in range(8, W, 22):
            h_drip = 6 + (x % 10)
            d.rectangle([x, 0, x+5, h_drip], fill=(*blood, 220))

    elif style == 'fishing':
        ocean = rgb('#0077b6')
        foam  = rgb('#48cae4')
        d.rectangle([0, 0, W, 9],    fill=(*ocean, 255))
        d.rectangle([0, H-9, W, H],  fill=(*ocean, 255))
        # Wave pattern
        for x in range(0, W, 22):
            d.arc([x, 0, x+22, 18], 0, 180,
                  fill=(*foam, 180), width=2)
            d.arc([x, H-18, x+22, H], 180, 360,
                  fill=(*foam, 180), width=2)

    return img


# ── Main generation loop ──────────────────────────────────────────────────────

STYLES = ['candy', 'olympus', 'wild', 'egyptian', 'neon',
          'western', 'oriental', 'joker', 'dark', 'fishing']

generated = 0
for style in STYLES:
    style_dir = os.path.join(CHROME_DIR, style)
    os.makedirs(style_dir, exist_ok=True)

    corner_tl = draw_corner(style)
    corner_tr = corner_tl.transpose(Image.FLIP_LEFT_RIGHT)
    corner_bl = corner_tl.transpose(Image.FLIP_TOP_BOTTOM)
    corner_br = corner_tl.transpose(Image.FLIP_LEFT_RIGHT).transpose(Image.FLIP_TOP_BOTTOM)

    corner_tl.save(os.path.join(style_dir, 'corner_tl.png'))
    corner_tr.save(os.path.join(style_dir, 'corner_tr.png'))
    corner_bl.save(os.path.join(style_dir, 'corner_bl.png'))
    corner_br.save(os.path.join(style_dir, 'corner_br.png'))

    strip = draw_frame_strip(style)
    strip.save(os.path.join(style_dir, 'frame_top.png'))
    # Bottom strip is same image (symmetrical)
    strip.save(os.path.join(style_dir, 'frame_bot.png'))

    generated += 6
    print(f'  [OK] {style} — 6 assets')

print(f'\nDone! {generated} chrome assets generated in assets/chrome/')
