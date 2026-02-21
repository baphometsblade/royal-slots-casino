        // Game Data — 30 slot games with unique themes, grid configs, and mechanics
        // Each game is inspired by a popular real slot with original naming and assets
        const games = [
            // ═══ 1. Candy Cascade 1000 (based on Sugar Rush) — 7x7 Cluster Pays, Tumble ═══
            { id: 'sugar_rush', name: 'Candy Cascade 1000', provider: 'Royal Games', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/sugar_rush.png', bgGradient: 'linear-gradient(135deg, #ff6fd8 0%, #f7a531 100%)',
              symbols: ['s1_lollipop','s2_gummy_bear','s3_candy_cane','s4_cupcake','s5_diamond_candy','wild_sugar'],
              reelBg: 'linear-gradient(180deg, #3d1232 0%, #1a0a14 100%)', accentColor: '#ff6fd8',
              gridCols: 7, gridRows: 7, winType: 'cluster', clusterMin: 5,
              wildSymbol: 'wild_sugar', scatterSymbol: 's5_diamond_candy',
              bonusType: 'tumble', freeSpinsCount: 8, freeSpinsRetrigger: true,
              tumbleMultipliers: [1, 2, 3, 5, 8, 12, 15, 20],
              bonusDesc: 'Tumble Feature: 7×7 grid — cluster 5+ matching symbols! Multipliers up to 20x!',
              payouts: { triple: 150, double: 15, wildTriple: 200, scatterPay: 5, cluster5: 5, cluster8: 15, cluster12: 50, cluster15: 150 }, minBet: 10, maxBet: 5000, hot: true, jackpot: 0 },

            // ═══ 2. Fruit Fiesta Deluxe (based on Sweet Bonanza) — 6x5 Scatter Pays ═══
            { id: 'lucky_777', name: 'Fruit Fiesta Deluxe', provider: 'Royal Games', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/lucky_777.png', bgGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              symbols: ['s1_banana','s2_grape','s3_apple','s4_watermelon','s5_heart_gem','wild_bonanza'],
              reelBg: 'linear-gradient(180deg, #2e1435 0%, #160a18 100%)', accentColor: '#f093fb',
              gridCols: 6, gridRows: 5, winType: 'cluster', clusterMin: 8,
              wildSymbol: 'wild_bonanza', scatterSymbol: 's5_heart_gem',
              bonusType: 'random_multiplier', freeSpinsCount: 10, freeSpinsRetrigger: true,
              randomMultiplierRange: [2, 3, 5, 10, 25, 50, 100],
              bonusDesc: 'Fruit Fiesta: 6×5 grid — land 8+ matching anywhere! Multiplier bombs up to 100x!',
              payouts: { triple: 100, double: 10, wildTriple: 150, scatterPay: 3, cluster5: 3, cluster8: 10, cluster12: 30, cluster15: 100 }, minBet: 10, maxBet: 500, hot: true, jackpot: 0 },

            // ═══ 3. Halls of Thunder (based on Gates of Olympus) — 6x5 Scatter Pays ═══
            { id: 'gates_olympus', name: 'Halls of Thunder', provider: 'Royal Games', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/gates_olympus.png', bgGradient: 'linear-gradient(135deg, #667eea 0%, #f5c842 100%)',
              symbols: ['s1_chalice','s2_ring','s3_hourglass','s4_crown','s5_lightning','wild_zeus'],
              reelBg: 'linear-gradient(180deg, #0f1a3d 0%, #060b1a 100%)', accentColor: '#667eea',
              gridCols: 6, gridRows: 5, winType: 'cluster', clusterMin: 8,
              wildSymbol: 'wild_zeus', scatterSymbol: 's5_lightning',
              bonusType: 'zeus_multiplier', freeSpinsCount: 15, freeSpinsRetrigger: true,
              zeusMultipliers: [2, 3, 5, 10, 25, 500],
              bonusDesc: 'Halls of Thunder: 6×5 grid — 8+ matching symbols win! God multipliers up to 500x!',
              payouts: { triple: 120, double: 12, wildTriple: 180, scatterPay: 4, cluster5: 4, cluster8: 12, cluster12: 40, cluster15: 120 }, minBet: 20, maxBet: 2000, hot: true, jackpot: 0 },

            // ═══ 4. Raging Bull (based on Black Bull) — 5x4, 40 Paylines ═══
            { id: 'black_bull', name: 'Raging Bull', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/black_bull.png', bgGradient: 'linear-gradient(135deg, #1a1a2e 0%, #e94560 100%)',
              symbols: ['s1_horseshoe','s2_coins','s3_money_bag','s4_gold_bar','s5_diamond','wild_bull'],
              reelBg: 'linear-gradient(180deg, #2a0a0a 0%, #120505 100%)', accentColor: '#e94560',
              gridCols: 5, gridRows: 4, winType: 'payline',
              wildSymbol: 'wild_bull', scatterSymbol: 's5_diamond',
              bonusType: 'money_collect', freeSpinsCount: 6, freeSpinsRetrigger: false,
              moneySymbols: ['s2_coins', 's3_money_bag', 's4_gold_bar'],
              bonusDesc: 'Raging Bull: 5×4 grid — Money Collect feature! Wild collects all coin values!',
              payouts: { triple: 80, double: 9, wildTriple: 120, scatterPay: 3, payline3: 9, payline4: 40, payline5: 80 }, minBet: 10, maxBet: 750, hot: false, jackpot: 0 },

            // ═══ 5. Salsa Spins (based on 3 Hot Chillies) — Classic 3x3, Respin ═══
            { id: 'hot_chillies', name: 'Salsa Spins', provider: 'Royal Games', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/hot_chillies.png', bgGradient: 'linear-gradient(135deg, #d62828 0%, #f77f00 100%)',
              symbols: ['s1_taco','s2_maracas','s3_sombrero','s4_chilli','s5_hot_7','wild_chilli'],
              reelBg: 'linear-gradient(180deg, #3a1008 0%, #1a0804 100%)', accentColor: '#f77f00',
              gridCols: 3, gridRows: 3, winType: 'classic',
              wildSymbol: 'wild_chilli', scatterSymbol: 's5_hot_7',
              bonusType: 'respin', freeSpinsCount: 5, freeSpinsRetrigger: false,
              maxRespins: 3,
              bonusDesc: 'Salsa Spins: Classic 3×3 — pairs lock and remaining reels respin up to 3x!',
              payouts: { triple: 60, double: 7, wildTriple: 100, scatterPay: 2 }, minBet: 5, maxBet: 300, hot: false, jackpot: 0 },

            // ═══ 6. Blazing Fruits (based on 100 Super Hot) — 5x3 Paylines ═══
            { id: 'super_hot', name: 'Blazing Fruits', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/super_hot.png', bgGradient: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
              symbols: ['s1_cherry','s2_lemon','s3_plum','s4_bell','s5_star','wild_hot'],
              reelBg: 'linear-gradient(180deg, #2a1a05 0%, #140d02 100%)', accentColor: '#ffd200',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_hot', scatterSymbol: 's5_star',
              bonusType: 'stacked_wilds', freeSpinsCount: 10, freeSpinsRetrigger: true,
              stackedWildChance: 0.15,
              bonusDesc: 'Blazing Fruits: 5×3 grid — Stacked Wilds fill entire reels during free spins!',
              payouts: { triple: 75, double: 8, wildTriple: 110, scatterPay: 3, payline3: 8, payline4: 35, payline5: 75 }, minBet: 10, maxBet: 500, hot: true, jackpot: 0 },

            // ═══ 7. Alpha Pack (based on Wolf Gold) — 5x3, Hold & Win ═══
            { id: 'wolf_gold', name: 'Alpha Pack', provider: 'Royal Games', tag: 'JACKPOT', tagClass: 'tag-jackpot', thumbnail: 'assets/thumbnails/wolf_gold.png', bgGradient: 'linear-gradient(135deg, #8b6914 0%, #d4a836 100%)',
              symbols: ['s1_feather','s2_paw','s3_eagle','s4_totem','s5_moon','wild_wolf'],
              reelBg: 'linear-gradient(180deg, #261a08 0%, #110c04 100%)', accentColor: '#d4a836',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_wolf', scatterSymbol: 's5_moon',
              bonusType: 'hold_and_win', freeSpinsCount: 3, freeSpinsRetrigger: false,
              holdAndWinRespins: 3,
              bonusDesc: 'Alpha Pack: 5×3 grid — Hold & Win bonus with Moon coin jackpots!',
              payouts: { triple: 200, double: 20, wildTriple: 300, scatterPay: 5, payline3: 20, payline4: 80, payline5: 200 }, minBet: 25, maxBet: 5000, hot: true, jackpot: 125840 },

            // ═══ 8. Reel Catch (based on Big Bass Bonanza) — 5x3, Fisherman Collect ═══
            { id: 'big_bass', name: 'Reel Catch', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/big_bass.png', bgGradient: 'linear-gradient(135deg, #0077b6 0%, #48cae4 100%)',
              symbols: ['s1_hook','s2_float','s3_tackle','s4_fish','s5_treasure','wild_bass'],
              reelBg: 'linear-gradient(180deg, #061a2a 0%, #030d15 100%)', accentColor: '#48cae4',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_bass', scatterSymbol: 's5_treasure',
              bonusType: 'fisherman_collect', freeSpinsCount: 10, freeSpinsRetrigger: true,
              fishSymbols: ['s1_hook', 's4_fish'],
              bonusDesc: 'Reel Catch: 5×3 grid — Wild fisherman collects all cash fish values!',
              payouts: { triple: 65, double: 7, wildTriple: 100, scatterPay: 3, payline3: 7, payline4: 30, payline5: 65 }, minBet: 10, maxBet: 400, hot: false, jackpot: 0 },

            // ═══ 9. Inferno Jester (based on Fire Joker) — Classic 3x3, Wheel ═══
            { id: 'fire_joker', name: 'Inferno Jester', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/fire_joker.png', bgGradient: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
              symbols: ['s1_cherry','s2_lemon','s3_plum','s4_star','s5_seven','wild_joker'],
              reelBg: 'linear-gradient(180deg, #2a0812 0%, #140408 100%)', accentColor: '#ff0844',
              gridCols: 3, gridRows: 3, winType: 'classic',
              wildSymbol: 'wild_joker', scatterSymbol: 's5_seven',
              bonusType: 'wheel_multiplier', freeSpinsCount: 5, freeSpinsRetrigger: false,
              wheelMultipliers: [2, 2, 3, 3, 5, 5, 7, 10],
              bonusDesc: 'Inferno Jester: Classic 3×3 — Triple match triggers the Wheel of Fire for up to 10x!',
              payouts: { triple: 55, double: 6, wildTriple: 80, scatterPay: 2 }, minBet: 5, maxBet: 200, hot: false, jackpot: 0 },

            // ═══ 10. Tome of Ra (based on Book of Dead) — 5x3, Expanding Symbol ═══
            { id: 'book_dead', name: 'Tome of Ra', provider: 'Royal Games', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/book_dead.png', bgGradient: 'linear-gradient(135deg, #6b3a0a 0%, #c7a94e 100%)',
              symbols: ['s1_ankh','s2_scarab','s3_eye','s4_pharaoh','s5_anubis','wild_book'],
              reelBg: 'linear-gradient(180deg, #2a1a08 0%, #140d04 100%)', accentColor: '#c7a94e',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_book', scatterSymbol: 'wild_book',
              bonusType: 'expanding_symbol', freeSpinsCount: 10, freeSpinsRetrigger: true,
              bonusDesc: 'Tome of Ra: 5×3 grid — Expanding symbol fills entire reels during free spins!',
              payouts: { triple: 90, double: 10, wildTriple: 140, scatterPay: 4, payline3: 10, payline4: 45, payline5: 90 }, minBet: 10, maxBet: 1000, hot: true, jackpot: 0 },

            // ═══ 11. Cosmic Gems (based on Starburst) — 5x3, Expanding Wilds ═══
            { id: 'starburst_xxl', name: 'Cosmic Gems', provider: 'Royal Games', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/starburst_xxl.png', bgGradient: 'linear-gradient(135deg, #a855f7 0%, #06b6d4 100%)',
              symbols: ['s1_gem_red','s2_gem_blue','s3_gem_green','s4_gem_yellow','s5_gem_purple','wild_star'],
              reelBg: 'linear-gradient(180deg, #1a0a2e 0%, #0a0514 100%)', accentColor: '#a855f7',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_star', scatterSymbol: 's5_gem_purple',
              bonusType: 'expanding_wild_respin', freeSpinsCount: 0, freeSpinsRetrigger: false,
              expandingWildMaxRespins: 3,
              bonusDesc: 'Cosmic Gems: 5×3 grid — Expanding Wilds fill entire reels and trigger free respins!',
              payouts: { triple: 110, double: 11, wildTriple: 170, scatterPay: 0, payline3: 11, payline4: 55, payline5: 110 }, minBet: 10, maxBet: 500, hot: false, jackpot: 0 },

            // ═══ 12. Temple Quest (based on Gonzo's Quest) — 5x3, Avalanche ═══
            { id: 'gonzos_quest', name: 'Temple Quest', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/gonzos_quest.png', bgGradient: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
              symbols: ['s1_stone_face_green','s2_stone_face_blue','s3_stone_face_red','s4_emerald','s5_gold_mask','wild_gonzo'],
              reelBg: 'linear-gradient(180deg, #0a2a15 0%, #05140a 100%)', accentColor: '#3cba92',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_gonzo', scatterSymbol: 's5_gold_mask',
              bonusType: 'avalanche', freeSpinsCount: 10, freeSpinsRetrigger: true,
              avalancheMultipliers: [1, 2, 3, 5, 10, 15],
              bonusDesc: 'Temple Quest: 5×3 grid — Avalanche cascades with multipliers up to 15x!',
              payouts: { triple: 70, double: 8, wildTriple: 110, scatterPay: 3, payline3: 8, payline4: 35, payline5: 70 }, minBet: 10, maxBet: 400, hot: false, jackpot: 0 },

            // ═══ 13. Starlight Empress (based on Starlight Princess) — 6x5, Scatter Pays ═══
            { id: 'starlight_princess', name: 'Starlight Empress', provider: 'Royal Games', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/starlight_princess.png', bgGradient: 'linear-gradient(135deg, #e040fb 0%, #4dd0e1 100%)',
              symbols: ['s1_crystal_heart','s2_magic_wand','s3_tiara','s4_moon_orb','s5_star_crystal','wild_empress'],
              reelBg: 'linear-gradient(180deg, #2a0a3d 0%, #0d041a 100%)', accentColor: '#e040fb',
              gridCols: 6, gridRows: 5, winType: 'cluster', clusterMin: 8,
              wildSymbol: 'wild_empress', scatterSymbol: 's5_star_crystal',
              bonusType: 'random_multiplier', freeSpinsCount: 15, freeSpinsRetrigger: true,
              randomMultiplierRange: [2, 3, 5, 10, 25, 50, 100],
              bonusDesc: 'Starlight Empress: 6×5 grid — Land 8+ anywhere! Random multipliers up to 100x!',
              payouts: { triple: 130, double: 13, wildTriple: 195, scatterPay: 4, cluster5: 4, cluster8: 13, cluster12: 45, cluster15: 130 }, minBet: 20, maxBet: 2000, hot: true, jackpot: 0 },

            // ═══ 14. Olympus Rising (based on Gates of Olympus 2) — 6x5, Scatter Pays ═══
            { id: 'olympus_rising', name: 'Olympus Rising', provider: 'Royal Games', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/olympus_rising.png', bgGradient: 'linear-gradient(135deg, #5c6bc0 0%, #ff8a65 100%)',
              symbols: ['s1_trident','s2_shield','s3_laurel','s4_thunderbolt','s5_olympus_gem','wild_poseidon'],
              reelBg: 'linear-gradient(180deg, #0d1a40 0%, #060a1f 100%)', accentColor: '#5c6bc0',
              gridCols: 6, gridRows: 5, winType: 'cluster', clusterMin: 8,
              wildSymbol: 'wild_poseidon', scatterSymbol: 's5_olympus_gem',
              bonusType: 'zeus_multiplier', freeSpinsCount: 15, freeSpinsRetrigger: true,
              zeusMultipliers: [2, 3, 5, 10, 25, 500],
              bonusDesc: 'Olympus Rising: 6×5 grid — 8+ matching win! Divine multipliers up to 500x!',
              payouts: { triple: 125, double: 12, wildTriple: 185, scatterPay: 4, cluster5: 4, cluster8: 12, cluster12: 42, cluster15: 125 }, minBet: 20, maxBet: 2000, hot: false, jackpot: 0 },

            // ═══ 15. Buffalo Stampede (based on Buffalo King Megaways) — 6x5, Cluster ═══
            { id: 'buffalo_stampede', name: 'Buffalo Stampede', provider: 'Royal Games', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/buffalo_stampede.png', bgGradient: 'linear-gradient(135deg, #795548 0%, #ff6f00 100%)',
              symbols: ['s1_cactus','s2_horseshoe_gold','s3_cowboy_hat','s4_buffalo','s5_sunset_diamond','wild_stampede'],
              reelBg: 'linear-gradient(180deg, #2a1a08 0%, #140d04 100%)', accentColor: '#ff6f00',
              gridCols: 6, gridRows: 5, winType: 'cluster', clusterMin: 8,
              wildSymbol: 'wild_stampede', scatterSymbol: 's5_sunset_diamond',
              bonusType: 'random_multiplier', freeSpinsCount: 12, freeSpinsRetrigger: true,
              randomMultiplierRange: [2, 3, 5, 10, 15, 25],
              bonusDesc: 'Buffalo Stampede: 6×5 grid — 8+ matching triggers cascading wins! Up to 25x multiplier!',
              payouts: { triple: 115, double: 11, wildTriple: 175, scatterPay: 4, cluster5: 4, cluster8: 11, cluster12: 38, cluster15: 115 }, minBet: 15, maxBet: 1500, hot: true, jackpot: 0 },

            // ═══ 16. Puppy Palace (based on The Dog House) — 5x3, Sticky Wilds ═══
            { id: 'puppy_palace', name: 'Puppy Palace', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/puppy_palace.png', bgGradient: 'linear-gradient(135deg, #4caf50 0%, #81c784 100%)',
              symbols: ['s1_bone','s2_collar','s3_paw_print','s4_puppy_face','s5_golden_bowl','wild_puppy'],
              reelBg: 'linear-gradient(180deg, #0a2a0f 0%, #051408 100%)', accentColor: '#4caf50',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_puppy', scatterSymbol: 's5_golden_bowl',
              bonusType: 'stacked_wilds', freeSpinsCount: 12, freeSpinsRetrigger: true,
              stackedWildChance: 0.2,
              bonusDesc: 'Puppy Palace: 5×3 grid — Raining Sticky Wilds during free spins!',
              payouts: { triple: 85, double: 9, wildTriple: 130, scatterPay: 3, payline3: 9, payline4: 40, payline5: 85 }, minBet: 10, maxBet: 600, hot: false, jackpot: 0 },

            // ═══ 17. Crimson Fang (based on Blood Suckers) — 5x3, High RTP ═══
            { id: 'crimson_fang', name: 'Crimson Fang', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/crimson_fang.png', bgGradient: 'linear-gradient(135deg, #4a0e0e 0%, #b71c1c 100%)',
              symbols: ['s1_garlic','s2_cross','s3_bat','s4_coffin','s5_vampire','wild_fang'],
              reelBg: 'linear-gradient(180deg, #1a0505 0%, #0d0202 100%)', accentColor: '#b71c1c',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_fang', scatterSymbol: 's5_vampire',
              bonusType: 'expanding_symbol', freeSpinsCount: 10, freeSpinsRetrigger: true,
              bonusDesc: 'Crimson Fang: 5×3 grid — Expanding vampire symbols during bonus spins!',
              payouts: { triple: 70, double: 8, wildTriple: 105, scatterPay: 3, payline3: 8, payline4: 32, payline5: 70 }, minBet: 10, maxBet: 400, hot: false, jackpot: 0 },

            // ═══ 18. Pirate's Fortune (based on Treasure Wild) — 5x3, Money Collect ═══
            { id: 'pirate_fortune', name: "Pirate's Fortune", provider: 'Royal Games', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/pirate_fortune.png', bgGradient: 'linear-gradient(135deg, #1a237e 0%, #0097a7 100%)',
              symbols: ['s1_compass','s2_anchor','s3_cannon','s4_treasure_map','s5_skull_key','wild_pirate'],
              reelBg: 'linear-gradient(180deg, #0a1a2e 0%, #050d18 100%)', accentColor: '#0097a7',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_pirate', scatterSymbol: 's5_skull_key',
              bonusType: 'money_collect', freeSpinsCount: 8, freeSpinsRetrigger: false,
              moneySymbols: ['s2_anchor', 's3_cannon', 's4_treasure_map'],
              bonusDesc: "Pirate's Fortune: 5×3 grid — Collect treasure coins for massive loot!",
              payouts: { triple: 80, double: 9, wildTriple: 120, scatterPay: 3, payline3: 9, payline4: 38, payline5: 80 }, minBet: 10, maxBet: 500, hot: false, jackpot: 0 },

            // ═══ 19. Lucky Dragon (based on Fortune Tiger) — 3x3, Classic ═══
            { id: 'lucky_dragon', name: 'Lucky Dragon', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/lucky_dragon.png', bgGradient: 'linear-gradient(135deg, #c62828 0%, #ffd600 100%)',
              symbols: ['s1_lantern','s2_fan','s3_koi','s4_jade','s5_dragon_pearl','wild_dragon'],
              reelBg: 'linear-gradient(180deg, #2a0808 0%, #140404 100%)', accentColor: '#c62828',
              gridCols: 3, gridRows: 3, winType: 'classic',
              wildSymbol: 'wild_dragon', scatterSymbol: 's5_dragon_pearl',
              bonusType: 'respin', freeSpinsCount: 5, freeSpinsRetrigger: false,
              maxRespins: 3,
              bonusDesc: 'Lucky Dragon: Classic 3×3 — Dragon respins with golden multipliers!',
              payouts: { triple: 60, double: 7, wildTriple: 100, scatterPay: 2 }, minBet: 5, maxBet: 300, hot: false, jackpot: 0 },

            // ═══ 20. Pharaoh's Legacy (based on Legacy of Dead) — 5x3, Expanding Symbol ═══
            { id: 'pharaoh_legacy', name: "Pharaoh's Legacy", provider: 'Royal Games', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/pharaoh_legacy.png', bgGradient: 'linear-gradient(135deg, #8d6e63 0%, #d4a636 100%)',
              symbols: ['s1_hieroglyph','s2_sphinx','s3_pyramid','s4_golden_cobra','s5_pharaoh_mask','wild_papyrus'],
              reelBg: 'linear-gradient(180deg, #2a1c08 0%, #141004 100%)', accentColor: '#d4a636',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_papyrus', scatterSymbol: 'wild_papyrus',
              bonusType: 'expanding_symbol', freeSpinsCount: 10, freeSpinsRetrigger: true,
              bonusDesc: "Pharaoh's Legacy: 5×3 grid — Random expanding symbol per free spin retrigger!",
              payouts: { triple: 90, double: 10, wildTriple: 140, scatterPay: 4, payline3: 10, payline4: 45, payline5: 90 }, minBet: 10, maxBet: 800, hot: false, jackpot: 0 },

            // ═══ 21. Quantum Burst (based on Reactoonz) — 7x7, Cluster Pays ═══
            { id: 'quantum_burst', name: 'Quantum Burst', provider: 'Royal Games', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/quantum_burst.png', bgGradient: 'linear-gradient(135deg, #6a1b9a 0%, #00e5ff 100%)',
              symbols: ['s1_atom','s2_electron','s3_proton','s4_neutron','s5_plasma_orb','wild_quantum'],
              reelBg: 'linear-gradient(180deg, #1a0a30 0%, #0d0518 100%)', accentColor: '#6a1b9a',
              gridCols: 7, gridRows: 7, winType: 'cluster', clusterMin: 5,
              wildSymbol: 'wild_quantum', scatterSymbol: 's5_plasma_orb',
              bonusType: 'tumble', freeSpinsCount: 10, freeSpinsRetrigger: true,
              tumbleMultipliers: [1, 2, 3, 5, 8, 12, 20, 30],
              bonusDesc: 'Quantum Burst: 7×7 grid — Cluster 5+ for quantum chain reactions! Up to 30x!',
              payouts: { triple: 160, double: 16, wildTriple: 240, scatterPay: 5, cluster5: 5, cluster8: 16, cluster12: 55, cluster15: 160 }, minBet: 10, maxBet: 3000, hot: true, jackpot: 0 },

            // ═══ 22. Olympian Gods (based on Rise of Olympus) — 5x5, Cluster ═══
            { id: 'olympian_gods', name: 'Olympian Gods', provider: 'Royal Games', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/olympian_gods.png', bgGradient: 'linear-gradient(135deg, #e65100 0%, #ffd54f 100%)',
              symbols: ['s1_harp','s2_helmet','s3_pegasus','s4_olive_branch','s5_golden_apple','wild_olympian'],
              reelBg: 'linear-gradient(180deg, #2a1a05 0%, #140d02 100%)', accentColor: '#e65100',
              gridCols: 5, gridRows: 5, winType: 'cluster', clusterMin: 5,
              wildSymbol: 'wild_olympian', scatterSymbol: 's5_golden_apple',
              bonusType: 'tumble', freeSpinsCount: 10, freeSpinsRetrigger: true,
              tumbleMultipliers: [1, 2, 3, 5, 8, 15],
              bonusDesc: 'Olympian Gods: 5×5 grid — Three gods grant unique powers! Cluster 5+ to win!',
              payouts: { triple: 100, double: 10, wildTriple: 150, scatterPay: 3, cluster5: 3, cluster8: 10, cluster12: 35, cluster15: 100 }, minBet: 10, maxBet: 1000, hot: false, jackpot: 0 },

            // ═══ 23. Twin Helix (based on Twin Spin) — 5x3, Linked Reels ═══
            { id: 'twin_helix', name: 'Twin Helix', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/twin_helix.png', bgGradient: 'linear-gradient(135deg, #212121 0%, #e040fb 100%)',
              symbols: ['s1_cherry_neon','s2_bar_neon','s3_bell_neon','s4_seven_neon','s5_diamond_neon','wild_helix'],
              reelBg: 'linear-gradient(180deg, #1a0a1a 0%, #0d050d 100%)', accentColor: '#e040fb',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_helix', scatterSymbol: 's5_diamond_neon',
              bonusType: 'stacked_wilds', freeSpinsCount: 8, freeSpinsRetrigger: false,
              stackedWildChance: 0.18,
              bonusDesc: 'Twin Helix: 5×3 grid — Twin linked reels sync up for massive combos!',
              payouts: { triple: 85, double: 9, wildTriple: 125, scatterPay: 3, payline3: 9, payline4: 38, payline5: 85 }, minBet: 10, maxBet: 500, hot: false, jackpot: 0 },

            // ═══ 24. Golden Fortune Wheel (based on Mega Fortune) — 5x3, Progressive ═══
            { id: 'golden_fortune', name: 'Golden Fortune Wheel', provider: 'Royal Games', tag: 'JACKPOT', tagClass: 'tag-jackpot', thumbnail: 'assets/thumbnails/golden_fortune.png', bgGradient: 'linear-gradient(135deg, #ffd700 0%, #212121 100%)',
              symbols: ['s1_champagne','s2_yacht','s3_watch','s4_ring_gold','s5_limo','wild_fortune'],
              reelBg: 'linear-gradient(180deg, #2a2000 0%, #141000 100%)', accentColor: '#ffd700',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_fortune', scatterSymbol: 's5_limo',
              bonusType: 'wheel_multiplier', freeSpinsCount: 10, freeSpinsRetrigger: true,
              wheelMultipliers: [2, 3, 5, 5, 10, 10, 25, 50],
              bonusDesc: 'Golden Fortune: 5×3 grid — Spin the Fortune Wheel for progressive jackpots!',
              payouts: { triple: 150, double: 15, wildTriple: 225, scatterPay: 5, payline3: 15, payline4: 65, payline5: 150 }, minBet: 25, maxBet: 5000, hot: true, jackpot: 287650 },

            // ═══ 25. Island Tiki (based on Aloha Cluster Pays) — 6x5, Cluster ═══
            { id: 'island_tiki', name: 'Island Tiki', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/island_tiki.png', bgGradient: 'linear-gradient(135deg, #00897b 0%, #ffcc02 100%)',
              symbols: ['s1_coconut','s2_hibiscus','s3_ukulele','s4_tiki_mask','s5_golden_idol','wild_tiki'],
              reelBg: 'linear-gradient(180deg, #0a2a1a 0%, #05140d 100%)', accentColor: '#00897b',
              gridCols: 6, gridRows: 5, winType: 'cluster', clusterMin: 8,
              wildSymbol: 'wild_tiki', scatterSymbol: 's5_golden_idol',
              bonusType: 'tumble', freeSpinsCount: 10, freeSpinsRetrigger: true,
              tumbleMultipliers: [1, 2, 3, 5, 10],
              bonusDesc: 'Island Tiki: 6×5 grid — Tropical cluster wins with cascading symbols!',
              payouts: { triple: 90, double: 9, wildTriple: 135, scatterPay: 3, cluster5: 3, cluster8: 9, cluster12: 32, cluster15: 90 }, minBet: 10, maxBet: 500, hot: false, jackpot: 0 },

            // ═══ 26. Sakura Princess (based on Moon Princess) — 5x5, Cluster ═══
            { id: 'sakura_princess', name: 'Sakura Princess', provider: 'Royal Games', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/sakura_princess.png', bgGradient: 'linear-gradient(135deg, #f06292 0%, #ce93d8 100%)',
              symbols: ['s1_cherry_blossom','s2_origami','s3_katana','s4_moon_fan','s5_jade_dragon','wild_sakura'],
              reelBg: 'linear-gradient(180deg, #2a0a1a 0%, #14050d 100%)', accentColor: '#f06292',
              gridCols: 5, gridRows: 5, winType: 'cluster', clusterMin: 5,
              wildSymbol: 'wild_sakura', scatterSymbol: 's5_jade_dragon',
              bonusType: 'tumble', freeSpinsCount: 8, freeSpinsRetrigger: true,
              tumbleMultipliers: [1, 2, 3, 5, 10, 20],
              bonusDesc: 'Sakura Princess: 5×5 grid — Three princesses grant Love, Star & Storm powers!',
              payouts: { triple: 95, double: 10, wildTriple: 145, scatterPay: 3, cluster5: 3, cluster8: 10, cluster12: 33, cluster15: 95 }, minBet: 10, maxBet: 800, hot: false, jackpot: 0 },

            // ═══ 27. Ares Blade (based on Sword of Ares) — 5x4, Payline ═══
            { id: 'ares_blade', name: 'Ares Blade', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/ares_blade.png', bgGradient: 'linear-gradient(135deg, #b71c1c 0%, #ff6f00 100%)',
              symbols: ['s1_dagger','s2_shield_war','s3_spear','s4_war_helm','s5_blood_gem','wild_ares'],
              reelBg: 'linear-gradient(180deg, #2a0a05 0%, #140502 100%)', accentColor: '#b71c1c',
              gridCols: 5, gridRows: 4, winType: 'payline',
              wildSymbol: 'wild_ares', scatterSymbol: 's5_blood_gem',
              bonusType: 'expanding_wild_respin', freeSpinsCount: 0, freeSpinsRetrigger: false,
              expandingWildMaxRespins: 5,
              bonusDesc: 'Ares Blade: 5×4 grid — War God expanding wilds with battle respins!',
              payouts: { triple: 100, double: 10, wildTriple: 150, scatterPay: 0, payline3: 10, payline4: 45, payline5: 100 }, minBet: 10, maxBet: 800, hot: false, jackpot: 0 },

            // ═══ 28. Neon Nights (based on Hotline) — 5x3, Hotline Feature ═══
            { id: 'neon_nights', name: 'Neon Nights', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/neon_nights.png', bgGradient: 'linear-gradient(135deg, #e91e63 0%, #00bcd4 100%)',
              symbols: ['s1_dice','s2_cocktail','s3_sports_car','s4_cash_stack','s5_vip_chip','wild_neon'],
              reelBg: 'linear-gradient(180deg, #1a0a20 0%, #0d0510 100%)', accentColor: '#e91e63',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_neon', scatterSymbol: 's5_vip_chip',
              bonusType: 'expanding_wild_respin', freeSpinsCount: 0, freeSpinsRetrigger: false,
              expandingWildMaxRespins: 3,
              bonusDesc: 'Neon Nights: 5×3 grid — Miami Vice expanding wilds with neon respins!',
              payouts: { triple: 75, double: 8, wildTriple: 110, scatterPay: 0, payline3: 8, payline4: 33, payline5: 75 }, minBet: 10, maxBet: 400, hot: false, jackpot: 0 },

            // ═══ 29. Viking Voyage (based on Vikings Go Berzerk) — 5x4, Payline ═══
            { id: 'viking_voyage', name: 'Viking Voyage', provider: 'Royal Games', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/viking_voyage.png', bgGradient: 'linear-gradient(135deg, #37474f 0%, #00acc1 100%)',
              symbols: ['s1_axe','s2_horn','s3_rune','s4_longship','s5_odin_eye','wild_viking'],
              reelBg: 'linear-gradient(180deg, #0a1a2a 0%, #050d15 100%)', accentColor: '#00acc1',
              gridCols: 5, gridRows: 4, winType: 'payline',
              wildSymbol: 'wild_viking', scatterSymbol: 's5_odin_eye',
              bonusType: 'stacked_wilds', freeSpinsCount: 12, freeSpinsRetrigger: true,
              stackedWildChance: 0.2,
              bonusDesc: 'Viking Voyage: 5×4 grid — Vikings go berserk with rage-powered stacked wilds!',
              payouts: { triple: 95, double: 10, wildTriple: 145, scatterPay: 4, payline3: 10, payline4: 42, payline5: 95 }, minBet: 15, maxBet: 1000, hot: false, jackpot: 0 },

            // ═══ 30. Diamond Vault (based on Divine Fortune) — 5x3, Progressive Jackpot ═══
            { id: 'diamond_vault', name: 'Diamond Vault', provider: 'Royal Games', tag: 'JACKPOT', tagClass: 'tag-jackpot', thumbnail: 'assets/thumbnails/diamond_vault.png', bgGradient: 'linear-gradient(135deg, #283593 0%, #e0e0e0 100%)',
              symbols: ['s1_sapphire','s2_ruby','s3_emerald_cut','s4_black_diamond','s5_crown_jewel','wild_vault'],
              reelBg: 'linear-gradient(180deg, #0a0a2a 0%, #050515 100%)', accentColor: '#283593',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_vault', scatterSymbol: 's5_crown_jewel',
              bonusType: 'hold_and_win', freeSpinsCount: 5, freeSpinsRetrigger: false,
              holdAndWinRespins: 3,
              bonusDesc: 'Diamond Vault: 5×3 grid — Falling Wilds + Hold & Win for progressive jackpots!',
              payouts: { triple: 180, double: 18, wildTriple: 270, scatterPay: 5, payline3: 18, payline4: 75, payline5: 180 }, minBet: 20, maxBet: 5000, hot: true, jackpot: 198420 },

            // ═══════════════════════════════════════════════════════════
            // ═══ BATCH 2: Games 31–60 (30 additional slots) ═══════════
            // ═══════════════════════════════════════════════════════════

            // ═══ 31. Madame Destiny (based on Madame Destiny Megaways) — 6x5, Cluster ═══
            { id: 'madame_destiny', name: 'Madame Destiny', provider: 'Royal Games', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/madame_destiny.png', bgGradient: 'linear-gradient(135deg, #4a148c 0%, #e040fb 100%)',
              symbols: ['s1_candle','s2_potion','s3_crystal_ball','s4_tarot','s5_mystic_eye','wild_destiny'],
              reelBg: 'linear-gradient(180deg, #1a0530 0%, #0d0218 100%)', accentColor: '#e040fb',
              gridCols: 6, gridRows: 5, winType: 'cluster', clusterMin: 8,
              wildSymbol: 'wild_destiny', scatterSymbol: 's5_mystic_eye',
              bonusType: 'random_multiplier', freeSpinsCount: 12, freeSpinsRetrigger: true,
              randomMultiplierRange: [2, 3, 5, 10, 25, 50],
              bonusDesc: 'Madame Destiny: 6×5 grid — Fortune teller reveals multipliers up to 50x!',
              payouts: { triple: 120, double: 12, wildTriple: 180, scatterPay: 4, cluster5: 4, cluster8: 12, cluster12: 40, cluster15: 120 }, minBet: 15, maxBet: 1500, hot: true, jackpot: 0 },

            // ═══ 32. Great Rhino Rush (based on Great Rhino Megaways) — 6x5, Cluster ═══
            { id: 'great_rhino', name: 'Great Rhino Rush', provider: 'Royal Games', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/great_rhino.png', bgGradient: 'linear-gradient(135deg, #33691e 0%, #fdd835 100%)',
              symbols: ['s1_flamingo','s2_crocodile','s3_gorilla','s4_rhino','s5_savanna_gem','wild_rhino'],
              reelBg: 'linear-gradient(180deg, #1a2a08 0%, #0d1404 100%)', accentColor: '#fdd835',
              gridCols: 6, gridRows: 5, winType: 'cluster', clusterMin: 8,
              wildSymbol: 'wild_rhino', scatterSymbol: 's5_savanna_gem',
              bonusType: 'random_multiplier', freeSpinsCount: 10, freeSpinsRetrigger: true,
              randomMultiplierRange: [2, 3, 5, 10, 15],
              bonusDesc: 'Great Rhino Rush: 6×5 grid — Safari cascading wins with stampede multipliers!',
              payouts: { triple: 110, double: 11, wildTriple: 165, scatterPay: 4, cluster5: 4, cluster8: 11, cluster12: 38, cluster15: 110 }, minBet: 15, maxBet: 1500, hot: true, jackpot: 0 },

            // ═══ 33. Bass Splash Extreme (based on Big Bass Splash) — 5x3, Fisherman ═══
            { id: 'bass_splash', name: 'Bass Splash Extreme', provider: 'Royal Games', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/bass_splash.png', bgGradient: 'linear-gradient(135deg, #006064 0%, #26c6da 100%)',
              symbols: ['s1_worm','s2_reel','s3_net','s4_marlin','s5_golden_lure','wild_splash'],
              reelBg: 'linear-gradient(180deg, #041a20 0%, #020d10 100%)', accentColor: '#26c6da',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_splash', scatterSymbol: 's5_golden_lure',
              bonusType: 'fisherman_collect', freeSpinsCount: 10, freeSpinsRetrigger: true,
              fishSymbols: ['s1_worm', 's4_marlin'],
              bonusDesc: 'Bass Splash: 5×3 grid — Wild fisherman upgrades and collects trophy fish!',
              payouts: { triple: 75, double: 8, wildTriple: 115, scatterPay: 3, payline3: 8, payline4: 35, payline5: 75 }, minBet: 10, maxBet: 500, hot: false, jackpot: 0 },

            // ═══ 34. Dragon Megafire (based on Floating Dragon Megaways) — 6x5, Cluster ═══
            { id: 'dragon_megafire', name: 'Dragon Megafire', provider: 'Royal Games', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/dragon_megafire.png', bgGradient: 'linear-gradient(135deg, #b71c1c 0%, #ff8f00 100%)',
              symbols: ['s1_coin_dragon','s2_scroll','s3_pagoda','s4_fire_dragon','s5_imperial_seal','wild_megafire'],
              reelBg: 'linear-gradient(180deg, #2a0505 0%, #140202 100%)', accentColor: '#ff8f00',
              gridCols: 6, gridRows: 5, winType: 'cluster', clusterMin: 8,
              wildSymbol: 'wild_megafire', scatterSymbol: 's5_imperial_seal',
              bonusType: 'random_multiplier', freeSpinsCount: 15, freeSpinsRetrigger: true,
              randomMultiplierRange: [2, 5, 8, 10, 25, 50, 88],
              bonusDesc: 'Dragon Megafire: 6×5 grid — Floating dragon breathes multiplier fire up to 88x!',
              payouts: { triple: 130, double: 13, wildTriple: 195, scatterPay: 5, cluster5: 5, cluster8: 13, cluster12: 45, cluster15: 130 }, minBet: 20, maxBet: 2000, hot: true, jackpot: 0 },

            // ═══ 35. Esqueleto Fiesta (based on Esqueleto Explosivo) — 5x3, Avalanche ═══
            { id: 'esqueleto_fiesta', name: 'Esqueleto Fiesta', provider: 'Royal Games', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/esqueleto_fiesta.png', bgGradient: 'linear-gradient(135deg, #ff6f00 0%, #e040fb 100%)',
              symbols: ['s1_guitar','s2_trumpet','s3_skull_red','s4_skull_gold','s5_sugar_skull','wild_esqueleto'],
              reelBg: 'linear-gradient(180deg, #2a1005 0%, #140802 100%)', accentColor: '#ff6f00',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_esqueleto', scatterSymbol: 's5_sugar_skull',
              bonusType: 'avalanche', freeSpinsCount: 10, freeSpinsRetrigger: true,
              avalancheMultipliers: [1, 2, 4, 8, 16, 32],
              bonusDesc: 'Esqueleto Fiesta: 5×3 grid — Day of Dead explosive chain reactions up to 32x!',
              payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3, payline3: 8, payline4: 35, payline5: 80 }, minBet: 10, maxBet: 400, hot: false, jackpot: 0 },

            // ═══ 36. Wildfire Gold (based on Wild West Gold) — 5x4, Sticky Wilds ═══
            { id: 'wildfire_gold', name: 'Wildfire Gold', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/wildfire_gold.png', bgGradient: 'linear-gradient(135deg, #5d4037 0%, #ffb300 100%)',
              symbols: ['s1_wanted_poster','s2_whiskey','s3_dynamite','s4_sheriff_badge','s5_gold_nugget','wild_wildfire'],
              reelBg: 'linear-gradient(180deg, #1a1208 0%, #0d0904 100%)', accentColor: '#ffb300',
              gridCols: 5, gridRows: 4, winType: 'payline',
              wildSymbol: 'wild_wildfire', scatterSymbol: 's5_gold_nugget',
              bonusType: 'stacked_wilds', freeSpinsCount: 10, freeSpinsRetrigger: true,
              stackedWildChance: 0.22,
              bonusDesc: 'Wildfire Gold: 5×4 grid — Wild West sticky wilds with 3x multipliers!',
              payouts: { triple: 95, double: 10, wildTriple: 140, scatterPay: 4, payline3: 10, payline4: 42, payline5: 95 }, minBet: 15, maxBet: 800, hot: false, jackpot: 0 },

            // ═══ 37. Five Lions Fortune (based on 5 Lions) — 5x3, Hold & Win ═══
            { id: 'five_lions', name: 'Five Lions Fortune', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/five_lions.png', bgGradient: 'linear-gradient(135deg, #c62828 0%, #ffc107 100%)',
              symbols: ['s1_drum','s2_firecracker','s3_lion_dance','s4_golden_lion','s5_fortune_coin','wild_lions'],
              reelBg: 'linear-gradient(180deg, #2a0808 0%, #140404 100%)', accentColor: '#ffc107',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_lions', scatterSymbol: 's5_fortune_coin',
              bonusType: 'hold_and_win', freeSpinsCount: 5, freeSpinsRetrigger: false,
              holdAndWinRespins: 3,
              bonusDesc: 'Five Lions: 5×3 grid — Lion dance Hold & Win with golden fortune coins!',
              payouts: { triple: 85, double: 9, wildTriple: 130, scatterPay: 3, payline3: 9, payline4: 38, payline5: 85 }, minBet: 10, maxBet: 500, hot: false, jackpot: 0 },

            // ═══ 38. Chilli Heat Wave (based on Chilli Heat) — 5x3, Hold & Win ═══
            { id: 'chilli_heat', name: 'Chilli Heat Wave', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/chilli_heat.png', bgGradient: 'linear-gradient(135deg, #d32f2f 0%, #ff9800 100%)',
              symbols: ['s1_pepper_green','s2_pepper_red','s3_chihuahua','s4_pinata','s5_money_chilli','wild_heat'],
              reelBg: 'linear-gradient(180deg, #2a0a05 0%, #140502 100%)', accentColor: '#ff9800',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_heat', scatterSymbol: 's5_money_chilli',
              bonusType: 'hold_and_win', freeSpinsCount: 8, freeSpinsRetrigger: false,
              holdAndWinRespins: 3,
              bonusDesc: 'Chilli Heat Wave: 5×3 grid — Spicy Hold & Win with money pepper jackpots!',
              payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3, payline3: 8, payline4: 35, payline5: 80 }, minBet: 10, maxBet: 500, hot: false, jackpot: 0 },

            // ═══ 39. Tombstone Reloaded (based on Tombstone RIP) — 5x4, Expanding Wilds ═══
            { id: 'tombstone_reload', name: 'Tombstone Reloaded', provider: 'Royal Games', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/tombstone_reload.png', bgGradient: 'linear-gradient(135deg, #3e2723 0%, #ff5722 100%)',
              symbols: ['s1_boots','s2_revolver','s3_wanted','s4_outlaw','s5_bounty_skull','wild_tombstone'],
              reelBg: 'linear-gradient(180deg, #1a0d05 0%, #0d0602 100%)', accentColor: '#ff5722',
              gridCols: 5, gridRows: 4, winType: 'payline',
              wildSymbol: 'wild_tombstone', scatterSymbol: 's5_bounty_skull',
              bonusType: 'expanding_wild_respin', freeSpinsCount: 0, freeSpinsRetrigger: false,
              expandingWildMaxRespins: 5,
              bonusDesc: 'Tombstone Reloaded: 5×4 grid — Outlaw expanding wilds shoot across the reels!',
              payouts: { triple: 110, double: 11, wildTriple: 165, scatterPay: 0, payline3: 11, payline4: 48, payline5: 110 }, minBet: 15, maxBet: 1000, hot: true, jackpot: 0 },

            // ═══ 40. Mental Meltdown (based on Mental) — 5x4, Cluster ═══
            { id: 'mental_meltdown', name: 'Mental Meltdown', provider: 'Royal Games', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/mental_meltdown.png', bgGradient: 'linear-gradient(135deg, #1b5e20 0%, #76ff03 100%)',
              symbols: ['s1_pill','s2_syringe','s3_straitjacket','s4_electric','s5_brain','wild_mental'],
              reelBg: 'linear-gradient(180deg, #0a1a08 0%, #050d04 100%)', accentColor: '#76ff03',
              gridCols: 5, gridRows: 4, winType: 'payline',
              wildSymbol: 'wild_mental', scatterSymbol: 's5_brain',
              bonusType: 'avalanche', freeSpinsCount: 12, freeSpinsRetrigger: true,
              avalancheMultipliers: [1, 2, 4, 8, 16, 32, 64],
              bonusDesc: 'Mental Meltdown: 5×4 grid — Insane chain reactions with multipliers up to 64x!',
              payouts: { triple: 100, double: 10, wildTriple: 150, scatterPay: 4, payline3: 10, payline4: 45, payline5: 100 }, minBet: 15, maxBet: 1000, hot: false, jackpot: 0 },

            // ═══ 41. San Quentin Escape (based on San Quentin) — 5x4, Expanding ═══
            { id: 'san_quentin', name: 'San Quentin Escape', provider: 'Royal Games', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/san_quentin.png', bgGradient: 'linear-gradient(135deg, #455a64 0%, #ff3d00 100%)',
              symbols: ['s1_handcuffs','s2_key_ring','s3_guard','s4_razor_wire','s5_freedom_gem','wild_quentin'],
              reelBg: 'linear-gradient(180deg, #0a1015 0%, #05080a 100%)', accentColor: '#ff3d00',
              gridCols: 5, gridRows: 4, winType: 'payline',
              wildSymbol: 'wild_quentin', scatterSymbol: 's5_freedom_gem',
              bonusType: 'expanding_symbol', freeSpinsCount: 15, freeSpinsRetrigger: true,
              bonusDesc: 'San Quentin Escape: 5×4 grid — xWays expanding reels and lockdown spins!',
              payouts: { triple: 130, double: 13, wildTriple: 195, scatterPay: 5, payline3: 13, payline4: 55, payline5: 130 }, minBet: 20, maxBet: 2000, hot: true, jackpot: 0 },

            // ═══ 42. Nitro Street (based on Nitropolis) — 5x4, Avalanche ═══
            { id: 'nitro_street', name: 'Nitro Street', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/nitro_street.png', bgGradient: 'linear-gradient(135deg, #1a237e 0%, #00e676 100%)',
              symbols: ['s1_spray_can','s2_boombox','s3_skateboard','s4_bulldog','s5_nitro_gem','wild_nitro'],
              reelBg: 'linear-gradient(180deg, #0a0a2a 0%, #050515 100%)', accentColor: '#00e676',
              gridCols: 5, gridRows: 4, winType: 'payline',
              wildSymbol: 'wild_nitro', scatterSymbol: 's5_nitro_gem',
              bonusType: 'avalanche', freeSpinsCount: 10, freeSpinsRetrigger: true,
              avalancheMultipliers: [1, 2, 3, 5, 10, 20],
              bonusDesc: 'Nitro Street: 5×4 grid — Urban animal gangs with cascade multipliers up to 20x!',
              payouts: { triple: 90, double: 9, wildTriple: 135, scatterPay: 3, payline3: 9, payline4: 40, payline5: 90 }, minBet: 10, maxBet: 600, hot: false, jackpot: 0 },

            // ═══ 43. Wild Toro Matador (based on Wild Toro) — 5x4, Expanding Wilds ═══
            { id: 'wild_toro', name: 'Wild Toro Matador', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/wild_toro.png', bgGradient: 'linear-gradient(135deg, #880e4f 0%, #f44336 100%)',
              symbols: ['s1_cape','s2_rose','s3_sword','s4_matador','s5_golden_horn','wild_toro'],
              reelBg: 'linear-gradient(180deg, #2a0510 0%, #140208 100%)', accentColor: '#f44336',
              gridCols: 5, gridRows: 4, winType: 'payline',
              wildSymbol: 'wild_toro', scatterSymbol: 's5_golden_horn',
              bonusType: 'expanding_wild_respin', freeSpinsCount: 0, freeSpinsRetrigger: false,
              expandingWildMaxRespins: 5,
              bonusDesc: 'Wild Toro: 5×4 grid — The bull charges across reels leaving expanding wilds!',
              payouts: { triple: 95, double: 10, wildTriple: 145, scatterPay: 0, payline3: 10, payline4: 42, payline5: 95 }, minBet: 10, maxBet: 600, hot: false, jackpot: 0 },

            // ═══ 44. Jammin' Fruits (based on Jammin' Jars) — 8x8, Cluster ═══
            { id: 'jammin_fruits', name: "Jammin' Fruits", provider: 'Royal Games', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/jammin_fruits.png', bgGradient: 'linear-gradient(135deg, #7b1fa2 0%, #ff6d00 100%)',
              symbols: ['s1_strawberry','s2_orange','s3_raspberry','s4_plum_jar','s5_rainbow_fruit','wild_jam'],
              reelBg: 'linear-gradient(180deg, #1a0530 0%, #0d0218 100%)', accentColor: '#7b1fa2',
              gridCols: 7, gridRows: 7, winType: 'cluster', clusterMin: 5,
              wildSymbol: 'wild_jam', scatterSymbol: 's5_rainbow_fruit',
              bonusType: 'tumble', freeSpinsCount: 6, freeSpinsRetrigger: true,
              tumbleMultipliers: [1, 2, 3, 5, 8, 15, 25, 50],
              bonusDesc: "Jammin' Fruits: 7×7 grid — Jam jar wilds collect multipliers up to 50x!",
              payouts: { triple: 140, double: 14, wildTriple: 210, scatterPay: 5, cluster5: 5, cluster8: 14, cluster12: 48, cluster15: 140 }, minBet: 10, maxBet: 2000, hot: true, jackpot: 0 },

            // ═══ 45. Big Bamboo Fortune (based on Big Bamboo) — 5x4, Money Collect ═══
            { id: 'big_bamboo', name: 'Big Bamboo Fortune', provider: 'Royal Games', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/big_bamboo.png', bgGradient: 'linear-gradient(135deg, #2e7d32 0%, #ffeb3b 100%)',
              symbols: ['s1_bamboo_shoot','s2_panda','s3_temple_bell','s4_jade_frog','s5_golden_bamboo','wild_bamboo'],
              reelBg: 'linear-gradient(180deg, #0a2a0a 0%, #05140a 100%)', accentColor: '#2e7d32',
              gridCols: 5, gridRows: 4, winType: 'payline',
              wildSymbol: 'wild_bamboo', scatterSymbol: 's5_golden_bamboo',
              bonusType: 'money_collect', freeSpinsCount: 10, freeSpinsRetrigger: true,
              moneySymbols: ['s2_panda', 's3_temple_bell', 's4_jade_frog'],
              bonusDesc: 'Big Bamboo: 5×4 grid — Bamboo mystery symbols reveal hidden coin values!',
              payouts: { triple: 100, double: 10, wildTriple: 150, scatterPay: 4, payline3: 10, payline4: 45, payline5: 100 }, minBet: 15, maxBet: 800, hot: false, jackpot: 0 },

            // ═══ 46. Fat Rabbit Run (based on Fat Rabbit) — 6x5, Tumble ═══
            { id: 'fat_rabbit', name: 'Fat Rabbit Run', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/fat_rabbit.png', bgGradient: 'linear-gradient(135deg, #43a047 0%, #ffcc80 100%)',
              symbols: ['s1_carrot','s2_cabbage','s3_turnip','s4_fat_bunny','s5_golden_carrot','wild_rabbit'],
              reelBg: 'linear-gradient(180deg, #0a2a10 0%, #051408 100%)', accentColor: '#43a047',
              gridCols: 6, gridRows: 5, winType: 'cluster', clusterMin: 8,
              wildSymbol: 'wild_rabbit', scatterSymbol: 's5_golden_carrot',
              bonusType: 'tumble', freeSpinsCount: 10, freeSpinsRetrigger: true,
              tumbleMultipliers: [1, 2, 3, 5, 10, 15],
              bonusDesc: 'Fat Rabbit: 6×5 grid — Giant rabbit grows by eating winning symbols!',
              payouts: { triple: 90, double: 9, wildTriple: 135, scatterPay: 3, cluster5: 3, cluster8: 9, cluster12: 32, cluster15: 90 }, minBet: 10, maxBet: 500, hot: false, jackpot: 0 },

            // ═══ 47. Immortal Blood (based on Immortal Romance) — 5x3, Random Features ═══
            { id: 'immortal_blood', name: 'Immortal Blood', provider: 'Royal Games', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/immortal_blood.png', bgGradient: 'linear-gradient(135deg, #311b92 0%, #c62828 100%)',
              symbols: ['s1_castle','s2_blood_rose','s3_wolf_moon','s4_vampire_lady','s5_immortal_ring','wild_immortal'],
              reelBg: 'linear-gradient(180deg, #0a051a 0%, #05020d 100%)', accentColor: '#c62828',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_immortal', scatterSymbol: 's5_immortal_ring',
              bonusType: 'random_multiplier', freeSpinsCount: 15, freeSpinsRetrigger: true,
              randomMultiplierRange: [2, 3, 5, 6, 10, 15],
              bonusDesc: 'Immortal Blood: 5×3 grid — 4 vampire chambers with escalating bonus features!',
              payouts: { triple: 90, double: 10, wildTriple: 140, scatterPay: 4, payline3: 10, payline4: 40, payline5: 90 }, minBet: 10, maxBet: 600, hot: false, jackpot: 0 },

            // ═══ 48. Mega Moolah Safari (based on Mega Moolah) — 5x3, Progressive Jackpot ═══
            { id: 'mega_safari', name: 'Mega Moolah Safari', provider: 'Royal Games', tag: 'JACKPOT', tagClass: 'tag-jackpot', thumbnail: 'assets/thumbnails/mega_safari.png', bgGradient: 'linear-gradient(135deg, #e65100 0%, #33691e 100%)',
              symbols: ['s1_zebra','s2_giraffe','s3_elephant','s4_lion_king','s5_safari_diamond','wild_safari'],
              reelBg: 'linear-gradient(180deg, #2a1a05 0%, #140d02 100%)', accentColor: '#e65100',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_safari', scatterSymbol: 's5_safari_diamond',
              bonusType: 'wheel_multiplier', freeSpinsCount: 15, freeSpinsRetrigger: true,
              wheelMultipliers: [2, 3, 5, 5, 10, 10, 25, 100],
              bonusDesc: 'Mega Safari: 5×3 grid — 4-tier progressive jackpot wheel! Mega jackpot available!',
              payouts: { triple: 200, double: 20, wildTriple: 300, scatterPay: 5, payline3: 20, payline4: 80, payline5: 200 }, minBet: 25, maxBet: 5000, hot: true, jackpot: 456780 },

            // ═══ 49. Lucha Libre Mania (based on Lucha Maniacs) — 5x3, Random Features ═══
            { id: 'lucha_mania', name: 'Lucha Libre Mania', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/lucha_mania.png', bgGradient: 'linear-gradient(135deg, #f57f17 0%, #00c853 100%)',
              symbols: ['s1_mask_blue','s2_mask_red','s3_belt','s4_luchador','s5_championship','wild_lucha'],
              reelBg: 'linear-gradient(180deg, #2a1a00 0%, #140d00 100%)', accentColor: '#f57f17',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_lucha', scatterSymbol: 's5_championship',
              bonusType: 'random_multiplier', freeSpinsCount: 8, freeSpinsRetrigger: true,
              randomMultiplierRange: [2, 3, 5, 8, 10],
              bonusDesc: 'Lucha Libre: 5×3 grid — Wrestling tag-team random features in the ring!',
              payouts: { triple: 70, double: 7, wildTriple: 105, scatterPay: 3, payline3: 7, payline4: 30, payline5: 70 }, minBet: 10, maxBet: 400, hot: false, jackpot: 0 },

            // ═══ 50. Extra Chilli Blaze (based on Extra Chilli) — 6x5, Cluster ═══
            { id: 'extra_chilli', name: 'Extra Chilli Blaze', provider: 'Royal Games', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/extra_chilli.png', bgGradient: 'linear-gradient(135deg, #bf360c 0%, #ffd600 100%)',
              symbols: ['s1_jalapeno','s2_habanero','s3_ghost_pepper','s4_carolina_reaper','s5_fire_crystal','wild_extra'],
              reelBg: 'linear-gradient(180deg, #2a0a02 0%, #140501 100%)', accentColor: '#ffd600',
              gridCols: 6, gridRows: 5, winType: 'cluster', clusterMin: 8,
              wildSymbol: 'wild_extra', scatterSymbol: 's5_fire_crystal',
              bonusType: 'tumble', freeSpinsCount: 12, freeSpinsRetrigger: true,
              tumbleMultipliers: [1, 2, 3, 5, 8, 12, 24],
              bonusDesc: 'Extra Chilli Blaze: 6×5 grid — Scoville scale multipliers burn up to 24x!',
              payouts: { triple: 125, double: 12, wildTriple: 185, scatterPay: 4, cluster5: 4, cluster8: 12, cluster12: 42, cluster15: 125 }, minBet: 15, maxBet: 1500, hot: true, jackpot: 0 },

            // ═══ 51. Wanted Dead or Rich (based on Wanted Dead or a Wild) — 5x5, Cluster ═══
            { id: 'wanted_dead', name: 'Wanted Dead or Rich', provider: 'Royal Games', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/wanted_dead.png', bgGradient: 'linear-gradient(135deg, #4e342e 0%, #ff6f00 100%)',
              symbols: ['s1_colt','s2_train','s3_gold_pan','s4_bandit','s5_wanted_star','wild_wanted'],
              reelBg: 'linear-gradient(180deg, #1a0d05 0%, #0d0602 100%)', accentColor: '#ff6f00',
              gridCols: 5, gridRows: 5, winType: 'cluster', clusterMin: 5,
              wildSymbol: 'wild_wanted', scatterSymbol: 's5_wanted_star',
              bonusType: 'random_multiplier', freeSpinsCount: 10, freeSpinsRetrigger: true,
              randomMultiplierRange: [2, 3, 5, 10, 25, 50, 100],
              bonusDesc: 'Wanted Dead or Rich: 5×5 grid — Duel at Dawn with outlaw multipliers up to 100x!',
              payouts: { triple: 135, double: 13, wildTriple: 200, scatterPay: 5, cluster5: 5, cluster8: 13, cluster12: 45, cluster15: 135 }, minBet: 20, maxBet: 2000, hot: true, jackpot: 0 },

            // ═══ 52. Chaos Crew Rampage (based on Chaos Crew 2) — 5x5, Cluster ═══
            { id: 'chaos_crew', name: 'Chaos Crew Rampage', provider: 'Royal Games', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/chaos_crew.png', bgGradient: 'linear-gradient(135deg, #e91e63 0%, #00bfa5 100%)',
              symbols: ['s1_skully','s2_cranky','s3_graffiti','s4_bomb','s5_chaos_gem','wild_chaos'],
              reelBg: 'linear-gradient(180deg, #2a0515 0%, #14020a 100%)', accentColor: '#e91e63',
              gridCols: 5, gridRows: 5, winType: 'cluster', clusterMin: 5,
              wildSymbol: 'wild_chaos', scatterSymbol: 's5_chaos_gem',
              bonusType: 'tumble', freeSpinsCount: 10, freeSpinsRetrigger: true,
              tumbleMultipliers: [1, 2, 4, 8, 16, 32, 64],
              bonusDesc: 'Chaos Crew: 5×5 grid — Punk duo wreak havoc with chain multipliers up to 64x!',
              payouts: { triple: 140, double: 14, wildTriple: 210, scatterPay: 5, cluster5: 5, cluster8: 14, cluster12: 48, cluster15: 140 }, minBet: 15, maxBet: 1500, hot: false, jackpot: 0 },

            // ═══ 53. Le Bandit Heist (based on Le Bandit) — 5x3, Money Collect ═══
            { id: 'le_bandit', name: 'Le Bandit Heist', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/le_bandit.png', bgGradient: 'linear-gradient(135deg, #1a237e 0%, #b388ff 100%)',
              symbols: ['s1_baguette','s2_wine','s3_eiffel','s4_raccoon','s5_diamond_bag','wild_bandit'],
              reelBg: 'linear-gradient(180deg, #0a0a2a 0%, #050515 100%)', accentColor: '#b388ff',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_bandit', scatterSymbol: 's5_diamond_bag',
              bonusType: 'money_collect', freeSpinsCount: 10, freeSpinsRetrigger: true,
              moneySymbols: ['s1_baguette', 's2_wine', 's4_raccoon'],
              bonusDesc: 'Le Bandit: 5×3 grid — French raccoon collects loot across Paris!',
              payouts: { triple: 75, double: 8, wildTriple: 115, scatterPay: 3, payline3: 8, payline4: 33, payline5: 75 }, minBet: 10, maxBet: 400, hot: false, jackpot: 0 },

            // ═══ 54. Dead or Alive Reloaded (based on Dead or Alive 2) — 5x3, Sticky Wilds ═══
            { id: 'dead_alive', name: 'Dead or Alive Reloaded', provider: 'Royal Games', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/dead_alive.png', bgGradient: 'linear-gradient(135deg, #795548 0%, #d32f2f 100%)',
              symbols: ['s1_cowboy_boots','s2_hat_western','s3_gun_holster','s4_saloon','s5_sheriff_star','wild_dead'],
              reelBg: 'linear-gradient(180deg, #1a1008 0%, #0d0804 100%)', accentColor: '#d32f2f',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_dead', scatterSymbol: 's5_sheriff_star',
              bonusType: 'stacked_wilds', freeSpinsCount: 12, freeSpinsRetrigger: true,
              stackedWildChance: 0.25,
              bonusDesc: 'Dead or Alive: 5×3 grid — High Noon sticky wilds for legendary payouts!',
              payouts: { triple: 100, double: 10, wildTriple: 150, scatterPay: 4, payline3: 10, payline4: 45, payline5: 100 }, minBet: 10, maxBet: 800, hot: false, jackpot: 0 },

            // ═══ 55. Mega Joker Classic (based on Mega Joker) — 3x3, Classic ═══
            { id: 'mega_joker', name: 'Mega Joker Classic', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/mega_joker.png', bgGradient: 'linear-gradient(135deg, #f44336 0%, #ffc107 100%)',
              symbols: ['s1_cherry_classic','s2_lemon_classic','s3_grape_classic','s4_bell_classic','s5_crown_classic','wild_joker_mega'],
              reelBg: 'linear-gradient(180deg, #2a0808 0%, #140404 100%)', accentColor: '#ffc107',
              gridCols: 3, gridRows: 3, winType: 'classic',
              wildSymbol: 'wild_joker_mega', scatterSymbol: 's5_crown_classic',
              bonusType: 'wheel_multiplier', freeSpinsCount: 5, freeSpinsRetrigger: false,
              wheelMultipliers: [2, 3, 3, 5, 5, 10, 20, 50],
              bonusDesc: 'Mega Joker: Classic 3×3 — Super Meter mode with up to 99% RTP!',
              payouts: { triple: 100, double: 12, wildTriple: 150, scatterPay: 5 }, minBet: 5, maxBet: 200, hot: false, jackpot: 0 },

            // ═══ 56. Crown of Fire (based on Crown of Fire) — 5x3, Hold & Win ═══
            { id: 'crown_fire', name: 'Crown of Fire', provider: 'Royal Games', tag: '', tagClass: '', thumbnail: 'assets/thumbnails/crown_fire.png', bgGradient: 'linear-gradient(135deg, #e65100 0%, #ffab00 100%)',
              symbols: ['s1_torch','s2_brazier','s3_phoenix_feather','s4_fire_crown','s5_flame_gem','wild_crown_fire'],
              reelBg: 'linear-gradient(180deg, #2a1505 0%, #140a02 100%)', accentColor: '#ffab00',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_crown_fire', scatterSymbol: 's5_flame_gem',
              bonusType: 'hold_and_win', freeSpinsCount: 5, freeSpinsRetrigger: false,
              holdAndWinRespins: 3,
              bonusDesc: 'Crown of Fire: 5×3 grid — Blazing Hold & Win with phoenix respins!',
              payouts: { triple: 80, double: 8, wildTriple: 120, scatterPay: 3, payline3: 8, payline4: 35, payline5: 80 }, minBet: 10, maxBet: 500, hot: false, jackpot: 0 },

            // ═══ 57. Olympus Dream Drop (based on Olympus 7's Dream Drop) — 6x5, Progressive ═══
            { id: 'olympus_dream', name: 'Olympus Dream Drop', provider: 'Royal Games', tag: 'JACKPOT', tagClass: 'tag-jackpot', thumbnail: 'assets/thumbnails/olympus_dream.png', bgGradient: 'linear-gradient(135deg, #1565c0 0%, #ffb74d 100%)',
              symbols: ['s1_hera','s2_athena','s3_apollo','s4_ares_god','s5_zeus_orb','wild_dream'],
              reelBg: 'linear-gradient(180deg, #0a1530 0%, #050a18 100%)', accentColor: '#1565c0',
              gridCols: 6, gridRows: 5, winType: 'cluster', clusterMin: 8,
              wildSymbol: 'wild_dream', scatterSymbol: 's5_zeus_orb',
              bonusType: 'zeus_multiplier', freeSpinsCount: 15, freeSpinsRetrigger: true,
              zeusMultipliers: [2, 3, 5, 10, 25, 500],
              bonusDesc: 'Olympus Dream: 6×5 grid — Dream Drop 5-tier progressive jackpot!',
              payouts: { triple: 160, double: 16, wildTriple: 240, scatterPay: 5, cluster5: 5, cluster8: 16, cluster12: 55, cluster15: 160 }, minBet: 25, maxBet: 5000, hot: true, jackpot: 342890 },

            // ═══ 58. GoldStorm Ultra (based on Yggdrasil GoldStorm) — 5x3, Random Features ═══
            { id: 'goldstorm_ultra', name: 'GoldStorm Ultra', provider: 'Royal Games', tag: 'NEW', tagClass: 'tag-new', thumbnail: 'assets/thumbnails/goldstorm_ultra.png', bgGradient: 'linear-gradient(135deg, #ffd600 0%, #6a1b9a 100%)',
              symbols: ['s1_gold_coin_storm','s2_thunder_cloud','s3_storm_bolt','s4_golden_eagle_storm','s5_ultra_gem','wild_goldstorm'],
              reelBg: 'linear-gradient(180deg, #2a2000 0%, #141000 100%)', accentColor: '#ffd600',
              gridCols: 5, gridRows: 3, winType: 'payline',
              wildSymbol: 'wild_goldstorm', scatterSymbol: 's5_ultra_gem',
              bonusType: 'random_multiplier', freeSpinsCount: 10, freeSpinsRetrigger: true,
              randomMultiplierRange: [2, 3, 5, 10, 25, 50],
              bonusDesc: 'GoldStorm Ultra: 5×3 grid — Electric gold storm with lightning multipliers!',
              payouts: { triple: 85, double: 9, wildTriple: 130, scatterPay: 3, payline3: 9, payline4: 38, payline5: 85 }, minBet: 10, maxBet: 600, hot: false, jackpot: 0 },

            // ═══ 59. Fire in the Hole XBomb (based on Fire in the Hole) — 6x5, Cluster ═══
            { id: 'fire_hole', name: 'Fire in the Hole XBomb', provider: 'Royal Games', tag: 'HOT', tagClass: 'tag-hot', thumbnail: 'assets/thumbnails/fire_hole.png', bgGradient: 'linear-gradient(135deg, #4e342e 0%, #f4511e 100%)',
              symbols: ['s1_pickaxe','s2_mine_cart','s3_tnt','s4_lantern_mine','s5_gold_vein','wild_xbomb'],
              reelBg: 'linear-gradient(180deg, #1a0d05 0%, #0d0602 100%)', accentColor: '#f4511e',
              gridCols: 6, gridRows: 5, winType: 'cluster', clusterMin: 8,
              wildSymbol: 'wild_xbomb', scatterSymbol: 's5_gold_vein',
              bonusType: 'tumble', freeSpinsCount: 10, freeSpinsRetrigger: true,
              tumbleMultipliers: [1, 2, 4, 8, 16, 32, 64, 128],
              bonusDesc: 'Fire in the Hole: 6×5 grid — xBomb wilds explode for chain multipliers up to 128x!',
              payouts: { triple: 150, double: 15, wildTriple: 225, scatterPay: 5, cluster5: 5, cluster8: 15, cluster12: 50, cluster15: 150 }, minBet: 20, maxBet: 2000, hot: true, jackpot: 0 },

            // ═══ 60. Merlin's Power (based on Power of Merlin Megaways) — 6x5, Cluster ═══
            { id: 'merlin_power', name: "Merlin's Power", provider: 'Royal Games', tag: 'POPULAR', tagClass: 'tag-popular', thumbnail: 'assets/thumbnails/merlin_power.png', bgGradient: 'linear-gradient(135deg, #4a148c 0%, #00e5ff 100%)',
              symbols: ['s1_spell_book','s2_wand_crystal','s3_cauldron','s4_merlin_owl','s5_arcane_orb','wild_merlin'],
              reelBg: 'linear-gradient(180deg, #150530 0%, #0a0218 100%)', accentColor: '#4a148c',
              gridCols: 6, gridRows: 5, winType: 'cluster', clusterMin: 8,
              wildSymbol: 'wild_merlin', scatterSymbol: 's5_arcane_orb',
              bonusType: 'zeus_multiplier', freeSpinsCount: 12, freeSpinsRetrigger: true,
              zeusMultipliers: [2, 3, 5, 10, 25, 100],
              bonusDesc: "Merlin's Power: 6×5 grid — Arcane multiplier spells up to 100x!",
              payouts: { triple: 115, double: 11, wildTriple: 175, scatterPay: 4, cluster5: 4, cluster8: 11, cluster12: 40, cluster15: 115 }, minBet: 15, maxBet: 1500, hot: false, jackpot: 0 }
        ];

        // ═══════════════════════════════════════════════════════
        // ═══ LOCAL AUTH SYSTEM (localStorage-based, no server) ═══
        // ═══════════════════════════════════════════════════════
        let authToken = localStorage.getItem('casinoToken');
        let currentUser = null;

        // Restore user from localStorage on load
        (function restoreUser() {
            const savedUser = localStorage.getItem('casinoUser');
            if (savedUser) {
                try { currentUser = JSON.parse(savedUser); } catch (e) {}
            }
        })();

        async function login(username, password) {
            // Local auth: check registered users in localStorage
            const users = JSON.parse(localStorage.getItem('casinoUsers') || '{}');
            const user = users[username.toLowerCase()];
            if (!user) throw new Error('User not found. Please register first.');
            if (user.password !== password) throw new Error('Incorrect password.');
            authToken = 'local-' + Date.now();
            localStorage.setItem('casinoToken', authToken);
            currentUser = { username: user.username, email: user.email };
            localStorage.setItem('casinoUser', JSON.stringify(currentUser));
            updateAuthButton();
            hideAuthModal();
            showToast(`Welcome back, ${user.username}!`, 'success');
        }

        async function register(username, email, password) {
            const users = JSON.parse(localStorage.getItem('casinoUsers') || '{}');
            const key = username.toLowerCase();
            if (users[key]) throw new Error('Username already taken.');
            if (username.length < 3 || username.length > 20) throw new Error('Username must be 3-20 characters.');
            users[key] = { username, email, password };
            localStorage.setItem('casinoUsers', JSON.stringify(users));
            authToken = 'local-' + Date.now();
            localStorage.setItem('casinoToken', authToken);
            currentUser = { username, email };
            localStorage.setItem('casinoUser', JSON.stringify(currentUser));
            updateAuthButton();
            hideAuthModal();
            showToast(`Welcome, ${username}! Your account has been created.`, 'success');
        }

        function logout() {
            authToken = null;
            localStorage.removeItem('casinoToken');
            currentUser = null;
            localStorage.removeItem('casinoUser');
            updateAuthButton();
            showToast('Logged out successfully.', 'info');
        }

        function updateAuthButton() {
            const btn = document.getElementById('authBtn');
            if (!btn) return;
            if (currentUser) {
                btn.textContent = currentUser.username.toUpperCase();
                btn.title = 'Click to logout';
            } else {
                btn.textContent = 'LOGIN';
                btn.title = 'Click to login';
            }
        }

        function showAuthModal() {
            const modal = document.getElementById('authModal');
            if (modal) modal.classList.add('active');
            // Reset to login tab when opening
            if (typeof switchAuthTab === 'function') switchAuthTab('login');
        }

        function hideAuthModal() {
            const modal = document.getElementById('authModal');
            if (modal) modal.classList.remove('active');
            // Clear form fields and errors on close
            const errEl = document.getElementById('authError');
            if (errEl) errEl.textContent = '';
            ['loginUsername', 'loginPassword', 'regUsername', 'regEmail', 'regPassword', 'regConfirm'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
        }

        // ═══ END LOCAL AUTH SYSTEM ═══

        // Build symbol image HTML for any game symbol
        function getSymbolHtml(symbolName, gameId) {
            return `<img class="reel-symbol-img" src="assets/game_symbols/${gameId}/${symbolName}.png" alt="${symbolName}" draggable="false" onerror="this.style.display='none'">`;
        }

        // Legacy shared asset templates (used only as fallback for old CSS symbols)
        const assetTemplates = {
            diamond: `<img class="reel-symbol-img" src="assets/ui/sym_diamond.png" alt="Diamond" draggable="false">`,
            cherry: `<img class="reel-symbol-img" src="assets/ui/sym_cherry.png" alt="Cherry" draggable="false">`,
            seven: `<img class="reel-symbol-img" src="assets/ui/sym_seven.png" alt="Seven" draggable="false">`,
            crown: `<img class="reel-symbol-img" src="assets/ui/sym_seven.png" alt="Crown" draggable="false">`,
            star: `<img class="reel-symbol-img" src="assets/ui/sym_star.png" alt="Star" draggable="false">`,
            bell: `<img class="reel-symbol-img" src="assets/ui/sym_bell.png" alt="Bell" draggable="false">`,
            coin: `<img class="reel-symbol-img" src="assets/ui/sym_diamond.png" alt="Coin" draggable="false">`,
            bar: `<img class="reel-symbol-img" src="assets/ui/sym_bar.png" alt="BAR" draggable="false">`,
            clover: `<img class="reel-symbol-img" src="assets/ui/sym_star.png" alt="Clover" draggable="false">`,
            watermelon: `<img class="reel-symbol-img" src="assets/ui/sym_watermelon.png" alt="Watermelon" draggable="false">`,
            lemon: `<img class="reel-symbol-img" src="assets/ui/sym_lemon.png" alt="Lemon" draggable="false">`
        };
        // State
        const STORAGE_KEYS = {
            balance: 'casinoBalance',
            stats: 'casinoStats'
        };

        const DEFAULT_BALANCE = 5000;
        const DEFAULT_STATS = {
            totalSpins: 0,
            totalWagered: 0,
            totalWon: 0,
            biggestWin: 0,
            gamesPlayed: {},
            achievements: []
        };
        // Legacy global symbols (for QA/forced-spin compatibility)
        const SLOT_SYMBOLS = ['diamond', 'cherry', 'seven', 'crown', 'star', 'bell', 'coin', 'bar', 'clover', 'watermelon'];

        // Get the current game's symbol list
        function getGameSymbols(game) {
            return (game && game.symbols) ? game.symbols : SLOT_SYMBOLS;
        }

        // ═══ Grid Helpers ═══
        function getGridCols(game) { return (game && game.gridCols) || 3; }
        function getGridRows(game) { return (game && game.gridRows) || 1; }
        function getWinType(game) { return (game && game.winType) || 'classic'; }
        function isMultiRow(game) { return getGridRows(game) > 1; }

        // Create empty 2D grid [cols][rows]
        function createEmptyGrid(cols, rows) {
            return Array.from({ length: cols }, () => Array(rows).fill(null));
        }

        // Generate random grid for a game
        function generateRandomGrid(game) {
            const cols = getGridCols(game);
            const rows = getGridRows(game);
            const syms = getGameSymbols(game);
            const grid = createEmptyGrid(cols, rows);
            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows; r++) {
                    grid[c][r] = syms[Math.floor(getRandomNumber() * syms.length)];
                }
            }
            return grid;
        }

        // Flatten grid to 1D array (for backwards compatibility with classic 3-reel)
        function flattenGrid(grid) {
            if (!grid) return [];
            // For classic: just first row across all cols
            return grid.map(col => col[0]);
        }

        // Build grid from 1D symbol array (classic 3-reel compat)
        function gridFrom1D(symbols, game) {
            const cols = getGridCols(game);
            const rows = getGridRows(game);
            if (rows === 1 || !isMultiRow(game)) {
                // Classic: each symbol = one column, one row
                return symbols.map(s => [s]);
            }
            // Already a grid scenario — shouldn't reach here from 1D
            return symbols.map(s => [s]);
        }

        // Generate spin result as 2D grid
        function generateSpinResult(game) {
            if (forcedSpinQueue.length > 0) {
                const forced = [...forcedSpinQueue.shift()];
                const cols = getGridCols(game);
                const rows = getGridRows(game);

                // If forced array matches cols (1D) — fill grid with those symbols
                if (rows > 1) {
                    const grid = createEmptyGrid(cols, rows);
                    for (let c = 0; c < cols; c++) {
                        const sym = forced[c % forced.length]; // Cycle through forced symbols
                        for (let r = 0; r < rows; r++) {
                            grid[c][r] = sym;
                        }
                    }
                    return grid;
                }
                // Classic 1-row: direct mapping
                return gridFrom1D(forced, game);
            }
            return generateRandomGrid(game);
        }

        // Build the reel DOM dynamically based on game's grid config
        function buildReelGrid(game) {
            const reelsContainer = document.getElementById('reels');
            if (!reelsContainer) return;
            reelsContainer.innerHTML = '';

            const cols = getGridCols(game);
            const rows = getGridRows(game);
            const winType = getWinType(game);

            // Set CSS grid data attributes for styling
            reelsContainer.setAttribute('data-cols', cols);
            reelsContainer.setAttribute('data-rows', rows);
            reelsContainer.setAttribute('data-wintype', winType);

            for (let c = 0; c < cols; c++) {
                const reelCol = document.createElement('div');
                reelCol.className = 'reel-column';
                reelCol.id = `reelCol${c}`;

                for (let r = 0; r < rows; r++) {
                    const cell = document.createElement('div');
                    cell.className = 'reel-cell';
                    cell.id = `reel_${c}_${r}`;
                    cell.setAttribute('data-col', c);
                    cell.setAttribute('data-row', r);
                    reelCol.appendChild(cell);
                }

                reelsContainer.appendChild(reelCol);
            }
        }

        // Render entire grid to DOM
        function renderGrid(grid, game) {
            if (!grid) return;
            const cols = getGridCols(game);
            const rows = getGridRows(game);
            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows; r++) {
                    const cell = document.getElementById(`reel_${c}_${r}`);
                    if (cell && grid[c] && grid[c][r]) {
                        cell.innerHTML = renderSymbol(grid[c][r]);
                    }
                }
            }
        }

        // Render single cell
        function renderCell(col, row, symbol) {
            const cell = document.getElementById(`reel_${col}_${row}`);
            if (cell) cell.innerHTML = renderSymbol(symbol);
        }

        // Get all reel-cell elements
        function getAllCells() {
            return document.querySelectorAll('.reel-cell');
        }

        // Get all reel-column elements
        function getAllColumns() {
            return document.querySelectorAll('.reel-column');
        }

        // Count all symbols in grid (for scatter detection on multi-row)
        function countSymbolInGrid(grid, symbol) {
            let count = 0;
            for (const col of grid) {
                for (const s of col) {
                    if (s === symbol) count++;
                }
            }
            return count;
        }

        // Count wilds in grid
        function countWildsInGrid(grid, game) {
            if (!game || !game.wildSymbol) return 0;
            return countSymbolInGrid(grid, game.wildSymbol);
        }

        // ═══ Payline Definitions ═══
        // Standard paylines for different grid configs
        // Each payline is an array of row indices, one per column
        function getPaylines(game) {
            const cols = getGridCols(game);
            const rows = getGridRows(game);

            if (rows === 1) {
                // Classic 1-row: just the single row
                return [[0, 0, 0]];
            }

            if (rows === 3 && cols === 3) {
                // Classic 3×3 (Fire Joker style): horizontal + diagonal + V shapes
                return [
                    [0, 0, 0], // top
                    [1, 1, 1], // middle
                    [2, 2, 2], // bottom
                    [0, 1, 2], // diagonal down
                    [2, 1, 0], // diagonal up
                ];
            }

            if (rows === 3 && cols === 5) {
                // Standard 5×3 (20 paylines — Book of Dead / Wolf Gold / Starburst / Big Bass / Gonzo's)
                return [
                    [1, 1, 1, 1, 1], // middle
                    [0, 0, 0, 0, 0], // top
                    [2, 2, 2, 2, 2], // bottom
                    [0, 1, 2, 1, 0], // V shape
                    [2, 1, 0, 1, 2], // inverted V
                    [0, 0, 1, 0, 0], // slight dip
                    [2, 2, 1, 2, 2], // slight rise
                    [1, 0, 0, 0, 1], // U shape
                    [1, 2, 2, 2, 1], // inverted U
                    [0, 1, 1, 1, 0], // flat top dip
                    [2, 1, 1, 1, 2], // flat bottom rise
                    [1, 0, 1, 0, 1], // zigzag high
                    [1, 2, 1, 2, 1], // zigzag low
                    [0, 1, 0, 1, 0], // wave high
                    [2, 1, 2, 1, 2], // wave low
                    [1, 1, 0, 1, 1], // center dip
                    [1, 1, 2, 1, 1], // center bump
                    [0, 0, 1, 2, 2], // descending stair
                    [2, 2, 1, 0, 0], // ascending stair
                    [0, 2, 0, 2, 0], // zigzag extreme
                ];
            }

            if (rows === 4 && cols === 5) {
                // 5×4 (Black Bull style — 40 paylines)
                return [
                    [1, 1, 1, 1, 1], [2, 2, 2, 2, 2], [0, 0, 0, 0, 0], [3, 3, 3, 3, 3],
                    [0, 1, 2, 1, 0], [3, 2, 1, 2, 3], [1, 0, 0, 0, 1], [2, 3, 3, 3, 2],
                    [0, 0, 1, 2, 2], [3, 3, 2, 1, 1], [1, 2, 3, 2, 1], [2, 1, 0, 1, 2],
                    [0, 1, 1, 1, 0], [3, 2, 2, 2, 3], [1, 0, 1, 0, 1], [2, 3, 2, 3, 2],
                    [0, 2, 0, 2, 0], [3, 1, 3, 1, 3], [1, 1, 0, 1, 1], [2, 2, 3, 2, 2],
                    [0, 0, 2, 0, 0], [3, 3, 1, 3, 3], [1, 2, 1, 2, 1], [2, 1, 2, 1, 2],
                    [0, 1, 0, 1, 0], [3, 2, 3, 2, 3], [0, 0, 0, 1, 2], [3, 3, 3, 2, 1],
                    [1, 1, 2, 3, 3], [2, 2, 1, 0, 0], [0, 1, 2, 3, 3], [3, 2, 1, 0, 0],
                    [1, 0, 0, 1, 2], [2, 3, 3, 2, 1], [0, 2, 1, 2, 0], [3, 1, 2, 1, 3],
                    [1, 0, 2, 0, 1], [2, 3, 1, 3, 2], [0, 3, 0, 3, 0], [1, 2, 0, 2, 1],
                ];
            }

            // Fallback: generate basic paylines
            const lines = [];
            for (let r = 0; r < rows; r++) {
                lines.push(Array(cols).fill(r));
            }
            return lines;
        }

        // ═══ Cluster Pay Detection ═══
        // Flood-fill to find connected clusters of matching symbols
        function findClusters(grid, game) {
            const cols = grid.length;
            const rows = grid[0].length;
            const visited = createEmptyGrid(cols, rows);
            const clusters = [];

            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows; r++) {
                    if (visited[c][r]) continue;
                    const symbol = grid[c][r];
                    if (!symbol) continue;

                    // BFS to find cluster
                    const cluster = [];
                    const queue = [[c, r]];
                    visited[c][r] = true;

                    while (queue.length > 0) {
                        const [cc, cr] = queue.shift();
                        cluster.push([cc, cr]);

                        // Check 4-directional neighbors
                        const neighbors = [[cc-1, cr], [cc+1, cr], [cc, cr-1], [cc, cr+1]];
                        for (const [nc, nr] of neighbors) {
                            if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
                            if (visited[nc][nr]) continue;
                            const nSym = grid[nc][nr];
                            if (nSym === symbol || isWild(nSym, game) || isWild(symbol, game)) {
                                visited[nc][nr] = true;
                                queue.push([nc, nr]);
                            }
                        }
                    }

                    if (cluster.length >= (game.clusterMin || 5)) {
                        clusters.push({ symbol, cells: cluster, size: cluster.length });
                    }
                }
            }

            return clusters;
        }

        // ═══ Payline Win Detection ═══
        function checkPaylineWins(grid, game) {
            const paylines = getPaylines(game);
            const cols = getGridCols(game);
            const wins = [];

            for (let lineIdx = 0; lineIdx < paylines.length; lineIdx++) {
                const line = paylines[lineIdx];
                // Get symbols on this payline
                const lineSymbols = [];
                for (let c = 0; c < Math.min(cols, line.length); c++) {
                    lineSymbols.push(grid[c][line[c]]);
                }

                // Check for left-to-right consecutive matches
                const firstSym = lineSymbols[0];
                let matchCount = 1;
                let effectiveSym = isWild(firstSym, game) ? null : firstSym;

                for (let i = 1; i < lineSymbols.length; i++) {
                    const s = lineSymbols[i];
                    if (isWild(s, game)) {
                        matchCount++;
                    } else if (effectiveSym === null) {
                        effectiveSym = s;
                        matchCount++;
                    } else if (s === effectiveSym) {
                        matchCount++;
                    } else {
                        break;
                    }
                }

                if (matchCount >= 3) {
                    wins.push({
                        lineIndex: lineIdx,
                        line,
                        matchCount,
                        symbol: effectiveSym || firstSym,
                        cells: line.slice(0, matchCount).map((row, col) => [col, row])
                    });
                }
            }

            return wins;
        }

        function createDefaultStats() {
            return {
                totalSpins: DEFAULT_STATS.totalSpins,
                totalWagered: DEFAULT_STATS.totalWagered,
                totalWon: DEFAULT_STATS.totalWon,
                biggestWin: DEFAULT_STATS.biggestWin,
                gamesPlayed: {},
                achievements: []
            };
        }

        const ACHIEVEMENTS = [
            { id: 'first_spin', name: 'First Spin', desc: 'Make your first spin', icon: '\u{1F3B0}', requirement: (stats) => stats.totalSpins >= 1 },
            { id: 'big_spender', name: 'Big Spender', desc: 'Wager $10,000 total', icon: '\u{1F4B0}', requirement: (stats) => stats.totalWagered >= 10000 },
            { id: 'lucky_7', name: 'Lucky 7', desc: 'Win 7 times', icon: '\u{1F340}', requirement: (stats) => stats.totalWon > stats.totalWagered && Object.values(stats.gamesPlayed).reduce((a,b) => a+b, 0) >= 7 },
            { id: 'high_roller', name: 'High Roller', desc: 'Win $5,000 in one spin', icon: '\u{1F451}', requirement: (stats) => stats.biggestWin >= 5000 },
            { id: 'slot_master', name: 'Slot Master', desc: 'Play 100 spins', icon: '\u2B50', requirement: (stats) => stats.totalSpins >= 100 },
            { id: 'millionaire', name: 'Millionaire', desc: 'Win $50,000 total', icon: '\u{1F48E}', requirement: (stats) => stats.totalWon >= 50000 },
            { id: 'game_explorer', name: 'Game Explorer', desc: 'Play 10 different games', icon: '\u{1F5FA}\uFE0F', requirement: (stats) => Object.keys(stats.gamesPlayed || {}).length >= 10 },
            { id: 'jackpot_hunter', name: 'Jackpot Hunter', desc: 'Win $25,000 in one spin', icon: '\u{1F3AF}', requirement: (stats) => stats.biggestWin >= 25000 }
        ];

        let currentFilter = 'all';
        let balance = DEFAULT_BALANCE;
        let currentGame = null;
        let spinning = false;
        let currentBet = 50;
        let currentReels = ['diamond', 'diamond', 'diamond'];
        // 2D grid: currentGrid[col][row] — outer array = columns (reels), inner = rows
        let currentGrid = null;
        let lastMessage = { type: 'info', text: '' };
        let stats = createDefaultStats();
        let soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        let deterministicSeed = null;
        let deterministicRng = null;
        let forcedSpinQueue = [];
        let qaToolsOpen = false;

        // ═══ Free Spins / Bonus State ═══
        let freeSpinsActive = false;
        let freeSpinsRemaining = 0;
        let freeSpinsTotalWin = 0;
        let freeSpinsMultiplier = 1;
        let freeSpinsCascadeLevel = 0;
        let freeSpinsExpandedSymbol = null; // For Book of Dead expanding symbol
        let expandingWildRespinsLeft = 0;   // For Starburst expanding wild respin
        let respinCount = 0;                // For Hot Chillies respin feature
        let lockedReels = [false, false, false]; // Which reels are locked during respin

        function formatMoney(amount) {
            return Number(amount || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }

        function parseStoredNumber(value, fallback) {
            const parsed = Number.parseFloat(value);
            return Number.isFinite(parsed) ? parsed : fallback;
        }

        function hashSeed(seedValue) {
            const seedText = String(seedValue ?? '').trim();
            let hash = 2166136261;
            for (let i = 0; i < seedText.length; i++) {
                hash ^= seedText.charCodeAt(i);
                hash = Math.imul(hash, 16777619);
            }
            return hash >>> 0;
        }

        function createSeededRandom(seedValue) {
            let state = hashSeed(seedValue) || 0x9e3779b9;
            return () => {
                state = (state + 0x6d2b79f5) >>> 0;
                let t = state;
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        }

        function setDeterministicSeed(seedValue) {
            if (seedValue === null || seedValue === undefined || String(seedValue).trim() === '') {
                deterministicSeed = null;
                deterministicRng = null;
                return false;
            }

            deterministicSeed = String(seedValue);
            deterministicRng = createSeededRandom(deterministicSeed);
            return true;
        }

        function getRandomNumber() {
            return deterministicRng ? deterministicRng() : Math.random();
        }

        function normalizeSymbol(symbol) {
            const normalized = String(symbol ?? '').trim().toLowerCase();
            // Check game-specific symbols first
            const gameSyms = getGameSymbols(currentGame);
            if (gameSyms.includes(normalized)) return normalized;
            // Fallback to legacy global symbols
            if (SLOT_SYMBOLS.includes(normalized)) return normalized;
            return null;
        }

        function normalizeOutcomeSymbols(input) {
            const parts = Array.isArray(input)
                ? input
                : String(input ?? '')
                    .split(',')
                    .map((part) => part.trim())
                    .filter(Boolean);

            if (parts.length !== 3) return null;
            const normalized = parts.map(normalizeSymbol);
            return normalized.every(Boolean) ? normalized : null;
        }

        function pickDifferentSymbol(excludedSymbols) {
            const excludedSet = new Set((excludedSymbols || []).filter(Boolean));
            const syms = getGameSymbols(currentGame);
            const available = syms.filter((symbol) => !excludedSet.has(symbol));
            if (available.length === 0) return syms[0];
            return available[Math.floor(getRandomNumber() * available.length)];
        }

        function buildForcedOutcome(type, preferredSymbol) {
            const mode = String(type ?? '').trim().toLowerCase();
            const gameSyms = getGameSymbols(currentGame);
            const anchor = normalizeSymbol(preferredSymbol) || gameSyms[0] || getRandomSymbol();

            if (mode === 'triple' || mode === 'jackpot' || mode === 'win3') {
                return [anchor, anchor, anchor];
            }
            if (mode === 'double' || mode === 'win2') {
                return [anchor, anchor, pickDifferentSymbol([anchor])];
            }
            if (mode === 'lose' || mode === 'loss' || mode === 'miss') {
                const second = pickDifferentSymbol([anchor]);
                const third = pickDifferentSymbol([anchor, second]);
                return [anchor, second, third];
            }
            return null;
        }

        function queueForcedSpin(symbolsInput) {
            const outcome = normalizeOutcomeSymbols(symbolsInput);
            if (!outcome) return null;
            forcedSpinQueue.push(outcome);
            return outcome;
        }

        function queueForcedOutcome(type, preferredSymbol) {
            const outcome = buildForcedOutcome(type, preferredSymbol);
            if (!outcome) return null;
            forcedSpinQueue.push(outcome);
            return outcome;
        }

        function consumeSpinResult() {
            // Use grid-aware generation
            return generateSpinResult(currentGame);
        }

        function applyUrlDebugConfig() {
            const params = new URLSearchParams(window.location.search);

            const seedParam = params.get('spinSeed');
            if (seedParam) {
                setDeterministicSeed(seedParam);
            }

            const forceSpinParam = params.get('forceSpin');
            if (forceSpinParam) {
                queueForcedSpin(forceSpinParam);
            }

            const forceOutcomeParam = params.get('forceOutcome');
            if (forceOutcomeParam) {
                queueForcedOutcome(forceOutcomeParam, params.get('forceSymbol'));
            }

            const qaToolsParam = params.get('qaTools');
            if (qaToolsParam === '1' || qaToolsParam === 'true') {
                setQaToolsExpanded(true);
            }

            const qaResetClearSeedParam = params.get('qaResetClearSeed');
            if (qaResetClearSeedParam === '1' || qaResetClearSeedParam === 'true') {
                const clearSeedToggle = getQaNode('qaResetClearSeed');
                if (clearSeedToggle) {
                    clearSeedToggle.checked = true;
                }
            }

            const openSlotId = params.get('openSlot');
            const openTarget = games.find((game) => game.id === openSlotId);
            if (openTarget) {
                openSlot(openTarget.id);
            }

            const autoSpinValue = params.get('autoSpin');
            if ((autoSpinValue === '1' || autoSpinValue === 'true') && openTarget) {
                const delayParam = Number.parseInt(params.get('autoSpinDelay') || '700', 10);
                const delay = Number.isFinite(delayParam) ? Math.max(0, delayParam) : 700;
                setTimeout(() => {
                    if (currentGame && !spinning) {
                        spin();
                    }
                }, delay);
            }

            refreshQaStateDisplay();
        }

        function getDebugState() {
            return {
                deterministicMode: Boolean(deterministicRng),
                deterministicSeed,
                queuedForcedSpins: forcedSpinQueue.map((symbols) => [...symbols]),
                availableSymbols: [...SLOT_SYMBOLS]
            };
        }

        function getQaNode(id) {
            return document.getElementById(id);
        }

        function setQaStatus(text, type = 'info') {
            const statusEl = getQaNode('qaStatusLine');
            if (!statusEl) return;

            statusEl.textContent = text || '';
            statusEl.className = 'qa-status';

            if (type === 'good') {
                statusEl.classList.add('qa-status-good');
            } else if (type === 'warn') {
                statusEl.classList.add('qa-status-warn');
            } else if (type === 'error') {
                statusEl.classList.add('qa-status-error');
            }
        }

        function setQaToolsExpanded(expanded) {
            qaToolsOpen = Boolean(expanded);
            const bodyEl = getQaNode('qaToolsBody');
            const toggleBtn = getQaNode('qaToggleBtn');

            if (bodyEl) {
                bodyEl.classList.toggle('active', qaToolsOpen);
            }
            if (toggleBtn) {
                toggleBtn.textContent = qaToolsOpen ? 'Hide' : 'Show';
            }
        }

        function refreshQaStateDisplay() {
            const lineEl = getQaNode('qaStateLine');
            if (!lineEl) return;
            const state = getDebugState();
            const seedLabel = state.deterministicMode ? `seed=${state.deterministicSeed}` : 'seed=off';
            lineEl.textContent = `${seedLabel} | queued=${state.queuedForcedSpins.length}`;
        }

        function resetSessionState(options = {}) {
            if (spinning) return false;

            const config = {
                clearDeterministic: false,
                clearQueue: true,
                ...options
            };

            balance = DEFAULT_BALANCE;
            stats = createDefaultStats();
            lastMessage = { type: 'info', text: '' };

            // Clear free spins state
            freeSpinsActive = false;
            freeSpinsRemaining = 0;
            freeSpinsTotalWin = 0;
            freeSpinsMultiplier = 1;
            freeSpinsCascadeLevel = 0;
            freeSpinsExpandedSymbol = null;
            expandingWildRespinsLeft = 0;
            respinCount = 0;
            hideFreeSpinsDisplay();

            if (config.clearQueue) {
                forcedSpinQueue = [];
            }
            if (config.clearDeterministic) {
                setDeterministicSeed(null);
            }

            saveBalance();
            saveStats();
            updateBalance();
            updateStatsSummary();
            renderGames();

            if (currentGame) {
                currentBet = currentGame.minBet;
                // Rebuild grid with initial symbols
                const cols = getGridCols(currentGame);
                const rows = getGridRows(currentGame);
                const syms = currentGame.symbols || SLOT_SYMBOLS;
                const initGrid = createEmptyGrid(cols, rows);
                for (let c = 0; c < cols; c++) {
                    for (let r = 0; r < rows; r++) {
                        initGrid[c][r] = syms[(c * rows + r) % syms.length];
                    }
                }
                currentGrid = initGrid;
                currentReels = flattenGrid(initGrid);
                renderGrid(initGrid, currentGame);
                refreshBetControls();
            }

            const msgDiv = document.getElementById('messageDisplay');
            if (msgDiv) {
                msgDiv.innerHTML = '';
            }

            const winDiv = document.getElementById('winAnimation');
            if (winDiv) {
                winDiv.innerHTML = '';
            }

            refreshQaStateDisplay();
            return true;
        }

        function refreshQaSymbolList() {
            const symbolSelect = getQaNode('qaOutcomeSymbol');
            if (!symbolSelect) return;
            // Keep first option (placeholder), remove the rest
            while (symbolSelect.options.length > 1) symbolSelect.remove(1);
            const syms = getGameSymbols(currentGame);
            syms.forEach((symbol) => {
                const option = document.createElement('option');
                option.value = symbol;
                option.textContent = symbol;
                symbolSelect.appendChild(option);
            });
        }

        function initQaTools() {
            refreshQaSymbolList();

            const seedInput = getQaNode('qaSeedInput');
            if (seedInput && deterministicSeed) {
                seedInput.value = deterministicSeed;
            }

            setQaToolsExpanded(false);
            refreshQaStateDisplay();
            setQaStatus('');
        }

        function toggleQaTools() {
            setQaToolsExpanded(!qaToolsOpen);
        }

        function applyQaSeed() {
            const seedInput = getQaNode('qaSeedInput');
            if (!seedInput) return;

            const seed = seedInput.value.trim();
            if (!setDeterministicSeed(seed)) {
                setQaStatus('Enter a seed before applying.', 'warn');
                return;
            }

            refreshQaStateDisplay();
            setQaStatus(`Seed applied: ${seed}`, 'good');
        }

        function clearQaSeed() {
            const seedInput = getQaNode('qaSeedInput');
            if (seedInput) {
                seedInput.value = '';
            }
            setDeterministicSeed(null);
            refreshQaStateDisplay();
            setQaStatus('Deterministic seed cleared.', 'good');
        }

        function queueQaOutcome(autoplay) {
            const outcomeSelect = getQaNode('qaOutcomeType');
            const symbolSelect = getQaNode('qaOutcomeSymbol');
            if (!outcomeSelect || !symbolSelect) return;

            const queued = autoplay
                ? queueAndSpin(outcomeSelect.value, symbolSelect.value || undefined)
                : queueForcedOutcome(outcomeSelect.value, symbolSelect.value || undefined);

            if (!queued) {
                setQaStatus('Failed to queue outcome.', 'error');
                return;
            }

            refreshQaStateDisplay();
            setQaStatus(`Queued outcome: ${queued.join(', ')}`, 'good');
        }

        function queueQaExactReels(autoplay) {
            const reelsInput = getQaNode('qaExactReels');
            if (!reelsInput) return;

            const raw = reelsInput.value.trim();
            const queued = autoplay
                ? queueAndSpin(raw)
                : queueForcedSpin(raw);

            if (!queued) {
                setQaStatus('Use exactly three valid symbols, comma-separated.', 'warn');
                return;
            }

            refreshQaStateDisplay();
            setQaStatus(`Queued reels: ${queued.join(', ')}`, 'good');
        }

        function clearQaQueue() {
            forcedSpinQueue = [];
            refreshQaStateDisplay();
            setQaStatus('Forced reel queue cleared.', 'good');
        }

        function resetQaSession() {
            const clearSeedToggle = getQaNode('qaResetClearSeed');
            const clearDeterministic = Boolean(clearSeedToggle?.checked);
            const didReset = resetSessionState({ clearDeterministic, clearQueue: true });
            if (!didReset) {
                setQaStatus('Wait for spin to finish before reset.', 'warn');
                return;
            }
            setQaStatus(
                clearDeterministic
                    ? 'Balance/stats reset. Deterministic seed cleared.'
                    : 'Balance and stats reset to defaults.',
                'good'
            );
        }

        function queueAndSpin(symbolsOrMode, preferredSymbol) {
            if (Array.isArray(symbolsOrMode) || String(symbolsOrMode ?? '').includes(',')) {
                const queued = queueForcedSpin(symbolsOrMode);
                if (!queued) return null;
                if (!spinning && currentGame) spin();
                return queued;
            }

            const queued = queueForcedOutcome(symbolsOrMode, preferredSymbol);
            if (!queued) return null;
            if (!spinning && currentGame) spin();
            return queued;
        }

        // Initialize (base — called by initAllSystems)
        function initBase() {
            loadState();
            renderGames();
            updateBalance();
            updateStatsSummary();
            wireGameHooks();
            updateSoundButton();
            initQaTools();
            applyUrlDebugConfig();
            startJackpotTicker();
        }

        function loadState() {
            const savedBalance = localStorage.getItem('casinoBalance');
            if (savedBalance !== null) balance = parseFloat(savedBalance);

            const savedStats = localStorage.getItem('casinoStats');
            if (savedStats) {
                try {
                    const parsed = JSON.parse(savedStats);
                    stats = { ...createDefaultStats(), ...parsed };
                } catch (e) {
                    stats = createDefaultStats();
                }
            } else {
                stats = createDefaultStats();
            }

        }

        function saveBalance() {
            localStorage.setItem('casinoBalance', balance.toString());
        }

        function saveStats() {
            localStorage.setItem('casinoStats', JSON.stringify(stats));
        }

        function updateStatsSummary() {
            const biggestWinEl = document.getElementById('biggestWin');
            if (biggestWinEl) {
                biggestWinEl.textContent = Math.round(stats.biggestWin).toLocaleString();
            }
            updateStatsModal();
        }

        function updateStatsModal() {
            const totalSpinsEl = document.getElementById('statsTotalSpins');
            if (!totalSpinsEl) return;

            const totalWageredEl = document.getElementById('statsTotalWagered');
            const totalWonEl = document.getElementById('statsTotalWon');
            const biggestWinEl = document.getElementById('statsBiggestWin');
            const netEl = document.getElementById('statsNet');
            const gamesListEl = document.getElementById('statsGamesList');
            const net = stats.totalWon - stats.totalWagered;

            totalSpinsEl.textContent = Math.round(stats.totalSpins).toLocaleString();
            totalWageredEl.textContent = `$${formatMoney(stats.totalWagered)}`;
            totalWonEl.textContent = `$${formatMoney(stats.totalWon)}`;
            biggestWinEl.textContent = `$${formatMoney(stats.biggestWin)}`;
            netEl.textContent = `${net >= 0 ? '+' : '-'}$${formatMoney(Math.abs(net))}`;
            netEl.style.color = net >= 0 ? '#34d399' : '#fca5a5';

            const playedGames = Object.entries(stats.gamesPlayed || {})
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8);

            if (playedGames.length === 0) {
                gamesListEl.innerHTML = '<li class="stats-empty">No games played yet.</li>';
            } else {
                gamesListEl.innerHTML = playedGames
                    .map(([gameId, plays]) => {
                        const game = games.find((item) => item.id === gameId);
                        const gameName = game ? game.name : gameId;
                        return `<li><span>${gameName}</span><strong>${plays} ${plays === 1 ? 'play' : 'plays'}</strong></li>`;
                    })
                    .join('');
            }

            // Update achievements
            updateAchievements();
        }

        function updateAchievements() {
            const achievementsListEl = document.getElementById('achievementsList');
            if (!achievementsListEl) return;

            if (!stats.achievements) {
                stats.achievements = [];
            }

            const html = ACHIEVEMENTS.map(achievement => {
                const isUnlocked = stats.achievements.includes(achievement.id);
                const canUnlock = !isUnlocked && achievement.requirement(stats);

                if (canUnlock) {
                    stats.achievements.push(achievement.id);
                    saveStats();
                    showAchievementNotification(achievement);
                }

                const unlocked = stats.achievements.includes(achievement.id);

                return `
                    <div style="
                        background: ${unlocked ? 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.2))' : 'rgba(15, 23, 42, 0.8)'};
                        border: 2px solid ${unlocked ? '#fbbf24' : '#475569'};
                        border-radius: 12px;
                        padding: 12px;
                        text-align: center;
                        opacity: ${unlocked ? '1' : '0.5'};
                        transition: all 0.3s;
                    ">
                        <div style="font-size: 32px; margin-bottom: 6px;">${achievement.icon}</div>
                        <div style="font-size: 11px; font-weight: 700; color: ${unlocked ? '#fbbf24' : '#94a3b8'}; margin-bottom: 4px;">${achievement.name}</div>
                        <div style="font-size: 9px; color: #64748b;">${achievement.desc}</div>
                        ${unlocked ? '<div style="font-size: 10px; color: #10b981; margin-top: 4px; font-weight: 700;">\u2705 UNLOCKED</div>' : ''}
                    </div>
                `;
            }).join('');

            achievementsListEl.innerHTML = html;
        }

        function showAchievementNotification(achievement) {
            playSound('bigwin');

            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 100px;
                right: 20px;
                background: linear-gradient(135deg, #fbbf24, #f59e0b);
                color: #000;
                padding: 20px;
                border-radius: 16px;
                box-shadow: 0 8px 32px rgba(251,191,36,0.6);
                z-index: 10001;
                font-weight: 900;
                animation: slideInRight 0.5s ease-out;
                max-width: 300px;
            `;
            notification.innerHTML = `
                <div style="font-size: 48px; text-align: center; margin-bottom: 8px;">${achievement.icon}</div>
                <div style="font-size: 14px; margin-bottom: 4px;">\u{1F3C6} ACHIEVEMENT UNLOCKED!</div>
                <div style="font-size: 18px; margin-bottom: 4px;">${achievement.name}</div>
                <div style="font-size: 12px; opacity: 0.8;">${achievement.desc}</div>
            `;

            document.body.appendChild(notification);

            createConfetti();

            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.5s ease-out';
                setTimeout(() => notification.remove(), 500);
            }, 4000);
        }

        function openStatsModal() {
            updateStatsModal();
            refreshQaStateDisplay();
            document.getElementById('statsModal').classList.add('active');
        }

        function closeStatsModal() {
            document.getElementById('statsModal').classList.remove('active');
        }

        function updateBalance() {
            document.getElementById('balance').textContent = formatMoney(balance);
            const slotBal = document.getElementById('slotBalance');
            if (slotBal) slotBal.textContent = formatMoney(balance);
            refreshBetControls();
        }

        function getBetBounds() {
            if (!currentGame) return null;
            const minBet = currentGame.minBet;
            const cappedMax = Math.min(currentGame.maxBet, balance);
            const snappedMax = Math.floor(cappedMax / minBet) * minBet;
            const maxBet = Math.max(minBet, snappedMax || 0);
            return { minBet, maxBet };
        }

        function refreshBetControls() {
            if (!currentGame) return;

            const betRange = document.getElementById('betRange');
            const bounds = getBetBounds();
            if (!betRange || !bounds) return;

            betRange.min = bounds.minBet;
            betRange.max = bounds.maxBet;
            betRange.step = currentGame.minBet;

            if (currentBet < bounds.minBet) currentBet = bounds.minBet;
            if (currentBet > bounds.maxBet) currentBet = bounds.maxBet;

            betRange.value = currentBet;
            document.getElementById('minBet').textContent = currentGame.minBet;
            document.getElementById('maxBet').textContent = currentGame.maxBet;
            updateBetDisplay();

            const spinBtn = document.getElementById('spinBtn');
            if (spinBtn) {
                spinBtn.disabled = spinning || currentBet > balance;
            }
        }

        function addFunds() {
            document.getElementById('depositModal').classList.add('active');
        }

        async function confirmDeposit(amount) {
            balance += amount;
            updateBalance();
            saveBalance();
            closeDepositModal();
            showToast(`$${amount.toLocaleString()} deposited!`, 'success');
            playSound('win');
        }

        function closeDepositModal() {
            document.getElementById('depositModal').classList.remove('active');
        }

        function renderGames() {
            const hotGames = games.filter(g => g.hot);
            const hotGamesDiv = document.getElementById('hotGames');
            hotGamesDiv.innerHTML = hotGames.map(g => createGameCard(g)).join('');
            renderFilteredGames();
            renderRecentlyPlayed();
        }

        // ===== Recently Played =====
        const RECENTLY_PLAYED_KEY = 'casinoRecentlyPlayed';
        const MAX_RECENTLY_PLAYED = 10;

        function addRecentlyPlayed(gameId) {
            let recent = [];
            try { recent = JSON.parse(localStorage.getItem(RECENTLY_PLAYED_KEY)) || []; } catch(e) {}
            recent = recent.filter(id => id !== gameId);
            recent.unshift(gameId);
            if (recent.length > MAX_RECENTLY_PLAYED) recent = recent.slice(0, MAX_RECENTLY_PLAYED);
            localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(recent));
            renderRecentlyPlayed();
        }

        function renderRecentlyPlayed() {
            let recent = [];
            try { recent = JSON.parse(localStorage.getItem(RECENTLY_PLAYED_KEY)) || []; } catch(e) {}
            const section = document.getElementById('recentlyPlayedSection');
            const container = document.getElementById('recentlyPlayedGames');
            if (!section || !container) return;
            if (recent.length === 0) { section.style.display = 'none'; return; }
            const recentGames = recent.map(id => games.find(g => g.id === id)).filter(Boolean);
            section.style.display = '';
            container.innerHTML = recentGames.map(g => createGameCard(g)).join('');
        }

        // ===== Jackpot Ticker =====
        let jackpotValue = 1247836 + Math.floor(Math.random() * 50000);

        function startJackpotTicker() {
            const el = document.getElementById('jackpotAmount');
            if (!el) return;
            setInterval(() => {
                jackpotValue += Math.floor(Math.random() * 47 + 3);
                el.textContent = jackpotValue.toLocaleString();
            }, 800);
        }

        function createGameCard(game) {
            const thumbStyle = game.thumbnail
                ? `background-image: url('${game.thumbnail}'); background-size: cover; background-position: center;`
                : `background: ${game.bgGradient};`;
            const isJackpot = game.tag === 'JACKPOT' || game.tagClass === 'tag-jackpot';
            // Non-jackpot tags go top-right; jackpot gets its own bottom badge
            const topTag = (!isJackpot && game.tag)
                ? `<div class="game-tag ${game.tagClass}">${game.tag}</div>`
                : '';
            const jackpotBadge = isJackpot
                ? `<div class="game-jackpot-badge"><svg viewBox="0 0 12 12" fill="currentColor" width="9" height="9" style="margin-right:3px"><path d="M6 1l1 2.5h2.5l-2 1.5.8 2.5L6 6.2l-2.3 1.3.8-2.5-2-1.5H5z"/></svg>JACKPOT</div>`
                : '';
            return `
                <div class="game-card" onclick="openSlot('${game.id}')">
                    <div class="game-thumbnail" style="${thumbStyle}">
                        ${!game.thumbnail && game.asset ? (assetTemplates[game.asset] || '') : ''}
                        ${topTag}
                        ${jackpotBadge}
                        <div class="game-hover-overlay">
                            <svg class="game-play-svg" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="23" fill="rgba(23,145,99,0.9)" stroke="rgba(86,210,160,0.6)" stroke-width="2"/><polygon points="19,14 19,34 35,24" fill="#fff"/></svg>
                        </div>
                    </div>
                    <div class="game-info">
                        <div class="game-name">${game.name}</div>
                        <div class="game-provider">${game.provider || ''}</div>
                    </div>
                </div>
            `;
        }

        function playRandomHotGame() {
            const hotGames = games.filter(g => g.hot);
            const pick = hotGames[Math.floor(Math.random() * hotGames.length)];
            openSlot(pick.id);
        }

        function openSlot(gameId) {
            currentGame = games.find(g => g.id === gameId);
            if (!currentGame) return;

            addRecentlyPlayed(gameId);

            showPageTransition(() => {
                closeStatsModal();
                document.getElementById('slotGameName').textContent = currentGame.name;
                document.getElementById('slotProvider').textContent = currentGame.provider || '';
                document.getElementById('slotMaxPayout').textContent = currentGame.payouts.triple;

            const tagEl = document.getElementById('slotGameTag');
            if (currentGame.tag) {
                tagEl.textContent = currentGame.tag;
                tagEl.className = `game-tag ${currentGame.tagClass}`;
                tagEl.style.display = 'inline-block';
            } else {
                tagEl.style.display = 'none';
            }

            currentBet = currentGame.minBet;
            refreshBetControls();

            // Apply game-specific theming
            const reelsContainer = document.querySelector('.reels-container');
            if (reelsContainer && currentGame.reelBg) {
                reelsContainer.style.background = currentGame.reelBg;
            }
            // Build dynamic reel grid
            buildReelGrid(currentGame);

            // Apply accent color to reel borders and top bar accent
            const accent = currentGame.accentColor || '#fbbf24';
            // Use game-specific cell bg, or derive a dark tint from reelBg color
            const cellBg = currentGame.cellBg || currentGame.reelBg || 'linear-gradient(180deg, rgba(20,12,22,0.95) 0%, rgba(10,6,12,0.98) 100%)';
            getAllCells().forEach(cell => {
                cell.style.borderColor = accent;
                cell.style.background = cellBg;
            });
            const topBar = document.querySelector('.slot-top-bar');
            if (topBar) {
                topBar.style.borderBottomColor = accent + '44';
            }
            const bottomBar = document.querySelector('.slot-bottom-bar');
            if (bottomBar) {
                bottomBar.style.borderTopColor = accent + '44';
            }
            // Set game bg gradient on reel area
            const reelArea = document.querySelector('.slot-reel-area');
            if (reelArea && currentGame.bgGradient) {
                reelArea.style.background = currentGame.bgGradient;
            }
            // Update slot bottom bar balance
            const slotBal = document.getElementById('slotBalance');
            if (slotBal) slotBal.textContent = formatMoney(balance);
            // Reset win display
            updateSlotWinDisplay(0);

            // Set initial grid with game's symbols
            const cols = getGridCols(currentGame);
            const rows = getGridRows(currentGame);
            const syms = currentGame.symbols || SLOT_SYMBOLS;
            const initGrid = createEmptyGrid(cols, rows);
            for (let c = 0; c < cols; c++) {
                for (let r = 0; r < rows; r++) {
                    initGrid[c][r] = syms[(c * rows + r) % syms.length];
                }
            }
            currentGrid = initGrid;
            currentReels = flattenGrid(initGrid);
            renderGrid(initGrid, currentGame);

            // Show bonus feature info
            const bonusInfoEl = document.getElementById('slotBonusInfo');
            if (bonusInfoEl && currentGame.bonusDesc) {
                bonusInfoEl.textContent = currentGame.bonusDesc;
                bonusInfoEl.style.display = 'block';
                bonusInfoEl.style.color = currentGame.accentColor || '#fbbf24';
            } else if (bonusInfoEl) {
                bonusInfoEl.style.display = 'none';
            }

            // Clean up old free spins UI
            hideFreeSpinsDisplay();
            freeSpinsActive = false;
            freeSpinsRemaining = 0;

                document.getElementById('slotModal').classList.add('active');
                document.getElementById('messageDisplay').innerHTML = '';
                document.getElementById('winAnimation').innerHTML = '';
                updateSlotWinDisplay(0);
                refreshQaSymbolList();
                lastMessage = { type: 'info', text: '' };
            });
        }

        function closeSlot() {
            if (spinning) {
                showMessage('Wait for the current spin to finish.', 'lose');
                return;
            }
            if (freeSpinsActive) {
                showMessage('Free spins in progress! Wait for them to finish.', 'lose');
                return;
            }
            // Stop auto-spin if active
            if (autoSpinActive) stopAutoSpin();
            document.getElementById('slotModal').classList.remove('active');
            currentGame = null;
            // Clean up free spins UI
            hideFreeSpinsDisplay();
            freeSpinsActive = false;
            freeSpinsRemaining = 0;
        }

        function updateBetDisplay() {
            document.getElementById('betAmount').textContent = currentBet;
        }

        document.getElementById('betRange').addEventListener('input', (e) => {
            currentBet = parseInt(e.target.value, 10);
            updateBetDisplay();
        });

        function setPresetBet(index) {
            if (!currentGame) return;
            const bounds = getBetBounds();
            if (!bounds) return;

            const midpoint = bounds.minBet + Math.floor((bounds.maxBet - bounds.minBet) / (2 * currentGame.minBet)) * currentGame.minBet;
            const presets = [bounds.minBet, Math.max(bounds.minBet, midpoint), bounds.maxBet];
            currentBet = presets[index] ?? bounds.minBet;
            document.getElementById('betRange').value = currentBet;
            updateBetDisplay();
        }

        // ═══ Pragmatic Play-style bet adjustment (+/- buttons) ═══
        function adjustBet(direction) {
            if (!currentGame || spinning) return;
            const bounds = getBetBounds();
            if (!bounds) return;
            const step = currentGame.minBet;
            const newBet = currentBet + direction * step;
            if (newBet >= bounds.minBet && newBet <= bounds.maxBet) {
                currentBet = newBet;
                document.getElementById('betRange').value = currentBet;
                updateBetDisplay();
            }
        }

        // ═══ Turbo spin mode ═══
        let turboMode = false;
        function toggleTurbo() {
            turboMode = !turboMode;
            const btn = document.getElementById('turboBtn');
            if (btn) {
                btn.classList.toggle('turbo-active', turboMode);
            }
        }

        // ═══ Update slot win display in bottom bar ═══
        function updateSlotWinDisplay(amount) {
            const el = document.getElementById('slotWinDisplay');
            if (!el) return;
            if (amount > 0) {
                el.textContent = '$' + formatMoney(amount);
                el.style.color = '#10b981';
                el.style.textShadow = '0 0 12px rgba(16,185,129,0.6)';
            } else {
                el.textContent = '$0.00';
                el.style.color = '#64748b';
                el.style.textShadow = 'none';
            }
        }

        function renderSymbol(symbol) {
            // If current game has its own symbols, render from game_symbols folder
            if (currentGame && currentGame.symbols && currentGame.symbols.includes(symbol)) {
                return getSymbolHtml(symbol, currentGame.id);
            }
            // Fallback to legacy shared asset templates
            return assetTemplates[symbol] || `<span class="reel-symbol-text">${symbol}</span>`;
        }

        function updateReels(symbolsOrGrid) {
            if (!currentGame) return;
            if (Array.isArray(symbolsOrGrid) && Array.isArray(symbolsOrGrid[0])) {
                // It's a 2D grid
                currentGrid = symbolsOrGrid;
                currentReels = flattenGrid(symbolsOrGrid);
                renderGrid(symbolsOrGrid, currentGame);
            } else {
                // It's a 1D array (backward compat)
                currentReels = [...symbolsOrGrid];
                const grid = gridFrom1D(symbolsOrGrid, currentGame);
                currentGrid = grid;
                renderGrid(grid, currentGame);
            }
        }

        function updateSingleReel(colIndex, symbolOrColArray) {
            if (!currentGame) return;
            const rows = getGridRows(currentGame);
            if (rows > 1 && Array.isArray(symbolOrColArray)) {
                // Multi-row: update entire column
                if (currentGrid) currentGrid[colIndex] = [...symbolOrColArray];
                for (let r = 0; r < symbolOrColArray.length; r++) {
                    renderCell(colIndex, r, symbolOrColArray[r]);
                }
            } else {
                // Classic single-row: update single cell
                const symbol = Array.isArray(symbolOrColArray) ? symbolOrColArray[0] : symbolOrColArray;
                if (currentGrid && currentGrid[colIndex]) currentGrid[colIndex][0] = symbol;
                renderCell(colIndex, 0, symbol);
                currentReels[colIndex] = symbol;
            }
        }

        async function spin() {
            if (spinning || !currentGame) return;
            if (freeSpinsActive) return;
            if (currentBet > balance) {
                showMessage('Insufficient balance. Deposit funds to continue.', 'lose');
                return;
            }

            // Reset per-spin bonus state
            respinCount = 0;
            expandingWildRespinsLeft = 0;

            playSound('spin');
            spinning = true;
            updateSlotWinDisplay(0);

            const spinBtn = document.getElementById('spinBtn');
            spinBtn.disabled = true;
            spinBtn.textContent = '';
            document.getElementById('messageDisplay').innerHTML = '';
            document.getElementById('winAnimation').innerHTML = '';
            lastMessage = { type: 'info', text: '' };

            const spinGame = currentGame;
            const cols = getGridCols(spinGame);

            // Start reel scrolling animation
            const colEls = getAllColumns();
            colEls.forEach(col => {
                col.querySelectorAll('.reel-cell').forEach(cell => {
                    cell.classList.remove('reel-landing', 'reel-win-glow', 'reel-wild-glow', 'reel-scatter-glow');
                    cell.classList.add('reel-scrolling');
                });
            });

            // Rapid random symbol cycling (visual only)
            const spinInterval = setInterval(() => {
                const randomGrid = generateRandomGrid(spinGame);
                renderGrid(randomGrid, spinGame);
            }, turboMode ? 40 : 70);

            // ── Generate spin result locally ──
            const finalGrid = generateSpinResult(spinGame);

            // Deduct bet
            balance -= currentBet;
            updateBalance();
            saveBalance();

            // Stagger stop times per column (turbo = faster)
            const baseDelay = turboMode ? 200 : 600;
            const stagger = turboMode ? Math.max(60, Math.floor(400 / cols)) : Math.max(200, Math.floor(1200 / cols));
            const stopDelays = Array.from({ length: cols }, (_, i) => baseDelay + i * stagger);

            // Stop each column one by one with a bounce
            stopDelays.forEach((delay, colIdx) => {
                setTimeout(() => {
                    const cells = document.querySelectorAll(`#reelCol${colIdx} .reel-cell`);
                    cells.forEach(cell => {
                        cell.classList.remove('reel-scrolling');
                        cell.classList.add('reel-landing');
                    });
                    updateSingleReel(colIdx, finalGrid[colIdx]);
                    playSound('click');

                    // After last column stops, show result
                    if (colIdx === cols - 1) {
                        clearInterval(spinInterval);
                        currentGrid = finalGrid;
                        currentReels = flattenGrid(finalGrid);
                        renderGrid(finalGrid, spinGame);

                        setTimeout(() => {
                            // ── Evaluate win locally ──
                            const flatSymbols = flattenGrid(finalGrid);
                            checkWin(flatSymbols, spinGame);

                            spinning = false;
                            spinBtn.disabled = currentBet > balance;
                            spinBtn.textContent = '';
                            refreshBetControls();
                            saveBalance();
                        }, 300);
                    }
                }, delay);
            });

            // Update local stats
            stats.totalSpins++;
            stats.totalWagered += currentBet;
            if (!stats.gamesPlayed[spinGame.id]) stats.gamesPlayed[spinGame.id] = 0;
            stats.gamesPlayed[spinGame.id]++;
            saveStats();
            updateStatsSummary();
        }

        // Display win result from server (no client-side win calculation)
        function displayServerWinResult(result, game) {
            const grid = result.grid;
            const winAmount = result.winAmount;
            const details = result.winDetails || {};

            // Clear highlights
            getAllCells().forEach(cell => {
                cell.classList.remove('reel-win-glow', 'reel-wild-glow', 'reel-scatter-glow', 'reel-wild-expand');
            });

            // Highlight wilds and scatters
            if (grid) {
                const cols = getGridCols(game);
                const rows = getGridRows(game);
                for (let c = 0; c < cols; c++) {
                    for (let r = 0; r < rows; r++) {
                        const cell = document.getElementById(`reel_${c}_${r}`);
                        if (!cell || !grid[c]) continue;
                        if (isWild(grid[c][r], game)) cell.classList.add('reel-wild-glow');
                        if (isScatter(grid[c][r], game)) cell.classList.add('reel-scatter-glow');
                    }
                }
            }

            if (winAmount > 0) {
                balance = result.balance;
                updateBalance();
                showWinAnimation(winAmount);
                updateSlotWinDisplay(winAmount);

                const message = details.message || `WIN! $${winAmount.toLocaleString()}!`;
                if (winAmount >= currentBet * 20) {
                    playSound('bigwin');
                } else {
                    playSound('win');
                }
                showMessage(message, 'win');

                if (typeof awardXP === 'function') awardXP(winAmount >= currentBet * 10 ? 25 : 10);

                if (freeSpinsActive) {
                    freeSpinsTotalWin += winAmount;
                    updateFreeSpinsDisplay();
                }
            } else {
                showMessage(details.message || 'No win. Try again.', 'lose');
            }
            if (typeof awardXP === 'function') awardXP(5);
        }

        function getRandomSymbol() {
            const syms = getGameSymbols(currentGame);
            return syms[Math.floor(getRandomNumber() * syms.length)];
        }

        // ═══ Wild Symbol Helpers ═══
        function isWild(symbol, game) {
            return game && game.wildSymbol && symbol === game.wildSymbol;
        }

        function isScatter(symbol, game) {
            return game && game.scatterSymbol && symbol === game.scatterSymbol;
        }

        function countScatters(symbols, game) {
            if (!game || !game.scatterSymbol) return 0;
            return symbols.filter(s => s === game.scatterSymbol).length;
        }

        function countWilds(symbols, game) {
            if (!game || !game.wildSymbol) return 0;
            return symbols.filter(s => s === game.wildSymbol).length;
        }

        // Check if symbols match accounting for wild substitution
        function symbolsMatchWithWild(a, b, game) {
            if (a === b) return true;
            if (isWild(a, game) || isWild(b, game)) return true;
            return false;
        }

        // Get the "effective" matching symbol from a set (ignoring wilds)
        function getEffectiveSymbol(symbols, game) {
            for (const s of symbols) {
                if (!isWild(s, game)) return s;
            }
            return symbols[0]; // all wilds
        }

        // Check for triple match with wild support
        function isTripleMatch(symbols, game) {
            return symbolsMatchWithWild(symbols[0], symbols[1], game) &&
                   symbolsMatchWithWild(symbols[1], symbols[2], game) &&
                   symbolsMatchWithWild(symbols[0], symbols[2], game);
        }

        // Check for double match with wild support, returns matching pair indices
        function getDoubleMatch(symbols, game) {
            if (symbolsMatchWithWild(symbols[0], symbols[1], game)) return [0, 1];
            if (symbolsMatchWithWild(symbols[1], symbols[2], game)) return [1, 2];
            if (symbolsMatchWithWild(symbols[0], symbols[2], game)) return [0, 2];
            return null;
        }

        // ═══ Bonus Mechanic Handlers ═══

        // Apply game-specific bonus multiplier to win
        function applyBonusMultiplier(baseWin, game) {
            let multiplier = freeSpinsMultiplier;
            let bonusText = '';

            if (freeSpinsActive && game.bonusType === 'random_multiplier') {
                // Sweet Bonanza: random bomb multiplier
                const range = game.randomMultiplierRange || [2, 3, 5];
                const bombMult = range[Math.floor(getRandomNumber() * range.length)];
                multiplier *= bombMult;
                bonusText = ` (${bombMult}x Bomb!)`;
                showBonusEffect(`${bombMult}x MULTIPLIER!`, game.accentColor);
            }

            if (freeSpinsActive && game.bonusType === 'zeus_multiplier') {
                // Gates of Olympus: Zeus drops a multiplier on wins
                const zMults = game.zeusMultipliers || [2, 3, 5];
                const zeusMult = zMults[Math.floor(getRandomNumber() * zMults.length)];
                multiplier *= zeusMult;
                bonusText = ` (Zeus ${zeusMult}x!)`;
                showBonusEffect(`ZEUS ${zeusMult}x!`, '#f5c842');
            }

            if (freeSpinsActive && (game.bonusType === 'tumble' || game.bonusType === 'avalanche')) {
                const mults = game.tumbleMultipliers || game.avalancheMultipliers || [1, 2, 3, 5];
                const idx = Math.min(freeSpinsCascadeLevel, mults.length - 1);
                multiplier = mults[idx];
                freeSpinsCascadeLevel++;
                bonusText = ` (Cascade ${multiplier}x!)`;
                if (multiplier > 1) showBonusEffect(`CASCADE ${multiplier}x!`, game.accentColor);
            }

            return { amount: Math.round(baseWin * multiplier), multiplier, bonusText };
        }

        // Get money value for money-type symbols (Black Bull, Big Bass)
        function getMoneyValue(symbol, game) {
            const moneySyms = game.moneySymbols || game.fishSymbols || [];
            if (!moneySyms.includes(symbol)) return 0;
            // Random cash value based on bet: 1x to 10x bet
            const values = [1, 2, 3, 5, 8, 10];
            return currentBet * values[Math.floor(getRandomNumber() * values.length)];
        }

        // Fire Joker wheel multiplier
        function getWheelMultiplier(game) {
            const mults = game.wheelMultipliers || [2, 3, 5];
            return mults[Math.floor(getRandomNumber() * mults.length)];
        }

        // ═══ Main Win Check — supports classic, payline, and cluster win types ═══
        function checkWin(symbols, game = currentGame) {
            if (!game) return;

            const winType = getWinType(game);
            const grid = currentGrid;
            let winAmount = 0;
            let message = '';
            let isTriple = false;
            let isDouble = false;
            let isBigWin = false;

            // Clear all cell highlights
            getAllCells().forEach(cell => {
                cell.classList.remove('reel-win-glow', 'reel-wild-glow', 'reel-scatter-glow', 'reel-wild-expand');
            });

            // Highlight wilds and scatters across entire grid
            if (grid) {
                const cols = getGridCols(game);
                const rows = getGridRows(game);
                for (let c = 0; c < cols; c++) {
                    for (let r = 0; r < rows; r++) {
                        const cell = document.getElementById(`reel_${c}_${r}`);
                        if (!cell || !grid[c]) continue;
                        if (isWild(grid[c][r], game)) cell.classList.add('reel-wild-glow');
                        if (isScatter(grid[c][r], game)) cell.classList.add('reel-scatter-glow');
                    }
                }
            }

            // ═══ CLUSTER PAY DETECTION ═══
            if (winType === 'cluster' && grid) {
                const clusters = findClusters(grid, game);
                let totalClusterWin = 0;
                let clusterCount = 0;

                for (const cluster of clusters) {
                    const size = cluster.size;
                    let payMultiplier = 0;

                    // Determine payout based on cluster size
                    if (size >= 15) payMultiplier = game.payouts.cluster15 || 150;
                    else if (size >= 12) payMultiplier = game.payouts.cluster12 || 50;
                    else if (size >= 8) payMultiplier = game.payouts.cluster8 || 15;
                    else if (size >= 5) payMultiplier = game.payouts.cluster5 || 5;

                    if (payMultiplier > 0) {
                        let clusterWin = currentBet * payMultiplier;
                        const bonus = applyBonusMultiplier(clusterWin, game);
                        totalClusterWin += bonus.amount;
                        clusterCount++;

                        // Highlight winning cells
                        cluster.cells.forEach(([c, r]) => {
                            const cell = document.getElementById(`reel_${c}_${r}`);
                            if (cell) cell.classList.add('reel-win-glow');
                        });
                    }
                }

                if (totalClusterWin > 0) {
                    winAmount = totalClusterWin;
                    isBigWin = true;
                    const totalSize = clusters.reduce((sum, cl) => sum + cl.size, 0);
                    message = `CLUSTER WIN! ${clusterCount} cluster${clusterCount > 1 ? 's' : ''} (${totalSize} symbols) = $${winAmount.toLocaleString()}!`;
                    if (winAmount >= currentBet * 20) {
                        playSound('bigwin');
                    } else {
                        playSound('win');
                    }
                    showWinAnimation(winAmount);
                } else {
                    message = 'No clusters. Try again.';
                    if (freeSpinsActive && (game.bonusType === 'tumble' || game.bonusType === 'avalanche')) {
                        freeSpinsCascadeLevel = 0;
                    }
                }

            // ═══ PAYLINE WIN DETECTION ═══
            } else if (winType === 'payline' && grid) {
                const paylineWins = checkPaylineWins(grid, game);
                let totalPaylineWin = 0;
                let bestLine = null;

                for (const win of paylineWins) {
                    let payKey = `payline${win.matchCount}`;
                    let payMultiplier = game.payouts[payKey] || game.payouts.triple;

                    // Check if any wilds were on the payline
                    const lineSymbols = win.cells.map(([c, r]) => grid[c][r]);
                    const lineWilds = lineSymbols.filter(s => isWild(s, game)).length;
                    if (lineWilds > 0) payMultiplier = Math.round(payMultiplier * 1.5);

                    let lineWin = currentBet * payMultiplier;
                    const bonus = applyBonusMultiplier(lineWin, game);
                    totalPaylineWin += bonus.amount;

                    // Highlight winning cells
                    win.cells.forEach(([c, r]) => {
                        const cell = document.getElementById(`reel_${c}_${r}`);
                        if (cell) cell.classList.add('reel-win-glow');
                    });

                    if (!bestLine || bonus.amount > bestLine.amount) {
                        bestLine = { ...win, amount: bonus.amount, bonusText: bonus.bonusText };
                    }
                }

                if (totalPaylineWin > 0) {
                    winAmount = totalPaylineWin;
                    isBigWin = paylineWins.some(w => w.matchCount >= 4);
                    isTriple = paylineWins.some(w => w.matchCount >= 3);
                    if (paylineWins.length === 1) {
                        message = `WIN! ${bestLine.matchCount}-of-a-kind on payline = $${winAmount.toLocaleString()}!${bestLine.bonusText || ''}`;
                    } else {
                        message = `MULTI-LINE WIN! ${paylineWins.length} paylines = $${winAmount.toLocaleString()}!`;
                    }

                    // Fire Joker wheel on 5-of-a-kind
                    if (game.bonusType === 'wheel_multiplier' && !freeSpinsActive && paylineWins.some(w => w.matchCount >= getGridCols(game))) {
                        const wheelMult = getWheelMultiplier(game);
                        winAmount = Math.round(winAmount * wheelMult);
                        message = `WHEEL OF FIRE! Full match x${wheelMult} = $${winAmount.toLocaleString()}!`;
                        showBonusEffect(`WHEEL ${wheelMult}x!`, '#ff0844');
                    }

                    if (winAmount >= currentBet * 20) {
                        playSound('bigwin');
                    } else {
                        playSound('win');
                    }
                    showWinAnimation(winAmount);
                } else {
                    message = 'No winning lines. Try again.';
                    if (freeSpinsActive && (game.bonusType === 'tumble' || game.bonusType === 'avalanche')) {
                        freeSpinsCascadeLevel = 0;
                    }
                }

            // ═══ CLASSIC 3-REEL WIN DETECTION ═══
            } else {
                const wildCount = countWilds(symbols, game);
                const hasWild = wildCount > 0;

                if (isTripleMatch(symbols, game)) {
                    isTriple = true;
                    isBigWin = true;
                    const allWilds = wildCount === 3;
                    const payKey = allWilds || hasWild ? 'wildTriple' : 'triple';
                    let baseWin = currentBet * (game.payouts[payKey] || game.payouts.triple);
                    const bonus = applyBonusMultiplier(baseWin, game);
                    winAmount = bonus.amount;

                    if (allWilds) {
                        message = `WILD JACKPOT! Triple wilds paid $${winAmount.toLocaleString()}!${bonus.bonusText}`;
                    } else if (hasWild) {
                        message = `WILD MEGA WIN! Wild helped complete a triple for $${winAmount.toLocaleString()}!${bonus.bonusText}`;
                    } else {
                        message = `MEGA WIN! Triple match paid $${winAmount.toLocaleString()}!${bonus.bonusText}`;
                    }

                    // Fire Joker: Wheel of Multipliers on triple
                    if (game.bonusType === 'wheel_multiplier' && !freeSpinsActive) {
                        const wheelMult = getWheelMultiplier(game);
                        winAmount = Math.round(winAmount * wheelMult);
                        message = `WHEEL OF FIRE! Triple match x${wheelMult} = $${winAmount.toLocaleString()}!`;
                        showBonusEffect(`WHEEL ${wheelMult}x!`, '#ff0844');
                    }

                    playSound('bigwin');
                    showWinAnimation(winAmount);
                    getAllCells().forEach(cell => cell.classList.add('reel-win-glow'));

                } else {
                    const doublePair = getDoubleMatch(symbols, game);
                    if (doublePair) {
                        isDouble = true;
                        let baseWin = currentBet * game.payouts.double;
                        if (hasWild) baseWin = Math.round(baseWin * 1.5);
                        const bonus = applyBonusMultiplier(baseWin, game);
                        winAmount = bonus.amount;

                        if (hasWild) {
                            message = `WILD WIN! Wild symbol helped match for $${winAmount.toLocaleString()}!${bonus.bonusText}`;
                        } else {
                            message = `Nice win! Two symbols matched for $${winAmount.toLocaleString()}.${bonus.bonusText}`;
                        }
                        playSound('win');
                        showWinAnimation(winAmount);
                        doublePair.forEach(idx => {
                            const cell = document.getElementById(`reel_${idx}_0`);
                            if (cell) cell.classList.add('reel-win-glow');
                        });
                    } else {
                        message = 'No match. Try again.';
                        if (freeSpinsActive && (game.bonusType === 'tumble' || game.bonusType === 'avalanche')) {
                            freeSpinsCascadeLevel = 0;
                        }
                    }
                }
            }

            // ── Money Collect mechanics (Black Bull, Big Bass) — grid-aware ──
            const gridWilds = grid ? countWildsInGrid(grid, game) : countWilds(symbols, game);
            if (gridWilds > 0 && (game.bonusType === 'money_collect' || game.bonusType === 'fisherman_collect')) {
                const collectSyms = game.moneySymbols || game.fishSymbols || [];
                let collectTotal = 0;
                if (grid) {
                    for (const col of grid) {
                        for (const s of col) {
                            if (collectSyms.includes(s)) collectTotal += getMoneyValue(s, game);
                        }
                    }
                } else {
                    symbols.forEach(s => {
                        if (collectSyms.includes(s)) collectTotal += getMoneyValue(s, game);
                    });
                }
                if (collectTotal > 0) {
                    winAmount += collectTotal;
                    message += ` Collected $${collectTotal.toLocaleString()} in ${game.bonusType === 'fisherman_collect' ? 'fish' : 'coin'} values!`;
                    showBonusEffect(`COLLECT $${collectTotal.toLocaleString()}!`, game.accentColor);
                }
            }

            // ── Scatter detection — grid-aware ──
            const scatterCount = grid ? countSymbolInGrid(grid, game.scatterSymbol || '') : countScatters(symbols, game);
            const scatterThreshold = isMultiRow(game) ? 3 : 2; // Multi-row needs 3+ scatters
            const fullScatterThreshold = isMultiRow(game) ? 4 : 3;

            if (scatterCount >= scatterThreshold && !freeSpinsActive && game.freeSpinsCount > 0) {
                const scatterWin = scatterCount * currentBet * (game.payouts.scatterPay || 2);
                winAmount += scatterWin;

                if (scatterCount >= fullScatterThreshold) {
                    triggerFreeSpins(game, game.freeSpinsCount);
                    message = `SCATTER BONUS! ${game.freeSpinsCount} FREE SPINS AWARDED! +$${scatterWin.toLocaleString()} scatter pay!`;
                    playSound('bigwin');
                } else {
                    const halfSpins = Math.max(3, Math.floor(game.freeSpinsCount / 2));
                    triggerFreeSpins(game, halfSpins);
                    message = `SCATTER! ${halfSpins} FREE SPINS! +$${scatterWin.toLocaleString()}!`;
                    playSound('bigwin');
                }
            }

            // ── Scatter retrigger during free spins (capped to prevent runaway) ──
            const MAX_FREE_SPINS = 50;
            if (scatterCount >= scatterThreshold && freeSpinsActive && game.freeSpinsRetrigger && freeSpinsRemaining < MAX_FREE_SPINS) {
                const extraSpins = scatterCount >= fullScatterThreshold ? game.freeSpinsCount : Math.max(2, Math.floor(game.freeSpinsCount / 3));
                const capped = Math.min(extraSpins, MAX_FREE_SPINS - freeSpinsRemaining);
                if (capped > 0) {
                    freeSpinsRemaining += capped;
                    message += ` +${capped} EXTRA FREE SPINS!`;
                    updateFreeSpinsDisplay();
                    showBonusEffect(`+${capped} FREE SPINS!`, '#fbbf24');
                }
            }

            // ── Process win ──
            if (winAmount > 0) {
                balance += winAmount;
                updateBalance();
                saveBalance();
                stats.totalWon += winAmount;
                if (winAmount > stats.biggestWin) stats.biggestWin = winAmount;
                saveStats();
                updateStatsSummary();
                showMessage(message, 'win');
                const xpBonus = isBigWin ? 25 : 10;
                if (typeof awardXP === 'function') awardXP(xpBonus);

                if (freeSpinsActive) {
                    freeSpinsTotalWin += winAmount;
                    updateFreeSpinsDisplay();
                }
            } else {
                showMessage(message, 'lose');
            }
            if (typeof awardXP === 'function') awardXP(5);

            // ── Hot Chillies Respin (classic 3-reel only) ──
            if (winType === 'classic' && !freeSpinsActive && isDouble && !isTriple && game.bonusType === 'respin' && respinCount < (game.maxRespins || 3)) {
                const doublePair = getDoubleMatch(symbols, game);
                if (doublePair) {
                    respinCount++;
                    const nonMatch = [0, 1, 2].filter(i => !doublePair.includes(i))[0];
                    showBonusEffect(`RESPIN ${respinCount}/${game.maxRespins || 3}!`, game.accentColor);
                    setTimeout(() => triggerRespin(nonMatch, symbols, game), 800);
                    return;
                }
            } else if (!isDouble || isTriple) {
                respinCount = 0;
            }

            // ── Starburst Expanding Wild Respin ──
            if (gridWilds > 0 && game.bonusType === 'expanding_wild_respin' && expandingWildRespinsLeft < (game.expandingWildMaxRespins || 3)) {
                expandingWildRespinsLeft++;
                showBonusEffect('EXPANDING WILD RESPIN!', '#a855f7');
                if (grid) {
                    for (let c = 0; c < grid.length; c++) {
                        for (let r = 0; r < grid[c].length; r++) {
                            if (isWild(grid[c][r], game)) {
                                const cell = document.getElementById(`reel_${c}_${r}`);
                                if (cell) cell.classList.add('reel-wild-expand');
                            }
                        }
                    }
                }
                setTimeout(() => triggerExpandingWildRespin(symbols, game), 1000);
                return;
            }

            // ── Process free spin advancement ──
            if (freeSpinsActive) {
                advanceFreeSpins(game);
            }
        }

        function showMessage(text, type) {
            lastMessage = { type, text };
            const msgDiv = document.getElementById('messageDisplay');
            msgDiv.innerHTML = `<div class="message-display message-${type}">${text}</div>`;
        }

        function showWinAnimation(amount) {
            const winDiv = document.getElementById('winAnimation');
            const multiplier = currentBet > 0 ? amount / currentBet : 0;

            // Determine win tier (like Pragmatic Play)
            let winTier = '';
            let tierClass = '';
            if (multiplier >= 50) {
                winTier = 'EPIC WIN';
                tierClass = 'win-tier-epic';
            } else if (multiplier >= 20) {
                winTier = 'MEGA WIN';
                tierClass = 'win-tier-mega';
            } else if (multiplier >= 10) {
                winTier = 'BIG WIN';
                tierClass = 'win-tier-big';
            } else if (multiplier >= 5) {
                winTier = 'GREAT WIN';
                tierClass = 'win-tier-great';
            }

            if (winTier) {
                // Pragmatic Play style full-screen big win overlay
                winDiv.innerHTML = `
                    <div class="pp-win-overlay ${tierClass}">
                        <div class="pp-win-burst"></div>
                        <div class="pp-win-content">
                            <div class="pp-win-tier">${winTier}</div>
                            <div class="pp-win-amount">$${amount.toLocaleString()}</div>
                            <div class="pp-win-multiplier">${multiplier.toFixed(1)}x</div>
                        </div>
                    </div>`;
                createConfetti();
            } else {
                // Small win — just show amount overlay
                winDiv.innerHTML = `<div class="win-amount">+$${amount.toLocaleString()}</div>`;
            }

            // Update bottom bar win display
            updateSlotWinDisplay(amount);

            setTimeout(() => {
                winDiv.innerHTML = '';
            }, winTier ? 5000 : 3000);
        }

        function createConfetti() {
            const colors = ['confetti-1', 'confetti-2', 'confetti-3', 'confetti-4', 'confetti-5'];
            const confettiCount = 50;

            for (let i = 0; i < confettiCount; i++) {
                const confetti = document.createElement('div');
                confetti.className = `confetti ${colors[Math.floor(Math.random() * colors.length)]}`;
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.animationDelay = Math.random() * 0.5 + 's';
                confetti.style.width = (Math.random() * 10 + 5) + 'px';
                confetti.style.height = (Math.random() * 10 + 5) + 'px';
                document.body.appendChild(confetti);

                setTimeout(() => confetti.remove(), 4000);
            }
        }

        // ═══════════════════════════════════════════════════════
        // FREE SPINS ENGINE
        // ═══════════════════════════════════════════════════════

        function triggerFreeSpins(game, count) {
            freeSpinsActive = true;
            freeSpinsRemaining = count;
            freeSpinsTotalWin = 0;
            freeSpinsMultiplier = 1;
            freeSpinsCascadeLevel = 0;
            expandingWildRespinsLeft = 0;
            respinCount = 0;

            // Book of Dead: pick a random expanding symbol
            if (game.bonusType === 'expanding_symbol') {
                const regularSyms = game.symbols.filter(s => s !== game.wildSymbol && s !== game.scatterSymbol);
                freeSpinsExpandedSymbol = regularSyms[Math.floor(getRandomNumber() * regularSyms.length)];
                showBonusEffect(`Expanding Symbol: ${freeSpinsExpandedSymbol.replace(/^s\d+_/, '').replace(/_/g, ' ').toUpperCase()}!`, '#c7a94e');
            }

            showFreeSpinsOverlay(game, count);
            updateFreeSpinsDisplay();
            createConfetti();
        }

        function advanceFreeSpins(game) {
            if (!freeSpinsActive) return;

            freeSpinsRemaining--;
            updateFreeSpinsDisplay();

            if (freeSpinsRemaining <= 0) {
                endFreeSpins(game);
            } else {
                // Auto-spin the next free spin after a delay
                setTimeout(() => {
                    if (freeSpinsActive && currentGame && !spinning) {
                        freeSpinSpin(game);
                    }
                }, 1500);
            }
        }

        function freeSpinSpin(game) {
            if (!freeSpinsActive || spinning || !currentGame) return;

            spinning = true;
            const spinBtn = document.getElementById('spinBtn');
            spinBtn.disabled = true;
            spinBtn.textContent = 'FREE SPIN...';

            const cols = getGridCols(game);

            // Add scrolling animation to all cells
            getAllCells().forEach(cell => {
                cell.classList.remove('reel-landing', 'reel-win-glow', 'reel-wild-glow', 'reel-scatter-glow', 'reel-wild-expand');
                cell.classList.add('reel-scrolling');
            });

            let finalGrid = consumeSpinResult();

            // Book of Dead: expanding symbol mechanic — boost chance of expanded symbol
            if (game.bonusType === 'expanding_symbol' && freeSpinsExpandedSymbol) {
                for (let c = 0; c < finalGrid.length; c++) {
                    for (let r = 0; r < finalGrid[c].length; r++) {
                        if (getRandomNumber() < 0.35) finalGrid[c][r] = freeSpinsExpandedSymbol;
                    }
                }
            }

            // Super Hot: stacked wilds mechanic
            if (game.bonusType === 'stacked_wilds' && game.stackedWildChance) {
                for (let c = 0; c < finalGrid.length; c++) {
                    // Stacked: if first row of column is wild, fill entire column
                    if (getRandomNumber() < game.stackedWildChance) {
                        for (let r = 0; r < finalGrid[c].length; r++) {
                            finalGrid[c][r] = game.wildSymbol;
                        }
                    }
                }
            }

            const baseDelay = turboMode ? 150 : 500;
            const stagger = turboMode ? Math.max(50, Math.floor(300 / cols)) : Math.max(150, Math.floor(900 / cols));
            const stopDelays = Array.from({ length: cols }, (_, i) => baseDelay + i * stagger);

            const spinInterval = setInterval(() => {
                renderGrid(generateRandomGrid(game), game);
            }, turboMode ? 40 : 70);

            stopDelays.forEach((delay, colIdx) => {
                setTimeout(() => {
                    const cells = document.querySelectorAll(`#reelCol${colIdx} .reel-cell`);
                    cells.forEach(cell => {
                        cell.classList.remove('reel-scrolling');
                        cell.classList.add('reel-landing');
                    });
                    updateSingleReel(colIdx, finalGrid[colIdx]);
                    playSound('click');

                    if (colIdx === cols - 1) {
                        clearInterval(spinInterval);
                        currentGrid = finalGrid;
                        currentReels = flattenGrid(finalGrid);
                        renderGrid(finalGrid, game);
                        setTimeout(() => {
                            checkWin(flattenGrid(finalGrid), game);
                            spinning = false;
                            spinBtn.disabled = false;
                            spinBtn.textContent = freeSpinsActive ? `FREE SPIN (${freeSpinsRemaining})` : 'SPIN NOW!';
                            refreshQaStateDisplay();
                        }, 300);
                    }
                }, delay);
            });

            playSound('spin');
        }

        function endFreeSpins(game) {
            freeSpinsActive = false;
            freeSpinsExpandedSymbol = null;
            freeSpinsCascadeLevel = 0;
            expandingWildRespinsLeft = 0;

            // Show summary
            showFreeSpinsSummary(freeSpinsTotalWin, game);

            const spinBtn = document.getElementById('spinBtn');
            if (spinBtn) {
                spinBtn.textContent = 'SPIN NOW!';
                spinBtn.disabled = currentBet > balance;
            }

            // Remove free spins display
            setTimeout(() => {
                hideFreeSpinsDisplay();
            }, 3000);
        }

        function triggerRespin(reelIndex, currentSymbols, game) {
            if (spinning) return;
            spinning = true;

            // Animate the column being respun
            const cells = document.querySelectorAll(`#reelCol${reelIndex} .reel-cell`);
            cells.forEach(cell => {
                cell.classList.remove('reel-landing', 'reel-win-glow');
                cell.classList.add('reel-scrolling');
            });

            const newSymbol = getRandomSymbol();
            const newSymbols = [...currentSymbols];
            newSymbols[reelIndex] = newSymbol;
            // Update grid too
            if (currentGrid && currentGrid[reelIndex]) {
                currentGrid[reelIndex][0] = newSymbol;
            }

            setTimeout(() => {
                cells.forEach(cell => {
                    cell.classList.remove('reel-scrolling');
                    cell.classList.add('reel-landing');
                });
                updateSingleReel(reelIndex, newSymbol);
                playSound('click');

                setTimeout(() => {
                    spinning = false;
                    checkWin(newSymbols, game);
                }, 300);
            }, 800);
        }

        function triggerExpandingWildRespin(currentSymbols, game) {
            if (spinning) return;
            spinning = true;

            const cols = getGridCols(game);
            // Find non-wild columns to respin
            const respinIndices = [];
            for (let c = 0; c < cols; c++) {
                // Check if any cell in this column has a wild
                let hasWildInCol = false;
                if (currentGrid && currentGrid[c]) {
                    hasWildInCol = currentGrid[c].some(s => isWild(s, game));
                } else {
                    hasWildInCol = isWild(currentSymbols[c], game);
                }
                if (!hasWildInCol) {
                    respinIndices.push(c);
                    const cells = document.querySelectorAll(`#reelCol${c} .reel-cell`);
                    cells.forEach(cell => {
                        cell.classList.remove('reel-landing', 'reel-win-glow');
                        cell.classList.add('reel-scrolling');
                    });
                }
            }

            if (respinIndices.length === 0) {
                spinning = false;
                return;
            }

            // Generate new symbols for respun columns
            const newGrid = currentGrid ? currentGrid.map(col => [...col]) : gridFrom1D([...currentSymbols], game);
            const syms = getGameSymbols(game);
            respinIndices.forEach(c => {
                for (let r = 0; r < newGrid[c].length; r++) {
                    newGrid[c][r] = syms[Math.floor(getRandomNumber() * syms.length)];
                }
            });

            setTimeout(() => {
                respinIndices.forEach(c => {
                    const cells = document.querySelectorAll(`#reelCol${c} .reel-cell`);
                    cells.forEach(cell => {
                        cell.classList.remove('reel-scrolling');
                        cell.classList.add('reel-landing');
                    });
                    updateSingleReel(c, newGrid[c]);
                });
                currentGrid = newGrid;
                currentReels = flattenGrid(newGrid);
                playSound('click');

                setTimeout(() => {
                    spinning = false;
                    checkWin(flattenGrid(newGrid), game);
                }, 300);
            }, 800);
        }

        // ═══ Free Spins UI ═══

        function showFreeSpinsOverlay(game, count) {
            let overlay = document.getElementById('freeSpinsOverlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'freeSpinsOverlay';
                overlay.className = 'free-spins-overlay';
                document.querySelector('.slot-body')?.appendChild(overlay);
            }

            const bonusName = game.bonusDesc ? game.bonusDesc.split(':')[0] : 'FREE SPINS';
            overlay.innerHTML = `
                <div class="free-spins-intro" style="border-color: ${game.accentColor}">
                    <div class="fs-intro-title" style="color: ${game.accentColor}">${bonusName}</div>
                    <div class="fs-intro-count">${count} FREE SPINS</div>
                    <div class="fs-intro-desc">${game.bonusDesc || ''}</div>
                </div>
            `;
            overlay.classList.add('active');

            // Auto-dismiss after 2.5s and start first free spin
            setTimeout(() => {
                overlay.classList.remove('active');
                showFreeSpinsHUD(game);
                // Start first free spin
                setTimeout(() => {
                    if (freeSpinsActive && currentGame && !spinning) {
                        freeSpinSpin(game);
                    }
                }, 500);
            }, 2500);
        }

        function showFreeSpinsHUD(game) {
            let hud = document.getElementById('freeSpinsHUD');
            if (!hud) {
                hud = document.createElement('div');
                hud.id = 'freeSpinsHUD';
                hud.className = 'free-spins-hud';
                document.querySelector('.slot-body')?.prepend(hud);
            }
            hud.style.borderColor = game.accentColor;
            hud.style.display = 'flex';
            updateFreeSpinsDisplay();
        }

        function updateFreeSpinsDisplay() {
            const hud = document.getElementById('freeSpinsHUD');
            if (!hud) return;

            const game = currentGame;
            let multText = '';
            if (freeSpinsMultiplier > 1) multText = ` | ${freeSpinsMultiplier}x`;
            if (freeSpinsCascadeLevel > 0 && game && (game.bonusType === 'tumble' || game.bonusType === 'avalanche')) {
                const mults = game.tumbleMultipliers || game.avalancheMultipliers || [1];
                const idx = Math.min(freeSpinsCascadeLevel, mults.length - 1);
                multText = ` | CASCADE ${mults[idx]}x`;
            }
            if (freeSpinsExpandedSymbol) {
                const symName = freeSpinsExpandedSymbol.replace(/^s\d+_/, '').replace(/_/g, ' ');
                multText += ` | EXPANDING: ${symName.toUpperCase()}`;
            }

            hud.innerHTML = `
                <div class="fs-hud-spins">
                    <span class="fs-hud-label">FREE SPINS</span>
                    <span class="fs-hud-value">${freeSpinsRemaining}</span>
                </div>
                <div class="fs-hud-win">
                    <span class="fs-hud-label">TOTAL WIN</span>
                    <span class="fs-hud-value fs-hud-win-value">$${freeSpinsTotalWin.toLocaleString()}</span>
                </div>
                ${multText ? `<div class="fs-hud-mult"><span class="fs-hud-label">BONUS</span><span class="fs-hud-value">${multText.replace(' | ', '')}</span></div>` : ''}
            `;
        }

        function hideFreeSpinsDisplay() {
            const hud = document.getElementById('freeSpinsHUD');
            if (hud) hud.style.display = 'none';
            const overlay = document.getElementById('freeSpinsOverlay');
            if (overlay) overlay.classList.remove('active');
        }

        function showFreeSpinsSummary(totalWin, game) {
            let overlay = document.getElementById('freeSpinsOverlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'freeSpinsOverlay';
                overlay.className = 'free-spins-overlay';
                document.querySelector('.slot-body')?.appendChild(overlay);
            }

            overlay.innerHTML = `
                <div class="free-spins-intro fs-summary" style="border-color: ${game.accentColor}">
                    <div class="fs-intro-title" style="color: ${game.accentColor}">FREE SPINS COMPLETE!</div>
                    <div class="fs-summary-total">$${totalWin.toLocaleString()}</div>
                    <div class="fs-intro-desc">Total bonus winnings added to your balance</div>
                </div>
            `;
            overlay.classList.add('active');

            if (totalWin > 0) {
                createConfetti();
                playSound('bigwin');
            }

            setTimeout(() => {
                overlay.classList.remove('active');
            }, 3500);
        }

        function showBonusEffect(text, color) {
            const container = document.getElementById('winAnimation');
            if (!container) return;
            const effect = document.createElement('div');
            effect.className = 'bonus-effect';
            effect.style.color = color || '#fbbf24';
            effect.textContent = text;
            container.appendChild(effect);
            setTimeout(() => effect.remove(), 2500);
        }

        function showPageTransition(callback) {
            const transition = document.getElementById('pageTransition');
            transition.classList.add('active');
            setTimeout(() => {
                if (callback) callback();
                setTimeout(() => {
                    transition.classList.remove('active');
                }, 300);
            }, 300);
        }

        function toggleSound() {
            soundEnabled = !soundEnabled;
            localStorage.setItem('soundEnabled', soundEnabled);
            const btn = document.getElementById('soundToggle');
            btn.textContent = soundEnabled ? '\u{1F50A}' : '\u{1F507}';
            btn.title = soundEnabled ? 'Sound ON' : 'Sound OFF';

            if (soundEnabled) {
                playSound('toggle');
            }
        }

        // Shared AudioContext — reuse a single instance to avoid browser limits
        let sharedAudioContext = null;
        function getAudioContext() {
            if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
                sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (sharedAudioContext.state === 'suspended') {
                sharedAudioContext.resume();
            }
            return sharedAudioContext;
        }

        function playSound(type) {
            if (!soundEnabled) return;

            try {
                const audioContext = getAudioContext();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                switch(type) {
                    case 'spin':
                        oscillator.frequency.value = 440;
                        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                        oscillator.start(audioContext.currentTime);
                        oscillator.stop(audioContext.currentTime + 0.1);
                        break;
                    case 'win':
                        oscillator.frequency.value = 880;
                        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                        oscillator.start(audioContext.currentTime);
                        oscillator.stop(audioContext.currentTime + 0.3);
                        break;
                    case 'bigwin':
                        // Chord for big wins
                        [523, 659, 784].forEach((freq, i) => {
                            const osc = audioContext.createOscillator();
                            const gain = audioContext.createGain();
                            osc.connect(gain);
                            gain.connect(audioContext.destination);
                            osc.frequency.value = freq;
                            gain.gain.setValueAtTime(0.2, audioContext.currentTime + i * 0.1);
                            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5 + i * 0.1);
                            osc.start(audioContext.currentTime + i * 0.1);
                            osc.stop(audioContext.currentTime + 0.5 + i * 0.1);
                        });
                        break;
                    case 'click':
                        oscillator.frequency.value = 800;
                        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
                        oscillator.start(audioContext.currentTime);
                        oscillator.stop(audioContext.currentTime + 0.05);
                        break;
                    case 'toggle':
                        oscillator.frequency.value = 600;
                        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                        oscillator.start(audioContext.currentTime);
                        oscillator.stop(audioContext.currentTime + 0.1);
                        break;
                }
            } catch (e) {
                // Silently ignore audio errors in headless/automated environments
            }
        }

        // Initialize sound button state
        function updateSoundButton() {
            const btn = document.getElementById('soundToggle');
            if (btn) {
                btn.textContent = soundEnabled ? '\u{1F50A}' : '\u{1F507}';
                btn.title = soundEnabled ? 'Sound ON' : 'Sound OFF';
            }
        }

        function renderGameToText() {
            const slotModalOpen = document.getElementById('slotModal').classList.contains('active');
            const statsModalOpen = document.getElementById('statsModal').classList.contains('active');

            const payload = {
                coordinateSystem: 'DOM viewport pixels; origin is top-left; +x right, +y down.',
                mode: slotModalOpen ? 'slot' : (statsModalOpen ? 'stats' : 'lobby'),
                balance: Number(balance.toFixed(2)),
                spinning,
                currentBet,
                currentGame: currentGame
                    ? {
                        id: currentGame.id,
                        name: currentGame.name,
                        minBet: currentGame.minBet,
                        maxBet: currentGame.maxBet,
                        gridCols: getGridCols(currentGame),
                        gridRows: getGridRows(currentGame),
                        winType: getWinType(currentGame),
                        payoutTriple: currentGame.payouts.triple,
                        payoutDouble: currentGame.payouts.double
                    }
                    : null,
                reels: [...currentReels],
                grid: currentGrid,
                message: lastMessage,
                freeSpins: {
                    active: freeSpinsActive,
                    remaining: freeSpinsRemaining,
                    totalWin: freeSpinsTotalWin,
                    multiplier: freeSpinsMultiplier,
                    cascadeLevel: freeSpinsCascadeLevel,
                    expandedSymbol: freeSpinsExpandedSymbol
                },
                xp: { level: playerLevel, xp: playerXP, tier: getTier(playerLevel).name },
                debug: getDebugState(),
                stats: {
                    totalSpins: stats.totalSpins,
                    totalWagered: Number(stats.totalWagered.toFixed(2)),
                    totalWon: Number(stats.totalWon.toFixed(2)),
                    biggestWin: Number(stats.biggestWin.toFixed(2)),
                    gamesPlayed: stats.gamesPlayed
                }
            };

            return JSON.stringify(payload);
        }

        function wireGameHooks() {
            window.render_game_to_text = renderGameToText;
            window.advanceTime = (ms) => new Promise((resolve) => {
                setTimeout(resolve, Math.max(0, ms));
            });
            window.casinoDebug = {
                setSpinSeed: (seedValue) => {
                    const applied = setDeterministicSeed(seedValue);
                    refreshQaStateDisplay();
                    return applied;
                },
                clearSpinSeed: () => {
                    const cleared = setDeterministicSeed(null);
                    refreshQaStateDisplay();
                    return cleared;
                },
                queueForcedSpin: (symbolsInput) => {
                    const queued = queueForcedSpin(symbolsInput);
                    refreshQaStateDisplay();
                    return queued;
                },
                queueOutcome: (type, preferredSymbol) => {
                    const queued = queueForcedOutcome(type, preferredSymbol);
                    refreshQaStateDisplay();
                    return queued;
                },
                forceNextSpinAndPlay: (symbolsOrMode, preferredSymbol) => {
                    const queued = queueAndSpin(symbolsOrMode, preferredSymbol);
                    refreshQaStateDisplay();
                    return queued;
                },
                clearForcedSpins: () => {
                    forcedSpinQueue = [];
                    refreshQaStateDisplay();
                },
                resetSessionState: (clearDeterministic = false) => resetSessionState({ clearDeterministic: Boolean(clearDeterministic), clearQueue: true }),
                getState: () => getDebugState()
            };
        }

        async function toggleFullscreen() {
            try {
                if (document.fullscreenElement) {
                    await document.exitFullscreen();
                } else {
                    await document.documentElement.requestFullscreen();
                }
            } catch (error) {
                console.warn('Fullscreen toggle failed.', error);
            }
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't intercept keys when typing in inputs/textareas/selects
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            const key = e.key.toLowerCase();
            if (key === 'f') {
                e.preventDefault();
                toggleFullscreen();
                return;
            }

            if (e.key === 'Escape' && document.getElementById('authModal').classList.contains('active')) {
                hideAuthModal();
                return;
            }

            if (e.key === 'Escape' && document.getElementById('statsModal').classList.contains('active')) {
                closeStatsModal();
                return;
            }

            if (e.key === 'Escape' && document.getElementById('slotModal').classList.contains('active')) {
                closeSlot();
                return;
            }

            if (e.key === 'Escape' && document.getElementById('depositModal').classList.contains('active')) {
                closeDepositModal();
                return;
            }

            if (e.key === 'Escape' && document.getElementById('dailyBonusModal').classList.contains('active')) {
                closeDailyBonusModal();
                return;
            }

            if (e.key === 'Escape' && document.getElementById('bonusWheelModal').classList.contains('active')) {
                closeBonusWheelModal();
            }
        });

        // ===== Filter Tabs =====
        function setFilter(filter) {
            currentFilter = filter;
            // Clear search input when switching filters
            const searchInput = document.getElementById('gameSearchInput');
            if (searchInput) searchInput.value = '';
            const tabs = document.querySelectorAll('.filter-tab');
            tabs.forEach(tab => {
                tab.classList.toggle('filter-tab-active', tab.dataset.filter === filter);
            });
            renderFilteredGames();
        }

        function getFilteredGames(filter) {
            switch (filter) {
                case 'hot':      return games.filter(g => g.hot);
                case 'new':      return games.filter(g => g.tag === 'NEW');
                case 'jackpot':  return games.filter(g => g.tag === 'JACKPOT' || g.tag === 'MEGA');
                default:         return games;
            }
        }

        function renderFilteredGames() {
            const allGamesDiv = document.getElementById('allGames');
            const filtered = getFilteredGames(currentFilter);
            allGamesDiv.innerHTML = filtered.map(g => createGameCard(g)).join('');
            updateFilterCounts();
            // Update the "All Slots" count label
            const countEl = document.getElementById('allGamesCount');
            if (countEl) countEl.textContent = `${filtered.length} game${filtered.length !== 1 ? 's' : ''}`;
        }

        function updateFilterCounts() {
            const counts = {
                all:     games.length,
                hot:     games.filter(g => g.hot).length,
                new:     games.filter(g => g.tag === 'NEW').length,
                jackpot: games.filter(g => g.tag === 'JACKPOT' || g.tag === 'MEGA').length
            };
            document.querySelectorAll('.filter-tab').forEach(tab => {
                const f = tab.dataset.filter;
                let countEl = tab.querySelector('.filter-count');
                if (!countEl) {
                    countEl = document.createElement('span');
                    countEl.className = 'filter-count';
                    tab.appendChild(countEl);
                }
                countEl.textContent = counts[f] ?? '';
            });
        }

        // ===== Game Search =====
        function searchGames(query) {
            query = query.trim().toLowerCase();
            if (!query) {
                renderFilteredGames();
                return;
            }
            const allGamesDiv = document.getElementById('allGames');
            const results = games.filter(g =>
                g.name.toLowerCase().includes(query) ||
                (g.provider && g.provider.toLowerCase().includes(query))
            );
            allGamesDiv.innerHTML = results.length
                ? results.map(g => createGameCard(g)).join('')
                : `<div class="games-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <p>No games found for "<strong>${query}</strong>"</p>
                   </div>`;
        }

        // ===== XP / Level System =====
        const XP_TIERS = [
            { name: 'BRONZE', color: '#cd7f32', minLevel: 1 },
            { name: 'SILVER', color: '#c0c0c0', minLevel: 5 },
            { name: 'GOLD', color: '#ffd700', minLevel: 10 },
            { name: 'PLATINUM', color: '#e5e4e2', minLevel: 20 },
            { name: 'DIAMOND', color: '#b9f2ff', minLevel: 35 },
            { name: 'LEGEND', color: '#ff4500', minLevel: 50 }
        ];

        const XP_STORAGE_KEY = 'casinoXP';

        let playerXP = 0;
        let playerLevel = 1;

        function getXPForLevel(level) {
            return Math.floor(100 * Math.pow(1.25, level - 1));
        }

        function getTier(level) {
            let tier = XP_TIERS[0];
            for (const t of XP_TIERS) {
                if (level >= t.minLevel) tier = t;
            }
            return tier;
        }

        function loadXP() {
            const saved = localStorage.getItem(XP_STORAGE_KEY);
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    playerXP = parseStoredNumber(data.xp, 0);
                    playerLevel = parseStoredNumber(data.level, 1);
                    if (playerLevel < 1) playerLevel = 1;
                } catch { playerXP = 0; playerLevel = 1; }
            }
        }

        function saveXP() {
            localStorage.setItem(XP_STORAGE_KEY, JSON.stringify({ xp: playerXP, level: playerLevel }));
        }

        function awardXP(amount) {
            playerXP += amount;
            let levelledUp = false;
            let needed = getXPForLevel(playerLevel);
            while (playerXP >= needed) {
                playerXP -= needed;
                playerLevel++;
                levelledUp = true;
                needed = getXPForLevel(playerLevel);
            }
            saveXP();
            updateXPDisplay();
            if (levelledUp) {
                showToast(`Level Up! You are now Level ${playerLevel}!`, 'levelup');
            }
        }

        function updateXPDisplay() {
            const tier = getTier(playerLevel);
            const needed = getXPForLevel(playerLevel);
            const pct = Math.min(100, (playerXP / needed) * 100);

            const badge = document.getElementById('levelBadge');
            const tierLabel = document.getElementById('tierLabel');
            const fill = document.getElementById('xpBarFill');
            const text = document.getElementById('xpBarText');

            if (badge) {
                badge.textContent = playerLevel;
                badge.style.borderColor = tier.color;
            }
            if (tierLabel) {
                tierLabel.textContent = tier.name;
                tierLabel.style.color = tier.color;
            }
            if (fill) fill.style.width = pct + '%';
            if (text) text.textContent = `${playerXP} / ${needed} XP`;
        }

        // ===== Toast System =====
        function showToast(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            if (!container) return;

            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            container.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('toast-exit');
                setTimeout(() => toast.remove(), 400);
            }, 3500);
        }

        // ===== Daily Bonus System =====
        const DAILY_BONUS_KEY = 'casinoDailyBonus';
        const DAILY_REWARDS = [
            { amount: 500, xp: 25 },
            { amount: 750, xp: 35 },
            { amount: 1000, xp: 50 },
            { amount: 1500, xp: 75 },
            { amount: 2000, xp: 100 },
            { amount: 3000, xp: 150 },
            { amount: 5000, xp: 250 }
        ];

        let dailyBonusState = { streak: 0, lastClaim: null, claimedToday: false };

        function loadDailyBonus() {
            const saved = localStorage.getItem(DAILY_BONUS_KEY);
            if (saved) {
                try {
                    dailyBonusState = JSON.parse(saved);
                } catch { dailyBonusState = { streak: 0, lastClaim: null, claimedToday: false }; }
            }
            checkDailyBonusReset();
        }

        function saveDailyBonus() {
            localStorage.setItem(DAILY_BONUS_KEY, JSON.stringify(dailyBonusState));
        }

        function getTodayStr() {
            return new Date().toISOString().slice(0, 10);
        }

        function checkDailyBonusReset() {
            const today = getTodayStr();
            if (dailyBonusState.lastClaim === today) {
                dailyBonusState.claimedToday = true;
                return;
            }

            dailyBonusState.claimedToday = false;

            if (dailyBonusState.lastClaim) {
                const last = new Date(dailyBonusState.lastClaim);
                const now = new Date(today);
                const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
                if (diffDays > 1) {
                    dailyBonusState.streak = 0;
                }
            }
        }

        function showDailyBonusModal() {
            checkDailyBonusReset();
            renderDailyCalendar();
            document.getElementById('dailyBonusModal').classList.add('active');
        }

        function closeDailyBonusModal() {
            document.getElementById('dailyBonusModal').classList.remove('active');
        }

        function renderDailyCalendar() {
            const cal = document.getElementById('dailyCalendar');
            const streakEl = document.getElementById('streakCount');
            const claimBtn = document.getElementById('dailyClaimBtn');
            if (!cal) return;

            streakEl.textContent = dailyBonusState.streak;
            claimBtn.disabled = dailyBonusState.claimedToday;
            claimBtn.textContent = dailyBonusState.claimedToday ? 'CLAIMED TODAY' : 'CLAIM BONUS';

            let html = '';
            for (let i = 0; i < 7; i++) {
                const reward = DAILY_REWARDS[i];
                const isClaimed = i < dailyBonusState.streak;
                const isToday = i === dailyBonusState.streak && !dailyBonusState.claimedToday;
                const isLocked = i > dailyBonusState.streak;
                const isTodayClaimed = i === dailyBonusState.streak - 1 && dailyBonusState.claimedToday;

                let cls = 'daily-day';
                if (isClaimed || isTodayClaimed) cls += ' day-claimed';
                else if (isToday) cls += ' day-today';
                else if (isLocked) cls += ' day-locked';

                html += `
                    <div class="${cls}">
                        <div class="day-number">DAY ${i + 1}</div>
                        <div class="day-reward">$${reward.amount.toLocaleString()}</div>
                        <div class="day-xp">+${reward.xp} XP</div>
                    </div>
                `;
            }
            cal.innerHTML = html;
        }

        function claimDailyBonus() {
            if (dailyBonusState.claimedToday) return;

            const dayIndex = Math.min(dailyBonusState.streak, DAILY_REWARDS.length - 1);
            const reward = DAILY_REWARDS[dayIndex];

            balance += reward.amount;
            updateBalance();
            awardXP(reward.xp);

            dailyBonusState.streak++;
            if (dailyBonusState.streak > 7) dailyBonusState.streak = 7;
            dailyBonusState.lastClaim = getTodayStr();
            dailyBonusState.claimedToday = true;
            saveDailyBonus();

            playSound('bigwin');
            showToast(`Daily Bonus: +$${reward.amount.toLocaleString()} and +${reward.xp} XP!`, 'win');
            createConfetti();

            renderDailyCalendar();

            setTimeout(() => closeDailyBonusModal(), 2000);
        }

        // ===== Bonus Wheel =====
        const WHEEL_SEGMENTS = [
            { label: '$100', value: 100, color: '#ef4444', xp: 10 },
            { label: '$250', value: 250, color: '#3b82f6', xp: 20 },
            { label: '$500', value: 500, color: '#10b981', xp: 30 },
            { label: '$1000', value: 1000, color: '#f59e0b', xp: 50 },
            { label: '$2500', value: 2500, color: '#8b5cf6', xp: 75 },
            { label: '$100', value: 100, color: '#ec4899', xp: 10 },
            { label: '$250', value: 250, color: '#06b6d4', xp: 20 },
            { label: '$5000', value: 5000, color: '#ffd700', xp: 150 }
        ];

        const WHEEL_STORAGE_KEY = 'casinoBonusWheel';
        let wheelSpinning = false;
        let wheelAngle = 0;
        let wheelState = { lastSpin: null };

        function loadWheelState() {
            const saved = localStorage.getItem(WHEEL_STORAGE_KEY);
            if (saved) {
                try { wheelState = JSON.parse(saved); } catch { wheelState = { lastSpin: null }; }
            }
        }

        function saveWheelState() {
            localStorage.setItem(WHEEL_STORAGE_KEY, JSON.stringify(wheelState));
        }

        function canSpinWheel() {
            if (!wheelState.lastSpin) return true;
            const last = new Date(wheelState.lastSpin);
            const now = new Date();
            const diffHours = (now - last) / (1000 * 60 * 60);
            return diffHours >= 4;
        }

        function drawWheel(highlightIndex = -1) {
            const canvas = document.getElementById('wheelCanvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const r = cx - 4;
            const segAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            WHEEL_SEGMENTS.forEach((seg, i) => {
                const startAngle = wheelAngle + i * segAngle;
                const endAngle = startAngle + segAngle;

                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, r, startAngle, endAngle);
                ctx.closePath();
                ctx.fillStyle = i === highlightIndex ? '#fff' : seg.color;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Label
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(startAngle + segAngle / 2);
                ctx.textAlign = 'right';
                ctx.fillStyle = i === highlightIndex ? '#000' : '#fff';
                ctx.font = 'bold 14px sans-serif';
                ctx.fillText(seg.label, r - 12, 5);
                ctx.restore();
            });

            // Center circle
            ctx.beginPath();
            ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
            ctx.fillStyle = '#1e293b';
            ctx.fill();
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        function showBonusWheelModal() {
            loadWheelState();
            const spinBtn = document.getElementById('wheelSpinBtn');
            if (!canSpinWheel()) {
                spinBtn.disabled = true;
                spinBtn.textContent = 'NEXT SPIN IN A FEW HOURS';
            } else {
                spinBtn.disabled = false;
                spinBtn.textContent = 'SPIN THE WHEEL';
            }
            drawWheel();
            document.getElementById('bonusWheelModal').classList.add('active');
        }

        function closeBonusWheelModal() {
            document.getElementById('bonusWheelModal').classList.remove('active');
        }

        function spinBonusWheel() {
            if (wheelSpinning || !canSpinWheel()) return;
            wheelSpinning = true;

            const spinBtn = document.getElementById('wheelSpinBtn');
            spinBtn.disabled = true;
            spinBtn.textContent = 'SPINNING...';

            playSound('spin');

            const winIndex = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
            const segAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;
            // We want the winning segment at the top (270deg / -PI/2)
            // The pointer is at top, reading from angle -PI/2
            const targetAngle = -(winIndex * segAngle + segAngle / 2) - Math.PI / 2;
            const totalRotation = targetAngle + Math.PI * 2 * (5 + Math.random() * 3);

            const startAngle = wheelAngle;
            const duration = 4000;
            const startTime = performance.now();

            function animateWheel(now) {
                const elapsed = now - startTime;
                const t = Math.min(elapsed / duration, 1);
                // Ease out cubic
                const ease = 1 - Math.pow(1 - t, 3);
                wheelAngle = startAngle + (totalRotation - startAngle) * ease;

                drawWheel();

                if (t < 1) {
                    requestAnimationFrame(animateWheel);
                } else {
                    // Landed
                    wheelAngle = totalRotation % (2 * Math.PI);
                    const seg = WHEEL_SEGMENTS[winIndex];

                    balance += seg.value;
                    updateBalance();
                    awardXP(seg.xp);

                    wheelState.lastSpin = new Date().toISOString();
                    saveWheelState();

                    playSound('bigwin');
                    showToast(`Bonus Wheel: +$${seg.value.toLocaleString()} and +${seg.xp} XP!`, 'win');
                    createConfetti();

                    drawWheel(winIndex);

                    wheelSpinning = false;
                    spinBtn.textContent = 'NEXT SPIN IN A FEW HOURS';

                    setTimeout(() => closeBonusWheelModal(), 3000);
                }
            }

            requestAnimationFrame(animateWheel);
        }

        // ===== Win Ticker =====
        const TICKER_NAMES = [
            'LuckyAce', 'JackpotKing', 'SlotMaster', 'BigWinner',
            'CasinoQueen', 'DiamondDan', 'GoldenStar', 'RoyalFlush',
            'MegaSpinner', 'FortuneHunter', 'VelvetRoller', 'NeonNight',
            'CherryBomb77', 'WildCard', 'HighStakes'
        ];

        let tickerInterval = null;

        function generateTickerMessage() {
            const name = TICKER_NAMES[Math.floor(Math.random() * TICKER_NAMES.length)];
            const game = games[Math.floor(Math.random() * games.length)];
            const multiplier = Math.floor(Math.random() * game.payouts.triple) + game.payouts.double;
            const bet = game.minBet + Math.floor(Math.random() * (game.maxBet - game.minBet) / game.minBet) * game.minBet;
            const win = bet * multiplier;
            return `${name} won $${win.toLocaleString()} on ${game.name}!`;
        }

        function startWinTicker() {
            const content = document.getElementById('tickerContent');
            if (!content) return;

            // Clear any existing ticker interval to prevent leaks on re-init
            if (tickerInterval) clearInterval(tickerInterval);

            // Initial messages
            let messages = [];
            for (let i = 0; i < 5; i++) {
                messages.push(generateTickerMessage());
            }
            renderTickerContent(messages);

            tickerInterval = setInterval(() => {
                messages.push(generateTickerMessage());
                if (messages.length > 8) messages.shift();
                renderTickerContent(messages);
            }, 4000);
        }

        function renderTickerContent(messages) {
            const content = document.getElementById('tickerContent');
            if (!content) return;
            content.innerHTML = messages.map(m =>
                `<span class="ticker-item">${m}</span>`
            ).join('');
        }

        // ===== Auto-Spin =====
        let autoSpinActive = false;
        let autoSpinCount = 0;
        let autoSpinMax = 0;

        function toggleAutoSpin(count) {
            if (autoSpinActive) {
                stopAutoSpin();
                return;
            }
            autoSpinActive = true;
            autoSpinMax = count;
            autoSpinCount = 0;
            updateAutoSpinUI();
            runAutoSpin();
        }

        function stopAutoSpin() {
            autoSpinActive = false;
            autoSpinCount = 0;
            autoSpinMax = 0;
            updateAutoSpinUI();
        }

        function updateAutoSpinUI() {
            const btn = document.getElementById('autoSpinBtn');
            if (!btn) return;
            if (autoSpinActive) {
                btn.innerHTML = `<span class="auto-btn-icon">\u25A0</span><span class="auto-btn-label">STOP (${autoSpinMax - autoSpinCount})</span>`;
                btn.classList.add('auto-spin-active');
            } else {
                btn.innerHTML = '<span class="auto-btn-icon">\u21BB</span><span class="auto-btn-label">AUTO</span>';
                btn.classList.remove('auto-spin-active');
            }
        }

        function runAutoSpin() {
            if (!autoSpinActive || !currentGame) {
                stopAutoSpin();
                return;
            }
            if (autoSpinCount >= autoSpinMax) {
                stopAutoSpin();
                return;
            }
            if (currentBet > balance) {
                showToast('Auto-spin stopped: insufficient balance.', 'lose');
                stopAutoSpin();
                return;
            }
            if (spinning || freeSpinsActive) {
                // Poll until current spin/free spins finish
                setTimeout(runAutoSpin, 500);
                return;
            }

            autoSpinCount++;
            updateAutoSpinUI();
            spin();

            // Poll for spin completion instead of fixed timeout
            waitForSpinThenContinue();
        }

        function waitForSpinThenContinue() {
            if (!autoSpinActive) return;
            if (spinning || freeSpinsActive) {
                setTimeout(waitForSpinThenContinue, 300);
                return;
            }
            // Small pause between spins for readability
            setTimeout(runAutoSpin, turboMode ? 400 : 800);
        }

        // ===== Update init to include new systems =====
        async function initAllSystems() {
            loadXP();
            loadDailyBonus();
            loadWheelState();
            initBase();

            // New systems
            updateXPDisplay();
            startWinTicker();
            updateAuthButton();

            // Show daily bonus if not claimed today
            checkDailyBonusReset();
            const urlParams = new URLSearchParams(window.location.search);
            const suppressBonus = urlParams.get('qaTools') === '1' || urlParams.get('qaTools') === 'true'
                || urlParams.get('noBonus') === '1' || urlParams.get('autoSpin') === '1';
            if (!dailyBonusState.claimedToday && !suppressBonus) {
                setTimeout(() => showDailyBonusModal(), 1500);
            }
        }

        // Initialize on load
        window.addEventListener('DOMContentLoaded', initAllSystems);
