/**
 * Push Notifications Module — Matrix Spins Casino
 *
 * Handles:
 * 1. Checking if push notifications are supported
 * 2. Requesting user permission
 * 3. Subscribing to push notifications via service worker
 * 4. Sending subscriptions to the backend
 * 5. Checking subscription status
 */

window.PushNotifications = (function() {
  'use strict';

  const VAPID_PUBLIC_KEY = null; // Set via environment or config if available

  /**
   * Check if push notifications are supported
   */
  function isSupported() {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Check if the browser has permission to show notifications
   */
  function hasPermission() {
    if (!isSupported()) {
      return false;
    }
    return Notification.permission === 'granted';
  }

  /**
   * Request permission from the user
   */
  async function requestPermission() {
    if (!isSupported()) {
      console.warn('Push notifications not supported in this browser');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('Push notification permission denied by user');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.warn('Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async function subscribe() {
    if (!isSupported()) {
      console.warn('Push notifications not supported in this browser');
      return null;
    }

    if (!hasPermission()) {
      console.warn('No permission to show notifications');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      const subscriptionOptions = {
        userVisibleOnly: true
      };

      // Add VAPID public key if available
      if (VAPID_PUBLIC_KEY) {
        subscriptionOptions.applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      }

      const subscription = await registration.pushManager.subscribe(subscriptionOptions);

      // Send subscription to backend
      await sendSubscriptionToBackend(subscription);

      return subscription;
    } catch (error) {
      console.warn('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Check if user is currently subscribed to push notifications
   */
  async function isSubscribed() {
    if (!isSupported()) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return subscription !== null;
    } catch (error) {
      console.warn('Failed to check push subscription status:', error);
      return false;
    }
  }

  /**
   * Send subscription to backend endpoint
   */
  async function sendSubscriptionToBackend(subscription) {
    try {
      const response = await fetch('/api/notifications/push-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        console.warn(
          `Failed to send subscription to backend: ${response.status} ${response.statusText}`
        );
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Failed to send subscription to backend:', error);
      return false;
    }
  }

  /**
   * Convert VAPID public key from base64 to Uint8Array
   * (Helper for VAPID key conversion if needed)
   */
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Initialize push notifications: register service worker and request permission
   */
  async function init() {
    if (!isSupported()) {
      console.warn('Push notifications not supported in this browser');
      return false;
    }

    try {
      // Register service worker
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      // Request permission
      const hasPermissionGranted = await requestPermission();

      if (hasPermissionGranted) {
        // Subscribe to push
        await subscribe();
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Failed to initialize push notifications:', error);
      return false;
    }
  }

  // Public API
  return {
    init,
    requestPermission,
    isSupported,
    hasPermission,
    isSubscribed,
    subscribe
  };
})();
