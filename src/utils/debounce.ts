/**
 * Debounce utility function
 * Delays the execution of a function until after a specified delay
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle utility function
 * Limits the execution of a function to at most once per specified delay
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return function executedFunction(...args: Parameters<T>) {
    const now = Date.now();
    
    if (now - lastCall >= wait) {
      lastCall = now;
      func(...args);
    }
  };
}
