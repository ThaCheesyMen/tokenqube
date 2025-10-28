# Electron ES Module Fix

## Problem
Electron app crashed with error:
```
ReferenceError: require is not defined in ES module scope
```

## Root Cause
`package.json` has `"type": "module"` which makes all `.js` files ES modules. But `electron/main.js` was using CommonJS `require()` syntax.

## Fix Applied
Converted `electron/main.js` from CommonJS to ES modules:

**Before:**
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');
```

**After:**
```javascript
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

## Status
✅ Fixed! Electron app should now run without errors.

## Next Steps

### For Development
Run: `npm run electron:dev`

### For Building (Still Admin Required)
The build still needs admin privileges for code signing:
1. Right-click PowerShell → "Run as Administrator"
2. Run: `npm run electron:build:win`

Or skip building and just use dev mode!

---

**Party fixes still need SQL applied - see `fix_party_trigger.sql`**
