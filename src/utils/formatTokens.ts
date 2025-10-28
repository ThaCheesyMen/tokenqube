/**
 * Format token amounts consistently across the app
 * 
 * @example
 * formatTokens(3105);                          // "3,105"
 * formatTokens(3105, { showLabel: true });     // "3,105 tokens"
 * formatTokens(150, { showSign: true });       // "+150"
 * formatTokens(-50, { showSign: true });       // "-50"
 * formatTokens(1000000, { compact: true });    // "1.0M"
 */

export interface FormatTokensOptions {
  /**
   * Add " tokens" suffix
   * @default false
   */
  showLabel?: boolean;

  /**
   * Show + sign for positive numbers
   * @default false
   */
  showSign?: boolean;

  /**
   * Use compact notation (K, M, B) for large numbers
   * @default false
   */
  compact?: boolean;

  /**
   * Minimum fraction digits (for compact mode)
   * @default 1
   */
  minimumFractionDigits?: number;
}

export function formatTokens(
  amount: number,
  options: FormatTokensOptions = {}
): string {
  const {
    showLabel = false,
    showSign = false,
    compact = false,
    minimumFractionDigits = 1
  } = options;

  let formatted: string;

  if (compact) {
    // Compact notation for large numbers
    if (Math.abs(amount) >= 1_000_000_000) {
      formatted = (amount / 1_000_000_000).toFixed(minimumFractionDigits) + 'B';
    } else if (Math.abs(amount) >= 1_000_000) {
      formatted = (amount / 1_000_000).toFixed(minimumFractionDigits) + 'M';
    } else if (Math.abs(amount) >= 1_000) {
      formatted = (amount / 1_000).toFixed(minimumFractionDigits) + 'K';
    } else {
      formatted = amount.toString();
    }
  } else {
    // Standard number formatting with thousands separators
    formatted = amount.toLocaleString('en-US');
  }

  // Add sign if requested
  if (showSign && amount > 0) {
    formatted = '+' + formatted;
  }

  // Add label if requested
  if (showLabel) {
    formatted += ' tokens';
  }

  return formatted;
}

/**
 * Format token amount with color class based on positive/negative
 * 
 * @example
 * formatTokensWithColor(150);  // { text: "+150", color: "text-green-400" }
 * formatTokensWithColor(-50);  // { text: "-50", color: "text-red-400" }
 * formatTokensWithColor(0);    // { text: "0", color: "text-gray-400" }
 */
export function formatTokensWithColor(amount: number): {
  text: string;
  color: string;
} {
  const text = formatTokens(amount, { showSign: amount !== 0 });
  
  let color: string;
  if (amount > 0) {
    color = 'text-green-400';
  } else if (amount < 0) {
    color = 'text-red-400';
  } else {
    color = 'text-gray-400';
  }

  return { text, color };
}

/**
 * Format token change percentage
 * 
 * @example
 * formatTokenChange(150, 100);  // "+50% (150 → 100)"
 * formatTokenChange(75, 100);   // "-25% (75 → 100)"
 */
export function formatTokenChange(newValue: number, oldValue: number): {
  text: string;
  percentage: number;
  color: string;
} {
  if (oldValue === 0) {
    return {
      text: newValue > 0 ? '+100%' : '0%',
      percentage: newValue > 0 ? 100 : 0,
      color: newValue > 0 ? 'text-green-400' : 'text-gray-400'
    };
  }

  const change = newValue - oldValue;
  const percentage = (change / oldValue) * 100;
  const sign = percentage > 0 ? '+' : '';
  const color = percentage > 0 ? 'text-green-400' : percentage < 0 ? 'text-red-400' : 'text-gray-400';

  return {
    text: `${sign}${percentage.toFixed(1)}%`,
    percentage,
    color
  };
}

/**
 * Get emoji for token amount
 * 
 * @example
 * getTokenEmoji(50);      // "🪙"
 * getTokenEmoji(500);     // "💰"
 * getTokenEmoji(5000);    // "💎"
 */
export function getTokenEmoji(amount: number): string {
  if (amount >= 10000) return '👑'; // King
  if (amount >= 5000) return '💎';  // Diamond
  if (amount >= 1000) return '💰';  // Money bag
  if (amount >= 100) return '🏆';   // Trophy
  return '🪙'; // Coin
}

