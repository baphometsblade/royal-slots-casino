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
    DEFAULT_BALANCE: 0,
    DEMO_BALANCE: 5000,

    // House edge — guaranteed profit
    TARGET_RTP: 0.88,              // 88% payout = 12% house edge
    RTP_ADJUSTMENT_THRESHOLD: 0.02,
    MAX_WIN_MULTIPLIER: 500,       // No single spin can win more than 500x bet
    PROFIT_FLOOR: -500,            // Emergency mode if house is down $500+
    SESSION_WIN_CAP: 50000,        // Player can't win more than $50k per session

    // Payment configuration
    CURRENCY: 'AUD',
    MIN_DEPOSIT: 10,
    MAX_DEPOSIT: 100000,
    MIN_WITHDRAWAL: 20,
    MAX_WITHDRAWAL: 50000,
    WITHDRAWAL_PROCESSING_DAYS: 3,
    PAYMENT_METHODS: ['visa', 'mastercard', 'payid', 'bank_transfer', 'crypto_btc', 'crypto_eth', 'crypto_usdt'],

    // Password reset
    PASSWORD_RESET_EXPIRY_HOURS: 1,
    PASSWORD_RESET_MAX_ACTIVE: 3,

    // Responsible gambling defaults
    DEFAULT_DAILY_DEPOSIT_LIMIT: null,   // No limit by default
    DEFAULT_SESSION_TIME_LIMIT: null,    // No limit by default
    COOLING_OFF_PERIODS: [24, 48, 72, 168, 720], // Hours: 1d, 2d, 3d, 1w, 30d
};
