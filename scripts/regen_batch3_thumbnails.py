"""
Regenerate SDXL-Turbo thumbnails for 21 active games with placeholder-quality thumbnails.
Includes Fortune Frog Rush (gold_rush_frog) plus 20 similar composited-quality images.
Seeds: 9800-10200 (no overlap with previous scripts).
Run: py -3.10 scripts/regen_batch3_thumbnails.py
     py -3.10 scripts/regen_batch3_thumbnails.py --force   (regenerate even if exists)
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


# 21 active games with placeholder thumbnails — seeds 9800-10200
THUMBNAILS = [
    # Celestial Plays — Crown of Power (regal royalty hold & win)
    ("power_crown",
     "Majestic royal crown encrusted with glowing rubies, sapphires and diamonds, "
     "gilded golden scepter and mystical orb radiating divine light, jeweled throne on cloud, "
     "purple-gold royal power beams on deep violet-gold opulent background, "
     "slot game thumbnail, regal epic, ultra detailed digital art",
     9800),

    # IronReel Entertainment — Loki's Wild Loot (Norse trickster)
    ("loki_loot",
     "Norse trickster god Loki with glowing green serpent eyes, golden ornate horned helmet, "
     "magical rune staff sparking with mischievous green fire energy, golden loot and potion vials scattered, "
     "Asgard lightning in dark Norse forest on vivid green-black shadow background, "
     "slot game thumbnail, Norse myth trickster, ultra detailed digital art",
     9820),

    # GoldenEdge Gaming — Tropical Fruit Party (tumble fruit)
    ("fruit_party",
     "Explosive tropical fruit party with giant glowing starfruit at center, ripe strawberries "
     "and oranges bursting with juice, plums and peaches in rainbow light beams, "
     "confetti cascade on vivid orange-purple tropical gradient background, "
     "slot game thumbnail, tropical fruit joy, ultra detailed digital art",
     9840),

    # GoldenEdge Gaming — Sweet Bonanza Blast (candy wonderland)
    ("sweet_bonanza",
     "Magical candy wonderland with giant rainbow lollipop swirls, sparkling candy hearts "
     "and star-shaped sweets, cotton candy clouds, bomb candy exploding in rainbow light, "
     "on dreamy pink-violet sugar background, "
     "slot game thumbnail, sweet candy magic, ultra detailed digital art",
     9860),

    # VaultX Gaming — Depth Charge (shark ocean)
    ("razor_shark",
     "Razor-sharp great white shark surging through deep ocean in action pose, "
     "depth charge explosions with underwater bubbles and shockwaves, scuba diver silhouette, "
     "glowing jellyfish tentacles, giant shark tooth on dark teal-cyan underwater background, "
     "slot game thumbnail, deep sea thriller, ultra detailed digital art",
     9880),

    # PhantomWorks — Eternal Romance (vampire gothic)
    ("eternal_romance",
     "Gothic vampire romance in candlelit stone castle, vampire lord with fangs in elegant Victorian coat, "
     "blood-red roses and flickering amber candles, stained glass moonlit window, "
     "dark bats circling on deep crimson-purple atmospheric gothic background, "
     "slot game thumbnail, vampire romance, ultra detailed digital art",
     9900),

    # IronReel Entertainment — Buffalo Blitz Extreme (plains stampede)
    ("buffalo_extreme",
     "Thundering extreme buffalo stampede with massive bison at sunset on American Great Plains, "
     "golden bald eagle soaring with outstretched wings, mountain cougar crouching, "
     "gold coin cascade, on warm burnt-orange sunset western background, "
     "slot game thumbnail, extreme wildlife, ultra detailed digital art",
     9920),

    # ArcadeForge — Coin Strike Deluxe (classic slots)
    ("coin_strike",
     "Classic casino slot machine jackpot strike with gleaming triple gold sevens on reels, "
     "golden bells ringing, BAR symbols, cherries, lemons, "
     "golden coins raining from jackpot, bright casino lights on rich gold background, "
     "slot game thumbnail, classic jackpot, ultra detailed digital art",
     9940),

    # Celestial Plays — Pots of Zeus (Greek gods)
    ("pots_olympus",
     "Zeus enthroned on Mount Olympus hurling lightning bolts, Poseidon with golden trident rising from sea, "
     "Apollo with golden lyre, Parthenon temple columns, glowing golden prize pots overflowing with coins "
     "on majestic blue-gold Olympian cloud background, "
     "slot game thumbnail, Greek gods epic, ultra detailed digital art",
     9960),

    # GoldenEdge Gaming — Dog House Unleashed (dogs)
    ("dog_house_mega",
     "Energetic unleashed dog madness with giant colorful bulldog and fierce doberman bursting out of dog house, "
     "giant glowing sparkling bones and paw prints raining down, "
     "pet collars with golden tags on playful green-orange bright background, "
     "slot game thumbnail, unleashed dogs fun, ultra detailed digital art",
     9980),

    # SolsticeFX — Volcano Coins (hold & win)
    ("coin_volcano",
     "Massive volcano erupting golden magma coins and fire rubies into the sky, "
     "glowing obsidian pillars around erupting crater, lava gems sparkling in molten rivers, "
     "magma coins raining down on dramatic orange-red volcanic background, "
     "slot game thumbnail, volcanic gold eruption, ultra detailed digital art",
     10000),

    # SolsticeFX — Fortune Frog Rush (gold rush frog miner)
    ("gold_rush_frog",
     "Lucky golden fortune frog wearing miner's helmet, striking a huge glowing gold nugget vein with a pickaxe, "
     "dynamite explosion revealing mother lode of gold coins, old oil lantern glowing in mine cave, "
     "gold coins cascading on vivid green and gold background, "
     "slot game thumbnail, fortune frog gold rush, ultra detailed digital art",
     10020),

    # IronReel Entertainment — Buffalo King Thunder (tumble)
    ("buffalo_mega",
     "Mighty Buffalo King wearing a storm crown amidst dramatic lightning strikes on Great Plains, "
     "magnificent black wild mustang rearing on hind legs, coyote howling at thunder, "
     "golden eagle diving on stormy dark brown-orange dramatic background, "
     "slot game thumbnail, buffalo king thunder, ultra detailed digital art",
     10040),

    # NovaSpin Studios — Alientonz (cluster tumble)
    ("reactoonz",
     "Colorful cartoon alien blobs with giant cute eyes — green, blue, pink, yellow, red — "
     "tumbling and bouncing in cluster, towering massive Gargantoon boss blob with glowing eyes emerging, "
     "alien energy explosions and neon trails on vibrant purple-cyan alien world background, "
     "slot game thumbnail, alien cartoon chaos, ultra detailed digital art",
     10060),

    # VaultX Gaming — Money Express 3 (Western train heist)
    ("money_train",
     "Wild West armored money train at full steam through desert canyon, "
     "sheriff star badge and six-shooter pistol, wanted posters flapping, "
     "dynamite explosion blowing open the money car, stacks of cash flying, "
     "on warm brown-orange Western sunset background, "
     "slot game thumbnail, Wild West train heist, ultra detailed digital art",
     10080),

    # PhantomWorks — Tome of Insanity (eldritch horror)
    ("tome_madness",
     "Ancient eldritch tome glowing with forbidden green madness runes, "
     "giant Cthulhu rising with writhing tentacles from dark void, cosmic eye staring from abyss, "
     "elder horror mask dissolving into swirling insanity, "
     "green-purple cosmic void energy on dark occult background, "
     "slot game thumbnail, cosmic eldritch horror, ultra detailed digital art",
     10100),

    # NovaSpin Studios — Gem Vault Bonanza (cluster tumble)
    ("gems_bonanza",
     "Magnificent gem vault explosion with giant brilliant cut diamond at center, "
     "emerald, sapphire, ruby, and topaz gems erupting in rainbow prismatic laser light, "
     "cascading precious gemstones tumbling through prismatic beams, "
     "on rich deep blue-purple treasure background, "
     "slot game thumbnail, gemstone bonanza, ultra detailed digital art",
     10120),

    # ArcadeForge — Vegas Frog Live (Elvis frog Vegas show)
    ("elvis_frog",
     "Charismatic frog in shimmering gold Elvis jumpsuit performing on neon Las Vegas stage, "
     "dazzling showgirl backup dancers with feather headdresses, cocktail glasses clinking, "
     "rolling dice and glowing neon casino signs, showbiz spotlights "
     "on brilliant red-gold Las Vegas extravaganza background, "
     "slot game thumbnail, Vegas frog show, ultra detailed digital art",
     10140),

    # NovaSpin Studios — Hip Hop Millions (tumble)
    ("snoop_dollars",
     "Hip hop millions gold rush with gleaming gold microphone, heavy platinum chains with diamond pendants, "
     "iconic fresh sneakers, vintage boombox blasting, golden crown dripping cash, "
     "stacks of dollars and gold records on rich purple-gold hip hop background, "
     "slot game thumbnail, hip hop gold millions, ultra detailed digital art",
     10160),

    # IronReel Entertainment — Valhalla Gems (Viking tumble)
    ("gemhalla",
     "Viking Valhalla realm with legendary gem-encrusted battle shield sparkling with gems, "
     "battle axe lodged in glowing runic stone, drinking horn overflowing with golden mead, "
     "glowing golden Viking helmet, Asgard rainbow bridge in stormy Norse clouds background, "
     "slot game thumbnail, Norse Viking Valhalla, ultra detailed digital art",
     10180),

    # NovaSpin Studios — Twin Helix (neon stacked wilds)
    ("twin_helix",
     "Twin neon DNA helix strands spiraling upward with glowing neon slot symbols embedded — "
     "neon cherries, bells, gold bars, lucky sevens, diamonds — intertwined in electric "
     "twin columns of pink-purple neon energy on deep black cyber background, "
     "slot game thumbnail, neon twin helix, ultra detailed digital art",
     10200),
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
            if size_kb < 250:
                print(f"  [auto-regen] {game_id}.png ({size_kb:.0f} KB < 250KB threshold) — regenerating")
            else:
                print(f"  [skip] {game_id}.png ({size_kb:.0f} KB)")
                skipped += 1
                continue
        generate(prompt, path, width=512, height=384, steps=4, seed=seed)
        generated += 1

    elapsed = time.time() - total_start
    print(f"\nDone! Generated {generated}, skipped {skipped}, in {elapsed:.1f}s")
    print(f"Output: {BASE_DIR}")
