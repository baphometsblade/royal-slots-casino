#!/usr/bin/env python3
"""
SDXL Turbo Symbol Generator ? Royal Slots Casino
Generates 480 HD PNG symbols (256?256, transparent bg) for all 80 games
using stabilityai/sdxl-turbo on local GPU.

Usage:
    python generate_sdxl_symbols.py [--game GAME_ID] [--force]

    --game GAME_ID   Only regenerate symbols for one game
    --force          Overwrite existing files (default: skip)
"""

import os, sys, time, re, json, argparse
import torch
from PIL import Image
from diffusers import AutoPipelineForText2Image
import rembg

# ??? CONFIG ??????????????????????????????????????????????????????????????????
MODEL_ID   = "stabilityai/sdxl-turbo"
OUT_DIR    = "assets/game_symbols"
IMG_SIZE   = 256        # Final symbol size in pixels
GEN_SIZE   = 512        # Generation resolution (SDXL Turbo native)
STEPS      = 4          # SDXL Turbo = 1-4 steps
GUIDANCE   = 0.0        # SDXL Turbo uses CFG=0
SEED       = 42
DEVICE     = "cuda"
DTYPE      = torch.float16

# ??? GAME DEFINITIONS (mirrored from shared/game-definitions.js) ??????????????
# Each entry: (game_id, chrome_style, symbols[])
# Parsed dynamically from the JS file below.

# ??? CHROME STYLE -> VISUAL THEME DESCRIPTOR ??????????????????????????????????
CHROME_THEME = {
    "candy":    "bright pastel candy colors, sugary cute cartoon style, colorful sweet",
    "olympus":  "ornate ancient Greek gold, divine lightning glow, Olympian mythology",
    "wild":     "earthy bronze copper stone, wildlife nature, rugged textured",
    "egyptian": "gilded gold sand Egyptian, hieroglyphic ancient, desert mystical",
    "neon":     "electric neon cyberpunk, laser glow, sci-fi holographic, vibrant",
    "western":  "vintage sepia brass rustic, old west engraved, saloon western",
    "oriental": "red lacquer gold Chinese, intricate filigree, traditional Asian art",
    "joker":    "shiny chrome metallic, retro casino, classic gambling, bright jewel",
    "dark":     "gothic dark purple crimson, vampire sinister, dark fantasy shadow glow",
    "fishing":  "ocean teal wood nautical, fishing lake, watercolor nature",
}

# ??? SYMBOL NAME -> HUMAN DESCRIPTION OVERRIDES ???????????????????????????????
# For symbols whose auto-parsed names need better descriptions
SYMBOL_OVERRIDES = {
    # Candy / Sugar games
    "s1_lollipop":       "colorful swirling lollipop on a stick",
    "s2_gummy_bear":     "translucent gummy bear candy",
    "s3_candy_cane":     "red and white striped candy cane",
    "s4_cupcake":        "frosted cupcake with sprinkles",
    "s5_diamond_candy":  "sparkling diamond-shaped hard candy gem",
    "wild_sugar":        "golden WILD sugar rush emblem with sparkles",
    # Olympus
    "s1_chalice":        "ornate golden chalice goblet",
    "s2_ring":           "jeweled golden ring with sapphire",
    "s3_hourglass":      "golden hourglass with glowing sand",
    "s4_crown":          "jeweled golden crown",
    "s5_lightning":      "crackling divine lightning bolt",
    "wild_zeus":         "golden WILD Zeus thunder emblem",
    # Wolf Gold / Wild chrome
    "s1_wolf":           "howling wolf head portrait",
    "s2_eagle":          "majestic eagle with spread wings",
    "s3_bison":          "powerful bison bull head",
    "s4_horseshoe":      "lucky golden horseshoe",
    "s5_wolf_moon":      "wolf howling at full moon",
    "wild_wolf":         "golden WILD wolf paw print",
    # Book of Dead / Egyptian
    "s1_anubis":         "golden Anubis jackal head god",
    "s2_ankh":           "golden Egyptian ankh cross",
    "s3_scarab":         "golden scarab beetle amulet",
    "s4_eye":            "Eye of Horus mystical symbol",
    "s5_book":           "glowing ancient Egyptian book of spells",
    "wild_book":         "golden glowing Book of Dead WILD",
    # Neon / Starburst
    "s1_gem_red":        "brilliant faceted red ruby gem",
    "s2_gem_blue":       "brilliant faceted blue sapphire gem",
    "s3_gem_green":      "brilliant faceted emerald green gem",
    "s4_gem_yellow":     "brilliant faceted yellow topaz gem",
    "s5_gem_purple":     "brilliant faceted purple amethyst gem",
    "wild_star":         "neon starburst star WILD symbol",
    # Western
    "s1_revolver":       "vintage six-shooter revolver gun",
    "s2_skull":          "gothic skull with crossbones",
    "s3_star_badge":     "sheriffs star badge",
    "s4_noose":          "western outlaw noose rope",
    "s5_wanted_poster":  "wanted dead or alive poster",
    "wild_bullet":       "golden WILD bullet emblem",
    # Oriental
    "s1_dragon":         "golden oriental dragon head",
    "s2_lotus":          "glowing red lotus flower",
    "s3_lantern":        "traditional red Chinese lantern",
    "s4_coin":           "ancient Chinese gold coin with square hole",
    "s5_jade":           "carved jade dragon medallion",
    "wild_dragon":       "golden WILD fire dragon WILD symbol",
    # Joker / Classic
    "s1_cherry":         "shiny twin red cherries on a stem",
    "s2_lemon":          "bright yellow lemon fruit",
    "s3_plum":           "purple plum fruit",
    "s4_star":           "golden five-pointed star",
    "s5_seven":          "lucky red 7 seven number",
    "wild_joker":        "golden WILD joker playing card with jester hat",
    "s3_bar":            "classic BAR slot symbol gold",
    "s3_bell":           "golden liberty bell",
    # Dark / Gothic
    "s1_bat":            "gothic vampire bat with spread wings",
    "s2_rose":           "blood red rose with thorns",
    "s3_coffin":         "ornate gothic vampire coffin",
    "s4_moon":           "crescent blood moon with mist",
    "s5_vampire":        "vampire with cape portrait",
    "wild_blood":        "golden WILD blood drop emblem",
    # Fishing
    "s1_hook":           "shiny chrome fishing hook with red bait",
    "s2_float":          "red and white fishing float bobber",
    "s3_tackle":         "fishing tackle lure with hooks",
    "s4_fish":           "jumping largemouth bass fish",
    "s5_treasure":       "sunken treasure chest with gold coins",
    "wild_bass":         "golden WILD bass fish WILD symbol",
    # Big Bamboo / Oriental
    "s1_frog":           "green jade frog figurine",
    "s2_bamboo":         "green bamboo stalks cluster",
    "s3_panda":          "cute panda bear face",
    "s4_temple":         "golden Asian temple pagoda",
    "s5_lotus_gold":     "golden lotus blossom",
    "wild_bamboo":       "golden WILD bamboo WILD symbol",
    # Buffalo / Wild
    "s1_axe":            "stone axe viking weapon",
    "s2_horn":           "ram horn Viking drinking horn",
    "s3_beer":           "foamy Viking mead ale tankard",
    "s4_helmet":         "Viking horned battle helmet",
    "s5_shield_gem":     "round Viking shield with gemstone",
    "wild_rune":         "golden WILD runic Viking emblem",
}

# ??? CHROME STYLE LOOKUP (must match shared/chrome-styles.js) ????????????????
GAME_CHROME = {
    'sugar_rush':'candy','lucky_777':'candy','starlight_princess':'candy',
    'jammin_fruits':'candy','sweet_bonanza':'candy','fruit_party':'candy',
    'extra_chilli':'candy','dog_house_mega':'candy','puppy_palace':'candy',
    'fat_rabbit':'candy','esqueleto_fiesta':'candy',
    'gates_olympus':'olympus','olympus_rising':'olympus','olympian_gods':'olympus',
    'golden_fortune':'olympus','ares_blade':'olympus','crown_fire':'olympus',
    'olympus_dream':'olympus','pots_olympus':'olympus','power_crown':'olympus',
    'merlin_power':'olympus',
    'wolf_gold':'wild','buffalo_stampede':'wild','great_rhino':'wild',
    'chilli_heat':'wild','wild_toro':'wild','mega_safari':'wild',
    'goldstorm_ultra':'wild','gemhalla':'wild','loki_loot':'wild',
    'buffalo_extreme':'wild','buffalo_mega':'wild','viking_voyage':'wild',
    'island_tiki':'wild',
    'book_dead':'egyptian','gonzos_quest':'egyptian','pharaoh_legacy':'egyptian',
    'starburst_xxl':'neon','quantum_burst':'neon','twin_helix':'neon',
    'neon_nights':'neon','diamond_vault':'neon','nitro_street':'neon',
    'chaos_crew':'neon','snoop_dollars':'neon','reactoonz':'neon',
    'gems_bonanza':'neon','mental_meltdown':'neon',
    'black_bull':'western','tombstone_reload':'western','san_quentin':'western',
    'wanted_dead':'western','dead_alive':'western','wildfire_gold':'western',
    'money_train':'western','fire_hole':'western',
    'lucky_dragon':'oriental','dragon_megafire':'oriental','five_lions':'oriental',
    'big_bamboo':'oriental','gold_rush_frog':'oriental','coin_volcano':'oriental',
    'sakura_princess':'oriental',
    'hot_chillies':'joker','fire_joker':'joker','mega_joker':'joker',
    'coin_strike':'joker','lucha_mania':'joker','elvis_frog':'joker',
    'super_hot':'joker',
    'crimson_fang':'dark','madame_destiny':'dark','immortal_blood':'dark',
    'le_bandit':'dark','tome_madness':'dark','eternal_romance':'dark',
    'pirate_fortune':'dark',
    'big_bass':'fishing','bass_splash':'fishing','razor_shark':'fishing',
}

# ??? QUALITY PROMPTS PER CHROME STYLE ????????????????????????????????????????
STYLE_PROMPT = {
    "candy":   "vibrant pastel candy colors, glossy plastic, smooth shiny surface, cheerful cute",
    "olympus": "polished 24k gold, divine glow, ancient Greek marble, ornate engraving, godly aura",
    "wild":    "textured natural stone bronze, wildlife earthy tones, rugged metallic copper",
    "egyptian": "hammered gold leafing, sand patina, lapis lazuli, ancient hieroglyphic carvings",
    "neon":    "electric neon glow, holographic shimmer, cyberpunk laser light, vivid fluorescent",
    "western": "aged brass patina, hand-engraved metal, sepia wood grain, old west leather tooled",
    "oriental": "lacquered vermilion red, gold filigree, jade inlay, silk texture, imperial splendor",
    "joker":   "chrome mirror finish, polished steel, bright casino lights, gem inset, metallic gleam",
    "dark":    "obsidian black, deep crimson, purple spectral glow, gothic stone, shadow mist",
    "fishing": "ocean teal, weathered dock wood, nautical rope texture, water shimmer, sea-glass",
}

NEGATIVE_PROMPT = (
    "blurry, text, letters, words, watermark, signature, border, frame, box, "
    "background scene, landscape, interior, people, human, multiple objects, "
    "cluttered, low quality, bad art, ugly, deformed, distorted, dark gloomy overall, "
    "oversaturated, grain, noise, jpeg artifacts, duplicate"
)


def parse_symbol_description(symbol_name: str) -> str:
    """Convert symbol_name like 's1_lollipop' or 'wild_zeus' to a description string."""
    if symbol_name in SYMBOL_OVERRIDES:
        return SYMBOL_OVERRIDES[symbol_name]
    # Strip prefix (s1_, s2_, ... wild_)
    parts = symbol_name.split("_")
    if parts[0] in {"s1","s2","s3","s4","s5","s6","wild","scatter","bonus"}:
        parts = parts[1:]
    desc = " ".join(parts).replace("_", " ")
    if symbol_name.startswith("wild_"):
        desc = f"golden glowing WILD {desc} symbol"
    elif symbol_name.startswith("scatter"):
        desc = f"scatter bonus {desc} symbol"
    return desc


def build_prompt(symbol_name: str, chrome: str) -> str:
    obj = parse_symbol_description(symbol_name)
    style = STYLE_PROMPT.get(chrome, STYLE_PROMPT["joker"])
    theme = CHROME_THEME.get(chrome, "")
    return (
        f"{obj}, casino slot machine game icon, {style}, {theme}, "
        f"isolated on black background, centered composition, transparent bg, "
        f"no background, high detail, sharp edges, 3D render, 4k, masterpiece"
    )


def load_pipeline():
    print(f"Loading SDXL Turbo from HuggingFace cache...")
    pipe = AutoPipelineForText2Image.from_pretrained(
        MODEL_ID,
        torch_dtype=DTYPE,
        variant="fp16",
        use_safetensors=True,
    )
    pipe = pipe.to(DEVICE)
    pipe.enable_vae_slicing()
    # Disable safety checker for game art (no NSFW content anyway)
    pipe.safety_checker = None
    print(f"Pipeline loaded. Device: {DEVICE}")
    return pipe


def generate_symbol(pipe, prompt: str, seed: int = SEED) -> Image.Image:
    generator = torch.Generator(device=DEVICE).manual_seed(seed)
    result = pipe(
        prompt=prompt,
        negative_prompt=NEGATIVE_PROMPT,
        num_inference_steps=STEPS,
        guidance_scale=GUIDANCE,
        width=GEN_SIZE,
        height=GEN_SIZE,
        generator=generator,
    )
    return result.images[0]


def remove_background(img: Image.Image) -> Image.Image:
    """Use rembg to remove background, then ensure RGBA transparent bg."""
    # rembg works on PIL images
    result = rembg.remove(img)
    return result


def save_symbol(img: Image.Image, path: str):
    # Ensure directory exists
    os.makedirs(os.path.dirname(path), exist_ok=True)
    # Resize to final size
    img_resized = img.resize((IMG_SIZE, IMG_SIZE), Image.LANCZOS)
    img_resized.save(path, "PNG", optimize=True)


def load_game_definitions():
    """Parse game definitions from shared/game-definitions.js"""
    js_path = "shared/game-definitions.js"
    with open(js_path, "r", encoding="utf-8") as f:
        src = f.read()

    # Extract the array
    match = re.search(r'const games\s*=\s*(\[[\s\S]*?\]);', src)
    if not match:
        raise RuntimeError("Could not parse games array from game-definitions.js")

    # Safely eval just the array
    import ast
    # Convert JS object notation to Python-compatible
    arr_text = match.group(1)
    # Remove JS comments
    arr_text = re.sub(r'//[^\n]*', '', arr_text)
    arr_text = re.sub(r'/\*[\s\S]*?\*/', '', arr_text)
    # Replace JS backslash-continuation
    arr_text = arr_text.replace('\\ ', '')
    # Use json approach: eval in JS context via node, or just parse manually
    # We'll use a regex to extract game IDs and symbol arrays

    games = []
    game_blocks = re.findall(
        r'\{\s*id:\s*[\'"]([^\'"]+)[\'"][\s\S]*?symbols:\s*\[([^\]]+)\]',
        arr_text
    )
    for game_id, syms_raw in game_blocks:
        syms = re.findall(r"['\"]([^'\"]+)['\"]", syms_raw)
        games.append({"id": game_id, "symbols": syms})

    print(f"Loaded {len(games)} games with symbols")
    return games


def main():
    parser = argparse.ArgumentParser(description="Generate SDXL slot symbols")
    parser.add_argument("--game", default=None, help="Only generate for this game ID")
    parser.add_argument("--force", action="store_true", help="Overwrite existing files")
    parser.add_argument("--dry-run", action="store_true", help="Print prompts only, no generation")
    parser.add_argument("--seed-offset", type=int, default=0, help="Add offset to seed per symbol")
    args = parser.parse_args()

    # Load game definitions
    games = load_game_definitions()
    if args.game:
        games = [g for g in games if g["id"] == args.game]
        if not games:
            print(f"Error: game '{args.game}' not found")
            sys.exit(1)

    # Build work list
    work = []
    for game in games:
        game_id = game["id"]
        chrome = GAME_CHROME.get(game_id, "joker")
        for i, sym in enumerate(game["symbols"]):
            out_path = os.path.join(OUT_DIR, game_id, f"{sym}.png")
            if not args.force and os.path.exists(out_path):
                # Check if it's an SDXL file (>10KB) or placeholder (<10KB)
                if os.path.getsize(out_path) > 10_000:
                    continue  # Already have real SDXL asset
            prompt = build_prompt(sym, chrome)
            seed = SEED + args.seed_offset + i * 7 + abs(hash(game_id)) % 1000
            work.append((game_id, sym, prompt, out_path, seed))

    print(f"\n{'='*60}")
    print(f"SDXL Symbol Generator ? {len(work)} symbols to generate")
    print(f"Model: {MODEL_ID} | Size: {GEN_SIZE}->{IMG_SIZE}px | Steps: {STEPS}")
    print(f"{'='*60}\n")

    if args.dry_run:
        for game_id, sym, prompt, out_path, seed in work[:20]:
            print(f"[{game_id}] {sym}")
            print(f"  Prompt: {prompt[:100]}...")
            print()
        print(f"... ({len(work)} total, showing first 20)")
        return

    # Load model
    pipe = load_pipeline()

    # Initialize rembg session once
    rembg_session = rembg.new_session("u2net")

    # Generate
    start = time.time()
    succeeded = 0
    failed = 0

    for idx, (game_id, sym, prompt, out_path, seed) in enumerate(work):
        elapsed = time.time() - start
        eta_s = (elapsed / max(idx, 1)) * (len(work) - idx)
        eta_m = eta_s / 60
        print(f"[{idx+1}/{len(work)}] {game_id}/{sym} "
              f"| elapsed {elapsed:.0f}s | ETA ~{eta_m:.1f}m")
        print(f"  -> {prompt[:90]}...")

        try:
            # Generate
            img = generate_symbol(pipe, prompt, seed=seed)

            # Remove background
            img_rgba = remove_background(img)

            # Add slight inner glow to make symbol pop on dark slot background
            # (Composite onto a dark surface to check, then save as RGBA)

            # Save
            save_symbol(img_rgba, out_path)
            succeeded += 1

            # Show progress every 10
            if (idx + 1) % 10 == 0:
                rate = (idx + 1) / elapsed
                print(f"\n  OK {succeeded} done, {failed} failed | "
                      f"{rate:.1f} img/s | ~{(len(work)-idx-1)/rate:.0f}s remaining\n")

        except Exception as e:
            print(f"  ERR ERROR: {e}")
            failed += 1
            continue

    total_time = time.time() - start
    print(f"\n{'='*60}")
    print(f"Complete! {succeeded} generated, {failed} failed")
    print(f"Total time: {total_time/60:.1f} minutes ({total_time/succeeded:.1f}s per image)")
    print(f"Output: {os.path.abspath(OUT_DIR)}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
