require('dotenv').config();

module.exports = {
    PORT: parseInt(process.env.PORT, 10) || 3000,
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    JWT_EXPIRES_IN: '7d',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123changeme',
    NODE_ENV: process.env.NODE_ENV || 'development',
    DB_PATH: process.env.DB_PATH || './casino.db',
    DATABASE_URL: process.env.DATABASE_URL || null,

    // Game limits
    MAX_SPINS_PER_SECOND: 2,
    MIN_BET: 0.20,
    MAX_BET: 50000,
    DEFAULT_BALANCE: 1000,
    DEMO_BALANCE: 5000,

    // House edge — guaranteed profit
    TARGET_RTP: 0.88,              // 88% payout = 12% house edge
    RTP_ADJUSTMENT_THRESHOLD: 0.02,
    MAX_WIN_MULTIPLIER: 500,       // No single spin can win more than 500x bet
    PROFIT_FLOOR: -500,            // Emergency mode if house is down $500+
    SESSION_WIN_CAP: 50000,        // Player can't win more than $50k per session
    MAX_PAYOUT_PROFIT_PCT: 0.20,   // Single payout never exceeds 20% of total site profit
    MIN_WIN_MULTIPLIER_FLOOR: 2,   // Minimum win floor (2x bet) to keep game playable at low profit

    // Payment configuration
    CURRENCY: 'AUD',
    MIN_DEPOSIT: 5,
    MAX_DEPOSIT: 100000,
    MIN_WITHDRAWAL: 20,
    MAX_WITHDRAWAL: 50000,
    WITHDRAWAL_PROCESSING_DAYS: 3,
    PAYMENT_METHODS: ['visa', 'mastercard', 'payid', 'bank_transfer', 'crypto_btc', 'crypto_eth', 'crypto_usdt'],

    // First-deposit bonus
    FIRST_DEPOSIT_BONUS_PCT: 100,    // 100% match
    FIRST_DEPOSIT_BONUS_MAX: 500,    // cap at $500
    FIRST_DEPOSIT_WAGERING_MULT: 30,  // 30x playthrough on first deposit bonus
    RELOAD_BONUS_PCT: 50,             // 50% match on reload deposits
    RELOAD_BONUS_MAX: 250,            // cap reload bonus at $250
    RELOAD_WAGERING_MULT: 25,         // 25x playthrough on reload bonus

    // Password reset
    PASSWORD_RESET_EXPIRY_HOURS: 1,
    PASSWORD_RESET_MAX_ACTIVE: 3,

    // Email / SMTP (optional — password reset emails require these to be set)
    SMTP_HOST:   process.env.SMTP_HOST   || null,
    SMTP_PORT:   parseInt(process.env.SMTP_PORT, 10) || 587,
    SMTP_SECURE: process.env.SMTP_SECURE === 'true',   // true = SSL/465, false = STARTTLS/587
    SMTP_USER:   process.env.SMTP_USER   || null,
    SMTP_PASS:   process.env.SMTP_PASS   || null,
    SMTP_FROM:   process.env.SMTP_FROM   || '"Matrix Spins" <noreply@msaart.online>',

    // Jackpot pooling
    JACKPOT_CONTRIBUTION_RATE: 0.005,   // 0.5% of every bet feeds jackpot pool
    JACKPOT_TIERS: {
        mini:  { seed: 100,   mustHitAt: 500 },
        minor: { seed: 500,   mustHitAt: 2500 },
        major: { seed: 2500,  mustHitAt: 15000 },
        grand: { seed: 25000, mustHitAt: 100000 }
    },
    JACKPOT_MINI_WIN_CHANCE: 0.001,     // 0.1% per spin
    JACKPOT_MINOR_WIN_CHANCE: 0.0002,   // 0.02% per spin
    JACKPOT_MAJOR_WIN_CHANCE: 0.00004,  // 0.004% per spin
    JACKPOT_GRAND_WIN_CHANCE: 0.000005, // 0.0005% per spin

    // Responsible gambling defaults
    DEFAULT_DAILY_DEPOSIT_LIMIT: null,   // No limit by default
    DEFAULT_SESSION_TIME_LIMIT: null,    // No limit by default
    COOLING_OFF_PERIODS: [24, 48, 72, 168, 720], // Hours: 1d, 2d, 3d, 1w, 30d
};
