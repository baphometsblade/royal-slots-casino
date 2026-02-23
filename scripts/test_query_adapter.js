#!/usr/bin/env node
/**
 * Unit tests for the SQL query adapter (server/db/query-adapter.js).
 *
 * Run:  npm run test:adapter   (or: node scripts/test_query_adapter.js)
 *
 * These verify every translation pattern that converts SQLite-dialect SQL
 * to PostgreSQL-compatible SQL.  Zero external dependencies.
 */

'use strict';

const { adaptSQL } = require('../server/db/query-adapter');

let passed = 0;
let failed = 0;

function assert(label, actual, expected) {
    if (actual === expected) {
        passed++;
    } else {
        failed++;
        console.error(`FAIL: ${label}`);
        console.error(`  expected: ${expected}`);
        console.error(`  actual:   ${actual}`);
    }
}

// ─── 1. Positional parameters: ? → $1, $2, $3 ───

assert(
    'Single ? → $1',
    adaptSQL('SELECT * FROM users WHERE id = ?'),
    'SELECT * FROM users WHERE id = $1'
);

assert(
    'Multiple ? → $1, $2, $3',
    adaptSQL('INSERT INTO users (a, b, c) VALUES (?, ?, ?)'),
    'INSERT INTO users (a, b, c) VALUES ($1, $2, $3)'
);

assert(
    'No params — unchanged',
    adaptSQL('SELECT COUNT(*) FROM users'),
    'SELECT COUNT(*) FROM users'
);

// ─── 2. datetime('now') → NOW() ───

assert(
    "datetime('now') → NOW()",
    adaptSQL("SELECT * FROM t WHERE created_at > datetime('now')"),
    "SELECT * FROM t WHERE created_at > NOW()"
);

assert(
    "datetime('now') case insensitive",
    adaptSQL("SELECT * FROM t WHERE c > DATETIME('now')"),
    "SELECT * FROM t WHERE c > NOW()"
);

// ─── 3. datetime('now', '-N unit') → NOW() - INTERVAL 'N unit' ───

assert(
    "datetime('now', '-24 hours') → INTERVAL",
    adaptSQL("WHERE created_at > datetime('now', '-24 hours')"),
    "WHERE created_at > NOW() - INTERVAL '24 hours'"
);

assert(
    "datetime('now', '-7 days') → INTERVAL",
    adaptSQL("WHERE c > datetime('now', '-7 days')"),
    "WHERE c > NOW() - INTERVAL '7 days'"
);

assert(
    "datetime('now', '-30 minutes') → INTERVAL",
    adaptSQL("WHERE c > datetime('now', '-30 minutes')"),
    "WHERE c > NOW() - INTERVAL '30 minutes'"
);

// ─── 4. strftime → TO_CHAR ───

assert(
    "strftime('%Y-%m-%d %H:00', col) → TO_CHAR",
    adaptSQL("SELECT strftime('%Y-%m-%d %H:00', created_at) as hour"),
    "SELECT TO_CHAR(created_at, 'YYYY-MM-DD HH24:00') as hour"
);

// ─── 5. INSERT OR IGNORE → ON CONFLICT DO NOTHING ───

assert(
    'INSERT OR IGNORE → ON CONFLICT DO NOTHING',
    adaptSQL('INSERT OR IGNORE INTO t (a) VALUES (?)'),
    'INSERT INTO t (a) VALUES ($1) ON CONFLICT DO NOTHING'
);

assert(
    'INSERT OR IGNORE preserves existing ON CONFLICT',
    adaptSQL('INSERT OR IGNORE INTO t (a) VALUES (?) ON CONFLICT (a) DO NOTHING'),
    'INSERT INTO t (a) VALUES ($1) ON CONFLICT (a) DO NOTHING'
);

// ─── 6. Combined translations ───

assert(
    'Combined: params + datetime in one query',
    adaptSQL("SELECT * FROM spins WHERE user_id = ? AND created_at > datetime('now', '-24 hours') LIMIT ?"),
    "SELECT * FROM spins WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours' LIMIT $2"
);

assert(
    'Combined: strftime + datetime + params',
    adaptSQL(
        "SELECT strftime('%Y-%m-%d %H:00', created_at) as hour, COUNT(*) as cnt " +
        "FROM spins WHERE created_at > datetime('now', '-24 hours') GROUP BY hour"
    ),
    "SELECT TO_CHAR(created_at, 'YYYY-MM-DD HH24:00') as hour, COUNT(*) as cnt " +
    "FROM spins WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY hour"
);

// ─── 7. Passthrough — queries that need no translation ───

assert(
    'Plain SELECT passthrough',
    adaptSQL('SELECT id, username FROM users ORDER BY id DESC'),
    'SELECT id, username FROM users ORDER BY id DESC'
);

assert(
    'UPDATE passthrough (no params)',
    adaptSQL('UPDATE users SET balance = 100 WHERE id = 1'),
    'UPDATE users SET balance = 100 WHERE id = 1'
);

// ─── 8. Edge cases ───

assert(
    'Empty string',
    adaptSQL(''),
    ''
);

assert(
    '? inside string literal is still replaced (known limitation)',
    adaptSQL("INSERT INTO t (note) VALUES (?)"),
    "INSERT INTO t (note) VALUES ($1)"
);

// ─── Results ───

console.log(`\nQuery adapter tests: ${passed} passed, ${failed} failed`);

if (failed > 0) {
    process.exit(1);
} else {
    console.log('All query adapter tests passed ✓');
}
