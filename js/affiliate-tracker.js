/**
 * Affiliate/UTM Tracking System
 * Captures and persists utm parameters and affiliate IDs from URL
 * Provides attribution data for registration and conversion tracking
 */

(function() {
    'use strict';

    const STORAGE_KEY = 'matrixSpins_attribution';

    // Parse URL parameters
    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const attribution = {
            utm_source: params.get('utm_source') || null,
            utm_medium: params.get('utm_medium') || null,
            utm_campaign: params.get('utm_campaign') || null,
            utm_content: params.get('utm_content') || null,
            affiliate_id: params.get('ref') || params.get('aff') || null,
            landing_page: window.location.pathname + window.location.search,
            timestamp: new Date().toISOString()
        };

        return attribution;
    }

    // Store attribution data in localStorage
    function storeAttribution(data) {
        try {
            // Only store if at least one tracking param is present
            if (data.utm_source || data.utm_medium || data.utm_campaign || data.utm_content || data.affiliate_id) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                console.warn('[AffiliateTracker] Attribution data stored:', {
                    utm_source: data.utm_source,
                    utm_medium: data.utm_medium,
                    utm_campaign: data.utm_campaign,
                    utm_content: data.utm_content,
                    affiliate_id: data.affiliate_id
                });
            }
        } catch (err) {
            console.warn('[AffiliateTracker] Failed to store attribution data:', err.message);
        }
    }

    // Retrieve stored attribution data
    function retrieveAttribution() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (err) {
            console.warn('[AffiliateTracker] Failed to retrieve attribution data:', err.message);
        }
        return null;
    }

    // Get current attribution (from storage or URL params on first visit)
    function getAttribution() {
        let attribution = retrieveAttribution();

        if (!attribution) {
            attribution = getUrlParams();
            storeAttribution(attribution);
        }

        return attribution;
    }

    // Clear stored attribution
    function clearAttribution() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            console.warn('[AffiliateTracker] Attribution data cleared');
        } catch (err) {
            console.warn('[AffiliateTracker] Failed to clear attribution data:', err.message);
        }
    }

    // Initialize tracker on page load
    function init() {
        const attribution = getAttribution();

        if (attribution && (attribution.utm_source || attribution.utm_medium || attribution.utm_campaign || attribution.utm_content || attribution.affiliate_id)) {
            console.warn('[AffiliateTracker] Initialized with attribution:', {
                utm_source: attribution.utm_source,
                utm_medium: attribution.utm_medium,
                utm_campaign: attribution.utm_campaign,
                utm_content: attribution.utm_content,
                affiliate_id: attribution.affiliate_id,
                landing_page: attribution.landing_page
            });
        }

        return attribution;
    }

    // Public API
    window.AffiliateTracker = {
        init: init,
        getAttribution: getAttribution,
        clearAttribution: clearAttribution
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
