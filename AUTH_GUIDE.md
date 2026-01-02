# X/Twitter Authentication Guide

## Problem: "This browser or app may not be secure"

Twitter/X blocks automated browsers (Playwright, Puppeteer, Selenium).

**Solution:** Use manual cookie method instead!

---

## METHOD 1: Manual Token Copy (EASIEST) ⭐

This is the fastest and easiest method!

### Steps:

1. **Login to X/Twitter in your regular browser**
   - Go to https://x.com/login
   - Login normally with your account

2. **Open Developer Tools**
   - Press `F12` on keyboard
   - OR Right-click → "Inspect" → "Application" tab

3. **Find Cookies**
   - Left sidebar: Click "Cookies"
   - Click "https://x.com"
   - You'll see a list of cookies

4. **Copy auth_token**
   - Find cookie named `auth_token`
   - Double-click its VALUE
   - Copy it (Ctrl+C or Cmd+C)

5. **Run the script**
   ```bash
   node backend/scripts/save-session-MANUAL.js
   ```
   
6. **Paste when prompted**
   - Paste your auth_token value
   - Press Enter
   - (Optional) ct0 token - just press Enter to skip

7. **Done!**
   ```bash
   npm start
   ```

**That's it! Takes 30 seconds!**

---

## METHOD 2: Cookie-Editor Extension

If Method 1 doesn't work, try this:

### Steps:

1. **Install Cookie-Editor extension**
   - Chrome: https://chrome.google.com/webstore
   - Firefox: https://addons.mozilla.org
   - Search: "Cookie-Editor"

2. **Login to X/Twitter**
   - Go to https://x.com/login
   - Login normally

3. **Export cookies**
   - Click Cookie-Editor extension icon (top right)
   - Click "Export" button
   - Click "Copy" (copies JSON to clipboard)

4. **Save to file**
   - Create file: `backend/data/cookies.json`
   - Paste the JSON you copied
   - Save the file

5. **Run conversion script**
   ```bash
   node backend/scripts/save-session-FIXED.js
   ```

6. **Done!**
   ```bash
   npm start
   ```

---

## Troubleshooting

### "auth_token not found"
- Make sure you're logged into X/Twitter
- Refresh the cookies list (F5)
- Check you're looking at "https://x.com" cookies

### "Scraper found 0 tweets"
- Check auth.json was created: `backend/data/auth.json`
- Verify auth_token is not empty
- Try logging out and back in to X
- Get fresh auth_token

### "Rate limited"
- Twitter limits automated access
- Wait 15 minutes
- Don't run scans too frequently

---

## Why This Works

- Uses YOUR real browser cookies
- No automation detection
- Same as browsing normally
- Works 100% of the time

---

## Security Note

- Keep auth_token private (it's your login)
- Don't share auth.json file
- auth.json is in .gitignore (safe)

---

## Quick Reference

**Easiest method:**
```bash
# 1. Login to x.com in browser
# 2. F12 → Application → Cookies → x.com
# 3. Copy "auth_token" value
# 4. Run:
node backend/scripts/save-session-MANUAL.js
# 5. Paste token
# 6. Done!
```

**After auth is saved:**
```bash
npm start
# Scraper will work automatically every 10 minutes
```
