/**
 * Centralized Level System Utilities
 * Used consistently across all components (Dashboard, Profile, etc.)
 */

export interface LevelInfo {
  level: number;
  progress: number;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  totalXPForCurrentLevel: number;
}

export interface TierInfo {
  name: string;
  color: string;
  minLevel: number;
}

/**
 * Calculate user level and progress from total XP (earned tokens)
 * Formula: XP = total_earned / 10
 * Level progression: exponential scaling (baseXP * level^1.5)
 */
export function calculateLevel(totalEarned: number): LevelInfo {
  const xp = totalEarned / 10; // 10 tokens = 1 XP
  const baseXP = 100;
  const exponent = 1.5;
  
  let level = 1;
  let totalXP = 0;
  let xpForCurrentLevel = 0;

  // Calculate current level
  while (totalXP <= xp) {
    xpForCurrentLevel = Math.floor(baseXP * Math.pow(level, exponent));
    totalXP += xpForCurrentLevel;
    if (totalXP > xp) break;
    level++;
  }

  // Calculate progress to next level
  const totalXPForCurrentLevel = totalXP - xpForCurrentLevel;
  const currentXP = xp - totalXPForCurrentLevel;
  const progress = (currentXP / xpForCurrentLevel) * 100;
  const xpForNextLevel = Math.floor(baseXP * Math.pow(level + 1, exponent));

  return {
    level,
    progress: Math.max(0, Math.min(100, progress)),
    currentXP: Math.floor(currentXP),
    xpForCurrentLevel,
    xpForNextLevel,
    totalXPForCurrentLevel,
  };
}

/**
 * Get tier name and color based on level
 */
export function getTier(level: number): TierInfo {
  if (level >= 50) return { name: 'Legendary', color: 'from-purple-600 to-pink-600', minLevel: 50 };
  if (level >= 40) return { name: 'Master', color: 'from-yellow-400 to-orange-600', minLevel: 40 };
  if (level >= 30) return { name: 'Diamond', color: 'from-cyan-500 to-blue-600', minLevel: 30 };
  if (level >= 20) return { name: 'Platinum', color: 'from-gray-400 to-gray-600', minLevel: 20 };
  if (level >= 15) return { name: 'Gold', color: 'from-yellow-500 to-amber-600', minLevel: 15 };
  if (level >= 10) return { name: 'Silver', color: 'from-gray-300 to-gray-500', minLevel: 10 };
  return { name: 'Bronze', color: 'from-orange-500 to-red-600', minLevel: 1 };
}

/**
 * Get all available tiers
 */
export function getAllTiers(): TierInfo[] {
  return [
    { name: 'Bronze', color: 'from-orange-500 to-red-600', minLevel: 1 },
    { name: 'Silver', color: 'from-gray-300 to-gray-500', minLevel: 10 },
    { name: 'Gold', color: 'from-yellow-500 to-amber-600', minLevel: 15 },
    { name: 'Platinum', color: 'from-gray-400 to-gray-600', minLevel: 20 },
    { name: 'Diamond', color: 'from-cyan-500 to-blue-600', minLevel: 30 },
    { name: 'Master', color: 'from-yellow-400 to-orange-600', minLevel: 40 },
    { name: 'Legendary', color: 'from-purple-600 to-pink-600', minLevel: 50 },
  ];
}

/**
 * Format XP number for display
 */
export function formatXP(xp: number): string {
  if (xp >= 1000000) return `${(xp / 1000000).toFixed(1)}M`;
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}K`;
  return xp.toString();
}

/**
 * Get level badge color based on tier
 */
export function getLevelBadgeColor(level: number): string {
  const tier = getTier(level);
  
  // Return Tailwind gradient classes
  if (tier.name === 'Legendary') return 'from-purple-600 to-pink-600';
  if (tier.name === 'Master') return 'from-yellow-400 to-orange-600';
  if (tier.name === 'Diamond') return 'from-cyan-500 to-blue-600';
  if (tier.name === 'Platinum') return 'from-gray-400 to-gray-600';
  if (tier.name === 'Gold') return 'from-yellow-500 to-amber-600';
  if (tier.name === 'Silver') return 'from-gray-300 to-gray-500';
  return 'from-orange-500 to-red-600'; // Bronze
}

