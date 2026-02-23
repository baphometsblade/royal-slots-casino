#!/usr/bin/env python3
"""
Generate animated WebP backgrounds from existing static PNGs using AnimateDiff
via ComfyUI's local API.

For each game background, determines an ambient animation theme from the game ID,
builds a ComfyUI AnimateDiff img2img workflow with very low denoise to preserve
the original composition, post-processes into a seamless looping animated WebP,
and saves alongside the source PNG.

Requirements:
  pip install requests pillow numpy tqdm

ComfyUI must be running locally (default http://127.0.0.1:8188) with AnimateDiff
model mm_sd_v15_v2.ckpt installed.

Usage:
  python scripts/generate_animated_backgrounds.py
  python scripts/generate_animated_backgrounds.py --game sugar_rush --force
  python scripts/generate_animated_backgrounds.py --dry-run
  python scripts/generate_animated_backgrounds.py --comfyui-url http://192.168.1.10:8188 --workers 2
"""

from __future__ import annotations

import argparse
import io
import json
import logging
import sys
import time
import uuid
from pathlib import Path
from typing import Optional

try:
    import requests
except ImportError:
    sys.exit("requests is required. Install with: pip install requests")

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required. Install with: pip install pillow")

try:
    import numpy as np
except ImportError:
    sys.exit("numpy is required. Install with: pip install numpy")

try:
    from tqdm import tqdm
except ImportError:
    # Minimal fallback when tqdm is not installed
    class tqdm:  # type: ignore[no-redef]
        def __init__(self, iterable=None, *, total=None, desc="", **kw):
            self._it = iterable
            self._total = total
            self._desc = desc
            self._n = 0
        def __iter__(self):
            for item in self._it:
                yield item
                self._n += 1
        def __enter__(self):
            return self
        def __exit__(self, *a):
            pass
        def set_postfix_str(self, s, **kw):
            pass
        def update(self, n=1):
            self._n += n

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parents[1]
BACKGROUNDS_DIR = ROOT / "assets" / "backgrounds" / "slots"

# ---------------------------------------------------------------------------
# Theme detection from game IDs
# ---------------------------------------------------------------------------

THEME_KEYWORDS: dict[str, list[str]] = {
    "water": [
        "bass", "splash", "ocean", "sea", "fish", "shark", "reef", "aqua",
        "pirate", "mermaid", "treasure_dive", "kraken", "nautical",
    ],
    "space": [
        "quantum", "starburst", "starlight", "neon", "galaxy", "cosmic",
        "reactor", "nova", "nebula", "astro", "orbit",
    ],
    "ancient": [
        "pharaoh", "book_dead", "pyramid", "egypt", "temple", "olympus",
        "gates", "olympian", "gods", "legacy", "tome", "ancient", "ares",
        "merlin", "sakura",
    ],
    "nature": [
        "bamboo", "rhino", "safari", "buffalo", "forest", "garden",
        "mushroom", "rabbit", "flower", "puppy", "dog", "toro", "wolf",
        "lion", "panda", "elephant",
    ],
    "dark": [
        "crimson", "fang", "vampire", "dead", "blood", "tombstone",
        "san_quentin", "gothic", "zombie", "skeleton", "immortal",
        "mental", "meltdown",
    ],
    "luxury": [
        "gold", "golden", "diamond", "crown", "coin", "vault",
        "money", "fortune", "dollar", "gemhalla", "gems", "jewel",
        "power_crown", "snoop",
    ],
    "winter": [
        "winter", "ice", "frost", "snow", "frozen", "arctic", "blizzard",
        "polar", "glacier",
    ],
    "fire": [
        "fire", "flame", "volcano", "lava", "inferno", "blaze",
        "wildfire", "dragon", "chilli", "hot", "burn", "magma",
        "nitro",
    ],
    "fiesta": [
        "esqueleto", "fiesta", "lucha", "mexican", "taco", "pinata",
        "mariachi", "carnival",
    ],
    "candy": [
        "sugar", "sweet", "candy", "bonanza", "fruit", "jammin",
        "chilli_heat", "extra_chilli", "party",
    ],
    "viking": [
        "viking", "norse", "odin", "thor", "valhalla", "loki",
        "rune", "berserker",
    ],
}

THEME_PROMPTS: dict[str, str] = {
    "water": (
        "gentle caustic light waves, underwater ambient, rippling light "
        "patterns, bubble drift, aquatic atmosphere"
    ),
    "space": (
        "slow drifting stars, nebula shift, cosmic dust, aurora shimmer, "
        "deep space ambient"
    ),
    "ancient": (
        "floating dust motes, flickering torchlight, ancient mystical glow, "
        "temple atmosphere, warm ambient light"
    ),
    "nature": (
        "swaying leaves, dappled light rays, gentle breeze motion, "
        "natural atmosphere, organic movement"
    ),
    "dark": (
        "drifting fog, candlelight flicker, eerie atmosphere, "
        "gothic ambient, subtle shadow movement"
    ),
    "luxury": (
        "soft bokeh shimmer, golden light sweep, opulent glow, "
        "premium ambient, gentle sparkle"
    ),
    "winter": (
        "gentle falling snow, frost shimmer, icy crystal sparkle, "
        "cold breath, winter atmosphere"
    ),
    "fire": (
        "heat haze distortion, ember drift, flickering flame light, "
        "warm glow pulse, volcanic atmosphere"
    ),
    "fiesta": (
        "gentle confetti drift, warm festive glow, candle flicker, "
        "vibrant ambient light, celebration atmosphere"
    ),
    "candy": (
        "gentle sparkle drift, pastel light shimmer, sweet ambient glow, "
        "soft color pulse, playful atmosphere"
    ),
    "viking": (
        "northern lights shimmer, torch flicker, frost crystal, "
        "snowfall, norse atmosphere"
    ),
    "default": (
        "subtle ambient motion, gentle light shift, atmospheric depth, "
        "slow movement, cinematic"
    ),
}

NEGATIVE_PROMPT = (
    "distortion, morphing, changing composition, text, watermark, "
    "blurry, low quality, deformed, artifacts, camera shake, "
    "sudden movement, drastic change"
)


def classify_background(game_id: str) -> str:
    """Determine the ambient animation theme for a game background."""
    name = game_id.lower()

    for theme, keywords in THEME_KEYWORDS.items():
        for kw in keywords:
            if kw in name:
                return theme

    return "default"


def get_theme_prompt(theme: str) -> str:
    """Return the positive prompt string for a background theme."""
    return THEME_PROMPTS.get(theme, THEME_PROMPTS["default"])


# ---------------------------------------------------------------------------
# ComfyUI API helpers
# ---------------------------------------------------------------------------

def check_comfyui(base_url: str) -> bool:
    """Verify ComfyUI is reachable."""
    try:
        r = requests.get(f"{base_url}/system_stats", timeout=5)
        return r.status_code == 200
    except requests.ConnectionError:
        return False


def upload_image(base_url: str, image_path: Path, subfolder: str = "input") -> str:
    """Upload an image to ComfyUI and return the filename on the server."""
    with open(image_path, "rb") as f:
        resp = requests.post(
            f"{base_url}/upload/image",
            files={"image": (image_path.name, f, "image/png")},
            data={"subfolder": subfolder, "overwrite": "true"},
        )
    resp.raise_for_status()
    data = resp.json()
    return data.get("name", image_path.name)


def build_animatediff_workflow(
    uploaded_filename: str,
    positive_prompt: str,
    negative_prompt: str,
    frames: int = 30,
    steps: int = 20,
    cfg: float = 6.0,
    denoise: float = 0.3,
    width: int = 1280,
    height: int = 720,
) -> dict:
    """
    Build a ComfyUI API-format workflow dict for AnimateDiff img2img
    on a background image.

    Lower denoise (0.3) than symbols to preserve composition.
    More frames (30) at lower fps (10) for smoother 3s loops.

    Node layout:
      1  - CheckpointLoaderSimple (sd v1.5)
      2  - CLIPTextEncode (positive)
      3  - CLIPTextEncode (negative)
      4  - LoadImage (source background)
      5  - ImageScale (resize to target resolution)
      6  - ADE_AnimateDiffLoaderWithContext (AnimateDiff model)
      7  - KSampler (denoise pass)
      8  - VAEDecode
      9  - VHS_VideoCombine (output frames)
      10 - VAEEncode (init image to latent)
    """
    workflow = {
        "1": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {
                "ckpt_name": "v1-5-pruned-emaonly.safetensors",
            },
        },
        "2": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": positive_prompt,
                "clip": ["1", 1],
            },
        },
        "3": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": negative_prompt,
                "clip": ["1", 1],
            },
        },
        "4": {
            "class_type": "LoadImage",
            "inputs": {
                "image": uploaded_filename,
            },
        },
        "5": {
            "class_type": "ImageScale",
            "inputs": {
                "image": ["4", 0],
                "width": width,
                "height": height,
                "upscale_method": "lanczos",
                "crop": "center",
            },
        },
        "6": {
            "class_type": "ADE_AnimateDiffLoaderWithContext",
            "inputs": {
                "model": ["1", 0],
                "model_name": "mm_sd_v15_v2.ckpt",
                "beta_schedule": "sqrt_linear (AnimateDiff)",
                "context_options": None,
            },
        },
        "10": {
            "class_type": "VAEEncode",
            "inputs": {
                "pixels": ["5", 0],
                "vae": ["1", 2],
            },
        },
        "7": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["6", 0],
                "positive": ["2", 0],
                "negative": ["3", 0],
                "latent_image": ["10", 0],
                "seed": int(uuid.uuid4().int % (2**32)),
                "steps": steps,
                "cfg": cfg,
                "sampler_name": "euler_ancestral",
                "scheduler": "normal",
                "denoise": denoise,
            },
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["7", 0],
                "vae": ["1", 2],
            },
        },
        "9": {
            "class_type": "VHS_VideoCombine",
            "inputs": {
                "images": ["8", 0],
                "frame_rate": 10,
                "loop_count": 0,
                "filename_prefix": "animbg",
                "format": "image/webp",
                "pingpong": False,
                "save_output": True,
            },
        },
    }
    return workflow


def queue_prompt(base_url: str, workflow: dict) -> str:
    """Submit a workflow to ComfyUI and return the prompt_id."""
    payload = {"prompt": workflow, "client_id": str(uuid.uuid4())}
    resp = requests.post(f"{base_url}/prompt", json=payload)
    resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise RuntimeError(f"ComfyUI error: {data['error']}")
    return data["prompt_id"]


def poll_until_complete(base_url: str, prompt_id: str, timeout: int = 600) -> dict:
    """Poll ComfyUI history until the prompt completes or times out."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = requests.get(f"{base_url}/history/{prompt_id}", timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if prompt_id in data:
                    return data[prompt_id]
        except requests.RequestException:
            pass
        time.sleep(3)
    raise TimeoutError(f"ComfyUI prompt {prompt_id} did not complete within {timeout}s")


def download_output_frames(base_url: str, history_entry: dict) -> list[Image.Image]:
    """Download all output frames from a completed ComfyUI prompt."""
    frames: list[Image.Image] = []
    outputs = history_entry.get("outputs", {})

    for node_id, node_output in outputs.items():
        for key in ("images", "gifs"):
            if key not in node_output:
                continue
            for img_info in node_output[key]:
                filename = img_info["filename"]
                subfolder = img_info.get("subfolder", "")
                img_type = img_info.get("type", "output")

                params = {"filename": filename, "type": img_type}
                if subfolder:
                    params["subfolder"] = subfolder

                resp = requests.get(f"{base_url}/view", params=params, timeout=60)
                resp.raise_for_status()

                img = Image.open(io.BytesIO(resp.content))
                if hasattr(img, "n_frames") and img.n_frames > 1:
                    for i in range(img.n_frames):
                        img.seek(i)
                        frames.append(img.copy().convert("RGB"))
                else:
                    frames.append(img.convert("RGB"))

    return frames


# ---------------------------------------------------------------------------
# Post-processing
# ---------------------------------------------------------------------------

def make_seamless_loop(frames: list[Image.Image], crossfade: int = 6) -> list[Image.Image]:
    """
    Cross-fade the last `crossfade` frames with the first `crossfade` frames
    to create a seamless loop. Backgrounds use a wider crossfade zone (6 frames)
    for smoother transitions.
    """
    if len(frames) <= crossfade * 2:
        return frames

    result = list(frames)
    for i in range(crossfade):
        alpha = i / crossfade
        head_idx = i
        tail_idx = len(frames) - crossfade + i

        head_arr = np.array(result[head_idx], dtype=np.float32)
        tail_arr = np.array(frames[tail_idx], dtype=np.float32)

        blended = (tail_arr * (1.0 - alpha) + head_arr * alpha).clip(0, 255).astype(np.uint8)
        mode = result[head_idx].mode
        result[head_idx] = Image.fromarray(blended, mode)

    # Trim the crossfade zone from the tail
    result = result[: len(frames) - crossfade]
    return result


def encode_animated_webp(
    frames: list[Image.Image],
    output_path: Path,
    fps: int = 10,
    quality: int = 75,
    target_max_kb: int = 400,
) -> int:
    """
    Encode a list of PIL images into an animated WebP file.
    Returns the file size in bytes.
    """
    if not frames:
        raise ValueError("No frames to encode")

    duration_ms = int(1000 / fps)

    # Ensure all frames are RGB (backgrounds don't need alpha)
    rgb_frames = [f.convert("RGB") for f in frames]

    rgb_frames[0].save(
        output_path,
        format="WEBP",
        save_all=True,
        append_images=rgb_frames[1:],
        duration=duration_ms,
        loop=0,
        quality=quality,
        lossless=False,
        method=4,
    )

    file_size = output_path.stat().st_size

    # If over target, reduce quality iteratively
    attempts = 0
    current_quality = quality
    while file_size > target_max_kb * 1024 and current_quality > 15 and attempts < 6:
        current_quality -= 8
        attempts += 1
        rgb_frames[0].save(
            output_path,
            format="WEBP",
            save_all=True,
            append_images=rgb_frames[1:],
            duration=duration_ms,
            loop=0,
            quality=current_quality,
            lossless=False,
            method=4,
        )
        file_size = output_path.stat().st_size

    return file_size


# ---------------------------------------------------------------------------
# Main generation pipeline
# ---------------------------------------------------------------------------

def process_background(
    bg_path: Path,
    game_id: str,
    base_url: str,
    force: bool = False,
    dry_run: bool = False,
) -> dict:
    """
    Process a single background PNG into an animated WebP.

    Returns a dict with status info:
      {"status": "generated"|"skipped"|"failed", "path": ..., "size": ..., "reason": ...}
    """
    output_path = bg_path.with_suffix(".webp")

    # Resume check
    if output_path.exists() and not force:
        return {
            "status": "skipped",
            "path": str(output_path),
            "reason": "already exists",
        }

    theme = classify_background(game_id)
    prompt = get_theme_prompt(theme)
    full_prompt = (
        f"({prompt}:1.2), seamless loop, ambient background animation, "
        f"cinematic quality, consistent composition, same scene"
    )

    if dry_run:
        return {
            "status": "dry_run",
            "path": str(output_path),
            "theme": theme,
            "prompt": full_prompt,
        }

    try:
        # Upload to ComfyUI
        uploaded_name = upload_image(base_url, bg_path)

        # Build workflow at 1280x720
        workflow = build_animatediff_workflow(
            uploaded_filename=uploaded_name,
            positive_prompt=full_prompt,
            negative_prompt=NEGATIVE_PROMPT,
            frames=30,
            steps=20,
            cfg=6.0,
            denoise=0.3,
            width=1280,
            height=720,
        )

        # Queue and wait (backgrounds take longer due to higher resolution)
        prompt_id = queue_prompt(base_url, workflow)
        history = poll_until_complete(base_url, prompt_id, timeout=600)

        # Download frames
        frames = download_output_frames(base_url, history)
        if not frames:
            return {
                "status": "failed",
                "path": str(output_path),
                "reason": "No frames returned from ComfyUI",
            }

        # Post-process: seamless loop
        frames = make_seamless_loop(frames, crossfade=6)

        # Encode to animated WebP
        file_size = encode_animated_webp(
            frames, output_path, fps=10, quality=75, target_max_kb=400
        )

        return {
            "status": "generated",
            "path": str(output_path),
            "size": file_size,
            "frames": len(frames),
            "theme": theme,
        }

    except requests.ConnectionError:
        return {
            "status": "failed",
            "path": str(output_path),
            "reason": "Cannot connect to ComfyUI. Is it running?",
        }
    except TimeoutError as e:
        return {
            "status": "failed",
            "path": str(output_path),
            "reason": str(e),
        }
    except Exception as e:
        return {
            "status": "failed",
            "path": str(output_path),
            "reason": f"{type(e).__name__}: {e}",
        }


def gather_backgrounds(game_filter: Optional[str] = None) -> list[tuple[str, Path]]:
    """
    Gather all (game_id, background_path) pairs from assets/backgrounds/slots/.
    Looks for files matching *_bg.png pattern.
    If game_filter is set, only return that game's background.
    """
    results: list[tuple[str, Path]] = []

    if not BACKGROUNDS_DIR.exists():
        logging.error("Backgrounds directory not found: %s", BACKGROUNDS_DIR)
        return results

    for bg_file in sorted(BACKGROUNDS_DIR.glob("*_bg.png")):
        # Extract game_id: "sugar_rush_bg.png" -> "sugar_rush"
        game_id = bg_file.stem.removesuffix("_bg")
        if game_filter and game_id != game_filter:
            continue
        results.append((game_id, bg_file))

    return results


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate animated WebP backgrounds from static PNGs via AnimateDiff / ComfyUI"
    )
    parser.add_argument(
        "--game",
        type=str,
        default=None,
        help="Process only this game ID (e.g. sugar_rush)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-generate even if .webp already exists",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be generated without actually doing it",
    )
    parser.add_argument(
        "--comfyui-url",
        type=str,
        default="http://127.0.0.1:8188",
        help="ComfyUI API base URL (default: http://127.0.0.1:8188)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Number of parallel workers (default: 1; ComfyUI queues internally)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose debug logging",
    )

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(message)s",
        datefmt="%H:%M:%S",
    )

    base_url = args.comfyui_url.rstrip("/")

    # Connectivity check (skip for dry-run)
    if not args.dry_run:
        logging.info("Checking ComfyUI at %s ...", base_url)
        if not check_comfyui(base_url):
            logging.error(
                "Cannot reach ComfyUI at %s\n\n"
                "Make sure ComfyUI is running:\n"
                "  1. cd to your ComfyUI directory\n"
                "  2. python main.py --listen 0.0.0.0 --port 8188\n"
                "  3. Ensure AnimateDiff model mm_sd_v15_v2.ckpt is in\n"
                "     ComfyUI/models/animatediff_models/\n"
                "  4. Ensure SD v1.5 checkpoint is in ComfyUI/models/checkpoints/\n"
                "  5. Install VideoHelperSuite custom node for VHS_VideoCombine\n",
                base_url,
            )
            sys.exit(1)
        logging.info("ComfyUI is reachable.")

    # Gather work items
    backgrounds = gather_backgrounds(game_filter=args.game)
    if not backgrounds:
        logging.warning("No backgrounds found to process.")
        if args.game:
            available = [
                bg.stem.removesuffix("_bg")
                for bg in sorted(BACKGROUNDS_DIR.glob("*_bg.png"))
            ]
            logging.warning(
                "Game '%s' not found. Available games:\n  %s",
                args.game,
                ", ".join(available[:20]) + (" ..." if len(available) > 20 else ""),
            )
        sys.exit(0)

    logging.info("Found %d background(s) to process", len(backgrounds))

    # Process
    stats = {"generated": 0, "skipped": 0, "failed": 0, "dry_run": 0}
    results: list[dict] = []

    if args.workers > 1 and not args.dry_run:
        from concurrent.futures import ThreadPoolExecutor, as_completed

        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            future_map = {}
            for game_id, bg_path in backgrounds:
                fut = executor.submit(
                    process_background, bg_path, game_id, base_url, args.force, args.dry_run
                )
                future_map[fut] = (game_id, bg_path)

            with tqdm(total=len(backgrounds), desc="Animating backgrounds") as pbar:
                for fut in as_completed(future_map):
                    game_id, bg_path = future_map[fut]
                    result = fut.result()
                    result["game_id"] = game_id
                    results.append(result)
                    stats[result["status"]] += 1
                    pbar.set_postfix_str(
                        f"gen={stats['generated']} skip={stats['skipped']} fail={stats['failed']}"
                    )
                    pbar.update(1)
                    if result["status"] == "failed":
                        logging.warning(
                            "FAILED %s: %s", game_id, result.get("reason", "unknown")
                        )
    else:
        with tqdm(backgrounds, desc="Animating backgrounds", total=len(backgrounds)) as pbar:
            for game_id, bg_path in pbar:
                pbar.set_postfix_str(game_id)
                result = process_background(bg_path, game_id, base_url, args.force, args.dry_run)
                result["game_id"] = game_id
                results.append(result)
                stats[result["status"]] += 1

                if result["status"] == "failed":
                    logging.warning(
                        "FAILED %s: %s", game_id, result.get("reason", "unknown")
                    )

    # Summary
    print("\n" + "=" * 60)
    print("ANIMATED BACKGROUND GENERATION SUMMARY")
    print("=" * 60)
    print(f"  Total backgrounds scanned:  {len(backgrounds)}")
    if args.dry_run:
        print(f"  Would generate:             {stats['dry_run']}")
        print(f"  Would skip (existing):      {stats['skipped']}")
        print("\nDry run themes:")
        for r in results:
            if r["status"] == "dry_run":
                print(f"  {r['game_id']}")
                print(f"    Theme:  {r.get('theme', '?')}")
                print(f"    Prompt: {r.get('prompt', '?')[:80]}...")
    else:
        print(f"  Generated:                  {stats['generated']}")
        print(f"  Skipped (existing):         {stats['skipped']}")
        print(f"  Failed:                     {stats['failed']}")

        if stats["generated"] > 0:
            sizes = [r["size"] for r in results if r["status"] == "generated" and "size" in r]
            if sizes:
                avg_kb = sum(sizes) / len(sizes) / 1024
                total_mb = sum(sizes) / (1024 * 1024)
                print(f"  Avg file size:              {avg_kb:.1f} KB")
                print(f"  Total new data:             {total_mb:.2f} MB")

        if stats["failed"] > 0:
            print("\nFailed backgrounds:")
            for r in results:
                if r["status"] == "failed":
                    print(f"  {r['game_id']}: {r.get('reason', 'unknown')}")

    print("=" * 60)

    # Theme distribution summary
    if args.dry_run:
        theme_counts: dict[str, int] = {}
        for r in results:
            t = r.get("theme", "default")
            theme_counts[t] = theme_counts.get(t, 0) + 1
        if theme_counts:
            print("\nTheme distribution:")
            for theme, count in sorted(theme_counts.items(), key=lambda x: -x[1]):
                print(f"  {theme:12s}  {count:3d} backgrounds")
        print("=" * 60)


if __name__ == "__main__":
    main()
