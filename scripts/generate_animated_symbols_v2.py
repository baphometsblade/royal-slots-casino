#!/usr/bin/env python3
"""
Generate animated WebP slot symbols using pure Pillow -- no ComfyUI required.
VERSION 2 -- game-specific overrides + 4 new categories: candy, food, scroll, gold

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

log = logging.getLogger("anim_sym_v2")

# ── Category detection ─────────────────────────────────────────────────────

# ---- Game-specific category overrides ----------------------------------------
# Keys: (game_id, symbol_stem_no_ext)  -> category string
# These take precedence over the filename-keyword fallback below.

GAME_SYMBOL_OVERRIDES: dict[tuple[str, str], str] = {
    # sugar_rush
    ("sugar_rush",  "s1_lollipop"):          "candy",
    ("sugar_rush",  "s2_gummy_bear"):         "candy",
    ("sugar_rush",  "s3_candy_cane"):         "candy",
    ("sugar_rush",  "s4_cupcake"):            "food",
    ("sugar_rush",  "s5_diamond_candy"):      "gem",
    ("sugar_rush",  "wild_sugar"):            "wild",
    # lucky_777
    ("lucky_777",   "s1_banana"):             "food",
    ("lucky_777",   "s2_grape"):              "food",
    ("lucky_777",   "s3_apple"):              "food",
    ("lucky_777",   "s4_watermelon"):         "food",
    ("lucky_777",   "s5_heart_gem"):          "gem",
    ("lucky_777",   "wild_bonanza"):          "wild",
    # gates_olympus
    ("gates_olympus", "s1_chalice"):          "gold",
    ("gates_olympus", "s2_ring"):             "gold",
    ("gates_olympus", "s3_hourglass"):        "gem",
    ("gates_olympus", "s4_crown"):            "gold",
    ("gates_olympus", "s5_lightning"):        "lightning",
    ("gates_olympus", "wild_zeus"):           "lightning",
    # black_bull
    ("black_bull",  "s1_horseshoe"):          "gold",
    ("black_bull",  "s2_coins"):              "coin",
    ("black_bull",  "s3_money_bag"):          "coin",
    ("black_bull",  "s4_gold_bar"):           "gold",
    ("black_bull",  "s5_diamond"):            "gem",
    ("black_bull",  "wild_bull"):             "animal",
    # hot_chillies
    ("hot_chillies", "s1_taco"):              "food",
    ("hot_chillies", "s2_maracas"):           "default",
    ("hot_chillies", "s3_sombrero"):          "default",
    ("hot_chillies", "s4_chilli"):            "fire",
    ("hot_chillies", "s5_hot_7"):             "fire",
    ("hot_chillies", "wild_chilli"):          "fire",
    # super_hot
    ("super_hot",   "s1_cherry"):             "food",
    ("super_hot",   "s2_lemon"):              "food",
    ("super_hot",   "s3_plum"):               "food",
    ("super_hot",   "s4_bell"):               "default",
    ("super_hot",   "s5_star"):               "lightning",
    ("super_hot",   "wild_hot"):              "fire",
    # wolf_gold
    ("wolf_gold",   "s1_feather"):            "nature",
    ("wolf_gold",   "s2_paw"):               "animal",
    ("wolf_gold",   "s3_eagle"):              "animal",
    ("wolf_gold",   "s4_totem"):              "default",
    ("wolf_gold",   "s5_moon"):               "lightning",
    ("wolf_gold",   "wild_wolf"):             "wild",
    # big_bass
    ("big_bass",    "s1_hook"):               "default",
    ("big_bass",    "s2_float"):              "ice",
    ("big_bass",    "s3_tackle"):             "default",
    ("big_bass",    "s4_fish"):               "animal",
    ("big_bass",    "s5_treasure"):           "gem",
    ("big_bass",    "wild_bass"):             "wild",
    # bass_splash
    ("bass_splash", "s1_worm"):              "nature",
    ("bass_splash", "s2_reel"):              "default",
    ("bass_splash", "s3_net"):               "default",
    ("bass_splash", "s4_marlin"):            "animal",
    ("bass_splash", "s5_golden_lure"):       "coin",
    ("bass_splash", "wild_splash"):          "wild",
    # book_dead
    ("book_dead",   "s1_ankh"):              "gem",
    ("book_dead",   "s2_scarab"):            "animal",
    ("book_dead",   "s3_eye"):               "magic",
    ("book_dead",   "s4_pharaoh"):           "default",
    ("book_dead",   "s5_anubis"):            "default",
    ("book_dead",   "wild_book"):            "scroll",
    # fire_joker
    ("fire_joker",  "s1_cherry"):            "food",
    ("fire_joker",  "s2_lemon"):             "food",
    ("fire_joker",  "s3_plum"):              "food",
    ("fire_joker",  "s4_star"):              "lightning",
    ("fire_joker",  "s5_seven"):             "default",
    ("fire_joker",  "wild_joker"):           "wild",
    # starburst_xxl
    ("starburst_xxl", "s1_gem_red"):         "gem",
    ("starburst_xxl", "s2_gem_blue"):        "gem",
    ("starburst_xxl", "s3_gem_green"):       "gem",
    ("starburst_xxl", "s4_gem_yellow"):      "gem",
    ("starburst_xxl", "s5_gem_purple"):      "gem",
    ("starburst_xxl", "wild_star"):          "lightning",
    # gonzos_quest
    ("gonzos_quest", "s1_stone_face_green"): "default",
    ("gonzos_quest", "s2_stone_face_blue"):  "default",
    ("gonzos_quest", "s3_stone_face_red"):   "default",
    ("gonzos_quest", "s4_emerald"):          "gem",
    ("gonzos_quest", "s5_gold_mask"):        "gold",
    ("gonzos_quest", "wild_gonzo"):          "wild",
}

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "wild":      ["wild"],
    "scatter":   ["scatter"],
    "bonus":     ["bonus"],
    "coin":      ["coin", "dollar", "cash", "money", "gem_coin"],
    "gem":       ["gem", "diamond", "ruby", "sapphire", "emerald", "crystal", "jewel", "ring", "chalice", "crown"],
    "fire":      ["fire", "flame", "inferno", "lava", "ember", "phoenix", "dragon"],
    "ice":       ["ice", "frost", "snow", "cryo", "blizzard", "frozen"],
    "lightning": ["lightning", "thunder", "storm", "electric", "bolt", "zeus", "thor"],
    "nature":    ["flower", "leaf", "plant", "bamboo", "lotus", "blossom", "vine", "tree"],
    "animal":    ["wolf", "eagle", "bull", "buffalo", "bear", "tiger", "lion", "shark", "fish", "bass",
                  "deer", "horse", "fox", "frog", "crab", "dog", "cat", "bird"],
    # v2 new keyword fallbacks
    "candy":     ["candy", "lollipop", "gummy", "bonbon", "toffee", "caramel"],
    "food":      ["cupcake", "cake", "sweet", "sugar", "banana", "grape",
                  "apple", "fruit", "chilli", "pepper", "taco", "burger", "pizza", "donut"],
    "scroll":    ["scroll", "parchment", "tome", "book", "tablet"],
    "gold":      ["gold_bar", "goldbar", "gold_ingot", "scepter", "goblet"],
    "card":      ["ace", "joker", "card", "spade", "club", "diamond_card"],
    "skull":     ["skull", "dead", "death", "bone", "voodoo", "ghost"],
    "magic":     ["magic", "wizard", "wand", "potion", "spell"],
    "star":      ["star"],
}


def detect_category(game_id: str, stem: str) -> str:
    override = GAME_SYMBOL_OVERRIDES.get((game_id, stem))
    if override is not None:
        return override
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

def _hue_shift_clamp(arr, shift_deg, target_hue, hue_range):
    """
    Shift hue then clamp result to within +-hue_range of target_hue (0-1 scale).
    Used by the gold category to keep colours in warm yellow territory.
    """
    result = arr.copy()
    mask   = arr[:, :, 3] > 0
    rgb    = arr[mask, :3].astype(np.float32) / 255.0
    r, g, b = rgb[:, 0], rgb[:, 1], rgb[:, 2]
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    v    = maxc
    with np.errstate(invalid="ignore", divide="ignore"):
        s  = np.where(maxc != 0, (maxc - minc) / maxc, 0.0)
        rc = np.where(maxc != minc, (maxc - r) / (maxc - minc), 0.0)
        gc = np.where(maxc != minc, (maxc - g) / (maxc - minc), 0.0)
        bc = np.where(maxc != minc, (maxc - b) / (maxc - minc), 0.0)
    h = np.where(r == maxc, bc - gc,
        np.where(g == maxc, 2.0 + rc - bc, 4.0 + gc - rc))
    h = (h / 6.0) % 1.0
    h = (h + shift_deg / 360.0) % 1.0
    lo = (target_hue - hue_range) % 1.0
    hi = (target_hue + hue_range) % 1.0
    if lo < hi:
        h = np.clip(h, lo, hi)
    else:
        h = np.where(h > target_hue,
                     np.minimum(h, hi + 1.0) % 1.0,
                     np.maximum(h, lo))
    i = (h * 6.0).astype(np.int32)
    f = h * 6.0 - i
    p = v * (1.0 - s)
    q = v * (1.0 - s * f)
    t = v * (1.0 - s * (1.0 - f))
    seg = i % 6
    nr = np.choose(seg, [v, q, p, p, t, v])
    ng = np.choose(seg, [t, v, v, q, p, p])
    nb = np.choose(seg, [p, p, t, v, v, q])
    out = np.stack([nr, ng, nb], axis=-1)
    result[mask, :3] = np.clip(out * 255, 0, 255).astype(np.uint8)
    return result


def _translate_x(base, dx):
    """Horizontal roll -- wraps edges for a seamless scroll loop."""
    return Image.fromarray(np.roll(np.array(base), dx, axis=1))


def _apply_sepia(arr, strength=0.5):
    """Sepia tint: strength=0 original; strength=1 full sepia."""
    result = arr.copy().astype(np.float32)
    mask   = arr[:, :, 3] > 0
    r = result[mask, 0]; g = result[mask, 1]; b = result[mask, 2]
    result[mask, 0] = np.clip(r*(1-strength)+(r*0.393+g*0.769+b*0.189)*strength, 0, 255)
    result[mask, 1] = np.clip(g*(1-strength)+(r*0.349+g*0.686+b*0.168)*strength, 0, 255)
    result[mask, 2] = np.clip(b*(1-strength)+(r*0.272+g*0.534+b*0.131)*strength, 0, 255)
    return result.astype(np.uint8)




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



# ---- Per-category frame builders: NEW v2 ------------------------------------

def build_frames_candy(base):
    """
    Pastel candy hue oscillation (+-40 degrees, pink->purple->yellow range)
    combined with a gentle scale pulse (+-4%). The bounded hue swing prevents
    colours from crossing into green/blue territory.
    """
    arr = np.array(base)
    frames = []
    for i in range(FRAMES):
        t      = i / FRAMES
        shift  = 40 * math.sin(t * 2 * math.pi)
        factor = 1.0 + 0.04 * math.sin(t * 2 * math.pi + math.pi / 3)
        frames.append(_scale_center(Image.fromarray(_hue_shift(arr, shift)), factor))
    return frames


def build_frames_food(base):
    """
    Gentle wobble: vertical translate +-3 px + subtle brightness pulse +-8%.
    Suitable for fruits, tacos, and other food symbols.
    """
    arr = np.array(base)
    frames = []
    for i in range(FRAMES):
        t      = i / FRAMES
        dy     = int(3 * math.sin(t * 2 * math.pi))
        bright = 1.0 + 0.08 * math.sin(t * 2 * math.pi + math.pi / 4)
        frames.append(_translate_y(Image.fromarray(_brightness_scale(arr, bright)), dy))
    return frames


def build_frames_scroll(base):
    """
    Horizontal pan (parchment/tome scroll effect): image rolls left/right by
    up to 10 px per loop, with a pulsing sepia tint (30 to 60% strength).
    """
    arr = np.array(base)
    frames = []
    for i in range(FRAMES):
        t     = i / FRAMES
        dx    = int(10 * math.sin(t * 2 * math.pi))
        sepia = 0.45 + 0.15 * math.sin(t * 2 * math.pi + math.pi / 2)
        frames.append(_translate_x(Image.fromarray(_apply_sepia(arr, sepia)), dx))
    return frames


def build_frames_gold(base):
    """
    Intense golden shimmer:
    - Brightness oscillates 0.9 to 1.4 with a double-peak sine (4x frequency),
      giving two glint spikes per 1.6 s loop for a precious-metal feel.
    - Hue is gently nudged and clamped to warm yellow (hue ~47 deg)
      so pixels drift toward gold rather than cool tones.
    - Sparkle dots on every 6th frame.
    """
    arr        = np.array(base)
    TARGET_HUE = 0.13
    HUE_RANGE  = 0.12
    frames     = []
    for i in range(FRAMES):
        t      = i / FRAMES
        bright = 0.9 + 0.5 * (math.sin(t * 4 * math.pi) * 0.5 + 0.5)
        a      = _hue_shift_clamp(arr, 8 * math.sin(t * 2 * math.pi), TARGET_HUE, HUE_RANGE)
        a      = _brightness_scale(a, bright)
        frame  = Image.fromarray(a)
        if i % 6 == 0:
            frame = _add_sparkle(frame, seed=i * 17, count=4)
        frames.append(frame)
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
    # v2 new
    "candy":     build_frames_candy,
    "food":      build_frames_food,
    "scroll":    build_frames_scroll,
    "gold":      build_frames_gold,
    # legacy unchanged
    "card":      build_frames_card,
    "skull":     build_frames_skull,
    "magic":     build_frames_magic,
    "star":      build_frames_lightning,
    "default":   build_frames_default,
}


# ── Core logic ─────────────────────────────────────────────────────────────

def animate_symbol(png_path: Path, force: bool, dry_run: bool) -> bool:
    out_path = png_path.with_suffix(".webp")
    if out_path.exists() and not force:
        log.debug("  skip (exists): %s", out_path.name)
        return False

    game_id  = png_path.parent.name
    category = detect_category(game_id, png_path.stem)
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
