#!/usr/bin/env python3
"""
Generate animated WebP slot backgrounds using pure Pillow — no ComfyUI required.

Reads existing static PNGs from assets/backgrounds/slots/ and writes animated
WebPs alongside them.  Each game theme gets a unique animation style:

  • fire / hell / inferno   →  warm hue flicker + brightness pulse
  • ice / winter / frost    →  cool hue drift + glisten particles
  • space / cosmic / galaxy →  slow dark-section parallax pan + star twinkle
  • jungle / nature / forest→  gentle hue breathe (green-tinted oscillation)
  • ocean / sea / water     →  wave-like perspective distortion
  • neon / cyber / city     →  fast hue cycle (RGB shift)
  • magic / mystical / dark →  dark pulsing vignette + hue drift
  • desert / egypt / sand   →  warm shimmer heat-haze blur
  • Default                 →  Ken Burns: slow zoom + subtle colour breathe

Specs:  10 fps, 30 frames (3 s loop), original aspect ratio, ≤400 KB target.

Usage:
  python scripts/generate_animated_backgrounds_pil.py
  python scripts/generate_animated_backgrounds_pil.py --game sugar_rush --force
  python scripts/generate_animated_backgrounds_pil.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import logging
import math
import sys
from pathlib import Path
from typing import List, Tuple

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
except ImportError:
    sys.exit("Pillow is required:  pip install pillow")

try:
    import numpy as np
except ImportError:
    sys.exit("numpy is required:   pip install numpy")

# ── Paths ──────────────────────────────────────────────────────────────────
ROOT     = Path(__file__).resolve().parents[1]
BG_DIR   = ROOT / "assets" / "backgrounds" / "slots"
GAME_DEF = ROOT / "shared" / "game-definitions.js"

# ── Config ─────────────────────────────────────────────────────────────────
FRAMES      = 30
FPS         = 10
DURATION_MS = 1000 // FPS   # 100 ms per frame
MAX_KB      = 400

log = logging.getLogger("anim_bg")


# ── Theme detection ────────────────────────────────────────────────────────

THEME_KEYWORDS: dict[str, list[str]] = {
    "fire":   ["fire", "hell", "inferno", "flame", "dragon", "volcano", "lava", "crimson",
               "chaos", "chilli", "heat", "buffalo", "dead_alive", "book_dead"],
    "ice":    ["ice", "frost", "snow", "blizzard", "winter", "crystal", "cryo"],
    "space":  ["space", "cosmic", "galaxy", "stellar", "astro", "nebula", "planet",
               "gates_olympus", "olympus", "zeus", "celestial"],
    "jungle": ["jungle", "bamboo", "nature", "forest", "tree", "vine", "safari",
               "big_bamboo", "dog_house", "bass_splash", "fishing"],
    "ocean":  ["ocean", "sea", "water", "wave", "aqua", "fish", "bass", "beach",
               "coral", "deep", "pirate"],
    "neon":   ["neon", "cyber", "city", "night", "vegas", "pop", "disco",
               "chaos_crew", "sugar_rush", "candy"],
    "magic":  ["magic", "mystical", "dark", "shadow", "crystal_ball", "book",
               "wizard", "alchemy", "potion", "skull", "voodoo"],
    "desert": ["desert", "egypt", "sand", "dune", "sphinx", "pharaoh",
               "ares_blade", "gladiator", "ancient"],
    "wealth": ["diamond", "gold", "vault", "coin", "rich", "luxury", "crown",
               "diamond_vault", "coin_strike", "coin_volcano"],
}


def detect_theme(game_id: str) -> str:
    s = game_id.lower()
    for theme, keywords in THEME_KEYWORDS.items():
        for kw in keywords:
            if kw in s:
                return theme
    return "default"


# ── Helpers ────────────────────────────────────────────────────────────────

def _arr(img: Image.Image) -> np.ndarray:
    return np.array(img.convert("RGB"))


def _from_arr(a: np.ndarray, mode: str = "RGB") -> Image.Image:
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), mode)


def _hue_shift_rgb(arr: np.ndarray, shift_deg: float) -> np.ndarray:
    """Shift hue of an RGB uint8 array."""
    h, w = arr.shape[:2]
    flat = arr.reshape(-1, 3).astype(np.float32) / 255.0
    r, g, b = flat[:, 0], flat[:, 1], flat[:, 2]
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    v = maxc
    s = np.where(maxc != 0, (maxc - minc) / maxc, 0.0)
    rc = np.where(maxc != minc, (maxc - r) / (maxc - minc), 0.0)
    gc = np.where(maxc != minc, (maxc - g) / (maxc - minc), 0.0)
    bc = np.where(maxc != minc, (maxc - b) / (maxc - minc), 0.0)
    hh = np.where(r == maxc, bc - gc,
         np.where(g == maxc, 2.0 + rc - bc, 4.0 + gc - rc))
    hh = (hh / 6.0) % 1.0
    hh = (hh + shift_deg / 360.0) % 1.0
    i  = (hh * 6.0).astype(np.int32)
    f  = hh * 6.0 - i
    p  = v * (1.0 - s)
    q  = v * (1.0 - s * f)
    t  = v * (1.0 - s * (1.0 - f))
    seg = i % 6
    nr = np.choose(seg, [v, q, p, p, t, v])
    ng = np.choose(seg, [t, v, v, q, p, p])
    nb = np.choose(seg, [p, p, t, v, v, q])
    out = np.stack([nr, ng, nb], axis=-1) * 255
    return out.reshape(h, w, 3).astype(np.float32)


def _vignette(arr: np.ndarray, strength: float) -> np.ndarray:
    """Apply radial darkening vignette."""
    h, w = arr.shape[:2]
    Y, X = np.ogrid[:h, :w]
    cx, cy = w / 2, h / 2
    dist = np.sqrt(((X - cx) / cx) ** 2 + ((Y - cy) / cy) ** 2)
    mask = 1 - np.clip(dist * strength, 0, 1)
    return arr * mask[:, :, np.newaxis]


def _zoom_crop(img: Image.Image, factor: float) -> Image.Image:
    """Zoom in by factor and crop back to original size."""
    w, h = img.size
    nw, nh = int(w * factor), int(h * factor)
    resized = img.resize((nw, nh), Image.LANCZOS)
    ox, oy = (nw - w) // 2, (nh - h) // 2
    return resized.crop((ox, oy, ox + w, oy + h))


def _pan_crop(img: Image.Image, dx: int, dy: int) -> Image.Image:
    """Pan (translate) image, wrapping at edges."""
    return Image.fromarray(np.roll(np.roll(_arr(img), dy, axis=0), dx, axis=1))


def _add_stars(img: Image.Image, seed: int, count: int = 15, size_range=(1, 3)) -> Image.Image:
    rng  = np.random.default_rng(seed)
    out  = img.copy().convert("RGBA")
    draw = ImageDraw.Draw(out)
    for _ in range(count):
        x = int(rng.integers(0, img.width))
        y = int(rng.integers(0, img.height))
        r = int(rng.integers(*size_range))
        a = int(rng.integers(80, 220))
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, a))
    return out.convert("RGB")


# ── Per-theme frame builders ───────────────────────────────────────────────

def build_fire(img: Image.Image) -> List[Image.Image]:
    arr = _arr(img)
    frames = []
    for i in range(FRAMES):
        t   = i / FRAMES
        sh  = 18 * math.sin(t * 2 * math.pi * 1.5)    # warm hue flicker
        br  = 1.0 + 0.12 * math.sin(t * 2 * math.pi * 2)
        a   = _hue_shift_rgb(arr, sh) * br
        a   = _vignette(a, 0.5)
        frames.append(_from_arr(a))
    return frames


def build_ice(img: Image.Image) -> List[Image.Image]:
    arr = _arr(img)
    frames = []
    for i in range(FRAMES):
        t   = i / FRAMES
        sh  = 12 * math.sin(t * 2 * math.pi)
        br  = 1.0 + 0.08 * math.sin(t * 2 * math.pi + math.pi / 2)
        a   = _hue_shift_rgb(arr, sh) * br
        frame = _from_arr(a)
        if i % 7 == 0:
            frame = _add_stars(frame, seed=i * 17, count=12, size_range=(1, 2))
        frames.append(frame)
    return frames


def build_space(img: Image.Image) -> List[Image.Image]:
    """Very slow pan + star twinkle."""
    frames = []
    for i in range(FRAMES):
        t  = i / FRAMES
        dx = int(4 * math.sin(t * 2 * math.pi))
        dy = int(2 * math.sin(t * 2 * math.pi + math.pi / 4))
        frame = _pan_crop(img, dx, dy)
        frame = _add_stars(frame, seed=i * 31, count=20, size_range=(1, 2))
        frames.append(frame)
    return frames


def build_jungle(img: Image.Image) -> List[Image.Image]:
    arr = _arr(img)
    frames = []
    for i in range(FRAMES):
        t  = i / FRAMES
        # gentle green breathe: boost green channel slightly
        a  = arr.astype(np.float32).copy()
        boost = 1.0 + 0.08 * math.sin(t * 2 * math.pi)
        a[:, :, 1] = np.clip(a[:, :, 1] * boost, 0, 255)
        frames.append(_from_arr(a))
    return frames


def build_ocean(img: Image.Image) -> List[Image.Image]:
    """Simulate wave motion with alternating row shifts."""
    arr  = _arr(img)
    h, w = arr.shape[:2]
    frames = []
    for i in range(FRAMES):
        t = i / FRAMES
        shifted = arr.copy()
        for row in range(h):
            wave_dx = int(3 * math.sin(2 * math.pi * (row / 30 + t)))
            shifted[row] = np.roll(arr[row], wave_dx, axis=0)
        frames.append(_from_arr(shifted))
    return frames


def build_neon(img: Image.Image) -> List[Image.Image]:
    """Fast full-spectrum hue cycle."""
    arr = _arr(img)
    frames = []
    for i in range(FRAMES):
        shift = i * (360 / FRAMES) * 0.5   # half cycle over 3 s
        a = _hue_shift_rgb(arr, shift)
        # add brightness boost for neon feel
        a = a * 1.1
        frames.append(_from_arr(a))
    return frames


def build_magic(img: Image.Image) -> List[Image.Image]:
    """Dark pulsing vignette + slow hue drift."""
    arr = _arr(img)
    frames = []
    for i in range(FRAMES):
        t  = i / FRAMES
        sh = 25 * math.sin(t * 2 * math.pi * 0.7)
        a  = _hue_shift_rgb(arr, sh)
        strength = 0.6 + 0.2 * math.sin(t * 2 * math.pi)
        a  = _vignette(a, strength)
        frame = _from_arr(a)
        if i % 8 == 0:
            frame = _add_stars(frame, seed=i * 19, count=8, size_range=(1, 3))
        frames.append(frame)
    return frames


def build_desert(img: Image.Image) -> List[Image.Image]:
    """Heat haze: slight gaussian blur oscillation + warm hue."""
    arr = _arr(img)
    frames = []
    for i in range(FRAMES):
        t   = i / FRAMES
        sh  = 8 * math.sin(t * 2 * math.pi)    # warm oscillation
        br  = 1.0 + 0.06 * math.sin(t * 2 * math.pi)
        a   = _hue_shift_rgb(arr, sh) * br
        frame = _from_arr(a)
        # mild blur on every other frame for shimmering heat
        if i % 3 == 1:
            frame = frame.filter(ImageFilter.GaussianBlur(radius=0.5))
        frames.append(frame)
    return frames


def build_wealth(img: Image.Image) -> List[Image.Image]:
    """Gold shimmer: hue stays warm but brightness pulses sharply."""
    arr = _arr(img)
    frames = []
    for i in range(FRAMES):
        t   = i / FRAMES
        br  = 1.0 + 0.25 * abs(math.sin(t * 2 * math.pi * 1.5))
        sh  = 5 * math.sin(t * 2 * math.pi)
        a   = _hue_shift_rgb(arr, sh) * br
        frames.append(_from_arr(a))
    return frames


def build_default(img: Image.Image) -> List[Image.Image]:
    """Ken Burns: slow 5% zoom-in then zoom-out + gentle hue breathe."""
    arr = _arr(img)
    frames = []
    for i in range(FRAMES):
        t  = i / FRAMES
        zoom = 1.0 + 0.025 * math.sin(t * 2 * math.pi)
        sh   = 6 * math.sin(t * 2 * math.pi * 0.5)
        a    = _hue_shift_rgb(arr, sh)
        frame = _zoom_crop(_from_arr(a), zoom)
        frames.append(frame)
    return frames


THEME_BUILDERS = {
    "fire":    build_fire,
    "ice":     build_ice,
    "space":   build_space,
    "jungle":  build_jungle,
    "ocean":   build_ocean,
    "neon":    build_neon,
    "magic":   build_magic,
    "desert":  build_desert,
    "wealth":  build_wealth,
    "default": build_default,
}


# ── Core ──────────────────────────────────────────────────────────────────

def animate_background(png_path: Path, force: bool, dry_run: bool) -> bool:
    out_path = png_path.with_suffix(".webp")
    if out_path.exists() and not force:
        log.debug("  skip (exists): %s", out_path.name)
        return False

    # Derive game_id from filename: "sugar_rush_bg.png" → "sugar_rush"
    stem    = png_path.stem
    game_id = stem.replace("_bg", "").replace("_background", "")
    theme   = detect_theme(game_id)
    log.info("  %s  [%s]  →  %s", png_path.name, theme, out_path.name)

    if dry_run:
        return True

    try:
        img    = Image.open(png_path).convert("RGB")
        # Down-scale for performance — backgrounds are displayed full-width but
        # animated WebPs don't need 4K; 960×540 is plenty and keeps file small
        if img.width > 960:
            ratio = 960 / img.width
            img = img.resize((960, int(img.height * ratio)), Image.LANCZOS)

        builder = THEME_BUILDERS.get(theme, build_default)
        frames  = builder(img)

        frames[0].save(
            out_path,
            format="WEBP",
            save_all=True,
            append_images=frames[1:],
            duration=DURATION_MS,
            loop=0,
            quality=70,
            method=4,
        )

        size_kb = out_path.stat().st_size / 1024
        flag    = "⚠" if size_kb > MAX_KB else "✓"
        log.info("    %s %.1f KB", flag, size_kb)
        return True

    except Exception as exc:
        log.error("    ERROR: %s — %s", png_path.name, exc)
        return False


def collect_pngs(game_filter: str | None) -> list[Path]:
    if not BG_DIR.exists():
        return []
    pngs = sorted(BG_DIR.glob("*.png"))
    if game_filter:
        pngs = [p for p in pngs if game_filter in p.stem]
    return pngs


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate animated WebP slot backgrounds (Pillow-only, no ComfyUI)"
    )
    parser.add_argument("--game",    metavar="GAME_ID", help="Filter by game ID substring")
    parser.add_argument("--force",   action="store_true", help="Overwrite existing WebPs")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no writes")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO,
                        format="%(levelname)s %(message)s")

    pngs = collect_pngs(args.game)
    if not pngs:
        log.error("No PNGs found in %s", BG_DIR)
        sys.exit(1)

    log.info("Found %d background PNGs", len(pngs))
    if args.dry_run:
        log.info("DRY-RUN — no files will be written")

    done = 0
    for png in pngs:
        if animate_background(png, force=args.force, dry_run=args.dry_run):
            done += 1

    log.info("\nDone: %d / %d animated", done, len(pngs))


if __name__ == "__main__":
    main()
