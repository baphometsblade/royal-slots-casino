'use strict';
const db = require('../database');

// ── Schema Init ─────────────────────────────────────────────────────────

async function initSchema() {
    const isPg      = !!process.env.DATABASE_URL;
    const tsType    = isPg ? 'TIMESTAMPTZ' : 'TEXT';
    const tsDefault = isPg ? 'NOW()' : "(datetime('now'))";
    const idDef     = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    await db.run(`CREATE TABLE IF NOT EXISTS cosmetic_items (
        id ${idDef},
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        gem_price INTEGER NOT NULL,
        rarity TEXT DEFAULT 'common',
        is_limited INTEGER DEFAULT 0,
        image_key TEXT,
        created_at ${tsType} DEFAULT ${tsDefault}
    )`);

    await db.run(`CREATE TABLE IF NOT EXISTS cosmetic_inventory (
        id ${idDef},
        user_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        equipped INTEGER DEFAULT 0,
        purchased_at ${tsType} DEFAULT ${tsDefault},
        UNIQUE(user_id, item_id)
    )`);

    // Seed default catalog if empty
    const count = await db.get('SELECT COUNT(*) as c FROM cosmetic_items');
    if (count.c === 0) {
        console.log('[Cosmetics] Seeding default catalog...');

        // Avatars
        await db.run(`INSERT INTO cosmetic_items (category, name, description, gem_price, rarity, image_key) VALUES
            ('avatar', 'Golden Crown',   'Classic gold crown avatar',       200, 'common',    'avatar_golden_crown'),
            ('avatar', 'Diamond King',   'Sparkling diamond royalty',       500, 'rare',      'avatar_diamond_king'),
            ('avatar', 'Neon Skull',     'Cyberpunk skull avatar',          300, 'uncommon',  'avatar_neon_skull'),
            ('avatar', 'Fire Phoenix',   'Rising phoenix in flames',        800, 'epic',      'avatar_fire_phoenix'),
            ('avatar', 'Lucky Cat',      'Maneki-neko good fortune',        200, 'common',    'avatar_lucky_cat'),
            ('avatar', 'Casino Royale',  'James Bond-inspired avatar',     1000, 'legendary', 'avatar_casino_royale')`);

        // Card Backs / Slot Frames
        await db.run(`INSERT INTO cosmetic_items (category, name, description, gem_price, rarity, image_key) VALUES
            ('cardback', 'Chrome Steel',     'Brushed metal frame',          500, 'common',    'cardback_chrome_steel'),
            ('cardback', 'Golden Luxury',    '24k gold plated frame',       1000, 'rare',      'cardback_golden_luxury'),
            ('cardback', 'Neon Pulse',       'Animated neon border',         800, 'uncommon',  'cardback_neon_pulse'),
            ('cardback', 'Diamond Encrust',  'Diamond-studded frame',       2000, 'epic',      'cardback_diamond_encrust')`);

        // Win Effects
        await db.run(`INSERT INTO cosmetic_items (category, name, description, gem_price, rarity, image_key) VALUES
            ('wineffect', 'Fireworks Burst',   'Colorful fireworks on big wins',  1500, 'rare',      'wineffect_fireworks'),
            ('wineffect', 'Gold Rain',         'Shower of gold coins',            2000, 'epic',      'wineffect_gold_rain'),
            ('wineffect', 'Lightning Strike',  'Electric lightning celebration',   1500, 'rare',      'wineffect_lightning'),
            ('wineffect', 'Rainbow Cascade',   'Full rainbow light show',         3000, 'legendary', 'wineffect_rainbow')`);

        // Lobby Themes
        await db.run(`INSERT INTO cosmetic_items (category, name, description, gem_price, rarity, image_key) VALUES
            ('theme', 'Midnight Blue',  'Deep blue casino ambiance',    1000, 'common',    'theme_midnight_blue'),
            ('theme', 'Vegas Gold',     'Classic Vegas golden glow',    2000, 'rare',      'theme_vegas_gold'),
            ('theme', 'Cyber Neon',     'Futuristic neon cityscape',    2500, 'epic',      'theme_cyber_neon'),
            ('theme', 'Royal Purple',   'Opulent purple palace',        3000, 'legendary', 'theme_royal_purple')`);

        console.log('[Cosmetics] Default catalog seeded (18 items)');
    }
}

// ── Core Functions ──────────────────────────────────────────────────────

/**
 * Get all shop items organized by category.
 */
async function getShop() {
    await initSchema();
    const rows = await db.all('SELECT * FROM cosmetic_items ORDER BY category, gem_price ASC');

    const shop = {};
    for (const row of rows) {
        if (!shop[row.category]) {
            shop[row.category] = [];
        }
        shop[row.category].push(row);
    }
    return shop;
}

/**
 * Get a user's inventory (owned items with item details).
 */
async function getInventory(userId) {
    await initSchema();
    const rows = await db.all(`
        SELECT ci.*, inv.equipped, inv.purchased_at AS owned_since
        FROM cosmetic_inventory inv
        JOIN cosmetic_items ci ON inv.item_id = ci.id
        WHERE inv.user_id = ?
        ORDER BY ci.category, ci.name
    `, [userId]);
    return rows;
}

/**
 * Purchase a cosmetic item with gems.
 */
async function purchaseItem(userId, itemId) {
    await initSchema();

    // Validate item exists
    const item = await db.get('SELECT * FROM cosmetic_items WHERE id = ?', [itemId]);
    if (!item) {
        throw new Error('Item not found');
    }

    // Check if already owned
    const existing = await db.get(
        'SELECT id FROM cosmetic_inventory WHERE user_id = ? AND item_id = ?',
        [userId, itemId]
    );
    if (existing) {
        throw new Error('You already own this item');
    }

    // Check gem balance
    const gemsService = require('./gems.service');
    const bal = await gemsService.getBalance(userId);
    if (bal.gems < item.gem_price) {
        throw new Error('Not enough gems (need ' + item.gem_price + ', have ' + bal.gems + ')');
    }

    // Spend gems
    await gemsService.spendGems(userId, item.gem_price, 'Cosmetic: ' + item.name);

    // Add to inventory
    await db.run(
        'INSERT INTO cosmetic_inventory (user_id, item_id) VALUES (?, ?)',
        [userId, itemId]
    );

    console.log('[Cosmetics] User %d purchased "%s" for %d gems', userId, item.name, item.gem_price);

    return { success: true, item };
}

/**
 * Equip a cosmetic item. Unequips other items in the same category first.
 */
async function equipItem(userId, itemId, category) {
    await initSchema();

    // Verify ownership
    const owned = await db.get(
        'SELECT id FROM cosmetic_inventory WHERE user_id = ? AND item_id = ?',
        [userId, itemId]
    );
    if (!owned) {
        throw new Error('You do not own this item');
    }

    // Verify category matches (or look it up)
    const item = await db.get('SELECT category FROM cosmetic_items WHERE id = ?', [itemId]);
    if (!item) {
        throw new Error('Item not found');
    }
    const resolvedCategory = category || item.category;

    // Unequip all other items in this category for this user
    await db.run(`
        UPDATE cosmetic_inventory SET equipped = 0
        WHERE user_id = ? AND item_id IN (
            SELECT id FROM cosmetic_items WHERE category = ?
        )
    `, [userId, resolvedCategory]);

    // Equip the selected item
    await db.run(
        'UPDATE cosmetic_inventory SET equipped = 1 WHERE user_id = ? AND item_id = ?',
        [userId, itemId]
    );

    return { success: true };
}

/**
 * Get all equipped cosmetics for a user (one per category max).
 */
async function getEquipped(userId) {
    await initSchema();
    const rows = await db.all(`
        SELECT ci.*, inv.equipped
        FROM cosmetic_inventory inv
        JOIN cosmetic_items ci ON inv.item_id = ci.id
        WHERE inv.user_id = ? AND inv.equipped = 1
        ORDER BY ci.category
    `, [userId]);
    return rows;
}

module.exports = { initSchema, getShop, getInventory, purchaseItem, equipItem, getEquipped };
