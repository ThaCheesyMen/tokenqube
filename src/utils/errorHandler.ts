/**
 * Centralized Error Handling System
 * Provides consistent error handling across the application
 */

import { toast } from '../components/Toast';

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
  context?: string;
  retry?: () => Promise<void>;
  timestamp: number;
}

export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT: 'RATE_LIMIT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_FOUND: 'NOT_FOUND',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

class ErrorHandler {
  private errorLog: AppError[] = [];
  private maxLogSize = 100;

  /**
   * Handle an error and show user-friendly message
   */
  handle(error: unknown, context?: string): AppError {
    const appError = this.parseError(error, context);
    
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error(`[${appError.code}] ${context || 'Unknown'}:`, error);
    }

    // Add to error log
    this.addToLog(appError);

    // Show toast notification
    toast.error(appError.userMessage);

    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // this.sendToErrorTracking(appError, error);

    return appError;
  }

  /**
   * Parse unknown error into AppError format
   */
  private parseError(error: unknown, context?: string): AppError {
    const timestamp = Date.now();

    // Network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      return {
        code: ErrorCodes.NETWORK_ERROR,
        message: 'Network request failed',
        userMessage: 'Connection lost. Please check your internet connection.',
        context,
        timestamp,
      };
    }

    // Supabase/PostgreSQL errors
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const dbError = error as { code: string; message: string; details?: string };
      
      // Unique constraint violation
      if (dbError.code === '23505') {
        return {
          code: ErrorCodes.VALIDATION_ERROR,
          message: dbError.message,
          userMessage: 'This item already exists. Please try a different value.',
          context,
          timestamp,
        };
      }

      // Foreign key violation
      if (dbError.code === '23503') {
        return {
          code: ErrorCodes.DATABASE_ERROR,
          message: dbError.message,
          userMessage: 'Referenced item does not exist.',
          context,
          timestamp,
        };
      }

      // Check constraint violation
      if (dbError.code === '23514') {
        return {
          code: ErrorCodes.VALIDATION_ERROR,
          message: dbError.message,
          userMessage: 'Invalid data provided. Please check your input.',
          context,
          timestamp,
        };
      }

      // Unauthorized (RLS policy violation)
      if (dbError.code === 'PGRST301' || dbError.code === '42501') {
        return {
          code: ErrorCodes.PERMISSION_DENIED,
          message: dbError.message,
          userMessage: 'You do not have permission to perform this action.',
          context,
          timestamp,
        };
      }

      // Not found
      if (dbError.code === 'PGRST116') {
        return {
          code: ErrorCodes.NOT_FOUND,
          message: dbError.message,
          userMessage: 'The requested item was not found.',
          context,
          timestamp,
        };
      }

      // Rate limit
      if (dbError.code === '429') {
        return {
          code: ErrorCodes.RATE_LIMIT,
          message: dbError.message,
          userMessage: 'Too many requests. Please slow down and try again.',
          context,
          timestamp,
        };
      }
    }

    // Standard JavaScript errors
    if (error instanceof Error) {
      return {
        code: ErrorCodes.UNKNOWN,
        message: error.message,
        userMessage: 'Something went wrong. Please try again.',
        context,
        timestamp,
      };
    }

    // Unknown error type
    return {
      code: ErrorCodes.UNKNOWN,
      message: String(error),
      userMessage: 'An unexpected error occurred. Please try again.',
      context,
      timestamp,
    };
  }

  /**
   * Add error to internal log
   */
  private addToLog(error: AppError) {
    this.errorLog.push(error);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count: number = 10): AppError[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Clear error log
   */
  clearLog() {
    this.errorLog = [];
  }

  /**
   * Retry a function with exponential backoff
   */
  async retry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      initialDelay?: number;
      maxDelay?: number;
      backoffMultiplier?: number;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2,
    } = options;

    let lastError: unknown;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries - 1) {
          // Calculate delay with exponential backoff
          const delay = Math.min(
            initialDelay * Math.pow(backoffMultiplier, attempt),
            maxDelay
          );
          
          console.log(`Retry attempt ${attempt + 1}/${maxRetries} in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Handle async operation with automatic error handling
   */
  async handleAsync<T>(
    fn: () => Promise<T>,
    context?: string,
    options?: {
      showLoading?: boolean;
      successMessage?: string;
      retries?: number;
    }
  ): Promise<T | null> {
    try {
      const result = await (options?.retries 
        ? this.retry(fn, { maxRetries: options.retries })
        : fn()
      );

      if (options?.successMessage) {
        toast.success(options.successMessage);
      }

      return result;
    } catch (error) {
      this.handle(error, context);
      return null;
    }
  }

  /**
   * Create a safe version of a function that handles errors automatically
   */
  makeSafe<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: string
  ): T {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handle(error, context);
        return null;
      }
    }) as T;
  }

  /**
   * Assert a condition and throw a user-friendly error if false
   */
  assert(condition: boolean, message: string, userMessage: string): asserts condition {
    if (!condition) {
      const error: AppError = {
        code: ErrorCodes.VALIDATION_ERROR,
        message,
        userMessage,
        timestamp: Date.now(),
      };
      throw error;
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

// Convenience functions
export const handleError = (error: unknown, context?: string) => 
  errorHandler.handle(error, context);

export const retryOperation = <T>(fn: () => Promise<T>, maxRetries?: number) =>
  errorHandler.retry(fn, { maxRetries });

export const safeAsync = <T>(fn: () => Promise<T>, context?: string) =>
  errorHandler.handleAsync(fn, context);

