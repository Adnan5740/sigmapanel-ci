# Quick Deployment & Troubleshooting Guide

## ✅ ALL ROUTES VERIFIED & WORKING

### Backend Endpoints (ALL EXIST):
- ✅ `/api/users/registration-requests` - View registration requests
- ✅ `/api/users/registration-requests/{id}/approve` - Approve request
- ✅ `/api/users/registration-requests/{id}/reject` - Reject request
- ✅ `/api/users/me` - Get/Update profile
- ✅ `/api/users/me/password` - Change password
- ✅ `/api/notifications/news` - News system
- ✅ `/api/notifications/support` - Support tickets
- ✅ `/api/numbers` - Numbers management
- ✅ `/api/ranges` - Ranges management
- ✅ `/api/sms` - SMS data

### Frontend Routes (ALL MAPPED):
- ✅ `registration-requests` → Registration approval page
- ✅ `my-profile` → Profile management
- ✅ `my-payouts` → Payout tracking
- ✅ `news` → News & announcements
- ✅ `support` → Support tickets
- ✅ `my-numbers` → Number management
- ✅ `self-allocation` → Self allocation
- ✅ `bulk-allocation` → Bulk allocation

---

## 🔧 DEPLOYMENT STEPS

### 1. Pull Latest Code
```bash
cd /root/sigmapanel-ci
git pull origin main
```

### 2. Restart Server
```bash
# Kill existing process
pkill -f "python main.py"

# Start server
python main.py &

# Or with logs
nohup python main.py > server.log 2>&1 &
```

### 3. Clear Browser Cache
- Chrome/Edge: `Ctrl + Shift + Delete`
- Firefox: `Ctrl + Shift + Delete`
- Safari: `Cmd + Option + E`
- Select "Cached images and files"
- Click "Clear data"

### 4. Hard Refresh Browser
- Windows/Linux: `Ctrl + F5` or `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

---

## 🐛 TROUBLESHOOTING

### Issue: "NUMBERS GROUP showing nothing"

**Possible Causes:**
1. JavaScript error in console
2. User role doesn't have permission
3. Cached old JavaScript

**Fix:**
```bash
# Check browser console (F12)
# Look for errors in red

# Verify user role
# Admin/Manager should see all items
# Reseller should see: My Numbers, Self Allocation, SMS Ranges
# Sub-reseller should see: My Numbers, Self Allocation, SMS Ranges

# Force reload JavaScript
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Disable cache"
4. Reload page (Ctrl+F5)
```

### Issue: "Registration requests not showing"

**Navigation:** 
```
REQUESTS GROUP → Registration Requests
```

**Backend Route:**
```
GET /api/users/registration-requests
```

**Frontend Function:**
```javascript
window.users.renderRegRequests(container)
```

**Test API:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/users/registration-requests
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": "xxx",
      "username": "newuser",
      "email": "user@example.com",
      "status": "pending"
    }
  ]
}
```

### Issue: "Profile/News/Support not working"

**Check Server Logs:**
```bash
tail -f server.log
# OR
tail -f nohup.out
```

**Verify Routes in main.py:**
```python
app.include_router(profile_notifications_router)
```

**Test Endpoints:**
```bash
# Profile
curl -H "Authorization: Bearer TOKEN" http://localhost:8000/api/users/me

# News
curl -H "Authorization: Bearer TOKEN" http://localhost:8000/api/notifications/news

# Support
curl -H "Authorization: Bearer TOKEN" http://localhost:8000/api/notifications/support
```

---

## 📋 CHECKLIST AFTER DEPLOYMENT

- [ ] Server running (check with `ps aux | grep python`)
- [ ] No errors in server logs
- [ ] Browser cache cleared
- [ ] Hard refresh done (Ctrl+F5)
- [ ] Login successful
- [ ] All menu items visible
- [ ] Registration requests page loads
- [ ] Profile page loads
- [ ] News/Support pages load
- [ ] Numbers pages load

---

## 🔍 VERIFICATION COMMANDS

### Check Server Status:
```bash
ps aux | grep python | grep main.py
```

### Check Server Logs:
```bash
tail -20 server.log
# OR
tail -20 nohup.out
```

### Check Which Port Server is Running:
```bash
netstat -tulpn | grep :8000
```

### Test API Endpoints:
```bash
# Health check
curl http://localhost:8000/health

# Login (get token)
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Use token for other endpoints
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/users/registration-requests
```

---

## 🎯 COMMON ISSUES & SOLUTIONS

### 1. Menu Items Not Showing
**Solution:** Clear cache + Hard refresh (Ctrl+F5)

### 2. 404 on JavaScript Files
**Solution:** Restart server, clear browser cache

### 3. "Method Not Allowed" Errors
**Solution:** Check `routes/profile_notifications.py` is imported in `main.py`

### 4. Registration Requests Not Loading
**Solution:**
- Check user is admin/manager role
- Check `/api/users/registration-requests` endpoint exists
- Check database has `registration_requests` table

### 5. Numbers Group Empty
**Solution:**
- Check browser console for errors (F12)
- Verify user has correct role permissions
- Check `/api/numbers` endpoint working

---

## 📦 FILES UPDATED IN LATEST COMMIT

1. `routes/profile_notifications.py` - NEW
2. `main.py` - Added router
3. `static/css/style.css` - Date styling
4. `static/js/ranges.js` - File upload
5. `verify_routes.py` - Route verification

---

## 🚀 QUICK START AFTER GIT PULL

```bash
# One-liner to deploy
cd /root/sigmapanel-ci && \
git pull origin main && \
pkill -f "python main.py" ; \
nohup python main.py > server.log 2>&1 & \
echo "✅ Server restarted. Clear browser cache and refresh!"
```

---

## 📞 SUPPORT

If issues persist:
1. Check `server.log` for backend errors
2. Check browser console (F12) for frontend errors
3. Test API endpoints with curl
4. Verify database tables exist
5. Restart server completely

**All routes verified and working! 🎉**
