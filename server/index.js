const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { initDatabase } = require('./database');

const app = express();

// Trust Render's reverse proxy so rate-limiters and IP detection use the real
// client IP rather than the load-balancer IP (which would bucket all users together)
app.set('trust proxy', 1);

// Redirect bare domain → www in production (Render only provisions cert for www)
if (config.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        const host = req.headers.host || '';
        if (host === 'msaart.online') {
            return res.redirect(301, `https://www.msaart.online${req.url}`);
        }
        next();
    });
}

// ─── Security Middleware ───
app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for the casino client
}));
// In production restrict CORS to the declared origin; open in development
const corsOrigin = config.NODE_ENV === 'production'
    ? (process.env.ALLOWED_ORIGIN || false)
    : true;
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '1mb' }));

// Global rate limiter
const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200, // 200 requests per minute
    message: { error: 'Too many requests. Please slow down.' },
});
app.use('/api/', globalLimiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts per 15 min
    message: { error: 'Too many auth attempts. Try again later.' },
});
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/login', authLimiter);

// ─── Health Check (used by Render / load balancers) ───
app.get('/api/health', async (req, res) => {
    try {
        const db = require('./database');
        await db.get('SELECT 1');
        res.json({ status: 'ok', uptime: process.uptime() });
    } catch (err) {
        res.status(503).json({ status: 'error', message: err.message });
    }
});

// ─── API Routes ───
const authRoutes = require('./routes/auth.routes');
const spinRoutes = require('./routes/spin.routes');
const balanceRoutes = require('./routes/balance.routes');
const adminRoutes = require('./routes/admin.routes');
const userRoutes = require('./routes/user.routes');
const paymentRoutes = require('./routes/payment.routes');
const jackpotRoutes = require('./routes/jackpot.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');

app.use('/api/auth', authRoutes);
app.use('/api/spin', spinRoutes);
app.use('/api/balance', balanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/jackpot', jackpotRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// ─── Game definitions endpoint (sanitized — no payout tables) ───
const games = require('../shared/game-definitions');
app.get('/api/games', (req, res) => {
    const sanitized = games.map(g => ({
        id: g.id,
        name: g.name,
        provider: g.provider,
        tag: g.tag,
        tagClass: g.tagClass,
        thumbnail: g.thumbnail,
        bgGradient: g.bgGradient,
        symbols: g.symbols,
        reelBg: g.reelBg,
        accentColor: g.accentColor,
        gridCols: g.gridCols,
        gridRows: g.gridRows,
        winType: g.winType,
        clusterMin: g.clusterMin,
        wildSymbol: g.wildSymbol,
        scatterSymbol: g.scatterSymbol,
        bonusType: g.bonusType,
        bonusDesc: g.bonusDesc,
        minBet: g.minBet,
        maxBet: g.maxBet,
        hot: g.hot,
        jackpot: g.jackpot,
        // NOTE: payouts, multiplier arrays, etc. are INTENTIONALLY EXCLUDED
    }));
    res.json({ games: sanitized });
});

// ─── Static Files ───
// Serve the casino client from the project root
app.use(express.static(path.join(__dirname, '..')));

// Admin dashboard
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// SPA fallback — serve index.html for any unmatched route
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ─── Start Server ───
async function start() {
    // Production safety checks — refuse to start with insecure defaults
    if (config.NODE_ENV === 'production') {
        if (config.JWT_SECRET === 'dev-secret-change-in-production') {
            console.error('[Security] FATAL: JWT_SECRET is the default dev value. Set JWT_SECRET in .env before running in production.');
            process.exit(1);
        }
        if (config.ADMIN_PASSWORD === 'admin123changeme') {
            console.error('[Security] FATAL: ADMIN_PASSWORD is the default dev value. Set ADMIN_PASSWORD in .env before running in production.');
            process.exit(1);
        }
    }

    await initDatabase();
    app.listen(config.PORT, () => {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`  Matrix Spins Server running on port ${config.PORT}`);
        console.log(`  Environment: ${config.NODE_ENV}`);
        console.log(`  Open: http://localhost:${config.PORT}`);
        console.log(`  Admin: http://localhost:${config.PORT}/admin`);
        console.log(`${'='.repeat(50)}\n`);
    });
}

start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

// ─── Graceful Shutdown ───
// Drain the database connection pool (PostgreSQL) or save file (SQLite) on exit
process.on('SIGTERM', async () => {
    console.log('[Server] SIGTERM received, shutting down gracefully…');
    try {
        const { getBackend } = require('./database');
        const backend = getBackend();
        if (backend && typeof backend.close === 'function') {
            await backend.close();
        }
    } catch (e) { /* backend not initialized yet */ }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('[Server] SIGINT received, shutting down…');
    try {
        const { getBackend } = require('./database');
        const backend = getBackend();
        if (backend && typeof backend.close === 'function') {
            await backend.close();
        }
    } catch (e) { /* backend not initialized yet */ }
    process.exit(0);
});
