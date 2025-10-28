/**
 * Monitoring & Analytics
 * - Error tracking
 * - Performance monitoring
 * - User analytics
 * - Health checks
 */

// =====================================================
// ERROR TRACKING (Sentry Integration)
// =====================================================

interface ErrorContext {
  userId?: string;
  page?: string;
  action?: string;
  metadata?: Record<string, any>;
}

class ErrorTracker {
  private isInitialized = false;

  async initialize() {
    const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
    
    if (!sentryDsn) {
      console.warn('⚠️ Sentry DSN not configured');
      return;
    }

    try {
      // Dynamically import Sentry to reduce bundle size
      const Sentry = await import('@sentry/react');
      
      Sentry.init({
        dsn: sentryDsn,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.1, // 10% of transactions
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        integrations: [
          new Sentry.BrowserTracing(),
          new Sentry.Replay(),
        ],
        beforeSend(event, hint) {
          // Filter out non-critical errors
          if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
            return null; // Ignore ResizeObserver errors
          }
          return event;
        },
      });

      this.isInitialized = true;
      console.log('✅ Error tracking initialized');
    } catch (error) {
      console.error('Failed to initialize error tracking:', error);
    }
  }

  captureError(error: Error, context?: ErrorContext) {
    if (!this.isInitialized) {
      console.error('Error:', error, context);
      return;
    }

    import('@sentry/react').then((Sentry) => {
      Sentry.captureException(error, {
        contexts: {
          custom: context,
        },
      });
    });
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext) {
    if (!this.isInitialized) {
      console.log(message, context);
      return;
    }

    import('@sentry/react').then((Sentry) => {
      Sentry.captureMessage(message, {
        level,
        contexts: {
          custom: context,
        },
      });
    });
  }

  setUser(userId: string, email?: string, username?: string) {
    if (!this.isInitialized) return;

    import('@sentry/react').then((Sentry) => {
      Sentry.setUser({
        id: userId,
        email,
        username,
      });
    });
  }

  clearUser() {
    if (!this.isInitialized) return;

    import('@sentry/react').then((Sentry) => {
      Sentry.setUser(null);
    });
  }
}

export const errorTracker = new ErrorTracker();

// =====================================================
// PERFORMANCE MONITORING
// =====================================================

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observer: PerformanceObserver | null = null;

  initialize() {
    // Monitor Core Web Vitals
    this.monitorCoreWebVitals();
    
    // Monitor custom metrics
    this.monitorCustomMetrics();
    
    console.log('✅ Performance monitoring initialized');
  }

  private monitorCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    this.observeMetric('largest-contentful-paint', (entry) => {
      this.recordMetric('LCP', entry.renderTime || entry.loadTime);
    });

    // First Input Delay (FID)
    this.observeMetric('first-input', (entry) => {
      this.recordMetric('FID', entry.processingStart - entry.startTime);
    });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    this.observeMetric('layout-shift', (entry) => {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value;
        this.recordMetric('CLS', clsValue);
      }
    });
  }

  private observeMetric(type: string, callback: (entry: PerformanceEntry) => void) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          callback(entry);
        }
      });
      observer.observe({ type, buffered: true });
    } catch (error) {
      console.warn(`Failed to observe ${type}:`, error);
    }
  }

  private monitorCustomMetrics() {
    // Monitor long tasks
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            this.recordMetric('LongTask', entry.duration);
            console.warn('⚠️ Long task detected:', entry.duration, 'ms');
          }
        }
      });
      observer.observe({ type: 'longtask', buffered: true });
      this.observer = observer;
    } catch (error) {
      console.warn('Long task monitoring not supported');
    }
  }

  recordMetric(name: string, value: number) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    // Log to console in dev mode
    if (import.meta.env.DEV) {
      console.log(`📊 ${name}:`, value.toFixed(2), 'ms');
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    this.recordMetric(name, duration);
    return result;
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    this.recordMetric(name, duration);
    return result;
  }

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();

// =====================================================
// USER ANALYTICS
// =====================================================

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
}

class Analytics {
  private events: AnalyticsEvent[] = [];
  private isInitialized = false;

  async initialize() {
    // You can integrate with PostHog, Mixpanel, or Google Analytics here
    const analyticsKey = import.meta.env.VITE_ANALYTICS_KEY;
    
    if (!analyticsKey) {
      console.warn('⚠️ Analytics not configured');
      return;
    }

    this.isInitialized = true;
    console.log('✅ Analytics initialized');
  }

  track(eventName: string, properties?: Record<string, any>) {
    const event: AnalyticsEvent = {
      name: eventName,
      properties,
      timestamp: Date.now(),
    };

    this.events.push(event);

    // Keep only last 100 events
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }

    // Log in dev mode
    if (import.meta.env.DEV) {
      console.log('📈 Analytics:', eventName, properties);
    }

    // Send to analytics service
    this.sendToAnalytics(event);
  }

  private sendToAnalytics(event: AnalyticsEvent) {
    if (!this.isInitialized) return;

    // Implement integration with your analytics service
    // Example for PostHog:
    // posthog.capture(event.name, event.properties);
  }

  identify(userId: string, traits?: Record<string, any>) {
    if (!this.isInitialized) return;

    console.log('👤 User identified:', userId);
    // Implement user identification
    // Example: posthog.identify(userId, traits);
  }

  page(pageName: string, properties?: Record<string, any>) {
    this.track('Page View', {
      page: pageName,
      ...properties,
    });
  }

  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }
}

export const analytics = new Analytics();

// =====================================================
// HEALTH CHECKS
// =====================================================

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  checks: {
    database: boolean;
    auth: boolean;
    storage: boolean;
    webrtc: boolean;
  };
  timestamp: number;
  latency: {
    database: number | null;
    auth: number | null;
  };
}

class HealthChecker {
  async checkHealth(): Promise<HealthStatus> {
    const checks = {
      database: await this.checkDatabase(),
      auth: await this.checkAuth(),
      storage: await this.checkStorage(),
      webrtc: await this.checkWebRTC(),
    };

    const latency = {
      database: await this.measureDatabaseLatency(),
      auth: await this.measureAuthLatency(),
    };

    const allHealthy = Object.values(checks).every((check) => check);
    const someHealthy = Object.values(checks).some((check) => check);

    const status: HealthStatus['status'] = allHealthy
      ? 'healthy'
      : someHealthy
      ? 'degraded'
      : 'down';

    return {
      status,
      checks,
      timestamp: Date.now(),
      latency,
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase.from('profiles').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  private async checkAuth(): Promise<boolean> {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data } = await supabase.auth.getSession();
      return data !== null;
    } catch {
      return false;
    }
  }

  private async checkStorage(): Promise<boolean> {
    try {
      return typeof localStorage !== 'undefined' && localStorage !== null;
    } catch {
      return false;
    }
  }

  private async checkWebRTC(): Promise<boolean> {
    try {
      return typeof RTCPeerConnection !== 'undefined';
    } catch {
      return false;
    }
  }

  private async measureDatabaseLatency(): Promise<number | null> {
    try {
      const { supabase } = await import('../lib/supabase');
      const start = performance.now();
      await supabase.from('profiles').select('id').limit(1);
      return performance.now() - start;
    } catch {
      return null;
    }
  }

  private async measureAuthLatency(): Promise<number | null> {
    try {
      const { supabase } = await import('../lib/supabase');
      const start = performance.now();
      await supabase.auth.getSession();
      return performance.now() - start;
    } catch {
      return null;
    }
  }
}

export const healthChecker = new HealthChecker();

// =====================================================
// INITIALIZE ALL MONITORING
// =====================================================

export async function initializeMonitoring() {
  await errorTracker.initialize();
  performanceMonitor.initialize();
  await analytics.initialize();
  
  // Check health on startup
  const health = await healthChecker.checkHealth();
  console.log('🏥 Health check:', health.status);
  
  // Periodic health checks
  setInterval(async () => {
    const health = await healthChecker.checkHealth();
    if (health.status !== 'healthy') {
      console.warn('⚠️ System health degraded:', health);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}

// =====================================================
// USAGE TRACKING HELPERS
// =====================================================

export const trackEvent = {
  pageView: (page: string) => analytics.page(page),
  userSignup: (userId: string) => analytics.track('User Signup', { userId }),
  userLogin: (userId: string) => analytics.track('User Login', { userId }),
  partyJoin: (partyId: string) => analytics.track('Party Joined', { partyId }),
  partyCreate: (partyId: string) => analytics.track('Party Created', { partyId }),
  tokenEarn: (amount: number, source: string) => analytics.track('Tokens Earned', { amount, source }),
  tokenSpend: (amount: number, item: string) => analytics.track('Tokens Spent', { amount, item }),
  gameSession: (game: string, duration: number) => analytics.track('Game Session', { game, duration }),
  achievement: (name: string) => analytics.track('Achievement Unlocked', { name }),
  voiceChatJoin: (partyId: string) => analytics.track('Voice Chat Joined', { partyId }),
  messagesSent: (count: number, type: 'dm' | 'party' | 'global') => analytics.track('Messages Sent', { count, type }),
};

