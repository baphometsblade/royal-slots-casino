#!/usr/bin/env python3
"""
regen_missing_backgrounds.py
Generates 1920x1080 slot backgrounds for the 42 games that are missing them.
Derives the color palette from each game's accentColor in game-definitions.js.

Usage:
    py -3.10 scripts/regen_missing_backgrounds.py [--dry-run]
"""
import re, math, random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT      = Path(__file__).parent.parent
DEFS_FILE = ROOT / "shared" / "game-definitions.js"
BG_DIR    = ROOT / "assets" / "backgrounds" / "slots"
W, H      = 1920, 1080

MISSING = [
    "arctic_foxes", "aztec_ascent", "celestial_bazaar", "comet_rush",
    "crystal_chambers", "crystal_shrine", "crystal_veil", "demon_chambers",
    "diamond_falls", "dragon_coins", "dragon_tumble", "fortune_bazaar",
    "golden_cascade", "golden_jaguar", "golden_pharaoh", "golden_vault",
    "iron_stampede", "jade_temple", "koi_ascension", "lightning_pearl",
    "mammoth_riches", "midnight_drifter", "midnight_oasis", "mine_coins",
    "mirror_palace", "mystic_cauldron", "neon_viper", "neptune_storm",
    "norse_vaults", "pharaoh_collect", "pharaoh_march", "primal_vault",
    "samurai_blade", "thunder_jackpot", "thunder_reel", "titan_forge",
    "twin_dragons", "vault_coins", "wild_deep", "wild_safari",
    "wild_west_rush", "wolf_rise",
]


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def lerp(a, b, t):
    return tuple(max(0, min(255, int(a[i] + (b[i] - a[i]) * t))) for i in range(3))


def darken(c, f):
    return lerp(c, (0, 0, 0), f)


def lighten(c, f):
    return lerp(c, (255, 255, 255), f)


def load_accents():
    src = DEFS_FILE.read_text(encoding="utf-8")
    result = {}
    for m in re.finditer(r"id:\s*'([^']+)'", src):
        gid = m.group(1)
        chunk = src[m.end():m.end() + 500]
        ac = re.search(r"accentColor:\s*'([^']+)'", chunk)
        result[gid] = ac.group(1) if ac else "#ffd700"
    return result


def make_background(game_id: str, accent: str) -> Image.Image:
    ac   = hex_rgb(accent)
    bg1  = darken(ac, 0.92)      # near-black tinted by accent
    bg2  = darken(ac, 0.78)      # slightly lighter mid
    bg3  = darken(ac, 0.60)      # richer tint at horizon
    hi   = lighten(ac, 0.35)     # highlight colour
    mid  = lerp(ac, (0, 0, 0), 0.55)

    img  = Image.new("RGB", (W, H), bg1)
    draw = ImageDraw.Draw(img)

    # ---- Bezier-style 3-stop gradient (top -> mid -> bottom) ----------------
    for y in range(H):
        t = y / (H - 1)
        if t < 0.5:
            c = lerp(bg1, bg2, t * 2)
        else:
            c = lerp(bg2, bg3, (t - 0.5) * 2)
        draw.line([(0, y), (W - 1, y)], fill=c)

    # ---- Radial centre glow (accent colour, blended in) ---------------------
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd   = ImageDraw.Draw(glow)
    for r in range(480, 0, -6):
        alpha = max(0, int(35 * (1 - r / 480)))
        gd.ellipse(
            [W // 2 - r, H // 2 - r, W // 2 + r, H // 2 + r],
            fill=(*lighten(ac, 0.15), alpha),
        )
    img = Image.alpha_composite(img.convert("RGBA"), glow).convert("RGB")

    # ---- Atmospheric orbs (deterministic) -----------------------------------
    rng   = random.Random(abs(hash(game_id)))
    orb_l = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od    = ImageDraw.Draw(orb_l)
    orb_colours = [mid, lighten(ac, 0.18), darken(ac, 0.30)]
    for _ in range(22):
        cx     = rng.randint(0, W)
        cy     = rng.randint(0, H)
        radius = rng.randint(40, 220)
        col    = orb_colours[rng.randint(0, 2)]
        a_max  = rng.randint(8, 28)
        for rs in range(radius, 0, -4):
            a = int(a_max * (rs / radius))
            od.ellipse(
                [cx - rs, cy - rs, cx + rs, cy + rs],
                fill=(*col, a),
            )
    img = Image.alpha_composite(img.convert("RGBA"), orb_l).convert("RGB")

    # ---- Subtle diagonal light rays -----------------------------------------
    ray_l = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rd    = ImageDraw.Draw(ray_l)
    rng2  = random.Random(abs(hash(game_id)) + 7)
    for _ in range(4):
        x0  = rng2.randint(-W // 4, W // 4)
        w_r = rng2.randint(30, 100)
        for dx in range(-w_r, w_r):
            fade = int(12 * (1 - abs(dx) / w_r))
            rd.line(
                [(W // 2 + x0 + dx, 0), (W // 2 + x0 + dx + W // 3, H)],
                fill=(*hi, fade),
            )
    img = Image.alpha_composite(img.convert("RGBA"), ray_l).convert("RGB")

    # ---- Vignette -----------------------------------------------------------
    vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vd  = ImageDraw.Draw(vig)
    steps = min(W, H) // 3
    for i in range(steps):
        alpha = int(160 * (1 - i / steps) ** 2)
        vd.rectangle(
            [(i, i), (W - 1 - i, H - 1 - i)],
            outline=(0, 0, 0, alpha),
        )
    img = Image.alpha_composite(img.convert("RGBA"), vig).convert("RGB")

    # ---- Slight soft blur for cinematic depth --------------------------------
    img = img.filter(ImageFilter.GaussianBlur(2.5))

    return img


def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    accents = load_accents()
    BG_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Generating {len(MISSING)} slot backgrounds...")
    if args.dry_run:
        for gid in MISSING:
            ac = accents.get(gid, "#ffd700")
            print(f"  {gid}  accent={ac}")
        print("\n[dry-run] No files written.")
        return

    for i, gid in enumerate(MISSING, 1):
        ac  = accents.get(gid, "#ffd700")
        out = BG_DIR / f"{gid}_bg.png"
        img = make_background(gid, ac)
        img.save(out, "PNG", optimize=True)
        kb  = out.stat().st_size // 1024
        print(f"  [{i}/{len(MISSING)}] {gid}  {kb}KB  accent={ac}")

    print(f"\nDone! {len(MISSING)} backgrounds written to assets/backgrounds/slots/")


if __name__ == "__main__":
    main()
