"""Generate placeholder symbol images for 20 new games"""
from PIL import Image, ImageDraw, ImageFont
import os

GAMES = {
    'coin_strike': [('s1_cherry','Cherry','#ff3333'), ('s2_lemon','Lemon','#ffcc00'), ('s3_bar','BAR','#cc9900'), ('s4_bell','Bell','#ffd700'), ('s5_seven','7','#ff0000'), ('wild_coin','COIN','#ffd700')],
    'gold_rush_frog': [('s1_pickaxe','Pick','#8d6e63'), ('s2_lantern','Lamp','#ffb74d'), ('s3_dynamite','TNT','#f44336'), ('s4_nugget','Gold','#ffc107'), ('s5_frog_gold','Frog','#4caf50'), ('wild_frog','WILD','#00e676')],
    'snoop_dollars': [('s1_mic','Mic','#9c27b0'), ('s2_chain','Chain','#ffd700'), ('s3_sneaker','Shoe','#e91e63'), ('s4_boombox','Boom','#ff5722'), ('s5_crown_gold','Crown','#ffc107'), ('wild_dollar','WILD','#7b1fa2')],
    'gemhalla': [('s1_axe','Axe','#78909c'), ('s2_horn','Horn','#8d6e63'), ('s3_beer','Beer','#ffb300'), ('s4_helmet','Helm','#607d8b'), ('s5_shield_gem','Shield','#ffd54f'), ('wild_rune','WILD','#ffd54f')],
    'loki_loot': [('s1_hammer','Hammer','#616161'), ('s2_mask','Mask','#4caf50'), ('s3_staff','Staff','#8bc34a'), ('s4_potion','Potion','#76ff03'), ('s5_loki_gold','Loki','#c6ff00'), ('wild_loki','WILD','#c6ff00')],
    'buffalo_extreme': [('s1_eagle','Eagle','#795548'), ('s2_cougar','Cougar','#8d6e63'), ('s3_wolf_hw','Wolf','#9e9e9e'), ('s4_buffalo','Bison','#5d4037'), ('s5_coin_gold','Coin','#ff9800'), ('wild_bison','WILD','#ff9800')],
    'pots_olympus': [('s1_trophy','Cup','#ffc107'), ('s2_apollo','Apollo','#ff9800'), ('s3_poseidon','Posei','#1565c0'), ('s4_zeus','Zeus','#ffd54f'), ('s5_parthenon','Temple','#90a4ae'), ('wild_bolt','WILD','#ffd54f')],
    'sweet_bonanza': [('s1_candy_heart','Heart','#e91e63'), ('s2_star_candy','Star','#ffeb3b'), ('s3_lollipop_swirl','Lolli','#f06292'), ('s4_cotton_candy','Cotton','#ce93d8'), ('s5_bomb_candy','Bomb','#9c27b0'), ('wild_rainbow','WILD','#e040fb')],
    'dog_house_mega': [('s1_bone','Bone','#efebe9'), ('s2_collar','Collar','#f44336'), ('s3_paw','Paw','#8d6e63'), ('s4_doberman','Dober','#424242'), ('s5_bulldog','Bull','#ff5722'), ('wild_doghouse','WILD','#4caf50')],
    'fruit_party': [('s1_strawberry','Straw','#f44336'), ('s2_orange','Orange','#ff9800'), ('s3_plum_p','Plum','#9c27b0'), ('s4_peach','Peach','#ffab91'), ('s5_starfruit','Star','#ffeb3b'), ('wild_fruit','WILD','#ff6f00')],
    'reactoonz': [('s1_blob_green','Blob','#4caf50'), ('s2_blob_blue','Blob','#2196f3'), ('s3_blob_pink','Blob','#e91e63'), ('s4_blob_yellow','Blob','#ffeb3b'), ('s5_blob_red','Blob','#f44336'), ('wild_gargantoon','WILD','#00e5ff')],
    'money_train': [('s1_dynamite_mt','TNT','#f44336'), ('s2_pistol','Gun','#616161'), ('s3_wanted_poster','Want','#8d6e63'), ('s4_sheriff','Sheriff','#ffc107'), ('s5_train','Train','#ff6f00'), ('wild_locomotive','WILD','#ff6f00')],
    'razor_shark': [('s1_anchor','Anchor','#455a64'), ('s2_diver','Diver','#ffb74d'), ('s3_jellyfish','Jelly','#e040fb'), ('s4_shark_tooth','Tooth','#eceff1'), ('s5_shark','Shark','#00bcd4'), ('wild_shark','WILD','#00bcd4')],
    'elvis_frog': [('s1_dice','Dice','#f44336'), ('s2_cocktail','Drink','#e040fb'), ('s3_neon_sign','Neon','#ff1744'), ('s4_showgirl','Show','#ffd600'), ('s5_frog_elvis','Elvis','#d50000'), ('wild_vegas','WILD','#ffd600')],
    'gems_bonanza': [('s1_emerald','Emer','#4caf50'), ('s2_sapphire','Sapph','#1e88e5'), ('s3_ruby','Ruby','#e53935'), ('s4_topaz','Topaz','#ffb300'), ('s5_diamond_gem','Diam','#e0e0e0'), ('wild_prism','WILD','#e040fb')],
    'buffalo_mega': [('s1_prairie_flower','Flwr','#e91e63'), ('s2_coyote','Coyot','#8d6e63'), ('s3_eagle_bk','Eagle','#5d4037'), ('s4_mustang','Horse','#795548'), ('s5_buffalo_king','King','#ff6f00'), ('wild_thunder','WILD','#ff6f00')],
    'tome_madness': [('s1_tentacle','Tent','#4caf50'), ('s2_eye','Eye','#f44336'), ('s3_tome','Tome','#8d6e63'), ('s4_mask_eldritch','Mask','#7c4dff'), ('s5_cthulhu','Cthul','#1b5e20'), ('wild_madness','WILD','#7c4dff')],
    'eternal_romance': [('s1_candle','Candle','#ff6f00'), ('s2_rose','Rose','#e53935'), ('s3_amber','Amber','#ffb300'), ('s4_michael','Mich','#1565c0'), ('s5_sarah','Sarah','#c62828'), ('wild_vampire','WILD','#c62828')],
    'coin_volcano': [('s1_obsidian','Obsid','#424242'), ('s2_lava_gem','Lava','#ff5722'), ('s3_fire_ruby','Ruby','#d50000'), ('s4_magma_coin','Magma','#ff9800'), ('s5_volcano','Volc','#bf360c'), ('wild_eruption','WILD','#ff9800')],
    'power_crown': [('s1_scepter','Scept','#ffc107'), ('s2_orb','Orb','#7c4dff'), ('s3_crown_jewel','Jewel','#e040fb'), ('s4_throne','Throne','#4a148c'), ('s5_royal_crown','Crown','#ffd700'), ('wild_crown','WILD','#ffd700')]
}

def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def create_symbol(name, label, color_hex, size=200):
    r, g, b = hex_to_rgb(color_hex)
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background gradient
    for y in range(size):
        t = y / size
        cr = int(r * (0.3 + 0.7 * (1 - t)))
        cg = int(g * (0.3 + 0.7 * (1 - t)))
        cb = int(b * (0.3 + 0.7 * (1 - t)))
        draw.line([(0, y), (size-1, y)], fill=(cr, cg, cb, 230))

    # Border
    is_wild = 'wild' in name.lower() or 'WILD' in label
    bw = 4 if is_wild else 2
    bc = (255, 215, 0, 255) if is_wild else (r, g, b, 180)
    draw.rounded_rectangle([(bw//2, bw//2), (size-bw//2-1, size-bw//2-1)], radius=16, outline=bc, width=bw)

    # Inner glow for wilds
    if is_wild:
        for i in range(8, 0, -1):
            alpha = int(30 * (i / 8))
            draw.rounded_rectangle([(bw+i, bw+i), (size-bw-i-1, size-bw-i-1)], radius=14, outline=(255, 215, 0, alpha), width=1)

    # Text
    try:
        font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 28 if len(label) <= 4 else 22)
    except:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) // 2
    y = (size - th) // 2 - 5

    draw.text((x+2, y+2), label, fill=(0, 0, 0, 180), font=font)
    draw.text((x, y), label, fill=(255, 255, 255, 255), font=font)
    return img

def create_thumbnail(game_id, color1, color2, label, size=(300, 200)):
    r1, g1, b1 = hex_to_rgb(color1)
    r2, g2, b2 = hex_to_rgb(color2)
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Gradient background
    for y in range(size[1]):
        t = y / size[1]
        cr = int(r1 * (1-t) + r2 * t)
        cg = int(g1 * (1-t) + g2 * t)
        cb = int(b1 * (1-t) + b2 * t)
        draw.line([(0, y), (size[0]-1, y)], fill=(cr, cg, cb, 255))

    # Border
    draw.rounded_rectangle([(2, 2), (size[0]-3, size[1]-3)], radius=12, outline=(255, 255, 255, 80), width=2)

    # Title
    try:
        font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 20)
    except:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), label, font=font)
    tw = bbox[2] - bbox[0]
    x = (size[0] - tw) // 2
    y = size[1] // 2 - 12
    draw.text((x+1, y+1), label, fill=(0, 0, 0, 180), font=font)
    draw.text((x, y), label, fill=(255, 255, 255, 255), font=font)
    return img

THUMB_DATA = {
    'coin_strike': ('#ffd700', '#b8860b', 'Coin Strike'),
    'gold_rush_frog': ('#4caf50', '#ffc107', 'Fortune Frog'),
    'snoop_dollars': ('#7b1fa2', '#ffd600', 'Hip Hop Millions'),
    'gemhalla': ('#455a64', '#ffd54f', 'Valhalla Gems'),
    'loki_loot': ('#1b5e20', '#c6ff00', "Loki's Loot"),
    'buffalo_extreme': ('#795548', '#ff9800', 'Buffalo Blitz'),
    'pots_olympus': ('#1565c0', '#ffd54f', 'Pots of Zeus'),
    'sweet_bonanza': ('#e91e63', '#7c4dff', 'Sweet Bonanza'),
    'dog_house_mega': ('#4caf50', '#ff5722', 'Dog House'),
    'fruit_party': ('#ff6f00', '#e040fb', 'Fruit Party'),
    'reactoonz': ('#6a1b9a', '#00e5ff', 'Alientonz'),
    'money_train': ('#4e342e', '#ff6f00', 'Money Express'),
    'razor_shark': ('#006064', '#00bcd4', 'Depth Charge'),
    'elvis_frog': ('#d50000', '#ffd600', 'Vegas Frog'),
    'gems_bonanza': ('#283593', '#e040fb', 'Gem Vault'),
    'buffalo_mega': ('#5d4037', '#ff6f00', 'Buffalo King'),
    'tome_madness': ('#1b5e20', '#7c4dff', 'Tome Insanity'),
    'eternal_romance': ('#311b92', '#c62828', 'Eternal Romance'),
    'coin_volcano': ('#bf360c', '#ff9800', 'Volcano Coins'),
    'power_crown': ('#4a148c', '#ffd700', 'Crown Power'),
}

count = 0
for game_id, symbols in GAMES.items():
    out_dir = f'assets/game_symbols/{game_id}'
    os.makedirs(out_dir, exist_ok=True)
    for sym_name, label, color in symbols:
        img = create_symbol(sym_name, label, color)
        img.save(f'{out_dir}/{sym_name}.png')
        count += 1

# Thumbnails
thumb_count = 0
for game_id, (c1, c2, label) in THUMB_DATA.items():
    thumb = create_thumbnail(game_id, c1, c2, label)
    thumb.save(f'assets/thumbnails/{game_id}.png')
    thumb_count += 1

print(f'Generated {count} symbol images + {thumb_count} thumbnails for {len(GAMES)} games')
