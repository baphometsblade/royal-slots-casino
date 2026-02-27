"""
Master HD thumbnail regeneration script — all 120 active slot games.
Output: 1024x768 PNG, 8 inference steps (vs previous 512x384 at 4 steps).
Auto-skips files already >= 500KB (true HD). Use --force to redo everything.
Run: py -3.10 scripts/gen_hd_all_thumbnails.py
     py -3.10 scripts/gen_hd_all_thumbnails.py --force
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

# Shared quality suffix appended to all prompts
Q = ", highly detailed, sharp focus, vibrant colors, professional game art, slot game thumbnail, ultra detailed digital art"

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


def generate(prompt, path, width=1024, height=768, steps=8, guidance=0.0, seed=None):
    gen = torch.Generator("cuda")
    if seed is not None:
        gen.manual_seed(seed)
    img = pipe(
        prompt=prompt + Q,
        num_inference_steps=steps,
        guidance_scale=guidance,
        width=width,
        height=height,
        generator=gen,
    ).images[0]
    img.save(path, quality=97)
    size_kb = os.path.getsize(path) / 1024
    print(f"  [OK] {os.path.basename(path)}  ({size_kb:.0f} KB)")
    return img


# ─────────────────────────────────────────────────────────────────────────────
# ALL 120 GAME THUMBNAILS  (game_id, prompt, seed)
# Seeds < 9000: original batch (reusing same seed for consistency)
# Seeds 9000-9380: regen_lowquality batch
# Seeds 9400-9780: batch2 (20 new games)
# Seeds 9800-10200: batch3
# ─────────────────────────────────────────────────────────────────────────────
THUMBNAILS = [

    # ── ORIGINAL 60 GAMES (seeds 3000-8900) ──────────────────────────────────

    ("sugar_rush",
     "Magical candy wonderland slot machine with giant rainbow lollipops, gummy bears, "
     "candy canes, sparkling gem candies, cotton candy clouds, colorful confetti explosion "
     "on vibrant pink-purple gradient background",
     3000),

    ("lucky_777",
     "Classic tropical fruit slot explosion — bananas, grapes, watermelons, cherries, oranges "
     "bursting from golden slot reels, lucky sevens and golden coins raining, "
     "vibrant rainbow confetti on deep purple-orange background",
     3100),

    ("gates_olympus",
     "Divine Mount Olympus temple with Zeus on golden throne, towering marble columns, "
     "lightning bolts crackling, clouds of divine light, ancient Greek statues "
     "and jewelled crowns on majestic blue-gold celestial background",
     3200),

    ("black_bull",
     "Powerful raging black bull with glowing red eyes charging through golden coins and diamonds, "
     "dust cloud around massive horns, dramatic arena lighting "
     "on dark crimson-black background",
     3300),

    ("hot_chillies",
     "Mexican fiesta explosion with giant red-hot chili peppers, colorful piñatas, maracas, "
     "sombrero hats, tacos and mariachi dancers on fiery red-orange gradient background",
     3400),

    ("super_hot",
     "Retro classic slot fruits on fire — giant cherries, lemons, plums, golden bells "
     "and blazing stars on burning orange-red gradient, slots chrome frame with fire effects",
     3500),

    ("wolf_gold",
     "Majestic golden wolf howling at full moon on desert canyon cliff at sunset, "
     "totem poles, eagle feathers, Native American dreamcatchers, golden coins "
     "on warm amber-orange southwestern background",
     3600),

    ("big_bass",
     "Giant bass fish leaping dramatically from sparkling blue water, "
     "fishing rods and reels, golden hooks and lures, underwater treasure, "
     "splashing water drops on deep blue-teal background",
     3700),

    ("fire_joker",
     "Fiery jester clown with glowing fire crown juggling flaming playing cards, "
     "fire spades, hearts, diamonds and clubs swirling with flame, "
     "dramatic smoke and embers on deep red-orange background",
     3800),

    ("book_dead",
     "Ancient Egyptian tomb with glowing golden Book of Ra, sacred scarab beetle, "
     "Eye of Horus radiating golden light, Anubis god statue, "
     "hieroglyph-covered walls on sand-gold deep brown background",
     3900),

    ("starburst_xxl",
     "Cosmic gemstone explosion in deep space — rubies, sapphires, emeralds, amethysts, "
     "topaz crystals bursting in starburst pattern, swirling nebula and galaxy background, "
     "radiant gem light on dark cosmic background",
     4000),

    ("gonzos_quest",
     "Spanish conquistador Gonzalo in jungle discovering ancient Aztec temple, "
     "stone face masks, golden emerald sculptures, jungle vines, cascading waterfalls "
     "on lush green-gold adventure background",
     4100),

    ("starlight_princess",
     "Magical anime princess floating in star constellation with giant rainbow crystal hearts, "
     "glowing magic wand, tiara of stars, sparkle trails and moon "
     "on dreamy pastel pink-teal celestial background",
     4200),

    ("olympus_rising",
     "Greek sea god rising from stormy ocean waves with golden trident, "
     "shield, laurel crown, Poseidon palace visible in waves, "
     "thunderbolts and divine light on dramatic storm-blue background",
     4300),

    ("buffalo_stampede",
     "Epic buffalo stampede across golden American prairie at sunset, "
     "massive bison herd raising dust cloud, cactus silhouettes, "
     "eagle soaring overhead on warm amber-orange sunset background",
     4400),

    ("puppy_palace",
     "Adorable royal puppies in a golden palace — fluffy golden retriever, dalmatian, "
     "corgi wearing tiny crown, giant sparkling bones and paw prints, "
     "royal velvet cushions on warm green-gold background",
     4500),

    ("crimson_fang",
     "Gothic vampire with crimson fangs in a dark castle, "
     "black bats swarming, blood-red full moon, stone coffins, gothic crosses, "
     "blood roses on deep crimson-black dramatic background",
     4600),

    ("pirate_fortune",
     "Pirate captain at overflowing treasure chest on tropical island, "
     "golden compass, anchor, skull and crossbones flag, doubloon coins, "
     "dramatic stormy ocean on deep blue-teal background",
     4700),

    ("lucky_dragon",
     "Chinese golden dragon coiling through red lanterns and jade coins, "
     "koi fish, bamboo, silk fans, golden ingots "
     "on festive red-gold Chinese New Year background",
     4800),

    ("pharaoh_legacy",
     "Powerful Egyptian pharaoh on golden throne with cobra headdress, "
     "towering sphinx, pyramid in desert, sacred hieroglyphs, "
     "golden scarabs and Eye of Ra on warm gold-brown mystical background",
     4900),

    ("quantum_burst",
     "Sci-fi quantum physics laboratory with glowing atom structures, "
     "electron clouds, plasma orbs, energy field beams, "
     "holographic data streams on electric neon purple-cyan background",
     5000),

    ("olympian_gods",
     "Greek gods Athena, Apollo, and Ares on white marble Parthenon, "
     "golden harp, white pegasus horse, golden apple, olive branches, "
     "divine sunlight on warm amber-orange Olympian sky background",
     5100),

    ("golden_fortune",
     "Ultimate luxury lifestyle montage with golden yacht on azure sea, "
     "champagne tower, diamond rings and gold watches, exotic sports car, "
     "private jet on opulent gold-black background",
     5300),

    ("island_tiki",
     "Hawaiian tropical island with ancient tiki god statue, "
     "golden idol, hibiscus flowers, coconut palms, ukulele, volcanic sunset, "
     "on vibrant teal-green tropical paradise background",
     5400),

    ("sakura_princess",
     "Japanese cherry blossom princess in silk kimono, "
     "delicate pink sakura petals falling, jade dragon, origami cranes, "
     "golden pagoda on soft pink-violet Japanese garden background",
     5500),

    ("ares_blade",
     "Spartan god of war with gleaming battle-scarred armor, "
     "crossed spear and shield, blood-red rubies, eagle wings, "
     "burning battlefield on dramatic dark red-orange background",
     5600),

    ("neon_nights",
     "Miami Vice retro neon city at night — dice, cocktail glasses, "
     "neon-lit sports car, stacked cash, saxophone music, "
     "neon palm trees on electric pink-cyan 80s background",
     5700),

    ("viking_voyage",
     "Viking longship crashing through icy Arctic waves, "
     "warrior with axe and fur cape, runic shield, Norse raven, "
     "Northern Lights aurora on dark stormy blue-grey background",
     5800),

    ("diamond_vault",
     "Open luxury bank vault with dazzling diamond collection — "
     "blue diamonds, rubies, emeralds, sapphires, crown jewels in display cases, "
     "laser security beams on silver-blue prestige background",
     5900),

    ("madame_destiny",
     "Mystical gypsy fortune teller with glowing crystal ball showing destiny, "
     "tarot cards spread, burning candles, potions, moth and stars "
     "on deep purple-violet mystical background",
     6000),

    ("great_rhino",
     "Mighty white rhinoceros charging across African savanna at golden sunset, "
     "flamingos in background, acacia trees, golden dust cloud, "
     "coins embedded in landscape on warm amber-gold African background",
     6100),

    ("bass_splash",
     "Deep sea fishing adventure with giant marlin and bass jumping, "
     "fishing reel spinning, gold lures, underwater coral reef, "
     "dramatic water splash on deep blue ocean background",
     6200),

    ("dragon_megafire",
     "Massive imperial Chinese dragon breathing blue-white megafire over golden pagodas, "
     "imperial seal, jade treasures, dragon pearls glowing, "
     "on deep crimson-gold imperial Chinese background",
     6300),

    ("esqueleto_fiesta",
     "Day of the Dead skeleton mariachi band celebrating with guitars, trumpets, maracas, "
     "colorful papel picado banners, marigold flowers, sugar skull dancers "
     "on vibrant orange-purple fiesta background",
     6400),

    ("wildfire_gold",
     "Wild West gold rush with prospector, gold nugget strike, "
     "wanted posters, sheriff badge, dynamite, revolver, "
     "golden desert canyon at blazing sunset background",
     6500),

    ("five_lions",
     "Five Chinese lion dance performers with magnificent golden lion heads, "
     "red drums and cymbals, firecrackers bursting, fortune coins raining "
     "on festive red-gold Chinese New Year celebration background",
     6600),

    ("chilli_heat",
     "Mexican street market with extreme chili peppers — jalapeño, habanero, "
     "chihuahua dog, piñata, money-shaped chillis glowing with heat, "
     "on vibrant orange-red Mexican fiesta background",
     6700),

    ("tombstone_reload",
     "Dark Wild West tombstone graveyard at dusk with outlaw skeletons, "
     "smoking revolvers, cowboy boots, wanted bounty posters, "
     "tumbleweeds on dusty orange-brown western background",
     6800),

    ("mental_meltdown",
     "Neon green mad scientist lab explosion — glowing test tubes, "
     "syringes, electric brain sparking, green chemical splashes, "
     "Dr. Meltdown in goggles on dark neon green background",
     6900),

    ("san_quentin",
     "Dramatic prison escape scene with broken chains and bars, "
     "searchlight beams, guard tower, razor wire fence, "
     "freedom beyond the wall on dark steel-grey background",
     7000),

    ("nitro_street",
     "Urban underground street racing with modified tuner car leaving nitro flame trail, "
     "neon street lights, graffiti walls, boomboxes, spray cans "
     "on dark city neon background",
     7100),

    ("wild_toro",
     "Spanish bullfighting arena with matador's red cape swirling around charging bull, "
     "roses thrown from crowd, sand arena, traditional costume details "
     "on dramatic crimson-gold arena background",
     7200),

    ("jammin_fruits",
     "Retro disco funk party with giant glass jam jars of tropical fruits — "
     "strawberry, orange, raspberry, kiwi — disco ball, vinyl record, "
     "on vibrant 70s orange-yellow funky background",
     7300),

    ("big_bamboo",
     "Misty Chinese bamboo forest with giant panda in meditation pose, "
     "jade frog statue, golden temple bell, bamboo lanterns glowing, "
     "on serene green-gold Zen garden background",
     7400),

    ("fat_rabbit",
     "Chubby magical rabbit in a giant vegetable garden bursting with oversized carrots, "
     "golden cabbages, turnips, carrot coins flying, top hat "
     "on bright green-orange whimsical background",
     7500),

    ("immortal_blood",
     "Gothic vampire immortal in moonlit cemetery with blood roses, "
     "ornate coffin, silver wolf howling at crimson moon, "
     "vampire ring with ruby on dark purple-red gothic background",
     7600),

    ("mega_safari",
     "Epic African safari with majestic lion, giant elephant, towering giraffe, "
     "zebra herd at watering hole, golden diamond trophy, "
     "on glowing amber-gold sunset African landscape",
     7700),

    ("lucha_mania",
     "Mexican lucha libre wrestling arena with colorful masked luchadors flying, "
     "championship belt and trophy, fireworks and confetti explosion "
     "on vivid red-yellow wrestling arena background",
     7800),

    ("extra_chilli",
     "Extreme chili collection from mild jalapeño to nuclear Carolina Reaper, "
     "scoville meter exploding with flame, fire breathing chili monster, "
     "on ultra-hot red-orange scorching background",
     7900),

    ("wanted_dead",
     "Wild West showdown at high noon in canyon with outlaw on horseback, "
     "smoking revolver duel, gold panning stream, wanted dead-or-alive poster, "
     "on warm dusty orange western canyon background",
     8000),

    ("chaos_crew",
     "Punk rock gang chaos with neon skeleton crew, graffiti-covered walls, "
     "shattered crystals and gems, explosive chaos energy, angry mob "
     "on electric pink-teal punk background",
     8100),

    ("le_bandit",
     "Charming raccoon thief in a beret at Paris rooftops at night, "
     "Eiffel Tower silhouette, stolen diamond necklace, baguette, "
     "wine bottle on midnight navy-purple Parisian background",
     8200),

    ("dead_alive",
     "Wild West high noon saloon with two cowboys at gunfight, "
     "dramatic low-angle showdown, spurs, holster draw, saloon doors, "
     "on sun-bleached dusty orange western background",
     8300),

    ("mega_joker",
     "Retro classic slot machine with golden triple 7s, gleaming bells, BAR symbols, "
     "cherries, lemons, grapes, joker jester in crown "
     "on red-gold retro casino background",
     8400),

    ("crown_fire",
     "Blazing phoenix rising through flames with burning golden crown, "
     "fire opals and fire gems, torch pillars, phoenix feathers "
     "on intense ember-orange flame background",
     8500),

    ("olympus_dream",
     "Mount Olympus divine gathering with golden goddesses Hera, Athena, Aphrodite "
     "on cloud thrones, golden apples, lyres, divine orbs of light "
     "on dreamy gold-violet Olympian sky",
     8600),

    ("goldstorm_ultra",
     "Electrifying gold storm with spinning gold coins and lightning bolts, "
     "golden eagle in thunderstorm, storm clouds crackling with golden electricity "
     "on dramatic purple-gold electric background",
     8700),

    ("fire_hole",
     "Underground gold mine explosion with sparks flying, mine cart loaded with ore, "
     "pickaxes, TNT dynamite blast, glowing gold veins in cave walls "
     "on dramatic dark brown-orange underground background",
     8800),

    ("merlin_power",
     "Medieval wizard Merlin casting powerful spell with glowing crystal wand, "
     "ancient spell book, bubbling magical cauldron with smoke, "
     "wise owl companion on mystical deep purple-blue background",
     8900),

    # ── REGEN LOWQUALITY BATCH (seeds 9000-9380) ─────────────────────────────

    ("jade_temple",
     "Ancient East Asian jade temple with towering jade pillars and bamboo gardens glowing green, "
     "golden Buddha statue, sacred lotus pond, lanterns in morning mist "
     "on deep jade green-gold background",
     9000),

    ("pharaoh_march",
     "Egyptian pharaoh leading golden army procession through desert, "
     "golden ankh banners, hieroglyphic obelisks, cobra-headed scepters, "
     "sand dunes at dawn on warm amber-gold Egyptian background",
     9020),

    ("golden_pharaoh",
     "Towering golden pharaoh mask with lapis lazuli and turquoise inlays, "
     "glowing golden sarcophagus, sacred ibis birds, pyramid interior, "
     "treasures on deep gold-black Egyptian background",
     9040),

    ("wild_safari",
     "African wildlife safari at golden hour — leopard in tree, hippo in river, "
     "hornbill bird, baobab trees, golden grassland "
     "on rich amber-orange African savanna background",
     9060),

    ("wild_west_rush",
     "Wild West gold rush town with saloon, bank vault robbery, "
     "sheriff's star, gold coin sacks, wanted posters, dust cloud "
     "on warm sepia-orange western sunset background",
     9080),

    ("arctic_foxes",
     "Arctic foxes in stunning snowy landscape with aurora borealis, "
     "ice crystals and snowflakes, frozen tundra, winter moon "
     "on icy blue-white Arctic background",
     9100),

    ("neon_viper",
     "Neon cyberpunk viper snake with electric scales glowing, "
     "neon city rain, chrome bike rider, electric coils "
     "on dark neon green-black cyber background",
     9120),

    ("midnight_drifter",
     "Sleek midnight black sports car drifting under neon city bridge at night, "
     "speed lines and tire smoke, city lights reflected on wet road "
     "on dark midnight blue-purple background",
     9140),

    ("wild_deep",
     "Deep ocean adventure with blue whale, giant squid, glowing anglerfish, "
     "treasure chest in coral reef, bioluminescent creatures "
     "on deep navy-teal ocean background",
     9160),

    ("mine_coins",
     "Gold mine coin rush with miner striking mother lode vein, "
     "golden coin waterfall, mine cart overflowing, TNT explosion of gold "
     "on dark warm brown-gold cave background",
     9180),

    ("mystic_cauldron",
     "Witch's magical cauldron bubbling with green-purple potion, "
     "spell ingredients — eye of newt, bat wing, moon crystal, "
     "spell book floating on dark purple-green mystical background",
     9200),

    ("crystal_chambers",
     "Underground crystal cave with towering amethyst and quartz formations, "
     "magical gemstone glow, crystal water pool, ancient runes "
     "on deep purple-blue cave background",
     9220),

    ("crystal_shrine",
     "Ancient crystal shrine with glowing sacred crystals on altar, "
     "crystal lotus flowers, aurora light beams refracting, spirit guardians "
     "on ethereal purple-blue mystical background",
     9240),

    ("demon_chambers",
     "Dark gothic demon chamber with hellfire, demonic runes, "
     "obsidian pillars, devil skull, chains and pentagram "
     "on dark red-black hell background",
     9260),

    ("dragon_coins",
     "Eastern dragon coiling through giant gold coins and treasure, "
     "jade dragon horns, coin shower, dragon pearl glowing, "
     "on rich deep red-gold dragon background",
     9280),

    ("norse_vaults",
     "Viking treasure vault with Odin's ravens, runic treasure chests, "
     "Norse gold, Yggdrasil tree roots, Viking helm and axe "
     "on dark grey-gold Norse background",
     9300),

    ("vault_coins",
     "Grand bank heist vault with gold bars stacked floor to ceiling, "
     "coins waterfall from cracked vault door, laser beams, "
     "on deep gold-black prestige background",
     9320),

    ("iron_stampede",
     "Iron-horned stampede of mechanical bulls charging, "
     "sparks and fire from iron hooves, cowboy with lasso, "
     "on dark industrial red-black background",
     9340),

    ("golden_jaguar",
     "Golden jaguar leaping through jungle with luminous rosette markings, "
     "tribal Aztec gold idol, jungle ruins with vines "
     "on deep jungle green-gold background",
     9360),

    ("lightning_pearl",
     "Electric pearl kraken rising from deep ocean with lightning bolts, "
     "glowing pearl orbs, electric blue tentacles, ocean storm "
     "on deep navy electric cyan background",
     9380),

    # ── BATCH 2: 20 NEW GAMES (seeds 9400-9780) ──────────────────────────────

    ("galactic_raiders",
     "Deep space alien invasion with massive UFO mothership firing purple laser beams, "
     "glowing green alien queen, rocky asteroids, space fighter dogfight, "
     "vivid neon purple cosmic nebula and star field",
     9400),

    ("nova_blackhole",
     "Swirling cosmic black hole consuming stars, bright accretion disk "
     "of violet and indigo light, comets spiraling inward, neutron star, "
     "absolute void darkness on cosmic space background",
     9420),

    ("agent_zero",
     "Sleek secret agent in black tuxedo holding silenced pistol, "
     "laser targeting sight, briefcase with gadgets, blurred city lights behind, "
     "spy thriller aesthetic on deep navy darkness",
     9440),

    ("black_ops_heist",
     "Military black ops team in full tactical gear rappelling into massive vault, "
     "night vision goggles, detonator, vault door cracking open with gold inside "
     "on dark charcoal grey tactical background",
     9460),

    ("dragon_forge",
     "Mighty red dragon breathing roaring fire into a blacksmith forge, "
     "glowing molten iron anvil and hammer, dragonscale armor, dragon egg pulsing "
     "on deep crimson ember forge background",
     9480),

    ("castle_siege",
     "Epic medieval castle under siege — catapults launching fireballs at battlements, "
     "armored knights charging, siege tower at walls, king knight on horseback "
     "on stormy dark grey-stone battle background",
     9500),

    ("world_cup_glory",
     "Football World Cup victory with gleaming golden trophy overflowing with confetti, "
     "packed roaring stadium, golden boot kicking ball into net, "
     "champion lifting cup on vivid green-gold background",
     9520),

    ("grand_prix_rush",
     "Formula 1 race car at full speed with motion blur trails on floodlit circuit, "
     "sparks from chassis, F1 helmet and gloves, checkered victory flag "
     "on dramatic dark black-red racing background",
     9540),

    ("gold_crown_club",
     "Ultra-luxurious VIP casino with gleaming gold crown centerpiece, "
     "crystal champagne, diamond jewelry, gold bars, vault key on velvet "
     "on deep gold-black opulent background",
     9560),

    ("monaco_million",
     "Monaco billionaire lifestyle — luxury superyacht on azure sea, "
     "red supercar, penthouse view, roulette wheel, casino chips "
     "on dark glamour crimson-black background",
     9580),

    ("rome_eternal",
     "Ancient Roman Colosseum at golden sunset with Roman Eagle banner soaring, "
     "Julius Caesar in golden laurel crown, legionnaire soldiers, gladiator arena "
     "on warm burnt-amber Rome background",
     9600),

    ("cleopatra_gold",
     "Majestic Cleopatra in golden Egyptian jewels and headdress, "
     "coiling golden asp serpent, ibis bird, lotus flowers, glowing gold masks "
     "on deep amber-gold divine Egyptian background",
     9620),

    ("pixel_rewind",
     "Retro 8-bit arcade pixel art scene with neon pixel space invaders, "
     "pixel pac-dot trail, glowing coin sprite, chunky pixel gun, CRT monitor glow "
     "on deep purple-green retro arcade background",
     9640),

    ("thunder_hero",
     "Powerful superhero with crackling yellow lightning powers, "
     "blue and gold hero costume with lightning bolt emblem, cape billowing in storm, "
     "giant storm titan looming on dark stormy superhero background",
     9660),

    ("solar_fist",
     "Solar energy superhero punching with blazing fist of concentrated sunlight, "
     "sun shield and power gloves radiating orange solar beams, solar flares erupting "
     "on blazing orange-gold solar background",
     9680),

    ("big_top_bonanza",
     "Spectacular big top circus tent with charismatic ringmaster in top hat, "
     "acrobats on flying trapeze, jugglers, dazzling confetti and spotlights "
     "on vibrant red-gold carnival background",
     9700),

    ("clockwork_realm",
     "Steampunk realm with intricate bronze gears and cogs turning, "
     "brass pocket watch face, steam valves venting, "
     "Victorian time traveler in goggles at ornate machine on sepia-copper background",
     9720),

    ("rockstar_wild",
     "Rock legend guitarist on dark arena stage with electric guitar crackling lightning, "
     "massive speaker stacks, drumsticks mid-air, screaming crowd with lighters "
     "on deep purple-black rock concert background",
     9740),

    ("snow_queen_riches",
     "Ethereal snow queen in crystalline ice gown and crown in glittering ice palace, "
     "frost wolf companion, giant ice crystal pillars, magical snowflakes, aurora borealis "
     "on deep icy blue-white fantasy background",
     9760),

    ("jungle_fury",
     "Primal jungle with roaring black panther leaping from dense rainforest, "
     "massive silverback gorilla, tribal drums and glowing ruins, "
     "jungle spirit guardian on dark green-orange background",
     9780),

    # ── BATCH 3: 21 REGEN PLACEHOLDER GAMES (seeds 9800-10200) ──────────────

    ("power_crown",
     "Majestic royal crown encrusted with rubies, sapphires and diamonds, "
     "gilded golden scepter and mystical orb radiating divine light, "
     "jeweled throne on cloud on deep violet-gold opulent background",
     9800),

    ("loki_loot",
     "Norse trickster god Loki with glowing serpent eyes, ornate golden horned helmet, "
     "magical rune staff sparking with green fire, golden loot and potion vials scattered "
     "on vivid green-black shadow Norse background",
     9820),

    ("fruit_party",
     "Explosive tropical fruit party with giant glowing starfruit at center, "
     "ripe strawberries and oranges bursting with juice, plums, peaches, "
     "rainbow confetti cascade on vibrant orange-purple background",
     9840),

    ("sweet_bonanza",
     "Magical candy wonderland with giant rainbow lollipop swirls, "
     "sparkling candy hearts, star sweets, cotton candy clouds, "
     "bomb candy exploding in rainbow light on dreamy pink-violet background",
     9860),

    ("razor_shark",
     "Great white shark surging through deep ocean, "
     "depth charges exploding with underwater shockwaves, diver silhouette, "
     "glowing jellyfish, giant shark tooth on dark teal-cyan underwater background",
     9880),

    ("eternal_romance",
     "Gothic vampire romance in candlelit stone castle chamber, "
     "vampire lord in elegant Victorian coat, blood-red roses and amber candles, "
     "moonlit stained glass window on deep crimson-purple gothic background",
     9900),

    ("buffalo_extreme",
     "Extreme thundering buffalo herd stampede at sunset on American Great Plains, "
     "golden bald eagle with outstretched wings, mountain cougar, gold coins "
     "on warm burnt-orange sunset western background",
     9920),

    ("coin_strike",
     "Classic casino jackpot strike with gleaming triple gold sevens on reels, "
     "golden bells ringing, BAR symbols, cherries, lemons, "
     "golden coins raining from jackpot on rich gold background",
     9940),

    ("pots_olympus",
     "Zeus on Mount Olympus hurling lightning, Poseidon with golden trident, "
     "Apollo with golden lyre, Parthenon temple, glowing golden prize pots overflowing "
     "on majestic blue-gold Olympian cloud background",
     9960),

    ("dog_house_mega",
     "Energetic unleashed dogs — giant bulldog and fierce doberman bursting from dog house, "
     "sparkling giant bones and paw prints, golden pet collars "
     "on playful green-orange bright background",
     9980),

    ("coin_volcano",
     "Massive volcano erupting golden magma coins into sky, "
     "glowing obsidian pillars, fire rubies sparkling in molten rivers, "
     "magma coins raining on dramatic orange-red volcanic background",
     10000),

    ("gold_rush_frog",
     "Lucky golden fortune frog in miner helmet striking huge gold nugget vein with pickaxe, "
     "dynamite explosion revealing mother lode, old oil lantern glowing in mine cave, "
     "gold coins cascading on vivid green-gold background",
     10020),

    ("buffalo_mega",
     "Mighty Buffalo King with storm crown amid dramatic lightning strikes, "
     "magnificent black wild mustang rearing, coyote howling at thunder, "
     "golden eagle diving on stormy dark brown-orange background",
     10040),

    ("reactoonz",
     "Colorful cartoon alien blobs with giant cute eyes — green, blue, pink, yellow, red — "
     "tumbling and bouncing, towering Gargantoon boss blob emerging, "
     "alien energy explosions on vibrant purple-cyan alien world background",
     10060),

    ("money_train",
     "Wild West armored money train at full steam through desert canyon, "
     "sheriff badge and six-shooter, wanted posters, dynamite explosion, "
     "stacks of cash flying on warm brown-orange western background",
     10080),

    ("tome_madness",
     "Ancient eldritch tome glowing with forbidden green runes, "
     "giant Cthulhu rising with writhing tentacles from void, cosmic eye from abyss, "
     "swirling green-purple void energy on dark occult background",
     10100),

    ("gems_bonanza",
     "Magnificent gem vault explosion with giant brilliant diamond at center, "
     "emerald, sapphire, ruby, topaz erupting in rainbow prismatic light, "
     "gems tumbling in beams on rich deep blue-purple background",
     10120),

    ("elvis_frog",
     "Charismatic frog in gold Elvis jumpsuit on neon Las Vegas stage, "
     "showgirl backup dancers with feather headdresses, cocktail glasses, dice, "
     "glowing neon casino signs on brilliant red-gold Vegas background",
     10140),

    ("snoop_dollars",
     "Hip hop millions with gold microphone, heavy platinum chains, diamond pendants, "
     "iconic sneakers, vintage boombox, golden crown dripping cash "
     "on rich purple-gold hip hop background",
     10160),

    ("gemhalla",
     "Viking Valhalla with legendary gem-encrusted battle shield, "
     "battle axe lodged in glowing runic stone, drinking horn overflowing, "
     "golden Viking helmet, Asgard rainbow bridge on stormy Norse background",
     10180),

    ("twin_helix",
     "Twin neon DNA helix strands spiraling with glowing neon slot symbols — "
     "cherries, bells, bars, sevens, diamonds — intertwined in electric "
     "pink-purple neon energy on deep black cyber background",
     10200),
]

# ─────────────────────────────────────────────────────────────────────────────
# MISSING GAMES from definitions that need prompts
# These 20 games were in game-definitions.js but not in any previous script
# ─────────────────────────────────────────────────────────────────────────────
ADDITIONAL_THUMBNAILS = [
    # ArcadeForge — Salsa Spins / hot_chillies extension
    ("nash_city",
     "Retro Nashville country music city with neon cowboy boot sign, "
     "pedal steel guitar, ten-gallon hat, country singer on honky-tonk stage "
     "on warm amber-neon Nashville background",
     10220),

    ("le_bandit",   # already above — skip, same prompt different seed OK
     "Charming raccoon thief in Paris beret on rooftops at night, "
     "Eiffel Tower, stolen diamonds, baguette, wine "
     "on midnight navy-purple Parisian background",
     8200),

    # Celestial Plays — gemhalla
    ("pots_olympus",   # already above
     "Zeus and Olympian gods with overflowing gold prize pots "
     "on majestic blue-gold Olympian background",
     9960),
]


if __name__ == "__main__":
    force = "--force" in sys.argv
    total_start = time.time()
    generated = 0
    skipped = 0
    errors = []

    print(f"\nProcessing {len(THUMBNAILS)} games at 1024x768 (8 steps)...\n")

    for game_id, prompt, seed in THUMBNAILS:
        path = os.path.join(BASE_DIR, f"{game_id}.png")
        if os.path.exists(path) and not force:
            size_kb = os.path.getsize(path) / 1024
            if size_kb >= 500:
                print(f"  [skip] {game_id}.png ({size_kb:.0f} KB — already HD)")
                skipped += 1
                continue
            else:
                print(f"  [regen] {game_id}.png ({size_kb:.0f} KB < 500KB threshold)")
        try:
            generate(prompt, path, width=1024, height=768, steps=8, seed=seed)
            generated += 1
        except Exception as e:
            print(f"  [ERR] {game_id}: {e}")
            errors.append(game_id)

    elapsed = time.time() - total_start
    print(f"\n{'='*60}")
    print(f"Done! Generated: {generated}  Skipped: {skipped}  Errors: {len(errors)}")
    if errors:
        print(f"Failed games: {errors}")
    print(f"Total time: {elapsed:.1f}s ({elapsed/60:.1f} min)")
    print(f"Output: {BASE_DIR}")
