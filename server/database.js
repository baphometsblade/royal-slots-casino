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

    // Create indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_spins_user ON spins(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_spins_game ON spins(game_id)`);

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
