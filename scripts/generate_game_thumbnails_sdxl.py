"""
generate_game_thumbnails_sdxl.py

Generate individual 512x512 game thumbnail images for slot games using SDXL.
Output directory: assets/thumbnails/sdxl/ (relative to project root).

Usage:
    python scripts/generate_game_thumbnails_sdxl.py
    python scripts/generate_game_thumbnails_sdxl.py --dry-run
    python scripts/generate_game_thumbnails_sdxl.py --force
    python scripts/generate_game_thumbnails_sdxl.py --api-url http://127.0.0.1:7860 --model sd_xl_base_1.0
"""

import argparse
import base64
import json
import os
import sys
from pathlib import Path
from typing import Any

import requests

# ---------------------------------------------------------------------------
# Game theme definitions
# ---------------------------------------------------------------------------

NEGATIVE_PROMPT = (
    "blurry, low quality, watermark, text overlay, ugly, deformed, cartoon, anime, childish"
)

PROMPT_SUFFIX = (
    ", casino slot game thumbnail, vibrant, square format, no text, dark background"
)

GAME_THEMES: list[tuple[str, str]] = [
    (
        "egyptian_gold",
        "ancient Egypt pyramid slot machine, pharaoh, hieroglyphs, gold scarab, desert sands, slot game art",
    ),
    (
        "neon_dragon",
        "Asian dragon slot machine, neon red and gold, Chinese lanterns, fortune, slot game square",
    ),
    (
        "wild_west_spins",
        "Wild West casino, cowboy, gold rush, sheriff star, saloon, slot game art square",
    ),
    (
        "ocean_treasure",
        "underwater slot machine, mermaid, treasure chest, coral reef, pearl, slot game art",
    ),
    (
        "crypto_heist",
        "cyberpunk hacker casino, Bitcoin, neon hologram, digital slots, futuristic",
    ),
    (
        "santa_jackpot",
        "Christmas casino slot, Santa Claus, gifts, snow, festive neon, slot game art",
    ),
    (
        "voodoo_fortune",
        "voodoo mystical slot machine, skull, candle, mystical swamp, dark neon, slot art",
    ),
    (
        "samurai_reels",
        "samurai warrior slot machine, katana, cherry blossom, Japanese neon, slot art",
    ),
    (
        "galactic_spins",
        "space casino slot machine, alien planet, stars, rocket, galactic neon art",
    ),
    (
        "viking_plunder",
        "Viking slot machine, longship, Norse runes, Thor hammer, Nordic frost, art",
    ),
]

THUMBNAIL_WIDTH = 512
THUMBNAIL_HEIGHT = 512
THUMBNAIL_STEPS = 25

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def build_payload(
    prompt: str,
    model: str,
    sampler: str = "DPM++ 2M Karras",
    cfg_scale: float = 7.0,
) -> dict[str, Any]:
    """Build the A1111 txt2img request payload for a single thumbnail."""
    return {
        "prompt": prompt + PROMPT_SUFFIX,
        "negative_prompt": NEGATIVE_PROMPT,
        "width": THUMBNAIL_WIDTH,
        "height": THUMBNAIL_HEIGHT,
        "steps": THUMBNAIL_STEPS,
        "sampler_name": sampler,
        "cfg_scale": cfg_scale,
        "override_settings": {
            "sd_model_checkpoint": model,
        },
        "send_images": True,
        "save_images": False,
    }


def generate_image(
    api_url: str,
    payload: dict[str, Any],
    output_path: Path,
) -> bool:
    """
    Call the A1111 txt2img endpoint and write the first returned image to disk.
    Returns True on success, False on any error.
    """
    endpoint = api_url.rstrip("/") + "/sdapi/v1/txt2img"
    try:
        response = requests.post(
            endpoint,
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload),
            timeout=300,
        )
        response.raise_for_status()
    except requests.exceptions.ConnectionError:
        print(
            f"  ERROR: Could not connect to API at {endpoint}. "
            "Is the SDXL server running?"
        )
        return False
    except requests.exceptions.Timeout:
        print(f"  ERROR: Request timed out for {output_path.name}.")
        return False
    except requests.exceptions.HTTPError as exc:
        print(f"  ERROR: HTTP {exc.response.status_code} for {output_path.name}: {exc}")
        return False
    except requests.exceptions.RequestException as exc:
        print(f"  ERROR: Request failed for {output_path.name}: {exc}")
        return False

    try:
        result = response.json()
        images = result.get("images")
        if not images:
            print(f"  ERROR: API returned no images for {output_path.name}.")
            return False
        image_data = base64.b64decode(images[0])
    except (json.JSONDecodeError, KeyError, Exception) as exc:
        print(f"  ERROR: Could not decode API response for {output_path.name}: {exc}")
        return False

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(image_data)
    return True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate SDXL game thumbnails for slot games via a local A1111 API."
    )
    parser.add_argument(
        "--api-url",
        default="http://127.0.0.1:7860",
        help="Base URL of the A1111-compatible API (default: http://127.0.0.1:7860)",
    )
    parser.add_argument(
        "--model",
        default="sd_xl_base_1.0",
        help="Checkpoint model name as known to the API (default: sd_xl_base_1.0)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be generated without calling the API.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing output files.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    # Resolve output directory: two levels up from this script file → project root
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent
    output_dir = project_root / "assets" / "thumbnails" / "sdxl"

    total = len(GAME_THEMES)
    generated = 0
    skipped = 0

    print(f"SDXL Game Thumbnail Generator")
    print(f"  API URL   : {args.api_url}")
    print(f"  Model     : {args.model}")
    print(f"  Output    : {output_dir}")
    print(f"  Size      : {THUMBNAIL_WIDTH}x{THUMBNAIL_HEIGHT}")
    print(f"  Steps     : {THUMBNAIL_STEPS}")
    print(f"  Dry run   : {args.dry_run}")
    print(f"  Force     : {args.force}")
    print()

    for idx, (game_id, base_prompt) in enumerate(GAME_THEMES, start=1):
        filename = f"{game_id}.png"
        output_path = output_dir / filename

        print(f"[{idx}/{total}] Generating {filename}...")

        # Skip existing unless --force
        if not args.force and output_path.exists():
            print(f"  SKIP: {output_path} already exists (use --force to overwrite).")
            skipped += 1
            continue

        if args.dry_run:
            full_prompt = base_prompt + PROMPT_SUFFIX
            print(
                f"  DRY RUN: would generate {filename} "
                f"({THUMBNAIL_WIDTH}x{THUMBNAIL_HEIGHT}, {THUMBNAIL_STEPS} steps)"
            )
            print(f"  Prompt  : {full_prompt[:120]}{'...' if len(full_prompt) > 120 else ''}")
            generated += 1
            continue

        payload = build_payload(base_prompt, model=args.model)
        success = generate_image(args.api_url, payload, output_path)
        if success:
            size_kb = output_path.stat().st_size // 1024
            print(f"  OK: saved to {output_path} ({size_kb} KB)")
            generated += 1
        # On error: generate_image already printed the message; continue to next asset

    print()
    if args.dry_run:
        print(f"Dry run complete. Would generate {generated}/{total} thumbnails.")
    else:
        print(f"Generated {generated}/{total} thumbnails successfully ({skipped} skipped).")


if __name__ == "__main__":
    main()
