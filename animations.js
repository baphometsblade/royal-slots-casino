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

// ───────────────────────────────────────────────────────
// Screen Shake Effect
// ───────────────────────────────────────────────────────

/**
 * Trigger screen shake effect on the slot modal
 * @param {'epic'|'mega'|'jackpot'} intensity
 */
function triggerScreenShake(intensity) {
    if (!_animSettingEnabled('animations')) return;
    const quality = (window.appSettings && window.appSettings.animationQuality) || 'ultra';
    if (quality !== 'ultra' && quality !== 'high') return;
    if (quality === 'high' && intensity === 'epic') return; // only mega+ on high

    const modal = document.getElementById('slotMachineModal');
    if (!modal) return;

    const cls = 'screen-shake-' + intensity;
    modal.classList.remove('screen-shake-epic', 'screen-shake-mega', 'screen-shake-jackpot');
    void modal.offsetWidth; // force reflow
    modal.classList.add(cls);

    const durations = { epic: 1500, mega: 2000, jackpot: 3000 };
    setTimeout(() => modal.classList.remove(cls), durations[intensity] || 2000);

    // Screen flash for mega+
    if (intensity === 'mega' || intensity === 'jackpot') {
        const flash = document.createElement('div');
        flash.className = 'screen-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 400);
    }
}

// ───────────────────────────────────────────────────────
// Cinematic Vignette Overlay
// ───────────────────────────────────────────────────────

/** Show cinematic vignette overlay */
function showCinematicVignette() {
    let vignette = document.querySelector('.cinematic-vignette');
    if (!vignette) {
        vignette = document.createElement('div');
        vignette.className = 'cinematic-vignette';
        document.body.appendChild(vignette);
    }
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            vignette.classList.add('active');
        });
    });
    return vignette;
}

/** Hide cinematic vignette overlay */
function hideCinematicVignette() {
    const vignette = document.querySelector('.cinematic-vignette');
    if (vignette) {
        vignette.classList.remove('active');
        setTimeout(() => vignette.remove(), 400);
    }
}

// ───────────────────────────────────────────────────────
// Win Text Slam
// ───────────────────────────────────────────────────────

/**
 * Show dramatic win text that slams into view
 * @param {string} text - e.g. "MEGA WIN!" or "$5,000"
 * @param {'epic'|'mega'|'jackpot'} tier
 */
function showWinTextSlam(text, tier) {
    const el = document.createElement('div');
    el.className = 'win-text-slam ' + (tier || '');
    el.textContent = text;
    document.body.appendChild(el);

    const duration = tier === 'jackpot' ? 800 : 500;
    // Auto-remove after animation + display time
    setTimeout(() => {
        el.style.transition = 'opacity 0.5s ease';
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 600);
    }, duration + 2000);

    return el;
}

// ───────────────────────────────────────────────────────
// 3D Win Depth Effects
// ───────────────────────────────────────────────────────

/**
 * Apply 3D depth to winning vs non-winning cells
 * @param {Element[]} winningCells - cells that won
 * @param {Element[]} allCells - all reel cells
 */
function apply3DWinDepth(winningCells, allCells) {
    const quality = (window.appSettings && window.appSettings.animationQuality) || 'ultra';
    if (quality !== 'ultra' && quality !== 'high') return;

    const winSet = new Set(winningCells);
    allCells.forEach(cell => {
        if (winSet.has(cell)) {
            cell.classList.add('reel-3d-pop');
            cell.classList.remove('reel-3d-recede');
        } else {
            cell.classList.add('reel-3d-recede');
            cell.classList.remove('reel-3d-pop');
        }
    });

    // Add 3D perspective to container
    const container = document.querySelector('.reel-grid');
    if (container) container.classList.add('reel-container-3d');
}

/**
 * Remove 3D depth effects from all cells
 * @param {Element[]} allCells
 */
function remove3DWinDepth(allCells) {
    allCells.forEach(cell => {
        cell.classList.remove('reel-3d-pop', 'reel-3d-recede');
    });
    const container = document.querySelector('.reel-grid');
    if (container) container.classList.remove('reel-container-3d');
}

// ───────────────────────────────────────────────────────
// Win Counter Roll Animation
// ───────────────────────────────────────────────────────

/**
 * Animate a win amount counting up
 * @param {Element} element - the DOM element to animate
 * @param {number} fromAmount
 * @param {number} toAmount
 * @param {number} duration - ms
 * @param {function} formatFn - format function (e.g., amount => '$' + amount.toFixed(2))
 */
function animateWinCounter(element, fromAmount, toAmount, duration, formatFn) {
    if (!element) return;
    const startTime = performance.now();
    formatFn = formatFn || function(v) { return '$' + v.toFixed(2); };

    element.classList.add('win-counter-roll', 'counting');

    function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic for satisfying deceleration
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = fromAmount + (toAmount - fromAmount) * eased;
        element.textContent = formatFn(current);

        // Play counter tick sound
        if (typeof SoundManager !== 'undefined' && SoundManager.playCounterTick) {
            if (Math.random() < 0.3) SoundManager.playCounterTick(1 - progress);
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.classList.remove('counting');
            element.textContent = formatFn(toAmount);
        }
    }
    requestAnimationFrame(update);
}

// ───────────────────────────────────────────────────────
// Full Cinematic Win Sequence Orchestrator
// ───────────────────────────────────────────────────────

/**
 * Orchestrate a full cinematic win sequence
 * @param {number} winMultiplier - e.g., 50 for 50x bet
 * @param {number} winAmount - dollar amount won
 * @param {object} game - current game object
 * @param {Element[]} winningCells - DOM elements that won
 * @param {Element[]} allCells - all reel DOM cells
 */
function triggerCinematicWinSequence(winMultiplier, winAmount, game, winningCells, allCells) {
    const quality = (window.appSettings && window.appSettings.animationQuality) || 'ultra';
    if (quality === 'off' || quality === 'low') return;

    // Determine tier
    var tier, shakeType;
    if (winMultiplier >= (typeof WIN_JACKPOT_THRESHOLD !== 'undefined' ? WIN_JACKPOT_THRESHOLD : 100)) {
        tier = 'jackpot'; shakeType = 'jackpot';
    } else if (winMultiplier >= (typeof WIN_MEGA_THRESHOLD !== 'undefined' ? WIN_MEGA_THRESHOLD : 50)) {
        tier = 'mega'; shakeType = 'mega';
    } else if (winMultiplier >= (typeof WIN_EPIC_THRESHOLD !== 'undefined' ? WIN_EPIC_THRESHOLD : 25)) {
        tier = 'epic'; shakeType = 'epic';
    } else if (winMultiplier >= (typeof WIN_DRAMATIC_THRESHOLD !== 'undefined' ? WIN_DRAMATIC_THRESHOLD : 10)) {
        tier = 'big'; shakeType = null;
    } else {
        // Standard win — just particles and glow, no cinematic
        if (game) triggerWinCascade(game);
        return;
    }

    // Determine provider for particles/sound
    var providerKey = 'ironreel';
    if (typeof getGameChromeStyle === 'function') {
        providerKey = getGameChromeStyle(game);
    }

    // === CINEMATIC TIMELINE ===
    var timeline = 0;
    var pauseMs = typeof CINEMATIC_PAUSE !== 'undefined' ? CINEMATIC_PAUSE : 500;

    // 0ms: Pause (anticipation)
    setTimeout(function() {
        // Play near-miss or anticipation sound
        if (typeof SoundManager !== 'undefined' && SoundManager.playSoundEvent) {
            SoundManager.playSoundEvent('scatter', providerKey);
        }
    }, timeline);
    timeline += pauseMs;

    // 500ms: Vignette darkens
    if (quality === 'ultra') {
        setTimeout(function() {
            showCinematicVignette();
        }, timeline);
        timeline += (typeof CINEMATIC_VIGNETTE_FADE !== 'undefined' ? CINEMATIC_VIGNETTE_FADE : 300);
    }

    // 800ms: 3D depth pop
    setTimeout(function() {
        apply3DWinDepth(winningCells, allCells);
    }, timeline);
    timeline += (typeof CINEMATIC_SYMBOL_POP !== 'undefined' ? CINEMATIC_SYMBOL_POP : 300);

    // 1100ms: Screen shake
    if (shakeType && (quality === 'ultra' || quality === 'high')) {
        setTimeout(function() {
            triggerScreenShake(shakeType);
        }, timeline);
    }

    // 1200ms: Win text slam
    setTimeout(function() {
        var label;
        if (tier === 'jackpot') label = 'JACKPOT!';
        else if (tier === 'mega') label = 'MEGA WIN!';
        else if (tier === 'epic') label = 'EPIC WIN!';
        else label = 'BIG WIN!';
        showWinTextSlam(label, tier);

        // Play appropriate win sound
        if (typeof SoundManager !== 'undefined' && SoundManager.playSoundEvent) {
            SoundManager.playSoundEvent(tier === 'big' ? 'bigwin' : tier, providerKey);
        }
    }, timeline);
    timeline += (typeof CINEMATIC_TEXT_SLAM !== 'undefined' ? CINEMATIC_TEXT_SLAM : 300) + 200;

    // 1700ms: Particle explosion
    setTimeout(function() {
        // Canvas particles if available
        if (typeof triggerWinParticles === 'function') {
            var rect = (winningCells[0] || document.querySelector('.reel-grid')).getBoundingClientRect();
            var cx = rect.left + rect.width / 2;
            var cy = rect.top + rect.height / 2;
            triggerWinParticles(cx, cy, winMultiplier, providerKey);
        }
        // Also trigger legacy confetti
        if (typeof createConfetti === 'function') createConfetti();
        // Provider cascade
        if (game && typeof triggerWinCascade === 'function') triggerWinCascade(game);
    }, timeline);
    timeline += (typeof CINEMATIC_PARTICLE_BURST !== 'undefined' ? CINEMATIC_PARTICLE_BURST : 500);

    // 2200ms: Win amount counter roll
    setTimeout(function() {
        var winDisplay = document.querySelector('.win-amount-display') || document.querySelector('.slot-win-display');
        if (winDisplay) {
            animateWinCounter(winDisplay, 0, winAmount, typeof CINEMATIC_COUNTER_ROLL !== 'undefined' ? CINEMATIC_COUNTER_ROLL : 2000);
        }
    }, timeline);
    timeline += (typeof CINEMATIC_COUNTER_ROLL !== 'undefined' ? CINEMATIC_COUNTER_ROLL : 2000);

    // 4200ms: Extra confetti rain for mega+
    if (tier === 'mega' || tier === 'jackpot') {
        setTimeout(function() {
            if (typeof createConfetti === 'function') {
                createConfetti();
                setTimeout(function() { createConfetti(); }, 500);
                setTimeout(function() { createConfetti(); }, 1000);
            }
        }, timeline);
        timeline += (typeof CINEMATIC_CONFETTI_DURATION !== 'undefined' ? CINEMATIC_CONFETTI_DURATION : 3000);
    }

    // Final: Fade back to normal
    setTimeout(function() {
        hideCinematicVignette();
        remove3DWinDepth(allCells);
    }, timeline + (typeof CINEMATIC_FADE_BACK !== 'undefined' ? CINEMATIC_FADE_BACK : 500));
}
