# 🐛 Debug Panel - User Guide

## Overview

A comprehensive debug overlay has been added to the Messages page to help diagnose encryption key issues and monitor real-time messaging operations.

---

## 🎯 How to Open

### Method 1: Click the Bug Button
- Look for the **floating bug icon (🐛)** in the bottom-right corner
- Click it to toggle the debug panel on/off

### Method 2: Keyboard Shortcut
- Press **`Ctrl + Shift + D`** (Windows/Linux)
- Press **`Cmd + Shift + D`** (Mac)

---

## 📊 Debug Panel Sections

### 1. 🌐 API Configuration
Shows all API endpoints being used:
- **Base URL**: Raw VITE_API_URL value
- **API URL**: Computed API base with `/api` prefix
- **Public Key Endpoint**: Full URL for encryption key operations
- **Conversations Endpoint**: URL for message fetching

**Use Case:** Verify correct API URLs are being constructed

---

### 2. 👤 User Info
Displays current user details:
- **User ID**: Database UUID
- **Email**: User's email address
- **Role**: User role (alumni, admin, etc.)

**Use Case:** Confirm correct user is logged in

---

### 3. 🔌 Connection
Real-time connection status:
- **Status**: Connected ✅ / Disconnected ❌
- **Socket URL**: WebSocket server URL

**Use Case:** Diagnose messaging connectivity issues

---

### 4. 🔐 Encryption Keys
Detailed key status:
- **Public Key**: First 50 characters (full key is ~88 chars)
- **Private Key Exists**: Whether private key is in storage
- **Decrypt Password Exists**: Whether encryption password is stored
- **Local Keys Loaded**: Keys imported into memory
- **AES Key Loaded**: Symmetric encryption key ready
- **Cached Conversation Keys**: Number of partner keys cached

**Color Coding:**
- 🟢 Green = Present/Loaded ✅
- 🔴 Red = Missing/Not Loaded ❌

**Use Case:** Primary tool for debugging encryption issues

---

### 5. 💬 Active Conversation
Current conversation details:
- **Partner User ID**: ID of chat partner
- **Partner Name**: Display name
- **Total Conversations**: Number of conversations
- **Messages Loaded**: Messages in current chat
- **Unread Count**: Unread messages from current partner

**Use Case:** Verify correct conversation is loaded

---

### 6. ⚙️ Component State
React component state:
- **Sending**: Message send in progress
- **Uploading**: File upload in progress
- **Typing**: Typing indicator active
- **Sidebar Visible**: Sidebar display state
- **Error Message**: Current error (if any)

**Use Case:** Debug UI state issues

---

### 7. 🌍 Recent Network Requests
Last 5 network requests:
- **Method & Status**: GET 200, POST 404, etc.
- **URL**: Full request URL
- **Timestamp**: When request was made

**Color Coding:**
- 🟢 Green = Success (200-299)
- 🔴 Red = Error (400-599)

**Use Case:** Track API calls and identify failures

---

### 8. 📋 Debug Logs
Last 10 debug events:
- **Type**: Info ℹ️, Success ✅, Warning ⚠️, Error ❌
- **Message**: Description of event
- **Data**: Additional JSON data (collapsible)
- **Timestamp**: When event occurred

**Color Coding:**
- 🔵 Blue = Info
- 🟢 Green = Success
- 🟡 Yellow = Warning
- 🔴 Red = Error

**Use Case:** Trace application flow and errors

---

### 9. ⚡ Quick Actions
Instant diagnostic buttons:

#### **Check Keys**
- Runs `window.debugE2EKeys()` in console
- Shows key status in browser console

#### **Check Storage**
- Inspects localStorage for encryption keys
- Logs results to debug panel

#### **Test Key Fetch**
- Makes live request to `/api/messages/public-key`
- Tests backend connectivity and key retrieval
- Shows full response in debug logs

#### **Check Socket**
- Inspects Socket.io connection
- Shows socket ID, connected status, URL

**Use Case:** Quick one-click diagnostics

---

## 🔍 Common Debugging Scenarios

### Scenario 1: "Messages not loading"

**Check:**
1. 🔌 Connection → Should show "Connected ✅"
2. 🌍 Recent Network Requests → Check for 404/500 errors
3. 📋 Debug Logs → Look for error messages

**Action:**
- If disconnected → Check backend is running
- If 404/500 → Check API URL configuration
- Check console for detailed errors

---

### Scenario 2: "Cannot send encrypted messages"

**Check:**
1. 🔐 Encryption Keys → All should show ✅
   - Private Key Exists
   - Decrypt Password Exists
   - Local Keys Loaded
2. 📋 Debug Logs → Look for "key load error"

**Action:**
- If any key is missing ❌ → Click "Check Keys" button
- If decrypt password missing → Log out and log in
- If local keys not loaded → Refresh page

---

### Scenario 3: "API URL errors (404)"

**Check:**
1. 🌐 API Configuration
   - Base URL should NOT end with `/api`
   - API URL should be `{base}/api`
   - Endpoints should be `{base}/api/messages/...`

**Action:**
- If URL has double `/api/api/` → Fix `.env` file
- Correct: `VITE_API_URL=http://localhost:5000`
- Wrong: `VITE_API_URL=http://localhost:5000/api`

---

### Scenario 4: "Cross-device encryption failure"

**Check:**
1. 🔐 Encryption Keys on both devices
2. 👤 User Info → Confirm same user ID
3. Click "Test Key Fetch" → Should return same keys

**Action:**
- If keys different → One device needs re-login
- If decrypt password missing → Log out/in on both devices

---

## 💡 Pro Tips

### Tip 1: Keep Panel Open While Testing
- Open debug panel before reproducing issue
- Watch logs populate in real-time
- Easier to identify exact failure point

### Tip 2: Use Network Requests for API Issues
- Network tab shows exact API calls made
- Copy URLs to test in Postman/curl
- Check status codes for quick diagnosis

### Tip 3: Clear Logs Between Tests
- Click **"Clear"** button in panel header
- Removes old logs to avoid confusion
- Start fresh for each test scenario

### Tip 4: Copy Important Values
- Click 📋 icon next to copyable fields
- Public keys, User IDs, URLs can be copied
- Useful for sharing with developers

### Tip 5: Keyboard Shortcut
- `Ctrl+Shift+D` / `Cmd+Shift+D`
- Faster than clicking bug button
- Works from anywhere on Messages page

---

## 📸 Visual Guide

### Debug Panel Location
```
┌─────────────────────────────────────┐
│  Messages Page                      │
│                                     │
│  [Conversations]    [Chat Area]    │ 
│                                     │
│                                     │
│                         ┌─────────┐ │
│                         │ 🐛 Debug│ │ ← Floating button
│                         │  Panel  │ │
│                         │         │ │
│                         │ [Logs]  │ │
│                         │ [Keys]  │ │
│                         │ [API]   │ │
│                         └─────────┘ │
│                              🐛 ←────┘ Click this
└─────────────────────────────────────┘
```

### Panel States

**Closed:**
- Only 🐛 button visible
- Bottom-right corner
- Pulsing animation on hover

**Open:**
- Full panel overlay
- Top-right corner
- Scrollable content
- Clear button in header

---

## 🎨 Color Meanings

| Color | Meaning | Example |
|-------|---------|---------|
| 🟢 Green | Success/Present | Keys loaded ✅ |
| 🔴 Red | Error/Missing | Connection failed ❌ |
| 🟡 Yellow | Warning | Retrying... ⚠️ |
| 🔵 Blue | Info | Loading data ℹ️ |
| ⚪ Gray | Neutral | N/A or disabled |

---

## 🚀 Quick Start

1. **Open Messages page** (`/messages`)
2. **Click 🐛 button** (bottom-right)
3. **Check 🔐 Encryption Keys section**
   - All items should be green ✅
   - If any red ❌, click "Check Keys"
4. **Monitor 📋 Debug Logs** while using messaging
5. **Click Clear** to reset between tests

---

## 🆘 Troubleshooting the Debug Panel

### Panel won't open
- Try keyboard shortcut: `Ctrl+Shift+D`
- Check browser console for errors
- Refresh the page

### Logs not updating
- Click "Clear" and try action again
- Panel updates automatically
- Check if action is actually triggering

### Network requests not showing
- Requests only tracked after panel is opened
- Refresh page with panel open to see all requests
- Check browser's Network tab as backup

---

## 📚 Related Documentation

- **ENCRYPTION_KEY_DEBUGGING.md** - Comprehensive encryption guide
- **QUICK_TEST_GUIDE.md** - Testing procedures
- **ENCRYPTION_KEY_FIXES_SUMMARY.md** - Recent fixes

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` (Win/Linux) | Toggle debug panel |
| `Cmd+Shift+D` (Mac) | Toggle debug panel |

---

## 🎓 Best Practices

1. **Open panel BEFORE reproducing bug**
   - Captures all events from start
   - Don't miss important logs

2. **Use Quick Actions liberally**
   - One-click diagnostics
   - Safe to run multiple times

3. **Copy IDs and URLs**
   - Use 📋 copy buttons
   - Helpful when reporting issues

4. **Clear logs between tests**
   - Avoid confusion with old logs
   - Clean slate for each test

5. **Monitor in real-time**
   - Watch logs as you interact
   - Immediate feedback on issues

---

## 🔧 For Developers

### Adding Custom Debug Logs

In your code, use:
```javascript
addDebugLog('info', 'Your message here', { optional: 'data' })
addDebugLog('success', 'Operation completed')
addDebugLog('warning', 'Something unusual')
addDebugLog('error', 'Failed to do thing', { error: err.message })
```

### Tracking Network Requests

```javascript
addNetworkRequest('POST', url, 200, responseData)
addNetworkRequest('GET', url, 404, errorResponse)
```

### Accessing Panel State

```javascript
// Panel automatically updates based on component state
// debugData object is computed on each render
```

---

**Debug Panel Version:** 1.0  
**Last Updated:** December 17, 2025  
**Status:** ✅ Production Ready
