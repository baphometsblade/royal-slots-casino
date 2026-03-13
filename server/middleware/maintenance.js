const fs = require('fs');
const path = require('path');

const MAINTENANCE_FILE = path.join(__dirname, '..', 'data', 'maintenance.json');

/**
 * Reads and parses the maintenance mode flag from disk
 * @returns {object} { enabled: boolean, message: string }
 */
function getMaintenanceState() {
    try {
        if (!fs.existsSync(MAINTENANCE_FILE)) {
            return { enabled: false, message: 'System is currently under maintenance.' };
        }
        const data = fs.readFileSync(MAINTENANCE_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        return {
            enabled: Boolean(parsed.enabled),
            message: parsed.message || 'Matrix Spins is undergoing scheduled maintenance. We\'ll be back shortly!'
        };
    } catch (err) {
        console.warn('[Maintenance] Failed to read maintenance state:', err.message);
        return { enabled: false, message: 'System is currently under maintenance.' };
    }
}

/**
 * Middleware that checks maintenance mode and returns 503 if enabled
 * Admin API routes (/api/admin/*) are always allowed
 * Static file serving is not affected
 */
function maintenanceMiddleware(req, res, next) {
    // Admin routes always bypass maintenance mode
    if (req.path.startsWith('/api/admin/')) {
        return next();
    }

    // Non-API requests (static files, etc.) bypass maintenance mode
    if (!req.path.startsWith('/api/')) {
        return next();
    }

    const state = getMaintenanceState();
    if (state.enabled) {
        return res.status(503).json({
            maintenance: true,
            message: state.message
        });
    }

    next();
}

module.exports = {
    maintenanceMiddleware,
    getMaintenanceState
};
