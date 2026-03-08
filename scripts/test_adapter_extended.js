'use strict';
const { adaptSQL } = require('../server/db/query-adapter');

// Test the actual SQL from spin.routes.js line 287
var sql1 = "UPDATE session_win_caps SET total_wins = 0, session_start = datetime('now') WHERE user_id = ? AND (julianday('now') - julianday(session_start)) * 24 >= ?";
var result1 = adaptSQL(sql1);
console.log('Test 1: julianday in spin.routes.js');
console.log('  Input: ', sql1);
console.log('  Output:', result1);
console.log();

// Test the new CASE-based session cap SQL
var sql2 = "INSERT INTO session_win_caps (user_id, total_wins, session_start) VALUES (?, ?, datetime('now')) ON CONFLICT(user_id) DO UPDATE SET total_wins = CASE WHEN session_win_caps.total_wins + ? > ? THEN ? ELSE session_win_caps.total_wins + ? END";
var result2 = adaptSQL(sql2);
console.log('Test 2: CASE-based session cap');
console.log('  Input: ', sql2);
console.log('  Output:', result2);
console.log();

// Test contest UPSERT
var sql3 = "INSERT INTO contest_entries (contest_id, user_id, metric_type, metric_value, updated_at) VALUES (?, ?, ?, ?, datetime('now')) ON CONFLICT(contest_id, user_id, metric_type) DO UPDATE SET metric_value = CASE WHEN excluded.metric_value > contest_entries.metric_value THEN excluded.metric_value ELSE contest_entries.metric_value END, updated_at = datetime('now')";
var result3 = adaptSQL(sql3);
console.log('Test 3: contest UPSERT');
console.log('  Output:', result3);
console.log();

// Test column-based datetime (admin cohort query)
var sql4 = "s.created_at >= datetime(u.created_at, '+14 days') AND s.created_at < datetime(u.created_at, '+21 days')";
var result4 = adaptSQL(sql4);
console.log('Test 4: column-based datetime');
console.log('  Output:', result4);
console.log();

// Verify no SQLite artifacts remain
var all = [result1, result2, result3, result4];
var passed = 0;
var failed = 0;
for (var i = 0; i < all.length; i++) {
    var r = all[i];
    var hasBad = /\?/.test(r) || /julianday|strftime|datetime\(/i.test(r) || /INSERT\s+OR/i.test(r);
    if (hasBad) {
        console.log('FAIL: Test ' + (i + 1) + ' has SQLite artifacts');
        failed++;
    } else {
        passed++;
    }
}
console.log(passed + ' passed, ' + failed + ' failed');
