"""
Premium Casino Symbol Generator
Regenerates all game symbols with proper casino-quality graphics.
Detects symbol type from filename and draws appropriate casino icons.
"""
import os
import math
from PIL import Image, ImageDraw, ImageFont

SIZE = 256

# ── Font Setup ─────────────────────────────────────────────────────────────
def load_font(size):
    for path in ['C:/Windows/Fonts/ariblk.ttf', 'C:/Windows/Fonts/arialbd.ttf',
                 'C:/Windows/Fonts/Arial.ttf']:
        try: return ImageFont.truetype(path, size)
        except: pass
    return ImageFont.load_default()

# ── Color Helpers ──────────────────────────────────────────────────────────
def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def blend(c1, c2, t):
    return tuple(int(c1[i]*(1-t)+c2[i]*t) for i in range(3))

def lighten(c, t):
    return blend(c, (255,255,255), t)

def darken(c, t):
    return blend(c, (0,0,0), t)

# ── Gradient Background ────────────────────────────────────────────────────
def draw_bg(img, draw, top_color, bot_color, radius=24):
    """Radial-ish gradient background with rounded corners mask."""
    w, h = img.size
    for y in range(h):
        t = y / h
        # Add slight radial darkening at edges
        for x in range(w):
            edge = min(x, w-x, y, h-y) / 40.0
            edge = min(1.0, edge)
            row_col = blend(top_color, bot_color, t)
            px = blend(darken(row_col, 0.35), row_col, edge)
            draw.point((x, y), fill=px + (255,))
    # Rounded rect mask
    mask = Image.new('L', (w, h), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, w-1, h-1], radius=radius, fill=255)
    img.putalpha(mask)

# ── Glow / Shine Overlay ──────────────────────────────────────────────────
def draw_shine(draw, size):
    """Draw a subtle top-left shine overlay."""
    cx, cy = size//4, size//4
    for r in range(size//2, 0, -2):
        a = int(15 * (1 - r/(size//2)))
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(255,255,255,a))

def draw_border(draw, size, color, width=6, radius=22):
    for i in range(width):
        alpha = 255 - i*30
        c = lighten(color, 0.3 * (1 - i/width))
        draw.rounded_rectangle([i, i, size-1-i, size-1-i], radius=radius-i,
                                outline=c + (min(255, alpha),), width=1)

def draw_inner_glow(draw, size, color, steps=12):
    for i in range(steps, 0, -1):
        a = int(40 * (i/steps))
        draw.rounded_rectangle([i*2, i*2, size-1-i*2, size-1-i*2],
                                radius=18, outline=color + (a,), width=1)

# ── Shape Drawers ──────────────────────────────────────────────────────────
def draw_star(draw, cx, cy, r, n=5, inner_ratio=0.42, color=(255,215,0), outline=None):
    pts = []
    for i in range(n*2):
        angle = math.radians(-90 + i * 180/n)
        radius = r if i%2==0 else r*inner_ratio
        pts.append((cx + radius*math.cos(angle), cy + radius*math.sin(angle)))
    draw.polygon(pts, fill=color)
    if outline:
        draw.polygon(pts, outline=outline)

def draw_diamond(draw, cx, cy, w, h, color, outline=None):
    pts = [(cx, cy-h//2), (cx+w//2, cy), (cx, cy+h//2), (cx-w//2, cy)]
    draw.polygon(pts, fill=color)
    if outline:
        draw.polygon(pts, outline=outline)

def draw_heart(draw, cx, cy, size, color):
    s = size
    # Two circles + triangle
    draw.ellipse([cx - s, cy - s//2, cx, cy + s//2], fill=color)
    draw.ellipse([cx, cy - s//2, cx + s, cy + s//2], fill=color)
    draw.polygon([(cx - s, cy + s//4), (cx + s, cy + s//4), (cx, cy + s)], fill=color)

def draw_lightning(draw, pts_list, color, width=8):
    draw.polygon(pts_list, fill=color)

def draw_coin_symbol(draw, cx, cy, r, color):
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=color)
    ir = int(r*0.75)
    draw.ellipse([cx-ir, cy-ir, cx+ir, cy+ir], fill=darken(color, 0.15))
    ir2 = int(r*0.55)
    draw.ellipse([cx-ir2, cy-ir2, cx+ir2, cy+ir2], fill=color)

def draw_text_centered(draw, text, cx, cy, font, fill, shadow_color=(0,0,0)):
    bbox = draw.textbbox((0,0), text, font=font)
    tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    x, y = cx - tw//2, cy - th//2
    draw.text((x+3, y+3), text, fill=shadow_color+(180,), font=font)
    draw.text((x+1, y+1), text, fill=shadow_color+(100,), font=font)
    draw.text((x, y), text, fill=fill, font=font)

# ── Symbol Type Detection ─────────────────────────────────────────────────
def get_sym_type(sym_name):
    n = sym_name.lower()
    if any(k in n for k in ['cherry']): return 'cherry'
    if any(k in n for k in ['lemon']): return 'lemon'
    if any(k in n for k in ['orange', 'tangerine']): return 'orange'
    if any(k in n for k in ['grape', 'plum']): return 'grape'
    if any(k in n for k in ['banana']): return 'banana'
    if any(k in n for k in ['watermelon', 'melon']): return 'watermelon'
    if any(k in n for k in ['apple']): return 'apple'
    if any(k in n for k in ['strawberry']): return 'strawberry'
    if any(k in n for k in ['lollipop']): return 'lollipop'
    if any(k in n for k in ['candy', 'gummy', 'sweet', 'cupcake', 'cotton']): return 'candy'
    if any(k in n for k in ['seven','_7','hot_7']): return 'seven'
    if 'bar' in n and 'star' not in n: return 'bar'
    if any(k in n for k in ['bell']): return 'bell'
    if any(k in n for k in ['star','asterisk']) and 'star' in n: return 'star'
    if any(k in n for k in ['diamond','diam']): return 'diamond'
    if any(k in n for k in ['crown','royal_c']): return 'crown'
    if any(k in n for k in ['coin','nugget','coin_gold']): return 'coin'
    if any(k in n for k in ['gem','ruby','emerald','sapphire','topaz','crystal','jewel','prism']): return 'gem'
    if any(k in n for k in ['clover']): return 'clover'
    if any(k in n for k in ['heart']): return 'heart'
    if any(k in n for k in ['moon','crescent']): return 'moon'
    if any(k in n for k in ['lightning','bolt','thunder','zeus','electric']): return 'lightning'
    if any(k in n for k in ['skull','death']): return 'skull'
    if any(k in n for k in ['anchor']): return 'anchor'
    if any(k in n for k in ['wolf','lion','tiger','bear','eagle','hawk','buffalo','bison','mustang','horse']): return 'animal'
    if any(k in n for k in ['shark','fish','bass','crab','jellyfish','diver','mermaid']): return 'sea'
    if any(k in n for k in ['sword','axe','dagger','blade','katana','spear']): return 'weapon'
    if any(k in n for k in ['shield','helmet','armor']): return 'shield'
    if any(k in n for k in ['dragon','phoenix']): return 'dragon'
    if any(k in n for k in ['mushroom','flower','rose','sakura','lotus']): return 'flower'
    if any(k in n for k in ['blob','alien','gargantoon']): return 'alien'
    if any(k in n for k in ['bomb','dynamite','tnt','grenade','explosion']): return 'bomb'
    if any(k in n for k in ['book','tome','scroll','spell']): return 'book'
    if any(k in n for k in ['chest','treasure']): return 'chest'
    if any(k in n for k in ['potion','orb','sphere']): return 'orb'
    if any(k in n for k in ['horseshoe']): return 'horseshoe'
    if any(k in n for k in ['chalice','trophy','cup','goblet']): return 'trophy'
    if any(k in n for k in ['gun','pistol','rifle','revolver']): return 'gun'
    if any(k in n for k in ['money_bag','moneybag']): return 'moneybag'
    if any(k in n for k in ['train','locomotive']): return 'train'
    if any(k in n for k in ['feather']): return 'feather'
    if any(k in n for k in ['paw','claw']): return 'paw'
    if any(k in n for k in ['totem']): return 'totem'
    if any(k in n for k in ['hourglass']): return 'hourglass'
    if any(k in n for k in ['ring','band']): return 'ring'
    if any(k in n for k in ['neon','sign']): return 'neon'
    if any(k in n for k in ['volcano','lava','magma','obsidian']): return 'volcano'
    if any(k in n for k in ['scepter','orb_power','throne']): return 'scepter'
    if any(k in n for k in ['mask','maracas','sombrero','taco']): return 'fiesta'
    if any(k in n for k in ['candle','rose_candle']): return 'candle'
    if any(k in n for k in ['vampire','michael','sarah','amber']): return 'vampire'
    if any(k in n for k in ['eye','eyeball']): return 'eye'
    if any(k in n for k in ['tentacle','cthulhu']): return 'tentacle'
    if any(k in n for k in ['chilli','pepper']): return 'chilli'
    if 'wild' in n: return 'wild'
    if 'scatter' in n: return 'scatter'
    if 'bonus' in n: return 'bonus'
    return 'generic'

# ── Individual Symbol Drawers ─────────────────────────────────────────────
def make_symbol(sym_name, accent_hex='#fbbf24'):
    S = SIZE
    C = S // 2
    accent = hex_rgb(accent_hex)

    sym_type = get_sym_type(sym_name)
    is_wild = 'wild' in sym_name.lower()
    is_scatter = 'scatter' in sym_name.lower() or 's5_' in sym_name.lower()

    # Determine colors based on type
    color_map = {
        'cherry':     ('#c0392b','#8b0000'), 'lemon':      ('#f1c40f','#b7950b'),
        'orange':     ('#e67e22','#b94f00'), 'grape':      ('#8e44ad','#5b2c6f'),
        'banana':     ('#f9ca24','#c7960b'), 'watermelon': ('#27ae60','#1a7a44'),
        'apple':      ('#e74c3c','#922b21'), 'strawberry': ('#e74c3c','#9b2335'),
        'lollipop':   ('#e91e63','#880e4f'), 'candy':      ('#e040fb','#7b1fa2'),
        'seven':      ('#e74c3c','#7b241c'), 'bar':        ('#95a5a6','#566573'),
        'bell':       ('#f39c12','#b07d09'), 'star':       ('#f1c40f','#9a7d0a'),
        'diamond':    ('#5dade2','#1a6fa8'), 'crown':      ('#f39c12','#9a640a'),
        'coin':       ('#f1c40f','#b7950b'), 'gem':        ('#9b59b6','#6c3483'),
        'clover':     ('#27ae60','#1a7a44'), 'heart':      ('#e74c3c','#922b21'),
        'moon':       ('#d4ac0d','#9a7d0a'), 'lightning':  ('#f1c40f','#9a7d0a'),
        'skull':      ('#bdc3c7','#717d7e'), 'anchor':     ('#2980b9','#1a5276'),
        'animal':     ('#6e2f1a','#4a1d10'), 'sea':        ('#1abc9c','#0e8a70'),
        'weapon':     ('#7f8c8d','#4d5656'), 'shield':     ('#2980b9','#1a5276'),
        'dragon':     ('#e74c3c','#7b241c'), 'flower':     ('#f06292','#880e4f'),
        'alien':      ('#00e5ff','#006064'), 'bomb':       ('#e74c3c','#922b21'),
        'book':       ('#8d6e63','#4e342e'), 'chest':      ('#f39c12','#9a640a'),
        'orb':        ('#9b59b6','#6c3483'), 'horseshoe':  ('#95a5a6','#566573'),
        'trophy':     ('#f1c40f','#9a7d0a'), 'gun':        ('#717d7e','#4d5656'),
        'moneybag':   ('#27ae60','#1a7a44'), 'train':      ('#e67e22','#b94f00'),
        'feather':    ('#5dade2','#1a6fa8'), 'paw':        ('#8d6e63','#4e342e'),
        'totem':      ('#e67e22','#b94f00'), 'hourglass':  ('#f39c12','#9a640a'),
        'ring':       ('#f1c40f','#9a7d0a'), 'neon':       ('#e91e63','#880e4f'),
        'volcano':    ('#e74c3c','#7b241c'), 'scepter':    ('#f39c12','#9a640a'),
        'fiesta':     ('#e74c3c','#7b241c'), 'candle':     ('#e67e22','#b94f00'),
        'vampire':    ('#c0392b','#922b21'), 'eye':        ('#27ae60','#1a7a44'),
        'tentacle':   ('#1abc9c','#0e8a70'), 'chilli':     ('#e74c3c','#7b241c'),
        'wild':       ('#f1c40f','#9a7d0a'), 'scatter':    ('#9b59b6','#6c3483'),
        'bonus':      ('#27ae60','#1a7a44'), 'generic':    ('#5d6d7e','#2c3e50'),
    }

    top_hex, bot_hex = color_map.get(sym_type, ('#5d6d7e','#2c3e50'))

    # Wilds always gold-themed
    if is_wild:
        top_hex, bot_hex = '#d4ac0d', '#7d6608'

    top = hex_rgb(top_hex)
    bot = hex_rgb(bot_hex)

    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_bg(img, draw, top, bot)

    # Re-draw on a new draw after bg
    draw = ImageDraw.Draw(img)

    # ── Draw main symbol ──────────────────────────────────────────
    W = lighten(top, 0.7)   # icon fill color (light)
    WW = (255, 255, 255)     # bright white
    SH = darken(top, 0.5)   # shadow color

    if sym_type == 'cherry':
        # Two cherries + stems
        r = S//7
        cx1, cy1 = C - r//2 - 4, C + r//2
        cx2, cy2 = C + r//2 + 8, C + r//2 + r//3
        # Stems
        draw.line([cx1, cy1 - r, C - 4, C - S//4], fill=(50,150,50,255), width=5)
        draw.line([cx2, cy2 - r, C - 4, C - S//4], fill=(50,150,50,255), width=5)
        draw.line([C - 4, C - S//4, C - S//6, C - S//3], fill=(50,150,50,255), width=5)
        # Fruits
        draw.ellipse([cx1-r,cy1-r,cx1+r,cy1+r], fill=(220,30,30,255))
        draw.ellipse([cx2-r,cy2-r,cx2+r,cy2+r], fill=(200,20,20,255))
        # Highlights
        hr = max(3, r//3)
        draw.ellipse([cx1-hr+3,cy1-r+5,cx1-hr+3+hr,cy1-r+5+hr], fill=(255,120,120,200))
        draw.ellipse([cx2-hr+3,cy2-r+5,cx2-hr+3+hr,cy2-r+5+hr], fill=(255,120,120,180))

    elif sym_type == 'lemon':
        # Oval lemon
        draw.ellipse([C-S//3, C-S//4, C+S//3, C+S//4], fill=(240,210,0,255))
        draw.ellipse([C-S//3+4, C-S//4+4, C+S//3-4, C+S//4-4], fill=(255,230,50,255))
        draw.ellipse([C-S//5, C-S//6, C-S//8, C-S//10], fill=(255,255,180,200))
        # Tip bumps
        draw.ellipse([C+S//3-14,C-10,C+S//3+8,C+10], fill=(200,180,0,255))
        draw.ellipse([C-S//3-8,C-10,C-S//3+14,C+10], fill=(200,180,0,255))

    elif sym_type == 'orange':
        draw.ellipse([C-S//3+5,C-S//3+5,C+S//3-5,C+S//3-5], fill=(220,120,0,255))
        draw.ellipse([C-S//3+10,C-S//3+10,C+S//3-10,C+S//3-10], fill=(240,140,20,255))
        draw.ellipse([C-S//5,C-S//5,C-S//8,C-S//8+10], fill=(255,200,120,180))
        # Top stem
        draw.rectangle([C-4,C-S//3-5,C+4,C-S//3+8], fill=(50,150,50,255))

    elif sym_type == 'grape':
        # Cluster of circles
        r = S//9
        positions = [(C-r*2,C),(C,C-r),(C+r*2,C),(C-r,C+r*2),(C+r,C+r*2),(C,C+r*1)]
        for px, py in positions:
            draw.ellipse([px-r,py-r,px+r,py+r], fill=(140,60,180,255))
            draw.ellipse([px-r//2,py-r*2//3,px-r//4,py-r//3], fill=(200,150,220,180))

    elif sym_type in ('banana',):
        # Banana arc
        for i in range(20):
            t = i / 20.0
            angle = math.radians(-30 + t * 120)
            x = int(C + (S//3) * math.cos(angle))
            y = int(C - (S//4) * math.sin(angle) + S//8)
            draw.ellipse([x-12,y-7,x+12,y+7], fill=(240,200,0,255))

    elif sym_type == 'watermelon':
        # Semicircle watermelon
        r = S//3
        draw.pieslice([C-r,C-r//2,C+r,C+r+r//2], start=180, end=360, fill=(200,30,30,255))
        draw.pieslice([C-r+12,C-r//2+12,C+r-12,C+r+r//2-12], start=180, end=360, fill=(100,200,80,255))
        draw.pieslice([C-r+22,C-r//2+22,C+r-22,C+r+r//2-22], start=180, end=360, fill=(250,80,80,255))
        # Seeds
        for sx, sy in [(C-S//6,C+S//8),(C,C+S//6),(C+S//6,C+S//8)]:
            draw.ellipse([sx-5,sy-8,sx+5,sy+8], fill=(30,30,30,220))

    elif sym_type == 'seven':
        font_big = load_font(S//2)
        draw_text_centered(draw, '7', C, C+S//20, font_big,
                           fill=(255,230,50,255), shadow_color=(100,0,0))

    elif sym_type == 'bar':
        # BAR pill shape
        bw, bh = S*2//3, S//4
        bx, by = C-bw//2, C-bh//2
        draw.rounded_rectangle([bx,by,bx+bw,by+bh], radius=bh//2,
                                fill=(200,200,200,255))
        draw.rounded_rectangle([bx+4,by+4,bx+bw-4,by+bh-4], radius=bh//2-4,
                                fill=(230,230,230,255))
        font_bar = load_font(int(bh*0.7))
        draw_text_centered(draw, 'BAR', C, C+2, font_bar,
                           fill=(40,40,40,255), shadow_color=(180,180,180))

    elif sym_type == 'bell':
        # Bell silhouette
        bw, bh = S//2, S//2
        # Bell dome
        draw.pieslice([C-bw//2,C-bh//2-8,C+bw//2,C+bh//2-8], start=180, end=360,
                      fill=(240,180,0,255))
        # Bell body/clapper base
        draw.rectangle([C-bw//2,C-8,C+bw//2,C+S//6], fill=(240,180,0,255))
        # Flat bottom
        draw.rectangle([C-bw//2-8,C+S//6,C+bw//2+8,C+S//6+14], fill=(200,140,0,255))
        # Clapper
        draw.ellipse([C-10,C+S//6-4,C+10,C+S//6+16], fill=(180,120,0,255))
        # Highlight
        draw.ellipse([C-bw//4,C-bh//4,C-bw//4+20,C-bh//4+20], fill=(255,230,120,160))

    elif sym_type == 'star':
        draw_star(draw, C, C+S//20, S//2-16, color=(240,200,0,255),
                  outline=(180,140,0,255))
        draw_star(draw, C, C+S//20, int((S//2-16)*0.42), 5,
                  color=(255,230,100,255))

    elif sym_type == 'diamond':
        draw_diamond(draw, C, C, S*2//3, S*2//3, color=(80,160,220,255))
        draw_diamond(draw, C, C, int(S*2//3*0.7), int(S*2//3*0.7), color=(100,190,255,255))
        draw_diamond(draw, C, C, int(S*2//3*0.3), int(S*2//3*0.3), color=(200,235,255,220))

    elif sym_type == 'crown':
        # Crown shape
        bx, by = C-S//3, C
        bw, bh = S*2//3, S//4
        # Base
        draw.rectangle([bx,by,bx+bw,by+bh], fill=(220,170,0,255))
        # Spikes
        for i in range(5):
            sx = bx + i*(bw//4)
            spike_h = (S//3 if i%2==0 else S//5)
            draw.polygon([(sx,by),(sx+bw//8,by-spike_h),(sx+bw//4,by)],
                         fill=(240,190,20,255))
        # Jewels
        for i, col in enumerate([(220,20,60),(80,160,220),(100,200,80)]):
            jx = bx + bw//4 + i*(bw//4) - 10
            jy = by + bh//4
            draw.ellipse([jx,jy,jx+14,jy+14], fill=col+(255,))

    elif sym_type == 'coin':
        r = S//3
        draw_coin_symbol(draw, C, C, r, (220,180,0))
        font_c = load_font(S//5)
        draw_text_centered(draw, '$', C, C+4, font_c,
                           fill=(255,240,100,255), shadow_color=(100,80,0))

    elif sym_type == 'gem':
        # Hexagonal gem
        r = S//3
        pts = [(C + r*math.cos(math.radians(i*60-30)), C + r*math.sin(math.radians(i*60-30)))
               for i in range(6)]
        draw.polygon(pts, fill=(160,80,220,255))
        ir = int(r*0.65)
        pts2 = [(C + ir*math.cos(math.radians(i*60-30)), C + ir*math.sin(math.radians(i*60-30)))
                for i in range(6)]
        draw.polygon(pts2, fill=(190,120,240,255))
        # Facet lines
        for i in range(6):
            draw.line([C, C, pts[i][0], pts[i][1]], fill=(220,180,255,80), width=2)
        # Shine
        draw.ellipse([C-r//3,C-r//2,C-r//6,C-r//4], fill=(255,255,255,160))

    elif sym_type == 'heart':
        hs = S//4
        draw_heart(draw, C, C-8, hs, (220,30,30,255))
        draw_heart(draw, C, C-8, int(hs*0.75), (240,70,70,255))
        # Highlight
        draw.ellipse([C-hs//2,C-hs,C-hs//4,C-hs*3//4], fill=(255,150,150,160))

    elif sym_type == 'moon':
        r = S//3
        draw.ellipse([C-r,C-r,C+r,C+r], fill=(220,190,50,255))
        draw.ellipse([C,C-r,C+r+r//3,C+r], fill=darken(top, 0.3)+(255,))

    elif sym_type == 'lightning':
        # Lightning bolt
        pts = [(C-S//8,C-S//3), (C+S//12,C-S//12), (C+S//8,C-S//12),
               (C-S//12,C+S//3), (C-S//8,C+S//12), (C-S//12,C+S//12)]
        draw.polygon(pts, fill=(240,220,0,255))
        pts2 = [(x+4,y+4) for x,y in pts]
        draw.polygon(pts2, fill=(200,180,0,100))

    elif sym_type == 'wild':
        draw_star(draw, C, C, S//2-14, color=(240,200,0,255), outline=(180,140,0,255))
        draw_star(draw, C, C, int((S//2-14)*0.45), color=(255,240,140,255))
        font_w = load_font(S//6)
        draw_text_centered(draw, 'WILD', C, C+4, font_w,
                           fill=(60,30,0,255), shadow_color=(0,0,0))

    elif sym_type == 'skull':
        # Skull dome + jaw
        sr = S//4
        draw.ellipse([C-sr,C-sr-sr//4,C+sr,C+sr-sr//4], fill=(220,220,220,255))
        # Jaw
        draw.rectangle([C-sr*3//4,C+sr//3-sr//4,C+sr*3//4,C+sr-sr//4+4], fill=(200,200,200,255))
        # Eyes
        er = sr//3
        draw.ellipse([C-sr//2-er,C-sr//2,C-sr//2+er,C-sr//2+er], fill=(30,30,30,255))
        draw.ellipse([C+sr//2-er,C-sr//2,C+sr//2+er,C-sr//2+er], fill=(30,30,30,255))
        # Nose
        draw.polygon([(C,C-4),(C-8,C+8),(C+8,C+8)], fill=(30,30,30,200))
        # Teeth
        tw = sr//4
        for i in range(-1,2):
            tx = C + i*tw
            draw.rectangle([tx-tw//3,C+sr//3-sr//4+2,tx+tw//3,C+sr//3-sr//4+sr//4], fill=(30,30,30,200))

    elif sym_type == 'alien':
        # Alien blob with eyes
        r = int(S//3.2)
        # Body
        draw.ellipse([C-r,C-r+8,C+r,C+r+8], fill=(0,200,200,255))
        # Head/dome
        draw.ellipse([C-r+8,C-r-8,C+r-8,C+r-8], fill=(0,220,220,255))
        # Eyes
        draw.ellipse([C-r//2-8,C-r//3,C-r//2+10,C-r//3+16], fill=(255,255,255,255))
        draw.ellipse([C+r//2-10,C-r//3,C+r//2+8,C-r//3+16], fill=(255,255,255,255))
        draw.ellipse([C-r//2-4,C-r//3+4,C-r//2+6,C-r//3+12], fill=(0,0,0,255))
        draw.ellipse([C+r//2-6,C-r//3+4,C+r//2+4,C-r//3+12], fill=(0,0,0,255))
        # Tentacles
        for i in [-2,-1,0,1,2]:
            tx = C + i*(r//2)
            draw.line([tx,C+r+4,tx+i*8,C+r+30], fill=(0,160,160,220), width=6)

    elif sym_type == 'bomb':
        r = S//3
        draw.ellipse([C-r,C-r,C+r,C+r], fill=(40,40,40,255))
        draw.ellipse([C-r+8,C-r+8,C-r+8+r//2,C-r+8+r//2], fill=(70,70,70,255))
        # Fuse
        draw.line([C+r-8,C-r+8,C+r+10,C-r-10], fill=(140,90,40,255), width=6)
        draw.ellipse([C+r+6,C-r-14,C+r+18,C-r-2], fill=(255,160,0,255))

    elif sym_type == 'sea':
        # Fish/shark shape
        r = S//4
        draw.ellipse([C-r*2+10,C-r,C+r//2,C+r], fill=(0,160,200,255))
        # Tail
        draw.polygon([(C+r//2-4,C),(C+r*2,C-r),(C+r*2,C+r)], fill=(0,130,170,255))
        # Eye
        draw.ellipse([C-r,C-r//2,C-r+16,C-r//2+16], fill=(255,255,255,255))
        draw.ellipse([C-r+4,C-r//2+4,C-r+12,C-r//2+12], fill=(0,0,0,255))
        # Fin
        draw.polygon([(C-r+20,C-r),(C,C-r*2+10),(C+r//3,C-r)], fill=(0,140,180,255))

    elif sym_type == 'book':
        bw, bh = S//2, int(S*0.55)
        bx, by = C-bw//2, C-bh//2
        # Pages
        draw.rectangle([bx,by,bx+bw,by+bh], fill=(200,160,100,255))
        draw.rectangle([bx+6,by+4,bx+bw-2,by+bh-4], fill=(240,220,180,255))
        # Spine
        draw.rectangle([bx,by,bx+14,by+bh], fill=(140,90,50,255))
        # Lines (text)
        for i in range(4):
            ly = by + bh//5 + i*(bh//6)
            draw.line([bx+20,ly,bx+bw-12,ly], fill=(180,140,80,160), width=3)
        # Symbol on cover
        font_bk = load_font(S//5)
        draw_text_centered(draw, '📖', C+8, C, font_bk,
                           fill=(100,60,20,255), shadow_color=(0,0,0))

    elif sym_type == 'trophy':
        # Trophy cup
        tw, th = S*2//5, S*2//5
        tx, ty = C-tw//2, C-th//2-S//10
        # Cup
        draw.arc([tx,ty,tx+tw,ty+th], start=200, end=340, fill=(220,180,0,255), width=18)
        draw.line([tx+tw//2,ty+th//2,tx+tw//2,ty+th+S//8], fill=(180,140,0,255), width=12)
        draw.rectangle([C-tw//3,ty+th+S//8,C+tw//3,ty+th+S//8+12], fill=(180,140,0,255))
        # Handles
        draw.arc([tx-20,ty+10,tx+20,ty+th-10], start=90, end=270, fill=(200,160,0,255), width=8)
        draw.arc([tx+tw-20,ty+10,tx+tw+20,ty+th-10], start=270, end=90, fill=(200,160,0,255), width=8)
        # Star on cup
        draw_star(draw, C, ty+th//3, S//8, color=(240,210,0,255))

    elif sym_type == 'animal':
        # Stylized animal head (wolf/lion etc)
        draw.ellipse([C-S//3,C-S//3,C+S//3,C+S//3], fill=(120,80,40,255))
        draw.ellipse([C-S//4,C-S//3+8,C+S//4,C+S//3-8+S//5], fill=(160,110,60,255))
        # Eyes
        draw.ellipse([C-S//6,C-S//8,C-S//8,C], fill=(255,200,0,255))
        draw.ellipse([C+S//8,C-S//8,C+S//6,C], fill=(255,200,0,255))
        draw.ellipse([C-S//7+4,C-S//10,C-S//10,C-4], fill=(0,0,0,255))
        draw.ellipse([C+S//10,C-S//10,C+S//7-4,C-4], fill=(0,0,0,255))
        # Ears
        draw.polygon([(C-S//3,C-S//4),(C-S//4,C-S//2),(C-S//8,C-S//4)], fill=(100,60,30,255))
        draw.polygon([(C+S//3,C-S//4),(C+S//4,C-S//2),(C+S//8,C-S//4)], fill=(100,60,30,255))

    elif sym_type == 'weapon':
        # Sword/Axe
        draw.line([C, C-S//2+20, C, C+S//2-20], fill=(180,190,200,255), width=16)
        draw.polygon([(C-8,C-S//2+20),(C+8,C-S//2+20),(C,C-S//2-10)], fill=(200,210,220,255))
        draw.rectangle([C-S//5,C-S//10,C+S//5,C], fill=(140,90,40,255))
        # Shine
        draw.line([C-3,C-S//2+25,C-3,C], fill=(255,255,255,100), width=4)

    elif sym_type == 'flower':
        # Simple flower
        r = S//6
        for i in range(8):
            angle = math.radians(i*45)
            px = int(C + r*1.4*math.cos(angle))
            py = int(C + r*1.4*math.sin(angle))
            draw.ellipse([px-r,py-r,px+r,py+r], fill=(240,100,140,255))
        draw.ellipse([C-r,C-r,C+r,C+r], fill=(255,220,0,255))
        draw.ellipse([C-r//2,C-r//2,C+r//2,C+r//2], fill=(255,240,100,255))

    elif sym_type == 'chilli':
        # Red chilli pepper
        draw.pieslice([C-S//6,C-S//3,C+S//6,C+S//4], start=220, end=360, fill=(200,0,0,255))
        draw.pieslice([C-S//8,C-S//3+8,C+S//8,C+S//4-8], start=220, end=360, fill=(230,30,30,255))
        draw.line([C+S//6-4,C-S//3+S//4,C+S//5,C-S//3-S//10], fill=(50,150,50,255), width=5)
        draw.ellipse([C+S//5-6,C-S//3-S//10-6,C+S//5+6,C-S//3-S//10+6], fill=(50,150,50,255))

    elif sym_type in ('moneybag','money'):
        # Money bag
        r = S//3
        draw.ellipse([C-r,C-r+S//6,C+r,C+r+S//6], fill=(50,180,50,255))
        draw.ellipse([C-r+8,C-r+S//6+8,C+r-8,C+r+S//6-8], fill=(70,200,70,255))
        draw.rectangle([C-S//8,C-r+S//6-S//6,C+S//8,C-r+S//6+4], fill=(50,150,50,255))
        draw.ellipse([C-S//10,C-r+S//6-S//5,C+S//10,C-r+S//6-S//8], fill=(40,130,40,255))
        font_m = load_font(S//4)
        draw_text_centered(draw, '$', C, C+S//8, font_m,
                           fill=(220,255,220,255), shadow_color=(0,80,0))

    elif sym_type == 'orb':
        r = S//3
        draw.ellipse([C-r,C-r,C+r,C+r], fill=(160,80,220,255))
        draw.ellipse([C-r+8,C-r+8,C+r-8,C+r-8], fill=(180,100,240,255))
        draw.ellipse([C-r+20,C-r+20,C-r+20+r//2,C-r+20+r//2], fill=(220,180,255,160))
        # Inner glow cross
        draw.line([C,C-r//2,C,C+r//2], fill=(255,255,255,100), width=4)
        draw.line([C-r//2,C,C+r//2,C], fill=(255,255,255,100), width=4)

    elif sym_type == 'volcano':
        # Volcano cone
        pts = [(C,C-S//3+10),(C-S//3,C+S//3-10),(C+S//3,C+S//3-10)]
        draw.polygon(pts, fill=(80,40,20,255))
        # Lava at top
        for i in range(3):
            lx = C + (i-1)*12
            draw.ellipse([lx-10,C-S//3-8,lx+10,C-S//3+16], fill=(220,80,0,255))
        # Crater
        draw.ellipse([C-20,C-S//3,C+20,C-S//3+20], fill=(180,40,0,255))

    else:
        # Generic: styled text based on symbol name
        label = sym_name.replace('s1_','').replace('s2_','').replace('s3_','') \
                        .replace('s4_','').replace('s5_','').replace('_',' ').title()
        if len(label) > 5: label = label[:5]
        fs = S//5 if len(label) <= 3 else S//7
        font_g = load_font(fs)
        draw_text_centered(draw, label, C, C, font_g,
                           fill=W+(255,), shadow_color=SH)

    # ── Overlays ──────────────────────────────────────────────────
    draw_shine(draw, S)

    # Wild golden border + inner glow
    if is_wild:
        draw_inner_glow(draw, S, (255,215,0), steps=8)
        draw_border(draw, S, (200,160,0), width=7)
    elif is_scatter:
        draw_inner_glow(draw, S, lighten(top, 0.4), steps=5)
        draw_border(draw, S, lighten(top, 0.2), width=4)
    else:
        draw_border(draw, S, darken(top, 0.1), width=4)

    return img

# ── Main ──────────────────────────────────────────────────────────────────
def main():
    base = 'assets/game_symbols'
    total = 0
    games = sorted(os.listdir(base))
    for game_id in games:
        game_dir = os.path.join(base, game_id)
        if not os.path.isdir(game_dir): continue
        symbols = [f for f in os.listdir(game_dir) if f.endswith('.png')]
        for sym_file in symbols:
            sym_name = sym_file[:-4]  # strip .png
            # Determine accent from game name
            accent = '#fbbf24'
            if 'wild' in sym_name: accent = '#ffd700'
            img = make_symbol(sym_name, accent)
            out_path = os.path.join(game_dir, sym_file)
            img.save(out_path)
            total += 1
        print(f'  ✓ {game_id}: {len(symbols)} symbols')
    print(f'\nTotal: {total} symbols regenerated across {len(games)} games')

if __name__ == '__main__':
    main()
