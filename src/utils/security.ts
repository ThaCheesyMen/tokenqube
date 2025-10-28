/**
 * Security Utilities
 * - Rate limiting
 * - Input sanitization
 * - CSRF protection
 * - Session management
 */

import { toast } from '../components/Toast';

// =====================================================
// RATE LIMITING
// =====================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly DEFAULT_WINDOW = 60000; // 1 minute
  private readonly DEFAULT_MAX_REQUESTS = 10;

  check(key: string, maxRequests: number = this.DEFAULT_MAX_REQUESTS, windowMs: number = this.DEFAULT_WINDOW): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (entry.count >= maxRequests) {
      const remainingTime = Math.ceil((entry.resetTime - now) / 1000);
      toast.error(`Rate limit exceeded. Try again in ${remainingTime}s`);
      return false;
    }

    entry.count++;
    return true;
  }

  reset(key: string) {
    this.limits.delete(key);
  }

  cleanup() {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.limits.forEach((entry, key) => {
      if (now > entry.resetTime) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.limits.delete(key));
  }
}

export const rateLimiter = new RateLimiter();

// Auto cleanup every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

// =====================================================
// RATE LIMIT DECORATORS
// =====================================================

export const rateLimitConfig = {
  auth: { max: 5, window: 15 * 60 * 1000 }, // 5 attempts per 15 min
  message: { max: 20, window: 60 * 1000 }, // 20 messages per minute
  api: { max: 100, window: 60 * 1000 }, // 100 requests per minute
  join: { max: 10, window: 60 * 1000 }, // 10 party joins per minute
  transfer: { max: 5, window: 60 * 1000 }, // 5 token transfers per minute
};

// =====================================================
// INPUT SANITIZATION
// =====================================================

/**
 * Sanitize username input
 */
export function sanitizeUsername(username: string): string {
  return username
    .trim()
    .replace(/[<>\"']/g, '') // Remove dangerous characters
    .substring(0, 32); // Max length
}

/**
 * Sanitize message text
 */
export function sanitizeMessage(message: string): string {
  return message
    .trim()
    .substring(0, 2000); // Max message length
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL
 */
export function isValidURL(url: string): boolean {
  try {
    const parsedURL = new URL(url);
    return ['http:', 'https:'].includes(parsedURL.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate strong password
 */
export function isStrongPassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letters');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain numbers');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain special characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =====================================================
// CSRF PROTECTION
// =====================================================

class CSRFProtection {
  private token: string | null = null;

  generateToken(): string {
    this.token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    
    sessionStorage.setItem('csrf_token', this.token);
    return this.token;
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = sessionStorage.getItem('csrf_token');
    }
    return this.token;
  }

  validateToken(token: string): boolean {
    return token === this.getToken();
  }

  clearToken() {
    this.token = null;
    sessionStorage.removeItem('csrf_token');
  }
}

export const csrfProtection = new CSRFProtection();

// =====================================================
// SESSION MANAGEMENT
// =====================================================

interface SessionInfo {
  userId: string;
  deviceId: string;
  lastActivity: number;
  ipAddress?: string;
}

class SessionManager {
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private session: SessionInfo | null = null;
  private activityInterval: NodeJS.Timeout | null = null;

  startSession(userId: string) {
    const deviceId = this.getOrCreateDeviceId();
    
    this.session = {
      userId,
      deviceId,
      lastActivity: Date.now(),
    };

    this.startActivityMonitoring();
    console.log('🔐 Session started');
  }

  endSession() {
    this.session = null;
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
      this.activityInterval = null;
    }
    csrfProtection.clearToken();
    console.log('🔓 Session ended');
  }

  updateActivity() {
    if (this.session) {
      this.session.lastActivity = Date.now();
    }
  }

  isSessionValid(): boolean {
    if (!this.session) return false;
    
    const now = Date.now();
    const timeSinceActivity = now - this.session.lastActivity;
    
    if (timeSinceActivity > this.SESSION_TIMEOUT) {
      this.endSession();
      return false;
    }

    return true;
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  private startActivityMonitoring() {
    // Update activity on user interactions
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, () => this.updateActivity(), { passive: true });
    });

    // Check session validity every minute
    this.activityInterval = setInterval(() => {
      if (!this.isSessionValid()) {
        toast.warning('Session expired. Please log in again.');
        window.location.href = '/login';
      }
    }, 60 * 1000);
  }

  getDeviceId(): string | null {
    return this.session?.deviceId || null;
  }
}

export const sessionManager = new SessionManager();

// =====================================================
// CONTENT SECURITY POLICY
// =====================================================

export function getSecurityHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // React needs unsafe-eval in dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "media-src 'self' blob:",
      "frame-src 'none'",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
  };
}

// =====================================================
// SUSPICIOUS ACTIVITY DETECTION
// =====================================================

interface ActivityLog {
  action: string;
  timestamp: number;
  metadata?: any;
}

class SecurityMonitor {
  private activityLog: ActivityLog[] = [];
  private readonly MAX_LOG_SIZE = 100;

  logActivity(action: string, metadata?: any) {
    this.activityLog.push({
      action,
      timestamp: Date.now(),
      metadata,
    });

    // Keep only recent logs
    if (this.activityLog.length > this.MAX_LOG_SIZE) {
      this.activityLog = this.activityLog.slice(-this.MAX_LOG_SIZE);
    }

    this.detectSuspiciousActivity();
  }

  private detectSuspiciousActivity() {
    const now = Date.now();
    const recentWindow = 60 * 1000; // Last 1 minute
    const recentActions = this.activityLog.filter(
      (log) => now - log.timestamp < recentWindow
    );

    // Detect rapid repeated actions
    const actionCounts = recentActions.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(actionCounts).forEach(([action, count]) => {
      if (count > 50) {
        console.warn(`⚠️ Suspicious activity detected: ${action} repeated ${count} times`);
        toast.warning('Unusual activity detected. Please slow down.');
      }
    });
  }

  getRecentActivity(): ActivityLog[] {
    return [...this.activityLog];
  }
}

export const securityMonitor = new SecurityMonitor();

// =====================================================
// API KEY MANAGEMENT (for environment variables)
// =====================================================

export const getEnvVariable = (key: string, required: boolean = false): string | undefined => {
  // Check Vite environment variables
  const value = import.meta.env[key];
  
  if (required && !value) {
    console.error(`❌ Required environment variable ${key} is not set`);
    throw new Error(`Missing required environment variable: ${key}`);
  }
  
  return value;
};

// Safely get API keys from environment
export const apiKeys = {
  supabaseUrl: getEnvVariable('VITE_SUPABASE_URL', true)!,
  supabaseAnonKey: getEnvVariable('VITE_SUPABASE_ANON_KEY', true)!,
  turnUsername: getEnvVariable('VITE_TURN_USERNAME'),
  turnCredential: getEnvVariable('VITE_TURN_CREDENTIAL'),
  sentryDsn: getEnvVariable('VITE_SENTRY_DSN'),
  stripePublishableKey: getEnvVariable('VITE_STRIPE_PUBLISHABLE_KEY'),
};

// Validate that sensitive keys are not hardcoded
export function validateNoHardcodedSecrets(code: string): boolean {
  const suspiciousPatterns = [
    /steam_api_key\s*=\s*["'][A-F0-9]{32}["']/i,
    /password\s*=\s*["'][^"']{8,}["']/i,
    /api_key\s*=\s*["'][^"']{20,}["']/i,
    /secret\s*=\s*["'][^"']{20,}["']/i,
  ];

  return !suspiciousPatterns.some((pattern) => pattern.test(code));
}

