/**
 * PostgreSQL schema DDL — translated from the SQLite originals.
 *
 * Key differences:
 *   AUTOINCREMENT  → SERIAL
 *   REAL (money)   → NUMERIC(15,2)
 *   datetime('now') → NOW()
 *   INTEGER bool   → INTEGER (kept for compat — PG supports it fine)
 */

'use strict';

const TABLES = [
    `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        balance NUMERIC(15,2) DEFAULT 0,
        is_admin INTEGER DEFAULT 0,
        is_banned INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        amount NUMERIC(15,2) NOT NULL,
        balance_before NUMERIC(15,2) NOT NULL,
        balance_after NUMERIC(15,2) NOT NULL,
        reference TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS spins (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        game_id TEXT NOT NULL,
        bet_amount NUMERIC(15,2) NOT NULL,
        result_grid TEXT NOT NULL,
        win_amount NUMERIC(15,2) NOT NULL,
        rng_seed TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS game_stats (
        game_id TEXT PRIMARY KEY,
        total_spins INTEGER DEFAULT 0,
        total_wagered NUMERIC(15,2) DEFAULT 0,
        total_paid NUMERIC(15,2) DEFAULT 0,
        actual_rtp REAL DEFAULT 0
    )`,

    `CREATE TABLE IF NOT EXISTS session_win_caps (
        user_id INTEGER PRIMARY KEY REFERENCES users(id),
        total_wins NUMERIC(15,2) DEFAULT 0,
        session_start TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS payment_methods (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        details_encrypted TEXT,
        is_default INTEGER DEFAULT 0,
        is_verified INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS deposits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount NUMERIC(15,2) NOT NULL,
        currency TEXT DEFAULT 'AUD',
        payment_method_id INTEGER REFERENCES payment_methods(id),
        payment_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        reference TEXT,
        external_ref TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ
    )`,

    `CREATE TABLE IF NOT EXISTS withdrawals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        amount NUMERIC(15,2) NOT NULL,
        currency TEXT DEFAULT 'AUD',
        payment_method_id INTEGER REFERENCES payment_methods(id),
        payment_type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        admin_note TEXT,
        reference TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        processed_at TIMESTAMPTZ
    )`,

    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS user_verification (
        user_id INTEGER PRIMARY KEY REFERENCES users(id),
        status TEXT DEFAULT 'unverified',
        document_type TEXT,
        submitted_at TIMESTAMPTZ,
        verified_at TIMESTAMPTZ,
        notes TEXT
    )`,

    `CREATE TABLE IF NOT EXISTS user_limits (
        user_id INTEGER PRIMARY KEY REFERENCES users(id),
        daily_deposit_limit NUMERIC(15,2),
        weekly_deposit_limit NUMERIC(15,2),
        monthly_deposit_limit NUMERIC(15,2),
        daily_loss_limit NUMERIC(15,2),
        session_time_limit INTEGER,
        self_excluded_until TIMESTAMPTZ,
        cooling_off_until TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS jackpot_pool (
        tier TEXT PRIMARY KEY,
        current_amount NUMERIC(15,2) NOT NULL,
        seed_amount NUMERIC(15,2) NOT NULL,
        contribution_rate REAL NOT NULL,
        total_contributed NUMERIC(15,2) DEFAULT 0,
        total_paid_out NUMERIC(15,2) DEFAULT 0,
        last_won_at TIMESTAMPTZ,
        last_winner_id INTEGER REFERENCES users(id)
    )`    ,

    `CREATE TABLE IF NOT EXISTS tournaments (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        prize_pool NUMERIC(15,2) DEFAULT 0,
        entry_fee NUMERIC(15,2) DEFAULT 0,
        status TEXT DEFAULT 'upcoming',
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS tournament_entries (
        id SERIAL PRIMARY KEY,
        tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        best_mult NUMERIC(15,4) DEFAULT 0,
        spins INTEGER DEFAULT 0,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tournament_id, user_id)
    )`,

    `CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        achievement_id TEXT NOT NULL,
        unlocked_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, achievement_id)
    )`,

    `CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'deposit_match',
        bonus_pct INTEGER DEFAULT 50,
        max_bonus NUMERIC(15,2) DEFAULT 200,
        wagering_mult INTEGER DEFAULT 25,
        min_deposit NUMERIC(15,2) DEFAULT 10,
        start_at TIMESTAMPTZ NOT NULL,
        end_at TIMESTAMPTZ NOT NULL,
        active INTEGER DEFAULT 1,
        promo_code TEXT,
        target_segment TEXT DEFAULT 'all',
        max_claims INTEGER DEFAULT 0,
        claims_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS campaign_claims (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        claimed_at TIMESTAMPTZ DEFAULT NOW(),
        bonus_amount NUMERIC(15,2) DEFAULT 0,
        UNIQUE(campaign_id, user_id)
    )`,

    `CREATE TABLE IF NOT EXISTS gifts (
        id SERIAL PRIMARY KEY,
        from_user_id INTEGER NOT NULL REFERENCES users(id),
        to_user_id INTEGER NOT NULL REFERENCES users(id),
        amount NUMERIC(15,2) NOT NULL,
        message TEXT DEFAULT '',
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        claimed_at TIMESTAMPTZ DEFAULT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS contests (
        id SERIAL PRIMARY KEY,
        week_start TIMESTAMPTZ NOT NULL,
        week_end TIMESTAMPTZ NOT NULL,
        status TEXT DEFAULT 'active',
        finalized_at TIMESTAMPTZ DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS contest_entries (
        id SERIAL PRIMARY KEY,
        contest_id INTEGER NOT NULL REFERENCES contests(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        metric_type TEXT NOT NULL,
        metric_value NUMERIC(15,2) DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(contest_id, user_id, metric_type)
    )`,

    `CREATE TABLE IF NOT EXISTS contest_prizes (
        id SERIAL PRIMARY KEY,
        contest_id INTEGER NOT NULL REFERENCES contests(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        rank INTEGER NOT NULL,
        metric_type TEXT NOT NULL,
        prize_amount NUMERIC(15,2) NOT NULL,
        claimed INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS bonus_events (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        event_type TEXT NOT NULL,
        multiplier NUMERIC(5,2) DEFAULT 2.0,
        target_games TEXT DEFAULT 'all',
        active INTEGER DEFAULT 1,
        start_at TIMESTAMPTZ NOT NULL,
        end_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    `CREATE TABLE IF NOT EXISTS battle_pass_seasons (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        status VARCHAR(20) DEFAULT 'active'
    )`,

    `CREATE TABLE IF NOT EXISTS battle_pass_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        season_id INTEGER NOT NULL REFERENCES battle_pass_seasons(id),
        level INTEGER DEFAULT 0,
        xp INTEGER DEFAULT 0,
        is_premium SMALLINT DEFAULT 0,
        claimed_free TEXT DEFAULT '[]',
        claimed_premium TEXT DEFAULT '[]',
        UNIQUE(user_id, season_id)
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
    `CREATE INDEX IF NOT EXISTS idx_battle_pass_progress_season ON battle_pass_progress(season_id)`
];


/** Extra columns added via migrations (column name → PG definition). */
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
    ['updated_at', 'TIMESTAMPTZ'],
    ['stats_json', 'TEXT'],
    ['last_daily_claim', 'TEXT'],
    ['daily_streak', 'INTEGER DEFAULT 0'],
    ['last_wheel_spin', 'TIMESTAMPTZ'],
    ['promo_codes_used', 'TEXT'],
    ['referral_code', 'TEXT'],
    ['referred_by', 'INTEGER'],
    ['referral_bonus_paid', 'INTEGER DEFAULT 0'],
    ['bonus_balance', 'NUMERIC(15,2) DEFAULT 0'],
    ['wagering_requirement', 'NUMERIC(15,2) DEFAULT 0'],
    ['wagering_progress', 'NUMERIC(15,2) DEFAULT 0'],
    ['subscription_active', 'SMALLINT DEFAULT 0'],
    ['subscription_tier', 'VARCHAR(20)'],
    ['subscription_expires', 'TIMESTAMPTZ'],
    ['subscription_daily_claimed', 'DATE'],
    ['xp', 'INTEGER DEFAULT 0'],
];

/** Extra columns added to withdrawals table via migrations (column name → PG definition). */
const WITHDRAWAL_MIGRATIONS = [
    ['otp_code', 'TEXT'],
    ['otp_attempts', 'INTEGER DEFAULT 0'],
];

module.exports = { TABLES, INDEXES, USER_MIGRATIONS, WITHDRAWAL_MIGRATIONS };
