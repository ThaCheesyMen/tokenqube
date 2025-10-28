const { app, BrowserWindow, ipcMain, globalShortcut, desktopCapturer } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Try to load find-process, fallback to manual process detection
let find;
try {
  find = require('find-process');
} catch (e) {
  console.warn('find-process not available, using fallback detection');
  find = null;
}

let mainWindow;
let overlayWindow = null;
let overlayEnabled = false;

// Known game executables and their names
const KNOWN_GAMES = {
  // Steam Games
  'cs2.exe': { name: 'Counter-Strike 2', platform: 'Steam' },
  'csgo.exe': { name: 'Counter-Strike: Global Offensive', platform: 'Steam' },
  'valorant.exe': { name: 'VALORANT', platform: 'Riot Games' },
  'valorant-win64-shipping.exe': { name: 'VALORANT', platform: 'Riot Games' },
  'league of legends.exe': { name: 'League of Legends', platform: 'Riot Games' },
  'leagueclient.exe': { name: 'League of Legends', platform: 'Riot Games' },
  'dota2.exe': { name: 'Dota 2', platform: 'Steam' },
  'r5apex.exe': { name: 'Apex Legends', platform: 'EA' },
  'fortniteclient-win64-shipping.exe': { name: 'Fortnite', platform: 'Epic Games' },
  'gta5.exe': { name: 'Grand Theft Auto V', platform: 'Rockstar' },
  'rdr2.exe': { name: 'Red Dead Redemption 2', platform: 'Rockstar' },
  'overwatch.exe': { name: 'Overwatch 2', platform: 'Blizzard' },
  'wow.exe': { name: 'World of Warcraft', platform: 'Blizzard' },
  'minecraft.exe': { name: 'Minecraft', platform: 'Mojang' },
  'javaw.exe': { name: 'Minecraft Java', platform: 'Mojang' },
  'destiny2.exe': { name: 'Destiny 2', platform: 'Bungie' },
  'pubg.exe': { name: 'PUBG', platform: 'Steam' },
  'tslgame.exe': { name: 'PUBG', platform: 'Steam' },
  'rainbowsix.exe': { name: 'Rainbow Six Siege', platform: 'Ubisoft' },
  'rocketleague.exe': { name: 'Rocket League', platform: 'Epic Games' },
  'rust.exe': { name: 'Rust', platform: 'Steam' },
  'eldenring.exe': { name: 'Elden Ring', platform: 'Steam' },
  'cyberpunk2077.exe': { name: 'Cyberpunk 2077', platform: 'Steam' },
  'hogwartslegacy.exe': { name: 'Hogwarts Legacy', platform: 'Steam' },
  'starfield.exe': { name: 'Starfield', platform: 'Steam' },
  'cod.exe': { name: 'Call of Duty', platform: 'Activision' },
  'modernwarfare.exe': { name: 'Call of Duty: Modern Warfare', platform: 'Activision' },
  'warzone.exe': { name: 'Call of Duty: Warzone', platform: 'Activision' },
  'fifa23.exe': { name: 'FIFA 23', platform: 'EA' },
  'fc24.exe': { name: 'EA Sports FC 24', platform: 'EA' },
  'battlefield2042.exe': { name: 'Battlefield 2042', platform: 'EA' },
  'bf6.exe': { name: 'Battlefield 6', platform: 'EA' },
  'battlefield6.exe': { name: 'Battlefield 6', platform: 'EA' },
  'bf2042.exe': { name: 'Battlefield 2042', platform: 'EA' },
  'battlefield1.exe': { name: 'Battlefield 1', platform: 'EA' },
  'bfv.exe': { name: 'Battlefield V', platform: 'EA' },
  'bf4.exe': { name: 'Battlefield 4', platform: 'EA' },
  'palworld-win64-shipping.exe': { name: 'Palworld', platform: 'Steam' },
  'helldivers2.exe': { name: 'Helldivers 2', platform: 'Steam' },
  'the finals.exe': { name: 'The Finals', platform: 'Steam' },
  'deadlock.exe': { name: 'Deadlock', platform: 'Steam' },
  'brawlhalla.exe': { name: 'Brawlhalla', platform: 'Steam' },
  'brawlhalla_x64.exe': { name: 'Brawlhalla', platform: 'Steam' },
  'naraka.exe': { name: 'NARAKA: BLADEPOINT', platform: 'Steam' },
  'fallguys_client.exe': { name: 'Fall Guys', platform: 'Epic Games' },
  'amongus.exe': { name: 'Among Us', platform: 'Steam' },
  'satisfactory.exe': { name: 'Satisfactory', platform: 'Steam' },
  'valheim.exe': { name: 'Valheim', platform: 'Steam' },
  'terraria.exe': { name: 'Terraria', platform: 'Steam' },
  'stardewvalley.exe': { name: 'Stardew Valley', platform: 'Steam' },
  'robloxplayerbeta.exe': { name: 'Roblox', platform: 'Roblox' },
  'gtavlauncher.exe': { name: 'GTA V', platform: 'Rockstar' },
  'seaofshadows.exe': { name: 'Sea of Thieves', platform: 'Steam' },
  'sotgame.exe': { name: 'Sea of Thieves', platform: 'Steam' },
  'halo.exe': { name: 'Halo Infinite', platform: 'Steam' },
  'haloinfinite.exe': { name: 'Halo Infinite', platform: 'Steam' },
  'dayz.exe': { name: 'DayZ', platform: 'Steam' },
  'escapefromtarkov.exe': { name: 'Escape from Tarkov', platform: 'Battlestate Games' },
  'squad.exe': { name: 'Squad', platform: 'Steam' },
  'arma3.exe': { name: 'Arma 3', platform: 'Steam' },
  'arma3_x64.exe': { name: 'Arma 3', platform: 'Steam' },
  'smite.exe': { name: 'SMITE', platform: 'Steam' },
  'deadbydaylight-win64-shipping.exe': { name: 'Dead by Daylight', platform: 'Steam' },
  'paladins.exe': { name: 'Paladins', platform: 'Steam' },
  'warframe.x64.exe': { name: 'Warframe', platform: 'Steam' },
  'pathofexile.exe': { name: 'Path of Exile', platform: 'Steam' },
  'pathofexile_x64.exe': { name: 'Path of Exile', platform: 'Steam' },
  'diablo iv.exe': { name: 'Diablo IV', platform: 'Blizzard' },
  'lostsoulsgame.exe': { name: 'Lords of the Fallen', platform: 'Steam' },
  'remnant2-win64-shipping.exe': { name: 'Remnant 2', platform: 'Steam' },
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Enable media access for screen capture and camera/microphone
      enableWebRTC: true,
      // Allow getUserMedia and getDisplayMedia
      allowRunningInsecureContent: false,
      // Enable required web APIs
      webSecurity: true
    },
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#0f0f0f',
    frame: true,
    titleBarStyle: 'default'
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open DevTools in production too (for debugging)
  mainWindow.webContents.openDevTools();

  // Handle permission requests for media devices
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'mediaKeySystem', 'geolocation', 'notifications', 'midi', 'midiSysex', 'pointerLock', 'fullscreen'];
    
    if (allowedPermissions.includes(permission)) {
      console.log(`✅ Granting permission: ${permission}`);
      callback(true);
    } else {
      console.log(`❌ Denying permission: ${permission}`);
      callback(false);
    }
  });

  // Handle desktop capturer (screen capture) requests
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    const allowedPermissions = ['media'];
    return allowedPermissions.includes(permission);
  });

  // Start game detection after window loads
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('🎮 Window loaded, starting game detection...');
    startGameDetection();
    
    // Send a test message to renderer
    mainWindow.webContents.executeJavaScript(`
      console.log('✅ Electron main process is running!');
      console.log('🎮 Game detection system initialized');
      console.log('🎥 Screen capture permissions enabled');
    `);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Game Detection System
let detectionInterval = null;
let currentlyRunningGames = new Set();

function startGameDetection() {
  console.log('🎮 Starting game detection...');
  console.log('🎮 Detection will run every 10 seconds');
  
  // Check every 10 seconds
  detectionInterval = setInterval(async () => {
    try {
      console.log('🔍 Scanning for games...');
      const games = await detectRunningGames();
      console.log(`📊 Found ${games.length} games running`);
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('games-detected', games);
        if (games.length > 0) {
          console.log('✉️ Sent games to renderer:', games.map(g => g.name).join(', '));
          // Also log in browser console
          mainWindow.webContents.executeJavaScript(`
            console.log('🎮 Games detected from Electron:', ${JSON.stringify(games.map(g => g.name))});
          `);
        }
      }
    } catch (error) {
      console.error('❌ Error detecting games:', error);
    }
  }, 10000);

  // Initial detection
  console.log('🔍 Running initial scan...');
  detectRunningGames().then(games => {
    console.log(`📊 Initial scan found ${games.length} games`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('games-detected', games);
      if (games.length > 0) {
        console.log('✉️ Sent games to renderer:', games.map(g => g.name).join(', '));
        // Also log in browser console
        mainWindow.webContents.executeJavaScript(`
          console.log('🎮 Initial scan - Games detected:', ${JSON.stringify(games.map(g => g.name))});
        `);
      } else {
        mainWindow.webContents.executeJavaScript(`
          console.log('📊 Initial scan complete - No games running');
        `);
      }
    }
  });
}

async function detectRunningGames() {
  const detectedGames = [];
  
  try {
    let processList = [];
    
    // Use find-process if available
    if (find) {
      processList = await find('name', /.exe$/i);
    } else {
      // Fallback: Use Windows tasklist command
      const { stdout } = await execPromise('tasklist /FO CSV /NH');
      const lines = stdout.split('\n');
      
      processList = lines
        .filter(line => line.trim())
        .map(line => {
          const match = line.match(/"([^"]+)","(\d+)"/);
          if (match) {
            return { name: match[1], pid: parseInt(match[2]) };
          }
          return null;
        })
        .filter(p => p && p.name.toLowerCase().endsWith('.exe'));
    }
    
    // Debug: Log game-like processes
    const gameKeywords = ['game', 'battlefield', 'bf', 'call', 'counter', 'valorant', 'league', 'apex', 'fortnite'];
    processList.forEach(p => {
      const name = p.name.toLowerCase();
      if (gameKeywords.some(kw => name.includes(kw))) {
        console.log('🎮 Game-like process detected:', p.name);
      }
    });
    
    for (const process of processList) {
      const processName = process.name.toLowerCase();
      
      // Check if it's a known game
      if (KNOWN_GAMES[processName]) {
        const gameInfo = KNOWN_GAMES[processName];
        const gameId = processName.replace('.exe', '');
        
        console.log(`✅ MATCHED: ${process.name} → ${gameInfo.name} (${gameInfo.platform})`);
        
        detectedGames.push({
          id: gameId,
          name: gameInfo.name,
          platform: gameInfo.platform,
          processName: process.name,
          pid: process.pid
        });
        
        // Track new game launches
        if (!currentlyRunningGames.has(gameId)) {
          console.log(`🎮 NEW GAME DETECTED: ${gameInfo.name} (${gameInfo.platform})`);
          currentlyRunningGames.add(gameId);
        }
      }
    }
    
    // Check for games that stopped running
    for (const gameId of currentlyRunningGames) {
      if (!detectedGames.find(g => g.id === gameId)) {
        console.log(`🛑 Game stopped: ${gameId}`);
        currentlyRunningGames.delete(gameId);
      }
    }
    
  } catch (error) {
    console.error('Error in game detection:', error);
  }
  
  return detectedGames;
}

// IPC Handlers
ipcMain.handle('get-running-games', async () => {
  return await detectRunningGames();
});

ipcMain.handle('check-game-running', async (event, processName) => {
  try {
    if (find) {
      const processes = await find('name', processName);
      return processes.length > 0;
    } else {
      // Fallback: Use tasklist
      const { stdout } = await execPromise(`tasklist /FI "IMAGENAME eq ${processName}" /FO CSV /NH`);
      return stdout.includes(processName);
    }
  } catch (error) {
    return false;
  }
});

// Screen capture handler using Electron's desktopCapturer
ipcMain.handle('get-display-sources', async () => {
  const { desktopCapturer } = require('electron');
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 150, height: 150 }
    });
    console.log(`✅ Found ${sources.length} display sources`);
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }));
  } catch (error) {
    console.error('❌ Error getting display sources:', error);
    throw error;
  }
});

// =====================================================
// DESKTOP OVERLAY MODE
// =====================================================

function createOverlay() {
  if (overlayWindow) {
    overlayWindow.show();
    overlayWindow.focus();
    return;
  }

  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  overlayWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    hasShadow: false,
    focusable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      enableWebRTC: true
    }
  });

  // Don't make it fully click-through - widgets need to be interactive
  // We'll use CSS pointer-events instead for better control
  overlayWindow.setIgnoreMouseEvents(false);

  // Load the enhanced overlay HTML file
  if (app.isPackaged) {
    overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));
  } else {
    overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));
  }

  // OLD INLINE HTML (keeping for reference)
  const overlayHTML_OLD = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          width: 100vw; 
          height: 100vh; 
          background: transparent; 
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .widget {
          position: absolute;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          border-radius: 8px;
          padding: 8px 12px;
          border: 1px solid rgba(139, 92, 246, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
          pointer-events: auto;
        }
        .widget-content {
          display: flex;
          align-items: center;
          gap: 8px;
          color: white;
          font-size: 14px;
        }
        .icon { width: 16px; height: 16px; }
        .time { font-family: monospace; font-size: 18px; font-weight: bold; }
        .value { font-weight: bold; }
        .label { font-size: 12px; color: #aaa; }
        .bar {
          width: 80px;
          height: 4px;
          background: #333;
          border-radius: 2px;
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #8B5CF6, #a78bfa);
          transition: width 0.3s;
        }
        #clock { top: 16px; left: 16px; }
        #friends { top: 16px; right: 16px; }
        #fps { bottom: 16px; right: 16px; }
        #cpu { bottom: 16px; left: 16px; }
        #close {
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          cursor: pointer;
          border-color: rgba(239, 68, 68, 0.3);
        }
        #close:hover { background: rgba(239, 68, 68, 0.2); }
      </style>
    </head>
    <body>
      <div id="clock" class="widget">
        <div class="widget-content">
          <span style="color: #8B5CF6;">⏰</span>
          <span class="time" id="timeDisplay">--:--</span>
        </div>
      </div>

      <div id="friends" class="widget">
        <div class="widget-content">
          <span style="color: #10b981;">👥</span>
          <span class="label"><span class="value" style="color: #10b981;" id="friendCount">0</span> Online</span>
        </div>
      </div>

      <div id="fps" class="widget">
        <div class="widget-content" style="flex-direction: column; gap: 4px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #fbbf24;">📊</span>
            <span class="value" id="fpsDisplay">-- FPS</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #60a5fa;">📡</span>
            <span class="label" id="latencyDisplay">--ms</span>
          </div>
        </div>
      </div>

      <div id="cpu" class="widget">
        <div class="widget-content">
          <span style="color: #a78bfa;">💻</span>
          <span class="label" style="margin-right: 4px;">CPU</span>
          <div class="bar">
            <div class="bar-fill" id="cpuBar" style="width: 0%"></div>
          </div>
          <span class="label" id="cpuDisplay">0%</span>
        </div>
      </div>

      <div id="close" class="widget">
        <div class="widget-content">
          <span style="color: #ef4444;">❌</span>
          <span class="label" style="color: #ef4444;">Press F9 to close</span>
        </div>
      </div>

      <script>
        // Update time
        function updateTime() {
          const now = new Date();
          document.getElementById('timeDisplay').textContent = 
            now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        setInterval(updateTime, 1000);
        updateTime();

        // Simulate FPS
        function updateFPS() {
          const fps = Math.floor(90 + Math.random() * 50);
          const latency = Math.floor(20 + Math.random() * 30);
          const cpu = Math.floor(30 + Math.random() * 40);
          
          document.getElementById('fpsDisplay').textContent = fps + ' FPS';
          document.getElementById('latencyDisplay').textContent = latency + 'ms';
          document.getElementById('cpuDisplay').textContent = cpu + '%';
          document.getElementById('cpuBar').style.width = cpu + '%';
        }
        setInterval(updateFPS, 2000);
        updateFPS();

        // Friends count (placeholder)
        document.getElementById('friendCount').textContent = '0';
      </script>
    </body>
    </html>
  `;

  // HTML is now loaded from overlay.html file above

  overlayWindow.on('closed', () => {
    overlayWindow = null;
    overlayEnabled = false;
  });

  overlayEnabled = true;
  console.log('✅ Overlay window created');
}

function toggleOverlay() {
  if (overlayWindow) {
    if (overlayWindow.isVisible()) {
      overlayWindow.hide();
      overlayEnabled = false;
      console.log('👁️ Overlay hidden');
    } else {
      overlayWindow.show();
      overlayEnabled = true;
      console.log('👁️ Overlay shown');
    }
  } else {
    createOverlay();
  }

  // Notify main window about overlay state
  if (mainWindow) {
    mainWindow.webContents.send('overlay-toggled', overlayEnabled);
  }
}

function closeOverlay() {
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
    overlayEnabled = false;
    console.log('❌ Overlay closed');
  }
}

// IPC Handlers for overlay
ipcMain.handle('toggle-overlay', () => {
  toggleOverlay();
  return overlayEnabled;
});

ipcMain.handle('close-overlay', () => {
  closeOverlay();
});

ipcMain.handle('is-overlay-enabled', () => {
  return overlayEnabled;
});

ipcMain.handle('set-overlay-opacity', (event, opacity) => {
  if (overlayWindow) {
    overlayWindow.setOpacity(opacity);
  }
});

ipcMain.handle('set-overlay-size', (event, width, height) => {
  if (overlayWindow) {
    overlayWindow.setSize(width, height);
  }
});

ipcMain.handle('set-overlay-position', (event, x, y) => {
  if (overlayWindow) {
    overlayWindow.setPosition(x, y);
  }
});

// Send party invite to overlay
ipcMain.on('party-invite', (event, data) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('party-invite', data);
    console.log('📨 Party invite sent to overlay:', data);
  }
});

// Send friend online notification to overlay
ipcMain.on('friend-online', (event, data) => {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('friend-online', data);
    console.log('👋 Friend online notification sent to overlay:', data);
  }
});

// Register global hotkey for overlay toggle
app.whenReady().then(() => {
  // Register F9 as default overlay toggle
  const ret = globalShortcut.register('F9', () => {
    console.log('🔥 F9 pressed - Toggling overlay');
    toggleOverlay();
  });

  if (!ret) {
    console.log('❌ F9 registration failed');
  } else {
    console.log('✅ F9 hotkey registered for overlay toggle');
  }

  // Check if shortcut is registered
  console.log('F9 is registered:', globalShortcut.isRegistered('F9'));
});

// Unregister hotkeys on quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// Clean up on quit
app.on('before-quit', () => {
  if (detectionInterval) {
    clearInterval(detectionInterval);
  }
  closeOverlay();
});
