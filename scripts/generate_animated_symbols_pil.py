#!/usr/bin/env python3
"""
Generate animated WebP slot symbols using pure Pillow — no ComfyUI required.

Reads existing static PNGs from assets/game_symbols/<game_id>/ and writes
animated WebPs alongside them.  Each symbol category gets a unique hand-crafted
animation:

  • Wild / scatter / bonus  →  rainbow hue-cycle shimmer
  • Coins / gold / dollar   →  spinning glint + brightness pulse
  • Gems / diamond / ruby   →  prism sparkle + gentle scale breathe
  • Fire / flame / inferno  →  hue flicker (orange↔red↔yellow) + jitter
  • Ice / frost / crystal   →  cool hue pulse + glisten
  • Lightning / thunder     →  fast flash + tint spike
  • Nature / flower / leaf  →  gentle sway (perspective-skew oscillation)
  • Animals / creature      →  breathing scale + slight tilt
  • Food / candy / sweet    →  bounce (vertical translate oscillation)
  • Cards / ace / joker     →  tilt oscillation
  • Default                 →  soft glow pulse

Specs:  15 fps, 24 frames (1.6 s loop), 120×120 px output, ≤150 KB target.

Usage:
  python scripts/generate_animated_symbols_pil.py
  python scripts/generate_animated_symbols_pil.py --game sugar_rush --force
  python scripts/generate_animated_symbols_pil.py --dry-run
  python scripts/generate_animated_symbols_pil.py --workers 4
"""

from __future__ import annotations

import argparse
import colorsys
import logging
import math
import sys
from pathlib import Path
from typing import List, Tuple

try:
    from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter
except ImportError:
    sys.exit("Pillow is required:  pip install pillow")

try:
    import numpy as np
except ImportError:
    sys.exit("numpy is required:   pip install numpy")

# ── Paths ──────────────────────────────────────────────────────────────────
ROOT        = Path(__file__).resolve().parents[1]
SYMBOLS_DIR = ROOT / "assets" / "game_symbols"

# ── Config ─────────────────────────────────────────────────────────────────
FRAMES      = 24        # frames per loop
FPS         = 15        # frame rate
DURATION_MS = 1000 // FPS   # per-frame duration for WebP (≈67 ms)
OUT_SIZE    = (120, 120)    # output canvas size
MAX_KB      = 150       # size guard (warn only)

log = logging.getLogger("anim_sym")

# ── Category detection ─────────────────────────────────────────────────────

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "wild":      ["wild"],
    "scatter":   ["scatter"],
    "bonus":     ["bonus"],
    "coin":      ["coin", "gold", "dollar", "cash", "money", "gem_coin"],
    "gem":       ["gem", "diamond", "ruby", "sapphire", "emerald", "crystal", "jewel", "ring", "chalice", "crown"],
    "fire":      ["fire", "flame", "inferno", "lava", "ember", "phoenix", "dragon"],
    "ice":       ["ice", "frost", "snow", "cryo", "blizzard", "frozen"],
    "lightning": ["lightning", "thunder", "storm", "electric", "bolt", "zeus", "thor"],
    "nature":    ["flower", "leaf", "plant", "bamboo", "lotus", "cherry", "blossom", "vine", "tree"],
    "animal":    ["wolf", "eagle", "bull", "buffalo", "bear", "tiger", "lion", "shark", "fish", "bass",
                  "deer", "horse", "fox", "frog", "crab", "dog", "cat", "bird"],
    "food":      ["candy", "lollipop", "gummy", "cupcake", "cake", "sweet", "sugar",
                  "cherry", "banana", "grape", "apple", "fruit", "chilli", "pepper"],
    "card":      ["ace", "joker", "card", "spade", "heart", "club", "diamond_card"],
    "skull":     ["skull", "dead", "death", "bone", "voodoo", "ghost"],
    "magic":     ["magic", "wizard", "wand", "potion", "spell", "book", "scroll"],
}


def detect_category(stem: str) -> str:
    s = stem.lower()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in s:
                return cat
    return "default"


# ── Frame generators ───────────────────────────────────────────────────────

def _to_rgba(img: Image.Image) -> Image.Image:
    return img.convert("RGBA") if img.mode != "RGBA" else img.copy()


def _resize(img: Image.Image, size: Tuple[int, int]) -> Image.Image:
    img.thumbnail(size, Image.LANCZOS)
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    off = ((size[0] - img.width) // 2, (size[1] - img.height) // 2)
    out.paste(img, off, img if img.mode == "RGBA" else None)
    return out


def _hue_shift(arr: np.ndarray, shift_deg: float) -> np.ndarray:
    """Shift hue of an RGBA uint8 numpy array by shift_deg degrees (only pixels with alpha > 0)."""
    result = arr.copy()
    alpha  = arr[:, :, 3]
    mask   = alpha > 0
    rgb    = arr[mask, :3].astype(np.float32) / 255.0
    # Vectorised HSV conversion
    r, g, b = rgb[:, 0], rgb[:, 1], rgb[:, 2]
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    v    = maxc
    with np.errstate(invalid='ignore', divide='ignore'):
        s  = np.where(maxc != 0, (maxc - minc) / maxc, 0.0)
        rc = np.where(maxc != minc, (maxc - r) / (maxc - minc), 0.0)
        gc = np.where(maxc != minc, (maxc - g) / (maxc - minc), 0.0)
        bc = np.where(maxc != minc, (maxc - b) / (maxc - minc), 0.0)
    h  = np.where(r == maxc, bc - gc,
         np.where(g == maxc, 2.0 + rc - bc, 4.0 + gc - rc))
    h  = (h / 6.0) % 1.0
    h  = (h + shift_deg / 360.0) % 1.0
    # HSV → RGB (vectorised)
    i  = (h * 6.0).astype(np.int32)
    f  = h * 6.0 - i
    p  = v * (1.0 - s)
    q  = v * (1.0 - s * f)
    t  = v * (1.0 - s * (1.0 - f))
    seg = i % 6
    nr = np.choose(seg, [v, q, p, p, t, v])
    ng = np.choose(seg, [t, v, v, q, p, p])
    nb = np.choose(seg, [p, p, t, v, v, q])
    out = np.stack([nr, ng, nb], axis=-1)
    result[mask, :3] = np.clip(out * 255, 0, 255).astype(np.uint8)
    return result


def _brightness_scale(arr: np.ndarray, factor: float) -> np.ndarray:
    """Scale RGB channels by factor (only opaque pixels)."""
    result = arr.copy()
    result[:, :, :3] = np.clip(result[:, :, :3].astype(np.float32) * factor, 0, 255).astype(np.uint8)
    return result


def _translate_y(base: Image.Image, dy: int) -> Image.Image:
    """Translate image vertically within same canvas."""
    out = Image.new("RGBA", base.size, (0, 0, 0, 0))
    out.paste(base, (0, dy))
    return out


def _scale_center(base: Image.Image, factor: float) -> Image.Image:
    """Scale image around its center."""
    w, h  = base.size
    nw, nh = max(1, int(w * factor)), max(1, int(h * factor))
    scaled = base.resize((nw, nh), Image.LANCZOS)
    out    = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ox, oy = (w - nw) // 2, (h - nh) // 2
    out.paste(scaled, (ox, oy), scaled)
    return out


def _rotate_center(base: Image.Image, angle: float) -> Image.Image:
    return base.rotate(angle, resample=Image.BICUBIC, expand=False)


def _add_sparkle(base: Image.Image, seed: int, count: int = 6) -> Image.Image:
    """Overlay a few small white sparkle dots."""
    rng = np.random.default_rng(seed)
    out = base.copy()
    draw = ImageDraw.Draw(out)
    for _ in range(count):
        x = int(rng.integers(10, base.width - 10))
        y = int(rng.integers(10, base.height - 10))
        r = int(rng.integers(1, 3))
        alpha = int(rng.integers(150, 255))
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, alpha))
    return out


# ── Per-category frame builders ────────────────────────────────────────────

def build_frames_wild(base: Image.Image) -> List[Image.Image]:
    """Full hue-cycle rainbow shimmer."""
    arr = np.array(base)
    frames = []
    for i in range(FRAMES):
        shift = i * (360 / FRAMES)
        frames.append(Image.fromarray(_hue_shift(arr, shift)))
    return frames


def build_frames_coin(base: Image.Image) -> List[Image.Image]:
    """Brightness glint pulse (coin shine)."""
    frames = []
    for i in range(FRAMES):
        t = i / FRAMES
        # slow base pulse + fast glint spike
        bright = 1.0 + 0.25 * math.sin(t * 2 * math.pi) + max(0, 0.7 * math.sin(t * 4 * math.pi))
        frame = Image.fromarray(_brightness_scale(np.array(base), bright))
        frames.append(frame)
    return frames


def build_frames_gem(base: Image.Image) -> List[Image.Image]:
    """Scale-breathe + sparkle overlay."""
    frames = []
    for i in range(FRAMES):
        t = i / FRAMES
        factor = 1.0 + 0.04 * math.sin(t * 2 * math.pi)
        frame = _scale_center(base, factor)
        if i % 4 == 0:
            frame = _add_sparkle(frame, seed=i * 7)
        frames.append(frame)
    return frames


def build_frames_fire(base: Image.Image) -> List[Image.Image]:
    """Hue flicker in warm range + slight jitter."""
    arr = np.array(base)
    frames = []
    jitters = [(0, 0), (1, -1), (-1, 1), (0, 1), (1, 0), (-1, -1), (0, -1), (1, 1)]
    for i in range(FRAMES):
        t = i / FRAMES
        # hue oscillates ±20° around orange
        shift = 15 * math.sin(t * 2 * math.pi * 2)
        bright = 1.0 + 0.15 * math.sin(t * 2 * math.pi * 3)
        a = _hue_shift(arr, shift)
        a = _brightness_scale(a, bright)
        frame = Image.fromarray(a)
        dx, dy = jitters[i % len(jitters)]
        if dx or dy:
            frame = Image.fromarray(np.roll(np.array(frame), (dy, dx), axis=(0, 1)))
        frames.append(frame)
    return frames


def build_frames_ice(base: Image.Image) -> List[Image.Image]:
    """Cool hue shift (blue/cyan) + glisten sparkle."""
    arr = np.array(base)
    frames = []
    for i in range(FRAMES):
        t = i / FRAMES
        shift = 10 * math.sin(t * 2 * math.pi)
        bright = 1.0 + 0.1 * math.sin(t * 2 * math.pi + math.pi / 2)
        frame = Image.fromarray(_brightness_scale(_hue_shift(arr, shift), bright))
        if i % 6 == 0:
            frame = _add_sparkle(frame, seed=i * 13, count=4)
        frames.append(frame)
    return frames


def build_frames_lightning(base: Image.Image) -> List[Image.Image]:
    """Fast flash: most frames normal, occasional bright white spike."""
    arr = np.array(base)
    frames = []
    flash_frames = {2, 3, 10, 11, 18, 19}
    for i in range(FRAMES):
        if i in flash_frames:
            factor = 1.8 if i % 2 == 0 else 1.4
        else:
            factor = 1.0
        frames.append(Image.fromarray(_brightness_scale(arr, factor)))
    return frames


def build_frames_nature(base: Image.Image) -> List[Image.Image]:
    """Gentle rotation sway ±8°."""
    frames = []
    for i in range(FRAMES):
        t = i / FRAMES
        angle = 8 * math.sin(t * 2 * math.pi)
        frames.append(_rotate_center(base, angle))
    return frames


def build_frames_animal(base: Image.Image) -> List[Image.Image]:
    """Breathing scale ±3% + subtle tilt ±2°."""
    frames = []
    for i in range(FRAMES):
        t = i / FRAMES
        factor = 1.0 + 0.03 * math.sin(t * 2 * math.pi)
        angle  = 2  * math.sin(t * 2 * math.pi + math.pi / 4)
        frame = _scale_center(base, factor)
        frame = _rotate_center(frame, angle)
        frames.append(frame)
    return frames


def build_frames_food(base: Image.Image) -> List[Image.Image]:
    """Bounce: vertical translate up to –8 px."""
    frames = []
    for i in range(FRAMES):
        t = i / FRAMES
        dy = int(-8 * abs(math.sin(t * 2 * math.pi)))
        frames.append(_translate_y(base, dy))
    return frames


def build_frames_card(base: Image.Image) -> List[Image.Image]:
    """Tilt oscillation ±5°."""
    frames = []
    for i in range(FRAMES):
        t = i / FRAMES
        angle = 5 * math.sin(t * 2 * math.pi)
        frames.append(_rotate_center(base, angle))
    return frames


def build_frames_skull(base: Image.Image) -> List[Image.Image]:
    """Pulse red tint overlay."""
    arr  = np.array(base)
    frames = []
    for i in range(FRAMES):
        t = i / FRAMES
        intensity = max(0.0, 0.3 * math.sin(t * 2 * math.pi))
        a = arr.copy().astype(np.float32)
        # boost red channel, suppress blue slightly
        a[:, :, 0] = np.clip(a[:, :, 0] * (1 + intensity), 0, 255)
        a[:, :, 2] = np.clip(a[:, :, 2] * (1 - intensity * 0.5), 0, 255)
        frames.append(Image.fromarray(a.astype(np.uint8)))
    return frames


def build_frames_magic(base: Image.Image) -> List[Image.Image]:
    """Slow hue drift ±30° + sparkle."""
    arr = np.array(base)
    frames = []
    for i in range(FRAMES):
        t = i / FRAMES
        shift = 30 * math.sin(t * 2 * math.pi)
        frame = Image.fromarray(_hue_shift(arr, shift))
        if i % 5 == 0:
            frame = _add_sparkle(frame, seed=i * 11, count=5)
        frames.append(frame)
    return frames


def build_frames_default(base: Image.Image) -> List[Image.Image]:
    """Soft glow pulse (brightness ±15%)."""
    arr = np.array(base)
    frames = []
    for i in range(FRAMES):
        t = i / FRAMES
        bright = 1.0 + 0.15 * math.sin(t * 2 * math.pi)
        frames.append(Image.fromarray(_brightness_scale(arr, bright)))
    return frames


CATEGORY_BUILDERS = {
    "wild":      build_frames_wild,
    "scatter":   build_frames_wild,   # same rainbow effect
    "bonus":     build_frames_magic,
    "coin":      build_frames_coin,
    "gem":       build_frames_gem,
    "fire":      build_frames_fire,
    "ice":       build_frames_ice,
    "lightning": build_frames_lightning,
    "nature":    build_frames_nature,
    "animal":    build_frames_animal,
    "food":      build_frames_food,
    "card":      build_frames_card,
    "skull":     build_frames_skull,
    "magic":     build_frames_magic,
    "default":   build_frames_default,
}


# ── Core logic ─────────────────────────────────────────────────────────────

def animate_symbol(png_path: Path, force: bool, dry_run: bool) -> bool:
    out_path = png_path.with_suffix(".webp")
    if out_path.exists() and not force:
        log.debug("  skip (exists): %s", out_path.name)
        return False

    category = detect_category(png_path.stem)
    log.info("  %s  [%s]  →  %s", png_path.name, category, out_path.name)

    if dry_run:
        return True

    try:
        base = _to_rgba(Image.open(png_path))
        base = _resize(base, OUT_SIZE)

        builder = CATEGORY_BUILDERS.get(category, build_frames_default)
        frames  = builder(base)

        # Save as animated WebP
        frames[0].save(
            out_path,
            format="WEBP",
            save_all=True,
            append_images=frames[1:],
            duration=DURATION_MS,
            loop=0,
            quality=65,
            method=4,
        )

        size_kb = out_path.stat().st_size / 1024
        # If still over limit, re-save at lower quality
        if size_kb > MAX_KB:
            frames[0].save(
                out_path, format="WEBP", save_all=True,
                append_images=frames[1:], duration=DURATION_MS, loop=0,
                quality=50, method=4,
            )
            size_kb = out_path.stat().st_size / 1024
        if size_kb > MAX_KB:
            log.warning("    ⚠ file is %.0f KB > %d KB limit — consider reducing quality", size_kb, MAX_KB)
        else:
            log.info("    ✓ %.1f KB", size_kb)
        return True

    except Exception as exc:
        log.error("    ERROR animating %s: %s", png_path.name, exc)
        return False


def collect_pngs(game_filter: str | None) -> List[Path]:
    pngs = []
    for game_dir in sorted(SYMBOLS_DIR.iterdir()):
        if not game_dir.is_dir():
            continue
        if game_filter and game_dir.name != game_filter:
            continue
        for p in sorted(game_dir.glob("*.png")):
            pngs.append(p)
    return pngs


# ── CLI ────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Generate animated WebP slot symbols (Pillow-only, no ComfyUI)")
    parser.add_argument("--game",    metavar="GAME_ID", help="Only process this game's symbols")
    parser.add_argument("--force",   action="store_true", help="Overwrite existing animated WebPs")
    parser.add_argument("--dry-run", action="store_true", help="Preview what would be generated (no writes)")
    parser.add_argument("--verbose", action="store_true", help="Enable debug logging")
    args = parser.parse_args()

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(levelname)s %(message)s")

    pngs = collect_pngs(args.game)
    if not pngs:
        log.error("No PNGs found in %s", SYMBOLS_DIR)
        sys.exit(1)

    log.info("Found %d PNGs across %d games", len(pngs),
             len({p.parent for p in pngs}))
    if args.dry_run:
        log.info("DRY-RUN — no files will be written")

    done = 0
    for png in pngs:
        log.info("[%s]", png.parent.name)
        if animate_symbol(png, force=args.force, dry_run=args.dry_run):
            done += 1

    log.info("\nDone: %d / %d animated", done, len(pngs))


if __name__ == "__main__":
    main()
