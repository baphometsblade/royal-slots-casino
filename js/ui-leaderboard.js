(function () {
    'use strict';
    var _overlay = null, _modal = null, _refreshInterval = null, _escHandler = null;
    var _data = { bigwins: [], weekly: [], richlist: [] };
    var _activeTab = 'bigwins';

    var STYLES = [
        '#lb-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9000;align-items:center;justify-content:center;}',
        '#lb-overlay.lb-visible{display:flex;}',
        '#lb-modal{background:#1a1a2e;border:1px solid #ffd700;border-radius:12px;width:min(700px,96vw);max-height:80vh;display:flex;flex-direction:column;overflow:hidden;}',
        '#lb-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #333;}',
        '#lb-header h2{margin:0;color:#ffd700;font-size:1.25rem;}',
        '#lb-close{background:none;border:none;color:#aaa;font-size:1.5rem;cursor:pointer;line-height:1;padding:0 4px;}',
        '#lb-close:hover{color:#fff;}',
        '#lb-tabs{display:flex;border-bottom:1px solid #333;}',
        '.lb-tab{flex:1;padding:10px;background:none;border:none;color:#aaa;cursor:pointer;font-size:.9rem;border-bottom:2px solid transparent;transition:color .2s,border-color .2s;}',
        '.lb-tab.lb-tab-active,.lb-tab:hover{color:#ffd700;border-bottom-color:#ffd700;}',
        '#lb-body{overflow-y:auto;flex:1;padding:16px;}',
        '.lb-table{width:100%;border-collapse:collapse;font-size:.875rem;}',
        '.lb-table th{text-align:left;color:#888;padding:6px 8px;border-bottom:1px solid #333;font-weight:600;}',
        '.lb-table th:not(:first-child),.lb-table td:not(:first-child){text-align:right;}',
        '.lb-table td{padding:8px;border-bottom:1px solid #222;color:#ddd;}',
        '.lb-table tr:last-child td{border-bottom:none;}',
        '.lb-rank-1 .lb-rank-cell,.lb-rank-2 .lb-rank-cell,.lb-rank-3 .lb-rank-cell{font-size:1.1rem;}',
        '.lb-rank-1 td{color:#ffd700;}',
        '.lb-rank-2 td{color:#c0c0c0;}',
        '.lb-rank-3 td{color:#cd7f32;}',
        '.lb-empty{text-align:center;color:#888;padding:40px 0;}',
        '.lb-loading{text-align:center;color:#888;padding:40px 0;}',
        '#lb-footer{padding:8px 20px;border-top:1px solid #333;color:#555;font-size:.75rem;text-align:right;}'
    ].join('');

    function _injectStyles() {
        if (document.getElementById('leaderboardStyles')) return;
        var s = document.createElement('style');
        s.id = 'leaderboardStyles';
        s.textContent = STYLES;
        document.head.appendChild(s);
    }

    function _fmtMoney(n) {
        var parts = parseFloat(n).toFixed(2).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return '$' + parts.join('.');
    }

    function _rankDisplay(rank) {
        if (rank === 1) return String.fromCodePoint(0x1F947);
        if (rank === 2) return String.fromCodePoint(0x1F948);
        if (rank === 3) return String.fromCodePoint(0x1F949);
        return '#' + rank;
    }

    function _rankClass(rank) {
        return 'lb-rank' + (rank <= 3 ? ' lb-rank-' + rank : '');
    }

    function _esc(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\x22/g, '&quot;');
    }

    function _empty() {
        var d = document.createElement('div');
        d.className = 'lb-empty';
        d.textContent = 'No data yet \u2014 be the first on the board!';
        return d;
    }

    function _makeTable(headers) {
        var table = document.createElement('table');
        table.className = 'lb-table';
        var thead = document.createElement('thead');
        var tr = document.createElement('tr');
        headers.forEach(function (h) {
            var th = document.createElement('th');
            th.textContent = h;
            tr.appendChild(th);
        });
        thead.appendChild(tr);
        table.appendChild(thead);
        var tbody = document.createElement('tbody');
        table.appendChild(tbody);
        return { table: table, tbody: tbody };
    }

    function _addRow(tbody, cells, rankClass) {
        var tr = document.createElement('tr');
        if (rankClass) tr.className = rankClass;
        cells.forEach(function (c, i) {
            var td = document.createElement('td');
            if (i === 0) td.className = 'lb-rank-cell';
            td.textContent = c;
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    }

    function _renderBigWins(entries) {
        var body = document.getElementById('lb-body');
        body.innerHTML = '';
        if (!entries || !entries.length) { body.appendChild(_empty()); return; }
        var t = _makeTable(['Rank', 'Player', 'Game', 'Multiplier', 'Won']);
        entries.forEach(function (e) {
            _addRow(t.tbody,
                [_rankDisplay(e.rank), _esc(e.maskedUser), _esc(e.gameId || '-'), e.multiplier + 'x', _fmtMoney(e.winAmount)],
                _rankClass(e.rank));
        });
        body.appendChild(t.table);
    }

    function _renderWeekly(entries) {
        var body = document.getElementById('lb-body');
        body.innerHTML = '';
        if (!entries || !entries.length) { body.appendChild(_empty()); return; }
        var t = _makeTable(['Rank', 'Player', 'Wagered', 'Spins']);
        entries.forEach(function (e) {
            _addRow(t.tbody,
                [_rankDisplay(e.rank), _esc(e.maskedUser), _fmtMoney(e.totalWagered), e.spinCount],
                _rankClass(e.rank));
        });
        body.appendChild(t.table);
    }

    function _renderRichList(entries) {
        var body = document.getElementById('lb-body');
        body.innerHTML = '';
        if (!entries || !entries.length) { body.appendChild(_empty()); return; }
        var t = _makeTable(['Rank', 'Player', 'Balance']);
        entries.forEach(function (e) {
            _addRow(t.tbody,
                [_rankDisplay(e.rank), _esc(e.maskedUser), _fmtMoney(e.balance)],
                _rankClass(e.rank));
        });
        body.appendChild(t.table);
    }

    function _renderActiveTab() {
        if (_activeTab === 'bigwins') _renderBigWins(_data.bigwins);
        else if (_activeTab === 'weekly') _renderWeekly(_data.weekly);
        else _renderRichList(_data.richlist);
    }

    function _switchTab(key) {
        _activeTab = key;
        var tabs = document.querySelectorAll('.lb-tab');
        tabs.forEach(function (t) {
            t.classList.toggle('lb-tab-active', t.getAttribute('data-tab') === key);
        });
        _renderActiveTab();
    }

    function _setLoading() {
        var body = document.getElementById('lb-body');
        if (body) body.innerHTML = '<div class=\x27lb-loading\x27>Loading\u2026</div>';
    }

    function _fetchAll() {
        _setLoading();
        Promise.all([
            fetch('/api/leaderboard/bigwins').then(function (r) { return r.json(); }),
            fetch('/api/leaderboard/weekly').then(function (r) { return r.json(); }),
            fetch('/api/leaderboard/richlist').then(function (r) { return r.json(); })
        ]).then(function (results) {
            _data.bigwins  = results[0].entries || [];
            _data.weekly   = results[1].entries || [];
            _data.richlist = results[2].entries || [];
            _renderActiveTab();
            var footer = document.getElementById('lb-footer');
            if (footer) footer.textContent = 'Updated ' + new Date().toLocaleTimeString();
        }).catch(function () {
            var body = document.getElementById('lb-body');
            if (body) body.innerHTML = '<div class=\x27lb-empty\x27>Failed to load leaderboard.</div>';
        });
    }

    function _buildModal() {
        _overlay = document.createElement('div');
        _overlay.id = 'lb-overlay';

        _modal = document.createElement('div');
        _modal.id = 'lb-modal';
        _modal.setAttribute('role', 'dialog');
        _modal.setAttribute('aria-label', 'Leaderboard');

        var header = document.createElement('div');
        header.id = 'lb-header';
        var h2 = document.createElement('h2');
        h2.textContent = 'Leaderboard';
        var closeBtn = document.createElement('button');
        closeBtn.id = 'lb-close';
        closeBtn.textContent = '\u00D7';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.addEventListener('click', closeLeaderboardModal);
        header.appendChild(h2);
        header.appendChild(closeBtn);

        var tabBar = document.createElement('div');
        tabBar.id = 'lb-tabs';
        [
            { key: 'bigwins',  label: 'Big Wins'  },
            { key: 'weekly',   label: 'Weekly'    },
            { key: 'richlist', label: 'Rich List' }
        ].forEach(function (tab) {
            var btn = document.createElement('button');
            btn.className = 'lb-tab' + (tab.key === _activeTab ? ' lb-tab-active' : '');
            btn.setAttribute('data-tab', tab.key);
            btn.textContent = tab.label;
            btn.addEventListener('click', (function (k) { return function () { _switchTab(k); }; })(tab.key));
            tabBar.appendChild(btn);
        });

        var bodyDiv = document.createElement('div');
        bodyDiv.id = 'lb-body';

        var footer = document.createElement('div');
        footer.id = 'lb-footer';
        footer.textContent = 'Auto-refreshes every 60s';

        _modal.appendChild(header);
        _modal.appendChild(tabBar);
        _modal.appendChild(bodyDiv);
        _modal.appendChild(footer);
        _overlay.appendChild(_modal);
        document.body.appendChild(_overlay);

        _overlay.addEventListener('click', function (e) {
            if (e.target === _overlay) closeLeaderboardModal();
        });
    }

    function openLeaderboardModal() {
        _injectStyles();
        if (!_overlay) _buildModal();
        _overlay.classList.add('lb-visible');
        _fetchAll();
        _refreshInterval = setInterval(_fetchAll, 60000);
        _escHandler = function (e) { if (e.key === 'Escape') closeLeaderboardModal(); };
        document.addEventListener('keydown', _escHandler);
    }

    function closeLeaderboardModal() {
        if (_overlay) _overlay.classList.remove('lb-visible');
        if (_refreshInterval) { clearInterval(_refreshInterval); _refreshInterval = null; }
        if (_escHandler) { document.removeEventListener('keydown', _escHandler); _escHandler = null; }
    }

    window.openLeaderboardModal = openLeaderboardModal;
    window.closeLeaderboardModal = closeLeaderboardModal;
}());
