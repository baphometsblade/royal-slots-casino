/**
 * SQLite schema DDL — extracted verbatim from the original database.js.
 * Used by sqlite-backend.js during initialisation.
 */

'use strict';

const TABLES = [
    `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        balance REAL DEFAULT 0,
        is_admin INTEGER DEFAULT 0,
        is_banned INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        balance_before REAL NOT NULL,
        balance_after REAL NOT NULL,
        reference TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    `CREATE TABLE IF NOT EXISTS spins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        game_id TEXT NOT NULL,
        bet_amount REAL NOT NULL,
        result_grid TEXT NOT NULL,
        win_amount REAL NOT NULL,
        rng_seed TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    `CREATE TABLE IF NOT EXISTS game_stats (
        game_id TEXT PRIMARY KEY,
        total_spins INTEGER DEFAULT 0,
        total_wagered REAL DEFAULT 0,
        total_paid REAL DEFAULT 0,
        actual_rtp REAL DEFAULT 0
    )`,

    `CREATE TABLE IF NOT EXISTS session_win_caps (
        user_id INTEGER PRIMARY KEY,
        total_wins REAL DEFAULT 0,
        session_start TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    `CREATE TABLE IF NOT EXISTS payment_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        details_encrypted TEXT,
        is_default INTEGER DEFAULT 0,
        is_verified INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    `CREATE TABLE IF NOT EXISTS deposits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'AUD',
        payment_method_id INTEGER,
        payment_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        reference TEXT,
        external_ref TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
    )`,

    `CREATE TABLE IF NOT EXISTS withdrawals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'AUD',
        payment_method_id INTEGER,
        payment_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        admin_note TEXT,
        reference TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        processed_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
    )`,

    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    `CREATE TABLE IF NOT EXISTS user_verification (
        user_id INTEGER PRIMARY KEY,
        status TEXT DEFAULT 'unverified',
        document_type TEXT,
        submitted_at TEXT,
        verified_at TEXT,
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    `CREATE TABLE IF NOT EXISTS user_limits (
        user_id INTEGER PRIMARY KEY,
        daily_deposit_limit REAL,
        weekly_deposit_limit REAL,
        monthly_deposit_limit REAL,
        daily_loss_limit REAL,
        session_time_limit INTEGER,
        self_excluded_until TEXT,
        cooling_off_until TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    `CREATE TABLE IF NOT EXISTS jackpot_pool (
        tier TEXT PRIMARY KEY,
        current_amount REAL NOT NULL,
        seed_amount REAL NOT NULL,
        contribution_rate REAL NOT NULL,
        total_contributed REAL DEFAULT 0,
        total_paid_out REAL DEFAULT 0,
        last_won_at TEXT,
        last_winner_id INTEGER,
        FOREIGN KEY (last_winner_id) REFERENCES users(id)
    )`,
];

const INDEXES = [
    `CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_spins_user ON spins(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_spins_game ON spins(game_id)`,
    `CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_jackpot_tier ON jackpot_pool(tier)`,
];

/** Extra columns added via migrations (column name → definition). */
const USER_MIGRATIONS = [
    ['display_name', 'TEXT'],
    ['avatar_url', 'TEXT'],
    ['phone', 'TEXT'],
    ['date_of_birth', 'TEXT'],
    ['country', 'TEXT'],
    ['currency', "TEXT DEFAULT 'AUD'"],
    ['email_verified', 'INTEGER DEFAULT 0'],
    ['phone_verified', 'INTEGER DEFAULT 0'],
    ['kyc_status', "TEXT DEFAULT 'unverified'"],
    ['updated_at', 'TEXT'],
];

module.exports = { TABLES, INDEXES, USER_MIGRATIONS };
