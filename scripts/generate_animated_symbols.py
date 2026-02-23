#!/usr/bin/env python3
"""
Generate animated WebP symbols from existing static PNGs using AnimateDiff
via ComfyUI's local API.

For each game's symbol PNGs, determines an animation category from the filename,
builds a ComfyUI AnimateDiff img2img workflow, post-processes into a seamless
looping animated WebP, and saves alongside the source PNG.

Requirements:
  pip install requests pillow numpy tqdm

ComfyUI must be running locally (default http://127.0.0.1:8188) with AnimateDiff
model mm_sd_v15_v2.ckpt installed.

Usage:
  python scripts/generate_animated_symbols.py
  python scripts/generate_animated_symbols.py --game sugar_rush --force
  python scripts/generate_animated_symbols.py --dry-run
  python scripts/generate_animated_symbols.py --comfyui-url http://192.168.1.10:8188 --workers 2
"""

from __future__ import annotations

import argparse
import io
import json
import logging
import struct
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
SYMBOLS_DIR = ROOT / "assets" / "game_symbols"

# ---------------------------------------------------------------------------
# Animation category detection
# ---------------------------------------------------------------------------

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "candy": [
        "lollipop", "cupcake", "cherry", "cake", "candy", "sugar", "gummy",
        "cookie", "chocolate", "ice_cream", "donut", "bonbon", "sweet",
        "jellybean", "toffee", "marshmallow",
    ],
    "mythical": [
        "dragon", "phoenix", "wolf", "lion", "tiger", "eagle", "serpent",
        "hydra", "griffin", "pegasus", "unicorn", "minotaur", "cerberus",
        "kraken", "basilisk",
    ],
    "gems": [
        "diamond", "ruby", "emerald", "sapphire", "crystal", "gem", "jewel",
        "amethyst", "topaz", "opal", "garnet", "pearl", "quartz",
    ],
    "egyptian": [
        "ankh", "pharaoh", "scarab", "pyramid", "sphinx", "hieroglyph",
        "eye_of_ra", "nile", "mummy", "sarcophagus", "osiris", "anubis",
        "cleopatra", "horus",
    ],
    "nature": [
        "leaf", "flower", "tree", "mushroom", "acorn", "forest", "vine",
        "butterfly", "bamboo", "blossom", "petal", "fern", "moss", "orchid",
    ],
    "tech": [
        "circuit", "planet", "rocket", "star", "galaxy", "laser", "robot",
        "data", "neon", "cyber", "hologram", "quantum", "pulse",
    ],
}

CATEGORY_PROMPTS: dict[str, str] = {
    "candy": "gentle wobble, sparkle shimmer, candy glow, soft pulsing light",
    "mythical": "breathing motion, subtle aura flicker, living creature energy, gentle movement",
    "gems": "slow rotation, prismatic light refraction, sparkle, gem brilliance",
    "wild": "pulsing energy glow, dramatic aura, power surge, radiant light",
    "scatter": "floating, radiating energy, portal glow, most dramatic, magical particles",
    "egyptian": "hovering mystical glow, sand particles, ancient magic, golden shimmer",
    "nature": "gentle swaying, drifting, light rays, natural motion, organic movement",
    "tech": "holographic flicker, data pulse, tech glow, digital shimmer",
    "default": "subtle idle animation, gentle movement, soft glow",
}

NEGATIVE_PROMPT = (
    "distortion, morphing, changing shape, text, watermark, blurry, "
    "low quality, deformed, artifacts, noise, grain, ugly"
)


def classify_symbol(filename: str) -> str:
    """Return animation category for a symbol filename (without extension)."""
    name = filename.lower()

    # Special prefix checks first
    if name.startswith("wild"):
        return "wild"
    if name.startswith("scatter") or name.startswith("bonus"):
        return "scatter"

    # Keyword scan across categories
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in name:
                return category

    return "default"


def get_prompt_for_category(category: str) -> str:
    """Return the positive prompt string for a category."""
    return CATEGORY_PROMPTS.get(category, CATEGORY_PROMPTS["default"])


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
    frames: int = 24,
    steps: int = 20,
    cfg: float = 7.0,
    denoise: float = 0.4,
    width: int = 256,
    height: int = 256,
) -> dict:
    """
    Build a ComfyUI API-format workflow dict for AnimateDiff img2img.

    Node layout:
      1  - CheckpointLoaderSimple (sd v1.5)
      2  - CLIPTextEncode (positive)
      3  - CLIPTextEncode (negative)
      4  - LoadImage (source symbol)
      5  - ImageScale (resize to target)
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
                "frame_rate": 15,
                "loop_count": 0,
                "filename_prefix": "animsymbol",
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


def poll_until_complete(base_url: str, prompt_id: str, timeout: int = 300) -> dict:
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
        time.sleep(2)
    raise TimeoutError(f"ComfyUI prompt {prompt_id} did not complete within {timeout}s")


def download_output_frames(base_url: str, history_entry: dict) -> list[Image.Image]:
    """Download all output frames from a completed ComfyUI prompt."""
    frames: list[Image.Image] = []
    outputs = history_entry.get("outputs", {})

    for node_id, node_output in outputs.items():
        # Look for images or gifs in the output
        if "images" in node_output:
            for img_info in node_output["images"]:
                filename = img_info["filename"]
                subfolder = img_info.get("subfolder", "")
                img_type = img_info.get("type", "output")

                params = {"filename": filename, "type": img_type}
                if subfolder:
                    params["subfolder"] = subfolder

                resp = requests.get(f"{base_url}/view", params=params, timeout=30)
                resp.raise_for_status()

                # Could be a webp animation or individual frames
                img = Image.open(io.BytesIO(resp.content))
                if hasattr(img, "n_frames") and img.n_frames > 1:
                    for i in range(img.n_frames):
                        img.seek(i)
                        frames.append(img.copy().convert("RGBA"))
                else:
                    frames.append(img.convert("RGBA"))

        if "gifs" in node_output:
            for gif_info in node_output["gifs"]:
                filename = gif_info["filename"]
                subfolder = gif_info.get("subfolder", "")
                gif_type = gif_info.get("type", "output")

                params = {"filename": filename, "type": gif_type}
                if subfolder:
                    params["subfolder"] = subfolder

                resp = requests.get(f"{base_url}/view", params=params, timeout=30)
                resp.raise_for_status()

                img = Image.open(io.BytesIO(resp.content))
                if hasattr(img, "n_frames") and img.n_frames > 1:
                    for i in range(img.n_frames):
                        img.seek(i)
                        frames.append(img.copy().convert("RGBA"))
                else:
                    frames.append(img.convert("RGBA"))

    return frames


# ---------------------------------------------------------------------------
# Post-processing
# ---------------------------------------------------------------------------

def make_seamless_loop(frames: list[Image.Image], crossfade: int = 4) -> list[Image.Image]:
    """
    Cross-fade the last `crossfade` frames with the first `crossfade` frames
    to create a seamless loop.
    """
    if len(frames) <= crossfade * 2:
        return frames  # Too few frames for cross-fade

    result = list(frames)
    for i in range(crossfade):
        alpha = i / crossfade  # 0.0 -> 1.0 as we move through blend zone
        head_idx = i
        tail_idx = len(frames) - crossfade + i

        head_arr = np.array(result[head_idx], dtype=np.float32)
        tail_arr = np.array(frames[tail_idx], dtype=np.float32)

        blended = (tail_arr * (1.0 - alpha) + head_arr * alpha).clip(0, 255).astype(np.uint8)
        result[head_idx] = Image.fromarray(blended, "RGBA")

    # Trim the crossfade zone from the tail
    result = result[: len(frames) - crossfade]
    return result


def transfer_transparency(source_png: Image.Image, frame: Image.Image) -> Image.Image:
    """
    Apply the alpha channel from the source PNG to an animated frame.
    Preserves the original symbol's shape / transparency mask.
    """
    source = source_png.convert("RGBA")
    frame = frame.convert("RGBA").resize(source.size, Image.LANCZOS)

    # Extract alpha from original
    _, _, _, src_alpha = source.split()

    # Composite: use the animated frame's RGB but the source's alpha
    r, g, b, _ = frame.split()
    result = Image.merge("RGBA", (r, g, b, src_alpha))
    return result


def encode_animated_webp(
    frames: list[Image.Image],
    output_path: Path,
    fps: int = 15,
    quality: int = 80,
    target_max_kb: int = 150,
) -> int:
    """
    Encode a list of RGBA PIL images into an animated WebP file.
    Returns the file size in bytes.
    """
    if not frames:
        raise ValueError("No frames to encode")

    duration_ms = int(1000 / fps)

    # First attempt at target quality
    frames[0].save(
        output_path,
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
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
    while file_size > target_max_kb * 1024 and current_quality > 20 and attempts < 5:
        current_quality -= 10
        attempts += 1
        frames[0].save(
            output_path,
            format="WEBP",
            save_all=True,
            append_images=frames[1:],
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

def process_symbol(
    symbol_path: Path,
    game_id: str,
    base_url: str,
    force: bool = False,
    dry_run: bool = False,
) -> dict:
    """
    Process a single symbol PNG into an animated WebP.

    Returns a dict with status info:
      {"status": "generated"|"skipped"|"failed", "path": ..., "size": ..., "reason": ...}
    """
    stem = symbol_path.stem
    output_path = symbol_path.with_suffix(".webp")

    # Resume check
    if output_path.exists() and not force:
        return {
            "status": "skipped",
            "path": str(output_path),
            "reason": "already exists",
        }

    category = classify_symbol(stem)
    prompt = get_prompt_for_category(category)
    full_prompt = f"({prompt}:1.3), seamless loop animation, same subject, consistent style"

    if dry_run:
        return {
            "status": "dry_run",
            "path": str(output_path),
            "category": category,
            "prompt": full_prompt,
        }

    try:
        # Load source for dimensions and transparency mask
        source_img = Image.open(symbol_path).convert("RGBA")
        src_w, src_h = source_img.size

        # Upload to ComfyUI
        uploaded_name = upload_image(base_url, symbol_path)

        # Build workflow
        # AnimateDiff works best at multiples of 64; clamp symbol size
        anim_w = min(max(64, (src_w // 64) * 64), 512)
        anim_h = min(max(64, (src_h // 64) * 64), 512)
        if anim_w < 64:
            anim_w = 256
        if anim_h < 64:
            anim_h = 256

        workflow = build_animatediff_workflow(
            uploaded_filename=uploaded_name,
            positive_prompt=full_prompt,
            negative_prompt=NEGATIVE_PROMPT,
            frames=24,
            steps=20,
            cfg=7.0,
            denoise=0.4,
            width=anim_w,
            height=anim_h,
        )

        # Queue and wait
        prompt_id = queue_prompt(base_url, workflow)
        history = poll_until_complete(base_url, prompt_id, timeout=300)

        # Download frames
        frames = download_output_frames(base_url, history)
        if not frames:
            return {
                "status": "failed",
                "path": str(output_path),
                "reason": "No frames returned from ComfyUI",
            }

        # Post-process
        frames = make_seamless_loop(frames, crossfade=4)
        frames = [transfer_transparency(source_img, f) for f in frames]

        # Encode
        file_size = encode_animated_webp(
            frames, output_path, fps=15, quality=80, target_max_kb=150
        )

        return {
            "status": "generated",
            "path": str(output_path),
            "size": file_size,
            "frames": len(frames),
            "category": category,
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


def gather_symbols(game_filter: Optional[str] = None) -> list[tuple[str, Path]]:
    """
    Gather all (game_id, symbol_path) pairs from assets/game_symbols/.
    If game_filter is set, only return symbols for that game.
    """
    results: list[tuple[str, Path]] = []

    if not SYMBOLS_DIR.exists():
        logging.error("Symbols directory not found: %s", SYMBOLS_DIR)
        return results

    game_dirs = sorted(SYMBOLS_DIR.iterdir())
    for game_dir in game_dirs:
        if not game_dir.is_dir():
            continue
        game_id = game_dir.name
        if game_filter and game_id != game_filter:
            continue
        for png_file in sorted(game_dir.glob("*.png")):
            results.append((game_id, png_file))

    return results


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate animated WebP symbols from static PNGs via AnimateDiff / ComfyUI"
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
                "  4. Ensure SD v1.5 checkpoint is in ComfyUI/models/checkpoints/\n",
                base_url,
            )
            sys.exit(1)
        logging.info("ComfyUI is reachable.")

    # Gather work items
    symbols = gather_symbols(game_filter=args.game)
    if not symbols:
        logging.warning("No symbols found to process.")
        if args.game:
            logging.warning(
                "Game '%s' not found. Available games in %s:\n  %s",
                args.game,
                SYMBOLS_DIR,
                ", ".join(
                    d.name for d in sorted(SYMBOLS_DIR.iterdir()) if d.is_dir()
                ),
            )
        sys.exit(0)

    logging.info("Found %d symbol(s) across game(s)", len(symbols))

    # Process
    stats = {"generated": 0, "skipped": 0, "failed": 0, "dry_run": 0}
    results: list[dict] = []

    if args.workers > 1 and not args.dry_run:
        # Parallel processing via ThreadPoolExecutor
        from concurrent.futures import ThreadPoolExecutor, as_completed

        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            future_map = {}
            for game_id, sym_path in symbols:
                fut = executor.submit(
                    process_symbol, sym_path, game_id, base_url, args.force, args.dry_run
                )
                future_map[fut] = (game_id, sym_path)

            with tqdm(total=len(symbols), desc="Animating symbols") as pbar:
                for fut in as_completed(future_map):
                    game_id, sym_path = future_map[fut]
                    result = fut.result()
                    result["game_id"] = game_id
                    result["symbol"] = sym_path.stem
                    results.append(result)
                    stats[result["status"]] += 1
                    pbar.set_postfix_str(
                        f"gen={stats['generated']} skip={stats['skipped']} fail={stats['failed']}"
                    )
                    pbar.update(1)
                    if result["status"] == "failed":
                        logging.warning(
                            "FAILED %s/%s: %s",
                            game_id,
                            sym_path.stem,
                            result.get("reason", "unknown"),
                        )
    else:
        # Sequential processing
        with tqdm(symbols, desc="Animating symbols", total=len(symbols)) as pbar:
            for game_id, sym_path in pbar:
                pbar.set_postfix_str(f"{game_id}/{sym_path.stem}")
                result = process_symbol(sym_path, game_id, base_url, args.force, args.dry_run)
                result["game_id"] = game_id
                result["symbol"] = sym_path.stem
                results.append(result)
                stats[result["status"]] += 1

                if result["status"] == "failed":
                    logging.warning(
                        "FAILED %s/%s: %s",
                        game_id,
                        sym_path.stem,
                        result.get("reason", "unknown"),
                    )

    # Summary
    print("\n" + "=" * 60)
    print("ANIMATED SYMBOL GENERATION SUMMARY")
    print("=" * 60)
    print(f"  Total symbols scanned:  {len(symbols)}")
    if args.dry_run:
        print(f"  Would generate:         {stats['dry_run']}")
        print(f"  Would skip (existing):  {stats['skipped']}")
        print("\nDry run categories:")
        for r in results:
            if r["status"] == "dry_run":
                print(f"  {r['game_id']}/{r['symbol']}")
                print(f"    Category: {r.get('category', '?')}")
                print(f"    Prompt:   {r.get('prompt', '?')[:80]}...")
    else:
        print(f"  Generated:              {stats['generated']}")
        print(f"  Skipped (existing):     {stats['skipped']}")
        print(f"  Failed:                 {stats['failed']}")

        if stats["generated"] > 0:
            sizes = [r["size"] for r in results if r["status"] == "generated" and "size" in r]
            if sizes:
                avg_kb = sum(sizes) / len(sizes) / 1024
                total_mb = sum(sizes) / (1024 * 1024)
                print(f"  Avg file size:          {avg_kb:.1f} KB")
                print(f"  Total new data:         {total_mb:.2f} MB")

        if stats["failed"] > 0:
            print("\nFailed symbols:")
            for r in results:
                if r["status"] == "failed":
                    print(f"  {r['game_id']}/{r['symbol']}: {r.get('reason', 'unknown')}")

    print("=" * 60)


if __name__ == "__main__":
    main()
