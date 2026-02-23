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
// Provider Animation Themes
// ───────────────────────────────────────────────────────
var PROVIDER_ANIM_THEMES = {
    novaspin:     { particles: ['⚡','🌌','💫','🔬','🚀'], color: '#00e5ff', glow: '#00e5ff44' },
    celestial:    { particles: ['🏛️','⚡','👑','🌟','💎'], color: '#ffd700', glow: '#ffd70044' },
    ironreel:     { particles: ['🌿','🍀','🌲','🍃','🌱'], color: '#22c55e', glow: '#22c55e44' },
    goldenedge:   { particles: ['🍭','💎','🌸','🍬','✨'], color: '#f472b6', glow: '#f472b644' },
    vaultx:       { particles: ['💰','🔑','💣','🤠','⚙️'], color: '#d97706', glow: '#d9770644' },
    solstice:     { particles: ['🏮','🎋','🔱','🌸','🐉'], color: '#ef4444', glow: '#ef444444' },
    phantomworks: { particles: ['💀','🕷️','🌑','🦇','💜'], color: '#a855f7', glow: '#a855f744' },
    arcadeforge:  { particles: ['👾','🕹️','⭐','🎮','🔴'], color: '#06b6d4', glow: '#06b6d444' },
};

function getProviderAnimTheme(game) {
    var key = (typeof getGameChromeStyle === 'function') ? getGameChromeStyle(game) : '';
    return PROVIDER_ANIM_THEMES[key] || { particles: ['✨','⭐','💫','✦','💰'], color: '#fbbf24', glow: '#fbbf2444' };
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

function createParticles(x, y, count, type, symbolOverride) {
    count = (count === undefined) ? 8 : count;
    type  = type  || 'gold';
    if (!_animSettingEnabled('particles')) return;

    var defaultSymbols = ['✨', '⭐', '💫', '✦', '💰'];
    var pool = symbolOverride || defaultSymbols;
    for (var i = 0; i < count; i++) {
        var particle = document.createElement('div');
        particle.className = 'particle ' + type;
        particle.textContent = pool[Math.floor(Math.random() * pool.length)];
        particle.style.left  = x + 'px';
        particle.style.top   = y + 'px';
        particle.style.setProperty('--tx', (Math.random() - 0.5) * 100 + 'px');
        particle.style.color = type === 'gold'   ? '#fbbf24'
                             : type === 'green'  ? '#10b981'
                             : type === 'purple' ? '#a855f7'
                             : '#fbbf24';
        document.body.appendChild(particle);
        setTimeout(function(p){ return function(){ p.remove(); }; }(particle), 1500);
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

    var winCells = document.querySelectorAll('.reel-win-glow');
    var cells    = Array.from(winCells);
    var theme    = getProviderAnimTheme(game);

    // Apply themed glow colour to winning cells
    cells.forEach(function(cell) {
        cell.style.boxShadow   = '0 0 18px 4px ' + theme.glow + ', 0 0 6px 2px ' + theme.color + '88';
        cell.style.borderColor = theme.color;
    });

    applySymbolCascade(cells, 'gold');

    var centerX = window.innerWidth  / 2;
    var centerY = window.innerHeight / 2;
    createParticles(centerX, centerY, 15, 'sparkle', theme.particles);
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
