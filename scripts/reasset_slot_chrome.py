#!/usr/bin/env python3
"""
Scrape per-slot background art and generate UI chrome textures.

Outputs:
  assets/ui/slot_chrome/<game_id>_chrome.png
"""

from __future__ import annotations

from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "Pillow is required. Install with: pip install pillow"
    ) from exc


ROOT = Path(__file__).resolve().parents[1]
SLOT_BG_DIR = ROOT / "assets" / "backgrounds" / "slots"
OUTPUT_DIR = ROOT / "assets" / "ui" / "slot_chrome"
TARGET_SIZE = (1600, 360)


def stable_hash(text: str) -> int:
    h = 2166136261
    for ch in text:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def center_crop_to_aspect(img: Image.Image, out_w: int, out_h: int) -> Image.Image:
    src_w, src_h = img.size
    target_ratio = out_w / out_h
    src_ratio = src_w / src_h

    if src_ratio > target_ratio:
        new_w = int(src_h * target_ratio)
        left = (src_w - new_w) // 2
        box = (left, 0, left + new_w, src_h)
    else:
        new_h = int(src_w / target_ratio)
        top = (src_h - new_h) // 2
        box = (0, top, src_w, top + new_h)
    return img.crop(box)


def apply_tone(base: Image.Image) -> Image.Image:
    toned = base.filter(ImageFilter.GaussianBlur(radius=4.5))
    toned = ImageEnhance.Color(toned).enhance(1.4)
    toned = ImageEnhance.Contrast(toned).enhance(1.28)
    toned = ImageEnhance.Brightness(toned).enhance(0.78)
    return toned


def paint_overlays(img: Image.Image, seed: int) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Dark top and bottom to feel like slot chrome.
    for y in range(h):
        edge_dist = min(y, h - 1 - y) / (h / 2)
        edge_strength = max(0.0, 1.0 - edge_dist)
        alpha = int(150 * (edge_strength ** 1.3))
        draw.line([(0, y), (w, y)], fill=(3, 5, 10, alpha))

    # Metallic streaks (deterministic by game id hash).
    streak_count = 8 + (seed % 9)
    base_alpha = 16 + (seed % 10)
    for i in range(streak_count):
        x = int((i + 0.5) * w / streak_count)
        wobble = ((seed >> (i % 16)) & 0xF) - 8
        x2 = max(0, min(w - 1, x + wobble * 6))
        draw.line([(x, 0), (x2, h)], fill=(255, 255, 255, base_alpha), width=2)

    # Highlight edges.
    accent = (
        170 + (seed % 70),
        120 + ((seed >> 8) % 80),
        180 + ((seed >> 16) % 60),
        92,
    )
    draw.rectangle((0, 0, w, 6), fill=accent)
    draw.rectangle((0, h - 7, w, h), fill=accent)

    composed = Image.alpha_composite(rgba, overlay)

    # Global transparency so CSS blending can tint further.
    alpha_mask = Image.new("L", (w, h), 210)
    composed.putalpha(alpha_mask)
    return composed


def build_chrome(game_id: str, source: Path, out_path: Path) -> None:
    with Image.open(source) as im:
        base = center_crop_to_aspect(im.convert("RGB"), *TARGET_SIZE).resize(TARGET_SIZE, Image.Resampling.LANCZOS)
    toned = apply_tone(base)
    result = paint_overlays(toned, stable_hash(game_id))
    result.save(out_path, "PNG", optimize=True)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    files = sorted(SLOT_BG_DIR.glob("*_bg.png"))
    if not files:
        raise SystemExit(f"No slot backgrounds found in {SLOT_BG_DIR}")

    generated = 0
    for bg_path in files:
        game_id = bg_path.stem.removesuffix("_bg")
        out_path = OUTPUT_DIR / f"{game_id}_chrome.png"
        build_chrome(game_id, bg_path, out_path)
        generated += 1

    print(f"Generated {generated} slot chrome textures in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
