"""
SDXL Turbo Asset Generator for Royal Slots Casino
Generates slot symbols (256x256) and thumbnails (512x680) for all 60 games.

Usage:
  python generate_assets.py --mode all          # Generate everything
  python generate_assets.py --mode symbols      # Only symbols
  python generate_assets.py --mode thumbs       # Only thumbnails
  python generate_assets.py --mode all --game sugar_rush   # Single game
  python generate_assets.py --mode all --resume # Skip existing files

Requirements:
  pip install diffusers torch accelerate pillow
  Model: stabilityai/sdxl-turbo (cached locally)
"""

import argparse
import os
import sys
from pathlib import Path

import torch
from diffusers import AutoPipelineForText2Image
from PIL import Image

# ─── Paths ────────────────────────────────────────────────────────────────────
CASINO_DIR = Path(__file__).parent.parent
SYMBOLS_DIR = CASINO_DIR / "assets" / "game_symbols"
THUMBS_DIR  = CASINO_DIR / "assets" / "thumbnails"

# ─── SDXL Turbo pipeline (shared, loaded once) ────────────────────────────────
pipe = None

def load_pipeline():
    global pipe
    if pipe is not None:
        return pipe
    print("Loading SDXL Turbo pipeline...")
    pipe = AutoPipelineForText2Image.from_pretrained(
        "stabilityai/sdxl-turbo",
        torch_dtype=torch.float16,
        variant="fp16",
    )
    pipe.to("cuda")
    pipe.set_progress_bar_config(disable=True)
    print("Pipeline loaded on CUDA.")
    return pipe


def generate(prompt: str, width: int, height: int, steps: int = 2) -> Image.Image:
    p = load_pipeline()
    result = p(
        prompt=prompt,
        num_inference_steps=steps,
        guidance_scale=0.0,
        width=width,
        height=height,
    )
    return result.images[0]


def save_image(img: Image.Image, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG")


# ─── Symbol prompts: game_id -> {filename: prompt} ───────────────────────────
# Each entry has exactly 6 keys matching the actual filenames on disk.
# Prompts produce a centred icon-like object on a themed coloured background.

SYMBOL_PROMPTS = {

    "sugar_rush": {
        "s1_lollipop":    "candy lollipop swirl, pink and white striped, cartoon icon, shiny gloss, pastel background, centered object",
        "s2_gummy_bear":  "translucent gummy bear candy, bright red, cartoon icon, sweet candy land style, pastel background, centered",
        "s3_candy_cane":  "candy cane striped red white, curved, shiny, cartoon slot icon, pink background, centered object",
        "s4_cupcake":     "colorful cupcake with frosting and sprinkles, cartoon icon, sugar rush style, pastel pink background, centered",
        "s5_diamond_candy": "diamond shaped candy gem, rainbow sparkle, crystalline, cartoon slot icon, pastel background, centered",
        "wild_sugar":     "WILD text on rainbow candy explosion, glowing neon letters, sugar rush slot wild symbol, centered, black background",
    },

    "lucky_777": {
        "s1_banana":    "golden banana fruit, cartoon icon, bright yellow, shiny, classic slot machine style, green background, centered",
        "s2_grape":     "purple grape cluster, shiny, cartoon icon, classic fruit slot style, dark green background, centered",
        "s3_apple":     "red apple fruit shiny, cartoon icon, classic slot machine fruit symbol, white background, centered",
        "s4_watermelon": "watermelon slice, green rind red flesh, cartoon icon, bright slot machine fruit, white background, centered",
        "s5_heart_gem": "heart shaped gem glowing red, sparkling facets, cartoon slot icon, dark background, centered",
        "wild_bonanza": "WILD golden text with shining star bursts, classic slot style, black background, golden glow, centered",
    },

    "gates_olympus": {
        "s1_chalice":    "golden ornate chalice goblet, ancient Greek style, glowing gems, slot icon, dark purple background, centered",
        "s2_ring":       "gold ring with blue sapphire gemstone, ornate, ancient Greek style, slot icon, dark purple background, centered",
        "s3_hourglass":  "ornate golden hourglass with glowing sand, ancient Greek style, magical, slot icon, dark background, centered",
        "s4_crown":      "golden jeweled crown, ornate ancient Greek style, glowing rubies, slot icon, dark purple background, centered",
        "s5_lightning":  "golden lightning bolt glowing electric blue, Zeus power, slot icon, dark stormy background, centered",
        "wild_zeus":     "Zeus face silhouette, golden beams, WILD text, lightning effects, dark purple background, slot wild symbol",
    },

    "black_bull": {
        "s1_horseshoe":  "golden horseshoe lucky charm, shiny metallic, rustic western style, slot icon, dark green background, centered",
        "s2_coins":      "stack of gold coins gleaming, western casino style, slot icon, dark background, centered",
        "s3_money_bag":  "brown money bag tied with gold rope, dollar sign, western style, slot icon, dark green background, centered",
        "s4_gold_bar":   "solid gold bar ingot shiny, engraved pattern, slot icon, dark background, centered",
        "s5_diamond":    "brilliant cut diamond gem sparkling, colorless facets, slot icon, dark background, centered",
        "wild_bull":     "fierce black bull head silhouette, glowing red eyes, WILD text, dark background, slot wild symbol",
    },

    "hot_chillies": {
        "s1_taco":       "colorful Mexican taco with toppings, cartoon icon, fiesta style, bright orange background, centered",
        "s2_maracas":    "colorful maracas pair, Mexican fiesta, cartoon icon, bright background, centered",
        "s3_sombrero":   "decorated Mexican sombrero hat, colorful embroidery, cartoon icon, warm background, centered",
        "s4_chilli":     "red hot chilli pepper glowing, cartoon icon, spicy heat aura, dark background, centered",
        "s5_hot_7":      "flaming number 7, fire effect, hot spicy style, slot icon, dark background, centered",
        "wild_chilli":   "explosion of chilli peppers with WILD text, fiesta colors, dark background, slot wild symbol",
    },

    "super_hot": {
        "s1_cherry":    "bright red cherry pair on stem, glossy classic fruit, slot machine icon, dark background, centered",
        "s2_lemon":     "bright yellow lemon fruit, classic slot style, glossy, dark background, centered",
        "s3_plum":      "dark purple plum fruit, glossy, classic slot machine style, dark background, centered",
        "s4_bell":      "golden slot machine bell, shiny metallic, classic retro style, dark background, centered",
        "s5_star":      "golden star shape with glow, classic slot machine style, dark background, centered",
        "wild_hot":     "WILD text on flame background, glowing hot style, classic retro slot, dark background, centered",
    },

    "wolf_gold": {
        "s1_feather":   "Native American eagle feather, colorful beads, detailed, slot icon, dark blue background, centered",
        "s2_paw":       "wolf paw print, golden metallic, Native American style, slot icon, dark background, centered",
        "s3_eagle":     "golden eagle head, Native American style, detailed feathers, slot icon, dark background, centered",
        "s4_totem":     "carved totem pole face, colorful Native American style, slot icon, dark background, centered",
        "s5_moon":      "full moon glowing over mountain silhouette, wolf howl style, slot icon, dark night background, centered",
        "wild_wolf":    "howling wolf silhouette in full moon glow, WILD text, Native American style, dark background, slot wild",
    },

    "big_bass": {
        "s1_hook":      "shiny fishing hook with lure, realistic cartoon, fishing style, slot icon, blue water background, centered",
        "s2_float":     "red and white fishing float bobber, shiny, cartoon style, slot icon, blue background, centered",
        "s3_tackle":    "fishing tackle box with lures, cartoon style, slot icon, blue background, centered",
        "s4_fish":      "large bass fish leaping, detailed scales, fishing cartoon, slot icon, blue water background, centered",
        "s5_treasure":  "treasure chest on lake bottom, glowing gold coins, fishing theme, slot icon, blue background, centered",
        "wild_bass":    "giant bass fish jumping with WILD text, fishing style, blue water background, slot wild symbol",
    },

    "fire_joker": {
        "s1_cherry":    "flaming red cherry pair, fire effects, classic slot style, dark background, centered",
        "s2_lemon":     "flaming yellow lemon, fire effects, classic slot style, dark background, centered",
        "s3_plum":      "flaming purple plum, fire effects, classic slot style, dark background, centered",
        "s4_star":      "burning golden star with flames, classic slot style, dark background, centered",
        "s5_seven":     "flaming number 7, fire aura, classic retro slot style, dark background, centered",
        "wild_joker":   "jester hat with fire effects WILD text, joker card style, dark background, slot wild symbol",
    },

    "book_dead": {
        "s1_ankh":      "golden Egyptian ankh cross, ornate, ancient Egypt style, slot icon, sandy beige background, centered",
        "s2_scarab":    "golden scarab beetle, Egyptian style, jeweled, slot icon, sandy background, centered",
        "s3_eye":       "Eye of Horus, golden Egyptian style, glowing, slot icon, dark sandy background, centered",
        "s4_pharaoh":   "golden pharaoh mask face, Egyptian style, slot icon, dark sandy background, centered",
        "s5_anubis":    "Anubis jackal head, golden Egyptian style, slot icon, dark sandy background, centered",
        "wild_book":    "ancient Egyptian book glowing gold, WILD text, mystical rays, dark background, slot wild symbol",
    },

    "starburst_xxl": {
        "s1_gem_red":    "red starburst gem with radiating light beams, space nebula style, slot icon, dark cosmic background, centered",
        "s2_gem_blue":   "blue starburst gem radiating light, cosmic space style, slot icon, dark background, centered",
        "s3_gem_green":  "green starburst gem glowing, cosmic style, slot icon, dark background, centered",
        "s4_gem_yellow": "yellow starburst gem bright glowing, cosmic style, slot icon, dark background, centered",
        "s5_gem_purple": "purple starburst gem sparkling, cosmic space style, slot icon, dark background, centered",
        "wild_star":     "rainbow starburst explosion WILD text, cosmic space, neon colors, dark background, slot wild symbol",
    },

    "gonzos_quest": {
        "s1_stone_face_green": "green Aztec stone face carving, geometric patterns, slot icon, jungle background, centered",
        "s2_stone_face_blue":  "blue Aztec stone face carving, ancient geometric, slot icon, jungle background, centered",
        "s3_stone_face_red":   "red Aztec stone face carving, ancient style, slot icon, jungle green background, centered",
        "s4_emerald":          "rough emerald gemstone green glowing, Aztec treasure, slot icon, dark background, centered",
        "s5_gold_mask":        "golden Aztec warrior mask ornate, detailed, slot icon, dark background, centered",
        "wild_gonzo":          "Gonzo conquistador character face, golden helmet, WILD text, Aztec style, slot wild symbol",
    },

    "starlight_princess": {
        "s1_crystal_heart":  "crystal heart gemstone sparkling pink, magical princess style, slot icon, purple background, centered",
        "s2_magic_wand":     "magic wand with star tip glowing, princess style, slot icon, purple background, centered",
        "s3_tiara":          "golden princess tiara with pink gems, ornate, slot icon, purple background, centered",
        "s4_moon_orb":       "glowing moon orb with stars, magical princess style, slot icon, dark purple background, centered",
        "s5_star_crystal":   "star shaped crystal gemstone glowing, magical, slot icon, dark purple background, centered",
        "wild_empress":      "magical princess empress face with star crown, WILD text, glowing, purple background, slot wild",
    },

    "olympus_rising": {
        "s1_trident":    "golden trident Poseidon, ancient Greek style, sea waves, slot icon, blue background, centered",
        "s2_shield":     "ornate Greek warrior shield, golden bronze, slot icon, dark background, centered",
        "s3_laurel":     "golden laurel wreath crown, ancient Greek style, slot icon, dark background, centered",
        "s4_thunderbolt": "golden thunderbolt lightning bolt, ancient Greek style, glowing, slot icon, dark background, centered",
        "s5_olympus_gem": "magical Olympus crystal gem, golden glowing, ancient Greek style, slot icon, dark background, centered",
        "wild_poseidon": "Poseidon face with trident, ocean waves, WILD text, ancient Greek style, dark blue background, slot wild",
    },

    "buffalo_stampede": {
        "s1_cactus":         "green cactus with flowers, American Southwest style, cartoon slot icon, orange desert background, centered",
        "s2_horseshoe_gold": "shiny gold horseshoe, western style, slot icon, orange background, centered",
        "s3_cowboy_hat":     "brown cowboy hat, western style, cartoon, slot icon, orange sunset background, centered",
        "s4_buffalo":        "buffalo bison head portrait, detailed, American West style, slot icon, orange background, centered",
        "s5_sunset_diamond": "diamond gem with sunset colors, American West style, glowing, slot icon, orange background, centered",
        "wild_stampede":     "buffalo stampede cloud of dust, WILD text, American West style, orange dust background, slot wild",
    },

    "puppy_palace": {
        "s1_bone":       "cartoon dog bone treat, white glossy, cute pet style, slot icon, light background, centered",
        "s2_collar":     "colorful dog collar with tag, cute pet style, cartoon, slot icon, light background, centered",
        "s3_paw_print":  "cute dog paw print, golden metallic, cartoon slot icon, light background, centered",
        "s4_puppy_face": "cute golden retriever puppy face, cartoon style, slot icon, light background, centered",
        "s5_golden_bowl": "golden food bowl with dog food, cute pet style, slot icon, light background, centered",
        "wild_puppy":    "playful puppy jumping with WILD text, cute cartoon style, colorful background, slot wild symbol",
    },

    "crimson_fang": {
        "s1_garlic":    "garlic bulb vampire repellent, cartoon horror style, dark background, centered slot icon",
        "s2_cross":     "silver crucifix cross glowing, vampire hunter style, dark red background, centered slot icon",
        "s3_bat":       "black bat silhouette with spread wings, vampire cartoon, dark background, centered slot icon",
        "s4_coffin":    "ornate black coffin, gothic style, dark red lining, slot icon, dark background, centered",
        "s5_vampire":   "vampire face with fangs, pale skin, dark red lips, gothic cartoon, slot icon, dark background, centered",
        "wild_fang":    "crimson vampire fangs dripping blood, WILD text, gothic horror style, dark red background, slot wild",
    },

    "pirate_fortune": {
        "s1_compass":   "old brass compass nautical, pirate treasure style, slot icon, blue sea background, centered",
        "s2_map":       "rolled treasure map with red X, pirate style, cartoon, slot icon, blue background, centered",
        "s3_cannon":    "old iron pirate cannon, detailed, slot icon, dark sea background, centered",
        "s4_parrot":    "colorful pirate parrot, bright feathers, cartoon, slot icon, blue background, centered",
        "s5_treasure":  "overflowing pirate treasure chest gold coins, slot icon, dark background, centered",
        "wild_pirate":  "pirate skull crossbones with WILD text, jolly roger style, dark sea background, slot wild",
    },

    "lucky_dragon": {
        "s1_jade":      "green jade pendant Chinese lucky charm, ornate, slot icon, red background, centered",
        "s2_lotus":     "pink lotus flower floating, Chinese style, slot icon, red background, centered",
        "s3_lantern":   "red Chinese paper lantern glowing, festive, slot icon, dark red background, centered",
        "s4_coin":      "golden Chinese coin with square hole, lucky, slot icon, red background, centered",
        "s5_pearl":     "magical dragon pearl glowing white blue, Chinese style, slot icon, dark red background, centered",
        "wild_dragon":  "golden Chinese dragon spiraling, WILD text, red and gold, festive background, slot wild symbol",
    },

    "pharaoh_legacy": {
        "s1_pyramid":   "golden Egyptian pyramid at sunset, ancient style, slot icon, sandy background, centered",
        "s2_papyrus":   "ancient Egyptian papyrus scroll, hieroglyphs, slot icon, sandy background, centered",
        "s3_cobra":     "golden Egyptian cobra snake rearing up, ornate, slot icon, sandy background, centered",
        "s4_isis":      "Isis goddess wings, Egyptian style, golden, slot icon, dark background, centered",
        "s5_sarcophagus": "golden Egyptian sarcophagus coffin, ornate face, slot icon, dark sandy background, centered",
        "wild_papyrus": "glowing papyrus scroll WILD text, Egyptian hieroglyphs, golden rays, dark background, slot wild",
    },

    "quantum_burst": {
        "s1_atom":      "glowing blue atom symbol, quantum physics style, neon, slot icon, dark space background, centered",
        "s2_circuit":   "glowing circuit board chip, neon blue, tech style, slot icon, dark background, centered",
        "s3_laser":     "neon laser beam cross, colorful, sci-fi style, slot icon, dark background, centered",
        "s4_crystal":   "quantum energy crystal glowing blue, sci-fi, slot icon, dark space background, centered",
        "s5_wormhole":  "colorful swirling wormhole portal, quantum physics style, slot icon, dark space background, centered",
        "wild_quantum": "quantum energy burst explosion WILD text, neon blue sci-fi, dark space background, slot wild",
    },

    "olympian_gods": {
        "s1_harp":      "golden Greek lyre harp, ancient style, slot icon, blue sky background, centered",
        "s2_owl":       "Athena owl golden, ancient Greek style, slot icon, dark background, centered",
        "s3_helmet":    "golden Greek warrior helmet, crested, slot icon, dark background, centered",
        "s4_amphora":   "ancient Greek amphora vase, red figure style, slot icon, dark background, centered",
        "s5_sword":     "golden Greek sword blade glowing, ancient style, slot icon, dark background, centered",
        "wild_olympian": "Mount Olympus with lightning bolts, WILD text, ancient Greek gods style, dark sky background, slot wild",
    },

    "twin_helix": {
        "s1_dna":       "glowing DNA double helix strand, blue green neon, sci-fi, slot icon, dark background, centered",
        "s2_flask":     "laboratory flask with glowing liquid, sci-fi style, slot icon, dark background, centered",
        "s3_crystal_vial": "crystal vial with glowing potion, colorful, sci-fi, slot icon, dark background, centered",
        "s4_microscope": "golden microscope, scientific style, slot icon, dark background, centered",
        "s5_genome":    "glowing genome sequence map, colorful, sci-fi style, slot icon, dark background, centered",
        "wild_helix":   "twin DNA helix strands intertwined WILD text, neon colors, dark background, slot wild symbol",
    },

    "golden_fortune": {
        "s1_fortune_cookie": "golden fortune cookie with glow, Chinese lucky style, slot icon, red background, centered",
        "s2_abacus":    "golden Chinese abacus, lucky fortune style, slot icon, red background, centered",
        "s3_money_frog": "golden three-legged money frog toad, Chinese lucky charm, slot icon, red background, centered",
        "s4_golden_fish": "golden koi fish leaping, Chinese lucky style, slot icon, red background, centered",
        "s5_golden_ingot": "golden yuanbao ingot Chinese treasure, luck style, slot icon, red background, centered",
        "wild_fortune": "golden Chinese dragon with WILD text, fortune coins, red and gold, slot wild symbol",
    },

    "island_tiki": {
        "s1_coconut":   "tropical coconut half with milk, island style, cartoon, slot icon, tropical green background, centered",
        "s2_hibiscus":  "bright pink hibiscus flower, tropical island style, cartoon, slot icon, tropical background, centered",
        "s3_puffer_fish": "yellow puffer fish inflated, tropical cartoon, slot icon, blue ocean background, centered",
        "s4_tiki_idol":  "wooden tiki idol face carving, Polynesian style, slot icon, tropical background, centered",
        "s5_volcanic_gem": "gem crystal in volcanic rock, glowing, island tiki style, slot icon, dark background, centered",
        "wild_tiki":    "giant tiki face idol with WILD text, Polynesian tropical style, dark background, slot wild",
    },

    "sakura_princess": {
        "s1_fan":       "ornate Japanese silk fan, sakura cherry blossom pattern, slot icon, pink background, centered",
        "s2_cherry_blossom": "sakura cherry blossom branch, pink flowers, Japanese style, slot icon, pink background, centered",
        "s3_katana":    "ornate katana sword with golden hilt, Japanese style, slot icon, dark background, centered",
        "s4_lantern":   "red Japanese paper lantern glowing, sakura style, slot icon, dark background, centered",
        "s5_jade_sakura": "jade gemstone with sakura engraving, green glowing, slot icon, dark background, centered",
        "wild_sakura":  "beautiful sakura princess in kimono, WILD text, cherry blossoms, pink background, slot wild",
    },

    "ares_blade": {
        "s1_sword":     "glowing battle sword, Ares god of war style, ancient Greek, slot icon, dark red background, centered",
        "s2_armor":     "golden Greek battle armor chest plate, ornate, slot icon, dark background, centered",
        "s3_spear":     "golden Greek spear with blade tip, Ares style, slot icon, dark red background, centered",
        "s4_war_shield": "red painted Greek war shield, ornate bronze, slot icon, dark background, centered",
        "s5_war_gem":   "dark red war gem glowing, Ares battle style, slot icon, dark background, centered",
        "wild_ares":    "Ares god of war face with helmet, WILD text, battle style, dark red background, slot wild",
    },

    "neon_nights": {
        "s1_neon_diamond": "neon pink diamond outline glowing, cyberpunk night style, slot icon, dark neon background, centered",
        "s2_neon_cocktail": "neon blue cocktail drink glowing, Vegas night style, slot icon, dark background, centered",
        "s3_neon_car":     "neon pink sports car side view, cyberpunk style, slot icon, dark background, centered",
        "s4_neon_crown":   "neon yellow crown glowing, night city style, slot icon, dark background, centered",
        "s5_neon_ace":     "neon green ace playing card glowing, Vegas style, slot icon, dark background, centered",
        "wild_neon":       "WILD text in neon lights, Vegas sign style, colorful neon glow, dark background, slot wild",
    },

    "viking_voyage": {
        "s1_rune":      "carved Norse rune stone, Viking style, slot icon, icy background, centered",
        "s2_mjolnir":   "Mjolnir Thor hammer, Norse Viking style, detailed, slot icon, dark background, centered",
        "s3_longship":  "Viking longship on sea, Norse style, cartoon, slot icon, blue background, centered",
        "s4_valkyrie":  "Valkyrie warrior helmet with wings, Norse style, slot icon, dark background, centered",
        "s5_valhalla_gem": "glowing Norse gem crystal, ice blue, Viking style, slot icon, dark icy background, centered",
        "wild_viking":  "Viking warrior face with horned helmet, WILD text, Norse style, dark background, slot wild",
    },

    "diamond_vault": {
        "s1_key":       "golden vault key ornate, treasure style, slot icon, dark background, centered",
        "s2_lock":      "golden combination lock safe, heist style, slot icon, dark background, centered",
        "s3_briefcase": "black briefcase with golden clasps, heist style, slot icon, dark background, centered",
        "s4_ruby":      "brilliant ruby gemstone red sparkling, vault treasure, slot icon, dark background, centered",
        "s5_blue_diamond": "flawless blue diamond gem faceted, vault treasure, slot icon, dark background, centered",
        "wild_vault":   "open vault door with diamonds spilling out, WILD text, dark background, slot wild symbol",
    },

    "madame_destiny": {
        "s1_tarot":     "ornate tarot card with mystic symbol, fortune teller style, slot icon, dark purple background, centered",
        "s2_crystal_ball": "glowing crystal ball with visions, fortune teller, slot icon, dark purple background, centered",
        "s3_potion":    "purple magic potion bottle glowing, mystical, slot icon, dark background, centered",
        "s4_pentagram": "golden pentagram star mystic, fortune teller style, slot icon, dark purple background, centered",
        "s5_third_eye": "mystical third eye glowing, fortune teller style, slot icon, dark background, centered",
        "wild_destiny": "Madame Destiny face with crystal ball, WILD text, mystic dark background, slot wild symbol",
    },

    "great_rhino": {
        "s1_acacia":    "African acacia tree silhouette at sunset, savanna style, slot icon, orange background, centered",
        "s2_elephant":  "African elephant face portrait, cartoon style, slot icon, orange savanna background, centered",
        "s3_cheetah":   "cheetah face portrait, spotted, cartoon style, slot icon, orange background, centered",
        "s4_rhinoceros": "rhino face portrait with horn, cartoon style, slot icon, orange background, centered",
        "s5_safari_gem": "golden gem with safari sunset, African style, slot icon, orange background, centered",
        "wild_rhino":   "massive rhinoceros charging, WILD text, African savanna style, orange sunset background, slot wild",
    },

    "bass_splash": {
        "s1_worm":      "fishing worm on hook, cartoon style, slot icon, blue water background, centered",
        "s2_lure":      "colorful fishing lure with hooks, cartoon, slot icon, blue background, centered",
        "s3_rod":       "fishing rod bending with catch, cartoon style, slot icon, blue background, centered",
        "s4_big_catch": "large fish jumping out of water, splash, cartoon fishing, slot icon, blue background, centered",
        "s5_bass_gold": "golden bass fish trophy, shiny, cartoon fishing, slot icon, blue background, centered",
        "wild_splash":  "water splash with fish and WILD text, fishing style, blue background, slot wild symbol",
    },

    "dragon_megafire": {
        "s1_flame":     "magical dragon flame fireball, glowing red orange, slot icon, dark background, centered",
        "s2_scales":    "dragon scales texture close-up, dark metallic, slot icon, dark background, centered",
        "s3_egg":       "dragon egg glowing with cracks, fire energy, slot icon, dark background, centered",
        "s4_claw":      "dragon claw grasping gem, dark fantasy, slot icon, dark background, centered",
        "s5_fire_gem":  "fire gem crystal glowing molten, dragon style, slot icon, dark background, centered",
        "wild_megafire": "fire breathing dragon with WILD text, massive flame, dark background, slot wild symbol",
    },

    "esqueleto_fiesta": {
        "s1_marigold":  "orange marigold flower, Dia de Muertos style, colorful, slot icon, dark background, centered",
        "s2_sugar_skull_sm": "small colorful sugar skull, Dia de Muertos style, cartoon, slot icon, dark background, centered",
        "s3_guitar":    "painted guitar, Dia de Muertos style, colorful, slot icon, dark background, centered",
        "s4_candle":    "lit candle with marigolds, Day of Dead altar style, slot icon, dark background, centered",
        "s5_skeleton_gem": "gem crystal with skeleton design, Dia de Muertos style, slot icon, dark background, centered",
        "wild_esqueleto": "dancing skeleton with sombrero WILD text, Dia de Muertos style, colorful, dark background, slot wild",
    },

    "wildfire_gold": {
        "s1_pine":      "pine tree on fire, blazing, western forest fire style, slot icon, dark background, centered",
        "s2_gold_nugget": "rough gold nugget shiny, gold rush mining style, slot icon, dark background, centered",
        "s3_pickaxe":   "golden pickaxe mining tool, gold rush style, slot icon, dark background, centered",
        "s4_dynamite":  "cartoon dynamite bundle with fuse, gold mining style, slot icon, dark background, centered",
        "s5_flame_gem": "golden flame gem glowing, wildfire style, slot icon, dark background, centered",
        "wild_wildfire": "wildfire explosion with WILD text, golden flames, dark background, slot wild symbol",
    },

    "five_lions": {
        "s1_lantern_chinese": "red Chinese lantern with tassels, golden Five Lions style, slot icon, red background, centered",
        "s2_lion_dance": "colorful Chinese lion dance head, festive, slot icon, red background, centered",
        "s3_lucky_coin": "golden Chinese lucky coin, ornate, lion style, slot icon, red background, centered",
        "s4_dragon_ball": "glowing Chinese dragon pearl, golden energy, slot icon, red background, centered",
        "s5_golden_lion_gem": "golden gem with lion face, Chinese style, slot icon, dark background, centered",
        "wild_lions":    "five Chinese lions leaping, WILD text, red and gold, Chinese festival, dark background, slot wild",
    },

    "chilli_heat": {
        "s1_agave":     "blue agave plant, Mexican desert style, cartoon, slot icon, orange background, centered",
        "s2_chilli_trio": "three red chilli peppers, Mexican heat style, cartoon, slot icon, orange background, centered",
        "s3_wrestling_mask": "colorful Mexican wrestling mask, lucha style, slot icon, dark background, centered",
        "s4_tequila":   "tequila bottle with limes, Mexican style, cartoon, slot icon, dark background, centered",
        "s5_golden_pepper": "golden chilli pepper glowing, hot Mexican style, slot icon, dark background, centered",
        "wild_heat":    "chilli heat explosion with WILD text, Mexican fire style, dark orange background, slot wild",
    },

    "tombstone_reload": {
        "s1_badge":     "tin sheriff badge star, wild west style, cartoon, slot icon, dark background, centered",
        "s2_revolver":  "old revolver gun, wild west style, detailed cartoon, slot icon, dark background, centered",
        "s3_wanted":    "WANTED poster paper, old west style, slot icon, dark background, centered",
        "s4_skull_hat": "skull wearing cowboy hat, wild west skeleton style, slot icon, dark background, centered",
        "s5_tombstone": "stone grave tombstone RIP, wild west cemetery, slot icon, dark background, centered",
        "wild_tombstone": "tombstone reload wild west gunfight, WILD text, dark background, slot wild symbol",
    },

    "mental_meltdown": {
        "s1_brain":     "glowing neon brain, psychedelic style, colorful, slot icon, dark background, centered",
        "s2_pills":     "colorful pills scattered, surreal pop art style, slot icon, dark background, centered",
        "s3_eye_spiral": "hypnotic spiral eye, psychedelic surreal, slot icon, dark background, centered",
        "s4_lightning_mind": "electric lightning in brain shape, mental power, slot icon, dark background, centered",
        "s5_chaos_gem": "chaotic fractured gem, psychedelic colors, slot icon, dark background, centered",
        "wild_mental":  "exploding mind brain chaos WILD text, psychedelic colorful, dark background, slot wild",
    },

    "san_quentin": {
        "s1_shiv":      "prison shiv knife, inmate crafted, dark gritty style, slot icon, dark background, centered",
        "s2_barbed_wire": "barbed wire coil, prison style, dark metallic, slot icon, dark background, centered",
        "s3_prison_bars": "iron prison cell bars, dark gritty style, slot icon, dark background, centered",
        "s4_tattoo_gun": "homemade tattoo gun, prison ink style, slot icon, dark background, centered",
        "s5_gold_chain": "thick gold chain, prison style bling, slot icon, dark background, centered",
        "wild_quentin": "prison escape with WILD text, San Quentin style, dark gritty background, slot wild symbol",
    },

    "nitro_street": {
        "s1_tire":      "spinning race tire with flames, street racing style, slot icon, dark background, centered",
        "s2_nos_tank":  "nitrous oxide NOS tank, car racing style, slot icon, dark background, centered",
        "s3_trophy_cup": "racing trophy cup golden, street race winner, slot icon, dark background, centered",
        "s4_turbocharger": "turbocharger engine part, racing style, slot icon, dark background, centered",
        "s5_diamond_gear": "diamond shaped gear, street racing style glowing, slot icon, dark background, centered",
        "wild_nitro":   "nitro boost explosion car, WILD text, street racing dark background, slot wild symbol",
    },

    "wild_toro": {
        "s1_matador_cape": "red matador cape swirling, Spanish bullfight, cartoon, slot icon, dark background, centered",
        "s2_flowers_es":   "Spanish red carnation flower, bullfight style, slot icon, dark background, centered",
        "s3_bull_skull":   "white bull skull, Spanish matador style, slot icon, dark background, centered",
        "s4_sword_es":     "matador sword estoque, Spanish style, slot icon, dark background, centered",
        "s5_golden_toro":  "golden bull face trophy, Spanish fiesta style, slot icon, dark background, centered",
        "wild_toro":       "charging bull with flamenco swirls WILD text, Spanish style, dark red background, slot wild",
    },

    "jammin_fruits": {
        "s1_strawberry": "cartoon strawberry fruit jam style, bright red, slot icon, purple background, centered",
        "s2_orange_jm":  "cartoon orange fruit sliced, jam style, bright, slot icon, purple background, centered",
        "s3_pineapple":  "cartoon pineapple fruit, jam style, bright yellow, slot icon, purple background, centered",
        "s4_mango":      "cartoon mango fruit, tropical jam style, slot icon, purple background, centered",
        "s5_berry_gem":  "gem made of mixed berries, fruit jam style, slot icon, purple background, centered",
        "wild_jam":      "fruit jam explosion with WILD text, bright colorful fruits, purple background, slot wild",
    },

    "big_bamboo": {
        "s1_panda":     "cute baby panda eating bamboo, cartoon, slot icon, green bamboo background, centered",
        "s2_bamboo_shoot": "bamboo shoot green growing, cartoon style, slot icon, green background, centered",
        "s3_jade_bamboo": "jade green bamboo carved gem, Asian style, slot icon, dark background, centered",
        "s4_tiger_mask": "Chinese tiger mask, colorful, Asian style, slot icon, dark background, centered",
        "s5_giant_gem": "giant gem in bamboo forest, Asian style, slot icon, dark green background, centered",
        "wild_bamboo":  "panda with giant bamboo WILD text, Asian style, green background, slot wild symbol",
    },

    "fat_rabbit": {
        "s1_carrot":    "orange carrot with green top, cartoon cute, slot icon, bright background, centered",
        "s2_lettuce":   "green lettuce head, cute cartoon rabbit food, slot icon, bright background, centered",
        "s3_rabbit_hat": "top hat with rabbit inside, magic style, cartoon, slot icon, bright background, centered",
        "s4_golden_egg": "golden egg with shine, Easter rabbit style, cartoon, slot icon, bright background, centered",
        "s5_fat_gem":   "chubby round gem, fat rabbit style, glowing, slot icon, bright background, centered",
        "wild_rabbit":  "fat chubby rabbit with carrot WILD text, cartoon cute, bright background, slot wild symbol",
    },

    "immortal_blood": {
        "s1_blood_drop": "blood drop glowing red, immortal vampire style, slot icon, dark red background, centered",
        "s2_vampire_ring": "gothic vampire ring with blood gem, dark style, slot icon, dark background, centered",
        "s3_bone_cross": "ornate bone cross, gothic immortal style, slot icon, dark background, centered",
        "s4_dark_castle": "gothic castle silhouette, vampire immortal style, slot icon, dark background, centered",
        "s5_immortal_gem": "dark crimson gem immortal glow, gothic style, slot icon, dark background, centered",
        "wild_immortal": "immortal vampire face glowing red eyes, WILD text, gothic dark background, slot wild",
    },

    "mega_safari": {
        "s1_zebra":     "zebra face portrait, African safari style, cartoon, slot icon, savanna orange background, centered",
        "s2_giraffe":   "giraffe face portrait, long neck, African safari, cartoon, slot icon, orange background, centered",
        "s3_lion_safari": "lion face portrait, African safari, cartoon, slot icon, orange background, centered",
        "s4_elephant_safari": "elephant face portrait, African safari, cartoon, slot icon, orange background, centered",
        "s5_safari_gem": "gem crystal with safari animal pattern, golden, slot icon, orange background, centered",
        "wild_safari":  "African safari jeep with animals, WILD text, savanna orange background, slot wild symbol",
    },

    "lucha_mania": {
        "s1_luchador_blue": "blue luchador wrestling mask, Mexican style, cartoon, slot icon, dark background, centered",
        "s2_luchador_red":  "red luchador wrestling mask, Mexican style, cartoon, slot icon, dark background, centered",
        "s3_championship_belt": "shiny wrestling championship belt, lucha style, slot icon, dark background, centered",
        "s4_thunder_fist":  "glowing fist punch, lucha power style, slot icon, dark background, centered",
        "s5_arena_gem":     "gem shaped like wrestling arena, lucha style, glowing, slot icon, dark background, centered",
        "wild_lucha":       "luchador champion pose WILD text, Mexican wrestling style, dark background, slot wild",
    },

    "extra_chilli": {
        "s1_pepper_green": "green jalapeño pepper, spicy Mexican style, cartoon, slot icon, dark background, centered",
        "s2_pepper_yellow": "yellow habanero pepper, spicy cartoon, slot icon, dark background, centered",
        "s3_salsa_jar":    "spicy salsa jar with chilli, Mexican style, slot icon, dark background, centered",
        "s4_fire_pepper":  "ghost pepper chilli on fire, extreme heat, slot icon, dark background, centered",
        "s5_chilli_gem":   "gem crystal shaped like chilli, red glowing, slot icon, dark background, centered",
        "wild_extra":      "extra chilli explosion WILD text, extreme heat fire style, dark background, slot wild",
    },

    "wanted_dead": {
        "s1_noose":     "rope noose, wild west outlaw style, dark, slot icon, dark background, centered",
        "s2_bullet":    "golden bullet cartridge, wild west style, slot icon, dark background, centered",
        "s3_boots":     "cowboy boots worn spurs, wild west, cartoon, slot icon, dark background, centered",
        "s4_outlaw_mask": "outlaw bandit mask, wild west style, dark, slot icon, dark background, centered",
        "s5_bounty_gem": "bounty gem golden western, wanted style, slot icon, dark background, centered",
        "wild_wanted":  "WANTED poster with outlaw silhouette, WILD text, wild west dark background, slot wild",
    },

    "chaos_crew": {
        "s1_spray_can": "spray paint can graffiti, street art style, colorful, slot icon, dark background, centered",
        "s2_boom_box":  "retro boombox radio, hip hop street style, cartoon, slot icon, dark background, centered",
        "s3_brass_knuckles": "golden brass knuckles, street gang style, slot icon, dark background, centered",
        "s4_crow_bar":  "iron crowbar, street chaos style, slot icon, dark background, centered",
        "s5_chaos_gem": "cracked gem with chaotic energy, street art colors, slot icon, dark background, centered",
        "wild_chaos":   "chaos crew gang explosion WILD text, street art graffiti, dark background, slot wild",
    },

    "le_bandit": {
        "s1_beret":     "black French beret hat, Parisian bandit style, cartoon, slot icon, dark background, centered",
        "s2_striped_bag": "black and white striped swag bag, French bandit, cartoon, slot icon, dark background, centered",
        "s3_lockpick":  "lockpick tools, sophisticated bandit style, slot icon, dark background, centered",
        "s4_wine":      "French wine bottle and glass, Parisian style, slot icon, dark background, centered",
        "s5_blue_gem":  "elegant blue gemstone, French bandit heist, slot icon, dark background, centered",
        "wild_bandit":  "French bandit le voleur with WILD text, Parisian style, dark background, slot wild",
    },

    "dead_alive": {
        "s1_zombie_arm": "zombie hand reaching up from ground, horror cartoon, slot icon, dark background, centered",
        "s2_voodoo_doll": "voodoo doll with pins, dead alive style, cartoon, slot icon, dark background, centered",
        "s3_skull_bomb": "skull shaped bomb with fuse, horror cartoon, slot icon, dark background, centered",
        "s4_magic_bottle": "glowing resurrection potion bottle, dead alive style, slot icon, dark background, centered",
        "s5_undead_gem": "cracked gem with undead glow, zombie style, slot icon, dark background, centered",
        "wild_dead":    "zombie rising from grave WILD text, horror cartoon, dark background, slot wild symbol",
    },

    "mega_joker": {
        "s1_jester":    "colorful jester hat with bells, classic joker style, slot icon, dark background, centered",
        "s2_playing_card": "ornate playing card back pattern, joker style, slot icon, dark background, centered",
        "s3_mask_joker": "venetian carnival mask, joker style, colorful, slot icon, dark background, centered",
        "s4_golden_die": "golden six-sided die, casino joker style, slot icon, dark background, centered",
        "s5_mega_gem":  "mega large gem sparkling, joker casino style, slot icon, dark background, centered",
        "wild_joker_mega": "mega joker face with big grin WILD text, colorful dark background, slot wild symbol",
    },

    "crown_fire": {
        "s1_crown_sm":  "small golden crown on fire, blazing, slot icon, dark background, centered",
        "s2_ruby_fire": "ruby gemstone with fire aura, burning, slot icon, dark background, centered",
        "s3_scepter":   "golden scepter with fire crystal, royal flame, slot icon, dark background, centered",
        "s4_fire_ring": "golden ring with fire gems, burning crown style, slot icon, dark background, centered",
        "s5_inferno_gem": "inferno fire gem glowing red orange, crown fire style, slot icon, dark background, centered",
        "wild_crown_fire": "burning crown with WILD text, crown fire explosion, dark background, slot wild symbol",
    },

    "olympus_dream": {
        "s1_cloud_palace": "white cloud palace, dreamy Olympus style, slot icon, blue sky background, centered",
        "s2_dream_harp": "golden harp with dream clouds, Olympus style, slot icon, blue background, centered",
        "s3_ambrosia":  "golden ambrosia bowl glowing, food of gods, Olympus dream style, slot icon, dark background, centered",
        "s4_pegasus":   "white Pegasus horse with wings, Olympus dream, slot icon, blue sky background, centered",
        "s5_dream_gem": "iridescent dream gem cloud colors, Olympus style, slot icon, blue background, centered",
        "wild_dream":   "dreaming Olympus vision with WILD text, clouds golden light, blue background, slot wild",
    },

    "goldstorm_ultra": {
        "s1_lightning_rod": "golden lightning rod, goldstorm energy, slot icon, dark stormy background, centered",
        "s2_gold_rain":    "golden rain drops falling, storm style, slot icon, dark background, centered",
        "s3_storm_coin":   "gold coin in lightning storm, goldstorm style, slot icon, dark background, centered",
        "s4_vault_door":   "golden vault door, goldstorm bank style, slot icon, dark background, centered",
        "s5_ultra_gem":    "ultra diamond gem with gold lightning, goldstorm style, slot icon, dark background, centered",
        "wild_goldstorm":  "gold coin storm explosion WILD text, golden lightning, dark background, slot wild symbol",
    },

    "fire_hole": {
        "s1_mine_cart":  "mining cart with gems, underground fire hole style, cartoon, slot icon, dark background, centered",
        "s2_drill":      "rock drill mining tool, underground style, slot icon, dark background, centered",
        "s3_xbomb":      "X-bomb explosive glowing, fire hole style, slot icon, dark background, centered",
        "s4_lava_gem":   "lava gem crystal glowing orange, fire hole style, slot icon, dark background, centered",
        "s5_molten_core": "molten core ball glowing, underground fire, slot icon, dark background, centered",
        "wild_xbomb":    "X-bomb explosion fire hole WILD text, underground volcanic, dark background, slot wild",
    },

    "merlin_power": {
        "s1_spellbook":  "ancient magic spellbook glowing, Merlin wizard style, slot icon, purple background, centered",
        "s2_wand":       "wizard wand with stars, Merlin magic, slot icon, purple background, centered",
        "s3_cauldron":   "bubbling magic cauldron, wizard style, slot icon, purple background, centered",
        "s4_raven":      "black raven with glowing eyes, Merlin familiar, slot icon, dark background, centered",
        "s5_merlin_gem": "magical purple gem with star, Merlin power style, slot icon, dark background, centered",
        "wild_merlin":   "Merlin wizard with staff WILD text, magical sparkles, purple background, slot wild symbol",
    },
}

# ─── Background prompts: game_id -> prompt ────────────────────────────────────
# Each generates a 1920x1080 atmospheric background for the slot play area.
# Key: dark center (reels go there), vivid themed imagery at edges.

BG_SUFFIX = "slot machine background, wide landscape, dark center area for game reels, cinematic lighting, highly detailed, 4k quality, digital art"

BG_PROMPTS = {
    "sugar_rush":         f"candy fantasy land, cotton candy clouds, giant lollipop trees, gummy bear pathway, pink sugar crystal formations, sparkly candy wonderland, {BG_SUFFIX}",
    "lucky_777":          f"colorful tropical fruit explosion, giant strawberries grapes bananas floating in pastel sky, candy and fruit paradise, pink clouds, sparkling sugar particles, {BG_SUFFIX}",
    "gates_olympus":      f"Mount Olympus golden temple above clouds, Zeus throne room with lightning, marble columns, dramatic purple gold sky, divine golden light rays, epic Greek mythology scene, {BG_SUFFIX}",
    "black_bull":         f"Spanish bullring arena at night, dramatic red and black atmosphere, gold coins scattered, dark moody arena with spotlights, Spanish architecture, {BG_SUFFIX}",
    "hot_chillies":       f"Mexican fiesta scene, colorful chili peppers, maracas, festive papel picado banners, warm desert sunset, cantina style, {BG_SUFFIX}",
    "super_hot":          f"classic retro slot machine background, burning flame border, neon glow fruit outlines, dark background with fire effects, retro casino atmosphere, {BG_SUFFIX}",
    "wolf_gold":          f"wolf howling at full moon on mountain ridge, Native American totem poles, golden amber sunset, wilderness panorama, {BG_SUFFIX}",
    "big_bass":           f"peaceful lake fishing scene, wooden dock, morning mist, bass fish jumping from water, fishing boat, blue water reflections, {BG_SUFFIX}",
    "fire_joker":         f"dark circus tent interior with fire effects, jester face shadow, flames along edges, classic retro slot atmosphere, dramatic fire lighting, {BG_SUFFIX}",
    "book_dead":          f"ancient Egyptian tomb interior, golden sarcophagus, hieroglyph covered walls, torchlit corridor, mystical golden glow, pharaoh treasures, {BG_SUFFIX}",
    "starburst_xxl":      f"deep space cosmic nebula, colorful starburst gems floating, rainbow aurora, cosmic dust, dark void with brilliant colorful light explosions, {BG_SUFFIX}",
    "gonzos_quest":       f"ancient Aztec temple in dense jungle, stone carved faces, golden treasure chamber entrance, waterfall, lush green foliage, mystical fog, {BG_SUFFIX}",
    "starlight_princess": f"magical anime princess castle in starlit sky, pink and purple aurora, floating star crystals, magical sparkle particles, dreamy celestial atmosphere, {BG_SUFFIX}",
    "olympus_rising":     f"underwater temple of Poseidon rising from ocean, marble pillars covered in coral, dramatic ocean waves, trident glowing, blue golden light, {BG_SUFFIX}",
    "buffalo_stampede":   f"American buffalo herd on prairie at golden sunset, dust clouds, dramatic orange sky, western landscape, {BG_SUFFIX}",
    "puppy_palace":       f"colorful dog kennel palace, cute puppy doghouse with bones and toys, green garden, warm cheerful atmosphere, cartoon style, {BG_SUFFIX}",
    "crimson_fang":       f"gothic vampire castle at blood red moonlight, dark forest, bat silhouettes, fog rolling over graveyard, crimson red atmosphere, {BG_SUFFIX}",
    "pirate_fortune":     f"pirate ship on stormy sea at sunset, treasure chest overflowing with gold, skull and crossbones flag, dramatic ocean waves, {BG_SUFFIX}",
    "lucky_dragon":       f"Chinese temple with golden dragon, red lanterns, fireworks, festive Chinese New Year atmosphere, red and gold decorations, {BG_SUFFIX}",
    "pharaoh_legacy":     f"Egyptian pyramids at sunset, golden pharaoh mask floating, sand dunes, ancient ruins, dramatic golden sky, {BG_SUFFIX}",
    "quantum_burst":      f"quantum energy chamber, neon atom particles, electric blue plasma, sci-fi laboratory, pulsing energy grid, dark space with neon glow, {BG_SUFFIX}",
    "olympian_gods":      f"Greek gods assembly on Mount Olympus, Zeus Poseidon Hades standing before grand temple, dramatic lightning sky, golden classical architecture, {BG_SUFFIX}",
    "twin_helix":         f"retro futuristic neon corridor, DNA helix glowing, synthwave aesthetic, purple and cyan neon lights, sci-fi laboratory, {BG_SUFFIX}",
    "golden_fortune":     f"luxury yacht on ocean at sunset, diamond champagne gold coins, VIP lifestyle, golden luxury atmosphere, {BG_SUFFIX}",
    "island_tiki":        f"tropical Hawaiian beach with tiki totems, palm trees, ocean sunset, hibiscus flowers, tiki torches, warm tropical paradise, {BG_SUFFIX}",
    "sakura_princess":    f"Japanese cherry blossom garden at moonlight, pagoda temple, floating sakura petals, pink and purple sky, serene moon reflection on water, {BG_SUFFIX}",
    "ares_blade":         f"Spartan battlefield at dusk, war god silhouette with sword, shields and spears, dramatic red bronze sky, ancient Greek warfare, {BG_SUFFIX}",
    "neon_nights":        f"1980s Miami Vice neon cityscape at night, palm trees, pink and cyan neon signs, sports car, synthwave sunset, {BG_SUFFIX}",
    "viking_voyage":      f"Viking longship on stormy northern sea, dramatic lightning, Norse rune stones, northern lights, epic battle atmosphere, {BG_SUFFIX}",
    "diamond_vault":      f"elegant vault door opening with diamonds pouring out, Greek Pegasus flying above, dark luxury atmosphere, golden and blue gems, {BG_SUFFIX}",
    "madame_destiny":     f"fortune teller tent interior, crystal ball glowing purple, tarot cards floating, mystical purple mist, candles, mysterious atmosphere, {BG_SUFFIX}",
    "great_rhino":        f"African savanna at golden hour, giant rhino silhouette, acacia trees, dramatic orange sunset sky, wildlife panorama, {BG_SUFFIX}",
    "bass_splash":        f"dramatic fish jumping from water with huge splash, fishing boat on lake, blue sky, water droplets, energetic fishing scene, {BG_SUFFIX}",
    "dragon_megafire":    f"giant Chinese fire dragon breathing flames, pagoda temple burning, red and gold fire, dramatic dark sky, floating golden coins, {BG_SUFFIX}",
    "esqueleto_fiesta":   f"Day of the Dead celebration, colorful sugar skulls, marigold flowers, skeleton mariachi band, festive Mexican graveyard, {BG_SUFFIX}",
    "wildfire_gold":      f"Wild West desert town at sunset, saloon with gold mining equipment, tumbleweeds, dramatic orange sky, cowboy silhouette, {BG_SUFFIX}",
    "five_lions":         f"Chinese lion dance festival, five golden lions, red temple entrance, fireworks, lanterns, festive red and gold atmosphere, {BG_SUFFIX}",
    "chilli_heat":        f"Mexican desert landscape with giant chili peppers, adobe village, warm sunset, fiesta decorations, {BG_SUFFIX}",
    "tombstone_reload":   f"Wild West Tombstone ghost town, wanted poster on saloon wall, showdown at high noon, dusty dark atmosphere, {BG_SUFFIX}",
    "mental_meltdown":    f"psychedelic brain explosion, surreal colorful melting reality, neon green electric sparks, chaotic abstract art, dark void center, {BG_SUFFIX}",
    "san_quentin":        f"dark prison corridor, iron bars, gritty concrete walls, dramatic harsh lighting, escape route with light at end, {BG_SUFFIX}",
    "nitro_street":       f"cyberpunk street racing scene, neon-lit underground tunnel, graffiti walls, nitrous flames, urban night, {BG_SUFFIX}",
    "wild_toro":          f"Spanish bullfighting arena, red cape flowing, matador silhouette, dramatic red sunset, old Spanish architecture framing, {BG_SUFFIX}",
    "jammin_fruits":      f"colorful DJ stage with fruit-shaped speakers, jam jar spotlights, music festival atmosphere, purple neon lights, dancing crowd silhouettes, {BG_SUFFIX}",
    "big_bamboo":         f"lush bamboo forest with morning mist, panda bears, Asian temple hidden in bamboo, golden lanterns, peaceful mystical atmosphere, {BG_SUFFIX}",
    "fat_rabbit":         f"lush vegetable garden with giant carrots and cabbages, rabbit burrow entrance, morning dew, warm sunshine, cartoon pastoral scene, {BG_SUFFIX}",
    "immortal_blood":     f"gothic castle interior, stained glass windows with crimson light, vampire throne room, dark romantic atmosphere, blood red roses, {BG_SUFFIX}",
    "mega_safari":        f"African safari sunset panorama, elephant lion giraffe silhouettes, dramatic orange red sky, acacia trees, savanna landscape, {BG_SUFFIX}",
    "lucha_mania":        f"Mexican wrestling arena, colorful lucha libre masks hanging, dramatic ring lighting, crowd silhouettes, energetic atmosphere, {BG_SUFFIX}",
    "extra_chilli":       f"Mexican food cart scene with giant chillies, burning peppers, food market fiesta, warm fiery colors, {BG_SUFFIX}",
    "wanted_dead":        f"Wild West wanted poster nailed to weathered saloon door, old west town, dramatic sepia sunset, dust and gun smoke, {BG_SUFFIX}",
    "chaos_crew":         f"punk street graffiti wall, spray paint art, skateboard ramps, urban chaos, colorful tags on dark walls, {BG_SUFFIX}",
    "le_bandit":          f"Parisian night scene, Eiffel Tower illuminated, raccoon thief silhouette on rooftop, elegant noir atmosphere, moonlit city, {BG_SUFFIX}",
    "dead_alive":         f"Wild West graveyard at sunset, gunslinger silhouette, dramatic orange sky, vultures, desert landscape, {BG_SUFFIX}",
    "mega_joker":         f"classic retro casino interior, neon joker signs, vintage slot machines, red curtains, golden stage lights, circus carnival atmosphere, {BG_SUFFIX}",
    "crown_fire":         f"burning royal crown on dark throne, fire and embers, dark regal chamber, dramatic flames, molten gold, {BG_SUFFIX}",
    "olympus_dream":      f"dreamy ethereal cloud palace, soft golden temple floating in blue sky, angelic divine light, celestial peaceful atmosphere, {BG_SUFFIX}",
    "goldstorm_ultra":    f"Norse Yggdrasil world tree in golden storm, lightning striking treasure, golden coins raining, dramatic thunderstorm, {BG_SUFFIX}",
    "fire_hole":          f"underground mine shaft with TNT explosion, gold veins in rock walls, mine cart on rails, dramatic fire and debris, {BG_SUFFIX}",
    "merlin_power":       f"Merlin wizard tower interior, magical spell books floating, glowing crystal staff, purple mystical energy, medieval castle library, {BG_SUFFIX}",
}

BG_DIR = CASINO_DIR / "assets" / "backgrounds" / "slots"


# ─── Thumbnail prompts: game_id -> prompt ─────────────────────────────────────
THUMB_PROMPTS = {
    "sugar_rush":         "slot game promotional thumbnail, candy land title screen, pink cotton candy clouds, giant lollipops, sugar rush title text, bright pastel colors, 3D rendered, high quality casino game art",
    "lucky_777":          "slot game promotional thumbnail, classic fruit machine, colorful fruits neon glow, lucky 7 title, bright retro casino style, 3D rendered, high quality game art",
    "gates_olympus":      "slot game promotional thumbnail, Gates of Olympus title screen, Mount Olympus lightning storm, Zeus figure, purple gold color scheme, epic dramatic sky, 3D rendered casino game art",
    "black_bull":         "slot game promotional thumbnail, black bull charging, gold coins explosion, western casino style, dark dramatic background, 3D rendered casino game art, high quality",
    "hot_chillies":       "slot game promotional thumbnail, hot chillies Mexican fiesta, colorful peppers explosion, sombrero, festive title screen, warm orange red colors, 3D rendered casino game art",
    "super_hot":          "slot game promotional thumbnail, super hot retro slot, classic fruit symbols on fire, dark background with neon glow, retro casino style, 3D rendered casino game art",
    "wolf_gold":          "slot game promotional thumbnail, Wolf Gold title screen, howling wolf full moon, Native American symbols, amber golden sky, dramatic landscape, 3D rendered casino game art",
    "big_bass":           "slot game promotional thumbnail, Big Bass Splash title screen, giant bass fish jumping, fisherman cartoon, blue water splash, 3D rendered casino game art, high quality",
    "fire_joker":         "slot game promotional thumbnail, Fire Joker title screen, jester face on fire, classic slot symbols blazing, dark fiery background, 3D rendered casino game art",
    "book_dead":          "slot game promotional thumbnail, Book of Dead title screen, Egyptian pharaoh, pyramids sunset, golden book glowing, mystical ancient Egypt, 3D rendered casino game art",
    "starburst_xxl":      "slot game promotional thumbnail, Starburst XXL title screen, colorful gem explosion, space nebula background, rainbow starburst, 3D rendered cosmic casino game art",
    "gonzos_quest":       "slot game promotional thumbnail, Gonzo's Quest title screen, conquistador Gonzo with Aztec temple, jungle, golden Aztec symbols, 3D rendered casino game art",
    "starlight_princess": "slot game promotional thumbnail, Starlight Princess title screen, anime princess with star magic, pink purple starlight, magical sparkles, 3D rendered casino game art",
    "olympus_rising":     "slot game promotional thumbnail, Olympus Rising title screen, Poseidon with trident, rising sea temple, epic blue ocean, 3D rendered casino game art, high quality",
    "buffalo_stampede":   "slot game promotional thumbnail, Buffalo Stampede title screen, buffalo herd charging, American west sunset, dust cloud, orange dramatic sky, 3D rendered casino game art",
    "puppy_palace":       "slot game promotional thumbnail, Puppy Palace title screen, cute golden retriever puppy in castle, colorful, warm cute style, 3D rendered casino game art, high quality",
    "crimson_fang":       "slot game promotional thumbnail, Crimson Fang vampire title screen, gothic vampire castle, crimson red moonlight, dark horror style, 3D rendered casino game art",
    "pirate_fortune":     "slot game promotional thumbnail, Pirate Fortune title screen, pirate ship on sea at sunset, treasure chest, skull crossbones, 3D rendered casino game art, high quality",
    "lucky_dragon":       "slot game promotional thumbnail, Lucky Dragon title screen, golden Chinese dragon spiral, red lanterns, festive Chinese new year style, 3D rendered casino game art",
    "pharaoh_legacy":     "slot game promotional thumbnail, Pharaoh Legacy title screen, great pharaoh with pyramids, golden Egyptian art, hieroglyphs, dramatic sandy sunset, 3D rendered casino game art",
    "quantum_burst":      "slot game promotional thumbnail, Quantum Burst title screen, energy atom explosion, neon blue quantum physics, sci-fi style, dark space background, 3D rendered casino game art",
    "olympian_gods":      "slot game promotional thumbnail, Olympian Gods title screen, Greek gods assembly Mount Olympus, dramatic sky lightning, golden classical style, 3D rendered casino game art",
    "twin_helix":         "slot game promotional thumbnail, Twin Helix title screen, DNA double helix glowing, sci-fi laboratory, neon green blue colors, 3D rendered casino game art, high quality",
    "golden_fortune":     "slot game promotional thumbnail, Golden Fortune title screen, overflowing golden coins, Chinese lucky symbols, red gold festive, 3D rendered casino game art, high quality",
    "island_tiki":        "slot game promotional thumbnail, Island Tiki title screen, tropical beach with tiki idols, palm trees sunset, ocean, vibrant colors, 3D rendered casino game art",
    "sakura_princess":    "slot game promotional thumbnail, Sakura Princess title screen, Japanese princess under cherry blossoms, pink petals floating, traditional art style, 3D rendered casino game art",
    "ares_blade":         "slot game promotional thumbnail, Ares Blade title screen, god of war with sword, Greek battlefield, dramatic dark red sky, 3D rendered casino game art, high quality",
    "neon_nights":        "slot game promotional thumbnail, Neon Nights title screen, Las Vegas neon signs, night city skyline, bright colorful neon lights, 3D rendered casino game art",
    "viking_voyage":      "slot game promotional thumbnail, Viking Voyage title screen, Viking longship stormy sea, Norse runes, dramatic northern lights, 3D rendered casino game art, high quality",
    "diamond_vault":      "slot game promotional thumbnail, Diamond Vault title screen, vault door opening diamonds pouring, heist style, dark elegant, 3D rendered casino game art, high quality",
    "madame_destiny":     "slot game promotional thumbnail, Madame Destiny title screen, fortune teller with crystal ball, mystical cards, purple mist, 3D rendered casino game art, high quality",
    "great_rhino":        "slot game promotional thumbnail, Great Rhino title screen, rhinoceros charging at sunset, African savanna, dramatic orange sky, 3D rendered casino game art, high quality",
    "bass_splash":        "slot game promotional thumbnail, Bass Splash title screen, giant fish splash cartoon, fisherman boat, blue sky water, colorful cartoon, 3D rendered casino game art",
    "dragon_megafire":    "slot game promotional thumbnail, Dragon Megafire title screen, fire breathing dragon, massive flames, dark fantasy, dramatic epic, 3D rendered casino game art, high quality",
    "esqueleto_fiesta":   "slot game promotional thumbnail, Esqueleto Fiesta title screen, dancing skeleton fiesta, Dia de Muertos, colorful marigolds, festive party, 3D rendered casino game art",
    "wildfire_gold":      "slot game promotional thumbnail, Wildfire Gold title screen, gold rush mining explosion, western flames, dramatic outdoor scene, 3D rendered casino game art, high quality",
    "five_lions":         "slot game promotional thumbnail, Five Lions title screen, five Chinese lion dancers, red gold festive, Chinese new year, fireworks, 3D rendered casino game art",
    "chilli_heat":        "slot game promotional thumbnail, Chilli Heat title screen, Mexican desert with giant chillis, fiesta style, hot orange red, dramatic, 3D rendered casino game art",
    "tombstone_reload":   "slot game promotional thumbnail, Tombstone Reload title screen, wild west showdown, gunfighter at high noon, dramatic sepia western, 3D rendered casino game art",
    "mental_meltdown":    "slot game promotional thumbnail, Mental Meltdown title screen, psychedelic brain explosion, colorful surreal, mind bending art, 3D rendered casino game art, high quality",
    "san_quentin":        "slot game promotional thumbnail, San Quentin xWays title screen, prison break dramatic, gritty dark, inmates, dramatic lighting, 3D rendered casino game art",
    "nitro_street":       "slot game promotional thumbnail, Nitro Street Racer title screen, street racing car with flames, neon city night, speed blur, 3D rendered casino game art, high quality",
    "wild_toro":          "slot game promotional thumbnail, Wild Toro title screen, charging bull with matador, Spanish fiesta, dramatic red, 3D rendered casino game art, high quality",
    "jammin_fruits":      "slot game promotional thumbnail, Jammin Fruits title screen, colorful fruit jars explosion, jam style, bright purple, 3D rendered casino game art, high quality",
    "big_bamboo":         "slot game promotional thumbnail, Big Bamboo title screen, giant panda in bamboo forest, Asian style, lush green, cartoon fun, 3D rendered casino game art",
    "fat_rabbit":         "slot game promotional thumbnail, Fat Rabbit title screen, chubby cartoon rabbit with huge carrot, bright colorful, cute fun, 3D rendered casino game art, high quality",
    "immortal_blood":     "slot game promotional thumbnail, Immortal Blood title screen, vampire immortal dark castle, crimson blood moon, gothic horror, 3D rendered casino game art",
    "mega_safari":        "slot game promotional thumbnail, Mega Safari title screen, African safari animals parade, elephant lion giraffe, orange sunset, 3D rendered casino game art, high quality",
    "lucha_mania":        "slot game promotional thumbnail, Lucha Mania title screen, colorful Mexican wrestlers in arena, lucha libre masks, dramatic, 3D rendered casino game art, high quality",
    "extra_chilli":       "slot game promotional thumbnail, Extra Chilli Megaways title screen, giant chilli pepper explosion, Mexican fire, dramatic dark, 3D rendered casino game art",
    "wanted_dead":        "slot game promotional thumbnail, Wanted Dead or a Wild title screen, outlaw wanted poster, wild west dramatic, dark sepia style, 3D rendered casino game art",
    "chaos_crew":         "slot game promotional thumbnail, Chaos Crew title screen, street gang crew graffiti, urban chaos colorful, dark background, 3D rendered casino game art, high quality",
    "le_bandit":          "slot game promotional thumbnail, Le Bandit title screen, French thief Parisian style, Eiffel tower night, elegant dark, 3D rendered casino game art, high quality",
    "dead_alive":         "slot game promotional thumbnail, Dead or Alive 2 title screen, zombie horror western style, dark dramatic, graveyard, 3D rendered casino game art, high quality",
    "mega_joker":         "slot game promotional thumbnail, Mega Joker title screen, giant joker face glowing, classic slot circus, dark background neon, 3D rendered casino game art",
    "crown_fire":         "slot game promotional thumbnail, Crown of Fire title screen, burning golden crown, royal flames, dark dramatic regal, 3D rendered casino game art, high quality",
    "olympus_dream":      "slot game promotional thumbnail, Olympus Dream title screen, dreamy cloud palace, golden gods, soft blue sky, ethereal, 3D rendered casino game art, high quality",
    "goldstorm_ultra":    "slot game promotional thumbnail, Gold Storm Ultra title screen, golden coin storm explosion, lightning, dramatic dark, 3D rendered casino game art, high quality",
    "fire_hole":          "slot game promotional thumbnail, Fire in the Hole title screen, underground mine explosion, fire rocks, dynamite, dramatic dark, 3D rendered casino game art",
    "merlin_power":       "slot game promotional thumbnail, Merlin's Power title screen, wizard Merlin with magical staff, castle, purple mystical, sparkles, 3D rendered casino game art",
}


# ─── Main generation logic ─────────────────────────────────────────────────────

def generate_symbols(game_id: str, resume: bool):
    if game_id not in SYMBOL_PROMPTS:
        print(f"  [SKIP] No prompts defined for {game_id}")
        return

    game_dir = SYMBOLS_DIR / game_id
    prompts = SYMBOL_PROMPTS[game_id]

    for filename, prompt in prompts.items():
        out_path = game_dir / f"{filename}.png"
        if resume and out_path.exists():
            print(f"  [SKIP] {game_id}/{filename}.png (exists)")
            continue
        print(f"  [GEN]  {game_id}/{filename}.png ...")
        img = generate(prompt, width=256, height=256, steps=2)
        save_image(img, out_path)
        print(f"  [DONE] {game_id}/{filename}.png")


def generate_thumbnail(game_id: str, resume: bool):
    if game_id not in THUMB_PROMPTS:
        print(f"  [SKIP] No thumbnail prompt for {game_id}")
        return

    out_path = THUMBS_DIR / f"{game_id}.png"
    if resume and out_path.exists():
        print(f"  [SKIP] thumbnails/{game_id}.png (exists)")
        return

    print(f"  [GEN]  thumbnails/{game_id}.png ...")
    img = generate(THUMB_PROMPTS[game_id], width=512, height=680, steps=3)
    save_image(img, out_path)
    print(f"  [DONE] thumbnails/{game_id}.png")


def postprocess_background(img: Image.Image) -> Image.Image:
    """Apply radial vignette to darken center (where reels sit) and soften edges."""
    from PIL import ImageFilter, ImageDraw, ImageEnhance
    # Slight blur to reduce SDXL Turbo noise on large images
    img = img.filter(ImageFilter.GaussianBlur(radius=1.2))
    # Boost contrast slightly
    img = ImageEnhance.Contrast(img).enhance(1.15)
    # Apply vignette: darken the center region more so reels are readable
    w, h = img.size
    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    # Center dark ellipse (where the reels container sits)
    cx, cy = w // 2, h // 2
    for i in range(40):
        alpha = int(180 * (1 - i / 40))  # Strong center darkening
        rx = int(w * 0.25 + i * w * 0.012)
        ry = int(h * 0.25 + i * h * 0.012)
        draw.ellipse(
            [cx - rx, cy - ry, cx + rx, cy + ry],
            fill=(0, 0, 0, alpha)
        )
    img = img.convert('RGBA')
    img = Image.alpha_composite(img, overlay)
    return img.convert('RGB')


def generate_background(game_id: str, resume: bool):
    if game_id not in BG_PROMPTS:
        print(f"  [SKIP] No background prompt for {game_id}")
        return

    out_path = BG_DIR / f"{game_id}_bg.png"
    if resume and out_path.exists():
        print(f"  [SKIP] backgrounds/slots/{game_id}_bg.png (exists)")
        return

    print(f"  [GEN]  backgrounds/slots/{game_id}_bg.png ...")
    img = generate(BG_PROMPTS[game_id], width=1920, height=1080, steps=4)
    img = postprocess_background(img)
    save_image(img, out_path)
    print(f"  [DONE] backgrounds/slots/{game_id}_bg.png")


def main():
    parser = argparse.ArgumentParser(description="Generate SDXL Turbo assets for Royal Slots Casino")
    parser.add_argument("--mode", choices=["symbols", "thumbs", "backgrounds", "all"], default="all",
                        help="What to generate (default: all)")
    parser.add_argument("--game", type=str, default=None,
                        help="Only generate assets for one game ID (e.g. sugar_rush)")
    parser.add_argument("--resume", action="store_true",
                        help="Skip files that already exist on disk")
    args = parser.parse_args()

    all_games = sorted(SYMBOL_PROMPTS.keys())
    target_games = [args.game] if args.game else all_games

    # Validate game IDs
    for g in target_games:
        if g not in SYMBOL_PROMPTS and g not in BG_PROMPTS:
            print(f"ERROR: Unknown game ID '{g}'")
            print(f"Valid IDs: {all_games}")
            sys.exit(1)

    print(f"Mode: {args.mode} | Games: {len(target_games)} | Resume: {args.resume}")
    print(f"Output symbols dir:      {SYMBOLS_DIR}")
    print(f"Output thumbs dir:       {THUMBS_DIR}")
    print(f"Output backgrounds dir:  {BG_DIR}")
    print()

    for game_id in target_games:
        print(f"=== {game_id} ===")
        if args.mode in ("symbols", "all"):
            generate_symbols(game_id, args.resume)
        if args.mode in ("thumbs", "all"):
            generate_thumbnail(game_id, args.resume)
        if args.mode in ("backgrounds", "all"):
            generate_background(game_id, args.resume)
        print()

    print("All done!")


if __name__ == "__main__":
    main()
