/**
 * SQL Dialect Adapter — translates SQLite-dialect SQL to PostgreSQL at runtime.
 *
 * Route files keep writing SQLite-style SQL; this adapter converts it when
 * the active backend is PostgreSQL.  Only called by pg-backend.js.
 */

'use strict';

/**
 * Convert SQLite-dialect SQL to PostgreSQL.
 * Handles:  ?, datetime(), strftime(), INSERT OR IGNORE
 */
function adaptSQL(sql) {
    let adapted = sql;

    // 1. datetime('now', '±N <unit>') → NOW() ± INTERVAL 'N <unit>'
    //    Must run BEFORE the plain datetime('now') replacement.
    adapted = adapted.replace(
        /datetime\(\s*'now'\s*,\s*'([+-]?\s*\d+\s+\w+)'\s*\)/gi,
        function (_, interval) {
            // Detect direction: '+1 hour' → add, '-24 hours' or '24 hours' → subtract
            var isAdd = /^\+/.test(interval.trim());
            var clean = interval.replace(/^[+-]\s*/, '');
            var op = isAdd ? '+' : '-';
            return "NOW() " + op + " INTERVAL '" + clean + "'";
        }
    );

    // 2. datetime('now') → NOW()
    adapted = adapted.replace(/datetime\(\s*'now'\s*\)/gi, 'NOW()');

    // 3. strftime('%Y-%m-%d %H:00', <column>) → TO_CHAR(<column>, 'YYYY-MM-DD HH24:00')
    adapted = adapted.replace(
        /strftime\(\s*'%Y-%m-%d %H:00'\s*,\s*(\w+)\s*\)/gi,
        function (_, col) {
            return "TO_CHAR(" + col + ", 'YYYY-MM-DD HH24:00')";
        }
    );

    // 4. INSERT OR IGNORE → INSERT … ON CONFLICT DO NOTHING
    //    (appended after the VALUES clause closing paren)
    if (/INSERT\s+OR\s+IGNORE/i.test(adapted)) {
        adapted = adapted.replace(/INSERT\s+OR\s+IGNORE/i, 'INSERT');
        // Append ON CONFLICT DO NOTHING if not already present
        if (!/ON\s+CONFLICT/i.test(adapted)) {
            adapted = adapted.replace(/(\)\s*;?\s*)$/, ') ON CONFLICT DO NOTHING');
        }
    }

    // 5. ? positional params → $1, $2, $3 …
    var paramIndex = 0;
    adapted = adapted.replace(/\?/g, function () {
        paramIndex += 1;
        return '$' + paramIndex;
    });

    return adapted;
}

module.exports = { adaptSQL };
