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
  py -3.10 scripts/reasset_slot_chrome.py --engine auto --force --style-mode contrast
  py -3.10 scripts/reasset_slot_chrome.py --engine sdxl --games sugar_rush,gates_olympus --style-mode balanced
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


def clamp(value: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, value))


def parse_hex_color(value: str | None) -> tuple[int, int, int] | None:
    if not value:
        return None
    clean = str(value).strip().lstrip("#")
    if len(clean) != 6:
        return None
    try:
        return (int(clean[0:2], 16), int(clean[2:4], 16), int(clean[4:6], 16))
    except ValueError:
        return None


def rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    return "#{:02x}{:02x}{:02x}".format(clamp(rgb[0], 0, 255), clamp(rgb[1], 0, 255), clamp(rgb[2], 0, 255))


def mix_rgb(a: tuple[int, int, int], b: tuple[int, int, int], ratio: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, ratio))
    return (
        int(a[0] + (b[0] - a[0]) * t),
        int(a[1] + (b[1] - a[1]) * t),
        int(a[2] + (b[2] - a[2]) * t),
    )


def style_phrase_for_tag(tag: str) -> str:
    mapping = {
        "HOT": "high-energy neon punch",
        "NEW": "futuristic polished glow",
        "POPULAR": "classic premium casino finish",
        "JACKPOT": "opulent gold-rich luxury",
    }
    return mapping.get(tag.upper(), "dark premium casino tone")


def style_phrase_for_template(template: str) -> str:
    mapping = {
        "grid": "dense cluster-grid framing",
        "scatter": "wide scatter-reel flow",
        "extended": "expanded reel-bank layout",
        "classic": "vintage three-reel proportions",
        "standard": "five-reel modern proportions",
    }
    return mapping.get(template.lower(), "modern slot layout")


def style_phrase_for_bonus(bonus_type: str) -> str:
    value = (bonus_type or "").lower()
    checks = (
        ("hold", "locked coin tension"),
        ("tumble", "cascading impact rhythm"),
        ("multiplier", "stacking multiplier drama"),
        ("scatter", "scatter-trigger anticipation"),
        ("respin", "respin surge momentum"),
        ("wild", "wild-symbol burst energy"),
        ("avalanche", "avalanche depth layering"),
        ("money", "cash-collect intensity"),
        ("wheel", "wheel-bonus spotlight"),
    )
    for key, phrase in checks:
        if key in value:
            return phrase
    return "feature-driven slot atmosphere"


def build_style_profile(game_id: str, metadata: dict | None, style_mode: str) -> dict:
    seed = stable_hash(game_id)
    tag = str((metadata or {}).get("tag") or "").upper()
    template = str((metadata or {}).get("template") or "standard").lower()
    accent = parse_hex_color((metadata or {}).get("accentColor"))
    if accent is None:
        accent = ((seed >> 16) & 0xFF, (seed >> 8) & 0xFF, seed & 0xFF)
        accent = mix_rgb(accent, (180, 140, 220), 0.4)

    base = {
        "mode": style_mode,
        "tag": tag,
        "template": template,
        "tagPhrase": style_phrase_for_tag(tag),
        "templatePhrase": style_phrase_for_template(template),
        "bonusPhrase": style_phrase_for_bonus(str((metadata or {}).get("bonusType") or "")),
    }

    if style_mode == "balanced":
        tone = {"blur": 4.2, "color": 1.32, "contrast": 1.2, "brightness": 0.82, "edge_alpha": 140, "streak_alpha": 14}
    else:
        tone = {"blur": 4.8, "color": 1.5, "contrast": 1.36, "brightness": 0.76, "edge_alpha": 170, "streak_alpha": 24}

    # Tag- and template-specific accents to avoid standardised look.
    if tag == "JACKPOT":
        accent = mix_rgb(accent, (255, 210, 85), 0.52)
    elif tag == "HOT":
        accent = mix_rgb(accent, (255, 72, 72), 0.24)
    elif tag == "NEW":
        accent = mix_rgb(accent, (102, 220, 255), 0.2)
    elif tag == "POPULAR":
        accent = mix_rgb(accent, (255, 180, 120), 0.15)

    if template == "classic":
        accent = mix_rgb(accent, (255, 235, 170), 0.22)
    elif template == "grid":
        accent = mix_rgb(accent, (115, 220, 255), 0.2)
    elif template == "extended":
        accent = mix_rgb(accent, (255, 130, 90), 0.12)

    highlight = mix_rgb(accent, (255, 255, 255), 0.3)
    shadow_tint = mix_rgb(accent, (6, 8, 14), 0.7)

    return {
        **base,
        **tone,
        "accentRgb": accent,
        "accentHex": rgb_to_hex(accent),
        "highlightRgb": highlight,
        "shadowTintRgb": shadow_tint,
    }


def themed_prompt(game_id: str, metadata: dict | None, style_profile: dict) -> str:
    words = game_words(game_id)
    name = (metadata or {}).get("name") or words.title()
    provider = (metadata or {}).get("provider") or "Royal Games"
    symbols = (metadata or {}).get("symbols") or []
    motif = str(symbols[0]).replace("_", " ") if symbols else words
    return (
        f"{name} slot UI chrome strip, {provider}, {style_profile['tagPhrase']}, "
        f"{style_profile['templatePhrase']}, {style_profile['bonusPhrase']}, "
        f"{motif} motif, accent {style_profile['accentHex']}, embossed metallic trim, luminous edge rails, "
        "high contrast, no text, no logo"
    )


def themed_negative_prompt() -> str:
    return (
        "text, typography, letters, numbers, logo, watermark, signature, people, face, blurry, low quality, artifacts"
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


def apply_tone(base: Image.Image, style_profile: dict) -> Image.Image:
    toned = base.filter(ImageFilter.GaussianBlur(radius=float(style_profile.get("blur", 4.5))))
    toned = ImageEnhance.Color(toned).enhance(float(style_profile.get("color", 1.35)))
    toned = ImageEnhance.Contrast(toned).enhance(float(style_profile.get("contrast", 1.24)))
    toned = ImageEnhance.Brightness(toned).enhance(float(style_profile.get("brightness", 0.8)))
    return toned


def paint_overlays(img: Image.Image, seed: int, style_profile: dict) -> Image.Image:
    rgba = img.convert("RGBA")
    w, h = rgba.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    accent = style_profile.get("accentRgb", (200, 160, 220))
    highlight = style_profile.get("highlightRgb", (230, 220, 245))
    shadow_tint = style_profile.get("shadowTintRgb", (8, 10, 16))
    edge_alpha = int(style_profile.get("edge_alpha", 148))
    streak_alpha = int(style_profile.get("streak_alpha", 16))

    # Edge darkening to keep controls readable in all themes.
    for y in range(h):
        edge_dist = min(y, h - 1 - y) / (h / 2)
        edge_strength = max(0.0, 1.0 - edge_dist)
        alpha = int(edge_alpha * (edge_strength ** 1.22))
        draw.line([(0, y), (w, y)], fill=(shadow_tint[0], shadow_tint[1], shadow_tint[2], alpha))

    # Deterministic metallic streaks per game.
    streak_count = 8 + (seed % 9)
    for i in range(streak_count):
        x = int((i + 0.5) * w / streak_count)
        wobble = ((seed >> (i % 16)) & 0xF) - 8
        x2 = max(0, min(w - 1, x + wobble * 6))
        color_mix = mix_rgb(highlight, accent, ((i + seed) % 5) / 8)
        draw.line([(x, 0), (x2, h)], fill=(color_mix[0], color_mix[1], color_mix[2], streak_alpha), width=2)

    # Highlight rails.
    rail_top = (*mix_rgb(highlight, accent, 0.35), 104)
    rail_bottom = (*mix_rgb(highlight, accent, 0.62), 96)
    draw.rectangle((0, 0, w, 6), fill=rail_top)
    draw.rectangle((0, h - 7, w, h), fill=rail_bottom)

    composed = Image.alpha_composite(rgba, overlay)
    alpha_mask = Image.new("L", (w, h), 210)
    composed.putalpha(alpha_mask)
    return composed


def build_chrome_pillow(game_id: str, source: Path, out_path: Path, style_profile: dict) -> None:
    with Image.open(source) as im:
        base = center_crop_to_aspect(im.convert("RGB"), *TARGET_SIZE).resize(TARGET_SIZE, Image.Resampling.LANCZOS)
    result = paint_overlays(apply_tone(base, style_profile), stable_hash(game_id), style_profile)
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
    prompt: str,
    style_profile: dict,
) -> None:
    with Image.open(source) as im:
        parent = center_crop_to_aspect(im.convert("RGB"), *MODEL_IMAGE_SIZE).resize(
            MODEL_IMAGE_SIZE, Image.Resampling.LANCZOS
        )

    seed = stable_hash(game_id) ^ seed_base
    generator = torch_mod.Generator(device=device).manual_seed(seed)
    image = pipe(
        prompt=prompt,
        negative_prompt=themed_negative_prompt(),
        image=parent,
        strength=strength,
        num_inference_steps=steps,
        guidance_scale=guidance,
        generator=generator,
    ).images[0]

    fitted = center_crop_to_aspect(image.convert("RGB"), *TARGET_SIZE).resize(TARGET_SIZE, Image.Resampling.LANCZOS)
    result = paint_overlays(apply_tone(fitted, style_profile), stable_hash(game_id), style_profile)
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
    parser.add_argument("--style-mode", choices=["contrast", "balanced"], default="contrast")
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
        style_profile = build_style_profile(game_id, metadata, args.style_mode)
        prompt = themed_prompt(game_id, metadata, style_profile)
        seed = stable_hash(game_id) ^ args.seed_base
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
            "styleProfile": {
                "mode": style_profile["mode"],
                "tagPhrase": style_profile["tagPhrase"],
                "templatePhrase": style_profile["templatePhrase"],
                "bonusPhrase": style_profile["bonusPhrase"],
                "accentHex": style_profile["accentHex"],
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
                    prompt=prompt,
                    style_profile=style_profile,
                )
            else:
                build_chrome_pillow(game_id, bg_path, out_path, style_profile)
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
                "styleMode": args.style_mode,
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
