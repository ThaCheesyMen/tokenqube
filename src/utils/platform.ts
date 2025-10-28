/**
 * Platform Detection Utility
 * Detects if the app is running in Electron or Web
 */

export const isElectron = (): boolean => {
  // Method 1: Check user agent
  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('electron')) {
      return true;
    }
  }

  // Method 2: Check if window.electron exists (from preload script)
  if (typeof window !== 'undefined' && (window as any).electron) {
    return true;
  }

  // Method 3: Check for electron-specific process object
  if (typeof process !== 'undefined' && process.versions && (process.versions as any).electron) {
    return true;
  }

  return false;
};

export const isWeb = (): boolean => {
  return !isElectron();
};

export const getPlatform = (): 'electron' | 'web' => {
  return isElectron() ? 'electron' : 'web';
};

