/**
 * TokenQube Brand Colors
 * Unique color scheme to distinguish from Discord
 */

export const theme = {
  // Primary Brand Color - Purple/Violet instead of Discord blue
  primary: {
    DEFAULT: '#8B5CF6', // Vibrant purple
    light: '#A78BFA',
    dark: '#7C3AED',
    hover: '#7C3AED',
  },
  
  // Secondary Brand Color - Cyan accent
  secondary: {
    DEFAULT: '#06B6D4', // Cyan
    light: '#22D3EE',
    dark: '#0891B2',
  },
  
  // Background colors (from Auth page)
  background: {
    primary: '#0f0f0f',     // Main dark background
    secondary: '#1a1a1a',   // Slightly lighter panels
    tertiary: '#2f3136',    // Cards and containers
    hover: '#36393f',       // Hover states
  },
  
  // Border colors
  border: {
    DEFAULT: '#202225',
    light: '#40444b',
  },
  
  // Text colors
  text: {
    primary: '#FFFFFF',
    secondary: '#B9BBBE',
    muted: '#72767D',
  },
  
  // Status colors
  status: {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  
  // Gradients
  gradients: {
    primary: 'from-[#8B5CF6] to-[#7C3AED]',
    secondary: 'from-[#06B6D4] to-[#0891B2]',
    accent: 'from-[#8B5CF6] to-[#06B6D4]',
  }
};

// Helper function to replace old Discord blue with new brand color
export const replacePrimaryColor = (className: string): string => {
  return className
    .replace(/bg-\[#8B5CF6\]/g, 'bg-[#8B5CF6]')
    .replace(/text-\[#8B5CF6\]/g, 'text-[#8B5CF6]')
    .replace(/border-\[#8B5CF6\]/g, 'border-[#8B5CF6]')
    .replace(/hover:bg-\[#7C3AED\]/g, 'hover:bg-[#7C3AED]')
    .replace(/from-blue-500/g, 'from-purple-500')
    .replace(/to-blue-500/g, 'to-purple-500');
};

export default theme;

