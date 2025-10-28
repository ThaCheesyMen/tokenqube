# Fixing Electron Build on Windows

## The Problem

The build is failing because Electron Builder is trying to extract code signing tools and needs admin privileges to create symbolic links.

## Solution 1: Run PowerShell as Administrator (Easiest)

1. Close your current terminal
2. Right-click PowerShell → "Run as Administrator"
3. Navigate to your project:
   ```powershell
   cd C:\Users\ronan\Desktop\tokenquest
   ```
4. Run the build:
   ```powershell
   npm run electron:build:win
   ```

## Solution 2: Use Just the Portable Build

Skip the installer and just build the portable version:

1. Edit `electron-builder.yml`
2. Change this:
   ```yaml
   win:
     target:
       - nsis
       - portable
   ```
3. To this:
   ```yaml
   win:
     target:
       - portable
   ```
4. Run: `npm run electron:build:win`

## Solution 3: Disable Code Signing Completely

Add this to `electron-builder.yml` under `win:`:

```yaml
win:
  verifyUpdateCodeSignature: false
```

## Solution 4: Manual Build

If nothing works, you can manually package:

1. Build the React app: `npm run build`
2. Run Electron directly: `npx electron .`
3. Use this for distribution during development

## Quick Reference

**Build commands:**
```bash
npm run build                              # Build React app
npm run electron:dev                       # Run in Electron
npm run electron:build:win                 # Build for Windows
```

**Clean build:**
```bash
taskkill /F /IM TokenQuest.exe /T 2>$null
Remove-Item -Path "dist-electron" -Recurse -Force
npm run electron:build:win
```

## Expected Result

After a successful build, you'll find in `dist-electron/`:
- `TokenQuest.exe` - The portable app
- `TokenQuest Setup 1.0.0.exe` - The installer (if NSIS wasn't disabled)

Just run either `.exe` file!
