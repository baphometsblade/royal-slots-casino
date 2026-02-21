"""
Generate themed thumbnails for ALL 60 slot games.
Each thumbnail is 400x300 PNG, portraying the game's visual theme.
Skips existing thumbnails unless --force is passed.
"""

import os
import sys
import time
import torch
from diffusers import AutoPipelineForText2Image

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

BASE_DIR = r"C:\created games\Casino\assets\thumbnails"
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

def generate(prompt, path, width=512, height=384, steps=4, guidance=0.0, seed=None):
    gen = torch.Generator("cuda")
    if seed is not None:
        gen.manual_seed(seed)
    img = pipe(
        prompt=prompt,
        num_inference_steps=steps,
        guidance_scale=guidance,
        width=width,
        height=height,
        generator=gen,
    ).images[0]
    img.save(path, quality=95)
    print(f"  [OK] {os.path.basename(path)}")
    return img

# All 60 game thumbnails: (game_id, prompt, seed)
THUMBNAILS = [
    # Batch 1 (games 1-12 — original)
    ("sugar_rush", "A colorful candy wonderland with lollipops, gummy bears, candy canes, cupcakes, and sparkling gems on a pink-purple gradient background, slot game thumbnail, vibrant, ultra detailed digital art", 3000),
    ("lucky_777", "Tropical fruits exploding from a slot machine - bananas, grapes, apples, watermelons with pink-purple hearts and confetti, slot game thumbnail, vibrant, ultra detailed digital art", 3100),
    ("gates_olympus", "Ancient Greek temple on Mount Olympus with lightning bolts, golden pillars, divine clouds and mystical blue-gold light, slot game thumbnail, epic, ultra detailed digital art", 3200),
    ("black_bull", "A powerful charging black bull with red glowing eyes on dark background with golden coins and diamonds scattered, slot game thumbnail, dramatic, ultra detailed digital art", 3300),
    ("hot_chillies", "Mexican fiesta scene with red chili peppers, tacos, maracas, and sombreros on fiery red-orange gradient, slot game thumbnail, spicy, ultra detailed digital art", 3400),
    ("super_hot", "Classic slot machine fruits - cherries, lemons, plums, golden bells and stars on fiery orange-gold gradient background, slot game thumbnail, retro, ultra detailed digital art", 3500),
    ("wolf_gold", "A majestic golden wolf howling at the full moon on a desert canyon at sunset, totem poles and eagle feathers, slot game thumbnail, epic, ultra detailed digital art", 3600),
    ("big_bass", "A giant bass fish jumping out of sparkling blue water with fishing tackle, hooks and golden treasure, slot game thumbnail, splash, ultra detailed digital art", 3700),
    ("fire_joker", "A fiery jester clown juggling flaming cards and stars on dark red-orange background with fire effects, slot game thumbnail, dramatic, ultra detailed digital art", 3800),
    ("book_dead", "Ancient Egyptian tomb with golden sarcophagus, Book of Dead, scarab beetles, Eye of Horus, and Anubis statue, slot game thumbnail, mystical, ultra detailed digital art", 3900),
    ("starburst_xxl", "Cosmic gemstones floating in space - red, blue, green, yellow, purple crystals with starburst explosion and nebula, slot game thumbnail, cosmic, ultra detailed digital art", 4000),
    ("gonzos_quest", "Ancient Aztec temple in a lush jungle with stone face masks, emeralds, golden masks and cascading waterfalls, slot game thumbnail, adventure, ultra detailed digital art", 4100),

    # Batch 1 (games 13-30 — first expansion)
    ("starlight_princess", "An anime magical princess with rainbow crystal hearts, magic wands, tiaras and glowing stars on pastel pink-teal gradient, slot game thumbnail, kawaii, ultra detailed digital art", 4200),
    ("olympus_rising", "A Greek god rising from stormy seas with trident, shield, laurel crown and thunderbolts on dramatic sky, slot game thumbnail, epic, ultra detailed digital art", 4300),
    ("buffalo_stampede", "A stampede of buffalo charging across American prairie at golden sunset with cactus and horseshoes, slot game thumbnail, wild west, ultra detailed digital art", 4400),
    ("puppy_palace", "Adorable puppies in a cozy palace with bones, collars, paw prints and golden bowls on green garden background, slot game thumbnail, cute, ultra detailed digital art", 4500),
    ("crimson_fang", "A gothic vampire castle with bats, coffins, crosses and blood-red moon on dark crimson background, slot game thumbnail, horror, ultra detailed digital art", 4600),
    ("pirate_fortune", "A pirate ship with treasure chest, compass, anchor, skull and crossbones on stormy ocean background, slot game thumbnail, adventure, ultra detailed digital art", 4700),
    ("lucky_dragon", "A Chinese golden dragon with red lanterns, jade, fans and koi fish on red-gold festive background, slot game thumbnail, fortune, ultra detailed digital art", 4800),
    ("pharaoh_legacy", "Ancient Egyptian pharaoh with golden mask, sphinx, pyramids, hieroglyphs and cobra on golden-brown background, slot game thumbnail, mystical, ultra detailed digital art", 4900),
    ("quantum_burst", "Sci-fi quantum physics scene with atoms, electrons, protons and plasma orbs on neon purple-cyan background, slot game thumbnail, futuristic, ultra detailed digital art", 5000),
    ("olympian_gods", "Three Greek gods on marble temple with harp, pegasus, golden apples and olive branches on orange-gold background, slot game thumbnail, mythical, ultra detailed digital art", 5100),
    ("twin_helix", "Retro neon synthwave scene with neon cherries, bars, bells and diamonds on dark purple-pink background, slot game thumbnail, 80s, ultra detailed digital art", 5200),
    ("golden_fortune", "Luxury millionaire lifestyle with champagne, yacht, gold watches, diamond rings and limousine on gold-black background, slot game thumbnail, luxury, ultra detailed digital art", 5300),
    ("island_tiki", "Tropical Hawaiian island with tiki masks, coconuts, hibiscus flowers, ukulele and golden idol on teal-green background, slot game thumbnail, tropical, ultra detailed digital art", 5400),
    ("sakura_princess", "Japanese anime princess with cherry blossoms, origami, katana, moon fan and jade dragon on pink-purple background, slot game thumbnail, anime, ultra detailed digital art", 5500),
    ("ares_blade", "Ancient Spartan warrior with daggers, war shields, spears and blood gems on dark red-orange battlefield, slot game thumbnail, war, ultra detailed digital art", 5600),
    ("neon_nights", "Miami Vice neon city at night with dice, cocktails, sports cars and cash stacks on pink-cyan neon background, slot game thumbnail, 80s, ultra detailed digital art", 5700),
    ("viking_voyage", "Viking longship in icy Nordic seas with axes, horns, runes and Odin's eye on blue-grey stormy background, slot game thumbnail, epic, ultra detailed digital art", 5800),
    ("diamond_vault", "A luxury diamond vault with sapphires, rubies, emeralds, black diamonds and crown jewels on blue-silver background, slot game thumbnail, luxury, ultra detailed digital art", 5900),

    # Batch 2 (games 31-60)
    ("madame_destiny", "A mystical fortune teller with crystal ball, tarot cards, candles and potions on dark purple-violet background, slot game thumbnail, mystical, ultra detailed digital art", 6000),
    ("great_rhino", "African savanna with rhinoceros, flamingos, gorillas and crocodiles at golden sunset, slot game thumbnail, safari, ultra detailed digital art", 6100),
    ("bass_splash", "Deep sea fishing scene with marlins, fishing reels, nets and golden lures splashing from ocean, slot game thumbnail, splash, ultra detailed digital art", 6200),
    ("dragon_megafire", "A massive Chinese imperial dragon breathing fire over golden pagodas and imperial seals, slot game thumbnail, epic, ultra detailed digital art", 6300),
    ("esqueleto_fiesta", "Day of the Dead celebration with colorful sugar skulls, guitars, trumpets and mariachi skeletons, slot game thumbnail, fiesta, ultra detailed digital art", 6400),
    ("wildfire_gold", "Wild West gold rush scene with wanted posters, dynamite, sheriff badges and gold nuggets at dusty sunset, slot game thumbnail, western, ultra detailed digital art", 6500),
    ("five_lions", "Chinese New Year celebration with five golden lion dance heads, drums, firecrackers and fortune coins, slot game thumbnail, festival, ultra detailed digital art", 6600),
    ("chilli_heat", "Mexican street market with spicy chili peppers, chihuahuas, pinatas and money chillis on fiery background, slot game thumbnail, spicy, ultra detailed digital art", 6700),
    ("tombstone_reload", "Dark Wild West tombstone scene with outlaws, revolvers, cowboy boots and bounty skulls on dusty background, slot game thumbnail, dark western, ultra detailed digital art", 6800),
    ("mental_meltdown", "Neon green mad scientist laboratory with pills, syringes, electric sparks and glowing brain, slot game thumbnail, horror, ultra detailed digital art", 6900),
    ("san_quentin", "A dark prison escape scene with handcuffs, razor wire, guards and breaking chains on steel-grey background, slot game thumbnail, intense, ultra detailed digital art", 7000),
    ("nitro_street", "Urban street art scene with spray cans, boomboxes, skateboards and neon graffiti on dark city background, slot game thumbnail, urban, ultra detailed digital art", 7100),
    ("wild_toro", "Spanish bullfighting arena with matador, red cape, roses and charging black bull on crimson-gold background, slot game thumbnail, dramatic, ultra detailed digital art", 7200),
    ("jammin_fruits", "Disco party scene with jam jars full of fruits, strawberries, oranges, raspberries and disco lights, slot game thumbnail, funky, ultra detailed digital art", 7300),
    ("big_bamboo", "Chinese bamboo forest with giant panda, jade frogs, temple bells and golden bamboo on green background, slot game thumbnail, zen, ultra detailed digital art", 7400),
    ("fat_rabbit", "A cute fat rabbit in a vegetable garden with giant carrots, cabbages, turnips and golden carrots, slot game thumbnail, cute, ultra detailed digital art", 7500),
    ("immortal_blood", "Gothic vampire romance scene with dark castle, blood roses, wolf howling at moon and ruby ring, slot game thumbnail, gothic, ultra detailed digital art", 7600),
    ("mega_safari", "African safari adventure with lion, elephant, giraffe, zebra and golden diamond at golden sunset, slot game thumbnail, epic safari, ultra detailed digital art", 7700),
    ("lucha_mania", "Mexican wrestling arena with colorful luchador masks, championship belts and fireworks, slot game thumbnail, wrestling, ultra detailed digital art", 7800),
    ("extra_chilli", "Extreme chili pepper collection from jalapeno to Carolina Reaper with fire and scoville flames, slot game thumbnail, extreme spicy, ultra detailed digital art", 7900),
    ("wanted_dead", "Wild West canyon showdown with outlaws, revolvers, trains and gold panning on dusty orange background, slot game thumbnail, outlaw, ultra detailed digital art", 8000),
    ("chaos_crew", "Punk rock chaos scene with graffiti skeletons, angry monsters, bombs and shattered crystals on pink-teal background, slot game thumbnail, punk, ultra detailed digital art", 8100),
    ("le_bandit", "A cute raccoon thief in Paris with baguettes, wine, Eiffel Tower and stolen diamonds on navy-purple background, slot game thumbnail, comedy heist, ultra detailed digital art", 8200),
    ("dead_alive", "Wild West high noon saloon showdown with cowboys, revolvers, holsters and sheriff stars on dusty background, slot game thumbnail, western, ultra detailed digital art", 8300),
    ("mega_joker", "Classic retro slot machine with cherries, lemons, grapes, golden bells and jester joker on red-gold background, slot game thumbnail, retro classic, ultra detailed digital art", 8400),
    ("crown_fire", "A flaming phoenix rising with burning crown, torches, braziers and fire opals on ember orange background, slot game thumbnail, fire, ultra detailed digital art", 8500),
    ("olympus_dream", "Greek gods Hera, Athena, Apollo and Ares on divine clouds with golden lightning and orbs, slot game thumbnail, divine, ultra detailed digital art", 8600),
    ("goldstorm_ultra", "Electric gold storm with spinning coins, lightning bolts, golden eagles and thunder clouds on gold-purple background, slot game thumbnail, electric, ultra detailed digital art", 8700),
    ("fire_hole", "Underground mine explosion with pickaxes, mine carts, TNT dynamite and golden ore veins on dark brown background, slot game thumbnail, explosive, ultra detailed digital art", 8800),
    ("merlin_power", "Medieval wizard Merlin casting spells with spell books, crystal wands, bubbling cauldron and wise owl, slot game thumbnail, magical, ultra detailed digital art", 8900),
]

if __name__ == "__main__":
    total_start = time.time()
    total_generated = 0
    total_skipped = 0

    for game_id, prompt, seed in THUMBNAILS:
        path = os.path.join(BASE_DIR, f"{game_id}.png")
        if os.path.exists(path) and "--force" not in sys.argv:
            print(f"  [skip] {game_id}.png")
            total_skipped += 1
            continue
        generate(prompt, path, width=512, height=384, steps=4, seed=seed)
        total_generated += 1

    elapsed = time.time() - total_start
    print(f"\nDone! Generated {total_generated} thumbnails, skipped {total_skipped}, in {elapsed:.1f}s")
    print(f"Output: {BASE_DIR}")
