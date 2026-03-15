/**
 * Matrix Spins Casino - Funnel Tracker Module
 * Tracks complete player conversion funnel and reports metrics
 * Dark theme: gold #ffd700, green #00ff41
 */

(function() {
  'use strict';

  // Check QA mode - suppress tracking if enabled
  var qaMode = window._qaMode || (window.location.search || '').indexOf('noBonus') !== -1;

  // Funnel stages in order
  var FUNNEL_STAGES = [
    'VISIT',
    'ENGAGE',
    'PLAY_GUEST',
    'REGISTER',
    'FIRST_DEPOSIT',
    'ACTIVE_PLAYER',
    'RETURNING',
    'DEPOSITOR',
    'VIP'
  ];

  var TRACKED_EVENTS = [
    'page_view', 'game_open', 'spin', 'win', 'loss',
    'deposit_click', 'deposit_complete', 'bonus_claim',
    'referral_share', 'feature_click', 'session_start',
    'session_end', 'modal_open', 'modal_close', 'button_click'
  ];

  // Color palette (dark theme)
  var COLORS = {
    gold: '#ffd700',
    green: '#00ff41',
    gray: '#555555',
    darkBg: '#1a1a1a',
    darkBorder: '#333333'
  };

  // Storage keys
  var STORAGE_PREFIX = 'casino_funnel_';
  var EVENTS_BUFFER_KEY = STORAGE_PREFIX + 'events';
  var FUNNEL_STATE_KEY = STORAGE_PREFIX + 'state';
  var SESSION_KEY = STORAGE_PREFIX + 'session';

  // Event batching
  var eventBatch = [];
  var batchTimer = null;
  var BATCH_INTERVAL = 30000; // 30 seconds
  var MAX_BUFFER_SIZE = 100;

  /**
   * Initialize the funnel tracker
   */
  function init() {
    if (qaMode) return;

    // Track page visit
    trackPageVisit();

    // Bind interaction listeners
    bindInteractionListeners();

    // Setup batch sending
    setupBatchSending();

    // Track session start
    trackEvent('session_start', {
      url: window.location.href,
      timestamp: Date.now()
    });
  }

  /**
   * Track page visit (VISIT stage)
   */
  function trackPageVisit() {
    var state = getOrCreateFunnelState();

    if (!state.VISIT) {
      state.VISIT = {
        timestamp: Date.now(),
        url: window.location.href
      };
      saveFunnelState(state);

      recordEvent('page_view', {
        url: window.location.href
      });
    }
  }

  /**
   * Bind interaction listeners for ENGAGE stage
   */
  function bindInteractionListeners() {
    var engaged = false;

    var engageHandler = function() {
      if (!engaged) {
        trackEngagement();
        engaged = true;
        document.removeEventListener('click', engageHandler);
        document.removeEventListener('scroll', engageHandler);
      }
    };

    document.addEventListener('click', engageHandler, { once: true });
    document.addEventListener('scroll', engageHandler, { once: true });
  }

  /**
   * Track engagement (first interaction)
   */
  function trackEngagement() {
    var state = getOrCreateFunnelState();

    if (!state.ENGAGE) {
      state.ENGAGE = {
        timestamp: Date.now(),
        timeSinceVisit: Date.now() - state.VISIT.timestamp
      };
      saveFunnelState(state);

      recordEvent('engage', {
        timeToEngage: state.ENGAGE.timeSinceVisit
      });
    }
  }

  /**
   * Track a specific funnel stage
   */
  function advanceFunnelStage(stageName, metadata) {
    if (qaMode || FUNNEL_STAGES.indexOf(stageName) === -1) return;

    var state = getOrCreateFunnelState();
    var prevState = Object.keys(state).length > 0;

    if (!state[stageName]) {
      state[stageName] = {
        timestamp: Date.now(),
        metadata: metadata || {}
      };

      // Calculate time from previous stage
      if (prevState) {
        var lastTimestamp = getLastStageTimestamp(state, stageName);
        if (lastTimestamp) {
          state[stageName].timeSincePrevious = Date.now() - lastTimestamp;
        }
      }

      saveFunnelState(state);

      recordEvent('funnel_advance', {
        stage: stageName,
        metadata: metadata
      });
    }
  }

  /**
   * Get timestamp of last completed stage
   */
  function getLastStageTimestamp(state, currentStage) {
    var currentIdx = FUNNEL_STAGES.indexOf(currentStage);
    for (var i = currentIdx - 1; i >= 0; i--) {
      var stage = FUNNEL_STAGES[i];
      if (state[stage]) {
        return state[stage].timestamp;
      }
    }
    return null;
  }

  /**
   * Track arbitrary event with validation
   */
  function trackEvent(eventName, data) {
    if (qaMode || TRACKED_EVENTS.indexOf(eventName) === -1) return;

    recordEvent(eventName, data);

    // Auto-advance funnel based on event type
    if (eventName === 'spin' && !getOrCreateFunnelState().PLAY_GUEST) {
      advanceFunnelStage('PLAY_GUEST', { firstSpin: true });
    } else if (eventName === 'deposit_complete') {
      var state = getOrCreateFunnelState();
      var depositCount = (state.depositCount || 0) + 1;
      state.depositCount = depositCount;
      saveFunnelState(state);

      if (depositCount === 1) {
        advanceFunnelStage('FIRST_DEPOSIT', { amount: data.amount });
      } else if (depositCount >= 2) {
        advanceFunnelStage('DEPOSITOR', { totalDeposits: depositCount });
      }
    }
  }

  /**
   * Record event to buffer
   */
  function recordEvent(eventName, data) {
    var event = {
      name: eventName,
      timestamp: Date.now(),
      data: data || {},
      sessionId: getSessionId()
    };

    eventBatch.push(event);
    addToEventBuffer(event);
  }

  /**
   * Add event to localStorage ring buffer
   */
  function addToEventBuffer(event) {
    var events = [];

    try {
      var existing = localStorage.getItem(EVENTS_BUFFER_KEY);
      if (existing) {
        events = JSON.parse(existing);
      }
    } catch (e) {
      console.warn('Failed to read event buffer:', e);
    }

    events.push(event);

    // Keep only last 100 events
    if (events.length > MAX_BUFFER_SIZE) {
      events = events.slice(-MAX_BUFFER_SIZE);
    }

    try {
      localStorage.setItem(EVENTS_BUFFER_KEY, JSON.stringify(events));
    } catch (e) {
      console.warn('Failed to save event buffer:', e);
    }
  }

  /**
   * Setup automatic batch sending
   */
  function setupBatchSending() {
    batchTimer = setInterval(function() {
      flushEventBatch();
    }, BATCH_INTERVAL);
  }

  /**
   * Send batched events to server
   */
  function flushEventBatch() {
    if (eventBatch.length === 0) return;

    var eventsToSend = eventBatch.slice();
    eventBatch = [];

    var payload = {
      events: eventsToSend,
      funnelState: getOrCreateFunnelState(),
      metrics: calculateMetrics(),
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };

    // Use fetch or XMLHttpRequest based on availability
    if (window.fetch) {
      fetch('/api/session-analytics/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function(err) {
        console.warn('Failed to send analytics:', err);
        // Re-queue events on failure
        eventBatch = eventsToSend.concat(eventBatch);
      });
    } else {
      // Fallback for older browsers
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/session-analytics/event', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = function() {
        if (xhr.status >= 400) {
          eventBatch = eventsToSend.concat(eventBatch);
        }
      };
      xhr.onerror = function() {
        eventBatch = eventsToSend.concat(eventBatch);
      };
      xhr.send(JSON.stringify(payload));
    }
  }

  /**
   * Get or create funnel state
   */
  function getOrCreateFunnelState() {
    var state = {};

    try {
      var existing = localStorage.getItem(FUNNEL_STATE_KEY);
      if (existing) {
        state = JSON.parse(existing);
      }
    } catch (e) {
      console.warn('Failed to read funnel state:', e);
    }

    return state;
  }

  /**
   * Save funnel state to localStorage
   */
  function saveFunnelState(state) {
    try {
      localStorage.setItem(FUNNEL_STATE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save funnel state:', e);
    }
  }

  /**
   * Get or create session ID
   */
  function getSessionId() {
    var sessionId = null;

    try {
      sessionId = sessionStorage.getItem(SESSION_KEY);
      if (!sessionId) {
        sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem(SESSION_KEY, sessionId);
      }
    } catch (e) {
      console.warn('Failed to manage session ID:', e);
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    return sessionId;
  }

  /**
   * Calculate aggregated metrics
   */
  function calculateMetrics() {
    var state = getOrCreateFunnelState();
    var metrics = {
      funnelProgression: {},
      conversionRates: {},
      timings: {},
      eventCounts: {}
    };

    // Count reached stages
    var reachedStages = [];
    for (var i = 0; i < FUNNEL_STAGES.length; i++) {
      var stage = FUNNEL_STAGES[i];
      if (state[stage]) {
        reachedStages.push(stage);
        metrics.funnelProgression[stage] = state[stage].timestamp;
      }
    }

    // Calculate conversion rates
    for (var j = 1; j < reachedStages.length; j++) {
      var fromStage = reachedStages[j - 1];
      var toStage = reachedStages[j];
      var timeGap = state[toStage].timestamp - state[fromStage].timestamp;
      metrics.conversionRates[fromStage + '_to_' + toStage] = timeGap;
    }

    // Calculate key timings
    if (state.VISIT && state.PLAY_GUEST) {
      metrics.timings.visitToFirstSpin = state.PLAY_GUEST.timestamp - state.VISIT.timestamp;
    }
    if (state.PLAY_GUEST && state.FIRST_DEPOSIT) {
      metrics.timings.firstSpinToFirstDeposit = state.FIRST_DEPOSIT.timestamp - state.PLAY_GUEST.timestamp;
    }

    // Count events by type
    try {
      var events = JSON.parse(localStorage.getItem(EVENTS_BUFFER_KEY) || '[]');
      for (var k = 0; k < events.length; k++) {
        var event = events[k];
        metrics.eventCounts[event.name] = (metrics.eventCounts[event.name] || 0) + 1;
      }
    } catch (e) {
      console.warn('Failed to count events:', e);
    }

    metrics.depositCount = state.depositCount || 0;

    return metrics;
  }

  /**
   * Get current metrics
   */
  function getMetrics() {
    return calculateMetrics();
  }

  /**
   * Create admin dashboard widget
   */
  function createAdminWidget() {
    if (!window.currentUser || !window.currentUser.is_admin) {
      return;
    }

    var widgetBtn = document.createElement('button');
    widgetBtn.innerHTML = '📊 Funnel';
    widgetBtn.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:10px 15px;' +
      'background:' + COLORS.gold + ';color:#000;border:none;border-radius:4px;' +
      'cursor:pointer;font-weight:bold;z-index:10000;';

    widgetBtn.addEventListener('click', function() {
      showFunnelDashboard();
    });

    document.body.appendChild(widgetBtn);
  }

  /**
   * Show funnel dashboard modal
   */
  function showFunnelDashboard() {
    var existingModal = document.getElementById('casino_funnel_modal');
    if (existingModal) {
      existingModal.remove();
    }

    var modal = document.createElement('div');
    modal.id = 'casino_funnel_modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;' +
      'z-index:10001;';

    var content = document.createElement('div');
    content.style.cssText = 'background:' + COLORS.darkBg + ';border:2px solid ' + COLORS.gold + ';' +
      'color:' + COLORS.gold + ';padding:30px;border-radius:8px;max-width:600px;' +
      'max-height:80vh;overflow-y:auto;font-family:monospace;';

    var title = document.createElement('h2');
    title.textContent = 'Funnel Metrics Dashboard';
    title.style.color = COLORS.gold;
    content.appendChild(title);

    // Build funnel conversion chart
    var metrics = calculateMetrics();
    var state = getOrCreateFunnelState();

    var chartHtml = '<div style="margin:20px 0;">';
    chartHtml += '<h3 style="color:' + COLORS.green + ';">Funnel Progression</h3>';

    var totalStages = FUNNEL_STAGES.length;
    for (var i = 0; i < FUNNEL_STAGES.length; i++) {
      var stage = FUNNEL_STAGES[i];
      var completed = state[stage] ? 1 : 0;
      var percentage = Math.round((i + 1) / totalStages * 100);
      var barColor = completed ? COLORS.green : COLORS.gray;

      chartHtml += '<div style="margin:10px 0;">';
      chartHtml += '<div style="color:' + COLORS.gold + ';font-size:12px;margin-bottom:3px;">' +
        stage + ' (' + percentage + '%)</div>';
      chartHtml += '<div style="background:' + COLORS.darkBorder + ';height:20px;border-radius:3px;' +
        'overflow:hidden;"><div style="background:' + barColor + ';width:' + percentage + '%;' +
        'height:100%;transition:width 0.3s;"></div></div>';
      chartHtml += '</div>';
    }
    chartHtml += '</div>';

    content.innerHTML += chartHtml;

    // Key KPIs
    var kpiHtml = '<div style="margin:20px 0;border-top:1px solid ' + COLORS.gold + ';padding-top:15px;">';
    kpiHtml += '<h3 style="color:' + COLORS.green + ';">Key KPIs</h3>';

    var stagesReached = Object.keys(state).length;
    var progression = Math.round(stagesReached / FUNNEL_STAGES.length * 100);

    kpiHtml += '<div style="margin:8px 0;">Stages Completed: ' + stagesReached + '/' + FUNNEL_STAGES.length + '</div>';
    kpiHtml += '<div style="margin:8px 0;">Progression: <span style="color:' + COLORS.green + ';">' + progression + '%</span></div>';
    kpiHtml += '<div style="margin:8px 0;">Deposits: ' + (metrics.depositCount || 0) + '</div>';

    if (metrics.timings.visitToFirstSpin) {
      var mins = Math.round(metrics.timings.visitToFirstSpin / 60000);
      kpiHtml += '<div style="margin:8px 0;">Visit → First Spin: ' + mins + ' min</div>';
    }

    kpiHtml += '</div>';
    content.innerHTML += kpiHtml;

    // Recent events feed
    var eventsHtml = '<div style="margin:20px 0;border-top:1px solid ' + COLORS.gold + ';padding-top:15px;">';
    eventsHtml += '<h3 style="color:' + COLORS.green + ';">Recent Events (Last 10)</h3>';

    var allEvents = [];
    try {
      allEvents = JSON.parse(localStorage.getItem(EVENTS_BUFFER_KEY) || '[]');
    } catch (e) {
      console.warn('Failed to read recent events:', e);
    }

    var recentEvents = allEvents.slice(-10).reverse();
    if (recentEvents.length === 0) {
      eventsHtml += '<div style="color:' + COLORS.gray + ';">No events recorded</div>';
    } else {
      eventsHtml += '<div style="font-size:11px;max-height:200px;overflow-y:auto;">';
      for (var j = 0; j < recentEvents.length; j++) {
        var evt = recentEvents[j];
        var time = new Date(evt.timestamp).toLocaleTimeString();
        eventsHtml += '<div style="margin:5px 0;padding:5px;background:' + COLORS.darkBorder + ';' +
          'border-left:3px solid ' + COLORS.green + ';">' +
          '<span style="color:' + COLORS.green + ';">' + evt.name + '</span> @ ' + time + '</div>';
      }
      eventsHtml += '</div>';
    }

    eventsHtml += '</div>';
    content.innerHTML += eventsHtml;

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'margin-top:20px;padding:10px 20px;background:' + COLORS.gold + ';' +
      'color:#000;border:none;border-radius:4px;cursor:pointer;font-weight:bold;';
    closeBtn.addEventListener('click', function() {
      modal.remove();
    });
    content.appendChild(closeBtn);

    modal.appendChild(content);
    document.body.appendChild(modal);
  }

  /**
   * Cleanup and flush on page unload
   */
  function setupUnloadHandler() {
    window.addEventListener('beforeunload', function() {
      recordEvent('session_end', {
        duration: Date.now() - (getOrCreateFunnelState().VISIT.timestamp || Date.now())
      });
      flushEventBatch();
    });
  }

  // Public API
  window.FunnelTracker = {
    init: init,
    trackEvent: trackEvent,
    getMetrics: getMetrics,
    advanceFunnelStage: advanceFunnelStage,
    _createAdminWidget: createAdminWidget
  };

  // Auto-initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      init();
      createAdminWidget();
      setupUnloadHandler();
    });
  } else {
    init();
    createAdminWidget();
    setupUnloadHandler();
  }

})();
