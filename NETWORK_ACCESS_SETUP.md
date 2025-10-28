# 🌐 Network Access Setup Guide

## Issue Fixed ✅
Your Vite dev server is now configured to be accessible from other devices on your local network!

## What Changed

### `vite.config.ts` Updated
```typescript
server: {
  host: '0.0.0.0', // Expose to network
  port: 5173,
  strictPort: true,
}
```

## How to Access from Other Devices

### Step 1: Find Your Computer's Local IP Address

#### **Windows (PowerShell)**
```powershell
ipconfig
```
Look for **"IPv4 Address"** under your active network adapter (usually starts with `192.168.` or `10.`).

Example output:
```
Wireless LAN adapter Wi-Fi:
   IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

#### **Mac/Linux (Terminal)**
```bash
ifconfig
# or
ip addr show
```

### Step 2: Restart Your Dev Server
```bash
npm run dev
```

You should now see output like:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/
```

### Step 3: Access from Other Devices

On your phone, tablet, or another computer **on the same WiFi network**, open:
```
http://YOUR_IP_ADDRESS:5173/
```

Example:
```
http://192.168.1.100:5173/
```

## Firewall Configuration

### Windows Firewall
If you can't connect, you may need to allow port 5173:

1. **Open Windows Defender Firewall**
   - Search for "Windows Firewall" in Start Menu
   - Click "Advanced settings"

2. **Create Inbound Rule**
   - Click "Inbound Rules" → "New Rule"
   - Select "Port" → Next
   - Select "TCP" → Enter `5173` → Next
   - Select "Allow the connection" → Next
   - Check all profiles (Domain, Private, Public) → Next
   - Name it "Vite Dev Server" → Finish

### Quick PowerShell Command (Run as Administrator)
```powershell
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
```

### Mac Firewall
Usually no configuration needed, but if blocked:
1. System Preferences → Security & Privacy → Firewall → Firewall Options
2. Add Node.js or your terminal app to allowed applications

### Linux Firewall (ufw)
```bash
sudo ufw allow 5173/tcp
```

## Testing Connection

### From Another Device
1. Connect to the same WiFi network
2. Open browser
3. Navigate to `http://YOUR_IP:5173/`
4. You should see your TokenQuest app!

### QR Code Access (Optional)
You can generate a QR code for easy mobile access:
1. Visit https://www.qr-code-generator.com/
2. Enter your network URL: `http://192.168.1.100:5173/`
3. Generate & scan with your phone

## Troubleshooting

### ❌ "This site can't be reached"
**Solutions:**
1. Verify both devices are on the **same WiFi network**
2. Check firewall settings (see above)
3. Verify the dev server is running (`npm run dev`)
4. Try your computer's IP with port: `http://192.168.1.100:5173/`

### ❌ "Connection refused"
**Solutions:**
1. Restart the dev server
2. Check if another process is using port 5173:
   ```powershell
   # Windows
   netstat -ano | findstr :5173
   
   # Mac/Linux
   lsof -i :5173
   ```
3. Try a different port in `vite.config.ts`:
   ```typescript
   server: {
     host: '0.0.0.0',
     port: 3000, // Changed port
   }
   ```

### ❌ "NET::ERR_CONNECTION_TIMED_OUT"
**Solutions:**
1. Disable VPN on both devices
2. Check antivirus software isn't blocking connections
3. Restart your router

### ❌ Supabase API not working on other devices
Make sure your Supabase URL in `.env` or `src/lib/supabase.ts` is using the public Supabase URL (not localhost).

## Security Notes

⚠️ **Development Only**: This configuration is for development purposes only. Never use `host: '0.0.0.0'` in production.

✅ **Safe**: Only devices on your local network can access the server.

🔒 **Production**: For production, use proper hosting with HTTPS (Vercel, Netlify, AWS, etc.).

## Next Steps

Now you can:
- ✅ Test your app on mobile devices
- ✅ Show your app to teammates/friends on the same network
- ✅ Debug mobile-specific issues in real-time
- ✅ Demo your app without deploying

## Need Help?

If you're still having issues:
1. Check your IP address is correct
2. Verify both devices are on same network
3. Temporarily disable firewall to test
4. Check dev server console for errors
5. Try accessing from a browser's incognito/private mode

---

**Your app is now accessible network-wide! 🎉**

