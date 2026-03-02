(function () {
'use strict';

// Inject styles once
function injectStyles() {
    if (document.getElementById('achievementsStyles')) return;
    const style = document.createElement('style');
    style.id = 'achievementsStyles';
    style.textContent = [
'.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.75); z-index: 9000; display: none; align-items: center; justify-content: center; }',
'.modal-overlay.active { display: flex; }',
'.achievements-modal { background: #0d0d1a; border: 1px solid #2a2a4a; border-radius: 12px; max-width: 680px; width: 95vw; max-height: 85vh; overflow-y: auto; padding: 0; color: #e0e0ff; }',
'.ach-header { position: sticky; top: 0; background: #0d0d1a; z-index: 10; padding: 20px 24px 16px; border-bottom: 1px solid #2a2a4a; display: flex; align-items: center; gap: 12px; }',
'.ach-title { font-size: 1.4rem; font-weight: 700; letter-spacing: .05em; color: #ffd700; flex: 1; }',
'.ach-close-btn { background: none; border: none; color: #888; font-size: 1.5rem; cursor: pointer; padding: 4px 8px; border-radius: 4px; }',
'.ach-close-btn:hover { color: #fff; background: rgba(255,255,255,.1); }',
'.ach-stats-bar { background: rgba(255,215,0,.08); border-bottom: 1px solid #2a2a4a; padding: 10px 24px; font-size: .85rem; color: #aaa; }',
'.ach-body { padding: 20px 24px; }',
'.ach-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }',
'.ach-card { padding: 16px; border-radius: 8px; background: #1a1a2e; border: 1px dashed rgba(255,255,255,.15); opacity: .6; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; }',
'.ach-card.unlocked { border: 2px solid #ffd700; background: #1f1a08; opacity: 1; }',
'.ach-card.just-unlocked { animation: achFlash 1.2s ease 3; }',
'@keyframes achFlash { 0%,100% { border-color: #ffd700; box-shadow: none; } 50% { border-color: #fff; box-shadow: 0 0 16px #ffd700; } }',
'.ach-icon { font-size: 2.5rem; display: block; text-align: center; line-height: 1; }',
'.ach-name { font-size: .9rem; font-weight: 600; color: #e0e0ff; }',
'.ach-desc { font-size: .75rem; color: #888; }',
'.ach-reward { display: inline-block; font-size: .7rem; padding: 2px 8px; border-radius: 12px; margin-top: 4px; font-weight: 600; }',
'.ach-reward.gems { background: rgba(147,51,234,.25); color: #c084fc; border: 1px solid #7c3aed; }',
'.ach-reward.credits { background: rgba(34,197,94,.15); color: #86efac; border: 1px solid #16a34a; }',
'.ach-status { font-size: .7rem; margin-top: 4px; }',
'.ach-card.unlocked .ach-status { color: #4ade80; }',
'.ach-card.locked .ach-status { color: #555; }',
'.ach-toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 99999; background: linear-gradient(135deg,#15803d,#166534); color: #fff; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: .95rem; box-shadow: 0 4px 20px rgba(0,0,0,.4); animation: toastSlide .35s ease; white-space: nowrap; }',
'@keyframes toastSlide { from { opacity: 0; transform: translateX(-50%) translateY(-12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }',
'@media (max-width: 600px) { .ach-grid { grid-template-columns: repeat(2, 1fr); } .achievements-modal { max-height: 90vh; } }',
    ].join('');
    document.head.appendChild(style);
}

// Toast notification
function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'ach-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () {
        t.style.transition = 'opacity .4s';
        t.style.opacity = '0';
        setTimeout(function () { t.remove(); }, 450);
    }, 3600);
}

function queueToasts(list) {
    list.forEach(function (ach, i) {
        setTimeout(function () {
            showToast('Achievement Unlocked: ' + ach.name + '!');
        }, i * 800);
    });
}

// Build a single achievement card element (no innerHTML on API data)
function buildCard(ach, justUnlocked) {
    const card = document.createElement('div');
    card.className = 'ach-card' + (ach.unlocked ? ' unlocked' : ' locked') + (justUnlocked ? ' just-unlocked' : '');

    const icon = document.createElement('span');
    icon.className = 'ach-icon';
    icon.textContent = ach.icon;

    const name = document.createElement('div');
    name.className = 'ach-name';
    name.textContent = ach.name;

    const desc = document.createElement('div');
    desc.className = 'ach-desc';
    desc.textContent = ach.description;

    const reward = document.createElement('span');
    reward.className = 'ach-reward' + ' ' + ach.rewardType;
    const rewardLabel = ach.rewardType === 'gems' ? ach.rewardAmount + ' Gems' : '$' + ach.rewardAmount;
    reward.textContent = rewardLabel;

    const status = document.createElement('div');
    status.className = 'ach-status';
    if (ach.unlocked) {
        const dateStr = ach.unlockedAt ? ach.unlockedAt.substring(0, 10) : '';
        status.textContent = 'Unlocked' + (dateStr ? ' ' + dateStr : '');
    } else {
        status.textContent = 'Locked';
    }

    card.appendChild(icon);
    card.appendChild(name);
    card.appendChild(desc);
    card.appendChild(reward);
    card.appendChild(status);
    return card;
}

// Render modal content given achievement data + stats + set of just-unlocked IDs
function renderModal(modal, data, justUnlockedIds) {
    // Stats bar
    const statsBar = modal.querySelector('.ach-stats-bar');
    const s = data.stats;
    statsBar.textContent = s.unlocked + ' / ' + s.total + ' unlocked  ·  ' + s.gemsEarned + ' Gems earned  ·  $' + s.creditsEarned + ' earned';

    // Grid
    const grid = modal.querySelector('.ach-grid');
    grid.innerHTML = '';
    data.achievements.forEach(function (ach) {
        const justUnlocked = justUnlockedIds.has(ach.id);
        grid.appendChild(buildCard(ach, justUnlocked));
    });
}

// Build the modal DOM (once)
function buildModal() {
    if (document.getElementById('achievementsOverlay')) {
        return document.getElementById('achievementsOverlay');
    }

    const overlay = document.createElement('div');
    overlay.id = 'achievementsOverlay';
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.id = 'achievementsModal';
    modal.className = 'modal achievements-modal';

    // Header
    const header = document.createElement('div');
    header.className = 'ach-header';

    const title = document.createElement('div');
    title.className = 'ach-title';
    title.textContent = 'TROPHY ROOM';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ach-close-btn';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = 'X';
    closeBtn.addEventListener('click', closeAchievementsModal);

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Stats bar
    const statsBar = document.createElement('div');
    statsBar.className = 'ach-stats-bar';
    statsBar.textContent = 'Loading...';

    // Body + grid
    const body = document.createElement('div');
    body.className = 'ach-body';

    const grid = document.createElement('div');
    grid.className = 'ach-grid';
    body.appendChild(grid);

    modal.appendChild(header);
    modal.appendChild(statsBar);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close on backdrop click
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeAchievementsModal();
    });

    return overlay;
}

// Get the auth token from globals or localStorage
function getAuthToken() {
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.token) {
        return currentUser.token;
    }
    try {
        const u = JSON.parse(localStorage.getItem('casino_user') || 'null');
        return u && u.token ? u.token : null;
    } catch (e) {
        return null;
    }
}

// POST /api/achievements/check
async function checkAchievements() {
    const token = getAuthToken();
    if (!token) return [];
    try {
        const res = await fetch('/api/achievements/check', {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json',
            },
        });
        if (!res.ok) return [];
        const data = await res.json();
        return data.newlyUnlocked || [];
    } catch (err) {
        console.warn('[Achievements] check failed:', err.message);
        return [];
    }
}

// GET /api/achievements
async function fetchAchievements() {
    const token = getAuthToken();
    if (!token) return null;
    try {
        const res = await fetch('/api/achievements', {
            headers: { Authorization: 'Bearer ' + token },
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (err) {
        console.warn('[Achievements] fetch failed:', err.message);
        return null;
    }
}

// ESC key handler
function onKeyDown(e) {
    if (e.key === 'Escape') closeAchievementsModal();
}

// Open flow: check -> toast -> fetch -> render
async function openAchievementsModal() {
    injectStyles();
    const overlay = buildModal();
    overlay.classList.add('active');
    document.addEventListener('keydown', onKeyDown);

    const modal = overlay.querySelector('.achievements-modal');
    const statsBar = modal.querySelector('.ach-stats-bar');
    const grid = modal.querySelector('.ach-grid');
    statsBar.textContent = 'Checking progress...';
    grid.innerHTML = '';

    // Step 1: check (unlock any earned)
    const newlyUnlocked = await checkAchievements();
    const justUnlockedIds = new Set(newlyUnlocked.map(function (a) { return a.id; }));

    // Step 2: toast notifications for newly unlocked
    if (newlyUnlocked.length > 0) {
        queueToasts(newlyUnlocked);
    }

    // Step 3: fetch full list and render
    const data = await fetchAchievements();
    if (!data) {
        statsBar.textContent = 'Unable to load achievements.';
        const msg = document.createElement('p');
        msg.style.cssText = 'text-align:center;color:#888;padding:40px 0;';
        msg.textContent = 'Could not connect to server. Please try again later.';
        grid.appendChild(msg);
        return;
    }

    renderModal(modal, data, justUnlockedIds);
}

function closeAchievementsModal() {
    const overlay = document.getElementById('achievementsOverlay');
    if (overlay) overlay.classList.remove('active');
    document.removeEventListener('keydown', onKeyDown);
}

// Expose to global scope
window.openAchievementsModal = openAchievementsModal;
window.closeAchievementsModal = closeAchievementsModal;

})();

