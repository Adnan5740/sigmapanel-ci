# Troubleshooting Guide

## Issue 1: New Menu Items Not Showing

### Quick Fixes:

1. **Clear Browser Cache:**
   - Press `Ctrl + Shift + Delete` (Windows/Linux)
   - Press `Cmd + Shift + Delete` (Mac)
   - Select "Cached images and files"
   - Click "Clear data"

2. **Hard Refresh:**
   - Press `Ctrl + F5` (Windows/Linux)
   - Press `Cmd + Shift + R` (Mac)

3. **Check Browser Console:**
   - Press `F12` to open Developer Tools
   - Go to Console tab
   - Look for any JavaScript errors
   - Common issues:
     - Missing JS files (check Network tab)
     - Script load order problems
     - Authentication issues

### Verify Installation:

```bash
# Check if all JS files exist
ls -la /root/sigmapanel-ci/static/js/

# Should see:
# - profile.js
# - payouts.js
# - notifications.js
```

### Menu Items Added:

**COMMUNICATION Group:**
- 📢 News & Announcements
- 🎫 Support Tickets

**ACCOUNT Group:**
- 👤 My Profile
- 💰 My Payouts

### Navigation Routes:
- `/my-profile` - Profile management with avatar upload
- `/my-payouts` - Payout tracking
- `/news` - News and announcements
- `/support` - Support tickets

---

## Issue 2: Content Touching Corners (FIXED)

### What Was Fixed:

1. **Card Body Padding:**
   - Changed from `padding: 0` to `padding: 20px`
   - Adds proper spacing inside cards

2. **Utility Classes Added:**
   ```css
   .p-0, .p-1, .p-2, .p-3, .p-4   /* Padding utilities */
   .px-1, .px-2, .px-3            /* Horizontal padding */
   .py-1, .py-2, .py-3            /* Vertical padding */
   .m-0, .mb-1, .mb-2, .mb-3      /* Margin utilities */
   ```

3. **Usage in HTML:**
   ```html
   <!-- No padding -->
   <div class="card-body p-0">Content</div>
   
   <!-- Custom padding -->
   <div class="card-body p-3">Content</div>
   
   <!-- Default (20px) -->
   <div class="card-body">Content</div>
   ```

---

## Verification Steps:

### 1. Check Files Are Loaded:
Open browser DevTools (F12) → Network tab → Reload page

Should see:
- ✅ profile.js (200 OK)
- ✅ payouts.js (200 OK)
- ✅ notifications.js (200 OK)
- ✅ style.css (200 OK)

### 2. Check Console for Errors:
Open browser DevTools (F12) → Console tab

Should see NO errors like:
- ❌ "Cannot read property 'renderProfile' of undefined"
- ❌ "404 Not Found: profile.js"

### 3. Verify Navigation:
After login, sidebar should show:

```
COMMUNICATION
  📢 News & Announcements
  🎫 Support Tickets

ACCOUNT
  👤 My Profile
  💰 My Payouts

SETTINGS GROUP
  ⚙️ General Settings
  🔒 Security
  ...
```

### 4. Test Functionality:

**My Profile Page:**
- Click "My Profile" in sidebar
- Should see profile picture upload area
- Can edit personal information
- Can change password

**My Payouts Page:**
- Click "My Payouts" in sidebar
- Should see payout table
- Filter by range/number
- Shows total payout

**News & Support:**
- Click "News & Announcements"
- Should see news feed
- Click "Support Tickets"
- Can create new ticket

---

## Common Issues:

### 1. Menu Items Missing After Login

**Cause:** Browser cached old version

**Fix:**
```bash
# Force reload
Ctrl + Shift + R

# Or clear cache and hard reload
Ctrl + Shift + Delete
```

### 2. Console Error: "profile is not defined"

**Cause:** Script not loaded or wrong order

**Fix:** Check `index.html` has:
```html
<script src="/static/js/profile.js" defer></script>
<script src="/static/js/payouts.js" defer></script>
<script src="/static/js/notifications.js" defer></script>
```

### 3. 404 Error on JS Files

**Cause:** Server not serving static files

**Fix:**
```bash
# Restart server
pkill -f "python main.py"
python main.py
```

### 4. Padding Still Wrong

**Cause:** Old CSS cached

**Fix:**
```bash
# Version CSS file
# In index.html change:
<link rel="stylesheet" href="/static/css/style.css?v=2">
```

---

## Deployment Checklist:

After pulling latest code:

- [ ] Stop server: `pkill -f "python main.py"`
- [ ] Pull changes: `git pull origin main`
- [ ] Check files exist: `ls static/js/profile.js`
- [ ] Restart server: `python main.py`
- [ ] Clear browser cache
- [ ] Hard refresh page (Ctrl+F5)
- [ ] Login and verify menus show
- [ ] Test each new feature
- [ ] Check padding on all pages

---

## Support:

If issues persist:

1. Check browser console (F12)
2. Check server logs
3. Verify all files committed to Git
4. Ensure server restarted after pull
5. Try different browser (incognito mode)

---

**Latest Commit:**
- e16ee11: Fix padding and utility classes
- 15500bc: Enhanced UI v2.0

**Files Modified:**
- static/css/style.css
- static/js/app.js (already had routes)
- static/js/profile.js (new)
- static/js/payouts.js (new)
- static/js/notifications.js (new)
