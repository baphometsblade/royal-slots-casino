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
    )`    ,

    `CREATE TABLE IF NOT EXISTS tournaments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        prize_pool REAL DEFAULT 0,
        entry_fee REAL DEFAULT 0,
        status TEXT DEFAULT 'upcoming',
        starts_at TEXT NOT NULL,
        ends_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS tournament_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        best_mult REAL DEFAULT 0,
        spins INTEGER DEFAULT 0,
        joined_at TEXT DEFAULT (datetime('now')),
        UNIQUE(tournament_id, user_id),
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    `CREATE TABLE IF NOT EXISTS user_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        achievement_id TEXT NOT NULL,
        unlocked_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, achievement_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    `CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'deposit_match',
        bonus_pct INTEGER DEFAULT 50,
        max_bonus REAL DEFAULT 200,
        wagering_mult INTEGER DEFAULT 25,
        min_deposit REAL DEFAULT 10,
        start_at TEXT NOT NULL,
        end_at TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        promo_code TEXT,
        target_segment TEXT DEFAULT 'all',
        max_claims INTEGER DEFAULT 0,
        claims_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS campaign_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        claimed_at TEXT DEFAULT (datetime('now')),
        bonus_amount REAL DEFAULT 0,
        UNIQUE(campaign_id, user_id),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    `CREATE TABLE IF NOT EXISTS gifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_user_id INTEGER NOT NULL,
        to_user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        message TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now')),
        claimed_at TEXT DEFAULT NULL,
        FOREIGN KEY (from_user_id) REFERENCES users(id),
        FOREIGN KEY (to_user_id) REFERENCES users(id)
    )`,

    `CREATE TABLE IF NOT EXISTS contests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        week_start TEXT NOT NULL,
        week_end TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        finalized_at TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS contest_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contest_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        metric_type TEXT NOT NULL,
        metric_value REAL DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (contest_id) REFERENCES contests(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(contest_id, user_id, metric_type)
    )`,

    `CREATE TABLE IF NOT EXISTS contest_prizes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contest_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        rank INTEGER NOT NULL,
        metric_type TEXT NOT NULL,
        prize_amount REAL NOT NULL,
        claimed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS bonus_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        event_type TEXT NOT NULL,
        multiplier REAL DEFAULT 2.0,
        target_games TEXT DEFAULT 'all',
        active INTEGER DEFAULT 1,
        start_at TEXT NOT NULL,
        end_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS battle_pass_seasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        starts_at TEXT NOT NULL,
        ends_at TEXT NOT NULL,
        status TEXT DEFAULT 'active'
    )`,

    `CREATE TABLE IF NOT EXISTS battle_pass_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        season_id INTEGER NOT NULL,
        level INTEGER DEFAULT 0,
        xp INTEGER DEFAULT 0,
        is_premium INTEGER DEFAULT 0,
        claimed_free TEXT DEFAULT '[]',
        claimed_premium TEXT DEFAULT '[]',
        UNIQUE(user_id, season_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (season_id) REFERENCES battle_pass_seasons(id)
    )`,

    `CREATE TABLE IF NOT EXISTS nft_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token_id TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'AUD',
        source_table TEXT NOT NULL,
        source_id INTEGER NOT NULL,
        metadata TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`
];


const INDEXES = [
    `CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_spins_user ON spins(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_spins_game ON spins(game_id)`,
    `CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_jackpot_tier ON jackpot_pool(tier)`    ,
    `CREATE INDEX IF NOT EXISTS idx_tournament_status ON tournaments(status)`,
    `CREATE INDEX IF NOT EXISTS idx_tournament_entries_tid ON tournament_entries(tournament_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tournament_entries_uid ON tournament_entries(user_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_spins_wins ON spins(win_amount, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_campaigns_active ON campaigns(active, start_at, end_at)`,
    `CREATE INDEX IF NOT EXISTS idx_campaign_claims_cid ON campaign_claims(campaign_id)`,
    `CREATE INDEX IF NOT EXISTS idx_campaign_claims_uid ON campaign_claims(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_gifts_to ON gifts(to_user_id, status)`,
    `CREATE INDEX IF NOT EXISTS idx_gifts_from ON gifts(from_user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_contest_entries_rank ON contest_entries(contest_id, metric_type, metric_value DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_contest_prizes_user ON contest_prizes(user_id, claimed)`,
    `CREATE INDEX IF NOT EXISTS idx_contests_status ON contests(status)`,
    `CREATE INDEX IF NOT EXISTS idx_bonus_events_active ON bonus_events(active, start_at, end_at)`,
    `CREATE INDEX IF NOT EXISTS idx_battle_pass_seasons_status ON battle_pass_seasons(status)`,
    `CREATE INDEX IF NOT EXISTS idx_battle_pass_progress_user ON battle_pass_progress(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_battle_pass_progress_season ON battle_pass_progress(season_id)`,
    `CREATE INDEX IF NOT EXISTS idx_nft_ledger_user ON nft_ledger(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_nft_ledger_token ON nft_ledger(token_id)`,
    `CREATE INDEX IF NOT EXISTS idx_nft_ledger_type ON nft_ledger(type, created_at)`
];


/** Extra columns added via migrations (column name → definition).
 *  Must stay in sync with schema-pg.js USER_MIGRATIONS. */
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
    ['stats_json', 'TEXT'],
    ['last_daily_claim', 'TEXT'],
    ['daily_streak', 'INTEGER DEFAULT 0'],
    ['last_wheel_spin', 'TEXT'],
    ['promo_codes_used', 'TEXT'],
    ['referral_code', 'TEXT'],
    ['referred_by', 'INTEGER'],
    ['referral_bonus_paid', 'INTEGER DEFAULT 0'],
    ['bonus_balance', 'REAL DEFAULT 0'],
    ['wagering_requirement', 'REAL DEFAULT 0'],
    ['wagering_progress', 'REAL DEFAULT 0'],
    ['subscription_active', 'INTEGER DEFAULT 0'],
    ['subscription_tier', 'TEXT'],
    ['subscription_expires', 'TEXT'],
    ['subscription_daily_claimed', 'TEXT'],
    ['xp', 'INTEGER DEFAULT 0'],
    // Birthday bonus
    ['birth_month', 'INTEGER'],
    ['birth_day', 'INTEGER'],
    ['birthday_claimed', 'TEXT'],
    // Daily cashback
    ['cashback_last', 'TEXT'],
    // First deposit bonus
    ['first_deposit_bonus_claimed', 'INTEGER DEFAULT 0'],
    // Free spins
    ['free_spins_count', 'INTEGER DEFAULT 0'],
    ['free_spins_expires', 'TEXT'],
    ['free_spins_last_auto', 'TEXT'],
    // Deposit streak
    ['deposit_streak', 'INTEGER DEFAULT 0'],
    ['deposit_streak_last', 'TEXT'],
    ['deposit_streak_max', 'INTEGER DEFAULT 0'],
    // Deposit match
    ['deposit_match_credits', 'REAL DEFAULT 0'],
    ['deposit_match_last', 'TEXT'],
    // Fortune wheel
    ['fortune_wheel_last', 'TEXT'],
    ['free_spins_remaining', 'INTEGER DEFAULT 0'],
    // Loyalty
    ['loyalty_points', 'INTEGER DEFAULT 0'],
    ['loyalty_lifetime', 'INTEGER DEFAULT 0'],
    // Milestones
    ['milestone_last_claimed', 'INTEGER DEFAULT 0'],
    // Mystery drops
    ['mystery_next_drop', 'INTEGER DEFAULT 0'],
    // Reload bonus
    ['reload_bonus_claimed_at', 'TEXT'],
    ['reload_bonus_count', 'INTEGER DEFAULT 0'],
    // Referral bonus
    ['referral_count', 'INTEGER DEFAULT 0'],
    ['referral_bonus_earned', 'REAL DEFAULT 0'],
    // Scratch cards
    ['scratch_last_date', 'TEXT'],
    ['scratch_result', 'TEXT'],
    // Spin streak
    ['spin_streak_count', 'INTEGER DEFAULT 0'],
    ['spin_streak_last', 'TEXT'],
    // Login streak
    ['streak_count', 'INTEGER DEFAULT 0'],
    ['streak_last_date', 'TEXT'],
    // VIP wheel
    ['vip_wheel_last', 'TEXT'],
    ['gems', 'INTEGER DEFAULT 0'],
    // Win streak
    ['win_streak_current', 'INTEGER DEFAULT 0'],
    ['win_streak_max', 'INTEGER DEFAULT 0'],
    // Level-up bonus
    ['last_bonus_level', 'INTEGER DEFAULT 1'],
];

/** Extra columns added to withdrawals table via migrations (column name → definition). */
const WITHDRAWAL_MIGRATIONS = [
    ['otp_code', 'TEXT'],
    ['otp_attempts', 'INTEGER DEFAULT 0'],
];

module.exports = { TABLES, INDEXES, USER_MIGRATIONS, WITHDRAWAL_MIGRATIONS };
