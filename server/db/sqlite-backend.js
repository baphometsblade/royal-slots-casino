/**
 * SQLite backend — wraps sql.js with the unified async API.
 *
 * Extracted from the original monolithic database.js.
 * Behaviour is identical to the pre-refactor version.
 */

'use strict';

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

class SqliteBackend {
    constructor(dbPath) {
        this.dbPath = path.resolve(dbPath);
        this.db = null;
        this._saveInterval = null;
    }

    async init() {
        const SQL = await initSqlJs();

        // Load existing DB file if it exists
        if (fs.existsSync(this.dbPath)) {
            const buf = fs.readFileSync(this.dbPath);
            this.db = new SQL.Database(buf);
            console.log('[DB/SQLite] Loaded existing database from', this.dbPath);
        } else {
            this.db = new SQL.Database();
            console.log('[DB/SQLite] Created new in-memory database');
        }

        // Schema
        const schema = require('./schema-sqlite');

        for (const ddl of schema.TABLES) {
            this.db.run(ddl);
        }

        // Column migrations
        const userCols = this.db.exec("PRAGMA table_info(users)");
        const colNames = userCols.length > 0 ? userCols[0].values.map(r => r[1]) : [];
        for (const [name, def] of schema.USER_MIGRATIONS) {
            if (!colNames.includes(name)) {
                this.db.run(`ALTER TABLE users ADD COLUMN ${name} ${def}`);
            }
        }

        // Indexes
        for (const idx of schema.INDEXES) {
            this.db.run(idx);
        }

        // Seed admin
        await this._seedAdmin();

        this.saveToFile();
        console.log('[DB/SQLite] Schema initialized');

        // Auto-save every 30 seconds
        this._saveInterval = setInterval(() => this.saveToFile(), 30000);
    }

    async _seedAdmin() {
        const config = require('../config');
        const bcrypt = require('bcryptjs');
        const check = this.db.exec("SELECT id FROM users WHERE username = 'admin'");
        if (check.length === 0 || check[0].values.length === 0) {
            const hash = bcrypt.hashSync(config.ADMIN_PASSWORD, 12);
            this.db.run(
                "INSERT OR IGNORE INTO users (username, email, password_hash, balance, is_admin) VALUES (?, ?, ?, ?, ?)",
                ['admin', 'admin@royalcasino.local', hash, 0, 1]
            );
            console.log('[DB/SQLite] Admin account created (username: admin)');
        }
    }

    // ─── Query helpers (async wrappers over synchronous sql.js) ───

    async run(sql, params) {
        if (params === undefined) params = [];
        this.db.run(sql, params);
        const lastId = this._getLastInsertId();
        const changes = this.db.getRowsModified();
        this.saveToFile();
        return { changes: changes, lastInsertRowid: lastId };
    }

    async get(sql, params) {
        if (params === undefined) params = [];
        var stmt = this.db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
            var row = stmt.getAsObject();
            stmt.free();
            return row;
        }
        stmt.free();
        return null;
    }

    async all(sql, params) {
        if (params === undefined) params = [];
        var stmt = this.db.prepare(sql);
        stmt.bind(params);
        var rows = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
    }

    _getLastInsertId() {
        var result = this.db.exec('SELECT last_insert_rowid() as id');
        return result.length > 0 ? result[0].values[0][0] : null;
    }

    saveToFile() {
        if (!this.db) return;
        var data = this.db.export();
        var buffer = Buffer.from(data);
        fs.writeFileSync(this.dbPath, buffer);
    }

    async close() {
        if (this._saveInterval) {
            clearInterval(this._saveInterval);
            this._saveInterval = null;
        }
        this.saveToFile();
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

module.exports = SqliteBackend;
