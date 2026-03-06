"""
Generate SDXL-Turbo thumbnails for the 20 new slot games added 2026-02-27.
Seeds are in the 9400-9780 range (no overlap with previous scripts).
Run: py -3.10 scripts/gen_batch2_thumbnails.py
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
    size_kb = os.path.getsize(path) / 1024
    print(f"  [OK] {os.path.basename(path)}  ({size_kb:.0f} KB)")
    return img


# 20 new game thumbnails — seeds 9400-9780
THUMBNAILS = [
    # NovaSpin Studios — Galactic Raiders (space alien invasion)
    ("galactic_raiders",
     "Deep space alien invasion with massive UFO mothership firing laser beams, green alien queen, "
     "glowing asteroids, space fighters in dogfight, galaxy nebula and stars, cosmic slot game thumbnail, "
     "vibrant neon purple deep space, ultra detailed digital art",
     9400),

    # NovaSpin Studios — Nova Blackhole (cosmic cluster)
    ("nova_blackhole",
     "Swirling cosmic black hole consuming stars and nebulae, bright accretion disk of purple and violet light, "
     "comets and neutron stars spiraling inward, deep void of absolute darkness, "
     "slot game thumbnail, ethereal cosmic, ultra detailed digital art",
     9420),

    # NeonCore Labs — Agent Zero (spy thriller)
    ("agent_zero",
     "Sleek secret agent silhouette in black tuxedo holding silenced pistol, laser targeting sight, "
     "briefcase with gadgets, blurred city lights backdrop, spy thriller aesthetic "
     "on deep navy blue darkness, slot game thumbnail, cinematic, ultra detailed digital art",
     9440),

    # PhantomWorks — Black Ops Heist (military heist)
    ("black_ops_heist",
     "Military black ops team in tactical gear rappelling into a massive vault, night vision goggles, "
     "detonator, glowing vault door cracked open, stacks of cash illuminated by flashlights "
     "on dark charcoal grey background, slot game thumbnail, tactical thriller, ultra detailed digital art",
     9460),

    # IronReel Entertainment — Dragon Forge (medieval dragon)
    ("dragon_forge",
     "Mighty red dragon breathing fire into a blacksmith forge, glowing molten iron anvil, "
     "dragon scales armor, forge hammer striking dragon-forged sword crackling with fire energy, "
     "dragonscale and dragon egg on deep crimson ember background, slot game thumbnail, epic, ultra detailed digital art",
     9480),

    # GoldenEdge Gaming — Castle Siege (medieval)
    ("castle_siege",
     "Epic medieval castle siege with massive catapults launching flaming boulders, "
     "armored knights charging with swords and shields, stone siege tower at battlements, "
     "king knight on horseback leading cavalry on stormy grey background, slot game thumbnail, epic battle, ultra detailed digital art",
     9500),

    # ArcadeForge — World Cup Glory (football/soccer)
    ("world_cup_glory",
     "Football championship glory with glowing golden trophy overflowing with confetti, "
     "packed roaring stadium crowd, golden football boot kicking ball into net goal, "
     "champion lifting the cup in triumphant celebration on vivid green gold background, "
     "slot game thumbnail, sports champion, ultra detailed digital art",
     9520),

    # NeonCore Labs — Grand Prix Rush (F1 racing)
    ("grand_prix_rush",
     "Formula 1 race car at full speed leaving motion blur trails on night circuit, "
     "sparks flying from chassis, F1 racing helmet and gloves, checkered flag waving at finish line, "
     "pit crew in action on dark black-red racing background, slot game thumbnail, speed, ultra detailed digital art",
     9540),

    # Celestial Plays — Gold Crown Club (luxury VIP)
    ("gold_crown_club",
     "Ultra-luxurious VIP casino club with gleaming gold crown centerpiece, "
     "crystal champagne glasses, diamond rings and glittering jewelry, solid gold bars stacked, "
     "ornate vault key on deep gold-black opulent background, slot game thumbnail, luxury, ultra detailed digital art",
     9560),

    # VaultX Gaming — Monaco Million (luxury Monaco)
    ("monaco_million",
     "Monaco billionaire lifestyle with superyacht on azure Mediterranean, luxury penthouse balcony, "
     "gleaming red supercar, roulette wheel and casino chips, billionaire in tuxedo "
     "on dark crimson-black glamour background, slot game thumbnail, ultra luxury, ultra detailed digital art",
     9580),

    # Desert Gold Studios — Rome Eternal (Ancient Rome)
    ("rome_eternal",
     "Ancient Roman Colosseum at golden sunset with Roman Eagle banner, Julius Caesar in golden laurel wreath, "
     "legionnaire soldiers with shields and gladius swords, gladiator arena, "
     "ornate Roman columns on warm amber burnt gold background, slot game thumbnail, ancient epic, ultra detailed digital art",
     9600),

    # PhantomWorks — Cleopatra Gold (ancient Egypt queen)
    ("cleopatra_gold",
     "Majestic Cleopatra adorned in gleaming gold jewelry and headdress, golden asp serpent coiling, "
     "ibis bird, lotus flowers, Egyptian gold masks and cartouche hieroglyphs, "
     "eye of Horus radiating divine amber light on deep amber-gold background, slot game thumbnail, divine Egyptian, ultra detailed digital art",
     9620),

    # ArcadeForge — Pixel Rewind (retro 8-bit arcade)
    ("pixel_rewind",
     "Retro 8-bit arcade pixel art scene with glowing pixel invaders from space, pixel pac-dot trail, "
     "8-bit coin sprite, chunky pixel gun, classic arcade boss character in bright neon pixel art style, "
     "CRT screen glow effect on deep purple-green retro background, slot game thumbnail, nostalgia arcade, ultra detailed digital art",
     9640),

    # NovaSpin Studios — Thunder Hero (superhero)
    ("thunder_hero",
     "Powerful superhero with crackling yellow lightning powers, muscular hero in blue and gold costume "
     "with lightning bolt emblem and cape billowing, giant storm titan enemy in background, "
     "lightning bolts striking from dark stormy skies, slot game thumbnail, superhero epic, ultra detailed digital art",
     9660),

    # GoldenEdge Gaming — Solar Fist (solar superhero)
    ("solar_fist",
     "Solar energy superhero punching with blazing fist of concentrated sunlight, "
     "sun shield and power gloves radiating orange solar energy orbs, energy beams and solar flares, "
     "solar champion soaring above blazing orange sky, slot game thumbnail, solar power, ultra detailed digital art",
     9680),

    # GoldenEdge Gaming — Big Top Bonanza (circus)
    ("big_top_bonanza",
     "Spectacular circus big top with ringmaster in top hat and tailcoat, dazzling acrobats flying on trapeze, "
     "juggling balls in the air, tightrope walker, clown with oversized props, "
     "golden confetti and spotlights on vibrant red-gold carnival background, slot game thumbnail, circus spectacle, ultra detailed digital art",
     9700),

    # NovaSpin Studios — Clockwork Realm (steampunk)
    ("clockwork_realm",
     "Intricate steampunk clockwork realm with massive bronze gears and cogs turning, "
     "brass pocket watch face and compass, steam valves venting clouds, "
     "Victorian time traveler in goggles and coat at ornate machine on warm sepia-copper background, "
     "slot game thumbnail, steampunk adventure, ultra detailed digital art",
     9720),

    # ArcadeForge — Rockstar Wild (rock music)
    ("rockstar_wild",
     "Rock legend guitarist on stage with electric guitar crackling with purple lightning, "
     "massive amplifiers, drumsticks in motion, screaming crowd with lighters in dark arena, "
     "guitar pick and neon light show on deep purple-black rock stage, slot game thumbnail, rock concert, ultra detailed digital art",
     9740),

    # FrostByte Gaming — Snow Queen Riches (ice fantasy)
    ("snow_queen_riches",
     "Ethereal snow queen in crystalline ice gown and crown in a glittering ice palace, "
     "frost wolf companion, giant ice crystal pillars, magical snowflakes and diamond ice shards, "
     "aurora borealis shimmering on deep icy blue-white background, slot game thumbnail, ice fantasy, ultra detailed digital art",
     9760),

    # IronReel Entertainment — Jungle Fury (jungle predators)
    ("jungle_fury",
     "Primal jungle fury with roaring panther leaping from dense rainforest canopy, "
     "massive silverback gorilla beating chest, tribal drums and jungle vines, "
     "glowing spirit guardian emerging from ancient jungle ruins, "
     "on dark vibrant jungle green and orange background, slot game thumbnail, primal, ultra detailed digital art",
     9780),
]


if __name__ == "__main__":
    force = "--force" in sys.argv
    total_start = time.time()
    generated = 0
    skipped = 0

    for game_id, prompt, seed in THUMBNAILS:
        path = os.path.join(BASE_DIR, f"{game_id}.png")
        if os.path.exists(path) and not force:
            size_kb = os.path.getsize(path) / 1024
            if size_kb < 100:
                print(f"  [auto-force] {game_id}.png ({size_kb:.0f} KB) — regenerating")
            else:
                print(f"  [skip] {game_id}.png ({size_kb:.0f} KB)")
                skipped += 1
                continue
        generate(prompt, path, width=512, height=384, steps=4, seed=seed)
        generated += 1

    elapsed = time.time() - total_start
    print(f"\nDone! Generated {generated}, skipped {skipped}, in {elapsed:.1f}s")
    print(f"Output: {BASE_DIR}")
