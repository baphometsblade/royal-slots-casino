"""
generate_casino_ui_assets.py

Generate HD casino UI assets via a local SDXL/A1111 API.
Output directory: assets/ui/ (relative to project root, two levels up from scripts/).

Usage:
    python scripts/generate_casino_ui_assets.py
    python scripts/generate_casino_ui_assets.py --dry-run
    python scripts/generate_casino_ui_assets.py --force
    python scripts/generate_casino_ui_assets.py --api-url http://127.0.0.1:7860 --model sd_xl_base_1.0
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
# Asset definitions
# ---------------------------------------------------------------------------

NEGATIVE_PROMPT = (
    "blurry, low quality, watermark, text overlay, ugly, deformed, cartoon, anime, childish"
)

ASSETS: list[dict[str, Any]] = [
    {
        "filename": "hero-banner.png",
        "prompt": (
            "ultra HD casino hero banner, dark luxury background, golden neon lights, "
            "slot machine reels, playing cards, dice, poker chips, cinematic lighting, "
            "4k, photorealistic, wide landscape aspect"
        ),
        "width": 1920,
        "height": 600,
        "steps": 30,
    },
    {
        "filename": "hero-banner-mobile.png",
        "prompt": (
            "ultra HD casino hero banner portrait, dark luxury background, golden neon glow, "
            "slot machines, playing cards, 4k, photorealistic, mobile portrait"
        ),
        "width": 768,
        "height": 960,
        "steps": 30,
    },
    {
        "filename": "vip-banner.png",
        "prompt": (
            "VIP casino lounge, dark purple velvet, golden crown, diamonds, "
            "exclusive luxury atmosphere, dramatic lighting, photorealistic, wide"
        ),
        "width": 1200,
        "height": 400,
        "steps": 30,
    },
    {
        "filename": "slots-category.png",
        "prompt": (
            "slot machine reels, glowing symbols, seven lucky sevens, "
            "neon casino style, square format, dark background"
        ),
        "width": 512,
        "height": 512,
        "steps": 25,
    },
    {
        "filename": "table-games-category.png",
        "prompt": (
            "luxury casino table, roulette wheel, poker chips, playing cards, "
            "green felt, elegant casino, square format, dark background"
        ),
        "width": 512,
        "height": 512,
        "steps": 25,
    },
    {
        "filename": "instant-games-category.png",
        "prompt": (
            "lightning bolt, crash rocket, mines grid, neon instant games, "
            "futuristic casino, square format, dark background"
        ),
        "width": 512,
        "height": 512,
        "steps": 25,
    },
    {
        "filename": "promotions-banner.png",
        "prompt": (
            "casino promotions banner, exploding coins, confetti, gift boxes, "
            "golden text, bonus offer, wide landscape, photorealistic neon"
        ),
        "width": 1200,
        "height": 400,
        "steps": 30,
    },
    {
        "filename": "jackpot-banner.png",
        "prompt": (
            "progressive jackpot, huge pile of gold coins, glowing numbers, "
            "lottery win, jackpot celebration, cinematic, wide dark background"
        ),
        "width": 1200,
        "height": 400,
        "steps": 30,
    },
    {
        "filename": "login-background.png",
        "prompt": (
            "casino night background, bokeh lights, playing cards falling, "
            "dark elegant atmosphere, 4k, portrait"
        ),
        "width": 1080,
        "height": 1920,
        "steps": 30,
    },
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def build_payload(
    asset: dict[str, Any],
    model: str,
    sampler: str = "DPM++ 2M Karras",
    cfg_scale: float = 7.0,
) -> dict[str, Any]:
    """Build the A1111 txt2img request payload for a single asset."""
    return {
        "prompt": asset["prompt"],
        "negative_prompt": NEGATIVE_PROMPT,
        "width": asset["width"],
        "height": asset["height"],
        "steps": asset["steps"],
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
        description="Generate HD casino UI assets via a local SDXL/A1111 API."
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
    output_dir = project_root / "assets" / "ui"

    total = len(ASSETS)
    generated = 0
    skipped = 0

    print(f"Casino UI Asset Generator")
    print(f"  API URL : {args.api_url}")
    print(f"  Model   : {args.model}")
    print(f"  Output  : {output_dir}")
    print(f"  Dry run : {args.dry_run}")
    print(f"  Force   : {args.force}")
    print()

    for idx, asset in enumerate(ASSETS, start=1):
        filename: str = asset["filename"]
        output_path = output_dir / filename

        print(f"[{idx}/{total}] Generating {filename}...")

        # Skip existing unless --force
        if not args.force and output_path.exists():
            print(f"  SKIP: {output_path} already exists (use --force to overwrite).")
            skipped += 1
            continue

        if args.dry_run:
            print(
                f"  DRY RUN: would generate {filename} "
                f"({asset['width']}x{asset['height']}, {asset['steps']} steps)"
            )
            generated += 1
            continue

        payload = build_payload(asset, model=args.model)
        success = generate_image(args.api_url, payload, output_path)
        if success:
            size_kb = output_path.stat().st_size // 1024
            print(f"  OK: saved to {output_path} ({size_kb} KB)")
            generated += 1
        # On error: generate_image already printed the message; continue to next asset

    print()
    if args.dry_run:
        print(f"Dry run complete. Would generate {generated}/{total} assets.")
    else:
        actual = generated
        print(f"Generated {actual}/{total} assets successfully ({skipped} skipped).")


if __name__ == "__main__":
    main()
