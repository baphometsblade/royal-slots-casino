(function(){ 'use strict';

/* =====================================================
   ui-referral.js — Referral / Invite System
   Sprint 30 · Matrix Spins Casino
   ===================================================== */

var RP_STORAGE_KEY = 'ms_referralData';

var REFERRAL_MILESTONES = [
  { friends: 1,  reward: '$10 Bonus',              value: 10,  extra: '' },
  { friends: 3,  reward: '$50 Bonus',              value: 50,  extra: '' },
  { friends: 5,  reward: '$100 + VIP Boost',       value: 100, extra: 'VIP boost' },
  { friends: 10, reward: '$250 + Exclusive Badge',  value: 250, extra: 'Exclusive badge' },
];

/* ---------- helpers ---------- */

function _hashCode(str) {
  var h = 0;
  for (var i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function _generateCode() {
  var user = (typeof currentUser !== 'undefined' && currentUser && currentUser.username)
    ? currentUser.username : '';
  if (user) {
    var hash = _hashCode(user).toString(36).toUpperCase();
    while (hash.length < 8) hash = hash + hash;
    return hash.substring(0, 8);
  }
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var code = '';
  for (var i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function _loadData() {
  try {
    var raw = localStorage.getItem(RP_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}

function _saveData(data) {
  try { localStorage.setItem(RP_STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
}

function _ensureData() {
  var data = _loadData();
  if (!data || !data.code) {
    data = {
      code: _generateCode(),
      shareCount: 0,
      friendsJoined: 0,
      earned: 0,
      pending: 0
    };
    _saveData(data);
  }
  return data;
}

function _getReferralLink(code) {
  return window.location.origin + '?ref=' + code;
}

/* ---------- UI rendering ---------- */

function _renderMilestones(data) {
  var list = document.getElementById('rpRewardsList');
  if (!list) return;
  var html = '';
  for (var i = 0; i < REFERRAL_MILESTONES.length; i++) {
    var m = REFERRAL_MILESTONES[i];
    var reached = data.friendsJoined >= m.friends;
    html += '<div class="rp-milestone ' + (reached ? 'rp-milestone-done' : 'rp-milestone-locked') + '">';
    html += '<span class="rp-milestone-icon">' + (reached ? '✅' : '🔒') + '</span>';
    html += '<span class="rp-milestone-text">' + m.friends + ' friend' + (m.friends > 1 ? 's' : '') + ' — ' + m.reward + '</span>';
    html += '</div>';
  }
  list.innerHTML = html;
}

function _renderStats(data) {
  var elCode = document.getElementById('rpCode');
  var elLink = document.getElementById('rpLink');
  var elFriends = document.getElementById('rpFriends');
  var elEarned = document.getElementById('rpEarned');
  var elPending = document.getElementById('rpPending');
  var elShares = document.getElementById('rpShares');

  if (elCode) elCode.textContent = data.code;
  if (elLink) elLink.value = _getReferralLink(data.code);
  if (elFriends) elFriends.textContent = data.friendsJoined;
  if (elEarned) elEarned.textContent = '$' + data.earned.toFixed(2);
  if (elPending) elPending.textContent = '$' + data.pending.toFixed(2);
  if (elShares) elShares.textContent = data.shareCount;
}

function _updateUI() {
  var data = _ensureData();
  _renderStats(data);
  _renderMilestones(data);
}

/* ---------- public API ---------- */

window.openReferralPanel = function() {
  var panel = document.getElementById('referralPanel');
  if (panel) {
    _updateUI();
    panel.classList.add('rp-open');
  }
};

window.closeReferralPanel = function() {
  var panel = document.getElementById('referralPanel');
  if (panel) panel.classList.remove('rp-open');
};

window.copyReferralLink = function() {
  var data = _ensureData();
  var link = _getReferralLink(data.code);
  var btn = document.getElementById('rpCopyBtn');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).then(function() {
      _showCopied(btn);
    }).catch(function() {
      _fallbackCopy(link, btn);
    });
  } else {
    _fallbackCopy(link, btn);
  }

  data.shareCount = (data.shareCount || 0) + 1;
  _saveData(data);
  var elShares = document.getElementById('rpShares');
  if (elShares) elShares.textContent = data.shareCount;
};

function _fallbackCopy(text, btn) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) { /* ignore */ }
  document.body.removeChild(ta);
  _showCopied(btn);
}

function _showCopied(btn) {
  if (!btn) return;
  var orig = btn.textContent;
  btn.textContent = 'Copied!';
  btn.classList.add('rp-copied');
  setTimeout(function() {
    btn.textContent = orig;
    btn.classList.remove('rp-copied');
  }, 2000);
}

/* ---------- FAB visibility ---------- */

function _updateFabVisibility() {
  var fab = document.getElementById('referralFab');
  if (!fab) return;
  var lobby = document.getElementById('lobbyContainer');
  var inLobby = lobby && lobby.style.display !== 'none';
  fab.style.display = inLobby ? 'flex' : 'none';
}

/* ---------- simulated referral activity ---------- */

function _simulateActivity(data) {
  if (data.friendsJoined < 2 && Math.random() < 0.2) {
    data.friendsJoined += 1;
    data.earned += 10;
    _saveData(data);
  }
}

/* ---------- init ---------- */

function _init() {
  if (window.location.search.indexOf('noBonus=1') !== -1) return;

  var data = _ensureData();
  _simulateActivity(data);
  _updateUI();
  _updateFabVisibility();

  var fab = document.getElementById('referralFab');
  if (fab) fab.addEventListener('click', window.openReferralPanel);

  var closeBtn = document.getElementById('rpCloseBtn');
  if (closeBtn) closeBtn.addEventListener('click', window.closeReferralPanel);

  var copyBtn = document.getElementById('rpCopyBtn');
  if (copyBtn) copyBtn.addEventListener('click', window.copyReferralLink);

  /* Re-check FAB visibility periodically */
  setInterval(_updateFabVisibility, 3000);
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(_init, 1800);
});

})();
