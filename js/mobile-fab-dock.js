(function() {
  'use strict';

  var MobileFabDock = {
    isEnabled: false,
    isExpanded: false,
    collectedFabs: [],
    dockButton: null,
    dockContainer: null,
    expandedContainer: null,
    mediaQuery: null,
    originalFabs: [],

    // Configuration
    config: {
      breakpoint: 640,
      dockButtonSize: 52,
      subFabSize: 44,
      dockBottom: 70,
      dockRight: 20,
      zIndex: 9995,
      animationDuration: 200,
      backgroundColor: '#1a1a2e',
      borderColor: '#d4af37',
      textColor: '#ffffff'
    },

    // Selector patterns for known FABs
    knownSelectors: [
      '#referralFab',
      '#tournamentFab',
      '#premiumTournamentBtn',
      '#supportChatBtn'
    ],

    /**
     * Initialize the mobile FAB dock
     */
    init: function() {
      var self = this;

      // Check QA mode and URL params
      if (window._qaMode || this.hasNoBonus()) {
        return;
      }

      // Setup media query listener
      this.mediaQuery = window.matchMedia('(max-width: ' + this.config.breakpoint + 'px)');
      this.mediaQuery.addListener(function(mq) {
        if (mq.matches) {
          self.enable();
        } else {
          self.disable();
        }
      });

      // Initial check
      if (this.mediaQuery.matches) {
        this.enable();
      }
    },

    /**
     * Check for noBonus URL parameter
     */
    hasNoBonus: function() {
      var urlParams = new URLSearchParams(window.location.search);
      return urlParams.has('noBonus');
    },

    /**
     * Enable the dock on mobile screens
     */
    enable: function() {
      if (this.isEnabled) return;

      this.isEnabled = true;
      this.originalFabs = [];
      this.collectedFabs = [];

      // Collect all FABs
      this.collectFabs();

      // Only proceed if we found FABs
      if (this.collectedFabs.length === 0) {
        this.isEnabled = false;
        return;
      }

      // Hide collected FABs
      this.hideCollectedFabs();

      // Create dock UI
      this.createDock();

      // Setup event listeners
      this.setupEventListeners();
    },

    /**
     * Disable the dock on larger screens
     */
    disable: function() {
      if (!this.isEnabled) return;

      this.isEnabled = false;
      this.collapse();

      // Show original FABs
      this.showCollectedFabs();

      // Remove dock UI
      if (this.dockContainer && this.dockContainer.parentNode) {
        this.dockContainer.parentNode.removeChild(this.dockContainer);
      }

      this.dockButton = null;
      this.dockContainer = null;
      this.expandedContainer = null;
      this.collectedFabs = [];
      this.originalFabs = [];
    },

    /**
     * Collect all FABs from the page
     */
    collectFabs: function() {
      var self = this;
      var collected = [];
      var seen = {};

      // Collect known FABs
      this.knownSelectors.forEach(function(selector) {
        var element = document.querySelector(selector);
        if (element && !seen[element.id] && element.offsetParent !== null) {
          collected.push({
            element: element,
            selector: selector,
            label: self.getLabelForFab(element),
            originalDisplay: element.style.display,
            originalVisibility: element.style.visibility,
            originalPosition: element.style.position
          });
          seen[element.id] = true;
        }
      });

      // Collect dynamic FABs by CSS properties
      var allElements = document.querySelectorAll('[style*="position"][style*="fixed"], [style*="border-radius"]');
      allElements.forEach(function(element) {
        if (seen[element.id]) return;
        if (!element.id && !element.classList.length) return;

        var style = window.getComputedStyle(element);
        var position = style.position;
        var borderRadius = parseFloat(style.borderRadius);
        var width = parseFloat(style.width);
        var height = parseFloat(style.height);
        var bottom = style.bottom;

        // Check if matches FAB criteria
        if (position === 'fixed' &&
            borderRadius >= 20 &&
            width >= 40 && width <= 80 &&
            height >= 40 && height <= 80 &&
            bottom !== 'auto' &&
            element.offsetParent !== null) {

          collected.push({
            element: element,
            selector: '#' + element.id,
            label: self.getLabelForFab(element),
            originalDisplay: element.style.display,
            originalVisibility: element.style.visibility,
            originalPosition: element.style.position
          });
          seen[element.id] = true;
        }
      });

      this.collectedFabs = collected;
      this.originalFabs = collected.slice(); // Keep reference copy
    },

    /**
     * Get label for a FAB based on its content or data attributes
     */
    getLabelForFab: function(element) {
      var label = '';

      // Check data-label attribute
      if (element.getAttribute('data-label')) {
        label = element.getAttribute('data-label');
      }
      // Check aria-label
      else if (element.getAttribute('aria-label')) {
        label = element.getAttribute('aria-label');
      }
      // Check title
      else if (element.title) {
        label = element.title;
      }
      // Try to extract from text content
      else if (element.textContent) {
        label = element.textContent.trim().substring(0, 20);
      }
      // Map by ID
      else {
        var idMap = {
          'referralFab': '🎁 Referral',
          'tournamentFab': '🏆 Tournament',
          'premiumTournamentBtn': '⭐ Premium',
          'supportChatBtn': '💬 Support'
        };
        label = idMap[element.id] || 'Option';
      }

      return label;
    },

    /**
     * Hide collected FABs
     */
    hideCollectedFabs: function() {
      this.collectedFabs.forEach(function(fab) {
        fab.element.style.display = 'none';
      });
    },

    /**
     * Show collected FABs
     */
    showCollectedFabs: function() {
      this.originalFabs.forEach(function(fab) {
        fab.element.style.display = fab.originalDisplay;
        fab.element.style.visibility = fab.originalVisibility;
      });
    },

    /**
     * Create the dock UI
     */
    createDock: function() {
      // Create main dock container
      this.dockContainer = document.createElement('div');
      this.dockContainer.id = 'mobileFabDock';
      this.dockContainer.style.cssText = [
        'position: fixed',
        'bottom: ' + this.config.dockBottom + 'px',
        'right: ' + this.config.dockRight + 'px',
        'z-index: ' + this.config.zIndex,
        'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      ].join('; ');

      // Create dock button
      this.dockButton = document.createElement('button');
      this.dockButton.id = 'mobileFabDockButton';
      this.dockButton.style.cssText = [
        'width: ' + this.config.dockButtonSize + 'px',
        'height: ' + this.config.dockButtonSize + 'px',
        'border-radius: 50%',
        'background-color: ' + this.config.backgroundColor,
        'border: 2px solid ' + this.config.borderColor,
        'color: ' + this.config.textColor,
        'font-size: 24px',
        'cursor: pointer',
        'padding: 0',
        'display: flex',
        'align-items: center',
        'justify-content: center',
        'position: relative',
        'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3)',
        'transition: all ' + this.config.animationDuration + 'ms ease',
        'font-weight: bold'
      ].join('; ');
      this.dockButton.innerHTML = '⋮';

      // Add count badge
      if (this.collectedFabs.length > 0) {
        var badge = document.createElement('span');
        badge.id = 'mobileFabDockBadge';
        badge.style.cssText = [
          'position: absolute',
          'top: -8px',
          'right: -8px',
          'background-color: ' + this.config.borderColor,
          'color: ' + this.config.backgroundColor,
          'width: 24px',
          'height: 24px',
          'border-radius: 50%',
          'display: flex',
          'align-items: center',
          'justify-content: center',
          'font-size: 12px',
          'font-weight: bold'
        ].join('; ');
        badge.textContent = this.collectedFabs.length;
        this.dockButton.appendChild(badge);
      }

      // Create expanded container (hidden by default)
      this.expandedContainer = document.createElement('div');
      this.expandedContainer.id = 'mobileFabDockExpanded';
      this.expandedContainer.style.cssText = [
        'position: absolute',
        'bottom: ' + (this.config.dockButtonSize + 10) + 'px',
        'right: 0',
        'display: none',
        'flex-direction: column-reverse',
        'gap: 12px',
        'align-items: flex-end'
      ].join('; ');

      // Add FABs to expanded container
      this.addFabsToExpanded();

      // Assemble
      this.dockContainer.appendChild(this.dockButton);
      this.dockContainer.appendChild(this.expandedContainer);
      document.body.appendChild(this.dockContainer);
    },

    /**
     * Add collected FABs to expanded container
     */
    addFabsToExpanded: function() {
      var self = this;

      this.collectedFabs.forEach(function(fab) {
        var fabWrapper = document.createElement('div');
        fabWrapper.style.cssText = [
          'display: flex',
          'align-items: center',
          'gap: 8px',
          'animation: slideIn ' + self.config.animationDuration + 'ms ease forwards',
          'opacity: 0'
        ].join('; ');

        // Label
        var label = document.createElement('span');
        label.style.cssText = [
          'background-color: ' + self.config.backgroundColor,
          'border: 1px solid ' + self.config.borderColor,
          'color: ' + self.config.textColor,
          'padding: 6px 12px',
          'border-radius: 16px',
          'font-size: 12px',
          'white-space: nowrap',
          'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2)'
        ].join('; ');
        label.textContent = fab.label;

        // Mini FAB button
        var miniFab = document.createElement('button');
        miniFab.style.cssText = [
          'width: ' + self.config.subFabSize + 'px',
          'height: ' + self.config.subFabSize + 'px',
          'border-radius: 50%',
          'background-color: ' + self.config.backgroundColor,
          'border: 2px solid ' + self.config.borderColor,
          'color: ' + self.config.textColor,
          'cursor: pointer',
          'padding: 0',
          'display: flex',
          'align-items: center',
          'justify-content: center',
          'font-size: 18px',
          'transition: all 100ms ease',
          'box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2)'
        ].join('; ');

        // Copy icon/content from original FAB
        miniFab.innerHTML = fab.element.innerHTML;

        // Add hover effect
        miniFab.addEventListener('mouseenter', function() {
          this.style.transform = 'scale(1.1)';
          this.style.boxShadow = '0 4px 12px rgba(212, 175, 55, 0.4)';
        });
        miniFab.addEventListener('mouseleave', function() {
          this.style.transform = 'scale(1)';
          this.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';
        });

        // Click handler for mini FAB
        miniFab.addEventListener('click', function(e) {
          e.stopPropagation();
          self.collapse();
          // Trigger original FAB click
          fab.element.click();
        });

        fabWrapper.appendChild(label);
        fabWrapper.appendChild(miniFab);
        self.expandedContainer.appendChild(fabWrapper);
      });

      // Add animation styles if not already present
      if (!document.getElementById('mobileFabDockStyles')) {
        var style = document.createElement('style');
        style.id = 'mobileFabDockStyles';
        style.textContent = '@keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }';
        document.head.appendChild(style);
      }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners: function() {
      var self = this;

      // Dock button click
      this.dockButton.addEventListener('click', function(e) {
        e.stopPropagation();
        if (self.isExpanded) {
          self.collapse();
        } else {
          self.expand();
        }
      });

      // Click outside to collapse
      document.addEventListener('click', function(e) {
        if (self.isExpanded &&
            !self.dockContainer.contains(e.target)) {
          self.collapse();
        }
      });

      // Handle window resize
      window.addEventListener('resize', function() {
        if (self.isExpanded) {
          self.collapse();
        }
      });
    },

    /**
     * Expand the dock
     */
    expand: function() {
      if (this.isExpanded || !this.expandedContainer) return;

      this.isExpanded = true;
      this.expandedContainer.style.display = 'flex';
      this.dockButton.style.transform = 'rotate(90deg)';

      // Trigger animations on sub-FABs
      var wrappers = this.expandedContainer.querySelectorAll('div');
      wrappers.forEach(function(wrapper, index) {
        setTimeout(function() {
          wrapper.style.opacity = '1';
          wrapper.style.transform = 'translateY(0)';
        }, index * 40);
      });
    },

    /**
     * Collapse the dock
     */
    collapse: function() {
      if (!this.isExpanded || !this.expandedContainer) return;

      this.isExpanded = false;
      this.expandedContainer.style.display = 'none';
      this.dockButton.style.transform = 'rotate(0deg)';
    },

    /**
     * Clean up and destroy
     */
    destroy: function() {
      this.disable();
      if (this.mediaQuery) {
        this.mediaQuery.removeListener(this.init);
      }
    }
  };

  // Expose to window
  window.MobileFabDock = MobileFabDock;

  // Auto-initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      MobileFabDock.init();
    });
  } else {
    // DOM already loaded
    MobileFabDock.init();
  }
})();
