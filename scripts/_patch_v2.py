import re, sys
src_path = r"C:\created games\Casino\scripts\generate_animated_symbols_v2.py"
src = open(src_path, encoding="utf-8").read()

# 1. Replace docstring header
old_doc = src[src.index(chr(34)*3):src.index(chr(34)*3, 3)+3]
new_doc = chr(34)*3
new_doc += """
Generate animated WebP slot symbols using pure Pillow -- no ComfyUI required.
VERSION 2 -- adds game-specific overrides, plus 4 new animation categories:
  candy / food (revised) / scroll / gold

Animation categories:
  * Wild / scatter / bonus  ->  rainbow hue-cycle shimmer
  * Coin                    ->  glint + brightness pulse
  * Gem                     ->  scale breathe + sparkle
  * Fire                    ->  hue flicker + jitter
  * Ice                     ->  cool hue pulse + glisten
  * Lightning               ->  fast flash + tint spike
  * Nature                  ->  gentle sway (+-8 degrees)
  * Animal                  ->  breathing scale + tilt
  * Food  [NEW v2]          ->  gentle wobble (translate_y +-3px) + brightness pulse
  * Candy [NEW v2]          ->  pastel hue cycle (+-40 degrees) + scale pulse
  * Gold  [NEW v2]          ->  intense golden shimmer (brightness 0.9 to 1.4)
  * Scroll [NEW v2]         ->  horizontal pan + sepia tint
  * Card                    ->  tilt oscillation
  * Default                 ->  soft glow pulse

Specs: 15 fps, 24 frames (1.6 s loop), 120x120 px output, <=150 KB target.

Usage:
  python scripts/generate_animated_symbols_v2.py
  python scripts/generate_animated_symbols_v2.py --game sugar_rush --force
  python scripts/generate_animated_symbols_v2.py --dry-run
  python scripts/generate_animated_symbols_v2.py --verbose
""" + chr(34)*3
print(repr(new_doc[:50]))