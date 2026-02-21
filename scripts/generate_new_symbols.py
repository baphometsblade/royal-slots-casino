"""
Generate unique themed symbol sets for the 18 NEW slot games (games 13-30).
Each game gets 5 unique symbols + 1 wild symbol = 6 symbols per game.
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

# 18 new games: symbols definition
GAME_SYMBOLS = {
    "starlight_princess": {
        "theme": "magical anime princess, pastel rainbow starlight",
        "bg": "dark purple-pink gradient background",
        "symbols": {
            "s1_crystal_heart": "a glowing pink crystal heart with sparkles, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render, magical shine",
            "s2_magic_wand": "a silver magic wand with star tip and sparkle trail, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render",
            "s3_tiara": "a beautiful diamond and pink gem tiara crown, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render, princess jewelry",
            "s4_moon_orb": "a glowing blue crescent moon orb with stars, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render, mystical",
            "s5_star_crystal": "a brilliant rainbow star-shaped crystal radiating light, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render, premium",
            "wild_empress": "a magical empress silhouette with rainbow wings and WILD text, slot machine wild symbol, clean icon on dark purple background, ultra detailed 3d render"
        },
        "seed_base": 6000
    },
    "olympus_rising": {
        "theme": "ancient Greek temple, stormy sky, marble and gold",
        "bg": "dark navy blue gradient background",
        "symbols": {
            "s1_trident": "a golden trident weapon of Poseidon, slot machine symbol, clean icon on dark navy background, ultra detailed 3d render, metallic gold",
            "s2_shield": "a golden Greek warrior shield with Medusa face, slot machine symbol, clean icon on dark navy background, ultra detailed 3d render",
            "s3_laurel": "a golden laurel wreath crown, slot machine symbol, clean icon on dark navy background, ultra detailed 3d render, victory symbol",
            "s4_thunderbolt": "a brilliant electric blue and gold thunderbolt, slot machine symbol, clean icon on dark navy background, ultra detailed 3d render",
            "s5_olympus_gem": "a divine glowing celestial gemstone with lightning, slot machine symbol, clean icon on dark navy background, ultra detailed 3d render, premium",
            "wild_poseidon": "Poseidon god face portrait with flowing beard and crown, slot machine wild symbol, clean icon on dark navy background, ultra detailed 3d render"
        },
        "seed_base": 6100
    },
    "buffalo_stampede": {
        "theme": "American wild west sunset, buffalo prairie, golden hour",
        "bg": "dark orange-brown gradient background",
        "symbols": {
            "s1_cactus": "a desert cactus with sunset glow, slot machine symbol, clean icon on dark orange-brown background, ultra detailed 3d render",
            "s2_horseshoe_gold": "a shining golden horseshoe with gems, slot machine symbol, clean icon on dark orange-brown background, ultra detailed 3d render",
            "s3_cowboy_hat": "a brown leather cowboy hat, slot machine symbol, clean icon on dark orange-brown background, ultra detailed 3d render, western",
            "s4_buffalo": "a powerful buffalo head portrait with golden horns, slot machine symbol, clean icon on dark orange-brown background, ultra detailed 3d render",
            "s5_sunset_diamond": "a brilliant diamond with orange sunset fire reflections, slot machine symbol, clean icon on dark orange-brown background, ultra detailed 3d render",
            "wild_stampede": "a herd of golden buffaloes stampeding with WILD text, slot machine wild symbol, clean icon on dark orange-brown background, ultra detailed 3d render"
        },
        "seed_base": 6200
    },
    "puppy_palace": {
        "theme": "cute puppies and dogs, cozy house, green and warm colors",
        "bg": "dark green gradient background",
        "symbols": {
            "s1_bone": "a golden dog bone treat, slot machine symbol, clean icon on dark green background, ultra detailed 3d render, shiny",
            "s2_collar": "a red dog collar with golden tag, slot machine symbol, clean icon on dark green background, ultra detailed 3d render",
            "s3_paw_print": "a golden paw print stamp, slot machine symbol, clean icon on dark green background, ultra detailed 3d render, cute",
            "s4_puppy_face": "an adorable golden retriever puppy face, slot machine symbol, clean icon on dark green background, ultra detailed 3d render, cute",
            "s5_golden_bowl": "a golden dog bowl overflowing with gems, slot machine symbol, clean icon on dark green background, ultra detailed 3d render, premium",
            "wild_puppy": "a happy puppy with crown and golden WILD text, slot machine wild symbol, clean icon on dark green background, ultra detailed 3d render"
        },
        "seed_base": 6300
    },
    "crimson_fang": {
        "theme": "gothic vampire castle, blood red, dark night",
        "bg": "dark red-black gradient background",
        "symbols": {
            "s1_garlic": "a bulb of garlic with glow, slot machine symbol, clean icon on dark red-black background, ultra detailed 3d render, vampire theme",
            "s2_cross": "a silver ornate cross with holy light, slot machine symbol, clean icon on dark red-black background, ultra detailed 3d render",
            "s3_bat": "a dark vampire bat with red eyes spreading wings, slot machine symbol, clean icon on dark red-black background, ultra detailed 3d render",
            "s4_coffin": "a gothic black coffin with blood red velvet interior, slot machine symbol, clean icon on dark red-black background, ultra detailed 3d render",
            "s5_vampire": "a vampire lord face with fangs and red eyes, slot machine symbol, clean icon on dark red-black background, ultra detailed 3d render, premium",
            "wild_fang": "bloody vampire fangs with golden WILD text, slot machine wild symbol, clean icon on dark red-black background, ultra detailed 3d render"
        },
        "seed_base": 6400
    },
    "pirate_fortune": {
        "theme": "pirate ship treasure, ocean adventure, skull and crossbones",
        "bg": "dark navy blue-teal gradient background",
        "symbols": {
            "s1_compass": "a golden pirate compass with jewels, slot machine symbol, clean icon on dark navy background, ultra detailed 3d render",
            "s2_anchor": "a golden ship anchor, slot machine symbol, clean icon on dark navy background, ultra detailed 3d render, metallic",
            "s3_cannon": "a pirate ship cannon with golden details, slot machine symbol, clean icon on dark navy background, ultra detailed 3d render",
            "s4_treasure_map": "a rolled treasure map with X marks spot, slot machine symbol, clean icon on dark navy background, ultra detailed 3d render",
            "s5_skull_key": "a golden skull-shaped skeleton key, slot machine symbol, clean icon on dark navy background, ultra detailed 3d render, premium pirate",
            "wild_pirate": "a fierce pirate captain face with hat and golden WILD text, slot machine wild symbol, clean icon on dark navy background, ultra detailed 3d render"
        },
        "seed_base": 6500
    },
    "lucky_dragon": {
        "theme": "Chinese New Year, red and gold, dragon prosperity",
        "bg": "dark red-gold gradient background",
        "symbols": {
            "s1_lantern": "a red Chinese paper lantern with golden tassels, slot machine symbol, clean icon on dark red background, ultra detailed 3d render",
            "s2_fan": "a golden Chinese folding fan with dragon pattern, slot machine symbol, clean icon on dark red background, ultra detailed 3d render",
            "s3_koi": "a golden koi fish swimming, slot machine symbol, clean icon on dark red background, ultra detailed 3d render, lucky",
            "s4_jade": "a jade green gemstone carved into a dragon, slot machine symbol, clean icon on dark red background, ultra detailed 3d render",
            "s5_dragon_pearl": "a brilliant golden dragon pearl with fire, slot machine symbol, clean icon on dark red background, ultra detailed 3d render, premium",
            "wild_dragon": "a golden Chinese dragon face with WILD text, slot machine wild symbol, clean icon on dark red background, ultra detailed 3d render"
        },
        "seed_base": 6600
    },
    "pharaoh_legacy": {
        "theme": "ancient Egyptian tomb, golden sarcophagus, hieroglyphs",
        "bg": "dark sandy brown-gold gradient background",
        "symbols": {
            "s1_hieroglyph": "ancient Egyptian hieroglyphic tablet in gold, slot machine symbol, clean icon on dark sandy background, ultra detailed 3d render",
            "s2_sphinx": "a golden sphinx statue head, slot machine symbol, clean icon on dark sandy background, ultra detailed 3d render, ancient",
            "s3_pyramid": "a golden pyramid with glowing eye at top, slot machine symbol, clean icon on dark sandy background, ultra detailed 3d render",
            "s4_golden_cobra": "a golden cobra snake with ruby eyes, slot machine symbol, clean icon on dark sandy background, ultra detailed 3d render",
            "s5_pharaoh_mask": "a golden pharaoh death mask with blue and gold, slot machine symbol, clean icon on dark sandy background, ultra detailed 3d render, premium",
            "wild_papyrus": "a glowing golden papyrus scroll with WILD text, slot machine wild symbol, clean icon on dark sandy background, ultra detailed 3d render"
        },
        "seed_base": 6700
    },
    "quantum_burst": {
        "theme": "sci-fi quantum physics, neon purple and cyan, particle effects",
        "bg": "dark purple-black gradient background",
        "symbols": {
            "s1_atom": "a glowing neon atom with orbiting electrons, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render, sci-fi",
            "s2_electron": "a neon cyan electron particle orb, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render, energy",
            "s3_proton": "a neon red proton particle sphere, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render, glowing",
            "s4_neutron": "a neon green neutron particle, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render, radioactive glow",
            "s5_plasma_orb": "a brilliant plasma energy orb with lightning, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render, premium",
            "wild_quantum": "a quantum portal vortex with WILD text and particles, slot machine wild symbol, clean icon on dark purple background, ultra detailed 3d render"
        },
        "seed_base": 6800
    },
    "olympian_gods": {
        "theme": "Greek mythology gods, marble temple, golden sunset",
        "bg": "dark orange-amber gradient background",
        "symbols": {
            "s1_harp": "a golden Greek harp lyre instrument, slot machine symbol, clean icon on dark orange background, ultra detailed 3d render",
            "s2_helmet": "a golden Spartan warrior helmet, slot machine symbol, clean icon on dark orange background, ultra detailed 3d render, metallic",
            "s3_pegasus": "a white winged Pegasus horse, slot machine symbol, clean icon on dark orange background, ultra detailed 3d render, mythical",
            "s4_olive_branch": "a golden olive branch wreath, slot machine symbol, clean icon on dark orange background, ultra detailed 3d render",
            "s5_golden_apple": "a divine golden apple with celestial glow, slot machine symbol, clean icon on dark orange background, ultra detailed 3d render, premium",
            "wild_olympian": "three Greek gods faces with golden WILD text, slot machine wild symbol, clean icon on dark orange background, ultra detailed 3d render"
        },
        "seed_base": 6900
    },
    "twin_helix": {
        "theme": "retro neon synthwave, 80s arcade, purple and pink",
        "bg": "dark neon purple-black gradient background",
        "symbols": {
            "s1_cherry_neon": "neon glowing red cherries with pink outline, slot machine symbol, clean icon on dark neon purple background, ultra detailed 3d render, retro",
            "s2_bar_neon": "neon glowing BAR text in cyan, slot machine symbol, clean icon on dark neon purple background, ultra detailed 3d render, retro arcade",
            "s3_bell_neon": "neon glowing golden bell with pink outline, slot machine symbol, clean icon on dark neon purple background, ultra detailed 3d render",
            "s4_seven_neon": "neon glowing lucky number 7 in red and gold, slot machine symbol, clean icon on dark neon purple background, ultra detailed 3d render",
            "s5_diamond_neon": "neon glowing diamond with rainbow prismatic light, slot machine symbol, clean icon on dark neon purple background, ultra detailed 3d render",
            "wild_helix": "a spinning DNA double helix in neon purple with WILD text, slot machine wild symbol, clean icon on dark neon purple background, ultra detailed 3d render"
        },
        "seed_base": 7000
    },
    "golden_fortune": {
        "theme": "luxury millionaire lifestyle, gold and black, wealth",
        "bg": "dark gold-black gradient background",
        "symbols": {
            "s1_champagne": "a champagne bottle popping with golden bubbles, slot machine symbol, clean icon on dark gold-black background, ultra detailed 3d render",
            "s2_yacht": "a luxury golden yacht, slot machine symbol, clean icon on dark gold-black background, ultra detailed 3d render, wealth",
            "s3_watch": "a golden Rolex luxury watch with diamonds, slot machine symbol, clean icon on dark gold-black background, ultra detailed 3d render",
            "s4_ring_gold": "a massive golden diamond ring, slot machine symbol, clean icon on dark gold-black background, ultra detailed 3d render, luxury",
            "s5_limo": "a golden luxury limousine car, slot machine symbol, clean icon on dark gold-black background, ultra detailed 3d render, premium wealth",
            "wild_fortune": "a golden fortune wheel with WILD text and money, slot machine wild symbol, clean icon on dark gold-black background, ultra detailed 3d render"
        },
        "seed_base": 7100
    },
    "island_tiki": {
        "theme": "tropical Hawaiian island, tiki bar, palm trees and ocean",
        "bg": "dark teal-green gradient background",
        "symbols": {
            "s1_coconut": "a split coconut with tropical drink and umbrella, slot machine symbol, clean icon on dark teal background, ultra detailed 3d render",
            "s2_hibiscus": "a bright pink hibiscus tropical flower, slot machine symbol, clean icon on dark teal background, ultra detailed 3d render",
            "s3_ukulele": "a wooden ukulele instrument with flowers, slot machine symbol, clean icon on dark teal background, ultra detailed 3d render",
            "s4_tiki_mask": "a colorful carved wooden tiki mask, slot machine symbol, clean icon on dark teal background, ultra detailed 3d render, tribal",
            "s5_golden_idol": "a golden tiki idol statue with emerald eyes, slot machine symbol, clean icon on dark teal background, ultra detailed 3d render, premium",
            "wild_tiki": "a giant tiki face with flaming torches and WILD text, slot machine wild symbol, clean icon on dark teal background, ultra detailed 3d render"
        },
        "seed_base": 7200
    },
    "sakura_princess": {
        "theme": "Japanese cherry blossom, anime princess, pink and purple",
        "bg": "dark pink-purple gradient background",
        "symbols": {
            "s1_cherry_blossom": "a beautiful pink cherry blossom branch with petals, slot machine symbol, clean icon on dark pink background, ultra detailed 3d render",
            "s2_origami": "a golden origami crane bird, slot machine symbol, clean icon on dark pink background, ultra detailed 3d render, Japanese art",
            "s3_katana": "a silver katana sword with ornate golden handle, slot machine symbol, clean icon on dark pink background, ultra detailed 3d render",
            "s4_moon_fan": "a Japanese paper fan with moon and sakura design, slot machine symbol, clean icon on dark pink background, ultra detailed 3d render",
            "s5_jade_dragon": "a jade and gold dragon statue, slot machine symbol, clean icon on dark pink background, ultra detailed 3d render, premium",
            "wild_sakura": "a beautiful anime princess face with sakura petals and WILD text, slot machine wild symbol, clean icon on dark pink background, ultra detailed 3d render"
        },
        "seed_base": 7300
    },
    "ares_blade": {
        "theme": "ancient Greek war, blood and iron, Spartan battle",
        "bg": "dark crimson-black gradient background",
        "symbols": {
            "s1_dagger": "a golden Greek battle dagger, slot machine symbol, clean icon on dark crimson background, ultra detailed 3d render, weapon",
            "s2_shield_war": "a bronze battle-scarred warrior shield, slot machine symbol, clean icon on dark crimson background, ultra detailed 3d render",
            "s3_spear": "a golden war spear with blood-red tip, slot machine symbol, clean icon on dark crimson background, ultra detailed 3d render",
            "s4_war_helm": "a bronze Spartan war helmet with red crest, slot machine symbol, clean icon on dark crimson background, ultra detailed 3d render",
            "s5_blood_gem": "a blood-red ruby gemstone with dark fire, slot machine symbol, clean icon on dark crimson background, ultra detailed 3d render, premium",
            "wild_ares": "Ares god of war face portrait with flaming eyes, slot machine wild symbol, clean icon on dark crimson background, ultra detailed 3d render"
        },
        "seed_base": 7400
    },
    "neon_nights": {
        "theme": "Miami Vice neon city, 80s nightlife, pink and cyan",
        "bg": "dark neon pink-black gradient background",
        "symbols": {
            "s1_dice": "neon glowing casino dice with pink outline, slot machine symbol, clean icon on dark neon background, ultra detailed 3d render",
            "s2_cocktail": "a neon colored cocktail drink with cherry, slot machine symbol, clean icon on dark neon background, ultra detailed 3d render, nightlife",
            "s3_sports_car": "a neon pink sports car with cyan lights, slot machine symbol, clean icon on dark neon background, ultra detailed 3d render, Miami",
            "s4_cash_stack": "a neon glowing stack of cash money, slot machine symbol, clean icon on dark neon background, ultra detailed 3d render",
            "s5_vip_chip": "a golden VIP casino chip with diamond center, slot machine symbol, clean icon on dark neon background, ultra detailed 3d render, premium",
            "wild_neon": "a neon sign reading WILD with palm trees and flamingo, slot machine wild symbol, clean icon on dark neon background, ultra detailed 3d render"
        },
        "seed_base": 7500
    },
    "viking_voyage": {
        "theme": "Norse Viking sea adventure, ice and fire, longships",
        "bg": "dark steel blue gradient background",
        "symbols": {
            "s1_axe": "a Viking battle axe with runes, slot machine symbol, clean icon on dark steel blue background, ultra detailed 3d render, Norse",
            "s2_horn": "a golden Viking drinking horn, slot machine symbol, clean icon on dark steel blue background, ultra detailed 3d render, Norse",
            "s3_rune": "a glowing blue Norse rune stone, slot machine symbol, clean icon on dark steel blue background, ultra detailed 3d render, magical",
            "s4_longship": "a Viking longship with dragon prow, slot machine symbol, clean icon on dark steel blue background, ultra detailed 3d render",
            "s5_odin_eye": "Odin's all-seeing eye with golden light, slot machine symbol, clean icon on dark steel blue background, ultra detailed 3d render, premium",
            "wild_viking": "a fierce Viking warrior face with horned helmet and WILD text, slot machine wild symbol, clean icon on dark steel blue background, ultra detailed 3d render"
        },
        "seed_base": 7600
    },
    "diamond_vault": {
        "theme": "luxury diamond heist, vault, blue and silver",
        "bg": "dark deep blue-silver gradient background",
        "symbols": {
            "s1_sapphire": "a brilliant blue sapphire gemstone with light rays, slot machine symbol, clean icon on dark blue background, ultra detailed 3d render",
            "s2_ruby": "a brilliant red ruby gemstone with fire sparkles, slot machine symbol, clean icon on dark blue background, ultra detailed 3d render",
            "s3_emerald_cut": "a brilliant green emerald in princess cut, slot machine symbol, clean icon on dark blue background, ultra detailed 3d render",
            "s4_black_diamond": "a rare black diamond with dark rainbow reflections, slot machine symbol, clean icon on dark blue background, ultra detailed 3d render",
            "s5_crown_jewel": "a magnificent diamond-studded royal crown, slot machine symbol, clean icon on dark blue background, ultra detailed 3d render, premium",
            "wild_vault": "a vault door opening with diamonds and WILD text, slot machine wild symbol, clean icon on dark blue background, ultra detailed 3d render"
        },
        "seed_base": 7700
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
