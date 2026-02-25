#!/usr/bin/env python3
"""
regen_programmatic_sdxl.py
Regenerates HD SDXL symbols for the 41 games whose current assets are
programmatically generated (detected by avg file size < 25KB per symbol).

Loads the SDXL pipeline ONCE and processes all games in a single pass.
Backs up each old symbol to <name>_prog_bak.png before overwriting.

Usage:
    py -3.10 scripts/regen_programmatic_sdxl.py [--dry-run] [--no-backup]
"""

import os, sys, time, argparse
from pathlib import Path

# ── Add project root to path so we can import from generate_sdxl_symbols ──────
SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))

from generate_sdxl_symbols import (
    load_game_definitions,
    load_pipeline,
    build_prompt,
    generate_symbol,
    remove_background,
    save_symbol,
    GAME_CHROME,
    OUT_DIR,
    SEED,
)
import rembg

# ── The 41 games with programmatic assets (avg file size < 25KB) ───────────────
PROGRAMMATIC_GAMES = [
    "arctic_foxes", "aztec_ascent", "celestial_bazaar", "comet_rush",
    "crystal_chambers", "crystal_shrine", "crystal_veil", "demon_chambers",
    "diamond_falls", "dragon_coins", "dragon_tumble", "fortune_bazaar",
    "golden_cascade", "golden_jaguar", "golden_pharaoh", "golden_vault",
    "iron_stampede", "jade_temple", "koi_ascension", "lightning_pearl",
    "mammoth_riches", "midnight_drifter", "midnight_oasis", "mine_coins",
    "mirror_palace", "mystic_cauldron", "neptune_storm", "norse_vaults",
    "pharaoh_collect", "pharaoh_march", "primal_vault", "samurai_blade",
    "thunder_jackpot", "thunder_reel", "titan_forge", "twin_dragons",
    "vault_coins", "wild_deep", "wild_safari", "wild_west_rush", "wolf_rise",
]


def main():
    parser = argparse.ArgumentParser(description="Regen programmatic symbols with SDXL")
    parser.add_argument("--dry-run", action="store_true", help="Print plan only, no generation")
    parser.add_argument("--no-backup", action="store_true", help="Skip backup of old files")
    parser.add_argument("--resume-from", default=None, help="Skip games before this ID")
    args = parser.parse_args()

    # Load all game definitions
    all_games = load_game_definitions()
    game_map = {g["id"]: g for g in all_games}

    # Build work list
    work = []  # (game_id, sym, prompt, out_path, seed)
    for gid in PROGRAMMATIC_GAMES:
        game = game_map.get(gid)
        if not game:
            print(f"WARN: game '{gid}' not found in definitions, skipping")
            continue
        chrome = GAME_CHROME.get(gid, "joker")
        for i, sym in enumerate(game["symbols"]):
            out_path = os.path.join(OUT_DIR, gid, f"{sym}.png")
            prompt = build_prompt(sym, chrome)
            seed = SEED + i * 7 + abs(hash(gid)) % 1000
            work.append((gid, sym, prompt, out_path, seed))

    print(f"\n{'='*60}")
    print(f"SDXL Batch Regen — {len(PROGRAMMATIC_GAMES)} games, {len(work)} symbols")
    print(f"Model: stabilityai/sdxl-turbo | Steps: 4 | CUDA")
    print(f"{'='*60}\n")

    if args.dry_run:
        for gid, sym, prompt, out_path, seed in work[:25]:
            size_kb = os.path.getsize(out_path) // 1024 if os.path.exists(out_path) else 0
            print(f"[{gid}] {sym} (current: {size_kb}KB)")
            print(f"  -> {prompt[:90]}...")
        print(f"\n... ({len(work)} total, first 25 shown)")
        return

    # Apply --resume-from filter
    if args.resume_from:
        start_idx = next((i for i, (gid, *_) in enumerate(work) if gid == args.resume_from), 0)
        work = work[start_idx:]
        print(f"Resuming from '{args.resume_from}' — {len(work)} symbols remaining\n")

    # Load pipeline once
    print("Loading SDXL Turbo pipeline...")
    pipe = load_pipeline()
    rembg_session = rembg.new_session("u2net")
    print("Pipeline ready.\n")

    start = time.time()
    succeeded = 0
    failed = 0
    last_game = None

    for idx, (gid, sym, prompt, out_path, seed) in enumerate(work):
        elapsed = time.time() - start
        rate = (idx + 1) / max(elapsed, 1)
        eta_s = (len(work) - idx) / max(rate, 0.01)

        if gid != last_game:
            print(f"\n-- {gid} --")
            last_game = gid

        print(f"  [{idx+1}/{len(work)}] {sym}  ETA ~{eta_s/60:.1f}m")

        try:
            # Backup old file
            if not args.no_backup and os.path.exists(out_path):
                bak_path = out_path.replace(".png", "_prog_bak.png")
                os.replace(out_path, bak_path)

            # Ensure output directory exists
            os.makedirs(os.path.dirname(out_path), exist_ok=True)

            # Generate
            img = generate_symbol(pipe, prompt, seed=seed)
            img_rgba = remove_background(img)
            save_symbol(img_rgba, out_path)

            new_size = os.path.getsize(out_path)
            print(f"    OK  {new_size//1024}KB saved")
            succeeded += 1

        except Exception as e:
            print(f"    ERR {e}")
            # Restore backup on failure
            bak_path = out_path.replace(".png", "_prog_bak.png")
            if os.path.exists(bak_path) and not os.path.exists(out_path):
                os.replace(bak_path, out_path)
            failed += 1

    total = time.time() - start
    print(f"\n{'='*60}")
    print(f"Done! {succeeded} generated, {failed} failed")
    print(f"Time: {total/60:.1f} min  ({total/max(succeeded,1):.1f}s/img)")
    print(f"{'='*60}")

    # Clean up backups on full success
    if failed == 0 and not args.no_backup:
        print("\nCleaning up backup files...")
        cleaned = 0
        for gid in PROGRAMMATIC_GAMES:
            folder = Path(OUT_DIR) / gid
            for bak in folder.glob("*_prog_bak.png"):
                bak.unlink()
                cleaned += 1
        print(f"Removed {cleaned} backup files.")


if __name__ == "__main__":
    main()
