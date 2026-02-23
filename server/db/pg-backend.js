/**
 * PostgreSQL backend — uses node-postgres (pg) Pool.
 *
 * Activated when DATABASE_URL is present in the environment.
 * SQL coming from route files is written in SQLite dialect;
 * the query-adapter translates it to PostgreSQL before execution.
 */

'use strict';

const pg = require('pg');
const { Pool } = pg;
const { adaptSQL } = require('./query-adapter');

// ── pg type parsers ──────────────────────────────────────────────
// PostgreSQL NUMERIC columns (OID 1700) are returned as strings by
// default because JS floats can't represent all NUMERIC values exactly.
// Our money columns are NUMERIC(15,2) — parseFloat is safe and avoids
// "5000.00" + 100 → "5000.00100" string-concatenation bugs.
pg.types.setTypeParser(1700, parseFloat);                 // NUMERIC → number

// TIMESTAMPTZ (OID 1184) is returned as a JS Date object by default.
// Our code expects ISO-8601 strings (same as SQLite's text format).
pg.types.setTypeParser(1184, function (val) { return val; }); // TIMESTAMPTZ → string

// BIGINT (OID 20) — COUNT(*) returns bigint in PostgreSQL.
pg.types.setTypeParser(20, function (val) { return parseInt(val, 10); });

class PgBackend {
    constructor(connectionString) {
        var sslSetting = process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }   // Render / Railway require SSL
            : false;

        this.pool = new Pool({
            connectionString: connectionString,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            ssl: sslSetting,
        });

        // Surface pool errors so they don't crash the process silently
        this.pool.on('error', function (err) {
            console.error('[DB/PG] Idle client error:', err.message);
        });
    }

    async init() {
        // Verify connectivity
        const client = await this.pool.connect();
        client.release();
        console.log('[DB/PG] Connected to PostgreSQL');

        // Schema
        const schema = require('./schema-pg');

        for (const ddl of schema.TABLES) {
            await this.pool.query(ddl);
        }

        // Column migrations
        const colResult = await this.pool.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'"
        );
        const colNames = colResult.rows.map(function (r) { return r.column_name; });
        for (const [name, def] of schema.USER_MIGRATIONS) {
            if (!colNames.includes(name)) {
                await this.pool.query(`ALTER TABLE users ADD COLUMN ${name} ${def}`);
            }
        }

        // Indexes
        for (const idx of schema.INDEXES) {
            await this.pool.query(idx);
        }

        // Seed admin
        await this._seedAdmin();

        console.log('[DB/PG] Schema initialized');
    }

    async _seedAdmin() {
        const config = require('../config');
        const bcrypt = require('bcryptjs');
        const check = await this.pool.query("SELECT id FROM users WHERE username = 'admin'");
        if (check.rows.length === 0) {
            const hash = bcrypt.hashSync(config.ADMIN_PASSWORD, 12);
            await this.pool.query(
                "INSERT INTO users (username, email, password_hash, balance, is_admin) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (username) DO NOTHING",
                ['admin', 'admin@royalcasino.local', hash, 0, 1]
            );
            console.log('[DB/PG] Admin account created (username: admin)');
        }
    }

    // ─── Query helpers ───

    async run(sql, params) {
        if (params === undefined) params = [];
        var pgSQL = adaptSQL(sql);

        // For plain INSERTs (no ON CONFLICT DO UPDATE), append RETURNING *
        // so we can extract `id` if the table has one. Tables without an `id`
        // column (game_stats, session_win_caps, user_verification, user_limits)
        // still succeed — we just get null for lastInsertRowid.
        // Skip for upserts (ON CONFLICT DO UPDATE) which may not insert a row.
        var isInsert = /^\s*INSERT/i.test(pgSQL);
        var hasReturning = /RETURNING\s/i.test(pgSQL);
        var isUpsert = /ON\s+CONFLICT.*DO\s+UPDATE/i.test(pgSQL);
        if (isInsert && !hasReturning && !isUpsert) {
            pgSQL = pgSQL.replace(/\s*;?\s*$/, '') + ' RETURNING *';
        }

        var result = await this.pool.query(pgSQL, params);

        return {
            changes: result.rowCount,
            lastInsertRowid: (result.rows && result.rows.length > 0 && result.rows[0].id !== undefined)
                ? result.rows[0].id
                : null,
        };
    }

    async get(sql, params) {
        if (params === undefined) params = [];
        var pgSQL = adaptSQL(sql);
        var result = await this.pool.query(pgSQL, params);
        return (result.rows && result.rows.length > 0) ? result.rows[0] : null;
    }

    async all(sql, params) {
        if (params === undefined) params = [];
        var pgSQL = adaptSQL(sql);
        var result = await this.pool.query(pgSQL, params);
        return result.rows || [];
    }

    /** No-op — PostgreSQL manages its own persistence. */
    saveToFile() {}

    async close() {
        await this.pool.end();
        console.log('[DB/PG] Connection pool closed');
    }
}

module.exports = PgBackend;
