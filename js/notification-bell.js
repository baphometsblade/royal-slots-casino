(function() {
  'use strict';

  // API helper function
  async function api(path, opts = {}) {
    if (typeof apiRequest === 'function') return apiRequest(path, opts);
    const tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
    const token = localStorage.getItem(tokenKey);
    if (!token) return null;
    const res = await fetch(path, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(opts.headers || {})
      }
    });
    return res.json();
  }

  // Relative time formatter
  function getRelativeTime(createdAt) {
    const now = new Date();
    const date = new Date(createdAt);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Type icon color mapping
  const typeColors = {
    info: '#87ceeb',
    success: '#90ee90',
    warning: '#ffa500',
    bonus: '#ffd700'
  };

  // SVG icon generator
  function createBellIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    svg.innerHTML = `
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    `;
    return svg;
  }

  // Type icon generator
  function createTypeIcon(type) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '16');
    svg.setAttribute('height', '16');
    svg.setAttribute('fill', 'currentColor');

    const color = typeColors[type] || '#ffffff';

    let iconPath = '';
    switch (type) {
      case 'success':
        iconPath = '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path>';
        break;
      case 'warning':
        iconPath = '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path>';
        break;
      case 'bonus':
        iconPath = '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path>';
        break;
      default:
        iconPath = '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>';
        break;
    }

    svg.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="${color}">${iconPath}</svg>`;
    return svg;
  }

  // State
  let state = {
    notifications: [],
    unreadCount: 0,
    isOpen: false,
    bellBtn: null,
    dropdown: null,
    pollingInterval: null
  };

  // Inject styles
  function injectStyles() {
    const styleId = 'notification-bell-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .notification-bell-btn {
        position: relative;
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffd700;
        transition: color 0.3s ease;
      }

      .notification-bell-btn:hover {
        color: #ffed4e;
      }

      .notification-bell-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background-color: #e74c3c;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        min-width: 20px;
      }

      .notification-bell-badge.hidden {
        display: none;
      }

      .notification-dropdown {
        position: fixed;
        background-color: #1a1a2e;
        border: 1px solid #444;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
        z-index: 9999;
        min-width: 380px;
        max-width: 420px;
        top: 0;
        left: 0;
        display: none;
        flex-direction: column;
        max-height: 600px;
        overflow: hidden;
      }

      .notification-dropdown.open {
        display: flex;
      }

      .notification-dropdown-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid #444;
        flex-shrink: 0;
      }

      .notification-dropdown-header h3 {
        margin: 0;
        color: #ffffff;
        font-size: 16px;
        font-weight: 600;
      }

      .notification-dropdown-header a {
        color: #ffd700;
        text-decoration: none;
        font-size: 12px;
        cursor: pointer;
        transition: color 0.3s ease;
      }

      .notification-dropdown-header a:hover {
        color: #ffed4e;
      }

      .notification-dropdown-list {
        flex: 1;
        overflow-y: auto;
        max-height: 350px;
      }

      .notification-dropdown-list::-webkit-scrollbar {
        width: 6px;
      }

      .notification-dropdown-list::-webkit-scrollbar-track {
        background: transparent;
      }

      .notification-dropdown-list::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 3px;
      }

      .notification-dropdown-list::-webkit-scrollbar-thumb:hover {
        background: #555;
      }

      .notification-item {
        padding: 12px 16px;
        border-bottom: 1px solid #333;
        cursor: pointer;
        transition: background-color 0.2s ease;
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }

      .notification-item:hover {
        background-color: #252541;
      }

      .notification-item.unread {
        border-left: 3px solid #ffd700;
        padding-left: 13px;
        background-color: rgba(255, 215, 0, 0.05);
      }

      .notification-item-icon {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 2px;
      }

      .notification-item-content {
        flex: 1;
        min-width: 0;
      }

      .notification-item-title {
        margin: 0 0 4px 0;
        color: #ffffff;
        font-weight: 600;
        font-size: 14px;
      }

      .notification-item-body {
        margin: 0 0 6px 0;
        color: #b0b0b0;
        font-size: 12px;
        line-height: 1.4;
        word-wrap: break-word;
      }

      .notification-item-time {
        margin: 0;
        color: #666;
        font-size: 11px;
      }

      .notification-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100px;
        color: #666;
        font-size: 14px;
        text-align: center;
      }

      .notification-dropdown-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 9998;
        display: none;
      }

      .notification-dropdown-overlay.open {
        display: block;
      }
    `;
    document.head.appendChild(style);
  }

  // Find insertion point in header
  function findHeaderContainer() {
    // Try common header container selectors
    let container = document.querySelector('.header-actions') ||
                   document.querySelector('.user-info') ||
                   document.querySelector('header .actions') ||
                   document.querySelector('header [class*="action"]');

    // Fall back to finding first button in header
    if (!container) {
      const header = document.querySelector('header');
      if (header) {
        const firstBtn = header.querySelector('button');
        if (firstBtn) {
          container = firstBtn.parentElement;
        }
      }
    }

    return container;
  }

  // Fetch notifications from API
  async function fetchNotifications() {
    try {
      const data = await api('/api/notifications');
      if (data && data.notifications) {
        state.notifications = data.notifications;
        state.unreadCount = data.unreadCount || 0;
        return true;
      }
    } catch (err) {
      console.warn('[NotificationBell] Could not fetch notifications:', err.message || err);
    }
    return false;
  }

  // Mark single notification as read
  async function markAsRead(notificationId) {
    try {
      await api(`/api/notifications/read/${notificationId}`, { method: 'POST' });
    } catch (err) {
      console.warn('[NotificationBell] Could not mark as read:', err.message || err);
    }
  }

  // Mark all as read
  async function markAllAsRead() {
    try {
      await api('/api/notifications/read-all', { method: 'POST' });
      await refresh();
    } catch (err) {
      console.warn('[NotificationBell] Could not mark all as read:', err.message || err);
    }
  }

  // Update badge display
  function updateBadge() {
    const badge = state.bellBtn.querySelector('.notification-bell-badge');
    if (state.unreadCount > 0) {
      badge.textContent = state.unreadCount > 99 ? '99+' : state.unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  // Render dropdown content
  function renderDropdown() {
    const list = state.dropdown.querySelector('.notification-dropdown-list');
    list.innerHTML = '';

    if (state.notifications.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'notification-empty';
      empty.textContent = 'No notifications yet';
      list.appendChild(empty);
      return;
    }

    state.notifications.forEach(notif => {
      const item = document.createElement('div');
      item.className = 'notification-item';
      if (!notif.read) {
        item.classList.add('unread');
      }

      const iconContainer = document.createElement('div');
      iconContainer.className = 'notification-item-icon';
      iconContainer.appendChild(createTypeIcon(notif.type));

      const content = document.createElement('div');
      content.className = 'notification-item-content';

      const title = document.createElement('p');
      title.className = 'notification-item-title';
      title.textContent = notif.title;

      const body = document.createElement('p');
      body.className = 'notification-item-body';
      body.textContent = notif.body;

      const time = document.createElement('p');
      time.className = 'notification-item-time';
      time.textContent = getRelativeTime(notif.created_at);

      content.appendChild(title);
      content.appendChild(body);
      content.appendChild(time);

      item.appendChild(iconContainer);
      item.appendChild(content);

      item.addEventListener('click', async () => {
        if (!notif.read) {
          await markAsRead(notif.id);
        }
        if (notif.link_action) {
          // Try to navigate if it's a URL, otherwise treat as a function name
          if (notif.link_action.startsWith('http')) {
            window.location.href = notif.link_action;
          } else if (typeof window[notif.link_action] === 'function') {
            window[notif.link_action]();
          }
        }
        await refresh();
      });

      list.appendChild(item);
    });
  }

  // Toggle dropdown
  function toggleDropdown() {
    state.isOpen = !state.isOpen;
    if (state.isOpen) {
      renderDropdown();
      state.dropdown.classList.add('open');
      overlay.classList.add('open');
    } else {
      state.dropdown.classList.remove('open');
      overlay.classList.remove('open');
    }
    positionDropdown();
  }

  // Position dropdown below bell
  function positionDropdown() {
    if (!state.isOpen) return;

    const rect = state.bellBtn.getBoundingClientRect();
    const dropdown = state.dropdown;

    let top = rect.bottom + 8;
    let left = rect.right - 380;

    // Adjust if off-screen
    if (left < 10) left = 10;
    if (left + 380 > window.innerWidth - 10) {
      left = window.innerWidth - 390;
    }
    if (top + 350 > window.innerHeight - 10) {
      top = rect.top - 350 - 8;
    }

    dropdown.style.top = Math.max(0, top) + 'px';
    dropdown.style.left = Math.max(0, left) + 'px';
  }

  // Close dropdown
  function closeDropdown() {
    if (state.isOpen) {
      state.isOpen = false;
      state.dropdown.classList.remove('open');
      overlay.classList.remove('open');
    }
  }

  // Refresh notifications
  async function refresh() {
    const success = await fetchNotifications();
    if (success) {
      updateBadge();
      if (state.isOpen) {
        renderDropdown();
      }
    }
  }

  // Check if user is logged in
  function isLoggedIn() {
    const tokenKey = typeof STORAGE_KEY_TOKEN !== 'undefined' ? STORAGE_KEY_TOKEN : 'casinoToken';
    return !!localStorage.getItem(tokenKey);
  }

  // Initialize component
  async function init() {
    // Inject styles
    injectStyles();

    // Find or create header container
    let container = findHeaderContainer();
    if (!container) {
      // Create container if none exists
      const header = document.querySelector('header') || document.body;
      container = document.createElement('div');
      container.className = 'header-actions';
      header.appendChild(container);
    }

    // Create bell button
    state.bellBtn = document.createElement('button');
    state.bellBtn.className = 'notification-bell-btn';
    state.bellBtn.setAttribute('aria-label', 'Notifications');
    state.bellBtn.setAttribute('type', 'button');

    // Add bell icon
    state.bellBtn.appendChild(createBellIcon());

    // Add badge
    const badge = document.createElement('div');
    badge.className = 'notification-bell-badge hidden';
    state.bellBtn.appendChild(badge);

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'notification-dropdown-overlay';
    document.body.appendChild(overlay);

    // Create dropdown
    state.dropdown = document.createElement('div');
    state.dropdown.className = 'notification-dropdown';
    state.dropdown.innerHTML = `
      <div class="notification-dropdown-header">
        <h3>Notifications</h3>
        <a href="#" data-action="mark-all-read">Mark all read</a>
      </div>
      <div class="notification-dropdown-list"></div>
    `;
    document.body.appendChild(state.dropdown);

    // Event listeners
    state.bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown();
    });

    overlay.addEventListener('click', closeDropdown);

    state.dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.getAttribute('data-action') === 'mark-all-read') {
        e.preventDefault();
        markAllAsRead();
      }
    });

    window.addEventListener('scroll', positionDropdown);
    window.addEventListener('resize', positionDropdown);

    // Prevent dropdown from closing when clicking inside it
    state.dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Insert bell into container
    container.insertBefore(state.bellBtn, container.firstChild);

    // Fetch initial notifications
    if (isLoggedIn()) {
      await refresh();

      // Start polling
      state.pollingInterval = setInterval(() => {
        if (isLoggedIn()) {
          refresh();
        }
      }, 60000); // 60 seconds
    }
  }

  // Get unread count
  function getUnreadCount() {
    return state.unreadCount;
  }

  // Expose public API
  window.NotificationBell = {
    init,
    refresh,
    getUnreadCount
  };
})();
