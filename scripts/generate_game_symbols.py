"""
Generate unique themed symbol sets for each of the 12 slot games.
Each game gets 5 unique symbols + 1 wild/scatter symbol = 6 symbols per game.
Symbols are 256x256 PNG with dark backgrounds matching the game theme.
"""

import os
import sys
import time
import torch
from diffusers import AutoPipelineForText2Image
from PIL import Image, ImageEnhance

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

BASE_DIR = r"C:\created games\Casino\assets\game_symbols"
os.makedirs(BASE_DIR, exist_ok=True)

print("Loading SDXL-Turbo pipeline...")
t0 = time.time()
pipe = AutoPipelineForText2Image.from_pretrained(
    "stabilityai/sdxl-turbo",
    torch_dtype=torch.float16,
    variant="fp16",
)
pipe = pipe.to("cuda")
pipe.set_progress_bar_config(disable=True)
print(f"Pipeline loaded in {time.time()-t0:.1f}s")

def generate(prompt, path, width=256, height=256, steps=4, guidance=0.0, seed=None):
    gen = torch.Generator("cuda")
    if seed is not None:
        gen.manual_seed(seed)
    else:
        gen.manual_seed(int(time.time() * 1000) % (2**32))
    img = pipe(
        prompt=prompt,
        num_inference_steps=steps,
        guidance_scale=guidance,
        width=width,
        height=height,
        generator=gen,
    ).images[0]
    img.save(path, quality=95)
    print(f"    [OK] {os.path.basename(path)}")
    return img

# Each game gets 6 themed symbols: 5 regular (low/mid/high value) + 1 wild/scatter
# Symbols should be on a dark background, clean icon style, slot machine quality

GAME_SYMBOLS = {
    "sugar_rush": {
        "theme": "candy wonderland, pink and golden sparkles",
        "bg": "dark pink gradient background",
        "symbols": {
            "s1_lollipop": "a giant colorful spiral lollipop candy, slot machine symbol, clean icon on dark pink background, ultra detailed 3d render, shiny glossy surface",
            "s2_gummy_bear": "a glossy red gummy bear candy, slot machine symbol, clean icon on dark pink background, ultra detailed 3d render, shiny translucent surface",
            "s3_candy_cane": "a red and white striped candy cane, slot machine symbol, clean icon on dark pink background, ultra detailed 3d render, shiny surface",
            "s4_cupcake": "a luxurious golden cupcake with pink frosting and sprinkles, slot machine symbol, clean icon on dark pink background, ultra detailed 3d render",
            "s5_diamond_candy": "a brilliant diamond-shaped candy crystal with rainbow sparkles, slot machine symbol, clean icon on dark pink background, ultra detailed 3d render, premium high value symbol",
            "wild_sugar": "golden text WILD with sugar crystals and sparkles, slot machine wild symbol, clean icon on dark pink background, ultra detailed 3d render, golden metallic"
        },
        "seed_base": 4000
    },
    "lucky_777": {  # Sweet Bonanza
        "theme": "tropical fruit paradise, bright rainbow colors",
        "bg": "dark purple gradient background",
        "symbols": {
            "s1_banana": "a bright yellow banana fruit, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render, shiny juicy surface",
            "s2_grape": "a cluster of purple grapes, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render, shiny wet surface",
            "s3_apple": "a glossy red apple with green leaf, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render, shiny reflective",
            "s4_watermelon": "a half-cut watermelon slice showing red juicy interior, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render",
            "s5_heart_gem": "a brilliant pink heart-shaped gemstone with light refractions, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render, premium",
            "wild_bonanza": "golden text WILD with tropical fruits and confetti, slot machine wild symbol, clean icon on dark purple background, ultra detailed 3d render"
        },
        "seed_base": 4100
    },
    "gates_olympus": {
        "theme": "ancient Greek mythology, golden and blue",
        "bg": "dark navy blue gradient background",
        "symbols": {
            "s1_chalice": "a golden Greek chalice goblet, slot machine symbol, clean icon on dark navy background, ultra detailed 3d render, golden metallic shine",
            "s2_ring": "a golden Greek ring with emerald gemstone, slot machine symbol, clean icon on dark navy background, ultra detailed 3d render, luxury jewelry",
            "s3_hourglass": "a golden hourglass with blue sand, slot machine symbol, clean icon on dark navy background, ultra detailed 3d render, ornate golden frame",
            "s4_crown": "a golden Greek laurel crown wreath, slot machine symbol, clean icon on dark navy background, ultra detailed 3d render, golden leaves",
            "s5_lightning": "a brilliant golden lightning bolt with electric blue sparks, slot machine symbol, clean icon on dark navy background, ultra detailed 3d render, divine power",
            "wild_zeus": "portrait of Zeus face with white beard and golden lightning, slot machine wild symbol, clean icon on dark navy background, ultra detailed 3d render"
        },
        "seed_base": 4200
    },
    "black_bull": {
        "theme": "dark luxury wealth, gold coins and money",
        "bg": "dark red and black gradient background",
        "symbols": {
            "s1_horseshoe": "a golden horseshoe, slot machine symbol, clean icon on dark red-black background, ultra detailed 3d render, metallic gold shine",
            "s2_coins": "a stack of golden coins, slot machine symbol, clean icon on dark red-black background, ultra detailed 3d render, shiny gold metal",
            "s3_money_bag": "a golden money bag with dollar sign, slot machine symbol, clean icon on dark red-black background, ultra detailed 3d render, wealthy premium",
            "s4_gold_bar": "a shiny gold bullion bar, slot machine symbol, clean icon on dark red-black background, ultra detailed 3d render, reflective gold surface",
            "s5_diamond": "a brilliant cut diamond with red fire sparkles, slot machine symbol, clean icon on dark red-black background, ultra detailed 3d render, premium",
            "wild_bull": "a fierce black bull head with golden horns portrait, slot machine wild symbol, clean icon on dark red-black background, ultra detailed 3d render"
        },
        "seed_base": 4300
    },
    "hot_chillies": {
        "theme": "Mexican fiesta, spicy hot peppers, vibrant red orange",
        "bg": "dark orange-red gradient background",
        "symbols": {
            "s1_taco": "a colorful Mexican taco with toppings, slot machine symbol, clean icon on dark red-orange background, ultra detailed 3d render, vibrant colors",
            "s2_maracas": "a pair of colorful Mexican maracas, slot machine symbol, clean icon on dark red-orange background, ultra detailed 3d render, festive",
            "s3_sombrero": "a colorful Mexican sombrero hat, slot machine symbol, clean icon on dark red-orange background, ultra detailed 3d render, fiesta theme",
            "s4_chilli": "a giant red chili pepper on fire with flames, slot machine symbol, clean icon on dark red-orange background, ultra detailed 3d render, spicy hot",
            "s5_hot_7": "a flaming red lucky number 7 on fire, slot machine symbol, clean icon on dark red-orange background, ultra detailed 3d render, burning hot premium",
            "wild_chilli": "three chili peppers crossed with golden WILD text and fire, slot machine wild symbol, clean icon on dark red-orange background, ultra detailed 3d render"
        },
        "seed_base": 4400
    },
    "super_hot": {
        "theme": "classic retro casino, neon lights, fire and gold vintage",
        "bg": "dark amber-black gradient background",
        "symbols": {
            "s1_cherry": "a pair of glossy red cherries with green stem, slot machine symbol, clean icon on dark amber-black background, ultra detailed 3d render, classic retro",
            "s2_lemon": "a bright yellow lemon fruit, slot machine symbol, clean icon on dark amber-black background, ultra detailed 3d render, classic retro style",
            "s3_plum": "a glossy dark purple plum fruit, slot machine symbol, clean icon on dark amber-black background, ultra detailed 3d render, classic retro",
            "s4_bell": "a shiny golden bell, slot machine symbol, clean icon on dark amber-black background, ultra detailed 3d render, classic golden metallic",
            "s5_star": "a blazing golden star with fire and sparkles, slot machine symbol, clean icon on dark amber-black background, ultra detailed 3d render, premium",
            "wild_hot": "flaming golden number 7 with text HOT, slot machine wild symbol, clean icon on dark amber-black background, ultra detailed 3d render, retro casino"
        },
        "seed_base": 4500
    },
    "wolf_gold": {
        "theme": "Native American southwestern desert, golden moonlit",
        "bg": "dark desert brown-gold gradient background",
        "symbols": {
            "s1_feather": "a Native American eagle feather with turquoise beads, slot machine symbol, clean icon on dark brown-gold background, ultra detailed 3d render",
            "s2_paw": "a golden wolf paw print, slot machine symbol, clean icon on dark brown-gold background, ultra detailed 3d render, metallic gold",
            "s3_eagle": "a majestic golden eagle with spread wings, slot machine symbol, clean icon on dark brown-gold background, ultra detailed 3d render",
            "s4_totem": "a carved wooden Native American totem pole, slot machine symbol, clean icon on dark brown-gold background, ultra detailed 3d render",
            "s5_moon": "a brilliant golden full moon with wolf silhouette, slot machine symbol, clean icon on dark brown-gold background, ultra detailed 3d render, premium",
            "wild_wolf": "a majestic golden wolf head portrait howling, slot machine wild symbol, clean icon on dark brown-gold background, ultra detailed 3d render"
        },
        "seed_base": 4600
    },
    "big_bass": {
        "theme": "fishing lake adventure, sparkling water, sunset",
        "bg": "dark blue-teal gradient background",
        "symbols": {
            "s1_hook": "a shiny fishing hook with lure, slot machine symbol, clean icon on dark blue-teal background, ultra detailed 3d render, metallic silver",
            "s2_float": "a red and white fishing bobber float, slot machine symbol, clean icon on dark blue-teal background, ultra detailed 3d render",
            "s3_tackle": "a fishing tackle box with colorful lures, slot machine symbol, clean icon on dark blue-teal background, ultra detailed 3d render",
            "s4_fish": "a largemouth bass fish jumping, slot machine symbol, clean icon on dark blue-teal background, ultra detailed 3d render, splashing water",
            "s5_treasure": "a golden treasure chest underwater with coins, slot machine symbol, clean icon on dark blue-teal background, ultra detailed 3d render, premium",
            "wild_bass": "a giant bass fish with golden WILD text splash, slot machine wild symbol, clean icon on dark blue-teal background, ultra detailed 3d render"
        },
        "seed_base": 4700
    },
    "fire_joker": {
        "theme": "circus fire juggling, classic joker, red and gold",
        "bg": "dark crimson-black gradient background",
        "symbols": {
            "s1_cherry": "a pair of glossy red cherries, slot machine symbol, clean icon on dark crimson background, ultra detailed 3d render, fire joker theme",
            "s2_lemon": "a bright yellow lemon with flame sparks, slot machine symbol, clean icon on dark crimson background, ultra detailed 3d render, fire theme",
            "s3_plum": "a glossy purple plum with fire glow, slot machine symbol, clean icon on dark crimson background, ultra detailed 3d render, fire theme",
            "s4_star": "a flaming golden star with fire trail, slot machine symbol, clean icon on dark crimson background, ultra detailed 3d render, premium fire",
            "s5_seven": "a blazing golden number 7 with fire and flames, slot machine symbol, clean icon on dark crimson background, ultra detailed 3d render, premium",
            "wild_joker": "a fire joker jester face with flaming hat, slot machine wild symbol, clean icon on dark crimson background, ultra detailed 3d render"
        },
        "seed_base": 4800
    },
    "book_dead": {
        "theme": "ancient Egyptian pharaoh tomb, golden artifacts, hieroglyphics",
        "bg": "dark sandy gold-brown gradient background",
        "symbols": {
            "s1_ankh": "an Egyptian ankh cross symbol in gold, slot machine symbol, clean icon on dark sandy brown background, ultra detailed 3d render, golden",
            "s2_scarab": "a golden Egyptian scarab beetle, slot machine symbol, clean icon on dark sandy brown background, ultra detailed 3d render, ornate gold",
            "s3_eye": "the Eye of Horus in gold and blue, slot machine symbol, clean icon on dark sandy brown background, ultra detailed 3d render, Egyptian",
            "s4_pharaoh": "a golden Egyptian pharaoh mask like Tutankhamun, slot machine symbol, clean icon on dark sandy brown background, ultra detailed 3d render",
            "s5_anubis": "Anubis jackal head in gold and black, slot machine symbol, clean icon on dark sandy brown background, ultra detailed 3d render, divine",
            "wild_book": "a golden ancient book with hieroglyphics glowing, slot machine wild symbol, clean icon on dark sandy brown background, ultra detailed 3d render"
        },
        "seed_base": 4900
    },
    "starburst_xxl": {
        "theme": "cosmic outer space, neon rainbow gems, prismatic light",
        "bg": "dark deep space purple-black gradient background",
        "symbols": {
            "s1_gem_red": "a brilliant red ruby gemstone with light refractions, slot machine symbol, clean icon on dark space purple background, ultra detailed 3d render, glowing",
            "s2_gem_blue": "a brilliant blue sapphire gemstone with light refractions, slot machine symbol, clean icon on dark space purple background, ultra detailed 3d render",
            "s3_gem_green": "a brilliant green emerald gemstone with light refractions, slot machine symbol, clean icon on dark space purple background, ultra detailed 3d render",
            "s4_gem_yellow": "a brilliant yellow topaz gemstone with prismatic light rays, slot machine symbol, clean icon on dark space purple background, ultra detailed 3d render",
            "s5_gem_purple": "a brilliant purple amethyst gemstone with cosmic starburst light, slot machine symbol, clean icon on dark space purple background, ultra detailed 3d render",
            "wild_star": "a cosmic starburst explosion with rainbow light and WILD text, slot machine wild symbol, clean icon on dark space purple background, ultra detailed 3d render"
        },
        "seed_base": 5000
    },
    "gonzos_quest": {
        "theme": "Aztec Mayan jungle temple, emeralds and gold, ancient stone",
        "bg": "dark jungle green-brown gradient background",
        "symbols": {
            "s1_stone_face_green": "an Aztec stone carved face mask in green, slot machine symbol, clean icon on dark jungle green background, ultra detailed 3d render, ancient stone texture",
            "s2_stone_face_blue": "an Aztec stone carved face mask in turquoise blue, slot machine symbol, clean icon on dark jungle green background, ultra detailed 3d render, ancient stone",
            "s3_stone_face_red": "an Aztec stone carved face mask in dark red, slot machine symbol, clean icon on dark jungle green background, ultra detailed 3d render, ancient stone",
            "s4_emerald": "a brilliant green emerald gemstone Aztec style, slot machine symbol, clean icon on dark jungle green background, ultra detailed 3d render, ancient treasure",
            "s5_gold_mask": "a golden Aztec sun god mask with emerald eyes, slot machine symbol, clean icon on dark jungle green background, ultra detailed 3d render, premium",
            "wild_gonzo": "a Spanish conquistador face with golden helmet portrait, slot machine wild symbol, clean icon on dark jungle green background, ultra detailed 3d render"
        },
        "seed_base": 5100
    },
}

if __name__ == "__main__":
    total_start = time.time()
    total_generated = 0
    total_skipped = 0

    for game_id, game_cfg in GAME_SYMBOLS.items():
        game_dir = os.path.join(BASE_DIR, game_id)
        os.makedirs(game_dir, exist_ok=True)
        print(f"\n--- {game_id} ({game_cfg['theme'][:40]}...) ---")

        for i, (sym_name, prompt) in enumerate(game_cfg["symbols"].items()):
            path = os.path.join(game_dir, f"{sym_name}.png")
            if os.path.exists(path) and "--force" not in sys.argv:
                print(f"    [skip] {sym_name}")
                total_skipped += 1
                continue
            seed = game_cfg["seed_base"] + i
            generate(prompt, path, width=256, height=256, steps=4, seed=seed)
            total_generated += 1

    elapsed = time.time() - total_start
    print(f"\nDone! Generated {total_generated} symbols, skipped {total_skipped}, in {elapsed:.1f}s")
    print(f"Output: {BASE_DIR}")
