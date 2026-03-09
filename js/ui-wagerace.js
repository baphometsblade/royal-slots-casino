(function () {
  'use strict';

  var POLL_MS = 30000; // refresh leaderboard every 30s
  var _panel  = null;
  var _cdTimer = null;
  var _raceEndsAt = null;
  var _inited = false;

  // ── Build panel ──────────────────────────────────────────────────────────

  function buildPanel() {
    if (_panel) return;

    var s = document.createElement('style');
    s.textContent = [
      '#wrPanel{position:fixed;bottom:80px;left:18px;z-index:10400;width:220px;',
      'background:linear-gradient(160deg,#0d0d1a,#1a0a2e);',
      'border:1px solid rgba(139,92,246,.35);border-radius:12px;',
      'box-shadow:0 6px 24px rgba(0,0,0,.6);font-size:12px;color:rgba(255,255,255,.85);',
      'display:none;overflow:hidden}',
      '#wrPanel.visible{display:block}',
      '#wrHeader{background:linear-gradient(90deg,rgba(139,92,246,.25),transparent);',
      'padding:8px 12px;display:flex;align-items:center;justify-content:space-between;',
      'border-bottom:1px solid rgba(139,92,246,.2)}',
      '#wrTitle{font-weight:800;font-size:13px;color:#c084fc;letter-spacing:.5px}',
      '#wrCd{font-size:10px;color:rgba(255,255,255,.45);font-variant-numeric:tabular-nums}',
      '#wrList{padding:8px 12px;display:flex;flex-direction:column;gap:5px}',
      '.wr-row{display:flex;align-items:center;gap:6px}',
      '.wr-rank{font-size:10px;font-weight:700;width:16px;text-align:center;color:rgba(255,255,255,.4)}',
      '.wr-rank.gold{color:#ffd700}.wr-rank.silver{color:#c0c0c0}.wr-rank.bronze{color:#cd7f32}',
      '.wr-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}',
      '.wr-amt{font-size:10px;color:rgba(139,92,246,.9);font-weight:700;white-space:nowrap}',
      '#wrPrizes{padding:5px 12px 8px;font-size:10px;color:rgba(255,255,255,.4);',
      'border-top:1px solid rgba(255,255,255,.06);text-align:center}',
      '#wrMinimize{background:none;border:none;color:rgba(255,255,255,.3);cursor:pointer;',
      'font-size:14px;line-height:1;padding:0}'
    ].join('');
    document.head.appendChild(s);

    _panel = document.createElement('div');
    _panel.id = 'wrPanel';

    var header = document.createElement('div');
    header.id = 'wrHeader';

    var title = document.createElement('span');
    title.id = 'wrTitle';
    title.textContent = '\u26A1 HOURLY RACE';
    header.appendChild(title);

    var right = document.createElement('div');
    right.style.cssText = 'display:flex;align-items:center;gap:8px';

    var cd = document.createElement('span');
    cd.id = 'wrCd';
    cd.textContent = '--:--';
    right.appendChild(cd);

    var minBtn = document.createElement('button');
    minBtn.id = 'wrMinimize';
    minBtn.textContent = '\u2212';
    minBtn.title = 'Minimize';
    minBtn.addEventListener('click', toggleMinimize);
    right.appendChild(minBtn);

    header.appendChild(right);
    _panel.appendChild(header);

    var list = document.createElement('div');
    list.id = 'wrList';
    _panel.appendChild(list);

    var prizes = document.createElement('div');
    prizes.id = 'wrPrizes';
    prizes.textContent = '\uD83C\uDFC6 Top 10 win real prizes!';
    _panel.appendChild(prizes);

    document.body.appendChild(_panel);
  }

  var _minimized = false;

  function toggleMinimize() {
    _minimized = !_minimized;
    var list = document.getElementById('wrList');
    var prizes = document.getElementById('wrPrizes');
    var btn = document.getElementById('wrMinimize');
    if (_minimized) {
      if (list) list.style.display = 'none';
      if (prizes) prizes.style.display = 'none';
      if (btn) btn.textContent = '\u002B';
    } else {
      if (list) list.style.display = '';
      if (prizes) prizes.style.display = '';
      if (btn) btn.textContent = '\u2212';
    }
  }

  // ── Countdown ────────────────────────────────────────────────────────────

  function startCountdown(endsAt) {
    _raceEndsAt = endsAt;
    if (_cdTimer) clearInterval(_cdTimer);
    function tick() {
      var diff = Math.max(0, Math.floor((new Date(endsAt) - Date.now()) / 1000));
      var m = Math.floor(diff / 60);
      var s = diff % 60;
      var el = document.getElementById('wrCd');
      if (el) el.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      if (diff <= 0) {
        clearInterval(_cdTimer);
        fetchAndRender(); // refresh after race ends
      }
    }
    tick();
    _cdTimer = setInterval(tick, 1000);
  }

  // ── Render leaderboard ───────────────────────────────────────────────────

  function fmtWager(n) {
    return '$' + parseFloat(n || 0).toFixed(2);
  }

  var RANK_CLASSES = ['gold', 'silver', 'bronze'];
  var RANK_ICONS   = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];

  function renderList(leaderboard) {
    var list = document.getElementById('wrList');
    if (!list) return;
    // Clear
    while (list.firstChild) list.removeChild(list.firstChild);

    if (!leaderboard || leaderboard.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'color:rgba(255,255,255,.35);text-align:center;padding:4px 0;font-size:11px';
      empty.textContent = 'Be the first to spin!';
      list.appendChild(empty);
      return;
    }

    var top = leaderboard.slice(0, 5);
    top.forEach(function (entry, i) {
      var row = document.createElement('div');
      row.className = 'wr-row';

      var rank = document.createElement('span');
      rank.className = 'wr-rank' + (RANK_CLASSES[i] ? ' ' + RANK_CLASSES[i] : '');
      rank.textContent = RANK_ICONS[i] || String(entry.place || i + 1);
      row.appendChild(rank);

      var name = document.createElement('span');
      name.className = 'wr-name';
      name.textContent = entry.display_name || entry.username || 'Player';
      name.title = name.textContent;
      row.appendChild(name);

      var amt = document.createElement('span');
      amt.className = 'wr-amt';
      amt.textContent = fmtWager(entry.total_wagered);
      row.appendChild(amt);

      list.appendChild(row);
    });
  }

  // ── Fetch ────────────────────────────────────────────────────────────────

  function fetchAndRender() {
    fetch('/api/wagerace')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.race) { hidePanel(); return; }
        buildPanel();
        _panel.classList.add('visible');
        renderList(data.leaderboard);
        if (data.race.ends_at) startCountdown(data.race.ends_at);
      })
      .catch(function () {});
  }

  function hidePanel() {
    if (_panel) _panel.classList.remove('visible');
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  function init() {
    if (_inited) return;
    _inited = true;
    fetchAndRender();
    setInterval(fetchAndRender, POLL_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 4000); });
  } else {
    setTimeout(init, 4000);
  }

}());
