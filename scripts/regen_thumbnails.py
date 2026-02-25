#!/usr/bin/env python3
"""
regen_thumbnails.py
Rebuilds HD 512x680 game thumbnails for games that have tiny placeholder thumbnails
(< 30KB) by compositing their existing HD SDXL symbol PNGs into a styled grid.

Usage:
    py -3.10 scripts/regen_thumbnails.py [--dry-run]
"""
import re, sys, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT       = Path(__file__).parent.parent
SYMS_DIR   = ROOT / "assets" / "game_symbols"
THUMB_DIR  = ROOT / "assets" / "thumbnails"
DEFS_FILE  = ROOT / "shared" / "game-definitions.js"
W, H       = 512, 680
THRESHOLD  = 30_000   # bytes — thumbnails smaller than this get rebuilt


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def lerp_c(a, b, t):
    return tuple(max(0, min(255, int(a[i] + (b[i] - a[i]) * t))) for i in range(3))

def darken(c, f=0.7):
    return lerp_c(c, (0, 0, 0), f)

def lighten(c, f=0.4):
    return lerp_c(c, (255, 255, 255), f)


def load_game_meta():
    """Parse game id + accentColor from game-definitions.js."""
    src = DEFS_FILE.read_text(encoding="utf-8")
    games = {}
    for m in re.finditer(r"id:\s*'([^']+)'", src):
        gid = m.group(1)
        pos = m.end()
        chunk = src[pos:pos+600]
        ac_m = re.search(r"accentColor:\s*'([^']+)'", chunk)
        accent = ac_m.group(1) if ac_m else "#ffd700"
        sym_m = re.search(r"symbols:\s*\[([^\]]+)\]", chunk)
        symbols = re.findall(r"'([^']+)'", sym_m.group(1)) if sym_m else []
        games[gid] = {"accent": accent, "symbols": symbols}
    return games


def make_hd_thumbnail(game_id: str, accent: str, symbols: list[str]) -> Image.Image:
    ac  = hex_rgb(accent)
    bg1 = darken(ac, 0.88)
    bg2 = darken(ac, 0.72)
    hi  = lighten(ac, 0.45)

    img = Image.new("RGBA", (W, H), (*bg1, 255))
    draw = ImageDraw.Draw(img)

    # Vertical gradient background
    for y in range(H):
        t = y / (H - 1)
        c = lerp_c(bg1, bg2, t)
        draw.line([(0, y), (W - 1, y)], fill=(*c, 255))

    # Subtle radial centre glow
    glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    for r in range(220, 0, -4):
        alpha = max(0, int(28 * (1 - r / 220)))
        gd.ellipse([W//2 - r, H//2 - r, W//2 + r, H//2 + r],
                   fill=(*lighten(ac, 0.2), alpha))
    img = Image.alpha_composite(img, glow_layer)
    draw = ImageDraw.Draw(img)

    # Symbol grid — 3 columns × 2 rows
    SYM = 140
    COLS, ROWS = 3, 2
    GAP = 10
    grid_w = COLS * SYM + (COLS - 1) * GAP
    grid_h = ROWS * SYM + (ROWS - 1) * GAP
    ox = (W - grid_w) // 2
    oy = (H - grid_h) // 2 - 24   # shift slightly up for title bar

    sym_dir = SYMS_DIR / game_id
    placed = 0
    for i, sym_name in enumerate(symbols[:6]):
        src = sym_dir / f"{sym_name}.png"
        if not src.exists():
            continue
        col_i = placed % COLS
        row_i = placed // COLS
        sx = ox + col_i * (SYM + GAP)
        sy = oy + row_i * (SYM + GAP)

        sym_img = Image.open(src).convert("RGBA").resize((SYM, SYM), Image.LANCZOS)

        # Drop shadow behind each symbol
        shadow = Image.new("RGBA", (SYM + 8, SYM + 8), (0, 0, 0, 0))
        shadow.paste((0, 0, 0, 90), [4, 4, SYM + 4, SYM + 4])
        shadow = shadow.filter(ImageFilter.GaussianBlur(4))
        img.paste(shadow, (sx - 4, sy - 4), shadow)

        img.paste(sym_img, (sx, sy), sym_img)
        placed += 1

    # Title bar gradient at bottom
    bar_y = H - 88
    for y in range(bar_y, H):
        t = (y - bar_y) / (H - bar_y - 1)
        c = lerp_c(darken(ac, 0.78), darken(ac, 0.94), t)
        draw.line([(0, y), (W - 1, y)], fill=(*c, 240))

    # Thin accent line above title
    draw.rectangle([0, bar_y, W, bar_y + 2], fill=(*hi, 180))

    # Game title text
    label = game_id.replace("_", " ").title()
    font = None
    for fname in ["arialbd.ttf", "arial.ttf", "DejaVuSans-Bold.ttf"]:
        for fpath in [
            f"C:/Windows/Fonts/{fname}",
            f"/usr/share/fonts/truetype/dejavu/{fname}",
            f"/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ]:
            try:
                font = ImageFont.truetype(fpath, 30)
                break
            except Exception:
                pass
        if font:
            break
    if not font:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = (W - tw) // 2, bar_y + (88 - th) // 2
    draw.text((tx + 2, ty + 2), label, font=font, fill=(0, 0, 0, 160))
    draw.text((tx, ty), label, font=font, fill=(*hi, 245))

    return img.convert("RGB")


def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    games = load_game_meta()

    # Find small thumbnails
    targets = []
    for thumb in sorted(THUMB_DIR.glob("*.png")):
        if thumb.stat().st_size < THRESHOLD:
            gid = thumb.stem
            if gid in games:
                targets.append(gid)
            else:
                print(f"  SKIP {gid} — not in game-definitions")

    print(f"Rebuilding {len(targets)} thumbnails (< {THRESHOLD//1024}KB):")
    for gid in targets:
        print(f"  {gid}")

    if args.dry_run:
        print("\n[dry-run] No files written.")
        return

    done = 0
    for gid in targets:
        meta    = games[gid]
        out     = THUMB_DIR / f"{gid}.png"
        old_kb  = out.stat().st_size // 1024 if out.exists() else 0

        img = make_hd_thumbnail(gid, meta["accent"], meta["symbols"])
        img.save(out, "PNG", optimize=True, quality=92)
        new_kb = out.stat().st_size // 1024
        print(f"  {gid}: {old_kb}KB -> {new_kb}KB")
        done += 1

    print(f"\nDone! Rebuilt {done} thumbnails.")


if __name__ == "__main__":
    main()
