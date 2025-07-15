/**
 * Centralized token validation service to avoid duplicate API calls
 */
class TokenService {
  constructor() {
    this.validationInProgress = false;
    this.lastValidationTime = 0;
    this.validationCacheTime = 30000; // 30 seconds cache
    this.cachedValidationResult = null;
    this.subscribers = new Set();
  }

  /**
   * Subscribe to token validation events
   * @param {function} callback - Callback to execute when token is invalid
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Notify all subscribers about token expiry
   */
  notifySubscribers() {
    this.subscribers.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in token validation subscriber:', error);
      }
    });
  }

  /**
   * Validate token with caching to avoid excessive API calls
   * @param {string} userType - 'user' or 'superadmin'
   * @returns {Promise<boolean>} - True if token is valid
   */
  async validateToken(userType = 'user' ||  'customer') {
    const now = Date.now();
    
    // Return cached result if validation was recent
    if (this.cachedValidationResult !== null && 
        (now - this.lastValidationTime) < this.validationCacheTime) {
      return this.cachedValidationResult;
    }

    // If validation is already in progress, wait for it
    if (this.validationInProgress) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.validationInProgress) {
            clearInterval(checkInterval);
            resolve(this.cachedValidationResult);
          }
        }, 100);
      });
    }

    this.validationInProgress = true;
    
    try {
      let isValid = false;
      
      if (userType === 'superadmin') {
        // SuperAdmin validation logic can be added here if needed
        isValid = true; // Placeholder, assuming superadmin token is valid
      } else {
        // For regular users, directly return cached result as API call is removed
        isValid = this.cachedValidationResult !== null ? this.cachedValidationResult : false;
      }

      this.cachedValidationResult = isValid;
      this.lastValidationTime = now;
      
      if (!isValid) {
        this.notifySubscribers();
      }
      
      return isValid;
    } finally {
      this.validationInProgress = false;
    }
  }

  /**
   * Invalidate cached token validation result
   */
  invalidateCache() {
    this.cachedValidationResult = null;
    this.lastValidationTime = 0;
  }

  /**
   * Clear all subscriptions and intervals
   */
  cleanup() {
    this.subscribers.clear();
    this.invalidateCache();
  }
}

// Export singleton instance
export const tokenService = new TokenService();
