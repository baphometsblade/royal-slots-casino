const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

let db = null;

const DB_FILE = path.resolve(config.DB_PATH);

async function initDatabase() {
    const SQL = await initSqlJs();

    // Load existing DB file if it exists
    if (fs.existsSync(DB_FILE)) {
        const fileBuffer = fs.readFileSync(DB_FILE);
        db = new SQL.Database(fileBuffer);
        console.log('[DB] Loaded existing database from', DB_FILE);
    } else {
        db = new SQL.Database();
        console.log('[DB] Created new database');
    }

    // Create tables
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            balance REAL DEFAULT 0,
            is_admin INTEGER DEFAULT 0,
            is_banned INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            amount REAL NOT NULL,
            balance_before REAL NOT NULL,
            balance_after REAL NOT NULL,
            reference TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS spins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            game_id TEXT NOT NULL,
            bet_amount REAL NOT NULL,
            result_grid TEXT NOT NULL,
            win_amount REAL NOT NULL,
            rng_seed TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS game_stats (
            game_id TEXT PRIMARY KEY,
            total_spins INTEGER DEFAULT 0,
            total_wagered REAL DEFAULT 0,
            total_paid REAL DEFAULT 0,
            actual_rtp REAL DEFAULT 0
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS session_win_caps (
            user_id INTEGER PRIMARY KEY,
            total_wins REAL DEFAULT 0,
            session_start TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // ─── Payment Methods (saved cards, PayID, bank, crypto wallets) ───
    db.run(`
        CREATE TABLE IF NOT EXISTS payment_methods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            label TEXT NOT NULL,
            details_encrypted TEXT,
            is_default INTEGER DEFAULT 0,
            is_verified INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // ─── Deposits ───
    db.run(`
        CREATE TABLE IF NOT EXISTS deposits (
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
        )
    `);

    // ─── Withdrawals ───
    db.run(`
        CREATE TABLE IF NOT EXISTS withdrawals (
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
        )
    `);

    // ─── Password Reset Tokens ───
    db.run(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // ─── User Verification / KYC ───
    db.run(`
        CREATE TABLE IF NOT EXISTS user_verification (
            user_id INTEGER PRIMARY KEY,
            status TEXT DEFAULT 'unverified',
            document_type TEXT,
            submitted_at TEXT,
            verified_at TEXT,
            notes TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // ─── Responsible Gambling Limits ───
    db.run(`
        CREATE TABLE IF NOT EXISTS user_limits (
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
        )
    `);

    // ─── Migrate users table — add profile columns if missing ───
    const userCols = db.exec("PRAGMA table_info(users)");
    const colNames = userCols.length > 0 ? userCols[0].values.map(r => r[1]) : [];
    const addCol = (name, def) => {
        if (!colNames.includes(name)) {
            db.run(`ALTER TABLE users ADD COLUMN ${name} ${def}`);
        }
    };
    addCol('display_name', 'TEXT');
    addCol('avatar_url', 'TEXT');
    addCol('phone', 'TEXT');
    addCol('date_of_birth', 'TEXT');
    addCol('country', 'TEXT');
    addCol('currency', "TEXT DEFAULT 'AUD'");
    addCol('email_verified', 'INTEGER DEFAULT 0');
    addCol('phone_verified', 'INTEGER DEFAULT 0');
    addCol('kyc_status', "TEXT DEFAULT 'unverified'");
    addCol('updated_at', "TEXT");

    // Create indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_spins_user ON spins(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_spins_game ON spins(game_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id)`);

    // Seed admin account if it doesn't exist
    const bcrypt = require('bcryptjs');
    const adminCheck = db.exec("SELECT id FROM users WHERE username = 'admin'");
    if (adminCheck.length === 0 || adminCheck[0].values.length === 0) {
        const adminHash = bcrypt.hashSync(config.ADMIN_PASSWORD, 12);
        db.run(
            "INSERT OR IGNORE INTO users (username, email, password_hash, balance, is_admin) VALUES (?, ?, ?, ?, ?)",
            ['admin', 'admin@royalcasino.local', adminHash, 0, 1]
        );
        console.log('[DB] Admin account created (username: admin)');
    }

    saveToFile();
    console.log('[DB] Schema initialized');
    return db;
}

function saveToFile() {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
}

// Auto-save every 30 seconds
setInterval(() => {
    if (db) saveToFile();
}, 30000);

function getDb() {
    if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
    return db;
}

// ─── Query Helpers ───

function run(sql, params = []) {
    const d = getDb();
    d.run(sql, params);
    // Get last insert id BEFORE saveToFile to avoid state issues
    const lastId = getLastInsertId();
    const changes = d.getRowsModified();
    saveToFile();
    return { changes, lastInsertRowid: lastId };
}

function getLastInsertId() {
    const d = getDb();
    const result = d.exec('SELECT last_insert_rowid() as id');
    return result.length > 0 ? result[0].values[0][0] : null;
}

function get(sql, params = []) {
    const d = getDb();
    const stmt = d.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
    }
    stmt.free();
    return null;
}

function all(sql, params = []) {
    const d = getDb();
    const stmt = d.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
}

module.exports = {
    initDatabase,
    getDb,
    run,
    get,
    all,
    saveToFile,
};
