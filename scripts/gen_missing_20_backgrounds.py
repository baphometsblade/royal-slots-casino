#!/usr/bin/env python3
"""
gen_missing_20_backgrounds.py
Generates 1920×1080 slot backgrounds for the 20 games missing them.
Each game gets a unique visual treatment based on its theme and accent color.
"""
import math, random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT   = Path(__file__).parent.parent
BG_DIR = ROOT / "assets" / "backgrounds" / "slots"
W, H   = 1920, 1080

# Game ID → (accent_hex, secondary_hex, style)
# style: 'dark','neon','fire','ice','gold','space','nature','luxury','retro'
GAMES = {
    "agent_zero":        ("#2979ff", "#00e5ff", "dark"),
    "big_top_bonanza":   ("#ffd600", "#ff4081", "retro"),
    "black_ops_heist":   ("#546e7a", "#37474f", "dark"),
    "castle_siege":      ("#90a4ae", "#6200ea", "dark"),
    "cleopatra_gold":    ("#ff8f00", "#ffd600", "gold"),
    "clockwork_realm":   ("#a1887f", "#8d6e63", "gold"),
    "dragon_forge":      ("#ff6e40", "#dd2c00", "fire"),
    "galactic_raiders":  ("#7c4dff", "#311b92", "space"),
    "gold_crown_club":   ("#ffd600", "#ff8f00", "luxury"),
    "grand_prix_rush":   ("#ff1744", "#d50000", "fire"),
    "jungle_fury":       ("#69f0ae", "#1b5e20", "nature"),
    "monaco_million":    ("#f50057", "#880e4f", "luxury"),
    "nova_blackhole":    ("#651fff", "#1a0072", "space"),
    "pixel_rewind":      ("#00e676", "#00bfa5", "neon"),
    "rockstar_wild":     ("#d500f9", "#4a148c", "neon"),
    "rome_eternal":      ("#ffd54f", "#e65100", "gold"),
    "snow_queen_riches": ("#82b1ff", "#1565c0", "ice"),
    "solar_fist":        ("#ff9100", "#ff6d00", "fire"),
    "thunder_hero":      ("#ffe600", "#f57f17", "neon"),
    "world_cup_glory":   ("#76ff03", "#33691e", "nature"),
}


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def lerp(a, b, t):
    return tuple(max(0, min(255, int(a[i] + (b[i] - a[i]) * t))) for i in range(3))

def darken(c, f):
    return lerp(c, (0, 0, 0), f)

def lighten(c, f):
    return lerp(c, (255, 255, 255), f)

def blend(c, t=128):
    return (*c, t)


def make_bg(game_id: str, accent: str, secondary: str, style: str) -> Image.Image:
    rng  = random.Random(abs(hash(game_id)))
    ac   = hex_rgb(accent)
    sc   = hex_rgb(secondary)

    # ── Gradient base ─────────────────────────────────────────────────────────
    if style == "dark":
        top   = darken(ac, 0.96)
        mid   = darken(ac, 0.88)
        bot   = darken(sc, 0.90)
    elif style == "fire":
        top   = darken(sc, 0.85)
        mid   = darken(ac, 0.70)
        bot   = (10, 4, 2)
    elif style == "ice":
        top   = (4, 12, 36)
        mid   = darken(ac, 0.75)
        bot   = (2, 6, 18)
    elif style == "neon":
        top   = (4, 4, 8)
        mid   = darken(ac, 0.80)
        bot   = darken(sc, 0.88)
    elif style == "space":
        top   = (2, 2, 12)
        mid   = darken(ac, 0.82)
        bot   = (0, 0, 6)
    elif style == "gold":
        top   = darken(ac, 0.85)
        mid   = darken(sc, 0.75)
        bot   = (12, 6, 0)
    elif style == "nature":
        top   = (2, 14, 4)
        mid   = darken(ac, 0.82)
        bot   = (0, 8, 2)
    elif style == "luxury":
        top   = (4, 0, 8)
        mid   = darken(ac, 0.78)
        bot   = (10, 2, 4)
    elif style == "retro":
        top   = darken(sc, 0.80)
        mid   = darken(ac, 0.65)
        bot   = darken(sc, 0.88)
    else:
        top   = darken(ac, 0.92)
        mid   = darken(ac, 0.78)
        bot   = darken(ac, 0.60)

    img  = Image.new("RGB", (W, H), top)
    draw = ImageDraw.Draw(img)
    # Vertical gradient
    for y in range(H):
        t = y / (H - 1)
        if t < 0.5:
            c = lerp(top, mid, t * 2)
        else:
            c = lerp(mid, bot, (t - 0.5) * 2)
        draw.line([(0, y), (W - 1, y)], fill=c)

    # ── Centre radial glow ────────────────────────────────────────────────────
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd   = ImageDraw.Draw(glow)
    glow_color = lighten(ac, 0.20)
    max_r = 520
    for r in range(max_r, 0, -5):
        a = max(0, int(55 * (1 - r / max_r) ** 1.6))
        gd.ellipse([W//2 - r, H//2 - r, W//2 + r, H//2 + r], fill=(*glow_color, a))
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")

    # ── Secondary off-centre glow ─────────────────────────────────────────────
    g2 = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    g2d = ImageDraw.Draw(g2)
    cx2 = rng.choice([W//4, 3*W//4])
    cy2 = rng.randint(H//4, 3*H//4)
    sc2 = lighten(sc, 0.15)
    for r in range(300, 0, -6):
        a = max(0, int(40 * (1 - r / 300) ** 1.8))
        g2d.ellipse([cx2-r, cy2-r, cx2+r, cy2+r], fill=(*sc2, a))
    img = Image.alpha_composite(img.convert("RGBA"), g2).convert("RGB")

    # ── Atmospheric orbs ──────────────────────────────────────────────────────
    orb_l  = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od     = ImageDraw.Draw(orb_l)
    for _ in range(28):
        cx     = rng.randint(0, W)
        cy     = rng.randint(0, H)
        radius = rng.randint(30, 260)
        col    = rng.choice([darken(ac,0.35), lighten(ac,0.15), darken(sc,0.30), lighten(sc,0.10)])
        a_max  = rng.randint(6, 32)
        for rs in range(radius, 0, -4):
            a = int(a_max * (rs / radius))
            od.ellipse([cx-rs, cy-rs, cx+rs, cy+rs], fill=(*col, a))
    img = Image.alpha_composite(img.convert("RGBA"), orb_l).convert("RGB")

    # ── Style-specific overlay ─────────────────────────────────────────────────
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ovd = ImageDraw.Draw(ov)

    if style in ("fire", "solar_fist"):
        # Upward flame streaks
        for _ in range(12):
            x0 = rng.randint(0, W)
            streakW = rng.randint(4, 40)
            a = rng.randint(8, 28)
            for dx in range(-streakW//2, streakW//2):
                fade = int(a * (1 - abs(dx) / (streakW//2 + 1)))
                ovd.line([(x0+dx, H), (x0+dx-60, 0)], fill=(*lighten(ac, 0.25), fade))
    elif style == "space":
        # Star field
        for _ in range(300):
            sx = rng.randint(0, W)
            sy = rng.randint(0, H)
            sr = rng.choice([1, 1, 1, 2])
            sa = rng.randint(80, 220)
            ovd.ellipse([sx-sr, sy-sr, sx+sr, sy+sr], fill=(255, 255, 255, sa))
    elif style == "ice":
        # Crystal shards / vertical rays
        for _ in range(8):
            x0  = rng.randint(0, W)
            w_r = rng.randint(20, 80)
            for dx in range(-w_r, w_r):
                fade = int(18 * (1 - abs(dx) / w_r))
                ovd.line([(x0+dx, 0), (x0+dx+20, H)], fill=(*lighten(ac, 0.40), fade))
    elif style in ("neon", "retro"):
        # Horizontal scan lines for neon feel
        for y in range(0, H, 4):
            ovd.line([(0, y), (W, y)], fill=(0, 0, 0, 18))
    elif style == "nature":
        # Diagonal light shafts from top-left
        for _ in range(5):
            x0 = rng.randint(-W//3, W//3)
            w_r = rng.randint(40, 120)
            for dx in range(-w_r, w_r):
                fade = int(12 * (1 - abs(dx) / w_r))
                ovd.line([(W//2+x0+dx, 0), (W//2+x0+dx+W//3, H)], fill=(*lighten(sc, 0.30), fade))
    elif style in ("gold", "luxury"):
        # Diagonal shimmer rays
        for _ in range(6):
            x0 = rng.randint(-W//4, W)
            w_r = rng.randint(25, 90)
            for dx in range(-w_r, w_r):
                fade = int(16 * (1 - abs(dx) / w_r))
                ovd.line([(x0+dx, 0), (x0+dx+W//4, H)], fill=(*lighten(ac, 0.55), fade))

    img = Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")

    # ── Light rays (all styles) ────────────────────────────────────────────────
    ray_l = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rd    = ImageDraw.Draw(ray_l)
    hi    = lighten(ac, 0.45)
    for _ in range(4):
        x0  = rng.randint(-W//4, W//4)
        w_r = rng.randint(20, 80)
        for dx in range(-w_r, w_r):
            fade = int(10 * (1 - abs(dx) / w_r))
            rd.line([(W//2+x0+dx, 0), (W//2+x0+dx+W//3, H)], fill=(*hi, fade))
    img = Image.alpha_composite(img.convert("RGBA"), ray_l).convert("RGB")

    # ── Vignette ──────────────────────────────────────────────────────────────
    vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vd  = ImageDraw.Draw(vig)
    steps = min(W, H) // 3
    for i in range(steps):
        a = int(175 * (1 - i / steps) ** 2.2)
        vd.rectangle([(i, i), (W-1-i, H-1-i)], outline=(0, 0, 0, a))
    img = Image.alpha_composite(img.convert("RGBA"), vig).convert("RGB")

    # ── Soft blur for cinematic depth ─────────────────────────────────────────
    img = img.filter(ImageFilter.GaussianBlur(2.0))

    return img


def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    BG_DIR.mkdir(parents=True, exist_ok=True)

    if args.dry_run:
        for gid, (ac, sc, sty) in GAMES.items():
            print(f"  {gid}  accent={ac}  secondary={sc}  style={sty}")
        print(f"\n[dry-run] {len(GAMES)} backgrounds would be written.")
        return

    print(f"Generating {len(GAMES)} slot backgrounds...")
    for i, (gid, (ac, sc, sty)) in enumerate(GAMES.items(), 1):
        out = BG_DIR / f"{gid}_bg.png"
        img = make_bg(gid, ac, sc, sty)
        img.save(out, "PNG", optimize=True)
        kb  = out.stat().st_size // 1024
        print(f"  [{i}/{len(GAMES)}] {gid}  {kb}KB  style={sty}")

    print(f"\nDone! {len(GAMES)} backgrounds written to assets/backgrounds/slots/")


if __name__ == "__main__":
    main()
