/**
 * Unified Database Facade
 *
 * Selects backend at startup:
 *   DATABASE_URL set → PostgreSQL (pg Pool)
 *   DATABASE_URL absent → SQLite (sql.js, file-based)
 *
 * Exports the same async API regardless of backend:
 *   run(sql, params)   → { changes, lastInsertRowid }
 *   get(sql, params)   → row | null
 *   all(sql, params)   → [rows]
 *   saveToFile()       → no-op for PostgreSQL
 *   initDatabase()     → must be awaited before any queries
 */

'use strict';

const config = require('./config');

let backend = null;

async function initDatabase() {
    if (config.DATABASE_URL) {
        const PgBackend = require('./db/pg-backend');
        backend = new PgBackend(config.DATABASE_URL);
        console.log('[DB] Using PostgreSQL backend');
    } else {
        const SqliteBackend = require('./db/sqlite-backend');
        backend = new SqliteBackend(config.DB_PATH);
        console.log('[DB] Using SQLite backend');
    }
    await backend.init();
    return backend;
}

function getBackend() {
    if (!backend) throw new Error('Database not initialized. Call initDatabase() first.');
    return backend;
}

async function run(sql, params) {
    return getBackend().run(sql, params);
}

async function get(sql, params) {
    return getBackend().get(sql, params);
}

async function all(sql, params) {
    return getBackend().all(sql, params);
}

function saveToFile() {
    if (backend) backend.saveToFile();
}

module.exports = {
    initDatabase,
    getBackend,
    // Keep legacy alias for any code that calls getDb()
    getDb: getBackend,
    run,
    get,
    all,
    saveToFile,
};
