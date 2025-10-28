const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electron', {
  // Get currently running games
  getRunningGames: () => ipcRenderer.invoke('get-running-games'),
  
  // Check if a specific game is running
  checkGameRunning: (processName) => ipcRenderer.invoke('check-game-running', processName),
  
  // Listen for game detection events
  onGamesDetected: (callback) => {
    ipcRenderer.on('games-detected', (event, games) => callback(games));
  },
  
  // Remove listener
  removeGamesDetectedListener: () => {
    ipcRenderer.removeAllListeners('games-detected');
  },
  
  // Screen capture for Live Studio
  getDisplaySources: () => ipcRenderer.invoke('get-display-sources'),
  
  // Overlay control
  toggleOverlay: () => ipcRenderer.invoke('toggle-overlay'),
  closeOverlay: () => ipcRenderer.invoke('close-overlay'),
  isOverlayEnabled: () => ipcRenderer.invoke('is-overlay-enabled'),
  setOverlayOpacity: (opacity) => ipcRenderer.invoke('set-overlay-opacity', opacity),
  setOverlaySize: (width, height) => ipcRenderer.invoke('set-overlay-size', width, height),
  setOverlayPosition: (x, y) => ipcRenderer.invoke('set-overlay-position', x, y),
  onOverlayToggled: (callback) => {
    ipcRenderer.on('overlay-toggled', (event, enabled) => callback(enabled));
  },
  
  // Send notifications to overlay
  sendPartyInvite: (data) => ipcRenderer.send('party-invite', data),
  sendFriendOnline: (data) => ipcRenderer.send('friend-online', data),
  
  // Listen for overlay events
  onPartyInvite: (callback) => {
    ipcRenderer.on('party-invite', (event, data) => callback(data));
  },
  onFriendOnline: (callback) => {
    ipcRenderer.on('friend-online', (event, data) => callback(data));
  }
});
