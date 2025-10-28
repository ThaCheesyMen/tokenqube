/**
 * Content Sanitization Utility
 * Protects against XSS attacks and malicious content
 */

// Type-safe sanitization configuration
interface SanitizeConfig {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedSchemes?: string[];
}

// Default safe configuration
const DEFAULT_CONFIG: SanitizeConfig = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
};

/**
 * Sanitize HTML string to prevent XSS attacks
 */
export function sanitizeHTML(dirty: string, config: SanitizeConfig = DEFAULT_CONFIG): string {
  // Create a temporary DOM element
  const doc = new DOMParser().parseFromString(dirty, 'text/html');
  
  // Remove script tags and dangerous content
  const scripts = doc.querySelectorAll('script, style, iframe, object, embed');
  scripts.forEach(script => script.remove());
  
  // Remove event handlers
  const allElements = doc.querySelectorAll('*');
  allElements.forEach(element => {
    // Remove event handler attributes
    Array.from(element.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        element.removeAttribute(attr.name);
      }
    });
    
    // Remove javascript: URLs
    const href = element.getAttribute('href');
    if (href && href.toLowerCase().startsWith('javascript:')) {
      element.removeAttribute('href');
    }
    
    const src = element.getAttribute('src');
    if (src && src.toLowerCase().startsWith('javascript:')) {
      element.removeAttribute('src');
    }
  });
  
  return doc.body.innerHTML;
}

/**
 * Escape HTML special characters
 */
export function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Unescape HTML entities
 */
export function unescapeHTML(text: string): string {
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
  };
  
  return text.replace(/&(?:amp|lt|gt|quot|#x27|#x2F);/g, (entity) => map[entity] || entity);
}

/**
 * Sanitize URL to prevent XSS through links
 */
export function sanitizeURL(url: string): string {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow http, https, and mailto protocols
    const allowedProtocols = ['http:', 'https:', 'mailto:'];
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      return '#';
    }
    
    return url;
  } catch {
    // Invalid URL
    return '#';
  }
}

/**
 * Sanitize markdown-style text (simple implementation)
 */
export function sanitizeMarkdown(text: string): string {
  // Allow basic markdown but escape HTML
  let sanitized = escapeHTML(text);
  
  // Convert markdown to safe HTML
  // **bold**
  sanitized = sanitized.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // *italic*
  sanitized = sanitized.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // `code`
  sanitized = sanitized.replace(/`(.+?)`/g, '<code>$1</code>');
  
  // [link](url)
  sanitized = sanitized.replace(
    /\[(.+?)\]\((.+?)\)/g,
    (_, text, url) => `<a href="${sanitizeURL(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(text)}</a>`
  );
  
  // Line breaks
  sanitized = sanitized.replace(/\n/g, '<br>');
  
  return sanitized;
}

/**
 * Remove all HTML tags from string
 */
export function stripHTML(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

/**
 * Truncate text safely (respecting HTML tags if present)
 */
export function truncateText(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  const truncated = text.substring(0, maxLength - suffix.length);
  return truncated + suffix;
}

/**
 * Sanitize file name to prevent directory traversal
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path separators and special characters
  return fileName
    .replace(/[\/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255); // Limit length
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.trim().toLowerCase();
  
  if (!emailRegex.test(trimmed)) {
    return null;
  }
  
  return trimmed;
}

/**
 * Check if string contains potential XSS
 */
export function containsXSS(text: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i,
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(text));
}

/**
 * Sanitize user input for database queries (basic)
 * Note: Always use parameterized queries for full protection
 */
export function sanitizeDBInput(input: string): string {
  // Escape single quotes for SQL
  return input.replace(/'/g, "''");
}

/**
 * Sanitize JSON data
 */
export function sanitizeJSON<T>(data: T): T {
  const jsonString = JSON.stringify(data);
  const sanitized = escapeHTML(jsonString);
  return JSON.parse(unescapeHTML(sanitized));
}

// Export a safe render component helper
export interface SafeRenderOptions {
  allowMarkdown?: boolean;
  allowHTML?: boolean;
  maxLength?: number;
}

/**
 * Safely render user-generated content
 */
export function safeRender(
  content: string,
  options: SafeRenderOptions = {}
): string {
  const { allowMarkdown = false, allowHTML = false, maxLength } = options;
  
  let sanitized = content;
  
  // Truncate if needed
  if (maxLength) {
    sanitized = truncateText(sanitized, maxLength);
  }
  
  // Apply appropriate sanitization
  if (allowMarkdown) {
    sanitized = sanitizeMarkdown(sanitized);
  } else if (allowHTML) {
    sanitized = sanitizeHTML(sanitized);
  } else {
    sanitized = escapeHTML(sanitized);
  }
  
  return sanitized;
}

// React component helper
export function useSafeContent(content: string, options: SafeRenderOptions = {}) {
  return {
    __html: safeRender(content, options),
  };
}

