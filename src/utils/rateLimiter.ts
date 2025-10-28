/**
 * Rate Limiter Utility
 * Prevents abuse by limiting actions per time window
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private limits: Map<string, number[]> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  /**
   * Register a rate limit configuration
   */
  configure(key: string, maxRequests: number, windowMs: number) {
    this.configs.set(key, { maxRequests, windowMs });
  }

  /**
   * Check if an action is allowed
   * @param key - Unique identifier for the action (e.g., 'send_message', 'create_party')
   * @param maxRequests - Max requests allowed (optional, uses configured value)
   * @param windowMs - Time window in milliseconds (optional, uses configured value)
   * @returns true if allowed, false if rate limited
   */
  check(key: string, maxRequests?: number, windowMs?: number): boolean {
    const config = this.configs.get(key);
    const max = maxRequests ?? config?.maxRequests ?? 10;
    const window = windowMs ?? config?.windowMs ?? 10000;

    const now = Date.now();
    const requests = this.limits.get(key) || [];
    
    // Remove old requests outside the time window
    const validRequests = requests.filter(time => now - time < window);
    
    if (validRequests.length >= max) {
      return false; // Rate limited
    }
    
    // Add current request
    validRequests.push(now);
    this.limits.set(key, validRequests);
    return true;
  }

  /**
   * Get remaining requests in current window
   */
  getRemaining(key: string): number {
    const config = this.configs.get(key);
    if (!config) return 0;

    const now = Date.now();
    const requests = this.limits.get(key) || [];
    const validRequests = requests.filter(time => now - time < config.windowMs);
    
    return Math.max(0, config.maxRequests - validRequests.length);
  }

  /**
   * Get time until next available request
   */
  getTimeUntilReset(key: string): number {
    const config = this.configs.get(key);
    if (!config) return 0;

    const requests = this.limits.get(key) || [];
    if (requests.length === 0) return 0;

    const oldestRequest = Math.min(...requests);
    const resetTime = oldestRequest + config.windowMs;
    
    return Math.max(0, resetTime - Date.now());
  }

  /**
   * Clear all rate limits for a key
   */
  reset(key: string) {
    this.limits.delete(key);
  }

  /**
   * Clear all rate limits
   */
  resetAll() {
    this.limits.clear();
  }
}

export const rateLimiter = new RateLimiter();

// Pre-configure common rate limits
rateLimiter.configure('send_message', 10, 10000); // 10 messages per 10 seconds
rateLimiter.configure('create_party', 5, 60000); // 5 parties per minute
rateLimiter.configure('join_party', 10, 30000); // 10 joins per 30 seconds
rateLimiter.configure('add_friend', 20, 60000); // 20 friend requests per minute
rateLimiter.configure('marketplace_search', 30, 10000); // 30 searches per 10 seconds
rateLimiter.configure('update_profile', 5, 60000); // 5 profile updates per minute
rateLimiter.configure('send_voice_message', 5, 60000); // 5 voice messages per minute
rateLimiter.configure('create_listing', 10, 300000); // 10 listings per 5 minutes
rateLimiter.configure('api_call', 100, 60000); // 100 API calls per minute (general)

export default rateLimiter;

