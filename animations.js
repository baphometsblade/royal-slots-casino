// ═══════════════════════════════════════════════════════
// ANIMATIONS & VISUAL EFFECTS MODULE
// Extracted from app.js — loaded via <script> tag
// All functions remain globally accessible for backward compatibility
// Respects appSettings for particles, confetti, animations toggles
// ═══════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────
// Settings-aware helper
// ───────────────────────────────────────────────────────
function _animSettingEnabled(key) {
    return !(window.appSettings && window.appSettings[key] === false);
}

// ───────────────────────────────────────────────────────
// Confetti Effect
// ───────────────────────────────────────────────────────

function createConfetti() {
    if (!_animSettingEnabled('confetti')) return;

    const colors = ['confetti-1', 'confetti-2', 'confetti-3', 'confetti-4', 'confetti-5'];
    const confettiCount = 50;

    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.className = `confetti ${colors[Math.floor(Math.random() * colors.length)]}`;
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.width = (Math.random() * 10 + 5) + 'px';
        confetti.style.height = (Math.random() * 10 + 5) + 'px';
        document.body.appendChild(confetti);

        setTimeout(() => confetti.remove(), 4000);
    }
}

// ───────────────────────────────────────────────────────
// Particle Effects & Symbol Cascade System
// ───────────────────────────────────────────────────────

function createParticles(x, y, count = 8, type = 'gold') {
    if (!_animSettingEnabled('particles')) return;

    const symbols = ['✨', '⭐', '💫', '✦', '💰'];
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = `particle ${type}`;
        particle.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.setProperty('--tx', (Math.random() - 0.5) * 100 + 'px');
        particle.style.color = type === 'gold' ? '#fbbf24' : type === 'green' ? '#10b981' : '#a855f7';
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 1500);
    }
}

function applySymbolCascade(cells, highlightColor = 'gold') {
    if (!_animSettingEnabled('animations')) return;

    cells.forEach((cell, index) => {
        if (cell) {
            cell.classList.add(`symbol-cascade`, `symbol-cascade-${Math.min(index + 1, 6)}`);
            cell.classList.add(`highlight-${highlightColor}`);
            // Trigger sparkle effect
            setTimeout(() => {
                cell.classList.add('symbol-sparkle');
                const rect = cell.getBoundingClientRect();
                createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 5, 'gold');
            }, 100 * index);
        }
    });
}

function triggerWinCascade(game) {
    if (!_animSettingEnabled('animations')) return;

    const winCells = document.querySelectorAll('.reel-win-glow');
    const cells = Array.from(winCells);

    // Determine highlight color based on game theme
    let highlightColor = 'gold';
    if (game.accentColor && game.accentColor.includes('10b981')) highlightColor = 'green';
    if (game.accentColor && game.accentColor.includes('a855f7')) highlightColor = 'purple';

    applySymbolCascade(cells, highlightColor);

    // Create burst particles from center of screen
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    createParticles(centerX, centerY, 15, 'sparkle');
}

// ───────────────────────────────────────────────────────
// Bonus Overlay Effect
// ───────────────────────────────────────────────────────

function showBonusEffect(text, color) {
    if (!_animSettingEnabled('animations')) return;

    const container = document.getElementById('winAnimation');
    if (!container) return;
    const effect = document.createElement('div');
    effect.className = 'bonus-effect';
    effect.style.color = color || '#fbbf24';
    effect.textContent = text;
    container.appendChild(effect);
    setTimeout(() => effect.remove(), 2500);
}

// ───────────────────────────────────────────────────────
// Page Transition Animation
// ───────────────────────────────────────────────────────

function showPageTransition(callback) {
    const transition = document.getElementById('pageTransition');
    if (!_animSettingEnabled('animations')) {
        // Skip animation but still execute callback
        if (callback) callback();
        return;
    }
    transition.classList.add('active');
    setTimeout(() => {
        if (callback) callback();
        setTimeout(() => {
            transition.classList.remove('active');
        }, 300);
    }, 300);
}
