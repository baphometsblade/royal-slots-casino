require('dotenv').config();

module.exports = {
    PORT: parseInt(process.env.PORT, 10) || 3000,
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    JWT_EXPIRES_IN: '7d',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123changeme',
    NODE_ENV: process.env.NODE_ENV || 'development',
    DB_PATH: process.env.DB_PATH || './casino.db',

    // Game limits
    MAX_SPINS_PER_SECOND: 2,
    MIN_BET: 1,
    MAX_BET: 50000,
    DEFAULT_BALANCE: 0,
    DEMO_BALANCE: 5000,

    // House edge
    TARGET_RTP: 0.96,
    RTP_ADJUSTMENT_THRESHOLD: 0.02,
};
