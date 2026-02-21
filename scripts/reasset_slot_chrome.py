#!/usr/bin/env python3
"""
Reasset per-slot UI chrome from parent slot backgrounds.

Primary path:
- Local SDXL Turbo img2img pass per game (unique deterministic seed)
- Parent background is used as the init image ("scrape parent UI and reasset")

Fallback path:
- Deterministic Pillow stylizer if SDXL dependencies/device are unavailable

Output:
  assets/ui/slot_chrome/<game_id>_chrome.png

Examples:
  py -3.10 scripts/reasset_slot_chrome.py --engine auto --force
  py -3.10 scripts/reasset_slot_chrome.py --engine sdxl --games sugar_rush,gates_olympus
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
from typing import Iterable

try:
    from PIL import Image, ImageDraw, ImageEnhance, ImageFilter
except ImportError as exc:  # pragma: no cover
    raise SystemExit("Pillow is required. Install with: py -3.10 -m pip install pillow") from exc

ROOT = Path(__file__).resolve().parents[1]
SLOT_BG_DIR = ROOT / "assets" / "backgrounds" / "slots"
OUTPUT_DIR = ROOT / "assets" / "ui" / "slot_chrome"
TARGET_SIZE = (1600, 360)
MODEL_IMAGE_SIZE = (1408, 320)  # Fast SDXL Turbo strip size, close to target aspect.


def stable_hash(text: str) -> int:
    h = 2166136261
    for ch in text:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def game_words(game_id: str) -> str:
    return game_id.replace("_", " ").strip()


def themed_prompt(game_id: str, metadata: dict | None) -> str:
    words = game_words(game_id)
    name = (metadata or {}).get("name") or words.title()
    provider = (metadata or {}).get("provider") or "Royal Games"
    tag = (metadata or {}).get("tag") or ""
    accent = (metadata or {}).get("accentColor") or ""
    template = (metadata or {}).get("template") or "standard"
    bonus_type = (metadata or {}).get("bonusType") or "feature"
    symbols = (metadata or {}).get("symbols") or []
    motif = str(symbols[0]).replace("_", " ") if symbols else words

    tag_hint = f"{tag.lower()}, " if tag else ""
    accent_hint = f"accent lighting around {accent}, " if accent else ""

    return (
        f"{name} slot UI chrome strip, {provider}, {tag_hint}{template} layout, {bonus_type} vibe, "
        f"{motif} motif, {accent_hint}metallic frame, luminous edge rails, premium casino texture, "
        "high detail, no text, no logo"
    )


def themed_negative_prompt() -> str:
    return (
        "text, logo, watermark, signature, people, face, blurry, low quality, artifacts"
    )


def center_crop_to_aspect(img: Image.Image, out_w: int, out_h: int) -> Image.Image:
    src_w, src_h = img.size
    target_ratio = out_w / out_h
    src_ratio = src_w / src_h

    if src_ratio > target_ratio:
        new_w = int(src_h * target_ratio)
        left = (src_w - new_w) // 2
        return img.crop((left, 0, left + new_w, src_h))

    new_h = int(src_w / target_ratio)
    top = (src_h - new_h) // 2
    return img.crop((0, top, src_w, top + new_h))


def apply_tone(base: Image.Image) -> Image.Image:
    toned = base.filter(ImageFilter.GaussianBlur(radius=4.5))
    toned = ImageEnhance.Color(toned).enhance(1.35)
    toned = ImageEnhance.Contrast(toned).enhance(1.24)
    toned = ImageEnhance.Brightness(toned).enhance(0.8)
    return toned


def paint_overlays(img: Image.Image, seed: int) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Edge darkening to keep controls readable in all themes.
    for y in range(h):
        edge_dist = min(y, h - 1 - y) / (h / 2)
        edge_strength = max(0.0, 1.0 - edge_dist)
        alpha = int(148 * (edge_strength ** 1.25))
        draw.line([(0, y), (w, y)], fill=(2, 4, 10, alpha))

    # Deterministic metallic streaks per game.
    streak_count = 8 + (seed % 9)
    base_alpha = 16 + (seed % 10)
    for i in range(streak_count):
        x = int((i + 0.5) * w / streak_count)
        wobble = ((seed >> (i % 16)) & 0xF) - 8
        x2 = max(0, min(w - 1, x + wobble * 6))
        draw.line([(x, 0), (x2, h)], fill=(255, 255, 255, base_alpha), width=2)

    # Highlight rails.
    accent = (
        170 + (seed % 70),
        120 + ((seed >> 8) % 80),
        180 + ((seed >> 16) % 60),
        92,
    )
    draw.rectangle((0, 0, w, 6), fill=accent)
    draw.rectangle((0, h - 7, w, h), fill=accent)

    composed = Image.alpha_composite(rgba, overlay)
    alpha_mask = Image.new("L", (w, h), 210)
    composed.putalpha(alpha_mask)
    return composed


def build_chrome_pillow(game_id: str, source: Path, out_path: Path) -> None:
    with Image.open(source) as im:
        base = center_crop_to_aspect(im.convert("RGB"), *TARGET_SIZE).resize(TARGET_SIZE, Image.Resampling.LANCZOS)
    result = paint_overlays(apply_tone(base), stable_hash(game_id))
    result.save(out_path, "PNG", optimize=True)


def load_sdxl_pipeline(device: str, model_id: str):
    try:
        import torch
        from diffusers import AutoPipelineForImage2Image
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError(
            "SDXL dependencies missing. Install with: py -3.10 -m pip install torch diffusers transformers accelerate"
        ) from exc

    if device == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA device requested, but torch.cuda.is_available() is false.")

    dtype = torch.float16 if device == "cuda" else torch.float32
    kwargs = {"torch_dtype": dtype}
    if device == "cuda":
        kwargs["variant"] = "fp16"

    pipe = AutoPipelineForImage2Image.from_pretrained(model_id, **kwargs)
    pipe.to(device)
    pipe.set_progress_bar_config(disable=True)
    return pipe, torch


def build_chrome_sdxl(
    game_id: str,
    source: Path,
    out_path: Path,
    pipe,
    torch_mod,
    device: str,
    seed_base: int,
    strength: float,
    steps: int,
    guidance: float,
    metadata: dict | None,
) -> None:
    with Image.open(source) as im:
        parent = center_crop_to_aspect(im.convert("RGB"), *MODEL_IMAGE_SIZE).resize(
            MODEL_IMAGE_SIZE, Image.Resampling.LANCZOS
        )

    seed = stable_hash(game_id) ^ seed_base
    generator = torch_mod.Generator(device=device).manual_seed(seed)
    image = pipe(
        prompt=themed_prompt(game_id, metadata),
        negative_prompt=themed_negative_prompt(),
        image=parent,
        strength=strength,
        num_inference_steps=steps,
        guidance_scale=guidance,
        generator=generator,
    ).images[0]

    fitted = center_crop_to_aspect(image.convert("RGB"), *TARGET_SIZE).resize(TARGET_SIZE, Image.Resampling.LANCZOS)
    result = paint_overlays(apply_tone(fitted), stable_hash(game_id))
    result.save(out_path, "PNG", optimize=True)


def parse_games(value: str | None) -> set[str] | None:
    if not value:
        return None
    items = [part.strip() for part in value.split(",")]
    filtered = {part for part in items if part}
    return filtered or None


def load_game_metadata() -> dict[str, dict]:
    defs_path = ROOT / "shared" / "game-definitions.js"
    if not defs_path.exists():
        return {}

    node_script = (
        "const games=require(process.argv[1]);"
        "if(!Array.isArray(games)){throw new Error('game-definitions export must be an array');}"
        "process.stdout.write(JSON.stringify(games));"
    )
    try:
        result = subprocess.run(
            ["node", "-e", node_script, str(defs_path)],
            check=True,
            capture_output=True,
            text=True,
        )
        raw = json.loads(result.stdout)
        if not isinstance(raw, list):
            return {}
        out: dict[str, dict] = {}
        for item in raw:
            if not isinstance(item, dict):
                continue
            game_id = item.get("id")
            if isinstance(game_id, str) and game_id:
                out[game_id] = item
        return out
    except Exception:
        return {}


def iter_game_backgrounds(game_filter: set[str] | None) -> Iterable[tuple[str, Path]]:
    files = sorted(SLOT_BG_DIR.glob("*_bg.png"))
    if not files:
        raise SystemExit(f"No slot backgrounds found in {SLOT_BG_DIR}")

    for bg_path in files:
        game_id = bg_path.stem.removesuffix("_bg")
        if game_filter and game_id not in game_filter:
            continue
        yield game_id, bg_path


def write_manifest(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Reasset slot chrome textures from parent backgrounds.")
    parser.add_argument("--engine", choices=["auto", "sdxl", "pillow"], default="auto")
    parser.add_argument("--model-id", default="stabilityai/sdxl-turbo")
    parser.add_argument("--device", choices=["cuda", "cpu"], default="cuda")
    parser.add_argument("--strength", type=float, default=0.58)
    parser.add_argument("--steps", type=int, default=2)
    parser.add_argument("--guidance", type=float, default=0.0)
    parser.add_argument("--seed-base", type=int, default=7331)
    parser.add_argument("--games", help="Comma-separated game IDs to process")
    parser.add_argument("--limit", type=int, default=0, help="Process at most N games (0 = all)")
    parser.add_argument("--force", action="store_true", help="Overwrite existing chrome files")
    parser.add_argument(
        "--manifest",
        default=str(OUTPUT_DIR / "manifest.json"),
        help="Manifest output path (default: assets/ui/slot_chrome/manifest.json)",
    )
    parser.add_argument("--no-manifest", action="store_true", help="Disable manifest writing")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    game_filter = parse_games(args.games)
    tasks = list(iter_game_backgrounds(game_filter))
    if args.limit > 0:
        tasks = tasks[: args.limit]

    if not tasks:
        raise SystemExit("No matching games found to process.")

    metadata_by_id = load_game_metadata()

    requested = args.engine
    engine = requested
    pipe = None
    torch_mod = None

    if engine in {"auto", "sdxl"}:
        try:
            pipe, torch_mod = load_sdxl_pipeline(args.device, args.model_id)
            engine = "sdxl"
            print(f"Using SDXL Turbo ({args.model_id}) on {args.device}.")
        except Exception as exc:  # pragma: no cover
            if requested == "sdxl":
                raise
            engine = "pillow"
            print(f"SDXL unavailable, falling back to Pillow: {exc}")
    else:
        engine = "pillow"

    generated = 0
    skipped = 0
    failed = 0
    total = len(tasks)
    started_at = datetime.now(timezone.utc)
    entries: list[dict] = []

    for idx, (game_id, bg_path) in enumerate(tasks, start=1):
        out_path = OUTPUT_DIR / f"{game_id}_chrome.png"
        metadata = metadata_by_id.get(game_id)
        seed = stable_hash(game_id) ^ args.seed_base
        prompt = themed_prompt(game_id, metadata)
        entry = {
            "gameId": game_id,
            "source": str(bg_path.relative_to(ROOT)).replace("\\", "/"),
            "output": str(out_path.relative_to(ROOT)).replace("\\", "/"),
            "engine": engine,
            "seed": seed,
            "prompt": prompt,
            "negativePrompt": themed_negative_prompt() if engine == "sdxl" else None,
            "settings": {
                "modelId": args.model_id if engine == "sdxl" else None,
                "device": args.device if engine == "sdxl" else None,
                "strength": args.strength if engine == "sdxl" else None,
                "steps": args.steps if engine == "sdxl" else None,
                "guidance": args.guidance if engine == "sdxl" else None,
            },
            "metadata": {
                "name": (metadata or {}).get("name"),
                "provider": (metadata or {}).get("provider"),
                "tag": (metadata or {}).get("tag"),
                "template": (metadata or {}).get("template"),
                "bonusType": (metadata or {}).get("bonusType"),
                "accentColor": (metadata or {}).get("accentColor"),
            },
        }
        if out_path.exists() and not args.force:
            skipped += 1
            print(f"[{idx:03d}/{total:03d}] skip {game_id}")
            entry["status"] = "skipped"
            entries.append(entry)
            continue

        try:
            if engine == "sdxl":
                build_chrome_sdxl(
                    game_id=game_id,
                    source=bg_path,
                    out_path=out_path,
                    pipe=pipe,
                    torch_mod=torch_mod,
                    device=args.device,
                    seed_base=args.seed_base,
                    strength=args.strength,
                    steps=args.steps,
                    guidance=args.guidance,
                    metadata=metadata,
                )
            else:
                build_chrome_pillow(game_id, bg_path, out_path)
            generated += 1
            print(f"[{idx:03d}/{total:03d}] ok   {game_id}")
            entry["status"] = "generated"
            entries.append(entry)
        except Exception as exc:
            failed += 1
            print(f"[{idx:03d}/{total:03d}] fail {game_id}: {exc}")
            entry["status"] = "failed"
            entry["error"] = str(exc)
            entries.append(entry)

    if not args.no_manifest:
        manifest_path = Path(args.manifest)
        manifest_payload = {
            "createdAt": started_at.isoformat(),
            "finishedAt": datetime.now(timezone.utc).isoformat(),
            "root": str(ROOT),
            "engine": engine,
            "taskCount": total,
            "summary": {
                "generated": generated,
                "skipped": skipped,
                "failed": failed,
                "metadataCount": len(metadata_by_id),
            },
            "settings": {
                "requestedEngine": requested,
                "modelId": args.model_id,
                "device": args.device,
                "strength": args.strength,
                "steps": args.steps,
                "guidance": args.guidance,
                "seedBase": args.seed_base,
                "force": args.force,
                "gamesFilter": sorted(game_filter) if game_filter else None,
                "limit": args.limit,
            },
            "entries": entries,
        }
        write_manifest(manifest_path, manifest_payload)
        print(f"Manifest written: {manifest_path}")

    print(
        "Done. "
        f"engine={engine} metadata={len(metadata_by_id)} "
        f"generated={generated} skipped={skipped} failed={failed} output={OUTPUT_DIR}"
    )
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
