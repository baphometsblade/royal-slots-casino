"""
Generate unique themed symbol sets for games 31-60 (batch 2).
Each game gets 5 unique symbols + 1 wild symbol = 6 symbols per game.
Symbols are 256x256 PNG with dark backgrounds matching the game theme.
"""

import os
import sys
import time
import torch
from diffusers import AutoPipelineForText2Image

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

GAME_SYMBOLS = {
    "madame_destiny": {
        "theme": "fortune teller, crystal ball, mystical purple",
        "bg": "dark purple-violet gradient background",
        "symbols": {
            "s1_candle": "a mystical purple burning candle with dripping wax, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render, magical glow",
            "s2_potion": "a magical potion bottle with glowing green liquid, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render, mystical",
            "s3_crystal_ball": "a glowing crystal ball on ornate stand, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render, purple magic",
            "s4_tarot": "a mystical tarot card with golden edges, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render, fortune",
            "s5_mystic_eye": "a brilliant all-seeing eye with purple energy, slot machine symbol, clean icon on dark purple background, ultra detailed 3d render, premium",
            "wild_destiny": "golden text WILD with crystal ball and stars, slot machine wild symbol, clean icon on dark purple background, ultra detailed 3d render"
        },
        "seed_base": 8000
    },
    "great_rhino": {
        "theme": "African savanna, safari animals, golden sunset",
        "bg": "dark savanna green-gold gradient background",
        "symbols": {
            "s1_flamingo": "a pink flamingo bird, slot machine symbol, clean icon on dark green-gold background, ultra detailed 3d render, safari",
            "s2_crocodile": "a fierce crocodile head, slot machine symbol, clean icon on dark green-gold background, ultra detailed 3d render, safari",
            "s3_gorilla": "a powerful silverback gorilla face, slot machine symbol, clean icon on dark green-gold background, ultra detailed 3d render",
            "s4_rhino": "a charging rhinoceros, slot machine symbol, clean icon on dark green-gold background, ultra detailed 3d render, powerful",
            "s5_savanna_gem": "a brilliant amber gemstone with savanna sunset, slot machine symbol, clean icon on dark green-gold background, ultra detailed 3d render, premium",
            "wild_rhino": "a golden rhino head with WILD text, slot machine wild symbol, clean icon on dark green-gold background, ultra detailed 3d render"
        },
        "seed_base": 8100
    },
    "bass_splash": {
        "theme": "deep sea fishing, ocean splash, tropical waters",
        "bg": "dark ocean teal-blue gradient background",
        "symbols": {
            "s1_worm": "a colorful fishing worm bait on hook, slot machine symbol, clean icon on dark teal background, ultra detailed 3d render",
            "s2_reel": "a golden fishing reel, slot machine symbol, clean icon on dark teal background, ultra detailed 3d render, metallic",
            "s3_net": "a fishing net with sea shells, slot machine symbol, clean icon on dark teal background, ultra detailed 3d render",
            "s4_marlin": "a blue marlin fish jumping from water, slot machine symbol, clean icon on dark teal background, ultra detailed 3d render, splash",
            "s5_golden_lure": "a brilliant golden fishing lure with diamonds, slot machine symbol, clean icon on dark teal background, ultra detailed 3d render, premium",
            "wild_splash": "a giant splash with golden WILD text and fish, slot machine wild symbol, clean icon on dark teal background, ultra detailed 3d render"
        },
        "seed_base": 8200
    },
    "dragon_megafire": {
        "theme": "Chinese imperial dragon, fire and gold, palace",
        "bg": "dark red-gold gradient background",
        "symbols": {
            "s1_coin_dragon": "a Chinese gold coin with dragon emblem, slot machine symbol, clean icon on dark red-gold background, ultra detailed 3d render",
            "s2_scroll": "an ancient Chinese scroll with golden seal, slot machine symbol, clean icon on dark red-gold background, ultra detailed 3d render",
            "s3_pagoda": "a golden Chinese pagoda temple, slot machine symbol, clean icon on dark red-gold background, ultra detailed 3d render",
            "s4_fire_dragon": "a fierce Chinese dragon breathing fire, slot machine symbol, clean icon on dark red-gold background, ultra detailed 3d render",
            "s5_imperial_seal": "a brilliant imperial jade seal with golden dragon, slot machine symbol, clean icon on dark red-gold background, ultra detailed 3d render, premium",
            "wild_megafire": "a fire-breathing dragon with WILD text in flames, slot machine wild symbol, clean icon on dark red-gold background, ultra detailed 3d render"
        },
        "seed_base": 8300
    },
    "esqueleto_fiesta": {
        "theme": "Day of the Dead, Mexican skulls, colorful fiesta",
        "bg": "dark orange-purple gradient background",
        "symbols": {
            "s1_guitar": "a colorful Mexican guitar with Day of Dead decorations, slot machine symbol, clean icon on dark orange-purple background, ultra detailed 3d render",
            "s2_trumpet": "a golden trumpet with Mexican flowers, slot machine symbol, clean icon on dark orange-purple background, ultra detailed 3d render",
            "s3_skull_red": "a red sugar skull with flower decorations, slot machine symbol, clean icon on dark orange-purple background, ultra detailed 3d render",
            "s4_skull_gold": "a golden sugar skull with jewels, slot machine symbol, clean icon on dark orange-purple background, ultra detailed 3d render",
            "s5_sugar_skull": "a brilliant diamond sugar skull with rainbow flowers, slot machine symbol, clean icon on dark orange-purple background, ultra detailed 3d render, premium",
            "wild_esqueleto": "a dancing skeleton mariachi with WILD text, slot machine wild symbol, clean icon on dark orange-purple background, ultra detailed 3d render"
        },
        "seed_base": 8400
    },
    "wildfire_gold": {
        "theme": "Wild West frontier, cowboys, gold rush, dusty",
        "bg": "dark dusty brown-gold gradient background",
        "symbols": {
            "s1_wanted_poster": "a Wild West wanted poster with bullet holes, slot machine symbol, clean icon on dark brown-gold background, ultra detailed 3d render",
            "s2_whiskey": "a whiskey bottle and shot glass, slot machine symbol, clean icon on dark brown-gold background, ultra detailed 3d render",
            "s3_dynamite": "sticks of dynamite with lit fuse, slot machine symbol, clean icon on dark brown-gold background, ultra detailed 3d render",
            "s4_sheriff_badge": "a shiny golden sheriff star badge, slot machine symbol, clean icon on dark brown-gold background, ultra detailed 3d render, metallic",
            "s5_gold_nugget": "a massive gold nugget with sparkles, slot machine symbol, clean icon on dark brown-gold background, ultra detailed 3d render, premium",
            "wild_wildfire": "a cowboy silhouette with golden WILD text and fire, slot machine wild symbol, clean icon on dark brown-gold background, ultra detailed 3d render"
        },
        "seed_base": 8500
    },
    "five_lions": {
        "theme": "Chinese lion dance, festival, red and gold lanterns",
        "bg": "dark red-gold Chinese gradient background",
        "symbols": {
            "s1_drum": "a Chinese festival drum with golden tassels, slot machine symbol, clean icon on dark red-gold background, ultra detailed 3d render",
            "s2_firecracker": "a red Chinese firecracker string, slot machine symbol, clean icon on dark red-gold background, ultra detailed 3d render",
            "s3_lion_dance": "a colorful Chinese lion dance head, slot machine symbol, clean icon on dark red-gold background, ultra detailed 3d render",
            "s4_golden_lion": "a majestic golden foo dog guardian lion, slot machine symbol, clean icon on dark red-gold background, ultra detailed 3d render",
            "s5_fortune_coin": "a brilliant golden fortune coin with dragon, slot machine symbol, clean icon on dark red-gold background, ultra detailed 3d render, premium",
            "wild_lions": "five golden lions with WILD text and lanterns, slot machine wild symbol, clean icon on dark red-gold background, ultra detailed 3d render"
        },
        "seed_base": 8600
    },
    "chilli_heat": {
        "theme": "Mexican spicy food, street market, vibrant colors",
        "bg": "dark red-orange gradient background",
        "symbols": {
            "s1_pepper_green": "a green jalapeño pepper, slot machine symbol, clean icon on dark red-orange background, ultra detailed 3d render, spicy",
            "s2_pepper_red": "a fiery red chili pepper with flames, slot machine symbol, clean icon on dark red-orange background, ultra detailed 3d render",
            "s3_chihuahua": "a cute chihuahua dog with sombrero, slot machine symbol, clean icon on dark red-orange background, ultra detailed 3d render",
            "s4_pinata": "a colorful Mexican piñata donkey, slot machine symbol, clean icon on dark red-orange background, ultra detailed 3d render",
            "s5_money_chilli": "a golden chili pepper filled with coins, slot machine symbol, clean icon on dark red-orange background, ultra detailed 3d render, premium",
            "wild_heat": "flaming chili peppers with golden WILD text, slot machine wild symbol, clean icon on dark red-orange background, ultra detailed 3d render"
        },
        "seed_base": 8700
    },
    "tombstone_reload": {
        "theme": "Wild West tombstone, dark cowboy, dusty frontier",
        "bg": "dark brown-red gradient background",
        "symbols": {
            "s1_boots": "a pair of dusty cowboy boots with spurs, slot machine symbol, clean icon on dark brown-red background, ultra detailed 3d render",
            "s2_revolver": "a silver revolver gun, slot machine symbol, clean icon on dark brown-red background, ultra detailed 3d render, metallic",
            "s3_wanted": "a WANTED dead or alive poster, slot machine symbol, clean icon on dark brown-red background, ultra detailed 3d render",
            "s4_outlaw": "a dark outlaw cowboy portrait with bandana, slot machine symbol, clean icon on dark brown-red background, ultra detailed 3d render",
            "s5_bounty_skull": "a skull with cowboy hat and crossed revolvers, slot machine symbol, clean icon on dark brown-red background, ultra detailed 3d render, premium",
            "wild_tombstone": "a tombstone cross with golden WILD text, slot machine wild symbol, clean icon on dark brown-red background, ultra detailed 3d render"
        },
        "seed_base": 8800
    },
    "mental_meltdown": {
        "theme": "asylum horror, neon green, scientific madness",
        "bg": "dark green-black gradient background",
        "symbols": {
            "s1_pill": "colorful medicine pills and capsules, slot machine symbol, clean icon on dark green-black background, ultra detailed 3d render, neon glow",
            "s2_syringe": "a glowing green syringe, slot machine symbol, clean icon on dark green-black background, ultra detailed 3d render, neon",
            "s3_straitjacket": "a white straitjacket, slot machine symbol, clean icon on dark green-black background, ultra detailed 3d render",
            "s4_electric": "electric shock therapy paddles with lightning, slot machine symbol, clean icon on dark green-black background, ultra detailed 3d render",
            "s5_brain": "a glowing neon green brain with electric sparks, slot machine symbol, clean icon on dark green-black background, ultra detailed 3d render, premium",
            "wild_mental": "cracked text WILD with neon green electric sparks, slot machine wild symbol, clean icon on dark green-black background, ultra detailed 3d render"
        },
        "seed_base": 8900
    },
    "san_quentin": {
        "theme": "prison escape, dark industrial, blue-grey steel",
        "bg": "dark steel grey-blue gradient background",
        "symbols": {
            "s1_handcuffs": "a pair of steel handcuffs, slot machine symbol, clean icon on dark grey-blue background, ultra detailed 3d render, metallic",
            "s2_key_ring": "a prison key ring with old keys, slot machine symbol, clean icon on dark grey-blue background, ultra detailed 3d render",
            "s3_guard": "a prison guard silhouette with flashlight, slot machine symbol, clean icon on dark grey-blue background, ultra detailed 3d render",
            "s4_razor_wire": "coiled razor barbed wire, slot machine symbol, clean icon on dark grey-blue background, ultra detailed 3d render",
            "s5_freedom_gem": "a brilliant blue freedom gemstone breaking chains, slot machine symbol, clean icon on dark grey-blue background, ultra detailed 3d render, premium",
            "wild_quentin": "broken prison bars with golden WILD text, slot machine wild symbol, clean icon on dark grey-blue background, ultra detailed 3d render"
        },
        "seed_base": 9000
    },
    "nitro_street": {
        "theme": "urban street art, neon graffiti, hip hop culture",
        "bg": "dark navy-neon green gradient background",
        "symbols": {
            "s1_spray_can": "a neon graffiti spray paint can, slot machine symbol, clean icon on dark navy-green background, ultra detailed 3d render, urban",
            "s2_boombox": "a retro boombox stereo with neon lights, slot machine symbol, clean icon on dark navy-green background, ultra detailed 3d render",
            "s3_skateboard": "a neon colored skateboard, slot machine symbol, clean icon on dark navy-green background, ultra detailed 3d render, urban",
            "s4_bulldog": "a tough bulldog with gold chain necklace, slot machine symbol, clean icon on dark navy-green background, ultra detailed 3d render",
            "s5_nitro_gem": "a brilliant neon green crystal with urban graffiti, slot machine symbol, clean icon on dark navy-green background, ultra detailed 3d render, premium",
            "wild_nitro": "neon graffiti text WILD with explosive colors, slot machine wild symbol, clean icon on dark navy-green background, ultra detailed 3d render"
        },
        "seed_base": 9100
    },
    "wild_toro": {
        "theme": "Spanish bullfight, matador, red and gold arena",
        "bg": "dark crimson-gold gradient background",
        "symbols": {
            "s1_cape": "a red bullfighting cape, slot machine symbol, clean icon on dark crimson-gold background, ultra detailed 3d render, flowing fabric",
            "s2_rose": "a red rose with thorns, slot machine symbol, clean icon on dark crimson-gold background, ultra detailed 3d render, romantic",
            "s3_sword": "an ornate bullfighter sword, slot machine symbol, clean icon on dark crimson-gold background, ultra detailed 3d render, metallic",
            "s4_matador": "a matador portrait with decorated hat, slot machine symbol, clean icon on dark crimson-gold background, ultra detailed 3d render",
            "s5_golden_horn": "a golden bull horn trophy, slot machine symbol, clean icon on dark crimson-gold background, ultra detailed 3d render, premium",
            "wild_toro": "a charging black bull with golden WILD text, slot machine wild symbol, clean icon on dark crimson-gold background, ultra detailed 3d render"
        },
        "seed_base": 9200
    },
    "jammin_fruits": {
        "theme": "disco party, funky jam jars, vibrant fruits",
        "bg": "dark purple-orange disco gradient background",
        "symbols": {
            "s1_strawberry": "a juicy red strawberry fruit, slot machine symbol, clean icon on dark purple-orange background, ultra detailed 3d render, glossy",
            "s2_orange": "a bright orange fruit with leaf, slot machine symbol, clean icon on dark purple-orange background, ultra detailed 3d render, juicy",
            "s3_raspberry": "a cluster of red raspberries, slot machine symbol, clean icon on dark purple-orange background, ultra detailed 3d render",
            "s4_plum_jar": "a glass jam jar filled with purple plum jam, slot machine symbol, clean icon on dark purple-orange background, ultra detailed 3d render",
            "s5_rainbow_fruit": "a rainbow-colored fruit with disco sparkles, slot machine symbol, clean icon on dark purple-orange background, ultra detailed 3d render, premium",
            "wild_jam": "a golden jam jar with WILD text and disco lights, slot machine wild symbol, clean icon on dark purple-orange background, ultra detailed 3d render"
        },
        "seed_base": 9300
    },
    "big_bamboo": {
        "theme": "Chinese bamboo forest, panda, zen garden",
        "bg": "dark bamboo green-gold gradient background",
        "symbols": {
            "s1_bamboo_shoot": "a fresh green bamboo shoot, slot machine symbol, clean icon on dark green-gold background, ultra detailed 3d render, natural",
            "s2_panda": "a cute giant panda face, slot machine symbol, clean icon on dark green-gold background, ultra detailed 3d render, adorable",
            "s3_temple_bell": "an ornate Chinese temple bell, slot machine symbol, clean icon on dark green-gold background, ultra detailed 3d render, golden",
            "s4_jade_frog": "a green jade money frog with coin, slot machine symbol, clean icon on dark green-gold background, ultra detailed 3d render",
            "s5_golden_bamboo": "a golden bamboo stalk with diamond accents, slot machine symbol, clean icon on dark green-gold background, ultra detailed 3d render, premium",
            "wild_bamboo": "golden panda on bamboo with WILD text, slot machine wild symbol, clean icon on dark green-gold background, ultra detailed 3d render"
        },
        "seed_base": 9400
    },
    "fat_rabbit": {
        "theme": "vegetable garden, cute rabbit, harvest",
        "bg": "dark green garden gradient background",
        "symbols": {
            "s1_carrot": "a large orange carrot with green top, slot machine symbol, clean icon on dark green background, ultra detailed 3d render, fresh",
            "s2_cabbage": "a fresh green cabbage head, slot machine symbol, clean icon on dark green background, ultra detailed 3d render",
            "s3_turnip": "a purple and white turnip, slot machine symbol, clean icon on dark green background, ultra detailed 3d render",
            "s4_fat_bunny": "a fat cute brown rabbit sitting, slot machine symbol, clean icon on dark green background, ultra detailed 3d render, adorable",
            "s5_golden_carrot": "a golden carrot with diamond sparkles, slot machine symbol, clean icon on dark green background, ultra detailed 3d render, premium",
            "wild_rabbit": "a giant fat rabbit with golden WILD text and carrots, slot machine wild symbol, clean icon on dark green background, ultra detailed 3d render"
        },
        "seed_base": 9500
    },
    "immortal_blood": {
        "theme": "gothic vampire romance, dark castle, blood red",
        "bg": "dark purple-crimson gradient background",
        "symbols": {
            "s1_castle": "a dark gothic vampire castle at night, slot machine symbol, clean icon on dark purple-crimson background, ultra detailed 3d render",
            "s2_blood_rose": "a red rose dripping with blood drops, slot machine symbol, clean icon on dark purple-crimson background, ultra detailed 3d render",
            "s3_wolf_moon": "a wolf howling at blood red moon, slot machine symbol, clean icon on dark purple-crimson background, ultra detailed 3d render",
            "s4_vampire_lady": "a beautiful vampire woman portrait with fangs, slot machine symbol, clean icon on dark purple-crimson background, ultra detailed 3d render",
            "s5_immortal_ring": "a brilliant ruby ring with bat wings, slot machine symbol, clean icon on dark purple-crimson background, ultra detailed 3d render, premium",
            "wild_immortal": "vampire fangs with blood WILD text, slot machine wild symbol, clean icon on dark purple-crimson background, ultra detailed 3d render"
        },
        "seed_base": 9600
    },
    "mega_safari": {
        "theme": "African safari adventure, jungle, golden savanna",
        "bg": "dark savanna orange-green gradient background",
        "symbols": {
            "s1_zebra": "a zebra head portrait, slot machine symbol, clean icon on dark orange-green background, ultra detailed 3d render, safari",
            "s2_giraffe": "a giraffe head and neck portrait, slot machine symbol, clean icon on dark orange-green background, ultra detailed 3d render",
            "s3_elephant": "a majestic African elephant head, slot machine symbol, clean icon on dark orange-green background, ultra detailed 3d render",
            "s4_lion_king": "a majestic male lion with golden mane, slot machine symbol, clean icon on dark orange-green background, ultra detailed 3d render, king",
            "s5_safari_diamond": "a brilliant golden diamond with African pattern, slot machine symbol, clean icon on dark orange-green background, ultra detailed 3d render, premium",
            "wild_safari": "a golden African tree with WILD text and sunset, slot machine wild symbol, clean icon on dark orange-green background, ultra detailed 3d render"
        },
        "seed_base": 9700
    },
    "lucha_mania": {
        "theme": "Mexican wrestling, colorful masks, arena",
        "bg": "dark green-gold arena gradient background",
        "symbols": {
            "s1_mask_blue": "a blue Mexican luchador wrestling mask, slot machine symbol, clean icon on dark green-gold background, ultra detailed 3d render",
            "s2_mask_red": "a red Mexican luchador wrestling mask, slot machine symbol, clean icon on dark green-gold background, ultra detailed 3d render",
            "s3_belt": "a golden wrestling championship belt, slot machine symbol, clean icon on dark green-gold background, ultra detailed 3d render, metallic",
            "s4_luchador": "a muscular luchador wrestler flexing, slot machine symbol, clean icon on dark green-gold background, ultra detailed 3d render",
            "s5_championship": "a golden championship trophy with stars, slot machine symbol, clean icon on dark green-gold background, ultra detailed 3d render, premium",
            "wild_lucha": "a luchador with golden WILD text and fireworks, slot machine wild symbol, clean icon on dark green-gold background, ultra detailed 3d render"
        },
        "seed_base": 9800
    },
    "extra_chilli": {
        "theme": "extreme spicy peppers, fire, scoville scale",
        "bg": "dark fiery red-yellow gradient background",
        "symbols": {
            "s1_jalapeno": "a green jalapeño pepper, slot machine symbol, clean icon on dark fiery red-yellow background, ultra detailed 3d render",
            "s2_habanero": "an orange habanero pepper on fire, slot machine symbol, clean icon on dark fiery red-yellow background, ultra detailed 3d render",
            "s3_ghost_pepper": "a red ghost pepper with smoke, slot machine symbol, clean icon on dark fiery red-yellow background, ultra detailed 3d render",
            "s4_carolina_reaper": "a fierce red Carolina Reaper pepper with flames, slot machine symbol, clean icon on dark fiery red-yellow background, ultra detailed 3d render",
            "s5_fire_crystal": "a brilliant fire crystal with molten core, slot machine symbol, clean icon on dark fiery red-yellow background, ultra detailed 3d render, premium",
            "wild_extra": "an explosion of fire peppers with WILD text, slot machine wild symbol, clean icon on dark fiery red-yellow background, ultra detailed 3d render"
        },
        "seed_base": 9900
    },
    "wanted_dead": {
        "theme": "Wild West outlaw, dusty canyon, old western",
        "bg": "dark canyon brown-orange gradient background",
        "symbols": {
            "s1_colt": "a silver Colt revolver, slot machine symbol, clean icon on dark brown-orange background, ultra detailed 3d render, metallic western",
            "s2_train": "a Wild West steam train, slot machine symbol, clean icon on dark brown-orange background, ultra detailed 3d render",
            "s3_gold_pan": "a gold panning pan with gold nuggets, slot machine symbol, clean icon on dark brown-orange background, ultra detailed 3d render",
            "s4_bandit": "a Wild West bandit with hat and bandana, slot machine symbol, clean icon on dark brown-orange background, ultra detailed 3d render",
            "s5_wanted_star": "a brilliant golden sheriff star with diamonds, slot machine symbol, clean icon on dark brown-orange background, ultra detailed 3d render, premium",
            "wild_wanted": "WANTED poster with golden WILD text, slot machine wild symbol, clean icon on dark brown-orange background, ultra detailed 3d render"
        },
        "seed_base": 10000
    },
    "chaos_crew": {
        "theme": "punk rock chaos, graffiti, urban destruction",
        "bg": "dark pink-teal gradient background",
        "symbols": {
            "s1_skully": "a punk skeleton with mohawk, slot machine symbol, clean icon on dark pink-teal background, ultra detailed 3d render, punk rock",
            "s2_cranky": "an angry punk monster face, slot machine symbol, clean icon on dark pink-teal background, ultra detailed 3d render",
            "s3_graffiti": "a spray paint graffiti tag, slot machine symbol, clean icon on dark pink-teal background, ultra detailed 3d render, urban",
            "s4_bomb": "a cartoon bomb with lit fuse and skull, slot machine symbol, clean icon on dark pink-teal background, ultra detailed 3d render",
            "s5_chaos_gem": "a brilliant shattered crystal with punk colors, slot machine symbol, clean icon on dark pink-teal background, ultra detailed 3d render, premium",
            "wild_chaos": "exploding WILD text with punk graphics, slot machine wild symbol, clean icon on dark pink-teal background, ultra detailed 3d render"
        },
        "seed_base": 10100
    },
    "le_bandit": {
        "theme": "French raccoon thief, Paris, heist comedy",
        "bg": "dark navy blue-purple gradient background",
        "symbols": {
            "s1_baguette": "a French baguette bread, slot machine symbol, clean icon on dark navy-purple background, ultra detailed 3d render",
            "s2_wine": "a French wine bottle and glass, slot machine symbol, clean icon on dark navy-purple background, ultra detailed 3d render",
            "s3_eiffel": "a golden miniature Eiffel Tower, slot machine symbol, clean icon on dark navy-purple background, ultra detailed 3d render",
            "s4_raccoon": "a cute raccoon thief with mask and striped tail, slot machine symbol, clean icon on dark navy-purple background, ultra detailed 3d render",
            "s5_diamond_bag": "a bag of stolen diamonds with sparkles, slot machine symbol, clean icon on dark navy-purple background, ultra detailed 3d render, premium",
            "wild_bandit": "a raccoon with golden WILD text and Eiffel Tower, slot machine wild symbol, clean icon on dark navy-purple background, ultra detailed 3d render"
        },
        "seed_base": 10200
    },
    "dead_alive": {
        "theme": "Wild West showdown, dusty saloon, high noon",
        "bg": "dark brown-red western gradient background",
        "symbols": {
            "s1_cowboy_boots": "a pair of leather cowboy boots, slot machine symbol, clean icon on dark brown-red background, ultra detailed 3d render, western",
            "s2_hat_western": "a dusty cowboy hat, slot machine symbol, clean icon on dark brown-red background, ultra detailed 3d render",
            "s3_gun_holster": "a leather gun holster with revolver, slot machine symbol, clean icon on dark brown-red background, ultra detailed 3d render",
            "s4_saloon": "Wild West saloon doors, slot machine symbol, clean icon on dark brown-red background, ultra detailed 3d render",
            "s5_sheriff_star": "a brilliant golden sheriff star badge, slot machine symbol, clean icon on dark brown-red background, ultra detailed 3d render, premium",
            "wild_dead": "crossed revolvers with golden WILD text, slot machine wild symbol, clean icon on dark brown-red background, ultra detailed 3d render"
        },
        "seed_base": 10300
    },
    "mega_joker": {
        "theme": "classic retro slot machine, joker, fruit, neon",
        "bg": "dark red-gold retro gradient background",
        "symbols": {
            "s1_cherry_classic": "a pair of glossy red cherries, slot machine symbol, clean icon on dark red-gold background, ultra detailed 3d render, classic retro",
            "s2_lemon_classic": "a bright yellow lemon, slot machine symbol, clean icon on dark red-gold background, ultra detailed 3d render, classic retro",
            "s3_grape_classic": "purple grape cluster, slot machine symbol, clean icon on dark red-gold background, ultra detailed 3d render, classic retro",
            "s4_bell_classic": "a golden liberty bell, slot machine symbol, clean icon on dark red-gold background, ultra detailed 3d render, classic retro",
            "s5_crown_classic": "a golden crown with red jewels, slot machine symbol, clean icon on dark red-gold background, ultra detailed 3d render, premium retro",
            "wild_joker_mega": "a colorful jester joker face, slot machine wild symbol, clean icon on dark red-gold background, ultra detailed 3d render, classic"
        },
        "seed_base": 10400
    },
    "crown_fire": {
        "theme": "phoenix fire, burning crown, ember and flame",
        "bg": "dark ember orange-red gradient background",
        "symbols": {
            "s1_torch": "a burning medieval torch, slot machine symbol, clean icon on dark ember orange-red background, ultra detailed 3d render, fire",
            "s2_brazier": "a golden fire brazier with flames, slot machine symbol, clean icon on dark ember orange-red background, ultra detailed 3d render",
            "s3_phoenix_feather": "a glowing phoenix feather on fire, slot machine symbol, clean icon on dark ember orange-red background, ultra detailed 3d render",
            "s4_fire_crown": "a golden crown engulfed in flames, slot machine symbol, clean icon on dark ember orange-red background, ultra detailed 3d render",
            "s5_flame_gem": "a brilliant fire opal gemstone with flames, slot machine symbol, clean icon on dark ember orange-red background, ultra detailed 3d render, premium",
            "wild_crown_fire": "a flaming phoenix with golden WILD text, slot machine wild symbol, clean icon on dark ember orange-red background, ultra detailed 3d render"
        },
        "seed_base": 10500
    },
    "olympus_dream": {
        "theme": "Greek gods, Olympus clouds, divine gold and blue",
        "bg": "dark divine blue-gold gradient background",
        "symbols": {
            "s1_hera": "Greek goddess Hera portrait with peacock crown, slot machine symbol, clean icon on dark blue-gold background, ultra detailed 3d render",
            "s2_athena": "Greek goddess Athena with owl and shield, slot machine symbol, clean icon on dark blue-gold background, ultra detailed 3d render",
            "s3_apollo": "Greek god Apollo with golden lyre, slot machine symbol, clean icon on dark blue-gold background, ultra detailed 3d render",
            "s4_ares_god": "Greek god Ares with war helmet and sword, slot machine symbol, clean icon on dark blue-gold background, ultra detailed 3d render",
            "s5_zeus_orb": "a brilliant golden orb with lightning bolts, slot machine symbol, clean icon on dark blue-gold background, ultra detailed 3d render, premium",
            "wild_dream": "golden clouds with WILD text and lightning, slot machine wild symbol, clean icon on dark blue-gold background, ultra detailed 3d render"
        },
        "seed_base": 10600
    },
    "goldstorm_ultra": {
        "theme": "electric gold storm, lightning, yellow and purple",
        "bg": "dark gold-purple electric gradient background",
        "symbols": {
            "s1_gold_coin_storm": "a spinning golden coin with electric sparks, slot machine symbol, clean icon on dark gold-purple background, ultra detailed 3d render",
            "s2_thunder_cloud": "a dark storm cloud with golden lightning, slot machine symbol, clean icon on dark gold-purple background, ultra detailed 3d render",
            "s3_storm_bolt": "a golden lightning bolt with electric energy, slot machine symbol, clean icon on dark gold-purple background, ultra detailed 3d render",
            "s4_golden_eagle_storm": "a golden eagle in a lightning storm, slot machine symbol, clean icon on dark gold-purple background, ultra detailed 3d render",
            "s5_ultra_gem": "a brilliant golden diamond with electric aura, slot machine symbol, clean icon on dark gold-purple background, ultra detailed 3d render, premium",
            "wild_goldstorm": "golden storm with electric WILD text, slot machine wild symbol, clean icon on dark gold-purple background, ultra detailed 3d render"
        },
        "seed_base": 10700
    },
    "fire_hole": {
        "theme": "mining explosion, underground mine, dynamite",
        "bg": "dark mine brown-orange gradient background",
        "symbols": {
            "s1_pickaxe": "a mining pickaxe with wooden handle, slot machine symbol, clean icon on dark brown-orange background, ultra detailed 3d render",
            "s2_mine_cart": "a mine cart full of gold ore, slot machine symbol, clean icon on dark brown-orange background, ultra detailed 3d render",
            "s3_tnt": "a bundle of TNT dynamite sticks with fuse, slot machine symbol, clean icon on dark brown-orange background, ultra detailed 3d render",
            "s4_lantern_mine": "an old mining lantern with warm glow, slot machine symbol, clean icon on dark brown-orange background, ultra detailed 3d render",
            "s5_gold_vein": "a brilliant gold vein in rock with crystals, slot machine symbol, clean icon on dark brown-orange background, ultra detailed 3d render, premium",
            "wild_xbomb": "an exploding bomb with golden WILD text, slot machine wild symbol, clean icon on dark brown-orange background, ultra detailed 3d render"
        },
        "seed_base": 10800
    },
    "merlin_power": {
        "theme": "medieval wizard, magic spells, enchanted forest",
        "bg": "dark purple-cyan magical gradient background",
        "symbols": {
            "s1_spell_book": "an ancient spell book with glowing runes, slot machine symbol, clean icon on dark purple-cyan background, ultra detailed 3d render, magical",
            "s2_wand_crystal": "a crystal-tipped magic wand with sparkles, slot machine symbol, clean icon on dark purple-cyan background, ultra detailed 3d render",
            "s3_cauldron": "a bubbling cauldron with green potion, slot machine symbol, clean icon on dark purple-cyan background, ultra detailed 3d render",
            "s4_merlin_owl": "a wise owl with purple magical aura, slot machine symbol, clean icon on dark purple-cyan background, ultra detailed 3d render",
            "s5_arcane_orb": "a brilliant arcane crystal orb with cosmic energy, slot machine symbol, clean icon on dark purple-cyan background, ultra detailed 3d render, premium",
            "wild_merlin": "wizard hat and beard with golden WILD text, slot machine wild symbol, clean icon on dark purple-cyan background, ultra detailed 3d render"
        },
        "seed_base": 10900
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
