"""
Convert all PNG thumbnails in assets/thumbnails/ to WebP format.
WebP reduces file sizes by ~70% vs PNG with no perceptible quality loss.
Keeps the original PNGs in place (lazy loader tries .webp first, .png fallback).
Run: py -3.10 scripts/convert_thumbnails_webp.py
"""

import os
import sys
import time
from PIL import Image

THUMB_DIR = r"C:\created games\Casino\assets\thumbnails"

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

png_files = [f for f in os.listdir(THUMB_DIR) if f.endswith('.png')]
print(f"Converting {len(png_files)} PNG thumbnails to WebP (quality=85)...")
t0 = time.time()

converted = 0
skipped = 0
total_png_kb = 0
total_webp_kb = 0

for fname in sorted(png_files):
    png_path = os.path.join(THUMB_DIR, fname)
    webp_path = os.path.join(THUMB_DIR, fname.replace('.png', '.webp'))

    png_kb = os.path.getsize(png_path) / 1024
    total_png_kb += png_kb

    if os.path.exists(webp_path) and os.path.getmtime(webp_path) >= os.path.getmtime(png_path):
        webp_kb = os.path.getsize(webp_path) / 1024
        total_webp_kb += webp_kb
        print(f"  [skip] {fname.replace('.png','.webp')}  ({webp_kb:.0f} KB — already up to date)")
        skipped += 1
        continue

    try:
        img = Image.open(png_path).convert('RGBA')
        img.save(webp_path, 'WEBP', quality=85, method=6)
        webp_kb = os.path.getsize(webp_path) / 1024
        total_webp_kb += webp_kb
        saving_pct = 100 * (1 - webp_kb / png_kb) if png_kb > 0 else 0
        print(f"  [OK] {fname.replace('.png','.webp')}  {png_kb:.0f} KB → {webp_kb:.0f} KB  (-{saving_pct:.0f}%)")
        converted += 1
    except Exception as e:
        print(f"  [ERR] {fname}: {e}")

elapsed = time.time() - t0
saving_total = 100 * (1 - total_webp_kb / total_png_kb) if total_png_kb > 0 else 0
print(f"\nDone! Converted {converted}, skipped {skipped} in {elapsed:.1f}s")
print(f"Total PNG size:  {total_png_kb/1024:.1f} MB")
print(f"Total WebP size: {total_webp_kb/1024:.1f} MB  (-{saving_total:.0f}% savings)")
print(f"Output: {THUMB_DIR}")
