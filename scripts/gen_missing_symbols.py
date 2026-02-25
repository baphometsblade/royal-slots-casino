#!/usr/bin/env python3
"""
gen_missing_symbols.py
Generates HD programmatic slot symbols (256x256 PNG) for games missing assets.
Uses only Pillow — no AI backend required.

Usage:
  python scripts/gen_missing_symbols.py
"""

import json, math, os, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

CASINO_DIR = Path(__file__).parent.parent
SYMBOLS_DIR = CASINO_DIR / "assets" / "game_symbols"
DATA_FILE   = Path("/tmp/missing_games.json")
SIZE = 256

# ── Color helpers ─────────────────────────────────────────────────────────────

def hex_rgb(h):
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def rgb_hex(r, g, b):
    return f"#{r:02x}{g:02x}{b:02x}"

def lerp_c(a, b, t):
    return tuple(max(0, min(255, int(a[i] + (b[i] - a[i]) * t))) for i in range(3))

def lighten(c, f=0.45):
    return lerp_c(c, (255, 255, 255), f)

def darken(c, f=0.55):
    return lerp_c(c, (0, 0, 0), f)

def with_alpha(c, a=255):
    return (*c, a)


# ── Background: radial gradient ───────────────────────────────────────────────

def make_bg(accent):
    """Create a rich dark radial gradient background."""
    ac = hex_rgb(accent)
    dark = darken(ac, 0.82)
    mid  = darken(ac, 0.60)
    img = Image.new("RGBA", (SIZE, SIZE), (*dark, 255))
    draw = ImageDraw.Draw(img)

    cx, cy = SIZE // 2, SIZE // 2
    steps = SIZE // 2 + 4
    for i in range(steps, 0, -1):
        t = 1.0 - (i / steps)
        c = lerp_c(mid, dark, t)
        r = int(i * SIZE / steps)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*c, 255))

    return img


# ── Glow layer ────────────────────────────────────────────────────────────────

def add_glow(base_img, shape_img, accent, radius=12):
    """Paste a glowing halo behind the symbol shape."""
    ac = hex_rgb(accent)
    bright = lighten(ac, 0.3)
    glow = shape_img.filter(ImageFilter.GaussianBlur(radius=radius))
    # Tint glow to accent color
    glow_tinted = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    for y in range(SIZE):
        for x in range(SIZE):
            pix = glow.getpixel((x, y))
            if pix[3] > 0:
                t = pix[3] / 255
                r, g, b = lerp_c((0, 0, 0), bright, t)
                glow_tinted.putpixel((x, y), (r, g, b, pix[3]))
    base_img = Image.alpha_composite(base_img, glow_tinted)
    return base_img


# ── Shape drawing functions ───────────────────────────────────────────────────

def star_polygon(cx, cy, r_outer, r_inner, points=5, offset=-math.pi/2):
    pts = []
    for i in range(points * 2):
        angle = offset + i * math.pi / points
        r = r_outer if i % 2 == 0 else r_inner
        pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    return pts


def diamond_polygon(cx, cy, w, h):
    return [(cx, cy - h), (cx + w, cy), (cx, cy + h), (cx - w, cy)]


def hexagon_polygon(cx, cy, r, offset=0):
    return [
        (cx + r * math.cos(math.radians(60 * i + offset)), cy + r * math.sin(math.radians(60 * i + offset)))
        for i in range(6)
    ]


def shield_polygon(cx, cy, w, h):
    top_w = w
    return [
        (cx - top_w, cy - h * 0.45),
        (cx + top_w, cy - h * 0.45),
        (cx + top_w, cy + h * 0.10),
        (cx,         cy + h * 0.55),
        (cx - top_w, cy + h * 0.10),
    ]


def arrow_up_polygon(cx, cy, w, h):
    hw = w // 2
    return [
        (cx, cy - h),
        (cx + w, cy),
        (cx + hw, cy),
        (cx + hw, cy + h),
        (cx - hw, cy + h),
        (cx - hw, cy),
        (cx - w, cy),
    ]


# ── Category → shape/color mapping ───────────────────────────────────────────

CATEGORY_SHAPES = {
    # Wild symbols
    "wild": "star6",
    # Royals / cards
    "ace": "diamond", "king": "crown", "queen": "hexagon", "jack": "hexagon",
    # Gems / jewels
    "diamond": "diamond", "crystal": "diamond", "gem": "hexagon", "jewel": "diamond",
    "emerald": "hexagon", "ruby": "diamond", "sapphire": "hexagon",
    # Nature / sky
    "star": "star5", "moon": "crescent", "sun": "sun", "comet": "star5",
    "flower": "star5", "rose": "star5", "lotus": "star5",
    # Money
    "coin": "circle", "gold": "hexagon", "treasure": "diamond",
    "vault": "shield", "safe": "shield", "chest": "shield",
    # Power / fantasy
    "lightning": "bolt", "thunder": "bolt", "flame": "flame",
    "sword": "arrow_up", "blade": "arrow_up", "dagger": "arrow_up",
    "crown": "crown", "shield": "shield",
    "dragon": "star5", "phoenix": "star6",
    # Animals (silhouette-style shape)
    "elephant": "circle", "lion": "circle", "wolf": "circle",
    "giraffe": "circle", "zebra": "circle", "fox": "circle",
    "shark": "circle", "dolphin": "circle", "whale": "circle",
    "bear": "circle", "tiger": "circle",
    # Default
    "default": "star5",
}

def get_shape(sym_name):
    """Pick a shape based on keywords in the symbol name."""
    name = sym_name.lower().split("_")
    for part in reversed(name):  # check last word first
        for key, shape in CATEGORY_SHAPES.items():
            if key in part:
                return shape
    return CATEGORY_SHAPES["default"]


def get_sym_colors(sym_name, accent_hex):
    """Return (fill_color, highlight_color) for a symbol."""
    ac = hex_rgb(accent_hex)
    name = sym_name.lower()

    # Wild → golden
    if "wild" in name:
        return (220, 180, 40), (255, 240, 100)

    # Gem / crystal → complementary bright
    if any(k in name for k in ("diamond", "crystal", "gem", "sapphire", "emerald", "ruby", "jewel")):
        return lighten(ac, 0.5), lighten(ac, 0.8)

    # Coin / gold → golden
    if any(k in name for k in ("coin", "gold", "bar", "cash")):
        return (210, 170, 30), (255, 235, 90)

    # Lightning / flame → orange/yellow
    if any(k in name for k in ("lightning", "thunder", "flame", "fire")):
        return (230, 120, 20), (255, 200, 60)

    # Default: use accent color family
    return lighten(ac, 0.35), lighten(ac, 0.65)


# ── Symbol index → subtle tint shift ─────────────────────────────────────────

SYM_HUE_SHIFT = [0, 30, -30, 15, -15, 45]  # degrees, one per symbol slot


# ── Main symbol renderer ──────────────────────────────────────────────────────

def draw_symbol(sym_name, accent_hex, sym_index=0):
    bg = make_bg(accent_hex)
    shape_layer = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(shape_layer)

    fill, hi = get_sym_colors(sym_name, accent_hex)
    shape = get_shape(sym_name)
    cx, cy = SIZE // 2, SIZE // 2

    is_wild = "wild" in sym_name.lower()

    if shape == "star6" or is_wild:
        # 6-pointed star (wild style)
        outer = int(SIZE * 0.38)
        inner = int(SIZE * 0.20)
        pts = star_polygon(cx, cy, outer, inner, points=6)
        draw.polygon(pts, fill=(*fill, 240))
        pts2 = star_polygon(cx, cy, int(outer * 0.85), int(inner * 0.85), points=6)
        draw.polygon(pts2, fill=(*hi, 200))

    elif shape == "star5":
        outer = int(SIZE * 0.40)
        inner = int(SIZE * 0.17)
        pts = star_polygon(cx, cy, outer, inner, points=5)
        draw.polygon(pts, fill=(*fill, 240))
        pts2 = star_polygon(cx, cy, int(outer * 0.82), int(inner * 0.82), points=5)
        draw.polygon(pts2, fill=(*hi, 200))

    elif shape == "diamond":
        w = int(SIZE * 0.36)
        h = int(SIZE * 0.46)
        pts = diamond_polygon(cx, cy, w, h)
        draw.polygon(pts, fill=(*fill, 240))
        inner_pts = diamond_polygon(cx, cy, int(w * 0.68), int(h * 0.68))
        draw.polygon(inner_pts, fill=(*hi, 200))
        # Facet lines
        mid_y = cy - int(h * 0.2)
        draw.line([(cx, cy - h), (cx + w, cy)], fill=(*hi, 120), width=2)
        draw.line([(cx, cy - h), (cx - w, cy)], fill=(*hi, 120), width=2)

    elif shape == "hexagon":
        r = int(SIZE * 0.38)
        pts = hexagon_polygon(cx, cy, r, offset=0)
        draw.polygon(pts, fill=(*fill, 240))
        pts2 = hexagon_polygon(cx, cy, int(r * 0.72), offset=0)
        draw.polygon(pts2, fill=(*hi, 200))

    elif shape == "circle":
        r = int(SIZE * 0.37)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*fill, 240))
        r2 = int(r * 0.74)
        draw.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], fill=(*hi, 190))
        r3 = int(r * 0.42)
        draw.ellipse([cx - r3, cy - r3, cx + r3, cy + r3], fill=(*darken(fill, 0.25), 220))

    elif shape == "shield":
        w = int(SIZE * 0.33)
        h = int(SIZE * 0.42)
        pts = shield_polygon(cx, cy, w, h)
        draw.polygon(pts, fill=(*fill, 240))
        pts2 = shield_polygon(cx, cy, int(w * 0.72), int(h * 0.72))
        draw.polygon(pts2, fill=(*hi, 190))

    elif shape == "arrow_up":
        w = int(SIZE * 0.28)
        h = int(SIZE * 0.38)
        pts = arrow_up_polygon(cx, cy + int(SIZE * 0.05), w, h)
        draw.polygon(pts, fill=(*fill, 240))
        pts2 = arrow_up_polygon(cx, cy + int(SIZE * 0.05), int(w * 0.7), int(h * 0.7))
        draw.polygon(pts2, fill=(*hi, 200))

    elif shape == "bolt":
        # Lightning bolt outline
        pts = [
            (cx + 14, cy - 48),
            (cx - 8,  cy - 4),
            (cx + 8,  cy - 4),
            (cx - 16, cy + 48),
            (cx + 10, cy + 2),
            (cx - 4,  cy + 2),
        ]
        draw.polygon(pts, fill=(*fill, 240))
        pts_inner = [(x + 2, y + 2) for x, y in pts]
        draw.polygon(pts_inner, fill=(*hi, 160))

    elif shape == "crown":
        base_y = cy + int(SIZE * 0.18)
        top_y  = cy - int(SIZE * 0.22)
        left_x = cx - int(SIZE * 0.30)
        right_x= cx + int(SIZE * 0.30)
        # Crown body rectangle
        draw.rectangle([left_x, cy, right_x, base_y], fill=(*fill, 240))
        # Crown spikes
        spike_pts = [
            (left_x, cy),
            (left_x, top_y + 12),
            (cx - int(SIZE*0.12), cy - 6),
            (cx, top_y),
            (cx + int(SIZE*0.12), cy - 6),
            (right_x, top_y + 12),
            (right_x, cy),
        ]
        draw.polygon(spike_pts, fill=(*fill, 240))
        # Jewels
        for jx in [cx - int(SIZE*0.15), cx, cx + int(SIZE*0.15)]:
            draw.ellipse([jx - 7, base_y - 14, jx + 7, base_y - 2], fill=(*hi, 240))

    elif shape == "crescent":
        r = int(SIZE * 0.36)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*fill, 240))
        offset = int(SIZE * 0.14)
        draw.ellipse([cx - r + offset, cy - r, cx + r + offset, cy + r],
                     fill=(*hex_rgb("#000000"), 255))

    elif shape == "flame":
        flame_pts = [
            (cx,          cy - 52),
            (cx + 22,     cy - 22),
            (cx + 32,     cy + 10),
            (cx + 16,     cy + 40),
            (cx,          cy + 50),
            (cx - 16,     cy + 40),
            (cx - 32,     cy + 10),
            (cx - 22,     cy - 22),
        ]
        draw.polygon(flame_pts, fill=(*fill, 240))
        inner = [(x * 0.6 + cx * 0.4, y * 0.6 + cy * 0.4) for x, y in flame_pts]
        draw.polygon(inner, fill=(*hi, 200))

    elif shape == "sun":
        r = int(SIZE * 0.24)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*fill, 240))
        # Rays
        for deg in range(0, 360, 30):
            rad = math.radians(deg)
            x1 = cx + int((r + 4) * math.cos(rad))
            y1 = cy + int((r + 4) * math.sin(rad))
            x2 = cx + int((r + 22) * math.cos(rad))
            y2 = cy + int((r + 22) * math.sin(rad))
            draw.line([(x1, y1), (x2, y2)], fill=(*hi, 220), width=5)

    else:
        # Fallback: simple centered circle with star overlay
        r = int(SIZE * 0.35)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*fill, 220))
        pts = star_polygon(cx, cy, int(r * 0.7), int(r * 0.32), points=5)
        draw.polygon(pts, fill=(*hi, 200))

    # Add decorative corner dots for non-wild symbols
    if not is_wild:
        for dot_x, dot_y in [(12, 12), (SIZE-12, 12), (12, SIZE-12), (SIZE-12, SIZE-12)]:
            draw.ellipse([dot_x - 4, dot_y - 4, dot_x + 4, dot_y + 4], fill=(*hi, 160))

    # Compose: bg + glow + shape
    bg = add_glow(bg, shape_layer, accent_hex, radius=14)
    result = Image.alpha_composite(bg, shape_layer)

    # Outer border ring
    ring = ImageDraw.Draw(result)
    border_col = lighten(hex_rgb(accent_hex), 0.15)
    ring.ellipse([4, 4, SIZE - 5, SIZE - 5], outline=(*border_col, 140), width=3)

    return result


# ── Wild label overlay ────────────────────────────────────────────────────────

def add_wild_text(img):
    """Add a 'WILD' text label on wild symbols."""
    from PIL import ImageFont
    draw = ImageDraw.Draw(img)
    cx, cy = SIZE // 2, SIZE // 2

    # Draw "WILD" text manually using thick rectangles as a pixel font fallback
    # Simple block letters: W I L D
    col = (255, 240, 80, 240)
    # Just draw a bold text hint — use built-in font
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 38)
    except Exception:
        try:
            font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 36)
        except Exception:
            font = ImageFont.load_default()

    text = "WILD"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = cx - tw // 2, cy - th // 2
    # Shadow
    draw.text((tx + 2, ty + 2), text, font=font, fill=(0, 0, 0, 180))
    draw.text((tx, ty), text, font=font, fill=col)
    return img


# ── Thumbnail generator ───────────────────────────────────────────────────────

def make_thumbnail(game_id, accent_hex, symbols):
    """Generate a 512x680 game thumbnail showing a 3x2 symbol grid."""
    ac = hex_rgb(accent_hex)
    dark = darken(ac, 0.85)
    mid  = darken(ac, 0.68)

    img = Image.new("RGBA", (512, 680), (*dark, 255))
    draw = ImageDraw.Draw(img)

    # Background gradient
    for y in range(680):
        t = y / 679
        c = lerp_c(darken(ac, 0.75), dark, t)
        draw.line([(0, y), (511, y)], fill=(*c, 255))

    # Draw up to 6 symbols in a 3x2 grid
    sym_size = 140
    cols, rows = 3, 2
    pad_x = (512 - cols * sym_size) // 2
    pad_y = (680 - rows * sym_size) // 2 - 20

    for i, sym_name in enumerate(symbols[:6]):
        col_i = i % cols
        row_i = i // cols
        sx = pad_x + col_i * (sym_size + 8)
        sy = pad_y + row_i * (sym_size + 8)
        sym_img = draw_symbol(sym_name, accent_hex, sym_index=i)
        sym_small = sym_img.resize((sym_size, sym_size), Image.LANCZOS)
        img.paste(sym_small, (sx, sy), sym_small)

    # Game title bar at bottom
    bar_y = 680 - 80
    for y in range(bar_y, 680):
        t = (y - bar_y) / 79
        c = lerp_c(darken(ac, 0.7), darken(ac, 0.9), t)
        draw.line([(0, y), (511, y)], fill=(*c, 230))

    # Title text
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 28)
    except Exception:
        font = ImageFont.load_default()
    label = game_id.replace("_", " ").title()
    bbox = draw.textbbox((0, 0), label, font=font)
    tw = bbox[2] - bbox[0]
    tx = (512 - tw) // 2
    ty = bar_y + 22
    hi = lighten(ac, 0.5)
    draw.text((tx + 2, ty + 2), label, font=font, fill=(0, 0, 0, 160))
    draw.text((tx, ty), label, font=font, fill=(*hi, 240))

    return img.convert("RGB")


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    if not DATA_FILE.exists():
        print(f"ERROR: {DATA_FILE} not found. Run the Node extraction first.")
        sys.exit(1)

    games = json.loads(DATA_FILE.read_text())
    thumbs_dir = CASINO_DIR / "assets" / "thumbnails"
    thumbs_dir.mkdir(parents=True, exist_ok=True)

    total_syms = sum(len(g["symbols"]) for g in games)
    print(f"Generating assets for {len(games)} games ({total_syms} symbols + {len(games)} thumbnails)...")

    done_syms = 0
    for gi, game in enumerate(games):
        gid = game["id"]
        accent = game.get("accent", "#ffd700")
        symbols = game["symbols"]

        # Create symbol directory
        sym_dir = SYMBOLS_DIR / gid
        sym_dir.mkdir(parents=True, exist_ok=True)

        for si, sym_name in enumerate(symbols):
            out_path = sym_dir / f"{sym_name}.png"
            img = draw_symbol(sym_name, accent, sym_index=si)
            if "wild" in sym_name.lower():
                img = add_wild_text(img)
            img.save(out_path, "PNG", optimize=True)
            done_syms += 1

        # Thumbnail
        thumb_path = thumbs_dir / f"{gid}.png"
        if not thumb_path.exists():
            thumb = make_thumbnail(gid, accent, symbols)
            thumb.save(thumb_path, "PNG", optimize=True)

        pct = int((gi + 1) / len(games) * 100)
        bar = "#" * (pct // 4) + "." * (25 - pct // 4)
        print(f"  [{bar}] {pct:3d}%  {gid}", flush=True)

    print(f"\n\nDone! Generated {done_syms} symbols across {len(games)} games.")


if __name__ == "__main__":
    main()
