#!/usr/bin/env python3
"""
SDXL Asset Generation Script for Royal Slots Casino
Generates HD game assets (thumbnails and backgrounds) using local SDXL installation.

Usage:
    python generate_sdxl_assets.py --all --quality standard
    python generate_sdxl_assets.py --games sugar_rush,wolf_gold --type thumb
    python generate_sdxl_assets.py --games gates_olympus --quality ultra --force
"""

import argparse
import json
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import math

try:
    import torch
    from diffusers import StableDiffusionXLPipeline, StableDiffusionXLImg2ImgPipeline
    from PIL import Image
    import numpy as np
except ImportError as e:
    print(f"Error: Required packages not found. Install with:")
    print("pip install torch diffusers pillow numpy tqdm")
    sys.exit(1)

try:
    from tqdm import tqdm
except ImportError:
    print("Warning: tqdm not found. Install with: pip install tqdm")
    # Fallback if tqdm not available
    class tqdm:
        def __init__(self, iterable=None, total=None, desc=None, unit=None):
            self.iterable = iterable or []
            self.total = total or len(self.iterable)
            self.desc = desc or ""
            self.unit = unit or ""
        def __iter__(self):
            for i, item in enumerate(self.iterable):
                if i == 0:
                    print(f"{self.desc}: {i}/{self.total} {self.unit}")
                yield item
                if (i + 1) % max(1, self.total // 10) == 0:
                    print(f"{self.desc}: {i+1}/{self.total} {self.unit}")
        def update(self, n=1):
            pass
        def close(self):
            pass


# Game prompts database
GAME_PROMPTS = {
    'sugar_rush': {
        'name': 'Candy Cascade 1000',
        'thumb': 'vibrant candy kingdom with giant lollipops, gummy bears, cupcakes, candy canes, crystal sugar diamonds, rainbow swirls, magical candy world, slot game thumbnail art, ultra detailed, whimsical fantasy',
        'bg': 'dreamy candy landscape with cotton candy clouds, chocolate rivers, lollipop trees, sugar crystal formations, soft pink and purple lighting, fantasy candy world panorama, dark vignette edges',
    },
    'lucky_777': {
        'name': 'Fruit Fiesta Deluxe',
        'thumb': 'classic fruit slot machine symbols, cherries, lemons, watermelons, golden sevens, sparkling diamonds, neon lights, retro casino style, vibrant colors, slot game art',
        'bg': 'neon-lit casino floor with fruit motifs, retro slot machines, purple and pink ambient lighting, bokeh lights, luxurious casino atmosphere, dark edges',
    },
    'gates_olympus': {
        'name': 'Halls of Thunder',
        'thumb': 'majestic Mount Olympus with golden gates, Zeus wielding lightning, greek temple columns, divine chalices, golden crowns, epic clouds, mythological slot game art, ultra detailed',
        'bg': 'olympus temple interior with massive golden columns, divine light rays through clouds, lightning bolts, azure sky, greek mythology atmosphere, majestic and divine',
    },
    'black_bull': {
        'name': 'Raging Bull',
        'thumb': 'powerful black bull charging through gold coins, money bags, horseshoes, wild west rodeo scene, dust and fire, slot game action art, dynamic composition',
        'bg': 'dark western prairie at sunset with silhouette of bull, golden dust particles, money scattered, dramatic orange sky, cinematic lighting',
    },
    'hot_chillies': {
        'name': 'Salsa Spins',
        'thumb': 'fiery red chili peppers with flames, mexican sombrero, maracas, tacos, salsa dancing theme, vibrant red and orange, classic slot machine style, festive',
        'bg': 'mexican fiesta scene with string lights, warm sunset, adobe buildings, chili pepper garlands, fiery atmosphere, warm orange and red tones',
    },
    'super_hot': {
        'name': 'Blazing Fruits',
        'thumb': 'classic fruit machine symbols on fire, flaming cherries lemons plums, golden bells, lucky stars, blazing heat waves, retro casino slot art',
        'bg': 'retro fruit machine interior with flames and heat distortion, golden amber glow, classic pub machine atmosphere, warm lighting',
    },
    'wolf_gold': {
        'name': 'Alpha Pack',
        'thumb': 'majestic wolf howling at full moon, native american totem pole, eagle feathers, golden paw prints, wilderness night scene, slot game art, atmospheric',
        'bg': 'moonlit wilderness canyon with wolf silhouettes, native american totems, starry sky, golden moonlight, mystical nature atmosphere',
    },
    'big_bass': {
        'name': 'Reel Catch',
        'thumb': 'giant bass fish jumping from water with splash, fishing hooks, treasure chest underwater, aquatic scene, slot game fishing theme art',
        'bg': 'serene lake at golden hour with fishing boat, underwater treasures visible, lily pads, mist on water, peaceful fishing atmosphere',
    },
    'fire_joker': {
        'name': 'Inferno Jester',
        'thumb': 'flaming jester juggling fire, classic slot symbols, lucky sevens, stars, playing card motifs, circus fire performance, vibrant reds and oranges',
        'bg': 'dark circus stage with fire rings, jester silhouette, dramatic red and orange lighting, ember particles floating',
    },
    'book_dead': {
        'name': 'Tome of Ra',
        'thumb': 'ancient egyptian book of the dead glowing with golden light, anubis statue, pharaoh mask, scarab beetles, hieroglyphics, pyramids, slot game egyptian theme',
        'bg': 'ancient egyptian tomb interior with hieroglyphic walls, golden torchlight, pharaoh sarcophagus, mystical amber glow, sand particles in air',
    },
    'starburst_xxl': {
        'name': 'Cosmic Gems',
        'thumb': 'brilliant cosmic gemstones floating in space, red blue green yellow purple crystals, starburst explosion, nebula background, sci-fi slot game art',
        'bg': 'deep space nebula with colorful gemstones floating, starburst light effects, cosmic dust, purple and cyan galaxy atmosphere',
    },
    'sweet_bonanza': {
        'name': 'Sugar Bomb',
        'thumb': 'explosion of candies and fruits, lollipops, cotton candy, heart-shaped gems, sweet bombs, colorful candy rain, slot game art, ultra vibrant',
        'bg': 'candy explosion landscape, sugar crystals raining, rainbow candy clouds, sweet dreamworld, vibrant pink and purple atmosphere',
    },
    'starlight_princess': {
        'name': 'Celestial Princess',
        'thumb': 'ethereal anime princess floating among stars, celestial crown, magic wand, crystal stars, pastel cosmic scene, japanese slot game art style',
        'bg': 'celestial palace in clouds with twinkling stars, pink and purple aurora, magical princess throne room, dreamy cosmic atmosphere',
    },
    'reactoonz': {
        'name': 'Alien Reactor',
        'thumb': 'cute alien creatures in a reactor, colorful blob monsters with different expressions, sci-fi laboratory, electric energy, cartoon slot game art',
        'bg': 'alien reactor core interior, glowing energy tubes, cute alien creatures floating, electric blue and purple neon lights, sci-fi laboratory',
    },
    'gonzos_quest': {
        'name': 'Lost City Explorer',
        'thumb': 'spanish conquistador explorer discovering ancient mayan temple, golden artifacts, jungle vines, cascading stone blocks, adventure slot game art',
        'bg': 'deep jungle with ancient mayan ruins, waterfalls, golden sunlight through canopy, stone blocks covered in moss, adventurous atmosphere',
    },
    'dead_alive': {
        'name': 'Undead Bounty',
        'thumb': 'wild west undead cowboys, wanted poster, skull with cowboy hat, revolvers, dusty ghost town, dark western horror slot game art',
        'bg': 'ghost town at midnight, tumbleweeds, abandoned saloon, eerie green moonlight, dust particles, spooky western atmosphere',
    },
    'buffalo_stampede': {
        'name': 'Thunder Herd',
        'thumb': 'massive buffalo herd stampeding across golden plains, dust clouds, dramatic sunset, wild west nature, powerful animals, slot game art',
        'bg': 'vast golden plains with buffalo stampede silhouettes, dramatic sunset sky, dust clouds, thunder and lightning, epic nature panorama',
    },
    'extra_chilli': {
        'name': 'Chilli Megablast',
        'thumb': 'explosive chili peppers with fire and lightning, mexican fiesta elements, dynamite, colorful confetti, mega explosion, slot game action art',
        'bg': 'mexican village plaza with fiesta decorations, explosive chili peppers flying, confetti rain, warm sunset lighting, festive atmosphere',
    },
    'big_bamboo': {
        'name': 'Bamboo Fortune',
        'thumb': 'giant bamboo forest with panda, golden coins, asian temple, lucky bamboo shoots, jade ornaments, oriental slot game art',
        'bg': 'misty bamboo forest with golden light filtering through, panda silhouette, asian temple in distance, serene oriental atmosphere',
    },
    'dragon_megafire': {
        'name': 'Dragon Inferno',
        'thumb': 'massive fire-breathing dragon on treasure hoard, gold coins, gems, flames, medieval castle, epic fantasy slot game art',
        'bg': 'dragon lair filled with treasure, molten lava rivers, fire and smoke, massive dragon silhouette, epic fantasy cavern',
    },
    'wanted_dead': {
        'name': 'Dead or Alive Bounty',
        'thumb': 'wild west wanted poster with skull, dual revolvers, sheriff badge, train robbery scene, dusty western slot game art, gritty',
        'bg': 'wild west desert town at high noon, dusty road, saloon doors, wanted posters on walls, dramatic sunlight, western atmosphere',
    },
    'tombstone_reload': {
        'name': 'Tombstone Vengeance',
        'thumb': 'tombstone graveyard with reloading revolver, skulls, ghost town cemetery, dark western gothic, slot game horror western art',
        'bg': 'moonlit cemetery outside ghost town, tombstones with eerie glow, mist, dead trees, dark western horror atmosphere',
    },
    'money_train': {
        'name': 'Heist Express',
        'thumb': 'steam train robbery scene, masked bandits, gold bars, dynamite, money bags flying, wild west action, slot game heist art',
        'bg': 'wild west train tracks through canyon, steam locomotive, golden sunset, dust and smoke, dramatic heist movie atmosphere',
    },
    'san_quentin': {
        'name': 'Lockdown',
        'thumb': 'prison break scene, barbed wire, guard tower spotlight, prison cell bars, dark gritty urban, slot game crime art',
        'bg': 'maximum security prison at night, searchlights sweeping, razor wire, concrete walls, gritty dark atmosphere with red accents',
    },
    'fat_rabbit': {
        'name': 'Garden Bounty',
        'thumb': 'adorable giant rabbit in vegetable garden, carrots, cabbages, golden farming tools, whimsical farm scene, cute slot game art',
        'bg': 'magical vegetable garden with oversized vegetables, rabbit burrow entrance, sunset golden light, whimsical farming atmosphere',
    },
    'fruit_party': {
        'name': 'Fruit Fiesta',
        'thumb': 'tropical fruit explosion party, pineapples, coconuts, mangoes, watermelons with party hats, confetti, colorful slot game art',
        'bg': 'tropical beach fruit party, tiki bar, palm trees, colorful fruits everywhere, sunset ocean, festive beach atmosphere',
    },
    'jammin_fruits': {
        'name': 'Fruit Jam Session',
        'thumb': 'musical fruits playing instruments, strawberry guitar, banana drums, funky jam session, disco lights, slot game music art',
        'bg': 'funky disco stage with fruit characters, colorful spotlights, music notes floating, groovy 70s atmosphere',
    },
    'wild_toro': {
        'name': 'Bull Run',
        'thumb': 'spanish bull fighting arena, fierce red bull, matador cape, roses, golden sand, dramatic action, slot game spanish theme art',
        'bg': 'spanish bullfighting arena at sunset, golden sand, red cape, crowd silhouettes, dramatic spanish atmosphere',
    },
    'great_rhino': {
        'name': 'Rhino Charge',
        'thumb': 'charging rhinoceros on african savanna, golden sunset, acacia trees, safari scene, powerful wildlife, slot game nature art',
        'bg': 'african savanna at golden hour, rhino silhouette, acacia trees, dramatic sky, safari wildlife atmosphere',
    },
    'razor_shark': {
        'name': 'Deep Bite',
        'thumb': 'massive great white shark with razor teeth, underwater treasure, bubbles, deep ocean, menacing, slot game ocean horror art',
        'bg': 'deep dark ocean with sunlight rays from above, shark silhouette, coral reef, treasure chest on ocean floor, mysterious underwater atmosphere',
    },
    'chilli_heat': {
        'name': 'Chilli Heat Fiesta',
        'thumb': 'flaming chili peppers, mexican marketplace, piñata, tequila bottles, sombrero, festive market, slot game fiesta art',
        'bg': 'mexican desert marketplace at sunset, hanging chili peppers, cacti, adobe buildings, warm fiesta lighting',
    },
    'madame_destiny': {
        'name': 'Fortune Teller',
        'thumb': 'mystical fortune teller with crystal ball, tarot cards, mystical orbs, crescent moon, purple velvet, slot game mystic art',
        'bg': 'fortune teller tent interior, crystal ball glowing, candles, mystical purple smoke, starry night visible through tent flap',
    },
    'cleopatra_gold': {
        'name': 'Cleopatra Golden Reign',
        'thumb': 'queen cleopatra on golden throne, egyptian pyramids, asp crown, golden jewelry, pharaonic splendor, slot game egyptian royalty art',
        'bg': 'egyptian palace throne room, golden columns, nile river view, sunset over pyramids, opulent royal egyptian atmosphere',
    },
    'pharaoh_legacy': {
        'name': 'Pharaoh Dynasty',
        'thumb': 'ancient pharaoh golden mask, pyramids of giza, sphinx, sand storm, hieroglyphic tablets, egyptian archaeology, slot game art',
        'bg': 'pyramids of giza at sunset with sphinx, golden sand dunes, archaeological site, mystical egyptian atmosphere',
    },
    'golden_pharaoh': {
        'name': 'Golden Sands',
        'thumb': 'pharaoh treasure chamber, golden sarcophagus, jeweled scarabs, ankh symbols, torchlit chamber, slot game egyptian treasure art',
        'bg': 'inside golden egyptian treasure vault, piles of gold, torches, hieroglyphic walls, amber glow, treasure chamber atmosphere',
    },
    'pharaoh_march': {
        'name': 'March of Kings',
        'thumb': 'pharaoh army marching past pyramids, war chariots, golden weapons, desert march, epic ancient egyptian warfare, slot game art',
        'bg': 'egyptian desert with marching army silhouettes, pyramids in background, dramatic dust clouds, epic ancient warfare atmosphere',
    },
    'viking_voyage': {
        'name': 'Norse Raiders',
        'thumb': 'viking longship in stormy seas, berserker warrior, rune stones, norse shield, lightning, epic seafaring, slot game viking art',
        'bg': 'stormy nordic seas with viking longship, lightning strikes, massive waves, dramatic sky, epic norse seafaring atmosphere',
    },
    'norse_vaults': {
        'name': 'Vault of Odin',
        'thumb': 'norse treasure vault with odin ravens, rune-carved gold, mjolnir hammer, ice crystals, norse mythology, slot game art',
        'bg': 'norse ice cavern treasure vault, rune stones glowing blue, ice crystals, golden treasure piles, mystical norse atmosphere',
    },
    'gemhalla': {
        'name': 'Gemstone Valhalla',
        'thumb': 'valhalla hall made of gemstones, warrior spirits, crystal mead hall, nordic gems, celestial viking afterlife, slot game art',
        'bg': 'crystal valhalla hall, gemstone columns, aurora borealis through ceiling, golden mead light, mythical norse afterlife atmosphere',
    },
    'loki_loot': {
        'name': 'Trickster Fortune',
        'thumb': 'loki god of mischief with stolen treasure, shape-shifting illusions, norse rune magic, green and gold chaos, slot game art',
        'bg': 'norse trickster realm, shifting illusions and mirrors, green magical fire, treasure scattered, chaotic norse atmosphere',
    },
    'jade_temple': {
        'name': 'Jade Emperor Temple',
        'thumb': 'magnificent jade temple with dragon pillars, golden buddha, incense smoke, cherry blossoms, chinese imperial, slot game art',
        'bg': 'chinese imperial jade temple courtyard, cherry blossom trees, koi pond, incense smoke, serene oriental atmosphere',
    },
    'five_lions': {
        'name': 'Five Lion Dance',
        'thumb': 'five colorful chinese lion dance masks, gold coins, red lanterns, fireworks, chinese new year celebration, slot game art',
        'bg': 'chinese new year festival street, red lanterns, golden decorations, fireworks sky, festive chinese atmosphere',
    },
    'sakura_princess': {
        'name': 'Sakura Kingdom',
        'thumb': 'japanese princess under cherry blossom tree, sakura petals, kimono, japanese castle, pagoda, elegant slot game art',
        'bg': 'japanese garden with cherry blossom trees in full bloom, pagoda, koi pond, sakura petals falling, serene japanese atmosphere',
    },
    'lucky_dragon': {
        'name': 'Lucky Dragon Palace',
        'thumb': 'golden chinese dragon holding lucky pearl, imperial palace, jade coins, red and gold, chinese fortune theme, slot game art',
        'bg': 'chinese imperial palace with golden dragon sculpture, red pillars, cloud motifs, opulent chinese atmosphere',
    },
    'solar_fist': {
        'name': 'Solar Fist Warrior',
        'thumb': 'martial arts warrior with solar energy fist, shaolin temple, dragon spirit, golden energy aura, anime action slot game art',
        'bg': 'shaolin temple on mountain peak at sunrise, golden solar energy, martial arts training grounds, epic asian atmosphere',
    },
    'immortal_blood': {
        'name': 'Eternal Thirst',
        'thumb': 'vampire lord in gothic castle, blood moon, bats, dark roses, gothic chandelier, dark horror romance, slot game art',
        'bg': 'gothic vampire castle interior, blood-red moonlight through stained glass, candelabras, dark crimson atmosphere',
    },
    'crimson_fang': {
        'name': 'Crimson Fang',
        'thumb': 'werewolf transformation under blood moon, crimson fangs, dark forest, halloween horror, moonlit beast, slot game art',
        'bg': 'dark enchanted forest under blood moon, werewolf claw marks on trees, fog, crimson moonlight, horror atmosphere',
    },
    'demon_chambers': {
        'name': 'Infernal Chamber',
        'thumb': 'demon throne room in hell, hellfire, demonic symbols, dark crystal, chains, infernal chamber, dark fantasy slot game art',
        'bg': 'hellish chamber with lava flows, demonic architecture, dark purple and red fire, chains, infernal atmosphere',
    },
    'diamond_vault': {
        'name': 'Diamond Heist',
        'thumb': 'diamond vault room with laser security, brilliant cut diamonds, steel vault door, heist theme, slot game art',
        'bg': 'high-tech diamond vault interior, laser grid security, brilliant diamonds on display, steel and blue lighting atmosphere',
    },
    'neon_nights': {
        'name': 'Neon City',
        'thumb': 'cyberpunk neon city nightscape, holographic signs, futuristic cars, rain-slicked streets, synthwave aesthetic, slot game art',
        'bg': 'cyberpunk city street at night, neon signs reflecting on wet pavement, rain, futuristic atmosphere, purple and cyan neon',
    },
    'quantum_burst': {
        'name': 'Quantum Vortex',
        'thumb': 'quantum energy vortex with particles, futuristic reactor, energy burst, sci-fi technology, cosmic explosion, slot game art',
        'bg': 'quantum reactor core, swirling energy vortex, particle beams, deep purple and cyan glow, futuristic sci-fi atmosphere',
    },
    'nova_blackhole': {
        'name': 'Event Horizon',
        'thumb': 'supermassive black hole with accretion disk, stellar explosion, space station, cosmic event, epic sci-fi slot game art',
        'bg': 'massive black hole in space with glowing accretion disk, stars being pulled in, cosmic dust, awe-inspiring space atmosphere',
    },
    'agent_zero': {
        'name': 'Agent Zero',
        'thumb': 'secret agent silhouette with gun, spy gadgets, encrypted data screens, tuxedo, james bond style, slot game spy art',
        'bg': 'high-tech spy headquarters, holographic displays, dark steel interior, blue and amber accent lighting, espionage atmosphere',
    },
    'arctic_foxes': {
        'name': 'Arctic Fortune',
        'thumb': 'beautiful arctic fox in snowy landscape, northern lights aurora, ice crystals, snow-covered forest, slot game nature art',
        'bg': 'arctic tundra under northern lights, snow-covered pine trees, aurora borealis, arctic fox tracks in snow, magical winter atmosphere',
    },
    'ares_blade': {
        'name': 'Blade of Chaos',
        'thumb': 'ares greek god of war with flaming sword, battle armor, greek battlefield, fire and blood, epic warrior slot game art',
        'bg': 'ancient greek battlefield, war banners, burning siege towers, dramatic stormy sky, epic warfare atmosphere',
    },
    'bass_splash': {
        'name': 'Bass Splash Party',
        'thumb': 'giant bass fish splashing out of water, fishing lures, celebration splash, water droplets, vibrant fishing party slot game art',
        'bg': 'tropical fishing pier with massive splash, crystal clear water, colorful fishing lures, sunny festive atmosphere',
    },
    'big_top_bonanza': {
        'name': 'Circus Spectacular',
        'thumb': 'circus big top tent, acrobats, lions, ringmaster with top hat, circus cannon, colorful carnival, slot game circus art',
        'bg': 'inside circus big top tent, spotlights, circus ring, colorful bunting, magical circus atmosphere',
    },
    'black_ops_heist': {
        'name': 'Shadow Ops',
        'thumb': 'elite special forces heist team, night vision goggles, vault breaking, tactical gear, slot game action military art',
        'bg': 'dark tactical operations room, night vision green tint, tactical displays, covert operations atmosphere',
    },
    'buffalo_extreme': {
        'name': 'Buffalo Extreme',
        'thumb': 'extreme close-up of powerful buffalo face, golden horns, dust and fire, intense eyes, extreme wildlife slot game art',
        'bg': 'dramatic savanna thunderstorm with buffalo herd, lightning striking, intense weather, extreme nature atmosphere',
    },
    'buffalo_mega': {
        'name': 'Buffalo Thunder King',
        'thumb': 'crowned buffalo king with lightning antlers, massive herd, thunder plains, majestic alpha male, epic slot game art',
        'bg': 'vast thunder plains with massive buffalo king silhouette, lightning storm, golden dust, epic mega nature atmosphere',
    },
    'castle_siege': {
        'name': 'Siege Fortress',
        'thumb': 'medieval castle under siege, catapults, fire arrows, stone walls crumbling, knight defenders, epic medieval battle slot game art',
        'bg': 'medieval castle siege at night, fire arrows arcing, siege towers approaching, dramatic battle atmosphere',
    },
    'chaos_crew': {
        'name': 'Chaos Crew',
        'thumb': 'punk rock chaos crew characters, spray paint, explosions, skateboard, neon graffiti, rebellious cartoon slot game art',
        'bg': 'chaotic urban skatepark with neon graffiti walls, explosions of paint, punk rock atmosphere, vibrant chaos',
    },
    'clockwork_realm': {
        'name': 'Clockwork Empire',
        'thumb': 'steampunk clockwork mechanism, brass gears, pocket watch, steam engine, victorian technology, slot game steampunk art',
        'bg': 'steampunk clockwork workshop, massive brass gears turning, steam pipes, warm amber lighting, victorian industrial atmosphere',
    },
    'coin_strike': {
        'name': 'Coin Strike',
        'thumb': 'golden coins raining down, coin vault, treasure strike, gleaming gold, money explosion, slot game treasure art',
        'bg': 'golden vault with coins cascading from ceiling, treasure piles, golden light, opulent treasure atmosphere',
    },
    'coin_volcano': {
        'name': 'Coin Volcano',
        'thumb': 'erupting volcano spewing golden coins, lava and gold mixing, tropical island, explosive treasure, slot game art',
        'bg': 'volcanic island with golden lava erupting, coins flying through air, tropical ocean, explosive dramatic atmosphere',
    },
    'crystal_chambers': {
        'name': 'Crystal Caverns',
        'thumb': 'enormous crystal cavern with glowing gems, amethyst quartz emerald, underground treasure chamber, slot game crystal art',
        'bg': 'vast underground crystal cavern, bioluminescent crystals, underground lake reflection, magical gem atmosphere',
    },
    'crystal_shrine': {
        'name': 'Crystal Shrine',
        'thumb': 'ancient crystal shrine with magical orbs, floating crystals, divine light, mystical sanctuary, slot game fantasy art',
        'bg': 'floating crystal shrine in clouds, divine light beams, crystal pillars, mystical heavenly atmosphere',
    },
    'dog_house_mega': {
        'name': 'Mega Dog House',
        'thumb': 'adorable dogs in a luxury mega dog house, golden bones, puppy treats, cute cartoon dogs, fun slot game art',
        'bg': 'luxury dog house mansion with bone decorations, happy puppies playing, golden sunset, cute whimsical atmosphere',
    },
    'dragon_coins': {
        'name': 'Dragon Coins',
        'thumb': 'dragon guarding pile of golden coins, breathing fire, treasure hoard, medieval fantasy, slot game dragon art',
        'bg': 'dragon lair with golden coin mountains, fire breath lighting, medieval cavern, treasure atmosphere',
    },
    'dragon_forge': {
        'name': 'Dragon Forge',
        'thumb': 'blacksmith forging legendary sword with dragon fire, anvil sparks, molten metal, dragon forge workshop, slot game art',
        'bg': 'dragon forge workshop, molten metal rivers, dragon fire bellows, sparks flying, intense forge atmosphere',
    },
    'elvis_frog': {
        'name': 'Vegas Frog',
        'thumb': 'cool frog dressed as elvis in vegas, sunglasses, microphone, las vegas lights, retro rock and roll, fun slot game art',
        'bg': 'las vegas strip at night with neon signs, elvis-themed casino, bright lights, retro vegas atmosphere',
    },
    'esqueleto_fiesta': {
        'name': 'Day of the Dead Fiesta',
        'thumb': 'dia de los muertos skeleton playing guitar, sugar skulls, marigolds, colorful mexican folk art, slot game art',
        'bg': 'day of the dead altar with candles, marigolds, sugar skulls, papel picado banners, vibrant mexican folk atmosphere',
    },
    'eternal_romance': {
        'name': 'Eternal Romance',
        'thumb': 'vampire romance couple, gothic castle, red roses, moonlit balcony, eternal love, dark romantic slot game art',
        'bg': 'gothic castle balcony under full moon, red roses, romantic candlelight, dark romance atmosphere',
    },
    'fire_hole': {
        'name': 'Fire in the Hole',
        'thumb': 'mining explosion with dynamite, mine cart, gemstones flying, underground mine, explosive action, slot game mining art',
        'bg': 'underground mine shaft with dynamite explosion, gemstones scattered, mine cart tracks, dramatic mining atmosphere',
    },
    'galactic_raiders': {
        'name': 'Galactic Raiders',
        'thumb': 'space pirates in starships, alien artifacts, space battle, nebula background, sci-fi adventure, slot game space art',
        'bg': 'deep space battle between pirate starships, nebula background, laser fire, asteroid field, epic space atmosphere',
    },
    'gold_crown_club': {
        'name': 'Crown Club VIP',
        'thumb': 'luxurious VIP casino club, golden crown, champagne, velvet ropes, exclusive high roller, premium slot game art',
        'bg': 'exclusive VIP casino lounge, golden crown centerpiece, champagne bottles, velvet decor, luxury casino atmosphere',
    },
    'gold_rush_frog': {
        'name': 'Gold Rush Frog',
        'thumb': 'lucky frog sitting on gold nuggets, gold rush mining town, gold panning, prospector theme, fun slot game art',
        'bg': 'gold rush mining town, gold panning creek, wooden buildings, golden sunset, wild west gold rush atmosphere',
    },
    'golden_fortune': {
        'name': 'Golden Fortune Wheel',
        'thumb': 'massive golden fortune wheel spinning, jewels and prizes, celestial backdrop, mega jackpot, slot game art',
        'bg': 'celestial chamber with golden fortune wheel, divine light, jewels floating, opulent jackpot atmosphere',
    },
    'golden_jaguar': {
        'name': 'Golden Jaguar',
        'thumb': 'majestic golden jaguar in amazon rainforest, mayan temple, emerald jungle, exotic wildlife, slot game art',
        'bg': 'amazon rainforest with golden light, mayan temple ruins, jaguar prowling, lush tropical atmosphere',
    },
    'goldstorm_ultra': {
        'name': 'Gold Storm Ultra',
        'thumb': 'massive golden storm with coins raining, lightning made of gold, ultra power, epic weather treasure, slot game art',
        'bg': 'dramatic sky with golden lightning storm, coins falling like rain, ultra-powered golden atmosphere',
    },
    'grand_prix_rush': {
        'name': 'Grand Prix Rush',
        'thumb': 'formula one race car speeding, checkered flag, racing circuit, speed blur, adrenaline racing, slot game art',
        'bg': 'formula one race track at night, racing lights, speed blur effect, adrenaline motorsport atmosphere',
    },
    'iron_stampede': {
        'name': 'Iron Stampede',
        'thumb': 'mechanical iron animals stampeding, steampunk wildlife, brass and steel, industrial nature fusion, slot game art',
        'bg': 'steampunk savanna with mechanical animals, brass gears in sky, industrial nature fusion atmosphere',
    },
    'island_tiki': {
        'name': 'Tiki Paradise',
        'thumb': 'tropical tiki island with carved tiki masks, palm trees, volcanic island, exotic cocktails, slot game tiki art',
        'bg': 'tropical tiki island paradise, tiki torches, volcanic mountain, turquoise lagoon, exotic tiki atmosphere',
    },
    'le_bandit': {
        'name': 'Le Bandit',
        'thumb': 'french cat burglar on rooftop, eiffel tower, moonlit paris, stolen jewels, noir heist, slot game art',
        'bg': 'paris rooftops at midnight, eiffel tower silhouette, moonlit sky, noir heist atmosphere',
    },
    'lightning_pearl': {
        'name': 'Lightning Pearl',
        'thumb': 'magical pearl emitting lightning in deep ocean, mermaid realm, underwater palace, electric ocean, slot game art',
        'bg': 'deep ocean palace with lightning pearl at center, bioluminescent coral, mermaid silhouettes, electric underwater atmosphere',
    },
    'lucha_mania': {
        'name': 'Lucha Libre Mania',
        'thumb': 'mexican lucha libre wrestlers in ring, colorful masks, wrestling action, crowd cheering, slot game wrestling art',
        'bg': 'lucha libre wrestling arena, colorful spotlights, cheering crowd, dramatic wrestling atmosphere',
    },
    'mega_joker': {
        'name': 'Mega Joker',
        'thumb': 'giant golden joker card, classic casino symbols, mega jackpot crown, playing cards flying, slot game art',
        'bg': 'luxury casino interior with giant joker card display, playing cards scattered, golden casino atmosphere',
    },
    'mega_safari': {
        'name': 'Mega Safari Jackpot',
        'thumb': 'african safari big five animals, lion elephant rhino buffalo leopard, golden savanna, jackpot safari, slot game art',
        'bg': 'african savanna at golden hour with big five animals, dramatic sky, baobab trees, epic safari atmosphere',
    },
    'mental_meltdown': {
        'name': 'Mental Meltdown',
        'thumb': 'psychedelic brain meltdown, surreal abstract art, melting reality, neon chaos, experimental slot game art',
        'bg': 'surreal psychedelic dimension, melting architecture, impossible geometry, neon colors, mind-bending atmosphere',
    },
    'merlin_power': {
        'name': 'Merlin Arcane Power',
        'thumb': 'wizard merlin casting powerful spell, crystal staff, floating spell books, magic runes, arcane power, slot game art',
        'bg': 'merlin wizard tower interior, floating spell books, crystal orbs, arcane rune circles, mystical magic atmosphere',
    },
    'midnight_drifter': {
        'name': 'Midnight Drift',
        'thumb': 'street racing drifter car at midnight, neon underglow, city lights blur, tire smoke, slot game racing art',
        'bg': 'midnight city street with drift cars, neon underglow reflecting on wet road, tire smoke, urban racing atmosphere',
    },
    'mine_coins': {
        'name': 'Mine of Coins',
        'thumb': 'underground mine full of golden coins, minecart overflowing, pickaxe, gem-studded walls, slot game mining art',
        'bg': 'underground mine tunnel with golden veins, minecart on tracks, lantern light, rich mining atmosphere',
    },
    'monaco_million': {
        'name': 'Monaco Millions',
        'thumb': 'monte carlo casino exterior, luxury yacht, supercars, champagne, high roller lifestyle, slot game luxury art',
        'bg': 'monaco harbor at sunset, luxury yachts, monte carlo casino, palm trees, high-end luxury atmosphere',
    },
    'mystic_cauldron': {
        'name': 'Mystic Cauldron',
        'thumb': 'witch brewing in magical cauldron, bubbling potions, spell ingredients, enchanted forest, slot game witch art',
        'bg': 'enchanted forest clearing with bubbling cauldron, magical smoke, glowing mushrooms, mystical witch atmosphere',
    },
    'neon_viper': {
        'name': 'Neon Viper',
        'thumb': 'cyberpunk neon snake viper, electric scales, futuristic city, toxic green and purple, slot game cyberpunk art',
        'bg': 'cyberpunk alley with neon snake hologram, rain, toxic green neon, futuristic urban atmosphere',
    },
    'nitro_street': {
        'name': 'Nitro Street',
        'thumb': 'nitro-boosted street racer, flames from exhaust, urban street race, adrenaline speed, slot game racing art',
        'bg': 'urban street at night with nitro racers, flame trails, neon city lights, adrenaline street racing atmosphere',
    },
    'olympian_gods': {
        'name': 'Olympian Pantheon',
        'thumb': 'all greek gods on mount olympus, zeus poseidon athena apollo, divine gathering, epic mythology, slot game art',
        'bg': 'mount olympus cloud palace, divine thrones, golden sunlight, epic greek mythology atmosphere',
    },
    'olympus_dream': {
        'name': 'Olympus Dream Drop',
        'thumb': 'dreamy olympus clouds with falling prizes, golden coins and gems raining from divine clouds, slot game art',
        'bg': 'dreamy cloud palace with golden prizes floating down, divine light, ethereal olympus atmosphere',
    },
    'olympus_rising': {
        'name': 'Olympus Rising',
        'thumb': 'mount olympus rising from clouds, massive greek temple, lightning bolts, divine ascension, epic slot game art',
        'bg': 'massive mount olympus temple ascending through clouds, epic scale, divine lightning, awe-inspiring atmosphere',
    },
    'pirate_fortune': {
        'name': 'Pirate Fortune',
        'thumb': 'pirate ship with treasure map, skull and crossbones, golden doubloons, tropical island, slot game pirate art',
        'bg': 'pirate ship sailing past tropical treasure island, sunset, treasure chest on beach, adventurous pirate atmosphere',
    },
    'pixel_rewind': {
        'name': 'Pixel Rewind',
        'thumb': 'retro 8-bit pixel art gaming, arcade machine, pixel characters, nostalgia rewind, slot game retro art',
        'bg': 'retro arcade room with CRT monitors, pixel art walls, 80s aesthetic, nostalgic gaming atmosphere',
    },
    'pots_olympus': {
        'name': 'Pots of Zeus',
        'thumb': 'golden greek pots overflowing with lightning and coins, zeus energy, ancient pottery, slot game art',
        'bg': 'greek temple treasury with golden pots, lightning strikes, divine greek atmosphere',
    },
    'power_crown': {
        'name': 'Crown of Power',
        'thumb': 'supreme golden crown with magical gems, power energy flowing, royal throne, ultimate power, slot game art',
        'bg': 'royal throne room with power crown floating above, energy beams, golden opulent atmosphere',
    },
    'puppy_palace': {
        'name': 'Puppy Palace',
        'thumb': 'adorable puppies in luxury palace, golden dog bowls, cute puppies wearing crowns, whimsical slot game art',
        'bg': 'luxury puppy palace interior, golden accents, adorable puppies everywhere, cute luxury atmosphere',
    },
    'rockstar_wild': {
        'name': 'Rock Star Wild',
        'thumb': 'rock star on stage with electric guitar, pyrotechnics, crowd surfing, concert stage, slot game music art',
        'bg': 'massive rock concert stage, pyrotechnics, crowd of fans, dramatic stage lighting, rock and roll atmosphere',
    },
    'rome_eternal': {
        'name': 'Rome Eternal',
        'thumb': 'eternal rome colosseum, gladiator with sword and shield, roman legions, imperial eagles, slot game roman art',
        'bg': 'ancient rome colosseum interior, gladiatorial arena, roman architecture, dramatic imperial atmosphere',
    },
    'snow_queen_riches': {
        'name': 'Snow Queen Riches',
        'thumb': 'ice queen in frozen palace, crystal crown, snow magic, ice diamonds, winter wonderland, slot game art',
        'bg': 'frozen ice palace interior, crystal chandelier, snowflakes, blue and white ice magic atmosphere',
    },
    'snoop_dollars': {
        'name': 'Hip Hop Millions',
        'thumb': 'hip hop luxury lifestyle, gold chains, dollar bills, boombox, graffiti, urban style, slot game hip hop art',
        'bg': 'hip hop music studio with gold records, dollar signs, neon graffiti, urban luxury atmosphere',
    },
    'thunder_hero': {
        'name': 'Thunder Hero',
        'thumb': 'superhero wielding lightning powers, cape flowing, city skyline, heroic pose, thunder energy, slot game hero art',
        'bg': 'city skyline with thunderstorm, superhero silhouette on rooftop, lightning strikes, heroic atmosphere',
    },
    'tome_madness': {
        'name': 'Tome of Madness',
        'thumb': 'ancient mad wizard tome, eldritch tentacles, forbidden knowledge, cosmic horror, lovecraftian slot game art',
        'bg': 'eldritch library with floating books, cosmic tentacles, madness portals, lovecraftian horror atmosphere',
    },
    'twin_helix': {
        'name': 'Twin Helix',
        'thumb': 'DNA double helix made of energy, genetic laboratory, futuristic biotech, twin spirals, slot game sci-fi art',
        'bg': 'futuristic biotech laboratory, glowing DNA helix, holographic displays, sci-fi genetic atmosphere',
    },
    'vault_coins': {
        'name': 'Vault of Coins',
        'thumb': 'massive bank vault door opening to coin treasure, security systems, golden coins, heist theme, slot game art',
        'bg': 'inside bank vault with massive coin piles, vault door, security lasers, treasure heist atmosphere',
    },
    'wild_deep': {
        'name': 'Wild Deep',
        'thumb': 'deep ocean wildlife, giant octopus, deep sea creatures, bioluminescent depths, ocean treasure, slot game art',
        'bg': 'deep ocean floor with bioluminescent creatures, coral formations, sunken treasure, mysterious deep sea atmosphere',
    },
    'wild_safari': {
        'name': 'Wild Safari',
        'thumb': 'african safari wildlife, lion pride, giraffes, zebras, golden savanna, wildlife photography style, slot game art',
        'bg': 'african safari panorama, wildlife silhouettes at sunset, acacia trees, golden savanna atmosphere',
    },
    'wild_west_rush': {
        'name': 'Wild West Gold Rush',
        'thumb': 'wild west gold rush town, prospectors, gold nuggets, saloon, cowboys, frontier town, slot game western art',
        'bg': 'wild west frontier gold rush town, dusty main street, gold mine entrance, western gold rush atmosphere',
    },
    'wildfire_gold': {
        'name': 'Wildfire Gold',
        'thumb': 'wildfire spreading through golden forest, fire and gold merging, nature inferno, dramatic slot game art',
        'bg': 'golden forest wildfire landscape, dramatic fire and gold, ember particles, intense nature atmosphere',
    },
    'world_cup_glory': {
        'name': 'World Cup Glory',
        'thumb': 'world cup trophy golden, football stadium, confetti celebration, championship glory, slot game sports art',
        'bg': 'massive football stadium with world cup celebration, confetti rain, spotlight, championship atmosphere',
    },
    'golden_vault_pharaoh': {
        'name': 'Golden Vault Pharaoh',
        'thumb': 'pharaoh king standing before golden treasure vault overflowing with riches, jeweled sarcophagus, golden hieroglyphic walls, ancient egyptian treasure chamber, dramatic amber lighting, slot game art',
        'bg': 'cavernous pharaoh treasure vault with towering gold piles, flickering torch light, hieroglyphic inscriptions glowing, sacred treasures gleaming, mystical egyptian vault atmosphere',
    },
    'mythic_olympiad': {
        'name': 'Mythic Olympiad',
        'thumb': 'grand olympic arena with greek columns, warrior athletes competing, golden laurel wreaths, divine light from above, spectators in stands, epic mythology slot game art',
        'bg': 'massive ancient greek olympic stadium, columns framing arena, athletes in battle stance, dramatic sunset sky, divine golden light, mythic championship atmosphere',
    },
    'neon_nexus': {
        'name': 'Neon Nexus',
        'thumb': 'cyberpunk neon megacity skyline, holographic billboards, flying vehicles, electric blue and pink neon lights, futuristic architecture, cyber consciousness, slot game sci-fi art',
        'bg': 'sprawling neon cyberpunk city at night, towering skyscrapers with neon signs, rain-slicked streets reflecting light, flying cars, dark neon futuristic atmosphere',
    },
    'anglers_fortune': {
        'name': 'Angler\'s Fortune',
        'thumb': 'serene mountain lake at sunrise, fisherman casting line with shimmering catch, water ripples, golden light reflecting, pine trees, peaceful fishing scene, slot game nature art',
        'bg': 'tranquil alpine lake surrounded by evergreens, golden sunrise light, mist over water, fishing boat in distance, serene peaceful fishing atmosphere',
    },
    'mecha_warriors': {
        'name': 'Mecha Warriors',
        'thumb': 'giant mecha robots locked in epic battle, metallic armor glinting, energy weapons firing, explosion effects, robot detail, dynamic action composition, slot game mecha art',
        'bg': 'dramatic mecha robot battle scene, towering robots clashing, explosive energy beams, industrial cityscape destroyed, intense battle atmosphere',
    },
    'enchanted_grove': {
        'name': 'Enchanted Grove',
        'thumb': 'magical forest clearing with glowing bioluminescent mushrooms, ethereal glowing flowers, floating fairy lights, twisted ancient trees, mystical mist, enchanted woodland, slot game fantasy art',
        'bg': 'enchanted forest grove with towering magical trees, glowing mushroom circles, ethereal light wisps, floating magical particles, mystical magical atmosphere',
    },
    'dragons_hoard': {
        'name': 'Dragon\'s Hoard',
        'thumb': 'fearsome red dragon coiled upon mountain of treasure, golden coins and gems, breathing flames, glowing scales, treasure chest, medieval fantasy, slot game dragon art',
        'bg': 'dragon\'s cave chamber with towering treasure piles, molten lava glow, dragon shadow looming above, precious gems and coins scattered, treasure hoard atmosphere',
    },
    'time_keepers_book': {
        'name': 'Time Keeper\'s Book',
        'thumb': 'mystical ancient book floating in time vortex, clockwork gears, swirling time portals, glowing runes, quantum energy, time travel theme, slot game fantasy art',
        'bg': 'interdimensional library with floating ancient books, swirling temporal vortex, glowing clock mechanisms, cosmic time energy, mystical time-travel atmosphere',
    },
    'cyber_rebellion': {
        'name': 'Cyber Rebellion',
        'thumb': 'urban hacker rebellion scene, masked hackers at workstations, code cascading down screens, neon green terminal lines, encrypted data, cyberpunk uprising, slot game tech art',
        'bg': 'futuristic hacker hideout with glowing computer screens, neon code matrix, dark industrial warehouse, green and purple neon glow, cyber rebellion atmosphere',
    },
    'volcano_riches': {
        'name': 'Volcano Riches',
        'thumb': 'erupting volcano with molten lava fountain, precious gemstones scattered in lava flow, golden light from eruption, tropical island setting, dramatic explosion, slot game nature art',
        'bg': 'massive volcanic eruption with lava rivers, glowing gemstones embedded in lava, night sky lit by eruption glow, smoke and ash, intense volcanic atmosphere',
    },
    'sunken_treasure': {
        'name': 'Sunken Treasure',
        'thumb': 'underwater pirate shipwreck with broken masts, treasure chest overflowing with coins and jewels, bioluminescent sea creatures, coral formations, deep ocean murk, slot game ocean art',
        'bg': 'dark ocean depths with sunken pirate ship, treasure chest surrounded by coral, bioluminescent creatures swimming, filtered blue underwater light, mysterious shipwreck atmosphere',
    },
    'wild_stallion': {
        'name': 'Wild Stallion',
        'thumb': 'wild mustang horse herd galloping across desert dunes, dust clouds billowing, golden sunset light, adobe cliffs, powerful wild horses, dramatic western scene, slot game nature art',
        'bg': 'vast desert landscape with wild mustang herd thundering across sand, dramatic sunset sky, dust clouds rising, desert rock formations, free untamed nature atmosphere',
    },
    'celestial_cosmos': {
        'name': 'Celestial Cosmos',
        'thumb': 'deep space scene with multiple galaxies and nebulas, cosmic dust clouds, colorful star clusters, black hole silhouette, infinite universe, slot game space art',
        'bg': 'infinite cosmos with swirling nebulas, colorful galaxy clusters, distant stars twinkling, cosmic rays of light, deep space exploration atmosphere',
    },
    'jade_prosperity': {
        'name': 'Jade Prosperity',
        'thumb': 'serene chinese jade garden with ornate stone bridges, koi fish in ponds, bamboo groves, jade temple structures, golden sunset light, asian harmony, slot game oriental art',
        'bg': 'peaceful traditional chinese jade garden, stone moon bridge, koi pond reflection, bamboo trees, temple pagoda, serene oriental prosperity atmosphere',
    },
    'inferno_fiesta': {
        'name': 'Inferno Fiesta',
        'thumb': 'mexican fire festival with flaming performers, illuminated float parade, mariachi band, colorful papel picado banners, fireworks explosion, festive heat, slot game party art',
        'bg': 'mexican village fire festival night, flaming torches lighting streets, fireworks bursting, festive decorations, warm orange glow, vibrant fiesta atmosphere',
    },
    'mystic_wolf': {
        'name': 'Mystic Wolf',
        'thumb': 'wolf pack howling at blood moon, mystical lunar glow, dark forest silhouettes, glowing wolf eyes, paranormal energy, moonlit wilderness, slot game wildlife art',
        'bg': 'dark forest clearing under blood-red full moon, wolf pack silhouettes, mystical purple moonlight, bare twisted trees, mysterious pack atmosphere',
    },
    'ancient_alchemist': {
        'name': 'Ancient Alchemist',
        'thumb': 'medieval alchemy laboratory with bubbling potions, alchemist robed figure, floating crystal orbs, transmutation circles, mystical experiments, occult atmosphere, slot game fantasy art',
        'bg': 'ancient stone alchemy laboratory, shelves of glowing potion bottles, alchemist workspace, glowing runes on walls, purple mystical smoke, occult alchemy atmosphere',
    },
    'thunder_titan': {
        'name': 'Thunder Titan',
        'thumb': 'colossal greek titan wielding thunderbolt, lightning crackling around body, olympus in background, divine power, mythological god-figure, epic scale, slot game mythology art',
        'bg': 'mount olympus with towering titan silhouette, massive lightning bolts striking ground, epic clouds, divine golden light, mythological titan power atmosphere',
    },
    'carnival_chaos': {
        'name': 'Carnival Chaos',
        'thumb': 'vibrant carnival fairground with spinning ferris wheel, colorful roller coaster loops, carousel horses, carnival lights, playful chaos, cotton candy stands, slot game carnival art',
        'bg': 'festive carnival at night with illuminated rides, ferris wheel spinning, colorful carnival tent tops, bright carnival lights, playful joyful atmosphere',
    },
    'safari_king': {
        'name': 'Safari King',
        'thumb': 'majestic lion king surveying african savanna herd, golden mane, crown of power, gazelle and zebra, acacia trees, dramatic dawn light, slot game wildlife art',
        'bg': 'golden african savanna with lion king standing proud, wildlife scattered below, acacia trees dotting horizon, dramatic sunrise sky, majestic safari atmosphere',
    },
    'crystal_royals': {
        'name': 'Crystal Royals',
        'thumb': 'crystal palace with towering gem formations, golden royal crown hovering above, glowing crystal throne, refracted rainbow light, jeweled ornaments, divine luxury, slot game fantasy art',
        'bg': 'magnificent crystal palace interior, towering crystal formations, golden royal throne room, rainbow light refractions, mystical gem glow, royal crystal atmosphere',
    },
    'infernal_depths': {
        'name': 'Infernal Depths',
        'thumb': 'hellish underworld depths with demonic architecture, molten lava rivers, demonic statues, dark gothic structures, flames and smoke, infernal red glow, slot game horror art',
        'bg': 'deep hellish underworld cavern, rivers of molten lava, demonic stone structures, flames licking walls, dark crimson atmosphere, infernal depths darkness',
    },
    'rainbow_riches_quest': {
        'name': 'Rainbow Riches Quest',
        'thumb': 'irish leprechaun dancing before pot of gold at rainbow\'s end, four-leaf clovers, golden coins scattered, mystical rainbow light, magical forest, slot game luck art',
        'bg': 'magical irish landscape with full rainbow spanning sky, pot of gold glowing at rainbow\'s end, magical forest clearing, golden light beams, lucky enchanted atmosphere',
    },
    'steampunk_gears': {
        'name': 'Steampunk Gears',
        'thumb': 'massive interlocking brass gears turning, victorian clockwork mechanisms, steam vents, copper pipes, mechanical precision, industrial revolution era, slot game steampunk art',
        'bg': 'victorian steampunk clockwork mechanism, giant brass gears rotating, steam and pressure vents, copper tubing, amber industrial lighting, mechanical steampunk atmosphere',
    },
    'phoenix_rising': {
        'name': 'Phoenix Rising',
        'thumb': 'majestic phoenix bird emerging from flames, fiery wings spread wide, golden feathers glowing, rebirth flames, mythological power, dramatic ascension, slot game mythology art',
        'bg': 'phoenix rising from inferno of flames, golden fire light, dramatic sky with mystical energy, ash and embers swirling, rebirth transformation atmosphere',
    },
    'arctic_frost': {
        'name': 'Arctic Frost',
        'thumb': 'arctic tundra landscape with polar bear, aurora borealis dancing overhead, ice crystals glittering, snow-covered peaks, northern lights magic, frozen wilderness, slot game nature art',
        'bg': 'arctic polar region with massive polar bear, aurora borealis filling sky, ice sheet landscape, starlit night with green aurora glow, frozen arctic atmosphere',
    },
    'urban_rooftop': {
        'name': 'Urban Rooftop',
        'thumb': 'city penthouse rooftop party at night, manhattan skyline backdrop, champagne glasses, luxury furniture, city lights below, glamorous nightlife, slot game luxury art',
        'bg': 'exclusive rooftop terrace high above city, stunning urban skyline at night, city lights twinkling below, luxury decor, nighttime metropolitan atmosphere',
    },
    'enchanted_maze': {
        'name': 'Enchanted Maze',
        'thumb': 'magical labyrinth with glowing hedge walls, floating magical orbs marking path, mystical creatures peeking out, ethereal light, enchanted woodland, winding passages, slot game fantasy art',
        'bg': 'mysterious enchanted hedge maze from above, glowing orbs floating above paths, magical forest surrounding maze, mystical purple light, enchanted atmosphere',
    },
    'samurai_honor': {
        'name': 'Samurai Honor',
        'thumb': 'japanese samurai warrior in combat stance, katana sword gleaming, traditional armor with gold accents, cherry blossoms falling, temple background, honor and discipline, slot game warrior art',
        'bg': 'japanese temple grounds with samurai warrior standing proud, cherry blossom tree overhead, traditional architecture, sunset golden light, honorable warrior atmosphere',
    },
    'mega_diamond_rush': {
        'name': 'Mega Diamond Rush',
        'thumb': 'massive diamond mine with glittering gems everywhere, miners with pickaxes, precious gemstones cascading, sparkling crystal formations, treasure wealth, mega jackpot, slot game treasure art',
        'bg': 'vast underground diamond mine with towering gem formations, cascading diamonds, mine shafts and tunnel, crystal light refractions, wealth treasure atmosphere',
    },
}

# Shared negative prompt for quality
NEGATIVE_PROMPT = "blurry, low quality, distorted, ugly, worst quality, bad anatomy, bad proportions, duplicate, deformed"


class SDXLAssetGenerator:
    """Generates HD game assets using SDXL"""

    def __init__(self, model_id: str = "stabilityai/stable-diffusion-xl-base-1.0",
                 refiner_id: Optional[str] = "stabilityai/stable-diffusion-xl-refiner-1.0",
                 use_refiner: bool = False,
                 device: str = "cuda",
                 dtype: torch.dtype = torch.float16):
        """
        Initialize SDXL pipelines

        Args:
            model_id: HuggingFace model ID for base model
            refiner_id: HuggingFace model ID for refiner model
            use_refiner: Whether to use refiner for enhanced quality
            device: Device to run on (cuda or cpu)
            dtype: Data type for inference (torch.float16 or torch.float32)
        """
        self.device = device
        self.dtype = dtype
        self.use_refiner = use_refiner

        print(f"Loading SDXL base model: {model_id}")
        self.pipe = StableDiffusionXLPipeline.from_pretrained(
            model_id,
            torch_dtype=dtype,
            use_safetensors=True,
            variant="fp16" if dtype == torch.float16 else None
        )
        self.pipe = self.pipe.to(device)

        self.refiner = None
        if use_refiner:
            print(f"Loading SDXL refiner model: {refiner_id}")
            self.refiner = StableDiffusionXLImg2ImgPipeline.from_pretrained(
                refiner_id,
                torch_dtype=dtype,
                use_safetensors=True,
                variant="fp16" if dtype == torch.float16 else None
            )
            self.refiner = self.refiner.to(device)

    def generate_image(self,
                      prompt: str,
                      width: int = 1024,
                      height: int = 1024,
                      num_inference_steps: int = 35,
                      guidance_scale: float = 7.5,
                      negative_prompt: str = NEGATIVE_PROMPT,
                      seed: Optional[int] = None) -> Image.Image:
        """
        Generate a single image using SDXL

        Args:
            prompt: Text prompt for image generation
            width: Image width (default SDXL: 1024)
            height: Image height (default SDXL: 1024)
            num_inference_steps: Number of inference steps (20-50)
            guidance_scale: Classifier-free guidance scale
            negative_prompt: Negative prompt for quality control
            seed: Random seed for reproducibility

        Returns:
            PIL Image object
        """
        if seed is not None:
            torch.manual_seed(seed)

        # Base generation
        image = self.pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            height=height,
            width=width,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
            denoising_end=0.8 if self.use_refiner else 1.0
        ).images[0]

        # Optional refiner pass
        if self.use_refiner and self.refiner:
            image = self.refiner(
                prompt=prompt,
                negative_prompt=negative_prompt,
                image=image,
                denoising_start=0.8,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale
            ).images[0]

        return image

    def resize_to_target(self, image: Image.Image, target_width: int, target_height: int) -> Image.Image:
        """Resize image to target dimensions maintaining aspect ratio with letterboxing if needed"""
        # Calculate aspect ratios
        img_aspect = image.width / image.height
        target_aspect = target_width / target_height

        if img_aspect > target_aspect:
            # Image is wider, fit to height
            new_height = target_height
            new_width = int(target_height * img_aspect)
        else:
            # Image is taller, fit to width
            new_width = target_width
            new_height = int(target_width / img_aspect)

        # Resize
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Create letterbox canvas
        canvas = Image.new('RGB', (target_width, target_height), color=(0, 0, 0))
        offset_x = (target_width - new_width) // 2
        offset_y = (target_height - new_height) // 2
        canvas.paste(image, (offset_x, offset_y))

        return canvas


def load_progress(progress_file: str) -> Dict:
    """Load generation progress from file"""
    if os.path.exists(progress_file):
        with open(progress_file, 'r') as f:
            return json.load(f)
    return {
        'generated': [],
        'failed': [],
        'start_time': datetime.now().isoformat(),
        'last_updated': datetime.now().isoformat()
    }


def save_progress(progress_file: str, progress: Dict) -> None:
    """Save generation progress to file"""
    progress['last_updated'] = datetime.now().isoformat()
    with open(progress_file, 'w') as f:
        json.dump(progress, f, indent=2)


def parse_games_arg(games_str: Optional[str]) -> List[str]:
    """Parse comma-separated games string into list of game IDs"""
    if not games_str:
        return []
    return [g.strip() for g in games_str.split(',')]


def main():
    parser = argparse.ArgumentParser(
        description='Generate HD slot game assets using SDXL',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Generate all games with standard quality
  python generate_sdxl_assets.py --all --quality standard

  # Generate specific games with ultra quality
  python generate_sdxl_assets.py --games sugar_rush,wolf_gold --quality ultra

  # Generate only thumbnails with draft quality
  python generate_sdxl_assets.py --games gates_olympus --type thumb --quality draft

  # Force regenerate all backgrounds
  python generate_sdxl_assets.py --all --type bg --force
        '''
    )

    parser.add_argument('--all', action='store_true',
                       help='Generate all 120 games')
    parser.add_argument('--games', type=str,
                       help='Comma-separated list of game IDs (e.g., sugar_rush,wolf_gold)')
    parser.add_argument('--type', choices=['thumb', 'bg', 'both'], default='both',
                       help='Asset type to generate (default: both)')
    parser.add_argument('--quality', choices=['draft', 'standard', 'ultra'], default='standard',
                       help='Quality preset (20/35/50 steps)')
    parser.add_argument('--force', action='store_true',
                       help='Regenerate even if assets exist')
    parser.add_argument('--refiner', action='store_true',
                       help='Use SDXL refiner for enhanced quality (slower)')
    parser.add_argument('--model', type=str, default='stabilityai/stable-diffusion-xl-base-1.0',
                       help='Base model ID')
    parser.add_argument('--refiner-model', type=str, default='stabilityai/stable-diffusion-xl-refiner-1.0',
                       help='Refiner model ID')
    parser.add_argument('--device', choices=['cuda', 'cpu'], default='cuda',
                       help='Device to run on (default: cuda)')
    parser.add_argument('--dtype', choices=['fp16', 'fp32'], default='fp16',
                       help='Data type for inference (default: fp16)')
    parser.add_argument('--seed', type=int, default=None,
                       help='Random seed for reproducibility')
    parser.add_argument('--output-dir', type=str, default='assets',
                       help='Output directory for assets (default: assets)')

    args = parser.parse_args()

    # Validate arguments
    if not args.all and not args.games:
        parser.error("Must specify either --all or --games")

    # Determine games to generate
    if args.all:
        games_to_generate = list(GAME_PROMPTS.keys())
    else:
        games_to_generate = parse_games_arg(args.games)
        # Validate game IDs
        invalid_games = [g for g in games_to_generate if g not in GAME_PROMPTS]
        if invalid_games:
            parser.error(f"Unknown game IDs: {', '.join(invalid_games)}")

    # Map quality to steps
    quality_steps = {
        'draft': 20,
        'standard': 35,
        'ultra': 50
    }
    num_steps = quality_steps[args.quality]

    # Setup paths
    output_dir = Path(args.output_dir)
    thumb_dir = output_dir / 'thumbnails'
    bg_dir = output_dir / 'backgrounds' / 'slots'
    progress_file = output_dir / 'generation_progress.json'

    thumb_dir.mkdir(parents=True, exist_ok=True)
    bg_dir.mkdir(parents=True, exist_ok=True)

    # Load progress
    progress = load_progress(str(progress_file))

    # Calculate total work
    total_work = 0
    if args.type in ['thumb', 'both']:
        total_work += len(games_to_generate)
    if args.type in ['bg', 'both']:
        total_work += len(games_to_generate)

    print(f"\n{'='*60}")
    print(f"SDXL Asset Generator")
    print(f"{'='*60}")
    print(f"Games to generate: {len(games_to_generate)}")
    print(f"Asset types: {args.type}")
    print(f"Quality: {args.quality} ({num_steps} steps)")
    print(f"Using refiner: {args.refiner}")
    print(f"Device: {args.device}")
    print(f"Data type: {args.dtype}")

    # Estimate time
    time_per_image = num_steps * 0.05  # ~50ms per step on good GPU
    est_time = total_work * time_per_image / 60  # Convert to minutes
    print(f"Estimated time: {est_time:.1f} minutes")
    print(f"{'='*60}\n")

    # Initialize generator
    dtype = torch.float16 if args.dtype == 'fp16' else torch.float32
    generator = SDXLAssetGenerator(
        model_id=args.model,
        refiner_id=args.refiner_model,
        use_refiner=args.refiner,
        device=args.device,
        dtype=dtype
    )

    # Generate assets
    with tqdm(total=total_work, desc="Generating assets", unit="image") as pbar:
        for game_id in games_to_generate:
            game_info = GAME_PROMPTS[game_id]

            # Generate thumbnail
            if args.type in ['thumb', 'both']:
                thumb_path = thumb_dir / f"{game_id}.png"

                if thumb_path.exists() and not args.force:
                    print(f"Skipping {game_id} thumbnail (exists)")
                    pbar.update(1)
                else:
                    try:
                        print(f"Generating {game_id} thumbnail...")
                        image = generator.generate_image(
                            prompt=game_info['thumb'],
                            width=1024,
                            height=768,
                            num_inference_steps=num_steps,
                            seed=args.seed
                        )
                        # SDXL native is 1024x1024, resize to 1024x768
                        image = generator.resize_to_target(image, 1024, 768)
                        image.save(thumb_path, 'PNG', quality=95)

                        if game_id not in progress['generated']:
                            progress['generated'].append(game_id)
                        save_progress(str(progress_file), progress)
                    except Exception as e:
                        print(f"Error generating {game_id} thumbnail: {e}")
                        if game_id not in progress['failed']:
                            progress['failed'].append(game_id)

                    pbar.update(1)

            # Generate background
            if args.type in ['bg', 'both']:
                bg_path = bg_dir / f"{game_id}_bg.png"
                webp_path = bg_dir / f"{game_id}_bg.webp"

                if bg_path.exists() and not args.force:
                    print(f"Skipping {game_id} background (exists)")
                    pbar.update(1)
                else:
                    try:
                        print(f"Generating {game_id} background...")
                        image = generator.generate_image(
                            prompt=game_info['bg'],
                            width=1024,
                            height=1024,
                            num_inference_steps=num_steps,
                            seed=args.seed
                        )
                        # Resize to 1920x1080
                        image = generator.resize_to_target(image, 1920, 1080)
                        image.save(bg_path, 'PNG', quality=95)

                        # Save WebP version (960x540)
                        thumb_image = generator.resize_to_target(image, 960, 540)
                        thumb_image.save(webp_path, 'WEBP', quality=80)

                        if game_id not in progress['generated']:
                            progress['generated'].append(game_id)
                        save_progress(str(progress_file), progress)
                    except Exception as e:
                        print(f"Error generating {game_id} background: {e}")
                        if game_id not in progress['failed']:
                            progress['failed'].append(game_id)

                    pbar.update(1)

    # Print summary
    print(f"\n{'='*60}")
    print(f"Generation Complete")
    print(f"{'='*60}")
    print(f"Successfully generated: {len(set(progress['generated']))}")
    print(f"Failed: {len(set(progress['failed']))}")
    if progress['failed']:
        print(f"Failed games: {', '.join(progress['failed'])}")
    print(f"Assets saved to: {output_dir.absolute()}")
    print(f"Progress file: {progress_file.absolute()}")
    print(f"{'='*60}\n")


# ═══════════════════════════════════════════════════════════════
# BONUS GAME ASSET PROMPTS
# Generate HD backgrounds and UI elements for bonus game GUIs
# Usage: python generate_sdxl_assets.py --bonus-assets --all --quality standard
# ═══════════════════════════════════════════════════════════════

BONUS_TYPE_PROMPTS = {
    'tumble': {
        'bg': "Crystal cascade waterfall interior, glowing gem blocks falling through golden light rays, "
              "fantasy treasure cave with cascading precious stones, deep purple and gold atmosphere, "
              "magical particle effects, volumetric lighting, ultra detailed game background, 4K",
        'frame': "Ornate golden frame border with cascading crystal gems, jewel-encrusted edges, "
                 "multiplier ladder glowing with divine light, premium slot game UI element, transparent center, 4K",
    },
    'avalanche': {
        'bg': "Snow-capped mountain peak with avalanche of golden rocks and treasures, dramatic cliff edge, "
              "massive boulders cascading down mountainside through clouds, epic fantasy landscape, "
              "storm clouds with lightning, volumetric fog, cinematic game background, 4K",
        'frame': "Rough stone and ice frame border with mountain peaks and snow, avalanche rocks embedded in edges, "
                 "rugged natural stone texture, premium game UI element, transparent center, 4K",
    },
    'hold_and_win': {
        'bg': "Luxurious casino vault interior with golden safety deposit boxes, dramatic spotlight beams, "
              "locked golden grid of treasure compartments, velvet and chrome decor, "
              "atmospheric fog, jackpot glow effects, premium casino game background, 4K",
        'frame': "Golden vault door frame with combination lock details, chrome bolts and hinges, "
                 "safety deposit box grid pattern, premium metallic finish, transparent center, 4K",
    },
    'random_multiplier': {
        'bg': "Ethereal cosmic void with floating multiplier orbs of different colors, swirling nebula background, "
              "magical energy spheres raining down through starfield, fantasy space scene, "
              "glowing particle trails, aurora borealis colors, game background, 4K",
        'frame': "Cosmic energy ring frame with floating orb gems, stellar particle effects around edges, "
                 "nebula gradient border, glowing energy wisps, transparent center, 4K",
    },
    'wheel_multiplier': {
        'bg': "Grand fortune wheel in opulent casino hall, massive spinning prize wheel with colored segments, "
              "dramatic stage lighting with spotlights, rich red velvet curtains, golden accents, "
              "fireworks and sparkle effects, premium game show background, 4K",
        'frame': "Circular fortune wheel ornate frame, golden spokes and gem-studded rim, "
                 "spotlight rays emanating outward, show stage border, transparent center, 4K",
    },
    'expanding_symbol': {
        'bg': "Ancient mystical library with floating glowing book, magical symbols expanding from pages, "
              "golden hieroglyphic energy spreading across stone walls, Egyptian temple interior, "
              "candlelight and magical glow, mystical atmosphere, game background, 4K",
        'frame': "Ancient papyrus scroll frame border with expanding hieroglyphic symbols, "
                 "golden Egyptian cartouche edges, mystical energy tendrils, transparent center, 4K",
    },
    'expanding_wild_respin': {
        'bg': "Cosmic starburst explosion with wild energy columns expanding across space, "
              "crystalline pillars of light stretching vertically, supernova background, "
              "prismatic light beams and rainbow energy, sci-fi game background, 4K",
        'frame': "Energy column frame with expanding light beams, crystalline edges glowing with power, "
                 "prismatic rainbow refraction effects, premium sci-fi UI element, transparent center, 4K",
    },
    'zeus_multiplier': {
        'bg': "Mount Olympus throne room with Zeus wielding lightning bolts, dramatic storm clouds, "
              "golden multiplier orbs floating among marble columns, epic Greek temple, "
              "lightning strikes illuminating the scene, divine power effects, game background, 4K",
        'frame': "Greek temple column frame with lightning bolt accents, marble and gold edges, "
                 "laurel wreath ornaments, divine light rays, Olympian game UI border, transparent center, 4K",
    },
    'money_collect': {
        'bg': "Treasure-filled chamber with golden coin piles and money bags, central magnetic collector device, "
              "coins flying toward collection point with trail effects, vault of riches, "
              "dramatic golden lighting, money rain particles, premium game background, 4K",
        'frame': "Golden coin-studded frame border with money bag accents, treasure chest corner pieces, "
                 "magnetic energy effects pulling coins inward, premium gold finish, transparent center, 4K",
    },
    'stacked_wilds': {
        'bg': "Towering crystal pillar chamber with stacked wild card totems, vertical light columns, "
              "mystical cave with glowing reel columns reaching to ceiling, magical atmosphere, "
              "aurora light effects, crystal formations, fantasy game background, 4K",
        'frame': "Stacked card pillar frame with wild symbols embedded in edges, vertical energy beams, "
                 "crystal column border elements, golden wild emblem accents, transparent center, 4K",
    },
    'sticky_wilds': {
        'bg': "Enchanted spider web chamber with glowing sticky positions, magical crystallized web strands, "
              "dark mystical cave with amber-trapped wild symbols, bioluminescent effects, "
              "sticky golden web pattern overlay, fantasy game background, 4K",
        'frame': "Crystallized web frame border with sticky amber gem nodes at intersections, "
                 "golden web strand edges, trapped wild symbol accents, transparent center, 4K",
    },
    'walking_wilds': {
        'bg': "Mystical pathway through enchanted forest with walking spirit figures, moonlit trail, "
              "glowing footstep markers leading through magical landscape, ethereal walking characters, "
              "fairy dust trail effects, mystical fog, fantasy game background, 4K",
        'frame': "Enchanted path frame border with walking spirit silhouettes, moonlit edges, "
                 "glowing footstep trail accents, mystical vine and fairy light decorations, transparent center, 4K",
    },
    'mystery_stacks': {
        'bg': "Mysterious treasure room with glowing question mark boxes stacked on pedestals, "
              "magical reveal light beams, ancient mystery vault with unopened chest grid, "
              "suspenseful atmospheric lighting, fog and sparkle effects, game background, 4K",
        'frame': "Mystery box frame border with question mark emblems and locked chest accents, "
                 "glowing reveal energy edges, magical keyhole decorations, transparent center, 4K",
    },
    'multiplier_wilds': {
        'bg': "Floating card table in cosmic void with multiplier-stamped wild cards fanning out, "
              "glowing number values on each card face, magical poker table atmosphere, "
              "dramatic spotlight on card spread, premium casino fantasy background, 4K",
        'frame': "Playing card frame border with wild card fan accents, multiplier number gems embedded, "
                 "golden card suit decorations, casino premium finish, transparent center, 4K",
    },
    'coin_respin': {
        'bg': "Royal mint chamber with golden coins cascading through mechanical gears, coin press machinery, "
              "golden coin grid landing positions with magical lock effects, steampunk treasury, "
              "dramatic industrial lighting with gold glow, game background, 4K",
        'frame': "Steampunk gear frame border with cascading coin accents, mechanical lock mechanisms, "
                 "golden gear tooth edges, coin slot decorations, transparent center, 4K",
    },
    'chamber_spins': {
        'bg': "Ancient vault door opening to reveal treasure chamber beyond, massive circular vault door, "
              "combination lock mechanisms, dramatic light streaming through opening door, "
              "gold and jewels visible inside, atmospheric fog effects, game background, 4K",
        'frame': "Vault door frame border with combination dial accents, heavy bolt and hinge details, "
                 "chrome and gold metalwork, security mechanism decorations, transparent center, 4K",
    },
    'fisherman_collect': {
        'bg': "Magical underwater treasure pond with golden fish swimming among treasure chests, "
              "fishing rod with glowing line dipping into crystal clear water, coral reef scenery, "
              "bioluminescent sea creatures, sunbeams through water surface, game background, 4K",
        'frame': "Fishing net and rope frame border with golden fish and seashell accents, "
                 "coral reef corner pieces, water ripple effects on edges, transparent center, 4K",
    },
    'wild_collect': {
        'bg': "Magnetic collector machine chamber with wild symbol energy being drawn to central meter, "
              "glowing collection meter filling with golden wild energy, sci-fi collection device, "
              "energy beam effects converging to center, premium game background, 4K",
        'frame': "Energy meter frame border with wild symbol accents, collection progress bar edges, "
                 "magnetic field effect lines, golden energy conduit decorations, transparent center, 4K",
    },
    'respin': {
        'bg': "Classic luxury casino with spotlight on three golden slot reels mid-spin, "
              "locked reel positions glowing with confirmation, red velvet and chrome decor, "
              "dramatic stage lighting, vintage premium casino atmosphere, game background, 4K",
        'frame': "Classic slot reel frame border with chrome edges and locked position indicators, "
                 "vintage casino decorations, golden reel mechanism accents, transparent center, 4K",
    },
}


def generate_bonus_assets(args):
    """Generate SDXL assets specifically for bonus game GUIs."""
    from tqdm import tqdm

    output_dir = Path(args.output or 'assets/bonus')
    output_dir.mkdir(parents=True, exist_ok=True)

    quality_steps = {'draft': 20, 'standard': 35, 'ultra': 50}
    num_steps = quality_steps.get(args.quality, 35)

    # Load pipeline
    print("Loading SDXL pipeline...")
    pipe = StableDiffusionXLPipeline.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0",
        torch_dtype=torch.float16,
        variant="fp16",
        use_safetensors=True,
    )
    pipe = pipe.to("cuda")
    pipe.enable_attention_slicing()

    negative_prompt = (
        "blurry, low quality, distorted, watermark, text, logo, signature, "
        "deformed, ugly, bad anatomy, poorly drawn, amateur, low resolution, "
        "jpeg artifacts, noisy, overexposed, underexposed"
    )

    bonus_types = list(BONUS_TYPE_PROMPTS.keys())
    if args.games:
        bonus_types = [t for t in args.games.split(',') if t in BONUS_TYPE_PROMPTS]

    for bt in tqdm(bonus_types, desc="Generating bonus assets"):
        prompts = BONUS_TYPE_PROMPTS[bt]

        # Background (1920x1080)
        bg_path = output_dir / f"{bt}_bg.png"
        if not bg_path.exists() or args.force:
            print(f"\n  Generating {bt} background...")
            image = pipe(
                prompt=prompts['bg'],
                negative_prompt=negative_prompt,
                width=1024, height=576,  # SDXL native, will upscale
                num_inference_steps=num_steps,
                guidance_scale=7.5,
            ).images[0]
            image = image.resize((1920, 1080), Image.LANCZOS)
            image.save(bg_path, 'PNG', optimize=True)
            # WebP version
            webp_path = output_dir / f"{bt}_bg.webp"
            small = image.resize((960, 540), Image.LANCZOS)
            small.save(webp_path, 'WEBP', quality=85)
            print(f"    Saved: {bg_path}")

        # Frame overlay (1024x768, transparent bg if possible)
        frame_path = output_dir / f"{bt}_frame.png"
        if not frame_path.exists() or args.force:
            print(f"  Generating {bt} frame...")
            image = pipe(
                prompt=prompts['frame'],
                negative_prompt=negative_prompt,
                width=1024, height=768,
                num_inference_steps=num_steps,
                guidance_scale=7.5,
            ).images[0]
            image.save(frame_path, 'PNG', optimize=True)
            print(f"    Saved: {frame_path}")

    print(f"\nBonus assets generated in: {output_dir.absolute()}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='SDXL Asset Generator for Royal Slots Casino')
    parser.add_argument('--bonus-assets', action='store_true', help='Generate bonus game GUI assets')
    parser.add_argument('--all', action='store_true', help='Generate for all games/bonus types')
    parser.add_argument('--games', type=str, help='Comma-separated game IDs or bonus types')
    parser.add_argument('--type', choices=['thumb', 'bg', 'both'], default='both')
    parser.add_argument('--quality', choices=['draft', 'standard', 'ultra'], default='standard')
    parser.add_argument('--output', type=str, help='Output directory')
    parser.add_argument('--force', action='store_true', help='Overwrite existing files')
    parser.add_argument('--use-refiner', action='store_true', help='Use SDXL refiner')
    args = parser.parse_args()

    if args.bonus_assets:
        generate_bonus_assets(args)
    else:
        main()
