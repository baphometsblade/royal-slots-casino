const db = require('../database');
const { authenticate } = require('../middleware/auth');
const router = require('express').Router();

// Bootstrap tables (deferred until DB is ready)
(async function _bootstrapGemStore() {
  try {
    var isPg = !!process.env.DATABASE_URL;
    var idDef = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    var tsDef = isPg ? 'TIMESTAMPTZ DEFAULT NOW()' : "TEXT DEFAULT (datetime('now'))";

    await db.run(`CREATE TABLE IF NOT EXISTS gem_purchases (
      id ${idDef},
      user_id INTEGER NOT NULL,
      package_id TEXT NOT NULL,
      gems_amount INTEGER NOT NULL,
      price_usd REAL NOT NULL,
      bonus_percent INTEGER DEFAULT 0,
      created_at ${tsDef}
    )`);
    console.warn('[GemStore] Tables ready');
  } catch (err) {
    console.warn('[GemStore] Bootstrap deferred:', err.message);
  }
})();

// Package definitions
var PACKAGES = {
  'starter': { id: 'starter', name: 'Starter Pack', gems: 500, price: 5, bonus: 0 },
  'value': { id: 'value', name: 'Value Bundle', gems: 1200, price: 10, bonus: 20 },
  'premium': { id: 'premium', name: 'Premium Chest', gems: 3500, price: 25, bonus: 40 },
  'whale': { id: 'whale', name: 'Whale Pack', gems: 8000, price: 50, bonus: 60 },
  'diamond': { id: 'diamond', name: 'Diamond Vault', gems: 18000, price: 100, bonus: 80 }
};

// Helper: get daily deal (rotates every 24h)
function getDailyDeal() {
  var daysSinceEpoch = Math.floor(Date.now() / 86400000);
  var packageKeys = Object.keys(PACKAGES);
  var selectedKey = packageKeys[daysSinceEpoch % packageKeys.length];
  var basePkg = PACKAGES[selectedKey];
  return {
    id: 'daily-deal',
    name: basePkg.name + ' (Daily Deal)',
    gems: Math.floor(basePkg.gems * 1.25),
    price: basePkg.price,
    bonus: 25,
    basePackageId: selectedKey,
    isDaily: true
  };
}

// Helper: get next reset time (milliseconds)
function getNextResetTime() {
  var now = new Date();
  var tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime();
}

// GET /packages - public
router.get('/packages', function(req, res) {
  try {
    var packages = Object.values(PACKAGES);
    var dailyDeal = getDailyDeal();
    var resetTime = getNextResetTime();

    res.json({
      success: true,
      packages: packages,
      dailyDeal: dailyDeal,
      resetTime: resetTime
    });
  } catch (err) {
    console.warn('GET /packages error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch packages' });
  }
});

// POST /purchase - authenticated
router.post('/purchase', authenticate, async function(req, res) {
  try {
    var packageId = req.body.packageId;
    var userId = req.user.id;

    if (!packageId) {
      return res.status(400).json({ success: false, error: 'packageId required' });
    }

    var selectedPackage = null;
    var gemAmount = 0;
    var price = 0;
    var bonus = 0;

    if (packageId === 'daily-deal') {
      var deal = getDailyDeal();
      selectedPackage = deal;
      gemAmount = deal.gems;
      price = deal.price;
      bonus = deal.bonus;
    } else if (PACKAGES[packageId]) {
      selectedPackage = PACKAGES[packageId];
      gemAmount = selectedPackage.gems;
      price = selectedPackage.price;
      bonus = selectedPackage.bonus;
    } else {
      return res.status(400).json({ success: false, error: 'Invalid package' });
    }

    // Get user balance
    var user = await db.get('SELECT id, balance, gems FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    var priceAsInt = Math.ceil(price * 100);
    if (user.balance < priceAsInt) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    // Deduct from balance, add gems
    var newBalance = user.balance - priceAsInt;
    var newGems = (user.gems || 0) + gemAmount;

    await db.run('UPDATE users SET balance = ?, gems = ? WHERE id = ?', [newBalance, newGems, userId]);

    // Record purchase
    await db.run(
      'INSERT INTO gem_purchases (user_id, package_id, gems_amount, price_usd, bonus_percent) VALUES (?, ?, ?, ?, ?)',
      [userId, packageId, gemAmount, price, bonus]
    );

    res.json({
      success: true,
      gems: newGems,
      balance: newBalance,
      gemsAdded: gemAmount,
      packageId: packageId
    });
  } catch (err) {
    console.warn('POST /purchase error:', err);
    res.status(500).json({ success: false, error: 'Purchase failed' });
  }
});

// GET /history - authenticated
router.get('/history', authenticate, async function(req, res) {
  try {
    var userId = req.user.id;
    var limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;

    var rows = await db.all(
      'SELECT id, package_id, gems_amount, price_usd, bonus_percent, created_at FROM gem_purchases WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );

    res.json({ success: true, history: rows || [] });
  } catch (err) {
    console.warn('GET /history error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

// GET /balance - authenticated
router.get('/balance', authenticate, async function(req, res) {
  try {
    var userId = req.user.id;
    var user = await db.get('SELECT gems FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, gems: user.gems || 0 });
  } catch (err) {
    console.warn('GET /balance error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch balance' });
  }
});

module.exports = router;
