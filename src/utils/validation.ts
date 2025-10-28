// Comprehensive input validation utilities
import { useState } from 'react';

export const ValidationRules = {
  username: {
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_-]+$/,
    message: 'Username must be 3-20 characters (letters, numbers, _ or - only)'
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address'
  },
  password: {
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    message: 'Password must be 8+ characters with uppercase, lowercase, number, and special character'
  },
  bio: {
    maxLength: 500,
    message: 'Bio must be less than 500 characters'
  },
  message: {
    minLength: 1,
    maxLength: 2000,
    message: 'Message must be 1-2000 characters'
  },
  tokens: {
    min: 0,
    max: 1000000,
    message: 'Token amount must be between 0 and 1,000,000'
  },
  price: {
    min: 1,
    max: 1000000,
    message: 'Price must be between 1 and 1,000,000 tokens'
  }
};

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class InputValidator {
  // Sanitize HTML to prevent XSS
  static sanitizeHTML(input: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    return input.replace(/[&<>"'/]/g, (char) => map[char]);
  }

  // Validate username
  static validateUsername(username: string): ValidationResult {
    const errors: string[] = [];
    const trimmed = username.trim();

    if (trimmed.length < ValidationRules.username.minLength) {
      errors.push(`Username must be at least ${ValidationRules.username.minLength} characters`);
    }

    if (trimmed.length > ValidationRules.username.maxLength) {
      errors.push(`Username must be less than ${ValidationRules.username.maxLength} characters`);
    }

    if (!ValidationRules.username.pattern.test(trimmed)) {
      errors.push(ValidationRules.username.message);
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validate email
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    const trimmed = email.trim();

    if (!ValidationRules.email.pattern.test(trimmed)) {
      errors.push(ValidationRules.email.message);
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validate password
  static validatePassword(password: string): ValidationResult {
    const errors: string[] = [];

    if (password.length < ValidationRules.password.minLength) {
      errors.push(`Password must be at least ${ValidationRules.password.minLength} characters`);
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[@$!%*?&]/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validate message
  static validateMessage(message: string): ValidationResult {
    const errors: string[] = [];
    const trimmed = message.trim();

    if (trimmed.length < ValidationRules.message.minLength) {
      errors.push('Message cannot be empty');
    }

    if (trimmed.length > ValidationRules.message.maxLength) {
      errors.push(`Message must be less than ${ValidationRules.message.maxLength} characters`);
    }

    // Check for spam patterns
    if (this.isSpam(trimmed)) {
      errors.push('Message appears to be spam');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validate bio
  static validateBio(bio: string): ValidationResult {
    const errors: string[] = [];

    if (bio.length > ValidationRules.bio.maxLength) {
      errors.push(ValidationRules.bio.message);
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validate token amount
  static validateTokenAmount(amount: number): ValidationResult {
    const errors: string[] = [];

    if (amount < ValidationRules.tokens.min || amount > ValidationRules.tokens.max) {
      errors.push(ValidationRules.tokens.message);
    }

    if (!Number.isInteger(amount)) {
      errors.push('Token amount must be a whole number');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validate price
  static validatePrice(price: number): ValidationResult {
    const errors: string[] = [];

    if (price < ValidationRules.price.min || price > ValidationRules.price.max) {
      errors.push(ValidationRules.price.message);
    }

    if (!Number.isInteger(price)) {
      errors.push('Price must be a whole number');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Check for spam
  private static isSpam(message: string): boolean {
    const spamPatterns = [
      /(.)\1{10,}/i, // Repeated characters
      /(http|www)\S+/gi, // Multiple URLs
      /\b(buy|cheap|discount|free|winner|click here)\b/gi, // Spam keywords
    ];

    return spamPatterns.some(pattern => pattern.test(message));
  }

  // Rate limiting helper
  private static requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  static checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.requestCounts.get(key);

    if (!record || now > record.resetTime) {
      this.requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  // File validation
  static validateFile(file: File, maxSizeMB: number = 10, allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']): ValidationResult {
    const errors: string[] = [];
    const maxSize = maxSizeMB * 1024 * 1024;

    if (file.size > maxSize) {
      errors.push(`File size must be less than ${maxSizeMB}MB`);
    }

    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  // URL validation
  static validateURL(url: string): ValidationResult {
    const errors: string[] = [];

    try {
      const urlObj = new URL(url);
      
      // Only allow http and https
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        errors.push('URL must use HTTP or HTTPS protocol');
      }
    } catch {
      errors.push('Invalid URL format');
    }

    return { isValid: errors.length === 0, errors };
  }
}

// React hook for form validation
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Partial<Record<keyof T, (value: any) => ValidationResult>>
) {
  const [values, setValues] = React.useState<T>(initialValues);
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string[]>>>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof T, boolean>>>({});

  const validateField = (name: keyof T, value: any): string[] => {
    const rule = validationRules[name];
    if (!rule) return [];
    
    const result = rule(value);
    return result.errors;
  };

  const handleChange = (name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    if (touched[name]) {
      const fieldErrors = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: fieldErrors }));
    }
  };

  const handleBlur = (name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const fieldErrors = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: fieldErrors }));
  };

  const validateAll = (): boolean => {
    const newErrors: Partial<Record<keyof T, string[]>> = {};
    let isValid = true;

    Object.keys(validationRules).forEach((key) => {
      const fieldKey = key as keyof T;
      const fieldErrors = validateField(fieldKey, values[fieldKey]);
      
      if (fieldErrors.length > 0) {
        newErrors[fieldKey] = fieldErrors;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched(Object.keys(validationRules).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    
    return isValid;
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    isValid: Object.keys(errors).length === 0
  };
}
