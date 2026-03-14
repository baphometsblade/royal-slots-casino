'use strict';

/**
 * A/B Testing Routes
 *
 * Endpoints:
 *   POST /api/ab/convert        — Record a conversion { testName, variant, userId? }
 *   GET  /api/ab/results        — Get conversion rates per test/variant (admin only)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

var isPg = !!process.env.DATABASE_URL;
var idDef = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
var tsDef = isPg ? 'TIMESTAMPTZ DEFAULT NOW()' : "TEXT DEFAULT (datetime('now'))";

/**
 * Bootstrap the ab_conversions table on module load.
 * This runs once per server startup.
 */
async function bootstrapTable() {
  try {
    // Check if table exists by attempting a simple query
    await db.get("SELECT 1 FROM ab_conversions LIMIT 1").catch(async function() {
      // Table doesn't exist, create it
      await db.run(`
        CREATE TABLE IF NOT EXISTS ab_conversions (
          id ${idDef},
          test_name TEXT NOT NULL,
          variant TEXT NOT NULL,
          user_id INTEGER,
          created_at ${tsDef}
        )
      `);
      console.warn('[ABTesting] ab_conversions table created');
    });
  } catch (err) {
    console.warn('[ABTesting] bootstrapTable error:', err.message);
  }
}

// Ensure table exists on load
bootstrapTable();

/**
 * ── POST /api/ab/convert ────────────────────────────────────────────────────
 * Record a conversion for an A/B test.
 *
 * Request body:
 *   {
 *     testName: string,      (required) Name of the test
 *     variant: string,       (required) Assigned variant
 *     userId: number?        (optional) User ID from localStorage
 *   }
 *
 * Response:
 *   { success: true }
 *
 * Notes:
 *   - No authentication required (fire-and-forget from frontend)
 *   - userId is optional; can be null for anonymous users
 *   - Silently ignores invalid requests
 */
router.post('/convert', async function(req, res) {
  try {
    const testName = String(req.body.testName || '').trim();
    const variant = String(req.body.variant || '').trim();
    const userId = req.body.userId ? parseInt(req.body.userId, 10) : null;

    // Basic validation
    if (!testName || !variant) {
      // Silently fail (fire-and-forget semantics)
      return res.status(200).json({ success: true });
    }

    // Insert conversion record
    await db.run(
      'INSERT INTO ab_conversions (test_name, variant, user_id) VALUES (?, ?, ?)',
      [testName, variant, isNaN(userId) ? null : userId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.warn('[ABTesting] POST /convert error:', err.message);
    // Silently return success (fire-and-forget)
    return res.status(200).json({ success: true });
  }
});

/**
 * ── GET /api/ab/results ──────────────────────────────────────────────────
 * Fetch aggregated conversion results per test/variant.
 * Admin-only endpoint.
 *
 * Query parameters (optional):
 *   testName: string  — Filter results to a specific test
 *
 * Response:
 *   {
 *     success: true,
 *     tests: {
 *       'deposit_cta_text': [
 *         { variant: 'Deposit Now', conversions: 150 },
 *         { variant: 'Add Funds', conversions: 142 },
 *         ...
 *       ],
 *       ...
 *     }
 *   }
 */
router.get('/results', authenticate, requireAdmin, async function(req, res) {
  try {
    const filterTestName = req.query.testName ? String(req.query.testName).trim() : null;

    let query = `
      SELECT test_name, variant, COUNT(*) as conversions
      FROM ab_conversions
    `;
    const params = [];

    if (filterTestName) {
      query += ' WHERE test_name = ?';
      params.push(filterTestName);
    }

    query += ' GROUP BY test_name, variant ORDER BY test_name, conversions DESC';

    const rows = await db.all(query, params);

    // Organize results by test name
    const results = {};
    rows.forEach(function(row) {
      if (!results[row.test_name]) {
        results[row.test_name] = [];
      }
      results[row.test_name].push({
        variant: row.variant,
        conversions: parseInt(row.conversions, 10)
      });
    });

    return res.json({
      success: true,
      tests: results
    });
  } catch (err) {
    console.warn('[ABTesting] GET /results error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch A/B results' });
  }
});

module.exports = router;
